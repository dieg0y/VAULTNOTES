import React, { useMemo, useState } from 'react';
import Fuse, { type IFuseOptions } from 'fuse.js';
import {
  LifeBuoy, Search, ArrowLeft, CheckCircle2, AlertTriangle, Zap, Terminal, X,
} from 'lucide-react';
import {
  TROUBLESHOOTING_RUNBOOKS,
  RUNBOOK_COUNT,
  RUNBOOK_CATEGORIES,
  type TroubleshootingRunbook,
} from '../data/troubleshootingRunbooks';

/**
 * RunbooksView — FASE 4c (V6).
 * Explorador de los 42 runbooks universales de troubleshooting L1/L2.
 * 100% offline, sin Dexie (dataset estático), sin input del usuario:
 * filtro por categoría + búsqueda fuzzy instantánea (fuse.js) sobre
 * título/síntomas/tags. Layout de dos paneles tipo Glosario: lista a la
 * izquierda, detalle a la derecha; en móvil se alterna lista ↔ detalle.
 */

interface RunbooksViewProps {
  /** Deep-link desde Ctrl+K: id de runbook a pre-seleccionar (RB-XX-NNN). */
  autoSelectId?: string | null;
  /** Consumir el deep-link (App limpia su estado tras montar la vista). */
  onConsumeAutoSelect?: () => void;
}

const FUSE_OPTIONS: IFuseOptions<TroubleshootingRunbook> = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'id', weight: 0.15 },
    { name: 'symptoms', weight: 0.15 },
    { name: 'tags', weight: 0.3 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
};

const runbookFuse = new Fuse(TROUBLESHOOTING_RUNBOOKS, FUSE_OPTIONS);

/** Móvil: lista ↔ detalle (hidden md:flex). Escritorio: dos paneles. */

export const RunbooksView: React.FC<RunbooksViewProps> = ({ autoSelectId, onConsumeAutoSelect }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Deep-link desde el buscador global (Ctrl+K) — se consume UNA vez al montar.
  React.useEffect(() => {
    if (autoSelectId) {
      setSelectedId(autoSelectId);
      onConsumeAutoSelect?.();
    }
  }, [autoSelectId, onConsumeAutoSelect]);

  const filtered = useMemo(() => {
    let list: TroubleshootingRunbook[];
    const q = query.trim().toLowerCase();
    if (q.length >= 2) {
      list = runbookFuse.search(q).map((r) => r.item);
    } else {
      list = TROUBLESHOOTING_RUNBOOKS;
    }
    if (category) list = list.filter((r) => r.category === category);
    return list;
  }, [query, category]);

  const selected = useMemo(
    () => TROUBLESHOOTING_RUNBOOKS.find((r) => r.id === selectedId) ?? null,
    [selectedId]
  );

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0A0A0A] h-[calc(100vh-48px)]">
      {/* ── Lista (izquierda) ─────────────────────────────────────────── */}
      <div
        className={`${selected ? 'hidden md:flex' : 'flex'} w-full md:w-[300px] md:min-w-[260px] border-r border-[#262626] flex-col h-full`}
      >
        {/* Header + search */}
        <div className="p-4 pb-3 border-b border-[#262626] flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md flex items-center justify-center bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-lg font-bold text-white tracking-tight leading-tight">Troubleshooting &amp; Runbooks</h1>
              <p className="text-[11px] text-[#666] font-mono">
                {RUNBOOK_COUNT} runbooks universales · 100% offline
              </p>
            </div>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#555] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar runbook, síntoma o tag…"
              aria-label="Buscar en los runbooks"
              className="w-full bg-[#161616] border border-[#262626] rounded-md pl-8 pr-8 py-2 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-blue-500/40"
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
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/40'
                  : 'text-[#777] border-[#262626] hover:text-white hover:border-[#333]'
              }`}
            >
              Todas
            </button>
            {RUNBOOK_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(category === c ? null : c)}
                className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                  category === c
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/40'
                    : 'text-[#777] border-[#262626] hover:text-white hover:border-[#333]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de runbooks */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-[#555] gap-2 px-4 text-center">
              <Search className="w-8 h-8 text-[#2a2a2a]" />
              <p className="text-xs">Sin resultados para «{query}»</p>
              <p className="text-[11px] text-[#444]">Prueba con el síntoma: «bloqueada», «vpn 691», «outlook bucle»…</p>
            </div>
          )}
          {filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSelect(r.id)}
              className={`w-full text-left px-2.5 py-2 rounded-md border transition-colors cursor-pointer flex flex-col gap-1 ${
                selectedId === r.id
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-[#0D0D0D] border-[#1f1f1f] hover:border-[#333] hover:bg-[#111]'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-blue-400/90 shrink-0">{r.id}</span>
                <span
                  className="text-[9px] font-mono uppercase px-1 py-0.5 rounded bg-[#161616] text-[#666] border border-[#262626] truncate"
                  title={r.category}
                >
                  {r.category}
                </span>
              </span>
              <span className="text-xs font-medium text-white leading-snug line-clamp-2">{r.title}</span>
              {r.symptoms[0] && (
                <span className="text-[10px] text-[#666] truncate">“{r.symptoms[0]}”</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Detalle (derecha) ─────────────────────────────────────────── */}
      <div className={`${selected ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-y-auto`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[#555] gap-3 p-8 text-center">
            <LifeBuoy className="w-12 h-12 text-[#2a2a2a]" />
            <p className="text-sm text-[#777]">Selecciona un runbook de la lista</p>
            <p className="text-xs max-w-sm">
              Guías paso a paso universales de L1/L2: qué preguntar, qué comando ejecutar y qué
              esperar — con verificación final y criterio de escalación.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto p-4 md:p-6 flex flex-col gap-4">
            {/* Back (móvil) */}
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="md:hidden flex items-center gap-1.5 text-xs text-[#888] hover:text-white cursor-pointer self-start"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver a la lista
            </button>

            {/* Cabecera del runbook */}
            <div className="pb-4 border-b border-[#262626] flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-blue-400">{selected.id}</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {selected.category}
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#161616] text-[#666] border border-[#262626]">
                  Universal
                </span>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight leading-tight">{selected.title}</h1>
            </div>

            {/* Síntomas */}
            <section className="flex flex-col gap-1.5">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Síntomas típicos</h2>
              <ul className="flex flex-col gap-1">
                {selected.symptoms.map((s, i) => (
                  <li key={i} className="text-xs text-[#AAA] bg-[#0D0D0D] border border-[#1f1f1f] rounded px-3 py-1.5">
                    “{s}”
                  </li>
                ))}
              </ul>
            </section>

            {/* Quick wins */}
            <section className="flex flex-col gap-1.5">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Quick wins (30 segundos)</h2>
              <ul className="flex flex-col gap-1">
                {selected.quick_wins.map((qw, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#AAA]">
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{qw}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Pasos */}
            <section className="flex flex-col gap-2">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Escalera de pasos</h2>
              <ol className="flex flex-col gap-2">
                {selected.steps.map((st) => (
                  <li
                    key={st.order}
                    className="bg-[#0D0D0D] border border-[#1f1f1f] rounded-md p-3 flex flex-col gap-1.5"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {st.order}
                      </span>
                      <span className="text-xs text-white leading-relaxed flex-1">{st.action}</span>
                    </div>
                    {st.command && (
                      <div className="ml-7.5 bg-[#101010] border border-[#262626] rounded px-3 py-1.5 flex items-center gap-2 overflow-x-auto">
                        <Terminal className="w-3 h-3 text-emerald-400 shrink-0" />
                        <code className="text-[11px] font-mono text-emerald-300 whitespace-pre-wrap break-all">{st.command}</code>
                      </div>
                    )}
                    {st.expected && (
                      <div className="ml-7.5 flex items-start gap-1.5 text-[11px] text-[#777]">
                        <CheckCircle2 className="w-3 h-3 text-[#4a4a4a] shrink-0 mt-0.5" />
                        <span className="leading-relaxed">
                          <span className="text-[#555] font-semibold">Esperado: </span>
                          {st.expected}
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            {/* Verificación */}
            <section className="flex flex-col gap-1.5">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Verificación de cierre</h2>
              <div className="bg-green-500/5 border border-green-500/20 rounded-md px-3 py-2.5 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <span className="text-xs text-[#BBB] leading-relaxed">{selected.verification}</span>
              </div>
            </section>

            {/* Escalación */}
            <section className="flex flex-col gap-1.5 pb-6">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Cuándo escalar</h2>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-md px-3 py-2.5 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-xs text-[#BBB] leading-relaxed">{selected.escalation}</span>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
