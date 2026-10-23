/**
 * socStore.ts — SOC / BLUE TEAM (v9 simulador) selection hub.
 *
 * Hub de selección del simulador de casos SOC. El contenido vive en la
 * tabla Dexie `socTickets` (seeds soc-001..050 + casos propios) y la vista
 * (SocView) lo lee con useLiveQuery — este store NO replica datos, solo
 * coordina la selección del caso entre vistas.
 *
 * LIMPIEZA V13: retirado navigateRequest/requestNavigate/consumeNavigate
 * (la cadena one-shot hacia App.tsx no tenía callers — código muerto).
 *
 * 100% offline — nada de red, nada de contenido: solo ids de navegación.
 */
import { create } from 'zustand';

interface SocStore {
  /** Id del caso a seleccionar al llegar a la vista (null = sin selección). */
  selectedTicketId: string | null;
  /** Selecciona un caso (la vista lo usa como estado de selección). */
  selectTicket: (ticketId: string) => void;
  clearSelectedTicket: () => void;
}

export const useSocStore = create<SocStore>((set) => ({
  selectedTicketId: null,

  selectTicket: (ticketId) => set({ selectedTicketId: ticketId }),

  clearSelectedTicket: () => set({ selectedTicketId: null }),
}));
