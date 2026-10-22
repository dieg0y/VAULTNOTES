/**
 * troubleshootingIam.ts — ESCALERAS DE DECISIÓN del PILAR 1 (IAM · Identity &
 * Access Management).
 *
 * Reestructuración Pilar IAM: 18 guías TS-IAM-001..TS-IAM-018. NO es una copia
 * de los runbooks: el runbook describe el procedimiento completo de
 * remediación; aquí lo que importa es DIAGNOSTICAR (¿dónde está el problema?)
 * con la escalera
 *
 *   PROBLEMA → SÍNTOMA → CHECK → RESULTADO → SIGUIENTE ACCIÓN
 *
 * Cada check arranca por lo más barato (mirar el estado, un comando copiable)
 * y el campo next RAMIFICA: si X → peldaño A, si Y → peldaño B. La remediación
 * final vive en el runbook correspondiente del pilar.
 */

import { type PillarTroubleshooting } from './troubleshootingCore';

export const TROUBLESHOOTING_IAM: PillarTroubleshooting[] = [
  {
    id: 'TS-IAM-001',
    pillar: 'IAM',
    title: 'El usuario no puede iniciar sesión',
    problem: 'Un usuario no entra a su cuenta y la escalera separa las cinco causas clásicas: contraseña, bloqueo, MFA, SSO o cuenta deshabilitada.',
    symptoms: [
      'El usuario reporta "no me deja entrar" sin más detalle (o con el error literal de la pantalla).',
      'Reintentos fallidos y tickets repetidos del mismo usuario en pocos minutos.',
      'A veces entra desde el móvil pero no desde el portátil (o al revés).',
    ],
    level: 'Contraseña vs Bloqueo vs MFA vs SSO vs Cuenta deshabilitada',
    checks: [
      {
        check: 'El resultado exacto del sign-in',
        command: 'SigninLogs | where UserPrincipalName == "{{USERNAME}}" and TimeGenerated > ago(2h) | project TimeGenerated, ResultType, ResultDescription, AppDisplayName, ConditionalAccessStatus | order by TimeGenerated desc',
        result: 'El código de error exacto del último intento (ResultType con su descripción).',
        next: '50126: usuario o contraseña incorrectos (check 2). 50053: cuenta bloqueada por intentos (check 3). 50076 o 500121: MFA (check 4). Bucle o AADSTS50058 solo en una app: SSO (check 5). 50057: cuenta deshabilitada (check 6).',
      },
      {
        check: 'Contraseña: estado y vigencia en AD',
        command: 'Get-ADUser {{SAM}} -Properties Enabled, PasswordExpired, PasswordLastSet, AccountExpirationDate | fl SamAccountName, Enabled, PasswordExpired, PasswordLastSet, AccountExpirationDate',
        result: 'Enabled True, PasswordExpired False y PasswordLastSet coherente con la última rotación de la política de dominio.',
        next: 'Si PasswordExpired True o PasswordLastSet supera la vigencia de la política: reset de contraseña y cambio forzado en el próximo inicio. Si la contraseña es válida y no expiró: bloqueo (check 3).',
      },
      {
        check: 'Bloqueo y origen de los intentos fallidos',
        command: 'Get-ADUser {{SAM}} -Properties LockedOut, lockoutTime | fl SamAccountName, LockedOut, lockoutTime',
        result: 'LockedOut False (o True con lockoutTime reciente si el lockout está activo).',
        next: 'Si True: Unlock-ADAccount para recuperar el acceso y cazar el ORIGEN de los fallos (4740 en el DC dice desde qué equipo): credencial vieja en un móvil, unidad mapeada o spray (TS-SOC-002); desbloquear sin cazar el origen garantiza la recaída. Si False: MFA (check 4).',
      },
      {
        check: 'MFA: métodos registrados',
        command: 'Get-MgUserAuthenticationMethod -UserId {{USERNAME}} | fl Id, AdditionalProperties',
        result: 'Al menos un método utilizable (app authenticator, teléfono o passkey) en el usuario.',
        next: 'Si no hay métodos o el único vive en un dispositivo que el usuario ya no tiene: re-registro con Access Pass temporal (TS-IAM-003). Si hay métodos pero el código no llega: TS-IAM-002. Si el fallo es 500121: el usuario no responde al prompt, no es que no llegue.',
      },
      {
        check: 'SSO: ¿falla todo o solo una app?',
        command: 'SigninLogs | where UserPrincipalName == "{{USERNAME}}" and ResultType != 0 and TimeGenerated > ago(2h) | distinct AppDisplayName, ResultType | take 10',
        result: 'Falla solo la app reportada o falla también el portal (login.microsoftonline.com).',
        next: 'Si SOLO una app falla con AADSTS (bucle, 50058, 50011): el problema es de la app, no del usuario (TS-IAM-004). Si falla todo incluido el portal: la causa es de cuenta, bloqueo o MFA (checks 2 a 4).',
      },
      {
        check: 'Cuenta deshabilitada o eliminada por proceso',
        command: 'Get-MgUser -UserId {{USERNAME}} -Property DisplayName, AccountEnabled | fl DisplayName, AccountEnabled',
        result: 'AccountEnabled True en Entra (y Enabled True en AD, check 2).',
        next: 'Si False: alguien lo deshabilitó (offboarding, access review o limpieza): confirmar con RRHH/IAM ANTES de rehabilitar; reactivar por reflejo a un despedido es hallazgo de auditoría. Si True en Entra pero falla on-prem: revisar Enabled en AD (check 2).',
      },
    ],
    remediation: '30% contraseña expirada o cambiada y olvidada, 25% bloqueo por intentos fallidos (a menudo una credencial vieja guardada en un dispositivo), 20% MFA sin métodos o con dispositivo nuevo, 15% cuenta deshabilitada por proceso de RRHH, 10% fallo puntual del SSO de una app concreta.',
    verification: 'El usuario inicia sesión desde su equipo y desde el portal de Microsoft 365 con la sesión anterior cerrada, y SigninLogs registra ResultType 0 para el intento.',
    tags: ['signin', 'login', 'contrasena', 'lockout', 'cuenta bloqueada', 'mfa', '50053', '50057', 'cuenta deshabilitada', 'sso'],
  },
  {
    id: 'TS-IAM-002',
    pillar: 'IAM',
    title: 'El código MFA no llega',
    problem: 'El usuario pasa su contraseña pero el segundo factor no aparece y hay que ubicar si es la app authenticator (TOTP), el SMS o la notificación push.',
    symptoms: [
      'El prompt de MFA se queda esperando y expira sin código ni notificación.',
      'El SMS llega tarde o no llega; la app authenticator no genera el evento.',
      'Otros usuarios entran normal a la misma hora.',
    ],
    level: 'App TOTP vs SMS vs Push vs Servicio MFA',
    checks: [
      {
        check: 'Qué método espera y cuáles tiene registrados',
        command: 'Get-MgUserAuthenticationMethod -UserId {{USERNAME}} | fl Id, AdditionalProperties',
        result: 'La lista real de métodos: authenticator (TOTP/push), teléfono (SMS) u otros.',
        next: 'Si el usuario espera un método que NO está en la lista (pide SMS pero solo tiene app): está eligiendo mal la opción en el prompt o su método por defecto cambió: que use uno de los registrados o re-registre (TS-IAM-003). Si el método existe: seguir su rama (checks 2 a 4).',
      },
      {
        check: 'App authenticator: reloj del teléfono',
        result: 'El código TOTP que muestra la app es aceptado por el servicio.',
        next: 'Si la app genera códigos que el servidor rechaza: la hora del teléfono está desviada (TOTP depende del reloj): sincronizar hora automática y reintentar. Si la app pide re-escanear o muestra la cuenta sin códigos: el registro quedó corrupto en el cambio de teléfono: re-registrar (TS-IAM-003).',
      },
      {
        check: 'SMS: número registrado y cobertura',
        command: 'Get-MgUserAuthenticationPhoneMethod -UserId {{USERNAME}} | fl Id, PhoneNumber',
        result: 'El número registrado es el teléfono actual del usuario.',
        next: 'Si el número es viejo (línea devuelta o prepago cambiado): actualizarlo desde aka.ms/mfasetup con una sesión ya autenticada o con Access Pass temporal. Si el número es correcto pero no llega nada: cobertura del operador o bloqueo de SMS corporativo: probar app o push mientras tanto.',
      },
      {
        check: 'Push: ¿llega y se aprueba?',
        result: 'La notificación llega al teléfono y el number matching se completa.',
        next: 'Si llega pero no la ve: notificaciones de la app deshabilitadas en el teléfono o modo no molestar: revisar el sistema operativo, no Entra. Si la aprueba y expira igual: la aprobación llegó fuera de ventana (reloj o latencia): reintentar sin demora. Si le llegan pushes que él NO pidió: fatiga de MFA, cuenta bajo ataque (TS-SOC-001).',
      },
      {
        check: 'Alcance: uno, varios o todos los usuarios',
        command: 'SigninLogs | where TimeGenerated > ago(1h) and ResultType in (50076, 500121) | summarize cnt = count() by bin(TimeGenerated, 15m)',
        result: 'Errores de MFA aislados a este usuario, sin pico global en el tenant.',
        next: 'Si el pico golpea a TODOS a la vez: incidente del servicio MFA (revisar el estado del servicio y abrir caso con Microsoft), no del teléfono del usuario. Si es solo este usuario: checks 2 a 4.',
      },
      {
        check: 'Vía de escape: método alternativo o Access Pass',
        command: 'New-MgUserAuthenticationTemporaryAccessPassMethod -UserId {{USERNAME}} -LifetimeInMinutes 60 -IsUsableOnce $true',
        result: 'Un código temporal de un solo uso con el que el usuario entra y re-registra métodos.',
        next: 'Antes de emitir el Access Pass, probar "Tengo otro método" en el prompt (o el código TOTP de la app, que no depende de red). Si nada sirve: entregar el Access Pass por canal verificado (presencial o teléfono fijo conocido, nunca por email) y re-registrar todo en la MISMA sesión (TS-IAM-003).',
      },
    ],
    remediation: '35% dispositivo nuevo sin re-registrar los métodos, 25% hora del teléfono desviada (códigos TOTP inválidos), 20% número de teléfono viejo para SMS, 10% notificaciones de la app bloqueadas en el teléfono, 10% incidente puntual del servicio MFA.',
    verification: 'El usuario completa un sign-in de prueba con su método principal y aka.ms/mfasetup muestra los métodos correctos y actualizados.',
    tags: ['mfa', 'totp', 'otp', 'sms', 'push', 'authenticator', 'number matching', 'access pass', '50076', 'mfa fatigue'],
  },
  {
    id: 'TS-IAM-003',
    pillar: 'IAM',
    title: 'Teléfono nuevo: MFA hay que re-registrar',
    problem: 'El usuario cambió de teléfono y sus métodos MFA quedaron en el dispositivo anterior: hay que re-registrarlos sin dejarlo fuera de la cuenta.',
    symptoms: [
      'La app authenticator nueva no muestra las cuentas o pide un QR que nadie conserva.',
      'Los push llegan al teléfono viejo (o ya no llegan a ninguno).',
      'El usuario no puede re-registrar solo: el registro pide un segundo factor que ya no tiene.',
    ],
    level: 'Dispositivo vs Métodos registrados vs Access Pass vs Limpieza',
    checks: [
      {
        check: 'Los métodos que quedaron huérfanos',
        command: 'Get-MgUserAuthenticationMethod -UserId {{USERNAME}} | fl Id, AdditionalProperties',
        result: 'La lista de métodos actuales: los que apuntan al dispositivo anterior o una lista vacía.',
        next: 'Si hay métodos viejos: van a quedar inservibles (las claves TOTP viven dentro del teléfono): planificar su limpieza tras el re-registro para no dejar métodos zombie (check 4). Si no hay ninguno: directamente al Access Pass (check 3).',
      },
      {
        check: '¿Puede re-registrar por sí mismo?',
        result: 'El usuario conserva alguna vía válida: sesión ya autenticada o SMS a un número vigente.',
        next: 'Si aún tiene la sesión abierta en el portátil (Teams u Outlook): añadir la app nueva desde aka.ms/mfasetup ANTES de cerrar sesión y con el QR de la app nueva a mano. Si no le queda ninguna vía: el administrador emite el Access Pass temporal (check 3).',
      },
      {
        check: 'Access Pass temporal (TAP)',
        command: 'New-MgUserAuthenticationTemporaryAccessPassMethod -UserId {{USERNAME}} -LifetimeInMinutes 60 -IsUsableOnce $true',
        result: 'Un código temporal de un solo uso que permite iniciar sesión y registrar métodos.',
        next: 'Entregar el código por un canal VERIFICADO (presencial o teléfono fijo conocido, nunca por un email que podría estar comprometido) y que el usuario entre con usuario y Access Pass directamente en aka.ms/mfasetup para registrar app, SMS y passkey en la MISMA sesión.',
      },
      {
        check: 'Limpieza de los métodos viejos',
        command: 'Remove-MgUserAuthenticationPhoneMethodById -UserId {{USERNAME}} -PhoneAuthenticationMethodId {{METHOD_ID}}',
        result: 'Solo quedan métodos que viven en el dispositivo nuevo.',
        next: 'Si sobreviven métodos del teléfono anterior (push o SMS viejo): eliminarlos uno a uno; un push que cae a un teléfono vendido es una puerta trasera. Si el teléfono viejo se recicló a OTRO empleado: urgente, es caso de seguridad, no de soporte: revocar sesiones (TS-SOC-001).',
      },
      {
        check: 'Registro combinado con SSPR',
        result: 'Los mismos métodos quedan disponibles para el autoservicio de contraseña (SSPR).',
        next: 'Si el registro se hizo desde aka.ms/mfasetup con política de registro combinado: SSPR queda cubierto con la misma app. Si el tenant tiene registro NO combinado: SSPR exige registro aparte en aka.ms/ssprsetup: registrar ahí también o el usuario quedará sin vía de recuperación de contraseña.',
      },
      {
        check: 'Prevención para el resto de la plantilla',
        result: 'El caso documentado y la guía de reemplazo de teléfono accesible para todos.',
        next: 'Publicar el procedimiento (registrar la app nueva ANTES de entregar el teléfono viejo, o guardar el QR de recuperación de la cuenta) y evaluar passkeys o Windows Hello for Business como método primario: migran mejor entre dispositivos que TOTP. Dejar el caso como material de concienciación de IAM.',
      },
    ],
    remediation: '40% el usuario no sabía que los métodos no migran y devolvió el teléfono viejo ya borrado, 30% intentó re-registrar solo y se bloqueó (el registro pide un factor que ya no tiene), 20% la app nueva se registró pero quedaron métodos viejos vivos en el teléfono anterior, 10% el teléfono viejo pasó a otro usuario con los pushes activos (riesgo de seguridad).',
    verification: 'El usuario inicia sesión de extremo a extremo con el teléfono nuevo (contraseña más MFA), aka.ms/mfasetup muestra solo los métodos vigentes y una prueba de SSPR en aka.ms/sspr funciona de punta a punta.',
    tags: ['mfa', 're-registro', 'telefono nuevo', 'authenticator', 'access pass', 'tap', 'sspr', 'passkey', 'qr', 'metodos'],
  },
  {
    id: 'TS-IAM-004',
    pillar: 'IAM',
    title: 'Loop o error de SSO al abrir una app',
    problem: 'Al abrir una aplicación integrada el navegador rebota entre portales sin entrar y hay que separar la sesión local, la configuración de la app en Entra y el estado del proveedor.',
    symptoms: [
      'La app abre, redirige a login.microsoftonline.com y vuelve a la app sin sesión (bucle).',
      'Pantalla de error con código AADSTS50011, AADSTS50058 o AADSTS65001.',
      'Solo afecta a esa app (o solo a una parte de sus usuarios).',
    ],
    level: 'Sesión/Navegador vs App en Entra vs Alcance vs Servicio del proveedor',
    checks: [
      {
        check: 'El código AADSTS exacto',
        command: 'SigninLogs | where AppDisplayName == "{{APP_NAME}}" and TimeGenerated > ago(4h) | project TimeGenerated, UserPrincipalName, ResultType, ResultDescription | order by TimeGenerated desc | take 10',
        result: 'El código AADSTS con la descripción literal del fallo.',
        next: 'AADSTS50058 (sesión silenciosa no encontrada): cookies o bloqueadores (check 2). AADSTS50011 (reply URL distinta): configuración de la app (check 4). AADSTS65001 (consentimiento): permisos (check 5). Bucle sin código visible: comparar usuario y alcance (check 3).',
      },
      {
        check: 'Sesión del navegador (lo más barato)',
        result: 'Una ventana InPrivate o otro navegador reproduce o descarta el fallo.',
        next: 'Si en InPrivate ENTRA: estado del navegador del usuario: limpiar cookies de login.microsoftonline.com y de la app, revisar extensiones bloqueadoras y reintentar normal. Si en InPrivate también falla: no es su sesión (check 3).',
      },
      {
        check: 'Alcance: quién y desde dónde falla',
        result: 'Falla solo un usuario, solo un grupo o todos los usuarios de la app.',
        next: 'Si es un solo usuario: sesión o atributos propios (grupo de la app, licencia): comparar con un compañero que sí entra. Si es un grupo: asignación o Conditional Access que la app dispara (TS-IAM-011). Si son todos: configuración de la app o lado del proveedor (checks 4 a 6).',
      },
      {
        check: 'Configuración de la app (redirect URIs y SP)',
        command: 'Get-MgServicePrincipal -All | Where-Object { $_.DisplayName -eq "{{APP_NAME}}" } | fl DisplayName, AppId, SignInAudience',
        result: 'El service principal existe y su app registration tiene las redirect URIs vigentes.',
        next: 'Si la app cambió de URL hace poco (dominio nuevo, portal migrado): la redirect URI nueva falta en App registrations → Authentication: añadirla (o el proveedor debe corregirla): es el clásico del 50011. Si las URIs están bien: lado del proveedor (check 6).',
      },
      {
        check: 'Consentimiento y permisos',
        result: 'La pantalla de consentimiento aparece y al aceptar la app entra.',
        next: 'Si AADSTS65001 o la app pide permisos que nadie concedió: falta admin consent: concederlo en Enterprise applications → {{APP_NAME}} → Permissions (o App registrations → API permissions → Grant admin consent). Si el consent ya está pero un usuario nuevo no entra: revisar la asignación Users and groups de la app.',
      },
      {
        check: 'Estado del lado del proveedor',
        command: 'SigninLogs | where AppDisplayName == "{{APP_NAME}}" and TimeGenerated > ago(24h) | summarize fails = countif(ResultType != 0), total = count() | project pct_fallos = round(fails * 100.0 / total)',
        result: 'Tasa de fallo de la app en 24 h (y la hora en que empezó).',
        next: 'Si el fallo empieza a una hora exacta y afecta a todos: el proveedor desplegó un cambio (metadatos SAML, certificado vencido o URL nueva): abrir ticket con el proveedor con el código AADSTS y la hora exacta. Si los fallos son dispersos: sesiones individuales (check 2).',
      },
    ],
    remediation: '30% redirect URI desactualizada tras un cambio del proveedor (AADSTS50011), 25% cookies o bloqueadores del navegador (AADSTS50058, descartable con InPrivate), 20% consentimiento de permisos pendiente (65001), 15% cambio o certificado del lado del proveedor (SAML), 10% Conditional Access que dispara en esa app.',
    verification: 'La app abre de extremo a extremo desde el navegador normal del usuario (sin ventana privada) y SigninLogs registra el ResultType 0 del acceso.',
    tags: ['sso', 'aadsts', 'loop sso', '50011', '50058', '65001', 'redirect uri', 'service principal', 'saml', 'consentimiento'],
  },
  {
    id: 'TS-IAM-005',
    pillar: 'IAM',
    title: 'Permisos no aplican tras añadir a un grupo',
    problem: 'Se añadió al usuario al grupo correcto y la aplicación sigue sin darle acceso: la causa casi nunca es el grupo sino el token que la app aún usa.',
    symptoms: [
      'El usuario ve "acceso denegado" o la opción no aparece en la app.',
      'El portal y PowerShell lo muestran como miembro del grupo.',
      'Horas después el acceso aparece solo, sin que nadie toque nada.',
    ],
    level: 'Membresía real vs Grupo correcto vs Token en caché vs Aplicación',
    checks: [
      {
        check: 'Miembro del grupo, de verdad y hace rato',
        command: 'Get-MgGroupMember -GroupId {{GROUP_ID}} -All | Where-Object { $_.Id -eq "{{USER_ID}}" }',
        result: 'El usuario listado como miembro del grupo en Entra ID.',
        next: 'Si NO aparece: la adición falló o fue a otro grupo homónimo: buscar por ObjectId, nunca por nombre visible. Si aparece: la app aún no lo ha visto (check 3).',
      },
      {
        check: 'El grupo que la app realmente lee',
        result: 'El grupo asignado a la app o al rol interno es EXACTAMENTE el que se modificó.',
        next: 'Si la app está asignada a otro grupo (o su rol interno lee un grupo distinto): añadirlo al correcto. Si la app no soporta grupos anidados y el usuario se añadió INDIRECTO (grupo dentro de grupo): moverlo al grupo plano que la app lee; apps SAML y heredadas suelen aplanar la membresía.',
      },
      {
        check: 'El token que la app sostiene',
        result: 'La app re-emite el token con los grupos nuevos al expirar el actual.',
        next: 'Si el alta tiene menos de 60-90 minutos: cerrar sesión COMPLETA del usuario (en la app y en el portal) y reabrir: si entra, era el token. Si sigue igual tras re-login: la app cachea la membresía en su propia base (check 4).',
      },
      {
        check: 'Caché interna de la app (provisión SCIM)',
        command: 'ProvisioningLogs | where TimeGenerated > ago(24h) | take 20',
        result: 'El job de provisión procesó el cambio (o queda registrado el error por usuario).',
        next: 'Si la app se aprovisiona por SCIM y el job no corrió o marcó skipped o failure: forzar Provision on demand desde Enterprise applications → Provisioning y leer el error de ESE usuario. Si la app lee los grupos en runtime: el problema era el token (check 3).',
      },
      {
        check: 'Origen del grupo: dinámico, asignado o sincronizado',
        command: 'Get-MgGroup -GroupId {{GROUP_ID}} -Property DisplayName, GroupTypes, MembershipRule | fl DisplayName, GroupTypes, MembershipRule',
        result: 'GroupTypes acorde al diseño: asignado, dinámico (DynamicMembership) o espejo de AD.',
        next: 'Si el grupo es DINÁMICO y el usuario no cumple la regla (departamento, atributo del manager): la membresía jamás llegará: corregir el atributo del usuario o la regla. Si el grupo se SINCRONIZA desde AD: la membresía se edita en AD, no en la nube; el cambio hecho en Entra se revierte en el próximo ciclo (TS-IAM-006).',
      },
      {
        check: 'El caso on-prem: token de inicio de sesión de Windows',
        command: 'klist purge',
        result: 'Tickets Kerberos locales purgados (apps que resuelven permisos con Kerberos).',
        next: 'Si la app es on-prem con autenticación de Windows y el grupo es de dominio: cerrar la sesión de WINDOWS del usuario (el token es de la sesión, no de la app): cerrar solo la app no alcanza. Si tras todo esto sigue igual: abrir caso con el dueño de la app llevando ObjectId del usuario, ObjectId del grupo y hora exacta del alta.',
      },
    ],
    remediation: '40% token o sesión en caché (esperar la expiración de 60-90 min o forzar re-login), 20% grupo equivocado u homónimo (se modificó otro), 15% la app no soporta grupos anidados, 10% grupo dinámico cuyo atributo no cumple la regla, 10% grupo sincronizado de AD editado en la nube (se revierte), 5% job de provisión SCIM sin correr.',
    verification: 'Tras un sign-in nuevo del usuario la app muestra el acceso y, si la app se aprovisiona, ProvisioningLogs registra al usuario como provisionado sin errores.',
    tags: ['grupos', 'group membership', 'token cache', 'prt', 'klist', 'grupo dinamico', 'scim', 'provisioning', 'nested groups', 'acceso denegado'],
  },
  {
    id: 'TS-IAM-006',
    pillar: 'IAM',
    title: 'Sincronización AD↔Entra ID retrasada o fallida',
    problem: 'Los cambios hechos en AD (altas, grupos, atributos) no aparecen en Entra ID o tardan horas y hay que ubicar si es el scheduler, un error del conector o el filtrado.',
    symptoms: [
      'Un usuario creado en AD no aparece en Microsoft 365 horas después.',
      'Entra Connect Health o el servidor muestran ciclos con errores o sin correr.',
      'Cambios de grupo o de atributos quedan a medias entre nube y on-prem.',
    ],
    level: 'Scheduler vs Errores del conector vs Filtrado vs Contraseñas (PHS)',
    checks: [
      {
        check: 'Último ciclo y estado del scheduler',
        command: 'Get-ADSyncScheduler | fl SyncCycleEnabled, MaintenanceModeEnabled, NextSyncCycleStartTimeType, NextSyncCycleStartTime',
        result: 'SyncCycleEnabled True, MaintenanceModeEnabled False y el último ciclo hace menos de 30 minutos.',
        next: 'Si SyncCycleEnabled False o MaintenanceMode True: alguien lo apagó (mantenimiento olvidado tras un upgrade de Entra Connect): Start-ADSyncSyncCycle -PolicyType Delta y reactivar el scheduler. Si el ciclo corre pero los objetos no llegan: errores del conector (check 3).',
      },
      {
        check: '¿El objeto llegó a Entra?',
        command: 'Get-MgUser -All -Property Id, DisplayName, UserPrincipalName, OnPremisesSamAccountName, OnPremisesSyncEnabled | Where-Object { $_.OnPremisesSamAccountName -eq "{{SAM}}" } | fl DisplayName, UserPrincipalName, OnPremisesSyncEnabled',
        result: 'El usuario aparece en Entra con OnPremisesSyncEnabled True y atributos recientes.',
        next: 'Si aparece pero con atributos viejos: el delta no lo tomó (check 3). Si NO aparece: filtrado o error de exportación (checks 4 y 3).',
      },
      {
        check: 'Errores del último ciclo',
        result: 'Synchronization Service Manager → Operations sin entradas en rojo en las últimas horas.',
        next: 'Si hay una EXPORTACIÓN fallida al conector de Entra (attributeValueMustBeUnique, proxyAddresses en conflicto, UPN con formato inválido): leer el error del objeto, corregir en AD y re-sincronizar. Si el error es en la IMPORTACIÓN de AD: permisos o conectividad de la cuenta del conector hacia los DC (TS-SA-004 si la replicación de fondo está enferma).',
      },
      {
        check: 'Filtrado: ¿la OU del objeto está dentro?',
        command: 'Get-ADUser {{SAM}} -Properties DistinguishedName, UserPrincipalName | fl DistinguishedName, UserPrincipalName',
        result: 'El DN del usuario dentro de una OU incluida en el filtrado de Entra Connect.',
        next: 'Si la OU del usuario quedó fuera del filtrado (dominio, OU o grupo seleccionado en el asistente): el objeto JAMÁS sincronizará: mover de OU o ampliar el filtrado y documentar el cambio. Si está dentro: volver al error del objeto (check 3).',
      },
      {
        check: 'Sincronización de contraseñas (PHS)',
        command: 'Get-WinEvent -LogName "ADSync/Operational" -MaxEvents 100 | Where-Object { $_.Id -in (651, 652, 610, 611) } | fl TimeCreated, Id, Message',
        result: 'Eventos 651/652 (cambios de contraseña en cola) recientes y heartbeat presente, sin errores persistentes.',
        next: 'Si los cambios de contraseña no suben (el usuario entra con la clave NUEVA on-prem pero la nube pide la vieja): revisar la cuenta de servicio de PHS y sus permisos en AD y reiniciar el servicio ADSync en ventana. Si PHS está sano: atributos y UPN (check 3).',
      },
      {
        check: 'Servicios del servidor Entra Connect',
        command: 'Get-Service ADSync* | ft Name, Status, StartType',
        result: 'Microsoft Azure AD Sync (ADSync) en Running.',
        next: 'Si Stopped o en bucle de arranque: levantarlo y leer el visor de eventos ADSync; el arranque en bucle suele ser la cuenta de servicio bloqueada o con contraseña vencida (caso hermano de TS-IAM-008). Si está Running: escalar con el error exacto del conector del check 3.',
      },
    ],
    remediation: '30% errores de exportación por UPN o proxyAddresses duplicados (attributeValueMustBeUnique), 20% objeto fuera del filtrado de OU, 15% scheduler detenido u olvidado en modo mantenimiento, 15% errores de atributo en el delta (formato de UPN, carácter no válido), 10% cuenta de servicio ADSync bloqueada, 10% conectividad o replicación AD de fondo (TS-SA-004).',
    verification: 'Un cambio de prueba hecho en AD (un atributo del usuario) aparece en Entra ID en menos de un ciclo (30 minutos) y la vista Operations del conector queda sin errores.',
    tags: ['entra connect', 'ad sync', 'adsync', 'delta sync', 'scheduler', 'phs', 'password hash sync', 'attributevaluemustbeunique', 'filtrado', 'proxyaddresses'],
  },
  {
    id: 'TS-IAM-007',
    pillar: 'IAM',
    title: 'Licencia M365 no asigna o falla la activación',
    problem: 'El usuario no recibe su licencia de Microsoft 365 o las apps no activan y la escalera separa asignación, usage location, grupo de licencias y capacidad de la suscripción.',
    symptoms: [
      'Outlook o Teams reportan que el usuario no tiene licencia o el producto está deshabilitado.',
      'El portal muestra al usuario Sin licencia o la activación de Office falla.',
      'El alta terminó hace días y el usuario sigue sin correo, Teams o OneDrive.',
    ],
    level: 'Asignación vs Usage location vs Grupo de licencias vs Suscripción',
    checks: [
      {
        check: 'Las licencias actuales del usuario',
        command: 'Get-MgUserLicenseDetail -UserId {{USERNAME}} | ft SkuPartNumber, SkuId',
        result: 'La SKU esperada (p. ej. SPE_E3 o SPE_E5) listada y sin errores de aprovisionamiento.',
        next: 'Si no hay licencia: asignación (check 3). Si la SKU está pero las apps siguen quejándose: plan de servicio deshabilitado (check 2). Si hay estados de error en la asignación: capacidad o suscripción (check 5).',
      },
      {
        check: 'El plan de servicio concreto dentro de la SKU',
        result: 'Los planes que la app usa (EXCHANGE_S_STANDARD, TEAMS1, OFFICE) habilitados en esa asignación.',
        next: 'Si la licencia existe pero el plan concreto está deshabilitado en la asignación: habilitarlo en Licencias del usuario o revisar el grupo de licencias que solo habilita parte de los planes (check 3). Si todos los planes están: activación del cliente (check 6).',
      },
      {
        check: 'Cómo se asigna: directa o por grupo',
        command: 'Get-MgUserMemberOf -UserId {{USERNAME}} -All | ForEach-Object { Get-MgGroup -GroupId $_.Id -Property DisplayName, AssignedLicenses } | Where-Object { $_.AssignedLicenses.Count -gt 0 } | ft DisplayName',
        result: 'El grupo de licencias al que el usuario debería pertenecer.',
        next: 'Si NO está en el grupo de licencias: añadirlo (proceso de alta) y esperar: la licencia por grupo tarda minutos en aplicar. Si está pero sin licencia: el grupo está en error por falta de unidades (check 5) o falta el usage location (check 4).',
      },
      {
        check: 'Usage location (requisito previo)',
        command: 'Get-MgUser -UserId {{USERNAME}} -Property DisplayName, UsageLocation | fl UsageLocation',
        result: 'UsageLocation con un código de país válido (p. ej. ES).',
        next: 'Si está vacío: la asignación falla siempre con "se requiere ubicación de uso con licencia": Update-MgUser -UserId {{USERNAME}} -UsageLocation ES y reintentar la licencia. Si está bien: capacidad (check 5).',
      },
      {
        check: 'Capacidad de la suscripción',
        command: 'Get-MgSubscribedSku -All | ft SkuPartNumber, ConsumedUnits, @{n="Libres";e={$_.PrepaidUnits.Enabled - $_.ConsumedUnits}}',
        result: 'Unidades libres en la SKU que se quiere asignar.',
        next: 'Si ConsumedUnits iguala Enabled: no quedan licencias: comprar o liberar las de usuarios salidos que aún las tienen (TS-IAM-009); el grupo de licencias queda en error hasta entonces. Si hay libres: activación o aprovisionamiento (check 6).',
      },
      {
        check: 'Activación en el cliente de Office',
        result: 'Office activa tras cerrar la sesión y volver a entrar con la cuenta licenciada.',
        next: 'Si la licencia está y la app sigue sin activar: cerrar sesión COMPLETA de Office (Archivo → Cuenta → Cerrar sesión), limpiar las credenciales del Administrador de credenciales de Windows y re-entrar. Si persiste: probar en office.com; si la web funciona, el problema es del cliente: reparar la instalación de Office.',
      },
    ],
    remediation: '30% el usuario nunca entró al grupo de licencias (alta incompleta), 25% sin UsageLocation seteado, 20% suscripción sin unidades libres, 15% plan de servicio deshabilitado dentro de la SKU, 10% cliente de Office con sesión o credenciales viejas.',
    verification: 'El usuario abre office.com y Teams sin mensajes de licencia y Get-MgUserLicenseDetail muestra la SKU completa sin errores de aprovisionamiento durante 24 horas.',
    tags: ['licencias', 'm365', 'sku', 'usage location', 'grupo de licencias', 'office activation', 'teams', 'subscribedsku', 'plan de servicio'],
  },
  {
    id: 'TS-IAM-008',
    pillar: 'IAM',
    title: 'Cuenta de servicio con contraseña expirada',
    problem: 'Un servicio o job que corría hace días dejó de autenticar y la escalera apunta a la vigencia de la contraseña de su cuenta de servicio antes de culpar a la aplicación.',
    symptoms: [
      'El servicio cayó o el job falla con "usuario o contraseña incorrectos" sin cambios en el código.',
      'Eventos 4625 o logs de la app con fallos de inicio de sesión para una cuenta que nadie toca.',
      'La caída coincide con la fecha en que la contraseña cumplió la política de expiración.',
    ],
    level: 'Expiración de la cuenta vs Configuración del servicio vs Consumidores del secreto vs Diseño (MSA)',
    checks: [
      {
        check: 'La fecha que lo delata',
        command: 'Get-ADUser {{SVC_ACCOUNT}} -Properties Enabled, PasswordExpired, PasswordLastSet, PasswordNeverExpires | fl Name, Enabled, PasswordExpired, PasswordLastSet, PasswordNeverExpires',
        result: 'PasswordLastSet dentro de la vigencia del dominio y PasswordExpired False.',
        next: 'Si PasswordLastSet supera la vigencia del dominio y PasswordExpired True: la contraseña venció y el servicio siguió presentando la vieja: esa es la causa. Si no venció: el fallo es otro (check 2).',
      },
      {
        check: 'Los fallos exactos y su fecha',
        command: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4625} -MaxEvents 300 | Where-Object Message -match "{{SVC_ACCOUNT}}" | fl TimeCreated, Message | Select-Object -First 3',
        result: 'Fallos 4625 repetidos para la cuenta desde la hora exacta en que el servicio cayó.',
        next: 'Si el Sub Status es 0xC000006A (contraseña incorrecta) y empezó tras la fecha de vencimiento: confirmado. Si el Sub Status es 0xC0000072 (cuenta deshabilitada): alguien la deshabilitó en una limpieza de cuentas inactivas: rehabilitar solo con el aval del dueño del sistema. Si el 4625 apunta a otra cuenta: la del check 1 no es la que falla.',
      },
      {
        check: 'Recuperación controlada del servicio',
        result: 'La nueva contraseña seteada en AD y en TODOS los consumidores, con su dueño delante.',
        next: 'Rotar la contraseña (Set-ADAccountPassword) y actualizarla en todos los sitios que la usan (servicio de Windows, cadena de conexión del job, gestor de secretos): rotar a medias es recaída inmediata. Reiniciar el servicio, confirmar arranque limpio y levantar el inventario de consumidores (check 5).',
      },
      {
        check: 'Por qué quedó expuesta a expirar',
        command: 'Get-ADUser {{SVC_ACCOUNT}} -Properties PasswordNeverExpires, CannotChangePassword | fl Name, PasswordNeverExpires, CannotChangePassword',
        result: 'PasswordNeverExpires True (lo correcto para cuentas de servicio con contraseña estática).',
        next: 'Si quedó False: la cuenta nació con la política de expiración del dominio y nadie la marcó: setear PasswordNeverExpires True (y CannotChangePassword True si nada la rota). Si YA estaba True y aun así falla: alguien cambió la contraseña (revisar 4723/4724 en el DC) o el servicio quedó con la vieja tras una restauración.',
      },
      {
        check: 'Cuántos sistemas usan esa cuenta',
        result: 'Inventario de consumidores de la cuenta (servicios, tareas programadas, aplicaciones).',
        next: 'Si hay más de un consumidor: cada uno guarda la contraseña por su lado y el próximo vencimiento o rotación los romperá a todos a la vez y sin lista previa. Si es uno solo y documentado: la corrección puntual basta por ahora (check 6).',
      },
      {
        check: 'Decisión estructural: gMSA',
        command: 'Get-ADServiceAccount -Filter "*" | ft Name, Enabled',
        result: 'Las gMSA existentes en el dominio (o la candidata a migrar).',
        next: 'Si el dominio es 2012+ y el servicio soporta gMSA: migrar (Install-ADServiceAccount): la contraseña la rota el dominio y el servicio no vuelve a romper por expiración. Si no es migrable: dejar PasswordNeverExpires True y meter la rotación en el calendario de IAM con alerta de vencimiento (TS-IAM-017).',
      },
    ],
    remediation: '45% contraseña vencida por la política del dominio (PasswordNeverExpires nunca seteado), 25% la contraseña fue rotada o forzada y no se actualizó en todos los consumidores, 15% cuenta deshabilitada por limpieza de cuentas inactivas, 10% la cuenta la usan varios sistemas (rotación parcial), 5% el fallo era otro (bloqueo o caída del propio servicio).',
    verification: 'El servicio inicia y sostiene la autenticación 24 horas (sin 4625 nuevos de la cuenta) y queda PasswordNeverExpires documentado o la cuenta migrada a gMSA.',
    tags: ['cuenta de servicio', 'servicio', 'password expired', 'passwordneverexpires', 'gmsa', '4625', 'set-adaccountpassword', 'rotacion', 'service account'],
  },
  {
    id: 'TS-IAM-009',
    pillar: 'IAM',
    title: 'Accesos huérfanos tras un offboarding incompleto',
    problem: 'Un usuario salió de la empresa y siguen vivos accesos suyos (grupos, roles, licencias, tokens, buzón) porque el proceso de salida no corrió completo.',
    symptoms: [
      'Una access review o auditoría encuentra membresías o licencia de un ex-empleado.',
      'La cuenta sigue habilitada o fue re-habilitada tras la fecha de salida.',
      'Sign-ins o tokens de la cuenta después de la salida (lo grave: acceso real).',
    ],
    level: 'Cuenta vs Membresías y licencias vs Tokens y grants vs Proceso',
    checks: [
      {
        check: 'Estado de la cuenta en ambos lados',
        command: 'Get-MgUser -UserId {{USERNAME}} -Property DisplayName, AccountEnabled, OnPremisesSyncEnabled | fl DisplayName, AccountEnabled, OnPremisesSyncEnabled',
        result: 'Cuenta deshabilitada en Entra y en AD desde la fecha de salida.',
        next: 'Si sigue habilitada en alguno: deshabilitar YA (la cuenta viva de un ex-empleado es el hallazgo clásico de auditoría). Si fue RE-habilitada: ver quién y por qué (eventos 4722 en el DC o audit de Entra). Si ya está deshabilitada: profundizar qué quedó sin limpiar (checks 2 a 5).',
      },
      {
        check: 'Actividad posterior a la salida',
        command: 'SigninLogs | where UserPrincipalName == "{{USERNAME}}" and TimeGenerated > datetime({{EXIT_DATE}}) | project TimeGenerated, IPAddress, AppDisplayName, ResultType | order by TimeGenerated desc | take 20',
        result: 'Cero actividad de la cuenta después de la fecha de salida.',
        next: 'Si hay ResultType 0 posterior a la salida: ESCALAR de inmediato, es acceso real de una cuenta offboarded (incidente, no limpieza): revocar sesiones, reset y TS-SOC-001. Si solo hay fallos: algo o alguien sigue intentando entrar: igual revocar y documentar.',
      },
      {
        check: 'Membresías, roles y licencias',
        command: 'Get-MgUserMemberOf -UserId {{USERNAME}} -All | ForEach-Object { $_.DisplayName } | Sort-Object -Unique',
        result: 'Sin grupos de recursos, sin roles y sin licencias a nombre de la cuenta.',
        next: 'Quitar TODAS las membresías directas y liberar la licencia (devuelve cupo a la suscripción, TS-IAM-007). Si los grupos vienen sincronizados de AD: limpiar en AD y esperar el ciclo (TS-IAM-006). Documentar qué se quitó y con qué aprobación.',
      },
      {
        check: 'Tokens, sesiones y grants OAuth',
        command: 'Revoke-MgUserSignInSession -UserId {{USERNAME}}',
        result: 'Todas las sesiones y refresh tokens de la cuenta invalidados.',
        next: 'Ejecutarlo SIEMPRE aunque la cuenta esté deshabilitada: los refresh tokens pueden vivir hasta 90 días y el consentimiento OAuth a apps externas no muere solo. Revisar además los consent grants de la cuenta en Enterprise applications y revocar los de terceros.',
      },
      {
        check: 'Buzón, OneDrive y reenvíos',
        result: 'Buzón convertido a compartido o bajo la retención de la política de Nexora; OneDrive con dueño asignado; sin reglas de reenvío.',
        next: 'Si el buzón sigue con licencia y en uso: convertirlo a compartido o aplicar la retención de la política de Nexora. Revisar SIEMPRE las reglas de bandeja y los reenvíos SMTP: un ex-empleado que se auto-reenvía el correo es fuga de información: escalar a seguridad si se confirma.',
      },
      {
        check: 'Cerrar el hueco de proceso',
        result: 'Checklist de offboarding con responsable y fecha para cada paso, y la cuenta bajo la política de retención de cuentas salidas.',
        next: 'Si el offboarding dependía de pasos manuales sueltos de varias áreas: la recurrencia está garantizada: mover a un checklist automatizado (grupos por atributo, access packages con expiración TS-IAM-012) y programar la access review trimestral (TS-IAM-018).',
      },
    ],
    remediation: '30% se deshabilitó la cuenta pero nadie quitó grupos, roles ni licencias, 25% el proceso dependía de pasos manuales de varias áreas y alguno se cayó, 15% la cuenta quedó habilitada (o re-habilitada) tras la salida, 15% tokens o grants OAuth vivos tras deshabilitar, 15% buzón o OneDrive sin dueño ni retención.',
    verification: 'A 7 días: cuenta deshabilitada en ambos lados, sin membresías ni licencia, sin sign-ins posteriores a la fecha de salida, sin grants OAuth y buzón con retención o compartido.',
    tags: ['offboarding', 'deshabilitar cuenta', 'accesos huerfanos', 'leaver', 'revoke session', 'licencias', 'buzon', 'one drive', 'auditoria', 'access review'],
  },
  {
    id: 'TS-IAM-010',
    pillar: 'IAM',
    title: 'Break-glass: protocolo post-uso',
    problem: 'Se usó una cuenta de emergencia (break-glass) y hay que ejecutar el protocolo post-uso: auditar qué se hizo, rotar credenciales y volver a sellar la cuenta.',
    symptoms: [
      'La alerta de uso de break-glass saltó (o el uso se descubre revisando logs).',
      'El incidente que motivó el uso ya está resuelto y la cuenta quedó "usada".',
      'Auditoría pregunta quién, cuándo y para qué se usó.',
    ],
    level: 'Auditoría del uso vs Rotación vs Re-sellado vs Proceso previo',
    checks: [
      {
        check: 'Quién y desde dónde se usó',
        command: 'SigninLogs | where UserPrincipalName == "{{BG_ACCOUNT}}" and TimeGenerated > ago(7d) | project TimeGenerated, IPAddress, Location, AppDisplayName, ResultType, ConditionalAccessStatus | order by TimeGenerated asc',
        result: 'La cronología completa del uso: hora, IP, ubicación y apps tocadas.',
        next: 'Si el uso cuadra con el incidente declarado (hora, persona, IP conocida): documentar la trazabilidad. Si aparece uso desde IPs u horas sin justificación: tratar la cuenta como comprometida (TS-SOC-001): rotar YA y escalar, sin esperar el protocolo.',
      },
      {
        check: 'Qué se hizo con ella',
        command: 'AuditLogs | where TimeGenerated > ago(7d) and InitiatedBy.user.userPrincipalName == "{{BG_ACCOUNT}}" | project TimeGenerated, OperationName, TargetResources | order by TimeGenerated asc | take 50',
        result: 'La lista de cambios hechos con la cuenta (roles, políticas, usuarios modificados).',
        next: 'Si los cambios son SOLO los de la emergencia: adjuntarlos al post-mortem. Si hay cambios que nadie del incidente reconoce: la cuenta pudo usarse de más (o por otro): escalar a seguridad con la evidencia. Revertir lo que la emergencia dejó a medias y nadie documentó.',
      },
      {
        check: 'Rotación de credenciales',
        result: 'Contraseña y MFA de la cuenta rotados y sellados de nuevo.',
        next: 'La contraseña del break-glass NO se reutiliza: generar una nueva, repartirla en las dos mitades de custodia de Nexora (dos custodios o la caja fuerte de IAM) y re-registrar los métodos MFA de la cuenta desde cero. Si la rotación se pospone "porque ya está en la caja": es la ventana clásica de abuso: no cerrar el ticket sin rotar.',
      },
      {
        check: 'Re-sellado y alertas',
        command: 'Revoke-MgUserSignInSession -UserId {{BG_ACCOUNT}}',
        result: 'La cuenta vuelve a su estado de reposo: sin sesiones y con las alertas activas.',
        next: 'Confirmar que la alerta de "sign-in de break-glass" sigue disparando al canal del guardia y retirar TODA exclusión de emergencia que se añadió en el incidente (una exclusión de Conditional Access que queda para siempre es un tenant desprotegido: TS-IAM-011).',
      },
      {
        check: 'Justificación y post-mortem',
        result: 'Ticket con incidente asociado, justificación, duración del uso y qué reparó.',
        next: 'Si NO hay incidente asociado al uso: el proceso falló ANTES del uso (una break-glass usada sin registro es una falla de control aunque el uso fuera legítimo): documentar la brecha y corregir el procedimiento. Registrar por qué no bastó la vía administrativa normal (¿PIM caído, TS-IAM-016? ¿admin bloqueado?).',
      },
      {
        check: 'Usos previos sin registrar',
        command: 'SigninLogs | where UserPrincipalName == "{{BG_ACCOUNT}}" and TimeGenerated > ago(30d) | summarize cnt = count() by bin(TimeGenerated, 1d)',
        result: 'Solo el uso del incidente en los últimos 30 días.',
        next: 'Si aparecen usos anteriores no documentados: auditar si las alertas funcionaban (TS-IAM-017) y revisar esos usos también. Si solo figura el del incidente: cerrar el protocolo con rotación y documentación completas.',
      },
    ],
    remediation: '40% el uso fue legítimo y el protocolo post-uso se ejecuta limpio (rotación más registro), 25% la contraseña quedó SIN rotar tras el uso (el hueco típico), 15% cambios hechos durante la emergencia que nadie revirtió ni documentó, 10% exclusiones de emergencia que quedaron permanentes en Conditional Access, 10% uso sin incidente asociado (falla de proceso previa).',
    verification: 'La cuenta queda con cero sesiones activas, credenciales rotadas y selladas en la custodia, la alerta de uso dispara en la próxima fire drill y el post-mortem con justificación queda archivado.',
    tags: ['break glass', 'cuenta de emergencia', 'rotacion', 'post-uso', 'auditlogs', 'revoke session', 'fire drill', 'custodia', 'exclusion'],
  },
  {
    id: 'TS-IAM-011',
    pillar: 'IAM',
    title: 'Conditional Access bloquea a muchos usuarios',
    problem: 'Tras un cambio de política, una ola de usuarios queda fuera a la vez y hay que contener el incidente sin desactivar la protección del tenant.',
    symptoms: [
      'Tickets masivos con el mismo mensaje: "Blocked by Conditional Access" o AADSTS53003.',
      'El pico empieza a la hora exacta de un despliegue, cambio de red o de VPN.',
      'Los afectados comparten algo: misma sede, mismos remotos o el mismo tipo de cuenta.',
    ],
    level: 'Alcance vs Política culpable vs Named locations vs Contención',
    checks: [
      {
        check: 'El pico y su perfil',
        command: 'SigninLogs | where TimeGenerated > ago(4h) and ConditionalAccessStatus == "failure" | summarize cnt = count() by bin(TimeGenerated, 15m), UserPrincipalName | order by cnt desc | take 20',
        result: 'La lista de usuarios bloqueados y la hora en que arrancó el pico.',
        next: 'Si el pico arranca a la hora de un cambio conocido (política nueva, IP de sede o VPN): checks 2 a 4. Si no hay hora clara: descartar primero un incidente del servicio MFA (TS-IAM-002) antes de culpar a una política.',
      },
      {
        check: 'La política exacta que deniega',
        command: 'SigninLogs | where TimeGenerated > ago(4h) and ConditionalAccessStatus == "failure" | take 1 | extend pol = ConditionalAccessPolicies | project pol',
        result: 'El array de políticas evaluadas en ese sign-in con su resultado por política.',
        next: 'La política con resultado deny (o la que exige un control que el usuario no puede cumplir) es la culpable: abrirla en Entra ID → Protection → Conditional Access y revisar qué cambió en su asignación o condición.',
      },
      {
        check: 'Named locations y las IPs de los afectados',
        command: 'SigninLogs | where TimeGenerated > ago(4h) and ConditionalAccessStatus == "failure" | summarize by IPAddress | take 10',
        result: 'Las IPs públicas desde las que se bloquea a los usuarios.',
        next: 'Si la política exige ubicaciones de confianza y la IP de la sede o la VPN cambió (proveedor rotó el rango, sede cambió de línea): actualizar la named location, no desactivar la política. Si las IPs son de casas (remotos): la política nueva no contemplaba el teletrabajo.',
      },
      {
        check: 'Lo que la política exige vs lo que el usuario tiene',
        result: 'El control exigido (MFA, dispositivo compliant, hybrid joined) contrastado con lo que los afectados pueden presentar.',
        next: 'Si exige dispositivo compliant y no hay despliegue de Intune: la política llegó antes que la infraestructura: aplazar o ampliar. Si exige MFA y los usuarios no tienen métodos registrados: correr primero la campaña de registro (TS-IAM-003) y endurecer después.',
      },
      {
        check: 'Contención: exclusión temporal y quirúrgica',
        result: 'Un grupo de emergencia con los afectados y la exclusión documentada con fecha de caducidad.',
        next: 'Excluir de ESA política un grupo de emergencia con los afectados (nunca desactivar la política entera ni excluir a Todos) con expiración de 48-72 h y dueño asignado: la exclusión sin caducidad es cómo nacen los tenants sin CA. Registrar la exclusión en el ticket del incidente.',
      },
      {
        check: 'Despliegue correcto la próxima vez',
        result: 'El cambio validado con datos antes de llegar a enforce.',
        next: 'Si el cambio se aplicó directo a enforce sin pasar por report-only: esa es la causa raíz: instituir report-only 48 h y revisar el insight de impacto antes de activar. Si ya se hizo report-only y falló igual: la matriz de pruebas no incluía el caso concreto (sede nueva, tipo de usuario): ampliarla.',
      },
    ],
    remediation: '30% política aplicada a enforce sin pasar por report-only, 25% named location desactualizada (IP de sede o VPN cambiada), 20% el control exigía algo que los usuarios no tienen (MFA sin registrar, Intone sin desplegar), 15% cambio de alcance de la política (grupo Todos o filtro erróneo), 10% incidente del servicio MFA de fondo.',
    verification: 'Los afectados entran, la política queda en enforce (o en report-only hasta la fecha planificada), el grupo de emergencia se disuelve a las 72 h y el pico de ConditionalAccessStatus failure no reaparece.',
    tags: ['conditional access', 'bloqueo masivo', 'report-only', 'named location', 'exclusion de emergencia', '53003', 'compliant device', 'entra id protection'],
  },
  {
    id: 'TS-IAM-012',
    pillar: 'IAM',
    title: 'Acceso temporal expira antes de tiempo (o no expira)',
    problem: 'Un acceso temporal (PIM, access package o grupo con expiración) cortó antes de lo pactado o sigue vivo cuando debió terminar.',
    symptoms: [
      'El usuario perdió el acceso antes de la fecha acordada en el ticket.',
      'O al revés: la access review detecta el acceso vivo meses después de su fecha de fin.',
      'Nadie se pone de acuerdo: el ticket dice dos semanas, la consola otra cosa.',
    ],
    level: 'Mecanismo (PIM/Package) vs Expiración configurada vs Extensiones vs Duplicados',
    checks: [
      {
        check: 'Qué mecanismo otorga el acceso',
        result: 'El acceso viene de una activación PIM, un access package o una membresía directa con expiración.',
        next: 'Si es PIM: la duración la fija la política del rol al activar (check 3). Si es access package: la fija la policy de asignación (check 2). Si es membresía directa SIN expiración configurada: ese es el fallo (check 4).',
      },
      {
        check: 'La expiración del access package',
        result: 'En Identity Governance → Access packages → {{PACKAGE_NAME}} → Policies: la caducidad (días o fecha) coincide con lo acordado en el ticket.',
        next: 'Si la policy expira en menos días de lo pactado: el solicitante eligió la policy corta (o era la única): corregir la duración o crear la policy correcta y reasignar. Si la expiración es "nunca": el paquete nació sin caducidad (check 4).',
      },
      {
        check: 'La política PIM: activación vs asignación',
        command: 'Get-MgRoleAssignmentScheduleInstance -All | Where-Object { $_.PrincipalId -eq "{{USER_ID}}" } | fl RoleDefinitionId, AssignmentType, StartDateTime, EndDateTime, Status',
        result: 'La activación o asignación del rol con su fecha de fin explícita.',
        next: 'Si el usuario tuvo una activación JIT de horas cuando el negocio pedía semanas: era activación, no asignación: para accesos temporales prolongados se asigna el rol con fecha de fin o se usa un access package, no activaciones encadenadas. Si la política limita la duración máxima por debajo de lo pedido: ajustarla con el dueño del rol.',
      },
      {
        check: 'El acceso duplicado que la expiración no toca',
        command: 'Get-MgUserMemberOf -UserId {{USERNAME}} -All | ForEach-Object { $_.DisplayName } | Sort-Object -Unique',
        result: 'Los grupos y roles directos del usuario, además del mecanismo temporal.',
        next: 'Si el usuario tiene el recurso por una membresía DIRECTA paralela al paquete temporal: la expiración del paquete jamás la quitará: eliminar la membresía directa y dejar solo el mecanismo con caducidad. Si todo está en el mecanismo temporal y no expira: revisar extensiones (check 5).',
      },
      {
        check: 'Extensiones silenciosas',
        result: 'El historial del paquete o rol sin extensiones repetidas sin justificación.',
        next: 'Si hay extensiones en cadena (dos semanas, dos semanas, dos semanas): el acceso temporal se volvió permanente de facto: aplicar re-solicitud con aprobación y someter el paquete a access review (TS-IAM-018). Si nunca hubo extensión pero la fecha no llegó: probar la expiración de punta a punta (check 6).',
      },
      {
        check: 'Prueba de la expiración de punta a punta',
        result: 'Una asignación de prueba de una hora muere sola a la hora prevista.',
        next: 'Si la asignación de prueba NO expira: el proceso de expiración del tenant está roto: escalar con el detalle del paquete y la hora esperada. Si expira limpio: la causa era la configuración puntual del caso: corregir la duración acordada y documentar la fecha real de fin.',
      },
    ],
    remediation: '30% la policy del access package tenía menos días de los acordados (o "nunca expira"), 25% el acceso se dio como activación JIT en vez de asignación con fecha de fin, 20% el acceso estaba duplicado por membresía directa que la expiración no toca, 15% extensiones encadenadas sin control, 10% la expiración del paquete no evalúa (fallo de plataforma).',
    verification: 'El acceso muestra la fecha de fin correcta, expira solo a la hora prevista (verificado con la prueba) y el usuario no conserva ninguna membresía directa paralela.',
    tags: ['acceso temporal', 'pim', 'access package', 'expiracion', 'asignacion temporal', 'extension', 'identity governance', 'jit', 'membresia directa'],
  },
  {
    id: 'TS-IAM-013',
    pillar: 'IAM',
    title: 'Service principal o client secret expirado',
    problem: 'Una aplicación o integración dejó de autenticar contra Graph o una API y la escalera apunta a las credenciales del service principal (secret o certificado vencido) antes que al código.',
    symptoms: [
      'La app reporta AADSTS7000215 (invalid client secret) o 401 con invalid_client.',
      'El fallo empezó a una hora exacta y de golpe (sin degradación gradual).',
      'Los logs de la app muestran fallos de ANTES de cualquier request de negocio.',
    ],
    level: 'Credencial del SP vs Identidad/Tenant vs Permisos vs Rotación',
    checks: [
      {
        check: 'La hora exacta del corte',
        command: 'AADServicePrincipalSignInLogs | where ServicePrincipalId == "{{SP_ID}}" and TimeGenerated > ago(7d) | summarize fails = countif(ResultType != 0) by bin(TimeGenerated, 1h) | order by TimeGenerated asc | take 50',
        result: 'La serie de fallos por hora: el corte es un escalón, no una pendiente.',
        next: 'Si los fallos empiezan a una hora exacta: credencial vencida o rotada (check 2). Si son intermitentes: red, throttling o permisos (checks 4 y 5). Si NO hay logs del SP: la app apunta a otro tenant u otro SPN (check 3).',
      },
      {
        check: 'Las credenciales y su vencimiento',
        command: 'Get-MgApplication -ApplicationId {{APP_ID}} -Property DisplayName, PasswordCredentials, KeyCredentials | fl DisplayName, @{n="Secrets";e={$_.PasswordCredentials | ForEach-Object { "$($_.Hint) expira $($_.EndDateTime)" }}}, @{n="Certificados";e={$_.KeyCredentials | ForEach-Object { "expira $($_.EndDateTime)" }}}',
        result: 'Cada secret y certificado con su EndDateTime: al menos uno vigente en el futuro.',
        next: 'Si TODAS las credenciales tienen EndDateTime en el pasado: confirmado, vencieron y la app sigue presentando la muerta: crear la nueva, desplegar y jubilar la vieja con orden (check 6). Si hay una vigente: la app no la usa o el fallo es de permisos (checks 4 y 5).',
      },
      {
        check: 'Qué SPN y tenant usa realmente la app',
        command: 'Get-MgServicePrincipal -All | Where-Object { $_.AppId -eq "{{APP_ID}}" } | fl DisplayName, AppId, ServicePrincipalType',
        result: 'Un único service principal para ese AppId en el tenant esperado.',
        next: 'Si el AppId de la configuración de la app no existe en el tenant (o es de otro entorno: dev contra prod): la app apunta mal y ninguna credencial nueva del SP correcto la salvará: corregir la configuración de la app. Si existe y coincide: permisos (check 4).',
      },
      {
        check: 'Permisos y consentimiento',
        result: 'Los permisos API concedidos intactos y el admin consent vigente.',
        next: 'Si hace poco alguien revocó permisos o consentimientos (limpieza de seguridad o review): la app autentica pero recibe 403 en los datos (no es 7000215): re-conceder con el dueño de la app. Si los permisos están: configuración del lado de la app (check 5).',
      },
      {
        check: 'La configuración del lado de la app',
        result: 'El secret o certificado en la config de la app coincide con el creado en Entra (mismo hint o huella).',
        next: 'Si la rotación se hizo en Entra pero la app aún tiene la vieja (o al revés): el cambio quedó a medias: completarlo en los DOS lados. Si un despliegue reciente pisó la config (variable de entorno, keyring) con la credencial vieja: corregir el pipeline. Si la app ya soporta managed identity: migrar y eliminar el secret de la ecuación (check 6).',
      },
      {
        check: 'Rotación con solapamiento y jubilación',
        command: 'Get-MgApplication -ApplicationId {{APP_ID}} -Property PasswordCredentials | Select-Object -ExpandProperty PasswordCredentials | ft Hint, StartDateTime, EndDateTime',
        result: 'La credencial nueva activa y la vieja aún válida unos días (solapamiento).',
        next: 'Rotar SIEMPRE con solapamiento: crear la nueva, desplegar la app con la nueva, confirmar tokens y DESPUÉS jubilar la vieja; jubilar primero es justo lo que produjo el incidente. Dejar alerta de vencimiento a 30/7/1 días (TS-IAM-017) y evaluar managed identity o certificados para eliminar secrets.',
      },
    ],
    remediation: '50% secret expirado sin alerta de vencimiento (nadie lo rotó a tiempo), 20% la rotación se hizo en un solo lado (Entra sin redeploy o redeploy sin Entra), 15% la app apunta a otro SP o tenant (dev contra prod), 10% permisos o consent revocados (403 que parece auth), 5% el deploy pisó la config con la credencial vieja.',
    verification: 'La app obtiene tokens de nuevo, AADServicePrincipalSignInLogs muestra ResultType 0 sostenido 24 horas y existe alerta de vencimiento para la credencial nueva.',
    tags: ['service principal', 'client secret', '7000215', 'invalid client', 'rotacion secretos', 'app registration', 'managed identity', 'credenciales'],
  },
  {
    id: 'TS-IAM-014',
    pillar: 'IAM',
    title: 'Password writeback de SSPR falla',
    problem: 'El usuario cambia su contraseña por SSPR en la nube pero la nueva no funciona en el dominio y hay que recorrer la ruta de writeback del servidor Entra Connect.',
    symptoms: [
      'El reset en aka.ms/sspr parece completarse pero la contraseña solo funciona en la nube.',
      'El usuario queda con dos contraseñas: una para M365 y otra para el PC.',
      'El servidor de Entra Connect registra fallos del PasswordResetService o nadie miró sus eventos.',
    ],
    level: 'Configuración writeback vs Canal (Service Bus) vs Permisos AD vs Alcance',
    checks: [
      {
        check: 'El writeback está habilitado de verdad',
        result: 'En el asistente de Entra Connect → Optional features: Password writeback marcado y el asistente completado.',
        next: 'Si la casilla quedó sin marcar (o el asistente se re-ejecutó para otra cosa y no se re-seleccionó): el writeback se apagó solapado: marcar, completar y probar (check 6). Si está marcada: el canal (check 2).',
      },
      {
        check: 'El endpoint local del writeback',
        command: 'Get-NetTCPConnection -LocalPort 9090 -ErrorAction SilentlyContinue | ft State, OwningProcess',
        result: 'El proceso del sync escuchando en el 9090 (endpoint local del writeback).',
        next: 'Si nadie escucha en el 9090: el componente de writeback no levantó: leer los eventos del Application log (origen PasswordResetService) y reiniciar el servicio ADSync en ventana. Si escucha: conectividad saliente (check 3).',
      },
      {
        check: 'Conectividad saliente al relay de Azure',
        command: 'Test-NetConnection servicebus.windows.net -Port 443',
        result: 'TcpTestSucceeded True hacia el Service Bus (el canal del writeback es saliente, no entrada).',
        next: 'Si falla: firewall o proxy del segmento del servidor bloquea el canal (443 a *.servicebus.windows.net): abrir y reintentar. Si la conectividad está: permisos en AD (check 4).',
      },
      {
        check: 'Permisos de la cuenta del conector en AD',
        command: 'dsacls "OU=Usuarios,DC={{DOMAIN}},DC=local" | findstr /i "Reset Password"',
        result: 'La cuenta del conector (MSOL_ o la custom) con permiso Reset Password en la OU de los usuarios.',
        next: 'Si el permiso falta o se perdió tras reorganizar OUs: re-delegarlo (el asistente de Entra Connect delega por defecto en la raíz del dominio si no se delegaron OUs específicas). Si los permisos están: alcance del fallo (check 5).',
      },
      {
        check: 'Alcance: un usuario concreto o el writeback completo',
        result: 'Un reset de admin a un usuario de prueba revela si la vía de vuelta está viva.',
        next: 'Probar reseteando la contraseña de un usuario de prueba desde Entra (Users → Reset password): si la nueva funciona en el dominio, el writeback global está bien y el fallo es del usuario concreto (cloud-only, OU sin delegación, atributos raros). Si el de prueba también falla: es global (checks 1 a 4) y el fallback ES resetear desde AD mientras se repara.',
      },
      {
        check: 'El log del PasswordResetService y la prueba final',
        command: 'Get-WinEvent -LogName Application -MaxEvents 200 | Where-Object { $_.ProviderName -match "PasswordReset" } | fl TimeCreated, Id, Message',
        result: 'Eventos del PasswordResetService con heartbeat limpio y sin fallos recientes.',
        next: 'Si hay fallos con motivo exacto (permisos, endpoint, timeout del relay): atacar esa causa con los checks anteriores. Si el log queda limpio y el usuario de prueba cambia su contraseña SSPR de punta a punta (nube más desbloqueo del PC): cerrar y monitorear.',
      },
    ],
    remediation: '30% la casilla de writeback se perdió al re-ejecutar el asistente para otra configuración, 25% firewall o proxy bloquea el canal saliente (Service Bus 443 o 9090 local), 20% permisos de la cuenta del conector perdidos tras reorganizar OUs, 15% el usuario era cloud-only o de una OU sin delegación, 10% el servicio ADSync a medio arrancar tras un parcheo.',
    verification: 'Un reset SSPR de prueba actualiza la contraseña del dominio: el usuario entra al PC con la nueva y sin sesiones de la vieja, y el Application log del servidor queda sin errores de writeback.',
    tags: ['sspr', 'password writeback', 'entra connect', 'service bus', '9090', 'passwordresetservice', 'reset password', 'dsacls', 'autoservicio'],
  },
  {
    id: 'TS-IAM-015',
    pillar: 'IAM',
    title: 'Invitado B2B sin acceso (cadena de invitación rota)',
    problem: 'Un invitado externo no consigue entrar y la escalera recorre la cadena B2B completa: invitación, canje, aceptación y asignación al recurso del proyecto.',
    symptoms: [
      'El invitado reporta que el enlace de invitación da error o pide algo que no puede completar.',
      'El guest aparece en Entra como pendiente de aceptación desde hace días.',
      'O entra al tenant pero ve "no tiene acceso" en el Teams o SharePoint del proyecto.',
    ],
    level: 'Invitación vs Canje (redención) vs Política externa vs Recurso',
    checks: [
      {
        check: 'Estado de la invitación del guest',
        command: 'Get-MgUser -UserId {{GUEST_ID}} -Property DisplayName, UserPrincipalName, ExternalUserState | fl DisplayName, UserPrincipalName, ExternalUserState',
        result: 'ExternalUserState Accepted (o PendingAcceptance recién emitida).',
        next: 'Si PendingAcceptance y el invitado jura que nunca llegó nada: reenviar la invitación (Users → Resend invite) y revisar el spam del dominio externo. Si Accepted pero no entra: el problema ya no es la invitación (checks 3 a 5). Si el guest NO existe: la invitación nunca se creó (check 2).',
      },
      {
        check: 'El flujo que creó la invitación',
        result: 'La invitación creada con el correo correcto y por un flujo soportado (admin, My Apps o el propio sitio).',
        next: 'Si se invitó desde SharePoint o Teams y el dominio del externo está en la lista de bloqueados de External collaboration settings: el externo nunca recibió nada: revisar Entra ID → External Identities → External collaboration settings (allow/deny por dominio) y re-invitar. Si el correo tenía un typo: el canje jamás ocurrirá: crear la invitación de nuevo.',
      },
      {
        check: 'El canje y su escollo',
        result: 'El invitado canjea con la cuenta de su propio tenant (o con código de un solo uso si su IdP no es Entra).',
        next: 'Si su tenant no es Entra y el flujo de one-time passcode (email OTP) está deshabilitado en el tenant: ese invitado NO tiene forma de canjear: habilitar el OTP o buscar vía alternativa. Si el error es AADSTS50020: está canjeando con una cuenta distinta a la invitada: que use exactamente el correo del invite.',
      },
      {
        check: 'Restricciones post-canje (Conditional Access)',
        result: 'El guest canjeó y el bloqueo restante viene de política, no de la invitación.',
        next: 'Si una política de CA bloquea invitados (MFA exigido sin método registrado del externo, o ubicaciones de confianza que el externo no puede cumplir): ajustar la política para el flujo B2B (TS-IAM-011) o guiar el registro MFA del externo. Si el CA no es: asignación al recurso (check 5).',
      },
      {
        check: 'Asignación real al recurso del proyecto',
        command: 'Get-MgUserMemberOf -UserId {{GUEST_ID}} -All | ForEach-Object { $_.DisplayName } | Sort-Object -Unique',
        result: 'La membresía al equipo, sitio o grupo del proyecto.',
        next: 'Si el guest no está en el equipo ni en el sitio: la invitación solo creó la identidad en el tenant sin darle ningún recurso: añadirlo con los permisos mínimos. Si ya está: dar minutos a la propagación (SharePoint tarda tras añadir al grupo) y re-testear.',
      },
      {
        check: 'Sanidad: invitaciones huérfanas',
        result: 'Invitaciones pendientes de hace más de lo pactado revisadas o revocadas.',
        next: 'Si el caso era un guest invitado hace meses y nunca canjeado: aplicar el tiempo de vida acordado para invitaciones sin canje (revocar y documentar). Cerrar con el checklist probado de punta a punta: dominio permitido, canje, MFA y acceso al recurso.',
      },
    ],
    remediation: '25% la invitación nunca llegó o se envió a un correo con error, 20% el canje falla por el dominio o IdP del externo (OTP deshabilitado o AADSTS50020), 20% el guest canjeó pero nadie lo añadió al recurso (equipo o sitio), 15% Conditional Access no contempla el flujo del invitado, 10% invitaciones huérfanas de hace meses, 10% política de dominios (allow/deny) bloqueando al externo.',
    verification: 'El invitado entra con su identidad externa, ve el equipo o sitio del proyecto con los permisos mínimos y su usuario muestra ExternalUserState Accepted con la membresía correcta.',
    tags: ['b2b', 'guest', 'invitacion', 'external user state', 'redencion', 'one-time passcode', 'external identities', 'aadsts50020', 'colaboracion externa'],
  },
  {
    id: 'TS-IAM-016',
    pillar: 'IAM',
    title: 'Checkout de PAM falla o la sesión no abre',
    problem: 'El administrador pide su acceso privilegiado en la bóveda de PAM y el checkout falla o la sesión grabada no abre, dejándolo fuera y al incidente esperando.',
    symptoms: [
      'El checkout reporta "sin disponibilidad", "fuera de ventana" o queda en aprobación eterna.',
      'La sesión abre y se corta al instante, o el RDP/SSH hacia el objetivo no llega.',
      'Falla solo un usuario o un objetivo concreto (o es global tras un cambio del PAM).',
    ],
    level: 'Aprobación y ventana vs Cuenta objetivo vs Conectividad bastión vs Plataforma',
    checks: [
      {
        check: 'El error exacto del checkout',
        result: 'El mensaje del PAM: sin slots, fuera de ventana, aprobación pendiente o credencial rechazada.',
        next: 'Si "sin disponibilidad": todos los slots de la cuenta están ocupados (o alguien olvidó el check-in): localizar a los titulares y liberar (check 5). Si "fuera de ventana": pedir dentro de la ventana aprobada o elevar una excepción documentada. Si "aprobación pendiente": el flujo (check 2).',
      },
      {
        check: 'La aprobación y su dueño',
        result: 'La solicitud con aprobador asignado y SLA visible en la consola del PAM.',
        next: 'Si el aprobador es único y está ausente: el flujo se atasca por diseño: activar el aprobador alterno del perfil. Si la solicitud ni siquiera llega a crearse: elegibilidad del solicitante (check 3).',
      },
      {
        check: 'Elegibilidad del solicitante',
        result: 'El usuario listado como elegible para ESE perfil u objetivo del PAM.',
        next: 'Si el manager pidió el alta pero IAM no la completó: terminarla (la membresía del grupo de acceso es la misma causa que TS-IAM-005). Si cambió el objetivo o su nombre (reorganización, nuevo naming): revisar la ficha del objetivo en el PAM (check 5).',
      },
      {
        check: 'La cuenta objetivo y su estado',
        command: 'Get-ADUser {{TARGET_ADMIN}} -Properties Enabled, LockedOut, PasswordExpired | fl Name, Enabled, LockedOut, PasswordExpired',
        result: 'La cuenta administrativa del objetivo habilitada, desbloqueada y con contraseña vigente.',
        next: 'Si LockedOut o PasswordExpired: el PAM no puede usar ni rotar la cuenta: repararla (rotar y desbloquear desde el propio PAM si el producto lo permite) y reintentar. Si la cuenta está sana: conectividad (check 5).',
      },
      {
        check: 'Conectividad bastión → objetivo',
        command: 'Test-NetConnection {{TARGET_HOST}} -Port 3389',
        result: 'TcpTestSucceeded True desde el servidor bastión del PAM (no desde tu equipo).',
        next: 'Si el bastión no llega al puerto (3389 RDP o 22 SSH): firewall del segmento o la ficha del objetivo apunta a una IP o hostname viejos tras una migración: corregir la regla o la ficha. Si llega: la sesión misma (check 6).',
      },
      {
        check: 'La sesión que abre y se corta',
        result: 'La sesión abre grabada y se mantiene, o el log del PAM deja el error explícito.',
        next: 'Si abre y muere al instante: revisar el componente de sesión del PAM (límite de sesiones por usuario, recursos del servidor, grabador): si no puede grabar, corta por diseño. Si nada abre y el log está limpio: escalar con el producto (¿patch reciente?) y usar la vía de emergencia (TS-IAM-010) SOLO si el incidente lo justifica.',
      },
    ],
    remediation: '30% slots ocupados o check-ins olvidados (la cuenta no tiene disponibilidad), 20% conectividad bastión a objetivo cerrada (firewall o ficha con IP vieja), 15% cuenta objetivo bloqueada o con contraseña expirada, 15% aprobación atascada (aprobador único fuera de servicio), 10% elegibilidad del solicitante sin completar, 10% componente de sesión o grabador del PAM fallando.',
    verification: 'El admin hace checkout dentro de su ventana, la sesión abre grabada, se mantiene el tiempo previsto y el check-in libera el slot (con rotación de la contraseña si el producto la hace).',
    tags: ['pam', 'checkout', 'bastion', 'sesion grabada', 'cuenta privilegiada', 'aprobacion', 'jit', 'check-in', 'slot'],
  },
  {
    id: 'TS-IAM-017',
    pillar: 'IAM',
    title: 'Huecos en los logs de auditoría de accesos',
    problem: 'Al investigar un acceso faltan tramos de auditoría (sign-ins, cambios de roles o actividad) y la escalera separa retención, ingesta, cobertura y permisos de quien consulta.',
    symptoms: [
      'La búsqueda del sign-in de hace 40 días no devuelve nada (y el usuario existía).',
      'Queries o dashboards que antes llenaban ahora muestran tramos vacíos.',
      'El post-mortem de un incidente no encuentra la evidencia que debería estar.',
    ],
    level: 'Retención vs Ingesta vs Cobertura de escenarios vs Permisos',
    checks: [
      {
        check: 'Qué ventana debería existir',
        command: 'SigninLogs | where TimeGenerated > ago(60d) | summarize cnt = count() by bin(TimeGenerated, 1d) | order by TimeGenerated asc',
        result: 'Filas continuas día a día dentro de la retención real (los tramos que faltan ya expiraron).',
        next: 'Si la ventana pedida supera la retención del workspace (o el tier gratuito de 7 o 30 días del tenant): los logs VIEJOS no existen más, no es un hueco: ajustar la retención (con coste) o exportar a Storage para largo plazo. Si la ventana está dentro: ingesta (check 2).',
      },
      {
        check: 'La ingesta al workspace',
        command: 'Usage | where DataType in ("SigninLogs", "AuditLogs", "AADNonInteractiveUserSignInLogs") | summarize total = sum(Quantity) by DataType, bin(TimeGenerated, 1d) | order by TimeGenerated asc',
        result: 'Ingesta diaria continua de las tablas de identidad, sin días en cero.',
        next: 'Si hay días en cero o caídas: el Diagnostic Setting de Entra se rompió o se recreó incompleto: revisar Entra ID → Diagnostic settings (qué setting, qué tablas, qué destino) y restaurarlo completo. Si la ingesta es continua: cobertura (check 3).',
      },
      {
        check: 'El escenario que no se loguea donde se busca',
        result: 'El hueco corresponde a un tipo de acceso que Entra escribe en OTRA tabla (o no escribe).',
        next: 'Accesos de service principal: AADServicePrincipalSignInLogs. Refresh tokens silenciosos: AADNonInteractiveUserSignInLogs. Accesos que NO autentica Entra (VPN, firewall, app con auth propia): el log vive en ese sistema, no en Entra: ir a la fuente. Verificar que el setting exporta todas las tablas de identidad.',
      },
      {
        check: 'Los permisos del que consulta',
        result: 'El investigador ve (o no) las tablas según su permiso sobre el workspace, no sobre Entra.',
        next: 'Si otro analista con Security Reader SÍ ve los datos: al primero le falta el rol de lector sobre el WORKSPACE: darle Reader del workspace (el de Entra no alcanza). Si nadie ve nada pero Usage muestra ingesta: están consultando otro workspace o el nombre de tabla está mal.',
      },
      {
        check: 'Recortes silenciosos y volumen',
        command: 'Usage | where DataType startswith "AAD" or DataType startswith "Signin" | summarize totalGB = round(sum(Quantity), 1) by DataType | order by totalGB desc',
        result: 'El volumen diario por tabla, sin tablas desaparecidas ni picos anómalos.',
        next: 'Si alguien recortó tablas del setting para ahorrar coste: decidir documentadamente qué se loguea (con firma de seguridad), nunca en silencio. Si el volumen explotó de golpe: puede haber ruido anómalo (una app re-autenticando en bucle: TS-IAM-013): encontrarla antes de pagar por ella.',
      },
      {
        check: 'Conciliar con el evento investigado',
        result: 'Para el evento, al menos UNA fuente independiente corrobora, o el hueco queda documentado como punto ciego.',
        next: 'Si ni Entra ni la app ni el SSO tienen el tramo: documentarlo como punto ciego con las tablas ausentes y empujar la ampliación del setting como acción del post-morte. Si el hueco es solo de Entra pero la app tiene log local: usar ese log como evidencia y fijar el fix del setting como acción pendiente.',
      },
    ],
    remediation: '30% el tramo pedido excede la retención (expirado de verdad), 25% el Diagnostic Setting se recreó incompleto o roto (tablas faltando), 20% el acceso vivía en otra tabla o en otra fuente (non-interactive, service principal, VPN), 15% recortes silenciosos por coste, 10% permisos del investigador sobre el workspace.',
    verification: 'Prueba de fuego: un sign-in de prueba de hoy aparece en las tablas que corresponden dentro de minutos y la retención del workspace coincide con lo que la política de la empresa promete.',
    tags: ['logs', 'auditoria', 'retencion', 'log analytics', 'diagnostic settings', 'signinlogs', 'aadnoninteractive', 'ingesta', 'permisos lector', 'huecos'],
  },
  {
    id: 'TS-IAM-018',
    pillar: 'IAM',
    title: 'Transferido mantiene accesos del rol anterior',
    problem: 'Un usuario cambió de rol interno y conserva los accesos del anterior: la escalera separa membresías manuales, grupos dinámicos por atributo y el proceso de transferencia.',
    symptoms: [
      'El usuario del nuevo rol sigue viendo recursos del equipo anterior (carpetas, apps, buzones).',
      'La access review encuentra membresías que no cuadran con el cargo actual.',
      'Nadie le dio los accesos del rol viejo a propósito: simplemente nunca se los quitaron.',
    ],
    level: 'Membresías directas vs Grupos dinámicos vs Proceso de transferencia vs Revisión',
    checks: [
      {
        check: 'El inventario de lo que tiene hoy',
        command: 'Get-MgUserMemberOf -UserId {{USERNAME}} -All | ForEach-Object { $_.DisplayName } | Sort-Object -Unique',
        result: 'La lista completa de grupos y roles directos del usuario.',
        next: 'Compararla contra el perfil del rol NUEVO: todo lo que no pertenece al nuevo rol es deuda de acceso. Si son dos o tres grupos puntuales: limpiar y arreglar el proceso (check 3). Si son decenas: el caso es estructural (check 5).',
      },
      {
        check: 'El origen de cada grupo que sobra',
        command: 'Get-MgGroup -GroupId {{GROUP_ID}} -Property DisplayName, GroupTypes, MembershipRule | fl DisplayName, GroupTypes, MembershipRule',
        result: 'Cada grupo con su tipo: asignado (manual) o dinámico (regla por atributos).',
        next: 'Si el grupo es DINÁMICO y el usuario sigue cumpliendo la regla: su atributo no se actualizó al moverlo (department, cargo): corregir el atributo en RRHH/Entra y la membresía cae sola en el próximo ciclo. Si el grupo es ASIGNADO: alguien lo añadió a mano y nadie lo quitó (check 3).',
      },
      {
        check: 'El proceso de transferencia que no corrió',
        result: 'El checklist de transferencia con el alta del rol nuevo y la BAJA del rol saliente el mismo día.',
        next: 'Si el alta del rol nuevo corrió pero nadie desmontó el viejo: el "mover" se hizo como "añadir": fijar en el checklist de RRHH/IAM que la baja de accesos del rol saliente es parte de la MISMA transacción. Si no existe checklist: cada transferencia repetirá el caso (check 5).',
      },
      {
        check: 'Lo que queda por fuera de los grupos',
        result: 'Sin permisos directos a recursos heredados del rol anterior.',
        next: 'Si al limpiar grupos queda acceso: revisar las vías DIRECTAS (sharing links de SharePoint, permisos NTFS heredados del equipo viejo, delegaciones de buzón): los grupos no son la única puerta. Retirar las delegaciones de buzón del equipo anterior si el rol nuevo no las justifica.',
      },
      {
        check: 'Estructura para que no se repita',
        command: 'Get-MgUser -UserId {{USERNAME}} -Property Department, JobTitle | fl Department, JobTitle',
        result: 'El atributo de departamento actualizado al rol nuevo y usado por los grupos dinámicos.',
        next: 'Si la empresa no mantiene department confiable: los grupos dinámicos por rol no pueden existir: instituir la regla "acceso por rol = grupo dinámico por atributo de RRHH; acceso manual = solo con expiración (TS-IAM-012)". Programar la access review trimestral de los grupos de acceso para cazar el resto (TS-IAM-009).',
      },
      {
        check: 'Prueba y cierre con el interesado',
        result: 'El usuario confirma que ve lo del rol nuevo y ya no lo del anterior.',
        next: 'Hacerle probar un recurso crítico del rol NUEVO (por si la limpieza tocó un grupo compartido entre roles) y uno del VIEJO (debe denegar). Documentar en el ticket qué se retiró y quién aprobó la retirada: quitar acceso también necesita trazabilidad.',
      },
    ],
    remediation: '35% membresías manuales del rol anterior que nadie retiró (el "mover" fue un "añadir"), 25% el atributo de departamento o cargo no se actualizó y los grupos dinámicos siguen dándole el paquete viejo, 15% permisos directos por fuera de grupos (shares, delegaciones, NTFS), 15% sin checklist de transferencia (el proceso no existe), 10% fecha efectiva de la transferencia sin acordar entre RRHH e IT.',
    verification: 'Get-MgUserMemberOf muestra solo los grupos del rol vigente, un recurso del rol anterior deniega y uno del rol nuevo funciona, y la access review trimestral lo mantiene así.',
    tags: ['mover', 'transferencia', 'accesos antiguos', 'grupos dinamicos', 'department', 'access review', 'least privilege', 'membresias', 'limpieza', 'rrhh'],
  },
];

export const TROUBLESHOOTING_IAM_COUNT = TROUBLESHOOTING_IAM.length;

export const TROUBLESHOOTING_IAM_CATEGORIES: string[] = Array.from(
  new Set(TROUBLESHOOTING_IAM.map((t) => t.level))
);
