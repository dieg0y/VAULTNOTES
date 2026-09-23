/**
 * HdTicketTriageTool.tsx — "Ticket Triage Parser" (FASE 2 grupo A → V6 FASE 3).
 *
 * El usuario pega el texto crudo de un ticket → un motor de keywords offline
 * (regex español, 12+ patrones por cada una de las 7 categorías HelpDesk)
 * produce: categoría + subcategoría, impacto/urgencia/prioridad (matriz
 * impacto×urgencia con P1 reservado a multiusuario o servicio caído), SLA
 * sugerido editable, troubleshooting inicial, información requerida, causas
 * raíz rankeadas, criterios de escalación, preocupaciones de seguridad y 1-3
 * artículos KB del dataset estático HELPDESK_KB_ARTICLES (match de keywords
 * en title/symptoms — solo referencia, sin navegación).
 *
 * Transparencia del parser: cada sección muestra qué keywords la dispararon.
 *
 * V6 FASE 3 — [Enrich Online] (OPCIONAL y EXPLÍCITO): tras el análisis
 * offline aparece un botón que, solo con clic del usuario (nunca auto), y
 * solo si el navegador está online, envía el texto del ticket al backend
 * local de la app (/api/enrich-ticket) y muestra las sugerencias de IA en
 * un panel separado y claramente marcado, SIN sobrescribir el análisis
 * offline. Sin clic, la tool es 100% offline como siempre. Consentimiento
 * de primer uso persistido en localStorage.
 *
 * Exportación: [Copiar análisis] (texto plano), [Guardar en Data & Intel]
 * (kind event, markdown) y [Añadir a Notas] (buildNoteHtmlTable + escapeHtml).
 *
 * Los tiempos SLA son de ejemplo educativo, configurables en la propia tool.
 */
'use client';

import React, { useState } from 'react';
import {
  Search, Trash2, FileText, Copy, Check, BookOpen, Database, ShieldAlert, ArrowRight, CloudOff, Sparkles,
} from 'lucide-react';
import { HELPDESK_KB_ARTICLES } from '../../../data/helpDeskKB';
import { useNoteStore } from '../../../store/noteStore';
import { useIntelStore } from '../../../store/intelStore';
import { useIsOnline } from '../../../integrations/online';
import {
  taCls, btnPrimary, btnGhost, Row, InfoBanner, ErrorBanner, Field,
  buildNoteHtmlTable, useAddToNoteToast,
} from '../_shared';
import { escapeHtml } from '../../../utils/escapeHtml';

/* ---------- tipos ---------- */

type Priority = 'P1' | 'P2' | 'P3' | 'P4';
type Level3 = 'alta' | 'media' | 'baja';
type SlaSpec = { response: number; resolution: number };
type SlaTable = Record<Priority, SlaSpec>;

type HdCategory =
  | 'HelpDesk - Fundamentos IT'
  | 'HelpDesk - Service Desk / ITSM'
  | 'HelpDesk - Windows / Endpoint'
  | 'HelpDesk - Redes (Networking)'
  | 'HelpDesk - Microsoft 365'
  | 'HelpDesk - AD / Identidad'
  | 'HelpDesk - Seguridad para Soporte';

interface KwEvidence { kw: string; sub: string }
interface TriageAnalysis {
  category: HdCategory;
  subcategory: string;
  unclassified: boolean;
  matchedKeywords: KwEvidence[];
  scoreboard: Array<{ cat: HdCategory; hits: number; kws: string[] }>;
  impact: Level3;
  urgency: Level3;
  priority: Priority;
  priorityReason: string;
  impactEvidence: string[];
  urgencyEvidence: string[];
  troubleshooting: Array<{ title: string; why: string }>;
  requiredInfo: string[];
  rootCauses: Array<{ cause: string; likelihood: string }>;
  escalation: string[];
  securityConcerns: string[];
  kbSuggestions: Array<{ id: string; title: string; matched: string[] }>;
  nextAction: string;
}

/* ---------- SLA de ejemplo (editable) ---------- */

const DEFAULT_SLA: SlaTable = {
  P1: { response: 15, resolution: 240 },   // 15 m / 4 h
  P2: { response: 30, resolution: 480 },   // 30 m / 8 h
  P3: { response: 240, resolution: 1440 }, // 4 h / 24 h
  P4: { response: 480, resolution: 4320 }, // 8 h / 72 h
};

function fmtMins(m: number): string {
  if (m <= 0) return '0 min';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h > 0 ? h + ' h' : ''}${r > 0 ? (h > 0 ? ' ' : '') + r + ' min' : ''}`.trim();
}

/* ---------- matriz impacto × urgencia ---------- */

function priorityMatrix(impact: Level3, urgency: Level3): Priority {
  if (impact === 'alta' && urgency === 'alta') return 'P1';
  if ((impact === 'alta' && urgency === 'media') || (impact === 'media' && urgency === 'alta')) return 'P2';
  if (
    (impact === 'alta' && urgency === 'baja') ||
    (impact === 'media' && urgency === 'media') ||
    (impact === 'baja' && urgency === 'alta')
  ) return 'P3';
  return 'P4';
}

const PRIORITY_DESC: Record<Priority, string> = {
  P1: 'Crítico: afecta a muchos usuarios o deja un servicio caído. Respuesta inmediata y aviso al responsable de turno.',
  P2: 'Alto: usuarios clave bloqueados o incidencia con plazo sensible. Atención prioritaria el mismo día.',
  P3: 'Medio: usuario individual con el flujo afectado pero con alternativa parcial. Cola normal.',
  P4: 'Bajo: consulta o incidencia menor con workaround. Se atiende al liberar la cola.',
};

const P_BADGE: Record<Priority, string> = {
  P1: 'bg-red-500/15 border-red-500/40 text-red-400',
  P2: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
  P3: 'bg-blue-500/15 border-blue-500/40 text-blue-400',
  P4: 'bg-gray-500/15 border-gray-500/30 text-gray-400',
};

/* ---------- motor de keywords: ≥12 reglas por categoría ---------- */

const CATEGORY_ORDER: HdCategory[] = [
  'HelpDesk - Seguridad para Soporte',
  'HelpDesk - AD / Identidad',
  'HelpDesk - Windows / Endpoint',
  'HelpDesk - Microsoft 365',
  'HelpDesk - Redes (Networking)',
  'HelpDesk - Fundamentos IT',
  'HelpDesk - Service Desk / ITSM',
];

const CATEGORY_RULES: Record<HdCategory, Array<{ re: RegExp; sub: string }>> = {
  'HelpDesk - AD / Identidad': [
    { re: /contrase[nñ]a|password/, sub: 'Cuenta / contraseña' },
    { re: /bloquead|locked/, sub: 'Cuenta bloqueada' },
    { re: /deshabilitad|desactivad|suspendid|disabled/, sub: 'Cuenta deshabilitada' },
    { re: /caducad|expirad|vencid/, sub: 'Contraseña caducada' },
    { re: /\bmfa\b|authenticator|doble factor|2fa/, sub: 'MFA' },
    { re: /sspr|autoservicio de contrase[nñ]a/, sub: 'SSPR' },
    { re: /onboarding|alta de (?:usuario|empleado)|nueva incorporaci[oó]n|nuevo empleado|\bjml\b/, sub: 'Onboarding (JML)' },
    { re: /offboarding|baja de (?:usuario|empleado)|desvinculaci[oó]n|[uú]ltimo d[ií]a/, sub: 'Offboarding' },
    { re: /grupo de seguridad|miembro de|agregar a un grupo|quitar del grupo/, sub: 'Grupos / pertenencia' },
    { re: /(?:cuenta|usuario) o contrase[nñ]a (?:es )?incorrect|credenciales/, sub: 'Credenciales inválidas' },
    { re: /active directory|controlador de dominio|\bdc\b|dominio/, sub: 'AD / dominio' },
    { re: /get-aduser|unlock-adaccount|enable-adaccount|set-adaccountpassword|search-adaccount/, sub: 'Cmdlets de cuenta' },
    { re: /cach[eé] de credenciales|solo (?:en|desde) un (?:equipo|ordenador)|en otro equipo s[ií] funciona/, sub: 'Caché de credenciales' },
    { re: /no (?:puedo|puede) (?:entrar|iniciar sesi[oó]n|loguear|acceder)|inicio de sesi[oó]n fallid/, sub: 'Inicio de sesión' },
  ],
  'HelpDesk - Microsoft 365': [
    { re: /outlook|\bowa\b|correo|e-?mail|buz[oó]n/, sub: 'Outlook / correo' },
    { re: /teams|reuni[oó]n (?:de )?teams|canal de teams/, sub: 'Teams' },
    { re: /onedrive|sharepoint|files on-demand|sincroniza (?:los )?archivos/, sub: 'OneDrive / SharePoint' },
    { re: /no (?:recibo|me llegan|le llegan) (?:correos|mails|emails)|no (?:puedo|puede) (?:enviar|mandar) (?:correos|mails|emails)/, sub: 'Flujo de correo' },
    { re: /buz[oó]n lleno|cuota de buz[oó]n|adjunto (?:demasiado )?grande/, sub: 'Cuota de buzón' },
    { re: /licencia (?:de )?(?:m365|office|microsoft)|sin licencia|exchange online/, sub: 'Licencias M365' },
    { re: /\bword\b|\bexcel\b|powerpoint|office (?:no abre|se cierra)|apps de office/, sub: 'Apps de Office' },
    { re: /calendario|\bcita\b|reserva de sala/, sub: 'Calendario' },
    { re: /intune|portal de empresa|no inscrito|no conforme|acceso condicional/, sub: 'Intune / cumplimiento' },
    { re: /\bost\b|autodiscover|perfil de outlook|modo sin conexi[oó]n|trabajar sin conexi[oó]n/, sub: 'Perfil / OST de Outlook' },
    { re: /complemento|add-?in|outlook no arranca/, sub: 'Complementos de Outlook' },
    { re: /active sync|correo en el m[oó]vil|sincroniza en el m[oó]vil/, sub: 'Móvil / ActiveSync' },
    { re: /bucle de contrase[nñ]a|pide la contrase[nñ]a una y otra vez|iniciar sesi[oó]n en (?:office|outlook|teams)/, sub: 'Autenticación de apps' },
  ],
  'HelpDesk - Redes (Networking)': [
    { re: /wi-?fi|inal[aá]mbric|wireless|\bssid\b/, sub: 'Wi-Fi' },
    { re: /\bvpn\b/, sub: 'VPN' },
    { re: /\bdns\b|nslookup|no resuelve|resoluci[oó]n de nombres/, sub: 'DNS' },
    { re: /\bdhcp\b|apipa|169\.254|sin ip|no recibe ip/, sub: 'DHCP / IP' },
    { re: /internet|navegador no carga|p[aá]ginas? no (?:cargan|abren)|sin conexi[oó]n/, sub: 'Acceso a internet' },
    { re: /unidad mapeada|carpeta compartida|recurso compartido|unidad de red|net use|\bsmb\b/, sub: 'Recursos compartidos' },
    { re: /\brdp\b|escritorio remoto|remote desktop|3389/, sub: 'Acceso remoto (RDP)' },
    { re: /cable de red|ethernet|rj45|toma de red|tester/, sub: 'Cableado físico' },
    { re: /\bping\b|latencia|p[eé]rdida de paquetes|tracert|pathping/, sub: 'Latencia / diagnóstico' },
    { re: /\bswitch\b|\brouter\b|punto de acceso/, sub: 'Infraestructura de red' },
    { re: /proxy|\bpac\b|filtrado web|navegaci[oó]n bloqueada/, sub: 'Proxy / filtrado' },
    { re: /firewall|puerto (?:bloqueado|cerrado)|regla de entrada/, sub: 'Firewall / puertos' },
    { re: /red (?:lenta|va mal)|cortes|intermitente|se desconecta/, sub: 'Estabilidad de red' },
  ],
  'HelpDesk - Windows / Endpoint': [
    { re: /pantalla azul|\bbsod\b|blue screen|c[oó]digo de parada|stop code/, sub: 'BSOD' },
    { re: /lento|lent[ií]sim|cuelga|colgad[oa]|congela|se queda (?:fijo|pillado)/, sub: 'Rendimiento' },
    { re: /no arranca|no enciende el equipo|no pasa del logotipo|winre|no inicia windows/, sub: 'Arranque' },
    { re: /disco lleno|sin espacio|espacio en (?:el )?disco|c:\s*lleno/, sub: 'Almacenamiento' },
    { re: /windows update|actualizaci[oó]n (?:de windows|fallida)|actualizaciones|parche|wusa/, sub: 'Windows Update' },
    { re: /driver|controlador|dispositivo desconocido|tri[aá]ngulo amarillo/, sub: 'Drivers' },
    { re: /perfil temporal|perfil (?:corrupto|da[nñ]ado)/, sub: 'Perfil de usuario' },
    { re: /activaci[oó]n|activar windows|no est[aá] activado|licencia de windows/, sub: 'Activación' },
    { re: /bitlocker|clave de recuperaci[oó]n/, sub: 'BitLocker' },
    { re: /\bdefender\b|antivirus|protecci[oó]n contra amenazas/, sub: 'Antivirus / Defender' },
    { re: /instal(?:ar|aci[oó]n) (?:un )?(?:programa|software|aplicaci[oó]n)|desinstalar|appwiz/, sub: 'Instalación / desinstalación' },
    { re: /explorer\.exe|escritorio (?:en blanco|negro tras iniciar)|men[uú] inicio no (?:responde|abre)/, sub: 'Shell / escritorio' },
    { re: /restaurar sistema|punto de restauraci[oó]n|\bsfc\b|\bdism\b|reparar arranque/, sub: 'Reparación del sistema' },
  ],
  'HelpDesk - Fundamentos IT': [
    { re: /impresora|imprim(?:e|iendo|ir)|spooler|atasco|cola de impresi[oó]n/, sub: 'Impresión' },
    { re: /monitor|proyector|pantalla (?:negra|sin se[nñ]al|no enciende)|segunda pantalla|duplicar pantalla/, sub: 'Monitor / proyector' },
    { re: /rat[oó]n|teclado|mouse|perif[eé]rico|webcam|c[aá]mara web/, sub: 'Periféricos' },
    { re: /dock|docking|estaci[oó]n de acoplamiento|base de conexi[oó]n|usb no (?:funciona|detecta)/, sub: 'Docking / puertos' },
    { re: /altavoz|auriculares|sonido|sin audio|micr[oó]fono no/, sub: 'Audio' },
    { re: /bater[ií]a|cargador|alimentador|no carga|se apaga solo/, sub: 'Energía / batería' },
    { re: /port[aá]til|laptop|sobremesa|workstation|equipo nuevo|equipo de repuesto/, sub: 'Hardware / equipos' },
    { re: /hdmi|\bvga\b|displayport|adaptador de v[ií]deo/, sub: 'Cables de vídeo' },
    { re: /garant[ií]a|\brma\b|aver[ií]a f[ií]sica|pantalla rota|teclado roto/, sub: 'RMA / garantía' },
    { re: /bloq num|teclado en ingl[eé]s|distribuci[oó]n de teclado/, sub: 'Configuración de teclado' },
    { re: /ordenador|\bpc\b|puesto de trabajo/, sub: 'Estaciones de trabajo' },
    { re: /limpieza|mantenimiento f[ií]sico|polvo|recalentamiento|se calienta/, sub: 'Mantenimiento físico' },
    { re: /usb no reconocido|dispositivo usb|pendrive|memoria usb/, sub: 'Dispositivos USB' },
  ],
  'HelpDesk - Service Desk / ITSM': [
    { re: /ticket|incidencia/, sub: 'Ticket' },
    { re: /\bsla\b|acuerdo de nivel|tiempo de (?:respuesta|resoluci[oó]n)/, sub: 'SLA' },
    { re: /prioridad|urgencia|impacto/, sub: 'Priorización' },
    { re: /escalar|escalamiento|escalad|nivel 2|\bl2\b|\bl1\b/, sub: 'Escalación' },
    { re: /base de conocimiento|\bkb\b|art[ií]culo kb/, sub: 'Base de conocimiento' },
    { re: /csat|encuesta|satisfacci[oó]n/, sub: 'Satisfacción (CSAT)' },
    { re: /cola|backlog|carga de trabajo|tiempos de espera/, sub: 'Gestión de cola' },
    { re: /gesti[oó]n de cambios|ventana de mantenimiento|cambio programado|\bchange\b/, sub: 'Gestión de cambios' },
    { re: /causa ra[ií]z|problema conocido|error conocido|gesti[oó]n de problemas/, sub: 'Gestión de problemas' },
    { re: /reincid|vuelve a (?:pasar|ocurrir)|ocurre otra vez|otra vez lo mismo/, sub: 'Reincidencia' },
    { re: /cat[aá]logo de servicios|solicitar (?:un )?servicio|petici[oó]n de servicio/, sub: 'Catálogo / peticiones' },
    { re: /reasign|encamin|grupo de soporte/, sub: 'Encaminamiento' },
  ],
  'HelpDesk - Seguridad para Soporte': [
    { re: /phishing|phising|correo (?:sospechoso|extra[nñ]o)|enlace fraudulento|suplantaci[oó]n/, sub: 'Phishing' },
    { re: /vishing|llamada sospechosa|se hace pasar por|suplanta/, sub: 'Vishing' },
    { re: /virus|malware|ransomware/, sub: 'Malware' },
    { re: /contrase[nñ]a (?:filtrada|comprometida|robada|expuesta)|credenciales (?:filtradas|comprometidas|robadas)|cuenta comprometida/, sub: 'Credenciales comprometidas' },
    { re: /\bbec\b|fraude (?:de |del )?correo|factura falsa|cambio de (?:n[uú]mero de )?cuenta bancaria/, sub: 'BEC / fraude' },
    { re: /usb (?:encontrado|desconocid)|pendrive (?:encontrado|desconocid)|disco externo (?:encontrado|desconocid)/, sub: 'Medios extraíbles' },
    { re: /\brgpd\b|datos personales|fuga de datos|privacidad/, sub: 'Protección de datos' },
    { re: /amenaza|broma|acoso (?:por correo|por mensaje)/, sub: 'Amenazas / acoso' },
    { re: /bypass de mfa|mfa (?:del )?atacante|restablecer mfa|reset (?:de )?mfa/, sub: 'Bypass / abuso de MFA' },
    { re: /scareware|falso antivirus|pop.?up de (?:seguridad|alerta)/, sub: 'Scareware' },
    { re: /\bsoc\b|incidente de seguridad|escalado a seguridad/, sub: 'Coordinación con SOC' },
    { re: /perd[ií] (?:el|mi) m[oó]vil|tel[eé]fono nuevo|se cambi[oó] de m[oó]vil|c[oó]digo de verificaci[oó]n que no llega/, sub: 'Pérdida / cambio de dispositivo MFA' },
  ],
};

/* ---------- señales de impacto / urgencia ---------- */

const MULTIUSER_RE = /varios (?:usuarios|compa[nñ]eros)|muchos usuarios|todo el (?:mundo|departamento|equipo|piso|edificio)|toda (?:la planta|la oficina|el edificio|la empresa|la zona)|nadie (?:puede|consigue|entra|accede|imprime)|todos los (?:usuarios|compa[nñ]eros|del)|multiusuario|departamento entero|m[áa]s de \d+ (?:usuarios|personas)/;
const SERVICEDOWN_RE = /ca[ií]d[oa]|outage|sin servicio|apag[oó]n|servidor ca[ií]do|(?:servidor|sistema|aplicaci[oó]n|web|portal) inaccesible|no funciona (?:el correo|internet|la red|el servicio|teams|outlook|la impresora)/;
const URGENT_RE = /urgen(?:te|cia)|cr[ií]tic[aao]?|producci[oó]n|parad[oa]|cuanto antes|ya mismo|inmediat|deadline|hoy (?:mismo|antes)|necesito ya/;
const BLOCKED_RE = /no (?:puedo|puede|pueden) (?:trabajar|acceder|entrar|imprimir|enviar|abrir)|no me (?:llega|deja|funciona)|acceso denegado|bloquead|sin acceso/;
const SOON_RE = /hoy|ma[nñ]ana|esta semana|lo antes posible/;

/* ---------- troubleshooting / info / causas / escalación / seguridad ---------- */

const TROUBLE_RULES: Array<{ re: RegExp; steps: Array<{ title: string; why: string }> }> = [
  { re: /phishing|phising|correo (?:sospechoso|extra[nñ]o)|vishing|enlace fraudulento/, steps: [
    { title: 'Contener', why: 'No clicar, no responder, no reenviar. Pedir captura del mensaje y avisar de que NO lo borren.' },
    { title: 'Preservar evidencia', why: 'Solicitar el .eml o la URL en texto plano sin abrirla; anotar remitente, asunto y hora.' },
    { title: 'Escalar a SOC', why: 'Si hubo clic o entrega de credenciales, abrir incidente de seguridad de inmediato.' },
  ] },
  { re: /contrase[nñ]a|password|bloquead|locked|caducad|expirad|deshabilitad|credenciales/, steps: [
    { title: 'Verificar identidad con callback', why: 'Devolver la llamada al número registrado en RRHH antes de tocar la cuenta.' },
    { title: 'Comprobar el estado de la cuenta', why: 'Get-ADUser -Properties Enabled,LockedOut,badPwdCount,AccountExpirationDate antes de desbloquear.' },
    { title: 'Buscar el origen del bloqueo', why: 'Si reincidente: evento 4740 y su Caller Computer (credenciales guardadas en móvil u otro equipo).' },
  ] },
  { re: /\bmfa\b|authenticator/, steps: [
    { title: 'Verificación reforzada', why: 'Reset de MFA = operación de alto riesgo: confirmar con el responsable o en persona.' },
    { title: 'Revocar sesiones activas', why: 'Invalidar tokens/refresh antes del re-registro para cortar el acceso a un posible atacante.' },
  ] },
  { re: /outlook|\bowa\b|correo|buz[oó]n|e-?mail/, steps: [
    { title: 'Probar en la web (OWA)', why: 'Descarta cliente vs servicio: si OWA funciona, el problema es de perfil/credenciales locales.' },
    { title: 'Revisar la barra de estado de Outlook', why: 'Modo sin conexión o estado Conectando da la pista del fallo.' },
  ] },
  { re: /wi-?fi|inal[aá]mbric|red|internet|\bdns\b|\bdhcp\b|apipa|ethernet|cable de red/, steps: [
    { title: 'Aislar el alcance', why: '¿Solo este equipo o toda la zona? Cambia por completo el diagnóstico y la prioridad.' },
    { title: 'ipconfig /all', why: 'Anotar IP, máscara, gateway y DNS; una 169.254.x.x indica fallo de DHCP.' },
    { title: 'ping al gateway + nslookup', why: 'Confirma conectividad L2/L3 y resolución de nombres por separado.' },
  ] },
  { re: /\bvpn\b/, steps: [
    { title: 'Verificar conectividad base', why: 'Sin internet no hay VPN: probar ping/una web antes de culpar al cliente VPN.' },
    { title: 'Documentar el error exacto', why: 'El mensaje del cliente VPN distingue credenciales, certificado o gateway caído.' },
  ] },
  { re: /impresora|imprim(?:e|iendo|ir)|spooler|atasco|cola de impresi[oó]n/, steps: [
    { title: 'Inspección física primero', why: 'Encendida, papel, atasco, tóner. Muchos tickets de impresión se resuelven aquí.' },
    { title: 'Ping a la impresora', why: 'Confirma que la cola apunta a una IP alcanzable (y que la IP no cambió).' },
    { title: 'Reiniciar la cola local', why: 'Detener/limpiar la cola y el spooler del usuario antes de tocar drivers.' },
  ] },
  { re: /lento|lent[ií]sim|cuelga|congela|rendimiento/, steps: [
    { title: 'Cuantificar la lentitud', why: '¿Arranque, abrir apps, todo? Sin dato concreto no hay diagnóstico.' },
    { title: 'Administrador de tareas', why: 'Identificar el proceso que consume CPU/disco; anotar valores para el ticket.' },
    { title: 'Comprobar espacio en disco', why: 'Un C: al 95% degrada todo el sistema (pagefile, actualizaciones, cachés).' },
  ] },
  { re: /pantalla azul|\bbsod\b|blue screen|c[oó]digo de parada/, steps: [
    { title: 'Documentar el código de parada', why: 'El stop code (ej. IRQL_NOT_LESS_OR_EQUAL) dirige la investigación.' },
    { title: 'Visor de eventos', why: 'Eventos críticos justo antes del reinicio; correlacionar con cambios recientes.' },
    { title: 'Descartar hardware reciente', why: 'RAM o periférico añadido hace poco: quitarlo y reproducir.' },
  ] },
  { re: /monitor|proyector|pantalla (?:negra|sin se[nñ]al)|hdmi|\bvga\b|displayport/, steps: [
    { title: 'Reasar cableado', why: 'Reconectar cable y probar con otro cable/puerto: causa nº1 de sin señal.' },
    { title: 'Probar con otro equipo o monitor', why: 'Aísla si el fallo es del monitor, del cable o del equipo del usuario.' },
  ] },
  { re: /teams|reuni[oó]n (?:de )?teams/, steps: [
    { title: 'Probar el audio fuera de Teams', why: 'Un vídeo local con sonido descarta el hardware antes de culpar a la app.' },
    { title: 'Revisar dispositivos en Teams', why: 'Configuración > Dispositivos: comprobar que el auricular/micro correcto está elegido.' },
  ] },
  { re: /onedrive|sharepoint|sincroniza/, steps: [
    { title: 'Icono y estado de OneDrive', why: 'Pausado, sesión cerrada o en rojo: cada estado tiene su propia solución.' },
    { title: 'Reiniciar OneDrive limpio', why: 'Cerrar y reabrir; si persiste, pausar y reanudar la sincronización.' },
  ] },
  { re: /no arranca|no enciende el equipo|no inicia windows|winre/, steps: [
    { title: 'LEDs y alimentación', why: '¿Hay LED de encendido? Probar cargador/otra toma antes de asumir fallo grave.' },
    { title: 'Entrar a WinRE', why: 'Forzar 3 reinicios para llegar a Reparación de inicio y recuperar el arranque.' },
  ] },
];

const BASE_INFO: string[] = [
  'Nombre de usuario / número de empleado',
  'Hostname del equipo (o service tag si es portátil)',
  'Texto del error EXACTO (captura si es posible)',
  '¿Desde cuándo ocurre y qué cambió justo antes?',
  '¿Solo le pasa a usted o a más gente del entorno?',
  'Teléfono registrado para devolver la llamada (verificación)',
];

const INFO_RULES: Array<{ re: RegExp; items: string[] }> = [
  { re: /contrase[nñ]a|bloquead|locked|credenciales|\bmfa\b|deshabilitad/, items: [
    'Número registrado en RRHH para la verificación de identidad',
    '¿Tiene SSPR registrado o es la primera vez?',
    '¿Ha cambiado de teléfono o equipo últimamente?',
  ] },
  { re: /\bvpn\b/, items: ['Cliente VPN y versión', 'Mensaje de error literal del cliente'] },
  { re: /wi-?fi|\bssid\b|inal[aá]mbric/, items: ['Red (SSID) a la que intenta conectarse y si es cableado o inalámbrico'] },
  { re: /pantalla azul|\bbsod\b|c[oó]digo de parada/, items: ['Código de parada que aparece en pantalla'] },
  { re: /outlook|correo|buz[oó]n/, items: ['¿Probó ya en la web (OWA / office.com)?'] },
  { re: /impresora|spooler/, items: ['Nombre de la cola de impresión y modelo de impresora'] },
  { re: /phishing|phising|vishing|virus|malware/, items: ['Remitente, asunto y hora del mensaje sospechoso', '¿Clicó el enlace o entregó credenciales?'] },
  { re: /licencia (?:de )?(?:m365|office)|sin licencia/, items: ['¿Qué licencia debería tener según su puesto?'] },
];

const CAUSE_RULES: Array<{ re: RegExp; causes: Array<{ cause: string; likelihood: string }> }> = [
  { re: /bloquead|locked|pide la contrase[nñ]a una y otra vez|bucle de contrase[nñ]a/, causes: [
    { cause: 'Credenciales guardadas en el móvil o segundo equipo (causa nº1 de re-bloqueo)', likelihood: 'Probable' },
    { cause: 'Contraseña olvidada o tecleada con distribución de teclado equivocada', likelihood: 'Probable' },
    { cause: 'App o servicio ejecutándose con la contraseña anterior', likelihood: 'Posible' },
    { cause: 'Intento de adivinación de contraseñas (posible ataque)', likelihood: 'Menos frecuente' },
  ] },
  { re: /lento|lent[ií]sim|cuelga|congela/, causes: [
    { cause: 'Programas de inicio acumulados y carga en segundo plano', likelihood: 'Probable' },
    { cause: 'Disco casi lleno o HDD degradándose', likelihood: 'Posible' },
    { cause: 'Actualización o antivirus en pleno análisis', likelihood: 'Posible' },
    { cause: 'Malware consumiendo recursos', likelihood: 'Menos frecuente' },
  ] },
  { re: /wi-?fi|\bssid\b|inal[aá]mbric|cortes|intermitente/, causes: [
    { cause: 'Cobertura Wi-Fi débil en la zona de trabajo', likelihood: 'Probable' },
    { cause: 'Gestión de energía que suspende el adaptador', likelihood: 'Posible' },
    { cause: 'Fallo del AP/switch del segmento (si afecta a más gente)', likelihood: 'Menos frecuente' },
  ] },
  { re: /pantalla azul|\bbsod\b|c[oó]digo de parada/, causes: [
    { cause: 'Driver inestable instalado o actualizado hace poco', likelihood: 'Probable' },
    { cause: 'Módulo de RAM defectuoso', likelihood: 'Posible' },
    { cause: 'Disco con sectores dañados', likelihood: 'Posible' },
  ] },
  { re: /outlook|\bost\b|buz[oó]n/, causes: [
    { cause: 'Modo Trabajar sin conexión activo sin darse cuenta', likelihood: 'Probable' },
    { cause: 'Credenciales guardadas antiguas en el Administrador de credenciales', likelihood: 'Probable' },
    { cause: 'Perfil u OST dañado que exige recreado', likelihood: 'Posible' },
  ] },
  { re: /impresora|spooler|cola de impresi[oó]n/, causes: [
    { cause: 'Trabajo atascado en la cola local', likelihood: 'Probable' },
    { cause: 'Impresora sin papel, atasco o tóner agotado', likelihood: 'Probable' },
    { cause: 'Driver corrupto o desactualizado', likelihood: 'Posible' },
  ] },
];

const SEC_RULES: Array<{ re: RegExp; concern: string }> = [
  { re: /phishing|phising|enlace fraudulento|correo (?:sospechoso|extra[nñ]o)/, concern: 'Posible phishing: contener (no clicar ni responder), preservar el mensaje original y valorar escalado al SOC.' },
  { re: /vishing|llamada sospechosa|se hace pasar por|suplanta/, concern: 'Posible vishing: verificar SIEMPRE con devolución de llamada a un número registrado antes de actuar.' },
  { re: /contrase[nñ]a|password|credenciales|\bmfa\b/, concern: 'Operación sensible sobre identidad: verificar por callback y dejar evidencia de la verificación en el ticket.' },
  { re: /virus|malware|ransomware/, concern: 'Posible malware: no conectar USB, valorar aislamiento de red del equipo y escalar al SOC.' },
  { re: /usb (?:encontrado|desconocid)|pendrive (?:encontrado|desconocid)/, concern: 'Medio extraíble desconocido: NO conectarlo; recogerlo y entregarlo a seguridad.' },
];

const NEXT_RULES: Array<{ re: RegExp; action: string }> = [
  { re: /phishing|phising|correo sospechoso|enlace (?:raro|fraudulento)|vishing|virus|malware|ransomware/, action: 'Contener la amenaza (no clicar / no conectar), preservar evidencia y escalar al SOC siguiendo el procedimiento de incidentes.' },
  { re: /bloquead|locked|contrase[nñ]a|password|credenciales/, action: 'Verificar identidad con callback al número de RRHH y comprobar el estado de la cuenta antes de desbloquear o resetear.' },
  { re: /\bmfa\b|authenticator/, action: 'Aplicar verificación reforzada y revocar sesiones antes de tocar el MFA (guíate del runbook de reset de MFA).' },
  { re: /outlook|correo|buz[oó]n|teams|onedrive/, action: 'Probar primero el servicio en la web (OWA / office.com) para separar problema de cliente de problema de cuenta.' },
  { re: /wi-?fi|inal[aá]mbric|red|internet|\bdns\b|\bdhcp\b|apipa/, action: 'Aislar el alcance (un equipo vs una zona) y recopilar un ipconfig /all del equipo afectado.' },
  { re: /pantalla azul|\bbsod\b|no arranca/, action: 'Documentar código de error y revisar el Visor de eventos antes de reinstalar o reparar nada.' },
  { re: /impresora|spooler/, action: 'Verificar lo físico (papel, atasco, encendido) y la cola local antes de escalar a infraestructura.' },
];

/* ---------- tokens para el match de KB ---------- */

const STOPWORDS = new Set([
  'para', 'pero', 'como', 'cuando', 'donde', 'esta', 'este', 'esto', 'estan', 'son', 'del',
  'las', 'los', 'una', 'que', 'con', 'por', 'desde', 'hace', 'todo', 'toda', 'todos', 'todas',
  'sobre', 'entre', 'hasta', 'porque', 'muy', 'puedo', 'puede', 'pueden', 'tiene', 'tengo',
  'hay', 'sido', 'estoy', 'estaba', 'estamos', 'problema', 'problemas', 'gracias', 'hola',
  'buenos', 'dias', 'usuario', 'equipo', 'trabajo', 'trabajar', 'ahora', 'nuevo', 'nueva',
  'mismo', 'misma', 'hacer', 'decir', 'seguir', 'quiere', 'quedo', 'segun', 'dicho',
  'buenas', 'tardes', 'manana', 'porque', 'por', 'esta', 'dice',
]);

function extractTokens(raw: string, evidence: string[]): string[] {
  const words = raw.toLowerCase().match(/[a-záéíóúüñ0-9]{4,}/g) ?? [];
  const extra = evidence.join(' ').toLowerCase().match(/[a-záéíóúüñ0-9]{4,}/g) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of [...words, ...extra]) {
    if (STOPWORDS.has(w) || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= 30) break;
  }
  return out;
}

/** Quita diacríticos para que "contrasena" (como escribe la gente) matchee "contraseña" en la KB. */
function deaccent(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/* ---------- motor principal ---------- */

function analyzeTicket(raw: string): TriageAnalysis {
  const text = raw.toLowerCase();

  const scoreboard: TriageAnalysis['scoreboard'] = [];
  const evidence: KwEvidence[] = [];
  for (const cat of CATEGORY_ORDER) {
    const kws: string[] = [];
    for (const rule of CATEGORY_RULES[cat]) {
      const m = rule.re.exec(text);
      if (m) { kws.push(m[0]); evidence.push({ kw: m[0], sub: rule.sub }); }
    }
    scoreboard.push({ cat, hits: kws.length, kws });
  }

  const best = [...scoreboard].sort((a, b) => b.hits - a.hits)[0];
  const unclassified = best.hits === 0;
  const category: HdCategory = unclassified ? 'HelpDesk - Service Desk / ITSM' : best.cat;
  const subcategory = unclassified
    ? 'Sin clasificar (keywords insuficientes)'
    : CATEGORY_RULES[category].find((r) => r.re.test(text))?.sub ?? 'General';

  const multiuserM = MULTIUSER_RE.exec(text);
  const downM = SERVICEDOWN_RE.exec(text);
  const blockedM = BLOCKED_RE.exec(text);
  const urgentM = URGENT_RE.exec(text);
  const soonM = SOON_RE.exec(text);
  const multiuser = Boolean(multiuserM);
  const serviceDown = Boolean(downM);

  const impact: Level3 = multiuser || serviceDown ? 'alta' : blockedM ? 'media' : 'baja';
  let secM = '';
  for (const r of SEC_RULES) {
    const m = r.re.exec(text);
    if (m) { secM = m[0]; break; }
  }
  const urgency: Level3 = serviceDown || urgentM ? 'alta' : blockedM || soonM || secM ? 'media' : 'baja';
  let priority = priorityMatrix(impact, urgency);
  let priorityReason = `Impacto ${impact} × urgencia ${urgency} → ${priority}. ${PRIORITY_DESC[priority]}`;
  if (priority === 'P1' && !multiuser && !serviceDown) {
    priority = 'P2';
    priorityReason += ' Ajustado a P2: P1 reservado a fallo multiusuario o servicio caído.';
  } else if (priority === 'P1') {
    priorityReason += multiuser ? ' Justificado por alcance multiusuario.' : ' Justificado por servicio caído.';
  }

  const steps: TriageAnalysis['troubleshooting'] = [
    { title: 'Reproducir y documentar', why: 'Anotar el error literal, la hora de inicio y los cambios recientes antes de hipotetizar.' },
  ];
  for (const r of TROUBLE_RULES) {
    if (r.re.test(text)) {
      for (const s of r.steps) {
        if (!steps.some((x) => x.title === s.title)) steps.push(s);
      }
    }
  }
  const troubleshooting = steps.slice(0, 5);

  const requiredInfo = [...BASE_INFO];
  for (const r of INFO_RULES) {
    if (r.re.test(text)) for (const it of r.items) if (!requiredInfo.includes(it)) requiredInfo.push(it);
  }

  const rootCauses: TriageAnalysis['rootCauses'] = [];
  for (const r of CAUSE_RULES) {
    if (r.re.test(text)) for (const c of r.causes) if (!rootCauses.some((x) => x.cause === c.cause)) rootCauses.push(c);
  }
  if (rootCauses.length === 0) {
    rootCauses.push({ cause: 'Insuficiente información aún: recopilar datos y reevaluar', likelihood: 'Por confirmar' });
  }

  const escalation: string[] = [];
  if (priority === 'P1') escalation.push('P1: avisar de inmediato al responsable de turno y abrir puente de comunicación.');
  if (impact === 'media' || impact === 'alta') escalation.push('Sin progreso tras el primer contacto técnico: escalar a L2 con la información recopilada.');
  if (/grupo de seguridad|permiso|deshabilitad|onboarding|offboarding|licencia/.test(text)) escalation.push('Cambio de accesos, grupos o licencias: escalación a IAM.');
  if (/phishing|phising|vishing|virus|malware|ransomware|credenciales (?:filtradas|comprometidas)/.test(text)) escalation.push('Señales de compromiso: escalación a SOC con la evidencia preservada.');
  if (/garant[ií]a|\brma\b|pantalla rota|teclado roto|se calienta/.test(text)) escalation.push('Avería física en garantía: escalación a RMA / proveedor.');
  if (/switch|router|punto de acceso/.test(text)) escalation.push('Fallo de infraestructura de red: L2 - Redes.');
  if (/spooler|servidor de impresi[oó]n|toda (?:la planta|la oficina)/.test(text)) escalation.push('Servidor o servicio de zona caído (impresión, archivo, red): L2 - Infraestructura.');
  if (escalation.length === 0) escalation.push('Resolver en L1 con la KB aplicable; escalar solo si se cumplen criterios posteriores.');

  const securityConcerns = SEC_RULES.filter((r) => r.re.test(text)).map((r) => r.concern);

  const tokens = extractTokens(raw, evidence.map((e) => e.kw).concat(subcategory));
  const kbSuggestions = HELPDESK_KB_ARTICLES
    .map((art) => {
      const hay = deaccent(`${art.title} ${art.symptoms}`.toLowerCase());
      const matched = tokens.filter((t) => hay.includes(deaccent(t)));
      return { id: art.id, title: art.title, matched, score: matched.length };
    })
    .filter((k) => k.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ id, title, matched }) => ({ id, title, matched }));

  let nextAction = 'Categorizar, priorizar el ticket y comprobar si existe artículo KB aplicable antes de diagnosticar.';
  for (const r of NEXT_RULES) {
    if (r.re.test(text)) { nextAction = r.action; break; }
  }
  if (priority === 'P1') nextAction = `P1 — avisar al responsable de turno YA y registrar el puente. Después: ${nextAction}`;

  return {
    category, subcategory, unclassified, matchedKeywords: evidence, scoreboard,
    impact, urgency, priority, priorityReason,
    impactEvidence: [multiuserM?.[0] ?? '', downM?.[0] ?? '', blockedM?.[0] ?? ''].filter(Boolean),
    urgencyEvidence: [urgentM?.[0] ?? '', downM?.[0] ?? '', soonM?.[0] ?? '', blockedM?.[0] ?? '', secM].filter(Boolean),
    troubleshooting, requiredInfo, rootCauses, escalation, securityConcerns, kbSuggestions, nextAction,
  };
}

/* ---------- exportación texto plano ---------- */

function buildAnalysisText(a: TriageAnalysis, sla: SlaTable): string {
  const L: string[] = [];
  L.push('# Triage del ticket');
  L.push(`Categoría: ${a.category}`);
  L.push(`Subcategoría: ${a.subcategory}`);
  L.push(`Keywords detectadas: ${a.matchedKeywords.map((k) => k.kw).join(', ') || '—'}`);
  L.push(`Prioridad: ${a.priority} (impacto ${a.impact} × urgencia ${a.urgency})`);
  L.push(`Razonamiento: ${a.priorityReason}`);
  L.push(`SLA sugerido: respuesta ${fmtMins(sla[a.priority].response)} · resolución ${fmtMins(sla[a.priority].resolution)}`);
  L.push('');
  L.push('## Troubleshooting inicial');
  a.troubleshooting.forEach((s, i) => L.push(`${i + 1}. ${s.title} — ${s.why}`));
  L.push('');
  L.push('## Información requerida');
  a.requiredInfo.forEach((i) => L.push(`- [ ] ${i}`));
  L.push('');
  L.push('## Posibles causas raíz');
  a.rootCauses.forEach((c) => L.push(`- ${c.cause} (${c.likelihood})`));
  L.push('');
  L.push('## Criterios de escalación');
  a.escalation.forEach((e) => L.push(`- ${e}`));
  L.push('');
  L.push('## Preocupaciones de seguridad');
  if (a.securityConcerns.length === 0) L.push('- Sin señales de seguridad detectadas por el parser.');
  a.securityConcerns.forEach((s) => L.push(`- ${s}`));
  L.push('');
  L.push('## KB sugerida');
  if (a.kbSuggestions.length === 0) L.push('- Sin coincidencias claras.');
  a.kbSuggestions.forEach((k) => L.push(`- ${k.title} [${k.id}] (match: ${k.matched.join(', ')})`));
  L.push('');
  L.push('## Siguiente acción sugerida');
  L.push(a.nextAction);
  return L.join('\n');
}

/* ---------- subcomponentes ---------- */

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#555]">
      {icon}
      {title}
    </div>
    {children}
  </div>
);

const KwChip: React.FC<{ kw: string }> = ({ kw }) => (
  <span className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[9px] font-mono">{kw}</span>
);

/* ---------- ticket de ejemplo ---------- */

const SAMPLE_TICKET =
  'Hola, buenos dias. Soy Marta de Contabilidad. Desde esta manana no puedo entrar en Outlook: ' +
  'me pide la contrasena una y otra vez y al final me dice que la cuenta esta bloqueada. ' +
  'En el movil si me llegan los correos. Lo necesito urgente porque hoy tengo que cerrar las facturas del mes. ' +
  'Mi usuario es mlopez y mi equipo es el LT-0432.';

/* ---------- clase para inputs pequeños de SLA ---------- */

const slaInputCls =
  'w-24 bg-[#161616] border border-[#262626] rounded px-2 py-1 text-[11px] text-white font-mono focus:outline-none focus:border-blue-500';

/* ---------- componente principal ---------- */

/* ---------- V6 FASE 3: enriquecimiento online opcional ---------- */

interface EnrichmentData {
  category: string;
  subcategory: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  priorityReason: string;
  confidence: 'alta' | 'media' | 'baja';
  keywords: string[];
  missingInfo: string[];
  securityFlags: string[];
  notes: string;
}

const ENRICH_CONSENT_KEY = 'vaultnotes-enrich-consent-v1';

export const HdTicketTriageTool: React.FC = () => {
  const [raw, setRaw] = useState('');
  const [analysis, setAnalysis] = useState<TriageAnalysis | null>(null);
  const [sla, setSlaTable] = useState<SlaTable>(DEFAULT_SLA);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { addedToast, showToast } = useAddToNoteToast();

  // V6 FASE 3 — [Enrich Online]: estado exclusivo del enriquecimiento
  // opcional. NUNCA se dispara solo: requiere clic + consentimiento.
  const online = useIsOnline();
  const [enriching, setEnriching] = useState(false);
  const [enrichment, setEnrichment] = useState<EnrichmentData | null>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  const analyze = (): void => {
    setAnalysis(analyzeTicket(raw));
    // Nuevo análisis → el enriquecimiento previo ya no corresponde.
    setEnrichment(null);
    setEnrichError(null);
  };

  const clear = (): void => {
    setRaw(''); setAnalysis(null);
    setEnrichment(null); setEnrichError(null);
  };

  const runEnrich = async (): Promise<void> => {
    if (!analysis || enriching || !online) return;
    // Consentimiento explícito la PRIMERA vez (persistido): qué se envía y
    // dónde. Sin consentimiento, nada sale del navegador.
    let consented = false;
    try {
      consented = window.localStorage.getItem(ENRICH_CONSENT_KEY) === '1';
    } catch { /* localStorage inaccesible — pedir consentimiento igualmente */ }
    if (!consented) {
      const ok = window.confirm(
        'Enriquecimiento online (opcional)\n\n' +
        'Se enviará el TEXTO del ticket que pegaste al backend local de VaultNotes ' +
        '(tu propio servidor, /api/enrich-ticket) para pedir sugerencias de triage a una IA.\n\n' +
        '· La tool funciona 100% offline sin esto — es opcional.\n' +
        '· Nunca se envía nada sin que pulses el botón.\n' +
        '· El resultado se muestra aparte y NO sobrescribe el análisis offline.\n\n' +
        '¿Quieres activarlo (se recordará tu elección)?'
      );
      if (!ok) return;
      try { window.localStorage.setItem(ENRICH_CONSENT_KEY, '1'); } catch { /* sin persistencia, se vuelve a preguntar */ }
    }
    setEnriching(true);
    setEnrichError(null);
    setEnrichment(null);
    try {
      const res = await fetch('/api/enrich-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketText: raw,
          offlineCategory: analysis.category,
          offlinePriority: analysis.priority,
        }),
      });
      const data: { ok?: boolean; enrichment?: EnrichmentData; error?: string } = await res.json();
      if (!res.ok || !data.ok || !data.enrichment) {
        setEnrichError(data.error ?? 'El enriquecimiento online falló (HTTP ' + res.status + ').');
      } else {
        setEnrichment(data.enrichment);
      }
    } catch {
      setEnrichError('Sin respuesta del backend local (¿se cayó el servidor de la app?). El análisis offline sigue intacto.');
    } finally {
      setEnriching(false);
    }
  };

  const copyAnalysis = (): void => {
    if (!analysis) return;
    navigator.clipboard?.writeText(buildAnalysisText(analysis, sla)).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  const saveToIntel = async (): Promise<void> => {
    if (!analysis) return;
    const res = await useIntelStore.getState().addIntelItems([{
      kind: 'event',
      title: `Triage — ${analysis.subcategory}`,
      content: buildAnalysisText(analysis, sla),
      contentLang: 'markdown',
      description: `Prioridad ${analysis.priority} · ${analysis.category}`,
      tags: [analysis.category, analysis.priority, analysis.subcategory, 'triage'],
      source: 'HelpDesk Ticket Triage',
    }]);
    setFeedback(res.added > 0 ? 'Guardado en Data & Intel ✓' : 'Ya existía en Data & Intel');
    window.setTimeout(() => setFeedback(null), 2500);
  };

  const addToNote = (): void => {
    if (!analysis) return;
    const rows: Array<[string, string]> = [
      ['Categoría', escapeHtml(analysis.category)],
      ['Subcategoría', escapeHtml(analysis.subcategory)],
      ['Keywords', escapeHtml(analysis.matchedKeywords.map((k) => k.kw).join(', '))],
      ['Impacto', escapeHtml(analysis.impact)],
      ['Urgencia', escapeHtml(analysis.urgency)],
      ['Prioridad', escapeHtml(analysis.priority)],
      ['Razonamiento', escapeHtml(analysis.priorityReason)],
      ['SLA respuesta', escapeHtml(fmtMins(sla[analysis.priority].response))],
      ['SLA resolución', escapeHtml(fmtMins(sla[analysis.priority].resolution))],
      ['Troubleshooting', escapeHtml(analysis.troubleshooting.map((s) => s.title).join(' · '))],
      ['Info requerida', escapeHtml(analysis.requiredInfo.join(' · '))],
      ['Causas posibles', escapeHtml(analysis.rootCauses.map((c) => `${c.cause} (${c.likelihood})`).join(' · '))],
      ['Escalación', escapeHtml(analysis.escalation.join(' · '))],
      ['Seguridad', escapeHtml(analysis.securityConcerns.join(' · ') || 'Sin señales detectadas')],
      ['KB sugerida', escapeHtml(analysis.kbSuggestions.map((k) => `${k.title} [${k.id}]`).join(' · '))],
      ['Siguiente acción', escapeHtml(analysis.nextAction)],
    ];
    useNoteStore.getState().enqueueNote(`Triage — ${analysis.subcategory}`, buildNoteHtmlTable(rows));
    showToast();
  };

  const setSla = (p: Priority, field: 'response' | 'resolution', v: string): void => {
    const n = Math.max(0, parseInt(v, 10) || 0);
    setSlaTable((prev) => ({ ...prev, [p]: { ...prev[p], [field]: n } }));
  };

  return (
    <div className="space-y-3">
      <InfoBanner>
        100% offline. El análisis se ejecuta localmente con un motor de keywords
        educativo (regex en español). Categoría, prioridad y SLA son sugerencias:
        valida siempre el criterio con la política real de tu empresa.
      </InfoBanner>

      <Field label="Ticket crudo (pega el texto del usuario, email o chat)">
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={'Pega aquí el texto del ticket tal cual lo cuenta el usuario.\n\nEj: no puedo entrar en Outlook, me dice que la cuenta está bloqueada... urgente, tengo que cerrar facturas'}
          className={`${taCls} min-h-[110px]`}
          aria-label="Texto crudo del ticket"
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={analyze} disabled={!raw.trim()} className={`${btnPrimary} inline-flex items-center gap-1.5`} title="Analizar el ticket con el motor de keywords">
          <Search className="w-3.5 h-3.5" /> Analizar
        </button>
        <button type="button" onClick={() => setRaw(SAMPLE_TICKET)} className={`${btnGhost} inline-flex items-center gap-1.5`} title="Cargar un ticket de ejemplo">
          <FileText className="w-3.5 h-3.5" /> Ejemplo
        </button>
        <button type="button" onClick={copyAnalysis} disabled={!analysis} className={`${btnGhost} inline-flex items-center gap-1.5`} title="Copiar el análisis completo en texto plano">
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiado' : 'Copiar análisis'}
        </button>
        <button type="button" onClick={saveToIntel} disabled={!analysis} className={`${btnGhost} inline-flex items-center gap-1.5`} title="Guardar el análisis en Data e Intel">
          <Database className="w-3.5 h-3.5" /> Guardar en Data &amp; Intel
        </button>
        <button type="button" onClick={addToNote} disabled={!analysis} className={`${btnGhost} inline-flex items-center gap-1.5`} title="Añadir el análisis a Notas">
          <BookOpen className="w-3.5 h-3.5" /> Añadir a Notas
        </button>
        {/* V6 FASE 3 — enriquecimiento ONLINE opcional: clic explícito, nunca
            auto, deshabilitado sin conexión. No afecta al flujo offline. */}
        <button
          type="button"
          onClick={() => void runEnrich()}
          disabled={!analysis || enriching || !online}
          className={`${btnGhost} inline-flex items-center gap-1.5 ${!online ? 'opacity-40' : ''}`}
          title={
            !analysis
              ? 'Primero ejecuta el análisis offline'
              : !online
                ? 'Offline — el enriquecimiento online no está disponible (la tool sigue 100% funcional)'
                : 'Opcional: pedir sugerencias de triage a la IA vía el backend local (clic explícito, nunca automático)'
          }
        >
          {enriching ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
              Enriqueciendo…
            </>
          ) : !online ? (
            <>
              <CloudOff className="w-3.5 h-3.5" /> Enrich Online (offline)
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-violet-400" /> Enrich Online
            </>
          )}
        </button>
        <button type="button" onClick={clear} className={`${btnGhost} inline-flex items-center gap-1.5`} title="Limpiar entrada y resultado">
          <Trash2 className="w-3.5 h-3.5" /> Limpiar
        </button>
      </div>

      {feedback && <InfoBanner>{feedback}</InfoBanner>}
      {addedToast && <InfoBanner>Añadido a Notas — crea o elige una nota para verlo.</InfoBanner>}

      {/* V6 FASE 3 — panel de enriquecimiento online (aparte, marcado, NUNCA
          sobrescribe el análisis offline). */}
      {enrichError && (
        <ErrorBanner message={`Enrich Online: ${enrichError}`} />
      )}
      {enrichment && analysis && (
        <div className="bg-violet-500/5 border border-violet-500/25 rounded p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-violet-400">
              <Sparkles className="w-3 h-3" /> Enriquecimiento IA (online · opcional)
            </div>
            <button
              type="button"
              onClick={() => setEnrichment(null)}
              className="text-[10px] text-[#777] hover:text-white cursor-pointer"
            >
              ocultar
            </button>
          </div>
          <p className="text-[10px] text-[#777] leading-relaxed">
            Sugerencias generadas al pedirlo explícitamente — compáralas con el análisis OFFLINE de arriba
            (que es el que queda como fuente de verdad). Confianza: <span className="text-violet-300 font-semibold">{enrichment.confidence}</span>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <Row label="Categoría IA" value={enrichment.category} />
            <Row label="Subcategoría IA" value={enrichment.subcategory} />
            <Row label="Prioridad IA" value={`${enrichment.priority} — ${enrichment.priorityReason}`} />
            <Row
              label="Divergencia"
              value={
                enrichment.priority === analysis.priority && enrichment.category === analysis.category
                  ? 'ninguna: IA y offline coinciden ✓'
                  : `IA: ${enrichment.priority}/${enrichment.category} vs offline: ${analysis.priority}/${analysis.category}`
              }
            />
          </div>
          {enrichment.keywords.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-[#666] uppercase tracking-wider">Keywords IA:</span>
              {enrichment.keywords.map((k, i) => (
                <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161616] border border-[#262626] text-[#AAA]">{k}</span>
              ))}
            </div>
          )}
          {enrichment.missingInfo.length > 0 && (
            <div className="space-y-0.5">
              <span className="text-[10px] text-[#666] uppercase tracking-wider">Info a pedir (IA):</span>
              {enrichment.missingInfo.map((m, i) => (
                <p key={i} className="text-[10px] text-[#AAA] leading-relaxed">▸ {m}</p>
              ))}
            </div>
          )}
          {enrichment.securityFlags.length > 0 && (
            <ErrorBanner message={`Posible riesgo (IA): ${enrichment.securityFlags.join(' · ')}`} />
          )}
          {enrichment.notes && (
            <p className="text-[10px] text-[#888] leading-relaxed border-t border-violet-500/15 pt-1.5">{enrichment.notes}</p>
          )}
        </div>
      )}

      {analysis && (
        <div className="space-y-3">
          {analysis.unclassified && (
            <InfoBanner>
              El parser no reconoció keywords claras. Pide al usuario el error
              exacto y vuelve a analizar: la categoría por defecto es ITSM genérico.
            </InfoBanner>
          )}

          <Section title="Categoría / Subcategoría" icon={<Search className="w-3 h-3" />}>
            <Row label="Categoría" value={analysis.category} />
            <Row label="Subcategoría" value={analysis.subcategory} />
            <div className="flex flex-wrap gap-1 pt-1">
              {analysis.matchedKeywords.slice(0, 12).map((k, i) => <KwChip key={i} kw={k.kw} />)}
            </div>
            <details className="text-[10px] text-[#666]">
              <summary className="cursor-pointer select-none hover:text-white">
                Ver marcador completo del parser ({analysis.scoreboard.filter((s) => s.hits > 0).length} categorías con coincidencias)
              </summary>
              <div className="pt-1.5 space-y-1 font-mono">
                {analysis.scoreboard.filter((s) => s.hits > 0).map((s) => (
                  <div key={s.cat}>{s.cat}: {s.hits} coincidencia{s.hits === 1 ? '' : 's'} — {s.kws.join(', ')}</div>
                ))}
              </div>
            </details>
          </Section>

          <Section title="Impacto / Urgencia / Prioridad" icon={<ArrowRight className="w-3 h-3" />}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-2 py-1 rounded border text-xs font-bold ${P_BADGE[analysis.priority]}`}>{analysis.priority}</span>
              <span className="text-[11px] text-[#888]">Impacto: <span className="text-white">{analysis.impact}</span></span>
              <span className="text-[11px] text-[#888]">Urgencia: <span className="text-white">{analysis.urgency}</span></span>
            </div>
            <p className="text-[11px] text-[#AAA] leading-relaxed">{analysis.priorityReason}</p>
            {(analysis.impactEvidence.length > 0 || analysis.urgencyEvidence.length > 0) && (
              <div className="flex flex-col gap-1">
                {analysis.impactEvidence.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-[#666] uppercase tracking-wider">Impacto por:</span>
                    {analysis.impactEvidence.map((k, i) => <KwChip key={i} kw={k} />)}
                  </div>
                )}
                {analysis.urgencyEvidence.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-[#666] uppercase tracking-wider">Urgencia por:</span>
                    {analysis.urgencyEvidence.map((k, i) => <KwChip key={i} kw={k} />)}
                  </div>
                )}
              </div>
            )}
          </Section>

          <Section title="SLA sugerido (editable)" icon={<Database className="w-3 h-3" />}>
            <InfoBanner>
              Tiempos de ejemplo educativo — configúralos según la política de tu
              empresa. No asumir tiempos universales.
            </InfoBanner>
            <Row label={`SLA ${analysis.priority}`} value={`respuesta ${fmtMins(sla[analysis.priority].response)} · resolución ${fmtMins(sla[analysis.priority].resolution)}`} mono />
            <div className="overflow-x-auto border border-[#262626] rounded">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="bg-[#161616] text-[#888] uppercase">
                    <th className="px-2 py-1.5 text-left">P</th>
                    <th className="px-2 py-1.5 text-left">Respuesta (min)</th>
                    <th className="px-2 py-1.5 text-left">Resolución (min)</th>
                  </tr>
                </thead>
                <tbody>
                  {(['P1', 'P2', 'P3', 'P4'] as Priority[]).map((p) => (
                    <tr key={p} className={`border-t border-[#1A1A1A] ${p === analysis.priority ? 'bg-blue-500/5' : ''}`}>
                      <td className="px-2 py-1.5 text-white">{p}</td>
                      <td className="px-2 py-1.5">
                        <input type="number" min={0} value={sla[p].response} onChange={(e) => setSla(p, 'response', e.target.value)} className={slaInputCls} aria-label={`Tiempo de respuesta ${p} en minutos`} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min={0} value={sla[p].resolution} onChange={(e) => setSla(p, 'resolution', e.target.value)} className={slaInputCls} aria-label={`Tiempo de resolución ${p} en minutos`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Troubleshooting inicial" icon={<Search className="w-3 h-3" />}>
            <ol className="space-y-1.5">
              {analysis.troubleshooting.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[10px] font-mono text-blue-400 shrink-0 mt-0.5">{i + 1}.</span>
                  <div>
                    <span className="text-[11px] text-white font-semibold">{s.title}</span>
                    <span className="text-[11px] text-[#888]"> — {s.why}</span>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Información requerida" icon={<FileText className="w-3 h-3" />}>
            <ul className="space-y-1">
              {analysis.requiredInfo.map((it, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="w-3 h-3 border border-[#444] rounded-[2px] shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-[11px] text-[#AAA]">{it}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Posibles causas raíz" icon={<Search className="w-3 h-3" />}>
            <ul className="space-y-1">
              {analysis.rootCauses.map((c, i) => (
                <li key={i} className="flex gap-2 items-start justify-between">
                  <span className="text-[11px] text-[#AAA] flex-1">
                    <span className="text-[#888] font-mono mr-1">{i + 1}.</span>
                    {c.cause}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border shrink-0 ${c.likelihood === 'Probable' ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : c.likelihood === 'Posible' ? 'bg-gray-500/15 border-gray-500/30 text-gray-400' : 'bg-gray-500/10 border-gray-500/20 text-[#777]'}`}>{c.likelihood}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Criterios de escalación" icon={<ArrowRight className="w-3 h-3" />}>
            <ul className="space-y-1">
              {analysis.escalation.map((e, i) => (
                <li key={i} className="text-[11px] text-[#AAA] flex gap-1.5">
                  <span className="text-blue-400">▸</span>
                  {e}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Preocupaciones de seguridad" icon={<ShieldAlert className="w-3 h-3" />}>
            {analysis.securityConcerns.length > 0 ? (
              <div className="space-y-1.5">
                {analysis.securityConcerns.map((s, i) => <ErrorBanner key={i} message={s} />)}
              </div>
            ) : (
              <p className="text-[11px] text-[#666]">Sin keywords de seguridad detectadas en este ticket.</p>
            )}
          </Section>

          <Section title="KB sugerida (referencia)" icon={<BookOpen className="w-3 h-3" />}>
            {analysis.kbSuggestions.length > 0 ? (
              <div className="space-y-1.5">
                {analysis.kbSuggestions.map((k) => (
                  <div key={k.id} className="bg-[#161616] border border-[#262626] rounded p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-blue-300 font-semibold">{k.title}</span>
                      <code className="text-[9px] text-[#666] font-mono">{k.id}</code>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {k.matched.map((m, i) => <KwChip key={i} kw={m} />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[#666]">Sin coincidencias claras en la KB local.</p>
            )}
          </Section>

          <Section title="Siguiente acción sugerida" icon={<ArrowRight className="w-3 h-3" />}>
            <p className="text-[11px] text-white leading-relaxed">{analysis.nextAction}</p>
          </Section>
        </div>
      )}
    </div>
  );
};

