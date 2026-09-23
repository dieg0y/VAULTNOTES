/**
 * socStore.ts — SOC / BLUE TEAM (v9 simulador) navigation hub.
 *
 * Hub de navegación del simulador de casos SOC (espejo del
 * helpdeskStore/sysadminStore). El contenido vive en la tabla Dexie
 * `socTickets` (seeds soc-001..050 + casos propios) y la vista (SocView)
 * lo lee con useLiveQuery — este store NO replica datos, solo coordina
 * cross-view deep-links:
 *
 *  - `selectTicket(id)` + `navigateRequest` → cualquier vista (p. ej. la
 *    tarjeta del Dashboard o el roadmap SOC) puede pedir "abre la
 *    sección SOC con el caso X seleccionado". App.tsx consume el request
 *    (one-shot, sin loops) igual que los otros dos simuladores.
 *
 * 100% offline — nada de red, nada de contenido: solo ids de navegación.
 */
import { create } from 'zustand';

interface SocStore {
  /** Timestamp de un request pendiente "navega al SOC" (0 = ninguno). */
  navigateRequest: number;
  /** Id del caso a seleccionar al llegar a la vista (null = sin selección). */
  selectedTicketId: string | null;
  /** Pide a App.tsx cambiar a la sección soc (one-shot). */
  requestNavigate: () => void;
  consumeNavigate: () => void;
  /** Selecciona un caso (la vista lo usa como estado de selección). */
  selectTicket: (ticketId: string) => void;
  clearSelectedTicket: () => void;
}

export const useSocStore = create<SocStore>((set) => ({
  navigateRequest: 0,
  selectedTicketId: null,

  requestNavigate: () => set({ navigateRequest: Date.now() }),

  consumeNavigate: () => set({ navigateRequest: 0 }),

  selectTicket: (ticketId) => set({ selectedTicketId: ticketId }),

  clearSelectedTicket: () => set({ selectedTicketId: null }),
}));
