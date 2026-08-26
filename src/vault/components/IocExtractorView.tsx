'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Network, Copy, Check, X, BookOpen, Terminal, Shield, ShieldAlert,
  FileUp, Trash2, ExternalLink, Settings, KeyRound, Bug,
  Database, Globe, FileText, Search, Cpu,
  RefreshCw, Loader2, AlertTriangle, CheckCircle2, Wifi, WifiOff,
} from 'lucide-react';
import { useIocStore } from '../store/iocStore';
// Block 6 — Online-Optional enrichment architecture (sole entry point: enrichWithProvider)
import {
  enrichWithProvider,
  providersForIocType,
  PROVIDER_META,
  type EnrichResult,
} from '../integrations/threatIntel/registry';
import { toUserMessage } from '../integrations/threatIntel/errors';
import { grantOnlineConsent } from '../integrations/threatIntel/consent';
import { useIsOnline } from '../integrations/online';
import type {
  ProviderResult,
  ProviderId,
  EnrichableIocType,
} from '../integrations/threatIntel/types';

/* ============================================================= */
/* IoC Extractor — SOC Tier1/2 + IAM                              */
/* 100% offline, browser-only. Refang + validate + dedup +       */
/* context + scoring + enrichment links + KQL/SPL/STIX/CSV/JSON  */
/* + defang toggle + secret detection + editable whitelist.      */
/* ============================================================= */

/* ---------- Types ---------- */
type IocType =
  | 'ipv4' | 'ipv6' | 'domain' | 'url' | 'email' | 'hash' | 'cve'
  | 'filepath' | 'registry' | 'mutex' | 'jwt' | 'apikey' | 'awskey'
  | 'privatekey' | 'bearer' | 'guid' | 'btc' | 'secret';

interface IocFinding {
  value: string;          // refanged, real value
  type: IocType;
  count: number;
  context: string;       // ~40 chars around first occurrence
  classification: string;// e.g. "IP Pública", "IP Privada — Ignorar", "Whitelist Microsoft"
  score: 'alta' | 'media' | 'baja' | 'info';
  hashKind?: string;     // MD5 / SHA-1 / SHA-256 / SHA-512 / SSDEEP / IMPHASH / TLSH / Authenticode
}

interface Whitelist {
  domains: string[];     // microsoft.com, google.com, login.microsoftonline.com...
}

/* ---------- Refang: convert defanged IoCs back to real form ----------
 * AUDIT VN-012: the previous implementation had a last-resort rule whose
 * regex pattern contained the sequence star-slash (the block-comment
 * terminator — that's why we cannot write it verbatim here). The pattern
 * was roughly `\s* optional-[ optional-. optional-] \s*` with EVERY token
 * optional. Because every token was optional, the regex matched the EMPTY
 * string at every position — and also matched plain prose periods like
 * "mimikatz. Luego", collapsing them into the following word
 * ("mimikatz.Luego"). The latter could produce false-positive IoCs whenever
 * the following token happened to look like a TLD. The former was equally
 * catastrophic: it inserted a `.` between every character, generating
 * massive garbage matches downstream.
 *
 * Now we ONLY refang explicitly-defanged patterns. Plain prose dots and
 * brackets/parens are left untouched.
 *   example[.]com        ->  example.com
 *   example(.)com        ->  example.com
 *   example[dot]com      ->  example.com
 *   example(dot)com      ->  example.com
 *   hxxp://example[.]com ->  http://example.com
 * Plain prose like "mimikatz. Luego exfiltró información." is NOT modified.
 */
const refang = (s: string): string => s
  // Protocol defanging — must run first because [.] rules below would
  // otherwise refang the domain part before the protocol is restored.
  .replace(/\bhxxps?:\/\//gi, (m) => m.toLowerCase().replace('hxxp', 'http'))
  .replace(/\bhxxp\b/gi, 'http')
  // Dot defang: [.] (.) [dot] (dot) [DOT] (DOT) — only explicit forms.
  .replace(/\[\.\]/g, '.')
  .replace(/\(\.\)/g, '.')
  .replace(/\[\s*dot\s*\]/gi, '.')
  .replace(/\(\s*dot\s*\)/gi, '.')
  // Other character defangs (colon, slash, at) — explicit forms only.
  .replace(/\[:\]/g, ':')
  .replace(/\[\/\]/g, '/')
  .replace(/\(\/\)/g, '/')
  .replace(/\[at\]/gi, '@')
  .replace(/\(at\)/gi, '@');

/* ---------- Validation helpers ---------- */
const isPrivateIPv4 = (ip: string): boolean => {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  if (a === 0) return true;            // 0.0.0.0/8
  if (a === 127) return true;          // loopback
  if (a === 10) return true;           // 10.0.0.0/8
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true; // 192.168/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a === 224) return true;          // multicast
  if (a >= 240) return true;          // reserved
  if (ip === '255.255.255.255') return true; // broadcast
  return false;
};

const TLD_SET = new Set([
  'com','net','org','io','co','us','uk','de','fr','es','ru','cn','jp','br','in','au','ca','mx','ar',
  'it','nl','se','no','fi','dk','pl','cz','ch','at','be','pt','gr','ie','hu','ro','bg','sk','si',
  'me','edu','gov','mil','int','info','biz','xyz','top','online','site','store','tech','app','dev',
  'cloud','host','live','news','blog','shop','club','world','today','email','security','page','zone',
  'ru.com','co.uk','com.br','com.au','co.jp','co.in','co.kr','com.cn','com.mx','co.za','eu.org'
]);

const isValidTLD = (domain: string): boolean => {
  const parts = domain.toLowerCase().split('.');
  if (parts.length < 2) return false;
  // check last 2 labels joined (handles co.uk etc.) or single last label
  const last = parts[parts.length - 1];
  const last2 = parts.slice(-2).join('.');
  return TLD_SET.has(last) || TLD_SET.has(last2);
};

/* AUDIT VN-D-001: curated whitelist of common real TLDs, applied ONLY to
 * 2-label domains (something.tld) so relaxing DOMAIN_RE to catch evil.com /
 * pwned.io doesn't flood results with prose like file.txt, note.md or
 * script.py. 3+ label domains keep the looser TLD_SET validation above. */
const TWO_LABEL_TLD_SET = new Set([
  'com', 'net', 'org', 'io', 'ai', 'co', 'edu', 'gov', 'mil', 'int',
  'info', 'biz', 'xyz', 'top', 'ru', 'cn', 'uk', 'de', 'fr', 'es',
  'mx', 'ar', 'cl', 'br', 'us', 'me', 'tv', 'cc', 'su', 'is',
  'to', 'sh', 'st', 'link', 'live', 'online', 'site', 'store', 'app',
  'dev', 'cloud', 'tech', 'systems', 'security',
]);

const DEFAULT_WHITELIST_DOMAINS = [
  'microsoft.com','login.microsoftonline.com','login.windows.net','login.live.com',
  'office.com','office365.com','outlook.com','outlook.office.com','outlook.office365.com',
  'sharepoint.com','live.com','bing.com','azure.com','azureedge.net','azurefd.net',
  'google.com','googleapis.com','gstatic.com','googleusercontent.com','gmail.com',
  'amazon.com','amazonaws.com','aws.amazon.com','okta.com','oktapreview.com',
  'github.com','githubusercontent.com','gitlab.com','bitbucket.org',
  'apple.com','icloud.com','cdn-apple.com','adobedtm.com',
  'cloudflare.com','cloudflareinsights.com','cloudfront.net','jsdelivr.net',
  'schema.org','schemas.microsoft.com','schemas.xmlsoap.org','w3.org',
  'example.com','example.org','example.net','test.local','invalid.local',
  'in-addr.arpa','ip6.arpa','localhost','local'
];

const loadWhitelist = (): Whitelist => {
  try {
    const raw = localStorage.getItem('vaultnotes-ioc-whitelist');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { domains: DEFAULT_WHITELIST_DOMAINS };
};

const saveWhitelist = (wl: Whitelist) => {
  try { localStorage.setItem('vaultnotes-ioc-whitelist', JSON.stringify(wl)); } catch { /* ignore */ }
};

const isWhitelistedDomain = (domain: string, wl: Whitelist): boolean => {
  const d = domain.toLowerCase();
  return wl.domains.some((w) => {
    const wLower = w.toLowerCase();
    return d === wLower || d.endsWith('.' + wLower);
  });
};

const classifyHash = (h: string): string | null => {
  const len = h.length;
  if (!/^[a-fA-F0-9]+$/.test(h)) {
    // SSDEEP form: 48:... or 192:...
    if (/^\d+:[A-Za-z0-9+\/]+:[A-Za-z0-9+\/]+$/.test(h)) return 'SSDEEP';
    // TLSH form: T1... (70 hex chars) 
    if (/^T[A-Z0-9]{6,}$/.test(h)) return 'TLSH';
    // Authenticode signature (signed)
    if (/^308206[0-9A-Fa-f]{4,}$/i.test(h)) return 'Authenticode';
    return null;
  }
  if (len === 32) return 'MD5';
  if (len === 40) return 'SHA-1';
  if (len === 64) return 'SHA-256';
  if (len === 128) return 'SHA-512';
  return null;
};

/* AUDIT VN-D-002: full IPv6 validation, mirroring the parser in
 * IpAnalyzerTool.tsx (parseIpv6): at most one `::` (which must stand for at
 * least one zero group), 1-4 hex chars per group, and an optional trailing
 * dotted-quad IPv4 tail (e.g. `::ffff:192.168.1.1`) contributing 2 groups.
 * Used to post-filter the broad IPv6 candidate regex below — times
 * (12:34:56), MAC addresses (6 groups) and malformed runs are rejected. */
const IPV4_TAIL_RE = /^(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

const isValidIpv6 = (s: string): boolean => {
  const raw = s.trim();
  if (!raw || !/^[0-9a-fA-F:.]+$/.test(raw)) return false;
  const dc = raw.match(/::/g);
  if (dc && dc.length > 1) return false; // only one `::` allowed
  const hasComp = !!dc;
  const idx = raw.indexOf('::');
  const leftStr = hasComp ? raw.slice(0, idx) : raw;
  const rightStr = hasComp ? raw.slice(idx + 2) : '';
  // Count the 16-bit groups on one side of `::`. A side may end with a
  // dotted-quad IPv4 tail, which is worth 2 groups.
  const countSide = (side: string): number | null => {
    if (side === '') return 0;
    let core = side;
    let groups = 0;
    const lastColon = side.lastIndexOf(':');
    const lastSegment = lastColon >= 0 ? side.slice(lastColon + 1) : side;
    if (lastSegment.includes('.')) {
      if (!IPV4_TAIL_RE.test(lastSegment)) return null;
      groups += 2;
      core = lastColon >= 0 ? side.slice(0, lastColon) : '';
    }
    if (core !== '') {
      for (const p of core.split(':')) {
        if (!/^[0-9a-fA-F]{1,4}$/.test(p)) return null;
        groups += 1;
      }
    }
    return groups;
  };
  const left = countSide(leftStr);
  if (left === null) return false;
  const right = countSide(rightStr);
  if (right === null) return false;
  const total = left + right;
  if (hasComp) return total < 8; // `::` must expand to >= 1 zero group
  return total === 8;            // uncompressed form: exactly 8 groups
};

/* ---------- Regex patterns (applied on refanged text) ---------- */
/* 'domain' is extracted separately with DOMAIN_RE below. */
const PATTERNS: Record<Exclude<IocType, 'domain'>, RegExp> = {
  // IPv4 strict with optional :port or /CIDR — the port (0-65535) and CIDR
  // (0-32) numeric ranges are post-validated in the extraction loop (VN-D-011).
  ipv4: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?::\d{1,5})?(?:\/\d{1,2})?\b/g,
  /* AUDIT VN-D-002: the old 3-alternative regex truncated compressed forms —
   * `fe80::1ff:fe23:4567:890a` extracted only `fe80::1ff` (it stopped at the
   * first group after `::`). Now we capture a broad maximal hex+colon run
   * (lookaround guards keep it from starting/ending mid-token) with an
   * optional dotted-quad IPv4 tail, and post-validate every candidate with
   * isValidIpv6() in the extraction loop. */
  ipv6: /(?<![0-9a-fA-F:.])[0-9a-fA-F]{0,4}(?::[0-9a-fA-F]{0,4}){2,7}(?::(?:\d{1,3}\.){3}\d{1,3})?(?![0-9a-fA-F:])(?!\.?[0-9a-fA-F])/g,
  // URL: full with path/query/fragment — including hxxp already refanged to http
  url: /\bhttps?:\/\/[^\s<>"'`(){}\[\]]+/gi,
  // Email
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  // CVE
  cve: /\bCVE-\d{4}-\d{4,7}\b/gi,
  // Hashes hex of known length (validated in code for charset)
  hash: /\b[a-fA-F0-9]{32}\b|\b[a-fA-F0-9]{40}\b|\b[a-fA-F0-9]{64}\b|\b[a-fA-F0-9]{128}\b/g,
  // Windows file path: C:\Users\... or \\server\share with %ENV%
  filepath: /\b(?:[A-Za-z]:\\[^<>"|*?]*|\\\\[A-Za-z0-9._-]+\\[^<>"|*?]*|\/(?:etc|var|usr|tmp|opt|home|root|proc|sys|bin|sbin|lib)[A-Za-z0-9._\-\/]*)\b/g,
  // Registry key: HKLM\... or HKCU\... 
  registry: /\b(?:HKEY_LOCAL_MACHINE|HKEY_CURRENT_USER|HKEY_CLASSES_ROOT|HKEY_USERS|HKEY_CURRENT_CONFIG|HKLM|HKCU|HKCR|HKU|HKCC)\\[A-Za-z0-9._\\\-\{\}]+\b/g,
  // Mutex: Global\\, Local\\, or single name with _ Mutex _ ...
  mutex: /\b(?:Global|Local)\\[A-Za-z0-9._\-{}:]+|\b[A-Za-z0-9_]+_Mutex\b|\bMutant_[A-Za-z0-9_]+\b/g,
  // JWT: eyJ... (3 parts). Generous match.
  jwt: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  // Generic API key: key=..., api_key=...
  apikey: /\b(?:api[_-]?key|apikey|secret|token|access[_-]?token|client[_-]?secret|app[_-]?secret)\s*[=:]\s*['"]?([A-Za-z0-9_\-]{16,128})['"]?/gi,
  // AWS Access Key ID: AKIA + 16 chars
  awskey: /\bAKIA[0-9A-Z]{16}\b/g,
  // Private key blocks
  privatekey: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/g,
  // Bearer tokens in Authorization header
  bearer: /Bearer\s+[A-Za-z0-9_\-\.=]{20,}/gi,
  // GUID (Entra ID object/app/tenant id, etc.)
  guid: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g,
  // Bitcoin addresses
  btc: /\b(?:[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{6,87})\b/g,
  // Secret leaks (password=, client_secret=, etc.) — captured as full match incl keyword
  secret: /(?:password|passwd|pwd|client[_-]?secret|app[_-]?secret|api[_-]?secret)\s*[=:]\s*['"]?[^\s'"<>,;]{4,128}/gi,
};

/* ---------- Domains regex (run separately to filter URLs/emails) ---------- */
/* AUDIT VN-D-001: the old pattern required 3+ labels (label.label.tld), so
 * the most common malicious form — 2-label domains like evil.com,
 * microsoft.com, cloudfront.net, pwned.io — was silently missed. `{1,}` now
 * accepts 2-label domains; prose false positives (file.txt, note.md,
 * script.py) are filtered in the domain loop below by requiring a curated
 * real TLD (TWO_LABEL_TLD_SET) for 2-label matches. 3+ label domains keep
 * the previous, looser behavior (isValidTLD). */
const DOMAIN_RE = /\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.){1,}[a-zA-Z]{2,}\b/g;

/* AUDIT VN-D-005: URL extraction swallowed trailing sentence punctuation —
 * `http://malware.com/path.` kept the trailing dot (confirmed in live E2E
 * testing). Loop-strip trailing `.,;:!?'")]}»›`; a trailing `)` is only
 * stripped while unbalanced (more `)` than `(` inside the URL), so URLs that
 * legitimately carry a balanced paren pair keep it. */
const URL_TRAILING_PUNCT = ".,;:!?'\")]}»›";
const stripTrailingUrlPunct = (u: string): string => {
  let s = u;
  while (s.length > 0) {
    const last = s[s.length - 1];
    if (last === ')') {
      const opens = (s.match(/\(/g) || []).length;
      const closes = (s.match(/\)/g) || []).length;
      if (opens >= closes) break; // balanced — the ')' belongs to the URL
    } else if (!URL_TRAILING_PUNCT.includes(last)) {
      break;
    }
    s = s.slice(0, -1);
  }
  return s;
};

/* ---------- Punycode detector ---------- */
const isPunycode = (d: string) => d.split('.').some((label) => label.toLowerCase().startsWith('xn--'));

/* ---------- Context extraction ---------- */
const getContext = (text: string, matchStr: string, span = 40): string => {
  const idx = text.indexOf(matchStr);
  if (idx < 0) return '';
  const start = Math.max(0, idx - span);
  const end = Math.min(text.length, idx + matchStr.length + span);
  return (start > 0 ? '…' : '') + text.slice(start, end).replace(/\s+/g, ' ').trim() + (end < text.length ? '…' : '');
};

/* ---------- Defang for export ---------- */
const defang = (s: string): string => s
  .replace(/\bhttps?:\/\//gi, (m) => m.toLowerCase().replace('http', 'hxxp'))
  .replace(/\./g, '[.]')
  .replace(/@/g, '[@]')
  .replace(/:/g, '[:]');

/* ---------- Classification + scoring ---------- */
const classify = (type: IocType, value: string, wl: Whitelist): { classification: string; score: IocFinding['score'] } => {
  const v = value.toLowerCase();
  switch (type) {
    case 'ipv4': {
      const baseIp = v.split(/[:/]/)[0];
      if (isPrivateIPv4(baseIp)) return { classification: 'IP Privada — Ignorar', score: 'info' };
      return { classification: 'IP Pública — investigar', score: 'media' };
    }
    case 'ipv6':
      return { classification: 'IPv6 — investigar', score: 'media' };
    case 'domain':
      if (isWhitelistedDomain(v, wl)) return { classification: 'Whitelist — dominio legítimo', score: 'info' };
      if (isPunycode(v)) return { classification: 'Punycode — sospechoso (phishing)', score: 'alta' };
      if (!isValidTLD(v)) return { classification: 'TLD inválido — probable falso positivo', score: 'baja' };
      return { classification: 'Dominio — investigar', score: 'media' };
    case 'url':
      if (isWhitelistedDomain(v.replace(/^https?:\/\//, '').split(/[/?#]/)[0], wl))
        return { classification: 'Whitelist — URL legítima', score: 'info' };
      if (/\.(exe|dll|scr|bat|ps1|vbs|js|jar|msi|com|pif|hta)(?:\?|#|$)/i.test(v))
        return { classification: 'URL con binario — alta sospecha', score: 'alta' };
      return { classification: 'URL — investigar', score: 'media' };
    case 'email':
      return { classification: 'Email — verificar sender', score: 'baja' };
    case 'hash':
      return { classification: 'Hash — lookup en VT', score: 'media' };
    case 'cve':
      return { classification: 'CVE — verificar exploitabilidad', score: 'media' };
    case 'filepath':
      return { classification: 'Ruta de archivo — contexto', score: 'baja' };
    case 'registry':
      return { classification: 'Registry key — persistencia?', score: 'media' };
    case 'mutex':
      return { classification: 'Mutex — firma de malware', score: 'media' };
    case 'jwt':
      return { classification: 'JWT — decodificar + validar exp', score: 'media' };
    case 'apikey':
      return { classification: 'API key expuesta — CREDENTIAL LEAK P1', score: 'alta' };
    case 'awskey':
      return { classification: 'AWS Access Key — CREDENTIAL LEAK P1', score: 'alta' };
    case 'privatekey':
      return { classification: 'Private key — CREDENTIAL LEAK P1', score: 'alta' };
    case 'bearer':
      return { classification: 'Bearer token — CREDENTIAL LEAK P1', score: 'alta' };
    case 'guid':
      return { classification: 'GUID — Object/App/Tenant ID', score: 'baja' };
    case 'btc':
      return { classification: 'Wallet BTC — track ransomware', score: 'media' };
    case 'secret':
      return { classification: 'Secreto en claro — CREDENTIAL LEAK P1', score: 'alta' };
    default:
      return { classification: '—', score: 'info' };
  }
};

/* ---------- Score badge color ---------- */
const scoreColor = (s: IocFinding['score']) =>
  s === 'alta' ? 'bg-red-500/15 text-red-300 border-red-500/30'
  : s === 'media' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  : s === 'baja' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
  : 'bg-[#161616] text-[#666] border-[#262626]';

/* ---------- Enrichment URLs ---------- */
const enrichmentLinks = (type: IocType, value: string): { label: string; url: string }[] => {
  const baseIp = value.split(/[:/]/)[0];
  const domain = type === 'url' ? value.replace(/^https?:\/\//, '').split(/[/?#]/)[0] : value;
  const enc = encodeURIComponent(value);
  switch (type) {
    case 'ipv4':
    case 'ipv6':
      return [
        { label: 'VT', url: `https://www.virustotal.com/gui/search/${enc}` },
        { label: 'AbuseIPDB', url: `https://www.abuseipdb.com/check/${baseIp}` },
        { label: 'Shodan', url: `https://www.shodan.io/host/${baseIp}` },
        { label: 'OTX', url: `https://otx.alienvault.com/indicator/ip/${baseIp}` },
      ];
    case 'domain':
    case 'url':
      return [
        { label: 'VT', url: `https://www.virustotal.com/gui/domain/${encodeURIComponent(domain)}` },
        { label: 'OTX', url: `https://otx.alienvault.com/indicator/domain/${domain}` },
        { label: 'Shodan', url: `https://www.shodan.io/search?query=hostname:${domain}` },
      ];
    case 'hash':
      return [
        { label: 'VT', url: `https://www.virustotal.com/gui/file/${enc}` },
        { label: 'OTX', url: `https://otx.alienvault.com/indicator/file/${enc}` },
      ];
    case 'cve':
      return [
        { label: 'NVD', url: `https://nvd.nist.gov/vuln/detail/${value}` },
        { label: 'MITRE', url: `https://cve.mitre.org/cgi-bin/cvename.cgi?name=${value}` },
      ];
    case 'email':
      return [
        { label: 'HIBP', url: `https://haveibeenpwned.com/api/v3/breachedaccount/${enc}` },
      ];
    case 'btc':
      return [
        { label: 'Blockchain', url: `https://www.blockchain.com/btc/address/${value}` },
        { label: 'OTX', url: `https://otx.alienvault.com/indicator/bitcoin/${value}` },
      ];
    default:
      return [];
  }
};

/* ---------- Export formatters ---------- */
const toTSV = (findings: IocFinding[]): string => {
  const header = 'Type\tValue\tCount\tClassification\tScore\tContext';
  const rows = findings.map((f) =>
    [f.type, f.value, String(f.count), f.classification, f.score, f.context.replace(/\t/g, ' ')].join('\t')
  );
  return [header, ...rows].join('\n');
};

const toCSV = (findings: IocFinding[]): string => {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const header = ['Type', 'Value', 'Count', 'Classification', 'Score', 'Context'].map(esc).join(',');
  const rows = findings.map((f) =>
    [f.type, f.value, String(f.count), f.classification, f.score, f.context].map(esc).join(',')
  );
  return [header, ...rows].join('\n');
};

const toJSON = (findings: IocFinding[]): string => JSON.stringify(
  findings.map((f) => ({ type: f.type, value: f.value, count: f.count, classification: f.classification, score: f.score, context: f.context, hashKind: f.hashKind || null })),
  null, 2
);

/* AUDIT VN-D-003: STIX 2.1 requires the hash-type key of a file pattern to
 * be the quoted, canonical algorithm name — [file:hashes.'MD5' = '...'].
 * The old export emitted unquoted lowercase keys
 * ([file:hashes.md5 = '...'], SHA-1 -> 'sha1'), which TIPs reject as
 * invalid STIX patterns. */
const stixHashKey = (kind?: string): string => {
  switch ((kind || 'MD5').toUpperCase()) {
    case 'MD5': return "'MD5'";
    case 'SHA-1':
    case 'SHA1': return "'SHA-1'";
    case 'SHA-256':
    case 'SHA256': return "'SHA-256'";
    case 'SHA-512':
    case 'SHA512': return "'SHA-512'";
    default:
      // SSDEEP / TLSH (STIX 2.1 hashing-algorithm-ov) and custom kinds
      // (IMPHASH, Authenticode) — still single-quoted for valid syntax.
      return `'${(kind || 'MD5').toUpperCase().replace(/'/g, "''")}'`;
  }
};

const toSTIX = (findings: IocFinding[]): string => {
  const now = new Date().toISOString();
  const obs = findings.map((f) => {
    const typeMap: Record<IocType, string> = {
      ipv4: 'ipv4-addr:value', ipv6: 'ipv6-addr:value', domain: 'domain-name:value',
      url: 'url:value', email: 'email-addr:value', hash: 'file:hashes.' + stixHashKey(f.hashKind),
      cve: 'vulnerability:name', filepath: 'file:name', registry: 'windows-registry-key:key',
      mutex: 'windows-service:mutex', jwt: 'x-iam:jwt', apikey: 'x-iam:apikey', awskey: 'x-iam:awskey',
      privatekey: 'x-iam:privatekey', bearer: 'x-iam:bearer', guid: 'x-iam:guid', btc: 'x-crypto:wallet',
      secret: 'x-iam:secret',
    };
    const name = typeMap[f.type] || 'x-custom:value';
    return {
      type: 'indicator',
      id: `indicator--${cryptoRandomUUID()}`,
      created: now,
      modified: now,
      name: `${f.type}: ${f.value}`,
      pattern: `[${name} = '${f.value.replace(/'/g, "''")}']`,
      pattern_type: 'stix',
      valid_from: now,
      labels: ['malicious-activity'],
      confidence: f.score === 'alta' ? 90 : f.score === 'media' ? 60 : f.score === 'baja' ? 30 : 10,
    };
  });
  const bundle = {
    type: 'bundle',
    id: `bundle--${cryptoRandomUUID()}`,
    objects: obs,
  };
  return JSON.stringify(bundle, null, 2);
};

const toKQL = (findings: IocFinding[]): string => {
  const ips = findings.filter((f) => f.type === 'ipv4' && f.score !== 'info').map((f) => f.value.split(/[:/]/)[0]);
  const domains = findings.filter((f) => f.type === 'domain' && f.score !== 'info').map((f) => f.value);
  const urls = findings.filter((f) => f.type === 'url' && f.score !== 'info').map((f) => f.value);
  const hashes = findings.filter((f) => f.type === 'hash').map((f) => f.value);
  const lines: string[] = [];
  if (ips.length) lines.push(`// IPs — pega en Sentinel/Microsoft Defender`);
  if (ips.length) lines.push(`DeviceNetworkEvents\n| where RemoteIP in ("${ips.join('", "')}")\n| summarize count() by RemoteIP, RemotePort`);
  if (domains.length) lines.push(`\n// Dominios\nDeviceNetworkEvents\n| where RemoteUrl has_any (${domains.map((d) => `"${d}"`).join(', ')})`);
  if (hashes.length) lines.push(`\n// Hashes\nDeviceProcessEvents\n| where SHA256 in ("${hashes.join('", "')}")\n| project Timestamp, DeviceName, FileName, SHA256`);
  if (urls.length) lines.push(`\n// URLs (filtering legitimate)\n${urls.map((u) => `// ${u}`).join('\n')}`);
  return lines.join('\n') || '// sin IoCs relevantes para KQL';
};

const toSPL = (findings: IocFinding[]): string => {
  const ips = findings.filter((f) => f.type === 'ipv4' && f.score !== 'info').map((f) => f.value.split(/[:/]/)[0]);
  const domains = findings.filter((f) => f.type === 'domain' && f.score !== 'info').map((f) => f.value);
  const hashes = findings.filter((f) => f.type === 'hash').map((f) => f.value);
  const urls = findings.filter((f) => f.type === 'url' && f.score !== 'info').map((f) => f.value);
  const lines: string[] = [];
  if (ips.length) lines.push(`index=* (src_ip="${ips.join(`" OR src_ip="`)}") | stats count by src_ip`);
  if (domains.length) lines.push(`\nindex=proxy (domain IN ("${domains.join('", "')}")) | stats count by domain`);
  if (hashes.length) lines.push(`\nindex=* (file_hash="${hashes.join(`" OR file_hash="`)}") | stats count by file_hash`);
  if (urls.length) lines.push(`\nindex=proxy url IN (${urls.map((u) => `"${u}"`).join(', ')}) | stats count by url`);
  return lines.join('\n') || '# sin IoCs relevantes para SPL';
};

/* Crypto-safe UUID (fallback to Math.random if crypto not avail) */
const cryptoRandomUUID = (): string => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* ignore */ }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
};

/* ---------- Main extraction routine ---------- */
const extractIoCs = (rawText: string, wl: Whitelist): IocFinding[] => {
  // 1. Normalize: refang defanged IoCs first
  const text = refang(rawText);

  const findings = new Map<string, IocFinding>();
  const add = (value: string, type: IocType, hashKind?: string) => {
    const key = type + '|' + value;
    const existing = findings.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      const { classification, score } = classify(type, value, wl);
      findings.set(key, {
        value, type, count: 1, context: getContext(text, value), classification, score, hashKind,
      });
    }
  };

  // AUDIT VN-D-006: IMPHASH (16 MD5s joined by '-'). These spans are scanned
  // BEFORE the generic patterns so the individual MD5 fragments inside them
  // can be suppressed below — one IMPHASH line must yield ONE consolidated
  // row, not 16 MD5 fragment rows + 1 IMPHASH row.
  const impRe = /\b(?:[a-fA-F0-9]{32}-){15}[a-fA-F0-9]{32}\b/g;
  const impHashSpans: Array<[number, number]> = [];
  let im: RegExpExecArray | null;
  while ((im = impRe.exec(text)) !== null) {
    impHashSpans.push([im.index, im.index + im[0].length]);
    add(im[0], 'hash', 'IMPHASH');
  }
  const inImpHashSpan = (idx: number): boolean =>
    impHashSpans.some(([s, e]) => idx >= s && idx < e);

  // Run each pattern (fresh RegExp copy with g flag so exec advances lastIndex)
  for (const type of Object.keys(PATTERNS) as Exclude<IocType, 'domain'>[]) {
    const re = new RegExp(PATTERNS[type].source, PATTERNS[type].flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      let value = m[0].trim();
      // apikey/secret capture groups
      if (type === 'apikey' || type === 'secret') {
        const grp = m[1] || m[0];
        value = grp;
      }
      // hash: validate charset + classify
      if (type === 'hash') {
        // AUDIT VN-D-006: skip hash matches that are MD5 fragments of an
        // IMPHASH — the whole span was already added as a single row above.
        if (inImpHashSpan(m.index)) continue;
        const kind = classifyHash(value);
        if (!kind) continue;
        add(value, type, kind);
        continue;
      }
      // AUDIT VN-D-011: post-validate the optional port (0-65535) and CIDR
      // (0-32). Out-of-range suffixes are trimmed so the IP itself is still
      // extracted instead of carrying an impossible port/CIDR.
      if (type === 'ipv4') {
        const cm = value.match(/\/(\d{1,2})$/);
        if (cm && cm.index !== undefined && Number(cm[1]) > 32) value = value.slice(0, cm.index);
        const pm = value.match(/:(\d{1,5})$/);
        if (pm && pm.index !== undefined && Number(pm[1]) > 65535) value = value.slice(0, pm.index);
      }
      // AUDIT VN-D-002: validate the full IPv6 candidate (compression rules
      // + embedded IPv4 tails) — rejects times, MACs and malformed runs.
      if (type === 'ipv6' && !isValidIpv6(value)) continue;
      // AUDIT VN-D-005: strip trailing sentence punctuation from URL
      // candidates (`http://malware.com/path.` -> `.../path`).
      if (type === 'url') {
        value = stripTrailingUrlPunct(value);
        if (!new RegExp('^https?://.+').test(value)) continue; // drop empty-host leftovers
      }
      // awskey already specific
      add(value, type);
    }
  }

  // Domains (filter out emails, URLs, whitelisted, invalid TLDs)
  const seenDomains = new Set<string>();
  let dm: RegExpExecArray | null;
  const dRe = new RegExp(DOMAIN_RE.source, 'g');
  while ((dm = dRe.exec(text)) !== null) {
    const dom = dm[0].toLowerCase();
    if (seenDomains.has(dom)) continue;
    seenDomains.add(dom);
    // skip if it's part of an email (contains @ before)
    const before = text.slice(Math.max(0, dm.index - 1), dm.index);
    if (before === '@') continue;
    // skip if inside a URL
    const lineStart = text.lastIndexOf('http', dm.index);
    if (lineStart >= 0 && dm.index < lineStart + 400) {
      const segment = text.slice(lineStart, dm.index + dom.length);
      if (new RegExp('^https?://[^\\s]*' + dom.replace(/\./g, '\\.')).test(segment)) continue;
    }
    if (!isValidTLD(dom)) continue;
    // AUDIT VN-D-001: 2-label domains must carry a curated real TLD —
    // evil.com / pwned.io pass, prose like file.txt / note.md doesn't.
    // 3+ label domains keep the looser isValidTLD check above.
    const labels = dom.split('.');
    if (labels.length === 2 && !TWO_LABEL_TLD_SET.has(labels[1])) continue;
    add(dom, 'domain');
  }

  return Array.from(findings.values()).sort((a, b) => {
    const order = { alta: 0, media: 1, baja: 2, info: 3 };
    return order[a.score] - order[b.score] || b.count - a.count;
  });
};

/* ---------- Small UI atoms (mirror ToolsView style) ---------- */
const inputCls = 'w-full bg-[#161616] border border-[#262626] rounded px-3 py-2 text-xs text-white font-mono placeholder:text-[#555] focus:outline-none focus:border-blue-500';
const taCls = inputCls + ' resize-y min-h-[140px]';

const CopyBtn: React.FC<{ text: string; label?: string }> = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-[#888] hover:text-blue-400 hover:bg-[#161616] transition-colors cursor-pointer shrink-0"
      title="Copiar"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {label && <span>{copied ? 'Copiado' : label}</span>}
    </button>
  );
};

const ExportBlock: React.FC<{ label: string; code: string; lang?: string }> = ({ label, code, lang }) => (
  <div className="bg-[#0A0A0A] border border-[#262626] rounded p-2.5">
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[10px] font-bold uppercase text-blue-400">{label}</span>
      <CopyBtn text={code} />
    </div>
    <pre className="font-mono text-[10px] text-green-300 whitespace-pre-wrap break-all">{code}</pre>
    {lang && <div className="text-[9px] text-[#444] uppercase mt-1">{lang}</div>}
  </div>
);

/* ---------- Whitelist editor modal ---------- */
const WhitelistModal: React.FC<{ wl: Whitelist; onSave: (wl: Whitelist) => void; onClose: () => void }> = ({ wl, onSave, onClose }) => {
  const [text, setText] = useState(wl.domains.join('\n'));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#0D0D0D] border-b border-[#262626] px-5 py-3 flex items-center justify-between">
          <div className="font-bold text-white text-sm flex items-center gap-2"><Settings className="w-4 h-4 text-blue-400" /> Whitelist de dominios legítimos</div>
          <button onClick={onClose} className="p-1 rounded text-[#666] hover:text-white hover:bg-[#161616] cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 text-xs text-[#E5E5E5]">
          <p className="text-[11px] text-[#888] leading-relaxed">
            Los dominios en esta lista se marcan como <span className="text-blue-300">Whitelist — dominio legítimo</span> y no generan ruido. Un dominio o cualquier subdominio suyo (ej. <code className="text-white">login.microsoftonline.com</code> cubre <code className="text-white">foo.login.microsoftonline.com</code>).
          </p>
          <textarea
            className={taCls + ' min-h-[300px]'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { onSave({ domains: text.split('\n').map((s) => s.trim()).filter(Boolean) }); onClose(); }}
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
            >Guardar whitelist</button>
            <button
              onClick={() => setText(DEFAULT_WHITELIST_DOMAINS.join('\n'))}
              className="px-3 py-1.5 rounded text-[#888] hover:text-white text-xs cursor-pointer"
            >Restaurar defaults</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- Online enrichment helpers (Block 6) ---------- */

// IOC types that are eligible for online enrichment (mirrors EnrichableIocType).
// Other types (email, cve, filepath, jwt, etc.) are NOT enriched — they could
// leak sensitive data to third parties and the providers don't support them.
const ENRICHABLE_TYPES: ReadonlySet<string> = new Set(['ipv4', 'ipv6', 'domain', 'url', 'hash']);
const isEnrichable = (t: IocType): t is EnrichableIocType =>
  ENRICHABLE_TYPES.has(t);

// Stable key for per-(provider, ioc, value) enrichment state.
const enrichKey = (provider: ProviderId, type: EnrichableIocType, value: string): string =>
  `${provider}:${type}:${value}`;

// Format an ISO timestamp as a short, locale-aware string. Falls back to the
// raw string if Date can't parse it. Never throws.
const formatTs = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
};

// High-level status derived from the EnrichResult tagged union. Used by the
// StatusBadge to render the right color/label without re-implementing the
// discriminated-union switch at every call site.
type EnrichStatus = 'idle' | 'loading' | 'success' | 'cached' | 'error';
const getStatus = (result: EnrichResult | undefined, loading: boolean): EnrichStatus => {
  if (loading) return 'loading';
  if (!result) return 'idle';
  if (result.ok && 'cached' in result && result.cached) return 'cached';
  if (result.ok) return 'success';
  // consent_missing is handled by the ConsentModal — the row stays 'idle'.
  if (!result.ok && 'retry' in result) return 'idle';
  return 'error';
};

const StatusBadge: React.FC<{ status: EnrichStatus }> = ({ status }) => {
  const map: Record<EnrichStatus, { cls: string; label: string }> = {
    idle:    { cls: 'bg-[#161616] text-[#666] border-[#262626]', label: 'idle' },
    loading: { cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30', label: 'querying…' },
    success: { cls: 'bg-green-500/15 text-green-300 border-green-500/30', label: 'success' },
    cached:  { cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30', label: 'cached' },
    error:   { cls: 'bg-red-500/15 text-red-300 border-red-500/30', label: 'error' },
  };
  const m = map[status];
  return <span className={`text-[9px] px-1.5 py-0.5 rounded border ${m.cls}`}>{m.label}</span>;
};

// Renders the uniform ProviderResult body: metric chips (malicious/total,
// confidence, pulses, ports), summary text, and a compact facts definition
// list. All values are pre-sanitized by the client layer (client.ts) — we
// render them as text only, never as HTML.
const ProviderResultBody: React.FC<{ r: ProviderResult }> = ({ r }) => {
  const facts = r.facts ?? [];
  const hasMetrics =
    r.malicious !== undefined ||
    r.total !== undefined ||
    r.confidence !== undefined ||
    r.pulses !== undefined ||
    (r.ports !== undefined && r.ports.length > 0);
  return (
    <div className="space-y-1">
      {hasMetrics && (
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          {r.malicious !== undefined && (
            <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20">
              malicious: {r.malicious}{r.total !== undefined ? `/${r.total}` : ''}
            </span>
          )}
          {r.confidence !== undefined && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
              confidence: {r.confidence}%
            </span>
          )}
          {r.pulses !== undefined && (
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
              pulses: {r.pulses}
            </span>
          )}
          {r.ports !== undefined && r.ports.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              ports: {r.ports.join(', ')}
            </span>
          )}
        </div>
      )}
      {r.summary && (
        <div className="text-[10px] text-[#CCC] leading-relaxed break-all">{r.summary}</div>
      )}
      {facts.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[10px]">
          {facts.map((f, i) => (
            <React.Fragment key={i}>
              <dt className="text-[#666]">{f.label}</dt>
              <dd className="text-[#CCC] font-mono break-all">{f.value}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}
    </div>
  );
};

// One row per provider inside the EnrichmentSection. Renders provider label +
// status badge + [Refresh] + (cached hit | fresh success | error message).
// NEVER renders raw stack traces — errors are surfaced via toUserMessage.
const ProviderResultRow: React.FC<{
  provider: ProviderId;
  result?: EnrichResult;
  loading: boolean;
  onRefresh: () => void;
}> = ({ provider, result, loading, onRefresh }) => {
  const meta = PROVIDER_META[provider];
  const status = getStatus(result, loading);
  // Defensive: parent already filters, but skip render when there's nothing to show.
  if (!result && !loading) return null;
  // consent_missing is handled globally by the ConsentModal — don't render a row.
  if (result && !result.ok && 'retry' in result) return null;
  return (
    <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded px-2 py-1.5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-bold text-white">{meta.label}</span>
        <StatusBadge status={status} />
        <button
          onClick={onRefresh}
          disabled={loading}
          className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-[#888] hover:text-blue-400 hover:bg-[#161616] transition-colors cursor-pointer disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-2.5 h-2.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>
      {/* Cached hit — show cached result + retrievedAt + [Refresh] forces a re-fetch. */}
      {result && result.ok && 'cached' in result && result.cached && (
        <div className="space-y-1">
          <div className="text-[10px] text-amber-300 flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" /> Cached result available
          </div>
          <ProviderResultBody r={result.result} />
          <div className="text-[9px] text-[#555] font-mono">retrieved: {formatTs(result.retrievedAt)}</div>
        </div>
      )}
      {/* Fresh success — show the just-fetched result. */}
      {result && result.ok && !('cached' in result) && (
        <div className="space-y-1">
          <ProviderResultBody r={result.result} />
          <div className="text-[9px] text-[#555] font-mono">retrieved: {formatTs(result.result.retrievedAt)}</div>
        </div>
      )}
      {/* Error — short actionable message, NEVER stack traces or raw HTTP bodies. */}
      {result && !result.ok && !('retry' in result) && (
        <div className="text-[10px] text-red-300">{toUserMessage(result.error)}</div>
      )}
    </div>
  );
};

// The Online Enrichment sub-section. Visually distinct (border-top, indented)
// from the local analysis above it. Per spec #9: online results are CLEARLY
// SEPARATED from local analysis. Per spec #14: external links stay in their
// own row ABOVE this section (handled by the parent render).
const EnrichmentSection: React.FC<{
  finding: { type: EnrichableIocType; value: string };
  results: Record<string, EnrichResult>;
  loading: Record<string, boolean>;
  online: boolean;
  onEnrich: (provider: ProviderId, type: EnrichableIocType, value: string, forceRefresh?: boolean) => void;
}> = ({ finding, results, loading, online, onEnrich }) => {
  const providers = providersForIocType(finding.type);
  return (
    <div className="border-t border-[#1a1a1a] mt-2 pt-2 ml-6">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400">Online Enrichment</span>
        {online ? (
          <span className="flex items-center gap-1 text-[9px] text-green-400">
            <Wifi className="w-2.5 h-2.5" /> Online
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[9px] text-red-400">
            <WifiOff className="w-2.5 h-2.5" /> Offline — enrichment disabled
          </span>
        )}
      </div>
      <div className="flex gap-1 flex-wrap mb-1.5">
        {providers.map((p) => {
          const key = enrichKey(p, finding.type, finding.value);
          const isLoading = !!loading[key];
          return (
            <button
              key={p}
              onClick={() => onEnrich(p, finding.type, finding.value)}
              disabled={!online || isLoading}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-[#161616] border border-[#262626] text-blue-400 hover:border-blue-500/40 hover:bg-blue-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Search className="w-2.5 h-2.5" />}
              Enrich {PROVIDER_META[p].label}
            </button>
          );
        })}
      </div>
      {providers.map((p) => {
        const key = enrichKey(p, finding.type, finding.value);
        const result = results[key];
        const isLoading = !!loading[key];
        if (!result && !isLoading) return null;
        return (
          <ProviderResultRow
            key={p}
            provider={p}
            result={result}
            loading={isLoading}
            onRefresh={() => onEnrich(p, finding.type, finding.value, true)}
          />
        );
      })}
    </div>
  );
};

// First-run privacy warning modal (spec #13). Shown when enrichWithProvider
// returns ConsentMissingOutcome. Single shared instance at the top level —
// not per finding. Same z-index + backdrop pattern as WhitelistModal.
const ConsentModal: React.FC<{
  onContinue: () => void;
  onCancel: () => void;
}> = ({ onContinue, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onCancel}>
    <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="px-5 py-3 border-b border-[#262626] flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <div className="font-bold text-white text-sm">Online enrichment</div>
      </div>
      <div className="p-5 space-y-3 text-xs text-[#E5E5E5]">
        <p className="text-[11px] text-[#BBB] leading-relaxed">
          Online enrichment sends the selected IOC to the configured third-party provider.
          Results are cached locally so you don&apos;t re-query the same IOC.
          API keys are stored locally on this device. No backend is involved.
        </p>
      </div>
      <div className="px-5 py-3 border-t border-[#262626] flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded text-[#888] hover:text-white text-xs cursor-pointer"
        >Cancel</button>
        <button
          onClick={onContinue}
          className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
        >Continue</button>
      </div>
    </div>
  </div>
);

/* ---------- Main component ---------- */
export const IocExtractorView: React.FC = () => {
  const [text, setText] = useState('');
  const [findings, setFindings] = useState<IocFinding[]>([]);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [defangOn, setDefangOn] = useState(false);
  const [whitelist, setWhitelist] = useState<Whitelist>(loadWhitelist);
  const [showWhitelist, setShowWhitelist] = useState(false);
  const [showExports, setShowExports] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // ---- Block 6 — online enrichment state ----
  // Per-(provider, ioc, value) enrichment outcomes (EnrichResult tagged union).
  // Keyed by `enrichKey()` so the same IOC enriched via two providers tracks
  // two independent outcomes. Persists across re-renders; cleared on unmount.
  const [enrichResults, setEnrichResults] = useState<Record<string, EnrichResult>>({});
  // Per-key in-flight flag — drives the per-button spinner + disables the button.
  const [enrichLoading, setEnrichLoading] = useState<Record<string, boolean>>({});
  // First-run consent gate — when set, ConsentModal renders. Carries the
  // retry() fn from ConsentMissingOutcome plus the key to file the eventual
  // outcome under. Single shared instance (not per finding).
  const [pendingConsent, setPendingConsent] = useState<{
    retry: () => Promise<EnrichResult>;
    key: string;
  } | null>(null);
  const isOnline = useIsOnline();

  // ---- Online enrichment handlers ----
  // Sole entry point: enrichWithProvider. NEVER calls fetch directly, never
  // bypasses consent / cache / rate-limit / activity-log. All async wrapped
  // in try/catch — failures are non-fatal (stored as a synthetic error outcome
  // so the per-provider row still renders instead of crashing the view).
  const handleEnrich = useCallback(async (
    provider: ProviderId,
    type: EnrichableIocType,
    value: string,
    forceRefresh = false,
  ) => {
    const key = enrichKey(provider, type, value);
    setEnrichLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const result = await enrichWithProvider(provider, type, value, { forceRefresh });
      // Consent gate: don't store a row outcome — show the modal + stash retry.
      if (!result.ok && 'retry' in result) {
        setPendingConsent({ retry: result.retry, key });
        return;
      }
      setEnrichResults((prev) => ({ ...prev, [key]: result }));
    } catch (e) {
      // Non-fatal: surface a synthetic error outcome so the row renders.
      console.error('enrichment failed', e);
      setEnrichResults((prev) => ({
        ...prev,
        [key]: { ok: false, error: { kind: 'unknown', detail: String(e) } },
      }));
    } finally {
      setEnrichLoading((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }, []);

  // User clicked [Continue] on the ConsentModal — grant consent, then run the
  // stashed retry() (which re-issues the exact same enrichWithProvider call,
  // now with consent granted so it goes through the full flow).
  const handleConsentContinue = useCallback(async () => {
    const pending = pendingConsent;
    setPendingConsent(null);
    if (!pending) return;
    grantOnlineConsent();
    setEnrichLoading((prev) => ({ ...prev, [pending.key]: true }));
    try {
      const outcome = await pending.retry();
      // Edge case: consent grant failed silently (e.g. localStorage blocked) —
      // re-trigger the modal so the user can try again or cancel.
      if (!outcome.ok && 'retry' in outcome) {
        setPendingConsent({ retry: outcome.retry, key: pending.key });
        return;
      }
      setEnrichResults((prev) => ({ ...prev, [pending.key]: outcome }));
    } catch (e) {
      console.error('consent retry failed', e);
      setEnrichResults((prev) => ({
        ...prev,
        [pending.key]: { ok: false, error: { kind: 'unknown', detail: String(e) } },
      }));
    } finally {
      setEnrichLoading((prev) => {
        const next = { ...prev };
        delete next[pending.key];
        return next;
      });
    }
  }, [pendingConsent]);

  const handleConsentCancel = useCallback(() => {
    setPendingConsent(null);
  }, []);

  // Cross-tool hand-off: when another tool (Log Parser, PowerShell Analyzer,
  // Command Line Analyzer, …) calls `useIocStore.getState().setPendingText(...)`,
  // we pick it up here, seed the textarea and trigger extraction. The store
  // value is cleared right after — never persisted, never sent anywhere.
  const pendingIocText = useIocStore((s) => s.pendingText);
  const setIocPendingText = useIocStore((s) => s.setPendingText);
  useEffect(() => {
    if (pendingIocText !== null) {
      setText(pendingIocText);
      setIocPendingText(null);
      // Run extraction immediately against the override text so we don't
      // depend on the React state having re-rendered yet.
      setTimeout(() => runRef.current?.(pendingIocText), 0);
    }
  }, [pendingIocText, setIocPendingText]);

  // Keep a ref of `run` so the effect above can trigger extraction without
  // re-running every time `text`/`whitelist` change.
  const runRef = useRef<(overrideText?: string) => void>(() => {});
  useEffect(() => { saveWhitelist(whitelist); }, [whitelist]);

  const run = useCallback((overrideText?: string) => {
    const work = overrideText ?? text;
    if (!work.trim()) { setFindings([]); return; }
    setBusy(true);
    // Defer to avoid freezing on big files
    setTimeout(() => {
      try {
        const result = extractIoCs(work, whitelist);
        setFindings(result);
      } catch (e) {
        console.error('IoC extraction failed', e);
      } finally {
        setBusy(false);
      }
    }, 30);
  }, [text, whitelist]);

  // Keep the cross-tool hand-off ref pointing at the latest `run`.
  useEffect(() => { runRef.current = run; }, [run]);

  const onFile = useCallback(async (file: File) => {
    if (!file) return;
    setBusy(true);
    try {
      // Read as text. PDFs won't parse but we attempt; binary will just yield garbage — we strip.
      const buf = await file.arrayBuffer();
      let content: string;
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        // crude PDF text extraction: find text between BT...ET and parentheses
        const raw = new TextDecoder('latin1').decode(buf);
        const matches = raw.match(/\(([^()\\]{2,})\)/g) || [];
        content = matches.map((m) => m.slice(1, -1)).join(' ').replace(/\\\w/g, ' ');
      } else {
        content = new TextDecoder('utf-8').decode(buf);
      }
      setText(content.slice(0, 5_000_000)); // cap at 5MB in the textarea
    } catch (e) {
      console.error('file read failed', e);
    } finally {
      setBusy(false);
    }
  }, []);

  const filtered = useMemo(() => {
    if (!filter.trim()) return findings;
    const t = filter.toLowerCase();
    return findings.filter((f) => f.value.toLowerCase().includes(t) || f.type.includes(t) || f.classification.toLowerCase().includes(t));
  }, [findings, filter]);

  const counts = useMemo(() => {
    const m = new Map<IocType, number>();
    for (const f of findings) m.set(f.type, (m.get(f.type) || 0) + 1);
    return m;
  }, [findings]);

  const displayValue = (v: string) => defangOn ? defang(v) : v;

  const copyAll = (fmt: 'tsv' | 'csv' | 'json' | 'stix' | 'kql' | 'spl') => {
    let out = '';
    if (fmt === 'tsv') out = toTSV(findings);
    else if (fmt === 'csv') out = toCSV(findings);
    else if (fmt === 'json') out = toJSON(findings);
    else if (fmt === 'stix') out = toSTIX(findings);
    else if (fmt === 'kql') out = toKQL(findings);
    else if (fmt === 'spl') out = toSPL(findings);
    navigator.clipboard?.writeText(out);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[11px] text-[#888] flex-1 min-w-[200px]">
          Extractor SOC Tier1/2 + IAM. Pega logs, alertas, emails o sube un archivo. Refang automático, validación, dedup, contexto y scoring. 100% offline.
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowHowItWorks(!showHowItWorks)} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer">
            <BookOpen className="w-3 h-3" /> ¿Cómo funciona?
          </button>
          <button onClick={() => setShowWhitelist(true)} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer">
            <Settings className="w-3 h-3" /> Whitelist ({whitelist.domains.length})
          </button>
        </div>
      </div>

      {showHowItWorks && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-md p-3 space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Cómo funciona — pipeline SOC completo</div>
          <ol className="space-y-2 text-[11px] text-[#BBB] leading-relaxed list-decimal pl-4">
            <li><b className="text-white">Refang automático.</b> Los reportes reales defangan IoCs: <code className="text-green-300">hxxp://malware[.]com</code>, <code className="text-green-300">malware(.)com</code>, <code className="text-green-300">[:]</code>. Antes de extraer se restauran a forma real: <code className="text-green-300">http://malware.com</code>.</li>
            <li><b className="text-white">Extracción con regex específicos.</b> Cada tipo de IoC tiene su patrón: IPv4 con puerto y CIDR, IPv6, dominio (incluido <code className="text-green-300">xn--</code> punycode), URL completa con path/query/fragment, email, hashes (MD5/SHA-1/SHA-256/SHA-512 + SSDEEP/IMPHASH/TLSH/Authenticode), rutas Windows <code className="text-green-300">C:\Users\...\%APPDATA%</code> y Linux <code className="text-green-300">/etc/passwd</code>, registry keys, mutex, CVE, JWT, AWS keys <code className="text-green-300">AKIA…</code>, bearer tokens, GUIDs de Entra ID, wallets BTC, y secretos en claro (<code className="text-green-300">password=</code>, <code className="text-green-300">client_secret=</code>).</li>
            <li><b className="text-white">Validación agresiva.</b> Descarta IPs privadas (10.x, 192.168.x, 172.16-31.x, 127.x, 169.254.x, 0.0.0.0, 255.255.255.255), dominios sin TLD válido, hashes con charset no hexadecimal, y todo lo que esté en la whitelist editable (microsoft.com, login.microsoftonline.com, *.sharepoint.com, *.okta.com…).</li>
            <li><b className="text-white">Dedup + contador + contexto.</b> Si <code className="text-green-300">malware.com</code> aparece 20 veces, se muestra 1 vez con <code className="text-white">×20</code> y 40 caracteres de contexto a cada lado — oro para Tier 1.</li>
            <li><b className="text-white">Clasificación + scoring automático.</b> Etiqueta cada IoC: <span className="text-red-300">IP Pública — investigar</span>, <span className="text-blue-300">IP Privada — Ignorar</span>, <span className="text-blue-300">Whitelist — dominio legítimo</span>, <span className="text-red-300">URL con binario — alta sospecha</span>, <span className="text-red-300">CREDENTIAL LEAK P1</span> (AWS keys, private keys, bearer, secretos en claro), <span className="text-red-300">Punycode — sospechoso (phishing)</span>.</li>
            <li><b className="text-white">Enriquecimiento 1-clic.</b> Botones al lado de cada IoC abren la búsqueda en <b>VirusTotal</b>, <b>AbuseIPDB</b>, <b>Shodan</b>, <b>OTX</b>, <b>NVD/MITRE</b>, <b>HaveIBeenPwned</b>. No se consulta automáticamente — tú decides, así no quemas API keys.</li>
            <li><b className="text-white">Output listo para trabajar.</b> Botón <b>Exports</b> genera: tabla TSV/CSV para Excel, JSON, <b>STIX 2.1</b> para tu TIP, y <b>KQL</b> y <b>SPL</b> listos para pegar en Sentinel/Splunk — te ahorra 10 min por alerta.</li>
            <li><b className="text-white">Defang ON/OFF.</b> Toggle para copiar <code className="text-green-300">hxxp://malware[.]com</code> al compartir el reporte sin que nadie haga clic.</li>
          </ol>
          <div className="bg-[#0A0A0A] border border-[#262626] rounded p-2.5 space-y-1.5">
            <div className="text-[10px] font-bold uppercase text-amber-400">Limitaciones honestas</div>
            <ul className="list-disc pl-4 text-[10px] text-[#888] space-y-0.5">
              <li>Un hash hex de 32 chars podría no ser MD5 — verifica contexto. SSDEEP y TLSH tienen formatos propios.</li>
              <li>Las rutas de archivo y mutex pueden generar falsos positivos en texto natural.</li>
              <li>La correlación IAM (Impossible Travel / Token Theft) requiere metadata de geolocalización que un extractor de texto no tiene — impórtala en tu SIEM.</li>
              <li>PDFs: extracción de texto cruda (paréntesis del content stream). Para PDFs complejos copia-pega el texto.</li>
              <li>OCR de imágenes no soportado en modo 100% offline.</li>
            </ul>
          </div>
        </div>
      )}

      <div className="flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <textarea className={taCls + ' min-h-[180px]'} value={text} onChange={(e) => setText(e.target.value)} placeholder="Pega logs de Sentinel/Splunk, email, alerta, artículo de threat intel, .eml, JSON..." />
        </div>
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        <button onClick={() => run()} disabled={busy} className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
          {busy ? <><Cpu className="w-3.5 h-3.5 animate-pulse" /> Procesando…</> : <><Search className="w-3.5 h-3.5" /> Extraer IoCs</>}
        </button>
        <input ref={fileRef} type="file" accept=".txt,.log,.eml,.json,.csv,.xml,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <button onClick={() => fileRef.current?.click()} className="px-3 py-1.5 rounded bg-[#161616] border border-[#262626] hover:border-blue-500/40 text-[#CCC] text-xs cursor-pointer flex items-center gap-1.5">
          <FileUp className="w-3.5 h-3.5" /> Subir archivo
        </button>
        <button onClick={() => { setText(''); setFindings([]); }} className="px-3 py-1.5 rounded text-[#888] hover:text-white text-xs cursor-pointer flex items-center gap-1.5">
          <Trash2 className="w-3.5 h-3.5" /> Limpiar
        </button>
        <label className="flex items-center gap-1.5 text-[10px] text-[#888] cursor-pointer ml-auto">
          <input type="checkbox" checked={defangOn} onChange={(e) => setDefangOn(e.target.checked)} className="accent-amber-500" />
          <Shield className="w-3 h-3 text-amber-400" /> Defang al mostrar
        </label>
      </div>

      {findings.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-green-400">{findings.length} IoC(s) único(s) — {findings.reduce((a, b) => a + b.count, 0)} ocurrencias totales</span>
          <button onClick={() => setShowExports(!showExports)} className="ml-auto px-2 py-1 rounded text-[10px] text-blue-400 hover:bg-blue-500/10 cursor-pointer flex items-center gap-1">
            <Database className="w-3 h-3" /> {showExports ? 'Ocultar exports' : 'Mostrar exports'}
          </button>
        </div>
      )}

      {showExports && findings.length > 0 && (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => copyAll('tsv')} className="px-2.5 py-1 rounded bg-[#161616] border border-[#262626] hover:border-blue-500/40 text-[10px] text-[#CCC] cursor-pointer">Copiar TSV (Excel)</button>
            <button onClick={() => copyAll('csv')} className="px-2.5 py-1 rounded bg-[#161616] border border-[#262626] hover:border-blue-500/40 text-[10px] text-[#CCC] cursor-pointer">Copiar CSV</button>
            <button onClick={() => copyAll('json')} className="px-2.5 py-1 rounded bg-[#161616] border border-[#262626] hover:border-blue-500/40 text-[10px] text-[#CCC] cursor-pointer">Copiar JSON</button>
            <button onClick={() => copyAll('stix')} className="px-2.5 py-1 rounded bg-[#161616] border border-[#262626] hover:border-blue-500/40 text-[10px] text-[#CCC] cursor-pointer">Copiar STIX 2.1</button>
            <button onClick={() => copyAll('kql')} className="px-2.5 py-1 rounded bg-[#161616] border border-[#262626] hover:border-blue-500/40 text-[10px] text-[#CCC] cursor-pointer">Copiar KQL (Sentinel)</button>
            <button onClick={() => copyAll('spl')} className="px-2.5 py-1 rounded bg-[#161616] border border-[#262626] hover:border-blue-500/40 text-[10px] text-[#CCC] cursor-pointer">Copiar SPL (Splunk)</button>
          </div>
          <ExportBlock label="KQL — pega en Sentinel" code={toKQL(findings)} lang="kusto" />
          <ExportBlock label="SPL — pega en Splunk" code={toSPL(findings)} lang="spl" />
          <ExportBlock label="STIX 2.1 bundle" code={toSTIX(findings)} lang="json" />
        </div>
      )}

      {findings.length > 0 && (
        <input className={inputCls} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar resultados por valor, tipo o clasificación…" />
      )}

      {/* Results table */}
      {filtered.length > 0 && (
        <div className="space-y-1.5 max-h-[520px] overflow-y-auto">
          {filtered.map((f, i) => {
            const links = enrichmentLinks(f.type, f.value);
            const icon = typeIcon(f.type);
            return (
              <div key={f.type + i + f.value} className="bg-[#0D0D0D] border border-[#262626] rounded p-2.5 hover:border-[#333] transition-colors">
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="text-[#666] mt-0.5 shrink-0">{icon}</span>
                  <span className={`font-mono text-[11px] flex-1 min-w-0 break-all ${f.score === 'alta' ? 'text-red-300' : f.score === 'media' ? 'text-amber-300' : 'text-[#CCC]'}`}>
                    {displayValue(f.value)}
                    {f.hashKind && <span className="ml-2 text-[9px] text-purple-400 font-sans">{f.hashKind}</span>}
                    {f.count > 1 && <span className="ml-2 text-[9px] text-[#666] font-sans">×{f.count}</span>}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border shrink-0 ${scoreColor(f.score)}`}>{f.score}</span>
                  <CopyBtn text={defangOn ? defang(f.value) : f.value} />
                </div>
                <div className="text-[10px] text-[#888] mt-1 ml-6">
                  <span className="text-[#666] uppercase mr-1.5">{f.type}</span>
                  {f.classification}
                </div>
                {f.context && (
                  <div className="text-[10px] text-[#666] mt-0.5 ml-6 font-mono bg-[#0A0A0A] border border-[#1A1A1A] rounded px-2 py-1 break-all">
                    {f.context}
                  </div>
                )}
                {links.length > 0 && (
                  <div className="flex gap-1 mt-1.5 ml-6 flex-wrap">
                    {links.map((l) => (
                      <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] bg-[#161616] border border-[#262626] text-blue-400 hover:border-blue-500/40 hover:bg-blue-500/10 transition-colors">
                        {l.label} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ))}
                  </div>
                )}
                {/* Online Enrichment sub-section (Block 6).
                    Per spec #9: CLEARLY SEPARATED from the local analysis above
                    (border-top + indented + own subheader).
                    Per spec #14: external links row stays ABOVE this section as
                    the always-available, no-API-key fallback. */}
                {isEnrichable(f.type) && (
                  <EnrichmentSection
                    finding={{ type: f.type, value: f.value }}
                    results={enrichResults}
                    loading={enrichLoading}
                    online={isOnline}
                    onEnrich={handleEnrich}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {!busy && text.trim() && findings.length === 0 && (
        <p className="text-xs text-[#666] italic">No se encontraron IoCs. Recuerda: el extractor hace refang automático (hxxp→http, [.]→.).</p>
      )}

      {/* Type counts summary */}
      {findings.length > 0 && (
        <div className="flex gap-1.5 flex-wrap text-[9px] text-[#666] border-t border-[#1A1A1A] pt-2">
          {Array.from(counts.entries()).map(([type, n]) => (
            <span key={type} className="px-1.5 py-0.5 rounded bg-[#0D0D0D] border border-[#1A1A1A]">{type}: {n}</span>
          ))}
        </div>
      )}

      {showWhitelist && (
        <WhitelistModal wl={whitelist} onSave={setWhitelist} onClose={() => setShowWhitelist(false)} />
      )}
      {pendingConsent && (
        <ConsentModal onContinue={handleConsentContinue} onCancel={handleConsentCancel} />
      )}
    </div>
  );
};

/* ---------- Icon per IoC type ---------- */
const typeIcon = (t: IocType): React.ReactNode => {
  switch (t) {
    case 'ipv4': case 'ipv6': return <Network className="w-3 h-3 text-emerald-400" />;
    case 'domain': return <Globe className="w-3 h-3 text-amber-400" />;
    case 'url': return <Globe className="w-3 h-3 text-blue-400" />;
    case 'email': return <FileText className="w-3 h-3 text-pink-400" />;
    case 'hash': return <Cpu className="w-3 h-3 text-purple-400" />;
    case 'cve': return <Bug className="w-3 h-3 text-red-400" />;
    case 'filepath': return <FileText className="w-3 h-3 text-teal-400" />;
    case 'registry': return <Database className="w-3 h-3 text-yellow-400" />;
    case 'mutex': return <Shield className="w-3 h-3 text-orange-400" />;
    case 'jwt': return <KeyRound className="w-3 h-3 text-cyan-400" />;
    case 'apikey': case 'awskey': case 'privatekey': case 'bearer': case 'secret':
      return <ShieldAlert className="w-3 h-3 text-red-400" />;
    case 'guid': return <KeyRound className="w-3 h-3 text-indigo-400" />;
    case 'btc': return <Database className="w-3 h-3 text-orange-400" />;
    default: return <Terminal className="w-3 h-3 text-[#666]" />;
  }
};
