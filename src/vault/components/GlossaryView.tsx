import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Layers as FlashcardsIcon,
  Sparkles,
  ExternalLink,
  Trash2,
  Check,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  FileText,
  X,
  Code
} from 'lucide-react';
import { GlossaryTerm, Note, GlossaryExample, PlatformItem } from '../types';
import confetti from 'canvas-confetti';

interface GlossaryViewProps {
  terms: GlossaryTerm[];
  notes: Note[];
  platforms: PlatformItem[];
  selectedTermId: string | null;
  onSelectTerm: (termId: string) => void;
  onUpdateTerm: (termId: string, updated: Partial<GlossaryTerm>) => void;
  onDeleteTerm: (termId: string) => void;
  onCreateTerm: () => void;
  onOpenNote: (noteId: string) => void;
}

export const GlossaryView: React.FC<GlossaryViewProps> = ({
  terms,
  notes,
  platforms,
  selectedTermId,
  onSelectTerm,
  onUpdateTerm,
  onDeleteTerm,
  onCreateTerm,
  onOpenNote,
}) => {
  const activeTerms = useMemo(() => terms.filter((t) => !t.isDeleted), [terms]);
  const activeNotes = useMemo(() => notes.filter((n) => !n.isDeleted), [notes]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [studyCardIndex, setStudyCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Group terms by first letter A-Z
  const groupedTerms = useMemo(() => {
    const sorted = [...activeTerms].sort((a, b) => a.term.localeCompare(b.term));
    const map = new Map<string, GlossaryTerm[]>();

    sorted.forEach((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTerm = t.term.toLowerCase().includes(q);
        const matchAcro = (t.acronym || '').toLowerCase().includes(q);
        const matchDef =
          (t.shortDefinition || '').toLowerCase().includes(q) ||
          (t.longDefinition || '').toLowerCase().includes(q);
        const matchPlatform = (t.platform || '').toLowerCase().includes(q);
        const matchCat = (t.category || '').toLowerCase().includes(q);
        if (!matchTerm && !matchAcro && !matchDef && !matchPlatform && !matchCat) return;
      }

      const letter = (t.term[0] || '#').toUpperCase();
      if (!map.has(letter)) {
        map.set(letter, []);
      }
      map.get(letter)!.push(t);
    });

    return map;
  }, [activeTerms, searchQuery]);

  // Selected term
  const currentTerm = useMemo(() => {
    return activeTerms.find((t) => t.id === selectedTermId) || activeTerms[0] || null;
  }, [activeTerms, selectedTermId]);

  // Find notes that use this term in title or content (matching term or acronym)
  const notesUsingTerm = useMemo(() => {
    if (!currentTerm) return [];
    const termLower = currentTerm.term.toLowerCase();
    const acroLower = currentTerm.acronym ? currentTerm.acronym.toLowerCase() : null;

    return activeNotes.filter((n) => {
      const titleLower = n.title.toLowerCase();
      const contentLower = n.contentHtml.toLowerCase();
      const matchTerm = titleLower.includes(termLower) || contentLower.includes(termLower);
      const matchAcro = acroLower ? (titleLower.includes(acroLower) || contentLower.includes(acroLower)) : false;
      return matchTerm || matchAcro;
    });
  }, [currentTerm, activeNotes]);

  // Helper to handle updating examples
  const handleAddExample = () => {
    if (!currentTerm) return;
    const currentExamples = currentTerm.examples || [];
    const newExample: GlossaryExample = {
      id: `ex-${Date.now()}`,
      title: `Ejemplo ${currentExamples.length + 1}`,
      content: '',
    };
    onUpdateTerm(currentTerm.id, {
      examples: [...currentExamples, newExample],
    });
  };

  const handleUpdateExample = (exampleId: string, updatedFields: Partial<GlossaryExample>) => {
    if (!currentTerm || !currentTerm.examples) return;
    const nextExamples = currentTerm.examples.map((ex) =>
      ex.id === exampleId ? { ...ex, ...updatedFields } : ex
    );
    onUpdateTerm(currentTerm.id, { examples: nextExamples });
  };

  const handleRemoveExample = (exampleId: string) => {
    if (!currentTerm || !currentTerm.examples) return;
    const nextExamples = currentTerm.examples.filter((ex) => ex.id !== exampleId);
    onUpdateTerm(currentTerm.id, { examples: nextExamples });
  };

  // Flashcards Study deck
  const flashcardDeck = useMemo(() => {
    return [...activeTerms].sort(() => 0.5 - Math.random());
  }, [activeTerms, isStudyMode]);

  const currentFlashcard = flashcardDeck[studyCardIndex];

  const handleNextFlashcard = () => {
    setIsFlipped(false);
    if (studyCardIndex + 1 < flashcardDeck.length) {
      setStudyCardIndex((prev) => prev + 1);
    } else {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setStudyCardIndex(0);
    }
  };

  const handlePrevFlashcard = () => {
    setIsFlipped(false);
    if (studyCardIndex > 0) {
      setStudyCardIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-48px)] overflow-hidden bg-[#0A0A0A] relative">
      {/* Top Header Banner */}
      <div className="px-6 py-3 border-b border-[#262626] bg-[#0D0D0D] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            Glosario de Ciberseguridad &amp; IAM
          </h1>
          <p className="text-xs text-[#888]">
            Terminología y siglas vinculadas en tiempo real a tus apuntes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsStudyMode(true);
              setStudyCardIndex(0);
              setIsFlipped(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#262626] hover:border-blue-500/40 bg-[#161616] text-xs font-semibold text-[#E5E5E5] hover:text-white transition-colors cursor-pointer"
          >
            <FlashcardsIcon className="w-3.5 h-3.5 text-blue-400" />
            Estudiar Flashcards
          </button>

          <button
            onClick={onCreateTerm}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Término
          </button>
        </div>
      </div>

      {/* Main 2-Column Split View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: A-Z Terms List */}
        <div className="w-[300px] md:w-[320px] bg-[#0D0D0D] border-r border-[#262626] flex flex-col shrink-0">
          {/* Quick Filter Search */}
          <div className="p-3 border-b border-[#262626] bg-[#0D0D0D]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#666] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por término o sigla..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#161616] border border-[#262626] rounded pl-8 pr-2.5 py-1.5 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          {/* List grouped by Alphabet letter */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {groupedTerms.size === 0 ? (
              <div className="p-6 text-center text-[#666] text-xs">
                No se encontraron términos para "{searchQuery}"
              </div>
            ) : (
              Array.from(groupedTerms.entries()).map(([letter, termsInGroup]) => (
                <div key={letter} className="space-y-1">
                  <div className="px-2 py-0.5">
                    <span className="font-mono text-[11px] font-bold text-blue-400">{letter}</span>
                  </div>
                  {termsInGroup.map((t) => {
                    const isSelected = t.id === currentTerm?.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => onSelectTerm(t.id)}
                        className={`w-full text-left p-2.5 rounded flex flex-col gap-0.5 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#161616] border border-blue-500/40 text-white'
                            : 'hover:bg-[#161616] border border-transparent text-[#AAA]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-xs text-white font-mono flex items-center gap-1.5 truncate">
                            {t.acronym && (
                              <span className="px-1 py-0.2 rounded bg-blue-500/20 text-blue-400 font-bold text-[10px] border border-blue-500/30 shrink-0">
                                {t.acronym}
                              </span>
                            )}
                            <span className="truncate">{t.term}</span>
                          </span>
                          {t.platform && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#262626] text-[#888] shrink-0 truncate max-w-[90px]">
                              {t.platform}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#777] line-clamp-1">
                          {t.shortDefinition || t.longDefinition}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Term Detailed Inspector & Editor */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0A0A0A]">
          {currentTerm ? (
            <div className="max-w-3xl mx-auto space-y-5">
              {/* Term Header */}
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#262626]">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={currentTerm.term}
                      onChange={(e) => onUpdateTerm(currentTerm.id, { term: e.target.value })}
                      placeholder="Nombre del Término"
                      className="text-2xl font-bold text-white font-mono bg-transparent outline-none flex-1 border-b border-transparent focus:border-blue-500/50"
                    />
                    <div className="flex items-center gap-1 bg-[#161616] px-2 py-1 rounded border border-[#262626]">
                      <span className="text-[10px] font-bold text-[#666] uppercase font-mono">Sigla:</span>
                      <input
                        type="text"
                        value={currentTerm.acronym || ''}
                        onChange={(e) => onUpdateTerm(currentTerm.id, { acronym: e.target.value })}
                        placeholder="ej. MITM"
                        className="text-xs font-bold text-blue-400 font-mono bg-transparent outline-none w-20 uppercase placeholder:text-[#555]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    {/* Platform selector */}
                    <div className="flex items-center bg-[#161616] rounded px-2 py-1 border border-[#262626]">
                      <select
                        value={currentTerm.platform || ''}
                        onChange={(e) => onUpdateTerm(currentTerm.id, { platform: e.target.value })}
                        className="bg-transparent border-none text-blue-400 font-mono text-xs focus:outline-none cursor-pointer"
                      >
                        <option value="" className="bg-[#161616] text-[#888]">
                          Sin plataforma
                        </option>
                        {platforms.map((p) => (
                          <option key={p.id} value={p.name} className="bg-[#161616] text-[#E5E5E5]">
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Category input */}
                    <input
                      type="text"
                      value={currentTerm.category || ''}
                      onChange={(e) => onUpdateTerm(currentTerm.id, { category: e.target.value })}
                      placeholder="Categoría (ej. Network Security)..."
                      className="bg-[#161616] border border-[#262626] rounded px-2 py-1 text-xs text-[#AAA] focus:outline-none focus:border-blue-500/50 w-48"
                    />

                    {currentTerm.sourceUrl && (
                      <a
                        href={currentTerm.sourceUrl.startsWith('http') ? currentTerm.sourceUrl : `https://${currentTerm.sourceUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-2 py-1 rounded bg-[#161616] text-blue-400 hover:text-blue-300 text-[10px] font-mono border border-[#262626] transition-colors"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        <span>Fuente</span>
                      </a>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onDeleteTerm(currentTerm.id)}
                  className="p-1.5 rounded text-[#666] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Mover término a papelera"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Short Definition */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                  Definición Rápida (para Tooltips flotantes en apuntes)
                </label>
                <textarea
                  rows={2}
                  value={currentTerm.shortDefinition}
                  onChange={(e) => onUpdateTerm(currentTerm.id, { shortDefinition: e.target.value })}
                  placeholder="Definición concisa..."
                  className="w-full bg-[#161616] border border-[#262626] rounded p-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50 leading-relaxed"
                />
              </div>

              {/* Long Definition */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                  Explicación Detallada &amp; Funcionamiento
                </label>
                <textarea
                  rows={4}
                  value={currentTerm.longDefinition}
                  onChange={(e) => onUpdateTerm(currentTerm.id, { longDefinition: e.target.value })}
                  placeholder="Detalles sobre funcionamiento, RFCs o particularidades..."
                  className="w-full bg-[#161616] border border-[#262626] rounded p-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50 leading-relaxed"
                />
              </div>

              {/* Dynamic Multiple Examples List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-green-400 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    Ejemplos de Implementación / Sintaxis / Comandos
                  </label>
                  <button
                    type="button"
                    onClick={handleAddExample}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    + Agregar otro ejemplo
                  </button>
                </div>

                {/* Multiple Examples Render */}
                {currentTerm.examples && currentTerm.examples.length > 0 ? (
                  <div className="space-y-2">
                    {currentTerm.examples.map((ex, index) => (
                      <div key={ex.id || index} className="p-3 bg-[#161616] border border-[#262626] rounded-md space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={ex.title}
                            onChange={(e) => handleUpdateExample(ex.id, { title: e.target.value })}
                            placeholder="Título del ejemplo (ej. KQL Query, Bash...)"
                            className="bg-transparent text-xs font-semibold text-white border-b border-transparent focus:border-blue-500/50 outline-none flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExample(ex.id)}
                            className="text-[#666] hover:text-red-400 p-1"
                            title="Eliminar este ejemplo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <textarea
                          rows={3}
                          value={ex.content}
                          onChange={(e) => handleUpdateExample(ex.id, { content: e.target.value })}
                          placeholder="Comando, snippet o query..."
                          className="w-full bg-[#0D0D0D] border border-[#262626] rounded p-2 text-xs text-blue-300 font-mono focus:outline-none focus:border-green-500/50 leading-relaxed"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  // Fallback single example view/edit
                  <textarea
                    rows={3}
                    value={currentTerm.example || ''}
                    onChange={(e) => onUpdateTerm(currentTerm.id, { example: e.target.value })}
                    placeholder="ej. Comandos de configuración, headers HTTP..."
                    className="w-full bg-[#161616] border border-[#262626] rounded p-2.5 text-xs text-blue-300 font-mono focus:outline-none focus:border-green-500/50 leading-relaxed"
                  />
                )}
              </div>

              {/* Notes using this term */}
              <div className="pt-3 border-t border-[#262626] space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#666]">
                  Usado en {notesUsingTerm.length} Apuntes Relacionados
                </h3>
                {notesUsingTerm.length === 0 ? (
                  <p className="text-xs text-[#666] italic">
                    Este término aún no aparece en ninguno de tus apuntes activos.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {notesUsingTerm.map((note) => (
                      <div
                        key={note.id}
                        onClick={() => onOpenNote(note.id)}
                        className="p-2.5 rounded bg-[#161616] hover:bg-[#202020] border border-[#262626] hover:border-blue-500/40 cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-white group-hover:text-blue-400 truncate block">
                              {note.title}
                            </span>
                            <span className="text-[10px] text-[#666]">
                              {note.platform} • {note.category}
                            </span>
                          </div>
                        </div>
                        <ExternalLink className="w-3 h-3 text-[#666] group-hover:text-blue-400 shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#666] space-y-2">
              <BookOpen className="w-10 h-10 text-[#333]" />
              <p className="text-xs">Selecciona o crea un término para ver sus detalles.</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Fullscreen Flashcard Study Mode */}
      {isStudyMode && currentFlashcard && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-sm flex flex-col items-center justify-between p-6 md:p-10 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl flex items-center justify-between">
            <span className="text-xs font-mono text-[#888] bg-[#161616] px-2.5 py-1 rounded border border-[#262626]">
              Tarjeta {studyCardIndex + 1} de {flashcardDeck.length}
            </span>
            <button
              onClick={() => setIsStudyMode(false)}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#161616] hover:bg-[#202020] text-[#888] hover:text-white rounded border border-[#262626] text-xs font-medium transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Salir
            </button>
          </div>

          <div className="w-full max-w-xl my-auto">
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="w-full aspect-[16/10] perspective-1000 cursor-pointer select-none group"
            >
              <div
                className={`w-full h-full transition-transform duration-500 transform-style-3d relative rounded-lg ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* Front */}
                <div className="absolute inset-0 w-full h-full backface-hidden bg-[#161616] border border-[#262626] rounded-lg p-6 flex flex-col items-center justify-center text-center shadow-lg group-hover:border-blue-500/50 transition-colors">
                  <div className="flex gap-1.5 mb-3 flex-wrap justify-center">
                    {currentFlashcard.platform && (
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-mono uppercase tracking-wider">
                        {currentFlashcard.platform}
                      </span>
                    )}
                    {currentFlashcard.category && (
                      <span className="px-2 py-0.5 rounded bg-[#262626] text-[#AAA] text-[10px] font-mono uppercase tracking-wider">
                        {currentFlashcard.category}
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl md:text-3xl font-bold text-white font-mono leading-tight mb-2">
                    {currentFlashcard.term}
                  </h2>
                  {currentFlashcard.acronym && (
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold text-xs border border-blue-500/30 mb-2 font-mono">
                      {currentFlashcard.acronym}
                    </span>
                  )}

                  <span className="text-xs text-[#666] mt-3 flex items-center gap-1">
                    Toca la tarjeta para ver la definición &rarr;
                  </span>
                </div>

                {/* Back */}
                <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-[#161616] border border-blue-500/50 rounded-lg p-6 flex flex-col justify-between shadow-lg overflow-y-auto">
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-green-400 bg-green-500/10 px-2 py-0.5 rounded inline-block">
                      Definición
                    </span>
                    <p className="text-sm text-[#E5E5E5] leading-relaxed">
                      {currentFlashcard.longDefinition || currentFlashcard.shortDefinition}
                    </p>

                    {currentFlashcard.examples && currentFlashcard.examples.length > 0 ? (
                      <div className="space-y-1.5">
                        {currentFlashcard.examples.map((ex, i) => (
                          <div key={ex.id || i} className="p-2 rounded bg-[#0D0D0D] border border-[#262626] font-mono text-xs text-blue-300">
                            <span className="text-[#666] block mb-0.5 text-[9px] font-bold">{ex.title}:</span>
                            <pre className="whitespace-pre-wrap">{ex.content}</pre>
                          </div>
                        ))}
                      </div>
                    ) : currentFlashcard.example ? (
                      <div className="p-2.5 rounded bg-[#0D0D0D] border border-[#262626] font-mono text-xs text-blue-300">
                        <span className="text-[#666] block mb-1 text-[10px]">Ejemplo:</span>
                        {currentFlashcard.example}
                      </div>
                    ) : null}
                  </div>

                  <span className="text-[10px] text-[#666] text-center pt-2">
                    Toca para volver al término
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm flex items-center justify-between gap-3">
            <button
              onClick={handlePrevFlashcard}
              disabled={studyCardIndex === 0}
              className="p-2.5 rounded-full bg-[#161616] border border-[#262626] hover:bg-[#202020] text-white disabled:opacity-30 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleNextFlashcard}
                className="px-3.5 py-1.5 rounded bg-[#161616] border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                Difícil
              </button>
              <button
                onClick={handleNextFlashcard}
                className="px-3.5 py-1.5 rounded bg-[#161616] border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                Bueno
              </button>
              <button
                onClick={handleNextFlashcard}
                className="px-3.5 py-1.5 rounded bg-[#161616] border border-green-500/30 text-green-400 hover:bg-green-500/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                Fácil
              </button>
            </div>

            <button
              onClick={handleNextFlashcard}
              className="p-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
