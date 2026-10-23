import { db } from '../db';

/* ------------------------------------------------------------------ */
/* Image storage — File System Access API (REGLA DE ORO para imágenes). */
/*                                                                     */
/* Cuando el usuario configura la carpeta de imágenes (por defecto     */
/* Documents/GITHUBVAULT/imagenes — ver mediaVault.ts), las imágenes    */
/* nuevas se COPIAN a esa carpeta del disco (igual que los videos):      */
/*                                                                     */
/*   NUNCA se guardan dentro de IndexedDB (eso era el flujo legacy      */
/*   con data-URL en db.images, que sigue soportado como fallback).     */
/*   NUNCA se incluyen en el export/import (ZIP).                       */
/*                                                                     */
/* El HTML de la nota persiste SOLO una referencia limpia por nombre:   */
/*                                                                     */
/*   <figure class="vault-image-embed" data-vault-img="captura.png">    */
/*     <img alt="...">  ← src = ObjectURL efímero en runtime            */
/*   </figure>                                                          */
/*                                                                     */
/* Compatibilidad: notas creadas antes de esta versión usan             */
/* <img src="data:..."> embebido — se renderizan tal cual, sin cambios. */
/* ------------------------------------------------------------------ */

/** Minimal structural typings (FSA isn't in lib.dom for all targets). */
interface FSWritableLike {
  write: (data: Blob) => Promise<void>;
  close: () => Promise<void>;
}
export interface FSFileHandleLike {
  createWritable?: (opts?: unknown) => Promise<FSWritableLike>;
  getFile?: () => Promise<File>;
}
export interface FSDirHandleLike {
  name: string;
  kind: string;
  queryPermission?: (desc: { mode: 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (desc: { mode: 'readwrite' }) => Promise<PermissionState>;
  getFileHandle?: (name: string, opts?: { create?: boolean }) => Promise<FSFileHandleLike>;
  getDirectoryHandle?: (name: string, opts?: { create?: boolean }) => Promise<FSDirHandleLike>;
  removeEntry?: (name: string) => Promise<void>;
  values?: () => AsyncIterableIterator<FSDirHandleLike & FSFileHandleLike>;
}

/** No images folder configured yet (Settings → Carpeta de Media). */
export class NoImagesDirectoryError extends Error {
  constructor() {
    super('No hay carpeta de imágenes configurada');
    this.name = 'NoImagesDirectoryError';
  }
}

/** Stored folder exists but the browser needs permission again. */
export class ImagesPermissionError extends Error {
  constructor() {
    super('Falta permiso sobre la carpeta de imágenes');
    this.name = 'ImagesPermissionError';
  }
}

/** User declined the copy after the magic-byte advisory warning. */
export class ImageRejectedError extends Error {
  constructor() {
    super('El usuario descartó copiar el archivo que no parece una imagen');
    this.name = 'ImageRejectedError';
  }
}

export const IMAGES_DIR_KEY = 'vault-images-dir';

export function isImageFsSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/* ------------------------- Directory management ------------------------- */

/** Stored handle for the images folder, or null when never picked. */
export async function getImagesDirectory(): Promise<FSDirHandleLike | null> {
  try {
    const stored = await db.fileHandles.get(IMAGES_DIR_KEY);
    return (stored?.handle as unknown as FSDirHandleLike) || null;
  } catch {
    return null;
  }
}

/** True when the user picked an images folder at some point. */
export async function hasImagesDirectory(): Promise<boolean> {
  return (await getImagesDirectory()) !== null;
}

/** Display name of the images folder (e.g. "imagenes"), or null. */
export async function getImagesDirectoryName(): Promise<string | null> {
  const dir = await getImagesDirectory();
  return dir ? dir.name : null;
}

/** True when the stored folder is usable right now (permission granted). */
export async function isImagesPermissionGranted(): Promise<boolean> {
  const dir = await getImagesDirectory();
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
 * Re-request permission on the stored images folder. MUST be called from a
 * user gesture (button click).
 */
export async function ensureImagesPermission(): Promise<boolean> {
  const dir = await getImagesDirectory();
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

/** Stop using the images folder (files on disk are never deleted by us). */
export async function forgetImagesDirectory(): Promise<void> {
  await db.fileHandles.delete(IMAGES_DIR_KEY);
}

/* ----------------------------- Filenames ------------------------------ */

/**
 * Sanitize a user-provided filename for the images folder: strip path
 * separators / control chars, collapse whitespace, cap the length and keep
 * (or derive from the mime type) a sensible extension.
 */
export function sanitizeImageFilename(name: string, mimeType?: string): string {
  let base = (name || 'imagen')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  let ext = '';
  const dot = base.lastIndexOf('.');
  if (dot > 0) {
    ext = base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
    base = base.slice(0, dot).trim() || 'imagen';
  }
  if (!ext) {
    const sub = (mimeType || 'image/png').split('/')[1] || 'png';
    ext = sub.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png';
  }
  if (base.length > 100) base = base.slice(0, 100).trim();
  return `${base}.${ext}`;
}

async function imageFileExists(dir: FSDirHandleLike, filename: string): Promise<boolean> {
  try {
    await dir.getFileHandle!(filename, { create: false });
    return true;
  } catch {
    return false;
  }
}

/** `captura.png` → `captura (1).png`, … (first free slot). */
async function uniqueImageNameIn(dir: FSDirHandleLike, filename: string): Promise<string> {
  const dot = filename.lastIndexOf('.');
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : '';
  for (let i = 1; i < 1000; i++) {
    const candidate = `${stem} (${i})${ext}`;
    if (!(await imageFileExists(dir, candidate))) return candidate;
  }
  return `${stem}-${Date.now()}${ext}`;
}

/* ------------------------------ Saving ------------------------------- */

/** Known image magic bytes (advisory sniff — mirrors videoStorage). */
const IMAGE_MAGIC_SIGS: ((b: Uint8Array) => boolean)[] = [
  // PNG — 89 50 4E 47 0D 0A 1A 0A.
  (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  // JPEG — FF D8 FF.
  (b) => b.length >= 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  // GIF — GIF87a/GIF89a.
  (b) => b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46,
  // BMP — 42 4D.
  (b) => b.length >= 2 && b[0] === 0x42 && b[1] === 0x4d,
  // WebP — RIFF….WEBP.
  (b) =>
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  // ICO — 00 00 01 00.
  (b) => b.length >= 4 && b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00,
  // TIFF — II*\0 / MM\0*.
  (b) =>
    b.length >= 4 &&
    ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a) || (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00)),
];

/** True when the first bytes match a known image signature. SVG (text) and
 *  exotic formats return false — the sniff is ADVISORY ONLY and must never
 *  hard-block a legitimate file: the user decides via confirm(). */
async function looksLikeImageFile(file: File): Promise<boolean> {
  if (file.size === 0) return false;
  const type = (file.type || '').toLowerCase();
  if (type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) return true;
  try {
    const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
    return IMAGE_MAGIC_SIGS.some((sig) => sig(head));
  } catch {
    return true;
  }
}

export interface SaveImageOpts {
  /** What to do when the target filename already exists (UI dialog). */
  onConflict?: (existingName: string) => Promise<'overwrite' | 'rename'> | 'overwrite' | 'rename';
  /** Force the stored filename (re-link flow). */
  forceName?: string;
}

/**
 * COPIES an image file into the user's images folder (raw file on disk).
 * Returns the FINAL filename so the caller can embed
 * `data-vault-img="<filename>"` in the note HTML.
 */
export async function saveImageToDirectory(file: File, opts: SaveImageOpts = {}): Promise<string> {
  const dir = await getImagesDirectory();
  if (!dir || !dir.getFileHandle) throw new NoImagesDirectoryError();

  let perm = dir.queryPermission ? await dir.queryPermission({ mode: 'readwrite' }) : 'granted';
  if (perm !== 'granted') {
    if (!dir.requestPermission) throw new ImagesPermissionError();
    perm = await dir.requestPermission({ mode: 'readwrite' });
  }
  if (perm !== 'granted') throw new ImagesPermissionError();

  // Advisory sniff: a renamed executable/corrupt download smells wrong —
  // the user keeps the final say (their disk, their file).
  if (!(await looksLikeImageFile(file))) {
    const proceed = window.confirm(
      `"${file.name}" no parece ser una imagen: su contenido no coincide con ningún formato conocido.\n\n` +
        'Puede ser un archivo renombrado o corrupto. Se copiaría tal cual a tu carpeta de imágenes.\n\n' +
        '¿Copiarlo de todos modos?'
    );
    if (!proceed) throw new ImageRejectedError();
  }

  let filename = sanitizeImageFilename(opts.forceName || file.name, file.type || undefined);
  if (await imageFileExists(dir, filename)) {
    let action: 'overwrite' | 'rename' = 'rename';
    if (opts.onConflict) action = await opts.onConflict(filename);
    if (action === 'rename') filename = await uniqueImageNameIn(dir, filename);
  }

  const fh = await dir.getFileHandle(filename, { create: true });
  const writable = await fh.createWritable!();
  await writable.write(file);
  await writable.close();
  return filename;
}

/* ------------------------------ Reading ------------------------------- */

/** Depth-limited recursive search for a file inside the images folder. */
async function findImageFileHandle(
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
      const found = await findImageFileHandle(sub, filename, depth + 1);
      if (found) return found;
    }
  } catch {
    /* permission or transient error — treat as not found */
  }
  return null;
}

/**
 * Resolves a `data-vault-img` reference to a displayable ObjectURL by
 * finding the file inside the stored images folder. Returns null when the
 * file doesn't exist. The ObjectURL must be revoked by the caller.
 */
export async function getImageObjectURL(filename: string): Promise<string | null> {
  const dir = await getImagesDirectory();
  if (!dir || !dir.getFileHandle) throw new NoImagesDirectoryError();

  const perm = dir.queryPermission ? await dir.queryPermission({ mode: 'readwrite' }) : 'granted';
  if (perm !== 'granted') throw new ImagesPermissionError();

  const safeName = sanitizeImageFilename(filename);
  const fh = (await findImageFileHandle(dir, safeName)) || (await findImageFileHandle(dir, filename));
  if (!fh || !fh.getFile) return null;
  const file = await fh.getFile();
  return URL.createObjectURL(file);
}
