/**
 * socToolsData.ts — GUÍAS DE HERRAMIENTAS SOC (V9 FASE 7).
 *
 * Dataset completo: 8 guías de herramientas SOC reales — Microsoft Sentinel
 * (KQL), Splunk (SPL), Elastic Security (KQL/Lucene), Wireshark (display
 * filters), Sysmon (config + eventos), Microsoft Defender (PowerShell),
 * VirusTotal + ANY.RUN (sandbox) y TheHive (case management). Cada guía:
 * propósito, cuándo usarla, secciones con snippets COPIABLES y pro tips.
 *
 * Reglas del dataset: los bloques code son queries/comandos/configs REALES
 * (nada inventado); lo que solo se hace por consola se documenta como texto
 * (detail), nunca como código falso. Texto es-CO; código tal cual en inglés;
 * placeholders {{USERNAME}} {{SOURCE_IP}} {{HOSTNAME}} {{TIMESTAMP}}.
 *
 * La UI las consume vía SOC_TOOL_GUIDE_BY_ID (SocGuideTool.tsx), con ids:
 * sentinel, splunk, elastic, wireshark, sysmon, defender, sandbox, thehive.
 */

/** Bloque copiable de una guía. */
export interface SocGuideBlock {
  /** Qué es este snippet / paso. */
  label: string;
  /** Cuándo usarlo / por qué importa. */
  detail?: string;
  /** Snippet copiable (KQL / SPL / display filter / config / comando). */
  code?: string;
  /** Nota extra (advertencia, límite, alternativa). */
  note?: string;
}

/** Sección temática de una guía. */
export interface SocGuideSection {
  title: string;
  intro?: string;
  blocks: SocGuideBlock[];
}

/** Guía completa de una herramienta SOC. */
export interface SocToolGuide {
  /** Id de la guía ('sentinel', 'splunk'…). */
  id: string;
  /** Nombre visible. */
  name: string;
  /** Qué es la herramienta en una frase. */
  purpose: string;
  /** Cuándo usarla (2-4 situaciones). */
  whenToUse: string[];
  sections: SocGuideSection[];
  /** Tips de operador. */
  proTips?: string[];
}

export const SOC_TOOL_GUIDES: SocToolGuide[] = [
  {
    id: 'sentinel',
    name: 'Microsoft Sentinel (KQL)',
    purpose: 'SIEM cloud de Microsoft donde todo el hunting, la correlación y el triage se escriben en KQL sobre las tablas del workspace.',
    whenToUse: [
      'Investigar actividad de cuentas Entra ID: sign-ins fallidos, MFA interrumpido, travel imposible.',
      'Cazar patrones en eventos de Windows: spray (4625), bloqueos (4740), cambios de grupo (4728/4732).',
      'Trazar procesos en endpoints con Defender for Endpoint: PowerShell codificado, LOLBins.',
      'Revisar campañas de phishing y clics de Safe Links con las tablas de correo.',
    ],
    sections: [
      {
        title: 'Sintaxis base de KQL',
        intro: 'Toda query es tabla + tubería + operadores encadenados. Domina where, project, extend, summarize y order by y podrás leer cualquier query del equipo.',
        blocks: [
          {
            label: 'Anatomía: where + project + order by',
            detail: 'Últimos sign-ins de un usuario con solo las columnas que importan para el triage.',
            code: `SigninLogs
| where TimeGenerated > ago(24h)
| where UserPrincipalName == "{{USERNAME}}"
| project TimeGenerated, UserPrincipalName, IPAddress, AppDisplayName, ResultType, ResultDescription
| order by TimeGenerated desc
| take 20`,
          },
          {
            label: 'extend: columnas calculadas',
            detail: 'Crea campos derivados antes de resumir; aquí se normaliza la cuenta para agrupar sin distinguir mayúsculas.',
            code: `SecurityEvent
| where TimeGenerated > ago(1h)
| extend cuenta = tolower(TargetUserName)
| summarize Eventos = count() by EventID, cuenta
| order by Eventos desc`,
          },
          {
            label: 'summarize: agrupar y contar',
            detail: 'El group by de KQL. dcount() cuenta valores distintos y es la base de la detección de spray.',
            code: `SigninLogs
| where TimeGenerated > ago(24h)
| summarize Total = count(), Usuarios = dcount(UserPrincipalName), IPs = dcount(IPAddress) by AppDisplayName
| order by Total desc`,
          },
          {
            label: 'Ventanas de tiempo absolutas',
            detail: 'ago() va hacia atrás desde ahora; between() con datetime() reproduce la ventana exacta del incidente.',
            code: `SecurityEvent
| where TimeGenerated between (datetime(2025-05-20 09:00:00) .. datetime(2025-05-20 12:00:00))
| where EventID == 4625
| summarize Fallos = count() by IpAddress
| order by Fallos desc`,
            note: 'Reemplaza las dos fechas por la ventana reportada en el ticket (hora del servidor de logs).',
          },
        ],
      },
      {
        title: 'Hunting de sign-ins (SigninLogs)',
        intro: 'SigninLogs trae los accesos interactivos de Entra ID: aquí viven los ResultType de error y los eventos de riesgo de Identity Protection.',
        blocks: [
          {
            label: 'Sign-ins fallidos por IP (patrón spray)',
            detail: 'Una IP con muchos fallos y muchas cuentas distintas es spray; con muchos fallos de la misma cuenta, fuerza bruta dirigida.',
            code: `SigninLogs
| where TimeGenerated > ago(24h)
| where ResultType != "0"
| summarize Fallos = count(), Cuentas = dcount(UserPrincipalName) by IPAddress
| where Fallos > 10 and Cuentas > 5
| order by Fallos desc`,
          },
          {
            label: 'MFA fallido o interrumpido',
            detail: 'ResultType 50076 y 500121 son retos MFA que no pasaron: el clásico del atacante que ya tiene la contraseña.',
            code: `SigninLogs
| where TimeGenerated > ago(24h)
| where ResultType in ("50076", "500121")
| project TimeGenerated, UserPrincipalName, IPAddress, AppDisplayName, ResultDescription
| order by TimeGenerated desc`,
            note: 'Chuleta de ResultType: 0 = éxito, 50126 = credenciales inválidas, 50053 = cuenta bloqueada, 50076/500121 = MFA.',
          },
          {
            label: 'Sign-ins con riesgo',
            detail: 'Filtra los accesos que Entra ID marcó con riesgo medio o alto o que quedaron en estado atRisk.',
            code: `SigninLogs
| where TimeGenerated > ago(24h)
| where RiskLevelDuringSignIn in ("medium", "high") or RiskState == "atRisk"
| project TimeGenerated, UserPrincipalName, IPAddress, Location, RiskEventTypes, RiskLevelDuringSignIn, RiskState
| order by TimeGenerated desc`,
          },
          {
            label: 'Travel atípico y spray detectado',
            detail: 'RiskEventTypes trae el tipo de detección: atypicalTravel es el travel imposible y passwordSpray el spray que Entra detectó.',
            code: `SigninLogs
| where TimeGenerated > ago(24h)
| where RiskEventTypes has_any ("atypicalTravel", "passwordSpray", "unfamiliarFeatures", "leakedCredentials")
| project TimeGenerated, UserPrincipalName, Location, IPAddress, RiskEventTypes
| order by TimeGenerated desc`,
          },
        ],
      },
      {
        title: 'IdentityProtection: tablas de riesgo',
        intro: 'Con el conector de Entra ID Protection activo llegan AADUserRiskEvents (detecciones) y AADRiskyUsers (estado por usuario). En Sentinel quédate con KQL: los cmdlets de Graph son otra vía y otro runbook.',
        blocks: [
          {
            label: 'Eventos de riesgo del usuario',
            detail: 'Una fila por detección: IP anónima, credenciales filtradas, spray, malware en el dispositivo, etc.',
            code: `AADUserRiskEvents
| where TimeGenerated > ago(24h)
| project TimeGenerated, UserPrincipalName, RiskEventType, RiskLevel, RiskState
| order by TimeGenerated desc`,
          },
          {
            label: 'Usuarios en riesgo alto',
            detail: 'La lista para priorizar remediación: reset de contraseña y revocación de sesiones.',
            code: `AADRiskyUsers
| where TimeGenerated > ago(24h)
| where RiskLevel == "high" and RiskState == "atRisk"
| project TimeGenerated, UserPrincipalName, RiskLevel, RiskState
| order by TimeGenerated desc`,
          },
          {
            label: 'Sign-ins no interactivos',
            detail: 'El atacante con token robado usa flujos no interactivos: revisa esta tabla cuando el usuario jura que no inició sesión.',
            code: `AADNonInteractiveUserSignInLogs
| where TimeGenerated > ago(24h)
| where UserPrincipalName == "{{USERNAME}}"
| project TimeGenerated, ResourceDisplayName, IPAddress, ResultType
| order by TimeGenerated desc
| take 50`,
          },
        ],
      },
      {
        title: 'Hunting en SecurityEvent (Windows)',
        intro: 'Con el conector de Security Events (AMA) tienes los EventID clásicos de AD. Estos queries resuelven el grueso del triage de cuentas.',
        blocks: [
          {
            label: '4625: spray de contraseñas',
            detail: 'Fallos masivos por IP con cuentas distintas: el patrón más común que vas a cazar como L1.',
            code: `SecurityEvent
| where TimeGenerated > ago(24h)
| where EventID == 4625
| summarize Fallos = count(), Cuentas = dcount(TargetUserName) by IpAddress
| where Fallos >= 20 and Cuentas >= 5
| order by Fallos desc`,
          },
          {
            label: '4740: cuentas bloqueadas',
            detail: 'Cada lockout genera un 4740; muchos juntos suelen ser el spray machacando cuentas protegidas con bloqueo.',
            code: `SecurityEvent
| where TimeGenerated > ago(24h)
| where EventID == 4740
| project TimeGenerated, TargetUserName, SubjectUserName, Computer
| order by TimeGenerated desc`,
          },
          {
            label: '4720/4728/4732: cuentas y grupos',
            detail: '4720 = cuenta creada, 4728 = alta en grupo global, 4732 = alta en grupo local de dominio. Alta en grupo de admin fuera de ventana de cambio: roja.',
            code: `SecurityEvent
| where TimeGenerated > ago(24h)
| where EventID in (4720, 4728, 4732)
| project TimeGenerated, EventID, TargetUserName, MemberName, SubjectUserName, Computer
| order by TimeGenerated desc`,
          },
          {
            label: 'Contexto completo de host o cuenta',
            detail: 'Activity trae el texto del evento (p. ej. An account failed to log on): el contexto de una hora caliente, legible.',
            code: `SecurityEvent
| where TimeGenerated > ago(1h)
| where Computer == "{{HOSTNAME}}" or TargetUserName == "{{USERNAME}}"
| project TimeGenerated, EventID, Activity, TargetUserName, IpAddress
| order by TimeGenerated desc`,
          },
        ],
      },
      {
        title: 'DeviceProcessEvents: endpoints con MDE',
        intro: 'Con Defender for Endpoint conectado al workspace tienes las tablas de advanced hunting. Ojo: aquí el tiempo es Timestamp, no TimeGenerated.',
        blocks: [
          {
            label: 'Procesos de un host',
            detail: 'La línea de base para responder qué ejecutó el usuario en la ventana del incidente.',
            code: `DeviceProcessEvents
| where Timestamp > ago(24h)
| where DeviceName == "{{HOSTNAME}}"
| project Timestamp, FileName, ProcessCommandLine, InitiatingProcessFileName, AccountName
| order by Timestamp desc
| take 50`,
          },
          {
            label: 'PowerShell codificado',
            detail: 'has_any busca cualquiera de los tokens sin distinguir mayúsculas; estos cinco cubren la mayoría de los one-liners ofensivos.',
            code: `DeviceProcessEvents
| where Timestamp > ago(24h)
| where FileName =~ "powershell.exe"
| where ProcessCommandLine has_any ("-enc", "-encodedcommand", "FromBase64String", "IEX(", "DownloadString")
| project Timestamp, DeviceName, AccountName, ProcessCommandLine, InitiatingProcessFileName
| order by Timestamp desc`,
          },
          {
            label: 'LOLBins con descarga',
            detail: 'Binarios firmados de Windows abusados para bajar payload: certutil, bitsadmin, mshta, regsvr32, rundll32.',
            code: `DeviceProcessEvents
| where Timestamp > ago(24h)
| where FileName in~ ("certutil.exe", "bitsadmin.exe", "mshta.exe", "regsvr32.exe", "rundll32.exe")
| where ProcessCommandLine has "http"
| project Timestamp, DeviceName, FileName, ProcessCommandLine, InitiatingProcessFileName
| order by Timestamp desc`,
            note: 'in~ compara sin distinguir mayúsculas; has también es case-insensitive (has_cs es la versión sensible).',
          },
        ],
      },
      {
        title: 'EmailEvents: phishing y clics',
        intro: 'Con Defender for Office 365 conectado, el correo y los clics de Safe Links se consultan por tabla, no por consola.',
        blocks: [
          {
            label: 'Correo marcado como phish',
            detail: 'ThreatTypes y DetectionMethods traen el veredicto; DeliveryAction dice si llegó a bandeja o se quedó en cuarentena.',
            code: `EmailEvents
| where Timestamp > ago(24h)
| where EmailDirection == "Inbound" and (ThreatTypes has "Phish" or DetectionMethods has "Phish")
| project Timestamp, SenderFromAddress, RecipientEmailAddress, Subject, ThreatTypes, DeliveryAction, DeliveryLocation
| order by Timestamp desc`,
          },
          {
            label: 'URLs clicadas (UrlClickEvents)',
            detail: 'Después de una campaña, la pregunta es quién hizo clic y si Safe Links bloqueó: ActionType Allowed significa clic permitido.',
            code: `UrlClickEvents
| where Timestamp > ago(24h)
| where ActionType == "Allowed"
| project Timestamp, RecipientEmailAddress, Url, ActionType
| order by Timestamp desc`,
          },
          {
            label: 'Remitentes repetidos',
            detail: 'Volumen alto de un mismo remitente en el día: campañas o cuentas comprometidas enviando.',
            code: `EmailEvents
| where Timestamp > ago(24h)
| summarize Correos = count() by SenderFromAddress, SenderIp
| where Correos > 10
| order by Correos desc`,
          },
        ],
      },
      {
        title: 'Ventanas de tiempo y joins',
        intro: 'Correlacionar dos tablas en una ventana acotada es el corazón del hunting: bin() para series, join para cruzar, let para parametrizar.',
        blocks: [
          {
            label: 'Serie temporal con bin(5m)',
            detail: 'Convierte el tiempo en cubos de 5 minutos: las ráfagas de fallos y el beaconing se ven como picos.',
            code: `SecurityEvent
| where TimeGenerated > ago(6h)
| where EventID == 4625
| summarize Fallos = count() by bin(TimeGenerated, 5m), IpAddress
| render timechart`,
          },
          {
            label: 'join kind=inner: contexto cruzado',
            detail: 'Logon de red del usuario + PowerShell ejecutado después en el mismo equipo: une DeviceLogonEvents con DeviceProcessEvents por DeviceId.',
            code: `DeviceLogonEvents
| where Timestamp > ago(24h)
| where AccountName == "{{USERNAME}}" and LogonType == 3
| join kind=inner (DeviceProcessEvents | where Timestamp > ago(24h) | where FileName =~ "powershell.exe") on DeviceId
| project Timestamp, DeviceName, AccountName, ProcessCommandLine
| order by Timestamp desc`,
          },
          {
            label: 'let: parametrizar la ventana',
            detail: 'Define la hora del incidente una sola vez y úsala en toda la query: menos errores al reproducir la evidencia.',
            code: `let inicio = datetime(2025-05-20 09:00:00);
SecurityEvent
| where TimeGenerated between (inicio .. inicio + 10m)
| where EventID in (4720, 4728, 4732)
| project TimeGenerated, EventID, TargetUserName, SubjectUserName, Computer`,
          },
        ],
      },
    ],
    proTips: [
      'Empieza siempre acotando el tiempo con ago() o between(): una query sin ventana barre todo el workspace y se vuelve lenta.',
      'Guarda las queries útiles desde el editor de logs y reutilízalas cambiando solo el rango: el 90% del hunting es reciclar.',
      'ResultType de SigninLogs es tu traductor rápido: 0 = éxito, 50126 = credenciales inválidas, 50053 = bloqueada, 50076/500121 = MFA.',
      'Si la query va lenta, reduce columnas con project antes de summarize y cierra con take: menos datos movidos, misma respuesta.',
    ],
  },
  {
    id: 'splunk',
    name: 'Splunk (SPL)',
    purpose: 'SIEM de búsqueda por tuberías: SPL encadena comandos con pipe sobre índices y sourcetypes para filtrar, contar y graficar.',
    whenToUse: [
      'Triage de eventos de Windows desde la cola de alertas en un SOC on-prem o híbrido.',
      'Detección de patrones de spray, beaconing y abuso de PowerShell sobre índices históricos.',
      'Generar la evidencia exportable (tablas y timecharts) que va al ticket del incidente.',
    ],
    sections: [
      {
        title: 'Sintaxis base de SPL',
        intro: 'Toda búsqueda es: términos (índice, sourcetype, campos) + comandos encadenados con pipe que filtran, transforman y formatean.',
        blocks: [
          {
            label: 'search + stats + sort',
            detail: 'El flujo canónico: buscar, contar por campo y ordenar descendente.',
            code: `index=main sourcetype=WinEventLog:Security EventCode=4625
| stats count by src_ip, user
| sort - count`,
          },
          {
            label: 'Ventanas de tiempo',
            detail: 'earliest/latest se ponen junto a los términos de búsqueda; @h redondea a la hora exacta (snap to time).',
            code: `index=main sourcetype=WinEventLog:Security earliest=-24h@h latest=now EventCode=4625
| stats count`,
          },
          {
            label: 'dedup: la última ocurrencia por valor',
            detail: 'Lista IPs sin repetir, quedándose con el fallo más reciente de cada una.',
            code: `index=main sourcetype=WinEventLog:Security EventCode=4625
| dedup src_ip sortby -_time
| table _time, host, src_ip, user, failure_reason`,
          },
          {
            label: 'top y rare',
            detail: 'top muestra los valores más frecuentes con porcentaje; rare devuelve los raros, que a veces son justo la señal.',
            code: `index=main sourcetype=WinEventLog:Security EventCode=4625
| top limit=10 src_ip`,
          },
        ],
      },
      {
        title: 'Logons fallidos (4625)',
        intro: 'Con el Add-on de Windows, el 4625 llega con src_ip, user y failure_reason extraídos: la base de todo triage de cuentas.',
        blocks: [
          {
            label: 'Fallos por IP y usuario',
            detail: 'El primer query de la mañana: quién está fallando y contra qué cuentas.',
            code: `index=main sourcetype=WinEventLog:Security EventCode=4625 earliest=-24h
| stats count as fallos by src_ip, user
| where fallos > 5
| sort - fallos`,
          },
          {
            label: 'Razón de fallo de una IP',
            detail: 'failure_reason trae el subestado: 0xC000006A = contraseña incorrecta, 0xC0000064 = usuario no existe.',
            code: `index=main sourcetype=WinEventLog:Security EventCode=4625 src_ip={{SOURCE_IP}}
| table _time, host, user, failure_reason
| sort - _time`,
            note: 'Muchos 0xC0000064 desde una misma IP = enumeración de usuarios, no fuerza bruta.',
          },
          {
            label: 'Fallos por host objetivo',
            detail: 'Distingue spray contra un servidor (muchos user, un host) de fuerza bruta dispersa por la red.',
            code: `index=main sourcetype=WinEventLog:Security EventCode=4625 earliest=-24h
| stats count as fallos by host, user
| sort - fallos`,
          },
        ],
      },
      {
        title: 'Password spray (dc)',
        intro: 'La firma del spray: una IP que toca MUCHAS cuentas distintas con POCOS intentos por cuenta. dc(user) es el operador que lo destapa.',
        blocks: [
          {
            label: 'Usuarios distintos por IP',
            detail: 'El query con el que más incidentes vas a abrir como L1 de un SOC con Windows.',
            code: `index=main sourcetype=WinEventLog:Security EventCode=4625 earliest=-24h
| stats dc(user) as distinct_users, count as intentos by src_ip
| where distinct_users > 5 AND intentos > 20
| sort - distinct_users`,
          },
          {
            label: 'Ráfagas en ventanas de 5 minutos',
            detail: 'bin crea la ventana temporal: el spray real aparece como picos de usuarios únicos por IP.',
            code: `index=main sourcetype=WinEventLog:Security EventCode=4625 earliest=-24h
| bin _time span=5m
| stats dc(user) as usuarios_unicos, count as intentos by _time, src_ip
| where usuarios_unicos > 10
| sort - _time`,
          },
          {
            label: '¿El spray acertó?',
            detail: 'El spray que importa es el que logra un 4624 (éxito) del mismo src_ip poco después de la ráfaga.',
            code: `index=main sourcetype=WinEventLog:Security (EventCode=4625 OR EventCode=4624) src_ip={{SOURCE_IP}} earliest=-24h
| stats count by EventCode, user
| sort user`,
          },
        ],
      },
      {
        title: 'Beaconing (C2)',
        intro: 'Un C2 llama a casa con intervalos regulares: muchos eventos al mismo destino, separados casi exactamente por el mismo delta de tiempo.',
        blocks: [
          {
            label: 'Rango y volumen por par origen-destino',
            detail: 'range(_time) es la duración total del patrón; el intervalo promedio entre conexiones se calcula de ahí.',
            code: `index=main sourcetype=stream:http earliest=-24h
| stats count as conexiones, min(_time) as primera, max(_time) as ultima, range(_time) as rango by src_ip, dest
| eval intervalo_prom = rango / max(conexiones - 1, 1)
| where conexiones > 20 AND intervalo_prom > 60
| sort - conexiones`,
            note: 'Un intervalo promedio entre 60 y 3600 segundos con volumen alto y regular es candidato a beacon.',
          },
          {
            label: 'Deltas exactos de una IP concreta',
            detail: 'delta calcula la diferencia contra el evento anterior; stdev bajo significa cadencia metronómica.',
            code: `index=main sourcetype=stream:http src_ip={{SOURCE_IP}} earliest=-24h
| sort 0 _time
| delta _time as delta_segundos p=1
| stats avg(delta_segundos) as intervalo_prom, stdev(delta_segundos) as jitter, count as conexiones`,
          },
          {
            label: 'Confirmación visual',
            detail: 'En el timechart un beacon se ve como picos uniformes; abre la pestaña Visualization del buscador.',
            code: `index=main sourcetype=stream:http src_ip={{SOURCE_IP}} earliest=-24h
| timechart span=30m count by dest`,
          },
        ],
      },
      {
        title: 'PowerShell codificado',
        intro: 'Con scriptblock logging (4104) y process creation auditing (4688), el patrón -EncodedCommand queda en el campo Message y se caza con comodines.',
        blocks: [
          {
            label: 'Tokens de codificación',
            detail: 'El search tras el primer pipe re-filtra los resultados ya recuperados.',
            code: `index=main earliest=-24h (EventCode=4688 OR EventCode=4104)
| search Message="*EncodedCommand*" OR Message="*FromBase64String*" OR Message="*-w hidden*"
| table _time, host, EventCode, Message`,
            note: 'Comodines sobre Message son caros: acota SIEMPRE con EventCode y ventana de tiempo antes del primer pipe.',
          },
          {
            label: '4104 en el log operacional de PowerShell',
            detail: 'Scriptblock logging trae el script descodificado: el cuerpo de lo que realmente ejecutó.',
            code: `index=main sourcetype="WinEventLog:Microsoft-Windows-PowerShell/Operational" EventCode=4104
| search Message="*FromBase64String*" OR Message="*DownloadString*" OR Message="*IEX*"
| table _time, host, Message`,
          },
          {
            label: '4688 con línea de comando',
            detail: 'Requiere Audit Process Creation activo y el GPO que incluye la línea de comando en el evento.',
            code: `index=main sourcetype=WinEventLog:Security EventCode=4688 earliest=-24h
| search Message="*powershell*"
| table _time, host, user, Message`,
          },
        ],
      },
      {
        title: 'Cambios en grupos de admins',
        intro: 'El movimiento de privilegio en AD se registra en 4728 (grupo global), 4732 (grupo local de dominio) y 4756 (grupo universal).',
        blocks: [
          {
            label: 'Altas en grupos',
            detail: 'user es quien hizo el cambio; el miembro añadido está en la sección Member del Message.',
            code: `index=main sourcetype=WinEventLog:Security (EventCode=4728 OR EventCode=4732 OR EventCode=4756) earliest=-7d
| table _time, host, EventCode, user, Message
| sort - _time`,
          },
          {
            label: 'Quién agrega más miembros',
            detail: 'Patrón de administradores legítimos vs cuentas que no deberían estar moviendo membresías.',
            code: `index=main sourcetype=WinEventLog:Security (EventCode=4728 OR EventCode=4732) earliest=-30d
| stats count by user, host
| sort - count`,
          },
          {
            label: 'Cuenta creada y promovida',
            detail: '4720 (cuenta nueva) seguido de un alta en grupo de administración en pocas horas: persistencia clásica.',
            code: `index=main sourcetype=WinEventLog:Security (EventCode=4720 OR EventCode=4728 OR EventCode=4732) earliest=-24h
| table _time, host, EventCode, user, Message
| sort - _time`,
          },
        ],
      },
      {
        title: 'Timechart para reportar',
        intro: 'El timechart vende el incidente: muestra la ráfaga, cuándo empieza y cuándo termina. Cualquier stats se vuelve serie temporal con timechart.',
        blocks: [
          {
            label: 'Serie de 4625 por hora',
            detail: 'limit=5 deja las 5 IPs con más eventos y agrupa el resto en OTHER.',
            code: `index=main sourcetype=WinEventLog:Security EventCode=4625 earliest=-24h
| timechart span=1h count by src_ip limit=5`,
          },
          {
            label: 'Salud de ingesta por índice',
            detail: 'Sin eventos en la ventana puede ser problema de ingesta, no de seguridad: revísalo antes de concluir.',
            code: `index=* earliest=-4h latest=now
| timechart span=15m count by index`,
          },
          {
            label: 'Exportar la evidencia',
            detail: 'Con la tabla lista: Export en la barra de resultados a CSV; al ticket van el CSV, la query completa y la ventana de tiempo.',
            code: `index=main sourcetype=WinEventLog:Security EventCode=4625 src_ip={{SOURCE_IP}} earliest=-24h
| table _time, host, user, failure_reason
| sort _time`,
          },
        ],
      },
    ],
    proTips: [
      'Casi todo query lento se arregla acotando ANTES del primer pipe: index, sourcetype, EventCode y earliest.',
      'De memoria: stats, dc, top, timechart y where post-stats resuelven el triage diario.',
      'Los campos dependen del Add-on que ingiere: si un campo no existe, revisa los Interesting Fields del panel izquierdo y el Message crudo.',
      'Guarda las búsquedas que funcionan (Save As → Search) para reutilizarlas en el próximo turno: la cola no perdona empezar de cero.',
    ],
  },
  {
    id: 'elastic',
    name: 'Elastic Security (KQL + Lucene)',
    purpose: 'SIEM/XDR de Elastic: el query bar de Discover, Timeline y alertas acepta KQL o Lucene sobre data views con campos ECS.',
    whenToUse: [
      'Triaje rápido de procesos, red y autenticación desde la vista de búsqueda o la cola de alertas.',
      'Investigación de un campo puntual: un proceso raro, una IP, un host concreto.',
      'Leer las reglas de detección y pivotear de una alerta al Timeline para el contexto.',
    ],
    sections: [
      {
        title: 'Query bar: sintaxis KQL',
        intro: 'KQL (Kibana Query Language) es el lenguaje simple del query bar: campo: valor combinado con and, or y not, con comodines sobre el valor.',
        blocks: [
          {
            label: 'Match de proceso',
            detail: 'Si escribes términos sin campo, KQL busca en los campos por defecto del data view; con campo, match del valor.',
            code: `process.name: powershell.exe and process.command_line: *-enc*`,
          },
          {
            label: 'Listas de valores',
            detail: 'Paréntesis con or: la forma corta de buscar una familia de intérpretes.',
            code: `process.name: (cmd.exe or powershell.exe or wscript.exe or mshta.exe)`,
          },
          {
            label: 'Procesos lanzados por Office',
            detail: 'La firma clásica de macro maliciosa: un documento de Office como padre de un intérprete.',
            code: `process.parent.name: winword.exe and process.name: (cmd.exe or powershell.exe or wscript.exe)`,
          },
          {
            label: 'Contexto por host y categoría',
            detail: 'event.category (process, network, authentication, file) es el discriminador principal de ECS.',
            code: `host.name: "{{HOSTNAME}}" and event.category: process`,
          },
          {
            label: 'Niego y compruebo firma',
            detail: 'Un binario que debería estar firmado y no lo está es la primera señal de suplantación.',
            code: `process.name: rundll32.exe and not process.code_signature.exists: true`,
          },
        ],
      },
      {
        title: 'Lucene: comodines y booleanos',
        intro: 'Cambia el lenguaje del query bar a Lucene para búsquedas más finas: comodines libres, rangos, CIDR y campos ausentes.',
        blocks: [
          {
            label: 'Contains con comodín',
            detail: 'El comodín en medio o al inicio hace substring; el inicial es caro: acompáñalo de otros términos o rango de tiempo.',
            code: `process.command_line: *EncodedCommand*`,
          },
          {
            label: 'AND / OR / NOT explícitos',
            detail: 'Lucene usa operadores en mayúscula; el 4625 de Windows llega con event.code y user.name.',
            code: `event.code: 4625 AND user.name: {{USERNAME}}`,
          },
          {
            label: 'CIDR y rangos',
            detail: 'Sobre campos IP acepta notación CIDR; los rangos numéricos van con TO entre corchetes.',
            code: `source.ip: 10.10.10.0/24 AND destination.port: [1024 TO 65535]`,
          },
          {
            label: 'Campos ausentes',
            detail: 'Encuentra eventos con el campo vacío: típico de parses incompletos o ingesta nueva.',
            code: `NOT _exists_:user.name`,
          },
        ],
      },
      {
        title: 'Datasets: process, network, auth',
        intro: 'En ECS todo se separa por event.dataset y event.category. Con Elastic Defend los eventos de endpoint llegan como endpoint.events.*; los logs de Windows como system.security.',
        blocks: [
          {
            label: 'Procesos de endpoint',
            detail: 'La telemetría del agente Defend con línea de comando completa.',
            code: `event.dataset: "endpoint.events.process" and process.name: "powershell.exe"`,
          },
          {
            label: 'Red de endpoint',
            detail: 'Añade destination.port o destination.domain para afinar el destino.',
            code: `event.dataset: "endpoint.events.network" and source.ip: {{SOURCE_IP}}`,
          },
          {
            label: 'Autenticación de Windows',
            detail: 'Con la integración de Windows System, el security log llega con event.code y user.name extraídos.',
            code: `event.dataset: "system.security" and event.code: 4625`,
          },
          {
            label: 'Archivos escritos',
            detail: 'Eventos de creación de archivos: drops de malware en rutas de usuario.',
            code: `event.dataset: "endpoint.events.file" and file.name: *.exe`,
          },
        ],
      },
      {
        title: 'Reglas de detección (concepto)',
        intro: 'Las detection rules son queries que corren contra los datos y abren alertas. L1 no escribe reglas el día uno, pero sí debe leer la que disparó su alerta.',
        blocks: [
          {
            label: 'Dónde viven (ruta en consola)',
            detail: 'Security → Rules → Detection rules: cada regla muestra su query, severidad e intervalo de ejecución. Desde una alerta, la opción View rule abre la query exacta que la generó.',
          },
          {
            label: 'EQL: secuencia padre-hijo',
            detail: 'Las reglas aceptan también EQL, ideal para secuencias: Word y luego cmd en el mismo proceso entidad.',
            code: `sequence by host.id, process.entity_id
  [process where process.name : "winword.exe"]
  [process where process.name : "cmd.exe"]`,
          },
          {
            label: 'Query de regla típica (KQL)',
            detail: 'El nivel de complejidad usual de una custom query rule: una línea.',
            code: `process.name: "powershell.exe" and process.command_line: "*-enc*"`,
          },
        ],
      },
      {
        title: 'Timeline y Session View (concepto)',
        intro: 'Timeline es el espacio de investigación: varias queries apiladas sobre una línea de tiempo. Session View reconstruye el árbol de procesos de un endpoint.',
        blocks: [
          {
            label: 'Timeline (ruta en consola)',
            detail: 'Security → Timelines → Create timeline: agrega queries, marca eventos y guarda el timeline como evidencia del caso. Desde una alerta: Actions → Investigate in timeline.',
          },
          {
            label: 'Session View (ruta en consola)',
            detail: 'Dentro de un timeline con eventos de proceso de un host, la vista Session despliega el árbol padre-hijo con línea de tiempo integrada: ahí se ve la inyección y el drop.',
          },
          {
            label: 'Pivotear de alerta a proceso',
            detail: 'En el detalle de la alerta, expande el evento, ubica process.entity_id y usa la lupa del campo para filtrar todo lo de ese proceso exacto: red incluida.',
          },
        ],
      },
    ],
    proTips: [
      'El error más común: los keyword fields hacen match completo; si no matchea nada, prueba comillas o comodín.',
      'El selector de lenguaje KQL/Lucene vive a la izquierda del query bar: los errores de sintaxis suelen ser por mezclar los dos.',
      'La lupa junto a cualquier campo del documento es el pivot más rápido: un clic agrega el filtro exacto.',
      'Guarda los filtros frecuentes como saved query en Discover para no reescribirlos en cada turno.',
    ],
  },
  {
    id: 'wireshark',
    name: 'Wireshark',
    purpose: 'El sniffer de referencia: captura paquetes y los analiza con display filters para responder exactamente qué cruzó por la red.',
    whenToUse: [
      'Analizar pcaps entregados por Redes o capturar en vivo desde un puerto espejo (SPAN) del switch.',
      'Confirmar exfiltración, beaconing o C2 visible en capas HTTP, DNS o TCP.',
      'Diagnosticar handshakes TCP fallidos y retransmisiones en incidencias de conectividad.',
    ],
    sections: [
      {
        title: 'Display filters esenciales',
        intro: 'El display filter (barra superior) no corta la captura: solo muestra lo que cumple. Sintaxis: campo operador valor, combinable con and, or y not.',
        blocks: [
          {
            label: 'Protocolo directo',
            detail: 'Escribir solo el protocolo muestra todo ese tráfico: el punto de partida más común.',
            code: `http
dns
arp
icmp`,
          },
          {
            label: 'IP y puertos',
            detail: 'ip.addr cubre origen y destino; para una dirección sola, ip.src o ip.dst.',
            code: `ip.addr == {{SOURCE_IP}}
tcp.port == 443
udp.port == 53`,
          },
          {
            label: 'HTTP: método, código y URI',
            detail: 'La petición y la respuesta se filtran por separado: método del request, código del response.',
            code: `http.request.method == "POST"
http.response.code == 401
http.request.uri contains "login"`,
          },
          {
            label: 'DNS por nombre',
            detail: 'contains hace substring: perfecto para cazar el dominio de la campaña sin saber el subdominio exacto.',
            code: `dns.qry.name contains "xyz"
dns.qry.name == "update-check.xyz"`,
          },
          {
            label: 'TLS: el SNI sigue visible',
            detail: 'Aunque el contenido vaya cifrado, el Server Name del handshake entrega el dominio destino.',
            code: `tls.handshake.extensions_server_name contains "xyz"`,
          },
          {
            label: 'Combos de investigación',
            detail: 'Con paréntesis la captura se lee como una oración.',
            code: `ip.addr == {{SOURCE_IP}} and http.request.method == "POST"
http and not (ip.addr == {{SOURCE_IP}})`,
          },
        ],
      },
      {
        title: 'TCP: handshake y salud',
        intro: 'El handshake SYN, SYN/ACK, ACK es lo primero que se revisa: si no se completa, nada de lo de arriba funciona.',
        blocks: [
          {
            label: 'SYN inicial de cada conexión',
            detail: 'Cada conexión empieza aquí: cuenta cuántas aperturas hay contra el mismo destino.',
            code: `tcp.flags.syn == 1 and tcp.flags.ack == 0`,
          },
          {
            label: 'RST y conexiones cortadas',
            detail: 'Muchos RST de un host = puerto cerrado machacado o bloqueo activo; el drop silencioso no genera RST y eso también diagnostica.',
            code: `tcp.flags.reset == 1`,
          },
          {
            label: 'Retransmisiones y ACKs duplicados',
            detail: 'La familia tcp.analysis marca los problemas de TCP; tcp.analysis.flags los agrupa todos de un golpe.',
            code: `tcp.analysis.retransmission
tcp.analysis.duplicate_ack`,
          },
          {
            label: 'Expert Information (ruta en consola)',
            detail: 'Analyze → Expert Information agrupa por severidad (Chat, Note, Warning, Error) lo que Wireshark detectó mal en el protocolo: primer clic en toda captura desconocida.',
          },
        ],
      },
      {
        title: 'Follow stream: rearmar la conversación',
        intro: 'TCP numera cada conversación con un índice (stream). Follow Stream la muestra completa en texto plano cuando el protocolo va sin cifrar.',
        blocks: [
          {
            label: 'Filtrar un stream concreto',
            detail: 'Tras usar Follow TCP Stream, Wireshark aplica este filtro solo: anótalo para volver a esa conversación.',
            code: `tcp.stream eq 0
tcp.stream == 3`,
          },
          {
            label: 'Follow (ruta en consola)',
            detail: 'Click derecho sobre un paquete → Follow → TCP Stream (o HTTP Stream / TLS Stream): muestra ambas direcciones con colores distintos y el botón para filtrar la conversación completa.',
          },
          {
            label: 'Buscar cadenas en el payload',
            detail: 'Edit → Find Packet con String sobre Packet bytes busca usernames, nombres de archivo y user agents dentro de los paquetes.',
          },
        ],
      },
      {
        title: 'HTTP: anatomía de la petición',
        intro: 'Con tráfico HTTP visible, Wireshark despliega request y response, y permite extraer los objetos transferidos sin seguir stream por stream.',
        blocks: [
          {
            label: 'Solo peticiones',
            detail: 'El inventario de quién pidió qué en la captura.',
            code: `http.request
http.request.method == "GET"`,
          },
          {
            label: 'User agents de script',
            detail: 'curl o python en un host de usuario es tooling: correlaciona con el proceso que lo generó en el endpoint.',
            code: `http.user_agent contains "curl"
http.user_agent contains "python"`,
          },
          {
            label: 'POSTs consistentes (candidato a exfiltración)',
            detail: 'POSTs gordos y periódicos hacia el mismo destino: cruza con las horas del incidente.',
            code: `http.request.method == "POST" and tcp.len > 500`,
          },
          {
            label: 'Exportar objetos (ruta en consola)',
            detail: 'File → Export Objects → HTTP lista todo lo transferido con nombres y tamaños.',
            note: 'No abras binarios extraídos en tu máquina de trabajo: mándalos al sandbox (guía de VirusTotal + ANY.RUN).',
          },
        ],
      },
      {
        title: 'DNS: consultas y tunneling',
        intro: 'El DNS es el canal discreto favorito: consultas TXT frecuentes o subdominios kilométricos hacia un mismo dominio delatan tunneling o DGA.',
        blocks: [
          {
            label: 'Consultas por tipo',
            detail: '1 = A, 28 = AAAA, 16 = TXT. TXT voluminoso hacia un mismo dominio es señal de canal encubierto.',
            code: `dns.qry.type == 1
dns.qry.type == 16
dns.qry.type == 28`,
          },
          {
            label: 'Respuestas y errores',
            detail: 'rcode 3 es NXDOMAIN: los dominios DGA dejan rastros de consultas fallidas masivas.',
            code: `dns.flags.response == 1
dns.flags.rcode == 3`,
          },
          {
            label: 'Subdominios largos con regex',
            detail: 'matches aplica regex sobre el nombre consultado: 30 o más caracteres alfanuméricos apuntan a datos codificados.',
            code: `dns.qry.name matches "[a-z0-9]{30,}"`,
          },
        ],
      },
      {
        title: 'Beaconing: deltas de tiempo',
        intro: 'El C2 metronómico se ve en los deltas: paquetes hacia el mismo destino separados casi siempre por el mismo tiempo.',
        blocks: [
          {
            label: 'Delta contra el paquete anterior',
            detail: 'frame.time_delta es el tiempo desde el paquete capturado anterior; filtrar por delta bajo revela cadencias.',
            code: `ip.addr == {{SOURCE_IP}} and frame.time_delta < 1`,
          },
          {
            label: 'Delta entre los paquetes mostrados',
            detail: 'Con un display filter previo (por ejemplo solo la IP del C2), time_delta_displayed mide entre los paquetes ya filtrados.',
            code: `frame.time_delta_displayed < 2`,
          },
          {
            label: 'Tiempo relativo',
            detail: 'frame.time_relative es la columna Time de la vista: saltos uniformes cada N segundos delatan el beacon sin matemática extra.',
            code: `frame.time_relative < 60`,
          },
          {
            label: 'I/O Graph (ruta en consola)',
            detail: 'Statistics → I/O Graph con filtro de la IP sospechosa grafica la tasa: el beacon aparece como picos periódicos. Statistics → Conversations ordena los pares por bytes y paquetes.',
          },
        ],
      },
      {
        title: 'Capture filters vs display filters',
        intro: 'El capture filter (BPF, en las opciones de captura) decide qué se GRABA; el display filter solo qué se VE de lo grabado. BPF tiene otra sintaxis, más pobre y más rápida.',
        blocks: [
          {
            label: 'BPF por host, red y puerto',
            detail: 'Se escribe en el cuadro de opciones antes de arrancar la captura.',
            code: `host {{SOURCE_IP}}
net 10.10.10.0/24
tcp port 443
udp port 53`,
          },
          {
            label: 'Combinar BPF',
            detail: 'El not port 22 evita llenar el archivo con tu propia sesión de administración al equipo de captura.',
            code: `host 10.10.10.10 and not port 22
tcp port 80 or tcp port 443`,
          },
          {
            label: 'Traducción práctica',
            detail: 'Mismo objetivo, sintaxis distinta: en BPF no existen campos como http.request.method; ese detalle solo vive como display filter.',
            code: `capture:  host {{SOURCE_IP}}
display:  ip.addr == {{SOURCE_IP}}`,
          },
        ],
      },
    ],
    proTips: [
      'Captura desde el puerto espejo (SPAN) del switch con un equipo dedicado: nunca instales el sniffer a ver qué pasa en el servidor de producción.',
      'Antes de profundizar: Statistics → Conversations y Expert Information te dan el mapa completo en dos clics.',
      'Filtra temprano y captura acotada: pcaps de horas sin filtro son inmanejables y esconden la señal.',
      'HTTPS opaca el contenido: un Follow Stream ilegible con pila TLS no es error, es cifrado; quédate con los metadatos (SNI, IPs, cadencia).',
    ],
  },
  {
    id: 'sysmon',
    name: 'Sysmon',
    purpose: 'Driver y servicio de Windows (Sysinternals) que registra eventos profundos de procesos, red, archivos y registro en un canal propio de Event Viewer.',
    whenToUse: [
      'Visibilidad de proceso, conexión y archivo en endpoints sin un EDR completo encima.',
      'Forense ligero: qué proceso creó a quién, qué DLL cargó, qué se ejecutó y desde dónde.',
      'Alimentar el SIEM (Sentinel, Splunk o Elastic) con telemetría de alta calidad desde estaciones y servidores.',
    ],
    sections: [
      {
        title: 'Qué es y cómo se instala',
        intro: 'Sysmon no es un antivirus: es un generador de eventos. Se instala con un XML de configuración que decide qué registrar y qué filtrar.',
        blocks: [
          {
            label: 'Instalar con una config',
            detail: 'Descarga Sysmon de Sysinternals, descomprime y desde PowerShell como administrador apunta a tu XML (una config pública probada como base es buen punto de partida).',
            code: `Sysmon64.exe -accepteula -i config.xml`,
          },
          {
            label: 'Actualizar la config en caliente',
            detail: 'Aplica una nueva configuración sin reiniciar el equipo; la segunda línea imprime la config activa para validar que el cambio tomó.',
            code: `Sysmon64.exe -c nueva-config.xml
Sysmon64.exe -c`,
          },
          {
            label: 'Desinstalar',
            detail: 'Quita el servicio y el log: solo con aprobación, porque el host queda sin telemetría.',
            code: `Sysmon64.exe -u`,
          },
          {
            label: 'Verificar que está corriendo',
            detail: 'Servicio y proceso activos: si no, no hay eventos nuevos en el canal Operational.',
            code: `Get-Service -Name Sysmon64
Get-Process -Name Sysmon64`,
          },
        ],
      },
      {
        title: 'IDs de evento y qué significan',
        intro: 'La configuración mapea cada elemento XML a un EventID. Estos son los que un L1 debe reconocer a primera vista:',
        blocks: [
          {
            label: 'Procesos, red y DLL',
            detail: 'El 1 con línea de comando y proceso padre es el 80% del valor de Sysmon; el 3 ata el proceso a la conexión.',
            code: `1   ProcessCreate      creacion de proceso + linea de comando + hashes
3   NetworkConnect     conexion saliente del proceso (IP y puerto)
7   ImageLoad          DLL cargada por un proceso`,
          },
          {
            label: 'Inyección y acceso entre procesos',
            detail: 'Un 8 cuyo TargetImage es lsass.exe es el preludio del robo de credenciales (Mimikatz y familia).',
            code: `8   CreateRemoteThread  un proceso crea un hilo en otro (inyeccion)
10  ProcessAccess       un proceso abre el espacio de otro (dumpeo)`,
          },
          {
            label: 'Archivos, registro y DNS',
            detail: 'El 22 registra la consulta DNS del host: el IOC más barato de correlacionar con proxy o firewall.',
            code: `11  FileCreate     archivo creado en disco
13  RegistryEvent  valor de registro establecido
22  DNSEvent       consulta DNS registrada (y su resultado)
25  ProcessError   error del proceso reportado por Sysmon`,
          },
          {
            label: 'Eventos de soporte',
            detail: 'El 5 cierra el ciclo del proceso (cuánto vivió) y el 16 marca cambios de configuración: silenciar Sysmon empieza por ahí.',
            code: `5   ProcessTerminate  terminacion del proceso
16  Sysmon config     cambio de configuracion de Sysmon`,
          },
        ],
      },
      {
        title: 'Config XML: whitelist quirúrgica',
        intro: 'El elemento EventFiltering decide por evento si se registra lo que hace match (include) o se descarta (exclude). El ruido se controla con exclusiones de conocido-bueno y las detecciones, con inclusiones puntuales.',
        blocks: [
          {
            label: 'Esquema mínimo válido',
            detail: 'Hash de procesos activado y las dos exclusiones más comunes de ruido.',
            code: `<Sysmon schemaversion="4.90">
  <HashAlgorithms>SHA256,IMPHASH</HashAlgorithms>
  <EventFiltering>
    <ProcessCreate onmatch="exclude">
      <Image condition="is">C:\\Windows\\System32\\conhost.exe</Image>
    </ProcessCreate>
    <NetworkConnect onmatch="exclude">
      <Image condition="is">C:\\Windows\\System32\\svchost.exe</Image>
    </NetworkConnect>
  </EventFiltering>
</Sysmon>`,
            note: 'schemaversion depende de la versión de Sysmon instalada: revisa la guía oficial de eventos para la tuya.',
          },
          {
            label: 'Whitelist por rutas',
            detail: 'begin with excluye directorios completos de conocido-bueno: la forma estándar de bajar el volumen sin perder cobertura.',
            code: `<ProcessCreate onmatch="exclude">
  <Image condition="begin with">C:\\Program Files\\</Image>
  <Image condition="begin with">C:\\Program Files (x86)\\</Image>
</ProcessCreate>`,
            note: 'Ojo: lo que corra desde esas rutas queda ciego para el evento 1; compensa con reglas include puntuales.',
          },
          {
            label: 'Include: caza específica',
            detail: 'Con include solo se registra lo que hace match: el log queda pequeño y la detección, quirúrgica.',
            code: `<ProcessCreate onmatch="include">
  <CommandLine condition="contains">-enc</CommandLine>
  <CommandLine condition="contains">FromBase64String</CommandLine>
</ProcessCreate>`,
          },
          {
            label: 'Conditions de referencia',
            detail: 'Los condition disponibles para cualquier campo; la variante any acepta listas separadas por coma.',
            code: `condition="is"              igualdad exacta
condition="contains"        substring en el valor
condition="begin with"      prefijo (ideal para rutas)
condition="end with"        sufijo (extensiones de archivo)
condition="begin with any"  prefijo contra una lista`,
          },
        ],
      },
      {
        title: 'Dónde viven los logs',
        intro: 'Toda la telemetría cae en el canal Microsoft-Windows-Sysmon/Operational (Event Viewer, Applications and Services Logs). En un SOC real ese canal se reenvía al SIEM; localmente es forense.',
        blocks: [
          {
            label: 'Los últimos eventos',
            detail: 'Vista rápida para confirmar que el host está generando telemetría.',
            code: `Get-WinEvent -LogName "Microsoft-Windows-Sysmon/Operational" -MaxEvents 20`,
          },
          {
            label: 'Filtrar por EventID',
            detail: 'Cambia el Id según el evento de interés: 3 para red, 8 para inyección, 1 para procesos.',
            code: `Get-WinEvent -FilterHashtable @{ LogName = "Microsoft-Windows-Sysmon/Operational"; Id = 3 } -MaxEvents 50`,
          },
          {
            label: 'Exportar evidencia',
            detail: 'qe con /rd:true entrega los más recientes primero; /f:text es legible y /f:xml sirve para ingesta.',
            code: `wevtutil qe Microsoft-Windows-Sysmon/Operational /c:200 /rd:true /f:text`,
          },
        ],
      },
      {
        title: 'Casos de detección',
        intro: 'Con la config registrando CommandLine, el mensaje del evento 1 trae todo el contexto: estos tres patrones son las queries del día a día.',
        blocks: [
          {
            label: 'CreateRemoteThread hacia LSASS',
            detail: 'El evento 8 con TargetImage lsass.exe: dumpeo de credenciales en curso o preparándose.',
            code: `Get-WinEvent -FilterHashtable @{ LogName = "Microsoft-Windows-Sysmon/Operational"; Id = 8 } -MaxEvents 50 |
  Where-Object { $_.Message -match "lsass" }`,
          },
          {
            label: 'LOLBins de descarga',
            detail: 'certutil, bitsadmin o mshta en la línea de comando: bajando payload con binarios firmados.',
            code: `Get-WinEvent -FilterHashtable @{ LogName = "Microsoft-Windows-Sysmon/Operational"; Id = 1 } -MaxEvents 500 |
  Where-Object { $_.Message -match "certutil|bitsadmin|mshta" }`,
          },
          {
            label: 'PowerShell codificado',
            detail: 'El mismo one-liner ofensivo que caza el SIEM, en local: patrón directo sobre el mensaje del evento.',
            code: `Get-WinEvent -FilterHashtable @{ LogName = "Microsoft-Windows-Sysmon/Operational"; Id = 1 } -MaxEvents 500 |
  Where-Object { $_.Message -match "EncodedCommand|FromBase64String|IEX" }`,
          },
          {
            label: 'Proceso y su conexión (1 + 3)',
            detail: 'El evento 3 referencia el proceso por ProcessGuid y el 1 trae sus hashes: cruzar ambos demuestra que UN proceso concreto hizo UNA conexión. En el SIEM ese cruce es un join por ProcessGuid.',
          },
        ],
      },
    ],
    proTips: [
      'No escribas la config desde cero: parte de una probada públicamente y ajusta el ruido con las métricas de volumen del SIEM.',
      'Cada cambio de config genera un evento 16: monitórelo, porque desactivar Sysmon silenciosamente empieza por un cambio de configuración.',
      'IMPHASH permite seguir el mismo binario recompilado o renombrado entre hosts: guárdalo en los observables del caso.',
      'Log vacío no siempre es falla: revisa servicio, config con Sysmon64.exe -c y que nadie haya puesto un exclude demasiado amplio.',
    ],
  },
  {
    id: 'defender',
    name: 'Microsoft Defender AV/EDR',
    purpose: 'El antimalware de Windows y su consola XDR: el módulo Defender de PowerShell cubre el triage local del agente en el endpoint.',
    whenToUse: [
      'Verificar que un endpoint tiene el agente vivo, actualizado y con protección en tiempo real antes de descartar la alerta.',
      'Revisar el historial de amenazas y su estado de remediación en un host concreto.',
      'Disparar escaneos dirigidos como acción de triage o verificación post-limpieza.',
      'Auditar exclusiones antes de concluir que una ruta no tiene detección.',
    ],
    sections: [
      {
        title: 'Estado del agente',
        intro: 'Get-MpComputerStatus es el primer comando sobre cualquier endpoint con Defender: dice si está vivo, actualizado y escaneando.',
        blocks: [
          {
            label: 'Vista completa',
            detail: 'Una sola llamada con todo el estado del servicio antimalware.',
            code: `Get-MpComputerStatus`,
          },
          {
            label: 'Lo que importa en una línea',
            detail: 'RealTimeProtectionEnabled en False es hallazgo por sí mismo: repórtalo aunque no haya alerta.',
            code: `Get-MpComputerStatus | Select-Object AMServiceEnabled, AntivirusEnabled, RealTimeProtectionEnabled, AntivirusSignatureLastUpdated, QuickScanEndTime`,
          },
          {
            label: 'Versiones de firma y motor',
            detail: 'Para el ticket: versiones activas y cuándo actualizaron por última vez.',
            code: `Get-MpComputerStatus | Select-Object AMEngineVersion, AntivirusSignatureVersion, NISSignatureVersion, AntivirusSignatureLastUpdated`,
          },
          {
            label: 'Preferencias del agente',
            detail: 'La configuración completa: disables, acciones por severidad y exclusiones; estas últimas se leen en su propia sección.',
            code: `Get-MpPreference`,
          },
        ],
      },
      {
        title: 'Amenazas detectadas',
        intro: 'Get-MpThreat trae las amenazas conocidas del historial y Get-MpThreatDetection las detecciones individuales con su timestamp.',
        blocks: [
          {
            label: 'Todas las amenazas',
            detail: 'Una fila por amenaza conocida: nombre, severidad y si sigue activa.',
            code: `Get-MpThreat`,
          },
          {
            label: 'Con impacto',
            detail: 'IsActive o DidThreatExecute en True significa que llegó a ejecutarse: escala el caso.',
            code: `Get-MpThreat | Select-Object ThreatName, SeverityID, IsActive, DidThreatExecute, Resources`,
          },
          {
            label: 'Detecciones individuales',
            detail: 'Cada evento de detección con hora y proceso inicial: la línea de tiempo del host.',
            code: `Get-MpThreatDetection | Select-Object InitialDetectionTime, ProcessName, ThreatID, Resources`,
          },
          {
            label: 'Una amenaza concreta',
            detail: 'Filtra por nombre para ubicar la detección puntual del ticket.',
            code: `Get-MpThreat | Where-Object { $_.ThreatName -like "*Emotet*" }`,
          },
        ],
      },
      {
        title: 'Escaneos',
        intro: 'Start-MpScan lanza el escaneo en el propio host: rápido, completo o dirigido a una ruta.',
        blocks: [
          {
            label: 'Quick scan',
            detail: 'Zonas calientes, minutos: el escaneo de triage por defecto.',
            code: `Start-MpScan -ScanType QuickScan`,
          },
          {
            label: 'Full scan',
            detail: 'El disco completo; en máquinas grandes puede tardar horas.',
            code: `Start-MpScan -ScanType FullScan`,
            note: 'Documenta la duración estimada en el ticket y evita lanzarlo en el pico de uso del usuario.',
          },
          {
            label: 'Escaneo dirigido a una ruta',
            detail: 'El quirúrgico: cuando ya sabes en qué carpeta cayó el archivo.',
            code: `Start-MpScan -ScanType CustomScan -ScanPath "C:\\Users\\{{USERNAME}}\\Downloads"`,
          },
        ],
      },
      {
        title: 'Remediación',
        intro: 'Remove-MpThreat reintenta la limpieza de todo lo que quedó pendiente de acción; la verificación es parte del proceso.',
        blocks: [
          {
            label: 'Forzar limpieza',
            detail: 'Reintenta la remediación de las amenazas pendientes.',
            code: `Remove-MpThreat`,
          },
          {
            label: 'Ciclo limpiar y verificar',
            detail: 'Remediación, escaneo y estado final: el ciclo completo que va al ticket.',
            code: `Remove-MpThreat
Start-MpScan -ScanType QuickScan
Get-MpThreat`,
          },
          {
            label: 'Historial como evidencia',
            detail: 'Los timestamps de detección son la línea de tiempo del caso: cópialos al reporte.',
            code: `Get-MpThreatDetection | Select-Object InitialDetectionTime, ThreatID | Sort-Object InitialDetectionTime -Descending`,
          },
        ],
      },
      {
        title: 'Exclusiones (auditoría)',
        intro: 'Las exclusiones son la puerta trasera favorita: lo excluido es literalmente invisible para el agente. L1 las audita, no las cambia.',
        blocks: [
          {
            label: 'Todas de un vistazo',
            detail: 'La vista rápida de rutas, extensiones y procesos excluidos.',
            code: `Get-MpPreference | Select-Object -Property Exclusion*`,
          },
          {
            label: 'Por tipo',
            detail: 'Mapea cada exclusión contra un cambio aprobado (CMDB o ticket): la que no tenga respaldo es huérfana y se denuncia.',
            code: `Get-MpPreference | Select-Object ExclusionPath, ExclusionExtension, ExclusionProcess`,
          },
          {
            label: 'Cambiar exclusiones (con aprobación)',
            detail: 'Los cmdlets existen, pero como L1 no los uses por tu cuenta: documenta y propone.',
            code: `Add-MpPreference -ExclusionPath "C:\\Temp\\Analisis"
Remove-MpPreference -ExclusionPath "C:\\Temp\\Analisis"`,
          },
          {
            label: 'Red flags',
            detail: 'Rutas raíz (C: o el perfil de usuario), extensiones ejecutables y procesos genéricos como powershell.exe excluidos: cualquiera de las tres va directo al lead.',
          },
        ],
      },
      {
        title: 'Actualizaciones',
        intro: 'Firmas viejas equivalen a detecciones imposibles: Update-MpSignature y la verificación del LastUpdated son rutina del triage.',
        blocks: [
          {
            label: 'Actualizar firmas',
            detail: 'Baja e instala la última firma en el host.',
            code: `Update-MpSignature`,
          },
          {
            label: 'Fuente específica',
            detail: 'Si la firma no baja por el canal interno, fuerza Microsoft Update: WSUS a veces queda desincronizado.',
            code: `Update-MpSignature -UpdateSource MicrosoftUpdateServer`,
          },
          {
            label: 'Verificar el resultado',
            detail: 'LastUpdated con más de 24 a 48 horas es incidencia del agente, no de malware.',
            code: `Get-MpComputerStatus | Select-Object AntivirusSignatureLastUpdated, AntivirusSignatureVersion, NISSignatureLastUpdated`,
          },
        ],
      },
      {
        title: 'Aislamiento (consola)',
        intro: 'El aislamiento de red NO se hace por PowerShell local: es una acción de respuesta desde la consola. L1 prepara la solicitud con la evidencia y el lead la aprueba.',
        blocks: [
          {
            label: 'Aislar desde el portal (ruta en consola)',
            detail: 'Microsoft Defender XDR (security.microsoft.com) → Assets → Devices → buscar el dispositivo → página del dispositivo → Actions → Isolate device, con opción de aislamiento completo o restringido a ciertas conexiones.',
          },
          {
            label: 'Liberar',
            detail: 'La misma página del dispositivo: Actions → Release from isolation. El aislamiento también expira solo al cumplirse la duración configurada.',
          },
          {
            label: 'Qué prepara L1',
            detail: 'Host, usuario, IDs de las alertas de soporte, evidencia de proceso y red, y usuarios activos impactados. Con eso el lead decide y ejecuta con el rol adecuado.',
          },
        ],
      },
    ],
    proTips: [
      'Get-MpComputerStatus es tu primer clic en cualquier caso de no detecta nada: agente caído equivale a detección imposible.',
      'Amenaza limpiada no es caso cerrado: confirma el vector (phishing, USB, software pirata) o vuelve mañana.',
      'Si Get-MpPreference muestra la protección en tiempo real deshabilitada y nadie aprobó ese cambio, trátalo como posible manipulación y escala.',
      'Muchos hosts con firma vieja a la vez es problema de WSUS o de red: reporta a infraestructura, no abras casos de malware por host.',
    ],
  },
  {
    id: 'sandbox',
    name: 'VirusTotal + ANY.RUN (sandbox)',
    purpose: 'Doble detonación pública: VirusTotal agrega decenas de antivirus y comportamiento conocido; ANY.RUN detona la muestra en vivo con proceso, red y archivos a la vista.',
    whenToUse: [
      'Clasificar una muestra desconocida (hash, archivo o URL) antes de mover cualquier otra pieza.',
      'Confirmar el veredicto de un IOC que llegó por correo, proxy o alerta del SIEM.',
      'Extraer IOCs y comportamiento (dominios, IPs, mutexes) para enriquecer el caso.',
      'Decidir si una detección solitaria de un engine es falso positivo o señal temprana.',
    ],
    sections: [
      {
        title: 'Flujo en VirusTotal',
        intro: 'VT es un buscador de reputación: pega hash, URL, dominio o IP en la barra y devuelve la voz de decenas de motores y el comportamiento agregado. La cuenta gratuita cubre casi todo el triage L1.',
        blocks: [
          {
            label: 'Buscar por hash (siempre lo primero)',
            detail: 'El hash es identidad inmutable: pega el SHA256 (o MD5) del archivo. Si ya hay reporte, tienes consenso sin detonar nada.',
          },
          {
            label: 'Buscar URL y dominio',
            detail: 'Con la URL completa ves la detección sobre esa ruta exacta; con el dominio solo, la reputación general del sitio.',
          },
          {
            label: 'Pestañas del reporte de un archivo',
            detail: 'Detection trae la voz de los antivirus; Details la firma, hashes y empaquetado; Relations las IPs, dominios y archivos relacionados; Behavior el resumen de la detonación en sandbox (archivos, registro, red).',
          },
          {
            label: 'Leer el score sin trampas',
            detail: 'Un ratio de 2 sobre 70 puede ser falso positivo de detectores genéricos; 45 sobre 70 con nombres consistentes de familia es condena. Cero reportes no es limpio: puede ser muestra recién vista.',
          },
          {
            label: 'Community',
            detail: 'Los comentarios de analistas suelen traer la atribución (campaña, familia, actor) que los motores no ponen en el nombre de la detección.',
          },
        ],
      },
      {
        title: 'Qué revisar antes de dar veredicto',
        intro: 'El score solo no decide: la firma, el empaquetado y las relaciones completan el contexto para calificar la muestra.',
        blocks: [
          {
            label: 'Ratio y consenso de nombre',
            detail: 'Detecciones y si los nombres coinciden en familia (Emotet, AgentTesla...): consenso entre motores es alta confianza.',
          },
          {
            label: 'Firma y emisor',
            detail: 'En Details: si el binario está firmado, por quién y si la firma es válida. Sin firma o con firma inválida y detecciones bajas, la sospecha suma.',
          },
          {
            label: 'Empaquetado (packer)',
            detail: 'Details muestra señales de packer (UPX y compañía): empaquetado con detecciones bajas y tamaño raro merece detonación en ANY.RUN.',
          },
          {
            label: 'Relations',
            detail: 'La lista de dominios contactados, URLs y archivos hermanos son IOCs gratis para el caso: anótalos defangeados.',
          },
        ],
      },
      {
        title: 'VirusTotal Intelligence (concepto)',
        intro: 'VT Intelligence (licencia Enterprise) habilita búsqueda inversa sobre el corpus. L1 normalmente no la tiene, pero debe saber que existe para pedirla.',
        blocks: [
          {
            label: 'Qué habilita',
            detail: 'Búsquedas avanzadas sobre archivos y sus relaciones (por ejemplo, muestras que contactan un C2 dado), retrohunts que re-ejecutan un detector sobre el histórico y descarga de muestras con permisos.',
          },
          {
            label: 'Cuándo pedirla al lead',
            detail: 'Cuando el caso necesita pivote inverso: tienes el dominio del C2 y quieres las muestras que lo usan, o saber si ese comportamiento se vio antes en la industria.',
          },
          {
            label: 'Alternativa sin Enterprise',
            detail: 'El reporte público de Relations y Behavior ya cruza muchos IOCs, y la búsqueda por URL o dominio cubre el pivote básico. No inventes capacidades que tu cuenta no tiene.',
          },
        ],
      },
      {
        title: 'Flujo en ANY.RUN',
        intro: 'ANY.RUN es detonación interactiva: ejecutas la muestra en una VM de Windows gestionada y ves en vivo el árbol de procesos, la red y los archivos creados.',
        blocks: [
          {
            label: 'Lanzar la tarea (ruta en consola)',
            detail: 'New Task → subir o pegar el archivo o la URL → elegir la VM (versión de Windows) y la red → Run Task → escritorio interactivo.',
          },
          {
            label: 'Interactuar como la víctima',
            detail: 'Ejecuta el archivo, abre el documento, habilita el contenido o las macros si el vector las pide: la detonación reproduce el clic del usuario, que es justo lo que falta en VT.',
          },
          {
            label: 'Qué mirar en vivo',
            detail: 'El árbol de procesos (quién lanzó a quién, con líneas de comando), la pestaña de red (DNS, HTTP, conexiones al C2) y la de archivos (drops). Los tags automáticos (stealer, maldoc, ransomware) resumen la técnica detectada.',
          },
          {
            label: 'Cerrar y exportar',
            detail: 'Stop Task cuando el comportamiento se estabiliza; el reporte queda en un enlace y el resumen trae la lista de IOCs para el caso.',
            note: 'El enlace de la tarea es público: revisa la política del SOC antes de pegarlo en tickets o chats internos.',
          },
        ],
      },
      {
        title: 'Qué NO enviar jamás',
        intro: 'Regla de oro de los sandboxes públicos: todo lo que envías se vuelve público y queda indexado. Detonas datos = regalas el dato.',
        blocks: [
          {
            label: 'Prohibido absoluto',
            detail: 'Documentos internos reales (nómina, contratos, auditorías), credenciales válidas o parecidas, PII de clientes o empleados y cualquier archivo productivo con datos reales.',
          },
          {
            label: 'Cuidado con los sospechosos corporativos',
            detail: 'Un Excel sospechoso de la empresa puede contener datos internos: consulta la política y al lead antes de enviar. Muchos SOC solo permiten muestras sintéticas o detonación en sandbox interno.',
          },
          {
            label: 'Hash primero, siempre',
            detail: 'Antes de subir nada, calcula el hash y búscalo: si ya está reportado, no necesitas detonar.',
            code: `Get-FileHash -Path ".\\muestra.bin" -Algorithm SHA256`,
          },
          {
            label: 'Si ya se filtró algo',
            detail: 'Si detectas que un archivo con datos internos ya se envió a un sandbox público, repórtalo de inmediato como posible fuga de información: es un incidente nuevo encima del incidente.',
          },
        ],
      },
      {
        title: 'Defang de IOCs',
        intro: 'Los IOCs se comparten en tickets, reportes y chats: se desfangean para que ningún sistema los convierta en enlace vivo por accidente.',
        blocks: [
          {
            label: 'Reglas del defang',
            detail: 'Protocolo, punto y arroba son los tres que se transforman.',
            code: `http://   →  hxxp://
https://  →  hxxps://
.         →  [.]
@         →  [@]`,
          },
          {
            label: 'Ejemplo completo',
            detail: 'El punto del dominio también se defangea, TLD incluido.',
            code: `original:  http://secure-login.xyz/session.php
defanged:  hxxp://secure-login[.]xyz/session[.]php
original:  10.20.30.40
defanged:  10[.]20[.]30[.]40
original:  usuario@secure-login.xyz
defanged:  usuario[@]secure-login[.]xyz`,
          },
          {
            label: 'Hashes: van tal cual',
            detail: 'Los hashes no son clicables, no se tocan. Este es el SHA256 del archivo vacío: útil para validar tus herramientas.',
            code: `SHA256 (archivo vacio): e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`,
          },
        ],
      },
    ],
    proTips: [
      'Orden del triage: hash y VT primero; detonación en ANY.RUN solo si el hash no existe o el score no decide.',
      'Un solo engine detectando, firma rara y packer: escala a nivel 2 con detonación; no descartes por score bajo.',
      'Los reportes de Behavior de VT y de ANY.RUN te dan los IOCs: lístalos defangeados en el caso y persíquelos en el SIEM.',
      'Verifica la política de tu empresa sobre sandboxes públicos ANTES del primer envío: algunos SOC lo prohíben expresamente.',
    ],
  },
  {
    id: 'thehive',
    name: 'TheHive',
    purpose: 'Plataforma de case management para respuesta a incidentes: convierte alertas sueltas en casos con tareas, observables e informe de cierre.',
    whenToUse: [
      'Todo incidente confirmado o investigación multi-alerta se abre como caso: la evidencia vive ahí, no en chats.',
      'Para que el turno siguiente sepa qué se hizo, qué falta y qué IOCs quedan pendientes.',
      'Cuando la respuesta necesita cierre formal: reporte, lecciones y trazabilidad de cada acción.',
    ],
    sections: [
      {
        title: 'Anatomía: Case, Task y Observable',
        intro: 'El caso agrupa tareas (el plan de trabajo); los observables (IOCs) se registran en el caso y se referencian desde las tareas; cada acción queda como log con autor y hora.',
        blocks: [
          {
            label: 'Jerarquía',
            detail: 'Un caso con tareas ejecutadas vía logs, y observables enriquecidos pegados al caso.',
            code: `Case
  → Tasks      plan de trabajo (triage, contencion, erradicacion...)
      → Logs   notas y acciones ejecutadas (quien, cuando, que)
  → Observables / Artifacts   IOCs con tipo y enriquecimientos`,
          },
          {
            label: 'Tipos de observable',
            detail: 'El tipo define qué enriquecimiento está disponible (geolocalización para ip, reputación para domain, multiscanner para hash).',
            code: `ip, domain, fqdn, url, hash, filename, mail, registry, autonomous-system`,
          },
          {
            label: 'Cuándo abrir caso',
            detail: 'Regla práctica del SOC: si confirmaste actividad, vas a escalar o el turno termina sin resolver, el caso existe y la alerta se importa a él.',
          },
          {
            label: 'Adjuntos',
            detail: 'Al caso se adjuntan las evidencias: pcaps, exportaciones del SIEM, capturas. Binarios solo si la política de retención lo permite; si no, el hash como observable.',
          },
        ],
      },
      {
        title: 'Campos del caso al abrirlo',
        intro: 'Un encabezado bien puesto hace que el equipo priorice y encuentre el caso después: título claro, severidad, TLP y tags con MITRE.',
        blocks: [
          {
            label: 'Campos mínimos',
            detail: 'Severity usa la escala del SOC (P1 crítico a P4 informativo); TLP controla con quién se comparte: AMBER es solo dentro de la organización.',
            code: `Title:     Phishing — robo de credenciales — Finanzas (12 usuarios)
Severity:  P2
TLP:       AMBER
Tags:      phishing, credential-access, mitre:T1566.002
Assignee:  analista de guardia`,
          },
          {
            label: 'Tags con MITRE',
            detail: 'Los tags mitre:TXXXX agrupan todos los casos de la misma técnica; define la convención de tags del equipo y respétala.',
            code: `mitre:T1566.002   Spearphishing Link
mitre:T1059.001   Command and Scripting Interpreter: PowerShell
malware.emotet    convencion propia: fuente.familia`,
          },
          {
            label: 'El título es un contrato',
            detail: 'Qué pasó y a quién: Phishing credenciales, Finanzas, 12 usuarios. Títulos como Incidente 34 o URGENTE hacen el caso inencontrable en tres meses.',
          },
        ],
      },
      {
        title: 'Plantilla de descripción',
        intro: 'La descripción es el resumen navegable del caso: se pega al abrir y se va llenando en el transcurso; al final es el borrador del reporte.',
        blocks: [
          {
            label: 'Plantilla completa',
            detail: 'Seis bloques: lo que detectó, el alcance, la línea de tiempo, la contención, la evidencia y lo que falta.',
            code: `== Deteccion ==
  (quien o que lo detecto: alerta del SIEM, usuario, informe externo)

== Alcance ==
  (usuarios, hosts, cuentas y rangos de tiempo afectados)

== Linea de tiempo ==
  (hitos con hora: primer correo, primer clic, deteccion, contencion)

== Contencion ==
  (acciones ejecutadas y pendientes)

== Evidencia ==
  (observables y adjuntos clave del caso)

== Siguientes pasos ==
  (lo que falta para cerrar)`,
          },
          {
            label: 'Buenas prácticas de la línea de tiempo',
            detail: 'Cada hito con zona horaria explícita y fuente (de qué log salió). Sin fuente citada no es evidencia.',
          },
          {
            label: 'Qué NO va en la descripción',
            detail: 'IOCs van como observables y el detalle técnico en los logs de las tareas: la descripción es el resumen, no el almacén.',
          },
        ],
      },
      {
        title: 'Plantillas de tareas',
        intro: 'El plan estándar de respuesta cabe en cinco tareas: triage, contención, erradicación, recuperación y lecciones aprendidas.',
        blocks: [
          {
            label: 'El plan estándar',
            detail: 'Cada tarea con criterio de terminado: una tarea por acción verificable.',
            code: `1. Triage (SLA 30 min)
   confirmar la alerta, alcance inicial y severidad
2. Contencion
   bloquear IOCs, aislar hosts, reset de credenciales
3. Erradicacion
   remover persistencias, malware y accesos no autorizados
4. Recuperacion
   restaurar servicio y validar el monitoreo reforzado
5. Lecciones aprendidas
   gaps de deteccion, mejoras, responsables y fechas`,
          },
          {
            label: 'Formato de cada tarea',
            detail: 'Verbo + objeto en el título y criterio de listo en la descripción: revisar el phishing no termina; listar los destinatarios de la campaña, sí.',
            code: `titulo:      Bloquear dominio del C2 en el proxy
descripcion: criterio de listo y alcance del bloqueo
due date:    fecha limite
assignee:    responsable`,
          },
          {
            label: 'Logs de la tarea',
            detail: 'Dentro de cada tarea, cada acción ejecutada se registra como log (texto o adjunto): quién, cuándo y qué hizo. El caso se reconstruye desde ahí.',
          },
          {
            label: 'Plantillas de caso',
            detail: 'TheHive admite case templates con tareas precargadas: si tu equipo no las tiene, proponerlas es mejora de proceso para el lead.',
          },
        ],
      },
      {
        title: 'Observables: flujo de enriquecimiento',
        intro: 'Registrar un observable dispara los analizadores disponibles (VirusTotal, abuse.ch, etc. según el despliegue) y el resultado queda unido al caso.',
        blocks: [
          {
            label: 'Flujo básico',
            detail: 'Con Cortex activo los analyzers corren jobs externos; sin Cortex, el enriquecimiento es manual y se documenta como log de la tarea.',
            code: `agregar observable → elegir tipo (ip / domain / hash / url / filename)
  → correr los analyzers disponibles para ese tipo
  → leer resultados (reputacion, geolocalizacion, IOCs relacionados)
  → registrar los IOCs nuevos como observables del caso`,
          },
          {
            label: 'Qué enriquecer por tipo',
            detail: 'La meta es convertir cada observable en un veredicto: malicioso, sospechoso o benigno, con fuente citada.',
            code: `ip:       geolocalizacion, ASN, listas de abuso, PTR
domain:   whois, resolucion DNS, reputacion, certificados
hash:     multiscanner, informacion de la muestra
url:      contenido, redirecciones, reputacion
filename: busqueda por hash, contexto de proceso`,
          },
          {
            label: 'Marcar avistamientos',
            detail: 'Marca el observable como visto (sighted) cuando aparece en tus logs: eso separa la inteligencia externa de la confirmación interna.',
          },
          {
            label: 'De observable a acción',
            detail: 'Todo bloqueo queda ligado al observable que lo justificó: qué se bloqueó, dónde, cuándo y quién aprobó.',
            code: `observable malicioso → bloquear en proxy / firewall / mail gateway
  → log en la tarea de contencion con que, donde, cuando y quien aprobo`,
          },
        ],
      },
      {
        title: 'Informe de cierre',
        intro: 'El reporte final es el activo del caso: alimenta métricas, búsquedas por técnica y el entrenamiento del que viene después.',
        blocks: [
          {
            label: 'Plantilla de reporte',
            detail: 'Ejecutivo arriba, detalle abajo: el resumen debe entenderse sin leer el resto.',
            code: `== Resumen ejecutivo ==
  (que paso, impacto y estado final en cinco lineas)

== Cronologia ==
  (deteccion → contencion → erradicacion → recuperacion, con horas)

== Alcance e impacto ==
  (usuarios, hosts, datos y servicios afectados)

== Acciones ejecutadas ==
  (contencion y remediacion, con responsables)

== IOCs y artefactos ==
  (observables del caso, defangeados)

== Causa raiz ==
  (vector inicial y por que funciono)

== Lecciones aprendidas ==
  (gaps de deteccion y respuesta, mejoras con responsable y fecha)`,
          },
          {
            label: 'Checklist antes de cerrar',
            detail: 'Si algo queda pendiente, el caso no se cierra: se transfiere con nota al siguiente turno.',
            code: `todas las tareas cerradas
observables verificados y clasificados
IOCs bloqueados o en monitoreo
reporte final completo
severidad final revisada`,
          },
          {
            label: 'Compartir fuera del equipo',
            detail: 'Respeta el TLP del caso al exportar: RED nunca sale del equipo de respuesta, AMBER solo dentro de la organización. Los IOCs del anexo, defangeados.',
          },
          {
            label: 'Por qué importa el cierre',
            detail: 'Casos bien cerrados alimentan métricas (MTTD y MTTR), búsquedas por tag MITRE y la memoria del SOC: el cierre es el activo, no el trámite.',
          },
        ],
      },
    ],
    proTips: [
      'Abre el caso apenas confirmas y actualiza la línea de tiempo en vivo: la memoria de a qué hora aislamos es lo primero que se pierde.',
      'Título, severidad y tags correctos desde el minuto uno: corregir el encabezado a mitad del incidente nunca pasa.',
      'Todo bloqueo necesita su observable de origen y su aprobación registrada: en el postmortem siempre preguntan quién autorizó qué.',
      'Caso abierto al final del turno: log de transferencia con pendientes claros, sin excepción.',
    ],
  },
];

/** Mapa id → guía (lookup O(1) para el componente). */
export const SOC_TOOL_GUIDE_BY_ID: Map<string, SocToolGuide> = new Map(SOC_TOOL_GUIDES.map((g) => [g.id, g]));

export const SOC_TOOL_GUIDE_COUNT = SOC_TOOL_GUIDES.length;
