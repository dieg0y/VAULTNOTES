/**
 * roadmapSocData — ROADMAP: SOC ANALYST L1 / BLUE TEAM → DETECTION ENGINEER.
 *
 * Capa de SEGURIDAD DEFENSIVA: prepara para un puesto de SOC Analyst L1 /
 * Blue Team (Windows, redes, SIEM, triage, EDR, phishing, evidencia y
 * respuesta a incidentes) y allana la transición hacia Threat Hunting y
 * Detection Engineering (MITRE ATT&CK, Sigma, SOAR y detección as code).
 *
 * Estructura idéntica a los roadmaps IAM, HelpDesk y SysAdmin (reutiliza
 * RoadmapTierDef / RoadmapPhaseDef / RoadmapItemDef de roadmapData.ts):
 * 3 tiers + proyecto final (la "Semana de SOC Simulado" — 8 casos guiados
 * por los runbooks SOC del vault, RB-SOC-*). El checklist (estado done)
 * persiste en la tabla Dexie `roadmapSocItems` (ids 'rmsoc-*'); este
 * archivo es la FUENTE DE VERDAD del CONTENIDO. El seed añade filas para
 * los ids que falten — jamás resetea el progreso del usuario.
 */

import { type RoadmapTierDef } from './roadmapData';

export const ROADMAP_SOC_HEADER = {
  title: 'Roadmap: SOC Analyst L1 / Blue Team → Detection Engineer',
  specialization: 'Especialización de Detección y Respuesta: SIEM · Windows · Red · MITRE ATT&CK · IR',
  edge: 'Puente de Transición: triage L1 → threat hunting → detection engineering',
};

/** Nota de criterio de dominio (misma filosofía que los otros roadmaps). */
export const ROADMAP_SOC_MASTERY_NOTE =
  'Para considerar una competencia dominada, debes poder ejecutarla ante una alerta real (o simulada), ' +
  'explicar el porqué técnico, mapear la técnica a MITRE ATT&CK y documentar el caso para que otro analista ' +
  'o un auditor pueda entenderlo sin preguntarte nada.';

export const ROADMAP_SOC_TIERS: RoadmapTierDef[] = [
  {
    id: 'rmsoc-t1',
    title: 'TIER 1 — FOUNDATION SOC',
    subtitle:
      'La base del analista: Windows y redes como fuente de evidencia, logs fluyendo en un SIEM, identidad en Entra y los reflejos del primer puesto. Sin esta base el triage es adivinanza con plantilla.',
    phases: [
      {
        id: 'rmsoc-f1',
        number: 1,
        title: 'Windows para SOC',
        note: 'El 80% de tu jornada L1 es Windows: Event Viewer, procesos y servicios. Aprende a leer la fuente antes de pedirle a una herramienta que la lea por ti.',
        items: [
          {
            id: 'rmsoc-f1-1',
            label: 'Conceptos Clave',
            text: 'Windows como fuente de evidencia: Event Viewer, canales Security/System/Application, niveles (Critical, Error, Warning, Information, Audit Success/Failure) y proveedores. Anatomía del evento: EventID, TimeCreated, Account, LogonType, ProcessName y ObjectName; abre la pestaña XML, el resumen de la consola esconde media evidencia.',
          },
          {
            id: 'rmsoc-f1-2',
            label: 'Conceptos Clave',
            text: 'Procesos y servicios normales del sistema: lsass.exe, services.exe, svchost.exe (una instancia por servicio), explorer.exe y qué hace cada uno. La detección empieza por conocer la línea base: el analista que no sabe qué es NORMAL en un Windows sano jamás verá la anomalía.',
          },
          {
            id: 'rmsoc-f1-3',
            label: 'Práctica',
            text: 'Extracción con PowerShell: Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4625} y wevtutil filtrando por EventID y rango de fechas, exportando a CSV o .evtx ANTES de analizar. Inventa también el inventario: lista de procesos y servicios de una VM del lab con su propósito declarado.',
          },
          {
            id: 'rmsoc-f1-4',
            label: 'Evidencia (Exit Criteria)',
            text: 'Bitácora Windows en VaultNotes: 10 eventos de distinto tipo exportados, cada campo explicado con tus palabras y el comando exacto que extrajo cada uno. Con esto demuestras que lees la fuente, no que copias conclusiones.',
          },
        ],
      },
      {
        id: 'rmsoc-f2',
        number: 2,
        title: 'Redes para SOC',
        note: 'No eres network admin, pero cada alerta tiene una IP y un puerto: entender quién habla con quién separa un veredicto de un "parece sospechoso".',
        items: [
          {
            id: 'rmsoc-f2-1',
            label: 'Conceptos Clave',
            text: 'TCP/IP para detectar: handshake, puertos y protocolos de tu día a día (53 DNS, 67-68 DHCP, 80/443 web, 445 SMB, 3389 RDP), con ss -tulpn y netstat -ano para ver quién escucha y Get-NetTCPConnection -State Established para ver quién está conectado y desde qué proceso.',
          },
          {
            id: 'rmsoc-f2-2',
            label: 'Conceptos Clave',
            text: 'DNS y DHCP como evidencia: resolución recursiva, TTL y caché (ipconfig /displaydns, Resolve-DnsName), leases DORA y reservas. Un equipo resolviendo dominios raros hacia IP externas a las 3 AM es una historia que el DNS te cuenta gratis: aprende a escucharla.',
          },
          {
            id: 'rmsoc-f2-3',
            label: 'Práctica',
            text: 'Wireshark y tcpdump: captura en tu propia red, filtra por host y puerto, sigue un stream TCP y distingue tráfico de navegador de un beacon C2 (conexiones cortas y periódicas al mismo destino, casi siempre al mismo intervalo). Ese patrón te acompañará toda la carrera.',
          },
          {
            id: 'rmsoc-f2-4',
            label: 'Evidencia (Exit Criteria)',
            text: 'Mapa de "quién habla con quién" de un equipo del lab: todas las conexiones con su proceso dueño, destino y propósito declarado por ti. Esa tabla de lo normal es la que te permitirá señalar lo raro el día del incidente.',
          },
        ],
      },
      {
        id: 'rmsoc-f3',
        number: 3,
        title: 'Logs y SIEM Base',
        note: 'El SIEM es tu segunda memoria: entiende el pipeline completo antes de escribir una sola detección encima.',
        items: [
          {
            id: 'rmsoc-f3-1',
            label: 'Conceptos Clave',
            text: 'Qué es un SIEM: ingest, normalización a un esquema común, indexación, correlación, búsqueda y alertas. Splunk, Microsoft Sentinel, QRadar y Elastic resuelven el mismo problema con distinta marca: aprende el concepto y el lenguaje de queries, no el logo.',
          },
          {
            id: 'rmsoc-f3-2',
            label: 'Conceptos Clave',
            text: 'El pipeline de punta a punta: fuente → agente/collector (Winlogbeat, Azure Monitor Agent, Sysmon) → parser → índice → regla → alerta. Si el log llega mal parseado, la detección que escribas encima no vale nada: valida cada salto antes de culpar a la regla.',
          },
          {
            id: 'rmsoc-f3-3',
            label: 'Práctica',
            text: 'Instala Sysmon con una configuración seria (eventIDs 1 creación de proceso, 3 conexión de red, 10 acceso a LSASS) y envíalo con Winlogbeat a un stack Elastic local o Wazuh. Esa telemetría de endpoint es el oro del hunting: sin ella solo ves servidores, no estaciones.',
          },
          {
            id: 'rmsoc-f3-4',
            label: 'Evidencia (Exit Criteria)',
            text: 'Lab SIEM vivo: dos fuentes ingiriendo (Security de Windows + Sysmon), cinco búsquedas guardadas con nombre y una alerta disparada a propósito para validar el pipeline completo. Captura del mismo evento en origen y en el SIEM, lado a lado.',
          },
        ],
      },
      {
        id: 'rmsoc-f4',
        number: 4,
        title: 'Identidad y Entra ID',
        note: 'La mayoría de los compromisos modernos empiezan con una credencial, no con un exploit: la identidad es el nuevo perímetro.',
        items: [
          {
            id: 'rmsoc-f4-1',
            label: 'Conceptos Clave',
            text: 'Entra ID (antes Azure AD) para el analista: sign-in logs interactivos, no interactivos y de riesgo; MFA y sus métodos; Conditional Access como firewall de identidad. Aprende a leer un sign-in completo: quién, desde dónde, con qué aplicación cliente y con qué resultado exacto.',
          },
          {
            id: 'rmsoc-f4-2',
            label: 'Práctica',
            text: 'Explora los sign-in logs de un tenant de práctica: fallidos vs exitosos, ubicación, IP, cliente y error exacto. Distingue el usuario que se equivocó de contraseña (fallos concentrados en UNA cuenta) del password spraying (muchas cuentas, pocos intentos cada una, T1110 asomando).',
          },
          {
            id: 'rmsoc-f4-3',
            label: 'Evidencia (Exit Criteria)',
            text: 'Informe de identidad: tres hallazgos del tenant con tabla de evidencia (usuario, IP, ubicación, resultado, timestamp) y una recomendación concreta por hallazgo: forzar MFA, bloquear IP o revisar una política de Conditional Access. Nada de conclusiones sin fila que las respalde.',
          },
        ],
      },
      {
        id: 'rmsoc-f5',
        number: 5,
        title: 'El Primer Puesto en el SOC',
        note: 'Lo que te contratan a hacer: turnos, cola de alertas, ticketing y una nota de triage que otro analista pueda leer sin llamarte.',
        items: [
          {
            id: 'rmsoc-f5-1',
            label: 'Conceptos Clave',
            text: 'La vida en el SOC: turnos 24/7 y handoff escrito, cola de alertas con SLA, ticketing (Jira, ServiceNow) y la diferencia entre cerrar una ALERTA y resolver un CASO. El L1 que documenta bien vale por dos que solo clickean: el turno siguiente trabaja sobre lo que escribiste.',
          },
          {
            id: 'rmsoc-f5-2',
            label: 'Práctica',
            text: 'La nota de triage con formato fijo: alerta, fuente, hora, severidad, qué dice la evidencia, veredicto (TP, FP o benigno verdadero) y por qué. Escribe 10 notas de alertas simuladas hasta que la estructura salga sin pensar: en el turno real no hay tiempo de improvisar el formato.',
          },
          {
            id: 'rmsoc-f5-3',
            label: 'Certificación',
            text: 'SC-900 (Microsoft Security, Compliance, and Identity Fundamentals): el mapa del territorio con el que entras a la entrevista. Apréndela rápido y sigue avanzando — es de fundamentos, no de prestigio. La combinación real es SC-900 ahora y SC-200 en el Tier 3, cuando ya tengas manos calientes.',
          },
        ],
      },
    ],
  },
  {
    id: 'rmsoc-t2',
    title: 'TIER 2 — OPERACIÓN REAL',
    subtitle:
      'El día a día del L1 de verdad: triage con los Event IDs del canon, queries propias en KQL y SPL, respuesta con EDR/Defender, análisis de phishing y evidencia con cadena de custodia. Aquí dejas de mirar alertas y empiezas a resolver casos.',
    phases: [
      {
        id: 'rmsoc-f6',
        number: 6,
        title: 'Triage de Alertas',
        note: 'El oficio en su forma pura: decidir rápido con evidencia y escribirlo para que el siguiente no repita tu trabajo.',
        items: [
          {
            id: 'rmsoc-f6-1',
            label: 'Conceptos Clave',
            text: 'El triage: verdadero positivo (TP), falso positivo (FP) y benigno verdadero; severidad vs prioridad; y la pregunta que ordena todo: ¿qué evidencia necesito para decidir? Un veredicto sin evidencia citada es una opinión, y en un SOC las opiniones no cierran casos.',
          },
          {
            id: 'rmsoc-f6-2',
            label: 'Conceptos Clave',
            text: 'El canon de Windows para SOC: 4624/4625 login exitoso/fallido, 4740 bloqueo de cuenta, 4720 usuario creado, 4728/4732 agregado a grupo global/local, 4688 proceso creado, 1102 log borrado, 7045 servicio instalado. Son el 80% del triage L1: memorízalos hasta el reflejo.',
          },
          {
            id: 'rmsoc-f6-3',
            label: 'Práctica',
            text: 'Reproduce en el lab la secuencia clásica del compromiso: 4720 (usuario nuevo) → 4732 (lo meten en Administradores) → 7045 (servicio malicioso) → 1102 (borrado de logs). Reconstruye la cronología exacta y escribe el escalamiento como si fuera un caso real, con hora y fuente por evento.',
          },
          {
            id: 'rmsoc-f6-4',
            label: 'Práctica',
            text: 'Priorización con contexto: un 4625 a mediodía es ruido, el mismo 4625 a las 3 AM contra cuentas VIP o en ráfaga de cuentas distintas es señal. Combina cantidad, objetivo, hora, fuente y activo afectado. Ordena 20 alertas simuladas y defiende por qué atiendes primero la primera de la lista.',
          },
          {
            id: 'rmsoc-f6-5',
            label: 'Evidencia (Exit Criteria)',
            text: 'Portfolio de triage: 15 alertas simuladas con nota completa, veredicto y la evidencia exacta citada (EventID y campos relevantes). Es exactamente lo que te piden en la entrevista de L1: "cuéntame un caso que hayas triajeado de principio a fin".',
          },
        ],
      },
      {
        id: 'rmsoc-f7',
        number: 7,
        title: 'KQL y SPL: Queries Propias',
        note: 'El analista que no escribe sus queries depende de las del vendor: llega tarde a todo y no entiende lo que encuentra.',
        items: [
          {
            id: 'rmsoc-f7-1',
            label: 'Conceptos Clave',
            text: 'Los lenguajes del oficio: KQL (Sentinel, Defender 365) y SPL (Splunk). Mismo cerebro: tabla, ventana de tiempo, filtro, proyección y agregación. Aprende uno a fondo y el otro se traduce casi solo; el error es aprenderlos "un poquito cada uno".',
          },
          {
            id: 'rmsoc-f7-2',
            label: 'Práctica',
            text: 'KQL base de verdad: SecurityEvent | where TimeGenerated > ago(24h) | where EventID == 4625, project para quedarte con las columnas que importan, summarize count() by Account y top para rankear. Escríbelas tú: copiar la query del vendor es leer, no consultar.',
          },
          {
            id: 'rmsoc-f7-3',
            label: 'Práctica',
            text: 'Joins y parsing: join kind=leftouter para enriquecer logins con datos del dispositivo o de la identidad, union para apilar tablas y parse/extract para sacar campos escondidos en el Message. El 80% de una detección útil es parsing bien hecho, no lógica exótica.',
          },
          {
            id: 'rmsoc-f7-4',
            label: 'Evidencia (Exit Criteria)',
            text: 'Libro de queries propias: 10 consultas KQL documentadas (con su equivalente SPL si tienes Splunk en el lab) con objetivo, tablas fuente, resultado esperado y la ejecución real capturada. Ese documento es tu cartilla de entrevista técnica.',
          },
        ],
      },
      {
        id: 'rmsoc-f8',
        number: 8,
        title: 'EDR y Defender',
        note: 'El EDR es tu brazo en el endpoint: telemetría y acciones de respuesta. No te dice la verdad completa: te da pistas muy buenas.',
        items: [
          {
            id: 'rmsoc-f8-1',
            label: 'Conceptos Clave',
            text: 'EDR vs antivirus clásico: telemetría de proceso, red, archivo y registro; detección comportamental; y las acciones de respuesta: quarantine, block y aislamiento del host. Distingue detección (algo pasó) de prevención (no dejó pasar): el reporte y el veredicto cambian según cuál fue.',
          },
          {
            id: 'rmsoc-f8-2',
            label: 'Práctica',
            text: 'Defender local: Get-MpComputerStatus, Get-MpThreat, Get-MpThreatDetection y el historial de eventos de Defender; dispara una detección con la muestra EICAR (archivo de prueba, no malicioso) y sigue el evento de punta a punta: archivo, detección, acción y verificación posterior.',
          },
          {
            id: 'rmsoc-f8-3',
            label: 'Práctica',
            text: 'Acciones de respuesta: Remove-MpThreat y cuarentena de archivo en el host, más el flujo de aislamiento y desaislamiento en Defender for Endpoint (o su equivalente en tu EDR de lab): detectar → contener → recopilar evidencia → desaislar. Practica el desaislamiento también: aislar y olvidarse rompe el negocio.',
          },
          {
            id: 'rmsoc-f8-4',
            label: 'Evidencia (Exit Criteria)',
            text: 'Caso EDR documentado: detección disparada, veredicto, acción tomada con el comando exacto, verificación posterior y lección aprendida. Formato de nota de caso completo, como si el ticket fuera a parar a auditoría.',
          },
        ],
      },
      {
        id: 'rmsoc-f9',
        number: 9,
        title: 'Email y Phishing',
        note: 'El buzón es el vector de entrada número uno: T1566 será la técnica que más veas en toda tu carrera.',
        items: [
          {
            id: 'rmsoc-f9-1',
            label: 'Conceptos Clave',
            text: 'Anatomía del correo: cadena de Received (se lee de abajo hacia arriba), SPF, DKIM, DMARC y Authentication-Results; análisis de URL y adjuntos sin ejecutarlos. El encabezado cuenta la ruta completa del mensaje y quién la falsificó: el cuerpo del correo miente, el encabezado menos.',
          },
          {
            id: 'rmsoc-f9-2',
            label: 'Práctica',
            text: 'Analiza 5 correos sospechosos de tu propio spam: reconstruye la ruta con los Received, verifica SPF/DKIM/DMARC contra el dominio suplantado, extrae las URLs sin hacer clic y escribe el veredicto por correo. Este músculo es el mismo que luego aplicas al BEC: el fraude de factura no trae link ni adjunto.',
          },
          {
            id: 'rmsoc-f9-3',
            label: 'Práctica',
            text: 'Caza en Defender con KQL: EmailEvents, EmailUrlInfo, EmailAttachmentInfo y EmailPostDeliveryEvents para responder quién más recibió el correo, si alguien hizo clic y qué adjunto era. Después, purga con las acciones de Threat Explorer (soft delete en todos los buzones afectados).',
          },
          {
            id: 'rmsoc-f9-4',
            label: 'Evidencia (Exit Criteria)',
            text: 'Caso de phishing completo: desde el reporte del usuario hasta la purga en todos los buzones, reset de credenciales de quien hizo clic y bloqueo de indicadores (IP, dominio, hash). Cierra con la nota de BEC: qué hubiera cambiado si era un fraude de transferencia y no un link falso.',
          },
        ],
      },
      {
        id: 'rmsoc-f10',
        number: 10,
        title: 'Evidencia y Casos',
        note: 'Lo que separa un SOC de una sala de clickeo de botones: cada acción deja rastro verificable y el caso se puede reconstruir sin ti.',
        items: [
          {
            id: 'rmsoc-f10-1',
            label: 'Conceptos Clave',
            text: 'Order of volatility: RAM y estado en vivo → conexiones de red → procesos → disco → logs remotos. Decide qué capturar ANTES de reiniciar o aislar: cada acción destructiva borra la escena. Reiniciar "para ver si arregla" es destruir evidencia, y te lo vas a encontrar en el postmortem.',
          },
          {
            id: 'rmsoc-f10-2',
            label: 'Conceptos Clave',
            text: 'Cadena de custodia: cada artefacto documentado con quién, qué, cuándo, desde dónde y hash SHA-256 (Get-FileHash). Sin cadena de custodia tu evidencia no sirve ni para justificar un despedido ni para un proceso legal: es solo un archivo interesante que encontraste.',
          },
          {
            id: 'rmsoc-f10-3',
            label: 'Práctica',
            text: 'La nota de caso nivel L1 que ya debe salirte natural: resumen ejecutivo, timeline con horas, indicadores (IPs, hashes, cuentas, hosts), acciones tomadas, veredicto final y recomendaciones. Prueba de fuego: otro analista debe poder retomar tu caso a mitad sin hablarte.',
          },
          {
            id: 'rmsoc-f10-4',
            label: 'Evidencia (Exit Criteria)',
            text: 'Un caso completo del lab con custodia real: 3 o más artefactos hasheados, empaquetados y listados con su hash correspondiente, más el informe del caso completo. Guárdalo junto a los runbooks SOC del vault: será tu referencia de formato para el proyecto final.',
          },
        ],
      },
    ],
  },
  {
    id: 'rmsoc-t3',
    title: 'TIER 3 — SOC L2 → DETECTION ENGINEER',
    subtitle:
      'El salto de nivel: dejar de consumir alertas para empezar a producirlas. MITRE ATT&CK y caza por hipótesis, respuesta a incidentes como proceso, SOAR y métricas, y detección as code. Aquí te conviertes en el que los L1 llaman cuando la cosa se pone fea.',
    phases: [
      {
        id: 'rmsoc-f11',
        number: 11,
        title: 'MITRE ATT&CK y Hunting por Hipótesis',
        note: 'ATT&CK es el idioma común del blue team: si no puedes mapear lo que ves a una técnica, todavía no lo entiendes.',
        items: [
          {
            id: 'rmsoc-f11-1',
            label: 'Conceptos Clave',
            text: 'MITRE ATT&CK: tácticas (el porqué), técnicas (el cómo) y sub-técnicas; la matriz y las fuentes de datos de cada técnica. Domina las que verás siempre: T1566 phishing, T1110 password spraying, T1078 credenciales válidas y T1059.001 PowerShell. Todo tu reporting debería hablar en ese idioma.',
          },
          {
            id: 'rmsoc-f11-2',
            label: 'Conceptos Clave',
            text: 'Hunting por hipótesis: la caza empieza con "si X está en mi red, qué huellas deja", no con una query suelta. Piensa en cadena: T1566 → T1078 → T1059.001 → persistencia → movimiento lateral, y pregunta qué eslabón de esa cadena NO está cubierto hoy por tu SIEM.',
          },
          {
            id: 'rmsoc-f11-3',
            label: 'Práctica',
            text: 'Tres cazas documentadas: spraying (T1110, ráfagas de 4625 sobre cuentas distintas), abuso de PowerShell (T1059.001, con EventID 4104 de Script Block Logging) y credenciales válidas (T1078, 4624 fuera de horario o desde IP nunca vista). Por cada una: hipótesis escrita, query, hallazgo o descarte CON evidencia.',
          },
          {
            id: 'rmsoc-f11-4',
            label: 'Práctica',
            text: 'Sigma: escribe tres reglas en YAML para las técnicas que cazaste, con title, level, description y tags de ATT&CK; valida la sintaxis con sigma-cli y pruébalas contra tus eventos de control del lab. Sigma es el formato abierto que luego traduces a Splunk, Sentinel o Elastic sin reescribir la lógica.',
          },
          {
            id: 'rmsoc-f11-5',
            label: 'Evidencia (Exit Criteria)',
            text: 'Reporte de caza: tres hipótesis, la query de cada una, hallazgo o descarte con evidencia citada y las reglas Sigma que salieron de lo hallado. Una caza que no termina en detección nueva o en descarte documentado se repite infinito sin aportar nada.',
          },
        ],
      },
      {
        id: 'rmsoc-f12',
        number: 12,
        title: 'Respuesta a Incidentes',
        note: 'El incidente no se resuelve con heroísmo: se resuelve con un plan escrito, ejecutado y medido.',
        items: [
          {
            id: 'rmsoc-f12-1',
            label: 'Conceptos Clave',
            text: 'El ciclo de IR: preparación, detección y análisis, contención, erradicación, recuperación y lecciones aprendidas. Contención vs aislamiento: contener es frenar la propagación (bloquear cuenta, IP o regla), aislar es cortar el host de la red. Saber cuál aplica y cuándo es la decisión más cara del incidente.',
          },
          {
            id: 'rmsoc-f12-2',
            label: 'Práctica',
            text: 'Escribe el plan de IR para un incidente de credenciales (T1078): quién decide la contención, quién ejecuta, umbrales de escalamiento y acciones automáticas vs manuales. Un IR sin plan escrito se convierte en pánico con un chat de por medio, y el chat no es evidencia ni es proceso.',
          },
          {
            id: 'rmsoc-f12-3',
            label: 'Práctica',
            text: 'Simulacro completo en el lab: phishing → credenciales comprometidas → acceso → movimiento lateral, usando los runbooks SOC del vault (RB-SOC-*) como guía de cada fase. Cronometra cada etapa: el MTTD y el MTTR salen de esos relojes, no de la memoria de quien respondió.',
          },
          {
            id: 'rmsoc-f12-4',
            label: 'Certificación',
            text: 'SC-200 (Microsoft Security Operations Analyst): el sello de que sabes operar Sentinel y Defender para detectar, triagear y responder. Estúdiala DESPUÉS del simulacro completo: con las manos calientes la mitad del contenido te sonará a casos que ya viviste, y se fija el doble.',
          },
        ],
      },
      {
        id: 'rmsoc-f13',
        number: 13,
        title: 'SOAR y Métricas del SOC',
        note: 'El SOC se gestiona con datos: automatiza lo repetitivo y mide lo que importa, o el volumen te entierra.',
        items: [
          {
            id: 'rmsoc-f13-1',
            label: 'Conceptos Clave',
            text: 'SOAR: playbooks que orquestan enriquecimiento, acciones y notificaciones con el humano en el loop. Automatiza lo repetitivo y de bajo riesgo (enriquecer una IP, ubicar al dueño del activo); la decisión de aislar producción sigue siendo humana y con responsable con nombre y apellido.',
          },
          {
            id: 'rmsoc-f13-2',
            label: 'Conceptos Clave',
            text: 'Métricas que importan: MTTD (tiempo medio de detección), MTTR (tiempo medio de respuesta), volumen de alertas por regla y tasa de FP por regla. Si no mides, no mejoras: y lo que no se mide en el SOC se convierte en "estamos algo ocupados", que no es una métrica ni una estrategia.',
          },
          {
            id: 'rmsoc-f13-3',
            label: 'Práctica',
            text: 'Diseña tres playbooks (Logic Apps de Sentinel o diagrama de flujo si no tienes tenant): enriquecimiento automático de IP/hash, notificación de cuenta bloqueada y aislamiento con aprobación explícita. Cada decisión del flujo debe estar escrita en el diagrama, no implícita en la cabeza de quien lo armó.',
          },
          {
            id: 'rmsoc-f13-4',
            label: 'Evidencia (Exit Criteria)',
            text: 'El loop de FP documentado: toma una regla ruidosa, documenta sus falsos positivos, propón el tuning (exclusión, umbral o lógica) y mide el antes y el después. Reducir el ruido de una regla vale tanto como crearla: el SOC que no tunea se ahoga en sus propias detecciones.',
          },
        ],
      },
      {
        id: 'rmsoc-f14',
        number: 14,
        title: 'Detección as Code',
        note: 'La regla que vive en una consola es deuda; la que vive en Git con pruebas y pipeline es ingeniería.',
        items: [
          {
            id: 'rmsoc-f14-1',
            label: 'Conceptos Clave',
            text: 'Detección as code: reglas en YAML/Sigma versionadas en Git, revisadas por pull request, desplegadas por pipeline y probadas contra eventos de control. Es el mismo cambio cultural que Infra as Code: la consola del SIEM pasa a ser lugar de consulta, no de construcción.',
          },
          {
            id: 'rmsoc-f14-2',
            label: 'Práctica',
            text: 'Repo de detecciones: estructura clara (reglas, tests, pipeline), convención de nombres y campos obligatorios en cada Sigma: id, title, status, level y tags de ATT&CK. Migra las tres reglas de la fase 11 al formato del repo, con commits limpios y mensajes que expliquen el porqué.',
          },
          {
            id: 'rmsoc-f14-3',
            label: 'Práctica',
            text: 'Pipeline CI: valida sintaxis con sigma check, corre las reglas contra tus eventos de control (pySigma con el backend que uses) y despliega al SIEM del lab solo desde la rama protegida. Regla de la casa: nadie despliega detecciones desde su consola personal, ni el jefe.',
          },
          {
            id: 'rmsoc-f14-4',
            label: 'Evidencia (Exit Criteria)',
            text: 'Tuning con historia: una regla con su histórico de alertas (antes y después), el cambio aplicado vía pull request y la métrica de FP reducida. Muestra el diff y el gráfico en la entrevista: eso es detection engineering demostrado, no declarado.',
          },
        ],
      },
    ],
  },
  {
    id: 'rmsoc-pf',
    title: 'PROYECTO FINAL — SEMANA DE SOC SIMULADO',
    subtitle:
      'Una semana de guardia como analista: 8 casos encadenados que recorren la cadena completa del ataque (phishing → spray → compromiso → persistencia → lateral → C2 → ransomware → postmortem), ejecutados con los runbooks SOC del vault (RB-SOC-*) y cerrados con el informe de métricas y el export del roadmap.',
    phases: [
      {
        id: 'rmsoc-f15',
        number: 15,
        title: 'Semana de SOC Simulado: 8 Casos con Runbooks',
        note: 'Trabaja los casos como si te pagaran por ello: hipótesis, evidencia, veredicto, respuesta y nota de caso en cada cierre. El runbook guía; tú decides.',
        items: [
          {
            id: 'rmsoc-f15-1',
            label: 'Proyecto',
            text: 'Caso 1 — Phishing (T1566): un usuario reporta un correo. Analiza encabezados, verifica SPF/DKIM/DMARC, caza a los demás destinatarios con KQL, purga de buzones y reset de credenciales de quien hizo clic. El runbook de phishing del vault es tu guía: síguelo paso a paso y registra qué te faltó.',
          },
          {
            id: 'rmsoc-f15-2',
            label: 'Proyecto',
            text: 'Caso 2 — Password spraying (T1110): ráfagas de 4625 sobre muchas cuentas desde pocas IPs. Distingue ruido de ataque, activa el bloqueo y caza la señal que de verdad importa: un 4624 exitoso posterior desde la misma fuente. Ahí estaba el incidente, no en el ruido.',
          },
          {
            id: 'rmsoc-f15-3',
            label: 'Proyecto',
            text: 'Caso 3 — Compromiso de credenciales (T1078): sign-ins de riesgo, fatiga de MFA y comportamiento anómalo en Entra. Responde en el orden correcto: revocar sesiones, reset de contraseña, forzar MFA y revisar qué accedió el atacante mientras tuvo la llave. El orden importa: revocar después de resetear es empezar de nuevo.',
          },
          {
            id: 'rmsoc-f15-4',
            label: 'Proyecto',
            text: 'Caso 4 — Persistencia: 4720, 4732 y 7045 en un host. Encuentra la cuenta y el servicio creados, explica la técnica en términos de ATT&CK y erradica sin romper el host: primero evidencia, luego limpieza, luego verificación de que no quedó nada vivo ni otra cuenta de respaldo.',
          },
          {
            id: 'rmsoc-f15-5',
            label: 'Proyecto',
            text: 'Caso 5 — Movimiento lateral: logins 4624 tipo 3, sesiones RDP y accesos a compartidos SMB (5140/5145) entre estaciones. Reconstruye el camino del atacante con timeline, identifica el siguiente objetivo probable y contén la propagación antes de que lo alcance.',
          },
          {
            id: 'rmsoc-f15-6',
            label: 'Proyecto',
            text: 'Caso 6 — C2 y ransomware: beaconing periódico hacia un destino raro, cifrado masivo de archivos y nota de rescate. Prioriza la contención (aislar) sobre el análisis y preserva la evidencia ANTES de desplegar y limpiar. Aquí se mide si aprendiste de verdad el order of volatility.',
          },
          {
            id: 'rmsoc-f15-7',
            label: 'Proyecto',
            text: 'Caso 7 — Ransomware final: con el C2 cortado y los hosts aislados, erradica (cuentas, servicios, tareas programadas), recupera desde backup limpio y verifica integridad. El caso no se cierra cuando se descifra: se cierra cuando puedes demostrar que el acceso inicial está bloqueado.',
          },
          {
            id: 'rmsoc-f15-8',
            label: 'Proyecto',
            text: 'Caso 8 — Postmortem: informe blameless del incidente mayor de la semana: timeline completo, causa raíz (las personas no son la causa raíz), MTTD y MTTR reales, qué funcionó, qué falló y acciones con dueño y fecha. Usa el formato del runbook de postmortem del vault y escríbelo para que un director lo entienda.',
          },
          {
            id: 'rmsoc-f15-9',
            label: 'Evidencia (Exit Criteria)',
            text: 'Informe final de la semana: 8 de 8 casos con nota completa, MTTD y MTTR estimados por caso, mapa ATT&CK de lo enfrentado, tus tres debilidades detectadas y el export del roadmap con el plan de repaso señalando las fases exactas que debes repetir antes de la entrevista.',
          },
        ],
      },
    ],
  },
];

/** Todos los ítems del roadmap SOC (flatten) — para el seed de la DB. */
export const ROADMAP_SOC_ALL_ITEM_IDS: string[] = ROADMAP_SOC_TIERS.flatMap((t) =>
  t.phases.flatMap((p) => p.items.map((i) => i.id))
);
