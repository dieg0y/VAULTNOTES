/**
 * roadmapData — ROADMAP DEFINITIVO: JUNIOR IAM / IDENTITY SECURITY ANALYST.
 *
 * Especialización Principal: IAM & Identity Governance
 * Ventaja Competitiva: SOC / Blue Team Background
 *
 * Estructura: 3 tiers de prioridad estratégica + proyecto final, 30 fases.
 * Cobertura completa del dominio IAM: fundamentos, Active Directory y
 * directory services (LDAP), Microsoft Entra ID + Graph, SSO/federación,
 * MFA, identity life-cycle, higiene de identidades, automatización,
 * troubleshooting y métricas; modelo de roles + role engineering,
 * granting/revoking, access reviews, PAM (con Safeguard, CyberArk y
 * BeyondTrust en profundidad), Okta, IGA (SailPoint/Saviynt),
 * plataformas enterprise (Ping, ForgeRock, IBM, Oracle), ITDR, cloud IAM
 * (AWS, Azure, GCP y Kubernetes), identidades no-humanas, Zero Trust,
 * resiliencia y disaster recovery, y proyecto final.
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
          {
            id: 'rm-f1-9',
            label: 'Conceptos Clave',
            text: 'Manejar el vocabulario de gobernanza como profesional: política (el QUÉ y el PORQUÉ, aprobado por dirección), estándar (el nivel obligatorio, p. ej. "MFA para todo acceso remoto de administradores"), procedimiento/SOP (el CÓMO paso a paso) y el comité de accesos como órgano de decisiones (roles nuevos, excepciones críticas). Saber qué artefacto responde a la pregunta del auditor y quién firma cada uno.',
          },
          {
            id: 'rm-f1-10',
            label: 'Conceptos Clave',
            text: 'Mapear IAM contra los frameworks que citan los auditores: ISO/IEC 27001:2022 (controles A.5.15–A.5.18 de control de acceso, A.8.2 de derechos privilegiados), SOC 2 Trust Services Criteria CC6.1–CC6.3 (logical access) y NIST SP 800-53 rev.5 familia AC (Access Control) + IA (Identification and Authentication). Para cada control: qué evidencia produce TU trabajo (reportes, tickets, actas de campaña) — la auditoría no verifica controles, verifica evidencia.',
          },
          {
            id: 'rm-f1-11',
            label: 'Entrevista',
            text: 'Tener la respuesta de 60 segundos a "¿qué es IAM?": la disciplina que garantiza que la identidad correcta tenga el acceso correcto, en el momento correcto, por la razón correcte — con evidencia auditable; y saber desglosarla en sus cuatro verbos operativos: identificar (autenticar), autorizar (acceso correcto), gobernar (ciclo de vida y revisión) y auditar (evidencia de todo lo anterior). Seguida de la frase ancla: "la identidad es el nuevo perímetro" con un ejemplo real.',
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
          {
            id: 'rm-f2-9',
            label: 'Conceptos Clave',
            text: 'Dominar LAPS/Windows LAPS: por qué la cuenta de admin local es el objetivo favorito del lateral movement (misma contraseña en cientos de equipos), cómo LAPS almacena la contraseña rotada en un atributo protegido de AD (ms-Mcs-AdmPwd) legible solo por el grupo autorizado, la diferencia entre LAPS legacy y Windows LAPS (Entra), y por qué "admin local único + LAPS + PIM" es el estándar de facto moderno.',
          },
          {
            id: 'rm-f2-10',
            label: 'Práctica',
            text: 'Experimentar el AdminSDHolder: mover un usuario de Domain Admins a una OU con GPO propia y comprobar que la GPO no le aplica; entender el SDProp (cada 60 min restaura el descriptor de seguridad de las protected groups) y listarlas (Get-ADGroup -Filter * -Properties AdminCount). Es la respuesta a "por qué la GPO no afecta a mis admins" y demuestra comprensión real del motor interno de AD.',
          },
          {
            id: 'rm-f2-11',
            label: 'Práctica',
            text: 'Habilitar y usar la papelera de AD: Enable-ADOptionalFeature "Recycle Bin Feature" -Scope ForestOrConfigurationSet; luego borrar un usuario y un grupo del lab, enumerarlos con Get-ADObject -IncludeDeletedObjects -Filter "objectClass -eq user" y restaurarlos con Restore-ADObject. Documentar la diferencia entre Deleted Objects (restaurable) y Recycled (irrecuperable) y el requisito de nivel funcional 2008 R2+.',
          },
          {
            id: 'rm-f2-12',
            label: 'Conceptos Clave',
            text: 'Aplicar Fine-Grained Password Policies (PSO) donde una política global no sirve: admins con 20+ caracteres y rotación, service accounts con longitud máxima y sin complejidad creciente (NIST: longitud > complejidad), cuentas con MFA que no necesitan expiración. Crear y asignar: New-ADFineGrainedPasswordPolicy + Add-ADFineGrainedPasswordPolicySubject, y saber que un usuario solo recibe UN PSO (el de mayor precedencia o el asignado directamente) — no se combinan.',
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
          {
            id: 'rm-f15-8',
            label: 'Práctica',
            text: 'Montar AD LDS (Active Directory Lightweight Directory Services) como sandbox LDAP: instalar el rol, crear una instancia con adaminstall, cargar un esquema de usuario (importar los LDIF de MS-ADLDS), y apuntar una app de prueba al puerto 636 de la instancia. Es el directorio desechable para probar integraciones, esquemas raros y apps legacy SIN arriesgar el AD de producción — el truco que separa al integrador profesional del que "prueba en prod".',
          },
          {
            id: 'rm-f15-9',
            label: 'Conceptos Clave',
            text: 'Reconocer el ecosistema de directorios más allá de AD DS: AD LDS (LDAP sin dominio), OpenLDAP (open source de referencia), 389 Directory Server / Red Hat IdM (Linux empresarial), Ping Directory y ForgeRock DS (directorios de altísimo rendimiento con replicación multi-maestro), Oracle Unified Directory (OUD, el sustituto de Oracle Internet Directory). Saber cuándo una app se conecta a un directorio que NO es AD — común en banca y telecom.',
          },
          {
            id: 'rm-f15-10',
            label: 'Escenario',
            text: 'Depurar LDAPS de punta a punta: bind simple contra 389 pasa, contra 636 falla. Checklist ordenado: el certificado del DC (Get-ChildItem Cert:LocalMachineMy — ¿el SAN incluye el FQDN con el que se conecta la app?), la cadena de confianza en el cliente, portqry -n dc01 -e 636 o Test-NetConnection -Port 636, TLS version mismatch (la app legacy que solo habla TLS 1.0) y el error 81/52 del ldp.exe. Documentar la resolución completa como runbook.',
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
          {
            id: 'rm-f3-9',
            label: 'Conceptos Clave',
            text: 'Distinguir External Identities de raíz: B2B guest (colaborador externo con su identidad de SU inquilino: Gmail, otra instancia de Entra), cross-tenant access settings (qué pueden hacer los guests externos y los tuyos en otros inquilinos) y Entra External ID/B2C (identidad de CLIENTES, no colaboradores: CIAM, otro producto). La confusión B2B/B2C es una pregunta de entrevista clásica — ten el ejemplo de cada uno: el auditor externo (B2B) y el usuario de la app retail (B2C).',
          },
          {
            id: 'rm-f3-10',
            label: 'Práctica',
            text: 'Operar Entra Connect con criterio: elegir PHS (password hash sync) vs. PTA (pass-through) vs. federación con sus trade-offs, configurar el filtrado por OU (provisioning scope), pre-limpiar con IdFix (atributos duplicados y caracteres ilegales) y entender el informe de errores de sincronización (duplicate attributes, hard match con anchor immovable). El classic de producción: el usuario renombrado en RRHH que se duplica — saber por qué (UPN cambiado sin matching) y cómo corregirlo sin borrar y recrear.',
          },
          {
            id: 'rm-f3-11',
            label: 'Conceptos Clave',
            text: 'Governar el consent y los permisos de apps: App registrations (el desarrollador crea la app y SUS permisos) vs. Enterprise applications (el service principal: la app EN TU inquilino y sus consentimientos concedidos), delegated vs. application permissions, el flujo admin consent, y el inventario periódico de OAuth permission grants (Get-MgOauth2PermissionGrant) — exactamente el control que habría evitado el consent phishing de Uber. Sin este inventario, cualquier app maliciosa con un banner bonito puede pedir Mail.Read.',
          },
          {
            id: 'rm-f3-12',
            label: 'Escenario',
            text: 'Operar SSPR end-to-end: política de registro (grupo piloto → todos, registro exigido al iniciar sesión), métodos (app móvil OTP, email, teléfono — con la deprecación de preguntas de seguridad en mente), password writeback hacia el AD local (requisito: PHS o PTA + agente), y el troubleshooting con la fuente correcta: el reporte de SSPR activity (quién se registró, quién reseteó, fallos por motivo). Cierre del ciclo: el leaver cuyo buzón delegado queda en propiedad del manager SIN poder resetear la contraseña del ex-empleado.',
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
          {
            id: 'rm-f4-7',
            label: 'Práctica',
            text: 'Dominar el SDK de PowerShell: Connect-MgGraph -Scopes con permisos mínimos por operación (jamás consent de todo el paquete), Get-MgContext para saber quién eres y con qué scopes, Select-MgProfile beta cuando la operación solo existe en beta, y la diferencia entre cmdlets de alto nivel (Get-MgUser) e Invoke-MgGraphRequest para llamadas crudas. Criterio: ejecutar el mismo inventario con cmdlet y con request crudo y explicar cuándo eliges cada uno.',
          },
          {
            id: 'rm-f4-8',
            label: 'Práctica',
            text: 'Operar a escala sin morir en el intento: -All para paginación completa, -PageSize y el manejo manual de @odata.nextLink en Invoke-MgGraphRequest, el patrón -PipelineVariable para procesar mientras se lista, y el respeto al throttling: HTTP 429 con header Retry-After — tu script debe backoff y reintentar, no fallar en silencio a mitad de un inventario de 40.000 usuarios.',
          },
          {
            id: 'rm-f4-9',
            label: 'Entrevista',
            text: 'Saber responder "¿quién creó esta cuenta y quién la metió en ese grupo?" usando la API de auditoría: GET /v1.0/auditLogs/directoryAudits filtrando por activity (add user, add member to group) con targetResources (el objeto tocado) e initiatedBy (el actor: usuario, app o service principal). La disciplina de trazabilidad que los auditores llaman "who did what, when, from where" — y que el 80% de los candidatos no sabe responder con la fuente correcta.',
          },
          {
            id: 'rm-f4-10',
            label: 'Evidencia (Exit Criteria)',
            text: 'Publicar la mini-librería Graph-IAM con 5 scripts versionados en el repo: inventario de usuarios con estado MFA, memberships de un grupo crítico, service principals con credenciales por vencer (passwordCredentials/ keyCredential endDateTime), sign-ins fallidos agrupados por IP, y roles elegibles de PIM. Cada script con su -Scopes documentado en el header y un ejemplo de salida real.',
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
          {
            id: 'rm-f5-8',
            label: 'Conceptos Clave',
            text: 'Dominar los flujos OAuth 2.0/OIDC y su caso de uso exacto: authorization code + PKCE (el estándar para apps web y SPA — PKCE cierra el ataque del código interceptado), client credentials (app-to-app sin usuario: machine identity), device code flow (TVs/CLI sin browser: la diana del phishing de códigos), refresh token (renovación sin re-login) y por qué implicit flow quedó deprecado (token expuesto en URL/fragment). Saber dibujar authorization code + PKCE de memoria con los 5 pasos.',
          },
          {
            id: 'rm-f5-9',
            label: 'Conceptos Clave',
            text: 'Administrar los tokens y la sesión como operación: el access token (vida corta, NO revocable — la defensa es su expiración), el refresh token (vida larga, SÍ revocable — el objetivo de la revocación), el id_token (prueba de autenticación, no autorización), y la distinción crítica: el logout de la app NO cierra la sesión del IdP (SSO session) — de ahí los loops de "cerré sesión y sigo entrando". Las consecuencias de diseño: tiempo de vida de access token corto + sesión del IdP con CA evaluable continuamente (CAE).',
          },
          {
            id: 'rm-f5-10',
            label: 'Conceptos Clave',
            text: 'Saber elegir el protocolo por integración con una matriz de decisión: ¿OIDC si la app lo soporta? (moderno, menos XML, claims flexibles); ¿SAML 2.0 si la app enterprise solo trae eso? (ERP legacy, banca); ¿SCIM para lifecycle además del SSO? (autenticación ≠ aprovisionamiento); ¿header-based con gateway (Ping/IG/ISA) para la app que no soporta nada? Tu matriz con 4 columnas (requisitos de la app, protocolo, lifecycle, monitoreo) es artefacto de entrevista — la pregunta "¿cómo integras esta app?" es el pan de cada día del integrador IAM.',
          },
          {
            id: 'rm-f5-11',
            label: 'Práctica',
            text: 'Dominar el mapping de claims y atributos: qué viaja en el token (claims de Entra configurables por app: grupos, department, employeeId), la token customization (claims policy), el mapeo del lado de la app (SAML attribute statement ↔ campo interno), y depurar el caso clásico: "la app no ve los grupos del usuario" — ver el token REAL (jwt.io / SAML Tracer), confirmar que el claim llega, y solo entonces mirar el lado de la app. El 90% de los tickets de SSO que escalan son mappings, no protocolos.',
          },
          {
            id: 'rm-f5-12',
            label: 'Escenario',
            text: 'Governar el parque de integraciones como inventario vivo: cada app federada con su dueño, protocolo, certificado de firma (fecha de expiración — el clásico incidente del lunes por rotación automática que nadie calendarizó), contactos del proveedor, y estado (piloto/producción/retirable). El runbook de rotación de certificado SAML con las dos formas de hacerlo sin downtime (overlay/nueva clave activa en paralelo) es el documento que te salva el fin de semana.',
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
          {
            id: 'rm-f16-8',
            label: 'Conceptos Clave',
            text: 'Manejar NIST SP 800-63B (Digital Identity Guidelines): los niveles IAL (identity assurance: cuán segura es la prueba de identidad), AAL (authenticator assurance: cuán fuerte es el login) y FAL (federation assurance). Mapear apps a AAL: la wiki interna = AAL1/2, el ERP financiero externo = AAL2 con authenticator phishing-resistant, admin de identidad = AAL3 (hardware, resistencia a replay). Este marco te da el vocabulario para NEGOCIAR exigencias por app en vez de "MFA para todo o para nada".',
          },
          {
            id: 'rm-f16-9',
            label: 'Conceptos Clave',
            text: 'Entender Windows Hello for Business (WHfB): autenticación asimétrica ligada al hardware (TPM) — el usuario se autentica al DEVICE (PIN/biometría local) y el device posee la clave privada que firma hacia Entra/AD; el password nunca viaja. Su relación con FIDO2/passkeys (WHfB es el pariente interno del ecosistema Microsoft; las passkeys sincronizadas el pariente consumidor) y el rollout real: WHfB con Entra (fácil, cloud-native) vs. key-trust/cert-trust híbrido (plan de proyecto).',
          },
          {
            id: 'rm-f16-10',
            label: 'Conceptos Clave',
            text: 'Diseñar MFA para las poblaciones que NO son personas de oficina: cuentas compartidas de planta (workshop floor, laboratorios) — identidad compartida + llave física FIDO2 custodiada en tablero; kioscos y terminales (device attestation + re-autenticación periódica); service accounts (MFA imposible → compensar con IP allowlist, certificados, bóveda y monitoreo); y accesos de emergencia (OTP offline seed guardado en bóveda física). El diseño de excepciones SIN agujeros es lo que distingue la arquitectura de la instalación.',
          },
          {
            id: 'rm-f16-11',
            label: 'Escenario',
            text: 'Diseñar el re-registro seguro de MFA (la puerta trasera favorita): el usuario perdió el teléfono y pide reset de métodos. El ataque: vishing al helpdesk ("soy el CFO, estoy en el aeropuerto, borra mi MFA") y el atacante se registra a sí mismo. El proceso correcto: verificación de identidad FUERA del canal comprometido (presencial, video con validación de documento, callback al número registrado), doble aprobación para usuarios sensibles, ticket con evidencia, alerta al usuario por correo+SMS tras el cambio ("si no fuiste tú…"), y cooldown de 24-48 h para cuentas privilegiadas. El caso real de MGM 2023 (vishing al helpdesk) como story de entrevista.',
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
          {
            id: 'rm-f17-8',
            label: 'Conceptos Clave',
            text: 'Interiorizar el HRIS como fuente autoritativa y su contrato de datos: qué atributos llegan del HR (employeeId, workerType, department, costCenter, manager, hireDate, endDate), cuáles se masteran en el directorio (UPN, grupos técnicos) y cuáles en apps locales — el famoso "golden record". Sin ese contrato documentado, cada equipo edita lo que quiere y el ciclo de vida se rompe en silencio. La regla de oro: UN atributo, UN dueño, UN sistema fuente.',
          },
          {
            id: 'rm-f17-9',
            label: 'Práctica',
            text: 'Ejecutar la reconciliación programada (el detector de drift del ciclo de vida): job que compara HR vs. AD vs. Entra vs. apps clave; clasificar hallazgos: en HR sin cuenta (alta pendiente o error), en AD sin HR (leaver no procesado o contractor fuera de HR), atributos discrepantes (department distinto → mover no procesado), y cuentas activas con endDate vencido (leaver invisible). Con acción y SLA por clase. La reconciliación es lo que convierte "tenemos JML" en "nuestro JML es verificable".',
          },
          {
            id: 'rm-f17-10',
            label: 'Escenario',
            text: 'Diseñar el ciclo de vida de contractors y terceros (la población con mayor riesgo real): sponsor interno como dueño (no un manager de RRHH que no existe), fecha de fin contractual como accountExpires del directorio (el vencimiento automático que no depende de nadie), renovación solo con evidencia de extensión, revisión mensual automatizada de la población, y salida inmediata al vencer (la renovación tardía es la excepción, jamás el default). El caso real: el contractor cuyo contrato venció y siguió con acceso 8 meses.',
          },
          {
            id: 'rm-f17-11',
            label: 'Entrevista',
            text: 'Tener el diseño del "Day-1 perfecto" listo: la persona llega y TODO funciona — cuenta activa con MFA pre-inscrito o flujo de primer login guiado, roles birthright asignados, hardware entregado con el agente inscrito, licencias activas, y el manager recibe la confirmación automática. Y la pregunta inversa preparada: "¿y si el onboarding falla el día 1?" — el fallback (cuenta de emergencia del helpdesk + flujo de remediación + postmortem del fallo con la métrica de % de onboarding en SLA).',
          },
        ],
      },
      {
        id: 'rm-f24',
        number: 9,
        title: 'IAM Hygiene & Campañas de Limpieza',
        note: 'La higiene es el PRIMER trabajo real de un junior IAM y el que produce los primeros quick wins visibles. Todo lo demás (roles, PAM, IGA) se construye sobre un directorio limpio — y esta fase es la que te da historias de "resultados medibles" para el CV.',
        items: [
          {
            id: 'rm-f24-1',
            label: 'Conceptos Clave',
            text: 'Definir el alcance completo de la higiene IAM: cuentas dormidas/inactivas, PasswordNeverExpires sin justificación, administradores permanentes (que deberían ser JIT), cuentas huérfanas (sin dueño o sin HR), grupos vacíos o sin dueño, membresías rotas (usuarios en grupos de otro área), cuentas compartidas y credenciales débiles de service accounts. Clasificar cada clase por riesgo (¿es explotable hoy?) y por esfuerzo de remediación — el informe que prioriza por las dos es oro de gerencia.',
          },
          {
            id: 'rm-f24-2',
            label: 'Práctica',
            text: 'Ejecutar el barrido de cuentas inactivas SIN falsos positivos: Search-ADAccount -AccountInactive -TimeSpan 90.00:00:00 como punto de partida, pero validar con LastLogonDate por DC (nltest o el atributo replicado LastLogonTimestamp con su granularidad de ~14 días) y EXCLUIR las trampas clásicas: service accounts con logon type service, cuentas de auditoría, cuentas de sistemas que autentican por Kerberos sin actualizar LastLogon. Reporte: cuenta, último uso real, dueño propuesto, acción y SLA.',
          },
          {
            id: 'rm-f24-3',
            label: 'Práctica',
            text: 'Barrido de PasswordNeverExpires con criterio de negocio: enumerar (Search-ADAccount -PasswordNeverExpires), separar por clase (service accounts legítimas: gMSA es la respuesta correcta; personas con PNE: el hallazgo a remediación; break-glass: PNE CON control compensatorio documentado), y ejecutar la campaña: comunicar → ventana de remediación → excepciones documentadas con vencimiento. La métrica del ciclo: % PNE legítimas vs. hallazgo abierto por mes.',
          },
          {
            id: 'rm-f24-4',
            label: 'Práctica',
            text: 'Barrido de privilegio administrativo: Domain Admins (el objetivo: <5 y solo Tier 0 real), administradores locales (LAPS para el resto), usuarios con admin permanente en Entra (migrar a PIM elegible), dueños de suscripciones cloud. Para cada clase: el estándar de referencia, la brecha actual y el plan con fechas. El argumento que lo vende a gerencia: cada admin permanente es una cuenta que un atacante quiere Y ninguna bitácora justifica.',
          },
          {
            id: 'rm-f24-5',
            label: 'Conceptos Clave',
            text: 'Gestionar la lista de EXCLUSIONES como artefacto vivo (no como excusa): cada exclusión del barrido con dueño, justificación, evidencia del dueño y fecha de revisión (90 días máx); la revisión trimestral de la lista completa con altas/bajas; y el anti-patrón: la lista que nadie revisa y crece eternamente (la exclusión sin vencimiento es privilegio disfrazado de excepción). Herramienta: la misma hoja del barrido con su pestaña de exclusiones y el semáforo de vencidas.',
          },
          {
            id: 'rm-f24-6',
            label: 'Práctica',
            text: 'Barrido de cuentas NUNCA usadas y de reingresos: Get-ADUser -Filter con LastLogonDate nulo o creation date >90 días sin logon (la cuenta creada que jamás se usó: alta fantasma o error), cuentas activas cuyo empleado ya no está en RRHH (la reconciliación relámpago que detecta leakers no procesados), y el barrido espejo en Entra (Get-MgUser con signInActivity - filter de 90 días sin login). La misma lógica en los dos directorios — el atacante da igual dónde quedó la puerta.',
          },
          {
            id: 'rm-f24-7',
            label: 'Escenario',
            text: 'Diseñar la campaña trimestral de higiene como PROCESO (no como heroísmo): el calendario rotativo (mes 1: dormidas, mes 2: PNE + privilegio, mes 3: grupos y exclusiones, mes 4: no-humanas), los SLA por hallazgo (crítico 15 días, estándar 30), la escalación (dueño que no responde en 7 días → su jefe), y el reporte mensual de tendencia (hallazgos abiertos vs. cerrados por clase). La higiene es un ciclo perpetuo — el diseño que la vuelve automática es el entregable.',
          },
          {
            id: 'rm-f24-8',
            label: 'Conceptos Clave',
            text: 'Saber qué NO es higiene (el límite con otros dominios): el password de service account en texto plano en un script NO se arregla con rotación (se arregla con bóveda/PAM — fase PAM); el Domain Admin diario NO se arregla con auditoría (se arregla con tiering + PIM); la cuenta dormiente NO se arregla con reportes (se arregla con el proceso de leavers). La higiene DETECTA y el programa REMEDIA — saber decir qué hallazgo pertenece a qué fase del roadmap es madurez de analista.',
          },
          {
            id: 'rm-f24-9',
            label: 'Entrevista',
            text: 'Preparar "¿por dónde empezarías en un AD nunca gobernado de 5.000 usuarios?": la respuesta en capas con quick wins primero: (1) higiene básica (dormidas + PNE + admin count) — impacto inmediato medible, (2) brecha de proceso JML (los leakers que salen sin revocación), (3) tiering y PIM para privilegio, (4) modelo de roles para lo estructural. Con las métricas de cada capa (X cuentas menos, Y días de revocación, Z admins menos). El orden ES la respuesta.',
          },
          {
            id: 'rm-f24-10',
            label: 'Evidencia (Exit Criteria)',
            text: 'Publicar el DASHBOARD de higiene del lab: 4 semanas consecutivas de datos, hallazgos por clase con tendencia, exclusions vencidas en rojo, el "top 10 de deuda" con dueño y fecha comprometida, y el before/after del primer mes (línea base vs. actual). El dashboard que un jefe muestra en la reunión mensual sin explicarte nada ES el artefacto que demuestra que la higiene es un proceso vivo — y tu primer logro medible de CV.',
          },
        ],
      },
      {
        id: 'rm-f6',
        number: 10,
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
          {
            id: 'rm-f6-7',
            label: 'Conceptos Clave',
            text: 'Conocer el ecosistema de módulos PowerShell de identidad y su deprecación: MSOnline y AzureAD (deprecados, mueren los endpoints antiguos) → Microsoft.Graph.Authentication y familia Graph como presente. Los errores típicos de la migración (cmdlet renombrado: Get-AzureADUser → Get-MgUser, cambia el parámetro -ObjectID → -UserId, y el payload de tipos distintos), y la regla profesional: todo script NUEVO en Graph; todo script viejo en la lista de migración con fecha.',
          },
          {
            id: 'rm-f6-8',
            label: 'Práctica',
            text: 'Escribir PowerShell de producción: [CmdletBinding(SupportsShouldProcess)] para -WhatIf/-Confirm gratis en scripts propios, param() con ValidateSet/ValidateRange, try/catch por operación con logging estructurado (timestamp, operación, resultado), PSScriptAnalyzer en el pipeline, y credenciales jamás en el código (app-only con certificado, o Managed Identity). El estándar: cualquier script que cambie algo soporta -WhatIf y su salida es re-ejecutable.',
          },
          {
            id: 'rm-f6-9',
            label: 'Práctica',
            text: 'Montar app-only con certificado: registrar la app en Entra, generar el certificado (New-SelfSignedCertificate o el de la CA interna), subirlo al app registration, conceder Application Permissions con admin consent documentado (¡y el inventario de quién tiene Directory.ReadWrite.All!), y conectar con Connect-MgGraph -CertificateThumbprint -ClientId -TenantId. Por qué certificado > secreto (no expuesto en código, rotable con CA, ligado a lifecycle). El app-only sin usuario exige MÁS gobernanza, no menos.',
          },
          {
            id: 'rm-f6-10',
            label: 'Evidencia (Exit Criteria)',
            text: 'Operar, no solo escribir: el reporte semanal de higiene corriendo DESATENDIDO — Register-ScheduledTask (o cron en Linux) que ejecuta el script con la identidad app-only, publica el CSV en la carpeta del equipo y registra el resultado en un log. Con la evidencia de 4 semanas consecutivas de ejecuciones. El salto de "tengo un script" a "tengo una operación" es exactamente el que buscan en los puestos junior.',
          },
        ],
      },
      {
        id: 'rm-f7',
        number: 11,
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
          {
            id: 'rm-f7-7',
            label: 'Práctica',
            text: 'Armar el árbol de fallos de MFA completo: el push no llega (cobertura, cambio de número no actualizado, cuenta en otro device), el usuario perdió el método (flujo de re-registro seguro con verificación de identidad), TOTP rechazado (desincronización de hora del device — el caso clásico del servidor de hora mal configurado), FIDO2 no ofrecido (llave no registrada para ESE usuario, browser que no soporta WebAuthn, política de métodos), y el error 50076/50158 en los logs. Cada rama con su verificación y su remediación.',
          },
          {
            id: 'rm-f7-8',
            label: 'Conceptos Clave',
            text: 'Diagnosticar el grupo dinámico que nunca procesa: la regla sintáctica válida pero semánticamente rota (user.department -eq "IT" cuando el atributo se llama "Information Technology"), la licencia Entra P1 faltante para grupos dinámicos, el atributo no sincronizado (extensionAttribute que vive solo on-prem), y dónde ver el error de procesamiento (el grupo reporta el error de la regla en su página de dinámicos). La verificación relámpago: Get-MgGroupMember en PowerShell vs. lo esperado.',
          },
          {
            id: 'rm-f7-9',
            label: 'Escenario',
            text: 'Resolver el ticket clásico "me desloguean cada 5 minutos": las causas ordenadas por frecuencia — CA con sign-in frequency control demasiado agresivo, sesión del IdP corta con keep-me-signed-in deshabilitado, el browser que borra cookies (fin de sesión/política), token lifetimes del lado de la app, y el diagnostic diferencial: ¿cierra sesión o la app pide re-autenticar? La fuente que lo resuelve: sign-in logs con el evento de re-autenticación y el detalle de session controls aplicados.',
          },
          {
            id: 'rm-f7-10',
            label: 'Entrevista',
            text: 'Tener 3 historias de troubleshooting PERFECTAS con estructura STAR: (síntoma en una frase) → (diagnóstico: fuentes consultadas en orden) → (hipótesis descartadas con por qué) → (causa raíz) → (remediación + verificación) → (prevención: runbook/monitor). Rehecharlas en voz alta hasta contarlas en 90 segundos cada una — el entrevistador evalúa el ORDEN de tu diagnóstico más que la solución.',
          },
        ],
      },
      {
        id: 'rm-f25',
        number: 12,
        title: 'IAM Metrics, KPIs & Reporting Ejecutivo',
        note: 'Lo que convierte el trabajo técnico en programa: sin métricas no hay presupuesto, no hay prioridad y no hay defensa ante la gerencia. Esta fase te enseña a medir, reportar y hablar el idioma del negocio — la habilidad que acelera promociones.',
        items: [
          {
            id: 'rm-f25-1',
            label: 'Conceptos Clave',
            text: 'Definir los KPIs del ciclo de vida con fórmula exacta: % Joiners con acceso completo el D1 (fecha HRIS vs. fecha de última asignación), tiempo medio de revocación de leavers (fecha de salida vs. timestamp del disable), % Movers con revocación delta documentada, y cuentas huérfanas detectadas por trimestre (tendencia a cero). Cada KPI con su umbral objetivo (p. ej. leavers <24 h: 98%) y su fuente de datos declarada — el KPI sin fórmula y sin fuente es un deseo, no una métrica.',
          },
          {
            id: 'rm-f25-2',
            label: 'Conceptos Clave',
            text: 'Definir los KPIs de gobernanza: cobertura de campañas (% de población certificada sobre la planeada), tasa de revocación real (decisions revoke / total — el anti-rubber-stamping), tiempo de remediación post-campaña (el SLA que se cumple), excepciones vigentes y su edad promedio (las que cumplen 90 días son hallazgo), y SoD violations abiertas con plan (cero sin plan). Estos cinco números cuentan la historia completa de la gobernanza en una sola línea de tiempo.',
          },
          {
            id: 'rm-f25-3',
            label: 'Conceptos Clave',
            text: 'Definir los KPIs técnicos del programa: % de cuentas con MMA/MFA fuerte, % de administradores en JIT (PIM) vs. permanente (la meta ZSP), % de service accounts en gMSA o bóveda, cobertura de SCIM de apps críticas (¿cuántas cuentas se crean por integración vs. a mano?), % de accesos explicados por rol (la salud del modelo) y edad de secretos no-rotados. La tabla de madurez: cada KPI con su línea base actual y su meta a 6 meses.',
          },
          {
            id: 'rm-f25-4',
            label: 'Práctica',
            text: 'Declarar la FUENTE de cada métrica antes de prometerla: dónde nace el dato exacto (HRIS API, timestamps de AD, sign-in logs, herramienta IGA, export de PIM), quién lo puede extraer (¿tú con un script? ¿requiere admin?), con qué cadencia y cuál es el costo de producirlo. El anti-patrón: la métrica de la presentación que nadie puede volver a calcular al mes siguiente. Regla: si el dato no se puede extraer dos veces con el mismo resultado, no existe.',
          },
          {
            id: 'rm-f25-5',
            label: 'Escenario',
            text: 'Redactar el reporte ejecutivo mensual de IAM de UNA página: 5 métricas con semáforo y tendencia (mini-sparklines), los 3 riesgos del mes con su acción y dueño, la meta del próximo mes, y un logro cuantificado (los 400 accesos revocados de la campaña, el leaver SLA que pasó de 5 días a 4 horas). Escrito para un CISO que no sabe qué es SCIM y no tiene por qué: riesgo, dinero y cumplimiento — nada de jerga técnica.',
          },
          {
            id: 'rm-f25-6',
            label: 'Conceptos Clave',
            text: 'Manejar los modelos de madurez como herramienta de negociación: ubicar el programa en la escala (ad-hoc → repeatable → defined → managed → optimized) por dominio (lifecycle, governance, PAM, ITDR — casi nunca están al mismo nivel), hacer el gap analysis contra la meta, y convertir cada brecha en initiative con costo/plazo/beneficio. El modelo le da al negocio el mapa de "dónde estamos y qué falta" — y a ti la lista de proyectos con la que creces.',
          },
          {
            id: 'rm-f25-7',
            label: 'Práctica',
            text: 'Medir TU propio trabajo como analista (la scorecard personal): tickets resueltos con SLA, hallazgos de higiene cerrados, campañas ejecutadas con % de respuesta, scripts en producción (uso real), proyectos entregados con métrica de impacto. La scorecard alimenta las historias STAR con NÚMEROS ("reduje las cuentas dormidas de 340 a 60 en un trimestre") — la diferencia entre "trabajé en IAM" y "estos fueron mis resultados".',
          },
          {
            id: 'rm-f25-8',
            label: 'Entrevista',
            text: 'Preparar "¿cómo demuestras el valor de IAM al negocio?" con los tres argumentos cuantificados: RIESGO (hallazgos evitados, accesos revocados, incidentes de identidad contenidos), VELOCIDAD (onboarding D1, tiempo de acceso aprobado), CUMPLIMIENTO (evidencia de auditoría producida, hallazgos cerrados). Cada uno con un ejemplo métrico del lab. La pregunta es en esencia "¿eres un técnico o un profesional?" — y se responde con números.',
          },
          {
            id: 'rm-f25-9',
            label: 'Evidencia (Exit Criteria)',
            text: 'Publicar el TABLERO de métricas del lab: hoja de cálculo con las 10 métricas del programa (lifecycle, gobernanza y técnicas), sus fórmulas y fuentes, 3 meses de datos simulados con tendencia, el análisis de la tendencia con 2 recomendaciones accionables, y el reporte ejecutivo de 1 página de cada mes. El tablero completo ES la práctica de la fase en un solo artefacto.',
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
        number: 13,
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
          {
            id: 'rm-f18-9',
            label: 'Conceptos Clave',
            text: 'Saber cuándo NO modelar un rol: acceso que tiene UNA persona con necesidad real (el analista del sistema X heredado) NO se convierte en rol de una sola persona — queda como entitlement directo con dueño y revisión; el rol existe cuando hay patrón REPRODUCIBLE (mismo acceso, múltiples personas, previsible por puesto). El anti-patrón "rol espejo de una persona" (role per person) es la raíz de la explosión de roles — detectarlo temprano vale más que cualquier herramienta de mining.',
          },
          {
            id: 'rm-f18-10',
            label: 'Práctica',
            text: 'Ejecutar la sesión de validación de roles con dueños: agendar 45 min por rol, presentar la propuesta (definición, entitlements, poblaciones actuales, riesgos SoD detectados), capturar decisión explícita (aprobar/modificar/rechazar con justificación), y dejar acta firmada. La habilidad blanda que nadie enseña: el dueño que dice "está bien así" sin mirar — cómo hacerle preguntas de negocio concretas ("¿esta persona puede aprobar pagos?") hasta obtener una revisión real.',
          },
          {
            id: 'rm-f18-11',
            label: 'Conceptos Clave',
            text: 'Governar el ciclo de vida del ROL mismo (no solo del usuario): quién puede proponer un rol nuevo (solicitud con caso de uso y población), quién aprueba (comité de accesos: dueño del sistema + seguridad), revisión anual del rol (¿sigue existiendo el puesto? ¿los entitlements siguen correctos?), y el retiro del rol (cuando muere el puesto: qué pasa con sus miembros — migración a nuevo rol + periodo de gracia). Un rol sin dueño vivo es un huérfano disfrazado de gobierno.',
          },
          {
            id: 'rm-f18-12',
            label: 'Entrevista',
            text: 'Preparar la defensa completa de 90 segundos a "¿cómo atacas el privilegio acumulado en una empresa?": (1) modelo de roles estándar por puesto (el acceso es previsible), (2) lo que no es previsible → solicitable con aprobación del DUEÑO, (3) el Mover como evento de dos pasos con revocación delta, (4) campañas focales en toxic combinations, (5) PAM/JIT para lo privilegiado — y cerrar: "la acumulación es un síntoma del diseño; el modelo la elimina en la raíz".',
          },
        ],
      },
      {
        id: 'rm-f26',
        number: 14,
        title: 'Role Engineering & Minería de Roles',
        note: 'La continuación técnica de la fase del Role Model: el método de minado con métricas de calidad. Es la competencia que los proyectos IGA reales contratan como consultoría cara — y la que puedes demostrar con un ejercicio bien documentado.',
        items: [
          {
            id: 'rm-f26-1',
            label: 'Conceptos Clave',
            text: 'Entender el role mining como problema de compresión: 5.000 usuarios × 10.000 entitlements es una matriz dispersa; el rol ES una compresión con pérdida deliberada (sacrificas exactitud a cambio de gobernanza). Las dos familias de algoritmos: clustering por co-membership (agrupa usuarios con accesos similares) y aggregation por entitlements frecuentes (empaqueta los permisos que viajan juntos). El Rol no es verdad: es una DECISIÓN de diseño — el mining propone, el dueño dispone.',
          },
          {
            id: 'rm-f26-2',
            label: 'Práctica',
            text: 'Ejecutar el mining manual de punta a punta con herramientas de analista: exportar memberships (Get-ADUser con MemberOf o el CSV del IGA), pivotar en la hoja de cálculo (tabla usuario × grupos), detectar los "roles de facto" (patrones que se repiten: 80% del departamento tiene las mismas 6 membresías) y los outliers (la persona con el acceso ÚNICO — candidato a entitlement directo o exceso). Con el método documentado paso a paso, es exactamente lo que hacen las herramientas de mining — con la diferencia de que TÚ sabrás interpretar el resultado.',
          },
          {
            id: 'rm-f26-3',
            label: 'Conceptos Clave',
            text: 'Manejar las métricas de calidad del modelo como profesional: coverage (% de accesos explicados por roles — meta >70-80%), role explosion index (roles vs. población — alarma si supera ~0.2), overlap (roles redundantes detectables por Jaccard de entitlements), y tamaño promedio de rol (5-15 entitlements es sano). Saber responder "¿cuándo paro de modelar?" con estas métricas es la diferencia entre un modelo vivo y un modelo eterno.',
          },
          {
            id: 'rm-f26-4',
            label: 'Práctica',
            text: 'Construir primero el CATÁLOGO DE ENTITLEMENTS (el prerequisito que todos se saltan): cada entitlement con ID técnico, descripción en negocio, sistema, dueño, criticidad y clasificación del dato que protege. Sin catálogo el mining hereda basura (grupos basura → roles basura). Práctica: catalogar los 50 grupos del lab, detectar los huérfanos sin dueño (bloqueados del modelo hasta que alguien los adopte) y documentar el estándar de alta de entitlements nuevos.',
          },
          {
            id: 'rm-f26-5',
            label: 'Escenario',
            text: 'Diagnóstico y tratamiento del anti-patrón "role per person": síntomas (más roles que usuarios, roles con un miembro, roles sin dueño), las queries que lo detectan (contar miembros por rol, roles con 1 miembro), y el plan de consolidación: fusionar roles duplicados, convertir singletons en entitlement directo con dueño, y el periodo de gracia con comunicación a los afectados. La historia real: empresas con 30.000 roles para 10.000 usuarios — el desorden que el mining sin gobernanza produce.',
          },
          {
            id: 'rm-f26-6',
            label: 'Conceptos Clave',
            text: 'Dominar la regla de diseño birthright vs. solicitable: birthright cuando el acceso es PREDECIBLE por el puesto (todo analista de nómina necesita X), solicitable cuando depende del CASO (el analista que además audita). La decisión moldea todo: birthright se automatiza (dynamic groups/atributo → rol), solicitable se gobierna (catálogo + aprobación). El test de decisión: "si contrato a una persona mañana en ese puesto, ¿le doy este acceso sin preguntar a nadie?" — sí: birthright; no: solicitable.',
          },
          {
            id: 'rm-f26-7',
            label: 'Práctica',
            text: 'Correr el caso híbrido completo sobre el lab: (1) mining bottom-up del export, (2) validar los 5 mejores candidatos de rol en sesión con dueño (acta de decisión por rol), (3) implementar en grupos (naming RB-*), (4) medir el before/after: coverage, reducción de asignaciones directas (de N grupos directos por usuario a 1-2 roles + excepciones), y (5) documentar el informe de role engineering completo. Este informe es el artefacto IGA más valioso del portafolio.',
          },
          {
            id: 'rm-f26-8',
            label: 'Conceptos Clave',
            text: 'Saber cómo hacen el mining las HERRAMIENTAS reales (para hablar con propiedad en demos y proyectos): SailPoint (role mining con clustering y propuestas interactivas, business roles vs. IT roles), Saviynt (access recipes y role definitions con scoring), y el patrón común: ninguna reemplaza la decisión del dueño — todas terminan en una sesión humana de validación. La frase que posiciona tu conocimiento: "la herramienta encuentra candidatos; el gobierno los convierte en roles".',
          },
          {
            id: 'rm-f26-9',
            label: 'Entrevista',
            text: 'Preparar el monólogo de 2 minutos "mi método de role engineering": (1) catálogo de entitlements primero, (2) mining bottom-up para descubrir patrones, (3) validación top-down con dueños por sesión, (4) matriz SoD en paralelo, (5) implementación por piloto con métricas (coverage, reducción de asignaciones), (6) lifecycle del rol con dueño y revisión anual. Ensayarlo hasta poder dibujarlo en una pizarra — es LA pregunta de las entrevistas de IGA enterprise.',
          },
        ],
      },
      {
        id: 'rm-f19',
        number: 15,
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
          {
            id: 'rm-f19-8',
            label: 'Conceptos Clave',
            text: 'Curar el catálogo de acceso solicitable (requestable): qué ENTRA (accesos estándar, repetibles, de riesgo medio con aprobación clara) y qué NO (Tier 0, accesos vitales, datos regulados — flujo especial con comité), descripciones orientadas al usuario ("¿qué puedo HACER con esto?" en vez del nombre técnico GG-FIN-SAP-RO), y precios/categorías que guían la búsqueda. El catálogo es un producto interno: si nadie lo usa, el self-service falló y los tickets siguen.',
          },
          {
            id: 'rm-f19-9',
            label: 'Conceptos Clave',
            text: 'Hacer del acceso temporal el DEFAULT para lo no-birthright: Access Packages con expiración obligatoria (7/30/90 días según criticidad), PIM assignments con end date, renovación con re-aprobación (jamás automática para críticos), y el monitoreo de qué % de accesos temporales se convirtieron en permanentes por renuencia a renovar. La regla que lo resume: "¿acceso para siempre por un proyecto de 2 semanas?" — jamás de nuevo.',
          },
          {
            id: 'rm-f19-10',
            label: 'Escenario',
            text: 'Diseñar el flujo del acceso de emergencia fuera de horas (la madrugada del despliegue): canal de solicitud (teléfono + ticket posterior obligatorio), aprobador de guardia documentado con suplente, provisioning con verificación dual, revisión post-uso en 24 h (¿se usó? ¿para qué? ¿se revocó?), y la métrica mensual de cuántas emergencias hubo (demasiadas = tu proceso normal es demasiado lento). El flujo de emergencia ES control, no excepción.',
          },
        ],
      },
      {
        id: 'rm-f20',
        number: 16,
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
          {
            id: 'rm-f20-7',
            label: 'Conceptos Clave',
            text: 'Cazar los residuos de acceso que sobreviven al offboarding clásico: tokens OAuth concedidos por el usuario (Enterprise apps → user consent), API keys personales (GitHub PAT, tokens de integración), llaves SSH en repositorios, shares de SharePoint con permiso directo, distribuciones de correo, accesos de VPN con certificado, credenciales guardadas en gestores de contraseñas del equipo y en cookies de browser sincronizado. El inventario de residuos es el mapa de lo que la auditoría encuentra y tú no sabías que existía.',
          },
          {
            id: 'rm-f20-8',
            label: 'Práctica',
            text: 'Ejecutar el "revoke audit" del lab: crear un usuario de prueba, asignarle 6 clases de acceso (grupo AD, licencia Entra, app SaaS por grupo, consent OAuth personal, delegación de buzón, membresía de equipo en SharePoint/Teams), ejecutar el offboarding completo y VERIFICAR los 6 residuos uno por uno con evidencia (¿el consent OAuth sigue vivo? ¿la delegación de buzón quedó?). Documentar qué quedó y qué faltó en el proceso — este ejercicio revela los agujeros del checklist teórico.',
          },
          {
            id: 'rm-f20-9',
            label: 'Escenario',
            text: 'Diseñar el offboarding EXTENDIDO del administrador: además del estándar — transferir/tirar sus delegaciones de AD (delegation permissions en OUs), revisar GPOs creadas o modificadas por él, SPNs de cuentas que manejaba, credenciales de service accounts que conocía (rotar TODAS las que podía ver), memberships de grupos Tier 0/1, y la entrevista de salida técnica (entrega de credenciales por escrito). Plazo: 24 h, firmado por el líder. El admin que se va con secretos en la cabeza es el riesgo más caro de todos.',
          },
          {
            id: 'rm-f20-10',
            label: 'Conceptos Clave',
            text: 'Definir la política deshabilitar vs. eliminar con la retención forense: deshabilitado 30-90 días (el mailbox en litigation hold si aplica), luego baja del objeto (o papelera de AD si existe), retención de logs de su actividad (¿cuánto viven tus sign-in logs? exportar a storage antes de que expiren), y por qué NUNCA se reutiliza el objeto/correo del reingreso (identidad nueva limpia o reactivación documentada — jamás "reciclar" la identidad de otro). El requisito forense: poder reconstruir qué hizo en sus últimos 90 días aunque ya no exista.',
          },
        ],
      },
      {
        id: 'rm-f21',
        number: 17,
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
          {
            id: 'rm-f21-8',
            label: 'Conceptos Clave',
            text: 'Distinguir los tipos de campaña y cuándo toca cada una: manager review (membresías de sus reportes — trimestral), entitlement owner review (el dueño del sistema certifica QUIÉN tiene su entitlement — semestral), role certification (¿el rol sigue siendo correcto en su composición? — anual), privileged access review (PIM/PAM: ¿estos privilegios siguen justificados? — trimestral, crítico), y la revisión de terceros/contractors (mensual). El calendario de campañas por tipo es el artefacto que pide el comité.',
          },
          {
            id: 'rm-f21-9',
            label: 'Práctica',
            text: 'Diseñar la experiencia del reviewer como producto: cada línea de certificación con CONTEXTO real (última vez usado — datos de sign-in/login del sistema, fecha de asignación, quién aprobó originalmente, justificación original), decisión en un clic (approve/revoke/abstain) con justificación obligatoria en críticos, progreso visible y recordatorios programados. El reviewer sin contexto aprueba por inercia — el diseño de la campaña es el 50% de su eficacia.',
          },
          {
            id: 'rm-f21-10',
            label: 'Conceptos Clave',
            text: 'Decidir el default del cierre con criterio: default deny (lo no certificado se revoca) — estricto, correcto para accesos críticos, pero exige campaña bien anunciada y ventana de remediación; default allow (lo no revisado queda) — en la práctica perpetúa el desorden y solo funciona con % de respuesta >95%. La postura profesional: default deny para críticos desde el día 1 con grace period de una campaña; default allow temporal para poblaciones de bajo riesgo mientras se construye el hábito — con la fecha de migración a deny publicada.',
          },
          {
            id: 'rm-f21-11',
            label: 'Escenario',
            text: 'Ejecutar la campaña de service accounts (la que nadie quiere): reviewer = dueño de la APLICACIÓN (no el manager — el manager no sabe qué hace la cuenta), evidencia de uso real (LastLogonDate + logs de autenticación de la app + dueño confirmando el propósito), y el destino por clase: cuenta viva con uso → documentar y bóvedar; cuenta sin uso 90 días → deshabilitar con plan de baja; cuenta sin dueño → comité decide con el riesgo a la vista. El resultado: la población más temida queda certificada y gobernada.',
          },
          {
            id: 'rm-f21-12',
            label: 'Entrevista',
            text: 'Preparar "¿cómo evitas que las campañas sean un trámite?": (1) carga limitada (<50 líneas por reviewer), (2) contexto por entitlement (última uso, justificación original), (3) justificación obligatoria en críticos, (4) métricas por reviewer visibles al comité (tasa de revocación, tiempo de respuesta, % aprobado sin leer — medido por muestreo), (5) revocación automática al cierre. Y el argumento de fondo: la campaña es el control DETECTIVO del acceso — tratarla como formulario es tirar el control.',
          },
        ],
      },
      {
        id: 'rm-f11',
        number: 18,
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
          {
            id: 'rm-f11-8',
            label: 'Conceptos Clave',
            text: 'Interiorizar Just-In-Time como filosofía (no feature): el privilegio NO vive permanentemente en ninguna identidad humana — se activa por ventana con ticket, justificación y aprobación; la meta es Zero Standing Privileges (ZSP: cero privilegio estacionado). Los patrones de aprobación por criticidad: auto-aprobación con alerta para el D0 (fricción mínima, control posterior), aprobador humano para producción, dual control para Tier 0. Saber defender el trade-off fricción-riesgo con el dato: la ventana de 4-8 h cubre el 95% del trabajo real de admin.',
          },
          {
            id: 'rm-f11-9',
            label: 'Práctica',
            text: 'Onboarding completo de un recurso al PAM en el lab: inventariar las cuentas target (del asset: Windows, Linux, base de datos), ingerir credenciales a la bóveda con rotación inicial, configurar la check-out policy (aprobación sí/no, TTL de la sesión, grabación habilitada, horas permitidas), y correr la sesión completa de prueba con evidencia: solicitud → aprobación → sesión grabada → rotación post-sesión → verificación de que la nueva credencial ya no es la vieja. Este flujo de punta a punta ES la entrevista técnica de PAM.',
          },
          {
            id: 'rm-f11-10',
            label: 'Conceptos Clave',
            text: 'Operar la grabación de sesiones con criterio forense: qué se captura (video/keystrokes/comandos ejecutados, por protocolo), retención por criticidad (90 días estándar, 1 año para Tier 0), quién puede VER las grabaciones (equipo de seguridad/auditoría, jamás el propio administrado sin control), búsqueda por evento (¿quién ejecutó DROP TABLE?), y el aviso legal previo (la grabación informada cambia el comportamiento — esa es también su función disuasiva).',
          },
          {
            id: 'rm-f11-11',
            label: 'Conceptos Clave',
            text: 'Extender PAM al mundo cloud y DevOps: credenciales cloud (AWS access keys → roles con STS en lugar de users con keys), secretos de pipelines (Key Vault/Secrets Manager con identidad manejada, nunca secrets en variables de entorno del CI), y el principio rector: TODO secreto no-humano vive en un gestor con rotación, TODO acceso humano privilegiado pasa por activación temporal. El PAM moderno no es un jump host — es una política aplicada a cualquier tipo de credencial.',
          },
          {
            id: 'rm-f11-12',
            label: 'Escenario',
            text: 'Planificar la adopción de PAM en una empresa que resiste (el equipo de TI que lo vive como desconfianza): el plan de olas con quick wins primero (Domain Admins semana 1), comunicación honesta ("es evidencia que los protege, no vigilancia"), entrenamiento en el nuevo flujo con el equipo INCLUIDO en el piloto, métricas de adopción visibles (% de accesos privilegiados vía PAM), y el caso de éxito interno narrado por un early adopter respetado. La mitad del proyecto PAM es gestión del cambio, no tecnología.',
          },
        ],
      },
      {
        id: 'rm-f27',
        number: 19,
        title: 'PAM en Profundidad: Safeguard, CyberArk & BeyondTrust',
        note: 'La especialización que más contrata y menos candidatos cubren: saber operar las tres plataformas de PAM del mercado con nombre propio. El objetivo es hablar con pantallas vistas y tener un flujo de checkout completo documentado.',
        items: [
          {
            id: 'rm-f27-1',
            label: 'Conceptos Clave',
            text: 'Anatomy de One Identity Safeguard: la appliance (hardware o virtual) con dos caras — Safeguard for Privileged Sessions (SPS: el proxy que graba y controla RDP/SSH/HTTPS) y Safeguard for Privileged Passwords (SPP: la bóveda con checkout, rotación y políticas por asset), los asset groups con cuentas agrupadas por sistema, y las access policies (quién puede hacer check-out de qué cuenta, con aprobación, en qué horario, con grabación). El flujo típico: usuario se autentica en la appliance (o con SSO), pide el acceso, la política decide, la sesión se abre proxied y grabada.',
          },
          {
            id: 'rm-f27-2',
            label: 'Práctica',
            text: 'Montar el flujo Safeguard hands-on (trial de One Identity o el lab del partner): dar de alta un asset Windows + su admin local, hacer check-out directo (ver el password temporal) Y por sesión proxied (jamás verlo), configurar una política con aprobación para el segundo asset, y descargar la grabación de la sesión con evidencia. Alternativa documentada si no hay trial: los labs oficiales de One Identity University con capturas de cada pantalla y el flujo dibujado.',
          },
          {
            id: 'rm-f27-3',
            label: 'Conceptos Clave',
            text: 'Anatomy de CyberArk PAM: la Digital Vault / EPV (la bóveda con los safes por tipo de cuenta), el CPM (Central Policy Manager: la rotación on-schedule y post-checkout), el PSM (Privileged Session Manager: el proxy de sesión para RDP/SSH/DB), la PVWA (el portal web del usuario) y AIM (Application Identity Manager: los secrets para aplicaciones — el eslabón que las demás plataformas copiaron). Los conceptos que el mercado heredó de CyberArk: safe, checkout con lock, on-demand rotation — saber de dónde viene cada uno demuestra historia.',
          },
          {
            id: 'rm-f27-4',
            label: 'Conceptos Clave',
            text: 'Anatomy de BeyondTrust: Password Safe (vaulting + rotación + descubrimiento con la curva más suave del mercado) y Remote Support (el anterior Bomgar: sesiones remotas con granularidad por representado/representante), la inyección de credenciales en la sesión (el usuario no ve el password), Privilege Manager (least privilege en endpoint — elevar solo la app que lo necesita, no al usuario completo) y PowerBroker (la historia Unix que lo precedió). Su nicho real: empresas que necesitan PAM + soporte remoto a terceros en la misma plataforma.',
          },
          {
            id: 'rm-f27-5',
            label: 'Comparativa',
            text: 'Construir TU tabla de selección con recomendaciones por caso: banco regulado on-prem (CyberArk: compliance pesado, madurez, grabación forense), empresa Microsoft-céntrica (Safeguard: integración AD/grupos, appliance llave en mano), organización con soporte remoto a terceros (BeyondTrust: Remote Support), SaaS startup (empieza con Entra PIM + bóveda de secretos — jamás un PAM pesado el día 1). Con el costo aproximado de licenciamiento por usuario/mantenimiento y la curva de implementación. La tabla con escenarios es el artefacto que más "senior" te hace sonar en entrevistas de plataforma.',
          },
          {
            id: 'rm-f27-6',
            label: 'Conceptos Clave',
            text: 'Dominar la inyección de credenciales y el broker de sesión como concepto central del PAM moderno: el humano JAMÁS ve el password (el broker lo inyecta en el destino), lo que elimina el keylogger/phishing del usuario y el sticky note; el costo del diseño: TODA sesión privilegiada pasa por el broker (el atajo de "esta vez entra directo" es la vía de retorno del desorden). Saber explicar ese trade-off y el monitoreo de bypass (detección de conexiones directas a los targets fuera del broker) — el control que valida el control.',
          },
          {
            id: 'rm-f27-7',
            label: 'Conceptos Clave',
            text: 'Operar el discovery de cuentas privilegiadas: cómo el PAM escanea (AD: miembros de grupos admin, admins locales por GPO; Unix: sudoers y root; redes: SNMP/community strings; clouds: keys y roles), el workflow de ingesta con owners (primero inventario con dueño → luego bóveda — jamás al revés), el "prime the vault" (primer cambio de credencial al ingerir) con su riesgo (la app que usaba la credencial a mano: detectar dependencias ANTES de rotar), y la campaña de discovery como bucle mensual: nuevas cuentas → owners → bóveda.',
          },
          {
            id: 'rm-f27-8',
            label: 'Escenario',
            text: 'Diseñar el dual control (two-man rule) para las cuentas más sensibles: la cuenta break-glass del dominio o el rol de producción crítica exige DOS personas — una custodia la credencial (o su mitad) y otra ejecuta con testigo; la implementación en las plataformas (aprobación in-sesión en Safeguard, dual control flag en CyberArk con su patrón de doble confirmación), la auditoría del flujo, y cuándo vale la pena el costo operativo: cuentas de mayor riesgo de abuso interno y ambientes regulados (banca). El control que casi nadie implementa y todos preguntan.',
          },
          {
            id: 'rm-f27-9',
            label: 'Entrevista',
            text: 'Preparar el caso "cliente con 40 Domain Admins y passwords compartidos": el plan de 90 días con olas: (1) discovery + owners (semana 1-2), (2) ingestión de las 5 cuentas más críticas + break-glass sellada (semana 3-4), (3) checkout con aprobación para Tier 0 (mes 2), (4) migración de admins a JIT/PIM y reducción de Domain Admins a <5 (mes 3), con las métricas de cada ola y el plan de comunicación al equipo. La respuesta estructurada por fases CON métricas es lo que busca el entrevistador enterprise.',
          },
          {
            id: 'rm-f27-10',
            label: 'Evidencia (Exit Criteria)',
            text: 'Entregar el mini-proyecto PAM del lab: 5 cuentas de 3 tipos (Windows admin, Linux root, service account) ingeridas y rotadas en la plataforma del lab (o documentadas con la simulación completa), 1 política con aprobación + grabación + horario, el flujo de sesión completo con la grabación descargada como evidencia, el drill de rotación con plan de rollback documentado, y el informe de adopción (qué % de accesos privilegiados del lab pasan por el PAM). Artefacto completo = flujo + política + evidencia + métrica.',
          },
        ],
      },
      {
        id: 'rm-f9',
        number: 20,
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
          {
            id: 'rm-f9-8',
            label: 'Conceptos Clave',
            text: 'Ubicar Okta en el landscape SIN inflarlo: es un IdP/Access Management excelente (Universal Directory, policies, provisioning SCIM, workflows), pero NO es IGA completo — sin role mining nativo profundo, campañas de certificación empresariales y SoD nativo (eso lo cubren SailPoint/Saviynt o los complementos Okta Identity Governance). Saber decir "Okta como IdP + IGA para governance" y por qué las empresas grandes terminan con AMBOS — la respuesta que demuestra que conoces el mercado real y no solo el producto que aprendiste.',
          },
          {
            id: 'rm-f9-9',
            label: 'Práctica',
            text: 'Explorar Okta Workflows (o diseñar el flujo completo en papel): el offboarding automatizado — trigger (user.lifecycle.deactivate) → revocar sesiones → retirar de grupos de apps sensibles → notificar al canal de TI → crear ticket de cierre en el ITSM → verificación 24 h. Con los conectores reales (Okta, Slack, ServiceNow) del catálogo de Workflows. La competencia de automatización con low-code es exactamente lo que piden las vacantes de "IAM engineer" con Okta.',
          },
          {
            id: 'rm-f9-10',
            label: 'Conceptos Clave',
            text: 'Governar los roles admin de Okta: Super Admin (dueño: máximo 2-3 personas, con FIDO2 exigido y IP allowlist de la consola), Org Admin, App Admin (scoped a la app — el patrón correcto para el dueño de integración), Group Admin, Read Only + Help Desk para soporte. La práctica de delegación granular (custom admin roles por función), el inventario de API tokens activos, y el hygiene check: ¿cuántos Super Admins tienes? La respuesta correcta empieza por "menos de 5".',
          },
          {
            id: 'rm-f9-11',
            label: 'Práctica',
            text: 'Extraer el System Log vía API para el SOC: GET /api/v1/logs con filtros por eventType (user.authentication.auth_via_mfa, user.session.start, policy.evaluate, app.oauth2.token.idt.issue), hasta 10.000 registros con since/until, y la integración con el SIEM (webhook o pull programado). Armar en el lab el "daily digest": intentos fallidos, accesos desde geografías nuevas, activaciones de cuenta sospechosas — el mismo hábito de los sign-in logs pero del lado Okta.',
          },
          {
            id: 'rm-f9-12',
            label: 'Escenario',
            text: 'Estudiar y presentar el caso Okta 2022 como lesson learned: compromiso del panel de soporte de un tercero → acceso a inquilinos de clientes → secuestro de tokens de super admin. Las lecciones que un analista debe extraer: phishing-resistant MFA para TODOS los admins (no solo usuarios), IP allowlist de la consola de administración, revisión de accesos de TERCEROS al tenant (soporte del vendor incluido), monitoreo de la actividad admin via System Log, y la pregunta incómoda: "¿QUIÉN puede administrar tu IdP y cómo lo verificas?".',
          },
        ],
      },
      {
        id: 'rm-f10',
        number: 21,
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
          {
            id: 'rm-f10-8',
            label: 'Conceptos Clave',
            text: 'Distinguir SailPoint IdentityIQ de Identity Security Cloud (antes IdentityNow): IIQ es el stack on-prem Java (compliance pesado, customización total, banca y clientes con datos que no salen del edificio), ISC es el SaaS (time-to-value rápido, actualizaciones continuas, el futuro del vendor). Qué comparten (Identity Cube, LCM, campaigns, role model) y qué cambia (la operación: upgrades de IIQ como proyecto anual vs. release trains de ISC). En entrevistas enterprise la pregunta "¿IIQ o Now?" revela si conoces el vendor real o solo el nombre.',
          },
          {
            id: 'rm-f10-9',
            label: 'Conceptos Clave',
            text: 'Entender los conectores como el verdadero costo del IGA: directores (AD/LDAP, Entra), HR (Workday/SuccessFactors vía archivo o API), bases (JDBC), SaaS (SCIM/REST), mainframe (RACF/Top Secret — banca) y el conector CUSTOM (cuando la app no tiene nada: desarrollo propio con planes de aggregation y provisioning). Los modos de interacción (aggregation-only, provisioning completo, virtual), y por qué la fase de connector scoping es donde los proyectos IGA se van de presupuesto.',
          },
          {
            id: 'rm-f10-10',
            label: 'Práctica',
            text: 'Trazar el ciclo de vida de un Joiner a través del IGA (simulado con documentación si no hay trial): HR feed crea la Identity (con su Identity Cube), birthright roles por atributos (department → rol de nómina), provisioning plans hacia targets (cuenta AD + grupo + licencia Entra + cuenta SAP), y la verificación (task results + revisión de la identidad). Documentar el pipeline con los estados intermedios (¿qué pasa si un target falla? — retry, error visible, remediation queue). El pipeline completo ES el valor del IGA.',
          },
          {
            id: 'rm-f10-11',
            label: 'Conceptos Clave',
            text: 'Manejar la correlación de identidades como el problema que es: una identidad corporativa con MÚLTIPLES cuentas (AD, Entra, SAP, SaaS) unidas por atributos (employeeId, mail) o por links explícitos; la correlation rule que falla (cuentas huérfanas/pending), las identidades duplicadas (maría en RRHH y m.garcia en AD — quién decide el match), y el authoritative conflict (RRHH dice que se fue, el manager pide reactivar: RRHH gana SIEMPRE que esté en el contrato de datos). La calidad de la correlación define la calidad de TODO el IGA.',
          },
          {
            id: 'rm-f10-12',
            label: 'Escenario',
            text: 'Montar la gobernanza alrededor del IGA (la pieza invisible): comité de accesos con cadencia real (roles nuevos, excepciones críticas, resultados de campañas), owners formales por sistema y por rol, el reporting mensual de riesgo al CISO (top riesgos: % cuentas huérfanas, campañas vencidas, SoD violaciones abiertas), y el presupuesto defendido con métricas. El IGA sin gobernanza es una herramienta carísima de aprobar solicitudes — la gobernanza es lo que convierte la compra en programa.',
          },
        ],
      },
      {
        id: 'rm-f22',
        number: 22,
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
          {
            id: 'rm-f22-8',
            label: 'Conceptos Clave',
            text: 'Completar el ecosistema Ping con PingID y PingOne: PingID como el MFA (device pairing, push/OTP/passthrough WebAuthn, risk signals de geovelocity y device), la integración nativa PingFederate↔PingID (step-up por política), PingOne como la plataforma SaaS que empaqueta todo, y PingAuthorize (policies externas con OPA). El caso de uso que lo explica todo: el banco con PingFederate de hub de federación B2B que agrega PingID para step-up en transacciones sensibles.',
          },
          {
            id: 'rm-f22-9',
            label: 'Conceptos Clave',
            text: 'Entender ForgeRock AM authentication trees: la autenticación como ÁRBOL de nodos componibles (username collector → password → MFA optativo → risk check → incrementing account lockout), el traversal debug (ver el camino real que siguió un login fallido), y por qué es el modelo más flexible del mercado (política como flujo visual en vez de formularios fijos). El pensum mínimo para hablar con propiedad: dibujar un árbol completo de login con risk-based step-up y explicarlo nodo a nodo.',
          },
          {
            id: 'rm-f22-10',
            label: 'Conceptos Clave',
            text: 'Profundizar en IBM ISAM/Verify Access la pieza que aparece en vacantes de banca: WebSEAL como el proxy que protege recursos con junctions (/jct hacia el backend), el SSO por header (iv-user hacia la app legacy sin tocarla), las policies por recurso con risk-based access (evalúa contexto y step-up), y el inventory de modos de despliegue (appliance física, virtual, SaaS Verify). La historia que lo explica: el core bancario que jamás hablará OIDC y vive feliz detrás del WebSEAL.',
          },
          {
            id: 'rm-f22-11',
            label: 'Escenario',
            text: 'Responder la consulta del cliente con stack Oracle EBS + OAM viejo: "¿migramos o mantenemos?": los costes de quedarse (middleware fuera de soporte, know-how que se jubila, MFA débil por capas extra), los de migrar (proyecto multi-año, riesgo de integración con el EBS, doble correr), y tu recomendación como analista: stranded risk por años + roadmap del vendor (el OAM clásico está en modo mantenimiento — el future es Oracle Access Management con OCI/Redwood) → plan híbrido: estabilizar ( parches + MFA frontal) mientras se planifica la salida. La respuesta que vale es la CRITERIA, no la opinión.',
          },
        ],
      },
      {
        id: 'rm-f8',
        number: 23,
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
          {
            id: 'rm-f8-7',
            label: 'Conceptos Clave',
            text: 'Tener el MAPA completo de ataques a identidad con control por fila: password spraying (lockout policies + smart lockout + MFA), kerberoasting (gMSA + cuentas con passwords largos + auditoría de SPNs), Golden/Silver Ticket (tiering + rotación doble de KRBTGT), DCSync (protección de replicación + alertas 4662), NTLM relay (signing + LDAP hardening + certificado de IP), AiTM phishing (FIDO2 + CAE + token binding), MFA fatigue (number matching + rate limit), consent phishing (admin consent workflow + inventario de grants). El mapa es tu tabla de responder "¿y esto cómo se previene?" en una entrevista.',
          },
          {
            id: 'rm-f8-8',
            label: 'Práctica',
            text: 'Montar detecciones de AD concretas en el lab: 4768/4769 con encryption type RC4 (huella de kerberoasting), 4776 múltiple desde un host con fallos y un éxito (spray vertical), 4740 en cadena (lockout como side effect), 4624 Type 3 anómalo fuera de horas hacia equipos sensibles, y el 4728 fuera de ventana de cambio (nuevo Domain Admin). Cada detección con: query (Get-WinEvent/ KQL), baseline esperada y umbral de alerta. La diferencia entre "tengo logs" y "tengo detecciones" es exactamente este paso.',
          },
          {
            id: 'rm-f8-9',
            label: 'Conceptos Clave',
            text: 'Operar Entra Identity Protection con criterio: los risk detections (leaked credentials, atypical travel, unfamiliar sign-in properties, anonymized IP, malware-related), la diferencia user risk vs. sign-in risk, y las políticas de respuesta por nivel (low/medium/high): require MFA en login arriesgado, force password reset para user risk high, y el cierre del loop con remediation (el usuario que se registra y resetea limpia el riesgo). Y el argumento de arquitectura: Identity Protection es el ITDR NATIVO del ecosistema Microsoft — conocer sus límites (dónde empieza a necesitar Sentinel).',
          },
          {
            id: 'rm-f8-10',
            label: 'Práctica',
            text: 'Armar el "hunting pack" de identidad: 3 queries listas para producción — (1) spray de fin de semana: fallidos masivos por IP con éxito aislado posterior, (2) actividad de cuenta deshabilitada: cualquier 4768/4764/4624 POST disable (firma de reactivación no autorizada o sesión zombie), (3) nuevo admin fuera de ventana de cambio: 4728/audit de PIM fuera del horario de cambios aprobado. Con KQL (SigninLogs/AuditLogs) o PowerShell contra el lab. Un paquete que puedas ejecutar el primer día de un SOC nuevo y parecer senior en la primera semana.',
          },
          {
            id: 'rm-f8-11',
            label: 'Escenario',
            text: 'Resolver el incidente AiTM de punta a punta (el caso moderno por excelencia): el usuario "hizo MFA" en el sitio de phishing con proxy inverso (Evilginx/MfaPhish) y el atacante tiene la COOKIE de sesión. Contención: revoke sessions + reset password (el reset solo NO mata la sesión — revoke primero), review de accesos y correos enviados en la ventana, barrido de inbox rules sospechosas (persistencia silenciosa). Prevención: FIDO2 (origin binding: el proxy de phishing jamás obtiene la llave), CAE + device compliance, y detección (login desde IP del proxy, impossible travel del user agent). Lección final: phishing-resistant > MFA genérico, siempre.',
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
        number: 24,
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
          {
            id: 'rm-f12-6',
            label: 'Conceptos Clave',
            text: 'Dominar la defensa en profundidad de políticas AWS: identity-based policy (qué puede hacer la identidad), permissions boundary (el TECHO que ni un admin de la cuenta puede cruzar), SCP (el límite de la ORGANIZACIÓN que hereda toda la cuenta) y resource policy (quién puede tocar el recurso). La lógica: Allow efectivo = intersección de todos. El caso clásico: el developer con AdministratorAccess que queda acotado por el boundary — y saber explicarlo con el diagrama de evaluación.',
          },
          {
            id: 'rm-f12-7',
            label: 'Práctica',
            text: 'Ejecutar cross-account access en el lab: cuenta A (seguridad) con el rol de auditor, cuenta B (workload) con el trust policy que permite al principal de A hacer AssumeRole, la sesión con sts assume-role (credenciales temporales con session tags), y el patrón de producción: NUNCA users con long-lived keys entre cuentas — roles con STS y federación desde el Identity Center. La pregunta de la vida real: "¿dónde están las llaves de la integración?" y su respuesta correcta: "no hay".',
          },
          {
            id: 'rm-f12-8',
            label: 'Conceptos Clave',
            text: 'Profundizar en AWS IAM Identity Center como el front empresarial: la relación con Entra ID/Okta (IdP externo vía SAML/SCIM — el Identity Center NO es otro directorio, es el BROKER de AWS), permission sets como plantillas reutilizables de políticas, assignments (grupo → account → permission set) como la matriz completa, y el requisito de las cuentas nuevas (el proceso de vending machine: cuenta creada → SCP base → assignment de admins → sin root keys JAMÁS). El roadmap híbrido real de toda empresa: IdP corporativo → Identity Center → roles.',
          },
          {
            id: 'rm-f12-9',
            label: 'Práctica',
            text: 'Cerrar el ciclo de least privilege con las herramientas nativas: IAM Access Analyzer (findings de acceso externo/grantor y recursos compartidos), policy generation desde CloudTrail data (la política MÍNIMA de lo que la función REALMENTE hizo en 30 días — la minería de permisos que nadie hace a mano), y el flujo de hardening continuo: generar → revisar el diff → aplicar → monitorear denegaciones. Este flujo aplicado a TU propio lab, con el before/after documentado.',
          },
          {
            id: 'rm-f12-10',
            label: 'Escenario',
            text: 'Resolver el incidente de la access key filtrada en GitHub: detección (secret scanning del repo / alerta de GuardDuty), contención INMEDIATA (revocar la key, invalidar sesiones), investigación con CloudTrail (qué hizo el rol en la ventana — enumeración, exfiltración, criptominería), remediación (rotar todo lo que dependía, migrar a rol/Secrets Manager), prevención (guardrails: SCP que prohíbe la creación de users con keys, detective: GuardDuty + Access Analyzer), y el postmortem de una página con las lecciones. El caso real que TODO cloud security pregunta en entrevistas.',
          },
        ],
      },
      {
        id: 'rm-f28',
        number: 25,
        title: 'Multi-Cloud Identity: Azure, GCP & Kubernetes',
        note: 'El IAM moderno es multi-cloud por definición: AWS de una fase anterior, aquí Azure RBAC, GCP y Kubernetes. El objetivo NO es ser arquitecto cloud — es que ningún interviewer te descoloque con un binding de GCP o un ServiceAccount de k8s.',
        items: [
          {
            id: 'rm-f28-1',
            label: 'Conceptos Clave',
            text: 'Dominar Azure RBAC como capa separada de Entra ID: los scopes en jerarquía (management group → subscription → resource group → resource — la herencia es real y aditiva), los roles built-in clave (Owner ≠ Contributor ≠ Reader, y los específicos: User Access Administrator como el peligroso que casi nadie monitorea), los custom roles con JSON, y LA confusión clásica de entrevista: roles de ENTRA (quién gestiona identidades) ≠ roles de AZURE RBAC (quién opera recursos) — dos planos distintos que heredan de dos lugares.',
          },
          {
            id: 'rm-f28-2',
            label: 'Práctica',
            text: 'Elevar privilegio a tiempo en Azure: PIM for Azure resources (el mismo PIM de Entra pero para roles de suscripción: Owner/Contributor ELEGIBLES con activación de horas), la verificación con la evidencia del audit (quién activó qué rol, cuándo, con qué justificación), y la gobernanza de service principals en Azure: credenciales por certificado (jamás secret en texto), y el inventario de SPs con roles de Owner/Contributor (Get-AzADServicePrincipal + role assignments) — el hallazgo que nadie revisa.',
          },
          {
            id: 'rm-f28-3',
            label: 'Conceptos Clave',
            text: 'Entender GCP IAM sin sufrir: la organización como raíz (organización → folders → projects → resources), el binding como primitive (member + role + resource: el "quién-qué-dónde" en una línea), la gran diferencia con Azure: NO hay herencia de políticas full-accional — la effective policy es la UNIÓN de bindings en la jerarquía (IAM conditions y deny policies llegaron después), los roles predefined vs. custom vs. primitive (owner/editor/viewer), y la identidad: usuarios Google, service accounts GCP y grupos. La traducción mental AWS→GCP: policy document → binding list.',
          },
          {
            id: 'rm-f28-4',
            label: 'Conceptos Clave',
            text: 'Construir la tabla de traducción multi-cloud (el mapa mental que evita el colapso): identidad (IAM user ↔ Entra user ↔ Google account), rol (IAM role ↔ Azure role ↔ GCP role), adjunto (policy ↔ role assignment ↔ binding), grupo de gestión (organizations/SCPs ↔ management groups ↔ folders), federación (Identity Center ↔ Entra nativo ↔ workforce identity federation) y JIT (STS assume-role ↔ PIM ↔ IAM Conditions + elevación temporal). Tenerla impresa: cada entrevista multi-cloud se gana con esta tabla.',
          },
          {
            id: 'rm-f28-5',
            label: 'Conceptos Clave',
            text: 'Separar los dos planos de identidad en Kubernetes: el acceso AL CLUSTER (quién puede hablar a la API: kubeconfig con certificados, OIDC federado con tu IdP — el patrón empresarial: Entra/Okta como autenticador del cluster) vs. los permisos DENTRO (RBAC de k8s: Role/ClusterRole + RoleBinding/ClusterRoleBinding sobre ServiceAccounts y grupos), y el ServiceAccount como identidad de POD (el "quién es" del workload dentro del cluster). La pregunta que ordena todo: "¿identidad humana o identidad de workload?".',
          },
          {
            id: 'rm-f28-6',
            label: 'Conceptos Clave',
            text: 'Interiorizar workload identity federation como el patrón que mata los secretos entre clouds: el workload de cloud A (pod con su ServiceAccount, o una action de GitHub) obtiene un token firmado por SU proveedor → lo cambia por credenciales de corta vida en cloud B (GCP workload identity pool, Azure federated credentials) → asume el rol. Sin keys, sin rotación, sin vencimientos que olvidar. El caso estrella: GitHub Actions desplegando a Azure/GCP SIN un solo secreto almacenado — la demo que se recuerda en las entrevistas.',
          },
          {
            id: 'rm-f28-7',
            label: 'Conceptos Clave',
            text: 'Conocer el problema CIEM (Cloud Infrastructure Entitlement Management) que nace de esta Torre de Babel: inventario unificado de identidades cloud (humano + no-humano) con sus privilegios efectivos (¡la unión de todas las capas!), detección de excesos (identidad con 40 roles y uso real de 2), toxic combinations cloud (quién puede crear VM Y modificar la política del bucket) y las herramientas del mercado (naivas de cada cloud: IAM Access Analyzer/Advisor/Policy Intelligence; y plataformas CIEM: Wiz, Prisma, Zscaler). El término CIEM en tu vocabulario = señorío del dominio cloud actual.',
          },
          {
            id: 'rm-f28-8',
            label: 'Escenario',
            text: 'Resolver "tenemos identidades en 3 clouds y nadie sabe cuántos admins hay": el programa en 4 pasos: (1) inventario de fuentes (Entra/AWS IAM/GCP IAM + los SPs del plano técnico), (2) IdP hub corporativo (Entra u Okta como front: SSO + lifecycle a las consolas), (3) JIT por cloud (PIM Azure, Identity Center AWS, elevación GCP — cero admins permanentes), (4) el reporte unificado de privilegio efectivo por persona (la vista que pide auditoría y no existe en ninguna consola). La respuesta que vale: el MODELO, no la herramienta.',
          },
          {
            id: 'rm-f28-9',
            label: 'Evidencia (Exit Criteria)',
            text: 'Cerrar el lab multi-cloud mínimo: trial de Azure (un resource group con PIM para un rol, un SP con certificado), free tier de GCP (un binding creado con gcloud, la effective policy consultada con gcloud projects get-iam-policy), y el diagrama del lab completo: AD local → Entra → ambos clouds, con las identidades humanas y de workload dibujadas y la tabla comparativa AWS/Azure/GCP propia como anexo. Evidencia operativa: dos comandos ejecutados y capturados en cada cloud.',
          },
        ],
      },
      {
        id: 'rm-f23',
        number: 26,
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
          {
            id: 'rm-f23-7',
            label: 'Conceptos Clave',
            text: 'Gestionar la identidad basada en certificados (la credencial no-humana más olvidada): certificados como credencial de workload (mutual TLS — ambos lados prueban identidad), client certificate auth en Entra/AD CS, el certificado del device (SCEP/Intune) como identidad del EQUIPO, y el inventario que nadie tiene: emisión, expiración, dueño, revocación. El incidente clásico: la CA interna que vence y caen TODAS las integraciones un domingo — el calendario de vencimientos de certificados (con alerta a 90 días) es higiene de identidad no-humana.',
          },
          {
            id: 'rm-f23-8',
            label: 'Práctica',
            text: 'Ejecutar la rotación segura de un secreto sin romper la integración — el drill que separa el discurso de la operación: (1) inventario de QUIÉN usa el secreto (grep en configs, vault, variables de CI, connection strings), (2) ventana de credencial dual (la app acepta la vieja y la nueva durante la transición) o el reinicio secuencial por nodo, (3) rotación en el gestor, (4) verificación por nodo, (5) limpieza de la credencial vieja en todos los lugares, (6) acta con timestamps. Practicarlo en el lab con un Service Principal: fallar aquí duele, fallar en producción duele más.',
          },
          {
            id: 'rm-f23-9',
            label: 'Conceptos Clave',
            text: 'Conocer los estándares de identidad para workloads que vienen fuerte: SPIFFE/SPIRE (identidad criptográfica para workloads: cada POD/proceso con su identidad verificable, sin secretos compartidos), workload identity federation (credencial nativa del cloud A → token de corta vida → rol en cloud B: el patrón que elimina las keys entre clouds) y el principio: la identidad del workload debe ser EFÍMERA y VERIFICABLE como la humana — nunca un password eterno en una variable de entorno.',
          },
          {
            id: 'rm-f23-10',
            label: 'Escenario',
            text: 'Diseñar el INTAKE process de "necesito una cuenta de servicio" (el proceso que evita el desorden del futuro): el formulario que exige TODO antes de crear: dueño (persona, no equipo), propósito y sistema dependiente, permisos mínimos justificados, clasificación de datos que toca, expiración o fecha de revisión, cómo se autentica (gMSA/managed identity/SP+cert/bóveda — jamás password manual), plan de rotación, y el destino en la CMDB. Con la matriz de decisión del tipo de identidad por escenario (app on-prem → gMSA; app en Azure → managed identity; script → bóveda con JIT).',
          },
        ],
      },
      {
        id: 'rm-f29',
        number: 27,
        title: 'Zero Trust & Arquitectura Identity-Centric',
        note: 'El marco que ordena TODO lo anterior en una narrativa de negocio: el roadmap completo de esta app es, en esencia, la columna vertebral identity del modelo Zero Trust. Saber articularlo convierte tus fases en estrategia — el lenguaje de directores y CISOs.',
        items: [
          {
            id: 'rm-f29-1',
            label: 'Conceptos Clave',
            text: 'Dominar los 7 tenets de NIST SP 800-207 con traducción a tu trabajo diario: (1) identidad como fuente de confianza en TODA decisión (no la red), (2) acceso por sesión con mínimo privilegio, (3) decisión dinámica con TODAS las señales disponibles (identidad, dispositivo, contexto, comportamiento), (4) la seguridad del activo ANTES del acceso y DURANTE, (5) monitoreo continuo del posture, (6) autenticación y autorización dinámicas (re-evaluadas, jamás one-and-done), (7) información de threat intel para el policy engine. Y la honestidad profesional: "zero" es una DIRECCIÓN, no un estado que se compra con un producto.',
          },
          {
            id: 'rm-f29-2',
            label: 'Conceptos Clave',
            text: 'Interiorizar la tríada de decisión de cada request: IDENTIDAD (quién: usuario, servicio, workload — y su riesgo), DISPOSITIVO (desde qué: managed/unmanaged, compliant, attestation, TPM), CONTEXTO (dónde/cuándo/cómo: geografía, red, riesgo del momento, comportamiento anómalo). El policy decision point (PDP: tu CA/Ping/ForgeRock policy engine) evalúa las tres señales en CADA request (o en cada re-evaluación con CAE) — no en cada login. Esa es la diferencia técnica entre "SSO con MFA" y "zero trust".',
          },
          {
            id: 'rm-f29-3',
            label: 'Conceptos Clave',
            text: 'Manejar el device trust y su postura: los estados (registered vs. enrolled/managed vs. compliant — la escalera de confianza de Entra), las señales (Intune: compliance policies, BitLocker, EDR corriendo; certificates de dispositivo), la evaluación en la política (CA con device filter/compliance), y el trade-off BYOD: exigir compliance a dispositivos personales (GDPR/control del empleado) vs. acceso limitado (solo browser, sin descarga, con session controls de PDP). La decisión BYOD es política + técnica — saber presentar las dos.',
          },
          {
            id: 'rm-f29-4',
            label: 'Conceptos Clave',
            text: 'Explicar ZTNA vs. VPN (la conversación de arquitectura que todo CIO tiene este año): la VPN da acceso a la RED (plano: confianza por ubicación — dentro/fuera), ZTNA da acceso a la APLICACIÓN por identidad y contexto (plano: cada conexión evaluada, el usuario nunca "entra a la red"), con el tunnel por app en vez de tunnel total, y la decisión de acceso en un broker que ve las tres señales. El impacto para IAM: la identidad se vuelve la front door de TODO (apps internas incluidas) — el workload de políticas del equipo IAM se multiplica y su relevancia también.',
          },
          {
            id: 'rm-f29-5',
            label: 'Conceptos Clave',
            text: 'Ubicar SASE/SSE en el mapa sin perderte: SASE = SD-WAN + la pila de seguridad en el edge (SWG: proxy web con políticas; CASB: visibilidad y control de SaaS; ZTNA: el acceso por app; firewall as a service), SSE = SASE sin la parte de red (lo que compran la mayoría). Dónde encaja IAM: el IdP es la fuente de identidad que ALIMENTA cada uno de esos servicios (SWG con SSO, CASB con OAuth tokens, ZTNA con identidad+device) — y por eso el roadmap identity es prerequisito del roadmap SASE: sin identidad fuerte, SASE es un proxy caro.',
          },
          {
            id: 'rm-f29-6',
            label: 'Práctica',
            text: 'Diseñar la MATRIZ de políticas zero trust (el artefacto que se pide en todos los proyectos ZT): filas = poblaciones (empleado estándar, admin/Tier 0, contractor, partner B2B, dispositivo managed/BYOD/unmanaged), columnas = escenarios (desde red corporativa, desde internet, con dispositivo compliant, sin él, acceso a datos regulados), y cada celda con su decisión (permitir + señales exigidas: MFA fuerte, compliance, IP confiable, session timeout, block, o acceso limitado con controles de sesión). Del lab: 6 filas × 4 columnas completas con las señales EXACTAS.',
          },
          {
            id: 'rm-f29-7',
            label: 'Escenario',
            text: 'Armar el plan de adopción incremental que un CISO aprueba (porque el "big bang" de ZT no existe): Quick wins del trimestre 1 (bloquear legacy auth, MFA fuerte para todos los admins, device compliance para datos sensibles, perillas de sesión), fase 2 (ZTNA piloto para las 5 apps internas más usadas, señales de riesgo en políticas), fase 3 (aplicación a partners/B2B, evaluación continua con CAE, retiro de la VPN para casos generales). Con la métrica de éxito por fase — "el % de accesos evaluados con ≥2 señales" es la que mejor resume el avance.',
          },
          {
            id: 'rm-f29-8',
            label: 'Entrevista',
            text: 'Preparar el pitch de 60 segundos: "Zero Trust es el modelo donde NINGUNA confianza es implícita: cada access request se evalúa con identidad, dispositivo y contexto, y se otorga el mínimo privilegio con expiración. Para IAM eso significa: identidad verificable fuerte (MFA resistente, FIDO2), decisiones centralizadas en el IdP como policy engine (CA), señales de device y riesgo integradas, y el privilegio efímero (PIM/JIT). La red pasó a segundo plano; la identidad ES el control de acceso." — con un ejemplo real de política que ya implementaste en el lab.',
          },
          {
            id: 'rm-f29-9',
            label: 'Evidencia (Exit Criteria)',
            text: 'Publicar el BLUEPRINT zero trust del lab: el diagrama target (identidades + IdP con policies + device trust + ZTNA + apps, con los flujos numerados), la matriz de políticas completa (fase 6), el plan por fases con métricas (fase 7), y el mapeo NIST 800-207 → tus implementaciones concretas (tenet → qué política del lab lo cumple hoy). El blueprint ES la narrativa de negocio del roadmap técnico completo — el documento con el que cierras la entrevista de arquitecto.',
          },
        ],
      },
      {
        id: 'rm-f30',
        number: 28,
        title: 'IAM Disaster Recovery, Break-Glass & Resiliencia',
        note: 'La pregunta que separa operadores de arquitectos: "¿qué pasa si TODO falla un lunes a las 7am?" El IdP es el single point of failure más ignorado de la empresa — y saber responderlo con plan y evidencia es un diferenciador enorme.',
        items: [
          {
            id: 'rm-f30-1',
            label: 'Conceptos Clave',
            text: 'Reconocer el IAM como single point of failure de toda la empresa: si el IdP cae, "no pasa nada"… excepto que NADIE entra a NADA (login, tokens nuevos, y con el tiempo las renovaciones). Los patrones de resiliencia reales: la arquitectura multi-región del proveedor (SaaS: Entra/Okta con failover geográfico — leer su SLA y su historial REAL de caídas), la caché de tokens en clientes (los access tokens viven su vida aunque el IdP sufra — la resiliencia accidental), y los componentes on-prem críticos (AD: multi-DC/multi-sitio, PAM appliance: HA par). El ejercicio incómodo: enumerar qué cae, qué sobrevive y por cuánto tiempo, app por app.',
          },
          {
            id: 'rm-f30-2',
            label: 'Conceptos Clave',
            text: 'Diseñar break-glass con rigor de banco: las cuentas de emergencia (2-3 máximo, jamás el "admin1" del que todos conocen el password) OFFLINE del IdP (autenticación local: password + OTP hardware o FIDO2 sin dependencia de red), la custodia con dual control (credenciales divididas o en bóveda física con dos llaves), el protocolo de activación (quién declara la emergencia: criterios objetivos, quién autoriza, quién ejecuta y registra), el uso monitoreado (alerta SIEM instantánea al login break-glass), y la RESELLADURA post-uso con rotación obligatoria. La cuenta break-glass es la identidad MÁS vigilada de la empresa o no es break-glass: es una puerta trasera.',
          },
          {
            id: 'rm-f30-3',
            label: 'Práctica',
            text: 'Ejecutar el DRILL break-glass completo en el lab (la evidencia que piden los auditores severos): declarar la emergencia simulada (criterio documentado), romper el sello (la alerta dispara), acceder con la cuenta de emergencia al recurso crítico, ejecutar la tarea de emergencia (una acción real del lab), iniciar el reemplazo controlado, y el post-uso: verificación de lo hecho, rotación de la credencial usada, re-sellado con acta firmada y el ticket de incidente con timeline completo. Objetivo medido: <15 minutos del sello al acceso.',
          },
          {
            id: 'rm-f30-4',
            label: 'Conceptos Clave',
            text: 'Manejar el DR del directorio AD sin matar el bosque: los DC son multi-master (la resiliencia NATIVA: multi-DC por sitio + sitios secundarios — el AD bien diseñado sobrevive a perder un sitio), los backups reales (system state del DC, y el backup del objeto que casi nadie hace: la auditoría dice "restaura un usuario" → AD Recycle Bin para objetos, backup del NTDS para el desastre total), y LA trampa prohibida: restaurar un DC desde snapshot de VM (USN rollback — el DC cree cosas del pasado y el bosque sufre). El orden de recuperación Tier 0: DNS → DC (uno) → validación (repadmin /replsummary, dcdiag) → el resto.',
          },
          {
            id: 'rm-f30-5',
            label: 'Escenario',
            text: 'Resolver "Okta/Entra cae 4 horas en plena mañana" — el plan de continuidad completo: qué apps siguen (offline auth: VPN con certificado, apps con token en caché, las legacy con AD directo), qué se congela (accesos NUEVOS: altas, solicitudes, activaciones PIM), cómo opera TI (consola de emergencia del proveedor si existe, cuentas break-glass para acciones críticas), comunicación (plantilla de aviso al negocio: qué funciona, qué no, cuándo se reevalúa), y el postmortem con las métricas: RTO real, apps afectadas, acciones del plan de hardening siguiente (¿deberían más apps tener auth de respaldo?).',
          },
          {
            id: 'rm-f30-6',
            label: 'Conceptos Clave',
            text: 'Detectar y romper las DEPENDENCIAS CIRCULARES del stack IAM (la bomba lógica silenciosa): el IdP que se autentica contra el directorio que protege el acceso al panel del directorio; el helpdesk que necesita el SSO (protegido por el IdP) para gestionar los tickets de bloqueo del IdP; el SIEM que ingeria los logs del IdP via API (autenticada por el IdP). El inventario de dependencias con el test del "¿y si el IdP no está?": cada dependencia marcada como rota-lógica/rota-física/sana, y la remediación (cuenta local de emergencia del helpdesk, credenciales break-glass del SIEM, rutas de autenticación alternativas documentadas).',
          },
          {
            id: 'rm-f30-7',
            label: 'Conceptos Clave',
            text: 'Construir la MATRIZ de DR del programa IAM (la evidencia de resiliencia que pide cualquier auditor serio): filas = componentes (IdP cloud, AD, PAM, IGA, certificado de firma SAML, carpetas GITHUBVAULT de evidencias), columnas = escenario de fallo (proveedor caído, on-prem caído, credencial comprometida, desastres naturales), objetivo RTO/RPO por componente, cómo se PRUEBA cada escenario (drill break-glass semestral, restauración de AD anual, failover del proveedor: leer el historial público), fecha de la ÚLTIMA prueba y su resultado. Una fila sin prueba reciente = un plan de papel.',
          },
          {
            id: 'rm-f30-8',
            label: 'Entrevista',
            text: 'Preparar la respuesta de 90 segundos a "¿qué pasa si tu IdP muere un lunes 7am?": (1) detección y declaración (criterio objetivo del NOC/líder), (2) activación break-glass (cuentas offline, custodia dual, alerta al SIEM), (3) priorización de apps críticas con rutas alternas (caché de tokens, AD directo para lo legacy), (4) comunicación al negocio cada 30 min con estado real, (5) forense del proveedor en paralelo (RCA: ¿nuestro tenant o el proveedor?), (6) restablecimiento con re-autenticación total y rotación de TODO lo tocado, (7) postmortem con hardening. Los 7 pasos de memoria = señorío total del dominio.',
          },
          {
            id: 'rm-f30-9',
            label: 'Evidencia (Exit Criteria)',
            text: 'Publicar el RUNBOOK DR-IAM del lab: inventario de componentes con sus dependencias (la matriz circular del análisis), escenarios de fallo por componente con procedimiento paso a paso, el protocolo break-glass completo (custodia, activación, post-uso), el acta del drill ejecutado con timestamps, y la matriz de DR con la columna de pruebas llena y fechada. Documento listo para imprimir — y la pieza del portafolio que NINGÚN otro candidato junior tendrá.',
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
        number: 29,
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
          {
            id: 'rm-f13-8',
            label: 'Real',
            text: 'Extender el lab con la capa multi-IdP: el dev org de Okta federado con el inquilino Entra del lab (Entra como IdP del hub, Okta federado como secundario — o viceversa con Home Realm Discovery por dominio), demostrar un B2B guest de Entra consumiendo una app del lab, y el diagrama de interoperabilidad IdP-a-IdP con la decisión documentada de quién es el IdP autoritativo y por qué. Esta pieza convierte el lab en el reflejo del landscape real que viste en las fases de plataformas.',
          },
          {
            id: 'rm-f13-9',
            label: 'Real',
            text: 'Automatizar la VERIFICACIÓN del lab: el script "smoke test" IAM que tras cada cambio ejecuta 10 verificaciones (login de prueba ok, grupos correctos por rol, licencias asignadas, estado SCIM de las apps, sesión revocada del usuario de prueba, FIDO2 funciona para el admin, certificados SAML vigentes, PIM activable, break-glass intacta y sellada, backups presentes) y reporta PASS/FAIL por línea. La práctica de QA sobre tu propio entorno es EL diferenciador de seriedad — los cambios dejan de romper el lab silenciosamente.',
          },
          {
            id: 'rm-f13-10',
            label: 'Simulado',
            text: 'Ejecutar la auditoría simulada de TU PROPIO lab actuando como auditor externo: muestrear 5 accesos (¿aprueba alguien distinto del solicitante? ¿hay evidencia firmada?), higiene de cuentas (¿dormidas? ¿PNE sin justificar?), campañas (¿% de respuesta y revocación aplicada?), SoD (¿toxic combinations en memberships reales?), PAM (¿rotación verificable?), y redactar el INFORME formal con hallazgos numerados, severidad, evidencia y plan de acción con fechas. Auto-auditar el lab propio es la preparación perfecta para ambas puntas: hacer y recibir auditorías.',
          },
          {
            id: 'rm-f13-11',
            label: 'Real',
            text: 'Montar el panel ITDR del lab con 3 alertas disparándose en vivo: (1) spray controlado contra el tenant con la detección disparando (4776/SigninLogs), (2) reactivación de la cuenta dormiente con alerta inmediata, (3) MFA fatigue simulada con el number matching bloqueándolo. Cada alerta con su investigación documentada end-to-end (timeline, fuente, conclusión, remediación). El demo final: el SOC ve la identidad comprometida ANTES de que el usuario llame — la narrativa exacta del puesto que buscas.',
          },
          {
            id: 'rm-f13-12',
            label: 'Evidencia (Exit Criteria)',
            text: 'La charla técnica de 30 minutos sobre el lab — el artefacto final: estructura (5 min contexto y arquitectura con diagrama, 15 min demo en vivo de 3 flujos: JML end-to-end, campaña de certificación con revocación, incidente ITDR detectado y respondido, 5 min de 3 lecciones aprendidas con métricas), presentada a público REAL (meetup local, colegas, o grabada y publicada). El lab que nadie vio es un hobby; el lab presentado es un portafolio profesional.',
          },
        ],
      },
      {
        id: 'rm-f14',
        number: 30,
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
          {
            id: 'rm-f14-5',
            label: 'Certificación',
            text: 'Trazar la ruta de certificaciones progresiva con criterio de mercado: SC-300 primero (el filtro HR junior IAM), después las vendor por la vacante objetivo (Okta Certified Professional, SailPoint certifications según el cliente objetivo), el CISSP/CCSP cuando la experiencia legal alcance (los 5 años del CISSP o el associate mientras tanto), y las opcionales de valor real: CompTIA Security+ ya superada conceptualmente por el roadmap. Regla: cada certificación mapeada a 5 vacantes reales que la piden — jamás coleccionar perlas.',
          },
          {
            id: 'rm-f14-6',
            label: 'Perfil Profesional',
            text: 'Blindar el portfolio público para el escaneo de 60 segundos del reclutador: el repo del lab con README impecable (qué ES, qué DEMUESTRA, arquitectura en diagrama, tabla de artefactos con links, demo GIF/capturas), la charla grabada linkeada, el perfil de LinkedIn con la sección Featured apuntando al repo, y las keywords exactas de los JD (IAM, Entra ID, Okta, SailPoint, PAM, SCIM, access reviews, IGA, ITDR) en títulos y descripciones verificables. La prueba de fuego: pídele a alguien que no sabe nada que abra tu perfil y te diga qué eres en 60 segundos.',
          },
          {
            id: 'rm-f14-7',
            label: 'Entrevistas',
            text: 'Compilar y REHECHAR la batería de 20 preguntas de entrevista extraídas de TODO el roadmap (JML, MFA fatigue, AADSTS50011, role model, SoD, PAM checkout, break-glass, consent phishing, cross-account AWS, correlación IGA…): cada una con tu respuesta escrita en estructura, rehechada en voz alta con cronómetro, y la versión de 30 segundos + la de 3 minutos. El repaso de la noche anterior a una entrevista son estas tarjetas — no tutoriales de YouTube.',
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
