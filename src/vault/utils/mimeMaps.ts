/**
 * mimeMaps — única fuente de verdad MIME ↔ extensión de imagen (REFACTOR R2
 * · P4 + 1d). Antes había TRES copias del mismo mapa que podían divergir:
 *   1. zipBackup.ts (export del ZIP): MIME → extensión, para nombrar los
 *      archivos de /images/ según el mimeType real de cada imagen.
 *   2. zipBackup.ts (loop de importación): extensión → MIME, para detectar
 *      el MIME de una imagen restaurada por su extensión cuando el backup
 *      no trae imagesManifest.json (backups < 3.x antiguos).
 *   3. remoteImages.ts (pegado tipo Obsidian): MIME → extensión, para dar
 *      nombre de archivo razonable a una imagen descargada al pegar.
 *
 * Las tres copias coincidían en todas las claves compartidas (cero
 * conflictos de valor); esta versión fusionada añade las dos claves que solo
 * existían en la copia de remoteImages ('image/vnd.microsoft.icon' e
 * 'image/tiff') y el alias 'jpeg' → 'image/jpeg' que solo existía en la
 * copia del import.
 *
 * MIME_TO_EXT: MIME → extensión SIN punto (dirección export/nombre-archivo).
 * EXT_TO_MIME: extensión SIN punto → MIME (dirección import/detección).
 */

export const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'image/avif': 'avif',
  'image/tiff': 'tiff',
};

export const EXT_TO_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  avif: 'image/avif',
  tiff: 'image/tiff',
};
