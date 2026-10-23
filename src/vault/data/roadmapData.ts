/**
 * roadmapData — ROADMAP DEFINITIVO: JUNIOR IAM / IDENTITY SECURITY ANALYST.
 *
 * Especialización Principal: IAM & Identity Governance
 * Ventaja Competitiva: SOC / Blue Team Background
 *
 * Estructura: 3 tiers de prioridad estratégica + proyecto final, 23 fases.
 * Cobertura completa del dominio IAM: fundamentos, Active Directory y
 * directory services (LDAP), Microsoft Entra ID + Graph, SSO/federación,
 * MFA, identity life-cycle, modelo de roles, granting/revoking, access
 * reviews, PAM, plataformas enterprise (Okta, SailPoint, Ping, ForgeRock,
 * IBM, Oracle), ITDR, cloud IAM, identidades no-humanas y proyecto final.
 *
 * El checklist (estado de cada ítem) vive en la tabla Dexie `roadmapItems`
 * (id + done + timestamps); este archivo es la FUENTE DE VERDAD del
 * CONTENIDO (texto, tiers, fases, ítems). El seed añade filas para los ids
 * que falten — jamás resetea el progreso del usuario.
 *
 * La arquitectura del roadmap está dividida por prioridad estratégica. El
 * Tier 1 es el núcleo innegociable que consigue las entrevistas. El Tier 2
 * aporta madurez empresarial. El Tier 3 da amplitud sin desenfocar.
 */

export interface RoadmapItemDef {
  /** Id estable: 'rm-<fase>-<n>'. */
  id: string;
  /** Prefijo del ítem (Conceptos Clave, Entrevista, Evidencia...). */
  label?: string;
  /** Texto del ítem (sin el prefijo). */
  text: string;
}

export interface RoadmapPhaseDef {
  /** Id estable: 'rm-f<numero>'. */
  id: string;
  /** Número de fase visible (1-23). */
  number: number;
  title: string;
  /** Nota introductoria de la fase (opcional). */
  note?: string;
  items: RoadmapItemDef[];
}

export interface RoadmapTierDef {
  /** Id estable: 'rm-t1' | 'rm-t2' | 'rm-t3' | 'rm-final'. */
  id: string;
  title: string;
  subtitle: string;
  phases: RoadmapPhaseDef[];
}

/** Para considerar una competencia dominada (Mastered) hay que poder
 * ejecutarla, explicar el porqué, identificar riesgos, interpretar la
 * evidencia y resolver problemas sin tutoriales. */
export const ROADMAP_MASTERY_NOTE =
  'Para considerar una competencia dominada (Mastered), debes poder ejecutarla, ' +
  'explicar el porqué, identificar sus riesgos, interpretar la evidencia y ' +
  'resolver problemas sin tutoriales.';

/** Cabecera compartida por los roadmaps (IAM y HelpDesk). */
export interface RoadmapHeaderDef {
  title: string;
  specialization: string;
  edge: string;
}

export const ROADMAP_HEADER: RoadmapHeaderDef = {
  title: 'Roadmap: Junior IAM / Identity Security Analyst',
  specialization:
    'Especialización Principal: IAM & Identity Governance — AD/Entra ID, SSO/MFA, Life-Cycle, Roles, PAM, Okta, SailPoint y Access Governance',
  edge: 'Ventaja Competitiva: SOC / Blue Team Background aplicado a Identity Threat Detection & Response (ITDR)',
};

export const ROADMAP_TIERS: RoadmapTierDef[] = [
  {
    id: 'rm-t1',
    title: 'TIER 1 — EL NÚCLEO IMPRESCINDIBLE',
    subtitle: 'Dominio Absoluto Requerido. Aquí debes invertir el 70% de tu tiempo y esfuerzo práctico.',
    phases: [
      {
        id: 'rm-f1',
        number: 1,
        title: 'IAM Fundamentals & Identity Governance',
        note: 'El vocabulario y el porqué de TODO lo que viene después. Si este lenguaje no es nativo para ti, Okta, SailPoint y Entra serán cajas negras; con él, cualquier herramienta nueva es solo otra implementación de los mismos conceptos.',
        items: [
          {
            id: 'rm-f1-1',
            label: 'Conceptos Clave',
            text: 'Definir con precisión el ciclo JML: Joiner (alta el día de contratación con sus accesos correctos), Mover (cambio de rol: revocar lo del rol previo y asignar lo nuevo en la misma ventana) y Leaver (deprovisioning total). Explicar Birthright Access (acceso automático por condición de empleo, sin ticket) y Privilege Creep (acumulación silenciosa de accesos a través de Movers mal procesados).',
          },
          {
            id: 'rm-f1-2',
            label: 'Modelos de Acceso',
            text: 'Diferenciar RBAC (permisos por rol: el "Agente de Soporte N2" ve solo tickets asignados), ABAC (por atributos: department -eq "Finanzas" AND pais -eq "CO") y PBAC (políticas centralizadas evaluadas externamente, p. ej. OPA/Rego). Aplicar Least Privilege en cada diseño: el default es el mínimo para la función, no lo que el usuario pida ni lo que ya tenía.',
          },
          {
            id: 'rm-f1-3',
            label: 'Gobernanza',
            text: 'Comprender la Segregación de Funciones (SoD): identificar toxic combinations (crear proveedores + aprobar pagos; desarrollar código + desplegar a producción) y decidir su tratamiento. Entender las Access Reviews como control periódico: quién certifica, con qué frecuencia, con qué evidencia y qué ocurre con lo revocado.',
          },
          {
            id: 'rm-f1-4',
            label: 'Entrevista',
            text: 'Preparar la respuesta a "detecta y corrige el Privilege Creep cuando un empleado cambia de departamento": el Mover debe disparar una revocación delta del rol anterior ANTES de asignar el nuevo, cruzando la membresía real contra la matriz del rol estándar del puesto, con evidencia firmada de la limpieza.',
          },
          {
            id: 'rm-f1-5',
            label: 'Evidencia (Exit Criteria)',
            text: 'Redactar SOP-IAM-001-JML-Framework.pdf: flujos Joiner/Mover/Leaver diagramados, matriz de aprobación (qué aprueba el jefe directo, qué el dueño del sistema, qué exige seguridad), matriz RACI por evento y el control de evidencia (ticket + logs) que exige cada paso.',
          },
          {
            id: 'rm-f1-6',
            label: 'Conceptos Clave',
            text: 'Interiorizar "la identidad es el nuevo perímetro": el castle-and-moat murió y el control se trasladó a verificar explícitamente cada identidad en cada acceso. Relacionarlo con Zero Trust (NIST SP 800-207): identidad + dispositivo + contexto como tríada de decisión, y por qué "está en la red interna, entonces es confiable" ya no es un argumento aceptable.',
          },
          {
            id: 'rm-f1-7',
            label: 'Escenario',
            text: 'Caso práctico escrito: un analista pasa de Nómina a Ventas. Enumerar qué pierde (carpetas de nómina, consulta de salarios en el ERP), qué gana (CRM, histórico de clientes), qué tiende a quedar huérfano (grupo de exportación de datos, SharePoint del área vieja) y qué proceso lo habría evitado (trigger del Mover con lista de revocación delta aprobada).',
          },
          {
            id: 'rm-f1-8',
            label: 'Comparativa',
            text: 'Mapear el ecosistema por capas: IAM/IdM (directorio + autenticación: AD, Entra ID, Okta, Ping, ForgeRock), IGA (gobernanza del ciclo de vida: SailPoint, Saviynt), PAM (privilegios: CyberArk, One Identity Safeguard, BeyondTrust) y CIEM (identidades cloud: AWS IAM). Saber qué problema resuelve cada capa y citar un producto real por capa de memoria.',
          },
        ],
      },
      {
        id: 'rm-f2',
        number: 2,
        title: 'Active Directory Core & Security Auditing',
        items: [
          {
            id: 'rm-f2-1',
            label: 'Arquitectura y Objetos',
            text: 'Estructurar el dominio con OUs por función (nunca por persona), Users, Security Groups y Group Nesting. Aplicar AGDLP: Account → Global group (por equipo/función) → Domain Local group (del recurso) → Permission, de modo que se delega el permiso una sola vez y los cambios posteriores son de membresía, no de ACLs.',
          },
          {
            id: 'rm-f2-2',
            label: 'Cuentas y Protocolos',
            text: 'Administrar Service Accounts: naming svc-, owner documentado en description y migración a gMSA (New-ADServiceAccount -PrincipalsAllowedToRetrieveManagedPassword) para rotación automática. Manejar SPNs con setspn -S (valida duplicados) y entender kerberoasting. Diferenciar autenticación (Kerberos/LDAP) de autorización (ACLs/membresías) y LastLogon (exacto, por DC, no replicado) vs. LastLogonTimestamp (replicado, granularidad de días).',
          },
          {
            id: 'rm-f2-3',
            label: 'Auditoría de Seguridad',
            text: 'Detectar los hallazgos clásicos con PowerShell: cuentas durmientes (Search-ADAccount -AccountInactive -TimeSpan 90.00:00:00), PasswordNeverExpires sin justificación (Search-ADAccount -PasswordNeverExpires), exceso de Domain Admins (Get-ADGroupMember "Domain Admins") y administradores que inician sesión diaria con cuenta de admin. Clasificar cada hallazgo por severidad.',
          },
          {
            id: 'rm-f2-4',
            label: 'Entrevista',
            text: 'Saber responder qué eventos auditar ante membresías no autorizadas: 4728 (agregado a grupo Global), 4732 (grupo Domain Local), 4756 (grupo Universal), 4740 (lockout) y 4726 (cuenta eliminada). Indicar DÓNDE viven (Security log de cada DC, no del equipo local, porque cualquier DC pudo procesar el cambio) y cómo extraerlos: Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4728}.',
          },
          {
            id: 'rm-f2-5',
            label: 'Evidencia (Exit Criteria)',
            text: 'Generar un reporte de auditoría ejecutable por otro analista: hallazgo, evidencia (comando + salida real), severidad con matriz Likelihood x Impact (sin CVSS), dueño asignado y recomendación con el comando de remediación. Mínimo 4 hallazgos reales encontrados en tu propio laboratorio.',
          },
          {
            id: 'rm-f2-6',
            label: 'Comandos',
            text: 'Dominar el toolkit de auditoría sin googlear: Get-ADUser -Properties MemberOf,LastLogonDate,PasswordNeverExpires; Get-ADGroupMember -Recursive; Search-ADAccount -LockedOut; nltest /dsgetdc:dominio; klist purge. Criterio de listo: ejecutar un barrido completo de higiene de cuentas contra el lab en menos de 20 minutos.',
          },
          {
            id: 'rm-f2-7',
            label: 'Conceptos Clave',
            text: 'Entender Kerberos a nivel práctico: AS-REQ (password a cambio de un TGT), TGS-REQ (TGT a cambio de un ticket de servicio vía SPN) y por qué una service account con SPN y password débil es objetivo directo de kerberoasting (el ticket de servicio se crackea offline). Conocer a nivel conceptual Golden Ticket (KRBTGT comprometido) y Silver Ticket (SPN comprometido) como argumento de por qué el Tier 0 se aísla.',
          },
          {
            id: 'rm-f2-8',
            label: 'Escenario',
            text: 'Escenario "dominio desconocido": primer inventario en 60 minutos solo con PowerShell nativo — mapear jerarquía de OUs (Get-ADOrganizationalUnit -Filter *), contar Domain Admins y administradores locales (Get-LocalGroupMember "Administrators"), enumerar service accounts y cuentas con PNE, y proponer el modelo de administración en Tier 0/1/2 (los admins de dominio jamás inician sesión en estaciones de usuario).',
          },
        ],
      },
      {
        id: 'rm-f15',
        number: 3,
        title: 'Directory Services & LDAP',
        note: 'Directamente conectada con la fase de AD y con la de Okta: casi todo "la app no autentica contra el dominio" es un problema de LDAP disfrazado, y todo IGA termina consultando un directorio por LDAP.',
        items: [
          {
            id: 'rm-f15-1',
            label: 'Conceptos Clave',
            text: 'Leer y escribir LDAP con soltura: el DN (Distinguished Name) como ruta única del objeto (CN=Juan Perez,OU=Ventas,DC=corp,DC=local), jerarquía de contenedores (DC > OU > CN) y atributos clave: sAMAccountName (compatibilidad legacy), userPrincipalName (Kerberos moderno), mail, memberOf, objectClass/objectCategory.',
          },
          {
            id: 'rm-f15-2',
            label: 'Práctica',
            text: 'Usar ldp.exe (RSAT) y ldapsearch (Linux) contra tu DC: bind anónimo vs. simple vs. SASL, recorrer el tree browser de ldp.exe y lanzar ldapsearch -x -H ldap://dc01.corp.local:389 -D juan@corp.local -W -b "DC=corp,DC=local" "(sAMAccountName=jperez)". Criterio: resolver si una cuenta existe y está activa usando solo LDAP.',
          },
          {
            id: 'rm-f15-3',
            label: 'Conceptos Clave',
            text: 'Distinguir LDAP (389 en claro), StartTLS (negociación TLS dentro de 389) y LDAPS (636): por qué el bind simple en claro expone credenciales y qué certificado debe presentar el DC. Conocer el Global Catalog (3268/3269): por qué el memberOf de un usuario de otro dominio del bosque solo se ve consultando el GC.',
          },
          {
            id: 'rm-f15-4',
            label: 'Práctica',
            text: 'Construir filtros LDAP de memoria: igualdad (objectClass=user), AND (&(department=Ventas)(mail=*)), OR (|(a)(b)), NOT (!(...)), wildcards (cn=Maria*) y escape de caracteres especiales. Criterio: escribir sin ayuda el filtro "cuentas activas del OU Nómina que no requieren password" y validarlo contra el lab con ldp.exe o ldapsearch.',
          },
          {
            id: 'rm-f15-5',
            label: 'Conceptos Clave',
            text: 'Entender AD Trusts: intraforest (parent-child, automático y transitivo), external, forest trust y selective authentication; SID filtering como defensa contra elevación entre dominios. Saber responder: si un usuario del dominio B no accede a un recurso del dominio A, ¿qué objetos verificas y en qué orden?',
          },
          {
            id: 'rm-f15-6',
            label: 'Escenario',
            text: 'Troubleshooting estándar de bind: error 49 (credenciales inválidas: revisar formato UPN vs. DN del bind, estado de la cuenta, password) y error 52 o timeout (conectividad: registros SRV _ldap._tcp, Test-NetConnection dc01 -Port 636, certificado LDAPS). Documentar el checklist de 6 pasos que ejecutas antes de escalar.',
          },
          {
            id: 'rm-f15-7',
            label: 'Evidencia (Exit Criteria)',
            text: 'Publicar la mini-guía "LDAP para analistas IAM": anatomía de un DN comentada, cheatsheet de filtros probados en el lab con capturas de ldp.exe (bind, búsqueda, atributos devueltos) y una sección sobre AD LDS como sandbox para probar esquemas y aplicaciones LDAP sin tocar el AD de producción.',
          },
        ],
      },
      {
        id: 'rm-f3',
        number: 4,
        title: 'Microsoft Entra ID & Governance',
        items: [
          {
            id: 'rm-f3-1',
            label: 'Identidades Cloud',
            text: 'Crear y administrar en entra.microsoft.com: Users (member vs. guest B2B), Dynamic Groups con reglas de membresía (user.department -eq "Ventas"), Enterprise Applications (el Service Principal de cada app integrada) y Managed Identities para recursos. Entender qué sincroniza Entra Connect desde el AD local (y qué significa el immutableId en la identidad híbrida).',
          },
          {
            id: 'rm-f3-2',
            label: 'Políticas de Acceso',
            text: 'Configurar Conditional Access (Entra → Protection → Conditional Access): asignaciones (users/groups/cloud apps) + Access controls (Grant: Require MFA o Block; Session). Aplicar siempre primero en Report-only, validar con la herramienta What If y nombrar con convención (CA01-BLOCK-LegacyAuth). Tener la lógica clara: se evalúan todas y gana la más restrictiva.',
          },
          {
            id: 'rm-f3-3',
            label: 'Gobernanza Cloud',
            text: 'Implementar PIM (Eligible = asignación que exige activación temporal vs. Active = permanente; esta última evítala en roles administrativos), con role settings: duración máxima de activación, MFA al activar, aprobador y justificación. Configurar Entitlement Management (Access Packages con catálogo, política de quién pide, aprobadores y expiración) y campañas de Access Reviews de grupos y roles.',
          },
          {
            id: 'rm-f3-4',
            label: 'Entrevista',
            text: 'Explicar la evaluación de Conditional Access (todas las políticas aplican; ante dos que apliquen, gana la más restrictiva; se evalúan antes de que el usuario toque la aplicación) y cómo PIM mitiga la persistencia de cuentas comprometidas: el privilegio ya no vive permanentemente — expira en horas, exige MFA para activarse y cada activación deja bitácora auditable.',
          },
          {
            id: 'rm-f3-5',
            label: 'Evidencia (Exit Criteria)',
            text: 'Entregar la documentación de gobernanza del inquilino: tabla de políticas CA con el rationale de negocio de cada una, exportación del estado y role settings de PIM, y el CSV exportado de una Access Review cerrada con las decisiones tomadas.',
          },
          {
            id: 'rm-f3-6',
            label: 'Práctica',
            text: 'Montar el laboratorio: inquilino de prueba con Microsoft 365 Developer Program o trial de Entra ID P2 (P2 es el que habilita PIM, Entitlement Management y Access Reviews). Desplegar la política base CA-BLOCK-LegacyAuthentication (Client apps: Other clients) y demostrar con evidencia que un cliente IMAP básico falla y el navegador moderno pasa.',
          },
          {
            id: 'rm-f3-7',
            label: 'Conceptos Clave',
            text: 'Administrar PIM con criterio profesional: role settings por rol (activación de 4-8 h, MFA on activation, approvers del área, justificación/ticket obligatorio), revisión de las alertas nativas de PIM (asignaciones inusuales fuera de PIM, roles sin uso, activaciones anómalas) y gobernanza reforzada de los role-assignable groups (los grupos que pueden recibir roles de Entra).',
          },
          {
            id: 'rm-f3-8',
            label: 'Escenario',
            text: 'Escenario contractor de 90 días: alta como guest B2B, Access Package con expiración automática a los 90 días y aprobación del líder del área, y la política de ubicación corporativa resuelta con compensación documentada. Verificar en el flujo que al vencer el paquete el acceso muere solo, sin intervención manual y con evidencia de la revocación.',
          },
        ],
      },
      {
        id: 'rm-f4',
        number: 5,
        title: 'Microsoft Graph API para IAM',
        items: [
          {
            id: 'rm-f4-1',
            label: 'Fundamentos REST',
            text: 'Operar Microsoft Graph con soltura: endpoint https://graph.microsoft.com/v1.0, verbos GET/POST/PATCH/DELETE, payloads JSON y el JWT de acceso (claims aud, appid, scp/roles). Diferenciar Delegated permissions (actúa como el usuario conectado, respeta CA y MFA) de Application permissions (app-only, sin usuario: más potente y más peligroso). Practicar todo primero en Graph Explorer.',
          },
          {
            id: 'rm-f4-2',
            label: 'Consultas',
            text: 'Dominar OData: $filter, $select, $top, $orderby y $count (con header ConsistencyLevel: eventual para queries avanzadas sobre el directorio). Consulta real de inventario: GET /users?$filter=accountEnabled eq false&$select=id,displayName,userPrincipalName para enumerar cuentas deshabilitadas.',
          },
          {
            id: 'rm-f4-3',
            label: 'Entrevista',
            text: 'Argumentar el riesgo de un Service Principal con Directory.ReadWrite.All (application): es god-mode sin MFA, sin Conditional Access y sin expiración de sesión humana; un secreto o certificado robado permite leer y MODIFICAR todo el inquilino. Mitigación: permiso mínimo por operación, rotación de credenciales y auditoría periódica de OAuth permission grants.',
          },
          {
            id: 'rm-f4-4',
            label: 'Evidencia (Exit Criteria)',
            text: 'Construir y documentar consultas de saneamiento: asignaciones de roles obsoletas (GET /roleManagement/directory/roleAssignments cruzado con auditLogs), usuarios inactivos, miembros de grupos sin justificación; luego, en el lab, ejecutar la remediación con el permiso mínimo (RoleManagement.ReadWrite.Directory) registrando evidencia antes/después de cada cambio.',
          },
          {
            id: 'rm-f4-5',
            label: 'Comandos',
            text: 'Tener listo el toolkit del SDK: Install-Module Microsoft.Graph; Connect-MgGraph -Scopes "User.Read.All","AuditLog.Read.All"; Get-MgUser -Filter "accountEnabled eq false" -All; Get-MgGroupMember -GroupId <id>; Invoke-MgGraphRequest para recursos sin cmdlet; Select-MgProfile beta cuando el recurso solo exista en beta.',
          },
          {
            id: 'rm-f4-6',
            label: 'Escenario',
            text: 'Auditoría programática del inquilino: script re-ejecutable que reporte (1) Service Principals cuya última rotación de credenciales supere 180 días, (2) apps OAuth con consent concedido por usuarios, (3) cuentas activas sin inicio de sesión en 90 días según auditLogs/signIns. Criterio de listo: CSV de salida + explicación del riesgo por hallazgo.',
          },
        ],
      },
      {
        id: 'rm-f5',
        number: 6,
        title: 'SSO, Federación & SCIM',
        items: [
          {
            id: 'rm-f5-1',
            label: 'Protocolos',
            text: 'Diferenciar estrictamente: SAML 2.0 (SSO/federación enterprise: aserciones XML firmadas entre IdP y SP), OAuth 2.0 (delegación de autorización con access tokens), OIDC (autenticación estandarizada sobre OAuth: id_token, endpoints /authorize y /token) y SCIM 2.0 (aprovisionamiento CRUD del ciclo de vida vía REST). Regla: SAML autentica al usuario hacia apps, OAuth/OIDC autoriza a apps, SCIM crea y retira usuarios.',
          },
          {
            id: 'rm-f5-2',
            label: 'Troubleshooting',
            text: 'Capturar aserciones SAML con SAML Tracer (extensión de navegador), decodificar JWT en jwt.io verificando claims (aud, exp, iss, sub, scp) y depurar el attribute mapping (NameID, email, grupos) entre IdP y SP. Saber distinguir un fallo de firma/audience de un fallo de mapping: síntomas y causa raíz diferentes.',
          },
          {
            id: 'rm-f5-3',
            label: 'Entrevista',
            text: 'Responder el caso "el SSO funciona pero la cuenta no existe en la app": autenticación (SAML) y aprovisionamiento (SCIM) son dominios distintos. Orden de verificación: logs de provisioning (¿se creó? ¿qué error?), scoping filters (¿el usuario cae dentro del scope?), ¿la app exige asignación o licencia?, y solo al final el attribute mapping.',
          },
          {
            id: 'rm-f5-4',
            label: 'Evidencia (Exit Criteria)',
            text: 'Publicar la guía técnica del flujo completo: diagrama AuthnRequest → aserción decodificada (claims, firma, Audience), el POST /Users de SCIM con schema urn:ietf:params:scim:schemas:core:2.0:User y una tabla de errores típicos (AADSTS50011, SCIM 400 Bad Request) con su causa raíz y corrección.',
          },
          {
            id: 'rm-f5-5',
            label: 'Conceptos Clave',
            text: 'Dominar la anatomía SAML: IdP vs. SP, AuthnRequest, NameID (formato emailAddress/unspecified), Audience Restriction (debe coincidir con el Identifier/EntityID que la app espera), RelayState y aserción firmada vs. cifrada. Entender por qué AADSTS50011 (mismatch de Reply URL/audience) es el error número 1 al integrar apps y cómo corregirlo comparando Identifier URI y Reply URL contra la metadata del SP.',
          },
          {
            id: 'rm-f5-6',
            label: 'Conceptos Clave',
            text: 'Entender la federación como red de confianza: Home Realm Discovery (el dominio del correo decide a qué IdP redirigir), SP-initiated vs. IdP-initiated, dominios federados vs. managed en Entra, y el rol del STS. Saber por qué las empresas grandes terminan con un hub (PingFederate, ADFS o Entra) que federá hacia múltiples IdPs de partners y subsidiaries.',
          },
          {
            id: 'rm-f5-7',
            label: 'Práctica',
            text: 'Laboratorio: federar una app de prueba (samltest.id, o BookStack/Wiki.js self-hosted) con tu Entra u Okta de desarrollo; login exitoso end-to-end; luego romper a propósito el Identifier URI y rotar el certificado de firma, documentando los síntomas exactos (AADSTS50011, fallo de validación de firma) y la corrección de cada uno.',
          },
        ],
      },
      {
        id: 'rm-f16',
        number: 7,
        title: 'MFA & Autenticación Moderna',
        note: 'El 90% de las vacantes junior IAM incluyen "MFA / Conditional Access" como tarea diaria. Esta fase convierte el MFA de feature conocida en decisión de arquitectura con trade-offs explícitos.',
        items: [
          {
            id: 'rm-f16-1',
            label: 'Conceptos Clave',
            text: 'Clasificar factores: algo que sabes (password/PIN), tienes (TOTP RFC 6238, push, FIDO2 security key/passkey) o eres (biometría). Manejar la jerarquía de resistencia al phishing: SMS (débil: SIM swap) < TOTP (código phishable) < push con number matching < FIDO2/WebAuthn (origin binding criptográfico: la llave solo firma para el dominio real, inútil en un proxy de phishing).',
          },
          {
            id: 'rm-f16-2',
            label: 'Conceptos Clave',
            text: 'Analizar el MFA fatigue (bombardeo de push hasta que la víctima aprueba) y sus defensas: number matching en Microsoft Authenticator (aprobar exige teclear el número mostrado), contexto de ubicación/app en la notificación, rate limiting y bloqueo tras N rechazos. Tener lista la historia del caso Uber 2022 (MFA fatigue seguido de consent phishing) como story de entrevista.',
          },
          {
            id: 'rm-f16-3',
            label: 'Práctica',
            text: 'Configurar Entra MFA: Authentication methods policy (Entra → Protection → Authentication methods): habilitar Microsoft Authenticator (con number matching), tokens TOTP software OATH y FIDO2 security keys; gestionar la Combined registration (MFA + SSPR en un solo flujo) y medir adopción con el reporte de registrations de credenciales.',
          },
          {
            id: 'rm-f16-4',
            label: 'Práctica',
            text: 'Laboratorio FIDO2: registrar una passkey (llave YubiKey o la del navegador/teléfono) en tu inquilino, iniciar sesión solo con ella, crear una CA policy que exija "Phishing-resistant MFA" para roles administrativos y verificar en los sign-in logs que el método autenticado fue la llave (authentication method: FIDO2). Documentar la experiencia de registro desde la perspectiva del usuario.',
          },
          {
            id: 'rm-f16-5',
            label: 'Conceptos Clave',
            text: 'Bloquear legacy authentication: los protocolos básicos (POP/IMAP/SMTP AUTH y clientes "Other clients") no pueden hacer MFA y son el bypass favorito del password spraying. Política: CA-BLOCK-LegacyAuthentication (All users, All cloud apps, Block, client apps: Exchange ActiveSync + Other clients), con la break-glass excluida y monitoreo del report-only hasta confirmar cero accesos legítimos.',
          },
          {
            id: 'rm-f16-6',
            label: 'Escenario',
            text: 'Diseñar la política MFA de una empresa de 500 usuarios: MFA obligatorio para todos con step-up por riesgo (CA), métodos permitidos con su justificación, exclusiones documentadas (cuenta break-glass con control compensatorio: password largo en bóveda + alerta de uso) y despliegue por anillos (IT → piloto → toda la compañía) con criterios de éxito por anillo.',
          },
          {
            id: 'rm-f16-7',
            label: 'Entrevista',
            text: 'Preparar la respuesta a "¿MFA es infalible?": no — phishing AiTM (Evilginx roba cookies de sesión), SIM swap, fatigue y token theft evaden los factores débiles. Contramedida por vector: FIDO2/passkeys contra AiTM, number matching contra fatigue, CAE (Continuous Access Evaluation) y revocación de sesiones contra token theft. Cerrar con la tesis: MFA fuerte + CA + monitoreo de sign-ins = defensa en capas.',
          },
        ],
      },
      {
        id: 'rm-f17',
        number: 8,
        title: 'Identity Life-Cycle & Provisioning',
        note: 'El life-cycle es EL corazón operativo de IAM y la razón de existencia de las herramientas IGA. Domínalo como proceso medible antes de ver cualquier herramienta.',
        items: [
          {
            id: 'rm-f17-1',
            label: 'Conceptos Clave',
            text: 'Distinguir Birthright access (se asigna automáticamente por la condición de empleo: correo, intranet, carpetas del equipo — cero tickets) de Solicitable access (requiere aprobación: ERP financiero, datos sensibles). Definir el golden record del empleado en el HRIS como fuente autoritativa y sus atributos mínimos: employeeID, department, manager, employmentType, hire/termination date.',
          },
          {
            id: 'rm-f17-2',
            label: 'Conceptos Clave',
            text: 'Diseñar el Joiner: pre-boarding D-5 (cuenta creada y lista antes del día 1), accesos por rol estándar del puesto + paquete de onboarding, inscripción MFA planificada (QR en el primer login o pre-enrollment vía helpdesk verificado) y verificación de que el día 1 el usuario trabaja sin abrir un solo ticket de acceso.',
          },
          {
            id: 'rm-f17-3',
            label: 'Conceptos Clave',
            text: 'Operar el Mover como evento de dos pasos: revocación delta del rol anterior + asignación del rol nuevo en la misma ventana. Cubrir los casos que fallan en la vida real: contractor convertido a empleado (mismo correo, identidad nueva o continuada — política explícita), reingreso (reactivar la identidad original vs. crear una nueva) y cambio de departamento con preservación del historial de accesos.',
          },
          {
            id: 'rm-f17-4',
            label: 'Conceptos Clave',
            text: 'Ejecutar el Leaver total: deshabilitar (no borrar: preservar el objeto para auditoría y reingresos), transferir ownership de datos y buzón, revocar sesiones y tokens (Entra: Revoke sessions + reset password), retirar licencias para liberar coste y dar de baja tokens físicos. Definir quién dispara el evento: ideal HRIS-driven; fallback manual vía ticket auditado.',
          },
          {
            id: 'rm-f17-5',
            label: 'Práctica',
            text: 'Laboratorio SCIM 2.0: montar un endpoint SCIM de prueba (validador público tipo scim.dev o un mock con RequestBin) y capturar el POST /Users que envía tu IdP (schema urn:ietf:params:scim:schemas:core:2.0:User), el PATCH de activate/deactivate y los errores 400 de atributos faltantes. Leer los JSON crudos hasta que el provisioning deje de ser magia.',
          },
          {
            id: 'rm-f17-6',
            label: 'Escenario',
            text: 'Definir SLAs medibles de JML acordados con el negocio (ejemplo: Joiner listo el D0, Mover resuelto en 5 días, Leaver deshabilitado el mismo día — 4 horas si es hostil) y diseñar su medición: timestamps del HRIS vs. timestamps de AD/Entra, % de cumplimiento mensual, top de violaciones por área. Un KPI sin fuente de datos definida no es un KPI.',
          },
          {
            id: 'rm-f17-7',
            label: 'Evidencia (Exit Criteria)',
            text: 'Publicar la matriz de ciclo de vida por población (empleado, contractor, tercero/B2B, service account, cuenta de emergencia): quién dispara el evento, qué se crea/revoca, cuándo expira, quién aprueba y cómo se verifica. Este es el artefacto que te pedirán explicar en cualquier entrevista de IGA.',
          },
        ],
      },
      {
        id: 'rm-f6',
        number: 9,
        title: 'Automatización IAM & PowerShell',
        items: [
          {
            id: 'rm-f6-1',
            label: 'Evolución',
            text: 'Madurar por niveles: Read-Only (consultas y reportes manuales) → Reporting (exportaciones periódicas CSV/JSON) → Comparación de fuentes (HR vs. AD vs. licencias) → Remediación controlada (scripts con -WhatIf, aprobación y bitácora). Saber el riesgo que asumes al subir de cada nivel y qué control lo mitiga.',
          },
          {
            id: 'rm-f6-2',
            label: 'Práctica',
            text: 'Cruzar un CSV de RRHH contra el directorio: Import-Csv hr.csv vs. Get-ADUser -Filter * -Properties mail,employeeID con Compare-Object -Property employeeID -PassThru, y clasificar el resultado: solo en RRHH (alta pendiente o fuga de datos) y solo en AD (cuenta huérfana = posible leaver no procesado). Documentar la acción por cada clase.',
          },
          {
            id: 'rm-f6-3',
            label: 'Entrevista',
            text: 'Explicar por qué -WhatIf/-Confirm, Start-Transcript y logs de auditoría son innegociables antes de cualquier cambio destructivo: el script que deshabilita 300 cuentas debe poder demostrar en dry-run exactamente qué haría, quién lo ejecutó, desde dónde y con qué aprobación. Ten lista una anécdota real de un script sin -WhatIf que hizo daño (propia o documentada).',
          },
          {
            id: 'rm-f6-4',
            label: 'Evidencia (Exit Criteria)',
            text: 'Repositorio de scripts modulares y documentados: estructura por carpetas (01-Inventory, 02-Compare, 03-Report, 04-Remediate), cada script con header de propósito, riesgo, permisos requeridos y ejemplo de salida. Mínimo 6 scripts funcionando contra tu lab.',
          },
          {
            id: 'rm-f6-5',
            label: 'Comandos',
            text: 'Dominar el pipeline híbrido AD + Entra: Get-ADUser / Get-ADGroupMember del lado on-prem; Get-MgUser, Get-MgGroupMember e Invoke-MgGraphRequest del lado cloud; Export-Csv -NoTypeInformation y ConvertTo-Json para salidas. Criterio: encadenar un reporte de higiene combinado (inactivos locales + inactivos cloud) en un solo script parametrizado.',
          },
          {
            id: 'rm-f6-6',
            label: 'Escenario',
            text: 'Automatizar el informe semanal de higiene IAM: (1) cuentas inactivas 90+ días, (2) PasswordNeverExpires sin tag de excepción, (3) administradores permanentes que deberían estar en PIM, (4) grupos vacíos. Entregarlo como script re-ejecutable con parámetros (OU, umbral de días) y un CSV por sección. "Listo" = corre contra el lab sin edición manual y un jefe lo entiende sin explicación.',
          },
        ],
      },
      {
        id: 'rm-f7',
        number: 10,
        title: 'Troubleshooting IAM Operations',
        items: [
          {
            id: 'rm-f7-1',
            label: 'Metodología',
            text: 'Memorizar y usar la cadena de diagnóstico: Identidad (¿existe? ¿activa? ¿bloqueada?) → Grupo/Rol (¿membresía esperada?) → Asignación de app (¿asignado al Service Principal?) → Licencia (¿group-based licensing con error?) → SCIM (¿provisionado en el target?) → SSO (¿assertó bien el IdP?) → Conditional Access (¿alguna policy lo bloqueó o exigió más?) → Permisos de la app (¿el rol interno le deja ver?). Cada eslabón con la herramienta concreta que lo verifica.',
          },
          {
            id: 'rm-f7-2',
            label: 'Resolución',
            text: 'Investigar con la fuente correcta: fallos de CA (Entra sign-in logs: pestaña Conditional Access con la política aplicada y el control fallido), firmas SAML (aserción con Audience/EntityID incorrecto → AADSTS50011) y rechazos de esquema SCIM (logs de provisioning del IdP: required attribute missing, 400 Bad Request del target).',
          },
          {
            id: 'rm-f7-3',
            label: 'Entrevista',
            text: 'Estructurar la respuesta a "un usuario no puede entrar a la app web corporativa, ¿qué haces?": (1) reproducir con los datos del usuario, (2) filtrar sign-in logs por su UPN y la app, (3) leer el error code exacto, (4) validar CA y MFA, (5) validar asignación y licencia, (6) validar SCIM del lado del target. Cerrar comunicando la causa raíz al usuario en su lenguaje.',
          },
          {
            id: 'rm-f7-4',
            label: 'Evidencia (Exit Criteria)',
            text: 'Playbooks de resolución documentados para 5 escenarios reales: usuario sin acceso a app SAML, loop de MFA, usuario fuera del grupo dinámico esperado, SCIM que no crea la cuenta y app que rechaza la aserción. Cada playbook con síntoma, diagnóstico paso a paso, causa raíz típica y fix verificado.',
          },
          {
            id: 'rm-f7-5',
            label: 'Escenario',
            text: 'Entrenar la lectura de sign-in logs como un profesional: error 50126 (credenciales inválidas), 53003 (bloqueado por CA), 50076 (MFA requerido y no satisfecho), 50105 (usuario sin asignación/app role). Para cada uno: qué campo adicional del registro lo confirma (pestaña Conditional Access, Authentication details, Application) y cuál es tu siguiente paso.',
          },
          {
            id: 'rm-f7-6',
            label: 'Práctica',
            text: 'Adoptar la bitácora de troubleshooting como hábito profesional: cada caso con timeline, hipótesis probadas y descartadas, causa raíz, fix y prevención. Tras 10 casos tienes el material exacto de tus historias de entrevista (formato STAR) y el germen de runbooks reutilizables.',
          },
        ],
      },
    ],
  },
  {
    id: 'rm-t2',
    title: 'TIER 2 — VALOR EMPRESARIAL',
    subtitle:
      'Diferenciadores estratégicos. Conceptos cruciales para roles Enterprise. No requieren despliegues masivos, sino comprensión arquitectónica profunda.',
    phases: [
      {
        id: 'rm-f18',
        number: 11,
        title: 'Diseño e Implementación de un Access Role Model',
        note: 'La competencia que separa a un operador IAM de un arquitecto: casi toda vacante enterprise/IGA la pide como "design and implement an access role model". Trabájala hasta poder defenderla ante un comité.',
        items: [
          {
            id: 'rm-f18-1',
            label: 'Conceptos Clave',
            text: 'Manejar los enfoques de role engineering: top-down (partir de funciones de negocio: "Analista de Cartera", "Coordinador de Compras" — limpio pero depende del negocio), bottom-up (role mining sobre accesos existentes: rápido pero hereda el desorden) e híbrido (mining + validación con dueños — el estándar de la industria). Saber recomendar el híbrido y justificar por qué.',
          },
          {
            id: 'rm-f18-2',
            label: 'Conceptos Clave',
            text: 'Diseñar la jerarquía de roles: business roles (reflejan puestos) → functional roles (capacidades transversales: "Aprobador de Compras") → technical roles/entitlements (grupos, permisos, roles de app). Evitar la explosión de roles (más roles que usuarios = nadie sabe qué pedir) y fijar la convención de nombres (RB-<area>-<puesto>-L1/L2) desde el día 1.',
          },
          {
            id: 'rm-f18-3',
            label: 'Práctica',
            text: 'Construir la matriz rol ↔ entitlements en hoja de cálculo para un área real o ficticia: rol "Analista de Nómina" → grupos AD (GG-NOMINA-CONSULTA-R), carpetas (\\fs01\nomina\lectura), apps SaaS (Workday: rol Reporter), base de datos (SELECT en esquema HR). Una fila por entitlement con dueño del sistema y criticidad.',
          },
          {
            id: 'rm-f18-4',
            label: 'Conceptos Clave',
            text: 'Construir la matriz SoD en paralelo al modelo: enumerar las toxic combinations por proceso (purchase-to-pay: crear proveedor ≠ aprobar factura ≠ ejecutar pago; SDLC: desarrollar ≠ desplegar a producción) y decidir por cada una: prevenir en el modelo (roles mutuamente excluyentes) o aceptar con control compensatorio documentado y fechado.',
          },
          {
            id: 'rm-f18-5',
            label: 'Práctica',
            text: 'Role mining manual con PowerShell: extraer memberships por departamento (Get-ADUser -LdapFilter "(department=Nómina)" -Properties MemberOf) y agrupar para detectar el patrón común (el rol de facto) y los outliers (accesos que solo una persona tiene: riesgo de punto único o de exceso). Documentar hallazgos con la hipótesis del rol emergente.',
          },
          {
            id: 'rm-f18-6',
            label: 'Práctica',
            text: 'Implementar el modelo en Entra ID: grupos de rol con naming documentado, asignación por dynamic group (atributo department) para roles estándar, asignación aprobada para roles sensibles y dueño del rol registrado en el catálogo. Verificar con un cambio real de departamento que la revocación y asignación ocurren automáticamente.',
          },
          {
            id: 'rm-f18-7',
            label: 'Escenario',
            text: 'Ejecutar un piloto de 4 semanas en un departamento: cargar el modelo, medir tiempo de onboarding antes/después, contar tickets de acceso evitados, recolectar feedback de dueños y usuarios, ajustar y publicar v1.0 con changelog. El piloto con métricas es lo que convence a la gerencia de escalar el modelo a toda la empresa.',
          },
          {
            id: 'rm-f18-8',
            label: 'Evidencia (Exit Criteria)',
            text: 'Paquete "Role Model v1.0" completo: matriz rol ↔ entitlements, matriz SoD, convención de nombres, owners por rol, proceso de creación/cambio/retiro de roles con gestión de versiones y métricas del piloto. Este documento es oro puro en entrevistas IGA.',
          },
        ],
      },
      {
        id: 'rm-f19',
        number: 12,
        title: 'Procesos de Concesión de Privilegios (Granting)',
        note: 'Granting con proceso = auditoría aprobada. Granting improvisado = hallazgo de auditoría. La diferencia es evidencia y separación de funciones.',
        items: [
          {
            id: 'rm-f19-1',
            label: 'Conceptos Clave',
            text: 'Definir la cadena de granting: Request (el usuario pide vía catálogo) → Approval (aprueba quien corresponde) → Provisioning (lo ejecuta la herramienta, no un humano a mano) → Verification (evidencia de que quedó). Principio rector: quien solicita ≠ quien aprueba ≠ quien provisiona, y los tres quedan en bitácora inmutable.',
          },
          {
            id: 'rm-f19-2',
            label: 'Conceptos Clave',
            text: 'Atribuir aprobaciones al dueño correcto: el jefe directo aprueba accesos genéricos del rol; el data owner / system owner aprueba accesos a SU sistema o datos (el jefe de Ventas no puede aprobar acceso al ERP financiero). Definir el fallback por ausencia: delegado designado + escalado automático tras X días sin respuesta.',
          },
          {
            id: 'rm-f19-3',
            label: 'Práctica',
            text: 'Implementarlo con tooling real: Entra Entitlement Management (Access Package: política de quién puede pedir, aprobador, duración) o el catálogo de ServiceNow/Jira como flujo de aprobación. Evidencia: capturas del paquete/flujo configurado con aprobador distinto del solicitante y el historial de una aprobación real ejecutada en el lab.',
          },
          {
            id: 'rm-f19-4',
            label: 'Conceptos Clave',
            text: 'Gestionar excepciones sin matar el control: toda excepción lleva vencimiento (90 días máx), doble aprobación (dueño + seguridad), control compensatorio documentado (p. ej. monitoreo reforzado) y revisión obligatoria en la próxima campaña. Sin fecha de vencimiento no es una excepción: es un acceso permanente no gobernado.',
          },
          {
            id: 'rm-f19-5',
            label: 'Conceptos Clave',
            text: 'Garantizar evidencia de auditoría: cada grant responde quién, qué, por qué (justificación de negocio), quién aprobó y cuándo; la evidencia es reconstruible desde registros inmutables (tickets, logs de la herramienta, audit de PIM). Practicar reconstruir el historial completo de UN acceso usando solo los registros.',
          },
          {
            id: 'rm-f19-6',
            label: 'Escenario',
            text: 'Diseñar el self-service con límites: qué paquetes son auto-solicitables (accesos de bajo riesgo) vs. requieren doble aprobación, límite de solicitudes abiertas por usuario, reconciliación semanal entre lo concedido y lo realmente usado, y la métrica objetivo: menos tickets de acceso SIN pérdida de control.',
          },
          {
            id: 'rm-f19-7',
            label: 'Evidencia (Exit Criteria)',
            text: 'Redactar SOP-IAM-002-Granting: flujo diagramado (request → approval → provisioning → verification), matriz RACI, SLA por tipo de acceso (estándar 3 días, crítico 5 días con doble aprobación) y un ejemplo end-to-end real del lab con los 4 hitos fechados y sus evidencias.',
          },
        ],
      },
      {
        id: 'rm-f20',
        number: 13,
        title: 'Procesos de Revocación (Revoking & Deprovisioning)',
        note: 'La revocación es donde falla la mayoría de los programas IAM. Hablar de residuos de acceso, sesiones vivas y kill switch te posiciona por encima del promedio en entrevistas.',
        items: [
          {
            id: 'rm-f20-1',
            label: 'Conceptos Clave',
            text: 'Definir el deprovisioning TOTAL como checklist: cuenta AD deshabilitada, Entra bloqueado, sesiones/tokens revocados, licencias liberadas, grupos retirados (incl. grupos de apps SaaS vía SCIM), tokens físicos y accesos físicos, delegaciones (buzón, calendario) y ownerships transferidas. Revocación incompleta = residuo de acceso = el hallazgo clásico de auditoría.',
          },
          {
            id: 'rm-f20-2',
            label: 'Conceptos Clave',
            text: 'Diseñar la revocación de emergencia (kill switch) para terminación hostil o cuenta comprometida: en paralelo — Disable-ADAccount, reset de password, Revoke-MgUserSignInSession (mata los refresh tokens), retirar llaves MFA y bloquear dispositivos registrados. Objetivo: el acceso muere en minutos, no en horas, y cada acción dispara alerta y queda auditada.',
          },
          {
            id: 'rm-f20-3',
            label: 'Práctica',
            text: 'Correr el drill de revocación contra el lab y medirte: tiempo desde "notificación" hasta verificación final (objetivo < 30 minutos). Documentar el checklist ejecutado con timestamps de cada paso. Publicar el drill como runbook repetible, no como heroicidad de una tarde.',
          },
          {
            id: 'rm-f20-4',
            label: 'Conceptos Clave',
            text: 'Entender sesiones y tokens: quitar a alguien de un grupo NO expulsa su sesión abierta; los access tokens viven en el cliente hasta expirar y los refresh tokens permiten renovar sesión. Por eso la revocación dura exige: revocar refresh tokens/sesiones, resetear password y forzar re-autenticación — y en apps legacy, matar la sesión del lado del servidor.',
          },
          {
            id: 'rm-f20-5',
            label: 'Escenario',
            text: 'Verificar post-revocación como paso obligatorio del proceso: intento de login (falla esperada), apps con SSO de sesión larga (cookie persistente: forzar logout), licencias liberadas, tokens OAuth delegados por el usuario (Enterprise apps → consent concedido: revocar), membresías re-verificadas contra el rol original. La verificación convierte "creo que lo desactivé" en evidencia.',
          },
          {
            id: 'rm-f20-6',
            label: 'Evidencia (Exit Criteria)',
            text: 'Montar el mini-programa de métricas de revocación: % de leavers revocados dentro del SLA, tiempo medio de revocación, residuos detectados por trimestre (fuente: access reviews) y casos de emergencia con su timeline completo. Reporte mensual de una página — el tipo de artefacto que un CISO sí lee.',
          },
        ],
      },
      {
        id: 'rm-f21',
        number: 14,
        title: 'Access Reviews & Certificaciones',
        note: 'Si vienes del SOC, piensa en las campañas como "threat hunting periódico del acceso": el mismo método de hipótesis y evidencia, apuntando a entitlements.',
        items: [
          {
            id: 'rm-f21-1',
            label: 'Conceptos Clave',
            text: 'Definir la campaña de certificación: alcance (población/entitlements/sistemas), frecuencia (trimestral para accesos críticos, anual para el resto), reviewers (gestores para membresías, data owners para entitlements de su sistema), evidencia firmada y la pregunta que se certifica: "esta persona aún NECESITA este acceso para su trabajo actual?".',
          },
          {
            id: 'rm-f21-2',
            label: 'Práctica',
            text: 'Ejecutar en Entra ID: crear una Access Review sobre un grupo crítico (Domain Admins o un grupo de aplicación): reviewers seleccionados, duración 2 semanas, auto-apply results (revocar a los no confirmados), y al cierre exportar los resultados (CSV) como evidencia con decisiones y justificaciones.',
          },
          {
            id: 'rm-f21-3',
            label: 'Conceptos Clave',
            text: 'Conocer el modelo IGA de certificaciones (SailPoint): manager campaigns (certificas los accesos de tus reportes directos), owner/targeted certifications (el dueño certifica un entitlement o rol completo) y revocación automática post-cierre. La revocación automática es lo que distingue una campaña seria de una encuesta decorativa.',
          },
          {
            id: 'rm-f21-4',
            label: 'Conceptos Clave',
            text: 'Combatir el rubber-stamping (aprobar por inercia): carga limitada por reviewer, justificación obligatoria para accesos críticos, seguimiento de tasas de revocación (el reviewer que jamás revoca es una señal de alerta), muestreo aleatorio de decisiones y recertificación dirigida a outliers (accesos de alto riesgo o sin uso detectado).',
          },
          {
            id: 'rm-f21-5',
            label: 'Conceptos Clave',
            text: 'Focalizar campañas en toxic combinations: extraer los cruces SoD del modelo de roles y certificarlos primero (quién tiene ambas mitades de cada combinación), porque ahí el deny del reviewer no basta: hay que decidir prevenir, transferir o compensar. El cruce SoD + campaña es la pregunta de gobernanza más frecuente en entrevistas.',
          },
          {
            id: 'rm-f21-6',
            label: 'Escenario',
            text: 'Simular una campaña completa con 3 grupos y 12 usuarios ficticios (una hoja de cálculo sirve): cargar accesos, decisiones por reviewer con justificación, revocaciones, excepciones con vencimiento y auto-apply simulado. Documentar el antes/después (accesos revocados, tiempo de remediación) y la retroalimentación de los reviewers.',
          },
          {
            id: 'rm-f21-7',
            label: 'Evidencia (Exit Criteria)',
            text: 'Publicar el mini-programa de certificaciones: calendario anual (Q1: Tier 0, Q2: financiero, Q3: ingeniería, Q4: todos los roles), plantilla de campaña, KPIs (tasa de respuesta, % revocado, tiempo de remediación, excepciones vigentes) y el reporte de cierre con firmas de los owners. Presentable como "programa", no como tarea.',
          },
        ],
      },
      {
        id: 'rm-f11',
        number: 15,
        title: 'Privileged Access Management (PAM)',
        note: 'De concepto a arquitectura: saber explicar el flujo completo checkout → rotación → sesión grabada es lo que piden las vacantes de PAM junior.',
        items: [
          {
            id: 'rm-f11-1',
            label: 'Conceptos',
            text: 'Interiorizar el stack PAM: credential vaulting (la bóveda guarda la clave y el humano jamás la ve), checkout con aprobación, rotación automática post-sesión (y cada N días), Just-In-Time elevation (el privilegio existe solo durante la ventana de trabajo) y session monitoring (grabación y keystroke logging de la sesión privilegiada). Break-glass accounts como último recurso monitoreado.',
          },
          {
            id: 'rm-f11-2',
            label: 'Evidencia (Exit Criteria)',
            text: 'Documentar el procedimiento break-glass completo: cuentas de emergencia selladas (password en bóveda PAM o envelope splitting entre dos custodios), alerta inmediata al usarse, revisión post-uso en 24 h con justificación formal, y la matriz de control de service accounts críticas (dueño, dependencias, rotación, ubicación de la credencial).',
          },
          {
            id: 'rm-f11-3',
            label: 'Conceptos Clave',
            text: 'Explicar la arquitectura de un PAM: bóveda de credenciales, flujo de checkout (solicitar → aprobar → obtener credencial temporal → rotar al cerrar), broker/proxy de sesión (el usuario aterriza en un jump host y la sesión se graba) e integración con ticketing (sin ticket no hay checkout). Describir el checkout flow de One Identity Safeguard (appliance con policy engine y session recording) como ejemplo concreto.',
          },
          {
            id: 'rm-f11-4',
            label: 'Comparativa',
            text: 'Comparar con criterio: CyberArk PAM Self-Hosted (estándar de mercado: vaulting + PSM/proxy de sesión), BeyondTrust Password Safe/Remote Support (vaulting + inyección de credenciales en sesiones remotas), One Identity Safeguard (appliance, fuerte en ambientes Microsoft, sesiones grabadas) y Entra PIM (JIT de roles cloud, sin vaulting). Cuándo recomendar cada uno: presupuesto, on-prem vs. cloud y requisito de grabación.',
          },
          {
            id: 'rm-f11-5',
            label: 'Práctica',
            text: 'Implementar JIT administration con Entra PIM: convertir asignaciones permanentes de Global Administrator en elegibles (activación de 4 h con MFA + justificación + aprobación) y extender el modelo a grupos: role-assignable group + PIM for Groups para membresía temporal. Verificar en el audit log la evidencia completa de cada activación.',
          },
          {
            id: 'rm-f11-6',
            label: 'Escenario',
            text: 'Migrar service accounts a bóveda: inventariar (dueño, dependencias, última rotación), ingerir las credenciales al PAM, romper las dependencias que guardan el password en claro (tareas programadas, servicios, connection strings) y ejecutar la primera rotación con plan de rollback. El escenario que más duele en producción y más se agradece en entrevistas.',
          },
          {
            id: 'rm-f11-7',
            label: 'Entrevista',
            text: 'Responder por qué "cambiar el password del admin cada 90 días" NO es PAM: passwords compartidos por el equipo, reuse en N sistemas, cero trazabilidad de quién hizo qué, sin grabación de sesión y rotación real de sticker bajo el teclado. Cómo resuelve cada punto el vaulting + checkout + rotación + session monitoring. Cerrar con el argumento de insider risk: gran parte del movimiento lateral abusa de credenciales válidas.',
          },
        ],
      },
      {
        id: 'rm-f9',
        number: 16,
        title: 'Okta Workforce Identity',
        items: [
          {
            id: 'rm-f9-1',
            label: 'Práctica Limitada',
            text: 'Montar el dev org gratis en developer.okta.com: crear usuarios y grupos, agregar una app por SAML u OIDC (SWA/Bookmarks o una app del OIN como Slack trial) y activar el provisioning SCIM hacia una app de prueba. Familiarizarte con el admin console: Directory, Applications, Security, Reports — saber qué vive en cada pestaña.',
          },
          {
            id: 'rm-f9-2',
            label: 'Auditoría',
            text: 'Dominar el Okta System Log (Reports → System Log): filtrar por eventType (user.authentication.auth_via_mfa, user.session.start, user.lifecycle.deactivate, app.user.provision), por actor y por severidad (INFO/WARN/ERROR); exportar a CSV y consumirlo vía API (GET /api/v1/logs). Es tu fuente de verdad en cualquier investigación Okta.',
          },
          {
            id: 'rm-f9-3',
            label: 'Evidencia (Exit Criteria)',
            text: 'Demo documentada end-to-end: crear usuario en Okta → SCIM lo provisiona en la app de prueba → login SSO exitoso → deactivate en Okta → verificación de la desactivación en el target Y registro del System Log con los eventos de cada hito. Capturas + explicación de cada eventType observado.',
          },
          {
            id: 'rm-f9-4',
            label: 'Práctica',
            text: 'Explorar Universal Directory: el perfil de usuario base, los mappings de atributos por app (atributo origen en Okta → atributo destino en la app) y cómo un cambio (department) se propaga; group rules para membresía dinámica. Verificar el caso completo: cambio de atributo → cambio de grupo → cambio de app asignada.',
          },
          {
            id: 'rm-f9-5',
            label: 'Práctica',
            text: 'Configurar authentication policies y adaptive MFA: sign-on policy con factores exigidos por grupo, riesgo contextual (IP anonymizer, nueva geografía, impossible travel, new device) y behaviors; política que exija phishing-resistant (Okta Verify FastPass/WebAuthn) para el grupo de administradores. Documentar la lógica de evaluación (la política más restrictiva gana, igual que CA).',
          },
          {
            id: 'rm-f9-6',
            label: 'Conceptos Clave',
            text: 'Manejar el ciclo de vida en Okta: estados del usuario (Staged → Pending Activation → Active → Suspended → Deactivated), asignación de apps vía grupos, y Okta Workflows para automatizar el offboarding (deactivate → revocar sesiones → retirar apps → abrir ticket). Entender por qué Suspended ≠ Deactivated (suspensión conserva la licencia y es reversible).',
          },
          {
            id: 'rm-f9-7',
            label: 'Escenario',
            text: 'Troubleshooting Okta guiado: (1) SSO falla tras expirar o rotar el certificado SAML de la app (revisar la rotación de keys en la integración), (2) usuario Staged que nunca activa (revisar email de activación y política del grupo), (3) usuario autentica en Okta pero la app no lo reconoce (revisar SCIM y app assignment). En cada caso: cómo el System Log te dice cuál de los tres es.',
          },
        ],
      },
      {
        id: 'rm-f10',
        number: 17,
        title: 'Arquitectura IGA (SailPoint / Saviynt)',
        items: [
          {
            id: 'rm-f10-1',
            label: 'Conceptos',
            text: 'Comprender la arquitectura IGA: HRIS como authoritative source (Workday/SAP SuccessFactors) → Identity Cube en SailPoint (Identity Security Cloud, antes IdentityNow): la vista 360 de cada identidad con cuentas, entitlements y relaciones → connectors hacia targets (AD, Entra, SAP, bases de datos) → aggregation y correlation (evitar identidades duplicadas por mal match) → entitlements y roles gobernados.',
          },
          {
            id: 'rm-f10-2',
            label: 'Gobernanza',
            text: 'Entender los motores de gobernanza: role mining (agrupar entitlements comunes para proponer roles), Access Request Center con flujos de aprobación (aprueba el dueño, no IT) y certification campaigns con revocación automática al cierre. Saber cómo el IGA resuelve el Mover (reasignación delta de roles) y el Leaver (LCM workflows de desprovisionamiento).',
          },
          {
            id: 'rm-f10-3',
            label: 'Evidencia (Exit Criteria)',
            text: 'Diagramas de arquitectura documentados: flujo HR → IGA → provisioning a targets, resolución de conflictos (identidad duplicada, múltiples cuentas por identidad, authoritative conflict: dos sistemas afirman cosas distintas del mismo usuario) — simulado, pero con reglas de decisión explícitas y justificadas.',
          },
          {
            id: 'rm-f10-4',
            label: 'Conceptos Clave',
            text: 'Interiorizar el modelo de entitlements: cuentas → entitlements (grupo, rol de app, permiso granular) → roles, con dueño, criticidad y clasificación de datos por entitlement. El catálogo de entitlements es EL prerequisito de toda la gobernanza: sin inventario no hay roles, ni campañas, ni SoD real.',
          },
          {
            id: 'rm-f10-5',
            label: 'Práctica',
            text: 'Recorrer SailPoint de primera mano: solicitar la demo/trial de Identity Security Cloud (o estudiar la documentación pública + videos oficiales) e identificar en la UI: Identity Warehouse, Access Request, Certifications y la configuración de un connector genérico. Construir tu glosario: LCM, identity cube, aggregation, correlation, birthright roles.',
          },
          {
            id: 'rm-f10-6',
            label: 'Conceptos Clave',
            text: 'Posicionar Saviynt frente a SailPoint: Saviynt vende plataforma unificada (IGA + control de apps cloud + librería de riesgo/SoD out-of-box + risk scores nativos), SailPoint domina el mercado IGA puro con el ecosistema de partners más grande. Diferencias de enfoque en role mining y en el modelado de riesgo — saber decirlo en una frase cada una.',
          },
          {
            id: 'rm-f10-7',
            label: 'Escenario',
            text: 'Ejercicio de selección para una empresa de 5.000 usuarios con SAP + AD + Entra + SaaS: criterios comparados (integraciones nativas SAP, librería SoD, coste de implementación, time-to-value, soporte regional) y recomendación argumentada con trade-offs. La pregunta de "criterios de selección de plataforma" aparece en entrevistas enterprise más de lo que crees.',
          },
        ],
      },
      {
        id: 'rm-f22',
        number: 18,
        title: 'Plataformas IAM Enterprise: Ping, ForgeRock, IBM & Oracle',
        note: 'Objetivo: no ser experto en cada una, sino reconocerlas, ubicarlas en una arquitectura y no perderse cuando el entrevistador dice PingFederate, WebGate o IDM.',
        items: [
          {
            id: 'rm-f22-1',
            label: 'Conceptos Clave',
            text: 'Mapear el landscape: Ping Identity (PingFederate = hub de federación/SSO, PingID = MFA, PingDirectory = directorio, PingAuthorize = policies/decisiones), ForgeRock (hoy gestionada bajo One Identity: DS = directory services, AM = access management, IDM = identity management/lifecycle, IG = identity gateway), IBM (Security Verify SaaS + ISAM/Verify Access on-prem) y Oracle (OAM, OIG, OPAM).',
          },
          {
            id: 'rm-f22-2',
            label: 'Conceptos Clave',
            text: 'Describir PingFederate: SP connection (tu org actúa como proveedor de identidad hacia un service provider externo) vs. IdP connection; authentication policies con adapters (HTML Form, PingID) y selection por contexto; token exchange y OAuth playground para depurar. Dónde aparece en vacantes: banca, retail y cualquier industria con federation hub B2B/B2C.',
          },
          {
            id: 'rm-f22-3',
            label: 'Conceptos Clave',
            text: 'Explicar la familia ForgeRock: DS (directorio LDAP de alto rendimiento con replicación multi-maestro), AM (autenticación/SSO con SAML2 y OIDC, authentication trees), IDM (provisioning/sync con connectors y managed objects) e IG (gateway que intercepta y protege apps legacy sin tocar su código). Dibujar de memoria el flujo AM autentica → IDM provisiona → IG hace proxy.',
          },
          {
            id: 'rm-f22-4',
            label: 'Conceptos Clave',
            text: 'Explicar Oracle Access Manager: el WebGate como agente instalado en el web server que intercepta cada request, redirige a OAM para autenticar y devuelve headers (OAM_REMOTE_USER) a la app legacy — SSO por headers sin reescribir la aplicación. Compañeros de suite: OIG (governance/provisioning) y OPAM (vaulting de privilegios). Muy común en empresas con stack Oracle (EBS, SOA, JD Edwards).',
          },
          {
            id: 'rm-f22-5',
            label: 'Conceptos Clave',
            text: 'Diferenciar IBM Security Verify (SaaS: riesgo/step-up, Verify MFA, directorio cloud) de ISAM/Verify Access (appliance on-prem con módulo Advanced Access Control: riesgo contextual, step-up authentication, AAP). Reconocer el patrón real de mercado: appliance on-prem y SaaS moderno conviviendo en la misma cuenta.',
          },
          {
            id: 'rm-f22-6',
            label: 'Práctica',
            text: 'Lab de evaluación: descargar el trial de PingFederate (30 días) y federar dos instancias locales (SP-initiated SAML completo: crear la SP connection, intercambiar metadata, probar el flujo) — o la alternativa documentada: seguir la guía de evaluación de Ping con capturas de cada pantalla. El objetivo es hablar con pantallas vistas, no solo teoría.',
          },
          {
            id: 'rm-f22-7',
            label: 'Comparativa',
            text: 'Construir tu tabla de selección: despliegue (SaaS vs. on-prem), soporte de estándares (SAML/OIDC/SCIM/FIDO2), licenciamiento (MAU vs. usuario asignado vs. perpetuo), integraciones HR/legacy, madurez para LatAm y comunidad/soporte. Una tabla propia de 6 criterios x 4 plataformas — el artefacto que convierte "conozco los nombres" en "sé evaluar".',
          },
        ],
      },
      {
        id: 'rm-f8',
        number: 19,
        title: 'Identity Threat Detection and Response (ITDR)',
        note: 'Aquí es donde tu background defensivo aporta todo su valor. Trátalo como la aplicación de tus conocimientos SOC a la infraestructura IAM. (El puente SOC ↔ IAM.)',
        items: [
          {
            id: 'rm-f8-1',
            label: 'Detección',
            text: 'Correlacionar para detectar lo que importa en identidades: reactivación de cuentas durmientes (cuenta inactiva 180 días que de repente loguea), impossible travel (Bogotá y 20 minutos después Moscú) y password spraying (múltiples UPN fallidos desde una misma IP seguidos de un éxito). Con Sysmon en endpoints, eventos de los DC y KQL en Microsoft Sentinel (SigninLogs, IdentityLogonEvents).',
          },
          {
            id: 'rm-f8-2',
            label: 'Investigación',
            text: 'Mapear ataques con MITRE ATT&CK: T1078 (Valid Accounts — la técnica más usada del mundo real), T1098 (Account Manipulation: nuevas membresías de admins), T1621 (MFA request generation = fatigue) y el abuso de consentimiento OAuth (apps maliciosas pidiendo Mail.Read). Detectar asignaciones anómalas de Service Principals (nuevos app role assignments en el audit log).',
          },
          {
            id: 'rm-f8-3',
            label: 'Entrevista',
            text: 'Preparar el plan de contención de una cuenta de Domain Admin comprometida SIN tumbar la operación: aislar (disable + reset + revoke), preservar evidencia ANTES de resetear (memoria/logs), barrer persistencia (nuevos admins, SPNs nuevos, GPOs modificadas, delegaciones Kerberos) y solo con evidencia de Golden Ticket resetear KRBTGT dos veces (el doble reset mata los tickets previos). Comunicar al negocio qué se interrumpe y qué no.',
          },
          {
            id: 'rm-f8-4',
            label: 'Evidencia (Exit Criteria)',
            text: 'Reportes de investigación con formato estándar: vector inicial, timeline con las fuentes citadas (logs exactos), alcance (identidades y sistemas tocados), contención, remediación IAM (revocación, PIM, CA) y lecciones aprendidas. Mínimo 3 investigaciones completas documentadas desde tu lab.',
          },
          {
            id: 'rm-f8-5',
            label: 'Práctica',
            text: 'Montar la ingesta de telemetría de identidad: exportar programáticamente sign-in logs y audit logs de Entra (o ingerir en Sentinel si tienes cupo) y escribir 3 detecciones en KQL o PowerShell: burst de MFA denegados (fatigue), travel improbable y credenciales filtradas con login exitoso (leaked credentials en Identity Protection).',
          },
          {
            id: 'rm-f8-6',
            label: 'Escenario',
            text: 'Responder el caso consent phishing: varios usuarios "instalaron" una app OAuth llamada "PDFConverter Pro" con permisos Mail.Read. Identificarla (Enterprise apps → Consent and permissions; audit logs con "Consent to application"), revocar los grants, invalidar tokens, notificar y prevenir con CA (admin consent requerido + app consent policy). Cerrar el ciclo con Identity Protection: risk detections y respuesta automática (risky user → password reset forzado).',
          },
        ],
      },
    ],
  },
  {
    id: 'rm-t3',
    title: 'TIER 3 — COMPLEMENTOS',
    subtitle: 'Conocimiento Acotado. Dominios útiles para entender el entorno, pero estrictamente limitados.',
    phases: [
      {
        id: 'rm-f12',
        number: 20,
        title: 'AWS Identity & Access Management',
        items: [
          {
            id: 'rm-f12-1',
            label: 'Límite Estricto',
            text: 'Mantener el alcance estricto: NO estudiar EC2, VPC, Lambda ni DevOps. El enfoque es 100% AWS IAM como capa de identidad: entender cómo se decide el acceso a los recursos cloud. Nada de perseguir certificaciones de arquitecto AWS: eso es otro roadmap.',
          },
          {
            id: 'rm-f12-2',
            label: 'Conceptos',
            text: 'Diferenciar IAM Users, Groups, Roles y Permission Policies; identity-based (adjuntas a la identidad) vs. resource-based (adjuntas al recurso, p. ej. bucket policy); la lógica de evaluación (explicit Deny le gana a cualquier Allow; por defecto se niega) y el flujo AssumeRole con STS (credenciales temporales de hasta 12 h — el patrón recomendado). Ubicar AWS IAM Identity Center (antes AWS SSO) como el front empresarial: permission sets asignados a grupos.',
          },
          {
            id: 'rm-f12-3',
            label: 'Evidencia (Exit Criteria)',
            text: 'Crear una política JSON least-privilege verificable: identificar la acción de negocio (p. ej. listar y leer objetos de UN bucket), redactar la política mínima, probarla con IAM Policy Simulator y evaluar un caso que debe permitir y otro que debe denegar. Evidencia: política + resultados de ambas simulaciones.',
          },
          {
            id: 'rm-f12-4',
            label: 'Práctica',
            text: 'Lab de Identity Center (free tier): activarlo con el Identity Center directory o federación, crear un permission set (PowerUserAccess o custom mínimo) asignado a un grupo, e iniciar sesión como usuario federado en la consola con el switch de rol. Objetivo: explicar de memoria la cadena usuario → grupo → permission set → rol → política.',
          },
          {
            id: 'rm-f12-5',
            label: 'Escenario',
            text: 'Auditar una política de un cliente ficticio: detectar Action "s3:*" sobre Resource "*", ausencia de Condition (aws:SourceIp, MFA), políticas inline dispersas vs. managed, y hardenizarla con IAM Access Analyzer (findings de acceso externo). Documentar before/after con la justificación de cada cambio — el equivalente cloud de la auditoría de AD de la fase 2.',
          },
        ],
      },
      {
        id: 'rm-f23',
        number: 21,
        title: 'Identidades No-Humanas & Service Identities',
        note: 'Las no-humanas suelen duplicar o triplicar a las humanas en cualquier empresa mediana y son el activo de identidad menos gobernado. Hablar de ellas con un plan concreto es un diferenciador enorme.',
        items: [
          {
            id: 'rm-f23-1',
            label: 'Conceptos Clave',
            text: 'Trazar la taxonomía completa: service accounts de AD, cuentas de aplicación, managed identities de Azure, workload identities (service principals y apps OAuth), API keys, tokens de integración, certificados mTLS, bots/RPA y cuentas genéricas compartidas. Para cada tipo: quién es el dueño, dónde vive su credencial y cuál es su riesgo específico.',
          },
          {
            id: 'rm-f23-2',
            label: 'Conceptos Clave',
            text: 'Argumentar el porqué del riesgo: la mayoría no puede hacer MFA, credenciales de larga vida, ownership difuso (el que la creó ya se fue), dependencias ocultas (rotar mal = cae la integración) y abuso tipo illicit consent (apps OAuth maliciosas con permisos concedidos). Este dominio es el punto ciego clásico de los programas IAM.',
          },
          {
            id: 'rm-f23-3',
            label: 'Práctica',
            text: 'Gestionar service accounts de AD con disciplina: naming svc-<app>-<entorno>, dueño en el campo description y en la CMDB, migración a gMSA cuando la aplicación lo soporte, PasswordNeverExpires solo con excepción documentada y revisión mensual de LastLogonDate (una cuenta que nadie usa es candidata a bóveda o a baja).',
          },
          {
            id: 'rm-f23-4',
            label: 'Práctica',
            text: 'Dominar managed identities de Entra: system-assigned (ligada al recurso, muere con él) vs. user-assigned (compartible entre recursos); por qué eliminan el secreto (el recurso pide un token al endpoint de IMDS 169.254.169.254 sin guardar credenciales). Probarlo: una VM o Function con managed identity leyendo un secret de Key Vault sin password en el código.',
          },
          {
            id: 'rm-f23-5',
            label: 'Conceptos Clave',
            text: 'Gobernar el ciclo de vida de credenciales de apps: secrets y certificados de Service Principals con expiración forzada y rotación calendarizada, inventario de OAuth grants (qué apps tienen consent, quién lo otorgó) y retiro de SPs huérfanos (sin dueño o sin uso en 90+ días). La pregunta de dueño que nunca falla: "¿quién llora si esto se rompe?".',
          },
          {
            id: 'rm-f23-6',
            label: 'Evidencia (Exit Criteria)',
            text: 'Entregar el inventario de no-humanas de tu lab: tabla con identidad, tipo, dueño, propósito, credencial (dónde vive), última rotación y próxima acción; acompañada de la clasificación (crítica/estándar) y el plan de 3 primeros meses: inventario → ownership → rotación de las críticas.',
          },
        ],
      },
    ],
  },
  {
    id: 'rm-final',
    title: 'PROYECTO FINAL Y PORTAFOLIO',
    subtitle:
      'Para mantener el realismo sin consumir meses de ingeniería, el laboratorio combina implementaciones reales con modelado arquitectónico.',
    phases: [
      {
        id: 'rm-f13',
        number: 22,
        title: 'Enterprise Identity Security Lab ("InnovateCorp")',
        note: 'El laboratorio integra TODO el roadmap en una sola evidencia narrada: es lo que mostrarás en la entrevista y lo que te diferenciará de los candidatos que solo vieron videos.',
        items: [
          {
            id: 'rm-f13-1',
            label: 'Real',
            text: 'Despliegue real: AD local coexistiendo con Microsoft Entra ID vía Entra Connect (password hash sync), flujos JML ejecutados con PowerShell + Graph (alta por CSV, Mover con revocación delta, Leaver completo con revocación de sesiones) e integración SSO/SCIM hacia una app de prueba (Slack trial, BookStack u otra app SAML/SCIM de tu stack).',
          },
          {
            id: 'rm-f13-2',
            label: 'Simulado/Documentado',
            text: 'Arquitectura documentada de lo que en producción sería herramienta: IGA con conectores teóricos (HRIS → SailPoint → AD/Entra/SAP), modelo PAM aplicado (qué va a bóveda, qué es JIT, qué se graba) y monitoreo ITDR con ingesta manual de logs de eventos específicos (4728/4740, sign-in logs) hacia tu mini-SIEM (hoja de cálculo estructurada o Sentinel si hay cupo).',
          },
          {
            id: 'rm-f13-3',
            label: 'Repositorio GitHub',
            text: 'Estructurar el repositorio del proyecto: carpetas por dominio (01-ad, 02-entra, 03-lifecycle, 04-roles, 05-reviews, 06-pam, 07-itdr), README maestro con la arquitectura y, idealmente, GitHub Pages para lectura directa. Cada caso de uso documentado con la cadena: Scenario → Detection → Investigation → Risk → Decision → Remediation → Evidence.',
          },
          {
            id: 'rm-f13-4',
            label: 'Real',
            text: 'Aplicar el modelo de roles de la fase 11 a InnovateCorp: matriz rol ↔ entitlements para 2 departamentos, implementación en grupos de Entra y Access Packages, y una access review trimestral simulada con decisiones, revocaciones y excepciones. Evidencia: matriz + capturas de las políticas + diff de accesos antes/después de la campaña.',
          },
          {
            id: 'rm-f13-5',
            label: 'Real',
            text: 'Ciclo de vida JML automatizado end-to-end: CSV de RRHH como authoritative source → script que ejecuta el Joiner (cuenta + grupos + licencia), el Mover (revocación delta + asignación) y el Leaver (deshabilitar + revocar sesiones + liberar licencias) → evidencia con logs y medición del SLA de cada corrida (timestamps).',
          },
          {
            id: 'rm-f13-6',
            label: 'Simulado',
            text: 'Paquete de gobernanza de InnovateCorp: SOPs de granting (aprobaciones por dueño) y revocación (checklist), matriz SoD aplicada a los roles creados, y un drill de acceso de emergencia documentado (despliegue nocturno simulado que usa la cuenta break-glass con alerta y verificación post-uso de 24 h).',
          },
          {
            id: 'rm-f13-7',
            label: 'Evidencia (Exit Criteria)',
            text: 'Ensayar el "Demo Day": guion de 15 minutos recorriendo el lab en vivo (una identidad entra → recibe acceso → se mueve → se va → y el SOC lo ve todo), slides de arquitectura y 3 historias STAR del proyecto. Este artefacto ES la entrevista: grábate una vez y critícate sin piedad.',
          },
        ],
      },
      {
        id: 'rm-f14',
        number: 23,
        title: 'Certificación y Estrategia Laboral',
        items: [
          {
            id: 'rm-f14-1',
            label: 'Certificación',
            text: 'Aprobar Microsoft SC-300 (Identity and Access Administrator): calendarizar el examen en Pearson VUE, mapear los study paths (Implement identities and governance; Authentication and access management; Identity compliance/privilege) y validar cada tema con práctica en tu inquilino P2 — no solo teoría de Microsoft Learn. La SC-300 es el filtro HR más común de las vacantes junior IAM.',
          },
          {
            id: 'rm-f14-2',
            label: 'Perfil Profesional',
            text: 'Posicionar tu perfil como Junior IAM / Identity Security Analyst: la base operativa (AD/Entra ID/Okta/IGA) y el background SOC como especialidad para ITDR (detectar y responder amenazas sobre identidades y accesos). CV con los artefactos del roadmap como evidencia medible (SOPs, scripts, campañas) y LinkedIn redactado con las keywords del rol: IAM, Entra ID, access reviews, SCIM, PAM, SSO.',
          },
          {
            id: 'rm-f14-3',
            label: 'Entrevistas',
            text: 'Estructurar respuestas técnicas aprovechando tu inglés B2: patrón Identify → Investigate → Remediate → Prevent para troubleshooting y STAR con métricas para experiencia (el lab cuenta si lo narras como proyecto con resultados). Preparar en inglés el pitch de 2 minutos del laboratorio InnovateCorp y 10 preguntas típicas de entrevista IAM.',
          },
          {
            id: 'rm-f14-4',
            label: 'Práctica',
            text: 'Plan de aplicabilidad 30 días post-roadmap: mapear cada artefacto del lab contra los requisitos de 5 vacantes reales (JD con Entra ID, SailPoint, Okta, PAM, access reviews), afinar el CV con métricas (SLA JML, % revocado, tiempo del kill-switch drill) y programar 2 aplicaciones por semana con seguimiento. El roadmap sin plan de salida es un hobby.',
          },
        ],
      },
    ],
  },
];

/** Todos los ítems del roadmap (flatten) — para el seed de la DB. */
export const ROADMAP_ALL_ITEM_IDS: string[] = ROADMAP_TIERS.flatMap((t) =>
  t.phases.flatMap((p) => p.items.map((i) => i.id))
);
