/**
 * sysadminKB — artículos de la base de conocimiento SysAdmin (SIMULADOS —
 * empresa ficticia Nexora S.A.). Dataset ESTÁTICO de solo lectura (viene de
 * fábrica, no vive en Dexie ni en el backup). relatedTickets es
 * pre-calculado desde los kbRef del dataset de tickets.
 */
import type { SysAdminKbArticle } from '../types';

export const SYSADMIN_KB_ARTICLES: SysAdminKbArticle[] = [
  {
    "id": "sakb-stub",
    "title": "STUB — reemplazado por el agente de contenido",
    "category": "SysAdmin - Linux / Unix",
    "environment": "Linux",
    "symptoms": "STUB",
    "cause": "STUB",
    "steps": [{ "title": "STUB", "detail": "STUB" }],
    "relatedTerms": [],
    "relatedTickets": []
  }
];

/** Índice id → artículo (para resolver kbRef de tickets sin buscar). */
export const SYSADMIN_KB_BY_ID: Map<string, SysAdminKbArticle> = new Map(
  SYSADMIN_KB_ARTICLES.map((a) => [a.id, a])
);
