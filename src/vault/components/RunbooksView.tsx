import React, { useMemo, useState } from 'react';
import Fuse, { type IFuseOptions } from 'fuse.js';
import {
  LifeBuoy, Search, ArrowLeft, CheckCircle2, AlertTriangle, Terminal, X,
  ClipboardList, TrendingDown, Stethoscope, ListOrdered, Copy, FileCheck2,
  ArrowUpRight, Languages, FileText, Ticket, Wrench,
} from 'lucide-react';
import { type PillarRunbook, type RunbookStep } from '../data/runbooksCore';
import { RUNBOOKS_HD, RUNBOOKS_HD_COUNT, RUNBOOKS_HD_CATEGORIES } from '../data/runbooksHelpDesk';
import { RUNBOOKS_SA, RUNBOOKS_SA_COUNT, RUNBOOKS_SA_CATEGORIES } from '../data/runbooksSysAdmin';
import { RUNBOOKS_SOC, RUNBOOKS_SOC_COUNT, RUNBOOKS_SOC_CATEGORIES } from '../data/runbooksSoc';

/**
 * RunbooksView (V9) — base de datos consultable de runbooks por pilar.
 *
 * Cada runbook llega como TICKET REAL: ticket_example, problema,
 * impacto, síntomas, causas, prerrequisitos, escalera universal con
 * comandos COPIABLES, verificación, evidencia, escalación y las dos
 * respuestas EN INGLÉS listas para copiar (cliente + explicación
 * técnica para L2). FLUJO: BUSCAR → ABRIR → LEER → COPIAR → APLICAR.
 * 100% offline, dataset estático, sin input del usuario.
 */

export type RunbookViewPillar = 'hd' | 'sa' | 'soc';

interface RunbooksViewProps {
  /** Qué pilar renderiza. */
  pillar: RunbookViewPillar;
  /** Deep-link desde Ctrl+K: id de runbook a pre-seleccionar (RB-XX-NNN). */
  autoSelectId?: string | null;
  /** Consumir el deep-link (App limpia su estado tras montar la vista). */
  onConsumeAutoSelect?: () => void;
}

const FUSE_OPTIONS: IFuseOptions<PillarRunbook> = {
  keys: [
    { name: 'title', weight: 0.3 },
    { name: 'id', weight: 0.1 },
    { name: 'problem_description', weight: 0.1 },
    { name: 'keywords', weight: 0.25 },
    { name: 'symptoms', weight: 0.12 },
    { name: 'ticket_example', weight: 0.13 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
};

interface PillarConfig {
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  entries: PillarRunbook[];
  count: number;
  categories: string[];
  accentText: string;
  accentBg: string;
  accentBorder: string;
  accentRing: string;
  englishBorder: string;
}

const PILLAR_CONFIG: Record<RunbookViewPillar, PillarConfig> = {
  hd: {
    label: 'Runbooks — Service Desk / HelpDesk',
    subtitle: 'Cada problema como ticket real · paso a paso universal · respuesta en inglés copiable',
    icon: <LifeBuoy className="w-5 h-5" />,
    entries: RUNBOOKS_HD,
    count: RUNBOOKS_HD_COUNT,
    categories: RUNBOOKS_HD_CATEGORIES,
    accentText: 'text-blue-400',
    accentBg: 'bg-blue-500/10',
    accentBorder: 'border-blue-500/20',
    accentRing: 'focus:border-blue-500/40',
    englishBorder: 'border-blue-500/20',
  },
  sa: {
    label: 'Runbooks — SysAdmin Ops / Infra',
    subtitle: 'Cada problema como ticket real · paso a paso universal · respuesta en inglés copiable',
    icon: <Wrench className="w-5 h-5" />,
    entries: RUNBOOKS_SA,
    count: RUNBOOKS_SA_COUNT,
    categories: RUNBOOKS_SA_CATEGORIES,
    accentText: 'text-cyan-400',
    accentBg: 'bg-cyan-500/10',
    accentBorder: 'border-cyan-500/20',
    accentRing: 'focus:border-cyan-500/40',
    englishBorder: 'border-cyan-500/20',
  },
  soc: {
    label: 'Runbooks — SOC / Blue Team',
    subtitle: 'Detection → Investigation → Evidence → Containment → Remediation → Verification → Escalation',
    icon: <ShieldIcon />,
    entries: RUNBOOKS_SOC,
    count: RUNBOOKS_SOC_COUNT,
    categories: RUNBOOKS_SOC_CATEGORIES,
    accentText: 'text-emerald-400',
    accentBg: 'bg-emerald-500/10',
    accentBorder: 'border-emerald-500/20',
    accentRing: 'focus:border-emerald-500/40',
    englishBorder: 'border-emerald-500/20',
  },
};

function ShieldIcon() {
  return <LifeBuoy className="w-5 h-5" />;
}

/** Bloque copiable en inglés (respuesta al cliente / explicación técnica). */
const EnglishBlock: React.FC<{
  title: string;
  text: string;
  accent: 'customer' | 'technical';
}> = ({ title, text, accent }) => {
  const [copied, setCopied] = useState(false);
  const isCustomer = accent === 'customer';
  return (
    <div
      className={`rounded-md p-3 flex flex-col gap-2 ${
        isCustomer
          ? 'bg-green-500/5 border border-green-500/25'
          : 'bg-sky-500/5 border border-sky-500/25'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${isCustomer ? 'text-green-400/90' : 'text-sky-400/90'}`}>
          <Languages className="w-3 h-3" />
          {title}
          <span className="font-normal normal-case tracking-normal text-[9px] text-[#666]">(EN · ready to copy)</span>
        </span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            });
          }}
          className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
            isCustomer
              ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
              : 'bg-sky-500/10 text-sky-400 border-sky-500/30 hover:bg-sky-500/20'
          }`}
          title="Copiar al portapapeles"
        >
          {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <p className="text-[11px] text-[#CCC] leading-relaxed font-mono whitespace-pre-wrap">{text}</p>
    </div>
  );
};

/** Comando con botón de copiar (paso individual o bloque suelto). */
const CopyableCommand: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="bg-[#0A0A0A] border border-[#262626] rounded p-2 flex items-start justify-between gap-2 group">
      <code className="text-[10.5px] font-mono text-emerald-300 break-all leading-relaxed flex-1 min-w-0">
        {text}
      </code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="p-1 rounded text-[#666] hover:text-blue-400 hover:bg-[#161616] transition-colors shrink-0 cursor-pointer"
        title="Copiar comando"
        aria-label="Copiar comando"
      >
        {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};

const StepRow: React.FC<{ step: RunbookStep }> = ({ step }) => (
  <div className="flex flex-col gap-1.5 py-2 border-b border-[#1a1a1a] last:border-0">
    <div className="flex items-start gap-2.5">
      <span className="w-5 h-5 rounded bg-[#161616] border border-[#262626] text-[10px] font-mono text-[#888] flex items-center justify-center shrink-0 mt-[1px]">
        {step.order}
      </span>
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        <p className="text-xs text-white leading-relaxed font-medium">{step.action}</p>
        {step.command && <CopyableCommand text={step.command} />}
        {step.expected && (
          <p className="text-[10.5px] text-[#888] leading-relaxed flex items-start gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-green-500/60 shrink-0 mt-[2px]" />
            <span><span className="text-[#666] font-semibold uppercase text-[9px] mr-1">Esperado:</span>{step.expected}</span>
          </p>
        )}
        {step.explanation && (
          <p className="text-[10.5px] text-[#999] leading-relaxed flex items-start gap-1.5">
            <span className="text-[#555] shrink-0 mt-[1px]">↳</span>
            <span>{step.explanation}</span>
          </p>
        )}
      </div>
    </div>
  </div>
);

const DetailSection: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <div className="flex flex-col gap-2">
    <span className="text-[10px] font-bold uppercase tracking-widest text-[#555] flex items-center gap-1.5">
      {icon}
      {title}
    </span>
    {children}
  </div>
);

const RunbookDetail: React.FC<{ rb: PillarRunbook; accent: PillarConfig }> = ({ rb, accent }) => (
  <div className="flex flex-col gap-4">
    {/* Header del runbook */}
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-mono ${accent.accentText} shrink-0`}>{rb.id}</span>
        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border bg-[#161616] text-[#777] border-[#262626]">
          {rb.category}
        </span>
      </div>
      <h2 className="text-base font-bold text-white leading-snug">{rb.title}</h2>
      {/* Ticket de ejemplo */}
      <div className="bg-[#161616] border border-[#262626] rounded p-2.5 flex items-start gap-2.5">
        <Ticket className="w-3.5 h-3.5 text-[#888] shrink-0 mt-[2px]" />
        <div className="min-w-0">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#555] block mb-0.5">Ticket de ejemplo</span>
          <code className="text-[11px] font-mono text-amber-200/90 break-all leading-relaxed">{rb.ticket_example}</code>
        </div>
      </div>
    </div>

    {/* Problema + impacto */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#555] flex items-center gap-1.5 mb-1">
          <Stethoscope className="w-3 h-3" /> Problema
        </span>
        <p className="text-[11px] text-[#BBB] leading-relaxed">{rb.problem_description}</p>
      </div>
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#555] flex items-center gap-1.5 mb-1">
          <TrendingDown className="w-3 h-3" /> Impacto de negocio
        </span>
        <p className="text-[11px] text-[#BBB] leading-relaxed">{rb.business_impact}</p>
      </div>
    </div>

    {/* Síntomas + causas + prerrequisitos */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#555] block mb-1.5">Síntomas</span>
        <ul className="flex flex-col gap-1">
          {rb.symptoms.map((s, i) => (
            <li key={i} className="text-[10.5px] text-[#AAA] leading-relaxed flex items-start gap-1.5">
              <span className="text-amber-400/60 shrink-0">▸</span><span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#555] block mb-1.5">Causas probables</span>
        <ul className="flex flex-col gap-1">
          {rb.root_causes.map((c, i) => (
            <li key={i} className="text-[10.5px] text-[#AAA] leading-relaxed flex items-start gap-1.5">
              <span className="text-rose-400/60 shrink-0">▸</span><span>{c}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#555] block mb-1.5">Prerrequisitos</span>
        <ul className="flex flex-col gap-1">
          {rb.prerequisites.map((p, i) => (
            <li key={i} className="text-[10.5px] text-[#AAA] leading-relaxed flex items-start gap-1.5">
              <span className="text-sky-400/60 shrink-0">▸</span><span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>

    {/* Escalera universal */}
    <div className={`bg-[#0D0D0D] border ${accent.accentBorder} rounded p-3.5 flex flex-col gap-1`}>
      <span className={`text-[10px] font-bold uppercase tracking-widest ${accent.accentText} flex items-center gap-1.5 mb-1`}>
        <ListOrdered className="w-3.5 h-3.5" /> Paso a paso universal
      </span>
      {rb.step_by_step_universal.map((s) => (
        <StepRow key={s.order} step={s} />
      ))}
    </div>

    {/* Comandos sueltos copiables */}
    {rb.commands_copyable.length > 0 && (
      <DetailSection icon={<Terminal className="w-3 h-3" />} title="Comandos copiables">
        <div className="flex flex-col gap-1.5">
          {rb.commands_copyable.map((c, i) => (
            <CopyableCommand key={i} text={c} />
          ))}
        </div>
      </DetailSection>
    )}

    {/* Verificación + evidencia + escalación */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="bg-[#0D0D0D] border border-green-500/20 rounded p-3">
        <span className="text-[9px] font-bold uppercase tracking-widest text-green-400/80 flex items-center gap-1.5 mb-1">
          <FileCheck2 className="w-3 h-3" /> Verificación
        </span>
        <p className="text-[10.5px] text-[#BBB] leading-relaxed">{rb.verification}</p>
      </div>
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#555] flex items-center gap-1.5 mb-1">
          <ClipboardList className="w-3 h-3" /> Evidencia
        </span>
        <ul className="flex flex-col gap-1">
          {rb.evidence_to_collect.map((e, i) => (
            <li key={i} className="text-[10.5px] text-[#AAA] leading-relaxed flex items-start gap-1.5">
              <span className="text-[#555] shrink-0">·</span><span>{e}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-[#0D0D0D] border border-amber-500/20 rounded p-3">
        <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400/80 flex items-center gap-1.5 mb-1">
          <ArrowUpRight className="w-3 h-3" /> Escalación
        </span>
        <p className="text-[10.5px] text-[#BBB] leading-relaxed">{rb.escalation}</p>
      </div>
    </div>

    {/* Respuestas en inglés copiables */}
    <EnglishBlock
      title="Customer response (EN)"
      text={rb.english_customer_response_template}
      accent="customer"
    />
    <EnglishBlock
      title="Technical explanation for L2 (EN)"
      text={rb.english_technical_explanation}
      accent="technical"
    />
  </div>
);

export const RunbooksView: React.FC<RunbooksViewProps> = ({ pillar, autoSelectId, onConsumeAutoSelect }) => {
  const cfg = PILLAR_CONFIG[pillar];
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Índice fuzzy por pilar — se construye una vez por montaje.
  const fuse = useMemo(() => new Fuse(cfg.entries, FUSE_OPTIONS), [cfg.entries]);

  // Deep-link desde el buscador global (Ctrl+K) — se consume UNA vez.
  React.useEffect(() => {
    if (autoSelectId) {
      setSelectedId(autoSelectId);
      onConsumeAutoSelect?.();
    }
  }, [autoSelectId, onConsumeAutoSelect]);

  const filtered = useMemo(() => {
    let list: PillarRunbook[];
    const q = query.trim().toLowerCase();
    if (q.length >= 2) {
      list = fuse.search(q).map((r) => r.item);
    } else {
      list = cfg.entries;
    }
    if (category) list = list.filter((r) => r.category === category);
    return list;
  }, [query, category, fuse, cfg.entries]);

  const selected = useMemo(() => cfg.entries.find((r) => r.id === selectedId) ?? null, [selectedId, cfg.entries]);

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0A0A0A] h-[calc(100vh-48px)]">
      {/* ── Lista (izquierda) ─────────────────────────────────────────── */}
      <div
        className={`${selected ? 'hidden md:flex' : 'flex'} w-full md:w-[300px] md:min-w-[260px] border-r border-[#262626] flex-col h-full`}
      >
        <div className="p-4 pb-3 border-b border-[#262626] flex flex-col gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-md flex items-center justify-center ${cfg.accentBg} ${cfg.accentText} ${cfg.accentBorder} border shrink-0`}>
              {cfg.icon}
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-base font-bold text-white tracking-tight leading-tight truncate">{cfg.label}</h1>
              <p className="text-[11px] text-[#666] font-mono">
                {cfg.count} runbooks · 100% offline
              </p>
            </div>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#555] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar: «bloqueada», «dns», «phishing», «vpn»…"
              aria-label="Buscar en los runbooks"
              className={`w-full bg-[#161616] border border-[#262626] rounded-md pl-8 pr-8 py-2 text-xs text-white placeholder:text-[#555] focus:outline-none ${cfg.accentRing}`}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#555] hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* Filtros por categoría — max-h por regla de listas largas
              (chips de 11 categorías en viewport corto). */}
          <div className="flex flex-wrap gap-1.5 max-h-[84px] overflow-y-auto">
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                category === null
                  ? `${cfg.accentBg} ${cfg.accentText} ${cfg.accentBorder}`
                  : 'text-[#777] border-[#262626] hover:text-white hover:border-[#333]'
              }`}
            >
              Todas
            </button>
            {cfg.categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(category === c ? null : c)}
                className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                  category === c
                    ? `${cfg.accentBg} ${cfg.accentText} ${cfg.accentBorder}`
                    : 'text-[#777] border-[#262626] hover:text-white hover:border-[#333]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#666]">
            {filtered.length} de {cfg.count} runbooks
            {query && <> · búsqueda fuzzy activa</>}
          </p>
        </div>

        {/* Lista scrolleable */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#555] gap-2 text-center px-4">
              <AlertTriangle className="w-10 h-10 text-[#2a2a2a]" />
              <p className="text-xs text-[#777]">Sin resultados para «{query}»</p>
              <p className="text-[10px] text-[#555]">Prueba con el síntoma tal cual lo reporta el usuario o el alert.</p>
            </div>
          ) : (
            filtered.map((rb) => (
              <button
                key={rb.id}
                type="button"
                onClick={() => setSelectedId(rb.id)}
                className={`w-full text-left px-4 py-2.5 border-b border-[#161616] transition-colors cursor-pointer ${
                  selectedId === rb.id
                    ? `${cfg.accentBg} border-l-2 border-l-current ${cfg.accentText}`
                    : 'hover:bg-[#111] border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[9px] font-mono text-[#555]">{rb.id}</span>
                  <span className="text-[8.5px] font-mono uppercase px-1 py-0.5 rounded border bg-[#161616] text-[#666] border-[#262626] truncate">
                    {rb.category}
                  </span>
                </div>
                <p className={`text-xs leading-snug ${selectedId === rb.id ? 'text-white font-medium' : 'text-[#BBB]'}`}>
                  {rb.title}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Detalle (derecha) ─────────────────────────────────────────── */}
      <div className={`${selected ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-hidden`}>
        {selected ? (
          <>
            <div className="px-4 py-2.5 border-b border-[#262626] bg-[#0D0D0D] flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="md:hidden flex items-center gap-1 text-[11px] text-[#888] hover:text-white cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Volver
              </button>
              <span className="text-[11px] text-[#666] font-mono hidden md:block truncate">
                {selected.id} · {selected.title}
              </span>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `${selected.id} — ${selected.title}\n\nTICKET: ${selected.ticket_example}\n\nPROBLEMA: ${selected.problem_description}\n\nPASOS:\n${selected.step_by_step_universal
                      .map((s) => `${s.order}. ${s.action}${s.command ? `\n   > ${s.command}` : ''}`)
                      .join('\n')}\n\nVERIFICACIÓN: ${selected.verification}\n\nRESPUESTA (EN):\n${selected.english_customer_response_template}`
                  );
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-[10px] font-semibold transition-colors cursor-pointer shrink-0 ${cfg.accentBg} ${cfg.accentText} ${cfg.accentBorder} hover:opacity-80`}
                title="Copiar el runbook completo (ticket + pasos + respuesta) al portapapeles"
              >
                <FileText className="w-3 h-3" /> Copiar runbook
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-5 max-w-3xl">
              <RunbookDetail rb={selected} accent={cfg} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#555] gap-3 p-8 text-center">
            <LifeBuoy className="w-12 h-12 text-[#2a2a2a]" />
            <p className="text-sm text-[#777]">Selecciona un runbook de la lista</p>
            <p className="text-xs text-[#555] max-w-sm leading-relaxed">
              {cfg.subtitle}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
