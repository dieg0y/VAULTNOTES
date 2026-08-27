import Fuse, { type FuseResultMatch } from 'fuse.js';
import { Note, Lab, GlossaryTerm, ReferenceItem } from '../types';
import { HTTP_STATUSES, HttpStatusInfo } from '../data/httpStatusData';
import { PORTS, PortInfo } from '../data/portsData';
import { WIN_EVENTS, WinEventInfo } from '../data/winEventsData';
import { CRON_EXAMPLES, CronExample } from '../data/cronData';
import { MITRE_TECHNIQUES, MitreTechnique } from '../data/mitreData';
import { SIGMA_RULES, SigmaRule } from '../data/sigmaData';
import { DETECTION_PRESETS, DetectionPreset } from '../data/detectionPresets';
import { KNOWN_RIDS, WELL_KNOWN_SIDS, KNOWN_SID_AUTHORITIES, KnownRid, WellKnownSid, KnownSidAuthority } from '../data/sidRidData';
import { TOOLS_CATALOG, type ToolId } from '../data/toolsCatalog';

export interface SearchMatchDetail {
  field: string;
  label: string;
  value: string;
}

export type SearchResultType =
  | 'note'
  | 'lab'
  | 'glossary'
  | 'reference'
  | 'tool-http'
  | 'tool-port'
  | 'tool-winevent'
  | 'tool-cron'
  | 'tool-mitre'
  | 'tool-sigma'
  // BLOQUE 5 — extended search coverage:
  | 'tool-detection-query'   // Detection presets (KQL/SPL helpers)
  | 'tool-sid-rid'           // KNOWN_RIDS + WELL_KNOWN_SIDS + KNOWN_SID_AUTHORITIES
  | 'tool-cvss'              // CVSS metric codes (lookup-style navigation)
  | 'tool'                   // the tool catalog itself (search-as-you-type "open X")
  | 'command';               // command palette entries (new note, open trash, …)

export interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  snippet: string;
  platform?: string;
  category?: string;
  tools?: string[];
  sourceUrl?: string;
  status?: string;
  matchedFields?: SearchMatchDetail[];
  highlightedTitle?: string;
  highlightedSnippet?: string;
  /** For 'command' results: the command key the modal dispatches. */
  commandId?: string;
  rawItem: Note | Lab | GlossaryTerm | ReferenceItem | HttpStatusInfo | PortInfo | WinEventInfo | CronExample | MitreTechnique | SigmaRule | DetectionPreset | KnownRid | WellKnownSid | KnownSidAuthority | ToolCatalogEntry | CommandEntry;
}

/** Lightweight shape of a tool catalog entry (avoids circular imports). */
export interface ToolCatalogEntry {
  id: ToolId;
  name: string;
  cat: string;
  desc: string;
  tags?: string[];
}

/** A synthetic command palette entry (spec items #7). */
export interface CommandEntry {
  id: string;
  label: string;
  hint?: string;
  /** keyword triggers — matched case-insensitively against the user query. */
  keywords: string[];
  commandId: string;
}

interface SearchDocument {
  id: string;
  type: SearchResultType;
  title: string;
  acronym: string;
  platform: string;
  category: string;
  tools: string;
  sourceUrl: string;
  content: string;
  subtitle: string;
  status?: string;
  commandId?: string;
  rawItem: Note | Lab | GlossaryTerm | ReferenceItem | HttpStatusInfo | PortInfo | WinEventInfo | CronExample | MitreTechnique | SigmaRule | DetectionPreset | KnownRid | WellKnownSid | KnownSidAuthority | ToolCatalogEntry | CommandEntry;
}

/** Parsed query: filter tokens + the remaining free-text search term. */
interface ParsedQuery {
  typeFilter?: string;       // e.g. 'note', 'lab', 'mitre', 'sigma'
  tagFilter?: string;        // e.g. 'soc', 'windows', 'powershell'
  platformFilter?: string;   // e.g. 'windows', 'linux'
  text: string;              // remaining free-text search
}

/**
 * Parse a raw query like "type:note kerberos" or "tag:soc platform:windows powershell"
 * into a structured ParsedQuery. Tokens are matched case-insensitively at the
 * START of each whitespace-separated token; everything else goes into `text`.
 */
function parseQuery(raw: string): ParsedQuery {
  const result: ParsedQuery = { text: '' };
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const textParts: string[] = [];
  for (const tok of tokens) {
    const m = tok.match(/^([a-z]+):(.*)$/i);
    if (m) {
      const key = m[1].toLowerCase();
      const val = m[2];
      if (key === 'type') result.typeFilter = val.toLowerCase();
      else if (key === 'tag') result.tagFilter = val.toLowerCase();
      else if (key === 'platform') result.platformFilter = val.toLowerCase();
      else textParts.push(tok);
    } else {
      textParts.push(tok);
    }
  }
  result.text = textParts.join(' ');
  return result;
}

/** Maps a user-provided `type:` value to a list of SearchResultType strings. */
function typeFilterToTypes(t: string): SearchResultType[] | null {
  const map: Record<string, SearchResultType[]> = {
    note: ['note'],
    notes: ['note'],
    apunte: ['note'],
    apuntes: ['note'],
    lab: ['lab'],
    labs: ['lab'],
    glossary: ['glossary'],
    glosario: ['glossary'],
    term: ['glossary'],
    referencia: ['reference'],
    reference: ['reference'],
    references: ['reference'],
    http: ['tool-http'],
    port: ['tool-port'],
    ports: ['tool-port'],
    winevent: ['tool-winevent'],
    event: ['tool-winevent'],
    events: ['tool-winevent'],
    cron: ['tool-cron'],
    mitre: ['tool-mitre'],
    attack: ['tool-mitre'],
    sigma: ['tool-sigma'],
    detection: ['tool-detection-query'],
    'detection-query': ['tool-detection-query'],
    sid: ['tool-sid-rid'],
    rid: ['tool-sid-rid'],
    'sid-rid': ['tool-sid-rid'],
    cvss: ['tool-cvss'],
    tool: ['tool'],
    tools: ['tool'],
    command: ['command'],
    cmd: ['command'],
  };
  return map[t] || null;
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightMatches(text: string, query: string): string {
  if (!text || !query.trim()) return escapeHtml(text);
  const safeText = escapeHtml(text);
  const regex = new RegExp(`(${escapeRegExp(escapeHtml(query))})`, 'gi');
  return safeText.replace(regex, '<mark class="bg-yellow-400 text-black px-1 py-0.5 rounded font-semibold">$1</mark>');
}

/**
 * Build a reference search document from a ReferenceItem.
 */
function buildReferenceDoc(r: ReferenceItem): SearchDocument {
  return {
    id: r.id,
    type: 'reference',
    title: r.title,
    acronym: '',
    platform: r.type,
    category: (r.tags || []).join(' '),
    tools: '',
    sourceUrl: r.url || '',
    content: [r.description, r.url, ...(r.tags || [])].join(' '),
    subtitle: `Referencia • ${r.type}${r.tags && r.tags.length ? ` • ${r.tags.slice(0, 3).join(', ')}` : ''}`,
    status: undefined,
    rawItem: r,
  };
}

/**
 * Build a search document for an HTTP status entry.
 */
function buildHttpDoc(s: HttpStatusInfo): SearchDocument {
  return {
    id: String(s.code),
    type: 'tool-http',
    title: `${s.code} ${s.name}`,
    acronym: String(s.code),
    platform: 'HTTP',
    category: s.cat,
    tools: '',
    sourceUrl: '',
    content: [s.short, s.description, s.causes.join(' '), s.troubleshooting.join(' '), s.security, s.example || ''].join(' '),
    subtitle: `Herramientas • HTTP Status (${s.cat})`,
    status: undefined,
    rawItem: s,
  };
}

/**
 * Build a search document for a port entry.
 */
function buildPortDoc(p: PortInfo): SearchDocument {
  return {
    id: String(p.port),
    type: 'tool-port',
    title: `${p.port}/${p.proto} ${p.service}`,
    acronym: String(p.port),
    platform: 'Puertos',
    category: p.category,
    tools: '',
    sourceUrl: '',
    content: [p.short, p.description, p.security, p.secure, p.category, p.cve || '', p.detection.map((d) => `${d.label} ${d.cmd}`).join(' ')].join(' '),
    subtitle: `Herramientas • Puertos y Servicios (${p.proto} ${p.category})`,
    status: undefined,
    rawItem: p,
  };
}

/**
 * Build a search document for a Windows Event entry.
 */
function buildWinEventDoc(e: WinEventInfo): SearchDocument {
  return {
    id: String(e.id),
    type: 'tool-winevent',
    title: `${e.id} ${e.name}`,
    acronym: String(e.id),
    platform: 'Event IDs',
    category: e.log,
    tools: '',
    sourceUrl: '',
    content: [e.short, e.description, e.analysis, e.log, (e.related || []).join(' '), e.sigma || '', e.detection.map((d) => `${d.label} ${d.cmd}`).join(' ')].join(' '),
    subtitle: `Herramientas • Windows Event IDs (${e.log})`,
    status: undefined,
    rawItem: e,
  };
}

/**
 * Build a search document for a Cron example entry.
 */
function buildCronDoc(c: CronExample): SearchDocument {
  return {
    id: c.expr,
    type: 'tool-cron',
    title: c.expr,
    acronym: '',
    platform: 'Cron',
    category: 'Tiempo',
    tools: '',
    sourceUrl: '',
    content: c.desc,
    subtitle: `Herramientas • Cron Parser`,
    status: undefined,
    rawItem: c,
  };
}

/**
 * Build a search document for a MITRE ATT&CK technique entry (BLOQUE 3).
 * Indexes the technique ID, name, tactic, description, detection, tags and
 * all sub-technique IDs/names so a search for "T1059.001" or "powershell"
 * surfaces the parent technique.
 */
function buildMitreDoc(t: MitreTechnique): SearchDocument {
  const subIds = t.subtechniques.map((s) => s.id).join(' ');
  const subNames = t.subtechniques.map((s) => s.name).join(' ');
  return {
    id: t.id,
    type: 'tool-mitre',
    title: `${t.id} ${t.name}`,
    acronym: t.id,
    platform: 'MITRE ATT&CK',
    category: t.tactic,
    tools: '',
    sourceUrl: '',
    content: [t.description, t.detection, t.tactic, t.tags.join(' '), subIds, subNames].join(' '),
    subtitle: `Herramientas • MITRE ATT&CK (${t.tactic})`,
    status: undefined,
    rawItem: t,
  };
}

/**
 * Build a search document for a Sigma rule entry (BLOQUE 3).
 * Indexes the rule id, title, description, logsource, MITRE refs, event IDs
 * and the full YAML so a search for "T1059.001", "4625" or "powershell"
 * surfaces related Sigma rules.
 */
function buildSigmaDoc(r: SigmaRule): SearchDocument {
  const logsource = [r.logsource.product, r.logsource.category, r.logsource.service].filter(Boolean).join(' · ');
  return {
    id: r.id,
    type: 'tool-sigma',
    title: r.title,
    acronym: '',
    platform: 'Sigma',
    category: r.level,
    tools: r.mitre.join(' '),
    sourceUrl: '',
    content: [r.description, r.title, logsource, r.mitre.join(' '), r.tags.join(' '), (r.eventIds || []).join(' '), r.yaml].join(' '),
    subtitle: `Herramientas • Sigma Explorer (${r.level} · ${logsource || 'logsource'})`,
    status: r.status,
    rawItem: r,
  };
}

/**
 * BLOQUE 5 — Detection preset search document. Indexes the preset name,
 * description, KQL/SPL queries and MITRE references. Deep-links into the
 * Detection Query Helper tool with the preset name as entryId (the tool
 * already supports `autoOpenId` lookup by preset name).
 */
function buildDetectionPresetDoc(p: DetectionPreset): SearchDocument {
  return {
    id: p.name,
    type: 'tool-detection-query',
    title: p.name,
    acronym: p.name,
    platform: 'Detection',
    category: 'SOC',
    tools: p.mitre.join(' '),
    sourceUrl: '',
    content: [p.name, p.description, p.kql, p.spl, p.mitre.join(' ')].join(' '),
    subtitle: `Herramientas • Detection Query Helper (${p.mitre.join(', ') || 'SOC preset'})`,
    status: undefined,
    rawItem: p,
  };
}

/** BLOQUE 5 — Known RID document (e.g. "500 — Administrator"). */
function buildKnownRidDoc(r: KnownRid): SearchDocument {
  return {
    id: `rid-${r.rid}`,
    type: 'tool-sid-rid',
    title: `RID ${r.rid} — ${r.name}`,
    acronym: String(r.rid),
    platform: 'Windows',
    category: 'IAM',
    tools: '',
    sourceUrl: '',
    content: [r.name, r.description, String(r.rid), r.severity].join(' '),
    subtitle: `Herramientas • SID/RID Analyzer (${r.severity})`,
    status: r.severity,
    rawItem: r,
  };
}

/** BLOQUE 5 — Well-known SID document (e.g. "S-1-5-11 — Authenticated Users"). */
function buildWellKnownSidDoc(s: WellKnownSid): SearchDocument {
  return {
    id: `sid-${s.sid}`,
    type: 'tool-sid-rid',
    title: `${s.sid} — ${s.name}`,
    acronym: s.sid,
    platform: 'Windows',
    category: 'IAM',
    tools: '',
    sourceUrl: '',
    content: [s.name, s.description, s.sid, s.type].join(' '),
    subtitle: `Herramientas • SID/RID Analyzer (${s.type})`,
    status: undefined,
    rawItem: s,
  };
}

/** BLOQUE 5 — Known SID authority document (e.g. "5 — NT Authority"). */
function buildSidAuthorityDoc(a: KnownSidAuthority): SearchDocument {
  return {
    id: `auth-${a.code}`,
    type: 'tool-sid-rid',
    title: `Authority ${a.code} — ${a.name}`,
    acronym: String(a.code),
    platform: 'Windows',
    category: 'IAM',
    tools: '',
    sourceUrl: '',
    content: [a.name, a.description, String(a.code)].join(' '),
    subtitle: `Herramientas • SID/RID Analyzer (Authority)`,
    status: undefined,
    rawItem: a,
  };
}

/** BLOQUE 5 — Tool catalog search document. Lets users search "open timestamp"
 *  or "hash" and jump straight to the tool. Deep-link entryId is the tool id. */
function buildToolDoc(t: ToolCatalogEntry): SearchDocument {
  return {
    id: `tool-${t.id}`,
    type: 'tool',
    title: t.name,
    acronym: t.id,
    platform: t.cat,
    category: t.cat,
    tools: (t.tags || []).join(' '),
    sourceUrl: '',
    content: [t.name, t.desc, t.cat, (t.tags || []).join(' ')].join(' '),
    subtitle: `Herramientas • ${t.cat}`,
    status: undefined,
    rawItem: t,
  };
}

/** BLOQUE 5 — Command palette document. Synthesized from a CommandEntry. */
function buildCommandDoc(c: CommandEntry): SearchDocument {
  return {
    id: `cmd-${c.id}`,
    type: 'command',
    title: c.label,
    acronym: c.id,
    platform: 'Command',
    category: 'Command',
    tools: c.keywords.join(' '),
    sourceUrl: '',
    content: [c.label, c.hint || '', c.id, c.keywords.join(' ')].join(' '),
    subtitle: `Comando • ${c.hint || c.commandId}`,
    status: undefined,
    commandId: c.commandId,
    rawItem: c,
  };
}

/**
 * BLOQUE 5 — the canonical list of command palette entries (spec item #7).
 * Returned as a function so the modal can choose to surface them either
 * always (when the query is short or starts with ">") or filtered by the
 * free-text search pipeline below.
 */
export function getCommandEntries(): CommandEntry[] {
  return [
    { id: 'new-note', label: 'Nuevo apunte', hint: 'Crear una nota nueva', keywords: ['new', 'nuevo', 'note', 'apunte', 'crear'], commandId: 'new-note' },
    { id: 'new-lab', label: 'Nuevo lab', hint: 'Crear un hands-on lab nuevo', keywords: ['new', 'nuevo', 'lab', 'crear'], commandId: 'new-lab' },
    { id: 'new-glossary', label: 'Nuevo término de glosario', hint: 'Crear un término nuevo', keywords: ['new', 'nuevo', 'glossary', 'termino', 'glosario'], commandId: 'new-glossary' },
    { id: 'new-reference', label: 'Nueva referencia', hint: 'Añadir una referencia', keywords: ['new', 'nuevo', 'reference', 'referencia'], commandId: 'new-reference' },
    { id: 'quick-capture', label: 'Captura rápida → Inbox', hint: 'Ctrl+Shift+Q', keywords: ['capture', 'inbox', 'quick', 'captura', 'idea'], commandId: 'quick-capture' },
    { id: 'open-ioc', label: 'Abrir IoC Extractor', hint: 'Herramienta', keywords: ['open', 'abrir', 'ioc', 'extractor'], commandId: 'open-tool:ioc' },
    { id: 'open-mitre', label: 'Abrir MITRE ATT&CK', hint: 'Herramienta', keywords: ['open', 'abrir', 'mitre', 'attack'], commandId: 'open-tool:mitre' },
    { id: 'open-sigma', label: 'Abrir Sigma Explorer', hint: 'Herramienta', keywords: ['open', 'abrir', 'sigma'], commandId: 'open-tool:sigma' },
    { id: 'open-detection-query', label: 'Abrir Detection Query Helper', hint: 'Herramienta', keywords: ['open', 'abrir', 'detection', 'kql', 'spl'], commandId: 'open-tool:detection-query' },
    { id: 'open-winevent', label: 'Abrir Windows Event IDs', hint: 'Herramienta', keywords: ['open', 'abrir', 'windows', 'event'], commandId: 'open-tool:winevent' },
    { id: 'open-powershell-analyzer', label: 'Abrir PowerShell Analyzer', hint: 'Herramienta', keywords: ['open', 'abrir', 'powershell'], commandId: 'open-tool:powershell-analyzer' },
    { id: 'open-log-parser', label: 'Abrir Log Parser', hint: 'Herramienta', keywords: ['open', 'abrir', 'log', 'parser'], commandId: 'open-tool:log-parser' },
    { id: 'open-regex', label: 'Abrir Regex Tester', hint: 'Herramienta', keywords: ['open', 'abrir', 'regex', 'pattern'], commandId: 'open-tool:regex' },
    { id: 'open-timestamp', label: 'Abrir Timestamp Converter', hint: 'Herramienta', keywords: ['open', 'abrir', 'timestamp', 'unix', 'date'], commandId: 'open-tool:timestamp' },
    { id: 'open-hash', label: 'Abrir Hash Toolkit', hint: 'Herramienta', keywords: ['open', 'abrir', 'hash', 'md5', 'sha'], commandId: 'open-tool:hash' },
    { id: 'open-jwt', label: 'Abrir JWT Decoder', hint: 'Herramienta', keywords: ['open', 'abrir', 'jwt', 'token'], commandId: 'open-tool:jwt' },
    { id: 'open-sid-rid', label: 'Abrir SID/RID Analyzer', hint: 'Herramienta', keywords: ['open', 'abrir', 'sid', 'rid'], commandId: 'open-tool:sid-rid' },
    { id: 'open-ldap-dn', label: 'Abrir LDAP/DN Parser', hint: 'Herramienta', keywords: ['open', 'abrir', 'ldap', 'dn'], commandId: 'open-tool:ldap-dn' },
    { id: 'open-rbac', label: 'Abrir RBAC Analyzer', hint: 'Herramienta', keywords: ['open', 'abrir', 'rbac'], commandId: 'open-tool:rbac' },
    { id: 'open-cvss', label: 'Abrir CVSS Calculator', hint: 'Herramienta', keywords: ['open', 'abrir', 'cvss', 'score'], commandId: 'open-tool:cvss' },
    { id: 'open-file-hash', label: 'Abrir File Hash Analyzer', hint: 'Herramienta', keywords: ['open', 'abrir', 'file', 'hash'], commandId: 'open-tool:file-hash' },
    { id: 'open-linux-perms', label: 'Abrir Linux Permissions', hint: 'Herramienta', keywords: ['open', 'abrir', 'linux', 'chmod', 'permissions'], commandId: 'open-tool:linux-perms' },
    { id: 'open-cron', label: 'Abrir Cron Parser', hint: 'Herramienta', keywords: ['open', 'abrir', 'cron', 'schedule'], commandId: 'open-tool:cron' },
    { id: 'open-encoding', label: 'Abrir Encoding/Decoding', hint: 'Herramienta', keywords: ['open', 'abrir', 'encoding', 'base64', 'hex'], commandId: 'open-tool:encoding' },
    { id: 'open-subnet', label: 'Abrir Subnetting', hint: 'Herramienta', keywords: ['open', 'abrir', 'subnet', 'cidr'], commandId: 'open-tool:subnet' },
    { id: 'open-ports', label: 'Abrir Puertos y Servicios', hint: 'Herramienta', keywords: ['open', 'abrir', 'ports', 'tcp'], commandId: 'open-tool:ports' },
    { id: 'open-http', label: 'Abrir HTTP Status', hint: 'Herramienta', keywords: ['open', 'abrir', 'http', 'status'], commandId: 'open-tool:http' },
    { id: 'open-ip', label: 'Abrir IP Analyzer', hint: 'Herramienta', keywords: ['open', 'abrir', 'ip', 'ipv4'], commandId: 'open-tool:ip' },
    { id: 'open-ioc-defang', label: 'Abrir IOC Defanger', hint: 'Herramienta', keywords: ['open', 'abrir', 'defang', 'refang'], commandId: 'open-tool:ioc-defang' },
    { id: 'open-cmd-analyzer', label: 'Abrir Command Line Analyzer', hint: 'Herramienta', keywords: ['open', 'abrir', 'cmd', 'command'], commandId: 'open-tool:cmd-analyzer' },
    { id: 'open-tools', label: 'Ver todas las herramientas', hint: 'Navegación', keywords: ['open', 'abrir', 'tools', 'herramientas'], commandId: 'open-section:tools' },
    { id: 'open-dashboard', label: 'Ir al Dashboard', hint: 'Navegación', keywords: ['open', 'abrir', 'dashboard', 'inicio', 'home'], commandId: 'open-section:dashboard' },
    { id: 'open-notes', label: 'Ver apuntes', hint: 'Navegación', keywords: ['open', 'abrir', 'notes', 'apuntes'], commandId: 'open-section:notes' },
    { id: 'open-labs', label: 'Ver labs', hint: 'Navegación', keywords: ['open', 'abrir', 'labs'], commandId: 'open-section:labs' },
    { id: 'open-glossary', label: 'Ver glosario', hint: 'Navegación', keywords: ['open', 'abrir', 'glossary', 'glosario'], commandId: 'open-section:glossary' },
    { id: 'open-references', label: 'Ver referencias', hint: 'Navegación', keywords: ['open', 'abrir', 'references', 'referencias'], commandId: 'open-section:references' },
    { id: 'open-inbox', label: 'Ver Inbox', hint: 'Navegación', keywords: ['open', 'abrir', 'inbox'], commandId: 'open-section:inbox' },
    { id: 'open-review', label: 'Ver cola de revisión', hint: 'Navegación', keywords: ['open', 'abrir', 'review', 'revisar'], commandId: 'open-section:review' },
    { id: 'open-trash', label: 'Ver papelera', hint: 'Navegación', keywords: ['open', 'abrir', 'trash', 'papelera'], commandId: 'open-section:trash' },
    { id: 'open-settings', label: 'Abrir configuración', hint: 'Navegación', keywords: ['open', 'abrir', 'settings', 'configuracion'], commandId: 'open-section:settings' },
    { id: 'backup-now', label: 'Guardar backup ahora', hint: 'Acción', keywords: ['backup', 'guardar', 'export', 'zip'], commandId: 'backup-now' },
    { id: 'import-backup', label: 'Importar backup', hint: 'Acción', keywords: ['import', 'importar', 'restore', 'backup'], commandId: 'import-backup' },
  ];
}

export function searchAllVault(
  query: string,
  notes: Note[],
  glossary: GlossaryTerm[],
  labs: Lab[] = [],
  references: ReferenceItem[] = []
): SearchResultItem[] {
  const activeNotes = notes.filter((n) => !n.isDeleted);
  const activeLabs = labs.filter((l) => !l.isDeleted);
  const activeGlossary = glossary.filter((g) => !g.isDeleted);
  const activeReferences = references.filter((r) => !r.isDeleted);

  // BLOQUE 5 — parse "type:note kerberos" / "tag:soc powershell" / "platform:windows".
  const parsed = parseQuery(query);

  // Build the command palette entries always — they'll be filtered down below
  // using the parsed.text + command keywords.
  const commandEntries = getCommandEntries();

  if (!query.trim()) {
    // Return recent items (top-of-mind across all sections).
    // Always pre-compute the HTML-escaped title/snippet so the modal can use
    // `dangerouslySetInnerHTML` without ever injecting raw user text.
    const noteResults: SearchResultItem[] = activeNotes.slice(0, 4).map((n) => {
      const title = n.title;
      const subtitle = `${n.platform} • ${n.category}`;
      const snippet = stripHtml(n.contentHtml).slice(0, 140);
      return {
        id: n.id,
        type: 'note',
        title,
        subtitle,
        snippet,
        platform: n.platform,
        category: n.category,
        sourceUrl: n.sourceUrl,
        highlightedTitle: escapeHtml(title),
        highlightedSnippet: escapeHtml(snippet || subtitle),
        rawItem: n,
      };
    });

    const labResults: SearchResultItem[] = activeLabs.slice(0, 4).map((l) => {
      const title = l.title;
      const subtitle = `${l.organization} • ${l.topic}${l.subtopic ? ` • ${l.subtopic}` : ''}`;
      const snippet = stripHtml(
        l.parts?.map((p) => `${p.title}: ${p.content}`).join(' ') ||
          l.findings ||
          (Array.isArray(l.commands) ? l.commands.join(' ') : String(l.commands || '')) ||
          ''
      ).slice(0, 140);
      return {
        id: l.id,
        type: 'lab',
        title,
        subtitle,
        snippet,
        platform: l.organization,
        category: l.topic,
        tools: l.tools,
        sourceUrl: l.sourceLink,
        status: l.status,
        highlightedTitle: escapeHtml(title),
        highlightedSnippet: escapeHtml(snippet || subtitle),
        rawItem: l,
      };
    });

    const glossaryResults: SearchResultItem[] = activeGlossary.slice(0, 3).map((g) => {
      const title = g.acronym ? `[${g.acronym}] ${g.term}` : g.term;
      const subtitle = `Glosario • ${g.platform || 'General'}`;
      const snippet = g.shortDefinition || g.longDefinition.slice(0, 140);
      return {
        id: g.id,
        type: 'glossary',
        title,
        subtitle,
        snippet,
        platform: g.platform,
        category: g.category,
        highlightedTitle: escapeHtml(title),
        highlightedSnippet: escapeHtml(snippet || subtitle),
        rawItem: g,
      };
    });

    const referenceResults: SearchResultItem[] = activeReferences.slice(0, 3).map((r) => {
      const title = r.title;
      const subtitle = `Referencia • ${r.type}${r.tags && r.tags.length ? ` • ${r.tags.slice(0, 2).join(', ')}` : ''}`;
      const snippet = r.description || r.url;
      return {
        id: r.id,
        type: 'reference',
        title,
        subtitle,
        snippet,
        sourceUrl: r.url,
        highlightedTitle: escapeHtml(title),
        highlightedSnippet: escapeHtml(snippet || subtitle),
        rawItem: r,
      };
    });

    // BLOQUE 5 — show top command palette entries when the query is empty so
    // the modal doubles as a command palette. Top 6 commands surface the most
    // common actions (New note / Quick capture / open common tools).
    const commandResults: SearchResultItem[] = commandEntries.slice(0, 6).map((c) => ({
      id: `cmd-${c.id}`,
      type: 'command' as const,
      title: c.label,
      subtitle: `Comando • ${c.hint || c.commandId}`,
      snippet: c.hint || c.commandId,
      commandId: c.commandId,
      highlightedTitle: escapeHtml(c.label),
      highlightedSnippet: escapeHtml(c.hint || c.commandId),
      rawItem: c,
    }));

    return [...commandResults, ...noteResults, ...labResults, ...glossaryResults, ...referenceResults];
  }

  // BLOQUE 5 — if the user typed ">something" or "new note" / "open X",
  // surface matching command palette entries FIRST (command-palette mode).
  // Multi-word queries split into tokens; a command matches if ALL tokens
  // appear somewhere across (label + keywords + commandId + id).
  const lowerText = parsed.text.toLowerCase().trim();
  const isCommandMode = query.trim().startsWith('>') || lowerText.length > 0;
  const textTokens = lowerText.split(/\s+/).filter(Boolean);
  const matchingCommands: SearchDocument[] = isCommandMode && textTokens.length > 0
    ? commandEntries
        .map((c) => {
          const labelLower = c.label.toLowerCase();
          const keywordStr = c.keywords.join(' ').toLowerCase();
          const idLower = c.id.toLowerCase();
          const commandIdLower = c.commandId.toLowerCase();
          const haystack = `${labelLower} ${keywordStr} ${idLower} ${commandIdLower}`;
          // ALL tokens must appear somewhere in the haystack.
          const allMatch = textTokens.every((tok) => haystack.includes(tok));
          if (!allMatch) return { c, score: 99 };
          // Score: prefix match on label wins, then labelMatch, then keyword.
          const startsWith = labelLower.startsWith(lowerText);
          const labelMatch = labelLower.includes(lowerText) || textTokens.every((t) => labelLower.includes(t));
          const score = startsWith ? 0 : (labelMatch ? 1 : 2);
          return { c, score };
        })
        .filter((x) => x.score < 99)
        .sort((a, b) => a.score - b.score)
        .slice(0, 8)
        .map(({ c }) => buildCommandDoc(c))
    : [];

  // Build unified search corpus across all sections + static tool datasets.
  const searchDataset: SearchDocument[] = [
    ...activeNotes.map((n) => ({
      id: n.id,
      type: 'note' as const,
      title: n.title,
      acronym: '',
      platform: n.platform || '',
      category: [n.category, ...(n.categories || [])].filter(Boolean).join(' '),
      tools: '',
      sourceUrl: n.sourceUrl || '',
      content: stripHtml(n.contentHtml),
      subtitle: `${n.platform} > ${n.category}`,
      status: undefined,
      rawItem: n,
    })),
    ...activeLabs.map((l) => ({
      id: l.id,
      type: 'lab' as const,
      title: l.title,
      acronym: '',
      platform: l.organization || '',
      category: [l.topic, l.subtopic, ...(l.categories || [])].filter(Boolean).join(' '),
      tools: (l.tools || []).join(' '),
      sourceUrl: l.sourceLink || '',
      content: stripHtml([
        l.parts?.map((p) => `${p.title} ${p.content}`).join(' ') || '',
        Array.isArray(l.commands) ? l.commands.join(' ') : String(l.commands || ''),
        l.findings || '',
        l.mitigation || '',
      ].join(' ')),
      subtitle: `${l.organization} > ${l.topic}${l.subtopic ? ` > ${l.subtopic}` : ''} [${l.difficulty}]`,
      status: l.status,
      rawItem: l,
    })),
    ...activeGlossary.map((g) => ({
      id: g.id,
      type: 'glossary' as const,
      title: g.term,
      acronym: g.acronym || '',
      platform: g.platform || '',
      category: [g.category, ...(g.categories || [])].filter(Boolean).join(' '),
      tools: '',
      sourceUrl: '',
      content: [g.shortDefinition, g.longDefinition, g.example].filter(Boolean).join(' '),
      subtitle: `Glosario • ${g.platform || 'General'}${g.category ? ` • ${g.category}` : ''}`,
      status: undefined,
      rawItem: g,
    })),
    ...activeReferences.map(buildReferenceDoc),
    ...HTTP_STATUSES.map(buildHttpDoc),
    ...PORTS.map(buildPortDoc),
    ...WIN_EVENTS.map(buildWinEventDoc),
    ...CRON_EXAMPLES.map(buildCronDoc),
    // BLOQUE 3 — MITRE ATT&CK + Sigma rules indexed into global search.
    ...MITRE_TECHNIQUES.map(buildMitreDoc),
    ...SIGMA_RULES.map(buildSigmaDoc),
    // BLOQUE 5 — extend search coverage to the remaining static datasets.
    ...DETECTION_PRESETS.map(buildDetectionPresetDoc),
    ...KNOWN_RIDS.map(buildKnownRidDoc),
    ...WELL_KNOWN_SIDS.map(buildWellKnownSidDoc),
    ...KNOWN_SID_AUTHORITIES.map(buildSidAuthorityDoc),
    ...TOOLS_CATALOG.map(buildToolDoc),
    // BLOQUE 5 — command palette entries (matched alongside everything else).
    ...matchingCommands,
  ];

  // BLOQUE 5 — apply type:/tag:/platform: filters BEFORE the Fuse search so
  // the index never sees (and never ranks) entries the user has filtered out.
  const allowedTypes = parsed.typeFilter ? new Set(typeFilterToTypes(parsed.typeFilter) || []) : null;
  const filteredDataset = allowedTypes
    ? searchDataset.filter((d) => allowedTypes.has(d.type))
    : searchDataset;

  // Tag filter: applied to the `tools` field (which doubles as a tag list
  // for tools + sigma + MITRE) and the `category` field (notes/labs/glossary
  // categories). We lowercase both sides and require a substring match.
  const tagFilteredDataset = parsed.tagFilter
    ? filteredDataset.filter((d) => {
        const tagHaystack = `${d.tools} ${d.category}`.toLowerCase();
        return tagHaystack.includes(parsed.tagFilter!);
      })
    : filteredDataset;

  // Platform filter: applied to the `platform` field. Substring match.
  const platformFilteredDataset = parsed.platformFilter
    ? tagFilteredDataset.filter((d) => {
        const platLower = (d.platform || '').toLowerCase();
        return platLower.includes(parsed.platformFilter!);
      })
    : tagFilteredDataset;

  const fuse = new Fuse(platformFilteredDataset, {
    keys: [
      { name: 'title', weight: 0.35 },
      { name: 'acronym', weight: 0.25 },
      { name: 'platform', weight: 0.12 },
      { name: 'category', weight: 0.12 },
      { name: 'content', weight: 0.15 },
      { name: 'tools', weight: 0.1 },
      { name: 'sourceUrl', weight: 0.05 },
    ],
    threshold: 0.3,
    distance: 200,
    ignoreLocation: true,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 1,
  });

  // ──────────────────────────────────────────────────────────────
  // Boost pipeline: ranks EXACT / substring matches on title or
  // code/acronym BEFORE fuzzy matches. This guarantees that searching
  // "201" puts "201 Created" first (exact match on the HTTP code) and
  // "443" puts "443/TCP HTTPS" first, instead of letting Fuse.js fuzzy
  // score rank e.g. "8443" or a glossary term containing "201" higher.
  //
  // BLOQUE 5 — boost on the FREE-TEXT portion of the query only (after
  // stripping the type:/tag:/platform: filter tokens). This way a query
  // like "type:note kerberos" still boosts "Kerberos" glossary terms
  // rather than trying to boost-match the literal string "type:note".
  // ──────────────────────────────────────────────────────────────
  const q = parsed.text.trim();
  const qLower = q.toLowerCase();
  const qDigits = q.replace(/\D/g, ''); // pure digits for "code-like" queries

  // Each item gets a "boost bucket": 0 = exact-title, 1 = exact-acronym/code,
  // 2 = title-startsWith, 3 = title-contains, 4 = acronym-contains,
  // 5 = fuzzy-match (fallback). Lower bucket = higher rank.
  type BucketedItem = { item: typeof platformFilteredDataset[number]; bucket: number; matches?: FuseResultMatch[] };
  const bucketed: BucketedItem[] = [];

  if (q) {
    for (const doc of platformFilteredDataset) {
      const titleLower = doc.title.toLowerCase();
      const acrLower = (doc.acronym || '').toLowerCase();

      if (doc.title === q || doc.acronym === q) {
        bucketed.push({ item: doc, bucket: 0 });
        continue;
      }
      if (acrLower === qLower || (qDigits && acrLower === qDigits)) {
        bucketed.push({ item: doc, bucket: 1 });
        continue;
      }
      if (titleLower.startsWith(qLower) || acrLower.startsWith(qLower)) {
        bucketed.push({ item: doc, bucket: 2 });
        continue;
      }
      if (titleLower.includes(qLower) || acrLower.includes(qLower) || (qDigits && acrLower.includes(qDigits))) {
        bucketed.push({ item: doc, bucket: 3 });
        continue;
      }
    }
  }

  // Stable sort by bucket (exact → substring).
  bucketed.sort((a, b) => a.bucket - b.bucket);

  // BLOQUE 5 — when there's no text but filters were applied, just return
  // the whole filtered dataset (capped at 30) so the user sees what matched.
  // Otherwise run Fuse on the FREE-TEXT portion to surface content matches.
  const fuzzyResults = q
    ? fuse.search(q).slice(0, 30)
    : platformFilteredDataset.slice(0, 30).map((item) => ({ item, matches: [] as FuseResultMatch[] }));

  // Build a dedup map: boosted items first, then fuzzy items not already present.
  const seenIds = new Set<string>();
  const mergedRaw: Array<{ item: typeof platformFilteredDataset[number]; matches?: FuseResultMatch[] }> = [];

  for (const b of bucketed) {
    if (!seenIds.has(b.item.id)) {
      seenIds.add(b.item.id);
      mergedRaw.push({ item: b.item, matches: undefined });
    }
  }
  for (const fr of fuzzyResults) {
    if (!seenIds.has(fr.item.id)) {
      seenIds.add(fr.item.id);
      mergedRaw.push({ item: fr.item, matches: fr.matches ? [...fr.matches] : undefined });
    }
    if (mergedRaw.length >= 30) break;
  }

  const rawResults = mergedRaw.slice(0, 30);

  // BLOQUE 5 — logical-destination dedup: a command entry ("Abrir X") and its
  // matching tool-catalog entry ("X") both navigate to the same tool. When
  // both rank in the results, keep the catalog row (better title match +
  // description snippet) and drop the redundant command so the same
  // destination is never listed twice.
  const resultToolIds = new Set<string>();
  for (const r of rawResults) {
    if (r.item.type === 'tool') {
      resultToolIds.add(r.item.id.startsWith('tool-') ? r.item.id.slice(5) : r.item.id);
    }
  }
  const dedupedResults = resultToolIds.size > 0
    ? rawResults.filter((r) => {
        const cid = r.item.commandId;
        if (r.item.type === 'command' && cid && cid.startsWith('open-tool:')) {
          return !resultToolIds.has(cid.slice('open-tool:'.length));
        }
        return true;
      })
    : rawResults;

  const fieldLabels: Record<string, string> = {
    title: 'Título',
    acronym: 'Código / ID',
    platform: 'Plataforma',
    category: 'Categoría',
    tools: 'Herramientas',
    content: 'Contenido',
    sourceUrl: 'Link / Fuente',
  };

  return dedupedResults.map(({ item, matches }) => {
    const matchedFields: SearchMatchDetail[] = [];

    if (matches) {
      matches.forEach((m) => {
        const keyName = m.key || '';
        const label = fieldLabels[keyName] || keyName;
        const val = String(m.value || '');
        if (label && !matchedFields.some((mf) => mf.label === label)) {
          matchedFields.push({
            field: keyName,
            label,
            value: val.length > 80 ? `${val.slice(0, 80)}...` : val,
          });
        }
      });
    }

    // BLOQUE 5 — highlight on the FREE-TEXT portion of the query only.
    const qLower = parsed.text.toLowerCase();
    const displayTitle = item.acronym && item.type !== 'tool-http' && item.type !== 'tool-port' && item.type !== 'tool-winevent'
      ? item.title
      : item.title;
    const highlightedTitle = highlightMatches(displayTitle, qLower);
    const fullSnippet = item.content.slice(0, 180);
    const highlightedSnippet = highlightMatches(fullSnippet, qLower);

    return {
      id: item.id,
      type: item.type,
      title: displayTitle,
      subtitle: item.subtitle,
      snippet: fullSnippet,
      platform: item.platform,
      category: item.category,
      tools: item.tools ? item.tools.split(' ') : undefined,
      sourceUrl: item.sourceUrl,
      status: item.status,
      matchedFields,
      highlightedTitle,
      highlightedSnippet,
      commandId: item.commandId,
      rawItem: item.rawItem,
    };
  });
}

/** Resolve a tool result into a deep-link descriptor for ToolsView. */
export function resultToToolDeepLink(item: SearchResultItem): { toolId: ToolId; entryId: string | number } | null {
  switch (item.type) {
    case 'tool-http':
      return { toolId: 'http', entryId: item.id };
    case 'tool-port':
      return { toolId: 'ports', entryId: item.id };
    case 'tool-winevent':
      return { toolId: 'winevent', entryId: item.id };
    case 'tool-cron':
      return { toolId: 'cron', entryId: item.id };
    case 'tool-mitre':
      return { toolId: 'mitre', entryId: item.id };
    case 'tool-sigma':
      return { toolId: 'sigma', entryId: item.id };
    // BLOQUE 5 — Detection preset deep-link (entryId is the preset name).
    case 'tool-detection-query':
      // strip "tool-" prefix or pass through (the helper does the lookup by name).
      return { toolId: 'detection-query', entryId: item.id };
    // BLOQUE 5 — Tool catalog deep-link (entryId is the tool id without prefix).
    case 'tool': {
      const strippedId = item.id.startsWith('tool-') ? item.id.slice(5) : item.id;
      return { toolId: strippedId as ToolId, entryId: strippedId };
    }
    // BLOQUE 5 — SID/RID deep-link: route into the SID/RID Analyzer. The
    // tool currently doesn't implement autoOpenId consumption (the prop is
    // declared but ignored), so we just route the user to the tool.
    case 'tool-sid-rid':
      return { toolId: 'sid-rid', entryId: item.id };
    // BLOQUE 5 — CVSS lookup: route to the CVSS Calculator tool (no autoOpenId).
    case 'tool-cvss':
      return { toolId: 'cvss', entryId: item.id };
    default:
      return null;
  }
}
