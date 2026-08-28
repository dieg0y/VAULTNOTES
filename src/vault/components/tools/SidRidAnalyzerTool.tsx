/**
 * SidRidAnalyzerTool.tsx — 100% offline Windows SID / RID analyzer.
 *
 * Paste one or more SIDs (one per line) → parse breakdown (revision,
 * identifier authority, domain SID, RID), RID lookup in KNOWN_RIDS, whole-SID
 * lookup in WELL_KNOWN_SIDS, and contextual warnings (invalid format,
 * critical RID, local-group RID outside BUILTIN, missing domain prefix).
 *
 * Regex: /^S-1-(\d+)(?:-(\d+))+$/  (rejects "S-1-5" with no subauthority).
 * After validation we split by '-' — JS regex only retains the last capture
 * group of a repeated non-capturing group, so the split is authoritative.
 * Special case: 2-sub well-known SIDs (S-1-5-18, S-1-1-0, ...) get Domain
 * SID = RID = N/A.
 *
 * [Add to Note] → useNoteStore.enqueueNote('SID Analysis', htmlTable) with
 * all values HTML-escaped (no dangerouslySetInnerHTML anywhere).
 *
 * Security: 100% offline. No fetch/axios/XHR/telemetry/eval/new Function/
 * setTimeout(string). All data from ../../data/sidRidData.ts (curated from
 * public Microsoft documentation).
 *
 * Spec reference: Task ID 4-a.
 */
'use client';

import React, { useState } from 'react';
import {
  Search, Trash2, FileText, BookOpen, X, Fingerprint, AlertTriangle,
} from 'lucide-react';
import {
  KNOWN_RIDS,
  findKnownRid,
  findKnownSidAuthority,
  findWellKnownSid,
  type KnownRid,
  type WellKnownSid,
} from '../../data/sidRidData';
import { useNoteStore } from '../../store/noteStore';
import {
  taCls, btnPrimary, btnGhost, Row, ErrorBanner, InfoBanner,
} from './_shared';
import { escapeHtml } from '../../utils/escapeHtml';

/* ---------- helpers ---------- */

/** HTML-escape user-facing strings before concatenating into the note body. */
/**
 * SID validation regex.
 *   S-1-      literal prefix
 *   (\d+)     identifier authority (capture, but only used via split)
 *   (?:-(\d+))+   one or more subauthorities (last one is the RID)
 * Matches: S-1-5-18, S-1-5-500, S-1-5-21-...-500, S-1-5-32-544
 * Rejects: S-1-5 (no subauthority), not-a-sid, s-1- (handled via toUpperCase)
 */
const SID_REGEX = /^S-1-(\d+)(?:-(\d+))+$/;

/** Local-group RIDs that only make sense inside S-1-5-32 (BUILTIN). */
const LOCAL_GROUP_RIDS: ReadonlyArray<number> = [544, 545, 546];

/* ---------- parse result type ---------- */

interface ParsedSid {
  /** Original (trimmed) input string — preserves the user's case. */
  raw: string;
  /** True iff the regex matched. */
  valid: boolean;
  /** Always 1 (current SID revision) when valid. */
  revision?: number;
  /** Numeric identifier authority code (e.g. 5 for NT Authority). */
  authorityCode?: number;
  /** Friendly authority name (NT Authority, World Authority, ...). */
  authorityName?: string;
  /** Long-form authority description (not currently rendered, kept for parity). */
  authorityDescription?: string;
  /** Domain SID; null for 2-sub well-known SIDs (S-1-5-18, S-1-1-0, ...). */
  domainSid?: string | null;
  /** RID (last subauthority) or null for 2-sub well-known SIDs. */
  rid?: number | null;
  /** Well-known SID match (if any). */
  wellKnown?: WellKnownSid;
  /** Known RID match (if RID is in KNOWN_RIDS). */
  knownRid?: KnownRid;
  /** Contextual warnings — only populated for fields that apply. */
  warnings: {
    /** Format didn't match the regex. */
    invalidFormat?: boolean;
    /** RID has severity 'critical'. */
    criticalRid?: KnownRid;
    /** RID 544/545/546 found outside the BUILTIN (S-1-5-32) domain. */
    localGroupInDomain?: KnownRid;
    /** SID has a known domain RID but no S-1-5-21-... domain prefix. */
    missingDomainPrefix?: boolean;
  };
}

/** Parse a single SID line: validate regex, split by '-', extract parts, look up RID + well-known SID, populate warnings. */
function parseSid(raw: string): ParsedSid {
  const sid = raw.trim().toUpperCase();
  const result: ParsedSid = { raw: raw.trim(), valid: false, warnings: {} };

  if (!sid || !SID_REGEX.test(sid)) {
    result.warnings.invalidFormat = true;
    return result;
  }

  result.valid = true;

  // parts: [0]='S', [1]='1' (revision), [2]=authority, [3..N-1]=domain subs, [N]=RID
  const parts = sid.split('-');
  const revision = parseInt(parts[1], 10);
  const authorityCode = parseInt(parts[2], 10);
  result.revision = revision;
  result.authorityCode = authorityCode;

  const authority = findKnownSidAuthority(authorityCode);
  if (authority) {
    result.authorityName = authority.name;
    result.authorityDescription = authority.description;
  }

  const wellKnown = findWellKnownSid(sid);
  result.wellKnown = wellKnown;

  // Special-case: 2-sub well-known SIDs (S-1-5-18, S-1-1-0, ...) → no Domain SID, no RID.
  const isTwoSubWellKnown = Boolean(wellKnown) && parts.length === 4;
  if (isTwoSubWellKnown) {
    result.domainSid = null;
    result.rid = null;
  } else {
    result.domainSid = parts.slice(0, -1).join('-');
    result.rid = parseInt(parts[parts.length - 1], 10);
  }

  // RID lookup (only if a RID was extracted).
  if (result.rid !== null && result.rid !== undefined) {
    const knownRid = findKnownRid(result.rid);
    if (knownRid) {
      result.knownRid = knownRid;
      if (knownRid.severity === 'critical') {
        result.warnings.criticalRid = knownRid;
      }
      // Local-group RIDs (544/545/546) only make sense in S-1-5-32 (BUILTIN).
      if (
        LOCAL_GROUP_RIDS.includes(knownRid.rid) &&
        result.domainSid !== 'S-1-5-32'
      ) {
        result.warnings.localGroupInDomain = knownRid;
      }
    }
  }

  // Missing expected domain prefix: non-well-known SID with a known RID but
  // no S-1-5-21-... prefix (e.g. S-1-5-500 instead of S-1-5-21-...-500).
  if (
    !wellKnown &&
    result.rid !== null &&
    result.rid !== undefined &&
    result.knownRid &&
    !sid.startsWith('S-1-5-21-')
  ) {
    result.warnings.missingDomainPrefix = true;
  }

  return result;
}

/* ---------- severity badge maps ---------- */

const SEVERITY_CLASS: Record<KnownRid['severity'], string> = {
  critical: 'bg-red-500/15 border-red-500/30 text-red-400',
  high: 'bg-orange-500/15 border-orange-500/30 text-orange-400',
  medium: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400',
  low: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
  info: 'bg-gray-500/15 border-gray-500/30 text-gray-400',
};

const SEVERITY_LABEL: Record<KnownRid['severity'], string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
  info: 'INFO',
};

/* ---------- sample data ---------- */

const SAMPLE_SIDS =
  'S-1-5-21-123456789-123456789-123456789-500\n' +
  'S-1-5-21-123456789-123456789-123456789-501\n' +
  'S-1-5-21-123456789-123456789-123456789-512';

/* ---------- ResultCard (sub-component, declared before main) ---------- */

const ResultCard: React.FC<{ parsed: ParsedSid }> = ({ parsed }) => {
  const r = parsed;

  return (
    <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2 hover:border-blue-500/40 transition-colors">
      {/* Header row — SID string + validity badge */}
      <div className="flex items-start gap-2 pb-2 border-b border-[#1A1A1A]">
        <Fingerprint className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
        <code className="text-[11px] font-mono text-white break-all flex-1">{r.raw}</code>
        {r.valid ? (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-400 shrink-0">VALID</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-400 shrink-0">
            <X className="w-3 h-3" />
            INVALID
          </span>
        )}
      </div>

      {/* Invalid case — just show the format error */}
      {!r.valid && (
        <ErrorBanner message="Formato de SID inválido. Formato esperado: S-1-X-Y-Z-...-RID" />
      )}

      {/* Valid case — full parse breakdown */}
      {r.valid && (
        <div className="space-y-2">
          {/* Parse breakdown */}
          <div className="bg-[#161616] border border-[#262626] rounded p-2.5 space-y-0.5">
            <Row label="Revision" value={r.revision !== undefined ? String(r.revision) : '—'} mono />
            <Row
              label="Identifier Authority"
              value={
                r.authorityCode !== undefined
                  ? `${r.authorityCode}${r.authorityName ? ' (' + r.authorityName + ')' : ''}`
                  : '—'
              }
              mono
            />
            <Row
              label="Domain SID"
              value={r.domainSid === null ? 'N/A — well-known system SID' : r.domainSid ?? '—'}
              mono
            />
            <Row
              label="RID"
              value={r.rid === null || r.rid === undefined ? 'N/A' : String(r.rid)}
              mono
            />
          </div>

          {/* RID lookup */}
          {r.knownRid && (
            <div className="bg-[#161616] border border-[#262626] rounded p-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-[#888] uppercase tracking-wider">
                  Known RID
                </span>
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[9px] border font-bold ${SEVERITY_CLASS[r.knownRid.severity]}`}
                >
                  {SEVERITY_LABEL[r.knownRid.severity]}
                </span>
              </div>
              <div className="text-[11px] text-blue-300 font-semibold font-mono">
                {r.knownRid.rid} — {r.knownRid.name}
              </div>
              <div className="text-[10px] text-[#AAA] leading-relaxed">
                {r.knownRid.description}
              </div>
            </div>
          )}

          {/* Well-known SID lookup */}
          {r.wellKnown && (
            <div className="bg-[#161616] border border-[#262626] rounded p-2.5 space-y-1.5">
              <div className="text-[10px] text-[#888] uppercase tracking-wider">
                Well-known SID
              </div>
              <div className="text-[11px] text-blue-300 font-semibold">
                {r.wellKnown.name}
              </div>
              <div className="text-[10px] text-[#AAA] leading-relaxed">
                {r.wellKnown.description}
              </div>
            </div>
          )}

          {/* Conditional warnings — only render the ones that apply */}
          {r.warnings.criticalRid && (
            <ErrorBanner
              message={`RID crítico detectado: ${r.warnings.criticalRid.name}. ${r.warnings.criticalRid.description}`}
            />
          )}
          {r.warnings.localGroupInDomain && (
            <InfoBanner>
              <span className="inline-flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-yellow-400" />
                <span>
                  <span className="font-semibold">
                    RID de grupo local en contexto no-BUILTIN:
                  </span>{' '}
                  {r.warnings.localGroupInDomain.rid} —{' '}
                  {r.warnings.localGroupInDomain.name}.{' '}
                  {r.warnings.localGroupInDomain.description}
                </span>
              </span>
            </InfoBanner>
          )}
          {r.warnings.missingDomainPrefix && (
            <InfoBanner>
              El SID no tiene un Domain SID esperado (S-1-5-21-...). Esto puede
              ser un SID bien conocido del sistema.
            </InfoBanner>
          )}
        </div>
      )}
    </div>
  );
};

/* ---------- main component ---------- */

interface SidRidAnalyzerProps {
  /** Reserved for future deep-link support — currently unused. */
  autoOpenId?: string;
}

export const SidRidAnalyzerTool: React.FC<SidRidAnalyzerProps> = () => {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<ParsedSid[] | null>(null);
  const [addedToNote, setAddedToNote] = useState(false);

  /** Parse all non-empty lines from the textarea. */
  const analyze = (): void => {
    const lines = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    setResults(lines.map(parseSid));
  };

  /** Clear input + results. */
  const clear = (): void => {
    setInput('');
    setResults(null);
  };

  /** Fill the textarea with three sample SIDs. */
  const loadSample = (): void => { setInput(SAMPLE_SIDS); };

  /** Build an HTML-escaped <table> of all analyzed SIDs and enqueue it for [Add to Note]. */
  const addToNote = (): void => {
    if (!results || results.length === 0) return;

    const th = (s: string): string =>
      `<th style="background:#161616;color:#888;padding:4px;border:1px solid #333;font-weight:bold;text-align:left;">${escapeHtml(s)}</th>`;
    const td = (s: string): string =>
      `<td style="padding:4px;border:1px solid #333;color:#DDD;">${escapeHtml(s)}</td>`;

    const rows: string[] = [];
    rows.push(`<tr>${th('#')}${th('SID')}${th('Authority')}${th('Domain SID')}${th('RID')}${th('Known RID')}${th('Severity')}${th('Well-known')}${th('Status')}</tr>`);

    results.forEach((r, i) => {
      const idx = `<td style="padding:4px;border:1px solid #333;color:#888;">${escapeHtml(String(i + 1))}</td>`;
      let body: string;
      if (!r.valid) {
        body = td(r.raw) + td('—').repeat(6) + td('INVALID');
      } else {
        body =
          td(r.raw) +
          td(
            r.authorityCode !== undefined
              ? `${r.authorityCode}${r.authorityName ? ' (' + r.authorityName + ')' : ''}`
              : '—',
          ) +
          td(r.domainSid === null ? 'N/A — well-known' : r.domainSid ?? '—') +
          td(r.rid === null || r.rid === undefined ? 'N/A' : String(r.rid)) +
          td(r.knownRid ? r.knownRid.name : '—') +
          td(r.knownRid ? SEVERITY_LABEL[r.knownRid.severity] : '—') +
          td(r.wellKnown ? r.wellKnown.name : '—') +
          td('OK');
      }
      rows.push(`<tr>${idx}${body}</tr>`);
    });

    const html =
      '<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:monospace;font-size:11px;">' +
      rows.join('') +
      '</table>';

    useNoteStore.getState().enqueueNote('SID Analysis', html);
    setAddedToNote(true);
    window.setTimeout(() => setAddedToNote(false), 2500);
  };

  /* ---------- render ---------- */
  return (
    <div className="space-y-3">
      {/* Always-visible info banner — offline disclaimer */}
      <InfoBanner>
        100% offline. Los SIDs se analizan localmente. NO se consulta Active
        Directory, Entra ID ni ningún servicio externo. SIDs sensibles: revisa
        el contexto antes de guardar en una nota.
      </InfoBanner>

      {/* Multi-SID input */}
      <div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            'Pega uno o más SIDs — uno por línea:\nS-1-5-21-123456789-123456789-123456789-500\nS-1-5-21-...-1000'
          }
          className={`${taCls} min-h-[100px]`}
          aria-label="Entrada de SIDs (uno por línea)"
        />
      </div>

      {/* Action button row */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={analyze}
          className={`${btnPrimary} inline-flex items-center gap-1.5`}
        >
          <Search className="w-3.5 h-3.5" />
          Analyze
        </button>
        <button
          type="button"
          onClick={clear}
          className={`${btnGhost} inline-flex items-center gap-1.5`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
        <button
          type="button"
          onClick={loadSample}
          className={`${btnGhost} inline-flex items-center gap-1.5`}
        >
          <FileText className="w-3.5 h-3.5" />
          Load sample SIDs
        </button>
        <button
          type="button"
          onClick={addToNote}
          className={`${btnGhost} inline-flex items-center gap-1.5`}
          disabled={!results || results.length === 0}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Add to Note
        </button>
      </div>

      {/* "Added to note" toast — 2.5s feedback */}
      {addedToNote && (
        <InfoBanner>Añadido a Notas — crea una nota nueva para verlo.</InfoBanner>
      )}

      {/* Results section — only shown after first Analyze click */}
      {results !== null && results.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
            {results.length} SID{results.length === 1 ? '' : 's'} analizado
            {results.length === 1 ? '' : 's'}
          </div>
          {results.map((r, i) => (
            <ResultCard key={`${i}-${r.raw}`} parsed={r} />
          ))}
        </div>
      )}

      {/* Empty results state */}
      {results !== null && results.length === 0 && (
        <InfoBanner>
          No se encontraron SIDs para analizar. Pega uno o más SIDs (uno por
          línea) y pulsa [Analyze].
        </InfoBanner>
      )}

      {/* Quick reference — collapsible table of all KNOWN_RIDS */}
      <details className="bg-[#0D0D0D] border border-[#262626] rounded">
        <summary className="px-3 py-2 cursor-pointer text-[11px] font-bold uppercase tracking-widest text-[#888] hover:text-white select-none">
          Quick reference — {KNOWN_RIDS.length} known RIDs
        </summary>
        <div className="p-3 pt-0">
          <div className="overflow-x-auto overflow-y-auto max-h-96 border border-[#262626] rounded">
            <table className="w-full text-[10px] font-mono border-collapse">
              <thead className="sticky top-0 bg-[#161616] z-10">
                <tr>
                  <th className="px-2 py-1.5 text-left text-[#888] uppercase tracking-wider font-bold border-b border-[#262626]">
                    RID
                  </th>
                  <th className="px-2 py-1.5 text-left text-[#888] uppercase tracking-wider font-bold border-b border-[#262626]">
                    Name
                  </th>
                  <th className="px-2 py-1.5 text-left text-[#888] uppercase tracking-wider font-bold border-b border-[#262626]">
                    Severity
                  </th>
                  <th className="px-2 py-1.5 text-left text-[#888] uppercase tracking-wider font-bold border-b border-[#262626]">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {KNOWN_RIDS.map((kr) => (
                  <tr
                    key={kr.rid}
                    className="border-b border-[#1A1A1A] hover:bg-[#161616] hover:border-blue-500/40 transition-colors"
                  >
                    <td className="px-2 py-1.5 text-white">{kr.rid}</td>
                    <td className="px-2 py-1.5 text-blue-300">{kr.name}</td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] border font-bold ${SEVERITY_CLASS[kr.severity]}`}
                      >
                        {SEVERITY_LABEL[kr.severity]}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-[#AAA] break-words">
                      {kr.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </div>
  );
};

export default SidRidAnalyzerTool;
