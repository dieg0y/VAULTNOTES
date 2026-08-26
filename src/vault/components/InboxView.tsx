import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Inbox as InboxIcon,
  FileText,
  BookOpen,
  Bookmark,
  Trash2,
  Check,
  Square,
  CheckSquare,
  Clock,
} from 'lucide-react';
import { db } from '../db';
import type { InboxItem } from '../db';
import type { ReferenceItem } from '../types';

interface InboxViewProps {
  onConvertToNote: (content: string, inboxItemId: string) => void;
  onConvertToGlossary: (content: string, inboxItemId: string) => void;
}

/**
 * Inbox view (BLOQUE 5 spec #17).
 * Lists unorganized InboxItems with convert/delete/mark-as-task actions.
 * 100% offline: reads/writes only local Dexie tables (inboxItems + references).
 *
 * Convert to Note / Glossary → opens NewItemModal with prefilled content via App.
 * Convert to Reference → creates a minimal ReferenceItem directly here.
 */
export const InboxView: React.FC<InboxViewProps> = ({
  onConvertToNote,
  onConvertToGlossary,
}) => {
  const allInbox = useLiveQuery(
    () => db.inboxItems.orderBy('createdAt').reverse().toArray(),
    [],
    [] as InboxItem[]
  ) || [];

  const [showConverted, setShowConverted] = useState(false);

  // By default: hide items where convertedTo is set (and isTask is false —
  // actionable tasks stay visible even if they were converted, per spec).
  const visible = useMemo(() => {
    if (showConverted) return allInbox;
    return allInbox.filter((i) => i.convertedTo === null || i.convertedTo === undefined || i.isTask);
  }, [allInbox, showConverted]);

  const fmtDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const handleConvertToNote = (item: InboxItem) => {
    const content = (item.content || '').trim();
    onConvertToNote(content, item.id);
  };

  const handleConvertToGlossary = (item: InboxItem) => {
    const content = (item.content || '').trim();
    onConvertToGlossary(content, item.id);
  };

  const handleConvertToReference = async (item: InboxItem) => {
    const content = (item.content || '').trim();
    const now = new Date().toISOString();
    const ref: ReferenceItem = {
      id: 'ref-' + Date.now(),
      type: 'link',
      title: content,
      url: '',
      description: 'Converted from Inbox',
      tags: ['inbox'],
      isFavorite: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await db.references.add(ref);
      await db.inboxItems.update(item.id, {
        convertedTo: 'reference',
        convertedAt: now,
      });
    } catch (e) {
      console.warn('InboxView: convert-to-reference failed:', e);
    }
  };

  const handleToggleTask = async (item: InboxItem) => {
    await db.inboxItems.update(item.id, {
      isTask: !item.isTask,
    });
  };

  const handleDelete = async (id: string) => {
    await db.inboxItems.delete(id);
  };

  const total = allInbox.length;
  const activeCount = allInbox.filter(
    (i) => i.convertedTo === null || i.convertedTo === undefined || i.isTask
  ).length;
  const taskCount = allInbox.filter((i) => i.isTask).length;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0A0A0A] h-[calc(100vh-48px)]">
      <div className="max-w-3xl mx-auto p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col gap-2 pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md flex items-center justify-center bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <InboxIcon className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-white tracking-tight">Inbox</h1>
              <p className="text-[11px] text-[#666] font-mono">
                {activeCount} activo{activeCount === 1 ? '' : 's'} · {total} en total · {taskCount} como tarea{taskCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <p className="text-xs text-[#888] leading-relaxed max-w-2xl">
            Captura rápida (Ctrl+Shift+Q) aterriza aquí. Convierte cada item en Apunte / Término / Referencia
            o márcalo como tarea accionable.
          </p>
        </div>

        {/* Toolbar: show converted toggle */}
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-[11px] text-[#888] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showConverted}
              onChange={(e) => setShowConverted(e.target.checked)}
              className="w-3.5 h-3.5 accent-blue-500 cursor-pointer"
            />
            <span>Mostrar convertidos ({total - activeCount})</span>
          </label>
          {total > 0 && (
            <span className="text-[10px] text-[#555] font-mono">Orden: más recientes primero</span>
          )}
        </div>

        {/* Empty state */}
        {visible.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-[#666] gap-3">
            <InboxIcon className="w-12 h-12 text-[#2a2a2a]" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-[#888]">Inbox vacío</p>
              <p className="text-xs text-[#666] max-w-md">
                Pulsa <kbd className="px-1 py-0.2 rounded bg-[#161616] border border-[#262626] text-[10px] font-mono text-[#888]">Ctrl+Shift+Q</kbd> desde cualquier vista para capturar una idea rápidamente.
              </p>
            </div>
          </div>
        )}

        {/* Item list */}
        <div className="flex flex-col gap-2.5">
          {visible.map((item) => {
            const converted = item.convertedTo;
            const isTask = !!item.isTask;
            return (
              <div
                key={item.id}
                className="bg-[#0D0D0D] border border-[#262626] rounded-md p-3.5 flex flex-col gap-2.5"
              >
                {/* Top row: content + badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm text-[#E5E5E5] leading-relaxed line-clamp-3 whitespace-pre-wrap break-words"
                      title={item.content}
                    >
                      {item.content}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {isTask && (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 flex items-center gap-1">
                        <Square className="w-2.5 h-2.5" fill="currentColor" />
                        Task
                      </span>
                    )}
                    {converted && (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border border-green-500/20 bg-green-500/10 text-green-400 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        → {converted}
                      </span>
                    )}
                  </div>
                </div>

                {/* Metadata row */}
                <div className="flex items-center gap-2 text-[10px] text-[#666] font-mono">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{fmtDate(item.createdAt)}</span>
                  {item.convertedAt && (
                    <span className="text-[#555]">· convertida {fmtDate(item.convertedAt)}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center flex-wrap gap-1.5 pt-1 border-t border-[#262626]">
                  <button
                    type="button"
                    onClick={() => handleConvertToNote(item)}
                    disabled={converted === 'note'}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 text-blue-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileText className="w-3 h-3" />
                    → Apunte
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConvertToGlossary(item)}
                    disabled={converted === 'glossary'}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/40 text-purple-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <BookOpen className="w-3 h-3" />
                    → Glosario
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConvertToReference(item)}
                    disabled={converted === 'reference'}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Bookmark className="w-3 h-3" />
                    → Referencia
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleTask(item)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                      isTask
                        ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-400'
                        : 'bg-[#161616] hover:bg-[#222] border-[#262626] text-[#DDD]'
                    }`}
                  >
                    {isTask ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                    {isTask ? 'Quitar Task' : 'Marcar Task'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(item.id)}
                    className="flex items-center gap-1 px-2 py-1 ml-auto rounded text-[11px] font-semibold bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Borrar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
