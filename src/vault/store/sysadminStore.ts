/**
 * sysadminStore.ts — SYSADMIN OPS (v21) navigation hub.
 *
 * Hub de navegación del simulador de tickets SysAdmin (espejo del
 * helpdeskStore). El contenido vive en la tabla Dexie `sysadminTickets`
 * (seeds sa-001..056 + tickets propios) y la vista (SysAdminView) lo lee
 * con useLiveQuery — este store NO replica datos, solo coordina
 * cross-view deep-links:
 *
 *  - `selectTicket(id)` + `navigateRequest` → cualquier vista (p. ej. la
 *    tarjeta del Dashboard o el roadmap SysAdmin) puede pedir "abre la
 *    sección SysAdmin Ops con el ticket X seleccionado". App.tsx consume
 *    el request (one-shot, sin loops) igual que el helpdeskStore.
 *
 * 100% offline — nada de red, nada de contenido: solo ids de navegación.
 */
import { create } from 'zustand';

interface SysadminStore {
  /** Timestamp de un request pendiente "navega a SysAdmin Ops" (0 = ninguno). */
  navigateRequest: number;
  /** Id del ticket a seleccionar al llegar a la vista (null = sin selección). */
  selectedTicketId: string | null;
  /** Pide a App.tsx cambiar a la sección sysadmin (one-shot). */
  requestNavigate: () => void;
  consumeNavigate: () => void;
  /** Selecciona un ticket (la vista lo usa como estado de selección). */
  selectTicket: (ticketId: string) => void;
  clearSelectedTicket: () => void;
}

export const useSysadminStore = create<SysadminStore>((set) => ({
  navigateRequest: 0,
  selectedTicketId: null,

  requestNavigate: () => set({ navigateRequest: Date.now() }),

  consumeNavigate: () => set({ navigateRequest: 0 }),

  selectTicket: (ticketId) => set({ selectedTicketId: ticketId }),

  clearSelectedTicket: () => set({ selectedTicketId: null }),
}));
