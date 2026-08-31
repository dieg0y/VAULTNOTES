/**
 * toolsCatalog.ts — single source of truth for the list of tools and their
 * search-relevant metadata. Imported by:
 *  - `components/ToolsView.tsx`     (renders the sidebar)
 *  - `utils/fuzzySearch.ts`          (indexes tools into global search)
 *  - `components/GlobalSearchModal.tsx` (deep-link dispatch)
 *
 * NO React, NO icons — keeps the search index lightweight and free of UI
 * side-imports. 100% offline, no fetch, no external APIs.
 */

/** Discriminated union of every tool id used by VaultNotes. */
export type ToolId =
  | 'subnet' | 'jwt' | 'base' | 'http' | 'winevent' | 'ioc' | 'cron' | 'ports'
  // New (Task ID 2-a..2-f):
  | 'timestamp' | 'hash' | 'encoding' | 'regex' | 'ip' | 'ioc-defang'
  // SOC Analyst block (Task ID 3-d..3-f):
  | 'powershell-analyzer' | 'cmd-analyzer' | 'log-parser'
  // SOC Analyst block (Task ID 4-6 — MITRE / Sigma / Detection Query Helper):
  | 'mitre' | 'sigma' | 'detection-query'
  // IAM / Vulnerability / Linux block (Task ID 4-a..4-d + 4 + 5):
  | 'sid-rid' | 'ldap-dn' | 'rbac' | 'cvss' | 'file-hash' | 'linux-perms'
  // BLOQUE 6 — Online-Optional. CVE Search is the only tool that uses the
  // online layer (NVD API, supports CORS, no API key required). It still
  // works for browsing saved CVEs when offline.
  | 'cve-search'
  // Explorador offline de vulnerabilidades IAM/SOC (dataset
  // data/vulnerabilities.ts, 203 entradas).
  | 'vuln'
  // Explorador offline de técnicas de ataque (dataset data/attacks/,
  // 140 entradas: IAM/Red/DoS/Web/PrivEsc/Lateral/Persistencia/Social/Malware).
  | 'ataques';

export interface ToolCatalogEntry {
  id: ToolId;
  name: string;
  cat: string;
  desc: string;
  tags?: string[];
}

/**
 * The full catalog of 29 tools. The `cat` field uses the user-facing
 * category labels (Red, IAM, Datos, Web, SOC, LINUX, SECURITY).
 *
 * Tags include both English and Spanish keywords to maximize recall in
 * global search (e.g. searching "windows" should match Windows Event IDs,
 * PowerShell Analyzer, Command Line Analyzer, MITRE ATT&CK, etc.).
 */
export const TOOLS_CATALOG: ToolCatalogEntry[] = [
  { id: 'subnet', name: 'Subnetting', cat: 'Red', desc: 'Calcular red, broadcast, hosts y máscara', tags: ['subnetting', 'cidr', 'ipv4', 'red'] },
  { id: 'ports', name: 'Puertos y Servicios', cat: 'Red', desc: '119 puertos TCP/UDP con riesgos, hardening paso a paso y comandos de detección', tags: ['puertos', 'tcp', 'udp', 'servicios', 'llmnr', 'tr-069', 'ajp', 'mqtt', 'ics'] },
  { id: 'jwt', name: 'JWT Decoder', cat: 'IAM', desc: 'Decodificar header y payload de un JWT', tags: ['jwt', 'token', 'auth', 'iam'] },
  { id: 'sid-rid', name: 'SID / RID Analyzer', cat: 'IAM', desc: 'Parsear Windows SIDs, identificar RIDs conocidos (500 Administrator, 502 KRBTGT, 512 Domain Admins…). 100% offline.', tags: ['sid', 'rid', 'windows', 'ad', 'iam', 'admin', 's-1-5'] },
  { id: 'ldap-dn', name: 'LDAP / DN Parser', cat: 'IAM', desc: 'Parsear Distinguished Names LDAP — CN/OU/DC, derivar dominio, árbol jerárquico.', tags: ['ldap', 'dn', 'ad', 'iam', 'domain'] },
  { id: 'rbac', name: 'RBAC Analyzer', cat: 'IAM', desc: 'Modelar Users/Roles/Permissions — matriz, effective permissions, detecciones. IndexedDB.', tags: ['rbac', 'roles', 'permissions', 'iam', 'access-control'] },
  { id: 'base', name: 'Base Converter', cat: 'Datos', desc: 'Decimal, Hex, Octal y Binario en vivo', tags: ['base', 'hex', 'decimal', 'octal', 'binary'] },
  { id: 'http', name: 'HTTP Status', cat: 'Web', desc: 'Códigos HTTP con explicación detallada', tags: ['http', 'status', 'web', 'codes'] },
  { id: 'winevent', name: 'Windows Event IDs', cat: 'SOC', desc: '93 Event IDs (Security, PowerShell y Sysmon) con explicación, detección, MITRE y threat hunting', tags: ['windows', 'event', 'logs', 'soc', '4624', '4625', 'security', '4720', 'sysmon', '1102', '5136'] },
  { id: 'ioc', name: 'IoC Extractor', cat: 'SOC', desc: 'SOC Tier1/2 + IAM: refang, valida, dedup, contexto, scoring, KQL/SPL/STIX', tags: ['ioc', 'ip', 'hash', 'url', 'domain', 'soc', 'triage', 'stix'] },
  { id: 'cron', name: 'Cron Parser', cat: 'LINUX', desc: 'Explicar una expresión cron con guía', tags: ['cron', 'schedule', 'linux', 'crontab'] },
  { id: 'linux-perms', name: 'Linux Permissions', cat: 'LINUX', desc: 'chmod numérico ↔ simbólico (755 ↔ rwxr-xr-x) con SUID/SGID/Sticky bit.', tags: ['chmod', 'permissions', 'linux', 'suid', 'sgid', 'sticky'] },
  { id: 'timestamp', name: 'Timestamp Converter', cat: 'Datos', desc: 'Unix sec/ms, ISO 8601, UTC y Local — auto-detección sec vs ms', tags: ['timestamp', 'unix', 'iso', 'date', 'utc'] },
  { id: 'hash', name: 'Hash Toolkit', cat: 'SECURITY', desc: 'MD5/SHA-1/256/384/512 (Web Crypto), identificar por longitud, comparar', tags: ['hash', 'md5', 'sha', 'sha256', 'security'] },
  { id: 'file-hash', name: 'File Hash Analyzer', cat: 'SECURITY', desc: 'Hash SHA-1/256/384/512 de archivos vía Web Crypto + drag-and-drop.', tags: ['hash', 'file', 'sha', 'integrity', 'security'] },
  { id: 'cvss', name: 'CVSS Calculator', cat: 'SECURITY', desc: 'CVSS 3.1 base score + severity + vector. 8 métricas.', tags: ['cvss', 'vulnerability', 'score', 'security', 'vector'] },
  { id: 'encoding', name: 'Encoding / Decoding', cat: 'Datos', desc: 'Base64/URL-safe/Hex/ASCII/Unicode/HTML — encode/decode/swap', tags: ['encoding', 'base64', 'hex', 'url', 'ascii'] },
  { id: 'regex', name: 'Regex Tester', cat: 'Datos', desc: 'Test regex con 14 presets (IPv4/IPv6/Email/CVE/JWT…), capture groups', tags: ['regex', 'pattern', 'ipv4', 'email', 'cve'] },
  { id: 'ip', name: 'IP Analyzer', cat: 'Red', desc: 'IPv4/IPv6 — scope, binario, hex, integer, ULA, multicast. 100% local', tags: ['ip', 'ipv4', 'ipv6', 'subnet', 'red'] },
  { id: 'ioc-defang', name: 'IOC Defanger / Refanger', cat: 'SOC', desc: 'Defang/refang URLs, IPs, emails — hxxps[://] y [.] invertible', tags: ['ioc', 'defang', 'refang', 'url', 'soc'] },
  { id: 'powershell-analyzer', name: 'PowerShell Analyzer', cat: 'SOC', desc: 'Análisis offline de scripts PowerShell — indicadores, MITRE, Base64.', tags: ['powershell', 'windows', 'soc', 't1059', 'encoded', 'mitre'] },
  { id: 'cmd-analyzer', name: 'Command Line Analyzer', cat: 'SOC', desc: 'Parsing CMD/PowerShell/Linux — executable, args, switches, recon, MITRE', tags: ['cmd', 'command', 'powershell', 'linux', 'soc', 'recon'] },
  { id: 'log-parser', name: 'Log Parser', cat: 'SOC', desc: 'SSH/Apache/Nginx/Syslog/Windows Event XML — tabla, Extract IOCs', tags: ['logs', 'parser', 'ssh', 'apache', 'nginx', 'syslog', 'windows', 'soc'] },
  { id: 'mitre', name: 'MITRE ATT&CK', cat: 'SOC', desc: 'Explorar técnicas MITRE ATT&CK locales — búsqueda por ID, táctica o keyword.', tags: ['mitre', 'attack', 'tactics', 'techniques', 't1059', 'soc', 'windows'] },
  { id: 'sigma', name: 'Sigma Explorer', cat: 'SOC', desc: 'Reglas Sigma locales con YAML highlighting — MITRE, Event IDs, KQL, SPL.', tags: ['sigma', 'yaml', 'rules', 'detection', 'mitre', 'soc'] },
  { id: 'detection-query', name: 'Detection Query Helper', cat: 'SOC', desc: 'Constructor visual de queries KQL/SPL con 11 presets SOC y cross-links MITRE.', tags: ['kql', 'spl', 'sentinel', 'splunk', 'detection', 'soc'] },
  // BLOQUE 6 — Online-Optional. CVE Search uses NVD API (online, optional).
  // Saved CVEs are stored locally and browsable offline.
  { id: 'cve-search', name: 'CVE Search', cat: 'SECURITY', desc: 'Buscar CVE-ID en NVD online (opcional) y guardar copia local. Funciona offline para consultar CVEs guardados.', tags: ['cve', 'nvd', 'vulnerability', 'cvss', 'security', 'online'] },
  // Vulnerabilidades IAM/SOC — dataset 100% offline (data/vulnerabilities.ts).
  // Tags ES/EN para máxima recall en la búsqueda global (Ctrl+K).
  { id: 'vuln', name: 'Vulnerabilidades IAM/SOC', cat: 'SECURITY', desc: 'Explorador de 203 vulnerabilidades de identidad y SOC: JWT/OAuth/SAML, AD (Kerberos, delegación, AD CS ESC1-16, DnsAdmins, AdminSDHolder), Cloud IAM (AWS/Azure/GCP/K8s/Snowflake), governance IAM (JML, PIM, access reviews), PrivEsc (privilegios Windows, caps Linux), evasión SOC (BYOVD, AiTM, fileless), movimiento lateral y persistencia — con detección KQL/SPL/Sigma y remediación paso a paso. 100% offline.', tags: ['vulnerabilidades', 'vulnerability', 'iam', 'soc', 'ad', 'esc1', 'adcs', 'kerberoasting', 'golden ticket', 'pass-the-hash', 'dcsync', 'jwt', 'oauth', 'saml', 'cloud', 'aws', 'azure', 'gcp', 'snowflake', 'pim', 'jml', 'access review', 'byovd', 'aitm', 'privesc', 'persistence', 'evasion', 'lateral', 'hardening', 'kql', 'sigma'] },
  // Ataques — dataset 100% offline (data/attacks/, 140 entradas).
  // Complementa a Vulnerabilidades: allí viven los fallos de implementación,
  // aquí las TÉCNICAS ofensivas (red team). Tags ES/EN para máxima recall.
  { id: 'ataques', name: 'Ataques (técnicas ofensivas)', cat: 'SECURITY', desc: 'Explorador de 140 técnicas de ataque de todo tipo: IAM/Identidad en profundidad (password spraying, kerberoasting, AS-REP, golden/silver ticket, DCSync, pass-the-hash/ticket/key, relay NTLM, coerción, delegaciones, AD CS, ACLs, Zerologon, LSASS, MFA fatigue, phishing AiTM, SIM swap, OAuth, PRT, Golden SAML, AWS IAM, IMDS, BloodHound), Red (MITM, ARP/DNS spoofing, DHCP starvation y rogue, MAC flooding, sniffing, port scanning, VLAN hopping, LLMNR, evil twin, BGP hijack, KRACK), DoS/DDoS (SYN flood, amplificación DNS/NTP/Memcached, slow HTTP, Rapid Reset), Web (SQLi, XSS, CSRF, SSRF, XXE, deserialización, IDOR), escalada de privilegios, movimiento lateral, persistencia/C2, ingeniería social y malware — con cómo funciona, detección KQL/SPL/Sigma y mitigación paso a paso. Sin duplicar Vulnerabilidades ni sinónimos (van como alias). 100% offline.', tags: ['ataques', 'attacks', 'ataque', 'attack', 'técnicas', 'techniques', 'red team', 'offensive', 'iam', 'ad', 'kerberoasting', 'password spraying', 'golden ticket', 'silver ticket', 'pass the hash', 'relay ntlm', 'mfa fatigue', 'evilginx', 'sim swap', 'mitm', 'arp spoofing', 'dns spoofing', 'sniffing', 'port scanning', 'mac flooding', 'dhcp', 'dos', 'ddos', 'syn flood', 'amplificación', 'sqli', 'xss', 'ssrf', 'privesc', 'lateral', 'persistencia', 'c2', 'phishing', 'ransomware', 'supply chain', 'kql', 'sigma', 'mitre'] },
];

/** Find a catalog entry by id. */
export function findToolById(id: string): ToolCatalogEntry | undefined {
  return TOOLS_CATALOG.find((t) => t.id === id);
}
