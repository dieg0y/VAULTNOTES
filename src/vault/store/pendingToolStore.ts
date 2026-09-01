/**
 * pendingToolStore.ts — Zustand store para navegación cross-tool entre herramientas de VaultNotes.
 *
 * Mientras que `pendingTool` (prop de App.tsx → ToolsView) se usa para deep-links
 * desde el buscador global Ctrl+K, este store permite que cualquier herramienta
 * dispare navegación a otra (ej: MITRE → Sigma, Windows Event → Detection Query)
 * sin prop-drilling.
 *
 * Patrón:
 *   1. Herramienta A: `usePendingToolStore.getState().setPending({ toolId: 'sigma', entryId: 'rule-id' })`
 *   2. ToolsView se suscribe y consume, renderiza herramienta B con autoOpenId
 *   3. ToolsView llama `clear()` después de consumir
 *
 * `toolId` se tipa como string para evitar dependencia circular con ToolsView;
 * ToolsView valida/castea en runtime.
 *
 * 100% offline. Sin dependencias externas.
 */
import { create } from 'zustand';

interface PendingTool {
  /** ID de la herramienta destino (debe matchear un ToolId de ToolsView). */
  toolId: string;
  /** Opcional: ID de entrada a pre-seleccionar (ej: ID de técnica MITRE o regla Sigma). */
  entryId?: string | number;
}

interface PendingToolStore {
  pending: PendingTool | null;
  /** Dispara navegación a otra herramienta con un ID opcional. */
  setPending: (p: PendingTool) => void;
  /** Limpia el pending (llamar después de consumir). */
  clear: () => void;
}

export const usePendingToolStore = create<PendingToolStore>((set) => ({
  pending: null,
  setPending: (p) => set({ pending: p }),
  clear: () => set({ pending: null }),
}));
