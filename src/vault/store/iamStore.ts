/**
 * iamStore.ts — IAM (V11 · PILAR 1) navigation hub.
 *
 * Hub de navegación del simulador de tickets IAM. El contenido vive en
 * la tabla Dexie `iamTickets` (seeds iam-001..050 + tickets propios) y la
 * vista (IamView) lo lee con useLiveQuery — este store NO replica datos,
 * solo coordina cross-view deep-links:
 *
 *  - `selectTicket(id)` + `navigateRequest` → cualquier vista (p. ej. la
 *    tarjeta del Dashboard o el roadmap IAM) puede pedir "abre la
 *    sección IAM con el ticket X seleccionado". App.tsx consume el
 *    request (one-shot, sin loops), el mismo patrón que replican los
 *    stores de navegación de los otros simuladores.
 *
 * 100% offline — nada de red, nada de contenido: solo ids de navegación.
 */
import { create } from 'zustand';

interface IamStore {
  /** Timestamp de un request pendiente "navega a IAM" (0 = ninguno). */
  navigateRequest: number;
  /** Id del ticket a seleccionar al llegar a la vista (null = sin selección). */
  selectedTicketId: string | null;
  /** Pide a App.tsx cambiar a la sección iam (one-shot). */
  requestNavigate: () => void;
  consumeNavigate: () => void;
  /** Selecciona un ticket (la vista lo usa como estado de selección). */
  selectTicket: (ticketId: string) => void;
  clearSelectedTicket: () => void;
}

export const useIamStore = create<IamStore>((set) => ({
  navigateRequest: 0,
  selectedTicketId: null,

  requestNavigate: () => set({ navigateRequest: Date.now() }),

  consumeNavigate: () => set({ navigateRequest: 0 }),

  selectTicket: (ticketId) => set({ selectedTicketId: ticketId }),

  clearSelectedTicket: () => set({ selectedTicketId: null }),
}));
