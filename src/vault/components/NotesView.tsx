import React, { useState, useMemo } from 'react';
import { Layers, Plus, Star, Search, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { Note, GlossaryTerm, PlatformItem, CategoryItem } from '../types';
import { RichEditor } from './Editor/RichEditor';

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

  // --- Expandable subpages tree state ---
  // Notes auto-expand when selected (their children become visible), and the
  // ancestor chain of the selected note is always kept visible. The user can
  // still manually collapse anything (userCollapsed overrides auto-expand).
  const [userExpanded, setUserExpanded] = useState<Set<string>>(new Set());
  const [userCollapsed, setUserCollapsed] = useState<Set<string>>(new Set());

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
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchTitle = note.title.toLowerCase().includes(q);
        const matchContent = note.contentHtml.toLowerCase().includes(q);
        const matchInChildren = (childrenByParent.get(note.id) || []).some(
          (sn) => sn.title.toLowerCase().includes(q) || sn.contentHtml.toLowerCase().includes(q)
        );
        if (!matchTitle && !matchContent && !matchInChildren) return false;
      }
      return true;
    });
  }, [topLevelNotes, selectedPlatform, selectedCategory, searchFilter, childrenByParent]);

  const currentNote = useMemo(() => {
    return activeNotes.find((n) => n.id === selectedNoteId) || filteredNotes[0] || null;
  }, [activeNotes, selectedNoteId, filteredNotes]);

  // Derived auto-expanded ids: every ancestor of the current note (so it stays
  // visible) plus the current note itself (so its direct subpages show).
  const autoExpandedIds = useMemo(() => {
    const s = new Set<string>();
    if (!currentNote) return s;
    s.add(currentNote.id);
    let parent = currentNote.parentId ? notesById.get(currentNote.parentId) : undefined;
    while (parent) {
      s.add(parent.id);
      parent = parent.parentId ? notesById.get(parent.parentId) : undefined;
    }
    return s;
  }, [currentNote, notesById]);

  const isExpanded = (noteId: string) =>
    (autoExpandedIds.has(noteId) && !userCollapsed.has(noteId)) || userExpanded.has(noteId);

  const toggleExpand = (noteId: string) => {
    if (autoExpandedIds.has(noteId)) {
      // Currently expanded by selection: collapse it explicitly
      setUserCollapsed((prev) => new Set(prev).add(noteId));
      setUserExpanded((prev) => {
        const next = new Set(prev);
        next.delete(noteId);
        return next;
      });
    } else if (userExpanded.has(noteId)) {
      setUserExpanded((prev) => {
        const next = new Set(prev);
        next.delete(noteId);
        return next;
      });
    } else {
      setUserExpanded((prev) => new Set(prev).add(noteId));
      setUserCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(noteId);
        return next;
      });
    }
  };

  // Recursive tree row renderer
  const renderNoteItem = (note: Note, depth: number): React.ReactElement => {
    const children = childrenByParent.get(note.id) || [];
    const isSelected = note.id === currentNote?.id;
    const expanded = children.length > 0 && isExpanded(note.id);

    return (
      <div key={note.id}>
        <div
          onClick={() => onSelectNote(note.id)}
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
                  className="flex items-center gap-0.5 text-[10px] font-mono text-[#777] hover:text-blue-400 px-1 py-0.5 rounded hover:bg-[#222] transition-colors"
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
    <div className="flex flex-1 h-[calc(100vh-48px)] overflow-hidden bg-[#0A0A0A]">
      {/* 1. Left: Platforms */}
      <div className="w-[220px] bg-[#0D0D0D] border-r border-[#262626] flex flex-col shrink-0 overflow-y-auto">
        <div className="p-3 border-b border-[#262626]">
          <h2 className="font-bold text-[10px] uppercase tracking-widest text-[#555] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#888]" />
            Plataformas
          </h2>
        </div>
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
            <button
              key={p.id}
              onClick={() => setSelectedPlatform(p.name)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors ${
                selectedPlatform === p.name
                  ? 'bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/30'
                  : 'text-[#888] hover:bg-[#161616] hover:text-white'
              }`}
            >
              <span className="truncate">{p.name}</span>
              <span className="font-mono text-[10px] text-[#555]">{platformCounts.get(p.name) || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Center: Note titles (expandable subpages tree) */}
      <div className="w-[300px] md:w-[320px] bg-[#0A0A0A] border-r border-[#262626] flex flex-col shrink-0">
        <div className="p-3 border-b border-[#262626] flex flex-col gap-2 bg-[#0D0D0D]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#888] uppercase tracking-wider">
              {selectedPlatform === 'ALL' ? 'Todos los Apuntes' : selectedPlatform}
            </span>
            <button
              onClick={() => onCreateNote(selectedPlatform !== 'ALL' ? selectedPlatform : (platforms[0]?.name || ''))}
              className="p-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
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

      {/* 3. Right: Editor (top-level note OR any nested subnote) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0A0A0A]">
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
