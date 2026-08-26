/**
 * iocStore.ts — Cross-tool text hand-off for the IoC Extractor.
 *
 * VaultNotes is 100% offline. To let other tools (Log Parser, PowerShell
 * Analyzer, Command Line Analyzer, …) send detected IOCs into the existing
 * IoC Extractor without prop-drilling through ToolsView/App, we expose a
 * tiny zustand store. The IoC Extractor subscribes to `pendingText` — when
 * it becomes non-null, it seeds its own input state and clears the store.
 *
 * No data ever leaves the browser; this is purely in-memory state.
 */
import { create } from 'zustand';

export interface IocStore {
  pendingText: string | null;
  /** Set the text that should be loaded into the IoC Extractor.
   *  Passing null clears it (used by the consumer after picking it up). */
  setPendingText: (text: string | null) => void;
}

export const useIocStore = create<IocStore>((set) => ({
  pendingText: null,
  setPendingText: (text) => set({ pendingText: text }),
}));
