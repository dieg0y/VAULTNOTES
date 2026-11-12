'use client';

/**
 * SysAdminView — SYSADMIN OPS (v21): simulador de Infraestructura &
 * Operaciones (Nexora S.A. — Infra & Ops, empresa ficticia).
 *
 * Refactor R4: adaptación de HelpDeskView al dominio SysAdmin que pasó
 * de ~1320 líneas a un módulo fino de CONFIGURACIÓN — el cuerpo completo
 * (cola de guardia master-detail, ficha de estudio con revelado
 * progresivo, semana del proyecto final y Base de Conocimiento) vive en
 * el motor compartido `sim/TicketSimulatorView.tsx`. Aquí solo queda lo
 * que hace a SysAdmin, SysAdmin:
 *
 *  · Tres pestañas: COLA DE GUARDIA (filtros estado/prioridad/tipo/
 *    entorno/categoría/ámbito/búsqueda/orden) · SEMANA DE GUARDIA (los
 *    30 tickets del proyecto final, sa-027..sa-056, 6 por día × 5 días,
 *    con progreso por día y salto a la cola) · BASE DE CONOCIMIENTO.
 *  · Extensiones de dominio vs HelpDesk: type 'cambio' (ventana de
 *    mantenimiento / plan / rollback, chip naranja — filtro y cabecera)
 *    y environment (torre tecnológica: Linux / Windows Server / Red /
 *    Storage-Backup / Virtualización / Cloud / Multi) con filtro
 *    multi-selección por entorno en la cola. La KB reutiliza las mismas
 *    torres de los tickets (kbEnvMeta = envMeta).
 *  · El trabajo persiste en db.sysadminTickets (status + statusNote) →
 *    viaja en los backups ZIP; el sysadminStore coordina los deep-links
 *    (Dashboard, roadmap SysAdmin) y la KB enlaza tickets y términos
 *    del Glosario.
 *
 * 100% offline. Todo el texto se renderiza como TEXTO (sin HTML salvo la
 * tabla del export a Notas, que se escapa con escapeHtml).
 */

import React from 'react';
import { Server, Ticket as TicketIcon, Wrench } from 'lucide-react';
import { db } from '../db';
import type { GlossaryTerm, SysAdminTicket, SaEnvironment } from '../types';
import { SYSADMIN_KB_ARTICLES, SYSADMIN_KB_BY_ID } from '../data/sysadminKB';
import { useSysadminStore } from '../store/sysadminStore';
import { TicketSimulatorView } from './sim/TicketSimulatorView';
import type { SimConfig, SimEnvMeta } from './sim/types';

/* ------------------------------------------------------------------ */
/* Deltas de dominio SysAdmin (metadatos visuales del pilar)           */
/* ------------------------------------------------------------------ */

const SA_CATEGORIES = [
  'SysAdmin - Linux / Unix',
  'SysAdmin - Windows Server',
  'SysAdmin - Redes & Firewalls',
  'SysAdmin - Storage & Backup',
  'SysAdmin - Virtualización',
  'SysAdmin - Cloud / Contenedores',
  'SysAdmin - Monitoreo & Observabilidad',
  'SysAdmin - Automatización',
  'SysAdmin - Seguridad & Hardening',
] as const;

/** Metadatos del ENTORNO (torre tecnológica) — chip corto para la fila. */
const SA_ENV_META: Record<SaEnvironment, SimEnvMeta> = {
  Linux: { label: 'Linux', short: 'Linux', chip: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  'Windows Server': { label: 'Windows Server', short: 'Win Srv', chip: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
  Red: { label: 'Red', short: 'Red', chip: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
  'Storage / Backup': { label: 'Storage / Backup', short: 'Storage', chip: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
  'Virtualización': { label: 'Virtualización', short: 'VM', chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  'Cloud / Contenedores': { label: 'Cloud / Contenedores', short: 'Cloud', chip: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30' },
  Multi: { label: 'Multi', short: 'Multi', chip: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
};

/** Orden fijo de los chips de entorno (filtro de la cola). */
const SA_ENVIRONMENTS: SaEnvironment[] = ['Linux', 'Windows Server', 'Red', 'Storage / Backup', 'Virtualización', 'Cloud / Contenedores', 'Multi'];

/** Temas de los 5 días de la Semana de Guardia. */
const SA_DAY_LABELS = [
  { day: 1, title: 'Día 1', theme: 'Linux esencial: servicios, discos, permisos y las 3 AM de la guardia' },
  { day: 2, title: 'Día 2', theme: 'Windows Server: DNS interno, GPO, DHCP y la ventana de parches' },
  { day: 3, title: 'Día 3', theme: 'Redes: VLANs, VPN site-to-site, certificados y firewall' },
  { day: 4, title: 'Día 4', theme: 'Storage, backup y virtualización: RAID, restores, VMs' },
  { day: 5, title: 'Día 5', theme: 'Cambios, monitoreo y cierre: ventanas, alertas y postmortem' },
] as const;

/* ------------------------------------------------------------------ */
/* Config del pilar SysAdmin                                           */
/* ------------------------------------------------------------------ */

const SYSADMIN_SIM_CONFIG: SimConfig<SysAdminTicket> = {
  table: db.sysadminTickets,
  useStore: useSysadminStore,
  kb: { articles: SYSADMIN_KB_ARTICLES, byId: SYSADMIN_KB_BY_ID },
  // La KB de SysAdmin usa las MISMAS torres que los tickets.
  kbEnvMeta: SA_ENV_META,
  categories: SA_CATEGORIES,
  categoryPrefix: 'SysAdmin - ',

  env: { meta: SA_ENV_META, order: SA_ENVIRONMENTS, filterLabel: 'Entorno:', allLabel: 'Todos los entornos' },

  hasCambio: true,
  accent: 'cyan',
  finalChipLabel: 'SG',
  finalDetailLabel: 'SG',
  finalTab: {
    label: 'Semana de Guardia',
    heading: 'Semana de Guardia — tu primera semana de on-call',
    intro:
      '30 tickets (sa-027..sa-056, 6 por día × 5 días) que simulan tu primera semana real de guardia en el equipo de Infraestructura ' +
      'de Nexora: de Linux y las 3 AM del día 1 a los cambios, las alertas y el postmortem del día 5. Trabájalos en orden — cada día ' +
      'sube la dificultad y la nota de cierre de cada ticket entrena el hábito de documentar que después se cierra con el postmortem ' +
      'del día 5.',
    dayLabels: SA_DAY_LABELS,
    idPrefix: /^sa-/,
    firstNumber: 27,
    perDay: 6,
  },

  itemNoun: 'ticket',
  idPrefix: 'sa',

  headerIcon: <Server className="w-4 h-4 text-cyan-400" />,
  headerTitle: 'SysAdmin Ops — Simulador de Infraestructura',
  headerCompany: 'Nexora S.A. — Infra & Ops (empresa ficticia)',
  headerFinalLabel: 'semana de guardia',
  tablistAriaLabel: 'Secciones de SysAdmin Ops',
  queueTabIcon: <TicketIcon className="w-3.5 h-3.5" />,
  queueTabLabel: 'Cola de Guardia',
  kbTabLabel: 'Base de Conocimiento',

  searchPlaceholder: 'Buscar ticket (número, título, solicitante…)',
  searchAriaLabel: 'Buscar en la cola de guardia',
  scopeFinalLabel: 'Semana de guardia',
  queueListMaxH: 'max-h-[calc(100vh-380px)]',
  queueEmptyIcon: <TicketIcon className="w-8 h-8 text-[#333]" />,
  queueEmptyHint: 'El flujo es el de una guardia real: leer el reporte → diagnosticar → resolver o escalar → documentar la nota de cierre.',

  requesterLabel: 'Solicitante',
  reportLabel: 'Lo que reporta el usuario',
  studyIntro:
    'Intenta resolver el ticket con lo que ves arriba (y tu criterio de guardia) ANTES de abrir la guía. Cuando creas tener el diagnóstico, ábrela y contrasta paso a paso.',
  troubleshootTitle: 'Pasos de diagnóstico (guía)',
  troubleshootIcon: <Wrench className="w-3.5 h-3.5" />,
  troubleshootHint: 'Tu plan de troubleshooting — compáralo con la guía',
  notePlaceholder:
    'Causa raíz encontrada, pasos que seguiste, comando clave, verificación final, hora… como si el líder de guardia o un auditor fuera a leerlo sin preguntarte nada.',
  resolveError: 'Documenta tu resolución (mín. 10 caracteres): qué causa encontraste y qué hiciste. Es tu evidencia de práctica.',
  note: {
    numberRow: 'Número',
    requesterRow: 'Solicitante',
    descriptionRow: 'Reporte del usuario',
    troubleshootingRow: 'Pasos de diagnóstico (guía)',
    titlePrefix: 'SysAdmin Ops',
    envRow: { label: 'Entorno', useMetaLabel: false },
  },

  kbStepsIcon: <Wrench className="w-3 h-3" />,
};

/* ------------------------------------------------------------------ */
/* Vista (wrapper fino del motor compartido)                           */
/* ------------------------------------------------------------------ */

export interface SysAdminViewProps {
  /** Términos del glosario (para enlazar relatedTerms de la KB por nombre). */
  glossaryTerms: GlossaryTerm[];
  /** Abre un término del glosario (navega a la sección Glosario). */
  onOpenGlossaryTerm: (termId: string) => void;
}

export const SysAdminView: React.FC<SysAdminViewProps> = (props) => <TicketSimulatorView config={SYSADMIN_SIM_CONFIG} {...props} />;
