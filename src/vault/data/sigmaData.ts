/**
 * sigmaData.ts — Dataset LOCAL de reglas Sigma para el "Sigma Explorer" de VaultNotes.
 *
 * 100% offline. NO descarga reglas de github.com/SigmaHQ.
 * Las reglas fueron curadas manualmente como ejemplos representativos de detección SOC.
 * Calidad sobre cantidad: ~15 reglas cubriendo los escenarios más comunes.
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
