/**
 * DetectionQueryHelperTool.tsx — 100% offline KQL / SPL query builder.
 *
 * WHAT IT DOES
 * ------------
 * The user picks a preset (Failed Login, PowerShell, Process Creation, …) OR
 * builds a query clause-by-clause (Field | Operator | Value | Connector). The
 * tool generates the equivalent query in Microsoft Sentinel KQL and Splunk SPL,
 * live, with copy-to-clipboard buttons.
 *
 * When a preset is selected AND the user has not modified any clause, the
 * tool shows the preset's full production-ready query (table name, summarize,
 * project, …). As soon as the user touches a clause, it switches to the
 * generated-from-clauses mode so the user's edits always take precedence.
 *
 * CROSS-TOOL HAND-OFFS
 * ---------------------
 * - [Copy KQL] / [Copy SPL]: copies the current generated query to the
 *   clipboard (Copy → Check icon swap for 1.5s).
 * - MITRE chips (shown when a preset is selected): clicking a chip calls
 *   usePendingToolStore.setPending({ toolId: 'mitre', entryId }) so the
 *   MITRE Explorer tool opens with that technique preselected.
 * - [Add to Note]: enqueues an HTML table with all clauses + the generated
 *   KQL/SPL into useNoteStore so App.tsx creates a new note. All user
 *   content is escaped via escapeHtml() — never injected raw, never
 *   dangerouslySetInnerHTML.
 *
 * DEEP-LINK SUPPORT
 * ------------------
 * `autoOpenId` (string) → preset name to pre-load on mount. The render-time
 * state adjustment pattern (same as WinEventTool in ToolsView) handles
 * follow-up deep-link changes. `onAutoOpenConsumed` is called after the
 * deep-link is applied so the parent can clear it.
 *
 * SECURITY CONSTRAINTS
 * ---------------------
 * 100% offline. No fetch, no axios, no APIs, no telemetry. No code
 * execution — no eval, no new Function, no setTimeout(string). No
 * dangerouslySetInnerHTML anywhere in the file. Strict TypeScript — zero
 * any, zero @ts-ignore.
 *
 * Spec reference: Task ID 6 — third of a 3-tool block (MITRE / Sigma /
 * Detection Query Helper) added to the SOC category.
 */
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus, X, Trash2, Code, Braces, Lightbulb, Copy, Check, BookOpen, Shield,
} from 'lucide-react';
import {
  CodeBlock, InfoBanner, Tabs, btnGhost, inputCls, safeStr,
} from './_shared';
import { DETECTION_PRESETS, DetectionPreset } from '../../data/detectionPresets';
import { usePendingToolStore } from '../../store/pendingToolStore';
import { useNoteStore } from '../../store/noteStore';

/* =============================================================
 * Strict types
 * ============================================================= */
type Operator =
  | 'Equals'
  | 'NotEquals'
  | 'Contains'
  | 'StartsWith'
  | 'EndsWith'
  | 'GreaterThan'
  | 'LessThan';

type Connector = 'AND' | 'OR';

interface Clause {
  /** Unique per row, used as React key. */
  id: number;
  field: string;
  operator: Operator;
  value: string;
  /** Ignored on the last clause (no connector shown). */
  connector: Connector;
}

interface DetectionQueryHelperProps {
  /** When set (string), pre-loads a preset by name (e.g. "Failed Login"). */
  autoOpenId?: string | number;
  /** Called once after the deep-link has been applied. */
  onAutoOpenConsumed?: () => void;
}

/* =============================================================
 * Constants & small helpers
 * ============================================================= */
const OPERATORS: Operator[] = [
  'Equals', 'NotEquals', 'Contains', 'StartsWith', 'EndsWith',
  'GreaterThan', 'LessThan',
];

/** Tests whether a value looks like a number — if so, KQL leaves it bare
 *  (no surrounding quotes). Everything else is wrapped in double quotes. */
const NUM_RE = /^-?\d+(\.\d+)?$/;

let _idCounter = 1;
function nextId(): number {
  return _idCounter++;
}

function newEmptyClause(): Clause {
  return {
    id: nextId(),
    field: '',
    operator: 'Equals',
    value: '',
    connector: 'AND',
  };
}

/** HTML escape for the [Add to Note] table — 5 chars, no DOM helpers needed. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const EMPTY_KQL = '// Construye una consulta arriba para ver el código KQL aquí.';
const EMPTY_SPL = '// Construye una consulta arriba para ver el código SPL aquí.';

/* =============================================================
 * KQL generation
 * ============================================================= */
function kqlOp(op: Operator): string {
  switch (op) {
    case 'Equals':       return '==';
    case 'NotEquals':    return '!=';
    case 'Contains':     return 'has';
    case 'StartsWith':   return 'startswith';
    case 'EndsWith':     return 'endswith';
    case 'GreaterThan':  return '>';
    case 'LessThan':     return '<';
    default:             return '==';
  }
}

/** KQL values: bare numbers, double-quoted everything else. */
function kqlValue(v: string): string {
  const trimmed = v.trim();
  return NUM_RE.test(trimmed) ? trimmed : `"${v}"`;
}

function generateKql(clauses: Clause[]): string {
  const valid = clauses.filter((c) => c.field.trim() !== '');
  if (!valid.length) return EMPTY_KQL;
  const parts = valid.map((c, i) => {
    const isLast = i === valid.length - 1;
    const expr = `${c.field} ${kqlOp(c.operator)} ${kqlValue(c.value)}`;
    return isLast ? expr : `${expr} ${c.connector}`;
  });
  return `where ${parts.join(' ')}`;
}

/* =============================================================
 * SPL generation
 * ============================================================= */
function splClause(c: Clause): string {
  // SPL always wraps the value in double quotes — Contains/StartsWith/EndsWith
  // additionally embed wildcard asterisks inside the quotes.
  switch (c.operator) {
    case 'Equals':       return `${c.field}="${c.value}"`;
    case 'NotEquals':    return `${c.field}!="${c.value}"`;
    case 'Contains':     return `${c.field}="*${c.value}*"`;
    case 'StartsWith':   return `${c.field}="${c.value}*"`;
    case 'EndsWith':     return `${c.field}="*${c.value}"`;
    case 'GreaterThan':  return `${c.field}>"${c.value}"`;
    case 'LessThan':     return `${c.field}<"${c.value}"`;
    default:             return `${c.field}="${c.value}"`;
  }
}

function generateSpl(clauses: Clause[]): string {
  const valid = clauses.filter((c) => c.field.trim() !== '');
  if (!valid.length) return EMPTY_SPL;
  const parts = valid.map((c, i) => {
    const isLast = i === valid.length - 1;
    const expr = splClause(c);
    return isLast ? expr : `${expr} ${c.connector}`;
  });
  return parts.join(' ');
}

/* =============================================================
 * UI subcomponents
 * ============================================================= */

/** Section header — label + optional icon, mirrors Field from _shared but
 *  allows an icon inside the label (Field.label is `string`). */
const Section: React.FC<{
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, icon, children }) => (
  <div className="space-y-1.5">
    <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] inline-flex items-center gap-1.5">
      {icon}
      {label}
    </div>
    {children}
  </div>
);

/** Single clause row — 5-col grid (field | operator | value | connector | remove).
 *  Connector cell is empty on the last row. Remove button only when 2+ clauses. */
const ClauseRow: React.FC<{
  clause: Clause;
  isLast: boolean;
  canRemove: boolean;
  onChange: (patch: Partial<Clause>) => void;
  onRemove: () => void;
}> = ({ clause, isLast, canRemove, onChange, onRemove }) => (
  <div className="grid grid-cols-[1fr_120px_1fr_80px_28px] gap-2 items-center">
    <input
      className={inputCls + ' min-w-0'}
      placeholder="SourceIP"
      value={clause.field}
      onChange={(e) => onChange({ field: e.target.value })}
      spellCheck={false}
    />
    <select
      className={inputCls}
      value={clause.operator}
      onChange={(e) => onChange({ operator: e.target.value as Operator })}
    >
      {OPERATORS.map((op) => (
        <option key={op} value={op}>{op}</option>
      ))}
    </select>
    <input
      className={inputCls + ' min-w-0'}
      placeholder="10.10.10.10"
      value={clause.value}
      onChange={(e) => onChange({ value: e.target.value })}
      spellCheck={false}
    />
    <div className="min-w-0">
      {!isLast && (
        <select
          className={inputCls}
          value={clause.connector}
          onChange={(e) => onChange({ connector: e.target.value as Connector })}
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
      )}
    </div>
    <div className="flex items-center justify-center">
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          title="Remove clause"
          className="text-red-400 hover:bg-red-500/10 p-1 rounded transition-colors cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  </div>
);

/* =============================================================
 * Main component
 * ============================================================= */
export const DetectionQueryHelperTool: React.FC<DetectionQueryHelperProps> = ({
  autoOpenId,
  onAutoOpenConsumed,
}) => {
  /* ---- Initial deep-link match (computed once, on mount) ---- */
  const initialPresetName =
    typeof autoOpenId === 'string'
      ? DETECTION_PRESETS.find((p) => p.name === autoOpenId)?.name ?? null
      : null;

  /* ---- State ---- */
  const [clauses, setClauses] = useState<Clause[]>(() => [newEmptyClause()]);
  const [presetName, setPresetName] = useState<string | null>(initialPresetName);
  const [userModified, setUserModified] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'kql' | 'spl'>('kql');
  const [copiedKql, setCopiedKql] = useState<boolean>(false);
  const [copiedSpl, setCopiedSpl] = useState<boolean>(false);
  const [info, setInfo] = useState<string | null>(null);

  /* ---- Deep-link follow-up: render-time state adjustment ----
   * Same React 19 pattern as WinEventTool — if the incoming `autoOpenId`
   * prop changes after mount, we apply the new preset here during render
   * (without queuing a separate effect). Safe because the setter is
   * guarded against the previous value. */
  const [prevAutoOpen, setPrevAutoOpen] = useState<string | number | undefined>(autoOpenId);
  if (autoOpenId !== prevAutoOpen) {
    setPrevAutoOpen(autoOpenId);
    if (typeof autoOpenId === 'string') {
      const match = DETECTION_PRESETS.find((p) => p.name === autoOpenId);
      if (match) {
        setPresetName(match.name);
        setUserModified(false);
        setClauses([newEmptyClause()]);
      }
    }
  }

  /* ---- Notify parent once the deep-link has been applied (side-effect) ---- */
  useEffect(() => {
    if (autoOpenId !== undefined && autoOpenId !== null && autoOpenId !== '') {
      onAutoOpenConsumed?.();
    }
  }, [autoOpenId, onAutoOpenConsumed]);

  /* ---- Derived: selected preset object + generated outputs ---- */
  const selectedPreset = useMemo<DetectionPreset | null>(
    () => (presetName ? DETECTION_PRESETS.find((p) => p.name === presetName) ?? null : null),
    [presetName],
  );

  const kql = useMemo<string>(() => {
    if (selectedPreset && !userModified) return selectedPreset.kql;
    return generateKql(clauses);
  }, [selectedPreset, userModified, clauses]);

  const spl = useMemo<string>(() => {
    if (selectedPreset && !userModified) return selectedPreset.spl;
    return generateSpl(clauses);
  }, [selectedPreset, userModified, clauses]);

  /* ---- Handlers ---- */
  const handlePresetSelect = useCallback((name: string): void => {
    if (!name) {
      setPresetName(null);
      setUserModified(false);
      setClauses([newEmptyClause()]);
      return;
    }
    const match = DETECTION_PRESETS.find((p) => p.name === name);
    if (match) {
      setPresetName(match.name);
      setUserModified(false);
      setClauses([newEmptyClause()]);
    }
  }, []);

  const handleReset = useCallback((): void => {
    setPresetName(null);
    setUserModified(false);
    setClauses([newEmptyClause()]);
  }, []);

  const handleClauseChange = useCallback((id: number, patch: Partial<Clause>): void => {
    setUserModified(true);
    setClauses((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const handleAddClause = useCallback((): void => {
    setUserModified(true);
    setClauses((prev) => [...prev, newEmptyClause()]);
  }, []);

  const handleRemoveClause = useCallback((id: number): void => {
    setUserModified(true);
    setClauses((prev) =>
      prev.length <= 1 ? prev : prev.filter((c) => c.id !== id),
    );
  }, []);

  const handleCopyKql = useCallback((): void => {
    if (!kql) return;
    navigator.clipboard?.writeText(kql).then(() => {
      setCopiedKql(true);
      window.setTimeout(() => setCopiedKql(false), 1500);
    });
  }, [kql]);

  const handleCopySpl = useCallback((): void => {
    if (!spl) return;
    navigator.clipboard?.writeText(spl).then(() => {
      setCopiedSpl(true);
      window.setTimeout(() => setCopiedSpl(false), 1500);
    });
  }, [spl]);

  const handleMitreClick = useCallback((mitreId: string): void => {
    usePendingToolStore.getState().setPending({ toolId: 'mitre', entryId: mitreId });
    setInfo(`Enviado a MITRE Explorer: ${mitreId}.`);
    window.setTimeout(() => setInfo(null), 2500);
  }, []);

  const handleAddToNote = useCallback((): void => {
    const rowsHtml = clauses
      .map(
        (c) =>
          '<tr>' +
          `<td>${escapeHtml(safeStr(c.field))}</td>` +
          `<td>${escapeHtml(safeStr(c.operator))}</td>` +
          `<td>${escapeHtml(safeStr(c.value))}</td>` +
          `<td>${escapeHtml(safeStr(c.connector))}</td>` +
          '</tr>',
      )
      .join('');
    const tableHtml =
      '<table border="1" cellpadding="4" cellspacing="0" ' +
      'style="border-collapse:collapse;width:100%;font-family:monospace;font-size:11px;">' +
      '<thead><tr>' +
      '<th>Field</th><th>Operator</th><th>Value</th><th>Connector</th>' +
      '</tr></thead>' +
      '<tbody>' +
      rowsHtml +
      `<tr><td colspan="4"><strong>KQL</strong><br/><pre>${escapeHtml(kql)}</pre></td></tr>` +
      `<tr><td colspan="4"><strong>SPL</strong><br/><pre>${escapeHtml(spl)}</pre></td></tr>` +
      '</tbody></table>';
    useNoteStore.getState().enqueueNote('Detection Query', tableHtml);
    setInfo('Añadido a Notas — crea una nota para verlo.');
    window.setTimeout(() => setInfo(null), 2500);
  }, [clauses, kql, spl]);

  /* ---- Render ---- */
  return (
    <div className="space-y-4">
      {/* ---------- Section 1: Presets ---------- */}
      <Section
        label="Presets locales"
        icon={<Lightbulb className="w-3 h-3 text-blue-400" />}
      >
        <div className="flex flex-wrap gap-2 items-stretch">
          <select
            className={inputCls + ' flex-1 min-w-[200px]'}
            value={presetName ?? ''}
            onChange={(e) => handlePresetSelect(e.target.value)}
          >
            <option value="">— Selecciona un preset —</option>
            {DETECTION_PRESETS.map((p) => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleReset}
            className={btnGhost}
            title="Reset builder"
          >
            <span className="inline-flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Reset builder
            </span>
          </button>
        </div>
        {selectedPreset && (
          <div className="text-[10px] text-[#888] leading-relaxed mt-1">
            <Lightbulb className="w-3 h-3 inline mr-1 -mt-0.5 text-blue-400" />
            {selectedPreset.description}
          </div>
        )}
      </Section>

      {/* ---------- Section 2: Query Builder ---------- */}
      <Section
        label="Constructor de consultas"
        icon={<Braces className="w-3 h-3 text-blue-400" />}
      >
        <div className="space-y-2 bg-[#0D0D0D] border border-[#262626] rounded p-3">
          {clauses.map((c, i) => (
            <ClauseRow
              key={c.id}
              clause={c}
              isLast={i === clauses.length - 1}
              canRemove={clauses.length >= 2}
              onChange={(patch) => handleClauseChange(c.id, patch)}
              onRemove={() => handleRemoveClause(c.id)}
            />
          ))}
          <button
            type="button"
            onClick={handleAddClause}
            className={btnGhost}
            title="Add clause"
          >
            <span className="inline-flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add clause
            </span>
          </button>
        </div>
      </Section>

      {/* ---------- Section 3: Generated Output ---------- */}
      <Section
        label="Queries generadas"
        icon={<Code className="w-3 h-3 text-blue-400" />}
      >
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Tabs
            tabs={[
              { id: 'kql', label: 'KQL', icon: <Code className="w-3 h-3" /> },
              { id: 'spl', label: 'SPL', icon: <Braces className="w-3 h-3" /> },
            ]}
            active={activeTab}
            onChange={(id) => setActiveTab(id as 'kql' | 'spl')}
          />
          <button
            type="button"
            onClick={handleCopyKql}
            className={btnGhost}
            disabled={!kql || kql.startsWith('//')}
            title="Copy KQL"
          >
            <span className="inline-flex items-center gap-1.5">
              {copiedKql ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copiedKql ? 'Copied' : 'Copy KQL'}
            </span>
          </button>
          <button
            type="button"
            onClick={handleCopySpl}
            className={btnGhost}
            disabled={!spl || spl.startsWith('//')}
            title="Copy SPL"
          >
            <span className="inline-flex items-center gap-1.5">
              {copiedSpl ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copiedSpl ? 'Copied' : 'Copy SPL'}
            </span>
          </button>
        </div>
        {activeTab === 'kql' ? (
          <CodeBlock code={kql} lang="kql" />
        ) : (
          <CodeBlock code={spl} lang="spl" />
        )}
      </Section>

      {/* ---------- Section 4: Preset MITRE chips ---------- */}
      {selectedPreset && selectedPreset.mitre.length > 0 && (
        <Section
          label="MITRE ATT&CK techniques"
          icon={<Shield className="w-3 h-3 text-blue-400" />}
        >
          <div className="flex flex-wrap gap-2">
            {selectedPreset.mitre.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => handleMitreClick(id)}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono font-bold bg-blue-500/10 border border-blue-500/40 text-blue-300 hover:bg-blue-500/20 hover:border-blue-500/60 transition-colors cursor-pointer"
                title={`Open ${id} in MITRE Explorer`}
              >
                <Shield className="w-3 h-3" />
                {id}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* ---------- Section 5: Action buttons ---------- */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#262626]">
        <button
          type="button"
          onClick={handleAddToNote}
          className={btnGhost}
          title="Add to Note"
        >
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Add to Note
          </span>
        </button>
      </div>

      {info && <InfoBanner>{info}</InfoBanner>}

      <InfoBanner>
        <span className="font-semibold">100% offline.</span> Constructor de
        consultas para Microsoft Sentinel (KQL) y Splunk (SPL). Los 11 presets
        cubren escenarios SOC comunes (brute force, PowerShell, process
        creation, network connection, suspicious IP, account activity, new
        service, scheduled task, account creation…). Las queries son de
        referencia — sustituye IPs, usuarios y nombres de tabla por los de tu
        SIEM. Las MITRE chips envían al MITRE Explorer.
      </InfoBanner>
    </div>
  );
};

export default DetectionQueryHelperTool;
