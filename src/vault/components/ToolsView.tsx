import React, { useState, useMemo, useCallback } from 'react';
import {
  Calculator, FileKey, Cpu, Globe, Shield, Network, Clock,
  Wrench, Copy, Check, X, BookOpen, Lightbulb, Terminal, Server, Code, Lock,
  CalendarClock, Hash, Binary, Regex, ShieldOff, MapPin,
  SquareTerminal, FileText, Crosshair, Braces, BookMarked,
  Fingerprint, Building2, UserCog, Bug, FileSearch,
  Star, Search, History, Clock3
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { HTTP_STATUSES, HttpStatusInfo } from '../data/httpStatusData';
import { CRON_EXAMPLES, CRON_SHORTCUTS } from '../data/cronData';
// WinEventInfo/WIN_EVENTS imported here (top of file) so the helpers below
// (escapeHtml, buildWinEventHtmlTable) can reference the type. The actual
// WinEventTool component lives further down in this same file.
import { WinEventInfo, WIN_EVENTS, WIN_EVENT_CATEGORIES, WinEventCategory, getWinEventCategory } from '../data/winEventsData';
// BLOQUE 5 — Related Knowledge panel: helpers from MITRE + Sigma datasets.
import { findMitreById } from '../data/mitreData';
import { findSigmaByEventId } from '../data/sigmaData';

// New tools (Task ID 2-a..2-f) — each is a self-contained component living
// in src/vault/components/tools/. They reuse the helpers from _shared.tsx
// and follow the same visual style as the inline tools below.
import { TimestampConverterTool } from './tools/TimestampConverterTool';
import { HashToolkitTool } from './tools/HashToolkitTool';
import { EncodingTool } from './tools/EncodingTool';
import { RegexTesterTool } from './tools/RegexTesterTool';
import { IpAnalyzerTool } from './tools/IpAnalyzerTool';
import { IocDefangerTool } from './tools/IocDefangerTool';
// SOC block — Task ID 3-d..3-f
import { PowerShellAnalyzerTool } from './tools/PowerShellAnalyzerTool';
import { CommandLineAnalyzerTool } from './tools/CommandLineAnalyzerTool';
import { LogParserTool } from './tools/LogParserTool';
// SOC block — Task ID 4-6 (MITRE ATT&CK / Sigma Explorer / Detection Query Helper)
import { MitreExplorerTool } from './tools/MitreExplorerTool';
import { SigmaExplorerTool } from './tools/SigmaExplorerTool';
import { DetectionQueryHelperTool } from './tools/DetectionQueryHelperTool';
// BLOQUE 6 — Online-Optional. CVE Search is the only tool that touches the
// online layer (NVD API via integrations/cve/search.ts). It still works
// offline for browsing saved CVEs.
import { CveSearchTool } from './tools/CveSearchTool';
// IAM / Vulnerability / Linux block (Task ID 4-a..4-d + 4 + 5)
import { SidRidAnalyzerTool } from './tools/SidRidAnalyzerTool';
import { LdapDnParserTool } from './tools/LdapDnParserTool';
import { RbacAnalyzerTool } from './tools/RbacAnalyzerTool';
import { CvssCalculatorTool } from './tools/CvssCalculatorTool';
import { FileHashAnalyzerTool } from './tools/FileHashAnalyzerTool';
import { LinuxPermissionsTool } from './tools/LinuxPermissionsTool';
import { usePendingToolStore } from '../store/pendingToolStore';
import { useNoteStore } from '../store/noteStore';
// BLOQUE 5 — favorites/recents prefs (live-query hooks) + cross-tool helper.
import { useToolFavorites, useToolRecents } from '../hooks/useToolPrefs';
import { recordToolUse, toggleToolFavorite } from './tools/_shared';
// BLOQUE 5 — single source of truth for the tool catalog (also used by
// global search to index tools into Ctrl+K results).
import { TOOLS_CATALOG, type ToolId } from '../data/toolsCatalog';
export type { ToolId } from '../data/toolsCatalog';

/** Deep-link descriptor — used by the global fuzzy search to navigate the user
 *  directly into a tool + auto-open the detail modal for a specific entry. */
export interface ToolDeepLink {
  toolId: ToolId;
  /** For 'http' | 'winevent' the numeric code/ID; for 'ports' the port number; for 'cron' the cron expression. */
  entryId: string | number;
}

interface ToolsViewProps {
  /** When set, switches active tool to `toolId` and asks the corresponding tool to auto-open the entry with `entryId`. */
  pendingTool?: ToolDeepLink | null;
  /** Called once after the deep-link has been consumed (so the parent can clear it). */
  onConsumePending?: () => void;
}

// BLOQUE 5 — the runtime `TOOLS` array is built by merging the standalone
// catalog (no React, exported from data/toolsCatalog.ts so fuzzySearch can
// index it without dragging in tool components) with the per-id icon map
// below. Tags + descriptions live ONLY in the catalog to avoid drift.
const TOOL_ICONS: Record<ToolId, React.ReactNode> = {
  subnet: <Calculator className="w-4 h-4" />,
  ports: <Server className="w-4 h-4" />,
  jwt: <FileKey className="w-4 h-4" />,
  'sid-rid': <Fingerprint className="w-4 h-4" />,
  'ldap-dn': <Building2 className="w-4 h-4" />,
  rbac: <UserCog className="w-4 h-4" />,
  base: <Cpu className="w-4 h-4" />,
  http: <Globe className="w-4 h-4" />,
  winevent: <Shield className="w-4 h-4" />,
  ioc: <Network className="w-4 h-4" />,
  cron: <Clock className="w-4 h-4" />,
  'linux-perms': <Lock className="w-4 h-4" />,
  timestamp: <CalendarClock className="w-4 h-4" />,
  hash: <Hash className="w-4 h-4" />,
  'file-hash': <FileSearch className="w-4 h-4" />,
  cvss: <Bug className="w-4 h-4" />,
  encoding: <Binary className="w-4 h-4" />,
  regex: <Regex className="w-4 h-4" />,
  ip: <MapPin className="w-4 h-4" />,
  'ioc-defang': <ShieldOff className="w-4 h-4" />,
  'powershell-analyzer': <Terminal className="w-4 h-4" />,
  'cmd-analyzer': <SquareTerminal className="w-4 h-4" />,
  'log-parser': <FileText className="w-4 h-4" />,
  mitre: <Crosshair className="w-4 h-4" />,
  sigma: <BookMarked className="w-4 h-4" />,
  'detection-query': <Braces className="w-4 h-4" />,
  'cve-search': <Bug className="w-4 h-4" />, // reuse Bug icon (already imported); CVSS Calculator uses Bug too — fine.
};

const TOOLS: { id: ToolId; name: string; icon: React.ReactNode; cat: string; desc: string; tags?: string[] }[] =
  TOOLS_CATALOG.map((t) => ({ ...t, icon: TOOL_ICONS[t.id] }));

/* ---------- Shared UI helpers ---------- */
const CopyBtn: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="p-1 rounded text-[#666] hover:text-blue-400 hover:bg-[#161616] transition-colors shrink-0"
      title="Copiar"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold uppercase tracking-widest text-[#555]">{label}</label>
    {children}
  </div>
);

const inputCls = 'w-full bg-[#161616] border border-[#262626] rounded px-3 py-2 text-xs text-white font-mono placeholder:text-[#555] focus:outline-none focus:border-blue-500';
const taCls = inputCls + ' resize-y min-h-[80px]';

/* ---------- Modal component for detail views ---------- */
const DetailModal: React.FC<{ title: React.ReactNode; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-[#0D0D0D] border border-[#262626] rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#0D0D0D] border-b border-[#262626] px-5 py-3 flex items-center justify-between">
          <div className="font-bold text-white text-sm">{title}</div>
          <button onClick={onClose} className="p-1 rounded text-[#666] hover:text-white hover:bg-[#161616] cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4 text-xs text-[#E5E5E5]">{children}</div>
      </div>
    </div>
  );
};

const DetailSection: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-400">
      {icon}
      {title}
    </div>
    <div className="text-[#BBB] leading-relaxed text-[11px] pl-5">{children}</div>
  </div>
);

const CodeBlock: React.FC<{ code: string; lang?: string }> = ({ code, lang }) => (
  <div className="bg-[#0A0A0A] border border-[#262626] rounded p-2.5 font-mono text-[10px] text-green-300 break-all flex items-start justify-between gap-2">
    <pre className="whitespace-pre-wrap break-all flex-1">{code}</pre>
    <CopyBtn text={code} />
    {lang && <span className="text-[9px] text-[#444] uppercase shrink-0">{lang}</span>}
  </div>
);

/* ---------- escapeHtml + buildWinEventHtmlTable ---------- */
/* Helpers used by the WinEventTool [Add to Note] action.
 * HTML-escape user-facing strings BEFORE embedding in HTML — NO
 * dangerouslySetInnerHTML anywhere in this file. */
function escapeHtml(s: unknown): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildWinEventHtmlTable(e: WinEventInfo): string {
  const rows: [string, string][] = [
    ['Event ID', escapeHtml(e.id)],
    ['Name', escapeHtml(e.name)],
    ['Log', escapeHtml(e.log)],
    ['Short', escapeHtml(e.short)],
    ['Description', escapeHtml(e.description)],
    ['Analysis', escapeHtml(e.analysis)],
  ];
  if (e.mitre && e.mitre.length > 0) rows.push(['MITRE ATT&CK', escapeHtml(e.mitre.join(' · '))]);
  if (e.sigmaId) rows.push(['Sigma Rule', escapeHtml(e.sigmaId)]);
  if (e.kql) rows.push(['KQL', `<pre style="margin:0;white-space:pre-wrap;word-break:break-all;">${escapeHtml(e.kql)}</pre>`]);
  if (e.spl) rows.push(['SPL', `<pre style="margin:0;white-space:pre-wrap;word-break:break-all;">${escapeHtml(e.spl)}</pre>`]);
  if (e.threatHuntingNotes) rows.push(['Threat Hunting Notes', escapeHtml(e.threatHuntingNotes)]);
  if (e.relevantFields && e.relevantFields.length > 0) rows.push(['Relevant Fields', escapeHtml(e.relevantFields.join(' · '))]);
  if (e.detectionTips) rows.push(['Detection Tips', escapeHtml(e.detectionTips)]);
  if (e.relatedEventIds && e.relatedEventIds.length > 0) rows.push(['Related Event IDs', escapeHtml(e.relatedEventIds.join(' · '))]);
  if (e.related && e.related.length > 0) rows.push(['Related (legacy)', escapeHtml(e.related.join(' · '))]);
  if (e.sigma) rows.push(['Sigma YAML', `<pre style="margin:0;white-space:pre-wrap;word-break:break-all;">${escapeHtml(e.sigma)}</pre>`]);
  if (e.detection && e.detection.length > 0) {
    const detRows = e.detection.map((d) => `<div><strong>${escapeHtml(d.label)}:</strong> <code>${escapeHtml(d.cmd)}</code></div>`).join('');
    rows.push(['Detection Commands', detRows]);
  }
  const body = rows.map(([k, v]) => `<tr><td style="vertical-align:top;font-weight:bold;color:#888;padding:4px;white-space:nowrap;">${escapeHtml(k)}</td><td style="vertical-align:top;padding:4px;">${v}</td></tr>`).join('');
  return `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:monospace;font-size:11px;background:#0D0D0D;color:#DDD;"><tbody>${body}</tbody></table>`;
}

/* ============================================================= */
/* 1. SUBNETTING                                                  */
/* ============================================================= */
const SubnetTool: React.FC = () => {
  const [ip, setIp] = useState('192.168.1.10');
  const [cidr, setCidr] = useState('24');

  // AUDIT VN-009 / VN-010 / VN-011: strict validation + explicit /0, /31, /32
  // handling. Previously:
  //   - /0 produced mask=255.255.255.255 because JS treats `<< 32` as `<< 0`.
  //   - /31 produced 0 usable hosts + an inverted range (formula `2^h-2` is
  //     invalid per RFC 3021).
  //   - Non-numeric / out-of-range CIDR values were silently coerced by
  //     `Number()` and could produce NaN / arbitrary masks.
  // Now CIDR must be an integer in [0,32]; IP must be 4 octets each 0–255.
  // If validation fails, an `error` is returned and NO calculation runs.
  const result = useMemo<
    | { error: string }
    | {
        network: string;
        broadcast: string;
        first: string;
        last: string;
        hosts: string;
        wildcard: string;
        mask: string;
        cls: string;
        ipBin: string;
        maskBin: string;
        note?: string;
      }
  >(() => {
    // --- Validate IPv4 ----------------------------------------------------
    const ipTrim = String(ip).trim();
    const parts = ipTrim === '' ? [] : ipTrim.split('.').map((s) => Number(s));
    if (parts.length !== 4 || parts.some((p) => !Number.isFinite(p) || !Number.isInteger(p) || p < 0 || p > 255)) {
      return { error: 'IPv4 inválida. Formato esperado: A.B.C.D con cada octeto en 0–255.' };
    }

    // --- Validate CIDR ----------------------------------------------------
    const cidrTrim = String(cidr).trim();
    if (cidrTrim === '') return { error: 'CIDR vacío. Debe ser un entero entre 0 y 32.' };
    // Reject things like '24abc', '0x18', '3.5', 'NaN', 'Infinity', ''.
    if (!/^-?\d+$/.test(cidrTrim)) return { error: 'CIDR inválido. Debe ser un entero entre 0 y 32.' };
    const cidrNum = Number(cidrTrim);
    if (!Number.isInteger(cidrNum) || cidrNum < 0 || cidrNum > 32) {
      return { error: 'CIDR fuera de rango. Debe ser un entero entre 0 y 32.' };
    }

    // --- Calculate (now with strict, well-typed values) -------------------
    const ipNum = (parts[0] << 24 | parts[1] << 16 | parts[2] << 8 | parts[3]) >>> 0;

    // VN-009: cidr === 0 → mask must be 0 (JS would otherwise treat `<< 32`
    // as `<< 0` and return 0xFFFFFFFF, i.e. 255.255.255.255, which is wrong).
    const mask = cidrNum === 0 ? 0 : ((0xFFFFFFFF << (32 - cidrNum)) >>> 0);
    const network = (ipNum & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    const wildcard = (~mask >>> 0);

    // VN-010: explicit /31 (RFC 3021) and /32 (single host) cases.
    const toIp = (n: number) => [(n >>> 24) & 0xFF, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF].join('.');
    const cls = parts[0] <= 127 ? 'A' : parts[0] <= 191 ? 'B' : parts[0] <= 223 ? 'C' : parts[0] <= 239 ? 'D (Multicast)' : 'E (Reservada)';
    const toBin = (n: number) => [(n >>> 24) & 0xFF, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF].map((b) => b.toString(2).padStart(8, '0')).join('.');

    let totalHosts: number;
    let firstHost: number;
    let lastHost: number;
    let note: string | undefined;

    if (cidrNum === 32) {
      // /32 — single host: network == broadcast == host.
      totalHosts = 1;
      firstHost = network;
      lastHost = broadcast;
      note = '/32 — Dirección única (host route).';
    } else if (cidrNum === 31) {
      // RFC 3021 — /31 used for point-to-point links: both addresses usable.
      totalHosts = 2;
      firstHost = network;
      lastHost = broadcast;
      note = '/31 — Enlace point-to-point (RFC 3021).';
    } else if (cidrNum === 0) {
      // /0 — entire IPv4 unicast space.
      totalHosts = Math.pow(2, 32) - 2;
      firstHost = (network + 1) >>> 0;
      lastHost = (broadcast - 1) >>> 0;
      note = '/0 — Todo el espacio IPv4 (0.0.0.0 – 255.255.255.255).';
    } else {
      // Generic case: 2^hostBits - 2 usable hosts.
      const hostBits = 32 - cidrNum;
      totalHosts = Math.pow(2, hostBits) - 2;
      firstHost = (network + 1) >>> 0;
      lastHost = (broadcast - 1) >>> 0;
    }

    return {
      network: toIp(network),
      broadcast: toIp(broadcast),
      first: toIp(firstHost),
      last: toIp(lastHost),
      hosts: totalHosts.toLocaleString('es-ES'),
      wildcard: toIp(wildcard),
      mask: toIp(mask),
      cls,
      ipBin: toBin(ipNum),
      maskBin: toBin(mask),
      note,
    };
  }, [ip, cidr]);

  const isError = 'error' in result;
  const rows = !isError ? [
    ['Dirección de red', result.network],
    ['Broadcast', result.broadcast],
    ['Primer host', result.first],
    ['Último host', result.last],
    ['Hosts útiles', result.hosts],
    ['Máscara', result.mask + ' (/' + String(cidr).trim() + ')'],
    ['Wildcard', result.wildcard],
    ['Clase', result.cls],
  ] as [string, string][] : [];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Field label="Dirección IP"><input className={inputCls} value={ip} onChange={(e) => setIp(e.target.value)} placeholder="192.168.1.10" /></Field>
        <Field label="CIDR (/n)"><input className={inputCls + ' w-20'} value={cidr} onChange={(e) => setCidr(e.target.value)} type="number" min={0} max={32} step={1} inputMode="numeric" /></Field>
      </div>
      {isError ? (
        <div className="bg-red-950/40 border border-red-500/30 rounded-md p-3 text-xs text-red-300 flex items-start gap-2">
          <span className="text-red-400 font-bold">⚠</span>
          <span>{result.error}</span>
        </div>
      ) : (
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-3 space-y-1.5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between text-xs">
              <span className="text-[#888]">{k}</span>
              <span className="font-mono text-blue-300 flex items-center gap-1">{v}<CopyBtn text={v} /></span>
            </div>
          ))}
          {result.note && (
            <div className="pt-2 border-t border-[#262626]">
              <div className="text-[10px] text-amber-400 font-semibold">{result.note}</div>
            </div>
          )}
          <div className="pt-2 border-t border-[#262626] space-y-1">
            <div className="text-[10px] text-[#555] font-bold uppercase">Binario</div>
            <div className="text-[10px] font-mono text-green-400">IP:  {result.ipBin}</div>
            <div className="text-[10px] font-mono text-amber-400">Mask: {result.maskBin}</div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================= */
/* 2. PORTS AND SERVICES                                          */
/* ============================================================= */
import { PortInfo, PORTS } from '../data/portsData';

interface PortsToolProps {
  /** When set, auto-opens the port detail modal for this port number. */
  autoOpenId?: string | number;
  /** Called after the deep-link has been applied (so the parent can clear it). */
  onAutoOpenConsumed?: () => void;
}

const PortsTool: React.FC<PortsToolProps> = ({ autoOpenId, onAutoOpenConsumed }) => {
  // Compute the initial match on mount so the modal opens immediately when the
  // user lands on this tool via deep-link (no extra render needed).
  const initialMatch = (autoOpenId !== undefined && autoOpenId !== null && autoOpenId !== '')
    ? PORTS.find((p) => String(p.port) === String(autoOpenId))
    : undefined;
  const [q, setQ] = useState(initialMatch ? String(autoOpenId) : '');
  const [selected, setSelected] = useState<PortInfo | null>(initialMatch || null);

  // Deep-link follow-up: when the incoming `autoOpenId` prop CHANGES after mount,
  // adjust local state during render (React 19 "you might not need an effect").
  const [prevAutoOpen, setPrevAutoOpen] = useState<string | number | undefined>(autoOpenId);
  if (autoOpenId !== prevAutoOpen) {
    setPrevAutoOpen(autoOpenId);
    if (autoOpenId !== undefined && autoOpenId !== null && autoOpenId !== '') {
      const match = PORTS.find((p) => String(p.port) === String(autoOpenId));
      if (match) {
        setSelected(match);
        setQ(String(autoOpenId));
      }
    } else {
      // deep-link cleared — keep current selection
    }
  }

  // Notify parent (side-effect only, no setState — lint-safe).
  React.useEffect(() => {
    if (autoOpenId !== undefined && autoOpenId !== null && autoOpenId !== '') {
      onAutoOpenConsumed?.();
    }
  }, [autoOpenId, onAutoOpenConsumed]);


  const filtered = useMemo(() => {
    if (!q.trim()) return PORTS;
    const t = q.toLowerCase();
    return PORTS.filter((p) =>
      String(p.port).includes(t) ||
      p.service.toLowerCase().includes(t) ||
      p.short.toLowerCase().includes(t) ||
      p.category.toLowerCase().includes(t)
    );
  }, [q]);

  return (
    <div className="space-y-3">
      <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por puerto, servicio o categoría..." />
      <div className="text-[10px] text-[#555]">{filtered.length} puertos listados (más comunes en ciberseguridad). Click para ver detalle.</div>
      <div className="space-y-1 max-h-[480px] overflow-y-auto">
        {filtered.map((p) => (
          <button
            key={`${p.port}-${p.proto}`}
            onClick={() => setSelected(p)}
            className="w-full text-left bg-[#0D0D0D] border border-[#262626] rounded p-2.5 flex items-start gap-3 hover:border-blue-500/40 hover:bg-[#161616] transition-colors cursor-pointer"
          >
            <span className="font-mono font-bold text-sm text-blue-400 shrink-0 w-12">{p.port}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-white">{p.service}</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${p.proto.includes('TCP') ? 'bg-blue-500/15 text-blue-300' : 'bg-purple-500/15 text-purple-300'}`}>{p.proto}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161616] text-[#666]">{p.category}</span>
              </div>
              <div className="text-[10px] text-[#888] mt-0.5 truncate">{p.short}</div>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <DetailModal
          title={
            <span className="flex items-center gap-2">
              <span className="font-mono text-blue-400">{selected.port}</span>
              <span className="text-white">/</span>
              <span className="font-mono text-purple-300">{selected.proto}</span>
              <span className="text-white">— {selected.service}</span>
            </span>
          }
          onClose={() => setSelected(null)}
        >
          <DetailSection icon={<BookOpen className="w-3 h-3" />} title="Descripción">
            {selected.description}
          </DetailSection>
          <DetailSection icon={<Shield className="w-3 h-3" />} title="Seguridad y Riesgos">
            {selected.security}
          </DetailSection>
          <DetailSection icon={<Lock className="w-3 h-3" />} title="Cómo ponerlo seguro (hardening)">
            {selected.secure}
          </DetailSection>
          <DetailSection icon={<Terminal className="w-3 h-3" />} title="Cómo detectarlo">
            <div className="space-y-1.5">
              {selected.detection.map((d) => (
                <div key={d.label} className="space-y-0.5">
                  <div className="text-[10px] text-[#888]">{d.label}</div>
                  <CodeBlock code={d.cmd} lang="bash" />
                </div>
              ))}
            </div>
          </DetailSection>
          {selected.cve && (
            <DetailSection icon={<Shield className="w-3 h-3" />} title="CVE relevante">
              {selected.cve}
            </DetailSection>
          )}
        </DetailModal>
      )}
    </div>
  );
};

/* ============================================================= */
/* 3. JWT DECODER                                                */
/* ============================================================= */
const JwtTool: React.FC = () => {
  const [token, setToken] = useState('');
  const [decoded, setDecoded] = useState<{ header?: string; payload?: string; error?: string }>({});

  // AUDIT VN-004: decode Base64URL → bytes → UTF-8 → JSON. The previous
  // implementation used `atob(s.replace(/-/g,'+').replace(/_/g,'/'))` and
  // passed the resulting binary string directly to `JSON.parse`. atob()
  // returns a binary string where each char is a byte 0–255; when those
  // bytes form a UTF-8 multibyte sequence (á, 🌎, 中, etc.), JS interprets
  // them as Latin-1 code points and JSON.parse fails or returns garbage.
  // Now: atob → Uint8Array → TextDecoder('utf-8') → JSON.parse.
  // Also: Base64URL strings may lack '=' padding; we add it before atob().
  const decode = useCallback(() => {
    try {
      const trimmed = token.trim();
      const parts = trimmed.split('.');
      if (parts.length < 2) throw new Error('JWT inválido (se esperaban al menos 2 segmentos separados por ".")');
      const dec = (s: string) => {
        // Base64URL → Base64
        let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
        // Pad to a multiple of 4 (Base64 requires it; atob would throw otherwise).
        const rem = b64.length % 4;
        if (rem === 2) b64 += '==';
        else if (rem === 3) b64 += '=';
        else if (rem === 1) throw new Error('Base64URL malformado (longitud inválida)');
        // atob → binary string → Uint8Array (one byte per char).
        const binStr = atob(b64);
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
        // Decode UTF-8 bytes to a JS string (correct for á / 🌎 / 中 / etc.).
        const jsonStr = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        // Parse + pretty-print.
        return JSON.stringify(JSON.parse(jsonStr), null, 2);
      };
      setDecoded({ header: dec(parts[0]), payload: dec(parts[1]) });
    } catch (e) { setDecoded({ error: 'Token inválido: ' + (e as Error).message }); }
  }, [token]);

  return (
    <div className="space-y-3">
      <Field label="JWT Token"><textarea className={taCls} value={token} onChange={(e) => setToken(e.target.value)} placeholder="eyJhbGciOi..." /></Field>
      <button onClick={decode} className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer">Decodificar</button>
      {decoded.error ? <p className="text-xs text-red-400">{decoded.error}</p> : decoded.header && (
        <div className="space-y-2">
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-2.5">
            <div className="text-[10px] font-bold uppercase text-blue-400 mb-1">Header</div>
            <pre className="text-[10px] font-mono text-green-300 whitespace-pre-wrap break-all">{decoded.header}</pre>
          </div>
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-2.5">
            <div className="text-[10px] font-bold uppercase text-blue-400 mb-1">Payload</div>
            <pre className="text-[10px] font-mono text-amber-300 whitespace-pre-wrap break-all">{decoded.payload}</pre>
          </div>
          <p className="text-[10px] text-[#555]">Recuerda: el signature no se valida aquí. Un JWT decodificado no es prueba de autenticidad.</p>
        </div>
      )}
    </div>
  );
};

/* ============================================================= */
/* 4. BASE CONVERTER (FIXED — input always visible, separate fields per base) */
/* ============================================================= */
const BaseTool: React.FC = () => {
  const [decimal, setDecimal] = useState('255');
  const [hex, setHex] = useState('FF');
  const [octal, setOctal] = useState('377');
  const [binary, setBinary] = useState('11111111');
  const [error, setError] = useState('');

  // Convert from any base, update all other fields reactively.
  const updateFrom = (value: string, fromBase: 10 | 16 | 8 | 2, setters: { dec: (v: string) => void; hex: (v: string) => void; oct: (v: string) => void; bin: (v: string) => void; }) => {
    const clean = value.trim();
    if (clean === '') {
      setters.dec(''); setters.hex(''); setters.oct(''); setters.bin('');
      setError('');
      return;
    }
    let n: number;
    try {
      // Validate characters for the source base before parsing.
      const validChars: Record<number, RegExp> = {
        10: /^[0-9]+$/,
        16: /^[0-9a-fA-F]+$/,
        8: /^[0-7]+$/,
        2: /^[01]+$/,
      };
      if (!validChars[fromBase].test(clean)) {
        throw new Error(`Caracteres inválidos para base ${fromBase}`);
      }
      n = parseInt(clean, fromBase);
      if (isNaN(n)) throw new Error('Número inválido');
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setError('');
    const newVal = {
      dec: n.toString(10),
      hex: n.toString(16).toUpperCase(),
      oct: n.toString(8),
      bin: n.toString(2),
    };
    setters.dec(newVal.dec);
    setters.hex(newVal.hex);
    setters.oct(newVal.oct);
    setters.bin(newVal.bin);
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-[#888]">Escribe en cualquier campo y los demás se actualizan en tiempo real. Cada campo muestra lo que escribes (con color claro, fuente monoespaciada).</p>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded px-3 py-2 text-xs text-red-400">{error}</div>
      )}
      <Field label="Decimal (base 10)">
        <input
          className={inputCls + ' text-white text-sm'}
          value={decimal}
          onChange={(e) => {
            setDecimal(e.target.value);
            updateFrom(e.target.value, 10, { dec: setDecimal, hex: setHex, oct: setOctal, bin: setBinary });
          }}
          placeholder="255"
          spellCheck={false}
          autoComplete="off"
        />
      </Field>
      <Field label="Hexadecimal (base 16)">
        <input
          className={inputCls + ' text-white text-sm'}
          value={hex}
          onChange={(e) => {
            setHex(e.target.value);
            updateFrom(e.target.value, 16, { dec: setDecimal, hex: setHex, oct: setOctal, bin: setBinary });
          }}
          placeholder="FF"
          spellCheck={false}
          autoComplete="off"
        />
      </Field>
      <Field label="Octal (base 8)">
        <input
          className={inputCls + ' text-white text-sm'}
          value={octal}
          onChange={(e) => {
            setOctal(e.target.value);
            updateFrom(e.target.value, 8, { dec: setDecimal, hex: setHex, oct: setOctal, bin: setBinary });
          }}
          placeholder="377"
          spellCheck={false}
          autoComplete="off"
        />
      </Field>
      <Field label="Binario (base 2)">
        <input
          className={inputCls + ' text-white text-sm'}
          value={binary}
          onChange={(e) => {
            setBinary(e.target.value);
            updateFrom(e.target.value, 2, { dec: setDecimal, hex: setHex, oct: setOctal, bin: setBinary });
          }}
          placeholder="11111111"
          spellCheck={false}
          autoComplete="off"
        />
      </Field>
      {decimal && !error && (
        <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-1">
          <div className="text-[10px] text-[#555] font-bold uppercase">Resumen</div>
          <div className="flex items-center justify-between text-xs"><span className="text-[#888]">Decimal</span><span className="font-mono text-blue-300 flex items-center gap-1">{decimal}<CopyBtn text={decimal} /></span></div>
          <div className="flex items-center justify-between text-xs"><span className="text-[#888]">Hex</span><span className="font-mono text-green-300 flex items-center gap-1">0x{hex}<CopyBtn text={'0x' + hex} /></span></div>
          <div className="flex items-center justify-between text-xs"><span className="text-[#888]">Octal</span><span className="font-mono text-amber-300 flex items-center gap-1">0{octal}<CopyBtn text={'0' + octal} /></span></div>
          <div className="flex items-center justify-between text-xs"><span className="text-[#888]">Binario</span><span className="font-mono text-purple-300 flex items-center gap-1">{binary}<CopyBtn text={binary} /></span></div>
        </div>
      )}
    </div>
  );
};

/* ============================================================= */
/* 5. HTTP STATUS CODES (with detailed modal)                    */
/*    Data lives in ../data/httpStatusData.ts                   */
/* ============================================================= */


interface HttpToolProps {
  /** When set, auto-opens the HTTP status detail modal for this code. */
  autoOpenId?: string | number;
  /** Called after the deep-link has been applied (so the parent can clear it). */
  onAutoOpenConsumed?: () => void;
}

const HttpTool: React.FC<HttpToolProps> = ({ autoOpenId, onAutoOpenConsumed }) => {
  // Compute the initial match on mount so the modal opens immediately.
  const initialMatch = (autoOpenId !== undefined && autoOpenId !== null && autoOpenId !== '')
    ? HTTP_STATUSES.find((s) => String(s.code) === String(autoOpenId))
    : undefined;
  const [q, setQ] = useState(initialMatch ? String(autoOpenId) : '');
  const [selected, setSelected] = useState<HttpStatusInfo | null>(initialMatch || null);

  // Deep-link follow-up: render-time state adjustment when autoOpenId changes.
  const [prevAutoOpen, setPrevAutoOpen] = useState<string | number | undefined>(autoOpenId);
  if (autoOpenId !== prevAutoOpen) {
    setPrevAutoOpen(autoOpenId);
    if (autoOpenId !== undefined && autoOpenId !== null && autoOpenId !== '') {
      const match = HTTP_STATUSES.find((s) => String(s.code) === String(autoOpenId));
      if (match) {
        setSelected(match);
        setQ(String(autoOpenId));
      }
    }
  }

  // Notify parent (side-effect only).
  React.useEffect(() => {
    if (autoOpenId !== undefined && autoOpenId !== null && autoOpenId !== '') {
      onAutoOpenConsumed?.();
    }
  }, [autoOpenId, onAutoOpenConsumed]);


  const filtered = useMemo(() => {
    if (!q.trim()) return HTTP_STATUSES;
    const t = q.toLowerCase();
    return HTTP_STATUSES.filter((s) => String(s.code).includes(t) || s.name.toLowerCase().includes(t) || s.short.toLowerCase().includes(t));
  }, [q]);

  const catColor = (cat: string) => cat === '2xx' ? 'text-green-400' : cat === '3xx' ? 'text-amber-400' : cat === '4xx' ? 'text-orange-400' : 'text-red-400';

  return (
    <div className="space-y-3">
      <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código o nombre..." />
      <div className="space-y-1 max-h-[480px] overflow-y-auto">
        {filtered.map((s) => (
          <button
            key={s.code}
            onClick={() => setSelected(s)}
            className="w-full text-left bg-[#0D0D0D] border border-[#262626] rounded p-2 flex items-start gap-2 hover:border-blue-500/40 hover:bg-[#161616] transition-colors cursor-pointer"
          >
            <span className={`font-mono font-bold text-sm shrink-0 ${catColor(s.cat)}`}>{s.code}</span>
            <div>
              <div className="text-xs font-semibold text-white">{s.name}</div>
              <div className="text-[10px] text-[#888]">{s.short}</div>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <DetailModal
          title={
            <span className="flex items-center gap-2">
              <span className={`font-mono font-bold ${catColor(selected.cat)}`}>{selected.code}</span>
              <span className="text-white">{selected.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#161616] text-[#666] uppercase">{selected.cat}</span>
            </span>
          }
          onClose={() => setSelected(null)}
        >
          <DetailSection icon={<BookOpen className="w-3 h-3" />} title="Descripción">
            {selected.description}
          </DetailSection>
          <DetailSection icon={<Lightbulb className="w-3 h-3" />} title="Causas comunes">
            <ul className="list-disc list-inside space-y-1">
              {selected.causes.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </DetailSection>
          <DetailSection icon={<Terminal className="w-3 h-3" />} title="Cómo diagnosticarlo">
            <ul className="list-decimal list-inside space-y-1">
              {selected.troubleshooting.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </DetailSection>
          <DetailSection icon={<Shield className="w-3 h-3" />} title="Implicaciones de seguridad">
            {selected.security}
          </DetailSection>
          {selected.example && (
            <DetailSection icon={<Code className="w-3 h-3" />} title="Ejemplo de respuesta">
              <CodeBlock code={selected.example} lang="http" />
            </DetailSection>
          )}
        </DetailModal>
      )}
    </div>
  );
};

/* ============================================================= */
/* 6. WINDOWS EVENT IDs (with detailed modal + detection)        */
/* ============================================================= */

interface WinEventToolProps {
  /** When set, auto-opens the Windows Event detail modal for this event ID. */
  autoOpenId?: string | number;
  /** Called after the deep-link has been applied (so the parent can clear it). */
  onAutoOpenConsumed?: () => void;
}

const WinEventTool: React.FC<WinEventToolProps> = ({ autoOpenId, onAutoOpenConsumed }) => {
  // Compute the initial match on mount so the modal opens immediately.
  const initialMatch = (autoOpenId !== undefined && autoOpenId !== null && autoOpenId !== '')
    ? WIN_EVENTS.find((e) => String(e.id) === String(autoOpenId))
    : undefined;
  const [q, setQ] = useState(initialMatch ? String(autoOpenId) : '');
  const [selected, setSelected] = useState<WinEventInfo | null>(initialMatch || null);
  // BLOQUE 3 — category filter (8 SOC categories derived via getWinEventCategory).
  const [category, setCategory] = useState<WinEventCategory | null>(null);
  // BLOQUE 3 — toast for "Added to Note" feedback (auto-dismiss after 2.5s).
  const [addedToast, setAddedToast] = useState(false);

  // Deep-link follow-up: render-time state adjustment when autoOpenId changes.
  const [prevAutoOpen, setPrevAutoOpen] = useState<string | number | undefined>(autoOpenId);
  if (autoOpenId !== prevAutoOpen) {
    setPrevAutoOpen(autoOpenId);
    if (autoOpenId !== undefined && autoOpenId !== null && autoOpenId !== '') {
      const match = WIN_EVENTS.find((e) => String(e.id) === String(autoOpenId));
      if (match) {
        setSelected(match);
        setQ(String(autoOpenId));
      }
    }
  }

  // Notify parent (side-effect only).
  React.useEffect(() => {
    if (autoOpenId !== undefined && autoOpenId !== null && autoOpenId !== '') {
      onAutoOpenConsumed?.();
    }
  }, [autoOpenId, onAutoOpenConsumed]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return WIN_EVENTS.filter((e) => {
      // Text filter (id, name, short)
      if (t && !String(e.id).includes(t) && !e.name.toLowerCase().includes(t) && !e.short.toLowerCase().includes(t)) {
        return false;
      }
      // Category filter (derived from event id)
      if (category && getWinEventCategory(e.id) !== category) {
        return false;
      }
      return true;
    });
  }, [q, category]);

  // Cross-tool navigation helper — fire and forget via zustand store.
  const goToTool = (toolId: string, entryId?: string | number) => {
    usePendingToolStore.getState().setPending({ toolId, entryId });
    setSelected(null);
  };

  // Add the current event as a new note — HTML-escaped table via buildWinEventHtmlTable.
  const addToNote = () => {
    if (!selected) return;
    useNoteStore.getState().enqueueNote('Windows Event ' + selected.id + ' — ' + selected.name, buildWinEventHtmlTable(selected));
    setAddedToast(true);
    window.setTimeout(() => setAddedToast(false), 2500);
  };

  // BLOQUE 5 — Related Knowledge panel (spec #13). Live-query Dexie for
  // notes that mention the selected Event ID (e.g. "4624" appears inside
  // the note's contentHtml). Capped at 3 matches. Deps = selected?.id so
  // the query re-subscribes every time the user opens a different event.
  const selectedEventId = selected?.id;
  const relatedNotes = useLiveQuery(
    async () => {
      if (selectedEventId === undefined) return [];
      const idStr = String(selectedEventId);
      const matches = await db.notes
        .filter((n) => !n.isDeleted && (n.contentHtml || '').includes(idStr))
        .toArray();
      // Sort by most recently updated and take the top 3.
      return matches
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 3)
        .map((n) => ({ id: n.id, title: n.title }));
    },
    [selectedEventId],
    [] as { id: string; title: string }[]
  ) ?? [];

  // Derived cross-links — pure functions, safe to compute inline.
  const relatedMitreEntries = useMemo(() => {
    if (!selected?.mitre) return [];
    return selected.mitre
      .map((m) => ({ id: m, entry: findMitreById(m) }))
      .filter((x) => x.entry);
  }, [selected]);
  const relatedSigmaRules = useMemo(() => {
    if (!selected) return [];
    return findSigmaByEventId(selected.id);
  }, [selected]);
  const relatedEventEntries = useMemo(() => {
    if (!selected) return [] as { id: number; entry: WinEventInfo }[];
    // Prefer the clean numeric array. Fall back to parsing the leading
    // integer from each legacy `related` string ("4634 (Logoff)" → 4634).
    const idsRaw: number[] = [];
    if (selected.relatedEventIds && selected.relatedEventIds.length > 0) {
      idsRaw.push(...selected.relatedEventIds);
    } else if (selected.related && selected.related.length > 0) {
      for (const s of selected.related) {
        const m = String(s).match(/^\s*(\d+)/);
        if (m) idsRaw.push(Number(m[1]));
      }
    }
    // De-dup (Set preserves first-seen order) + look up in WIN_EVENTS.
    const unique = Array.from(new Set(idsRaw));
    return unique
      .map((id) => ({ id, entry: WIN_EVENTS.find((e) => e.id === id) }))
      .filter((x): x is { id: number; entry: WinEventInfo } => Boolean(x.entry));
  }, [selected]);

  // Track whether the panel has at least one category to show. We only
  // render the panel if any of the categories is non-empty (so we don't
  // add an empty box at the bottom of every event detail).
  const hasRelatedKnowledge =
    relatedMitreEntries.length > 0 ||
    relatedSigmaRules.length > 0 ||
    relatedEventEntries.length > 0 ||
    relatedNotes.length > 0;

  return (
    <div className="space-y-3">
      <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar Event ID o nombre..." />

      {/* Category filter chips — 8 SOC categories + "Todas" */}
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${category === null ? 'bg-blue-500 text-white border-blue-500' : 'bg-[#161616] border-[#262626] text-[#888] hover:text-white hover:border-blue-500/40'}`}
        >Todas</button>
        {WIN_EVENT_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(category === c ? null : c)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${category === c ? 'bg-blue-500 text-white border-blue-500' : 'bg-[#161616] border-[#262626] text-[#888] hover:text-white hover:border-blue-500/40'}`}
          >{c}</button>
        ))}
      </div>

      <div className="text-[10px] text-[#555]">{filtered.length} eventos. Click para ver explicación a fondo + cómo detectarlo.</div>
      <div className="space-y-1 max-h-[480px] overflow-y-auto">
        {filtered.map((e) => (
          <button
            key={e.id}
            onClick={() => setSelected(e)}
            className="w-full text-left bg-[#0D0D0D] border border-[#262626] rounded p-2 flex items-start gap-2 hover:border-blue-500/40 hover:bg-[#161616] transition-colors cursor-pointer"
          >
            <span className="font-mono font-bold text-sm text-blue-400 shrink-0">{e.id}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-white">{e.name}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161616] text-[#666]">{e.log}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161616] border border-[#262626] text-blue-300/70">{getWinEventCategory(e.id)}</span>
              </div>
              <div className="text-[10px] text-[#888] mt-0.5 truncate">{e.short}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Toast feedback for Add to Note */}
      {addedToast && (
        <div className="px-3 py-2 rounded border border-green-500/30 bg-green-500/5 text-green-300 text-[11px]">
          Añadido a Notas — crea una nota nueva para verlo.
        </div>
      )}

      {selected && (
        <DetailModal
          title={
            <span className="flex items-center gap-2">
              <span className="font-mono font-bold text-blue-400">{selected.id}</span>
              <span className="text-white">{selected.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#161616] text-[#666]">{selected.log}</span>
            </span>
          }
          onClose={() => setSelected(null)}
        >
          <DetailSection icon={<BookOpen className="w-3 h-3" />} title="Descripción a fondo">
            {selected.description}
          </DetailSection>
          <DetailSection icon={<Terminal className="w-3 h-3" />} title="Cómo detectarlo (comandos)">
            <div className="space-y-1.5">
              {selected.detection.map((d) => (
                <div key={d.label} className="space-y-0.5">
                  <div className="text-[10px] text-[#888]">{d.label}</div>
                  <CodeBlock code={d.cmd} lang="ps" />
                </div>
              ))}
            </div>
          </DetailSection>
          {selected.sigma && (
            <DetailSection icon={<Shield className="w-3 h-3" />} title="Regla Sigma (para tu SIEM)">
              <CodeBlock code={selected.sigma} lang="yaml" />
            </DetailSection>
          )}
          <DetailSection icon={<Lightbulb className="w-3 h-3" />} title="Análisis — cómo usarlo para cazar">
            {selected.analysis}
          </DetailSection>

          {/* ─── BLOQUE 3 — MITRE ATT&CK cross-link ─── */}
          {selected.mitre && selected.mitre.length > 0 && (
            <DetailSection icon={<Crosshair className="w-3 h-3" />} title="MITRE ATT&CK (click para abrir)">
              <div className="flex flex-wrap gap-1.5">
                {selected.mitre.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => goToTool('mitre', m)}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 cursor-pointer"
                  >{m}</button>
                ))}
              </div>
            </DetailSection>
          )}

          {/* ─── BLOQUE 3 — Sigma rule cross-link ─── */}
          {selected.sigmaId && (
            <DetailSection icon={<BookMarked className="w-3 h-3" />} title="Regla Sigma relacionada">
              <button
                type="button"
                onClick={() => goToTool('sigma', selected.sigmaId)}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 cursor-pointer"
              >{selected.sigmaId} → Abrir en Sigma Explorer</button>
            </DetailSection>
          )}

          {/* ─── BLOQUE 3 — KQL / SPL ─── */}
          {selected.kql && (
            <DetailSection icon={<Braces className="w-3 h-3" />} title="KQL (Microsoft Sentinel)">
              <CodeBlock code={selected.kql} lang="kql" />
            </DetailSection>
          )}
          {selected.spl && (
            <DetailSection icon={<Braces className="w-3 h-3" />} title="SPL (Splunk)">
              <CodeBlock code={selected.spl} lang="spl" />
            </DetailSection>
          )}

          {/* ─── BLOQUE 3 — Threat Hunting Notes ─── */}
          {selected.threatHuntingNotes && (
            <DetailSection icon={<Lightbulb className="w-3 h-3" />} title="Threat Hunting — cómo cazarlo en SIEM">
              {selected.threatHuntingNotes}
            </DetailSection>
          )}

          {/* ─── BLOQUE 3 — Relevant Fields ─── */}
          {selected.relevantFields && selected.relevantFields.length > 0 && (
            <DetailSection icon={<Terminal className="w-3 h-3" />} title="Campos relevantes para SIEM">
              <div className="flex flex-wrap gap-1.5">
                {selected.relevantFields.map((f) => (
                  <code key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-[#161616] border border-[#262626] text-green-300">{f}</code>
                ))}
              </div>
            </DetailSection>
          )}

          {/* ─── BLOQUE 3 — Detection Tips ─── */}
          {selected.detectionTips && (
            <DetailSection icon={<Lightbulb className="w-3 h-3" />} title="Consejos de detección / falsos positivos">
              {selected.detectionTips}
            </DetailSection>
          )}

          {/* ─── BLOQUE 3 — Related Event IDs (clickable cross-link) ─── */}
          {selected.relatedEventIds && selected.relatedEventIds.length > 0 && (
            <DetailSection icon={<Network className="w-3 h-3" />} title="Event IDs relacionados (click para abrir)">
              <div className="flex flex-wrap gap-1.5">
                {selected.relatedEventIds.map((rid) => {
                  const match = WIN_EVENTS.find((e) => e.id === rid);
                  return (
                    <button
                      key={rid}
                      type="button"
                      onClick={() => { if (match) { setSelected(match); setQ(String(rid)); } }}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#161616] border border-[#262626] text-blue-300 hover:border-blue-500/40 hover:bg-[#222] cursor-pointer"
                    >{rid}{match ? ` · ${match.name}` : ''}</button>
                  );
                })}
              </div>
            </DetailSection>
          )}

          <DetailSection icon={<Network className="w-3 h-3" />} title="Eventos relacionados">
            <div className="text-[#BBB]">{selected.related.join(' · ')}</div>
          </DetailSection>

          {/* ─── BLOQUE 3 — Cross-tool action buttons row ─── */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-[#262626]">
            {selected.mitre && selected.mitre.length > 0 && (
              <button
                type="button"
                onClick={() => goToTool('mitre', selected.mitre![0])}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-[#161616] hover:bg-[#222] border border-[#262626] text-[#DDD] transition-colors cursor-pointer inline-flex items-center gap-1.5"
              ><Crosshair className="w-3 h-3" /> Open MITRE</button>
            )}
            {selected.sigmaId && (
              <button
                type="button"
                onClick={() => goToTool('sigma', selected.sigmaId)}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-[#161616] hover:bg-[#222] border border-[#262626] text-[#DDD] transition-colors cursor-pointer inline-flex items-center gap-1.5"
              ><BookMarked className="w-3 h-3" /> Open Sigma</button>
            )}
            <button
              type="button"
              onClick={() => goToTool('detection-query')}
              className="px-3 py-1.5 rounded text-xs font-semibold bg-[#161616] hover:bg-[#222] border border-[#262626] text-[#DDD] transition-colors cursor-pointer inline-flex items-center gap-1.5"
            ><Braces className="w-3 h-3" /> Open Detection Query</button>
            <button
              type="button"
              onClick={addToNote}
              className="px-3 py-1.5 rounded text-xs font-semibold bg-[#161616] hover:bg-[#222] border border-[#262626] text-[#DDD] transition-colors cursor-pointer inline-flex items-center gap-1.5"
            ><BookOpen className="w-3 h-3" /> Add to Note</button>
          </div>

          {/* ─── BLOQUE 5 — Related Knowledge panel (spec #13) ───
              One consolidated block at the bottom of the detail view.
              Only shown when at least one category is non-empty. Each
              subheader uses the same style as DetailSection but inside a
              single bordered block. Clickable chips deep-link to the
              corresponding tool via goToTool(). */}
          {hasRelatedKnowledge && (
            <div className="border border-[#262626] rounded p-3 mt-2 space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#555] font-bold">
                <BookOpen className="w-3 h-3" />
                Related Knowledge
              </div>

              {/* MITRE */}
              {relatedMitreEntries.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-widest text-[#555]">MITRE</div>
                  <div className="flex flex-wrap gap-1.5">
                    {relatedMitreEntries.map((m) => (
                      <button
                        key={`rel-mitre-${m.id}`}
                        type="button"
                        onClick={() => goToTool('mitre', m.id)}
                        title={m.entry?.description || m.id}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 hover:border-blue-500/50 cursor-pointer transition-colors"
                      >
                        <span className="font-bold">{m.id}</span>
                        {m.entry ? <span className="text-[#888] ml-1">· {m.entry.name}</span> : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sigma */}
              {relatedSigmaRules.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-widest text-[#555]">Sigma</div>
                  <div className="flex flex-col gap-1.5">
                    {relatedSigmaRules.map((rule) => (
                      <button
                        key={`rel-sigma-${rule.id}`}
                        type="button"
                        onClick={() => goToTool('sigma', rule.id)}
                        title={rule.description}
                        className="text-left px-2 py-1 rounded text-[10px] font-mono bg-[#161616] border border-[#262626] text-blue-300 hover:bg-[#222] hover:border-blue-500/40 cursor-pointer transition-colors flex items-center gap-1.5"
                      >
                        <BookMarked className="w-3 h-3 shrink-0" />
                        <span className="font-bold text-white">{rule.title}</span>
                        <span className="text-[#666]">— {rule.id}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Event IDs */}
              {relatedEventEntries.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-widest text-[#555]">Related Event IDs</div>
                  <div className="flex flex-wrap gap-1.5">
                    {relatedEventEntries.map((r) => (
                      <button
                        key={`rel-evt-${r.id}`}
                        type="button"
                        onClick={() => goToTool('winevent', r.id)}
                        title={r.entry?.name || String(r.id)}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#161616] border border-[#262626] text-blue-300 hover:bg-[#222] hover:border-blue-500/40 cursor-pointer transition-colors"
                      >
                        <span className="font-bold">{r.id}</span>
                        {r.entry ? <span className="text-[#888] ml-1">· {r.entry.name}</span> : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes — local content that mentions this Event ID */}
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-widest text-[#555]">Notes</div>
                {relatedNotes.length === 0 ? (
                  <p className="text-[10px] text-[#666] leading-relaxed">
                    Sin apuntes que mencionen <code className="font-mono text-blue-300">Event {selected.id}</code> todavía.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {relatedNotes.map((n) => (
                      <div
                        key={`rel-note-${n.id}`}
                        className="text-[10px] text-[#BBB] flex items-center gap-1.5"
                        title={n.title}
                      >
                        <FileText className="w-3 h-3 text-blue-400 shrink-0" />
                        <span className="truncate">{n.title}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-[#555] leading-relaxed pt-1">
                      Found {relatedNotes.length} note{relatedNotes.length === 1 ? '' : 's'} mentioning Event {selected.id}. Usa <kbd className="font-mono px-1 py-0.5 rounded bg-[#161616] border border-[#262626] text-[#888] text-[9px]">Ctrl+K</kbd> para abrir el buscador global y saltar al apunte.
                    </p>
                  </div>
                )}
              </div>

              {/* Detection Query Helper — single button (always available) */}
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-widest text-[#555]">Detection Query</div>
                <button
                  type="button"
                  onClick={() => goToTool('detection-query')}
                  className="px-2.5 py-1 rounded text-[10px] font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 hover:border-blue-500/50 cursor-pointer transition-colors inline-flex items-center gap-1.5"
                >
                  <Braces className="w-3 h-3" />
                  Open Detection Query Helper
                </button>
              </div>
            </div>
          )}
        </DetailModal>
      )}
    </div>
  );
};

/* ============================================================= */
/* 7. IoC EXTRACTOR — moved to IocExtractorView.tsx              */
/* (full SOC/IAM pipeline: refang, validate, dedup, context,     */
/*  scoring, enrichment links, KQL/SPL/STIX/CSV/JSON export,      */
/*  defang toggle, secret detection, editable whitelist)         */
/* ============================================================= */
import { IocExtractorView } from './IocExtractorView';

/* ============================================================= */
/* 8. CRON PARSER (with guide)                                   */
/* ============================================================= */
interface CronToolProps {
  /** When set, loads this cron expression into the parser (deep-link). */
  autoOpenId?: string | number;
  /** Called after the deep-link has been applied (so the parent can clear it). */
  onAutoOpenConsumed?: () => void;
}

const CronTool: React.FC<CronToolProps> = ({ autoOpenId, onAutoOpenConsumed }) => {
  // Initialize expr from the deep-link if provided on mount.
  const [expr, setExpr] = useState(
    (autoOpenId !== undefined && autoOpenId !== null && autoOpenId !== '')
      ? String(autoOpenId)
      : '0 9 * * 1-5'
  );
  const [showGuide, setShowGuide] = useState(true);

  // Deep-link follow-up: render-time state adjustment — load the cron expression
  // from the incoming prop the moment it changes.
  const [prevAutoOpen, setPrevAutoOpen] = useState<string | number | undefined>(autoOpenId);
  if (autoOpenId !== prevAutoOpen) {
    setPrevAutoOpen(autoOpenId);
    if (autoOpenId !== undefined && autoOpenId !== null && autoOpenId !== '') {
      setExpr(String(autoOpenId));
    }
  }

  // Notify parent (side-effect only).
  React.useEffect(() => {
    if (autoOpenId !== undefined && autoOpenId !== null && autoOpenId !== '') {
      onAutoOpenConsumed?.();
    }
  }, [autoOpenId, onAutoOpenConsumed]);


  const parsed = useMemo(() => {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) return { error: 'Debe tener 5 campos: minuto hora día-del-mes mes día-de-la-semana', lines: [] as string[] };

    const [m, h, dom, mon, dow] = parts;
    const lines: string[] = [];

    const describeField = (val: string, field: string) => {
      if (val === '*') return `Cada ${field}`;
      if (val.startsWith('*/')) return `Cada ${val.slice(2)} ${field}s`;
      if (val.includes('*/')) return `Cada ${val.split('*/')[1]} ${field}s desde ${val.split('*/')[0]}`;
      if (val.includes(',')) return `${val} (varios: ${val.split(',').join(', ')})`;
      if (val.includes('-')) return `Rango ${val} (${field}s)`;
      return `Valor exacto: ${val}`;
    };

    lines.push(`Minuto (0-59): ${describeField(m, 'minuto')}`);
    lines.push(`Hora (0-23): ${describeField(h, 'hora')}`);
    lines.push(`Día del mes (1-31): ${describeField(dom, 'día del mes')}`);
    lines.push(`Mes (1-12 o JAN-DEC): ${describeField(mon, 'mes')}`);
    lines.push(`Día de la semana (0-7 o SUN-SAT, 0=domingo): ${describeField(dow, 'día de la semana')}`);

    // Try to describe the next run approximately
    if (m === '*' && h === '*' && dom === '*' && mon === '*' && dow === '*') {
      lines.push('→ Cada minuto (¡peligroso en producción!)');
    } else if (/^\d+$/.test(m) && /^\d+$/.test(h) && mon === '*' && dom === '*') {
      const dowName = dow === '*' ? 'cada día' : dow === '0' || dow === '7' ? 'domingo' : dow === '1' ? 'lunes' : dow === '2' ? 'martes' : dow === '3' ? 'miércoles' : dow === '4' ? 'jueves' : dow === '5' ? 'viernes' : dow === '6' ? 'sábado' : `día ${dow}`;
      if (dow === '1-5') lines.push(`→ A las ${h.padStart(2, '0')}:${m.padStart(2, '0')} de lunes a viernes (días hábiles)`);
      else lines.push(`→ A las ${h.padStart(2, '0')}:${m.padStart(2, '0')} ${dowName}`);
    }

    return { error: null, lines };
  }, [expr]);

  return (
    <div className="space-y-3">
      <Field label="Expresión Cron (5 campos)">
        <input className={inputCls} value={expr} onChange={(e) => setExpr(e.target.value)} placeholder="min hora dom mon dow" spellCheck={false} autoComplete="off" />
      </Field>

      {parsed.error ? (
        <p className="text-xs text-red-400">{parsed.error}</p>
      ) : (
        <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-1">
          {parsed.lines.map((line, i) => (
            <div key={i} className={i === parsed.lines.length - 1 && line.startsWith('→') ? 'pt-2 border-t border-[#262626] mt-1 text-green-300 font-semibold' : 'text-[#BBB]'}>
              <span className={line.startsWith('→') ? '' : 'text-[#888]'}>{line}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowGuide(!showGuide)}
        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
      >
        <BookOpen className="w-3 h-3" />
        {showGuide ? 'Ocultar guía' : 'Ver guía de Cron'}
      </button>

      {showGuide && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-md p-3 space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Guía de expresiones Cron</div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-white">Los 5 campos</div>
            <div className="grid grid-cols-5 gap-1 text-center text-[9px]">
              <div className="bg-[#0D0D0D] border border-[#262626] rounded p-1.5">
                <div className="text-blue-400 font-mono font-bold">Min</div>
                <div className="text-[#888]">0-59</div>
              </div>
              <div className="bg-[#0D0D0D] border border-[#262626] rounded p-1.5">
                <div className="text-blue-400 font-mono font-bold">Hora</div>
                <div className="text-[#888]">0-23</div>
              </div>
              <div className="bg-[#0D0D0D] border border-[#262626] rounded p-1.5">
                <div className="text-blue-400 font-mono font-bold">Día</div>
                <div className="text-[#888]">1-31</div>
              </div>
              <div className="bg-[#0D0D0D] border border-[#262626] rounded p-1.5">
                <div className="text-blue-400 font-mono font-bold">Mes</div>
                <div className="text-[#888]">1-12</div>
              </div>
              <div className="bg-[#0D0D0D] border border-[#262626] rounded p-1.5">
                <div className="text-blue-400 font-mono font-bold">Sem</div>
                <div className="text-[#888]">0-7</div>
              </div>
            </div>
            <p className="text-[10px] text-[#888]">El día de la semana: 0 y 7 = domingo. Algunos sistemas aceptan nombres (SUN, MON, ...).</p>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-white">Caracteres especiales</div>
            <ul className="text-[10px] text-[#BBB] space-y-1">
              <li><code className="text-blue-400">*</code> — Cualquier valor (comodín)</li>
              <li><code className="text-blue-400">,</code> — Lista de valores: <code className="text-white">1,5,10</code></li>
              <li><code className="text-blue-400">-</code> — Rango: <code className="text-white">1-5</code> = del 1 al 5</li>
              <li><code className="text-blue-400">/</code> — Step (cada N): <code className="text-white">*/5</code> = cada 5, <code className="text-white">10-30/5</code> = del 10 al 30 cada 5</li>
              <li><code className="text-blue-400">?</code> — Solo día del mes o día semana (crontab de Quartz). En sistemas Linux no se usa.</li>
              <li><code className="text-blue-400">L</code> — Último día del mes (Quartz): <code className="text-white">L</code> en día del mes</li>
              <li><code className="text-blue-400">W</code> — Día weekday más cercano (Quartz): <code className="text-white">15W</code></li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-white">Ejemplos comunes</div>
            <div className="space-y-1.5">
              {CRON_EXAMPLES.map((ex) => (
                <button
                  key={ex.expr}
                  onClick={() => setExpr(ex.expr)}
                  className="w-full text-left bg-[#0D0D0D] border border-[#262626] rounded p-2 hover:border-blue-500/40 hover:bg-[#161616] transition-colors cursor-pointer"
                  title="Cargar en el parser"
                >
                  <code className="text-blue-400 text-[10px]">{ex.expr}</code>
                  <div className="text-[10px] text-[#888]">{ex.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-white">Atajos especiales (algunos sistemas)</div>
            <ul className="text-[10px] text-[#BBB] space-y-1">
              {CRON_SHORTCUTS.map((s) => (
                <li key={s.shortcut}>
                  <code className="text-blue-400">{s.shortcut}</code>
                  {' = '}
                  <code className="text-white">{s.equivalent}</code>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================= */
/* MAIN ToolsView                                                 */
/* ============================================================= */

export const ToolsView: React.FC<ToolsViewProps> = ({ pendingTool, onConsumePending }) => {
  // BLOQUE 3 — Subscribe to the cross-tool zustand store so any tool
  // (MITRE/Sigma/WinEvent/Detection Query) can trigger navigation to another
  // tool by calling `usePendingToolStore.getState().setPending({toolId, entryId?})`.
  // The prop `pendingTool` (from global search) takes priority; zustand pending
  // is the fallback for cross-tool hand-offs that don't go through App.tsx.
  const zustandPending = usePendingToolStore((s) => s.pending);
  const effectivePending = pendingTool || zustandPending;
  const clearZustandPending = usePendingToolStore((s) => s.clear);

  const [active, setActive] = useState<ToolId>(effectivePending?.toolId as ToolId || 'subnet');

  // BLOQUE 5 — tool search (filters by name / desc / category / tags).
  const [toolQuery, setToolQuery] = useState('');
  // Live favorites + recents from Dexie (only toolId + timestamps — no content).
  const favorites = useToolFavorites();
  const recents = useToolRecents(8);
  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.toolId)), [favorites]);
  const recentIdsOrdered = useMemo(() => recents.map((r) => r.toolId), [recents]);

  // When a tool is selected, record its use (light metadata only).
  const handleSelectTool = useCallback((id: ToolId) => {
    setActive(id);
    void recordToolUse(id);
  }, []);

  // Star/unstar toggle from the sidebar row.
  const handleToggleFavorite = useCallback(async (e: React.MouseEvent, toolId: string) => {
    e.stopPropagation();
    e.preventDefault();
    await toggleToolFavorite(toolId);
  }, []);

  // React 19 render-time state adjustment: when EITHER the prop OR the zustand
  // store hands us a new deep-link, switch the active tool AND record the use
  // (light metadata only — toolId + timestamp, no content/inputs).
  const [prevPendingToolId, setPrevPendingToolId] = useState<ToolId | undefined>(effectivePending?.toolId as ToolId | undefined);
  if (effectivePending?.toolId && effectivePending.toolId !== prevPendingToolId) {
    setPrevPendingToolId(effectivePending.toolId as ToolId);
    setActive(effectivePending.toolId as ToolId);
    void recordToolUse(effectivePending.toolId as string);
  }

  // Tool search — match on name, desc, category, tags (case-insensitive substring).
  const filteredTools = useMemo(() => {
    const q = toolQuery.trim().toLowerCase();
    if (!q) return TOOLS;
    return TOOLS.filter((t) => {
      const haystack = [
        t.name,
        t.desc,
        t.cat,
        ...(t.tags || []),
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [toolQuery]);

  // Rebuild the categories map ONLY from the filtered tools so search hides
  // categories that have zero matches.
  const cats = useMemo(() => {
    const m = new Map<string, typeof TOOLS>();
    for (const t of filteredTools) {
      const arr = m.get(t.cat) || [];
      arr.push(t);
      m.set(t.cat, arr);
    }
    return m;
  }, [filteredTools]);

  // Favorites list (preserve TOOLS order for stable UX) and recents.
  const favoriteTools = useMemo(
    () => TOOLS.filter((t) => favoriteIds.has(t.id)),
    [favoriteIds]
  );
  const recentTools = useMemo(
    () => recentIdsOrdered
      .map((id) => TOOLS.find((t) => t.id === id))
      .filter((t): t is (typeof TOOLS)[number] => Boolean(t)),
    [recentIdsOrdered]
  );

  // Render the active tool, passing the deep-link entryId ONLY to the tool
  // that supports it (http/ports/winevent/cron/mitre/sigma/detection-query).
  // For other tools the deep-link is ignored and cleared.
  const renderActiveTool = () => {
    const entryId = effectivePending?.toolId === active ? effectivePending?.entryId : undefined;
    const onConsumed = () => { onConsumePending?.(); clearZustandPending(); };
    switch (active) {
      case 'subnet': return <SubnetTool />;
      case 'ports': return <PortsTool autoOpenId={entryId} onAutoOpenConsumed={onConsumed} />;
      case 'jwt':   return <JwtTool />;
      case 'base':  return <BaseTool />;
      case 'http':  return <HttpTool autoOpenId={entryId} onAutoOpenConsumed={onConsumed} />;
      case 'winevent': return <WinEventTool autoOpenId={entryId} onAutoOpenConsumed={onConsumed} />;
      case 'ioc':   return <IocExtractorView />;
      case 'cron':  return <CronTool autoOpenId={entryId} onAutoOpenConsumed={onConsumed} />;
      // New tools (Task ID 2-a..2-f) — none support deep-link autoOpen yet.
      case 'timestamp': return <TimestampConverterTool />;
      case 'hash':      return <HashToolkitTool />;
      case 'encoding': return <EncodingTool />;
      case 'regex':    return <RegexTesterTool />;
      case 'ip':       return <IpAnalyzerTool />;
      case 'ioc-defang': return <IocDefangerTool />;
      // SOC Analyst block (Task ID 3-d..3-f) — none support deep-link autoOpen.
      case 'powershell-analyzer': return <PowerShellAnalyzerTool />;
      case 'cmd-analyzer':       return <CommandLineAnalyzerTool />;
      case 'log-parser':         return <LogParserTool />;
      // SOC Analyst block (Task ID 4-6 — MITRE / Sigma / Detection Query Helper) — all support deep-link autoOpen.
      case 'mitre':              return <MitreExplorerTool autoOpenId={entryId} onAutoOpenConsumed={onConsumed} />;
      case 'sigma':              return <SigmaExplorerTool autoOpenId={entryId} onAutoOpenConsumed={onConsumed} />;
      case 'detection-query':    return <DetectionQueryHelperTool autoOpenId={entryId} onAutoOpenConsumed={onConsumed} />;
      // BLOQUE 6 — Online-Optional. CVE Search has no deep-link autoOpen
      // (search is user-driven; saved CVEs are browsed in-tool).
      case 'cve-search':         return <CveSearchTool />;
      // IAM / Vulnerability / Linux block (Task ID 4-a..4-d + 4 + 5) — all stateless, no deep-link needed.
      case 'sid-rid':            return <SidRidAnalyzerTool />;
      case 'ldap-dn':            return <LdapDnParserTool />;
      case 'rbac':               return <RbacAnalyzerTool />;
      case 'cvss':               return <CvssCalculatorTool />;
      case 'file-hash':          return <FileHashAnalyzerTool />;
      case 'linux-perms':        return <LinuxPermissionsTool />;
      default: return null;
    }
  };

  const activeToolMeta = TOOLS.find((t) => t.id === active);
  const isCurrentFavorite = active ? favoriteIds.has(active) : false;

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-48px)] overflow-hidden bg-[#0A0A0A]">
      <div className="px-6 py-3 border-b border-[#262626] bg-[#0D0D0D] shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-400" />
              Herramientas de Ciberseguridad
            </h1>
            <p className="text-xs text-[#888]">{TOOLS.length} utilidades 100% offline — sin llamadas a internet.</p>
          </div>
          {/* Tool search box — filters by name / desc / category / tags. */}
          <div className="relative w-72 max-w-full">
            <Search className="w-3.5 h-3.5 text-[#555] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={toolQuery}
              onChange={(e) => setToolQuery(e.target.value)}
              placeholder="Buscar herramientas…"
              className="w-full bg-[#161616] border border-[#262626] rounded pl-8 pr-2 py-1.5 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-blue-500"
            />
            {toolQuery && (
              <button
                onClick={() => setToolQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#666] hover:text-white"
                title="Limpiar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: tool list */}
        <div className="w-[220px] bg-[#0D0D0D] border-r border-[#262626] flex flex-col shrink-0 overflow-y-auto">
          {/* Favorites section — only shown when there's at least 1 favorite */}
          {favoriteTools.length > 0 && !toolQuery && (
            <div className="p-2 space-y-0.5 border-b border-[#1a1a1a]">
              <p className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-500/70 flex items-center gap-1">
                <Star className="w-2.5 h-2.5 fill-amber-500/70" /> Favoritos
              </p>
              {favoriteTools.map((t) => (
                <button
                  key={`fav-${t.id}`}
                  onClick={() => handleSelectTool(t.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer text-left ${
                    active === t.id ? 'bg-blue-500/10 text-blue-400 font-semibold' : 'text-[#888] hover:bg-[#161616] hover:text-white'
                  }`}
                  title={t.desc}
                >
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                  {t.icon}
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Recently Used section — only shown when there's at least 1 recent */}
          {recentTools.length > 0 && !toolQuery && (
            <div className="p-2 space-y-0.5 border-b border-[#1a1a1a]">
              <p className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#444] flex items-center gap-1">
                <History className="w-2.5 h-2.5" /> Recientes
              </p>
              {recentTools.map((t) => (
                <button
                  key={`rec-${t.id}`}
                  onClick={() => handleSelectTool(t.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer text-left ${
                    active === t.id ? 'bg-blue-500/10 text-blue-400 font-semibold' : 'text-[#888] hover:bg-[#161616] hover:text-white'
                  }`}
                  title={t.desc}
                >
                  <Clock3 className="w-3 h-3 text-[#555] shrink-0" />
                  {t.icon}
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Categories (filtered by tool search query) */}
          {Array.from(cats.entries()).map(([cat, tools]) => (
            <div key={cat} className="p-2 space-y-0.5">
              <p className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#444]">{cat}</p>
              {tools.map((t) => {
                const isFav = favoriteIds.has(t.id);
                return (
                  <div
                    key={t.id}
                    className={`w-full flex items-center gap-1 rounded text-xs transition-colors cursor-pointer text-left group ${
                      active === t.id ? 'bg-blue-500/10 text-blue-400 font-semibold' : 'text-[#888] hover:bg-[#161616] hover:text-white'
                    }`}
                    title={t.desc}
                  >
                    <button
                      onClick={() => handleSelectTool(t.id)}
                      className="flex-1 flex items-center gap-2 px-2.5 py-1.5 min-w-0"
                    >
                      {t.icon}
                      <span className="truncate">{t.name}</span>
                    </button>
                    <button
                      onClick={(e) => handleToggleFavorite(e, t.id)}
                      className={`px-1.5 py-1.5 shrink-0 transition-colors ${
                        isFav ? 'text-amber-400' : 'text-[#333] opacity-0 group-hover:opacity-100 hover:text-amber-400'
                      }`}
                      title={isFav ? 'Quitar de favoritos' : 'Marcar como favorito'}
                    >
                      <Star className={`w-3 h-3 ${isFav ? 'fill-amber-400' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
          {filteredTools.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-xs text-[#666]">Sin coincidencias para &ldquo;{toolQuery}&rdquo;</p>
            </div>
          )}
        </div>

        {/* Right: active tool */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0A0A0A] min-w-0">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  {activeToolMeta?.icon}
                  {activeToolMeta?.name}
                </h2>
                <p className="text-[11px] text-[#888]">{activeToolMeta?.desc}</p>
              </div>
              <button
                onClick={() => active && handleToggleFavorite({ stopPropagation: () => {}, preventDefault: () => {} } as unknown as React.MouseEvent, active)}
                className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${
                  isCurrentFavorite
                    ? 'text-amber-400 hover:bg-amber-500/10'
                    : 'text-[#666] hover:text-amber-400 hover:bg-[#161616]'
                }`}
                title={isCurrentFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
              >
                <Star className={`w-3.5 h-3.5 ${isCurrentFavorite ? 'fill-amber-400' : ''}`} />
                {isCurrentFavorite ? 'Quitar' : 'Favorito'}
              </button>
            </div>
            {renderActiveTool()}
          </div>
        </div>
      </div>
    </div>
  );
};
