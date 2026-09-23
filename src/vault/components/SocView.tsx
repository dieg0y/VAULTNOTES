'use client';

/**
 * SocView — SOC / BLUE TEAM (v23): simulador de triage L1 (Nexora S.A. —
 * SOC / Blue Team, empresa ficticia).
 *
 * Adaptación de SysAdminView al dominio SOC. Dataset de fábrica: 50 casos
 * (soc-001..soc-020 generales + 30 del proyecto final "Primera Semana en
 * el SOC" soc-021..soc-050, 6 por día × 5 días) y una KB de 16 artículos
 * (data/socKB.ts — solo lectura; los conteos en UI se derivan del length).
 * Tres pestañas:
 *  1. COLA DE CASOS — master-detail: filtros (estado/prioridad/tipo/
 *     torre/categoría/ámbito/búsqueda/orden) + ficha del caso. La ficha
 *     separa lo que el analista VE al abrir el caso (reporte del origen/
 *     síntomas/datos disponibles) de la GUÍA DE ESTUDIO (pasos de
 *     investigación, resolución y escalación), que está OCULTA detrás de
 *     botones de revelado: primero intenta resolver, luego contrasta. El
 *     trabajo persiste en db.socTickets (tabla v23: status + statusNote)
 *     → viaja en los backups ZIP.
 *  2. PRIMERA SEMANA SOC — los 30 casos del proyecto final (soc-021..
 *     soc-050, 6 por día × 5 días) agrupados por día con progreso por
 *     día. Clic → salta a la cola con el caso seleccionado.
 *  3. BASE DE CONOCIMIENTO — los artículos del dataset (solo lectura)
 *     con buscador, pasos con queries (CodeBlock), términos de glosario
 *     enlazados y casos relacionados.
 *
 * Adaptaciones de dominio vs SysAdmin:
 *  · type SOLO 'incidente' | 'solicitud' — el tipo 'cambio' NO existe en
 *    SOC (sin chip ni filtro).
 *  · environment = TORRE DE DETECCIÓN (Identity / Endpoint / Network /
 *    Email / Cloud / Web / Multi) con chips de color y FILTRO
 *    multi-selección por torre en la cola.
 *  · ámbito 'semana' (proyecto final) en vez de 'guardia'.
 *
 * Cross-links: un caso con kbRef abre el artículo KB; la KB abre casos;
 * los relatedTerms de la KB navegan al Glosario (prop
 * onOpenGlossaryTerm). El socStore coordina los deep-links desde fuera
 * (Dashboard, roadmap SOC).
 *
 * 100% offline. Todo el texto se renderiza como TEXTO (sin HTML salvo la
 * tabla del export a Notas, que se escapa con escapeHtml).
 */

import React, { useMemo, useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ShieldAlert,
  Radar,
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
  SearchCode,
  CheckCheck,
  ArrowLeft,
} from 'lucide-react';
import { db } from '../db';
import type { GlossaryTerm, SocTicket, SocTicketPriority, SocTicketStatus, SocTicketType, SocEnvironment } from '../types';
import { SOC_KB_ARTICLES, SOC_KB_BY_ID } from '../data/socKB';
import { useSocStore } from '../store/socStore';
import { useNoteStore } from '../store/noteStore';
import { escapeHtml } from '../utils/escapeHtml';
import { buildNoteHtmlTable, CodeBlock, useAddToNoteToast } from './tools/_shared';

/* ------------------------------------------------------------------ */
/* Constantes + metadatos visuales                                     */
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

const STATUS_META: Record<SocTicketStatus, { label: string; chip: string; icon: React.ReactNode }> = {
  nuevo: { label: 'Nuevo', chip: 'bg-sky-500/10 text-sky-400 border-sky-500/30', icon: <span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> },
  en_progreso: { label: 'En progreso', chip: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: <Clock className="w-3 h-3" /> },
  resuelto: { label: 'Resuelto', chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: <Check className="w-3 h-3" /> },
  escalado: { label: 'Escalado', chip: 'bg-violet-500/10 text-violet-400 border-violet-500/30', icon: <ArrowUp className="w-3 h-3" /> },
  cerrado: { label: 'Cerrado', chip: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30', icon: <Lock className="w-3 h-3" /> },
};

const PRIORITY_CHIP: Record<SocTicketPriority, string> = {
  P1: 'bg-red-500/10 text-red-400 border-red-500/30',
  P2: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  P3: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  P4: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
};

/** Metadatos del TIPO de caso — en SOC solo existen incidente/solicitud. */
const TYPE_META: Record<SocTicketType, { label: string; chip: string }> = {
  incidente: { label: 'Incidente', chip: 'bg-[#161616] text-[#999] border-[#262626]' },
  solicitud: { label: 'Solicitud', chip: 'bg-[#161616] text-[#999] border-[#262626]' },
};

/** Metadatos de la TORRE DE DETECCIÓN — chip corto para la fila. */
const ENV_META: Record<SocEnvironment, { label: string; short: string; chip: string }> = {
  Identity: { label: 'Identity', short: 'Identity', chip: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
  Endpoint: { label: 'Endpoint', short: 'Endpoint', chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  Network: { label: 'Network', short: 'Network', chip: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
  Email: { label: 'Email', short: 'Email', chip: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  Cloud: { label: 'Cloud', short: 'Cloud', chip: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30' },
  Web: { label: 'Web', short: 'Web', chip: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
  Multi: { label: 'Multi (varias torres)', short: 'Multi', chip: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
};

/** Orden fijo de los chips de torre (filtro de la cola). */
const ENVIRONMENTS: SocEnvironment[] = [
  'Identity',
  'Endpoint',
  'Network',
  'Email',
  'Cloud',
  'Web',
  'Multi',
];

/** Estados que cuentan como "trabajado" (práctica completada). */
const WORKED_STATUSES: SocTicketStatus[] = ['resuelto', 'escalado', 'cerrado'];
/** Estados abiertos (trabajo pendiente). */
const OPEN_STATUSES: SocTicketStatus[] = ['nuevo', 'en_progreso'];

const DAY_LABELS: Array<{ day: number; title: string; theme: string }> = [
  { day: 1, title: 'Día 1', theme: 'Email: phishing, campañas, adjuntos y purga' },
  { day: 2, title: 'Día 2', theme: 'Identity: spray, MFA fatigue, viaje imposible y cuenta comprometida' },
  { day: 3, title: 'Día 3', theme: 'Endpoint: Defender/EDR, malware, persistencia y PowerShell' },
  { day: 4, title: 'Día 4', theme: 'Network y Web: beacons, escaneos, SQLi y firewall' },
  { day: 5, title: 'Día 5', theme: 'Cloud y datos: consent phishing, descargas masivas y cierre de la semana' },
];

/** Día del caso del proyecto final (soc-021..050 → 6 por día). */
function dayOfFinalTicket(t: SocTicket): number {
  const n = parseInt(t.id.replace(/^soc-/, ''), 10);
  if (Number.isNaN(n)) return 1;
  return Math.min(5, Math.max(1, Math.floor((n - 21) / 6) + 1));
}

/** Valor por defecto ESTABLE del useLiveQuery de la cola (misma regla que
 *  los EMPTY_* de las otras vistas: evita un array nuevo por render). */
const EMPTY_TICKETS: SocTicket[] = [];

/* ------------------------------------------------------------------ */
/* Subcomponentes visuales                                             */
/* ------------------------------------------------------------------ */

const PrioChip: React.FC<{ p: SocTicketPriority }> = ({ p }) => (
  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${PRIORITY_CHIP[p]}`}>{p}</span>
);

const StatusChip: React.FC<{ s: SocTicketStatus }> = ({ s }) => {
  const meta = STATUS_META[s];
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${meta.chip}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
};

/** Chip de torre de detección — mismo estilo que el de prioridad. */
const EnvChip: React.FC<{ env: SocEnvironment; full?: boolean }> = ({ env, full = false }) => {
  const meta = ENV_META[env];
  return (
    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${meta.chip}`} title={meta.label}>
      {full ? meta.label : meta.short}
    </span>
  );
};

const ProgressBar: React.FC<{ done: number; total: number; barCls?: string; className?: string }> = ({ done, total, barCls = 'bg-cyan-600', className = '' }) => {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className={`h-1.5 rounded-full bg-[#1d1d1d] overflow-hidden ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-all duration-500 ${barCls}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

/** Renderiza una línea de texto con queries 'entre comillas' como código inline. */
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
        {!open && <span className="block text-[10px] text-[#777] mt-0.5 italic">{closedHint}</span>}
      </span>
      {open ? <EyeOff className="w-4 h-4 text-[#555] shrink-0" /> : <Eye className="w-4 h-4 text-amber-400/80 shrink-0" />}
    </button>
    {open && <div className="px-3.5 pb-3.5 pt-1 border-t border-[#1a1a1a] flex flex-col gap-2">{children}</div>}
  </section>
);

/* ------------------------------------------------------------------ */
/* Fila de caso (lista)                                                */
/* ------------------------------------------------------------------ */

const CaseRow: React.FC<{ ticket: SocTicket; active: boolean; onSelect: () => void }> = ({ ticket, active, onSelect }) => (
  <li>
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`w-full text-left px-2.5 py-2 rounded-md border transition-colors cursor-pointer flex flex-col gap-1 ${
        active
          ? 'border-cyan-500/40 bg-cyan-500/10'
          : ticket.isFinalProject
            ? 'border-[#262626] bg-[#0F0F0F] hover:border-[#333] hover:bg-[#161616]'
            : 'border-[#222] bg-[#0D0D0D] hover:border-[#333] hover:bg-[#161616]'
      }`}
    >
      <span className="flex items-center gap-1.5 min-w-0">
        <span className="text-[10px] font-mono font-bold text-[#888] shrink-0">{ticket.number}</span>
        <PrioChip p={ticket.priority} />
        <EnvChip env={ticket.environment} />
        {ticket.isFinalProject && (
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded border bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30 shrink-0"
            title="Proyecto final · Primera semana SOC"
          >
            PS
          </span>
        )}
        <span className={`ml-auto shrink-0 ${STATUS_META[ticket.status].chip} inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded border`}>
          {STATUS_META[ticket.status].icon}
        </span>
      </span>
      <span className={`text-xs leading-snug line-clamp-2 ${active ? 'text-white' : 'text-[#CCC]'}`}>{ticket.title}</span>
      <span className="text-[10px] text-[#555] truncate">
        {ticket.requester} · {ticket.category.replace('SOC - ', '')}
      </span>
    </button>
  </li>
);

/* ------------------------------------------------------------------ */
/* Ficha del caso (detail)                                             */
/* ------------------------------------------------------------------ */

interface CaseDetailProps {
  ticket: SocTicket;
  revealed: Set<string>;
  onToggleReveal: (key: string) => void;
  onBack: () => void;
  onOpenKb: (kbId: string) => void;
  onOpenGlossaryTerm: (termId: string) => void;
  glossaryByName: Map<string, string>;
}

const CaseDetail: React.FC<CaseDetailProps> = ({
  ticket,
  revealed,
  onToggleReveal,
  onBack,
  onOpenKb,
  onOpenGlossaryTerm,
  glossaryByName,
}) => {
  const [noteDraft, setNoteDraft] = useState(ticket.statusNote ?? '');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [syncedNote, setSyncedNote] = useState(ticket.statusNote ?? '');
  const { addedToast, showToast } = useAddToNoteToast();
  const enqueueNote = useNoteStore((s) => s.enqueueNote);

  // Re-sincroniza el borrador cuando la nota cambia DESDE FUERA (backup /
  // import / otro dispositivo) — patrón oficial "adjust state during render"
  // (sin efecto). El cambio de caso re-monta el componente vía `key`.
  const currentNote = ticket.statusNote ?? '';
  if (currentNote !== syncedNote) {
    setSyncedNote(currentNote);
    setNoteDraft(currentNote);
    setNoteError(null);
  }

  const kb = ticket.kbRef ? SOC_KB_BY_ID.get(ticket.kbRef) : undefined;
  const isWorked = WORKED_STATUSES.includes(ticket.status);
  const noteOk = noteDraft.trim().length >= 10;

  const patch = (changes: Partial<SocTicket>) => {
    void db.socTickets.update(ticket.id, { ...changes, updatedAt: new Date().toISOString() });
  };

  const handleResolve = () => {
    if (!noteOk) {
      setNoteError('Documenta tu resolución (mín. 10 caracteres): qué causa encontraste, qué contuviste y qué veredicto emitiste. Es tu evidencia de práctica.');
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
      ['Caso SOC', esc(ticket.number)],
      ['Título', esc(ticket.title)],
      ['Categoría', esc(ticket.category + (ticket.subcategory ? ' · ' + ticket.subcategory : ''))],
      ['Tipo', TYPE_META[ticket.type].label],
      ['Torre', esc(ENV_META[ticket.environment].label)],
      ['Prioridad', `${ticket.priority} (impacto ${ticket.impact} · urgencia ${ticket.urgency})`],
      ['Origen', esc(ticket.requester)],
      ['Estado', STATUS_META[ticket.status].label],
      ['Reporte del origen', esc(ticket.description)],
      ['Síntomas', esc(ticket.symptoms)],
    ];
    if (ticket.dataAvailable) rows.push(['Datos disponibles', esc(ticket.dataAvailable)]);
    if (ticket.troubleshooting) rows.push(['Pasos de investigación (guía)', esc(ticket.troubleshooting)]);
    if (ticket.resolution) rows.push(['Resolución esperada', esc(ticket.resolution)]);
    if (ticket.escalation) rows.push(['Escalación', esc(ticket.escalation)]);
    if (ticket.skill) rows.push(['Habilidad que entrena', esc(ticket.skill)]);
    if (ticket.evidence) rows.push(['Evidencia a registrar', esc(ticket.evidence)]);
    if (ticket.statusNote) rows.push(['Mi nota de trabajo', esc(ticket.statusNote)]);
    if (kb) rows.push(['KB relacionada', esc(kb.title + ' (' + kb.id + ')')]);
    rows.push(['Exportado', new Date().toLocaleString('es-CO')]);

    enqueueNote(`SOC Blue Team ${ticket.number} — ${ticket.title}`, buildNoteHtmlTable(rows));
    showToast();
  };

  const tKey = (k: string) => `${ticket.id}:${k}`;

  return (
    <article className="flex flex-col gap-3 p-4 sm:p-5 max-w-3xl w-full" aria-label={`Caso ${ticket.number}`}>
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
          <EnvChip env={ticket.environment} full />
          {ticket.isFinalProject && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded border bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30">
              Primera semana SOC · Día {dayOfFinalTicket(ticket)}
            </span>
          )}
        </div>
        <h2 className="text-sm sm:text-base font-bold text-white leading-snug">{ticket.title}</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#666]">
          <span>
            Origen: <span className="text-[#999]">{ticket.requester}</span>
          </span>
          <span>
            Categoría: <span className="text-[#999]">{ticket.category.replace('SOC - ', '')}{ticket.subcategory ? ` · ${ticket.subcategory}` : ''}</span>
          </span>
          <span>
            Impacto <span className="text-[#999]">{ticket.impact}</span> · Urgencia <span className="text-[#999]">{ticket.urgency}</span>
          </span>
        </div>
      </header>

      {/* Lo que reporta el origen — lo que VE al abrir el caso */}
      <section className="flex flex-col gap-2.5">
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1.5 flex items-center gap-1.5">
            <FileTextIcon className="w-3 h-3" /> Lo que reporta el origen
          </p>
          <p className="text-xs text-[#BBB] italic leading-relaxed">&ldquo;{ticket.description}&rdquo;</p>
        </div>
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1.5 flex items-center gap-1.5">
            <CircleAlert className="w-3 h-3" /> Síntomas observables
          </p>
          <p className="text-xs text-[#CCC] leading-relaxed">{ticket.symptoms}</p>
        </div>
        {ticket.dataAvailable && (
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1.5 flex items-center gap-1.5">
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
        <p className="text-[10px] text-[#777] leading-relaxed px-1 -mt-1.5">
          Intenta resolver el caso con lo que ves arriba (y tu criterio de triage) ANTES de abrir la guía. Cuando creas tener el diagnóstico,
          ábrela y contrasta paso a paso.
        </p>
        {ticket.troubleshooting && (
          <RevealCard
            title="Pasos de investigación (guía)"
            icon={<SearchCode className="w-3.5 h-3.5" />}
            open={revealed.has(tKey('ts'))}
            onToggle={() => onToggleReveal(tKey('ts'))}
            closedHint="Tu plan de investigación — compáralo con la guía"
          >
            <ol className="flex flex-col gap-1.5">
              {ticket.troubleshooting.split('\n').map((line, i) =>
                line.trim() ? (
                  <li key={i} className="text-xs text-[#CCC] leading-relaxed flex gap-2">
                    <span className="text-[10px] font-mono text-[#555] shrink-0 mt-0.5">{i + 1}.</span>
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
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1">Habilidad que entrena</p>
                <p className="text-[11px] text-[#CCC] leading-relaxed">{ticket.skill}</p>
              </div>
            )}
            {ticket.evidence && (
              <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1">Evidencia a registrar</p>
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
            <ChevronRight className="w-4 h-4 text-[#555] group-hover:text-emerald-400 shrink-0 transition-colors" />
          </button>
        )}
        {kb?.relatedTerms && kb.relatedTerms.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-1">
            <span className="text-[10px] text-[#555]">Glosario:</span>
            {kb.relatedTerms.map((name) => {
              const termId = glossaryByName.get(name);
              return termId ? (
                <button
                  key={name}
                  type="button"
                  onClick={() => onOpenGlossaryTerm(termId)}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-[#262626] bg-[#161616] text-[#BBB] hover:text-white hover:border-cyan-500/40 transition-colors cursor-pointer"
                  title={`Abrir "${name}" en el Glosario`}
                >
                  {name}
                </button>
              ) : (
                <span key={name} className="text-[10px] px-1.5 py-0.5 rounded border border-[#222] bg-[#111] text-[#777]">
                  {name}
                </span>
              );
            })}
          </div>
        )}
      </section>

      {/* TRABAJO — flujo de estados + nota de cierre */}
      <section className="flex flex-col gap-2.5" aria-label="Tu trabajo en el caso">
        <div className="flex items-center gap-2 px-1">
          <NotebookPen className="w-3.5 h-3.5 text-cyan-400" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/80">Tu trabajo</p>
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
                  <Lock className="w-3.5 h-3.5" /> Cerrar caso
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
            <label htmlFor={`soc-note-${ticket.id}`} className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
              {isWorked || ticket.statusNote ? 'Nota de cierre (tu evidencia)' : 'Nota de cierre — requerida para resolver o escalar'}
            </label>
            <textarea
              id={`soc-note-${ticket.id}`}
              value={noteDraft}
              onChange={(e) => {
                setNoteDraft(e.target.value);
                if (noteError) setNoteError(null);
              }}
              placeholder="Causa raíz encontrada, pasos que seguiste, query o comando clave, verificación final, hora… como si el líder de turno o un auditor fuera a leerlo sin preguntarte nada."
              rows={3}
              maxLength={4000}
              className="w-full bg-[#161616] border border-[#262626] rounded-md px-3 py-2 text-xs text-[#DDD] placeholder:text-[#555] focus:outline-none focus:border-cyan-500/50 resize-y font-mono"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-[#555]">{noteDraft.trim().length}/4000 · mínimo 10 para cerrar</span>
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={noteDraft.trim().length === 0}
                className="px-2.5 py-1 rounded border border-[#262626] bg-[#161616] hover:border-cyan-500/40 text-[10px] font-semibold text-[#BBB] hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#262626] bg-[#161616] hover:border-cyan-500/40 text-xs font-semibold text-[#E5E5E5] hover:text-white transition-colors cursor-pointer"
              title="Exportar el caso completo con tu nota como tabla en una Nota nueva"
            >
              <NotebookPen className="w-3.5 h-3.5 text-cyan-400" /> Añadir a Notas
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
};

/* ------------------------------------------------------------------ */
/* Pestaña KB                                                          */
/* ------------------------------------------------------------------ */

interface KbTabProps {
  selectedKbId: string | null;
  onSelectKb: (id: string | null) => void;
  onOpenTicket: (ticketId: string) => void;
  onOpenGlossaryTerm: (termId: string) => void;
  glossaryByName: Map<string, string>;
  ticketsById: Map<string, SocTicket>;
}

const KbTab: React.FC<KbTabProps> = ({ selectedKbId, onSelectKb, onOpenTicket, onOpenGlossaryTerm, glossaryByName, ticketsById }) => {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!query) return SOC_KB_ARTICLES;
    return SOC_KB_ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.category.toLowerCase().includes(query) ||
        a.environment.toLowerCase().includes(query) ||
        a.symptoms.toLowerCase().includes(query) ||
        a.cause.toLowerCase().includes(query)
    );
  }, [query]);

  const selected = selectedKbId ? SOC_KB_BY_ID.get(selectedKbId) : undefined;

  return (
    <div className="flex-1 min-h-0 grid lg:grid-cols-[minmax(300px,380px)_1fr]">
      {/* Lista */}
      <div className={`flex flex-col min-h-0 border-r border-[#262626] ${selected ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-3 border-b border-[#1a1a1a]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555]" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar artículo (síntomas, causa…)"
              aria-label="Buscar en la Base de Conocimiento"
              className="w-full bg-[#161616] border border-[#262626] rounded-md pl-8 pr-3 py-2 text-xs text-[#DDD] placeholder:text-[#555] focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <p className="text-[10px] text-[#555] mt-2">
            {filtered.length} de {SOC_KB_ARTICLES.length} artículos
          </p>
        </div>
        <ul className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 max-h-[70vh] lg:max-h-none">
          {filtered.map((a) => (
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
                <span className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-[#555]">{a.category.replace('SOC - ', '')}</span>
                  <EnvChip env={a.environment} />
                </span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="text-xs text-[#777] p-3 text-center">Sin resultados para &ldquo;{q}&rdquo;</li>}
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
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  {selected.category.replace('SOC - ', '')}
                </span>
                <EnvChip env={selected.environment} full />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white leading-snug">{selected.title}</h2>
            </header>

            <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1.5 flex items-center gap-1.5">
                <CircleAlert className="w-3 h-3" /> Cuándo aplica (síntomas)
              </p>
              <p className="text-xs text-[#CCC] leading-relaxed">{selected.symptoms}</p>
            </div>
            <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1.5 flex items-center gap-1.5">
                <Lightbulb className="w-3 h-3" /> Causa típica
              </p>
              <p className="text-xs text-[#CCC] leading-relaxed">{selected.cause}</p>
            </div>

            <section className="flex flex-col gap-2" aria-label="Pasos">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#555] px-1 flex items-center gap-1.5">
                <SearchCode className="w-3 h-3" /> Pasos ({selected.steps.length})
              </p>
              <ol className="flex flex-col gap-2">
                {selected.steps.map((s, i) => (
                  <li key={i} className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-3 flex flex-col gap-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-mono font-bold text-[#555] shrink-0">{i + 1}.</span>
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
                <span className="text-[10px] text-[#555]">Glosario:</span>
                {selected.relatedTerms.map((name) => {
                  const termId = glossaryByName.get(name);
                  return termId ? (
                    <button
                      key={name}
                      type="button"
                      onClick={() => onOpenGlossaryTerm(termId)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-[#262626] bg-[#161616] text-[#BBB] hover:text-white hover:border-cyan-500/40 transition-colors cursor-pointer"
                      title={`Abrir "${name}" en el Glosario`}
                    >
                      {name}
                    </button>
                  ) : (
                    <span key={name} className="text-[10px] px-1.5 py-0.5 rounded border border-[#222] bg-[#111] text-[#777]">
                      {name}
                    </span>
                  );
                })}
              </div>
            )}

            {selected.relatedTickets && selected.relatedTickets.length > 0 && (
              <div className="flex flex-col gap-1.5 px-1">
                <span className="text-[10px] text-[#555]">Casos del dataset que usan este artículo:</span>
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
            <p className="text-xs text-[#777]">Selecciona un artículo de la Base de Conocimiento</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Vista principal                                                     */
/* ------------------------------------------------------------------ */

export interface SocViewProps {
  /** Términos del glosario (para enlazar relatedTerms de la KB por nombre). */
  glossaryTerms: GlossaryTerm[];
  /** Abre un término del glosario (navega a la sección Glosario). */
  onOpenGlossaryTerm: (termId: string) => void;
}

type TabId = 'queue' | 'semana' | 'kb';
type StatusFilter = 'all' | SocTicketStatus;
type ScopeFilter = 'all' | 'semana' | 'general';
type TypeFilter = 'all' | SocTicketType;
type SortMode = 'number' | 'priority';

/** Orden de prioridad para el sort (P1 primero). */
const PRIO_ORDER: Record<SocTicketPriority, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };

const TAB_DEFS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'queue', label: 'Cola de casos', icon: <Radar className="w-3.5 h-3.5" /> },
  { id: 'semana', label: 'Primera semana SOC', icon: <CalendarCheck className="w-3.5 h-3.5" /> },
  { id: 'kb', label: 'Base de conocimiento', icon: <BookOpen className="w-3.5 h-3.5" /> },
];

export const SocView: React.FC<SocViewProps> = ({ glossaryTerms, onOpenGlossaryTerm }) => {
  const [tab, setTab] = useState<TabId>('queue');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | SocTicketPriority>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [envFilter, setEnvFilter] = useState<Set<SocEnvironment>>(new Set());
  const [sortMode, setSortMode] = useState<SortMode>('number');
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);

  // Deep-links del store (Dashboard / KB desde un caso).
  const selectedTicketId = useSocStore((s) => s.selectedTicketId);
  const selectTicket = useSocStore((s) => s.selectTicket);
  const clearSelectedTicket = useSocStore((s) => s.clearSelectedTicket);

  const tickets = useLiveQuery(() => db.socTickets.filter((t) => !t.isDeleted).toArray(), [], EMPTY_TICKETS);

  const activeTickets = useMemo(() => tickets.filter((t) => !t.isDeleted), [tickets]);

  // Dos modos de orden: por número (histórico) o por prioridad (P1 → P4, y
  // dentro de cada prioridad por número — útil para trabajar la cola como
  // se haría en un turno real del SOC).
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
    const byStatus: Record<SocTicketStatus, number> = { nuevo: 0, en_progreso: 0, resuelto: 0, cerrado: 0, escalado: 0 };
    const byType: Record<SocTicketType, number> = { incidente: 0, solicitud: 0 };
    const byEnvironment: Record<SocEnvironment, number> = {
      Identity: 0,
      Endpoint: 0,
      Network: 0,
      Email: 0,
      Cloud: 0,
      Web: 0,
      Multi: 0,
    };
    let worked = 0;
    let open = 0;
    let finalDone = 0;
    let finalTotal = 0;
    for (const t of activeTickets) {
      byStatus[t.status]++;
      byType[t.type]++;
      byEnvironment[t.environment]++;
      if (WORKED_STATUSES.includes(t.status)) worked++;
      if (OPEN_STATUSES.includes(t.status)) open++;
      if (t.isFinalProject) {
        finalTotal++;
        if (WORKED_STATUSES.includes(t.status)) finalDone++;
      }
    }
    return { byStatus, byType, byEnvironment, worked, open, finalDone, finalTotal, total: activeTickets.length };
  }, [activeTickets]);

  const glossaryByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of glossaryTerms) if (!g.isDeleted) m.set(g.term, g.id);
    return m;
  }, [glossaryTerms]);

  const ticketsById = useMemo(() => new Map(activeTickets.map((t) => [t.id, t])), [activeTickets]);

  const selectedTicket = selectedTicketId ? ticketsById.get(selectedTicketId) : undefined;

  // Filtros de la cola.
  const queryLower = query.trim().toLowerCase();
  const filteredTickets = useMemo(() => {
    return sorted.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (envFilter.size > 0 && !envFilter.has(t.environment)) return false;
      if (scopeFilter === 'semana' && !t.isFinalProject) return false;
      if (scopeFilter === 'general' && t.isFinalProject) return false;
      if (queryLower) {
        const hay = `${t.number} ${t.title} ${t.requester} ${t.description} ${t.subcategory ?? ''}`.toLowerCase();
        if (!hay.includes(queryLower)) return false;
      }
      return true;
    });
  }, [sorted, statusFilter, priorityFilter, categoryFilter, typeFilter, envFilter, scopeFilter, queryLower]);

  const finalByDay = useMemo(() => {
    const days: SocTicket[][] = [[], [], [], [], []];
    for (const t of sorted) if (t.isFinalProject) days[dayOfFinalTicket(t) - 1].push(t);
    return days;
  }, [sorted]);

  const toggleReveal = useCallback((key: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Filtro de TORRE — MULTI-selección (Set vacío = todas las torres).
  const toggleEnvFilter = useCallback((env: SocEnvironment) => {
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

  const filterChip = (label: string, activeState: boolean, onClick: () => void, count?: number, accent = 'cyan') => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      aria-pressed={activeState}
      className={`text-[10px] font-semibold px-2 py-1 rounded border transition-colors cursor-pointer shrink-0 ${
        activeState
          ? accent === 'violet'
            ? 'bg-violet-500/15 text-violet-300 border-violet-500/40'
            : accent === 'emerald'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
              : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
          : 'bg-[#161616] text-[#888] border-[#262626] hover:text-[#BBB] hover:border-[#333]'
      }`}
    >
      {label}
      {typeof count === 'number' && <span className="ml-1 font-mono text-[#666]">{count}</span>}
    </button>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 h-[calc(100vh-48px)] bg-[#0A0A0A] relative">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 border-b border-[#262626] bg-[#0D0D0D] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            SOC Blue Team — Simulador de triage L1
          </h1>
          <p className="text-xs text-[#888]">
            Nexora S.A. — SOC / Blue Team (empresa ficticia) · {stats.total} casos · trabajados {stats.worked} ({stats.total > 0 ? Math.round((stats.worked / stats.total) * 100) : 0}%) · abiertos {stats.open} · primera semana SOC {stats.finalDone}/{stats.finalTotal}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-[#555]">
          <span className="px-2 py-1 rounded border border-[#262626] bg-[#161616]" title="Práctica 100% local — los casos son material de estudio">
            100% offline · dataset de estudio
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Secciones del SOC Blue Team" className="px-4 sm:px-6 py-2 border-b border-[#1a1a1a] bg-[#0D0D0D] flex items-center gap-1.5 flex-wrap shrink-0">
        {TAB_DEFS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer border ${
              tab === t.id
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                : 'bg-[#161616] text-[#888] border-[#262626] hover:text-[#BBB] hover:border-[#333]'
            }`}
          >
            {t.icon}
            {t.label}
            {t.id === 'kb' && <span className="text-[9px] font-mono text-[#555]">{SOC_KB_ARTICLES.length}</span>}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === 'queue' && (
        <div role="tabpanel" className="flex-1 min-h-0 grid lg:grid-cols-[minmax(300px,380px)_1fr]">
          {/* Columna lista */}
          <div className={`flex flex-col min-h-0 border-r border-[#262626] ${selectedTicket ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-3 border-b border-[#1a1a1a] flex flex-col gap-2.5 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555]" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar caso (número, título, origen…)"
                  aria-label="Buscar en la cola de casos"
                  className="w-full bg-[#161616] border border-[#262626] rounded-md pl-8 pr-3 py-2 text-xs text-[#DDD] placeholder:text-[#555] focus:outline-none focus:border-cyan-500/50"
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
                <span className="w-px h-4 bg-[#262626] mx-0.5" aria-hidden="true" />
                {filterChip('Cola general', scopeFilter === 'general', () => setScopeFilter(scopeFilter === 'general' ? 'all' : 'general'), stats.total - stats.finalTotal, 'emerald')}
                {filterChip('Primera semana SOC', scopeFilter === 'semana', () => setScopeFilter(scopeFilter === 'semana' ? 'all' : 'semana'), stats.finalTotal, 'violet')}
              </div>
              {/* Filtro de TORRE (torre de detección) — multi-selección; el
                  chip activo toma el color de su torre (ENV_META). QA E2E
                  (regla de listas largas de la V9): las 8 torres + "Todas"
                  pueden envolverse en varias filas y empujar el header a más
                  de lo visible — se limita con max-h + overflow-y-auto y el
                  header no encoge (shrink-0), como en Troubleshooting/
                  Runbooks. */}
              <div className="flex flex-wrap gap-1.5 items-center max-h-[84px] overflow-y-auto">
                <span className="text-[10px] text-[#555] shrink-0">Torre:</span>
                {filterChip('Todas las torres', envFilter.size === 0, () => setEnvFilter(new Set()))}
                {ENVIRONMENTS.map((env) => {
                  const meta = ENV_META[env];
                  const isEnvActive = envFilter.has(env);
                  return (
                    <button
                      key={env}
                      type="button"
                      onClick={() => toggleEnvFilter(env)}
                      aria-pressed={isEnvActive}
                      className={`text-[10px] font-semibold px-2 py-1 rounded border transition-colors cursor-pointer shrink-0 ${
                        isEnvActive ? meta.chip : 'bg-[#161616] text-[#888] border-[#262626] hover:text-[#BBB] hover:border-[#333]'
                      }`}
                    >
                      {meta.label}
                      <span className="ml-1 font-mono text-[#666]">{stats.byEnvironment[env]}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#555] shrink-0">Orden:</span>
                {filterChip('Nº', sortMode === 'number', () => setSortMode('number'))}
                {filterChip('Prioridad', sortMode === 'priority', () => setSortMode('priority'))}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="soc-cat" className="sr-only">
                  Filtrar por categoría
                </label>
                <select
                  id="soc-cat"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="flex-1 min-w-0 bg-[#161616] border border-[#262626] rounded-md px-2.5 py-1.5 text-[11px] text-[#CCC] focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                >
                  <option value="all">Todas las categorías</option>
                  {SOC_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.replace('SOC - ', '')}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-[#555]">
                {filteredTickets.length} caso{filteredTickets.length !== 1 ? 's' : ''} en la vista
              </p>
            </div>
            <ul className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 max-h-[calc(100vh-380px)] lg:max-h-none">
              {filteredTickets.map((t) => (
                <CaseRow key={t.id} ticket={t} active={t.id === selectedTicketId} onSelect={() => selectTicket(t.id)} />
              ))}
              {filteredTickets.length === 0 && (
                <li className="text-xs text-[#777] p-4 text-center leading-relaxed">
                  Ningún caso coincide con los filtros.
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
                      setEnvFilter(new Set());
                    }}
                    className="mt-1.5 text-cyan-400 hover:underline cursor-pointer"
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
              <CaseDetail
                key={selectedTicket.id}
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
                <Radar className="w-8 h-8 text-[#333]" />
                <p className="text-xs text-[#777]">Selecciona un caso de la cola para trabajarlo</p>
                <p className="text-[10px] text-[#555] max-w-xs leading-relaxed">
                  El flujo es el de un turno real del SOC: leer la alerta → investigar → resolver o escalar → documentar la nota de cierre.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'semana' && (
        <div role="tabpanel" className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 sm:p-6 flex flex-col gap-4 max-w-4xl w-full">
            {/* Intro */}
            <section className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-4 sm:p-5 flex flex-col gap-3">
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-sm font-bold text-white">Primera semana SOC — tu primera semana de turno en el Blue Team</h2>
                  <p className="text-[11px] text-[#777] mt-0.5 leading-relaxed max-w-xl">
                    30 casos (soc-021..soc-050, 6 por día × 5 días) que simulan tu primera semana real de turno en el SOC de Nexora: del phishing y la purga
                    de correos del día 1 al consent phishing, las descargas masivas y el cierre de la semana del día 5. Trabájalos en orden — cada día sube
                    la dificultad y la nota de cierre de cada caso entrena el hábito de documentar con el que se cierra la semana.
                  </p>
                </div>
                <span className="text-2xl font-mono font-bold text-fuchsia-400">
                  {stats.finalDone}
                  <span className="text-sm text-[#666]">/{stats.finalTotal}</span>
                </span>
              </div>
              <ProgressBar done={stats.finalDone} total={stats.finalTotal} barCls="bg-fuchsia-500" className="h-2" />
            </section>

            {/* Días */}
            {DAY_LABELS.map(({ day, title, theme }) => {
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
                      <ProgressBar done={dayDone} total={dayTickets.length} barCls={dayDone === dayTickets.length ? 'bg-emerald-500' : 'bg-fuchsia-500'} className="mt-1.5 max-w-[280px]" />
                    </div>
                    <span className="text-[10px] font-mono text-[#999] shrink-0">
                      {dayDone}/{dayTickets.length}
                    </span>
                  </div>
                  <ul className="p-2 flex flex-col gap-1">
                    {dayTickets.map((t) => (
                      <CaseRow key={t.id} ticket={t} active={false} onSelect={() => openTicketFromKb(t.id)} />
                    ))}
                  </ul>
                </section>
              );
            })}

            <p className="text-[10px] text-[#555] pb-2">
              Tu progreso se guarda en la base de datos local (viaja en los backups ZIP). La nota de cierre de cada caso es tu evidencia de práctica.
            </p>
          </div>
        </div>
      )}

      {tab === 'kb' && (
        <KbTab
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
};
