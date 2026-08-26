'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { FilePlus2, FileStack, Search, X, FileText } from 'lucide-react';
import { db } from '../db';
import type { Note } from '../types';

interface AddToNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingAdd: { title: string; contentHtml: string } | null;
  /** Create a brand-new top-level note with pendingAdd as its content. */
  onCreateNewNote: () => void;
  /** Append pendingAdd (with <hr/> + <h2>title</h2> separator) to an existing note. */
  onAppendToExistingNote: (noteId: string) => void;
}

/**
 * AddToNoteModal — BLOQUE 5 spec #4 ("selector entre nota existente o nueva").
 *
 * Tools like CVSS Calculator, File Hash Analyzer, Linux Permissions, etc.
 * call `useNoteStore.getState().enqueueNote(title, html)`. Instead of
 * immediately creating a new note (old behavior), this modal lets the user
 * pick between:
 *   1. "Crear nota nueva" → onCreateNewNote (preserves the old flow).
 *   2. "Añadir a nota existente" → pick a note from a searchable list, then
 *      onAppendToExistingNote(noteId) appends `<hr/><h2>title</h2>` + content.
 *
 * 100% offline — only reads `db.notes` (filtered by !isDeleted).
 * Visual style mirrors QuickCaptureModal: dark #0A0A0A bg, blue accent.
 *
 * Implementation note: the outer wrapper returns null when closed (or when
 * there is no pending add) so the inner content (and its local useState)
 * always mounts fresh on every open — no need to clear state via effect.
 */
export const AddToNoteModal: React.FC<AddToNoteModalProps> = (props) => {
  if (!props.isOpen || !props.pendingAdd) return null;
  return (
    <AddToNoteContent
      pendingAdd={props.pendingAdd}
      onClose={props.onClose}
      onCreateNewNote={props.onCreateNewNote}
      onAppendToExistingNote={props.onAppendToExistingNote}
    />
  );
};

const AddToNoteContent: React.FC<{
  pendingAdd: { title: string; contentHtml: string };
  onClose: () => void;
  onCreateNewNote: () => void;
  onAppendToExistingNote: (noteId: string) => void;
}> = ({ pendingAdd, onClose, onCreateNewNote, onAppendToExistingNote }) => {
  // 'choose' = show the two big action buttons.
  // 'pick'    = reveal the searchable list of existing notes.
  const [mode, setMode] = useState<'choose' | 'pick'>('choose');
  const [search, setSearch] = useState('');

  // Live list of all non-deleted notes (top-level + sub-pages alike).
  const allNotes: Note[] =
    useLiveQuery(
      () => db.notes.filter((n) => !n.isDeleted).toArray(),
      [],
      [] as Note[]
    ) || [];

  // Filter by title (case-insensitive substring). Sort: parents first, then alpha.
  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...allNotes].sort((a, b) => {
      const aParent = !!a.parentId;
      const bParent = !!b.parentId;
      if (aParent !== bParent) return aParent ? 1 : -1;
      return (a.title || '').localeCompare(b.title || '');
    });
    if (!q) return sorted;
    return sorted.filter((n) => (n.title || '').toLowerCase().includes(q));
  }, [allNotes, search]);

  // ESC closes the modal (mounted only when open, so safe to bind window keydown).
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Build a plain-text preview (strip HTML tags) and let line-clamp-3 truncate.
  const previewText = useMemo(() => {
    const html = pendingAdd.contentHtml || '';
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }, [pendingAdd.contentHtml]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-100">
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-3.5 border-b border-[#262626] flex items-center justify-between bg-[#0D0D0D]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded flex items-center justify-center bg-blue-500/10 text-blue-400 shrink-0">
              <FilePlus2 className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white">Añadir a nota</span>
              <span className="text-[10px] text-[#888] font-mono truncate">
                {pendingAdd.title}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#888] hover:text-white p-1 cursor-pointer shrink-0"
            title="Cerrar"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3.5 space-y-3">
          {/* Preview of the content being added */}
          <div className="bg-[#161616] border border-[#262626] rounded p-2.5">
            <p className="text-[10px] uppercase tracking-widest text-[#555] mb-1">
              Contenido a añadir
            </p>
            <p className="text-[11px] text-[#AAA] font-mono line-clamp-3 break-words">
              {previewText || '(contenido vacío)'}
            </p>
          </div>

          {/* Two big action buttons */}
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={onCreateNewNote}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4" />
              Crear nota nueva
            </button>
            <button
              type="button"
              onClick={() => setMode('pick')}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer border ${
                mode === 'pick'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                  : 'border-[#262626] bg-[#161616] text-[#CCC] hover:bg-[#1A1A1A] hover:text-white'
              }`}
            >
              <FileStack className="w-4 h-4" />
              Añadir a nota existente
            </button>
          </div>

          {/* Searchable list of existing notes (revealed after 'pick') */}
          {mode === 'pick' && (
            <div className="space-y-2">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#666] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por título..."
                  className="w-full bg-[#161616] border border-[#262626] rounded-md pl-8 pr-3 py-1.5 text-[11px] text-white placeholder:text-[#555] focus:outline-none focus:border-blue-500 transition-colors"
                  autoFocus
                />
              </div>

              {/* Notes list (max height + scroll, custom scrollbar via globals.css) */}
              <div className="max-h-64 overflow-y-auto">
                {filteredNotes.length === 0 ? (
                  <div className="text-center py-6 text-[11px] text-[#666]">
                    {search.trim()
                      ? 'Sin coincidencias.'
                      : 'No hay notas. Crea una nota nueva.'}
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {filteredNotes.map((n: Note) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => onAppendToExistingNote(n.id)}
                          className="w-full flex items-start gap-2 text-left px-2.5 py-2 rounded-md hover:bg-[#1A1A1A] border border-transparent hover:border-[#333] transition-colors cursor-pointer group"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#666] group-hover:text-blue-400 mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-white truncate">
                              {n.title || '(sin título)'}
                              {n.parentId && (
                                <span className="text-[10px] text-[#666] ml-1.5">
                                  · sub-página
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-[#666] font-mono truncate">
                              {n.platform || '—'} · {n.category || '—'}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#262626] flex items-center justify-between bg-[#0D0D0D]">
          <span className="text-[10px] text-[#555] font-mono">ESC para cerrar</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-[#888] hover:text-white hover:bg-[#161616] transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
