import { db } from '../db';
import { VIDEOS_DIR_KEY } from './videoStorage';
import { IMAGES_DIR_KEY, type FSDirHandleLike } from './imageStorage';

/* ------------------------------------------------------------------ */
/* mediaVault — ubicación por defecto del MEDIA de VaultNotes.          */
/*                                                                     */
/* El usuario pidió: "el lugar por defecto donde se guarden los videos  */
/* y las imágenes debe ser Documentos, con una carpeta GITHUBVAULT y   */
/* dentro dos carpetas: videos/ e imagenes/".                          */
/*                                                                     */
/* Flujo "usar ubicación por defecto" (1 clic + 1 selección):          */
/*   1. El picker abre directamente en Documentos (startIn:            */
/*      'documents' de la File System Access API).                     */
/*   2. El usuario elige la carpeta base (Documentos).                  */
/*   3. La app CREA automáticamente: <base>/GITHUBVAULT/videos          */
/*                              y     <base>/GITHUBVAULT/imagenes     */
/*      (getDirectoryHandle con create:true — idempotente).            */
/*   4. Se guardan los 2 handles (mismas keys que usan los flujos de   */
/*      video/imagen ya existentes) + un registro de metadatos con el  */
/*      nombre de la carpeta base para mostrarlo en Configuración.     */
/*                                                                     */
/* Editable en Configuración: el usuario puede elegir OTRA carpeta      */
/* base en cualquier momento (se recrea la misma estructura dentro) o  */
/* seguir usando una carpeta de videos legacy. Los archivos ya         */
/* guardados nunca se borran.                                          */
/* ------------------------------------------------------------------ */

export const MEDIA_VAULT_DIR_NAME = 'GITHUBVAULT';
export const MEDIA_VIDEOS_SUBDIR = 'videos';
export const MEDIA_IMAGES_SUBDIR = 'imagenes';

const MEDIA_META_KEY = 'vault-media-meta';

/** Registro de metadatos de la carpeta GITHUBVAULT (base elegida). */
interface MediaVaultMeta {
  configured: boolean;
  /** Nombre de la carpeta base que el usuario eligió (p. ej. "Documentos"). */
  baseName: string | null;
  /** Nombre fijo de la bóveda ("GITHUBVAULT"). */
  vaultName: string | null;
}

/** Picker tipado débil (la FSA no está completa en lib.dom). */
interface DirPicker {
  showDirectoryPicker?: (opts?: unknown) => Promise<FSDirHandleLike>;
}

function pickerFn(): DirPicker['showDirectoryPicker'] | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as DirPicker).showDirectoryPicker;
}

/**
 * Configura la bóveda de media GITHUBVAULT.
 *
 * - `mode: 'default'` → el picker abre en Documentos y el usuario elige la
 *   base ahí (flujo recomendado: Documentos → GITHUBVAULT).
 * - `mode: 'custom'` → el picker abre donde el navegador decida (o en la
 *   base anterior si existe) para elegir otra carpeta base.
 *
 * Dentro de la base elegida se crean GITHUBVAULT/videos y
 * GITHUBVAULT/imagenes. Si el usuario elige directamente una carpeta
 * llamada GITHUBVAULT, se usa tal cual (sin anidar GITHUBVAULT dentro de
 * GITHUBVAULT). Debe llamarse desde un gesto de usuario (clic).
 * Devuelve null si el navegador no soporta FSA o el usuario canceló.
 */
export async function setupMediaVault(mode: 'default' | 'custom' = 'default'): Promise<MediaVaultInfo | null> {
  const picker = pickerFn();
  if (!picker) return null;
  try {
    const prevBaseHandle = await getStoredVaultBaseHandle();
    const startIn =
      mode === 'default'
        ? 'documents'
        : prevBaseHandle || undefined; // custom: reabrir la base anterior si existe
    const base = await picker.call(window, {
      mode: 'readwrite',
      id: 'vaultnotes-media',
      ...(startIn ? { startIn } : {}),
    });
    if (!base.getDirectoryHandle) throw new Error('unsupported');

    // Si el usuario eligió la propia GITHUBVAULT, no anidar.
    const vault =
      base.name === MEDIA_VAULT_DIR_NAME
        ? base
        : await base.getDirectoryHandle(MEDIA_VAULT_DIR_NAME, { create: true });
    if (!vault.getDirectoryHandle) throw new Error('unsupported-directory');
    const videos = await vault.getDirectoryHandle(MEDIA_VIDEOS_SUBDIR, { create: true });
    const images = await vault.getDirectoryHandle(MEDIA_IMAGES_SUBDIR, { create: true });

    // Mismas keys que los flujos existentes → todo el machinery de
    // videoStorage/imageStorage funciona sin cambios.
    await db.fileHandles.put({ id: VIDEOS_DIR_KEY, handle: videos as unknown as FileSystemFileHandle });
    await db.fileHandles.put({ id: IMAGES_DIR_KEY, handle: images as unknown as FileSystemFileHandle });
    await db.fileHandles.put({
      id: MEDIA_META_KEY,
      handle: vault as unknown as FileSystemFileHandle,
      baseName: base.name,
    });
    return { baseName: base.name, vaultName: vault.name };
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === 'AbortError') return null; // cancelado
    console.warn('setupMediaVault failed:', err);
    return null;
  }
}

export interface MediaVaultInfo {
  baseName: string;
  vaultName: string;
}

/** Handle de la bóveda GITHUBVAULT (registro de metadatos), o null. */
async function getStoredVaultBaseHandle(): Promise<FSDirHandleLike | null> {
  try {
    const stored = await db.fileHandles.get(MEDIA_META_KEY);
    return (stored?.handle as unknown as FSDirHandleLike) || null;
  } catch {
    return null;
  }
}

/** Metadatos de la bóveda: si existe, cómo se llama la base y la bóveda. */
async function readMediaMeta(): Promise<MediaVaultMeta> {
  try {
    const stored = await db.fileHandles.get(MEDIA_META_KEY);
    if (stored) {
      const handle = stored.handle as unknown as FSDirHandleLike | null;
      return {
        configured: true,
        baseName: stored.baseName || handle?.name || null,
        vaultName: handle?.name || MEDIA_VAULT_DIR_NAME,
      };
    }
  } catch {
    /* ignore */
  }
  return { configured: false, baseName: null, vaultName: null };
}

/** Estado de la bóveda para la UI de Configuración: existencia + nombres. */
export async function getMediaVaultStatus(): Promise<MediaVaultMeta> {
  return readMediaMeta();
}

/**
 * Ruta de display legible: "Documentos → GITHUBVAULT/videos e …/imagenes".
 * Devuelve null cuando no hay bóveda configurada.
 */
export async function getMediaVaultDisplayPath(): Promise<{ videos: string; images: string } | null> {
  const meta = await readMediaMeta();
  if (!meta.configured || !meta.baseName) return null;
  const root = `${meta.baseName}/${meta.vaultName}`;
  return { videos: `${root}/${MEDIA_VIDEOS_SUBDIR}`, images: `${root}/${MEDIA_IMAGES_SUBDIR}` };
}

/** Olvidar la bóveda (los archivos en disco NUNCA se borran). Olvida
 *  también los handles de videos e imágenes que ella proveía. */
export async function forgetMediaVault(): Promise<void> {
  await db.fileHandles.delete(MEDIA_META_KEY);
  await db.fileHandles.delete(VIDEOS_DIR_KEY);
  await db.fileHandles.delete(IMAGES_DIR_KEY);
}
