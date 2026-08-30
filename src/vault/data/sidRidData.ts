/**
 * sidRidData.ts — Dataset LOCAL de RIDs conocidos (Relative IDs) y autoridades SID.
 *
 * 100% offline. NO consulta Active Directory, NO consulta Entra ID, NO llama al
 * sistema local para resolver SIDs. Todos los datos son estáticos y curados manualmente
 * desde conocimiento público de Microsoft (well-known security identifiers).
 *
 * Exporta:
 *  - La interfaz `KnownRid`
 *  - El array `KNOWN_RIDS` (RID → nombre/descripción)
 *  - El array `KNOWN_SID_AUTHORITIES` (identifier authority → descripción)
 *  - El array `WELL_KNOWN_SIDS` (SIDs canónicos del sistema)
 *  - El helper `findKnownRid(rid: number)`
 *  - El helper `findKnownSidAuthority(code: number)`
 * NO usa `export default`.
 */

export interface KnownRid {
  rid: number;
  name: string;
  description: string;
  /** Severity 1-5 — cuán crítico es que aparezca este RID en un contexto inesperado. */
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
}

/**
 * RIDs conocidos en dominios Windows / Active Directory.
 * Fuente: https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers
 * Curado manualmente — los más relevantes para SOC analysts.
 */
export const KNOWN_RIDS: KnownRid[] = [
  // ── Read-only Domain Controllers (grupos del dominio) ──
  { rid: 498, name: 'Enterprise Read-only Domain Controllers', description: 'Grupo universal del bosque con las cuentas-máquina de los RODC. Miembros inesperados = revisar la delegación de RODCs en sitios remotos.', severity: 'medium' },
  { rid: 499, name: 'Read-only Domain Controllers', description: 'Grupo global de dominio con las cuentas-máquina de los RODC del dominio. Equivalente a Domain Controllers (516) pero para DCs de solo lectura — cualquier miembro que no sea un RODC real = IR inmediato.', severity: 'medium' },

  // ── Cuentas de dominio predeterminadas ──
  { rid: 500, name: 'Administrator', description: 'Cuenta de administrador predeterminada del dominio. Cambiar de nombre en producción. CRÍTICO si aparece en contextos inesperados (logons RDP fuera de horario, uso de runas, etc.).', severity: 'critical' },
  { rid: 501, name: 'Guest', description: 'Cuenta de invitado del dominio — debería estar deshabilitada. Aparición en cualquier logon = investigar.', severity: 'high' },
  { rid: 502, name: 'KRBTGT', description: 'Cuenta usada por el KDC para firmar tickets Kerberos. Su hash es la "llave maestra" del dominio — comprometido = Golden Ticket. Reset de password 2x tras sospecha (el procedimiento usa esta MISMA cuenta dos veces para invalidar tickets antiguos; NO existe una segunda cuenta KRBTGT).', severity: 'critical' },

  // ── Grupos predeterminados del dominio ──
  { rid: 512, name: 'Domain Admins', description: 'Grupo universal con privilegios administrativos sobre el dominio. Miembros = admin total del dominio. Auditar memberships mensualmente.', severity: 'critical' },
  { rid: 513, name: 'Domain Users', description: 'Grupo global con todos los usuarios del dominio. Miembro por defecto de cualquier nueva cuenta. Atacantes lo aprovechan para "blend in".', severity: 'info' },
  { rid: 514, name: 'Domain Guests', description: 'Grupo global con las cuentas guest del dominio. Si tiene miembros, auditar — son cuentas inactivas con acceso limitado.', severity: 'low' },
  { rid: 515, name: 'Domain Computers', description: 'Grupo global con todas las cuentas-máquina del dominio (sufijo $). Útil para detectar machines rogue ojo: una cuenta de usuario en este grupo = sospechoso.', severity: 'info' },
  { rid: 516, name: 'Domain Controllers', description: 'Grupo global con todas las cuentas-DC. Cualquier miembro fuera de DC reales = IR inmediato.', severity: 'critical' },
  { rid: 517, name: 'Cert Publishers', description: 'Grupo con permisos para publicar certificados en AD. Abusado por ESC attacks (AD CS).', severity: 'high' },
  { rid: 518, name: 'Schema Admins', description: 'Grupo universal con privilegios sobre el schema de AD. Solo debería tener miembros durante cambios de schema.', severity: 'critical' },
  { rid: 519, name: 'Enterprise Admins', description: 'Grupo universal con privilegios administrativos sobre todo el forest. Mínimo de miembros.', severity: 'critical' },
  { rid: 520, name: 'Group Policy Creator Owners', description: 'Grupo con permisos para crear GPOs en el dominio. Abusado para persistencia vía GPO malicioso.', severity: 'high' },

  // ── Otros RIDs relevantes ──
  { rid: 544, name: 'Administrators (local)', description: 'Grupo local de administradores en un equipo/miembro. RID 544 en SIDs tipo S-1-5-32-544 = local Administrators.', severity: 'critical' },
  { rid: 545, name: 'Users (local)', description: 'Grupo local de usuarios — RID 545 en S-1-5-32-545 = local Users.', severity: 'info' },
  { rid: 546, name: 'Guests (local)', description: 'Grupo local de invitados — RID 546 en S-1-5-32-546 = local Guests.', severity: 'medium' },
  { rid: 547, name: 'Power Users (local)', description: 'Grupo local Power Users — legacy, equivalente a admin en Win XP, sin uso real en Win moderno.', severity: 'medium' },
  { rid: 548, name: 'Account Operators', description: 'Grupo de dominio con permisos para crear/manejar cuentas. No debería tener miembros en prod (delegar a Help Desk en su lugar).', severity: 'high' },
  { rid: 549, name: 'Server Operators', description: 'Grupo de dominio con permisos sobre servers miembros. Legacy.', severity: 'medium' },
  { rid: 550, name: 'Print Operators', description: 'Grupo de dominio con permisos sobre print servers. Suele ser ruido.', severity: 'low' },
  { rid: 551, name: 'Backup Operators', description: 'Grupo de dominio con permisos de backup (que incluyen bypass de ACLs). Abusado para credential theft.', severity: 'high' },
  { rid: 552, name: 'Replicator', description: 'Grupo de dominio para replicación AD. Siempre vacío en dominios modernos.', severity: 'medium' },
  { rid: 553, name: 'RAS and IAS Servers', description: 'Grupo local de dominio para servidores RAS/IAS (NPS) — RID relativo al domain SID (S-1-5-21-<domain>-553), NO es un BUILTIN. Puede leer propiedades dial-in de cuentas; cambios de membership = auditar.', severity: 'low' },

  // ── Grupos BUILTIN locales (S-1-5-32-*) y grupos RODC del dominio ──
  { rid: 554, name: 'Pre-Windows 2000 Compatible Access', description: 'Grupo BUILTIN de compatibilidad legacy — por defecto incluye Everyone y Authenticated Users con lectura amplia sobre AD. Modificarlo casi nunca es legítimo.', severity: 'medium' },
  { rid: 555, name: 'Remote Desktop Users', description: 'Grupo BUILTIN que otorga el derecho de logon RDP (SeRemoteInteractiveLogonRight) en el equipo local. El vector clásico para dejar acceso remoto a un atacante tras comprometer un host — auditar memberships contra baseline en cada equipo.', severity: 'high' },
  { rid: 556, name: 'Network Configuration Operators', description: 'Grupo BUILTIN con permisos para modificar configuración de red local (TCP/IP, firewall del host). Útil para reconfigurar rutas y evadir controles de red locales.', severity: 'medium' },
  { rid: 557, name: 'Incoming Forest Trust Builders', description: 'Grupo BUILTIN que permite crear confianzas (trusts) ENTRANTES hacia el bosque. Cualquier uso = revisión de seguridad inmediata: puede abrir el forest completo a un dominio atacante.', severity: 'high' },
  { rid: 558, name: 'Performance Monitor Users', description: 'Grupo BUILTIN con lectura de contadores de rendimiento locales y remotos (requerido por algunas queries WMI). Otorga logon batch — vigilar membresías no autorizadas.', severity: 'medium' },
  { rid: 559, name: 'Performance Log Users', description: 'Grupo BUILTIN con permisos para crear sesiones de colección de datos de rendimiento (loguea con credenciales propias). Vector menor de escalada si se abusa de la cuenta de log.', severity: 'medium' },
  { rid: 560, name: 'Windows Authorization Access Group', description: 'Grupo BUILTIN con permiso de leer tokenGroupsGlobalAndUniversal de los usuarios — útil para atacantes que enumeran grupos de cuentas sin ser admin.', severity: 'low' },
  { rid: 561, name: 'Terminal Server License Servers', description: 'Grupo BUILTIN para servidores de licencias TS/RDS. Cambios de membership no deberían ocurrir fuera del deployment de RDS.', severity: 'low' },
  { rid: 562, name: 'Distributed COM Users', description: 'Grupo BUILTIN con acceso DCOM remoto al equipo — habilita movimiento lateral vía objetos COM remotos (MMC20.Application, ShellWindows y otros DCOM abuse conocidos).', severity: 'medium' },
  { rid: 568, name: 'IIS_IUSRS', description: 'Grupo BUILTIN con las identidades de application pools de IIS — reemplazó a IIS_WPG (legacy) desde Windows 2008. CRÍTICO como indicador: binarios corriendo bajo IIS_IUSRS en un web server = firme indicador de web shell o exploit — investigar de inmediato.', severity: 'medium' },
  { rid: 569, name: 'Cryptographic Operators', description: 'Grupo BUILTIN con permisos para operaciones criptográficas comunes (CNG/CAPI). Relevante en cadenas de ataque contra AD CS (ESC) — cambios de membership inesperados = auditar.', severity: 'medium' },
  { rid: 571, name: 'Allowed RODC Password Replication Group', description: 'Grupo local de dominio (S-1-5-21-<domain>-571, NO builtin) que define qué cuentas PUEDEN replicar su password a RODCs. Solo deben estar cuentas de bajo privilegio — cualquier cuenta sensible/privilegiada aquí expone credenciales a quien comprometa un RODC.', severity: 'high' },
  { rid: 572, name: 'Denied RODC Password Replication Group', description: 'Grupo local de dominio (S-1-5-21-<domain>-572, NO builtin) con cuentas cuyo password NUNCA replica a RODCs — por defecto incluye Domain Admins, Enterprise Admins, KRBTGT y DCs. Verificar que los grupos privilegiados permanezcan aquí; quitar algo = riesgo directo de robo de credenciales vía RODC.', severity: 'medium' },
  { rid: 573, name: 'Event Log Readers', description: 'Grupo BUILTIN con acceso de LECTURA a logs de eventos locales, incluido Security. Usado por atacantes post-compromiso para monitorear qué registran sus propias acciones y verificar si dispararon alertas — membership inesperado = fuerte indicador de intrusión activa.', severity: 'high' },
  { rid: 574, name: 'Certificate Service DCOM Access', description: 'Grupo BUILTIN con acceso DCOM a servicios de Certificate Services (AD CS). Relevante en la cadena de ataques de certificados (ESC) — auditar cambios.', severity: 'medium' },
  { rid: 575, name: 'RDS Remote Access Servers', description: 'Grupo BUILTIN de servidores RDS con rol de acceso remoto. Cambios fuera del deployment de RDS = ruido a auditar.', severity: 'low' },
  { rid: 576, name: 'RDS Endpoint Servers', description: 'Grupo BUILTIN de servidores endpoint de RDS (redirección de conexiones). Solo relevante en infraestructura Remote Desktop Services.', severity: 'low' },
  { rid: 577, name: 'RDS Management Servers', description: 'Grupo BUILTIN de servidores de administración RDS. Solo aplica en despliegues Remote Desktop Services.', severity: 'low' },
  { rid: 578, name: 'Hyper-V Administrators', description: 'Grupo BUILTIN (S-1-5-32-578 — NO 789 como se cita a veces) con control casi total del host Hyper-V: acceso a archivos de VM, montaje de VHDX y ejecución como SYSTEM en el host. Equivalente funcional a admin local — tratarlo como tal.', severity: 'high' },
  { rid: 579, name: 'Access Control Assistance Operators', description: 'Grupo BUILTIN que permite ver/evaluar permisos efectivos de objetos locales (sin modificarlos). Uso marginal para reconocimiento de ACLs.', severity: 'low' },
  { rid: 580, name: 'Remote Management Users', description: 'Grupo BUILTIN que habilita acceso por WinRM/PowerShell remoting. Junto con 555 (Remote Desktop Users), los dos vectores de acceso remoto a auditar por host.', severity: 'high' },
  { rid: 582, name: 'Storage Replica Administrators', description: 'Grupo BUILTIN (Windows Server 2016+) con permisos completos de Storage Replica. Bajo riesgo — solo existe en servidores con esa feature instalada.', severity: 'low' },

  // ── IIS / específicos ──
  { rid: 1000, name: 'IIS_WPG (legacy)', description: 'Grupo de worker processes de IIS — legacy, reemplazado por IIS_IUSRS (BUILTIN RID 568) en Win 2008+.', severity: 'low' },

  // ── Nota sobre RIDs >= 1000 ──
  // En equipos standalone, el RID 1000 corresponde al primer security principal
  // creado tras la instalación (primer usuario local). En dominios, el RID Master
  // asigna RIDs >= 1000 a los usuarios, grupos y cuentas-máquina creados por los
  // admins (la primera cuenta-máquina o usuario de un dominio nuevo suele recibir
  // el RID 1000). En hunting: un RID muy alto en una "cuenta nueva" puede indicar
  // RID cycling/squatting — consumo deliberado de RIDs para crear cuentas fuera
  // del inventory conocido del dominio.
];

export interface KnownSidAuthority {
  /** Código de la identifier authority (S-1-X-...). */
  code: number;
  /** Etiqueta corta — ej: "NT Authority". */
  name: string;
  /** Descripción larga. */
  description: string;
}

/**
 * Identifier Authorities conocidas — el segundo componente de un SID.
 * Fuente: https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers
 */
export const KNOWN_SID_AUTHORITIES: KnownSidAuthority[] = [
  { code: 0, name: 'NULL Authority', description: 'Authority para SIDs sin emisor — S-1-0-0 = Nobody.' },
  { code: 1, name: 'World Authority', description: 'Authority para SIDs universales — S-1-1-0 = Everyone.' },
  { code: 2, name: 'Local Authority', description: 'Authority local — S-1-2-0 = Local, S-1-2-1 = Console Logon.' },
  { code: 3, name: 'Creator Authority', description: 'Authority para creadores de objetos — S-1-3-0 = Creator Owner, S-1-3-1 = Creator Group.' },
  { code: 4, name: 'Non-unique Authority', description: 'Authority para SIDs no únicos — raro en la práctica.' },
  { code: 5, name: 'NT Authority', description: 'Authority para SIDs emitidos por Windows / AD — la mayoría de los SIDs reales usan esta authority. Las subauthorities especiales bajo S-1-5- definen familias de cuentas virtuales: S-1-5-32 (grupos BUILTIN locales), S-1-5-64/65 (identidades de autenticación NTLM/SChannel/Digest), S-1-5-80 (NT Service\\<servicio> — SID por servicio), S-1-5-82 (IIS APPPOOL\\<app pool>), S-1-5-83 (NT VIRTUAL ACCOUNT\\Virtual Machines de Hyper-V), S-1-5-90 (Window Manager), S-1-5-113 (Local Account), S-1-5-114 (Local Account and Member of Administrators) y S-1-16 (integrity levels). NO son authorities separadas del modelo S-1-X: comparten la authority 5 con una subauthority inicial distinta.' },
  { code: 6, name: 'Site Server Authority', description: 'Authority legacy de Site Server.' },
  { code: 9, name: 'Resource Manager Authority', description: 'Authority para resource managers.' },
  { code: 10, name: 'Microsoft Account Authority', description: 'Authority para Microsoft Accounts (cuentas personales de MS).'},
  { code: 11, name: 'Azure AD Authority', description: 'Authority para cuentas de Entra ID / Azure AD. Identifica objetos sincronizados desde la nube.' },
  { code: 15, name: 'Atomic Authority', description: 'Authority atómica — rara.' },
  { code: 16, name: 'Microsoft Entra Authority', description: 'Authority moderna de Microsoft Entra (sincronizada desde la nube).'},
  { code: 18, name: 'Authentication Authority', description: 'Authority moderna de Microsoft Entra ID / Azure AD.' },
];

export interface WellKnownSid {
  sid: string;
  name: string;
  description: string;
  /** Tipo de cuenta/objeto. */
  type: 'user' | 'group' | 'service';
}

/**
 * SIDs canónicos del sistema — S-1-X-Y donde X=authority e Y=subauthority única.
 * No requieren un Domain SID antes del RID.
 */
export const WELL_KNOWN_SIDS: WellKnownSid[] = [
  { sid: 'S-1-0-0', name: 'Nobody', description: 'Sin usuario — SID del "anonymous" sin identificar.', type: 'user' },
  { sid: 'S-1-1-0', name: 'Everyone / World', description: 'Todos los usuarios, incluyendo guests y anonymous en algunos casos.', type: 'group' },
  { sid: 'S-1-2-0', name: 'Local', description: 'Usuarios que iniciaron sesión localmente.', type: 'group' },
  { sid: 'S-1-2-1', name: 'Console Logon', description: 'Usuarios que iniciaron sesión vía console (físico o RDP).', type: 'group' },
  { sid: 'S-1-3-0', name: 'Creator Owner', description: 'El usuario que creó el objeto — placeholder resuelto a un SID real en runtime.', type: 'user' },
  { sid: 'S-1-3-1', name: 'Creator Group', description: 'El grupo del usuario que creó el objeto — placeholder.', type: 'group' },
  { sid: 'S-1-3-4', name: 'Owner Rights', description: 'El propietario del objeto — placeholder resuelto al SID del owner.', type: 'group' },
  { sid: 'S-1-5-1', name: 'Dialup', description: 'Usuarios que iniciaron sesión vía dial-up.', type: 'group' },
  { sid: 'S-1-5-2', name: 'Network', description: 'Usuarios que iniciaron sesión vía network logon (Type 3).', type: 'group' },
  { sid: 'S-1-5-3', name: 'Batch', description: 'Usuarios que iniciaron sesión vía batch (Type 4) — tareas programadas.', type: 'group' },
  { sid: 'S-1-5-4', name: 'Interactive', description: 'Usuarios que iniciaron sesión interactivamente (Type 2).', type: 'group' },
  { sid: 'S-1-5-5-X-Y', name: 'Logon Session', description: 'Placeholder para el SID de la sesión de logon (X=high, Y=low).', type: 'service' },
  { sid: 'S-1-5-6', name: 'Service', description: 'Usuarios que iniciaron sesión como servicio (Type 5).', type: 'group' },
  { sid: 'S-1-5-7', name: 'Anonymous Logon', description: 'Conexiones anónimas — SMB null session, etc.', type: 'user' },
  { sid: 'S-1-5-8', name: 'Proxy', description: 'SID histórico documentado por Microsoft para un servicio proxy — prácticamente sin uso en entornos modernos. Aparecer en un token o ACL = anómalo, investigar.', type: 'group' },
  { sid: 'S-1-5-9', name: 'Enterprise Domain Controllers', description: 'Grupo universal con todos los DCs del forest.', type: 'group' },
  { sid: 'S-1-5-10', name: 'Self / Principal Self', description: 'Placeholder para "this object" en ACEs — resuelto al SID del propio objeto.', type: 'service' },
  { sid: 'S-1-5-11', name: 'Authenticated Users', description: 'Todos los usuarios autenticados — NUNCA incluye Anonymous.', type: 'group' },
  { sid: 'S-1-5-12', name: 'Restricted Code', description: 'Código running con restricted token — sandboxing.', type: 'group' },
  { sid: 'S-1-5-13', name: 'Terminal Server User', description: 'Usuarios conectados vía Terminal Server / RDP.', type: 'group' },
  { sid: 'S-1-5-14', name: 'Remote Interactive Logon', description: 'Presente en el token de los logons interactivos remotos (RDP, Logon Type 10). Distingue sesiones RDP de las locales: reglas que solo miran Interactive (S-1-5-4) no ven estas — en hunting de sesión hijacking, filtrar por este SID.', type: 'group' },
  { sid: 'S-1-5-15', name: 'This Organization', description: 'SID añadido a la información de autenticación del token de un usuario autenticado dentro de la organización/bosque — distingue cuentas internas de anónimas o externas.', type: 'group' },
  { sid: 'S-1-5-113', name: 'Local Account', description: 'Añadido al token de cuentas LOCALES del equipo (no de dominio). Útil para distinguir cuentas locales de dominio en ACLs y tokens — clave en reglas tipo "logon de cuenta local en host donde solo hay cuentas de dominio".', type: 'group' },
  { sid: 'S-1-5-114', name: 'Local Account and Member of Administrators', description: 'Añadido al token de cuentas locales que además son admin locales. Si un proceso con este SID hace logon en red = patrón típico de movimiento lateral con cuentas locales (que no existen en AD).', type: 'group' },
  { sid: 'S-1-5-17', name: 'IUSR', description: 'Cuenta integrada de IIS usada para las peticiones web anónimas (Internet Guest Account) — no confundir con S-1-5-15 (This Organization).', type: 'user' },
  { sid: 'S-1-5-18', name: 'Local System / SYSTEM', description: 'Cuenta LocalSystem — la cuenta con más privilegios localmente. NO tiene credenciales en AD.', type: 'user' },
  { sid: 'S-1-5-19', name: 'NT Authority / Local Service', description: 'Cuenta LocalService — privilegios limitados, presenta credenciales anónimas en red.', type: 'user' },
  { sid: 'S-1-5-20', name: 'NT Authority / Network Service', description: 'Cuenta NetworkService — presenta las credenciales del equipo en red.', type: 'user' },
  { sid: 'S-1-5-32-544', name: 'Administrators', description: 'Grupo BUILTIN\Administrators local — RID 544.', type: 'group' },
  { sid: 'S-1-5-32-545', name: 'Users', description: 'Grupo BUILTIN\Users local — RID 545.', type: 'group' },
  { sid: 'S-1-5-32-546', name: 'Guests', description: 'Grupo BUILTIN\Guests local — RID 546.', type: 'group' },
  { sid: 'S-1-5-32-547', name: 'Power Users', description: 'Grupo BUILTIN\Power Users local — legacy.', type: 'group' },
  { sid: 'S-1-5-32-548', name: 'Account Operators', description: 'Grupo BUILTIN\Account Operators — domain-level.', type: 'group' },
  { sid: 'S-1-5-32-549', name: 'Server Operators', description: 'Grupo BUILTIN\Server Operators — domain-level.', type: 'group' },
  { sid: 'S-1-5-32-550', name: 'Print Operators', description: 'Grupo BUILTIN\Print Operators — domain-level.', type: 'group' },
  { sid: 'S-1-5-32-551', name: 'Backup Operators', description: 'Grupo BUILTIN\Backup Operators — puede bypass ACLs.', type: 'group' },
  { sid: 'S-1-5-32-552', name: 'Replicator', description: 'Grupo BUILTIN\Replicator — para replicación de archivos.', type: 'group' },
  { sid: 'S-1-5-32-554', name: 'Pre-Windows 2000 Compatible Access', description: 'Grupo BUILTIN de compatibilidad legacy — por defecto incluye Everyone y Authenticated Users; otorga lectura amplia sobre AD. Modificarlo casi nunca es legítimo.', type: 'group' },
  { sid: 'S-1-5-32-555', name: 'Remote Desktop Users', description: 'Grupo BUILTIN con derecho de logon RDP en el equipo local. Membership otorgado fuera de proceso de cambio = posible acceso persistente de atacante.', type: 'group' },
  { sid: 'S-1-5-32-556', name: 'Network Configuration Operators', description: 'Grupo BUILTIN con permisos para modificar configuración de red local (TCP/IP, firewall del host).', type: 'group' },
  { sid: 'S-1-5-32-557', name: 'Incoming Forest Trust Builders', description: 'Grupo BUILTIN que permite crear trusts entrantes desde otros bosques. Miembros = puntos de control del perímetro del forest.', type: 'group' },
  { sid: 'S-1-5-32-558', name: 'Performance Monitor Users', description: 'Grupo BUILTIN con lectura de contadores de rendimiento locales/remotos (requerido para WMI de performance).', type: 'group' },
  { sid: 'S-1-5-32-559', name: 'Performance Log Users', description: 'Grupo BUILTIN con permisos para crear sesiones de colección de datos de rendimiento.', type: 'group' },
  { sid: 'S-1-5-32-561', name: 'Terminal Server License Servers', description: 'Grupo BUILTIN para servidores de licencias RDS/TS.', type: 'group' },
  { sid: 'S-1-5-32-562', name: 'Distributed COM Users', description: 'Grupo BUILTIN con acceso DCOM remoto — habilita abuso de objetos COM para movimiento lateral (MMC20.Application, ShellWindows, etc.).', type: 'group' },
  { sid: 'S-1-5-32-568', name: 'IIS_IUSRS', description: 'Grupo BUILTIN con las identidades de application pools de IIS (reemplaza a IIS_WPG). Procesos corriendo bajo este SID en un web server = revisar web shell de inmediato.', type: 'group' },
  { sid: 'S-1-5-32-569', name: 'Cryptographic Operators', description: 'Grupo BUILTIN con permisos de operaciones criptográficas (CNG/CAPI) — relevante en ataques contra AD CS.', type: 'group' },
  { sid: 'S-1-5-32-573', name: 'Event Log Readers', description: 'Grupo BUILTIN con lectura de logs de eventos incluido Security. Los atacantes se auto-agregan para monitorear qué están dejando registrado el SOC — membership inesperado = fuerte indicador de intrusión.', type: 'group' },
  { sid: 'S-1-5-32-578', name: 'Hyper-V Administrators', description: 'Grupo BUILTIN (S-1-5-32-578) con control casi total del host Hyper-V — acceso a VHDX de las VMs y ejecución como SYSTEM. Tratar como administradores del host.', type: 'group' },
  { sid: 'S-1-5-32-580', name: 'Remote Management Users', description: 'Grupo BUILTIN que habilita acceso por WinRM/PowerShell remoting. Junto con S-1-5-32-555 (RDP), los dos vectores de acceso remoto a auditar por host.', type: 'group' },

  // ── Identidades de autenticación (S-1-5-64 / 65) ──
  { sid: 'S-1-5-64-10', name: 'NTLM Authentication', description: 'Identidad presente en el token de todo logon autenticado vía NTLM. En análisis de tokens sirve para distinguir el método de autenticación usado.', type: 'group' },
  { sid: 'S-1-5-64-14', name: 'SChannel Authentication', description: 'Identidad presente en el token cuando la autenticación fue vía SSL/TLS (SChannel) — p. ej. HTTPS con certificados de cliente.', type: 'group' },
  { sid: 'S-1-5-64-21', name: 'Digest Authentication', description: 'Identidad presente en el token para logons vía HTTP Digest Authentication.', type: 'group' },
  { sid: 'S-1-5-65-1', name: 'This Organization Certificate', description: 'Añadido al token cuando la autenticación se realizó con un certificado emitido por la organización (federación / AD FS).', type: 'group' },

  // ── Cuentas virtuales de servicio (S-1-5-80 / 83 / 90) ──
  { sid: 'S-1-5-80-0', name: 'NT Service\\ALL SERVICES', description: 'Agregado al token de TODOS los procesos corriendo como servicio de Windows (cada servicio tiene su propio SID S-1-5-80-<hash>). Un SID S-1-5-80-* en ACLs raras o procesos inesperados = revisar.', type: 'service' },
  { sid: 'S-1-5-83-0', name: 'NT VIRTUAL ACCOUNT\\Virtual Machines', description: 'Cuenta virtual que agrupa las VMs de Hyper-V (cada VM recibe S-1-5-83-<id>). Se usa para delegar recursos del host a las máquinas virtuales.', type: 'service' },
  { sid: 'S-1-5-90-0', name: 'Window Manager\\Window Manager Group', description: 'Cuenta virtual del Window Manager (sesiones DWM de escritorio). Los procesos de sesión obtienen este SID para recursos de composición gráfica.', type: 'service' },

  // ── AppContainer / Capabilities (S-1-15-3) ──
  { sid: 'S-1-15-3', name: 'AppContainer / Capability SIDs (prefijo)', description: 'Prefijo de los SIDs de capability de apps UWP/AppContainer (S-1-15-3-<hashes>). NO es un SID individual: cada app de la Store recibe capabilities únicas. En hunting, agrupar por este prefijo para identificar accesos de apps sandboxed en ACLs.', type: 'group' },

  // ── Integrity Levels (S-1-16-*) — claves para detectar UAC bypass ──
  { sid: 'S-1-16-0', name: 'Untrusted Mandatory Level', description: 'Integrity level 0 — procesos bloqueados casi por completo (sandboxing agresivo, contenido de internet en contextos de seguridad restringidos).', type: 'group' },
  { sid: 'S-1-16-4096', name: 'Low Mandatory Level', description: 'Integrity level Low (4096) — típico de procesos sandboxed: Internet Explorer Protected Mode, contenido web marcado como descargado en contextos Low.', type: 'group' },
  { sid: 'S-1-16-8192', name: 'Medium Mandatory Level', description: 'Integrity level Medium (8192) — el estándar para procesos de usuario con UAC activo. Todo proceso elevado empezó siendo Medium.', type: 'group' },
  { sid: 'S-1-16-8448', name: 'Medium Plus Mandatory Level', description: 'Integrity level intermedio (8448) entre Medium y High, de uso interno en Windows. Poco común en la práctica — se documenta por completitud.', type: 'group' },
  { sid: 'S-1-16-12288', name: 'High Mandatory Level', description: 'Integrity level High (12288) — procesos elevados vía UAC. Un proceso que pasa de Medium a High sin consent.exe en el medio = UAC bypass — correlacionar Sysmon 1 con ParentImage consent.exe.', type: 'group' },
  { sid: 'S-1-16-16384', name: 'System Mandatory Level', description: 'Integrity level System (16384) — servicios y procesos SYSTEM. Un proceso de usuario corriendo con este label = escalada de privilegios activa.', type: 'group' },
];

/** Helper: buscar un RID conocido por su número. */
export function findKnownRid(rid: number): KnownRid | undefined {
  return KNOWN_RIDS.find((r) => r.rid === rid);
}

/** Helper: buscar una authority por su código. */
export function findKnownSidAuthority(code: number): KnownSidAuthority | undefined {
  return KNOWN_SID_AUTHORITIES.find((a) => a.code === code);
}

/** Helper: buscar un well-known SID por su string exacto (case-insensitive). */
export function findWellKnownSid(sid: string): WellKnownSid | undefined {
  if (!sid) return undefined;
  const target = sid.trim().toUpperCase();
  return WELL_KNOWN_SIDS.find((s) => s.sid.toUpperCase() === target);
}
