/** IpAnalyzerTool.tsx — Offline IPv4 / IPv6 address analyzer. 100% offline —
 * NO DNS, WHOIS, ping, geolocation, or any network request. Everything is
 * computed locally from the IP string. Mirrors existing tool styles. */
import React, { useMemo, useState } from 'react';
import { Globe } from 'lucide-react';
import { inputCls, btnGhost, CopyBtn, Field, ErrorBanner } from './_shared';

interface Ipv4Info {
  octets: [number, number, number, number];
  isPrivate: boolean;
  isLoopback: boolean;
  isLinkLocal: boolean;
  isMulticast: boolean;
  isBroadcast: boolean;
  isReserved: boolean;
  isDocumentation: boolean;
  klass: 'A' | 'B' | 'C' | 'D' | 'E';
  binary: string;
  hex: string;
  int: number;
}

interface Ipv6Info {
  groups: number[]; // always length 8
  expanded: string;
  compressed: string;
  isLoopback: boolean;
  isLinkLocal: boolean;
  isMulticast: boolean;
  isDocumentation: boolean;
  isUniqueLocal: boolean;
  isGlobal: boolean;
}

type IpResult =
  | { version: 'v4'; rows: [string, string][] }
  | { version: 'v6'; rows: [string, string][] }
  | { error: string };

/* ---------- IPv4 ---------- */

function parseIpv4(s: string): { ok: true; octets: [number, number, number, number] } | { ok: false } {
  const parts = s.trim().split('.');
  if (parts.length !== 4) return { ok: false };
  const octets: number[] = [];
  for (const p of parts) {
    // Reject empty, non-digit, >3 digits, or leading-zero forms like "010".
    if (!/^\d{1,3}$/.test(p) || (p.length > 1 && p[0] === '0')) return { ok: false };
    const n = Number(p);
    if (n < 0 || n > 255) return { ok: false };
    octets.push(n);
  }
  return { ok: true, octets: octets as [number, number, number, number] };
}

function buildIpv4Info(o: [number, number, number, number]): Ipv4Info {
  const isLoopback = o[0] === 127;
  const isLinkLocal = o[0] === 169 && o[1] === 254;
  const isMulticast = o[0] >= 224 && o[0] <= 239;
  // Per spec: 255.255.255.255 (limited bcast) OR 0.0.0.0 (unspecified) both flagged "Broadcast".
  const isBroadcast = (o[0] === 255 && o[1] === 255 && o[2] === 255 && o[3] === 255)
    || (o[0] === 0 && o[1] === 0 && o[2] === 0 && o[3] === 0);
  // Reserved: Class E (240.0.0.0/4) + 0.0.0.0/8 — excluding the broadcast forms above.
  const isReserved = !isBroadcast && (o[0] >= 240 || o[0] === 0);
  const isPrivate = o[0] === 10
    || (o[0] === 172 && o[1] >= 16 && o[1] <= 31)
    || (o[0] === 192 && o[1] === 168);
  // RFC 5737 documentation ranges.
  const isDocumentation = (o[0] === 192 && o[1] === 0 && o[2] === 2)
    || (o[0] === 198 && o[1] === 51 && o[2] === 100)
    || (o[0] === 203 && o[1] === 0 && o[2] === 113);

  let klass: 'A' | 'B' | 'C' | 'D' | 'E';
  if (o[0] <= 127) klass = 'A';
  else if (o[0] <= 191) klass = 'B';
  else if (o[0] <= 223) klass = 'C';
  else if (o[0] <= 239) klass = 'D';
  else klass = 'E';

  const int = (((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0);
  const binary = o.map((b) => b.toString(2).padStart(8, '0')).join('.');
  const hex = '0x' + int.toString(16).toUpperCase().padStart(8, '0');

  return { octets: o, isPrivate, isLoopback, isLinkLocal, isMulticast, isBroadcast,
    isReserved, isDocumentation, klass, binary, hex, int };
}

function ipv4Scope(info: Ipv4Info): string {
  if (info.isBroadcast) return 'Broadcast';
  if (info.isLoopback) return 'Loopback';
  if (info.isLinkLocal) return 'Link-Local';
  if (info.isMulticast) return 'Multicast';
  if (info.isDocumentation) return 'Documentation';
  if (info.isReserved) return 'Reserved';
  if (info.isPrivate) return 'Private';
  return 'Public';
}

function ipv4PrivateExplanation(o: [number, number, number, number], isPrivate: boolean): string {
  if (!isPrivate) return 'Public — routable on the Internet';
  if (o[0] === 10) return 'Private — RFC 1918 (10.0.0.0/8)';
  if (o[0] === 172) return 'Private — RFC 1918 (172.16.0.0/12)';
  return 'Private — RFC 1918 (192.168.0.0/16)';
}

function buildIpv4Rows(input: string, info: Ipv4Info): [string, string][] {
  return [
    ['IP', input],
    ['Version', 'IPv4'],
    ['Class', info.klass],
    ['Scope', ipv4Scope(info)],
    ['Private/Public', ipv4PrivateExplanation(info.octets, info.isPrivate)],
    ['Loopback', String(info.isLoopback)],
    ['Link-Local', String(info.isLinkLocal)],
    ['Multicast', String(info.isMulticast)],
    ['Broadcast', String(info.isBroadcast)],
    ['Reserved', String(info.isReserved)],
    ['Documentation', String(info.isDocumentation)],
    ['Binary', info.binary],
    ['Hexadecimal', info.hex],
    ['Integer', String(info.int)],
  ];
}

/* ---------- IPv6 ---------- */

/** Parse an IPv6 literal into 8 16-bit groups. Handles `::` zero-compression
 * (at most one, must expand >=1 group) and the trailing IPv4-mapped dotted
 * quad form (which contributes 2 groups). Hex groups must be 1-4 hex chars. */
function parseIpv6(s: string): { ok: true; groups: number[] } | { ok: false } {
  const raw = s.trim();
  if (!raw) return { ok: false };
  // Reject any character that can't appear in an IPv6 literal.
  if (!/^[0-9a-fA-F:.]+$/.test(raw)) return { ok: false };
  // At most one '::' allowed.
  const dcMatches = raw.match(/::/g);
  if (dcMatches && dcMatches.length > 1) return { ok: false };
  const hasCompression = !!dcMatches && dcMatches.length === 1;

  let leftStr: string;
  let rightStr: string;
  if (hasCompression) {
    const idx = raw.indexOf('::');
    leftStr = raw.slice(0, idx);
    rightStr = raw.slice(idx + 2);
  } else {
    leftStr = raw;
    rightStr = '';
  }

  // Parse one side (either the left or right of `::`) into a list of 16-bit
  // groups. The side may end with a dotted-quad IPv4 tail.
  const parseSide = (side: string): number[] | null => {
    if (side === '') return [];
    let ipv4Groups: number[] = [];
    let core: string;
    const lastColon = side.lastIndexOf(':');
    const lastSegment = lastColon >= 0 ? side.slice(lastColon + 1) : side;
    if (lastSegment.includes('.')) {
      const v4 = parseIpv4(lastSegment);
      if (!v4.ok) return null;
      ipv4Groups = [
        (v4.octets[0] << 8) | v4.octets[1],
        (v4.octets[2] << 8) | v4.octets[3],
      ];
      core = lastColon >= 0 ? side.slice(0, lastColon) : '';
    } else {
      core = side;
    }
    const coreGroups: number[] = [];
    if (core !== '') {
      const parts = core.split(':');
      for (const p of parts) {
        if (!/^[0-9a-fA-F]{1,4}$/.test(p)) return null;
        coreGroups.push(parseInt(p, 16));
      }
    }
    return [...coreGroups, ...ipv4Groups];
  };

  const leftGroups = parseSide(leftStr);
  if (leftGroups === null) return { ok: false };
  const rightGroups = parseSide(rightStr);
  if (rightGroups === null) return { ok: false };

  const totalExplicit = leftGroups.length + rightGroups.length;
  if (hasCompression) {
    // `::` must stand for at least one all-zero group.
    if (totalExplicit >= 8) return { ok: false };
    const zeros = 8 - totalExplicit;
    return {
      ok: true,
      groups: [...leftGroups, ...new Array<number>(zeros).fill(0), ...rightGroups],
    };
  }
  if (totalExplicit !== 8) return { ok: false };
  return { ok: true, groups: leftGroups };
}

/** Build a compressed IPv6 representation. Per spec simplification: if the
 * input already has `::`, return it verbatim; otherwise trim leading zeros
 * per group and collapse the longest run (>=2) of zero groups into `::`.
 * Not strictly RFC 5952 (single zero groups aren't compressed). */
function compressIpv6(groups: number[], input: string): string {
  if (input.includes('::')) return input;

  const trimmed = groups.map((g) => {
    if (g === 0) return '0';
    return g.toString(16).replace(/^0+/, '');
  });

  let bestStart = -1;
  let bestLen = 0;
  let curStart = -1;
  let curLen = 0;
  for (let i = 0; i < trimmed.length; i++) {
    if (groups[i] === 0) {
      if (curStart === -1) {
        curStart = i;
        curLen = 1;
      } else {
        curLen++;
      }
    } else {
      if (curLen > bestLen) {
        bestLen = curLen;
        bestStart = curStart;
      }
      curStart = -1;
      curLen = 0;
    }
  }
  if (curLen > bestLen) {
    bestLen = curLen;
    bestStart = curStart;
  }

  if (bestLen >= 2) {
    const before = trimmed.slice(0, bestStart).join(':');
    const after = trimmed.slice(bestStart + bestLen).join(':');
    if (before === '' && after === '') return '::';
    if (before === '') return '::' + after;
    if (after === '') return before + '::';
    return before + '::' + after;
  }
  return trimmed.join(':');
}

function buildIpv6Info(groups: number[], input: string): Ipv6Info {
  const isLoopback =
    groups.length === 8 &&
    groups.every((g, i) => (i === 7 ? g === 1 : g === 0));
  // fe80::/10 — top 10 bits = 1111111010
  const isLinkLocal = (groups[0] & 0xffc0) === 0xfe80;
  // ff00::/8 — top 8 bits = 0xff
  const isMulticast = (groups[0] & 0xff00) === 0xff00;
  // 2001:db8::/32 — documentation
  const isDocumentation = groups[0] === 0x2001 && groups[1] === 0x0db8;
  // fc00::/7 — Unique Local Addresses
  const isUniqueLocal = (groups[0] & 0xfe00) === 0xfc00;
  // Global unicast = everything not in the special ranges above.
  const isGlobal =
    !isLoopback &&
    !isLinkLocal &&
    !isMulticast &&
    !isDocumentation &&
    !isUniqueLocal;

  const expanded = groups
    .map((g) => g.toString(16).padStart(4, '0'))
    .join(':');
  const compressed = compressIpv6(groups, input);

  return {
    groups,
    expanded,
    compressed,
    isLoopback,
    isLinkLocal,
    isMulticast,
    isDocumentation,
    isUniqueLocal,
    isGlobal,
  };
}

function buildIpv6Rows(input: string, info: Ipv6Info): [string, string][] {
  return [
    ['IP', input],
    ['Version', 'IPv6'],
    ['Compressed', info.compressed],
    ['Expanded', info.expanded],
    ['Loopback', String(info.isLoopback)],
    ['Link-Local', String(info.isLinkLocal)],
    ['Multicast', String(info.isMulticast)],
    ['Documentation', String(info.isDocumentation)],
    ['Unique Local', String(info.isUniqueLocal)],
    ['Global', String(info.isGlobal)],
  ];
}

/* ---------- Auto-detect v4 vs v6 ---------- */

function analyzeIp(input: string): IpResult | null {
  const trimmed = input.trim();
  if (!trimmed) return null; // empty → no results, no error

  // Colons are never part of an IPv4 literal — if present, try IPv6 first.
  if (trimmed.includes(':')) {
    const parsed = parseIpv6(trimmed);
    if (!parsed.ok) return { error: 'Invalid IPv6 address.' };
    return {
      version: 'v6',
      rows: buildIpv6Rows(trimmed, buildIpv6Info(parsed.groups, trimmed)),
    };
  }

  if (trimmed.includes('.')) {
    const parsed = parseIpv4(trimmed);
    if (!parsed.ok) return { error: 'Invalid IPv4 address.' };
    return {
      version: 'v4',
      rows: buildIpv4Rows(trimmed, buildIpv4Info(parsed.octets)),
    };
  }

  // Neither dots nor colons — can't be either family.
  return { error: 'Invalid IP address.' };
}

/* ---------- UI ---------- */

const ResultRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3 py-1">
    <span className="text-[11px] text-[#888] uppercase tracking-wider shrink-0">
      {label}
    </span>
    <div className="flex items-center gap-1 min-w-0">
      <span className="text-[11px] font-mono text-blue-300 text-right break-all">
        {value}
      </span>
      <CopyBtn text={value} />
    </div>
  </div>
);

export const IpAnalyzerTool: React.FC = () => {
  const [input, setInput] = useState('');
  const result = useMemo<IpResult | null>(() => analyzeIp(input), [input]);

  return (
    <div className="space-y-3">
      <Field label="IP Address (IPv4 or IPv6)">
        <div className="flex gap-2">
          <input
            className={inputCls}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="192.168.1.10  |  2001:db8::1"
            spellCheck={false}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setInput('')}
            className={btnGhost}
            disabled={!input}
          >
            Clear
          </button>
        </div>
      </Field>

      {result && 'error' in result && <ErrorBanner message={result.error} />}

      {result && 'rows' in result && (
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-3 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1.5 flex items-center gap-1.5">
            <Globe className="w-3 h-3" />
            {result.version === 'v4' ? 'IPv4 Analysis' : 'IPv6 Analysis'}
          </div>
          {result.rows.map(([label, value]) => (
            <ResultRow key={label} label={label} value={value} />
          ))}
        </div>
      )}

      {!result && (
        <p className="text-[11px] text-[#555] leading-relaxed">
          Enter an IPv4 or IPv6 address to analyze it locally. Auto-detects the
          version as you type. 100% offline — no DNS, WHOIS, ping, or
          geolocation.
        </p>
      )}
    </div>
  );
};

export default IpAnalyzerTool;
