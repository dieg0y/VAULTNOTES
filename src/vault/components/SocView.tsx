'use client';

/**
 * SocView — SOC / BLUE TEAM (v23): simulador de triage L1 (Nexora S.A. —
 * SOC / Blue Team, empresa ficticia).
 *
 * Refactor R4: adaptación de SysAdminView al dominio SOC que pasó de
 * ~1335 líneas a un módulo fino de CONFIGURACIÓN — el cuerpo completo
 * (cola de casos master-detail, ficha de estudio con revelado
 * progresivo, semana del proyecto final y Base de Conocimiento) vive en
 * el motor compartido `sim/TicketSimulatorView.tsx`. Dataset de fábrica:
 * 50 casos (soc-001..soc-020 generales + 30 del proyecto final "Primera
 * Semana en el SOC" soc-021..soc-050, 6 por día × 5 días) y una KB de
 * 16 artículos (data/socKB.ts — solo lectura). Aquí solo queda lo que
 * hace a SOC, SOC:
 *
 *  · Tres pestañas: COLA DE CASOS (filtros estado/prioridad/tipo/torre/
 *    categoría/ámbito/búsqueda/orden) · PRIMERA SEMANA SOC (los 30 casos
 *    del proyecto final con progreso por día y salto a la cola) · BASE
 *    DE CONOCIMIENTO (pasos con queries — CodeBlock).
 *  · Adaptaciones de dominio vs SysAdmin: type SOLO 'incidente' |
 *    'solicitud' (sin 'cambio' — no hay chip ni filtro), environment =
 *    TORRE DE DETECCIÓN (Identity / Endpoint / Network / Email / Cloud /
 *    Web / Multi) y el vocabulario cambia de ticket→caso, solicitante→
 *    origen, diagnóstico→investigación (Wrench→SearchCode).
 *  · El trabajo persiste en db.socTickets (tabla v23: status +
 *    statusNote) → viaja en los backups ZIP; el socStore coordina los
 *    deep-links (Dashboard, roadmap SOC) y la KB enlaza casos y términos
 *    del Glosario.
 *
 * 100% offline. Todo el texto se renderiza como TEXTO (sin HTML salvo la
 * tabla del export a Notas, que se escapa con escapeHtml).
 */

import React from 'react';
import { ShieldAlert, Radar, SearchCode } from 'lucide-react';
import { db } from '../db';
import type { GlossaryTerm, SocTicket, SocEnvironment } from '../types';
import { SOC_KB_ARTICLES, SOC_KB_BY_ID } from '../data/socKB';
import { useSocStore } from '../store/socStore';
import { TicketSimulatorView } from './sim/TicketSimulatorView';
import type { SimConfig, SimEnvMeta } from './sim/types';

/* ------------------------------------------------------------------ */
/* Deltas de dominio SOC (metadatos visuales del pilar)                */
/* ------------------------------------------------------------------ */

const SOC_CATEGORIES = [
  'SOC - Phishing / Email',
  'SOC - Identity / Ataques de Contraseña',
  'SOC - Endpoint / EDR',
  'SOC - Network / NDR',
  'SOC - Cloud / SaaS',
  'SOC - Web / Aplicaciones',
  'SOC - Datos / Exfiltración',
  'SOC - Respuesta a Incidentes',
  'SOC - Threat Hunting / Intel',
  'SOC - SIEM / Reglas de Detección',
] as const;

/** Metadatos de la TORRE DE DETECCIÓN — chip corto para la fila. */
const SOC_ENV_META: Record<SocEnvironment, SimEnvMeta> = {
  Identity: { label: 'Identity', short: 'Identity', chip: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
  Endpoint: { label: 'Endpoint', short: 'Endpoint', chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  Network: { label: 'Network', short: 'Network', chip: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
  Email: { label: 'Email', short: 'Email', chip: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  Cloud: { label: 'Cloud', short: 'Cloud', chip: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30' },
  Web: { label: 'Web', short: 'Web', chip: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
  Multi: { label: 'Multi (varias torres)', short: 'Multi', chip: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
};

/** Orden fijo de los chips de torre (filtro de la cola). */
const SOC_ENVIRONMENTS: SocEnvironment[] = ['Identity', 'Endpoint', 'Network', 'Email', 'Cloud', 'Web', 'Multi'];

/** Temas de los 5 días de la Primera semana SOC. */
const SOC_DAY_LABELS = [
  { day: 1, title: 'Día 1', theme: 'Email: phishing, campañas, adjuntos y purga' },
  { day: 2, title: 'Día 2', theme: 'Identity: spray, MFA fatigue, viaje imposible y cuenta comprometida' },
  { day: 3, title: 'Día 3', theme: 'Endpoint: Defender/EDR, malware, persistencia y PowerShell' },
  { day: 4, title: 'Día 4', theme: 'Network y Web: beacons, escaneos, SQLi y firewall' },
  { day: 5, title: 'Día 5', theme: 'Cloud y datos: consent phishing, descargas masivas y cierre de la semana' },
] as const;

/* ------------------------------------------------------------------ */
/* Config del pilar SOC                                                */
/* ------------------------------------------------------------------ */

const SOC_SIM_CONFIG: SimConfig<SocTicket> = {
  table: db.socTickets,
  useStore: useSocStore,
  kb: { articles: SOC_KB_ARTICLES, byId: SOC_KB_BY_ID },
  // La KB de SOC usa las MISMAS torres que los casos.
  kbEnvMeta: SOC_ENV_META,
  categories: SOC_CATEGORIES,
  categoryPrefix: 'SOC - ',

  env: { meta: SOC_ENV_META, order: SOC_ENVIRONMENTS, filterLabel: 'Torre:', allLabel: 'Todas las torres' },

  hasCambio: false,
  accent: 'cyan',
  finalChipLabel: 'PS',
  finalChipTitle: 'Proyecto final · Primera semana SOC',
  finalDetailLabel: 'Primera semana SOC',
  finalTab: {
    label: 'Primera semana SOC',
    heading: 'Primera semana SOC — tu primera semana de turno en el Blue Team',
    intro:
      '30 casos (soc-021..soc-050, 6 por día × 5 días) que simulan tu primera semana real de turno en el SOC de Nexora: del phishing y la purga ' +
      'de correos del día 1 al consent phishing, las descargas masivas y el cierre de la semana del día 5. Trabájalos en orden — cada día sube ' +
      'la dificultad y la nota de cierre de cada caso entrena el hábito de documentar con el que se cierra la semana.',
    dayLabels: SOC_DAY_LABELS,
    idPrefix: /^soc-/,
    firstNumber: 21,
    perDay: 6,
  },

  itemNoun: 'caso',
  idPrefix: 'soc',

  headerIcon: <ShieldAlert className="w-4 h-4 text-cyan-400" />,
  headerTitle: 'SOC Blue Team — Simulador de triage L1',
  headerCompany: 'Nexora S.A. — SOC / Blue Team (empresa ficticia)',
  headerFinalLabel: 'primera semana SOC',
  tablistAriaLabel: 'Secciones del SOC Blue Team',
  queueTabIcon: <Radar className="w-3.5 h-3.5" />,
  queueTabLabel: 'Cola de casos',
  kbTabLabel: 'Base de conocimiento',

  searchPlaceholder: 'Buscar caso (número, título, origen…)',
  searchAriaLabel: 'Buscar en la cola de casos',
  scopeFinalLabel: 'Primera semana SOC',
  queueListMaxH: 'max-h-[calc(100vh-380px)]',
  queueEmptyIcon: <Radar className="w-8 h-8 text-[#333]" />,
  queueEmptyHint: 'El flujo es el de un turno real del SOC: leer la alerta → investigar → resolver o escalar → documentar la nota de cierre.',

  requesterLabel: 'Origen',
  reportLabel: 'Lo que reporta el origen',
  studyIntro:
    'Intenta resolver el caso con lo que ves arriba (y tu criterio de triage) ANTES de abrir la guía. Cuando creas tener el diagnóstico, ábrela y contrasta paso a paso.',
  troubleshootTitle: 'Pasos de investigación (guía)',
  troubleshootIcon: <SearchCode className="w-3.5 h-3.5" />,
  troubleshootHint: 'Tu plan de investigación — compáralo con la guía',
  notePlaceholder:
    'Causa raíz encontrada, pasos que seguiste, query o comando clave, verificación final, hora… como si el líder de turno o un auditor fuera a leerlo sin preguntarte nada.',
  resolveError: 'Documenta tu resolución (mín. 10 caracteres): qué causa encontraste, qué contuviste y qué veredicto emitiste. Es tu evidencia de práctica.',
  note: {
    numberRow: 'Caso SOC',
    requesterRow: 'Origen',
    descriptionRow: 'Reporte del origen',
    troubleshootingRow: 'Pasos de investigación (guía)',
    titlePrefix: 'SOC Blue Team',
    // La fila 'Torre' usa la etiqueta LARGA del ENV_META, no el valor crudo.
    envRow: { label: 'Torre', useMetaLabel: true },
  },

  kbStepsIcon: <SearchCode className="w-3 h-3" />,
};

/* ------------------------------------------------------------------ */
/* Vista (wrapper fino del motor compartido)                           */
/* ------------------------------------------------------------------ */

export interface SocViewProps {
  /** Términos del glosario (para enlazar relatedTerms de la KB por nombre). */
  glossaryTerms: GlossaryTerm[];
  /** Abre un término del glosario (navega a la sección Glosario). */
  onOpenGlossaryTerm: (termId: string) => void;
}

export const SocView: React.FC<SocViewProps> = (props) => <TicketSimulatorView config={SOC_SIM_CONFIG} {...props} />;
