import React, { useState, useMemo } from 'react';
import { FileCode, Copy, Download, CheckSquare, Square, Sparkles, FileText, FlaskConical } from 'lucide-react';
import { saveAs } from 'file-saver';
import { Note, Lab } from '../types';
import { generateBlogMarkdown, blogDraftFilename } from '../utils/markdown';

interface BlogViewProps {
  notes: Note[];
  labs: Lab[];
}

export const BlogView: React.FC<BlogViewProps> = ({ notes, labs }) => {
  const activeNotes = useMemo(() => notes.filter((n) => !n.isDeleted), [notes]);
  const topLevelNotes = useMemo(() => activeNotes.filter((n) => !n.parentId), [activeNotes]);
  const activeLabs = useMemo(() => labs.filter((l) => !l.isDeleted), [labs]);

  const subnoteCount = (parentId: string) => activeNotes.filter((n) => n.parentId === parentId).length;

  // Selection state (keys: `note:<id>` / `lab:<id>`)
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [includeAiPrompt, setIncludeAiPrompt] = useState(true);
  const [copied, setCopied] = useState(false);

  const toggleKey = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedNotes = useMemo(
    () => topLevelNotes.filter((n) => selected.has(`note:${n.id}`)),
    [topLevelNotes, selected]
  );
  const selectedLabs = useMemo(
    () => activeLabs.filter((l) => selected.has(`lab:${l.id}`)),
    [activeLabs, selected]
  );

  const markdown = useMemo(
    () =>
      generateBlogMarkdown({
        notes: selectedNotes,
        allNotes: activeNotes,
        labs: selectedLabs,
        includeAiPrompt,
      }),
    [selectedNotes, activeNotes, selectedLabs, includeAiPrompt]
  );

  const totalItems = topLevelNotes.length + activeLabs.length;
  const allSelected = selected.size === totalItems && totalItems > 0;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      const all = new Set<string>();
      topLevelNotes.forEach((n) => all.add(`note:${n.id}`));
      activeLabs.forEach((l) => all.add(`lab:${l.id}`));
      setSelected(all);
    }
  };

  const handleCopy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(markdown);
      ok = true;
    } catch {
      // Legacy fallback (some browsers/contextos block the async clipboard API)
      try {
        const ta = document.createElement('textarea');
        ta.value = markdown;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      alert('No se pudo copiar automáticamente. Selecciona el texto del preview y cópialo manualmente (Ctrl+C).');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, blogDraftFilename({ notes: selectedNotes, labs: selectedLabs }));
  };

  const SelectionRow: React.FC<{
    type: 'note' | 'lab';
    id: string;
    title: string;
    meta: string;
    extra?: string;
  }> = ({ type, id, title, meta, extra }) => {
    const key = `${type}:${id}`;
    const isOn = selected.has(key);
    return (
      <button
        onClick={() => toggleKey(key)}
        className={`w-full text-left p-2.5 rounded border flex items-start gap-2.5 transition-colors cursor-pointer ${
          isOn
            ? 'bg-blue-600/10 border-blue-500/40'
            : 'border-transparent hover:bg-[#161616] hover:border-[#262626]'
        }`}
      >
        {isOn ? (
          <CheckSquare className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        ) : (
          <Square className="w-4 h-4 text-[#555] shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {type === 'note' ? (
              <FileText className="w-3 h-3 text-blue-400 shrink-0" />
            ) : (
              <FlaskConical className="w-3 h-3 text-emerald-400 shrink-0" />
            )}
            <span className={`text-xs font-semibold truncate ${isOn ? 'text-white' : 'text-[#DDD]'}`}>{title}</span>
          </div>
          <p className="text-[10px] text-[#777] mt-0.5 truncate">{meta}</p>
          {extra && <p className="text-[10px] text-[#666] italic mt-0.5">{extra}</p>}
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-48px)] overflow-hidden bg-[#0A0A0A]">
      {/* Top Header Banner */}
      <div className="px-6 py-3 border-b border-[#262626] bg-[#0D0D0D] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <FileCode className="w-4 h-4 text-blue-400" />
            Generar Blog
          </h1>
          <p className="text-xs text-[#888]">
            Convierte tus apuntes y labs en un borrador .md listo para entregarle a una IA y publicarlo en tu portfolio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={selected.size === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#262626] hover:border-blue-500/40 bg-[#161616] text-xs font-semibold text-[#E5E5E5] hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Copiar el markdown al portapapeles"
          >
            {copied ? <CheckSquare className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
            {copied ? '¡Copiado!' : 'Copiar'}
          </button>
          <button
            onClick={handleDownload}
            disabled={selected.size === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Descargar el borrador como archivo .md"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar .md
          </button>
        </div>
      </div>

      {/* Main 2-Column Split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: content selector */}
        <div className="w-[320px] bg-[#0D0D0D] border-r border-[#262626] flex flex-col shrink-0">
          <div className="p-3 border-b border-[#262626] flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#888] uppercase tracking-wider">
              Contenido ({selected.size}/{totalItems})
            </span>
            <button
              onClick={handleSelectAll}
              disabled={totalItems === 0}
              className="text-[10px] text-blue-400 hover:underline disabled:opacity-40 disabled:no-underline cursor-pointer"
            >
              {allSelected ? 'Limpiar' : 'Todo'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {totalItems === 0 ? (
              <div className="p-6 text-center text-xs text-[#666] space-y-2">
                <FileCode className="w-8 h-8 text-[#333] mx-auto" />
                <p>Aún no tienes apuntes ni labs.</p>
                <p className="text-[#555]">Crea contenido y vuelve aquí para generarlo.</p>
              </div>
            ) : (
              <>
                {topLevelNotes.length > 0 && (
                  <p className="px-1 pt-1 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-[#555]">Apuntes</p>
                )}
                {topLevelNotes.map((n) => {
                  const subs = subnoteCount(n.id);
                  return (
                    <SelectionRow
                      key={n.id}
                      type="note"
                      id={n.id}
                      title={n.title}
                      meta={`${n.platform || 'Sin plataforma'} · ${n.category || 'Sin categoría'}`}
                      extra={subs > 0 ? `Incluye ${subs} subpágina${subs === 1 ? '' : 's'}` : undefined}
                    />
                  );
                })}

                {activeLabs.length > 0 && (
                  <p className="px-1 pt-3 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-[#555]">Hands-On / Labs</p>
                )}
                {activeLabs.map((l) => (
                  <SelectionRow
                    key={l.id}
                    type="lab"
                    id={l.id}
                    title={l.title}
                    meta={`${l.organization} · ${l.topic} · ${l.difficulty}`}
                    extra={`${(l.parts || []).length} parte${(l.parts || []).length === 1 ? '' : 's'} · ${(Array.isArray(l.commands) ? l.commands : []).length} comando${(Array.isArray(l.commands) ? l.commands : []).length === 1 ? '' : 's'}`}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Right: preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0A0A0A] min-w-0">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Options */}
            <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
              <label className="flex items-center gap-2 text-xs text-[#DDD] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeAiPrompt}
                  onChange={(e) => setIncludeAiPrompt(e.target.checked)}
                  className="w-3.5 h-3.5 accent-blue-500 cursor-pointer"
                />
                Incluir instrucciones para la IA al inicio del archivo (se recomienda)
              </label>
            </div>

            {selected.size === 0 ? (
              <div className="p-10 text-center text-[#666] space-y-2 border border-dashed border-[#262626] rounded-md">
                <FileCode className="w-10 h-10 text-[#2a2a2a] mx-auto" />
                <p className="text-sm text-[#888] font-medium">Nada seleccionado todavía</p>
                <p className="text-xs">
                  Marca apuntes o labs en la lista de la izquierda y aquí verás el borrador markdown listo para tu IA.
                </p>
              </div>
            ) : (
              <div className="bg-[#0D0D0D] border border-[#262626] rounded-md overflow-hidden">
                <div className="px-4 py-2 border-b border-[#262626] bg-[#111] flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#777] uppercase tracking-widest">Preview · Markdown</span>
                  <span className="text-[10px] font-mono text-[#555]">
                    {markdown.length.toLocaleString('es')} caracteres · {selected.size} elemento{selected.size === 1 ? '' : 's'}
                  </span>
                </div>
                <pre className="p-4 text-xs font-mono text-[#BBB] whitespace-pre-wrap break-words leading-relaxed max-h-[calc(100vh-320px)] overflow-y-auto">
                  {markdown}
                </pre>
              </div>
            )}

            {/* Workflow hint */}
            <div className="text-[11px] text-[#666] bg-[#0D0D0D] border border-[#262626] rounded-md p-3.5 leading-relaxed">
              <strong className="text-[#888]">Flujo recomendado:</strong> selecciona el contenido → <em>Copiar</em> (o <em>Descargar .md</em>) → pégaselo a tu IA favorita con el prompt incluido arriba → la IA te devuelve el artículo → publícalo en tu portfolio. Las subpáginas de cada apunte seleccionado se incluyen automáticamente.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
