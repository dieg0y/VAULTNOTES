/**
 * helpDeskLabsData — LAB TEMPLATES de la especialización HelpDesk.
 *
 * 4 labs guiados (la arquitectura actual de Labs es 100% usuario: estos
 * se siembran como plantillas para trabajarlos dentro del sistema de
 * Labs existente). Cada lab es un flujo L1/L2 de punta a punta con
 * pasos numerados, comandos educativos (texto plano) y secciones de
 * CONCLUSIONES/MITIGACIÓN que el usuario debe rellenar — el lab no se
 * da por hecho sin trabajo propio (mismo criterio Mastered del roadmap).
 *
 * Seeding aditivo por id + dismissal (el usuario puede borrarlos de
 * forma definitiva sin que el seed los reviva).
 *
 * Los labs son SIMULADOS: los comandos son material de estudio, nunca
 * se ejecutan contra sistemas reales.
 */

import type { Lab } from '../types';

/** Campos que el seeder completa (estado de trabajo del usuario). */
export type HelpDeskLabSeed = Omit<
  Lab,
  'status' | 'isFavorite' | 'isDeleted' | 'deletedAt' | 'createdAt' | 'updatedAt'
>;

export const HELPDESK_LAB_SEEDS: HelpDeskLabSeed[] = [
  {
    id: 'labhd-jml-onboarding-l1',
    title: 'Lab L1: Onboarding de usuario (JML) — de la solicitud a la entrega',
    organization: 'Nexora S.A. (simulado)',
    topic: 'HelpDesk - AD / Identidad',
    categories: ['HelpDesk - AD / Identidad', 'HelpDesk - Service Desk / ITSM'],
    subtopic: 'Joiner — alta de usuario',
    difficulty: 'Media',
    timeSpent: '',
    sourceLink: '',
    parts: [
      {
        id: 'labhd-jml-p1',
        title: '1. Validar la solicitud (no es un reset, es un alta)',
        content:
          'El ticket llega de RRHH: "Alta de Elena Vargas, Ventas, empieza el lunes". Antes de crear NADA responde en tus notas de trabajo: ¿la solicitud viene del canal oficial (RRHH/manager) o de un mail suelto? ¿Trae aprobador explícito? ¿Qué matriz de accesos aplica para Ventas? Regla del lab: si cualquiera de las tres respuestas falta, el ticket se devuelve pidiendo datos — un alta sin aprobación es el error #1 de un service desk. Documenta en el lab qué validaste y contra quién.',
        isCompleted: false,
      },
      {
        id: 'labhd-jml-p2',
        title: '2. Crear la cuenta en AD (convención y grupos birthright)',
        content:
          'Crea la cuenta siguiendo la convención de Nexora: primer inicial + apellido (evargas), OU de Ventas, descripción con cargo y fecha de alta. Asigna SOLO los grupos birthright de la matriz de Ventas (correo, carpetas del equipo, impresora de planta) — nada de "por si acaso". Comandos educativos del paso: "New-ADUser -Name evargas -Path \"OU=Ventas,DC=nexora,DC=local\" -Enabled $true" y "Add-ADGroupMember -Identity GRP-Ventas-Basico -Members evargas". Copia en tus notas los grupos exactos asignados y por qué (evidencia auditable).',
        isCompleted: false,
      },
      {
        id: 'labhd-jml-p3',
        title: '3. Microsoft 365: licencia, SSPR y MFA',
        content:
          'Con la sincronización hecha (o directamente en Entra ID, según el escenario), asigna la licencia correcta (SKU de la matriz de altas — Microsoft 365 E3 en Nexora), verifica que el usuario aparece con UsageLocation establecido (sin esto la licencia falla) y confirma que queda registrado para SSPR y MFA. Punto crítico del lab: el alta NO termina en "cuenta creada" — termina cuando el usuario puede entrar, cambiar su contraseña temporal y registrar MFA. Anota qué comprobarías en Service Health antes de culpar a la cuenta.',
        isCompleted: false,
      },
      {
        id: 'labhd-jml-p4',
        title: '4. Entrega segura de credenciales',
        content:
          'Decide y documenta cómo entregas las credenciales temporales: NUNCA por el mismo canal que la solicitud si puede ser suplantado (guía: entrega en persona con verificación, o canal secundario pactado con RRHH). Obliga a cambiar la contraseña en el primer login y a registrar MFA delante de ti (o en el call de bienvenida). El lab se pregunta: ¿qué senales te dirían que quien pide las credenciales NO es Elena? Escribe 3 (p. ej. urgencia inusual, número no registrado, pedido de reenvío a otro correo).',
        isCompleted: false,
      },
      {
        id: 'labhd-jml-p5',
        title: '5. Cierre del ticket con evidencia',
        content:
          'Cierra el ticket escribiendo el paquete de evidencia: ticket id, aprobador (quién y cuándo), cuenta creada, grupos asignados (lista), licencia, fecha de entrega y método de entrega de credenciales. Un auditor debe poder reconstruir el alta sin preguntarte. Cierra el lab con una reflexión: ¿qué parte de este flujo te parece más propensa a error humano y cómo la blindarías (checklist, plantilla, automatización)?',
        isCompleted: false,
      },
    ],
    tools: ['Active Directory — ADUC', 'Microsoft 365 admin center'],
    commands: [
      'Get-ADUser -Identity evargas -Properties MemberOf',
      'Search-ADAccount -AccountInactive -TimeSpan 30.00:00:00',
      'Add-ADGroupMember -Identity GRP-Ventas-Basico -Members evargas',
    ],
    findings: '',
    mitigation: '',
  },
  {
    id: 'labhd-printer-troubleshooting',
    title: 'Lab L1: Impresora de red — del "no imprime" al diagnóstico diferencial',
    organization: 'Nexora S.A. (simulado)',
    topic: 'HelpDesk - Fundamentos IT',
    categories: ['HelpDesk - Fundamentos IT', 'HelpDesk - Redes (Networking)'],
    subtopic: 'Impresión de red',
    difficulty: 'Fácil',
    timeSpent: '',
    sourceLink: '',
    parts: [
      {
        id: 'labhd-prn-p1',
        title: '1. Preguntas de intake (acotar el problema)',
        content:
          'El ticket dice "no puedo imprimir". Antes de tocar el equipo responde: ¿es UN usuario o TODA la planta? ¿la impresora muestra error en panel (papel, tóner, red)? ¿el job queda en cola o desaparece? ¿imprimía ayer? Apunta las respuestas del lab: el 60% de los tickets de impresora se acotan con estas cuatro preguntas. Regla: "no imprime nadie" → problema de la impresora/red/servidor de impresión; "no imprime un usuario" → problema de equipo/driver/cola local.',
        isCompleted: false,
      },
      {
        id: 'labhd-prn-p2',
        title: '2. Verificar la impresora en la red',
        content:
          'Obtén la IP de la impresora (panel o ticket) y comprueba alcance y puerto: ping a la IP y Test-NetConnection -Port 9100 (puerto RAW de impresión). Si responde ping pero no el 9100, el servicio de impresión del dispositivo está caído → reinicio de la impresora y, si persiste, escalamiento a L2/Infraestructura. Documenta aquí los resultados simulados de cada prueba y tu conclusión.',
        isCompleted: false,
      },
      {
        id: 'labhd-prn-p3',
        title: '3. La cola y el spooler local',
        content:
          'En el equipo del usuario: revisa la cola (jobs atascados en "imprimiendo" = clásico), purga los jobs, reinicia el Spooler ("Restart-Service Spooler" o services.msc) y comprueba el driver instalado (impresora genérica/mal driver tras un update de Windows = segunda causa clásica). El lab pide: ¿en qué orden haces purge + reinicio de spooler y por qué? Documenta la secuencia correcta.',
        isCompleted: false,
      },
      {
        id: 'labhd-prn-p4',
        title: '4. Puerto, driver y remapeo',
        content:
          'Si la cola está sana: verifica el puerto TCP/IP de la impresora (que apunte a la IP correcta — una IP cambiada por DHCP rompe impresoras con IP fija mal reservada), reinstala el driver actualizado y, si el perfil se corrompió, elimina y remapea la impresora. Comandos educativos: "Get-Printer", "Get-PrinterPort", "Remove-Printer". Reflexiona: ¿por qué conviene RESERVAR la IP de las impresoras en el DHCP?',
        isCompleted: false,
      },
      {
        id: 'labhd-prn-p5',
        title: '5. Verificación, cierre y KB',
        content:
          'Verifica con una página de prueba DESDE la app del usuario (no desde el panel de la impresora — eso solo prueba el hardware). Cierra el ticket con la causa y escribe en tus notas qué agregarías a la KB: el lab termina redactando un mini-artículo "impresora offline — 5 pasos" reutilizable para el próximo ticket.',
        isCompleted: false,
      },
    ],
    tools: ['Windows — Herramientas administrativas'],
    commands: [
      'Test-NetConnection 10.20.30.40 -Port 9100',
      'Get-Service Spooler',
      'Restart-Service Spooler',
      'Get-Printer',
    ],
    findings: '',
    mitigation: '',
  },
  {
    id: 'labhd-entra-joined-migration',
    title: 'Lab L2: Equipo Entra joined — migración y troubleshooting de registro',
    organization: 'Nexora S.A. (simulado)',
    topic: 'HelpDesk - Microsoft 365',
    categories: ['HelpDesk - Microsoft 365', 'HelpDesk - Windows / Endpoint'],
    subtopic: 'Entra join / Intune',
    difficulty: 'Difícil',
    timeSpent: '',
    sourceLink: '',
    parts: [
      {
        id: 'labhd-ej-p1',
        title: '1. Leer el estado actual del dispositivo',
        content:
          'El equipo de un usuario "no sincroniza políticas y no entra a los recursos". Ejecuta "dsregcmd /status" y aprende a leerlo: AzureAdJoined debe ser YES, DomainJoined NO (en un equipo Entra joined puro), y el PRT (Primary Refresh Token) presente es lo que permite el SSO silencioso. En el lab, interpreta un /status simulado con PRT ausente y escribe qué implica (sin PRT no hay SSO ni Conditional Access satisfecho → prompts de login y accesos rotos).',
        isCompleted: false,
      },
      {
        id: 'labhd-ej-p2',
        title: '2. Comprobar Intune (check-in, cumplimiento, políticas)',
        content:
          'Abre Company Portal → sincroniza y mira el estado de cumplimiento. Si el equipo no aparece o está "no conforme": verifica el último check-in, revisa qué política falla (bitLocker pendiente, updates pendientes, antivirus desactualizado) y anota la diferencia entre "el equipo está mal" y "el equipo no REPORTA" (un equipo sin check-in reciente miente por omisión). Documenta el criterio para decidir cuál de los dos tienes delante.',
        isCompleted: false,
      },
      {
        id: 'labhd-ej-p3',
        title: '3. El diagnóstico diferencial del login roto',
        content:
          'Con Entra joined, un login roto puede ser: contrasena/MFA (identidad), PRT/token (registro del dispositivo), red (DNS/proxy hacia login.microsoftonline.com) o Conditional Access bloqueando. El lab pide ordenar las cuatro hipótesis de la más barata a la más cara de comprobar, y escribir qué evidencia descarta cada una (mensaje de error exacto, nslookup, dsregcmd, sign-in logs de Entra). Esta es la tabla que te llevarás a cualquier entrevista.',
        isCompleted: false,
      },
      {
        id: 'labhd-ej-p4',
        title: '4. Reparación: re-registro o re-image',
        content:
          'Cuando el registro está corrupto: "dsregcmd /debug" para diagnóstico y, como reparación educativa, "dsregcmd /leave" seguido de volver a unir el equipo desde Ajustes → Cuentas → Acceso profesional. Reflexiona: ¿qué pierdes al hacer /leave (relación con Intune, bitlocker keys del dispositivo)? ¿cuándo un /leave es proporcional y cuándo es rendirse? ¿qué debe ir ANTES al ticket (backup de datos del usuario) para no convertir una reparación en una pérdida de datos?',
        isCompleted: false,
      },
      {
        id: 'labhd-ej-p5',
        title: '5. Migración planificada (el caso original)',
        content:
          'Cierra volviendo al caso de migración: el equipo pasa de "workgroup con perfil local" a "Entra joined con Intune". Escribe el orden correcto: backup → verificación de requisitos (red a los endpoints de Entra, usuario con licencia) → join → comprobar PRT → check-in de Intune → verificar políticas/BitLocker → entrega al usuario con su perfil y datos restaurados. La migración exitosa no es la que se hace rápida, sino la que puedes REHACER paso a paso a partir de tu ticket.',
        isCompleted: false,
      },
    ],
    tools: ['Microsoft Entra ID (admin center)', 'Microsoft Intune'],
    commands: [
      'dsregcmd /status',
      'dsregcmd /debug',
      'Get-ComputerInfo | Select-Object WindowsProductName, OsVersion',
    ],
    findings: '',
    mitigation: '',
  },
  {
    id: 'labhd-phishing-mfa-security',
    title: 'Lab L1/L2: Reporte de phishing + reset seguro de credenciales',
    organization: 'Nexora S.A. (simulado)',
    topic: 'HelpDesk - Seguridad para Soporte',
    categories: ['HelpDesk - Seguridad para Soporte', 'HelpDesk - AD / Identidad'],
    subtopic: 'Seguridad operativa del service desk',
    difficulty: 'Media',
    timeSpent: '',
    sourceLink: '',
    parts: [
      {
        id: 'labhd-sec-p1',
        title: '1. Clasificar el reporte',
        content:
          'Llega "me llegó un mail raro pidiendo mi contrasena". Primera decisión: ¿es phishing real, spam o mail legítimo mal redactado? Mira senales (remitente parecido no idéntico, urgencia, enlace a dominio ajeno, adjunto inesperado) y NUNCA pidas al usuario que reenvíe el mail a todo el mundo: la cadena de custodia empieza aquí. Documenta qué le pides al usuario (reenvío como adjunto al buzón de seguridad o ticket con cabeceras, SIN hacer clic).',
        isCompleted: false,
      },
      {
        id: 'labhd-sec-p2',
        title: '2. Contención: no resetees todavía',
        content:
          'El instinto dice "reset de contrasena YA". El lab te obliga a pensar: ¿el usuario HIZO clic o solo reportó? ¿pidió el reset él mismo o te lo está pidiendo "su manager" por teléfono? Si hay clic/entrega de credenciales: contención = reset + revocar sesiones/tokens + re-registro de MFA, y escalamiento INMEDIATO al SOC. Si solo reportó: agradecer, verificar, no tocar la cuenta. Escribe el árbol de decisión completo con sus dos ramas.',
        isCompleted: false,
      },
      {
        id: 'labhd-sec-p3',
        title: '3. Verificación de identidad (el anti-vishing)',
        content:
          'Antes de cualquier reset: verificación contra fuente independiente (devolución al número de RRHH, datos que el solicitante conoce pero un atacante no, verificación presencial si aplica). Practica el guion: "Por seguridad le devuelvo la llamada al número que tenemos registrado". Documenta qué pasa si el "usuario" insiste, presiona con urgencia o pide saltarse el paso (senal roja → reporte de posible vishing al SOC + registro del intento).',
        isCompleted: false,
      },
      {
        id: 'labhd-sec-p4',
        title: '4. Reset completo + MFA',
        content:
          'Con identidad verificada y compromiso confirmado: reset de contrasena (temporal + cambio en primer login), re-registro de MFA si hubo compromiso, y revocación de sesiones activas. Comandos educativos: "Set-ADAccountPassword -Identity mtorres -Reset -NewPassword (Read-Host -AsSecureString)" y "Unlock-ADAccount -Identity mtorres" si hubo bloqueo. Verifica el login CONTIGO delante. Anota: ¿qué te quedará como evidencia de que el reset fue legítimo?',
        isCompleted: false,
      },
      {
        id: 'labhd-sec-p5',
        title: '5. Escalamiento al SOC y cierre',
        content:
          'Arma el paquete de handoff: correo original (con cabeceras), hora del reporte, qué hizo el usuario (clic/no clic), hora del reset, verificación de identidad usada y senales del supuesto vishing si las hubo. Cierra con la pregunta de entrevista: "¿por qué el service desk es la primera línea de defensa contra el compromiso de credenciales?" — tu respuesta debe incluir MFA fatigue, vishing a helpdesk y el costo de un reset sin verificación.',
        isCompleted: false,
      },
    ],
    tools: ['Outlook', 'Active Directory — ADUC'],
    commands: [
      'Search-ADAccount -LockedOut',
      'Unlock-ADAccount -Identity mtorres',
      'Set-ADAccountPassword -Identity mtorres -Reset',
    ],
    findings: '',
    mitigation: '',
  },
];
