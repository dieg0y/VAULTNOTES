/**
 * remoteImages — pegado tipo Obsidian para el editor (V17).
 *
 * Cuando el usuario pega HTML de una web completa (Ctrl+A, Ctrl+C en su
 * navegador), el portapapeles trae el HTML con las imágenes como URLs
 * remotas (`<img src="https://…">`). El sanitizador de la app (AUDIT
 * VN-AUD-001) elimina esos `src` remotos — con razón: un img remoto es un
 * beacon de privacidad que se auto-carga en cada renderización. Resultado
 * actual: el texto se pega, las imágenes DESAPARECEN en silencio.
 *
 * Este módulo implementa la experiencia Obsidian: las imágenes remotas se
 * DESCARGAN (a través del proxy local /api/fetch-image, que resuelve el
 * CORS que el navegador no puede saltar) y se GUARDAN LOCALMENTE —
 * carpeta GITHUBVAULT/imagenes si está configurada (REGLA DE ORO) o
 * data-URL en db.images como fallback. La nota queda 100% offline para
 * siempre y el sanitizador sigue sin permitir JAMÁS un src remoto
 * persistido (la invariante VN-AUD-001 se mantiene intacta).
 *
 * Flujo del pegado (ver editorMedia.handlePasteHtml):
 *   1. transformHtmlWithRemoteImages(): parsea el HTML CRUDO del
 *      portapapeles (DOMParser — documento inerte, cero red) y marca cada
 *      imagen remota con un marcador `data-vault-img-pending="<url>"`.
 *   2. El HTML transformado se sanitiza (sin srcs remotos ya) y se inserta
 *      AL INSTANTE — el usuario ve la estructura pegada con placeholders.
 *   3. Se descargan las URLs (concurrentes, máx 6) y cada marcador se
 *      parchea in place por atributo (robusto frente a ediciones del
 *      usuario durante la descarga).
 *   4. Las que fallan (404, hotlink-block, offline) degradan a un ENLACE
 *      visible — nada se pierde en silencio.
 *
 * Degradación en el load boundary: si el usuario cierra la nota antes de
 * que terminen las descargas, los marcadores que queden en el contenido se
 * convierten en enlaces al abrir la nota (attachImageSources) — JAMÁS se
 * hace red al cargar una nota (offline por diseño).
 *
 * PRIVACIDAD: la descarga solo ocurre tras consentimiento único del
 * usuario (primera vez, recordado en localStorage; cancelar = enlaces esta
 * sesión). Es una acción explícita del usuario, igual que el botón Pull o
 * Enrich Online.
 */
import { escapeHtml } from './escapeHtml';
// REFACTOR R2 (P4 + 1d): el mapa MIME→extensión ahora vive en mimeMaps.ts —
// antes era una copia local que podía divergir de las dos de zipBackup.ts.
import { MIME_TO_EXT } from './mimeMaps';

/* Límites — ver AUDIT_REPORT Addendum III */
export const PASTE_IMG_CAP = 30;
export const PASTE_IMG_BYTES_CAP = 25 * 1024 * 1024;
export const PASTE_IMG_CONCURRENCY = 6;

const CONSENT_KEY = 'vaultnotes-paste-images-consent';
const DECLINE_KEY = 'vaultnotes-paste-images-declined-session';

/* ------------------------------------------------------------------ */
/* Consentimiento (una sola vez)                                        */
/* ------------------------------------------------------------------ */

export function getPasteImagesConsent(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === '1';
  } catch {
    return false;
  }
}

export function setPasteImagesConsent(v: boolean): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, v ? '1' : '0');
  } catch {
    /* almacenamiento bloqueado — se volverá a preguntar */
  }
}

export function wasPasteImagesDeclinedThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(DECLINE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setPasteImagesDeclinedThisSession(): void {
  try {
    window.sessionStorage.setItem(DECLINE_KEY, '1');
  } catch {
    /* no crítico */
  }
}

/* ------------------------------------------------------------------ */
/* Detección de imágenes remotas                                        */
/* ------------------------------------------------------------------ */

/** URL http(s) absoluta o protocolo-relativa (//host/…). */
function isRemoteUrl(u: string): boolean {
  return /^https?:\/\//i.test(u) || /^\/\//.test(u);
}

function absolutize(u: string): string {
  return u.startsWith('//') ? `https:${u}` : u;
}

/**
 * Resuelve la URL "real" de un <img> del portapapeles. Muchas webs usan
 * lazy-loading: src es un placeholder de 1px (data:) y la imagen real
 * vive en data-src / data-original / data-lazy-src / data-actualsrc.
 * Devuelve la URL remota absoluta, o null si no hay imagen remota.
 */
function resolveRemoteImgUrl(img: Element): string | null {
  const lazyAttrs = ['data-src', 'data-original', 'data-lazy-src', 'data-actualsrc'];
  for (const attr of lazyAttrs) {
    const v = img.getAttribute(attr);
    if (v && isRemoteUrl(v)) return absolutize(v.trim());
  }
  const src = img.getAttribute('src');
  if (src && isRemoteUrl(src)) return absolutize(src.trim());
  // srcset: primera candidata (x1 o el primer w descriptor).
  const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset');
  if (srcset) {
    const first = srcset.split(',')[0]?.trim().split(/\s+/)[0] || '';
    if (isRemoteUrl(first)) return absolutize(first);
  }
  return null;
}

export interface PasteTransformOpts {
  /** true → marcadores figure data-vault-img-pending (carpeta GITHUBVAULT). */
  folderMode: boolean;
  figureClass: string;
  figcaptionClass: string;
  captionPrefix: string;
  /** 'download' = marcadores pending · 'links' = degradar a enlaces ya. */
  mode: 'download' | 'links';
}

export interface PasteTransformResult {
  html: string;
  /** URLs remotas marcadas para descargar (únicas, en orden de aparición). */
  urls: string[];
  /** Imágenes más allá del tope PASTE_IMG_CAP (degradadas a enlace). */
  overflow: number;
}

/** Placeholder visible mientras la imagen se descarga — cero red. */
function pendingImgStyle(): string {
  return 'max-width: 100%; height: auto; display: block; min-height: 64px; background: #161616; border: 1px dashed #3a3a3a; border-radius: 8px;';
}

/** Enlace de fallback — la imagen que no se pudo descargar (sin beacon). */
export function linkFallbackHtml(url: string, alt: string): string {
  const safeAlt = escapeHtml(alt.slice(0, 80));
  return (
    `<span class="text-xs italic text-[#999] break-all">🖼️ imagen no descargada` +
    `${safeAlt ? ` — ${safeAlt}` : ''}: ` +
    `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="underline hover:text-white">${escapeHtml(url)}</a>` +
    `</span>`
  );
}

/**
 * Parsea el HTML CRUDO del portapapeles y transforma sus imágenes remotas.
 * DOMParser crea un documento INERTE (sin red, sin scripts) — seguro.
 * El resultado debe pasar por sanitizeHtml() ANTES de insertarse.
 */
export function transformHtmlWithRemoteImages(rawHtml: string, opts: PasteTransformOpts): PasteTransformResult {
  const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
  const urls: string[] = [];
  let overflow = 0;
  const seen = new Set<string>();

  const imgs = Array.from(doc.body.querySelectorAll('img'));
  for (const img of imgs) {
    const url = resolveRemoteImgUrl(img);
    if (!url) continue; // data:/relativa/ausente → el sanitizador decide (comportamiento previo)

    if (opts.mode === 'links') {
      const fallback = doc.createElement('span');
      fallback.innerHTML = linkFallbackHtml(url, img.getAttribute('alt') || '');
      img.replaceWith(...Array.from(fallback.childNodes));
      continue;
    }
    if (!seen.has(url) && urls.length >= PASTE_IMG_CAP) {
      // Tope alcanzado — esta imagen degrada a enlace, no se descarga.
      overflow++;
      const fallback = doc.createElement('span');
      fallback.innerHTML = linkFallbackHtml(url, img.getAttribute('alt') || '');
      img.replaceWith(...Array.from(fallback.childNodes));
      continue;
    }
    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }

    if (opts.folderMode) {
      const fig = doc.createElement('figure');
      fig.setAttribute('class', `${opts.figureClass} vault-image-embed`);
      fig.setAttribute('contenteditable', 'false');
      fig.setAttribute('data-vault-img-pending', url);
      const inner = doc.createElement('img');
      const alt = img.getAttribute('alt') || '';
      if (alt) inner.setAttribute('alt', alt);
      inner.setAttribute('style', pendingImgStyle());
      fig.appendChild(inner);
      img.replaceWith(fig);
    } else {
      img.setAttribute('data-vault-pending-src', url);
      img.removeAttribute('src');
      img.removeAttribute('srcset');
      img.removeAttribute('loading');
      img.setAttribute('style', pendingImgStyle());
    }
  }

  return { html: doc.body.innerHTML, urls, overflow };
}

/* ------------------------------------------------------------------ */
/* Descarga vía proxy local                                             */
/* ------------------------------------------------------------------ */

/**
 * Descarga una imagen remota a través de /api/fetch-image (proxy local
 * same-origin — resuelve CORS). Devuelve un Blob image/* ≤ 25 MB.
 * Lanza ante cualquier fallo (el caller degrada a enlace).
 */
export async function fetchRemoteImage(url: string): Promise<Blob> {
  const res = await fetch(`/api/fetch-image?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    throw new Error(`fetch-image ${res.status}`);
  }
  const blob = await res.blob();
  if (blob.size > PASTE_IMG_BYTES_CAP) {
    throw new Error('imagen > 25 MB');
  }
  const type = blob.type || '';
  if (!type.startsWith('image/')) {
    throw new Error(`content-type no es imagen: ${type}`);
  }
  return blob;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

/* ------------------------------------------------------------------ */
/* Nombres de archivo                                                   */
/* ------------------------------------------------------------------ */

// REFACTOR R2 (P4 + 1d): la copia local MIME_EXT se retiró — ver
// mimeMaps.ts (MIME_TO_EXT, única fuente de verdad).

/** Nombre de archivo razonable para una imagen descargada al pegar. */
export function filenameForPaste(url: string, mime: string): string {
  let base = '';
  try {
    const u = new URL(url);
    const seg = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
    base = seg.replace(/[?#].*$/, '');
  } catch {
    base = '';
  }
  // Solo caracteres de archivo seguros.
  base = base.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  const ext = MIME_TO_EXT[mime.toLowerCase().split(';')[0]] || 'png';
  if (!base || !/\.[a-z0-9]{2,5}$/i.test(base)) {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T-]/g, '');
    base = `imagen-paste-${stamp}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  }
  return base;
}

/* ------------------------------------------------------------------ */
/* Concurrencia                                                         */
/* ------------------------------------------------------------------ */

/** Ejecuta las tareas con tope de concurrencia (mantiene el orden de inicio). */
export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<void> {
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    for (;;) {
      const i = idx++;
      if (i >= tasks.length) return;
      await tasks[i]();
    }
  });
  await Promise.all(workers);
}

/* ------------------------------------------------------------------ */
/* Toast de progreso (imperativo — usable desde funciones puras)        */
/* ------------------------------------------------------------------ */

interface PasteToastHandle {
  update(msg: string, kind: 'progress' | 'ok' | 'warn'): void;
  close(): void;
}

const TOAST_ID = 'vaultnotes-paste-toast';

/**
 * Toast compartido del pegado — un único elemento reutilizado (si hay uno
 * abierto se actualiza en sitio). Estilo consistente con el tema oscuro.
 */
export function showPasteToast(initial: string, kind: 'progress' | 'ok' | 'warn' = 'progress'): PasteToastHandle {
  let el = document.getElementById(TOAST_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = TOAST_ID;
    el.className =
      'fixed bottom-4 right-4 z-[9999] max-w-[min(92vw,26rem)] px-4 py-2.5 rounded-lg border shadow-2xl ' +
      'text-xs font-medium leading-relaxed transition-opacity duration-200 bg-[#161616] border-[#262626] text-[#DDD]';
    document.body.appendChild(el);
  }

  const paint = (msg: string, k: 'progress' | 'ok' | 'warn') => {
    const accent = k === 'ok' ? 'border-emerald-600/50' : k === 'warn' ? 'border-amber-600/60' : 'border-[#262626]';
    el!.className = el!.className.replace(/border-(?:emerald-600\/50|amber-600\/60|\[#262626\])/, accent);
    el!.textContent = msg;
    el!.style.opacity = '1';
  };
  const close = () => {
    el!.style.opacity = '0';
    setTimeout(() => el!.remove(), 250);
  };

  paint(initial, kind);
  return {
    update: (msg, k) => paint(msg, k),
    close: () => close(),
  };
}

/** Cierra el toast tras `ms` (para mensajes finales que se autodespiden). */
export function autoclosePasteToast(handle: PasteToastHandle, ms = 4500): void {
  setTimeout(() => handle.close(), ms);
}
