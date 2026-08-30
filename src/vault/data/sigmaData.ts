/**
 * sigmaData.ts — Dataset LOCAL de reglas Sigma para el "Sigma Explorer" de VaultNotes.
 *
 * 100% offline. NO descarga reglas de github.com/SigmaHQ.
 * Las reglas fueron curadas manualmente como ejemplos representativos de detección SOC.
 * Calidad sobre cantidad: 28 reglas cubriendo los escenarios más comunes.
 *
 * Cada regla incluye: id, title, status, description, author, date, level, logsource,
 * detection (objeto con selectors y condition), tags, mitre (array de IDs MITRE),
 * yaml (string YAML canónico para mostrar + copy).
 *
 * Diseñado para ampliarse: solo agregar entradas al array SIGMA_RULES.
 *
 * Exporta la interfaz `SigmaRule`, el array `SIGMA_RULES`, los arrays de enums
 * `SIGMA_LEVELS` y `SIGMA_STATUSES`, y el helper `findSigmaById`.
 * NO usa `export default`.
 */

export type SigmaLevel = 'critical' | 'high' | 'medium' | 'low' | 'informational';
export type SigmaStatus = 'stable' | 'test' | 'experimental' | 'deprecated';

export interface SigmaDetectionField {
  /** ej: "EventID" o "CommandLine" o "Image" */
  field: string;
  /** valores a matchear */
  values: string[];
  /** tipo de match — '*' = equals, 'contains|' = contains-any, 'startswith|' = starts-with */
  modifier?: string;
}

export interface SigmaDetection {
  /** Reglas de selección — cada objeto en el array es un selector ANDed internamente. */
  selectors: SigmaDetectionField[][];
  /** Condición lógica: "selection1", "selection1 and selection2", "selection1 or selection2" */
  condition: string;
  /** Opcional: time window para aggregation (ej: 5m) */
  timeframe?: string;
}

export interface SigmaRule {
  /** ID único, ej: "sigma-failed-logon-4625" */
  id: string;
  /** UUID-style del yaml */
  uuid?: string;
  title: string;
  status: SigmaStatus;
  description: string;
  author: string;
  /** ISO date string "2024/01/15" */
  date: string;
  level: SigmaLevel;
  /** Log source — object with category/product/service */
  logsource: {
    product?: string;
    category?: string;
    service?: string;
  };
  detection: SigmaDetection;
  /** MITRE technique IDs referenced */
  mitre: string[];
  /** Sigma YAML tags */
  tags: string[];
  /** Related Windows Event IDs (for cross-link) */
  eventIds?: number[];
  /** Example KQL query equivalent */
  kql?: string;
  /** Example SPL query equivalent */
  spl?: string;
  /** Full YAML string for display/copy */
  yaml: string;
}

export const SIGMA_LEVELS: SigmaLevel[] = ['critical', 'high', 'medium', 'low', 'informational'];
export const SIGMA_STATUSES: SigmaStatus[] = ['stable', 'test', 'experimental', 'deprecated'];

export const SIGMA_RULES: SigmaRule[] = [
  /* ── Failed logon 4625 ────────────────────────────────────────── */
  {
    id: 'sigma-failed-logon-4625',
    uuid: '8e87ed91-8a1f-4a3b-9a2c-1c0b8e3f5a7d',
    title: 'Failed Logon — Multiple Attempts',
    status: 'stable',
    description: 'Detecta múltiples intentos fallidos de autenticación (Event ID 4625) en un período corto — indicador de brute force o password spraying.',
    author: 'VaultNotes',
    date: '2024/01/15',
    level: 'medium',
    logsource: { product: 'windows', service: 'security' },
    detection: {
      selectors: [[{ field: 'EventID', values: ['4625'] }]],
      condition: 'selection | count(*) by TargetUserName > 5',
      timeframe: '5m',
    },
    mitre: ['T1110.001', 'T1110.003'],
    tags: ['attack.credential_access', 'attack.t1110.001', 'attack.t1110.003'],
    eventIds: [4625, 4771, 4776],
    kql: 'SecurityEvent\n| where EventID == 4625\n| summarize count() by Account, IpAddress, bin(TimeGenerated, 5m)\n| where count_ > 5',
    spl: 'index=windows EventCode=4625 | stats count by user, src_ip, date_minute | where count > 5',
    yaml: `title: Failed Logon — Multiple Attempts
id: 8e87ed91-8a1f-4a3b-9a2c-1c0b8e3f5a7d
status: stable
description: Detecta múltiples intentos fallidos de autenticación (Event ID 4625) en un período corto — indicador de brute force o password spraying.
author: VaultNotes
date: 2024/01/15
level: medium
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4625
  condition: selection | count(*) by TargetUserName > 5
  timeframe: 5m
fields:
  - EventID
  - TargetUserName
  - IpAddress
  - LogonType
falsepositives:
  - Usuarios que olvidan su password ocasionalmente
  - Aplicaciones con credenciales caducadas
tags:
  - attack.credential_access
  - attack.t1110.001
  - attack.t1110.003
  - attack.initial_access
mitre:
  - T1110.001
  - T1110.003`,
  },

  /* ── Successful logon after failures 4624 ────────────────────── */
  {
    id: 'sigma-success-after-fail-logon',
    uuid: '9f87ed91-8a1f-4a3b-9a2c-1c0b8e3f5a7d',
    title: 'Successful Logon Following Failed Attempts',
    status: 'stable',
    description: 'Detecta un logon exitoso (4624) precedido por 5+ intentos fallidos (4625) en 10 minutos — patrón clásico de brute force exitoso.',
    author: 'VaultNotes',
    date: '2024/01/15',
    level: 'high',
    logsource: { product: 'windows', service: 'security' },
    detection: {
      selectors: [
        [{ field: 'EventID', values: ['4624'] }],
        [{ field: 'EventID', values: ['4625'] }],
      ],
      condition: 'success | count(failed) by TargetUserName, IpAddress > 5',
      timeframe: '10m',
    },
    mitre: ['T1110.001', 'T1078'],
    tags: ['attack.credential_access', 'attack.t1110.001', 'attack.t1078', 'attack.initial_access'],
    eventIds: [4624, 4625],
    kql: 'let failed = SecurityEvent | where EventID == 4625 | summarize count() by Account, IpAddress, bin(TimeGenerated, 10m);\nlet ok = SecurityEvent | where EventID == 4624 | summarize by Account, IpAddress, bin(TimeGenerated, 10m);\nok | join failed on Account, IpAddress | where count_ > 5',
    spl: '`windows` (EventCode=4624 OR EventCode=4625) | stats count(eval(EventCode=4625)) as fails by user, src_ip, _time | where fails > 5 AND EventCode=4624',
    yaml: `title: Successful Logon Following Failed Attempts
id: 9f87ed91-8a1f-4a3b-9a2c-1c0b8e3f5a7d
status: stable
description: Detecta un logon exitoso (4624) precedido por 5+ intentos fallidos (4625) en 10 minutos — patrón clásico de brute force exitoso.
author: VaultNotes
date: 2024/01/15
level: high
logsource:
  product: windows
  service: security
detection:
  selection_success:
    EventID: 4624
  selection_failed:
    EventID: 4625
  condition: selection_success | count(selection_failed) by TargetUserName, IpAddress > 5
  timeframe: 10m
fields:
  - EventID
  - TargetUserName
  - IpAddress
  - LogonType
falsepositives:
  - Usuario que olvidó su password y finalmente lo escribió correctamente
tags:
  - attack.credential_access
  - attack.t1110.001
  - attack.t1078
  - attack.initial_access
mitre:
  - T1110.001
  - T1078`,
  },

  /* ── PowerShell encoded command 4104 ─────────────────────────── */
  {
    id: 'sigma-powershell-encoded-command',
    uuid: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    title: 'PowerShell Encoded Command Execution',
    status: 'stable',
    description: 'Detecta ejecución de PowerShell con flag -EncodedCommand / -enc — indicador clásico de ofuscación de payload y evasión de AV.',
    author: 'VaultNotes',
    date: '2024/01/15',
    level: 'high',
    logsource: { product: 'windows', category: 'process_creation' },
    detection: {
      selectors: [
        [
          { field: 'Image', values: ['*\\powershell.exe', '*\\pwsh.exe'] },
          { field: 'CommandLine', values: ['*-EncodedCommand*', '*-enc *', '*-enc*', '* -e *'] },
        ],
      ],
      condition: 'selection',
    },
    mitre: ['T1059.001', 'T1027', 'T1027.010'],
    tags: ['attack.execution', 'attack.t1059.001', 'attack.defense_evasion', 'attack.t1027', 'attack.t1027.010'],
    eventIds: [4104, 4103, 4688],
    kql: 'DeviceProcessEvents\n| where FolderPath endswith "\\\\powershell.exe" or FolderPath endswith "\\\\pwsh.exe"\n| where ProcessCommandLine has_any ("-EncodedCommand", "-enc ")\n| project TimeGenerated, DeviceName, AccountName, ProcessCommandLine',
    spl: 'index=windows Image=*powershell.exe OR Image=*pwsh.exe CommandLine="*-EncodedCommand*" OR CommandLine="*-enc *" | table _time, host, user, CommandLine',
    yaml: `title: PowerShell Encoded Command Execution
id: a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d
status: stable
description: Detecta ejecución de PowerShell con flag -EncodedCommand / -enc — indicador clásico de ofuscación de payload y evasión de AV.
author: VaultNotes
date: 2024/01/15
level: high
logsource:
  product: windows
  category: process_creation
detection:
  selection:
    Image|endswith:
      - '\\\\powershell.exe'
      - '\\\\pwsh.exe'
    CommandLine|contains:
      - '-EncodedCommand'
      - '-enc '
      - ' -e '
      - ' -ec '
  condition: selection
fields:
  - Image
  - CommandLine
  - User
falsepositives:
  - Scripts administrativos legítimos (raros — revisar contexto)
tags:
  - attack.execution
  - attack.t1059.001
  - attack.defense_evasion
  - attack.t1027
  - attack.t1027.010
mitre:
  - T1059.001
  - T1027
  - T1027.010`,
  },

  /* ── PowerShell hidden window ────────────────────────────────── */
  {
    id: 'sigma-powershell-hidden-window',
    uuid: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    title: 'PowerShell Hidden Window',
    status: 'stable',
    description: 'Detecta PowerShell ejecutando con ventana oculta (-WindowStyle Hidden / -w hidden) — técnica clásica de evasión para que el usuario no vea la consola.',
    author: 'VaultNotes',
    date: '2024/01/15',
    level: 'high',
    logsource: { product: 'windows', category: 'process_creation' },
    detection: {
      selectors: [
        [
          { field: 'Image', values: ['*\\powershell.exe', '*\\pwsh.exe'] },
          { field: 'CommandLine', values: ['*-WindowStyle Hidden*', '* -w hidden*', '* -w 1*'] },
        ],
      ],
      condition: 'selection',
    },
    mitre: ['T1059.001', 'T1564.003'],
    tags: ['attack.execution', 'attack.t1059.001', 'attack.defense_evasion', 'attack.t1564.003'],
    eventIds: [4104, 4103, 4688],
    kql: 'DeviceProcessEvents\n| where FolderPath endswith "\\\\powershell.exe"\n| where ProcessCommandLine has_any ("-WindowStyle Hidden", "-w hidden", "-w 1")\n| project TimeGenerated, DeviceName, AccountName, ProcessCommandLine',
    spl: 'index=windows Image=*powershell.exe CommandLine="*-WindowStyle Hidden*" OR CommandLine="*-w hidden*" | table _time, host, user, CommandLine',
    yaml: `title: PowerShell Hidden Window
id: b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e
status: stable
description: Detecta PowerShell ejecutando con ventana oculta (-WindowStyle Hidden / -w hidden) — técnica clásica de evasión para que el usuario no vea la consola.
author: VaultNotes
date: 2024/01/15
level: high
logsource:
  product: windows
  category: process_creation
detection:
  selection:
    Image|endswith:
      - '\\\\powershell.exe'
      - '\\\\pwsh.exe'
    CommandLine|contains:
      - '-WindowStyle Hidden'
      - '-w hidden'
      - '-w 1'
  condition: selection
fields:
  - Image
  - CommandLine
  - User
falsepositives:
  - Scripts de deployment que ocultan consola legítimamente
tags:
  - attack.execution
  - attack.t1059.001
  - attack.defense_evasion
  - attack.t1564.003
mitre:
  - T1059.001
  - T1564.003`,
  },

  /* ── Process creation 4688 ─────────────────────────────────── */
  {
    id: 'sigma-process-creation-suspicious-parent',
    uuid: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
    title: 'Suspicious Process Parent — Office Spawning cmd/PowerShell',
    status: 'stable',
    description: 'Detecta procesos Office (winword, excel, outlook) spawn cmd.exe o powershell.exe — patrón clásico de macro maliciosa o exploit de documento.',
    author: 'VaultNotes',
    date: '2024/01/15',
    level: 'critical',
    logsource: { product: 'windows', category: 'process_creation' },
    detection: {
      selectors: [
        [
          { field: 'ParentImage', values: ['*\\winword.exe', '*\\excel.exe', '*\\outlook.exe', '*\\powerpnt.exe'] },
          { field: 'Image', values: ['*\\cmd.exe', '*\\powershell.exe', '*\\pwsh.exe', '*\\wscript.exe', '*\\mshta.exe'] },
        ],
      ],
      condition: 'selection',
    },
    mitre: ['T1059.001', 'T1059.003', 'T1204.002', 'T1566.001'],
    tags: ['attack.execution', 'attack.t1059.001', 'attack.t1059.003', 'attack.t1204.002', 'attack.initial_access', 'attack.t1566.001'],
    eventIds: [4688, 1],
    kql: 'DeviceProcessEvents\n| where InitiatingProcessFileName in~ ("winword.exe", "excel.exe", "outlook.exe", "powerpnt.exe")\n| where FileName in~ ("cmd.exe", "powershell.exe", "pwsh.exe", "wscript.exe", "mshta.exe")\n| project TimeGenerated, DeviceName, AccountName, InitiatingProcessFileName, FileName, ProcessCommandLine',
    spl: 'index=windows (ParentImage=*winword.exe OR ParentImage=*excel.exe OR ParentImage=*outlook.exe OR ParentImage=*powerpnt.exe) (Image=*cmd.exe OR Image=*powershell.exe OR Image=*wscript.exe OR Image=*mshta.exe) | table _time, host, user, ParentImage, Image, CommandLine',
    yaml: `title: Suspicious Process Parent — Office Spawning cmd/PowerShell
id: c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f
status: stable
description: Detecta procesos Office (winword, excel, outlook) spawn cmd.exe o powershell.exe — patrón clásico de macro maliciosa o exploit de documento.
author: VaultNotes
date: 2024/01/15
level: critical
logsource:
  product: windows
  category: process_creation
detection:
  selection:
    ParentImage|endswith:
      - '\\\\winword.exe'
      - '\\\\excel.exe'
      - '\\\\outlook.exe'
      - '\\\\powerpnt.exe'
    Image|endswith:
      - '\\\\cmd.exe'
      - '\\\\powershell.exe'
      - '\\\\pwsh.exe'
      - '\\\\wscript.exe'
      - '\\\\mshta.exe'
  condition: selection
fields:
  - ParentImage
  - Image
  - CommandLine
  - User
falsepositives:
  - Raro — investigar siempre. Add-ins legítimos de Office casi nunca spawn cmd.
tags:
  - attack.execution
  - attack.t1059.001
  - attack.t1059.003
  - attack.t1204.002
  - attack.initial_access
  - attack.t1566.001
mitre:
  - T1059.001
  - T1059.003
  - T1204.002
  - T1566.001`,
  },

  /* ── New service creation 7045 ────────────────────────────────── */
  {
    id: 'sigma-new-service-7045',
    uuid: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
    title: 'New Windows Service Installed',
    status: 'stable',
    description: 'Detecta la creación de un nuevo servicio de Windows (Event ID 7045) — técnica común de persistencia + privilege escalation. Mirar paths en Downloads, %TEMP%, binarios sin firma.',
    author: 'VaultNotes',
    date: '2024/01/15',
    level: 'medium',
    logsource: { product: 'windows', service: 'system' },
    detection: {
      selectors: [
        [{ field: 'EventID', values: ['7045'] }],
      ],
      condition: 'selection AND NOT filter_legitimate',
    },
    mitre: ['T1543.003', 'T1547.001'],
    tags: ['attack.persistence', 'attack.t1543.003', 'attack.privilege_escalation', 'attack.t1547.001'],
    eventIds: [7045, 4697],
    kql: 'SecurityEvent\n| where EventID == 4697 or EventID == 7045\n| where ServiceFileName !endswith ".exe" or ServiceFileName contains "Downloads" or ServiceFileName contains "Temp"\n| project TimeGenerated, Computer, ServiceName, ServiceFileName, ServiceStartType, Account',
    spl: 'index=windows (EventCode=7045 OR EventCode=4697) (ImagePath=*Downloads* OR ImagePath=*Temp*) | table _time, host, ServiceName, ImagePath, user',
    yaml: `title: New Windows Service Installed
id: d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a
status: stable
description: Detecta la creación de un nuevo servicio de Windows (Event ID 7045) — técnica común de persistencia + privilege escalation. Mirar paths en Downloads, %TEMP%, binarios sin firma.
author: VaultNotes
date: 2024/01/15
level: medium
logsource:
  product: windows
  service: system
detection:
  selection:
    EventID: 7045
  filter_legitimate:
    ServiceFileName|startswith:
      - 'C:\\\\Windows\\\\'
      - 'C:\\\\Program Files\\\\'
  condition: selection AND NOT filter_legitimate
fields:
  - EventID
  - ServiceName
  - ServiceFileName
  - ServiceType
  - AccountName
falsepositives:
  - Instaladores legítimos de software (crear servicios es normal)
  - Antivirus updates
tags:
  - attack.persistence
  - attack.t1543.003
  - attack.privilege_escalation
  - attack.t1547.001
mitre:
  - T1543.003
  - T1547.001`,
  },

  /* ── Scheduled task creation 4698 ────────────────────────────── */
  {
    id: 'sigma-scheduled-task-created-4698',
    uuid: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
    title: 'Scheduled Task Created',
    status: 'stable',
    description: 'Detecta la creación de una tarea programada (Event ID 4698) — mecanismo clásico de persistencia. Mirar tareas que ejecutan PowerShell, binarios en Downloads, o paths ofuscados.',
    author: 'VaultNotes',
    date: '2024/01/15',
    level: 'medium',
    logsource: { product: 'windows', service: 'security' },
    detection: {
      selectors: [
        [{ field: 'EventID', values: ['4698'] }],
      ],
      condition: 'selection',
    },
    mitre: ['T1053.005', 'T1053'],
    tags: ['attack.persistence', 'attack.t1053.005', 'attack.s0111'],
    eventIds: [4698, 4702, 4699],
    kql: 'SecurityEvent\n| where EventID == 4698\n| where TaskName !startswith "\\\\Microsoft\\\\Windows\\\\"\n| project TimeGenerated, Computer, TaskName, TaskContent, SubjectUserName',
    spl: 'index=windows EventCode=4698 TaskName!=*Microsoft\\\\Windows\\\\* | table _time, host, TaskName, TaskContent, user',
    yaml: `title: Scheduled Task Created
id: e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b
status: stable
description: Detecta la creación de una tarea programada (Event ID 4698) — mecanismo clásico de persistencia. Mirar tareas que ejecutan PowerShell, binarios en Downloads, o paths ofuscados.
author: VaultNotes
date: 2024/01/15
level: medium
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4698
  filter_legitimate:
    TaskName|startswith: '\\\\Microsoft\\\\Windows\\\\'
  condition: selection AND NOT filter_legitimate
fields:
  - EventID
  - TaskName
  - TaskContent
  - SubjectUserName
falsepositives:
  - Tareas de mantenimiento de Windows
  - Instaladores legítimos
tags:
  - attack.persistence
  - attack.t1053.005
  - attack.t1053
mitre:
  - T1053.005
  - T1053`,
  },

  /* ── Account creation 4720 ───────────────────────────────────── */
  {
    id: 'sigma-account-created-4720',
    uuid: 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c',
    title: 'New User Account Created',
    status: 'stable',
    description: 'Detecta la creación de una nueva cuenta de usuario (Event ID 4720) — el adversario puede crear cuentas para persistencia o lateral movement. Alerta si pasa fuera de horario o si el creador no es admin delegado.',
    author: 'VaultNotes',
    date: '2024/01/15',
    level: 'low',
    logsource: { product: 'windows', service: 'security' },
    detection: {
      selectors: [
        [{ field: 'EventID', values: ['4720'] }],
      ],
      condition: 'selection',
    },
    mitre: ['T1136.001', 'T1136'],
    tags: ['attack.persistence', 'attack.t1136.001', 'attack.t1136'],
    eventIds: [4720, 4722, 4732],
    kql: 'SecurityEvent\n| where EventID == 4720\n| project TimeGenerated, Computer, TargetUserName, SubjectUserName',
    spl: 'index=windows EventCode=4720 | table _time, host, new_user, created_by',
    yaml: `title: New User Account Created
id: f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c
status: stable
description: Detecta la creación de una nueva cuenta de usuario (Event ID 4720) — el adversario puede crear cuentas para persistencia o lateral movement. Alerta si pasa fuera de horario o si el creador no es admin delegado.
author: VaultNotes
date: 2024/01/15
level: low
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4720
  condition: selection
fields:
  - EventID
  - TargetUserName
  - SubjectUserName
falsepositives:
  - Creación legítima de cuentas por Help Desk
  - Onboarding de nuevos empleados
tags:
  - attack.persistence
  - attack.t1136.001
  - attack.t1136
mitre:
  - T1136.001
  - T1136`,
  },

  /* ── Mimikatz / LSASS access ─────────────────────────────────── */
  {
    id: 'sigma-lsass-process-access',
    uuid: '07a8b9c0-d1e2-4f3a-4b5c-6d7e8f9a0b1c',
    title: 'LSASS Memory Access — Credential Dumping Indicator',
    status: 'stable',
    description: 'Detecta procesos que abren lsass.exe con permisos de lectura/escritura de memoria — patrón clásico de Mimikatz, procdump, o cualquier credential dumper.',
    author: 'VaultNotes',
    date: '2024/01/15',
    level: 'critical',
    logsource: { product: 'windows', service: 'sysmon' },
    detection: {
      selectors: [
        [
          { field: 'EventID', values: ['10'] },
          { field: 'TargetImage', values: ['*\\lsass.exe'] },
        ],
      ],
      condition: 'selection AND NOT filter_whitelisted',
    },
    mitre: ['T1003.001', 'T1003'],
    tags: ['attack.credential_access', 'attack.t1003.001', 'attack.t1003', 'attack.s0002'],
    eventIds: [10, 4663],
    kql: 'DeviceProcessEvents\n| where InitiatingProcessFileName == "lsass.exe" or FileName == "lsass.exe"\n| where RequestAccess in (0x10, 0x1410, 0x1010, 0x143a)',
    spl: 'index=windows EventCode=10 TargetImage=*lsass.exe (GrantedAccess=0x1010 OR GrantedAccess=0x1410 OR GrantedAccess=0x143a) | table _time, host, SourceImage, TargetImage, GrantedAccess',
    yaml: `title: LSASS Memory Access — Credential Dumping Indicator
id: 07a8b9c0-d1e2-4f3a-4b5c-6d7e8f9a0b1c
status: stable
description: Detecta procesos que abren lsass.exe con permisos de lectura/escritura de memoria — patrón clásico de Mimikatz, procdump, o cualquier credential dumper.
author: VaultNotes
date: 2024/01/15
level: critical
logsource:
  product: windows
  service: sysmon
detection:
  selection:
    EventID: 10
    TargetImage|endswith: '\\\\lsass.exe'
    GrantedAccess|contains:
      - '0x1010'
      - '0x1410'
      - '0x143a'
      - '0x1f0fff'
  filter_whitelisted:
    SourceImage|endswith:
      - '\\\\svchost.exe'
      - '\\\\werfault.exe'
      - '\\\\mrt.exe'
  condition: selection AND NOT filter_whitelisted
fields:
  - EventID
  - SourceImage
  - TargetImage
  - GrantedAccess
falsepositives:
  - Antivirus (cuando scanea LSASS — whitelisted)
  - Debuggers en desarrollo (raros en prod)
tags:
  - attack.credential_access
  - attack.t1003.001
  - attack.t1003
  - attack.s0002
mitre:
  - T1003.001
  - T1003`,
  },

  /* ── NTDS.dit access ─────────────────────────────────────────── */
  {
    id: 'sigma-ntds-dit-access',
    uuid: '18b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d',
    title: 'NTDS.dit File Access — AD Database Theft',
    status: 'stable',
    description: 'Detecta acceso al archivo NTDS.dit (base de datos de Active Directory) — el adversario lo copia para extraer hashes offline con secretsdump.py.',
    author: 'VaultNotes',
    date: '2024/01/15',
    level: 'critical',
    logsource: { product: 'windows', service: 'sysmon' },
    detection: {
      selectors: [
        [
          { field: 'EventID', values: ['11', '1'] },
          { field: 'TargetFilename', values: ['*\\NTDS.dit'] },
        ],
      ],
      condition: 'selection',
    },
    mitre: ['T1003.003', 'T1003'],
    tags: ['attack.credential_access', 'attack.t1003.003', 'attack.t1003'],
    eventIds: [11, 4663],
    kql: 'DeviceFileEvents\n| where FileName == "NTDS.dit"\n| project TimeGenerated, DeviceName, InitiatingProcessFileName, AccountName',
    spl: 'index=windows (EventCode=11 OR EventCode=4663) TargetFileName=*NTDS.dit | table _time, host, process, user',
    yaml: `title: NTDS.dit File Access — AD Database Theft
id: 18b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d
status: stable
description: Detecta acceso al archivo NTDS.dit (base de datos de Active Directory) — el adversario lo copia para extraer hashes offline con secretsdump.py.
author: VaultNotes
date: 2024/01/15
level: critical
logsource:
  product: windows
  service: sysmon
detection:
  selection:
    EventID: 11
    TargetFilename|endswith: '\\\\NTDS.dit'
  condition: selection
fields:
  - EventID
  - TargetFilename
  - Image
falsepositives:
  - Backup legítimo de DC (revisar proceso y autorización)
tags:
  - attack.credential_access
  - attack.t1003.003
  - attack.t1003
mitre:
  - T1003.003
  - T1003`,
  },

  /* ── RDP logon type 10 ───────────────────────────────────────── */
  {
    id: 'sigma-rdp-logon-type-10',
    uuid: '29c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e',
    title: 'RDP Logon — Interactive Remote Desktop',
    status: 'stable',
    description: 'Detecta logons RDP (Logon Type 10 en Event ID 4624) — útil para monitorear accesos remotos a servidores y estaciones. Alerta si proviene de IPs externas o fuera de horario.',
    author: 'VaultNotes',
    date: '2024/01/15',
    level: 'low',
    logsource: { product: 'windows', service: 'security' },
    detection: {
      selectors: [
        [
          { field: 'EventID', values: ['4624'] },
          { field: 'LogonType', values: ['10'] },
        ],
      ],
      condition: 'selection',
    },
    mitre: ['T1021.001', 'T1078.002'],
    tags: ['attack.lateral_movement', 'attack.t1021.001', 'attack.t1078.002'],
    eventIds: [4624, 4634],
    kql: 'SecurityEvent\n| where EventID == 4624 and LogonType == 10\n| project TimeGenerated, Computer, Account, IpAddress, WorkstationName',
    spl: 'index=windows EventCode=4624 LogonType=10 | table _time, host, user, src_ip, workstation',
    yaml: `title: RDP Logon — Interactive Remote Desktop
id: 29c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e
status: stable
description: Detecta logons RDP (Logon Type 10 en Event ID 4624) — útil para monitorear accesos remotos a servidores y estaciones. Alerta si proviene de IPs externas o fuera de horario.
author: VaultNotes
date: 2024/01/15
level: low
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4624
    LogonType: 10
  condition: selection
fields:
  - EventID
  - TargetUserName
  - IpAddress
  - WorkstationName
  - LogonType
falsepositives:
  - RDP legítimo de administradores
  - Usuarios remotos (debería ser baseline)
tags:
  - attack.lateral_movement
  - attack.t1021.001
  - attack.t1078.002
mitre:
  - T1021.001
  - T1078.002`,
  },

  /* ── Event log cleared 1102 ───────────────────────────────────── */
  {
    id: 'sigma-event-log-cleared-1102',
    uuid: '3ad1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f',
    title: 'Windows Security Audit Log Cleared',
    status: 'stable',
    description: 'Detecta el borrado del log de auditoría de Windows (Event ID 1102) — el adversario limpia logs para evadir forense. Siempre crítico, nunca debería pasar sin ticket de cambio.',
    author: 'VaultNotes',
    date: '2024/01/15',
    level: 'critical',
    logsource: { product: 'windows', service: 'security' },
    detection: {
      selectors: [
        [{ field: 'EventID', values: ['1102'] }],
      ],
      condition: 'selection',
    },
    mitre: ['T1070.001', 'T1070'],
    tags: ['attack.defense_evasion', 'attack.t1070.001', 'attack.t1070'],
    eventIds: [1102, 104],
    kql: 'SecurityEvent\n| where EventID == 1102\n| project TimeGenerated, Computer, SubjectUserName',
    spl: 'index=windows EventCode=1102 | table _time, host, user',
    yaml: `title: Windows Security Audit Log Cleared
id: 3ad1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f
status: stable
description: Detecta el borrado del log de auditoría de Windows (Event ID 1102) — el adversario limpia logs para evadir forense. Siempre crítico, nunca debería pasar sin ticket de cambio.
author: VaultNotes
date: 2024/01/15
level: critical
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 1102
  condition: selection
fields:
  - EventID
  - SubjectUserName
  - Computer
falsepositives:
  - Casi NUNCA legítimo — cualquier clearing debe tener ticket de cambio documentado.
tags:
  - attack.defense_evasion
  - attack.t1070.001
  - attack.t1070
mitre:
  - T1070.001
  - T1070`,
  },

  /* ── Network connection to suspicious IP ─────────────────────── */
  {
    id: 'sigma-network-suspicious-ip',
    uuid: '4be2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a',
    title: 'Outbound Network Connection to Suspicious IP',
    status: 'test',
    description: 'Detecta conexiones salientes a IPs con baja reputación ( Threat Intel feed) o a países atípicos. Plantilla base para enriquecer con tu feed de IOCs.',
    author: 'VaultNotes',
    date: '2024/01/15',
    level: 'medium',
    logsource: { product: 'windows', service: 'sysmon' },
    detection: {
      selectors: [
        [{ field: 'EventID', values: ['3'] }],
      ],
      condition: 'selection',
    },
    mitre: ['T1071.001', 'T1105'],
    tags: ['attack.command_and_control', 'attack.t1071.001', 'attack.t1105'],
    eventIds: [3, 5156],
    kql: 'DeviceNetworkEvents\n| where RemoteIP in (ioc_ips) // reemplazar con tu watchlist\n| project TimeGenerated, DeviceName, InitiatingProcessFileName, RemoteIP, RemotePort',
    spl: '`index=windows sourcetype=sysmon EventCode=3 [ inputlookup suspicious_ips.csv ]` | table _time, host, process, dest_ip, dest_port',
    yaml: `title: Outbound Network Connection to Suspicious IP
id: 4be2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a
status: test
description: Detecta conexiones salientes a IPs con baja reputación (Threat Intel feed) o a países atípicos. Plantilla base para enriquecer con tu feed de IOCs.
author: VaultNotes
date: 2024/01/15
level: medium
logsource:
  product: windows
  service: sysmon
detection:
  selection:
    EventID: 3
    # Reemplazar DestinationIp con tu lookup / watchlist de IOCs:
    DestinationIp|cidr:
      - '10.0.0.0/8'  # placeholder — reemplazar con tu feed
  condition: selection
fields:
  - EventID
  - SourceIp
  - DestinationIp
  - DestinationPort
  - Image
falsepositives:
  - Casi todos — esta regla requiere enriquecimiento con threat intel propia.
tags:
  - attack.command_and_control
  - attack.t1071.001
  - attack.t1105
mitre:
  - T1071.001
  - T1105`,
  },

  /* ── Encoded PowerShell 4104 from network ────────────────────── */
  {
    id: 'sigma-powershell-scriptblock-encoded',
    uuid: '5cf3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b',
    title: 'PowerShell ScriptBlock with Encoded Content',
    status: 'stable',
    description: 'Detecta ScriptBlocks de PowerShell (Event ID 4104) que contienen cadenas Base64 largas — indica ofuscación de payloads en memoria.',
    author: 'VaultNotes',
    date: '2024/01/15',
    level: 'medium',
    logsource: { product: 'windows', service: 'powershell' },
    detection: {
      selectors: [
        [
          { field: 'EventID', values: ['4104'] },
          { field: 'ScriptBlockText', values: ['*FromBase64String*', '*IEX*', '*ConvertTo-SecureString*'] },
        ],
      ],
      condition: 'selection',
    },
    mitre: ['T1059.001', 'T1027'],
    tags: ['attack.execution', 'attack.t1059.001', 'attack.defense_evasion', 'attack.t1027'],
    eventIds: [4104, 4103],
    kql: 'DeviceEvents\n| where ActionType == "PowerShellCommand"\n| where AdditionalFields has_any ("FromBase64String", "IEX", "ConvertTo-SecureString")\n| project TimeGenerated, DeviceName, InitiatingProcessFileName, AdditionalFields',
    spl: 'index=windows sourcetype=powershell EventCode=4104 (ScriptBlockText=*FromBase64String* OR ScriptBlockText=*IEX* OR ScriptBlockText=*ConvertTo-SecureString*) | table _time, host, process, ScriptBlockText',
    yaml: `title: PowerShell ScriptBlock with Encoded Content
id: 5cf3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b
status: stable
description: Detecta ScriptBlocks de PowerShell (Event ID 4104) que contienen cadenas Base64 largas — indica ofuscación de payloads en memoria.
author: VaultNotes
date: 2024/01/15
level: medium
logsource:
  product: windows
  service: powershell
detection:
  selection:
    EventID: 4104
    ScriptBlockText|contains:
      - 'FromBase64String'
      - 'IEX'
      - 'ConvertTo-SecureString'
      - 'System.Management.Automation'
  condition: selection
fields:
  - EventID
  - ScriptBlockText
  - ContextInfo
falsepositives:
  - Scripts administrativos legítimos con encoding (raros — revisar contexto)
tags:
  - attack.execution
  - attack.t1059.001
  - attack.defense_evasion
  - attack.t1027
mitre:
  - T1059.001
  - T1027`,
  },

  /* ── WMI suspicious (lateral) ─────────────────────────────────── */
  {
    id: 'sigma-wmi-suspicious',
    uuid: '6da4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c',
    title: 'Suspicious WMI Execution',
    status: 'test',
    description: 'Detecta uso sospechoso de WMI para ejecución remota o persistencia (wmic process call create, __EventConsumer subscription).',
    author: 'VaultNotes',
    date: '2024/01/15',
    level: 'medium',
    logsource: { product: 'windows', category: 'process_creation' },
    detection: {
      selectors: [
        [
          { field: 'Image', values: ['*\\wmic.exe'] },
          { field: 'CommandLine', values: ['*process call create*', '*process call*', '*/node:*', '*namespace:*'] },
        ],
      ],
      condition: 'selection',
    },
    mitre: ['T1047', 'T1546.003'],
    tags: ['attack.execution', 'attack.t1047', 'attack.persistence', 'attack.t1546.003'],
    eventIds: [4688, 1, 19, 20, 21],
    kql: 'DeviceProcessEvents\n| where FileName == "wmic.exe"\n| where ProcessCommandLine has_any ("process call create", "/node:", "namespace:")\n| project TimeGenerated, DeviceName, AccountName, ProcessCommandLine',
    spl: 'index=windows Image=*wmic.exe (CommandLine="*process call create*" OR CommandLine="*/node:*" OR CommandLine="*namespace:*") | table _time, host, user, CommandLine',
    yaml: `title: Suspicious WMI Execution
id: 6da4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c
status: test
description: Detecta uso sospechoso de WMI para ejecución remota o persistencia (wmic process call create, __EventConsumer subscription).
author: VaultNotes
date: 2024/01/15
level: medium
logsource:
  product: windows
  category: process_creation
detection:
  selection:
    Image|endswith: '\\\\wmic.exe'
    CommandLine|contains:
      - 'process call create'
      - 'process call'
      - '/node:'
      - 'namespace:'
  condition: selection
fields:
  - Image
  - CommandLine
  - User
falsepositives:
  - Administradores usando wmic para queries legítimas (raro — usar PowerShell en su lugar)
tags:
  - attack.execution
  - attack.t1047
  - attack.persistence
  - attack.t1546.003
mitre:
  - T1047
  - T1546.003`,
  },

  /* ── DNS tunneling ───────────────────────────────────────────── */
  {
    id: 'sigma-dns-tunneling',
    uuid: '7eb5c6d7-e8f9-4a0b-1c2d-3e4f5a6b7c8d',
    title: 'Possible DNS Tunneling Indicator',
    status: 'test',
    description: 'Detecta queries DNS con subdomains extremadamente largos (>50 chars) o alto volumen de TXT queries — indicador de tunneling DNS (iodine, dnscat2, cobaltstrike).',
    author: 'VaultNotes',
    date: '2024/01/15',
    level: 'high',
    logsource: { category: 'dns' },
    detection: {
      selectors: [
        [{ field: 'query', values: ['?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????*'] }],
      ],
      condition: 'selection',
    },
    mitre: ['T1071.004', 'T1071', 'T1572'],
    tags: ['attack.command_and_control', 'attack.t1071.004', 'attack.t1071', 'attack.t1572'],
    eventIds: [22, 5156],
    kql: 'DnsEvents\n| where Name has @"\\" and strlen(Name) > 50\n| summarize count() by ClientIP, bin(TimeGenerated, 5m)\n| where count_ > 10',
    spl: 'index=dns (query_length > 50) | stats count by src_ip, date_minute | where count > 10',
    yaml: `title: Possible DNS Tunneling Indicator
id: 7eb5c6d7-e8f9-4a0b-1c2d-3e4f5a6b7c8d
status: test
description: Detecta queries DNS con subdomains extremadamente largos (>50 chars) o alto volumen de TXT queries — indicador de tunneling DNS (iodine, dnscat2, cobaltstrike).
author: VaultNotes
date: 2024/01/15
level: high
logsource:
  category: dns
detection:
  selection_long:
    query|re: '(?:[^.]+\\\\.){50,}'
  selection_txt:
    type: TXT
  condition: selection_long or selection_txt
fields:
  - query
  - src_ip
  - type
  - answer
falsepositives:
  - Algunos CDNs legítimos (Cloudflare, AWS) con subdomains largos pero raramente >50 chars
  - DKIM/SPF TXT queries (filtrar por volumen)
tags:
  - attack.command_and_control
  - attack.t1071.004
  - attack.t1071
  - attack.t1572
mitre:
  - T1071.004
  - T1071
  - T1572`,
  },

  /* ── DCSync replication 4662 ──────────────────────────────────── */
  {
    id: 'sigma-dcsync-replication-4662',
    uuid: '9a0b1c2d-3e4f-4a5b-8c6d-0e1f2a3b4c5d',
    title: 'DCSync — Directory Replication by Non-DC Account',
    status: 'stable',
    description: 'Detecta una operación de replicación de directory changes (Event ID 4662) solicitada por una cuenta que NO es un Domain Controller — firma de DCSync (mimikatz lsadump::dcsync / Impacket secretsdump) extrayendo hashes de KRBTGT y administradores.',
    author: 'VaultNotes',
    date: '2025/03/15',
    level: 'critical',
    logsource: { product: 'windows', service: 'security' },
    detection: {
      selectors: [
        [
          { field: 'EventID', values: ['4662'] },
          { field: 'ObjectServer', values: ['DS'] },
          { field: 'Properties', values: ['*1131f6aa-9c07-11d1-f79f-00c04fc2dcd2*', '*1131f6ad-9c07-11d1-f79f-00c04fc2dcd2*', '*89e95b76-444d-4c62-991a-0facbeda640c*'] },
        ],
      ],
      condition: 'selection AND NOT filter_machines',
    },
    mitre: ['T1003.006', 'T1003'],
    tags: ['attack.credential_access', 'attack.t1003.006', 'attack.t1003'],
    eventIds: [4662],
    kql: 'SecurityEvent\n| where EventID == 4662\n| where ObjectServer == "DS"\n| where Properties has_any ("1131f6aa-9c07-11d1-f79f-00c04fc2dcd2", "1131f6ad-9c07-11d1-f79f-00c04fc2dcd2", "89e95b76-444d-4c62-991a-0facbeda640c")\n| where SubjectUserName !endswith "$"\n| project TimeGenerated, Computer, SubjectUserName, ObjectName, ObjectDN, Properties',
    spl: 'index=windows EventCode=4662 ObjectServer="DS" (Properties="*1131f6aa*" OR Properties="*1131f6ad*" OR Properties="*89e95b76*") NOT SubjectUserName="*$" | table _time, host, SubjectUserName, ObjectName, Properties',
    yaml: `title: DCSync — Directory Replication by Non-DC Account
id: 9a0b1c2d-3e4f-4a5b-8c6d-0e1f2a3b4c5d
status: stable
description: Detecta una operación de replicación de directory changes (Event ID 4662) solicitada por una cuenta que NO es un Domain Controller — firma de DCSync (mimikatz lsadump::dcsync / Impacket secretsdump) extrayendo hashes de KRBTGT y administradores.
references:
  - https://attack.mitre.org/techniques/T1003/006/
  - https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/event-4662
author: VaultNotes
date: 2025/03/15
level: critical
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4662
    ObjectServer: 'DS'
    Properties|contains:
      - '1131f6aa-9c07-11d1-f79f-00c04fc2dcd2'
      - '1131f6ad-9c07-11d1-f79f-00c04fc2dcd2'
      - '89e95b76-444d-4c62-991a-0facbeda640c'
  filter_machines:
    SubjectUserName|endswith: '$'
  condition: selection AND NOT filter_machines
fields:
  - EventID
  - SubjectUserName
  - ObjectName
  - ObjectDN
  - Properties
falsepositives:
  - Replicación legítima entre DCs (las cuentas-máquina de DC terminan en $ y quedan filtradas)
  - Herramientas aprobadas de sincronización de directorio (AD Connect) — whitelistar por SubjectUserName
tags:
  - attack.credential_access
  - attack.t1003.006
  - attack.t1003
mitre:
  - T1003.006
  - T1003`,
  },

  /* ── Kerberoasting 4769 (RC4) ────────────────────────────────── */
  {
    id: 'sigma-kerberoasting-4769-rc4',
    uuid: '34a0f1a2-3c4d-4e5f-8a6b-0c1d2e3f4a5b',
    title: 'Kerberos TGS Request with RC4 Encryption (Kerberoasting)',
    status: 'stable',
    description: 'Detecta pedidos de tickets de servicio (Event ID 4769) con cifrado RC4-HMAC (0x17) para cuentas de servicio — patrón de Kerberoasting con Rubeus/Impacket para craquear offline. Entornos sanos usan AES (0x11/0x12).',
    author: 'VaultNotes',
    date: '2025/03/15',
    level: 'high',
    logsource: { product: 'windows', service: 'security' },
    detection: {
      selectors: [
        [
          { field: 'EventID', values: ['4769'] },
          { field: 'TicketEncryptionType', values: ['0x17'] },
        ],
      ],
      condition: 'selection AND NOT filter_machines AND NOT filter_krbtgt',
    },
    mitre: ['T1558.003', 'T1558'],
    tags: ['attack.credential_access', 'attack.t1558.003', 'attack.t1558'],
    eventIds: [4769, 4768],
    kql: 'SecurityEvent\n| where EventID == 4769 and TicketEncryptionType == "0x17"\n| where ServiceName != "krbtgt" and ServiceName !endswith "$"\n| summarize requests = count() by ServiceName, IpAddress, bin(TimeGenerated, 10m)\n| where requests > 5\n| project TimeGenerated, ServiceName, IpAddress, requests',
    spl: 'index=windows EventCode=4769 TicketEncryptionType=0x17 NOT ServiceName=krbtgt NOT ServiceName="*$" | bin _time span=10m | stats count by ServiceName, src_ip, _time | where count > 5 | sort - count',
    yaml: `title: Kerberos TGS Request with RC4 Encryption (Kerberoasting)
id: 34a0f1a2-3c4d-4e5f-8a6b-0c1d2e3f4a5b
status: stable
description: Detecta pedidos de tickets de servicio (Event ID 4769) con cifrado RC4-HMAC (0x17) para cuentas de servicio — patrón de Kerberoasting con Rubeus/Impacket para craquear offline. Entornos sanos usan AES (0x11/0x12).
references:
  - https://attack.mitre.org/techniques/T1558/003/
  - https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/event-4769
author: VaultNotes
date: 2025/03/15
level: high
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4769
    TicketEncryptionType: '0x17'
  filter_machines:
    ServiceName|endswith: '$'
  filter_krbtgt:
    ServiceName: 'krbtgt'
  condition: selection AND NOT filter_machines AND NOT filter_krbtgt
fields:
  - EventID
  - ServiceName
  - IpAddress
  - TicketEncryptionType
falsepositives:
  - Entornos legacy con RC4 por defecto — usar la alerta para inventariar cuentas de servicio sin AES
  - Cuentas de servicio configuradas solo con RC4 (msDS-SupportedEncryptionTypes)
tags:
  - attack.credential_access
  - attack.t1558.003
  - attack.t1558
mitre:
  - T1558.003
  - T1558`,
  },

  /* ── AD object modified 5136 ─────────────────────────────────── */
  {
    id: 'sigma-ad-object-modified-5136',
    uuid: 'cd3e4f5a-6b7c-4d8e-9f9a-3b4c5d6e7f8a',
    title: 'AD Object Modified — dACL / GPO / RBCD Attributes',
    status: 'test',
    description: 'Detecta modificaciones de objetos de AD (Event ID 5136) sobre atributos de alto riesgo: nTSecurityDescriptor (dACL), gPCFileSysPath (GPO) y msDS-AllowedToActOnBehalfOfOtherIdentity (RBCD — habilita suplantación de identidad en el host).',
    author: 'VaultNotes',
    date: '2025/03/15',
    level: 'high',
    logsource: { product: 'windows', service: 'security' },
    detection: {
      selectors: [
        [
          { field: 'EventID', values: ['5136'] },
          { field: 'AttributeLDAPDisplayName', values: ['nTSecurityDescriptor', 'gPCFileSysPath', 'msDS-AllowedToActOnBehalfOfOtherIdentity'] },
        ],
      ],
      condition: 'selection',
    },
    mitre: ['T1098', 'T1484.001'],
    tags: ['attack.persistence', 'attack.t1098', 'attack.defense_evasion', 'attack.t1484.001'],
    eventIds: [5136, 5137, 5139, 5141],
    kql: 'SecurityEvent\n| where EventID == 5136\n| where AttributeLDAPDisplayName in~ ("nTSecurityDescriptor", "gPCFileSysPath", "msDS-AllowedToActOnBehalfOfOtherIdentity")\n| project TimeGenerated, Computer, SubjectUserName, ObjectDN, AttributeLDAPDisplayName, OpCorrelationID',
    spl: 'index=windows EventCode=5136 (AttributeLDAPDisplayName="nTSecurityDescriptor" OR AttributeLDAPDisplayName="gPCFileSysPath" OR AttributeLDAPDisplayName="msDS-AllowedToActOnBehalfOfOtherIdentity") | table _time, host, SubjectUserName, ObjectDN, AttributeLDAPDisplayName',
    yaml: `title: AD Object Modified — dACL / GPO / RBCD Attributes
id: cd3e4f5a-6b7c-4d8e-9f9a-3b4c5d6e7f8a
status: test
description: Detecta modificaciones de objetos de AD (Event ID 5136) sobre atributos de alto riesgo: nTSecurityDescriptor (dACL), gPCFileSysPath (GPO) y msDS-AllowedToActOnBehalfOfOtherIdentity (RBCD — habilita suplantación de identidad en el host).
references:
  - https://attack.mitre.org/techniques/T1098/
  - https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/event-5136
author: VaultNotes
date: 2025/03/15
level: high
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 5136
    AttributeLDAPDisplayName:
      - nTSecurityDescriptor
      - gPCFileSysPath
      - msDS-AllowedToActOnBehalfOfOtherIdentity
  condition: selection
fields:
  - EventID
  - SubjectUserName
  - ObjectDN
  - AttributeLDAPDisplayName
  - OpCorrelationID
falsepositives:
  - Cambios de GPO legítimos por administradores dentro de ventana de mantenimiento
  - Flujos de delegación aprobados — correlacionar OpCorrelationID con tickets de cambio
tags:
  - attack.persistence
  - attack.t1098
  - attack.defense_evasion
  - attack.t1484.001
mitre:
  - T1098
  - T1484.001`,
  },

  /* ── Computer account created 4741 ───────────────────────────── */
  {
    id: 'sigma-computer-account-created-4741',
    uuid: 'bc2d3e4f-5a6b-4c7d-8e8f-2a3b4c5d6e7f',
    title: 'New Computer Account Created in Domain',
    status: 'test',
    description: 'Detecta la creación de cuentas-máquina en el dominio (Event ID 4741). Los atacantes agregan equipos rogue para persistencia o para abusar de delegación (RBCD). Un spike de creaciones fuera del proceso de imaging = scripted.',
    author: 'VaultNotes',
    date: '2025/03/15',
    level: 'medium',
    logsource: { product: 'windows', service: 'security' },
    detection: {
      selectors: [
        [{ field: 'EventID', values: ['4741'] }],
      ],
      condition: 'selection AND NOT filter_provisioning',
    },
    mitre: ['T1136.002', 'T1136'],
    tags: ['attack.persistence', 'attack.t1136.002', 'attack.t1136'],
    eventIds: [4741, 4742, 4743],
    kql: 'SecurityEvent\n| where EventID == 4741\n| where SubjectUserName !endswith "$" // ajustar tambien las cuentas de provisioning/imaging reales\n| summarize creations = count() by SubjectUserName, bin(TimeGenerated, 15m)\n| where creations > 3\n| project TimeGenerated, Computer, SubjectUserName, TargetUserName, creations',
    spl: 'index=windows EventCode=4741 NOT SubjectUserName="*$" | bin _time span=15m | stats count as creations by SubjectUserName, _time | where creations > 3 | sort - creations',
    yaml: `title: New Computer Account Created in Domain
id: bc2d3e4f-5a6b-4c7d-8e8f-2a3b4c5d6e7f
status: test
description: Detecta la creación de cuentas-máquina en el dominio (Event ID 4741). Los atacantes agregan equipos rogue para persistencia o para abusar de delegación (RBCD). Un spike de creaciones fuera del proceso de imaging = scripted.
references:
  - https://attack.mitre.org/techniques/T1136/002/
  - https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/event-4741
author: VaultNotes
date: 2025/03/15
level: medium
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4741
  filter_provisioning:
    SubjectUserName:          # ejemplo — reemplazar por las cuentas reales de provisioning/imaging
      - 'CORP\\imaging_svc'
      - 'CORP\\sccm-server$'
  condition: selection AND NOT filter_provisioning
fields:
  - EventID
  - SubjectUserName
  - TargetUserName
  - SamAccountName
falsepositives:
  - Proceso normal de imaging/onboarding de estaciones (filtrar cuentas de provisioning)
  - Join de equipos nuevos por technicians fuera de horario — validar con IT
tags:
  - attack.persistence
  - attack.t1136.002
  - attack.t1136
mitre:
  - T1136.002
  - T1136`,
  },

  /* ── RDP session hijack 4778/4779 ────────────────────────────── */
  {
    id: 'sigma-rdp-session-hijack-4778-4779',
    uuid: 'f06b7c8d-9e0f-4a1b-8c2d-6e7f8a9b0c1d',
    title: 'RDP Session Reconnect — Possible Session Hijacking',
    status: 'experimental',
    description: 'Detecta reconexiones de sesión RDP (Event ID 4778) desde una Client Address pública o distinta a la de la desconexión previa (4779) — patrón de session hijacking (tscon /dest) o robo de credenciales RDP. Requiere correlación temporal: la regla marca la reconexión y el hunting compara contra la IP previa.',
    author: 'VaultNotes',
    date: '2025/03/15',
    level: 'medium',
    logsource: { product: 'windows', service: 'security' },
    detection: {
      selectors: [
        [{ field: 'EventID', values: ['4778'] }],
      ],
      condition: 'selection AND NOT filter_internal',
    },
    mitre: ['T1563.002', 'T1021.001'],
    tags: ['attack.lateral_movement', 'attack.t1563.002', 'attack.t1021.001'],
    eventIds: [4778, 4779],
    kql: 'SecurityEvent\n| where EventID == 4778\n| where ClientAddress !startswith "10." and ClientAddress !startswith "192.168." and ClientAddress !startswith "172."\n| project TimeGenerated, Computer, Account, SessionName, ClientName, ClientAddress',
    spl: 'index=windows EventCode=4778 NOT (ClientAddress=10.* OR ClientAddress=192.168.* OR ClientAddress=172.*) | table _time, host, user, SessionName, ClientName, ClientAddress',
    yaml: `title: RDP Session Reconnect — Possible Session Hijacking
id: f06b7c8d-9e0f-4a1b-8c2d-6e7f8a9b0c1d
status: experimental
description: Detecta reconexiones de sesión RDP (Event ID 4778) desde una Client Address pública o distinta a la de la desconexión previa (4779) — patrón de session hijacking (tscon /dest) o robo de credenciales RDP. Requiere correlación temporal: la regla marca la reconexión y el hunting compara contra la IP previa.
references:
  - https://attack.mitre.org/techniques/T1563/002/
  - https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/event-4778
author: VaultNotes
date: 2025/03/15
level: medium
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4778
  filter_internal:
    ClientAddress|cidr:
      - '10.0.0.0/8'
      - '172.16.0.0/12'
      - '192.168.0.0/16'
  condition: selection AND NOT filter_internal
fields:
  - EventID
  - Account
  - SessionName
  - ClientName
  - ClientAddress
falsepositives:
  - Usuarios remotos legítimos reconectando desde VPN con NAT público
  - Correlacionar siempre el 4778 con el 4779 previo: misma IP = reconexión normal, IP distinta = investigar
tags:
  - attack.lateral_movement
  - attack.t1563.002
  - attack.t1021.001
mitre:
  - T1563.002
  - T1021.001`,
  },

  /* ── Group enumeration 4799 bulk (BloodHound) ────────────────── */
  {
    id: 'sigma-group-enumeration-4799-bulk',
    uuid: '017c8d9e-0f1a-4b2c-9d3e-7f8a9b0c1d2e',
    title: 'Bulk Security Group Enumeration — BloodHound Pattern',
    status: 'test',
    description: 'Detecta enumeración masiva de membresías de grupos (Event ID 4799) — más de 30 grupos enumerados por host en 5 minutos es la firma de SharpHound/BloodHound recolectando el grafo de AD. Requiere el auditing de enumeración de grupos activado (no viene por defecto).',
    author: 'VaultNotes',
    date: '2025/03/15',
    level: 'medium',
    logsource: { product: 'windows', service: 'security' },
    detection: {
      selectors: [
        [{ field: 'EventID', values: ['4799'] }],
      ],
      condition: 'selection | count(*) by Computer > 30',
      timeframe: '5m',
    },
    mitre: ['T1069.002', 'T1069', 'T1087.002'],
    tags: ['attack.discovery', 'attack.t1069.002', 'attack.t1069', 'attack.t1087.002'],
    eventIds: [4799],
    kql: 'SecurityEvent\n| where EventID == 4799\n| summarize enumerations = count() by Computer, bin(TimeGenerated, 5m)\n| where enumerations > 30\n| project TimeGenerated, Computer, enumerations',
    spl: 'index=windows EventCode=4799 | bin _time span=5m | stats count as enumerations by host, _time | where enumerations > 30 | sort - enumerations',
    yaml: `title: Bulk Security Group Enumeration — BloodHound Pattern
id: 017c8d9e-0f1a-4b2c-9d3e-7f8a9b0c1d2e
status: test
description: Detecta enumeración masiva de membresías de grupos (Event ID 4799) — más de 30 grupos enumerados por host en 5 minutos es la firma de SharpHound/BloodHound recolectando el grafo de AD. Requiere el auditing de enumeración de grupos activado (no viene por defecto).
references:
  - https://attack.mitre.org/techniques/T1069/002/
  - https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/event-4799
author: VaultNotes
date: 2025/03/15
level: medium
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4799
  condition: selection | count() by Computer > 30
  timeframe: 5m
fields:
  - EventID
  - TargetUserName
  - SubjectUserName
  - Computer
falsepositives:
  - Scripts internos de auditoría de accesos que enumeran memberships
  - Productos de IAM/provisioning — whitelistar los servidores por Computer
tags:
  - attack.discovery
  - attack.t1069.002
  - attack.t1069
  - attack.t1087.002
mitre:
  - T1069.002
  - T1069
  - T1087.002`,
  },

  /* ── System time change 4616 (timestomping) ──────────────────── */
  {
    id: 'sigma-system-time-change-4616',
    uuid: '128d9e0f-1a2b-4c3d-8e4f-8a9b0c1d2e3f',
    title: 'System Time Changed',
    status: 'test',
    description: 'Detecta cambios de hora del sistema (Event ID 4616) — usados para timestomping lógico, romper la correlación de logs y evadir expiración de certificados/tickets. Se filtran los cambios hechos por el servicio de tiempo (LOCAL SERVICE / SYSTEM).',
    author: 'VaultNotes',
    date: '2025/03/15',
    level: 'low',
    logsource: { product: 'windows', service: 'security' },
    detection: {
      selectors: [
        [{ field: 'EventID', values: ['4616'] }],
      ],
      condition: 'selection AND NOT filter_w32time',
    },
    mitre: ['T1070.006', 'T1070'],
    tags: ['attack.defense_evasion', 'attack.t1070.006', 'attack.t1070'],
    eventIds: [4616],
    kql: 'SecurityEvent\n| where EventID == 4616\n| where SubjectUserName !in ("LOCAL SERVICE", "SYSTEM", "NETWORK SERVICE")\n| project TimeGenerated, Computer, SubjectUserName, ProcessName, PreviousTime, NewTime',
    spl: 'index=windows EventCode=4616 NOT (SubjectUserName="LOCAL SERVICE" OR SubjectUserName="SYSTEM" OR SubjectUserName="NETWORK SERVICE") | table _time, host, SubjectUserName, ProcessName, PreviousTime, NewTime',
    yaml: `title: System Time Changed
id: 128d9e0f-1a2b-4c3d-8e4f-8a9b0c1d2e3f
status: test
description: Detecta cambios de hora del sistema (Event ID 4616) — usados para timestomping lógico, romper la correlación de logs y evadir expiración de certificados/tickets. Se filtran los cambios hechos por el servicio de tiempo (LOCAL SERVICE / SYSTEM).
references:
  - https://attack.mitre.org/techniques/T1070/006/
  - https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/event-4616
author: VaultNotes
date: 2025/03/15
level: low
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4616
  filter_w32time:
    SubjectUserName:
      - 'LOCAL SERVICE'
      - 'SYSTEM'
      - 'NETWORK SERVICE'
  condition: selection AND NOT filter_w32time
fields:
  - EventID
  - SubjectUserName
  - ProcessName
  - PreviousTime
  - NewTime
falsepositives:
  - Resync manual autorizado por administradores (debería tener ticket)
  - VMs clonadas que resincronizan hora al arrancar
tags:
  - attack.defense_evasion
  - attack.t1070.006
  - attack.t1070
mitre:
  - T1070.006
  - T1070`,
  },

  /* ── New network share 5142 (exfil staging) ──────────────────── */
  {
    id: 'sigma-network-share-added-5142',
    uuid: '239e0f1a-2b3c-4d4e-9f5a-9b0c1d2e3f4a',
    title: 'New Network Share Added',
    status: 'test',
    description: 'Detecta la creación de shares de red (Event ID 5142) fuera de los shares administrativos por defecto — puede ser staging de exfiltración (share temporal para copiar datos) o preparación de ransomware (exponer backups).',
    author: 'VaultNotes',
    date: '2025/03/15',
    level: 'medium',
    logsource: { product: 'windows', service: 'security' },
    detection: {
      selectors: [
        [{ field: 'EventID', values: ['5142'] }],
      ],
      condition: 'selection AND NOT filter_default_shares',
    },
    mitre: ['T1074', 'T1021.002'],
    tags: ['attack.collection', 'attack.t1074', 'attack.lateral_movement', 'attack.t1021.002'],
    eventIds: [5142, 5143, 5144],
    kql: 'SecurityEvent\n| where EventID == 5142\n| where ShareName !endswith "\\\\IPC$" and ShareName !endswith "\\\\ADMIN$" and ShareName !endswith "\\\\C$" and ShareName !endswith "\\\\D$" and ShareName !endswith "\\\\PRINT$" and ShareName !endswith "\\\\FAX$"\n| project TimeGenerated, Computer, SubjectUserName, ShareName, SharePath',
    spl: 'index=windows EventCode=5142 NOT (ShareName="*\\\\IPC$" OR ShareName="*\\\\ADMIN$" OR ShareName="*\\\\C$" OR ShareName="*\\\\D$" OR ShareName="*\\\\PRINT$" OR ShareName="*\\\\FAX$") | table _time, host, user, ShareName, SharePath',
    yaml: `title: New Network Share Added
id: 239e0f1a-2b3c-4d4e-9f5a-9b0c1d2e3f4a
status: test
description: Detecta la creación de shares de red (Event ID 5142) fuera de los shares administrativos por defecto — puede ser staging de exfiltración (share temporal para copiar datos) o preparación de ransomware (exponer backups).
references:
  - https://attack.mitre.org/techniques/T1074/
  - https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/event-5142
author: VaultNotes
date: 2025/03/15
level: medium
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 5142
  filter_default_shares:
    ShareName|endswith:
      - '\\IPC$'
      - '\\ADMIN$'
      - '\\C$'
      - '\\D$'
      - '\\PRINT$'
      - '\\FAX$'
  condition: selection AND NOT filter_default_shares
fields:
  - EventID
  - SubjectUserName
  - ShareName
  - SharePath
falsepositives:
  - Shares creados por instalación de software o impresoras (verificar SharePath)
  - Administradores compartiendo carpetas sin proceso — buena oportunidad para awareness
tags:
  - attack.collection
  - attack.t1074
  - attack.lateral_movement
  - attack.t1021.002
mitre:
  - T1074
  - T1021.002`,
  },

  /* ── Suspicious RunKey via Sysmon 13 ─────────────────────────── */
  {
    id: 'sigma-suspicious-runkey-sysmon13',
    uuid: 'ab1c2d3e-4f5a-4b6c-9d7e-1f2a3b4c5d6e',
    title: 'Suspicious Registry Run Key Value via Sysmon',
    status: 'stable',
    description: 'Detecta escrituras en claves Run/RunOnce (Sysmon Event ID 13) con valores sospechosos — intérpretes, rutas de usuario o ofuscación — persistencia clásica post-compromiso.',
    author: 'VaultNotes',
    date: '2025/03/15',
    level: 'high',
    logsource: { product: 'windows', service: 'sysmon' },
    detection: {
      selectors: [
        [
          { field: 'EventID', values: ['13'] },
          { field: 'TargetObject', values: ['*\\CurrentVersion\\Run*', '*\\CurrentVersion\\RunOnce*'] },
          { field: 'Details', values: ['*powershell*', '*cmd.exe*', '*mshta*', '*rundll32*', '*regsvr32*', '*wscript*', '*cscript*', '*C:\\Users\\Public*', '*\\AppData\\*'] },
        ],
      ],
      condition: 'selection',
    },
    mitre: ['T1547.001', 'T1547'],
    tags: ['attack.persistence', 'attack.t1547.001', 'attack.t1547'],
    eventIds: [13, 4657],
    kql: 'DeviceRegistryEvents\n| where RegistryKey contains "\\\\CurrentVersion\\\\Run" or RegistryKey contains "\\\\CurrentVersion\\\\RunOnce"\n| where RegistryValueData has_any ("powershell", "cmd.exe", "mshta", "rundll32", "regsvr32", "wscript", "cscript", "C:\\\\Users\\\\Public", "AppData")\n| project TimeGenerated, DeviceName, RegistryKey, RegistryValueName, RegistryValueData, InitiatingProcessFileName',
    spl: 'index=windows sourcetype=sysmon EventCode=13 (TargetObject="*\\\\CurrentVersion\\\\Run*" OR TargetObject="*\\\\CurrentVersion\\\\RunOnce*") (Details="*powershell*" OR Details="*mshta*" OR Details="*rundll32*" OR Details="*regsvr32*" OR Details="*C:\\\\Users\\\\Public*" OR Details="*AppData*") | table _time, host, TargetObject, Details, Image',
    yaml: `title: Suspicious Registry Run Key Value via Sysmon
id: ab1c2d3e-4f5a-4b6c-9d7e-1f2a3b4c5d6e
status: stable
description: Detecta escrituras en claves Run/RunOnce (Sysmon Event ID 13) con valores sospechosos — intérpretes, rutas de usuario o ofuscación — persistencia clásica post-compromiso.
references:
  - https://attack.mitre.org/techniques/T1547/001/
  - https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon
author: VaultNotes
date: 2025/03/15
level: high
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
      - 'cmd.exe'
      - 'mshta'
      - 'rundll32'
      - 'regsvr32'
      - 'wscript'
      - 'cscript'
      - 'C:\\Users\\Public'
      - '\\AppData\\'
  condition: selection
fields:
  - EventID
  - TargetObject
  - Details
  - Image
falsepositives:
  - Software legítimo que se registra al arrancar (updaters) — normalmente apuntan a Program Files, no a rutas de usuario
  - Scripts de deployment corporativo — whitelistar por Image
tags:
  - attack.persistence
  - attack.t1547.001
  - attack.t1547
mitre:
  - T1547.001
  - T1547`,
  },

  /* ── Non-standard port connection via Sysmon 3 ──────────────── */
  {
    id: 'sigma-nonstandard-port-sysmon3',
    uuid: 'de4f5a6b-7c8d-4e9f-8a0b-4c5d6e7f8a9b',
    title: 'Outbound Connection to Non-Standard Port',
    status: 'test',
    description: 'Detecta conexiones salientes (Sysmon Event ID 3) hacia puertos asociados a C2 y reverse shells (4444, 1337, 31337, 8443, 4443, 5555). Ajustar la lista de puertos al baseline de la organización.',
    author: 'VaultNotes',
    date: '2025/03/15',
    level: 'medium',
    logsource: { product: 'windows', service: 'sysmon' },
    detection: {
      selectors: [
        [
          { field: 'EventID', values: ['3'] },
          { field: 'DestinationPort', values: ['4444', '1337', '31337', '8443', '4443', '5555'] },
        ],
      ],
      condition: 'selection',
    },
    mitre: ['T1071', 'T1571'],
    tags: ['attack.command_and_control', 'attack.t1071', 'attack.t1571'],
    eventIds: [3, 5156],
    kql: 'DeviceNetworkEvents\n| where RemotePort in (4444, 1337, 31337, 8443, 4443, 5555)\n| project TimeGenerated, DeviceName, InitiatingProcessFileName, RemoteIP, RemotePort',
    spl: 'index=windows sourcetype=sysmon EventCode=3 (DestinationPort=4444 OR DestinationPort=1337 OR DestinationPort=31337 OR DestinationPort=8443 OR DestinationPort=4443 OR DestinationPort=5555) | table _time, host, Image, DestinationIp, DestinationPort',
    yaml: `title: Outbound Connection to Non-Standard Port
id: de4f5a6b-7c8d-4e9f-8a0b-4c5d6e7f8a9b
status: test
description: Detecta conexiones salientes (Sysmon Event ID 3) hacia puertos asociados a C2 y reverse shells (4444, 1337, 31337, 8443, 4443, 5555). Ajustar la lista de puertos al baseline de la organización.
references:
  - https://attack.mitre.org/techniques/T1071/
  - https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon
author: VaultNotes
date: 2025/03/15
level: medium
logsource:
  product: windows
  service: sysmon
detection:
  selection:
    EventID: 3
    DestinationPort:
      - 4444
      - 1337
      - 31337
      - 8443
      - 4443
      - 5555
  condition: selection
fields:
  - EventID
  - Image
  - DestinationIp
  - DestinationPort
  - User
falsepositives:
  - Aplicaciones internas que usan puertos altos no estándar — validar contra baseline
  - Herramientas de testing autorizadas (pentests) — coordinar ventanas
tags:
  - attack.command_and_control
  - attack.t1071
  - attack.t1571
mitre:
  - T1071
  - T1571`,
  },

  /* ── DNS query to long subdomain via Sysmon 22 ───────────────── */
  {
    id: 'sigma-dns-long-subdomain-sysmon22',
    uuid: 'ef5a6b7c-8d9e-4f0a-9b1c-5d6e7f8a9b0c',
    title: 'Long DNS Query via Sysmon — DNS Tunneling / Data Exfiltration',
    status: 'test',
    description: 'Detecta queries DNS (Sysmon Event ID 22) con QueryName de más de 50 caracteres — típico de tunneling DNS, exfiltración por DNS o C2 encubierto. Complementa la regla Possible DNS Tunneling Indicator (category dns) usando la telemetría de Sysmon en el endpoint.',
    author: 'VaultNotes',
    date: '2025/03/15',
    level: 'medium',
    logsource: { product: 'windows', service: 'sysmon' },
    detection: {
      selectors: [
        [
          { field: 'EventID', values: ['22'] },
          { field: 'QueryName', values: ['??????????????????????????????????????????????????????*'] },
        ],
      ],
      condition: 'selection',
    },
    mitre: ['T1071.004', 'T1572'],
    tags: ['attack.command_and_control', 'attack.t1071.004', 'attack.t1572'],
    eventIds: [22],
    kql: 'SecurityEvent\n| where EventID == 22\n| where strlen(QueryName) > 50\n| summarize queries = count() by Computer, Image, bin(TimeGenerated, 5m)\n| where queries > 10\n| project TimeGenerated, Computer, Image, queries',
    spl: 'index=windows sourcetype=sysmon EventCode=22 | eval qlen=len(QueryName) | where qlen > 50 | bin _time span=5m | stats count by host, Image, _time | where count > 10 | sort - count',
    yaml: `title: Long DNS Query via Sysmon — DNS Tunneling / Data Exfiltration
id: ef5a6b7c-8d9e-4f0a-9b1c-5d6e7f8a9b0c
status: test
description: Detecta queries DNS (Sysmon Event ID 22) con QueryName de más de 50 caracteres — típico de tunneling DNS, exfiltración por DNS o C2 encubierto. Complementa la regla Possible DNS Tunneling Indicator (category dns) usando la telemetría de Sysmon en el endpoint.
references:
  - https://attack.mitre.org/techniques/T1071/004/
  - https://attack.mitre.org/techniques/T1572/
author: VaultNotes
date: 2025/03/15
level: medium
logsource:
  product: windows
  service: sysmon
detection:
  selection:
    EventID: 22
    QueryName: '??????????????????????????????????????????????????????*'
  condition: selection
fields:
  - EventID
  - QueryName
  - QueryResults
  - Image
falsepositives:
  - CDNs y servicios legítimos con subdomains largos (raramente superan 50 chars)
  - DKIM/SPF y selectors de TLS — filtrar por volumen si genera ruido
tags:
  - attack.command_and_control
  - attack.t1071.004
  - attack.t1572
mitre:
  - T1071.004
  - T1572`,
  },

  /* ── Certutil as downloader (LOLBin) ─────────────────────────── */
  {
    id: 'sigma-certutil-urlcache-download',
    uuid: '45b1a2b3-4d5e-4f6a-9b7c-1d2e3f4a5b6c',
    title: 'Certutil Downloading Payload (URLCache / VerifyCTL)',
    status: 'stable',
    description: 'Detecta certutil.exe usado como downloader LOLBin (-urlcache, -verifyctl) — clásico para traer payloads evadiendo controles que solo vigilan browsers, curl y bitsadmin.',
    author: 'VaultNotes',
    date: '2025/03/15',
    level: 'high',
    logsource: { product: 'windows', category: 'process_creation' },
    detection: {
      selectors: [
        [
          { field: 'Image', values: ['*\\certutil.exe'] },
          { field: 'CommandLine', values: ['*-urlcache*', '*-verifyctl*'] },
        ],
      ],
      condition: 'selection',
    },
    mitre: ['T1105'],
    tags: ['attack.command_and_control', 'attack.t1105', 'attack.defense_evasion'],
    eventIds: [1, 4688, 3],
    kql: 'DeviceProcessEvents\n| where FileName =~ "certutil.exe"\n| where ProcessCommandLine has_any ("-urlcache", "-verifyctl")\n| project TimeGenerated, DeviceName, AccountName, ProcessCommandLine, InitiatingProcessFileName',
    spl: 'index=windows Image=*certutil.exe (CommandLine="*-urlcache*" OR CommandLine="*-verifyctl*") | table _time, host, user, CommandLine, ParentImage',
    yaml: `title: Certutil Downloading Payload (URLCache / VerifyCTL)
id: 45b1a2b3-4d5e-4f6a-9b7c-1d2e3f4a5b6c
status: stable
description: Detecta certutil.exe usado como downloader LOLBin (-urlcache, -verifyctl) — clásico para traer payloads evadiendo controles que solo vigilan browsers, curl y bitsadmin.
references:
  - https://attack.mitre.org/techniques/T1105/
  - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/certutil
author: VaultNotes
date: 2025/03/15
level: high
logsource:
  product: windows
  category: process_creation
detection:
  selection:
    Image|endswith: '\\certutil.exe'
    CommandLine|contains:
      - '-urlcache'
      - '-verifyctl'
  condition: selection
fields:
  - Image
  - CommandLine
  - ParentImage
  - User
falsepositives:
  - Administradores usando certutil para descargar CRLs — validar el destino en CommandLine
  - Scripts de mantenimiento de PKI internos — whitelistar por ParentImage
tags:
  - attack.command_and_control
  - attack.t1105
  - attack.defense_evasion
mitre:
  - T1105`,
  },
];

/** Helper: find a Sigma rule by ID. */
export function findSigmaById(id: string): SigmaRule | undefined {
  if (!id) return undefined;
  return SIGMA_RULES.find((r) => r.id === id);
}

/** Helper: find all Sigma rules that reference a MITRE technique ID. */
export function findSigmaByMitre(mitreId: string): SigmaRule[] {
  if (!mitreId) return [];
  const target = mitreId.toUpperCase();
  return SIGMA_RULES.filter((r) => r.mitre.some((m) => m.toUpperCase() === target));
}

/** Helper: find all Sigma rules that reference a Windows Event ID. */
export function findSigmaByEventId(eventId: number): SigmaRule[] {
  return SIGMA_RULES.filter((r) => (r.eventIds || []).includes(eventId));
}
