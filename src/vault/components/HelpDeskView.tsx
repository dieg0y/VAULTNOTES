'use client';

/**
 * HelpDeskView — SERVICE DESK (v19): simulador L1 de práctica.
 *
 * Refactor R4: la vista original (~1210 líneas, origen de la familia
 * HelpDesk → SysAdmin → SOC → IAM) pasó a ser un módulo fino de
 * CONFIGURACIÓN — el cuerpo completo (cola master-detail, ficha de
 * estudio con revelado progresivo, proyecto final y Base de
 * Conocimiento) vive en el motor compartido
 * `sim/TicketSimulatorView.tsx`. Aquí solo queda lo que hace al Service
 * Desk, Service Desk:
 *
 *  · Tres pestañas: COLA DE TICKETS (filtros estado/prioridad/categoría/
 *    ámbito/búsqueda/orden — SIN entornos ni type 'cambio') · PROYECTO
 *    FINAL (los 30 tickets de la "primera semana en el service desk de
 *    Nexora S.A.", hdt-019..048, con progreso por día y salto a la cola)
 *    · BASE DE CONOCIMIENTO (28 artículos, sin chips de entorno).
 *  · Es el único pilar con acento AZUL (tab/filtros/limpiar/foco) en
 *    vez de cyan, y el único sin environment — ni en tickets ni en la
 *    KB (la cabecera del artículo muestra la categoría completa).
 *  · El trabajo persiste en db.helpdeskTickets (status + statusNote) →
 *    viaja en los backups ZIP; el helpdeskStore coordina los deep-links
 *    (Dashboard, roadmap) y la KB enlaza tickets y términos del Glosario.
 *
 * 100% offline. Todo el texto se renderiza como TEXTO (sin HTML salvo la
 * tabla del export a Notas, que se escapa con escapeHtml).
 */

import React from 'react';
import { Headset, Ticket as TicketIcon, Wrench } from 'lucide-react';
import { db } from '../db';
import type { GlossaryTerm, HelpDeskTicket } from '../types';
import { HELPDESK_KB_ARTICLES, HELPDESK_KB_BY_ID } from '../data/helpDeskKB';
import { useHelpdeskStore } from '../store/helpdeskStore';
import { TicketSimulatorView } from './sim/TicketSimulatorView';
import type { SimConfig } from './sim/types';

/* ------------------------------------------------------------------ */
/* Deltas de dominio HelpDesk (metadatos visuales del pilar)           */
/* ------------------------------------------------------------------ */

const HD_CATEGORIES = [
  'HelpDesk - AD / Identidad',
  'HelpDesk - Microsoft 365',
  'HelpDesk - Windows / Endpoint',
  'HelpDesk - Redes (Networking)',
  'HelpDesk - Service Desk / ITSM',
  'HelpDesk - Fundamentos IT',
  'HelpDesk - Seguridad para Soporte',
] as const;

/** Temas de los 5 días del Proyecto Final. */
const HD_DAY_LABELS = [
  { day: 1, title: 'Día 1', theme: 'Lo básico del puesto: contraseñas, bloqueos, impresoras y hardware' },
  { day: 2, title: 'Día 2', theme: 'Microsoft 365: Outlook, Teams, OneDrive y activación' },
  { day: 3, title: 'Día 3', theme: 'Redes: DNS, DHCP, Wi-Fi, VPN y el incidente de la planta 2' },
  { day: 4, title: 'Día 4', theme: 'Windows: rendimiento, actualizaciones, disco, BitLocker y BSOD' },
  { day: 5, title: 'Día 5', theme: 'Seguridad y JML: phishing, MFA, vishing, offboarding y el spooler' },
] as const;

/* ------------------------------------------------------------------ */
/* Config del pilar HelpDesk                                           */
/* ------------------------------------------------------------------ */

const HELPDESK_SIM_CONFIG: SimConfig<HelpDeskTicket> = {
  table: db.helpdeskTickets,
  useStore: useHelpdeskStore,
  kb: { articles: HELPDESK_KB_ARTICLES, byId: HELPDESK_KB_BY_ID },
  // Sin kbEnvMeta: la KB de HelpDesk no tiene entornos editoriales (la
  // cabecera del detalle muestra la categoría completa, sin chip).
  categories: HD_CATEGORIES,
  categoryPrefix: 'HelpDesk - ',

  // Sin `env`: HelpDesk no clasifica por entorno/torre.

  hasCambio: false,
  accent: 'blue',
  finalChipLabel: 'PF',
  finalDetailLabel: 'Proyecto Final',
  finalTab: {
    label: 'Proyecto Final',
    heading: 'Proyecto Final — Primera semana en el Service Desk de Nexora',
    intro:
      '30 tickets (HD-1019..HD-1048) que simulan tu primera semana real: de lo básico del día 1 a la seguridad y el JML del día 5. ' +
      'Trabájalos en orden — cada día sube la dificultad.',
    dayLabels: HD_DAY_LABELS,
    idPrefix: /^hdt-/,
    firstNumber: 19,
    perDay: 6,
  },

  itemNoun: 'ticket',
  idPrefix: 'hd',

  headerIcon: <Headset className="w-4 h-4 text-blue-400" />,
  headerTitle: 'Service Desk — Simulador L1',
  headerCompany: 'Nexora S.A. (empresa ficticia)',
  headerFinalLabel: 'proyecto final',
  tablistAriaLabel: 'Secciones del Service Desk',
  queueTabIcon: <TicketIcon className="w-3.5 h-3.5" />,
  queueTabLabel: 'Cola de Tickets',
  kbTabLabel: 'Base de Conocimiento',

  searchPlaceholder: 'Buscar ticket (número, título, solicitante…)',
  searchAriaLabel: 'Buscar en la cola de tickets',
  scopeFinalLabel: 'Proyecto final',
  // Sin fila de entornos en los filtros → la lista parte 60px más abajo.
  queueListMaxH: 'max-h-[calc(100vh-320px)]',
  queueEmptyIcon: <TicketIcon className="w-8 h-8 text-[#333]" />,
  queueEmptyHint: 'El flujo es el del service desk real: leer el reporte → diagnosticar → resolver o escalar → documentar la nota de cierre.',

  requesterLabel: 'Solicitante',
  reportLabel: 'Lo que reporta el usuario',
  studyIntro:
    'Intenta resolver el ticket con lo que ves arriba (y tu criterio L1) ANTES de abrir la guía. Cuando creas tener el diagnóstico, ábrela y contrasta paso a paso.',
  troubleshootTitle: 'Pasos de diagnóstico (guía)',
  troubleshootIcon: <Wrench className="w-3.5 h-3.5" />,
  troubleshootHint: 'Tu plan de troubleshooting — compáralo con la guía',
  notePlaceholder:
    'Causa raíz encontrada, pasos que seguiste, comando clave, verificación final, hora… como si un L2 o un auditor fuera a leerlo sin preguntarte nada.',
  resolveError: 'Documenta tu resolución (mín. 10 caracteres): qué causa encontraste y qué hiciste. Es tu evidencia de práctica.',
  note: {
    numberRow: 'Número',
    requesterRow: 'Solicitante',
    descriptionRow: 'Reporte del usuario',
    troubleshootingRow: 'Pasos de diagnóstico (guía)',
    titlePrefix: 'Service Desk',
    // Sin envRow: el export a Notas no lleva fila de entorno.
  },

  kbStepsIcon: <Wrench className="w-3 h-3" />,
};

/* ------------------------------------------------------------------ */
/* Vista (wrapper fino del motor compartido)                           */
/* ------------------------------------------------------------------ */

export interface HelpDeskViewProps {
  /** Términos del glosario (para enlazar relatedTerms de la KB por nombre). */
  glossaryTerms: GlossaryTerm[];
  /** Abre un término del glosario (navega a la sección Glosario). */
  onOpenGlossaryTerm: (termId: string) => void;
}

export const HelpDeskView: React.FC<HelpDeskViewProps> = (props) => <TicketSimulatorView config={HELPDESK_SIM_CONFIG} {...props} />;
