/**
 * iamKB — 50 artículos de la base de conocimiento IAM (SIMULADOS —
 * empresa ficticia Nexora S.A., equipo IAM "Identity & Access
 * Management"). Dataset ESTÁTICO de solo lectura (viene de fábrica, no
 * vive en Dexie ni en el backup). relatedTickets referencia tickets
 * plausibles del dataset iam-XXX (iam-001..iam-024 generales,
 * iam-027..iam-050 proyecto final "primera semana IAM").
 *
 * Cobertura: ciclo JML y lifecycle, AD/LDAP y AD híbrido (Entra
 * Connect), MFA y SSO profundos, granting/revoking, access reviews y
 * SoD, PAM (CyberArk, Safeguard y comparativo) y modelo de roles.
 * Los artículos iam-kb-025..iam-kb-037 cubren el entorno 'Plataformas
 * IAM' con el conocimiento operativo de los vendors que Nexora opera
 * o evalúa (bóveda Safeguard en producción; Okta en piloto para el
 * portafolio SaaS; SailPoint, One Identity, ForgeRock, Ping, IBM y
 * Oracle en evaluación RFP para IGA/federación).
 *
 * El contrato espeja 1:1 al de sysadminKB (SysAdminKbArticle): el
 * coordinator cableja la pestaña 'kb' de IamView con IAM_KB_ARTICLES +
 * IAM_KB_BY_ID, y los tickets del pilar referencian estos ids vía
 * kbRef ('iam-kb-001'...). La interfaz vive aquí (no en types/index.ts)
 * para que el dataset sea autocontenido hasta que se consolide.
 */

/** Entorno/plataforma dominante del artículo (filtro por torre IAM). */
export type IamEnvironment =
  | 'Active Directory'
  | 'Entra ID / M365'
  | 'Aplicaciones SaaS'
  | 'PAM / Privilegios'
  | 'Gobernanza'
  | 'Plataformas IAM'
  | 'Multi';

/** Paso de un artículo de la KB IAM (uso interno de este módulo). */
interface IamKbStep {
  title: string;
  detail?: string;
  /** Comando educativo (PowerShell / Graph / portal) — texto plano. */
  command?: string;
}

/** Artículo de la base de conocimiento IAM (dataset estático). */
export interface IamKbArticle {
  id: string;
  title: string;
  category: string;
  /** Entorno dominante del artículo. */
  environment: IamEnvironment;
  /** Cuándo aplica el artículo (síntomas). */
  symptoms: string;
  /** Causa(s) típica(s). */
  cause: string;
  steps: IamKbStep[];
  /** Cómo confirmar que quedó resuelto. */
  verification?: string;
  escalation?: string;
  /** Nombres de términos del glosario relacionados. */
  relatedTerms?: string[];
  /** Ids de tickets del dataset que lo referencian. */
  relatedTickets?: string[];
}

export const IAM_KB_ARTICLES: IamKbArticle[] = [
  {
    id: 'iam-kb-001',
    title: 'Proceso de onboarding (Joiner): alta de nuevo empleado',
    category: 'IAM - Ciclo de vida (JML)',
    environment: 'Multi',
    symptoms: 'El flujo Joiner se dispara cuando RRHH registra la contratación en el sistema de RRHH (fuente de autoridad) y se abre el ticket JML en ServiceNow: un nuevo empleado necesita identidad y accesos listos para su primer día. Los dos síntomas de un onboarding malo son visibles de inmediato: el usuario que no puede ni abrir el correo el día uno, o el usuario con accesos de más que se pidieron apurados "para no estorbar".',
    cause: 'No es un fallo sino el flujo de entrada del ciclo JML. Los errores típicos nacen de: alta en RRHH incompleta o tardía (el ticket llega sin fecha de inicio o sin rol definido), solicitudes de accesos que no están en la matriz de roles, o cuentas creadas a mano sin seguir la convención de nombres y atributos.',
    steps: [
      {
        title: 'Validar la fuente de autoridad y el ticket',
        detail: 'El ticket JML debe nacer del registro de RRHH: nombre completo, documento, cargo, área, fecha de inicio y manager. Si la solicitud llegó por chat o correo directo, no ejecutar: pedir que se formalice en ServiceNow. Sin fuente de autoridad no hay alta: es la diferencia entre un onboarding y una cuenta fantasma que nadie sabe quién pidió.'
      },
      {
        title: 'Verificar que la identidad no exista ya',
        detail: 'Colisiones de nombre (dos Ana Torres) y altas duplicadas son el error clásico del copy-paste de tickets viejos. Buscar por displayName y por el SamAccountName propuesto antes de crear nada.',
        command: 'Get-ADUser -LDAPFilter "(displayName=Ana Torres)"'
      },
      {
        title: 'Crear la cuenta AD con la convención de nombres',
        detail: 'Formato pnombre.apellido, UPN con el sufijo verificado nexora.com (no el .local: el UPN híbrido es el que manda en el login de M365), en la OU de empleados, habilitada y con cambio obligatorio de contraseña al primer inicio.',
        command: 'New-ADUser -Name "Ana Torres" -GivenName Ana -Surname Torres -SamAccountName ana.torres -UserPrincipalName ana.torres@nexora.com -Path "OU=Empleados,OU=Nexora,DC=nexora,DC=local" -Enabled $true -ChangePasswordAtLogon $true'
      },
      {
        title: 'Completar los atributos que alimentan los procesos',
        detail: 'Title, Department, Manager y EmployeeID no son decoración: la matriz de roles se aplica por atributos, la access review filtra por Department y las attestaciones se envían al Manager. Una cuenta sin atributos es invisible para la gobernanza y solo genera trabajo manual después.',
        command: 'Set-ADUser -Identity ana.torres -EmployeeID 4471 -Title "Analista de compras" -Department Compras -Manager lucia.pereyra'
      },
      {
        title: 'Asignar los grupos birthright y de rol según la matriz',
        detail: 'Birthright (correo, intranet, VPN, SSO base) va para todo empleado; los grupos del rol salen de la matriz de roles (iam-kb-009), jamás de la memoria del que pide. Si el acceso pedido no está en la matriz, se abre solicitud de acceso con aprobación del dueño del sistema: no se "va viendo".',
        command: 'Add-ADGroupMember -Identity NXR-BASE-EMPLEADO -Members ana.torres'
      },
      {
        title: 'Asignar la licencia M365 que corresponde al rol',
        detail: 'La matriz de licencias define el SKU por cargo (E3 base, E5 para seguridad). Primero va el UsageLocation (sin él la asignación falla, iam-kb-010) y después la licencia. La asignación por grupo (LIC-E3) es la forma preferida: se hereda sola y se retira sola.',
        command: 'Set-MsolUser -UserPrincipalName ana.torres@nexora.com -UsageLocation CO'
      },
      {
        title: 'Verificar primer login y registro de MFA/SSPR',
        detail: 'El primer inicio debe pedir cambio de contraseña, registro de MFA y datos de SSPR: es el momento de guiar al usuario, no de esperarlo. Confirmar el primer sign-in exitoso en los logs, cerrar el ticket con la evidencia del alta y dejar documentada la línea base MemberOf para futuras transferencias (iam-kb-003).',
        command: 'Get-ADUser -Identity ana.torres -Properties MemberOf,Title,Manager,Enabled'
      }
    ],
    verification: 'El empleado inicia sesión el primer día en AD y M365, MemberOf contiene exactamente birthright + rol (ni más ni menos), la licencia del cargo quedó asignada y el ticket documenta fuente de autoridad, atributos y grupos concedidos.',
    escalation: 'Líder de IAM (roles o licencias fuera de la matriz: se tramitan como solicitud de acceso con aprobación del dueño del sistema)',
    relatedTerms: ['Joiner-Mover-Leaver (JML)', 'Onboarding / Offboarding de accesos', 'Birthright access', 'Matriz de roles'],
    relatedTickets: ['iam-001', 'iam-027']
  },
  {
    id: 'iam-kb-002',
    title: 'Proceso de offboarding (Leaver): baja y revocación total de accesos',
    category: 'IAM - Ciclo de vida (JML)',
    environment: 'Multi',
    symptoms: 'RRHH registra la fecha de salida de un empleado y la identidad debe quedar inerte ESE mismo día: sin login, sin licencias, sin tokens, sin accesos a ninguna aplicación. Los síntomas de un offboarding fallido aparecen después y duelen más: cuentas activas semanas después de la salida (cuenta huérfana) o licencias M365 pagadas para gente que ya no está.',
    cause: 'Salida voluntaria, fin de contrato o despido. El proceso falla cuando la fecha de RRHH llega tarde (o nunca), cuando el deshabilitado se hace "el lunes siguiente" en lugar del día acordado, o cuando solo se toca AD y quedan vivos los tokens de M365, las apps SaaS y los accesos de bóveda.',
    steps: [
      {
        title: 'Confirmar fecha, hora y alcance con RRHH',
        detail: 'Fecha exacta de corte (y si es salida hostil, coordinar con el manager la hora precisa: a veces hay que cortar antes del aviso). Confirmar destino de los datos: retención del buzón, export o delegación al sucesor. Ese acuerdo evita el ticket de pánico "necesito los correos de X" dos semanas después.'
      },
      {
        title: 'Deshabilitar la cuenta en la fecha y hora acordadas',
        detail: 'Deshabilitar no es borrar: la cuenta se conserva para la pista de auditoría y el borrado solo ocurre bajo la política de retención (12 meses en Nexora). Ejecutarlo puntual: deshabilitar antes de la fecha rompe la entrega, deshabilitar después deja la ventana de riesgo que el auditor señala.',
        command: 'Disable-ADAccount -Identity ana.torres'
      },
      {
        title: 'Revocar sesiones y tokens activos en la nube',
        detail: 'Deshabilitar AD no mata las sesiones de M365 ya abiertas ni los tokens OAuth de las apps: el usuario "sigue dentro" del correo y de Teams desde el móvil hasta que se revocan. Es el paso que más se olvida y el que más exposición deja.',
        command: 'Revoke-MgUserSignInSession -UserId ana.torres@nexora.com'
      },
      {
        title: 'Retirar las licencias M365',
        detail: 'Liberar la licencia devuelve el costo al pool y detiene la facturación fantasma. El buzón entra en periodo de gracia (~30 días): si hay retención de datos, convertirlo a buzón compartido o delegar acceso al sucesor ANTES de que termine la gracia (iam-kb-010).',
        command: 'Set-MsolUserLicense -UserPrincipalName ana.torres@nexora.com -RemoveLicenses "nexora:ENTERPRISEPACK"'
      },
      {
        title: 'Vaciar las membresías de grupos',
        detail: 'Deja el directorio limpio para la próxima access review y evita que el histórico de grupos mienta sobre quién tiene qué. El historial de la membresía queda registrado en los eventos de auditoría de los DC (iam-kb-019): vaciar no destruye evidencia.',
        command: 'Get-ADPrincipalGroupMembership ana.torres | Where-Object Name -ne "Domain Users" | ForEach-Object { Remove-ADGroupMember $_ -Members ana.torres -Confirm:$false }'
      },
      {
        title: 'Cerrar los accesos laterales',
        detail: 'Checklist por fuera del IdP: apps SaaS con cuenta local propia (iam-kb-020), roles elegibles en PIM y checkouts de la bóveda PAM (iam-kb-012), certificados VPN, llaves SSH en repos y accesos físicos (hand-off con Instalaciones). Cada línea del checklist con su evidencia en el ticket.'
      },
      {
        title: 'Verificar y registrar la evidencia del leaver',
        detail: 'El intento de login falla en AD y M365, la licencia desapareció del tenant y no quedan sesiones activas. Marcar la cuenta (descripción "Leaver 2026-05-30 - ticket IAM-2041") y cerrar el ticket con la hora exacta de cada acción: esa precisión convierte el checklist en pista de auditoría.',
        command: 'Get-ADUser -Identity ana.torres -Properties Enabled,MemberOf,LastLogonDate'
      }
    ],
    verification: 'El login falla en AD y M365, la licencia quedó liberada, la revocación de sesiones tiene evidencia en el ticket y la cuenta aparece deshabilitada con la marca de leaver y su fecha para la revisión trimestral.',
    escalation: 'SOC (salidas hostiles o cualquier intento de uso de la cuenta después del corte: se trata como posible compromiso)',
    relatedTerms: ['Account deprovisioning', 'Cuenta huérfana (orphaned account)', 'Revocación de sesiones y tokens', 'Auditoría de accesos'],
    relatedTickets: ['iam-002', 'iam-028']
  },
  {
    id: 'iam-kb-003',
    title: 'Transferencia interna (Mover): cambio de rol o departamento',
    category: 'IAM - Ciclo de vida (JML)',
    environment: 'Multi',
    symptoms: 'Un empleado cambia de puesto o de área dentro de Nexora: mismo usuario, nuevos accesos y, la mitad crítica que todos olvidan, la PÉRDIDA de los antiguos. El síntoma típico de un Mover mal ejecutado lo encuentra la auditoría meses después: el transferido de Finanzas a Compras que aún puede ver los reportes financieros "por si acaso".',
    cause: 'Flujo Mover del ciclo JML. El riesgo dominante es el entitlement creep: los permisos del puesto anterior se conservan por comodidad o por una "semana de transición" que nadie cierra. El segundo error es asignar los grupos nuevos a mano sin consultar la matriz de roles.',
    steps: [
      {
        title: 'Validar el ticket de transferencia',
        detail: 'Rol nuevo, área, fecha efectiva y manager de destino, con respaldo en RRHH. Si la fecha efectiva es futura, agendarla: no se ejecuta "ya" un Mover que empieza el primero del mes, porque el usuario pierde el acceso actual antes de tiempo.'
      },
      {
        title: 'Inventariar los accesos actuales antes de tocar nada',
        detail: 'La línea base del "antes" permite verificar el diff al final y es la evidencia de que la transferencia retiró lo que debía retirar. Sin línea base, la verificación del Mover es un "creo que quedó bien".',
        command: 'Get-ADPrincipalGroupMembership ana.torres | Select-Object Name | Export-Csv C:\\Temp\\mover-antes.csv'
      },
      {
        title: 'Retirar los grupos del rol anterior en la fecha efectiva',
        detail: 'Mismo día de la transferencia, sin periodo de gracia salvo transición formal aprobada con fecha de fin. Quitar primero evita el estado intermedio con ambos accesos que nadie cierra después.',
        command: 'Remove-ADGroupMember -Identity NXR-FIN-ALTAS -Members ana.torres -Confirm:$false'
      },
      {
        title: 'Asignar los grupos del rol nuevo según la matriz',
        detail: 'Los grupos salen de la matriz de roles del puesto de destino, no del criterio del usuario ni del manager. Lo que la matriz no cubre es solicitud de acceso con aprobación del dueño del sistema (Access Request Management), con su propio registro.',
        command: 'Add-ADGroupMember -Identity NXR-COMPRAS-USUARIO -Members ana.torres'
      },
      {
        title: 'Actualizar los atributos de posición',
        detail: 'Department, Title y Manager deben reflejar el puesto NUEVO el mismo día: la access review filtra por ellos y las attestaciones se rutan al manager vigente. Un Department viejo envía la certificación al gerente equivocado y invalida la campaña.',
        command: 'Set-ADUser -Identity ana.torres -Department Compras -Title "Especialista en compras" -Manager lucia.pereyra'
      },
      {
        title: 'Chequear segregación de funciones',
        detail: 'Las transferencias son el momento clásico en que aparecen combinaciones tóxicas (quien creaba proveedores y pasa a aprobar pagos). Correr el cruce SoD del nuevo conjunto de grupos antes de cerrar (iam-kb-015): el Mover es control preventivo, no un trámite.',
        command: 'Get-ADGroupMember NXR-COMPRAS-APR -Recursive | Export-Csv C:\\Temp\\sod-compras.csv'
      },
      {
        title: 'Verificar y documentar el antes/después',
        detail: 'Comparar MemberOf contra la línea base: deben quedar exactamente birthright + rol nuevo. Confirmar con el usuario que entra a las apps de su nuevo puesto y que ya no ve las del anterior. Adjuntar el diff al ticket: es el insumo de la próxima certificación.',
        command: 'Get-ADPrincipalGroupMembership ana.torres'
      }
    ],
    verification: 'MemberOf coincide con birthright + rol nuevo (diff contra la línea base limpio), el usuario opera las apps del nuevo puesto y ya no las del anterior, y el chequeo SoD pasó.',
    escalation: 'Líder de IAM + dueño del sistema de destino (accesos que el rol nuevo no cubre: solicitud de acceso formal, no ampliación informal)',
    relatedTerms: ['Transferencia interna (mover)', 'Entitlement creep', 'Separación de funciones (SoD)', 'Matriz de roles'],
    relatedTickets: ['iam-003', 'iam-029']
  },
  {
    id: 'iam-kb-004',
    title: 'Gestión de grupos de seguridad en Active Directory',
    category: 'IAM - Active Directory',
    environment: 'Active Directory',
    symptoms: 'Tres escenarios del día a día: llega la solicitud "agrega a X al grupo Y" sin más contexto, el usuario quedó en el grupo pero no ve el recurso, o hay que crear un grupo nuevo para un permiso nuevo. En Nexora el grupo de seguridad es la unidad de permiso: toda la matriz de roles se implementa con grupos, así que su higiene es la higiene de todo el sistema.',
    cause: 'Los problemas de grupos nacen de: permisos otorgados por usuario directo en el recurso, grupos sin dueño ni descripción que nadie se atreve a borrar, anidamiento caótico heredado, y el clásico "lo agregué y no ve nada": Kerberos carga los grupos del inicio de sesión anterior en el ticket que ya tiene vivo.',
    steps: [
      {
        title: 'Verificar que el grupo existe y pertenece a la matriz',
        detail: 'Todo grupo de seguridad de Nexora tiene dueño (ManagedBy), descripción con propósito y lugar en la matriz de roles. Si un ticket pide un grupo que no existe en la matriz, no se crea "rápido": se consulta al dueño del sistema y se documenta.',
        command: 'Get-ADGroup -Identity NXR-SAP-LEC -Properties Description,ManagedBy'
      },
      {
        title: 'Crear grupos con la convención NXR-sistema-perfil',
        detail: 'Nombre, ámbito Global (roles de usuarios del dominio), categoría Security, descripción con propósito y owner. La descripción no es burocracia: es lo que el técnico de dentro de un año necesita para saber si puede tocar ese grupo o preguntar primero.',
        command: 'New-ADGroup -Name "NXR-SAP-LEC" -SamAccountName NXR-SAP-LEC -GroupScope Global -GroupCategory Security -Description "SAP FI solo lectura - owner: Finanzas - matriz v3.2" -ManagedBy carlos.mendez'
      },
      {
        title: 'Asignar permisos con grupos, nunca con usuarios',
        detail: 'El recurso (carpeta, share, aplicación) recibe el permiso del grupo; las personas entran y salen del grupo sin tocar el recurso. Un permiso por usuario directo es la deuda que la próxima access review no podrá revocar sin arqueología: si se encuentra uno, migrarlo a grupo en el mismo ticket.'
      },
      {
        title: 'Añadir miembros solo con autorización vigente',
        detail: 'La regla de Nexora: ningún Add-ADGroupMember sin ticket que lo ampare (solicitud aprobada, Mover o rol de matriz). Además el grupo hereda trazabilidad gratis: cada entrada y salida queda en los eventos 4728/4729 de los DC (iam-kb-019).',
        command: 'Add-ADGroupMember -Identity NXR-SAP-LEC -Members ana.torres'
      },
      {
        title: 'Verificar la membresía efectiva (incluidos los anidados)',
        detail: 'Un usuario puede llegar al permiso por un grupo dentro de otro grupo. -Recursive resuelve la cadena completa: es la vista con la que se responde "¿por qué tiene acceso este usuario?" sin recorrer el árbol a mano.',
        command: 'Get-ADGroupMember NXR-SAP-LEC -Recursive'
      },
      {
        title: 'Refrescar el ticket Kerberos del usuario',
        detail: 'El detalle más común: el usuario quedó en el grupo pero su sesión arrancó antes, así que su ticket de Kerberos lleva los grupos viejos. klist purge (o cerrar sesión) obliga a renovar y el recurso aparece. Diagnosticar esto antes de "agregarlo a otro grupo por si acaso".',
        command: 'klist purge'
      },
      {
        title: 'Cerrar con registro y cola de limpieza',
        detail: 'El cambio de grupo queda documentado en el ticket con su autorización. Grupos vacíos, sin dueño o sin uso en el último año entran a la lista de limpieza de la access review trimestral (iam-kb-014): un grupo muerto con permisos vivos es riesgo sin función.',
        command: 'Get-ADGroup -LDAPFilter "(&(description=*))" -Properties Description | Measure-Object'
      }
    ],
    verification: 'Get-ADGroupMember -Recursive muestra al usuario en la cadena correcta, tras renovar el ticket (klist purge o relogin) el usuario ve el recurso, y el grupo queda con descripción y dueño vigentes.',
    escalation: 'Dueño del sistema (permisos internos de la aplicación que el grupo no cubre, o creación de grupos fuera de matriz)',
    relatedTerms: ['Grupos de seguridad de AD', 'ADUC (Usuarios y equipos de Active Directory)', 'Kerberos (TGT / ST)', 'Matriz de roles'],
    relatedTickets: ['iam-004', 'iam-030']
  },
  {
    id: 'iam-kb-005',
    title: 'Reseteo de contraseña: self-service (SSPR) y asistido',
    category: 'IAM - Acceso & Autenticación',
    environment: 'Entra ID / M365',
    symptoms: 'Un usuario no puede entrar: contraseña olvidada, caducada o "la cambiaron y no sé quién". Hay dos caminos y elegir bien es el trabajo: SSPR (el usuario se autogestiona en el portal) o reseteo asistido (el equipo IAM la restablece). El riesgo invisible de cada reseteo es el mismo: es el escenario favorito del social engineering.',
    cause: 'Olvido, expiración de la credencial, phishing (el usuario "la escribió en una página rara"), o teléfono perdido que deja al SSPR sin medio de verificación. La elección del canal depende de si el usuario está registrado en SSPR y de si la cuenta es híbrida (AD sincronizado a Entra ID).',
    steps: [
      {
        title: 'Verificar la identidad antes que nada',
        detail: 'Protocolo de Nexora: contrastar datos contra el sistema de RRHH (documento, cargo, manager) y confirmar con el manager o por videollamada si hay algo inconsistente. NUNCA restablecer por teléfono con solo nombre y apellido, y registrar en el ticket QUÉ método de verificación se usó: esa línea es la defensa del equipo si mañana el usuario dice "no fui yo".'
      },
      {
        title: 'Derivar al SSPR si el usuario está registrado',
        detail: 'El SSPR (https://aka.ms/sspr) le devuelve el control al usuario sin exponer contraseñas por canales intermedios y funciona 24x7 sin cola. Verificar que tenga método de verificación registrado; si no lo tiene, el caso pasa a reseteo asistido y queda anotado para la campaña de registro de SSPR.',
        command: 'Get-MgUserAuthenticationMethod -UserId ana.torres@nexora.com'
      },
      {
        title: 'Restablecer asistido en AD con cambio obligatorio',
        detail: 'El reseteo marca la contraseña para cambio en el próximo inicio: el usuario nunca conserva la que el analista tecleó. La contraseña temporal se entrega por un canal DISTINTO al del ticket (si la solicitud llegó por un correo comprometido, ese canal ya no es de confianza).',
        command: 'Set-ADAccountPassword -Identity ana.torres -Reset'
      },
      {
        title: 'Desbloquear si la cuenta quedó bloqueada',
        detail: 'Muchos reseteos llegan con la cuenta bloqueada por intentos fallidos (iam-kb-007). Desbloquear y restablecer en la misma atención evita el ticket reincidente de "ahora dice bloqueada".',
        command: 'Unlock-ADAccount -Identity ana.torres'
      },
      {
        title: 'Sincronizar la contraseña nueva hacia la nube',
        detail: 'En identidad híbrida la contraseña se restablece en AD y viaja a Entra ID con el hash sync del siguiente ciclo (~30 min, iam-kb-018). "La contraseña nueva no sirve para el correo" es casi siempre el delta pendiente, no un segundo problema. Forzar el ciclo acorta la espera cuando el usuario está en línea.',
        command: 'Start-ADSyncSyncCycle -PolicyType Delta'
      },
      {
        title: 'Verificar el login en ambos lados',
        detail: 'Probar el acceso en AD (estación o VPN) y en M365 (portal de correo), y vigilar que no re-bloquee en la siguiente hora: si lo hace, hay un origen automatizado con la credencial vieja (móvil con wifi corporativa, credenciales guardadas) que hay que corregir, no seguir desbloqueando en bucle (iam-kb-007).',
        command: 'Get-ADUser -Identity ana.torres -Properties LockedOut,pwdLastSet,LastLogonDate'
      },
      {
        title: 'Cerrar con la evidencia de verificación',
        detail: 'El ticket documenta: método de verificación de identidad, quién autorizó (si aplicó), hora y canal de entrega de la temporal. Si la causa fue phishing o hay sospecha, la cuenta pasa por revocación de sesiones y revisión (iam-kb-023) ANTES de dar el asunto por cerrado.'
      }
    ],
    verification: 'El usuario entra con la nueva contraseña en AD y M365, la cuenta no re-bloquea en la hora siguiente, y el ticket documenta método de verificación, autorizador y canal de entrega.',
    escalation: 'SOC (causa phishing, verificación de identidad contradictoria o petición de reseteo con señales de social engineering)',
    relatedTerms: ['Self-Service Password Reset (SSPR)', 'Registro de SSPR', 'Restablecimiento de contraseña por admin', 'Bloqueo de cuenta (lockout)'],
    relatedTickets: ['iam-005', 'iam-031']
  },
  {
    id: 'iam-kb-006',
    title: 'Configurar y resetear MFA (incluye teléfono nuevo/perdido)',
    category: 'IAM - Acceso & Autenticación',
    environment: 'Entra ID / M365',
    symptoms: 'Tres escenarios con el mismo síntoma "no puedo entrar": el registro inicial de MFA del empleado nuevo, el teléfono nuevo con el Authenticator sin migrar, y el teléfono perdido o robado que deja al usuario sin segundo factor. El tercer escenario es también el relato favorito del atacante que quiere registrar SU dispositivo como segundo factor de una cuenta ajena.',
    cause: 'Cambio de dispositivo sin migrar las cuentas del Microsoft Authenticator, pérdida o robo del equipo, o compromiso confirmado de la cuenta que exige re-registrar los métodos YA. La gravedad cambia con el escenario: la pérdida es un asunto de disponibilidad que puede convertirse en uno de seguridad.',
    steps: [
      {
        title: 'Clasificar el caso antes de tocar nada',
        detail: 'Registro (primer día), migración (teléfono nuevo con el viejo a mano) o pérdida/robo (sin acceso al factor anterior). Solo el tercero activa el circuito de seguridad: revocación preventiva de sesiones y prioridad alta. Clasificar mal convierte un compromiso en un trámite de mesa de ayuda.'
      },
      {
        title: 'Verificar identidad reforzada en pérdidas y re-registros',
        detail: 'Doble verificación: datos de RRHH + confirmación del manager, videollamada si el usuario es remoto. El atacante llama con el relato exacto del teléfono perdido y mucha prisa. Registrar quién verificó y con qué evidencia: el re-registro de MFA es la llave de la cuenta y el ticket es la coartada del equipo.',
        command: 'Revoke-MgUserSignInSession -UserId ana.torres@nexora.com'
      },
      {
        title: 'Emitir un Temporary Access Pass de vida corta',
        detail: 'Entra admin center → Users → usuario → Authentication methods → Temporary Access Pass: clave de un solo uso con vigencia de 60 minutos que permite entrar SIN segundo factor para registrar los métodos nuevos. Es la forma controlada de romper el círculo "sin MFA no puedo registrar MFA", mucho mejor que andar apagando políticas a mano.'
      },
      {
        title: 'Exigir re-registro del MFA (borra los métodos viejos)',
        detail: 'Entra admin center → Users → Authentication methods → "Require re-register multifactor authentication": invalida el Authenticator, el teléfono y cualquier método anterior. Con el TAP activo, el usuario re-registra en https://aka.ms/mfasetup (FIDO2/passkey primero si el rol lo permite).'
      },
      {
        title: 'Migrar teléfono nuevo sin re-registro total (si aplica)',
        detail: 'Si el usuario conserva el teléfono viejo, el propio Authenticator ofrece mover las cuentas a otro dispositivo con el backup en la nube habilitado en Nexora. Es más rápido y deja el rastro limpio; el re-registro total se reserva para pérdidas y compromisos.'
      },
      {
        title: 'Verificar el nuevo método con un login real',
        detail: 'Un sign-in de punta a punta con el método nuevo (los sign-in logs deben mostrar MFA satisfecho) y la lista de métodos sin restos del viejo. Registrar métodos activos, hora y verificador en el ticket.',
        command: 'Get-MgUserAuthenticationMethod -UserId ana.torres@nexora.com'
      },
      {
        title: 'Educar y elevar el factor donde importa',
        detail: 'Con cada caso: MFA fatigue (nunca aprobar un push no solicitado y reportarlo), backup del Authenticator activado, y phishing-resistant MFA (FIDO2) obligatorio para roles privilegiados (iam-kb-012). La educación en el momento del ticket fija más que la campaña anual.',
        command: 'Get-MgAuditLogSignIn -Top 20 | Where-Object UserPrincipalName -eq "ana.torres@nexora.com"'
      }
    ],
    verification: 'El usuario completa un login con el método nuevo (sign-in logs con MFA satisfecho), no quedan métodos del dispositivo anterior y el ticket documenta verificación de identidad, aprobador y hora.',
    escalation: 'SOC (solicitud de re-registro con verificación fallida o contradictoria: posible social engineering en curso)',
    relatedTerms: ['Multi-Factor Authentication (MFA)', 'MFA fatigue (ataque)', 'Phishing-resistant MFA', 'FIDO2 / WebAuthn'],
    relatedTickets: ['iam-006', 'iam-032']
  },
  {
    id: 'iam-kb-007',
    title: 'Cuentas bloqueadas y políticas de lockout (AD vs Smart Lockout)',
    category: 'IAM - Acceso & Autenticación',
    environment: 'Multi',
    symptoms: 'Un usuario (o varios a la vez) no puede entrar: "cuenta bloqueada" en el login de Windows o rechazo desde M365. El trabajo es doble: desbloquear rápido y entender QUÉ bloquea, porque AD y Entra ID bloquean con lógicas distintas y el origen suele ser un cliente con credenciales viejas, no un usuario despistado.',
    cause: 'En AD, la Default Domain Policy bloquea tras N intentos fallidos (lockoutThreshold) y el evento 4740 registra quién causó el bloqueo. En Entra ID, el Smart Lockout bloquea de forma inteligente ante riesgo (mismas fuentes reintentando) y se libera solo: no hay botón de desbloqueo. Orígenes típicos: credenciales viejas cacheadas (wifi del móvil, credman, unidad mapeada, tarea programada) o un password spraying.',
    steps: [
      {
        title: 'Confirmar el alcance: uno o muchos',
        detail: 'Un usuario bloqueado es casi siempre un origen local de credenciales viejas. Varios usuarios de la misma área a la misma hora apuntan a spraying o a un cambio masivo: en ese caso lo siguiente es avisar al SOC (iam-kb-023), no ir desbloqueando de a uno.',
        command: 'Search-ADAccount -LockedOut'
      },
      {
        title: 'Leer el evento 4740 en el DC',
        detail: 'El evento de bloqueo trae el Caller Computer Name: la máquina o cliente que generó los intentos fallidos. Esa línea es la pista de oro que evita desbloquear a ciegas: la estación del usuario, un servidor con servicio de credencial vieja, o una fuente que no debería estar intentando nada.',
        command: "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4740} -MaxEvents 10"
      },
      {
        title: 'Identificar el origen del badPwdCount en el cliente',
        detail: 'Revisar con el usuario: Credential Manager con contraseñas guardadas, móvil con la wifi corporativa y la contraseña vieja sincronizada, unidades de red mapeadas con credencial embebida, tareas programadas o servicios con la credencial caducada. El "yo no estaba escribiendo la contraseña" casi siempre es verdad: la estaba escribiendo otro proceso.'
      },
      {
        title: 'Desbloquear y observar si re-bloquea',
        detail: 'Desbloquear UNA vez y vigilar: si la cuenta re-bloquea en minutos, el origen automatizado sigue vivo. NO quedarse en el bucle de desbloquear cada 15 minutos: lo que se corrige es el origen (renovar la credencial en el cliente culpable), no el síntoma hasta el viernes.',
        command: 'Unlock-ADAccount -Identity ana.torres'
      },
      {
        title: 'Diferenciar el Smart Lockout de Entra ID',
        detail: 'Si el bloqueo es de la nube: el Smart Lockout no se desbloquea manualmente, se libera solo tras su ventana y solo para fuentes legítimas. El diagnóstico vive en los sign-in logs: fuente de los intentos, app o protocolo usado (legacy auth es el compañero frecuente de estos bloqueos, iam-kb-017).',
        command: 'Get-MgAuditLogSignIn -Top 50 | Where-Object UserPrincipalName -eq "ana.torres@nexora.com"'
      },
      {
        title: 'Corregir la causa raíz en el origen',
        detail: 'Según el Caller del 4740: renovar la credencial guardada del credman, sacar la contraseña vieja del móvil o del servicio, actualizar la tarea programada. Si el origen fue un typo honesto, educación; si fue una fuente extraña, hand-off al SOC con la evidencia del evento.',
        command: "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625} -MaxEvents 20"
      },
      {
        title: 'Registrar el patrón para la detección',
        detail: 'Lockouts recurrentes con la misma firma (misma fuente, misma hora) alimentan las reglas de identidad del SIEM (iam-kb-019): spraying y credenciales viejas masivas dejan patrones que un solo ticket no revela. Cerrar con origen identificado y acción aplicada, no solo "se desbloqueó".'
      }
    ],
    verification: 'El usuario entra sin re-bloqueo en las horas siguientes, el Caller del 4740 quedó identificado y corregido (o reportado al SOC con evidencia), y el patrón quedó documentado para la revisión semanal.',
    escalation: 'SOC (patrón masivo o una misma fuente bloqueando varias cuentas: password spraying en curso)',
    relatedTerms: ['Bloqueo de cuenta (lockout)', 'Password spraying', 'Identity Protection', 'Sign-in risk (riesgo de inicio de sesión)'],
    relatedTickets: ['iam-007', 'iam-033']
  },
  {
    id: 'iam-kb-008',
    title: 'SSO: SAML y OIDC — conceptos y troubleshooting básico',
    category: 'IAM - Aplicaciones & SSO',
    environment: 'Aplicaciones SaaS',
    symptoms: 'Una app federada "no deja entrar": loop de redirección tras el login del IdP, pantalla con error SAML o código AADSTS, o la app dejó de funcionar un domingo sin que nadie tocara nada (el certificado de federación venció). En apps OIDC, los síntomas son "invalid_client" o redirect mismatch.',
    cause: 'Certificado de firma del IdP renovado sin recargar metadata en el SP, usuario sin asignación en la enterprise app, claims/NameID que la app espera y el IdP no emite (user.mail vs UPN), ACS/reply URL cambiada por el proveedor, desvío de reloj entre IdP y SP, o client secret vencido en apps OIDC registradas hace tiempo.',
    steps: [
      {
        title: 'Tener claro el modelo antes de diagnosticar',
        detail: 'Quién es el IdP (Entra ID en Nexora) y quién el SP (la app SaaS), y si el flujo es SP-initiated (se entra desde la app) o IdP-initiated (desde el portal My Apps). El error puede estar en cualquiera de los dos lados: el modelo evita la pesquisa "a ver si el usuario borra cookies", que es lo que más se hace y lo que menos sirve.',
        command: 'Get-MgAuditLogSignIn -Top 20 | Where-Object AppDisplayName -eq "Concur"'
      },
      {
        title: 'Confirmar que el usuario está asignado a la app',
        detail: 'En enterprise apps, Users and groups: la causa más simple y más frecuente del "no puedo entrar" es que nadie asignó al usuario o al grupo nuevo de su área. Sin asignación no hay token: corregir la asignación y reintentar antes de investigar más hondo.'
      },
      {
        title: 'Leer el sign-in log del intento fallido',
        detail: 'El IdP registra el intento con el código exacto: AADSTS50011 (reply URL/ACS no coincide), AADSTS50008 (claim ausente), AADSTS50020 (la cuenta no existe en el tenant), AADSTS50155 (renovación de token por desvío de reloj). El sign-in log convierte dos horas de conjeturas en un código con documentación.',
        command: 'Get-MgAuditLogSignIn -Top 100 | Where-Object ConditionalAccessStatus -eq "failure"'
      },
      {
        title: 'Validar certificado y metadata de federación',
        detail: 'El token signing certificate del IdP vence anualmente: si la app no recarga la metadata automática, "falló solo" el día de la renovación. Verificar vigencia, descargar la metadata y coordinar el reload con el admin de la app. Agendar la próxima renovación en el inventario de apps con dueño: así se erradica el clásico incidente dominical.'
      },
      {
        title: 'Revisar los claims y el NameID',
        detail: 'La app espera user.mail y llega el UPN, o el NameID format cambió de emailAddress a unspecified: la assertion llega firmada y válida pero la app no encuentra al usuario. Comparar la tabla de claims que exige el SP contra lo que el IdP emite: el "attribute missing" casi siempre vive aquí.'
      },
      {
        title: 'Cuidar los loops y el clock skew',
        detail: 'Los loops de redirección suelen ser una assertion consumida dos veces (relojes desviados o relay state perdido). Mantener menos de 5 minutos de desvío entre IdP y SP (NTP en ambos) y reproducir con las herramientas de desarrollo del navegador viendo a dónde rebota cada hop.',
        command: 'w32tm /query /status'
      },
      {
        title: 'En OIDC: secret y redirect URI exactas',
        detail: 'Client secret vencido (el portal avisa la expiración con semanas: mirarlo), redirect URI con mayúscula, barra final o http en vez de https. Son strings de comparación exacta: "en mi navegador funciona" no cuenta. Documentar la fecha de expiración del secret en el inventario de apps con dueño.',
        command: 'Get-MgAuditLogDirectoryAudit -Top 50'
      }
    ],
    verification: 'Login end-to-end SP-initiated sin AADSTS, el sign-in log del intento queda en success, y la próxima fecha de vencimiento del certificado o secret quedó agendada en el inventario con dueño.',
    escalation: 'Dueño de la aplicación + proveedor SaaS (fallos del lado SP: metadata sin recargar, claims propios, certificado interno)',
    relatedTerms: ['SAML 2.0', 'Identity Provider (IdP)', 'Service Provider (SP)', 'OpenID Connect (OIDC)', 'Federación (identidad federada)'],
    relatedTickets: ['iam-008', 'iam-034']
  },
  {
    id: 'iam-kb-009',
    title: 'RBAC: diseño de roles y matrices de acceso',
    category: 'IAM - Roles & Privilegios',
    environment: 'Gobernanza',
    symptoms: 'No hay un incidente puntual: hay caos visible. Llegan tickets que piden "lo mismo que tiene X", la access review tarda semanas porque cada acceso se explica a mano, y el auditor pregunta por qué un analista puede administrar el sistema que audita. Es el momento de diseñar RBAC: roles por puesto y una matriz de acceso que responda esas preguntas sin arqueología.',
    cause: 'Crecimiento orgánico: permisos otorgados caso a caso durante años, aplicaciones nuevas con su propio criterio, y transferencias que acumularon capas. El resultado es identity sprawl: nadie sabe qué debería tener cada puesto, solo qué tiene hoy (y hoy está mal).',
    steps: [
      {
        title: 'Inventariar sistemas y dueños',
        detail: 'Lista de sistemas con su dueño del acceso (access owner): cada columna de la matriz futura necesita un nombre que firme. Sistemas sin dueño no entran al diseño: primero se les asigna responsable, después rol.',
        command: 'Get-ADGroup -LDAPFilter "(name=NXR-*)" | Select-Object Name,Description | Export-Csv C:\\Temp\\sistemas-inventario.csv'
      },
      {
        title: 'Recolectar los accesos reales de hoy (role mining)',
        detail: 'Exportar membresías actuales por grupo y por usuario: es la materia prima del role mining. No empezar de cero: los patrones de hoy (qué combinaciones de permisos usan realmente los puestos) son la mejor semilla para los roles, separando lo estructural de lo accidental.',
        command: 'Get-ADGroup -Filter * -Properties Member | Select-Object Name,Member | Export-Csv C:\\Temp\\roles-mining.csv'
      },
      {
        title: 'Definir roles por PUESTO, no por persona',
        detail: 'Un rol es un conjunto de entitlements coherente con una función (analista contable, aprobador de compras, administrador de SAP): se nombra por el puesto y sobrevive a las personas. "Los permisos de Ana" no es un rol: es el error que el diseño existe para eliminar.'
      },
      {
        title: 'Construir la matriz de acceso',
        detail: 'Filas: roles. Columnas: sistemas. Celda: nivel (Lectura / Escritura / Aprobación / Administración / Ninguno). La matriz es el documento vivo con versión: v1 imperfecta y publicada gana a la v1 perfecta que nunca sale, porque la access review la pule cada trimestre (iam-kb-014).'
      },
      {
        title: 'Validar con los dueños y detectar SoD',
        detail: 'Cada dueño firma su columna y las combinaciones tóxicas se marcan en la matriz (quien crea proveedores no aprueba pagos): el cruce SoD formal queda en iam-kb-015. Las discusiones que salen aquí son exactamente las que evitan hallazgos de auditoría después.',
        command: 'Get-ADGroupMember NXR-FIN-ALTAS -Recursive | Export-Csv C:\\Temp\\sod-fin-altas.csv'
      },
      {
        title: 'Implementar los roles como grupos o paquetes',
        detail: 'Un grupo AD por rol (NXR-ROL-<puesto>) para lo on-prem, o access packages de Entra entitlement management para lo que viva en la nube, con política de expiración para accesos temporales. La implementación hereda el nombre del rol: el grupo es el rol operativo.',
        command: 'New-ADGroup -Name "NXR-ROL-ANALISTA-COMPRAS" -SamAccountName NXR-ROL-ANALISTA-COMPRAS -GroupScope Global -GroupCategory Security -Description "Rol analista de compras - matriz v3.2"'
      },
      {
        title: 'Migrar y mantener',
        detail: 'Mover a los usuarios de permisos sueltos a roles por oleadas (no un big bang de un fin de semana). Mantenimiento: la matriz se revisa en cada reorganización y en cada access review trimestral; el role mining se repite al menos una vez al año para detectar desviación (IAM drift).'
      }
    ],
    verification: 'Cada acceso activo de cada empleado se explica por un rol de la matriz (muestreo aleatorio), los dueños firmaron su columna, y una cuenta de prueba del rol nuevo accede a lo suyo y NO a lo de otros roles.',
    escalation: 'Líder de IAM + dueños de sistema (entitlements conflictivos o combinaciones que nadie quiere firmar)',
    relatedTerms: ['Role-Based Access Control (RBAC)', 'Matriz de roles', 'Role mining / Role engineering', 'Entitlement', 'Access package'],
    relatedTickets: ['iam-009', 'iam-035']
  },
  {
    id: 'iam-kb-010',
    title: 'Asignación y troubleshoot de licencias M365',
    category: 'IAM - Entra ID / M365',
    environment: 'Entra ID / M365',
    symptoms: 'El usuario no ve Teams o el correo, el portal muestra un error amarillo al asignar la licencia, la facturación mensual trae licencias pagadas sin nadie encima, o el usuario del E3 necesita funciones del E5. Las licencias son identidad con costo: gestionarlas bien es parte del trabajo IAM, no un detalle de facturación.',
    cause: 'Falta de UsageLocation, conflicto de service plans entre SKUs, licencias group-based mal depuradas, offboardings que no retiraron la licencia (iam-kb-002), o exceso otorgado "por si acaso" que nadie reclama. La matriz de licencias por cargo es el criterio; sin ella, cada asignación es una opinión.',
    steps: [
      {
        title: 'Asignar UsageLocation antes que nada',
        detail: 'Sin UsageLocation la asignación falla con el error clásico ("AssignedUsageLocationRequired"). El atributo viene del país de la cuenta y también condiciona qué servicios están disponibles. Es el paso de 10 segundos que evita el error de 10 minutos.',
        command: 'Set-MsolUser -UserPrincipalName ana.torres@nexora.com -UsageLocation CO'
      },
      {
        title: 'Asignar el SKU según la matriz de licencias',
        detail: 'La matriz define el SKU por cargo: E3 base, E5 para el equipo de seguridad, add-ons por función. Asignar de más infla la facturación; de menos genera tickets de "no me funciona X". Ninguna de las dos se nota el día del alta: se nota en el cierre de mes o en la access review.',
        command: 'Set-MsolUserLicense -UserPrincipalName ana.torres@nexora.com -AddLicenses "nexora:ENTERPRISEPACK"'
      },
      {
        title: 'Preferir la asignación por grupo',
        detail: 'Con grupos de licencias (LIC-E3, LIC-E5) en Entra: la licencia se hereda al entrar al grupo y se libera sola al salir. El offboarding queda más limpio (quitar del grupo = quitar la licencia) y el pool se gestiona en un solo lugar, no usuario por usuario.',
        command: 'Add-ADGroupMember -Identity LIC-E3 -Members ana.torres'
      },
      {
        title: 'Diagnosticar errores de asignación',
        detail: 'El error típico es el conflicto de service plans: dos licencias con el mismo subservicio habilitado (por ejemplo Exchange plan duplicado). La secuencia correcta es retirar la vieja y añadir la nueva en la misma transición, nunca encimar SKUs "a ver si así funciona". El mensaje del portal nombra el plan en conflicto: leerlo antes de tocar.',
        command: 'Set-MsolUserLicense -UserPrincipalName ana.torres@nexora.com -RemoveLicenses "nexora:ENTERPRISEPACK"'
      },
      {
        title: 'Verificar activación y propagación',
        detail: 'La activación puede tardar hasta 24 horas; el usuario debe cerrar sesión y volver a entrar para ver los productos. Verificar qué quedó efectivamente asignado (no lo que se cree) y confirmar que el producto aparece y abre.',
        command: 'Get-MgUserLicenseDetail -UserId ana.torres@nexora.com'
      },
      {
        title: 'Gestionar el pool mensualmente',
        detail: 'Cruce de licencias asignadas contra sign-ins de los últimos 30 días: las asignadas sin uso son candidatos a retiro (con aviso al manager, no de sorpresa). El reporte del pool es un KPI de IAM del equipo (costo por identidad muerta).',
        command: 'Get-MgAuditLogSignIn -Top 500 | Group-Object UserPrincipalName | Measure-Object'
      },
      {
        title: 'Caso especial: leaver y gracia del buzón',
        detail: 'Al retirar la licencia de una salida, el buzón queda en gracia ~30 días: convertirlo a compartido o delegarlo antes de que caduque si hay retención de datos (iam-kb-002). Un buzón sin licencia que sigue recibiéndo correo compartido NO consume licencia: es la forma correcta de retener.'
      }
    ],
    verification: 'El usuario ve y abre sus productos, Get-MgUserLicenseDetail muestra exactamente el SKU de la matriz, y el reporte mensual del pool no arroja licencias huérfanas ni conflictos pendientes.',
    escalation: 'Administrador M365 / Facturación (compra de SKUs nuevos o discrepancias de facturación)',
    relatedTerms: ['Microsoft 365 admin center', 'Microsoft Entra ID (antes Azure AD)', 'PowerShell (módulos AD y Graph)'],
    relatedTickets: ['iam-010', 'iam-036']
  },
  {
    id: 'iam-kb-011',
    title: 'Cuentas de servicio: creación, protección y gobierno',
    category: 'IAM - Active Directory',
    environment: 'Active Directory',
    symptoms: 'Tres llamadas distintas con la misma raíz: la integración falla con "logon failure" porque venció la contraseña del servicio, la auditoría pregunta por qué svc-legacy tiene Domain Admin desde 2019, o nadie sabe de quién es la cuenta que sostiene un job crítico del cierre contable. Las cuentas de servicio son infraestructura invisible hasta que rompen.',
    cause: 'Cuentas creadas como usuarios comunes "porque era más rápido", contraseñas que nadie rota porque "la app se puede caer", permisos de más (Domain Admin por desconocimiento), SPNs kerberoasteables con contraseñas débiles, y dueños que rotaron sin hand-off: la cuenta queda huérfana pero el job sigue corriendo con ella.',
    steps: [
      {
        title: 'Inventariar y gobernar antes de crear',
        detail: 'Toda cuenta de servicio tiene: owner (dueño de la aplicación), propósito documentado en la descripción y clasificación (gMSA / managed service account / legacy). El inventario se audita contra el AD real: la diferencia son las cuentas fantasma que hay que gobernar o apagar.',
        command: 'Get-ADUser -LDAPFilter "(sAMAccountName=svc-*)" -Properties Description,LastLogonDate | Export-Csv C:\\Temp\\svc-inventario.csv'
      },
      {
        title: 'Preferir gMSA cuando la aplicación lo soporte',
        detail: 'La Group Managed Service Account genera una contraseña de 240 caracteres que AD rota sola y que ningún humano conoce ni teclea: elimina de raíz la rotación manual y el kerberoasting de contraseñas flojas. Es el diseño por defecto para servicios en servidores miembros del dominio.',
        command: 'New-ADServiceAccount -Name svc-sapint -DNSHostName svc-sapint.nexora.local -PrincipalsAllowedToRetrieveManagedPassword "CN=srv-app-01,OU=Servidores,DC=nexora,DC=local"'
      },
      {
        title: 'Para legacy: bóveda, rotación y ventana',
        detail: 'Si la app no soporta gMSA: contraseña de 25+ caracteres generada aleatoria, custodiada en la bóveda PAM (CyberArk, iam-kb-012) con checkout y rotación documentada. La rotación se coordina con el owner de la app en ventana de cambio: nunca "borde" la contraseña un martes a mediodía y que prueben si sigue vivo el job.',
        command: 'Install-ADServiceAccount -Identity svc-sapint'
      },
      {
        title: 'Aplicar mínimo privilegio de verdad',
        detail: 'Quitar Domain Admin: el servicio necesita logon as service, permisos sobre SU carpeta o SU base, no el dominio. Restringir el logon interactivo (deny por GPO) para que la cuenta solo sirva como servicio: una cuenta de servicio que un humano puede usar para explorar la red es una cuenta mal hecha.',
        command: 'Set-ADUser -Identity svc-monitor -Description "Agente monitoreo - owner: NOC - ticket IAM-1893 - revisar: trimestral"'
      },
      {
        title: 'Registrar solo los SPN necesarios',
        detail: 'Cada SPN expone la cuenta al kerberoasting: un atacante puede pedir un ticket de servicio y crackearlo offline. setspn -S valida colisiones y solo se registran los SPN que la app usa; con gMSA la contraseña gigante neutraliza el crackeo.',
        command: 'setspn -S NEXORA/svc-monitor srv-app-01'
      },
      {
        title: 'Detectar huérfanas y dormantes',
        detail: 'Cuentas sin login en 90 días (el job murió y nadie avisó) o sin owner en el inventario: se deshabilitan con aviso al owner publicado, no se borran directo. El 90-60-30 de cuentas dormantes aplica igual que a humanos (iam-kb-019): primero se entiende, después se corta.',
        command: 'Search-ADAccount -AccountInactive -TimeSpan 90.00:00:00'
      },
      {
        title: 'Cerrar el ciclo con cambio formal',
        detail: 'Alta, modificación y baja de cuentas de servicio van por cambio (CAB) con el owner de la app como responsable de validar. La baja es parte del inventario: cuando la app se retira, su cuenta se retira también, con la evidencia en el mismo cambio.',
        command: 'Get-ADServiceAccount -Filter * | Select-Object Name,LastLogonDate'
      }
    ],
    verification: 'Cada cuenta de servicio tiene owner, propósito y clasificación en el inventario; ninguna es Domain Admin ni permite logon interactivo; las dormantes quedaron deshabilitadas con aviso; el AD real coincide con el inventario.',
    escalation: 'Líder de IAM + dueño de la aplicación (migración de legacy a gMSA o rotación coordinada: requiere ventana de cambio de la app)',
    relatedTerms: ['Service account', 'Kerberoasting', 'Cuentas compartidas', 'Lifecycle de cuentas privilegiadas'],
    relatedTickets: ['iam-011', 'iam-037']
  },
  {
    id: 'iam-kb-012',
    title: 'PAM: acceso privilegiado, checkout y bóveda de credenciales',
    category: 'IAM - Roles & Privilegios',
    environment: 'PAM / Privilegios',
    symptoms: 'Alguien necesita acceso administrativo: ejecutar un cambio, investigar un incidente o resolver un ticket que toca producción. En Nexora el acceso privilegiado no se POSEE: se solicita, se aprueba, se usa y expira. Los síntomas de un PAM mal operado: admins permanentes "por comodidad", credenciales admin en un texto plano compartido, y activaciones sin justificación que nadie revisa.',
    cause: 'No es un fallo sino el modelo de operación. Los incidentes nacen de: roles asignados permanentemente fuera de proceso, credenciales de emergencia usadas en el día a día, activaciones PIM sin ticket que las ampare, y bóveda usada como almacén de contraseñas en lugar de sistema de acceso temporal.',
    steps: [
      {
        title: 'Distinguir los dos carriles de privilegio',
        detail: 'Roles de Entra ID y M365: se activan just-in-time con Entra PIM (elegible, no permanente). Cuentas admin de AD y servidores: viven en la bóveda CyberArk y se usan por checkout. El carrille define el procedimiento; usar "el que estaba más a mano" es como se fabrican los incidentes.'
      },
      {
        title: 'Solicitar la activación con justificación trazable',
        detail: 'En PIM: rol → Activate → justificación = número de ticket y alcance. Sin ticket no hay activación: el auditor lee las justificaciones y las vacías son el hallazgo fácil. La activación exige MFA y aprobador según el rol; la duración se pide ajustada a la tarea (1-8 h), no el máximo disponible.',
        command: 'Get-MgAuditLogDirectoryAudit -Top 100 | Where-Object Category -eq "RoleManagement"'
      },
      {
        title: 'Configurar la dureza del PIM (trabajo del administrador de PIM)',
        detail: 'Cada rol elegible con: MFA para activar, aprobador designado, duración máxima razonable, alertas de activación y CERO asignaciones permanentes fuera de las cuentas break-glass (iam-kb-013). El objetivo es que ser admin sea un estado temporal con evidencia, no un apellido.',
        command: 'Get-MgAuditLogDirectoryAudit -Top 50 | Where-Object ActivityDisplayName -like "*role*"'
      },
      {
        title: 'Checkout en la bóveda para cuentas admin',
        detail: 'PVWA → buscar la cuenta por saf del sistema → checkout con razón (ticket). Según criticidad, la sesión queda grabada o al menos registrada. Al terminar: checkin inmediato (no esperar el timeout): la credencial vuelve al estado no expuesto.'
      },
      {
        title: 'Verificar la rotación tras el uso',
        detail: 'Al checkin, la bóveda rota la credencial automáticamente: quien la usó ya no la conoce y la próxima persona recibe otra. Confirmar la rotación en el historial de la cuenta en la bóveda: si por excepción no rotó (conector viejo), rotar manual y abrir incidencia del conector.'
      },
      {
        title: 'Auditar el uso privilegiado mensualmente',
        detail: 'Reporte del mes: qué roles se activaron, cuántas veces, quién aprobó, horarios inusuales y checkouts de bóveda vs tickets. Las anomalías (activaciones de madrugada sin cambio asociado) se preguntan: puede ser trabajo legítimo, y esa es exactamente la conversación que el monitoreo debe provocar.',
        command: 'Get-MgAuditLogDirectoryAudit -Top 500 | Group-Object ActivityDisplayName | Sort-Object Count -Descending'
      },
      {
        title: 'Reducir el standing access en cada revisión',
        detail: 'Cada access review de roles privilegiados (iam-kb-014) convierte asignaciones permanentes en elegibles o las retira. La métrica del programa PAM: % de admins permanentes, y la meta es cero fuera de break-glass. El admin permanente es la excepción que exige justificar su existencia, no la forma normal de trabajar.',
        command: 'Get-ADGroupMember NXR-ADM-PLATAFORMA -Recursive | Export-Csv C:\\Temp\\pam-revision.csv'
      }
    ],
    verification: 'Toda activación del periodo tiene ticket y aprobador, la bóveda muestra rotación tras cada checkout, y la última revisión no dejó asignaciones permanentes nuevas sin justificación.',
    escalation: 'Líder de IAM / CAB (excepciones: accesos permanentes solicitados por un área, o activaciones sin aprobador disponible)',
    relatedTerms: ['Microsoft Entra PIM (Privileged Identity Management)', 'Aprovisionamiento just-in-time (JIT)', 'Lifecycle de cuentas privilegiadas', 'CyberArk', 'Principio de mínimo privilegio (Least Privilege)'],
    relatedTickets: ['iam-012', 'iam-038']
  },
  {
    id: 'iam-kb-013',
    title: 'Break-glass: cuentas de acceso de emergencia y su auditoría',
    category: 'IAM - Roles & Privilegios',
    environment: 'PAM / Privilegios',
    symptoms: 'El escenario que las justifica: nadie entra (una política de Conditional Access mal desplegada bloqueó a todos, el MFA está caído, el propio Entra tiene un incidente) y la organización está ciega sin acceso administrativo. Las cuentas break-glass son el último rescate y, si nadie vigila su uso, también la mayor bomba del directorio.',
    cause: 'No es un fallo sino el control compensatorio obligatorio. Lo que sí falla: contraseñas vencidas tras años sin uso, exclusiones de CA que nadie recuerda documentar, credenciales en un sobre bajo el teclado (o en el correo del que se fue), y un uso real del que nadie se entera hasta que el auditor pregunta.',
    steps: [
      {
        title: 'Definir el mínimo de cuentas y su diseño',
        detail: 'En Nexora: dos cuentas cloud-only (bg-cloud-01 y bg-cloud-02) que NO se sincronizan desde AD y no dependen del teléfono: MFA con llave FIDO2 física custodiada o, como última capa, contraseña ultra-larga con monitoreo extremo documentado. Fuera de sincronización y fuera de procesos masivos: si dependen de lo que se rompió, no son rescate.',
        command: 'Get-ADUser -LDAPFilter "(sAMAccountName=bg-*)" -Properties Description'
      },
      {
        title: 'Custodiar con dual control',
        detail: 'Credenciales selladas en DOS ubicaciones separadas (caja fuerte de NOC y bóveda con política dual: dos personas para abrir). Cada apertura exige testigo y registro. El dual control garantiza que ningún individuo pueda usar el rescate sin que otro lo sepa: es la propiedad de seguridad más importante de estas cuentas.'
      },
      {
        title: 'Monitorearlas como si fueran bombas',
        detail: 'Regla del SIEM: cualquier sign-in de break-glass dispara alerta P1 inmediata al SOC y al líder de IAM, por canal fuera del propio Entra (para que la alerta sobreviva si Entra es lo que está en problemas). Configurar y PROBAR la regla: una alerta que no suena es control imaginario.',
        command: 'Get-MgAuditLogSignIn -Top 500 | Where-Object UserPrincipalName -like "bg-*"'
      },
      {
        title: 'Usarlas solo en emergencia declarada',
        detail: 'Criterio de uso: incidente mayor con bloqueo masivo de acceso legítimo. El uso se notifica al líder de IAM y al SOC EN EL MOMENTO (no después), con hora, motivo y quién autoriza. Entrar "rápito a ver algo" con break-glass es exactamente el patrón que el monitoreo no puede distinguir de un ataque.'
      },
      {
        title: 'Post-uso obligatorio',
        detail: 'Terminada la emergencia: rotar la credencial inmediatamente, re-sellar con testigo, revisar TODAS las acciones ejecutadas con la cuenta (audit logs: qué se tocó, qué se cambió) y documentar el incidente en postmortem. El post-uso es lo que convierte el rescate en un episodio cerrado y no en una puerta que quedó abierta.',
        command: 'Revoke-MgUserSignInSession -UserId bg-cloud-01@nexora.com'
      },
      {
        title: 'Probarlas trimestralmente',
        detail: 'Login controlado y documentado (fecha, ejecutor, resultado) para verificar que las credenciales siguen válidas y las exclusiones de CA siguen excluyendo. Una break-glass que no se probó en 12 meses es una teoría: el día del incidente real no es el momento de descubrir que la contraseña caducó.',
        command: 'Get-MgAuditLogSignIn -Top 1000 | Where-Object UserPrincipalName -like "bg-*"'
      },
      {
        title: 'Auditar su estado cada trimestre',
        detail: 'Checklist: credenciales válidas y selladas, exclusiones de CA vigentes y JUSTIFICADAS por escrito, regla del SIEM verde (probada en el último test), custodia íntegra. El resultado queda como evidencia: el auditor siempre pregunta por break-glass y la respuesta correcta es un checklist fechado, no una cara de sorpresa.'
      }
    ],
    verification: 'Las dos cuentas constan en el inventario con exclusión de CA documentada, la alerta del SIEM se disparó en la última prueba trimestral, y el último uso real (si lo hubo) tiene rotación, revisión de acciones y postmortem.',
    escalation: 'SOC + Líder de IAM (cualquier uso no declarado de una cuenta break-glass se trata como incidente de seguridad en curso)',
    relatedTerms: ['Acceso break-glass', 'Conditional Access', 'FIDO2 / WebAuthn', 'Pista de auditoría (audit trail)'],
    relatedTickets: ['iam-013', 'iam-039']
  },
  {
    id: 'iam-kb-014',
    title: 'Access Review / certificación de accesos (cómo se ejecuta)',
    category: 'IAM - Gobernanza & Auditoría',
    environment: 'Gobernanza',
    symptoms: 'Llegó la campaña trimestral (o el auditor pidió evidencia de la última): los dueños de cada sistema deben confirmar que cada acceso que dependen de ellos sigue justificado. El producto esperado es doble: accesos revocados que ya nadie justifica, y evidencia empacada que responda a ISO 27001 y SOX sin arqueología de tickets.',
    cause: 'No es un fallo sino el control de gobernanza central de IAM. Falla cuando: el revisor responde "a todo sí" sin mirar, lo denegado nunca se revoca (la campaña queda en teatro), o la evidencia del antes/después no se conserva y al año nadie puede demostrar qué se revocó y quién lo aprobó.',
    steps: [
      {
        title: 'Definir alcance y criterio de la campaña',
        detail: 'Alcance obligatorio de Nexora: roles privilegiados, accesos a sistemas financieros, cuentas de terceros y grupos con permisos de escritura masiva. Criterio que se comunica al revisor: "confirma solo lo que el usuario NECESITA hoy para su función", no lo que siempre tuvo. Un "sí" por inercia es la forma más común de fallar la campaña sin darse cuenta.',
        command: 'Get-ADGroupMember NXR-FIN-APR -Recursive | Export-Csv C:\\Temp\\rev-fin-antes.csv'
      },
      {
        title: 'Preparar el material por dueño',
        detail: 'Cada dueño de sistema recibe SU lista: miembros con atributos de contexto (puesto, área, última vez usado si existe). El material listo es lo que separa una campaña que dura días de una que se arrastra un mes: el revisor que debe "armar su propio listado" nunca lo arma.',
        command: 'Get-ADGroupMember NXR-SAP-FI-ESCRITURA -Recursive | Select-Object SamAccountName,Name | Export-Csv C:\\Temp\\rev-sap.csv'
      },
      {
        title: 'Remitir a los certificadores correctos',
        detail: 'Certifica el DUEÑO del sistema o del acceso (access owner), no el equipo IAM: el equipo prepara, el dueño responde por sus accesos. Campaña por Entra ID Governance (access reviews) con fecha límite, o flujo ServiceNow si el sistema no está en la plataforma: el canal importa menos que el respaldo de la respuesta.',
        command: 'Get-ADGroup -LDAPFilter "(managedBy=*)" -Properties ManagedBy | Select-Object Name,ManagedBy'
      },
      {
        title: 'Gestionar la campaña hasta cerrarla',
        detail: 'Recordatorios programados; el que no responde se escala a su gerencia con copia al líder de IAM. Regla default deny: sin respuesta al cierre, el acceso se revoca. La excepción es el que responde tarde con justificación, no el que calla: invertir esa regla es lo que vuelve la campaña real.',
        command: 'Get-ADGroupMember NXR-ADM-PLATAFORMA -Recursive | Export-Csv C:\\Temp\\rev-adm.csv'
      },
      {
        title: 'Ejecutar las revocaciones al cierre',
        detail: 'Todo lo denegado (o sin respuesta) sale de sus grupos el MISMO día del cierre, en batch documentado con el export de respaldo. Revocar a medias es la falla clásica: la campaña "terminó" pero el directorio quedó igual, y el próximo trimestre el revisor aprende que sus respuestas no tienen efecto.',
        command: 'Remove-ADGroupMember -Identity NXR-FIN-APR -Members ana.torres -Confirm:$false'
      },
      {
        title: 'Empacar la evidencia del ciclo',
        detail: 'Carpeta de la campaña: exports antes/después, respuestas de los dueños con fecha, revocaciones ejecutadas con hora y ejecutor, excepciones con firma. La comparación antes/después es la prueba de que la campaña cambió algo; sin ella, el auditor solo ve un cuestionario bonito.',
        command: 'Compare-Object (Import-Csv C:\\Temp\\rev-fin-antes.csv) (Import-Csv C:\\Temp\\rev-fin-despues.csv) -Property SamAccountName'
      },
      {
        title: 'Medir y alimentar el diseño',
        detail: 'KPIs del ciclo: % de respuesta, días de duración, accesos revocados, excepciones abiertas. Lo que siempre se aprueba es señal para la matriz de roles (iam-kb-009): si el rol lo necesita siempre, que el rol lo traiga y el revisor deje de firmar lo mismo cada trimestre.',
        command: 'Get-ADGroupMember NXR-FIN-APR -Recursive | Export-Csv C:\\Temp\\rev-fin-despues.csv'
      }
    ],
    verification: 'Todos los sistemas del alcance tienen respuesta del dueño (o aplicación del default deny), los denegados quedaron revocados con diff del antes/después, y la carpeta de evidencia está completa con respuestas, horas y ejecutores.',
    escalation: 'Líder de IAM / Comité de cumplimiento (dueños que no responden tras escalar a su gerencia: el default deny se aplica igual y se reporta)',
    relatedTerms: ['Access Review (certificación de accesos)', 'Attestation', 'Auditoría de accesos', 'Entitlement creep'],
    relatedTickets: ['iam-014', 'iam-040']
  },
  {
    id: 'iam-kb-015',
    title: 'Segregación de funciones (SoD): detección y remediación',
    category: 'IAM - Gobernanza & Auditoría',
    environment: 'Gobernanza',
    symptoms: 'La auditoría (o el chequeo preventivo de una transferencia, iam-kb-003) encuentra que una sola persona puede crear proveedores Y aprobar pagos, o gestionar accesos y además auditar el sistema que los registra. Combinación tóxica: una identidad con capacidad de cometer un error y ocultarlo. El hallazgo no es teórico: es la forma en que ocurren los fraudes internos.',
    cause: 'La matriz de pares conflictivos (definida con Finanzas y auditoría interna) no se cruza en cada cambio: permisos acumulados por proyectos, transferencias con "semana de transición" eterna, o sistemas nuevos incorporados al negocio sin analizar sus conflictos contra los existentes.',
    steps: [
      {
        title: 'Partir de la matriz SoD de Nexora',
        detail: 'La matriz define los pares conflictivos por negocio: alta de proveedor vs aprobación de pago, creación de usuarios vs aprobación de accesos, desarrollo vs despliegue a producción, gestión del sistema vs auditoría del sistema. Es documento firmado por el dueño del riesgo: el equipo IAM lo opera, no lo inventa.',
        command: 'Get-ADGroupMember NXR-FIN-ALTAS -Recursive | Export-Csv C:\\Temp\\sod-par-a.csv'
      },
      {
        title: 'Escanear ambos lados del par conflictivo',
        detail: 'Exportar los miembros del grupo A y del grupo B de cada par: el cruce de ambas listas son las violaciones activas. Con pocos pares, el cruce manual con CSV es suficiente; el centro del método es tener los pares DEFINIDOS: sin lista de pares, "revisar SoD" es una impresión, no un control.',
        command: 'Get-ADGroupMember NXR-FIN-APR -Recursive | Export-Csv C:\\Temp\\sod-par-b.csv'
      },
      {
        title: 'Cruzar y listar las violaciones',
        detail: 'Compare-Object con -IncludeEqual devuelve los presentes en ambas listas (SideIndicator "=="): los nombres comunes son las combinaciones tóxicas activas. El resultado es el insumo de la remediación y la evidencia del hallazgo: lista con fecha, fuente y ejecutor.',
        command: 'Compare-Object (Import-Csv C:\\Temp\\sod-par-a.csv) (Import-Csv C:\\Temp\\sod-par-b.csv) -Property SamAccountName -IncludeEqual | Where-Object SideIndicator -eq "=="'
      },
      {
        title: 'Analizar cada caso con el dueño del riesgo',
        detail: 'La remediación no es siempre revocar: puede ser reasignar una de las tareas a otro puesto, o separar los pasos del flujo en la aplicación. La decisión la toma el dueño del riesgo del negocio con la evidencia encima: el equipo IAM propone, documenta y ejecuta.'
      },
      {
        title: 'Remediar o aceptar con control compensatorio',
        detail: 'Si el negocio mantiene la combinación (operación chica, persona insustituible): excepción FORMAL: firma del dueño del riesgo, control compensatorio concreto (revisión de segundo nivel, log review mensual del par) y FECHA de expiración de la excepción. La excepción eterna sin vencimiento es la deuda que la auditoría cobra con intereses.',
        command: 'Remove-ADGroupMember -Identity NXR-FIN-ALTAS -Members ana.torres -Confirm:$false'
      },
      {
        title: 'Re-chequear el par y cerrar',
        detail: 'Tras la remediación, re-cruzar el par afectado: la lista de violaciones queda vacía o reducida a las excepciones registradas. Cerrar el hallazgo con el antes/después: hallazgo detectado → acción → resultado, el formato exacto que pide el ciclo de auditoría.',
        command: 'Compare-Object (Import-Csv C:\\Temp\\sod-par-a.csv) (Import-Csv C:\\Temp\\sod-par-b.csv) -Property SamAccountName -IncludeEqual'
      },
      {
        title: 'Prevenir: SoD en cada cambio de acceso',
        detail: 'El chequeo SoD entra al flujo Mover (iam-kb-003), a cada solicitud de acceso a grupos marcados en la matriz y a la access review trimestral (iam-kb-014). Detectar en preventivo cuesta minutos; detectar en auditoría cuesta hallazgos, remediaciones y la confianza del comité.',
        command: 'Get-ADUser -Identity ana.torres -Properties MemberOf'
      }
    ],
    verification: 'El re-cruce de los pares conflictivos no devuelve miembros comunes (o cada excepción tiene firma del dueño del riesgo, control compensatorio y fecha de expiración), y el informe del ciclo quedó en la carpeta de evidencia.',
    escalation: 'Dueño del riesgo del negocio / Comité de cumplimiento (excepciones y aceptaciones formales)',
    relatedTerms: ['Separación de funciones (SoD)', 'Combinación tóxica (toxic combination)', 'Control preventivo / detectivo / correctivo', 'Entitlement creep'],
    relatedTickets: ['iam-015', 'iam-041']
  },
  {
    id: 'iam-kb-016',
    title: 'Políticas de contraseñas: organización, NIST y buenas prácticas',
    category: 'IAM - Acceso & Autenticación',
    environment: 'Multi',
    symptoms: 'La pregunta que abre el tema: ¿sirve de algo la política de contraseñas si ya tenemos MFA? Síntomas de política mala: usuarios con Primavera2026! rotada a la fuerza cada 90 días, lockouts en masa los lunes de expiración, contraseñas corporativas reutilizadas en sitios personales, o el hallazgo de auditoría "la política vigente no refleja las guías actuales (NIST SP 800-63B)".',
    cause: 'Política heredada de la época pre-MFA: complejidad obligatoria + rotación forzada, que produce contraseñas débiles y predecibles (Password1 → Password2 → Password3!) y adherencia real nula. A eso se suman: sin PSO para privilegiados, sin bloqueo de contraseñas filtradas, y el hábito de exigir cambio periódico en lugar de exigir fuerza real.',
    steps: [
      {
        title: 'Leer la política vigente antes de opinar',
        detail: 'Longitud mínima, historia, umbral y ventana de lockout, expiración: la Default Domain Policy es el punto de partida real de la conversación (y del hallazgo). Sin leerla, cualquier discusión de política es memoria y las memorias del AD siempre mienten.',
        command: 'Get-ADDefaultDomainPasswordPolicy'
      },
      {
        title: 'Alinear el criterio con NIST SP 800-63B',
        detail: 'La guía moderna: longitud mínima alta (14+, las passphrases largas son bienvenidas), SIN expiración forzada periódica (salto solo con evidencia de compromiso), SIN reglas de composición artificiales (la mayúscula+número+símbolo obligatoria no fortalece: estandariza), permitir pegar (facilita gestores de contraseñas) y bloquear las filtradas.',
        command: 'Set-ADDefaultDomainPasswordPolicy -MinPasswordLength 14 -LockoutThreshold 5 -LockoutObservationWindow 00:15:00 -LockoutDuration 00:15:00'
      },
      {
        title: 'Endurecer a los privilegiados con PSO',
        detail: 'Fine-grained password policies separadas para grupos de administración: longitud 15+, lockout más estricto y cambio inmediato ante sospecha. La política del dominio protege al 100%; el PSO protege al 1% que más daño puede hacer: dos capas, no un promedio para todos.',
        command: 'New-ADFineGrainedPasswordPolicy -Name "PSO-Privilegiados" -Precedence 10 -MinPasswordLength 16 -LockoutThreshold 3 -SubjectGroups "NXR-ADM-PLATAFORMA"'
      },
      {
        title: 'Bloquear contraseñas débiles y corporativas filtradas',
        detail: 'Entra Password Protection con agente en los DC: la banned list global de Microsoft más la lista corporativa (nexora, nexora2026, vaultnotes). Es el control que responde a la pregunta del auditor: "¿cómo evitan que el usuario ponga el nombre de la empresa?"',
        command: 'Get-ADFineGrainedPasswordPolicy -Filter *'
      },
      {
        title: 'Medir el efecto del cambio',
        detail: 'Tras ajustar la política: subir los lockouts significa que los usuarios tenían contraseñas cortas y el sistema las está obligando a cambiar (esperable en la transición: comunicar y acompañar, no retroceder al día 3). Las métricas de lockout y de reseteos son el termómetro honesto de la política (iam-kb-007).',
        command: "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4740} -MaxEvents 100 | Measure-Object"
      },
      {
        title: 'Sostener con MFA y banned list, no con calendario',
        detail: 'La defensa real de la contraseña moderna es que ya no es el único factor: MFA universal (iam-kb-006), bloqueo de legacy auth (iam-kb-017) y detección de robo (iam-kb-023). La expiración calendárica sin evidencia de compromiso solo entrena al usuario a elegir contraseñas predecibles y a odiar a seguridad.',
        command: 'Search-ADAccount -LockedOut | Measure-Object'
      },
      {
        title: 'Documentar política, estándar y procedimiento por separado',
        detail: 'Política (el QUÉ, aprobado por dirección), estándar (medible: NIST + valores vigentes), procedimiento (el CÓMO se cambia y verifica, remite a iam-kb-005). Tres documentos distintos: mezclarlos produce políticas que nadie puede auditar ni ejecutar, el hallazgo clásico de los ITGC.',
        command: 'Get-ADDefaultDomainPasswordPolicy | Select-Object MinPasswordLength,LockoutThreshold,ComplexityEnabled'
      }
    ],
    verification: 'Get-ADDefaultDomainPasswordPolicy refleja la política aprobada, el PSO de privilegiados aplica verificado con Get-ADFineGrainedPasswordPolicy, y una prueba con una contraseña corporativa prohibida es rechazada en el cambio.',
    escalation: 'Líder de IAM / Comité de cumplimiento (eliminar la expiración periódica es cambio de política: requiere aprobación formal y comunicación)',
    relatedTerms: ['NIST SP 800-63 (IAL / AAL / FAL)', 'Password spraying', 'Credential stuffing', 'Política vs Estándar vs Procedimiento'],
    relatedTickets: ['iam-016', 'iam-042']
  },
  {
    id: 'iam-kb-017',
    title: 'Conditional Access: despliegue por grupos piloto y troubleshooting',
    category: 'IAM - Entra ID / M365',
    environment: 'Entra ID / M365',
    symptoms: 'Dos situaciones: toca desplegar una política nueva (MFA universal, bloqueo de legacy auth, restricción por países) o un usuario legítimo quedó "encerrado" por una política existente. El síntoma organizacional del despliegue mal hecho lo conoce todo el mundo: la política que bloqueó a media empresa un lunes a las 8:00 con el equipo IAM apagándola a las 8:05.',
    cause: 'Políticas aplicadas a "Todos los usuarios" sin piloto ni report-only, exclusiones de emergencia no definidas de antemano, o troubleshooting a ciegas sin el What If. La Conditional Access es la herramienta más poderosa y menos perdonadora del stack de identidad: merece el mismo respeto que una regla de firewall.',
    steps: [
      {
        title: 'Diseñar con exclusiones seguras ANTES de activar',
        detail: 'Toda política define primero sus exclusiones: cuentas break-glass (iam-kb-013) y un grupo de emergencia del equipo IAM (CA-Emergencia). Ninguna política entra a producción sin exclusión documentada: el día que algo se rompe, la exclusión temporal controlada del grupo afectado es el rollback, no desactivar la política entera a ciegas.',
        command: 'New-ADGroup -Name "CA-Emergencia" -SamAccountName CA-Emergencia -GroupScope Global -GroupCategory Security -Description "Exclusion temporal CA - se limpia cada viernes"'
      },
      {
        title: 'Arrancar en modo report-only',
        detail: 'La política en report-only registra lo que HARÍA sin bloquear a nadie. Una o dos semanas de datos reales responden las dos preguntas que importan: cuántos usuarios legítimos tocaría y qué patrones maliciosos realmente bloquea. Saltarse el report-only es apostar la productividad de la empresa a que la política quedó bien a la primera.',
        command: 'Get-MgAuditLogSignIn -Top 500 | Where-Object ClientAppUsed -ne "Browser"'
      },
      {
        title: 'Analizar el report-only antes de activar',
        detail: 'Separar dos poblaciones: los impactados legítimos (aplicaciones viejas que usan legacy auth, equipos sin complying) que hay que remediar primero, y el ruido maligno (IMAP/SMTP básico desde fuera, intentos anónimos) que la política debe bloquear. Activar con legítimos dentro del impacto es generar la tormenta de tickets que sabotea al proyecto.',
        command: 'Get-MgAuditLogSignIn -Top 500 | Group-Object ClientAppUsed | Sort-Object Count -Descending'
      },
      {
        title: 'Desplegar por oleadas de grupo, nunca a todos',
        detail: 'Piloto (equipo IAM) → voluntarios informados → departamentos por oleadas, cada una con ventana de observación. El grupo piloto sufre primero a los propios que saben diagnosticar: ese orden es el que convierte los fallos del despliegue en aprendizajes en lugar de incidentes visibles.',
        command: 'Add-ADGroupMember -Identity CA-PILOTO -Members ana.torres'
      },
      {
        title: 'Diagnosticar bloqueados con el What If',
        detail: 'Herramienta del portal de Entra: Conditional Access → What If: se pone usuario + aplicación y devuelve la lista de políticas que le aplican y por qué. Responde en 30 segundos lo que antes eran 30 minutos de adivinación. Si el What If no explica el bloqueo, el bloqueo no viene de CA: mirar MFA, licencia o la app (iam-kb-008).'
      },
      {
        title: 'Confirmar con el sign-in log del intento',
        detail: 'El sign-in log nombra la política que actuó y la condición fallida (dispositivo no complying, MFA no satisfecho, país bloqueado). Con ese dato la corrección es precisa: excluir el país correcto, remediar el dispositivo, o sacar la app del scope: sin el log se corrige "de oído" y se rompe otra cosa.',
        command: 'Get-MgAuditLogSignIn -Top 50 | Where-Object ConditionalAccessStatus -eq "failure"'
      },
      {
        title: 'Documentar y dejar el rollback listo',
        detail: 'Cada política activa con: dueño, motivo, fecha de entrada, exclusiones vigentes con su justificación y expiración. El rollback operativo = añadir el grupo afectado a exclusión temporal con ticket y fecha de revisión, no desactivar la política sin análisis. Las exclusiones se barren cada viernes: el CA-Emergencia limpio es parte de la higiene del equipo.'
      }
    ],
    verification: 'La política activa no bloquea usuarios legítimos en la ventana de observación (cero tickets por falso positivo), bloquea lo que debe (legacy auth y países fuera de política), y las exclusiones vigentes coinciden exactamente con lo documentado.',
    escalation: 'Líder de IAM (cualquier deshabilitación de política o exclusión "Todos los usuarios" requiere su aprobación explícita y queda registrada)',
    relatedTerms: ['Conditional Access', 'Bloqueo de autenticación heredada (legacy auth)', 'Device compliance', 'Sign-in risk (riesgo de inicio de sesión)'],
    relatedTickets: ['iam-017', 'iam-043']
  },
  {
    id: 'iam-kb-018',
    title: 'Sincronización AD ↔ Entra ID (Entra Connect): salud y errores comunes',
    category: 'IAM - Active Directory',
    environment: 'Active Directory',
    symptoms: 'Un usuario creado en AD no aparece en M365, los cambios de atributos no replican, el portal de Connect Health marca el servidor en rojo, o "la contraseña nueva no sirve para el correo" (iam-kb-005). Entra Connect (srv-connect) es el puente de la identidad híbrida: cuando el puente se atasca, todo el JML se atasca con él.',
    cause: 'Ciclo de sincronización detenido (scheduler en error tras un export fallido), errores de export por atributos duplicados (proxyAddresses, UPN), sufijo UPN no verificado en el tenant (el UPN se reescribe a @nexora.onmicrosoft.com), OUs excluidas del filtering, o password hash sync fallando para cuentas con permisos de delegación estrictos.',
    steps: [
      {
        title: 'Verificar el estado del scheduler',
        detail: 'En srv-connect: estado del ciclo (debería ser SyncCycleEnabled y el intervalo de 30 minutos), última corrida y próxima. Si aparece detenido, NO relanzar a mano de inmediato: primero mirar los errores de la última corrida (un export en error no se arregla empujando más sincronizaciones encima).',
        command: 'Get-ADSyncScheduler'
      },
      {
        title: 'Forzar un delta controlado tras un cambio puntual',
        detail: 'Cuando se acaba de crear un usuario o cambiar un atributo y hay alguien esperando, el delta acelera lo que el ciclo haría en media hora. Delta para cambios normales; Initial (full) solo tras cambios de reglas o actualizaciones del conector: es caro y no es botón de pánico.',
        command: 'Start-ADSyncSyncCycle -PolicyType Delta'
      },
      {
        title: 'Leer los errores en Synchronization Service Manager',
        detail: 'Operations → corridas con error → detalle del objeto: AttributeValueMustBeUnique (proxyAddresses o UPN duplicados en dos objetos), InvalidSoftMatch, ViolationConstraint. Cada error nombra el objeto exacto: la corrección SIEMPRE se hace en el origen (AD o el atributo en conflicto), nunca editando el metaverso.',
        command: 'Get-WinEvent -LogName "Directory Synchronization" -MaxEvents 20'
      },
      {
        title: 'Cuidar el UPN y su sufijo verificado',
        detail: 'El sufijo del UPN debe estar verificado en el tenant (nexora.com sí, nexora.local no): un UPN con sufijo no verificado se reescribe a @nexora.onmicrosoft.com y el usuario "cambia de identidad" sin que nadie lo toque (login con el UPN original falla). Verificar el dominio ANTES de crear cuentas con un sufijo nuevo.',
        command: 'Get-ADUser -Identity ana.torres -Properties UserPrincipalName,proxyAddresses'
      },
      {
        title: 'Diagnosticar el password hash sync',
        detail: 'El evento 611 en el log "Directory Synchronization" marca cuentas cuyo hash no se pudo exportar: típico tras cambios de permisos de la cuenta del conector o contraseñas especiales. El PHS es parte del login de la nube: si falla para una cuenta, esa cuenta no entra con su contraseña nueva hasta que se corrija.',
        command: 'Get-WinEvent -FilterHashtable @{LogName="Directory Synchronization"; Id=611} -MaxEvents 10'
      },
      {
        title: 'Revisar el filtering cuando un objeto nunca llega',
        detail: 'Un usuario creado hace horas que no aparece en Entra suele estar en una OU excluida del filtering del conector, o con un atributo que lo filtra. Revisar el domain/OU filtering en el wizard: cambiar el alcance del filtering es un cambio formal (afecta a todos los objetos bajo esa rama), no un ajuste de sábana.',
        command: 'Get-ADUser -Identity ana.torres -Properties DistinguishedName,msDSConsistencyGuid'
      },
      {
        title: 'Mantener salud y punto de retorno del conector',
        detail: 'Connect Health vigilando desde el portal, versión del conector dentro del soporte (los parches del conector entran a la ventana de parcheos), y export de configuración tras cada cambio (Migrate settings) para que reconstruir srv-connect sea un procedimiento y no una arqueología. Documentar la topología (1 servidor activo, staging opcional) en el inventario.',
        command: 'Get-ADSyncScheduler | Select-Object SyncCycleEnabled,ScheduledSyncInterval'
      }
    ],
    verification: 'El objeto nuevo aparece en Entra en el ciclo siguiente (delta < 30 min verificado), Connect Health en verde sin exports con errores pendientes, y el cambio queda documentado con el delta forzado como evidencia.',
    escalation: 'L2 - Infra & Ops (salud del servidor srv-connect: certificados, agente, base del conector) / Soporte de Microsoft (corrupción del conector o errores de plataforma)',
    relatedTerms: ['Entra Connect (antes Azure AD Connect)', 'Directory synchronization', 'Identidad híbrida', 'Microsoft Entra ID (antes Azure AD)'],
    relatedTickets: ['iam-018', 'iam-044']
  },
  {
    id: 'iam-kb-019',
    title: 'Auditoría de accesos: qué logs revisar y cada cuánto',
    category: 'IAM - Gobernanza & Auditoría',
    environment: 'Gobernanza',
    symptoms: 'No hay incidente: hay deber. La operación de IAM se sostiene en mirar sistemáticamente qué pasó: quién entró, quién cambió qué grupo, qué cuenta se creó sin ticket. El síntoma de no hacerlo llega en forma de pregunta incómoda del auditor o, peor, del SOC avisando que detectaron en un fin de semana lo que la cola IAM no vio en un mes.',
    cause: 'No es un fallo sino el hábito de auditoría. Sin cadencia definida, la revisión de logs solo ocurre cuando el auditor llega (tarde para detectar) o cuando el SIEM alerta (que es reacción, no revisión). El trabajo del equipo es la revisión proactiva con fuentes, consultas y frecuencia escritas.',
    steps: [
      {
        title: 'Tener el mapa de fuentes de evidencia',
        detail: 'AD: security log de los DC (4720 alta de usuario, 4726 borrado, 4728/4732 añadido a grupo, 4729/4733 removido, 4740 lockout, 4624/4625 logons). Entra: sign-in logs y audit logs (Graph). PIM: activaciones de roles. Bóveda PAM: checkouts. SaaS críticos: logs propios. El analista que no sabe dónde vive cada evidencia revisa siempre la misma mitad.',
        command: "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4720,4726,4728,4732,4740} -MaxEvents 100"
      },
      {
        title: 'Automatizar la recolección, no la revisión',
        detail: 'El SIEM de Nexora ingesta todas las fuentes con reglas de identidad; los reportes semanales se generan solos. El trabajo humano NO es recolectar (eso lo hace la plataforma) sino REVISAR: la cola de revisión con hallazgos documentados, o el "todo revisado, sin hallazgos" explícito: auditar es dejar evidencia de que se miró.',
        command: 'Get-MgAuditLogDirectoryAudit -Top 100'
      },
      {
        title: 'La revisión semanal de la cola IAM',
        detail: 'Cinco preguntas fijas: ¿hubo 4720 sin ticket asociado (cuenta fantasma)? ¿algún 4728 en grupos NXR-ADM-* sin cambio formal? ¿lockouts con patrón (iam-kb-007)? ¿cuentas ext-* activas sin contrato vigente (iam-kb-021)? ¿sign-ins de break-glass (iam-kb-013)? Cinco consultas, quince minutos, hallazgos con dueño.',
        command: "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4728} -MaxEvents 50"
      },
      {
        title: 'El barrido de cuentas inactivas',
        detail: 'Sin login en 90 días: la cuenta se deshabilita con aviso (y con proceso de reactivación simple si el dueño la reclama). Las dormantes son la puerta trasera favorita: nadie las usa, todos las olvidan, y siguen aceptando contraseñas. 30-60-90 con umbrales publicados: la política protege el proceso de la arbitrariedad.',
        command: 'Search-ADAccount -AccountInactive -TimeSpan 90.00:00:00'
      },
      {
        title: 'La revisión mensual con dueños',
        detail: 'Reporte agregado a los dueños de sistema: accesos nuevos del mes (¿quién los aprobó?), excepciones abiertas y su vencimiento, cuentas de servicio usadas (¿coincide con el inventario?). Es el ensayo continuo de la certificación trimestral (iam-kb-014): sorpresas repartidas, no concentradas.',
        command: 'Get-MgAuditLogDirectoryAudit -Top 500 | Group-Object ActivityDisplayName | Sort-Object Count -Descending'
      },
      {
        title: 'La trimestral formal con attestation',
        detail: 'Access review formal con respuestas firmadas de los dueños (iam-kb-014), barrido SoD (iam-kb-015) y cierre de excepciones vencidas. El trimestre es el ciclo auditable completo: lo que la ISO 27001 y los ITGC piden ver no son logs sueltos, sino el ciclo repetido con evidencia.',
        command: 'Get-ADGroupMember NXR-ADM-PLATAFORMA -Recursive | Export-Csv C:\\Temp\\rev-trimestral-adm.csv'
      },
      {
        title: 'Empacar evidencia cuando la piden',
        detail: 'Paquete por rango de fechas: exports de las fuentes, hallazgos y su resolución, revisiones firmadas. La respuesta del equipo a "¿cómo garantizan que nadie se dio acceso?" no es un discurso: es el proceso escrito con su evidencia fechada. El paquete se arma en el trimestre, no la víspera de la auditoría.',
        command: 'Get-MgAuditLogSignIn -Top 1000 | Export-Csv C:\\Temp\\signin-rango.csv'
      }
    ],
    verification: 'La revisión semanal quedó registrada (hallazgos documentados o "sin hallazgos" explícito), las cuentas de 90 días sin uso están deshabilitadas con aviso, y el paquete de evidencia del trimestre está completo sin armado de último minuto.',
    escalation: 'SOC (cualquier 4728 en grupos privilegiados sin cambio formal asociado: se trata como posible intrusión hasta confirmar lo contrario)',
    relatedTerms: ['Auditoría de accesos', 'Pista de auditoría (audit trail)', 'Cuenta dormante / inactiva', 'IAM drift'],
    relatedTickets: ['iam-019', 'iam-045']
  },
  {
    id: 'iam-kb-020',
    title: 'De-provisioning de aplicaciones SaaS al salir',
    category: 'IAM - Aplicaciones & SSO',
    environment: 'Aplicaciones SaaS',
    symptoms: 'Tras una salida, el correo quedó deshabilitado y el checklist "listo"... pero la cuenta del CRM (o del gestor de proyectos, o de la app de gastos) sigue viva con contraseña LOCAL del SaaS: el ex-empleado entra sin pasar por el SSO. Nadie la bloqueó porque la app nunca estuvo en el inventario de desprovision, solo en la memoria del equipo.',
    cause: 'Apps adoptadas por áreas sin pasar por IAM (shadow IT), apps que además del SSO tienen cuenta local con su propia contraseña, y desprovision manual que depende de que alguien se acuerde. El offboarding estándar (iam-kb-002) corta el IdP; este artículo cubre lo que vive FUERA del IdP.',
    steps: [
      {
        title: 'Conocer el inventario de apps y su método de desprovision',
        detail: 'Por cada app: dueño, método de autenticación (SSO federado, SCIM, cuenta local) y método de DESprovision (automático por SCIM, manual en panel del proveedor, coordinación con el dueño). El método define qué toca hacer en cada salida: sin inventario, cada leaver es una investigación desde cero.',
        command: 'Get-MgAuditLogSignIn -Top 500 | Group-Object AppDisplayName | Sort-Object Count -Descending'
      },
      {
        title: 'Verificar el desprovision real, no el supuesto',
        detail: 'SCIM: confirmar que la cuenta aparece disabled en la app (la integración puede estar rota en silencio desde hace meses). SSO-only: la cuenta LOCAL del SaaS sigue viva aunque el SSO esté cortado: hay que desactivarla a mano en el panel. Esta diferencia es exactamente el hueco por el que se cuelan los ex-empleados.',
        command: 'Get-MgAuditLogSignIn -Top 100 | Where-Object AppDisplayName -eq "Concur"'
      },
      {
        title: 'Manejar los datos antes de cortar',
        detail: 'En apps con contenido propio del usuario (gestor de proyectos, wiki, CRM): transferir propiedad de sus registros al sucesor o exportar según la política de retención ANTES de desactivar. Cortar primero y preguntar después destruye activos del negocio: el manager molesto del viernes pide exactamente esto.',
        command: 'Get-ADUser -Identity ana.torres -Properties Manager,Description'
      },
      {
        title: 'Invalidar sesiones, API keys y tokens personales',
        detail: 'Los tokens viven más que las contraseñas: PATs de integraciones, API keys generadas por el usuario, sesiones de navegador persistidas. Desactivar la cuenta en el panel NO siempre los mata: revisar la sección de tokens/integraciones de la app y revocarlos explícitamente (en la nube de Microsoft esto es Revoke sessions, iam-kb-002).',
        command: 'Revoke-MgUserSignInSession -UserId ana.torres@nexora.com'
      },
      {
        title: 'Barrer cuentas dormantes SaaS',
        detail: 'Reporte mensual por app: cuentas sin login en 30/60/90 días → deshabilitar con aviso al dueño. Las apps con licencia por usuario convierten las dormantes en costo directo; las free-tier las convierten en superficie de ataque silenciosa. El dueño de la app recibe el reporte y responde, no el equipo IAM adivinando.',
        command: 'Get-MgAuditLogSignIn -Top 1000 | Group-Object UserPrincipalName | Where-Object Count -lt 2'
      },
      {
        title: 'Endurecer el proceso para lo nuevo',
        detail: 'Toda app nueva entra al inventario con dueño, método de autenticación (SSO preferido: una identidad menos que administrar) y método de desprovision definido al contratar. Apps sin dueño declarado no se contratan: el shadow IT se combate en la adopción, no en la salida.',
        command: 'Get-MgAuditLogDirectoryAudit -Top 200 | Group-Object ActivityDisplayName | Sort-Object Count -Descending'
      },
      {
        title: 'Dejar el checklist de salida por app',
        detail: 'El ticket de offboarding lleva su sección SaaS: app por app, deshabilitada sí/no, quién lo hizo y hora. La próxima auditoría pregunta "muéstrenme cómo garantizan que un leaver no conserva accesos": la respuesta es el checklist diligenciado, no la buena fe.',
        command: 'Get-ADUser -Identity ana.torres -Properties Enabled,MemberOf'
      }
    ],
    verification: 'La prueba de login del leaver falla en TODAS las apps del inventario (no solo el correo), los tokens y API keys del usuario quedaron revocados con evidencia, y el checklist por app quedó adjunto al ticket de salida.',
    escalation: 'Dueño de la aplicación SaaS (apps manuales o sin acceso administrativo del equipo IAM)',
    relatedTerms: ['Account deprovisioning', 'SCIM Provisioning', 'Cuenta dormante / inactiva', 'Identity sprawl'],
    relatedTickets: ['iam-020', 'iam-046']
  },
  {
    id: 'iam-kb-021',
    title: 'Gestión de identidad de terceros y contratistas',
    category: 'IAM - Ciclo de vida (JML)',
    environment: 'Multi',
    symptoms: 'Dos escenarios: llega "este consultor necesita acceso a X" con una fecha de fin difusa ("por ahora") o la revisión mensual encuentra cuentas ext-* activas de proyectos que terminaron hace un año. Los terceros concentran el mayor riesgo de identidad con el menor control: no están en el sistema de RRHH, no tienen manager interno y su dispositivo no lo administra nadie.',
    cause: 'Patrocinio informal (el pedido llega por chat a quien sea), ausencia de fecha de fin real (el proyecto "se extiende" sin que nadie renueve formalmente), y dispositivos desconocidos entrando a recursos corporativos. La identidad de tercero sin sponsor, sin expiración y con permisos generosos es la receta completa.',
    steps: [
      {
        title: 'Exigir patrocinio formal',
        detail: 'Toda identidad de tercero tiene un sponsor: un empleado Nexora que responde por el acceso y su duración, con el contrato o proyecto de respaldo. Sin sponsor no hay cuenta: es la regla que evita las cuentas "del consultor del consultor". El sponsor se registra en el ticket y en la descripción de la cuenta.',
        command: 'Get-ADUser -LDAPFilter "(sAMAccountName=ext-*)" -Properties Description,Manager | Export-Csv C:\\Temp\\externos.csv'
      },
      {
        title: 'Nombrar y clasificar como externo desde el primer día',
        detail: 'Convención ext-<empresa>-<usuario> (ext-alpha-jperez) con atributo employeeType=Externo y el sponsor en el campo correspondiente. Los reportes de "externos activos", las auditorías de terceros y el barrido mensual nacen de estos atributos: un externo nombrado como empleado es invisible para todos los controles.',
        command: 'New-ADUser -Name "Juan Perez (Alpha)" -SamAccountName ext-alpha-jperez -UserPrincipalName ext-alpha-jperez@nexora.com -Path "OU=Contratistas,OU=Nexora,DC=nexora,DC=local" -Description "Consultor Alpha - proyecto migracion - sponsor: lucia.pereyra" -Enabled $true'
      },
      {
        title: 'Fijar fecha de expiración desde la creación',
        detail: 'La cuenta lleva AccountExpirationDate = fin de contrato o del proyecto: si nadie renueva, la cuenta muere sola. Esa fecha es el control automático que perdona todos los olvidos: sin ella, la vida media de una cuenta de tercero es "hasta que la auditoría la encuentre".',
        command: 'Set-ADAccountExpiration -Identity ext-alpha-jperez -DateTime "2026-06-30"'
      },
      {
        title: 'Aplicar mínimo privilegio estricto y MFA obligatorio',
        detail: 'Nada birthright para externos: solo los grupos estrictos del proyecto. MFA desde el primer login y Conditional Access más estricto que para empleados (iam-kb-017): los dispositivos de terceros no son administrados por Nexora, así que o cumplen compliance o trabajan por VDI/escritorio publicado.',
        command: 'Add-ADGroupMember -Identity NXR-PROY-MIGRACION -Members ext-alpha-jperez'
      },
      {
        title: 'Renovar solo con re-aprobación del sponsor',
        detail: 'Al vencer la fecha, la cuenta se deshabilita automáticamente; si el proyecto continúa, el sponsor re-aproba con motivo y nueva fecha de fin. Nunca extensiones automáticas: la re-aprobación es el momento en que el negocio decide conscientemente que el riesgo sigue vigente.',
        command: 'Search-ADAccount -AccountExpiring -TimeSpan 7.00:00:00'
      },
      {
        title: 'Barrido mensual de externos activos',
        detail: 'Cruce mensual: cuentas ext-* activas contra contratos vigentes (con Compras/RRHH). El reporte sale de los atributos del paso 2: sponsor, proyecto, expiración. Cuentas sin respaldo se deshabilitan con aviso al sponsor: mejor un consultor molesto un lunes que un acceso anónimo descubierto en diciembre.',
        command: 'Get-ADUser -LDAPFilter "(&(sAMAccountName=ext-*)(!userAccountControl:1.2.840.113556.1.4.803:=2))" -Properties AccountExpirationDate'
      },
      {
        title: 'La salida del tercero es un leaver inmediato',
        detail: 'Al terminar la relación (o la TAREA, aunque el contrato siga): offboarding completo (iam-kb-002) sin periodo de cortesía. La fecha de fin contractual no es la de expiración de la cuenta: la cuenta vence con la NECESIDAD, no con el papel.',
        command: 'Disable-ADAccount -Identity ext-alpha-jperez'
      }
    ],
    verification: 'Todas las cuentas ext-* activas tienen sponsor registrado, contrato/proyecto de respaldo y fecha de expiración vigente; el barrido mensual no devuelve cuentas sin respaldo; ninguna tiene grupos birthright.',
    escalation: 'Líder de IAM + RRHH/Compras (terceros sin patrocinador, proyectos sin fecha de fin o contratos que nadie confirma)',
    relatedTerms: ['Gestión de accesos de contratistas', 'Principio de mínimo privilegio (Least Privilege)', 'Zero Trust', 'Cuenta dormante / inactiva'],
    relatedTickets: ['iam-021', 'iam-047']
  },
  {
    id: 'iam-kb-022',
    title: 'Escalados del equipo IAM y matriz RACI',
    category: 'IAM - Operación & Escalado',
    environment: 'Gobernanza',
    symptoms: 'El ticket se complicó: pide algo fuera del nivel del analista, se cruza con otra área, o es urgente y visible para gerencia. La pregunta del junior siempre es la misma: ¿lo resuelvo, lo derivo o lo escalo? Escalar tarde cuesta incidentes; escalar vacío cuesta el tiempo del otro equipo; quedarse con lo que no corresponde cuesta el SLA y la credibilidad.',
    cause: 'No es un fallo sino proceso de operación. Falla cuando: se retiene un ticket que debía escalar (por orgullo o por miedo a molestar), se escala sin evidencia (el equipo que recibe empieza de cero), o se deriva por el canal equivocado (chat a una persona en vacaciones en lugar de la cola formal).',
    steps: [
      {
        title: 'Tener el mapa RACI a la vista',
        detail: 'Por tipo de caso: R (quién ejecuta: el analista IAM), A (quién aprueba y responde: líder de IAM), C (consultados: dueño de sistema, RRHH, SOC, Infra), I (informados). La matriz RACI del equipo está publicada en la wiki de IAM: la consulta de 2 minutos que evita el ticket de 2 semanas mal ubicado.',
        command: 'Get-ADUser -LDAPFilter "(department=IAM)" -Properties Title,Description | Select-Object Name,Title'
      },
      {
        title: 'Conocer los disparadores de escalamiento inmediato',
        detail: 'Cuenta posiblemente comprometida (SOC YA, iam-kb-023), bloqueo masivo de accesos (P1 con líder IAM informado), todo lo que ponga producción en riesgo, y lo que la KB no cubre DESPUÉS de agotarla. La regla de oro: dudar con criterio es escalar pronto y arrepentirse nunca.',
        command: 'Get-MgAuditLogSignIn -Top 50 | Where-Object RiskLevel -ne "none"'
      },
      {
        title: 'Distinguir escalamiento de aprobación',
        detail: 'La aprobación no es un escalamiento técnico: excepciones de política (iam-kb-015, iam-kb-016), accesos fuera de matriz, cambios a la matriz (iam-kb-009): van al líder de IAM con la RECOMENDACIÓN ya redactada (opciones, riesgos, sugerencia). Pedir "¿qué hago?" sin propuesta delega el análisis que es tu trabajo.',
        command: 'Get-ADGroupMember NXR-COMPRAS-APR -Recursive | Export-Csv C:\\Temp\\aprobacion-pendiente.csv'
      },
      {
        title: 'Derivar por dominio con contexto, no rebotar',
        detail: 'Salud del conector/servidores → Infra & Ops (iam-kb-018); redes y VPN → Redes; bugs y permisos internos de la app → dueño de aplicación; seguridad de cuentas → SOC; fechas y contratos → RRHH/Compras. Derivar es un hand-off con contexto: el técnico que recibe no debe volver a preguntar lo que el ticket ya contesta.'
      },
      {
        title: 'Escalar con paquete de evidencia, no con pánico',
        detail: 'Qué se solicitó, qué se revisó, comandos corridos con salida, hipótesis descartadas, hora de cada hallazgo y qué se necesita del equipo que recibe. Un escalamiento con evidencia arranca en tu avance; un escalamiento vacío hace que la otra cola repita tus pasos y te lo devuelva con la factura del SLA.',
        command: 'Get-ADUser -Identity ana.torres -Properties MemberOf,Enabled,LastLogonDate'
      },
      {
        title: 'Hacer seguimiento sin soltar',
        detail: 'El ticket sigue siendo tuyo hasta el ACK formal del equipo receptor: reasignar no es escalar. Registrar quién aceptó, a qué hora y qué se comprometió. Si no hay ACK en el SLA del nivel (P1: 15 minutos), subir por el canal definido: el silencio del receptor es un dato, no un descanso.',
        command: 'Get-MgAuditLogDirectoryAudit -Top 100'
      },
      {
        title: 'Cerrar el ciclo de aprendizaje',
        detail: 'Lo escalado y resuelto vuelve al equipo como KB nueva o actualizada (exactamente como este artículo): el caso que se escala dos veces es documentación pendiente. La cola mensual del equipo revisa qué se escaló, qué faltó en la KB y qué se puede resolver la próxima vez sin despertar a nadie.',
        command: 'Search-ADAccount -LockedOut | Export-Csv C:\\Temp\\caso-escala.csv'
      }
    ],
    verification: 'El ticket escalado recibió ACK del equipo receptor dentro del SLA (P1: 15 min), el receptor no pidió repetir la investigación, y el caso dejó una mejora de KB o runbook para la próxima.',
    escalation: 'Líder de IAM (cuando dudar es la respuesta: cualquier caso sin fila clara en la matriz RACI se consulta antes de actuar)',
    relatedTerms: ['Escalamiento', 'Dueño del acceso (access owner)', 'KPIs de IAM', 'Modelo de madurez IAM'],
    relatedTickets: ['iam-022', 'iam-048']
  },
  {
    id: 'iam-kb-023',
    title: 'Mitigación de robo de credenciales desde el equipo IAM',
    category: 'IAM - Seguridad de identidad',
    environment: 'Multi',
    symptoms: 'El SOC comparte señales de identidad: ráfagas de push de MFA a las 3 de la mañana (MFA fatigue), intentos fallidos con decenas de usuarios desde una misma fuente (password spraying), o un usuario "que entró" desde un país imposible. Desde IAM la tarea es contener la identidad YA y cerrar las rutas que la hicieron posible.',
    cause: 'Phishing que capturó usuario+contraseña (y a veces también el OTP de esa sesión), credential stuffing con contraseñas filtradas de otros sitios (el usuario recicla su contraseña personal), o token theft: robo de la cookie de sesión, que ni siquiera necesita la contraseña. Cada vector pide una mitigación distinta.',
    steps: [
      {
        title: 'Confirmar con el usuario por canal no comprometido',
        detail: '¿Reconoce la actividad? La pregunta NO va por el correo ni por el chat (el atacante puede estar leyéndolos): llamada al número del registro o al manager. La verificación es parte de la contención: confirmar legítima una actividad maligna, o "contener" un login real del gerente en viaje, ambos dañan y se evitan con el canal correcto.',
        command: 'Get-MgAuditLogSignIn -Top 50 | Where-Object UserPrincipalName -eq "ana.torres@nexora.com"'
      },
      {
        title: 'Contener desde IAM sin esperar',
        detail: 'Si no es legítima (o hay duda razonable): revocar sesiones y tokens YA, forzar reseteo de contraseña (iam-kb-005) y, si el segundo factor está comprometido o el teléfono está fuera del control del usuario, exigir re-registro de MFA (iam-kb-006). La identidad contenida en minutos es la diferencia entre un incidente y una nota al pie.',
        command: 'Revoke-MgUserSignInSession -UserId ana.torres@nexora.com'
      },
      {
        title: 'Revisar qué hizo el atacante con la sesión',
        detail: 'La ventana de la sesión robada cuenta la historia: reglas de bandeja creadas (persistencia clásica que reenvía correo al exterior), consentimientos OAuth otorgados a apps maliciosas, cambios en métodos de MFA/SSPR, descargas masivas. Lo creado por el atacante hay que revertirlo TODO: cambiar la contraseña sin barrer la persistencia es decoración.',
        command: 'Get-MgAuditLogDirectoryAudit -Top 100 | Where-Object InitiatedBy -like "*ana.torres*"'
      },
      {
        title: 'Endurecer el factor, no solo la contraseña',
        detail: 'Si el vector fue OTP interceptado o push aprobado por fatiga, la respuesta es factor phishing-resistant: FIDO2/passkey para el usuario afectado y, por política, para todos los roles privilegiados (iam-kb-012). El OTP y el push están en la lista de extinction por buenas razones: resistir el phishing es propiedad del FACTOR, no de la educación del usuario.',
        command: 'Get-MgUserAuthenticationMethod -UserId ana.torres@nexora.com'
      },
      {
        title: 'Cerrar las rutas estructurales',
        detail: 'Bloqueo de legacy auth por Conditional Access (iam-kb-017: los protocolos viejos ni saben qué es MFA), banned password list contra filtradas (iam-kb-016), y políticas por riesgo (Identity Protection) para que un sign-in anómalo muera solo. Cada ruta cerrada es un vector menos que el próximo phishing puede intentar.',
        command: 'Get-MgAuditLogSignIn -Top 500 | Where-Object RiskLevel -ne "none"'
      },
      {
        title: 'Coordinar con SOC el alcance y la caza',
        detail: 'La identidad comprometida alimenta la correlación: la misma fuente/IP/TTP puede estar probando otras cuentas (el spraying es horizontal por definición). El hand-off con la evidencia (timeline, IPs, hashes, artifacts) es insumo directo de detección: la contención sin la caza deja al vecino de la cuenta comprometida esperando su turno.',
        command: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4625} -MaxEvents 100'
      },
      {
        title: 'Registrar y medir para la próxima',
        detail: 'Del caso quedan: hora de detección, hora de contención (el MTTR de identidad es KPI del equipo, iam-kb-022), vector exacto y acción preventiva. La simulación de phishing del trimestre y las reglas del SIEM se ajustan con esta data: cada robo contenido debe hacer más caro el próximo.',
        command: 'Search-ADAccount -LockedOut | Export-Csv C:\\Temp\\post-incidente-lockouts.csv'
      }
    ],
    verification: 'Las sesiones del usuario quedaron revocadas sin actividad anómala posterior, el usuario re-entró con credencial nueva y factor phishing-resistant, y la persistencia (reglas de bandeja, consentimientos, métodos) fue revertida y documentada.',
    escalation: 'SOC (SIEMPRE en conjunto: IAM contiene la identidad, el SOC caza el alcance; nunca "ya lo arreglé" sin avisar)',
    relatedTerms: ['Credential stuffing', 'Password spraying', 'MFA fatigue (ataque)', 'Token theft (robo de tokens)', 'Revocación de sesiones y tokens'],
    relatedTickets: ['iam-023', 'iam-049']
  },
  {
    id: 'iam-kb-024',
    title: 'Glosario y flujos JML de la organización (Nexora S.A.)',
    category: 'IAM - Ciclo de vida (JML)',
    environment: 'Multi',
    symptoms: 'El artículo de referencia del equipo: dónde vive cada cosa. Cómo funciona el JML de punta a punta en Nexora, qué convenciones usar y en qué documento apoyar cada decisión. Es la primera lectura del analista nuevo (y la consulta del veterano cuando la memoria falla): si cada persona nombra distinto, los reportes mienten y cada revisión se vuelve arqueología.',
    cause: 'No es un fallo sino el mapa. La operación de IAM se sostiene en convenciones compartidas y ciclos con fecha: fuentes de autoridad, prefijos, ventanas y dueños. Este artículo los reúne y remite al detalle: es el índice del pilar.',
    steps: [
      {
        title: 'El flujo Joiner de punta a punta',
        detail: 'RRHH (fuente de autoridad) → ticket JML en ServiceNow → alta AD con convención de nombres (UPN @nexora.com verificado) → grupos birthright + rol de matriz → licencia por matriz (LIC-E3/E5) → primer login con cambio de contraseña y registro MFA/SSPR. Detalle completo y verificación en iam-kb-001.',
        command: 'Get-ADUser -Identity ana.torres -Properties EmployeeID,Department,Manager,MemberOf'
      },
      {
        title: 'El flujo Mover de punta a punta',
        detail: 'Ticket con rol nuevo + fecha efectiva → línea base de accesos → retirar grupos del rol VIEJO primero → asignar los del rol NUEVO por matriz → atributos de posición al día → chequeo SoD → diff antes/después como evidencia. La pérdida de los accesos viejos es la mitad que se olvida: iam-kb-003.',
        command: 'Get-ADPrincipalGroupMembership ana.torres | Select-Object Name | Export-Csv C:\\Temp\\mover-lineabase.csv'
      },
      {
        title: 'El flujo Leaver de punta a punta',
        detail: 'Fecha de RRHH → mismo día: deshabilitar AD + revocar sesiones/tokens + retirar licencias + vaciar grupos + cerrar SaaS y bóveda/PIM → retención de buzón según política → evidencia hora por hora en el ticket. Terceros y apps SaaS fuera del IdP tienen sus propios pasos: iam-kb-002, iam-kb-020, iam-kb-021.',
        command: 'Search-ADAccount -AccountDisabled | Where-Object SamAccountName -eq "ana.torres"'
      },
      {
        title: 'Convenciones de nombres del directorio',
        detail: 'Usuarios pnombre.apellido; terceros ext-empresa-usuario con sponsor y expiración; servicios svc- (gMSA preferido); break-glass bg-; grupos de acceso NXR-<sistema>-<perfil>, roles NXR-ROL-*, licencias LIC-*, CA por grupos CA-PILOTO / CA-Emergencia. Los reportes del equipo (externos activos, leavers pendientes, administradores) nacen de estos prefijos: nombrar bien es auditar gratis.',
        command: 'Get-ADUser -LDAPFilter "(sAMAccountName=ext-*)" -Properties AccountExpirationDate'
      },
      {
        title: 'Herramientas y su rol en el flujo',
        detail: 'Sistema de RRHH: fuente de autoridad del JML. ServiceNow: flujo y tickets (visible IAM-XXXX). AD + Entra ID: identidad on-prem y nube, puenteadas por Entra Connect en srv-connect (iam-kb-018). Matriz de roles: el QUÉ (permisos, iam-kb-009). Entra PIM + bóveda CyberArk: privilegio temporal (iam-kb-012). SIEM: vigilancia de identidad (iam-kb-019).'
      },
      {
        title: 'Vocabulario mínimo del analista',
        detail: 'JML, entitlement, birthright, matriz de roles, SoD, combinación tóxica, attestation, least privilege, standing access, PIM/JIT, SSPR. Cada término tiene su definición en el glosario de VaultNotes con flashcards para estudiarlo: hablar el idioma exacto es lo que permite que un ticket se entienda sin contextos extra.',
        command: 'Get-ADDefaultDomainPasswordPolicy | Select-Object MinPasswordLength,LockoutThreshold'
      },
      {
        title: 'Ciclos, ventanas y SLAs del equipo',
        detail: 'Batch JML diario (08:00 sobre los tickets del día); revisión semanal de logs de identidad (iam-kb-019); mensual de externos (iam-kb-021) y de uso privilegiado (iam-kb-012); trimestral de certificación de accesos (iam-kb-014) con barrido SoD (iam-kb-015). P1 de identidad (compromiso o bloqueo masivo): contención iniciada en menos de 1 hora con SOC informado (iam-kb-022, iam-kb-023).',
        command: 'Get-ADGroup -LDAPFilter "(name=NXR-*)" | Measure-Object'
      }
    ],
    verification: 'El analista nuevo ubica en minutos qué flujo aplica a su caso, qué convención usar y en qué artículo profundizar; un muestreo de 10 cuentas del directorio coincide con las convenciones y atributos de este mapa.',
    escalation: 'Líder de IAM (cualquier discrepancia entre este mapa y la realidad: la documentación perdió una carrera contra el cambio y debe actualizarse en el mismo sprint)',
    relatedTerms: ['Joiner-Mover-Leaver (JML)', 'Identity Governance & Administration (IGA)', 'Birthright access', 'Entitlement', 'Matriz de roles'],
    relatedTickets: ['iam-024', 'iam-050']
  },
  {
    id: 'iam-kb-025',
    title: 'Okta Workforce Identity: arquitectura y administración del piloto',
    category: 'IAM - Plataformas IAM',
    environment: 'Plataformas IAM',
    symptoms: 'Nexora corre el piloto de Okta como broker de identidad para el portafolio SaaS (Entra ID sigue siendo el IdP de M365): llega el primer sistema que se conectará a producción y el analista necesita entender el modelo antes de tocar nada. Las dudas típicas del equipo: qué es la org y su dominio, qué hace cada rol de administrador, cuándo usar Universal Directory y qué agentes se instalan junto a AD. Conectar apps sin entender el modelo produce la torre de espagueti de federaciones que el piloto existe para evitar.',
    cause: 'No es un fallo sino el aprendizaje de plataforma del equipo. Okta es un tenant SaaS (la org) con su Admin Console, su API (token SSWS) y sus roles administrativos propios; importar usuarios desde AD exige el Okta AD Agent instalado en un servidor del dominio, y Universal Directory es el perfil extendido de Okta, NO un reemplazo de AD: AD sigue siendo la fuente de autoridad de los empleados (iam-kb-001). Confundir el perfil con la fuente es el error de arquitectura clásico del que adopta un broker.',
    steps: [
      {
        title: 'Mapear la org y sus puntos de entrada',
        detail: 'Una org = un tenant con dominio propio (el piloto usa <okta-domain> tipo dev-nexora.okta.com o login.nexora.com con dominio personalizado). Entradas de operación: Admin Console (administración), el Dashboard de usuarios finales y la API /api/v1 con token SSWS creado en Admin Console → Security → API → Tokens con expiración definida. Todo lo que el equipo haga por consola debe poder responderse también por API: esa es la regla de operabilidad del piloto.',
        command: 'curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" "https://<okta-domain>/api/v1/users?limit=200"'
      },
      {
        title: 'Conectar AD con el Okta AD Agent (importar, no reemplazar)',
        detail: 'Admin Console → Directory → Directory Integrations → Add Active Directory: se descarga el Okta AD Agent, se instala en un servidor miembro del dominio con una cuenta de servicio dedicada (iam-kb-011) y queda como el puente de importación de usuarios y grupos. Los cambios fluyen del agente hacia Okta, jamás al revés (salvo write-back habilitado explícitamente para contraseñas). Sin agente vivo no hay import: revisar su estado en la pantalla de integración antes de diagnosticar "usuarios que no llegan" (la misma disciplina del conector híbrido, iam-kb-018).'
      },
      {
        title: 'Decidir qué manda para cada atributo (perfil vs. fuente)',
        detail: 'Los atributos base (nombre, correo, login) vienen de AD vía agente; Universal Directory permite AÑADIR atributos de la capa SaaS que AD no tiene (idioma de app, preferencias). El mapeo vive en Directory → Profile Mappings: se documenta qué atributo viene de dónde y se revisa igual que una sync rule de Entra Connect (iam-kb-042): cada origen de atributo con un dueño, sin sobrescrituras silenciosas entre integraciones.'
      },
      {
        title: 'Repartir los roles de administrador por función',
        detail: 'Super Admin solo para el líder y el break-glass documentado; Org Admin para el equipo de plataforma; App Admin por aplicación (el dueño del sistema administra SU app y nada más); Help Desk Admin para el soporte de primer nivel (resetea factores, no toca políticas); Read Only para auditoría. Asignar "Super Admin a todos" es la anti-práctica gemela de Domain Admin en AD (iam-kb-012): el piloto debe nacer con el privilegio repartido.',
        command: 'curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" "https://<okta-domain>/api/v1/users/<id>/roles"'
      },
      {
        title: 'Asignar aplicaciones por grupo, no por usuario',
        detail: 'Directory → Groups muestra los grupos importados de AD (NXR-*) y los grupos nativos de Okta. La asignación de apps del piloto se hace contra los grupos AD existentes para que la matriz de roles (iam-kb-009) siga siendo la única verdad; los group rules de Okta (si el usuario cumple una condición → grupo) se reservan para casos SaaS-only y quedan documentados en el inventario de apps (iam-kb-020): una regla que nadie recuerda es un acceso que nadie explica en la campaña.'
      },
      {
        title: 'Conocer los demás agentes del ecosistema',
        detail: 'Okta AD Agent (import de usuarios y grupos), Okta LDAP Agent (para apps que solo hablan LDAP contra el broker), Okta IWA Agent (desktop SSO con Kerberos en la red corporativa, el espejo del Seamless SSO de Entra, iam-kb-042) y Okta RADIUS Agent (VPN). Cada agente es un servidor que instalar, parchear y monitorear: entran al inventario de infraestructura con dueño desde el primer día del piloto, no cuando fallen.'
      },
      {
        title: 'Dejar la higiene administrativa lista antes de producción',
        detail: 'Checklist del piloto: tokens de API con expiración y rotación documentada, administradores revisados contra la lista aprobada, notificaciones de administración (cambio de política, alta de admin) enrutadas a la cola de ServiceNow, y el System Log (iam-kb-027) llegando al SIEM de Nexora. Un tenant SaaS sin esa higiene es una isla de identidad que la torre de monitoreo (iam-kb-019) no ve.',
        command: 'curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" "https://<okta-domain>/api/v1/logs?filter=eventType sw "system"&limit=100"'
      }
    ],
    verification: 'El agente de AD importa usuarios y grupos del piloto, cada atributo del perfil tiene origen documentado, los roles admin quedaron repartidos con Super Admin restringido, y un usuario de prueba entra al Dashboard con la app del piloto asignada por grupo.',
    escalation: 'Líder de IAM + Arquitectura (decisiones de fuente de autoridad por atributo, dominios personalizados o write-back hacia AD: son cambios de arquitectura del piloto, no ajustes de consola)',
    relatedTerms: ['Okta Workforce', 'Universal Directory (Okta)', 'Identity Provider (IdP)', 'Mapeo de atributos (attribute mapping)', 'Grupos de seguridad de AD'],
    relatedTickets: ['iam-036', 'iam-033']
  },
  {
    id: 'iam-kb-026',
    title: 'Okta: políticas de autenticación y sign-on (global session, MFA por factor, device trust)',
    category: 'IAM - Plataformas IAM',
    environment: 'Plataformas IAM',
    symptoms: 'El piloto pasa de "conectar apps" a "decidir quién entra y con qué factor": hay que definir la política global de sesión, las políticas de autenticación por aplicación y qué factores exige cada una. Los dolores típicos: un usuario del piloto entra a la app crítica con solo contraseña porque la política por defecto quedó floja, o al revés, una regla mal calculada encierra a media área un lunes (el mismo incidente de política que Nexora ya vivió con Conditional Access, iam-kb-038 y iam-017).',
    cause: 'Okta separa DOS capas que el novato mezcla: la Global Session Policy (Admin Console → Security → Global Session Policy) controla la sesión en Okta (duración, persistencia, inactividad), y las Authentication Policies (Security → Authentication Policies) controlan QUÉ factores exige cada aplicación (password, password + factor, FIDO2). El fallo aparece cuando una app queda con la política Default (password only) o cuando una regla de excepción "temporal" se queda viva para siempre sin dueño que la barra.',
    steps: [
      {
        title: 'Diseñar antes de tocar: la matriz de apps contra nivel exigido',
        detail: 'La misma matriz de roles (iam-kb-009) dice qué apps existen y su criticidad: el nivel se define por tramo — app crítica (password + factor phishing-resistant), media (password + Okta Verify), baja (password + OTP) — y cada app nueva exige decidir su política en su ticket de alta (iam-kb-020). La matriz primero: la política improvisada app por app es cómo nacen los huecos que la campaña trimestral descubre tarde.'
      },
      {
        title: 'Configurar la Global Session Policy con sesiones razonables',
        detail: 'Security → Global Session Policy → Add Rule: condiciones de red (rango corporativo publicado), duración de sesión web y móvil por población, y si la sesión persiste al cerrar el navegador. La sesión de un admin debe ser MÁS corta que la del usuario final, y la vida de los tokens se contrasta con la política de refresh tokens del lado Entra (iam-kb-047): una sesión de ocho horas en un equipo compartido es un hallazgo esperando fecha.'
      },
      {
        title: 'Crear la Authentication Policy por aplicación',
        detail: 'Security → Authentication Policies → Add a New Policy asignado a la app del piloto, con reglas en orden de evaluación: la primera que matchea gana, así que la regla más específica va arriba y la regla THEN (si nadie matchea) queda con MFA obligatorio, jamás "password only". Es la misma disciplina de orden de reglas de firewall y de CA de Entra (iam-kb-017): el orden ES la política.'
      },
      {
        title: 'Elegir factores con criterio de resistencia al phishing',
        detail: 'En cada regla: Password + ANY para el usuario general; Password + WebAuthn/FIDO2 o Okta Verify FastPass para apps críticas y administradores (device-bound, resiste AiTM); SMS y voz prohibidos como factor (la misma política de iam-kb-046: el SMS es recuperable por SIM swapping). El catálogo de factores se habilita en Security → Authenticators, y el push de Okta Verify se usa con number challenge (number matching) para amortiguar el MFA fatigue.',
        command: 'curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" "https://<okta-domain>/api/v1/users/<id>/factors"'
      },
      {
        title: 'Exigir dispositivo confiable donde importa',
        detail: 'Con device assurance (Security → Device Authenticators) la regla de la app crítica puede exigir dispositivo registrado/administrado como condición adicional — el espejo del device compliance de Entra (iam-kb-017). Con FastPass el dispositivo además se verifica criptográficamente: el login pasa de "la persona conoce el secreto" a "la persona Y su equipo son legítimos", que es la dirección de Zero Trust (iam-kb-021).'
      },
      {
        title: 'Preparar el grupo de emergencia ANTES de activar',
        detail: 'Espejo del CA-Emergencia de Entra (iam-kb-017): un grupo de Okta excluido de las reglas críticas, vacío por defecto, cuyo llenado temporal exige ticket y se barre cada viernes. Sin exclusión documentada, el día que una regla encierre a un gerente la salida será desactivar la política completa a ciegas: exactamente el rollback que la auditoría no perdona y que la política de Nexora prohíbe.',
        command: 'curl -s -X POST -H "Authorization: SSWS ${OKTA_API_TOKEN}" -H "Content-Type: application/json" -d "{\"profile\":{\"name\":\"Okta-Emergencia\",\"description\":\"Exclusion temporal de politicas - se barre los viernes\"}}" "https://<okta-domain>/api/v1/groups"'
      },
      {
        title: 'Probar con usuario de laboratorio y leer el System Log',
        detail: 'Crear el usuario de prueba, asignarle la app y recorrer los tres escenarios (red corporativa, externa, factor perdido): cada intento deja en el System Log (iam-kb-027) la regla que aplicó y los factores satisfechos. "Funciona con mi cuenta de admin" no es prueba: el admin tiene exclusiones que el usuario final no tiene, y la documentación de la matriz de políticas queda con dueño y versión como activo vivo.',
        command: 'curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" "https://<okta-domain>/api/v1/logs?filter=eventType sw "user.authentication"&limit=100"'
      }
    ],
    verification: 'El usuario de laboratorio entra a la app crítica solo con password + FIDO2 (nunca con password solo), el grupo de emergencia está vacío con exclusiones documentadas, y las tres pruebas (red corporativa, externa, factor perdido) dejaron evidencia en el System Log con la regla que aplicó cada una.',
    escalation: 'Líder de IAM (cualquier regla "password only" en apps del piloto o excepción permanente de MFA: no se aprueba en el nivel del analista)',
    relatedTerms: ['Okta Workforce', 'Política de autenticación', 'Device compliance', 'Number Matching', 'Phishing-resistant MFA'],
    relatedTickets: ['iam-038', 'iam-015']
  },
  {
    id: 'iam-kb-027',
    title: 'Okta: System Log y troubleshooting de SSO del piloto',
    category: 'IAM - Plataformas IAM',
    environment: 'Plataformas IAM',
    symptoms: 'Un login del piloto falla y hay que diagnosticar: "la app me devuelve al portal y nada", "dice que no estoy asignado", error SAML del lado del SP, o el clásico OIDC "invalid_client" un domingo sin que nadie tocara nada (secret vencido). La ventaja de Okta es que TODO intento queda en el System Log con outcome y outcomeReason: dos horas de adivinación se convierten en una consulta. Este artículo es el gemelo Okta del troubleshooting SAML/OIDC de Entra (iam-kb-008).',
    cause: 'Causas típicas del piloto: usuario sin asignación de la app (o sin el grupo asignado), ACS/reply URL que no coincide entre lo que el SP pide y lo que Okta tiene configurado, claims/NameID que el SP espera y Okta no emite (mail vs. UPN), client secret OIDC vencido, desvío de reloj, o una authentication policy que exige un factor que el usuario no tiene registrado (iam-kb-026). El error exacto vive en el log: el trabajo es leerlo antes de mover configuración, igual que con los sign-in logs de Entra (iam-kb-008).',
    steps: [
      {
        title: 'Abrir el System Log y saber qué busca',
        detail: 'Admin Console → Reports → System Log (o la API /api/v1/logs, con retención de hasta un año según edición): filtrar por el usuario del intento y por rango de hora; cada evento trae actor (quién), target (app), eventType y outcomeReason. Es la misma disciplina de los sign-in logs de Entra (iam-kb-019): el log es la primera parada del diagnóstico, no la confesión de derrota.',
        command: 'curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" "https://<okta-domain>/api/v1/logs?q=ana.torres&since=2026-07-14T13:00:00Z&limit=100"'
      },
      {
        title: 'Confirmar asignación de la app y del grupo',
        detail: 'Antes de culpar al protocolo: Directory → People → usuario → Applications (o la API de asignaciones). Sin asignación no hay SSO: la asignación se hace por grupo (iam-kb-025), y si el usuario entró a la app por link directo sin asignación, el intento queda registrado como acceso no autorizado, no como fallo de SAML — dos diagnósticos distintos con el mismo síntoma de "no puedo entrar".',
        command: 'curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" "https://<okta-domain>/api/v1/apps/<appId>/users?q=ana.torres"'
      },
      {
        title: 'Diagnosticar fallos SAML con el evento del IdP',
        detail: 'Verificar contra la configuración de la app que la ACS URL coincida EXACTA (mayúsculas, protocolo, path — la disciplina de string exacto de iam-kb-008), que el Audience/EntityID no haya cambiado por una actualización del proveedor, y que el certificado de firma vigente sea el que el SP descargó de la metadata: el rollover de certificado sin reload del SP es el incidente dominical clásico que Nexora ya vivió con el portal de RRHH (iam-033).'
      },
      {
        title: 'Diagnosticar fallos OIDC: secret, redirect y clock skew',
        detail: 'invalid_client (secret vencido o revocado) y redirect_uri mismatch (comparación exacta contra las URIs registradas). La expiración del secret se revisa en Applications → app → Sign On → Client Credentials, y la fecha de vencimiento se agenda en el inventario de apps con dueño (iam-kb-020) para que el domingo no sea sorpresa. El desvío de reloj se revisa igual que en iam-kb-008: menos de 5 minutos entre IdP y SP.',
        command: 'curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" "https://<okta-domain>/api/v1/logs?filter=eventType sw "user.authentication"&limit=200"'
      },
      {
        title: 'Revisar qué política y qué factor aplicó',
        detail: 'El log de autenticación trae la política evaluada y los factores satisfechos: un "MFA required" que falla porque el usuario no tiene Okta Verify registrado se corrige con registro del factor, no tocando la política (iam-kb-026). Distinguir el fallo de CONFIGURACIÓN (política, asignación, claims) del fallo de USUARIO (factor no registrado, contraseña) evita el cambio de configuración que rompe a todos por diagnosticar a uno.'
      },
      {
        title: 'Reproducir con el navegador y la traza completa',
        detail: 'Con el usuario de laboratorio y las herramientas de desarrollo del navegador (pestaña Network) seguir los redirects (app → Okta → app) para ver en qué hop muere el flujo y con qué error del lado SP. Un loop de redirección suele ser una assertion consumida dos veces: revisar relojes y relay state igual que en iam-kb-008, no empezar por "borrar cookies del usuario".',
        command: 'w32tm /query /status'
      },
      {
        title: 'Enviar el System Log al SIEM y cerrar con registro',
        detail: 'El piloto no puede ser invisible para la torre de monitoreo: los eventos de Okta se streamean al SIEM de Nexora (event hooks o polling de la API) y alimentan las mismas reglas de identidad (iam-kb-019). El ticket de troubleshooting cierra con el outcomeReason exacto, la causa raíz y la corrección: esos textos son la materia prima de la KB del equipo, exactamente como este artículo.',
        command: 'curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" "https://<okta-domain>/api/v1/logs?filter=eventType sw "system"&limit=100"'
      }
    ],
    verification: 'El intento del usuario de laboratorio queda en el System Log con outcome success end-to-end (SP-initiated), la causa raíz del caso quedó identificada con su outcomeReason, y el inventario de apps actualizó las fechas de vencimiento de certificados y secrets.',
    escalation: 'Dueño de la aplicación SaaS (fallos del lado SP: metadata sin recargar, claims propios del proveedor) / Soporte del vendor (errores de plataforma que el System Log no explica)',
    relatedTerms: ['Okta System Log', 'SAML 2.0', 'OpenID Connect (OIDC)', 'Assertion', 'Registros de inicio de sesión (sign-in logs)'],
    relatedTickets: ['iam-033', 'iam-034']
  },
  {
    id: 'iam-kb-028',
    title: 'Okta: aprovisionamiento y lifecycle con SCIM (deactivate vs. suspend)',
    category: 'IAM - Plataformas IAM',
    environment: 'Plataformas IAM',
    symptoms: 'El piloto necesita que el lifecycle no sea manual: usuarios de prueba que deben aparecer en la app sin que nadie los cree, usuarios deshabilitados en Okta que siguen vivos en el SaaS, o un leaver del piloto al que hay que cortarle TODO hoy (iam-kb-002). El conocimiento que marca la diferencia entre acertar y romper: deactivate y suspend NO son lo mismo, y elegir mal deja al ex-empleado dentro o al usuario de excedencia sin nada (iam-008).',
    cause: 'Modelo de lifecycle de Okta: Staged (creado sin activar) → Active (puede entrar y consume licencias de apps) → Suspended (pausa que conserva asignaciones, iam-008) → Deactivated (desasignado, password reseteado, fuera) → Deleted. Con SCIM, Okta manda sobre la app (crea, actualiza, desactiva); sin SCIM, la app se gestiona a mano. Los errores típicos: activar "Deactivate" sin probar qué hace la app al recibirlo, y mapeos de atributos que sobrescriben datos de la app con basura del perfil.',
    steps: [
      {
        title: 'Entender la secuencia de vida antes de conectar la app',
        detail: 'La tabla del piloto con las equivalencias al modelo Nexora: suspend = la pausa de la excedencia (conserva asignaciones, no deja entrar), deactivate = el corte del leaver (desasigna apps, resetea password, mata sesiones — iam-kb-002/044). Escribir la tabla en la wiki del equipo ANTES de conectar la primera app: la diferencia se decide con la tabla a la vista, no con el usuario esperando al teléfono.'
      },
      {
        title: 'Conectar la app con SCIM del OIN o custom',
        detail: 'Si la app está en el Okta Integration Network el conector ya existe (Applications → Browse App Catalog → activar Provisioning); si es custom: Applications → app → Provisioning → Integration con la SCIM base URL y el token que la app expone, y Okta valida los endpoints (Users, Groups) con el botón de prueba. El asistente de integración deja marcar Create/Update/Deactivate: se activan solo las que la app soporta de verdad, y lo que no se puede automatizar queda documentado en el método de desprovision del inventario (iam-kb-020).'
      },
      {
        title: 'Mapear atributos en "To App" y activar por fases',
        detail: 'Provisioning → To App → Mappings: userName, name y emails contra los atributos del perfil (iam-kb-025). La activación es por fases: Create primero con un grupo piloto y verificación de lo que llega, después Update, y recién al final Deactivate — la misma progresión por oleadas del despliegue de una política (iam-kb-017) aplicada al provisioning. Un Deactivate activado sin prueba tumba cuentas reales el primer día.',
        command: 'curl -s -X POST -H "Authorization: SSWS ${OKTA_API_TOKEN}" "https://<okta-domain>/api/v1/users/<id>/lifecycle/activate"'
      },
      {
        title: 'Sincronizar membresías de grupos cuando la app lo soporte',
        detail: 'Con Group Push (Provisioning → To App → Group Push) el grupo de Okta se materializa como grupo dentro de la app: la matriz de roles (iam-kb-009) sigue siendo la fuente y la app recibe membrecías sin gestión manual. Vigilar el volumen: apps con cientos de grupos empujados generan ruido de auditoría — se empujan solo los grupos que la app usa de verdad.',
        command: 'curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" "https://<okta-domain>/api/v1/groups?type=OKTA_GROUP"'
      },
      {
        title: 'Probar suspend para las excedencias del modelo Nexora',
        detail: 'El caso iam-008 (excedencia de seis meses): suspend conserva las asignaciones para que la vuelta sea reactivar sin rearmar nada, pero nadie entra mientras tanto. La cuenta suspendida aparece en el barrido de la campaña de inactivos (iam-030) como pausa deliberada con fecha de retorno de RRHH, no como cuenta dormida misteriosa: la diferencia es un atributo documentado.',
        command: 'curl -s -X POST -H "Authorization: SSWS ${OKTA_API_TOKEN}" "https://<okta-domain>/api/v1/users/<id>/lifecycle/suspend"'
      },
      {
        title: 'Probar deactivate con un leaver de laboratorio',
        detail: 'Con el usuario dummy: deactivate debe (1) desasignar las apps, (2) resetear el password y (3) destruir las sesiones; en la app SCIM debe llegar active=false. Las tres propiedades se confirman con evidencia una por una, no se suponen: deactivate es el corazón del offboarding del piloto (iam-kb-002, iam-kb-020, iam-kb-044) y la prueba es la diferencia entre el corte y el aviso.',
        command: 'curl -X POST "https://<okta-domain>/api/v1/users/<id>/lifecycle/deactivate" -H "Authorization: SSWS ${OKTA_API_TOKEN}"'
      },
      {
        title: 'Vigilar los errores de provisioning como una cola',
        detail: 'Las operaciones fallidas de SCIM quedan visibles por usuario (Applications → app → usuario → Provisioning Jobs) con el error que la app devolvió: 409 conflicto, 400 atributo, 403 permisos del token. La revisión diaria del piloto mira esa cola antes de que lleguen las quejas: un provisioning roto en silencio durante semanas es el shadow IT del ciclo de vida, y el reporte del día se guarda con el mismo criterio de evidencia de iam-kb-019.',
        command: 'curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" "https://<okta-domain>/api/v1/users/<id>/appLinks"'
      }
    ],
    verification: 'Un Joiner del grupo piloto aparece solo en la app SCIM con los atributos mapeados, un leaver de laboratorio queda desasignado, sin password y active=false en la app, y un suspend de excedencia conserva asignaciones sin permitir login.',
    escalation: 'Dueño de la aplicación SaaS (endpoint SCIM defectuoso o permisos insuficientes del token: Okta no puede hacer lo que la app no deja)',
    relatedTerms: ['SCIM', 'User provisioning', 'Account deprovisioning', 'Okta Workforce', 'Registros de aprovisionamiento (provisioning logs)'],
    relatedTickets: ['iam-008', 'iam-040']
  },
  {
    id: 'iam-kb-029',
    title: 'SailPoint IdentityNow: arquitectura IGA del RFP (identity cube, sources, roles)',
    category: 'IAM - Plataformas IAM',
    environment: 'Plataformas IAM',
    symptoms: 'El RFP de IGA de Nexora (automatizar el JML y las campañas que hoy se mueven con ServiceNow, CSV y PowerShell) exige que el equipo sepa CÓMO trabaja la plataforma que evalúa: en las demos el proveedor habla de identity cube, sources, access profiles y roles, y el analista debe traducir cada término al mapa Nexora (AD, Entra, RRHH, ServiceNow, bóveda PAM) y preguntar lo que el vendedor no cuenta. Sin ese mapa, el RFP se responde con folleto, no con criterio.',
    cause: 'No es un fallo sino alfabetización de plataforma para la evaluación. El modelo IdentityNow: cada sistema se conecta como source (conector que agrega cuentas y entitlements); las cuentas se correlacionan a identidades, y el identity cube es la vista 360 de una persona (sus cuentas, accesos, riesgo e histórico); RRHH es la fuente autoritativa que crea y mata identidades vía identity profiles; y el acceso se modela en capas: entitlements crudos → access profiles (paquetes aprobables) → roles de negocio.',
    steps: [
      {
        title: 'Mapear los sources contra el paisaje Nexora',
        detail: 'Un source por sistema: AD (cuentas + grupos NXR-*), Entra ID (roles y licencias), el ERP (perfiles), ServiceNow (grupos de aprobación) y la bóveda PAM (activos y safes). La aggregation trae cuentas y entitlements al inventario del IGA: sin source agregado no hay gobernanza de ese sistema. La pregunta dura de la demo: ¿qué sistemas de Nexora NO tienen conector y cómo se gobernarían?',
        command: 'curl -s -H "Authorization: Bearer ${SP_TOKEN}" "https://<tenant>.api.identitynow.com/v3/sources?limit=50"'
      },
      {
        title: 'Entender el identity cube como unidad de gobernanza',
        detail: 'El cube no es la cuenta: es la PERSONA (la correlación de todas sus cuentas por employeeID y atributos, iam-kb-001). La correlación de identidades es lo que permite responder "¿qué tiene esta persona en TODOS los sistemas?" sin armar el cruce a mano. En la evaluación se exige ver el cube de un empleado real anonimizado: atributos, cuentas, accesos y riesgo en una sola vista.',
        command: 'curl -s -X POST -H "Authorization: Bearer ${SP_TOKEN}" -H "Content-Type: application/json" -d "{\"query\":{\"query\":\"ana.torres\"}}" "https://<tenant>.api.identitynow.com/v3/search/identities"'
      },
      {
        title: 'RRHH como fuente autoritativa e identity profiles',
        detail: 'Los identity profiles definen cómo nace una identidad (joiner del registro de RRHH), cómo se actualiza en un Mover y cómo se desprovisiona un Leaver (fecha de salida → terminate → desactivar todo lo correlacionado). Es el JML de iam-kb-001/002/003 disparado por eventos de RRHH en lugar del batch manual: la madurez que el RFP busca (iam-kb-045). En la demo se pide el flujo completo con un registro real anonimizado.'
      },
      {
        title: 'Distinguir entitlements, access profiles y roles',
        detail: 'Entitlement: el permiso crudo del sistema (grupo NXR-*, perfil del ERP, rol de Entra). Access profile: paquete de entitlements que se pide y aprueba como unidad (el "rol" operativo). Role de negocio: agrupa access profiles por función (analista de compras) y puede ser birthright (asignado por atributo de RRHH) o solicitable con aprobación (iam-kb-043). La matriz de roles de Nexora (iam-kb-009) se convierte en roles y access profiles: la herramienta no inventa el modelo, lo ejecuta.',
        command: 'curl -s -H "Authorization: Bearer ${SP_TOKEN}" "https://<tenant>.api.identitynow.com/v3/access-profiles?limit=50"'
      },
      {
        title: 'Exigir el ciclo solicitud → aprobación → cumplimiento',
        detail: 'Access request: el usuario pide un access profile o rol, el flujo de aprobación corre según la configuración (dueño del acceso, manager, four-eyes para privilegiados — iam-kb-043) y el provisioning baja al source. La demo debe mostrar el caso completo con ServiceNow como front de solicitud o como aprobador: el RFP exige integración con la herramienta de tickets que ya se usa, no otra bandeja paralela donde las aprobaciones se pierden (la lección de iam-029).'
      },
      {
        title: 'Vigilar calidad de datos y correlación antes de comprar',
        detail: 'El IGA es tan bueno como los datos que come: cuentas sin owner (iam-026), atributos vacíos, cuentas huérfanas (iam-030) y entitlements sin descripción hacen que la campaña certifique ruido (iam-024). En la evaluación se carga una muestra real anonimizada y se mide: % de cuentas correlacionadas y % de entitlements con dueño y descripción. Ese número, no el folleto, predice el éxito de la implementación.'
      },
      {
        title: 'Documentar el modelo para la decisión del RFP',
        detail: 'Del piloto de datos sale el documento de evaluación: qué sources conectarían, cómo se mapearía la matriz de roles a access profiles y roles, qué flujos JML se automatizarían y qué quedaría manual. La decisión (iam-kb-050) compra cobertura medible, no promesas: cada afirmación del RFP queda como requisito verificable en el PoC, con la evidencia adjunta.',
        command: 'curl -s -H "Authorization: Bearer ${SP_TOKEN}" "https://<tenant>.api.identitynow.com/v3/campaigns?limit=25"'
      }
    ],
    verification: 'El equipo puede dibujar el flujo RRHH → identity profile → identity cube → access profile → entitlement para un empleado real, el cube de un empleado anonimizado muestra cuentas y accesos correlacionados, y el documento de evaluación mapea cada componente del modelo IdentityNow contra su equivalente Nexora.',
    escalation: 'Líder de IAM + Procurement y Seguridad (la decisión del RFP es de inversión: el equipo aporta el criterio técnico y el PoC, la firma es del comité)',
    relatedTerms: ['SailPoint IdentityNow / IGA', 'Identity Cube', 'Identity Governance & Administration (IGA)', 'Conector de IGA', 'Entitlement', 'Fuente autoritativa (authoritative source)'],
    relatedTickets: ['iam-029', 'iam-024']
  },
  {
    id: 'iam-kb-030',
    title: 'SailPoint: campañas de certificación y access reviews (operación de la herramienta)',
    category: 'IAM - Gobernanza & Auditoría',
    environment: 'Gobernanza',
    symptoms: 'La campaña trimestral de Nexora (iam-kb-014) hoy se arma con exports y correos; la plataforma IGA evaluada promete correrla como campaña nativa: alcance segmentado, certificadores notificados, revocaciones que se ejecutan solas y KPIs sin planilla. Este artículo define cómo se OPERA una campaña en la plataforma (sirve para la evaluación y para cuando entre a producción): quién certifica qué, qué pasa con lo denegado y cómo se mide el cierre.',
    cause: 'No es un fallo sino la mecanización del control que ya existe. Una campaign es un evento de certificación con alcance (qué identidades, cuentas o entitlements), certifiers, fechas y reglas de remediación. Falla igual que la versión manual cuando el revisor aprueba sin mirar, lo revocado no se remedia, o el alcance se define por comodidad ("todo el mundo") y el revisor se ahoga: exactamente el error de iam-024.',
    steps: [
      {
        title: 'Definir el tipo de campaña y su alcance',
        detail: 'Tipos del IGA: Manager (cada jefe certifica a su gente), Entitlement Owner (el dueño del sistema certifica quiénes tienen SU permiso), Source Owner, y campañas dirigidas a terceros y privilegiados (iam-021, iam-047). El alcance de Nexora combina bloques con certificador correcto por bloque: privilegiados y financieros cada trimestre (el alcance obligatorio de iam-kb-014), terceros cada mes. La campaña de "todo para todos" es la que no se responde.'
      },
      {
        title: 'Configurar certificadores y plazos',
        detail: 'Certifica el dueño del acceso, no el equipo IAM (iam-kb-014): en el IGA el certificador se resuelve por el dato (el manager del cube, el owner del entitlement), con fecha de inicio y cierre, recordatorios automáticos y la regla default deny al vencer. La plataforma permite aplicar de verdad la regla que a mano siempre cuesta: que el silencio no perpetúe el acceso.',
        command: 'curl -s -H "Authorization: Bearer ${SP_TOKEN}" "https://<tenant>.api.identitynow.com/v3/campaigns?limit=25"'
      },
      {
        title: 'Preparar el contexto que ve el certificador',
        detail: 'El material de revisión con atributos de contexto: puesto, área, última fecha de uso si el source la trae, y el comentario del solicitante original. Un certificador que ve solo "grupo NXR-SAP-FI-ESCRITURA: ana.torres" aprueba por inercia; el mismo certificador con "último uso: hace 7 meses" revoca. La calidad del contexto define la calidad de la campaña: se exige verlo en la demo con datos reales anonimizados.',
        command: 'curl -s -H "Authorization: Bearer ${SP_TOKEN}" "https://<tenant>.api.identitynow.com/v3/access-profiles?limit=50"'
      },
      {
        title: 'Operar la campaña: revisar, decidir, recordar',
        detail: 'El certificador decide por ítem: Approve (sigue justificado), Revoke (sale y se remedia), con comentario obligatorio en lo dudoso. La operación diaria del equipo: monitorear el avance, disparar recordatorios y escalar a la gerencia de los rezagados — la misma gestión de iam-kb-014 pero con el tablero de la herramienta en lugar del CSV y el teléfono.'
      },
      {
        title: 'Ejecutar la remediación y verificar el efecto real',
        detail: 'Cada Revoke dispara la remediación: revocación automática en el source (grupo retirado, perfil fuera) o tarea de remediación si el sistema es manual. La lección de iam-kb-014 aplica igual: la campaña no termina cuando el certificador respondió, sino cuando el directorio cambió. La verificación es el diff antes/después, y para lo manual la cola de ServiceNow con dueño: revocaciones pendientes al cierre son campaña incompleta.',
        command: 'Compare-Object (Import-Csv C:\\Temp\\campana-antes.csv) (Import-Csv C:\\Temp\\campana-despues.csv) -Property SamAccountName'
      },
      {
        title: 'Cerrar con excepciones registradas y KPIs',
        detail: 'KPIs de cierre: % de respuesta, % de revocación, ítems por certificador, días hasta el cierre y excepciones abiertas con vencimiento (iam-046). Las excepciones que el negocio firmó quedan visibles en la plataforma con su control compensatorio y su fecha de expiración, para que la campaña SIGUIENTE las vuelva a preguntar: la excepción que caduca sola es la que no se vuelve eterna.',
        command: 'Get-ADGroupMember NXR-FIN-APR -Recursive | Export-Csv C:\\Temp\\campana-antes.csv'
      },
      {
        title: 'Empacar la evidencia de la campaña',
        detail: 'Export de decisiones con certificador y fecha, diff de revocaciones ejecutadas, KPIs y excepciones firmadas: el paquete E-01..E-07 de la "Semana de Access Review" (iam-049) se genera de la propia herramienta en lugar de armarse a mano. La evidencia auditable pasa a ser subproducto de operar el control, no un proyecto aparte (iam-kb-019).',
        command: 'Get-ADGroupMember NXR-FIN-APR -Recursive | Export-Csv C:\\Temp\\campana-despues.csv'
      }
    ],
    verification: 'La campaña de prueba corre con un bloque real anonimizado: certificador correcto por bloque, remediación verificada en el source para lo denegado, y el paquete de cierre (decisiones, KPIs, excepciones con vencimiento) se exporta completo.',
    escalation: 'Líder de IAM / Comité de cumplimiento (certificadores que no responden tras el escalamiento a su gerencia: la regla default deny se aplica y se reporta, igual que en iam-kb-014)',
    relatedTerms: ['Campaña de certificación', 'Access Review (certificación de accesos)', 'Attestation', 'Recertificación', 'Remediación', 'SailPoint IdentityNow / IGA'],
    relatedTickets: ['iam-041', 'iam-049']
  },
  {
    id: 'iam-kb-031',
    title: 'SailPoint: role mining y modelado de roles (top-down, bottom-up, híbrido)',
    category: 'IAM - Gobernanza & Auditoría',
    environment: 'Gobernanza',
    symptoms: 'La matriz de roles de Nexora (iam-kb-009) se construyó a mano con entrevistas y exports; el IGA evaluado trae role mining (minería de patrones de acceso reales) y el equipo necesita saber qué pedirle a la herramienta y qué esperar de ella. Los dolores actuales que la minería promete atacar: 40 grupos sin dueño tras la reorganización (iam-026), roles de la matriz que ya no reflejan lo que la gente usa, y la sospecha de que media matriz son "excepciones permanentes" que se piden una y otra vez.',
    cause: 'No es un fallo sino la fábrica de roles. Top-down: los roles se definen desde la función de negocio (entrevistas, organigrama, dueños) — coherentes pero lentos y a veces de papel. Bottom-up: el role mining agrupa entitlements por patrones REALES de uso (quién comparte qué combinación) — reflejan la realidad pero pueden santificar basura acumulada. El híbrido es el estándar: la función define el esqueleto, la minería lo valida contra el uso real, y el taller con dueños arbitra.',
    steps: [
      {
        title: 'Preparar el insumo: entitlements agregados y descritos',
        detail: 'La minería trabaja sobre el inventario agregado de los sources (iam-kb-029): cada entitlement con su source, descripción y dueño. Minería sobre entitlements sin descripción produce "Grupo NXR-FC-017" como componente de rol: técnicamente correcto y humanamente inútil. El saneamiento de descripciones (iam-026) es prerrequisito del proyecto, no fase dos.',
        command: 'Get-ADGroup -LDAPFilter "(name=NXR-*)" -Properties Description | Where-Object { -not $_.Description } | Measure-Object'
      },
      {
        title: 'Correr la minería y leer los resultados con criterio',
        detail: 'La herramienta propone clusters de usuarios con accesos comunes y candidatos a rol (frecuencia, cobertura, similitud). Lo que se lee en cada candidato: cuántos usuarios cubre, cuántos entitlements lo componen, cuánto ruido hay (entitlements raros dentro del patrón) y si el patrón coincide con un puesto real del organigrama. Un cluster que no corresponde a ninguna función es deuda histórica, no un rol: la minería sin criterio convierte el entitlement creep (iam-kb-003) en rol oficial.',
        command: 'Get-ADGroup -Filter * -Properties Member | Select-Object Name,Member | Export-Csv C:\\Temp\\roles-mining.csv'
      },
      {
        title: 'Sombrear top-down: validar contra funciones y dueños',
        detail: 'Por cada puesto del organigrama: qué tendría que tener por su función (top-down), qué tiene realmente su gente (bottom-up) y por qué difieren. Las diferencias son de dos clases: accesos legítimos que la matriz no cubre (la matriz se actualiza, iam-kb-040) y acumulación sin función (se revoca por campaña, iam-kb-030). El taller con dueños es donde cada rol propuesto se firma.',
        command: 'Get-ADUser -LDAPFilter "(department=*)" -Properties Title,Department | Select-Object Title,Department -Unique | Export-Csv C:\\Temp\\roles-funciones.csv'
      },
      {
        title: 'Elegir el tipo de cada rol: birthright, funcional, solicitable',
        detail: 'El modelado en capas del IGA: birthright por atributo de RRHH (todo empleado: correo, intranet — iam-kb-001), roles funcionales por puesto (se asignan con el joiner del identity profile), y access profiles solicitables con aprobación (proyectos, accesos temporales). Un rol que mezcla las tres capas ("analista Y además permisos del proyecto X") nace roto: cada capa tiene un ciclo de vida distinto (iam-kb-045).'
      },
      {
        title: 'Cuidarse de la explosión de roles',
        detail: 'KPI de diseño: cantidad de roles por cada 100 usuarios y % de usuarios cuyo acceso explica UN solo rol. La sobrecorrección clásica es un rol por persona-caso (role explosion): traslada el desorden de los grupos a los roles sin gobernar nada. La regla del equipo: si un rol propuesto cubre menos de un mínimo de usuarios o vive menos de un trimestre, es access profile o excepción con vencimiento, no rol (iam-kb-043).'
      },
      {
        title: 'Someter los roles candidatos al chequeo SoD',
        detail: 'Cada rol propuesto se cruza contra la matriz de pares conflictivos (iam-kb-015, iam-kb-049) ANTES de publicarlo: la minería encuentra patrones de uso, incluidos los patrones tóxicos que el negocio toleró durante años (el tesorero de iam-025 también era un patrón de uso). Publicar el rol y detectar la toxicidad después es certificar el conflicto con sello oficial.',
        command: 'Compare-Object (Import-Csv C:\\Temp\\sod-par-a.csv) (Import-Csv C:\\Temp\\sod-par-b.csv) -Property SamAccountName -IncludeEqual | Where-Object SideIndicator -eq "=="'
      },
      {
        title: 'Promulgar por oleadas y medir la adopción',
        detail: 'Los roles aprobados reemplazan membrecías sueltas por oleadas (nada de big bang, iam-kb-009): cada oleada deja diff antes/después como evidencia. Métricas de éxito: % de accesos concedidos por rol (no por excepción), caída de solicitudes manuales y caída de excepciones permanentes (iam-046). El role mining se repite al menos una vez al año: el modelo de roles es un organismo vivo, no una estatua (IAM drift, iam-kb-019).',
        command: 'Get-ADGroupMember NXR-ROL-ANALISTA-COMPRAS -Recursive | Export-Csv C:\\Temp\\rol-migracion.csv'
      }
    ],
    verification: 'Los roles candidatos tienen cobertura medida, dueño firmado, capas separadas (birthright/funcional/solicitable) y chequeo SoD pasado; la prueba del PoC muestra a un usuario del rol accediendo a lo suyo y a NADA de otros roles.',
    escalation: 'Líder de IAM + dueños del riesgo (roles que la minería propone y el negocio no quiere firmar, o combinaciones tóxicas detectadas en patrones reales: la decisión de remediación es del dueño del riesgo)',
    relatedTerms: ['Role mining / Role engineering', 'Matriz de roles', 'Entitlement', 'Access package', 'Birthright access', 'SailPoint IdentityNow / IGA'],
    relatedTickets: ['iam-014', 'iam-026']
  },
  {
    id: 'iam-kb-032',
    title: 'One Identity Safeguard: bóveda, sesiones y appliance del PAM de Nexora',
    category: 'IAM - Plataformas IAM',
    environment: 'PAM / Privilegios',
    symptoms: 'La operación de cuentas privilegiadas de Nexora corre sobre One Identity Safeguard y el día a día del equipo vive aquí: checkout de la cuenta del ERP para la ventana del sábado (iam-017), sesión grabada para la investigación del SOC, o el appliance que hay que parchear en clúster sin tumbar el acceso de la guardia. Los síntomas de una operación floja: checkouts que nadie devuelve, sesiones directas al activo que se saltan el bastión, y admins de la propia bóveda sin dual control.',
    cause: 'No es un fallo sino el modelo de operación PAM (iam-kb-012) sobre la plataforma Safeguard: appliance (físico o virtual) que centraliza activos, cuentas y sesiones, con alta disponibilidad por clúster. Los incidentes nacen de: cuentas dadas de alta sin rotación al check-in, sesiones directas al activo que dejan la grabación fuera (el pecado de iam-021), y políticas de acceso sin aprobación para lo crítico.',
    steps: [
      {
        title: 'Conocer la arquitectura: appliance, clúster, SPP y SPS',
        detail: 'Safeguard for Privileged Passwords (SPP) es la bóveda de credenciales: activos, cuentas, checkout y rotación. Safeguard for Privileged Sessions (SPS) gestiona las sesiones interactivas (RDP/SSH) con grabación y monitoreo en vivo. Operan sobre appliances que forman clúster: la gestión local es por la interfaz web del appliance (https://<appliance>, con el usuario admin), y el parcheo del clúster se planifica nodo por nodo, nunca el clúster completo en ventana de guardia.',
        command: 'ssh admin@<appliance-1.nexora.local>'
      },
      {
        title: 'Inventariar activos y cuentas en la bóveda',
        detail: 'Asset = servidor, dispositivo de red o aplicación de la que la bóveda custodia credenciales; debajo viven las cuentas (admin local, cuenta de servicio, break-glass del activo). El alta nace del inventario de cuentas privilegiadas (iam-kb-011, iam-kb-039): sin owner documentado, la cuenta no entra. Los activos se agrupan por dominio o plataforma para heredar política sin configurar cuenta por cuenta.',
        command: 'curl -sk -H "Authorization: Bearer ${SG_TOKEN}" "https://<appliance>/service/core/v2/Assets"'
      },
      {
        title: 'Operar el checkout como préstamo con reglas',
        detail: 'Checkout = la cuenta se presta por ventana: la política define duración máxima, si exige aprobación (integrada con ServiceNow), si es de un solo usuario a la vez (el conflicto de iam-018: dos admins, una cuenta, y el check-in forzoso del primero) y si rota la contraseña al check-in. La rotación al devolver es el corazón del modelo: quien la usó ya no la conoce. Sin esa marca activada, la bóveda es un disco compartido de contraseñas con interfaz bonita (iam-021).',
        command: 'curl -sk -H "Authorization: Bearer ${SG_TOKEN}" "https://<appliance>/service/core/v2/Assets/<assetId>/Accounts"'
      },
      {
        title: 'Enrutar las sesiones por el bastión y grabarlas',
        detail: 'Los accesos interactivos a activos van por sesión (portal del appliance o Safeguard Desktop Client): el usuario se autentica contra la bóveda, la bóveda inyecta la credencial al activo y la sesión queda grabada (teclas, video) según la política del activo. Una sesión RDP directa al servidor con la contraseña copiada de la bóveda deja de tener grabación: la política debe cerrar el camino directo (bloquear RDP/SSH saliente a activos, permitir solo bastión) — si no, la grabación es decorativa.'
      },
      {
        title: 'Exigir dual control en lo que duele',
        detail: 'Cuentas críticas (core de red, break-glass, Domain Admin) con política de dual control: dos personas para el checkout (el solicitante y un aprobador en vivo) y la posibilidad de monitoreo 4-eyes durante la sesión (un segundo operador ve la sesión en tiempo real y puede terminarla). Es el four-eyes de iam-kb-013 aplicado a plataforma: ningún individuo solo frente al activo más sensible.',
        command: 'curl -sk -H "Authorization: Bearer ${SG_TOKEN}" "https://<appliance>/service/core/v2/Accounts/<id>/Password"'
      },
      {
        title: 'Auditar con reportes y API, no con memoria',
        detail: 'La revisión mensual de sesiones privilegiadas (iam-022) se alimenta de los reportes nativos: checkouts por usuario/activo/ventana, checkouts sin check-in, sesiones grabadas con alertas, y el barrido del 100% de los checkouts del trimestre (iam-047). El módulo de PowerShell que One Identity publica para Safeguard permite extraer inventario y colas para los reportes del equipo.',
        command: 'Connect-Safeguard -Appliance <appliance>'
      },
      {
        title: 'Mantener el appliance como infraestructura crítica',
        detail: 'Parcheo coordinado nodo por nodo, respaldo de la configuración del clúster, certificados del appliance vigentes, monitoreo de salud en el NOC y runbook de falla (aunque sea bóveda, es un servidor). El acceso administrativo al PROPIO appliance también pasa por mínimo privilegio: los roles de administración de la bóveda se reparten y se auditan igual que cualquier acceso privilegiado, y toda operación del appliance queda en la pista de auditoría.',
        command: 'Invoke-SafeguardMethod -Service Core -Method Get -RelativeUrl "Assets"'
      }
    ],
    verification: 'Todo checkout del periodo tiene dueño, justificación y check-in con rotación verificada, las sesiones interactivas de los activos críticos van por el bastión con grabación activa, y el clúster quedó parcheado nodo por nodo sin perder alta disponibilidad.',
    escalation: 'Líder de IAM + Infra y Ops (salud del appliance/clúster, certificados y parcheo) / SOC (uso de credencial privilegiada fuera de patrón: siempre con la evidencia de sesiones y checkouts)',
    relatedTerms: ['One Identity Safeguard', 'Bóveda de credenciales (credential vaulting)', 'Préstamo de credenciales (check-in / check-out)', 'Monitoreo y grabación de sesiones', 'Principio de cuatro ojos (four-eyes)', 'Servidor de salto (bastion host)'],
    relatedTickets: ['iam-017', 'iam-021', 'iam-047']
  },
  {
    id: 'iam-kb-033',
    title: 'One Identity Manager: la suite de provisioning y workflows (concepto y evaluación)',
    category: 'IAM - Plataformas IAM',
    environment: 'Plataformas IAM',
    symptoms: 'En el RFP de IGA también corre One Identity Manager, y hay que saber QUÉ se está evaluando: una suite on-prem de aprovisionamiento basado en procesos, no un SaaS de torre única. Las preguntas del equipo: cómo conecta los sistemas, cómo se definen los flujos de aprobación, qué es eso de "procesos" que se disparan con cada operación, y cómo se sostiene la operación del día 2. El objetivo del artículo: poder contrastar el modelo contra el IGA SaaS evaluado en paralelo (iam-kb-029) sin perderse en el vocabulario del proveedor.',
    cause: 'No es un fallo sino alfabetización de otra escuela de IGA. One Identity Manager modela el aprovisionamiento como procesos persistentes: cada operación de identidad (alta, cambio de grupo, solicitud aprobada) dispara una cadena de procesos (process chains) que ejecutan el flujo contra los sistemas conectados. La base de datos central (la "base de datos del proyecto", con sus front ends de administración) es el corazón; el Job Service es el motor que ejecuta; y el IT Shop es la vitrina donde el usuario pide acceso.',
    steps: [
      {
        title: 'Entender el modelo: base central + procesos + Job Service',
        detail: 'Todo vive en la base de datos de One Identity Manager: el modelo de identidad (empleados, cuentas, grupos, sistemas de destino), las definiciones de procesos y las colas de trabajo. El Job Service (servicio de Windows en el servidor de aplicación) levanta y ejecuta los procesos pendientes. Consecuencia operativa: la salud del IGA es la salud de ese servicio y esa base; el chequeo del servicio es parte del monitoreo diario del piloto, no un detalle.',
        command: 'Get-Service | Where-Object DisplayName -like "*Job Service*"'
      },
      {
        title: 'Mapear los front ends de administración',
        detail: 'Designer (definición y orquestación de procesos), Synchronization Editor (conectores y mapeos a sistemas de destino: AD, RRHH, ERP), Manager (consola operativa del día a día: empleados, cuentas, solicitudes) y el Web Portal (autoservicio del usuario final y aprobaciones). Cada front end es un rol distinto: el analista opera Manager y el Web Portal; tocar Designer o el Synchronization Editor es tarea de plataforma con control de versiones, igual que tocar las sync rules del conector híbrido (iam-kb-042).'
      },
      {
        title: 'Conectar RRHH y AD: la sincronización',
        detail: 'El Synchronization Editor define los proyectos de sincronización: RRHH (fuente autoritativa, iam-kb-001) hacia la base central, y la base central hacia AD y los demás sistemas de destino, con mapeo de atributos y reglas de unión por employeeID. La evaluación pregunta el canto de rodaje del JML completo (joiner/mover/leaver) disparado por RRHH: la demo debe correr un joiner real anonimizado de punta a punta (iam-kb-001, iam-kb-045).'
      },
      {
        title: 'Evaluar el IT Shop: el catálogo de solicitudes',
        detail: 'El IT Shop es la tienda de accesos: productos de acceso (permisos empaquetados con descripción y dueño) que el usuario agrega al carrito, flujos de aprobación por nivel (manager, dueño del sistema, four-eyes en privilegiados — iam-kb-043) y entrega automática al aprobarse. Es la contraparte de la matriz de roles (iam-kb-009): el rol de la matriz se publica como producto con su política de aprobación, y la excepción deja de ser un correo.',
        command: 'Get-ADGroupMember NXR-ADM-PLATAFORMA -Recursive | Export-Csv C:\\Temp\\oneim-aprobadores.csv'
      },
      {
        title: 'Exigir los workflows de aprobación con escalación',
        detail: 'Flujos de aprobación configurables con delegación (vacaciones), escalación automática (aprobador que no responde en SLA sube al siguiente nivel) y aprobaciones condicionales. El espejo del dolor actual: las 130 aprobaciones fuera de SLA de la cola (iam-029) se sostienen por la escalación automática y el tablero visible, no por la buena voluntad. En la demo se pide el caso de rechazo: qué pasa con la solicitud y qué evidencia queda en el historial.',
        command: 'Get-ADGroup -LDAPFilter "(managedBy=*)" -Properties ManagedBy | Select-Object Name,ManagedBy'
      },
      {
        title: 'Evaluar el despliegue: on-prem es costo operativo real',
        detail: 'One Identity Manager corre on-prem: base de datos, servidor de aplicación, Job Service, portales, y el parcheo, respaldo y alta disponibilidad de todo eso pasa al equipo. La evaluación honesta lo pone en la balanza contra el SaaS: control y profundidad de personalización versus costo de plataforma que Infra y Ops tendrá que sostener durante años (la discusión build vs. operate de iam-kb-050).',
        command: 'Get-ADUser -LDAPFilter "(sAMAccountName=*)" -Properties whenChanged | Measure-Object'
      },
      {
        title: 'Definir el criterio de decisión con métricas',
        detail: 'La comparación no es de folletos: es del PoC con datos de Nexora (matriz de roles, JML, campañas — iam-kb-029/030/031). Criterios mínimos: tiempo de puesta a punto del equipo, cobertura de conectores para el paisaje real (AD, Entra, ERP, ServiceNow), operación del día 2 (cambios de flujos sin consultor externo) y costo total con la infraestructura on-prem incluida. Cada criterio con número y dueño de la medición.',
        command: 'Get-ADGroup -LDAPFilter "(name=NXR-*)" | Measure-Object'
      }
    ],
    verification: 'El equipo explica el modelo (base central, procesos, Job Service, sincronización, IT Shop) con las equivalencias Nexora, la demo corrió un joiner y una solicitud con aprobación de punta a punta, y la matriz de decisión del RFP tiene las métricas del PoC registradas.',
    escalation: 'Líder de IAM + Infra y Ops (la plataforma on-prem exige compromiso de operación: base, Job Service y parcheo son decisión de infraestructura, no solo de IAM)',
    relatedTerms: ['One Identity Manager', 'Identity Governance & Administration (IGA)', 'Flujo de aprobación', 'User provisioning', 'Conector de IGA', 'ServiceNow (ITSM e IAM)'],
    relatedTickets: ['iam-001', 'iam-007']
  },
  {
    id: 'iam-kb-034',
    title: 'ForgeRock Identity Platform: DS, AM, IDM e IG (arquitectura del stack)',
    category: 'IAM - Plataformas IAM',
    environment: 'Plataformas IAM',
    symptoms: 'Aparece ForgeRock en el radar (reemplazo on-prem del papel de federación, directorio dedicado para una población propia, o el gateway de políticas para apps internas que no se pueden tocar) y el equipo necesita leer su arquitectura sin depender del vendedor: qué es cada pieza (DS, AM, IDM, IG), qué puertos y consolas tiene cada una, y cómo se compararía contra el stack actual AD + Entra + Okta piloto. El artículo es el mapa de la plataforma para la evaluación (iam-kb-050), no un manual paso a paso.',
    cause: 'No es un fallo sino alfabetización de un stack modular: ForgeRock son CUATRO productos que se combinan. Directory Services (DS): directorio LDAPv3 con interfaz REST. Access Management (AM): autenticación, SSO, federación SAML/OIDC y autorización central (realms, políticas, Sesiones). Identity Management (IDM): provisioning y sincronización de identidades (managed objects, mappings). Identity Gateway (IG): gateway de políticas en el borde que protege apps y APIs sin tocarlas. La fortaleza del stack es esa separación; el costo es que cada pieza se opera por separado.',
    steps: [
      {
        title: 'Levantar el mapa: qué pieza responde qué pregunta',
        detail: '¿Dónde viven los atributos? DS. ¿Quién autentica y federa? AM. ¿Quién provisiona (crear/mover/borrar) contra los sistemas? IDM. ¿Quién aplica políticas en el borde sin cambiar las apps? IG. Con esa tabla se ubica cualquier demo: cuando el vendedor dice "hagamos SSO" está en AM; si dice "aprovisionamiento", es IDM; si dice "directorio de clientes", es DS. Confundir las piezas lleva a comparar ForgeRock "completo" contra un producto puntual de otro proveedor: el error clásico de RFP.'
      },
      {
        title: 'DS: el directorio (LDAP con REST incluido)',
        detail: 'DS es el store de identidad tipo LDAPv3: base de datos de entradas (DN), esquema extensible y replicación. Puertos de operación: LDAP 1389, LDAPS 1636, administración 4444, replicación 8989. Soporta consultas LDAP clásicas y una interfaz REST propia, lo que lo hace útil tanto para apps legacy LDAP como para servicios modernos — y para el diagnóstico LDAP de siempre aplica iam-kb-041.',
        command: 'ldapsearch -h ds.nexora.local -p 1636 -D "uid=admin" -W -b "ou=people,dc=nexora,dc=local" "(uid=ana.torres)"'
      },
      {
        title: 'AM: realms, federación y el árbol de Sesiones',
        detail: 'AM (consola de administración en http://am.nexora.local:8080/am, con el administrador amadmin) organiza todo en realms: el Top Level Realm para administración y un realm por población o entorno. La federación SAML/OIDC vive en los servicios del realm, y las Sesiones de AM (consola → Sessions) muestran quién tiene sesión activa y permiten invalidarla: es el "revocar sesiones" de iam-kb-044 con plataforma propia, y la contraparte del System Log de Okta (iam-kb-027) para la torre de monitoreo.',
        command: 'dsconfig list-backends'
      },
      {
        title: 'IDM: managed objects y sincronización',
        detail: 'IDM administra los objetos gestionados (managed/user, managed/role...) con API REST propia (/openidm/managed/user) y define mappings de sincronización entre la fuente (RRHH, DS) y los objetivos (AD, apps): el provisioning del JML con reconciliación. En la evaluación se pide el flujo joiner con el mapeo de atributos visible: el mismo criterio de iam-kb-029 para cualquier IGA.',
        command: 'curl -u "openidm-admin:${IDM_PASS}" "http://idm.nexora.local:8080/openidm/managed/user?_queryFilter=userName+eq+"ana.torres""'
      },
      {
        title: 'IG: el gateway de políticas del borde',
        detail: 'IG se instala frente a las apps (reverse proxy) y aplica autenticación, autorización, control de tasa y token exchange sin modificar la app: la jugada típica para apps internas legacy que no se pueden reescribir. Las rutas (routes) de IG definen qué política aplica a cada URL: leer una route es leer la intención del acceso. Es el mismo argumento de WebSEAL de ISAM (iam-kb-036) con otra casa.',
        command: 'curl -sk -o /dev/null -w "%{http_code}\\n" "https://ig.nexora.local:8443/intranet/"'
      },
      {
        title: 'Comparar contra el stack vigente con la matriz de decisión',
        detail: 'El stack completo (DS + AM + IDM + IG) cubre directorio, acceso, provisioning y borde, pero cada pieza suma costo operativo: JVM que parchear, alta disponibilidad por pieza, consolas distintas y perfiles de operación separados. La comparación honesta contra el AD + Entra + Okta de Nexora pregunta qué piezas faltan DE VERDAD (¿un directorio para población no-AD? ¿federación on-prem que ADFS ya hace?) y qué cuesta sostener cuatro productos contra integrar SaaS (iam-kb-050).',
        command: 'Get-MgAuditLogSignIn -Top 500 | Group-Object AppDisplayName | Sort-Object Count -Descending'
      },
      {
        title: 'Preguntar por la salud comercial del stack',
        detail: 'El ciclo de vida del producto pesa en el RFP: roadmap de versiones, soporte de cada componente por separado, tamaño de la comunidad de operación (encontrar analistas que operen AM/IDM en el mercado local es un costo real de contratación) y el modelo de licenciamiento por pieza. Plataforma que nadie sabe operar es riesgo operativo disfrazado de ahorro: la advertencia que también cierra la evaluación de Oracle (iam-kb-037).'
      }
    ],
    verification: 'El equipo ubica cada pieza (DS/AM/IDM/IG) con su puerto y su consola, explica qué resolvería en Nexora y qué no, y la matriz de evaluación registra la comparación pieza a pieza contra el stack vigente con costos de operación visibles.',
    escalation: 'Líder de IAM + Arquitectura (evaluar el stack completo es decisión de plataforma a varios años: el analista aporta el mapa técnico, la decisión es del comité de arquitectura)',
    relatedTerms: ['ForgeRock', 'Directorio (directory service)', 'LDAP', 'User provisioning', 'PDP y PEP (decisión y aplicación de política)'],
    relatedTickets: ['iam-031', 'iam-035']
  },
  {
    id: 'iam-kb-035',
    title: 'Ping Identity: PingFederate (SSO), PingID (MFA) y PingDirectory (LDAP)',
    category: 'IAM - Plataformas IAM',
    environment: 'Plataformas IAM',
    symptoms: 'Ping Identity entra a la evaluación como candidato a reemplazar el papel de ADFS (la federación on-prem que dejó fuera a los externos en iam-036) y traer el MFA de la misma casa: PingFederate para el SSO y federación, PingID para el segundo factor, PingDirectory si hiciera falta un LDAP de plataforma. El equipo necesita conocer la arquitectura y sus consolas para la demo: puertos, clúster, conexiones IdP/SP y cómo se empareja PingID con las aplicaciones.',
    cause: 'No es un fallo sino alfabetización del stack Ping. PingFederate: servidor de federación SAML/OIDC/OAuth con consola administrativa en el puerto 9999 (https://<host>:9999/pingfederate/app) y runtime en 9031, que opera en clúster con nodos administrativos y de runtime. PingID: servicio cloud de MFA (la app PingID en el teléfono del usuario) emparejado con las aplicaciones vía PingFederate o SDK. PingDirectory: directorio LDAP de alto rendimiento de la misma familia técnica de DS (ldapsearch, dsconfig), útil como store de la plataforma o de poblaciones propias.',
    steps: [
      {
        title: 'PingFederate: separar consola administrativa y runtime',
        detail: 'La consola de administración vive en https://pf.nexora.local:9999/pingfederate/app y el runtime de autenticación en el 9031. Los cambios de configuración se replican al clúster desde la consola: el cambio de una conexión SP se hace UNA vez y se verifica en cada nodo. Anotar los puertos en el inventario de la evaluación: el firewall entre segmentos es la primera sorpresa de los PoC de federación.',
        command: 'curl -sk -o /dev/null -w "%{http_code}\\n" "https://pf.nexora.local:9999/pingfederate/app"'
      },
      {
        title: 'Modelar las conexiones: SP-initiated con bindings',
        detail: 'En PingFederate la federación se arma como conexiones: IdP connections (PingFederate ES el IdP hacia las apps) y SP connections (hacia proveedores externos), cada una con protocolo (SAML u OIDC), bindings, contrato de atributos y certificados. La metadata se importa y exporta como en cualquier federación (iam-kb-008, iam-kb-047): la disciplina de string exacto en ACS y redirect aplica igual, y el contrato de atributos es el equivalente del claims mapping.',
        command: 'curl -sk -u "admin:${PF_PASS}" "https://pf.nexora.local:9999/pf-admin-api/v1/oauth/clients"'
      },
      {
        title: 'OAuth y APIs: PingFederate como authorization server',
        detail: 'Además del SSO de navegador, PingFederate emite tokens OAuth2/OIDC: client credentials para integraciones y cuentas de servicio (iam-kb-039), authorization code con PKCE para apps propias. Es la pieza que pesa cuando el portafolio tiene APIs propias y no solo SaaS: en la demo se pide el alta de un client credential con expiry y scopes, y el registro de auditoría del cambio — la misma evidencia que se exige a cualquier IdP del paisaje (iam-kb-019).'
      },
      {
        title: 'PingID: el MFA y el emparejamiento del usuario',
        detail: 'PingID es cloud: el usuario se empareja (pairing) con la app PingID (push, OTP, biometría del teléfono) y las aplicaciones lo invocan vía PingFederate o SDK directo. En la evaluación: políticas por aplicación (qué factor exige cada una), OTP offline para el avión, y la misma prohibición de SMS como factor único de iam-kb-046. El flujo admin de ejemplo en la demo: re-emparejar a un usuario que cambió de teléfono (el caso iam-015, en plataforma Ping).'
      },
      {
        title: 'PingDirectory: el store LDAP de la casa',
        detail: 'PingDirectory es el directorio de la plataforma (LDAPv3, misma familia de herramientas: ldapsearch y dsconfig, con topología de replicación). Como store nativo de Ping compite o complementa con AD: AD sigue siendo la fuente de los empleados (iam-kb-001); un PingDirectory sería el store de las poblaciones que NO viven en AD (clientes, externos masivos) — la separación que también argumenta DS en ForgeRock (iam-kb-034).',
        command: 'ldapsearch -h pd.nexora.local -p 1389 -D "uid=admin" -W -b "dc=identity,dc=nexora,dc=local" "(objectClass=person)"'
      },
      {
        title: 'Evaluar la operación del clúster y el día 2',
        detail: 'Preguntas de operación para la demo: parcheo rolling del clúster, respaldo y restauración de la configuración (export/import), qué pasa si el cloud de PingID falla (¿fallback local?), y los logs de auditoría de PingFederate streameados al SIEM — la misma exigencia de iam-kb-027/019 para cualquier IdP: la federación que el SOC no ve es superficie ciega.',
        command: 'Get-WinEvent -LogName "Directory Synchronization" -MaxEvents 5'
      },
      {
        title: 'Contrastar con ADFS y el piloto Okta',
        detail: 'La matriz de decisión de tres columnas: ADFS (hoy: sin licencia adicional, pero con el costo operativo del proxy que ya falló en iam-036), PingFederate (federación y OAuth maduros, on-prem bajo control propio), y el piloto Okta (SaaS, velocidad para el portafolio SaaS). Ninguna respuesta es universal: federación on-prem para apps internas + IdP SaaS para lo cloud es tan válido como consolidar, siempre que la decisión quede documentada con sus costos (iam-kb-050).'
      }
    ],
    verification: 'El equipo navega la consola de PingFederate (9999) explicando conexiones IdP/SP y el flujo OAuth, el emparejamiento de PingID se probó con un usuario de laboratorio, y la matriz de decisión contrasta ADFS, Ping y el piloto Okta con costos de operación reales.',
    escalation: 'Líder de IAM + Arquitectura (sustituir ADFS o sumar un IdP on-prem es decisión de plataforma: el analista aporta la matriz técnica, la firma es del comité)',
    relatedTerms: ['Ping Identity', 'PingFederate', 'Federación (identidad federada)', 'SAML 2.0', 'Multi-Factor Authentication (MFA)'],
    relatedTickets: ['iam-036', 'iam-015']
  },
  {
    id: 'iam-kb-036',
    title: 'IBM Security Verify / ISAM: políticas de acceso y appliance (evaluación)',
    category: 'IAM - Plataformas IAM',
    environment: 'Plataformas IAM',
    symptoms: 'El landscape incluye a IBM en dos versiones que hay que distinguir en la evaluación: IBM Security Verify (SaaS: directorio cloud, sign-on policies por aplicación, factores y riesgo) e ISAM (IBM Security Access Manager, el appliance on-prem con el reverse proxy WebSEAL y el policy server heredado). El síntoma del analista que no las distingue: compara un SaaS contra un appliance, o deja de preguntar por los junctions que hacen que las apps legacy ni se enteren del SSO.',
    cause: 'No es un fallo sino alfabetización de dos productos emparentados. ISAM: appliance (físico o virtual) que combina reverse proxy (WebSEAL) con control de acceso central (políticas y ACLs): las apps se publican detrás de junctions y las ACLs deciden quién pasa. Verify: SaaS de identidad con cloud directory, políticas de sign-on por app, factores (TOTP, FIDO2, correo) y riesgo. La migración histórica del mercado va de ISAM a Verify; evaluar es decidir si el destino es nube, appliance o mezcla.',
    steps: [
      {
        title: 'ISAM: entender el appliance y su gestión',
        detail: 'El appliance se administra por su interfaz web local (https://<appliance> con el usuario admin) para sistema, certificados y clúster, y la operación de acceso corre por la consola y el CLI pdadmin. El acceso SSH administrativo es la ventana de mantenimiento. Como toda infraestructura virtualizada, ISAM se inventaría, parchea y respalda con el mismo rigor del appliance PAM de iam-kb-032: es un servidor más del paisaje, no una caja mágica.',
        command: 'ssh admin@<isam-appliance.nexora.local>'
      },
      {
        title: 'ISAM: publicar apps con WebSEAL y junctions',
        detail: 'WebSEAL es el reverse proxy: cada app interna se publica como junction (una URL del proxy que apunta al backend real), y el SSO se logra con sesiones de WebSEAL que inyectan headers al backend o negocian tokens por junction. La evaluación pide ver el alta de UNA app legacy de punta a punta (junction, ACL, prueba con usuario de laboratorio): es el argumento "proteger sin reescribir la app" — el mismo de IG en ForgeRock (iam-kb-034) y del WebGate de Oracle (iam-kb-037).'
      },
      {
        title: 'ISAM: operar usuarios y ACLs con pdadmin',
        detail: 'La operación de acceso se hace con pdadmin: listar y ver usuarios, adjuntar ACLs a los objetos del espacio WebSEAL y deshabilitar cuentas (user modify account-valid false). Es la contraparte técnica de los cmdlets de AD pero para el árbol de objetos del proxy: en la evaluación se recorre un "quién puede entrar a esta URL" completo, que es la pregunta que la torre IAM hace en cualquier plataforma (iam-kb-019).',
        command: 'pdadmin -a sec_master default'
      },
      {
        title: 'Verify: el directorio cloud y las fuentes',
        detail: 'En Verify la identidad vive en el cloud directory (usuarios, grupos, esquema propio) sincronizado desde fuentes (AD por conector, SCIM, importaciones planas): AD sigue siendo la fuente de los empleados y Verify la réplica de operación. En la demo se pide el flujo de sincronización con la misma disciplina de Entra Connect (iam-kb-042): atributos mapeados, coherencia verificada y el leaver que muere en la nube el mismo día (iam-kb-002).'
      },
      {
        title: 'Verify: sign-on policies por aplicación',
        detail: 'Las sign-on policies de Verify definen el nivel de autenticación por app: factores exigidos (password, TOTP, FIDO2/passkey), condiciones de red y riesgo, y step-up para las críticas — la contraparte del modelo de políticas por app de Okta (iam-kb-026) y de Conditional Access de Entra (iam-kb-017). La evaluación cruza la matriz de apps de Nexora contra las capacidades: qué apps podrían exigir FIDO2 hoy y qué pasa con las legacy que no hablan moderno.',
        command: 'Get-MgUserAuthenticationMethod -UserId ana.torres@nexora.com'
      },
      {
        title: 'Verify: riesgo y factores phishing-resistant',
        detail: 'Verify trae evaluación de riesgo del sign-on (viaje imposible, dispositivo nuevo) y factores resistentes (FIDO2/passkeys): las mismas exigencias del estándar de Nexora (iam-kb-046). En la demo se provoca un sign-on riesgoso con el usuario de laboratorio (salida por VPN exterior, horario extraño) y se observa la respuesta de la política: la conversación no es "tiene MFA" sino "qué factores, con qué riesgo y con qué respuesta automática".',
        command: 'Get-MgAuditLogSignIn -Top 100 | Where-Object RiskLevel -ne "none"'
      },
      {
        title: 'Cerrar la evaluación con la matriz del landscape',
        detail: 'La posición de IBM en la matriz (iam-kb-050): Verify compite con Okta y Entra en el carril SaaS; ISAM compite con ForgeRock y Ping en el carril on-prem (appliance, apps legacy). Con el RFP de Nexora priorizando SaaS e IGA, la pregunta dura es qué resolvería HOY que el stack actual no resuelva, y el costo de sostener appliance on-prem contra la operación SaaS — con números a tres años, no con folletos.',
        command: 'Get-ADGroup -LDAPFilter "(name=NXR-*)" | Measure-Object'
      }
    ],
    verification: 'El analista distingue ISAM (appliance, WebSEAL/junctions, pdadmin) de Verify (SaaS, cloud directory, sign-on policies), la demo publicó una app legacy con junction y probó una sign-on policy con FIDO2, y la matriz del landscape tiene la posición de ambos con costos visibles.',
    escalation: 'Líder de IAM + Arquitectura (appliance on-prem vs. SaaS es decisión de plataforma y de costo de operación a multi-año)',
    relatedTerms: ['IBM Security Verify', 'IBM Security Access Manager (ISAM)', 'Federación (identidad federada)', 'Directivas de acceso condicional', 'PDP y PEP (decisión y aplicación de política)'],
    relatedTickets: ['iam-038', 'iam-034']
  },
  {
    id: 'iam-kb-037',
    title: 'Oracle Access Manager y OIG: WebGate, SSO de enterprise y workflows (evaluación)',
    category: 'IAM - Plataformas IAM',
    environment: 'Plataformas IAM',
    symptoms: 'El ecosistema Oracle del negocio (ERP, bases de datos, Fusion Middleware de la app que tanto duele en los tickets) trae a la evaluación el dúo OAM + OIG: Oracle Access Manager para el SSO de enterprise y Oracle Identity Governance para el aprovisionamiento y los workflows. El equipo necesita ubicar las piezas (WebGate, oamconsole, los jobs de reconciliación) para hablar de igual a igual con el proveedor y con el dueño del ERP.',
    cause: 'No es un fallo sino alfabetización del stack Oracle. OAM: el SSO de enterprise — el WebGate (plugin instalado en el web server frente a las apps) intercepta las peticiones y negocia la sesión contra el OAM Server; la consola (oamconsole) define políticas de acceso por recurso y el registro de agentes. OIG (antes OIM): el IGA de Oracle — catálogo de roles, solicitudes con aprobación, reconciliación con los sistemas de destino y jobs programados. La integración natural es OIG provisionando y OAM autenticando, todo sobre la base del WebLogic.',
    steps: [
      {
        title: 'Entender el flujo del WebGate antes de la consola',
        detail: 'El WebGate es un agente instalado en el web server (OHS, IIS) de CADA app publicada: intercepta la petición, valida o crea la sesión contra el OAM Server (managed server de WebLogic) e inyecta headers al backend. Por eso el "SSO Oracle" se siente distinto al SaaS: publicar una app nueva es instalar o reutilizar un WebGate. En la evaluación se pide el diagrama de qué WebGates existirían para las apps internas de Nexora: el mismo mapa que se exige a IG y WebSEAL (iam-kb-034/036).'
      },
      {
        title: 'Registrar el WebGate con RREG',
        detail: 'El registro del agente se hace con la herramienta RREG (Remote Registration) del OAM: se llena la solicitud XML (host, puerto, agente, nivel de sesión) y RREG genera el paquete de configuración que se despliega en el web server. Es el alta técnica del "agente", con artefactos de configuración como evidencia en el ticket — la misma disciplina del alta de una enterprise app en Entra o un SP en PingFederate (iam-kb-047).',
        command: '$ORACLE_HOME/oam/server/rreg/bin/RREG.sh -m inBand <solicitud-webgate.xml>'
      },
      {
        title: 'Operar las políticas en la oamconsole',
        detail: 'La consola de OAM (http://oam.nexora.local:14000/oamconsole) define los dominios de política y los recursos protegidos: qué recursos de qué hosts se protegen, con qué nivel de autenticación y para qué población. Es la respuesta a la pregunta que la torre IAM hace en cualquier plataforma: ¿dónde se responde "quién entra a esta URL y con qué factor"? (iam-kb-019). Los cambios de política con justificación y exclusiones documentadas: la misma disciplina de iam-kb-017.',
        command: 'curl -s -o /dev/null -w "%{http_code}\\n" "http://oam.nexora.local:14000/oamconsole"'
      },
      {
        title: 'OIG: el ciclo solicitud → aprobación → provisioning',
        detail: 'OIG es el IGA: catálogo de roles y accesos por sistema conectado (application instances), solicitudes de acceso con flujos de aprobación configurables (aprobador por rol o sistema, escalaciones) y provisioning hacia los conectores. Es la contraparte conceptual de iam-kb-043 (granting) en plataforma Oracle: la matriz de roles de Nexora se modela como catálogo y las aprobaciones four-eyes quedan en el flujo, no en el correo.',
        command: 'curl -s -o /dev/null -w "%{http_code}\\n" "http://oig.nexora.local:7001/em"'
      },
      {
        title: 'OIG: reconciliación programada (los scheduled jobs)',
        detail: 'La verdad de OIG contra los sistemas reales la mantienen los jobs de reconciliación programados desde Enterprise Manager (Scheduler): traen cuentas y membrecías de vuelta a OIG, detectan cuentas huérfanas (sin identidad) y alimentan las certificaciones. En la evaluación se pide el estado de los jobs de recon de AD y ERP con una muestra real anonimizada: el mismo chequeo de calidad de datos del RFP de iam-kb-029/030, porque un IGA que reconcilia mal certifica mentiras.',
        command: 'Get-ADUser -LDAPFilter "(sAMAccountName=svc-*)" -Properties Description | Export-Csv C:\\Temp\\oig-recon.csv'
      },
      {
        title: 'Preguntar el costo real del ecosistema WebLogic',
        detail: 'El stack Oracle corre sobre WebLogic y sus bases: parcheo trimestral de Oracle, dominios administrados, alta disponibilidad, licenciamiento por componente y el know-how de un ecosistema que en el mercado local es escaso. La ventaja argumentada es la integración nativa con el ERP Oracle del negocio; el costo es operar middleware de enterprise para identidad. Ambos extremos van a la matriz de decisión con números (iam-kb-050).'
      },
      {
        title: 'Definir qué se exigiría en el PoC',
        detail: 'Mínimo para el PoC de OAM + OIG: publicar una app interna con WebGate (SSO completo con el usuario de laboratorio), una solicitud de rol aprobada por el dueño real, un job de recon mostrando cuentas huérfanas detectadas y corregidas, y la evidencia exportable de todo — que es exactamente lo que la campaña de iam-kb-048 va a necesitar al certificar. Sin PoC con datos propios, la promesa de integración Oracle queda en folleto.',
        command: 'Get-ADPrincipalGroupMembership ana.torres | Select-Object Name | Export-Csv C:\\Temp\\oig-poc.csv'
      }
    ],
    verification: 'El equipo explica el flujo WebGate → OAM Server → backend con un diagrama propio, ubica la oamconsole y los jobs de recon de OIG, y la matriz de evaluación registra ventajas (integración Oracle nativa) y costos (middleware, know-how) con evidencia del PoC.',
    escalation: 'Líder de IAM + dueño del ERP (la integración con el ecosistema Oracle del negocio la valida el dueño del sistema: el equipo IAM evalúa la plataforma, no la funcionalidad del ERP)',
    relatedTerms: ['Oracle Access Manager (OAM)', 'Oracle Identity Governance (OIG)', 'WebGate (OAM)', 'Identity Governance & Administration (IGA)', 'Flujo de aprobación'],
    relatedTickets: ['iam-027', 'iam-029']
  },
  {
    id: 'iam-kb-038',
    title: 'PAM comparativo: vaulting vs. passthrough vs. JIT (CyberArk, BeyondTrust, Safeguard)',
    category: 'IAM - Roles & Privilegios',
    environment: 'PAM / Privilegios',
    symptoms: 'No es un ticket sino una decisión de plataforma: elegir (o re-elegir) la herramienta PAM de Nexora. El equipo opera hoy la bóveda Safeguard (iam-kb-032) para las cuentas privilegiadas, y el roadmap (recortar los administradores de dominio de plantilla a tres y mover el resto a elevación JIT, iam-023) exige decidir capacidades: bóveda de credenciales, sesiones grabadas, elevación en el endpoint y secretos de integraciones. Los síntomas de elegir mal: herramienta que solo guarda contraseñas (y el resto del privilegio se sigue administrando "a mano") o suite gigante que nadie sabe operar.',
    cause: 'No es un fallo sino el panorama de los TRES modelos de PAM. Vaulting: la bóveda custodia la credencial, la presta (checkout) y la rota — el activo sigue autenticando con su credencial original. Passthrough/proxy: el usuario nunca ve la credencial (el bastión la inyecta en la sesión). JIT: sin bóveda previa — el privilegio se ELEVA temporalmente (grupo o rol local por ventana, con aprobación) y desaparece. Las suites combinan modelos; el error clásico es pagar por la suite y usar solo el vaulting de contraseñas, dejando sesiones, endpoints e integraciones sin cubrir.',
    steps: [
      {
        title: 'Inventariar el privilegio real antes de comparar folletos',
        detail: 'Las cifras de Nexora que dimensionan el problema: cuentas admin de dominio (recortadas a tres, iam-023), administradores locales de servidores y estaciones, cuentas de servicio e integraciones (iam-kb-039), sesiones interactivas a infraestructura (firewall, hipervisor, core) y accesos de proveedores externos. Cada población con su volumen: la herramienta se dimensiona por usuarios gestionados Y activos, y el folleto solo muestra el mejor caso.',
        command: 'Get-ADGroupMember "Domain Admins" -Recursive | Select-Object Name,SamAccountName | Export-Csv C:\\Temp\\pam-poblaciones.csv'
      },
      {
        title: 'Dominar los tres modelos y exigir demo de cada uno',
        detail: 'Vaulting: checkout y rotación (iam-kb-032). Passthrough: sesión por bastión con inyección de credencial (el usuario se autentica al bastión y jamás ve la contraseña del activo). JIT: elevación temporal en el endpoint (miembro del grupo local de admins por dos horas, con MFA y ticket que la ampare). En la demo, cada modelo con un caso real de Nexora: el checkout del ERP (iam-017) para vaulting, la sesión al firewall (iam-021) para passthrough, la elevación de un técnico de soporte para JIT.',
        command: 'Get-ADUser -LDAPFilter "(sAMAccountName=svc-*)" -Properties Description | Export-Csv C:\\Temp\\pam-integraciones.csv'
      },
      {
        title: 'Comparar las suites en su core, no en el marketing',
        detail: 'CyberArk: la suite más completa del mercado (bóveda/PVWA, PSM para sesiones, EPM para endpoints, secretos para DevOps); contra: complejidad de implementación y operación. BeyondTrust: Password Safe y Remote Support con foco en la sesión de soporte y en el acceso de proveedores; fuerte en experiencia de uso. One Identity Safeguard: appliance de bóveda y sesiones (SPP/SPS, iam-kb-032) con operación por políticas de activo y clúster; la integración con la suite de gobierno del mismo vendor pesa en la decisión. La tabla compara por capacidad REQUERIDA para las poblaciones de Nexora, no por cantidad de features.',
        command: 'Get-ADComputer -Filter * -Properties OperatingSystem | Group-Object OperatingSystem | Sort-Object Count -Descending'
      },
      {
        title: 'Evaluar la elevación en endpoints (EPM) para el roadmap JIT',
        detail: 'El roadmap JIT (iam-023) no se resuelve solo con bóveda: los administradores locales de estaciones se retiran elevando por necesidad (el técnico es admin local SOLO durante la tarea y solo sobre la aplicación que la necesita). Se evalúa el módulo de elevación de endpoints de cada suite con una prueba real: un técnico de soporte instalando software sin ser admin permanente, con el registro de la elevación en el reporte de auditoría.',
        command: 'Get-ADComputer -Filter * | Measure-Object'
      },
      {
        title: 'Exigir integración con la operación existente',
        detail: 'La herramienta PAM no puede ser una isla: aprobaciones de checkout contra ServiceNow (iam-kb-043), export de checkouts y sesiones al SIEM para las reglas de la torre (iam-kb-019), discovery de cuentas nuevas (iam-kb-039), y API para los reportes de auditoría del trimestre (iam-047). Se pregunta por cada integración con nombre propio: las demostraciones genéricas esconden el trabajo manual del día 2, y el día 2 es donde viven los años de la herramienta.',
        command: 'Get-MgAuditLogDirectoryAudit -Top 500 | Group-Object ActivityDisplayName | Sort-Object Count -Descending'
      },
      {
        title: 'Piloto con métricas y decisión por comité',
        detail: 'PoC de 30 días con las poblaciones más dolorosas (admins restantes, cuentas de servicio críticas, proveedores externos): métricas de adopción (% de accesos privilegiados que pasan por la herramienta), tiempo de checkout aprobado, sesiones grabadas vs. sesiones directas, y costo total (licenciamiento por usuario gestionado/activo + horas de implementación + operación). La firma de la decisión es del comité (Seguridad + IT + Procurement): el equipo aporta la matriz técnica (iam-kb-050).',
        command: 'Get-ADGroupMember NXR-ADM-PLATAFORMA -Recursive | Measure-Object'
      }
    ],
    verification: 'La matriz comparativa cubre los tres modelos contra las poblaciones reales de privilegio de Nexora, el PoC midió adopción y costo con datos propios, y la decisión documentada señala qué poblaciones quedan en bóveda, cuáles por bastión y cuáles en JIT.',
    escalation: 'Líder de IAM + Seguridad + Procurement (decisión de plataforma PAM: inversión multi-año con firma del comité)',
    relatedTerms: ['PAM', 'CyberArk', 'BeyondTrust', 'One Identity Safeguard', 'Aprovisionamiento just-in-time (JIT)', 'Zero Standing Privileges (ZSP)'],
    relatedTickets: ['iam-021', 'iam-023']
  },
  {
    id: 'iam-kb-039',
    title: 'PAM: cuentas de servicio en la bóveda (discovery, rotación y checkouts por API)',
    category: 'IAM - Roles & Privilegios',
    environment: 'PAM / Privilegios',
    symptoms: 'Las cuentas de servicio son la mayoría de las credenciales del paisaje y las más frágiles: contraseñas que nadie rota "porque la integración se puede caer" (iam-035), credenciales embebidas en scripts que ninguna bóveda custodia, o la rotación trimestral de las 14 cuentas (iam-020) convertida en un fin de semana de miedo. Este artículo es la operación de bóveda para cuentas NO humanas: discovery, import por oleadas, rotación programada y entrega por API a las integraciones.',
    cause: 'Las cuentas de servicio acumulan riesgo por diseño: credencial de larga vida, dueño difuso (el que la creó ya se fue) y uso por procesos. El fallo operacional clásico: meterlas a la bóveda "para guardarlas" pero dejar que los procesos sigan con la contraseña en texto plano (la bóveda queda de museo), o rotar sin ventana coordinada (la integración cae y el rollback es desastre). El modelo correcto: la bóveda custodia, rota por calendario y entrega por API a los procesos autorizados.',
    steps: [
      {
        title: 'Discovery: construir el inventario real, no el supuesto',
        detail: 'Fuentes cruzadas: los prefijos svc- del dominio (iam-kb-011), el CMDB de ServiceNow, los dueños de aplicación (owner documentado) y el discovery de la propia plataforma PAM que detecta cuentas locales de servidores. El inventario vive en el CMDB con owner, sistema y criticidad: la bóveda es el destino del inventario, no su origen — descubrir desde la bóveda sola repite el error de inventariar sobre lo que ya se conoce.',
        command: 'Get-ADUser -LDAPFilter "(sAMAccountName=svc-*)" -Properties Description,LastLogonDate | Export-Csv C:\\Temp\\svc-inventario.csv'
      },
      {
        title: 'Importar por oleadas con dueño firmado',
        detail: 'Cada cuenta entra a la bóveda (iam-kb-032) con: activo (servidor o app), dueño (application owner), política de rotación y clasificación de uso (solo humano por checkout, solo proceso por API, ambas). La importación es por oleadas empezando por las críticas (las del cierre contable, las del firewall): importar cientos de cuentas de golpe sin dueño repite en la bóveda el problema de los grupos sin dueño (iam-026).',
        command: 'curl -sk -H "Authorization: Bearer ${SG_TOKEN}" "https://<appliance>/service/core/v2/Assets/<assetId>/Accounts"'
      },
      {
        title: 'Rotar por calendario con ventana coordinada',
        detail: 'La rotación programada (30/90/180 días según criticidad) se coordina con el dueño de la app en ventana de cambio: la bóveda cambia la credencial en el activo (por conector o script de cambio) y los consumidores autorizados la reciben de la bóveda, no del texto plano. La rotación de las 14 cuentas (iam-020) se ejecuta UNA a la vez con verificación de la integración antes de pasar a la siguiente: nunca en batch ciego.',
        command: 'Invoke-SafeguardMethod -Service Core -Method Get -RelativeUrl "Accounts"'
      },
      {
        title: 'Entregar credenciales a los procesos por API, no por texto',
        detail: 'Las integraciones (jobs, scripts, pipelines) que NECESITAN la credencial la piden a la bóveda por API en tiempo de uso: autenticación de la propia integración (certificado o token dedicado), entrega de la credencial vigente, y registro del acceso. Es el paso que convierte la bóveda en gestión de secretos de verdad: la alternativa — el archivo de configuración con la contraseña — es exactamente el hueco que se quiere cerrar.',
        command: 'curl -sk -H "Authorization: Bearer ${SG_TOKEN}" "https://<appliance>/service/core/v2/Accounts/<id>/Password"'
      },
      {
        title: 'Migrar las credenciales embebidas que se van encontrando',
        detail: 'Cada credencial hallada en script o config (auditoría de repos, carpetas de deploy, tareas programadas) genera el mismo micro-proyecto: identificar el proceso que la usa, coordinar ventana, mover el consumo a la API de la bóveda (o a gMSA si el caso lo permite, iam-kb-011) y rotar. El backlog de embebidas se reporta en la revisión mensual (iam-kb-019): cada una cerrada es un vector menos.',
        command: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4624} -MaxEvents 200 | Where-Object Message -like "*svc-*"'
      },
      {
        title: 'Monitorear uso y detectar deriva',
        detail: 'La bóveda sabe cuándo se entregó cada credencial y a quién: el patrón esperado de una cuenta de servicio es uso por la API autorizada en los horarios del job. Las alertas: credencial consultada a mano en horario raro, checkout humano en cuenta marcada solo-proceso, o la cuenta autenticando por FUERA de la bóveda (el login directo del firewall de iam-021): esas señales alimentan al SOC y a la revisión de sesiones privilegiadas (iam-022).',
        command: 'Search-ADAccount -AccountInactive -TimeSpan 90.00:00:00 | Where-Object SamAccountName -like "svc-*"'
      },
      {
        title: 'Recertificar cada trimestre',
        detail: 'El barrido trimestral (iam-048) pregunta por cada cuenta de la bóveda: ¿sigue viva la integración?, ¿el dueño confirma?, ¿la rotación se ejecutó? Las cuentas sin uso (la integración murió) se deshabilitan con el dueño, no se dejan "por si acaso": la bóveda llena de cuentas muertas es el inventario sucio que la próxima auditoría cobra con intereses.',
        command: 'Get-ADServiceAccount -Filter * | Select-Object Name,LastLogonDate | Export-Csv C:\\Temp\\svc-recertificacion.csv'
      }
    ],
    verification: 'El inventario del CMDB coincide con las cuentas en bóveda (owner y política de rotación por cuenta), ninguna integración crítica sigue con credencial en texto, las rotaciones del periodo se ejecutaron en ventana con verificación una a una, y el monitoreo no arroja usos fuera de patrón.',
    escalation: 'Líder de IAM + dueño de la aplicación (rotación de cuentas que sostienen integraciones: ventana de cambio obligatoria del dueño, no decisión del analista)',
    relatedTerms: ['Gobernanza de cuentas de servicio', 'Rotación de contraseñas', 'Bóveda de credenciales (credential vaulting)', 'Descubrimiento de cuentas privilegiadas', 'Identidades no humanas (NHI)', 'Service account'],
    relatedTickets: ['iam-020', 'iam-035', 'iam-048']
  },
  {
    id: 'iam-kb-040',
    title: 'Diseño de un modelo de roles (RBAC): metodología top-down, bottom-up e híbrido',
    category: 'IAM - Roles & Privilegios',
    environment: 'Gobernanza',
    symptoms: 'iam-kb-009 define QUÉ es la matriz de roles; este artículo es el CÓMO del proyecto de diseño: llega la reorganización (los 40 grupos sin dueño de iam-026), el auditor exige que cada acceso se explique por rol (iam-027), o el IGA evaluado pide el modelo como insumo (iam-kb-031). Los síntomas de un diseño a la deriva: roles que son "las personas de Ana", matrices que nadie actualiza desde la v1, y cada acceso nuevo naciendo como excepción porque el modelo no absorbe el caso.',
    cause: 'No es un fallo sino un proyecto de ingeniería de roles (role engineering). Top-down: el diseño baja de la función de negocio (organigrama, entrevistas, descripciones de cargo) — coherente pero lento y de papel si nadie valida contra la realidad. Bottom-up: sube del uso real (membresías actuales, patrones comunes) — realista pero santifica la basura acumulada. Híbrido (el estándar): la función define el esqueleto, el uso real lo corrige, y el taller con dueños arbitra las diferencias con acta.',
    steps: [
      {
        title: 'Definir alcance y jerarquía del modelo antes de empezar',
        detail: 'La jerarquía de roles de Nexora en capas: birthright (todo empleado, por atributo de RRHH), roles funcionales (por puesto: analista, aprobador), roles especializados (por sistema dominante: SAP-FI, ERP de compras) y roles privilegiados (administración, con ciclo de vida PAM aparte, iam-kb-012). El alcance del proyecto se declara: primero los sistemas que concentran el 80% de los tickets, no los 40 que nadie usa.',
        command: 'Get-ADGroup -LDAPFilter "(name=NXR-*)" | Measure-Object'
      },
      {
        title: 'Top-down: extraer los roles de la función de negocio',
        detail: 'Entrevistas estructuradas por área con el dueño del negocio: qué hace cada puesto, con qué sistemas, en qué nivel (leer/escribir/aprobar/administrar). El output son funciones candidatas a rol con su dueño (role owner). La trampa a evitar: las descripciones de cargo desactualizadas — el entrevistado describe el trabajo REAL, el documento solo orienta (la lección de la reorganización de iam-026).',
        command: 'Get-ADUser -LDAPFilter "(department=*)" -Properties Title,Department | Select-Object Title,Department -Unique | Export-Csv C:\\Temp\\roles-funciones.csv'
      },
      {
        title: 'Bottom-up: minar los patrones reales de acceso',
        detail: 'Exportar memberships por usuario y por grupo (la materia prima de iam-kb-009) y buscar patrones: conjuntos de grupos que aparecen juntos en muchas personas del mismo puesto. Herramientas: el role mining del IGA evaluado (iam-kb-031) o el cruce manual con CSV para el alcance inicial. Cada patrón se rotula: ¿a qué función corresponde? Los patrones sin función son deuda histórica detectada, y candidata a revocación por campaña (iam-kb-048).',
        command: 'Get-ADGroup -Filter * -Properties Member | Select-Object Name,Member | Export-Csv C:\\Temp\\roles-mining.csv'
      },
      {
        title: 'El taller de arbitraje: donde el modelo nace de verdad',
        detail: 'Taller por área con el dueño del negocio y el del sistema: por cada rol candidato, top-down contra bottom-up, y las diferencias se deciden en la reunión y quedan en acta — el acceso X entra al rol, se revoca, o es excepción temporal con vencimiento. Sin acta firmada por rol, el modelo es una opinión. Cada rol sale del taller con: nombre, dueño, entitlements y nivel SoD analizado (iam-kb-049).',
        command: 'Compare-Object (Import-Csv C:\\Temp\\roles-funciones.csv) (Import-Csv C:\\Temp\\roles-mining.csv) -Property Name | Export-Csv C:\\Temp\\roles-diferencias.csv'
      },
      {
        title: 'Nombrar, versionar y publicar la matriz',
        detail: 'Convención NXR-ROL-<puesto>-<nivel> espejo de los grupos (iam-kb-024), versionado de la matriz (la v1 imperfecta publicada gana a la v1 perfecta que nunca sale), y publicación con dueños firmados. La matriz es un documento VIVO con cambio controlado: cada reorganización o sistema nuevo dispara revisión de impacto — la matriz que no se toca desde la v1 es el síntoma de que murió.',
        command: 'New-ADGroup -Name "NXR-ROL-COMPRAS-APROBADOR" -SamAccountName NXR-ROL-COMPRAS-APROBADOR -GroupScope Global -GroupCategory Security -Description "Rol aprobador de compras - owner: Finanzas - matriz v4.0"'
      },
      {
        title: 'Migrar por oleadas y mantener el drift bajo control',
        detail: 'Implementación por oleadas (un área a la vez, diff antes/después como en iam-kb-003) con ventanas pactadas: la gente NO pierde acceso necesario un lunes. Mantenimiento: revisión de la matriz en cada access review trimestral (iam-kb-014, iam-kb-048), role mining anual contra el uso real (iam-kb-031), y KPIs del modelo: % de accesos otorgados por rol, % de excepciones activas y tiempo de onboarding por rol — la caída de solicitudes manuales es la señal del éxito.',
        command: 'Get-ADGroupMember NXR-ROL-COMPRAS-APROBADOR -Recursive | Export-Csv C:\\Temp\\rol-migracion.csv'
      }
    ],
    verification: 'Cada rol de la matriz v4 tiene dueño firmado, entitlements validados contra uso real, chequeo SoD pasado y acta del taller; una cuenta de prueba del rol accede a lo suyo y a NADA de otros roles; el KPI de accesos por rol sube trimestre a trimestre.',
    escalation: 'Líder de IAM + dueños del negocio (las diferencias top-down/bottom-up que no se arbitran en el taller suben con la recomendación del equipo: la decisión es del dueño del riesgo)',
    relatedTerms: ['Role-Based Access Control (RBAC)', 'Role model (modelo de roles)', 'Matriz de roles', 'Role mining / Role engineering', 'Dueño de rol (role owner)', 'Entitlement creep'],
    relatedTickets: ['iam-009', 'iam-026']
  },
  {
    id: 'iam-kb-041',
    title: 'Directory services: LDAP profundo para IAM (bind, DN, filtros, LDAPS y GC)',
    category: 'IAM - Active Directory',
    environment: 'Active Directory',
    symptoms: 'El trabajo IAM depende de LDAP más de lo que parece: la app que autentica contra AD con un bind raro que falla (iam-016: la cuenta bloqueada cada mañana a las 8:05), el conector del IGA o del RADIUS que pide un "filtro LDAP exacto", la app que solo funciona por 636 y nadie sabe si el certificado del DC está vigente, o el reporte que pide búsquedas en el Global Catalog y el equipo no distingue el 3268 del 389. Este artículo es el conocimiento de directorio que sostiene todos los demás.',
    cause: 'No es un fallo sino el modelo técnico del directorio. LDAP es el protocolo de consulta: un árbol (DIT) de entradas identificadas por DN, cada una con atributos y objectClass, consultado con filtros y servido en puertos concretos (389 LDAP, 636 LDAPS, 3268/3269 Global Catalog). Los errores nacen de: bind con usuario mal formado o sin permisos de lectura, filtros inexactos (o que piden al GC lo que solo vive en una partición), y LDAPS con certificado vencido o sin el nombre del DC en el SAN.',
    steps: [
      {
        title: 'Dominar el DN: la dirección exacta de un objeto',
        detail: 'Cada objeto tiene un DN único y jerárquico que se lee de lo específico a lo general: CN=Ana Torres,OU=Empleados,OU=Nexora,DC=nexora,DC=local. El DN es la dirección en el bind y en los SearchBase: un OU movido rompe los DN embebidos en configuraciones (la lección de la reorganización de iam-026: apps con DN quemado dejaron de autenticar). Regla de operación: las apps referencian identidades por atributo estable (sAMAccountName) y las configs con DN se revisan en cada reorganización.',
        command: 'Get-ADUser -Identity ana.torres -Properties DistinguishedName'
      },
      {
        title: 'Entender el bind y diagnosticarlo',
        detail: 'Bind = autenticar la conexión al directorio: simple (DN + contraseña) en 389 o sobre TLS en 636. Los fallos clásicos: cuenta de bind bloqueada por contraseña vencida (exactamente el 4740 de iam-kb-007 con el Caller siendo el servidor de la app), DN mal formado (CN y OU invertidos), o permisos de lectura insuficientes para el filtro que la app usa. La cuenta de bind es una cuenta de servicio más (iam-kb-011): dueño, bóveda y monitoreo de bloqueos.',
        command: "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4740} -MaxEvents 10"
      },
      {
        title: 'Escribir filtros LDAP exactos',
        detail: 'La gramática que toda app y conector pide: (sAMAccountName=ana.torres) simple; (&(objectClass=user)(department=Compras)) AND; (|(sAMAccountName=a*)(employeeID=44*)) OR; (!(userAccountControl:1.2.840.113556.1.4.803:=2)) NOT con regla bit (cuentas NO deshabilitadas — la regla del barrido de iam-021). Los fallos: paréntesis sin cerrar, atributos que no existen en el esquema y filtros sobre atributos no indexados que castigan al DC.',
        command: 'Get-ADUser -LDAPFilter "(&(objectClass=user)(department=Compras))" | Measure-Object'
      },
      {
        title: 'ldp.exe: el navegador del directorio',
        detail: 'Herramienta gráfica de los RSAT (ldp.exe): Connection → Connect (puerto 389 o 636 con SSL), Bind (DN de la cuenta de servicio), View → Tree, y búsquedas con Browse → Search (base, filtro, scope: base/onelevel/subtree). Es el "wireshark del LDAP": toda app que "no autentica contra AD" se diagnostica reproduciendo SU bind y SU filtro en ldp antes de tocar la app — el error que ldp devuelve es el mismo que la app está tragando en silencio.',
        command: 'ldp.exe'
      },
      {
        title: 'LDAPS (636): certificados y orden de falla',
        detail: 'El DC sirve LDAP sobre TLS (636) con el certificado del dominio: si la app exige LDAPS, el certificado del DC debe estar vigente y con el nombre del DC en Subject o SAN. Diagnóstico en orden: puerto abierto, handshake TLS, certificado confiable para el RUNTIME de la app (no para el navegador), bind correcto. La mitad de los "problemas de LDAPS" son certificados que el navegador acepta y el runtime no, o viceversa.',
        command: 'Test-NetConnection dc01.nexora.local -Port 636'
      },
      {
        title: 'Global Catalog: el índice del bosque (3268/3269)',
        detail: 'El GC (puerto 3268, 3269 con SSL) sirve búsquedas de TODO el bosque con los atributos parciales más usados: útil para apps multdominio y para resolver "¿existe esta persona en el bosque?" sin consultar dominio por dominio. La regla: lo que no está en el catálogo parcial (atributos no replicados al GC) NO se puede pedir por 3268 — se consulta al dominio dueño por 389/636. Ajustar los atributos replicados al GC cuando una app del bosque los necesite.',
        command: 'nltest /dsgetdc:nexora.local'
      },
      {
        title: 'Operar con las herramientas de siempre, pero conscientes del directorio',
        detail: 'El módulo AD de PowerShell es LDAP con esteroides: -LDAPFilter existe en Get-AD* y se usa para probar EL filtro que la app usará; [adsisearcher] es el LDAP nativo de .NET sin módulos; dsquery sigue vivo en los DC. La disciplina de cierre: cada app federada y conector del paisaje queda documentada con su bind DN, SearchBase y filtro exacto en el inventario de apps (iam-kb-020) — así la próxima reorganización no sorprende.',
        command: '[adsisearcher]"(sAMAccountName=ana.torres)"'
      }
    ],
    verification: 'El bind y el filtro de cada app crítica se reproducen exitosamente en ldp.exe contra 389 y 636, el certificado LDAPS del DC está vigente con el nombre correcto, y el inventario documenta bind DN, SearchBase y filtro de cada app que consulta el directorio.',
    escalation: 'Infra y Ops (salud del directorio: índices, carga de consultas, certificados de los DC) / Dueño de la aplicación (bind y filtros del lado de la app)',
    relatedTerms: ['LDAP', 'LDAPS', 'Bind DN', 'Distinguished Name (DN)', 'Catálogo global (Global Catalog)', 'Filtro de búsqueda LDAP'],
    relatedTickets: ['iam-016', 'iam-012']
  },
  {
    id: 'iam-kb-042',
    title: 'AD híbrido: sync rules de Entra Connect, PTA vs. PHS vs. federación y Seamless SSO',
    category: 'IAM - Entra ID / M365',
    environment: 'Entra ID / M365',
    symptoms: 'La identidad de Nexora es híbrida y el puente es srv-connect (iam-kb-018); los temas que suben al nivel de arquitectura: la cuenta de una OU nueva no llega a M365 (reglas de sincronización y filtrado), la pregunta de si migrar de PHS a PTA o volver a federar (tras el incidente del proxy de ADFS, iam-036), la app que pide "seamless SSO" para no pedir contraseña en la red corporativa, o el writeback del SSPR que dejó de funcionar (iam-032). Este artículo es la capa de DISEÑO del híbrido debajo de la operación diaria del conector.',
    cause: 'No es un fallo sino la elección de topología. Tres modelos de autenticación: PHS (password hash sync: el hash viaja a Entra y la nube valida; señal de credencial filtrada gratis), PTA (pass-through: agentes on-prem validan contra AD en tiempo real), federación (ADFS o Ping emite el login y Entra confía). Nexora opera PHS con Entra Connect: la simplicidad y la resiliencia (la nube funciona aunque el enlace on-prem caiga) ganaron sobre la complejidad del proxy. Las sync rules son las reglas de transformación del metaverso, y tocarlas sin método es la fuente del 80% de los problemas crónicos del híbrido.',
    steps: [
      {
        title: 'Conocer las tres topologías y por qué Nexora usa PHS',
        detail: 'PHS: la nube valida el hash sincronizado (el usuario entra aunque srv-connect esté caído) y da la señal de credencial filtrada para Identity Protection (iam-kb-023). PTA: valida contra AD en vivo (la contraseña no viaja como hash, PERO los agentes on-prem son dependencia del login cloud). Federación: el IdP on-prem manda — control máximo, riesgo operativo máximo (el proxy caído de iam-036 es la clase de falla). La revisión anual de topología responde por escrito: ¿qué gana el negocio por el costo de operación extra? La respuesta vigente de Nexora: PHS + Conditional Access.',
        command: 'Set-ADSyncPasswordHashSyncConfiguration -Enabled $true'
      },
      {
        title: 'Leer las sync rules antes de tocarlas',
        detail: 'Synchronization Service Manager → Rules: cada regla (Inbound: AD → metaverso; Outbound: metaverso → Entra) tiene dirección, scoping filter (a qué objetos aplica), join rules (cómo se une al metaverso) y transformations (flujo de atributos, con precedencia cuando varias reglas escriben el mismo atributo). Las reglas out-of-the-box NO SE EDITAN: se deshabilitan creando una copia con precedencia más baja y el cambio documentado — editar la original es sembrar la próxima actualización del conector con sorpresas.',
        command: 'Get-ADSyncRule -Direction Inbound | Sort-Object Precedence | Select-Object Name,Precedence | Format-Table'
      },
      {
        title: 'Cambiar el flujo de un atributo con método',
        detail: 'El caso típico: un atributo nuevo del dominio debe llegar a Entra, o un atributo se debe calcular. El método: crear regla nueva (precedencia después de la OOB, flujo directo o expresión), probar con uno o dos objetos (Preview del conector con el objeto seleccionado) y full sync del conector solo cuando el delta no alcanza (iam-kb-018). Cada regla personalizada queda documentada en el inventario del conector con su motivo y su dueño: la arqueología de "¿por qué este atributo llega así?" es el costo de no hacerlo.',
        command: 'Get-ADSyncRule -Direction Inbound | Where-Object Name -like "*nexora*" | Format-List'
      },
      {
        title: 'Ajustar el filtrado con conciencia del alcance',
        detail: 'Domain y OU filtering: qué OUs se sincronizan (las de empleados sí, la de laboratorio no). El error clásico: filtrar una OU y olvidar que el grupo de licencias o el rol la referencian (iam-kb-001, iam-kb-010), o des-filtrar en producción sin revisar qué objetos vienen encima. El cambio de filtrado es un cambio formal con inventario de objetos afectados ANTES de aplicarlo, no una marca en el wizard "para ver qué pasa".',
        command: 'Get-ADSyncScheduler | Select-Object SyncCycleEnabled,ScheduledSyncInterval'
      },
      {
        title: 'Operar el Seamless SSO como complemento, no como autenticación',
        detail: 'Con PHS o PTA, el Seamless SSO (ticket de Kerberos contra la cuenta de equipo AZUREADSSOACC) evita la petición de contraseña en la red corporativa: el usuario escribe su correo y el dominio lo autentica solo. La cuenta AZUREADSSOACC es infraestructura de identidad: moverla de OU rompe los SPN y con ellos el SSO silencioso. La nota honesta del roadmap: el mecanismo va cediendo terreno a Windows Hello for Business y a los tokens de dispositivo (iam-kb-046): mantenerlo documentado, pero no invertir más de lo que vale.',
        command: 'Get-ADComputer -Identity AZUREADSSOACC -Properties Description'
      },
      {
        title: 'Verificar la postura híbrida del usuario y del equipo',
        detail: 'El estado híbrido se comprueba con dsregcmd /status: el usuario sincronizado (UPN con sufijo verificado, iam-kb-018), el equipo hybrid joined (para las políticas de device compliance, iam-kb-017) y el PHS efectivo (el login de la nube responde con la contraseña de AD). La triada usuario/equipo/sync es el checklist de "¿por qué este usuario no funciona en la nube?" — en ese orden, antes de abrir tickets paralelos.',
        command: 'dsregcmd /status'
      },
      {
        title: 'Revisar la topología anualmente, no solo cuando duele',
        detail: 'La revisión anual de arquitectura híbrida: ¿sigue siendo PHS la respuesta?, ¿el staging server del conector existe y está actualizado?, ¿el ADFS herido de iam-036 todavía tiene razón de existir o se retira?, ¿qué poblaciones (terceros, clientes) deberían salir de AD hacia identidades cloud-only? La arquitectura híbrida es un estado de transición, no una capital permanente: la revisión documentada evita pagar deuda que nadie recuerda haber contraído (iam-kb-050).',
        command: 'Get-WinEvent -LogName "Directory Synchronization" -MaxEvents 20'
      }
    ],
    verification: 'Las reglas personalizadas del conector están documentadas (precedencia, motivo, dueño) y ninguna regla out-of-the-box quedó editada, el estado híbrido de un usuario de prueba es correcto (sincronizado, PHS verificable, seamless SSO en la red corporativa), y la decisión de topología quedó documentada con fecha de la última revisión.',
    escalation: 'Líder de IAM + Infra y Ops (cambios de topología de autenticación o del filtrado del conector: cambio formal con ventana y plan de rollback)',
    relatedTerms: ['Entra Connect (antes Azure AD Connect)', 'Sincronización de hash de contraseñas (PHS)', 'Pass-through Authentication (PTA)', 'Seamless SSO', 'AD FS (Active Directory Federation Services)', 'Identidad híbrida'],
    relatedTickets: ['iam-031', 'iam-032']
  },
  {
    id: 'iam-kb-043',
    title: 'Proceso de concesión de privilegios (granting): de la solicitud a la evidencia',
    category: 'IAM - Gobernanza & Auditoría',
    environment: 'Gobernanza',
    symptoms: 'Llega la solicitud de acceso ("meta a X al grupo del ERP", iam-009) y el proceso de concesión es lo que separa al equipo maduro del equipo que "hace caso". Los síntomas del proceso flojo: concesiones sin aprobación rastreable (el "me lo pidió el jefe por chat"), accesos temporales que nunca caducan (la auditora externa de iam-013), excepciones acumuladas que nadie cerró — o al revés: la cola de aprobación tan lenta que la gente arma workarounds (las 130 aprobaciones fuera de SLA de iam-029).',
    cause: 'No es un fallo sino el control preventivo central. La concesión correcta es una cadena: solicitud formal → validación contra el modelo (¿rol de la matriz o excepción?) → aprobación por quien corresponde (dueño del acceso, four-eyes en privilegiado) → chequeo SoD preventivo → provisioning → verificación de uso → evidencia. Los eslabones que se saltan se pagan en la access review (iam-kb-014): cada acceso sin cadena aparece meses después como "¿quién autorizó esto?" (iam-027).',
    steps: [
      {
        title: 'Exigir la solicitud formal por canal único',
        detail: 'ServiceNow es el canal único (iam-kb-024): ítem de catálogo de solicitud de acceso con solicitante, beneficiario, sistema o grupo, justificación y duración. Lo que llega por chat o correo no se ejecuta: se invita a formalizar (la regla de iam-kb-001 aplicada a accesos). El catálogo se construye sobre la matriz de roles (iam-kb-009): los accesos frecuentes existen como ítems con su flujo, y la excepción es un ítem distinto, no un parche.',
        command: 'Get-ADGroup -Identity NXR-SAP-FI-ESCRITURA -Properties Description,ManagedBy'
      },
      {
        title: 'Clasificar de una: rol de matriz o excepción',
        detail: 'El primer filtro decide TODO lo demás: si el acceso es parte del rol del solicitante (matriz v4, iam-kb-040), el flujo es corto (aprobación del manager, provisioning, verificación); si es excepción, el flujo se endurece: dueño del sistema como aprobador, duración obligatoria con vencimiento (iam-013) y registro en el backlog de excepciones que la campaña revisa (iam-kb-048). "Todo es excepción" es el síntoma de una matriz desactualizada, y se corrige en la matriz, no ampliando la excepción.',
        command: 'Get-ADPrincipalGroupMembership ana.torres | Select-Object Name | Export-Csv C:\\Temp\\granting-lineabase.csv'
      },
      {
        title: 'Ejecutar la aprobación por quien corresponde, con SLA',
        detail: 'Aprueba el dueño del acceso (access owner), no el equipo IAM ni el manager del solicitante (salvo lo birthright del rol). Para privilegiado: four-eyes — dos aprobaciones (iam-kb-012). El SLA de aprobación es compromiso publicado con escalación automática al segundo nivel (la lección de iam-029: la cola que nadie mira fabrica el shadow access). La aprobación se registra con aprobador, hora y comentario: la evidencia es la cadena, no la buena fe.',
        command: 'Get-ADGroup -LDAPFilter "(managedBy=*)" -Properties ManagedBy | Select-Object Name,ManagedBy'
      },
      {
        title: 'Chequear SoD ANTES de conceder (el control preventivo que nadie usa)',
        detail: 'Al aprobar, el conjunto resultante del usuario se cruza contra la matriz de pares conflictivos (iam-kb-015, iam-kb-049): la solicitud de iam-014 (rol Aprobador de Compras) se hundió o se salvó exactamente en este paso. Sin el chequeo preventivo el conflicto se descubre en la campaña trimestral con el acceso ya usado; con él, la conversación incómoda ocurre ANTES del daño.',
        command: 'Compare-Object (Import-Csv C:\\Temp\\sod-par-a.csv) (Import-Csv C:\\Temp\\sod-par-b.csv) -Property SamAccountName -IncludeEqual | Where-Object SideIndicator -eq "=="'
      },
      {
        title: 'Provisionear con el mecanismo del sistema (grupo, app, rol cloud)',
        detail: 'La ejecución depende del destino: grupo AD (Add-ADGroupMember con el ticket como justificación, iam-kb-004), asignación de la enterprise app (iam-kb-008), rol de Entra (role assignment por grupo elegible), licencia por grupo (iam-kb-010), o la app SaaS por SCIM (iam-kb-028). La regla transversal: se provisionea POR GRUPO O ROL, jamás por usuario directo — el permiso por usuario es la deuda que la próxima campaña no podrá revocar sin arqueología.',
        command: 'Add-ADGroupMember -Identity NXR-SAP-FI-ESCRITURA -Members ana.torres'
      },
      {
        title: 'Poner vencimiento a todo lo temporal (y dudar de lo "permanente")',
        detail: 'El acceso con duración definida (la auditora externa de iam-013, el proyecto de tres meses) nace con expiración: grupo con fecha, AccountExpirationDate para terceros (iam-kb-021), access package con política de expiración (iam-kb-009), role assignment elegible con ventana. El acceso "permanente" del rol de matriz se recertifica cada trimestre (iam-kb-048): permanente significa "mientras el dueño lo siga firmando", no "para siempre".',
        command: 'Set-ADAccountExpiration -Identity ext-auditora-mlopez -DateTime "2026-03-13"'
      },
      {
        title: 'Verificar que quedó concedido y registrar la cadena completa',
        detail: 'Verificación técnica (membresía efectiva, klist purge del usuario si el recurso es Kerberos — iam-kb-004, primer login real a la app) y registro de la cadena en el ticket: solicitante → aprobador(es) → chequeo SoD → provisioning → verificación, con horas. Esa cadena ES el insumo de la campaña (iam-kb-014) y la respuesta a la auditoría (iam-027): la pregunta "¿quién autorizó este acceso?" se responde con el ticket, no con memoria.',
        command: 'Get-ADPrincipalGroupMembership ana.torres | Select-Object Name'
      }
    ],
    verification: 'El acceso concedido quedó provisioneado por grupo o rol con aprobación rastreable (aprobador, hora, comentario), pasó el chequeo SoD antes de ejecutarse, tiene vencimiento si es temporal, y el usuario verificó acceso real a lo pedido y a nada más.',
    escalation: 'Líder de IAM (solicitudes de excepción sin vencimiento propuesto, o aprobaciones que el dueño del sistema rehúsa firmar: suben con la recomendación del equipo)',
    relatedTerms: ['Access Request Management (ARM)', 'Flujo de aprobación', 'Directiva de expiración de accesos', 'Acceso solicitable (requestable access)', 'Principio de cuatro ojos (four-eyes)', 'Entitlement'],
    relatedTickets: ['iam-009', 'iam-013']
  },
  {
    id: 'iam-kb-044',
    title: 'Proceso de revocación (revoking): deprovisioning total y revocación de emergencia',
    category: 'IAM - Gobernanza & Auditoría',
    environment: 'Gobernanza',
    symptoms: 'La revocación es el control que la auditoría pesa con balanza fina: el leaver que conservó acceso semanas (iam-044), la cuenta deshabilitada en AD pero viva en las apps SaaS (iam-kb-020), o la emergencia del despido hostil donde hay que cortar TODO YA (iam-003) y reconstruir la evidencia después. Los dos modos del artículo: la revocación planificada (el proceso) y la revocación de emergencia (el kill switch) — el equipo domina ambos y sabe cuándo corre cada uno.',
    cause: 'La revocación falla por incompletitud, no por falta de voluntad: se deshabilita AD y quedan vivos los tokens de la nube, la sesión del móvil, la cuenta local del SaaS, el checkout abierto de la bóveda o la API key que el usuario generó. La revocación total es una lista finita de superficies (directorio, nube, sesiones, apps, bóveda, llaves) que se recorre SIEMPRE completa; la emergencia cambia el ORDEN (identidad primero, evidencia después) pero nunca acorta la lista.',
    steps: [
      {
        title: 'Tener el mapa de superficies antes de la primera revocación',
        detail: 'La lista de Nexora (el checklist del leaver de iam-kb-002 como mapa): 1) AD (deshabilitar y vaciar membresías), 2) Entra ID (revocación de sesiones, licencias, roles PIM), 3) apps SaaS (cuenta local, SCIM, tokens propios — iam-kb-020), 4) bóveda PAM (check-in forzoso y membresías de safes), 5) accesos técnicos (llaves SSH, PATs, API keys, certificados VPN), 6) físico (hand-off con Instalaciones). El mapa se mantiene con el inventario de apps: revocar lo que no está inventariado es imposible por definición.',
        command: 'Get-ADUser -Identity ana.torres -Properties MemberOf,Enabled,LastLogonDate'
      },
      {
        title: 'Revocación planificada: deshabilitar primero, borrar nunca (aún)',
        detail: 'El día y la hora acordados con RRHH (iam-kb-002): Disable-ADAccount en el momento exacto, revocación de sesiones de la nube en el MISMO rato (no "luego"), retiro de grupos y licencias, y el resto del checklist con evidencia hora por hora. Deshabilitar conserva la pista de auditoría (el borrado llega con la política de retención de 12 meses). La revocación a medias del viernes se descubre en la campaña como los cinco leavers de iam-044: con la puerta entreabierta.',
        command: 'Disable-ADAccount -Identity ana.torres'
      },
      {
        title: 'Matar sesiones y tokens de verdad',
        detail: 'La lección técnica de iam-037: cambiar la contraseña NO saca a quien ya tiene token. Revocación real: Revoke-MgUserSignInSession (refresh tokens de la nube), revocación de los consentimientos OAuth que el usuario otorgó, sesión del IdP federado invalidada si existiera (ADFS, el piloto Okta — iam-kb-028), y check-in forzoso de credenciales prestadas en la bóveda. Sin token-kill, el disable es un aviso, no un corte.',
        command: 'Revoke-MgUserSignInSession -UserId ana.torres@nexora.com'
      },
      {
        title: 'Emergencia: el kill switch con orden definido',
        detail: 'Despido hostil o compromiso (iam-003, iam-kb-023): el orden es 1) revocar sesiones y tokens de la nube (lo más rápido y de mayor alcance), 2) deshabilitar AD, 3) forzar reseteo con re-registro de MFA si hay sospecha de robo del factor, 4) cerrar bóveda y accesos técnicos, 5) avisar al SOC y al líder en paralelo, no después. Cada acción con su hora registrada: en la emergencia, el log del operador ES la evidencia. Reactivar por falso positivo es decisión del líder; el analista corta primero.',
        command: 'Get-MgUserAuthenticationMethod -UserId ana.torres@nexora.com'
      },
      {
        title: 'Revocar también lo que el usuario creó',
        detail: 'El inventario de la salida incluye lo que el usuario generó: reglas de bandeja del correo (persistencia clásica, iam-kb-023), API keys personales, apps con consentimiento OAuth, llaves SSH publicadas en repos, delegaciones de shares. La revisión de "lo que creó" se hace con los audit logs de la ventana de actividad (o del período completo en salidas sensibles): revocar la cuenta sin barrer su persistencia deja la puerta decorada pero abierta.',
        command: 'Get-MgAuditLogDirectoryAudit -Top 200 | Where-Object InitiatedBy -like "*ana.torres*"'
      },
      {
        title: 'Cerrar los roles privilegiados y elegibles',
        detail: 'Un leaver con role assignment permanente en PIM o membresía viva en grupos de administración es el peor residuo (iam-kb-012): retirar asignaciones elegibles y activas, revisar las cuentas break-glass que pudiera conocer (iam-kb-013) y verificar que la salida del grupo de licencias arrastra los roles dependientes. El barrido se verifica por LISTA (roles del usuario antes vs. después), no por "ya lo hice".',
        command: 'Remove-MgRoleManagementDirectoryRoleAssignment -UnifiedRoleAssignmentId "<id-asignacion>"'
      },
      {
        title: 'Verificar, medir y retroalimentar el proceso',
        detail: 'La verificación de revocación es una PRUEBA de acceso (intentos fallidos en AD y la nube, sin sesiones activas en los logs de 24 horas, cuenta bloqueada en cada app del inventario) y la métrica del proceso: % de leavers revocados completos el día 0 (el KPI que la campaña de iam-044 puso en verde). Cada residuo encontrado alimenta el checklist: la próxima revocación no repite el hueco.',
        command: 'Get-MgAuditLogSignIn -Top 50 | Where-Object UserPrincipalName -eq "ana.torres@nexora.com"'
      }
    ],
    verification: 'El intento de login falla en TODAS las superficies del mapa (no solo AD y correo), no quedan tokens, sesiones ni persistencia creada por el usuario, el checklist del ticket tiene horas y ejecutores por superficie, y el % de revocación completa en el día 0 quedó registrado.',
    escalation: 'SOC (salidas hostiles, cualquier uso post-corte o sospecha de persistencia: incidente en curso) / Líder de IAM (la reversión de una revocación de emergencia es decisión suya, documentada)',
    relatedTerms: ['Account deprovisioning', 'Revocación de sesiones y tokens', 'Provisioning / Deprovisioning', 'Acceso break-glass', 'Kill switch (revocación de emergencia)'],
    relatedTickets: ['iam-003', 'iam-044', 'iam-046']
  },
  {
    id: 'iam-kb-045',
    title: 'Identity life-cycle: madurez del JML, birthright vs. solicitable, contratistas y reingresos',
    category: 'IAM - Ciclo de vida (JML)',
    environment: 'Multi',
    symptoms: 'Los artículos iam-kb-001/002/003 son el CÓMO de cada flujo; este es el ESTÁNDAR de madurez que une todo: qué se concede sin pedir (birthright), qué se pide, cómo entra un contratista sin romper el modelo y qué hacer con el reingreso (iam-005: el que vuelve tras ocho meses y nadie sabe si reactivar o crear). Los síntomas de madurez baja: el JML que depende del ticket bien redactado, los reingresos con cuentas duplicadas y los contratistas con accesos de empleado.',
    cause: 'No es un fallo sino el marco de madurez. El ciclo maduro es HR-driven (RRHH dispara, la plataforma ejecuta, el ticket es la excepción y no el conducto) con una separación clara: birthright (por estado en RRHH, automático) vs. solicitable (por aprobación, iam-kb-043). Los dolores nacen de los estados que el modelo no contempla: reingresos, excedencias (iam-008), pausas de contrato del tercero, y el manager que pide "lo mismo que tenía antes".',
    steps: [
      {
        title: 'Definir la línea birthright vs. solicitable con RRHH',
        detail: 'Workshop con RRHH: qué TODO empleado recibe el día uno (correo, intranet, VPN base, licencia E3 — la línea de iam-kb-001) y qué depende del puesto o del proyecto (todo lo demás, por matriz de roles, iam-kb-009/043). La lista birthright corta y explícita evita el "le dieron de todo porque era más rápido" y hace al leaver revisable: se sabe exactamente qué retirar sin inventario.',
        command: 'Get-ADGroupMember NXR-BASE-EMPLEADO -Recursive | Measure-Object'
      },
      {
        title: 'Automatizar por eventos de RRHH, no por tickets',
        detail: 'El siguiente estado de madurez: el cambio en RRHH (contratación con fecha, traslado, terminación) dispara el flujo — hoy el batch diario de ServiceNow, mañana el identity profile del IGA evaluado (iam-kb-029, iam-kb-033). El ticket queda para excepciones y casos raros. KPIs del estado: lead time del onboarding (del alta en RRHH al acceso listo), % de JML ejecutado sin intervención manual y latencia del leaver (la ventana entre la fecha de RRHH y el corte real que la auditoría mide, iam-044).',
        command: 'Compare-Object (Import-Csv C:\\Temp\\rrhh-activos.csv) (Import-Csv C:\\Temp\\ad-activos.csv) -Property EmployeeID | Export-Csv C:\\Temp\\jml-diferencias.csv'
      },
      {
        title: 'Tratar al contratista como un caso de primer orden',
        detail: 'El tercero NO es un empleado con otro nombre (iam-kb-021): clasificación por atributo (employeeType), sponsor interno, expiración desde el nacimiento de la cuenta, nada birthright, MFA obligatorio y barrido mensual contra contratos vigentes. El flujo del contratista es parte del ciclo de vida con su propio carril en el catálogo de solicitudes: el error de madurez es procesarlo con el flujo del empleado y "ajustar a mano".',
        command: 'Get-ADUser -LDAPFilter "(&(employeeType=Externo)(!userAccountControl:1.2.840.113556.1.4.803:=2))" -Properties AccountExpirationDate'
      },
      {
        title: 'Reingreso: reactivar la identidad, no duplicar la persona',
        detail: 'El caso iam-005 con regla escrita: si el ex-empleado vuelve (employeeID existente en el inventario), se reactiva la cuenta original (o se crea vinculada por employeeID) y se trata como Mover desde cero: nada de los accesos anteriores sobrevive sin proceso. La duplicación de identidad (dos cuentas para una persona) rompe la correlación de toda la gobernanza (IGA, campañas, SoD): el inventario por employeeID se consulta ANTES de crear, siempre.',
        command: 'Get-ADUser -LDAPFilter "(employeeID=NX-04487)" -Properties Enabled,Description'
      },
      {
        title: 'Modelar los estados intermedios antes de que duelan',
        detail: 'Excedencia (suspender sin desprovisionar: iam-008, iam-kb-028), licencia prolongada, contrato en pausa del tercero: cada estado con su tratamiento escrito (¿qué se conserva?, ¿qué se revoca?, ¿quién firma la vuelta?). El estado intermedio improvisado es como quedan las cuentas "suspendidas" por tres años que nadie reclama y la campaña de inactivos descubre (iam-030).',
        command: 'Set-ADAccountExpiration -Identity ana.torres -DateTime "2026-12-01"'
      },
      {
        title: 'Medir el ciclo con KPIs y revisarlo con RRHH',
        detail: 'Los números del trimestre: lead time de joiner (meta: accesos listos ANTES del día uno), % de leavers cortados el día 0 (iam-044), latencia de revocación, % de reingresos sin duplicación y % de contratistas activos con expiración vigente (iam-kb-021). La revisión trimestral con RRHH (fuente de autoridad) comparte los números y ajusta el proceso: el ciclo de vida es un proceso compartido, y el KPI es el idioma común (iam-kb-022).',
        command: 'Search-ADAccount -AccountExpiring -TimeSpan 30.00:00:00 | Measure-Object'
      }
    ],
    verification: 'La lista birthright está firmada con RRHH, el JML del trimestre corrió con su % de automatización y lead time medidos, no hay identidades duplicadas por reingreso (verificado por employeeID), y todo contratista activo tiene sponsor y expiración vigente.',
    escalation: 'Líder de IAM + RRHH (los estados que el modelo no cubre se definen con la fuente de autoridad, no se improvisan en el ticket)',
    relatedTerms: ['Identity Lifecycle', 'Joiner-Mover-Leaver (JML)', 'Birthright access', 'Fuente autoritativa (authoritative source)', 'HRIS (sistema de RR. HH.)', 'Cuenta huérfana (orphaned account)'],
    relatedTickets: ['iam-005', 'iam-006', 'iam-044']
  },
  {
    id: 'iam-kb-046',
    title: 'MFA profundo: factores, FIDO2/passkeys, number matching y la salida del SMS',
    category: 'IAM - Acceso & Autenticación',
    environment: 'Entra ID / M365',
    symptoms: 'iam-kb-006 es la operación del caso (re-registrar, TAP, migración de teléfono); este artículo es el CONOCIMIENTO del mecanismo que el analista necesita para diseñar: qué factor elegir por población, por qué el SMS dejó de ser factor aceptable, qué hacer contra el MFA fatigue (las ráfagas de push de iam-039) y cómo correr la migración de factores sin tumbar la operación. La pregunta recurrente del comité: ¿ya nos merecemos passkeys?',
    cause: 'No es un fallo sino la taxonomía de factores con resistencia decreciente al phishing: SMS/voz (interceptable por SIM swapping, y el usuario aprueba lo que sea sin saber a qué), OTP de app TOTP (mejor, pero phisheable por AiTM en tiempo real), push simple (fatigue: el atacante spam-approvea hasta que alguien aprueba distraído), push con number matching (el ataque necesita además la víctima mirando la pantalla legítima), FIDO2/passkeys (origin binding: el reto solo vale para el dominio legítimo — el AiTM muere aquí). La política de Nexora: SMS fuera, TOTP transitorio, FIDO2 para privilegiados y críticos.',
    steps: [
      {
        title: 'Clasificar los factores por resistencia, no por comodidad',
        detail: 'La tabla de decisión del equipo: SMS/voz prohibido como factor (solo como bootstrap temporal documentado), TOTP en Authenticator aceptable para la población general, push con number matching para todos los push, FIDO2/passkey y Windows Hello for Business para crítico y privilegiado (phishing-resistant con origin binding). La clasificación con los niveles NIST SP 800-63 al lado (iam-kb-016): el factor se elige por la cuenta que protege, no por el teléfono que el usuario tiene hoy.',
        command: 'Get-MgUserAuthenticationMethod -UserId ana.torres@nexora.com'
      },
      {
        title: 'Configurar number matching contra el MFA fatigue',
        detail: 'El ataque de iam-039 (ráfaga de push a las 3 AM esperando la aprobación distraída) se neutraliza con el number challenge: la app pide el par de dígitos que aparece en la pantalla de login — el atacante no puede reenviarle el número a la víctima por otro canal en tiempo real. Se activa en Microsoft Entra admin center → Protection → Authentication methods → Microsoft Authenticator (Require number matching for push notifications). La mitigación técnica se acompaña de la regla humana: push no solicitado = reportar, jamás aprobar (iam-kb-006).',
        command: 'Get-MgAuditLogSignIn -Top 100 | Where-Object RiskLevel -ne "none"'
      },
      {
        title: 'Correr la migración desde SMS como campaña, no como acto heroico',
        detail: 'La salida del SMS se planifica como el despliegue de una política (iam-kb-017): report de cobertura por factor (quiénes tienen SMS como único método), MFA Registration Campaign en Entra (invita al registro de Authenticator/FIDO2 con seguimiento de progreso), oleadas por población (general → críticos), fecha de retiro del SMS anunciada con anticipación y TAP/soporte listo para los atrapados (iam-kb-006). La migración termina cuando el reporte de usuarios con método phishing-resistant llega a la meta, no cuando sale el anuncio.',
        command: 'Get-MgAuditLogSignIn -Top 500 | Group-Object { $_.MfaDetail.AuthMethod } | Sort-Object Count -Descending'
      },
      {
        title: 'Elevar a FIDO2/passkeys por población crítica',
        detail: 'FIDO2 (llave física o passkey en el dispositivo, iam-kb-013) para roles privilegiados (exigencia de PIM, iam-kb-012), break-glass (llave física custodiada) y finanzas o casos de phishing repetido. El registro va por el registro combinado (MFA + SSPR en un solo flujo). La decisión de passkey vs. TOTP por población queda escrita en la matriz de autenticación — el gemelo de la matriz de roles aplicado a factores (el modelo de iam-kb-026 para Entra).',
        command: 'Get-MgAuditLogDirectoryAudit -Top 100 | Where-Object Category -eq "UserManagement"'
      },
      {
        title: 'Vigilar la adopción y el ataque con los logs',
        detail: 'Los dos reportes de la revisión semanal (iam-kb-019): cobertura (% de usuarios con factor phishing-resistant, % con solo OTP, % sin ningún método registrado) y señales de ataque (rechazos de push en ráfaga, aprobaciones fuera de horario, OTP fallidos en serie — el 500121 de los sign-in logs). La fatigue se detecta por patrón: un usuario con quince push en veinte minutos es un incidente aunque todas terminen en rechazo, y esa correlación es la que alimenta al SOC (iam-kb-023).',
        command: 'SigninLogs | where TimeGenerated > ago(7d) | where ResultType == "500121" | summarize attempts=count() by UserPrincipalName | order by attempts desc'
      },
      {
        title: 'Sostener la educación en cada toque del factor',
        detail: 'La regla operativa de iam-kb-006 en cada reseteo o re-registro: nunca aprobar lo no solicitado, el push extraño se reporta al SOC, y el relato (anónimo) de cada caso real de fatigue o phishing aprobado se comparte en la newsletter del mes. La resistencia técnica se compra con factores; la resistencia humana se sostiene con cultura, y la cultura se refuerza exactamente cuando el usuario está tocando el mecanismo.'
      }
    ],
    verification: 'El number matching quedó activo y verificado con un login de laboratorio, el reporte de cobertura muestra la meta de phishing-resistant por población y cero usuarios con SMS como único factor, y el SIEM alerta las ráfagas de push y los 500121 en minutos.',
    escalation: 'SOC (fatigue en curso: las ráfagas de push son incidente activo mientras el atacante no se canse) / Líder de IAM (retirar un factor o cambiar la política general de autenticación)',
    relatedTerms: ['Multi-Factor Authentication (MFA)', 'FIDO2 / WebAuthn', 'Passkeys', 'Number Matching', 'MFA fatigue (ataque)', 'Windows Hello for Business (WHfB)'],
    relatedTickets: ['iam-015', 'iam-039']
  },
  {
    id: 'iam-kb-047',
    title: 'SSO profundo: modelos de federación, SAML vs. OIDC, home realm discovery y Kerberos',
    category: 'IAM - Aplicaciones & SSO',
    environment: 'Aplicaciones SaaS',
    symptoms: 'iam-kb-008 es el troubleshooting del caso; este es el diseño que evita la mitad de los casos: al integrar una app nueva al SSO aparecen las preguntas de arquitectura (¿SAML u OIDC?, ¿quién es el IdP de esta app?, ¿cómo entra un invitado B2B de otro tenant?) y los fallos caros: apps integradas sin modelo (cada una con su aventura), invitados que aterrizan en el realm equivocado (home realm), o la app legacy que "solo funciona con Kerberos" y convive mal con el SSO moderno.',
    cause: 'No es un fallo sino la taxonomía del SSO. Modelos: IdP-initiated (arranca en el portal del IdP), SP-initiated (arranca en la app — el estándar), hub-and-spoke (un IdP central contra todos los SP). Protocolos: SAML 2.0 (assertion XML firmada, metadata, el rey del SaaS pesado) y OIDC (tokens JSON sobre OAuth2, el rey de lo moderno y móvil). El home realm discovery decide a qué IdP va cada usuario por el dominio de su correo; y Kerberos sigue mandando DENTRO de la red corporativa para las apps legacy: convivir con modern auth es el diseño.',
    steps: [
      {
        title: 'Elegir el modelo de integración por app, con criterio publicado',
        detail: 'La regla Nexora: SP-initiated como estándar (el usuario entra por el link de la app y la app manda al IdP: los deep-links y los bookmarks siempre funcionan), IdP-initiated solo cuando la app lo exige o para el portal de lanzamiento (My Apps). La postura es hub-and-spoke: Entra ID como hub de lo cloud, el piloto Okta como broker del portafolio SaaS (iam-kb-025) y las apps legacy internas por su mecanismo propio. Cada app del inventario con su modelo DOCUMENTADO (iam-kb-020): el modelo no decidido en el alta se decide a las 3 AM en un incidente.',
        command: 'Get-MgAuditLogSignIn -Top 500 | Group-Object AppDisplayName | Sort-Object Count -Descending'
      },
      {
        title: 'Decidir SAML u OIDC con la tabla de decisión',
        detail: 'SAML si: la app es SaaS enterprise pesado sin OIDC, exige claims complejos o trabaja con federation metadata madura. OIDC si: la app es moderna, móvil o SPA, o necesita scopes de API (tokens de acceso a recursos, no solo login). La diferencia operativa importa: OIDC tiene client secrets con expiración (agendarlos, iam-kb-008) y refresh tokens con revocación fina (iam-kb-044); SAML tiene certificados de firma con rollover anual (agendarlo igual: la lección dominical de iam-033). Ninguna app se integra "por las dos" sin necesidad: cada protocolo duplicado es superficie duplicada.',
        command: "Get-MgApplication -Filter \"displayName eq 'WorkforceHR'\" | Select-Object DisplayName,Id"
      },
      {
        title: 'Dominar el home realm discovery para multi-IdP e invitados',
        detail: 'Cuando un dominio está federado o el usuario es invitado: ¿a qué IdP va el login? En Entra, el HRD resuelve por dominio (login con @partner.com → al IdP federado de ese dominio o al tenant B2B del invitado). Los fallos típicos: dominio federado retirado sin limpiar el HRD (usuarios rebotando a un IdP muerto), invitados B2B cayendo al portal del tenant anfitrión sin su identidad, y apps SAML que hardcodean el IdP en vez de respetar el dominio del correo. El diagnóstico se hace con el sign-in log: el detalle muestra a dónde fue a parar el intento.',
        command: 'Get-MgAuditLogSignIn -Top 50 | Where-Object UserPrincipalName -like "*_partner.com*"'
      },
      {
        title: 'Convivir con Kerberos: modern auth y legacy en la misma casa',
        detail: 'Dentro de la red, las apps legacy siguen en Kerberos/NTLM (el IIS de la intranet, los shares): el diseño de convivencia es lo que evita la esquizofrenia de identidad. Las rutas modernas: publicar la app legacy detrás de un proxy que inyecta headers o negocia Kerberos por ella (junctions de ISAM, routes de IG — iam-kb-034/036), o avanzar a Windows Hello for Business para el login sin contraseña (iam-kb-046). La meta de roadmap: cada app legacy con plan de migración o de publicación — el Kerberos interno no es vergüenza; la app expuesta a internet con NTLM sí lo es.',
        command: 'nltest /dsgetdc:nexora.local'
      },
      {
        title: 'Gestionar el ciclo de vida de la confianza (certificados, secrets, metadata)',
        detail: 'Cada integración de SSO deja artefactos con vencimiento: certificado de firma SAML (rollover anual coordinado con el SP), client secret OIDC (60 días, 1 o 2 años según elección), metadata de federación (reload automático o manual). El inventario de apps (iam-kb-020) tiene la columna de vencimientos y el calendario del equipo avisa con 30 días de anticipación y dueño asignado: el incidente dominical del certificado (iam-033) es 100% prevenible con calendario, y nadie lo recuerda sin calendario.',
        command: 'Get-MgAuditLogDirectoryAudit -Top 100 | Where-Object ActivityDisplayName -like "*certificate*"'
      },
      {
        title: 'Probar cada integración con el usuario de laboratorio y los tres casos',
        detail: 'La prueba de aceptación del SSO no es "entró una vez": es (1) SP-initiated desde link directo, (2) con sesión ya abierta en el IdP (SSO sin segundo prompt), y (3) invitado o usuario del dominio federado según aplique. Cada caso con su evidencia en el sign-in log. La app que "a veces pide dos veces la contraseña" tiene un fallo de modelo, y se descubre exactamente aquí — no en producción con el gerente esperando.',
        command: 'Get-MgAuditLogSignIn -Top 100 | Where-Object AppDisplayName -eq "WorkforceHR"'
      }
    ],
    verification: 'Cada app del inventario tiene su modelo documentado (protocolo, iniciación, vencimientos con dueño), la prueba de los tres casos pasó con evidencia en el sign-in log, y ninguna app quedó con certificado o secret sin fecha de vencimiento registrada.',
    escalation: 'Líder de IAM + Dueño de la aplicación (decisiones de protocolo y modelo en apps críticas, y el alta de apps legacy: el modelo se firma con el dueño del sistema)',
    relatedTerms: ['Federación (identidad federada)', 'SAML 2.0', 'OpenID Connect (OIDC)', 'Home Realm Discovery (HRD)', 'Kerberos (TGT / ST)', 'SP-initiated SSO'],
    relatedTickets: ['iam-033', 'iam-036']
  },
  {
    id: 'iam-kb-048',
    title: 'Access reviews: la operación completa de la campaña (alcance, remediación, métricas)',
    category: 'IAM - Gobernanza & Auditoría',
    environment: 'Gobernanza',
    symptoms: 'iam-kb-014 es el cómo trimestral; este artículo es el manual de operación de la campaña COMPLETA para quien la corre: definir alcance y periodicidad, preparar el material, operar la campaña (la "Semana de Access Review" de iam-041..050 es exactamente esto), remediar lo denegado (incluidas las apps que no revocan solas), manejar excepciones con vencimiento y cerrar con métricas y evidencia. Los síntomas del que opera sin manual: alcances por comodidad, revocaciones que no se ejecutan y excepciones que viven más que el revisor que las firmó.',
    cause: 'No es un fallo sino el ciclo operativo del control. Una campaña madura tiene: alcance segmentado por riesgo, certificadores correctos por segmento, material preparado, plazos con default deny, remediación verificada (el eslabón que suele romperse), excepciones con vencimiento (iam-046) y métricas de cierre (iam-049). Falla por cualquiera de los eslabones: la campaña que solo pregunta sin remediar es teatro de certificación, y el auditor lo distingue de inmediato.',
    steps: [
      {
        title: 'Definir alcance y periodicidad por riesgo',
        detail: 'La segmentación de Nexora: roles privilegiados y accesos financieros cada trimestre (mínimo del estándar, iam-kb-014), terceros y externos cada mes (iam-kb-021), cuentas de servicio cada trimestre (iam-048), accesos sensibles de negocio según la matriz de riesgos. El criterio del alcance se escribe: riesgo del sistema, criticidad del dato, historial de hallazgos. "Todo el directorio cada trimestre" no es rigor: es la campaña que nadie responde bien (la lección de iam-024).',
        command: 'Get-ADGroupMember NXR-ADM-PLATAFORMA -Recursive | Export-Csv C:\\Temp\\campana-adm.csv'
      },
      {
        title: 'Preparar el material que el certificador VA a usar',
        detail: 'Por segmento: lista de accesos CON contexto (puesto, área, última fecha de uso donde exista, quién aprobó originalmente si el ticket lo dice) y agrupada por persona (el revisor certifica PERSONAS, no filas sueltas de CSV). El material listo es lo que separa la campaña que dura una semana de la que se arrastra un mes: el certificador que debe armarse su propio listado nunca lo arma (iam-kb-014).',
        command: 'Get-ADPrincipalGroupMembership ana.torres | Select-Object Name | Export-Csv C:\\Temp\\campana-persona.csv'
      },
      {
        title: 'Operar la campaña con recordatorios y default deny',
        detail: 'Cronograma tipo "Semana" (iam-041..049 como plantilla): kickoff con fecha límite clara y criterio comunicado ("confirme lo que NECESITA, no lo que siempre tuvo"), recordatorios a los 3/6/9 días, escalamiento a gerencia de los rezagados, y la regla de hierro: sin respuesta al cierre, default deny (revoca). Las herramientas: la plataforma de access reviews si el sistema está cubierto (Entra ID Governance, o el IGA evaluado, iam-kb-030), o el flujo ServiceNow con exports para el resto — el canal importa menos que la respuesta respaldada.',
        command: 'Get-MgIdentityGovernanceAccessReviewDefinition -All'
      },
      {
        title: 'Remediar lo denegado y VERIFICAR la remediación',
        detail: 'Cada "revoke" termina en una acción ejecutada y verificada: grupo retirado (Remove-ADGroupMember en batch documentado, iam-kb-014), cuenta deshabilitada, licencia retirada, checkout de bóveda cerrado. Las apps que NO revocan solas (el SaaS manual, el sistema legacy) entran a la cola de remediación con dueño y fecha — y la campaña NO cierra con remediaciones pendientes: el diff antes/después del directorio es la prueba.',
        command: 'Compare-Object (Import-Csv C:\\Temp\\campana-antes.csv) (Import-Csv C:\\Temp\\campana-despues.csv) -Property SamAccountName'
      },
      {
        title: 'Excepciones: firmadas, con control y con fecha de muerte',
        detail: 'El negocio a veces necesita mantener el acceso que el revisor negó (el caso de iam-046: dos revocaciones y una excepción firmada): la excepción formal tiene (1) firma del dueño del riesgo, (2) control compensatorio concreto y operativo (revisión de segundo nivel, log review mensual del par — iam-kb-049), (3) fecha de vencimiento (90 días, no "hasta que se arregle") y (4) visibilidad en la campaña SIGUIENTE: la excepción que caduca y se re-pregunta obliga la conversación de fondo (¿es excepción o es un rol de la matriz mal diseñado?, iam-kb-040).',
        command: 'Get-ADGroupMember NXR-FIN-APR -Recursive | Export-Csv C:\\Temp\\excepciones-activas.csv'
      },
      {
        title: 'Cerrar con métricas que digan algo',
        detail: 'KPIs de cierre (el paquete de iam-049): % de respuesta por segmento (y quién no respondió pese al escalamiento: default deny aplicado y reportado), días de duración, ítems revocados vs. aprobados, excepciones abiertas con vencimiento, y la tendencia contra el trimestre anterior. Las señales que alimentan el diseño: lo que SIEMPRE se aprueba es rol de matriz (iam-kb-009), lo que SIEMPRE se revoca es exceso al onboarding, y el segmento que nadie responde es el tema del próximo comité.',
        command: 'Get-MgAuditLogDirectoryAudit -Top 500 | Where-Object Category -eq "RoleManagement"'
      },
      {
        title: 'Empacar la evidencia como subproducto del proceso',
        detail: 'La carpeta E-01..E-07 (iam-049): alcance y criterio, material enviado, respuestas con certificador y fecha, batch de revocaciones con hora y ejecutor, verificación (diffs), excepciones firmadas y métricas. La operación correcta genera el paquete en el transcurso de la campaña, no en la víspera del auditor: el paquete de la "Semana de Access Review" es exactamente el estándar de evidencia que la ISO 27001 y los ITGC piden ver (iam-kb-019).',
        command: 'Get-ADGroupMember NXR-FIN-APR -Recursive | Export-Csv C:\\Temp\\campana-antes.csv'
      }
    ],
    verification: 'El cierre de campaña tiene: respuestas (o default deny aplicado) del 100% del alcance, revocaciones verificadas con diff, excepciones con firma, control compensatorio y vencimiento, métricas comparadas contra el trimestre anterior, y el paquete de evidencia completo generado durante el proceso.',
    escalation: 'Líder de IAM / Comité de cumplimiento (segmentos sin respuesta tras el escalamiento a gerencia, y excepciones sin control compensatorio: no se aceptan)',
    relatedTerms: ['Access Review (certificación de accesos)', 'Campaña de certificación', 'Attestation', 'Control compensatorio', 'KPIs de IAM', 'Recertificación'],
    relatedTickets: ['iam-042', 'iam-048', 'iam-050']
  },
  {
    id: 'iam-kb-049',
    title: 'SoD y combinaciones tóxicas: construir la matriz y montar el control permanente',
    category: 'IAM - Gobernanza & Auditoría',
    environment: 'Gobernanza',
    symptoms: 'iam-kb-015 es la detección y remediación de un caso; este artículo es la CONSTRUCCIÓN del control: armar la matriz de pares conflictivos con el negocio (antes de que el auditor pregunte), montar la detección periódica (el cruce que destapó las tres combinaciones de iam-045) y manejar las excepciones con control compensatorio (la de iam-046). Los síntomas de no tener el control montado: el SoD se revisa "cuando la auditoría viene", cada cruce se improvisa con CSV nuevo, y las excepciones son conversaciones sin rastro.',
    cause: 'No es un fallo sino el diseño del control de segregación. La matriz SoD define pares de funciones que no deben coexistir en una identidad (quien crea proveedores no aprueba pagos; quien administra el sistema no audita sus registros; quien desarrolla no despliega a producción). Los conflictos nacen de: reorganizaciones que mezclan funciones (iam-003), roles de matriz mal diseñados (iam-kb-040) y sistemas nuevos incorporados sin analizar sus conflictos contra los existentes. Sin matriz formal, "revisar SoD" es una impresión, no un control.',
    steps: [
      {
        title: 'Inventariar las funciones de riesgo con el negocio',
        detail: 'Taller con dueños de proceso (Finanzas, Compras, TI, auditoría interna): listar las funciones cuyo abuso causa daño material — alta de proveedores, aprobación de pagos, creación y modificación de accesos, aprobación de solicitudes, administración de sistemas, desarrollo, despliegue, revisión de logs. Cada función con su sistema y su dueño: sin inventario de funciones no hay pares, solo anécdotas de incidentes ajenos.',
        command: 'Get-ADGroup -LDAPFilter "(name=NXR-*)" -Properties Description | Select-Object Name,Description | Export-Csv C:\\Temp\\sod-funciones.csv'
      },
      {
        title: 'Definir los pares conflictivos por proceso de negocio',
        detail: 'Con el dueño del riesgo firmando cada par: (alta de proveedor, aprobación de pago), (crear usuarios, aprobar accesos), (administrar el sistema, auditar el sistema), (desarrollo, despliegue a producción), (gestión de accesos, revisión de los propios accesos del gestor). Cada par documentado con: por qué es riesgo, severidad (alta/media) y si aplica preventivo, detectivo o ambos. La matriz vive versionada junto a la de roles (iam-kb-009): es el documento que el auditor pide y la fuente del chequeo puntual de iam-kb-015.',
        command: 'Get-ADGroupMember NXR-FIN-ALTAS -Recursive | Export-Csv C:\\Temp\\sod-par-a.csv'
      },
      {
        title: 'Montar el cruce como rutina, no como arqueología',
        detail: 'El cruce de pares es un script o consulta que corre igual cada vez: export de ambos lados del par, intersección, lista de violaciones con fecha. Rutina de Nexora: preventivo en cada granting delicado (iam-kb-043) y en cada Mover (iam-kb-003); detectivo en el barrido trimestral de campaña (iam-045, iam-kb-048). El cruce con la misma forma cada trimestre produce la serie histórica que muestra si el control mejora: eso, y no la anécdota, es lo que el comité quiere ver.',
        command: '$a = Import-Csv C:\\Temp\\sod-par-a.csv; $b = Import-Csv C:\\Temp\\sod-par-b.csv; $a | Where-Object { $b.SamAccountName -contains $_.SamAccountName } | Export-Csv C:\\Temp\\sod-violaciones.csv'
      },
      {
        title: 'Analizar cada violación con su dueño del riesgo',
        detail: 'La violación detectada no se remedia sola ni siempre igual: cada caso se analiza con el dueño (¿deuda histórica, diseño del puesto, proyecto puntual?) y las salidas formales son: (a) revocar uno de los lados, (b) rediseñar el rol (iam-kb-040: la combinación recurrente suele ser un rol mal hecho), (c) excepción formal. El analista no decide la aceptación del riesgo: documenta, propone y ejecuta — la firma es del dueño del riesgo (iam-kb-015).',
        command: 'Get-ADUser -Identity ana.torres -Properties MemberOf | Select-Object -ExpandProperty MemberOf'
      },
      {
        title: 'Excepción con control compensatorio que vigile de verdad',
        detail: 'El estándar de la excepción SoD (iam-046): firma del dueño del riesgo, control compensatorio OPERATIVO (quién revisa qué, con qué frecuencia y dónde queda la evidencia: p. ej. revisión mensual de los pagos aprobados por el excepcionado, firmada por el segundo nivel) y vencimiento (90 días con re-evaluación, no "hasta que se arregle"). El control que no deja evidencia no es control: es promesa. El registro de riesgos es donde viven las excepciones activas con su fecha.',
        command: 'Get-ADGroupMember NXR-FIN-APR -Recursive | Export-Csv C:\\Temp\\sod-par-b.csv'
      },
      {
        title: 'Reportar el estado del control al comité',
        detail: 'El reporte trimestral de SoD: pares definidos (con versión de matriz), violaciones detectadas por par, estado de remediación (cerradas vs. vencidas), excepciones activas con vencimiento, y la tendencia. Es el KRI de gobernanza de accesos: el comité no pide "cero violaciones" (irreal), pide violaciones detectadas, analizadas y con decisión documentada — la diferencia entre el riesgo gestionado y el riesgo ignorado.',
        command: 'Compare-Object (Import-Csv C:\\Temp\\sod-par-a.csv) (Import-Csv C:\\Temp\\sod-par-b.csv) -Property SamAccountName -IncludeEqual | Where-Object SideIndicator -eq "==" | Measure-Object'
      }
    ],
    verification: 'La matriz SoD tiene versión, pares firmados por los dueños del riesgo y está integrada al granting, al Mover y a la campaña; el cruce trimestral corrió con la misma forma (serie histórica verificable), y toda excepción activa muestra firma, control compensatorio con evidencia y fecha de vencimiento.',
    escalation: 'Dueño del riesgo del negocio / Comité de cumplimiento (aceptaciones formales y excepciones: la decisión es del negocio con la evidencia del equipo)',
    relatedTerms: ['Separación de funciones (SoD)', 'Combinación tóxica (toxic combination)', 'Control compensatorio', 'Principio de cuatro ojos (four-eyes)', 'Matriz de riesgos', 'Registro de riesgos (risk register)'],
    relatedTickets: ['iam-045', 'iam-046']
  },
  {
    id: 'iam-kb-050',
    title: 'Landscape de plataformas IAM: build vs. buy, criterios de RFP y roadmap del analista',
    category: 'IAM - Operación & Escalado',
    environment: 'Multi',
    symptoms: 'La decisión de plataforma que ronda todos los artículos de vendors: ¿qué compramos, qué construimos y qué ya tenemos? Los síntomas del equipo en esta etapa: el RFP llega con 200 requisitos y nadie sabe cuáles pesan; cada proveedor promete "cubrir todo"; las demos enamoran y las implementaciones desilusionan; o al contrario, se sigue operando todo con AD + PowerShell + ServiceNow sin saber cuánto cuesta esa "solución gratis". Este artículo es el marco de decisión y el mapa del mercado para elegir con criterio.',
    cause: 'No es un fallo sino la naturaleza del mercado IAM: cada plataforma cubre un subconjunto de las capacidades (IdP/SSO, IGA y lifecycle, PAM, identidad de clientes, ITDR) con solapes parciales. Nexora ya opera AD + Entra ID + ServiceNow + bóveda Safeguard (los artículos de operación de esta KB son esa realidad); el gap está en la automatización del ciclo de vida y las campañas (hoy manuales, iam-kb-014/029), y el piloto Okta + la evaluación IGA son la respuesta en curso. La decisión no es "qué plataforma es la mejor del mercado": es "qué plataforma cubre EL gap de Nexora con el costo total más honesto".',
    steps: [
      {
        title: 'Mapear el paisaje propio antes de mirar el mercado',
        detail: 'El mapa de Nexora con capacidades y herramientas: fuente de autoridad (RRHH/ServiceNow), directorio (AD), nube (Entra ID), SSO (Entra + piloto Okta), tickets (ServiceNow), PAM (bóveda Safeguard, iam-kb-032), gobernanza (manual: matriz v4 + campañas con CSV). El gap analysis se hace sobre este mapa: qué duele (JML manual, campañas artesanales, role mining por CSV) y qué funciona (no se re-compra lo que ya opera bien). El mapa actualizado es la mitad de la decisión.',
        command: 'Get-ADGroup -LDAPFilter "(name=NXR-*)" | Measure-Object'
      },
      {
        title: 'Segmentar el mercado por carril, no por marca',
        detail: 'Carriles de capacidad: IdP/SSO de fuerza laboral (Entra ID, Okta, Ping, ForgeRock AM, IBM Verify — iam-kb-025/034/035/036), IGA y lifecycle y campañas (SailPoint, One Identity Manager, Oracle OIG, Saviynt, Entra ID Governance — iam-kb-029/030/033/037), PAM (CyberArk, BeyondTrust, Safeguard — iam-kb-038) y las categorías emergentes (ITDR, CIEM, identidad de clientes). Elegir el carril del gap evita el error clásico: comprar IGA cuando el dolor es SSO, o viceversa — y permite explicar al comité por qué "una sola plataforma para todo" casi nunca es la respuesta honesta.',
        command: 'Get-MgAuditLogSignIn -Top 1000 | Group-Object AppDisplayName | Sort-Object Count -Descending'
      },
      {
        title: 'Resolver build vs. buy con números, no con moda',
        detail: 'Build (AD + PowerShell + ServiceNow): el desarrollo ya está pagado y la flexibilidad es total, PERO el costo real es el mantenimiento, el conocimiento concentrado (¿quién opera el script del JML si el autor se va?) y los controles artesanales que la auditoría desconfía (iam-024, iam-029 son el costo visible del build). Buy: licencia + implementación + costo de operación del día 2. La comparación honesta suma las tres cifras a 3 años: la plataforma se compra cuando automatiza el PROCESO de gobernanza (el control auditable de punta a punta), no cuando "ahorra scripts".'
      },
      {
        title: 'Armar el RFP con requisitos pesables y PoC verificable',
        detail: 'Estructura del RFP: requisitos obligatorios (lifecycle disparado por RRHH, conectores para EL paisaje real — AD, Entra, ERP, ServiceNow —, campañas con remediación verificable, motor SoD, SCIM de salida, API abierta), deseables (role mining, ITDR básico) y excluyentes (sin conector del ERP = descalificado). Cada requisito con su prueba de PoC: la demo privada no cuenta, el PoC con datos de Nexora sí (la lección metodológica de iam-kb-029/037). Puntuación y pesos definidos ANTES de ver demos: los pesos que se mueven después son marketing.',
        command: 'Get-MgAuditLogDirectoryAudit -Top 100 | Group-Object ActivityDisplayName | Sort-Object Count -Descending'
      },
      {
        title: 'Evaluar al proveedor, no solo al producto',
        detail: 'Las preguntas que el folleto no responde: ¿cuántas implementaciones de este tamaño en la región, con referencias contactables?, ¿el equipo de implementación es del proveedor o de un partner?, ¿qué pasa con los conectores del stack propio — cada uno es costo de proyecto?, ¿roadmap de producto público y sostenible?, ¿salud financiera del vendor? La plataforma que nadie sabe operar es riesgo operativo disfrazado de ahorro: la advertencia que cierra las evaluaciones de ForgeRock y Oracle (iam-kb-034/037) vale para todas.',
        command: 'Get-ADUser -LDAPFilter "(sAMAccountName=*)" | Measure-Object'
      },
      {
        title: 'Cerrar con decisión de comité y roadmap de adopción',
        detail: 'La decisión documentada: qué se compra (carril y plataforma), qué queda en build, qué se retira (el ADFS herido de iam-036) y el roadmap de adopción en oleadas con hitos medibles (oleada 1: JML del 80% de la población; oleada 2: campañas en plataforma; oleada 3: role mining). La firma es del comité (Seguridad + IT + Procurement); el equipo aporta la matriz técnica. El roadmap evita el "big bang eterno": cada oleada entrega valor y evidencia sola, la progresión que Nexora ya usa para políticas y roles (iam-kb-009/017).',
        command: 'Get-ADGroupMember NXR-ADM-PLATAFORMA -Recursive | Measure-Object'
      },
      {
        title: 'Seguir el roadmap del analista mientras la plataforma llega',
        detail: 'La plataforma no reemplaza el criterio: el analista sigue su propio camino de madurez (modelo de madurez IAM): dominar la operación actual (los artículos de operación de esta KB, iam-kb-001..024), profundizar en diseño (roles, SoD, ciclo de vida, revocación — iam-kb-040/043/044/049), hablar el idioma de las plataformas (los artículos de vendors de este pilar) y aportar las métricas que la plataforma vendrá a mejorar (KPIs de iam-kb-022). El que sabe operar a mano es quien mejor audita a la herramienta cuando llegue.',
        command: 'Get-ADGroup -LDAPFilter "(managedBy=*)" -Properties ManagedBy | Select-Object Name,ManagedBy'
      }
    ],
    verification: 'El mapa de capacidades propio está al día con el gap identificado y priorizado, el RFP tiene requisitos pesables con pruebas de PoC definidas, y la decisión (o recomendación pendiente) quedó documentada con costos a 3 años, oleadas de adopción con hitos y dueño del roadmap.',
    escalation: 'Líder de IAM + comité de arquitectura + Procurement (decisión de inversión en plataforma: el equipo aporta el mapa técnico, el gap y los criterios; la firma y el presupuesto son del comité)',
    relatedTerms: ['Identity Governance & Administration (IGA)', 'Modelo de madurez IAM', 'KPIs de IAM', 'Build vs. buy', 'Análisis de brechas (gap analysis)', 'Identity Fabric'],
    relatedTickets: ['iam-029', 'iam-023']
  },
];

/** Índice id → artículo (para resolver kbRef de tickets sin buscar). */
export const IAM_KB_BY_ID: Map<string, IamKbArticle> = new Map(
  IAM_KB_ARTICLES.map((a) => [a.id, a])
);
