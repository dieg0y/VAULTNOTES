import { db } from '../db';
import {
  createFsMediaFolder,
  ensureDirPermission,
  getDirectoryPicker,
  queryDirPermission,
  readStoredDirHandle,
  writeFileToDir,
  type FSDirHandleLike,
  type FSFileHandleLike,
} from './fsStorage';

/* ------------------------------------------------------------------ */
/* Video storage — File System Access API ONLY (REGLA DE ORO).         */
/*                                                                     */
/* NINGÚN video se guarda nunca dentro de IndexedDB.                   */
/* NINGÚN video se incluye nunca en el export/import (ZIP).            */
/* Los videos viven únicamente en la carpeta del disco que el usuario  */
/* elige (Configuración → Carpeta de Videos). La app guarda SOLO el    */
/* DirectoryHandle (tabla `fileHandles`) y referencias limpias por     */
/* nombre de archivo en el HTML de las notas:                          */
/*                                                                     */
/*   <figure class="vault-video-embed" data-vault-video="clip.mp4">    */
/*     <video controls></video>   ← src = ObjectURL efímero en runtime */
/*   </figure>                                                          */
/*                                                                     */
/* Compatibilidad legacy: las notas creadas por la versión anterior    */
/* usaban `data-vid="vid-…"` con archivos `{id}.{ext}` en la carpeta.  */
/* `resolveLegacyVideoUrl()` escanea la carpeta buscando ese prefijo   */
/* para que los embeds existentes sigan reproduciéndose.               */
/*                                                                     */
/* REFACTOR (R3): la maquinaria FSA común (tipings, carpeta, permisos, */
/* sanitización, unificación de nombre, sniff, guardado, búsqueda       */
/* recursiva y ObjectURL) vive ahora en utils/fsStorage.ts — este       */
/* archivo define la configuración de la familia videos, re-exporta     */
/* las funciones generadas bajo sus nombres históricos y conserva       */
/* AQUÍ (sin genericar) lo exclusivo de videos: la carpeta de la app    */
/* (target de backups) y la migración legacy.                          */
/* ------------------------------------------------------------------ */

/** The user hasn't picked a videos folder yet (Settings → Carpeta de Videos). */
export class NoVideosDirectoryError extends Error {
  constructor() {
    super('No hay carpeta de videos configurada');
    this.name = 'NoVideosDirectoryError';
  }
}

/** The stored folder exists but the browser needs permission again
 *  (typically after a restart). Callers with a user gesture should call
 *  `ensureVideosPermission()`; without one, show the banner. */
export class VideosPermissionError extends Error {
  constructor() {
    super('Falta permiso sobre la carpeta de videos');
    this.name = 'VideosPermissionError';
  }
}

/** AUDIT RECOMMENDATION (VN-AUD-I3): the user declined the copy after the
 *  magic-byte warning ("esto no parece un video"). Callers treat it as a
 *  SILENT abort — the user already made an informed choice, no further
 *  error alert is needed. */
export class VideoRejectedError extends Error {
  constructor() {
    super('El usuario descartó copiar el archivo que no parece un video');
    this.name = 'VideoRejectedError';
  }
}

/** Key pública: mediaVault.ts (bóveda GITHUBVAULT) escribe aquí su handle
 *  de videos para que TODO el machinery existente de videos funcione sin
 *  cambios con la carpeta por defecto Documents/GITHUBVAULT/videos. */
export const VIDEOS_DIR_KEY = 'vault-videos-dir';
const APP_DIR_KEY = 'vault-app-dir'; // app folder (backups target) — NOT videos

export function isFsSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/* ------------------------- Sniff de videos ------------------------- */

/** AUDIT RECOMMENDATION (VN-AUD-I3): known video-container magic bytes.
 *  File.type is derived from the file EXTENSION by the browser, so a
 *  renamed executable ("virus.mp4") reports video/mp4 and sails through
 *  the `file.type.startsWith('video/')` gate in the editors. The sniff is
 *  ADVISORY ONLY — never a hard block: exotic-but-legit containers must
 *  keep flowing through the REGLA DE ORO path. */
const VIDEO_MAGIC_SIGS: ((b: Uint8Array) => boolean)[] = [
  // MP4 / M4V / MOV / 3GP / HEVC-in-ISOBMFF — 'ftyp' box at offset 4.
  (b) => b.length >= 8 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70,
  // WebM / Matroska — EBML header.
  (b) => b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3,
  // AVI — 'RIFF'….AVI .
  (b) => b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x41 && b[9] === 0x56 && b[10] === 0x49 && b[11] === 0x20,
  // Flash Video.
  (b) => b.length >= 3 && b[0] === 0x46 && b[1] === 0x4c && b[2] === 0x56,
  // Ogg (Theora/Vorbis).
  (b) => b.length >= 4 && b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53,
  // MPEG-TS — 0x47 sync byte every 188 bytes.
  (b) => b.length >= 377 && b[0] === 0x47 && b[188] === 0x47 && b[376] === 0x47,
  // MPEG-PS / VOB (0x00 00 01 BA) / MPEG video ES (0x00 00 01 B3).
  (b) => b.length >= 4 && b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && (b[3] === 0xba || b[3] === 0xb3),
  // ASF / WMV.
  (b) => b.length >= 8 && b[0] === 0x30 && b[1] === 0x26 && b[2] === 0xb2 && b[3] === 0x75 && b[4] === 0x8e && b[5] === 0x66 && b[6] === 0xcf && b[7] === 0x11,
  // RealMedia.
  (b) => b.length >= 4 && b[0] === 0x2e && b[1] === 0x52 && b[2] === 0x4d && b[3] === 0x46,
  // Material eXchange Format (broadcast cameras).
  (b) => b.length >= 4 && b[0] === 0x06 && b[1] === 0x0e && b[2] === 0x2b && b[3] === 0x34,
];

/* --------------------- Familia generada (fsStorage) --------------------- */
/* Las funciones son cierres puros de la configuración — re-exportarlas
 * como const preserva nombre, firma y comportamiento exactos.          */

const videosFolder = createFsMediaFolder({
  dirKey: VIDEOS_DIR_KEY,
  kindLabel: 'un video', // texto del confirm(): "no parece ser un video"
  folderLabel: 'videos', // texto del confirm(): "a tu carpeta de videos"
  fallbackBase: 'video', // nombre base de respaldo al sanitizar
  fallbackMime: 'video/mp4', // mime de respaldo al derivar la extensión
  fallbackExt: 'mp4',
  sniffBytes: 512, // cabecera leída para el sniff (las imágenes leen 64)
  magicSigs: VIDEO_MAGIC_SIGS,
  // quickAccept: los videos no tienen caso SVG — el sniff puro basta.
  errors: {
    noDirectory: NoVideosDirectoryError,
    permission: VideosPermissionError,
    rejected: VideoRejectedError,
  },
});

/** Stored handle for the videos folder, or null when never picked.
 *  (Sigue SIN exportarse, igual que en el original.) */
const getVideosDirectory = videosFolder.getDirectory;

/** True when the user picked a videos folder at some point. */
export const hasVideosDirectory = videosFolder.hasDirectory;

/** True when the stored folder is usable right now (permission granted). */
export const isVideosPermissionGranted = videosFolder.isPermissionGranted;

/**
 * Re-request permission on the stored videos folder. MUST be called from
 * a user gesture (button click) — requestPermission otherwise throws.
 */
export const ensureVideosPermission = videosFolder.ensurePermission;

/**
 * COPIES a video file into the user's videos folder (raw file on disk —
 * never IndexedDB, never the backup). Returns the FINAL filename so the
 * caller can embed `data-vault-video="<filename>"` in the note HTML.
 * Throws NoVideosDirectoryError / VideosPermissionError so the UI can
 * react with the right prompt.
 */
export const saveVideoToDirectory = videosFolder.saveToDirectory;

/**
 * Resolves a `data-vault-video` reference to a playable ObjectURL by
 * finding the file inside the stored folder. Returns null when the file
 * doesn't exist. Throws VideosPermissionError when the folder is locked
 * (callers surface the "Conceder acceso" banner — never a silent miss).
 * The ObjectURL must be revoked by the caller (editors revoke on unmount).
 */
export const getVideoObjectURL = videosFolder.getObjectURL;

/* ------------------------- Directory management ------------------------- */

/** Display name of the videos folder (e.g. "Mis Videos SOC"), or null. */
export async function getVideosDirectoryName(): Promise<string | null> {
  const dir = await getVideosDirectory();
  return dir ? dir.name : null;
}

/**
 * Ask the user to pick THE videos folder (any folder on their disk).
 * Stores the DirectoryHandle so the choice persists across sessions.
 * MUST be called from a user gesture (button click). Returns false when
 * the user cancels the picker or the browser doesn't support FSA.
 */
export async function setVideosDirectory(): Promise<boolean> {
  const picker = getDirectoryPicker();
  if (!picker) return false;
  try {
    const prev = await getVideosDirectory();
    const dir = await picker.call(window, {
      mode: 'readwrite',
      id: 'vaultnotes-videos',
      ...(prev ? { startIn: prev } : {}),
    });
    if (!dir.getFileHandle) throw new Error('unsupported');
    await db.fileHandles.put({ id: VIDEOS_DIR_KEY, handle: dir as unknown as FileSystemFileHandle });
    return true;
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === 'AbortError') return false; // user cancelled
    console.warn('setVideosDirectory failed:', err);
    return false;
  }
}

/** Stop using the videos folder (references stay in the notes; the files
 *  are the user's and are never deleted by the app).
 *  E3: ahora atrapa los fallos de IndexedDB al estilo de sus hermanos
 *  (setVideosDirectory / pickAppFolder) — antes una excepción quedaba
 *  como rechazo flotante en el `await` de SettingsView. */
export async function forgetVideosDirectory(): Promise<boolean> {
  try {
    await db.fileHandles.delete(VIDEOS_DIR_KEY);
    return true;
  } catch (err: unknown) {
    console.warn('forgetVideosDirectory failed:', err);
    return false;
  }
}

/* ------------------------------ Legacy ------------------------------- */

/**
 * LEGACY COMPATIBILITY: notes written by the previous version embed
 * `data-vid="vid-…"` and stored raw files named `{id}.{ext}` inside
 * (app)/VaultNotesVideos. With the metadata table gone, we scan the
 * folder for a file whose name starts with the id — the embed keeps
 * playing as long as the file is still on disk.
 */
export async function resolveLegacyVideoUrl(vid: string): Promise<string | null> {
  const dir = await getVideosDirectory();
  if (!dir || !dir.getFileHandle || !dir.values) return null;

  const perm = await queryDirPermission(dir);
  if (perm !== 'granted') throw new VideosPermissionError();

  // `vid-1234567-abcd` → filename prefix `vid-1234567-abcd.`
  const prefix = `${vid}.`;
  const candidates: FSFileHandleLike[] = [];
  try {
    for await (const entry of dir.values()) {
      if (entry.kind === 'file' && entry.name.startsWith(prefix)) {
        candidates.push(entry);
      }
    }
  } catch {
    return null;
  }
  // Newest write wins when several extensions match.
  if (candidates.length === 0) return null;
  let best: { file: File } | null = null;
  for (const c of candidates) {
    try {
      const f = await c.getFile!();
      if (!best || f.lastModified > best.file.lastModified) best = { file: f };
    } catch {
      /* unreadable — skip */
    }
  }
  return best ? URL.createObjectURL(best.file) : null;
}

/* ---------------------- App folder (backups only) ---------------------- */
/* The "app folder" feature survives ONLY as the backup target: every
 * "Guardar Backup" writes VaultNotes-Backup.zip into it. It no longer
 * has anything to do with videos (REGLA DE ORO decoupling).
 * Flujo LOCAL (no genericado): consume los helpers de bajo nivel de
 * fsStorage (readStoredDirHandle, queryDirPermission, ensureDirPermission,
 * writeFileToDir).                                                        */

async function getAppDirHandle(): Promise<FSDirHandleLike | null> {
  return readStoredDirHandle(APP_DIR_KEY);
}

/** True when the user picked the app folder (backup target). */
export async function hasAppFolder(): Promise<boolean> {
  return (await getAppDirHandle()) !== null;
}

/** Name of the app folder the user picked (e.g. "VAULTNOTES"). */
export async function getAppFolderName(): Promise<string | null> {
  const dir = await getAppDirHandle();
  return dir ? dir.name : null;
}

/**
 * Ask the user to pick THE APP FOLDER (where the backups will be written).
 * MUST be called from a user gesture. Soft-verifies the folder by looking
 * for iniciar.bat / package.json markers. NOTE (REGLA DE ORO): this no
 * longer configures the videos folder — videos live wherever the user
 * chose in Configuración → Carpeta de Videos.
 */
export async function pickAppFolder(): Promise<boolean> {
  const picker = getDirectoryPicker();
  if (!picker) return false;
  try {
    const prev = await getAppDirHandle();
    const parent = await picker.call(window, {
      mode: 'readwrite',
      id: 'vaultnotes-app',
      ...(prev ? { startIn: prev } : {}),
    });
    if (!parent.getFileHandle) throw new Error('unsupported');

    let looksLikeApp = false;
    try {
      await parent.getFileHandle('IniciarVaultNotes.bat');
      looksLikeApp = true;
    } catch {
      try {
        await parent.getFileHandle('package.json');
        looksLikeApp = true;
      } catch {
        /* no marker found */
      }
    }
    if (!looksLikeApp) {
      const proceed = window.confirm(
        'La carpeta elegida no parece ser la carpeta de la app (no contiene IniciarVaultNotes.bat).\n\n' +
        'Los backups se guardarán DENTRO de esta carpeta.\n\n' +
        '¿Usar esta carpeta de todos modos?'
      );
      if (!proceed) return false;
    }

    await db.fileHandles.put({ id: APP_DIR_KEY, handle: parent as unknown as FileSystemFileHandle });
    return true;
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === 'AbortError') return false; // user cancelled
    console.warn('pickAppFolder failed:', err);
    return false;
  }
}

/** E4: resultado discriminado de la escritura en la carpeta de la app —
 *  antes un `false` mudo cubría tres fallos distintos (sin carpeta, sin
 *  permiso, error de escritura) y el caller perdía la causa. */
export type WriteAppFolderResult =
  | { ok: true }
  | { ok: false; reason: 'no-folder' | 'no-permission' | 'write-error'; error?: unknown };

/**
 * Escribe un archivo (p.ej. el zip de backup) directamente EN la carpeta
 * de la app, devolviendo la causa EXACTA del fallo — autoBackup.ts mapea
 * cada `reason` a un mensaje de usuario específico. Puede pedir permiso
 * si hay un gesto de usuario de por medio (backupNow); en flujo automático
 * silencioso devuelve 'no-permission' sin lanzar.
 */
export async function writeFileToAppFolderDetailed(
  filename: string,
  blob: Blob,
): Promise<WriteAppFolderResult> {
  const dir = await getAppDirHandle();
  if (!dir || !dir.getFileHandle) return { ok: false, reason: 'no-folder' };
  try {
    if ((await ensureDirPermission(dir)) !== 'granted') {
      return { ok: false, reason: 'no-permission' };
    }
    await writeFileToDir(dir, filename, blob);
    return { ok: true };
  } catch (err: unknown) {
    console.warn('writeFileToAppFolder failed:', err);
    return { ok: false, reason: 'write-error', error: err };
  }
}

/**
 * Writes a file (e.g. the backup zip) directly INTO the app folder.
 * Envoltorio booleano de compatibilidad: zipBackup.ts (fuera del alcance
 * de R3) consume el resultado como booleano — `await ….catch(() => false)`
 * + `if (wroteToApp)` — así que el tipo de retorno de ESTA función no
 * puede cambiar sin editar ese archivo. El flujo detallado vive en
 * `writeFileToAppFolderDetailed`; este wrapper preserva el comportamiento
 * histórico exacto (false silencioso para carpeta/permiso, warn + false
 * para errores de escritura).
 */
export async function writeFileToAppFolder(filename: string, blob: Blob): Promise<boolean> {
  return (await writeFileToAppFolderDetailed(filename, blob)).ok;
}

/* -------- App folder: listing / reading / pruning (auto-backup) --------
 * Feeds the rotating auto-backups that keep a USB folder up to date and
 * the "restaurar último backup" flow on a new machine. All of them are
 * SILENT (queryPermission only — requestPermission needs a user gesture
 * and would throw here).                                                    */

/** A file entry of the app folder, with the metadata the backup logic needs. */
interface AppFolderFile {
  name: string;
  lastModified: number;
  size: number;
}

/** True when the stored app folder is usable RIGHT NOW without a gesture. */
export async function isAppFolderPermissionGranted(): Promise<boolean> {
  const dir = await getAppDirHandle();
  if (!dir) return false;
  try {
    return (await queryDirPermission(dir)) === 'granted';
  } catch {
    return false;
  }
}

/** Lists the FILES of the app folder (subfolders are skipped). Returns null
 *  when there is no folder stored or the permission is not granted. */
export async function listAppFolderFiles(): Promise<AppFolderFile[] | null> {
  const dir = await getAppDirHandle();
  if (!dir || !dir.values) return null;
  try {
    const perm = await queryDirPermission(dir);
    if (perm !== 'granted') return null;
    const files: AppFolderFile[] = [];
    for await (const entry of dir.values()) {
      if (entry.kind !== 'file' || !entry.getFile) continue;
      try {
        const f = await entry.getFile();
        files.push({ name: entry.name, lastModified: f.lastModified, size: f.size });
      } catch {
        /* unreadable file — skip it */
      }
    }
    return files;
  } catch (err) {
    console.warn('listAppFolderFiles failed:', err);
    return null;
  }
}

/** Reads one file of the app folder as a File (null: missing/locked/no perm). */
export async function readAppFolderFile(name: string): Promise<File | null> {
  const dir = await getAppDirHandle();
  if (!dir || !dir.getFileHandle) return null;
  try {
    const perm = await queryDirPermission(dir);
    if (perm !== 'granted') return null;
    const fh = await dir.getFileHandle(name, { create: false });
    if (!fh.getFile) return null;
    return await fh.getFile();
  } catch {
    return null;
  }
}

/** Deletes one entry of the app folder (used to prune old auto-backups).
 *  Never throws — a failed prune must not fail the backup that produced it. */
export async function removeAppFolderEntry(name: string): Promise<boolean> {
  const dir = await getAppDirHandle();
  if (!dir || !dir.removeEntry) return false;
  try {
    const perm = await queryDirPermission(dir);
    if (perm !== 'granted') return false;
    await dir.removeEntry(name);
    return true;
  } catch {
    return false;
  }
}

/** Stop using the app folder (backups go back to the download picker).
 *  E3: ahora atrapa los fallos de IndexedDB al estilo de pickAppFolder —
 *  antes una excepción quedaba como rechazo flotante en SettingsView. */
export async function forgetAppFolder(): Promise<boolean> {
  try {
    await db.fileHandles.delete(APP_DIR_KEY);
    return true;
  } catch (err: unknown) {
    console.warn('forgetAppFolder failed:', err);
    return false;
  }
}
