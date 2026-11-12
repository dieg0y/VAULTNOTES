import { db } from '../db';

/* ------------------------------------------------------------------ */
/* fsStorage — maquinaria FSA (File System Access API) compartida.      */
/*                                                                     */
/* Antes imageStorage.ts y videoStorage.ts duplicaban ~190 líneas       */
/* clonadas: tipings estructurales, lectura del DirectoryHandle en      */
/* `fileHandles`, chequeo/concesión de permisos, sanitización de        */
/* nombres, unificación de nombre único, sniff magic-byte, guardado,    */
/* búsqueda recursiva y resolución a ObjectURL. Esa lógica vive ahora   */
/* UNA sola vez aquí, parametrizada por `createFsMediaFolder(cfg)`.     */
/*                                                                     */
/* Las diferencias reales entre la familia imágenes y la familia        */
/* videos son SOLO valores de configuración:                           */
/*                                                                     */
/*   · key de `fileHandles`            (vault-images-dir / -videos-dir) */
/*   · textos del confirm() del sniff  ("una imagen" / "un video")      */
/*   · nombres/mimes de respaldo       (imagen .png / video .mp4)       */
/*   · bytes de cabecera del sniff     (64 imágenes / 512 videos)       */
/*   · firmas magic-byte               (imágenes / contenedores video)  */
/*   · clases de error exactas         (los `instanceof` de la UI       */
/*                                      deben seguir funcionando)       */
/*                                                                     */
/* Los helpers de bajo nivel (queryDirPermission, ensureDirPermission,  */
/* readStoredDirHandle, writeFileToDir) también los consumen los flujos */
/* locales de videoStorage que NO se genericen (carpeta de la app y     */
/* compatibilidad legacy de videos).                                   */
/* ------------------------------------------------------------------ */

/** Minimal structural typings (FSA isn't in lib.dom for all targets). */
export interface FSWritableLike {
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

/* --------------------------- low-level helpers --------------------------- */
/* El boilerplate `dir.queryPermission ? await dir.queryPermission(…)
 * : 'granted'` aparecía ~12 veces entre imageStorage y videoStorage —
 * ahora vive UNA sola vez aquí. Ninguno atrapa errores: cada caller
 * decide si traga (igual que la lógica original que reemplazan).      */

/** queryPermission sobre la carpeta ('granted' cuando la API no lo expone). */
export async function queryDirPermission(dir: FSDirHandleLike): Promise<PermissionState> {
  return dir.queryPermission ? await dir.queryPermission({ mode: 'readwrite' }) : 'granted';
}

/** Consulta el permiso y, si falta, lo pide (requestPermission REQUIERE un
 *  gesto de usuario — sin él lanza y el caller lo captura). */
export async function ensureDirPermission(dir: FSDirHandleLike): Promise<PermissionState> {
  let perm = await queryDirPermission(dir);
  if (perm !== 'granted' && dir.requestPermission) {
    perm = await dir.requestPermission({ mode: 'readwrite' });
  }
  return perm;
}

/** Lee el DirectoryHandle persistido en `fileHandles` (null si falta o
 *  falla la lectura — mismo contrato que los getters originales). */
export async function readStoredDirHandle(key: string): Promise<FSDirHandleLike | null> {
  try {
    const stored = await db.fileHandles.get(key);
    return (stored?.handle as unknown as FSDirHandleLike) || null;
  } catch {
    return null;
  }
}

/** showDirectoryPicker tipado débil (undefined si el navegador no tiene FSA). */
export function getDirectoryPicker(): ((opts?: unknown) => Promise<FSDirHandleLike>) | undefined {
  return (window as unknown as {
    showDirectoryPicker?: (opts?: unknown) => Promise<FSDirHandleLike>;
  }).showDirectoryPicker;
}

/** Secuencia FSA completa de escritura: getFileHandle({create:true}) →
 *  createWritable → write → close. Deja propagar los errores (igual que
 *  el guardado original de imágenes/videos). */
export async function writeFileToDir(dir: FSDirHandleLike, filename: string, data: Blob): Promise<void> {
  const fh = await dir.getFileHandle!(filename, { create: true });
  const writable = await fh.createWritable!();
  await writable.write(data);
  await writable.close();
}

/* --------------------------- media folder family --------------------------- */

/** Opciones de guardado (antes SaveImageOpts / SaveVideoOpts — idénticas). */
export interface SaveMediaOpts {
  /** Qué hacer cuando el nombre destino ya existe (diálogo de la UI). */
  onConflict?: (existingName: string) => Promise<'overwrite' | 'rename'> | 'overwrite' | 'rename';
  /** Forzar el nombre guardado (flujo de re-enlace de un archivo). */
  forceName?: string;
}

/** Clases de error EXACTAS de cada familia — se inyectan (no se generan)
 *  para que los `instanceof` de la UI (editorMedia, SettingsView) sigan
 *  funcionando con las clases históricas y sus mensajes. */
export interface FsMediaFolderErrors {
  /** No hay carpeta configurada (p.ej. NoImagesDirectoryError). */
  noDirectory: new () => Error;
  /** Carpeta guardada pero el navegador exige permiso de nuevo. */
  permission: new () => Error;
  /** El usuario descartó copiar el archivo tras el aviso del sniff. */
  rejected: new () => Error;
}

/** Todo lo que distingue a la familia imágenes de la familia videos. */
export interface FsMediaFolderConfig {
  /** Key de la tabla `fileHandles` donde vive el DirectoryHandle. */
  dirKey: string;
  /** Etiqueta para el confirm() del sniff: "una imagen" / "un video". */
  kindLabel: string;
  /** Carpeta mencionada en el confirm(): "imágenes" / "videos". */
  folderLabel: string;
  /** Nombre base de respaldo al sanitizar: "imagen" / "video". */
  fallbackBase: string;
  /** Mime de respaldo al derivar la extensión: "image/png" / "video/mp4". */
  fallbackMime: string;
  /** Extensión de respaldo: "png" / "mp4". */
  fallbackExt: string;
  /** Bytes de cabecera que lee el sniff: 64 (imágenes) / 512 (videos). */
  sniffBytes: number;
  /** Firmas magic-byte admisorias (el sniff es ADVISORY, nunca bloquea). */
  magicSigs: ((head: Uint8Array) => boolean)[];
  /** Aceptación temprana por tipo/nombre (SVG en imágenes) — opcional. */
  quickAccept?: (file: File) => boolean;
  /** Clases de error exactas de la familia. */
  errors: FsMediaFolderErrors;
}

/** La familia completa generada — cada adaptador re-exporta las piezas
 *  bajo sus nombres históricos (getImagesDirectory, getVideoObjectURL,
 *  saveImageToDirectory, ensureVideosPermission, …). */
export interface FsMediaFolder {
  getDirectory(): Promise<FSDirHandleLike | null>;
  hasDirectory(): Promise<boolean>;
  isPermissionGranted(): Promise<boolean>;
  ensurePermission(): Promise<boolean>;
  sanitizeFilename(name: string, mimeType?: string): string;
  fileExists(dir: FSDirHandleLike, filename: string): Promise<boolean>;
  uniqueNameIn(dir: FSDirHandleLike, filename: string): Promise<string>;
  saveToDirectory(file: File, opts?: SaveMediaOpts): Promise<string>;
  findFileHandle(dir: FSDirHandleLike, filename: string, depth?: number): Promise<FSFileHandleLike | null>;
  getObjectURL(filename: string): Promise<string | null>;
}

/**
 * Fábrica de la familia FSA de un tipo de media. Mapea 1:1 los bloques
 * que imageStorage.ts y videoStorage.ts tenían clonados; las diferencias
 * entre ambas familias entran por `cfg` (ver FsMediaFolderConfig).
 */
export function createFsMediaFolder(cfg: FsMediaFolderConfig): FsMediaFolder {
  /* ------------------------- directory management ------------------------- */

  /** Stored handle for the media folder, or null when never picked. */
  async function getDirectory(): Promise<FSDirHandleLike | null> {
    return readStoredDirHandle(cfg.dirKey);
  }

  /** True when the user picked a folder at some point. */
  async function hasDirectory(): Promise<boolean> {
    return (await getDirectory()) !== null;
  }

  /** True when the stored folder is usable right now (permission granted). */
  async function isPermissionGranted(): Promise<boolean> {
    const dir = await getDirectory();
    if (!dir) return false;
    try {
      return (await queryDirPermission(dir)) === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Re-request permission on the stored folder. MUST be called from a
   * user gesture (button click) — requestPermission otherwise throws.
   */
  async function ensurePermission(): Promise<boolean> {
    const dir = await getDirectory();
    if (!dir) return false;
    try {
      return (await ensureDirPermission(dir)) === 'granted';
    } catch {
      return false;
    }
  }

  /* ----------------------------- filenames ------------------------------ */

  /**
   * Sanitize a user-provided filename for the media folder: strip path
   * separators / control chars, collapse whitespace, cap the length and
   * keep (or derive from the mime type) a sensible extension.
   */
  function sanitizeFilename(name: string, mimeType?: string): string {
    let base = (name || cfg.fallbackBase)
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    let ext = '';
    const dot = base.lastIndexOf('.');
    if (dot > 0) {
      ext = base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
      base = base.slice(0, dot).trim() || cfg.fallbackBase;
    }
    if (!ext) {
      const sub = (mimeType || cfg.fallbackMime).split('/')[1] || cfg.fallbackExt;
      ext = sub.replace(/[^a-z0-9]/gi, '').toLowerCase() || cfg.fallbackExt;
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

  /** `captura.png` → `captura (1).png`, … (first free slot).
   *
   *  P5: antes sondeaba hasta 999 round-trips SECUENCIALES de
   *  getFileHandle (uno por candidato `nombre (i).ext`); ahora enumera
   *  el directorio UNA sola vez con `for await (dir.values())`, arma un
   *  Set de nombres y resuelve el hueco en memoria. Mismo esquema de
   *  nombres (`${stem} (${i})${ext}`, i en 1..999) y mismo fallback
   *  `${stem}-${Date.now()}${ext}`. */
  async function uniqueNameIn(dir: FSDirHandleLike, filename: string): Promise<string> {
    const dot = filename.lastIndexOf('.');
    const stem = dot > 0 ? filename.slice(0, dot) : filename;
    const ext = dot > 0 ? filename.slice(dot) : '';
    const taken = new Set<string>();
    if (dir.values) {
      try {
        for await (const entry of dir.values()) taken.add(entry.name);
      } catch {
        /* sin listado — se asume libre el primer hueco (como antes) */
      }
    }
    for (let i = 1; i < 1000; i++) {
      const candidate = `${stem} (${i})${ext}`;
      if (!taken.has(candidate)) return candidate;
    }
    return `${stem}-${Date.now()}${ext}`;
  }

  /* ------------------------------ saving ------------------------------- */

  /** True when the first bytes match a known signature. The sniff is
   *  ADVISORY ONLY and must never hard-block a legitimate file: the user
   *  decides via confirm(). A read failure returns true. */
  async function looksLikeMediaFile(file: File): Promise<boolean> {
    if (file.size === 0) return false;
    if (cfg.quickAccept?.(file)) return true;
    try {
      const head = new Uint8Array(await file.slice(0, cfg.sniffBytes).arrayBuffer());
      return cfg.magicSigs.some((sig) => sig(head));
    } catch {
      return true;
    }
  }

  /**
   * COPIES a media file into the user's folder (raw file on disk — never
   * IndexedDB, never the backup). Returns the FINAL filename so the caller
   * can embed the clean by-name reference in the note HTML. Throws the
   * family's noDirectory / permission / rejected errors so the UI can
   * react with the right prompt.
   */
  async function saveToDirectory(file: File, opts: SaveMediaOpts = {}): Promise<string> {
    const dir = await getDirectory();
    if (!dir || !dir.getFileHandle) throw new cfg.errors.noDirectory();

    // Permission: query first; request when we're inside a user gesture
    // (button click / drop). Without a gesture this throws and the UI
    // shows the "Conceder acceso" banner.
    let perm = await queryDirPermission(dir);
    if (perm !== 'granted') {
      if (!dir.requestPermission) throw new cfg.errors.permission();
      perm = await dir.requestPermission({ mode: 'readwrite' });
    }
    if (perm !== 'granted') throw new cfg.errors.permission();

    // Advisory sniff: a renamed executable/corrupt download smells wrong —
    // the user keeps the final say (their disk, their file).
    if (!(await looksLikeMediaFile(file))) {
      const proceed = window.confirm(
        `"${file.name}" no parece ser ${cfg.kindLabel}: su contenido no coincide con ningún formato conocido.\n\n` +
          `Puede ser un archivo renombrado o corrupto. Se copiaría tal cual a tu carpeta de ${cfg.folderLabel}.\n\n` +
          '¿Copiarlo de todos modos?'
      );
      if (!proceed) throw new cfg.errors.rejected();
    }

    let filename = sanitizeFilename(opts.forceName || file.name, file.type || undefined);
    if (await fileExists(dir, filename)) {
      let action: 'overwrite' | 'rename' = 'rename';
      if (opts.onConflict) action = await opts.onConflict(filename);
      if (action === 'rename') filename = await uniqueNameIn(dir, filename);
    }

    await writeFileToDir(dir, filename, file);
    return filename;
  }

  /* ------------------------------ reading ------------------------------- */

  /** Depth-limited recursive search for a file inside the folder (the user
   *  may have organized their media into subfolders). */
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
    } catch (err) {
      // E5: antes un fallo de permiso/transitorio se tragaba en silencio
      // y se reportaba como "archivo no encontrado". Ahora queda registrado
      // en consola (UNA vez por carpeta que falla, con la causa) sin
      // cambiar el flujo: sigue devolviendo null.
      console.warn(
        `[fsStorage] no se pudo listar "${dir.name}" buscando "${filename}" (permiso o error transitorio):`,
        err,
      );
    }
    return null;
  }

  /**
   * Resolves a by-name reference (`data-vault-img` / `data-vault-video`)
   * to a displayable ObjectURL by finding the file inside the stored
   * folder. Returns null when the file doesn't exist; throws the
   * family's noDirectory / permission errors when the folder is unusable
   * (callers surface the "Conceder acceso" banner — never a silent miss).
   * The ObjectURL must be revoked by the caller.
   */
  async function getObjectURL(filename: string): Promise<string | null> {
    const dir = await getDirectory();
    if (!dir || !dir.getFileHandle) throw new cfg.errors.noDirectory();

    const perm = await queryDirPermission(dir);
    if (perm !== 'granted') throw new cfg.errors.permission();

    const safeName = sanitizeFilename(filename);
    const fh = (await findFileHandle(dir, safeName)) || (await findFileHandle(dir, filename));
    if (!fh || !fh.getFile) return null;
    const file = await fh.getFile();
    return URL.createObjectURL(file);
  }

  return {
    getDirectory,
    hasDirectory,
    isPermissionGranted,
    ensurePermission,
    sanitizeFilename,
    fileExists,
    uniqueNameIn,
    saveToDirectory,
    findFileHandle,
    getObjectURL,
  };
}
