/**
 * mitreData.ts — Dataset LOCAL de MITRE ATT&CK para el "MITRE ATT&CK Explorer" de VaultNotes.
 *
 * 100% offline. NO consulta attack.mitre.org ni ningún endpoint externo.
 * Los datos fueron curados manualmente desde conocimiento público de MITRE ATT&CK Enterprise v15.
 * Calidad sobre cantidad: 61 técnicas + sub-técnicas cubriendo las 14 tácticas.
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
  {
    id: 'T1133',
    name: 'External Remote Services',
    tactic: 'Initial Access',
    description: 'El adversario abusa de servicios de acceso remoto expuestos a Internet (VPN, RDP sin filtrar, Citrix, VNC, herramientas RMM) para entrar con credenciales válidas o exploits conocidos del appliance. Es la puerta de entrada favorita del ransomware moderno.',
    detection: 'Correlacionar autenticaciones de VPN/RD Gateway con geolocalización y ASN (hosting/VPS = rojo). Event IDs 4624 LogonType 3/10 y 4771/4776 en los hosts de acceso. Buscar MFA fatigue (múltiples push rechazados seguidos de un éxito), sesiones VPN de usuarios sin actividad interna previa y exploits recientes de appliances (Ivanti, Fortinet, Citrix, SonicWall). Baselinear horarios, dispositivos y países por usuario — cualquier desviación = escalar.',
    platforms: ['Windows', 'Linux', 'macOS', 'Network'],
    subtechniques: [],
    relatedTools: ['winevent', 'log-parser', 'ioc', 'detection-query'],
    tags: ['vpn', 'rdp-exposure', 'citrix', 'rmm', 'initial-access', 'servicios-remotos'],
  },
  {
    id: 'T1195',
    name: 'Supply Chain Compromise',
    tactic: 'Initial Access',
    description: 'El adversario compromete al proveedor de software o hardware que la víctima usa — instala backdoors en actualizaciones o dependencias firmadas (SolarWinds, 3CX, Kaseya, xz-utils). El malware entra por un canal de confianza con firma digital válida.',
    detection: 'Hunting: comparar hashes de binarios del proveedor contra los manifests oficiales y alertar si un binario firmado hace conexiones salientes a dominios nuevos (Sysmon 3 + 22, enriquecer con passive DNS). Monitorear anomalías de firma de código (certificados nuevos, seriales revocados) y el histórico de update logs del vendor. Dependencias (NuGet/PyPI/npm) requieren SBOM y comparación de versiones contra los registros upstream.',
    platforms: ['Windows', 'Linux', 'macOS', 'Network', 'Containers'],
    subtechniques: [
      { id: 'T1195.001', name: 'Compromise Software Dependencies and Development Tools', description: 'Backdoor en librerías de terceros o toolchains de build.' },
      { id: 'T1195.002', name: 'Compromise Software Supply Chain', description: 'Compromiso del canal de distribución/actualización del vendor (SolarWinds Orion).' },
      { id: 'T1195.003', name: 'Compromise Hardware Supply Chain', description: 'Manipulación de hardware/firmware en fábrica o en tránsito.' },
    ],
    relatedTools: ['ioc', 'log-parser', 'sigma', 'detection-query'],
    tags: ['supply-chain', 'solarwinds', '3cx', 'update', 'vendor', 'cadena-de-suministro'],
  },
  {
    id: 'T1199',
    name: 'Trusted Relationship',
    tactic: 'Initial Access',
    description: 'El adversario abusa del acceso legítimo que un tercero de confianza (MSP, proveedor de soporte, integración SaaS, socio de negocio) ya tiene sobre el entorno. Comprometen al proveedor primero y descienden hasta la víctima por las delegaciones existentes.',
    detection: 'Inventariar cuentas de terceros y delegaciones (M365 GDAP, OAuth apps con permisos admin, cuentas de servicio del MSP). Alertar logons desde rangos IP del proveedor fuera de ventanas de mantenimiento (4624, sign-in logs de Entra ID con client ID del MSP). Comparar actividad del proveedor contra lo contratado: cualquier host no listado = escalar. El Unified Audit Log muestra operaciones admin hechas con tokens delegados.',
    platforms: ['Windows', 'Network', 'IaaS', 'SaaS'],
    subtechniques: [],
    relatedTools: ['winevent', 'log-parser', 'ioc', 'detection-query'],
    tags: ['trusted-relationship', 'msp', 'oauth', 'delegation', 'terceros'],
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
  {
    id: 'T1569',
    name: 'System Services',
    tactic: 'Execution',
    description: 'El adversario ejecuta payloads abusando de los servicios del sistema: crea servicios propios (sc.exe, service wrapper de PsExec) o abusa de launchd en macOS. Muy común para ejecutar con privilegios SYSTEM en movimiento lateral.',
    detection: 'Event IDs 4697 (Security) y 7045 (System) por creación de servicio; Sysmon 1 para sc.exe create con binPath en rutas de usuario (%TEMP%, %APPDATA%, C:\\Users\\Public). Cazar servicios con binarios sin firma digital en System32 o paths relativos. En macOS: launchctl load de plists fuera de las rutas de sistema.',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [
      { id: 'T1569.001', name: 'Launchctl', description: 'Abuso del sistema de servicios launchd en macOS.' },
      { id: 'T1569.002', name: 'Service Execution', description: 'Creación/arranque de servicios de Windows para ejecutar código como SYSTEM.' },
    ],
    relatedTools: ['cmd-analyzer', 'winevent', 'detection-query'],
    tags: ['service', 'sc.exe', '7045', '4697', 'launchd', 'execution'],
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
  {
    id: 'T1546',
    name: 'Event Triggered Execution',
    tactic: 'Persistence',
    description: 'El adversario configura mecanismos del SO que ejecutan código automáticamente ante eventos: suscripciones WMI, cambios de file associations, Netsh Helper DLLs, COM hijacking o IFEO. Persistencia que sobrevive a reinicios y a cambios de password.',
    detection: 'Sysmon 19/20/21 para suscripciones WMI (filtros __EventFilter + consumidores CommandLineEventConsumer; o WMI-Activity 5861). Sysmon 13 sobre `HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options` (valores Debugger/GlobalFlag), sobre `Shell\\open\\command` y ProgIds (file association hijack). Cazar AppInit_DLLs habilitados y CLSIDs COM redirigidos a binarios en carpetas de usuario. Contrapartida forense: Sysinternals Autoruns con diff programado.',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [
      { id: 'T1546.001', name: 'Change Default File Association', description: 'Reapuntar extensiones (.txt, .pdf) a un binario del atacante.' },
      { id: 'T1546.003', name: 'WMI Event Subscription', description: 'Binding + filtro + consumer WMI que ejecuta comandos ante eventos del sistema.' },
      { id: 'T1546.007', name: 'Netsh Helper DLL', description: 'DLLs de ayuda que netsh.exe carga al iniciar.' },
      { id: 'T1546.008', name: 'Application Shimming', description: 'Shims de compatibilidad (sdbinst) para redirigir APIs de binarios legítimos.' },
      { id: 'T1546.010', name: 'AppInit DLLs', description: 'DLLs inyectadas en todos los procesos que cargan user32.dll.' },
      { id: 'T1546.011', name: 'Component Object Model Hijacking', description: 'Reemplazar el InprocServer32 de objetos COM usados por apps legítimas.' },
      { id: 'T1546.012', name: 'Image File Execution Options Injection', description: 'Valor Debugger/GlobalFlag en IFEO para secuestrar la ejecución de binarios.' },
    ],
    relatedTools: ['winevent', 'cmd-analyzer', 'detection-query'],
    tags: ['wmi-subscription', 'ifeo', 'com-hijacking', 'netsh', 'appinit', 'persistencia'],
  },
  {
    id: 'T1505',
    name: 'Server Software Component',
    tactic: 'Persistence',
    description: 'El adversario instala componentes maliciosos dentro del software de un servidor — web shells en IIS/Apache, módulos nativos de IIS, transport agents de Exchange — para persistir con la identidad del propio servicio web.',
    detection: 'Sysmon 11 (creación de .aspx/.asp/.jsp/.php en inetpub o document root) y 4663 escrituras en directorios web por procesos que no son de deployment. Cazar contenido típico de web shell en archivos nuevos (eval, Request.BinaryRead, cmd.exe, System.Net.Sockets). Para IIS modules: diffs de applicationHost.config; para Exchange: nuevos transport agents en el log de setup. Verificar integridad de archivos del servidor contra la golden image.',
    platforms: ['Windows', 'Linux', 'Network'],
    subtechniques: [
      { id: 'T1505.003', name: 'Web Shell', description: 'Script alojado en el servidor web que ejecuta comandos vía HTTP.' },
      { id: 'T1505.004', name: 'IIS Components', description: 'Módulos nativos/administrados de IIS cargados como backdoor.' },
    ],
    relatedTools: ['winevent', 'log-parser', 'sigma', 'ioc'],
    tags: ['web-shell', 'aspx', 'iis', 'exchange', 'persistencia', 'backdoor'],
  },
  {
    id: 'T1098',
    name: 'Account Manipulation',
    tactic: 'Persistence',
    description: 'El adversario manipula cuentas existentes para asegurar acceso futuro: agrega credenciales o llaves SSH, registra roles cloud adicionales o resetea passwords. Menos ruidoso que crear cuentas nuevas y no dispara alertas de onboarding.',
    detection: 'Event IDs 4738 (cuenta modificada), 4724 (password reset hecho por otro usuario), 4781 (cambio de nombre de cuenta). Cazar 4724 ejecutado por cuentas fuera de Help Desk, resets de service accounts fuera de calendario, y cambios de userAccountControl (activar DONT_EXPIRE_PASSWORD o quitar SMARTCARD_REQUIRED). En cloud: sign-in logs con credenciales adicionales registradas y activaciones PIM fuera de ventana. En Linux: modificaciones a authorized_keys de cuentas de servicio.',
    platforms: ['Windows', 'Linux', 'macOS', 'IaaS', 'SaaS'],
    subtechniques: [
      { id: 'T1098.001', name: 'Additional Cloud Credentials', description: 'Registrar llaves/tokens extra en cuentas cloud existentes.' },
      { id: 'T1098.003', name: 'Additional Cloud Roles', description: 'Asignar roles IAM/PIM adicionales a una cuenta ya comprometida.' },
      { id: 'T1098.004', name: 'SSH Authorized Keys', description: 'Agregar llaves públicas a authorized_keys para acceso persistente.' },
    ],
    relatedTools: ['winevent', 'log-parser', 'detection-query'],
    tags: ['account-manipulation', '4738', '4724', 'ssh-keys', 'cloud-roles', 'persistence'],
  },
  {
    id: 'T1574',
    name: 'Hijack Execution Flow',
    tactic: 'Persistence',
    description: 'El adversario intercepta el flujo de carga de binarios legítimos — DLL Search Order Hijacking, DLL Side-Loading o servicios huérfanos que apuntan a binarios inexistentes — para que procesos de confianza ejecuten su código.',
    detection: 'Sysmon 7 (Image Loaded) para DLLs del sistema cargadas desde rutas escribibles (C:\\Users, C:\\ProgramData, C:\\Temp): comparar carpeta vs firma. Cazar exe firmados cuyo hijo carga una DLL no firmada del mismo directorio (side-loading clásico). Event ID 4688 con Image en rutas de usuario lanzado por services.exe. Herramientas: Autoruns, diff de metadatos PE y la baseline de DLLs legítimas por proceso del EDR.',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [
      { id: 'T1574.001', name: 'DLL Search Order Hijacking', description: 'Colocar la DLL en una ruta que el loader examina antes que la legítima.' },
      { id: 'T1574.002', name: 'DLL Side-Loading', description: 'Aprovechar binarios firmados que cargan DLLs desde su propia carpeta.' },
    ],
    relatedTools: ['winevent', 'log-parser', 'detection-query'],
    tags: ['dll-hijacking', 'side-loading', 'search-order', 'persistencia', 'execution-flow'],
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
  {
    id: 'T1562',
    name: 'Impair Defenses',
    tactic: 'Defense Evasion',
    description: 'El adversario deshabilita o degrada las defensas del host y del entorno: apaga AV/EDR, desactiva logging o firewall, borra historial o fuerza safe mode. Suele ser el primer paso tras obtener ejecución inicial.',
    detection: 'Event IDs 1102/104 (logs borrados), 7036/7040 en System log cuando servicios de seguridad cambian de estado, 4688/4104 con Set-MpPreference -DisableRealtimeMonitoring, wevtutil cl, auditpol /clear /remove, Set-NetFirewallProfile -Enabled False y eventos de tamper protection de Defender (5001). Cazar también exclusiones nuevas de AV (Add-MpPreference -ExclusionPath) y reglas de exclusión de procesos EDR en el log de configuración del agente.',
    platforms: ['Windows', 'Linux', 'macOS', 'Network', 'Containers', 'IaaS'],
    subtechniques: [
      { id: 'T1562.001', name: 'Impair Defenses', description: 'Deshabilitar o hacer bypass de AV, EDR y tamper protection.' },
      { id: 'T1562.002', name: 'Disable Windows Event Logging', description: 'Parar el Event Log Service o forzar overwrite del log.' },
      { id: 'T1562.004', name: 'Disable or Modify System Firewall', description: 'Apagar reglas del firewall de host para habilitar C2.' },
      { id: 'T1562.005', name: 'Disable or Modify Tools', description: 'Matar o descargar herramientas de seguridad y sus procesos.' },
      { id: 'T1562.006', name: 'Indicator Blocking', description: 'Bloquear los IOCs que las herramientas usan para detectar.' },
    ],
    relatedTools: ['cmd-analyzer', 'winevent', 'sigma', 'detection-query'],
    tags: ['defense-evasion', 'av-disable', 'auditpol', 'firewall', '1102', 'defender', 'tamper'],
  },
  {
    id: 'T1218',
    name: 'System Binary Proxy Execution',
    tactic: 'Defense Evasion',
    description: 'El adversario usa binarios firmados de Windows como proxy para ejecutar código malicioso (rundll32, mshta, regsvr32, msiexec, InstallUtil) — la firma válida evade whitelisting y la ejecución se disfraza como proceso legítimo.',
    detection: 'Sysmon 1/4688: mshta.exe con URL o .hta remoto en CommandLine; rundll32.exe con argumentos que no son DLLs del sistema o con URLs; regsvr32 con /i:http (squiblydoo); InstallUtil.exe invocando binarios en carpetas de usuario; msiexec /q con msi descargado. Cazar padres inusuales (Office, browsers, wscript) y ejecuciones de estos binarios desde %TEMP%.',
    platforms: ['Windows'],
    subtechniques: [
      { id: 'T1218.004', name: 'InstallUtil', description: 'Instalador .NET firmado que ejecuta código en el constructor.' },
      { id: 'T1218.005', name: 'Mshta', description: 'Ejecutar HTA/JavaScript directamente con mshta.exe.' },
      { id: 'T1218.007', name: 'Msiexec', description: 'Ejecutar msi malicioso o remoto con msiexec /q.' },
      { id: 'T1218.010', name: 'Regsvr32', description: 'Ejecutar scriptlets remotos (squiblydoo) con regsvr32 /i:http.' },
      { id: 'T1218.011', name: 'Rundll32', description: 'Ejecutar exports de DLL o código inline con rundll32.exe.' },
    ],
    relatedTools: ['cmd-analyzer', 'winevent', 'sigma'],
    tags: ['lolbin', 'rundll32', 'mshta', 'regsvr32', 'signed-binary', 'proxy-execution'],
  },
  {
    id: 'T1550',
    name: 'Use Alternate Authentication Material',
    tactic: 'Defense Evasion',
    description: 'El adversario autentica con material alternativo sin conocer la contraseña: hash NTLM (Pass the Hash), tickets Kerberos robados (Pass the Ticket), tokens OAuth o cookies de sesión. El encadenado clásico tras dumpear credenciales.',
    detection: 'PtH: 4624 LogonType 3 con LogonProcessName NtLmSsp desde hosts que no corresponden al dueño de la cuenta, y NTLM (4776) en dominios que ya son Kerberos-only. PtT: 4768/4769 consumidos en horas incongruentes o desde hosts distintos al del logon interactivo previo (correlacionar con 4624). Tokens cloud: sign-in logs con el mismo refresh token desde IPs/geos distintas. Patrón fuerte: 4776 repetidos con la misma cuenta desde múltiples hosts en minutos.',
    platforms: ['Windows', 'Linux', 'IaaS', 'SaaS'],
    subtechniques: [
      { id: 'T1550.001', name: 'Application Access Token', description: 'Usar tokens OAuth/cloud (JWT, refresh tokens) para acceso sin contraseña.' },
      { id: 'T1550.002', name: 'Pass the Hash', description: 'Autenticar NTLM con el hash NT robado.' },
      { id: 'T1550.003', name: 'Pass the Ticket', description: 'Replay de tickets Kerberos robados (TGT/TGS).' },
      { id: 'T1550.004', name: 'Web Session Cookie', description: 'Replay de cookies de sesión web para bypass de MFA.' },
    ],
    relatedTools: ['winevent', 'detection-query', 'sigma'],
    tags: ['pass-the-hash', 'pass-the-ticket', 'pth', 'ptt', 'kerberos', 'tokens'],
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
  {
    id: 'T1056',
    name: 'Input Capture',
    tactic: 'Credential Access',
    description: 'El adversario captura el input del usuario mientras se autentica: keyloggers, hooks de APIs, formularios falsos de login o captura de APIs de credenciales (CredUI). Frecuente en RATs y malware bancario.',
    detection: 'Sysmon 10 hacia winlogon.exe / LogonUI.exe por procesos que no son credential providers legítimos; procesos llamando SetWindowsHookEx o GetAsyncKeyState sin contexto de GUI (ETW/EDR). Cazar DLLs desconocidas cargadas en procesos de logon (Sysmon 7) y drivers de teclado nuevos (Sysmon 6). Los formularios falsos suelen ser procesos fullscreen heredando el escritorio del usuario (4688 con Image en %TEMP% y parent explorer.exe).',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [
      { id: 'T1056.001', name: 'Keylogging', description: 'Captura de pulsaciones de teclado (hooks de user32 o drivers).' },
      { id: 'T1056.002', name: 'GUI Input Capture', description: 'Ventana falsa de credenciales presentada al usuario.' },
      { id: 'T1056.003', name: 'Web Portal Capture', description: 'Inyectar un formulario de login en portales web reales.' },
      { id: 'T1056.004', name: 'Credential API Hooking', description: 'Hookear APIs de autenticación (LogonUser, CredUIPromptForCredentials).' },
    ],
    relatedTools: ['winevent', 'detection-query'],
    tags: ['keylogger', 'input-capture', 'hooking', 'credentials', 'credui'],
  },
  {
    id: 'T1539',
    name: 'Steal Web Session Cookie',
    tactic: 'Credential Access',
    description: 'El adversario roba cookies de sesión de los browsers para secuestrar sesiones web autenticadas — incluye portales SaaS corporativos y evita MFA porque la sesión ya está establecida.',
    detection: 'Sysmon 1/11 y EDR file access sobre %LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Cookies, \\Network\\Cookies, Login Data y equivalentes de Edge/Firefox, por procesos que no son el browser. Herramientas conocidas: SharpChrome, mimikatz dpapi::chrome, laZagne. Cazar dumps de memoria de procesos de browser (comsvcs.dll MiniDump) y lecturas de DPAPI master keys en %APPDATA%\\Microsoft\\Protect. En proxies: la misma cookie de sesión presentada desde dos IPs/geos distintas.',
    platforms: ['Windows', 'Linux', 'macOS', 'SaaS'],
    subtechniques: [],
    relatedTools: ['winevent', 'ioc', 'log-parser'],
    tags: ['cookies', 'session-hijack', 'mfa-bypass', 'chrome', 'edge', 'firefox'],
  },
  {
    id: 'T1528',
    name: 'Steal Application Access Token',
    tactic: 'Credential Access',
    description: 'El adversario roba tokens de acceso (OAuth, API keys, PATs de GitHub, access keys de AWS) para operar contra cloud y SaaS sin contraseñas ni MFA.',
    detection: 'Entra ID sign-in logs: el mismo token usado desde IPs/user agents distintos, refresh token replay o "invalid grant". AWS CloudTrail: GetSessionToken/AssumeRole desde cuentas y regiones fuera de baseline, uso de access keys nunca vistas (GuardDuty CredentialAnomaly). GitHub: audit log con PAT usado por otro usuario u OAuth app nueva con scopes repo/admin. En endpoints: procesos leyendo ~/.aws/credentials, variables ARM_*/AZURE_* y ~/.azure/accessTokens.json (Sysmon 1/11).',
    platforms: ['Windows', 'Linux', 'macOS', 'IaaS', 'SaaS'],
    subtechniques: [],
    relatedTools: ['log-parser', 'ioc', 'detection-query'],
    tags: ['oauth', 'tokens', 'api-keys', 'pat', 'cloud', 'github'],
  },
  {
    id: 'T1557',
    name: 'Adversary-in-the-Middle',
    tactic: 'Credential Access',
    description: 'El adversario se interpone en el tráfico de la red interna — envenenamiento LLMNR/NBT-NS, ARP poisoning o DHCP spoofing — para capturar challenges Net-NTLM o relayearlos hacia otros sistemas (NTLM relay).',
    detection: 'Responder/Inveigh: respuestas LLMNR/NBT-NS desde IPs no autorizadas (logs de Zeek/sensores; 4624 NTLM con WorkstationName sospechoso). Relay: 4624 NTLM LogonType 3 contra hosts que nunca autenticaban por NTLM y 5145 con cuentas de máquina hacia shares inesperados. Mitigación auditable: GPO que deshabilita LLMNR (HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows NT\\DNSClient\\EnableMulticast=0) y SMB signing obligatorio. En switches: Dynamic ARP Inspection y alertas de conflicto IP/MAC.',
    platforms: ['Windows', 'Linux', 'Network'],
    subtechniques: [
      { id: 'T1557.001', name: 'LLMNR/NBT-NS Poisoning and SMB Relay', description: 'Responder consultas multicast para capturar/relayear NTLM (Responder, Inveigh).' },
      { id: 'T1557.002', name: 'ARP Cache Poisoning', description: 'Falsificar mappings IP-MAC para interceptar tráfico de capa 2.' },
    ],
    relatedTools: ['winevent', 'log-parser', 'detection-query'],
    tags: ['llmnr', 'nbt-ns', 'responder', 'arp', 'ntlm-relay', 'mitm'],
  },
  {
    id: 'T1187',
    name: 'Forced Authentication',
    tactic: 'Credential Access',
    description: 'El adversario fuerza a un equipo a autenticarse contra un host que controla (PetitPotam, PrinterBug, DFSCoerce sobre MS-EFSRPC/MS-RPRN) para capturar un challenge Net-NTLM y craquearlo o relayearlo.',
    detection: 'Correlacionar: SMB saliente (445) desde workstations hacia otros hosts de usuario inmediatamente después de abrir documentos/emails (Sysmon 3 + 11). Event IDs 4624 NTLM con cuentas de MÁQUINA ($) hacia destinos inusuales, 5140/5145 accesos a shares desde cuentas de máquina. Cazar llamadas MS-EFSRPC (lsass.exe enviando RPC EFSR) y spoolss desde hosts que no son print servers. Honey accounts/shares: cualquier autenticación contra ellos = coerción activa.',
    platforms: ['Windows', 'Linux'],
    subtechniques: [],
    relatedTools: ['winevent', 'log-parser', 'detection-query'],
    tags: ['petitpotam', 'printerbug', 'dfscoerce', 'coercion', 'ntlm'],
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
  {
    id: 'T1069',
    name: 'Permission Groups Discovery',
    tactic: 'Discovery',
    description: 'El adversario enumera grupos y sus membresías para mapear privilegios y rutas de escalada. BloodHound/SharpHound son las herramientas de referencia y generan patrones de enumeración muy reconocibles.',
    detection: 'Event ID 4799 (security-enabled group member enumerated) en volumen: más de ~30 grupos enumerados por host en 5 minutos es firma casi inequívoca de SharpHound (requiere el auditing de enumeración de grupos activado — no viene por defecto). Cazar LDAP queries masivas con filtros (member=*) o (objectClass=group): habilitar el evento 1644 de Directory Service en los DCs para registrar queries LDAP lentas/frecuentes. net group /domain y Get-ADGroupMember repetidos (4688/4104). Correlacionar picos de SAMR con 4662 sobre objetos group desde workstations.',
    platforms: ['Windows', 'Linux', 'macOS', 'IaaS', 'SaaS'],
    subtechniques: [
      { id: 'T1069.001', name: 'Local Groups', description: 'Enumeración de grupos locales (net localgroup).' },
      { id: 'T1069.002', name: 'Domain Groups', description: 'Enumeración de grupos de dominio vía LDAP/SAMR.' },
      { id: 'T1069.003', name: 'Cloud Groups', description: 'Enumeración de grupos cloud (Entra ID, AWS IAM).' },
    ],
    relatedTools: ['winevent', 'detection-query', 'log-parser'],
    tags: ['groups', 'bloodhound', 'sharphound', '4799', 'ldap', 'discovery'],
  },
  {
    id: 'T1482',
    name: 'Domain Trust Discovery',
    tactic: 'Discovery',
    description: 'El adversario mapea las confianzas (trusts) entre dominios y bosques para planificar movimiento lateral cross-domain — enumeración típica justo antes de ataques que cruzan el perímetro del forest.',
    detection: '4688/Sysmon 1 con `nltest /domain_trusts` (o /all_trusts) y `netdom query trust` ejecutados desde workstations (legítimo solo en DCs y scripts de migración). LDAP queries con filtro (objectClass=trustedDomain) desde hosts que no son DCs (evento 1644 con auditing LDAP). BloodHound también recolecta trusts en su grafo. Baseline: los trusts casi nunca cambian — cualquier discovery activo fuera de un proyecto de migración = escalar.',
    platforms: ['Windows', 'Linux'],
    subtechniques: [],
    relatedTools: ['cmd-analyzer', 'winevent', 'detection-query'],
    tags: ['trusts', 'nltest', 'netdom', 'forest', 'discovery'],
  },
  {
    id: 'T1016',
    name: 'System Network Configuration Discovery',
    tactic: 'Discovery',
    description: 'El adversario recopila la configuración de red del host y del dominio: IPs, rutas, DNS, proxies y DCs. Pieza estándar del staging inicial de casi todo malware.',
    detection: '4688/Sysmon 1 con ipconfig /all, route print, netsh interface ip show, arp -a, Get-DnsClientNrptRule, nltest /dsgetdc. Correlación de utilidades: 3+ comandos de red distintos del mismo proceso/padre en menos de 5 min = scripted discovery (RATs, post-exploitation). Cazar acceso al registro de configuración DNS (Sysmon 12/13 sobre Tcpip\\Parameters). Alto volumen = preparación de listas para escaneo o relay.',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [],
    relatedTools: ['cmd-analyzer', 'winevent'],
    tags: ['ipconfig', 'route', 'dns', 'network-config', 'discovery'],
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
  {
    id: 'T1563',
    name: 'Remote Service Session Hijacking',
    tactic: 'Lateral Movement',
    description: 'El adversario secuestra una sesión remota ya establecida en lugar de autenticar él mismo — RDP hijacking vía tscon.exe para heredar la sesión de otro usuario sin conocer su contraseña.',
    detection: '4688 con tscon.exe y argumentos /dest:console (o destino RDP-Tcp#) ejecutado por cuentas que no son el dueño de la sesión. Event IDs 4778/4779: reconexión de sesión RDP desde una Client Address distinta a la de la desconexión previa — correlacionar IP origen antes/después. quser/query user en bulk desde procesos inusuales. En Linux: uso del SSH agent ajeno (variables SSH_AUTH_SOCK apuntando a sockets de otros usuarios).',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [
      { id: 'T1563.001', name: 'SSH', description: 'Hijacking de agentes/sesiones SSH de otros usuarios.' },
      { id: 'T1563.002', name: 'Remote Desktop Protocol Hijacking', description: 'tscon.exe para heredar sesiones RDP activas de otros usuarios.' },
    ],
    relatedTools: ['cmd-analyzer', 'winevent', 'sigma'],
    tags: ['rdp-hijack', 'tscon', '4778', '4779', 'session-hijack'],
  },
  {
    id: 'T1570',
    name: 'Lateral Tool Transfer',
    tactic: 'Lateral Movement',
    description: 'El adversario copia herramientas entre hosts comprometidos vía shares administrativos (ADMIN$, C$), RDP con drives mapeados o WinRM — evita descargar desde internet en cada host.',
    detection: 'Sysmon 3 hacia 445/5985 seguido de Sysmon 11 con creación de PE en el destino; 5145 con WriteData sobre ADMIN$\\System32 o C$\\Windows\\Temp. Cazar psexec/paexec/RemCom copiando binaries de servicio (PSEXESVC.exe). EDR: un binario sin firma apareciendo en varios hosts simultáneamente (spread horizontal). Comparar hashes entre hosts: un binario nuevo replicado en N hosts en minutos = tool transfer.',
    platforms: ['Windows', 'Linux', 'macOS'],
    subtechniques: [],
    relatedTools: ['winevent', 'log-parser', 'detection-query'],
    tags: ['tool-transfer', 'admin-share', 'psexec', 'smb', 'lateral'],
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
  {
    id: 'T1573',
    name: 'Encrypted Channel',
    tactic: 'Command and Control',
    description: 'El adversario cifra el canal de C2 (TLS o cifrado propio simétrico/asimétrico) para que IDS, proxies y DLP no puedan inspeccionar el tráfico ni firmarlo.',
    detection: 'TLS hacia dominios recién registrados o sin categoría en los proxy logs; JA3/JA4 fingerprints de tooling conocido (perfiles Malleable de Cobalt Strike, Metasploit, Sliver). Procesos sin componente de red legítimo haciendo HTTPS (rundll32, regsvr32, notepad.exe). TLS con SNI ausente o inconsistente con el certificado presentado. Beaconing con jitter regular y volúmenes simétricos (upload similar a download en check-ins cortos).',
    platforms: ['Windows', 'Linux', 'macOS', 'Network'],
    subtechniques: [
      { id: 'T1573.001', name: 'Symmetric Cryptography', description: 'Cifrado simétrico (AES) del canal C2.' },
      { id: 'T1573.002', name: 'Asymmetric Cryptography', description: 'Cifrado asimétrico (RSA/ECDH) para el intercambio de claves.' },
    ],
    relatedTools: ['log-parser', 'ioc', 'detection-query'],
    tags: ['tls', 'encryption', 'ja3', 'ja4', 'c2', 'cobalt-strike'],
  },
  {
    id: 'T1090',
    name: 'Proxy',
    tactic: 'Command and Control',
    description: 'El adversario enruta tráfico a través de proxies internos/externos, cadenas multi-hop o domain fronting para ocultar el origen real del C2 y de la exfiltración.',
    detection: 'Conexiones salientes a puertos proxy conocidos (1080 SOCKS, 9050 TOR, 8888) y a servicios de proxy comerciales desde procesos de usuario. Domain fronting: SNI de CDN distinto del header Host HTTP (visible con SSL inspection en el proxy). Cazar herramientas de túnel en hosts (chisel, ligolo, plink, gost) vía 4688/Sysmon 1 y su patrón de muchas conexiones salientes a un solo IP:puerto. Egress hacia TOR exit nodes contra un feed de reputación.',
    platforms: ['Windows', 'Linux', 'macOS', 'Network'],
    subtechniques: [
      { id: 'T1090.001', name: 'Internal Proxy', description: 'Proxy dentro del perímetro que agrega saltos.' },
      { id: 'T1090.002', name: 'External Proxy', description: 'Servidores proxy externos (comerciales o propios).' },
      { id: 'T1090.003', name: 'Multi-Hop Proxy', description: 'Cadenas de proxies para dificultar el traceback.' },
      { id: 'T1090.004', name: 'Domain Fronting', description: 'Usar CDNs legítimas para ocultar el destino real.' },
    ],
    relatedTools: ['log-parser', 'ioc'],
    tags: ['proxy', 'tor', 'socks', 'domain-fronting', 'chisel', 'traffic-routing'],
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
  {
    id: 'T1048',
    name: 'Exfiltration Over Alternative Protocol',
    tactic: 'Exfiltration',
    description: 'El adversario exfiltra por protocolos que no se usan para C2 — DNS, ICMP, SMTP, FTP — para evadir los DLP/proxies que solo inspeccionan HTTP/S.',
    detection: 'DNS: volumen anómalo de queries TXT/NULL por host o labels de más de 50 caracteres (Sysmon 22 o logs del resolver). ICMP: paquetes grandes o frecuencia alta hacia un único destino. SMTP: envíos por 25/587 desde procesos que no son clientes de correo. FTP/SSH: sesiones salientes largas a servidores fuera del baseline. Regla general de hunting: bytes salientes por protocolo vs baseline por host — cualquier canal que crece de golpe fuera de horario = candidato a exfiltración.',
    platforms: ['Windows', 'Linux', 'macOS', 'Network'],
    subtechniques: [
      { id: 'T1048.001', name: 'Exfiltration Over Symmetric Encrypted Non-C2 Protocol', description: 'Exfiltrar cifrado simétricamente por protocolos legítimos.' },
      { id: 'T1048.002', name: 'Exfiltration Over Asymmetric Encrypted Non-C2 Protocol', description: 'Exfiltrar con cifrado asimétrico por canales legítimos.' },
      { id: 'T1048.003', name: 'Exfiltration Over Unencrypted Non-C2 Protocol', description: 'Exfiltrar en claro por protocolos no inspeccionados (DNS, ICMP, FTP).' },
    ],
    relatedTools: ['log-parser', 'ioc', 'detection-query'],
    tags: ['exfil', 'dns', 'icmp', 'smtp', 'ftp', 'alternative-protocol'],
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
  {
    id: 'T1489',
    name: 'Service Stop',
    tactic: 'Impact',
    description: 'El adversario detiene servicios y procesos — AV, backup, VSS, bases de datos — para preparar ransomware o destructión, o para deshabilitar funciones del negocio.',
    detection: 'System log 7036/7040 con servicios de backup/AV pasando a stopped o disabled; 4688 con `net stop`, `sc stop` o taskkill (/f /im) contra procesos de seguridad y backup (Veeam, VSS). Secuencia clásica de ransomware: parada de servicios de backup + vssadmin delete shadows en minutos. Cazar shutdowns de servicios de negocio fuera de ventanas de mantenimiento — el encriptado o el sabotaje suele empezar ahí.',
    platforms: ['Windows', 'Linux'],
    subtechniques: [],
    relatedTools: ['cmd-analyzer', 'winevent', 'log-parser'],
    tags: ['service-stop', '7036', '7040', 'ransomware-prep', 'backup-kill'],
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
