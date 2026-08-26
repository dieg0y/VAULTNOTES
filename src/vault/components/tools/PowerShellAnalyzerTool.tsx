/**
 * PowerShellAnalyzerTool.tsx — 100% offline PowerShell command/script analyzer.
 *
 * WHAT IT DOES
 * ------------
 * The user pastes a PowerShell command or script. The app MUST NOT execute it.
 * This tool analyzes the TEXT ONLY — using regex/substring heuristics to flag
 * indicators commonly seen in adversary tradecraft (encoded payloads, hidden
 * windows, execution-policy bypass, in-memory execution via IEX, remote
 * downloaders, mimikatz, AMSI bypasses, etc.). For each indicator we attach a
 * MITRE ATT&CK technique ID and link out to the public MITRE page.
 *
 * BASE64 DECODE (CRITICAL — NEVER EXECUTED)
 * --------------------------------------------
 * When the user pastes `powershell -enc <base64>`, we extract the next token
 * after `-enc`, validate that it is well-formed Base64, and offer a
 * `[Decode Base64]` button. Clicking it decodes via `atob()` + TextDecoder
 * (UTF-8 safe — same pattern as EncodingTool). The decoded text is rendered as
 * TEXT in a <CodeBlock> via React's value binding — NEVER `dangerouslySetInnerHTML`,
 * NEVER `eval`, NEVER `new Function`, NEVER passed to setTimeout/setInterval.
 * If the decoded text looks like code (powershell|Invoke-|IEX|curl|wget|<script)
 * we show an InfoBanner warning above the text — but the text remains visible.
 *
 * CROSS-TOOL HAND-OFFS
 * ---------------------
 * - [Open in IoC Extractor]: sends the raw input to useIocStore so the existing
 *   IoC Extractor tool can pull URLs/IPs/hashes/registry keys from it.
 * - [Add to Note]: enqueues an HTML summary into useNoteStore. All user content
 *   is escaped via escapeHtml() before being concatenated — never injected raw.
 *
 * SECURITY CONSTRAINTS
 * ---------------------
 * 100% offline. No fetch, no APIs, no telemetry. No code execution — the script
 * is parsed as text only. MITRE URLs are public references; no user data leaves
 * the browser when the user clicks [Open in MITRE].
 *
 * Spec reference: Task ID 3-d.
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  ShieldAlert, AlertTriangle, Code2, BookOpen, ExternalLink, Trash2, Search,
} from 'lucide-react';
import { useIocStore } from '../../store/iocStore';
import { useNoteStore } from '../../store/noteStore';
import {
  CopyBtn, Field, CodeBlock, ErrorBanner, InfoBanner,
  taCls, btnPrimary, btnGhost, btnDanger,
} from './_shared';

/* ---------- types ---------- */
interface MitreRef {
  id: string;     // e.g. "T1059.001"
  name: string;   // e.g. "PowerShell"
}

interface Indicator {
  /** Display string for the indicator (may include the attached payload). */
  indicator: string;
  /** The actual regex match (e.g. "-enc"). */
  matched: string;
  /** ~40 chars before the match (with leading "…" if truncated). */
  contextBefore: string;
  /** The matched substring (highlighted in the context display). */
  contextMatch: string;
  /** ~40 chars after the match (with trailing "…" if truncated). */
  contextAfter: string;
  /** MITRE techniques this indicator relates to (can be multiple). */
  mitre: MitreRef[];
  /** Optional severity badge for high-signal indicators (e.g. AMSI bypasses). */
  severity?: 'critical' | 'high' | 'medium' | 'low';
  /** For -enc indicators: the attached Base64 payload (if extractable + valid). */
  base64Payload?: string;
}

interface Analysis {
  indicators: Indicator[];
  /** Deduplicated MITRE techniques across all matched indicators. */
  techniques: MitreRef[];
  /** Deduplicated suspicious pattern labels. */
  suspicious: string[];
}

interface DecodedResult {
  raw: string;
  decoded: string;
  isCode: boolean;
  error?: string;
}

/* ---------- MITRE mapping rules ---------- */
interface Rule {
  pattern: RegExp;
  label: string;
  mitre: MitreRef[];
  suspicious?: string;
  /** Optional severity — rendered as a red badge on the indicator row. */
  severity?: 'critical' | 'high' | 'medium' | 'low';
  /** True for the -enc rule (extracts the next token as Base64 payload). */
  isEncSwitch?: boolean;
}

const RULES: Rule[] = [
  // -enc / -encodedcommand / -e (switch form, case-insensitive).
  // Lookbehind/ahead ensures we don't false-positive on `-error` or `-expand`.
  {
    pattern: /(?<![A-Za-z0-9])-e(?:nc(?:odedcommand)?)?(?![A-Za-z0-9])/gi,
    label: '-enc / -encodedcommand / -e',
    mitre: [
      { id: 'T1059.001', name: 'PowerShell' },
      { id: 'T1027', name: 'Obfuscated Files or Information' },
    ],
    suspicious: 'Encoded payload detected',
    isEncSwitch: true,
  },
  // -nop / -noprofile
  {
    pattern: /(?<![A-Za-z0-9])-nop(?:rofile)?(?![A-Za-z0-9])/gi,
    label: '-nop / -noprofile',
    mitre: [{ id: 'T1059.001', name: 'PowerShell' }],
    suspicious: 'No profile loaded',
  },
  // -noni / -noninteractive
  {
    pattern: /(?<![A-Za-z0-9])-noni(?:nteractive)?(?![A-Za-z0-9])/gi,
    label: '-noni / -noninteractive',
    mitre: [{ id: 'T1059.001', name: 'PowerShell' }],
    suspicious: 'Non-interactive session',
  },
  // -w hidden / -windowstyle hidden / -w 1 / -w 2 / WindowStyle Hidden (param form)
  {
    pattern: /(?<![A-Za-z0-9])-w(?:indowstyle)?\s+(?:hidden|1|2)\b|\bwindowstyle\s+['"]?hidden['"]?/gi,
    label: '-w hidden / -windowstyle hidden',
    mitre: [{ id: 'T1564.003', name: 'Hidden Window' }],
    suspicious: 'Hidden window detected',
  },
  // -bypass / -executionpolicy bypass / -ep bypass
  {
    pattern: /(?<![A-Za-z0-9])(?:-ep\s+bypass|-executionpolicy\s+bypass|-bypass)\b/gi,
    label: '-bypass / -executionpolicy bypass',
    mitre: [{ id: 'T1059.001', name: 'PowerShell' }],
    suspicious: 'Execution policy bypassed',
  },
  // Invoke-Expression / IEX (alias)
  {
    pattern: /\b(?:Invoke-Expression|IEX)\b/gi,
    label: 'Invoke-Expression / IEX',
    mitre: [
      { id: 'T1059.001', name: 'PowerShell' },
      { id: 'T1027', name: 'Obfuscated Files or Information' },
    ],
    suspicious: 'In-memory execution (IEX/Invoke-Expression)',
  },
  // .DownloadString
  {
    pattern: /\.DownloadString\b/gi,
    label: 'DownloadString',
    mitre: [{ id: 'T1105', name: 'Ingress Tool Transfer' }],
    suspicious: 'Remote download capability',
  },
  // .DownloadFile
  {
    pattern: /\.DownloadFile\b/gi,
    label: 'DownloadFile',
    mitre: [{ id: 'T1105', name: 'Ingress Tool Transfer' }],
    suspicious: 'Remote download capability',
  },
  // .DownloadData
  {
    pattern: /\.DownloadData\b/gi,
    label: 'DownloadData',
    mitre: [{ id: 'T1105', name: 'Ingress Tool Transfer' }],
    suspicious: 'Remote download capability',
  },
  // ::FromBase64String (System.Convert::FromBase64String)
  {
    pattern: /::FromBase64String\b/gi,
    label: 'FromBase64String',
    mitre: [{ id: 'T1027', name: 'Obfuscated Files or Information' }],
    suspicious: 'Base64 decoding (FromBase64String)',
  },
  // Net.WebClient / System.Net.WebClient
  {
    pattern: /(?:System\.)?Net\.WebClient\b/gi,
    label: 'Net.WebClient',
    mitre: [{ id: 'T1105', name: 'Ingress Tool Transfer' }],
    suspicious: 'Remote download capability',
  },
  // Start-Process
  {
    pattern: /\bStart-Process\b/gi,
    label: 'Start-Process',
    mitre: [{ id: 'T1059.001', name: 'PowerShell' }],
    suspicious: 'Process spawning (Start-Process)',
  },
  // Invoke-WebRequest / iwr (alias)
  {
    pattern: /\b(?:Invoke-WebRequest|iwr)\b/gi,
    label: 'Invoke-WebRequest / iwr',
    mitre: [{ id: 'T1105', name: 'Ingress Tool Transfer' }],
    suspicious: 'Remote download capability',
  },
  // Invoke-RestMethod / irm (alias)
  {
    pattern: /\b(?:Invoke-RestMethod|irm)\b/gi,
    label: 'Invoke-RestMethod / irm',
    mitre: [{ id: 'T1105', name: 'Ingress Tool Transfer' }],
    suspicious: 'Remote download capability',
  },
  // Set-ExecutionPolicy
  {
    pattern: /\bSet-ExecutionPolicy\b/gi,
    label: 'Set-ExecutionPolicy',
    mitre: [{ id: 'T1059.001', name: 'PowerShell' }],
  },
  // Mimikatz / Invoke-Mimikatz
  {
    pattern: /\b(?:Invoke-)?Mimikatz\b/gi,
    label: 'Mimikatz / Invoke-Mimikatz',
    mitre: [{ id: 'T1003.001', name: 'LSASS Memory' }],
  },
  // Bypass-UAC (not in spec MITRE table — sensible mapping T1548.002)
  {
    pattern: /\bBypass-UAC\b/gi,
    label: 'Bypass-UAC',
    mitre: [{ id: 'T1548.002', name: 'Bypass User Account Control' }],
  },
  // Invoke-Obfuscation (not in spec MITRE table — sensible mapping T1027)
  {
    pattern: /\bInvoke-Obfuscation\b/gi,
    label: 'Invoke-Obfuscation',
    mitre: [{ id: 'T1027', name: 'Obfuscated Files or Information' }],
  },
  // AMSI bypass — amsiInitFailed (classic technique: force the AMSI
  // initialization result to "failed" via .NET static-field manipulation or
  // the registry-force variant, so scans silently stop).
  {
    pattern: /\bamsiinitfailed\b/gi,
    label: 'amsiInitFailed',
    mitre: [{ id: 'T1562.001', name: 'Impair Defenses' }],
    suspicious: 'AMSI bypass attempt (amsiInitFailed)',
    severity: 'high',
  },
  // AMSI bypass — reflection on System.Management.Automation.AmsiUtils
  // (e.g. [Ref].Assembly.GetType('System.Management.Automation.AmsiUtils')).
  {
    pattern: /\bamsiutils\b/gi,
    label: 'AmsiUtils reflection target',
    mitre: [{ id: 'T1562.001', name: 'Impair Defenses' }],
    suspicious: 'AMSI bypass via reflection on AmsiUtils',
    severity: 'high',
  },
  // AMSI bypass — dynamic resolution of amsi.dll exports
  // (LoadLibrary/GetProcAddress on amsi.dll to locate AmsiScanBuffer).
  {
    pattern: /amsi\.dll[\s\S]{0,200}?\b(?:LoadLibrary|GetProcAddress)\b|\b(?:LoadLibrary|GetProcAddress)\b[\s\S]{0,200}?amsi\.dll/gi,
    label: 'amsi.dll + LoadLibrary/GetProcAddress',
    mitre: [{ id: 'T1562.001', name: 'Impair Defenses' }],
    suspicious: 'AMSI bypass via dynamic API resolution (amsi.dll)',
    severity: 'high',
  },
  // AMSI bypass — patching the AmsiScanBuffer function (in-memory patch
  // that makes the AMSI scan always return "clean").
  {
    pattern: /\bamsiscanbuffer\b/gi,
    label: 'AmsiScanBuffer patch',
    mitre: [{ id: 'T1562.001', name: 'Impair Defenses' }],
    suspicious: 'AMSI bypass attempt (AmsiScanBuffer patching)',
    severity: 'high',
  },
];

/* ---------- helpers ---------- */

/** Escape HTML special chars — used when building note HTML for [Add to Note]. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Heuristic: does the decoded text look like code/commands?
 * Matches: ^powershell\b, ^Invoke-, ^IEX (anchored to start), and
 * curl, wget, <script (anywhere). Used to decide whether to show the
 * "looks like code — NOT executed" InfoBanner above the decoded text.
 */
function looksLikeCode(s: string): boolean {
  if (!s) return false;
  const patterns: RegExp[] = [
    /^\s*powershell\b/i,
    /^\s*Invoke-/i,
    /^\s*IEX\b/i,
    /\bcurl\b/i,
    /\bwget\b/i,
    /<script\b/i,
  ];
  return patterns.some((p) => p.test(s));
}

/** Check if a string looks like well-formed Base64 (standard or URL-safe). */
function isLikelyBase64(s: string): boolean {
  if (!s) return false;
  if (!/^[A-Za-z0-9+/=_-]+$/.test(s)) return false;
  // Normalize URL-safe → standard, strip existing padding.
  const stripped: string = s
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .replace(/=+$/, '');
  // Length mod 4 must be 0, 2, or 3 — 1 is invalid Base64.
  return stripped.length % 4 !== 1;
}

/** Decode Base64 (standard or URL-safe) to a UTF-8 string. Never throws. */
function decodeBase64(s: string): { decoded: string; error?: string } {
  try {
    const cleaned: string = s.replace(/\s+/g, '');
    // Normalize URL-safe → standard
    const norm: string = cleaned.replace(/-/g, '+').replace(/_/g, '/');
    // Restore stripped padding
    const stripped: string = norm.replace(/=+$/, '');
    const pad: number = (4 - (stripped.length % 4)) % 4;
    const padded: string = stripped + '='.repeat(pad);
    // atob returns a binary string (one char per byte).
    const bin: string = atob(padded);
    // Convert binary string → byte array, then decode UTF-8.
    const bytes: Uint8Array = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    // fatal: false → U+FFFD replacement chars on bad byte sequences (no throw).
    return { decoded: new TextDecoder('utf-8', { fatal: false }).decode(bytes) };
  } catch {
    return { decoded: '', error: 'Invalid Base64 payload — could not decode.' };
  }
}

/**
 * Extract the next whitespace-delimited token after position `matchEnd`.
 * Handles quoted tokens ("..." and '...') and strips PowerShell `^` escapes.
 * Returns the cleaned token, or null if no token is found.
 */
function extractBase64PayloadAfter(text: string, matchEnd: number): string | null {
  let i: number = matchEnd;
  // Skip whitespace
  while (i < text.length && /\s/.test(text[i])) i++;
  if (i >= text.length) return null;

  let token: string;
  if (text[i] === '"' || text[i] === "'") {
    const quote: string = text[i];
    i++; // skip opening quote
    const start: number = i;
    while (i < text.length && text[i] !== quote) i++;
    token = text.slice(start, i);
  } else {
    const start: number = i;
    while (i < text.length && !/\s/.test(text[i])) i++;
    token = text.slice(start, i);
  }
  // Strip PowerShell `^` escape chars (e.g. `^&` → `&`)
  token = token.replace(/\^/g, '');
  // Defensive: strip wrapping quotes again in case they survived.
  if (
    token.length >= 2 &&
    ((token[0] === '"' && token[token.length - 1] === '"') ||
      (token[0] === "'" && token[token.length - 1] === "'"))
  ) {
    token = token.slice(1, -1);
  }
  return token || null;
}

/** Build the MITRE ATT&CK URL for a technique ID (T1059.001 → .../T1059/001/). */
function mitreUrl(id: string): string {
  const m: RegExpExecArray | null = /^T(\d+)(?:\.(\d+))?$/.exec(id);
  if (!m) return 'https://attack.mitre.org/techniques/enterprise/';
  return m[2]
    ? `https://attack.mitre.org/techniques/T${m[1]}/${m[2]}/`
    : `https://attack.mitre.org/techniques/T${m[1]}/`;
}

/** Extract ~40 chars before+after the match, with "…" ellipsis when truncated. */
function extractContextParts(
  text: string,
  matchIndex: number,
  matchLength: number,
  radius: number = 40,
): { before: string; match: string; after: string } {
  const start: number = Math.max(0, matchIndex - radius);
  const end: number = Math.min(text.length, matchIndex + matchLength + radius);
  // Collapse internal whitespace so the snippet fits on one line.
  const before: string = text.slice(start, matchIndex).replace(/\s+/g, ' ');
  const after: string = text.slice(matchIndex + matchLength, end).replace(/\s+/g, ' ');
  const match: string = text.slice(matchIndex, matchIndex + matchLength);
  const prefix: string = start > 0 ? '…' : '';
  const suffix: string = end < text.length ? '…' : '';
  return { before: prefix + before, match, after: after + suffix };
}

/** Run all detection rules and collect indicators, MITRE techniques, suspicious patterns. */
function analyzePowershell(input: string): Analysis {
  const indicators: Indicator[] = [];
  const techniquesMap: Map<string, MitreRef> = new Map();
  const suspiciousSet: Set<string> = new Set();

  for (const rule of RULES) {
    // RegExp with /g is stateful — reset before each scan.
    rule.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.pattern.exec(input)) !== null) {
      const matchIndex: number = m.index;
      const matched: string = m[0];
      const matchLength: number = matched.length;
      const ctx = extractContextParts(input, matchIndex, matchLength);

      // For the -enc rule, extract the next token as a Base64 payload.
      let display: string = matched;
      let base64Payload: string | undefined;
      if (rule.isEncSwitch) {
        const payload: string | null = extractBase64PayloadAfter(
          input,
          matchIndex + matchLength,
        );
        if (payload && isLikelyBase64(payload)) {
          display = `${matched} ${payload}`;
          base64Payload = payload;
        }
      }

      indicators.push({
        indicator: display,
        matched,
        contextBefore: ctx.before,
        contextMatch: ctx.match,
        contextAfter: ctx.after,
        mitre: rule.mitre,
        severity: rule.severity,
        base64Payload,
      });

      // Track MITRE techniques (dedupe by ID)
      for (const ref of rule.mitre) {
        if (!techniquesMap.has(ref.id)) techniquesMap.set(ref.id, ref);
      }
      // Track suspicious patterns (Set dedupes automatically)
      if (rule.suspicious) suspiciousSet.add(rule.suspicious);

      // Guard against zero-length matches causing an infinite loop.
      if (m.index === rule.pattern.lastIndex) rule.pattern.lastIndex++;
    }
  }

  return {
    indicators,
    techniques: Array.from(techniquesMap.values()),
    suspicious: Array.from(suspiciousSet),
  };
}

/** Plain-text summary for the [Copy] button. */
function buildSummaryText(input: string, analysis: Analysis): string {
  const lines: string[] = [];
  lines.push('=== PowerShell Analysis (heuristic, not a verdict) ===');
  lines.push('');
  lines.push('Input:');
  lines.push(input);
  lines.push('');
  if (analysis.indicators.length > 0) {
    lines.push('--- Detected Indicators ---');
    for (const ind of analysis.indicators) {
      const mitreIds: string = ind.mitre.map((m) => `${m.id} (${m.name})`).join('; ');
      lines.push(
        `- ${ind.indicator}  [MITRE: ${mitreIds}]${ind.severity ? `  [SEVERITY: ${ind.severity.toUpperCase()}]` : ''}`,
      );
      lines.push(`  Context: ${ind.contextBefore}>>${ind.contextMatch}<<${ind.contextAfter}`);
    }
    lines.push('');
  }
  if (analysis.techniques.length > 0) {
    lines.push('--- Potential MITRE Techniques ---');
    for (const t of analysis.techniques) {
      lines.push(`- ${t.id}  ${t.name}  ${mitreUrl(t.id)}`);
    }
    lines.push('');
  }
  if (analysis.suspicious.length > 0) {
    lines.push('--- Suspicious Patterns ---');
    for (const s of analysis.suspicious) lines.push(`- ${s}`);
    lines.push('');
  }
  if (analysis.indicators.length === 0) {
    lines.push('No suspicious indicators detected (absence is not a benign verdict).');
    lines.push('');
  }
  lines.push('Heuristic analysis only — review in context.');
  return lines.join('\n');
}

/** HTML summary for [Add to Note]. All user content is escaped via escapeHtml. */
function buildSummaryHtml(input: string, analysis: Analysis): string {
  const parts: string[] = [];
  parts.push('<h1>PowerShell Analysis</h1>');
  parts.push('<p><strong>Input (escaped):</strong></p>');
  parts.push(`<pre>${escapeHtml(input)}</pre>`);

  if (analysis.indicators.length > 0) {
    parts.push('<h2>Detected Indicators</h2>');
    parts.push('<ul>');
    for (const ind of analysis.indicators) {
      const mitreIds: string = ind.mitre.map((m) => `${m.id} (${m.name})`).join('; ');
      parts.push(
        `<li><code>${escapeHtml(ind.indicator)}</code> — MITRE: ${escapeHtml(mitreIds)}` +
        `${ind.severity ? ` — SEVERITY: ${escapeHtml(ind.severity.toUpperCase())}` : ''}<br>` +
        `<small>Context: <code>${escapeHtml(ind.contextBefore)}<strong>${escapeHtml(ind.contextMatch)}</strong>${escapeHtml(ind.contextAfter)}</code></small></li>`,
      );
    }
    parts.push('</ul>');
  }

  if (analysis.techniques.length > 0) {
    parts.push('<h2>Potential MITRE Techniques</h2>');
    parts.push('<ul>');
    for (const t of analysis.techniques) {
      const url: string = mitreUrl(t.id);
      parts.push(
        `<li><code>${escapeHtml(t.id)}</code> — ${escapeHtml(t.name)} (<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>)</li>`,
      );
    }
    parts.push('</ul>');
  }

  if (analysis.suspicious.length > 0) {
    parts.push('<h2>Suspicious Patterns</h2>');
    parts.push('<ul>');
    for (const s of analysis.suspicious) parts.push(`<li>${escapeHtml(s)}</li>`);
    parts.push('</ul>');
  }

  if (analysis.indicators.length === 0) {
    parts.push('<p><em>No suspicious indicators detected (absence is not a benign verdict).</em></p>');
  }

  parts.push('<hr><p><em>Heuristic analysis only — not a verdict. Review in context.</em></p>');
  return parts.join('');
}

/* ---------- component ---------- */
export const PowerShellAnalyzerTool: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [decoded, setDecoded] = useState<Record<string, DecodedResult>>({});

  // Live analysis (cheap regex scan; recomputes on every input change via useMemo).
  const analysis: Analysis = useMemo(() => analyzePowershell(input), [input]);

  // Only render decoded entries whose source payload is still attached to a
  // currently-detected indicator. Stale entries (from a previous input) are
  // filtered out — no need to clear `decoded` on every keystroke.
  const activeDecoded: DecodedResult[] = useMemo(() => {
    const seen: Set<string> = new Set();
    const out: DecodedResult[] = [];
    for (const ind of analysis.indicators) {
      if (ind.base64Payload && decoded[ind.base64Payload] && !seen.has(ind.base64Payload)) {
        seen.add(ind.base64Payload);
        out.push(decoded[ind.base64Payload]);
      }
    }
    return out;
  }, [analysis.indicators, decoded]);

  const handleAnalyze = useCallback((): void => {
    setSubmitted(true);
  }, []);

  const handleClear = useCallback((): void => {
    setInput('');
    setSubmitted(false);
    setDecoded({});
  }, []);

  const handleDecode = useCallback((raw: string): void => {
    setDecoded((prev) => {
      if (prev[raw]) return prev; // idempotent — already decoded
      const r: { decoded: string; error?: string } = decodeBase64(raw);
      return {
        ...prev,
        [raw]: {
          raw,
          decoded: r.decoded,
          isCode: looksLikeCode(r.decoded),
          error: r.error,
        },
      };
    });
  }, []);

  const handleSendToIoc = useCallback((): void => {
    if (!input.trim()) return;
    useIocStore.getState().setPendingText(input);
  }, [input]);

  const handleAddToNote = useCallback((): void => {
    if (!input.trim()) return;
    useNoteStore.getState().enqueueNote('PowerShell Analysis', buildSummaryHtml(input, analysis));
  }, [input, analysis]);

  const showResults: boolean = submitted && input.trim().length > 0;
  const copyText: string = showResults ? buildSummaryText(input, analysis) : input;

  return (
    <div className="space-y-3">
      <Field
        label="PowerShell command or script"
        hint="100% offline · analyzed as text only · never executed"
      >
        <textarea
          value={input}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
          placeholder="Paste a PowerShell command or script — analyzed as text, never executed."
          className={taCls}
          rows={4}
          spellCheck={false}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAnalyze}
          className={`${btnPrimary} inline-flex items-center gap-1.5`}
          disabled={!input.trim()}
        >
          <Search className="w-3.5 h-3.5" />
          Analyze
        </button>
        <button
          type="button"
          onClick={handleClear}
          className={`${btnDanger} inline-flex items-center gap-1.5`}
          disabled={!input && !submitted && Object.keys(decoded).length === 0}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
        <div className="ml-auto">
          <CopyBtn text={copyText} label="Copy analysis summary" />
        </div>
      </div>

      {!showResults ? (
        <InfoBanner>
          <span className="font-semibold">Paste a PowerShell command or script above, then click Analyze.</span>{' '}
          The text is parsed locally — no execution, no network calls.
        </InfoBanner>
      ) : (
        <div className="space-y-3">
          {/* Top-of-output hedged disclaimer (never alarmist) */}
          <InfoBanner>
            <span className="font-semibold">Heuristic analysis only.</span> Indicators are not a
            verdict — many legitimate admin scripts use these same flags. Review in context.
          </InfoBanner>

          {/* Detected Indicators */}
          <section className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <header className="flex items-center gap-2 text-xs font-semibold text-white">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Detected Indicators
              <span className="text-[#555] font-normal">({analysis.indicators.length})</span>
            </header>
            {analysis.indicators.length === 0 ? (
              <p className="text-[11px] text-[#666]">
                No suspicious indicators matched. Absence of indicators does not guarantee benign
                intent — review the script manually.
              </p>
            ) : (
              <ul className="space-y-2">
                {analysis.indicators.map((ind, i) => (
                  <li
                    key={`${ind.matched}-${i}`}
                    className="bg-[#161616] border border-[#262626] rounded p-2 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <code className="text-[11px] text-amber-300 font-mono break-all">
                        {ind.indicator}
                      </code>
                      <div className="flex flex-wrap items-center gap-1 shrink-0">
                        {ind.mitre.map((m) => (
                          <span
                            key={m.id}
                            className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-500/10 border border-blue-500/30 text-blue-400"
                          >
                            {m.id}
                          </span>
                        ))}
                        {ind.severity && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-red-500/10 border border-red-500/40 text-red-400"
                          >
                            {ind.severity}
                          </span>
                        )}
                        {ind.base64Payload && (
                          <button
                            type="button"
                            onClick={() => handleDecode(ind.base64Payload as string)}
                            className={`${btnGhost} text-[10px] inline-flex items-center gap-1`}
                          >
                            <Code2 className="w-3 h-3" />
                            Decode Base64
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="font-mono text-[10px] text-[#666] break-all leading-snug">
                      <span>{ind.contextBefore}</span>
                      <span className="text-amber-400 font-bold">{ind.contextMatch}</span>
                      <span>{ind.contextAfter}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Potential MITRE Techniques */}
          {analysis.techniques.length > 0 && (
            <section className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
              <header className="flex items-center gap-2 text-xs font-semibold text-white">
                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                Potential MITRE Techniques
                <span className="text-[#555] font-normal">({analysis.techniques.length})</span>
              </header>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {analysis.techniques.map((t) => (
                  <li
                    key={t.id}
                    className="bg-[#161616] border border-[#262626] rounded p-2 flex items-center justify-between gap-2"
                  >
                    <div className="flex flex-col min-w-0">
                      <code className="text-[11px] font-mono text-blue-300">{t.id}</code>
                      <span className="text-[10px] text-[#888] truncate">{t.name}</span>
                    </div>
                    <a
                      href={mitreUrl(t.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${btnGhost} text-[10px] inline-flex items-center gap-1 shrink-0`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open in MITRE
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Suspicious Patterns */}
          {analysis.suspicious.length > 0 && (
            <section className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
              <header className="flex items-center gap-2 text-xs font-semibold text-white">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                Suspicious Patterns
                <span className="text-[#555] font-normal">({analysis.suspicious.length})</span>
              </header>
              <ul className="flex flex-wrap gap-1.5">
                {analysis.suspicious.map((s) => (
                  <li
                    key={s}
                    className="px-2 py-1 rounded text-[10px] bg-yellow-500/10 border border-yellow-500/30 text-yellow-300"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Decoded Content (only shown when ≥1 payload has been decoded) */}
          {activeDecoded.length > 0 && (
            <section className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
              <header className="flex items-center gap-2 text-xs font-semibold text-white">
                <Code2 className="w-3.5 h-3.5 text-green-400" />
                Decoded Content
                <span className="text-[#555] font-normal">({activeDecoded.length})</span>
              </header>
              <ul className="space-y-3">
                {activeDecoded.map((d) => (
                  <li key={d.raw} className="space-y-1">
                    <div className="text-[10px] text-[#666]">
                      Source payload:{' '}
                      <code className="font-mono text-[#888] break-all">{d.raw}</code>
                    </div>
                    {d.error ? (
                      <ErrorBanner message={d.error} />
                    ) : (
                      <>
                        {d.isCode && (
                          <InfoBanner>
                            <span className="font-bold">
                              ⚠ Decoded content looks like code/commands.
                            </span>{' '}
                            It is shown as text only and is{' '}
                            <span className="font-bold">NOT</span> executed.
                          </InfoBanner>
                        )}
                        {/* Rendered as TEXT via React value binding — never executed,
                            never dangerouslySetInnerHTML. CodeBlock wraps in a <pre>. */}
                        <CodeBlock code={d.decoded} label="Decoded (UTF-8)" />
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Cross-tool hand-off buttons */}
          <section className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={handleSendToIoc}
              className={`${btnGhost} inline-flex items-center gap-1.5`}
              disabled={!input.trim()}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in IoC Extractor
            </button>
            <button
              type="button"
              onClick={handleAddToNote}
              className={`${btnGhost} inline-flex items-center gap-1.5`}
              disabled={!input.trim()}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Add to Note
            </button>
          </section>
        </div>
      )}
    </div>
  );
};

export default PowerShellAnalyzerTool;
