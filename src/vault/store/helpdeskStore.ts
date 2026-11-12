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
 * R1: el cuerpo del store (idéntico en los 4 simuladores) vive en
 * createTicketSelectionStore — esto es solo el wrapper del dominio HelpDesk.
 *
 * 100% offline — nada de red, nada de contenido: solo ids de navegación.
 */
import { createTicketSelectionStore } from './createTicketSelectionStore';

export const useHelpdeskStore = createTicketSelectionStore();
