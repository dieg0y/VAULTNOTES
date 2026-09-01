/**
 * noteStore.ts — Cross-tool "Add to Note" hand-off (BLOQUE 5 spec #4).
 *
 * VaultNotes is 100% offline. Tools (Log Parser, PowerShell Analyzer,
 * CVSS Calculator, File Hash Analyzer, Linux Permissions, …) call
 * `useNoteStore.getState().enqueueNote(title, html)` to stage a "add to
 * note" request. App.tsx subscribes to `pendingNote` — when it becomes
 * non-null, App opens the `<AddToNoteModal>` so the user can CHOOSE
 * between:
 *   1. "Crear nota nueva" — create a brand-new top-level note (old flow).
 *   2. "Añadir a nota existente" — append `<hr/><h2>title</h2>` + html
 *      to an existing note's `contentHtml`.
 *
 * The signature of `enqueueNote(title, contentHtml)` is preserved so the
 * 13 existing tool callers are NOT touched — only the downstream behavior
 * of "what happens after enqueueNote" changes (now opens a modal instead
 * of immediately creating a note).
 *
 * No data ever leaves the browser; this is purely in-memory state.
 */
import { create } from 'zustand';

interface PendingNote {
  /** Note title (plain text, used as the H1 for new notes or H2 when appended). */
  title: string;
  /** HTML body for the note — already wrapped in <p> or a <table> by the
   *  producer tool. The RichEditor stores HTML, so we accept HTML. */
  contentHtml: string;
}

interface NoteStore {
  pendingNote: PendingNote | null;
  /** Stage an "add to note" request. App.tsx opens AddToNoteModal when set.
   *  Signature kept stable for backward compat with the 13 existing callers. */
  enqueueNote: (title: string, contentHtml: string) => void;
  /** Clear the pending note (called by App.tsx after the modal resolves /
   *  is cancelled). Renamed in App as `clearPendingNote`. */
  clearPending: () => void;
}

export const useNoteStore = create<NoteStore>((set) => ({
  pendingNote: null,
  enqueueNote: (title, contentHtml) => set({ pendingNote: { title, contentHtml } }),
  clearPending: () => set({ pendingNote: null }),
}));
