/**
 * roadmapData — ROADMAP DEFINITIVO: JUNIOR IAM / IDENTITY SECURITY ANALYST.
 *
 * Especialización Principal: IAM & Identity Governance
 * Ventaja Competitiva: SOC / Blue Team Background
 *
 * Estructura: 3 tiers de prioridad estratégica + proyecto final, 14 fases.
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
  /** Número de fase visible (1-14). */
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

export const ROADMAP_HEADER = {
  title: 'Roadmap: Junior IAM / Identity Security Analyst',
  specialization: 'Especialización Principal: IAM & Identity Governance',
  edge: 'Ventaja Competitiva: SOC / Blue Team Background',
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
        items: [
          {
            id: 'rm-f1-1',
            label: 'Conceptos Clave',
            text: 'Dominar el ciclo JML (Joiner, Mover, Leaver), Birthright Access, Privilege Creep y Deprovisioning.',
          },
          {
            id: 'rm-f1-2',
            label: 'Modelos de Acceso',
            text: 'Diferenciar y aplicar RBAC (Role-Based Access Control) y ABAC (Attribute-Based Access Control), aplicando siempre el principio de Least Privilege.',
          },
          {
            id: 'rm-f1-3',
            label: 'Gobernanza',
            text: 'Comprender la Segregación de Funciones (SoD) y las recertificaciones periódicas (Access Reviews).',
          },
          {
            id: 'rm-f1-4',
            label: 'Entrevista',
            text: 'Explicar cómo detectar y corregir el Privilege Creep cuando un empleado cambia de departamento.',
          },
          {
            id: 'rm-f1-5',
            label: 'Evidencia (Exit Criteria)',
            text: 'SOP-IAM-001-JML-Framework.pdf con matrices de aprobación, diagrama de flujos y controles de evidencia.',
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
            text: 'Estructurar OUs, Users, Security Groups, Group Nesting y aplicar la estrategia AGDLP/AGUDLP.',
          },
          {
            id: 'rm-f2-2',
            label: 'Cuentas y Protocolos',
            text: 'Administrar Service Accounts, gMSA, SPNs. Diferenciar autenticación (Kerberos/LDAP) de autorización. Entender la diferencia entre LastLogon y LastLogonTimestamp.',
          },
          {
            id: 'rm-f2-3',
            label: 'Auditoría de Seguridad',
            text: 'Buscar cuentas durmientes, excesos de privilegios en Domain Admins, y configuraciones Password Never Expires.',
          },
          {
            id: 'rm-f2-4',
            label: 'Entrevista',
            text: 'Explicar qué eventos de Windows (ej. 4728, 4732) revisas si sospechas membresías no autorizadas a grupos críticos.',
          },
          {
            id: 'rm-f2-5',
            label: 'Evidencia (Exit Criteria)',
            text: 'Reporte de auditoría evaluando hallazgos bajo una matriz de riesgo estándar (Likelihood x Impact x Business Impact), excluyendo CVSS.',
          },
        ],
      },
      {
        id: 'rm-f3',
        number: 3,
        title: 'Microsoft Entra ID & Governance',
        items: [
          {
            id: 'rm-f3-1',
            label: 'Identidades Cloud',
            text: 'Configurar Users, Dynamic Groups, Enterprise Applications y Service Principals.',
          },
          {
            id: 'rm-f3-2',
            label: 'Políticas de Acceso',
            text: 'Configurar Conditional Access (MFA, restricciones geográficas, bloqueo de Legacy Auth).',
          },
          {
            id: 'rm-f3-3',
            label: 'Gobernanza Cloud',
            text: 'Implementar Privileged Identity Management (PIM) para Just-In-Time access, Entitlement Management (Access Packages) y campañas de Access Reviews.',
          },
          {
            id: 'rm-f3-4',
            label: 'Entrevista',
            text: 'Explicar la lógica de evaluación de Conditional Access y cómo PIM mitiga la persistencia de cuentas comprometidas.',
          },
          {
            id: 'rm-f3-5',
            label: 'Evidencia (Exit Criteria)',
            text: 'Documentación arquitectónica de políticas de CA, flujos PIM configurados y un reporte de recertificación exportado.',
          },
        ],
      },
      {
        id: 'rm-f4',
        number: 4,
        title: 'Microsoft Graph API para IAM',
        items: [
          {
            id: 'rm-f4-1',
            label: 'Fundamentos REST',
            text: 'GET, POST, PATCH, DELETE, Scopes, JSON payload. Diferenciar Delegated Permissions de Application Permissions.',
          },
          {
            id: 'rm-f4-2',
            label: 'Consultas',
            text: 'Utilizar $filter, $select, $top para extraer usuarios, membresías y asignaciones de roles.',
          },
          {
            id: 'rm-f4-3',
            label: 'Entrevista',
            text: 'Explicar los riesgos de otorgar privilegios excesivos (ej. Directory.ReadWrite.All) a un Service Principal.',
          },
          {
            id: 'rm-f4-4',
            label: 'Evidencia (Exit Criteria)',
            text: 'Construir consultas GET para identificar asignaciones de roles obsoletas y, en un entorno de laboratorio controlado, ejecutar la remediación (ej. DELETE) con los permisos mínimos requeridos, registrando la evidencia.',
          },
        ],
      },
      {
        id: 'rm-f5',
        number: 5,
        title: 'SSO, Federación & SCIM',
        items: [
          {
            id: 'rm-f5-1',
            label: 'Protocolos',
            text: 'Diferenciar estrictamente: SAML (SSO/Federación) vs OAuth 2.0 (Delegación/Autorización) vs OIDC (Autenticación sobre OAuth) vs SCIM (Aprovisionamiento/Ciclo de vida).',
          },
          {
            id: 'rm-f5-2',
            label: 'Troubleshooting',
            text: 'Capturar aserciones SAML, decodificar tokens JWT (Claims, Audience, Expiration) y mapear atributos.',
          },
          {
            id: 'rm-f5-3',
            label: 'Entrevista',
            text: 'Explicar dónde buscar la falla si el SSO SAML funciona pero la cuenta no existe en la aplicación de destino (fallo SCIM/Provisioning).',
          },
          {
            id: 'rm-f5-4',
            label: 'Evidencia (Exit Criteria)',
            text: 'Guía técnica detallando el flujo de autenticación, decodificación de tokens y análisis de payloads SCIM.',
          },
        ],
      },
      {
        id: 'rm-f6',
        number: 6,
        title: 'Automatización IAM & PowerShell',
        items: [
          {
            id: 'rm-f6-1',
            label: 'Evolución',
            text: 'Read-Only → Reporting (CSV/JSON) → Comparación de fuentes → Remediación Controlada.',
          },
          {
            id: 'rm-f6-2',
            label: 'Práctica',
            text: 'Cruzar un CSV de RRHH con el directorio activo (Compare-Object) para detectar cuentas activas de empleados retirados.',
          },
          {
            id: 'rm-f6-3',
            label: 'Entrevista',
            text: 'Explicar la importancia de implementar -WhatIf / -Confirm y mantener logs de auditoría antes de cualquier cambio destructivo.',
          },
          {
            id: 'rm-f6-4',
            label: 'Evidencia (Exit Criteria)',
            text: 'Repositorio de scripts funcionales y modulares para detectar anomalías y generar reportes ejecutivos.',
          },
        ],
      },
      {
        id: 'rm-f7',
        number: 7,
        title: 'Troubleshooting IAM Operations',
        items: [
          {
            id: 'rm-f7-1',
            label: 'Metodología',
            text: 'Dominar la cadena lógica: Identidad → Grupo/Rol → Asignación → Licencia → SCIM → SSO → Conditional Access → Permisos de App.',
          },
          {
            id: 'rm-f7-2',
            label: 'Resolución',
            text: 'Investigar fallos de Conditional Access, errores de firmas SAML y rechazos de esquemas SCIM.',
          },
          {
            id: 'rm-f7-3',
            label: 'Entrevista',
            text: 'Presentar el paso a paso metodológico para diagnosticar por qué un usuario específico no puede acceder a una aplicación web corporativa.',
          },
          {
            id: 'rm-f7-4',
            label: 'Evidencia (Exit Criteria)',
            text: 'Playbooks de resolución para al menos 5 escenarios reales de fallos de identidad y acceso.',
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
        id: 'rm-f8',
        number: 8,
        title: 'Identity Threat Detection and Response (ITDR)',
        note: 'Aquí es donde tu background defensivo aporta todo su valor. Trátalo como la aplicación de tus conocimientos SOC a la infraestructura IAM. (El puente SOC ↔ IAM.)',
        items: [
          {
            id: 'rm-f8-1',
            label: 'Detección',
            text: 'Correlacionar eventos de Sysmon y Sentinel para investigar reactivaciones de cuentas durmientes, Impossible Travel, o Password Spraying.',
          },
          {
            id: 'rm-f8-2',
            label: 'Investigación',
            text: 'Mapear ataques con MITRE ATT&CK: T1078 (Valid Accounts), T1098 (Account Manipulation). Detectar OAuth Consent Abuse y asignaciones anómalas de Service Principals.',
          },
          {
            id: 'rm-f8-3',
            label: 'Entrevista',
            text: 'Explicar cómo aislar y remediar una cuenta de administrador de dominio comprometida sin interrumpir las operaciones críticas.',
          },
          {
            id: 'rm-f8-4',
            label: 'Evidencia (Exit Criteria)',
            text: 'Reportes de investigación de incidentes de identidad incluyendo vector, logs, contención y remediación IAM.',
          },
        ],
      },
      {
        id: 'rm-f9',
        number: 9,
        title: 'Okta Workforce Identity',
        items: [
          {
            id: 'rm-f9-1',
            label: 'Práctica Limitada',
            text: 'Configurar integración SSO y SCIM utilizando cuentas Developer gratuitas.',
          },
          {
            id: 'rm-f9-2',
            label: 'Auditoría',
            text: 'Manejar el Okta System Log para investigar eventos de autenticación y errores de sincronización.',
          },
          {
            id: 'rm-f9-3',
            label: 'Evidencia (Exit Criteria)',
            text: 'Demostración documentada de aprovisionamiento de un usuario, test de SSO y suspensión inmediata auditada mediante logs.',
          },
        ],
      },
      {
        id: 'rm-f10',
        number: 10,
        title: 'Arquitectura IGA (SailPoint / Saviynt)',
        items: [
          {
            id: 'rm-f10-1',
            label: 'Conceptos',
            text: 'Comprender a nivel arquitectónico: HRIS (Authoritative Source) → Identity Cube → Connectors → Entitlements/Roles → Target Systems.',
          },
          {
            id: 'rm-f10-2',
            label: 'Gobernanza',
            text: 'Entender el funcionamiento del Role Mining, flujos de aprobación y campañas de certificación corporativas.',
          },
          {
            id: 'rm-f10-3',
            label: 'Evidencia (Exit Criteria)',
            text: 'Diagramas de arquitectura documentando el flujo de datos y resolución de conflictos (simulado).',
          },
        ],
      },
      {
        id: 'rm-f11',
        number: 11,
        title: 'Privileged Access Management (PAM)',
        items: [
          {
            id: 'rm-f11-1',
            label: 'Conceptos',
            text: 'Credential Vaulting, rotación automática, JIT, Session Monitoring, y Break-Glass Accounts.',
          },
          {
            id: 'rm-f11-2',
            label: 'Evidencia (Exit Criteria)',
            text: 'Procedimiento documentado y matriz de controles para la gestión de cuentas de emergencia y administración de credenciales de servicio críticas.',
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
        number: 12,
        title: 'AWS Identity & Access Management',
        items: [
          {
            id: 'rm-f12-1',
            label: 'Límite Estricto',
            text: 'NO estudiar EC2, VPC, Lambda ni DevOps. El enfoque es 100% IAM.',
          },
          {
            id: 'rm-f12-2',
            label: 'Conceptos',
            text: 'IAM Users, Groups, Roles, Identity-based vs Resource-based policies, AssumeRole (STS), y AWS IAM Identity Center (SSO).',
          },
          {
            id: 'rm-f12-3',
            label: 'Evidencia (Exit Criteria)',
            text: 'Crear una política JSON que aplique el principio de menor privilegio, evaluando si permite o deniega una acción.',
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
        number: 13,
        title: 'Enterprise Identity Security Lab ("InnovateCorp")',
        items: [
          {
            id: 'rm-f13-1',
            label: 'Real',
            text: 'Despliegue de Active Directory local sincronizado o coexistiendo con Microsoft Entra ID. Ejecución de flujos JML con automatización PowerShell/Graph. Integración SSO/SCIM hacia una aplicación de prueba (ej. Slack).',
          },
          {
            id: 'rm-f13-2',
            label: 'Simulado/Documentado',
            text: 'Arquitectura IGA (conectores teóricos), modelo PAM y monitoreo SIEM avanzado (basado en la ingesta manual de logs de eventos específicos para investigación ITDR).',
          },
          {
            id: 'rm-f13-3',
            label: 'Repositorio GitHub',
            text: 'Organiza los artefactos en un repositorio estructurado, idealmente vinculado a GitHub Pages para facilitar la lectura. Documenta cada caso de uso siguiendo la cadena: Scenario → Detection → Investigation → Risk → Decision → Remediation → Evidence.',
          },
        ],
      },
      {
        id: 'rm-f14',
        number: 14,
        title: 'Certificación y Estrategia Laboral',
        items: [
          {
            id: 'rm-f14-1',
            label: 'Certificación',
            text: 'Microsoft SC-300 (Identity and Access Administrator). Estudia para aprobar, pero utiliza los laboratorios de Entra ID como base empírica, no solo la teoría de Microsoft Learn.',
          },
          {
            id: 'rm-f14-2',
            label: 'Perfil Profesional',
            text: 'Posiciónate como Junior IAM / Identity Security Analyst. Cuando destaques el componente SOC, arguméntalo como tu especialidad técnica para detectar y responder a amenazas sobre las identidades y los accesos.',
          },
          {
            id: 'rm-f14-3',
            label: 'Entrevistas',
            text: 'Estructura tus respuestas técnicas aprovechando tu nivel B2 de inglés para articular con fluidez los escenarios de troubleshooting (Identify → Investigate → Remediate).',
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
