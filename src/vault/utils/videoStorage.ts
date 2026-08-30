import { db } from '../db';

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
/*   </figure>                                                         */
/*                                                                     */
/* Compatibilidad legacy: las notas creadas por la versión anterior    */
/* usaban `data-vid="vid-…"` con archivos `{id}.{ext}` en la carpeta.  */
/* `resolveLegacyVideoUrl()` escanea la carpeta buscando ese prefijo   */
/* para que los embeds existentes sigan reproduciéndose.               */
/* ------------------------------------------------------------------ */

/** Minimal structural typings (FSA isn't in lib.dom for all targets). */
interface FSWritableLike {
  write: (data: Blob) => Promise<void>;
  close: () => Promise<void>;
}
interface FSFileHandleLike {
  createWritable?: (opts?: unknown) => Promise<FSWritableLike>;
  getFile?: () => Promise<File>;
}
interface FSDirHandleLike {
  name: string;
  kind: string;
  queryPermission?: (desc: { mode: 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (desc: { mode: 'readwrite' }) => Promise<PermissionState>;
  getFileHandle?: (name: string, opts?: { create?: boolean }) => Promise<FSFileHandleLike>;
  getDirectoryHandle?: (name: string, opts?: { create?: boolean }) => Promise<FSDirHandleLike>;
  removeEntry?: (name: string) => Promise<void>;
  values?: () => AsyncIterableIterator<FSDirHandleLike & FSFileHandleLike>;
}

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

const VIDEOS_DIR_KEY = 'vault-videos-dir';
const APP_DIR_KEY = 'vault-app-dir'; // app folder (backups target) — NOT videos

export function isFsSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/* ------------------------- Directory management ------------------------- */

/** Stored handle for the videos folder, or null when never picked. */
export async function getVideosDirectory(): Promise<FSDirHandleLike | null> {
  try {
    const stored = await db.fileHandles.get(VIDEOS_DIR_KEY);
    return (stored?.handle as unknown as FSDirHandleLike) || null;
  } catch {
    return null;
  }
}

/** True when the user picked a videos folder at some point. */
export async function hasVideosDirectory(): Promise<boolean> {
  return (await getVideosDirectory()) !== null;
}

/** Display name of the videos folder (e.g. "Mis Videos SOC"), or null. */
export async function getVideosDirectoryName(): Promise<string | null> {
  const dir = await getVideosDirectory();
  return dir ? dir.name : null;
}

/** True when the stored folder is usable right now (permission granted). */
export async function isVideosPermissionGranted(): Promise<boolean> {
  const dir = await getVideosDirectory();
  if (!dir) return false;
  try {
    const perm = dir.queryPermission
      ? await dir.queryPermission({ mode: 'readwrite' })
      : 'granted';
    return perm === 'granted';
  } catch {
    return false;
  }
}

/**
 * Ask the user to pick THE videos folder (any folder on their disk).
 * Stores the DirectoryHandle so the choice persists across sessions.
 * MUST be called from a user gesture (button click). Returns false when
 * the user cancels the picker or the browser doesn't support FSA.
 */
export async function setVideosDirectory(): Promise<boolean> {
  const picker = (window as unknown as {
    showDirectoryPicker?: (opts?: unknown) => Promise<FSDirHandleLike>;
  }).showDirectoryPicker;
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
 *  are the user's and are never deleted by the app). */
export async function forgetVideosDirectory(): Promise<void> {
  await db.fileHandles.delete(VIDEOS_DIR_KEY);
}

/**
 * Re-request permission on the stored videos folder. MUST be called from
 * a user gesture (button click) — requestPermission otherwise throws.
 */
export async function ensureVideosPermission(): Promise<boolean> {
  const dir = await getVideosDirectory();
  if (!dir) return false;
  try {
    let perm = dir.queryPermission
      ? await dir.queryPermission({ mode: 'readwrite' })
      : 'granted';
    if (perm !== 'granted' && dir.requestPermission) {
      perm = await dir.requestPermission({ mode: 'readwrite' });
    }
    return perm === 'granted';
  } catch {
    return false;
  }
}

/* ----------------------------- Filenames ------------------------------ */

/**
 * Sanitize a user-provided filename for the videos folder: strip path
 * separators / control chars, collapse whitespace, cap the length, and
 * keep (or derive from the mime type) a sensible extension.
 */
export function sanitizeVideoFilename(name: string, mimeType?: string): string {
  let base = (name || 'video')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  let ext = '';
  const dot = base.lastIndexOf('.');
  if (dot > 0) {
    ext = base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
    base = base.slice(0, dot).trim() || 'video';
  }
  if (!ext) {
    const sub = (mimeType || 'video/mp4').split('/')[1] || 'mp4';
    ext = sub.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'mp4';
  }
  if (base.length > 100) base = base.slice(0, 100).trim();
  return `${base}.${ext}`;
}

async function fileExists(dir: FSDirHandleLike, filename: string): Promise<boolean> {
  try {
    await dir.getFileHandle!(filename, { create: false });
    return true;
  } catch {
    return false;
  }
}

/** `clip.mp4` → `clip (1).mp4`, `clip (2).mp4`, … (first free slot). */
async function uniqueNameIn(dir: FSDirHandleLike, filename: string): Promise<string> {
  const dot = filename.lastIndexOf('.');
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : '';
  for (let i = 1; i < 1000; i++) {
    const candidate = `${stem} (${i})${ext}`;
    if (!(await fileExists(dir, candidate))) return candidate;
  }
  return `${stem}-${Date.now()}${ext}`;
}

/* ------------------------------ Saving ------------------------------- */

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

/** True when the first bytes match a known video container signature.
 *  Empty files return false; a read failure returns true (the sniff must
 *  never block the REGLA DE ORO flow on its own I/O error). */
async function looksLikeVideoFile(file: File): Promise<boolean> {
  if (file.size === 0) return false;
  try {
    const head = new Uint8Array(await file.slice(0, 512).arrayBuffer());
    return VIDEO_MAGIC_SIGS.some((sig) => sig(head));
  } catch {
    return true;
  }
}

export interface SaveVideoOpts {
  /** What to do when the target filename already exists in the folder.
   *  The callback typically shows a dialog ("sobrescribir" vs "nombre
   *  único"). When omitted, the safe default is a unique name. */
  onConflict?: (existingName: string) => Promise<'overwrite' | 'rename'> | 'overwrite' | 'rename';
  /** Force the stored filename (used by "Buscar archivo" so a re-linked
   *  file takes the exact name the note reference expects). */
  forceName?: string;
}

/**
 * COPIES a video file into the user's videos folder (raw file on disk —
 * never IndexedDB, never the backup). Returns the FINAL filename so the
 * caller can embed `data-vault-video="<filename>"` in the note HTML.
 * Throws NoVideosDirectoryError / VideosPermissionError so the UI can
 * react with the right prompt.
 */
export async function saveVideoToDirectory(file: File, opts: SaveVideoOpts = {}): Promise<string> {
  const dir = await getVideosDirectory();
  if (!dir || !dir.getFileHandle) throw new NoVideosDirectoryError();

  // Permission: query first; request when we're inside a user gesture
  // (button click / drop). Without a gesture this throws and the UI shows
  // the "Conceder acceso" banner.
  let perm = dir.queryPermission ? await dir.queryPermission({ mode: 'readwrite' }) : 'granted';
  if (perm !== 'granted') {
    if (!dir.requestPermission) throw new VideosPermissionError();
    perm = await dir.requestPermission({ mode: 'readwrite' });
  }
  if (perm !== 'granted') throw new VideosPermissionError();

  // AUDIT RECOMMENDATION (VN-AUD-I3): immediate feedback when the file
  // doesn't smell like a video (renamed executable, corrupt download,
  // empty file). File.type lies (extension-derived), so sniff the actual
  // bytes. The user keeps the final say — their disk, their file; the app
  // never executes it. Cancelling aborts silently via VideoRejectedError.
  if (!(await looksLikeVideoFile(file))) {
    const proceed = window.confirm(
      `"${file.name}" no parece ser un video: su contenido no coincide con ningún formato conocido.\n\n` +
      'Puede ser un archivo renombrado o corrupto. Se copiaría tal cual a tu carpeta de videos.\n\n' +
      '¿Copiarlo de todos modos?'
    );
    if (!proceed) throw new VideoRejectedError();
  }

  let filename = sanitizeVideoFilename(opts.forceName || file.name, file.type || undefined);
  if (await fileExists(dir, filename)) {
    let action: 'overwrite' | 'rename' = 'rename';
    if (opts.onConflict) {
      action = await opts.onConflict(filename);
    }
    if (action === 'rename') filename = await uniqueNameIn(dir, filename);
  }

  const fh = await dir.getFileHandle(filename, { create: true });
  const writable = await fh.createWritable!();
  await writable.write(file);
  await writable.close();
  return filename;
}

/* ------------------------------ Reading ------------------------------- */

/** Depth-limited recursive search for a file inside the folder (the user
 *  may have organized their videos into subfolders). */
async function findFileHandle(
  dir: FSDirHandleLike,
  filename: string,
  depth = 0,
): Promise<FSFileHandleLike | null> {
  if (!dir.getFileHandle) return null;
  try {
    return await dir.getFileHandle(filename, { create: false });
  } catch {
    /* not directly here — search subfolders */
  }
  if (depth >= 3 || !dir.values || !dir.getDirectoryHandle) return null;
  try {
    for await (const entry of dir.values()) {
      if (entry.kind !== 'directory') continue;
      const sub = await dir.getDirectoryHandle(entry.name);
      const found = await findFileHandle(sub, filename, depth + 1);
      if (found) return found;
    }
  } catch {
    /* permission or transient error — treat as not found */
  }
  return null;
}

/**
 * Resolves a `data-vault-video` reference to a playable ObjectURL by
 * finding the file inside the stored folder. Returns null when the file
 * doesn't exist. Throws VideosPermissionError when the folder is locked
 * (callers surface the "Conceder acceso" banner — never a silent miss).
 * The ObjectURL must be revoked by the caller (editors revoke on unmount).
 */
export async function getVideoObjectURL(filename: string): Promise<string | null> {
  const dir = await getVideosDirectory();
  if (!dir || !dir.getFileHandle) throw new NoVideosDirectoryError();

  const perm = dir.queryPermission ? await dir.queryPermission({ mode: 'readwrite' }) : 'granted';
  if (perm !== 'granted') throw new VideosPermissionError();

  const safeName = sanitizeVideoFilename(filename);
  const fh = (await findFileHandle(dir, safeName)) || (await findFileHandle(dir, filename));
  if (!fh || !fh.getFile) return null;
  const file = await fh.getFile();
  return URL.createObjectURL(file);
}

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

  const perm = dir.queryPermission ? await dir.queryPermission({ mode: 'readwrite' }) : 'granted';
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
 * has anything to do with videos (REGLA DE ORO decoupling).            */

async function getAppDirHandle(): Promise<FSDirHandleLike | null> {
  try {
    const stored = await db.fileHandles.get(APP_DIR_KEY);
    return (stored?.handle as unknown as FSDirHandleLike) || null;
  } catch {
    return null;
  }
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
  const picker = (window as unknown as {
    showDirectoryPicker?: (opts?: unknown) => Promise<FSDirHandleLike>;
  }).showDirectoryPicker;
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
      await parent.getFileHandle('iniciar.bat');
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
        'La carpeta elegida no parece ser la carpeta de la app (no contiene iniciar.bat).\n\n' +
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

/** Writes a file (e.g. the backup zip) directly INTO the app folder. */
export async function writeFileToAppFolder(filename: string, blob: Blob): Promise<boolean> {
  const dir = await getAppDirHandle();
  if (!dir || !dir.getFileHandle) return false;
  try {
    let perm = dir.queryPermission ? await dir.queryPermission({ mode: 'readwrite' }) : 'granted';
    if (perm !== 'granted' && dir.requestPermission) {
      perm = await dir.requestPermission({ mode: 'readwrite' });
    }
    if (perm !== 'granted') return false;
    const fh = await dir.getFileHandle(filename, { create: true });
    const writable = await fh.createWritable!();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (err) {
    console.warn('writeFileToAppFolder failed:', err);
    return false;
  }
}

/** Stop using the app folder (backups go back to the download picker). */
export async function forgetAppFolder(): Promise<void> {
  await db.fileHandles.delete(APP_DIR_KEY);
}
