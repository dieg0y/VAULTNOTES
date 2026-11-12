/**
 * types.ts — contratos del MOTOR compartido de simuladores (carpeta sim/).
 *
 * Las 4 vistas de simulador (HelpDeskView / SysAdminView / SocView /
 * IamView) eran una familia copy-paste de ~1300 líneas (duplicación del
 * 79-91%): los mismos 12 bloques internos (chips, fila, ficha de estudio,
 * pestaña KB, cola con filtros) con solo deltas de datos, etiquetas y
 * color de acento. Este módulo define:
 *
 *  · SimTicket — el subconjunto estructural COMÚN de los 4 tipos de ticket
 *    (HelpDeskTicket / SysAdminTicket / SocTicket / IamTicket de
 *    types/index.ts; los 4 son asignables a SimTicket por tipado
 *    estructural — HelpDesk no tiene `environment`, por eso aquí es
 *    opcional). Se usan los nombres de campo REALES de los datasets.
 *  · SimKbArticle / SimKbStep — ídem para los 4 datasets de KB
 *    (HelpDeskKbArticle / SysAdminKbArticle / SocKbArticle / IamKbArticle;
 *    el de HelpDesk no tiene `environment`).
 *  · SimConfig<T> — TODO lo que varía entre pilares viaja en la config:
 *    tabla Dexie, hub de selección (zustand), dataset KB, entornos/torres,
 *    categorías, textos de UI, acento y la pestaña de proyecto final.
 *    El motor (TicketSimulatorView.tsx) no conoce ningún dominio: solo
 *    renderiza chips y filtra por igualdad de strings.
 */

import type { ReactNode } from 'react';
import type { Table } from 'dexie';
import type { UseBoundStore, StoreApi } from 'zustand';
import type { TicketSelectionStore } from '../../store/createTicketSelectionStore';

/* ------------------------------------------------------------------ */
/* Ticket + artículo KB (subconjunto estructural común)                */
/* ------------------------------------------------------------------ */

/** Estados de trabajo comunes a los 4 simuladores (idénticos en los 4). */
export type SimTicketStatus = 'nuevo' | 'en_progreso' | 'resuelto' | 'cerrado' | 'escalado';

/**
 * Subconjunto estructural común de los 4 tipos de ticket. `environment`
 * es opcional porque HelpDesk no lo tiene (los otros 3 lo requieren en
 * su propio tipo — el motor solo lo usa cuando la config declara
 * entornos).
 */
export interface SimTicket {
  /** Id estable del seed ('hdt-001' / 'sa-001' / 'soc-001' / 'iam-001'...). */
  id: string;
  /** Número visible ('HD-1001' / 'OPS-2001' / 'SOC-3001' / 'IAM-4001'...). */
  number: string;
  title: string;
  /** Categoría de la lista maestra del pilar (con prefijo 'IAM - '...). */
  category: string;
  /** Subcategoría corta ('Outlook', 'systemd', 'Phishing', 'SoD'...). */
  subcategory?: string;
  type: string;
  priority: string;
  impact: string;
  urgency: string;
  /** Solicitante u origen del reporte (ficticio). */
  requester: string;
  /** Lo que reporta el solicitante/origen, en sus palabras. */
  description: string;
  /** Síntomas observables/verificables. */
  symptoms: string;
  /** Datos ya recolectados (equipo, logs, KQL, IoCs...). */
  dataAvailable?: string;
  /** Pasos esperados de diagnóstico/investigación (guía de estudio). */
  troubleshooting?: string;
  /** Resolución esperada (guía de estudio). */
  resolution?: string;
  /** A quién/cuándo escalar. */
  escalation?: string;
  /** Id del artículo de KB relacionado. */
  kbRef?: string;
  /** Habilidad práctica que entrena el ticket. */
  skill?: string;
  /** Evidencia sugerida a registrar. */
  evidence?: string;
  /** Estado de trabajo del usuario. */
  status: SimTicketStatus;
  /** Nota de cierre/resolución escrita por el usuario. */
  statusNote?: string;
  /** True = forma parte del proyecto final del pilar. */
  isFinalProject?: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  /** Entorno/torre del ticket (HelpDesk no lo tiene). */
  environment?: string;
}

/** Metadatos de un entorno/torre: etiqueta larga, corta y clases del chip. */
export interface SimEnvMeta {
  label: string;
  short: string;
  chip: string;
}

/** Paso de un artículo de KB (contrato común de los 4 datasets). */
export interface SimKbStep {
  title: string;
  detail?: string;
  /** Comando/query educativo — texto plano. */
  command?: string;
}

/** Artículo de KB (contrato común de los 4 datasets; HD sin environment). */
export interface SimKbArticle {
  id: string;
  title: string;
  category: string;
  /** Entorno editorial del artículo (HelpDesk no lo tiene). */
  environment?: string;
  /** Cuándo aplica el artículo (síntomas). */
  symptoms: string;
  /** Causa(s) típica(s). */
  cause: string;
  steps: SimKbStep[];
  /** Cómo confirmar que quedó resuelto. */
  verification?: string;
  escalation?: string;
  /** Nombres de términos del glosario relacionados. */
  relatedTerms?: string[];
  /** Ids de tickets del dataset que lo referencian. */
  relatedTickets?: string[];
}

/* ------------------------------------------------------------------ */
/* Pestaña 2 — proyecto final / semana del pilar                       */
/* ------------------------------------------------------------------ */

/** Tema de un día del proyecto final (título + descripción de la sección). */
export interface SimDayLabel {
  day: number;
  title: string;
  theme: string;
}

/**
 * Configuración de la pestaña 2 (proyecto final). El día de cada ticket
 * se calcula con la fórmula común de las 4 vistas originales:
 *   n = parseInt(id.replace(idPrefix, ''), 10)   // 'iam-041' → 41
 *   día = clamp(1..5, floor((n - firstNumber) / perDay) + 1)
 * Deltas reales: IAM /^iam-/ 41 2 · SOC /^soc-/ 21 6 ·
 * SysAdmin /^sa-/ 27 6 · HelpDesk /^hdt-/ 19 6.
 */
export interface SimFinalTab {
  /** Etiqueta del botón de la pestaña ('Semana de Guardia'...). */
  label: string;
  /** Título del panel introductorio (h2 del intro). */
  heading: string;
  /** Párrafo introductorio (bajo el título). */
  intro: string;
  /** Temas por día (determina las secciones y su texto). */
  dayLabels: readonly SimDayLabel[];
  /** Regex que elimina el prefijo del id del seed ('/^iam-/'). */
  idPrefix: RegExp;
  /** Número del PRIMER ticket del proyecto final (iam-041 → 41). */
  firstNumber: number;
  /** Tickets del proyecto final por día (IAM 2, resto 6). */
  perDay: number;
}

/* ------------------------------------------------------------------ */
/* Export "Añadir a Notas" de la ficha                                 */
/* ------------------------------------------------------------------ */

/**
 * Etiquetas de la tabla HTML del export a Notas — SOC renombra 4 filas
 * ('Caso SOC' / 'Origen' / 'Reporte del origen' / 'Pasos de
 * investigación (guía)') y HelpDesk no lleva fila de entorno.
 */
export interface SimNoteExport {
  /** Etiqueta de la fila del número ('Número' | 'Caso SOC'). */
  numberRow: string;
  /** Etiqueta de la fila del solicitante ('Solicitante' | 'Origen'). */
  requesterRow: string;
  /** Etiqueta de la fila del reporte ('Reporte del usuario' | '...del origen'). */
  descriptionRow: string;
  /** Etiqueta de la fila de la guía ('Pasos de diagnóstico (guía)' | '...investigación...'). */
  troubleshootingRow: string;
  /** Prefijo del título de la nota ('IAM' / 'SysAdmin Ops' / 'SOC Blue Team' / 'Service Desk'). */
  titlePrefix: string;
  /**
   * Fila de entorno/torre — ausente en HelpDesk. `useMetaLabel` usa la
   * etiqueta larga del ENV_META (SOC 'Torre' + label) en vez del valor
   * crudo del enum (IAM/SysAdmin 'Entorno' + raw).
   */
  envRow?: { label: string; useMetaLabel: boolean };
}

/* ------------------------------------------------------------------ */
/* Config del pilar                                                    */
/* ------------------------------------------------------------------ */

/** Acento visual del pilar (HelpDesk blue, resto cyan). */
export type SimAccent = 'blue' | 'cyan';

/**
 * Configuración completa de un simulador de tickets. Cada vista (IamView,
 * SocView, SysAdminView, HelpDeskView) es hoy un módulo fino que declara
 * su `SimConfig<XTicket>` y renderiza `<TicketSimulatorView config={...}/>`.
 */
export interface SimConfig<T extends SimTicket> {
  /* --- Datos + persistencia + navegación --------------------------- */
  /** Tabla Dexie del pilar (persiste status + statusNote; viaja en backups). */
  table: Table<T, string>;
  /** Hub de selección del pilar (zustand — 3 selectores atómicos). */
  useStore: UseBoundStore<StoreApi<TicketSelectionStore>>;
  /** Dataset KB del pilar (solo lectura, viene de fábrica). */
  kb: {
    articles: readonly SimKbArticle[];
    byId: ReadonlyMap<string, SimKbArticle>;
  };
  /**
   * Metadatos del entorno EDITORIAL de la KB (chips de la lista y del
   * detalle). IAM usa un mapa propio (sus torres editoriales difieren de
   * las de los tickets: AD / Entra ID / SaaS / PAM / Gobernanza);
   * SysAdmin/SOC reutilizan `envMeta`; HelpDesk no lo define (KB sin
   * chips de entorno y cabecera con categoría completa). Su presencia
   * además habilita la búsqueda por entorno en la KB.
   */
  kbEnvMeta?: Record<string, SimEnvMeta>;
  /** Categorías del pilar (select de la cola). */
  categories: readonly string[];
  /** Prefijo de categoría recortado en la UI ('IAM - ', 'SysAdmin - '...). */
  categoryPrefix: string;

  /* --- Entornos/torres (HelpDesk no define `env`) ------------------ */
  /** Entornos/torres de los TICKETS del pilar — chips de la fila y la
   *  ficha, contadores y filtro multi-selección de la cola. */
  env?: {
    /** Metadatos por entorno (label larga, corta y clases del chip). */
    meta: Record<string, SimEnvMeta>;
    /** Orden fijo de los chips de entorno (filtro de la cola). */
    order: readonly string[];
    /** Etiqueta del filtro ('Entorno:' | 'Torre:'). */
    filterLabel: string;
    /** Etiqueta del chip "todos" ('Todos los entornos' | 'Todas las torres'). */
    allLabel: string;
  };

  /* --- Tipos + acento + proyecto final ------------------------------ */
  /** true = el pilar soporta type 'cambio' (chip naranja + filtro). */
  hasCambio: boolean;
  /** Acento visual (HelpDesk 'blue', SysAdmin/SOC/IAM 'cyan'). */
  accent: SimAccent;
  /** Texto del chip de proyecto final en la fila ('PF' / 'SG' / 'PS'). */
  finalChipLabel: string;
  /** title del chip de la fila (solo SOC lo lleva). */
  finalChipTitle?: string;
  /** Prefijo del chip de proyecto final en la ficha ('AR' / 'SG' / 'Primera semana SOC' / 'Proyecto Final'). */
  finalDetailLabel: string;
  /** Pestaña 2 completa (label, intro, días, fórmula del día). */
  finalTab: SimFinalTab;

  /* --- Sustantivo del dominio (deriva ~10 strings) ------------------ */
  /** 'ticket' (HelpDesk/SysAdmin/IAM) | 'caso' (SOC). */
  itemNoun: 'ticket' | 'caso';

  /* --- Identificadores de UI ---------------------------------------- */
  /** Prefijo de ids DOM ('iam' → iam-note-XXX / iam-cat). */
  idPrefix: string;

  /* --- Header + pestañas -------------------------------------------- */
  /** Icono del h1 (Headset/Server/ShieldAlert con su acento). */
  headerIcon: ReactNode;
  /** Título del h1 ('IAM — Simulador de Identity & Access Management'...). */
  headerTitle: string;
  /** Línea de empresa del subtítulo ('Nexora S.A. — Equipo IAM (empresa ficticia)'...). */
  headerCompany: string;
  /** Etiqueta del contador de proyecto final del subtítulo ('Access Review' / 'semana de guardia'...). */
  headerFinalLabel: string;
  /** aria-label del tablist ('Secciones de IAM'...). */
  tablistAriaLabel: string;
  /** Icono de la pestaña 1 (TicketIcon | Radar). */
  queueTabIcon: ReactNode;
  /** Etiqueta de la pestaña 1 ('Cola IAM' / 'Cola de Guardia'...). */
  queueTabLabel: string;
  /** Etiqueta de la pestaña 3 ('Base de Conocimiento' / 'Base de conocimiento'). */
  kbTabLabel: string;

  /* --- Cola (filtros + lista) --------------------------------------- */
  /** Placeholder del buscador de la cola. */
  searchPlaceholder: string;
  /** aria-label del buscador de la cola. */
  searchAriaLabel: string;
  /** Etiqueta del chip de ámbito del proyecto final ('Semana de guardia'...). */
  scopeFinalLabel: string;
  /** max-h de la lista de la cola (HelpDesk 320px — sin fila de entornos; resto 380px). */
  queueListMaxH: string;
  /** Icono del estado vacío del detalle (TicketIcon | Radar). */
  queueEmptyIcon: ReactNode;
  /** Pista del estado vacío del detalle ('El flujo es el de un día real de IAM: ...'). */
  queueEmptyHint: string;

  /* --- Ficha del ticket --------------------------------------------- */
  /** Etiqueta del solicitante ('Solicitante' | 'Origen'). */
  requesterLabel: string;
  /** Título del bloque del reporte ('Lo que reporta el usuario' | '...el origen'). */
  reportLabel: string;
  /** Párrafo introductorio del modo estudio (con el "criterio" del pilar). */
  studyIntro: string;
  /** Título de la RevealCard de la guía ('Pasos de diagnóstico (guía)' | 'Pasos de investigación (guía)'). */
  troubleshootTitle: string;
  /** Icono de esa RevealCard (Wrench | SearchCode). */
  troubleshootIcon: ReactNode;
  /** closedHint de esa RevealCard ('Tu plan de troubleshooting/investigación — ...'). */
  troubleshootHint: string;
  /** Placeholder del textarea de la nota de cierre. */
  notePlaceholder: string;
  /** Mensaje de validación al resolver sin nota suficiente (SOC lo extiende). */
  resolveError: string;
  /** Etiquetas del export "Añadir a Notas". */
  note: SimNoteExport;

  /* --- KB ------------------------------------------------------------ */
  /** Icono del encabezado de pasos de la KB (Wrench | SearchCode). */
  kbStepsIcon: ReactNode;
}
