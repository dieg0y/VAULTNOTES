import React, { useMemo, useState } from 'react';
import Fuse, { type IFuseOptions } from 'fuse.js';
import {
  Search, X, ArrowLeft, ArrowDown, Terminal, CheckCircle2,
  GitBranch, AlertTriangle, Shield, LifeBuoy, Wrench, Gauge,
} from 'lucide-react';
import { type PillarTroubleshooting, type DecisionCheck } from '../data/troubleshootingCore';
import { TROUBLESHOOTING_HD, TROUBLESHOOTING_HD_COUNT, TROUBLESHOOTING_HD_CATEGORIES } from '../data/troubleshootingHelpDesk';
import { TROUBLESHOOTING_SA, TROUBLESHOOTING_SA_COUNT, TROUBLESHOOTING_SA_CATEGORIES } from '../data/troubleshootingSysAdmin';
import { TROUBLESHOOTING_SOC, TROUBLESHOOTING_SOC_COUNT, TROUBLESHOOTING_SOC_CATEGORIES } from '../data/troubleshootingSoc';

/**
 * TroubleshootingView (V9 FASE 9) — escaleras de decisión por pilar.
 *
 * Formato PROBLEMA → SÍNTOMA → CHECK → RESULTADO → SIGUIENTE ACCIÓN.
 * NO es una copia de los runbooks: aquí se DIAGNOSTICA (¿dónde está el
 * problema?) con checks baratos primero y ramificación según resultado.
 * Comandos de check copiables. 100% offline, dataset estático.
 */

export type TroubleshootingViewPillar = 'hd' | 'sa' | 'soc';

interface TroubleshootingViewProps {
  /** Qué pilar renderiza. */
  pillar: TroubleshootingViewPillar;
  /** Deep-link desde Ctrl+K: id de guía a pre-seleccionar (TS-XX-NNN). */
  autoSelectId?: string | null;
  /** Consumir el deep-link. */
  onConsumeAutoSelect?: () => void;
}

const FUSE_OPTIONS: IFuseOptions<PillarTroubleshooting> = {
  keys: [
    { name: 'title', weight: 0.35 },
    { name: 'problem', weight: 0.2 },
    { name: 'tags', weight: 0.25 },
    { name: 'symptoms', weight: 0.2 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
};

interface PillarConfig {
  label: string;
  icon: React.ReactNode;
  entries: PillarTroubleshooting[];
  count: number;
  categories: string[];
  accentText: string;
  accentBg: string;
  accentBorder: string;
  accentRing: string;
}

const PILLAR_CONFIG: Record<TroubleshootingViewPillar, PillarConfig> = {
  hd: {
    label: 'Troubleshooting — Service Desk',
    icon: <LifeBuoy className="w-5 h-5" />,
    entries: TROUBLESHOOTING_HD,
    count: TROUBLESHOOTING_HD_COUNT,
    categories: TROUBLESHOOTING_HD_CATEGORIES,
    accentText: 'text-blue-400',
    accentBg: 'bg-blue-500/10',
    accentBorder: 'border-blue-500/20',
    accentRing: 'focus:border-blue-500/40',
  },
  sa: {
    label: 'Troubleshooting — SysAdmin Ops',
    icon: <Wrench className="w-5 h-5" />,
    entries: TROUBLESHOOTING_SA,
    count: TROUBLESHOOTING_SA_COUNT,
    categories: TROUBLESHOOTING_SA_CATEGORIES,
    accentText: 'text-cyan-400',
    accentBg: 'bg-cyan-500/10',
    accentBorder: 'border-cyan-500/20',
    accentRing: 'focus:border-cyan-500/40',
  },
  soc: {
    label: 'Troubleshooting — SOC',
    icon: <Shield className="w-5 h-5" />,
    entries: TROUBLESHOOTING_SOC,
    count: TROUBLESHOOTING_SOC_COUNT,
    categories: TROUBLESHOOTING_SOC_CATEGORIES,
    accentText: 'text-emerald-400',
    accentBg: 'bg-emerald-500/10',
    accentBorder: 'border-emerald-500/20',
    accentRing: 'focus:border-emerald-500/40',
  },
};

/** Un check de la escalera: CHECK → RESULTADO → SIGUIENTE. */
const CheckRow: React.FC<{ check: DecisionCheck; index: number; isLast: boolean }> = ({ check, index, isLast }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-3">
      {/* Columna numerada + conector */}
      <div className="flex flex-col items-center shrink-0">
        <span className="w-6 h-6 rounded-full bg-[#161616] border border-[#262626] text-[10px] font-mono text-[#999] flex items-center justify-center">
          {index + 1}
        </span>
        {!isLast && <span className="w-px flex-1 bg-[#262626] my-1" />}
      </div>
      {/* Contenido */}
      <div className="flex flex-col gap-1.5 pb-4 min-w-0 flex-1">
        <p className="text-xs text-white font-medium leading-relaxed">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#555] mr-1.5">Check:</span>
          {check.check}
        </p>
        {check.command && (
          <div className="bg-[#0A0A0A] border border-[#262626] rounded p-2 flex items-start justify-between gap-2">
            <code className="text-[10.5px] font-mono text-emerald-300 break-all leading-relaxed flex-1 min-w-0">
              {check.command}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(check.command!).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
              className="p-1 rounded text-[#666] hover:text-blue-400 hover:bg-[#161616] transition-colors shrink-0 cursor-pointer"
              title="Copiar comando"
              aria-label="Copiar comando"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Terminal className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
        <p className="text-[10.5px] text-[#AAA] leading-relaxed">
          <span className="text-[9px] font-bold uppercase tracking-widest text-green-500/60 mr-1.5">Resultado:</span>
          {check.result}
        </p>
        <p className="text-[10.5px] text-[#BBB] leading-relaxed bg-[#161616] border border-[#262626] rounded px-2 py-1.5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400/70 mr-1.5 inline-flex items-center gap-1">
            <ArrowDown className="w-2.5 h-2.5" /> Siguiente:
          </span>
          {check.next}
        </p>
      </div>
    </div>
  );
};

const GuideDetail: React.FC<{ guide: PillarTroubleshooting }> = ({ guide }) => (
  <div className="flex flex-col gap-4">
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-mono text-[#888]">{guide.id}</span>
        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border bg-[#161616] text-[#777] border-[#262626]">
          {guide.level}
        </span>
      </div>
      <h2 className="text-base font-bold text-white leading-snug">{guide.title}</h2>
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 flex flex-col gap-1.5">
        <p className="text-[11px] text-[#BBB] leading-relaxed">
          <span className="text-[9px] font-bold uppercase tracking-widest text-rose-400/70 mr-1.5">Problema:</span>
          {guide.problem}
        </p>
        <div className="flex flex-col gap-1">
          {guide.symptoms.map((s, i) => (
            <p key={i} className="text-[10.5px] text-[#AAA] leading-relaxed flex items-start gap-1.5">
              <span className="text-amber-400/60 shrink-0">▸</span><span>{s}</span>
            </p>
          ))}
        </div>
      </div>
    </div>

    {/* Escalera de decisión */}
    <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#555] flex items-center gap-1.5 mb-3">
        <GitBranch className="w-3.5 h-3.5" /> Escalera de decisión
      </span>
      {guide.checks.map((c, i) => (
        <CheckRow key={i} check={c} index={i} isLast={i === guide.checks.length - 1} />
      ))}
    </div>

    {/* Remedición + verificación */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#555] flex items-center gap-1.5 mb-1">
          <Gauge className="w-3 h-3" /> Dónde suele estar
        </span>
        <p className="text-[10.5px] text-[#BBB] leading-relaxed">{guide.remediation}</p>
      </div>
      <div className="bg-[#0D0D0D] border border-green-500/20 rounded p-3">
        <span className="text-[9px] font-bold uppercase tracking-widest text-green-400/80 flex items-center gap-1.5 mb-1">
          <CheckCircle2 className="w-3 h-3" /> Confirmar diagnóstico
        </span>
        <p className="text-[10.5px] text-[#BBB] leading-relaxed">{guide.verification}</p>
      </div>
    </div>
  </div>
);

export const TroubleshootingView: React.FC<TroubleshootingViewProps> = ({
  pillar,
  autoSelectId,
  onConsumeAutoSelect,
}) => {
  const cfg = PILLAR_CONFIG[pillar];
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fuse = useMemo(() => new Fuse(cfg.entries, FUSE_OPTIONS), [cfg.entries]);

  React.useEffect(() => {
    if (autoSelectId) {
      setSelectedId(autoSelectId);
      onConsumeAutoSelect?.();
    }
  }, [autoSelectId, onConsumeAutoSelect]);

  const filtered = useMemo(() => {
    let list: PillarTroubleshooting[];
    const q = query.trim().toLowerCase();
    if (q.length >= 2) {
      list = fuse.search(q).map((r) => r.item);
    } else {
      list = cfg.entries;
    }
    if (category) list = list.filter((g) => g.level === category);
    return list;
  }, [query, category, fuse, cfg.entries]);

  const selected = useMemo(() => cfg.entries.find((g) => g.id === selectedId) ?? null, [selectedId, cfg.entries]);

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0A0A0A] h-[calc(100vh-48px)]">
      {/* ── Lista ─────────────────────────────────────────────────── */}
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
                {cfg.count} guías · Check → Resultado → Siguiente
              </p>
            </div>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#555] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar problema: «dns», «vpn», «gpo», «sign-in»…"
              aria-label="Buscar en las guías de troubleshooting"
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
          {/* QA E2E: 17 chips (1 por guía) pueden envolverse en ~10 filas y
              empujar el header a >600px — más alto que un viewport corto,
              dejando la lista sin espacio clicable. Se limita con max-h +
              overflow (regla de listas largas) y el header no encoge (shrink-0). */}
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
              Todos
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
                title={c}
              >
                {c.length > 28 ? `${c.slice(0, 26)}…` : c}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#666]">{filtered.length} de {cfg.count} guías</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#555] gap-2 text-center px-4">
              <AlertTriangle className="w-10 h-10 text-[#2a2a2a]" />
              <p className="text-xs text-[#777]">Sin resultados para «{query}»</p>
            </div>
          ) : (
            filtered.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedId(g.id)}
                className={`w-full text-left px-4 py-2.5 border-b border-[#161616] transition-colors cursor-pointer ${
                  selectedId === g.id
                    ? `${cfg.accentBg} border-l-2 border-l-current ${cfg.accentText}`
                    : 'hover:bg-[#111] border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[9px] font-mono text-[#555]">{g.id}</span>
                </div>
                <p className={`text-xs leading-snug ${selectedId === g.id ? 'text-white font-medium' : 'text-[#BBB]'}`}>
                  {g.title}
                </p>
                <p className="text-[10px] text-[#666] leading-snug mt-0.5 truncate">{g.problem}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Detalle ───────────────────────────────────────────────── */}
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
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-5 max-w-3xl">
              <GuideDetail guide={selected} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#555] gap-3 p-8 text-center">
            <GitBranch className="w-12 h-12 text-[#2a2a2a]" />
            <p className="text-sm text-[#777]">Selecciona una guía de decisión</p>
            <p className="text-xs text-[#555] max-w-sm leading-relaxed">
              Cada guía es una escalera: check barato primero, y según el resultado, la siguiente acción.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
