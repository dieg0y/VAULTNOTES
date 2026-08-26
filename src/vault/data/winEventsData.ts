/**
 * winEventsData.ts — Dataset expandido de Windows Event IDs para la herramienta "Windows Event IDs" de VaultNotes.
 *
 * Contiene ~59 event IDs (los 21 originales del ToolsView.tsx + 38 nuevos prioritarios para threat hunting),
 * ordenados por ID ascendente. Cada entrada incluye descripción a fondo, comandos de detección (PowerShell
 * + Event Viewer + Linux/syslog cuando aplica), regla Sigma YAML, IDs relacionados y análisis de threat hunting.
 *
 * BLOQUE 3 (MITRE/Sigma/KQL/SPL): La interfaz se extendió con campos opcionales para integrar cada evento
 * con MITRE ATT&CK, Sigma Explorer y Detection Query Helper. Los campos nuevos son opcionales para no romper
 * las entradas existentes; se enriquecen las más relevantes (4624, 4625, 4688, 4720, 7045, etc.).
 *
 * Exporta:
 *  - La interfaz `WinEventInfo`
 *  - El tipo `WinEventCategory` (8 categorías para filtros)
 *  - El array `WIN_EVENTS`
 *  - El helper `getWinEventCategory(id)` (deriva la categoría del Event ID)
 * NO usa `export default`.
 * Escrito en español, orientado a analistas SOC.
 */

export type WinEventCategory =
  | 'Authentication'
  | 'Process'
  | 'Persistence'
  | 'Privilege'
  | 'PowerShell'
  | 'Account'
  | 'Network'
  | 'Defense Evasion';

export const WIN_EVENT_CATEGORIES: WinEventCategory[] = [
  'Authentication',
  'Process',
  'Persistence',
  'Privilege',
  'PowerShell',
  'Account',
  'Network',
  'Defense Evasion',
];

export interface WinEventInfo {
  id: number;
  name: string;
  log: string;
  short: string;
  description: string;
  detection: { label: string; cmd: string }[];
  sigma?: string;
  related: string[];
  analysis: string;
  /* ─── Campos nuevos (BLOQUE 3 — opcionales, no rompen entradas existentes) ─── */
  /** MITRE ATT&CK technique IDs referenced — ej: ['T1078', 'T1078.002']. */
  mitre?: string[];
  /** Cross-link a regla Sigma del dataset sigmaData.ts (por id del preset). */
  sigmaId?: string;
  /** Query KQL (Microsoft Sentinel / Kusto) para threat hunting de este evento. */
  kql?: string;
  /** Query SPL (Splunk) para threat hunting de este evento. */
  spl?: string;
  /** Notas adicionales de threat hunting — cómo cazar en SIEM. */
  threatHuntingNotes?: string;
  /** Campos relevantes del evento que deberías extraer al SIEM (xlates). */
  relevantFields?: string[];
  /** Consejos de detección — cómo tunear la regla, falsos positivos comunes. */
  detectionTips?: string;
  /** IDs numéricos de eventos relacionados (para cross-link al dataset). */
  relatedEventIds?: number[];
}

/**
 * Deriva la categoría de un Event ID (8 categorías SOC comunes).
 * Los IDs no listados caen en 'Authentication' como fallback genérico.
 */
export function getWinEventCategory(id: number): WinEventCategory {
  // PowerShell
  if (id === 4104 || id === 4103 || id === 400 || id === 401 || id === 600 || id === 800) return 'PowerShell';
  // Process
  if (id === 4688 || id === 4689 || id === 1 || id === 2 || id === 3 || id === 5) return 'Process';
  // Persistence
  if (id === 4697 || id === 7045 || id === 4698 || id === 4702 || id === 4699 || id === 4700 || id === 4701) return 'Persistence';
  // Privilege
  if (id === 4672 || id === 4673 || id === 4674) return 'Privilege';
  // Account (incluye auth events centrados en cuenta)
  if (id === 4720 || id === 4722 || id === 4724 || id === 4726 || id === 4728 || id === 4732 || id === 4738 || id === 4740 || id === 4768 || id === 4769 || id === 4776) return 'Account';
  // Network
  if (id === 5140 || id === 5145 || id === 5156 || id === 5157 || id === 5152 || id === 5154 || id === 5155 || id === 22) return 'Network';
  // Defense Evasion
  if (id === 1102 || id === 104 || id === 4657 || id === 4660 || id === 4663 || id === 4662) return 'Defense Evasion';
  // Authentication (default — 4624, 4625, 4634, 4648, 4771, etc.)
  return 'Authentication';
}

export const WIN_EVENTS: WinEventInfo[] = [
  {
    id: 4103, name: 'PowerShell module logging', log: 'Microsoft-Windows-PowerShell/Operational',
    short: 'Registro de actividad de módulos de PowerShell (module logging).',
    description: 'Se genera cuando un módulo de PowerShell registra su actividad de pipeline (Module Logging habilitado vía GPO "Turn on Module Logging"). Incluye las líneas CommandInvocation con el cmdlet ejecutado, sus ParameterBinding (parámetros ya expandidos a sus valores finales) y el stream de salida. A diferencia del 4104, captura la invocación de cmdlets de los módulos auditados — ideal para reconstruir QUÉ comandos se ejecutaron y con qué argumentos.',
    detection: [
      { label: 'PowerShell — eventos 4103 recientes', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-PowerShell/Operational'; Id=4103} -MaxEvents 50" },
      { label: 'Filtrar invocaciones peligrosas', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-PowerShell/Operational'; Id=4103} | Where-Object {$_.Message -match 'IEX|FromBase64String|DownloadString|AmsiUtils'}" },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Applications and Services Logs → Microsoft → Windows → PowerShell → Operational → Filter → Event ID 4103' },
    ],
    sigma: `title: Suspicious PowerShell Module Activity
id: 3c0d41db-4b6e-4a0e-9f5a-10c2c1d5f8b1
status: experimental
logsource:
  product: windows
  service: powershell
detection:
  selection:
    EventID: 4103
    Message|contains:
      - 'IEX'
      - 'FromBase64String'
      - 'DownloadString'
  condition: selection
level: high`,
    related: ['4104 (Script block logging)', '4688 (Proceso creado)', '400 (Engine lifecycle — clásico)'],
    analysis: 'Module Logging registra las invocaciones de cmdlets de los módulos listados en la GPO (por defecto ninguno — añade Microsoft.PowerShell.* y los críticos de terceros). Los CommandInvocation muestran los argumentos ya expandidos: ves exactamente qué URL descargó un atacante o qué ruta escribió. Combínalo con 4104 — el module logging a veces captura actividad de módulos nativos que el script block logging omite, y viceversa.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1059', 'T1059.001'],
    kql: 'Event\n| where EventLog == "Microsoft-Windows-PowerShell/Operational" and EventID == 4103\n| project TimeGenerated, Computer, RenderedDescription\n| where RenderedDescription has_any ("IEX", "FromBase64String", "DownloadString", "AmsiUtils")',
    spl: 'index=windows source="Microsoft-Windows-PowerShell/Operational" EventCode=4103 (Message="*IEX*" OR Message="*FromBase64String*" OR Message="*DownloadString*" OR Message="*AmsiUtils*") | table _time, host, Message',
    threatHuntingNotes: 'Hunt 1: CommandInvocation con IEX/Invoke-Expression. Hunt 2: parámetros expandidos con URLs o rutas en %TEMP% — el valor final del parámetro revela el payload real. Hunt 3: cmdlets de descarga (DownloadString, Invoke-WebRequest) invocados desde módulos. Hunt 4: correlaciona con 4688 — procesos powershell.exe con -enc que luego generan 4103 sospechoso.',
    relevantFields: ['EventID', 'ContextInfo', 'CommandInvocation', 'ParameterBinding', 'ScriptBlockId', 'UserId'],
    detectionTips: 'Requiere habilitar Module Logging (GPO: Administrative Templates → Windows Components → Windows PowerShell → Turn on Module Logging) y listar los módulos a auditar — sin módulos listados NO se genera ningún 4103. Volumen alto en servidores con scripts legítimos: filtra por cmdlets peligrosos en el SIEM, no alertes de cada evento.',
    relatedEventIds: [4104, 4688, 400, 600],
  },
  {
    id: 4104, name: 'PowerShell script block logging', log: 'Microsoft-Windows-PowerShell/Operational',
    short: 'Registro de bloques de script de PowerShell (script block logging).',
    description: 'Se genera cuando PowerShell ejecuta un bloque de script (Script Block Logging habilitado vía GPO "Turn on PowerShell Script Block Logging"). Registra el texto del script DESOFUSCADO tal como se ejecuta — es EL evento canónico para detectar contenido malicioso en PowerShell: encoded commands, downloads, AMSI bypasses y tooling de ataque quedan registrados en claro, incluso cuando el 4688 solo muestra un comando -enc ilegible. Los bloques que AMSI marca como sospechosos se loguean igualmente con nivel warning.',
    detection: [
      { label: 'PowerShell — script blocks recientes', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-PowerShell/Operational'; Id=4104} -MaxEvents 50" },
      { label: 'Filtrar patrones maliciosos', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-PowerShell/Operational'; Id=4104} | Where-Object {$_.Message -match 'IEX|Invoke-Mimikatz|DownloadString|FromBase64String|AmsiUtils|amsiInitFailed'}" },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Applications and Services Logs → Microsoft → Windows → PowerShell → Operational → Filter → Event ID 4104' },
    ],
    sigma: `title: Suspicious PowerShell Script Block Content
id: 3c0d41db-4b6e-4a0e-9f5a-10c2c1d5f8b2
status: experimental
logsource:
  product: windows
  service: powershell
detection:
  selection:
    EventID: 4104
    Message|contains:
      - 'IEX'
      - 'FromBase64String'
      - 'DownloadString'
      - 'AmsiUtils'
  condition: selection
level: high`,
    related: ['4103 (Module logging)', '4688 (Proceso creado)', '400 (Engine lifecycle — clásico)'],
    analysis: 'El 4104 es la fuente más rica de inteligencia sobre ejecución de PowerShell: el ScriptBlockText muestra el código ya desofuscado (strings concatenadas, Base64 decodificada, format-strings resueltas). Si un 4688 muestra powershell -enc <base64>, el 4104 inmediatamente posterior contiene el payload en claro. Atacantes avanzados intentan deshabilitarlo (o hacer bypass de AMSI antes) — el 4104 con contenido de bypass de AMSI es señal de compromiso activo.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1059', 'T1059.001', 'T1562.001'],
    kql: 'Event\n| where EventLog == "Microsoft-Windows-PowerShell/Operational" and EventID == 4104\n| project TimeGenerated, Computer, RenderedDescription\n| where RenderedDescription has_any ("IEX", "FromBase64String", "DownloadString", "AmsiUtils", "amsiInitFailed", "AmsiScanBuffer", "Invoke-Mimikatz")',
    spl: 'index=windows source="Microsoft-Windows-PowerShell/Operational" EventCode=4104 (Message="*IEX*" OR Message="*FromBase64String*" OR Message="*AmsiUtils*" OR Message="*amsiInitFailed*" OR Message="*AmsiScanBuffer*" OR Message="*Invoke-Mimikatz*") | table _time, host, Message',
    threatHuntingNotes: 'Hunt 1: ScriptBlockText con IEX/Invoke-Expression + FromBase64String. Hunt 2: descargas (DownloadString, Net.WebClient, Invoke-WebRequest) con URLs externas. Hunt 3: AMSI bypass (AmsiUtils, amsiInitFailed, AmsiScanBuffer) = defense evasion activa. Hunt 4: tooling conocida (Invoke-Mimikatz, Invoke-Kerberoast, PowerView). Hunt 5: correlación con 4688 — powershell.exe -enc seguido de un 4104 revela el payload real del encoded command.',
    relevantFields: ['EventID', 'ScriptBlockText', 'ScriptBlockId', 'Path', 'MessageNumber', 'MessageTotal', 'UserId'],
    detectionTips: 'Se habilita vía GPO (Turn on PowerShell Script Block Logging) o registry: Set-ItemProperty HKLM:\\Software\\Policies\\Microsoft\\Windows\\PowerShell\\ScriptBlockLogging -Name EnableScriptBlockLogging -Value 1. Los bloques largos se parten en varios eventos (MessageNumber/MessageTotal) — reconstrúyelos por ScriptBlockId antes de matchear patrones o perderás matches en los cortes.',
    relatedEventIds: [4103, 4688, 400, 600],
  },
  {
    id: 4624, name: 'Logon exitoso', log: 'Security',
    short: 'Un usuario inició sesión correctamente.',
    description: 'Se genera cuando una cuenta inicia sesión en Windows. Incluye el tipo de logon (Interactive, Network, RemoteInteractive, Service, Batch, etc.), el SID de la cuenta, el origen (Workstation name/IP) y el LogonID que correlationa con otros eventos.',
    detection: [
      { label: 'PowerShell — últimos 50 logons', cmd: 'Get-WinEvent -LogName Security -MaxEvents 50 | Where-Object Id -eq 4624' },
      { label: 'Filtrar solo RDP (tipo 10)', cmd: "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4624} | Where-Object { $_.Message -match 'Logon Type:\\s+10' }" },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4624' },
      { label: 'Linux (si logs en syslog)', cmd: 'grep "EventID 4624" /var/log/syslog' },
    ],
    sigma: `title: Successful User Logon
id: 9c0d41db-4b6e-4a0e-9f5a-10c2c1d5f8a3
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4624
  condition: selection
level: informational`,
    related: ['4634 (Logoff)', '4625 (Logon fallido)', '4672 (Privilegios especiales)', '4648 (Creds explícitas)'],
    analysis: 'Busca Logon Type 10 (RDP) desde IPs inusuales o fuera de horario. Logon Type 3 (network) desde IPs internas inesperadas indica lateral movement. Logon Type 2 (interactive) fuera de horario laboral es sospechoso. Correlaciona el TargetUserName con el 4625 inmediatamente anterior — si ve muchos 4625 seguidos de un 4624 exitoso, hay fuerza bruta exitosa.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1078', 'T1078.001', 'T1078.002', 'T1078.003'],
    sigmaId: 'sigma-success-after-fail-logon',
    kql: 'SecurityEvent\n| where EventID == 4624\n| project TimeGenerated, Computer, Account, IpAddress, LogonType, WorkstationName\n| where LogonType in (2, 3, 10, 7, 11)',
    spl: 'index=windows EventCode=4624 (LogonType=2 OR LogonType=3 OR LogonType=10 OR LogonType=7 OR LogonType=11) | table _time, host, user, src_ip, LogonType, workstation',
    threatHuntingNotes: 'Hunt 1: logons Type 10 (RDP) fuera de horario laboral. Hunt 2: logons Type 3 (network) desde workstations (no DCs/servers) — pivote de lateral. Hunt 3: logon exitoso después de 5+ 4625 en 10 min — brute force exitoso. Hunt 4: LogonType 7 (unlock) seguido de activity inusual.',
    relevantFields: ['EventID', 'TargetUserName', 'SubjectUserName', 'LogonType', 'IpAddress', 'WorkstationName', 'AuthenticationPackageName', 'LogonProcessName', 'ProcessId', 'LogonGuid'],
    detectionTips: 'Whitelista logons Type 5 (system) y Type 4 (batch) — son ruido. Foco en Type 2/10/11 (interactive/RDP/cached-interactive). Filtra cuentas de servicio si tienes inventario. SIEM: parseo robusto del XML del mensaje — LogonType aparece como entero (no como string "Interactive").',
    relatedEventIds: [4634, 4625, 4672, 4648, 4776, 4768],
  },
  {
    id: 4625, name: 'Logon fallido', log: 'Security',
    short: 'Intento de inicio de sesión fallido.',
    description: 'Se genera cuando un intento de logon falla. Incluye razón (bad password, account expired, disabled, locked out), tipo de logon, y origen (Caller Workstation / Source Network Address). Es la señal más usada para detectar fuerza bruta.',
    detection: [
      { label: 'PowerShell — contar logins fallidos por IP', cmd: "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625} | Group-Object {$_.Properties[19].Value} | Sort-Object Count -Descending | Select-Object -First 10" },
      { label: 'Ver intentos recientes', cmd: 'Get-WinEvent -LogName Security -MaxEvents 100 | Where-Object Id -eq 4625' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4625' },
      { label: 'Detectar fuerza bruta', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4625; StartTime=(Get-Date).AddHours(-1)} | Measure-Object | Select-Object Count' },
    ],
    sigma: `title: Multiple Failed Logons - Brute Force
id: 1e9c0d41-db4b-6e4a-0e9f-5a10c2c1d5f8
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4625
  timeframe: 5m
  condition: selection | count() by IpAddress > 10
fields:
  - IpAddress
  - TargetUserName
level: high`,
    related: ['4624 (Logon exitoso)', '4740 (Cuenta bloqueada)', '4771 (Kerberos pre-auth fallida)', '4776 (NTLM auth fallida)'],
    analysis: 'Más de 10-20 intentos desde una misma IP en 5 minutos = fuerza bruta. Cuenta inexistente en el TargetUserName enumera usuarios válidos. Logon Type 3 fallido masivo desde una IP interna = lateral movement. Si ve un 4624 exitoso después de muchos 4625 de la misma IP → fuerza bruta exitosa, IR inmediato.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1110.001', 'T1110.003', 'T1110.004'],
    sigmaId: 'sigma-failed-logon-4625',
    kql: 'SecurityEvent\n| where EventID == 4625\n| summarize FailedCount = count() by Account, IpAddress, bin(TimeGenerated, 5m)\n| where FailedCount > 5\n| sort by FailedCount desc',
    spl: 'index=windows EventCode=4625 | stats count as failed by user, src_ip, date_minute | where failed > 5 | sort - failed',
    threatHuntingNotes: 'Hunt 1: >5 fallos/5min desde una IP = brute force. Hunt 2: cuenta inexistente (Status 0xC0000064) = user enumeration. Hunt 3: 4625 masivo desde una IP seguido de 4624 exitoso = brute force exitoso (IR inmediato). Hunt 4: password spraying — muchas cuentas distintas fallidas desde una misma IP en corto tiempo.',
    relevantFields: ['EventID', 'TargetUserName', 'SubjectUserName', 'LogonType', 'IpAddress', 'FailureReason', 'SubStatus', 'AuthenticationPackageName', 'WorkstationName'],
    detectionTips: 'FailureReason y SubStatus son clave: 0xC0000064 (no such user), 0xC000006A (bad password), 0xC0000234 (locked), 0xC0000072 (disabled). Diferencian brute force de password spraying. SIEM: sube threshold a 20 si mucho ruido, baja a 3 para cuentas de admin.',
    relatedEventIds: [4624, 4740, 4771, 4776, 4768],
  },
  {
    id: 4634, name: 'Logoff', log: 'Security',
    short: 'Un usuario cerró sesión.',
    description: 'Se genera cuando una sesión de usuario termina normalmente (logoff). Correlationa con LogonID del 4624 correspondiente para cerrar la sesión. Útil para reconstruir el timeline de actividad de un usuario.',
    detection: [
      { label: 'PowerShell', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4634} -MaxEvents 50' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4634' },
    ],
    related: ['4624 (Logon exitoso)', '4801 (Workstation unlocked)'],
    analysis: 'Por sí solo no es malicioso. Útil para construir timelines de actividad del usuario y detectar sesiones en horarios inusuales o desde ubicaciones sospechosas (cuando se correlationa con el 4624).',
  },
  {
    id: 4648, name: 'Logon con credenciales explícitas', log: 'Security',
    short: 'Un proceso inició sesión con credenciales explícitas (runas).',
    description: 'Se genera cuando un proceso usa credenciales explícitas (no cacheadas) para iniciar sesión. Típico de "runas /user:admin", pero también de servicios que hacen logons con credenciales explícitas. Cuidado: Many legit processes (Task Scheduler, WinRM) lo generan.',
    detection: [
      { label: 'PowerShell', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4648} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Ver solo runas manual', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4648} | Where-Object {$_.Message -notmatch "TaskScheduler|WinRM|svchost"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4648' },
    ],
    related: ['4624 (Logon exitoso)', '4672 (Privilegios especiales)'],
    analysis: 'Atacantes usan runas para escalar privilegios o moverse lateralmente con credenciales robadas. Pero muchos procesos legítimos generan 4648 (Task Scheduler al ejecutar tareas como otro usuario, WinRM). Si el SubjectUserName es SYSTEM y el TargetUserName es un admin, sospechoso. Filtra los procesos conocidos y mira outliers.',
  },
  {
    id: 4656, name: 'Handle solicitado a objeto', log: 'Security',
    short: 'Un proceso pidió un handle a un objeto (archivo/registry/key).',
    description: 'Se genera cuando un proceso pide un handle a un objeto (archivo, carpeta, registry key, kernel object, servicio, etc.). Incluye ObjectServer (p.ej. SC Manager, SAM), ObjectType (File/Key/Process), ObjectName y AccessMask (bitmask de permisos solicitados). Requiere habilitar "File System/Object Access Auditing" y configurar SACL en el objeto.',
    detection: [
      { label: 'PowerShell — últimos eventos', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4656} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Filtrar accesos a LSASS', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4656} | Where-Object {$_.Message -match "lsass.exe|LSASS"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4656' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 4656" /var/log/syslog' },
    ],
    sigma: `title: Suspicious Access to LSASS via Object Handle
id: 7a1c4e2d-8f3b-4c1a-9d2e-b5f6a7b8c9d0
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4656
    ObjectName|endswith: lsass.exe
  condition: selection
fields:
  - SubjectUserName
  - ProcessName
level: high`,
    related: ['4663 (Acceso a objeto)', '4658 (Handle cerrado)', '4660 (Objeto eliminado)', '4670 (Permisos cambiados)'],
    analysis: 'Muy ruidoso en sistemas con auditing de objetos habilitado. Útil cuando se ha identificado un archivo sospechoso y se busca qué proceso pidió handle. Accesos a lsass.exe por procesos no-Microsoft = credential dumping (mimikatz, procdump, taskmgr). El AccessMask 0x1010 (execute + synchronize) sobre LSASS es la huella clásica de mimikatz.',
  },
  {
    id: 4658, name: 'Handle a objeto cerrado', log: 'Security',
    short: 'Un proceso cerró un handle previamente abierto.',
    description: 'Se genera cuando un proceso cierra un handle previamente abierto. Incluye ObjectName, HandleId y SubjectUserSid. Por sí solo poco útil — se correlationa con el 4656 correspondiente para saber cuánto tiempo un proceso mantuvo abierto un objeto.',
    detection: [
      { label: 'PowerShell', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4658} -MaxEvents 50' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4658' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 4658" /var/log/syslog' },
    ],
    related: ['4656 (Handle solicitado)', '4663 (Acceso a objeto)', '4660 (Objeto eliminado)'],
    analysis: 'Poco útil individualmente, pero necesario para correlacionar con 4656 y reconstruir ventanas de acceso a archivos. Algunos SIEM lo ingieren solo para fines de timeline. Si un proceso abre un handle a NTDS.dit y lo mantiene abierto horas, sospechoso de exfil masivo.',
  },
  {
    id: 4663, name: 'Acceso a objeto', log: 'Security',
    short: 'Se accedió a un objeto (archivo/registry).',
    description: 'Se genera cuando un proceso realizó una operación sobre un objeto ya abierto. Muestra ObjectServer, ObjectType, ObjectName, AccessMask y ProcessId. El AccessMask indica el tipo de acceso: 0x10 = execute, 0x80 = read attributes, 0x2 = write-dataset, 0x100 = append, etc. Es el evento clave para auditar accesos a archivos críticos.',
    detection: [
      { label: 'PowerShell — accesos recientes', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4663} -MaxEvents 100 | Format-List TimeCreated, Message' },
      { label: 'Accesos a NTDS.dit', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4663} | Where-Object {$_.Message -match "ntds.dit|NTDS"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4663' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 4663" /var/log/syslog' },
    ],
    sigma: `title: Suspicious Access to Active Directory Database - NTDS.dit
id: 3b2c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4663
    ObjectName|contains: ntds.dit
  filter:
    ProcessName|endswith: lsass.exe
  condition: selection and not filter
fields:
  - SubjectUserName
  - ProcessName
  - ObjectName
level: critical`,
    related: ['4656 (Handle solicitado)', '4658 (Handle cerrado)', '4660 (Objeto eliminado)', '4670 (Permisos cambiados)'],
    analysis: 'Crítico para auditar accesos a NTDS.dit, SAM registry hive, lsass.exe, archivos .pst, certificados. Ruidoso en sistemas con SACLs amplias — afina la auditoría solo a archivos sensibles. En ransomware, verás miles de 4663 con AccessMask 0x2/0x80 sobre muchos archivos en poco tiempo. Acceso a NTDS.dit por procesos que no sean lsass.exe = exfil de hashes (ntdsutil, vssadmin, mimikatz).',
  },
  {
    id: 4672, name: 'Privilegios especiales asignados', log: 'Security',
    short: 'Logon con privilegios especiales (admin).',
    description: 'Se genera justo después de un 4624 cuando la cuenta que inicia sesión tiene privilegios especiales (SeDebugPrivilege, SeTcbPrivilege, etc.). Sirve como filtro rápido para "logons de administradores".',
    detection: [
      { label: 'PowerShell', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4672} -MaxEvents 50' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4672' },
    ],
    related: ['4624 (Logon exitoso)', '4720 (Usuario creado)'],
    analysis: 'Es el "filtro admin" — solo se genera para cuentas con privilegios elevados. Cualquier 4672 fuera de horario laboral o para cuentas admin que normalmente no se logonean es investigable. Combinable con 4624 para auditar logons admin.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1078', 'T1068', 'T1548.002'],
    kql: 'SecurityEvent\n| where EventID == 4672\n| project TimeGenerated, Computer, SubjectUserName, IpAddress, PrivilegeList\n| where SubjectUserName !endswith "-admin" and SubjectUserName !contains "$" and SubjectUserName !contains "umfd"',
    spl: 'index=windows EventCode=4672 | where NOT match(user, ".*-admin$") AND user!="*$*" | table _time, host, user, src_ip, PrivilegeList',
    threatHuntingNotes: 'Hunt 1: 4672 fuera de horario laboral para cuentas admin. Hunt 2: 4672 para cuentas que no suelen admin (service accounts, usuarios comunes). Hunt 3: 4672 con SeTcbPrivilege / SeDebugPrivilege — normalmente solo LSASS/Services.exe deberían tenerlos. Hunt 4: 4672 desde IPs no corporativas.',
    relevantFields: ['EventID', 'SubjectUserName', 'SubjectUserSid', 'PrivilegeList', 'IpAddress'],
    detectionTips: 'Whitelista system accounts (LOCAL SERVICE, NETWORK SERVICE, SYSTEM, DWM-*, UMFD-*, IUSR). Las machine accounts (结尾 $) también suelen generar 4672. SIEM: extraer PrivilegeList — la presencia de SeDebugPrivilege es especialmente sospechosa en user contexts.',
    relatedEventIds: [4624, 4625, 4720],
  },
  {
    id: 4673, name: 'Servicio privilegiado llamado', log: 'Security',
    short: 'Un proceso llamó a un servicio privilegiado del kernel.',
    description: 'Se genera cuando un proceso invoca un servicio del sistema que requiere privilegios (privilege). Incluye SubjectUserSid, ServiceName (p.ej. LsaRegisterLogonProcess, SamConnect), ObjectServer, Privilege (p.ej. SeTcbPrivilege) y ProcessId. Requiere habilitar "Sensitive Privilege Use" auditing.',
    detection: [
      { label: 'PowerShell — servicios privilegiados recientes', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4673} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Llamadas a SAMConnect', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4673} | Where-Object {$_.Message -match "SamConnect|SamLookup"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4673' },
    ],
    sigma: `title: Suspicious Privileged Service Call - SAM Access
id: 4c3d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4673
    ServiceName|contains:
      - SamConnect
      - SamLookup
      - LsaRegisterLogonProcess
  filter:
    ProcessName|endswith: lsass.exe
  condition: selection and not filter
fields:
  - SubjectUserName
  - ProcessName
  - ServiceName
level: high`,
    related: ['4674 (Operación en objeto privilegiado)', '4624 (Logon exitoso)', '4688 (Proceso creado)', '4663 (Acceso a objeto)'],
    analysis: 'Llamadas a LsaRegisterLogonProcess o SamConnect por procesos no-LSASS indican credential dumping o manipulation de SAM. Procesos con SeTcbPrivilege (act as part of OS) son sospechosos si no son lsass.exe o services.exe. Caza procesos no-Microsoft pidiendo SeDebugPrivilege, SeTcbPrivilege o SeAssignPrimaryTokenPrivilege.',
  },
  {
    id: 4674, name: 'Operación en objeto privilegiado', log: 'Security',
    short: 'Se intentó una operación en un objeto privilegiado.',
    description: 'Similar al 4673 pero dispara cuando se intenta operar sobre un objeto que requiere privilegios. Muestra SubjectUserSid, ObjectServer, ObjectType, ObjectName, AccessMask y Privilege. Requiere auditing de "Sensitive Privilege Use".',
    detection: [
      { label: 'PowerShell — operaciones privilegiadas', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4674} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Operaciones fallidas', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4674} | Where-Object {$_.Message -match "failure|denied"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4674' },
    ],
    related: ['4673 (Servicio privilegiado)', '4624 (Logon exitoso)', '4688 (Proceso creado)'],
    analysis: 'Complementa al 4673. Útil para detectar escalation de privilegios fallida (cuando un proceso sin privilegios intenta acceder a objetos privilegiados). Poco común en entornos sin auditing avanzado — verifíquelo con el equipo de hardening.',
  },
  {
    id: 4688, name: 'Proceso creado', log: 'Security',
    short: 'Se creó un nuevo proceso.',
    description: 'Se genera cada vez que un proceso crea otro. Es el evento más usado para EDR/hunting — incluye la línea de comandos completa (con configuración adecuada). Requiere habilitar "Process Creation Auditing" en Audit Policy.',
    detection: [
      { label: 'PowerShell — procesos recientes', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4688} -MaxEvents 100' },
      { label: 'Procesos lanzados por cmd.exe', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4688} | Where-Object {$_.Message -match "ParentProcess: cmd.exe"}' },
      { label: 'Procesos con PowerShell con -enc', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4688} | Where-Object {$_.Message -match "powershell.*-enc"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4688' },
    ],
    sigma: `title: Suspicious PowerShell Encoded Command
id: 5c0d41db-4b6e-4a0e-9f5a-10c2c1d5f8a4
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4688
    CommandLine|contains:
      - '-enc'
      - '-EncodedCommand'
  condition: selection
level: high`,
    related: ['4689 (Proceso terminado)', '1 (Sysmon process create)'],
    analysis: 'El evento más potente para threat hunting. Busca: powershell.exe con -enc (base64), rundll32 con URL/suspicious DLL, certutil para descargar, mshta con URL, wscript/cscript con script, bitsadmin para descargar. Sin la línea de comandos completa habilitada, pierdes la mitad del valor.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1059', 'T1059.001', 'T1059.003', 'T1027.010', 'T1204.002'],
    sigmaId: 'sigma-process-creation-suspicious-parent',
    kql: 'DeviceProcessEvents\n| where ActionType == "ProcessStart"\n| project TimeGenerated, DeviceName, InitiatingProcessFileName, FileName, ProcessCommandLine, AccountName\n| where ProcessCommandLine has_any ("-enc", "-EncodedCommand", "IEX", "FromBase64String", "rundll32", "mshta", "certutil", "bitsadmin")',
    spl: 'index=windows EventCode=4688 (CommandLine="*-enc*" OR CommandLine="*-EncodedCommand*" OR CommandLine="*IEX*" OR CommandLine="*FromBase64String*" OR CommandLine="*rundll32*" OR CommandLine="*mshta*" OR CommandLine="*certutil*" OR CommandLine="*bitsadmin*") | table _time, host, parent, process, CommandLine, user',
    threatHuntingNotes: 'Hunt 1: parent/child inusual (winword → cmd/powershell). Hunt 2: CommandLine con -enc/-EncodedCommand. Hunt 3: procesos lanzados desde %USERPROFILE%\Downloads o %TEMP%. Hunt 4: procesos con hashes sin firma (verificar con Sysmon EventID 7). Hunt 5: rundll32/mshta/certutil/bitsadmin — son los LoLBins más usados.',
    relevantFields: ['EventID', 'SubjectUserName', 'NewProcessName', 'CommandLine', 'ProcessId', 'ParentProcessName', 'TargetSubjectSid', 'TokenElevationType'],
    detectionTips: 'Requiere habilitar "Audit Process Creation" + "Include command line in process creation events" (GPO). Sin esto, CommandLine no se loguea. Falso positivo alto — combinar con otras señales. SIEM: parseo del mensaje en XML para no perder CommandLine con espacios/quotes.',
    relatedEventIds: [4689, 1, 4104, 4103],
  },
  {
    id: 4689, name: 'Proceso terminado', log: 'Security',
    short: 'Un proceso terminó.',
    description: 'Se genera cuando un proceso termina. Útil para calcular tiempo de ejecución de procesos. Requiere habilitar audit process exit.',
    detection: [
      { label: 'PowerShell', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4689} -MaxEvents 50' },
    ],
    related: ['4688 (Proceso creado)'],
    analysis: 'Por sí solo poco útil para hunting, pero combinable con 4688 para calcular duración de procesos. Útil en forense para saber cuándo se ejecutó un malware.',
  },
  {
    id: 4697, name: 'Servicio instalado (Security log)', log: 'Security',
    short: 'Se instaló un servicio en el sistema.',
    description: 'Se genera cuando se instala o crea un servicio. Incluye SubjectUserName, ServiceName, ServiceType, ServiceStartType (p.ej. Auto, Demand), ServiceAccount (LocalSystem/NetworkService/etc.) y BinaryPathName. Alternativa al 7045 (System log) con más detalle estructurado — mejor para ingestión SIEM.',
    detection: [
      { label: 'PowerShell — servicios instalados recientes', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4697} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Servicios con StartType Auto', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4697} | Where-Object {$_.Message -match "StartType.*Auto"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4697' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 4697" /var/log/syslog' },
    ],
    sigma: `title: Suspicious Service Installation - Suspicious Binary Path
id: 9d8e7f6a-5b4c-3d2e-1f0a-9b8c7d6e5f4a
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4697
  suspicious_path:
    BinaryPathName|contains:
      - '\\\\Users\\\\Public\\\\'
      - '\\\\AppData\\\\Local\\\\Temp\\\\'
      - '\\\\AppData\\\\Roaming\\\\'
      - 'powershell'
      - 'rundll32'
      - 'mshta'
  condition: selection and suspicious_path
fields:
  - SubjectUserName
  - ServiceName
  - BinaryPathName
level: high`,
    related: ['7045 (System log alt)', '7036 (Service started/stopped)', '7040 (Service start type changed)', '4688 (Proceso creado)'],
    analysis: 'Vector clásico de persistencia. Atacantes instalan servicios que corren como LocalSystem para ejecutarse al boot. Caza BinaryPathName con paths sospechosos (C:\\Users\\Public, %TEMP%, con PowerShell -enc, rundll32, mshta). Un servicio nuevo + 4624 logon de SYSTEM justo después = IR inmediato.',
  },
  {
    id: 4698, name: 'Tarea programada creada', log: 'Security',
    short: 'Se creó una tarea programada (persistencia).',
    description: 'Se genera cuando se crea una tarea en Task Scheduler. Incluye SubjectUserName, TaskName y el XML completo de la tarea con Actions (qué ejecutar), Triggers (cuándo), UserId (cómo corre). Es el evento de persistencia por excelencia — muchas APT usan tareas.',
    detection: [
      { label: 'PowerShell — tareas creadas recientes', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4698} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Tareas que ejecutan PowerShell', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4698} | Where-Object {$_.Message -match "powershell.*-enc|powershell.*-Command"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4698' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 4698" /var/log/syslog' },
    ],
    sigma: `title: Suspicious Scheduled Task Creation with Suspicious Command
id: 1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4698
  suspicious:
    Message|contains:
      - 'powershell'
      - '-enc '
      - '-EncodedCommand'
      - 'rundll32'
      - 'mshta'
      - 'certutil'
      - 'bitsadmin'
  condition: selection and suspicious
fields:
  - SubjectUserName
  - TaskName
level: high`,
    related: ['4699 (Task deleted)', '4700 (Task enabled)', '4701 (Task disabled)', '4702 (Task updated)'],
    analysis: 'Caza tareas que ejecutan PowerShell con -enc/-EncodedCommand, rundll32 con URL, mshta, certutil, bitsadmin. Tareas que corren como SYSTEM/SERVICE y disparan al logon (logon trigger) son altamente sospechosas. Compara con la baseline del host — tareas nuevas fuera de ventana de mantenimiento = investigar.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1053.005', 'T1053'],
    sigmaId: 'sigma-scheduled-task-created-4698',
    kql: 'SecurityEvent\n| where EventID == 4698\n| where TaskName !startswith "\\\\Microsoft\\\\Windows\\\\"\n| project TimeGenerated, Computer, TaskName, SubjectUserName, TaskContent\n| where TaskContent has_any ("powershell", "-enc", "-EncodedCommand", "rundll32", "mshta", "certutil", "bitsadmin")',
    spl: 'index=windows EventCode=4698 TaskName!=*Microsoft\\\\Windows\\\\* (TaskContent="*powershell*" OR TaskContent="*-enc*" OR TaskContent="*-EncodedCommand*" OR TaskContent="*rundll32*" OR TaskContent="*mshta*" OR TaskContent="*certutil*" OR TaskContent="*bitsadmin*") | table _time, host, TaskName, user, TaskContent',
    threatHuntingNotes: 'Hunt 1: tareas nuevas fuera de ventana de mantenimiento. Hunt 2: TaskContent con PowerShell -enc, mshta, rundll32, certutil, bitsadmin. Hunt 3: tareas que corren como SYSTEM/SERVICE con logon trigger (especialmente sospechoso). Hunt 4: comparar con baseline del host — la diferencia es la señal.',
    relevantFields: ['EventID', 'SubjectUserName', 'TaskName', 'TaskContent', 'SubjectUserSid'],
    detectionTips: 'Filtrar tareas de Microsoft\\Windows\\* — son del SO y ruido. La regla Sigma clásica usa un allow-list de tareas conocidas. SIEM: extraer el TaskContent (XML) y parsearlo — Task/Actions/Exec/Command es lo que importa. Si la cuenta creadora no es admin delegado → IR.',
    relatedEventIds: [4699, 4700, 4701, 4702],
  },
  {
    id: 4699, name: 'Tarea programada eliminada', log: 'Security',
    short: 'Se eliminó una tarea programada.',
    description: 'Se genera cuando se elimina una tarea programada. Incluye SubjectUserName y TaskName. Útil para detectar limpieza de persistencia maliciosa por parte del atacante (anti-forense).',
    detection: [
      { label: 'PowerShell — tareas eliminadas', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4699} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4699' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 4699" /var/log/syslog' },
    ],
    related: ['4698 (Task created)', '4700 (Task enabled)', '4701 (Task disabled)', '4702 (Task updated)'],
    analysis: 'Si una tarea se crea (4698) y elimina (4699) en poco tiempo, suele ser un atacante probando persistencia o limpiando tras cumplir su objetivo. Tareas admin eliminadas sin justificación = investigar. Caza eliminaciones de tareas de AV/EDR — un atacante puede borrar la tarea de escaneo programado.',
  },
  {
    id: 4700, name: 'Tarea programada habilitada', log: 'Security',
    short: 'Se habilitó una tarea programada.',
    description: 'Se genera cuando se habilita una tarea previamente deshabilitada. Incluye SubjectUserName y TaskName. Atacantes pueden reactivar tareas legítimas pero inactivas para persistencia discreta.',
    detection: [
      { label: 'PowerShell — tareas habilitadas', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4700} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4700' },
    ],
    related: ['4698 (Task created)', '4699 (Task deleted)', '4701 (Task disabled)', '4702 (Task updated)'],
    analysis: 'Si una tarea se deshabilitó hace tiempo y se reactiva sin motivo, sospechoso. Verifica con el admin si el cambio es legítimo. Tareas de AV reactivadas por cuentas no-admin pueden indicar manipulación.',
  },
  {
    id: 4701, name: 'Tarea programada deshabilitada', log: 'Security',
    short: 'Se deshabilitó una tarea programada.',
    description: 'Se genera cuando se deshabilita una tarea. Incluye SubjectUserName y TaskName. Atacantes pueden deshabilitar tareas de AV/EDR/backup para evitar detección.',
    detection: [
      { label: 'PowerShell — tareas deshabilitadas', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4701} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Tareas de Defender deshabilitadas', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4701} | Where-Object {$_.Message -match "Defender|MpCmdRun"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4701' },
    ],
    sigma: `title: Windows Defender Scheduled Task Disabled
id: 2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4701
    TaskName|contains:
      - 'Windows Defender'
      - 'MpRunDll'
      - 'MpCmdRun'
  condition: selection
fields:
  - SubjectUserName
  - TaskName
level: high`,
    related: ['4698 (Task created)', '4699 (Task deleted)', '4700 (Task enabled)', '4702 (Task updated)'],
    analysis: 'Tareas de AV/EDR/Windows Defender deshabilitadas son IR. Caza TaskNames que contengan "Defender", "Antivirus", "EDR", "Backup", "Mp". Verifica el SubjectUserName — solo admins autorizados deberían poder deshabilitarlas.',
  },
  {
    id: 4702, name: 'Tarea programada modificada', log: 'Security',
    short: 'Se modificó una tarea programada existente.',
    description: 'Se genera cuando se actualiza una tarea existente. Incluye SubjectUserName, TaskName y el XML modificado. Atacantes pueden modificar tareas legítimas (p.ej. una tarea de Microsoft) para inyectar su payload y así evadir detección.',
    detection: [
      { label: 'PowerShell — tareas modificadas', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4702} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Tareas de Microsoft modificadas', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4702} | Where-Object {$_.Message -match "\\\\Microsoft\\\\|TaskName.*Microsoft"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4702' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 4702" /var/log/syslog' },
    ],
    sigma: `title: Modification of Windows Scheduled Task
id: 3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4702
  condition: selection
fields:
  - SubjectUserName
  - TaskName
level: medium`,
    related: ['4698 (Task created)', '4699 (Task deleted)', '4700 (Task enabled)', '4701 (Task disabled)'],
    analysis: 'Modificación de tareas legítimas (p.ej. Microsoft tareas) es altamente sospechoso — cambia el comando de una tarea que ya existe para inyectar payload. Compara el XML actual vs el histórico. Si ves 4702 sobre una tarea de Microsoft seguido de ejecuciones raras, IR.',
  },
  {
    id: 4719, name: 'Política de auditoría cambiada', log: 'Security',
    short: 'Se modificó la política de auditoría del sistema.',
    description: 'Se genera cuando se cambia la Audit Policy (auditpol). Incluye SubjectUserName, Category (Logon/ObjectAccess/PrivilegeUse/etc.) y AuditPolicyChanges (Success/Failure). Atacantes pueden deshabilitar auditing para evadir detección.',
    detection: [
      { label: 'PowerShell — cambios de política', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4719} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Políticas deshabilitadas', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4719} | Where-Object {$_.Message -match "Success|Failure" -and $_.Message -match "removed|disabled"}' },
      { label: 'Ver política actual', cmd: 'auditpol /get /category:*' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4719' },
    ],
    sigma: `title: Audit Policy Modification
id: 4d5e6f7a-8b9c-4d0e-1f2a-3b4c5d6e7f8a
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4719
  condition: selection
fields:
  - SubjectUserName
  - Category
  - AuditPolicyChanges
level: high`,
    related: ['4624 (Logon exitoso)', '4672 (Privilegios especiales)', '4688 (Proceso creado)', '4739 (Group changed)'],
    analysis: 'Cualquier 4719 fuera de ventana de mantenimiento = IR. Atacantes deshabilitan auditing de Process Creation (4688), Logon (4624) o Object Access para que su actividad no quede registrada. Compara el estado actual con `auditpol /get /category:*` y la baseline de la empresa.',
  },
  {
    id: 4720, name: 'Usuario creado', log: 'Security',
    short: 'Se creó una cuenta de usuario.',
    description: 'Se genera cuando se crea una cuenta de usuario local. Incluye SubjectUserName (quién la creó), TargetUserName (la nueva cuenta) y attributes. Esencial para detectar creación de cuentas por atacantes para persistencia.',
    detection: [
      { label: 'PowerShell', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4720} -MaxEvents 50' },
      { label: 'Filtra quién creó', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4720} | Select-Object TimeCreated, @{n="CreatedBy";e={$_.Properties[4].Value}}, @{n="NewUser";e={$_.Properties[0].Value}}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4720' },
    ],
    sigma: `title: User Account Created
id: 6c0d41db-4b6e-4a0e-9f5a-10c2c1d5f8a5
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4720
  condition: selection
level: medium`,
    related: ['4722 (Habilitado)', '4724 (Password reset)', '4732 (Miembro añadido a grupo)'],
    analysis: 'Si no es admin conocido creando usuario en horario laboral, sospechoso. Atacantes crean cuentas para persistencia (sobrevive a reinicios, password changes, etc.). Verifica con el admin si la creación es legítima. Una cuenta nueva agregada a grupos admin es IR inmediato (4732).',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1136.001', 'T1136'],
    sigmaId: 'sigma-account-created-4720',
    kql: 'SecurityEvent\n| where EventID == 4720\n| project TimeGenerated, Computer, TargetUserName, SubjectUserName\n| where SubjectUserName !endswith "-admin" and SubjectUserName !contains "helpdesk" and SubjectUserName !contains "join"',
    spl: 'index=windows EventCode=4720 | where NOT match(user, ".*admin.*") AND NOT match(user, ".*helpdesk.*") | table _time, host, new_user, created_by',
    threatHuntingNotes: 'Hunt 1: cuentas creadas fuera de horario laboral. Hunt 2: cuentas creadas por usuarios que no son Help Desk/admin delegado. Hunt 3: cuenta nueva agregada a grupos admin (4732 sigue al 4720) → IR inmediato. Hunt 4: cuentas con nombres sospechosos (svc_*, _service, console_*) pero creadas por usuario común.',
    relevantFields: ['EventID', 'SubjectUserName', 'TargetUserName', 'SubjectUserSid', 'TargetUserSid', 'PrivilegeList', 'SamAccountName'],
    detectionTips: 'Correlaciona con 4732 (member added to group) — cuenta nueva + add to admin group en <1h = alta probabilidad de persistencia. SIEM: enriquece con baseline de creadores de cuentas legítimos (helpdesk, svc_join, etc.).',
    relatedEventIds: [4722, 4724, 4732, 4738],
  },
  {
    id: 4722, name: 'Usuario habilitado', log: 'Security',
    short: 'Una cuenta fue habilitada.',
    description: 'Se genera cuando se habilita una cuenta deshabilitada. Atacantes pueden reactivar cuentas inactivas para mantener acceso discreto.',
    detection: [
      { label: 'PowerShell', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4722} -MaxEvents 50' },
    ],
    related: ['4720 (Usuario creado)', '4726 (Usuario eliminado)'],
    analysis: 'Una cuenta deshabilitada que se habilita sin justificación es sospechosa — pueden ser cuentas de servicio o de empleado que se fue. Verifica con IT.',
  },
  {
    id: 4724, name: 'Password reset', log: 'Security',
    short: 'Se intentó restablecer una contraseña.',
    description: 'Se genera cuando se resetea la password de una cuenta. Diferente de "user changed own password" (que es el 4723). 4724 = admin reseteando password de otro.',
    detection: [
      { label: 'PowerShell', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4724} -MaxEvents 50' },
    ],
    related: ['4720 (Usuario creado)', '4738 (Usuario modificado)'],
    analysis: 'Atacantes con admin pueden resetear password de cuentas privilegiadas (Domain Admin) para acceder luego. Verifica que el SubjectUserName es un admin autorizado y el reseteo estaba planeado.',
  },
  {
    id: 4726, name: 'Usuario eliminado', log: 'Security',
    short: 'Se eliminó una cuenta de usuario.',
    description: 'Se genera cuando se elimina una cuenta local. Atacantes pueden eliminar cuentas creadas para persistencia tras cumplir su objetivo (anti-forense).',
    detection: [
      { label: 'PowerShell', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4726} -MaxEvents 50' },
    ],
    related: ['4720 (Usuario creado)', '4738 (Usuario modificado)'],
    analysis: 'Cuentas creadas (4720) y luego borradas (4726) en corto tiempo = strong indicator de actividad maliciosa (crea usuario, exfiltra, borra evidencia).',
  },
  {
    id: 4728, name: 'Miembro añadido a grupo global', log: 'Security',
    short: 'Un miembro fue añadido a un grupo global con seguridad habilitada.',
    description: 'Se genera cuando una cuenta se agrega a un grupo global (security-enabled) — p.ej. Domain Admins. Es el equivalente global del 4732 (grupos locales) y del 4756 (grupos universales). Si un atacante se añade a Domain Admins, gana persistencia y control total del dominio — IR inmediato.',
    detection: [
      { label: 'PowerShell — agregados a Domain Admins', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4728} | Where-Object {$_.Message -match "Domain Admins"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4728' },
    ],
    sigma: `title: User Added to Security-Enabled Global Group
id: 3c0d41db-4b6e-4a0e-9f5a-10c2c1d5f8b3
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4728
  condition: selection
level: medium`,
    related: ['4732 (Miembro añadido a grupo local)', '4729 (Miembro quitado de grupo global)', '4720 (Usuario creado)'],
    analysis: 'IR CRÍTICO si el SubjectUserName no es un admin autorizado o el TargetUserName fue creado recientemente. El combo clásico: 4720 (crea usuario) + 4728 (lo mete en Domain Admins) en menos de 1h = compromiso confirmado. Ojo: Enterprise Admins es un grupo UNIVERSAL — su alta se registra como 4756, no como 4728.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1098'],
  },
  {
    id: 4732, name: 'Miembro añadido a grupo local', log: 'Security',
    short: 'Un miembro fue añadido a un grupo local.',
    description: 'Se genera cuando una cuenta se agrega a un grupo local (incluido Administrators). Si un atacante se agrega a Administrators, gana persistencia total en el host.',
    detection: [
      { label: 'PowerShell — agregados a Admins', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4732} | Where-Object {$_.Message -match "Administrators"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4732' },
    ],
    sigma: `title: User Added to Local Administrators
id: 7c0d41db-4b6e-4a0e-9f5a-10c2c1d5f8a6
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4732
  filter:
    Message|contains: Administrators
  condition: selection and filter
level: high`,
    related: ['4720 (Usuario creado)', '4733 (Miembro quitado)'],
    analysis: 'IR CRÍTICO si el SubjectUserName no es admin autorizado o el TargetUserName es una cuenta creada recientemente. Combinable con 4720: si en 1h ves 4720 (crea user) + 4732 (lo mete en Admins), es 100% compromiso.',
  },
  {
    id: 4738, name: 'Usuario modificado', log: 'Security',
    short: 'Se modificó una cuenta de usuario.',
    description: 'Se genera cuando se modifica un atributo de cuenta (password, grupo, flags). Útil para detectar cambios sospechosos en cuentas de servicio o admin.',
    detection: [
      { label: 'PowerShell', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4738} -MaxEvents 50' },
    ],
    related: ['4720 (Usuario creado)', '4724 (Password reset)'],
    analysis: 'Cambio de UPN de cuentas de servicio, cambio de SPN, habilitación de "Do not require Kerberos preauth" — todos sospechosos. Verifica el detalle del cambio.',
  },
  {
    id: 4739, name: 'Grupo cambiado (no-membership)', log: 'Security',
    short: 'Se modificó un atributo de grupo (no membership).',
    description: 'Se genera cuando se modifica un atributo de grupo que no sea membership (eso es 4732/4733). Incluye SubjectUserName, GroupName y ChangedAttributes (description, group type, scope). Complemento del 4735 (Local) y 4737 (Global).',
    detection: [
      { label: 'PowerShell — grupos modificados', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4739} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4739' },
    ],
    related: ['4732 (Member added)', '4735 (Group modified — local)', '4737 (Group modified — global)', '4719 (Audit policy)'],
    analysis: 'Cambio de tipo de grupo (p.ej. de Domain Local a Global) o de scope es raro y sospechoso. Verifica que el SubjectUserName es un admin autorizado. A veces usado por DCShadow attacks para manipular replicación.',
  },
  {
    id: 4740, name: 'Cuenta bloqueada', log: 'Security',
    short: 'Una cuenta fue bloqueada por intentos fallidos.',
    description: 'Se genera cuando se alcanza el threshold de logins fallidos y se bloquea la cuenta. Indica fuerza bruta — pero también password spraying con cuentas equivocadas.',
    detection: [
      { label: 'PowerShell', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4740} -MaxEvents 50' },
      { label: 'Filtra cuenta bloqueada', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4740} | Select-Object TimeCreated, @{n="LockedUser";e={$_.Properties[0].Value}}' },
    ],
    related: ['4625 (Logon fallido)', '4767 (Cuenta desbloqueada)'],
    analysis: 'Si muchas cuentas se bloquean en poco tiempo, es fuerza bruta o password spraying. Diferencia: fuerza bruta es una cuenta con muchos intentos; spraying es muchas cuentas con un intento cada una.',
  },
  {
    id: 4767, name: 'Cuenta desbloqueada', log: 'Security',
    short: 'Una cuenta fue desbloqueada.',
    description: 'Se genera cuando un admin desbloquea una cuenta. Útil para auditar quién desbloquea cuentas (legítimo o no).',
    detection: [
      { label: 'PowerShell', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4767} -MaxEvents 50' },
    ],
    related: ['4740 (Cuenta bloqueada)'],
    analysis: 'Si una cuenta se bloquea (4740) y se desbloquea (4767) inmediatamente, puede ser un atacante desbloqueando para seguir intentando. Verifica el SubjectUserName.',
  },
  {
    id: 4768, name: 'Kerberos TGT solicitado (AS-REQ)', log: 'Security',
    short: 'Un usuario pidió un TGT a un KDC.',
    description: 'Se genera en el DC cuando un usuario solicita un Ticket Granting Ticket (TGT) — paso 1 de Kerberos (AS-REQ). Incluye TargetUserName, TargetSid, ServiceName (krbtgt), TicketOptions y TicketEncryptionType. En la autenticación normal, dispara una vez al logon.',
    detection: [
      { label: 'PowerShell — TGTs recientes en DC', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4768} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'TGTs con RC4 (downgrade)', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4768} | Where-Object {$_.Message -match "TicketEncryptionType.*0x17"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4768' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 4768" /var/log/syslog' },
    ],
    sigma: `title: Kerberos TGT Request with RC4 Encryption
id: 5e6f7a8b-9c0d-4e1f-2a3b-4c5d6e7f8a9b
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4768
    TicketEncryptionType: 0x17
  condition: selection
fields:
  - TargetUserName
  - IpAddress
level: medium`,
    related: ['4769 (TGS requested)', '4771 (Pre-auth failed)', '4624 (Logon exitoso)', '4625 (Logon fallido)'],
    analysis: 'Pista de DC. Muchos 4768 para una cuenta desde múltiples IPs = password spraying. TicketEncryptionType 0x17 (RC4) es sospechoso en dominios modernos — indica downgrade o herramienta vieja. Pre-auth type 0 (no pre-auth) = AS-REP Roasting vulnerable. Caza peticiones de cuentas inexistentes = enumeración de usuarios.',
  },
  {
    id: 4769, name: 'Ticket de servicio Kerberos (TGS-REQ)', log: 'Security',
    short: 'Un usuario pidió ticket para un servicio (TGS).',
    description: 'Se genera en el DC cuando un usuario con TGT pide un Service Ticket (TGS-REQ). Incluye TargetUserName, ServiceName (SPN del servicio), ServiceSid, TicketOptions y TicketEncryptionType. Es EL evento clave para detectar Kerberoasting.',
    detection: [
      { label: 'PowerShell — TGS recientes en DC', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4769} -MaxEvents 100 | Format-List TimeCreated, Message' },
      { label: 'Tickets RC4 (Kerberoasting)', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4769} | Where-Object {$_.Message -match "TicketEncryptionType.*0x17"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4769' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 4769" /var/log/syslog' },
    ],
    sigma: `title: Kerberoasting - RC4 TGS Request for Service Account
id: 6f7a8b9c-0d1e-4f2a-3b4c-5d6e7f8a9b0c
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4769
    TicketEncryptionType: 0x17
  filter:
    ServiceName|startswith: krbtgt
  condition: selection and not filter
fields:
  - TargetUserName
  - ServiceName
  - IpAddress
level: high`,
    related: ['4768 (TGT requested)', '4771 (Pre-auth failed)', '4624 (Logon exitoso)', '4672 (Privilegios especiales)'],
    analysis: 'Kerberoasting: atacante pide TGS para SPNs con cuenta de servicio y los crackea offline. Caza: TicketEncryptionType 0x17 (RC4-Downgraded) en dominios modernos, picos de 4769 en poco tiempo, SPNs poco comunes (MSSQL, IIS, HTTP/), peticiones RC4 cuando el dominio soporta AES. Combinable con 4624 para ver si la cuenta pidió logon.',
  },
  {
    id: 4771, name: 'Pre-autenticación Kerberos fallida', log: 'Security',
    short: 'Falló la pre-autenticación Kerberos (AS-REQ).',
    description: 'Se genera en el DC cuando falla la pre-autenticación Kerberos (no confundir con 4768 éxito). Incluye TargetUserName, Failure Code (p.ej. 0x18 = bad password, 0x6 = user not found, 0x12 = disabled) y SourceIP. Complemento Kerberos del 4625 (NTLM).',
    detection: [
      { label: 'PowerShell — pre-auth fallidas', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4771} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Cuentas inexistentes (0x6)', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4771} | Where-Object {$_.Message -match "0x6"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4771' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 4771" /var/log/syslog' },
    ],
    sigma: `title: Kerberos Pre-Authentication Failed - Possible Password Spraying
id: 7a8b9c0d-1e2f-4a3b-4c5d-6e7f8a9b0c1d
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4771
  timeframe: 10m
  condition: selection | count() by IpAddress > 30
fields:
  - TargetUserName
  - IpAddress
  - FailureCode
level: high`,
    related: ['4768 (TGT)', '4769 (TGS)', '4625 (NTLM logon failed)', '4740 (Account locked)'],
    analysis: 'Pista de DC para fuerza bruta Kerberos. Failure Code 0x6 (KDC_ERR_C_PRINCIPAL_UNKNOWN) desde una IP con muchas cuentas = password spraying. 0x18 (KDC_ERR_PREAUTH_FAILED) = password incorrecto. Si ves 4771 masivo seguido de 4768 éxito = fuerza bruta exitosa. No se correlaciona con 4624 — Kerberos usa otros eventos.',
  },
  {
    id: 4776, name: 'NTLM auth', log: 'Security',
    short: 'Validación de credenciales NTLM.',
    description: 'Se genera cuando se valida una cuenta con NTLM (no Kerberos). Incluye éxito/fallo. Si ve mucho NTLM en un dominio moderno, algo usa auth legacy — algunos ataques pasan por NTLM relay.',
    detection: [
      { label: 'PowerShell', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4776} -MaxEvents 50' },
    ],
    related: ['4624 (Logon exitoso)', '4625 (Logon fallido)'],
    analysis: 'NTLM es legacy — un dominio moderno debería usar Kerberos. Mucho 4776 indica apps que no soportan Kerberos o NTLM relay attacks. Considera deshabilitar NTLM gradualmente.',
  },
  {
    id: 4781, name: 'Nombre de cuenta cambiado', log: 'Security',
    short: 'Se cambió el nombre de una cuenta.',
    description: 'Se genera cuando se renombra una cuenta de usuario. Incluye SubjectUserName, OldTargetUserName y NewTargetUserName. Atacantes pueden renombrar cuentas de servicio o admin para ofuscación (esconder persistencia).',
    detection: [
      { label: 'PowerShell — renombrados recientes', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4781} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4781' },
    ],
    related: ['4720 (Usuario creado)', '4726 (Usuario eliminado)', '4738 (Usuario modificado)', '4724 (Password reset)'],
    analysis: 'Cuentas admin renombradas sin justificación son sospechosas — puede ser un atacante escondiendo una cuenta creada tras renombrar (p.ej. crea "svc_backup" y la renombra a "Administrator" tras borrar la original). Verifica con IT si el cambio era planeado.',
  },
  {
    id: 4793, name: 'Verificación de política de bloqueo', log: 'Security',
    short: 'Se consultó la política de bloqueo de cuentas.',
    description: 'Se genera cuando la API NetrpAccountDeltas o similar consulta el BadPwdCount/PwdLastSet de cuentas para verificar lockout. Muestra SubjectUserName y TargetUserName. Es el evento útil para identificar enumeración LDAP/SAM de info de cuentas.',
    detection: [
      { label: 'PowerShell — verificaciones de lockout', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4793} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4793' },
    ],
    related: ['4740 (Cuenta bloqueada)', '4625 (Logon fallido)', '4771 (Pre-auth fallida)'],
    analysis: 'Poco usado pero útil en DCs para detectar herramientas que consultan masivamente info de bloqueo (DCShadow, herramientas de recon como BloodHound/SharpHound). Si ve picos de 4793, investigue el proceso en el SubjectUserName.',
  },
  {
    id: 4798, name: 'Enumeración de grupos locales', log: 'Security',
    short: 'Se enumeraron los grupos locales de un usuario.',
    description: 'Se genera cuando un proceso enumera los grupos locales de un usuario. Atacantes usan esto para ver en qué grupos está el usuario (privilege escalation). Muchas herramientas de recon lo disparan.',
    detection: [
      { label: 'PowerShell', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4798} -MaxEvents 50' },
    ],
    related: ['4732 (Miembro añadido)', '4799 (Enumeración de grupos globales)'],
    analysis: 'Si ve un pico de 4798, suele ser herramienta de recon (BloodHound, SharpHound). Combinable con 4661 (SAM queries) para detectar BloodHound.',
  },
  {
    id: 4800, name: 'Workstation bloqueada', log: 'Security',
    short: 'La workstation fue bloqueada (Win+L).',
    description: 'Se genera cuando el usuario bloquea la pantalla (Win+L). Útil para reconstruir actividad.',
    detection: [
      { label: 'PowerShell', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4800} -MaxEvents 50' },
    ],
    related: ['4801 (Workstation desbloqueada)'],
    analysis: 'Por sí solo no es malicioso. Útil en forense para reconstruir timeline.',
  },
  {
    id: 4825, name: 'Sesión RDP denegada', log: 'Security',
    short: 'Se denegó una sesión RDP por restricciones.',
    description: 'Se genera cuando se deniega RDP por restricciones de logon (Allow log on through Remote Desktop Services). Útil para detectar intentos RDP no autorizados a cuentas restringidas.',
    detection: [
      { label: 'PowerShell', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4825} -MaxEvents 50' },
    ],
    related: ['4624 (Logon exitoso)', '4625 (Logon fallido)'],
    analysis: 'Cualquier 4825 es investigable — alguien intentó RDP con una cuenta que no tiene permiso. Combinable con 4625 para ver fuerza bruta previa.',
  },
  {
    id: 4826, name: 'Driver de kernel-mode bloqueado', log: 'Security',
    short: 'Se bloqueó la carga de un driver kernel-mode.',
    description: 'Se genera cuando Windows bloquea la carga de un driver kernel-mode por no cumplir los requisitos de firma o por estar en la lista de revocados (Vulnerable Driver Blocklist). Incluye FileName, DriverName, CodeIntegrityFlags. Indicador de BYOVD (Bring Your Own Vulnerable Driver).',
    detection: [
      { label: 'PowerShell — drivers bloqueados', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4826} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Ver lista actual', cmd: 'Get-Item "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\CI\\Config" | Select-Object VulnerableDriverBlocklistEnable' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4826' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 4826" /var/log/syslog' },
    ],
    sigma: `title: Blocked Kernel-Mode Driver Load - BYOVD Indicator
id: 8b9c0d1e-2f3a-4b4c-5d6e-7f8a9b0c1d2e
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4826
  condition: selection
fields:
  - FileName
  - DriverName
  - CodeIntegrityFlags
level: high`,
    related: ['6416 (Dispositivo reconocido)', '6417 (Device install blocked)', '5025 (Firewall detenido)', '7040 (Service start type changed)'],
    analysis: 'Drivers kernel-mode firmados con certificados revocados o robados (p.ej. certificados robados a NVIDIA o a HPE) son utilizados por malware como BYOVD (Bring Your Own Vulnerable Driver) para deshabilitar AV/EDR desde el kernel. Caza nombres poco comunes y correlaciona con paradas de servicio AV/EDR en los siguientes minutos.',
  },
  {
    id: 4868, name: 'Renovación Kerberos', log: 'Security',
    short: 'Se renovó un ticket Kerberos.',
    description: 'Se genera cuando se renueva un TGT (no re-issuance — renovación automática dentro del lifetime). Incluye TargetUserName, TicketEncryptionType. Normalmente invisible para el usuario.',
    detection: [
      { label: 'PowerShell — renovaciones', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4868} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4868' },
    ],
    related: ['4869 (Renewal failed)', '4768 (TGT)', '4769 (TGS)', '4624 (Logon exitoso)'],
    analysis: 'Poco útil para hunting — son renovaciones automáticas. Útil como baseline: pico anormal de 4868 para una cuenta desde IPs raras = pase elrato de credenciales robadas y se está refrescando el TGT.',
  },
  {
    id: 4869, name: 'Renovación Kerberos fallida', log: 'Security',
    short: 'Falló una renovación Kerberos.',
    description: 'Se genera cuando falla una renovación de TGT. Indica que el ticket expiró o se manipuló. Común cuando hay problemas de replicación en DCs o cuando el atacante manipula tickets (p.ej. golden ticket con cuentas borradas).',
    detection: [
      { label: 'PowerShell — renovaciones fallidas', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4869} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4869' },
    ],
    related: ['4868 (Renewal)', '4768 (TGT)', '4769 (TGS)', '4771 (Pre-auth failed)'],
    analysis: 'Renovaciones fallidas para cuentas recién borradas = uso de golden ticket (KRBTGT hash robado). Si ve 4869 para cuentas que no existen en AD, investigue KRBTGT compromise y resetee la clave KRBTGT dos veces (el doble reset invalida todos los tickets existentes).',
  },
  {
    id: 4946, name: 'Regla de Firewall añadida', log: 'Security',
    short: 'Se añadió una regla al Firewall de Windows.',
    description: 'Se genera cuando se añade una regla al Firewall de Windows. Incluye RuleName, RuleId, Direction (Inbound/Outbound) y Action (Allow/Block). Atacantes pueden abrir puertos para C2 o lateral movement.',
    detection: [
      { label: 'PowerShell — reglas nuevas', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4946} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Reglas inbound Allow', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4946} | Where-Object {$_.Message -match "Inbound" -and $_.Message -match "Allow"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4946' },
      { label: 'Ver reglas actuales', cmd: 'netsh advfirewall firewall show rule name=all' },
    ],
    sigma: `title: New Inbound Allow Firewall Rule
id: 9c0d1e2f-3a4b-4c5d-6e7f-8a9b0c1d2e3f
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4946
    Direction: Inbound
    Action: Allow
  condition: selection
fields:
  - SubjectUserName
  - RuleName
level: medium`,
    related: ['4947 (Rule modified)', '4948 (Rule deleted)', '4950 (Config changed)', '5031 (App blocked)'],
    analysis: 'Nuevas reglas inbound que permiten puertos raros (4444, 1337, 8080, 9999) son sospechosas. Reglas que permiten apps en paths sospechosos (C:\\Users\\Public, %TEMP%, AppData\\Local) son IR. Compara con baseline de reglas legítimas y verifica el SubjectUserName.',
  },
  {
    id: 4947, name: 'Regla de Firewall modificada', log: 'Security',
    short: 'Se modificó una regla del Firewall de Windows.',
    description: 'Se genera cuando se modifica una regla existente del Firewall. Incluye RuleName, RuleId, ChangedAttributes. Atacantes pueden modificar reglas existentes (p.ej. cambiar Block a Allow) para evadir detección.',
    detection: [
      { label: 'PowerShell — reglas modificadas', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4947} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4947' },
      { label: 'Ver reglas actuales', cmd: 'netsh advfirewall firewall show rule name=all' },
    ],
    related: ['4946 (Rule added)', '4948 (Rule deleted)', '4950 (Config changed)', '5031 (App blocked)'],
    analysis: 'Modificar reglas de bloqueo existentes para permitir tráfico es una técnica clásica de evasión. Caza cambios de Action de Block a Allow sobre reglas de Windows Defender. Compara el XML actual vs histórico de cada regla. Verifica el SubjectUserName.',
  },
  {
    id: 4948, name: 'Regla de Firewall eliminada', log: 'Security',
    short: 'Se eliminó una regla del Firewall de Windows.',
    description: 'Se genera cuando se elimina una regla del Firewall. Atacantes pueden eliminar reglas de bloqueo de inbound para habilitar conexiones de C2.',
    detection: [
      { label: 'PowerShell — reglas eliminadas', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4948} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4948' },
    ],
    related: ['4946 (Rule added)', '4947 (Rule modified)', '4950 (Config changed)', '5025 (Service stopped)'],
    analysis: 'Eliminar reglas de bloqueo de Windows Defender u otras reglas de hardening es sospechoso. Verifica el SubjectUserName y la regla eliminada — si era una regla de bloqueo inbound sobre puertos sensibles, IR.',
  },
  {
    id: 4950, name: 'Configuración global de Firewall cambiada', log: 'Security',
    short: 'Se cambió la configuración global del Firewall.',
    description: 'Se genera cuando se cambia la configuración global del Firewall (no reglas específicas — eso son 4946/4947/4948). Incluye SettingValue (p.ej. DefaultInboundAction, EnableFirewall). Atacantes pueden deshabilitar globalmente el firewall.',
    detection: [
      { label: 'PowerShell — config cambiada', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4950} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Ver estado actual', cmd: 'netsh advfirewall show currentprofile' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4950' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 4950" /var/log/syslog' },
    ],
    sigma: `title: Windows Firewall Globally Disabled
id: 0d1e2f3a-4b5c-4d6e-7f8a-9b0c1d2e3f4a
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4950
    Message|contains:
      - 'EnableFirewall'
      - 'False'
  condition: selection
fields:
  - SubjectUserName
  - SettingValue
level: high`,
    related: ['4946 (Rule added)', '4947 (Rule modified)', '4948 (Rule deleted)', '5025 (Service stopped)'],
    analysis: 'Cualquier 4950 cambiando EnableFirewall a False o DefaultInboundAction a Allow es IR. Combinable con 5025 (servicio parado) — si ve ambos, el atacante está desactivando el firewall por completo. Compara con `netsh advfirewall show currentprofile` y la baseline.',
  },
  {
    id: 5025, name: 'Firewall detenido', log: 'Security',
    short: 'El servicio de Firewall de Windows se detuvo.',
    description: 'Se genera cuando se detiene el servicio del Firewall de Windows. Atacantes pueden detenerlo para habilitar conexiones entrantes (C2, exfiltración, lateral movement).',
    detection: [
      { label: 'PowerShell', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=5025} -MaxEvents 50' },
      { label: 'Ver estado actual', cmd: 'Get-Service -Name mpssvc | Format-List Name,Status,StartType' },
    ],
    related: ['5031 (Firewall bloqueó app)', '5024 (Firewall iniciado)'],
    analysis: 'Cualquier 5025 fuera de ventana de mantenimiento es IR. Atacantes detienen firewall para permitir C2. Verifica si coincide con actividad de deploy.',
  },
  {
    id: 5031, name: 'Firewall bloqueó app', log: 'Security',
    short: 'El Firewall bloqueó una aplicación entrante.',
    description: 'Se genera cuando el firewall bloquea una app que intenta escuchar un puerto. Si ve picos, hay apps intentando abrir puertos — puede ser malware intentando abrir C2.',
    detection: [
      { label: 'PowerShell', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=5031} -MaxEvents 50' },
    ],
    related: ['5025 (Firewall detenido)'],
    analysis: 'Una app intentando escuchar puertos es sospechosa. Verifica el path del binario que lo generó.',
  },
  {
    id: 5140, name: 'Recurso compartido de red accedido', log: 'Security',
    short: 'Se accedió a un share de red (ADMIN$, IPC$, C$).',
    description: 'Se genera cuando se accede a un share de red (administrativo o de archivos). Incluye SubjectUserName, ShareName (ADMIN$, IPC$, C$), SharePath y SourceIP. Dispara al listar o usar shares.',
    detection: [
      { label: 'PowerShell — accesos a shares', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=5140} -MaxEvents 100 | Format-List TimeCreated, Message' },
      { label: 'Accesos a ADMIN$', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=5140} | Where-Object {$_.Message -match "ADMIN\\$|C\\$|IPC\\$"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 5140' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 5140" /var/log/syslog' },
    ],
    sigma: `title: Access to Administrative Share from Non-Admin Host
id: 1e2f3a4b-5c6d-4e7f-8a9b-0c1d2e3f4a5b
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 5140
    ShareName|endswith:
      - ADMIN$
      - C$
      - IPC$
  condition: selection
fields:
  - SubjectUserName
  - SourceAddress
  - ShareName
level: medium`,
    related: ['5145 (SMB file access)', '5143 (Share created)', '5144 (Share deleted)', '4624 (Logon exitoso)'],
    analysis: 'Accesos a ADMIN$, C$, IPC$ desde workstations no-admin son sospechosos — usado por PsExec, WMI, lateral movement, Cobalt Strike. Combinable con 4624 logon type 3 para reconstruir ataques laterales. Caza SourceIPs inusuales accediendo a shares admin en horario no laboral.',
  },
  {
    id: 5145, name: 'Acceso a archivo por SMB', log: 'Security',
    short: 'Se accedió a un archivo por SMB (común en ransomware!).',
    description: 'Se genera cuando un cliente accede a un archivo en un share de red (server-side). Incluye SubjectUserName, ShareName, RelativeTargetName, AccessMask y SourceIP. Es el evento por excelencia para detectar ransomware — verás miles en poco tiempo.',
    detection: [
      { label: 'PowerShell — accesos SMB recientes', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=5145} -MaxEvents 100 | Format-List TimeCreated, Message' },
      { label: 'Accesos de escritura masivos', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=5145; StartTime=(Get-Date).AddMinutes(-10)} | Group-Object {$_.Properties[1].Value} | Sort-Object Count -Descending | Select-Object -First 5' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 5145' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 5145" /var/log/syslog' },
    ],
    sigma: `title: Mass SMB File Write - Possible Ransomware Encryption
id: 2f3a4b5c-6d7e-4f8a-9b0c-1d2e3f4a5b6c
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 5145
    AccessMask|contains:
      - '0x2'
      - '0x6'
  timeframe: 1m
  condition: selection | count() by SubjectUserName > 100
fields:
  - SubjectUserName
  - ShareName
  - RelativeTargetName
level: critical`,
    related: ['5140 (Share accessed)', '5143 (Share created)', '4663 (Local file access)', '4688 (Proceso creado)'],
    analysis: 'Picos masivos de 5145 con AccessMask 0x2/0x80 en poco tiempo sobre muchos archivos = ransomware encryption. Caza SubjectUserName que accede a más de N archivos en 5 minutos. AccessMask 0x80 (read attributes) masivo = recon/exfil previo a cifrado. SourceIPs de machines no-server accediendo a file shares = IR.',
  },
  {
    id: 5156, name: 'Conexión WFP permitida', log: 'Security',
    short: 'WFP permitió una conexión de red.',
    description: 'Se genera cuando Windows Filtering Platform permite una conexión de red. Incluye Application (path del exe), Direction (Inbound/Outbound), SourceAddress, DestAddress, SourcePort, DestPort, Protocol. Es muy ruidoso pero útil para ver todas las conexiones.',
    detection: [
      { label: 'PowerShell — conexiones recientes', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=5156} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Conexiones outbound de apps no comunes', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=5156} | Where-Object {$_.Message -match "Application.*\\\\Users\\\\Public|Application.*\\\\AppData"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 5156' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 5156" /var/log/syslog' },
    ],
    related: ['5157 (WFP blocked)', '5154 (WFP allow)', '5155 (WFP block)', '4688 (Proceso creado)'],
    analysis: 'Muy ruidoso — recomendable habilitar solo en hosts específicos de hunting o filtrar en ingest. Útil para ver qué binarios hacen conexiones outbound a IPs raras o puertos no-estándar (4444, 8443). Combinable con 4688 (proceso creado) y 3 (Sysmon network connection) para enrichment.',
  },
  {
    id: 5157, name: 'Conexión WFP bloqueada', log: 'Security',
    short: 'WFP bloqueó una conexión de red.',
    description: 'Se genera cuando Windows Filtering Platform bloquea una conexión de red (inbound o outbound). Incluye Application, Direction, SourceAddress, DestAddress, Protocol. Caza apps que intentan conectarse pero el firewall las bloquea.',
    detection: [
      { label: 'PowerShell — conexiones bloqueadas', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=5157} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Apps sospechosas bloqueadas', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=5157} | Where-Object {$_.Message -match "Application.*\\\\Users\\\\Public|Application.*\\\\Temp"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 5157' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 5157" /var/log/syslog' },
    ],
    sigma: `title: Blocked Outbound Connection from Suspicious Path
id: 3a4b5c6d-7e8f-4a9b-0c1d-2e3f4a5b6c7d
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 5157
    Direction: Outbound
    Application|contains:
      - '\\\\Users\\\\Public\\\\'
      - '\\\\AppData\\\\Local\\\\Temp\\\\'
      - '\\\\AppData\\\\Roaming\\\\'
  condition: selection
fields:
  - Application
  - DestAddress
  - DestPort
level: high`,
    related: ['5156 (WFP allow)', '5031 (App blocked inbound)', '5155 (WFP block)'],
    analysis: 'Apps intentando conectarse a IPs raras (TOR, infraestructura conocida de C2) son IR. Combinable con 4688 para ver qué proceso es. Bins en paths sospechosos (C:\\Users\\Public, %TEMP%, AppData) intentando conexiones outbound = malware intentando reached C2 que el firewall bloqueó.',
  },
  {
    id: 5379, name: 'Remote Credential Provider', log: 'Security',
    short: 'Se llamó al Credential Provider remoto (Credential Manager).',
    description: 'Se genera cuando se accede a credenciales almacenadas (Credential Manager) vía la API. Incluye SubjectUserName, TargetServer, ProcessName. Detecta herramientas que roban credenciales guardadas (p.ej. mimikatz vault::cred, SharpDPAPI).',
    detection: [
      { label: 'PowerShell — accesos a Credential Manager', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=5379} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Procesos no-microsoft', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=5379} | Where-Object {$_.Message -notmatch "svchost|lsass|TaskHost|explorer"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 5379' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 5379" /var/log/syslog' },
    ],
    sigma: `title: Suspicious Credential Manager Access by Non-Microsoft Process
id: 4b5c6d7e-8f9a-4b0c-1d2e-3f4a5b6c7d8e
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 5379
  filter:
    ProcessName|endswith:
      - lsass.exe
      - svchost.exe
      - explorer.exe
      - TaskHost.exe
  condition: selection and not filter
fields:
  - SubjectUserName
  - ProcessName
  - TargetServer
level: high`,
    related: ['4624 (Logon exitoso)', '4625 (Logon fallido)', '4672 (Privilegios especiales)', '4663 (Acceso a objeto)'],
    analysis: 'Accesos a Credential Manager por procesos no-microsoft (p.ej. mimikatz, SharpHound, Rubeus, SharpDPAPI) son IR. Caza ProcessName fuera de known-benignos (lsass, svchost, TaskHost, explorer). En PowerShell, `vault::cred` o `Get-StoredCredential` también disparan. Combinable con 4688 para ver el cmdline completo.',
  },
  {
    id: 6416, name: 'Dispositivo reconocido', log: 'Microsoft-Windows-Kernel-PnP/Configuration',
    short: 'Se reconoció un dispositivo PnP (USB, Mass Storage, etc.).',
    description: 'Se genera cuando Windows reconoce un dispositivo PnP (USB, Mass Storage, teclado, etc.). Incluye DeviceId, DeviceName, Class, VendorIds. Es el evento clave para auditar USBs en DLP y prevenir exfiltración.',
    detection: [
      { label: 'PowerShell — dispositivos reconocidos', cmd: 'Get-WinEvent -LogName "Microsoft-Windows-Kernel-PnP/Configuration" -MaxEvents 50 | Where-Object Id -eq 6416 | Format-List TimeCreated, Message' },
      { label: 'Solo Mass Storage (USB)', cmd: 'Get-WinEvent -LogName "Microsoft-Windows-Kernel-PnP/Configuration" -MaxEvents 200 | Where-Object { $_.Id -eq 6416 -and $_.Message -match "DiskDrive|USB"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Applications and Services Logs → Microsoft → Windows → Kernel-PnP → Configuration → Filter → Event ID 6416' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 6416" /var/log/syslog' },
    ],
    sigma: `title: USB Mass Storage Device Connected
id: 5c6d7e8f-9a0b-4c1d-2e3f-4a5b6c7d8e9f
status: experimental
logsource:
  product: windows
  service: kernel-pnp
detection:
  selection:
    EventID: 6416
    Class: DiskDrive
  condition: selection
fields:
  - SubjectUserName
  - DeviceName
  - DeviceId
level: medium`,
    related: ['6417 (Device install blocked)', '6418 (Device install failed)', '6420 (Device removed)', '4663 (Acceso a objeto)'],
    analysis: 'Dispositivos USB identificados como Mass Storage por usuarios no-autorizados son críticos para DLP. Combinable con 4663/4656 (acceso a archivos) y 5140 (share) para correlacionar exfiltración. Caza VendorIds y ProductIds sospechosos o IDs que no estén en la baseline de la empresa.',
  },
  {
    id: 6417, name: 'Instalación de dispositivo bloqueada', log: 'Microsoft-Windows-Kernel-PnP/Configuration',
    short: 'Se bloqueó la instalación de un dispositivo.',
    description: 'Se genera cuando Windows bloquea la instalación de un dispositivo por policies de Device Installation. Incluye DeviceId, DeviceName. Política común de hardening para bloquear USBs no autorizados.',
    detection: [
      { label: 'PowerShell — dispositivos bloqueados', cmd: 'Get-WinEvent -LogName "Microsoft-Windows-Kernel-PnP/Configuration" -MaxEvents 50 | Where-Object Id -eq 6417 | Format-List TimeCreated, Message' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Applications and Services Logs → Microsoft → Windows → Kernel-PnP → Configuration → Filter → Event ID 6417' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 6417" /var/log/syslog' },
    ],
    related: ['6416 (Device recognized)', '6418 (Device install failed)', '4826 (Driver bloqueado)'],
    analysis: 'Combinable con 6416. Si ve picos de 6417, hay un usuario intentando conectar dispositivos no permitidos (policy enforced). Verifica con IT y el usuario — si es persistente en horario no laboral, sospechoso.',
  },
  {
    id: 7036, name: 'Servicio iniciado/detenido', log: 'System',
    short: 'Un servicio cambió de estado (started/stopped).',
    description: 'Se genera en el log System cuando un servicio cambia de estado (started o stopped). Incluye ServiceName, State. Muy ruidoso — miles de eventos por día en hosts normales.',
    detection: [
      { label: 'PowerShell — estado de servicios', cmd: 'Get-WinEvent -FilterHashtable @{LogName="System"; Id=7036} -MaxEvents 100 | Format-List TimeCreated, Message' },
      { label: 'Defender/Sense stopped', cmd: 'Get-WinEvent -FilterHashtable @{LogName="System"; Id=7036} | Where-Object {$_.Message -match "WinDefend|Sense|MsMpEng" -and $_.Message -match "stopped"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → System → Filter → Event ID 7036' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 7036" /var/log/syslog' },
    ],
    sigma: `title: Windows Defender Service Stopped
id: 6d7e8f9a-0b1c-4d2e-3f4a-5b6c7d8e9f0a
status: experimental
logsource:
  product: windows
  service: system
detection:
  selection:
    EventID: 7036
    ServiceName|contains:
      - WinDefend
      - Sense
      - MsMpEng
    State: stopped
  condition: selection
fields:
  - ServiceName
  - State
level: high`,
    related: ['7040 (Start type changed)', '7045 (Service installed)', '4697 (Service installed Security)', '5025 (Firewall stopped)'],
    analysis: 'Caza paradas de servicios de AV/EDR/Defender. ServiceName "WinDefend" o "Sense" (Defender for Endpoint) con State "stopped" = IR. También útil para ver qué servicios se detuvieron justo antes de actividad sospechosa (cuenta atrás de parada del servicio de AV antes de ejecutar payload).',
  },
  {
    id: 7040, name: 'Tipo de inicio de servicio cambiado', log: 'System',
    short: 'Se cambió el tipo de inicio de un servicio (Auto/Manual/Disabled).',
    description: 'Se genera cuando se cambia el start type de un servicio. Incluye ServiceName, StartType (auto, manual, disabled), OldStartType. Atacantes pueden cambiar servicios de AV/EDR de Auto a Disabled para persistir la desactivación.',
    detection: [
      { label: 'PowerShell — cambios de start type', cmd: 'Get-WinEvent -FilterHashtable @{LogName="System"; Id=7040} -MaxEvents 100 | Format-List TimeCreated, Message' },
      { label: 'Servicios AV/EDR deshabilitados', cmd: 'Get-WinEvent -FilterHashtable @{LogName="System"; Id=7040} | Where-Object {$_.Message -match "WinDefend|Sense|MsMpEng|Defender" -and $_.Message -match "disabled"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → System → Filter → Event ID 7040' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 7040" /var/log/syslog' },
    ],
    sigma: `title: AV/EDR Service Disabled via Service Start Type Change
id: 7e8f9a0b-1c2d-4e3f-4a5b-6c7d8e9f0a1b
status: experimental
logsource:
  product: windows
  service: system
detection:
  selection:
    EventID: 7040
    ServiceName|contains:
      - WinDefend
      - Sense
      - MsMpEng
      - Defender
    StartType: disabled
  condition: selection
fields:
  - ServiceName
  - StartType
  - OldStartType
level: critical`,
    related: ['7036 (Service start/stop)', '7045 (Service installed)', '4697 (Service installed Security)', '5025 (Firewall stopped)'],
    analysis: 'Servicios de AV/EDR/Defender (WinDefend, Sense) cambiados a Disabled = IR inmediato. Combinable con 5025 (Firewall stopped) y 4719 (Audit policy changed) — los tres juntos indican desactivación de seguridad por el atacante. Caza ServiceName con Defender, EDR, Antivirus, AV.',
  },
  {
    id: 7045, name: 'Servicio instalado (System log)', log: 'System',
    short: 'Se instaló un servicio (persistencia).',
    description: 'Se genera en el log System cuando se instala o crea un servicio. Incluye ServiceName, ServiceType, StartType (Auto, Manual), ServiceAccount (LocalSystem, etc.) y BinaryPathName. Es la alternativa al 4697 (Security log) — muchos entornos no habilitan 4697.',
    detection: [
      { label: 'PowerShell — servicios nuevos', cmd: 'Get-WinEvent -FilterHashtable @{LogName="System"; Id=7045} -MaxEvents 100 | Format-List TimeCreated, Message' },
      { label: 'Servicios con StartType Auto y LocalSystem', cmd: 'Get-WinEvent -FilterHashtable @{LogName="System"; Id=7045} | Where-Object {$_.Message -match "Auto" -and $_.Message -match "LocalSystem"}' },
      { label: 'Servicios con paths sospechosos', cmd: 'Get-WinEvent -FilterHashtable @{LogName="System"; Id=7045} | Where-Object {$_.Message -match "\\\\Users\\\\Public|\\\\AppData\\\\Temp|powershell.*-enc|rundll32|mshta"}' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → System → Filter → Event ID 7045' },
    ],
    sigma: `title: Suspicious Service Installation - Suspicious Binary Path
id: 8f9a0b1c-2d3e-4f4a-5b6c-7d8e9f0a1b2c
status: experimental
logsource:
  product: windows
  service: system
detection:
  selection:
    EventID: 7045
  suspicious_path:
    BinaryPathName|contains:
      - '\\\\Users\\\\Public\\\\'
      - '\\\\AppData\\\\Local\\\\Temp\\\\'
      - '\\\\AppData\\\\Roaming\\\\'
      - 'powershell'
      - 'rundll32'
      - 'mshta'
      - 'certutil'
  condition: selection and suspicious_path
fields:
  - ServiceName
  - BinaryPathName
  - ServiceAccount
level: critical`,
    related: ['4697 (Service installed Security)', '7036 (Service start/stop)', '7040 (Start type changed)', '4688 (Proceso creado)'],
    analysis: 'Persistencia por excelencia — la regla Sigma de SCYTHE/SigmaHQ más famosa. Caza BinaryPathName con paths sospechosos (%COMSPEC%, C:\\Users\\Public, %TEMP%, AppData), con PowerShell -enc, con rundll32 con URL, con mshta. Servicios nuevos con StartType Auto y ServiceAccount LocalSystem son altamente sospechosos. Si ves 7045 sobre un host seguido de 7036 started → IR.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1543.003', 'T1547.001', 'T1059.001'],
    sigmaId: 'sigma-new-service-7045',
    kql: 'DeviceEvents\n| where ActionType == "ServiceInstalled"\n| where AdditionalFields has_any ("\\\\Users\\\\Public", "\\\\AppData\\\\Temp", "powershell", "-enc", "rundll32", "mshta", "certutil", "bitsadmin")\n| project TimeGenerated, DeviceName, ServiceName, AccountName, AdditionalFields',
    spl: 'index=windows EventCode=7045 (ImagePath=*Users*Public* OR ImagePath=*AppData*Temp* OR ImagePath=*powershell* OR ImagePath=*-enc* OR ImagePath=*rundll32* OR ImagePath=*mshta* OR ImagePath=*certutil* OR ImagePath=*bitsadmin*) | table _time, host, ServiceName, ImagePath, user, ServiceType',
    threatHuntingNotes: 'Hunt 1: BinaryPathName con %TEMP%, %APPDATA%, \\Users\\Public — ubicaciones no estándar. Hunt 2: ServiceName aleatorio o typos (svc_host vs svchost). Hunt 3: StartType=Auto + ServiceAccount=LocalSystem = alta probabilidad de persistencia. Hunt 4: correlaciona con 4688 previo — el proceso que creó el servicio.',
    relevantFields: ['EventID', 'ServiceName', 'ServiceFileName', 'ServiceType', 'ServiceStartType', 'ServiceAccount', 'AccountName'],
    detectionTips: 'Whitelista ImagePaths que empiecen con C:\\Windows\\ o C:\\Program Files\\ — son la mayoría de servicios legítimos. SIEM: parsea el campo ImagePath (servicios pueden tener arguments) y extrae solo el binario. Foco en LocalSystem + Auto.',
    relatedEventIds: [4697, 7036, 7040, 4688],
  },
];
