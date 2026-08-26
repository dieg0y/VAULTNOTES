/**
 * LogParserTool.tsx — SOC Log Parser (100% offline).
 *
 * Paste a blob of log lines (one or many); each line is auto-detected and
 * parsed in priority order — first non-null parser wins (mixed logs OK):
 *   1. SSH (Linux auth.log / secure log)
 *   2. Apache / Nginx access logs (Common Log Format + variations)
 *   3. Generic Linux syslog
 *   4. Windows Event XML (single-line compact OR multi-line pretty form)
 *   5. Unknown fallback — heuristic IP + "user <name>" extraction
 *
 * Output: compact 6-col table with a [Show all fields] toggle that expands
 * each row into a multi-field card. [Copy] = TSV. [Extract IOCs] hands
 * discovered IPs/usernames to the IoC Extractor via the cross-tool store.
 * [Add to Note] enqueues an HTML table as a new note.
 *
 * 100% OFFLINE: no fetch, no APIs, no telemetry, no eval — regex only.
 */
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Search, Copy, Check, Trash2, ExternalLink, BookOpen,
  FileText, ListTree, AlertTriangle, Network,
} from 'lucide-react';
import { Field, InfoBanner, taCls, btnPrimary, btnGhost } from './_shared';
import { useIocStore } from '../../store/iocStore';
import { useNoteStore } from '../../store/noteStore';

/* ---------- strict types ---------- */
type LogFormat = 'ssh' | 'apache' | 'syslog' | 'winevent' | 'unknown';

interface ParsedLog {
  format: LogFormat;
  timestamp: string;
  hostname: string;
  username: string;
  sourceIp: string;
  destinationIp: string;
  sourcePort: string;
  destinationPort: string;
  process: string;
  pid: string;
  eventId: string;
  action: string;
  status: string;
  raw: string;
}

/* ---------- regexes (named, singletons) ---------- */
// SSH: optional syslog prefix, optional sshd[pid]:, then Failed/Accepted
// password|publickey for [invalid user] <user> from <ip> port <port>.
const SSH_RE =
  /^(?:(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+)?(?:sshd\[(\d+)\]:\s+)?(Failed|Accepted)\s+(?:password|publickey)\s+for\s+(?:invalid\s+user\s+)?(\S+)\s+from\s+(\S+)\s+port\s+(\d+)/i;

// Apache/Nginx CLF: IP ident user [timestamp] "METHOD path PROTO" status bytes.
// Timestamp captured from inside the brackets.
const APACHE_RE =
  /^(\S+)\s+\S+\s+(\S+)\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)\s+\S+"\s+(\d+)\s+(\d+|-)/;

// Generic syslog: <Mon DD HH:MM:SS> <host> <process>[<pid>]: <message>.
const SYSLOG_RE =
  /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\S+?)(?:\[(\d+)\])?:\s+(.*)$/;

// Windows Event XML block detector — dotall, non-greedy so it grabs the
// smallest <Event>…</Event> run (works on multi-line pretty XML).
const WIN_EVENT_BLOCK_RE = /<Event[\s\S]*?<\/Event>/g;

// Windows Event field extractors (single-line regex per field; work on the
// whole block regardless of namespace or attribute quote style).
const WIN_EVENT_FIELDS = {
  eventId:    /<EventID[^>]*>(\d+)<\/EventID>/,
  computer:   /<Computer[^>]*>([^<]*)<\/Computer>/,
  timeCreated: /SystemTime\s*=\s*['"]([^'"]+)['"]/,
  provider:   /<Provider[^>]*\sName\s*=\s*['"]([^'"]+)['"]/,
  targetUser: /<Data[^>]*\sName\s*=\s*['"](?:TargetUserName|SubjectUserName)['"][^>]*>([^<]*)<\/Data>/,
  ip:         /<Data[^>]*\sName\s*=\s*['"](?:IpAddress|SourceAddress|ClientIp)['"][^>]*>([^<]*)<\/Data>/,
  logonType:  /<Data[^>]*\sName\s*=\s*['"]LogonType['"][^>]*>([^<]*)<\/Data>/,
};

// IPv4 / IPv6 detectors. IPv4 is permissive (no range validation) — the IoC
// Extractor does the real validation. SSH/Apache/Windows capture IPv6
// tokens via (\S+) / attribute value, so this regex is only used to scan
// raw text in the unknown / syslog fallbacks (fully-written form only).
const IPV4_RE   = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
const IPV4_RE_G = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const IPV6_RE_G = /\b(?:[A-Fa-f0-9]{1,4}:){2,7}[A-Fa-f0-9]{1,4}\b/g;
const USER_KW_RE   = /\buser\s+(\S+)/i;
const USER_KW_RE_G = /\buser\s+(\S+)/gi;

/* ---------- Windows Event ID → action/status map (hard-coded most common) ---------- */
interface WinEventAction { action: string; status: string; }
const WIN_EVENT_ACTIONS: Record<string, WinEventAction> = {
  '4624': { action: 'Logon Success',            status: 'Success'     },
  '4625': { action: 'Logon Failure',            status: 'Failed'      },
  '4634': { action: 'Logoff',                   status: 'Information' },
  '4648': { action: 'Explicit Credentials',     status: 'Information' },
  '4672': { action: 'Special Privileges',       status: 'Information' },
  '4688': { action: 'Process Creation',         status: 'Information' },
  '4720': { action: 'User Account Created',     status: 'Information' },
  '4722': { action: 'User Account Enabled',     status: 'Information' },
  '4724': { action: 'Password Reset Attempt',   status: 'Information' },
  '4726': { action: 'User Account Deleted',     status: 'Information' },
  '4738': { action: 'User Account Changed',     status: 'Information' },
  '4740': { action: 'Account Locked Out',       status: 'Information' },
  '4768': { action: 'Kerberos TGT Request',     status: 'Information' },
  '4769': { action: 'Kerberos Service Ticket',  status: 'Information' },
  '4771': { action: 'Kerberos Pre-Auth Failed', status: 'Failed'      },
  '4776': { action: 'NTLM Authentication',      status: 'Information' },
  '4698': { action: 'Scheduled Task Created',   status: 'Information' },
  '7045': { action: 'Service Installed',        status: 'Information' },
};

/* ---------- base factory for parser returns ---------- */
function emptyParsed(format: LogFormat, raw: string): ParsedLog {
  return {
    format, timestamp: '', hostname: '', username: '', sourceIp: '',
    destinationIp: '', sourcePort: '', destinationPort: '', process: '',
    pid: '', eventId: '', action: '', status: '', raw,
  };
}

/* ---------- Parser 1: SSH logs (auth.log / secure log) ---------- */
function parseSsh(line: string): ParsedLog | null {
  const m = line.match(SSH_RE);
  if (!m) return null;
  const p = emptyParsed('ssh', line);
  p.timestamp = m[1] ?? '';
  p.hostname  = m[2] ?? '';
  p.pid       = m[3] ?? '';
  p.status    = m[4] ?? '';           // "Failed" or "Accepted"
  p.username  = m[5] ?? '';
  p.sourceIp  = m[6] ?? '';
  p.sourcePort = m[7] ?? '';
  p.process   = 'sshd';
  p.action    = 'Login';
  return p;
}

/* ---------- Parser 2: Apache / Nginx access logs (CLF) ---------- */
function parseApache(line: string): ParsedLog | null {
  const m = line.match(APACHE_RE);
  if (!m) return null;
  const user = (m[2] ?? '').trim();
  const p = emptyParsed('apache', line);
  p.sourceIp  = m[1] ?? '';
  p.username  = user === '-' ? '' : user;
  p.timestamp = m[3] ?? '';
  p.action    = `HTTP ${m[4] ?? ''}`.trim();
  p.status    = m[6] ?? '';
  return p;
}

/* ---------- Parser 3: Generic Linux syslog ---------- */
function parseSyslog(line: string): ParsedLog | null {
  const m = line.match(SYSLOG_RE);
  if (!m) return null;
  const message = m[5] ?? '';
  // Try "from <IP>" first (strip surrounding brackets, e.g. unknown[10.0.0.1]).
  let sourceIp = '';
  const fromMatch = message.match(/from\s+(\S+)/i);
  if (fromMatch) {
    const candidate = (fromMatch[1] ?? '').replace(/[[\]]/g, '');
    if (IPV4_RE.test(candidate)) sourceIp = candidate;
  }
  if (!sourceIp) {
    const ipM = message.match(IPV4_RE);
    if (ipM) sourceIp = ipM[0];
  }
  let username = '';
  const userMatch = message.match(USER_KW_RE);
  if (userMatch) username = (userMatch[1] ?? '').replace(/[().,;:]/g, '');
  const process = m[3] ?? '';
  const p = emptyParsed('syslog', line);
  p.timestamp = m[1] ?? '';
  p.hostname  = m[2] ?? '';
  p.process   = process;
  p.pid       = m[4] ?? '';
  p.username  = username;
  p.sourceIp  = sourceIp;
  p.action    = process ? `${process} event` : 'Syslog event';
  p.status    = 'Information';
  return p;
}

/* ---------- Parser 4: Windows Event XML ---------- */
// Spec allows DOMParser OR regex. Regex is uniform across single-line
// compact, multi-line pretty, with/without event namespace, and never
// mis-parses quoted attribute values.
function parseWinEvent(block: string): ParsedLog | null {
  if (!/<Event[\s>]/.test(block)) return null;
  const eventIdMatch = block.match(WIN_EVENT_FIELDS.eventId);
  if (!eventIdMatch) return null;
  const eventId = eventIdMatch[1] ?? '';
  const computer   = (block.match(WIN_EVENT_FIELDS.computer)?.[1] ?? '').trim();
  const timeCreated = block.match(WIN_EVENT_FIELDS.timeCreated)?.[1] ?? '';
  const provider   = block.match(WIN_EVENT_FIELDS.provider)?.[1] ?? '';
  const targetUser = (block.match(WIN_EVENT_FIELDS.targetUser)?.[1] ?? '').trim();
  const ip         = (block.match(WIN_EVENT_FIELDS.ip)?.[1] ?? '').trim();
  const logonType  = (block.match(WIN_EVENT_FIELDS.logonType)?.[1] ?? '').trim();
  const actionInfo =
    WIN_EVENT_ACTIONS[eventId] ??
    { action: `Windows Event ${eventId}`, status: 'Information' };
  const p = emptyParsed('winevent', block.replace(/\s+/g, ' ').trim());
  p.timestamp = timeCreated;
  p.hostname  = computer;
  p.username  = targetUser;
  p.sourceIp  = ip;
  p.process   = provider;
  p.eventId   = eventId;
  p.action    = logonType ? `${actionInfo.action} (type ${logonType})` : actionInfo.action;
  p.status    = actionInfo.status;
  return p;
}

/* ---------- Parser 5: Unknown fallback (heuristic) ---------- */
function parseUnknown(line: string): ParsedLog {
  const ipv4 = line.match(IPV4_RE_G) ?? [];
  const ipv6 = line.match(IPV6_RE_G) ?? [];
  const allIps = [...ipv4, ...ipv6];
  const p = emptyParsed('unknown', line);
  p.sourceIp      = allIps[0] ?? '';
  p.destinationIp = allIps[1] ?? '';
  const userMatch = line.match(USER_KW_RE);
  if (userMatch) p.username = (userMatch[1] ?? '').replace(/[().,;:]/g, '');
  p.action = 'Unknown';
  p.status = 'Unknown';
  return p;
}

/* ---------- Per-line dispatch: first non-null parser wins ---------- */
function parseLine(line: string): ParsedLog {
  return parseSsh(line)
    ?? parseApache(line)
    ?? parseSyslog(line)
    ?? parseUnknown(line);
}

/* ---------- Entry point: extract <Event> blocks first, then per-line ---------- */
function parseInput(text: string): ParsedLog[] {
  if (!text.trim()) return [];
  const out: ParsedLog[] = [];
  let remaining = text;
  // 1) Pull out <Event>…</Event> blocks (multi-line capable).
  const blocks: string[] = [];
  WIN_EVENT_BLOCK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = WIN_EVENT_BLOCK_RE.exec(remaining)) !== null) {
    blocks.push(m[0]);
  }
  if (blocks.length > 0) {
    remaining = remaining.replace(WIN_EVENT_BLOCK_RE, '\n');
  }
  // 2) Parse each XML block as a single Windows event.
  for (const block of blocks) {
    const parsed = parseWinEvent(block);
    out.push(parsed ?? parseUnknown(block.replace(/\s+/g, ' ').trim()));
  }
  // 3) Parse remaining non-empty lines individually.
  for (const raw of remaining.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    out.push(parseLine(line));
  }
  return out;
}

/* ---------- IOC collection: parsed fields + raw scan, deduped ---------- */
function extractIocsFromParsed(parsed: ParsedLog[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (v: string): void => {
    const t = v.trim();
    if (!t || t === '-') return;
    if (seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };
  for (const p of parsed) {
    push(p.sourceIp);
    push(p.destinationIp);
    push(p.username);
    push(p.hostname);
    push(p.eventId);
    // Always scan raw line for additional IPs / "user <name>" tokens.
    const ipv4 = p.raw.match(IPV4_RE_G);
    if (ipv4) ipv4.forEach(push);
    const ipv6 = p.raw.match(IPV6_RE_G);
    if (ipv6) ipv6.forEach(push);
    const userMatches = p.raw.match(USER_KW_RE_G);
    if (userMatches) {
      userMatches.forEach((u) => {
        const name = u.replace(/^\s*user\s+/i, '').replace(/[().,;:]/g, '');
        push(name);
      });
    }
  }
  return out;
}

/* ---------- Format summary: { label, count } per detected format ---------- */
function summarizeFormats(parsed: ParsedLog[]): { label: string; count: number }[] {
  const counts: Record<LogFormat, number> = {
    ssh: 0, apache: 0, syslog: 0, winevent: 0, unknown: 0,
  };
  for (const p of parsed) counts[p.format]++;
  const labels: Record<LogFormat, string> = {
    ssh: 'SSH logs', apache: 'Apache access', syslog: 'Syslog',
    winevent: 'Windows Event XML', unknown: 'Unknown',
  };
  return (Object.keys(counts) as LogFormat[])
    .filter((f) => counts[f] > 0)
    .map((f) => ({ label: labels[f], count: counts[f] }));
}

/* ---------- HTML escape for [Add to Note] table ---------- */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ---------- Column model — shared by [Copy] (TSV) and [Add to Note] (HTML) ---------- */
interface Col {
  label: string;
  get: (p: ParsedLog, i: number) => string;
}

const COMPACT_COLS: Col[] = [
  { label: '#',         get: (_p, i) => String(i + 1) },
  { label: 'Timestamp', get: (p) => p.timestamp },
  { label: 'Source IP', get: (p) => p.sourceIp },
  { label: 'User',      get: (p) => p.username },
  { label: 'Action',    get: (p) => p.action },
  { label: 'Status',    get: (p) => p.status },
];

const ALL_COLS: Col[] = [
  { label: '#',            get: (_p, i) => String(i + 1) },
  { label: 'Format',       get: (p) => p.format },
  { label: 'Timestamp',    get: (p) => p.timestamp },
  { label: 'Hostname',     get: (p) => p.hostname },
  { label: 'Username',      get: (p) => p.username },
  { label: 'Source IP',    get: (p) => p.sourceIp },
  { label: 'Dest IP',      get: (p) => p.destinationIp },
  { label: 'Source Port',  get: (p) => p.sourcePort },
  { label: 'Dest Port',    get: (p) => p.destinationPort },
  { label: 'Process',      get: (p) => p.process },
  { label: 'PID',          get: (p) => p.pid },
  { label: 'Event ID',     get: (p) => p.eventId },
  { label: 'Action',       get: (p) => p.action },
  { label: 'Status',       get: (p) => p.status },
  { label: 'Raw',          get: (p) => p.raw },
];

function toTsv(parsed: ParsedLog[], showAll: boolean): string {
  const cols = showAll ? ALL_COLS : COMPACT_COLS;
  const header = cols.map((c) => c.label).join('\t');
  const rows = parsed.map((p, i) => cols.map((c) => c.get(p, i)).join('\t'));
  return [header, ...rows].join('\n');
}

function toHtmlTable(parsed: ParsedLog[], showAll: boolean): string {
  const cols = showAll ? ALL_COLS : COMPACT_COLS;
  const header =
    '<tr>' + cols.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('') + '</tr>';
  const rows = parsed
    .map((p, i) =>
      '<tr>' + cols.map((c) => `<td>${escapeHtml(c.get(p, i))}</td>`).join('') + '</tr>',
    )
    .join('');
  return (
    '<table border="1" cellpadding="4" cellspacing="0" ' +
    'style="border-collapse:collapse;width:100%;font-family:monospace;font-size:11px;">' +
    `<thead>${header}</thead><tbody>${rows}</tbody></table>`
  );
}

/* ---------- UI subcomponents ---------- */

/** Status pill — green for success/2xx, red for failure/4xx-5xx, blue for
 *  3xx/info, gray otherwise. */
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = status.toLowerCase();
  let cls = 'bg-[#161616] text-[#888]';
  const code = parseInt(s, 10);
  if (!Number.isNaN(code) && String(code) === s) {
    if (code >= 200 && code < 300) cls = 'bg-green-500/10 text-green-400';
    else if (code >= 300 && code < 400) cls = 'bg-blue-500/10 text-blue-300';
    else if (code >= 400) cls = 'bg-red-500/10 text-red-400';
  } else if (
    s.includes('fail') || s === 'denied' || s === 'error' || s === 'unknown'
  ) {
    cls = 'bg-red-500/10 text-red-400';
  } else if (s.includes('success') || s.includes('accept')) {
    cls = 'bg-green-500/10 text-green-400';
  } else if (s.includes('info')) {
    cls = 'bg-blue-500/10 text-blue-300';
  }
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${cls}`}>
      {status || '-'}
    </span>
  );
};

/** Labelled value cell used inside the expanded "Show all fields" card. */
const Field2: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="space-y-0.5">
    <div className="text-[9px] uppercase tracking-widest text-[#555]">{label}</div>
    <div className="text-[11px] text-white font-mono break-all">{value || '-'}</div>
  </div>
);

/** Expanded row card — every parsed field in a 2/3-col grid. */
const AllFieldsCard: React.FC<{ p: ParsedLog }> = ({ p }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 border-l-2 border-blue-500/30 pl-3">
    <Field2 label="Format" value={p.format} />
    <Field2 label="Hostname" value={p.hostname} />
    <Field2 label="Username" value={p.username} />
    <Field2 label="Source IP" value={p.sourceIp} />
    <Field2 label="Dest IP" value={p.destinationIp} />
    <Field2 label="Source Port" value={p.sourcePort} />
    <Field2 label="Dest Port" value={p.destinationPort} />
    <Field2 label="Process" value={p.process} />
    <Field2 label="PID" value={p.pid} />
    <Field2 label="Event ID" value={p.eventId} />
    <Field2 label="Action" value={p.action} />
    <Field2 label="Status" value={p.status} />
    <div className="col-span-2 md:col-span-3">
      <Field2 label="Raw line" value={p.raw} />
    </div>
  </div>
);

/* ---------- Sample input — the 4-line mix from validation example 5 ---------- */
const SAMPLE = `Failed password for invalid user admin from 192.168.1.10 port 12345 ssh2
Accepted password for root from 10.0.0.5 port 54321 ssh2
192.168.1.50 - - [10/Oct/2023:13:55:36 +0000] "GET /admin HTTP/1.1" 401 1234
random garbage line with no parser match but an IP 8.8.8.8`;

/* ---------- Main component ---------- */
export const LogParserTool: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [results, setResults] = useState<ParsedLog[]>([]);
  const [showAll, setShowAll] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [info, setInfo] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  const runParse = useCallback((text: string): void => {
    setResults(parseInput(text));
  }, []);

  // Auto-parse on input change (debounced 200ms). [Parse] button also
  // available as a manual trigger.
  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const v = e.target.value;
      setInput(v);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => runParse(v), 200);
    },
    [runParse],
  );

  // Cleanup any pending debounce on unmount.
  useEffect(() => {
    return (): void => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const handleParse = useCallback((): void => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    runParse(input);
  }, [input, runParse]);

  const handleClear = useCallback((): void => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    setInput('');
    setResults([]);
    setCopied(false);
    setInfo(null);
  }, []);

  const handleLoadSample = useCallback((): void => {
    setInput(SAMPLE);
    runParse(SAMPLE);
  }, [runParse]);

  const handleCopy = useCallback((): void => {
    if (!results.length) return;
    const tsv = toTsv(results, showAll);
    navigator.clipboard?.writeText(tsv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [results, showAll]);

  const handleExtractIocs = useCallback((): void => {
    if (!results.length) return;
    const iocs = extractIocsFromParsed(results);
    if (!iocs.length) {
      setInfo('No IOCs found in parsed lines.');
      setTimeout(() => setInfo(null), 2500);
      return;
    }
    useIocStore.getState().setPendingText(iocs.join('\n'));
    setInfo(`Sent ${iocs.length} candidate IOC(s) to the IoC Extractor.`);
    setTimeout(() => setInfo(null), 2500);
  }, [results]);

  const handleAddToNote = useCallback((): void => {
    if (!results.length) return;
    const html = toHtmlTable(results, showAll);
    useNoteStore.getState().enqueueNote('Log Parser Output', html);
    setInfo('Parsed output enqueued as a new note.');
    setTimeout(() => setInfo(null), 2500);
  }, [results, showAll]);

  const summary = useMemo(() => summarizeFormats(results), [results]);
  const allUnknown =
    results.length > 0 && results.every((p) => p.format === 'unknown');

  return (
    <div className="space-y-3">
      <Field label="Log input">
        <textarea
          value={input}
          onChange={onInputChange}
          placeholder="Paste log lines — auto-detected format"
          className={taCls + ' min-h-[140px]'}
          spellCheck={false}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleParse} className={btnPrimary}>
          <span className="inline-flex items-center gap-1.5"><Search className="w-3.5 h-3.5" /> Parse</span>
        </button>
        <button type="button" onClick={handleLoadSample} className={btnGhost}>
          <span className="inline-flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Load sample</span>
        </button>
        <button type="button" onClick={handleClear} className={btnGhost} disabled={!input && !results.length}>
          <span className="inline-flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Clear</span>
        </button>
        <button type="button" onClick={handleCopy} className={btnGhost} disabled={!results.length}>
          <span className="inline-flex items-center gap-1.5">
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy TSV'}
          </span>
        </button>
        <button type="button" onClick={handleExtractIocs} className={btnGhost} disabled={!results.length}>
          <span className="inline-flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Extract IOCs</span>
        </button>
        <button type="button" onClick={handleAddToNote} className={btnGhost} disabled={!results.length}>
          <span className="inline-flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Add to Note</span>
        </button>
        <button type="button" onClick={() => setShowAll((s) => !s)} className={btnGhost} disabled={!results.length}>
          <span className="inline-flex items-center gap-1.5"><ListTree className="w-3.5 h-3.5" /> {showAll ? 'Compact view' : 'Show all fields'}</span>
        </button>
      </div>

      {info && <InfoBanner>{info}</InfoBanner>}

      {results.length > 0 && (
        <>
          {allUnknown ? (
            <InfoBanner>
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              Unknown or partially parsed log format. Showing extracted IOCs only.
            </InfoBanner>
          ) : (
            <InfoBanner>
              <span className="font-semibold">Detected format(s):</span>{' '}
              {summary
                .map((s) => `${s.label} (${s.count} ${s.count === 1 ? 'line' : 'lines'})`)
                .join(', ')}
              {' — '}
              {results.length} total {results.length === 1 ? 'line' : 'lines'} parsed.
            </InfoBanner>
          )}

          <div className="border border-[#262626] rounded overflow-hidden">
            <div className="max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              <table className="w-full text-xs">
                <thead className="bg-[#0D0D0D] sticky top-0">
                  <tr>
                    <th className="text-left p-2 text-[10px] uppercase tracking-wider text-[#888]">#</th>
                    <th className="text-left p-2 text-[10px] uppercase tracking-wider text-[#888]">Timestamp</th>
                    <th className="text-left p-2 text-[10px] uppercase tracking-wider text-[#888]">Source IP</th>
                    <th className="text-left p-2 text-[10px] uppercase tracking-wider text-[#888]">User</th>
                    <th className="text-left p-2 text-[10px] uppercase tracking-wider text-[#888]">Action</th>
                    <th className="text-left p-2 text-[10px] uppercase tracking-wider text-[#888]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((p, i) => {
                    // Per-result bg — keeps a data row + its expanded card
                    // on the same shade while still zebra-striping across
                    // results.
                    const rowBg = i % 2 === 0 ? 'bg-[#0A0A0A]' : 'bg-[#0D0D0D]';
                    return (
                      <React.Fragment key={i}>
                        <tr className={`${rowBg} hover:bg-blue-500/5`}>
                          <td className="p-2 text-[11px] text-[#888]">{i + 1}</td>
                          <td className="p-2 text-[11px] text-white font-mono break-all">{p.timestamp || '-'}</td>
                          <td className="p-2 text-[11px] text-white font-mono break-all">
                            {p.sourceIp ? (
                              <span className="inline-flex items-center gap-1">
                                <Network className="w-3 h-3 text-blue-400 shrink-0" />
                                {p.sourceIp}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="p-2 text-[11px] text-white font-mono break-all">{p.username || '-'}</td>
                          <td className="p-2 text-[11px] text-white break-all">{p.action || '-'}</td>
                          <td className="p-2 text-[11px]"><StatusBadge status={p.status} /></td>
                        </tr>
                        {showAll && (
                          <tr className={rowBg}>
                            <td colSpan={6} className="p-3">
                              <AllFieldsCard p={p} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <InfoBanner>
        <span className="font-semibold">100% offline.</span> Supports SSH
        (auth.log / secure log), Apache / Nginx CLF, generic Linux syslog,
        and Windows Event XML (EventID 4624/4625/4634/4648/4672/4688/4720/
        4726/4776/…). Unknown lines still yield IPs and{' '}
        <code className="font-mono">user &lt;name&gt;</code> tokens
        heuristically. Mixed-format logs are fine — each line is parsed
        independently.
      </InfoBanner>
    </div>
  );
};

export default LogParserTool;
