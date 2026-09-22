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
  // 102 entradas: IAM/Red/DoS/Web/Social/Malware/PrivEsc — sin duplicar
  // Vulnerabilidades).
  | 'ataques'
  // HELPDESK (FASE 2 → V6 FASE 3) — tools L1/L2 de Service Desk 100%
  // offline que siguen siendo útiles REALES: parsers, simuladores y
  // generadores interactivos. Las 9 que eran checklists/guías estáticas
  // (Password/MFA, BitLocker, Outlook, Printer, BSOD, Share, Remote Assist,
  // GPO) migraron al dataset universal de runbooks
  // (data/troubleshootingRunbooks.ts); la SLA/Priority Calculator se
  // eliminó por orden de la spec V6.
  | 'hd-triage' | 'hd-ad-account' | 'hd-kb-gen'
  | 'hd-network' | 'hd-intune' | 'hd-sanitizer'
  // SYSADMIN (v21) — tools de Infra & Ops 100% offline: generadores y
  // calculadoras interactivas (systemd, RAID, LVM, cron, firewall,
  // capacidad). Complementan (no duplican) las tools existentes: el Cron
  // Parser explica una expresión dada; el Cron Builder la construye.
  | 'sa-systemd' | 'sa-raid' | 'sa-lvm'
  | 'sa-cron-builder' | 'sa-firewall' | 'sa-capacity';

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
  { id: 'ataques', name: 'Ataques (técnicas ofensivas)', cat: 'SECURITY', desc: 'Explorador de 102 técnicas de ataque de todo tipo SIN duplicar Vulnerabilidades: IAM/Identidad en lo que aquella no cubre (MS14-068, Bronze Bit, extracción SAM/NTDS.dit, recon AD con BloodHound, keylogging, phishing de código de dispositivo, robo de PRT, registro fraudulento de dispositivos, abuso de SCCM/Intune, AD Recycle Bin, inyección CSV), Red (MITM, ARP/DNS spoofing, DHCP starvation y rogue, MAC flooding, sniffing, port scanning, VLAN hopping, SSL stripping, evil twin, deauth, BGP hijack, KRACK, Bluetooth, mitm6, bypass de 802.1X, enumeración DNS, envenenamiento de routing interior), DoS/DDoS (SYN flood, amplificación DNS/NTP/Memcached, slow HTTP, Rapid Reset, ReDoS), Web (SQLi, XSS, SSRF, XXE, deserialización, request smuggling, CRLF, HPP, GraphQL), ingeniería social (phishing, vishing, smishing, BEC, watering hole, deepfakes), malware/C2/exfil (ransomware, supply chain, infostealers, gusanos, beaconing, exfiltración) y escalada de privilegios (PrivEsc Windows/Linux), con cómo funciona, detección KQL/SPL/Sigma y mitigación paso a paso. Sinónimos como alias, nunca filas duplicadas. 100% offline.', tags: ['ataques', 'attacks', 'ataque', 'attack', 'técnicas', 'techniques', 'red team', 'offensive', 'iam', 'sccm', 'intune', 'prt', 'bloodhound', 'device code', 'csv injection', 'mitm', 'arp spoofing', 'dns spoofing', 'sniffing', 'port scanning', 'mac flooding', 'dhcp', 'mitm6', '802.1x', 'bgp', 'krack', 'dos', 'ddos', 'syn flood', 'amplificación', 'redos', 'sqli', 'xss', 'ssrf', 'smuggling', 'crlf', 'graphql', 'phishing', 'bec', 'deepfake', 'ransomware', 'supply chain', 'worms', 'c2', 'privesc', 'kql', 'sigma', 'mitre'] },
  // ---------------- HELPDESK (V6 FASE 3) ----------------
  // Tools L1/L2 de Service Desk que siguen en el catálogo: todas son
  // INTERACTIVAS reales (parser, simulador o generador). 100% offline.
  // V6: SLA Calculator eliminada; las 9 guías/checklists migraron al
  // dataset universal de runbooks (data/troubleshootingRunbooks.ts).
  {
    id: 'hd-triage',
    name: 'Ticket Triage Parser',
    cat: 'HELPDESK',
    desc: 'Pega el texto crudo de un ticket y obtén categoría, subcategoría, impacto, urgencia, prioridad, SLA sugerido (tabla editable de ejemplo educativo), troubleshooting inicial, info requerida, causas raíz, criterios de escalación, alertas de seguridad y KB sugerida del dataset local.',
    tags: ['ticket', 'triage', 'prioridad', 'impact', 'urgencia', 'p1', 'p2', 'p3', 'sla', 'itsm', 'service desk', 'helpdesk', 'categorización', 'escalation', 'categoría'],
  },
  // (V6) hd-sla → migrada a runbooks / eliminada.
  {
    id: 'hd-ad-account',
    name: 'AD Account Troubleshooter',
    cat: 'HELPDESK',
    desc: 'Árbol de decisión para problemas de cuenta AD: bloqueada vs deshabilitada vs caducada, PowerShell de referencia (Get-ADUser, Unlock, Event 4740/4726), verificación de identidad y cuándo escalar a IAM. Simulador educativo.',
    tags: ['active directory', 'ad', 'cuenta', 'bloqueada', 'bloqueado', 'deshabilitada', 'lockout', 'disabled', 'contraseña', '4740', '4726', 'unlock-adaccount', 'get-aduser', 'badpwdcount', 'iam', 'identidad', 'helpdesk', 'service desk'],
  },
  // (V6) hd-pwreset → migrada a runbooks / eliminada.
  {
    id: 'hd-kb-gen',
    name: 'KB Article Generator',
    cat: 'HELPDESK',
    desc: 'Generador de artículos de base de conocimiento: formulario con pasos dinámicos y comandos → vista previa en vivo + salida Markdown exportable a Notas y Data & Intel.',
    tags: ['kb', 'knowledge base', 'base de conocimiento', 'artículo', 'documentación', 'generator', 'markdown', 'runbook', 'itsm', 'helpdesk', 'service desk', 'documentar'],
  },
  // (V6) hd-bitlocker → migrada a runbooks / eliminada.
  // (V6) hd-outlook → migrada a runbooks / eliminada.
  // (V6) hd-printer → migrada a runbooks / eliminada.
  // (V6) hd-bsod → migrada a runbooks / eliminada.
  // (V6) hd-gpo → migrada a runbooks / eliminada.
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
  // (V6) hd-share → migrada a runbooks / eliminada.
  // (V6) hd-remote → migrada a runbooks / eliminada.
  // ---------------- SYSADMIN (v21) ----------------
  // Tools de Infra & Ops: todas INTERACTIVAS reales (generador,
  // calculadora o planificador). 100% offline, sin fetch.
  {
    id: 'sa-systemd',
    name: 'systemd Unit Builder',
    cat: 'SYSADMIN',
    desc: 'Generador de unit files systemd (.service y .timer) desde un formulario: ExecStart, restart policies, hardening (ProtectSystem, NoNewPrivileges...), variables de entorno, timer OnCalendar — con validación, explicación de cada directiva y comandos de despliegue (daemon-reload, enable --now, status).',
    tags: ['systemd', 'unit', 'service', 'timer', 'oncalendar', 'execstart', 'restart', 'linux', 'daemon-reload', 'journalctl', 'hardening', 'protectsystem', 'sysadmin', 'infra', 'devops'],
  },
  {
    id: 'sa-raid',
    name: 'RAID Calculator',
    cat: 'SYSADMIN',
    desc: 'Calculadora de RAID 0/1/5/6/10: capacidad usable, tolerancia a fallos, mínimo de discos, overhead de paridad y riesgos por nivel — con tabla comparativa de todos los niveles para el mismo set de discos y notas operativas (rebuild, hot spare, controladora vs software).',
    tags: ['raid', 'raid0', 'raid1', 'raid5', 'raid6', 'raid10', 'paridad', 'espejo', 'stripe', 'rebuild', 'hot spare', 'mdadm', 'storage', 'disco', 'sysadmin', 'infra'],
  },
  {
    id: 'sa-lvm',
    name: 'LVM Planner',
    cat: 'SYSADMIN',
    desc: 'Planificador LVM: define PVs (discos), VG (extent size) y LVs (tamaño, snapshots) — valida capacidad por extents, calcula sobrante y genera la secuencia completa de comandos (pvcreate/vgcreate/lvcreate/mkfs/mount/fstab) con explicación paso a paso.',
    tags: ['lvm', 'pv', 'vg', 'lv', 'physical volume', 'volume group', 'logical volume', 'extent', 'pe', 'le', 'snapshot', 'pvcreate', 'vgcreate', 'lvcreate', 'mkfs', 'fstab', 'linux', 'storage', 'sysadmin', 'infra'],
  },
  {
    id: 'sa-cron-builder',
    name: 'Cron Builder',
    cat: 'SYSADMIN',
    desc: 'Constructor visual de expresiones cron: 5 campos con presets (diario, semanal, cada N, último del mes...), descripción legible en español, validación y las próximas ejecuciones calculadas localmente. Complemento del Cron Parser (que explica una expresión dada).',
    tags: ['cron', 'crontab', 'builder', 'constructor', 'schedule', 'programar', 'tarea programada', 'planificador', 'linux', 'sysadmin', 'infra', 'automatizacion'],
  },
  {
    id: 'sa-firewall',
    name: 'Firewall Rule Builder',
    cat: 'SYSADMIN',
    desc: 'Traduce UNA regla de firewall a los cuatro dialectos: ufw, iptables, nftables y firewalld (+ equivalencia Windows netsh). Acción, protocolo, puerto, origen/destino, dirección e interfaz — con explicación de cada pieza y guía de cuándo usar cada herramienta.',
    tags: ['firewall', 'ufw', 'iptables', 'nftables', 'firewalld', 'netsh', 'advfirewall', 'regla', 'rule', 'puerto', 'allow', 'deny', 'drop', 'reject', 'linux', 'windows', 'hardening', 'sysadmin', 'infra', 'red'],
  },
  {
    id: 'sa-capacity',
    name: 'Disk Growth Planner',
    cat: 'SYSADMIN',
    desc: 'Proyección de capacidad de disco: uso actual, capacidad y crecimiento (GB/mes o %) → fecha estimada de llenado, umbrales 70/80/90% con fechas concretas, tendencia y recomendaciones operativas (rotación de logs, LVM extend, archivado, alertas).',
    tags: ['capacidad', 'capacity', 'growth', 'crecimiento', 'disk', 'disco', 'proyeccion', 'prediccion', 'umbral', 'threshold', '70 80 90', 'df', 'lvm', 'extend', 'logs', 'rotacion', 'sysadmin', 'infra', 'storage'],
  },
];

/** Find a catalog entry by id. */
export function findToolById(id: string): ToolCatalogEntry | undefined {
  return TOOLS_CATALOG.find((t) => t.id === id);
}
