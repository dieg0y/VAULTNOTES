import React, { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import {
  Search,
  FileText,
  BookOpen,
  FlaskConical,
  CornerDownLeft,
  X,
  Globe,
  Server,
  Shield,
  Clock,
  Link as LinkIcon,
  Crosshair,
  BookMarked,
  Braces,
  Fingerprint,
  Bug,
  Wrench,
  Zap,
} from 'lucide-react';
import { Note, Lab, GlossaryTerm, ReferenceItem } from '../types';
import { searchAllVault, SearchResultItem, resultToToolDeepLink } from '../utils/fuzzySearch';
import type { ToolDeepLink } from './ToolsView';

/** Minimal HTML-escape for safe fallback rendering inside `dangerouslySetInnerHTML`. */
function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  glossary: GlossaryTerm[];
  labs?: Lab[];
  references?: ReferenceItem[];
  onSelectNote: (noteId: string) => void;
  onSelectGlossaryTerm: (termId: string) => void;
  onSelectLab?: (labId: string) => void;
  onSelectReference?: (referenceId: string) => void;
  onSelectTool?: (deepLink: ToolDeepLink) => void;
  /** BLOQUE 5 — command palette dispatch (new note / open section / open tool / backup). */
  onSelectCommand?: (commandId: string) => void;
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
  references = [],
  onSelectNote,
  onSelectGlossaryTerm,
  onSelectLab,
  onSelectReference,
  onSelectTool,
  onSelectCommand,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // BLOQUE 5 — debounce the search input via useDeferredValue so a fast
  // typist doesn't rebuild the Fuse index on every keystroke. React 19's
  // deferred value lets the UI update immediately while the search runs on
  // a lower-priority render pass. No setTimeout/raf needed.
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(
    () => searchAllVault(deferredQuery, notes, glossary, labs, references),
    [deferredQuery, notes, glossary, labs, references]
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(0);
  };

  const handleSelect = (item: SearchResultItem) => {
    // BLOQUE 5 — command palette entries have their own dispatch path.
    if (item.type === 'command' && item.commandId) {
      if (onSelectCommand) onSelectCommand(item.commandId);
      onClose();
      return;
    }
    const toolLink = resultToToolDeepLink(item);
    if (toolLink && onSelectTool) {
      onSelectTool(toolLink);
    } else if (item.type === 'reference' && onSelectReference) {
      onSelectReference(item.id);
    } else if (item.type === 'note') {
      onSelectNote(item.id);
    } else if (item.type === 'lab' && onSelectLab) {
      onSelectLab(item.id);
    } else if (item.type === 'glossary') {
      onSelectGlossaryTerm(item.id);
    }
    onClose();
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

  const typeMeta = (type: SearchResultItem['type']) => {
    switch (type) {
      case 'note':
        return { label: 'Apunte', icon: <FileText className="w-3.5 h-3.5" />, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', dot: 'bg-blue-500/10 text-blue-400' };
      case 'lab':
        return { label: 'Lab', icon: <FlaskConical className="w-3.5 h-3.5" />, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500/10 text-emerald-400' };
      case 'glossary':
        return { label: 'Glosario', icon: <BookOpen className="w-3.5 h-3.5" />, color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', dot: 'bg-purple-500/10 text-purple-400' };
      case 'reference':
        return { label: 'Referencia', icon: <LinkIcon className="w-3.5 h-3.5" />, color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', dot: 'bg-cyan-500/10 text-cyan-400' };
      case 'tool-http':
        return { label: 'HTTP', icon: <Globe className="w-3.5 h-3.5" />, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-500/10 text-amber-400' };
      case 'tool-port':
        return { label: 'Puerto', icon: <Server className="w-3.5 h-3.5" />, color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', dot: 'bg-rose-500/10 text-rose-400' };
      case 'tool-winevent':
        return { label: 'Event ID', icon: <Shield className="w-3.5 h-3.5" />, color: 'bg-red-500/10 text-red-400 border-red-500/20', dot: 'bg-red-500/10 text-red-400' };
      case 'tool-cron':
        return { label: 'Cron', icon: <Clock className="w-3.5 h-3.5" />, color: 'bg-teal-500/10 text-teal-400 border-teal-500/20', dot: 'bg-teal-500/10 text-teal-400' };
      case 'tool-mitre':
        return { label: 'MITRE', icon: <Crosshair className="w-3.5 h-3.5" />, color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', dot: 'bg-orange-500/10 text-orange-400' };
      case 'tool-sigma':
        return { label: 'Sigma', icon: <BookMarked className="w-3.5 h-3.5" />, color: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20', dot: 'bg-fuchsia-500/10 text-fuchsia-400' };
      // BLOQUE 5 — extended search coverage:
      case 'tool-detection-query':
        return { label: 'Detection', icon: <Braces className="w-3.5 h-3.5" />, color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', dot: 'bg-indigo-500/10 text-indigo-400' };
      case 'tool-sid-rid':
        return { label: 'SID/RID', icon: <Fingerprint className="w-3.5 h-3.5" />, color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', dot: 'bg-yellow-500/10 text-yellow-400' };
      case 'tool-cvss':
        return { label: 'CVSS', icon: <Bug className="w-3.5 h-3.5" />, color: 'bg-pink-500/10 text-pink-400 border-pink-500/20', dot: 'bg-pink-500/10 text-pink-400' };
      case 'tool':
        return { label: 'Herramienta', icon: <Wrench className="w-3.5 h-3.5" />, color: 'bg-sky-500/10 text-sky-400 border-sky-500/20', dot: 'bg-sky-500/10 text-sky-400' };
      case 'command':
        return { label: 'Comando', icon: <Zap className="w-3.5 h-3.5" />, color: 'bg-violet-500/10 text-violet-400 border-violet-500/20', dot: 'bg-violet-500/10 text-violet-400' };
      default:
        return { label: type, icon: <FileText className="w-3.5 h-3.5" />, color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', dot: 'bg-gray-500/10 text-gray-400' };
    }
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
            placeholder="Buscar apuntes, labs, glosario, MITRE, Sigma, eventos, tools… o escribe &gt;new note"
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
              <p className="text-xs">No se encontraron resultados para &quot;{query}&quot;</p>
            </div>
          ) : (
            results.map((item, index) => {
              const isSelected = index === selectedIndex;
              const meta = typeMeta(item.type);
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
                      <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${meta.dot}`}>
                        {meta.icon}
                      </div>

                      <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                        <span
                          className="font-semibold text-xs text-white truncate"
                          dangerouslySetInnerHTML={{
                            __html: item.highlightedTitle || escapeHtml(item.title),
                          }}
                        />

                        <span
                          className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border ${meta.color}`}
                        >
                          {meta.label}
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
                      __html:
                        item.highlightedSnippet ||
                        escapeHtml(item.snippet || item.subtitle || ''),
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
          <span className="text-[10px] font-mono text-blue-400">
            type:note · tag:soc · platform:windows · &gt;command
          </span>
        </div>
      </div>
    </div>
  );
};
