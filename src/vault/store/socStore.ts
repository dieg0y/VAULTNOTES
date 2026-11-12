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
 * R1: el cuerpo del store (idéntico en los 4 simuladores) vive en
 * createTicketSelectionStore — esto es solo el wrapper del dominio SOC.
 *
 * 100% offline — nada de red, nada de contenido: solo ids de navegación.
 */
import { createTicketSelectionStore } from './createTicketSelectionStore';

export const useSocStore = createTicketSelectionStore();
