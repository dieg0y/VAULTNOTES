/**
 * sysadminStore.ts — SYSADMIN OPS (v21) selection hub.
 *
 * Hub de selección del simulador de tickets SysAdmin. El contenido vive en
 * la tabla Dexie `sysadminTickets` (seeds sa-001..056 + tickets propios)
 * y la vista (SysAdminView) lo lee con useLiveQuery — este store NO
 * replica datos, solo coordina la selección del ticket entre vistas.
 *
 * LIMPIEZA V13: retirado navigateRequest/requestNavigate/consumeNavigate
 * (la cadena one-shot hacia App.tsx no tenía callers — código muerto).
 *
 * 100% offline — nada de red, nada de contenido: solo ids de navegación.
 */
import { create } from 'zustand';

interface SysadminStore {
  /** Id del ticket a seleccionar al llegar a la vista (null = sin selección). */
  selectedTicketId: string | null;
  /** Selecciona un ticket (la vista lo usa como estado de selección). */
  selectTicket: (ticketId: string) => void;
  clearSelectedTicket: () => void;
}

export const useSysadminStore = create<SysadminStore>((set) => ({
  selectedTicketId: null,

  selectTicket: (ticketId) => set({ selectedTicketId: ticketId }),

  clearSelectedTicket: () => set({ selectedTicketId: null }),
}));
