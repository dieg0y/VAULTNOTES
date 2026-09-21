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
  // 89 entradas: IAM/Red/DoS/Web/Social/Malware — sin duplicar
  // Vulnerabilidades).
  | 'ataques'
  // HELPDESK (FASE 2 — expansión HelpDesk/IT Support) — 15 tools L1/L2
  // Service Desk. Simuladores, parsers, checklists, calculadoras y runbooks
  // 100% offline: NADA de AD real, Intune real, Graph ni APIs externas.
  // Componentes en src/vault/components/tools/hd/.
  | 'hd-triage' | 'hd-sla' | 'hd-ad-account' | 'hd-pwreset' | 'hd-kb-gen'
  | 'hd-bitlocker' | 'hd-outlook' | 'hd-printer' | 'hd-bsod' | 'hd-gpo'
  | 'hd-network' | 'hd-intune' | 'hd-sanitizer' | 'hd-share' | 'hd-remote';

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
  // Ataques — dataset 100% offline (data/attacks/, 89 entradas).
  // Complementa a Vulnerabilidades SIN duplicarla: allí viven los fallos de
  // implementación y las técnicas de abuso AD/IAM (Kerberoasting, PtH,
  // tickets, delegaciones, ESC, escalada, lateral, persistencia, relay,
  // MFA fatigue, AiTM, SIM swap, Golden SAML); aquí SOLO lo que no se
  // repite. Tags ES/EN para máxima recall.
  { id: 'ataques', name: 'Ataques (técnicas ofensivas)', cat: 'SECURITY', desc: 'Explorador de 89 técnicas de ataque de todo tipo SIN duplicar Vulnerabilidades: IAM/Identidad en lo que aquella no cubre (MS14-068, Bronze Bit, extracción SAM/NTDS.dit, recon AD con BloodHound, keylogging, phishing de código de dispositivo, robo de PRT, registro fraudulento de dispositivos, abuso de SCCM/Intune, AD Recycle Bin, inyección CSV), Red (MITM, ARP/DNS spoofing, DHCP starvation y rogue, MAC flooding, sniffing, port scanning, VLAN hopping, SSL stripping, evil twin, deauth, BGP hijack, KRACK, Bluetooth, mitm6, bypass de 802.1X, enumeración DNS, envenenamiento de routing interior), DoS/DDoS (SYN flood, amplificación DNS/NTP/Memcached, slow HTTP, Rapid Reset, ReDoS), Web (SQLi, XSS, SSRF, XXE, deserialización, request smuggling, CRLF, HPP, GraphQL), ingeniería social (phishing, vishing, smishing, BEC, watering hole, deepfakes) y malware/C2/exfil (ransomware, supply chain, infostealers, gusanos, beaconing, exfiltración) — con cómo funciona, detección KQL/SPL/Sigma y mitigación paso a paso. Sinónimos como alias, nunca filas duplicadas. 100% offline.', tags: ['ataques', 'attacks', 'ataque', 'attack', 'técnicas', 'techniques', 'red team', 'offensive', 'iam', 'sccm', 'intune', 'prt', 'bloodhound', 'device code', 'csv injection', 'mitm', 'arp spoofing', 'dns spoofing', 'sniffing', 'port scanning', 'mac flooding', 'dhcp', 'mitm6', '802.1x', 'bgp', 'krack', 'dos', 'ddos', 'syn flood', 'amplificación', 'redos', 'sqli', 'xss', 'ssrf', 'smuggling', 'crlf', 'graphql', 'phishing', 'bec', 'deepfake', 'ransomware', 'supply chain', 'worms', 'c2', 'kql', 'sigma', 'mitre'] },
  // ---------------- HELPDESK (FASE 2) ----------------
  // 15 tools de la especialización HelpDesk / IT Support / Service Desk.
  // Todas funcionan como simuladores/parsers/checklists/calculadoras/runbooks
  // 100% offline (regla 2.1 del plan maestro): ninguna ejecuta cambios en
  // AD/Intune/Entra/Windows, ninguna llama a APIs, ninguna almacena secretos.
  {
    id: 'hd-triage',
    name: 'Ticket Triage Parser',
    cat: 'HELPDESK',
    desc: 'Pega el texto crudo de un ticket y obtén categoría, subcategoría, impacto, urgencia, prioridad, SLA sugerido (tabla editable de ejemplo educativo), troubleshooting inicial, info requerida, causas raíz, criterios de escalación, alertas de seguridad y KB sugerida del dataset local.',
    tags: ['ticket', 'triage', 'prioridad', 'impact', 'urgencia', 'p1', 'p2', 'p3', 'sla', 'itsm', 'service desk', 'helpdesk', 'categorización', 'escalation', 'categoría'],
  },
  {
    id: 'hd-sla',
    name: 'SLA / Priority Calculator',
    cat: 'HELPDESK',
    desc: 'Matriz interactiva impacto×urgencia → P1-P4 con SLA configurable (ejemplo educativo, no tiempos universales) y calculadora de horas límite de respuesta/resolución.',
    tags: ['sla', 'prioridad', 'priority', 'impact', 'urgencia', 'p1', 'p2', 'p3', 'p4', 'matriz', 'itsm', 'tiempo respuesta', 'deadline', 'service desk', 'helpdesk', 'sla calculator'],
  },
  {
    id: 'hd-ad-account',
    name: 'AD Account Troubleshooter',
    cat: 'HELPDESK',
    desc: 'Árbol de decisión para problemas de cuenta AD: bloqueada vs deshabilitada vs caducada, PowerShell de referencia (Get-ADUser, Unlock, Event 4740/4726), verificación de identidad y cuándo escalar a IAM. Simulador educativo.',
    tags: ['active directory', 'ad', 'cuenta', 'bloqueada', 'bloqueado', 'deshabilitada', 'lockout', 'disabled', 'contraseña', '4740', '4726', 'unlock-adaccount', 'get-aduser', 'badpwdcount', 'iam', 'identidad', 'helpdesk', 'service desk'],
  },
  {
    id: 'hd-pwreset',
    name: 'Password & MFA Reset Runbook',
    cat: 'HELPDESK',
    desc: 'Runbook interactivo de reset de contraseña y MFA: verificación de identidad (callback a RRHH), pasos ADUC/PowerShell, re-bloqueos por credenciales guardadas, re-registro de Authenticator y evidencia para el ticket.',
    tags: ['password', 'contraseña', 'reset', 'mfa', 'authenticator', 'sspr', 'self service', 'runbook', 'verificación', 'social engineering', 'bec', 'phishing', 'cambio contraseña', 'helpdesk', 'iam', 'service desk'],
  },
  {
    id: 'hd-kb-gen',
    name: 'KB Article Generator',
    cat: 'HELPDESK',
    desc: 'Generador de artículos de base de conocimiento: formulario con pasos dinámicos y comandos → vista previa en vivo + salida Markdown exportable a Notas y Data & Intel.',
    tags: ['kb', 'knowledge base', 'base de conocimiento', 'artículo', 'documentación', 'generator', 'markdown', 'runbook', 'itsm', 'helpdesk', 'service desk', 'documentar'],
  },
  {
    id: 'hd-bitlocker',
    name: 'BitLocker Recovery Helper',
    cat: 'HELPDESK',
    desc: 'Guía de recuperación BitLocker por escenario: ID de clave (8 hex) vs clave de 48 dígitos, dónde buscarla (Intune, AD, impresa, .bek, cuenta MSA), verificación anti-phishing y comandos manage-bde de referencia.',
    tags: ['bitlocker', 'recovery', 'clave recuperación', 'tpm', '48 dígitos', 'aka.ms/aadrecoverykey', 'cifrado', 'encryption', '0xc0000225', 'manage-bde', 'windows', 'endpoint', 'helpdesk'],
  },
  {
    id: 'hd-outlook',
    name: 'Outlook Connectivity Analyzer',
    cat: 'HELPDESK',
    desc: 'Diagnóstico multi-síntoma de Outlook (no abre, bucle de contraseña, sin correo…) con pasos L1 soportados + escalera clásica OWA → otros usuarios → móvil para separar cliente vs servicio.',
    tags: ['outlook', 'correo', 'email', 'exchange', 'm365', 'microsoft 365', 'ost', 'perfil', 'credentials', 'owa', 'bucle contraseña', 'no abre', 'office', 'helpdesk', 'service desk'],
  },
  {
    id: 'hd-printer',
    name: 'Printer & Spooler Fix',
    cat: 'HELPDESK',
    desc: 'Impresoras L1 por pestañas: cola atascada (net stop spooler), spooler se cae (Event 7031 + alerta PrintNightmare), impresora en red (\\servidor, puerto 9100) y síntomas físicos.',
    tags: ['impresora', 'printer', 'spooler', 'cola', 'queue', 'printnightmare', 'cve-2021-34527', 'net stop spooler', '7031', 'cola de impresión', 'hardware', 'helpdesk', 'service desk'],
  },
  {
    id: 'hd-bsod',
    name: 'BSOD & Stop Code Explorer',
    cat: 'HELPDESK',
    desc: 'Catálogo de 24 STOP codes frecuentes (0x7B, 0xD1, 0x124…) con significado, causas, primeros pasos L1 (Safe Mode, SFC, DISM) y qué recopilar para el ticket.',
    tags: ['bsod', 'pantalla azul', 'blue screen', 'stop code', '0x7b', '0xd1', '0x124', 'crash', 'driver', 'sfc', 'dism', 'minidump', 'whea', 'windows', 'endpoint', 'helpdesk'],
  },
  {
    id: 'hd-gpo',
    name: 'GPO Result Helper',
    cat: 'HELPDESK',
    desc: 'Cómo ejecutar y leer gpresult (/r, /h, /scope), interpretar Applied/Denied y precedencia LSDOU, síntomas comunes de GPO que no llega y qué capturar para escalar a administración de sistemas.',
    tags: ['gpo', 'gpresult', 'directiva', 'group policy', 'lsdou', 'security filtering', 'wmi filter', 'mapeo', 'unidad de red', '7016', '1125', 'windows', 'endpoint', 'helpdesk', 'escalation'],
  },
  {
    id: 'hd-network',
    name: 'Network L1 Toolkit',
    cat: 'HELPDESK',
    desc: 'Redes para L1: intérprete de ipconfig (subred, gateway, APIPA — pega la salida completa), escalera de conectividad ping/nslookup con diagnóstico tentativo y guía rápida Wi-Fi/DHCP.',
    tags: ['red', 'network', 'ipconfig', 'ping', 'dns', 'dhcp', 'wifi', 'apipa', '169.254', 'gateway', 'subred', 'subnet', 'nslookup', 'flushdns', 'troubleshooting', 'l1', 'helpdesk', 'service desk'],
  },
  {
    id: 'hd-intune',
    name: 'Intune / Autopilot Status',
    cat: 'HELPDESK',
    desc: 'Decodificador de estados y códigos de Intune/Autopilot (enrollment 0x8018xxxx, ESP atascado, compliance, apps) con acción L1 y checklist de sincronización manual. Referencia educativa offline.',
    tags: ['intune', 'autopilot', 'mdm', 'enrollment', 'esp', 'compliance', 'company portal', 'sync', '0x8018002a', 'endpoint manager', 'windows', 'endpoint', 'helpdesk'],
  },
  {
    id: 'hd-sanitizer',
    name: 'System Info Sanitizer',
    cat: 'HELPDESK',
    desc: 'Sanitiza información técnica antes de compartirla: detecta IPs públicas, MACs, hostnames, usuarios, SIDs, emails, seriales y claves — salida con placeholders consistentes. No garantiza anonimización perfecta.',
    tags: ['sanitizer', 'sanitizar', 'anonimizar', 'anonimización', 'compartir', 'ip', 'mac', 'hostname', 'serial', 'licencia', 'privacy', 'privacidad', 'helpdesk', 'evidencia'],
  },
  {
    id: 'hd-share',
    name: 'File Share & Permissions L1',
    cat: 'HELPDESK',
    desc: 'Permisos efectivos SHARE × NTFS (la capa más restrictiva gana), constructor de comandos icacls y checklist «no veo la carpeta». Simulador educativo.',
    tags: ['share', 'ntfs', 'permisos', 'permissions', 'icacls', 'carpeta compartida', 'unidad mapeada', 'whoami', 'denegar', 'deny', 'inheritance', 'windows', 'endpoint', 'helpdesk', 'service desk'],
  },
  {
    id: 'hd-remote',
    name: 'Remote Assist Checklist',
    cat: 'HELPDESK',
    desc: 'Runbook de sesión de soporte remoto: consentimiento, qué hacer (y qué nunca) durante la sesión, cierre correcto y red flags de social engineering.',
    tags: ['remote', 'remoto', 'quick assist', 'asistencia remota', 'anydesk', 'teams', 'consentimiento', 'sesión', 'social engineering', 'helpdesk', 'service desk', 'l1'],
  },
];

/** Find a catalog entry by id. */
export function findToolById(id: string): ToolCatalogEntry | undefined {
  return TOOLS_CATALOG.find((t) => t.id === id);
}
