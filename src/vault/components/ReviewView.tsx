import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ListChecks, FileText, FlaskConical, BookOpen, ExternalLink, Check, Trash2, Clock, Inbox as InboxIcon } from 'lucide-react';
import { db } from '../db';
import type { ReviewItem, ReviewItemType } from '../db';
import type { Note, Lab, GlossaryTerm } from '../types';

interface ReviewViewProps {
  onSelectNote: (noteId: string) => void;
  onSelectLab: (labId: string) => void;
  onSelectGlossaryTerm: (termId: string) => void;
}

/**
 * Review Queue view (BLOQUE 5 spec #15).
 * Lists pending ReviewItems grouped by itemType (note/lab/glossary),
 * with [Open] [Mark Reviewed] [Remove from queue] actions.
 * 100% offline: reads/writes only the local Dexie `reviewItems` + content tables.
 *
 * No spaced repetition — just: pending → reviewed (nextReviewAt = now + 7 days).
 */
export const ReviewView: React.FC<ReviewViewProps> = ({
  onSelectNote,
  onSelectLab,
  onSelectGlossaryTerm,
}) => {
  const pending = useLiveQuery(
    () => db.reviewItems.where('status').equals('pending').toArray(),
    [],
    [] as ReviewItem[]
  ) || [];

  const reviewed = useLiveQuery(
    () => db.reviewItems.where('status').equals('reviewed').toArray(),
    [],
    [] as ReviewItem[]
  ) || [];

  // Lookup tables for resolving item titles
  const notes = useLiveQuery(() => db.notes.toArray(), [], [] as Note[]) || [];
  const labs = useLiveQuery(() => db.labs.toArray(), [], [] as Lab[]) || [];
  const terms = useLiveQuery(() => db.glossary.toArray(), [], [] as GlossaryTerm[]) || [];

  const [showReviewed, setShowReviewed] = useState(false);

  const resolveTitle = (item: ReviewItem): string => {
    if (item.itemType === 'note') {
      const n = notes.find((x) => x.id === item.itemId);
      return n ? n.title : '(Apunte eliminado)';
    }
    if (item.itemType === 'lab') {
      const l = labs.find((x) => x.id === item.itemId);
      return l ? l.title : '(Lab eliminado)';
    }
    const t = terms.find((x) => x.id === item.itemId);
    return t ? t.term : '(Término eliminado)';
  };

  // Group pending by itemType
  const grouped = useMemo(() => {
    const map: Record<ReviewItemType, ReviewItem[]> = {
      note: [],
      lab: [],
      glossary: [],
    };
    pending.forEach((r) => {
      map[r.itemType].push(r);
    });
    // Sort each group: oldest addedAt first (FIFO — most overdue first)
    (Object.keys(map) as ReviewItemType[]).forEach((k) => {
      map[k].sort((a, b) => a.addedAt.localeCompare(b.addedAt));
    });
    return map;
  }, [pending]);

  const handleOpen = (item: ReviewItem) => {
    if (item.itemType === 'note') onSelectNote(item.itemId);
    else if (item.itemType === 'lab') onSelectLab(item.itemId);
    else onSelectGlossaryTerm(item.itemId);
  };

  const handleMarkReviewed = async (item: ReviewItem) => {
    const next = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.reviewItems.update(item.id, {
      status: 'reviewed',
      nextReviewAt: next,
    });
  };

  const handleRemove = async (id: string) => {
    await db.reviewItems.delete(id);
  };

  const typeMeta = (t: ReviewItemType) => {
    switch (t) {
      case 'note':
        return {
          label: 'Apuntes',
          icon: <FileText className="w-3.5 h-3.5" />,
          color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        };
      case 'lab':
        return {
          label: 'Labs',
          icon: <FlaskConical className="w-3.5 h-3.5" />,
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        };
      case 'glossary':
        return {
          label: 'Glosario',
          icon: <BookOpen className="w-3.5 h-3.5" />,
          color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        };
    }
  };

  const fmtDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const renderRow = (item: ReviewItem) => {
    const meta = typeMeta(item.itemType);
    const title = resolveTitle(item);
    const isReviewed = item.status === 'reviewed';
    return (
      <div
        key={item.id}
        className="bg-[#0D0D0D] border border-[#262626] rounded-md p-3 flex flex-col gap-2"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${meta.color} border`}>
              {meta.icon}
            </div>
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <span className="text-sm font-medium text-white truncate" title={title}>
                {title}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${meta.color}`}>
                  {meta.label}
                </span>
                <span className="text-[10px] text-[#666] font-mono flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  Añadido {fmtDate(item.addedAt)}
                </span>
                {isReviewed && (
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border border-green-500/20 bg-green-500/10 text-green-400 flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" />
                    Revisado · próxima {fmtDate(item.nextReviewAt)}
                  </span>
                )}
                {!isReviewed && (
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border border-amber-500/20 bg-amber-500/10 text-amber-400">
                    Próxima {fmtDate(item.nextReviewAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => handleOpen(item)}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-[#161616] hover:bg-[#222] border border-[#262626] text-[#DDD] transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3 h-3" />
            Abrir
          </button>
          {!isReviewed && (
            <button
              type="button"
              onClick={() => void handleMarkReviewed(item)}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-green-500/10 hover:bg-green-500/20 border border-green-500/40 text-green-400 transition-colors cursor-pointer"
            >
              <Check className="w-3 h-3" />
              Marcar Revisado
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleRemove(item.id)}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-400 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            Quitar de la cola
          </button>
        </div>
      </div>
    );
  };

  const totalPending = pending.length;
  const totalReviewed = reviewed.length;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0A0A0A] h-[calc(100vh-48px)]">
      <div className="max-w-4xl mx-auto p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col gap-2 pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md flex items-center justify-center bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <ListChecks className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-white tracking-tight">Cola de Revisión</h1>
              <p className="text-[11px] text-[#666] font-mono">
                {totalPending} pendiente{totalPending === 1 ? '' : 's'} · {totalReviewed} revisado{totalReviewed === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <p className="text-xs text-[#888] leading-relaxed max-w-2xl">
            Marca apuntes, labs o términos del glosario con <span className="text-blue-400 font-medium">&quot;Revisar después&quot;</span> para añadirlos aquí.
            Sistema simple (sin repetición espaciada compleja): pending → reviewed, con fecha sugerida +7 días.
          </p>
        </div>

        {/* Empty state */}
        {totalPending === 0 && (!showReviewed || totalReviewed === 0) && (
          <div className="flex flex-col items-center justify-center py-16 text-[#666] gap-3">
            <InboxIcon className="w-12 h-12 text-[#2a2a2a]" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-[#888]">No hay items pendientes de revisión</p>
              <p className="text-xs text-[#666] max-w-md">
                Marca notas, labs o términos del glosario con &quot;Revisar después&quot; para añadirlos a la cola.
              </p>
            </div>
          </div>
        )}

        {/* Pending groups */}
        {(Object.keys(grouped) as ReviewItemType[]).map((k) => {
          const items = grouped[k];
          if (items.length === 0) return null;
          const meta = typeMeta(k);
          return (
            <section key={k} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded flex items-center justify-center ${meta.color} border`}>
                  {meta.icon}
                </span>
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#888]">
                  {meta.label}
                </h2>
                <span className="text-[10px] font-mono text-[#555]">{items.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.map(renderRow)}
              </div>
            </section>
          );
        })}

        {/* Reviewed toggle + list */}
        {totalReviewed > 0 && (
          <section className="flex flex-col gap-2.5 pt-4 border-t border-[#262626]">
            <button
              type="button"
              onClick={() => setShowReviewed((v) => !v)}
              className="flex items-center gap-2 text-xs font-semibold text-[#888] hover:text-white transition-colors cursor-pointer self-start"
            >
              <span className="w-5 h-5 rounded flex items-center justify-center bg-green-500/10 border border-green-500/20 text-green-400">
                <Check className="w-3 h-3" />
              </span>
              Revisados ({totalReviewed})
              <span className="text-[10px] font-mono text-[#555]">
                {showReviewed ? 'ocultar' : 'mostrar'}
              </span>
            </button>
            {showReviewed && (
              <div className="flex flex-col gap-2 opacity-70">
                {reviewed
                  .slice()
                  .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
                  .map(renderRow)}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
