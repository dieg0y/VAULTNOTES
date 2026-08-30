/**
 * winEventsData.ts — Dataset expandido de Windows Event IDs para la herramienta "Windows Event IDs" de VaultNotes.
 *
 * Contiene ~93 event IDs (los 21 originales del ToolsView.tsx + 38 prioritarios + 34 de alto valor para hunting:
 * Sysmon completos 1/3/7/8/10/11/12/13/14/22/25, anti-forensics 104/1102/4616, Active Directory 4662/4741/4794/5136/5141,
 * grupos 4723/4727/4731/4735/4756/4799, RDP 4778/4779, shares/puertos 5142/5154, credenciales 5382 y NPS 6273),
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
  // Process (incluye Sysmon 1/3/7/8/10/11/25 — process create, red, DLL, inyección, LSASS, archivo, tampering)
  if (id === 4688 || id === 4689 || id === 1 || id === 2 || id === 3 || id === 5 || id === 7 || id === 8 || id === 10 || id === 11 || id === 25) return 'Process';
  // Persistence
  if (id === 4697 || id === 7045 || id === 4698 || id === 4702 || id === 4699 || id === 4700 || id === 4701 || id === 12 || id === 13 || id === 14 || id === 4611) return 'Persistence';
  // Privilege
  if (id === 4672 || id === 4673 || id === 4674 || id === 5136 || id === 5141) return 'Privilege';
  // Account (incluye auth events centrados en cuenta)
  if (id === 4720 || id === 4722 || id === 4724 || id === 4726 || id === 4728 || id === 4732 || id === 4738 || id === 4740 || id === 4768 || id === 4769 || id === 4776 || id === 4723 || id === 4727 || id === 4731 || id === 4735 || id === 4741 || id === 4756 || id === 4794 || id === 4799) return 'Account';
  // Network
  if (id === 5140 || id === 5145 || id === 5156 || id === 5157 || id === 5152 || id === 5154 || id === 5155 || id === 22 || id === 5142) return 'Network';
  // Defense Evasion
  if (id === 1102 || id === 104 || id === 4657 || id === 4660 || id === 4663 || id === 4662 || id === 4616) return 'Defense Evasion';
  // Authentication (default — 4624, 4625, 4634, 4648, 4771, etc.)
  return 'Authentication';
}

export const WIN_EVENTS: WinEventInfo[] = [
  {
    id: 1, name: 'Process Create', log: 'Microsoft-Windows-Sysmon/Operational',
    short: 'Sysmon: se creó un proceso nuevo (el rey del threat hunting).',
    description: 'Sysmon lo genera cada vez que un proceso crea otro. Registra Image (ruta del binario nuevo), CommandLine completo, ParentImage y ParentCommandLine (quién lo lanzó y con qué argumentos), User, IntegrityLevel, CurrentDirectory, TerminalSessionId, Hashes (MD5/SHA1/SHA256/IMPHASH), OriginalFileName y los metadatos del PE (Company, Product, FileVersion). El ProcessGuid y el ParentProcessGuid permiten reconstruir el árbol genealógico completo y pivotar a los eventos Sysmon 3, 7, 8, 10, 11 y 13 del mismo proceso. Requiere Sysmon desplegado con una config tipo SwiftOnSecurity u olaf hartong (servicio Sysmon64). Es el equivalente mejorado del 4688: línea de comandos SIEMPRE presente, hashes y GUIDs correlacionables.',
    detection: [
      { label: 'PowerShell — últimos procesos creados', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=1} -MaxEvents 100 | Format-List TimeCreated, Message" },
      { label: 'Cazar LoLBins y encoded commands', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=1} | Where-Object {$_.Message -match 'certutil|mshta|rundll32|bitsadmin|-enc |-EncodedCommand'} | Select-Object TimeCreated, Message -First 30" },
      { label: 'wevtutil — CLI nativa', cmd: 'wevtutil qe Microsoft-Windows-Sysmon/Operational /q:"*[System[(EventID=1)]]" /c:20 /rd:true /f:text' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Applications and Services Logs → Microsoft → Windows → Sysmon → Operational → Filter → Event ID 1' },
    ],
    sigma: `title: Sysmon Suspicious Process Creation - LOLBIN or Encoded Command
id: aa1e2d3c-4b5a-4e6f-8a7b-9c0d1e2f3a4b
status: experimental
logsource:
  product: windows
  service: sysmon
detection:
  selection:
    EventID: 1
    Image|endswith:
      - '\\certutil.exe'
      - '\\mshta.exe'
      - '\\bitsadmin.exe'
    CommandLine|contains:
      - '-enc'
      - '-EncodedCommand'
      - 'FromBase64String'
  condition: selection
fields:
  - Image
  - CommandLine
  - ParentImage
  - Hashes
level: high`,
    related: ['4688 (Proceso creado — Security log)', '3 (Sysmon — conexión de red)', '7 (Sysmon — DLL cargada)', '25 (Sysmon — process tampering)'],
    analysis: 'Es el pivote central de casi toda investigación: del EID 1 sales al árbol completo vía ProcessGuid/ParentProcessGuid y de ahí a red (EID 3), DLLs (EID 7), inyección (EID 8), LSASS (EID 10), archivos (EID 11) y registro (EID 12/13). Baseline: miles de procesos diarios de Office, navegadores, updaters e instaladores. Señal de ataque: padres que no deberían tener hijos (winword/outlook/excel → cmd/powershell/rundll32 = macro o exploit de documento), CommandLine con -enc, -w hidden, IEX o FromBase64String, Image en %TEMP% o C:\\Users\\Public, IMPHASH de tooling ofensivo conocida (mimikatz, Rubeus, SharpHound), OriginalFileName que no coincide con el nombre del binario (renombrado para evadir allowlisting), rundll32.exe sin argumentos (firma clásica de Cobalt Strike) e IntegrityLevel System para binarios lanzados por un usuario.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1059', 'T1059.001', 'T1059.003', 'T1027', 'T1204.002'],
    kql: 'DeviceProcessEvents\n| where InitiatingProcessFileName in~ ("winword.exe", "excel.exe", "outlook.exe", "powerpnt.exe")\n| where ProcessCommandLine has_any ("-enc", "-EncodedCommand", "IEX", "FromBase64String", "certutil", "mshta", "bitsadmin", "rundll32")\n| project TimeGenerated, DeviceName, AccountName, FileName, FolderPath, ProcessCommandLine, InitiatingProcessFileName, InitiatingProcessCommandLine, SHA256',
    spl: 'index=windows sourcetype="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=1 (CommandLine="*-enc*" OR CommandLine="*IEX*" OR CommandLine="*FromBase64String*" OR Image="*\\Users\\Public\\*" OR Image="*\\AppData\\*") (ParentImage="*winword.exe" OR ParentImage="*excel.exe" OR ParentImage="*outlook.exe" OR ParentImage="*powerpnt.exe") | table _time, host, Image, CommandLine, ParentImage, ParentCommandLine, User, Hashes',
    threatHuntingNotes: 'Hunt 1: aplicaciones de Office como padre de cmd/powershell/rundll32 = macro maliciosa o exploit de documento. Hunt 2: Image en %TEMP%, %APPDATA% o C:\\Users\\Public — el 90% del malware dropea ahí. Hunt 3: IMPHASH contra lista de tooling ofensiva (mimikatz/Rubeus/SharpHound recompilados clusterizan por IMPHASH). Hunt 4: OriginalFileName distinto del nombre del archivo = binario renombrado (p.ej. ps.exe con OriginalFileName PowerShell.EXE). Hunt 5: pivota por ProcessGuid a sus eventos 3/22 para reconstruir el C2 completo del proceso.',
    relevantFields: ['EventID', 'UtcTime', 'ProcessGuid', 'ProcessId', 'Image', 'CommandLine', 'CurrentDirectory', 'User', 'IntegrityLevel', 'Hashes', 'OriginalFileName', 'ParentProcessGuid', 'ParentImage', 'ParentCommandLine'],
    detectionTips: 'Volumen altísimo (miles/día por host): no lo ingieres crudo sin filtrar — recorta los procesos legítimos ruidosos (updaters de Chrome/OneDrive, telemetría) en la config de Sysmon o en el pipeline del SIEM. El IMPHASH es la mejor clave para clustering de tooling. Correlaciona SIEMPRE con el EID 3 del mismo ProcessGuid: proceso sin red previa + conexión outbound nueva = implant.',
    relatedEventIds: [4688, 3, 7, 8, 10, 11, 13, 22, 25],
  },
  {
    id: 3, name: 'Network Connection', log: 'Microsoft-Windows-Sysmon/Operational',
    short: 'Sysmon: un proceso inició o aceptó una conexión de red.',
    description: 'Sysmon lo genera cuando un proceso establece una conexión (Initiated=true) o acepta una entrante. Registra Image (el binario que se conecta), User, Protocol (tcp/udp), Initiated, SourceIp/SourceHostname/SourcePort y DestinationIp/DestinationHostname/DestinationPort/DestinationPortName (p.ej. https, smb). Es la fuente canónica para mapear C2 y exfiltración: qué binario habló, con qué IP/puerto y a qué hora. Correlaciona el ProcessGuid con el EID 1 (línea de comandos del proceso) y con el EID 22 inmediatamente anterior (la query DNS que resolvió ese destino).',
    detection: [
      { label: 'PowerShell — conexiones recientes', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=3} -MaxEvents 100 | Format-List TimeCreated, Message" },
      { label: 'Binarios sospechosos con salida a red', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=3} | Where-Object {$_.Message -match 'rundll32|regsvr32|mshta|dllhost|notepad'} | Select-Object TimeCreated, Message -First 30" },
      { label: 'XPath — conexiones a puerto 4444', cmd: "Get-WinEvent -LogName 'Microsoft-Windows-Sysmon/Operational' -FilterXPath '*[System[EventID=3] and EventData[Data[@Name=\"DestinationPort\"]=\"4444\"]]' -MaxEvents 20" },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Applications and Services Logs → Microsoft → Windows → Sysmon → Operational → Filter → Event ID 3' },
    ],
    sigma: `title: Sysmon Network Connection by Suspicious Binary
id: bb2e3d4c-5c6b-4f7a-9b8c-0d1e2f3a4b5c
status: experimental
logsource:
  product: windows
  service: sysmon
detection:
  selection:
    EventID: 3
    Image|endswith:
      - '\\rundll32.exe'
      - '\\regsvr32.exe'
      - '\\mshta.exe'
      - '\\dllhost.exe'
      - '\\notepad.exe'
    Initiated: 'true'
  condition: selection
fields:
  - Image
  - DestinationIp
  - DestinationPort
  - User
level: high`,
    related: ['1 (Sysmon — proceso creado)', '22 (Sysmon — DNS query)', '5156 (WFP permitida — Security)', '5157 (WFP bloqueada)'],
    analysis: 'Baseline: navegadores, agentes de actualización, telemetría y herramientas IT conectándose a destinos corporativos/CDN por 443/80 — construye un top-N de destinos por binario y quédate con los outliers. Anomalía: binarios que no deberían tener red (rundll32.exe, regsvr32.exe, dllhost.exe, notepad.exe) iniciando conexiones; puertos no estándar (4444, 8443, 1337, 9999 — defaults de Metasploit y Cobalt Strike); conexiones directas a IP sin DNS previo (C2 hardcodeado, típico de CS con IP en el listener); y beaconing — la misma dupla IP:puerto cada N segundos, visible con análisis de delta-time en el SIEM. Cobalt Strike clásico: rundll32.exe con Initiated=true hacia 443/8080 inmediatamente tras un EID 1 de rundll32 sin argumentos.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1071', 'T1071.001', 'T1041', 'T1095'],
    kql: 'DeviceNetworkEvents\n| where InitiatingProcessFileName in~ ("rundll32.exe", "regsvr32.exe", "mshta.exe", "dllhost.exe", "notepad.exe")\n| project TimeGenerated, DeviceName, InitiatingProcessFileName, InitiatingProcessCommandLine, RemoteIP, RemotePort, RemoteUrl\n| where RemotePort !in (53, 80, 443, 135, 445) or InitiatingProcessFileName in~ ("rundll32.exe", "mshta.exe")',
    spl: 'index=windows sourcetype="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=3 (Image="*\\rundll32.exe" OR Image="*\\regsvr32.exe" OR Image="*\\mshta.exe" OR DestinationPort=4444 OR DestinationPort=8443 OR DestinationPort=9999) | table _time, host, Image, DestinationIp, DestinationPort, DestinationHostname, Initiated, User',
    threatHuntingNotes: 'Hunt 1: conexiones iniciadas por binarios sin negocio de red (rundll32, regsvr32, dllhost, notepad) = inyección o LOLBin. Hunt 2: destinos IP directos sin query DNS previa (EID 22) — el C2 está hardcodeado. Hunt 3: beaconing por delta-time: agrupa por Image+DestinationIp+DestinationPort y calcula la desviación del intervalo — los beacons de CS son regulares. Hunt 4: destinos en puertos 4444/8443/1337/9999 (defaults de Metasploit/Cobalt Strike). Hunt 5: procesos recién creados (EID 1 < 60s antes) que conectan a IP con mala reputación = implant recién plantado.',
    relevantFields: ['EventID', 'UtcTime', 'ProcessGuid', 'ProcessId', 'Image', 'User', 'Protocol', 'Initiated', 'SourceIp', 'SourcePort', 'DestinationIp', 'DestinationHostname', 'DestinationPort', 'DestinationPortName'],
    detectionTips: 'Volumen brutal (decenas de miles/día): filtra en la config de Sysmon los binarios legítimos ruidosos y los destinos corporativos conocidos ANTES de enviar al SIEM, o la ingest se dispara. Initiated distingue cliente (true) de servidor (false) — caza casi siempre Initiated=true en binarios de usuario. Enriquece con Threat Intel la DestinationIp en el pipeline.',
    relatedEventIds: [1, 22, 5156, 5157],
  },
  {
    id: 7, name: 'Image Loaded', log: 'Microsoft-Windows-Sysmon/Operational',
    short: 'Sysmon: un proceso cargó una DLL (side-loading y hijacking).',
    description: 'Sysmon lo genera cuando un proceso mapea una DLL. Registra Image (el proceso que carga), ImageLoaded (la DLL), FileVersion, Description, Product, Company, Hashes, Signed, Signature y SignatureStatus. Loguear TODAS las DLLs genera GBs diarios — las configs tipo SwiftOnSecurity/olaf hartong filtran: solo DLLs sin firma, en rutas de usuario o nombres de secuestro frecuentes. Es EL evento para detectar DLL side-loading, search order hijacking y DLLs maliciosas corriendo dentro de procesos legítimos firmados.',
    detection: [
      { label: 'PowerShell — DLLs cargadas recientes', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=7} -MaxEvents 100 | Format-List TimeCreated, Message" },
      { label: 'DLLs sin firma o en rutas de usuario', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=7} | Where-Object {$_.Message -match 'Signed:\s+false|Users\\\\Public|AppData'} | Select-Object TimeCreated, Message -First 30" },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Applications and Services Logs → Microsoft → Windows → Sysmon → Operational → Filter → Event ID 7' },
    ],
    sigma: `title: Sysmon Suspicious DLL Loaded from User-Writable Path
id: cc3e4d5c-6d7b-4a8b-0c9d-1e2f3a4b5c6d
status: experimental
logsource:
  product: windows
  service: sysmon
detection:
  selection:
    EventID: 7
    ImageLoaded|contains:
      - '\\AppData\\'
      - '\\Users\\Public\\'
      - '\\ProgramData\\'
      - '\\Temp\\'
  filter_signed:
    Signed: 'true'
  condition: selection and not filter_signed
fields:
  - Image
  - ImageLoaded
  - Hashes
  - Signature
level: high`,
    related: ['1 (Sysmon — proceso creado)', '3 (Sysmon — conexión de red)', '11 (Sysmon — archivo creado)', '4688 (Proceso creado)'],
    analysis: 'Baseline: miles de cargas de DLLs firmadas de Microsoft desde System32 — por eso la config solo loguea lo raro. Anomalía: ImageLoaded en rutas escribibles por el usuario (%APPDATA%, %TEMP%, C:\\Users\\Public, C:\\ProgramData); DLLs sin firma cargadas por svchost.exe, services.exe o lsass.exe (inyección directa); version.dll, winmm.dll, dbghelp.dll, msvcp120.dll o d3d11.dll cargadas DESDE EL DIRECTORIO del ejecutable legítimo — la firma del side-loading usada por APT41, loaders de Cobalt Strike y gamemalware; y firma inválida o revocada (SignatureStatus). Caza la tríada temporal: EID 1 (proceso) → EID 7 (DLL rara cargada) → EID 3 (conexión posterior).',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1574.002', 'T1574.001', 'T1574'],
    kql: 'DeviceImageLoadEvents\n| where FileName in~ ("version.dll", "winmm.dll", "dbghelp.dll", "msvcp120.dll", "d3d11.dll")\n| where FolderPath !startswith "C:\\Windows\\" and FolderPath !startswith "C:\\Program Files\\" and FolderPath !startswith "C:\\Program Files (x86)\\"\n| project TimeGenerated, DeviceName, FileName, FolderPath, SHA256, InitiatingProcessFileName, InitiatingProcessCommandLine',
    spl: 'index=windows sourcetype="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=7 (ImageLoaded="*\\AppData\\*" OR ImageLoaded="*\\Users\\Public\\*" OR ImageLoaded="*\\ProgramData\\*" OR ImageLoaded="*\\Temp\\*") (Image="*\\svchost.exe" OR Image="*\\services.exe" OR Image="*\\lsass.exe" OR Image="*\\explorer.exe") | table _time, host, Image, ImageLoaded, Signed, Signature, Hashes',
    threatHuntingNotes: 'Hunt 1: version.dll/winmm.dll/dbghelp.dll cargadas junto al EXE de una app legítima (mismo directorio) = DLL side-loading casi seguro. Hunt 2: DLLs cargadas por procesos SYSTEM (svchost/services/lsass) desde rutas de usuario = inyección. Hunt 3: clusterea ImageLoaded por Company/Description vacío o sospechoso — la tooling ofensiva mal firmada se delata en los metadatos. Hunt 4: DLLs cuya primera aparición en el fleet es HOY (baseline por hash). Hunt 5: correlaciona con EID 11 — si la DLL fue creada minutos antes por powershell.exe, tienes el dropper.',
    relevantFields: ['EventID', 'UtcTime', 'ProcessGuid', 'ProcessId', 'Image', 'ImageLoaded', 'FileVersion', 'Description', 'Company', 'Hashes', 'Signed', 'Signature', 'SignatureStatus'],
    detectionTips: 'NO actives el EID 7 sin filtro (todas las DLLs) salvo en hosts de investigación — la config de SwiftOnSecurity ya excluye Microsoft-signed y System32. Los hashes de ImageLoaded permiten retro-hunting: guarda histórico y matchea contra IOCs de reportes cuando lleguen. Si el SIEM lo permite, enruta este canal a un índice de bajo coste (tiering).',
    relatedEventIds: [1, 3, 11, 4688],
  },
  {
    id: 8, name: 'CreateRemoteThread', log: 'Microsoft-Windows-Sysmon/Operational',
    short: 'Sysmon: un proceso creó un thread en otro proceso (inyección).',
    description: 'Sysmon lo genera cuando un proceso crea un hilo de ejecución en OTRO proceso vía CreateRemoteThread(Ex) — la primitiva clásica de la inyección. Registra SourceProcessGuid/SourceImage/SourceProcessId, TargetProcessGuid/TargetImage/TargetProcessId, NewThreadId, StartAddress, StartModule y StartFunction. StartModule vacío con StartAddress en memoria no mapeada = shellcode inyectado (Cobalt Strike inject, mimikatz inject, meterpreter migrate). La config de Sysmon permite excluir pares legítimos conocidos.',
    detection: [
      { label: 'PowerShell — remote threads recientes', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=8} -MaxEvents 100 | Format-List TimeCreated, Message" },
      { label: 'Inyección hacia procesos críticos', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=8} | Where-Object {$_.Message -match 'TargetImage: .*lsass|TargetImage: .*svchost|TargetImage: .*explorer'} | Select-Object TimeCreated, Message -First 30" },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Applications and Services Logs → Microsoft → Windows → Sysmon → Operational → Filter → Event ID 8' },
    ],
    sigma: `title: Sysmon CreateRemoteThread into Critical Process
id: dd4e5d6c-7e8b-4b9c-1d0e-2f3a4b5c6d7e
status: experimental
logsource:
  product: windows
  service: sysmon
detection:
  selection:
    EventID: 8
    TargetImage|endswith:
      - '\\lsass.exe'
      - '\\svchost.exe'
      - '\\explorer.exe'
      - '\\winlogon.exe'
  filter_source:
    SourceImage|endswith:
      - '\\MsMpEng.exe'
      - '\\svchost.exe'
  condition: selection and not filter_source
fields:
  - SourceImage
  - TargetImage
  - StartModule
  - StartFunction
level: critical`,
    related: ['10 (Sysmon — ProcessAccess/LSASS)', '1 (Sysmon — proceso creado)', '7 (Sysmon — DLL cargada)', '25 (Sysmon — process tampering)'],
    analysis: 'Baseline: casi nulo — solo algunos AV/EDR, herramientas de debugging y ciertos updaters inyectan legítimamente (construye allowlist de esos pares SourceImage→TargetImage). Cualquier CreateRemoteThread de un binario de usuario hacia lsass.exe, svchost.exe, winlogon.exe o explorer.exe es IR: es la firma de process injection (T1055) usada por Cobalt Strike (inject/shinject), mimikatz (inject + sekurlsa), meterpreter (migrate) y RATs. StartModule vacío = shellcode en memoria sin módulo; StartModule con DLL sospechosa = inyección clásica de DLL. Correlaciona con EID 10 sobre el mismo TargetProcessGuid: inyección + acceso a LSASS = credential dumping en cadena.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1055', 'T1055.001', 'T1055.003'],
    kql: 'DeviceEvents\n| where ActionType == "CreateRemoteThreadApiCall"\n| where InitiatingProcessFileName in~ ("powershell.exe", "rundll32.exe", "regsvr32.exe", "cmd.exe", "cscript.exe")\n| project TimeGenerated, DeviceName, InitiatingProcessFileName, InitiatingProcessCommandLine, FileName, ProcessCommandLine, AdditionalFields',
    spl: 'index=windows sourcetype="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=8 (TargetImage="*\\lsass.exe" OR TargetImage="*\\svchost.exe" OR TargetImage="*\\explorer.exe" OR TargetImage="*\\winlogon.exe") NOT (SourceImage="*\\MsMpEng.exe") | table _time, host, SourceImage, TargetImage, StartAddress, StartModule, StartFunction',
    threatHuntingNotes: 'Hunt 1: cualquier EID 8 con TargetImage=lsass.exe — no hay razón legítima fuera del EDR. Hunt 2: StartModule vacío + StartAddress fuera de módulos conocidos = shellcode (CS/meterpreter). Hunt 3: SourceImage = powershell.exe o rundll32.exe inyectando en explorer.exe/svchost.exe = post-explotación activa. Hunt 4: clusterea SourceImage por hash del EID 1 — la tooling reutiliza el mismo binario inyector. Hunt 5: tras un EID 8, monitoriza los EID 3 del TargetProcessGuid — el proceso legítimo ahora hace C2.',
    relevantFields: ['EventID', 'UtcTime', 'SourceProcessGuid', 'SourceProcessId', 'SourceImage', 'TargetProcessGuid', 'TargetProcessId', 'TargetImage', 'NewThreadId', 'StartAddress', 'StartModule', 'StartFunction'],
    detectionTips: 'Volumen bajo si filtras los pares EDR/legítimos — de los mejores ratio señal/ruido de Sysmon. Alerta SIEM directa para TargetImage en (lsass.exe, winlogon.exe, csrss.exe). Si el SourceImage ya no existe como proceso vivo, inyectó desde un proceso efímero o holloweado — prioridad máxima.',
    relatedEventIds: [10, 1, 7, 25, 4688],
  },
  {
    id: 10, name: 'ProcessAccess (LSASS dump)', log: 'Microsoft-Windows-Sysmon/Operational',
    short: 'Sysmon: un proceso abrió un handle de otro proceso — LA firma del dump de LSASS.',
    description: 'Sysmon lo genera cuando un proceso solicita un handle con derechos de acceso sobre otro proceso (OpenProcess). Registra SourceImage/SourceProcessGuid, TargetImage/TargetProcessGuid, GrantedAccess (bitmask), SourceThreadId y CallTrace (el stack de llamadas — oro para ver DLLs inyectadas). Es EL evento para detectar credential dumping: mimikatz sekurlsa::logonpasswords abre lsass.exe con GrantedAccess 0x1010, el MiniDump de comsvcs.dll usa 0x1F1FFF, procdump 0x1410 y nanodump 0x143a. Requiere la config de Sysmon con el ProcessAccess sobre lsass habilitado (viene por defecto en SwiftOnSecurity y olaf hartong).',
    detection: [
      { label: 'PowerShell — accesos a LSASS', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=10} -MaxEvents 200 | Where-Object {$_.Message -match 'TargetImage: .*lsass'} | Format-List TimeCreated, Message" },
      { label: 'Solo GrantedAccess típicos de dump', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=10} | Where-Object {$_.Message -match 'GrantedAccess: 0x1010|GrantedAccess: 0x1f1fff|GrantedAccess: 0x1410'} | Select-Object TimeCreated, Message -First 30" },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Applications and Services Logs → Microsoft → Windows → Sysmon → Operational → Filter → Event ID 10' },
    ],
    sigma: `title: Sysmon LSASS Access from Non-EDR Process
id: ee5e6d7c-8f9b-4c0d-2e1f-3a4b5c6d7e8f
status: experimental
logsource:
  product: windows
  service: sysmon
detection:
  selection:
    EventID: 10
    TargetImage|endswith: '\\lsass.exe'
    GrantedAccess:
      - '0x1010'
      - '0x1410'
      - '0x1f1fff'
      - '0x143a'
  filter:
    SourceImage|endswith:
      - '\\MsMpEng.exe'
      - '\\NisSrv.exe'
      - '\\svchost.exe'
  condition: selection and not filter
fields:
  - SourceImage
  - GrantedAccess
  - CallTrace
level: critical`,
    related: ['8 (Sysmon — CreateRemoteThread)', '1 (Sysmon — proceso creado)', '4656 (Handle a objeto — Security)', '5379 (Credential Manager accedido)'],
    analysis: 'Baseline: los motores AV/EDR (MsMpEng.exe, NisSrv.exe) acceden a LSASS constantemente — allowlístalos; taskmgr.exe y procdump.exe con 0x1410 suelen ser un admin haciendo troubleshooting (verifica si hubo ticket). Anomalía IR: cualquier SourceImage no-Microsoft con TargetImage=lsass.exe y GrantedAccess de lectura de memoria — 0x1010 es mimikatz sekurlsa::logonpasswords, 0x1F1FFF es el MiniDump de comsvcs.dll (lo invoca rundll32.exe tras un rundll32 comsvcs.dll MiniDump <pid> dump.bin full), 0x143a es nanodump y 0x1410 procdump. Tras el dump, la tooling suele leer el archivo creado (EID 11) o enviarlo por red (EID 3) — sigue el ProcessGuid. Este evento es la detección #1 de credential dumping en endpoints con Sysmon.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1003.001', 'T1003'],
    kql: 'DeviceEvents\n| where ActionType == "ReadProcessMemoryApiCall"\n| where FileName =~ "lsass.exe"\n| where InitiatingProcessFileName !in~ ("MsMpEng.exe", "NisSrv.exe")\n| project TimeGenerated, DeviceName, InitiatingProcessFileName, InitiatingProcessCommandLine, FileName, AdditionalFields',
    spl: 'index=windows sourcetype="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=10 TargetImage="*\\lsass.exe" (GrantedAccess="0x1010" OR GrantedAccess="0x1410" OR GrantedAccess="0x1f1fff" OR GrantedAccess="0x143a") NOT (SourceImage="*\\MsMpEng.exe" OR SourceImage="*\\NisSrv.exe") | table _time, host, SourceImage, SourceProcessGuid, GrantedAccess, CallTrace',
    threatHuntingNotes: 'Hunt 1: EID 10 con TargetImage=lsass.exe + GrantedAccess 0x1010/0x1410/0x1F1FFF/0x143a desde binarios no-EDR = credential dumping. Hunt 2: SourceImage=rundll32.exe hacia lsass = MiniDump de comsvcs. Hunt 3: CallTrace con DLLs de rutas de usuario = tooling inyectada haciendo el dump. Hunt 4: correlaciona con EID 11 — un .dmp/.bin creado segundos después del acceso. Hunt 5: el comando que lo ordenó aparece en 4104/4688 justo antes (p.ej. rundll32 comsvcs.dll MiniDump).',
    relevantFields: ['EventID', 'UtcTime', 'SourceProcessGuid', 'SourceProcessId', 'SourceThreadId', 'SourceImage', 'TargetProcessGuid', 'TargetProcessId', 'TargetImage', 'GrantedAccess', 'CallTrace'],
    detectionTips: 'El par (SourceImage, GrantedAccess) es la clave: allowlist estricta de AV/EDR y taskmgr gestionado. En Windows 11/Server 2022+ activa Credential Guard y RunAsPPL — matan el dump desde procesos sin PPL y generan además eventos de LSA para los intentos bloqueados. Los accesos con 0x1F1FFF (ALL_ACCESS) desde binarios firmados pero inusuales también merecen revisión (tooling ofensiva firmada con certs robados).',
    relatedEventIds: [8, 1, 11, 4656, 5379],
  },
  {
    id: 11, name: 'FileCreate', log: 'Microsoft-Windows-Sysmon/Operational',
    short: 'Sysmon: un proceso creó o sobreescribió un archivo.',
    description: 'Sysmon lo genera cuando un proceso crea o sobreescribe un archivo. Registra Image, ProcessGuid, TargetFilename, CreationUtcTime y (en configs recientes) los Hashes del archivo creado; las configs avanzadas también extraen el contenido de archivos de texto y de configuración. Ideal para detectar droppers (EXE/DLL escritos en %TEMP%), scripts de persistencia (.bat/.vbs/.ps1/.hta en carpetas de startup), notas de rescate de ransomware y tooling descargada por el propio malware.',
    detection: [
      { label: 'PowerShell — archivos creados recientes', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=11} -MaxEvents 100 | Format-List TimeCreated, Message" },
      { label: 'Ejecutables escritos en rutas de usuario', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=11} | Where-Object {$_.Message -match '\.exe|\.dll|\.hta' -and $_.Message -match 'Temp|AppData|Users\\\\Public'} | Select-Object TimeCreated, Message -First 30" },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Applications and Services Logs → Microsoft → Windows → Sysmon → Operational → Filter → Event ID 11' },
    ],
    sigma: `title: Sysmon Executable Dropped in User-Writable Path
id: ff6e7d8c-9a0b-4d1e-3f2a-4b5c6d7e8f9a
status: experimental
logsource:
  product: windows
  service: sysmon
detection:
  selection:
    EventID: 11
    TargetFilename|contains:
      - '\\AppData\\'
      - '\\Users\\Public\\'
      - '\\Temp\\'
      - '\\Downloads\\'
    TargetFilename|endswith:
      - '.exe'
      - '.dll'
      - '.hta'
      - '.scr'
      - '.bat'
  condition: selection
fields:
  - Image
  - TargetFilename
  - Hashes
level: high`,
    related: ['1 (Sysmon — proceso creado)', '7 (Sysmon — DLL cargada)', '3 (Sysmon — conexión de red)', '4663 (Acceso a objeto — Security)'],
    analysis: 'Baseline: aplicaciones escribiendo caches, logs y temp propios (Chrome, Office, OneDrive) — la config de Sysmon ya filtra las extensiones de datos ruidosas. Anomalía: binarios ejecutables escritos en %TEMP%, %APPDATA%, C:\\Users\\Public o C:\\ProgramData por winword.exe/excel.exe (macro dropper), powershell.exe (descarga), mshta.exe o un navegador; archivos .hta/.js/.vbs escritos por outlook.exe (attachment ejecutado); escritura en Start Menu\\Programs\\Startup o en paths de RunOnce (persistencia inminente — correlaciona con EID 13); y ráfagas masivas de creación con extensiones renombradas + un README de rescate = ransomware cifrando en ese instante.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1105', 'T1204.002', 'T1486'],
    kql: 'DeviceFileEvents\n| where ActionType == "FileCreated"\n| where FolderPath has_any ("\\AppData\\Local\\Temp\\", "\\AppData\\Roaming\\", "\\Users\\Public\\", "\\ProgramData\\")\n| where FileName has_any (".exe", ".dll", ".bat", ".vbs", ".ps1", ".hta", ".scr")\n| project TimeGenerated, DeviceName, InitiatingProcessFileName, InitiatingProcessCommandLine, FileName, FolderPath, SHA256',
    spl: 'index=windows sourcetype="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=11 (TargetFilename="*.exe" OR TargetFilename="*.dll" OR TargetFilename="*.hta" OR TargetFilename="*.scr" OR TargetFilename="*.bat") (TargetFilename="*\\AppData\\*" OR TargetFilename="*\\Users\\Public\\*" OR TargetFilename="*\\ProgramData\\*" OR TargetFilename="*\\Temp\\*") | table _time, host, Image, TargetFilename, Hashes',
    threatHuntingNotes: 'Hunt 1: .exe/.dll/.hta escritos en rutas de usuario por procesos de Office o PowerShell = dropper en acción. Hunt 2: escrituras en el Startup folder y paths de RunOnce (correlaciona EID 11 + EID 13 para el valor Run). Hunt 3: picos de >500 archivos/min por Image con extensiones renombradas = ransomware cifrando. Hunt 4: hash del archivo creado contra threat intel en el pipeline. Hunt 5: archivos .zip/.rar creados junto a GBs de lectura SMB (EID 5145) = staging de exfiltración.',
    relevantFields: ['EventID', 'UtcTime', 'ProcessGuid', 'ProcessId', 'Image', 'TargetFilename', 'CreationUtcTime', 'Hashes'],
    detectionTips: 'La config debe excluir las extensiones de datos (.docx, .xlsx, .png...) o la ingest explota — las configs estándar ya lo hacen y solo loguean ejecutables, scripts y archivos de configuración. Combínalo con el EID 7: DLL creada (11) + cargada por proceso legítimo (7) = side-loading confirmado de principio a fin.',
    relatedEventIds: [1, 7, 3, 13, 4663],
  },
  {
    id: 12, name: 'Registry Create/Delete', log: 'Microsoft-Windows-Sysmon/Operational',
    short: 'Sysmon: se creó o borró una clave de registro (persistencia).',
    description: 'Sysmon lo genera cuando se crea (EventType CreateKey) o borra (DeleteKey) una clave de registro. Registra Image, ProcessGuid y TargetObject (la clave). Las configs tipo SwiftOnSecurity solo auditan rutas sensibles — Run/RunOnce, Image File Execution Options, Services, AppInit_DLLs, LSA, Winlogon, firewall — exactamente donde vive la persistencia y la manipulación de credenciales. Complemento del EID 13 (valor escrito): el 12 te dice que la clave NACIÓ, el 13 qué contiene.',
    detection: [
      { label: 'PowerShell — claves creadas/borradas', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=12} -MaxEvents 100 | Format-List TimeCreated, Message" },
      { label: 'Creación en rutas de persistencia', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=12} | Where-Object {$_.Message -match 'CurrentVersion.\\\\Run|Image File Execution Options|AppInit|Services\\\\'} | Select-Object TimeCreated, Message -First 30" },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Applications and Services Logs → Microsoft → Windows → Sysmon → Operational → Filter → Event ID 12' },
    ],
    sigma: `title: Sysmon Registry Key Created in Persistence Location
id: ab7e8d9c-0b1c-4e2f-4a3b-5c6d7e8f9a0b
status: experimental
logsource:
  product: windows
  service: sysmon
detection:
  selection:
    EventID: 12
    EventType: CreateKey
    TargetObject|contains:
      - '\\CurrentVersion\\Run'
      - '\\CurrentVersion\\RunOnce'
      - '\\Image File Execution Options'
      - '\\AppInit_DLLs'
      - '\\Windows NT\\CurrentVersion\\Winlogon'
  condition: selection
fields:
  - Image
  - TargetObject
level: high`,
    related: ['13 (Sysmon — valor de registro escrito)', '14 (Sysmon — clave renombrada)', '4697 (Servicio instalado)', '7045 (Servicio instalado — System)'],
    analysis: 'Baseline: casi nulo en rutas sensibles — el SO y los instaladores no deberían crear Run keys ni IFEO después del setup; construye allowlist de instaladores (setup.exe, msiexec.exe, agentes de deployment). Anomalía: creación de HKLM/HKCU ...\\CurrentVersion\\Run(Once) por procesos que no sean instaladores; subclaves nuevas bajo Image File Execution Options (el valor Debugger que secuestra procesos se escribe con EID 13); claves bajo Services creadas por binarios raros (persistencia tipo PSExec-service con nombre typosquatting de svchost); y AppInit_DLLs o Winlogon\\Shell tocados = persistencia de DLL global. Caza siempre EID 12 + EID 13 del mismo ProcessGuid: clave nueva + payload escrito = persistencia completa.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1112', 'T1547.001'],
    kql: 'DeviceRegistryEvents\n| where ActionType == "RegistryKeyCreated"\n| where RegistryKey has_any ("\\CurrentVersion\\Run", "\\CurrentVersion\\RunOnce", "Image File Execution Options", "AppInit_DLLs", "\\Winlogon")\n| project TimeGenerated, DeviceName, RegistryKey, RegistryValueName, RegistryValueData, InitiatingProcessFileName, InitiatingProcessCommandLine',
    spl: 'index=windows sourcetype="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=12 EventType=CreateKey (TargetObject="*\\CurrentVersion\\Run*" OR TargetObject="*Image File Execution Options*" OR TargetObject="*AppInit_DLLs*" OR TargetObject="*Winlogon*") | table _time, host, Image, TargetObject',
    threatHuntingNotes: 'Hunt 1: CreateKey en Run/RunOnce por algo que no sea un instalador conocido. Hunt 2: claves nuevas bajo Services con Image del EID 1 apuntando a %TEMP% — servicio-persistencia. Hunt 3: DeleteKey en masa sobre claves de AV/EDR (tampering de seguridad). Hunt 4: correlaciona CreateKey (12) + SetValue (13) del mismo ProcessGuid y extrae el payload completo. Hunt 5: difiere contra baseline por host — la clave que aparece en un host y en ningún otro del fleet es la señal.',
    relevantFields: ['EventID', 'UtcTime', 'ProcessGuid', 'ProcessId', 'Image', 'EventType', 'TargetObject'],
    detectionTips: 'El EID 12 solo loguea lo que la config de Sysmon permita — revisa que Run/IFEO/Services/AppInit estén en la lista (vienen por defecto en SwiftOnSecurity y olaf hartong). Los EID 12/13/14 comparten ProcessGuid: la investigación completa de persistencia se hace filtrando por ese GUID y viendo la secuencia temporal.',
    relatedEventIds: [13, 14, 4697, 7045],
  },
  {
    id: 13, name: 'Registry Value Set', log: 'Microsoft-Windows-Sysmon/Operational',
    short: 'Sysmon: se escribió un valor de registro (RunKeys, IFEO Debugger...).',
    description: 'Sysmon lo genera cuando un proceso escribe (SetValue) un valor del registro. Registra Image, ProcessGuid, TargetObject (clave + nombre del valor), Details (EL DATO escrito — el payload) y EventType. Las configs restrictivas solo loguean rutas de persistencia y evasión, así que el 13 te entrega la persistencia con su comando completo: el powershell -enc del Run key, la ruta de la DLL del AppInit, el debugger del IFEO.',
    detection: [
      { label: 'PowerShell — valores escritos', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=13} -MaxEvents 100 | Format-List TimeCreated, Message" },
      { label: 'Persistencia en Run keys con payload', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=13} | Where-Object {$_.Message -match 'CurrentVersion.\\\\Run' -and $_.Message -match 'powershell|rundll32|mshta|-enc|wscript'} | Select-Object TimeCreated, Message -First 30" },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Applications and Services Logs → Microsoft → Windows → Sysmon → Operational → Filter → Event ID 13' },
    ],
    sigma: `title: Sysmon Suspicious Run Key Value Set with Payload
id: bc8e9d0c-1c2d-4f3a-5b4c-6d7e8f9a0b1c
status: experimental
logsource:
  product: windows
  service: sysmon
detection:
  selection:
    EventID: 13
    TargetObject|contains:
      - '\\CurrentVersion\\Run'
      - '\\CurrentVersion\\RunOnce'
    Details|contains:
      - 'powershell'
      - '-enc'
      - 'rundll32'
      - 'mshta'
      - 'wscript'
      - 'AppData'
  condition: selection
fields:
  - Image
  - TargetObject
  - Details
level: critical`,
    related: ['12 (Sysmon — clave creada/borrada)', '14 (Sysmon — clave renombrada)', '4698 (Tarea programada creada)', '7045 (Servicio instalado)'],
    analysis: 'Baseline: instaladores escribiendo entradas Run legítimas durante setups (allowlist por Image+TargetObject) y el SO tocando config propia en ventanas de update. Anomalía IR: cualquier Details con powershell -enc, rundll32 con DLL en %APPDATA%, mshta con URL, wscript/cscript o rutas de usuario en un Run/RunOnce; Debugger bajo Image File Execution Options (secuestro de procesos — el sethc.exe Debugger es el sticky keys backdoor clásico de RDP); valores de DisableAntiSpyware bajo Windows Defender (evadiendo AV); y SecurityPackages modificado en HKLM\\SYSTEM\\CurrentControlSet\\Control\\Lsa añadiendo memssp.dll (mimikatz misc::memssp — los logons siguientes se registrarán en texto claro). El campo Details ES el IOC: envíalo al SIEM y alerta por contenido, no por existencia.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1547.001', 'T1112', 'T1546.012'],
    kql: 'DeviceRegistryEvents\n| where ActionType == "RegistryValueSet"\n| where RegistryKey has_any ("\\CurrentVersion\\Run", "\\CurrentVersion\\RunOnce", "Image File Execution Options")\n| where RegistryValueData has_any ("powershell", "-enc", "rundll32", "mshta", "wscript", "AppData")\n| project TimeGenerated, DeviceName, RegistryKey, RegistryValueName, RegistryValueData, InitiatingProcessFileName, InitiatingProcessCommandLine',
    spl: 'index=windows sourcetype="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=13 (TargetObject="*\\CurrentVersion\\Run*" OR TargetObject="*Image File Execution Options*") (Details="*powershell*" OR Details="*-enc*" OR Details="*rundll32*" OR Details="*mshta*" OR Details="*AppData*") | table _time, host, Image, TargetObject, Details',
    threatHuntingNotes: 'Hunt 1: Run/RunOnce con Details que contengan intérpretes (powershell/rundll32/mshta/wscript) = persistencia lista para el siguiente logon. Hunt 2: IFEO + valor Debugger = backdoor de secuestro de proceso (sethc.exe es el clásico RDP backdoor). Hunt 3: Lsa\\SecurityPackages con DLL nueva = memssp de mimikatz. Hunt 4: cambios de evasión tipo DisableAntiSpyware o exclusiones nuevas de Defender. Hunt 5: Details con rutas en %APPDATA% — cruza el hash del binario referenciado contra el EID 11 que lo creó.',
    relevantFields: ['EventID', 'UtcTime', 'ProcessGuid', 'ProcessId', 'Image', 'EventType', 'TargetObject', 'Details'],
    detectionTips: 'Details es el campo que contiene el payload — el SIEM debe parsearlo como string completo sin truncar. Los valores legítimos de Run (OneDrive, Teams, agentes de IT) generan falsos positivos al reinstalar: allowlist por Image (el instalador) + TargetObject, y alerta solo del resto. Tras detectar, correlaciona el EID 1 del proceso que ejecutará la persistencia en el próximo boot (correlación post-reinicio).',
    relatedEventIds: [12, 14, 1, 11, 7045],
  },
  {
    id: 14, name: 'Registry Rename', log: 'Microsoft-Windows-Sysmon/Operational',
    short: 'Sysmon: se renombró una clave de registro (raro y sospechoso).',
    description: 'Sysmon lo genera cuando un proceso renombra una clave de registro (EventType RenameKey). Registra Image, ProcessGuid, TargetObject (nombre antiguo) y NewName (el nuevo). Es un evento rarísimo en operación normal en las rutas auditadas — su volumen casi nulo lo convierte en señal de alta fidelidad: se usa para esconder persistencia renombrando claves legítimas, resetear el estado de componentes de seguridad o evadir reglas que matchean por nombre exacto de clave.',
    detection: [
      { label: 'PowerShell — claves renombradas', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=14} -MaxEvents 100 | Format-List TimeCreated, Message" },
      { label: 'XPath — renombrados con detalle', cmd: "Get-WinEvent -LogName 'Microsoft-Windows-Sysmon/Operational' -FilterXPath '*[System[EventID=14]]' -MaxEvents 20 | Format-List TimeCreated, Message" },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Applications and Services Logs → Microsoft → Windows → Sysmon → Operational → Filter → Event ID 14' },
    ],
    related: ['12 (Sysmon — clave creada/borrada)', '13 (Sysmon — valor escrito)', '4719 (Política de auditoría)'],
    analysis: 'Baseline: prácticamente inexistente — Windows casi nunca renombra claves en Run/Services/Lsa/IFEO. Cualquier EID 14 en rutas sensibles es IR: los atacantes renombran claves para (1) saltarse reglas de detección que matchean el nombre exacto, (2) desactivar componentes de seguridad renombrando su clave de configuración (el software fallará al no encontrarla), o (3) preparar un swap de persistencia — renombra la clave legítima y crea otra con el nombre original apuntando a su payload. Correlaciona con EID 12 y 13 del mismo ProcessGuid para ver la operación completa: delete + rename + set en segundos = manipulación dirigida.',
    mitre: ['T1112', 'T1562.001'],
  },
  {
    id: 22, name: 'DNS Query', log: 'Microsoft-Windows-Sysmon/Operational',
    short: 'Sysmon: un proceso resolvió una query DNS (C2, DGA, tunneling).',
    description: 'Sysmon lo genera cuando un proceso resuelve un nombre DNS. Registra Image, ProcessGuid, QueryName (el dominio), QueryStatus (código de resultado — 0 éxito, 9003 NXDOMAIN) y QueryResults (las IPs resultantes). Es la fuente de visibilidad DNS por proceso: mapea qué binario resolvió qué dominio justo antes de conectarse (EID 3). Indispensable para cazar C2 por DNS: DGA, DNS tunneling, typosquatting y CDN-fronting.',
    detection: [
      { label: 'PowerShell — queries DNS recientes', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=22} -MaxEvents 100 | Format-List TimeCreated, Message" },
      { label: 'Dominios largos (DGA/tunneling)', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=22} | Where-Object {($_.Message -match 'QueryName: .{30,}')} | Select-Object TimeCreated, Message -First 30" },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Applications and Services Logs → Microsoft → Windows → Sysmon → Operational → Filter → Event ID 22' },
    ],
    sigma: `title: Sysmon Suspicious DNS Query - High Entropy Domain
id: cd9e0d1c-2d3e-4a4b-6c5d-7e8f9a0b1c2d
status: experimental
logsource:
  product: windows
  service: sysmon
detection:
  selection:
    EventID: 22
    QueryName|re: '^[a-z0-9]{20,}\\.'
  condition: selection
fields:
  - Image
  - QueryName
  - QueryResults
level: medium`,
    related: ['3 (Sysmon — conexión de red)', '1 (Sysmon — proceso creado)', '5156 (WFP permitida)'],
    analysis: 'Baseline: miles de queries diarias de navegadores y telemetría hacia dominios corporativos, CDNs y publicidad — construye un top-N de QueryName y descártalo; en el resto está la caza. Anomalía: QueryName con alta entropía/aleatorio de más de 20-25 caracteres (DGA de Cobalt Strike/Emotet — los dominios rotan); subdominios larguísimos con data encoded (DNS tunneling de dnscat2/iodine — caza labels de más de 50 chars); procesos sin negocio de red (rundll32.exe, regsvr32.exe) resolviendo dominios; ráfagas de NXDOMAIN (QueryStatus 9003) desde un host = DGA muriendo tras sinkhole/takedown; y picos de queries TXT (tunneling C2). El patrón estándar de implant: EID 22 (resuelve dominio C2) → EID 3 (conecta a la IP de QueryResults) — la correlación por ProcessGuid reconstruye la cadena completa.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1071.004', 'T1048.003', 'T1568.002'],
    kql: 'DeviceNetworkEvents\n| where ActionType == "DnsConnectionInspected"\n| where RemoteUrl matches regex "[a-z0-9]{20,}[\\.\\-]"\n| project TimeGenerated, DeviceName, InitiatingProcessFileName, RemoteUrl, RemoteIP\n| take 100',
    spl: 'index=windows sourcetype="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=22 | eval qlen=len(QueryName) | where qlen > 30 | table _time, host, Image, QueryName, QueryStatus, QueryResults | sort -qlen',
    threatHuntingNotes: 'Hunt 1: entropía/longitud del QueryName — dominios de más de 30 chars con caracteres aleatorios = DGA. Hunt 2: QueryStatus=9003 (NXDOMAIN) en ráfaga para un mismo host = DGA tras takedown o sinkhole. Hunt 3: labels de subdominio de más de 50 chars = DNS tunneling (dnscat2/iodine). Hunt 4: Image=rundll32/regsvr32/dllhost resolviendo dominios = LOLBin con C2. Hunt 5: dominio registrado hace menos de 30 días + resuelto por binario de usuario = candidato a C2 (cruce con threat intel pasiva). Hunt 6: QueryName visto en UN solo host del fleet suele ser señal.',
    relevantFields: ['EventID', 'UtcTime', 'ProcessGuid', 'ProcessId', 'Image', 'QueryName', 'QueryStatus', 'QueryResults'],
    detectionTips: 'Volumen alto pero mucho menor que el EID 3 — con filtro del top-N de dominios corporativos/CDN la ingest es viable. QueryResults contiene a veces múltiples registros y CNAME: parsea y normaliza en el SIEM. La correlación 22→3 por ProcessGuid es la query de hunting más rentable de este canal: DNS + conexión del mismo proceso en menos de 60s.',
    relatedEventIds: [3, 1, 5156],
  },
  {
    id: 25, name: 'Process Tampering', log: 'Microsoft-Windows-Sysmon/Operational',
    short: 'Sysmon: proceso holloweado o imagen parcheada (process hollowing/herpaderping).',
    description: 'Sysmon (13.x o superior) lo genera cuando detecta que la imagen de un proceso fue manipulada tras su lanzamiento: Type Hollowing (la memoria del proceso legítimo se sustituyó por payload) o Herpaderping (el archivo en disco se modificó después del check de firma). Registra Image, ProcessGuid, ProcessId y Type. Dispara cuando un binario firmado legítimo es abusado como contenedor: su imagen original ya no corresponde con lo que realmente ejecuta.',
    detection: [
      { label: 'PowerShell — process tampering', cmd: "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=25} -MaxEvents 50 | Format-List TimeCreated, Message" },
      { label: 'Alerta directa (volumen casi nulo)', cmd: "if (Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=25} -MaxEvents 1 -ErrorAction SilentlyContinue) { 'ALERTA: process tampering detectado' }" },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Applications and Services Logs → Microsoft → Windows → Sysmon → Operational → Filter → Event ID 25' },
    ],
    sigma: `title: Sysmon Process Tampering - Hollowing or Herpaderping
id: de0e1d2c-3e4f-4b5c-7d6e-8f9a0b1c2d3e
status: experimental
logsource:
  product: windows
  service: sysmon
detection:
  selection:
    EventID: 25
  condition: selection
fields:
  - Image
  - Type
level: critical`,
    related: ['8 (Sysmon — CreateRemoteThread)', '10 (Sysmon — ProcessAccess)', '1 (Sysmon — proceso creado)', '7 (Sysmon — DLL cargada)'],
    analysis: 'Baseline: NULO — ningún software legítimo hollowea procesos ni parchea su imagen en disco. Cualquier EID 25 es IR inmediato: process hollowing es la firma de ejecución de Cobalt Strike (spawnto + inject), Brute Ratel, meterpreter y packers de malware (el clásico runtime/svchost legítimo con payload completo en memoria); Herpaderping permite ejecutar un payload malicioso saltándose los checks de firma. Prioridad máxima de triage: extrae el ProcessGuid y pivota a sus EID 1/3/7/22 para reconstruir qué hizo el proceso holloweado (C2, dumps, movimiento lateral) — todo aparecerá con el Image del binario legítimo como disfraz.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1055.012', 'T1055'],
    kql: 'Event\n| where EventLog == "Microsoft-Windows-Sysmon/Operational" and EventID == 25\n| project TimeGenerated, Computer, RenderedDescription',
    spl: 'index=windows sourcetype="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=25 | table _time, host, Image, Type, ProcessGuid',
    threatHuntingNotes: 'Hunt 1: cualquier EID 25 = IR (volumen esperado: cero). Hunt 2: revisa el Image del proceso tampered — si es un binario firmado (svchost, runtime), el hash del archivo en disco no corresponderá con el comportamiento observado. Hunt 3: sigue el ProcessGuid a EID 3/22 para identificar el C2 que se esconde tras el proceso legítimo. Hunt 4: correlaciona con EID 8/10 previos — quién inyectó o holloweó. Hunt 5: si Type=Herpaderping revisa también drivers (BYOVD) — el mismo truco sobre firmas se aplica en kernel.',
    relevantFields: ['EventID', 'UtcTime', 'ProcessGuid', 'ProcessId', 'Image', 'Type'],
    detectionTips: 'Requiere Sysmon 13.x o superior (las configs actualizadas de SwiftOnSecurity y olaf hartong ya lo cubren — en versiones viejas el evento no existe). Volumen esperado de cero eventos en semanas: cualquier aparición es triage inmediato sin necesidad de tunear umbrales.',
    relatedEventIds: [1, 8, 10, 3, 7],
  },
  {
    id: 104, name: 'Event log cleared (canal)', log: 'System',
    short: 'Se borró un canal de event log específico (anti-forensics).',
    description: 'Lo genera el servicio de Event Log (proveedor Microsoft-Windows-Eventlog, canal System) cuando alguien limpia UN canal concreto con wevtutil clear-log, Clear-EventLog o el botón "Clear Log" del Event Viewer. Registra Channel (qué canal se borró: System, Microsoft-Windows-Sysmon/Operational, PowerShell...), SubjectUserSid/SubjectUserName (quién) y SubjectLogonId. Es el complemento del 1102: el 1102 solo cubre el canal Security — el 104 delata el borrado de Sysmon, PowerShell y cualquier otro canal.',
    detection: [
      { label: 'PowerShell — canales borrados', cmd: 'Get-WinEvent -FilterHashtable @{LogName="System"; Id=104} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'wevtutil — CLI nativa', cmd: 'wevtutil qe System /q:"*[System[(EventID=104)]]" /c:20 /rd:true /f:text' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → System → Filter → Event ID 104 (source: Event Log)' },
    ],
    sigma: `title: Event Log Channel Cleared - Anti-Forensics
id: ef1e2d3c-4f5a-4c6d-8e7f-9a0b1c2d3e4f
status: experimental
logsource:
  product: windows
  service: system
detection:
  selection:
    EventID: 104
  condition: selection
fields:
  - Channel
  - SubjectUserName
level: critical`,
    related: ['1102 (Audit log cleared — Security)', '4719 (Política de auditoría cambiada)', '4688 (Proceso creado)'],
    analysis: 'Baseline: NULO en producción — borrar logs no es operación legítima fuera de una ventana de mantenimiento documentada. Cualquier 104 = anti-forensics (T1070.001): el atacante limpió un canal concreto (típicamente Sysmon o PowerShell Operational) para cortar la cadena de evidencia justo después de su acción. Caza la tríada: 104 (canal X borrado) + 1102 (Security borrado) + 4719 (auditoría deshabilitada) — cualquiera de los tres sin ticket de cambio es IR. Nota forense: aunque borren el canal Security, el 104 de limpiar OTROS canales queda en System; y un colector WEF centralizado conserva copia de todo lo borrado localmente — ve allí a reconstruir el timeline.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1070.001', 'T1562.002'],
    kql: 'Event\n| where EventLog == "System" and EventID == 104\n| project TimeGenerated, Computer, RenderedDescription',
    spl: 'index=windows sourcetype=WinEventLog:System EventCode=104 | table _time, host, user, Message',
    threatHuntingNotes: 'Hunt 1: cualquier 104 fuera de ventana de mantenimiento = anti-forensics. Hunt 2: extrae el Channel borrado — si es Sysmon o PowerShell, el atacante sabía lo que buscaba (borrado quirúrgico = actor avanzado). Hunt 3: correlaciona con el 4688/Sysmon 1 previo del mismo SubjectUserName: quién ejecutó wevtutil o PowerShell Clear-EventLog justo antes. Hunt 4: busca gaps — el volumen de eventos del canal borrado antes/después muestra el hueco temporal de actividad oculta. Hunt 5: revisa el colector WEF: la copia central sigue intacta.',
    relevantFields: ['EventID', 'Channel', 'SubjectUserSid', 'SubjectUserName', 'SubjectDomainName', 'SubjectLogonId'],
    detectionTips: 'Alerta SIEM de umbral CERO: un solo 104 fuera de mantenimiento debe pagear. Compara contra el CMDB de cambios. Vigila también los canales DESHABILITADOS (wevtutil sl Security /e:false) — deshabilitar un canal no genera 104 y es la variante silenciosa de la misma técnica.',
    relatedEventIds: [1102, 4719, 4688],
  },
  {
    id: 1102, name: 'Audit log cleared', log: 'Security',
    short: 'Se borró el log de auditoría de Security — anti-forensics crítico.',
    description: 'Lo genera el propio canal Security cuando alguien lo limpia (wevtutil cl Security, Clear-EventLog, botón Clear Log del Event Viewer). Registra SubjectUserSid, SubjectUserName, SubjectDomainName y SubjectLogonId — el responsable queda identificado en el evento que sobrevive al wipe (el 1102 se escribe en el log recién vaciado). Es EL indicador anti-forense canónico: ningún proceso operativo legítimo borra el Security log de un equipo en producción.',
    detection: [
      { label: 'PowerShell — borrados del audit log', cmd: "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=1102} -MaxEvents 20 | Format-List TimeCreated, Message" },
      { label: 'wevtutil — CLI nativa', cmd: 'wevtutil qe Security /q:"*[System[(EventID=1102)]]" /c:10 /rd:true /f:text' },
      { label: 'XPath — buscar quién borró', cmd: "Get-WinEvent -LogName Security -FilterXPath '*[System[EventID=1102]]' -MaxEvents 10 | Format-List TimeCreated, Message" },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 1102' },
    ],
    sigma: `title: Audit Log Cleared - Anti-Forensics
id: fe2e3d4c-5a6b-4d7e-9f8a-0b1c2d3e4f5a
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 1102
  condition: selection
fields:
  - SubjectUserName
  - SubjectDomainName
  - SubjectLogonId
level: critical`,
    related: ['104 (Event log cleared — System)', '4719 (Política de auditoría cambiada)', '4688 (Proceso creado)', '7040 (Service start type changed)'],
    analysis: 'Baseline: NULO fuera de ventanas de mantenimiento documentadas. Un 1102 es presunción de compromiso: la secuencia típica es explosión de actividad (4688/4625/4104) → 1102 (limpieza) → silencio o reanudación "limpia". El atacante borra exactamente lo que le incrimina — mide el gap temporal: si entre el último evento pre-wipe y el 1102 hay horas, esas horas son las que debes reconstruir desde fuentes alternativas (Sysmon en archivo propio, el EVTX respaldado, o el colector WEF central que NO se ve afectado porque el borrado fue local). Es la técnica de cierre estándar de ransomware e insider threats justo antes de acciones destructivas.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1070.001', 'T1562.002', 'T1070'],
    kql: 'SecurityEvent\n| where EventID == 1102\n| project TimeGenerated, Computer, SubjectUserName, SubjectDomainName, SubjectLogonId, Activity',
    spl: 'index=windows sourcetype=XmlWinEventLog EventCode=1102 | table _time, host, user, SubjectDomainName | sort -_time',
    threatHuntingNotes: 'Hunt 1: alerta de umbral cero — un solo 1102 fuera de mantenimiento pagea al SOC. Hunt 2: reconstruye el gap: toma el último EventRecordID antes del wipe y el tiempo del 1102 — esa ventana es la actividad oculta. Hunt 3: correlaciona el SubjectUserName/SubjectLogonId con los 4688 previos (wevtutil.exe o powershell Clear-EventLog ejecutándose). Hunt 4: si tienes WEF/WEC, el colector conserva la actividad "borrada" — extrae de ahí el timeline real. Hunt 5: revisa también los canales Sysmon/PowerShell (el borrado quirúrgico se ve en el 104 de System).',
    relevantFields: ['EventID', 'SubjectUserSid', 'SubjectUserName', 'SubjectDomainName', 'SubjectLogonId'],
    detectionTips: 'Mitigación #1: Windows Event Forwarding a un colector central con acceso restringido — el atacante necesita comprometer el colector para borrar la copia. Mitigación #2: alerta en tiempo real (no batch). Falso positivo típico: admin legítimo liberando espacio en un DC con el log lleno — se resuelve exigiendo ticket de cambio para esa acción.',
    relatedEventIds: [104, 4719, 4688, 7040],
  },
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
    id: 4611, name: 'Trusted logon process registrado', log: 'Security',
    short: 'Un proceso se registró ante la LSA como proceso de logon confiable.',
    description: 'Lo genera la LSA (Local Security Authority) cuando un proceso se registra como trusted logon process — procesos con permiso para originar logons sin pasar los checks estándar (winlogon, Msgina, Kerberos, NtLmSsp, Schannel...). Registra SubjectUserSid, SubjectUserName, SubjectLogonId y LogonProcessName (el nombre registrado). Requiere auditing de Security System Extension. La manipulación de la LSA (inyección de SSPs maliciosos para capturar credenciales en claro, técnica mimikatz misc::memssp y variantes) acaba generando un 4611 con un LogonProcessName fuera de la lista de procesos del sistema.',
    detection: [
      { label: 'PowerShell — procesos de logon registrados', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4611} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Baseline de LogonProcessName', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4611} | Group-Object {$_.Properties[4].Value} | Sort-Object Count -Descending' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4611' },
    ],
    sigma: `title: Suspicious Trusted Logon Process Registered
id: ec3e4d5c-6b7c-4e8f-0a9b-1c2d3e4f5a6b
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4611
  filter:
    LogonProcessName:
      - 'Advapi'
      - 'Kerberos'
      - 'Msgina'
      - 'NtLmSsp'
      - 'SCLogon'
      - 'Schannel'
      - 'Winlogon'
      - 'RDPCore'
      - 'CloudAP'
  condition: selection and not filter
fields:
  - SubjectUserName
  - LogonProcessName
level: critical`,
    related: ['4624 (Logon exitoso)', '4673 (Servicio privilegiado llamado)', '4719 (Política de auditoría)', '4826 (Driver bloqueado)'],
    analysis: 'Baseline: volumen bajísimo — solo los procesos del sistema registran logon processes y sus nombres son conocidos (Winlogon, Msgina, SCLogon, Kerberos, NtLmSsp, Advapi, Schannel, RDPCore, CloudAP). Por eso el 4611 es de altísima fidelidad: CUALQUIER LogonProcessName fuera de esa lista es manipulación de LSA — la firma de módulos inyectados que capturan credenciales de autenticación en texto claro al vuelo (la familia de técnicas SSP de mimikatz: misc::memssp escribe SecurityPackages con memssp.dll y los logons siguientes quedan registrados en un archivo de texto plano). Caza TODO y alerta sobre lo desconocido.',
    mitre: ['T1101', 'T1556'],
  },
  {
    id: 4616, name: 'Hora del sistema cambiada', log: 'Security',
    short: 'Se cambió la hora del sistema (timestomping de la línea temporal).',
    description: 'Lo genera cuando un proceso cambia el reloj del sistema (SetSystemTime). Registra SubjectUserSid, SubjectUserName, SubjectLogonId, PreviousTime, NewTime, ProcessId y ProcessName. Requiere SeSystemtimePrivilege (admins) y auditing de Security State Change. Uso malicioso doble: (1) timestomping para romper la correlación temporal de la investigación y de las reglas SIEM, (2) sabotaje de Kerberos y de la validación de certificados al forzar saltos de reloj.',
    detection: [
      { label: 'PowerShell — cambios de hora', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4616} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Cambios no hechos por w32time/svchost', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4616} | Where-Object {$_.Message -notmatch "svchost|w32time"} | Format-List TimeCreated, Message' },
      { label: 'Ver estado de sincronización', cmd: 'w32tm /query /status' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4616' },
    ],
    sigma: `title: System Time Changed by Non-Service Process
id: db4e5d6c-7c8d-4f9a-1b0c-2d3e4f5a6b7c
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4616
  filter:
    ProcessName|endswith: '\\svchost.exe'
  condition: selection and not filter
fields:
  - SubjectUserName
  - PreviousTime
  - NewTime
  - ProcessName
level: high`,
    related: ['1102 (Audit log cleared)', '4719 (Política de auditoría)', '4869 (Renovación Kerberos fallida)'],
    analysis: 'Baseline: ajustes de w32time (el servicio de hora corre dentro de svchost.exe) con deltas de milisegundos, y cambios de admin documentados en mantenimiento. Anomalía: cualquier 4616 generado por un proceso que no sea svchost/w32time; saltos de minutos/horas/días (compara PreviousTime vs NewTime); y cambios justo antes o después de actividad maliciosa — el atacante corrompe la cronología para que las correlaciones temporales del SIEM no enlacen sus eventos con el acceso inicial. En Kerberos un salto grande genera además fallos de autenticación masivos (KRB_AP_ERR_SKEW, visibles como 4771/4625 en ráfaga). Toda investigación sobre un host con 4616 debe validar la integridad del timeline contra una fuente externa (logs del DC, de red o del colector WEF).',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1070.006'],
    kql: 'SecurityEvent\n| where EventID == 4616\n| where ProcessName !endswith "\\svchost.exe"\n| project TimeGenerated, Computer, SubjectUserName, PreviousTime, NewTime, ProcessName',
    spl: 'index=windows EventCode=4616 NOT (ProcessName="*\\svchost.exe") | table _time, host, user, PreviousTime, NewTime, ProcessName',
    threatHuntingNotes: 'Hunt 1: 4616 por proceso distinto de svchost/w32time = manipulación manual del reloj. Hunt 2: calcula delta = NewTime - PreviousTime — deltas de más de minutos son sospechosos, de horas son IR. Hunt 3: valida coherencia del timeline: compara el TimeCreated del propio 4616 con los eventos previos/posteriores del host — si hay solapamientos o huecos, la línea temporal fue alterada. Hunt 4: correlaciona 4616 + fallos Kerberos en ráfaga en el DC (4771) desde ese host.',
    relevantFields: ['EventID', 'SubjectUserSid', 'SubjectUserName', 'SubjectDomainName', 'SubjectLogonId', 'PreviousTime', 'NewTime', 'ProcessId', 'ProcessName'],
    detectionTips: 'Los campos PreviousTime/NewTime son oro forense: guárdalos SIEMPRE — definen la ventana temporal corrupta. Mitigación: restringe SeSystemtimePrivilege solo a Administrators (GPO Change the system time) y valida la deriva con w32tm /query /status. Falso positivo frecuente: VMware Tools y servicios de sincronización de hipervisor — allowlist de vmtoolsd.exe y del servicio de hora.',
    relatedEventIds: [1102, 4719, 4869],
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
    id: 4662, name: 'Operación en objeto de directorio (DCSync)', log: 'Security',
    short: 'Operación sobre un objeto de AD en el DC — LA firma del DCSync.',
    description: 'Lo genera un Domain Controller cuando un proceso opera sobre un objeto del directorio (ObjectServer=DS). Registra SubjectUserSid/SubjectUserName, ObjectType/ObjectName (DN o GUID del objeto), OperationType, AccessMask y Properties (GUIDs de extended rights aplicados). Requiere Advanced Audit Policy → Directory Service Access. Es EL evento del DCSync: la replicación del directorio usa los GUIDs 1131f6ad-9c07-11d1-f79f-00c04fc2dcd2 (Replicate Directory Changes), 1131f6ac-9c07-11d1-f79f-00c04fc2dcd2 (Replicate Directory Changes All) y 89e95b76-444d-4c62-991a-0facbeda640c (Replicate Directory Changes In Filtered Set).',
    detection: [
      { label: 'PowerShell — operaciones DS con GUIDs de replicación', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4662} -MaxEvents 500 | Where-Object {$_.Message -match "1131f6ad|1131f6ac|89e95b76"} | Format-List TimeCreated, Message' },
      { label: 'Solo sujetos que no son DCs (cuentas sin $)', cmd: "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4662} | Where-Object {$_.Message -match '1131f6ad|1131f6ac' -and $_.Message -notmatch 'Name:\\s+\\S+\\$'} | Select-Object TimeCreated, Message -First 20" },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4662 (solo en DCs)' },
    ],
    sigma: `title: DCSync Replication Rights Used by Non-DC Account
id: ca5e6d7c-8d9e-4a0b-2c1d-3e4f5a6b7c8d
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4662
    Properties|contains:
      - '1131f6ad-9c07-11d1-f79f-00c04fc2dcd2'
      - '1131f6ac-9c07-11d1-f79f-00c04fc2dcd2'
      - '89e95b76-444d-4c62-991a-0facbeda640c'
  filter:
    SubjectUserName|endswith: '$'
  condition: selection and not filter
fields:
  - SubjectUserName
  - ObjectName
  - Properties
level: critical`,
    related: ['4769 (TGS — Kerberoasting)', '5136 (Objeto DS modificado)', '4624 (Logon exitoso)', '4663 (Acceso a objeto — NTDS.dit)'],
    analysis: 'Baseline: los DCs se replican entre ellos constantemente — SubjectUserName terminará en $ (cuenta de máquina) y el volumen es alto por naturaleza. Anomalía IR crítica (DCSync): un usuario o equipo NO-DC usando los GUIDs de replicación sobre el dominio — es mimikatz lsadump::dcsync /user:krbtgt (o Impacket secretsdump) extrayendo hashes para fabricar un golden ticket. Si el ObjectName apunta al dominio o al krbtgt y el SubjectUserName no acaba en $, asume compromiso total del dominio: prepara el doble reset de krbtgt y el plan de recuperación. Nota: la delegación del derecho de replicación a cuentas raras (5136 sobre nTSecurityDescriptor) suele PRECEDER al DCSync — caza esa preparación.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1003.006', 'T1003.003', 'T1003'],
    kql: 'SecurityEvent\n| where EventID == 4662\n| where Properties has_any ("1131f6ad-9c07-11d1-f79f-00c04fc2dcd2", "1131f6ac-9c07-11d1-f79f-00c04fc2dcd2", "89e95b76-444d-4c62-991a-0facbeda640c")\n| where SubjectUserName !endswith "$"\n| project TimeGenerated, Computer, SubjectUserName, ObjectName, ObjectServer, Properties, OperationType',
    spl: 'index=windows EventCode=4662 (Properties="*1131f6ad-9c07-11d1-f79f-00c04fc2dcd2*" OR Properties="*1131f6ac-9c07-11d1-f79f-00c04fc2dcd2*") user!=*$* | table _time, host, user, ObjectName, Properties, OperationType',
    threatHuntingNotes: 'Hunt 1: GUIDs de replicación + SubjectUserName SIN $ final = DCSync (casi cero falsos positivos). Hunt 2: ObjectName = DN del dominio o del krbtgt — objetivo golden ticket. Hunt 3: revisa quién tiene delegado el derecho de replicación (dsacls) — el ataque se PREPARA añadiendo esos GUIDs vía 5136. Hunt 4: correlaciona con 4663 sobre ntds.dit — si hay acceso directo al archivo además de replicación, el atacante está haciendo ambos. Hunt 5: tras detectar, resetea krbtgt DOS veces y revisa tickets TGS anómalos (4769 RC4).',
    relevantFields: ['EventID', 'SubjectUserSid', 'SubjectUserName', 'SubjectDomainName', 'SubjectLogonId', 'ObjectServer', 'ObjectType', 'ObjectName', 'OperationType', 'AccessMask', 'Properties'],
    detectionTips: 'Volumen altísimo en DCs (toda la operación AD genera 4662): filtra SIEMPRE por los GUIDs de replicación y cuentas sin $ antes de alertar — ingerirlo crudo es inviable. Requiere auditar Directory Service Access (éxito). Los GUIDs también aparecen en ataques de dACL: cualquier aparición de esos GUIDs en 5136 (modificación de nTSecurityDescriptor) es la preparación del DCSync.',
    relatedEventIds: [4769, 5136, 4624, 4663],
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
    id: 4723, name: 'Intento de cambio de contraseña (propia)', log: 'Security',
    short: 'Un usuario intentó cambiar su propia contraseña.',
    description: 'Lo genera cuando una cuenta intenta cambiar SU propia contraseña (conociendo la actual — distinto del reset administrativo 4724). Registra SubjectUserName y TargetUserName (normalmente iguales) y requiere auditing de User Account Management (éxito y fallo). Es la señal para detectar password guessing encubierto (muchos intentos fallidos de cambio con contraseña antigua errónea) y la consolidación de acceso (el atacante que robó la sesión cambia la contraseña para bloquear al usuario legítimo).',
    detection: [
      { label: 'PowerShell — cambios de contraseña', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4723} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Cambios sobre cuentas de servicio', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4723} | Where-Object {$_.Message -match "svc|service|sql|backup"} | Select-Object TimeCreated, Message -First 20' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4723' },
    ],
    related: ['4724 (Password reset por admin)', '4740 (Cuenta bloqueada)', '4624 (Logon exitoso)', '4738 (Usuario modificado)'],
    analysis: 'Baseline: picos predecibles cuando expira la política de contraseñas (usuarios cambiando su clave al iniciar sesión) y sincronizadores de password gestionados. Anomalía: cambio de contraseña de una cuenta de SERVICIO (nadie la usa interactivamente — casi siempre es un atacante consolidando el acceso tras robarla); 4723 fallidos repetidos para la misma cuenta (herramientas probando la contraseña actual como paso previo al robo de sesión); y cambios seguidos de logons desde fuentes nuevas (correlaciona con el 4624 posterior: la contraseña cambió y a los minutos hay un logon RDP desde una IP nunca vista = cuenta tomada).',
    mitre: ['T1098', 'T1110'],
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
    id: 4727, name: 'Grupo global creado', log: 'Security',
    short: 'Se creó un grupo de seguridad global en el dominio (DC).',
    description: 'Lo genera un DC cuando se crea un grupo global con seguridad habilitada (los que contienen usuarios del dominio y se replican en el Global Catalog). Registra SubjectUserName (quién creó el grupo), TargetUserName (el nombre del grupo nuevo), TargetSid y los atributos iniciales (SamAccountName, etc.). Complemento del 4731 (grupos locales en miembros) y del 4754 (grupos universales). La creación de grupos fuera del provisioning de IT es rara y de alta fidelidad.',
    detection: [
      { label: 'PowerShell — grupos globales creados', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4727} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4727' },
      { label: 'Linux (WEC a syslog)', cmd: 'grep "EventID 4727" /var/log/syslog' },
    ],
    related: ['4728 (Miembro añadido a grupo global)', '4731 (Grupo local creado)', '4754 (Grupo universal creado)', '4720 (Usuario creado)'],
    analysis: 'Baseline: grupos creados por cuentas de provisioning/helpdesk en ventanas de gestión — construye baseline de creadores legítimos. Anomalía: grupo creado por una cuenta de usuario normal, en horario no laboral o en ráfaga; nombre mimético de grupos reales (el IT-Support-Admins falso que un admin despistado rellena de permisos); y la secuencia 4727 + 4728 en menos de 1h añadiendo al atacante = persistencia de dominio clásica. Caza también grupos creados y renombrados (4781) poco después — ocultación de persistencia.',
    mitre: ['T1098'],
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
    id: 4731, name: 'Grupo local creado', log: 'Security',
    short: 'Se creó un grupo de seguridad local en el host.',
    description: 'Lo genera cuando se crea un grupo de seguridad LOCAL en un servidor o workstation (en DC, los equivalentes son 4727 global, 4744 domain-local y 4754 universal). Registra SubjectUserName, TargetUserName (el grupo nuevo), TargetSid y atributos como SamAccountName. Las workstations modernas gestionadas por GPO/Intune casi nunca necesitan grupos locales nuevos — cualquier creación en producción es estadísticamente anómala.',
    detection: [
      { label: 'PowerShell — grupos locales creados', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4731} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Ver grupos locales actuales', cmd: 'Get-LocalGroup | Select-Object Name, Description, SID' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4731' },
    ],
    related: ['4732 (Miembro añadido a grupo local)', '4735 (Grupo local modificado)', '4727 (Grupo global creado)', '4720 (Usuario creado)'],
    analysis: 'Baseline: casi nulo en workstations gestionadas — el provisioning se hace en tiempo de build (si acaso, grupos locales creados por GPO Restricted Groups en el arranque). Anomalía: cualquier 4731 en producción: los atacantes crean grupos locales para estructurar persistencia — grupo nuevo + 4732 metiendo su cuenta backdoor = una membresía que sobrevive a limpiezas de cuentas individuales y que confunde al analista (parece legítimo, es un grupo). Verifica contra el CMDB y con el admin del host; sin justificación, IR.',
    mitre: ['T1098', 'T1136.001'],
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
    id: 4735, name: 'Grupo local modificado', log: 'Security',
    short: 'Se cambió un atributo de un grupo local (no membership).',
    description: 'Lo genera cuando se modifica un atributo de un grupo de seguridad local que NO es la membresía (eso es 4732/4733): nombre, descripción, etc. Registra SubjectUserName, TargetUserName (el grupo), TargetSid y ChangedAttributes. Tocar los grupos builtin (Administrators, Remote Desktop Users, Backup Operators) es rarísimo y de altísima señal.',
    detection: [
      { label: 'PowerShell — grupos locales modificados', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4735} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Cambios en grupos builtin críticos', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4735} | Where-Object {$_.Message -match "Administrators|Remote Desktop Users|Backup Operators"} | Format-List TimeCreated, Message' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4735' },
    ],
    related: ['4731 (Grupo local creado)', '4732 (Miembro añadido a grupo local)', '4781 (Nombre de cuenta cambiado)'],
    analysis: 'Baseline: proyectos documentados de renombrado/IAM en ventanas de cambio. Anomalía: renombrar grupos builtin para confundir al analista (técnicas de ocultación de persistencia — el Administrators rebautizado rompe playbooks que buscan el nombre exacto); cambios de descripción para pasar controles automáticos; y el par 4735 (grupo modificado) + 4732 (member added) sobre Remote Desktop Users = el atacante habilitando RDP para su cuenta de forma estructurada. Cualquier 4735 sobre un grupo builtin sin ticket de cambio es IR.',
    mitre: ['T1098'],
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
    id: 4741, name: 'Cuenta de equipo creada', log: 'Security',
    short: 'Se creó una cuenta de máquina en el dominio (MachineAccountQuota).',
    description: 'Lo genera un DC cuando se crea una cuenta de equipo (nombre terminado en $). Registra SubjectUserName (quién pidió el join), TargetUserName (p.ej. LAPTOP-ANOMALIA$), TargetSid y atributos como SamAccountName/UserAccountControl. Clave: por defecto, cualquier usuario autenticado puede crear hasta MachineAccountQuota (10) cuentas de equipo SIN ser admin — cuota que abusan PowerMad/SharpMad y playbooks de ADCS para crear máquinas falsas con certificados legítimos.',
    detection: [
      { label: 'PowerShell — cuentas de equipo creadas', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4741} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Creadas por usuarios normales (no deploy)', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4741} | Where-Object {$_.Message -notmatch "join|deploy|install|admin"} | Select-Object TimeCreated, Message -First 20' },
      { label: 'Consultar cuota actual', cmd: 'Get-ADObject -Identity ((Get-ADDomain).DomainSID) -Properties ms-DS-MachineAccountQuota | Select-Object ms-DS-MachineAccountQuota' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4741' },
    ],
    sigma: `title: Computer Account Created by Non-Deployment User
id: b96e7d8c-9e0f-4b1c-3d2e-4f5a6b7c8d9e
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4741
  filter:
    SubjectUserName|contains:
      - 'join'
      - 'deploy'
      - 'install'
  condition: selection and not filter
fields:
  - SubjectUserName
  - TargetUserName
  - TargetSid
level: medium`,
    related: ['4720 (Usuario creado)', '5136 (Objeto DS modificado — SPNs/dACLs)', '4742 (Cuenta de equipo cambiada)', '4756 (Miembro añadido a grupo universal)'],
    analysis: 'Baseline: joins de workstations en provisioning (SubjectUserName = cuenta técnica de deployment/join, horario laboral, naming convention del fleet). Anomalía: cuenta de equipo creada por un usuario normal — el abuso clásico de MachineAccountQuota con PowerMad (New-MachineAccount -MachineAccount WS-FALSA$): es el paso 1 de los ataques de ADCS (plantillas que permiten SAN de máquina tipo ESC1/ESC6), de Shadow Credentials (msDS-KeyCredentialLink) y de persistencia tipo máquina que evade los controles pensados para cuentas de usuario. Caza también el 5136 posterior sobre la cuenta nueva (SPNs, dACLs, KeyCredentialLink) — ahí se confirma el propósito.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1136.002', 'T1098'],
    kql: 'SecurityEvent\n| where EventID == 4741\n| where SubjectUserName !contains "join" and SubjectUserName !contains "deploy" and SubjectUserName !endswith "$"\n| project TimeGenerated, Computer, SubjectUserName, TargetUserName, TargetSid',
    spl: 'index=windows EventCode=4741 user!=*join* user!=*deploy* user!=*$* | table _time, host, user, TargetUserName, TargetSid',
    threatHuntingNotes: 'Hunt 1: 4741 con SubjectUserName = usuario final (no cuenta técnica) = abuso de quota. Hunt 2: cuenta de máquina nueva + 5136 añadiendo msDS-KeyCredentialLink = Shadow Credentials. Hunt 3: naming fuera del estándar del fleet o nombres miméticos. Hunt 4: máquina creada y NUNCA autenticada (sin 4768/4624 posteriores) = cuenta dormante de persistencia. Hunt 5: mitigación: ms-DS-MachineAccountQuota a 0 y auditoría de plantillas ADCS.',
    relevantFields: ['EventID', 'SubjectUserSid', 'SubjectUserName', 'SubjectLogonId', 'TargetUserName', 'TargetDomainName', 'TargetSid', 'SamAccountName', 'UserAccountControl'],
    detectionTips: 'Mitigación estructural: pon ms-DS-MachineAccountQuota = 0 (los joins legítimos usan cuentas de deploy delegadas) y revisa las plantillas ADCS con ESC1/ESC6 (Certify/Certipy las enumeran). Falso positivo típico: joins reales de usuarios con derechos delegados de OU — baseline por SubjectUserName.',
    relatedEventIds: [4720, 4742, 5136],
  },
  {
    id: 4756, name: 'Miembro añadido a grupo universal', log: 'Security',
    short: 'Se añadió un miembro a un grupo universal (Enterprise/Schema Admins).',
    description: 'Lo genera un DC cuando se añade una cuenta a un grupo de seguridad UNIVERSAL. Registra SubjectUserName (quién hizo el cambio), TargetUserName (el GRUPO universal), MemberSid/MemberName (la cuenta añadida — ojo: muchos SIEMs invierten estos campos). Los grupos universales son los más sensibles del bosque: Enterprise Admins y Schema Admins son universales y su modificación se replica a todo el Global Catalog.',
    detection: [
      { label: 'PowerShell — adhesiones a grupos universales', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4756} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Enterprise/Schema Admins', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4756} | Where-Object {$_.Message -match "Enterprise Admins|Schema Admins"} | Format-List TimeCreated, Message' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4756' },
    ],
    sigma: `title: Member Added to Universal Security Group
id: a87e8d9c-0f1a-4c2d-4e3f-5a6b7c8d9e0f
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4756
  filter:
    TargetUserName|contains:
      - 'Enterprise Admins'
      - 'Schema Admins'
  condition: selection and filter
fields:
  - SubjectUserName
  - TargetUserName
  - MemberSid
level: critical`,
    related: ['4728 (Miembro añadido a grupo global)', '4732 (Miembro añadido a grupo local)', '4720 (Usuario creado)', '4741 (Cuenta de equipo creada)'],
    analysis: 'Baseline: provisioning de acceso delegado a través del IAM, con SubjectUserName de cuentas de gestión y change tickets asociados — el volumen normal es bajo. Anomalía IR crítica: cualquier adhesión a Enterprise Admins o Schema Admins fuera de un cambio aprobado (son control total del forest: un miembro allí persiste aunque resetees Domain Admins); adhesión de una cuenta creada <24h antes (correlaciona 4720/4741); adhesión hecha por una cuenta recién comprometida (correlaciona los 4624 previos de ese SubjectUserName desde IPs raras); y uso de grupos universales de roles (Exchange/ADCS) para escalar lateralmente. Requiere derechos DA para ejecutarse: verlo significa que YA hay compromiso de dominio — escala a IR completo.',
    mitre: ['T1098', 'T1078.002', 'T1484'],
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
    id: 4778, name: 'Sesión RDP reconectada', log: 'Security',
    short: 'Una sesión RDP fue reconectada a una estación de window existente.',
    description: 'Lo genera cuando una sesión se RECONECTA a una Window Station ya existente (una sesión desconectada que alguien retoma). Registra SubjectUserName (la cuenta de la sesión), SessionName (p.ej. RDP-Tcp#5), ClientName (hostname del cliente que reconecta) y ClientAddress (IP desde la que reconecta). Es la firma del RDP session hijacking: con SYSTEM en un host RDS, tscon <SessionID> /dest:console permite reconectar a la sesión de OTRO usuario SIN conocer su contraseña.',
    detection: [
      { label: 'PowerShell — reconexiones RDP', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4778} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Reconexiones con cliente cambiado', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4778} | Select-Object TimeCreated, @{n="User";e={$_.Properties[1].Value}}, @{n="Client";e={$_.Properties[5].Value}}, @{n="IP";e={$_.Properties[6].Value}} | Format-Table' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4778' },
    ],
    related: ['4779 (Sesión RDP desconectada)', '4624 (Logon exitoso — Logon Type 10)', '4800 (Workstation bloqueada)', '4825 (Sesión RDP denegada)'],
    analysis: 'Baseline: el mismo usuario reconecta a SU sesión desde SU equipo (ClientName y ClientAddress estables y correlacionados con su máquina). Anomalía: reconexión a una sesión cuyo SubjectUserName no corresponde al cliente que reconecta (ClientName/ClientAddress nuevos o de otro usuario) = RDP hijacking con tscon (T1563.002): el atacante local con SYSTEM se apropia de la sesión desconectada de un admin y hereda su escritorio, aplicaciones y credenciales en memoria — sin generar un 4624 de logon nuevo. Caza comparando la identidad de la sesión original (el 4624 o el 4779 previo de la misma SessionName) contra la del 4778: cualquier cambio de identidad sobre la misma sesión es IR.',
    mitre: ['T1563.002', 'T1078'],
  },
  {
    id: 4779, name: 'Sesión RDP desconectada', log: 'Security',
    short: 'Una sesión RDP se desconectó (queda viva — objetivo de hijacking).',
    description: 'Lo genera cuando una sesión RDP se DESCONECTA sin logoff (el usuario cierra el cliente RDP pero la sesión sigue viva en el servidor con sus procesos y credenciales). Registra SubjectUserName, SessionName, ClientName y ClientAddress. Su valor es forense y preventivo: marca qué sesiones quedaron huérfanas — y una sesión desconectada de un usuario privilegiado es el objetivo directo del RDP session hijacking (4778).',
    detection: [
      { label: 'PowerShell — desconexiones RDP', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4779} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Sesiones desconectadas activas', cmd: 'qwinsta /counter | Select-String "Disc"' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4779' },
    ],
    related: ['4778 (Sesión RDP reconectada)', '4647 (Logoff iniciado por usuario)', '4624 (Logon exitoso)', '4800 (Workstation bloqueada)'],
    analysis: 'Baseline: usuarios que cierran el cliente al terminar la jornada — las sesiones se acumulan desconectadas hasta el timeout. Anomalía: desconexiones masivas de todas las sesiones de un servidor (toma del host o sabotaje); sesión de una cuenta privilegiada que queda desconectada durante días (superficie de hijacking: cualquier SYSTEM local puede robarla con tscon sin contraseña); y el patrón forense 4779 (se desconecta el admin) + 4778 (reconecta OTRO con la misma SessionName) = hijacking consumado. Mitigación operativa: GPO Set time limit for disconnected sessions corto (minutos, no horas).',
    mitre: ['T1563.002', 'T1078'],
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
    id: 4794, name: 'Reset de contraseña DSRM', log: 'Security',
    short: 'Se intentó resetear la contraseña del admin DSRM del DC (persistencia).',
    description: 'Lo genera un DC cuando alguien resetea la contraseña de la cuenta de administrador del Directory Services Restore Mode (DSRM — el Administrator local del DC para restauraciones offline). Registra SubjectUserName (quién lo ejecutó) y TargetUserName. Solo lo hace un Domain Admin con ntdsutil (set dsrm password). Es persistencia de máximo nivel: el DSRM es una cuenta LOCAL del DC, no depende del dominio y permite logon interactivo (Type 2) en el DC aunque se expulse al atacante del AD.',
    detection: [
      { label: 'PowerShell — resets DSRM', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4794} -MaxEvents 20 | Format-List TimeCreated, Message' },
      { label: 'Buscar uso del DSRM (logon Type 2 en DC)', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4624} -MaxEvents 1000 | Where-Object {$_.Message -match "Logon Type:\s+2" -and $_.Message -match "Administrator"} | Select-Object TimeCreated, Message -First 10' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4794' },
    ],
    sigma: `title: DSRM Administrator Password Reset - Domain Persistence
id: 976e8d9c-1a2b-4d3e-5f4a-6b7c8d9e0f1a
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4794
  condition: selection
fields:
  - SubjectUserName
  - TargetUserName
level: critical`,
    related: ['4724 (Password reset)', '4720 (Usuario creado)', '4611 (Trusted logon process)', '5136 (Objeto DS modificado)'],
    analysis: 'Baseline: NULO salvo recuperación documentada del DC con change record asociado (los DSRM resets solo ocurren en DR tests o mantenimiento del DC). Cualquier 4794 sin ticket = IR: es el playbook de persistencia post-compromiso de dominio — tras hacerse Domain Admin, el atacante resetea el DSRM del DC (ntdsutil o equivalentes de mimikatz) para garantizar una puerta trasera offline que sobrevive a resets de cuentas de dominio, parches de krbtgt y limpiezas de grupos. Confirmación activa: un 4624 Logon Type 2 en el DC con la cuenta Administrator LOCAL (no la del dominio) = el atacante ya usó el DSRM para entrar. Vigila también el registro DsrmAdminLogonBehavior en HKLM\\SYSTEM\\CurrentControlSet\\Control\\Lsa: subirlo a 1/2 habilita logon de red DSRM.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1098'],
    kql: 'SecurityEvent\n| where EventID == 4794\n| project TimeGenerated, Computer, SubjectUserName, TargetUserName, Activity',
    spl: 'index=windows EventCode=4794 | table _time, host, user, TargetUserName',
    threatHuntingNotes: 'Hunt 1: cualquier 4794 fuera de DR test documentado = persistencia de dominio (umbral cero). Hunt 2: busca 4624 Type 2 con Administrator local en DCs = uso consumado del DSRM. Hunt 3: audita el valor DsrmAdminLogonBehavior (HKLM\\SYSTEM\\CurrentControlSet\\Control\\Lsa) en todos los DCs — 1/2 = alguien habilitó logon de red DSRM. Hunt 4: si detectas el reset, asume golden ticket posible y ejecuta el playbook completo (doble reset krbtgt, revisión de dACLs, 4662 en los últimos 90 días).',
    relevantFields: ['EventID', 'SubjectUserSid', 'SubjectUserName', 'SubjectDomainName', 'SubjectLogonId', 'TargetUserName'],
    detectionTips: 'Evento de volumen nulo — alerta de umbral cero directamente al SOC. La contraseña DSRM debe rotarse tras cualquier IR de dominio: la clave vieja NO se invalida limpiando el AD. Monitoriza también el uso de ntdsutil en los 4688/Sysmon 1 de los DCs (ntdsutil.exe en CommandLine) — verás la ejecución que precedió al reset.',
    relatedEventIds: [4724, 4624, 4611],
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
    id: 4799, name: 'Membresía de grupo local enumerada', log: 'Security',
    short: 'Se enumeraron los miembros de un grupo local (recon — BloodHound/SharpHound).',
    description: 'Lo genera cuando un proceso enumera la membresía de un grupo de seguridad local (LsaEnumerateGroupMembership / SAM-R — lo que hace net localgroup administrators o la colección LocalGroup de SharpHound). Registra SubjectUserSid/SubjectUserName (quién pidió la enumeración), TargetUserName (el grupo enumerado), TargetSid, ProcessName y ProcessId. Requiere auditing de Security Group Management. SharpHound/BloodHound dispara miles de estos en minutos al recorrer todos los grupos de todos los hosts.',
    detection: [
      { label: 'PowerShell — enumeraciones de grupos locales', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4799} -MaxEvents 100 | Format-List TimeCreated, Message' },
      { label: 'Detectar ráfagas (recon masivo)', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4799; StartTime=(Get-Date).AddHours(-1)} | Group-Object {$_.Properties[1].Value} | Sort-Object Count -Descending | Select-Object -First 5' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 4799' },
    ],
    sigma: `title: Mass Local Group Membership Enumeration - BloodHound SharpHound
id: 865e7d8c-2b3c-4e4f-6a5b-7c8d9e0f1a2b
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4799
    TargetUserName|contains:
      - 'Administrators'
      - 'Remote Desktop Users'
  timeframe: 5m
  condition: selection | count() by SubjectUserName > 50
fields:
  - SubjectUserName
  - TargetUserName
  - ProcessName
level: high`,
    related: ['4798 (Grupos locales de un usuario enumerados)', '4662 (Operación en objeto DS)', '5145 (Acceso SMB)', '4624 (Logon exitoso — Type 3)'],
    analysis: 'Baseline: enumeraciones puntuales de admins (net localgroup), inventarios de gestión (SCCM y agentes) y procesos del sistema consultando membresías al logon — el patrón normal es pocas al día por host y siempre de los mismos binarios. Anomalía de alta fidelidad: RÁFAGAS de 4799 (>50 en minutos) sobre los grupos Administrators/Remote Desktop Users de muchos hosts, con SubjectUserName de usuario normal y ProcessName = SharpHound.exe, powershell.exe o un binario ofuscado — la colección LocalGroup de BloodHound/SharpHound mapeando rutas de escalada antes del movimiento lateral. El triple recon AD: 4799 (grupos locales) + 4662/4793 en el DC + 5145/5140 en los shares. Vigila también el 4798 (grupos DE un usuario) en los mismos hosts.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1069.001', 'T1069'],
    kql: 'SecurityEvent\n| where EventID == 4799\n| summarize Count=count() by SubjectUserName, ProcessName, bin(TimeGenerated, 5m)\n| where Count > 50\n| sort by Count desc',
    spl: 'index=windows EventCode=4799 | stats count as enum_count by user, ProcessName, host | where enum_count > 50 | sort - enum_count',
    threatHuntingNotes: 'Hunt 1: >50 enumeraciones de grupos locales en 5 min por el mismo SubjectUserName = SharpHound coleccionando. Hunt 2: ProcessName anómalo (binario sin firma, powershell desde %TEMP%) enumerando = tooling ad-hoc. Hunt 3: enumeración + 4624 Type 3 desde la misma IP hacia muchos hosts en minutos = recon remoto puro. Hunt 4: correlaciona con los eventos AD del DC en la misma ventana (4662, 4793) para dimensionar el alcance del recon. Hunt 5: la cuenta que enumera es la pivote — revisa su cadena de logon y bloquea si hay movimiento lateral posterior.',
    relevantFields: ['EventID', 'SubjectUserSid', 'SubjectUserName', 'SubjectDomainName', 'SubjectLogonId', 'TargetUserName', 'TargetSid', 'ProcessId', 'ProcessName'],
    detectionTips: 'Requiere auditar Security Group Management (success). El ruido base (logons normales consultando membresías) se filtra con threshold por ProcessName: allowlist de lsass.exe/svchost.exe y alerta sobre el resto. Falso positivo frecuente: herramientas de inventario legítimas (SCCM, Lansweeper) — baseline por ProcessName y horario.',
    relatedEventIds: [4798, 4662, 5145, 4624],
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
    id: 5136, name: 'Objeto de Directory Service modificado', log: 'Security',
    short: 'Se modificó un objeto de AD en el DC (GPOs, dACLs, SPNs, DCShadow).',
    description: 'Lo genera un DC cuando se modifica un objeto del Active Directory (requiere Advanced Audit Policy → Directory Service Changes). Registra SubjectUserName, ObjectServer=DS, ObjectName (DN del objeto), ObjectClass (user, group, groupPolicyContainer, domainDNS...), AttributeLDAPDisplayName (el atributo tocado: gPCMachineExtensionNames, nTSecurityDescriptor, servicePrincipalName, member...), OperationType (ValueAdded/ValueDeleted), Value (el dato escrito) y OpCorrelationID que agrupa la operación LDAP completa. Es EL evento de manipulación de AD: persistencia por GPO, delegaciones maliciosas, Kerberoast prep y DCShadow.',
    detection: [
      { label: 'PowerShell — modificaciones DS recientes', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=5136} -MaxEvents 100 | Format-List TimeCreated, Message' },
      { label: 'Modificación de GPOs', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=5136} | Where-Object {$_.Message -match "groupPolicyContainer|gPCMachineExtensionNames|gPCFileSysPath"} | Select-Object TimeCreated, Message -First 20' },
      { label: 'Delegación de replicación (DCSync prep)', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=5136} | Where-Object {$_.Message -match "1131f6ad|1131f6ac"} | Select-Object TimeCreated, Message -First 20' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 5136 (solo DCs)' },
    ],
    sigma: `title: Directory Service Object Modified - GPO or Security Descriptor
id: 754e6d7c-3c4d-4f5a-7b6c-8d9e0f1a2b3c
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 5136
    AttributeLDAPDisplayName|contains:
      - 'gPCMachineExtensionNames'
      - 'nTSecurityDescriptor'
      - 'servicePrincipalName'
      - 'msDS-KeyCredentialLink'
  condition: selection
fields:
  - SubjectUserName
  - ObjectName
  - ObjectClass
  - AttributeLDAPDisplayName
  - Value
level: high`,
    related: ['5141 (Objeto DS eliminado)', '5137 (Objeto DS creado)', '4662 (Operación en objeto DS — DCSync)', '4793 (Verificación de lockout)'],
    analysis: 'Baseline: provisioning por HR/IAM modificando atributos de usuarios (title, department, memberOf en OUs delegadas) y GPOs tocadas en ventanas de mantenimiento por cuentas de administración delegada — baseline por AttributeLDAPDisplayName y SubjectUserName. Anomalías de caza: (1) gPCMachineExtensionNames modificado en un groupPolicyContainer = edición de GPO para persistencia (T1484.001 — scripts de inicio/firewall de dominio, favorito de APTs para persistencia enterprise-wide); (2) nTSecurityDescriptor ValueAdded con GUIDs 1131f6ad/1131f6ac = preparación de DCSync delegado (el 4662 posterior será la consumación); (3) servicePrincipalName añadido a una cuenta normal = Kerberoast prep (espera el 4769 RC4); (4) msDS-KeyCredentialLink escrito = Shadow Credentials (persistencia con certificados); (5) objectClass/nTDSDSA tocados = DCShadow registrando un DC falso. El OpCorrelationID reconstruye la operación LDAP completa — úsalo para ver todos los atributos de la misma llamada.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1484.001', 'T1207', 'T1222.001', 'T1098'],
    kql: 'SecurityEvent\n| where EventID == 5136\n| where AttributeLDAPDisplayName in~ ("gPCMachineExtensionNames", "nTSecurityDescriptor", "servicePrincipalName", "msDS-KeyCredentialLink", "member")\n| project TimeGenerated, Computer, SubjectUserName, ObjectName, ObjectClass, AttributeLDAPDisplayName, OperationType, Value',
    spl: 'index=windows EventCode=5136 (AttributeLDAPDisplayName="gPCMachineExtensionNames" OR AttributeLDAPDisplayName="nTSecurityDescriptor" OR AttributeLDAPDisplayName="servicePrincipalName" OR AttributeLDAPDisplayName="msDS-KeyCredentialLink") | table _time, host, user, ObjectName, ObjectClass, AttributeLDAPDisplayName, OperationType, Value',
    threatHuntingNotes: 'Hunt 1: gPCMachineExtensionNames tocado fuera de ventana = edición de GPO para persistencia (cruza con 5145/4663 de SYSVOL: el payload se copia ahí). Hunt 2: nTSecurityDescriptor con GUIDs de replicación (1131f6ad/1131f6ac) = DCSync delegándose — el 4662 que sigue es el ataque. Hunt 3: servicePrincipalName nuevo en cuenta de usuario = Kerberoast prep (espera el 4769 RC4). Hunt 4: msDS-KeyCredentialLink = Shadow Credentials con ADCS. Hunt 5: SubjectUserName con derechos inusuales tocando objectClass nTDSDSA = DCShadow. Hunt 6: agrupa por OpCorrelationID para ver la operación LDAP completa de cada cambio.',
    relevantFields: ['EventID', 'SubjectUserSid', 'SubjectUserName', 'SubjectDomainName', 'SubjectLogonId', 'ObjectServer', 'ObjectName', 'ObjectClass', 'AttributeLDAPDisplayName', 'OperationType', 'Value', 'OpCorrelationID'],
    detectionTips: 'Volumen alto en DCs con provisioning activo: filtra por AttributeLDAPDisplayName de alto valor (el top son atributos rutinarios como pwdLastSet/lastLogon que puedes descartar). Requiere Directory Service Changes auditing (success) — la subcategoría está desactivada por defecto en muchos dominios: verifícala con auditpol. Compara el gPCFileSysPath del GPO con el contenido real de SYSVOL para ver el payload inyectado.',
    relatedEventIds: [5141, 4662, 4769, 4793],
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
    id: 5141, name: 'Objeto de Directory Service eliminado', log: 'Security',
    short: 'Se borró un objeto de AD (cuentas, GPOs, OUs — sabotaje/limpieza).',
    description: 'Lo genera un DC cuando se elimina un objeto del Active Directory (los objetos van a la papelera Deleted Objects si el AD Recycle Bin está activo). Registra SubjectUserName, ObjectDN, ObjectClass, ObjectGUID, DSName (la partición/Naming Context) y OpCorrelationID. Los borrados masivos son el sello del ransomware destructivo y del sabotaje interno; los quirúrgicos, de la limpieza anti-forense del atacante.',
    detection: [
      { label: 'PowerShell — objetos DS eliminados', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=5141} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Borrado de GPOs', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=5141} | Where-Object {$_.Message -match "groupPolicyContainer"} | Select-Object TimeCreated, Message -First 20' },
      { label: 'Papelera de AD (recuperación)', cmd: 'Get-ADObject -Filter {IsDeleted -eq $true} -IncludeDeletedObjects | Select-Object -First 20 Name, ObjectClass, WhenChanged' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 5141 (solo DCs)' },
    ],
    sigma: `title: Directory Service Object Deleted - GPO Container
id: 643e5d6c-4d5e-4a6b-8c7d-9e0f1a2b3c4d
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 5141
    ObjectClass: groupPolicyContainer
  condition: selection
fields:
  - SubjectUserName
  - ObjectDN
  - ObjectClass
level: high`,
    related: ['5136 (Objeto DS modificado)', '5137 (Objeto DS creado)', '4726 (Usuario eliminado)', '4662 (Operación en objeto DS)'],
    analysis: 'Baseline: lifecycle de cuentas (bajas de empleados ejecutadas por las cuentas de HR/IAM), limpieza documentada de OUs y grupos tras proyectos. Anomalía: borrado de GPOs de seguridad (apertura instantánea del dominio — firewall policies, AppLocker y restricciones de logon desaparecen al siguiente refresh); borrado en MASA de usuarios/grupos/computers en minutos = ransomware destructivo o wiper rompiendo la capacidad de recuperación (los operadores borran cuentas para destrozar el dominio); borrado del objeto que un 5137 creó <1h antes = el atacante limpiando su persistencia fallida; y borrado de objetos de auditoría/config para cegar detección. El OpCorrelationID agrupa la operación: un solo delete masivo LDAP genera miles de 5141 con el mismo correlation ID.',
    mitre: ['T1484.001', 'T1531'],
  },
  {
    id: 5142, name: 'Recurso compartido añadido', log: 'Security',
    short: 'Se creó un share de red en el host (staging de exfiltración).',
    description: 'Lo genera cuando alguien crea un recurso compartido de red (net share, New-SmbShare, Computer Management → Shared Folders). Registra SubjectUserName, ShareName y ShareLocalPath (la carpeta expuesta). Crear shares es poco frecuente en producción fuera de los file servers — y es la técnica favorita para montar staging de exfiltración: compartir una carpeta con el material sensible y leerla desde el host del atacante.',
    detection: [
      { label: 'PowerShell — shares creados', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=5142} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Shares actuales del host', cmd: 'Get-SmbShare | Select-Object Name, Path, Description' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 5142' },
    ],
    sigma: `title: Network Share Created on Workstation - Possible Exfiltration Staging
id: 532e4d5c-5e6f-4b7c-9d8e-0f1a2b3c4d5e
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 5142
  filter:
    ShareLocalPath|startswith:
      - 'C:\\Windows'
  condition: selection and not filter
fields:
  - SubjectUserName
  - ShareName
  - ShareLocalPath
level: medium`,
    related: ['5140 (Share accedido)', '5145 (Acceso a archivo por SMB)', '5143 (Share modificado)', '5144 (Share eliminado)'],
    analysis: 'Baseline: shares creados por IT en file servers durante mantenimiento y shares administrativos del SO (C$/ADMIN$/IPC$ ya existen — no generan 5142). Anomalía: share nuevo en una WORKSTATION (casi nunca es legítimo); ShareLocalPath apuntando a una carpeta de usuario o a un directorio de staging recién poblado; share OCULTO (nombre terminado en $) creado fuera de ventana — clásico de exfiltración y de ransomware recopilando datos antes de cifrar; y el par 5142 + 5145/5140 con reads masivos desde una IP externa rara = exfiltración en curso. Caza la secuencia completa: creación (5142) → acceso (5140) → reads masivos (5145) → borrado del share (5144) — la vida corta de un share es la firma del staging.',
    mitre: ['T1021.002', 'T1567'],
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
    id: 5154, name: 'Puerto en escucha permitido', log: 'Security',
    short: 'WFP permitió a una app escuchar en un puerto (bind listener).',
    description: 'Lo genera Windows Filtering Platform cuando una aplicación ENLAZA un puerto para escuchar y el firewall lo PERMITE. Registra Application (ruta del binario que escucha), SourceAddress (interfaz), SourcePort, Protocol y FilterRTID. Diferencia con 5156 (conexión establecida): el 5154 dispara ANTES de cualquier conexión — es la alerta temprana de que algo abrió un listener (bind shell, C2 inverso entrante, tunelización).',
    detection: [
      { label: 'PowerShell — listeners permitidos', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=5154} -MaxEvents 100 | Format-List TimeCreated, Message' },
      { label: 'Listeners activos ahora', cmd: 'netstat -ano | Select-String "LISTENING" | Select-Object -First 20' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 5154' },
    ],
    sigma: `title: Suspicious Application Listening on Non-Standard Port
id: 421e3d4c-6f7a-4c8d-0e9f-1a2b3c4d5e6f
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 5154
    Application|contains:
      - '\\AppData\\'
      - '\\Users\\Public\\'
      - '\\Temp\\'
      - '\\ProgramData\\'
  condition: selection
fields:
  - Application
  - SourceAddress
  - SourcePort
  - Protocol
level: high`,
    related: ['5156 (Conexión WFP permitida)', '5157 (Conexión WFP bloqueada)', '5031 (Firewall bloqueó app)', '3 (Sysmon — conexión de red)'],
    analysis: 'Baseline: servicios del SO y apps de servidor escuchando (binarios de System32/Program Files, puertos conocidos: 445, 135, 3389, 1433...). Anomalía: Application en rutas de usuario (%APPDATA%, %TEMP%, C:\\Users\\Public) escuchando en CUALQUIER puerto = bind shell o C2 (meterpreter bind_tcp, Cobalt Strike bind); puertos clásicos de tooling (4444, 5555, 8080, 9999 — defaults de Metasploit); binarios de Office o navegadores escuchando (abuso de apps legítimas para tunelizar); y listeners en 0.0.0.0 (todas las interfaces — SourceAddress 0.0.0.0) para binarios de usuario = exposición directa a la red. Golden signal: 5154 con Application sospechosa + 5156 Inbound aceptada en el mismo puerto poco después = alguien ya se conectó al implant.',
    mitre: ['T1571', 'T1095'],
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
    id: 5382, name: 'Credenciales del Vault leídas', log: 'Security',
    short: 'Un proceso leyó credenciales del Windows Vault (Credential Manager).',
    description: 'Lo genera cuando un proceso lee credenciales almacenadas en el Windows Vault (el backend del Credential Manager: credenciales web, de Windows y de dominio guardadas — las que ves en Panel de Control → Credential Manager). Registra SubjectUserName, ProcessCreationTime, ProcessId y ProcessName. El proceso legítimo por excelencia es el logon con autologon (winlogon/svchost leyendo la credencial por defecto); cualquier OTRO binario leyendo el vault es candidato a robo de credenciales guardadas.',
    detection: [
      { label: 'PowerShell — lecturas del vault', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=5382} -MaxEvents 50 | Format-List TimeCreated, Message' },
      { label: 'Lecturas por procesos no del sistema', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=5382} | Where-Object {$_.Message -notmatch "svchost|winlogon|lsass|explorer"} | Format-List TimeCreated, Message' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 5382' },
    ],
    sigma: `title: Windows Vault Credentials Read by Suspicious Process
id: 310e2d3c-7a8b-4d9e-1f0a-2b3c4d5e6f7a
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 5382
  filter:
    ProcessName|endswith:
      - '\\svchost.exe'
      - '\\winlogon.exe'
      - '\\lsass.exe'
      - '\\explorer.exe'
  condition: selection and not filter
fields:
  - SubjectUserName
  - ProcessName
  - ProcessId
level: high`,
    related: ['5379 (Credential Manager accedido)', '5376 (Credenciales respaldadas)', '10 (Sysmon — LSASS dump)', '4688 (Proceso creado)'],
    analysis: 'Baseline: procesos del sistema leyendo el vault durante el logon (autologon lee la credencial por defecto guardada) y gestores de credenciales legítimos (explorer, svchost). Anomalía: cualquier otro binario leyendo el vault — tooling de robo de credenciales guardadas (mimikatz vault::cred, SharpDPAPI, LaZagne, SessionGopher) que luego descifra los blobs con la masterkey DPAPI del usuario; powershell.exe de forma inesperada (scripts de colección de credenciales); y lecturas masivas en un solo host (el atacante recolectando todos los vaults del usuario antes de moverse). Complementa al 5379 (acceso al Credential Manager): el 5382 es más fino para el vault y casi todo su tráfico legítimo viene de 4 procesos del sistema — cualquier otro nombre es señal.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1555.004', 'T1555'],
    kql: 'SecurityEvent\n| where EventID == 5382\n| where ProcessName !endswith "\\svchost.exe" and ProcessName !endswith "\\winlogon.exe" and ProcessName !endswith "\\lsass.exe" and ProcessName !endswith "\\explorer.exe"\n| project TimeGenerated, Computer, SubjectUserName, ProcessName, ProcessId',
    spl: 'index=windows EventCode=5382 NOT (ProcessName="*\\svchost.exe" OR ProcessName="*\\winlogon.exe" OR ProcessName="*\\lsass.exe" OR ProcessName="*\\explorer.exe") | table _time, host, user, ProcessName, ProcessId',
    threatHuntingNotes: 'Hunt 1: 5382 con ProcessName fuera de (svchost, winlogon, lsass, explorer) = robo de credenciales guardadas. Hunt 2: correlaciona con Sysmon EID 1 — el cmdline del proceso leedor revela la tooling (SharpDPAPI.exe, powershell con -enc). Hunt 3: lecturas seguidas de conexiones SMB/WinRM a otros hosts (5140/4624 Type 3) = las credenciales robadas ya se usan para movimiento lateral. Hunt 4: en hosts de admins: sus vaults contienen credenciales de infraestructura — prioridad máxima. Hunt 5: revisa 5376/5379 en la misma ventana para dimensionar qué más tocó el Credential Manager.',
    relevantFields: ['EventID', 'SubjectUserSid', 'SubjectUserName', 'SubjectDomainName', 'SubjectLogonId', 'ProcessCreationTime', 'ProcessId', 'ProcessName'],
    detectionTips: 'Volumen bajo — apto para alerta directa con allowlist de 4 procesos. Los blobs del vault están cifrados con DPAPI: el robo real es (lectura 5382) + (masterkey DPAPI leída: caza Sysmon 10 sobre lsass o acceso a %APPDATA%\\Microsoft\\Protect). Mitigación: deshabilita el guardado de credenciales por GPO (Network access: Do not allow storage of passwords and credentials for network authentication) y prohíbe autologon en hosts corporativos.',
    relatedEventIds: [5379, 10, 4688],
  },
  {
    id: 6273, name: 'Autenticación de red (NPS/RADIUS)', log: 'Security',
    short: 'El NPS evaluó una autenticación RADIUS — VPN y 802.1X (brute force).',
    description: 'Lo genera un servidor NPS (Network Policy Server) al evaluar una petición RADIUS: VPN (SSTP/IKEv2/L2TP), WiFi/cableado 802.1X y cualquier NAS que delegue la autenticación. Registra SubjectUserName, CalledStationID (el NAS/servidor VPN), CallingStationID (IP o MAC del cliente), NASPortType (VPN, IEEE 802.11, Ethernet), NetworkPolicyName (la policy que se aplicó) y Reason/ReasonCode del resultado (16 = credenciales inválidas, 8 = cuenta inexistente). Requiere auditing de Network Policy Server (éxito y fallo). Es EL evento para vigilar el perímetro de acceso remoto.',
    detection: [
      { label: 'PowerShell — autenticaciones NPS', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=6273} -MaxEvents 100 | Format-List TimeCreated, Message' },
      { label: 'Fallos con credenciales inválidas (Reason 16)', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=6273} | Where-Object {$_.Message -match "Reason Code:\s+16"} | Select-Object TimeCreated, Message -First 30' },
      { label: 'wevtutil — CLI nativa', cmd: 'wevtutil qe Security /q:"*[System[(EventID=6273)]]" /c:50 /rd:true /f:text' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Windows Logs → Security → Filter → Event ID 6273 (en servidores NPS)' },
    ],
    sigma: `title: NPS RADIUS Brute Force - Multiple Failures from Single Source
id: 200e1d2c-8b9c-4e0f-2a1b-3c4d5e6f7a8b
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 6273
    ReasonCode: 16
  timeframe: 10m
  condition: selection | count() by CallingStationID > 20
fields:
  - SubjectUserName
  - CallingStationID
  - NASPortType
  - NetworkPolicyName
level: high`,
    related: ['4625 (Logon fallido)', '4624 (Logon exitoso)', '4771 (Pre-auth Kerberos fallida)', '4776 (NTLM)'],
    analysis: 'Baseline: autenticaciones desde el rango de la VPN corporativa con NASPortType VPN, usuarios y CallingStationID conocidos, picos a primera hora de la mañana. Anomalía: miles de 6273 ReasonCode 16 desde un único CallingStationID = brute force contra la VPN expuesta (ataque número uno contra SSL VPNs); password spraying (una contraseña contra MUCHOS usuarios desde la misma IP, sin disparar lockouts); ReasonCode 8 masivo = enumeración de usuarios válidos; y el happy path del atacante: ráfaga de fallos → un 6273 success con NetworkPolicyName de acceso completo desde una IP nunca vista = cuenta VPN comprometida (correlaciona inmediatamente con la actividad 4624/4768 de esa cuenta después). Vigila también la NetworkPolicyName asignada en los success: policies de acceso total aplicadas a usuarios que no deberían tenerlas = abuso de misconfiguración del NPS.',
    // ─── BLOQUE 3 — MITRE/Sigma/KQL/SPL ───
    mitre: ['T1110.003', 'T1133', 'T1078'],
    kql: 'SecurityEvent\n| where EventID == 6273\n| summarize FailCount=count() by Account, IpAddress, bin(TimeGenerated, 10m)\n| where FailCount > 20\n| sort by FailCount desc',
    spl: 'index=windows EventCode=6273 | stats count as fails by user, src_ip | where fails > 20 | sort - fails',
    threatHuntingNotes: 'Hunt 1: >20 fallos ReasonCode 16 desde un CallingStationID en 10 min = brute force VPN. Hunt 2: password spraying — muchas CUENTAS distintas fallando desde la misma IP con 1-2 intentos cada una. Hunt 3: geo/IP: success desde países o ASN sin presencia corporativa (enriquece CallingStationID con geoip). Hunt 4: ReasonCode 8 (cuenta inexistente) en ráfaga = user enumeration contra el NPS. Hunt 5: tras cada success anómalo, sigue a la cuenta: sus 4624/4768/5140 posteriores pintan el movimiento lateral desde la VPN.',
    relevantFields: ['EventID', 'SubjectUserSid', 'SubjectUserName', 'SubjectDomainName', 'FullyQualifiedSubjectMachineName', 'CalledStationID', 'CallingStationID', 'NASIdentifier', 'NASPortType', 'ClientFriendlyName', 'ClientIPAddress', 'NetworkPolicyName', 'ReasonCode', 'Reason'],
    detectionTips: 'Requiere habilitar el auditing de Network Policy Server (success+failure) en el servidor NPS — muchas orgs solo loguean failures y pierden el happy path del atacante. Correlaciona el 6273 success con el MFA: si tu VPN exige MFA, un success sin evento MFA asociado (en los logs del proveedor) es acceso sin segundo factor. Una geo-allowlist del CallingStationID reduce el ruido del brute force de internet.',
    relatedEventIds: [4625, 4624, 4771, 4776],
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
    id: 6420, name: 'Dispositivo deshabilitado', log: 'Microsoft-Windows-Kernel-PnP/Configuration',
    short: 'Un dispositivo PnP quedó deshabilitado en el host.',
    description: 'Lo genera el canal Kernel-PnP/Configuration cuando un dispositivo queda deshabilitado (Device Manager → Disable device, o Disable-PnpDevice en PowerShell). Registra el DeviceId, la descripción y la clase del dispositivo (DiskDrive, Net, Camera, USB...). Junto al 6421 (habilitado) forma el timeline de manipulación de hardware del host — relevante para DLP, control de dispositivos y hardening.',
    detection: [
      { label: 'PowerShell — dispositivos deshabilitados', cmd: 'Get-WinEvent -LogName "Microsoft-Windows-Kernel-PnP/Configuration" -MaxEvents 100 | Where-Object Id -eq 6420 | Format-List TimeCreated, Message' },
      { label: 'Dispositivos con error/deshabilitados ahora', cmd: 'Get-PnpDevice | Where-Object Status -eq "Error" | Select-Object FriendlyName, Class, InstanceId' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Applications and Services Logs → Microsoft → Windows → Kernel-PnP → Configuration → Filter → Event ID 6420' },
    ],
    related: ['6416 (Dispositivo reconocido)', '6421 (Dispositivo habilitado)', '6417 (Instalación de dispositivo bloqueada)'],
    analysis: 'Baseline: deshabilitaciones automáticas por políticas de hardening (bloqueo de webcams/USB por GPO o Intune en el arranque) y admins deshabilitando hardware roto con ticket. Anomalía: deshabilitación de dispositivos de red o de almacenamiento justo antes de actividad extraña (el atacante manipula el stack para forzar errores del agente o evadir controles periféricos); deshabilitación repetida de un dispositivo de seguridad (p.ej. un token HSM o un lector con device control); y el par 6420→6421 en ráfaga sobre el mismo DeviceId = probing de la política de device control (el usuario o el malware intenta re-habilitar lo bloqueado — la secuencia completa se ve con 6417+6420+6421+6416).',
  },
  {
    id: 6421, name: 'Dispositivo habilitado', log: 'Microsoft-Windows-Kernel-PnP/Configuration',
    short: 'Un dispositivo PnP fue habilitado en el host.',
    description: 'Lo genera el canal Kernel-PnP/Configuration cuando un dispositivo se habilita (Device Manager → Enable device, o Enable-PnpDevice en PowerShell). Registra el DeviceId, la descripción y la clase. Es el evento de reactivación: lo típico es un usuario (o malware con derechos) re-habilitando un USB o un dispositivo que la política de device control había bloqueado/deshabilitado.',
    detection: [
      { label: 'PowerShell — dispositivos habilitados', cmd: 'Get-WinEvent -LogName "Microsoft-Windows-Kernel-PnP/Configuration" -MaxEvents 100 | Where-Object Id -eq 6421 | Format-List TimeCreated, Message' },
      { label: 'Event Viewer path', cmd: 'Event Viewer → Applications and Services Logs → Microsoft → Windows → Kernel-PnP → Configuration → Filter → Event ID 6421' },
    ],
    related: ['6420 (Dispositivo deshabilitado)', '6416 (Dispositivo reconocido)', '6417 (Instalación de dispositivo bloqueada)'],
    analysis: 'Baseline: habilitaciones en hardening inicial o levantamiento de incidencias documentadas. Anomalía: 6421 sobre un Mass Storage/USB que había sido bloqueado por la política (correlaciona el DeviceId con el 6417 de instalación bloqueada y el 6420 previo) = evasión del device control; habilitación hecha por un usuario sin permisos delegados o fuera de horario; y la secuencia de exfiltración por USB: 6417 (bloqueado) → 6421 (habilitado a mano) → 6416 (reconocido) → 4656/4663 masivos (copia de archivos) → 6420 (vuelven a deshabilitar para no dejar rastro). Un USB que se habilita y deshabilita en la misma hora casi nunca es uso legítimo.',
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
