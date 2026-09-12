'use client';

import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Map as RoadmapIcon, Check, Download, Copy, ChevronDown, FileCheck2 } from 'lucide-react';
import { db } from '../db';
import { ROADMAP_TIERS, ROADMAP_MASTERY_NOTE, ROADMAP_HEADER, type RoadmapTierDef, type RoadmapPhaseDef, type RoadmapItemDef } from '../data/roadmapData';
import { buildRoadmapMarkdown, roadmapMarkdownFilename } from '../utils/roadmapExport';
import { downloadBlob } from '../utils/downloadBlob';

/**
 * RoadmapView — checklist interactivo del ROADMAP DEFINITIVO:
 * Junior IAM / Identity Security Analyst (3 tiers + proyecto final,
 * 14 fases). El contenido vive en data/roadmapData.ts; el estado (done)
 * persiste en la tabla Dexie `roadmapItems` → viaja en los backups ZIP
 * → sobrevive en el USB.
 *
 * Progreso global + por tier + por fase. Export del checklist completo
 * como Markdown (para archivo o para pegárselo a una IA).
 */

const tierAccent = (tierId: string): { text: string; border: string; bg: string; bar: string } => {
  switch (tierId) {
    case 'rm-t1':
      return { text: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500' };
    case 'rm-t2':
      return { text: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10', bar: 'bg-amber-500' };
    case 'rm-t3':
      return { text: 'text-sky-400', border: 'border-sky-500/30', bg: 'bg-sky-500/10', bar: 'bg-sky-500' };
    default:
      return { text: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10', bar: 'bg-blue-600' };
  }
};

const ProgressBar: React.FC<{ done: number; total: number; barCls?: string; className?: string }> = ({
  done,
  total,
  barCls = 'bg-blue-600',
  className = '',
}) => {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className={`h-1.5 rounded-full bg-[#1d1d1d] overflow-hidden ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-all duration-500 ${barCls}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const RoadmapItemRow: React.FC<{ item: RoadmapItemDef; done: boolean; onToggle: () => void }> = ({ item, done, onToggle }) => {
  const isEvidence = item.label?.toLowerCase().includes('evidencia');
  return (
    <li className="group">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        className={`w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-md border transition-colors cursor-pointer ${
          done
            ? 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10'
            : 'border-[#262626] bg-[#111] hover:border-[#333] hover:bg-[#161616]'
        }`}
      >
        {/* Checkbox */}
        <span
          aria-hidden="true"
          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
            done ? 'bg-emerald-600 border-emerald-500' : 'border-[#444] bg-[#161616]'
          }`}
        >
          {done && <Check className="w-3 h-3 text-white" />}
        </span>
        <span className="min-w-0 flex-1">
          {item.label && (
            <span
              className={`text-[10px] font-bold uppercase tracking-wide mr-1.5 ${
                isEvidence ? 'text-amber-400' : done ? 'text-emerald-400' : 'text-[#888]'
              }`}
            >
              {isEvidence && <FileCheck2 className="w-3 h-3 inline mr-0.5 -mt-0.5" />}
              {item.label}:
            </span>
          )}
          <span className={`text-xs leading-relaxed ${done ? 'text-[#777] line-through decoration-[#444]' : 'text-[#CCC]'}`}>
            {item.text}
          </span>
        </span>
      </button>
    </li>
  );
};

const PhaseCard: React.FC<{ phase: RoadmapPhaseDef; doneMap: Map<string, boolean>; onToggle: (id: string, next: boolean) => void }> = ({
  phase,
  doneMap,
  onToggle,
}) => {
  const [open, setOpen] = useState(true);
  const done = phase.items.filter((i) => doneMap.get(i.id)).length;
  const total = phase.items.length;
  const complete = done === total && total > 0;

  return (
    <section className={`bg-[#0D0D0D] border rounded-lg overflow-hidden transition-colors ${complete ? 'border-emerald-500/30' : 'border-[#262626]'}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#111] transition-colors cursor-pointer"
      >
        <span
          className={`w-7 h-7 rounded flex items-center justify-center text-[11px] font-mono font-bold shrink-0 border ${
            complete ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-[#161616] text-[#999] border-[#262626]'
          }`}
        >
          {complete ? <Check className="w-4 h-4" /> : phase.number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2 flex-wrap">
            <span className={`text-xs font-bold ${complete ? 'text-emerald-400' : 'text-white'}`}>{phase.title}</span>
            <span className="text-[10px] font-mono text-[#555]">
              {done}/{total}
            </span>
          </span>
          <ProgressBar done={done} total={total} className="mt-1.5 max-w-[280px]" barCls={complete ? 'bg-emerald-500' : 'bg-blue-600'} />
        </span>
        <ChevronDown className={`w-4 h-4 text-[#555] shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 flex flex-col gap-1.5 border-t border-[#1a1a1a]">
          {phase.note && (
            <p className="text-[11px] text-[#888] italic leading-relaxed px-2.5 py-1.5 rounded bg-[#111] border border-[#222] mt-1.5">{phase.note}</p>
          )}
          <ul className="flex flex-col gap-1.5 mt-1">
            {phase.items.map((item) => (
              <RoadmapItemRow
                key={item.id}
                item={item}
                done={!!doneMap.get(item.id)}
                onToggle={() => onToggle(item.id, !doneMap.get(item.id))}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

const TierSection: React.FC<{ tier: RoadmapTierDef; doneMap: Map<string, boolean>; onToggle: (id: string, next: boolean) => void }> = ({ tier, doneMap, onToggle }) => {
  const [open, setOpen] = useState(true);
  const accent = tierAccent(tier.id);
  const done = tier.phases.reduce((acc, p) => acc + p.items.filter((i) => doneMap.get(i.id)).length, 0);
  const total = tier.phases.reduce((acc, p) => acc + p.items.length, 0);

  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${accent.border} ${accent.bg} hover:brightness-125 transition-all cursor-pointer text-left`}
      >
        <div className="min-w-0 flex-1">
          <h2 className={`text-sm font-bold tracking-wide ${accent.text}`}>{tier.title}</h2>
          <p className="text-[11px] text-[#888] mt-0.5 leading-relaxed">{tier.subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0 w-24 sm:w-36">
          <span className="text-[10px] font-mono text-[#999]">
            {done}/{total} · {total > 0 ? Math.round((done / total) * 100) : 0}%
          </span>
          <ProgressBar done={done} total={total} barCls={accent.bar} className="w-full" />
        </div>
        <ChevronDown className={`w-4 h-4 text-[#777] shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="flex flex-col gap-3 pl-1 sm:pl-2 border-l border-[#1e1e1e] ml-2">
          {tier.phases.map((phase) => (
            <PhaseCard key={phase.id} phase={phase} doneMap={doneMap} onToggle={onToggle} />
          ))}
        </div>
      )}
    </section>
  );
};

export const RoadmapView: React.FC = () => {
  const rows = useLiveQuery(() => db.roadmapItems.toArray(), [], []);
  const [toast, setToast] = useState<string | null>(null);

  const doneMap = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const r of rows) m.set(r.id, r.done);
    return m;
  }, [rows]);

  const total = useMemo(() => ROADMAP_TIERS.reduce((acc, t) => acc + t.phases.reduce((a, p) => a + p.items.length, 0), 0), []);
  const done = useMemo(() => {
    let d = 0;
    for (const tier of ROADMAP_TIERS)
      for (const phase of tier.phases) for (const item of phase.items) if (doneMap.get(item.id)) d++;
    return d;
  }, [doneMap]);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const handleToggle = (id: string, next: boolean) => {
    void db.roadmapItems.update(id, {
      done: next,
      doneAt: next ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const handleExport = () => {
    const md = buildRoadmapMarkdown(doneMap);
    downloadBlob(new Blob([md], { type: 'text/markdown;charset=utf-8' }), roadmapMarkdownFilename());
    showToast('Roadmap exportado como Markdown');
  };

  const handleCopy = async () => {
    const md = buildRoadmapMarkdown(doneMap);
    try {
      await navigator.clipboard.writeText(md);
      showToast('Roadmap copiado al portapapeles');
    } catch {
      showToast('No se pudo copiar — usa Exportar');
    }
  };

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-48px)] overflow-y-auto bg-[#0A0A0A] relative">
      {/* Header */}
      <div className="px-6 py-3 border-b border-[#262626] bg-[#0D0D0D] flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10">
        <div className="min-w-0">
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <RoadmapIcon className="w-4 h-4 text-blue-400" />
            Roadmap: Junior IAM / Identity Security Analyst
          </h1>
          <p className="text-xs text-[#888]">
            {ROADMAP_HEADER.specialization} · {ROADMAP_HEADER.edge}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#262626] hover:border-blue-500/40 bg-[#161616] text-xs font-semibold text-[#E5E5E5] hover:text-white transition-colors cursor-pointer"
            title="Copiar el checklist con tu progreso al portapapeles"
          >
            <Copy className="w-3.5 h-3.5 text-blue-400" />
            Copiar
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#262626] hover:border-blue-500/40 bg-[#161616] text-xs font-semibold text-[#E5E5E5] hover:text-white transition-colors cursor-pointer"
            title="Exportar el checklist con tu progreso como Markdown"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            Exportar MD
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 max-w-4xl w-full">
        {/* Progreso global + nota de mastery */}
        <section className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-sm font-bold text-white">Progreso global</h2>
              <p className="text-[11px] text-[#777] mt-0.5">
                {done} de {total} ítems completados
              </p>
            </div>
            <span className="text-2xl font-mono font-bold text-blue-400">{pct}%</span>
          </div>
          <ProgressBar done={done} total={total} className="h-2" barCls={pct === 100 ? 'bg-emerald-500' : 'bg-blue-600'} />
          <p className="text-[11px] text-[#888] leading-relaxed italic border-l-2 border-[#262626] pl-3">{ROADMAP_MASTERY_NOTE}</p>
        </section>

        {/* Tiers */}
        {ROADMAP_TIERS.map((tier) => (
          <TierSection key={tier.id} tier={tier} doneMap={doneMap} onToggle={handleToggle} />
        ))}

        <p className="text-[10px] text-[#555] pb-2">
          El progreso se guarda en la base de datos local (viaja en los backups ZIP) y nunca se resetea al actualizar la app.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#161616] border border-[#333] text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2"
        >
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          {toast}
        </div>
      )}
    </div>
  );
};
