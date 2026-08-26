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

  // ── IIS / específicos ──
  { rid: 1000, name: 'IIS_WPG (legacy)', description: 'Grupo de worker processes de IIS — legacy, reemplazado por IIS_IUSRS en Win 2008+.', severity: 'low' },
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
  { code: 5, name: 'NT Authority', description: 'Authority para SIDs emitidos por Windows / AD — la mayoría de los SIDs reales usan esta authority.' },
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
  { sid: 'S-1-5-9', name: 'Enterprise Domain Controllers', description: 'Grupo universal con todos los DCs del forest.', type: 'group' },
  { sid: 'S-1-5-10', name: 'Self / Principal Self', description: 'Placeholder para "this object" en ACEs — resuelto al SID del propio objeto.', type: 'service' },
  { sid: 'S-1-5-11', name: 'Authenticated Users', description: 'Todos los usuarios autenticados — NUNCA incluye Anonymous.', type: 'group' },
  { sid: 'S-1-5-12', name: 'Restricted Code', description: 'Código running con restricted token — sandboxing.', type: 'group' },
  { sid: 'S-1-5-13', name: 'Terminal Server User', description: 'Usuarios conectados vía Terminal Server / RDP.', type: 'group' },
  { sid: 'S-1-5-15', name: 'This Organization', description: 'SID añadido a la información de autenticación del token de un usuario autenticado dentro de la organización/bosque — distingue cuentas internas de anónimas o externas.', type: 'group' },
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
