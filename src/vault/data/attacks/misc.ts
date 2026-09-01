// attacks/misc.ts — dataset de ATAQUES: Social y Malware / C2 / Exfiltración.
//
// Parte del dataset de VaultNotes "Ataques" (100% offline — alimenta
// AttacksExplorerTool.tsx vía ./index.ts). Este archivo cubre el fraude a
// humanos (SE) y el software malicioso + canales de salida (MAL: malware,
// C2 y exfiltración).
//
// REGLA ANTI-DUPLICADO: las técnicas de persistencia (Run keys, WMI event
// subscriptions, tareas programadas, servicios, GPO, cuentas shadow admin,
// reglas de Outlook, LOLBins/fileless, rootkits/bootkits) y las de
// movimiento lateral (SMB/WinRM/PSExec, RDP hijack, túneles SSH, RMM)
// YA VIVEN en ../vulnerabilities.ts — NO se repiten aquí. Lo que sí vive
// aquí: el malware como familia operativa (ransomware, supply chain,
// infostealers, criptojacking, wipers, gusanos), el comportamiento C2
// (beaconing) y la exfiltración por canales legítimos.
//
// IDs: SE-001..SE-009 (Social), MAL-001..MAL-008 (Malware/C2/Exfil).
// No usar `export default`. Los sinónimos (piggybacking, whaling,
// quishing, CEO fraud…) van en `alias` de la entrada canónica.
// Las detecciones son ejemplos de partida: ajústalos a tu entorno.

import type { AttackInfo } from './types';

/* ============================ SOCIAL / INGENIERÍA SOCIAL ============================ */

export const SE_ATTACKS: AttackInfo[] = [
  {
    id: 'SE-001',
    nombre: 'Phishing / Spear Phishing / Whaling',
    alias: ['spear phishing', 'whaling', 'phishing dirigido', 'fraude de credenciales por correo'],
    categoria: 'Social',
    severidad: 'Critical',
    mitre_attack: ['T1566.001', 'T1566.002'],
    descripcion_tecnica: 'Correo que suplanta una marca o persona de confianza para robar credenciales (enlace a portal clonado) o ejecutar malware (adjunto). El spear phishing apunta a una persona concreta con contexto real (proyecto, jefe, horario — cosechado en OSINT); el whaling apunta al C-level con correos "de alta dirección": menos volumen, más investigación previa y pretexto financiero.',
    impacto_iam_soc: 'Sigue siendo el vector de entrada #1 de ransomware y tomas de cuenta. Para el SOC la métrica que importa no es el spam bloqueado sino el correo ENTREGADO que los usuarios reportan — el botón de reporte ES una detección.',
    como_funciona: [
      'Recon OSINT (LinkedIn, web corporativa, leaks previos) para elegir víctimas y pretexto; registro del dominio lookalike días antes (rn→m, v→w, acentos)',
      'Envío con urgencia: nómina, "MFA a punto de expirar", doc compartido, trámite fiscal — y clon visual 1:1 del portal de login',
      'Variante adjunto: .docm con macro, .lnk/PowerShell dentro de ISO/IMG (evita Mark-of-the-Web) o OneNote con script embebido',
      'El enlace lleva a un proxy AiTM (Evilginx, Modlishka) que hace relay del login REAL: captura credenciales, OTP y la cookie de sesión — el MFA cae con la sesión',
    ],
    deteccion: {
      kql: 'EmailEvents | where EmailDirection == "Inbound" and ThreatTypes == "" and DeliveryLocation in ("Inbox", "Junk") | take 10 // enriquecer: dominios whois < 30 días, lookalike de la marca, y clicks anómalos en EmailUrlInfo (IP/geo no habitual)',
      spl: 'index=email sourcetype=cisco:email | search "notificación" OR "password" OR "expira" | stats count by sender, subject | sort -count | head 20',
      sigma: 'mail_reported_but_not_detected (custom — el usuario reporta un correo que pasó los filtros)',
    },
    mitigacion: [
      'MFA resistente a phishing (FIDO2/passkeys) + token protection/session binding en el IdP — corta el replay de cookies del AiTM',
      'DMARC p=reject, banner de externos y detonación/sandbox de adjuntos antes de entrega',
      'Botón "reportar phishing" con SLA de respuesta de 15 min y simulacros medidos por TASA DE REPORTE (no por clics)',
      'Playbook ATO del correo entregado: revocar sesiones/refresh tokens de las víctimas y de los remitentes suplantados',
    ],
    referencias: [
      'https://attack.mitre.org/techniques/T1566/001/',
      'https://attack.mitre.org/techniques/T1566/002/',
      'https://www.ncsc.gov.uk/guidance/phishing',
    ],
  },
  {
    id: 'SE-002',
    nombre: 'Vishing',
    alias: ['voice phishing', 'fraude telefónico al helpdesk', 'helpdesk MFA reset fraud'],
    categoria: 'Social',
    severidad: 'High',
    mitre_attack: ['T1566.004'],
    descripcion_tecnica: 'Llamada telefónica suplantando a TI, a un proveedor o a un directivo para conseguir una acción: reset de MFA en el helpdesk (caso MGM 2023: se hicieron pasar por un empleado bloqueado y el service desk re-registró el factor), instalación de un RMM "del proveedor de antivirus" o aprobación de una operación. La IA generativa clona la voz con segundos de audio público y elimina las señales clásicas del fraude telefónico (acento, pausas).',
    impacto_iam_soc: 'Un reset de MFA por teléfono = toma de cuenta total aunque haya passkeys: el factor se re-registra en el dispositivo del atacante. "Reset de método de autenticación" debe tratarse como evento de alta sensibilidad, correlado con el ticket de helpdesk correspondiente.',
    como_funciona: [
      'OSINT del empleado (LinkedIn, HR leaked data) + datos internos filtrados para construir credibilidad: número de empleado, título, manager',
      'Llamada al helpdesk con la "emergencia": estoy de viaje, me he bloqueado, tengo la reunión con el board en 20 minutos',
      'El agente resetea el MFA y el atacante registra SU dispositivo como nuevo factor; a veces piden además instalar un RMM "para que soporte lo arregle"',
      'Deepfake de voz: pocos segundos de un directivo en un video público bastan para clonar el timbre; se usa en llamadas "del CFO" para aprobaciones urgentes',
    ],
    deteccion: {
      kql: 'AuditLogs | where OperationName contains_any ("reset", "register", "authentication method") | project TimeGenerated, OperationName, InitiatedBy, TargetResources | take 10 // correlación: reset con ticket de helpdesk asociado, IP/geo no vista y login en < 1h',
      spl: 'index=okta eventType IN ("user.mfa.factor.resetAll", "user.mfa.factor.activate") | table _time, actor.alternateId, eventType, debugContext.debugData',
    },
    mitigacion: [
      'Protocolo helpdesk con verificación fuera de banda: callback al número registrado o aprobación del manager antes de cualquier reset de factor',
      'Re-autenticación fuerte para re-registrar factores + notificación push al usuario ("se ha cambiado tu MFA — ¿has sido tú?")',
      'Simulacros de vishing al service desk por el red team interno — medir la tasa de agentes que ceden',
      'Alerta automática de la secuencia reset→login desde IP/geo nueva en menos de 1h (playbook ATO sin esperar al usuario)',
    ],
    referencias: [
      'https://attack.mitre.org/techniques/T1566/004/',
      'https://www.cisa.gov/news-events/cybersecurity-advisories',
    ],
  },
  {
    id: 'SE-003',
    nombre: 'Smishing',
    alias: ['SMS phishing', 'quishing (QR phishing)', 'fraude por SMS/WhatsApp'],
    categoria: 'Social',
    severidad: 'High',
    mitre_attack: ['T1566.003'],
    descripcion_tecnica: 'SMS/WhatsApp con enlaces maliciosos: aviso de paquetería ("tu paquete está retenido"), multa, bono de empresa o cambio de turno. La variante quishing usa códigos QR (en PDF adjunto, cartel o correo) para saltarse los filtros de URL: no hay link que escanear en el correo y el usuario abre la página desde el móvil PERSONAL, fuera del proxy, del EDR y de todo control corporativo.',
    impacto_iam_soc: 'Ataca el móvil personal que además recibe OTPs y correo corporativo (BYOD sin control). El SOC apenas tiene telemetría: la detección depende del reporte del empleado; con QR ni siquiera queda URL visible en los logs de correo.',
    como_funciona: [
      'SMS masivo con dominio corto o "paquetería" hacia el portal falso que pide 2 EUR de "gastos de aduana" (roba la tarjeta completa)',
      'Quishing: QR en un PDF adjunto de correo corporativo o en carteles físicos (parking, menú) — el navegador del móvil no pasa por el proxy de la empresa',
      'Variante corporativa: SMS de "IT: tu MFA expira hoy, regístralo aquí" con página que captura credenciales + OTP y lo reenvía al atacante en tiempo real (relay manual)',
      'Combinado con SIM swapping (en Vulnerabilidades): no roban el enlace, roban el número — los OTP les llegan directamente',
    ],
    deteccion: {
      kql: 'EmailUrlInfo | where UrlDomain endswith ".link" or UrlDomain endswith ".top" or UrlDomain endswith ".xyz" | take 20 // quishing: QR que apunta a shorteners/dominios raros; el smishing puro solo se ve con feed del operador/MDM o reporte del usuario',
      spl: 'index=proxy sourcetype=squid | regex url=".*\\.(link|top|xyz)(/|:|$).*" | stats count by src, url | where count > 2',
    },
    mitigacion: [
      'MDM/MAM en BYOD con browser protegido y canal de reporte rápido (un chat de Teams a seguridad, no un formulario)',
      'Formación específica: "el banco/IT/transportista nunca pide datos por SMS" + cómo reportar el número y el mensaje',
      'Eliminar SMS como factor de autenticación (SIM swap, SS7) — passkeys o authenticator con number matching',
      'En gateway de correo: detonar imágenes de QR de adjuntos y resolver los dominios destino antes de entregar',
    ],
    referencias: [
      'https://attack.mitre.org/techniques/T1566/003/',
      'https://www.ncsc.gov.uk/guidance/phishing',
    ],
  },
  {
    id: 'SE-004',
    nombre: 'Business Email Compromise (BEC)',
    alias: ['CEO fraud', 'fraude del CEO', 'vendor email compromise (VEC)', 'fraude de transferencia por correo'],
    categoria: 'Social',
    severidad: 'Critical',
    mitre_attack: [],
    descripcion_tecnica: 'Fraude financiero sin malware: el atacante compromete o suplanta una mailbox (proveedor, CFO, CEO) y se inserta en una conversación real de pagos. Variantes: CEO fraud (suplanta a dirección para ordenar una transferencia urgente y confidencial), fraude de nómina (cambio de cuenta del empleado) y vendor email compromise (la mailbox del proveedor factura con IBAN nuevo). Es fraude de identidad, no intrusión técnica — por eso MITRE ATT&CK Enterprise no lo codifica como técnica.',
    impacto_iam_soc: 'Pérdidas económicas directas de miles de millones anuales sin un solo artefacto técnico. La señal vive en el correo: tono de urgencia + secreto, cambio de IBAN y — el indicio forense #1 — reglas de forwarding/ocultación recién creadas para esconder los replies.',
    como_funciona: [
      'Acceso a la mailbox (phishing AiTM, infostealer, BEC-as-a-service en underground) o registro de dominio lookalike del proveedor',
      'Fase de lurk: semanas leyendo la conversación real de facturación para aprender nombres, importes, ciclos y tono',
      'El golpe: mail desde la mailbox REAL del CFO — "operación confidencial de adquisición, transfiere a esta cuenta intermedia" — o la factura del proveedor con el IBAN cambiado',
      'Ocultación: reglas de Outlook que mueven los replies del proveedor verdadero a carpeta oculta (las reglas maliciosas de Outlook viven en Vulnerabilidades) — la víctima solo ve la conversación falsa',
    ],
    deteccion: {
      kql: 'OfficeActivity | where Operation in~ ("New-InboxRule", "Set-Mailbox") | extend p = tostring(Parameters) | where p contains "Forward" or p contains "smtp" | take 20 // y correo de dirección/finanzas con "urgent", "confidencial", "IBAN", "cambio de cuenta"',
      spl: 'index=mail | search "IBAN" OR "transferencia urgente" OR "confidencial" OR "no lo comentes" | stats count by from, subj | sort -count',
    },
    mitigacion: [
      'Proceso de pago: verificación out-of-band de todo cambio de cuenta/IBAN con call-back al número CONTRACTUAL (nunca al del correo)',
      'Alertas de reglas de forwarding/ocultación en mailboxes de finanzas y dirección — el artefacto técnico más fiable del BEC',
      'DMARC p=reject, banner de externos, alertas de dominios lookalike recién registrados de la marca y de los proveedores',
      'Simulacros BEC específicos para el equipo de pagos y playbook de recuperación inmediata (banco, transfer recall, IC3 RAT)',
    ],
    referencias: [
      'https://www.fbi.gov/scams-and-safety/common-scams-and-crimes/business-email-compromise',
      'https://www.ic3.gov/',
    ],
  },
  {
    id: 'SE-005',
    nombre: 'Baiting (USB drop)',
    alias: ['USB drop attack', 'malicious USB', 'BadUSB físico'],
    categoria: 'Social',
    severidad: 'Medium',
    mitre_attack: ['T1200'],
    descripcion_tecnica: 'Ingeniería social con cebo físico: USB drives "perdidos" en el parking, el lobby o enviados por correo postal (FIN7 mandó miles de USBs/badges falsos por correo a empleados de empresas objetivo — el FBI emitió avisos en 2023). La curiosidad hace el resto: al conectar, el dispositivo es un BadUSB/HID que "teclea" el payload, o un storage con malware que el usuario ejecuta. Mapeo: T1200 (Hardware Additions) encaja mejor que T1091, que asume malware que YA se replica por medios extraíbles.',
    impacto_iam_soc: 'Salta el perímetro de red: entrada física sin que el atacante toque la infraestructura. Caso histórico: un USB en un parking de Oriente Medio infectó la red de DoD (Agent.btz, "Buckshot Yankee" 2008) — el peor breach militar de EE.UU. hasta entonces. Para el SOC: montaje de USB desconocido y, 30 segundos después, powershell/certutil con padre raro.',
    como_funciona: [
      'Preparación: drives con malware en el "documento confidencial", o BadUSB (Rubber Ducky/Flipper) que se presenta como teclado y teclea la descarga del loader',
      'Siembra: parking, lobby, ascensor, o correo postal en caja de regalo con carta del "departamento de TI" o promoción falsa',
      'Al conectar: autorun está muerto, pero el usuario mismo abre el "presupuesto.xls" o el HID ejecuta certutil -urlcache para stagear',
      'Caso real 2023: FIN7 enviando USBs y LilyGO badges falsos por correo físico a hogares de empleados (targeting del teletrabajo)',
    ],
    deteccion: {
      kql: 'DeviceEvents | where ActionType startswith "Usb" | project TimeGenerated, DeviceName, tostring(AdditionalFields) | take 10 // comparar VID/PID/serial contra histórico de dispositivos montados + procesos con padre desde unidad extraíble',
      spl: 'index=usb sourcetype=device:mount | search NOT serial IN (inventory) | table _time, host, serial, device | sort -_time',
    },
    mitigacion: [
      'GPO "Removable Storage Access": denegar escritura/lectura de USB storage salvo dispositivos cifrados y registrados (whitelist por hardware ID)',
      'Formación simple: "el USB que encuentras NO se conecta — entrégalo a TI" con proceso claro de entrega',
      'Alertar montaje de dispositivos nunca vistos + ejecución con ImagePath en letra extraíble en la misma ventana de tiempo',
      'Para BadUSB/HID: bloquear dispositivos HID desconocidos por GPO (denegar instalación de teclados nuevos) en estaciones sensibles',
    ],
    referencias: [
      'https://attack.mitre.org/techniques/T1200/',
      'https://attack.mitre.org/groups/G0046/',
    ],
  },
  {
    id: 'SE-006',
    nombre: 'Tailgating / Piggybacking',
    alias: ['colarse tras una persona autorizada', 'acceso físico por cortesía'],
    categoria: 'Social',
    severidad: 'Medium',
    mitre_attack: [],
    descripcion_tecnica: 'Acceso físico sin credencial: entrar tras una persona autorizada por una puerta con control (tailgating puro: no te ve; piggybacking: te sostiene la puerta por cortesía). No hay evento de logon físico que lo delate — el badge legítimo registró un IN y entraron dos personas. Del acceso físico a "un escritorio en el CPD" hay un paso: keylogger, BadUSB en un dock o simplemente una sesión desbloqueada.',
    impacto_iam_soc: 'Invalida todo el gasto en IAM: la MFA más fuerte no cuenta si la puerta del CPD se abre con una caja de donuts. La única "telemetría" es el sistema de control de acceso: un IN sin OUT previo (antipassback roto) en la misma puerta es la señal — casi nadie la correla.',
    como_funciona: [
      'Esperar en hora punta (9:00, salida a fumadores) o en el punto más débil: garaje, muelle de carga — seguir al repartidor cuenta como tailgating',
      'Manos ocupadas (cajas, portátil, café) y credencial genérica falsa en el lanyard: la víctima sostiene la puerta por educación',
      'Objetivos físicos: sala de servidores, escritorio del CFO (keylogger/dock malicioso), papelera de documentos, punto de red libre',
      'Salida: la misma técnica al revés, o exfiltrar con el equipo "prestado" de un puesto vacío',
    ],
    deteccion: {
      spl: 'index=physical sourcetype=badge:access | streamstats current=f last(action) as prev by door | where prev == "IN" and action == "IN" | table _time, door, card // IN tras IN sin OUT = posible tailgating; correlacionar con cámaras',
    },
    mitigacion: [
      'Mantraps/tornos con antipassback en zonas críticas (CPD, laboratorio, campus tier-0) — una credencial, una persona',
      'Formación anti-cortesía: retar con educación ("¿me enseñas tu tarjeta?") y normalizar el reto — la puerta se cierra solo',
      'Correlación badge-cámara con muestreo aleatorio y revisión de INs sin OUT (y de OUTs sin IN) por puerta',
      'Visitantes con credencial visualmente distinta, siempre escoltados, y código de bloqueo de puertas tras horario',
    ],
    referencias: [
      'https://en.wikipedia.org/wiki/Tailgating_(security)',
      'https://www.sans.org/security-awareness-training/',
    ],
  },
  {
    id: 'SE-007',
    nombre: 'Watering Hole',
    alias: ['watering hole attack', 'compromiso de sitio de referencia', 'drive-by dirigido'],
    categoria: 'Social',
    severidad: 'High',
    mitre_attack: ['T1189'],
    descripcion_tecnica: 'Selección inversa al phishing: en vez de buscar a la víctima, se compromete el sitio web que la víctima YA visita con confianza (portal del sector, foro técnico, asociación profesional) y se le sirve un exploit (drive-by) o contenido dirigido. Ideal para objetivos a los que el phishing no llega: personal de defensa, energía y disidencias — documentado contra portales de comunidades y del sector crítico durante años.',
    impacto_iam_soc: 'El dominio atacado es legítimo y de reputación alta: las blocklists no ayudan y el usuario estaba "donde debía". Para el SOC: exploits bloqueados por EDR concentrados en usuarios del mismo departamento/rol que visitan el mismo sitio — un patrón horizontal raro.',
    como_funciona: [
      'Identificar el sitio compartido por el grupo objetivo: telemetría del proxy (los sitios más visitados por los 50 usuarios que importan)',
      'Comprometer el sitio (CMS/plugin desactualizado, credenciales filtradas) e inyectar un framework de exploit o un script loader — a veces con cloaking por IP/geografía para tocar solo al objetivo',
      'El visitante con browser vulnerable recibe el stager (0-day o n-day de alta prevalencia) o descarga un documento "del propio sitio"',
      'El foothold hereda la confianza del dominio: la víctima no recuerda haber "clicado nada raro" porque no lo hizo',
    ],
    deteccion: {
      kql: 'DeviceUrlEvents | summarize visitors = dcount(DeviceName) by RemoteUrl, bin(TimeGenerated, 1d) | top 20 by visitors desc // revisar sitios poco visitados con pico de clics concentrado en un mismo departamento + alertas EDR "exploit mitigado"',
      spl: 'index=proxy | stats dc(user) as u, count as hits by url | where u >= 5 | sort - hits | head 20 // correlacionar con alertas EDR de exploit en esos usuarios',
    },
    mitigacion: [
      'Patching agresivo y auto-update forzado de browsers/plugins (la mayoría de drive-bys son n-days de Chrome/Edge)',
      'Browser isolation/CDR para roles de alto riesgo y sectores objetivo (defensa, energía, ONGs)',
      'EDR con exploit protection + ingesta de URLs para detectar el clúster "mismo sitio, mismo rol"',
      'Threat intel del sector (ISAC) y bloqueo proactivo de sitios comprometidos conocidos',
    ],
    referencias: [
      'https://attack.mitre.org/techniques/T1189/',
      'https://blog.google/threat-analysis-group/',
    ],
  },
  {
    id: 'SE-008',
    nombre: 'SEO Poisoning / Malvertising',
    alias: ['SEO poisoning', 'search poisoning', 'malvertising', 'falsos instaladores patrocinados'],
    categoria: 'Social',
    severidad: 'Medium',
    mitre_attack: ['T1566.002'],
    descripcion_tecnica: 'Posicionar páginas maliciosas en los primeros resultados de búsqueda de software popular ("7-zip download", "notepad++", "ffmpeg") o comprar banners que imitan al sitio oficial. La víctima busca el software legítimo, clica el primer resultado "correcto" y descarga un instalador infestado — el clon instala el software real y en paralelo el loader (para no levantar sospechas). Entrega típica 2023-2025: infostealers (Lumma, StealC, Rhadamanthys) y, en macOS, Atomic macOS AMOS.',
    impacto_iam_soc: 'Abusa de la confianza en el buscador y en el anuncio: el dominio es nuevo pero el "tráfico" lo legitima el propio Google. Para el SOC: descargas de binarios desde dominios no oficiales con hash fuera del inventario, y ejecución desde Downloads pocos minutos después de una búsqueda del propio usuario.',
    como_funciona: [
      'SEO farm: dominio nuevo con contenido clonado del sitio real del software, backlinks de granjas y cloaking — a los crawlers se les sirve contenido limpio',
      'Malvertising: compra de espacios en ad networks con creatividades que imitan al vendor; el "banner oficial" redirige a la copia',
      'El instalador bundlea software real + loader (a veces firmado con certificados de code signing comprados) — la instalación "funciona" y el usuario no sospecha',
      'Distribución de infostealers masiva: la búsqueda "descargar X" se convierte en vector de acceso inicial más rentable que el phishing masivo',
    ],
    deteccion: {
      kql: 'DeviceFileEvents | where FileExtension in~ (".exe", ".msi", ".dmg") and FolderPath contains "\\Downloads\\" and FileName has_any ("7z", "notepad", "vlc", "ffmpeg", "anydesk") | take 20 // validar hash y dominio de descarga contra el sitio oficial del vendor',
      spl: 'index=proxy sourcetype=squid | search url IN ("*7-zip*", "*notepad*", "*vlc*", "*ffmpeg*") | regex domain!="^(7-zip\\.org|notepad-plus-plus\\.org|videolan\\.org|ffmpeg\\.org)$" | stats count by domain',
    },
    mitigacion: [
      'WDAC/AppLocker con allowlist de firmas del vendor real — el clon firmado con otro certificado no ejecuta',
      'Formación: descargar SOLO del sitio oficial (teclear el dominio, no confiar en el primer resultado/Anuncio de Google)',
      'Bloqueo de dominios recién registrados en categorías "software downloads" y de shorteners en el proxy',
      'Alerta de "descarga → ejecución < 2 minutos desde Downloads" como señal de riesgo en endpoints de usuarios',
    ],
    referencias: [
      'https://attack.mitre.org/techniques/T1566/002/',
      'https://www.malwarebytes.com/blog',
    ],
  },
  {
    id: 'SE-009',
    nombre: 'Deepfakes (suplantación de voz y vídeo)',
    alias: ['deepfake de voz/vídeo', 'voice cloning', 'suplantación por IA generativa'],
    categoria: 'Social',
    severidad: 'High',
    mitre_attack: [],
    descripcion_tecnica: 'Suplantación de identidad con IA generativa: clonar la voz de un directivo con segundos de audio público, o inyectar un vídeo falso en una videollamada (caso Arup, Hong Kong 2024: una empleada de finanzas aprobó 15 transferencias por 25M USD tras una reunión donde TODO el "equipo directivo" era deepfake). Sirve para aprobar pagos, dar instrucciones de credenciales o reforzar el vishing. No mapea a técnica ATT&CK: es fraude de identidad, no intrusión técnica.',
    impacto_iam_soc: 'Rompe los controles de verificación humanos ("reconozco la voz de mi jefe") y la videollamada como prueba de identidad. Para el SOC el fraude se ve en los sistemas de PAGO (importe, patrón, canal), no en la red — el deepfake no deja huella técnica.',
    como_funciona: [
      'Recolectar audio/vídeo público del directivo (YouTube, earnings calls, webinars): bastan segundos para clonar la voz',
      'Clonar voz con herramientas de IA comercial o crear un avatar face-swap en tiempo real para la videollamada',
      'Pretexto de urgencia y secreto: "operación confidencial, no lo comentes con nadie" — mensaje de voz o reunión Teams/Zoom corta con el "CFO"',
      'La víctima ejecuta la transferencia (Arup: 15 transferencias a 5 cuentas, 25M USD) o entrega credenciales de banca corporativa',
    ],
    deteccion: {
      kql: 'PaymentApprovals | where Approver in ("<executives>") | where Amount > 100000 or HourOfDay between (20 .. 23) | take 20 // UEBA: aprobaciones fuera de patrón (importe, hora, "nunca había aprobado") — la red no ve nada',
      spl: 'index=erp sourcetype=payments | stats sum(amount) as total, dc(invoice) as n by approver, date_day | where total > 500000 // rompe el histórico del aprobador = alerta',
    },
    mitigacion: [
      'Verificación fuera de banda obligatoria para pagos sobre umbral: call-back al número conocido del aprobante (el deepfake no contesta su móvil)',
      'Cultura de "secreto = sospechoso": toda instrucción de "no lo comentes" escala por un segundo canal antes de ejecutar',
      'Protocolo de verificación en videollamadas de aprobación (challenge en vivo: mostrar credencial, mover la mano, pregunta cruzada)',
      'Formación específica a finanzas con casos reales (Arup 25M USD) — ya no es teoría, es táctica activa',
    ],
    referencias: [
      'https://www.cnn.com/2024/02/04/asia/deepfake-cfo-scam-hong-kong-intl-hnk/index.html',
      'https://www.ncsc.gov.uk/',
    ],
  },
];

/* ============================ MALWARE / C2 / EXFILTRACIÓN ============================ */
/* Nota: persistencia técnica (Run keys, WMI subs, tareas, servicios,
   Outlook rules, LOLBins, rootkits) y movimiento lateral viven en
   ../vulnerabilities.ts — este bloque cubre el MALWARE como fenómeno
   operativo, el comportamiento C2 y la salida de datos. */

export const MAL_ATTACKS: AttackInfo[] = [
  {
    id: 'MAL-001',
    nombre: 'Ransomware y doble extorsión',
    alias: ['double extortion', 'RaaS', 'LockBit', 'BlackCat/ALPHV', 'Akira', 'RansomHub'],
    categoria: 'Malware',
    severidad: 'Critical',
    mitre_attack: ['T1486', 'T1657'],
    descripcion_tecnica: 'Cifrado + robo + extorsión: primero exfiltran los datos (doble extorsión), luego cifran con AES/RSA híbrido y piden rescate amenazando con publicar el leak en su site. Industrializado como Ransomware-as-a-Service: affiliates alquilan el payload, el negotiator y el leak site (LockBit, BlackCat/ALPHV, Akira, Play, RansomHub 2023-2025) con paneles de víctima y soporte.',
    impacto_iam_soc: 'Paralización del negocio + fuga + extorsión reputacional. La clave para el SOC: semanas ANTES del cifrado hubo acceso — logons 4624 anómalos, servicios 7045, un RMM silencioso (el abuso de RMM vive en Vulnerabilidades) y exfiltración (MAL-008) fueron la ventana que se ignoró. El cifrado es el último minuto, no el ataque.',
    como_funciona: [
      'Acceso inicial (phishing, VPN sin MFA, infostealer, RDP expuesto) → reconocimiento con herramientas admin (AdFind, SharpHound)',
      'Escalada y movimiento lateral, robo de credenciales (LSASS), despliegue de RMM/AnyDesk y creación de cuentas doradas',
      'Exfiltración (rclone→cloud — MAL-008) y destrucción de backups: vssadmin delete shadows /all, wbadmin delete catalog, deshabilitar Defender (Add-MpPreference -DisableRealtimeMonitoring)',
      'Deploy masivo del payload por GPO/PsExec con notas de rescate y deadline en el leak site — extorsión T1657 incluye llamadas y DDoS a la víctima',
    ],
    deteccion: {
      kql: 'DeviceProcessEvents | where ProcessCommandLine has_any ("vssadmin delete shadows", "wbadmin delete catalog", "bcdedit /set recoveryenabled", "wevtutil cl", "Add-MpPreference") | take 20 // el footprint previo al cifrado: minutos de margen si se alerta bien',
      spl: 'index=win EventCode=4688 | search "vssadmin" OR "wevtutil" OR "bcdedit" OR "cipher /w" | table _time, host, NewProcessName, CommandLine',
      win_event_ids: [104, 1102],
    },
    mitigacion: [
      'Backups inmutables/offline (3-2-1-1-0) con pruebas REALES de restauración — el único backstop que paga cuando todo lo demás falló',
      'MFA resistente a phishing en VPN/RDP/emails y parcheo inmediato de edge devices explotados (Ivanti, Fortinet, F5)',
      'EDR con tamper protection + alerta crítica de borrado de shadows/limpieza de logs y containment automático por host',
      'Segmentación y least privilege para reducir blast radius; plan de IR con decisión de pago/no-pago tomada ANTES del incidente',
    ],
    referencias: [
      'https://attack.mitre.org/techniques/T1486/',
      'https://attack.mitre.org/techniques/T1657/',
      'https://www.cisa.gov/stopransomware',
    ],
  },
  {
    id: 'MAL-002',
    nombre: 'Ataque a la cadena de suministro (supply chain)',
    alias: ['supply chain attack', 'dependency confusion', 'typosquatting de paquetes', 'software update poisoning'],
    categoria: 'Malware',
    severidad: 'Critical',
    mitre_attack: ['T1195', 'T1195.001', 'T1195.002'],
    descripcion_tecnica: 'Comprometer una pieza de la cadena de confianza del software de la víctima: el build del vendor (SolarWinds 2020: la backdoor SUNBURST firmada se distribuyó por el update legítimo a ~18.000 clientes), las dependencias (dependency confusion: publicar un paquete con el nombre interno de la víctima para que el build lo baje del registry público — validado por Alex Birsan contra Microsoft/Apple), o typosquatting de paquetes reales (requestss). Y la variante social: la toma del propio maintainer (xz utils 2024).',
    impacto_iam_soc: 'Acceso simultáneo a miles de víctimas con UN solo compromiso upstream: el software malicioso llega firmado, del canal oficial, ya dentro del perímetro. La detección no es de firma sino de comportamiento: binario firmado con actividad anómala (SUNBURST dormía 12-14 días y luego beacon DNS a avsvmcloud.com).',
    como_funciona: [
      'SolarWinds: comprometen el build de Orion → la DLL firmada SUNBURST llega por el update legítimo; beacon tras el período de gracia para mezclarse con despliegues masivos',
      'Dependency confusion: los nombres de paquetes internos no publicados en npm/PyPI se registran por el atacante con versión superior — el gestor de dependencias prefiere la pública',
      'Typosquatting/forks maliciosos: requestss, python-requsts, o PRs a proyectos OSS con tokens robados (xz utils: años de ingeniería social al maintainer)',
      'El payload se ejecuta en CI/CD o en runtime con los privilegios de la app — a menudo altos: el pipeline con sus secrets y cloud creds (el poisoning de CI/CD vive en Vulnerabilidades)',
    ],
    deteccion: {
      kql: 'DeviceNetworkEvents | where RemoteUrl has "avsvmcloud.com" | take 10 // genérico: SBOM diff (artefactos que cambian sin commit), hashes de build vs reproducible builds, y binarios firmados válidos generando tráfico DNS raro',
      spl: 'index=net | search "avsvmcloud.com" | stats count by host, src | sort -count',
    },
    mitigacion: [
      'Reproducible builds + firmar artefactos con provenance (SLSA, sigstore) y verificar la cadena COMPLETA, no solo el binario final',
      'Registrar los namespaces internos en los registries públicos (scope privado de npm, placeholder en PyPI) — mata el dependency confusion',
      'Lockfiles con hashes fijados (npm ci, pip con --require-hashes) y SCA continua en CI con alerta de versión nueva de dependencia',
      'Proteger el build: branch protection, revisión humana de forks/nuevos maintainers, y secrets del pipeline aislados por proyecto',
    ],
    referencias: [
      'https://attack.mitre.org/techniques/T1195/',
      'https://attack.mitre.org/campaigns/C0024/',
      'https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610',
    ],
  },
  {
    id: 'MAL-003',
    nombre: 'Infostealers',
    alias: ['stealer', 'RedLine', 'Lumma/LummaC2', 'StealC', 'Vidar', 'logs de infostealer'],
    categoria: 'Malware',
    severidad: 'Critical',
    mitre_attack: ['T1539', 'T1555.003'],
    descripcion_tecnica: 'Malware dedicado a robar TODO lo que guardan el navegador y el sistema: cookies de sesión, tokens, passwords guardadas, autofill con tarjetas y wallets de cripto — de Chrome/Edge/Firefox y apps desktop (Telegram, Discord). RedLine (desarticulado en 2023), Lumma/LummaC2, StealC o Vidar operan como Malware-as-a-Service y venden los "logs" en markets tipo Russian Market. El robo de credenciales en vivo (keylogging) y el stuffing con passwords filtradas viven en otras entradas: aquí el botín es el ALMACÉN del navegador.',
    impacto_iam_soc: 'Vector #1 de acceso inicial 2023-2025: roban la COOKIE DE SESIÓN, no la contraseña — el login del atacante es "válido" y el MFA ni se entera (session replay con fingerprint clonado). Para el SOC: logins desde IP/fingerprint nuevos con la cookie correcta y nada más anómalo.',
    como_funciona: [
      'Distribución: instaladores falsos (SEO poisoning — SE-008, cracking tools, juegos piratas), malvertising o como segunda etapa de otro malware',
      'Robo con permisos de usuario: descifra DPAPI del perfil y lee Login Data (SQLite de Chromium), Local State (cookies cifradas) y cookies.sqlite de Firefox',
      'Completa el log: system info, lista de AV, screenshot, wallets, tokens de Telegram/Discord Desktop — todo empaquetado por origen',
      'El comprador del log hace replay de cookies contra el SSO corporativo con un browser del fingerprint clonado (el credential stuffing vive en Vulnerabilidades)',
    ],
    deteccion: {
      kql: 'DeviceFileEvents | where FileName in~ ("Login Data", "Local State", "cookies.sqlite") | where InitiatingProcessFileName !in~ ("chrome.exe", "msedge.exe", "firefox.exe", "msedgewebview2.exe") | take 20 // proceso ajeno al browser leyendo su almacén de credenciales',
      spl: 'index=win EventCode=4663 | search "Login Data" OR "Local State" OR "cookies.sqlite" | stats count by host, ProcessName | sort -count',
      sigma: 'proc_access_browser_credentials (custom)',
    },
    mitigacion: [
      'Cookies de sesión cortas + token protection / session binding y Continuous Access Evaluation: el replay caduca en minutos',
      'Conditional Access: dispositivo compliant o registrado para apps sensibles — el replay desde un equipo no gestionado no pasa',
      'Vigilar credenciales corporativas en feeds de infostealer logs (dark web monitoring) y reset PROACTIVO de sesión al aparecer',
      'WDAC/AppLocker bloqueando ejecución desde %Downloads% y formación anti-cracking/instaladores no oficiales',
    ],
    referencias: [
      'https://attack.mitre.org/techniques/T1539/',
      'https://attack.mitre.org/techniques/T1555/003/',
      'https://www.cisa.gov/sites/default/files/publications/aa23-325a-joint-csa-idi-infostealers.pdf',
    ],
  },
  {
    id: 'MAL-004',
    nombre: 'Criptojacking',
    alias: ['criptominer', 'XMRig', 'minería ilegal', 'cryptojacking'],
    categoria: 'Malware',
    severidad: 'Medium',
    mitre_attack: ['T1496'],
    descripcion_tecnica: 'Uso no autorizado de CPU/GPU de la víctima para minar cripto (casi siempre Monero — privacidad y CPU-friendly). Cargas: miners (XMRig, el open source retocado), scripts en webs comprometidas, y sobre todo infraestructura cloud: contenedores Kubernetes con imágenes maliciosas o pods mineros desplegados con creds de nube robadas (TeamTNT y clones "cloud worms" escalando entre tenants).',
    impacto_iam_soc: 'No cifra ni destruye: ROBA compute y dinero en facturas cloud (ejércitos de VMs cuestan miles por día), degrada el servicio y suele convivir con más malware. Detección: CPU sostenida al máximo + pools de minado (stratum+tcp, puertos 3333/14444) + lanzamiento anómalo de VMs.',
    como_funciona: [
      'Entrada: RCE en servicio expuesto (Log4Shell fue una mina de oro), creds cloud filtradas en repos, o imagen de contenedor typosquatted en Docker Hub',
      'Descarga del miner (XMRig compilado o fork con el wallet del atacante) y configuración del pool; en k8s: DaemonSet o Job efímero que se recrea',
      'Ocultación: renombrar el proceso a algo del sistema (kworker), limitar CPU para no delatarse (throttling) y persistencia con cron/systemd timers (la persistencia técnica vive en Vulnerabilidades)',
      'Con creds de nube válidas: escalar a otras suscripciones lanzando VMs en regiones baratas — el "worm" cloud moderno (los gusanos clásicos: MAL-006)',
    ],
    deteccion: {
      kql: 'DeviceProcessEvents | where ProcessCommandLine has_any ("stratum+tcp", "xmrig", "--donate-level") or FileName in~ ("xmrig.exe", "minerd", "kworkerds") | take 10 // y alerta de CPU > 90% sostenido 15 min en servidores productivos',
      spl: 'index=net | search "stratum+tcp" OR dest_port IN (3333, 5555, 14444) | stats count, sum(bytes) by src, dest | sort -count',
    },
    mitigacion: [
      'Cloud/k8s: bloquear acceso a metadata desde pods (IMDSv2), no creds de nodo a contenedores, y lockdown de image sources a registries aprobados',
      'Alertas de coste/anomalía de recursos (presupuestos por suscripción, CloudTrail: lanzamientos de instancias fuera de patrón)',
      'Bloquear pools y el protocolo stratum en egress; alertar picos de CPU sostenidos en endpoints productivos',
      'Parchear la RCE que permitió entrar: la minería es el síntoma — tratarla como incidente, no como limpieza de proceso',
    ],
    referencias: [
      'https://attack.mitre.org/techniques/T1496/',
      'https://attack.mitre.org/groups/G0139/',
    ],
  },
  {
    id: 'MAL-005',
    nombre: 'Wipers (destrucción de datos)',
    alias: ['wiper', 'data destruction', 'NotPetya', 'Shamoon', 'Hermetic Wiper'],
    categoria: 'Malware',
    severidad: 'Critical',
    mitre_attack: ['T1485'],
    descripcion_tecnica: 'Malware cuyo objetivo es DESTRUIR, no cobrar: sobrescribe discos, MBR o el Active Directory completo. NotPetya (2017, ~10.000 M USD de daños globales) iba disfrazado de ransomware pero era matemáticamente irrecuperable — sabotaje contra Ucrania distribuido por el update del software contable M.E.Doc; Shamoon (Aramco 2012: 30.000 estaciones borradas con una credencial admin). Hoy: Hermetic y wipers de apertura de conflicto (2022-), y distracción dentro de intrusiones ransomware.',
    impacto_iam_soc: 'Pérdida TOTAL e irreversible: no hay llave de rescate que negociar. Si borra AD (objetos de dominio masivos), la recuperación es reconstrucción de semanas. Además destruye la evidencia forense y el propio sistema de respuesta — el SOC debe poder contener por segmentos en minutos.',
    como_funciona: [
      'Entrada como ransomware: supply chain (NotPetya via M.E.Doc), phishing o credenciales robadas — a menudo dirigido (sabotaje estatal)',
      'Wiper de disco/MBR: sobrescribe con datos aleatorios y fuerza reboot — la máquina no vuelve a arrancar (NotPetya también robaba creds y se propagó P2P con EternalBlue + Mimikatz-style)',
      'Wiper lógico de AD: borrado masivo de usuarios/grupos/GPOs por LDAP con una cuenta con privilegios — el dominio deja de existir funcionalmente',
      'Uso táctico: disparar el wiper como DISTRACCIÓN durante una intrusión (todo el SOC mirando el incendio) o como sello final al retirarse',
    ],
    deteccion: {
      kql: 'DeviceProcessEvents | where ProcessCommandLine has_any ("vssadmin delete shadows", "cipher /w:", "sdelete") | take 10 // y correlación: millones de DeviceFileEvents de borrado/renombrado por un proceso en minutos; LDAP: 5136/4663 en ráfaga sobre el naming context',
      spl: 'index=edr sourcetype=file | stats dc(path) as n by host, process | where n > 10000 | sort -n // picos de borrado/renombrado masivo',
    },
    mitigacion: [
      'Backups inmutables/offline — como en ransomware pero SIN opción de negociación: es el único plan real',
      'Contención por segmentos automatizada (poder desconectar VLANs/DCs enteros en minutos) y "break-glass" de infraestructura de respuesta fuera del dominio',
      'Alertas críticas de patrones destructivos: shadow copies borradas, cipher /w, borrados LDAP masivos — respuesta en minutos, no tickets',
      'Contexto de riesgo: sectores/geografía en conflicto endurecidos primero (los wipers no son oportunistas, son dirigidos)',
    ],
    referencias: [
      'https://attack.mitre.org/techniques/T1485/',
      'https://www.wired.com/story/notpetya-cyberattack-ukraine-russia-code-crash-the-world/',
    ],
  },
  {
    id: 'MAL-006',
    nombre: 'Gusanos (propagación autónoma)',
    alias: ['worm', 'self-propagating malware', 'EternalBlue worm', 'WannaCry spread', 'Morris worm'],
    categoria: 'Malware',
    severidad: 'High',
    mitre_attack: ['T1030', 'T1021'],
    descripcion_tecnica: 'Malware que se PROPAGA SOLO: cada host infectado escanea, explota y contagia a los siguientes sin interacción humana ni C2 obligatorio. Historia viva: Morris (1988, ~10% de la internet de entonces), Code Red/Nimda (2001), Conficker (2008-9, aún latente en OT), y el capítulo moderno: WannaCry y NotPetya cruzaron el mundo en horas SOLO por EternalBlue (SMB) + mimikatz-style credential harvesting — el ransomware era el payload, el gusano el transporte. La variante cloud: "worms" que escalan entre tenants/suscripciones con creds robadas (TeamTNT, operate con contenedores).',
    impacto_iam_soc: 'La diferencia entre "un host comprometido" y "la empresa entera en 4 horas" (WannaCry: NHS, 200.000 hosts, 150 países — sin C2, pura infección en cadena). El patrón SOCAP: la señal es la PROPAGACIÓN — miles de conexiones SMB/445 o autenticaciones nuevas desde hosts internos que nunca se hablaron, en ventana de minutos. Un brote se contiene cortando segmentos, no limpiando hosts.',
    como_funciona: [
      'Entrada en un host (phishing, drive-by, USB — Conficker) y carga del vector de spread: exploit de red (EternalBlue/MS17-010) o credenciales reutilizadas',
      'Scan interno agresivo: el host infectado barre rangos enteros (445/139, 3389, 22, 1433) y explota lo que responde vulnerable',
      'Copiar + ejecutar en el siguiente host (a menudo via sched tasks/svc WMI — persistencia en Vulnerabilidades); el ciclo se repite sin humano',
      'Payload final en cada nodo: ransomware (WannaCry), wiper (NotPetya), cryptominer o solo respaldo para el siguiente paso',
    ],
    deteccion: {
      kql: 'DeviceNetworkEvents | where RemotePort in (445, 139, 3389, 22) | summarize targets=dcount(RemoteIP), conns=count() by DeviceName, bin(TimeGenerated, 5m) | where targets > 50 and conns > 200 | take 20 // host interno barriendo la red = gusano activo; correlar con 4624 en cascada',
      spl: 'index=net | stats dc(dest) as targets, count by src, bin(_time, 5m) | where targets > 50 | sort -_time | head 20 // seguido de: pico de EventCode=4624 tipo 3 desde el mismo src',
      sigma: 'net_worm_scan_propagation (custom)',
      win_event_ids: [4624, 7045],
    },
    mitigacion: [
      'Matar el vector base: parcheo de protocolos internos (SMB/RDP) y segmentación que frene el scan — el gusano solo viaja donde llega el protocolo',
      'Monitor de propagación: alerta de host interno con dcount(destinos) anómalo en 5 min (no es comportamiento de usuario ni de servidor) + 4624 en cascada',
      'Respuesta de contención agresiva: aislamiento automático de hosts (EDR) y capacidad REAL de cortar VLANs — contra un gusano, cada minuto son miles de hosts',
      'Egress/segmentación cloud: los "cloud worms" escalan con creds — sin llaves de larga vida y con SCPs, la propagación entre tenants muere',
    ],
    referencias: [
      'https://attack.mitre.org/techniques/T1030/',
      'https://www.ncsc.gov.uk/information/wannacry-ransomware-incident', 'https://en.wikipedia.org/wiki/Morris_worm',
    ],
  },
  {
    id: 'MAL-007',
    nombre: 'Beaconing C2 (Cobalt Strike / Sliver)',
    alias: ['beaconing', 'C2 check-in', 'malleable C2', 'Sliver / Mythic / Havoc'],
    categoria: 'Malware',
    severidad: 'Critical',
    mitre_attack: ['T1071.001'],
    descripcion_tecnica: 'El canal de vida del implant: check-ins HTTPS periódicos al teamserver con sleep/jitter configurables y perfiles malleable (Cobalt Strike) que disfrazan el tráfico como una web real — URIs, headers y user-agent de un SaaS conocido. Sliver, Mythic o Havoc siguen el mismo concepto. La infraestructura delante (redirectors, dominios fast-flux, proxies residenciales) hace que bloquear una IP no sirva de nada.',
    impacto_iam_soc: 'Sin C2 no hay post-explotación: localizarlo es prioridad #1 del SOC. La firma no existe; la señal es la regularidad del intervalo: mismo dominio, mismo delta (±jitter), 24/7, desde uno o pocos hosts, con volúmenes mínimos por check-in. (El C2 sobre DNS/DoH — túnel por el puerto 53 — vive en Vulnerabilidades).',
    como_funciona: [
      'El beacon duerme sleep segundos (p. ej. 60s) con jitter ±20% y hace GET/POST al teamserver o al redirector (nginx/CDN) que hay delante',
      'El malleable profile transforma la metadata: cookies custom, URI /api/v2/get, headers de jquery.com — el tráfico "parece" una web legítima en el proxy',
      'Infra: dominios fast-flux o pools residenciales rotando por reputación; redirectores desechables entre el beacon y el teamserver real',
      'Modo dormant: sleep de horas tras lograr el objetivo — el beacon casi desaparece del tráfico y solo despierta para tareas',
    ],
    deteccion: {
      kql: 'DeviceNetworkEvents | where RemotePort in (443, 8443) | summarize cnt=count(), hosts=dcount(DeviceName) by RemoteUrl, bin(TimeGenerated, 1h) | where cnt > 15 and hosts < 4 | take 20 // analizar la desviación del intervalo (delta_t) por URL: jitter bajo = beacon',
      spl: 'index=proxy | streamstats current=f delta(_time) as dt by url | stats avg(dt) as media, stdev(dt) as jitter by url | where media < 3600 and jitter < 60 // RITA (activecm) automatiza exactamente esto',
      sigma: 'net_conn_periodic_beaconing (custom)',
    },
    mitigacion: [
      'Egress allowlist: endpoints corporativos solo hacia dominios categorizados — corta el C2 por defecto, no cuando ya es incidente',
      'Análisis de periodicidad sobre proxy/Zscaler (RITA o equivalente) + alerta de "volumen bajo persistente" que los umbrales por-conteo ignoran',
      'TLS inspection + fingerprinting JA3/JA4 para clientes no estándar (Python/Go del implant contra chrome real)',
      'En respuesta: bloquear el dominio no basta — hay que cazar el proceso dormido en el host (timeline EDR, tareas programadas y persistencias asociadas)',
    ],
    referencias: [
      'https://attack.mitre.org/techniques/T1071/001/',
      'https://attack.mitre.org/software/S0154/',
      'https://github.com/activecm/rita',
    ],
  },
  {
    id: 'MAL-008',
    nombre: 'Exfiltración por canales legítimos (cloud storage / correo)',
    alias: ['exfiltración a cloud', 'rclone', 'MEGA/Dropbox/Telegram', 'exfil por canales permitidos'],
    categoria: 'Malware',
    severidad: 'High',
    mitre_attack: ['T1567.002'],
    descripcion_tecnica: 'Sacar los datos por servicios que el proxy ya permite: rclone contra MEGA/Dropbox/S3 (la navaja suiza del playbook de ransomware: multihilo, reanudable, logs amables), bots de Telegram (api.telegram.org/sendDocument), OneDrive/Drive del propio tenant o simplemente correos con adjuntos hacia webmails personales. Al DLP le cuesta distinguirlo del uso legítimo.',
    impacto_iam_soc: 'Es el primer golpe de la doble extorsión: los datos ya están fuera ANTES del cifrado. Para el SOC: user-agent rclone/vX en el proxy, pico de upload sostenido a un solo dominio cloud, transferencias SMB masivas previas de stageo (5140/5145) o un bot de Telegram que nadie registró.',
    como_funciona: [
      'rclone config con backend mega/dropbox + rclone copy "C:\\Shares\\Finanzas" remote:fin -P — el estándar del playbook Conti y sucesores',
      'Telegram: POST a api.telegram.org/bot<token>/sendDocument con el zip — se camufla como tráfico de mensajería normal',
      'Stageo previo por SMB: movimiento de terabytes hacia un share poco usado antes de la subida (transferencias SMB grandes, EID 5140/5145)',
      'Variante low&slow: adjuntos desde el Outlook de la víctima a webmails personales + regla de forwarding que oculta los enviados',
    ],
    deteccion: {
      kql: 'DeviceProcessEvents | where ProcessCommandLine has "rclone" or FileName in~ ("rclone.exe", "MEGAsync.exe") | take 10 // volumen: alertar por delta de bytes subidos por host/destino en el proxy; DeviceNetworkEvents con RemoteUrl has_any ("mega.nz", "api.telegram.org")',
      spl: 'index=net sourcetype=flow | stats sum(bytes) as total by src, dest | where total > 1000000000 | sort - total // > 1 GB acumulado a un mismo destino = investigar',
      win_event_ids: [5140],
    },
    mitigacion: [
      'Allowlist estricta de storage clouds: los no usados por la empresa (mega.nz, medios de transferencia) no pasan por el proxy',
      'Bloquear api.telegram.org salvo bots registrados; alertar el user-agent "rclone/" aunque el destino esté permitido',
      'DLP por UMBRAL de volumen (GB/día por host-destino), no solo por contenido — la fuga masiva es siempre volumétrica',
      'Backups cifrados + least privilege en shares: reduce el premio y hace la exfiltración lenta y visible',
    ],
    referencias: [
      'https://attack.mitre.org/techniques/T1567/002/',
      'https://www.cisa.gov/stopransomware',
    ],
  },
];
