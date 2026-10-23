/**
 * helpdeskStore.ts — SERVICE DESK (v19) selection hub.
 *
 * Hub de selección del simulador de tickets HelpDesk. El contenido vive en
 * la tabla Dexie `helpdeskTickets` (seeds hdt-001..048 + tickets propios)
 * y la vista (HelpDeskView) lo lee con useLiveQuery — este store NO
 * replica datos, solo coordina la selección del ticket entre vistas
 * (p. ej. la ficha de la KB o el proyecto final seleccionan el ticket
 * que la cola debe abrir).
 *
 * LIMPIEZA V13: retirado navigateRequest/requestNavigate/consumeNavigate
 * (la cadena one-shot hacia App.tsx no tenía callers — código muerto).
 *
 * 100% offline — nada de red, nada de contenido: solo ids de navegación.
 */
import { create } from 'zustand';

interface HelpdeskStore {
  /** Id del ticket a seleccionar al llegar a la vista (null = sin selección). */
  selectedTicketId: string | null;
  /** Selecciona un ticket (la vista lo usa como estado de selección). */
  selectTicket: (ticketId: string) => void;
  clearSelectedTicket: () => void;
}

export const useHelpdeskStore = create<HelpdeskStore>((set) => ({
  selectedTicketId: null,

  selectTicket: (ticketId) => set({ selectedTicketId: ticketId }),

  clearSelectedTicket: () => set({ selectedTicketId: null }),
}));
