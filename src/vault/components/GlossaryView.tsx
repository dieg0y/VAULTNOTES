import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BookOpen,
  Search,
  Plus,
  Layers as FlashcardsIcon,
  ExternalLink,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  FileText,
  X,
  ChevronDown,
  Tag
} from 'lucide-react';
import { GlossaryTerm, Note, GlossaryExample, PlatformItem, CategoryItem } from '../types';
import { db } from '../db';
import { CategoryTreeChecklist } from './CategoryTreeChecklist';
import { PanelResizeHandle } from './PanelResizeHandle';
import { useResizablePanel } from '../hooks/useResizablePanel';
// R6 — misma capa de debounce que NotesView/LabsView, ahora también para
// el editor de términos del glosario (antes escribía Dexie por pulsación).
import { useDebouncedAutoSave } from '../hooks/useDebouncedAutoSave';
import { createLowerCache } from '../utils/lowerTextCache';
import confetti from 'canvas-confetti';

interface GlossaryViewProps {
  terms: GlossaryTerm[];
  notes: Note[];
  platforms: PlatformItem[];
  categories: CategoryItem[];
  selectedTermId: string | null;
  onSelectTerm: (termId: string) => void;
  // R6: ahora acepta void | Promise<void> — App pasa handleUpdateTerm
  // (async) y así el flush del autoguardado puede AWAITear la escritura
  // Dexie real (mismo convenio que onUpdateNote/onUpdateLab en sus vistas).
  onUpdateTerm: (termId: string, updated: Partial<GlossaryTerm>) => void | Promise<void>;
  onDeleteTerm: (termId: string) => void;
  onCreateTerm: () => void;
  onOpenNote: (noteId: string) => void;
}

// VN-F-002 — module-level lowercase cache for the "notes using term" scan
// (keys are scoped `noteId:t`/`:c`; only re-lowercases notes whose source
// text actually changed, instead of recrawling every contentHtml on each
// term selection).
const lowerCache = createLowerCache();

/** Deterministic PRNG (mulberry32) — powers the flashcard shuffle so the deck
 *  order is stable for a given seed. Keeps render pure (no Math.random during
 *  render); the seed is bumped on every study-mode entry for a fresh shuffle. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const GlossaryView: React.FC<GlossaryViewProps> = ({
  terms,
  notes,
  platforms,
  categories,
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
  // Sesión actual: cuántas cartas se calificaron con cada botón (feedback honesto
  // en pantalla; antes los 3 botones prometían efectos distintos y no hacían nada).
  const [sessionStats, setSessionStats] = useState<{ again: number; good: number; easy: number }>({
    again: 0,
    good: 0,
    easy: 0,
  });
  // FSRS-lite: stats por término (misma tabla `flashcardStats` que usa el deck
  // inteligente del Dashboard — las calificaciones de aquí alimentan aquel).
  const flashcardStatsRows = useLiveQuery(() => db.flashcardStats.toArray(), [], []);
  const statsByTerm = useMemo(
    () => new Map((flashcardStatsRows || []).map((s) => [s.termId, s])),
    [flashcardStatsRows]
  );
  const [isCategoryListOpen, setIsCategoryListOpen] = useState(false);

  // Resizable terms list panel (persisted)
  const termsPanel = useResizablePanel({
    storageKey: 'vault-glossary-list-w',
    defaultWidth: 320,
    minWidth: 220,
    maxWidth: 560,
  });

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
      let bucket = map.get(letter);
      if (!bucket) {
        bucket = [];
        map.set(letter, bucket);
      }
      bucket.push(t);
    });

    return map;
  }, [activeTerms, searchQuery]);

  // Selected term
  const currentTerm = useMemo(() => {
    return activeTerms.find((t) => t.id === selectedTermId) || activeTerms[0] || null;
  }, [activeTerms, selectedTermId]);

  // Find notes that use this term in title or content (matching term or acronym).
  // VN-F-002 — title/content lowercase hits the shared cache, so switching
  // between terms is a plain substring scan (no re-lowercasing of contentHtml).
  const notesUsingTerm = useMemo(() => {
    if (!currentTerm) return [];
    const termLower = currentTerm.term.toLowerCase();
    const acroLower = currentTerm.acronym ? currentTerm.acronym.toLowerCase() : null;

    return activeNotes.filter((n) => {
      const titleLower = lowerCache.get(`${n.id}:t`, n.title);
      const contentLower = lowerCache.get(`${n.id}:c`, n.contentHtml);
      const matchTerm = titleLower.includes(termLower) || contentLower.includes(termLower);
      const matchAcro = acroLower ? (titleLower.includes(acroLower) || contentLower.includes(acroLower)) : false;
      return matchTerm || matchAcro;
    });
  }, [currentTerm, activeNotes]);

  // Flashcards Study deck — seeded deterministic shuffle (Fisher–Yates with
  // mulberry32). Math.random() during render violates hook purity; the seed
  // is bumped every time study mode is entered, so each session still gets
  // a fresh shuffle.
  const [deckSeed, setDeckSeed] = useState(0);
  const flashcardDeck = useMemo(() => {
    const rand = mulberry32(deckSeed);
    const deck = [...activeTerms];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }, [activeTerms, deckSeed]);

  const currentFlashcard = flashcardDeck[studyCardIndex];

  /** Avanza el mazo; al terminar la última carta vuelve a la 1 (con confetti). */
  const advanceDeck = () => {
    setIsFlipped(false);
    if (studyCardIndex + 1 < flashcardDeck.length) {
      setStudyCardIndex((prev) => prev + 1);
    } else {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setStudyCardIndex(0);
    }
  };

  const handleNextFlashcard = () => advanceDeck();

  const handlePrevFlashcard = () => {
    setIsFlipped(false);
    if (studyCardIndex > 0) {
      setStudyCardIndex((prev) => prev - 1);
    }
  };

  /** Califica la carta actual y persiste el stats FSRS-lite (misma tabla y
   *  familia de fórmulas que el deck inteligente del Dashboard). */
  const handleRateFlashcard = async (rating: 'again' | 'good' | 'easy') => {
    const card = currentFlashcard;
    if (!card) return;
    setSessionStats((s) => ({ ...s, [rating]: s[rating] + 1 }));
    try {
      const stat = statsByTerm.get(card.id);
      const prevStability = stat?.stability || 0;
      const prevDifficulty = stat?.difficulty || 5;
      const prevReps = stat?.reps || 0;
      const prevLapses = stat?.lapses || 0;
      const newDifficulty =
        rating === 'again'
          ? Math.min(10, prevDifficulty + 1)
          : rating === 'easy'
            ? Math.max(1, prevDifficulty - 1)
            : Math.max(1, prevDifficulty - 0.5);
      const growth = 1.5 + (10 - newDifficulty) * 0.1;
      const newStability =
        rating === 'again'
          ? 0
          : rating === 'easy'
            ? Math.max(2, prevStability === 0 ? 2 : prevStability * growth * 1.3)
            : Math.max(1, prevStability === 0 ? 1 : prevStability * growth);
      const now = new Date();
      const due = new Date(now);
      due.setDate(due.getDate() + Math.ceil(newStability));
      await db.flashcardStats.put({
        id: card.id,
        termId: card.id,
        knownCount: (stat?.knownCount || 0) + (rating === 'again' ? 0 : 1),
        unknownCount: (stat?.unknownCount || 0) + (rating === 'again' ? 1 : 0),
        lastStudiedAt: now.toISOString(),
        stability: newStability,
        difficulty: newDifficulty,
        due: due.toISOString(),
        reps: prevReps + 1,
        lapses: rating === 'again' ? prevLapses + 1 : prevLapses,
      });
    } catch (err) {
      console.warn('Failed to persist flashcard stat:', err);
    }
    advanceDeck();
  };

  // Teclado del modo estudio: Espacio/Enter voltea, 1/2/3 califica,
  // ←/→ navega, Esc sale. Si el foco está en un botón, Espacio/Enter los
  // activa nativamente (no interceptamos para no robar el click).
  // Focus management del diálogo: al entrar al modo estudio el foco pasa a la
  // tarjeta (si se quedara en el botón "Estudiar Flashcards" del header, que
  // queda CUBIERTO por el overlay, pulsar Espacio lo re-activaría y reiniciaría
  // la sesión). Con el foco en la tarjeta, Espacio voltea nativamente y Esc sale.
  const cardRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (isStudyMode && currentFlashcard) {
      cardRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe dispararse al entrar/salir del modo o al cambiar de tarjeta
  }, [isStudyMode, studyCardIndex]);

  useEffect(() => {
    if (!isStudyMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsStudyMode(false);
        return;
      }
      const target = e.target as HTMLElement | null;
      const onInteractive = !!target?.closest('button, input, textarea, select, [contenteditable="true"]');
      const isSpace = e.key === ' ' || e.code === 'Space';
      if ((isSpace || e.key === 'Enter') && onInteractive) return;
      if (isSpace || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped((f) => !f);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextFlashcard();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevFlashcard();
        return;
      }
      if (e.key === '1' || e.key === '2' || e.key === '3') {
        e.preventDefault();
        void handleRateFlashcard(e.key === '1' ? 'again' : e.key === '2' ? 'good' : 'easy');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers cierran sobre el render actual; el efecto re-suscribe al cambiar índice/mazo
  }, [isStudyMode, studyCardIndex, flashcardDeck, isFlipped, statsByTerm]);

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-48px)] overflow-hidden bg-[#0A0A0A] relative">
      {/* Top Header Banner */}
      <div className="px-6 py-3 border-b border-[#262626] bg-[#0D0D0D] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            Glosario de Ciberseguridad &amp; IAM
          </h1>
          <p className="text-xs text-[#888]">
            Terminología y siglas vinculadas en tiempo real a tus apuntes.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setIsStudyMode(true);
              setStudyCardIndex(0);
              setIsFlipped(false);
              setSessionStats({ again: 0, good: 0, easy: 0 });
              setDeckSeed((s) => s + 1);
            }}
            disabled={activeTerms.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#262626] hover:border-blue-500/40 bg-[#161616] text-xs font-semibold text-[#E5E5E5] hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#262626]"
            title={activeTerms.length === 0 ? 'Agrega términos al glosario primero' : 'Modo estudio con flashcards 3D'}
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

      {/* Main 2-Column Split View — FIX-3d: apilado en móvil (lista arriba con max-h, detalle debajo) */}
      <div className="flex flex-1 flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Left Column: A-Z Terms List (resizable) */}
        <div
          style={{ '--panel-w': `${termsPanel.width}px` } as React.CSSProperties}
          className="bg-[#0D0D0D] border-b md:border-b-0 md:border-r border-[#262626] flex flex-col shrink-0 w-full md:w-[var(--panel-w)] max-h-[40vh] md:max-h-none"
        >
          {/* Quick Filter Search */}
          <div className="p-3 border-b border-[#262626] bg-[#0D0D0D]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#858585] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por término o sigla..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#161616] border border-[#262626] rounded pl-8 pr-2.5 py-1.5 text-xs text-white placeholder:text-[#828282] focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          {/* List grouped by Alphabet letter */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {groupedTerms.size === 0 ? (
              <div className="p-6 text-center text-[#858585] text-xs">
                No se encontraron términos para &quot;{searchQuery}&quot;
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
                        <p className="text-[11px] text-[#868686] line-clamp-1">
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

        <PanelResizeHandle onMouseDown={termsPanel.startDrag} onReset={termsPanel.reset} />

        {/* Right Column: Term Detailed Inspector & Editor — FIX-3d: altura natural en móvil */}
        <div className="flex-none md:flex-1 overflow-y-auto p-6 bg-[#0A0A0A] min-w-0">
          {currentTerm ? (
            <TermDetailEditor
              key={currentTerm.id}
              term={currentTerm}
              platforms={platforms}
              categories={categories}
              notesUsingTerm={notesUsingTerm}
              isCategoryListOpen={isCategoryListOpen}
              onToggleCategoryList={() => setIsCategoryListOpen(!isCategoryListOpen)}
              onUpdateTerm={onUpdateTerm}
              onDeleteTerm={onDeleteTerm}
              onOpenNote={onOpenNote}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#858585] space-y-2">
              <BookOpen className="w-10 h-10 text-[#333]" />
              <p className="text-xs">Selecciona o crea un término para ver sus detalles.</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Fullscreen Flashcard Study Mode */}
      {isStudyMode && currentFlashcard && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Modo estudio con flashcards"
          className="fixed inset-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-sm flex flex-col items-center justify-between p-6 md:p-10 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-2xl flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-[#888] bg-[#161616] px-2.5 py-1 rounded border border-[#262626]">
                Tarjeta {studyCardIndex + 1} de {flashcardDeck.length}
              </span>
              {sessionStats.again + sessionStats.good + sessionStats.easy > 0 && (
                <span
                  className="text-xs font-mono text-[#858585] bg-[#161616] px-2.5 py-1 rounded border border-[#262626]"
                  title="Calificaciones de esta sesión (se guardan por término y alimentan el deck inteligente del Dashboard)"
                >
                  {sessionStats.again} difíciles · {sessionStats.good} buenas · {sessionStats.easy} fáciles
                </span>
              )}
            </div>
            <button
              onClick={() => setIsStudyMode(false)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#161616] hover:bg-[#202020] text-[#888] hover:text-white rounded border border-[#262626] text-xs font-medium transition-colors cursor-pointer"
              title="Salir del modo estudio (Esc)"
            >
              <X className="w-3.5 h-3.5" />
              Salir
            </button>
          </div>

          <div className="w-full max-w-xl my-auto">
            <button
              type="button"
              ref={cardRef}
              onClick={() => setIsFlipped(!isFlipped)}
              aria-pressed={isFlipped}
              aria-label={isFlipped ? `Volver al término: ${currentFlashcard.term}` : `Ver la definición de: ${currentFlashcard.term}`}
              className="w-full aspect-[16/10] perspective-1000 cursor-pointer select-none group text-left"
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

                  <span className="text-xs text-[#858585] mt-3 flex items-center gap-1">
                    Toca la tarjeta o pulsa Espacio para ver la definición &rarr;
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
                            <span className="text-[#858585] block mb-0.5 text-[9px] font-bold">{ex.title}:</span>
                            <pre className="whitespace-pre-wrap">{ex.content}</pre>
                          </div>
                        ))}
                      </div>
                    ) : currentFlashcard.example ? (
                      <div className="p-2.5 rounded bg-[#0D0D0D] border border-[#262626] font-mono text-xs text-blue-300">
                        <span className="text-[#858585] block mb-1 text-[10px]">Ejemplo:</span>
                        {currentFlashcard.example}
                      </div>
                    ) : null}
                  </div>

                  <span className="text-[10px] text-[#858585] text-center pt-2">
                    Toca o pulsa Espacio para volver al término
                  </span>
                </div>
              </div>
            </button>
          </div>

          <div className="w-full max-w-sm flex items-center justify-between gap-3">
            <button
              onClick={handlePrevFlashcard}
              disabled={studyCardIndex === 0}
              aria-label="Tarjeta anterior"
              title="Tarjeta anterior (←)"
              className="p-2.5 rounded-full bg-[#161616] border border-[#262626] hover:bg-[#202020] text-white disabled:opacity-30 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => void handleRateFlashcard('again')}
                title="Difícil: la verás antes (tecla 1)"
                className="px-3.5 py-1.5 rounded bg-[#161616] border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                Difícil
              </button>
              <button
                onClick={() => void handleRateFlashcard('good')}
                title="Bueno: siguiente repaso en unos días (tecla 2)"
                className="px-3.5 py-1.5 rounded bg-[#161616] border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                Bueno
              </button>
              <button
                onClick={() => void handleRateFlashcard('easy')}
                title="Fácil: espacia el repaso aún más (tecla 3)"
                className="px-3.5 py-1.5 rounded bg-[#161616] border border-green-500/30 text-green-400 hover:bg-green-500/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                Fácil
              </button>
            </div>

            <button
              onClick={handleNextFlashcard}
              aria-label="Siguiente tarjeta (sin calificar)"
              title="Siguiente tarjeta (→)"
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


/* ------------------------------------------------------------------ */
/* TermDetailEditor — detalle + editor del término seleccionado.        */
/*                                                                     */
/* PERF (R6): los 6 campos de texto libre (term, acronym, platform,     */
/* shortDefinition, longDefinition, example) llamaban a onUpdateTerm    */
/* DIRECTO en cada onChange: una escritura Dexie + re-emisión de        */
/* db.glossary.toArray() + re-render de App POR PULSACIÓN. Ahora viven  */
/* en un borrador local con la misma capa de debounce de NotesView y    */
/* LabsView (useDebouncedAutoSave): cada pulsación solo toca state      */
/* local y el flush escribe TODOS los campos sucios con UNA sola        */
/* llamada onUpdateTerm. El componente se remonta por término           */
/* (key={term.id} en GlossaryView, mismo patrón que LabDetailEditor),  */
/* así que los borradores se inicializan una vez por término. Las       */
/* acciones discretas (checklist de categorías, altas/bajas/ediciones   */
/* del array examples, borrado) siguen siendo escrituras directas.      */
/* ------------------------------------------------------------------ */

/** Campos de texto libre con borrador + autoguardado debounceado. */
type TermTextField = 'term' | 'acronym' | 'platform' | 'shortDefinition' | 'longDefinition' | 'example';

interface TermDetailEditorProps {
  term: GlossaryTerm;
  platforms: PlatformItem[];
  categories: CategoryItem[];
  /** Notas activas que usan el término (título o contenido) — se calcula
   *  en GlossaryView con el cache compartido lowerCache (VN-F-002). */
  notesUsingTerm: Note[];
  /** El estado abierto/cerrado del checklist de categorías vive en
   *  GlossaryView para PRESERVARSE al cambiar de término (igual que en el
   *  editor inline original). */
  isCategoryListOpen: boolean;
  onToggleCategoryList: () => void;
  onUpdateTerm: (termId: string, updated: Partial<GlossaryTerm>) => void | Promise<void>;
  onDeleteTerm: (termId: string) => void;
  onOpenNote: (noteId: string) => void;
}

const TermDetailEditor: React.FC<TermDetailEditorProps> = ({
  term,
  platforms,
  categories,
  notesUsingTerm,
  isCategoryListOpen,
  onToggleCategoryList,
  onUpdateTerm,
  onDeleteTerm,
  onOpenNote,
}) => {
  // Borradores locales de los 6 campos de texto libre — se inicializan UNA
  // vez por término (el componente está remontado via key={term.id}).
  const [drafts, setDrafts] = useState({
    term: term.term,
    acronym: term.acronym || '',
    platform: term.platform || '',
    shortDefinition: term.shortDefinition ?? '',
    longDefinition: term.longDefinition,
    example: term.example || '',
  });

  // Campos editados desde el último flush EXITOSO: el flush escribe SOLO
  // los sucios (una escritura Dexie, no seis).
  const dirtyFieldsRef = useRef<Set<TermTextField>>(new Set());

  // Re-sincroniza los campos LIMPIOS cuando la fila cambia externamente
  // (p. ej. import de un backup); los sucios SIEMPRE gana el borrador.
  // Tras un flush propio es un no-op (prop === borradores) y devuelve la
  // MISMA referencia para no disparar un render extra.
  useEffect(() => {
    setDrafts((prev) => {
      const dirty = dirtyFieldsRef.current;
      const next = {
        term: dirty.has('term') ? prev.term : term.term,
        acronym: dirty.has('acronym') ? prev.acronym : term.acronym || '',
        platform: dirty.has('platform') ? prev.platform : term.platform || '',
        shortDefinition: dirty.has('shortDefinition') ? prev.shortDefinition : term.shortDefinition ?? '',
        longDefinition: dirty.has('longDefinition') ? prev.longDefinition : term.longDefinition,
        example: dirty.has('example') ? prev.example : term.example || '',
      };
      const unchanged =
        prev.term === next.term &&
        prev.acronym === next.acronym &&
        prev.platform === next.platform &&
        prev.shortDefinition === next.shortDefinition &&
        prev.longDefinition === next.longDefinition &&
        prev.example === next.example;
      return unchanged ? prev : next;
    });
  }, [term]);

  // AUTOSAVE DATA-INTEGRITY (Task 2-c, spec #33 — mismo patrón que
  // RichEditor/LabDetailEditor): el timer NUNCA captura valores; este ref
  // espeja los borradores en cada render y el flush lee los vigentes (el
  // viejo bug de guardar el estado con una pulsación de retraso es
  // estructuralmente imposible con esta forma).
  const latestDraftsRef = useRef(drafts);
  useEffect(() => {
    latestDraftsRef.current = drafts;
  });

  // El flush escribe SOLO los campos sucios con UNA llamada onUpdateTerm.
  // Lo sucio se limpia únicamente tras una escritura EXITOSA: si falla, el
  // hook marca 'error' y el próximo flush reescribe el MISMO parche.
  const flushSave = useCallback(async () => {
    const dirty = dirtyFieldsRef.current;
    if (dirty.size === 0) return; // nada sucio → nada que escribir
    const d = latestDraftsRef.current;
    const patch: Partial<Pick<GlossaryTerm, TermTextField>> = {};
    dirty.forEach((field) => {
      patch[field] = d[field];
    });
    await onUpdateTerm(term.id, patch);
    dirty.clear();
  }, [onUpdateTerm, term.id]);

  const { triggerAutoSave } = useDebouncedAutoSave(flushSave);

  /** Edita un campo de texto libre: toca el borrador local y arma el
   *  autoguardado (1500ms). Cero escrituras Dexie por pulsación. */
  const patchDraft = (field: TermTextField, value: string) => {
    setDrafts((prev) => ({ ...prev, [field]: value }));
    dirtyFieldsRef.current.add(field);
    triggerAutoSave();
  };

  // Effective categories of the selected term (array with legacy fallback)
  const termCategories = useMemo(() => {
    if (term.categories && term.categories.length > 0) return term.categories;
    return term.category ? [term.category] : [];
  }, [term]);

  // Helper to handle updating examples (acción discreta → escritura directa)
  const handleAddExample = () => {
    const currentExamples = term.examples || [];
    const newExample: GlossaryExample = {
      id: `ex-${Date.now()}`,
      title: `Ejemplo ${currentExamples.length + 1}`,
      content: '',
    };
    onUpdateTerm(term.id, {
      examples: [...currentExamples, newExample],
    });
  };

  const handleUpdateExample = (exampleId: string, updatedFields: Partial<GlossaryExample>) => {
    if (!term.examples) return;
    const nextExamples = term.examples.map((ex) =>
      ex.id === exampleId ? { ...ex, ...updatedFields } : ex
    );
    onUpdateTerm(term.id, { examples: nextExamples });
  };

  const handleRemoveExample = (exampleId: string) => {
    if (!term.examples) return;
    const nextExamples = term.examples.filter((ex) => ex.id !== exampleId);
    onUpdateTerm(term.id, { examples: nextExamples });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Term Header */}
      <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#262626]">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={drafts.term}
              onChange={(e) => patchDraft('term', e.target.value)}
              placeholder="Nombre del Término"
              className="text-2xl font-bold text-white font-mono bg-transparent outline-none flex-1 w-0 border-b border-transparent focus:border-blue-500/50"
            />
            <div className="flex items-center gap-1 bg-[#161616] px-2 py-1 rounded border border-[#262626]">
              <span className="text-[10px] font-bold text-[#858585] uppercase font-mono">Sigla:</span>
              <input
                type="text"
                value={drafts.acronym}
                onChange={(e) => patchDraft('acronym', e.target.value)}
                placeholder="ej. MITM"
                className="text-xs font-bold text-blue-400 font-mono bg-transparent outline-none w-20 uppercase placeholder:text-[#828282]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Platform selector */}
            <div className="flex items-center bg-[#161616] rounded px-2 py-1 border border-[#262626]">
              <select
                value={drafts.platform}
                onChange={(e) => patchDraft('platform', e.target.value)}
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

            {/* Categorías del término (checklist de lista maestra) */}
            <div className="flex flex-col gap-1 w-full">
              <button
                type="button"
                onClick={onToggleCategoryList}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#888] hover:text-blue-400 transition-colors"
              >
                <Tag className="w-3 h-3 text-blue-400" />
                <span>
                  Categorías {termCategories.length > 0 && `(${termCategories.length})`}
                </span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 ${isCategoryListOpen ? 'rotate-0' : '-rotate-90'}`}
                />
              </button>

              {/* Selected category badges (always visible) */}
              {termCategories.length > 0 && (
                <div className="flex items-center flex-wrap gap-1">
                  {termCategories.map((cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-mono"
                    >
                      <span className="truncate max-w-[160px]">{cat}</span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTerm(term.id, {
                            categories: termCategories.filter((c) => c !== cat),
                            category: termCategories.filter((c) => c !== cat)[0] || '',
                          })
                        }
                        className="text-blue-400/60 hover:text-red-400"
                        title="Quitar categoría"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Master checklist (same one used everywhere) */}
              {isCategoryListOpen && (
                <div className="w-full">
                  <CategoryTreeChecklist
                    categories={categories}
                    selectedCategories={termCategories}
                    onChange={(selected) =>
                      onUpdateTerm(term.id, {
                        categories: selected,
                        category: selected[0] || '',
                      })
                    }
                  />
                </div>
              )}
            </div>

            {term.sourceUrl && (
              <a
                href={term.sourceUrl.startsWith('http') ? term.sourceUrl : `https://${term.sourceUrl}`}
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
          onClick={() => onDeleteTerm(term.id)}
          className="p-1.5 rounded text-[#858585] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
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
          value={drafts.shortDefinition}
          onChange={(e) => patchDraft('shortDefinition', e.target.value)}
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
          value={drafts.longDefinition}
          onChange={(e) => patchDraft('longDefinition', e.target.value)}
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
        {term.examples && term.examples.length > 0 ? (
          <div className="space-y-2">
            {term.examples.map((ex, index) => (
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
                    className="text-[#858585] hover:text-red-400 p-1"
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
            value={drafts.example}
            onChange={(e) => patchDraft('example', e.target.value)}
            placeholder="ej. Comandos de configuración, headers HTTP..."
            className="w-full bg-[#161616] border border-[#262626] rounded p-2.5 text-xs text-blue-300 font-mono focus:outline-none focus:border-green-500/50 leading-relaxed"
          />
        )}
      </div>

      {/* Notes using this term */}
      <div className="pt-3 border-t border-[#262626] space-y-2">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#858585]">
          Usado en {notesUsingTerm.length} Apuntes Relacionados
        </h3>
        {notesUsingTerm.length === 0 ? (
          <p className="text-xs text-[#858585] italic">
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
                    <span className="text-[10px] text-[#858585]">
                      {note.platform} • {note.category}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3 h-3 text-[#858585] group-hover:text-blue-400 shrink-0 ml-2" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
