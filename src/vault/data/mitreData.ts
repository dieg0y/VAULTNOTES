/**
 * mitreData.ts — Dataset LOCAL de MITRE ATT&CK para el "MITRE ATT&CK Explorer" de VaultNotes.
 *
 * 100% offline. NO consulta attack.mitre.org ni ningún endpoint externo.
 * Los datos fueron curados manualmente desde conocimiento público de MITRE ATT&CK Enterprise v15.
 * Calidad sobre cantidad: ~30 técnicas + sub-técnicas cubriendo las 14 tácticas.
 *
 * Cada técnica incluye: id, name, tactic, description, detection (notas de detección),
 * platforms, subtechniques, relatedTools (cross-links a herramientas VaultNotes), tags.
 *
 * La estructura está diseñada para ampliarse: solo agregar entradas al array MITRE_TECHNIQUES.
 *
 * Exporta la interfaz `MitreTechnique`, el array `MITRE_TECHNIQUES`, el array `MITRE_TACTICS`
 * (lista ordenada de tácticas para filtros) y el helper `findMitreById`.
 * NO usa `export default`.
 */

export interface MitreSubtechnique {
  id: string;       // ej: "T1059.001"
  name: string;     // ej: "PowerShell"
  description: string;
}

export type VaultToolRef =
  | 'powershell-analyzer'
  | 'cmd-analyzer'
  | 'log-parser'
  | 'winevent'
  | 'ioc'
  | 'ioc-defang'
  | 'sigma'
  | 'detection-query';

export interface MitreTechnique {
  /** ID MITRE canónico, ej: "T1059" o "T1059.001". */
  id: string;
  /** Nombre humano, ej: "Command and Scripting Interpreter". */
  name: string;
  /** Táctica(s) padre separadas por "/", ej: "Execution". */
  tactic: string;
  /** Descripción corta (1-2 frases). */
  description: string;
  /** Notas de detección orientadas a SOC — cómo cazarlo en logs. */
  detection: string;
  /** Plataformas afectadas: Windows, Linux, macOS, Network, etc. */
  platforms: string[];
  /** Sub-técnicas (opcional — vacío si la técnica es hoja). */
  subtechniques: MitreSubtechnique[];
  /** Cross-links a herramientas VaultNotes que ayudan a analizar esta técnica. */
  relatedTools: VaultToolRef[];
  /** Tags libres para búsqueda por keyword. */
  tags: string[];
}

export const MITRE_TACTICS: string[] = [
  'Reconnaissance',
  'Resource Development',
  'Initial Access',
  'Execution',
  'Persistence',
  'Privilege Escalation',
  'Defense Evasion',
  'Credential Access',
  'Discovery',
  'Lateral Movement',
  'Collection',
  'Command and Control',
  'Exfiltration',
  'Impact',
];

export const MITRE_TECHNIQUES: MitreTechnique[] = [
  /* ─── Reconnaissance ─────────────────────────────────────────── */
  {
    id: 'T1595',
    name: 'Active Scanning',
    tactic: 'Reconnaissance',
    description: 'El adversario escanea rangos de IP, puertos y servicios para mapear el objetivo y encontrar vulnerabilidades explotables.',
    detection: 'Detectar escaneos de puertos desde una sola IP en corto tiempo (Nmap, Masscan). Monitorear conexiones a puertos no estándar y SYN sin ACK siguiente. Correlacionar con honeypots.',
    platforms: ['Network'],
    subtechniques: [
      { id: 'T1595.001', name: 'Scanning IP Blocks', description: 'Escaneo de bloques de red completos para identificar hosts vivos.' },
      { id: 'T1595.002', name: 'Vulnerability Scanning', description: 'Detección activa de vulnerabilidades conocidas (Nessus, OpenVAS).' },
      { id: 'T1595.003', name: 'Wordlist Scanning', description: 'Fuerza bruta de rutas/URLs o credenciales con diccionarios.' },
    ],
    relatedTools: ['log-parser', 'ioc', 'winevent'],
    tags: ['recon', 'scan', 'nmap', 'discovery', 'network', 'reconnaissance'],
  },
  {
    id: 'T1592',
    name: 'Gather Victim Host Information',
    tactic: 'Reconnaissance',
    description: 'Recolectar información del host objetivo (SO, hardware, software, firewall) vía OSINT o interacción ligera.',
    detection: 'Indicadores externos: queries DNS inusuales, escaneos de fingerprinting HTTP/TLS. Interno: procesos que ejecutan `systeminfo`, `hostname`, `ipconfig /all` con frecuencia alta.',
    platforms: ['Windows', 'Linux', 'macOS', 'Network'],
    subtechniques: [
      { id: 'T1592.001', name: 'Hardware Configuration', description: 'Inventario de hardware (CPU, RAM, periféricos).' },
      { id: 'T1592.002', name: 'Software Information', description: 'Listado de software instalado y versiones.' },
      { id: 'T1592.004', name: 'Client Configuration', description: 'Configuración de cliente (proxy, DNS, browser).' },
    ],
    relatedTools: ['cmd-analyzer', 'log-parser'],
    tags: ['recon', 'fingerprint', 'osint', 'systeminfo'],
  },

  /* ─── Resource Development ───────────────────────────────────── */
  {
    id: 'T1583',
    name: 'Acquire Infrastructure',
    tactic: 'Resource Development',
    description: 'El adversario compra o alquila infraestructura (servidores, dominios, certificados) para soportar operaciones futuras.',
    detection: 'Threat intel passiva: correlacionar dominios/IPs nuevas registradas con campañas conocidas. CTI feeds. WHOIS + passive DNS. Interno: poco detectable — la firma aparece después en C2.',
    platforms: ['Network'],
    subtechniques: [
      { id: 'T1583.001', name: 'Domains', description: 'Registro de dominios para phishing o C2.' },
      { id: 'T1583.002', name: 'DNS Server', description: 'Configuración de servidores DNS propios.' },
      { id: 'T1583.006', name: 'Web Services', description: 'Uso de servicios web (GitHub, Pastebin, cloud) para hosting malicioso.' },
    ],
    relatedTools: ['ioc', 'log-parser'],
    tags: ['infrastructure', 'domains', 'c2', 'resource-development'],
  },
  {
    id: 'T1587',
    name: 'Develop Capabilities',
    tactic: 'Resource Development',
    description: 'El adversario desarrolla malware, exploits o herramientas propias para usarlas contra el objetivo.',
    detection: 'Detección indirecta: firmas YARA en artefactos dejados en el entorno. Análisis de malware en sandbox. Interno: foco en staging folders con binarios sin firmar.',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [
      { id: 'T1587.001', name: 'Malware', description: 'Desarrollo de troyanos, ransomware, etc.' },
      { id: 'T1587.003', name: 'Digital Certificates', description: 'Generación de certificados para firmar código malicioso.' },
    ],
    relatedTools: ['powershell-analyzer', 'cmd-analyzer'],
    tags: ['malware', 'development', 'signing', 'code'],
  },

  /* ─── Initial Access ─────────────────────────────────────────── */
  {
    id: 'T1078',
    name: 'Valid Accounts',
    tactic: 'Initial Access',
    description: 'El adversario usa credenciales comprometidas (phishing, breach, brute force) para autenticarse como usuario legítimo y evadir controles perimetrales.',
    detection: 'Detectar logons desde IPs geográficamente inconsistentes, horarios atípicos, dispositivos nuevos. Múltiples fallos seguidos de éxito (4625 → 4624). MFA rechazada repetidamente. Event IDs 4624, 4625, 4768, 4769, 4771, 4776.',
    platforms: ['Windows', 'Linux', 'macOS', 'Network', 'IaaS', 'SaaS'],
    subtechniques: [
      { id: 'T1078.001', name: 'Default Accounts', description: 'Uso de cuentas por defecto (admin/admin, vendor).' },
      { id: 'T1078.002', name: 'Domain Accounts', description: 'Cuentas de dominio comprometidas.' },
      { id: 'T1078.003', name: 'Local Accounts', description: 'Cuentas locales comprometidas.' },
      { id: 'T1078.004', name: 'Cloud Accounts', description: 'Cuentas cloud (Azure AD, AWS IAM).' },
    ],
    relatedTools: ['winevent', 'log-parser', 'ioc', 'detection-query'],
    tags: ['accounts', 'credentials', 'login', '4624', '4625', 'brute-force'],
  },
  {
    id: 'T1190',
    name: 'Exploit Public-Facing Application',
    tactic: 'Initial Access',
    description: 'Explotación de vulnerabilidades en aplicaciones expuestas a Internet (web apps, VPNs, firewalls, mail gateways).',
    detection: 'WAF logs con payloads conocidos (SQLi, RCE, Log4Shell). HTTP status 5xx repentinos seguidos de tráfico anómalo. Reglas Sigma para Event IDs HTTP server logs. CVEs recientes en exploits públicos (CVE-2021-44228, CVE-2023-23375).',
    platforms: ['Windows', 'Linux', 'Network', 'Containers', 'IaaS'],
    subtechniques: [],
    relatedTools: ['log-parser', 'ioc', 'detection-query'],
    tags: ['exploit', 'web', 'rce', 'sqli', 'log4shell', 'cve'],
  },
  {
    id: 'T1566',
    name: 'Phishing',
    tactic: 'Initial Access',
    description: 'El adversario envía correos con attachments maliciosos o links a sitios de phishing para obtener credenciales o ejecución inicial.',
    detection: 'Mail gateway logs con alto score de spam, URLs a categorías maliciosas, attachments con macros o LNK. DMARC fails. Correlacionar clicks de URL posteriores con logons anómalos en aplicaciones web. Endpoints: Office apps spawning cmd/powershell (TA0002).',
    platforms: ['Windows', 'Linux', 'macOS', 'Network'],
    subtechniques: [
      { id: 'T1566.001', name: 'Spearphishing Attachment', description: 'Email con adjunto malicioso (DOC, XLS, ZIP, ISO).' },
      { id: 'T1566.002', name: 'Spearphishing Link', description: 'Email con link que lleva a descarga o credential harvesting.' },
      { id: 'T1566.003', name: 'Spearphishing via Service', description: 'Uso de servicios legítimos (Google Drive, Dropbox) como canal.' },
    ],
    relatedTools: ['log-parser', 'ioc', 'winevent'],
    tags: ['phishing', 'email', 'macro', 'attachment', 'social-engineering'],
  },

  /* ─── Execution ──────────────────────────────────────────────── */
  {
    id: 'T1059',
    name: 'Command and Scripting Interpreter',
    tactic: 'Execution',
    description: 'El adversario ejecuta comandos y scripts aprovechando intérpretes nativos del SO (PowerShell, cmd, bash, Python, WMI) para evadir controles de aplicación whitelisting.',
    detection: 'PowerShell con flags -enc/-EncodedCommand/-nop/-w hidden. Event ID 4104/4103 (ScriptBlock logging). Parent process inusual: winword.exe → cmd.exe / powershell.exe. Command lines > 256 chars. Base64 strings largas en CLI.',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [
      { id: 'T1059.001', name: 'PowerShell', description: 'El más usado en Windows — potente, accesible, ofuscable vía -EncodedCommand.' },
      { id: 'T1059.003', name: 'Windows Command Shell', description: 'cmd.exe — wrappers comunes (cmd /c, cmd /k).' },
      { id: 'T1059.004', name: 'Unix Shell', description: 'bash, sh, zsh — presente en macOS/Linux y WSL.' },
      { id: 'T1059.006', name: 'Python', description: 'Interpretado multiplataforma — muy usado en macOS y Linux.' },
      { id: 'T1059.007', name: 'JavaScript / VBScript', description: 'wscript.exe / cscript.exe — legado pero efectivo.' },
    ],
    relatedTools: ['powershell-analyzer', 'cmd-analyzer', 'winevent', 'detection-query'],
    tags: ['powershell', 'cmd', 'bash', 'execution', 'scripting', '4104', '4103'],
  },
  {
    id: 'T1106',
    name: 'Native API',
    tactic: 'Execution',
    description: 'El adversario usa APIs nativas del SO (Win32, NTAPI) vía llamadas directas o herramientas como rundll32, regsvr32, o scripts para evadir EDR basado en user-mode hooks.',
    detection: 'Hijacking de binaries legítimos (rundll32 loading DLLs fuera de System32). Event ID 4688 (process creation) con parent inusual. LoLBins (Living-off-the-Land Binaries) — uvul, odbcconf, pcwutl.',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [],
    relatedTools: ['cmd-analyzer', 'winevent'],
    tags: ['api', 'rundll32', 'regsvr32', 'lolbins', 'native'],
  },
  {
    id: 'T1204',
    name: 'User Execution',
    tactic: 'Execution',
    description: 'El adversario depende de que el usuario ejecute un archivo malicioso (click en attachment, doble click en LNK, ejecutar ISO).',
    detection: 'Procesos Office (winword, excel) hijos de cmd/powershell. Ejecución desde %USERPROFILE%\\Downloads. ISO/IMG mount events (Microsoft-Windows-VHDMP-Operation). Mark-of-the-Web (MOTW) missing en archivos descargados.',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [
      { id: 'T1204.002', name: 'File Executed by User', description: 'Click en archivo malicioso (LNK, ISO, ISO + LNK).' },
    ],
    relatedTools: ['cmd-analyzer', 'winevent', 'log-parser'],
    tags: ['user-execution', 'lolbins', 'iso', 'lnk', 'motw'],
  },

  /* ─── Persistence ────────────────────────────────────────────── */
  {
    id: 'T1053',
    name: 'Scheduled Task/Job',
    tactic: 'Persistence',
    description: 'El adversario programa tareas (schtasks en Windows, cron en Linux/macOS, at) para que su payload se ejecute en horarios o eventos específicos, manteniendo acceso.',
    detection: 'Event ID 4698 (task created), 4702 (task updated), 4699 (task deleted). Tareas con acciones que ejecutan PowerShell, binarios en Downloads, o paths ofuscados. schtasks /create desde línea de comando por usuario no-admin.',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [
      { id: 'T1053.005', name: 'Scheduled Task', description: 'Uso de schtasks en Windows.' },
      { id: 'T1053.003', name: 'Cron', description: 'Manipulación de crontab en Linux/macOS.' },
    ],
    relatedTools: ['cmd-analyzer', 'winevent', 'detection-query'],
    tags: ['schtasks', 'cron', 'persistence', '4698', '4702', 'scheduled-task'],
  },
  {
    id: 'T1547',
    name: 'Boot or Logon Autostart Execution',
    tactic: 'Persistence',
    description: 'Mecanismos que ejecutan código automáticamente al iniciar sesión o bootearar: Run/RunOnce keys, Startup folder, servicios, drivers, image file execution options (IFEO).',
    detection: 'Monitorear cambios en `HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run`, `RunOnce`, `Userinit`, `Shell`. Event IDs 4657 (registry value changed), 13 (Sysmon). Nuevas entradas apuntando a Downloads o rutas ofuscadas.',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [
      { id: 'T1547.001', name: 'Registry Run Keys / Startup Folder', description: 'Claves Run y carpeta Startup clásicas.' },
      { id: 'T1547.009', name: 'Shortcut Modification', description: 'LNK maliciosos en Startup.' },
    ],
    relatedTools: ['winevent', 'detection-query'],
    tags: ['registry', 'run-key', 'startup', 'persistence', 'autorun'],
  },
  {
    id: 'T1136',
    name: 'Create Account',
    tactic: 'Persistence',
    description: 'El adversario crea cuentas nuevas (locales, de dominio, cloud) para mantener acceso que sobrevive a cambios de password de otras cuentas.',
    detection: 'Event ID 4720 (account created), 4722 (enabled), 4732 (added to group). Cuentas con nombres similares a service accounts (svc_*, _service) pero creadas por usuario común. Cuentas en grupos privilegiados sin justificación.',
    platforms: ['Windows', 'Linux', 'macOS', 'Network', 'IaaS', 'SaaS'],
    subtechniques: [
      { id: 'T1136.001', name: 'Local Account', description: 'net user /add en Windows, useradd en Linux.' },
      { id: 'T1136.002', name: 'Domain Account', description: 'New-ADUser o equivalents en AD.' },
      { id: 'T1136.005', name: 'Cloud Account', description: 'Alta en IAM de cloud.' },
    ],
    relatedTools: ['winevent', 'detection-query'],
    tags: ['account', 'create', '4720', 'persistence', 'new-user'],
  },

  /* ─── Privilege Escalation ───────────────────────────────────── */
  {
    id: 'T1068',
    name: 'Exploitation for Privilege Escalation',
    tactic: 'Privilege Escalation',
    description: 'Explotación de vulnerabilidades del SO o drivers para obtener SYSTEM/root desde contexto de usuario.',
    detection: 'Procesos que escalan de Medium integrity a System sin UAC consent. Event ID 4688 con parent inusual. Tokens de integridad altos para procesos hijos de procesos no privilegiados. CVEs comunes: PrintNightmare (CVE-2021-34527), TokenKidnap, Potato family.',
    platforms: ['Windows', 'Linux', 'macOS', 'Network'],
    subtechniques: [],
    relatedTools: ['cmd-analyzer', 'winevent'],
    tags: ['privesc', 'exploit', 'system', 'token', 'potato', 'printnightmare'],
  },
  {
    id: 'T1548',
    name: 'Abuse Elevation Control Mechanism',
    tactic: 'Privilege Escalation',
    description: 'El adversario evita UAC o usa mecanismos legítimos (setuid, sudo, Bypass UAC) para obtener privilegios elevados.',
    detection: 'UAC bypass: ejecución de consent.exe ausente cuando se eleva. Event ID 4688 con parent Medium IL → child High IL sin consent. Hijacking de auto-elevated binaries (fodhelper, eventvwr).',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [
      { id: 'T1548.002', name: 'Bypass User Account Control', description: 'UAC Bypass — fodhelper, ICMLuaUtil, sdclt.' },
    ],
    relatedTools: ['cmd-analyzer', 'winevent'],
    tags: ['uac', 'bypass', 'elevation', 'sudo', 'setuid'],
  },

  /* ─── Defense Evasion ────────────────────────────────────────── */
  {
    id: 'T1027',
    name: 'Obfuscated Files or Information',
    tactic: 'Defense Evasion',
    description: 'El adversario ofusca payloads (Base64, XOR, AES, encoding layers) para evadir AV/EDR y análisis estático.',
    detection: 'Strings Base64 largas en PowerShell (-EncodedCommand). Process args con hex/encoding mixto. Binarios con secciones de alta entropía. AMSI bypass attempts. Strings ofuscados en scripts (IEX, Invoke-Obfuscation).',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [
      { id: 'T1027.002', name: 'Software Packing', description: 'UPX, MPRESS — packers para evitar firmas.' },
      { id: 'T1027.010', name: 'Command Obfuscation', description: 'Ofuscación de CLI (case mixing, ${} variables, escapes).' },
    ],
    relatedTools: ['powershell-analyzer', 'cmd-analyzer'],
    tags: ['obfuscation', 'base64', 'encoding', 'packing', 'evasion'],
  },
  {
    id: 'T1564',
    name: 'Hide Artifacts',
    tactic: 'Defense Evasion',
    description: 'El adversario oculta archivos, procesos, registry keys, ventanas o marcas de tiempo para evadir detección forense y de monitoreo.',
    detection: 'PowerShell con -WindowStyle Hidden o -w 1. Procesos sin ventana visible (HideWindowRequest). Alternate Data Streams (ADS) en NTFS. Mark-of-the-Web removido (Zone.Identifier). ntfs hide attributes en scripts.',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [
      { id: 'T1564.003', name: 'Hidden Window', description: 'Ventanas ocultas — PowerShell -WindowStyle Hidden, -w hidden.' },
      { id: 'T1564.004', name: 'NTFS File Attributes', description: 'Alternate Data Streams (ADS) en NTFS.' },
    ],
    relatedTools: ['powershell-analyzer', 'cmd-analyzer'],
    tags: ['hide', 'hidden', 'ads', 'window', 'evasion'],
  },
  {
    id: 'T1070',
    name: 'Indicator Removal',
    tactic: 'Defense Evasion',
    description: 'El adversario limpia huellas: borra logs, usa wevtutil cl, del de archivos temporales, clear de history, timestomping.',
    detection: 'Event ID 1102 (Security log cleared), 104 (System log cleared). wevtutil cl en CLI. Volumes shadow copy deletion (vssadmin delete shadows). Missing logs en rangos de tiempo cortos (gap detection).',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [
      { id: 'T1070.001', name: 'Clear Windows Event Logs', description: 'wevtutil cl System / Security.' },
      { id: 'T1070.002', name: 'Clear Linux or Mac System Logs', description: 'rm /var/log/*, history -c.' },
      { id: 'T1070.006', name: 'Timestomp', description: 'Modificación de timestamps NTFS.' },
    ],
    relatedTools: ['cmd-analyzer', 'winevent', 'log-parser'],
    tags: ['clear', 'logs', 'wevtutil', '1102', 'timestomp', 'evasion'],
  },

  /* ─── Credential Access ──────────────────────────────────────── */
  {
    id: 'T1003',
    name: 'OS Credential Dumping',
    tactic: 'Credential Access',
    description: 'El adversario extrae credenciales de la memoria del SO (LSASS en Windows), de archivos (NTDS.dit, SAM), o del proceso del administrador de credenciales.',
    detection: 'Procesos accediendo a lsass.exe con ProcessAccess (VMReadWrite) — Event ID Sysmon 10 con TargetImage lsass.exe. Herramientas conocidas: mimikatz, procdump, taskmgr /dump. NTDS.dit being read/copyed. SAM registry hive read via reg save.',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [
      { id: 'T1003.001', name: 'LSASS Memory', description: 'mimikatz sekurlsa::logonpasswords — el más famoso.' },
      { id: 'T1003.002', name: 'Security Account Manager', description: 'Extracción del SAM vía reg save o offline.' },
      { id: 'T1003.003', name: 'NTDS.dit', description: 'Copia del NTDS.dit — base de datos de AD.' },
      { id: 'T1003.006', name: 'DCSync', description: 'mimikatz lsadump::dcsync — replica credenciales vía DRSUAPI.' },
    ],
    relatedTools: ['cmd-analyzer', 'winevent', 'ioc', 'detection-query'],
    tags: ['mimikatz', 'lsass', 'credentials', 'ntds', 'dcsync', 'sam'],
  },
  {
    id: 'T1110',
    name: 'Brute Force',
    tactic: 'Credential Access',
    description: 'El adversario prueba credenciales sistemáticamente (password spraying, credential stuffing) para obtener acceso inicial o escalar.',
    detection: 'Múltiples 4625 seguidos de 4624. RPC traffic to lsass from non-domain machines (ntlmrelay). 4771 (Kerberos pre-auth failures), 4776 (NTLM failures). Sudden spike en ratio failed/successful logons para una cuenta.',
    platforms: ['Windows', 'Linux', 'macOS', 'Network', 'IaaS', 'SaaS'],
    subtechniques: [
      { id: 'T1110.001', name: 'Password Guessing', description: 'Fuerza bruta contra una cuenta.' },
      { id: 'T1110.003', name: 'Password Spraying', description: 'Una password contra muchas cuentas (evita lockout).' },
      { id: 'T1110.004', name: 'Credential Stuffing', description: 'Reutiliza creds filtradas de otros breaches.' },
    ],
    relatedTools: ['winevent', 'log-parser', 'detection-query'],
    tags: ['brute-force', 'password-spray', '4625', '4771', '4776'],
  },
  {
    id: 'T1555',
    name: 'Credentials from Password Stores',
    tactic: 'Credential Access',
    description: 'El adversario extrae credenciales de password managers locales (Vault, Credential Manager, Keychain), browsers, o stores de Windows.',
    detection: 'Procesos accediendo a %APPDATA%\\Mozilla\\Firefox\\Profiles\\*.logins.json o equivalentes en Chrome/Edge. Invoke-Mimikatz dpapi module. Event IDs 4663 (object access) a archivos sensibles. DPAPI Master Key files access.',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [
      { id: 'T1555.003', name: 'Credentials from Web Browsers', description: 'Robo de passwords guardadas en Chrome/Edge/Firefox.' },
      { id: 'T1555.004', name: 'Credentials from Windows Credential Manager', description: 'Vault / Cmdkey listado y dump.' },
    ],
    relatedTools: ['cmd-analyzer', 'winevent'],
    tags: ['browsers', 'credential-manager', 'keychain', 'dpapi', 'passwords'],
  },

  /* ─── Discovery ──────────────────────────────────────────────── */
  {
    id: 'T1087',
    name: 'Account Discovery',
    tactic: 'Discovery',
    description: 'El adversario enumera cuentas (locales, de dominio, cloud) para identificar targets de credenciales y mapear el entorno.',
    detection: 'net user /domain, net group, Get-ADUser, Get-LocalUser en corto tiempo. LDAP queries con filtros extensos. Event ID 4797 (lookup of password policy), 4661 (SAM queries). Sudden spike en queries LDAP desde un host.',
    platforms: ['Windows', 'Linux', 'macOS', 'Network', 'IaaS', 'SaaS'],
    subtechniques: [
      { id: 'T1087.001', name: 'Local Account', description: 'net user, Get-LocalUser.' },
      { id: 'T1087.002', name: 'Domain Account', description: 'net user /domain, Get-ADUser.' },
    ],
    relatedTools: ['cmd-analyzer', 'winevent'],
    tags: ['account', 'discovery', 'net-user', 'ldap'],
  },
  {
    id: 'T1018',
    name: 'Remote System Discovery',
    tactic: 'Discovery',
    description: 'El adversario enumera hosts y servers del entorno para identificar targets de lateral movement.',
    detection: 'ping sweeps, arp -a, nmap interno. net view, net group "Domain Computers". Queries DNS internas masivas. PowerShell Get-NetTCPConnection repetido. Event IDs relacionados con SMB enumeration (5140, 5145).',
    platforms: ['Windows', 'Linux', 'macOS', 'Network'],
    subtechniques: [],
    relatedTools: ['cmd-analyzer', 'log-parser', 'ioc'],
    tags: ['discovery', 'network', 'ping-sweep', 'arp', 'net-view'],
  },
  {
    id: 'T1046',
    name: 'Network Service Discovery',
    tactic: 'Discovery',
    description: 'Escaneo de puertos y servicios del entorno interno para identificar puntos de acceso o shares.',
    detection: 'Conexiones SMB/RDP/WinRM desde un host a muchos destinos en corto tiempo. Conexiones a puertos 445, 3389, 5985. Masscan / Nmap en CLI. Event IDs 5140, 5145 (SMB share access), 4624 type 3 (network logon) de un host a muchos.',
    platforms: ['Windows', 'Linux', 'macOS', 'Network'],
    subtechniques: [],
    relatedTools: ['cmd-analyzer', 'log-parser', 'ioc'],
    tags: ['scan', 'ports', 'services', 'smb', 'network-discovery'],
  },

  /* ─── Lateral Movement ───────────────────────────────────────── */
  {
    id: 'T1021',
    name: 'Remote Services',
    tactic: 'Lateral Movement',
    description: 'El adversario usa servicios remotos legítimos (RDP, SMB/Admin shares, WinRM, SSH, VNC) para moverse entre hosts.',
    detection: 'Logon type 10 (RemoteInteractive) en 4624. Conexiones RDP (3389) entre workstations (normalmente solo a terminales). PsExec service (PSEXESVC) creado en destino. WinRM (5985/5986) desde host no-admin. SSH connections internas con claves nuevas.',
    platforms: ['Windows', 'Linux', 'macOS', 'Network'],
    subtechniques: [
      { id: 'T1021.001', name: 'Remote Desktop Protocol', description: 'RDP — Logon Type 10.' },
      { id: 'T1021.002', name: 'SMB/Windows Admin Shares', description: 'ADMIN$, C$, IPC$.' },
      { id: 'T1021.006', name: 'Windows Remote Management', description: 'WinRM / PowerShell remoting.' },
      { id: 'T1021.004', name: 'SSH', description: 'Robo de claves privadas + ssh lateral.' },
    ],
    relatedTools: ['winevent', 'log-parser', 'detection-query'],
    tags: ['rdp', 'smb', 'winrm', 'ssh', 'psexec', 'lateral'],
  },
  {
    id: 'T1072',
    name: 'Software Deployment Tools',
    tactic: 'Lateral Movement',
    description: 'El adversario abusa de herramientas legítimas de deployment (SCCM, Altiris, Ansible, PDQ) para distribuir payloads a muchos hosts a la vez.',
    detection: 'Log de SCCM con packages nuevos en horario atípico. Nuevas colecciones o deployments creados por usuario no-admin. Execución de scripts PowerShell desde el servidor de deployment a los hosts.',
    platforms: ['Windows', 'Linux', 'macOS', 'Network'],
    subtechniques: [],
    relatedTools: ['cmd-analyzer', 'winevent'],
    tags: ['sccm', 'ansible', 'altiris', 'pdq', 'deployment', 'lateral'],
  },

  /* ─── Collection ─────────────────────────────────────────────── */
  {
    id: 'T1560',
    name: 'Archive Collected Data',
    tactic: 'Collection',
    description: 'El adversario comprime y/o encripta datos robados en archivos ZIP, RAR, 7z para exfiltración más fácil.',
    detection: 'Procesos raros lanzando 7z, rar, zip en directorios de documentos o en Downloads. Comando PowerShell `Compress-Archive` con paths sensibles. Bitsadmin o certutil con download. Creación de archives en directorios temporales inusuales.',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [
      { id: 'T1560.001', name: 'Archive via Utility', description: 'Uso de 7z, WinRAR, zip desde CLI.' },
      { id: 'T1560.003', name: 'Archive via Custom Method', description: 'Compress-Archive, tar, etc.' },
    ],
    relatedTools: ['cmd-analyzer', 'winevent'],
    tags: ['archive', 'zip', '7z', 'rar', 'compress', 'exfil-prep'],
  },
  {
    id: 'T1005',
    name: 'Data from Local System',
    tactic: 'Collection',
    description: 'El adversario busca y copia archivos sensibles locales (documentos, configs, credenciales en texto plano, SSH keys).',
    detection: 'File access a documentos en %USERPROFILE%\\Documents, escritura a USB. SMB share access 5140/5145 con muchos reads. xcopy/robocopy recursivo. SearchIndexer con procesos externos leyendo index.',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [],
    relatedTools: ['cmd-analyzer', 'winevent'],
    tags: ['collection', 'documents', 'files', 'local'],
  },

  /* ─── Command and Control ────────────────────────────────────── */
  {
    id: 'T1071',
    name: 'Application Layer Protocol',
    tactic: 'Command and Control',
    description: 'El adversario usa protocolos de capa de aplicación legítimos (HTTP/S, DNS, SMB, WebSocket) para C2 y evadir filtros de red.',
    detection: 'Conexiones HTTP/S a dominios nuevos o con baja reputación. Beacons periódicos (timing regular). TLS JA3/JA4 mismatches con user-agent. DNS tunneling (queries TXT largas, subdomains largos). SMB usado para C2 (Named Pipes externas).',
    platforms: ['Windows', 'Linux', 'macOS', 'Network'],
    subtechniques: [
      { id: 'T1071.001', name: 'Web Protocols', description: 'HTTP/HTTPS — el más común.' },
      { id: 'T1071.004', name: 'DNS', description: 'DNS tunneling (iodine, dnscat2).' },
    ],
    relatedTools: ['log-parser', 'ioc', 'detection-query'],
    tags: ['c2', 'http', 'dns', 'beacon', 'tunneling'],
  },
  {
    id: 'T1105',
    name: 'Ingress Tool Transfer',
    tactic: 'Command and Control',
    description: 'El adversario transfiere herramientas o payloads al host comprometido usando BITS, certutil, wget, curl, Invoke-WebRequest, etc.',
    detection: 'Event ID Sysmon 3 (network connection) o 22 (DNS query) seguido de Sysmon 11 (file create). BITSadmin /transfer. certutil -urlcache -split -f. PowerShell `iwr`, `iex (iwr ...)`. Descargas a %TEMP% o %APPDATA%.',
    platforms: ['Windows', 'Linux', 'macOS', 'Network'],
    subtechniques: [],
    relatedTools: ['cmd-analyzer', 'powershell-analyzer', 'ioc'],
    tags: ['download', 'bits', 'certutil', 'curl', 'wget', 'ingress'],
  },
  {
    id: 'T1572',
    name: 'Protocol Tunneling',
    tactic: 'Command and Control',
    description: 'El adversario tuneliza tráfico a través de un protocolo legítimo (DNS, ICMP, SSL, SSH) para evadir firewall/NAT.',
    detection: 'Túneles ICMP largos (ping con data). DNS queries con payloads largos (TXT, subdomain > 50 chars). Beaconing sobre SSL con certificados self-signed. Procesos como plink, ngrok, iodine, chisel, ligolo.',
    platforms: ['Windows', 'Linux', 'macOS', 'Network'],
    subtechniques: [],
    relatedTools: ['log-parser', 'ioc', 'detection-query'],
    tags: ['tunnel', 'dns', 'icmp', 'chisel', 'iodine'],
  },

  /* ─── Exfiltration ───────────────────────────────────────────── */
  {
    id: 'T1041',
    name: 'Exfiltration Over C2 Channel',
    tactic: 'Exfiltration',
    description: 'El adversario exfiltra datos a través del canal de C2 ya establecido (HTTP/S, DNS, ICMP) para mezclar el tráfico con el C2 legítimo.',
    detection: 'Subidas HTTP POST grandes (>10MB) a un mismo destino. Uploads a IPs/dominios recién contactados. Increase de bytes enviados vs bytes recibidos en conexiones largas. Beaconing con payloads grandes tras handshakes cortos.',
    platforms: ['Windows', 'Linux', 'macOS', 'Network'],
    subtechniques: [],
    relatedTools: ['log-parser', 'ioc'],
    tags: ['exfil', 'c2', 'upload', 'data-theft'],
  },
  {
    id: 'T1567',
    name: 'Exfiltration Over Web Service',
    tactic: 'Exfiltration',
    description: 'El adversario usa servicios web legítimos (Dropbox, Google Drive, OneDrive, Mega, Pastebin, GitHub) para exfiltrar datos — disfraza el tráfico como cloud storage normal.',
    detection: 'Tráfico a dominios cloud desde procesos no-cloud-sync. Uploads grandes a mega.nz, transfer.sh, gofile.io. Tokens OAuth a APIs de storage sin actividad previa. Transferencias grandes a disco compartidos externos.',
    platforms: ['Windows', 'Linux', 'macOS', 'Network', 'IaaS', 'SaaS'],
    subtechniques: [
      { id: 'T1567.001', name: 'Exfiltration to Code Repository', description: 'GitHub, GitLab — push a repo público.' },
      { id: 'T1567.002', name: 'Exfiltration to Cloud Storage', description: 'Dropbox, S3, Mega, transfer.sh.' },
    ],
    relatedTools: ['log-parser', 'ioc'],
    tags: ['exfil', 'cloud', 'dropbox', 'mega', 'pastebin', 'github'],
  },

  /* ─── Impact ─────────────────────────────────────────────────── */
  {
    id: 'T1486',
    name: 'Data Encrypted for Impact',
    tactic: 'Impact',
    description: 'El adversario encripta datos en disco (ransomware) para extorsión o destructión — LockBit, BlackCat, Ryuk, etc.',
    detection: 'Procesos renombrando archivos masivamente (*.locked, *.enc). vssadmin delete shadows, wbadmin delete catalog. Spike en I/O escritura en corto tiempo. Cambios masivos de extensiones en shares. Event IDs 4663 (object access), 4660 (object deleted).',
    platforms: ['Windows', 'Linux', 'macOS', 'Network'],
    subtechniques: [],
    relatedTools: ['cmd-analyzer', 'winevent', 'log-parser'],
    tags: ['ransomware', 'encryption', 'lockbit', 'blackcat', 'vssadmin'],
  },
  {
    id: 'T1490',
    name: 'Inhibit System Recovery',
    tactic: 'Impact',
    description: 'El adversario destruye puntos de recuperación (shadow copies, backups, recovery partitions) para impedir recuperar el sistema sin pagar.',
    detection: 'vssadmin delete shadows /all /quiet. bcdedit /set {default} recoveryenabled No. wbadmin delete catalog. Event IDs 8222 (VSS writer shadow copy deleted), 1100 (VSS service stopped).',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [],
    relatedTools: ['cmd-analyzer', 'winevent'],
    tags: ['ransomware', 'vssadmin', 'bcdedit', 'wbadmin', 'recovery', 'shadow-copies'],
  },
  {
    id: 'T1498',
    name: 'Network Denial of Service',
    tactic: 'Impact',
    description: 'El adversario realiza un DoS de red (SYN flood, amplificación DNS/NTP, HTTP flood) para interrumpir disponibilidad de un servicio.',
    detection: 'Spike de SYN sin ACK desde muchas IPs. Tráfico UDP amplificado a puertos reflejantes (NTP monlist). Errores 502/503 repentinos en apps. Discos de red saturados. WAF events con rate-limit hits.',
    platforms: ['Network'],
    subtechniques: [
      { id: 'T1498.001', name: 'Direct Network Flooding', description: 'SYN flood, UDP flood directo.' },
      { id: 'T1498.002', name: 'Reflection Amplification', description: 'DNS/NTP/CLDAP amplificación.' },
    ],
    relatedTools: ['log-parser', 'ioc'],
    tags: ['dos', 'ddos', 'syn-flood', 'amplification', 'availability'],
  },
];

/** Helper: find a MITRE technique by ID (case-insensitive).
 *  Handles BOTH parent techniques (T1059) and sub-technique IDs (T1059.001):
 *  if the exact id is not a top-level technique, fall back to its parent
 *  (strip the `.NNN` suffix). This lets callers pass a subtechnique ID
 *  (e.g. from a Sigma rule's `mitre: ['T1110.001']` ref) and still get the
 *  parent technique back for display. */
export function findMitreById(id: string): MitreTechnique | undefined {
  if (!id) return undefined;
  const target = id.toUpperCase();
  // Exact match
  const exact = MITRE_TECHNIQUES.find((t) => t.id.toUpperCase() === target);
  if (exact) return exact;
  // Subtechnique → strip suffix and find parent (T1059.001 → T1059)
  const dotIdx = target.lastIndexOf('.');
  if (dotIdx > 0) {
    const parent = target.slice(0, dotIdx);
    return MITRE_TECHNIQUES.find((t) => t.id.toUpperCase() === parent);
  }
  return undefined;
}
