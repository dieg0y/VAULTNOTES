import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Star, Trash2, ExternalLink, Plus, Heading1, Heading2, Heading3, Bold, Italic, Underline,
  List, ListOrdered, CheckSquare, Quote, Code, Image as ImageIcon, Check, BookOpen,
  ChevronRight, FileText, Video
} from 'lucide-react';
import { Note, GlossaryTerm, CategoryItem } from '../../types';
import { db } from '../../db';
import { insertHtmlInEditable } from '../../utils/domInsert';

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
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [hoveredTerm, setHoveredTerm] = useState<{ term: GlossaryTerm; x: number; y: number } | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoUrlsRef = useRef<string[]>([]);

  /** Attach persistent object-URLs to every embedded video in the editor. */
  const attachVideoSources = useCallback(async () => {
    if (!editorRef.current) return;
    const embeds = editorRef.current.querySelectorAll<HTMLElement>('.vault-video-embed[data-vid]');
    for (const fig of Array.from(embeds)) {
      const vid = fig.getAttribute('data-vid');
      const videoEl = fig.querySelector('video');
      if (!vid || !videoEl || videoEl.getAttribute('src')) continue;
      try {
        const stored = await db.videos.get(vid);
        if (stored) {
          fig.classList.remove('vault-video-missing');
          const url = URL.createObjectURL(stored.blob);
          videoUrlsRef.current.push(url);
          videoEl.src = url;
        } else {
          fig.classList.add('vault-video-missing');
        }
      } catch {
        fig.classList.add('vault-video-missing');
      }
    }
  }, []);

  // Revoke object URLs when the editor unmounts (note switch / view change).
  useEffect(() => {
    return () => {
      videoUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      videoUrlsRef.current = [];
    };
  }, []);

  // NOTE: this component is keyed by `note.id` upstream (NotesView), so local
  // state initializes from props on every note switch — no sync effect needed.
  // Only the contentEditable DOM needs an explicit load per note.
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = note.contentHtml;
      attachVideoSources();
    }
  }, [note.id, attachVideoSources]);

  const triggerAutoSave = useCallback(() => {
    setSaveStatus('unsaved');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      const rawHtml = editorRef.current ? editorRef.current.innerHTML : note.contentHtml;
      // Strip ephemeral blob: URLs — videos are re-attached from the DB on load.
      const html = rawHtml.replace(/\ssrc="blob:[^"]*"/g, '');
      await onUpdateNote({
        title,
        contentHtml: html,
        category,
        sourceUrl: sourceUrl.trim() || undefined,
        isFavorite,
        updatedAt: new Date().toISOString(),
      });
      setSaveStatus('saved');
    }, 1500);
  }, [title, category, sourceUrl, isFavorite, onUpdateNote, note.contentHtml]);

  const handleContentInput = () => {
    if (editorRef.current) triggerAutoSave();
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) { editorRef.current.focus(); handleContentInput(); }
  };

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
      <div class="my-4 rounded-lg overflow-hidden border border-[#262626] bg-[#141414] font-mono text-xs shadow-lg">
        <div class="bg-[#0D0D0D] px-3.5 py-2 border-b border-[#262626] text-[11px] text-blue-400 font-semibold flex items-center justify-between select-none">
          <span class="uppercase tracking-wider font-mono">${language}</span>
        </div>
        <pre class="p-4 text-blue-300 overflow-x-auto whitespace-pre font-mono leading-relaxed outline-none" contenteditable="true"><code class="language-${language}"># Escribe o pega tus comandos aquí...</code></pre>
      </div><p><br></p>
    `);
    handleContentInput();
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const imgId = `img-${Date.now()}`;
      await db.images.add({
        id: imgId, noteId: note.id, name: file.name, mimeType: file.type,
        dataUrl, caption: 'Diagrama / Captura', createdAt: new Date().toISOString(),
      });
      const imageHtml = `
        <figure class="my-6 max-w-full inline-block rounded-lg overflow-hidden border border-[#262626] bg-[#161616] shadow-xl">
          <img src="${dataUrl}" alt="${file.name}" style="max-width: 100%; height: auto; display: block;" />
          <figcaption class="p-2 text-center text-xs text-[#888] italic bg-[#0D0D0D] border-t border-[#262626] outline-none" contenteditable="true">
            Fig: ${file.name.replace(/\.[^/.]+$/, '')}
          </figcaption>
        </figure><p><br></p>`;
      if (editorRef.current) {
        insertHtmlInEditable(editorRef.current, imageHtml);
        handleContentInput();
      }
    };
    reader.readAsDataURL(file);
  };

  /** Embed a local video file into the note (stored as Blob in IndexedDB). */
  const handleVideoFile = async (file: File) => {
    if (!file.type.startsWith('video/')) return;
    const vidId = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const safeName = file.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    try {
      await db.videos.add({
        id: vidId,
        noteId: note.id,
        name: file.name,
        mimeType: file.type,
        blob: file, // File IS a Blob — stored efficiently without base64
        caption: file.name,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('No se pudo guardar el video:', err);
      alert('El video es demasiado grande para guardarlo localmente (límite del navegador). Prueba con un archivo más pequeño o comprimido.');
      return;
    }
    const videoHtml = `
      <figure class="vault-video-embed my-5 max-w-full rounded-lg overflow-hidden border border-[#262626] bg-[#0D0D0D] shadow-xl" contenteditable="false" data-vid="${vidId}">
        <video controls playsinline preload="metadata" style="width: 100%; max-height: 480px; display: block; background: #000; border-radius: 8px 8px 0 0;"></video>
        <figcaption class="p-2 text-center text-xs text-[#888] italic bg-[#0D0D0D] border-t border-[#262626] outline-none" contenteditable="true">
          Video: ${safeName.replace(/\.[^/.]+$/, '')}
        </figcaption>
      </figure><p><br></p>`;
    if (editorRef.current) {
      insertHtmlInEditable(editorRef.current, videoHtml);
      attachVideoSources();
      handleContentInput();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) handleImageFile(file);
        return;
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files: File[] = Array.from(e.dataTransfer.files);
      files.forEach((f) => {
        if (f.type.startsWith('image/')) handleImageFile(f);
        else if (f.type.startsWith('video/')) handleVideoFile(f);
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const text = target.innerText?.trim();
    if (text && text.length > 1 && text.length < 50 && target.tagName !== 'BODY' && target.children.length === 0) {
      const cleanText = text.replace(/[.,:;!?()"']/g, '').toLowerCase();
      const match = glossaryTerms.find((g) => g.term.toLowerCase() === cleanText || (g.acronym && g.acronym.toLowerCase() === cleanText));
      if (match) {
        const rect = target.getBoundingClientRect();
        setHoveredTerm({ term: match, x: Math.max(16, Math.min(window.innerWidth - 380, rect.left)), y: rect.bottom + 8 });
        return;
      }
    }
    if (hoveredTerm) setHoveredTerm(null);
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
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoFile(f); e.target.value = ''; }} />

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
            <button
              onClick={() => onDeleteNote(note.id)}
              className="p-1.5 rounded text-[#666] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
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
        <button onClick={() => videoInputRef.current?.click()} className="p-1.5 rounded text-[#888] hover:text-blue-400 hover:bg-[#161616] transition-colors" title="Incrustar video desde tu PC (se guarda en el vault y viaja en el backup)"><Video className="w-3.5 h-3.5" /></button>
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
          className="vault-editor-content max-w-4xl mx-auto px-6 py-6 min-h-[300px] text-sm leading-relaxed text-[#E5E5E5] focus:outline-none"
        />
      </div>

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
