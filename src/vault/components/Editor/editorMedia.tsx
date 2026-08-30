/**
 * editorMedia — SHARED media-embedding machinery for the two contentEditable
 * editors (RichEditor for notes, PartRichEditor inside LabsView).
 *
 * This module exists to stop the two editors from drifting apart. Before the
 * extraction, `attachVideoSources`, `handleVideoFile`, `handleRelinkFiles`,
 * `handlePaste`, the image-insert flow and the REGLA DE ORO banner were
 * copy-pasted between the two files — and they DID drift: LabsView lacked the
 * `blob:`-URL stripping on serialization (videos in lab parts died silently
 * after reload) and code-block/checklist templates had diverged. All shared
 * logic now lives HERE, once; the per-editor differences (figure classes,
 * captions, banner wording, note vs lab ownership) are explicit props.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * REGLA DE ORO (videos) — enforced by this module, single source of truth:
 *   • Video files are COPIED to the user's disk folder (File System Access
 *     API) — NEVER into IndexedDB, NEVER into the ZIP backup.
 *   • The note/lab HTML persists ONLY a clean filename reference:
 *     <figure data-vault-video="archivo.mp4"> — no blob:, no data:.
 *   • Playback resolves to an ephemeral ObjectURL, revoked on unmount.
 *   • `stripBlobUrls` MUST run on every serialization path (both editors).
 * ─────────────────────────────────────────────────────────────────────────
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../../db';
import { StoredImage } from '../../types';
import { insertHtmlInEditable } from '../../utils/domInsert';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import { escapeHtml } from '../../utils/escapeHtml';
import {
  saveVideoToDirectory, getVideoObjectURL, resolveLegacyVideoUrl,
  setVideosDirectory, hasVideosDirectory, isFsSupported, ensureVideosPermission,
  NoVideosDirectoryError, VideosPermissionError, VideoRejectedError,
} from '../../utils/videoStorage';

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

/**
 * Strip ephemeral `blob:` URLs from serialized editor HTML. Videos and PDFs
 * are re-attached from their storage (disk folder / IndexedDB) on load, so a
 * persisted `src="blob:…"` is always stale — worse, `attachVideoSources`
 * SKIPS embeds whose `src` attribute is already set, so a persisted blob URL
 * makes the video silently dead after reload. MUST be applied on every
 * serialization path (RichEditor.flushSave and PartRichEditor.handleInput /
 * checkbox click). Matches both `src="blob:…"` and `src='blob:…'`.
 */
export function stripBlobUrls(html: string): string {
  return html
    .replace(/\ssrc="blob:[^"]*"/g, '')
    .replace(/\ssrc='blob:[^']*'/g, '');
}

/** HTML for a video embed. REGLA DE ORO: ONLY the escaped filename reference
 *  is persisted — the src is attached at runtime as an ephemeral ObjectURL. */
export function videoEmbedHtml(safeFilename: string, opts: { shadow?: boolean } = {}): string {
  const shadow = opts.shadow ? ' shadow-xl' : '';
  return `
      <figure class="vault-video-embed my-5 max-w-full rounded-lg overflow-hidden border border-[#262626] bg-[#0D0D0D]${shadow}" contenteditable="false" data-vault-video="${safeFilename}">
        <video controls playsinline preload="metadata" style="width: 100%; display: block; background: #000; border-radius: 8px 8px 0 0;"></video>
        <figcaption class="p-2 text-center text-xs text-[#888] italic bg-[#0D0D0D] border-t border-[#262626] outline-none" contenteditable="true">
          Video: ${safeFilename.replace(/\.[^/.]+$/, '')}
        </figcaption>
      </figure><p><br></p>`;
}

/* ------------------------------------------------------------------ */
/* useVaultVideoEmbeds — REGLA DE ORO hook (shared by both editors)     */
/* ------------------------------------------------------------------ */

interface VaultVideoEmbedsOpts {
  /** The editor's contentEditable ref (attach + insert target). */
  editorRef: React.RefObject<HTMLDivElement | null>;
  /** Called after the DOM mutated (insert) so the editor can autosave. */
  onContentChange: () => void;
  /** RichEditor figures carry `shadow-xl`; lab-part figures don't. */
  figureShadow?: boolean;
}

export function useVaultVideoEmbeds(opts: VaultVideoEmbedsOpts) {
  const { editorRef, figureShadow } = opts;
  // Latest-ref pattern: keep the caller's (per-render) callback without
  // destabilizing our own useCallbacks below.
  const onContentChangeRef = useRef(opts.onContentChange);
  useEffect(() => {
    onContentChangeRef.current = opts.onContentChange;
  });

  const videoInputRef = useRef<HTMLInputElement>(null);
  const relinkInputRef = useRef<HTMLInputElement>(null);
  const videoUrlsRef = useRef<string[]>([]);
  const [fsNeedsPermission, setFsNeedsPermission] = useState(false);
  // REGLA DE ORO (videos): reference files that exist in the content but
  // were NOT found in the videos folder — drives the re-link banner. Ref
  // (not state) so the file-picker callback reads the latest list.
  const missingVideosRef = useRef<string[]>([]);
  const [missingVideoCount, setMissingVideoCount] = useState(0);

  /** Attach playable ObjectURLs to every embedded video in the editor.
   *  REGLA DE ORO: videos resolve from the user's disk folder only.
   *  New embeds carry data-vault-video="<filename>"; legacy ones carry
   *  data-vid="vid-…" (resolved by scanning the folder for `{vid}.*`).
   *  Missing files / lost permission surface as a banner + placeholder. */
  const attachVideoSources = useCallback(async () => {
    if (!editorRef.current) return;
    const embeds = editorRef.current.querySelectorAll<HTMLElement>('.vault-video-embed');
    let permIssue = false;
    const missing: string[] = [];
    for (const fig of Array.from(embeds)) {
      const videoEl = fig.querySelector('video');
      if (!videoEl || videoEl.getAttribute('src')) continue;
      // New reference format: data-vault-video="archivo.mp4".
      // Legacy format: data-vid="vid-…" (files named {id}.{ext} on disk).
      const filename = fig.getAttribute('data-vault-video');
      const legacyVid = fig.getAttribute('data-vid');
      if (!filename && !legacyVid) continue;
      try {
        const url = filename
          ? await getVideoObjectURL(filename)
          : await resolveLegacyVideoUrl(legacyVid as string);
        if (url) {
          fig.classList.remove('vault-video-missing');
          videoUrlsRef.current.push(url);
          videoEl.src = url;
        } else {
          fig.classList.add('vault-video-missing');
          if (filename) missing.push(filename);
        }
      } catch (err) {
        if (err instanceof VideosPermissionError || err instanceof NoVideosDirectoryError) {
          permIssue = true;
        }
        fig.classList.add('vault-video-missing');
        if (filename) missing.push(filename);
      }
    }
    missingVideosRef.current = missing;
    setMissingVideoCount(missing.length);
    setFsNeedsPermission(permIssue);
  }, [editorRef]);

  // Revoke object URLs when the editor unmounts (note switch / view change).
  useEffect(() => {
    return () => {
      videoUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      videoUrlsRef.current = [];
    };
  }, []);

  /** Embed a local video file into the content.
   *  REGLA DE ORO: the file is COPIED into the user's videos folder (raw
   *  file on disk — never IndexedDB, never the backup) and the content only
   *  stores a clean filename reference: data-vault-video="<filename>". */
  const handleVideoFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) return;

    if (!isFsSupported()) {
      alert('Tu navegador no soporta carpetas locales (File System Access API).\nAbre VaultNotes en Microsoft Edge o Chrome para insertar videos.');
      return;
    }

    // First video + no folder chosen yet → ask now (the click/drop IS the
    // user gesture the directory picker requires).
    if (!(await hasVideosDirectory())) {
      const ok = await setVideosDirectory();
      if (!ok) {
        alert('Necesitas seleccionar una carpeta de videos para insertar videos.\nPuedes configurarla en Configuración → Carpeta de Videos.');
        return;
      }
    }

    let filename: string;
    try {
      filename = await saveVideoToDirectory(file, {
        // Spec: "se pregunta si se sobrescribe o se genera un nombre único".
        onConflict: (existing) =>
          window.confirm(
            `Ya existe "${existing}" en la carpeta de videos.\n\nAceptar = Sobrescribir el archivo existente\nCancelar = Guardar con un nombre único`
          )
            ? 'overwrite'
            : 'rename',
      });
    } catch (err) {
      // VN-AUD-I3: the user already declined after the magic-byte warning —
      // abort silently, no redundant error alert.
      if (err instanceof VideoRejectedError) return;
      if (err instanceof VideosPermissionError) {
        alert('El navegador necesita permiso sobre la carpeta de videos.\nPulsa "Conceder acceso" en el banner de arriba y vuelve a intentarlo.');
        return;
      }
      console.error('No se pudo copiar el video a la carpeta:', err);
      alert('No se pudo copiar el video a la carpeta de videos.');
      return;
    }

    // SECURITY (Task 2-b): the filename is user-controlled text interpolated
    // into an attribute — escape it (also covers the figcaption text node).
    const safeName = escapeHtml(filename);
    const videoHtml = videoEmbedHtml(safeName, { shadow: figureShadow });
    if (editorRef.current) {
      insertHtmlInEditable(editorRef.current, videoHtml);
      void attachVideoSources();
      onContentChangeRef.current();
    }
  }, [editorRef, attachVideoSources, figureShadow]);

  /** REGLA DE ORO — "Buscar archivo": re-link missing videos by picking the
   *  file(s) from anywhere on disk; each one is COPIED into the videos
   *  folder under the exact filename the content reference expects. */
  const handleRelinkFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    const missing = [...missingVideosRef.current];
    for (let i = 0; i < files.length; i++) {
      const forceName = i < missing.length ? missing[i] : undefined;
      try {
        await saveVideoToDirectory(files[i], { forceName });
      } catch (err) {
        // VN-AUD-I3: user declined after the magic-byte warning — stop quietly.
        if (err instanceof VideoRejectedError) return;
        if (err instanceof VideosPermissionError) {
          const ok = await ensureVideosPermission();
          if (!ok) {
            alert('No se pudo obtener permiso sobre la carpeta de videos.');
            return;
          }
          try {
            await saveVideoToDirectory(files[i], { forceName });
          } catch {
            return;
          }
        } else {
          console.error('Re-link failed:', err);
          return;
        }
      }
    }
    void attachVideoSources();
  }, [attachVideoSources]);

  /** Banner action: re-grant permission on the stored folder. */
  const grantAccess = useCallback(async () => {
    const ok = await ensureVideosPermission();
    if (ok) {
      setFsNeedsPermission(false);
      void attachVideoSources();
    }
  }, [attachVideoSources]);

  /** Banner action: pick a (new) videos folder. */
  const relinkFolder = useCallback(async () => {
    const ok = await setVideosDirectory();
    if (ok) void attachVideoSources();
  }, [attachVideoSources]);

  return {
    attachVideoSources,
    handleVideoFile,
    handleRelinkFiles,
    grantAccess,
    relinkFolder,
    missingVideoCount,
    fsNeedsPermission,
    videoInputRef,
    relinkInputRef,
  };
}

/* ------------------------------------------------------------------ */
/* useImageInsert — shared image flow (data-URL images into db.images)  */
/* ------------------------------------------------------------------ */

interface ImageInsertOpts {
  editorRef: React.RefObject<HTMLDivElement | null>;
  onContentChange: () => void;
  /** Owner of the stored image: { noteId } or { labId }. */
  owner: { noteId: string } | { labId: string };
  /** StoredImage.caption for this editor ('Diagrama / Captura' vs file.name). */
  captionFor: (fileName: string) => string;
  /** Per-editor figure / figcaption classes (drift made explicit). */
  figureClass: string;
  figcaptionClass: string;
  /** Figcaption prefix: 'Fig' (notes) | 'Captura' (lab parts). */
  captionPrefix: string;
}

export function useImageInsert(opts: ImageInsertOpts) {
  const { editorRef, owner, captionFor, captionPrefix, figureClass, figcaptionClass } = opts;
  const onContentChangeRef = useRef(opts.onContentChange);
  useEffect(() => {
    onContentChangeRef.current = opts.onContentChange;
  });

  const handleImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    // SECURITY (Task 2-b): cap upload size to 25 MB. data: URLs are ~33%
    // larger than the raw bytes, and IDB blobs count against the browser
    // quota. A multi-hundred-MB image would crash the tab on most machines.
    if (file.size > 25 * 1024 * 1024) {
      alert('La imagen es demasiado grande (máximo 25 MB). Redúcela antes de insertarla.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      // SECURITY (Task 2-b): HTML-escape the user-controlled file.name before
      // embedding it inside an <img alt="…"> attribute and inside the
      // figcaption text node. file.name comes from the OS and could contain
      // characters that break the attribute boundary (e.g. a file named
      // " onerror=alert(1) x=". Without escaping this would self-XSS the
      // editor (and any later viewer of the note's contentHtml).
      const safeName = escapeHtml(file.name);
      // AUDIT (VN-A-001): Date.now() alone collides when 2+ images are
      // added in the same millisecond (Dexie primary-key ConstraintError
      // silently drops the second image). Add entropy like vid-/pdf- ids.
      const imgId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const record: StoredImage = {
        id: imgId,
        name: file.name,
        mimeType: file.type,
        dataUrl,
        caption: captionFor(file.name),
        createdAt: new Date().toISOString(),
        ...owner,
      };
      await db.images.add(record);
      const imageHtml = `
        <figure class="${figureClass}">
          <img src="${dataUrl}" alt="${safeName}" style="max-width: 100%; height: auto; display: block;" />
          <figcaption class="${figcaptionClass}" contenteditable="true">
            ${captionPrefix}: ${safeName.replace(/\.[^/.]+$/, '')}
          </figcaption>
        </figure><p><br></p>`;
      if (editorRef.current) {
        insertHtmlInEditable(editorRef.current, imageHtml);
        onContentChangeRef.current();
      }
    };
    reader.readAsDataURL(file);
  }, [editorRef, owner, captionFor, captionPrefix, figureClass, figcaptionClass]);

  return { handleImageFile };
}

/* ------------------------------------------------------------------ */
/* Paste / drop factories                                              */
/* ------------------------------------------------------------------ */

/**
 * SECURITY (Audit VN-B-014, HIGH — DOM-XSS via paste): the old handler
 * only called preventDefault() when the clipboard carried an image file,
 * so HTML/text pastes fell through to the browser default — which inserts
 * the raw clipboard fragment (with onerror/onload handlers) directly into
 * the live contentEditable DOM. A `<img src=x onerror=...>` copied from
 * any web page would EXECUTE at paste time, before autosave or the
 * load-time sanitizeHtml ever ran. The default is ALWAYS prevented and
 * the payload is re-inserted manually:
 *   1. image file → the editor's image flow (unchanged);
 *   2. text/html  → sanitizeHtml() (same DOMPurify config as the load
 *                   boundary) + insertHtmlInEditable;
 *   3. plain text → execCommand('insertText') — lands as literal text,
 *                   including inside code blocks.
 */
export function runSanitizedPaste(
  e: React.ClipboardEvent,
  opts: {
    editorRef: React.RefObject<HTMLDivElement | null>;
    onImageFile: (file: File) => void;
    onContentChange: () => void;
  },
): void {
  e.preventDefault();
  const items = e.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile();
      if (file) opts.onImageFile(file);
      return;
    }
  }
  const html = e.clipboardData.getData('text/html');
  if (html && html.trim()) {
    const sanitized = sanitizeHtml(html);
    if (sanitized) {
      insertHtmlInEditable(opts.editorRef.current, sanitized);
      opts.onContentChange();
    }
    return;
  }
  const text = e.clipboardData.getData('text/plain');
  if (text) {
    opts.editorRef.current?.focus();
    document.execCommand('insertText', false, text);
    opts.onContentChange();
  }
}

/** Shared drop routing: images → image flow, videos → video flow (REGLA DE
 *  ORO), PDFs → the note editor's PDF flow (lab parts have none). */
export function runFileDrop(
  e: React.DragEvent,
  opts: {
    onImageFile: (file: File) => void;
    onVideoFile: (file: File) => void;
    onPdfFile?: (file: File) => void;
  },
): void {
  e.preventDefault();
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const files: File[] = Array.from(e.dataTransfer.files);
    files.forEach((f) => {
      if (f.type.startsWith('image/')) opts.onImageFile(f);
      else if (f.type.startsWith('video/')) opts.onVideoFile(f);
      else if (opts.onPdfFile && (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))) opts.onPdfFile(f);
    });
  }
}

/* ------------------------------------------------------------------ */
/* VideoAccessBanner — REGLA DE ORO banner (shared UI)                  */
/* ------------------------------------------------------------------ */

interface VideoAccessBannerProps {
  /** 'bar' = full-width strip under the header (RichEditor);
   *  'card' = rounded card inside the part (LabsView). */
  variant: 'bar' | 'card';
  /** Wording: videos "de esta nota" vs "de esta parte". */
  noun: 'nota' | 'parte';
  /** RichEditor adds the "(quizá cambiaste de PC…)" hint. */
  missingHint?: boolean;
  fsNeedsPermission: boolean;
  missingVideoCount: number;
  onGrantAccess: () => void;
  onRelinkFolder: () => void;
  onFindFiles: () => void;
}

/** REGLA DE ORO (videos) — banner: permission lost AND/OR missing files.
 *  "Conceder acceso" re-grants the stored folder; "Re-linkear" picks a
 *  NEW videos folder; "Buscar archivo" copies the missing file(s) back
 *  into the folder under the name the reference expects. */
export function VideoAccessBanner({
  variant, noun, missingHint = false,
  fsNeedsPermission, missingVideoCount, onGrantAccess, onRelinkFolder, onFindFiles,
}: VideoAccessBannerProps) {
  if (!fsNeedsPermission && missingVideoCount === 0) return null;
  const containerCls = variant === 'bar'
    ? 'px-6 py-2 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between gap-3 shrink-0 flex-wrap'
    : 'px-3 py-2 bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 rounded flex-wrap';
  return (
    <div className={containerCls}>
      <p className="text-[11px] text-amber-300">
        {fsNeedsPermission && missingVideoCount === 0 && `🎬 La carpeta de videos necesita acceso para reproducir los videos de esta ${noun}.`}
        {fsNeedsPermission && missingVideoCount > 0 && `🎬 La carpeta de videos necesita acceso y ${missingVideoCount} video(s) no se encontraron en ella.`}
        {!fsNeedsPermission && missingVideoCount > 0 && `🎬 ${missingVideoCount} video(s) de esta ${noun} no están en la carpeta de videos${missingHint ? ' (quizá cambiaste de PC o moviste los archivos)' : ''}.`}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        {fsNeedsPermission && (
          <button
            onClick={onGrantAccess}
            className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold cursor-pointer transition-colors"
          >
            Conceder acceso
          </button>
        )}
        <button
          onClick={onRelinkFolder}
          className="px-3 py-1 rounded bg-[#161616] hover:bg-[#202020] border border-[#262626] text-[#DDD] text-[11px] font-semibold cursor-pointer transition-colors"
        >
          Re-linkear carpeta de videos
        </button>
        {missingVideoCount > 0 && (
          <button
            onClick={onFindFiles}
            className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold cursor-pointer transition-colors"
          >
            Buscar archivo
          </button>
        )}
      </div>
    </div>
  );
}

/** Hidden file inputs for the video flows (identical in both editors). */
export function VideoHiddenInputs({
  videoInputRef, relinkInputRef, onVideoFile, onRelinkFiles,
}: {
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  relinkInputRef: React.RefObject<HTMLInputElement | null>;
  onVideoFile: (file: File) => void;
  onRelinkFiles: (files: File[]) => void;
}) {
  return (
    <>
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onVideoFile(f); e.target.value = ''; }} />
      {/* REGLA DE ORO — hidden picker for the "Buscar archivo" re-link flow */}
      <input ref={relinkInputRef} type="file" accept="video/*" multiple className="hidden"
        onChange={(e) => { const fs = Array.from(e.target.files || []); if (fs.length > 0) void onRelinkFiles(fs); e.target.value = ''; }} />
    </>
  );
}
