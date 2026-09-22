/**
 * helpdeskStore.ts — SERVICE DESK (v19) navigation hub.
 *
 * Hub de navegación del simulador de tickets HelpDesk. El contenido vive en
 * la tabla Dexie `helpdeskTickets` (seeds hdt-001..048 + tickets propios)
 * y la vista (HelpDeskView) lo lee con useLiveQuery — este store NO
 * replica datos, solo coordina cross-view deep-links:
 *
 *  - `selectTicket(id)` + `navigateRequest` → cualquier vista (p. ej. la
 *    tarjeta del Dashboard o el roadmap HelpDesk) puede pedir "abre la
 *    sección Service Desk con el ticket X seleccionado". App.tsx consume
 *    el request (one-shot, sin loops) igual que el intelStore de Data &
 *    Intel.
 *
 * 100% offline — nada de red, nada de contenido: solo ids de navegación.
 */
import { create } from 'zustand';

interface HelpdeskStore {
  /** Timestamp de un request pendiente "navega a Service Desk" (0 = ninguno). */
  navigateRequest: number;
  /** Id del ticket a seleccionar al llegar a la vista (null = sin selección). */
  selectedTicketId: string | null;
  /** Pide a App.tsx cambiar a la sección helpdesk (one-shot). */
  requestNavigate: () => void;
  consumeNavigate: () => void;
  /** Selecciona un ticket (la vista lo usa como estado de selección). */
  selectTicket: (ticketId: string) => void;
  clearSelectedTicket: () => void;
}

export const useHelpdeskStore = create<HelpdeskStore>((set) => ({
  navigateRequest: 0,
  selectedTicketId: null,

  requestNavigate: () => set({ navigateRequest: Date.now() }),

  consumeNavigate: () => set({ navigateRequest: 0 }),

  selectTicket: (ticketId) => set({ selectedTicketId: ticketId }),

  clearSelectedTicket: () => set({ selectedTicketId: null }),
}));
