/**
 * sysadminTickets — tickets SIMULADOS del simulador SysAdmin
 * (empresa ficticia Nexora S.A., equipo de Infraestructura & Operaciones —
 * material de estudio, no datos reales). 56 tickets: 26 generales
 * (sa-001..sa-026) + 30 del Proyecto Final "Semana de Guardia"
 * (sa-027..sa-056, 6 por día × 5 días). Se siembran en la tabla Dexie
 * `sysadminTickets` (v21) de forma idempotente por id + dismissal.
 */
import type { SaTicketLevel, SaTicketPriority, SaTicketType, SaEnvironment } from '../types';

export interface SysAdminTicketSeed {
  id: string;
  number: string;
  title: string;
  category: string;
  subcategory?: string;
  type: SaTicketType;
  priority: SaTicketPriority;
  impact: SaTicketLevel;
  urgency: SaTicketLevel;
  environment: SaEnvironment;
  requester: string;
  description: string;
  symptoms: string;
  dataAvailable?: string;
  troubleshooting?: string;
  resolution?: string;
  escalation?: string;
  kbRef?: string;
  skill?: string;
  evidence?: string;
  isFinalProject?: boolean;
}

export const SYSADMIN_TICKET_SEEDS: SysAdminTicketSeed[] = [
  {
    "id": "sa-001",
    "number": "OPS-2001",
    "title": "STUB — reemplazado por el agente de contenido",
    "category": "SysAdmin - Linux / Unix",
    "subcategory": "STUB",
    "type": "incidente",
    "priority": "P3",
    "impact": "baja",
    "urgency": "media",
    "environment": "Linux",
    "requester": "STUB (Infraestructura)",
    "description": "STUB",
    "symptoms": "STUB",
    "isFinalProject": false
  }
];
