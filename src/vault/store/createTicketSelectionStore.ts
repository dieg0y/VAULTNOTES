/**
 * createTicketSelectionStore.ts — fábrica compartida de los hubs de
 * selección de tickets (IAM / HelpDesk / SysAdmin / SOC).
 *
 * Patrón común (los 4 stores eran idénticos byte a byte salvo el nombre):
 * el contenido vive en la tabla Dexie correspondiente (`iamTickets`,
 * `helpdeskTickets`, `sysadminTickets`, `socTickets`) y la vista lo lee con
 * useLiveQuery — el store NO replica datos, solo coordina la selección del
 * ticket entre vistas. Cada vista consume 3 selectores atómicos
 * (selectedTicketId / selectTicket / clearSelectedTicket) y App.tsx usa
 * getState() para los deep-links de Ctrl+K (selección imperativa, sin hook).
 * Cada simulador tiene su PROPIA instancia (un store por dominio, sin
 * estado compartido entre colas).
 *
 * 100% offline — nada de red, nada de contenido: solo ids de navegación.
 */
import { create } from 'zustand';

/** Contrato del hub de selección (idéntico al de los 4 stores originales). */
export interface TicketSelectionStore {
  /** Id del ticket a seleccionar al llegar a la vista (null = sin selección). */
  selectedTicketId: string | null;
  /** Selecciona un ticket (la vista lo usa como estado de selección). */
  selectTicket: (ticketId: string) => void;
  clearSelectedTicket: () => void;
}

/** Crea el hub de selección de UN simulador. Los archivos iamStore/
 *  socStore/sysadminStore/helpdeskStore son wrappers de una línea sobre
 *  esta fábrica (refactor R1). */
export function createTicketSelectionStore() {
  return create<TicketSelectionStore>((set) => ({
    selectedTicketId: null,
    selectTicket: (ticketId) => set({ selectedTicketId: ticketId }),
    clearSelectedTicket: () => set({ selectedTicketId: null }),
  }));
}
