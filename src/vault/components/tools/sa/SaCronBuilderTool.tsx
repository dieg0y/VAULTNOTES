'use client';

/**
 * SaCronBuilderTool.tsx — "Cron Builder" (SysAdmin · task 7-g).
 *
 * CONSTRUCTOR de expresiones cron (camino inverso del Cron Parser existente):
 * 5 campos con sintaxis Vixie completa (estrella, paso /N, valores, rangos,
 * listas, N-M/step — nombres jan/mon incluidos), validación por campo, presets
 * globales y nota pedagógica del "último día del mes" (L es de Quartz, no de
 * cron estándar). En vivo: expresión + descripción natural en español
 * ("Todos los días a las 02:00"…), próximas 5 ejecuciones locales (saltos
 * mes→día→hora→minuto, tope 400 días, semántica Vixie dom+dow = OR) y línea de
 * despliegue en crontab. Footer: @reboot/@daily…, sub-minuto → systemd timers,
 * missed runs, CRON_TZ. 100% offline — sin fetch, sin eval.
 */
import React, { useMemo, useState } from 'react';
import { Clock, CalendarClock, Terminal, BookOpen, AlertTriangle, Info } from 'lucide-react';
import { CRON_SHORTCUTS } from '../../../data/cronData';
import { useNoteStore } from '../../../store/noteStore';
import { escapeHtml } from '../../../utils/escapeHtml';
import {
  inputCls, btnPrimary, btnGhost, Row, Field, CodeBlock, InfoBanner, ErrorBanner,
  buildNoteHtmlTable, useAddToNoteToast, CopyBtn,
} from '../_shared';

/* ─────────────────────────── tipos y specs de campo ─────────────────────────── */

type FieldKey = 'minute' | 'hour' | 'dom' | 'month' | 'dow';

interface FieldSpec {
  key: FieldKey;
  label: string;
  /** Cabecera corta tal como aparece en el comentario clásico del crontab. */
  short: string;
  min: number;
  max: number;
  /** Nombre legible por valor (índice = valor - min) y alias de 3 letras (jan, mon…). */
  names: string[];
  aliases: Record<string, number>;
  hint: string;
}

interface FieldToken { from: number; to: number; step: number }

interface FieldOk {
  /** Input del usuario (trim) — para el fallback literal; isStar = escribió exactamente "*". */
  raw: string;
  isStar: boolean;
  tokens: FieldToken[];
  /** Set expandido y ordenado de valores que hacen match. */
  set: number[];
  spec: FieldSpec;
}

type FieldParse = { ok: true; value: FieldOk } | { ok: false; error: string };

interface AllParsed { minute: FieldOk; hour: FieldOk; dom: FieldOk; month: FieldOk; dow: FieldOk }
interface CronState { minute: string; hour: string; dom: string; month: string; dow: string }

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const DOW_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const FIELD_SPECS: FieldSpec[] = [
  { key: 'minute', label: 'Minuto', short: 'm', min: 0, max: 59, names: [], aliases: {}, hint: '0-59 · admite *, */15, 0,30, 10-40/10' },
  { key: 'hour', label: 'Hora', short: 'h', min: 0, max: 23, names: [], aliases: {}, hint: '0-23 · admite *, */6, 9, 2-6' },
  { key: 'dom', label: 'Día del mes', short: 'dom', min: 1, max: 31, names: [], aliases: {}, hint: '1-31 · admite *, 1, 15, 28-31, 1-31/5 (sin "L": eso es Quartz)' },
  {
    key: 'month', label: 'Mes', short: 'mon', min: 1, max: 12, names: MONTH_NAMES,
    aliases: { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }, hint: '1-12 · admite *, 1, 6-8, jul,oct',
  },
  {
    key: 'dow', label: 'Día de la semana', short: 'dow', min: 0, max: 7, names: DOW_NAMES,
    aliases: { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }, hint: '0-6 (0 y 7 = domingo; sun…sat) · admite *, 1-5, mon-fri, 6,0',
  },
];

/* Presets rápidos por campo — chips bajo cada input. */
const FIELD_PRESETS: Record<FieldKey, string[]> = {
  minute: ['*', '*/5', '*/15', '0', '30'],
  hour: ['*', '*/6', '2', '8'],
  dom: ['*', '1', '15', '28-31'],
  month: ['*', '1', '6-8'],
  dow: ['*', '0', '1-5', '6,0', '1'],
};

/* Presets globales — escenarios típicos de un SysAdmin Jr. */
const GLOBAL_PRESETS: Array<{ label: string; fields: CronState }> = [
  { label: 'Cada minuto', fields: { minute: '*', hour: '*', dom: '*', month: '*', dow: '*' } },
  { label: 'Cada 15 min', fields: { minute: '*/15', hour: '*', dom: '*', month: '*', dow: '*' } },
  { label: 'Diario 02:00', fields: { minute: '0', hour: '2', dom: '*', month: '*', dow: '*' } },
  { label: 'Semanal domingo 03:00', fields: { minute: '0', hour: '3', dom: '*', month: '*', dow: '0' } },
  { label: 'Lunes a viernes 08:30', fields: { minute: '30', hour: '8', dom: '*', month: '*', dow: '1-5' } },
  { label: 'Mensual día 1 01:00', fields: { minute: '0', hour: '1', dom: '1', month: '*', dow: '*' } },
  { label: 'Cada 6 horas', fields: { minute: '0', hour: '*/6', dom: '*', month: '*', dow: '*' } },
];

/* ─────────────────────────── parser por campo ─────────────────────────── */

const TOKEN_RE = /^(\*|[a-z0-9]+)(?:-([a-z0-9]+))?(?:\/([0-9]+))?$/;

function nameOf(spec: FieldSpec, v: number): string {
  const idx = v - spec.min;
  return idx >= 0 && idx < spec.names.length ? spec.names[idx] : String(v);
}

function resolveValue(s: string, spec: FieldSpec): number | null {
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return spec.aliases[s] === undefined ? null : spec.aliases[s];
}

/**
 * Valida y expande un campo cron. Acepta la sintaxis clásica de Vixie: estrella,
 * estrella con paso (asterisco/N), valores sueltos, rangos, listas separadas por
 * coma y las variantes con /step (N-M/step y N/step, de N al máximo).
 * Los nombres de 3 letras (jan, mon…) se normalizan a número. En dow, 7 → 0.
 */
function parseCronField(input: string, spec: FieldSpec): FieldParse {
  const raw = input.trim();
  const lc = raw.toLowerCase();
  if (!lc) return { ok: false, error: `${spec.label}: campo vacío — usa * o un valor (${spec.min}-${spec.max}).` };
  if (lc === 'l') return { ok: false, error: `${spec.label}: "L" (último día) NO existe en cron estándar — es sintaxis de Quartz/Java. Mira la nota del preset "Último día del mes".` };
  const all: number[] = [];
  for (let v = spec.min; v <= spec.max; v++) all.push(v);

  if (lc === '*') {
    return { ok: true, value: { raw, isStar: true, tokens: [{ from: spec.min, to: spec.max, step: 1 }], set: all, spec } };
  }

  const tokens: FieldToken[] = [];
  const set = new Set<number>();
  for (const part of lc.split(',')) {
    const token = part.trim();
    if (!token) return { ok: false, error: `${spec.label}: elemento vacío en la lista "${raw}" (coma doble o coma final).` };
    const match = TOKEN_RE.exec(token);
    if (!match) return { ok: false, error: `${spec.label}: sintaxis no válida "${token}" — admite *, */N, N, N-M, A,B,C y N-M/step.` };
    const p1 = match[1];
    const p2 = match[2];
    const step = match[3] !== undefined ? parseInt(match[3], 10) : 1;
    if (step < 1) return { ok: false, error: `${spec.label}: el step debe ser ≥ 1 en "${token}".` };

    let from: number;
    let to: number;
    if (p1 === '*') {
      if (p2 !== undefined) return { ok: false, error: `${spec.label}: "*" no admite rango ("${token}") — para step usa */${step}.` };
      from = spec.min;
      to = spec.max;
    } else {
      const v1 = resolveValue(p1, spec);
      if (v1 === null) return { ok: false, error: `${spec.label}: valor no reconocido "${p1}" en "${raw}" — usa números ${spec.min}-${spec.max}${Object.keys(spec.aliases).length > 0 ? ' o nombres (jan, mon…)' : ''}.` };
      if (p2 !== undefined) {
        const v2 = resolveValue(p2, spec);
        if (v2 === null) return { ok: false, error: `${spec.label}: límite de rango no reconocido "${p2}" en "${raw}".` };
        if (v1 > v2) return { ok: false, error: `${spec.label}: rango invertido "${v1}-${v2}" — el primer valor debe ser menor o igual.` };
        from = v1;
        to = v2;
      } else {
        from = v1;
        to = step > 1 ? spec.max : v1; // N/step ≡ N-máximo/step (Vixie)
      }
    }
    if (from < spec.min || from > spec.max || to < spec.min || to > spec.max) {
      return { ok: false, error: `${spec.label}: valor fuera de rango en "${token}" — admite ${spec.min}-${spec.max}.` };
    }
    tokens.push({ from, to, step });
    // En dow, 7 es un alias válido de domingo (0): se normaliza al expandir.
    for (let v = from; v <= to; v += step) set.add(spec.key === 'dow' && v === 7 ? 0 : v);
  }
  const sorted = Array.from(set).sort((a, b) => a - b);
  return { ok: true, value: { raw, isStar: false, tokens, set: sorted, spec } };
}

function parseAll(f: CronState): { parsed: AllParsed | null; fieldErrors: Partial<Record<FieldKey, string>> } {
  const fieldErrors: Partial<Record<FieldKey, string>> = {};
  const vals: FieldOk[] = [];
  for (const spec of FIELD_SPECS) {
    const r = parseCronField(f[spec.key], spec);
    if (r.ok) vals.push(r.value);
    else fieldErrors[spec.key] = r.error;
  }
  const parsed: AllParsed | null = vals.length === FIELD_SPECS.length
    ? { minute: vals[0], hour: vals[1], dom: vals[2], month: vals[3], dow: vals[4] }
    : null;
  return { parsed, fieldErrors };
}

/* ─────────────────────────── descripción en español ─────────────────────────── */

const pad2 = (n: number): string => String(n).padStart(2, '0');
const hhmm = (h: number, m: number): string => `${pad2(h)}:${pad2(m)}`;

function joinList(items: string[], max = 6): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length > max) return `${items.slice(0, max).join(', ')}…`;
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

function contiguousRange(vals: number[]): { from: number; to: number } | null {
  if (vals.length < 2) return null;
  for (let i = 1; i < vals.length; i++) if (vals[i] !== vals[i - 1] + 1) return null;
  return { from: vals[0], to: vals[vals.length - 1] };
}

/** Estrella con paso (asterisco/N) detectada → N (token único que cubre min..max con step). */
function starStep(f: FieldOk): number | null {
  const t = f.tokens.length === 1 ? f.tokens[0] : null;
  return t && t.from === f.spec.min && t.to === f.spec.max && t.step > 1 ? t.step : null;
}

function describeTime(p: AllParsed): string {
  const m = p.minute;
  const h = p.hour;
  const mFull = m.set.length === m.spec.max - m.spec.min + 1;
  const hFull = h.set.length === h.spec.max - h.spec.min + 1;
  if ((m.isStar || mFull) && (h.isStar || hFull)) return 'Cada minuto';

  const mStep = starStep(m);
  const hStep = starStep(h);
  if (mStep !== null && (h.isStar || hFull)) return `Cada ${mStep} minutos`;

  const mRange = contiguousRange(m.set);
  const hRange = contiguousRange(h.set);

  if (m.isStar || mFull) {
    if (hStep !== null) return `Cada minuto durante las horas ${joinList(h.set.map((v) => pad2(v)))}`;
    if (hRange) return `Cada minuto entre las ${pad2(hRange.from)}:00 y las ${pad2(hRange.to)}:59`;
    if (h.set.length === 1) return `Cada minuto durante la hora ${pad2(h.set[0])}`;
    return `Cada minuto durante las horas ${joinList(h.set.map((v) => pad2(v)))}`;
  }

  if (m.set.length === 1) {
    const mm = m.set[0];
    if (h.isStar || hFull) return `A los ${mm} minutos de cada hora`;
    if (hStep !== null) return mm === 0 ? `Cada ${hStep} horas en punto` : `Cada ${hStep} horas a los ${mm} minutos`;
    if (h.set.length === 1) return `A las ${hhmm(h.set[0], mm)}`;
    if (hRange && hRange.to - hRange.from + 1 <= 4) return `A las ${joinList(h.set.map((v) => hhmm(v, mm)))}`;
    if (hRange) return `A los ${mm} minutos de cada hora entre las ${pad2(hRange.from)} y las ${pad2(hRange.to)}`;
    return `A las ${joinList(h.set.map((v) => hhmm(v, mm)), 5)}`;
  }

  if (mRange && m.tokens.length === 1 && m.tokens[0].step > 1) return `Cada ${m.tokens[0].step} minutos entre el minuto ${mRange.from} y el ${mRange.to}`;
  if (mRange && mRange.from < mRange.to) {
    if (h.isStar || hFull) return `Del minuto ${mRange.from} al ${mRange.to} de cada hora`;
    if (h.set.length === 1) return `Entre las ${hhmm(h.set[0], mRange.from)} y las ${hhmm(h.set[0], mRange.to)}`;
  }

  if (h.isStar || hFull) return `A los minutos ${joinList(m.set.map(String))} de cada hora`;
  if (h.set.length === 1) return `A las ${joinList(m.set.map((v) => hhmm(h.set[0], v)))}`;
  if (h.set.length * m.set.length <= 6) {
    const times: string[] = [];
    for (const hv of h.set) for (const mv of m.set) times.push(hhmm(hv, mv));
    return `A las ${joinList(times)}`;
  }
  return `Horas ${h.raw}, minutos ${m.raw}`;
}

function describeDay(p: AllParsed): string {
  const domRestricted = !p.dom.isStar;
  const dowRestricted = !p.dow.isStar;
  if (!domRestricted && !dowRestricted) return 'todos los días';
  if (domRestricted && dowRestricted) {
    // Semántica Vixie: dom y dow restringidos a la vez → OR (el banner lo explica).
    return `cuando el día del mes (${p.dom.raw}) o el día de la semana (${p.dow.raw}) coincidan`;
  }
  if (dowRestricted) {
    const vals = p.dow.set;
    const range = contiguousRange(vals);
    if (vals.length === 7) return 'todos los días';
    if (range && range.from === 1 && range.to === 5) return 'de lunes a viernes';
    if (vals.length === 2 && vals[0] === 0 && vals[1] === 6) return 'los fines de semana';
    if (vals.length === 1) return `cada ${nameOf(p.dow.spec, vals[0])}`;
    if (range) return `de ${nameOf(p.dow.spec, range.from)} a ${nameOf(p.dow.spec, range.to)}`;
    return `los ${joinList(vals.map((v) => nameOf(p.dow.spec, v)))}`;
  }
  const vals = p.dom.set;
  const range = contiguousRange(vals);
  if (vals.length === 31) return 'todos los días del mes';
  if (vals.length === 1) return `el día ${vals[0]} de cada mes`;
  if (range) return `del día ${range.from} al ${range.to} de cada mes`;
  return `los días ${joinList(vals.map(String))} de cada mes`;
}

function describeMonth(p: AllParsed): string {
  if (p.month.isStar) return '';
  const vals = p.month.set;
  if (vals.length === 12) return '';
  const range = contiguousRange(vals);
  if (vals.length === 1) return `solo en ${nameOf(p.month.spec, vals[0])}`;
  if (range) return `de ${nameOf(p.month.spec, range.from)} a ${nameOf(p.month.spec, range.to)}`;
  return `en ${joinList(vals.map((v) => nameOf(p.month.spec, v)))}`;
}

/** Descripción natural: "Todos los días a las 02:00", "De lunes a viernes a las 08:30"… */
function describeCron(p: AllParsed): string {
  const time = describeTime(p);
  const day = describeDay(p);
  const month = describeMonth(p);
  const monthPart = month ? `, ${month}` : '';
  if (time.startsWith('Horas ')) return `${time} — ${day}${monthPart}`;
  if (time.startsWith('Cada')) {
    return day === 'todos los días' ? `${time}${monthPart}` : `${time}, ${day}${monthPart}`;
  }
  const daySentence = day === 'todos los días' || day === 'todos los días del mes'
    ? 'Todos los días'
    : day.charAt(0).toUpperCase() + day.slice(1);
  const timeLower = time.charAt(0).toLowerCase() + time.slice(1);
  return `${daySentence} ${timeLower}${monthPart}`;
}

/* ─────────────────────────── próximas ejecuciones ─────────────────────────── */

/** Iteración con saltos inteligentes: mes → día → hora → minuto. Tope: 400 días. */
function computeNextRuns(p: AllParsed, now: Date): { runs: Date[]; exhausted: boolean } {
  const minuteSet = new Set(p.minute.set);
  const hourSet = new Set(p.hour.set);
  const monthSet = new Set(p.month.set);
  const domSet = new Set(p.dom.set);
  const dowSet = new Set(p.dow.set);
  const domRestricted = !p.dom.isStar;
  const dowRestricted = !p.dow.isStar;

  const runs: Date[] = [];
  const limitMs = now.getTime() + 400 * 24 * 60 * 60 * 1000;
  let d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 0, 0);

  const startOfNextDay = (x: Date): Date => new Date(x.getFullYear(), x.getMonth(), x.getDate() + 1, 0, 0, 0, 0);
  const nextHourInSet = (x: Date): number => {
    for (let h = x.getHours() + 1; h <= 23; h++) if (hourSet.has(h)) return h;
    return -1;
  };

  let guard = 0;
  while (runs.length < 5 && d.getTime() <= limitMs && guard < 60000) {
    guard++;
    if (!monthSet.has(d.getMonth() + 1)) {
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
      continue;
    }
    const domOk = domSet.has(d.getDate());
    const dowOk = dowSet.has(d.getDay());
    const dayOk = domRestricted && dowRestricted ? domOk || dowOk : domOk && dowOk; // Vixie: dom+dow restringidos → OR
    if (!dayOk) { d = startOfNextDay(d); continue; }
    if (!hourSet.has(d.getHours())) {
      const nh = nextHourInSet(d);
      d = nh === -1 ? startOfNextDay(d) : new Date(d.getFullYear(), d.getMonth(), d.getDate(), nh, 0, 0, 0);
      continue;
    }
    if (!minuteSet.has(d.getMinutes())) {
      let nm = -1;
      for (let m = d.getMinutes() + 1; m <= 59; m++) if (minuteSet.has(m)) { nm = m; break; }
      d = nm === -1
        ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + 1, 0, 0, 0)
        : new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), nm, 0, 0);
      continue;
    }
    runs.push(new Date(d));
    // Avanzar al siguiente minuto candidato (salto directo, no minuto a minuto).
    let nm = -1;
    for (let m = d.getMinutes() + 1; m <= 59; m++) if (minuteSet.has(m)) { nm = m; break; }
    if (nm === -1) {
      const nh = nextHourInSet(d);
      d = nh === -1 ? startOfNextDay(d) : new Date(d.getFullYear(), d.getMonth(), d.getDate(), nh, 0, 0, 0);
    } else {
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), nm, 0, 0);
    }
  }
  return { runs, exhausted: guard >= 60000 || runs.length < 5 };
}

function relLabel(target: Date, now: Date): string {
  const mins = Math.max(0, Math.round((target.getTime() - now.getTime()) / 60000));
  if (mins < 60) return `en ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `en ${hours} h`;
  return `en ${Math.round(hours / 24)} días`;
}

/* ─────────────────────────── componente ─────────────────────────── */

export const SaCronBuilderTool: React.FC = () => {
  const [fields, setFields] = useState<CronState>({ minute: '0', hour: '2', dom: '*', month: '*', dow: '*' });
  const [command, setCommand] = useState('/opt/scripts/backup.sh');
  const [redirect, setRedirect] = useState(true);
  const [showLastDayNote, setShowLastDayNote] = useState(false);
  const { addedToast, showToast } = useAddToNoteToast();

  const setField = (key: FieldKey, value: string): void => setFields((prev) => ({ ...prev, [key]: value }));
  const applyPreset = (preset: CronState): void => {
    setFields(preset);
    setShowLastDayNote(false);
  };

  const { parsed, fieldErrors } = useMemo(() => parseAll(fields), [fields]);
  const now = useMemo(() => new Date(), []);
  const nextRuns = useMemo(() => (parsed ? computeNextRuns(parsed, now) : null), [parsed, now]);

  const expr = [fields.minute, fields.hour, fields.dom, fields.month, fields.dow].map((s) => s.trim()).join(' ');
  const description = parsed ? describeCron(parsed) : '';
  const bothRestricted = parsed !== null && !parsed.dom.isStar && !parsed.dow.isStar;
  const errorList = Object.values(fieldErrors);

  const crontabLine = `${expr} ${command.trim() || '/opt/scripts/backup.sh'}${redirect ? ' >> /var/log/backup.log 2>&1' : ''}`;
  const crontabBlock = `# m h dom mon dow command\n${crontabLine}`;

  const addToNote = (): void => {
    if (!parsed || !nextRuns) return;
    const nextTxt = nextRuns.runs.length > 0
      ? nextRuns.runs.map((d) => d.toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' })).join(' · ')
      : 'sin ejecuciones en 400 días';
    const rows: Array<[string, string]> = [
      ['Expresión', escapeHtml(expr)],
      ['Descripción', escapeHtml(description)],
      ['Próximas 5 ejecuciones', escapeHtml(nextTxt)],
      ['Línea crontab', escapeHtml(crontabLine)],
      ['Zona horaria', 'calculadas con la hora local del navegador; cron usa la TZ del servidor'],
    ];
    useNoteStore.getState().enqueueNote(`Cron — ${expr}`, buildNoteHtmlTable(rows));
    showToast();
  };

  return (
    <div className="space-y-3">
      <InfoBanner>
        100% offline y educativo. Este <span className="font-semibold">constructor</span> arma la
        expresión cron campo por campo (el Cron Parser de la app explica expresiones ya escritas —
        son complementarios). Las próximas ejecuciones se calculan localmente con la hora de{' '}
        <span className="font-semibold">tu navegador</span>; cron en Linux usa la zona horaria del servidor.
      </InfoBanner>

      {/* Presets globales */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Presets típicos</h3>
        <div className="flex flex-wrap gap-1.5">
          {GLOBAL_PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => applyPreset(p.fields)} title={`Aplicar ${p.label} (${p.fields.minute} ${p.fields.hour} ${p.fields.dom} ${p.fields.month} ${p.fields.dow})`} className="px-2.5 py-1 rounded text-[10px] font-semibold bg-[#161616] hover:bg-[#222] border border-[#262626] text-[#DDD] transition-colors cursor-pointer">
              {p.label}
            </button>
          ))}
          {/* Preset "trampa" pedagógica: cron NO soporta el último día del mes. */}
          <button type="button" onClick={() => setShowLastDayNote(true)} title="Por qué cron NO puede expresar el último día del mes" className="px-2.5 py-1 rounded text-[10px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 transition-colors cursor-pointer">
            Último día del mes ✗
          </button>
        </div>
      </div>

      {showLastDayNote && (
        <div className="px-3 py-2.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 text-[11px] leading-relaxed space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {'"Último día del mes": cron estándar NO lo soporta'}
            </span>
            <button type="button" onClick={() => setShowLastDayNote(false)} className="text-[10px] text-[#777] hover:text-white cursor-pointer shrink-0">ocultar</button>
          </div>
          <p>
            <span className="font-mono">L</span> (last day of month) existe en{' '}
            <span className="font-semibold">Quartz/Java</span>, no en cron clásico (Vixie).
            Workarounds reales:
          </p>
          <CodeBlock code={'# Ejecutar del 28 al 31 y que el script verifique si mañana es día 1:\n0 0 28-31 * * [ "$(date -d tomorrow +\\%d)" = "01" ] && /opt/scripts/mensual.sh'} lang="bash" />
          <p>
            Ojo: en crontab <span className="font-mono">%</span> se interpreta como salto de línea →
            escápalo como <span className="font-mono">{'\\%'}</span>. La alternativa moderna es un
            systemd timer: su calendario admite el último día del mes (sintaxis con{' '}
            <span className="font-mono">~</span>, véase systemd.time(7)).
          </p>
        </div>
      )}

      {/* Los 5 campos */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Campos (m · h · dom · mon · dow)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FIELD_SPECS.map((spec) => (
            <div key={spec.key} className={spec.key === 'dow' ? 'sm:col-span-2' : ''}>
              <Field label={`${spec.label} (${spec.min}-${spec.max})`}>
                <input value={fields[spec.key]} onChange={(e) => setField(spec.key, e.target.value)} placeholder="*" spellCheck={false} autoComplete="off" aria-label={`Campo ${spec.label} de la expresión cron`} className={`${inputCls} ${fieldErrors[spec.key] ? 'border-red-500/60' : ''}`} />
              </Field>
              <div className="flex flex-wrap gap-1 mt-1 items-center">
                {FIELD_PRESETS[spec.key].map((preset) => (
                  <button key={preset} type="button" onClick={() => setField(spec.key, preset)} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#161616] hover:bg-[#222] border border-[#262626] text-[#AAA] transition-colors cursor-pointer">
                    {preset}
                  </button>
                ))}
                <span className="text-[9px] text-[#666] ml-1">{spec.hint}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {errorList.length > 0 && (
        <ErrorBanner message={`Expresión inválida — ${errorList.join(' · ')}`} />
      )}

      {/* Resultado en vivo */}
      {parsed && (
        <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-3 sm:gap-5 overflow-x-auto">
              {[parsed.minute, parsed.hour, parsed.dom, parsed.month, parsed.dow].map((f) => (
                <div key={f.spec.key} className="min-w-0">
                  <div className="font-mono text-lg font-bold text-cyan-300 break-all">{f.raw}</div>
                  <div className="text-[9px] text-[#555] uppercase tracking-widest">{f.spec.short}</div>
                </div>
              ))}
            </div>
            <CopyBtn text={expr} label="Copiar la expresión completa" />
          </div>
          <Row label="En español" value={description} />
        </div>
      )}

      {/* Semántica Vixie dom+dow */}
      {bothRestricted && (
        <InfoBanner>
          Detalle de cron clásico (Vixie): restringiste a la vez día del mes y día de la semana →
          la tarea se ejecuta cuando <span className="font-semibold">CUALQUIERA</span> coincide (OR),
          no ambos (AND). Comportamiento estándar de Vixie/cronie y la fuente nº1 de confusiones.
        </InfoBanner>
      )}

      {/* Próximas ejecuciones */}
      {parsed && nextRuns && (
        <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-1.5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5"><CalendarClock className="w-3 h-3" /> Próximas ejecuciones (hora local)</h3>
          {nextRuns.runs.length === 0 && (
            <p className="text-[11px] text-red-400">Sin ejecuciones en los próximos 400 días — probablemente la combinación nunca coincide (p. ej. día 31 de febrero).</p>
          )}
          {nextRuns.runs.map((d, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <span className="text-[10px] text-[#666] font-mono shrink-0">{i + 1}.</span>
              <span className="text-[11px] text-white flex-1">{d.toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' })}</span>
              <span className="text-[10px] text-cyan-400 shrink-0">{relLabel(d, now)}</span>
            </div>
          ))}
          {nextRuns.exhausted && nextRuns.runs.length > 0 && nextRuns.runs.length < 5 && (
            <p className="text-[10px] text-[#777]">Solo {nextRuns.runs.length} de 5: la expresión es poco frecuente y se agotó el tope de 400 días de búsqueda.</p>
          )}
          <p className="text-[10px] text-[#666] leading-relaxed pt-1 border-t border-[#1A1A1A]">
            Calculado con iteración local (saltos mes→día→hora→minuto, tope 400 días, semántica
            Vixie). Cron usa la zona horaria <span className="text-white">del servidor</span> (compruébala
            con <span className="font-mono text-cyan-300">timedatectl</span>); en cronie/Vixie modernos puedes
            fijar <span className="font-mono text-cyan-300">CRON_TZ=America/Bogota</span> en la propia línea
            del crontab (o TZ global para el demonio).
          </p>
        </div>
      )}

      {/* Despliegue en crontab */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5"><Terminal className="w-3 h-3" /> Despliegue en crontab</h3>
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3 items-start">
          <Field label="Comando a programar (placeholder)">
            <input value={command} onChange={(e) => setCommand(e.target.value)} placeholder="/opt/scripts/backup.sh" spellCheck={false} autoComplete="off" aria-label="Comando que ejecutará la tarea cron" className={inputCls} />
          </Field>
          <label className="flex items-center gap-2 text-[11px] text-[#AAA] pt-4 cursor-pointer select-none">
            <input type="checkbox" checked={redirect} onChange={(e) => setRedirect(e.target.checked)} className="accent-cyan-500 w-3.5 h-3.5 cursor-pointer" />
            Redirigir salida al log
          </label>
        </div>
        <CodeBlock code={crontabBlock} lang="crontab" label="crontab -e" />
        <p className="text-[10px] text-[#666] leading-relaxed">
          Instala con <span className="font-mono text-cyan-300">crontab -e</span> (crontab del usuario dueño), lista con{' '}
          <span className="font-mono text-cyan-300">crontab -l</span> y cuidado con{' '}
          <span className="font-mono text-red-400">crontab -r</span> (borra TODO sin confirmar).{' '}
          <span className="font-mono">{'>> /var/log/backup.log 2>&1'}</span> appenda stdout y stderr (sin{' '}
          <span className="font-mono">2&gt;&amp;1</span> los errores se pierden o llegan por mail). Los{' '}
          <span className="font-mono">%</span> del comando se escapan como <span className="font-mono">{'\\%'}</span>.
        </p>
      </div>

      {/* Añadir a notas */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={addToNote} disabled={!parsed} className={`${btnPrimary} inline-flex items-center gap-1.5`} title="Añadir la expresión, su descripción y las próximas ejecuciones a Notas">
          <BookOpen className="w-3.5 h-3.5" /> Añadir a Notas
        </button>
        <button type="button" onClick={() => applyPreset({ minute: '0', hour: '2', dom: '*', month: '*', dow: '*' })} className={`${btnGhost} inline-flex items-center gap-1.5`} title="Restablecer el ejemplo diario 02:00">
          Restablecer
        </button>
        {addedToast && <span className="text-[10px] text-green-400">Añadido a Notas — crea o elige una nota para verlo.</span>}
      </div>

      {/* Referencia final */}
      <details className="bg-[#0D0D0D] border border-[#262626] rounded p-3">
        <summary className="cursor-pointer text-xs font-semibold text-white flex items-center gap-1.5"><Info className="w-3 h-3 text-cyan-400" /> Referencia: cadenas especiales, límites y alternativas</summary>
        <div className="mt-2 space-y-2 text-[10px] text-[#888] leading-relaxed">
          <div>
            <p className="text-[11px] font-semibold text-white mb-1">Cadenas especiales (equivale a):</p>
            <ul className="space-y-0.5 font-mono">
              {CRON_SHORTCUTS.map((s) => (
                <li key={s.shortcut}><code className="text-cyan-300">{s.shortcut}</code> = {s.equivalent}</li>
              ))}
            </ul>
            <p className="mt-1 text-[#777]">
              <span className="font-mono text-cyan-300">@reboot</span> se evalúa al arrancar el demonio — no se re-ejecuta si cron se reinicia sin reboot.
            </p>
          </div>
          <div className="border-t border-[#1A1A1A] pt-2">
            <p className="text-[11px] font-semibold text-white mb-1">Granularidad mínima: 1 minuto</p>
            <p>
              NO uses cron para intervalos menores a un minuto (encadenar sleep o lanzar un job cada
              segundo es un antipatrón). Para sub-minuto usa{' '}
              <span className="text-white">systemd timers</span> — su calendario admite segundos
              (<span className="font-mono text-cyan-300">OnCalendar=*-*-* *:*:00/30</span>) — o un
              daemon/servicio propio con su bucle.
            </p>
          </div>
          <div className="border-t border-[#1A1A1A] pt-2">
            <p className="text-[11px] font-semibold text-white mb-1">Ejecuciones perdidas (missed runs)</p>
            <p>
              Si el servidor estaba apagado a la hora programada, cron{' '}
              <span className="text-white">NO ejecuta la tarea atrasada</span>: la ventana se pierde.
              Para tareas diarias/semanales en equipos que se apagan usa{' '}
              <span className="font-mono text-cyan-300">anacron</span>; los systemd timers con{' '}
              <span className="font-mono text-cyan-300">Persistent=true</span> también recuperan
              ejecuciones perdidas al arrancar.
            </p>
          </div>
        </div>
      </details>
    </div>
  );
};

export default SaCronBuilderTool;
