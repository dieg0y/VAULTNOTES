import { createFsMediaFolder } from './fsStorage';

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
/*                                                                     */
/* REFACTOR (R3): la maquinaria FSA común (tipings, carpeta, permisos, */
/* sanitización, unificación de nombre, sniff, guardado, búsqueda       */
/* recursiva y ObjectURL) vive ahora en utils/fsStorage.ts. Este        */
/* archivo es un adaptador fino: define la configuración de la familia  */
/* imágenes y re-exporta las funciones generadas bajo sus nombres       */
/* históricos. Comportamiento, keys de `fileHandles` y clases de error: */
/* IDÉNTICOS.                                                          */
/* ------------------------------------------------------------------ */

/** Tipings estructurales mínimos de la FSA — ahora en fsStorage.ts.
 *  Se re-exporta `FSDirHandleLike` porque históricamente salía de este
 *  módulo (mediaVault.ts lo importa desde aquí). */
export type { FSDirHandleLike } from './fsStorage';

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

/* ------------------------- Sniff de imágenes ------------------------- */

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

/** SVG es texto plano (sin magic bytes binarios) pero es 100% legítimo —
 *  se acepta ANTES del sniff por tipo mime y por extensión (quickAccept
 *  de la configuración de abajo; antes era la primera línea de
 *  looksLikeImageFile). */
function isSvgFile(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  return type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
}

/* --------------------- Familia generada (fsStorage) --------------------- */
/* Las funciones son cierres puros de la configuración — re-exportarlas
 * como const preserva nombre, firma y comportamiento exactos.          */

const imagesFolder = createFsMediaFolder({
  dirKey: IMAGES_DIR_KEY,
  kindLabel: 'una imagen', // texto del confirm(): "no parece ser una imagen"
  folderLabel: 'imágenes', // texto del confirm(): "a tu carpeta de imágenes"
  fallbackBase: 'imagen', // nombre base de respaldo al sanitizar
  fallbackMime: 'image/png', // mime de respaldo al derivar la extensión
  fallbackExt: 'png',
  sniffBytes: 64, // cabecera leída para el sniff (los videos leen 512)
  magicSigs: IMAGE_MAGIC_SIGS,
  quickAccept: isSvgFile,
  errors: {
    noDirectory: NoImagesDirectoryError,
    permission: ImagesPermissionError,
    rejected: ImageRejectedError,
  },
});

/** Stored handle for the images folder, or null when never picked. */
export const getImagesDirectory = imagesFolder.getDirectory;

/** True when the user picked an images folder at some point. */
export const hasImagesDirectory = imagesFolder.hasDirectory;

/** True when the stored folder is usable right now (permission granted). */
export const isImagesPermissionGranted = imagesFolder.isPermissionGranted;

/**
 * Re-request permission on the stored images folder. MUST be called from a
 * user gesture (button click).
 */
export const ensureImagesPermission = imagesFolder.ensurePermission;

/**
 * COPIES an image file into the user's images folder (raw file on disk).
 * Returns the FINAL filename so the caller can embed
 * `data-vault-img="<filename>"` in the note HTML.
 */
export const saveImageToDirectory = imagesFolder.saveToDirectory;

/**
 * Resolves a `data-vault-img` reference to a displayable ObjectURL by
 * finding the file inside the stored images folder. Returns null when the
 * file doesn't exist. The ObjectURL must be revoked by the caller.
 */
export const getImageObjectURL = imagesFolder.getObjectURL;
