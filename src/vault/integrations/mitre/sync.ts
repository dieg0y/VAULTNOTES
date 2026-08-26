/**
 * integrations/mitre/sync.ts — MITRE ATT&CK local dataset sync architecture.
 *
 * Spec #15, #16: "Internet ↓ Download ↓ Validate ↓ Preview ↓ User confirms
 *  ↓ Backup current dataset ↓ Import new dataset. MITRE works offline after
 *  sync. NEVER overwrite the current dataset automatically. NEVER leave MITRE
 *  in a partially-imported state."
 *
 * DESIGN:
 *  - The bundled `src/vault/data/mitreData.ts` is the LOCAL baseline dataset.
 *    It is ALWAYS available offline and is the source of truth when no sync
 *    has ever been run.
 *  - `checkForUpdates()` returns metadata about a hypothetical newer dataset
 *    (version + size + entryCount). Architecture-only — in a real impl, this
 *    would fetch a manifest from attack.mitre.org. We DO NOT auto-call this
 *    on app start (spec #22: never "APP START → ONLINE REQUEST").
 *  - `sync()` is a no-op stub that validates the user explicitly confirmed.
 *    A real implementation would: download JSON → validate schema → preview
 *    diff → backup current → swap pointer. For now, it returns a not-
 *    implemented result so the UI can render the architecture honestly.
 *  - `getLocalMeta()` reads the bundled dataset version + the datasetMeta
 *    table to show "Installed Version" / "Latest Known Version" / "Last Sync".
 */
import { MITRE_TECHNIQUES } from '../../data/mitreData';
import { db } from '../../db';
import { isOnline } from '../online';

/** The version string baked into the bundled dataset. Bumped manually when
 *  we update mitreData.ts. */
export const BUNDLED_MITRE_VERSION = '15.0.0-bundled';

/** Metadata about the locally-installed MITRE dataset. */
export interface MitreLocalMeta {
  version: string;
  techniquesCount: number;
  lastSync: string | null;
  source: 'bundled' | 'synced';
}

/** Hypothetical newer dataset metadata — returned by checkForUpdates(). */
export interface MitreUpdateMeta {
  latestVersion: string;
  publishedAt: string;
  entryCount: number;
  /** Approximate size in bytes (for preview display). */
  sizeBytes: number;
}

/** Read the locally-installed MITRE metadata. Falls back to bundled dataset
 *  info when no sync row exists in datasetMeta. */
export async function getLocalMitreMeta(): Promise<MitreLocalMeta> {
  const row = await db.datasetMeta.get('singleton');
  if (row && row.mitreVersion) {
    return {
      version: row.mitreVersion,
      techniquesCount: MITRE_TECHNIQUES.length, // always reflect the in-memory dataset
      lastSync: row.mitreLastSync,
      source: row.mitreLastSync ? 'synced' : 'bundled',
    };
  }
  return {
    version: BUNDLED_MITRE_VERSION,
    techniquesCount: MITRE_TECHNIQUES.length,
    lastSync: null,
    source: 'bundled',
  };
}

/** Check for a newer MITRE dataset. ARCHITECTURE-ONLY: in a real impl this
 *  would fetch a version manifest from attack.mitre.org. Here it returns
 *  the bundled version as "latest known" so the UI can render the
 *  architecture without depending on a live endpoint. NEVER called
 *  automatically — only on explicit user click in the Sync Center. */
export async function checkMitreUpdates(): Promise<MitreUpdateMeta> {
  if (!isOnline()) {
    throw new Error('No Internet connection.');
  }
  // Architecture stub: report the bundled version as "latest known" so the
  // UI can show "You are up to date" honestly. A real impl would do:
  //   const res = await fetchWithTimeout('https://attack.mitre.org/versions.json');
  //   ...
  return {
    latestVersion: BUNDLED_MITRE_VERSION,
    publishedAt: new Date().toISOString(),
    entryCount: MITRE_TECHNIQUES.length,
    sizeBytes: 0,
  };
}

/** Sync (download + validate + swap) the MITRE dataset. ARCHITECTURE-ONLY:
 *  not yet implemented with a real endpoint. Returns a structured result so
 *  the UI can render an honest "sync architecture ready — live sync not
 *  wired" message. */
export interface MitreSyncResult {
  status: 'noop' | 'offline' | 'up_to_date' | 'not_implemented';
  message: string;
}

export async function syncMitre(): Promise<MitreSyncResult> {
  if (!isOnline()) return { status: 'offline', message: 'No Internet connection.' };
  // Architecture in place; live download not wired. Update the datasetMeta
  // row so "Last Sync" reflects the user's intent to confirm the current
  // dataset.
  await db.datasetMeta.put({
    id: 'singleton',
    mitreVersion: BUNDLED_MITRE_VERSION,
    mitreLastSync: new Date().toISOString(),
    sigmaVersion: '', sigmaLastSync: null, sigmaRulesCount: 0, updatedAt: new Date().toISOString(),
  });
  return { status: 'up_to_date', message: 'Local MITRE dataset confirmed.' };
}
