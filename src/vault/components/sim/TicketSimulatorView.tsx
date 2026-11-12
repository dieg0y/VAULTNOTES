'use client';

/**
 * TicketSimulatorView — MOTOR compartido de los 4 simuladores de tickets
 * (HelpDesk / SysAdmin / SOC / IAM).
 *
 * Refactor R4: las 4 vistas eran una familia copy-paste (~1300 líneas
 * cada una, duplicación 79-91% — HelpDesk → clon SysAdmin → adaptación
 * SOC → clon IAM). Este archivo consolida el CUERPO CANÓNICO (tomado de
 * IamView, el más reciente y con más fixes de QA) y TODO lo que varía
 * entre pilares viaja en `SimConfig<T>` (sim/types.ts): tabla Dexie, hub
 * de selección, dataset KB, entornos/torres, categorías, textos y acento.
 * Las vistas son módulos finos que solo declaran su config.
 *
 * Estructura (idéntica a las vistas originales):
 *  · COLA — master-detail: filtros (estado/prioridad/tipo/entorno/
 *    categoría/ámbito/búsqueda/orden) + ficha del ticket. La ficha
 *    separa lo que el usuario VE al abrir el ticket (descripción/
 *    síntomas/datos) de la GUÍA DE ESTUDIO (pasos de diagnóstico,
 *    resolución y escalación), OCULTA tras botones de revelado: primero
 *    intenta resolver, luego contrasta. El trabajo persiste en la tabla
 *    Dexie del pilar (status + statusNote) → viaja en los backups ZIP.
 *  · PROYECTO FINAL — tickets del proyecto final del pilar agrupados por
 *    día con progreso por día. Clic → salta a la cola con el ticket
 *    seleccionado.
 *  · BASE DE CONOCIMIENTO — artículos del dataset (solo lectura) con
 *    buscador, pasos con comandos, términos de glosario enlazados y
 *    tickets relacionados.
 *
 * Unificaciones de fixes "drifted" (la mejor versión, aplicada a los 4):
 *  1. Default ESTABLE del useLiveQuery (EMPTY_TICKETS del módulo —
 *     SysAdmin/HelpDesk pasaban un [] inline nuevo en cada render).
 *  2. Eliminado el re-filtro redundante de isDeleted tras la query de
 *     Dexie (que ya lo excluye) — patrón `const activeTickets = tickets`
 *     que traía IamView.
 *  3. El contenedor del filtro de entorno/torre lleva max-h-[84px] +
 *     overflow-y-auto (solo lo tenía SocView — los chips pueden envolver
 *     en varias filas y empujar el header).
 *
 * PERF: TicketRow es React.memo y recibe `onSelect: (ticketId) => void`
 * — la cola pasa el `selectTicket` estable del store (antes cada fila
 * llevaba una arrow inline y TODAS las filas se re-renderizaban con cada
 * tecla del buscador).
 *
 * Cross-links: un ticket con kbRef abre el artículo KB; la KB abre
 * tickets; los relatedTerms navegan al Glosario (prop
 * onOpenGlossaryTerm). El hub zustand del pilar coordina los deep-links
 * desde fuera (Dashboard, roadmap, Ctrl+K).
 *
 * 100% offline. Todo el texto se renderiza como TEXTO (sin HTML salvo la
 * tabla del export a Notas, que se escapa con escapeHtml).
 */

import React, { useMemo, useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { UpdateSpec } from 'dexie';
import {
  CalendarCheck,
  BookOpen,
  Search,
  Clock,
  Check,
  Lock,
  ArrowUp,
  RotateCcw,
  ChevronRight,
  Eye,
  EyeOff,
  FileText as FileTextIcon,
  CircleAlert,
  Lightbulb,
  Siren,
  NotebookPen,
  Database,
  CheckCheck,
  ArrowLeft,
} from 'lucide-react';
import type { GlossaryTerm } from '../../types';
import { useNoteStore } from '../../store/noteStore';
import { escapeHtml } from '../../utils/escapeHtml';
import { buildNoteHtmlTable, CodeBlock, useAddToNoteToast } from '../tools/_shared';
import type {
  SimAccent,
  SimConfig,
  SimEnvMeta,
  SimFinalTab,
  SimKbArticle,
  SimTicket,
} from './types';

/* ------------------------------------------------------------------ */
/* Constantes + metadatos visuales (idénticos en los 4 pilares)        */
/* ------------------------------------------------------------------ */

const STATUS_META: Record<SimTicket['status'], { label: string; chip: string; icon: React.ReactNode }> = {
  nuevo: { label: 'Nuevo', chip: 'bg-sky-500/10 text-sky-400 border-sky-500/30', icon: <span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> },
  en_progreso: { label: 'En progreso', chip: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: <Clock className="w-3 h-3" /> },
  resuelto: { label: 'Resuelto', chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: <Check className="w-3 h-3" /> },
  escalado: { label: 'Escalado', chip: 'bg-violet-500/10 text-violet-400 border-violet-500/30', icon: <ArrowUp className="w-3 h-3" /> },
  cerrado: { label: 'Cerrado', chip: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30', icon: <Lock className="w-3 h-3" /> },
};

const PRIORITY_CHIP: Record<string, string> = {
  P1: 'bg-red-500/10 text-red-400 border-red-500/30',
  P2: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  P3: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  P4: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
};

/** Metadatos del TIPO de ticket — 'cambio' (solo SysAdmin/IAM) con chip naranja. */
const TYPE_META: Record<string, { label: string; chip: string }> = {
  incidente: { label: 'Incidente', chip: 'bg-[#161616] text-[#999] border-[#262626]' },
  solicitud: { label: 'Solicitud', chip: 'bg-[#161616] text-[#999] border-[#262626]' },
  cambio: { label: 'Cambio', chip: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
};

/** Estados que cuentan como "trabajado" (práctica completada). */
const WORKED_STATUSES: SimTicket['status'][] = ['resuelto', 'escalado', 'cerrado'];
/** Estados abiertos (trabajo pendiente). */
const OPEN_STATUSES: SimTicket['status'][] = ['nuevo', 'en_progreso'];

/** Orden de prioridad para el sort (P1 primero). */
const PRIO_ORDER: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };

/** Default ESTABLE del useLiveQuery de la cola (patrón EMPTY_* — evita
 *  un [] inline nuevo en cada render). `never[]` es asignable al T[] de
 *  cualquier pilar. */
const EMPTY_TICKETS: never[] = [];

/** Clases por acento del pilar (HelpDesk 'blue', resto 'cyan'). */
const ACCENT: Record<SimAccent, {
  /** Chip de filtro activo (default). */
  chip: string;
  /** Pestaña activa. */
  tab: string;
  /** Anillo de foco de inputs/select. */
  focus: string;
  /** Icono de "Tu trabajo" / "Añadir a Notas". */
  icon: string;
  /** Label de la sección "Tu trabajo". */
  workLabel: string;
  /** Hover de botones de nota / términos de glosario. */
  hoverBorder: string;
  /** Fila de la cola activa. */
  rowActive: string;
  /** Enlace "Limpiar filtros". */
  link: string;
  /** Default del barCls del ProgressBar. */
  bar: string;
}> = {
  blue: {
    chip: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
    tab: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    focus: 'focus:border-blue-500/50',
    icon: 'text-blue-400',
    workLabel: 'text-blue-400/80',
    hoverBorder: 'hover:border-blue-500/40',
    rowActive: 'border-blue-500/40 bg-blue-500/10',
    link: 'text-blue-400',
    bar: 'bg-blue-600',
  },
  cyan: {
    chip: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
    tab: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    focus: 'focus:border-cyan-500/50',
    icon: 'text-cyan-400',
    workLabel: 'text-cyan-400/80',
    hoverBorder: 'hover:border-cyan-500/40',
    rowActive: 'border-cyan-500/40 bg-cyan-500/10',
    link: 'text-cyan-400',
    bar: 'bg-cyan-600',
  },
};

/** Día (1..5) del ticket del proyecto final — fórmula común de los 4
 *  pilares (solo cambian idPrefix / firstNumber / perDay, ver SimFinalTab). */
function dayOfFinalTicket(t: SimTicket, finalTab: SimFinalTab): number {
  const n = parseInt(t.id.replace(finalTab.idPrefix, ''), 10);
  if (Number.isNaN(n)) return 1;
  return Math.min(5, Math.max(1, Math.floor((n - finalTab.firstNumber) / finalTab.perDay) + 1));
}

/** Plural del sustantivo del pilar ('ticket' → 'tickets', 'caso' → 'casos'). */
const nounPlural = (n: 'ticket' | 'caso') => `${n}s`;
/** Plural capitalizado ('Tickets' / 'Casos'). */
const nounPluralCap = (n: 'ticket' | 'caso') => n.charAt(0).toUpperCase() + n.slice(1) + 's';

/** Acentos del chip de filtro: los especiales (violeta/verde/naranja para
 *  estados, resueltos y cambios) más el acento del pilar (default). */
type FilterChipAccent = SimAccent | 'violet' | 'emerald' | 'orange';

/* ------------------------------------------------------------------ */
/* Subcomponentes visuales                                             */
/* ------------------------------------------------------------------ */

const PrioChip: React.FC<{ p: string }> = ({ p }) => (
  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${PRIORITY_CHIP[p]}`}>{p}</span>
);

const StatusChip: React.FC<{ s: SimTicket['status'] }> = ({ s }) => {
  const meta = STATUS_META[s];
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${meta.chip}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
};

/** Chip de entorno/torre — mismo estilo que el de prioridad; el mapa de
 *  metadatos llega por prop (tickets y KB pueden usar torres distintas). */
const EnvChip: React.FC<{ env: string; meta: Record<string, SimEnvMeta>; full?: boolean }> = ({ env, meta, full = false }) => {
  const m = meta[env];
  return (
    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${m.chip}`} title={m.label}>
      {full ? m.label : m.short}
    </span>
  );
};

const ProgressBar: React.FC<{ done: number; total: number; barCls?: string; className?: string; defaultBarCls: string }> = ({
  done,
  total,
  barCls,
  className = '',
  defaultBarCls,
}) => {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className={`h-1.5 rounded-full bg-[#1d1d1d] overflow-hidden ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-all duration-500 ${barCls ?? defaultBarCls}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

/** Renderiza una línea de texto con comandos 'entre comillas' como código inline. */
const LineWithCommands: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/('.*?')/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("'") && part.endsWith("'") && part.length > 2 ? (
          <code key={i} className="font-mono text-[10px] text-green-300 bg-[#0A0A0A] border border-[#262626] rounded px-1 py-0.5">
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

/** Bloque plegable de "modo estudio": el contenido se revela a demanda. */
const RevealCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  closedHint: string;
  children: React.ReactNode;
}> = ({ title, icon, open, onToggle, closedHint, children }) => (
  <section className={`rounded-lg border overflow-hidden transition-colors ${open ? 'border-[#333] bg-[#111]' : 'border-[#262626] bg-[#0D0D0D]'}`}>
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-[#161616] transition-colors cursor-pointer"
    >
      <span className="w-6 h-6 rounded bg-[#161616] border border-[#262626] flex items-center justify-center shrink-0 text-amber-400">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-white">{title}</span>
        {!open && <span className="block text-[10px] text-[#868686] mt-0.5 italic">{closedHint}</span>}
      </span>
      {open ? <EyeOff className="w-4 h-4 text-[#828282] shrink-0" /> : <Eye className="w-4 h-4 text-amber-400/80 shrink-0" />}
    </button>
    {open && <div className="px-3.5 pb-3.5 pt-1 border-t border-[#1a1a1a] flex flex-col gap-2">{children}</div>}
  </section>
);

/* ------------------------------------------------------------------ */
/* Fila de ticket (lista)                                              */
/* ------------------------------------------------------------------ */

/** Subconjunto de SimConfig que usa la fila (no genérico — así React.memo
 *  puede tiparse sin varianza de Tabla; la config del pilar lo satisface
 *  estructuralmente y es estable, por lo que el memo compara bien). */
interface TicketRowConfig {
  env?: { meta: Record<string, SimEnvMeta> };
  accent: SimAccent;
  categoryPrefix: string;
  finalChipLabel: string;
  finalChipTitle?: string;
}

interface TicketRowProps {
  config: TicketRowConfig;
  ticket: SimTicket;
  active: boolean;
  /** PERF R4: selección por id (estable) — la cola pasa el `selectTicket`
   *  del store directamente; antes cada fila llevaba una arrow inline y
   *  todas se re-renderizaban con cada tecla del buscador. */
  onSelect: (ticketId: string) => void;
}

const TicketRow = React.memo(function TicketRow({ config, ticket, active, onSelect }: TicketRowProps) {
  const accent = ACCENT[config.accent];
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(ticket.id)}
        aria-pressed={active}
        className={`w-full text-left px-2.5 py-2 rounded-md border transition-colors cursor-pointer flex flex-col gap-1 ${
          active
            ? accent.rowActive
            : ticket.isFinalProject
              ? 'border-[#262626] bg-[#0F0F0F] hover:border-[#333] hover:bg-[#161616]'
              : 'border-[#222] bg-[#0D0D0D] hover:border-[#333] hover:bg-[#161616]'
        }`}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-mono font-bold text-[#888] shrink-0">{ticket.number}</span>
          <PrioChip p={ticket.priority} />
          {config.env && ticket.environment !== undefined && <EnvChip env={ticket.environment} meta={config.env.meta} />}
          {ticket.type === 'cambio' && (
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${TYPE_META.cambio.chip}`}>{TYPE_META.cambio.label}</span>
          )}
          {ticket.isFinalProject && (
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded border bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30 shrink-0"
              title={config.finalChipTitle}
            >
              {config.finalChipLabel}
            </span>
          )}
          <span className={`ml-auto shrink-0 ${STATUS_META[ticket.status].chip} inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded border`}>
            {STATUS_META[ticket.status].icon}
          </span>
        </span>
        <span className={`text-xs leading-snug line-clamp-2 ${active ? 'text-white' : 'text-[#CCC]'}`}>{ticket.title}</span>
        <span className="text-[10px] text-[#828282] truncate">
          {ticket.requester} · {ticket.category.replace(config.categoryPrefix, '')}
        </span>
      </button>
    </li>
  );
});

/* ------------------------------------------------------------------ */
/* Ficha del ticket (detail)                                           */
/* ------------------------------------------------------------------ */

interface TicketDetailProps<T extends SimTicket> {
  config: SimConfig<T>;
  ticket: T;
  revealed: Set<string>;
  onToggleReveal: (key: string) => void;
  onBack: () => void;
  onOpenKb: (kbId: string) => void;
  onOpenGlossaryTerm: (termId: string) => void;
  glossaryByName: Map<string, string>;
}

function TicketDetail<T extends SimTicket>({
  config,
  ticket,
  revealed,
  onToggleReveal,
  onBack,
  onOpenKb,
  onOpenGlossaryTerm,
  glossaryByName,
}: TicketDetailProps<T>) {
  const accent = ACCENT[config.accent];
  const [noteDraft, setNoteDraft] = useState(ticket.statusNote ?? '');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [syncedNote, setSyncedNote] = useState(ticket.statusNote ?? '');
  const { addedToast, showToast } = useAddToNoteToast();
  const enqueueNote = useNoteStore((s) => s.enqueueNote);

  // Re-sincroniza el borrador cuando la nota cambia DESDE FUERA (backup /
  // import / otro dispositivo) — patrón oficial "adjust state during render"
  // (sin efecto). El cambio de ticket re-monta el componente vía `key`.
  const currentNote = ticket.statusNote ?? '';
  if (currentNote !== syncedNote) {
    setSyncedNote(currentNote);
    setNoteDraft(currentNote);
    setNoteError(null);
  }

  const kb = ticket.kbRef ? config.kb.byId.get(ticket.kbRef) : undefined;
  const isWorked = WORKED_STATUSES.includes(ticket.status);
  const noteOk = noteDraft.trim().length >= 10;

  const patch = (changes: Partial<Pick<T, 'status' | 'statusNote'>>) => {
    // R4: catch explícito — el update Dexie es fire-and-forget y no debe
    // dejar promesas rechazadas flotantes. El cast es inevitable: el
    // spread de un Partial<T> genérico no es probable-asignable al
    // UpdateSpec<T> de Dexie (KeyPaths diferidos); las 4 configs concretas
    // verifican exactamente el mismo literal que las vistas originales.
    config.table
      .update(ticket.id, { ...changes, updatedAt: new Date().toISOString() } as UpdateSpec<T>)
      .catch((e) => console.error('Error actualizando ticket:', e));
  };

  const handleResolve = () => {
    if (!noteOk) {
      setNoteError(config.resolveError);
      return;
    }
    setNoteError(null);
    patch({ status: 'resuelto', statusNote: noteDraft.trim() });
  };

  const handleEscalate = () => {
    if (!noteOk) {
      setNoteError('Antes de escalar documenta qué descartaste y qué evidencia entregas al equipo que recibe el caso.');
      return;
    }
    setNoteError(null);
    patch({ status: 'escalado', statusNote: noteDraft.trim() });
  };

  const handleSaveNote = () => {
    if (noteDraft.trim().length === 0) {
      setNoteError('La nota está vacía — escribe algo antes de guardar.');
      return;
    }
    setNoteError(null);
    patch({ statusNote: noteDraft.trim() });
    showToast();
  };

  const handleAddToNotes = () => {
    // Todos los valores del dataset se ESCAPAN antes de la tabla HTML —
    // by-construction anti-XSS (misma regla que las tools).
    const esc = (v: string) => escapeHtml(v);
    const rows: Array<[string, string]> = [
      [config.note.numberRow, esc(ticket.number)],
      ['Título', esc(ticket.title)],
      ['Categoría', esc(ticket.category + (ticket.subcategory ? ' · ' + ticket.subcategory : ''))],
      ['Tipo', TYPE_META[ticket.type].label],
    ];
    if (config.note.envRow && ticket.environment !== undefined) {
      // SOC usa la etiqueta larga del entorno ('Torre' + label); IAM/
      // SysAdmin el valor crudo ('Entorno' + raw); HelpDesk no lleva fila.
      // El ?? de cobertura nunca aplica (los enums de cada pilar cubren su
      // ENV_META al 100%).
      const envValue = config.note.envRow.useMetaLabel ? config.env?.meta[ticket.environment]?.label ?? ticket.environment : ticket.environment;
      rows.push([config.note.envRow.label, esc(envValue)]);
    }
    rows.push(
      ['Prioridad', `${ticket.priority} (impacto ${ticket.impact} · urgencia ${ticket.urgency})`],
      [config.note.requesterRow, esc(ticket.requester)],
      ['Estado', STATUS_META[ticket.status].label],
      [config.note.descriptionRow, esc(ticket.description)],
      ['Síntomas', esc(ticket.symptoms)]
    );
    if (ticket.dataAvailable) rows.push(['Datos disponibles', esc(ticket.dataAvailable)]);
    if (ticket.troubleshooting) rows.push([config.note.troubleshootingRow, esc(ticket.troubleshooting)]);
    if (ticket.resolution) rows.push(['Resolución esperada', esc(ticket.resolution)]);
    if (ticket.escalation) rows.push(['Escalación', esc(ticket.escalation)]);
    if (ticket.skill) rows.push(['Habilidad que entrena', esc(ticket.skill)]);
    if (ticket.evidence) rows.push(['Evidencia a registrar', esc(ticket.evidence)]);
    if (ticket.statusNote) rows.push(['Mi nota de trabajo', esc(ticket.statusNote)]);
    if (kb) rows.push(['KB relacionada', esc(kb.title + ' (' + kb.id + ')')]);
    rows.push(['Exportado', new Date().toLocaleString('es-CO')]);

    enqueueNote(`${config.note.titlePrefix} ${ticket.number} — ${ticket.title}`, buildNoteHtmlTable(rows));
    showToast();
  };

  const tKey = (k: string) => `${ticket.id}:${k}`;
  const itemNoun = config.itemNoun;

  return (
    <article className="flex flex-col gap-3 p-4 sm:p-5 max-w-3xl w-full" aria-label={`${itemNoun === 'caso' ? 'Caso' : 'Ticket'} ${ticket.number}`}>
      {/* Volver (móvil) */}
      <button
        type="button"
        onClick={onBack}
        className="lg:hidden inline-flex items-center gap-1.5 text-xs text-[#888] hover:text-white transition-colors cursor-pointer self-start"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Volver a la cola
      </button>

      {/* Cabecera */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono font-bold text-[#888]">{ticket.number}</span>
          <PrioChip p={ticket.priority} />
          <StatusChip s={ticket.status} />
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${TYPE_META[ticket.type].chip}`}>{TYPE_META[ticket.type].label}</span>
          {config.env && ticket.environment !== undefined && <EnvChip env={ticket.environment} meta={config.env.meta} full />}
          {ticket.isFinalProject && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded border bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30">
              {config.finalDetailLabel} · Día {dayOfFinalTicket(ticket, config.finalTab)}
            </span>
          )}
        </div>
        <h2 className="text-sm sm:text-base font-bold text-white leading-snug">{ticket.title}</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#858585]">
          <span>
            {config.requesterLabel}: <span className="text-[#999]">{ticket.requester}</span>
          </span>
          <span>
            Categoría: <span className="text-[#999]">{ticket.category.replace(config.categoryPrefix, '')}{ticket.subcategory ? ` · ${ticket.subcategory}` : ''}</span>
          </span>
          <span>
            Impacto <span className="text-[#999]">{ticket.impact}</span> · Urgencia <span className="text-[#999]">{ticket.urgency}</span>
          </span>
        </div>
      </header>

      {/* Lo que el usuario reporta — lo que VE al abrir el ticket */}
      <section className="flex flex-col gap-2.5">
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#828282] mb-1.5 flex items-center gap-1.5">
            <FileTextIcon className="w-3 h-3" /> {config.reportLabel}
          </p>
          <p className="text-xs text-[#BBB] italic leading-relaxed">&ldquo;{ticket.description}&rdquo;</p>
        </div>
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#828282] mb-1.5 flex items-center gap-1.5">
            <CircleAlert className="w-3 h-3" /> Síntomas observables
          </p>
          <p className="text-xs text-[#CCC] leading-relaxed">{ticket.symptoms}</p>
        </div>
        {ticket.dataAvailable && (
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#828282] mb-1.5 flex items-center gap-1.5">
              <Database className="w-3 h-3" /> Datos disponibles
            </p>
            <p className="text-xs text-[#CCC] leading-relaxed">{ticket.dataAvailable}</p>
          </div>
        )}
      </section>

      {/* MODO ESTUDIO — revelado progresivo */}
      <section className="flex flex-col gap-2.5" aria-label="Guía de estudio">
        <div className="flex items-center gap-2 px-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80">Modo estudio</p>
        </div>
        <p className="text-[10px] text-[#868686] leading-relaxed px-1 -mt-1.5">{config.studyIntro}</p>
        {ticket.troubleshooting && (
          <RevealCard
            title={config.troubleshootTitle}
            icon={config.troubleshootIcon}
            open={revealed.has(tKey('ts'))}
            onToggle={() => onToggleReveal(tKey('ts'))}
            closedHint={config.troubleshootHint}
          >
            <ol className="flex flex-col gap-1.5">
              {ticket.troubleshooting.split('\n').map((line, i) =>
                line.trim() ? (
                  <li key={i} className="text-xs text-[#CCC] leading-relaxed flex gap-2">
                    <span className="text-[10px] font-mono text-[#828282] shrink-0 mt-0.5">{i + 1}.</span>
                    <span>
                      <LineWithCommands text={line.replace(/^\d+\.\s*/, '')} />
                    </span>
                  </li>
                ) : null
              )}
            </ol>
          </RevealCard>
        )}
        {ticket.resolution && (
          <RevealCard
            title="Resolución esperada"
            icon={<CheckCheck className="w-3.5 h-3.5" />}
            open={revealed.has(tKey('res'))}
            onToggle={() => onToggleReveal(tKey('res'))}
            closedHint="¿Cómo cierras este caso? — ábrela solo cuando lo tengas"
          >
            <p className="text-xs text-[#CCC] leading-relaxed">{ticket.resolution}</p>
          </RevealCard>
        )}
        {ticket.escalation && (
          <RevealCard
            title="Cuándo escalar y a quién"
            icon={<Siren className="w-3.5 h-3.5" />}
            open={revealed.has(tKey('esc'))}
            onToggle={() => onToggleReveal(tKey('esc'))}
            closedHint="¿Es tu caso o se escala? — decide antes de abrir"
          >
            <p className="text-xs text-[#CCC] leading-relaxed">{ticket.escalation}</p>
          </RevealCard>
        )}
        {(ticket.skill || ticket.evidence) && (
          <div className="grid sm:grid-cols-2 gap-2.5">
            {ticket.skill && (
              <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#828282] mb-1">Habilidad que entrena</p>
                <p className="text-[11px] text-[#CCC] leading-relaxed">{ticket.skill}</p>
              </div>
            )}
            {ticket.evidence && (
              <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#828282] mb-1">Evidencia a registrar</p>
                <p className="text-[11px] text-[#CCC] leading-relaxed">{ticket.evidence}</p>
              </div>
            )}
          </div>
        )}
        {kb && (
          <button
            type="button"
            onClick={() => onOpenKb(kb.id)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-left transition-colors cursor-pointer group"
            title="Abrir el artículo de la Base de Conocimiento relacionado"
          >
            <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">KB relacionada</span>
              <span className="block text-xs text-[#CCC] truncate">{kb.title}</span>
            </span>
            <ChevronRight className="w-4 h-4 text-[#828282] group-hover:text-emerald-400 shrink-0 transition-colors" />
          </button>
        )}
        {kb?.relatedTerms && kb.relatedTerms.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-1">
            <span className="text-[10px] text-[#828282]">Glosario:</span>
            {kb.relatedTerms.map((name) => {
              const termId = glossaryByName.get(name);
              return termId ? (
                <button
                  key={name}
                  type="button"
                  onClick={() => onOpenGlossaryTerm(termId)}
                  className={`text-[10px] px-1.5 py-0.5 rounded border border-[#262626] bg-[#161616] text-[#BBB] hover:text-white ${accent.hoverBorder} transition-colors cursor-pointer`}
                  title={`Abrir "${name}" en el Glosario`}
                >
                  {name}
                </button>
              ) : (
                <span key={name} className="text-[10px] px-1.5 py-0.5 rounded border border-[#222] bg-[#111] text-[#868686]">
                  {name}
                </span>
              );
            })}
          </div>
        )}
      </section>

      {/* TRABAJO — flujo de estados + nota de cierre */}
      <section className="flex flex-col gap-2.5" aria-label={`Tu trabajo en el ${itemNoun}`}>
        <div className="flex items-center gap-2 px-1">
          <NotebookPen className={`w-3.5 h-3.5 ${accent.icon}`} />
          <p className={`text-[10px] font-bold uppercase tracking-widest ${accent.workLabel}`}>Tu trabajo</p>
        </div>
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-3.5 flex flex-col gap-3">
          {/* Flujo */}
          <div className="flex flex-wrap gap-2">
            {ticket.status === 'nuevo' && (
              <button
                type="button"
                onClick={() => patch({ status: 'en_progreso' })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-300 transition-colors cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" /> Empezar a trabajar
              </button>
            )}
            {ticket.status === 'en_progreso' && (
              <>
                <button
                  type="button"
                  onClick={handleResolve}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-300 transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Resolver
                </button>
                <button
                  type="button"
                  onClick={handleEscalate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 text-xs font-semibold text-violet-300 transition-colors cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" /> Escalar
                </button>
              </>
            )}
            {(ticket.status === 'resuelto' || ticket.status === 'escalado') && (
              <>
                <button
                  type="button"
                  onClick={() => patch({ status: 'cerrado' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-zinc-500/40 bg-zinc-500/10 hover:bg-zinc-500/20 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" /> Cerrar {itemNoun}
                </button>
                <button
                  type="button"
                  onClick={() => patch({ status: 'en_progreso' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#262626] bg-[#161616] hover:border-[#333] text-xs font-semibold text-[#BBB] hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reabrir
                </button>
              </>
            )}
            {ticket.status === 'cerrado' && (
              <button
                type="button"
                onClick={() => patch({ status: 'en_progreso' })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#262626] bg-[#161616] hover:border-[#333] text-xs font-semibold text-[#BBB] hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reabrir (practicar de nuevo)
              </button>
            )}
          </div>

          {/* Nota de cierre */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${config.idPrefix}-note-${ticket.id}`} className="text-[10px] font-bold uppercase tracking-widest text-[#828282]">
              {isWorked || ticket.statusNote ? 'Nota de cierre (tu evidencia)' : 'Nota de cierre — requerida para resolver o escalar'}
            </label>
            <textarea
              id={`${config.idPrefix}-note-${ticket.id}`}
              value={noteDraft}
              onChange={(e) => {
                setNoteDraft(e.target.value);
                if (noteError) setNoteError(null);
              }}
              placeholder={config.notePlaceholder}
              rows={3}
              maxLength={4000}
              className={`w-full bg-[#161616] border border-[#262626] rounded-md px-3 py-2 text-xs text-[#DDD] placeholder:text-[#828282] focus:outline-none ${accent.focus} resize-y font-mono`}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-[#828282]">{noteDraft.trim().length}/4000 · mínimo 10 para cerrar</span>
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={noteDraft.trim().length === 0}
                className={`px-2.5 py-1 rounded border border-[#262626] bg-[#161616] ${accent.hoverBorder} text-[10px] font-semibold text-[#BBB] hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                Guardar nota
              </button>
            </div>
            {noteError && (
              <p role="alert" className="text-[10px] text-red-400 leading-relaxed bg-red-500/5 border border-red-500/20 rounded px-2.5 py-1.5">
                {noteError}
              </p>
            )}
          </div>

          {/* Export */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-[#1a1a1a]">
            <button
              type="button"
              onClick={handleAddToNotes}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#262626] bg-[#161616] ${accent.hoverBorder} text-xs font-semibold text-[#E5E5E5] hover:text-white transition-colors cursor-pointer`}
              title={`Exportar el ${itemNoun} completo con tu nota como tabla en una Nota nueva`}
            >
              <NotebookPen className={`w-3.5 h-3.5 ${accent.icon}`} /> Añadir a Notas
            </button>
          </div>
        </div>
      </section>

      {/* Toast */}
      {addedToast && (
        <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#161616] border border-[#333] text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          Enviado a Notas — elige dónde guardarlo
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Pestaña KB                                                          */
/* ------------------------------------------------------------------ */

interface KbTabProps<T extends SimTicket> {
  config: SimConfig<T>;
  selectedKbId: string | null;
  onSelectKb: (id: string | null) => void;
  onOpenTicket: (ticketId: string) => void;
  onOpenGlossaryTerm: (termId: string) => void;
  glossaryByName: Map<string, string>;
  ticketsById: ReadonlyMap<string, SimTicket>;
}

function KbTab<T extends SimTicket>({ config, selectedKbId, onSelectKb, onOpenTicket, onOpenGlossaryTerm, glossaryByName, ticketsById }: KbTabProps<T>) {
  const accent = ACCENT[config.accent];
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!query) return config.kb.articles;
    return config.kb.articles.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.category.toLowerCase().includes(query) ||
        // HelpDesk no tiene entorno en sus artículos (no se busca).
        (config.kbEnvMeta ? (a.environment ?? '').toLowerCase().includes(query) : false) ||
        a.symptoms.toLowerCase().includes(query) ||
        a.cause.toLowerCase().includes(query)
    );
  }, [query, config]);

  const selected = selectedKbId ? config.kb.byId.get(selectedKbId) : undefined;

  return (
    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
      {/* Lista */}
      <div className={`flex flex-col min-h-0 border-r border-[#262626] ${selected ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-3 border-b border-[#1a1a1a]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#828282]" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar artículo (síntomas, causa…)"
              aria-label="Buscar en la Base de Conocimiento"
              className={`w-full bg-[#161616] border border-[#262626] rounded-md pl-8 pr-3 py-2 text-xs text-[#DDD] placeholder:text-[#828282] focus:outline-none ${accent.focus}`}
            />
          </div>
          <p className="text-[10px] text-[#828282] mt-2">
            {filtered.length} de {config.kb.articles.length} artículos
          </p>
        </div>
        <ul className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 max-h-[70vh] lg:max-h-none">
          {filtered.map((a: SimKbArticle) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onSelectKb(a.id)}
                aria-pressed={selectedKbId === a.id}
                className={`w-full text-left px-2.5 py-2 rounded-md border transition-colors cursor-pointer ${
                  selectedKbId === a.id ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-[#222] bg-[#0D0D0D] hover:border-[#333] hover:bg-[#161616]'
                }`}
              >
                <span className="block text-xs text-[#CCC] leading-snug">{a.title}</span>
                {config.kbEnvMeta && a.environment !== undefined ? (
                  <span className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-[#828282]">{a.category.replace(config.categoryPrefix, '')}</span>
                    <EnvChip env={a.environment} meta={config.kbEnvMeta} />
                  </span>
                ) : (
                  <span className="block text-[10px] text-[#828282] mt-0.5">{a.category.replace(config.categoryPrefix, '')}</span>
                )}
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="text-xs text-[#868686] p-3 text-center">Sin resultados para &ldquo;{q}&rdquo;</li>}
        </ul>
      </div>

      {/* Detalle */}
      <div className={`flex flex-col min-h-0 overflow-y-auto ${selected ? 'flex' : 'hidden lg:flex'}`}>
        {selected ? (
          <article className="p-4 sm:p-5 max-w-3xl w-full flex flex-col gap-3" aria-label={selected.title}>
            <button
              type="button"
              onClick={() => onSelectKb(null)}
              className="lg:hidden inline-flex items-center gap-1.5 text-xs text-[#888] hover:text-white transition-colors cursor-pointer self-start"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver a la KB
            </button>
            <header className="flex flex-col gap-2">
              {config.kbEnvMeta && selected.environment !== undefined ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    {selected.category.replace(config.categoryPrefix, '')}
                  </span>
                  <EnvChip env={selected.environment} meta={config.kbEnvMeta} full />
                </div>
              ) : (
                /* Sin entornos editoriales (HelpDesk): categoría completa y
                 * chip pegado al título (self-start), como la vista original. */
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 self-start">
                  {selected.category}
                </span>
              )}
              <h2 className="text-sm sm:text-base font-bold text-white leading-snug">{selected.title}</h2>
            </header>

            <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#828282] mb-1.5 flex items-center gap-1.5">
                <CircleAlert className="w-3 h-3" /> Cuándo aplica (síntomas)
              </p>
              <p className="text-xs text-[#CCC] leading-relaxed">{selected.symptoms}</p>
            </div>
            <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#828282] mb-1.5 flex items-center gap-1.5">
                <Lightbulb className="w-3 h-3" /> Causa típica
              </p>
              <p className="text-xs text-[#CCC] leading-relaxed">{selected.cause}</p>
            </div>

            <section className="flex flex-col gap-2" aria-label="Pasos">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#828282] px-1 flex items-center gap-1.5">
                {config.kbStepsIcon} Pasos ({selected.steps.length})
              </p>
              <ol className="flex flex-col gap-2">
                {selected.steps.map((s, i) => (
                  <li key={i} className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-3 flex flex-col gap-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-mono font-bold text-[#828282] shrink-0">{i + 1}.</span>
                      <span className="text-xs font-semibold text-white leading-snug">{s.title}</span>
                    </div>
                    {s.detail && <p className="text-xs text-[#BBB] leading-relaxed pl-5">{s.detail}</p>}
                    {s.command && (
                      <div className="pl-5">
                        <CodeBlock code={s.command} />
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            {selected.verification && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80 mb-1.5">Verificación</p>
                <p className="text-xs text-[#CCC] leading-relaxed">{selected.verification}</p>
              </div>
            )}
            {selected.escalation && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80 mb-1.5">Cuándo escalar</p>
                <p className="text-xs text-[#CCC] leading-relaxed">{selected.escalation}</p>
              </div>
            )}

            {selected.relatedTerms && selected.relatedTerms.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 px-1">
                <span className="text-[10px] text-[#828282]">Glosario:</span>
                {selected.relatedTerms.map((name) => {
                  const termId = glossaryByName.get(name);
                  return termId ? (
                    <button
                      key={name}
                      type="button"
                      onClick={() => onOpenGlossaryTerm(termId)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border border-[#262626] bg-[#161616] text-[#BBB] hover:text-white ${accent.hoverBorder} transition-colors cursor-pointer`}
                      title={`Abrir "${name}" en el Glosario`}
                    >
                      {name}
                    </button>
                  ) : (
                    <span key={name} className="text-[10px] px-1.5 py-0.5 rounded border border-[#222] bg-[#111] text-[#868686]">
                      {name}
                    </span>
                  );
                })}
              </div>
            )}

            {selected.relatedTickets && selected.relatedTickets.length > 0 && (
              <div className="flex flex-col gap-1.5 px-1">
                <span className="text-[10px] text-[#828282]">{nounPluralCap(config.itemNoun)} del dataset que usan este artículo:</span>
                <div className="flex flex-col gap-1">
                  {selected.relatedTickets.map((tid) => {
                    const t = ticketsById.get(tid);
                    if (!t) return null;
                    return (
                      <button
                        key={tid}
                        type="button"
                        onClick={() => onOpenTicket(tid)}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-[#222] bg-[#0D0D0D] hover:border-[#333] hover:bg-[#161616] text-left transition-colors cursor-pointer"
                      >
                        <span className="text-[10px] font-mono font-bold text-[#888] shrink-0">{t.number}</span>
                        <PrioChip p={t.priority} />
                        <span className="text-[11px] text-[#CCC] truncate">{t.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </article>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <BookOpen className="w-8 h-8 text-[#333]" />
            <p className="text-xs text-[#868686]">Selecciona un artículo de la Base de Conocimiento</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vista principal (motor)                                             */
/* ------------------------------------------------------------------ */

export interface TicketSimulatorViewProps<T extends SimTicket> {
  /** Config del pilar (datos + textos + acento). */
  config: SimConfig<T>;
  /** Términos del glosario (para enlazar relatedTerms de la KB por nombre). */
  glossaryTerms: GlossaryTerm[];
  /** Abre un término del glosario (navega a la sección Glosario). */
  onOpenGlossaryTerm: (termId: string) => void;
}

/** Ids internos de pestañas (no se renderizan — cada pilar les llamaba
 *  'guardia'/'semana'/'project' en su versión original). */
type TabId = 'queue' | 'final' | 'kb';
type StatusFilter = 'all' | SimTicket['status'];
type ScopeFilter = 'all' | 'final' | 'general';
type TypeFilter = 'all' | string;
type SortMode = 'number' | 'priority';

export function TicketSimulatorView<T extends SimTicket>({ config, glossaryTerms, onOpenGlossaryTerm }: TicketSimulatorViewProps<T>) {
  const accent = ACCENT[config.accent];
  const itemNoun = config.itemNoun;
  const [tab, setTab] = useState<TabId>('queue');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [envFilter, setEnvFilter] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<SortMode>('number');
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);

  // Deep-links del store del pilar (Dashboard / KB desde un ticket).
  const selectedTicketId = config.useStore((s) => s.selectedTicketId);
  const selectTicket = config.useStore((s) => s.selectTicket);
  const clearSelectedTicket = config.useStore((s) => s.clearSelectedTicket);

  const tickets = useLiveQuery(() => config.table.filter((t) => !t.isDeleted).toArray(), [], EMPTY_TICKETS);

  // La query ya excluye isDeleted — no hace falta re-filtrar aquí (fix
  // R4 unificado: antes 3 de las 4 vistas re-filtraban en un useMemo).
  const activeTickets: T[] = tickets;

  // Dos modos de orden: por número (histórico) o por prioridad (P1 → P4, y
  // dentro de cada prioridad por número — útil para trabajar la cola como
  // se haría en un día real del dominio).
  const sorted = useMemo(
    () =>
      [...activeTickets].sort((a, b) =>
        sortMode === 'priority'
          ? PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority] || a.number.localeCompare(b.number)
          : a.number.localeCompare(b.number)
      ),
    [activeTickets, sortMode]
  );

  const stats = useMemo(() => {
    const byStatus: Record<SimTicket['status'], number> = { nuevo: 0, en_progreso: 0, resuelto: 0, cerrado: 0, escalado: 0 };
    const byType: Record<string, number> = { incidente: 0, solicitud: 0, cambio: 0 };
    const byEnvironment: Record<string, number> = {};
    if (config.env) for (const e of config.env.order) byEnvironment[e] = 0;
    let worked = 0;
    let open = 0;
    let finalDone = 0;
    let finalTotal = 0;
    for (const t of activeTickets) {
      byStatus[t.status]++;
      byType[t.type] = (byType[t.type] ?? 0) + 1;
      if (config.env && t.environment !== undefined) byEnvironment[t.environment] = (byEnvironment[t.environment] ?? 0) + 1;
      if (WORKED_STATUSES.includes(t.status)) worked++;
      if (OPEN_STATUSES.includes(t.status)) open++;
      if (t.isFinalProject) {
        finalTotal++;
        if (WORKED_STATUSES.includes(t.status)) finalDone++;
      }
    }
    return { byStatus, byType, byEnvironment, worked, open, finalDone, finalTotal, total: activeTickets.length };
  }, [activeTickets, config]);

  const glossaryByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of glossaryTerms) if (!g.isDeleted) m.set(g.term, g.id);
    return m;
  }, [glossaryTerms]);

  const ticketsById = useMemo(() => new Map(activeTickets.map((t) => [t.id, t] as const)), [activeTickets]);

  const selectedTicket = selectedTicketId ? ticketsById.get(selectedTicketId) : undefined;

  // Filtros de la cola.
  const queryLower = query.trim().toLowerCase();
  const filteredTickets = useMemo(() => {
    return sorted.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      // Pilares sin entornos (HelpDesk) nunca mutan envFilter — el Set
      // queda vacío y el corto-circuito preserva el comportamiento.
      if (envFilter.size > 0 && (t.environment === undefined || !envFilter.has(t.environment))) return false;
      if (scopeFilter === 'final' && !t.isFinalProject) return false;
      if (scopeFilter === 'general' && t.isFinalProject) return false;
      if (queryLower) {
        const hay = `${t.number} ${t.title} ${t.requester} ${t.description} ${t.subcategory ?? ''}`.toLowerCase();
        if (!hay.includes(queryLower)) return false;
      }
      return true;
    });
  }, [sorted, statusFilter, priorityFilter, categoryFilter, typeFilter, envFilter, scopeFilter, queryLower]);

  const finalByDay = useMemo(() => {
    const days: T[][] = [[], [], [], [], []];
    for (const t of sorted) if (t.isFinalProject) days[dayOfFinalTicket(t, config.finalTab) - 1].push(t);
    return days;
  }, [sorted, config]);

  const toggleReveal = useCallback((key: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Filtro de ENTORNO/TORRE — MULTI-selección (Set vacío = todos).
  const toggleEnvFilter = useCallback((env: string) => {
    setEnvFilter((prev) => {
      const next = new Set(prev);
      if (next.has(env)) next.delete(env);
      else next.add(env);
      return next;
    });
  }, []);

  const openKbFromTicket = useCallback(
    (kbId: string) => {
      setTab('kb');
      setSelectedKbId(kbId);
    },
    []
  );

  const openTicketFromKb = useCallback(
    (ticketId: string) => {
      selectTicket(ticketId);
      setTab('queue');
    },
    [selectTicket]
  );

  const filterChip = (label: string, activeState: boolean, onClick: () => void, count?: number, chipAccent: FilterChipAccent = config.accent) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      aria-pressed={activeState}
      className={`text-[10px] font-semibold px-2 py-1 rounded border transition-colors cursor-pointer shrink-0 ${
        activeState
          ? chipAccent === 'violet'
            ? 'bg-violet-500/15 text-violet-300 border-violet-500/40'
            : chipAccent === 'emerald'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
              : chipAccent === 'orange'
                ? 'bg-orange-500/15 text-orange-300 border-orange-500/40'
                : ACCENT[chipAccent].chip
          : 'bg-[#161616] text-[#888] border-[#262626] hover:text-[#BBB] hover:border-[#333]'
      }`}
    >
      {label}
      {typeof count === 'number' && <span className="ml-1 font-mono text-[#858585]">{count}</span>}
    </button>
  );

  // Locales const para que el narrowing persista dentro de callbacks JSX.
  const env = config.env;

  const TAB_DEFS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
    { id: 'queue', label: config.queueTabLabel, icon: config.queueTabIcon },
    { id: 'final', label: config.finalTab.label, icon: <CalendarCheck className="w-3.5 h-3.5" /> },
    { id: 'kb', label: config.kbTabLabel, icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 h-[calc(100vh-48px)] bg-[#0A0A0A] relative">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 border-b border-[#262626] bg-[#0D0D0D] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            {config.headerIcon}
            {config.headerTitle}
          </h1>
          <p className="text-xs text-[#888]">
            {config.headerCompany} · {stats.total} {nounPlural(itemNoun)} · trabajados {stats.worked} ({stats.total > 0 ? Math.round((stats.worked / stats.total) * 100) : 0}%) · abiertos {stats.open} · {config.headerFinalLabel} {stats.finalDone}/{stats.finalTotal}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-[#828282]">
          <span className="px-2 py-1 rounded border border-[#262626] bg-[#161616]" title={`Práctica 100% local — los ${nounPlural(itemNoun)} son material de estudio`}>
            100% offline · dataset de estudio
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label={config.tablistAriaLabel} className="px-4 sm:px-6 py-2 border-b border-[#1a1a1a] bg-[#0D0D0D] flex items-center gap-1.5 flex-wrap shrink-0">
        {TAB_DEFS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer border ${
              tab === t.id ? accent.tab : 'bg-[#161616] text-[#888] border-[#262626] hover:text-[#BBB] hover:border-[#333]'
            }`}
          >
            {t.icon}
            {t.label}
            {t.id === 'kb' && <span className="text-[9px] font-mono text-[#828282]">{config.kb.articles.length}</span>}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === 'queue' && (
        <div role="tabpanel" className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
          {/* Columna lista */}
          <div className={`flex flex-col min-h-0 border-r border-[#262626] ${selectedTicket ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-3 border-b border-[#1a1a1a] flex flex-col gap-2.5 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#828282]" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={config.searchPlaceholder}
                  aria-label={config.searchAriaLabel}
                  className={`w-full bg-[#161616] border border-[#262626] rounded-md pl-8 pr-3 py-2 text-xs text-[#DDD] placeholder:text-[#828282] focus:outline-none ${accent.focus}`}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {filterChip('Todos', statusFilter === 'all', () => setStatusFilter('all'), stats.total)}
                {filterChip('Nuevos', statusFilter === 'nuevo', () => setStatusFilter('nuevo'), stats.byStatus.nuevo)}
                {filterChip('En progreso', statusFilter === 'en_progreso', () => setStatusFilter('en_progreso'), stats.byStatus.en_progreso, 'violet')}
                {filterChip('Resueltos', statusFilter === 'resuelto', () => setStatusFilter('resuelto'), stats.byStatus.resuelto, 'emerald')}
                {filterChip('Escalados', statusFilter === 'escalado', () => setStatusFilter('escalado'), stats.byStatus.escalado, 'violet')}
                {filterChip('Cerrados', statusFilter === 'cerrado', () => setStatusFilter('cerrado'), stats.byStatus.cerrado)}
              </div>
              <div className="flex flex-wrap gap-1.5 items-center">
                {filterChip('P1', priorityFilter === 'P1', () => setPriorityFilter(priorityFilter === 'P1' ? 'all' : 'P1'))}
                {filterChip('P2', priorityFilter === 'P2', () => setPriorityFilter(priorityFilter === 'P2' ? 'all' : 'P2'))}
                {filterChip('P3', priorityFilter === 'P3', () => setPriorityFilter(priorityFilter === 'P3' ? 'all' : 'P3'))}
                {filterChip('P4', priorityFilter === 'P4', () => setPriorityFilter(priorityFilter === 'P4' ? 'all' : 'P4'))}
                <span className="w-px h-4 bg-[#262626] mx-0.5" aria-hidden="true" />
                {filterChip('Incidentes', typeFilter === 'incidente', () => setTypeFilter(typeFilter === 'incidente' ? 'all' : 'incidente'), stats.byType.incidente)}
                {filterChip('Solicitudes', typeFilter === 'solicitud', () => setTypeFilter(typeFilter === 'solicitud' ? 'all' : 'solicitud'), stats.byType.solicitud)}
                {config.hasCambio && (
                  filterChip('Cambios', typeFilter === 'cambio', () => setTypeFilter(typeFilter === 'cambio' ? 'all' : 'cambio'), stats.byType.cambio, 'orange')
                )}
                <span className="w-px h-4 bg-[#262626] mx-0.5" aria-hidden="true" />
                {filterChip('Cola general', scopeFilter === 'general', () => setScopeFilter(scopeFilter === 'general' ? 'all' : 'general'), stats.total - stats.finalTotal, 'emerald')}
                {filterChip(config.scopeFinalLabel, scopeFilter === 'final', () => setScopeFilter(scopeFilter === 'final' ? 'all' : 'final'), stats.finalTotal, 'violet')}
              </div>
              {/* Filtro de ENTORNO/TORRE — multi-selección; el chip activo
                  toma el color de su entorno (envMeta). QA E2E (regla de
                  listas largas de la V9): los chips + "Todas" pueden
                  envolverse en varias filas y empujar el header a más de
                  lo visible — se limita con max-h + overflow-y-auto y el
                  header no encoge (shrink-0), como en Troubleshooting/
                  Runbooks. (Fix R4 unificado — solo lo tenía SocView.) */}
              {env && (
                <div className="flex flex-wrap gap-1.5 items-center max-h-[84px] overflow-y-auto">
                  <span className="text-[10px] text-[#828282] shrink-0">{env.filterLabel}</span>
                  {filterChip(env.allLabel, envFilter.size === 0, () => setEnvFilter(new Set()))}
                  {env.order.map((envKey) => {
                    const meta = env.meta[envKey];
                    const isEnvActive = envFilter.has(envKey);
                    return (
                      <button
                        key={envKey}
                        type="button"
                        onClick={() => toggleEnvFilter(envKey)}
                        aria-pressed={isEnvActive}
                        className={`text-[10px] font-semibold px-2 py-1 rounded border transition-colors cursor-pointer shrink-0 ${
                          isEnvActive ? meta.chip : 'bg-[#161616] text-[#888] border-[#262626] hover:text-[#BBB] hover:border-[#333]'
                        }`}
                      >
                        {meta.label}
                        <span className="ml-1 font-mono text-[#858585]">{stats.byEnvironment[envKey]}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#828282] shrink-0">Orden:</span>
                {filterChip('Nº', sortMode === 'number', () => setSortMode('number'))}
                {filterChip('Prioridad', sortMode === 'priority', () => setSortMode('priority'))}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor={`${config.idPrefix}-cat`} className="sr-only">
                  Filtrar por categoría
                </label>
                <select
                  id={`${config.idPrefix}-cat`}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className={`flex-1 min-w-0 bg-[#161616] border border-[#262626] rounded-md px-2.5 py-1.5 text-[11px] text-[#CCC] focus:outline-none ${accent.focus} cursor-pointer`}
                >
                  <option value="all">Todas las categorías</option>
                  {config.categories.map((c) => (
                    <option key={c} value={c}>
                      {c.replace(config.categoryPrefix, '')}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-[#828282]">
                {filteredTickets.length} {itemNoun}{filteredTickets.length !== 1 ? 's' : ''} en la vista
              </p>
            </div>
            <ul className={`flex-1 overflow-y-auto p-2 flex flex-col gap-1 ${config.queueListMaxH} lg:max-h-none`}>
              {filteredTickets.map((t) => (
                <TicketRow key={t.id} config={config} ticket={t} active={t.id === selectedTicketId} onSelect={selectTicket} />
              ))}
              {filteredTickets.length === 0 && (
                <li className="text-xs text-[#868686] p-4 text-center leading-relaxed">
                  Ningún {itemNoun} coincide con los filtros.
                  <br />
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setStatusFilter('all');
                      setPriorityFilter('all');
                      setCategoryFilter('all');
                      setScopeFilter('all');
                      setTypeFilter('all');
                      if (config.env) setEnvFilter(new Set());
                    }}
                    className={`mt-1.5 ${accent.link} hover:underline cursor-pointer`}
                  >
                    Limpiar filtros
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Columna detalle */}
          <div className={`flex flex-col min-h-0 overflow-y-auto ${selectedTicket ? 'flex' : 'hidden lg:flex'}`}>
            {selectedTicket ? (
              <TicketDetail
                key={selectedTicket.id}
                config={config}
                ticket={selectedTicket}
                revealed={revealed}
                onToggleReveal={toggleReveal}
                onBack={() => clearSelectedTicket()}
                onOpenKb={openKbFromTicket}
                onOpenGlossaryTerm={onOpenGlossaryTerm}
                glossaryByName={glossaryByName}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
                {config.queueEmptyIcon}
                <p className="text-xs text-[#868686]">Selecciona un {itemNoun} de la cola para trabajarlo</p>
                <p className="text-[10px] text-[#828282] max-w-xs leading-relaxed">{config.queueEmptyHint}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'final' && (
        <div role="tabpanel" className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 sm:p-6 flex flex-col gap-4 max-w-4xl w-full">
            {/* Intro */}
            <section className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-4 sm:p-5 flex flex-col gap-3">
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-sm font-bold text-white">{config.finalTab.heading}</h2>
                  <p className="text-[11px] text-[#868686] mt-0.5 leading-relaxed max-w-xl">{config.finalTab.intro}</p>
                </div>
                <span className="text-2xl font-mono font-bold text-fuchsia-400">
                  {stats.finalDone}
                  <span className="text-sm text-[#858585]">/{stats.finalTotal}</span>
                </span>
              </div>
              <ProgressBar done={stats.finalDone} total={stats.finalTotal} barCls="bg-fuchsia-500" className="h-2" defaultBarCls={accent.bar} />
            </section>

            {/* Días */}
            {config.finalTab.dayLabels.map(({ day, title, theme }) => {
              const dayTickets = finalByDay[day - 1] || [];
              const dayDone = dayTickets.filter((t) => WORKED_STATUSES.includes(t.status)).length;
              return (
                <section key={day} className="bg-[#0D0D0D] border border-[#262626] rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center gap-3 flex-wrap">
                    <span className="w-8 h-8 rounded bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                      D{day}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold text-white">
                        {title} — {theme}
                      </h3>
                      <ProgressBar
                        done={dayDone}
                        total={dayTickets.length}
                        barCls={dayDone === dayTickets.length ? 'bg-emerald-500' : 'bg-fuchsia-500'}
                        className="mt-1.5 max-w-[280px]"
                        defaultBarCls={accent.bar}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-[#999] shrink-0">
                      {dayDone}/{dayTickets.length}
                    </span>
                  </div>
                  <ul className="p-2 flex flex-col gap-1">
                    {dayTickets.map((t) => (
                      <TicketRow key={t.id} config={config} ticket={t} active={false} onSelect={openTicketFromKb} />
                    ))}
                  </ul>
                </section>
              );
            })}

            <p className="text-[10px] text-[#828282] pb-2">
              Tu progreso se guarda en la base de datos local (viaja en los backups ZIP). La nota de cierre de cada {itemNoun} es tu evidencia de práctica.
            </p>
          </div>
        </div>
      )}

      {tab === 'kb' && (
        <KbTab
          config={config}
          selectedKbId={selectedKbId}
          onSelectKb={setSelectedKbId}
          onOpenTicket={openTicketFromKb}
          onOpenGlossaryTerm={onOpenGlossaryTerm}
          glossaryByName={glossaryByName}
          ticketsById={ticketsById}
        />
      )}
    </div>
  );
}
