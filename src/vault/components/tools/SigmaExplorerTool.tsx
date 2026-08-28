'use client';

/**
 * SigmaExplorerTool.tsx — Sigma Rule Explorer (100% offline).
 *
 * WHAT IT DOES
 * ------------
 * The user browses a curated local catalog of Sigma detection rules (~15).
 * Sigma (https://sigma.rule/) is a generic YAML signature format for SIEMs.
 * This tool lets the SOC analyst:
 *   • Search rules by title, Event ID, MITRE ID, logsource, tag, or free text
 *   • Filter by severity (critical/high/medium/low/informational) and status
 *     (stable/test/experimental/deprecated)
 *   • Click a rule card to open a modal with the full YAML, the detection
 *     logic (condition + ANDed selectors), MITRE ATT&CK refs, related
 *     Windows Event IDs, KQL (Sentinel) and SPL (Splunk) equivalents.
 *
 * CUSTOM YAML SYNTAX HIGHLIGHTER (NO EXTERNAL LIBS)
 * ----------------------------------------------------
 * The YamlBlock component is a tiny hand-rolled tokenizer that splits each
 * line into spans: comments (italic gray), keys (blue), values (green if
 * quoted, orange if number/bool/null, gray otherwise), list dashes (gray).
 * The output is an array of React elements — NO `dangerouslySetInnerHTML`,
 * NO Prism/highlight.js/Shiki, NO js-yaml. It renders the YAML as styled
 * TEXT only; the Sigma rule is never parsed or "executed".
 *
 * DEEP-LINK (autoOpenId)
 * ----------------------
 * If `autoOpenId` is passed (e.g. "sigma-failed-logon-4625"), the tool finds
 * the rule via `findSigmaById`, opens its detail modal, and seeds the search
 * box with the id so the user sees the match. Uses the React 19 render-time
 * state adjustment pattern (same as MitreExplorerTool / WinEventTool) for
 * follow-up prop changes after mount.
 *
 * CROSS-TOOL HAND-OFFS
 * ---------------------
 * - MITRE chip click / [Open MITRE] → usePendingToolStore.setPending({
 *     toolId: 'mitre', entryId: <first mitre id> }) → opens MITRE Explorer
 *     with that technique preselected.
 * - Event ID chip click → usePendingToolStore.setPending({
 *     toolId: 'winevent', entryId: <eventId> }) → opens Windows Event IDs.
 * - [Open Detection Query] → usePendingToolStore.setPending({
 *     toolId: 'detection-query' }) → opens Detection Query Helper.
 * - [Add to Note] → useNoteStore.enqueueNote('Sigma Rule — <title>',
 *     htmlTable) where htmlTable is a <table> with all fields HTML-escaped
 *     via escapeHtml (NO dangerouslySetInnerHTML anywhere in this file).
 *
 * SECURITY CONSTRAINTS
 * ---------------------
 * 100% offline. No fetch, no APIs, no telemetry. No YAML parser, no code
 * execution. All Sigma data lives in `sigmaData.ts`. The YamlBlock is a
 * pure text renderer — no string is ever `eval`ed or `new Function`ed.
 *
 * Spec reference: Task ID 5.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  X, BookOpen, Search, Shield, Code, Crosshair, Copy, Check,
  ExternalLink, Tag, Calendar, User,
} from 'lucide-react';
import {
  inputCls, btnPrimary, btnGhost, CopyBtn, CodeBlock,
} from './_shared';
import {
  SIGMA_RULES, SIGMA_LEVELS, SIGMA_STATUSES, findSigmaById,
  type SigmaRule, type SigmaLevel, type SigmaStatus,
} from '../../data/sigmaData';
import { usePendingToolStore } from '../../store/pendingToolStore';
import { useNoteStore } from '../../store/noteStore';
import { escapeHtml } from '../../utils/escapeHtml';

/* ====================================================================
 * HELPERS
 * ==================================================================== */

/**
 * escapeHtml — local HTML entity escaper used by the [Add to Note] table
 * builder. YamlBlock itself uses React children (auto-escaped by React),
 * so this helper is only needed for the HTML string we hand to the note
 * store. NEVER used with dangerouslySetInnerHTML.
 */
/** Severity pill className — matches the SOC color convention. */
function severityBadgeCls(level: SigmaLevel): string {
  switch (level) {
    case 'critical':      return 'bg-red-500/15 border border-red-500/30 text-red-400';
    case 'high':          return 'bg-orange-500/15 border border-orange-500/30 text-orange-400';
    case 'medium':        return 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-400';
    case 'low':           return 'bg-blue-500/15 border border-blue-500/30 text-blue-400';
    case 'informational': return 'bg-gray-500/15 border border-gray-500/30 text-gray-400';
    default:              return 'bg-gray-500/15 border border-gray-500/30 text-gray-400';
  }
}

/** Format a logsource object as "product / category / service" (whichever set). */
function logsourceStr(ls: SigmaRule['logsource']): string {
  const parts: string[] = [];
  if (ls.product)  parts.push(ls.product);
  if (ls.category) parts.push(ls.category);
  if (ls.service)  parts.push(ls.service);
  return parts.join(' / ');
}

/* ====================================================================
 * YAML HIGHLIGHTER (no external libraries)
 * ==================================================================== */

/**
 * renderValue — color a single scalar value according to YAML-ish heuristics.
 *   - Quoted ('…' / "…") → green-300 (string)
 *   - true|false|null|number → orange-300 (literal)
 *   - Otherwise → text-[#DDD] (plain)
 * Returns null for empty strings.
 */
function renderValue(value: string): React.ReactNode {
  if (value === '') return null;
  if (value.startsWith("'") || value.startsWith('"')) {
    return <span className="text-green-300">{value}</span>;
  }
  // Number (pure digits), boolean, or null literal.
  if (/^(true|false|null|-?\d+(\.\d+)?)$/i.test(value)) {
    return <span className="text-orange-300">{value}</span>;
  }
  return <span className="text-[#DDD]">{value}</span>;
}

/**
 * YamlLine — tokenize ONE YAML line into React spans (no HTML strings).
 *
 * Tokenizer rules:
 *  - Empty line         → spacer div.
 *  - Full comment line   → italic gray (text after optional leading ws).
 *  - "key: value"        → blue key, gray colon, value (colored).
 *  - "- value" list item → gray dash, value (colored).
 *  - Inline " # comment" → split: code part + gray italic comment.
 *  - Fallback             → plain gray text.
 *
 * React auto-escapes text children — no manual escaping needed here.
 * (escapeHtml is only used for the [Add to Note] HTML string path.)
 */
const YamlLine: React.FC<{ line: string }> = ({ line }) => {
  // Empty line → spacer.
  if (line.trim() === '') {
    return <div>&nbsp;</div>;
  }

  // Split indent + content (indent is preserved via whitespace-pre span).
  const m = line.match(/^(\s*)(\S.*)$/);
  if (!m) {
    return <div className="whitespace-pre text-[#888]">{line}</div>;
  }
  const indent = m[1];
  const content = m[2];

  // Full-comment line (starts with # after optional whitespace).
  if (content.startsWith('#')) {
    return <div className="whitespace-pre text-[#666] italic">{line}</div>;
  }

  // Detect inline comment: ` # …` after at least one non-# character.
  // (YAML only treats `#` as a comment if preceded by whitespace.)
  let codePart = content;
  let commentPart: string | null = null;
  const inlineM = content.match(/^(.*?\S)(\s+#.*)$/);
  if (inlineM) {
    codePart = inlineM[1];
    commentPart = inlineM[2];
  }

  const spans: React.ReactNode[] = [];
  if (indent) {
    spans.push(<span key="ind" className="whitespace-pre">{indent}</span>);
  }

  // Try "key: value" pattern (key starts with non-colon non-whitespace).
  const kvM = codePart.match(/^([^:\s][^:]*?):(?:\s+(.*))?$/);
  // Try "- value" list item pattern.
  const liM = codePart.match(/^-\s+(.*)$/);

  if (kvM) {
    const key = kvM[1];
    const valueRaw = (kvM[2] ?? '').trim();
    spans.push(<span key="k" className="text-blue-300 font-semibold">{key}</span>);
    spans.push(<span key="c" className="text-[#888]">:</span>);
    if (valueRaw !== '') {
      spans.push(<span key="sp" className="whitespace-pre"> </span>);
      spans.push(<React.Fragment key="v">{renderValue(valueRaw)}</React.Fragment>);
    }
  } else if (liM) {
    const valueRaw = liM[1].trim();
    spans.push(<span key="d" className="text-[#888]">-</span>);
    spans.push(<span key="sp" className="whitespace-pre"> </span>);
    spans.push(<React.Fragment key="v">{renderValue(valueRaw)}</React.Fragment>);
  } else {
    // Fallback: plain gray text (e.g. multi-word tokens).
    spans.push(<span key="t" className="text-[#888]">{codePart}</span>);
  }

  if (commentPart) {
    spans.push(<span key="cmt" className="text-[#666] italic whitespace-pre">{commentPart}</span>);
  }

  return <div className="whitespace-pre">{spans}</div>;
};

/**
 * YamlBlock — renders a YAML string as a styled <pre> with one <YamlLine>
 * per source line. NO external highlighter, NO dangerouslySetInnerHTML,
 * NO js-yaml. Pure text styling.
 */
const YamlBlock: React.FC<{ yaml: string }> = ({ yaml }) => {
  const lines = useMemo(() => yaml.split('\n'), [yaml]);
  return (
    <pre className="text-[11px] font-mono leading-relaxed bg-[#0A0A0A] border border-[#262626] rounded p-3 overflow-x-auto max-h-[400px] overflow-y-auto">
      {lines.map((line, i) => (
        <YamlLine key={i} line={line} />
      ))}
    </pre>
  );
};

/* ====================================================================
 * MAIN COMPONENT
 * ==================================================================== */

interface SigmaExplorerProps {
  /** When set, auto-opens the detail panel for this Sigma rule ID. */
  autoOpenId?: string | number;
  /** Called after the deep-link has been applied (parent clears it). */
  onAutoOpenConsumed?: () => void;
}

export const SigmaExplorerTool: React.FC<SigmaExplorerProps> = ({
  autoOpenId,
  onAutoOpenConsumed,
}) => {
  /* ---------- initial deep-link (resolved at mount) ---------- */
  const initialMatch =
    autoOpenId !== undefined && autoOpenId !== null && autoOpenId !== ''
      ? findSigmaById(String(autoOpenId))
      : undefined;

  const [q, setQ] = useState<string>(initialMatch ? String(autoOpenId) : '');
  const [selectedLevel, setSelectedLevel] = useState<SigmaLevel | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<SigmaStatus | 'All'>('All');
  const [selected, setSelected] = useState<SigmaRule | null>(initialMatch || null);
  const [copied, setCopied] = useState<boolean>(false);

  /* ---------- deep-link follow-up (React 19 render-time adjustment) ---------- */
  const [prevAutoOpen, setPrevAutoOpen] = useState<string | number | undefined>(autoOpenId);
  if (autoOpenId !== prevAutoOpen) {
    setPrevAutoOpen(autoOpenId);
    if (autoOpenId !== undefined && autoOpenId !== null && autoOpenId !== '') {
      const m = findSigmaById(String(autoOpenId));
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

  /* ---------- filtering ---------- */
  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return SIGMA_RULES.filter((r) => {
      // Search text match (case-insensitive across many fields).
      if (qLower) {
        const qMatches =
          r.title.toLowerCase().includes(qLower) ||
          r.description.toLowerCase().includes(qLower) ||
          r.id.toLowerCase().includes(qLower) ||
          (r.logsource.product ?? '').toLowerCase().includes(qLower) ||
          (r.logsource.category ?? '').toLowerCase().includes(qLower) ||
          (r.logsource.service ?? '').toLowerCase().includes(qLower) ||
          r.mitre.some((mm) => mm.toLowerCase().includes(qLower)) ||
          r.tags.some((t) => t.toLowerCase().includes(qLower)) ||
          (r.eventIds || []).some((e) => String(e).includes(qLower)) ||
          r.yaml.toLowerCase().includes(qLower);
        if (!qMatches) return false;
      }
      // Severity single-select filter.
      if (selectedLevel !== null && r.level !== selectedLevel) return false;
      // Status dropdown filter.
      if (selectedStatus !== 'All' && r.status !== selectedStatus) return false;
      return true;
    });
  }, [q, selectedLevel, selectedStatus]);

  /* ---------- cross-tool hand-offs ---------- */
  const openMitre = (mitreId: string) => {
    usePendingToolStore.getState().setPending({ toolId: 'mitre', entryId: mitreId });
    setSelected(null);
  };
  const openEventId = (eventId: number) => {
    usePendingToolStore.getState().setPending({ toolId: 'winevent', entryId: eventId });
    setSelected(null);
  };
  const openDetectionQuery = () => {
    usePendingToolStore.getState().setPending({ toolId: 'detection-query' });
    setSelected(null);
  };

  /* ---------- copy YAML (bottom-row primary button w/ 1.5s feedback) ---------- */
  const handleCopyYaml = () => {
    if (!selected) return;
    navigator.clipboard?.writeText(selected.yaml).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  /* ---------- add to note ---------- */
  const handleAddToNote = () => {
    if (!selected) return;
    const r = selected;
    const ls = logsourceStr(r.logsource);
    const mitreIds = r.mitre.join(', ');
    const tagStr = r.tags.join(', ');
    const evIds = (r.eventIds || []).map(String).join(', ');

    const row = (label: string, val: string): string =>
      `<tr><td style="padding:4px 8px;border:1px solid #444;background:#161616;color:#888;font-weight:bold;vertical-align:top;width:140px;">${escapeHtml(label)}</td>` +
      `<td style="padding:4px 8px;border:1px solid #444;color:#DDD;vertical-align:top;">${escapeHtml(val)}</td></tr>`;

    const rows: string[] = [];
    rows.push(row('Title', r.title));
    rows.push(row('Status', r.status));
    rows.push(row('Level', r.level));
    rows.push(row('Description', r.description));
    rows.push(row('Author', r.author));
    rows.push(row('Date', r.date));
    rows.push(row('Logsource', ls));
    rows.push(row('Detection Condition', r.detection.condition));
    if (r.detection.timeframe) rows.push(row('Timeframe', r.detection.timeframe));
    rows.push(row('MITRE IDs', mitreIds));
    rows.push(row('Tags', tagStr));
    if (evIds) rows.push(row('Event IDs', evIds));
    if (r.kql) rows.push(row('KQL', r.kql));
    if (r.spl) rows.push(row('SPL', r.spl));

    // YAML goes into a <pre> with whitespace preserved and escaped.
    const yamlRow =
      `<tr><td colspan="2" style="padding:4px 8px;border:1px solid #444;background:#0A0A0A;color:#888;font-weight:bold;">YAML</td></tr>` +
      `<tr><td colspan="2" style="padding:4px 8px;border:1px solid #444;"><pre style="white-space:pre-wrap;word-break:break-all;font-family:monospace;font-size:10px;color:#DDD;margin:0;">${escapeHtml(r.yaml)}</pre></td></tr>`;

    const htmlTable =
      `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:monospace;font-size:11px;">` +
      rows.join('') + yamlRow +
      `</table>`;

    useNoteStore.getState().enqueueNote('Sigma Rule — ' + r.title, htmlTable);
    setSelected(null);
  };

  /* ---------- render ---------- */
  return (
    <div className="space-y-3">
      {/* Search box */}
      <div className="flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-[#666] shrink-0" />
        <input
          type="text"
          className={inputCls}
          placeholder="Buscar por título, Event ID, MITRE ID, logsource o keyword..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar reglas Sigma"
        />
      </div>

      {/* Filter chips row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-widest text-[#555] mr-1">Severity:</span>
        <button
          type="button"
          onClick={() => setSelectedLevel(null)}
          className={`px-2 py-0.5 rounded text-[10px] font-semibold border uppercase transition-colors cursor-pointer ${
            selectedLevel === null
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-[#161616] border border-[#262626] text-[#888] hover:text-white hover:border-blue-500/40'
          }`}
        >
          All
        </button>
        {SIGMA_LEVELS.map((lvl) => (
          <button
            key={lvl}
            type="button"
            onClick={() => setSelectedLevel(lvl === selectedLevel ? null : lvl)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold border uppercase transition-colors cursor-pointer ${
              selectedLevel === lvl
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-[#161616] border border-[#262626] text-[#888] hover:text-white hover:border-blue-500/40'
            }`}
          >
            {lvl}
          </button>
        ))}

        <span className="text-[10px] uppercase tracking-widest text-[#555] ml-2 mr-1">Status:</span>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as SigmaStatus | 'All')}
          className={`${inputCls} py-1 w-auto`}
          aria-label="Filtrar por status"
        >
          <option value="All">All</option>
          {SIGMA_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Result count */}
      <div className="text-[10px] text-[#555]">
        {filtered.length} reglas Sigma — click para ver YAML completo.
      </div>

      {/* Result list */}
      <div className="max-h-[480px] overflow-y-auto space-y-1 pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-[#666] text-xs">
            No se encontraron reglas Sigma que coincidan con los filtros.
          </div>
        ) : (
          filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r)}
              className="w-full text-left bg-[#0D0D0D] border border-[#262626] rounded p-2 hover:border-blue-500/40 hover:bg-[#161616] transition-colors cursor-pointer space-y-1"
            >
              {/* Title + badges */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-white truncate">{r.title}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${severityBadgeCls(r.level)}`}>
                    {r.level}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium uppercase bg-[#161616] border border-[#262626] text-[#888]">
                    {r.status}
                  </span>
                </div>
              </div>

              {/* Logsource */}
              <div className="text-[9px] text-[#666] font-mono">{logsourceStr(r.logsource) || '—'}</div>

              {/* MITRE tags */}
              {r.mitre.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {r.mitre.map((mm) => (
                    <span
                      key={mm}
                      className="px-1 py-0.5 rounded text-[9px] font-mono text-blue-400 bg-blue-500/5 border border-blue-500/20"
                    >
                      {mm}
                    </span>
                  ))}
                </div>
              )}

              {/* Description truncated */}
              <div className="text-[10px] text-[#888] truncate">{r.description}</div>
            </button>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Sigma rule detail: ${selected.title}`}
        >
          <div
            className="bg-[#0D0D0D] border border-[#262626] rounded-lg max-w-3xl w-full max-h-[82vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header (sticky) */}
            <div className="sticky top-0 bg-[#0D0D0D] border-b border-[#262626] px-5 py-3 flex items-start justify-between gap-3 z-10">
              <div className="min-w-0 space-y-2">
                <h2 className="text-sm font-semibold text-white">{selected.title}</h2>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#888]">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${severityBadgeCls(selected.level)}`}>
                    {selected.level}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium uppercase bg-[#161616] border border-[#262626] text-[#888]">
                    {selected.status}
                  </span>
                  <span className="font-mono">{logsourceStr(selected.logsource) || '—'}</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />{selected.date}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <User className="w-3 h-3" />{selected.author}
                  </span>
                  <span className="font-mono text-[#555]">{selected.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1 rounded text-[#666] hover:text-white hover:bg-[#161616] transition-colors shrink-0"
                title="Cerrar"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 space-y-4">
              {/* Description (top, so the analyst sees what the rule does) */}
              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-xs font-semibold text-white">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  Descripción
                </h3>
                <p className="text-[11px] text-[#DDD] leading-relaxed">{selected.description}</p>
              </section>

              {/* YAML section with custom highlighter */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-white">
                    <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                    Sigma Rule (YAML)
                  </h3>
                  <CopyBtn text={selected.yaml} label="Copy YAML" />
                </div>
                <YamlBlock yaml={selected.yaml} />
              </section>

              {/* Detection section */}
              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Crosshair className="w-3.5 h-3.5 text-blue-400" />
                  Detection
                </h3>
                <CodeBlock code={selected.detection.condition} label="condition" />
                {selected.detection.timeframe && (
                  <div className="text-[10px] text-[#888]">
                    Timeframe: <span className="font-mono text-yellow-400">{selected.detection.timeframe}</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  {selected.detection.selectors.map((sel, i) => (
                    <div
                      key={i}
                      className="bg-[#161616] border border-[#262626] rounded p-2 space-y-1"
                    >
                      <div className="text-[9px] uppercase tracking-widest text-[#555]">
                        Selector {i + 1} (AND)
                      </div>
                      {sel.map((f, j) => (
                        <div
                          key={j}
                          className="flex flex-wrap items-center gap-1 text-[10px]"
                        >
                          <code className="font-mono text-blue-300">
                            {f.field}{f.modifier ? `|${f.modifier}` : ''}
                          </code>
                          <span className="text-[#555]">:</span>
                          {f.values.map((v, k) => (
                            <span
                              key={k}
                              className="px-1.5 py-0.5 rounded bg-[#0A0A0A] border border-[#262626] text-[#DDD] font-mono text-[9px] break-all"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>

              {/* MITRE ATT&CK section */}
              {selected.mitre.length > 0 && (
                <section className="space-y-2">
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Shield className="w-3.5 h-3.5 text-blue-400" />
                    MITRE ATT&CK
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.mitre.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => openMitre(m)}
                        className="px-2 py-0.5 rounded text-[10px] font-mono text-blue-400 bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/15 hover:border-blue-500/40 transition-colors cursor-pointer"
                        title="Abrir en MITRE Explorer"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Windows Event IDs section */}
              {selected.eventIds && selected.eventIds.length > 0 && (
                <section className="space-y-2">
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Shield className="w-3.5 h-3.5 text-blue-400" />
                    Windows Event IDs
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.eventIds.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => openEventId(e)}
                        className="px-2 py-0.5 rounded text-[10px] font-mono text-blue-400 bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/15 hover:border-blue-500/40 transition-colors cursor-pointer"
                        title="Abrir en Windows Event IDs"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* KQL section */}
              {selected.kql && (
                <section className="space-y-2">
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Code className="w-3.5 h-3.5 text-blue-400" />
                    KQL (Microsoft Sentinel)
                  </h3>
                  <CodeBlock code={selected.kql} lang="kql" />
                </section>
              )}

              {/* SPL section */}
              {selected.spl && (
                <section className="space-y-2">
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Code className="w-3.5 h-3.5 text-blue-400" />
                    SPL (Splunk)
                  </h3>
                  <CodeBlock code={selected.spl} lang="spl" />
                </section>
              )}

              {/* Tags */}
              {selected.tags.length > 0 && (
                <section className="space-y-2">
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Tag className="w-3.5 h-3.5 text-blue-400" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.tags.map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.5 rounded bg-[#161616] border border-[#262626] text-[#888] text-[9px] font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Cross-link action buttons row */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={handleCopyYaml}
                  className={`${btnPrimary} inline-flex items-center gap-1.5`}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy YAML'}
                </button>
                <button
                  type="button"
                  onClick={() => selected.mitre.length > 0 && openMitre(selected.mitre[0])}
                  disabled={selected.mitre.length === 0}
                  className={`${btnGhost} inline-flex items-center gap-1.5`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open MITRE
                </button>
                <button
                  type="button"
                  onClick={openDetectionQuery}
                  className={`${btnGhost} inline-flex items-center gap-1.5`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Detection Query
                </button>
                <button
                  type="button"
                  onClick={handleAddToNote}
                  className={`${btnGhost} inline-flex items-center gap-1.5`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Add to Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SigmaExplorerTool;
