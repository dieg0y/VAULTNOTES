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
          {
            id: 'rmhd-f3-4',
            label: 'Práctica',
            text: 'Monitor de confiabilidad (perfmon /rel) como herramienta de L1: linea de tiempo de crashes y fallas de apps y hardware, cruzado con Event Viewer (Application Error 1000, Windows Error Reporting) para responder con accion concreta: driver, parche o reinstalacion limpia. Es la respuesta profesional al clasico "se me apaga solo y no se por que".',
          },
          {
            id: 'rmhd-f3-5',
            label: 'Conceptos Clave',
            text: 'Usuario estandar vs admin local: UAC y el prompt "necesita permiso de administrador", instalaciones que quedan en HKLM vs HKCU y el sintoma tipico de la app que solo falla con el usuario estandar. Regla de soporte: no le das admin al usuario para "resolver rapido" — encuentras el permiso real que la aplicacion necesita y lo documentas en el ticket.',
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
          {
            id: 'rmhd-f6-4',
            label: 'Práctica',
            text: 'SLA en vivo: revisa el aging report (tickets por vencer, los mas viejos, los sin actualizar), toca cada ticket cada 24-48h aunque sea para registrar "sigo esperando al proveedor" y conoce tus numeros personales: FCR, tickets escalados y CSAT de tus cierres. El SLA no es letra pequena: es lo que respalda tu prioridad cuando para el usuario todo es "urgente".',
          },
          {
            id: 'rmhd-f6-5',
            label: 'Práctica',
            text: 'El paquete de escalamiento como plantilla fija: sintoma verificable, datos del equipo/usuario, pasos hechos con su resultado, hipotesis actual, impacto y usuario avisado. Llenala ANTES de escalar: "te paso el caso" sin paquete no es escalar, es botar la pelota — y el L2 te lo devuelve con menos contexto del que salio.',
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
          {
            id: 'rmhd-f7-3',
            label: 'Práctica',
            text: 'Tono en chat y correo: saludo con nombre, parrafos cortos, cero jerga, plantillas reutilizables para apertura, actualizacion y cierre, y plazos prometidos que el SLA respalda. En chat no escribas la tesis: escribe la accion, el tiempo estimado y cuando sera la siguiente actualizacion. Guarda tus 3 plantillas maestras en VaultNotes: son tu respaldo en el dia ocupado.',
          },
          {
            id: 'rmhd-f7-4',
            label: 'Práctica',
            text: 'Decir no sin quemar la relacion: "no puedo darte la clave sin verificar identidad, pero puedo hacer X ahora mismo". Ofrece siempre la alternativa (fluirlo por el canal correcto, escalar con el dueño, agendar), registra el rechazo y la razon en el ticket y explica la politica en una frase — no la discutas: aplicala y ofrece el siguiente paso.',
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
          {
            id: 'rmhd-f8-4',
            label: 'Práctica',
            text: 'KB que la gente use: titulo = el sintoma del usuario (no "problema de OST" sino "Outlook no abre y dice que no encuentra el archivo de datos"), cuerpo sintoma → causa → pasos → verificacion, capturas solo las necesarias, dueño y fecha de revision al pie. Y la parte que nadie hace: retirar la KB obsoleta, que cuesta mas tickets de los que ahorra.',
          },
          {
            id: 'rmhd-f8-5',
            label: 'Práctica',
            text: 'KB como pipeline desde tickets: detecta el sintoma que se repite 3+ veces en el mes, conviertelo en articulo, enlazalo en los cierres siguientes (self-service) y mide su uso. El feedback de otros L1 ("me falto el paso X") es lo que convierte una nota personal en un activo real del service desk — responde ese feedback editando, no defendiendo.',
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
          {
            id: 'rmhd-f9-4',
            label: 'Práctica',
            text: 'Protocolo de reset verificado en 4 pasos: verificar identidad (canal alternativo o dato que solo el usuario sabe) → resetear → forzar cambio en el proximo login → confirmar que entro. Simulacro de vishing: un companero te llama pidiendo el reset con datos "robados" y tu documentas que pediste y que rechazaste. Ese drill con la transcripcion sanitizada es historia de entrevista.',
          },
        ],
      },
    ],
  },
  {
    id: 'rmhd-t2',
    title: 'TIER 2 — L2 / INFRAESTRUCTURA',
    subtitle:
      'Lo que convierte un L1 en L2: dominio de dominio corporativo, Microsoft 365, endpoints gestionados, despliegue de estaciones y activos, y PowerShell. Tambien es la moneda de cambio para entrar a IAM.',
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
          {
            id: 'rmhd-f10-4',
            label: 'Diagnóstico',
            text: 'Rastrear el origen del bloqueo con el 4740: el evento trae la maquina desde donde vinieron los intentos que agotaron el lockout (caller computer name). Causas clasicas: movil con la contrasena vieja, unidad mapeada con credencial guardada, tarea programada o servicio viejo. Lee el 4740 en el DC con Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4740} y cierra el ticket con la nota al usuario para que no se repita cada lunes.',
          },
          {
            id: 'rmhd-f10-5',
            label: 'Práctica',
            text: 'Grupos en la operativa diaria: Get-ADPrincipalGroupMembership para ver de donde viene el acceso efectivo, Add-ADGroupMember/Remove-ADGroupMember SOLO con ticket y aprobacion del dueño del recurso, y como auditar un grupo anidado hasta la pertenencia final. Nunca "agregalo a Administradores para que avance": el atajo de hoy es el hallazgo de auditoria del ano proximo.',
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
          {
            id: 'rmhd-f13-3',
            label: 'Práctica',
            text: 'Licencias paso a paso: el diagnostico de "no activa Office / Teams bloqueado / OneDrive sin sitio" es casi siempre licencia sin asignar; asignar y quitar desde el admin center, revisar que servicios trae el plan y consultar el reporte de licencias disponibles antes de un alta. Secuencia de alta real: crear usuario → licencia → esperar el provisioning → probar con el usuario antes de cerrar el ticket.',
          },
          {
            id: 'rmhd-f13-4',
            label: 'Práctica',
            text: 'Shared mailboxes y grupos: crear shared mailbox (no consume licencia) y dar Full Access + Send As, quitar automapping cuando el buzon pesa en el Outlook del equipo; y elegir bien el vehiculo: DL clasica para difusion, grupo M365 para colaborar (Teams/Planner/SharePoint), shared mailbox para buzon de equipo. El ticket "que el correo del equipo me llegue a mi Outlook" se responde con esto.',
          },
          {
            id: 'rmhd-f13-5',
            label: 'Práctica',
            text: 'Teams para soporte: agregar y quitar miembros y dueños de equipo, invitado externo (guest) con su aprobacion, y el diagnostico del "Teams no me entra": web vs cliente de escritorio → limpiar cache (%appdata%\\Microsoft\\Teams) → perfil → Service Health antes de culpar al equipo. Cierre estandar documentado: entra en web = problema de cliente; no entra en web = escalado con la pantalla del error exacto.',
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
          {
            id: 'rmhd-f14-4',
            label: 'Práctica',
            text: 'Acciones remotas de Intune desde el admin center: Sync, Restart, Remote Lock, Fresh Start/Autopilot Reset y Wipe — y lo que significa cada una (Wipe = disco limpio para reasignar; Retire = borra solo lo corporativo). Criterio: equipo perdido = Remote Lock con mensaje; equipo que se reasigna = Wipe. Documenta en el ticket la accion, la hora y lo que el usuario vera en pantalla.',
          },
          {
            id: 'rmhd-f14-5',
            label: 'Práctica',
            text: 'Politicas de cumplimiento leidas como soporte: que chequean (BitLocker, antivirus/EDR activo, parches al dia, version de SO), el periodo de gracia y los estados Compliant / Non-compliant / In Grace / Not evaluated. Y la consecuencia real: con Conditional Access, el equipo no conforme se queda sin correo ni Teams. Diagnostico del "no me sincroniza el correo": compliance del dispositivo ANTES de culpar a la app.',
          },
          {
            id: 'rmhd-f14-6',
            label: 'Práctica',
            text: 'BitLocker desde Intune/Entra: donde viven las recovery keys (dispositivo del usuario → BitLocker recovery keys), verificacion de identidad antes de leerla en voz alta, rotacion de la clave tras el uso y el flujo cuando NO existe (la clave nunca subio al tenant: escalar al admin de Intune con hostname y serial). Monta el caso del TPM que pidio clave tras un cambio de hardware y cronometra tu respuesta con el protocolo bien aplicado.',
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
          {
            id: 'rmhd-f16-3',
            label: 'Conceptos Clave',
            text: 'Etiqueta del soporte remoto: pedir permiso antes de tomar control, anunciar cada accion ("voy a abrir el panel de control"), no cerrar la sesion del usuario sin avisar, grabar la sesion si el usuario acepta (y decirle donde queda guardada), no abrir buzones ni archivos personales y bloquear la pantalla al terminar con resumen de lo hecho. La sesion remota es el unico momento en que el usuario VE como trabajas: es tu entrevista en vivo.',
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
      {
        id: 'rmhd-f24',
        number: 18,
        title: 'Despliegue y Provisioning de Estaciones',
        note: 'El L2 de verdad prepara puestos, no solo los repara: alta de equipo nuevo, migracion de usuario y retiro, de punta a punta y con checklist.',
        items: [
          {
            id: 'rmhd-f24-1',
            label: 'Conceptos Clave',
            text: 'Ciclo de vida del puesto de trabajo: compra/recepcion → preparacion (imagen o enrollment, inventario, etiqueta, nombre) → entrega con checklist → soporte → retiro. Convenciones que te ahorran tickets: hostname por norma (ej. LAP-FIN-0142, nunca "PC-Nuevo"), serial en cada ticket de hardware y estado del activo siempre visible (en uso, prestamo, bodega, reparacion, retirado).',
          },
          {
            id: 'rmhd-f24-2',
            label: 'Práctica',
            text: 'Preparar un equipo nuevo con checklist: SO parcheado, unido al dominio o enrolado en Intune, Office/365 activado, antivirus/EDR instalado y reportando, BitLocker activo con la clave en el tenant, drivers y perifericos probados (dock, monitores, audio, camara) y login de PRUEBA con el usuario real antes de entregar. La checklist firmada en la entrega evita el clasico "me lo entregaron incompleto".',
          },
          {
            id: 'rmhd-f24-3',
            label: 'Conceptos Clave',
            text: 'Autopilot como estandar moderno vs imagen manual: perfil de despliegue + ESP (Enrollment Status Page) → el usuario enciende el equipo y espera, sin que soporte lo toque fisicamente; el proveedor puede precargar el hash del equipo. La imagen maestra con sysprep + MDT sigue viva en empresas medianas y aparece en entrevistas: conoce ambos modelos y sus equivalencias.',
          },
          {
            id: 'rmhd-f24-4',
            label: 'Práctica',
            text: 'Migracion de usuario a equipo nuevo: perfil y datos (USMT/ForensiT como concepto, OneDrive KFM como via moderna), reconfigurar Outlook, OneDrive, impresoras y Wi-Fi, y verificar en el equipo VIEJO que no queda nada (busqueda final + limpieza de credenciales guardadas) antes del retiro. La migracion se entrega en una sesion con el usuario delante, no "en la semana que pueda".',
          },
          {
            id: 'rmhd-f24-5',
            label: 'Evidencia',
            text: 'Runbook de alta de puesto de trabajo en VaultNotes: checklist de preparacion, checklist de entrega firmada (accesos, correo, impresion, perifericos), checklist de migracion y flujo de retiro — con los tiempos reales medidos de una preparacion completa hecha por ti. Ese runbook es el artefacto que un jefe de soporte reconoce al instante.',
          },
        ],
      },
      {
        id: 'rmhd-f25',
        number: 19,
        title: 'Activos, Licencias y Garantias',
        note: 'Lo invisible del service desk hasta que falta: donde esta cada equipo, que licencia tiene y si todavia tiene garantia. Quien lo domina cierra casos que otros dejan abiertos.',
        items: [
          {
            id: 'rmhd-f25-1',
            label: 'Conceptos Clave',
            text: 'Gestion de activos para soporte: CMDB/inventario (GLPI, Snipe-IT, ServiceNow Assets), la relacion ticket ↔ activo (hostname y serial en todo ticket de hardware) y el estado del activo siempre actualizado. "No se donde esta ese equipo" es un ticket reabierto esperando pasar, y el activo sin inventario no existe para soporte.',
          },
          {
            id: 'rmhd-f25-2',
            label: 'Práctica',
            text: 'Licencias de software en el puesto: inventario de instalado vs comprado (base de toda auditoria de software), activaciones y claves administradas en la baula de credenciales (no en el Excel compartido), que hacer con el software sin licencia que instala el usuario (riesgo + alternativa legal) y la transferencia de licencia cuando un equipo se retira. En el lab: inventaria tu propio equipo y clasifica cada entrada.',
          },
          {
            id: 'rmhd-f25-3',
            label: 'Práctica',
            text: 'Garantias y RMA: consultar cobertura por serial en el portal del fabricante (Dell, Lenovo, HP), abrir el caso RMA con el diagnostico documentado y evidencia (SMART, test de memoria, capturas), y prestar equipo del pool mientras llega el repuesto. El L2 que sabe abrir un RMA bien resuelve en 5 dias lo que otros cierran a medias como "falla de hardware".',
          },
          {
            id: 'rmhd-f25-4',
            label: 'Conceptos Clave',
            text: 'El contrato en el que vives: SLA del proveedor de hardware (tiempo de respuesta, on-site vs llevar a servicio), soporte del fabricante (ProSupport y equivalentes) y cuando el caso es del proveedor y no tuyo (pieza cubierta, umbral de costo, repuesto en camino). Guarda esa matriz junto al runbook de RMA: es la diferencia entre escalar bien y escalar a ciegas.',
          },
          {
            id: 'rmhd-f25-5',
            label: 'Evidencia',
            text: 'Inventario vivo del lab en VaultNotes: 10 activos con hostname, serial, usuario asignado, estado, garantia con fecha de vencimiento y ultima revision; mas el flujo documentado alta → prestamo → retiro con sus responsables. Ese artefacto es tu mini-CMDB demostrable en entrevista.',
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
        number: 20,
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
        number: 21,
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
        number: 22,
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
        number: 23,
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
        number: 24,
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
        number: 25,
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
