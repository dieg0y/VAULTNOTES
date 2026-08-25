import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, FileText, BookOpen, FlaskConical, CornerDownLeft, X } from 'lucide-react';
import { Note, Lab, GlossaryTerm } from '../types';
import { searchAllVault, SearchResultItem } from '../utils/fuzzySearch';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  glossary: GlossaryTerm[];
  labs?: Lab[];
  onSelectNote: (noteId: string) => void;
  onSelectGlossaryTerm: (termId: string) => void;
  onSelectLab?: (labId: string) => void;
}

/** Outer wrapper: mounts fresh content each time the modal opens. */
export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <SearchModalContent {...props} />;
};

const SearchModalContent: React.FC<GlobalSearchModalProps> = ({
  onClose,
  notes,
  glossary,
  labs = [],
  onSelectNote,
  onSelectGlossaryTerm,
  onSelectLab,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(
    () => searchAllVault(query, notes, glossary, labs),
    [query, notes, glossary, labs]
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (item: SearchResultItem) => {
    if (item.type === 'note') {
      onSelectNote(item.id);
    } else if (item.type === 'lab' && onSelectLab) {
      onSelectLab(item.id);
    } else {
      onSelectGlossaryTerm(item.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-100">
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh]">
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-[#262626] flex items-center gap-2.5 bg-[#0D0D0D]">
          <Search className="w-4 h-4 text-blue-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Búsqueda fuzzy avanzada (título, acrónimo, plataforma, herramientas, contenido)..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-[#555]"
          />
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded border border-[#262626] bg-[#161616] font-mono text-[10px] text-[#888]">
              ESC
            </span>
            <button onClick={onClose} className="text-[#888] hover:text-white p-1 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="p-2 overflow-y-auto flex-1 divide-y divide-[#202020] space-y-1">
          {results.length === 0 ? (
            <div className="p-8 text-center text-[#666]">
              <p className="text-xs">No se encontraron resultados para "{query}"</p>
            </div>
          ) : (
            results.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 rounded-md flex flex-col gap-1.5 cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#181818] ring-1 ring-blue-500/40' : 'hover:bg-[#141414]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${
                          item.type === 'note'
                            ? 'bg-blue-500/10 text-blue-400'
                            : item.type === 'lab'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-purple-500/10 text-purple-400'
                        }`}
                      >
                        {item.type === 'note' ? (
                          <FileText className="w-3.5 h-3.5" />
                        ) : item.type === 'lab' ? (
                          <FlaskConical className="w-3.5 h-3.5" />
                        ) : (
                          <BookOpen className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                        <span
                          className="font-semibold text-xs text-white truncate"
                          dangerouslySetInnerHTML={{
                            __html: item.highlightedTitle || item.title
                          }}
                        />

                        <span
                          className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded ${
                            item.type === 'note'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : item.type === 'lab'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          }`}
                        >
                          {item.type === 'note' ? 'Apunte' : item.type === 'lab' ? 'Lab' : 'Glosario'}
                        </span>

                        {item.platform && (
                          <span className="text-[9px] text-[#888] font-mono px-1 py-0.2 rounded bg-[#202020]">
                            {item.platform}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSelected && (
                        <span className="text-[10px] text-blue-400 font-mono flex items-center gap-1">
                          Abrir <CornerDownLeft className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subtitle / Snippet */}
                  <p
                    className="text-[11px] text-[#888] line-clamp-2 pl-9 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: item.highlightedSnippet || item.snippet || item.subtitle
                    }}
                  />

                  {/* Matched Fields Pills (when query exists) */}
                  {query && item.matchedFields && item.matchedFields.length > 0 && (
                    <div className="pl-9 flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] text-[#666] font-mono">Coincidencia en:</span>
                      {item.matchedFields.map((mf, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded bg-yellow-400/15 border border-yellow-400/30 text-yellow-300 text-[10px] font-mono"
                        >
                          {mf.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-2.5 bg-[#0D0D0D] border-t border-[#262626] flex items-center justify-between text-xs text-[#666]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px]">
              <kbd className="px-1 py-0.2 rounded bg-[#161616] border border-[#262626] text-[10px] font-mono text-[#888]">
                ↑
              </kbd>
              <kbd className="px-1 py-0.2 rounded bg-[#161616] border border-[#262626] text-[10px] font-mono text-[#888]">
                ↓
              </kbd>
              Navegar
            </span>
            <span className="flex items-center gap-1 text-[11px]">
              <kbd className="px-1 py-0.2 rounded bg-[#161616] border border-[#262626] text-[10px] font-mono text-[#888]">
                ↵
              </kbd>
              Abrir
            </span>
          </div>
          <span className="text-[10px] font-mono text-blue-400">Fuse.js Fuzzy Search</span>
        </div>
      </div>
    </div>
  );
};


