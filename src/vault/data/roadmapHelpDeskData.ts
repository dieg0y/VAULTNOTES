/**
 * roadmapHelpDeskData — ROADMAP: HELPDESK / IT SUPPORT → IAM.
 *
 * Capa de ENTRADA/Foundation que prepara para un primer puesto de
 * HelpDesk / Service Desk y allana la transición hacia la
 * especialización IAM (roadmapData.ts — el roadmap Junior IAM).
 *
 * Estructura idéntica al roadmap IAM (reutiliza RoadmapTierDef /
 * RoadmapPhaseDef / RoadmapItemDef de roadmapData.ts): 3 tiers +
 * proyecto final. El checklist (estado done) persiste en la tabla
 * Dexie `roadmapHelpDeskItems` (ids 'rmhd-*'); este archivo es la
 * FUENTE DE VERDAD del CONTENIDO. El seed añade filas para los ids
 * que falten — jamás resetea el progreso del usuario.
 *
 * NO duplica el roadmap IAM: cuando un tema pertenece al dominio IAM
 * (RBAC, access reviews, PIM, JML avanzado...), aquí solo se prepara
 * la BASE de soporte y se referencia el salto al roadmap principal.
 */

import { type RoadmapTierDef } from './roadmapData';

export const ROADMAP_HD_HEADER = {
  title: 'Roadmap: HelpDesk / IT Support → IAM',
  specialization: 'Especialización de Entrada: Service Desk · L1 → L2 Support',
  edge: 'Puente de Transición: fundaciones → Junior IAM (roadmap principal)',
};

/** Nota de criterio de dominio (misma filosofía que el roadmap IAM). */
export const ROADMAP_HD_MASTERY_NOTE =
  'Para considerar una competencia dominada, debes poder ejecutarla ante un usuario real, ' +
  'explicar el porqué técnico, decidir cuándo NO resolverla tú (escalar) y documentarla ' +
  'en un ticket que un L2 o un auditor pueda entender sin preguntarte nada.';

export const ROADMAP_HD_TIERS: RoadmapTierDef[] = [
  {
    id: 'rmhd-t1',
    title: 'TIER 1 — L1 FOUNDATION',
    subtitle:
      'El nucleo del primer trabajo: fundamentos, Windows, red basica, tickets y trato al usuario. Aqui se consigue (y se sobrevive a) el primer puesto.',
    phases: [
      {
        id: 'rmhd-f1',
        number: 1,
        title: 'IT Fundamentals',
        note: 'Hardware, software y como encaja un equipo. Es la base para diagnosticar CUALQUIER cosa.',
        items: [
          {
            id: 'rmhd-f1-1',
            label: 'Conceptos Clave',
            text: 'CPU/RAM/almacenamiento/BIOS-UEFI/drivers: explicar que es cada componente y como se manifiesta su fallo (lento vs no arranca vs periferico muerto).',
          },
          {
            id: 'rmhd-f1-2',
            label: 'Práctica',
            text: 'Diagnostic de hardware con criterio: SMART del disco, temperatura, RAM (Memtest/diagnostico de fabricante), sustitucion de perifericos por descarte y RMA.',
          },
          {
            id: 'rmhd-f1-3',
            label: 'Evidencia',
            text: 'Armar una checklist propia de diagnostico de arranque (no enciende / enciende sin imagen / arranca lento) y documentarla en VaultNotes.',
          },
        ],
      },
      {
        id: 'rmhd-f2',
        number: 2,
        title: 'Hardware & Periféricos de Oficina',
        items: [
          {
            id: 'rmhd-f2-1',
            label: 'Práctica',
            text: 'Montaje y troubleshooting de puesto de trabajo: dock + 2 monitores (duplicar/extender), headset/USB, impresora local y de red.',
          },
          {
            id: 'rmhd-f2-2',
            label: 'Conceptos Clave',
            text: 'Tipos de impresion (cola/spooler/driver/puerto TCP 9100) y diagnostico diferencial: no imprime NADIE vs no imprime UN usuario.',
          },
          {
            id: 'rmhd-f2-3',
            label: 'Evidencia',
            text: 'Resolver al menos 5 tickets de impresora/periferico del dataset simulado (Nexora) documentando antes/después.',
          },
        ],
      },
      {
        id: 'rmhd-f3',
        number: 3,
        title: 'Windows Client (L1)',
        items: [
          {
            id: 'rmhd-f3-1',
            label: 'Conceptos Clave',
            text: 'Servicios, Administrador de tareas/dispositivos, Event Viewer (buscar por origen/ID), perfiles de usuario y UAC: que es cada herramienta y cuando abrirla.',
          },
          {
            id: 'rmhd-f3-2',
            label: 'Práctica',
            text: 'Diagnostico del "equipo lento": arranque (apps de inicio), CPU/RAM/disco en Task Manager, espacio, indexacion. SFC /scannow y DISM como respuesta al comportamiento raro.',
          },
          {
            id: 'rmhd-f3-3',
            label: 'Evidencia',
            text: 'Un caso documentado de BSOD: extraer stop code, leer minidump (concepto), aplicar la primera respuesta WinRE/Modo seguro y cerrarlo con causa raiz.',
          },
        ],
      },
      {
        id: 'rmhd-f4',
        number: 4,
        title: 'Metodología de Troubleshooting',
        note: 'El musculo que diferencia a un L1 senior: siempre el mismo metodo, con el usuario delante.',
        items: [
          {
            id: 'rmhd-f4-1',
            label: 'Conceptos Clave',
            text: 'Metodo formal: identificar problema → reproducir → aislar (capa: usuario/equipo/red/app) → cambiar UNA cosa → verificar → documentar. Nunca tocar sin linea base.',
          },
          {
            id: 'rmhd-f4-2',
            label: 'Práctica',
            text: 'Formular preguntas de intake: que paso, desde cuando, que cambio, quien mas le pasa, que intento. Convertir al usuario en fuente de datos.',
          },
        ],
      },
      {
        id: 'rmhd-f5',
        number: 5,
        title: 'Networking Fundamentals',
        items: [
          {
            id: 'rmhd-f5-1',
            label: 'Conceptos Clave',
            text: 'IPv4/subred/gateway/DNS/DHCP/puertos comunes: modelo mental de "a que red llego y que la resuelve". APIPA (169.254) como señal de DHCP caido.',
          },
          {
            id: 'rmhd-f5-2',
            label: 'Práctica',
            text: 'Kit de diagnostico L1: ping, ipconfig /all, ipconfig /flushdns, nslookup, tracert, Test-NetConnection -Port. Diagnostico diferencial DNS vs gateway vs app.',
          },
          {
            id: 'rmhd-f5-3',
            label: 'Práctica',
            text: 'Wi-Fi y VPN de usuario: intensidad de señal, SSID/PSK correctos, cliente VPN (error de credencial vs red vs certificado) y cuando pasa a L2 Redes.',
          },
        ],
      },
      {
        id: 'rmhd-f6',
        number: 6,
        title: 'Service Desk & Ticketing',
        note: 'El sistema donde vives: como se entra, se trabaja y se cierra un ticket.',
        items: [
          {
            id: 'rmhd-f6-1',
            label: 'Conceptos Clave',
            text: 'Ciclo de vida del ticket (nuevo → en progreso → resuelto → cerrado), categorizacion, matriz de prioridad (impacto × urgencia → P1-P4) y escalamiento funcional vs jerarquico.',
          },
          {
            id: 'rmhd-f6-2',
            label: 'Práctica',
            text: 'Escribir tickets que un L2 pueda ejecutar: sintoma verificable, datos del equipo, pasos ya hechos, hipotesis. Actualizaciones con hora e interlocutor.',
          },
          {
            id: 'rmhd-f6-3',
            label: 'Evidencia',
            text: 'Trabajar 10 tickets del dataset Nexora de punta a punta: triage correcto, prioridad justificada, resolucion o escalado con contexto completo.',
          },
        ],
      },
      {
        id: 'rmhd-f7',
        number: 7,
        title: 'Customer Service Técnico',
        items: [
          {
            id: 'rmhd-f7-1',
            label: 'Conceptos Clave',
            text: 'Manejo del usuario frustrado y del ticket ambiguo: empatia sin prometer lo que no controlas, lenguaje no tecnico y gestion de expectativas contra el SLA.',
          },
          {
            id: 'rmhd-f7-2',
            label: 'Práctica',
            text: 'Confirmar antes de cerrar (closure confirmation), follow-up proactivo y saber decir "lo escalo, me quedo de dueño hasta que L2 te atienda".',
          },
        ],
      },
      {
        id: 'rmhd-f8',
        number: 8,
        title: 'ITSM / ITIL 4 Fundamentals',
        items: [
          {
            id: 'rmhd-f8-1',
            label: 'Conceptos Clave',
            text: 'Distinguir SIEMPRE incidente vs solicitud vs problema vs cambio. SLA/OLA, catalogo de servicios, CMDB/CI y gestion del conocimiento (KB).',
          },
          {
            id: 'rmhd-f8-2',
            label: 'Conceptos Clave',
            text: 'Metricas del service desk — MTTA, MTTR, FCR, CSAT, backlog, reopen/escalation rate: que mide cada una y como TUS habitos la mueven.',
          },
          {
            id: 'rmhd-f8-3',
            label: 'Evidencia',
            text: 'Escribir 2 articulos de KB siguiendo el formato Nexora (sintoma → causa → pasos → verificacion) a partir de tickets repetitivos.',
          },
        ],
      },
      {
        id: 'rmhd-f9',
        number: 9,
        title: 'Seguridad Básica para Soporte',
        note: 'Aprender cuando NO resolver: el L1 es la primera barrera de phishing e ingenieria social.',
        items: [
          {
            id: 'rmhd-f9-1',
            label: 'Conceptos Clave',
            text: 'Verificacion de identidad ANTES de cualquier reset, senales de vishing/ingenieria social al telefono y flujo del reporte de phishing (nunca borrar evidencia).',
          },
          {
            id: 'rmhd-f9-2',
            label: 'Práctica',
            text: 'Casos del dataset: reporte de phishing (escalado a SOC), solicitud de privilegios (rechazo amable + escalamiento) y llamada sospechosa (verificacion y registro).',
          },
          {
            id: 'rmhd-f9-3',
            label: 'Conceptos Clave',
            text: 'Preservacion de evidencia: no formatear, no "probar cosas" en un equipo con sospecha de compromiso — aislar y escalar al SOC.',
          },
        ],
      },
    ],
  },
  {
    id: 'rmhd-t2',
    title: 'TIER 2 — L2 / INFRAESTRUCTURA',
    subtitle:
      'Lo que convierte un L1 en L2: dominio de dominio corporativo, Microsoft 365, endpoints gestionados y PowerShell. Tambien es la moneda de cambio para entrar a IAM.',
    phases: [
      {
        id: 'rmhd-f10',
        number: 10,
        title: 'Active Directory para Soporte',
        items: [
          {
            id: 'rmhd-f10-1',
            label: 'Conceptos Clave',
            text: 'Dominio, DC, OU, usuarios, grupos de seguridad vs distribucion y pertenencia efectiva: donde vive cada objeto y como se consulta.',
          },
          {
            id: 'rmhd-f10-2',
            label: 'Práctica',
            text: 'Operativa L1 en AD con PowerShell: Get-ADUser, Search-ADAccount (bloqueados/inactivos), Unlock-ADAccount, Set-ADAccountPassword y la delegacion de reset al HelpDesk.',
          },
          {
            id: 'rmhd-f10-3',
            label: 'Diagnóstico',
            text: 'Diferenciar con evidencia: contrasena caducada vs cuenta bloqueada vs cuenta deshabilitada vs grupo equivocado (los 4 fallos de login mas comunes).',
          },
        ],
      },
      {
        id: 'rmhd-f11',
        number: 11,
        title: 'Group Policy & Recursos',
        items: [
          {
            id: 'rmhd-f11-1',
            label: 'Conceptos Clave',
            text: 'GPO: que es, como se aplica (LSDOU), gpupdate /force y gpresult /r para ver que politica recibe el usuario/equipo.',
          },
          {
            id: 'rmhd-f11-2',
            label: 'Práctica',
            text: 'Unidades compartidas: permisos NTFS vs share (el mas restrictivo gana), herencia, y el diagnostico de "no puedo entrar a H:" paso a paso.',
          },
          {
            id: 'rmhd-f11-3',
            label: 'Evidencia',
            text: 'Un caso documentado de "GPO no aplica": gpresult, herencia/bloqueo y conclusion — con captura del antes/después.',
          },
        ],
      },
      {
        id: 'rmhd-f12',
        number: 12,
        title: 'Windows Troubleshooting Avanzado',
        items: [
          {
            id: 'rmhd-f12-1',
            label: 'Práctica',
            text: 'Perfiles de usuario: perfil temporal, perfil corrupto (diagnostico y reparacion), y cache de credenciales (quien bloquea la cuenta: el movil con contrasena vieja).',
          },
          {
            id: 'rmhd-f12-2',
            label: 'Práctica',
            text: 'Windows Update fallido: leer CBS.log/Get-WindowsUpdate, DISM RestoreHealth, wusa /uninstall y cuando reimagear deja de ser rendirselo.',
          },
          {
            id: 'rmhd-f12-3',
            label: 'Conceptos Clave',
            text: 'BitLocker de extremo a extremo: por que pide clave, TPM, recuperacion desde el portal y el protocolo de verificacion antes de dar la clave.',
          },
        ],
      },
      {
        id: 'rmhd-f13',
        number: 13,
        title: 'Microsoft 365 & Exchange/Outlook',
        items: [
          {
            id: 'rmhd-f13-1',
            label: 'Conceptos Clave',
            text: 'El ecosistema: Exchange Online, Outlook (modo cache/OST vs OWA), Teams, OneDrive/KFM, SharePoint y como se diagnostica "correo no llega / no sincroniza".',
          },
          {
            id: 'rmhd-f13-2',
            label: 'Práctica',
            text: 'Operativa M365 de L1: licencias (SKU sin asignar = activacion fallida), Service Health antes de debuguear, perfil de Outlook y OST, buzones llenos y shared mailboxes. Los tickets del dataset (dia 2 del proyecto final) cierran con la comprobacion de estado del servicio documentada.',
          },
        ],
      },
      {
        id: 'rmhd-f14',
        number: 14,
        title: 'Entra ID & Intune (Fundamentals)',
        note: 'Version SOPORTE de la identidad y el endpoint: lo justo para operar, sin duplicar la profundidad del roadmap IAM.',
        items: [
          {
            id: 'rmhd-f14-1',
            label: 'Conceptos Clave',
            text: 'Entra ID desde el soporte: usuarios, grupos, MFA (metodos y re-registro), SSPR, sign-in logs basicos y los estados de dispositivo (registered/joined/hybrid).',
          },
          {
            id: 'rmhd-f14-2',
            label: 'Práctica',
            text: 'Intune/Autopilot de L1: enrollment, Company Portal, sync/check-in, politicas de cumplimiento y que significa (y como se reporta) un dispositivo no conforme.',
          },
          {
            id: 'rmhd-f14-3',
            label: 'Diagnóstico',
            text: 'Saber leer un error de login (AADSTS 5xxxx) y un dsregcmd /status para decidir: lo resuelvo, lo re-registro o escalo a IAM/Cloud.',
          },
        ],
      },
      {
        id: 'rmhd-f15',
        number: 15,
        title: 'PowerShell para Soporte',
        items: [
          {
            id: 'rmhd-f15-1',
            label: 'Práctica',
            text: 'Cmdlets de soporte como rutina: Get-Service/Restart-Service, Get-Process, Get-WinEvent (filtrar por ID/tiempo), Test-NetConnection y Get-NetIPConfiguration.',
          },
          {
            id: 'rmhd-f15-2',
            label: 'Práctica',
            text: 'Un primer reporte: exportar usuarios bloqueados/inactivos o equipos sin contacto en semanas a CSV — el puente natural hacia tareas de IAM. Higiene operativa incluida: nunca ejecutar un script que no entiendes en produccion.',
          },
        ],
      },
      {
        id: 'rmhd-f16',
        number: 16,
        title: 'Acceso Remoto & Soporte a Distancia',
        items: [
          {
            id: 'rmhd-f16-1',
            label: 'Práctica',
            text: 'RDP (mstsc): conectividad, credenciales, sesion tomada y cuando NO forzar. AnyDesk/herramientas guiadas: pedir permiso, anunciar que haces, cerrar sesion.',
          },
          {
            id: 'rmhd-f16-2',
            label: 'Conceptos Clave',
            text: 'Soporte remoto SEGURO: grabar/ registrar sesiones, nunca pedir la contrasena del usuario (compartir pantalla, no credenciales) y el acceso temporal revocable. Incluye la VPN del usuario: cliente → credenciales/MFA → tunel → recurso, con el error documentado antes de escalar a Redes.',
          },
        ],
      },
      {
        id: 'rmhd-f17',
        number: 17,
        title: 'Troubleshooting Avanzado Multisistema',
        note: 'Integracion final de L2: cruzar capas sin perder el metodo.',
        items: [
          {
            id: 'rmhd-f17-1',
            label: 'Práctica',
            text: 'Casos que cruzan capas: "la app cloud no me abre" → DNS → proxy → login M365 → Conditional Access (leer el mensaje, no adivinar) → escalar a IAM con contexto.',
          },
          {
            id: 'rmhd-f17-2',
            label: 'Práctica',
            text: 'Incidentes mayores como L2 puente: diagnostico de servicio caido (spooler de servidor, DHCP de planta, correo M365), comunicacion y escalamiento ordenado.',
          },
          {
            id: 'rmhd-f17-3',
            label: 'Evidencia',
            text: 'Post-mortem personal de un incidente mayor del dataset: linea de tiempo, causa, que faltaba en la KB y que articulo escribes para la proxima vez.',
          },
        ],
      },
    ],
  },
  {
    id: 'rmhd-t3',
    title: 'TIER 3 — HELPDESK → IAM',
    subtitle:
      'El puente deliberado: usar el dominio de soporte como base para saltar al roadmap Junior IAM (roadmapData.ts). Aqui NO se repite ese roadmap: se prepara el salto.',
    phases: [
      {
        id: 'rmhd-f18',
        number: 18,
        title: 'Ciclo de Vida de Cuentas (JML desde Soporte)',
        items: [
          {
            id: 'rmhd-f18-1',
            label: 'Conceptos Clave',
            text: 'Joiner/Mover/Leaver visto desde el service desk: alta con aprobacion, cambio de puesto (= permisos nuevos y REVOCAR los viejos) y baja (disable → limpiar).',
          },
          {
            id: 'rmhd-f18-2',
            label: 'Práctica',
            text: 'Ejecutar el lab "Onboarding L1" de VaultNotes: crear cuenta, grupos birthright por matriz, licencia, MFA/SSPR y evidencia — sin saltarse la verificacion de identidad.',
          },
          {
            id: 'rmhd-f18-3',
            label: 'Entrevista',
            text: 'Explicar por que el 80% de los errores de acceso del dia a dia son JML mal ejecutados (grupo que sobra, licencia que falta, cuenta que no se deshabilito).',
          },
        ],
      },
      {
        id: 'rmhd-f19',
        number: 19,
        title: 'Grupos & RBAC Operativo',
        items: [
          {
            id: 'rmhd-f19-1',
            label: 'Conceptos Clave',
            text: 'Grupos como unidad de permiso (no dar acceso a personas): pertenencia efectiva, anidado controlado y el problema del grupo que "sirve para todo".',
          },
          {
            id: 'rmhd-f19-2',
            label: 'Práctica',
            text: 'Responder "necesito acceso a X" con el flujo correcto: que grupo exacto, quien aprueba (owner del recurso), ticket con justificacion y evidencia de la asignacion.',
          },
          {
            id: 'rmhd-f19-3',
            label: 'Conceptos Clave',
            text: 'Minimo privilegio y SoD aplicados al soporte: por que el HelpDesk NO tiene admin de dominio y como se delega (delegacion de reset, JUSTO lo necesario).',
          },
        ],
      },
      {
        id: 'rmhd-f20',
        number: 20,
        title: 'Puente a la Gobernanza de Identidad',
        note: 'Vocabulario y reflejos de IAM — la profundidad (reviews, PIM, IGA) vive en el roadmap principal.',
        items: [
          {
            id: 'rmhd-f20-1',
            label: 'Conceptos Clave',
            text: 'Access requests y flujos de aprobacion (a-dos-niveles), access reviews (por que existen y que le pasa al L1 que no las alimenta) y provisioning/deprovisioning automatizado.',
          },
          {
            id: 'rmhd-f20-2',
            label: 'Conceptos Clave',
            text: 'Cuentas privilegiadas: como se ve PIM desde el soporte (activacion temporal, justificacion) y por que "admin permanente" es la senal de alarma que reportaras.',
          },
          {
            id: 'rmhd-f20-3',
            label: 'Práctica',
            text: 'Escalamiento IAM correcto: detectar en tus tickets (equipos de AD, cuentas dormientes, accesos ruidosos) los casos que deben ir a Identity, con el contexto listo.',
          },
        ],
      },
      {
        id: 'rmhd-f21',
        number: 21,
        title: 'Auditoría, Evidencia & Trazabilidad',
        items: [
          {
            id: 'rmhd-f21-1',
            label: 'Conceptos Clave',
            text: 'El ticket como evidencia auditable: justificacion, aprobador, que se cambio, cuando y quien lo verifico. Escribir para el auditor que llegara en 2 anos.',
          },
          {
            id: 'rmhd-f21-2',
            label: 'Práctica',
            text: 'Eventos de seguridad relevantes de tu operativa: 4740 (bloqueo), 4624/4625 (login), 4720/4726 (alta/baja), 4728/4732 (grupos) — leerlos en Event Viewer/Entra logs.',
          },
          {
            id: 'rmhd-f21-3',
            label: 'Evidencia',
            text: 'Un mini-informe de auditoria de tu propia operativa simulada: 10 tickets revisados, que falta en cada uno para ser "evidencia" y corregirlo.',
          },
        ],
      },
      {
        id: 'rmhd-f22',
        number: 22,
        title: 'Escalamiento a SOC & Security Handoff',
        items: [
          {
            id: 'rmhd-f22-1',
            label: 'Conceptos Clave',
            text: 'Los traspasos que dominara un IAM analyst: HelpDesk → SOC (compromiso, phishing, malware) y HelpDesk → IAM (accesos, grupos, JML). Que paquete entrega cada uno.',
          },
          {
            id: 'rmhd-f22-2',
            label: 'Práctica',
            text: 'Los tickets de seguridad del dataset (phishing, vishing, MFA fraudulento, solicitud de privilegios): escalarlos con la cadena Identify → Preserve → Escalate documentada.',
          },
          {
            id: 'rmhd-f22-3',
            label: 'Entrevista',
            text: 'Contar la historia del puente: "soporte me enseno identidad desde abajo" — como L1 → L2 → IAM, con ejemplos de tickets propios (narrativa de entrevista).',
          },
        ],
      },
    ],
  },
  {
    id: 'rmhd-final',
    title: 'PROYECTO FINAL — SERVICE DESK SIMULADO',
    subtitle:
      '30 tickets de la "primera semana" en el service desk de Nexora S.A. (dataset hdt-019..hdt-048) trabajados de punta a punta + portafolio de evidencia.',
    phases: [
      {
        id: 'rmhd-f23',
        number: 23,
        title: 'Primera Semana en Nexora (30 tickets)',
        items: [
          {
            id: 'rmhd-f23-1',
            label: 'Día 1-2',
            text: 'Trabajar los tickets basicos y M365 (passwords, impresoras, Outlook, Teams, OneDrive) con triage correcto y KB aplicada en cada cierre.',
          },
          {
            id: 'rmhd-f23-2',
            label: 'Día 3-4',
            text: 'Trabajar los tickets de red y Windows (DNS/DHCP/Wi-Fi/VPN, lento/update/disco/BitLocker/BSOD) documentando el diagnostico diferencial en cada uno.',
          },
          {
            id: 'rmhd-f23-3',
            label: 'Día 5',
            text: 'Trabajar los tickets de seguridad + JML (phishing, MFA, vishing, offboarding, privilegios) con escalamiento correcto y evidencia preservada.',
          },
          {
            id: 'rmhd-f23-4',
            label: 'Portafolio',
            text: 'Cerrar con un informe Markdown exportable: metricas propias (FCR simulada, escalamientos, MTTR por area), 2 KB nuevas escritas por ti y la lista de habilidades demostradas — lista para citarla en entrevistas y engancharla con el roadmap Junior IAM.',
          },
        ],
      },
    ],
  },
];

/** Todos los ítems del roadmap HelpDesk (flatten) — para el seed de la DB. */
export const ROADMAP_HD_ALL_ITEM_IDS: string[] = ROADMAP_HD_TIERS.flatMap((t) =>
  t.phases.flatMap((p) => p.items.map((i) => i.id))
);
