import React, { useState, useMemo, useDeferredValue } from 'react';
import { Layers, Plus, Star, Search, FileText, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';
import { Note, GlossaryTerm, PlatformItem, CategoryItem } from '../types';
import { db } from '../db';
import { createLowerCache } from '../utils/lowerTextCache';
import { RichEditor } from './Editor/RichEditor';
import { PanelResizeHandle } from './PanelResizeHandle';
import { useResizablePanel } from '../hooks/useResizablePanel';

interface NotesViewProps {
  notes: Note[];
  selectedNoteId: string | null;
  platforms: PlatformItem[];
  categories: CategoryItem[];
  glossaryTerms: GlossaryTerm[];
  onSelectNote: (noteId: string) => void;
  onUpdateNote: (noteId: string, updated: Partial<Note>) => void;
  onDeleteNote: (noteId: string) => void;
  onCreateNote: (platform: string) => void;
  onCreateSubnote: (parentId: string) => void;
  onOpenGlossaryTerm?: (termId: string) => void;
}

// VN-F-001 — module-level lowercase cache (keys are scoped `noteId:t`/`:c`,
// so it survives re-renders and only re-lowercases changed notes).
const lowerCache = createLowerCache();

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  selectedNoteId,
  platforms,
  categories,
  glossaryTerms,
  onSelectNote,
  onUpdateNote,
  onDeleteNote,
  onCreateNote,
  onCreateSubnote,
  onOpenGlossaryTerm,
}) => {
  const activeNotes = useMemo(() => notes.filter((n) => !n.isDeleted), [notes]);
  const topLevelNotes = useMemo(() => activeNotes.filter((n) => !n.parentId), [activeNotes]);

  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  // --- Platform management (add / delete from the sidebar itself) ---
  const [isAddingPlatform, setIsAddingPlatform] = useState(false);
  const [newPlatformInput, setNewPlatformInput] = useState('');

  const handleAddPlatform = async () => {
    const name = newPlatformInput.trim();
    if (!name) return;
    if (platforms.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      setNewPlatformInput('');
      setIsAddingPlatform(false);
      return;
    }
    await db.platforms.add({
      id: `plat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      createdAt: new Date().toISOString(),
    });
    setNewPlatformInput('');
    setIsAddingPlatform(false);
  };

  const handleDeletePlatform = async (platform: PlatformItem) => {
    const count = activeNotes.filter((n) => !n.parentId && n.platform === platform.name).length;
    if (count > 0) {
      alert(
        `No se puede eliminar "${platform.name}": ${count} apunte${count === 1 ? '' : 's'} la está${count === 1 ? '' : 'n'} usando. Muévelo${count === 1 ? '' : 's'} a otra plataforma primero.`
      );
      return;
    }
    if (window.confirm(`¿Eliminar la plataforma "${platform.name}"?`)) {
      await db.platforms.delete(platform.id);
      if (selectedPlatform === platform.name) setSelectedPlatform('ALL');
    }
  };

  /* --- Resizable panels (persisted) --- */
  const platformsPanel = useResizablePanel({
    storageKey: 'vault-notes-platforms-w',
    defaultWidth: 220,
    minWidth: 160,
    maxWidth: 380,
  });
  const listPanel = useResizablePanel({
    storageKey: 'vault-notes-list-w',
    defaultWidth: 320,
    minWidth: 220,
    maxWidth: 560,
  });

  /* --- Expandable subpages tree (VS Code style, always reliable) ---
     A single source of truth (`expandedIds`): the toggle is an exact flip,
     and selecting a note always reveals its full ancestor chain. */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const childrenByParent = useMemo(() => {
    const map = new Map<string, Note[]>();
    activeNotes.forEach((n) => {
      if (!n.parentId) return;
      const list = map.get(n.parentId) || [];
      list.push(n);
      map.set(n.parentId, list);
    });
    return map;
  }, [activeNotes]);

  const notesById = useMemo(() => new Map(activeNotes.map((n) => [n.id, n])), [activeNotes]);

  /* VN-F-001 — lowercase search index, cached per note id.
     Previously the filter lowercased EVERY note's title+contentHtml on EVERY
     keystroke. Now the lowercase pass runs once per notes-array change, and
     `lowerCache` reuses entries whose source text did not change (Dexie
     re-emits fresh objects on each write, so identity-keyed caching would
     never hit). The search value is also deferred so keystrokes stay
     responsive while the (now cheap) filter renders at lower priority. */
  const searchIndex = useMemo(() => {
    const idx = new Map<string, string>();
    const keep: string[] = [];
    for (const n of activeNotes) {
      idx.set(n.id, `${lowerCache.get(`${n.id}:t`, n.title)}\n${lowerCache.get(`${n.id}:c`, n.contentHtml)}`);
      keep.push(`${n.id}:t`, `${n.id}:c`);
    }
    lowerCache.prune(keep);
    return idx;
  }, [activeNotes]);
  const deferredSearch = useDeferredValue(searchFilter);

  const platformCounts = useMemo(() => {
    const map = new Map<string, number>();
    topLevelNotes.forEach((n) => map.set(n.platform, (map.get(n.platform) || 0) + 1));
    return map;
  }, [topLevelNotes]);

  const filteredNotes = useMemo(() => {
    return topLevelNotes.filter((note) => {
      if (selectedPlatform !== 'ALL' && note.platform !== selectedPlatform) return false;
      if (selectedCategory !== 'ALL') {
        const hasCategory = note.category === selectedCategory || (note.categories || []).includes(selectedCategory);
        if (!hasCategory) return false;
      }
      if (deferredSearch.trim()) {
        const q = deferredSearch.toLowerCase();
        const haystack = (id: string) => searchIndex.get(id) || '';
        const matchSelf = haystack(note.id).includes(q);
        const matchInChildren = (childrenByParent.get(note.id) || []).some(
          (sn) => haystack(sn.id).includes(q)
        );
        if (!matchSelf && !matchInChildren) return false;
      }
      return true;
    });
  }, [topLevelNotes, selectedPlatform, selectedCategory, deferredSearch, searchIndex, childrenByParent]);

  const currentNote = useMemo(() => {
    return activeNotes.find((n) => n.id === selectedNoteId) || filteredNotes[0] || null;
  }, [activeNotes, selectedNoteId, filteredNotes]);

  // Ancestor chain (self included) of the selected note — must stay expanded.
  const selectionChainIds = useMemo(() => {
    const s = new Set<string>();
    let cur: Note | null | undefined = currentNote;
    while (cur) {
      s.add(cur.id);
      cur = cur.parentId ? notesById.get(cur.parentId) : undefined;
    }
    return s;
  }, [currentNote, notesById]);

  // When the selection changes (from anywhere: row click, search, dashboard),
  // expand its whole chain so the note is always visible. Official
  // "adjust state during render" pattern — no effect needed.
  const [prevSelectedId, setPrevSelectedId] = useState<string | null>(null);
  if ((currentNote?.id ?? null) !== prevSelectedId) {
    setPrevSelectedId(currentNote?.id ?? null);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      selectionChainIds.forEach((id) => next.add(id));
      return next;
    });
  }

  const toggleExpand = (noteId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  };

  // Clicking a row selects the note AND always reveals its children.
  const handleRowClick = (noteId: string) => {
    onSelectNote(noteId);
    setExpandedIds((prev) => (prev.has(noteId) ? prev : new Set(prev).add(noteId)));
  };

  // Recursive tree row renderer
  const renderNoteItem = (note: Note, depth: number): React.ReactElement => {
    const children = childrenByParent.get(note.id) || [];
    const isSelected = note.id === currentNote?.id;
    const expanded = children.length > 0 && expandedIds.has(note.id);

    return (
      <div key={note.id}>
        <div
          onClick={() => handleRowClick(note.id)}
          className={`p-3 relative cursor-pointer transition-colors ${
            isSelected ? 'bg-[#161616]' : 'hover:bg-[#111111]'
          }`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {isSelected && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />}
          <div className="flex items-center justify-between gap-1 mb-1">
            {note.parentId ? (
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#222] text-[#999] border border-[#2c2c2c] truncate max-w-[170px] flex items-center gap-1">
                <FileText className="w-2.5 h-2.5" />
                Subpágina
              </span>
            ) : (
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-blue-500/20 text-blue-400 truncate max-w-[170px]">
                {note.category}
              </span>
            )}
            <div className="flex items-center gap-1 shrink-0">
              {note.isFavorite && <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />}
              {children.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(note.id);
                  }}
                  className={`flex items-center gap-0.5 text-[10px] font-mono px-1 py-0.5 rounded transition-colors ${
                    expanded ? 'text-blue-400 bg-blue-500/10' : 'text-[#777] hover:text-blue-400 hover:bg-[#222]'
                  }`}
                  title={expanded ? 'Colapsar subpáginas' : 'Expandir subpáginas'}
                >
                  {expanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  {children.length}
                </button>
              )}
            </div>
          </div>
          <h3
            className={`text-sm leading-snug ${
              isSelected ? 'font-semibold text-white' : note.parentId ? 'text-[#BBB] font-normal' : 'font-medium text-[#DDD]'
            }`}
          >
            {note.title}
          </h3>
        </div>
        {expanded && children.map((child) => renderNoteItem(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex flex-1 flex-col md:flex-row h-[calc(100vh-48px)] overflow-y-auto md:overflow-hidden bg-[#0A0A0A]">
      {/* 1. Left: Platforms (resizable, manage: add / delete) — FIX-3d: apilado full-width en móvil */}
      <div
        style={{ '--panel-w': `${platformsPanel.width}px` } as React.CSSProperties}
        className="bg-[#0D0D0D] border-b md:border-b-0 md:border-r border-[#262626] flex flex-col shrink-0 overflow-y-auto w-full md:w-[var(--panel-w)] max-h-[30vh] md:max-h-none"
      >
        <div className="p-3 border-b border-[#262626] flex items-center justify-between">
          <h2 className="font-bold text-[10px] uppercase tracking-widest text-[#555] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#888]" />
            Plataformas
          </h2>
          <button
            onClick={() => setIsAddingPlatform((v) => !v)}
            className="p-1 rounded text-[#777] hover:text-blue-400 hover:bg-[#161616] transition-colors"
            title="Agregar plataforma"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {isAddingPlatform && (
          <div className="p-2 border-b border-[#262626] bg-[#161616] animate-in fade-in duration-100">
            <input
              type="text"
              autoFocus
              value={newPlatformInput}
              onChange={(e) => setNewPlatformInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddPlatform();
                else if (e.key === 'Escape') {
                  setIsAddingPlatform(false);
                  setNewPlatformInput('');
                }
              }}
              placeholder="Nombre de la plataforma..."
              className="w-full bg-[#0D0D0D] border border-[#333] rounded px-2 py-1 text-xs text-white placeholder:text-[#555] focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        <div className="p-2 space-y-1">
          <button
            onClick={() => setSelectedPlatform('ALL')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors ${
              selectedPlatform === 'ALL'
                ? 'bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/30'
                : 'text-[#888] hover:bg-[#161616] hover:text-white'
            }`}
          >
            <span>Todas</span>
            <span className="font-mono text-[10px] text-[#555]">{topLevelNotes.length}</span>
          </button>
          {platforms.map((p) => (
            <div
              key={p.id}
              className={`group flex items-center gap-0.5 rounded transition-colors ${
                selectedPlatform === p.name ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-[#161616] border border-transparent'
              }`}
            >
              <button
                onClick={() => setSelectedPlatform(p.name)}
                className={`flex-1 flex items-center justify-between px-2.5 py-1.5 rounded text-xs min-w-0 text-left ${
                  selectedPlatform === p.name ? 'text-blue-400 font-semibold' : 'text-[#888] group-hover:text-white'
                }`}
                title={p.name}
              >
                <span className="truncate">{p.name}</span>
                <span className="font-mono text-[10px] text-[#555] shrink-0 ml-1">{platformCounts.get(p.name) || 0}</span>
              </button>
              <button
                onClick={() => handleDeletePlatform(p)}
                className="p-1 mr-1 rounded text-[#555] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all shrink-0"
                title={`Eliminar plataforma "${p.name}"`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <PanelResizeHandle onMouseDown={platformsPanel.startDrag} onReset={platformsPanel.reset} />

      {/* 2. Center: Note titles (expandable subpages tree, resizable) — FIX-3d: max-h limitada en móvil */}
      <div
        style={{ '--panel-w': `${listPanel.width}px` } as React.CSSProperties}
        className="bg-[#0A0A0A] border-b md:border-b-0 md:border-r border-[#262626] flex flex-col shrink-0 w-full md:w-[var(--panel-w)] max-h-[40vh] md:max-h-none"
      >
        <div className="p-3 border-b border-[#262626] flex flex-col gap-2 bg-[#0D0D0D]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#888] uppercase tracking-wider truncate">
              {selectedPlatform === 'ALL' ? 'Todos los Apuntes' : selectedPlatform}
            </span>
            <button
              onClick={() => onCreateNote(selectedPlatform !== 'ALL' ? selectedPlatform : (platforms[0]?.name || ''))}
              className="p-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
              title="Crear apunte"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-[11px]">Nuevo</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#555] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar en apuntes..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-[#161616] border border-[#262626] rounded-md pl-8 pr-2.5 py-1 text-xs text-[#E5E5E5] placeholder:text-[#555] focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#161616] text-[#888] border border-[#262626] rounded px-2 py-1 text-[11px] focus:outline-none cursor-pointer"
          >
            <option value="ALL">Categoría: Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#161616]">
          {filteredNotes.length === 0 ? (
            <div className="p-8 text-center text-[#666] space-y-2">
              <FileText className="w-8 h-8 text-[#333] mx-auto" />
              <p className="text-xs">No hay apuntes en esta vista.</p>
            </div>
          ) : (
            filteredNotes.map((note) => renderNoteItem(note, 0))
          )}
        </div>
      </div>

      <PanelResizeHandle onMouseDown={listPanel.startDrag} onReset={listPanel.reset} />

      {/* 3. Right: Editor (top-level note OR any nested subnote) — FIX-3d: altura natural en móvil (el editor crece con el contenido) */}
      <div className="flex-none md:flex-1 flex flex-col h-auto md:h-full overflow-hidden bg-[#0A0A0A] min-w-0 min-h-0">
        {currentNote ? (
          <RichEditor
            key={currentNote.id}
            note={currentNote}
            allNotes={activeNotes}
            categories={categories}
            glossaryTerms={glossaryTerms}
            onUpdateNote={(updated) => onUpdateNote(currentNote.id, updated)}
            onDeleteNote={onDeleteNote}
            onOpenGlossaryTerm={onOpenGlossaryTerm}
            onSelectNote={onSelectNote}
            onCreateSubnote={() => onCreateSubnote(currentNote.id)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#666] gap-3 p-8">
            <FileText className="w-12 h-12 text-[#2a2a2a]" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-[#888]">No hay ningún apunte seleccionado</p>
              <p className="text-xs">Crea tu primer apunte para empezar a escribir.</p>
            </div>
            <button
              onClick={() => onCreateNote(selectedPlatform !== 'ALL' ? selectedPlatform : (platforms[0]?.name || ''))}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Crear apunte
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
