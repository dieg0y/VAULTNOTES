'use client';

/**
 * IamView — IAM (V11 · PILAR 1): simulador de Identity & Access
 * Management (Nexora S.A. — Equipo IAM, empresa ficticia).
 *
 * Refactor R4: este archivo pasó de ser un clon de ~1340 líneas del
 * patrón HelpDesk/SysAdmin/SOC a un módulo fino de CONFIGURACIÓN — el
 * cuerpo completo (cola master-detail, ficha de estudio con revelado
 * progresivo, semana del proyecto final y Base de Conocimiento) vive en
 * el motor compartido `sim/TicketSimulatorView.tsx`. Aquí solo queda lo
 * que hace a IAM, IAM:
 *
 *  · Tres pestañas: COLA IAM (filtros estado/prioridad/tipo/entorno/
 *    categoría/ámbito/búsqueda/orden) · SEMANA DE ACCESS REVIEW (los 10
 *    tickets del proyecto final, iam-041..iam-050, 2 por día × 5 días,
 *    con progreso por día y salto a la cola) · BASE DE CONOCIMIENTO.
 *  · Extensiones de dominio: type 'cambio' (chip naranja) y environment
 *    (torre IAM: JML / Access / PAM / Gobernanza / Infra IAM / Multi)
 *    con filtro multi-selección por entorno en la cola.
 *  · La KB de IAM tiene torres EDITORIALES propias (AD / Entra ID /
 *    SaaS / PAM / Gobernanza / Plataformas IAM / Cloud IAM / Multi) que
 *    difieren de las torres de los tickets — por eso la config declara
 *    un kbEnvMeta dedicado.
 *  · El trabajo persiste en db.iamTickets (status + statusNote) → viaja
 *    en los backups ZIP; el iamStore coordina los deep-links (Dashboard,
 *    roadmap IAM) y la KB enlaza tickets y términos del Glosario.
 *
 * 100% offline. Todo el texto se renderiza como TEXTO (sin HTML salvo la
 * tabla del export a Notas, que se escapa con escapeHtml).
 */

import React from 'react';
import { Server, Ticket as TicketIcon, Wrench } from 'lucide-react';
import { db } from '../db';
import type { GlossaryTerm, IamTicket, IamEnvironment } from '../types';
import { IAM_KB_ARTICLES, IAM_KB_BY_ID, type IamEnvironment as IamKbEnvironment } from '../data/iamKB';
import { useIamStore } from '../store/iamStore';
import { TicketSimulatorView } from './sim/TicketSimulatorView';
import type { SimConfig, SimEnvMeta } from './sim/types';

/* ------------------------------------------------------------------ */
/* Deltas de dominio IAM (metadatos visuales del pilar)                */
/* ------------------------------------------------------------------ */

const IAM_CATEGORIES = [
  'IAM - IGA',
  'IAM - Access Management',
  'IAM - Auth / MFA',
  'IAM - Federation / SSO',
  'IAM - PAM',
  'GRC - Auditoría y Cumplimiento',
  'GRC - Riesgo y Marco Normativo',
] as const;

/** Metadatos del ENTORNO (torre IAM de los tickets) — chip corto para la fila. */
const IAM_ENV_META: Record<IamEnvironment, SimEnvMeta> = {
  JML: { label: 'JML (Joiner-Mover-Leaver)', short: 'JML', chip: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  Access: { label: 'Access Management', short: 'Access', chip: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
  PAM: { label: 'PAM / Privilegios', short: 'PAM', chip: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
  Gobernanza: { label: 'Gobernanza / Certificación', short: 'Gob', chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  'Infra IAM': { label: 'Infra IAM (AD/Entra/SSO)', short: 'Infra', chip: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30' },
  Multi: { label: 'Multi', short: 'Multi', chip: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
};

/** Orden fijo de los chips de entorno (filtro de la cola). */
const IAM_ENVIRONMENTS: IamEnvironment[] = ['JML', 'Access', 'PAM', 'Gobernanza', 'Infra IAM', 'Multi'];

/** Metadatos del entorno EDITORIAL de la KB (las torres de los artículos
 *  difieren de las torres de los tickets) — mismo chip, sin versión corta. */
const IAM_KB_ENV_META: Record<IamKbEnvironment, SimEnvMeta> = {
  'Active Directory': { label: 'Active Directory', short: 'Active Directory', chip: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  'Entra ID / M365': { label: 'Entra ID / M365', short: 'Entra ID / M365', chip: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
  'Aplicaciones SaaS': { label: 'Aplicaciones SaaS', short: 'Aplicaciones SaaS', chip: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
  'PAM / Privilegios': { label: 'PAM / Privilegios', short: 'PAM / Privilegios', chip: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
  'Gobernanza': { label: 'Gobernanza', short: 'Gobernanza', chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  'Plataformas IAM': { label: 'Plataformas IAM', short: 'Plataformas IAM', chip: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  'Cloud IAM': { label: 'Cloud IAM', short: 'Cloud IAM', chip: 'bg-teal-500/10 text-teal-400 border-teal-500/30' },
  Multi: { label: 'Multi', short: 'Multi', chip: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
};

/** Temas de los 5 días de la Semana de Access Review. */
const IAM_DAY_LABELS = [
  { day: 1, title: 'Día 1', theme: 'Atestación de roles: kickoff de la campaña y el primer bloque de certificación' },
  { day: 2, title: 'Día 2', theme: 'Terceros y offboarding: contratistas con contrato vencido y leavers con la puerta entreabierta' },
  { day: 3, title: 'Día 3', theme: 'SoD: combinaciones tóxicas detectadas y remediación con el negocio' },
  { day: 4, title: 'Día 4', theme: 'Acceso privilegiado: auditoría de checkouts PAM, break-glass y cuentas de servicio' },
  { day: 5, title: 'Día 5', theme: 'Cierre: firma de campaña, revocaciones en batch, KPIs, evidencias y postmortem' },
] as const;

/* ------------------------------------------------------------------ */
/* Config del pilar IAM                                                */
/* ------------------------------------------------------------------ */

const IAM_SIM_CONFIG: SimConfig<IamTicket> = {
  table: db.iamTickets,
  useStore: useIamStore,
  kb: { articles: IAM_KB_ARTICLES, byId: IAM_KB_BY_ID },
  kbEnvMeta: IAM_KB_ENV_META,
  categories: IAM_CATEGORIES,
  categoryPrefix: 'IAM - ',

  env: { meta: IAM_ENV_META, order: IAM_ENVIRONMENTS, filterLabel: 'Entorno:', allLabel: 'Todos los entornos' },

  hasCambio: true,
  accent: 'cyan',
  finalChipLabel: 'SG',
  finalDetailLabel: 'AR',
  finalTab: {
    label: 'Semana de Access Review',
    heading: 'Semana de Access Review — tu primera campaña de certificación',
    intro:
      '10 tickets (iam-041..iam-050, 2 por día × 5 días) que simulan tu primera campaña trimestral de certificación de accesos en el equipo ' +
      'IAM de Nexora: del kickoff del día 1 a los terceros y leavers del día 2, las combinaciones SoD del día 3, la auditoría de acceso ' +
      'privilegiado del día 4 y el cierre con firma, KPIs y postmortem del día 5. Trabájalos en orden — cada día sube la dificultad y la nota ' +
      'de cierre de cada ticket entrena el hábito de documentar que después se cierra con el informe de campaña del día 5.',
    dayLabels: IAM_DAY_LABELS,
    idPrefix: /^iam-/,
    firstNumber: 41,
    perDay: 2,
  },

  itemNoun: 'ticket',
  idPrefix: 'iam',

  headerIcon: <Server className="w-4 h-4 text-cyan-400" />,
  headerTitle: 'IAM — Simulador de Identity & Access Management',
  headerCompany: 'Nexora S.A. — Equipo IAM (empresa ficticia)',
  headerFinalLabel: 'Access Review',
  tablistAriaLabel: 'Secciones de IAM',
  queueTabIcon: <TicketIcon className="w-3.5 h-3.5" />,
  queueTabLabel: 'Cola IAM',
  kbTabLabel: 'Base de Conocimiento',

  searchPlaceholder: 'Buscar ticket (número, título, solicitante…)',
  searchAriaLabel: 'Buscar en la cola IAM',
  scopeFinalLabel: 'Semana de Access Review',
  queueListMaxH: 'max-h-[calc(100vh-380px)]',
  queueEmptyIcon: <TicketIcon className="w-8 h-8 text-[#333]" />,
  queueEmptyHint: 'El flujo es el de un día real de IAM: leer la solicitud → diagnosticar → resolver o escalar → documentar la nota de cierre.',

  requesterLabel: 'Solicitante',
  reportLabel: 'Lo que reporta el usuario',
  studyIntro:
    'Intenta resolver el ticket con lo que ves arriba (y tu criterio de analista IAM) ANTES de abrir la guía. Cuando creas tener el diagnóstico, ábrela y contrasta paso a paso.',
  troubleshootTitle: 'Pasos de diagnóstico (guía)',
  troubleshootIcon: <Wrench className="w-3.5 h-3.5" />,
  troubleshootHint: 'Tu plan de troubleshooting — compáralo con la guía',
  notePlaceholder:
    'Causa raíz encontrada, pasos que seguiste, comando clave, verificación final, hora… como si el líder del equipo IAM o un auditor fuera a leerlo sin preguntarte nada.',
  resolveError: 'Documenta tu resolución (mín. 10 caracteres): qué causa encontraste y qué hiciste. Es tu evidencia de práctica.',
  note: {
    numberRow: 'Número',
    requesterRow: 'Solicitante',
    descriptionRow: 'Reporte del usuario',
    troubleshootingRow: 'Pasos de diagnóstico (guía)',
    titlePrefix: 'IAM',
    envRow: { label: 'Entorno', useMetaLabel: false },
  },

  kbStepsIcon: <Wrench className="w-3 h-3" />,
};

/* ------------------------------------------------------------------ */
/* Vista (wrapper fino del motor compartido)                           */
/* ------------------------------------------------------------------ */

export interface IamViewProps {
  /** Términos del glosario (para enlazar relatedTerms de la KB por nombre). */
  glossaryTerms: GlossaryTerm[];
  /** Abre un término del glosario (navega a la sección Glosario). */
  onOpenGlossaryTerm: (termId: string) => void;
}

export const IamView: React.FC<IamViewProps> = (props) => <TicketSimulatorView config={IAM_SIM_CONFIG} {...props} />;
