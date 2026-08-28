/**
 * MitreExplorerTool.tsx — 100% offline MITRE ATT&CK Explorer for VaultNotes.
 *
 * WHAT IT DOES
 * ------------
 * Lets the SOC analyst browse a curated local dataset of ~30 MITRE ATT&CK
 * Enterprise techniques (covering the 14 tactics). Filter by tactic chip
 * and/or free-text search (id, name, tactic, description, tags, subtechnique
 * ids/names). Click a technique to open a detail modal with description,
 * detection notes, platforms, subtechniques, tags, and cross-links to other
 * VaultNotes tools (PowerShell Analyzer, Command Line Analyzer, Log Parser,
 * Windows Event IDs, IoC Extractor, IOC Defanger, Sigma Explorer, Detection
 * Query Helper).
 *
 * DEEP-LINK (autoOpenId)
 * ----------------------
 * If `autoOpenId` is passed in (e.g. "T1059" or "T1059.001"), the tool finds
 * the matching top-level technique via `findMitreById`, opens its detail
 * modal, and seeds the search box with the id so the user sees the match.
 * Uses the React 19 render-time state adjustment pattern (same as PortsTool
 * and HttpTool in ToolsView.tsx) for follow-up prop changes after mount.
 *
 * CROSS-TOOL HAND-OFFS
 * ---------------------
 * - [Open Sigma] / Related Tools buttons → usePendingToolStore.setPending({
 *     toolId: 'sigma', entryId: <first matching rule id>
 *   }) so Sigma Explorer deep-opens to the matching rule.
 * - [Open Detection Query] / [Open PowerShell Analyzer] / etc → usePendingToolStore
 *   .setPending({ toolId: <ref> }) (no entryId).
 * - [Add to Note] → useNoteStore.enqueueNote('MITRE ATT&CK — <id>', htmlTable)
 *   where htmlTable is a <table> with all fields HTML-escaped via escapeHtml
 *   (NO dangerouslySetInnerHTML anywhere in this file).
 *
 * SECURITY CONSTRAINTS
 * ---------------------
 * 100% offline. No fetch, no axios, no XMLHttpRequest, no telemetry.
 * No eval, no new Function, no setTimeout(string), no dangerouslySetInnerHTML.
 * MITRE URL is a public reference (https://attack.mitre.org/...) — no user
 * data leaves the browser when the user clicks [Open MITRE online].
 *
 * Spec reference: Task ID 4.
 */
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X, ExternalLink, Terminal, SquareTerminal, FileText, Shield, Network,
  ShieldOff, BookMarked, Code, Search, BookOpen, Tag, Layers, Crosshair,
  Lightbulb,
} from 'lucide-react';
import {
  MITRE_TACTICS, MITRE_TECHNIQUES, findMitreById,
  type MitreTechnique, type VaultToolRef,
} from '../../data/mitreData';
import { findSigmaByMitre } from '../../data/sigmaData';
import { usePendingToolStore } from '../../store/pendingToolStore';
import { useNoteStore } from '../../store/noteStore';
import { InfoBanner, inputCls, btnGhost, btnPrimary } from './_shared';
import { mitreUrl } from '../../utils/mitreUrl';
import { escapeHtml } from '../../utils/escapeHtml';

/* ---------- helpers (no external libs) ---------- */

/** HTML-escape user-facing strings before concatenating into the note body. */
/** Truncate a string to ~max chars with a trailing ellipsis. */
function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

/* ---------- icon + label maps for VaultToolRef cross-links ---------- */

const TOOL_ICON: Record<VaultToolRef, React.ComponentType<{ className?: string }>> = {
  'powershell-analyzer': Terminal,
  'cmd-analyzer': SquareTerminal,
  'log-parser': FileText,
  'winevent': Shield,
  'ioc': Network,
  'ioc-defang': ShieldOff,
  'sigma': BookMarked,
  'detection-query': Code,
};

const TOOL_LABEL: Record<VaultToolRef, string> = {
  'powershell-analyzer': 'Open PowerShell Analyzer',
  'cmd-analyzer': 'Open Command Line Analyzer',
  'log-parser': 'Open Log Parser',
  'winevent': 'Open Windows Event IDs',
  'ioc': 'Open IoC Extractor',
  'ioc-defang': 'Open IOC Defanger',
  'sigma': 'Open Sigma Explorer',
  'detection-query': 'Open Detection Query Helper',
};

/* ---------- component ---------- */

interface MitreExplorerProps {
  /** When set, auto-opens the detail panel for this MITRE technique ID (e.g. "T1059.001"). */
  autoOpenId?: string | number;
  /** Called after the deep-link has been applied (parent clears it). */
  onAutoOpenConsumed?: () => void;
}

export const MitreExplorerTool: React.FC<MitreExplorerProps> = ({ autoOpenId, onAutoOpenConsumed }) => {
  // Initial deep-link: resolve on mount so the modal opens immediately.
  const initialMatch = (autoOpenId !== undefined && autoOpenId !== null && autoOpenId !== '')
    ? findMitreById(String(autoOpenId))
    : undefined;

  const [q, setQ] = useState(initialMatch ? String(autoOpenId) : '');
  const [selectedTactic, setSelectedTactic] = useState<string | null>(null);
  const [selected, setSelected] = useState<MitreTechnique | null>(initialMatch || null);
  const [addedToNote, setAddedToNote] = useState(false);

  // Deep-link follow-up: render-time state adjustment when autoOpenId changes.
  // (Same pattern as PortsTool / HttpTool / WinEventTool in ToolsView.tsx.)
  const [prevAutoOpen, setPrevAutoOpen] = useState<string | number | undefined>(autoOpenId);
  if (autoOpenId !== prevAutoOpen) {
    setPrevAutoOpen(autoOpenId);
    if (autoOpenId !== undefined && autoOpenId !== null && autoOpenId !== '') {
      const m = findMitreById(String(autoOpenId));
      if (m) {
        setSelected(m);
        setQ(String(autoOpenId));
      }
    }
  }

  // Notify parent that the deep-link has been consumed (side-effect only).
  useEffect(() => {
    if (autoOpenId !== undefined && autoOpenId !== null && autoOpenId !== '') {
      onAutoOpenConsumed?.();
    }
  }, [autoOpenId, onAutoOpenConsumed]);

  // Filtered list — qMatches by id/name/tactic/description/tags/subtechniques,
  // AND tactic filter if a chip is selected.
  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    const qMatches = (t: MitreTechnique): boolean => {
      if (!qLower) return true;
      if (t.id.toLowerCase().includes(qLower)) return true;
      if (t.name.toLowerCase().includes(qLower)) return true;
      if (t.tactic.toLowerCase().includes(qLower)) return true;
      if (t.description.toLowerCase().includes(qLower)) return true;
      if (t.tags.some((tag) => tag.toLowerCase().includes(qLower))) return true;
      if (t.subtechniques.some(
        (sub) => sub.id.toLowerCase().includes(qLower) || sub.name.toLowerCase().includes(qLower),
      )) return true;
      return false;
    };
    return MITRE_TECHNIQUES.filter(
      (t) => (selectedTactic === null || t.tactic === selectedTactic) && qMatches(t),
    );
  }, [q, selectedTactic]);

  /* ---------- cross-tool navigation ---------- */

  /** Trigger navigation to another VaultNotes tool via the pending store. */
  const openTool = (ref: VaultToolRef, technique: MitreTechnique): void => {
    if (ref === 'sigma') {
      const sigmaMatch = findSigmaByMitre(technique.id);
      const entryId = sigmaMatch[0]?.id;
      usePendingToolStore.getState().setPending({
        toolId: ref,
        ...(entryId !== undefined ? { entryId } : {}),
      });
    } else {
      usePendingToolStore.getState().setPending({ toolId: ref });
    }
    setSelected(null);
  };

  /** Enqueue an HTML table summarising the technique for [Add to Note]. */
  const addToNote = (technique: MitreTechnique): void => {
    const rows: string[] = [];
    const tr = (label: string, value: string): string =>
      `<tr><td style="background:#161616;color:#888;padding:4px;border:1px solid #333;font-weight:bold;">${escapeHtml(label)}</td>` +
      `<td style="padding:4px;border:1px solid #333;color:#DDD;">${escapeHtml(value)}</td></tr>`;
    rows.push(tr('ID', technique.id));
    rows.push(tr('Name', technique.name));
    rows.push(tr('Tactic', technique.tactic));
    rows.push(tr('Description', technique.description));
    rows.push(tr('Detection', technique.detection));
    rows.push(tr('Platforms', technique.platforms.join(' · ')));
    rows.push(tr('Sub-techniques',
      technique.subtechniques.length === 0
        ? '—'
        : technique.subtechniques.map((s) => `${s.id} ${s.name}`).join('\n'),
    ));
    rows.push(tr('Tags', technique.tags.join(', ')));
    const htmlTable =
      `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:monospace;font-size:11px;">` +
      rows.join('') +
      `</table>`;
    useNoteStore.getState().enqueueNote('MITRE ATT&CK — ' + technique.id, htmlTable);
    setSelected(null);
    setAddedToNote(true);
    window.setTimeout(() => setAddedToNote(false), 2500);
  };

  /* ---------- subtechnique click → search by subtech id ---------- */
  const searchSubtech = (subId: string): void => {
    setQ(subId);
    setSelected(null);
  };

  /* ---------- render ---------- */
  return (
    <div className="space-y-3">
      {/* search box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555]" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por ID (T1059.001), nombre, táctica o keyword..."
          className={`${inputCls} pl-8`}
          aria-label="Buscar técnica MITRE ATT&CK"
        />
      </div>

      {/* tactic chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setSelectedTactic(null)}
          className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
            selectedTactic === null
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-[#161616] border border-[#262626] text-[#888] hover:text-white hover:border-blue-500/40'
          }`}
        >
          Todas
        </button>
        {MITRE_TACTICS.map((tactic) => (
          <button
            key={tactic}
            type="button"
            onClick={() => setSelectedTactic(selectedTactic === tactic ? null : tactic)}
            className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
              selectedTactic === tactic
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-[#161616] border border-[#262626] text-[#888] hover:text-white hover:border-blue-500/40'
            }`}
          >
            {tactic}
          </button>
        ))}
      </div>

      {/* "added to note" toast */}
      {addedToNote && (
        <InfoBanner>
          Añadido a Notas — crea una nota para verlo.
        </InfoBanner>
      )}

      {/* sub-tech not detailed banner (shown when search yields 0 results) */}
      {q.trim() && filtered.length === 0 && (
        <InfoBanner>
          Sub-técnica no detallada en el dataset local. Prueba con el ID padre (ej: <code className="font-mono text-blue-300">T1059</code>) o borra el filtro.
        </InfoBanner>
      )}

      {/* result count */}
      <div className="text-[10px] text-[#555]">
        {filtered.length} técnicas — click para ver detalle.
      </div>

      {/* result list */}
      <div className="max-h-[480px] overflow-y-auto space-y-1 pr-1" style={{ scrollbarWidth: 'thin' }}>
        {filtered.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelected(t)}
            className="w-full text-left bg-[#0D0D0D] border border-[#262626] rounded p-2.5 hover:border-blue-500/40 hover:bg-[#161616] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-[11px] font-mono font-bold text-blue-400">{t.id}</code>
              <span className="text-xs font-semibold text-white">{t.name}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161616] text-[#666]">
                {t.tactic}
              </span>
            </div>
            <div className="mt-1 text-[9px] text-[#666]">{t.platforms.join(' · ')}</div>
            <div className="mt-0.5 text-[10px] text-[#888] truncate">
              {truncate(t.description, 80)}
            </div>
          </button>
        ))}
      </div>

      {/* detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-[#0D0D0D] border border-[#262626] rounded-lg max-w-2xl w-full max-h-[82vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="sticky top-0 bg-[#0D0D0D] border-b border-[#262626] px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <code className="text-sm font-mono font-bold text-blue-400">{selected.id}</code>
                <span className="text-sm font-semibold text-white truncate">{selected.name}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161616] text-[#666]">
                  {selected.tactic}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1 rounded text-[#666] hover:text-white hover:bg-[#161616] cursor-pointer transition-colors shrink-0"
                aria-label="Cerrar detalle"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* body */}
            <div className="p-5 space-y-4 text-xs text-[#E5E5E5]">
              {/* descripción */}
              <section className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-400">
                  <BookOpen className="w-3 h-3" />
                  Descripción
                </div>
                <p className="text-[#BBB] leading-relaxed text-[11px] pl-5">{selected.description}</p>
              </section>

              {/* detección */}
              <section className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-400">
                  <Crosshair className="w-3 h-3" />
                  Detección
                </div>
                <p className="text-[#BBB] leading-relaxed text-[11px] pl-5 whitespace-pre-wrap">{selected.detection}</p>
              </section>

              {/* plataformas */}
              <section className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-400">
                  <Layers className="w-3 h-3" />
                  Plataformas
                </div>
                <p className="text-[#888] text-[11px] pl-5">{selected.platforms.join(' · ')}</p>
              </section>

              {/* sub-técnicas */}
              {selected.subtechniques.length > 0 && (
                <section className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-400">
                    <Layers className="w-3 h-3" />
                    Sub-técnicas
                  </div>
                  <div className="pl-5 space-y-1.5">
                    {selected.subtechniques.map((sub) => {
                      const isClickable = /^T\d+\.\d+$/.test(sub.id);
                      return (
                        <div
                          key={sub.id}
                          className="bg-[#0A0A0A] border border-[#262626] rounded p-2 flex flex-col gap-0.5"
                        >
                          <div className="flex items-center gap-2">
                            {isClickable ? (
                              <button
                                type="button"
                                onClick={() => searchSubtech(sub.id)}
                                className="text-[11px] font-mono text-blue-300 hover:text-blue-200 hover:underline cursor-pointer"
                                title={`Buscar "${sub.id}" en el dataset local`}
                              >
                                {sub.id}
                              </button>
                            ) : (
                              <code className="text-[11px] font-mono text-blue-300">{sub.id}</code>
                            )}
                            <span className="text-[11px] text-white font-medium">{sub.name}</span>
                          </div>
                          <p className="text-[10px] text-[#888] leading-relaxed">{sub.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* tags */}
              {selected.tags.length > 0 && (
                <section className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-400">
                    <Tag className="w-3 h-3" />
                    Tags
                  </div>
                  <div className="pl-5 flex flex-wrap gap-1">
                    {selected.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-[#161616] border border-[#262626] text-[#888] text-[9px] px-1.5 py-0.5 rounded font-mono"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* cross-links a herramientas VaultNotes (Related Tools section) */}
              {selected.relatedTools.length > 0 && (
                <section className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-400">
                    <Lightbulb className="w-3 h-3" />
                    Cross-links a herramientas VaultNotes
                  </div>
                  <div className="pl-5 flex flex-wrap gap-2">
                    {selected.relatedTools.map((ref) => {
                      const Icon = TOOL_ICON[ref];
                      return (
                        <button
                          key={ref}
                          type="button"
                          onClick={() => openTool(ref, selected)}
                          className={`${btnGhost} inline-flex items-center gap-1.5`}
                        >
                          <Icon className="w-3 h-3" />
                          {TOOL_LABEL[ref]}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* cross-link action buttons row (bottom) */}
              <section className="border-t border-[#262626] pt-3 flex flex-wrap gap-2">
                <a
                  href={mitreUrl(selected.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${btnPrimary} inline-flex items-center gap-1.5 no-underline`}
                >
                  <ExternalLink className="w-3 h-3" />
                  Open MITRE online
                </a>
                {(() => {
                  const sigmaMatch = findSigmaByMitre(selected.id);
                  const hasSigma = sigmaMatch.length > 0;
                  const titleAttr = hasSigma
                    ? `Abrir Sigma Explorer en la primera regla local (${sigmaMatch[0].id})`
                    : 'No hay reglas Sigma locales para esta técnica';
                  return (
                    <button
                      type="button"
                      onClick={() => hasSigma && openTool('sigma', selected)}
                      disabled={!hasSigma}
                      title={titleAttr}
                      className={`${btnGhost} inline-flex items-center gap-1.5`}
                    >
                      <BookMarked className="w-3 h-3" />
                      Open Sigma
                    </button>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => openTool('detection-query', selected)}
                  className={`${btnGhost} inline-flex items-center gap-1.5`}
                >
                  <Code className="w-3 h-3" />
                  Open Detection Query
                </button>
                <button
                  type="button"
                  onClick={() => addToNote(selected)}
                  className={`${btnGhost} inline-flex items-center gap-1.5`}
                >
                  <BookOpen className="w-3 h-3" />
                  Add to Note
                </button>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MitreExplorerTool;
