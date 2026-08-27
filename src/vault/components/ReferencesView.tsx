import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Search, Star, ExternalLink, Trash2, Bookmark, Github, FileText, Wrench, Link as LinkIcon, FileCode, BookOpen } from 'lucide-react';
import { ReferenceItem, GlossaryTerm } from '../types';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';

// Stable fallback so the useLiveQuery result keeps a constant reference while
// the first query is in flight (inline `|| []` churns every render).
const EMPTY_REFS: ReferenceItem[] = [];

const TYPE_ICONS: Record<ReferenceItem['type'], React.ReactNode> = {
  link: <LinkIcon className="w-3.5 h-3.5" />,
  cheatsheet: <FileText className="w-3.5 h-3.5" />,
  repo: <Github className="w-3.5 h-3.5" />,
  tool: <Wrench className="w-3.5 h-3.5" />,
  article: <FileCode className="w-3.5 h-3.5" />,
  other: <Bookmark className="w-3.5 h-3.5" />,
};
const TYPE_COLORS: Record<ReferenceItem['type'], string> = {
  link: 'text-blue-400', cheatsheet: 'text-amber-400', repo: 'text-purple-400',
  tool: 'text-emerald-400', article: 'text-cyan-400', other: 'text-[#888]',
};

/* AUDIT VN-B-015: reference URLs are free-form user input (the schema accepts
 * any string, and backups restore them verbatim) and were rendered raw in the
 * anchor href — a stored `javascript:alert(1)` or `data:text/html,...` executed
 * on click (stored XSS). Same normalization LabsView and GlossaryView already
 * use: anything that doesn't start with http gets the `https://` prefix, which
 * neutralizes executable schemes — `https://javascript:alert(1)` is not a
 * runnable URL — while normal links (with or without scheme) still work. */
const safeHref = (url: string): string => {
  const u = url.trim();
  return u.startsWith('http') ? u : `https://${u}`;
};

/**
 * GlossaryLinkText — highlights glossary terms inside any text as clickable
 * blue links. Clicking opens the glossary entry. Matching is case-insensitive
 * on whole words; longer terms are matched first to avoid partial overlaps.
 *
 * Used for the "azulito" requirement: anything in references that matches a
 * glossary term shows up in blue and is clickable.
 */
const GlossaryLinkText: React.FC<{
  text: string;
  terms: GlossaryTerm[];
  onOpenTerm: (termId: string) => void;
  baseClassName?: string;
  linkClassName?: string;
}> = ({ text, terms, onOpenTerm, baseClassName = '', linkClassName = '' }) => {
  // Build a stable sorted list of unique terms (longest first to avoid overlapping).
  const matchers = useMemo(() => {
    const seen = new Set<string>();
    const list: { label: string; id: string }[] = [];
    for (const t of terms) {
      if (t.isDeleted) continue;
      const candidates: string[] = [];
      if (t.term && t.term.trim().length > 2) candidates.push(t.term.trim());
      if (t.acronym && t.acronym.trim().length > 1) candidates.push(t.acronym.trim());
      for (const c of candidates) {
        const key = c.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        list.push({ label: c, id: t.id });
      }
    }
    list.sort((a, b) => b.label.length - a.label.length);
    return list;
  }, [terms]);

  // Build a single regex with all terms (alternation). Word boundaries.
  const { regex } = useMemo(() => {
    if (matchers.length === 0) return { regex: null as RegExp | null };
    const escaped = matchers.map((m) => m.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return { regex: new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi') };
  }, [matchers]);

  // Map lowercase label → term id (for fast lookup during split).
  const labelToId = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of matchers) m.set(x.label.toLowerCase(), x.id);
    return m;
  }, [matchers]);

  if (!regex || !text) {
    return <span className={baseClassName}>{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  // Clone regex to avoid state issues if reused
  const re = new RegExp(regex.source, regex.flags);
  while ((m = re.exec(text)) !== null) {
    const matchStart = m.index;
    const matchText = m[0];
    const id = labelToId.get(matchText.toLowerCase());
    if (matchStart > lastIdx) {
      parts.push(<span key={`t-${lastIdx}`}>{text.slice(lastIdx, matchStart)}</span>);
    }
    if (id) {
      parts.push(
        <button
          key={`l-${matchStart}`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onOpenTerm(id);
          }}
          className={`text-blue-400 hover:text-blue-300 hover:underline cursor-pointer font-medium ${linkClassName}`}
          title={`Ver "${matchText}" en el glosario`}
        >
          {matchText}
        </button>
      );
    } else {
      parts.push(<span key={`p-${matchStart}`}>{matchText}</span>);
    }
    lastIdx = matchStart + matchText.length;
    // Avoid zero-length match infinite loop
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  if (lastIdx < text.length) {
    parts.push(<span key={`t-end`}>{text.slice(lastIdx)}</span>);
  }

  return <span className={baseClassName}>{parts}</span>;
};

interface ReferencesViewProps {
  glossaryTerms: GlossaryTerm[];
  onOpenGlossaryTerm: (termId: string) => void;
}

export const ReferencesView: React.FC<ReferencesViewProps> = ({ glossaryTerms, onOpenGlossaryTerm }) => {
  const refs = useLiveQuery(() => db.references.filter((r) => !r.isDeleted).toArray(), [], EMPTY_REFS);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Inline add form
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [desc, setDesc] = useState('');
  const [tags, setTags] = useState('');
  const [type, setType] = useState<ReferenceItem['type']>('link');

  const filtered = useMemo(() => {
    return refs.filter((r) => {
      if (showFavOnly && !r.isFavorite) return false;
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchDesc = (r.description || '').toLowerCase().includes(q);
        const matchTags = (r.tags || []).some((t) => t.toLowerCase().includes(q));
        const matchUrl = r.url.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchTags && !matchUrl) return false;
      }
      return true;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [refs, search, filterType, showFavOnly]);

  const handleAdd = useCallback(async () => {
    if (!title.trim() || !url.trim()) return;
    const id = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await db.references.add({
      id,
      title: title.trim(),
      url: url.trim(),
      description: desc.trim() || undefined,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      type,
      isFavorite: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setTitle(''); setUrl(''); setDesc(''); setTags(''); setType('link'); setIsAdding(false);
  }, [title, url, desc, tags, type]);

  const handleToggleFav = useCallback(async (r: ReferenceItem) => {
    await db.references.update(r.id, { isFavorite: !r.isFavorite, updatedAt: new Date().toISOString() });
  }, []);

  const handleDelete = useCallback(async (r: ReferenceItem) => {
    if (window.confirm(`¿Eliminar "${r.title}"?`)) {
      await db.references.update(r.id, { isDeleted: true, updatedAt: new Date().toISOString() });
    }
  }, []);

  const types: (typeof filterType)[] = ['all', 'link', 'cheatsheet', 'repo', 'tool', 'article', 'other'];

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-48px)] overflow-hidden bg-[#0A0A0A]">
      {/* Header */}
      <div className="px-6 py-3 border-b border-[#262626] bg-[#0D0D0D] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-blue-400" />
            Referencias / Recursos
          </h1>
          <p className="text-xs text-[#888]">Links, cheatsheets, repos, herramientas y artículos — {refs.length} en total.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo
        </button>
      </div>

      {/* Hint banner about glossary linking */}
      <div className="px-6 py-1.5 border-b border-[#262626] bg-blue-500/5 flex items-center gap-2 shrink-0">
        <BookOpen className="w-3 h-3 text-blue-400 shrink-0" />
        <p className="text-[10px] text-blue-300/80">
          Las palabras que coincidan con términos de tu glosario aparecen en <span className="text-blue-400 font-medium">azul</span> — haz clic para abrir la entrada del glosario.
        </p>
      </div>

      {/* Filters */}
      <div className="px-6 py-2.5 border-b border-[#262626] bg-[#0D0D0D] flex items-center gap-3 flex-wrap shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[#555] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar en referencias..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#161616] border border-[#262626] rounded-md pl-8 pr-2.5 py-1.5 text-xs text-[#E5E5E5] placeholder:text-[#555] focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-1">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                filterType === t ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-[#888] hover:bg-[#161616] hover:text-white border border-transparent'
              }`}
            >
              {t === 'all' ? 'Todos' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowFavOnly(!showFavOnly)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
            showFavOnly ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' : 'text-[#888] hover:bg-[#161616] hover:text-white border-transparent'
          }`}
        >
          <Star className="w-3 h-3" /> Fav
        </button>
      </div>

      {/* Add form */}
      {isAdding && (
        <div className="px-6 py-3 border-b border-[#262626] bg-[#161616] space-y-2 animate-in fade-in duration-100 shrink-0">
          <div className="flex gap-2">
            <input className="flex-1 bg-[#0D0D0D] border border-[#262626] rounded px-3 py-1.5 text-xs text-white placeholder:text-[#555] focus:border-blue-500 focus:outline-none" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título *" />
            <select className="w-32 bg-[#0D0D0D] border border-[#262626] rounded px-2 py-1.5 text-xs text-white cursor-pointer" value={type} onChange={(e) => setType(e.target.value as ReferenceItem['type'])}>
              {(['link', 'cheatsheet', 'repo', 'tool', 'article', 'other'] as const).map((t) => <option key={t} value={t} className="bg-[#161616]">{t}</option>)}
            </select>
          </div>
          <input className="w-full bg-[#0D0D0D] border border-[#262626] rounded px-3 py-1.5 text-xs text-white font-mono placeholder:text-[#555] focus:border-blue-500 focus:outline-none" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL *" />
          <div className="flex gap-2">
            <input className="flex-1 bg-[#0D0D0D] border border-[#262626] rounded px-3 py-1.5 text-xs text-white placeholder:text-[#555] focus:border-blue-500 focus:outline-none" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción (opcional)" />
            <input className="flex-1 bg-[#0D0D0D] border border-[#262626] rounded px-3 py-1.5 text-xs text-white placeholder:text-[#555] focus:border-blue-500 focus:outline-none" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, separados, por, coma" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer transition-colors">Guardar</button>
            <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 rounded text-[#888] hover:text-white text-xs cursor-pointer">Cancelar</button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-[#666] space-y-2">
            <Bookmark className="w-10 h-10 text-[#2a2a2a] mx-auto" />
            <p className="text-sm text-[#888]">{refs.length === 0 ? 'No tienes referencias todavía.' : 'Nada coincide con los filtros.'}</p>
            {refs.length === 0 && <p className="text-xs">Guarda links, cheatsheets, repos y herramientas útiles aquí.</p>}
          </div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="bg-[#0D0D0D] border border-[#262626] rounded-md p-3 flex items-start gap-3 hover:border-[#333] transition-colors group">
              <div className={`shrink-0 mt-0.5 ${TYPE_COLORS[r.type]}`}>{TYPE_ICONS[r.type]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <a href={safeHref(r.url)} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-white hover:text-blue-400 transition-colors truncate flex items-center gap-1 max-w-full">
                    <GlossaryLinkText
                      text={r.title}
                      terms={glossaryTerms}
                      onOpenTerm={onOpenGlossaryTerm}
                      linkClassName="text-blue-400 hover:text-blue-300"
                    />
                    <ExternalLink className="w-3 h-3 text-[#555] shrink-0" />
                  </a>
                  {r.isFavorite && <Star className="w-3 h-3 text-yellow-400 shrink-0" fill="currentColor" />}
                </div>
                {r.description && (
                  <p className="text-[11px] text-[#888]">
                    <GlossaryLinkText
                      text={r.description}
                      terms={glossaryTerms}
                      onOpenTerm={onOpenGlossaryTerm}
                      linkClassName="text-blue-400 hover:text-blue-300"
                    />
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#161616] text-[#666]">{r.type}</span>
                  {r.tags.map((tag) => {
                    // A tag may itself be a glossary term — if so, make it clickable.
                    const matchTerm = glossaryTerms.find(
                      (g) => !g.isDeleted && (g.term.toLowerCase() === tag.toLowerCase() || (g.acronym && g.acronym.toLowerCase() === tag.toLowerCase()))
                    );
                    if (matchTerm) {
                      return (
                        <button
                          key={tag}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenGlossaryTerm(matchTerm.id);
                          }}
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/40 text-blue-300 hover:bg-blue-500/25 hover:text-blue-200 cursor-pointer transition-colors"
                          title={`Ver "${tag}" en el glosario`}
                        >
                          {tag}
                        </button>
                      );
                    }
                    return (
                      <span key={tag} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">{tag}</span>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleToggleFav(r)} className="p-1 rounded text-[#666] hover:text-yellow-400 hover:bg-[#161616] transition-colors cursor-pointer" title={r.isFavorite ? 'Quitar de favoritos' : 'Marcar favorito'}>
                  <Star className="w-3.5 h-3.5" fill={r.isFavorite ? 'currentColor' : 'none'} />
                </button>
                <button onClick={() => handleDelete(r)} className="p-1 rounded text-[#666] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer" title="Eliminar">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
