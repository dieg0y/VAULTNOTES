/**
 * iamKB — 24 artículos de la base de conocimiento IAM (SIMULADOS —
 * empresa ficticia Nexora S.A., equipo IAM "Identity & Access
 * Management"). Dataset ESTÁTICO de solo lectura (viene de fábrica, no
 * vive en Dexie ni en el backup). relatedTickets referencia tickets
 * plausibles del dataset iam-XXX (iam-001..iam-024 generales,
 * iam-027..iam-050 proyecto final "primera semana IAM").
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
  }
];

/** Índice id → artículo (para resolver kbRef de tickets sin buscar). */
export const IAM_KB_BY_ID: Map<string, IamKbArticle> = new Map(
  IAM_KB_ARTICLES.map((a) => [a.id, a])
);
