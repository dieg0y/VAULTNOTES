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
  FolderOpen,
  // BLOQUE 5 — extra icons for the 5 dashboard sections
  FlaskConical,
  Bookmark,
  ListChecks,
  AlertTriangle,
  History,
  Plus,
  Network,
  Briefcase,
  Activity,
  Crosshair,
} from 'lucide-react';
import { Note, Lab, GlossaryTerm, ActiveSection } from '../types';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useToolFavorites, useToolRecents } from '../hooks/useToolPrefs';
import { findToolById } from '../data/toolsCatalog';
import confetti from 'canvas-confetti';

interface DashboardViewProps {
  notes: Note[];
  labs?: Lab[];
  glossary: GlossaryTerm[];
  onSelectNote: (noteId: string) => void;
  onSelectLab?: (labId: string) => void;
  onOpenNotesView: () => void;
  onOpenLabsView?: () => void;
  // BLOQUE 5 — Quick Actions wiring (all optional so existing callers
  // don't break; the dashboard falls back to legacy handlers when these
  // aren't provided).
  onSelectSection?: (section: ActiveSection) => void;
  onOpenNewItem?: (tab: 'note' | 'lab' | 'glossary') => void;
  onOpenTool?: (toolId: string) => void;
}

interface SmartCard {
  id: string;
  title: string;
  subtitle: string;
  front: string;
  back: string;
  priority: number;
  known: number;
  unknown: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  notes,
  labs = [],
  glossary,
  onSelectNote,
  onSelectLab,
  onOpenNotesView,
  onOpenLabsView,
  onSelectSection,
  onOpenNewItem,
  onOpenTool,
}) => {
  const activeNotes = useMemo(() => notes.filter((n) => !n.isDeleted), [notes]);
  const activeLabs = useMemo(() => labs.filter((l) => !l.isDeleted), [labs]);
  const activeGlossary = useMemo(() => glossary.filter((g) => !g.isDeleted), [glossary]);

  /* --------------------------------------------------------------- *
   * Section 1 — Knowledge counts
   * --------------------------------------------------------------- */
  const totalNotes = activeNotes.filter((n) => !n.parentId).length;
  const totalLabs = activeLabs.length;
  const totalTerms = activeGlossary.length;
  // References count via Dexie live query (only !isDeleted rows).
  const referencesCount =
    useLiveQuery(
      async () => db.references.filter((r) => !r.isDeleted).count(),
      [],
      0
    ) ?? 0;

  /* --------------------------------------------------------------- *
   * Section 2 — Learning
   * --------------------------------------------------------------- */
  // Items pending in the review queue.
  const reviewPendingCount =
    useLiveQuery(
      async () => db.reviewItems.where('status').equals('pending').count(),
      [],
      0
    ) ?? 0;

  // Weak concepts — glossary terms with low flashcard stability (or no
  // study history yet). Falls back to "Coming soon" if there are zero stats.
  const flashcardStats = useLiveQuery(() => db.flashcardStats.toArray(), []);
  const statsLoaded = flashcardStats !== undefined;
  const weakConcepts = useMemo(() => {
    const stats = flashcardStats || [];
    if (stats.length === 0) return [] as { termId: string; lapses: number; stability: number }[];
    // "Weak" = lapses > 0 OR stability < 1.5 days (FSRS-lite).
    return stats
      .filter((s) => s.lapses > 0 || (s.stability !== undefined && s.stability < 1.5))
      .sort((a, b) => (b.lapses || 0) - (a.lapses || 0))
      .slice(0, 5)
      .map((s) => ({ termId: s.termId, lapses: s.lapses || 0, stability: s.stability || 0 }));
  }, [flashcardStats]);

  // Recent labs — 3 most recently updated.
  const recentLabs = useMemo(() => {
    return [...activeLabs]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  }, [activeLabs]);

  /* --------------------------------------------------------------- *
   * Section 3 — Tools (favorites + recents)
   * --------------------------------------------------------------- */
  const favorites = useToolFavorites();
  const recents = useToolRecents(5);

  const favoriteTools = useMemo(
    () =>
      favorites
        .slice(0, 8)
        .map((f) => findToolById(f.toolId))
        .filter((t): t is NonNullable<typeof t> => Boolean(t)),
    [favorites]
  );
  const recentTools = useMemo(
    () =>
      recents
        .slice(0, 5)
        .map((r) => findToolById(r.toolId))
        .filter((t): t is NonNullable<typeof t> => Boolean(t)),
    [recents]
  );

  /* --------------------------------------------------------------- *
   * Section 5 — Recent Activity (last 5 across notes/labs/glossary)
   * --------------------------------------------------------------- */
  type ActivityItem =
    | { kind: 'note'; id: string; title: string; updatedAt: string; platform: string }
    | { kind: 'lab'; id: string; title: string; updatedAt: string; organization: string }
    | { kind: 'glossary'; id: string; title: string; updatedAt: string; platform: string };

  const recentActivity = useMemo<ActivityItem[]>(() => {
    const noteItems: ActivityItem[] = activeNotes
      .filter((n) => !n.parentId)
      .map((n) => ({
        kind: 'note' as const,
        id: n.id,
        title: n.title,
        updatedAt: n.updatedAt,
        platform: n.platform,
      }));
    const labItems: ActivityItem[] = activeLabs.map((l) => ({
      kind: 'lab' as const,
      id: l.id,
      title: l.title,
      updatedAt: l.updatedAt,
      organization: l.organization,
    }));
    const termItems: ActivityItem[] = activeGlossary.map((g) => ({
      kind: 'glossary' as const,
      id: g.id,
      title: g.term,
      updatedAt: g.updatedAt,
      platform: g.platform || '',
    }));
    return [...noteItems, ...labItems, ...termItems]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [activeNotes, activeLabs, activeGlossary]);

  // Last edit time (relative) — reused in the Knowledge "Last Edit" mini-card.
  const lastEditTime = useMemo(() => {
    if (recentActivity.length === 0) return 'Sin actividad';
    const sorted = [...recentActivity].sort(
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
  }, [recentActivity]);

  // Relative time formatter for recent activity rows.
  const relTime = (iso: string): string => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  /* --------------------------------------------------------------- *
   * Flashcards study deck — preserved (BLOQUE 5 — bonus, kept as-is)
   * --------------------------------------------------------------- */
  const statsByTerm = useMemo(
    () => new Map((flashcardStats || []).map((s) => [s.termId, s])),
    [flashcardStats]
  );

  const smartDeck = useMemo<SmartCard[]>(() => {
    const now = Date.now();
    const cards = activeGlossary.map((g) => {
      const stat = statsByTerm.get(g.id);
      const known = stat?.knownCount || 0;
      const unknown = stat?.unknownCount || 0;
      const last = stat?.lastStudiedAt ? new Date(stat.lastStudiedAt).getTime() : 0;
      const daysSince = last ? (now - last) / 86400000 : 999;
      const mastery = known - unknown * 2;
      const priority =
        -mastery +
        Math.min(daysSince, 21) * 0.8 +
        (last === 0 ? 15 : 0) +
        unknown * 1.5;
      return {
        id: g.id,
        title: g.term,
        subtitle: g.platform || 'Glosario',
        front: g.term,
        back: `${g.shortDefinition || ''}\n\n${g.longDefinition || ''}${g.example ? `\n\nEjemplo: ${g.example}` : ''}`,
        priority,
        known,
        unknown,
      };
    });
    return cards.sort((a, b) => b.priority - a.priority).slice(0, 10);
  }, [activeGlossary, statsByTerm]);

  const [sessionKey, setSessionKey] = useState(0);
  const [frozenDeck, setFrozenDeck] = useState<{ key: number; deck: SmartCard[] } | null>(null);
  if (statsLoaded && smartDeck.length > 0 && (!frozenDeck || frozenDeck.key !== sessionKey)) {
    setFrozenDeck({ key: sessionKey, deck: smartDeck });
  }
  const studyDeck: SmartCard[] = frozenDeck ? frozenDeck.deck : smartDeck;

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentCard = studyDeck[currentCardIndex];
  const remainingCount = studyDeck.length - currentCardIndex;

  const handleNextCard = async (known: boolean) => {
    if (known) {
      setKnownCount((prev) => prev + 1);
    } else {
      setUnknownCount((prev) => prev + 1);
    }

    if (currentCard) {
      try {
        const stat = statsByTerm.get(currentCard.id);
        const prevStability = stat?.stability || 0;
        const prevDifficulty = stat?.difficulty || 5;
        const prevReps = stat?.reps || 0;
        const prevLapses = stat?.lapses || 0;
        const newReps = prevReps + 1;
        const newDifficulty = known
          ? Math.max(1, prevDifficulty - 0.5)
          : Math.min(10, prevDifficulty + 1);
        const newStability = known
          ? Math.max(1, prevStability === 0 ? 1 : prevStability * (1.5 + (10 - newDifficulty) * 0.1))
          : 0;
        const newLapses = known ? prevLapses : prevLapses + 1;
        const now = new Date();
        const due = new Date(now);
        due.setDate(due.getDate() + Math.ceil(newStability));
        await db.flashcardStats.put({
          id: currentCard.id,
          termId: currentCard.id,
          knownCount: (stat?.knownCount || 0) + (known ? 1 : 0),
          unknownCount: (stat?.unknownCount || 0) + (known ? 0 : 1),
          lastStudiedAt: now.toISOString(),
          stability: newStability,
          difficulty: newDifficulty,
          due: due.toISOString(),
          reps: newReps,
          lapses: newLapses,
        });
      } catch (err) {
        console.warn('Failed to persist flashcard stat:', err);
      }
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
    setSessionKey((prev) => prev + 1);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setKnownCount(0);
    setUnknownCount(0);
    setIsCompleted(false);
  };

  // Helper for platform icons (recents/labs rows reuse it)
  const getPlatformIcon = (platform: string) => {
    const p = (platform || '').toLowerCase();
    if (p.includes('htb') || p.includes('academy')) return <Terminal className="w-5 h-5 text-[#aec6ff]" />;
    if (p.includes('tryhackme') || p.includes('thm')) return <Globe className="w-5 h-5 text-[#4edea3]" />;
    if (p.includes('offsec') || p.includes('cisco')) return <Cpu className="w-5 h-5 text-[#d0bcff]" />;
    if (p.includes('portswigger') || p.includes('fortinet')) return <Bug className="w-5 h-5 text-[#4edea3]" />;
    return <FileText className="w-5 h-5 text-[#aec6ff]" />;
  };

  /* --------------------------------------------------------------- *
   * Quick Actions dispatch helpers — fall back to legacy handlers
   * (onSelectSection/onOpenNotesView/...) when the new optional props
   * aren't provided (preserves backward compat with the existing call
   * site in App.tsx).
   * --------------------------------------------------------------- */
  const handleQuickNew = (tab: 'note' | 'lab' | 'glossary') => {
    if (onOpenNewItem) {
      onOpenNewItem(tab);
    } else if (tab === 'note' && onOpenNotesView) {
      onOpenNotesView();
    } else if (tab === 'lab' && onOpenLabsView) {
      onOpenLabsView();
    } else if (onSelectSection) {
      onSelectSection(tab === 'note' ? 'notes' : tab === 'lab' ? 'labs' : 'glossary');
    }
  };
  const handleQuickIOC = () => {
    if (onOpenTool) {
      onOpenTool('ioc');
    } else if (onSelectSection) {
      onSelectSection('tools');
    }
  };
  const handleOpenReview = () => {
    if (onSelectSection) onSelectSection('review');
  };
  const handleOpenTools = () => {
    if (onSelectSection) onSelectSection('tools');
  };
  const handleOpenGlossary = () => {
    if (onSelectSection) onSelectSection('glossary');
  };

  // Tool icon (per catalog id) — small inline dispatcher matching the
  // catalog's lucide icon family (avoid a big switch by reusing a map).
  const renderToolIcon = (toolId: string) => {
    switch (toolId) {
      case 'subnet': return <Cpu className="w-3.5 h-3.5" />;
      case 'ports': return <Globe className="w-3.5 h-3.5" />;
      case 'jwt': return <FileText className="w-3.5 h-3.5" />;
      case 'winevent': return <Bug className="w-3.5 h-3.5" />;
      case 'ioc': return <Network className="w-3.5 h-3.5" />;
      case 'cron': return <Clock className="w-3.5 h-3.5" />;
      case 'mitre': return <Crosshair className="w-3.5 h-3.5" />;
      case 'sigma': return <BookOpen className="w-3.5 h-3.5" />;
      default: return <Star className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0A0A0A]">
      {/* ============================================================ */}
      {/* SECTION 1 — KNOWLEDGE                                        */}
      {/* ============================================================ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Knowledge</h2>
          </div>
          <span className="text-[10px] font-mono text-[#555]">Vault local · 100% offline</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Notes */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 hover:border-blue-500/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Apuntes</span>
              <div className="w-7 h-7 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-white font-mono">{totalNotes}</span>
              <svg className="w-14 h-7 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 20 L12 14 L22 18 L34 4 L44 12 L54 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          {/* Labs */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 hover:border-green-500/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Labs</span>
              <div className="w-7 h-7 rounded bg-green-500/10 text-green-400 flex items-center justify-center">
                <FlaskConical className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-white font-mono">{totalLabs}</span>
              <div className="flex items-end gap-1 h-6">
                <div className="w-1.5 h-2.5 bg-green-500/40 rounded-t-sm" />
                <div className="w-1.5 h-4.5 bg-green-500/60 rounded-t-sm" />
                <div className="w-1.5 h-1.5 bg-green-500/30 rounded-t-sm" />
                <div className="w-1.5 h-6 bg-green-500 rounded-t-sm" />
              </div>
            </div>
          </div>
          {/* Glossary */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 hover:border-purple-500/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Glosario</span>
              <div className="w-7 h-7 rounded bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-white font-mono">{totalTerms}</span>
              <div className="relative w-7 h-7 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-[#262626]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
                  <path className="text-purple-400" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="65, 100" strokeWidth="3.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
          {/* References */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 hover:border-amber-500/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Referencias</span>
              <div className="w-7 h-7 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Bookmark className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-white font-mono">{referencesCount}</span>
              <span className="text-[10px] font-mono text-[#555]">{lastEditTime}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 2 — LEARNING                                         */}
      {/* ============================================================ */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-green-400" />
          <h2 className="text-sm font-bold text-white">Learning</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Items to Review */}
          <div
            className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 flex flex-col cursor-pointer hover:border-blue-500/40 transition-colors"
            onClick={handleOpenReview}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Items to Review</span>
              <ListChecks className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-white font-mono">{reviewPendingCount}</span>
              <span className="text-[10px] text-[#666]">{reviewPendingCount === 1 ? 'cola' : 'cola'}</span>
            </div>
            <p className="text-[10px] text-[#666] mt-2 leading-relaxed">
              {reviewPendingCount > 0
                ? 'Tienes contenido marcado para repasar. Abre Revisión para continuar.'
                : 'Sin items pendientes — marca “Revisar después” en cualquier apunte/lab/término.'}
            </p>
          </div>

          {/* Weak Concepts */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Weak Concepts</span>
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            </div>
            {weakConcepts.length === 0 ? (
              <div className="flex-1 flex flex-col items-start justify-center">
                <span className="text-2xl font-bold text-white font-mono">—</span>
                <p className="text-[10px] text-[#666] mt-2 leading-relaxed">
                  Coming soon — estudia flashcards de glosario para que VaultNotes detecte los términos que fallas más.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-1 max-h-32 overflow-y-auto">
                {weakConcepts.map((w) => {
                  const term = activeGlossary.find((g) => g.id === w.termId);
                  if (!term) return null;
                  return (
                    <button
                      key={w.termId}
                      onClick={() => onSelectSection?.('glossary')}
                      className="flex items-center justify-between gap-2 text-[11px] text-left hover:text-blue-400 transition-colors"
                      title={`${w.lapses} lapses · stability ${w.stability.toFixed(1)}d`}
                    >
                      <span className="truncate text-white">{term.term}</span>
                      <span className="font-mono text-[10px] text-red-400/80 shrink-0">{w.lapses}× ✗</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Labs */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Recent Labs</span>
              <FlaskConical className="w-3.5 h-3.5 text-green-400" />
            </div>
            {recentLabs.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-[11px] text-[#666]">Sin labs todavía.</span>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-1">
                {recentLabs.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => (onSelectLab ? onSelectLab(l.id) : onOpenLabsView?.())}
                    className="flex items-center justify-between gap-2 text-[11px] text-left hover:text-blue-400 transition-colors"
                  >
                    <span className="truncate text-white">{l.title}</span>
                    <span className="font-mono text-[10px] text-[#555] shrink-0">{relTime(l.updatedAt)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 3 — TOOLS (favorites + recents)                      */}
      {/* ============================================================ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Tools</h2>
          </div>
          {onSelectSection && (
            <button
              onClick={handleOpenTools}
              className="text-xs font-medium text-blue-400 hover:underline flex items-center gap-1"
            >
              Ver todas →
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Favorites */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/70 flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-500/70" /> Favorite Tools
              </span>
              <span className="text-[10px] font-mono text-[#555]">{favoriteTools.length}</span>
            </div>
            {favoriteTools.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-4 text-center">
                <Star className="w-6 h-6 text-[#333] mb-1.5" />
                <p className="text-[11px] text-[#666]">Marca herramientas con ★ para tenerlas a mano.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {favoriteTools.map((t) => (
                  <button
                    key={`fav-${t.id}`}
                    onClick={() => (onOpenTool ? onOpenTool(t.id) : handleOpenTools())}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold bg-[#161616] border border-[#262626] text-[#DDD] hover:bg-[#222] hover:border-blue-500/40 hover:text-blue-400 transition-colors cursor-pointer"
                    title={t.desc}
                  >
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {renderToolIcon(t.id)}
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recently Used */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#555] flex items-center gap-1">
                <History className="w-3 h-3" /> Recently Used
              </span>
              <span className="text-[10px] font-mono text-[#555]">{recentTools.length}</span>
            </div>
            {recentTools.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-4 text-center">
                <History className="w-6 h-6 text-[#333] mb-1.5" />
                <p className="text-[11px] text-[#666]">Aún no has usado ninguna herramienta.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {recentTools.map((t, idx) => (
                  <button
                    key={`rec-${t.id}`}
                    onClick={() => (onOpenTool ? onOpenTool(t.id) : handleOpenTools())}
                    className="flex items-center gap-2 px-2 py-1.5 rounded text-[11px] hover:bg-[#161616] hover:text-white transition-colors cursor-pointer text-left"
                    title={t.desc}
                  >
                    <span className="font-mono text-[9px] text-[#444] w-3 shrink-0">{idx + 1}</span>
                    {renderToolIcon(t.id)}
                    <span className="truncate text-[#DDD]">{t.name}</span>
                    <span className="ml-auto text-[9px] font-mono text-[#555] shrink-0">{t.cat}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 4 — QUICK ACTIONS                                    */}
      {/* ============================================================ */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Plus className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => handleQuickNew('note')}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-md bg-[#0D0D0D] border border-[#262626] hover:border-blue-500/40 hover:bg-[#161616] transition-colors group cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-white">+ Note</span>
            <span className="text-[9px] text-[#666] font-mono">Ctrl+Shift+N</span>
          </button>
          <button
            onClick={() => handleQuickNew('lab')}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-md bg-[#0D0D0D] border border-[#262626] hover:border-green-500/40 hover:bg-[#161616] transition-colors group cursor-pointer"
          >
            <FlaskConical className="w-4 h-4 text-green-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-white">+ Lab</span>
            <span className="text-[9px] text-[#666] font-mono">Ctrl+Shift+L</span>
          </button>
          <button
            onClick={() => handleQuickNew('glossary')}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-md bg-[#0D0D0D] border border-[#262626] hover:border-purple-500/40 hover:bg-[#161616] transition-colors group cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-white">+ Glossary</span>
            <span className="text-[9px] text-[#666] font-mono">Glosario</span>
          </button>
          <button
            onClick={handleQuickIOC}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-md bg-[#0D0D0D] border border-[#262626] hover:border-amber-500/40 hover:bg-[#161616] transition-colors group cursor-pointer"
          >
            <Network className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-white">+ IOC</span>
            <span className="text-[9px] text-[#666] font-mono">IoC Extractor</span>
          </button>
          <button
            disabled
            title="Coming soon"
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-md bg-[#0D0D0D] border border-[#1a1a1a] text-[#555] cursor-not-allowed opacity-60"
          >
            <Briefcase className="w-4 h-4" />
            <span className="text-xs font-semibold">+ Case</span>
            <span className="text-[9px] font-mono">Coming soon</span>
          </button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 5 — RECENT ACTIVITY                                  */}
      {/* ============================================================ */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white">Recent Activity</h2>
          <span className="text-[10px] font-mono text-[#555]">últimos 5</span>
        </div>
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-3">
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-[#666] flex flex-col items-center justify-center gap-2">
              <FolderOpen className="w-8 h-8 text-[#333]" />
              <span className="text-xs">Aún no tienes contenido. Empieza con un Quick Action arriba.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentActivity.map((item) => {
                const icon =
                  item.kind === 'note' ? (
                    <div className="w-8 h-8 rounded bg-[#0D0D0D] border border-[#262626] flex items-center justify-center shrink-0">
                      {getPlatformIcon(item.kind === 'note' ? item.platform : '')}
                    </div>
                  ) : item.kind === 'lab' ? (
                    <div className="w-8 h-8 rounded bg-[#0D0D0D] border border-[#262626] flex items-center justify-center shrink-0">
                      <FlaskConical className="w-4 h-4 text-green-400" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded bg-[#0D0D0D] border border-[#262626] flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4 text-purple-400" />
                    </div>
                  );
                const kindBadge =
                  item.kind === 'note' ? (
                    <span className="text-[9px] font-mono uppercase tracking-wider text-blue-400">Apunte</span>
                  ) : item.kind === 'lab' ? (
                    <span className="text-[9px] font-mono uppercase tracking-wider text-green-400">Lab</span>
                  ) : (
                    <span className="text-[9px] font-mono uppercase tracking-wider text-purple-400">Glosario</span>
                  );
                const onClick =
                  item.kind === 'note'
                    ? () => onSelectNote(item.id)
                    : item.kind === 'lab'
                    ? () => (onSelectLab ? onSelectLab(item.id) : onOpenLabsView?.())
                    : () => (onSelectSection ? onSelectSection('glossary') : undefined);
                return (
                  <button
                    key={`${item.kind}-${item.id}`}
                    onClick={onClick}
                    className="group flex items-center justify-between p-2 rounded-md bg-[#161616] hover:bg-[#202020] border border-[#262626] transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {icon}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          {kindBadge}
                          {item.kind === 'note' && (
                            <span className="text-[9px] font-mono text-[#555] truncate">{item.platform}</span>
                          )}
                          {item.kind === 'lab' && (
                            <span className="text-[9px] font-mono text-[#555] truncate">{item.organization}</span>
                          )}
                        </div>
                        <span className="font-semibold text-sm text-white group-hover:text-blue-400 transition-colors truncate block">
                          {item.title}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-[#666] shrink-0 ml-2">{relTime(item.updatedAt)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ============================================================ */}
      {/* BONUS — Flashcards Study (preserved from the original layout) */}
      {/* ============================================================ */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-green-400" />
          <h2 className="text-sm font-bold text-white">Flashcards de Glosario</h2>
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400"
            title="Prioriza los términos que fallas más o no has visto recientemente"
          >
            SMART
          </span>
          {!isCompleted && studyDeck.length > 0 && (
            <span className="ml-auto bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono text-[10px] font-semibold">
              {remainingCount} restantes
            </span>
          )}
        </div>

        {studyDeck.length === 0 ? (
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-5 flex flex-col items-center justify-center text-center text-[#666]">
            <HelpCircle className="w-8 h-8 text-[#333] mb-2" />
            <p className="text-xs">Agrega términos al glosario para generar flashcards.</p>
            <button
              onClick={handleOpenGlossary}
              className="mt-3 text-[11px] text-blue-400 hover:underline"
            >
              Abrir Glosario →
            </button>
          </div>
        ) : isCompleted ? (
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-5 flex flex-col items-center justify-center text-center space-y-3">
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
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-5 flex flex-col gap-3">
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="relative w-full h-56 perspective-1000 cursor-pointer select-none group"
            >
              <div
                className={`w-full h-full transition-transform duration-500 transform-style-3d relative rounded-md ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* Front */}
                <div className="absolute inset-0 w-full h-full backface-hidden bg-[#161616] border border-[#262626] rounded-md p-5 flex flex-col items-center justify-center text-center shadow group-hover:border-blue-500/50 transition-colors">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded mb-2">
                    {currentCard?.subtitle || 'Término'}
                  </span>
                  <h3 className="text-base font-bold text-white leading-tight">
                    {currentCard?.front}
                  </h3>
                  {(currentCard?.known || 0) + (currentCard?.unknown || 0) > 0 && (
                    <span className="absolute top-2.5 right-2.5 flex items-center gap-1.5 text-[9px] font-mono">
                      <span className="text-green-400">✓ {currentCard?.known || 0}</span>
                      <span className="text-red-400">✗ {currentCard?.unknown || 0}</span>
                    </span>
                  )}
                  <span className="absolute bottom-3 text-[10px] text-[#666]">
                    Clic para girar →
                  </span>
                </div>
                {/* Back */}
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
            <div className="flex items-center gap-2 pt-1">
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
      </section>
    </div>
  );
};
