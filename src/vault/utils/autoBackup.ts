import { db } from '../db';
import type { ImportSummary } from '../types';
import {
  isAppFolderPermissionGranted,
  listAppFolderFiles,
  readAppFolderFile,
  removeAppFolderEntry,
  writeFileToAppFolder,
} from './videoStorage';

/* ------------------------------------------------------------------ */
/* AUTO-BACKUP — mantiene una carpeta (típicamente tu USB) al día.     */
/*                                                                     */
/* Cada vez que hay cambios sin respaldar y pasa el intervalo, la app  */
/* escribe UN ZIP rotativo en la Carpeta de la App:                    */
/*                                                                     */
/*   VaultNotes-Auto-20260214-093012.zip                               */
/*                                                                     */
/* conservando solo los últimos `retention` (los más viejos se         */
/* borran solos). Silencioso por diseño: NUNCA abre diálogos ni pide   */
/* permisos sin clic — si el permiso de la carpeta caducó, espera.     */
/*                                                                     */
/* El mismo ZIP sirve para aterrizar en una máquina nueva:            */
/* Configuración → Restaurar último backup (merge no destructivo por   */
/* updatedAt, fotos y PDFs incluidos).                                 */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'vaultnotes-autobackup-v1';
const AUTO_PREFIX = 'VaultNotes-Auto-';
const MANUAL_NAME = 'VaultNotes-Backup.zip';
const TICK_MS = 30_000;
const ERROR_COOLDOWN_MS = 2 * 60_000;

export const INTERVAL_OPTIONS = [5, 10, 15, 30, 60] as const;
export const RETENTION_OPTIONS = [3, 5, 10, 20] as const;

interface PersistedState {
  enabled: boolean;
  intervalMin: number;
  retention: number;
  lastOkAt: number | null;
  lastError: string | null;
}

const DEFAULTS: PersistedState = {
  enabled: false,
  intervalMin: 10,
  retention: 5,
  lastOkAt: null,
  lastError: null,
};

interface EngineState extends PersistedState {
  running: boolean;
  /** Folder permission granted right now (null = no folder chosen). */
  permOk: boolean | null;
  /** Changes waiting to be backed up. */
  dirty: boolean;
}

let state: EngineState = { ...DEFAULTS, running: false, permOk: null, dirty: true };
let engineStarted = false;
let inFlight = false;
let nextAttemptAt = 0;
const listeners = new Set<() => void>();

function loadPersisted(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = { ...state, ...(JSON.parse(raw) as Partial<PersistedState>) };
  } catch {
    /* corrupted state — defaults win */
  }
}

function persist(): void {
  try {
    const { enabled, intervalMin, retention, lastOkAt, lastError } = state;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ enabled, intervalMin, retention, lastOkAt, lastError } satisfies PersistedState),
    );
  } catch {
    /* storage full/blocked — auto-backup keeps working in-memory */
  }
}

function notify(): void {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* listener crashed — never take the engine down */
    }
  }
}

/** Snapshot for React (useAutoBackupStatus subscribes to changes). */
export function getAutoBackupStatus(): EngineState {
  return { ...state };
}

/** Subscribe to status changes. Returns an unsubscribe function. */
export function subscribeAutoBackup(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Update the user settings (enabled / interval / retention). */
export function updateAutoBackupSettings(patch: Partial<Pick<PersistedState, 'enabled' | 'intervalMin' | 'retention'>>): void {
  state = { ...state, ...patch };
  if (patch.enabled === true) {
    // Reactivating always produces a fresh backup soon (dirty stays true
    // until a successful write — an empty interval since lastOkAt won't
    // hold it back: the condition is dirty && elapsed, and activating
    // implies the user wants the folder updated NOW-ish).
    nextAttemptAt = 0;
  }
  persist();
  notify();
}

/* --------------------------- dirty tracking --------------------------- */
/* Dexie CORE hooks (creating/updating/deleting) on EVERY table — the
 * cheapest possible change detector: any write to the vault marks the
 * folder outdated, so a cycle with no changes costs nothing. Hooks are
 * added once and live for the whole app session.                       */

function markDirty(): void {
  if (state.dirty) return;
  state = { ...state, dirty: true };
  // Notify ONLY on the false→true flip: at most one re-render per backup
  // cycle even when a bulk import fires hundreds of hooks.
  notify();
}

function attachChangeHooks(): void {
  try {
    for (const table of db.tables) {
      // markDirty takes no args and returns void — compatible with all
      // three hook signatures (extra params are simply ignored).
      table.hook('creating', markDirty);
      table.hook('updating', markDirty);
      table.hook('deleting', markDirty);
    }
  } catch (err) {
    // Hooks only SKIP no-change cycles; if they fail, dirty stays true
    // and every interval simply writes a fresh backup. Never fatal.
    console.warn('[autoBackup] change hooks failed:', err);
  }
}

/* ------------------------------ naming ------------------------------- */

function autoBackupStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

/* ------------------------------ engine ------------------------------- */

async function pruneOldAutoBackups(retention: number): Promise<void> {
  const files = await listAppFolderFiles();
  if (!files) return; // no folder / no permission — nothing to prune
  const autos = files
    .filter((f) => f.name.startsWith(AUTO_PREFIX) && f.name.endsWith('.zip'))
    .sort((a, b) => b.lastModified - a.lastModified);
  for (const victim of autos.slice(retention)) {
    await removeAppFolderEntry(victim.name); // failures swallowed by design
  }
}

/** Core write: build the ZIP and rotate. Throws with a human reason. */
async function writeOneAutoBackup(): Promise<string> {
  // PERF: dynamic import keeps JSZip + DOMPurify + zod OUT of the initial
  // bundle — identical strategy to the manual "Guardar Backup" button.
  const { buildVaultZipBlob } = await import('./zipBackup');
  const blob = await buildVaultZipBlob();
  const filename = `${AUTO_PREFIX}${autoBackupStamp()}.zip`;
  const ok = await writeFileToAppFolder(filename, blob);
  if (!ok) {
    throw new Error('No se pudo escribir en la carpeta (sin permiso o carpeta desconectada).');
  }
  await pruneOldAutoBackups(state.retention);
  return filename;
}

async function runBackupCycle(): Promise<void> {
  if (inFlight) return;

  // Folder health (silent query only — NEVER requestPermission from here:
  // that requires a user gesture and would throw).
  const permOk = await isAppFolderPermissionGranted();
  if (state.permOk !== permOk) {
    state = { ...state, permOk };
    notify();
  }

  if (!state.enabled) return;
  if (!state.dirty || state.running) return;
  if (Date.now() < nextAttemptAt) return;
  const sinceLast = Date.now() - (state.lastOkAt ?? 0);
  if (state.lastOkAt !== null && sinceLast < state.intervalMin * 60_000) return;
  if (!permOk) return; // waits silently until a gesture refreshes permission

  inFlight = true;
  state = { ...state, running: true, lastError: null };
  notify();
  try {
    await writeOneAutoBackup();
    state = { ...state, dirty: false, lastOkAt: Date.now(), lastError: null };
    persist();
  } catch (err) {
    state = {
      ...state,
      lastError: err instanceof Error ? err.message : 'Error desconocido durante el respaldo',
    };
    nextAttemptAt = Date.now() + ERROR_COOLDOWN_MS;
    persist();
  } finally {
    inFlight = false;
    state = { ...state, running: false };
    notify();
  }
}

/** Manual trigger ("Respaldar ahora"). MUST run inside a click handler —
 *  writeFileToAppFolder may requestPermission with that gesture. Returns
 *  the filename written; throws a human-readable Error otherwise. */
export async function backupNow(): Promise<string> {
  if (inFlight) throw new Error('Ya hay un respaldo en curso — espera unos segundos.');
  inFlight = true;
  state = { ...state, running: true, lastError: null };
  notify();
  try {
    const filename = await writeOneAutoBackup();
    state = { ...state, dirty: false, lastOkAt: Date.now(), lastError: null };
    persist();
    return filename;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido durante el respaldo';
    state = { ...state, lastError: message };
    persist();
    throw new Error(message);
  } finally {
    inFlight = false;
    state = { ...state, running: false };
    notify();
  }
}

/** Start the background engine (idempotent — App mounts it once). */
export function startAutoBackupEngine(): void {
  if (engineStarted) return;
  engineStarted = true;
  loadPersisted();
  notify();

  // Change detection: ANY write to the vault marks the folder outdated.
  attachChangeHooks();

  setInterval(() => {
    void runBackupCycle();
  }, TICK_MS);
}

/* ----------------------------- restoring ----------------------------- */

interface RestoreLatestResult {
  fileName: string;
  lastModified: number;
  summary: ImportSummary;
}

/** Finds the NEWEST backup in the app folder (auto-rotating or the manual
 *  VaultNotes-Backup.zip — newest write wins) and imports it with the
 *  standard non-destructive merge. Throws when there is nothing to restore
 *  (human message) or propagates import errors (IncompatibleBackupError,
 *  ZipSafetyError — the UI has dedicated handling for both). */
export async function restoreLatestBackup(): Promise<RestoreLatestResult> {
  const files = await listAppFolderFiles();
  if (!files) {
    throw new Error('No hay carpeta de la app con permiso — elige la carpeta y concede acceso primero.');
  }
  const candidates = files
    .filter((f) => f.name === MANUAL_NAME || (f.name.startsWith(AUTO_PREFIX) && f.name.endsWith('.zip')))
    .sort((a, b) => b.lastModified - a.lastModified);
  if (candidates.length === 0) {
    throw new Error('No se encontró ningún backup en la carpeta de la app.');
  }
  const latest = candidates[0];
  const file = await readAppFolderFile(latest.name);
  if (!file) {
    throw new Error(`No se pudo leer "${latest.name}" (¿está la carpeta desconectada?).`);
  }
  const { importVaultBackup } = await import('./zipBackup');
  const summary = await importVaultBackup(file);
  // Importing IS a data change — the next cycle must re-back it up so the
  // folder reflects the merged state (harmless double-write, keeps the
  // invariant "ZIP == merged vault").
  markDirty();
  return { fileName: latest.name, lastModified: latest.lastModified, summary };
}
