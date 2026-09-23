/**
 * socKB — artículos de la base de conocimiento SOC (SIMULADOS — empresa
 * ficticia Nexora S.A., SOC "Blue Team"). Dataset ESTÁTICO de solo lectura
 * (viene de fábrica, no vive en Dexie ni en el backup): 16 artículos que
 * cubren las torres de detección del simulador (Email, Identity, Endpoint,
 * Network, Web, Cloud y cross-torre). relatedTickets referencia casos
 * plausibles del dataset soc-XXX (soc-001..soc-020 generales, soc-021..
 * soc-050 primera semana SOC).
 *
 * Regla de contenido: TODO comando/KQL/Event ID debe ser REAL y
 * verificable. relatedTerms referencia nombres de términos del glosario
 * global que existen (ver glossarySeed*.ts).
 */
import type { SocKbArticle } from '../types';

export const SOC_KB_ARTICLES: SocKbArticle[] = [
  {
    id: 'sockb-phishing-triage',
    title: 'Triage de phishing reportado por usuario (KQL)',
    category: 'SOC - Phishing / Email',
    environment: 'Email',
    symptoms: 'Un usuario reporta un correo sospechoso con el botón de Report Phishing o por el canal del SOC. Hace falta determinar en minutos: cuántas copias se entregaron, si alguien hizo clic en el enlace y si alguna cuenta se comprometió.',
    cause: 'Campañas de phishing (T1566) con dominios lookalike o remitentes suplantados. El filtro perimetral no bloqueó el mensaje (spam scoring insuficiente o dominio aún sin reputación). El reporte del usuario suele llegar antes que cualquier alerta automática.',
    steps: [
      {
        title: 'Medir el alcance de la campaña',
        detail: 'Buscar por remitente, dominio y asunto en EmailEvents. NetworkMessageId identifica cada copia; DeliveryLocation dice si quedó en Inbox o en Junk. Con el remitente Y el asunto se evita contar hilos legítimos similares.',
        command: 'EmailEvents | where SenderFromDomain == "nexora-corp.co" | project Timestamp, NetworkMessageId, SenderFromAddress, RecipientEmailAddress, DeliveryLocation, UrlCount'
      },
      {
        title: 'Verificar clics en la URL',
        detail: 'UrlClickEvents registra los clics de los usuarios en enlaces de los correos de M365 (incluye veredicto del filtro de la URL). IsClickedThrough distingue clic real del bloqueo por advertencia.',
        command: 'UrlClickEvents | where Url has "nexora-corp.co" | project Timestamp, Url, AccountUpn, IsClickedThrough, NetworkMessageId'
      },
      {
        title: 'Auditar autenticaciones de quienes clicaron',
        detail: 'Para cada AccountUpn con clic, revisar SigninLogs de la ventana: nuevas IP/países, ResultType 0 inmediatamente después del clic, MFA exigido o saltado (Condicionar Access), y sesiones de apps imprevistas.',
        command: 'SigninLogs | where UserPrincipalName == "mmartinez@nexora.com.co" | where TimeGenerated > ago(24h) | project TimeGenerated, IPAddress, Location, ResultType, AppDisplayName, RiskLevelDuringSignIn | order by TimeGenerated asc'
      },
      {
        title: 'Contener: purga y bloqueo del dominio',
        detail: 'Solicitar la purga del mensaje (SoftDelete) con una búsqueda de cumplimiento por NetworkMessageId o remitente/asunto, y bloquear el dominio lookalike con una regla de transporte (SCL 9) para que las copias futuras no se entreguen.',
        command: 'New-TransportRule -Name "Block nexora-corp.co" -SenderDomainCondition nexora-corp.co -SetSCL 9'
      },
      {
        title: 'Cerrar el ciclo con el usuario',
        detail: 'Responder al reporte agradeciendo (los reportes son la detección más barata), confirmar la revisión y recordar el botón de Report Phishing. Si hubo clic sin envío de credenciales, notificar el monitoreo de 24 h.'
      }
    ],
    verification: 'EmailEvents muestra 0 copias entregadas tras la purga, la regla de transporte cuarentena las nuevas y UrlClickEvents/SigninLogs no registran actividad posterior sospechosa de los afectados durante 24 h.',
    escalation: 'L2 / Threat Intel (clic confirmado + autenticación exitosa desde IP anómala = cuenta comprometida → P1)',
    relatedTerms: ['Phishing', 'Análisis de cabeceras de correo', 'IOC (Indicator of Compromise)'],
    relatedTickets: ['soc-001']
  },
  {
    id: 'sockb-password-spray',
    title: 'Password spray contra AD: investigación 4771/4625',
    category: 'SOC - Identity / Ataques de Contraseña',
    environment: 'Identity',
    symptoms: 'El SIEM alerta de muchos fallos de autenticación repartidos entre decenas de cuentas (1-2 intentos por cuenta, sin bloqueos) desde unas pocas IP externas. Patrón clásico de spray: una contraseña común contra una lista larga de usuarios.',
    cause: 'Password spraying (T1110.003): el atacante evita el lockout probando UNA contraseña por cuenta. Las cuentas sin MFA o con contraseñas de uso común son el objetivo. Suele venir de IP de hosting/VPN y precede a un acceso exitoso silencioso.',
    steps: [
      {
        title: 'Confirmar el patrón (intentos vs cuentas)',
        detail: 'Un spray muestra intentos=count() alto pero cuentas=dcount(TargetUserName) también alto, con pocas tentativas por cuenta. Un ataque dirigido muestra muchas tentativas sobre una cuenta. La ventana de 5 m revela la ráfaga.',
        command: 'SecurityEvent | where EventID == 4771 or EventID == 4625 | where IpAddress in ("185.220.101.34") | summarize intentos=count(), cuentas=dcount(TargetUserName) by bin(TimeGenerated, 5m)'
      },
      {
        title: 'Descartar éxito posterior (lo crítico)',
        detail: 'El spray en sí es ruido si falló: lo grave es UN solo éxito. Buscar 4624/4768 exitosos desde las IP atacantes y en SigninLogs ResultType 0 en la ventana ampliada (24 h). También revisar AADNonInteractiveUserSignInLogs para tokens legados.',
        command: 'SecurityEvent | where EventID == 4624 or EventID == 4768 | where IpAddress in ("185.220.101.34") | project TimeGenerated, TargetUserName, LogonType'
      },
      {
        title: 'Valorar las IP de origen',
        detail: 'Reputación de las IP (ASN, hosting/VPN, listas de abuso): un spray desde infraestructura de hosting conocida apoya el veredicto automatizado; IP residencial sugiere proxy o acceso comprometido (más grave).'
      },
      {
        title: 'Contener: bloqueo perimetral + reset preventivo',
        detail: 'Bloquear las IP en el firewall perimetral, registrar el IOC y coordinar con Identity el reset SOLO de las cuentas que registraron fallos (evita colapsar el service desk con resets innecesarios). Verificar en Entra que Smart Lockout penalizó las IP (portal: Identity Protection > riesgo, o revisar SignInLogs con riskDetail).'
      },
      {
        title: 'Cerrar con veredicto y monitoreo',
        detail: 'Cerrar el caso como spray bloqueado (T1110.003) SI no hubo éxitos; dejar el IOC en la lista de vigilancia y una regla SIEM afinada (umbral por cuentas distintas, no por intentos totales) para reducir falsos positivos de lockouts masivos.'
      }
    ],
    verification: '0 autenticaciones exitosas desde las IP bloqueadas en las siguientes 24 h (SecurityEvent 4624/4768 + SigninLogs ResultType 0) y la cuenta de ruido del SIEM se estabiliza.',
    escalation: 'L2 / CSIRT (cualquier éxito → incidente de cuenta comprometida P1: contención de sesión + reset + revisión de acciones)',
    relatedTerms: ['Password spraying', 'Bloqueo de cuenta (lockout)'],
    relatedTickets: ['soc-002']
  },
  {
    id: 'sockb-mfa-fatigue',
    title: 'MFA fatigue (push bombing): ráfaga de notificaciones y el push aprobado',
    category: 'SOC - Identity / Ataques de Contraseña',
    environment: 'Identity',
    symptoms: 'El usuario reporta que su teléfono "vibra sin parar" o el SIEM alerta de decenas de solicitudes MFA push en minutos contra una cuenta. El atacante ya tiene la contraseña y bombardea notificaciones esperando una aprobación por cansancio o por reflejo.',
    cause: 'MFA request generation / push bombing (T1621): el MFA por push sin número emparejado permite generar solicitudes ilimitadas. Un solo clic distraído del usuario entrega la sesión. Suele venir de un infostealer que ya robó la contraseña.',
    steps: [
      {
        title: 'Confirmar la ráfaga y buscar el push aprobado',
        detail: 'Los ResultType 500121 son pushes rechazados; el 50076 son retos fuertes fallidos. Lo que importa es UN ResultType 0 posterior desde IP no conocida: ese es el compromiso. Ventanas de 15 m muestran la forma del bombardeo.',
        command: 'SigninLogs | where UserPrincipalName == "{{USERNAME}}@nexora.com.co" | where ResultType in (500121, 50076, 0) | where TimeGenerated > ago(6h) | summarize intentos = count() by ResultType, bin(TimeGenerated, 15m), IPAddress | order by intentos desc'
      },
      {
        title: 'Ejecutar el kill switch sin esperar confirmación',
        detail: 'Revocar sesiones invalida TODOS los tokens (incluida la sesión del atacante) y el reset de contraseña quita la contraseña conocida. Con credenciales entregadas la contención es inmediata: no se negocia.',
        command: 'Revoke-MgUserSignInSession -UserId "{{USERNAME}}@nexora.com.co"'
      },
      {
        title: 'Cazar persistencia post-compromiso',
        detail: 'Dos puertas traseras típicas: reglas de reenvío en el buzón (exfiltración silenciosa) y registro de métodos MFA nuevos por el atacante (genera TOTP a voluntad). Ambas hay que verificarlas en TODA contención de cuenta.',
        command: 'Search-UnifiedAuditLog -StartDate (Get-Date).AddDays(-7) -EndDate (Get-Date) -UserIds "{{USERNAME}}@nexora.com.co" -Operations "User registered security info", "New-InboxRule" -ResultSize 50 | Format-List CreationDate, Operations, UserIds, AuditData'
      },
      {
        title: 'Bloquear la IP en las capas que apliquen',
        detail: 'El firewall perimetral bloquea tráfico de red, pero Microsoft 365 no pasa por el perímetro: la IP del atacante debe bloquearse también en Conditional Access (ubicación nombrada). Bloquear solo en el firewall es dejar la puerta del SaaS abierta.',
        command: 'Get-InboxRule -Mailbox "{{USERNAME}}" | Format-List Name, Description, Enabled, RedirectTo, ForwardTo'
      },
      {
        title: 'Endurecer para que no se repita',
        detail: 'El number matching (número emparejado) obliga a leer y teclear, matando la aprobación por reflejo; FIDO2 es superior para ejecutivos. Documentar cada caso de fatigue como evidencia para acelerar el despliegue del control.',
      }
    ],
    verification: 'Sin ResultType 0 desde IP no conocidas en 24 h tras la revocación, sin reglas de reenvío nuevas y sin métodos MFA no reconocidos por el usuario (verificado presencialmente).',
    escalation: 'L2 / CSIRT (un solo push aprobado = cuenta comprometida: contención inmediata y revisión de persistencia; si la cuenta es privilegiada o ejecutiva, notificación directa)',
    relatedTerms: ['MFA fatigue (ataque)', 'MFA por push (notificación)', 'Multi-Factor Authentication (MFA)', 'Cuentas con riesgo', 'Reinicio de MFA por ingeniería social'],
    relatedTickets: ['soc-003', 'soc-028', 'soc-031']
  },
  {
    id: 'sockb-impossible-travel',
    title: 'Viaje imposible: sesión desde otro país en minutos (y el robo de token)',
    category: 'SOC - Identity / Ataques de Contraseña',
    environment: 'Identity',
    symptoms: 'La regla de viaje imposible alerta dos inicios de sesión exitosos (o uno exitoso y uno fallido) desde ubicaciones geográficamente incompatibles en pocos minutos. Puede ser la VPN corporativa (FP) o una sesión/cookie robada (VP).',
    cause: 'Uso de credenciales o tokens robados desde otra geografía (T1078 / T1550.001 token theft). Los FPs típicos: IPs de salida de la VPN corporativa, proxies corporativos y geolocalización errónea de IPs móviles del usuario.',
    steps: [
      {
        title: 'Reconstruir la línea de tiempo completa',
        detail: 'Orden ascendente por TimeGenerated para ver el login legítimo y el anómalo. Comparar IPs contra el histórico de la cuenta: la IP nueva en 30 días es la señal de ruptura, no la distancia del "viaje".',
        command: 'SigninLogs | where UserPrincipalName == "{{USERNAME}}@nexora.com.co" | where TimeGenerated > ago(12h) | project TimeGenerated, IPAddress, Location, ResultType, AppDisplayName, RiskLevelDuringSignIn | order by TimeGenerated asc'
      },
      {
        title: 'Descartar los FPs de infraestructura propia',
        detail: 'Verificar si la segunda ubicación es el nodo de salida de la VPN o el proxy corporativo (watchlist de infraestructura conocida). Un FP de VPN tiene el mismo ASN propio y horario laboral; un VP llega de hosting con horario anómalo.',
        command: 'SigninLogs | where TimeGenerated > ago(14d) | where IPAddress in ("{{IP_VPN_1}}", "{{IP_VPN_2}}") | summarize sesiones = count() by UserPrincipalName, IPAddress | order by sesiones desc'
      },
      {
        title: 'Revisar las sesiones por token (lo que el MFA no protege)',
        detail: 'AADNonInteractiveUserSignInLogs registra el uso de tokens ya emitidos: un atacante con la cookie opera SIN nueva autenticación y SIN reto MFA. ResultType 0 desde la IP anómala en esta tabla = sesión robada confirmada.',
        command: 'AADNonInteractiveUserSignInLogs | where UserPrincipalName == "{{USERNAME}}@nexora.com.co" | where TimeGenerated > ago(12h) | project TimeGenerated, IPAddress, ResourceDisplayName, ResultType | order by TimeGenerated desc'
      },
      {
        title: 'Contener: revocación total + reset',
        detail: 'Revoke-MgUserSignInSession invalida los refresh tokens (la sesión robada muere aunque la contraseña esté intacta); el reset cubre el escenario de credenciales (no solo cookies). El re-registro MFA presencial cierra el ciclo.',
        command: 'Revoke-MgUserSignInSession -UserId "{{USERNAME}}@nexora.com.co"'
      },
      {
        title: 'Cazar persistencia y afinar la regla',
        detail: 'Reglas de reenvío y grants OAuth de la cuenta, y bloqueo de la IP en Conditional Access. Si el caso es el FP de la VPN: watchlist de IPs de salida y exclusión en la regla — la regla ruidosa es la que se ignora.',
      }
    ],
    verification: 'SigninLogs y AADNonInteractiveUserSignInLogs sin ResultType 0 desde IP no conocidas en 24 h tras la revocación, y la regla de viaje imposible con FP por debajo del umbral acordado (p. ej. <3/semana).',
    escalation: 'L2 / CSIRT (sesión exitosa del atacante = P1; sesión solo por token confirmada: robo de cookie — buscar el infostealer en el host del usuario)',
    relatedTerms: ['Viaje imposible (impossible travel)', 'Cuentas con riesgo', 'VPN site-to-site', 'Multi-Factor Authentication (MFA)', 'Token theft (robo de tokens)'],
    relatedTickets: ['soc-004', 'soc-029', 'soc-030', 'soc-008']
  },
  {
    id: 'sockb-malware-edr',
    title: 'Malware en el endpoint: triage con Defender y el EDR',
    category: 'SOC - Endpoint / EDR',
    environment: 'Endpoint',
    symptoms: 'Defender genera una alerta de amenaza (troyano, infostealer, behavior) o el EDR marca una cadena de procesos sospechosa. Hay que determinar si solo llegó, si ejecutó y qué se llevó antes de decidir contención.',
    cause: 'Ejecución de software malicioso por descarga del usuario (activadores, "PDF readers"), adjuntos con macro/ISO (T1566.001) o loaders. El infostealer es el rey: roba cookies y contraseñas del navegador y abre sesiones sin MFA.',
    steps: [
      {
        title: 'Trazar la detección y si ejecutó de verdad',
        detail: 'DidThreatExecute distingue la detección del intento del daño hecho; Resources trae el archivo afectado. Get-MpThreatDetection da el proceso y la hora exacta de la detección para el linaje.',
        command: 'Get-MpThreat | Format-List ThreatName, SeverityID, DidThreatExecute, Resources'
      },
      {
        title: 'Reconstruir el linaje de procesos',
        detail: 'Del proceso detectido hacia arriba (InitiatingProcessFileName) se ve el vector (winword/excel = macro; el .exe descargado = instalación manual) y hacia abajo qué hijos lanzó. Es la columna vertebral del caso.',
        command: 'DeviceProcessEvents | where DeviceName == "{{HOSTNAME}}" | where Timestamp > ago(6h) | project Timestamp, FileName, ProcessCommandLine, InitiatingProcessFileName, AccountName | order by Timestamp asc'
      },
      {
        title: 'Verificar archivos y red (qué tocó y a quién llamó)',
        detail: 'DeviceFileEvents con FileOriginUrl dice de dónde bajó y si tocó credenciales del navegador ("Login Data", "Cookies"); DeviceNetworkEvents muestra el C2 o la exfiltración. Las tres tablas juntas cuentan la historia completa.',
        command: 'DeviceNetworkEvents | where DeviceName == "{{HOSTNAME}}" | where Timestamp > ago(6h) | project Timestamp, RemoteUrl, RemoteIP, InitiatingProcessFileName | order by Timestamp asc'
      },
      {
        title: 'Decidir el nivel de contención',
        detail: 'Ransomware, C2 activo, dump de LSASS o borrado de logs: aislamiento COMPLETO (XDR) + re-imagen. Solo descarga sin detonación: cuarentena y observación. Servidor crítico: avisar al dueño del servicio ANTES de aislar.',
        command: 'Remove-MpThreat; Start-MpScan -ScanType FullScan'
      },
      {
        title: 'Tratar las credenciales como comprometidas',
        detail: 'Un infostealer que tocó "Login Data"/"Cookies" compromete sesiones aunque la contraseña no cambie: revocar sesiones SIEMPRE, además del reset. Las cookies robadas reviven sesiones en cualquier parte.',
        command: 'DeviceFileEvents | where DeviceName == "{{HOSTNAME}}" | where FileName in ("Login Data", "Cookies", "Local State") | where FolderPath contains "AppData" | project Timestamp, FileName, FolderPath, InitiatingProcessFileName'
      },
      {
        title: 'Barrer la flota y registrar los IOCs',
        detail: 'El SHA256 del binario en DeviceFileEvents (¿más hosts?), el dominio/IP del C2 en DeviceNetworkEvents y la entrada en la watchlist de TI. Un caso de malware sin barrido de flota está a medias.',
      }
    ],
    verification: 'Get-MpThreat vacío tras la remediación, full scan en 0 detecciones, DeviceNetworkEvents del host sin conexiones a los IOCs en 24 h y el barrido de flota con 0 hits del hash.',
    escalation: 'L2 / DFIR (DidThreatExecute true + C2 o robo de credenciales — aislamiento y re-imagen; dump de LSASS o ransomware = P1 inmediato)',
    relatedTerms: ['EDR / XDR', 'Aislamiento de endpoint', 'Incident Response (ciclo NIST)', 'IOC (Indicator of Compromise)'],
    relatedTickets: ['soc-006', 'soc-022', 'soc-033', 'soc-034']
  },
  {
    id: 'sockb-c2-beacon',
    title: 'Beacon C2: tráfico periódico hacia el servidor del atacante',
    category: 'SOC - Network / NDR',
    environment: 'Network',
    symptoms: 'Un host genera conexiones salientes con periodicidad casi fija (30-90 s, jitter mínimo) hacia un dominio recién registrado o una IP de hosting. El volumen es bajo a propósito: no dispara alertas de tráfico.',
    cause: 'Implant de comando y control (T1071.001 web protocols): el malware "late" al operador para recibir órdenes. El beacon puede ir directo, vía proxy autenticado (el aislamiento de Defender NO lo corta) o por DNS (túnel).',
    steps: [
      {
        title: 'Confirmar la periodicidad del latido',
        detail: 'La sumarización por ventana de 5 m hace visible el patrón regular; el conteo constante por ventana con jitter bajo es la firma. Comparar contra el baseline del host (updates legítimos también son periódicos pero con horarios distintos).',
        command: 'DeviceNetworkEvents | where DeviceName == "{{HOSTNAME}}" | where RemoteUrl == "{{C2_DOMAIN}}" | summarize Conexiones = count() by bin(Timestamp, 5m)'
      },
      {
        title: 'Identificar el proceso y su origen',
        detail: 'El binario que late suele vivir en C:\\Users\\Public o C:\\Windows\\Temp. DeviceFileEvents con FileOriginUrl entrega el hash y la URL de descarga: los IOCs completos del implant.',
        command: 'DeviceProcessEvents | where DeviceName == "{{HOSTNAME}}" | where FileName == "{{BEACON_BINARY}}" | project Timestamp, ProcessCommandLine, SHA256, InitiatingProcessFileName | take 20'
      },
      {
        title: 'Medir el alcance en la flota',
        detail: 'Un beacon en un host suele traer hermanos: sumarizar por RemoteUrl con dcount(DeviceName) revela cuántas máquinas hablan con el mismo C2. El alcance define la severidad real del caso.',
        command: 'DeviceNetworkEvents | where Timestamp > ago(24h) | where RemoteUrl has "{{C2_DOMAIN}}" | summarize hosts = dcount(DeviceName), eventos = count() by RemoteUrl'
      },
      {
        title: 'Contener: aislar + bloquear en TODAS las capas',
        detail: 'Aislamiento XDR del host Y bloqueo del dominio/IP en firewall, proxy y DNS. Si el host estaba aislado y el beacon sigue: el canal pasa por el proxy autenticado — bloquear ahí y adelantar la re-imagen.',
        command: 'CommonSecurityLog | where TimeGenerated > ago(24h) | where DestinationIP == "{{C2_IP}}" | project TimeGenerated, DeviceAction, SourceIP, DestinationPort, Protocol | take 100'
      },
      {
        title: 'Valorar la infraestructura del atacante',
        detail: 'Dominio registrado hace días, IP de hosting conocida o reincidente del expediente: la reutilización de infra conecta casos en campañas. Registrar dominio, IP y hash en la watchlist de TI (match futuro = alerta).',
      },
      {
        title: 'Verificar el corte y cerrar',
        detail: 'Sin conexiones al dominio desde NINGÚN host en 24 h tras los bloqueos, y el host re-imaginado o limpio con full scan. El IOC queda en vigilancia permanente.',
      }
    ],
    verification: 'DeviceNetworkEvents/CommonSecurityLog sin conexiones hacia el dominio/IP del C2 desde ningún host en 24 h tras el aislamiento y los bloqueos.',
    escalation: 'L2 / DFIR (beacon activo = compromiso confirmado — P1: aislamiento, re-imagen y forense del host; si el beacon sigue con el host aislado, buscar el canal alternativo)',
    relatedTerms: ['Threat hunting', 'IOC (Indicator of Compromise)', 'SIEM (Security Information and Event Management)', 'Firewall', 'DNS'],
    relatedTickets: ['soc-007', 'soc-037', 'soc-041', 'soc-015']
  },
  {
    id: 'sockb-consent-phishing',
    title: 'Consent phishing: la app OAuth que pide el token en vez de la clave',
    category: 'SOC - Cloud / SaaS',
    environment: 'Cloud',
    symptoms: 'Un usuario concedió permisos a una app que no reconoce (Mail.Read, Files.Read.All) desde un correo o enlace. La app funciona con SU identidad de servicio: no hay alertas de login del usuario ni retos MFA — el acceso es silencioso hasta que se revoca.',
    cause: 'Illicit consent grant (T1528): el atacante registra una app multi-tenant en su propio tenant, la disfraza de herramienta útil y phishea el clic en "Aceptar". Con el token concedido lee correo y archivos sin necesidad de la contraseña. Florece cuando los usuarios pueden autorizar apps sin aprobación administrativa.',
    steps: [
      {
        title: 'Listar los grants con permisos sensibles',
        detail: 'Los scopes de Graph son el detector: Mail.Read, Files.Read, Files.Read.All sobre consentimientos de tipo Principal (usuario individual) son el perfil típico. ClientId identifica la app y PrincipalId al usuario.',
        command: 'Get-MgOauth2PermissionGrant -All | Where-Object { $_.Scope -match "Mail|Files" } | Format-List ClientId, ConsentType, PrincipalId, Scope'
      },
      {
        title: 'Investigar la app (el perfil del sospechoso)',
        detail: 'PublisherName vacío ("not verified"), AppOwnerOrganizationId de un tenant ajeno y displayName genérico con palabras como "PDF", "Report" o "Tools": el trío clásico de la app ilícita. Las apps legítimas del ecosistema tienen publisher verificado.',
        command: 'Get-MgServicePrincipal -Filter "appId eq \'{{APP_ID}}\'" | Format-List DisplayName, PublisherName, AppOwnerOrganizationId, ReplyUrls'
      },
      {
        title: 'Medir el acceso ya realizado',
        detail: 'MailItemsAccessed en el log unificado muestra la lectura de correo por la app (con horas e IP); la auditoría de SharePoint muestra descargas. El tiempo entre el grant y la revocación define la ventana de exposición.',
        command: 'Search-UnifiedAuditLog -StartDate (Get-Date).AddDays(-7) -EndDate (Get-Date) -Operations "MailItemsAccessed" -UserIds "{{USERNAME}}@nexora.com.co" -ResultSize 100 | Format-List CreationDate, Operations, UserIds, AuditData'
      },
      {
        title: 'Revocar y bloquear',
        detail: 'Se revoca el grant (uno por usuario afectado) Y se bloquea el service principal de la app en el tenant para que no pueda volver a pedir consentimiento a nadie más.',
        command: 'Remove-MgOauth2PermissionGrant -Oauth2PermissionGrantId "{{GRANT_ID}}"'
      },
      {
        title: 'Barrir el tenant y purgar el vector',
        detail: 'Buscar más grants de la misma app (o del mismo publisher) y purgar el correo de phishing que condujo al consentimiento. Un grant suele traer hermanos: la campaña se envió a muchos.',
        command: 'Get-MgOauth2PermissionGrant -All | Where-Object { $_.ClientId -eq "{{CLIENT_ID}}" } | Format-List ClientId, PrincipalId, Scope'
      },
      {
        title: 'Prevenir con política (la única defensa escalable)',
        detail: 'Habilitar el admin consent workflow: los usuarios piden, TI decide. Y revisar los permisos de las apps ya existentes en el tenant (las legítimas también acumulan scopes). El fix de política vale más que el heroísmo del caso individual.',
      }
    ],
    verification: 'Get-MgOauth2PermissionGrant sin grants de la app para ningún usuario, el service principal bloqueado, 0 MailItemsAccessed posteriores a la revocación y el flujo de admin consent activo.',
    escalation: 'L2 / CSIRT (evidencia de lectura de correspondencia sensible o de descarga masiva — evaluar exposición y notificación; más usuarios afectados = escala de campaña)',
    relatedTerms: ['Phishing de consentimiento (consent phishing)', 'Consentimiento OAuth (user y admin consent)', 'OAuth 2.0', 'Access token', 'Phishing'],
    relatedTickets: ['soc-009', 'soc-025', 'soc-045']
  },
  {
    id: 'sockb-data-exfil',
    title: 'Descarga masiva y exfiltración: dimensionar antes de contener',
    category: 'SOC - Datos / Exfiltración',
    environment: 'Multi',
    symptoms: 'La DLP o una regla de volumen marcan descargas masivas de SharePoint/OneDrive, o el EDR registra compresión de archivos y subida posterior a un servicio externo. Puede ser un insider (pre-renuncia) o un atacante con token/cookie robado.',
    cause: 'Staging + exfiltración (T1560.001 compresión → T1048/T1567 salida por canal web): el atacante o el insider preparan los datos (zip en Temp, descargas masivas) y los sacan por HTTPS a un almacenamiento externo. Las variantes por token de app usan la identidad del service principal, invisibles a las alertas de login.',
    steps: [
      {
        title: 'Cuantificar la descarga o el volumen movido',
        detail: 'OfficeActivity (SharePoint/OneDrive) con FileDownloaded sumarizado por sitio y hora da el alcance exacto; para endpoints, el tamaño del archivo comprimido en DeviceFileEvents define el volumen transportado.',
        command: 'OfficeActivity | where OfficeWorkload == "SharePoint" | where Operation in ("FileDownloaded", "FilesDownloaded") | where UserId == "{{USERNAME}}@nexora.com.co" | where TimeGenerated > ago(7d) | summarize descargas = count() by SiteUrl, bin(TimeGenerated, 1h) | order by descargas desc'
      },
      {
        title: 'Identificar al actor (sesión, token o app)',
        detail: 'La misma descarga puede salir de la sesión del usuario (insider o cookie robada), de su token no interactivo o del service principal de una app OAuth. El UserId de OfficeActivity y el cruce con SigninLogs dicen quién fue realmente.',
        command: 'AADNonInteractiveUserSignInLogs | where UserPrincipalName == "{{USERNAME}}@nexora.com.co" | where TimeGenerated > ago(24h) | project TimeGenerated, IPAddress, ResourceDisplayName, ResultType | order by TimeGenerated desc'
      },
      {
        title: 'Confirmar la salida (a dónde fue a parar)',
        detail: 'DeviceNetworkEvents/CommonSecurityLog muestran las subidas: el dominio de destino y los bytes transportados. Sin confirmación de salida solo hay staging: el caso cambia de "exfiltración" a "intento".',
        command: 'CommonSecurityLog | where TimeGenerated > ago(24h) | where SourceIP == "{{SOURCE_IP}}" | summarize bytes = sum(SentBytes) by bin(TimeGenerated, 5m), DestinationIP | order by bytes desc'
      },
      {
        title: 'Clasificar qué salió (el inventario para Legal)',
        detail: 'Desglosar por sitio y tipo de archivo con su clasificación (público, interno, confidencial, datos personales). El inventario con volúmenes y afectados es lo que Legal necesita para valorar notificación: sin inventario no hay decisión posible.',
      },
      {
        title: 'Contener según el actor',
        detail: 'Insider: restringir descargas y preparar la salida con RRHH/Legal. Token/cookie robada: revocar sesiones y reset. App OAuth: revocar el grant y bloquear el service principal. Y en todos: bloquear el dominio de destino en las 4 capas (proxy, firewall, DNS y Conditional Access).',
        command: 'Revoke-MgUserSignInSession -UserId "{{USERNAME}}@nexora.com.co"'
      },
      {
        title: 'Cerrar el hueco de detección',
        detail: 'Ajustar los umbrales de la DLP (volumen por hora) y extender la cobertura a descargas por service principals (las apps no son "usuarios"). El caso que no deja una política mejorada dejó de enseñar algo.',
      }
    ],
    verification: '0 descargas subsecuentes del actor contenido, dominio de destino bloqueado en las 4 capas, inventario entregado a Legal y la política DLP cubriendo el patrón detectado (usuario y app).',
    escalation: 'Legal / CSIRT (datos personales o confidenciales confirmados fuera — flujo de valoración de notificación; exfiltración activa = P1: cortar primero, dimensionar después)',
    relatedTerms: ['Incident Response (ciclo NIST)', 'Zero Trust', 'IOC (Indicator of Compromise)', 'Threat hunting', 'SIEM (Security Information and Event Management)'],
    relatedTickets: ['soc-010', 'soc-036', 'soc-042', 'soc-046']
  },
  {
    id: 'sockb-dormant-account',
    title: 'Cuenta dormante reactivada: el fantasma que nadie vigila',
    category: 'SOC - Identity / Ataques de Contraseña',
    environment: 'Identity',
    symptoms: 'Una cuenta sin actividad por meses (contratista de proyecto terminado, ex-empleado, cuenta de servicio huérfana) inicia sesión de repente, normalmente de madrugada y desde IP externa. La regla de cuentas dormantes o la auditoría la traen a colación.',
    cause: 'Abuso de cuentas válidas (T1078 / T1078.004): las credenciales de contratistas circulan en filtraciones y nadie las cambia porque "nadie usa esa cuenta". El offboarding que no deshabilita deja la puerta abierta: el atacante entra por la puerta vieja que se olvidó cerrar.',
    steps: [
      {
        title: 'Confirmar la inactividad previa y la sesión nueva',
        detail: 'El contraste es el caso: 90 días (o más) sin un solo sign-in seguido de uno exitoso desde IP sin historial. La ventana larga evita confundir un usuario que vuelve de vacaciones con un fantasma.',
        command: 'SigninLogs | where UserPrincipalName == "{{USERNAME}}@nexora.com.co" | where TimeGenerated > ago(90d) | project TimeGenerated, IPAddress, Location, ResultType, AppDisplayName, RiskLevelDuringSignIn | order by TimeGenerated asc'
      },
      {
        title: 'Ver el riesgo y qué hizo la sesión',
        detail: 'AADUserRiskEvents (leaked credentials, anomalous activity) y la auditoría de las acciones posteriores (OfficeActivity: ¿navegó sitios? ¿descargó?) definen si fue reconocimiento o robo consumado.',
        command: 'AADUserRiskEvents | where UserPrincipalName == "{{USERNAME}}@nexora.com.co" | project TimeGenerated, RiskEventType, RiskLevel, RiskDetail, RiskState'
      },
      {
        title: 'Validar con RRHH (la fuente de verdad humana)',
        detail: '¿El contrato terminó? ¿El proyecto sigue? La respuesta de RRHH convierte la alerta en incidente (cuenta vencida usada) o en excepción documentada (contratista que volvió). Sin validación humana no hay veredicto.',
      },
      {
        title: 'Contener: deshabilitar y revocar',
        detail: 'Disable es mejor que reset para cuentas sin dueño: si el "dueño" reaparece, Identity la re-habilita con verificación. Revocar las sesiones corta al atacante YA. La cuenta trampa es tentadora pero el estándar es deshabilitar SIEMPRE.',
        command: 'Update-MgUser -UserId "{{USERNAME}}@nexora.com.co" -AccountEnabled $false'
      },
      {
        title: 'Barrir la higiene completa (una trae hermanas)',
        detail: 'Una cuenta dormante detectada casi siempre implica más: ex-contratistas, ex-empleados, cuentas de servicio sin dueño. Barrer el tenant por inactividad + habilitadas y corregir en bloque con aprobación de Identity.',
        command: 'SigninLogs | where TimeGenerated > ago(60d) | summarize ultima = max(TimeGenerated) by UserPrincipalName | where isnull(ultima) | project UserPrincipalName | take 100'
      },
      {
        title: 'Cerrar la causa raíz en el proceso de salida',
        detail: 'El offboarding debe deshabilitar la cuenta EL DÍA de la salida (no al final del mes). Integrar la revisión de inactividad (30/60/90 días) como tarea mensual del SOC: el fantasma de hoy fue el olvidado de ayer.',
      }
    ],
    verification: 'Cuenta deshabilitada con 0 sign-in posteriores, barrido de inactividad ejecutado con las cuentas hermanas corregidas, y la validación de RRHH documentada en el caso.',
    escalation: 'L2 (si la sesión del atacante accedió a datos, si aparecen cuentas hermanas con roles privilegiados o si la cuenta tenía MFA ausente — revisar el despliegue de MFA por población)',
    relatedTerms: ['Cuenta dormante / inactiva', 'Cuentas con riesgo', 'Lifecycle de cuentas privilegiadas', 'Zero Trust', 'Escalamiento'],
    relatedTickets: ['soc-013', 'soc-047']
  },
  {
    id: 'sockb-privileged-group',
    title: 'Cambios en grupos privilegiados (4728/4732) y roles en la nube',
    category: 'SOC - Respuesta a Incidentes',
    environment: 'Identity',
    symptoms: 'Evento 4728/4732: agregaron una cuenta a Domain Admins u otro grupo crítico, fuera de ventana de cambio o con autor ausente. En la nube, AzureActivity registra asignaciones de rol (roleAssignment) fuera de PIM. No todo cambio es ataque — pero todo cambio exige verificación.',
    cause: 'Escalada de privilegios (T1098 account manipulation / T1136 creación de cuentas): el atacante con una cuenta admin comprometida crea o promociona cuentas para garantizar acceso. La causa benigna (y frecuente): guardias que comparten credenciales o crean cuentas temporales de emergencia sin proceso.',
    steps: [
      {
        title: 'Confirmar la cadena completa de cambios',
        detail: 'El 4720 (creación) seguido del 4728 (membresía) minutos después es la firma de cuenta improvisada; el 4728 solo sobre cuenta existente pide otra lectura. La línea de tiempo con SubjectUserName es el inicio de todo.',
        command: 'SecurityEvent | where EventID in (4720, 4726, 4728, 4732) | where TimeGenerated > ago(48h) | project TimeGenerated, EventID, SubjectUserName, TargetUserName, Computer | order by TimeGenerated asc'
      },
      {
        title: 'Verificar el origen del cambio (la sesión del autor)',
        detail: 'El 4624 previo del SubjectUserName: desde qué host, qué tipo de logon y a qué hora. La pregunta clave se la responde el humano: ¿el autor estaba ahí, de vacaciones o durmiendo? Entrevistar SIEMPRE antes de cerrar.',
        command: 'SecurityEvent | where EventID == 4624 | where TargetUserName == "{{AUTHOR}}" | where TimeGenerated > ago(48h) | project TimeGenerated, IpAddress, LogonType, Computer | order by TimeGenerated desc'
      },
      {
        title: 'Descartar el cambio autorizado',
        detail: 'Registro de cambios del CISO, ventana de mantenimiento, pentest contratado o emergencia documentada. La disciplina manda: sin evidencia de autorización, el cambio se revierte primero y se discute después.',
      },
      {
        title: 'Revertir y neutralizar',
        detail: 'Remover del grupo y deshabilitar la cuenta promocionada; auditar qué hizo mientras fue privilegiada (4624/4688). En la nube: eliminar la asignación de rol y revocar los tokens de la identidad beneficiaria.',
        command: 'Remove-ADGroupMember -Identity "Domain Admins" -Members "{{TARGET_ACCOUNT}}"; Disable-ADAccount -Identity "{{TARGET_ACCOUNT}}"'
      },
      {
        title: 'Auditar las membresías completas de los grupos críticos',
        detail: 'Get-ADGroupMember contra la nómina de RRHH: ex-empleados y cuentas sin dueño en grupos privilegiados son el mismo problema en versión crónica. La revisión periódica con el SOC es el control de fondo.',
        command: 'Get-ADGroupMember "Domain Admins" -Recursive | Select-Object SamAccountName, Enabled, ObjectClass'
      },
      {
        title: 'Cerrar con disciplina de proceso',
        detail: 'Cambios a grupos críticos solo por ventana aprobada; emergencias con cuentas break-glass auditables (no credenciales prestadas). El hallazgo de credential sharing se reporta: la cultura es parte de la defensa.',
      }
    ],
    verification: 'Membresía revertida (evidencia antes/después), cuenta promocionada neutralizada, 0 acciones maliciosas en su ventana de privilegio y el reporte de proceso entregado (cambio autorizado o hallazgo de disciplina).',
    escalation: 'CISO / Identity (cambio sin autorización confirmada = posible cuenta admin comprometida — IR completo; hallazgos de credential sharing o cuentas de ex-empleados van al comité)',
    relatedTerms: ['Lifecycle de cuentas privilegiadas', 'Zero Trust', 'SIEM (Security Information and Event Management)', 'Escalamiento', 'Kerberos (TGT / ST)'],
    relatedTickets: ['soc-014', 'soc-016', 'soc-049']
  },
  {
    id: 'sockb-dns-tunneling',
    title: 'DNS tunneling: el puerto 53 como canal encubierto de C2 y exfiltración',
    category: 'SOC - Network / NDR',
    environment: 'Network',
    symptoms: 'Un host genera cientos o miles de consultas DNS por hora hacia subdominios de un mismo dominio, con etiquetas largas (30-60 caracteres) y casi todas únicas. El volumen rompe el baseline del resolver y el patrón (TXT o consultas aleatorias constantes) no corresponde a navegación de usuario.',
    cause: 'Túnel DNS (T1071.004 — Application Layer Protocol: DNS): el malware codifica datos (comandos, exfiltración) en los labels de subdominios que solo el servidor de nombres del atacante sabe leer. Pasa por el puerto 53 que históricamente nadie filtra, evita proxy y TLS, y funciona hasta en redes que solo permiten resolver el DNS interno.',
    steps: [
      {
        title: 'Confirmar la forma del patrón (volumen + unicidad)',
        detail: 'La firma es el trío: muchas consultas, labels largos y nombres casi todos ÚNICOS (dcount(Name) cercano a count()). La navegación normal repite dominios; el túnel genera un nombre nuevo por mensaje. avg(strlen(Name)) por encima del baseline (12-15 caracteres) corrobora.',
        command: 'DnsEvents | where TimeGenerated > ago(1h) | where ClientIP == "{{CLIENT_IP}}" | summarize queries = count(), unicos = dcount(Name), largo_promedio = avg(strlen(Name))'
      },
      {
        title: 'Muestrear y documentar el canal',
        detail: 'Guardar una muestra de las consultas para el expediente: el patrón de los labels (base32/hex, longitud fija) y el dominio raíz son la evidencia del túnel y el IOC principal del caso. Sin muestra no hay veredicto defendible.',
        command: 'DnsEvents | where TimeGenerated > ago(1h) | where ClientIP == "{{CLIENT_IP}}" | project TimeGenerated, Name | take 50'
      },
      {
        title: 'Aislar el dominio raíz y estimar el canal',
        detail: 'Sumarizar por el dominio raíz revela cuántos hosts hablan con el túnel y cuántas consultas movió: a ~1 KB de datos útiles por consulta larga, 3.000 consultas/hora son un canal de C2 respetable que pasó por debajo del proxy. Un host rara vez viene solo.',
        command: 'DnsEvents | where TimeGenerated > ago(24h) | where Name has "{{TUNNEL_DOMAIN}}" | summarize consultas = count(), hosts = dcount(ClientIP) by bin(TimeGenerated, 1h)'
      },
      {
        title: 'Identificar el proceso en el host',
        detail: 'El EDR no tiene tabla de DNS propia, pero el proceso que genera el túnel sí deja rastro: correlacionar la ventana del burst con las conexiones del host hacia el resolver (RemotePort 53) y su proceso iniciador. El dueño del proceso es el implant.',
        command: 'DeviceNetworkEvents | where DeviceName == "{{HOSTNAME}}" | where Timestamp > ago(1h) | where RemotePort == 53 | project Timestamp, RemoteIP, InitiatingProcessFileName, InitiatingProcessCommandLine | take 100'
      },
      {
        title: 'Contener: cortar el canal en el resolver y el perímetro',
        detail: 'Bloquear el dominio raíz en el resolver corporativo (la respuesta NXDOMAIN mata el túnel sin tocar el host) y la IP del NS autoritativo en el firewall. El host se aísla si hay otros indicadores de implant activo (C2 HTTP, ejecuciones sospechosas en la misma ventana).'
      },
      {
        title: 'Verificar el corte y vigilar la recurrencia',
        detail: '0 consultas hacia el dominio desde cualquier host en 24 h, host limpio o re-imaginado según la profundidad del implant, y el dominio en la watchlist de TI. La regla de umbral (dcount de subdominios por hora y por host) queda afinada para la próxima campaña.'
      }
    ],
    verification: 'DnsEvents sin consultas hacia el dominio del túnel desde ningún host en 24 h tras el bloqueo en el resolver, y el host con full scan limpio o re-imagen según la profundidad del implant.',
    escalation: 'L2 / DFIR (túnel activo con datos confirmados = exfiltración en curso — P1; si solo hay consultas de reconocimiento, contención + forense del host)',
    relatedTerms: ['DNS', 'Firewall', 'Threat hunting', 'SIEM (Security Information and Event Management)', 'IOC (Indicator of Compromise)'],
    relatedTickets: ['soc-017']
  },
  {
    id: 'sockb-powershell-encoded',
    title: 'PowerShell codificado (-EncodedCommand): decodificar antes de contener',
    category: 'SOC - Endpoint / EDR',
    environment: 'Endpoint',
    symptoms: 'Un proceso de ofimática (winword/excel) o un acceso directo inicia powershell.exe con -EncodedCommand/-enc, -w hidden o -nop y una cadena Base64 larga. El EDR alerta de "actividad sospechosa de PowerShell" y el script block logging (4104) puede traer el script ya decodificado.',
    cause: 'Ofuscación de comandos (T1027) ejecutada por PowerShell (T1059.001), típicamente desde una macro de documento (T1566.001) o un .lnk: el atacante codifica en Base64 UTF-16LE la cadena de descarga/ejecución para evadir firmas de línea de comandos y el ojo del analista de logs.',
    steps: [
      {
        title: 'Ver el script decodificado en el 4104',
        detail: 'El script block logging registra el bloque YA decodificado: buscar FromBase64String, IEX, DownloadString o Net.WebClient en el evento evita adivinar. Con el 4104 el caso pasa de "PowerShell sospechoso" a "downloader hacia X" — acción concreta, IOC concreto.',
        command: 'SecurityEvent | where EventID == 4104 | where Computer == "{{HOSTNAME}}" | where TimeGenerated > ago(24h) | project TimeGenerated, RenderedDescription | where RenderedDescription has_any ("FromBase64String", "IEX", "DownloadString", "Net.WebClient")'
      },
      {
        title: 'Decodificar el -EncodedCommand para el expediente',
        detail: 'El payload de -EncodedCommand es Base64 de UTF-16LE (por eso se decodifica con Unicode y no con UTF8, que produce basura). Guardar el script decodificado como evidencia: es la acción real que el atacante quiso ocultar.',
        command: '[System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String("<cadena>"))'
      },
      {
        title: 'Reconstruir el linaje completo',
        detail: 'Del padre (documento o .lnk) al powershell hijo y de ahí a la red: el SHA256 del binario, el FileOriginUrl del archivo origen y las conexiones posteriores completan la cadena. Sin linaje el caso es una anécdota; con linaje es un expediente.',
        command: 'DeviceProcessEvents | where DeviceName == "{{HOSTNAME}}" | where Timestamp > ago(6h) | project Timestamp, FileName, ProcessCommandLine, InitiatingProcessFileName, SHA256 | order by Timestamp asc'
      },
      {
        title: 'Buscar la persistencia (el segundo paso del atacante)',
        detail: 'Descargar y ejecutar es la mitad; mantenerse es la otra: tareas programadas (4698/schtasks.exe), claves Run del registro (reg.exe) y servicios nuevos (sc.exe) en la ventana posterior. Verificar SIEMPRE antes de declarar el host limpio.',
        command: 'DeviceProcessEvents | where DeviceName == "{{HOSTNAME}}" | where Timestamp > ago(6h) | where FileName in ("schtasks.exe", "reg.exe", "sc.exe") | project Timestamp, ProcessCommandLine, InitiatingProcessFileName | order by Timestamp asc'
      },
      {
        title: 'Contener y barrer la flota',
        detail: 'Cuarentena del documento vector, Remove-MpThreat + full scan, reset de credenciales del usuario y purga del correo si llegó por campaña. El hash del payload y el dominio del segundo stage se barren en toda la flota: 18 buzones afectados suelen significar 18 hosts en riesgo.',
        command: 'Remove-MpThreat; Start-MpScan -ScanType FullScan'
      },
      {
        title: 'Endurecer para la próxima',
        detail: 'Habilitar script block logging por GPO donde falte (sin 4104 este caso era invisible), activar el bloqueo de macros en archivos descargados de internet y valorar Constrained Language Mode/AMSI para estaciones de ofimática. Cada decodificación exitosa es un voto por controles, no por heroísmo.'
      }
    ],
    verification: 'Full scan en 0 detecciones, DeviceNetworkEvents sin conexiones a los IOCs en 24 h, barrido de flota sin hits del hash y script block logging verificado en las OU de usuarios.',
    escalation: 'L2 (payload ejecutado con éxito, más hosts con el mismo hash o C2 posterior — hacia DFIR; robo de credenciales o cifrado = P1)',
    relatedTerms: ['PowerShell (módulos AD y Graph)', 'PowerShell remoting', 'EDR / XDR', 'MITRE ATT&CK', 'IOC (Indicator of Compromise)'],
    relatedTickets: ['soc-018', 'soc-035']
  },
  {
    id: 'sockb-kerberoasting',
    title: 'Kerberoasting: ráfagas de TGS con RC4 (4769) contra cuentas de servicio',
    category: 'SOC - Identity / Ataques de Contraseña',
    environment: 'Identity',
    symptoms: 'Ráfaga de eventos 4769 con TicketEncryptionType 0x17 (RC4-HMAC) desde un host de usuarios, pidiendo TGS para MUCHAS cuentas de servicio distintas en pocos minutos. En un dominio que opera en AES, el RC4 casi siempre indica una herramienta de roasting (Rubeus, GetUserSPNs).',
    cause: 'Kerberoasting (T1558.003): cualquier usuario autenticado puede pedir un TGS para cuentas con SPN; el TGS viaja cifrado con la clave de la cuenta de servicio y el RC4-HMAC (0x17) se craquea offline como un hash NTLM. El atacante pide todos los SPN posibles y se lleva las claves a craquear a casa.',
    steps: [
      {
        title: 'Confirmar el patrón (peticiones vs servicios distintos)',
        detail: 'Un roasting muestra count() alto de 4769 RC4 con dcount(ServiceName) también alto desde un mismo solicitante y host. Un servicio legítimo pide TGS para pocas cuentas y normalmente en AES. La sumarización por solicitante, equipo e IP del DC entrega la firma.',
        command: 'SecurityEvent | where EventID == 4769 | where TicketEncryptionType == "0x17" | where TimeGenerated > ago(24h) | summarize peticiones = count(), servicios = dcount(ServiceName) by TargetUserName, Computer, IpAddress | order by peticiones desc'
      },
      {
        title: 'Identificar la herramienta y el contexto del host',
        detail: 'El solicitante ya está DENTRO (no hay fallos previos como en un spray): buscar en el EDR el proceso ejecutor (rubeus.exe, powershell, cmd) y cruzar el horario del burst con la actividad real del usuario autenticado. El kerberoast desde un host de usuario suele ser implant, no persona.',
        command: 'DeviceProcessEvents | where DeviceName == "{{HOSTNAME}}" | where Timestamp > ago(2h) | where FileName in ("powershell.exe", "cmd.exe", "rubeus.exe") | project Timestamp, FileName, ProcessCommandLine, AccountName | order by Timestamp desc'
      },
      {
        title: 'Descartar la ventana autorizada (pentest o auditoría)',
        detail: 'El roasting es LA técnica de las evaluaciones de seguridad autorizadas: confirmar con el CISO si hay pentest o auditoría en ventana ANTES de aislar a nadie. Un verdadero positivo de técnica con autorización documentada se cierra como tal — pero las contraseñas rotan igual: el hash RC4 ya viajó.'
      },
      {
        title: 'Inventariar las cuentas de servicio expuestas',
        detail: 'Las cuentas objetivo son el daño potencial: listar todas las cuentas con SPN del dominio con su última rotación de contraseña y revisar qué accesos tienen (las de BD/ERP son las que duelen). Sin inventario no se puede priorizar la rotación.',
        command: 'Get-ADUser -Filter \'ServicePrincipalName -like "*"\' -Properties ServicePrincipalName, PasswordLastSet | Select-Object SamAccountName, PasswordLastSet, ServicePrincipalName'
      },
      {
        title: 'Contener: rotar las cuentas solicitadas',
        detail: 'Rotar con Set-ADAccountPassword las cuentas cuyos TGS RC4 fueron pedidos (el hash se craquea offline en horas si la contraseña es débil). El host se aísla solo si no hay autorización: combinado con implant, la rotación sin aislamiento es correr detrás del atacante.',
        command: 'Set-ADAccountPassword -Identity "svc_backup" -Reset'
      },
      {
        title: 'Remediar de fondo: que el RC4 no valga la pena',
        detail: 'gMSA para las cuentas de servicio nuevas (contraseñas automáticas de 256 bits), contraseñas de más de 25 caracteres para las SPN legacy, forzar AES con msDS-SupportedEncryptionTypes y retirar SPNs de cuentas que no los necesitan. El dominio donde roasting no paga es el que no se roastea.'
      }
    ],
    verification: 'Rotación confirmada de las cuentas solicitadas, 0 nuevas ráfagas de 4769 RC4 fuera de ventana autorizada, y el inventario de SPN con contraseñas vigentes o plan gMSA en marcha.',
    escalation: 'L2 / CSIRT (sin autorización de pentest: host a aislar y rotación inmediata; cuenta de servicio con acceso a BD/ERP craqueada confirmada = P1)',
    relatedTerms: ['Kerberoasting', 'Event ID 4769', 'gMSA (cuenta de servicio administrada de grupo)', 'Descubrimiento de cuentas privilegiadas', 'Dominio de AD'],
    relatedTickets: ['soc-005', 'soc-032']
  },
  {
    id: 'sockb-web-attack',
    title: 'Ataques web: escaneo, SQLi y el WAF como narrador (SPL)',
    category: 'SOC - Web / Aplicaciones',
    environment: 'Web',
    symptoms: 'El WAF reporta ráfagas de request bloqueadas (403) con payloads de SQLi (UNION SELECT, SLEEP, comentarios), el firewall registra barridos de puertos contra la DMZ o el análisis de latencia del API muestra tiempos exactos de SLEEP(): la cadena reconocimiento → explotación en vivo.',
    cause: 'Explotación de aplicación expuesta (T1190) precedida de reconocimiento activo (T1595). La inyección SQL entra por parámetros sin validar; la variante time-based (SLEEP/WAITFOR DELAY) no depende de ver el payload en el log: se delata en la LATENCIA constante de la respuesta, que el WAF en modo aprendizaje no bloquea.',
    steps: [
      {
        title: 'Cuantificar el ataque en el WAF (todo bloqueado no es todo seguro)',
        detail: 'El conteo por status y uri_path define el alcance: si TODO salió 403 no hubo explotación — pero UN solo 200/302 con payload cambia la historia de "bloqueado" a "comprometido". Verificar SIEMPRE el porcentaje de respuestas bloqueadas antes de relajarse.',
        command: 'index=main sourcetype=access_combined clientip="{{ATTACKER_IP}}" earliest=-24h | stats count by status, uri_path'
      },
      {
        title: 'Cazar la inyección time-based por la latencia',
        detail: 'El SLEEP() ejecutado en la BD no aparece como payload bloqueado: aparece como response_time anómalo y CONSTANTE (5.0-5.1 s exactos). El promedio y el máximo por endpoint del API dicen si el WAF en modo aprendizaje dejó pasar la consulta venenosa.',
        command: 'index=main sourcetype=access_combined uri_path="/api/v1/*" earliest=-24h | stats avg(response_time) as promedio, max(response_time) as maximo, count as request by uri_path, status'
      },
      {
        title: 'Cruzar el perímetro para dimensionar el reconocimiento',
        detail: 'La IP que hoy ataca el portal ayer barrió la DMZ: CommonSecurityLog muestra el escaneo (Deny masivo, puertos consecutivos) y si pasó ALGO (Allow). El expediente de campaña conecta esa IP con el resto de la semana: el reconocimiento es la primera escena, no un caso suelto.',
        command: 'CommonSecurityLog | where TimeGenerated > ago(24h) | where SourceIP == "{{ATTACKER_IP}}" | summarize intentos = count(), puertos = dcount(DestinationPort) by DeviceAction, bin(TimeGenerated, 1m) | order by intentos desc'
      },
      {
        title: 'Verificar la aplicación y el servidor web',
        detail: 'Si algo pasó: errores 5xx de la app, archivos nuevos en el webroot (webshell: .aspx/.php/.jsp escritos por procesos del servidor) y el log de la BD con queries anómalas (WAITFOR DELAY). Sin esta verificación el "bloqueado" es una esperanza, no un veredicto.',
        command: 'DeviceFileEvents | where DeviceName == "{{WEB_SERVER}}" | where Timestamp > ago(24h) | where FileName has_any (".aspx", ".php", ".jsp") | where FolderPath contains "wwwroot" | project Timestamp, FileName, FolderPath, SHA256, InitiatingProcessFileName'
      },
      {
        title: 'Contener y blindar el WAF',
        detail: 'Bloquear la IP en WAF y firewall, y pasar las reglas SQLi de aprendizaje a bloqueo para TODOS los paths (incluido el API). Las exclusiones y whitelists se documentan, se acotan a la IP del proveedor y CADUCAN: una lista blanca sin fecha de vencimiento es una puerta abierta con nombre.'
      },
      {
        title: 'Remediar la causa en el código y cerrar el ciclo',
        detail: 'La app sana con consultas parametrizadas y validación de entrada (el WAF es venda, no cura); con DBA se dimensiona qué podía leer la cuenta del API si hubo extracción. El caso cierra con la lección: el endpoint nuevo entra al monitoreo de latencia desde el día 1.'
      }
    ],
    verification: '0 request con payload tras el bloqueo, 0 respuestas 200 con latencia anómala en 24 h, reglas del WAF en modo bloqueo para todos los paths y el servidor web verificado sin archivos nuevos.',
    escalation: 'L2 / CSIRT (cualquier 200 con payload aceptado, SLEEP confirmado en la BD o webshell escrita = intrusión: P1 y forense de la app)',
    relatedTerms: ['MITRE ATT&CK', 'Cyber Kill Chain', 'Firewall', 'Threat hunting', 'Zero Trust'],
    relatedTickets: ['soc-011', 'soc-019', 'soc-039', 'soc-040', 'soc-044']
  },
  {
    id: 'sockb-backup-deletion',
    title: 'Borrado de logs y de backups: la preparación del golpe final',
    category: 'SOC - Respuesta a Incidentes',
    environment: 'Multi',
    symptoms: 'AzureActivity registra operaciones de DELETE contra contenedores de backup, un Windows borra su log de Seguridad (1102) y sus copias de sombra (vssadmin delete shadows), o el job nocturno de respaldo empieza a fallar justo antes de una ventana de actividad anómala.',
    cause: 'Inhibición de la recuperación (T1490 Inhibit System Recovery) y anti-forense (T1070.001 Clear Windows Event Logs): el atacante borra primero lo que permitiría a la empresa resistir y reconstruir. Ransomware o exfiltración con destrucción: el borrado previo ES el aviso de que viene algo grande.',
    steps: [
      {
        title: 'Confirmar qué se borró, cuándo y con qué identidad',
        detail: 'En Azure: los DELETE de AzureActivity con Caller y ActivityStatusValue (los rechazados con ImmutabilityPolicy muestran el control funcionando). En Windows: 1102/104 (log limpiado) + DeviceProcessEvents de vssadmin/wevtutil. La identidad ejecutora es la cabeza de la investigación.',
        command: 'AzureActivity | where TimeGenerated > ago(12h) | where OperationNameValue contains "delete" | project TimeGenerated, Caller, OperationNameValue, ResourceId, ActivityStatusValue | order by TimeGenerated asc'
      },
      {
        title: 'Verificar la capa de backup completa (el 3-2-1 real)',
        detail: 'Contenedores inmutables y con legal hold, el respaldo offsite, la última copia restaurable y el estado del job nocturno. La pregunta es SIEMPRE la misma: ¿qué nos queda para restaurar y de cuándo? Con inmutabilidad el borrado falla — pero solo cubre lo que cubre.'
      },
      {
        title: 'Contener la identidad y el host',
        detail: 'Revocar las sesiones/tokens de la identidad ejecutora, quitarle el acceso a la suscripción y aislar el host con sesiones no reconocidas (el 4624 tipo 10 previo con el SubjectUserName del 1102 es la sesión que hay que cortar). El 1102/104 con su SubjectUserName entrega la línea de tiempo del intruso.',
        command: 'SecurityEvent | where EventID in (1102, 104) | where TimeGenerated > ago(24h) | project TimeGenerated, Computer, SubjectUserName'
      },
      {
        title: 'Restaurar desde lo sobreviviente',
        detail: 'Soft delete del storage (retención configurable) o el último punto limpio del vault externo; en Windows, las copias de sombra que queden y el respaldo previo al borrado. Restaurar en entorno aislado y validar integridad ANTES de prometer tiempos al negocio. El prefacio del borrado también se ve en los procesos: vssadmin, wevtutil, wbadmin y bcdedit en minutos consecutivos.',
        command: 'DeviceProcessEvents | where DeviceName == "{{SERVER}}" | where Timestamp > ago(6h) | where FileName in ("vssadmin.exe", "wevtutil.exe", "wbadmin.exe", "bcdedit.exe") | project Timestamp, ProcessCommandLine, AccountName, InitiatingProcessFileName | order by Timestamp asc'
      },
      {
        title: 'Preservar la evidencia del borrado',
        detail: 'El borrado es evidencia del intento (T1490/T1070.001): exportar 1102/104, los AzureActivity y los DeviceProcessEvents ANTES de remediar, y revocar los tokens de la cuenta sin borrarla (el forense necesita la identidad y su rastro intactos para la atribución y el reporte).'
      },
      {
        title: 'Endurecer para que el próximo borrado también falle',
        detail: 'Inmutabilidad (WORM) + legal hold en TODOS los contenedores de backup (no solo el principal), alerta de DELETE sobre las cuentas de storage críticas, respaldo offsite inmutable (la regla 3-2-1 existe por esto) y revisión de quién puede borrar: la identidad de deploy no debería poder tocar backups JAMÁS.'
      }
    ],
    verification: 'Identidad ejecutora neutralizada sin accesos posteriores, respaldos verificados como restaurables (prueba de restauración real ejecutada) y contenedores de backup con inmutabilidad y alertas de DELETE activas.',
    escalation: 'CSIRT / CISO (preparación de ransomware o destrucción en curso = P1: contención total, valoración de negocio y plan de comunicación; el borrado de backups es el evento que define el incidente mayor)',
    relatedTerms: ['Backup inmutable', 'Regla 3-2-1', 'Contención / erradicación / recuperación', 'Incident Response (ciclo NIST)', 'Zero Trust'],
    relatedTickets: ['soc-020', 'soc-048', 'soc-050']
  },
  {
    id: 'sockb-forwarding-rule',
    title: 'Reglas de reenvío maliciosas: el buzón que ya no ve sus respuestas',
    category: 'SOC - Phishing / Email',
    environment: 'Email',
    symptoms: 'Un usuario reporta que "no le llegan" las respuestas de proveedores o clientes, o una revisión encuentra una regla de buzón que reenvía a una dirección externa y mueve el original a una carpeta poco revisada (RSS Feeds, Junk). Creada de madrugada por una sesión que el usuario no reconoce.',
    cause: 'Persistencia y recolección de correo (T1114.003 Email Forwarding Rule): tras comprometer la cuenta (phishing de credenciales o MFA fatigue aprobado por cansancio), el atacante crea la regla para leer la correspondencia SIN volver a entrar. Mover los originales a una carpeta ignorada evita que el usuario note la desaparición.',
    steps: [
      {
        title: 'Documentar la regla ANTES de tocarla',
        detail: 'Get-InboxRule con todas las propiedades exportadas a archivo: nombre disfrazado ("Organización automática"), condiciones selectivas por remitente, ForwardTo externo y MoveToFolder a carpeta ignorada. Es la evidencia central del caso: borrarla sin documentar destruye la investigación.',
        command: 'Get-InboxRule -Mailbox "{{USERNAME}}" | Format-List Name, Description, Enabled, RedirectTo, ForwardTo, MoveToFolder, DeleteMessage | Out-File .\\reglas-evidencia.txt'
      },
      {
        title: 'Fechar la creación y reconstruir el acceso inicial',
        detail: 'El log unificado de M365 trae el New-InboxRule con hora y ClientIP; esa hora apunta al sign-in exitoso previo en SigninLogs — con push MFA aprobado a las 2 a.m. es fatigue, con IP de hosting tras un clic es phishing. La regla es el síntoma; el acceso es la enfermedad.',
        command: 'Search-UnifiedAuditLog -StartDate (Get-Date).AddDays(-14) -EndDate (Get-Date) -UserIds "{{USERNAME}}@nexora.com.co" -Operations "New-InboxRule", "Set-InboxRule" -ResultSize 50 | Format-List CreationDate, Operations, UserIds, ClientIP, AuditData'
      },
      {
        title: 'Medir el daño (qué salió del buzón y desde cuándo)',
        detail: 'Entre la creación de la regla y hoy: qué remitentes y asuntos coinciden con las condiciones, qué fue reenviado a la dirección externa y si hay fraude en curso (cambios de cuenta bancaria pedidos "por" el usuario comprometido). Los proveedores afectados se alertan con verificación telefónica, nunca por el correo comprometido.'
      },
      {
        title: 'Contener: regla fuera, sesión fuera, credencial fuera',
        detail: 'Remove-InboxRule (con la evidencia ya exportada), revocación total de sesiones y reset de contraseña. Verificar SIEMPRE métodos MFA nuevos y grants OAuth de la cuenta: la regla es la persistencia visible, las otras son las invisibles.',
        command: 'Revoke-MgUserSignInSession -UserId "{{USERNAME}}@nexora.com.co"'
      },
      {
        title: 'Barrer el tenant por más reglas y reenvíos',
        detail: 'Una regla encontrada casi siempre trae hermanas: barrer los buzones con ForwardTo/RedirectTo externos y los reenvíos a nivel de mailbox. El barrido completo es la diferencia entre cerrar UN caso y cerrar LA campaña.',
        command: 'Get-Mailbox -ResultSize Unlimited | Where-Object { ($_.ForwardingSmtpAddress -ne $null) -or ($_.ForwardingAddress -ne $null) } | Select-Object UserPrincipalName, ForwardingSmtpAddress, ForwardingAddress'
      },
      {
        title: 'Prevenir con monitoreo permanente',
        detail: 'Alerta de New-InboxRule con destino externo (audit log), reporte semanal de reenvíos y reglas por buzón, y entrenar el "no me llegan respuestas" como señal de reporte: el usuario que reporta el síntoma chiquito evita el incidente grande.'
      }
    ],
    verification: 'Regla eliminada (con evidencia exportada), 0 reenvíos externos posteriores, 0 reglas ocultas en el barrido del tenant y la cuenta con sesión revocada y MFA verificado con su dueño.',
    escalation: 'L2 / CSIRT (fraude en curso sobre proveedores o correspondencia sensible reenviada — valoración de exposición y notificación; la cuenta origen comprometida puede ser pivote de BEC)',
    relatedTerms: ['Análisis de cabeceras de correo', 'Phishing', 'Revocación de sesiones y tokens', 'Cuentas con riesgo', 'Incident Response (ciclo NIST)'],
    relatedTickets: ['soc-012', 'soc-023']
  },
];

export const SOC_KB_BY_ID: Map<string, SocKbArticle> = new Map(
  SOC_KB_ARTICLES.map((a) => [a.id, a])
);
