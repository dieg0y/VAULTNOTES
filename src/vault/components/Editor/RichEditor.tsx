import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDebouncedAutoSave } from '../../hooks/useDebouncedAutoSave';
import {
  Star, Trash2, ExternalLink, Plus, Heading1, Heading2, Heading3, Bold, Italic, Underline,
  List, ListOrdered, CheckSquare, Quote, Code, Image as ImageIcon, Check, BookOpen,
  ChevronRight, FileText, Video, ListChecks
} from 'lucide-react';
import { Note, GlossaryTerm, CategoryItem } from '../../types';
import { insertHtmlInEditable } from '../../utils/domInsert';
import { savePdfBlob, getPdfBlobById } from '../../utils/pdfStorage';
import {
  useVaultVideoEmbeds, useImageInsert, runSanitizedPaste, runFileDrop,
  VideoAccessBanner, VideoHiddenInputs, stripBlobUrls,
} from './editorMedia';
import { AutoToc } from './AutoToc';
import { addToReviewQueue } from '../tools/_shared';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import { escapeHtml } from '../../utils/escapeHtml';
import { downloadBlob } from '../../utils/downloadBlob';

interface RichEditorProps {
  note: Note;
  allNotes: Note[];
  categories: CategoryItem[];
  glossaryTerms: GlossaryTerm[];
  onUpdateNote: (updated: Partial<Note>) => void;
  onDeleteNote: (noteId: string) => void;
  onOpenGlossaryTerm?: (termId: string) => void;
  onSelectNote: (noteId: string) => void;
  onCreateSubnote: () => void;
}

export const RichEditor: React.FC<RichEditorProps> = ({
  note,
  allNotes,
  categories,
  glossaryTerms,
  onUpdateNote,
  onDeleteNote,
  onOpenGlossaryTerm,
  onSelectNote,
  onCreateSubnote,
}) => {
  const [title, setTitle] = useState(note.title);
  const [category, setCategory] = useState(note.category);
  const [sourceUrl, setSourceUrl] = useState(note.sourceUrl || '');
  const [isFavorite, setIsFavorite] = useState(note.isFavorite);
  const [hoveredTerm, setHoveredTerm] = useState<{ term: GlossaryTerm; x: number; y: number } | null>(null);
  // BLOQUE 5 — Review Queue "Revisar después" inline toast
  const [reviewToast, setReviewToast] = useState<string | null>(null);

  const handleAddToReview = async () => {
    const ok = await addToReviewQueue('note', note.id);
    const msg = ok
      ? 'Añadido a la cola de revisión'
      : 'Ya estaba en la cola de revisión';
    setReviewToast(msg);
    window.setTimeout(() => setReviewToast(null), 2000);
  };

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const pdfUrlsRef = useRef<string[]>([]);
  // Mirror of the contentEditable's innerHTML on every keystroke. Survives
  // React unmount (unlike editorRef.current which React nulls during
  // unmount) so the pending-autosave flush on note-switch reads the TRUE
  // latest content instead of the stale note.contentHtml prop. See
  // flushSave + unmount-cleanup below. (Audit Task 2-a MEDIUM follow-up.)
  const latestHtmlRef = useRef('');

  /** Attach persistent object-URLs to every embedded PDF in the editor.
   *  The browser's native PDF viewer renders the blob URL — no external
   *  library required. Works on Edge/Chrome out of the box. */
  const attachPdfSources = useCallback(async () => {
    if (!editorRef.current) return;
    const embeds = editorRef.current.querySelectorAll<HTMLElement>('.vault-pdf-embed[data-pdf-id]');
    for (const fig of Array.from(embeds)) {
      const pid = fig.getAttribute('data-pdf-id');
      const embedEl = fig.querySelector('embed, iframe');
      if (!pid || !embedEl || embedEl.getAttribute('src')) continue;
      try {
        const blob = await getPdfBlobById(pid);
        if (blob) {
          fig.classList.remove('vault-pdf-missing');
          const url = URL.createObjectURL(blob);
          pdfUrlsRef.current.push(url);
          embedEl.setAttribute('src', url);
        } else {
          fig.classList.add('vault-pdf-missing');
        }
      } catch {
        fig.classList.add('vault-pdf-missing');
      }
    }
  }, []);

  // Revoke PDF object URLs when the editor unmounts (video ObjectURLs are
  // revoked by the shared useVaultVideoEmbeds hook).
  useEffect(() => {
    return () => {
      pdfUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      pdfUrlsRef.current = [];
    };
  }, []);

  // NOTE: this component is keyed by `note.id` upstream (NotesView), so local
  // state initializes from props on every note switch — no sync effect needed.
  // Only the contentEditable DOM needs an explicit load per note.
  // `contentRef` (latest-ref pattern, same as latestHtmlRef below) holds the
  // freshest `note.contentHtml`; see the full note above the load effect.
  const contentRef = useRef(note.contentHtml);
  useEffect(() => {
    contentRef.current = note.contentHtml;
  });

  // AUTOSAVE DATA-INTEGRITY FIX (Task 2-c, spec #33 — race conditions +
  // reload-during-autosave): the debounce machinery (status, timer, pagehide
  // flush, unmount flush) lives in useDebouncedAutoSave; the flush below
  // reads the LATEST React-state-backed fields from a ref that's updated on
  // every render, so the timer always sees the current value (the old
  // closure-capture bug saved one-keystroke-old state, e.g. "hell" instead
  // of "hello"). The contentEditable HTML is read live from
  // `editorRef.current.innerHTML` at fire time (DOM is already up-to-date).
  const latestFieldsRef = useRef({ title, category, sourceUrl, isFavorite });
  useEffect(() => {
    latestFieldsRef.current = { title, category, sourceUrl, isFavorite };
  });
  const flushSave = useCallback(async () => {
    // AUDIT FIX (checklist state persistence): clicking a checkbox toggles
    // the DOM *property*, but innerHTML only serializes the *attribute* —
    // without this sync the tick state was lost on every reload even when
    // the checkbox itself survived sanitization.
    if (editorRef.current) {
      editorRef.current.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((cb) => {
        if (cb.checked) cb.setAttribute('checked', '');
        else cb.removeAttribute('checked');
      });
    }
    // Read live from the contentEditable when mounted; fall back to
    // latestHtmlRef (mirrored on every keystroke) when editorRef is null
    // (post-unmount timer fire or note-switch cleanup). This prevents
    // data loss: without latestHtmlRef, a flush after unmount would use the
    // STALE note.contentHtml prop and silently drop the user's typed
    // content. (Audit Task 2-a MEDIUM follow-up.)
    const rawHtml = editorRef.current?.innerHTML ?? latestHtmlRef.current ?? note.contentHtml;
    // Strip ephemeral blob: URLs — videos & PDFs are re-attached from the
    // database on load (shared helper, see editorMedia.stripBlobUrls).
    const html = stripBlobUrls(rawHtml);
    const { title: t, category: c, sourceUrl: s, isFavorite: f } = latestFieldsRef.current;
    await onUpdateNote({
      title: t,
      contentHtml: html,
      category: c,
      sourceUrl: s.trim() || undefined,
      isFavorite: f,
      updatedAt: new Date().toISOString(),
    });
  }, [onUpdateNote, note.contentHtml]);
  const { saveStatus, triggerAutoSave } = useDebouncedAutoSave(flushSave);

  const handleContentInput = () => {
    if (editorRef.current) {
      // AUTOSAVE DATA-INTEGRITY (Task 2-c + audit follow-up): mirror the
      // contentEditable's innerHTML on every keystroke. Critical for the
      // React-unmount case — when the user types and switches notes within
      // the 1500ms debounce window, editorRef.current becomes null BEFORE
      // the pending timer fires. Without this ref, flushSave would fall
      // back to the STALE note.contentHtml prop — silently dropping the
      // typed content. latestHtmlRef survives the unmount so the
      // unmount-cleanup flush reads the TRUE latest content.
      latestHtmlRef.current = editorRef.current.innerHTML;
      triggerAutoSave();
    }
  };

  // ── SHARED MEDIA EMBEDS (editorMedia.tsx) ─────────────────────────────
  // REGLA DE ORO (videos): the whole video flow — disk-folder copy, clean
  // filename reference, ephemeral ObjectURLs, re-link banner — lives ONCE
  // in useVaultVideoEmbeds, shared with LabsView's PartRichEditor.
  const {
    attachVideoSources, handleVideoFile, handleRelinkFiles,
    grantAccess, relinkFolder,
    missingVideoCount, fsNeedsPermission,
    videoInputRef, relinkInputRef,
  } = useVaultVideoEmbeds({ editorRef, onContentChange: handleContentInput, figureShadow: true });

  // Image insert: data-URL image stored in db.images owned by this note.
  const { handleImageFile } = useImageInsert({
    editorRef,
    onContentChange: handleContentInput,
    owner: { noteId: note.id },
    captionFor: () => 'Diagrama / Captura',
    figureClass: 'my-6 max-w-full inline-block rounded-lg overflow-hidden border border-[#262626] bg-[#161616] shadow-xl',
    figcaptionClass: 'p-2 text-center text-xs text-[#888] italic bg-[#0D0D0D] border-t border-[#262626] outline-none',
    captionPrefix: 'Fig',
  });

  // SECURITY (VN-B-014): sanitized paste — see editorMedia.runSanitizedPaste.
  const handlePaste = (e: React.ClipboardEvent) =>
    runSanitizedPaste(e, { editorRef, onImageFile: handleImageFile, onContentChange: handleContentInput });

  // NOTE: this component is keyed by `note.id` upstream (NotesView), so local
  // state initializes from props on every note switch — no sync effect needed.
  // Only the contentEditable DOM needs an explicit load per note.
  // `contentRef` (latest-ref pattern, same as latestHtmlRef above) holds the
  // freshest `note.contentHtml` WITHOUT being an effect dependency: re-loading
  // the DOM on every contentHtml change (e.g. the useLiveQuery re-emission
  // after autosave persists) would clobber the caret / in-progress edits.
  // The write lives in a no-dep effect (NOT during render — refs must not be
  // written in render) declared BEFORE the load effect below: effects run in
  // declaration order, so on a note switch the ref is updated first and the
  // load effect reads the NEW content.
  useEffect(() => {
    if (editorRef.current) {
      // SECURITY (Audit Task 2-b, spec #26/#42/#44): contentHtml is
      // untrusted — it may originate from an imported backup ZIP or an
      // older Dexie record. Sanitize before innerHTML to prevent stored
      // XSS (<script>, <img onerror>, javascript: URLs). Pure & offline.
      editorRef.current.innerHTML = sanitizeHtml(contentRef.current);
      // Deferred: attachVideoSources/attachPdfSources resolve asynchronously
      // from IndexedDB and update state afterwards (never during the effect
      // body).
      void Promise.resolve().then(() => Promise.all([attachVideoSources(), attachPdfSources()]));
      // Keep latestHtmlRef in sync on load so a rapid switch before any
      // keystroke still has the loaded content (not just the prop).
      latestHtmlRef.current = editorRef.current.innerHTML;
    }
  }, [note.id, attachVideoSources, attachPdfSources]);

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) { editorRef.current.focus(); handleContentInput(); }
  };

  /* Event delegation: clicking the "Copiar" button on a code-block header copies the code text.
     Inline onclick handlers don't survive contentEditable, so we delegate from the root. */
  const handleEditorClick = useCallback(async (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // 1. Code-block "Copiar"
    const copyBtn = target.closest('.vault-code-copy') as HTMLElement | null;
    if (copyBtn) {
      e.preventDefault();
      e.stopPropagation();
      const block = copyBtn.closest('.vault-code-block') as HTMLElement | null;
      const code = block?.querySelector('pre code, pre') as HTMLElement | null;
      if (!code) return;
      const text = code.textContent || '';
      navigator.clipboard?.writeText(text).then(() => {
        const original = copyBtn.textContent;
        copyBtn.textContent = '✓ Copiado';
        copyBtn.classList.add('text-green-400');
        setTimeout(() => {
          copyBtn.textContent = original;
          copyBtn.classList.remove('text-green-400');
        }, 1500);
      });
      return;
    }
    // 3. Checklist checkboxes — a click toggles the DOM *property*, but
    //    innerHTML serialization only keeps the *attribute*. Sync it and
    //    schedule the autosave (checkbox clicks don't fire `input` on the
    //    contentEditable host), or the tick state would never persist.
    //    (AUDIT FIX — checklist data loss, follow-up.)
    const checkbox = target.closest('input[type=checkbox]') as HTMLInputElement | null;
    if (checkbox) {
      if (checkbox.checked) checkbox.setAttribute('checked', '');
      else checkbox.removeAttribute('checked');
      if (editorRef.current) latestHtmlRef.current = editorRef.current.innerHTML;
      triggerAutoSave();
      return;
    }
    // 2. PDF "Descargar" — pulls the blob from IDB and triggers a download
    const dlBtn = target.closest('.vault-pdf-download') as HTMLElement | null;
    if (dlBtn) {
      e.preventDefault();
      e.stopPropagation();
      const pid = dlBtn.getAttribute('data-pdf-id');
      if (!pid) return;
      try {
        const blob = await getPdfBlobById(pid);
        if (!blob) return;
        downloadBlob(blob, dlBtn.getAttribute('download-name') || `${pid}.pdf`);
      } catch (err) {
        console.warn('PDF download failed:', err);
      }
    }
  }, [triggerAutoSave]);

  const insertChecklist = () => {
    insertHtmlInEditable(editorRef.current, `
      <div class="my-2 p-2 bg-[#161616] rounded border border-[#262626] flex items-start gap-2">
        <input type="checkbox" class="mt-1 w-4 h-4 rounded border-[#404040] text-blue-500 bg-[#0D0D0D] cursor-pointer" />
        <span class="flex-1 text-[#E5E5E5]" contenteditable="true">Nueva tarea o verificación...</span>
      </div><p><br></p>
    `);
    handleContentInput();
  };

  const insertCodeBlock = (language: string = 'bash') => {
    insertHtmlInEditable(editorRef.current, `
      <div class="my-4 rounded-lg overflow-hidden border border-[#262626] bg-[#141414] font-mono text-xs shadow-lg vault-code-block">
        <div class="bg-[#0D0D0D] px-3.5 py-2 border-b border-[#262626] text-[11px] text-blue-400 font-semibold flex items-center justify-between select-none">
          <span class="uppercase tracking-wider font-mono">${language}</span>
          <span class="vault-code-copy text-[#666] hover:text-blue-300 text-[10px] cursor-pointer flex items-center gap-0.5" contenteditable="false" role="button" tabindex="-1">📋 Copiar</span>
        </div>
        <pre class="p-4 text-blue-300 overflow-x-auto whitespace-pre font-mono leading-relaxed outline-none" contenteditable="true"><code class="language-${language}"># Escribe o pega tus comandos aquí...</code></pre>
      </div><p><br></p>
    `);
    handleContentInput();
  };

  /** Embed a local PDF into the note. Stored as a Blob in IndexedDB and
   *  rendered inline by the browser's native PDF viewer via <embed> +
   *  a blob URL. 100% offline, no external libraries. */
  const handlePdfFile = async (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) return;

    // WEIGHT LIMIT REMOVED (user request): PDFs are stored as raw Blobs in
    // IndexedDB — same rationale as videos. The browser's storage quota is
    // the natural limit; a quota rejection is caught below and surfaced
    // with an actionable message.

    const pdfId = `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // SECURITY (Task 2-b): also escape the single-quote (') char — the
    // surrounding template literal uses backticks but the safeName is
    // interpolated inside an attribute that uses double quotes; for
    // consistency with handleImageFile and to be safe against any
    // downstream single-quoted context, escape it too.
    const safeName = escapeHtml(file.name);
    const sizeLabel = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${(file.size / 1024).toFixed(0)} KB`;

    try {
      await savePdfBlob({
        id: pdfId,
        noteId: note.id,
        name: file.name,
        mimeType: 'application/pdf',
        blob: file,
        caption: file.name,
      });
    } catch (err) {
      console.error('No se pudo guardar el PDF:', err);
      alert('No se pudo guardar el PDF (el navegador rechazó el almacenamiento).');
      return;
    }

    const pdfHtml = `
      <figure class="vault-pdf-embed my-5 max-w-full rounded-lg overflow-hidden border border-[#262626] bg-[#0D0D0D] shadow-xl" contenteditable="false" data-pdf-id="${pdfId}">
        <div class="bg-[#0D0D0D] px-3.5 py-2 border-b border-[#262626] text-[11px] text-red-400 font-semibold flex items-center justify-between select-none">
          <span class="uppercase tracking-wider font-mono flex items-center gap-1.5 truncate">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            PDF • ${sizeLabel}
          </span>
          <a href="#" class="vault-pdf-download text-[#666] hover:text-blue-300 text-[10px] cursor-pointer" contenteditable="false" role="button" tabindex="-1" data-pdf-id="${pdfId}">⬇ Descargar</a>
        </div>
        <embed type="application/pdf" style="width: 100%; height: 600px; display: block; background: #1a1a1a;" />
        <figcaption class="p-2 text-center text-xs text-[#888] italic bg-[#0D0D0D] border-t border-[#262626] outline-none" contenteditable="true">
          PDF: ${safeName.replace(/\.pdf$/i, '')}
        </figcaption>
      </figure><p><br></p>`;

    if (editorRef.current) {
      insertHtmlInEditable(editorRef.current, pdfHtml);
      attachPdfSources();
      handleContentInput();
    }
  };

  // Drop routing: images / videos (REGLA DE ORO) / PDFs — shared handler.
  const handleDrop = (e: React.DragEvent) =>
    runFileDrop(e, { onImageFile: handleImageFile, onVideoFile: handleVideoFile, onPdfFile: handlePdfFile });

  const handleMouseMove = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const text = target.innerText?.trim();
    if (text && text.length > 1 && text.length < 50 && target.tagName !== 'BODY' && target.children.length === 0) {
      const cleanText = text.replace(/[.,:;!?()"']/g, '').toLowerCase();
      // O(1) lookup — the map is cached (see getGlossaryMap below); a
      // per-mousemove .find() over the glossary lowercased every term twice
      // (~120 lookups/sec).
      const match = getGlossaryMap().get(cleanText);
      if (match) {
        const rect = target.getBoundingClientRect();
        setHoveredTerm({ term: match, x: Math.max(16, Math.min(window.innerWidth - 380, rect.left)), y: rect.bottom + 8 });
        return;
      }
    }
    if (hoveredTerm) setHoveredTerm(null);
  };

  // Lowercased term/acronym → GlossaryTerm (first wins on collision, same as
  // the previous .find() semantics). Cached in refs and (re)built inside the
  // handler — ref writes during render are forbidden, and the React Compiler
  // cannot preserve this cache as a useMemo (Map of prop-object references),
  // so it is rebuilt only when the glossary prop identity changes.
  const glossaryMapRef = useRef<Map<string, GlossaryTerm> | null>(null);
  const glossaryMapSrcRef = useRef<GlossaryTerm[] | null>(null);
  const getGlossaryMap = () => {
    if (glossaryMapRef.current === null || glossaryMapSrcRef.current !== glossaryTerms) {
      const map = new Map<string, GlossaryTerm>();
      for (const g of glossaryTerms) {
        const t = g.term.toLowerCase();
        if (!map.has(t)) map.set(t, g);
        if (g.acronym) {
          const a = g.acronym.toLowerCase();
          if (!map.has(a)) map.set(a, g);
        }
      }
      glossaryMapRef.current = map;
      glossaryMapSrcRef.current = glossaryTerms;
      return map;
    }
    return glossaryMapRef.current;
  };

  // Breadcrumb: walk parentId chain
  const breadcrumb = useMemo(() => {
    const chain: Note[] = [];
    let current: Note | undefined = note;
    const byId = new Map(allNotes.map((n) => [n.id, n] as [string, Note]));
    while (current) {
      chain.unshift(current);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return chain;
  }, [note, allNotes]);

  const subnotes = useMemo(() => allNotes.filter((n) => n.parentId === note.id), [allNotes, note.id]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0A] overflow-hidden relative select-text" onMouseMove={handleMouseMove}>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />
      <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfFile(f); e.target.value = ''; }} />

      {/* REGLA DE ORO (videos) — banner: permission lost AND/OR missing files.
          "Conceder acceso" re-grants the stored folder; "Re-linkear" picks a
          NEW videos folder; "Buscar archivo" copies the missing file(s) back
          into the folder under the name the note expects. */}
      <VideoAccessBanner
        variant="bar" noun="nota" missingHint
        fsNeedsPermission={fsNeedsPermission}
        missingVideoCount={missingVideoCount}
        onGrantAccess={() => void grantAccess()}
        onRelinkFolder={() => void relinkFolder()}
        onFindFiles={() => relinkInputRef.current?.click()}
      />
      <VideoHiddenInputs
        videoInputRef={videoInputRef}
        relinkInputRef={relinkInputRef}
        onVideoFile={handleVideoFile}
        onRelinkFiles={handleRelinkFiles}
      />

      {/* Breadcrumb */}
      {breadcrumb.length > 1 && (
        <div className="px-6 pt-3 flex items-center gap-1 text-[11px] text-[#666] bg-[#0D0D0D] border-b border-[#262626] flex-wrap">
          {breadcrumb.map((n, i) => (
            <React.Fragment key={n.id}>
              {i > 0 && <ChevronRight className="w-3 h-3 text-[#444]" />}
              <button
                onClick={() => onSelectNote(n.id)}
                className={`hover:text-blue-400 transition-colors ${i === breadcrumb.length - 1 ? 'text-white font-semibold' : ''}`}
              >
                {n.title || 'Sin título'}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="px-6 pt-4 pb-3 bg-[#0D0D0D] border-b border-[#262626] flex flex-col gap-2.5 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); triggerAutoSave(); }}
            placeholder="Título del Apunte..."
            className="w-full bg-transparent text-xl md:text-2xl font-bold text-white focus:outline-none border-none placeholder:text-[#444] tracking-tight"
          />
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#161616] border border-[#262626] text-[11px] font-mono text-[#888]">
              {saveStatus === 'saved' && (<><Check className="w-3 h-3 text-green-400" /><span className="text-green-400">Guardado</span></>)}
              {saveStatus === 'saving' && (<><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" /><span className="text-blue-400">Guardando...</span></>)}
              {saveStatus === 'unsaved' && (<><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /><span className="text-[#888]">Editado</span></>)}
            </div>
            <button
              onClick={() => { const nf = !isFavorite; setIsFavorite(nf); triggerAutoSave(); }}
              className={`p-1.5 rounded transition-colors cursor-pointer ${isFavorite ? 'text-yellow-400 bg-yellow-500/10' : 'text-[#666] hover:text-white hover:bg-[#161616]'}`}
            >
              <Star className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
            {/* BLOQUE 5 — "Revisar después" toggle (adds to the Review Queue) */}
            <button
              onClick={() => void handleAddToReview()}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 text-blue-400 transition-colors cursor-pointer"
              title="Marcar este apunte para revisar después (aparece en la cola de Revisión)"
            >
              <ListChecks className="w-3.5 h-3.5" />
              {reviewToast ? (
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-400" />
                  {reviewToast}
                </span>
              ) : (
                <span className="hidden sm:inline">Revisar después</span>
              )}
            </button>
            <button
              onClick={() => {
                // AUDIT (VN-F-009): this cascades the trash to the note AND
                // all its descendants (subpages + their embedded media).
                // Confirm first — same window.confirm pattern as TrashView's
                // "Vaciar Papelera" / NotesView platform delete.
                if (window.confirm('¿Mover este apunte a la papelera? Sus subpáginas y sus archivos incrustados (imágenes, videos y PDFs) también se moverán a la papelera.')) {
                  onDeleteNote(note.id);
                }
              }}
              className="p-1.5 rounded text-[#666] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Mover a papelera (borra también subpáginas)"
              aria-label="Mover a papelera (borra también subpáginas)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-[#888]">
          <div className="flex items-center bg-[#161616] rounded px-2 py-0.5 border border-[#262626]">
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); triggerAutoSave(); }}
              className="bg-transparent border-none text-[#BBB] text-xs py-1 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-[#161616]">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name} className="bg-[#161616] text-[#E5E5E5]">{c.name}</option>
              ))}
            </select>
          </div>

          {/* Source URL */}
          <div className="flex items-center bg-[#161616] rounded px-2 py-0.5 border border-[#262626] gap-1.5 flex-1 min-w-[200px] max-w-sm">
            <ExternalLink className="w-3 h-3 text-[#555] shrink-0" />
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => { setSourceUrl(e.target.value); triggerAutoSave(); }}
              placeholder="URL fuente (opcional)..."
              className="bg-transparent border-none text-[#BBB] text-xs py-1 focus:outline-none w-full placeholder:text-[#555]"
            />
            {sourceUrl.trim() && (
              <a
                href={sourceUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-[10px] font-mono shrink-0"
                title="Abrir fuente"
              >
                Abrir
              </a>
            )}
          </div>

          {/* Meta: created date */}
          <span className="font-mono text-[10px] text-[#555]">
            {new Date(note.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="px-4 py-1.5 bg-[#0D0D0D] border-b border-[#262626] flex items-center gap-0.5 overflow-x-auto shrink-0">
        <button onClick={() => execCmd('formatBlock', '<h1>')} className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#161616] transition-colors" title="Título 1"><Heading1 className="w-3.5 h-3.5" /></button>
        <button onClick={() => execCmd('formatBlock', '<h2>')} className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#161616] transition-colors" title="Título 2"><Heading2 className="w-3.5 h-3.5" /></button>
        <button onClick={() => execCmd('formatBlock', '<h3>')} className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#161616] transition-colors" title="Título 3"><Heading3 className="w-3.5 h-3.5" /></button>
        <div className="w-px h-4 bg-[#262626] mx-1" />
        <button onClick={() => execCmd('bold')} className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#161616] transition-colors" title="Negrita"><Bold className="w-3.5 h-3.5" /></button>
        <button onClick={() => execCmd('italic')} className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#161616] transition-colors" title="Cursiva"><Italic className="w-3.5 h-3.5" /></button>
        <button onClick={() => execCmd('underline')} className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#161616] transition-colors" title="Subrayado"><Underline className="w-3.5 h-3.5" /></button>
        <div className="w-px h-4 bg-[#262626] mx-1" />
        <button onClick={() => execCmd('insertUnorderedList')} className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#161616] transition-colors" title="Lista"><List className="w-3.5 h-3.5" /></button>
        <button onClick={() => execCmd('insertOrderedList')} className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#161616] transition-colors" title="Lista numerada"><ListOrdered className="w-3.5 h-3.5" /></button>
        <button onClick={insertChecklist} className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#161616] transition-colors" title="Checklist"><CheckSquare className="w-3.5 h-3.5" /></button>
        <button onClick={() => execCmd('formatBlock', '<blockquote>')} className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#161616] transition-colors" title="Cita"><Quote className="w-3.5 h-3.5" /></button>
        <div className="w-px h-4 bg-[#262626] mx-1" />
        <button onClick={() => insertCodeBlock('bash')} className="p-1.5 rounded text-[#888] hover:text-blue-400 hover:bg-[#161616] transition-colors" title="Bloque de código"><Code className="w-3.5 h-3.5" /></button>
        <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#161616] transition-colors" title="Insertar imagen"><ImageIcon className="w-3.5 h-3.5" /></button>
        <button onClick={() => videoInputRef.current?.click()} className="p-1.5 rounded text-[#888] hover:text-blue-400 hover:bg-[#161616] transition-colors" title="Incrustar video — se copia a tu carpeta de videos (nunca al vault ni al backup)"><Video className="w-3.5 h-3.5" /></button>
        <button onClick={() => pdfInputRef.current?.click()} className="p-1.5 rounded text-[#888] hover:text-red-400 hover:bg-[#161616] transition-colors" title="Incrustar PDF a full (renderizado nativo del navegador, 100% offline, viaja en el backup)"><FileText className="w-3.5 h-3.5" /></button>
        <div className="w-px h-4 bg-[#262626] mx-1" />
        <span className="text-[10px] text-[#555] font-mono px-1 shrink-0 hidden sm:inline">Pega imágenes con Ctrl+V</span>
      </div>

      {/* Editable Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#0A0A0A]">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleContentInput}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={handleEditorClick}
          className="vault-editor-content max-w-4xl mx-auto px-6 py-6 min-h-[300px] text-sm leading-relaxed text-[#E5E5E5] focus:outline-none"
        />
      </div>

      {/* Auto Table of Contents — floating toggle, parses h1-h3 from current note */}
      <AutoToc contentHtml={note.contentHtml} editorRef={editorRef} />

      {/* Subnotes Section */}
      <div className="border-t border-[#262626] bg-[#0D0D0D] px-6 py-3 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#555] flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-[#888]" />
            Subpáginas ({subnotes.length})
          </h3>
          <button
            onClick={onCreateSubnote}
            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium"
          >
            <Plus className="w-3 h-3" />
            Nueva subpágina
          </button>
        </div>
        {subnotes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {subnotes.map((sn) => (
              <button
                key={sn.id}
                onClick={() => onSelectNote(sn.id)}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#161616] border border-[#262626] hover:border-blue-500/50 text-[11px] text-[#BBB] hover:text-white transition-colors"
              >
                <FileText className="w-3 h-3 text-blue-400" />
                <span className="max-w-[180px] truncate">{sn.title || 'Sin título'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Glossary hover tooltip */}
      {hoveredTerm && (
        <div
          className="fixed z-50 w-[360px] max-w-[90vw] bg-[#0D0D0D] border border-blue-500/40 rounded-lg shadow-2xl p-3 text-left"
          style={{ left: hoveredTerm.x, top: Math.min(hoveredTerm.y, window.innerHeight - 200) }}
          onMouseLeave={() => setHoveredTerm(null)}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <BookOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="font-bold text-xs text-white truncate">
                {hoveredTerm.term.term}
                {hoveredTerm.term.acronym && (
                  <span className="text-blue-400 font-mono ml-1">[{hoveredTerm.term.acronym}]</span>
                )}
              </span>
            </div>
            {onOpenGlossaryTerm && (
              <button
                onClick={() => onOpenGlossaryTerm(hoveredTerm.term.id)}
                className="text-[10px] text-blue-400 hover:text-blue-300 shrink-0 font-medium"
              >
                Ver en glosario &rarr;
              </button>
            )}
          </div>
          <p className="text-[11px] text-[#999] leading-relaxed">
            {hoveredTerm.term.shortDefinition || hoveredTerm.term.longDefinition.slice(0, 200)}
          </p>
        </div>
      )}
    </div>
  );
};
