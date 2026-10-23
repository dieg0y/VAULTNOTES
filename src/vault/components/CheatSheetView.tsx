import React, { useMemo, useState } from 'react';
import Fuse, { type IFuseOptions } from 'fuse.js';
import { Zap, Search, CheckCircle2, X } from 'lucide-react';
import {
  SERVICE_DESK_CHEATSHEET,
  CHEATSHEET_COUNT,
  CHEATSHEET_CATEGORIES,
} from '../data/serviceDeskCheatSheet';
import {
  SYSADMIN_CHEATSHEET,
  SYSADMIN_CHEATSHEET_COUNT,
  SYSADMIN_CHEATSHEET_CATEGORIES,
} from '../data/sysadminCheatSheet';
import {
  SOC_CHEATSHEET,
  SOC_CHEATSHEET_COUNT,
  SOC_CHEATSHEET_CATEGORIES,
} from '../data/socCheatSheet';
import { type PillarCheatEntry } from '../data/cheatsheetCore';

/**
 * CheatSheetView — FASE 4c (V6).
 * Los 62 fixes top de L1/L2 al instante: sin input, sin estado, 100% offline.
 * Buscador fuzzy instantáneo (fuse.js) sobre título/problema/tags + filtro
 * por categoría. Grid de cards compactas: problema → fix (comandos copiables
 * estilo terminal) → verificación.
 */

export type CheatSheetViewPillar = 'hd' | 'sa' | 'soc';

interface CheatSheetViewProps {
  /** Qué pilar renderiza. */
  pillar: CheatSheetViewPillar;
  /** Deep-link desde Ctrl+K: id de entrada a resaltar. */
  autoSelectId?: string | null;
  /** Consumir el deep-link (App limpia su estado tras montar la vista). */
  onConsumeAutoSelect?: () => void;
}

const FUSE_OPTIONS: IFuseOptions<PillarCheatEntry> = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'problem', weight: 0.2 },
    { name: 'tags', weight: 0.3 },
    { name: 'fix', weight: 0.1 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
};


interface CheatPillarConfig {
  title: string;
  subtitle: (count: number) => string;
  entries: PillarCheatEntry[];
  count: number;
  categories: string[];
  accentText: string;
  accentBg: string;
  accentBorder: string;
  accentRing: string;
  placeholder: string;
}

const PILLAR_CONFIG: Record<CheatSheetViewPillar, CheatPillarConfig> = {
  hd: {
    title: 'CheatSheet — Service Desk',
    subtitle: (c) => `${c} fixes top L1/L2 · sin input · 100% offline`,
    entries: SERVICE_DESK_CHEATSHEET as PillarCheatEntry[],
    count: CHEATSHEET_COUNT,
    categories: CHEATSHEET_CATEGORIES,
    accentText: 'text-amber-400',
    accentBg: 'bg-amber-500/10',
    accentBorder: 'border-amber-500/20',
    accentRing: 'focus:border-amber-500/40',
    placeholder: 'Buscar fix: «vpn 691», «bloqueada», «spooler», «teams»…',
  },
  sa: {
    title: 'CheatSheet — SysAdmin Ops',
    subtitle: (c) => `${c} fixes de infra · sin input · 100% offline`,
    entries: SYSADMIN_CHEATSHEET,
    count: SYSADMIN_CHEATSHEET_COUNT,
    categories: SYSADMIN_CHEATSHEET_CATEGORIES,
    accentText: 'text-cyan-400',
    accentBg: 'bg-cyan-500/10',
    accentBorder: 'border-cyan-500/20',
    accentRing: 'focus:border-cyan-500/40',
    placeholder: 'Buscar fix: «dcdiag», «gpo», «dhcp», «raid», «repadmin»…',
  },
  soc: {
    title: 'CheatSheet — SOC / Blue Team',
    subtitle: (c) => `${c} fixes de detección y respuesta · sin input · 100% offline`,
    entries: SOC_CHEATSHEET,
    count: SOC_CHEATSHEET_COUNT,
    categories: SOC_CHEATSHEET_CATEGORIES,
    accentText: 'text-emerald-400',
    accentBg: 'bg-emerald-500/10',
    accentBorder: 'border-emerald-500/20',
    accentRing: 'focus:border-emerald-500/40',
    placeholder: 'Buscar fix: «phishing», «4625», «kql», «spray», «sysmon»…',
  },
};


const CATEGORY_COLOR: Record<string, string> = {
  'AD / Identidad': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Windows: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  Redes: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  'Microsoft 365': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'Impresoras y Hardware': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'Accesos y Permisos': 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
  'Ofimática y Comunicación': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export const CheatSheetView: React.FC<CheatSheetViewProps> = ({ pillar, autoSelectId, onConsumeAutoSelect }) => {
  const cfg = PILLAR_CONFIG[pillar];
  const cheatFuse = useMemo(() => new Fuse(cfg.entries, FUSE_OPTIONS), [cfg.entries]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Deep-link desde el buscador global (Ctrl+K) — se consume UNA vez.
  React.useEffect(() => {
    if (autoSelectId) {
      setHighlightId(autoSelectId);
      // Centrar la entrada resaltada en el scroll.
      window.setTimeout(() => {
        document.getElementById(`cs-${autoSelectId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 60);
      onConsumeAutoSelect?.();
    }
  }, [autoSelectId, onConsumeAutoSelect]);

  const filtered = useMemo(() => {
    let list: PillarCheatEntry[];
    const q = query.trim().toLowerCase();
    if (q.length >= 2) {
      list = cheatFuse.search(q).map((r) => r.item);
    } else {
      list = cfg.entries;
    }
    if (category) list = list.filter((c) => c.category === category);
    return list;
  }, [query, category, cheatFuse, cfg.entries]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#0A0A0A] h-[calc(100vh-48px)]">
      <div className="max-w-5xl mx-auto p-4 md:p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col gap-3 pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-md flex items-center justify-center ${cfg.accentBg} ${cfg.accentText} ${cfg.accentBorder} border shrink-0`}>
              <Zap className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-white tracking-tight leading-tight">{cfg.title}</h1>
              <p className="text-[11px] text-[#666] font-mono">
                {cfg.subtitle(cfg.count)}
              </p>
            </div>
          </div>

          {/* Buscador fuzzy */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#555] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={cfg.placeholder}
              aria-label="Buscar en el CheatSheet"
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

          {/* Filtros por categoría */}
          <div className="flex flex-wrap gap-1.5">
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
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/40'
                    : 'text-[#777] border-[#262626] hover:text-white hover:border-[#333]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-[#666]">
            {filtered.length} de {cfg.count} entradas
            {query && <> · búsqueda fuzzy activa</>}
          </p>
        </div>

        {/* Grid de cards */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#555] gap-3 text-center">
            <Search className="w-12 h-12 text-[#2a2a2a]" />
            <p className="text-sm text-[#777]">Sin resultados para «{query}»</p>
            <p className="text-xs text-[#555] max-w-sm">
              Prueba con el síntoma tal cual lo reporta el usuario: «no imprime», «pide contraseña», «vpn 800»…
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map((c) => {
              const isHi = highlightId === c.id;
              return (
                <article
                  key={c.id}
                  id={`cs-${c.id}`}
                  className={`bg-[#0D0D0D] rounded-md p-4 flex flex-col gap-2.5 border transition-colors ${
                    isHi ? 'border-amber-500/50 ring-1 ring-amber-500/30' : 'border-[#1f1f1f] hover:border-[#333]'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-mono text-amber-400/90 shrink-0">{c.id}</span>
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border truncate ${
                        CATEGORY_COLOR[c.category] ?? 'bg-[#161616] text-[#777] border-[#262626]'
                      }`}
                      title={c.category}
                    >
                      {c.category}
                    </span>
                  </div>
                  <h2 className="text-sm font-semibold text-white leading-snug">{c.title}</h2>
                  <p className="text-[11px] text-[#888] leading-relaxed italic">{c.problem}</p>
                  <ol className="flex flex-col gap-1 mt-0.5">
                    {c.fix.map((line, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[9px] font-mono text-[#4a4a4a] shrink-0 mt-[3px] w-3 text-right">{i + 1}</span>
                        <code
                          className={`text-[11px] font-mono leading-relaxed break-words ${
                            /^(net |ipconfig|nslookup|ping|tracert|w32tm|chkdsk|sfc|dism|dsregcmd|Get-|Set-|Unlock-|Enable-|Restart-|Stop-|Start-|reg |manage-bde|control |mstsc|msconfig|cmdlet)/i.test(line)
                              ? 'text-emerald-300'
                              : 'text-[#BBB]'
                          }`}
                        >
                          {line}
                        </code>
                      </li>
                    ))}
                  </ol>
                  {c.verify && (
                    <div className="flex items-start gap-1.5 text-[11px] text-[#777] border-t border-[#1a1a1a] pt-2 mt-auto">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500/60 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{c.verify}</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
