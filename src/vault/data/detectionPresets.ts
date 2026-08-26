/**
 * detectionPresets.ts — Presets locales para el "Detection Query Helper" de VaultNotes.
 *
 * 100% offline. 11 presets cubriendo los escenarios SOC más comunes.
 *
 * Cada preset incluye: name, description, kql (Microsoft Sentinel / Kusto), spl (Splunk SPL),
 * mitre (array de IDs MITRE ATT&CK).
 *
 * La estructura es estática y ampliable: solo agregar entradas al array DETECTION_PRESETS.
 *
 * Exporta la interfaz `DetectionPreset` y el array `DETECTION_PRESETS`.
 * NO usa `export default`.
 */

export interface DetectionPreset {
  name: string;
  description: string;
  /** Query en KQL (Microsoft Sentinel / Kusto). */
  kql: string;
  /** Query equivalente en SPL (Splunk). */
  spl: string;
  /** MITRE ATT&CK technique IDs referenced. */
  mitre: string[];
}

export const DETECTION_PRESETS: DetectionPreset[] = [
  {
    name: 'Failed Login',
    description: 'Múltiples logons fallidos (Event ID 4625) en una ventana corta — indicador de brute force o password spraying.',
    kql: 'SecurityEvent\n| where EventID == 4625\n| summarize FailedCount = count() by Account, IpAddress, bin(TimeGenerated, 5m)\n| where FailedCount > 5',
    spl: 'index=windows EventCode=4625 | stats count as failed by user, src_ip, date_minute | where failed > 5',
    mitre: ['T1110.001', 'T1110.003'],
  },
  {
    name: 'Successful Login',
    description: 'Logons exitosos (Event ID 4624) — útil como baseline y para detectar accesos desde ubicaciones nuevas.',
    kql: 'SecurityEvent\n| where EventID == 4624\n| project TimeGenerated, Computer, Account, IpAddress, LogonType',
    spl: 'index=windows EventCode=4624 | table _time, host, user, src_ip, LogonType',
    mitre: ['T1078', 'T1078.001'],
  },
  {
    name: 'PowerShell',
    description: 'Ejecución de PowerShell con indicadores sospechosos (encoded, hidden, IEX, FromBase64String).',
    kql: 'DeviceProcessEvents\n| where FileName =~ "powershell.exe" or FileName =~ "pwsh.exe"\n| where ProcessCommandLine has_any ("-EncodedCommand", "-enc ", "-WindowStyle Hidden", "-w hidden", "IEX(", "FromBase64String")\n| project TimeGenerated, DeviceName, AccountName, ProcessCommandLine',
    spl: 'index=windows (Image=*powershell.exe OR Image=*pwsh.exe) (CommandLine="*-EncodedCommand*" OR CommandLine="*-WindowStyle Hidden*" OR CommandLine="*-w hidden*" OR CommandLine="*IEX(*" OR CommandLine="*FromBase64String*") | table _time, host, user, CommandLine',
    mitre: ['T1059.001', 'T1027', 'T1564.003'],
  },
  {
    name: 'Process Creation',
    description: 'Creación de procesos — pivote central de threat hunting. Filtra por imágenes sospechosas o parent/child inusual.',
    kql: 'DeviceProcessEvents\n| project TimeGenerated, DeviceName, InitiatingProcessFileName, FileName, ProcessCommandLine, AccountName',
    spl: 'index=windows sourcetype=process | table _time, host, parent_process, process, CommandLine, user',
    mitre: ['T1059', 'T1059.001', 'T1059.003'],
  },
  {
    name: 'Network Connection',
    description: 'Conexiones salientes a IPs externas o puertos inusuales — pivote de C2 detection.',
    kql: 'DeviceNetworkEvents\n| where RemoteIPType == "Public"\n| project TimeGenerated, DeviceName, InitiatingProcessFileName, RemoteIP, RemotePort, RemoteUrl',
    spl: 'index=network src_ip=* dest_ip=* | where isnotnull(dest_ip) | table _time, host, process, dest_ip, dest_port, dest_host',
    mitre: ['T1071.001', 'T1105', 'T1571'],
  },
  {
    name: 'Suspicious IP',
    description: 'Tráfico hacia una IP sospechosa específica — reemplazar la IP con tu IOC del momento.',
    kql: 'DeviceNetworkEvents\n| where RemoteIP == "10.10.10.10"  // ← reemplazar con tu IOC\n| project TimeGenerated, DeviceName, InitiatingProcessFileName, RemoteIP, RemotePort, RemoteUrl',
    spl: 'index=* dest_ip="10.10.10.10"  // ← reemplazar con tu IOC | table _time, host, process, dest_ip, dest_port, dest_host',
    mitre: ['T1071.001', 'T1105', 'T1041'],
  },
  {
    name: 'User Account Activity',
    description: 'Actividad completa de una cuenta — logons, cambios de grupo, acciones privilegiadas.',
    kql: 'SecurityEvent\n| where Account == "username"  // ← reemplazar\n| where EventID in (4624, 4625, 4720, 4722, 4726, 4732, 4738, 4672)\n| project TimeGenerated, EventID, Activity, Computer, IpAddress',
    spl: 'index=windows user="username" (EventCode=4624 OR EventCode=4625 OR EventCode=4720 OR EventCode=4722 OR EventCode=4726 OR EventCode=4732 OR EventCode=4738 OR EventCode=4672) | table _time, EventCode, signature, host, src_ip',
    mitre: ['T1078', 'T1136', 'T1098'],
  },
  {
    name: 'Encoded PowerShell',
    description: 'PowerShell con -EncodedCommand / -enc — indicador fuerte de ofuscación.',
    kql: 'DeviceProcessEvents\n| where FileName =~ "powershell.exe" or FileName =~ "pwsh.exe"\n| where ProcessCommandLine has_any ("-EncodedCommand", "-enc ", " -e ", " -ec ")\n| project TimeGenerated, DeviceName, AccountName, ProcessCommandLine',
    spl: 'index=windows Image=*powershell.exe (CommandLine="*-EncodedCommand*" OR CommandLine="*-enc *" OR CommandLine="* -e *" OR CommandLine="* -ec *") | table _time, host, user, CommandLine',
    mitre: ['T1059.001', 'T1027', 'T1027.010'],
  },
  {
    name: 'New Service',
    description: 'Creación de un nuevo servicio de Windows (Event ID 7045 / 4697) — mecanismo de persistencia.',
    kql: 'union SecurityEvent, DeviceEvents\n| where EventID == 4697 or EventType == "ServiceInstalled"\n| project TimeGenerated, DeviceName, ServiceName, ServiceFileName, AccountName',
    spl: 'index=windows (EventCode=7045 OR EventCode=4697) | table _time, host, ServiceName, ImagePath, user',
    mitre: ['T1543.003', 'T1547.001'],
  },
  {
    name: 'Scheduled Task',
    description: 'Creación de tareas programadas (Event ID 4698) — persistencia clásica.',
    kql: 'SecurityEvent\n| where EventID == 4698\n| where tostring(TaskContent) !startswith "<TaskProps" or TaskName !startswith "\\\\Microsoft\\\\Windows"\n| project TimeGenerated, Computer, TaskName, TaskContent, SubjectUserName',
    spl: 'index=windows EventCode=4698 TaskName!=*Microsoft\\\\Windows\\\\* | table _time, host, TaskName, TaskContent, user',
    mitre: ['T1053.005', 'T1053'],
  },
  {
    name: 'Account Creation',
    description: 'Creación de nuevas cuentas de usuario (Event ID 4720) — puede ser persistencia o lateral movement.',
    kql: 'SecurityEvent\n| where EventID == 4720\n| project TimeGenerated, Computer, TargetUserName, SubjectUserName',
    spl: 'index=windows EventCode=4720 | table _time, host, new_user, created_by',
    mitre: ['T1136.001', 'T1136'],
  },
];
