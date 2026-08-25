import React, { useState, useMemo } from 'react';
import {
  FileText,
  BookOpen,
  Brain,
  Star,
  Clock,
  Terminal,
  Globe,
  Cpu,
  Bug,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FolderOpen
} from 'lucide-react';
import { Note, Lab, GlossaryTerm } from '../types';
import confetti from 'canvas-confetti';

interface DashboardViewProps {
  notes: Note[];
  labs?: Lab[];
  glossary: GlossaryTerm[];
  onSelectNote: (noteId: string) => void;
  onSelectLab?: (labId: string) => void;
  onOpenNotesView: () => void;
  onOpenLabsView?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  notes,
  labs = [],
  glossary,
  onSelectNote,
  onSelectLab,
  onOpenNotesView,
  onOpenLabsView,
}) => {
  const activeNotes = useMemo(() => notes.filter((n) => !n.isDeleted), [notes]);
  const activeLabs = useMemo(() => labs.filter((l) => !l.isDeleted), [labs]);
  const activeGlossary = useMemo(() => glossary.filter((g) => !g.isDeleted), [glossary]);

  // Metrics
  const totalNotes = activeNotes.length;
  const totalTermsCount = activeGlossary.length;
  const completedLabsCount = activeLabs.filter((l) => l.status === 'Completado').length;
  const favoritesCount = activeNotes.filter((n) => n.isFavorite).length;

  // Last edited note or lab time
  const lastEditTime = useMemo(() => {
    const allItems = [
      ...activeNotes.map((n) => ({ updatedAt: n.updatedAt })),
      ...activeLabs.map((l) => ({ updatedAt: l.updatedAt }))
    ];
    if (allItems.length === 0) return 'Sin actividad';
    const sorted = [...allItems].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    const diffMs = Date.now() - new Date(sorted[0].updatedAt).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Justo ahora';
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
  }, [activeNotes, activeLabs]);

  // Recents (last 5 edited top-level notes, subpages excluded from this view)
  const recentNotes = useMemo(() => {
    return [...activeNotes]
      .filter((n) => !n.parentId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [activeNotes]);

  // Flashcards Study Deck — Glossary ONLY (10 random terms)
  const studyDeck = useMemo(() => {
    const combined = activeGlossary.map((g) => ({
      id: g.id,
      title: g.term,
      subtitle: g.platform || 'Glosario',
      front: g.term,
      back: `${g.shortDefinition || ''}\n\n${g.longDefinition || ''}${g.example ? `\n\nEjemplo: ${g.example}` : ''}`,
    }));

    // Shuffle and pick 10
    return combined.sort(() => 0.5 - Math.random()).slice(0, 10);
  }, [activeGlossary]);

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentCard = studyDeck[currentCardIndex];
  const remainingCount = studyDeck.length - currentCardIndex;

  const handleNextCard = (known: boolean) => {
    if (known) {
      setKnownCount((prev) => prev + 1);
    } else {
      setUnknownCount((prev) => prev + 1);
    }

    setIsFlipped(false);

    if (currentCardIndex + 1 >= studyDeck.length) {
      setIsCompleted(true);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });
    } else {
      setCurrentCardIndex((prev) => prev + 1);
    }
  };

  const handleRestartStudy = () => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setKnownCount(0);
    setUnknownCount(0);
    setIsCompleted(false);
  };

  // Helper for platform icons
  const getPlatformIcon = (platform: string) => {
    const p = (platform || '').toLowerCase();
    if (p.includes('htb') || p.includes('academy')) return <Terminal className="w-5 h-5 text-[#aec6ff]" />;
    if (p.includes('tryhackme') || p.includes('thm')) return <Globe className="w-5 h-5 text-[#4edea3]" />;
    if (p.includes('offsec') || p.includes('cisco')) return <Cpu className="w-5 h-5 text-[#d0bcff]" />;
    if (p.includes('portswigger') || p.includes('fortinet')) return <Bug className="w-5 h-5 text-[#4edea3]" />;
    return <FileText className="w-5 h-5 text-[#aec6ff]" />;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0A0A0A]">
      {/* 1. Top 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Notes */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 relative overflow-hidden group hover:border-blue-500/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
              Total Apuntes
            </span>
            <div className="w-7 h-7 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-white font-mono">{totalNotes}</span>
            {/* Sparkline visualization */}
            <svg className="w-14 h-7 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 20 L12 14 L22 18 L34 4 L44 12 L54 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Card 2: Glossary Terms */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 relative overflow-hidden group hover:border-purple-500/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
              Términos Glosario
            </span>
            <div className="w-7 h-7 rounded bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-white font-mono">{totalTermsCount}</span>
            <div className="relative w-7 h-7 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#262626]"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                />
                <path
                  className="text-purple-400"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray="65, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 3: Favorites */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 relative overflow-hidden group hover:border-green-500/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
              Favoritos
            </span>
            <div className="w-7 h-7 rounded bg-green-500/10 text-green-400 flex items-center justify-center">
              <Star className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-white font-mono">{favoritesCount}</span>
            {/* Mini Bar Chart */}
            <div className="flex items-end gap-1 h-6">
              <div className="w-1.5 h-2.5 bg-green-500/40 rounded-t-sm" />
              <div className="w-1.5 h-4.5 bg-green-500/60 rounded-t-sm" />
              <div className="w-1.5 h-1.5 bg-green-500/30 rounded-t-sm" />
              <div className="w-1.5 h-6 bg-green-500 rounded-t-sm" />
            </div>
          </div>
        </div>

        {/* Card 4: Last Edit */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 relative overflow-hidden group hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
              Última Edición
            </span>
            <div className="w-7 h-7 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-lg font-semibold text-white font-mono">{lastEditTime}</span>
          </div>
        </div>
      </div>

      {/* 2. Main Content Grid (Recents + Flashcards Study) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recents Column (2 Cols wide on desktop) */}
        <div className="lg:col-span-2 bg-[#0D0D0D] border border-[#262626] rounded-md p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-white">Apuntes Recientes</h2>
            </div>
            <button
              onClick={onOpenNotesView}
              className="text-xs font-medium text-blue-400 hover:underline flex items-center gap-1"
            >
              Ver todos ({totalNotes}) &rarr;
            </button>
          </div>

          <div className="flex flex-col gap-2 flex-1">
            {recentNotes.length === 0 ? (
              <div className="p-8 text-center text-[#666] flex flex-col items-center justify-center gap-2">
                <FolderOpen className="w-8 h-8 text-[#333]" />
                <span className="text-xs">Aún no tienes apuntes creados.</span>
              </div>
            ) : (
              recentNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note.id)}
                  className="group flex items-center justify-between p-3 rounded-md bg-[#161616] hover:bg-[#202020] border border-[#262626] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded bg-[#0D0D0D] border border-[#262626] flex items-center justify-center shrink-0">
                      {getPlatformIcon(note.platform)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 block truncate">
                        {note.platform} • {note.category}
                      </span>
                      <span className="font-semibold text-sm text-white group-hover:text-blue-400 transition-colors truncate block">
                        {note.title}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 ml-3">
                    {note.isFavorite && <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />}
                    <span className="text-xs font-mono text-[#666]">
                      {new Date(note.updatedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Flashcards Study Column (Glossary only) */}
        <div className="lg:col-span-1 bg-[#0D0D0D] border border-[#262626] rounded-md p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-green-400" />
              <h2 className="text-sm font-bold text-white">Flashcards de Glosario</h2>
            </div>
            {!isCompleted && studyDeck.length > 0 && (
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono text-[10px] font-semibold">
                {remainingCount} restantes
              </span>
            )}
          </div>

          {/* Flashcard Area */}
          {studyDeck.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#666]">
              <HelpCircle className="w-8 h-8 text-[#333] mb-2" />
              <p className="text-xs">Agrega términos al glosario para generar flashcards.</p>
            </div>
          ) : isCompleted ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">¡Sesión Completada!</h3>
                <p className="text-xs text-[#888] mt-1">
                  Dominados: <strong className="text-green-400">{knownCount}</strong> | Por repasar:{' '}
                  <strong className="text-red-400">{unknownCount}</strong>
                </p>
              </div>
              <button
                onClick={handleRestartStudy}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Estudiar otra tanda (10)
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              {/* 3D Flip Card */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="relative w-full h-56 perspective-1000 cursor-pointer my-2 select-none group"
              >
                <div
                  className={`w-full h-full transition-transform duration-500 transform-style-3d relative rounded-md ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}
                >
                  {/* Front Side */}
                  <div className="absolute inset-0 w-full h-full backface-hidden bg-[#161616] border border-[#262626] rounded-md p-5 flex flex-col items-center justify-center text-center shadow group-hover:border-blue-500/50 transition-colors">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded mb-2">
                      {currentCard?.subtitle || 'Término'}
                    </span>
                    <h3 className="text-base font-bold text-white leading-tight">
                      {currentCard?.front}
                    </h3>
                    <span className="absolute bottom-3 text-[10px] text-[#666] flex items-center gap-1">
                      Clic para girar &rarr;
                    </span>
                  </div>

                  {/* Back Side */}
                  <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-[#161616] border border-blue-500/50 rounded-md p-5 flex flex-col items-center justify-center text-center shadow overflow-y-auto">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-green-400 bg-green-500/10 px-2 py-0.5 rounded mb-2">
                      Definición / Respuesta
                    </span>
                    <p className="text-xs text-[#E5E5E5] leading-relaxed overflow-y-auto max-h-32">
                      {currentCard?.back}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Don't Know / Know it */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleNextCard(false)}
                  className="flex-1 py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  No me la sé
                </button>
                <button
                  onClick={() => handleNextCard(true)}
                  className="flex-1 py-2 px-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Me la sé
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
