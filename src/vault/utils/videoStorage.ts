import { db } from '../db';
import { StoredVideo } from '../types';

/* ------------------------------------------------------------------ */
/* Video storage — dual backend                                        */
/*                                                                     */
/* 1) PRIMARY: File System Access API — a dedicated `VaultNotesVideos` */
/*    folder on the user's real disk. Videos are stored as RAW files   */
/*    (mp4/webm/mkv...), with NO practical size limit beyond free      */
/*    disk space. The directory handle persists in IndexedDB.          */
/*                                                                     */
/* 2) FALLBACK: IndexedDB blobs (Firefox/Safari or if the user hasn't  */
/*    picked a folder). We request `navigator.storage.persist()` to    */
/*    minimize eviction and maximize quota.                            */
/*                                                                     */
/* Backups read from BOTH sources, so a single .zip stays portable.    */
/* ------------------------------------------------------------------ */

/** Minimal structural typings (FSA isn't in lib.dom for all targets). */
interface FSWritableLike {
  write: (data: Blob) => Promise<void>;
  close: () => Promise<void>;
}
interface FSFileHandleLike {
  createWritable?: (opts?: unknown) => Promise<FSWritableLike>;
  getFile?: () => Promise<File>;
  remove?: () => Promise<void>;
}
interface FSDirHandleLike {
  name: string;
  queryPermission?: (desc: { mode: 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (desc: { mode: 'readwrite' }) => Promise<PermissionState>;
  getFileHandle?: (name: string, opts?: { create?: boolean }) => Promise<FSFileHandleLike>;
  removeEntry?: (name: string) => Promise<void>;
  values?: () => AsyncIterableIterator<FSFileHandleLike & { name: string; kind: string }>;
}

export const VIDEOS_DIR_NAME = 'VaultNotesVideos';
const DIR_HANDLE_KEY = 'vault-videos-dir';
const DECLINED_FLAG = 'vault-videos-dir-declined';

export function isFsSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export function videoExtensionFor(meta: { name?: string; mimeType?: string }): string {
  if (meta.name && meta.name.includes('.')) {
    return (meta.name.split('.').pop() || 'mp4').toLowerCase();
  }
  const sub = (meta.mimeType || 'video/mp4').split('/')[1] || 'mp4';
  return sub.replace(/[^a-z0-9]/gi, '') || 'mp4';
}

function fileNameFor(id: string, meta: { name?: string; mimeType?: string }): string {
  return `${id}.${videoExtensionFor(meta)}`;
}

/* ------------------------- Directory management ------------------------- */

async function getDirHandle(): Promise<FSDirHandleLike | null> {
  try {
    const stored = await db.fileHandles.get(DIR_HANDLE_KEY);
    return (stored?.handle as unknown as FSDirHandleLike) || null;
  } catch {
    return null;
  }
}

/** True when the user picked a videos folder at some point. */
export async function hasVideosDir(): Promise<boolean> {
  return (await getDirHandle()) !== null;
}

export async function getVideosDirName(): Promise<string | null> {
  const dir = await getDirHandle();
  return dir ? dir.name : null;
}

/** Is the stored folder usable right now (permission granted)? */
export async function isFsReady(): Promise<boolean> {
  const dir = await getDirHandle();
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
 * Folder exists but permission needs re-granting (e.g. after browser
 * restart). MUST be called from a user gesture (button click).
 */
export async function ensureFsPermission(): Promise<boolean> {
  const dir = await getDirHandle();
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

/**
 * Asks the user to pick a folder on their PC; creates/uses a
 * `VaultNotesVideos` subfolder inside it and remembers the handle.
 * MUST be called from a user gesture.
 */
export async function pickVideosDir(): Promise<boolean> {
  const picker = (window as unknown as {
    showDirectoryPicker?: (opts?: unknown) => Promise<FSDirHandleLike>;
  }).showDirectoryPicker;
  if (!picker) return false;
  try {
    const parent = await picker({ mode: 'readwrite' });
    if (!parent.getFileHandle) throw new Error('unsupported');
    // Dedicated subfolder so we never touch the user's other files
    const dir = await (parent as unknown as {
      getDirectoryHandle: (name: string, opts?: { create?: boolean }) => Promise<FSDirHandleLike>;
    }).getDirectoryHandle(VIDEOS_DIR_NAME, { create: true });
    await db.fileHandles.put({ id: DIR_HANDLE_KEY, handle: dir as unknown as FileSystemFileHandle });
    try {
      localStorage.removeItem(DECLINED_FLAG);
    } catch { /* ignore */ }
    return true;
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === 'AbortError') return false; // user cancelled
    console.warn('pickVideosDir failed:', err);
    return false;
  }
}

/** Stop using the disk folder (falls back to browser storage). */
export async function forgetVideosDir(): Promise<void> {
  await db.fileHandles.delete(DIR_HANDLE_KEY);
}

/* ----------------------------- Saving ------------------------------ */

/** True if we should prompt the user to choose the folder (once). */
export function shouldAskForDir(): boolean {
  try {
    return !localStorage.getItem(DECLINED_FLAG);
  } catch {
    return true;
  }
}

export function markDirDeclined(): void {
  try {
    localStorage.setItem(DECLINED_FLAG, '1');
  } catch { /* ignore */ }
}

/**
 * Persists a video. Writes it as a RAW FILE into the user's
 * VaultNotesVideos folder when available (no size limit); otherwise
 * stores an IndexedDB blob (with a persistence request to the browser).
 * Metadata always lands in the `videos` table.
 */
export async function saveVideoBlob(meta: {
  id: string;
  noteId?: string;
  labId?: string;
  name: string;
  mimeType: string;
  blob: Blob;
  caption?: string;
  createdAt?: string;
}): Promise<{ storedIn: 'fs' | 'idb' }> {
  const createdAt = meta.createdAt || new Date().toISOString();

  const dir = await getDirHandle();
  if (dir && dir.getFileHandle && (await fsGranted(dir))) {
    try {
      const fh = await dir.getFileHandle(fileNameFor(meta.id, meta), { create: true });
      const writable = await fh.createWritable!();
      await writable.write(meta.blob);
      await writable.close();
      await db.videos.put({ ...meta, createdAt, storedIn: 'fs' });
      return { storedIn: 'fs' };
    } catch (err) {
      console.warn('FSA write failed, falling back to IndexedDB:', err);
    }
  }

  // Fallback: browser storage with a persistence request
  try {
    const nav = navigator as Navigator & { storage?: { persist?: () => Promise<boolean> } };
    await nav.storage?.persist?.();
  } catch { /* ignore */ }
  await db.videos.put({ ...meta, createdAt, storedIn: 'idb' });
  return { storedIn: 'idb' };
}

async function fsGranted(dir: FSDirHandleLike): Promise<boolean> {
  try {
    const perm = dir.queryPermission ? await dir.queryPermission({ mode: 'readwrite' }) : 'granted';
    if (perm === 'granted') return true;
    if (dir.requestPermission) {
      return (await dir.requestPermission({ mode: 'readwrite' })) === 'granted';
    }
    return false;
  } catch {
    return false;
  }
}

/* ----------------------------- Reading ----------------------------- */

/** Resolves the playable Blob for a video id — disk folder first, then IDB. */
export async function getVideoBlobById(id: string): Promise<Blob | null> {
  const meta = await db.videos.get(id);
  // 1) Disk folder (raw file)
  const dir = await getDirHandle();
  if (dir && dir.getFileHandle) {
    try {
      if (await fsGranted(dir)) {
        const fh = await dir.getFileHandle(fileNameFor(id, meta || {}));
        const file = await fh.getFile!();
        return file;
      }
    } catch {
      /* not on disk — try other sources */
    }
  }
  // 2) IndexedDB
  if (meta?.blob) return meta.blob;
  return null;
}

/* ----------------------------- Backups ----------------------------- */

export interface VideoEntry {
  meta: Omit<StoredVideo, 'blob'>;
  blob: Blob | null; // null when the file is on disk but access was denied
}

/** Everything needed by the ZIP export — merges both storages. */
export async function getAllVideoEntries(): Promise<VideoEntry[]> {
  const all: VideoEntry[] = [];
  const metas = await db.videos.toArray();

  const dir = await getDirHandle();
  const fsOk = dir && dir.getFileHandle && (await fsGranted(dir));

  for (const v of metas) {
    const { blob, ...meta } = v;
    if (fsOk) {
      try {
        const fh = await dir.getFileHandle!(fileNameFor(v.id, v), { create: false });
        const file = await fh.getFile!();
        all.push({ meta: meta as Omit<StoredVideo, 'blob'>, blob: file });
        continue;
      } catch {
        /* not on disk — use IDB copy if any */
      }
    }
    all.push({ meta: meta as Omit<StoredVideo, 'blob'>, blob: blob || null });
  }
  return all;
}

/** Removes a video from every storage (called on permanent deletes). */
export async function deleteVideoEverywhere(id: string): Promise<void> {
  const meta = await db.videos.get(id);
  await db.videos.delete(id);
  const dir = await getDirHandle();
  if (dir && dir.removeEntry && meta) {
    try {
      if (await fsGranted(dir)) {
        await dir.removeEntry(fileNameFor(id, meta));
      }
    } catch {
      /* file already gone */
    }
  }
}

/* --------------------------- Migration ----------------------------- */

/** Moves IndexedDB-stored videos into the disk folder. Settings action. */
export async function migrateIdbVideosToFs(): Promise<{ moved: number; failed: number }> {
  const dir = await getDirHandle();
  if (!dir || !dir.getFileHandle || !(await fsGranted(dir))) {
    return { moved: 0, failed: 0 };
  }
  let moved = 0;
  let failed = 0;
  const metas = await db.videos.toArray();
  for (const v of metas) {
    if (v.storedIn === 'fs' || !v.blob) continue;
    try {
      const fh = await dir.getFileHandle(fileNameFor(v.id, v), { create: true });
      const writable = await fh.createWritable!();
      await writable.write(v.blob);
      await writable.close();
      const { blob: _blob, ...rest } = v;
      await db.videos.put({ ...rest, storedIn: 'fs' } as StoredVideo);
      moved++;
    } catch {
      failed++;
    }
  }
  return { moved, failed };
}

/** Stats for the Settings panel. */
export async function getVideoStorageStats(): Promise<{
  total: number;
  inFs: number;
  inIdb: number;
  idbBytes: number;
}> {
  const metas = await db.videos.toArray();
  const inFs = metas.filter((v) => v.storedIn === 'fs').length;
  const inIdb = metas.filter((v) => v.storedIn !== 'fs' && v.blob).length;
  const idbBytes = metas.reduce((acc, v) => (v.storedIn !== 'fs' && v.blob ? acc + v.blob.size : acc), 0);
  return { total: metas.length, inFs, inIdb, idbBytes };
}
