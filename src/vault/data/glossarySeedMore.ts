import type { SeedTerm } from './glossarySeedBase';

/**
 * glossarySeedMore — ampliación del seed del glosario (195 términos nuevos).
 *
 * Segundo bloque del seed base (glossarySeedBase.ts): profundiza Entra ID
 * (logs, tenant, PHS/PTA, PIM, CA), Active Directory (estructura, FSMO, SID,
 * hardening), protocolos OAuth 2.0 / OIDC / SAML (flujos, consentimiento,
 * service principals), PAM operativo (bóveda, JIT, ZSP, tiering), cloud IAM
 * (AWS, GCP, Azure RBAC), los Event IDs clave de auditoría de accesos,
 * ITDR/puente con el SOC y conceptos GRC de auditoría y riesgo.
 * Mismas reglas que la base: categorías de la lista maestra (17), sin
 * duplicados contra los 194 términos existentes (validado por script),
 * shortDefinition de una línea, example obligatorio y sin emojis.
 * Nombres propios, protocolos y Event IDs en inglés.
 */

export const GLOSSARY_SEED_MORE_TERMS: SeedTerm[] = [
  /* ---- IAM - IGA ---- */
  {
    id: "seed-more-fuente-autoritativa",
    term: "Fuente autoritativa (authoritative source)",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Sistema de referencia cuyos datos mandan sobre la identidad de una persona.",
    longDefinition: "El sistema que la organización reconoce como fuente de verdad para un atributo o para una población de identidades; el más habitual es el HRIS para empleados. Todo cambio (alta, baja, cambio de cargo) debe partir de ahí y propagarse hacia el IGA y las aplicaciones. Sin una fuente autoritativa clara aparecen cuentas fantasma, atributos contradictorios y hallazgos de auditoría imposibles de justificar.",
    example: "El HRIS Workday marca a un empleado como terminado y al día siguiente el IGA le revoca los accesos; si su correo sigue activo, el analista investiga por qué la fuente autoritativa no se propagó."
  },
  {
    id: "seed-more-hris",
    term: "HRIS (sistema de RR. HH.)",
    acronym: "HRIS",
    category: "IAM - IGA",
    shortDefinition: "Sistema de recursos humanos que alimenta el ciclo de vida de los empleados.",
    longDefinition: "Plataforma como Workday, SAP SuccessFactors o Peoplesoft donde viven los empleados, cargos, ubicaciones y estados laborales. En IAM es típicamente la fuente autoritativa que dispara joiners, movers y leavers hacia el IGA. Un HRIS mal alimentado (jefes vacíos, fechas erróneas) rompe toda la gobernanza posterior, desde las aprobaciones hasta las certificaciones.",
    example: "Un retraso de 3 días del HRIS en registrar una baja provocó que un ex-empleado conservara la VPN; desde entonces el analista revisa cada lunes el delta entre HRIS y AD."
  },
  {
    id: "seed-more-identity-cube",
    term: "Identity Cube",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Vista de una identidad: sus cuentas, sus entitlements y sus relaciones.",
    longDefinition: "Modelo conceptual (típico de SailPoint) que representa a una persona como la intersección de sus cuentas, sus entitlements y las relaciones entre ambos en cada aplicación. Es la unidad de análisis para certificaciones, minería de roles y detección de riesgo de acceso. Cuando el analista pregunta qué tiene realmente esta persona, está pidiendo su identity cube.",
    example: "En una revisión, el cubo de un analista de soporte muestra 3 cuentas de AD, 47 entitlements y 2 cuentas de aplicación huérfanas: el cubo evidencia de un vistazo el exceso."
  },
  {
    id: "seed-more-correlacion-de-identidades",
    term: "Correlación de identidades",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Enlace lógico entre las varias cuentas de una misma persona en distintos sistemas.",
    longDefinition: "Proceso por el que el IGA une las cuentas de diferentes aplicaciones a una sola identidad global, usando atributos comunes (correo, empleadoID) o reglas de coincidencia. Sin correlación, una persona puede aparecer como varias identidades y acumular accesos sin control. El analista la usa para responder certificaciones como una sola persona y para detectar cuentas que nadie reclama.",
    example: "jperez, juan.perez y PEREZJ01 se correlacionan vía empleadoID; al hacerlo, la campaña de certificación muestra al gerente un único bloque con todo el acceso de Juan."
  },
  {
    id: "seed-more-conciliacion-de-cuentas",
    term: "Conciliación de cuentas (account reconciliation)",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Comparación de cuentas existentes contra la fuente de verdad para detectar diferencias.",
    longDefinition: "Ejercicio periódico que cruza las cuentas de cada sistema (AD, bases de datos, SaaS) contra el HRIS o el IGA para encontrar cuentas sin persona asociada, duplicadas o sin dueño. Es la base para limpiar huérfanas y preparar una certificación. Los auditores lo piden casi siempre en ITGC: una cuenta sin conciliar es acceso anónimo.",
    example: "La conciliación mensual de AD encuentra 84 cuentas sin empleadoID válido: 60 son de servicio, 14 de contratistas caducados y 10 se escalan por posible acceso no autorizado."
  },
  {
    id: "seed-more-gobernanza-cuentas-servicio",
    term: "Gobernanza de cuentas de servicio",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Políticas y controles para inventariar, dar dueño y certificar cuentas no humanas.",
    longDefinition: "Disciplina que extiende el ciclo de vida JML a las cuentas de servicio: inventario, dueño declarado, contraseñas rotadas, revisión de uso real y baja al retirar la aplicación. Son las cuentas que más se olvidan porque nadie las reclama en las certificaciones de manager. Un buen programa exige justificación de negocio y re-certificación anual de cada una.",
    example: "En la campaña de certificación de cuentas de servicio, 22 de 130 no tienen dueño en ServiceNow; se abre un ticket para atribuirlas o desactivarlas en 30 días."
  },
  {
    id: "seed-more-descubrimiento-cuentas-privilegiadas",
    term: "Descubrimiento de cuentas privilegiadas",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Escaneo que encuentra cuentas y accesos con privilegies que nadie documentó.",
    longDefinition: "Capacidad de las herramientas de PAM e IGA para escanear directorios, equipos y aplicaciones y detectar cuentas administrativas, miembros de grupos privilegiados y permisos directos (ACL) que nadie había registrado. Es el paso previo a cualquier proyecto de PAM: no se puede proteger lo que no se conoce. El resultado suele ser una lista incómoda que el analista valida con los dueños de sistema.",
    example: "El discovery de la herramienta de PAM encuentra 310 administradores locales en 180 servidores; 97 de esas cuentas locales comparten la misma clave y entran al plan de remediación."
  },
  {
    id: "seed-more-conector-de-iga",
    term: "Conector de IGA",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Integración que conecta el IGA con cada aplicación para leer y escribir accesos.",
    longDefinition: "Componente (agente, API o SCIM) que permite al IGA leer identidades y entitlements de un sistema y ejecutar altas, cambios y bajas. Cada aplicación se integra con conectores estándar (AD, Entra, SAP) o a medida (REST, JDBC, ficheros planos). La salud del conector es responsabilidad diaria del equipo IAM: si falla, se acumula drift entre lo aprobado y lo real.",
    example: "El conector de ServiceNow marca error de conexión dos días seguidos; el analista detecta el token de API vencido y replantea la cola de aprovisionamiento pendiente."
  },
  {
    id: "seed-more-identity-fabric",
    term: "Identity Fabric",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Capa de servicios de identidad que teje directorios, IGA y control de acceso.",
    longDefinition: "Arquitectura de referencia que abstrae directorios, IGA, MFA y autorización en una capa común, con orquestación entre herramientas dispares en lugar de una plataforma única. Importa porque la mayoría de empresas tiene identidades repartidas en 5 a 15 herramientas que necesitan cooperar. Para el analista junior, entender el fabric ayuda a ubicar su herramienta concreta dentro del panorama.",
    example: "La orquestación del fabric traduce un cambio de cargo del HRIS a rol de Okta, grupo de AD y licencia de M365 sin scripts manuales por sistema."
  },
  {
    id: "seed-more-catalogo-de-entitlements",
    term: "Catálogo de entitlements",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Listado estructurado de permisos por aplicación, con dueño y descripción.",
    longDefinition: "Inventario normalizado de los permisos (roles, grupos, permisos SAP) de cada aplicación, con descripción, riesgo, dueño y reglas de solicitud. Es lo que hace posible pedir, aprobar y certificar acceso de forma inteligente en lugar de mostrar grupos crípticos como GRP_FIN_01. Sin catálogo, las campañas presentan nombres que los aprobadores no entienden y firman sin revisar.",
    example: "El catálogo renombra DL-FIN-Q a SAP FI: acceso a contabilidad, añade descripción y riesgo; la tasa de revocación en la campaña sube porque los gerentes entienden qué aprueban."
  },
  {
    id: "seed-more-acceso-solicitable",
    term: "Acceso solicitable (requestable access)",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Acceso publicado para petición self-service en el catálogo del IGA.",
    longDefinition: "Entitlements que se publican para que cualquier empleado pueda solicitarlos (con justificación y aprobación) en lugar de asignarse de forma automática al nacer. Publicar el acceso correcto reduce tickets al service desk y desvía el acceso informal por atajos. El analista vigila que lo solicitable no incluya permisos de alto riesgo que exigen otro circuito.",
    example: "Se publica acceso de lectura a Jira como solicitable con aprobación del dueño; los tickets de dame acceso a Jira bajan de 20 a 2 por semana."
  },
  {
    id: "seed-more-campana-de-certificacion",
    term: "Campaña de certificación",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Ejecución programada de revisiones de acceso con fases, plazos y revocación.",
    longDefinition: "Evento periódico en el IGA que distribuye revisiones de acceso a certificadores (manager, dueño de aplicación o dueño de rol) con calendario, recordatorios y escalados automáticos. Lo que no se certifica dentro del plazo puede derivarse a un superior o revocarse por omisión. El analista IAM la opera: prepara la población, vigila el avance y ejecuta las revocaciones al cierre.",
    example: "Campaña trimestral de entitlements críticos: 68% completado a falta de 5 días; el analista escala los 40 revisores rezagados y al cierre revoca en masa 310 accesos marcados como no requerido."
  },
  {
    id: "seed-more-analitica-de-identidades",
    term: "Analítica de identidades",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Análisis de datos de acceso (outliers, patrones, riesgo) para decidir gobernanza.",
    longDefinition: "Aplicación de analítica a los datos de identidades y accesos: detección de outliers, acumulación de privilegios, agrupamiento de permisos similares o riesgo por combinaciones tóxicas. Convierte certificaciones manuales en decisiones guiadas por evidencia. Para el junior es la diferencia entre listar 300 filas y señalar las 12 que realmente importan.",
    example: "La analítica marca que el 5% de usuarios de contabilidad tiene el mismo acceso que el CFO; el analista lo presenta como hallazgo de acceso acumulado por similitud de rol."
  },
  {
    id: "seed-more-verificacion-de-identidad",
    term: "Verificación de identidad (identity proofing)",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Comprobación de que una persona es quien dice ser antes de emitir credenciales.",
    longDefinition: "Proceso (presencial, documental o biométrico) con el que se valida la identidad real de alguien antes de crear su cuenta digital, sobre todo en altas remotas y servicios al ciudadano. NIST SP 800-63 lo formaliza en los niveles IAL. Su debilidad es el vector de fraude de altas falsas: sin proofing, cualquiera puede nacer como identidad digital fraudulenta.",
    example: "Antes de dar VPN a un contratista remoto, RR. HH. exige videollamada y documento verificado; sin ese paso, una vez se aprovisionó a un empleado que resultó ser fraude."
  },
  {
    id: "seed-more-identidades-no-humanas",
    term: "Identidades no humanas (NHI)",
    acronym: "NHI",
    category: "IAM - IGA",
    shortDefinition: "Cuentas de máquinas, servicios, apps y bots: ya superan a las humanas.",
    longDefinition: "Service accounts, cuentas de servicio cloud, apps registradas, secretos, certificados y robots de RPA: identidades sin persona detrás. Hoy son más numerosas que las humanas y suelen quedar fuera del JML y del MFA, con credenciales eternas. Gestionarlas exige inventario, dueño, rotación y cero interacción humana cuando sea posible. El junior las encontrará en la mayoría de hallazgos raros de auditoría.",
    example: "Un reporte de Microsoft Graph lista 1.400 apps registradas en el tenant; 300 no firman desde hace 90 días y tienen permisos de correo: candidatas a limpieza en la siguiente revisión."
  },
  {
    id: "seed-more-postura-de-identidad",
    term: "Postura de identidad (identity posture)",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Estado de seguridad agregado de las identidades frente a brechas de configuración.",
    longDefinition: "Evaluación continua de la exposición de la organización en materia de identidad: MFA real (no solo registrado), cuentas sin dueño, acceso permanente, apps de riesgo consentidas o herencia de grupos peligrosa. Las herramientas ITDR la expresan como una puntuación. Para el junior es el informe que traduce su trabajo diario (reviews, PAM, limpieza) a métricas para dirección.",
    example: "El panel de postura marca 62% por admins sin MFA resistente y 1.900 cuentas inactivas; el plan trimestral del equipo IAM prioriza esas dos brechas."
  },
  {
    id: "seed-more-dueno-de-rol",
    term: "Dueño de rol (role owner)",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Responsable del diseño y del contenido de un rol de acceso en el IGA.",
    longDefinition: "Persona (normalmente de negocio o dueño de aplicación) que define qué entitlements componen un rol, aprueba sus cambios y responde en las certificaciones de rol. Sin dueño de rol, los roles se corrompen con el tiempo y nadie decide qué sacar. El analista IAM lo identifica, lo registra en la herramienta y presiona para que mantenga el rol vigente.",
    example: "El rol Contabilidad AP acumuló 12 permisos de más en 2 años; el dueño de rol asignado lo depura a 9 y firma la nueva definición en el IGA."
  },
  {
    id: "seed-more-dueno-de-aplicacion",
    term: "Dueño de aplicación (application owner)",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Responsable de negocio o TI que responde por los accesos a una aplicación.",
    longDefinition: "Autoridad que decide quién puede acceder a una aplicación, aprueba accesos y firma las certificaciones de sus entitlements. Es la figura que el IGA necesita por aplicación para que las campañas tengan destinatario válido. Localizarlo suele ser la mitad del trabajo: si nadie es dueño, nadie revoca.",
    example: "Para la app legacy de nómina nadie recuerda quién manda; el analista mapea al líder de RR. HH., lo registra como owner en ServiceNow y lo incluye en la próxima campaña."
  },
  {
    id: "seed-more-principio-cuatro-ojos",
    term: "Principio de cuatro ojos (four-eyes)",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Control que exige dos personas distintas para aprobar o ejecutar una acción.",
    longDefinition: "Regla por la que una acción sensible requiere la intervención de dos personas (aprobación y ejecución, o dos aprobaciones) para reducir fraude interno y errores. En IAM se materializa como doble aprobación de accesos críticos o separación entre solicitante y aprobador. Es la respuesta típica cuando una SoD no se puede separar de forma técnica.",
    example: "La creación de cuentas admin de firewall exige aprobación del líder de redes además del propio solicitante: nadie puede aprovisionarse privilegio a sí mismo."
  },
  {
    id: "seed-more-onboarding-app-iga",
    term: "Incorporación de aplicaciones al IGA (app onboarding)",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Proyecto de conectar una app al gobierno: conector, catálogo y certificaciones.",
    longDefinition: "Metodología con la que se integra una nueva aplicación al gobierno: configurar el conector, descubrir cuentas y entitlements, asignar dueño, publicar el catálogo e incluirla en campañas. Es la tarea de proyecto más frecuente del analista IAM junior y la que más visibilidad da. Un onboarding mediocre, con entitlements gigantes y sin dueño, contamina años de certificaciones.",
    example: "Se incorpora Jira en 3 semanas: conector SCIM, 40 permisos agrupados en 12 entitlements con descripción y el owner de TI designado como aprobador."
  },
  {
    id: "seed-more-mapeo-de-atributos",
    term: "Mapeo de atributos (attribute mapping)",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Correspondencia de los campos de identidad entre sistemas conectados.",
    longDefinition: "Tabla de traducción de atributos entre la fuente (HRIS, directorio) y cada destino: givenName hacia firstName, empleadoID hacia employeeId, país hacia ubicación. Incluye transformaciones (formatos de fecha, mayúsculas) y valores por defecto. Un mapeo mal hecho produce cuentas incompletas y reglas que no aplican: si el país llega vacío, la política por ubicación se salta.",
    example: "Tras desplegar una política por país, el 30% de inicios de sesión no la evalúa porque department llega nulo desde el HRIS; se corrige el mapeo y se añade valor por defecto."
  },
  {
    id: "seed-more-higiene-de-grupos",
    term: "Higiene de grupos de AD",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Mantenimiento de grupos: miembros válidos, dueño, uso y limpieza de duplicados.",
    longDefinition: "Conjunto de prácticas para mantener sanos los grupos de AD: dueño declarado, descripción, revisión de miembros, eliminación de duplicados y de grupos vacíos o caducados. Los grupos son el vehículo del 80% del acceso y a la vez lo que nunca se limpia: aprobado en 2017 y nadie sabe para qué. El analista los audita por antigüedad, tamaño y solapamiento.",
    example: "Un barrido encuentra 3 grupos distintos que otorgan el mismo permiso de SAP y 120 grupos vacíos; se consolidan y se pide la baja de los vacíos con evidencia en el ticket."
  },
  {
    id: "seed-more-gestion-de-licencias",
    term: "Gestión de licencias (SKU)",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Control de SKUs y licencias por usuario para coste y cumplimiento contractual.",
    longDefinition: "Disciplina que asegura que cada usuario tiene la SKU correcta (M365 E3 o E5, Entra P2, módulos de IGA) y que las licencias se recuperan en las bajas. En IAM une coste y control: una licencia mal asignada es dinero perdido y una licencia heredada en una cuenta dormante es riesgo. El analista junior suele heredar el reporte mensual de licencias huérfanas.",
    example: "Al cerrar el trimestre se detectan 87 licencias E5 asignadas a cuentas inactivas; se recuperan y financian las 60 nuevas contrataciones sin comprar más."
  },
  {
    id: "seed-more-grupos-dinamicos-vs-asignados",
    term: "Grupos dinámicos vs. asignados",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Grupo con miembros calculados por reglas frente a miembros fijados a mano.",
    longDefinition: "Un grupo dinámico de Entra llena sus miembros automáticamente a partir de atributos del usuario (department igual a Finanzas), mientras que el asignado se llena manualmente. Los dinámicos escalan bien pero exigen atributos limpios en la fuente; los asignados son el patrón clásico de drift y de acceso acumulado. Decidir qué se auto-regula y qué se gobierna a mano es decisión de diseño IAM.",
    example: "El grupo dinámico Todos-Ventas se vació solo cuando el HRIS cambió el atributo de los 14 comerciales trasladados; en el grupo asignado equivalente, 11 de esos accesos habrían sobrevivido."
  },
  {
    id: "seed-more-calidad-datos-identidad",
    term: "Calidad de datos de identidad",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Exactitud y completitud de los atributos que alimentan el gobierno de accesos.",
    longDefinition: "Grado en que los atributos de identidad (jefe, cargo, departamento, ubicación, empleadoID) son correctos y están completos en las fuentes. Toda la automatización IAM depende de ellos: aprobaciones a jefes equivocados, certificaciones sin destinatario o grupos dinámicos rotos. El primer mes de un junior suele consistir en medir y reparar la calidad de los datos.",
    example: "El 6% de usuarios no tiene manager en AD, así que 240 certificaciones no tienen a quién enviarse; se corrigen desde el HRIS y la campaña se relanza."
  },
  {
    id: "seed-more-atributos-de-identidad",
    term: "Atributos de identidad",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Campos que describen a una identidad y alimentan reglas y políticas de acceso.",
    longDefinition: "Propiedades de la cuenta o identidad: nombre, correo, empleadoID, cargo, departamento, ubicación, tipo de empleado y estado. Son el combustible del aprovisionamiento, los grupos dinámicos, el acceso condicional y las certificaciones. El analista debe conocer el esquema de atributos de cada fuente y qué es obligatorio para cada caso de uso.",
    example: "Para habilitar una directiva de acceso condicional por país, se audita que country esté poblado en el 100% de los usuarios sincronizados antes de activarla."
  },
  {
    id: "seed-more-roles-administrador-entra",
    term: "Roles de administrador de Entra ID",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Permisos administrativos nativos del tenant: Global Admin, User Admin y decenas más.",
    longDefinition: "Catálogo de roles con permisos sobre el tenant de Entra: Global Administrator, User Administrator, Exchange Administrator y decenas más, además de roles personalizados de directorio. Son distintos de los roles de Azure RBAC, que gobiernan las suscripciones, y confundir ambos es el error de entrevista más clásico. El principio: asignar el rol de menor privilegio y elevar con PIM.",
    example: "Al auditar el tenant se encuentran 14 Global Admins; el proyecto los reduce a 4 y migra al resto a roles específicos con activación PIM de 8 horas."
  },
  {
    id: "seed-more-registros-de-provisioning",
    term: "Registros de aprovisionamiento (provisioning logs)",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Log de Entra que detalla cada acción de aprovisionamiento y su resultado.",
    longDefinition: "Entrada de diagnóstico del servicio de aprovisionamiento de Microsoft Entra que muestra qué cambio se intentó (crear, actualizar, deshabilitar) sobre qué usuario y aplicación, con resultado y causa del error. Es la primera parada cuando alguien dice que no recibe acceso. El analista aprende a leer los cycle IDs y los mensajes de fallo de las reglas de mapeo.",
    example: "Un usuario se queja de no tener la app de gastos; el provisioning log muestra Skipped: attribute department is null y se corrige el valor en el HRIS."
  },
  {
    id: "seed-more-sap-grc",
    term: "Gestión de accesos en SAP (SAP GRC)",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Suite de gobierno de accesos SAP: roles, SoD y cuentas firefighter.",
    longDefinition: "Plataforma que gestiona el ciclo de vida de accesos en SAP: análisis de riesgo SoD entre roles, provisión por solicitud, cuentas firefighter de emergencia y firma para auditores. SAP es crítica en finanzas y su modelo de roles es de los más complejos; gran parte de los puestos IAM en empresas grandes giran en torno a SAP GRC. El junior que sepa leer conflictos SoD de SAP vale oro.",
    example: "Una solicitud crea el conflicto alta de proveedores más liberación de pagos; SAP GRC lo bloquea y ofrece compensación documentada, que el auditor exige firmada por el CFO."
  },
  {
    id: "seed-more-scp-aws",
    term: "SCP (Service Control Policies)",
    acronym: "SCP",
    category: "IAM - IGA",
    shortDefinition: "Política de AWS Organizations que acota los permisos máximos de las cuentas.",
    longDefinition: "Guardrails de AWS Organizations que limitan qué acciones pueden realizar los usuarios y roles de las cuentas miembro, incluso si su política lo permite. Se usa para imponer límites globales como prohibir buckets públicos o regiones no aprobadas. Importa porque es jerárquico: una SCP restrictiva gana a cualquier permiso otorgado, y el equipo IAM la usa como frontera de gobernanza cloud.",
    example: "La SCP del landing zone bloquea s3:PutBucketPolicy con acceso público: el desarrollador con permisos IAM casi totales no puede saltarse la regla de seguridad."
  },
  {
    id: "seed-more-dominio-de-ad",
    term: "Dominio de AD",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Unidad de administración y autenticación dentro de Active Directory.",
    longDefinition: "Borde de seguridad y de replicación de AD: define usuarios, grupos, equipos y políticas (GPO) sobre una base de datos común. Todos los dominios del bosque comparten esquema y configuración. Para IAM es donde viven las cuentas que la mayoría gobierna: un analista opera a diario sobre uno o varios dominios de su empresa.",
    example: "La empresa tiene dos dominios (CORP y LAB) con requisitos distintos de contraseña; el analista lo documenta en la matriz de dominios antes de unificar políticas."
  },
  {
    id: "seed-more-bosque-de-ad",
    term: "Bosque de AD (forest)",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Conjunto de dominios que comparten esquema, catálogo global y confianza.",
    longDefinition: "Contenedor superior de AD: uno o más árboles de dominios con esquema común, catálogo global y confianzas transitivas internas. Las empresas fusionadas suelen tener varios bosques con confianzas entre ellos, y eso duplica el trabajo de gobierno: una persona puede tener cuentas en cada bosque. Las migraciones entre bosques son proyectos enteros de IAM.",
    example: "Tras una fusión hay 2 bosques con confianza unidireccional; el equipo implementa correlación de identidades para que las bajas se propaguen a los dos."
  },
  {
    id: "seed-more-catalogo-global",
    term: "Catálogo global (Global Catalog)",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Índice parcial de todos los objetos del bosque para búsquedas entre dominios.",
    longDefinition: "Servidor AD que almacena un subconjunto de atributos de todos los objetos del bosque para responder consultas de cualquier dominio sin referirlas. Las aplicaciones que buscan usuarios entre dominios dependen de él. Si el catálogo global no replica un atributo, como el empleadoID, las búsquedas de las apps fallan y el analista pierde horas hasta descubrirlo.",
    example: "El portal de RR. HH. busca usuarios por employeeID en el catálogo global y no los encuentra: el atributo no está en el GC; se añade al esquema parcial."
  },
  {
    id: "seed-more-roles-fsmo",
    term: "Roles FSMO",
    acronym: "FSMO",
    category: "IAM - IGA",
    shortDefinition: "Cinco roles únicos de AD: Schema, Domain Naming, PDC, RID e Infraestructura.",
    longDefinition: "Maestros de operaciones únicos del bosque o del dominio: Schema Master y Domain Naming Master a nivel de bosque, y PDC Emulator, RID Master e Infrastructure Master por dominio. Cada rol vive en un solo DC y su dueño caído rompe funciones críticas como los cambios de contraseña o la asignación de RID. El analista debe verificar quién los tiene con netdom query fsmo.",
    example: "Nadie podía cambiar contraseñas: el PDC Emulator estaba en un DC apagado; se transfiere el rol FSMO y el SSPR vuelve a sincronizar."
  },
  {
    id: "seed-more-controlador-de-dominio",
    term: "Controlador de dominio (DC)",
    acronym: "DC",
    category: "IAM - IGA",
    shortDefinition: "Servidor que autentica, almacena y replica la base de datos de AD.",
    longDefinition: "Servidor que aloja la base NTDS.DIT con todos los objetos del dominio, procesa Kerberos y NTLM, y replica cambios con otros DC. Son el activo más sensible de la red: quien controla un DC controla el dominio. Por eso su endurecimiento, la vigilancia de replicaciones anómalas (DCSync) y su aislamiento en Tier 0 son el pan del analista IAM.",
    example: "El informe mensual lista 12 DC con versiones de SO distintas; 3 aún aceptan NTLMv1 y entran en el plan de endurecimiento del trimestre."
  },
  {
    id: "seed-more-rodc",
    term: "RODC (controlador de dominio de solo lectura)",
    acronym: "RODC",
    category: "IAM - IGA",
    shortDefinition: "Controlador de dominio de solo lectura pensado para sucursales.",
    longDefinition: "Read-Only Domain Controller: DC que replica solo lectura y filtra qué contraseñas cachea, diseñado para sucursales con seguridad física débil. Las escrituras se remiten a un DC grabable y las credenciales que guarda en caché son configurables. Si lo roban, el daño es menor, pero el analista debe vigilar qué contraseñas se permitió cachear.",
    example: "La sucursal de Asia solo tiene un RODC con caché de contraseñas deshabilitado; los usuarios se autentican vía WAN contra el DC central."
  },
  {
    id: "seed-more-replicacion-de-ad",
    term: "Replicación de AD",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Sincronización automática de los cambios entre controladores de dominio.",
    longDefinition: "Mecanismo por el que los DC intercambian actualizaciones del directorio: rápido dentro del sitio y programado por horarios entre sitios. Si se rompe aparecen divergencias: un usuario deshabilitado en un DC sigue activo en otro. El analista mide su salud con repadmin /replsummary y lo documenta en auditorías de consistencia de cuentas.",
    example: "repadmin /replsummary muestra 45 errores contra el DC de la sede secundaria; la baja de un contratista no llegó y su cuenta siguió viva 2 días en ese sitio."
  },
  {
    id: "seed-more-sysvol",
    term: "SYSVOL",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Carpeta compartida de AD donde viven las GPO y los scripts de inicio.",
    longDefinition: "Directorio replicado por FRS o DFSR entre los DC que contiene las plantillas de GPO y los scripts de login. La versión de una GPO en SYSVOL puede divergir de la de la base AD y eso rompe políticas. Alterar SYSVOL es además una táctica clásica de persistencia, por lo que su monitoreo entra en las listas de endurecimiento.",
    example: "Una GPO aparece como aplicada en el reporte pero no surte efecto: la versión en SYSVOL quedó desactualizada y se fuerza la restauración desde el DC maestro."
  },
  {
    id: "seed-more-gpo",
    term: "GPO (Directiva de grupo)",
    acronym: "GPO",
    category: "IAM - IGA",
    shortDefinition: "Colección de ajustes que AD impone a usuarios y equipos de su alcance.",
    longDefinition: "Directiva de grupo: configuración (contraseñas, firewall, restricciones, software) que AD aplica a equipos y usuarios enlazada a sitios, dominios u OUs, procesándose en orden LSDOU. Para IAM es la palanca de política técnica: longitud de contraseña, bloqueo de interactive logon o deshabilitar el hash LM se controlan por GPO. Cambiar una GPO sin prueba en una OU piloto es el error clásico.",
    example: "La GPO Default Domain Policy exige 14 caracteres y bloqueo a 5 intentos; al subir a 16, el analista valida primero el gpresult de un equipo piloto."
  },
  {
    id: "seed-more-agdlp",
    term: "AGDLP (anidamiento de grupos)",
    acronym: "AGDLP",
    category: "IAM - IGA",
    shortDefinition: "Patrón clásico de AD: cuentas en globales, globales en locales, permiso al local.",
    longDefinition: "Estrategia de AD: Accounts en grupos Global, los Global en Domain Local, y el permiso del recurso concedido al Domain Local. Escala la administración de permisos a miles de usuarios con un solo punto de cambio. El anidamiento descontrolado, con grupos dentro de grupos sin patrón, es el destructor de auditorías: hay que mantener profundidad y patrón auditables.",
    example: "El acceso a una carpeta se otorga al grupo local DL-FIN-AP; dentro, el global G-FIN-Europe con 210 usuarios de 5 países: un cambio reorganiza 210 accesos de golpe."
  },
  {
    id: "seed-more-ambitos-de-grupo",
    term: "Ámbitos de grupo (Domain Local / Global / Universal)",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Alcance de un grupo de AD: local de dominio, global o universal.",
    longDefinition: "El ámbito define desde dónde se puede usar el grupo y qué puede contener: Global agrupa usuarios de un dominio y se usa en todo el bosque; Domain Local otorga permisos en su dominio y puede contener grupos de otros; Universal vive en el catálogo global y es multi-dominio. Elegir mal el ámbito rompe accesos tras migraciones o genera tráfico de replicación innecesario.",
    example: "Tras migrar usuarios entre dominios, un grupo Global quedó con miembros del otro dominio, algo no permitido; se convierte a Universal y el acceso se restaura."
  },
  {
    id: "seed-more-sid",
    term: "SID (Security Identifier)",
    acronym: "SID",
    category: "IAM - IGA",
    shortDefinition: "Identificador único y permanente de cuentas, grupos y equipos en AD.",
    longDefinition: "Valor único que AD asigna a cada objeto de seguridad; los permisos se graban contra el SID y no contra el nombre. Por eso renombrar un usuario no rompe nada, pero borrar y recrear la cuenta sí: cambia el SID y se pierde todo el acceso. El analista lee SIDs a diario en auditorías, Event IDs y ACLs.",
    example: "En el evento 4728 aparece S-1-5-21-…; se resuelve con PowerShell para saber qué usuario exacto se añadió al grupo privilegiado."
  },
  {
    id: "seed-more-rid",
    term: "RID (Relative Identifier)",
    acronym: "RID",
    category: "IAM - IGA",
    shortDefinition: "Porción secuencial del SID que distingue a cada objeto dentro de su dominio.",
    longDefinition: "Número que el RID Master asigna a cada objeto y que se concatena al SID del dominio para formar el SID final. El pool de RID es finito y agotarlo paraliza la creación de cuentas. Los auditores lo citan al analizar cuentas célebres, como el RID 500 del Administrator integrado, en eventos de cuentas administrativas.",
    example: "Un script descuidado crea 50.000 cuentas de prueba y consume el pool RID; el RID Master entrega uno nuevo y el analista documenta el incidente."
  },
  {
    id: "seed-more-sid-history",
    term: "SID History",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Atributo que conserva SIDs anteriores de la cuenta tras migraciones de dominio.",
    longDefinition: "Mecanismo de migración que permite a una cuenta cargar los SIDs de su cuenta antigua y así conservar el acceso a recursos que apuntaban al dominio previo. Es cómodo en migraciones, pero un riesgo si queda sucio o si un atacante lo abusa inyectando SIDs de administrador (escalada tipo Golden PAC). El analista lo audita como fuente de acceso fantasma.",
    example: "La auditoría encuentra 700 cuentas con SID History del dominio pre-fusión; 190 ya no lo necesitan y se limpian con Set-ADUser y el parámetro de eliminación."
  },
  {
    id: "seed-more-papelera-reciclaje-ad",
    term: "Papelera de reciclaje de AD",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Función de AD para recuperar objetos borrados junto con sus atributos.",
    longDefinition: "Característica (nivel funcional 2008 R2 o superior) que guarda los objetos eliminados, y con el recycle bin activo también sus membresías, para restaurarlos sin acudir a un backup de sistema. Es la diferencia entre recuperar en 10 minutos un grupo crítico borrado por error o vivir una restauración completa. El analista la activa y la prueba antes de necesitarla.",
    example: "Borran por error el grupo que da acceso al ERP; con Get-ADObject -IncludeDeletedObjects se restaura en minutos y el paso queda en el runbook."
  },
  {
    id: "seed-more-fgpp",
    term: "FGPP (directivas de contraseña de grano fino)",
    acronym: "FGPP",
    category: "IAM - IGA",
    shortDefinition: "Reglas de contraseña distintas por grupo dentro de un mismo dominio.",
    longDefinition: "Fine-Grained Password Policies: permiten aplicar requisitos de contraseña diferentes según el grupo, por ejemplo 20 caracteres y bloqueo agresivo para administradores. Antes de FGPP solo existía una política por dominio. El analista la usa para endurecer cuentas privilegiadas sin castigar a toda la población.",
    example: "Se crea una PSO de 20 caracteres sin expiración para el grupo de admins privilegiados, mientras el resto de usuarios mantiene 12 caracteres con rotación anual."
  },
  {
    id: "seed-more-token-bloat",
    term: "Token bloat",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Sobredimensionamiento del token de acceso por exceso de grupos del usuario.",
    longDefinition: "Cuando un usuario pertenece a demasiados grupos, sobre todo con anidamiento y SID History, su token de acceso Kerberos crece hasta romper los límites del protocolo y los inicios de sesión fallan de forma intermitente. Se diagnostica inspeccionando el tamaño del token y se corrige depurando el anidamiento. El analista lo encuentra cuando el usuario entra a veces sí y a veces no.",
    example: "Un técnico de soporte pertenece a 900 grupos por anidamiento histórico; su sesión contra SQL falla aleatoriamente hasta que se depuran los grupos obsoletos."
  },
  {
    id: "seed-more-distinguished-name",
    term: "Distinguished Name (DN)",
    acronym: "DN",
    category: "IAM - IGA",
    shortDefinition: "Ruta completa y única de un objeto dentro del árbol LDAP o AD.",
    longDefinition: "Dirección jerárquica de un objeto, como CN=Juan Perez,OU=Ventas,DC=corp,DC=local. Es la referencia canónica para los bindings LDAP y para configuraciones de sincronización, como la OU de origen de Entra Connect. Distinguir DN de UPN o de samAccountName es básico para operar directorios; se lee de derecha (raíz) a izquierda (hoja).",
    example: "El conector de sincronización se limita a OU=Empleados,DC=corp: solo lo que cuelga de ese DN se sincroniza hacia el tenant de Entra."
  },
  {
    id: "seed-more-spn",
    term: "SPN (Service Principal Name)",
    acronym: "SPN",
    category: "IAM - IGA",
    shortDefinition: "Nombre único registrado en AD que asocia cada servicio con su cuenta.",
    longDefinition: "Identificador con formato clase/host:puerto que Kerberos usa para localizar la clave de un servicio y que se registra en la cuenta que lo ejecuta. Los SPNs duplicados rompen Kerberos, y los SPNs de cuentas con contraseña débil son el objetivo directo del Kerberoasting. El junior los audita con setspn -X.",
    example: "setspn -L svc-web01 muestra 6 SPNs en la cuenta; dos están duplicados con otra cuenta y provocan fallos intermitentes de autenticación."
  },
  {
    id: "seed-more-herramientas-diagnostico-ad",
    term: "Herramientas de diagnóstico de AD (DCDiag, Repadmin)",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Utilidades de línea de comandos para la salud del directorio.",
    longDefinition: "Kit clásico del administrador y del analista: dcdiag valida la salud de los DC, repadmin inspecciona la replicación, nltest verifica confianzas y ubicación de DC, y dsquery con dsget busca objetos. Se usan para aportar evidencia técnica en hallazgos, por ejemplo una replicación rota que dejó una cuenta viva. Junto a PowerShell moderno siguen siendo la respuesta rápida.",
    example: "Ante un password que no cuadra en un sitio, se ejecutan nltest /dsgetdc y repadmin /showrepl: la replicación del DC local llevaba 9 horas parada."
  },
  {
    id: "seed-more-escritura-diferida",
    term: "Escritura diferida (writeback)",
    acronym: undefined,
    category: "IAM - IGA",
    shortDefinition: "Flujo inverso desde Entra hacia AD: contraseñas, dispositivos o grupos.",
    longDefinition: "Capacidad de Entra Connect de escribir de vuelta en el AD local: password writeback (que el SSPR cambie la clave en AD), group writeback o device writeback. Permite escenarios híbridos sin romper la autoridad del directorio on-prem. El analista la configura y la vigila porque afecta a la sincronización y a los ciclos de contraseña.",
    example: "Un usuario híbrido restablece su contraseña desde el portal SSPR y al día siguiente entra también en el PC del dominio: el password writeback funcionó."
  },

  /* ---- IAM - Access Management ---- */
  {
    id: "seed-more-ciam",
    term: "CIAM (Customer IAM)",
    acronym: "CIAM",
    category: "IAM - Access Management",
    shortDefinition: "IAM orientado a clientes: registro, login y consentimiento de millones externos.",
    longDefinition: "Customer IAM: disciplina y plataformas (Okta CIC con Auth0, Entra External ID) para autenticar a clientes finales con escala, marca propia, login social y consentimientos de privacidad. Las prioridades son distintas de las del workforce: conversión del registro, fricción mínima y RGPD, más que SoD. El junior debe distinguir ambos mundos porque las herramientas y las métricas no son intercambiables.",
    example: "La nueva app de banca pide CIAM: 2 millones de clientes, login con Google y Apple y consentimiento por región; se evalúa Auth0 frente a Entra External ID."
  },
  {
    id: "seed-more-access-panel",
    term: "Access Panel (Mis aplicaciones)",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Portal donde el usuario ve, abre y solicita sus aplicaciones asignadas.",
    longDefinition: "Portal myapps.microsoft.com de Entra: lista las aplicaciones asignadas al usuario, permite abrirlas con SSO de un clic, solicitar nuevas en self-service y gestionar grupos donde esté permitido. Es la cara visible del trabajo del equipo IAM: si el acceso está mal aprovisionado, aquí se nota primero. El service desk lo usa como primer paso de diagnóstico.",
    example: "El usuario no ve la app de gastos en su Access Panel; el diagnóstico rápido es que falta la asignación del grupo, no un problema de SSO."
  },
  {
    id: "seed-more-gestion-grupos-autoservicio",
    term: "Gestión de grupos en autoservicio",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Usuarios que crean y administran grupos, incluida su pertenencia, sin TI.",
    longDefinition: "Capacidad de Entra y de Okta para que los usuarios creen grupos, inviten miembros o acepten solicitudes de ingreso con aprobación del dueño. Descarga trabajo de TI y de paso designa un responsable por grupo. El riesgo es la proliferación de grupos basura, así que se gobierna con dueño obligatorio y directivas de expiración.",
    example: "El equipo de marketing crea Mkt-CampanaQ4 en autoservicio con unión aprobada por su dueño: TI no participó en ningún ticket."
  },
  {
    id: "seed-more-acceso-entre-inquilinos",
    term: "Configuración de acceso entre inquilinos (cross-tenant)",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Políticas de Entra que controlan la colaboración B2B con otros tenants.",
    longDefinition: "Cross-tenant access settings: reglas por tenant externo, y por etiquetas de partner, que definen si se permiten invitaciones B2B o colaboración en M365, y si se confía en el MFA o en el dispositivo del otro tenant. Con partners frecuentes permite estrechar la confianza en lugar de invitar a ciegas. Es la frontera moderna del control de acceso externo.",
    example: "La política del tenant PartnerF5 solo permite invitaciones a usuarios con MFA validado en su tenant; 3 invitados sin MFA quedan bloqueados de forma automática."
  },
  {
    id: "seed-more-registros-inicio-sesion",
    term: "Registros de inicio de sesión (sign-in logs)",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Log de Entra con cada intento de autenticación, su resultado y su riesgo.",
    longDefinition: "Sign-in logs: detalle de cada intento (interactivo, no interactivo, service principal, identidad administrada) con resultado, directiva CA aplicada, dispositivo, ubicación y nivel de riesgo. Es EL log del analista IAM: se consulta en Entra o se enruta al SIEM. Saber filtrar por código de error (50053, 50126, AADSTS) y por riesgo es la habilidad diaria.",
    example: "La revisión del lunes filtra inicios fallidos con 50076 del viernes: en minutos se detectan 22 usuarios aún sin MFA registrado."
  },
  {
    id: "seed-more-registros-auditoria-entra",
    term: "Registros de auditoría de Entra ID",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Log de cambios del tenant: usuarios, roles, grupos, políticas y consentimientos.",
    longDefinition: "Audit logs de Entra: registran los cambios de configuración y de identidad (crear usuario, asignar rol, añadir a grupo, consentir una aplicación, modificar una política CA) con actor, objetivo y hora. Complementan al sign-in log: uno registra quién entró y el otro quién cambió qué. En auditoría de accesos privilegiados es la fuente primaria.",
    example: "Se investiga un cambio sospechoso: el audit log muestra que un invitado con Global Admin asignó el rol de administrador de aplicaciones a las 03:14."
  },
  {
    id: "seed-more-ubicaciones-de-confianza",
    term: "Ubicaciones de confianza (named locations)",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Rangos IP o países definidos como confiables para las directivas de acceso.",
    longDefinition: "Named locations de Entra: bloques IP (oficinas, VPN) o países marcados como confiables o no confiables para usarlos como condición en las directivas de acceso condicional. Se combinan para excluir países o para exigir MFA fuera de la red corporativa. Es una de las condiciones más usadas y a la vez una de las peor mantenidas: IPs que ya no son de la empresa.",
    example: "La directiva de MFA fuera de ubicaciones de confianza cubre 3 sedes; tras mudar la oficina de Madrid, el rango viejo quedó 6 meses sin actualizar."
  },
  {
    id: "seed-more-modo-solo-informe",
    term: "Modo de solo informe (report-only)",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Fase de prueba de una directiva: evalúa y registra sin llegar a bloquear.",
    longDefinition: "Report-only mode: ejecuta la directiva de acceso condicional y registra el resultado que habría aplicado sin bloquear ni exigir MFA. Es la forma profesional de desplegar CA: primero solo informe, se analiza el impacto en el log y luego se activa. Evita el clásico activé la política y bloqueé al CEO en la primera hora.",
    example: "La política de exigir MFA pasa 2 semanas en solo informe: el log revela 12 usuarios excluidos por error y 3 aplicaciones legacy que habría roto."
  },
  {
    id: "seed-more-inquilino",
    term: "Inquilino (tenant)",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Instancia aislada de un servicio cloud con su propio directorio y dominios.",
    longDefinition: "Tenant: la instancia dedicada de Entra, Google Workspace o de una cuenta de AWS, con sus usuarios, dominios verificados y configuración. Todo lo que el equipo IAM configura vive dentro de un tenant, y multi-tenant significa colaboración entre instancias. Entender el aislamiento por tenant y quién administra la identidad raíz es la frontera de responsabilidad del analista.",
    example: "Se audita el tenant heredado de una fusión: sin MFA obligatorio ni control de invitados; las prioridades de hardening se documentan en 2 semanas."
  },
  {
    id: "seed-more-entra-cloud-sync",
    term: "Entra Cloud Sync",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Agente ligero de Microsoft para aprovisionar identidades de AD en Entra.",
    longDefinition: "Herramienta moderna de aprovisionamiento (antes Azure AD Connect Cloud Provisioning) que sincroniza usuarios y grupos de AD hacia Entra con agentes ligeros y en alta disponibilidad. No hace pass-through ni escritura diferida de contraseñas: se centra en provisioning, ideal en migraciones o escenarios multi-bosque. El junior debe saber cuál de las dos herramientas de sincronización está en uso y por qué.",
    example: "La filial adquirida usa Cloud Sync para empujar su bosque hacia el tenant corporativo: 2.000 usuarios coexisten con los de Entra Connect sin conflicto."
  },
  {
    id: "seed-more-phs",
    term: "Sincronización de hash de contraseñas (PHS)",
    acronym: "PHS",
    category: "IAM - Access Management",
    shortDefinition: "Método híbrido: Entra guarda el hash del password de AD para validar en la nube.",
    longDefinition: "Password Hash Sync: Entra Connect extrae el hash de AD, lo recifra y lo sincroniza para que el usuario valide en la nube con la misma contraseña. Habilita el SSPR con writeback y permite detectar credenciales filtradas con Identity Protection. Es el método recomendado por defecto frente a PTA por su resiliencia si el entorno on-prem cae.",
    example: "Con PHS y smart lockout, una oleada de password spraying contra 300 usuarios queda contenida en la nube sin bloquear a los legítimos en AD."
  },
  {
    id: "seed-more-pta",
    term: "Pass-through Authentication (PTA)",
    acronym: "PTA",
    category: "IAM - Access Management",
    shortDefinition: "Método híbrido: agentes locales validan el password contra AD en tiempo real.",
    longDefinition: "PTA: cuando el usuario inicia sesión en Entra, la solicitud se reenvía a agentes instalados on-prem que la validan contra AD; la contraseña no se almacena en la nube. Exige alta disponibilidad de agentes y conectividad, y es popular donde la política no permite sincronizar hashes. El analista vigila los agentes caídos: el login híbrido entero depende de ellos.",
    example: "Los dos agentes PTA caen por un parche de Windows y nadie del híbrido entra a M365 durante 40 minutos; la lección documentada es operar con 3 agentes."
  },
  {
    id: "seed-more-my-staff",
    term: "My Staff (delegación de soporte)",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Portal de Entra para que managers y delegados gestionen a su equipo.",
    longDefinition: "My Staff permite a los jefes, o al helpdesk delegado, ver a los miembros de su unidad administrativa y desde una pantalla simple restablecer contraseñas, exigir el re-registro del MFA o revocar sesiones. Descarga una gran parte de los tickets típicos del service desk. Configurarlo con el alcance correcto, quién puede gestionar a quién, es tarea del equipo IAM.",
    example: "El helpdesk de nivel 1 recibe un rol limitado con My Staff: resuelve MFA bloqueado sin escalar tickets a nivel 3."
  },
  {
    id: "seed-more-autenticacion-vs-autorizacion",
    term: "Autenticación vs. autorización",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Quién eres frente a qué puedes hacer: las dos preguntas del control de acceso.",
    longDefinition: "La autenticación (AuthN) verifica la identidad con credenciales o MFA; la autorización (AuthZ) decide qué puede hacer esa identidad mediante roles, permisos o scopes. El 90% del trabajo IAM toca ambas: federación y MFA son AuthN, mientras que entitlements, RBAC y acceso condicional son AuthZ. En entrevistas junior, confundirlas es eliminatorio.",
    example: "El usuario entra sin problema (AuthN OK) pero no ve el informe: es un fallo de AuthZ; se revisa su rol en la app, no su contraseña."
  },
  {
    id: "seed-more-estados-dispositivo-entra",
    term: "Estados de dispositivo de Entra (registered / joined / hybrid)",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Cómo confía un dispositivo con el tenant: registrado, unido o híbrido.",
    longDefinition: "Entra registered (equipo personal con la cuenta del usuario), Entra joined (equipo corporativo unido al tenant) e hybrid joined (unido a AD y además registrado en Entra). El estado alimenta las directivas CA, como exigir dispositivo unido o conforme, y el SSO de Windows. El analista depura equipos pendientes o duplicados que rompen las políticas de dispositivo.",
    example: "Una política exige hybrid joined: 40 portátiles quedan fuera porque la tarea programada falló; se replanifica el join antes del cumplimiento estricto."
  },
  {
    id: "seed-more-microsoft-intune",
    term: "Microsoft Intune",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Plataforma MDM y MAM que administra dispositivos y define su cumplimiento.",
    longDefinition: "Intune inscribe y gestiona dispositivos: despliega configuración, aplica políticas de cumplimiento (cifrado, versión de SO, PIN) y publica aplicaciones. Su papel en IAM es proveer la señal de device compliance que el acceso condicional después exige. El junior relaciona el usuario bloqueado por política CA con el estado de su equipo en Intune.",
    example: "Un usuario no accede a SharePoint: su portátil aparece como no conforme en Intune por BitLocker pendiente; tras cifrar, el acceso se restablece solo."
  },
  {
    id: "seed-more-viaje-imposible",
    term: "Viaje imposible (impossible travel)",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Detección de dos inicios de sesión desde lugares inalcanzables en el tiempo.",
    longDefinition: "Impossible travel: riesgo detectado cuando un usuario autentica desde ubicaciones geográficamente incompatibles con la diferencia de tiempo, como Madrid y Singapur a 20 minutos. Puede ser una VPN con salida rara, un proxy o el robo de credenciales. El analista la clasifica: viaje real, VPN corporativa o compromiso; es la detección que más se comenta con los usuarios.",
    example: "Un CFO aparece en Nigeria 15 minutos después de entrar en Barcelona; el análisis revela una VPN personal para ver un partido: se documenta y se excluye."
  },
  {
    id: "seed-more-account-takeover",
    term: "Account Takeover (ATO)",
    acronym: "ATO",
    category: "IAM - Access Management",
    shortDefinition: "Toma de control de una cuenta legítima con sus credenciales o su token.",
    longDefinition: "ATO: el atacante entra como el usuario real (passwords filtrados con stuffing, phishing del MFA o robo del token de sesión) y desde dentro cambia los factores de recuperación o las reglas de la bandeja. Al ser tráfico legítimo, se detecta por comportamientos raros: reglas de correo nuevas, MFA re-registrado o IP inusual. El junior IAM corta la sesión, revoca tokens y restablece factores.",
    example: "A un usuario le desvían el correo a una dirección extraña y su MFA cambió de número: se revocan los refresh tokens, se fuerza el re-registro y se revisa el buzón."
  },
  {
    id: "seed-more-enterprise-applications",
    term: "Enterprise Applications (aplicaciones de empresa)",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Hoja de Entra para gestionar cada app: SSO, asignación y provisioning.",
    longDefinition: "La vista Enterprise Applications del tenant concentra la configuración de cada aplicación integrada: usuarios y grupos asignados, método de SSO, aprovisionamiento, roles de app, consentimientos y directivas CA aplicables. Es el panel donde el junior pasa el día al incorporar una app o investigar un no tengo acceso. Es distinta de App registrations, donde se define la app.",
    example: "Para la app de gastos, el analista revisa en Enterprise Apps: 3 grupos asignados, provisioning en marcha y una CA que exige MFA a todos salvo a la cuenta de servicio."
  },
  {
    id: "seed-more-aws-iam",
    term: "AWS IAM",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Servicio de identidades y permisos de AWS: usuarios, grupos, roles y políticas.",
    longDefinition: "AWS Identity and Access Management: define principals (usuarios, grupos, roles), políticas JSON y claves de acceso para casi toda la API de AWS. Por defecto niega todo y solo concede lo explícito. El analista que trabaje cloud audita como hallazgo clásico los usuarios con claves de acceso eternas y permisos amplios sobre todos los recursos.",
    example: "La revisión trimestral encuentra 37 usuarios IAM con claves de más de 1 año y sin rotación: se planifica su conversión a roles de corta vida."
  },
  {
    id: "seed-more-rol-aws-iam",
    term: "Rol de AWS IAM (AssumeRole)",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Identidad asumible temporal con permisos, sin contraseña permanente.",
    longDefinition: "Un rol de AWS es una identidad con políticas que otro principal puede asumir (via STS) recibiendo credenciales temporales. Es la alternativa a los usuarios con claves fijas: humanos federados por SSO, servicios entre cuentas o workloads en EC2 y Lambda. Migrar de claves a roles es la remediación estándar de los hallazgos cloud de identidad.",
    example: "El pipeline de despliegue usaba un usuario con clave fija; se migra a un rol con trust policy de la cuenta de CI/CD y la clave se desactiva."
  },
  {
    id: "seed-more-politica-aws-iam",
    term: "Política de AWS IAM (documento JSON)",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Documento JSON que declara permisos con Effect, Action, Resource y Condition.",
    longDefinition: "Las políticas de AWS IAM expresan permisos: Statement con Effect (Allow o Deny), Action (s3:GetObject), Resource (ARN) y Condition (IpEquals, MFA). Hay identity-based (adjuntas al principal), resource-based (al recurso, como una bucket policy), SCP y de sesión. Leerlas con calma es la habilidad número uno del analista cloud: la mayoría de los no tengo permiso es un detalle de política.",
    example: "El usuario no puede leer el bucket: su política permite sobre el ARN del bucket, pero la bucket policy lo niega si no llega desde la VPC corporativa."
  },
  {
    id: "seed-more-trust-policy",
    term: "Trust Policy (política de confianza)",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Política de un rol que define quién puede asumirlo y bajo qué condiciones.",
    longDefinition: "Documento JSON anexo a cada rol IAM que define qué principals (cuenta, servicio, federación SAML u OIDC) pueden llamar a AssumeRole y con qué condiciones (MFA, fecha, IP). Es la mitad del rol: la otra mitad son sus permisos. Un trust con comodín mal puesto expone el rol a cualquier cuenta de AWS, y el analista la audita siempre junto a los permisos.",
    example: "El rol Deploy confía solo en la cuenta de CI/CD con condición de MFA; alguien la relajó y el hallazgo se marca como crítico por escalada entre cuentas."
  },
  {
    id: "seed-more-aws-sts",
    term: "AWS STS (Security Token Service)",
    acronym: "STS",
    category: "IAM - Access Management",
    shortDefinition: "Servicio de AWS que emite credenciales temporales para asumir roles.",
    longDefinition: "Security Token Service: emite las credenciales temporales (AccessKeyId, SecretAccessKey y SessionToken) resultantes de AssumeRole, GetSessionToken o federación. La duración por defecto va de minutos a horas y es la base del modelo de cero claves permanentes. El junior lo invoca cada vez que despliega o explica por qué los roles funcionan sin contraseña.",
    example: "aws sts assume-role devuelve credenciales válidas 1 hora para auditar S3; al expirar, no queda ningún secreto en el equipo."
  },
  {
    id: "seed-more-arn",
    term: "ARN (Amazon Resource Name)",
    acronym: "ARN",
    category: "IAM - Access Management",
    shortDefinition: "Identificador global de un recurso de AWS: partición, servicio, cuenta y recurso.",
    longDefinition: "Sintaxis uniforme para nombrar cualquier recurso de AWS, como arn:aws:s3:::mi-bucket o arn:aws:iam::1234:role/Deploy. Todas las políticas, logs y alertas referencian ARNs. El analista debe parsearlos de un vistazo para saber qué servicio, qué cuenta y qué recurso exacto están en juego en un hallazgo.",
    example: "Una alerta de CloudTrail cita arn:aws:iam::9999:role/Billing: el permiso raro no es del usuario sino de un rol de otra cuenta usado vía federación."
  },
  {
    id: "seed-more-permission-boundaries",
    term: "Permission Boundaries (AWS)",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Tope de permisos máximo aunque las políticas concedan más.",
    longDefinition: "Las permission boundaries son políticas gestionadas que actúan como techo: los permisos efectivos nunca superan la frontera, lo que permite delegar la creación de roles y usuarios sin entregar el reino. Se combinan con las SCP (tope de organización) y con las políticas (concesión): el permiso efectivo es la intersección de las tres. Concepto estrella en entrevistas IAM cloud.",
    example: "Los desarrolladores pueden crear roles para su app, pero la boundary prohíbe iam:* y s3:DeleteBucket: aunque se concedan, nunca aplicarán."
  },
  {
    id: "seed-more-aws-identity-center",
    term: "AWS IAM Identity Center",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Centro de SSO de AWS para dar a los humanos acceso federado a las cuentas.",
    longDefinition: "IAM Identity Center (antes AWS SSO) centraliza la identidad humana de AWS: usuarios locales o federados desde Entra u Okta, permission sets y asignación por cuenta de la organización. Sustituye a los usuarios IAM individuales con claves. El analista lo configura para que el acceso a las consolas sea con MFA corporativo y permisos temporales.",
    example: "El equipo de datos entra a 6 cuentas de AWS con su cuenta de Entra federada vía Identity Center y un permission set de solo lectura."
  },
  {
    id: "seed-more-gcp-iam",
    term: "GCP IAM",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Modelo de permisos de Google Cloud: jerarquía de recursos, roles y bindings.",
    longDefinition: "Cloud IAM de GCP organiza los permisos en la jerarquía organización, folder, proyecto y recurso, con roles (predefinidos, básicos y custom) que se asignan mediante bindings a members: usuarios, grupos o service accounts. Todo se hereda hacia abajo, así que un editor de la organización edita todos los proyectos. El analista audita bindings de roles owner y de serviceAccountTokenCreator.",
    example: "gcloud projects get-iam-policy muestra un binding de roles/owner para el grupo de 120 desarrolladores: hallazgo crítico de control total del proyecto."
  },
  {
    id: "seed-more-cuenta-servicio-gcp",
    term: "Cuenta de servicio de GCP",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Identidad de GCP para workloads, con claves JSON descargables y roles.",
    longDefinition: "Service account de Google Cloud: identidad no humana con email propio que usan las VM y funciones para autenticarse a las APIs, y que también puede actuar como recurso mediante impersonación. Sus claves JSON descargables son el riesgo estrella: se filtran en repos y dan acceso de API sin MFA. La buena práctica es claves gestionadas o federación sin claves.",
    example: "Una clave JSON de service account aparece en un repositorio público; se rota, se revisa Cloud Logging en busca de uso del atacante y se documenta el incidente."
  },
  {
    id: "seed-more-workload-identity-federation",
    term: "Workload Identity Federation",
    acronym: undefined,
    category: "IAM - Access Management",
    shortDefinition: "Federar workloads externos a GCP o AWS sin claves permanentes.",
    longDefinition: "Configuración que permite a una carga externa (un pipeline de GitHub o un workload de otro cloud) obtener identidad presentando tokens OIDC de su proveedor, en lugar de claves estáticas. Elimina el problema de los secretos rotativos para las máquinas. Existe en GCP como workload identity pools y en AWS como identity providers OIDC. Es la respuesta moderna a dónde guardo la clave del pipeline.",
    example: "GitHub Actions accede a Cloud Storage firmando con su token OIDC contra el pool federado: cero claves JSON en los secrets del repositorio."
  },
  {
    id: "seed-more-azure-rbac",
    term: "Azure RBAC",
    acronym: "RBAC",
    category: "IAM - Access Management",
    shortDefinition: "Permisos sobre recursos de Azure, distintos de los roles de directorio.",
    longDefinition: "Azure RBAC gobierna las acciones sobre suscripciones, grupos de recursos y recursos (Contributor, Reader, Owner) con asignaciones de scope, rol y principal. Es el equivalente de las políticas IAM de AWS. Se diferencia de los roles de Entra: la confusión entre Global Admin y Owner es la pregunta de entrevista eterna. El analista audita los Owners por suscripción y las asignaciones permanentes.",
    example: "Al auditor se le da Reader en la suscripción: ve configuraciones pero no secretos ni cambios, y el acceso caduca con PIM en 8 horas."
  },
  {
    id: "seed-more-pdp-pep",
    term: "PDP y PEP (decisión y aplicación de política)",
    acronym: "PDP/PEP",
    category: "IAM - Access Management",
    shortDefinition: "Quién decide el acceso y quién lo aplica: separación de referencia.",
    longDefinition: "Arquitectura estándar de control de acceso: el PDP (Policy Decision Point) evalúa la política y responde permitir o denegar; el PEP (Enforcement Point) la aplica en el recurso, como un gateway, proxy o agente. En Entra, el acceso condicional actúa de PDP y los servicios de Microsoft de PEP. Entender la separación ayuda a diagnosticar políticas que permiten pero recursos que bloquean.",
    example: "El proxy de la app deniega la sesión aunque el CA la permite: el PEP de la aplicación añade su propia regla de dispositivo que la política central no evalúa."
  },
  {
    id: "seed-more-cae",
    term: "Evaluación continua de acceso (CAE)",
    acronym: "CAE",
    category: "IAM - Access Management",
    shortDefinition: "Revocación casi instantánea de tokens cuando cambia el riesgo o la cuenta.",
    longDefinition: "Continuous Access Evaluation: los servicios de Microsoft (Exchange, SharePoint, Teams) reevalúan los tokens críticos casi en tiempo real ante robo de sesión, cambio de contraseña o revocación de cuenta, sin esperar la expiración natural. Reduce de horas a minutos el corte de una sesión comprometida. Se cita como control estrella del hardening de identidad en M365.",
    example: "Se deshabilita una cuenta comprometida y en menos de un minuto su token de Exchange deja de funcionar gracias a CAE; antes, la sesión podía vivir una hora."
  },

  /* ---- IAM - Auth / MFA ---- */
  {
    id: "seed-more-tap",
    term: "Temporary Access Pass (TAP)",
    acronym: "TAP",
    category: "IAM - Auth / MFA",
    shortDefinition: "Clave temporal de un solo uso para registrar MFA o passwordless en Entra.",
    longDefinition: "TAP: código efímero que un administrador genera para que un usuario nuevo o bloqueado pueda registrarse en MFA o en passkeys sin depender de un factor ya comprometido. Es configurable en usos y duración. Es la alternativa moderna a dejar al usuario sin MFA un rato para que entre, práctica que abre una ventana de fraude.",
    example: "A un ejecutivo se le pierde el teléfono: el helpdesk emite un TAP de 60 minutos, registra la nueva llave FIDO2 y el acceso queda restablecido sin bajar la seguridad."
  },
  {
    id: "seed-more-cba",
    term: "Autenticación basada en certificados (CBA)",
    acronym: "CBA",
    category: "IAM - Auth / MFA",
    shortDefinition: "Autenticación con un certificado X.509, de tarjeta inteligente o cloud, como credencial.",
    longDefinition: "Certificate-Based Authentication: Entra permite validar a los usuarios con certificados (PKI propia o emitidos en la nube), ideal para entornos con tarjeta inteligente o alta exigencia. El certificado se mapea al usuario y sustituye a la contraseña en el flujo. Es resistente al phishing por diseño, porque la clave privada nunca sale del dispositivo.",
    example: "La plantilla de defensa usa CBA desde tarjeta inteligente: el certificado con el UPN en el SAN autentica al usuario en Entra sin teclear contraseña."
  },
  {
    id: "seed-more-mfa-registration-campaign",
    term: "MFA Registration Campaign",
    acronym: undefined,
    category: "IAM - Auth / MFA",
    shortDefinition: "Campaña de Entra para empujar el registro de MFA a los usuarios sin factor.",
    longDefinition: "Campaña de registro dirigido: Microsoft Entra permite lanzar avisos y un banner en el Access Panel para que los usuarios que aún no tienen MFA registrado lo hagan antes de que la directiva lo bloquee. Es la fase de transición antes de un hardening obligatorio. El analista mide la curva de adopción y localiza a los rezagados antes del cumplimiento.",
    example: "Faltan 900 usuarios por registrar MFA: se lanza la campaña con 3 avisos y en 2 semanas el 80% completa el registro; el resto entra en la lista de excepciones."
  },
  {
    id: "seed-more-registro-combinado",
    term: "Registro combinado (combined registration)",
    acronym: undefined,
    category: "IAM - Auth / MFA",
    shortDefinition: "Un único flujo de Entra para registrar a la vez el SSPR y el MFA.",
    longDefinition: "Combined registration: una experiencia única (aka.ms/mfasetup) donde el usuario registra sus métodos una vez y sirven tanto para MFA como para el autoservicio de restablecimiento de contraseña. Evita dos registros distintos y confusos. El analista lo activa junto con el registro mejorado que guía la elección de factores.",
    example: "El nuevo empleado registra Authenticator y teléfono en un solo flujo de 2 minutos; puede usar SSPR desde el primer día sin abrir un segundo registro."
  },
  {
    id: "seed-more-security-defaults",
    term: "Security Defaults",
    acronym: undefined,
    category: "IAM - Auth / MFA",
    shortDefinition: "Protecciones básicas automáticas de Entra para tenants sin configurar.",
    longDefinition: "Security Defaults: conjunto mínimo que Microsoft activa por defecto en tenants nuevos: MFA para todos, bloqueo de la autenticación heredada y protección de las cuentas administrativas. Es todo o nada, sin granularidad, y se desactiva en cuanto se adopta el acceso condicional. El junior lo encuentra en auditorías de tenants pequeños: mejor que nada, insuficiente para empresas.",
    example: "El tenant de una filial con 40 usuarios solo tenía Security Defaults; el plan de hardening los sustituye por 3 directivas de acceso condicional granulares."
  },
  {
    id: "seed-more-number-matching",
    term: "Number Matching",
    acronym: undefined,
    category: "IAM - Auth / MFA",
    shortDefinition: "En el MFA push, teclear en el móvil el número mostrado en pantalla.",
    longDefinition: "Coincidencia de números: al aprobar una notificación push de Microsoft Authenticator, el usuario debe escribir en el teléfono el número de dos dígitos que ve en la pantalla de inicio de sesión. Mitiga el MFA fatigue, donde la víctima aprueba a ciegas la notificación. Se combina con contexto adicional de ubicación y aplicación. El analista lo activa en todo el tenant como mitigación rápida.",
    example: "Tras las quejas por pushes a las 3 de la madrugada se activa number matching: el atacante ya no puede aprobar sin ver el número de la pantalla real."
  },
  {
    id: "seed-more-windows-hello-business",
    term: "Windows Hello for Business (WHfB)",
    acronym: "WHfB",
    category: "IAM - Auth / MFA",
    shortDefinition: "Credencial asimétrica anclada al TPM del equipo que sustituye a la contraseña.",
    longDefinition: "WHfB: el usuario se autentica con un gesto biométrico o un PIN que desbloquea una clave privada protegida por el TPM del equipo; la clave pública se registra en Entra o en AD. Es passwordless resistente al phishing para el inicio de sesión de Windows y el SSO posterior. Su despliegue, en variantes de clave o certificado, es un proyecto típico del equipo de identidad.",
    example: "La empresa migra 4.000 equipos a WHfB: el PIN con TPM sustituye al password en el login y el ticket de contraseña bloqueada cae un 70%."
  },
  {
    id: "seed-more-sim-swapping",
    term: "SIM Swapping",
    acronym: undefined,
    category: "IAM - Auth / MFA",
    shortDefinition: "Fraude con la transferencia del número móvil para capturar OTP y recuperación.",
    longDefinition: "El atacante engaña al operador para que traslade la línea de la víctima a una SIM suya y recibe sus SMS: códigos OTP, restablecimientos de contraseña y verificaciones de recuperación. Rompe el factor de posesión cuando lo poseído es un número de teléfono. Por ello el SMS se considera factor débil y los estándares empujan hacia authenticator o passkeys.",
    example: "Un directivo pierde señal móvil y a la media hora su banco detecta login con OTP: SIM swap; se deshabilita el SMS como método y se exige token de hardware."
  },
  {
    id: "seed-more-biometria-como-factor",
    term: "Biometría como factor",
    acronym: undefined,
    category: "IAM - Auth / MFA",
    shortDefinition: "Huella o rostro como factor de posesión ligado a la persona.",
    longDefinition: "La biometría del MFA moderno no viaja: el dispositivo verifica localmente (match on device) y solo firma el resultado, como hacen el PIN de Hello o el FaceID. No es un secreto cambiable, por eso nunca va sola: acompaña a la posesión del dispositivo. El analista explica que la huella del móvil es posesión y no un secreto que la nube almacena.",
    example: "El auditor pregunta dónde se guardan las huellas: se documenta que viven en el TPM o el enclave seguro y que el servidor solo recibe una atestación."
  },
  {
    id: "seed-more-contrasenas-prohibidas",
    term: "Lista de contraseñas prohibidas",
    acronym: undefined,
    category: "IAM - Auth / MFA",
    shortDefinition: "Términos vetados en Entra, además de la lista global, al validar la contraseña.",
    longDefinition: "Custom banned password list: además de la lista global de Microsoft, el tenant define términos vetados (nombre de la empresa, temporada, el clásico Año2024) que se rechazan en cambios y restablecimientos. Evita contraseñas conformes en complejidad pero triviales de adivinar. Se audita junto al password spraying en los informes de identidad.",
    example: "Se añaden el nombre de la empresa y Otono2024 a la lista prohibida; 1.200 usuarios con patrones parecidos reciben aviso de cambio en 30 días."
  },
  {
    id: "seed-more-step-up-authentication",
    term: "Step-up Authentication",
    acronym: undefined,
    category: "IAM - Auth / MFA",
    shortDefinition: "Pedir un factor extra solo para acciones sensibles, no para todo.",
    longDefinition: "Autenticación escalonada: el usuario navega con SSO normal, pero una operación de riesgo (transferencia, cambio de MFA o aprobación de un acceso) exige re-autenticar o un factor más fuerte. Equilibra seguridad y fricción aplicando control donde duele. En IAM se materializa con directivas que requieren autenticación reciente o de mayor fuerza.",
    example: "Descargar informes es normal, pero aprobar una campaña de certificación desde el IGA pide un MFA fresco de menos de 10 minutos."
  },
  {
    id: "seed-more-reinicio-mfa-social",
    term: "Reinicio de MFA por ingeniería social",
    acronym: undefined,
    category: "IAM - Auth / MFA",
    shortDefinition: "Vector de fraude: engañar al helpdesk para que borre el MFA de una cuenta.",
    longDefinition: "Los atacantes llaman al service desk haciéndose pasar por el usuario, con datos filtrados del RR. HH., y piden que les registren el nuevo teléfono porque perdieron el factor. Si el agente re-registra sin verificación robusta, la cuenta cae. Es el fraude más lucrativo contra el MFA, y por eso el reset de factores exige verificación fuerte y registro de quién lo hizo.",
    example: "Una llamada de la vicepresidencia pide reset de MFA a las 22:00; el agente exige devolver la llamada al número del directorio y verificar por vídeo: intento frustrado."
  },
  {
    id: "seed-more-ntlm-relay",
    term: "NTLM Relay",
    acronym: undefined,
    category: "IAM - Auth / MFA",
    shortDefinition: "Ataque que reenvía la autenticación NTLM de la víctima a otro servicio.",
    longDefinition: "El atacante se interpone en SMB o HTTP y reenvía la autenticación NTLM de la víctima hacia un servidor que la acepta, autenticándose como ella sin conocer la contraseña. Se mitiga con firmas SMB, Extended Protection for Authentication en LDAP y, sobre todo, deshabilitando NTLM. El analista endurece por GPO y bloquea la autenticación heredada; la detección son eventos 4776 encadenados.",
    example: "Tras un ejercicio de red team se activa la firma SMB obligatoria y EPA en LDAP: el relay descrito en el informe deja de funcionar en los equipos parcheados."
  },
  {
    id: "seed-more-aitm",
    term: "AiTM (Adversary-in-the-Middle)",
    acronym: "AiTM",
    category: "IAM - Auth / MFA",
    shortDefinition: "Phishing con proxy intermedio que roba la sesión completa, incluido el MFA.",
    longDefinition: "Adversary-in-the-Middle: la víctima entra en un clon del portal aparentemente legítimo; el proxy del atacante reenvía credenciales y MFA al portal real y captura la cookie o el token de sesión. Después usa esa sesión sin repetir el MFA. La defensa es la resistencia al phishing (passkeys) y la revocación rápida con CAE, no más MFA convencional.",
    example: "Un clon del portal de nómina captura la sesión de 9 empleados: se revocan los tokens, se fuerza re-login y se despliega número emparejado al dispositivo."
  },
  {
    id: "seed-more-smart-lockout",
    term: "Smart Lockout",
    acronym: undefined,
    category: "IAM - Auth / MFA",
    shortDefinition: "Bloqueo inteligente de Entra que distingue a los atacantes de los usuarios.",
    longDefinition: "El smart lockout de Entra bloquea por hash de contraseña los intentos de fuerza bruta reconocidos sin bloquear al usuario real que se equivoca de buena fe, aplicando además señales de ubicación. Evita que el password spraying genere miles de lockouts en el service desk. El analista lo cita al explicar por qué no hay cuenta bloqueada visible en AD tras un spraying en la nube.",
    example: "Oleada de spraying: el smart lockout congela los hash del atacante mientras los 40 usuarios que se confundieron de clave siguen entrando sin ticket."
  },
  {
    id: "seed-more-delegacion-sin-restricciones",
    term: "Delegación Kerberos sin restricciones",
    acronym: undefined,
    category: "IAM - Auth / MFA",
    shortDefinition: "Marca de Kerberos que permite a un servicio reusar la identidad del usuario.",
    longDefinition: "Unconstrained delegation: un servidor con esta marca puede reutilizar el TGT de cualquier usuario que lo visita para autenticarse a cualquier otro servicio en su nombre. Comprometer ese servidor equivale a coleccionar tickets de todos los que pasan. Se mitiga con la delegación restringida basada en recursos (RBCD) o marcando las cuentas como no delegables.",
    example: "El reporte de hardening detecta 3 servidores legacy con unconstrained delegation; se migran a RBCD y uno se retira por no ser necesario."
  },
  {
    id: "seed-more-golden-ticket",
    term: "Golden Ticket",
    acronym: undefined,
    category: "IAM - Auth / MFA",
    shortDefinition: "TGT falsificado con el hash de KRBTGT: persistencia total en el dominio.",
    longDefinition: "Ataque Kerberos: con el hash de la cuenta KRBTGT del controlador de dominio, el atacante firma tickets TGT válidos a placer, para cualquier usuario y con cualquier vigencia, y accede a todo el dominio. La única remediación real es restablecer KRBTGT dos veces. Su presencia en un incidente implica compromiso total del AD: por eso proteger los DC es prioridad absoluta.",
    example: "Se detectan TGT de 10 años para un usuario inexistente: indicio de golden ticket; se inicia el doble reset de KRBTGT con plan de estabilidad."
  },
  {
    id: "seed-more-silver-ticket",
    term: "Silver Ticket",
    acronym: undefined,
    category: "IAM - Auth / MFA",
    shortDefinition: "TGS falsificado con la clave del servicio: acceso dirigido y sigiloso.",
    longDefinition: "Variante Kerberos: el atacante forja un ticket de servicio (TGS) con el hash de la cuenta de servicio, obtenido por ejemplo con Kerberoasting, sin tocar KRBTGT. Solo alcanza ese servicio, pero es más difícil de detectar porque no genera tráfico hacia el KDC. Cada servicio comprometido exige rotar la contraseña de su cuenta. El analista lo conecta con el hallazgo de SPNs en cuentas débiles.",
    example: "Se detecta un TGS anómalo hacia SQL: la cuenta del servicio tenía contraseña de 14 caracteres; se rota y se documenta como silver ticket confirmado."
  },
  {
    id: "seed-more-pass-the-ticket",
    term: "Pass-the-Ticket (PtT)",
    acronym: "PtT",
    category: "IAM - Auth / MFA",
    shortDefinition: "Robo y reuso directo de tickets Kerberos vivos sin la contraseña.",
    longDefinition: "El atacante extrae tickets de la memoria de un equipo (por ejemplo de LSASS) y los usa tal cual desde otra máquina: no necesita la clave ni forjar nada, solo que el ticket siga vigente. Herramientas típicas: Mimikatz y Rubeus. Se mitiga reduciendo la vida de los tickets, con Credential Guard y detectando usos anómalos en los eventos 4769. Es el hermano directo del pass-the-hash.",
    example: "La respuesta a incidentes encuentra el ticket de un admin usado desde un equipo de laboratorio: se revoca, se rotan claves y se activa Credential Guard."
  },
  {
    id: "seed-more-as-rep-roasting",
    term: "AS-REP Roasting",
    acronym: undefined,
    category: "IAM - Auth / MFA",
    shortDefinition: "Extraer y crackear offline los hashes de cuentas sin preautenticación.",
    longDefinition: "Si una cuenta Kerberos tiene deshabilitada la preautenticación, cualquiera puede pedir su AS-REP y descifrar offline la contraseña del hash incluido en la respuesta. Es el primo del Kerberoasting, que ataca los TGS de los servicios. La remediación es activar la preautenticación en todas las cuentas y usar contraseñas largas en las de servicio.",
    example: "El escaneo encuentra 11 cuentas sin preautenticación; 3 caen por diccionario en minutos: se corrige el flag y se rotan las contraseñas comprometidas."
  },
  {
    id: "seed-more-dcsync",
    term: "DCSync",
    acronym: undefined,
    category: "IAM - Auth / MFA",
    shortDefinition: "Técnica que simula la replicación de un DC para robar los hashes del dominio.",
    longDefinition: "Con permisos de replicación de directorio, el atacante pide a un DC que le replique los datos y recibe todos los hashes, incluido el de KRBTGT, que abre la puerta al Golden Ticket. La herramienta clásica es el comando dcsync de Mimikatz. La contraparte del analista es vigilar réplicas desde hosts que no son DC y auditar quién tiene esos permisos.",
    example: "Una cuenta de backup con derechos de replicación ejecuta dcsync desde un servidor que no es DC: alerta crítica, se aísla el host y se planifica la rotación de KRBTGT."
  },

  /* ---- IAM - Federation / SSO ---- */
  {
    id: "seed-more-id-token",
    term: "ID Token",
    acronym: undefined,
    category: "IAM - Federation / SSO",
    shortDefinition: "Token de OIDC con los claims de identidad del usuario autenticado.",
    longDefinition: "En OpenID Connect, el IdP entrega un ID token (JWT) con claims (sub, aud, iss, exp) que afirman quién inició sesión; no sirve para llamar APIs, que es el papel del access token. Consumirlo y validarlo bien (firma, audiencia, emisor) es la base de toda integración de login. El analista revisa sus claims cuando una app muestra atributos equivocados del usuario.",
    example: "La app muestra el número de empleado del usuario: viene del claim employeeID del ID token, que se mapeó desde el HRIS."
  },
  {
    id: "seed-more-jwks",
    term: "JWKS (JSON Web Key Set)",
    acronym: "JWKS",
    category: "IAM - Federation / SSO",
    shortDefinition: "Conjunto de claves públicas del IdP publicado para verificar tokens.",
    longDefinition: "JSON Web Key Set: endpoint donde el IdP publica sus claves públicas con su kid y algoritmo. Las aplicaciones lo consultan para verificar la firma de los JWT y de las aserciones. Cuando el IdP rota la clave, el JWKS cambia y las apps que cachean sin refresco rompen el login: causa clásica de un SSO caído un martes sin razón aparente.",
    example: "Tras una rotación de claves de Entra fallan 2 apps internas: cacheaban el JWKS sin refrescar el kid; se corrige la validación y se documenta."
  },
  {
    id: "seed-more-endpoint-well-known",
    term: "Endpoint well-known (OIDC discovery)",
    acronym: undefined,
    category: "IAM - Federation / SSO",
    shortDefinition: "URL de descubrimiento de OIDC: .well-known/openid-configuration.",
    longDefinition: "Punto estandarizado donde el IdP publica su configuración: endpoints de autorización, token, JWKS y UserInfo, además de los scopes soportados. Permite integrar aplicaciones sin configuración manual (discovery). Es lo primero que pide una app moderna al configurar el SSO, y el analista lo usa para diagnosticar URLs equivocadas.",
    example: "La app de BI pide la issuer URL: se le entrega la del tenant de Entra y descubre el resto de endpoints vía .well-known."
  },
  {
    id: "seed-more-consentimiento-oauth",
    term: "Consentimiento OAuth (user y admin consent)",
    acronym: undefined,
    category: "IAM - Federation / SSO",
    shortDefinition: "Permiso del usuario o del admin para que una app acceda con scopes.",
    longDefinition: "En OAuth y OIDC, antes de que una app reciba tokens con scopes delegados, alguien consiente: el propio usuario (user consent) o un administrador (admin consent), según el permiso. El admin consent se puede conceder por adelantado a toda la empresa y evitar los prompts. El exceso de apps consentidas por usuarios es una superficie de riesgo que se audita.",
    example: "Se concede admin consent a la app oficial de viajes con Mail.Read limitado; cualquier otra app que pida Mail.ReadWrite pasa por revisión de seguridad."
  },
  {
    id: "seed-more-permisos-delegados-vs-app",
    term: "Permisos delegados vs. de aplicación",
    acronym: undefined,
    category: "IAM - Federation / SSO",
    shortDefinition: "Actuar en nombre del usuario firmado frente a actuar como la app sola.",
    longDefinition: "Los delegated permissions dejan a la app llamar a la API en nombre del usuario presente, con sus scopes y consentimiento; los application permissions dejan a la app actuar sola (app-only, roles de app y admin consent obligatorio). La diferencia define qué puede hacer de noche sin nadie delante. El analista la audita: un Mail.Read delegado es inocuo junto a un Mail.Read de aplicación.",
    example: "Una app de facturación pide Mail.ReadWrite de aplicación para buscar facturas: se cuestiona y se reduce a un permiso delegado de solo lectura."
  },
  {
    id: "seed-more-registro-de-aplicaciones",
    term: "Registro de aplicaciones (app registration)",
    acronym: undefined,
    category: "IAM - Federation / SSO",
    shortDefinition: "Objeto de Entra que define una app: credenciales, redirects y permisos.",
    longDefinition: "App registration: la definición de la aplicación en el tenant, con su client ID, secrets o certificados, redirect URIs, permisos de API y flujos permitidos. Toda integración de SSO empieza aquí. El analista audita los secrets sin expiración, los redirect URIs con comodines y los flujos ROPC habilitados, que son los tres pecados capitales de un registro.",
    example: "La revisión de app registrations detecta 14 secrets marcados como nunca caducan; se pone caducidad de 12 meses y un owner a cada una."
  },
  {
    id: "seed-more-service-principal",
    term: "Service Principal",
    acronym: undefined,
    category: "IAM - Federation / SSO",
    shortDefinition: "Instancia de una app en el tenant, a la que se asignan roles y consentimientos.",
    longDefinition: "Mientras el app registration es la definición global de la app, el service principal es su instancia local en un tenant: a él se le asignan roles, permisos consentidos y licencias. Es la identidad que existe en tu directorio aunque la app sea de un tercero. El junior lo reconoce en los sign-in logs de service principals y en las asignaciones de roles de Azure.",
    example: "La app de BI de un tercero aparece como service principal en el tenant; se le asigna el rol Reader solo en el grupo de recursos de informes."
  },
  {
    id: "seed-more-app-multi-inquilino",
    term: "Aplicación multi-inquilino (multi-tenant app)",
    acronym: undefined,
    category: "IAM - Federation / SSO",
    shortDefinition: "App registrada para aceptar usuarios de cualquier tenant de Entra.",
    longDefinition: "Una app multi-tenant permite que organizaciones distintas la usen con sus propios usuarios, que es el caso de los ISVs: cada tenant crea su service principal al consentir. El riesgo es que cualquier usuario de cualquier empresa puede probarla y solicitarle permisos. La configuración de acceso entre inquilinos y el control de consentimiento del tenant mitigan el abuso.",
    example: "El tenant bloquea el user consent para apps multi-tenant nuevas; solo el comité de seguridad concede admin consent tras revisar al editor."
  },
  {
    id: "seed-more-acs-url",
    term: "ACS URL (Assertion Consumer Service)",
    acronym: "ACS",
    category: "IAM - Federation / SSO",
    shortDefinition: "Endpoint de la aplicación donde el IdP entrega la aserción SAML.",
    longDefinition: "Assertion Consumer Service: URL del service provider donde el IdP envía el POST con la aserción SAML para consumirla. Debe coincidir exactamente con la registrada en la metadata o en la configuración del IdP; un solo carácter distinto rompe el login. Es el primer campo que el analista compara cuando SAML devuelve un error de destino o audiencia.",
    example: "El SSO falla tras un cambio de dominio de la app: el ACS sigue apuntando a la URL vieja de login; se actualiza en el IdP y el acceso se restaura."
  },
  {
    id: "seed-more-relaystate",
    term: "RelayState",
    acronym: undefined,
    category: "IAM - Federation / SSO",
    shortDefinition: "Parámetro SAML que preserva el destino original del usuario tras el login.",
    longDefinition: "Datos que viajan con la aserción SAML para devolver al usuario a la página concreta que pedía (deep link) o para transportar contexto. Es opaco para el IdP, que solo lo devuelve. Cuando un usuario entra pero aterriza en la home en vez de en su informe, suele ser un RelayState que se pierde o cambia de nombre al pasar por un proxy.",
    example: "Los enlaces del intranet al portal de compras incluyen RelayState para aterrizar directo en el carrito; tras actualizar el IdP se pierde y se reconfigura."
  },
  {
    id: "seed-more-nameid-format",
    term: "NameID Format",
    acronym: undefined,
    category: "IAM - Federation / SSO",
    shortDefinition: "Formato del identificador de usuario en la aserción SAML.",
    longDefinition: "El elemento NameID de la aserción identifica al usuario, y su formato (emailAddress, persistent, unspecified y demás URIs del estándar) debe coincidir entre IdP y SP. Un formato distinto genera usuarios duplicados o errores de usuario no encontrado. Es el campo estrella del troubleshooting SAML junto al ACS y los mapeos de atributos.",
    example: "La app esperaba NameID de tipo email y el IdP enviaba persistent: cada login creaba un usuario nuevo; se cambia el formato y se consolidan las cuentas."
  },
  {
    id: "seed-more-slo",
    term: "Single Logout (SLO)",
    acronym: "SLO",
    category: "IAM - Federation / SSO",
    shortDefinition: "Cierre de sesión propagado del SP al IdP y de este al resto de apps.",
    longDefinition: "SLO: cuando el usuario cierra sesión en una aplicación, la petición viaja al IdP, que a su vez desloguea las demás sesiones federadas por canal frontal o trasero. Sin SLO, cerrar la app deja viva la sesión del IdP y el siguiente clic reentra sin credenciales, un riesgo grave en equipos compartidos. El analista lo prueba siempre en kioscos y puestos públicos.",
    example: "En un kiosco de tienda, sin SLO el siguiente cliente tocaba entrar y volvía como el anterior; se configura SLO en las 4 apps federadas del quiosco."
  },
  {
    id: "seed-more-certificado-firma-saml",
    term: "Certificado de firma SAML",
    acronym: undefined,
    category: "IAM - Federation / SSO",
    shortDefinition: "Certificado X.509 con el que el IdP firma las aserciones: si expira, cae el SSO.",
    longDefinition: "El IdP firma las aserciones o respuestas con su certificado, y el SP las valida con la clave pública de la metadata. Los certificados caducan, y Entra avisa y permite la autorrotación con solapamiento; si expira sin actualizar, todas las apps SAML del IdP fallan a la vez. Monitorear su vigencia es tarea básica del equipo IAM, con alerta a 30 días.",
    example: "El certificado de Entra vence en 20 días: se activa la nueva clave con solape, se exporta la metadata a las 12 apps y se verifica la firma en cada una."
  },
  {
    id: "seed-more-golden-saml",
    term: "Golden SAML",
    acronym: undefined,
    category: "IAM - Federation / SSO",
    shortDefinition: "Falsificar aserciones SAML con la clave de firma del IdP comprometida.",
    longDefinition: "Si el atacante roba la clave privada de firma SAML del IdP (por ejemplo del AD FS), genera aserciones válidas como cualquier usuario sin pasar por la autenticación. El acceso es persistente y difícil de detectar, porque la aplicación valida correctamente la firma. La remediación es rotar las claves y revisar la cadena del IdP. Es el golden ticket del mundo federado.",
    example: "Tras un incidente en AD FS se detecta una aserción firmada con la clave vieja de un SP ya retirado: rotación total de las claves de federación."
  },
  {
    id: "seed-more-phishing-de-consentimiento",
    term: "Phishing de consentimiento (consent phishing)",
    acronym: undefined,
    category: "IAM - Federation / SSO",
    shortDefinition: "Engañar al usuario para que otorgue permisos OAuth a una app maliciosa.",
    longDefinition: "En lugar de robar contraseñas, el atacante convence al usuario de pulsar Aceptar en una app OAuth maliciosa que pide leer el correo o los archivos: el token de esa app persiste aunque el usuario cambie de contraseña. En M365 se conoce como illicit consent grant. Se mitiga bloqueando el user consent, auditando las concesiones de permisos y revocando apps raras.",
    example: "La campaña interna enseña el prompt real: esta app podrá leer tu correo; 12 usuarios ya lo habían aceptado con una app de fusionar PDFs."
  },
  {
    id: "seed-more-ropc",
    term: "ROPC (Resource Owner Password Credentials)",
    acronym: "ROPC",
    category: "IAM - Federation / SSO",
    shortDefinition: "Flujo OAuth que envía usuario y contraseña directamente: hay que evitarlo.",
    longDefinition: "ROPC: la app recoge el password del usuario y lo canjea por tokens. Bloquea MFA y SSO, rompe el modelo de delegación y está desaconsejado (Microsoft lo limita y no funciona con cuentas con MFA). Aparece en apps heredadas y en scripts caseros: el analista lo detecta y lo sustituye por authorization code con PKCE.",
    example: "El tenant bloquea ROPC por directiva y la app legacy de login propio se cae: se reescribe con MSAL y authorization code, con passwordless incluido."
  },
  {
    id: "seed-more-obo-flow",
    term: "Flujo On-Behalf-Of (OBO)",
    acronym: "OBO",
    category: "IAM - Federation / SSO",
    shortDefinition: "Una API usa la identidad delegada del usuario para llamar a otra API.",
    longDefinition: "On-Behalf-Of: el usuario llama a una API web con su token delegado y esa API pide otro token para consumir una segunda API manteniendo la identidad del usuario original. Es la cadena típica de las capas intermedias sobre M365 y Graph. El analista lo audita para no confundirlo con app-only: la responsabilidad y el registro siguen siendo del usuario.",
    example: "La API de informes llama a Graph con OBO para leer el OneDrive del solicitante; los logs muestran al usuario real, no a la app."
  },
  {
    id: "seed-more-device-code-flow",
    term: "Flujo de código de dispositivo (device code flow)",
    acronym: undefined,
    category: "IAM - Federation / SSO",
    shortDefinition: "Login en dispositivos sin navegador: un código y confirmación en el móvil.",
    longDefinition: "Device authorization grant: el dispositivo muestra un código y una URL; el usuario valida en su teléfono con su sesión y el dispositivo recibe los tokens. Está pensado para televisores, consolas y CLIs. Es cómodo y a la vez un vector de phishing, con códigos enviados por correo falso: se restringe por directiva y se vigilan los inicios por device code.",
    example: "Un correo falso pide confirmar el Teams TV con el código ABC123: el analista bloquea el flujo de device code para cuentas no autorizadas."
  },
  {
    id: "seed-more-client-credentials-grant",
    term: "Client Credentials Grant",
    acronym: undefined,
    category: "IAM - Federation / SSO",
    shortDefinition: "La app se autentica con su propia identidad, sin ningún usuario (app-only).",
    longDefinition: "Flujo OAuth donde la app canjea su propia credencial (secret o certificado) por un token de aplicación: no hay usuario delante. Ideal para procesos nocturnos, siempre que se minimicen permisos y roten credenciales. Los tokens resultantes no ven MFA ni directivas de usuario: el control va en los permisos de aplicación y en directivas específicas para workloads.",
    example: "El job nocturno usa client credentials con certificado y permiso de lectura solo sobre 2 buzones concretos: mínimo privilegio para un workload."
  },
  {
    id: "seed-more-seamless-sso",
    term: "Seamless SSO",
    acronym: undefined,
    category: "IAM - Federation / SSO",
    shortDefinition: "Autenticación silenciosa con Kerberos para usuarios dentro de la red corporativa.",
    longDefinition: "Característica de Entra Connect: en los equipos del dominio, dentro de la red corporativa, el navegador obtiene por Kerberos un ticket que valida contra Entra y la sesión abre sin escribir nada. Combinado con PHS o PTA da una experiencia tipo Windows en la nube. Se habilita en la zona DNS del AD: su avería produce prompts inesperados de contraseña en la intranet.",
    example: "En la oficina, M365 abre sin pedir nada; en casa, el mismo usuario ve el formulario: la diferencia la explica el Seamless SSO."
  },
  {
    id: "seed-more-expiracion-tokens",
    term: "Expiración y vigencia de tokens",
    acronym: undefined,
    category: "IAM - Federation / SSO",
    shortDefinition: "Tiempo de vida de tokens y sesiones: la ventana útil ante un compromiso.",
    longDefinition: "Los access tokens de Entra viven alrededor de una hora, los refresh más tiempo, y la sesión del navegador sigue su propia directiva, con la CAE para el corte casi inmediato. Reducir vidas ayuda a contener pero multiplica autenticaciones: el equilibrio se configura en las directivas de sesión y de vigencia. El analista explica por qué un reset de contraseña ya no cierra todo y qué revocar realmente.",
    example: "Al despedir a un usuario por la tarde se revocan sus refresh tokens y sesiones desde el portal: su access token restante muere en el primer control con CAE."
  },
  {
    id: "seed-more-adfs",
    term: "AD FS (Active Directory Federation Services)",
    acronym: "AD FS",
    category: "IAM - Federation / SSO",
    shortDefinition: "Servicio de federación on-prem de Microsoft, hoy en retirada hacia Entra.",
    longDefinition: "AD FS: el STS clásico para federar AD con las aplicaciones y con M365 sin sincronizar hashes a la nube. Su mantenimiento (granjas, certificados, proxies WAP) es pesado y su superficie de ataque, con exploits conocidos y el Golden SAML, alta. La mayoría de proyectos actuales migran de AD FS a Entra ID con PHS: el junior documenta confianzas, claims y el corte final.",
    example: "La migración retira 4 servidores AD FS: 90 días de convivencia y el corte se valida viendo el nuevo IdP en el sign-in log de Entra."
  },
  {
    id: "seed-more-b2c",
    term: "B2C (identidades de clientes)",
    acronym: "B2C",
    category: "IAM - Federation / SSO",
    shortDefinition: "Directorio de Entra aparte para autenticar a clientes, no a empleados.",
    longDefinition: "Entra B2C (hoy Entra External ID para clientes) es un tenant o directorio separado para autenticar clientes con cuentas locales o sociales (Google, Facebook), independiente del directorio de empleados. Separa por completo el workforce de los clientes, con flujos y políticas propios. El error clásico del junior es confundir B2B (invitar a empleados de otra empresa) con B2C (gestionar millones de clientes).",
    example: "La web pública de la aseguradora usa B2C con login de Google y MFA por SMS; el workforce sigue en el tenant corporativo."
  },
  {
    id: "seed-more-auth0",
    term: "Auth0",
    acronym: undefined,
    category: "IAM - Federation / SSO",
    shortDefinition: "Plataforma de identidad para desarrolladores, parte de Okta: login de apps y APIs.",
    longDefinition: "Auth0 es la plataforma CIAM de Okta: SSO con OIDC, conexiones sociales y empresariales, MFA y personalización por código (Actions). Se usa mucho como IdP de producto SaaS. El analista la encuentra como identidad de apps propias y audita tenants, conexiones y logs de login, accesibles por API y panel.",
    example: "El equipo de producto despliega login con Auth0: conexiones de Google y de Entra para partners y MFA obligatorio para los roles admin de la app."
  },
  {
    id: "seed-more-desfase-de-reloj",
    term: "Desfase de reloj (clock skew)",
    acronym: undefined,
    category: "IAM - Federation / SSO",
    shortDefinition: "Tolerancia de tiempo al validar aserciones: causa silenciosa de fallos SSO.",
    longDefinition: "Las aserciones y tokens llevan ventanas de validez (NotBefore, ExpiresOn): si el reloj del SP o del IdP va desviado más de la tolerancia, típicamente unos minutos, la validación falla con aserción aún no válida. Es la primera causa mística de un login que a veces funciona. El analista compara la hora del servidor con NTP antes de culpar al certificado.",
    example: "Un SP Linux sin NTP tenía 3 minutos de adelanto: las aserciones llegaban como aún no válidas; se sincroniza el reloj y el SSO se estabiliza."
  },
  {
    id: "seed-more-token-opaco",
    term: "Token opaco (reference token)",
    acronym: undefined,
    category: "IAM - Federation / SSO",
    shortDefinition: "Token sin contenido legible que se valida consultando al emisor.",
    longDefinition: "A diferencia del JWT, un token opaco es una cadena sin claims: el recurso debe llamar al endpoint de introspección del IdP para saber si es válido y qué permisos trae. Permite revocación instantánea y no expone información en el propio token. El analista lo distingue porque el debugging cambia: no se lee el token, se consulta la introspección.",
    example: "La API interna usa reference tokens: al suspender a un usuario, la introspección devuelve inactivo al instante sin esperar la expiración."
  },

  /* ---- IAM - PAM ---- */
  {
    id: "seed-more-boveda-de-credenciales",
    term: "Bóveda de credenciales (credential vaulting)",
    acronym: undefined,
    category: "IAM - PAM",
    shortDefinition: "Almacenamiento cifrado y central de las contraseñas privilegiadas.",
    longDefinition: "Credential vaulting: las contraseñas de las cuentas admin se guardan cifradas en una bóveda central (CyberArk, Delinea), nunca en hojas de cálculo ni en la memoria del admin. La bóveda controla quién accede, cuándo y con qué aprobación, y rota la clave tras su uso. Es el corazón de todo PAM: sin bóveda no hay control real del privilegio.",
    example: "La clave del firewall perimetral ya no la sabe nadie: vive en la bóveda y el ingeniero la consulta con justificación y sesión grabada."
  },
  {
    id: "seed-more-monitoreo-sesiones",
    term: "Monitoreo y grabación de sesiones",
    acronym: undefined,
    category: "IAM - PAM",
    shortDefinition: "Observación en vivo y grabación de las sesiones privilegiadas.",
    longDefinition: "El PAM actúa como broker: toda sesión de administrador pasa por él, se graba (comandos incluidos) y puede vigilarse en directo o interrumpirse. Ante un incidente, la grabación es evidencia forense de qué pasó exactamente y quién lo hizo. El junior la usa cuando el DBA no recuerda qué ejecutó el martes por la noche.",
    example: "La sesión grabada muestra el DELETE sin WHERE a las 02:13: el postmortem se construye sobre la grabación del PAM, no sobre testimonios."
  },
  {
    id: "seed-more-rotacion-contrasenas",
    term: "Rotación de contraseñas",
    acronym: undefined,
    category: "IAM - PAM",
    shortDefinition: "Cambio programado o tras el uso de las credenciales privilegiadas y de servicio.",
    longDefinition: "El PAM rota contraseñas tras cada check-out, cada cierto tiempo o ante sospecha, con complejidad y unicidad por sistema. Reduce la ventana útil de una credencial filtrada. La rotación de cuentas de servicio exige mapear antes sus dependencias (dónde está la clave embebida) para no romper los procesos nocturnos.",
    example: "Tras el incidente del viernes, la herramienta rota 340 contraseñas admin en 2 horas; antes del PAM ese trabajo eran 3 personas y un mes."
  },
  {
    id: "seed-more-check-in-check-out",
    term: "Préstamo de credenciales (check-in / check-out)",
    acronym: undefined,
    category: "IAM - PAM",
    shortDefinition: "Retirar temporalmente la credencial de la bóveda y devolverla al terminar.",
    longDefinition: "Modelo de uso: el admin hace check-out de la cuenta (queda asignada a él, y la clave se muestra cifrada o se inyecta), trabaja, y al hacer check-in la clave se rota automáticamente y queda libre. Evita que dos personas usen la cuenta a la vez y audita exactamente quién tuvo qué y cuándo. Es la diferencia entre ver la contraseña y usarla de forma controlada.",
    example: "Dos técnicos quieren la misma cuenta de despliegue: el check-out exclusivo del PAM serializa el uso y ambos quedan identificados en el informe."
  },
  {
    id: "seed-more-epm",
    term: "Endpoint Privilege Management (EPM)",
    acronym: "EPM",
    category: "IAM - PAM",
    shortDefinition: "Elevar derechos locales justo para la tarea, sin administrador permanente.",
    longDefinition: "EPM (CyberArk EPM, BeyondTrust, Delinea): en el puesto del usuario permite elevar a administrador aplicaciones concretas (instaladores, consolas) bajo política, sin que su cuenta sea admin local permanente. Combina la eliminación del admin local con la productividad. El proyecto de quitar admin local a 2.000 usuarios se apoya exactamente aquí.",
    example: "El desarrollador ejecuta Visual Studio con elevación aprobada por política, mientras su cuenta cotidiana ya no es admin del portátil."
  },
  {
    id: "seed-more-acceso-permanente",
    term: "Acceso permanente (standing access)",
    acronym: undefined,
    category: "IAM - PAM",
    shortDefinition: "Privilegio asignado fijo, disponible 24/7 aunque no se use: el riesgo a eliminar.",
    longDefinition: "Standing access: el admin es admin siempre, incluso durmiendo, lo que multiplica la superficie de phishing, robo de cookies y fraude interno. Los programas modernos lo reducen a cero permanente y conceden elevaciones puntuales (JIT, ZSP). El porcentaje de privilegio permanente es el KPI estrella de madurez PAM y la pregunta fija de auditoría.",
    example: "El informe del CISO muestra un 78% de admins con acceso permanente a producción; el objetivo anual es bajarlo al 10% vía PIM y acceso JIT."
  },
  {
    id: "seed-more-zsp",
    term: "Zero Standing Privileges (ZSP)",
    acronym: "ZSP",
    category: "IAM - PAM",
    shortDefinition: "Modelo sin privilegio permanente: se eleva solo cuando se necesita.",
    longDefinition: "ZSP: nadie tiene acceso administrativo permanente; se asigna en tiempo real con aprobación, expiración automática y registro completo. Combina JIT, JEA y permisos granulares: en lugar de admin total, admin del recurso X durante la ventana del cambio. Es el estado del arte de PAM cloud y la meta de los programas de madurez.",
    example: "En AWS, el equipo de datos ya no tiene rol fijo: asume un rol JIT de 30 minutos con la aprobación registrada del ticket del cambio."
  },
  {
    id: "seed-more-rol-elegible-vs-activo",
    term: "Rol elegible vs. activo (PIM)",
    acronym: undefined,
    category: "IAM - PAM",
    shortDefinition: "Rol que se puede activar cuando se necesita frente a rol ya asignado.",
    longDefinition: "PIM de Entra distingue las asignaciones elegibles (el usuario puede activar el rol cuando lo necesite, con MFA, justificación y límite de horas) de las activas (el rol está otorgado de forma permanente). La meta es maximizar las elegibles y minimizar las activas. El analista configura la política (ventana de activación, aprobadores) y reporta las activaciones del mes.",
    example: "El administrador de Exchange ya no es activo: es elegible con 8 horas máximo, aprobación del jefe y MFA; el resto del mes su cuenta es un usuario normal."
  },
  {
    id: "seed-more-modelo-de-niveles",
    term: "Modelo de niveles (Tier 0 / 1 / 2)",
    acronym: undefined,
    category: "IAM - PAM",
    shortDefinition: "Segmentación de AD en niveles: identidades, servidores y estaciones.",
    longDefinition: "Tiering model de Microsoft: el Tier 0 controla identidades (DCs, cuentas admin, herramientas de gestión de AD), el Tier 1 los servidores y aplicaciones, y el Tier 2 las estaciones de usuario. Una credencial de Tier 0 nunca debe tocar el Tier 2 y viceversa: la contaminación cruzada es una escalada. Es el modelo de referencia para diseñar cuentas admin dedicadas y PAWs.",
    example: "El hallazgo de que el admin del dominio lee su correo desde el mismo equipo se corrige con cuentas por nivel: la de Tier 0 jamás abre el Outlook."
  },
  {
    id: "seed-more-paw",
    term: "PAW (Privileged Access Workstation)",
    acronym: "PAW",
    category: "IAM - PAM",
    shortDefinition: "Estación dedicada y endurecida para administrar las identidades críticas.",
    longDefinition: "Privileged Access Workstation: equipo dedicado, sin correo ni navegación libre, desde el que se administran los activos de Tier 0. Reduce el phishing contra los administradores, que es la raíz de la mayoría de compromisos totales. Complementa al PAM, no lo sustituye, y desplegarlo en 20 administradores clave suele ser el quick win de hardening.",
    example: "Los 12 administradores del dominio pasan a gestionarlo desde PAWs sin Outlook ni internet general: el phishing a su cuenta diaria ya no alcanza el dominio."
  },
  {
    id: "seed-more-laps",
    term: "LAPS (contraseñas de administrador local)",
    acronym: "LAPS",
    category: "IAM - PAM",
    shortDefinition: "Solución de Microsoft para contraseñas únicas y rotadas del admin local.",
    longDefinition: "Local Administrator Password Solution (versión clásica en AD y Windows LAPS con Intune): cada equipo guarda en el directorio la clave de su administrador local, única y rotada automáticamente. Mata el mito de la clave de admin local igual en todos los equipos. El analista audita su cobertura, y cada lectura de la clave queda registrada.",
    example: "El ransomware usaba la clave local compartida para saltar de equipo en equipo: tras desplegar LAPS, cada estación tiene clave distinta y rotada."
  },
  {
    id: "seed-more-gmsa",
    term: "gMSA (cuenta de servicio administrada de grupo)",
    acronym: "gMSA",
    category: "IAM - PAM",
    shortDefinition: "Cuenta de servicio cuya contraseña genera y rota el propio AD.",
    longDefinition: "Group Managed Service Account: cuenta de AD cuya contraseña de 240 caracteres la genera y rota el propio directorio; los servidores autorizados la obtienen mediante el servicio KDS. Elimina el problema de las claves de servicio embebidas y compartidas. Migrar los servicios a gMSA es la remediación típica de los hallazgos de cuentas de servicio.",
    example: "El servicio de SQL pasa a usar gMSA-SQL01: ya no hay clave en el archivo de configuración y la rotación es invisible para el equipo."
  },
  {
    id: "seed-more-adminsdholder",
    term: "AdminSDHolder y Protected Groups",
    acronym: undefined,
    category: "IAM - PAM",
    shortDefinition: "Mecanismo de AD que protege los grupos privilegiados revirtiendo permisos cada hora.",
    longDefinition: "AdminSDHolder es la plantilla de permisos que el PDC Emulator aplica cada hora a los grupos protegidos (Domain Admins, Account Operators y compañía), reescribiendo la seguridad de sus miembros para evitar delegaciones peligrosas. Efecto lateral: si sacas a alguien de Domain Admins, sus permisos heredados tardan en limpiarse hasta el siguiente ciclo. Se detecta con la bandera adminCount igual a 1, que el analista audita.",
    example: "Se detectan 700 cuentas con adminCount 1 que ya no están en grupos privilegiados: son admins fantasma y se listan para limpieza manual."
  },
  {
    id: "seed-more-gestion-de-secretos",
    term: "Gestión de secretos (secrets management)",
    acronym: undefined,
    category: "IAM - PAM",
    shortDefinition: "Custodia y rotación de credenciales de aplicaciones y workloads, no de personas.",
    longDefinition: "Secrets management (HashiCorp Vault, Azure Key Vault): almacena, rota y entrega credenciales de máquinas (API keys, certificados, cadenas de conexión) bajo política y con auditoría de acceso. Resuelve el dolor de los secretos embebidos en código y pipelines. El junior lo conecta con las NHI: la mayoría de las identidades no humanas viven aquí.",
    example: "El pipeline consulta Key Vault en tiempo de ejecución: tras el incidente del repositorio público, ya no queda ninguna cadena de conexión en el código."
  },
  {
    id: "seed-more-servidor-de-salto",
    term: "Servidor de salto (bastion host)",
    acronym: undefined,
    category: "IAM - PAM",
    shortDefinition: "Equipo intermedio obligatorio y vigilado para acceder a los sistemas críticos.",
    longDefinition: "Jump server o bastión: punto único de acceso (SSH, RDP) desde el que se administran servidores y dispositivos, con MFA, grabación y segmentación de red. Sin él, cualquier VPN es una puerta directa a producción. Se integra con el PAM como puerta de sesión, y el analista revisa quién tiene acceso al salto: es el control más rentable por euro invertido.",
    example: "Para tocar los firewalls hay que pasar por el bastión con MFA y grabación: el acceso directo desde la VPN de empleado quedó cerrado."
  },
  {
    id: "seed-more-inyeccion-de-credenciales",
    term: "Inyección de credenciales (credential injection)",
    acronym: undefined,
    category: "IAM - PAM",
    shortDefinition: "El PAM introduce la contraseña por el usuario, que jamás la ve.",
    longDefinition: "Credential injection: al iniciar la sesión privilegiada, la herramienta teclea la credencial en el destino de forma transparente; el usuario nunca la conoce. Permite contraseñas complejas y rotadas sin compartirlas y sin que el admin las memorice. Elimina de raíz los post-its y el yo ya la sabía de antes.",
    example: "El técnico lanza el RDP desde el portal del PAM: la sesión abre con la clave inyectada de 40 caracteres que nadie ha visto jamás."
  },
  {
    id: "seed-more-cuenta-administracion-dedicada",
    term: "Cuenta de administración dedicada",
    acronym: undefined,
    category: "IAM - PAM",
    shortDefinition: "Cuenta aparte para las tareas admin, separada del correo diario.",
    longDefinition: "Práctica base de higiene privilegiada: el administrador no usa su cuenta de correo y navegación para administrar, sino una cuenta dedicada con MFA fuerte, sin acceso a internet y gobernada por PIM. Reduce el phishing y la mezcla de tokens de sesión. El primer proyecto de todo PAM es inventariar y crear cuentas admin dedicadas por persona.",
    example: "jperez pasa a usar jperez-adm para los servidores y su jperez normal para Teams: el phishing del correo ya no expone producción."
  },
  {
    id: "seed-more-shadow-admins",
    term: "Shadow Admins",
    acronym: undefined,
    category: "IAM - PAM",
    shortDefinition: "Cuentas con privilegio efectivo que no figuran en los grupos admin oficiales.",
    longDefinition: "Identidades con derechos administrativos de facto: dueños de GPO, delegaciones sobre OUs, permisos sobre DCs, membresías en grupos anidados no evidentes o control de herramientas de gestión. Ningún reporte de Domain Admins las muestra. Se descubren con herramientas de análisis de rutas de control, y son el hueco que más sorprende a los auditores.",
    example: "El análisis encuentra que la cuenta svc-backup tiene derechos sobre AdminSDHolder: un no-admin con control del dominio entra al plan de remediación."
  },
  {
    id: "seed-more-derechos-admin-local",
    term: "Derechos de administrador local",
    acronym: undefined,
    category: "IAM - PAM",
    shortDefinition: "Ser admin del propio equipo: riesgo que se elimina o se eleva bajo demanda.",
    longDefinition: "El administrador local instala software, desactiva el antivirus y puede extraer las credenciales de otros usuarios del equipo desde LSASS. La política moderna es quitarlo por defecto y elevar por tarea con EPM o con aprobación. El reporte del porcentaje de usuarios con admin local es el hallazgo de auditoría clásico y un quick win de superficie.",
    example: "El 63% de los portátiles tenía admin local; con EPM y una lista de excepciones aprobadas se baja al 9% en un trimestre."
  },

  /* ---- GRC - Auditoría y Cumplimiento ---- */
  {
    id: "seed-more-prueba-de-controles",
    term: "Prueba de controles (test of controls)",
    acronym: undefined,
    category: "GRC - Auditoría y Cumplimiento",
    shortDefinition: "Verificación de que un control opera de forma efectiva, con evidencia.",
    longDefinition: "Test of controls: el auditor selecciona muestras y comprueba que el control diseñado funciona, por ejemplo que las bajas cierran accesos dentro del plazo y con ticket. Distingue el diseño de la operación: un control bonito en papel pero incumplido en la práctica falla la prueba. El junior IAM prepara la evidencia para estas pruebas y responde los hallazgos.",
    example: "El auditor pide 25 bajas aleatorias del trimestre y comprueba en ServiceNow que las 25 cerraron los accesos en menos de 24 horas."
  },
  {
    id: "seed-more-walkthrough",
    term: "Walkthrough",
    acronym: undefined,
    category: "GRC - Auditoría y Cumplimiento",
    shortDefinition: "Recorrido guiado de un proceso con una transacción real para entenderlo.",
    longDefinition: "En auditoría, el walkthrough es acompañar el proceso de punta a punta con una transacción real (un alta, un cambio de rol) preguntando en cada paso. Sirve para validar el entendimiento y detectar desviaciones antes de la prueba formal. El analista IAM lo recibe: debe poder narrar el flujo JML con evidencia en pantalla.",
    example: "Se hace el walkthrough de un mover: el auditor ve Workday, IGA y AD en vivo y detecta que la revocación de accesos previos es manual y sin registro."
  },
  {
    id: "seed-more-muestreo",
    term: "Muestreo (sampling)",
    acronym: undefined,
    category: "GRC - Auditoría y Cumplimiento",
    shortDefinition: "Selección de una parte de la población para concluir sobre el total.",
    longDefinition: "Sampling: auditar el 100% es inviable, así que se elige una muestra (aleatoria, por riesgo o dirigida) con criterio estadístico o de juicio profesional. Una sola excepción detectada puede magnificarse según el criterio. El analista debe conocer qué población alimenta la muestra: excluir las cuentas de servicio del listado cambia el resultado del test.",
    example: "El auditor muestrea 40 de 12.000 cuentas; incluir 5 de servicio inactivas dispara la excepción: se acuerda delimitar la población por escrito."
  },
  {
    id: "seed-more-papeles-de-trabajo",
    term: "Papeles de trabajo (workpapers)",
    acronym: undefined,
    category: "GRC - Auditoría y Cumplimiento",
    shortDefinition: "Documentación de soporte de la auditoría: evidencia, pruebas y conclusiones.",
    longDefinition: "Workpapers: archivos que respaldan cada conclusión (capturas, listados, actas, scripts ejecutados y su resultado). Permiten que otro auditor llegue a la misma conclusión sin preguntarte, lo que se llama re-performance. En IAM el junior vive generándolos: exportaciones de cuentas, evidencia de aprobación, matrices SoD. Bien indexados salvan auditorías futuras.",
    example: "Cada revisión trimestral genera 12 papeles de trabajo con el hash del export: al reprocesar la auditoría del año pasado, la evidencia vuelve a sostenerse sola."
  },
  {
    id: "seed-more-raci",
    term: "RACI",
    acronym: "RACI",
    category: "GRC - Auditoría y Cumplimiento",
    shortDefinition: "Matriz de responsabilidades: quién hace, aprueba, consulta e informa.",
    longDefinition: "Modelo RACI (Responsible, Accountable, Consulted, Informed) que aclara los papeles en procesos y controles. En IAM es crítico porque intervienen RR. HH., TI, dueños de aplicación y cumplimiento: sin RACI, las bajas se caen entre departamentos. La matriz SoD y la escalada de aprobaciones se apoyan en él.",
    example: "El proceso de alta de contratistas tiene 7 actores; el RACI define que el accountable es el dueño de la app y evita el yo pensaba que lo hacía RR. HH."
  },
  {
    id: "seed-more-iso-27002",
    term: "ISO/IEC 27002",
    acronym: undefined,
    category: "GRC - Auditoría y Cumplimiento",
    shortDefinition: "Catálogo de controles de la familia 27001: 93 controles en 4 temas.",
    longDefinition: "ISO 27002 es la guía que desarrolla los controles referenciales de un SGSI (edición 2022: 93 controles agrupados en organizacional, personas, físico y tecnológico). No es certificable: orienta cómo implementar, incluida la gestión de accesos (controles 5.15 a 5.18). El junior la usa como checklist para responder hallazgos citando el control correspondiente.",
    example: "El hallazgo de cuentas sin revisar se mapea al control 5.18 de 27002 y al 9.2.5 de la versión 2013: el plan de acción cita ambos."
  },
  {
    id: "seed-more-cis-controls",
    term: "CIS Controls",
    acronym: undefined,
    category: "GRC - Auditoría y Cumplimiento",
    shortDefinition: "Lista priorizada de 18 controles de ciberseguridad, en perfiles IG1 a IG3.",
    longDefinition: "CIS Critical Security Controls: lista priorizada de 18 controles con medidas concretas; el 5 y el 6 son de cuentas y control de accesos (inventario de cuentas y gestión de administradores). Se agrupan por perfil, de IG1 básico a IG3. Es la referencia más accionable para hardening: del control se baja al benchmark técnico de cada sistema.",
    example: "El equipo aplica el control 5.1: inventario automatizado de cuentas activas; el delta mensual contra el HRIS se convierte en informe de dirección."
  },
  {
    id: "seed-more-clasificacion-de-datos",
    term: "Clasificación de datos",
    acronym: undefined,
    category: "GRC - Auditoría y Cumplimiento",
    shortDefinition: "Etiquetar la información por sensibilidad para calibrar protección y acceso.",
    longDefinition: "Definir niveles (público, interno, confidencial, restringido) y reglas por nivel: cifrado, acceso restringido, retención. En IAM, la clasificación decide qué aplicación exige MFA fuerte, revisión trimestral o prohibición de invitados. Sin clasificación, todo es importante y por tanto nada recibe control diferenciado.",
    example: "La app de RR. HH. se declara restringida: acceso solo por grupos certificados cada semestre y prohibido el acceso de invitados B2B."
  },
  {
    id: "seed-more-datos-personales",
    term: "Datos personales (PII)",
    acronym: "PII",
    category: "GRC - Auditoría y Cumplimiento",
    shortDefinition: "Información que identifica a una persona: base del RGPD y de su cuidado en IAM.",
    longDefinition: "Cualquier dato que identifique a una persona: nombre, DNI, correo, IP o datos de salud. Su tratamiento activa el RGPD y las leyes locales: base legal, minimización y retención. Para IAM, el directorio entero es PII, así que los exports para auditoría deben minimizarse y protegerse. El junior filtra columnas antes de mandar el listado de usuarios a nadie.",
    example: "El export de auditoría incluye correo y empleadoID: se anonimiza con hash antes de compartirlo con el consultor externo del SOC."
  },
  {
    id: "seed-more-retencion-de-datos",
    term: "Retención de datos",
    acronym: undefined,
    category: "GRC - Auditoría y Cumplimiento",
    shortDefinition: "Plazos de conservación de la información y de los logs según su finalidad.",
    longDefinition: "Cuánto tiempo se guarda cada tipo de dato: contratos 6 años, logs de seguridad 12 a 18 meses, cámaras 30 días. Retener de más es riesgo de privacidad y de menos, incapacidad de investigar. En IAM aplica a los logs de accesos y a las cuentas dormantes: la política define cuándo se archivan o eliminan, y el auditor comprueba que política y sistemas coinciden.",
    example: "El SIEM retiene 90 días pero la política promete 13 meses: se añade un nivel de archivo frío y el hallazgo se cierra con evidencia."
  },
  {
    id: "seed-more-dpo",
    term: "DPO (Delegado de Protección de Datos)",
    acronym: "DPO",
    category: "GRC - Auditoría y Cumplimiento",
    shortDefinition: "Supervisor del cumplimiento de privacidad según el RGPD.",
    longDefinition: "Data Protection Officer: figura del RGPD que vela por el cumplimiento de privacidad, asesora y es punto de contacto de las autoridades. En proyectos IAM revisa finalidad y minimización, por ejemplo qué atributos del HRIS sincroniza el IGA y con qué base legal. Tener canal con el DPO evita sorpresas al activar funcionalidades nuevas de identidad.",
    example: "Antes de activar reportes de riesgo con geolocalización, el equipo IAM consulta al DPO y se acuerda guardar país, no coordenadas."
  },

  /* ---- GRC - Riesgo y Marco Normativo ---- */
  {
    id: "seed-more-triada-cia",
    term: "Tríada CIA",
    acronym: undefined,
    category: "GRC - Riesgo y Marco Normativo",
    shortDefinition: "Confidencialidad, integridad y disponibilidad: los tres objetivos de seguridad.",
    longDefinition: "El modelo básico de la seguridad de la información: confidencialidad (solo quien debe), integridad (correcto y sin alteraciones) y disponibilidad (cuando se necesita). Cada control IAM se mapea a una de las tres: el acceso condicional protege la confidencialidad, la doble aprobación protege la integridad y el contingente del directorio protege la disponibilidad. El junior debe saber clasificar hallazgos en estos términos.",
    example: "El riesgo de cuentas genéricas compartidas se argumenta contra la confidencialidad y la atribución, y se prioriza en las apps más sensibles."
  },
  {
    id: "seed-more-registro-de-riesgos",
    term: "Registro de riesgos (risk register)",
    acronym: undefined,
    category: "GRC - Riesgo y Marco Normativo",
    shortDefinition: "Listado vivo de riesgos con dueño, tratamiento, plan y estado.",
    longDefinition: "Risk register: inventario formal de los riesgos con su identificación, análisis, respuesta, dueño y fechas. Es el artefacto central de la gestión de riesgos y lo que enlaza cada riesgo con controles concretos. El equipo IAM alimenta entradas como acceso permanente excesivo o cuentas de servicio sin dueño, con estado y plan de remediación. Los auditores lo leen entero.",
    example: "El riesgo 047, falta de PAM en el 40% de los sistemas, pasa de abierto a en tratamiento con el plan de fases y evidencia de avance."
  },
  {
    id: "seed-more-apetito-de-riesgo",
    term: "Apetito de riesgo",
    acronym: undefined,
    category: "GRC - Riesgo y Marco Normativo",
    shortDefinition: "Nivel de riesgo que la organización acepta para perseguir sus objetivos.",
    longDefinition: "Risk appetite: declaración de cuánto riesgo tolera la dirección en cada categoría (dinero, reputación, cumplimiento). Define el listón: si el apetito en accesos es bajo, todo acceso privilegiado exige PAM y revisión continua. Sin apetito declarado, las discusiones de riesgo se ganan por volumen de voz; con él, se deciden contra una línea.",
    example: "El apetito define cero tolerancia en el acceso a datos de salud: por eso toda app clínica exige MFA resistente y revisión semestral."
  },
  {
    id: "seed-more-control-compensatorio",
    term: "Control compensatorio",
    acronym: undefined,
    category: "GRC - Riesgo y Marco Normativo",
    shortDefinition: "Control alternativo cuando el principal no es viable: mitiga el mismo riesgo.",
    longDefinition: "Compensating control: cuando la solución ideal (separar funciones o quitar el acceso) no es práctica, se implementa un control alternativo que mitiga suficiente riesgo (grabación de sesiones, doble aprobación, monitoreo intensivo). En auditoría debe documentarse y justificarse; no es hacer la vista gorda. El junior lo propone cuando el negocio se niega a la solución de libro.",
    example: "El único administrador del ERP no puede separarse de la operación: se impone grabación PAM total y revisión mensual de su actividad por el CFO."
  },
  {
    id: "seed-more-dueno-del-riesgo",
    term: "Dueño del riesgo (risk owner)",
    acronym: undefined,
    category: "GRC - Riesgo y Marco Normativo",
    shortDefinition: "Persona accountable del tratamiento de un riesgo concreto.",
    longDefinition: "Risk owner: quien responde de que el riesgo se trate y de que el plan avance; no es necesariamente quien lo ejecuta. Nombrarlo de forma explícita evita los riesgos huérfanos que nadie remedia, igual que las cuentas sin dueño. En IAM, los riesgos de acceso suelen ser propiedad del CISO o del dueño de negocio de la app afectada.",
    example: "El riesgo de grupos AD sin dueño se asigna al líder de infraestructura, con plan trimestral y punto de control en el comité."
  },
  {
    id: "seed-more-kri",
    term: "Indicador clave de riesgo (KRI)",
    acronym: "KRI",
    category: "GRC - Riesgo y Marco Normativo",
    shortDefinition: "Métrica temprana que avisa si un riesgo crece antes de causar impacto.",
    longDefinition: "Key Risk Indicator: métrica correlacionada con un riesgo que se monitorea para detectar deterioro temprano (admins permanentes, accesos sin recertificar, cuentas sin dueño). A diferencia del KPI, que mide desempeño, el KRI mira la amenaza. El junior arma el panel de KRIs de identidad que sube al comité mensual.",
    example: "El KRI de accesos con más de 365 días sin revisión pasa del 4% al 11%: la alerta dispara una campaña de certificación extraordinaria."
  },
  {
    id: "seed-more-analisis-de-brechas",
    term: "Análisis de brechas (gap analysis)",
    acronym: undefined,
    category: "GRC - Riesgo y Marco Normativo",
    shortDefinition: "Comparación del estado actual contra un marco u objetivo para priorizar.",
    longDefinition: "Gap analysis: evaluar las prácticas actuales contra un marco (ISO, NIST, CIS) o contra el diseño objetivo, documentando diferencias y prioridad. Es el arranque estándar de los programas IAM: sin brecha cuantificada no hay roadmap defendible. Cada brecha se enlaza con control, riesgo y estimación de esfuerzo.",
    example: "El gap contra el control 6 de CIS muestra que no existe inventario de cuentas de servicio: primera línea del roadmap del trimestre."
  },
  {
    id: "seed-more-cobit",
    term: "COBIT",
    acronym: "COBIT",
    category: "GRC - Riesgo y Marco Normativo",
    shortDefinition: "Marco de gobierno y gestión de TI de ISACA, basado en objetivos.",
    longDefinition: "COBIT 2019 es el framework de gobierno empresarial de TI que estructura objetivos y procesos (gobernar, evaluar, dirigir y monitorear), alineables con otros marcos. Es el mapa de alto nivel donde se cuelgan ISO 27001 o ITIL. Para el GRC de identidad define la gobernanza y la rendición de cuentas que audita SOX. Se estudia junto a COSO en las certificaciones de auditoría de sistemas.",
    example: "En el diseño del gobierno de accesos se citan los dominios de COBIT para justificar el comité de identidad y sus decisiones documentadas."
  },
  {
    id: "seed-more-plataforma-grc",
    term: "Plataforma GRC",
    acronym: undefined,
    category: "GRC - Riesgo y Marco Normativo",
    shortDefinition: "Herramienta integrada de riesgos, controles, cumplimiento y auditoría.",
    longDefinition: "GRC tooling (ServiceNow GRC o IRM, Archer, MetricStream): sistema central para registrar riesgos, controles, regulaciones, pruebas de auditoría y acciones, con trazabilidad entre todos. Evita el Excel de controles desencajado del negocio. El equipo IAM alimenta la sección de controles de acceso desde su IGA o su PAM, o directamente.",
    example: "La campaña de certificaciones deja evidencia automática en ServiceNow GRC: el auditor ve el control operado sin pedir capturas sueltas."
  },

  /* ---- SOC / SIEM / Cloud Security / Threat ---- */
  {
    id: "seed-more-event-id-4624",
    term: "Event ID 4624",
    acronym: undefined,
    category: "SIEM / Log Management",
    shortDefinition: "Windows: inicio de sesión correcto, con tipo de logon y proceso.",
    longDefinition: "El 4624 registra cada inicio de sesión exitoso en Windows: quién (cuenta y SID), desde dónde (IP y equipo), el tipo de logon (2 interactivo, 3 red, 5 servicio, 10 RDP) y el paquete de autenticación (Kerberos o NTLM). Es EL evento base de la auditoría IAM: partiendo de él se detecta el uso de cuentas de servicio para sesiones interactivas o inicios a horas imposibles.",
    example: "Filtrando 4624 de tipo 10 en madrugada se detecta RDP de la cuenta svc-sql a un servidor de desarrollo: uso indebido de una cuenta de servicio."
  },
  {
    id: "seed-more-event-id-4625",
    term: "Event ID 4625",
    acronym: undefined,
    category: "SIEM / Log Management",
    shortDefinition: "Windows: inicio de sesión fallido, la base de detectar el spraying.",
    longDefinition: "Registra cada intento fallido con su substatus (0xC000006A contraseña errónea, 0xC0000072 cuenta deshabilitada, 0xC0000234 bloqueada). Analizado en masa (mismo usuario con muchos fallos, o muchos usuarios con un fallo cada uno) detecta password spraying y fuerza bruta. Es el evento con el que el junior construye su primera detección.",
    example: "Doce mil eventos 4625 en una hora con usuarios aleatorios y el mismo substatus: el patrón de goteo del spraying queda a la vista en el SIEM."
  },
  {
    id: "seed-more-event-id-4648",
    term: "Event ID 4648",
    acronym: undefined,
    category: "SIEM / Log Management",
    shortDefinition: "Windows: uso explícito de credenciales alternativas (runas).",
    longDefinition: "Se genera cuando alguien autentica con credenciales explícitas distintas de su sesión, como con runas o al acceder a recursos con otra cuenta. También lo usan herramientas de movimiento lateral. Ver un 4648 con una cuenta admin desde un equipo de usuario es alerta directa de uso indebido o de intrusión en curso.",
    example: "Una estación genera 4648 con la cuenta admin-dominio hacia un DC: se investiga y resulta el técnico usando runas sin registrar el cambio."
  },
  {
    id: "seed-more-event-id-4672",
    term: "Event ID 4672",
    acronym: undefined,
    category: "SIEM / Log Management",
    shortDefinition: "Windows: inicio de sesión con privilegios especiales asignados.",
    longDefinition: "Aparece cuando la sesión recibe privilegios elevados (SeDebug, SeBackup, SeTcb), típicamente para administradores, servicios o cuentas con derechos sensibles. Sirve para inventariar quién opera con privilegios y detectar sesiones privilegiadas fuera de las ventanas del PAM. Filtrar 4672 con usuarios no esperados es un control operacional clásico.",
    example: "El reporte de 4672 muestra 23 cuentas con SeDebug que no están en el inventario del PAM: 15 resultaron servicios mal configurados."
  },
  {
    id: "seed-more-event-id-4720",
    term: "Event ID 4720",
    acronym: undefined,
    category: "SIEM / Log Management",
    shortDefinition: "Windows: creación de una cuenta de usuario en AD.",
    longDefinition: "Registra quién creó qué cuenta y cuándo, con los atributos iniciales. Es pieza central de auditoría: las cuentas creadas fuera del proceso JML, sin ticket, son hallazgo inmediato. Correlacionado con el 4726 (borradas) y el 4738 (modificadas) arma el ciclo de vida completo de las cuentas para los auditores.",
    example: "El control detecta una cuenta creada sin ticket en ServiceNow: era de un proyecto externo; se regulariza el proceso con el dueño de la app."
  },
  {
    id: "seed-more-event-id-4726",
    term: "Event ID 4726",
    acronym: undefined,
    category: "SIEM / Log Management",
    shortDefinition: "Windows: eliminación de una cuenta de usuario en AD.",
    longDefinition: "Registra la baja de una cuenta: quién, cuándo y si el objeto fue borrado o movido a la papelera. Junto con la fecha de salida del HRIS permite comprobar que las salidas de la empresa realmente eliminan los accesos en plazo. Las bajas tardías detectadas cruzando el 4726 son el ITGC que nunca falta en las auditorías de accesos.",
    example: "El auditor cruza el 4726 contra Workday: 9 de 10 bajas tardaron más de 5 días; se abre una acción para automatizar la eliminación."
  },
  {
    id: "seed-more-event-id-4728",
    term: "Event ID 4728",
    acronym: undefined,
    category: "SIEM / Log Management",
    shortDefinition: "Windows: miembro añadido a un grupo global.",
    longDefinition: "Se dispara al añadir una cuenta a un grupo global de AD, con el operador, la cuenta y el grupo. Correlacionado con la lista de grupos privilegiados (Domain Admins, grupos de acceso crítico) es la detección mínima de escalada. Los añadidos sin ticket de cambio se tratan como incidente hasta que se justifiquen.",
    example: "Alerta por 4728 al grupo de administradores del firewall: el operador fue una cuenta de script sin aprobación del CAB: se revierte y se hace postmortem."
  },
  {
    id: "seed-more-event-id-4732",
    term: "Event ID 4732",
    acronym: undefined,
    category: "SIEM / Log Management",
    shortDefinition: "Windows: miembro añadido a un grupo de seguridad local.",
    longDefinition: "Registra las altas en grupos locales, y la más vigilada es la 4732 al grupo Administrators de un equipo: el indicador de escalada local en estaciones y servidores. Su monitoreo es un control mínimo del SOC: añadirse al grupo admin local es la firma de casi toda intrusión con éxito.",
    example: "Un 4732 en la estación de contabilidad añade a un usuario a Administrators: el EDR aísla el equipo y el triage lo clasifica como comprometido."
  },
  {
    id: "seed-more-event-id-4740",
    term: "Event ID 4740",
    acronym: undefined,
    category: "SIEM / Log Management",
    shortDefinition: "Windows: cuenta bloqueada por intentos fallidos.",
    longDefinition: "Marca el lockout: sirve para detectar fuerza bruta, para bloqueos maliciosos deliberados contra cuentas clave, o para una app con la contraseña vencida en bucle. Correlacionar el 4740 con los 4625 del mismo usuario distingue el ataque del usuario despistado. El service desk lo usa como cola de trabajo y el SOC como señal.",
    example: "Tres noches seguidas hay 4740 de la misma cuenta a las 03:00 con 4625 previos desde la VPN: se descubre un script con la clave vencida."
  },
  {
    id: "seed-more-event-id-4767",
    term: "Event ID 4767",
    acronym: undefined,
    category: "SIEM / Log Management",
    shortDefinition: "Windows: cuenta desbloqueada, quizá de forma manual por un admin.",
    longDefinition: "Registra cada desbloqueo (manual o automático) con el operador. Importa porque un atacante con medios puede desbloquear las cuentas que el sistema bloqueó, y los desbloqueos fuera de horario por personas no esperadas son señal. Aparece en el flujo diario del helpdesk y en las investigaciones de cuenta comprometida.",
    example: "Un 4767 a las 04:50 por la cuenta de soporte nocturno sin ticket asociado: la investigación revela que esa cuenta estaba comprometida."
  },
  {
    id: "seed-more-event-id-4768",
    term: "Event ID 4768",
    acronym: undefined,
    category: "SIEM / Log Management",
    shortDefinition: "Windows: solicitud Kerberos de un TGT (ticket granting ticket).",
    longDefinition: "Kerberos Authentication Ticket Request: el primer paso del login Kerberos. Analizado en masa sirve para detectar patrones anómalos (preautenticación deshabilitada, cifrado débil RC4, indicios de AS-REP roasting) y para trazar la autenticación de una cuenta concreta. Junto con el 4769 arma el flujo completo de tickets de una cuenta.",
    example: "Los 4768 con cifrado RC4 hacia cuentas de servicio alimentan el plan de deshabilitar RC4 en todo el dominio, con informe para el comité."
  },
  {
    id: "seed-more-event-id-4769",
    term: "Event ID 4769",
    acronym: undefined,
    category: "SIEM / Log Management",
    shortDefinition: "Windows: solicitud Kerberos de un ticket de servicio (TGS).",
    longDefinition: "Kerberos Service Ticket Request: se pide acceso a un servicio concreto (SPN). Es el evento que delata el Kerberoasting: miles de 4769 cifrados en RC4 desde una estación hacia SPNs de servicio. Monitorearlo por volumen, tipo de cifrado y origen es la detección estándar del SOC frente a este ataque.",
    example: "La detección de más de 50 TGS RC4 por minuto desde un host salta en el SIEM: el analista confirma Kerberoasting y contiene el equipo."
  },
  {
    id: "seed-more-event-id-4776",
    term: "Event ID 4776",
    acronym: undefined,
    category: "SIEM / Log Management",
    shortDefinition: "Windows: validación de credenciales NTLM contra el controlador.",
    longDefinition: "Cada validación NTLM (de la estación hacia el DC) genera un 4776: se lee para saber si el dominio aún usa NTLM y en qué volumen, y para detectar cadenas de relay o pass-the-hash. Es la métrica del proyecto de matar NTLM: sin conocer su uso real no se planifica el bloqueo.",
    example: "El conteo mensual de 4776 muestra que el 40% de las autenticaciones aún son NTLM: se listan las apps culpables antes del bloqueo por GPO."
  },
  {
    id: "seed-more-ciem",
    term: "CIEM (Cloud Infrastructure Entitlement Management)",
    acronym: "CIEM",
    category: "Cloud Security",
    shortDefinition: "Gestión de entitlements cloud: visibilidad y mínimo privilegio multi-cloud.",
    longDefinition: "CIEM: analiza los permisos efectivos en AWS, GCP y Azure (identidades humanas y no humanas, roles y políticas) contra su uso real, recalcula el mínimo privilegio y detecta combinaciones tóxicas. Responde a la pregunta de por qué ese workload tiene permiso de administrador en toda la cuenta. El analista IAM lo opera junto al IGA: es la extensión natural del gobierno al cloud.",
    example: "El CIEM reporta 2.300 permisos sin uso en 90 días y 4 roles con comodines totales: el 60% de lo concedido sobra y se recorta."
  },
  {
    id: "seed-more-cspm",
    term: "CSPM (Cloud Security Posture Management)",
    acronym: "CSPM",
    category: "Cloud Security",
    shortDefinition: "Postura de seguridad cloud: detección de desconfiguraciones en los recursos.",
    longDefinition: "CSPM: escanea la configuración de los recursos cloud contra benchmarks CIS y políticas internas: buckets públicos, claves sin rotar, redes abiertas o roles excesivos. Trabaja a nivel de infraestructura y complementa al CIEM, que mira permisos. Los hallazgos IAM de un CSPM, como la cuenta root sin MFA, llegan directamente al equipo de identidad.",
    example: "El CSPM marca la cuenta root de AWS sin MFA y 8 claves de acceso de más de un año: entran al backlog cloud como críticos."
  },
  {
    id: "seed-more-itdr",
    term: "ITDR (Identity Threat Detection and Response)",
    acronym: "ITDR",
    category: "Threat Hunting",
    shortDefinition: "Detección y respuesta de amenazas de identidad: vigilar el propio IAM.",
    longDefinition: "ITDR: disciplina y herramientas que monitorean identidades, autenticaciones y cambios de privilegio para detectar ataques (ATO, golden ticket, DCSync, consentimientos ilícitos, NTLM relay) y responder cortando sesiones o revocando tokens. Complementa al IGA y al PAM, que previenen, con detección activa. Es la progresión natural del IAM analyst hacia el puente con el SOC.",
    example: "El ITDR alerta de un DCSync desde un servidor que no es DC y ejecuta la respuesta: aislar el host y pedir la rotación de KRBTGT."
  },
  {
    id: "seed-more-t1078",
    term: "T1078 (Cuentas válidas)",
    acronym: undefined,
    category: "Threat Hunting",
    shortDefinition: "ATT&CK: usar cuentas legítimas, la técnica más frecuente contra identidad.",
    longDefinition: "Táctica de persistencia, evasión y acceso inicial con cuentas legítimas (locales, de dominio, cloud o por defecto): el atacante entra como un empleado. Al no haber exploits, solo se detecta por uso anómalo de la cuenta (geografía, horario, recursos). Es LA técnica que hay que conocer: más de la mitad de las intrusiones la usan, y justifica todo el stack IAM moderno.",
    example: "El reporte mensual del SOC muestra 14 intrusiones y 11 usaron T1078 con credenciales filtradas: el plan prioriza MFA resistente y CAE."
  },
  {
    id: "seed-more-t1098",
    term: "T1098 (Manipulación de cuentas)",
    acronym: undefined,
    category: "Threat Hunting",
    shortDefinition: "ATT&CK: manipular la cuenta para persistir (nuevo MFA, claves, roles).",
    longDefinition: "Account Manipulation: el atacante ya dentro modifica la cuenta para persistir: añade un MFA propio, registra dispositivos, crea claves SSH o de API o se otorga roles. Es el paso post-ATO clásico en cloud. Su detección exige monitorear los cambios de credenciales y factores: los audit logs de Entra y las alertas de re-registro de MFA.",
    example: "La cuenta del CFO recibe un método de autenticación nuevo de madrugada: alerta T1098; se corta la sesión y se re-verifica al usuario por videollamada."
  },
  {
    id: "seed-more-piramide-del-dolor",
    term: "Pirámide del dolor (Pyramid of Pain)",
    acronym: undefined,
    category: "Threat Intel",
    shortDefinition: "Modelo del coste de invalidar IOCs: los TTP del ápice duelen más.",
    longDefinition: "Pyramid of Pain de David Bianco: de la base al ápice, hash, IP, dominio, artefactos de red y host, y TTP; cuanto más arriba invalidas algo, más le duele al atacante cambiarlo. Bloquear una IP es molestarle; detectar su TTP le obliga a reinventarse. Para el SOC y el IAM traduce prioridades: construir detecciones de TTP (como T1078) vale más que listas negras de IPs.",
    example: "La lista de IPs del feed se bloquea cada día (base de la pirámide); la detección de pass-the-hash ataca el ápice: el atacante debe cambiar de método."
  },
  {
    id: "seed-more-ioa",
    term: "IOA (Indicator of Attack)",
    acronym: "IOA",
    category: "Threat Intel",
    shortDefinition: "Señal de ataque en curso, antes del daño, a diferencia del IOC.",
    longDefinition: "Indicador de ataque: comportamiento o configuración que revela intención o actividad inmediata (una cuenta admin autenticando desde un país raro, un volcado de LSASS), mientras el IOC evidencia un compromiso ya ocurrido (un hash malicioso). Los IOA permiten actuar antes del impacto: por eso los EDR y las detecciones IAM modernas se construyen sobre IOA.",
    example: "Un volumen imposible de TGS en RC4 por minuto es un IOA: se actúa mientras ocurre, sin esperar al IOC del malware que viene después."
  },
  {
    id: "seed-more-cadena-de-custodia",
    term: "Cadena de custodia",
    acronym: undefined,
    category: "Incident Response",
    shortDefinition: "Registro continuo de quién manipuló la evidencia, cómo y cuándo.",
    longDefinition: "Chain of custody: documentación que garantiza que la evidencia digital no se alteró: quién la recogió, con qué herramienta, su hash y dónde se guardó. Sin ella, un incidente puede ganarse técnicamente y perderse legalmente. En incidentes IAM (exports de logs, grabaciones PAM, volcados), el analista debe preservarla desde el primer minuto.",
    example: "Se exporta el sign-in log del usuario comprometido con hash y acta firmada: la cadena de custodia permite usarlo en el expediente del despido."
  },
  {
    id: "seed-more-cyber-kill-chain",
    term: "Cyber Kill Chain",
    acronym: undefined,
    category: "SOC Tier 2 - Investigación",
    shortDefinition: "Modelo de Lockheed Martin: 7 fases del ataque, del reconocimiento a las acciones.",
    longDefinition: "Cyber Kill Chain: reconocimiento, armamentización, entrega, explotación, instalación, comando y control, y acciones sobre los objetivos. Permite mapear detecciones y controles a cada fase y descubrir huecos. Aunque el enfoque moderno sea ATT&CK, más granular, sigue siendo el modelo más citado en entrevistas para explicar dónde corto la cadena.",
    example: "El equipo mapea sus detecciones a las fases: brilla en la entrega por correo pero no tiene nada en el comando y control; el plan añade monitoreo de beacons."
  },
  {
    id: "seed-more-runbook",
    term: "Runbook",
    acronym: undefined,
    category: "SOC Tier 1 - Triage",
    shortDefinition: "Procedimiento paso a paso y operativo para ejecutar una tarea repetitiva.",
    longDefinition: "Documento operacional (distinto del playbook, que es el plan de alto nivel): pasos numerados, comandos, criterios de decisión y escalado para tareas concretas, como el triage de lockouts o la verificación de un pico de 4625. Reduce la dependencia de personas y los errores del turno nocturno. El junior IAM escribe y mejora runbooks desde el primer mes.",
    example: "El runbook de cuenta bloqueada sospechosa guía al turno nocturno: comprobar 4625, revisar fuentes, verificar identidad y desbloquear solo con ticket."
  },
  {
    id: "seed-more-segmentacion-de-red",
    term: "Segmentación de red",
    acronym: undefined,
    category: "Network Security",
    shortDefinition: "Dividir la red en zonas para limitar el movimiento lateral.",
    longDefinition: "Separar la red en zonas por función o sensibilidad (usuarios, servidores, gestión, invitados) con controles entre ellas. Limita el movimiento lateral: la estación infectada no alcanza los DC ni el ERP sin cruzar un firewall. En IAM se conecta con el tiering: las herramientas de gestión de AD solo viven en la zona de administración.",
    example: "Tras el incidente se aísla la VLAN de gestión, donde viven los DC y el PAM: la estación comprometida ya no ve el puerto 445 de los controladores."
  },
  {
    id: "seed-more-aislamiento-endpoint",
    term: "Aislamiento de endpoint",
    acronym: undefined,
    category: "Endpoint / EDR",
    shortDefinition: "Corte de red selectivo del equipo desde la consola EDR, sin apagarlo.",
    longDefinition: "La acción de contención más usada: el EDR aísla el equipo de la red, salvo el canal de gestión, sin apagarlo, preservando la memoria y la evidencia para investigar. Se aplica ante un compromiso confirmado (malware, pentest, pass-the-ticket detectado). El junior IAM la ve cuando su detección dispara la contención del host con las credenciales robadas.",
    example: "Confirmado el pass-the-ticket desde un equipo de laboratorio, el Tier 2 lo aísla desde el EDR y la investigación conserva la memoria para el análisis."
  },
];
