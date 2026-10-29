# IAM_ROADMAP_COMPLETENESS_REVIEW.md

**Revisión exhaustiva del roadmap IAM de VaultNotes — validación contra el roadmap original**

- **Fecha de la revisión:** 2026-01-29
- **Alcance:** exclusivamente el roadmap IAM (dataset `src/vault/data/roadmapData.ts` + su render en la vista Roadmap IAM). No se auditó código general, otros pilares (SOC/HelpDesk/SysAdmin) ni se rediseñó el roadmap desde cero.
- **Fuentes utilizadas (en orden):**
  1. **Roadmap original:** recuperado íntegro en `upload/Pasted Content_1793284736915.txt` — *"Roadmap maestro de IAM Analyst: de estudiante a profesional preparado para trabajar remoto desde Colombia"* (2.114 líneas, 95,7 KB; existen 4 copias idénticas en `upload/`). **El documento original SÍ estaba disponible** para la comparación completa.
  2. **Roadmap implementado:** `src/vault/data/roadmapData.ts` (2.249 líneas), leído íntegro ítem por ítem.
  3. **Contexto V13:** 30 fases / 315 ítems declarados (23 fases de contenido original + 7 fases nuevas + ~96 ítems adicionales).

---

## A. Resultado general

### Estado de fidelidad respecto al roadmap original

**FIEL Y COMPLETO.** Tras la comparación requisito por requisito, **el 100 % del contenido recuperable del roadmap original tiene hoy una correspondencia verificable** en el dataset de VaultNotes, con nivel de detalle igual o superior al original en todos los bloques. El roadmap original está disponible íntegro, por lo que esta afirmación se apoya en una comparación real, no parcial.

**Nota sobre la estructura:** el dataset no tiene 30 fases / 315 ítems (V13), sino **34 fases / 373 ítems**, repartidas en 3 tiers + proyecto final. El crecimiento posterior a V13 fue estructural, sin pérdida de contenido: 4 fases nuevas (`Fundamentos Técnicos`, `GRC`, `Portfolio GitHub`, `Mercado Laboral`) **extrajeron y ampliaron** bloques que en V13 vivían comprimidos dentro de otras fases. Ninguna fase del V13 fue eliminada ni fusionada; ninguna sección del documento original quedó sin cobertura.

### Cobertura total comprobada

| Bloque del original | Cobertura |
|---|---|
| Perfil objetivo + mercado laboral (§1–§2) | COMPLETO |
| Fase 1 — Fundamentos técnicos (§3) | COMPLETO (tras 6 correcciones de detalle) |
| Fase 2 — Conceptos IAM (§4) | COMPLETO |
| Fase 3 — Active Directory (§5) | COMPLETO (proyecto AD Access Audit Lab completado) |
| Fase 4 — Microsoft Entra ID (§6) | COMPLETO (tras recuperar Seamless SSO, Authentication Context, multitenant, papelera Entra) |
| Fase 5 — SSO, federación, protocolos (§7) | COMPLETO (tras recuperar RFC 9700/ROPC, firma JWT) |
| Fase 6 — PowerShell, Graph, automatización (§8) | COMPLETO |
| Fase 7 — IGA (§9) | COMPLETO (matriz de 9 columnas del original restaurada) |
| Fase 8 — PAM e identidades no humanas (§10) | COMPLETO |
| Fase 9 — Logs, KQL, investigación (§11) | COMPLETO |
| Fase 10 — GRC (§12) | COMPLETO |
| Parte III — Portfolio GitHub (§13–§14) | COMPLETO |
| Parte IV — SC-300, operación, inglés, capstone (§15–§18) | COMPLETO |
| Parte V — Búsqueda de empleo (§19–§23) | COMPLETO (las 17 búsquedas guardadas restauradas) |
| 7 fases nuevas V13 (Hygiene, KPIs, Role Mining, PAM Profundo, Multi-Cloud, Zero Trust, DR) | COMPLETAS — conservadas íntegras, sin duplicar conceptos existentes |

### Principales fortalezas

1. **Profundidad superior al original en casi todas las fases**: cada ítem exige un criterio de salida verificable ("criterio de listo", evidencias de GitHub, respuestas de entrevista de 60–90 segundos), algo que el original pedía pero no estructuraba.
2. **Las 7 fases nuevas aportan competencias reales y no duplican**: Hygiene (fase 10), KPIs (13), Role Mining (15), PAM en profundidad (20), Multi-Cloud (27), Zero Trust (29) y DR (30) cubren vacíos genuinos del original y están pedagógicamente posicionadas después de sus prerrequisitos.
3. **Los 10 proyectos del portfolio están conservados con su definición completa**: herramientas, funcionalidades, requisitos de calidad y "qué demuestra" (ítems rm-f33-1/2/3), con la estructura de repositorio del original (§13.1), la priorización 5+2 (§13.2), la regla de honestidad simulado/implementado/diseñado y la matriz de licencias gratuita→P1→P2→Governance (§14).
4. **Casos de estudio con análisis técnico fundamentado**: Okta 2022 (rm-f9-12, técnicamente correcto), MGM 2023 (rm-f16-11, correcto) y Uber 2022 (rm-f16-2 — **corregido** en esta revisión: la versión previa atribuía "consent phishing" al caso Uber, que no forma parte de ese incidente).
5. **Progresión pedagógica coherente**: Tier 1 (fases 1–13) construye del diagnóstico técnico al ciclo de vida medible; Tier 2 (14–25) añade gobierno y plataformas enterprise; Tier 3 (26–30) nube y arquitectura; el tramo final (31–34) convierte todo en portfolio, certificación y empleo. Los contenidos avanzados (PIM, Zero Trust, DR) aparecen siempre después de sus prerrequisitos conceptuales.
6. **El índice de ítems es estable y el progreso del usuario es invulnerable a esta revisión**: las correcciones se hicieron *in-place* sobre el texto; no se crearon ni borraron IDs (34 fases / 373 ítems antes y después, 0 IDs duplicados), y el checklist del usuario vive en Dexie por ID.

### Omisiones importantes (encontradas y corregidas en esta revisión)

Ninguna omisión permanece. Las detectadas antes de corregir fueron 9 de cobertura y 2 de exactitud técnica (detalle en E).

### Problemas técnicos o pedagógicos detectados

- **2 INCORRECTO técnicos:** referencia desactualizada a NIST SP 800-63B (la vigente es la **800-63-4**, agosto 2025) y descripción inexacta del caso Uber 2022. Ambos corregidos.
- **1 INCORRECTO técnico menor:** frase confusa sobre herencia de políticas en GCP IAM ("full-accional") — reformulada con precisión.
- **1 PARCIAL pedagógico:** el AD Access Audit Lab del original perdía 4 de sus 5 detecciones específicas y el entregable de GitHub — restaurado completo.
- **11 errores lingüísticos/estilo** que rebajaban el nivel profesional del texto ("rehechar"×4, "Anatomy"×3, "correcte", "federá", "ingeria", "la CRITERIA", "el future", "inventarían" por "inventariar") — todos corregidos; y 2 menciones obsoletas al nombre antiguo de la app (GITHUBVAULT→VaultNotes).

### Cambios efectuados

**34 ediciones in-place sobre 32 ítems** (detalle y justificación en la sección E). Sin cambios de estructura, sin nuevos IDs, sin eliminaciones de contenido.

---

## B. Tabla de las fases (34 reales del dataset)

Estados: COMPLETO / PARCIAL / SUPERFICIAL / AUSENTE / INCORRECTO / DUPLICADO. La columna "Correcciones" refleja lo aplicado en esta revisión.

| # | Fase (ID) | Ítems | Cobertura | Contenido faltante (pre-corrección) | Problemas detectados | Correcciones |
|---|---|---|---|---|---|---|
| 1 | Fundamentos Técnicos (rm-f31) | 11 | COMPLETO | ForEach/Group-Object, servicios Linux (systemd), recursos Pro Git/MDN/Postman | — | 4 ampliaciones de fidelidad al original §3 |
| 2 | IAM Fundamentals & Governance (rm-f1) | 14 | COMPLETO | — | Typo "correcte" | Corregido typo |
| 3 | Active Directory Core (rm-f2) | 14 | COMPLETO | NTLM como protocolo, SID, delegación restringida, 5 detecciones del AD Access Audit Lab | Proyecto §5 parcial | NTLM+SID+delegación añadidos; AD Lab completado |
| 4 | Directory Services & LDAP (rm-f15) | 10 | COMPLETO | — | — | Ninguna (excede el original) |
| 5 | Entra ID & Governance (rm-f3) | 14 | COMPLETO | Seamless SSO, migración federado→managed, Authentication Context, plantillas CA, single/multitenant + app roles, papelera de Entra | 4 vacíos puntuales del original §6 | 4 recuperaciones (rm-f3-1/2/10/11) |
| 6 | Graph API para IAM (rm-f4) | 11 | COMPLETO | — | — | Ninguna |
| 7 | SSO, Federación & SCIM (rm-f5) | 14 | COMPLETO | RFC 9700 + ROPC deprecated, firma en validación JWT | Typo "federá" | RFC 9700/ROPC añadidos (rm-f5-8); firma (rm-f5-2); typo |
| 8 | MFA & Autenticación Moderna (rm-f16) | 12 | COMPLETO | — | **NIST 800-63B desactualizado**; Uber 2022 inexacto | NIST→800-63-4 (rm-f16-8); Uber corregido (rm-f16-2) |
| 9 | Identity Life-Cycle & Provisioning (rm-f17) | 12 | COMPLETO | — | — | Ninguna (los 8 casos JML alternativos del original ya estaban en rm-f17-12) |
| 10 | IAM Hygiene & Campañas (rm-f24) ★ | 10 | COMPLETO | — | — | Ninguna |
| 11 | Automatización IAM & PowerShell (rm-f6) | 11 | COMPLETO | — | — | Ninguna |
| 12 | Troubleshooting IAM Operations (rm-f7) | 11 | COMPLETO | "permisos requeridos" y "criterios de escalamiento" en la plantilla de playbooks (§16.2 del original) | Plantilla incompleta vs original | rm-f7-4 completado; "Rehecharlas"→"Ensayarlas" |
| 13 | IAM Metrics, KPIs & Reporting (rm-f25) ★ | 9 | COMPLETO | — | — | Ninguna |
| 14 | Access Role Model (rm-f18) | 12 | COMPLETO | Columnas exactas de la matriz del original (§9.3) | Matriz sin las 9 columnas | rm-f18-3 completado con las 9 columnas |
| 15 | Role Engineering & Minería (rm-f26) ★ | 9 | COMPLETO | — | — | Ninguna |
| 16 | Granting (rm-f19) | 11 | COMPLETO | — | — | Ninguna (los 10 pasos del original §16.1 ya estaban íntegros) |
| 17 | Revoking & Deprovisioning (rm-f20) | 10 | COMPLETO | — | — | Ninguna |
| 18 | Access Reviews & Certificaciones (rm-f21) | 12 | COMPLETO | — | — | Ninguna |
| 19 | PAM (rm-f11) | 12 | COMPLETO | — | — | Ninguna |
| 20 | PAM en Profundidad (rm-f27) ★ | 11 | COMPLETO | — | Anglicismos "Anatomy"×3 | Corregidos a "Anatomía" |
| 21 | Okta Workforce Identity (rm-f9) | 12 | COMPLETO | — | — | Ninguna (caso Okta 2022 verificado correcto) |
| 22 | Arquitectura IGA (rm-f10) | 13 | COMPLETO | — | — | Ninguna (los 13 componentes del original §9.1 íntegros en rm-f10-13) |
| 23 | GRC y Evidencias (rm-f32) | 7 | COMPLETO | — | — | Ninguna |
| 24 | Plataformas Enterprise: Ping/ForgeRock/IBM/Oracle (rm-f22) | 11 | COMPLETO | — | "la CRITERIA", "el future" | Corregidos (rm-f22-11) |
| 25 | ITDR (rm-f8) | 11 | COMPLETO | — | — | Ninguna |
| 26 | AWS IAM (rm-f12) | 10 | COMPLETO | — | — | Ninguna |
| 27 | Multi-Cloud: Azure, GCP & k8s (rm-f28) ★ | 9 | COMPLETO | — | Frase GCP "full-accional" técnicamente confusa | Reformulada con precisión (rm-f28-3) |
| 28 | Identidades No-Humanas (rm-f23) | 10 | COMPLETO | — | — | Ninguna |
| 29 | Zero Trust & Identity-Centric (rm-f29) ★ | 10 | COMPLETO | — | — | Ninguna |
| 30 | IAM DR, Break-Glass & Resiliencia (rm-f30) ★ | 9 | COMPLETO | — | "ingeria"; "carpetas GITHUBVAULT" | Corregidos ambos |
| 31 | Portfolio GitHub: 10 Proyectos (rm-f33) | 10 | COMPLETO | — | "que inventarían"→"para inventariar"; "rehechadas"; GITHUBVAULT | Corregidos |
| 32 | Enterprise Lab "InnovateCorp" (rm-f13) | 13 | COMPLETO | — | — | Ninguna (11 preguntas + 11 entregables del capstone §18 íntegros en rm-f13-13) |
| 33 | Certificación y Estrategia Laboral (rm-f14) | 9 | COMPLETO | — | "REHECHAR/rehechada"×3 | Corregidos |
| 34 | Mercado Laboral Remoto (rm-f34) | 9 | COMPLETO | 3 de las 17 búsquedas guardadas del original §19.2 | Búsquedas incompletas | Restauradas (rm-f34-3) |

★ = una de las **siete fases nuevas** de V13. Las 23 fases de contenido original están todas presentes con su profundidad; las 4 fases estructurales post-V13 (#1, #23, #31, #34) redistribuyen y amplían bloques del documento original sin perder nada.

**Duplicaciones evaluadas:** las parejas aparentes son divisiones intencionales de niveles de dominio, no duplicados: rm-f18 (diseño del modelo) vs rm-f26 (minería y métricas de calidad); rm-f11 (conceptos/arquitectura PAM) vs rm-f27 (plataformas por vendor); SoD en rm-f1-3 (concepto) / rm-f18-4 (matriz del modelo) / rm-f21-5 (campañas focales); JML en rm-f1-1 (definición Tier 1) / rm-f17 (operación medible). El único solape menor detectado (rm-f4-5 vs rm-f4-7 en comandos del SDK) es tolerable como "cheatsheet + práctica" y no se eliminó por instrucción de no quitar contenido que aporta.

---

## C. Matriz de trazabilidad (original → VaultNotes)

| Sección del roadmap original | Dónde vive en VaultNotes | Estado |
|---|---|---|
| §1 Vacantes reales y 3 tipos de puesto | rm-f34-1 (tabla de cargos por prioridad), rm-f34-2 (títulos alternos) | COMPLETO |
| §2 Perfil objetivo y tabla "cómo aprovechar lo que sabes" | ROADMAP_HEADER (specialization + edge SOC→ITDR), rm-f14-2 | COMPLETO |
| §3.1 Windows como plataforma de identidad | rm-f31-1 | COMPLETO |
| §3.1 Linux (passwd/shadow, ACL, sudo, SSH, LDAP, logs, ciclo de vida, servicios) | rm-f31-2, rm-f31-3 | COMPLETO (servicios añadidos) |
| §3.2 Redes (DNS, TCP/IP, HTTP(S), TLS, proxy/VPN, NTP, firewall) | rm-f31-4 | COMPLETO |
| §3.3 Formatos (JSON/CSV/YAML, HTTP, Git, Bash/PS/Python, SQL, regex, REST) + recursos | rm-f31-5/6/7/8 + rm-f6 | COMPLETO (recursos MDN/Postman/Pro Git restaurados) |
| §3.3 Prueba de salida (separar red/cuenta/grupo/authZ/app/sync) | rm-f31-9 | COMPLETO |
| §4.1 Vocabulario raíz (13 términos) + explicación a no técnico | rm-f1-12 | COMPLETO |
| §4.2 Tipos de identidad (9 tipos) | rm-f1-13 | COMPLETO |
| §4.3 Dominios IAM (ILM/AM/IGA/PAM/NHI) | rm-f1-13 | COMPLETO |
| §4.4 Modelos (RBAC/ABAC/ACL/LP/SoD/NtK/JIT/JEA/ZT/AccessCert/Birthright/ExcMgmt) | rm-f1-2, rm-f1-3, rm-f1-14, rm-f1-6 | COMPLETO |
| §4.5 JML + 8 casos alternativos + Lifecycle Workflows | rm-f1-1, rm-f17-3, rm-f17-12 | COMPLETO |
| §4.6 Fuentes de identidad + prueba Finanzas→Marketing + NIST 800-63-4 | rm-f17-8, rm-f1-7, rm-f1-13 (NIST) | COMPLETO |
| §5.1 Arquitectura AD DS (25 puntos) | rm-f2-13, rm-f2-1, rm-f2-2, rm-f15-1..5 | COMPLETO (NTLM, SID restaurados) |
| §5.2 Administración cotidiana (8 prácticas, delegación restringida) | rm-f2-3/6/8, rm-f2-1 | COMPLETO |
| §5.3 Event IDs de auditoría AD (10 IDs) + 4624/4625/4634/4672 | rm-f2-14 (tabla completa +4767), rm-f2-4, rm-f31-11 | COMPLETO |
| §5 Proyecto AD Access Audit Lab (5 detecciones + entregable GitHub) | rm-f2-5 | COMPLETO (restaurado) |
| §6.1 Tenant, roles, AUs, CSA, licencias, propiedad, invitados, cross-tenant | rm-f3-13, rm-f3-9 | COMPLETO |
| §6.2 Usuarios/grupos/dispositivos + recuperación de objetos | rm-f3-1, rm-f3-14 | COMPLETO (papelera añadida) |
| §6.3 Híbrido (Connect/Cloud Sync, PHS/PTA, Seamless SSO, UPN, Health, migración) | rm-f3-10, rm-f3-14, rm-f3-1 (immutableId) | COMPLETO (Seamless+migración restaurados) |
| §6.4 MFA/SSPR (métodos, Authenticator, TAP, passkeys, WHfB, CBA, password protection, recuperación) | rm-f16-1..12, rm-f3-12 | COMPLETO |
| §6.5 Conditional Access (12 puntos, incl. Authentication Context) | rm-f3-2, rm-f16-5/6, rm-f5-9 (CAE) | COMPLETO (Auth Context restaurado) |
| §6.6 Identity Protection | rm-f8-9 | COMPLETO |
| §6.7 Global Secure Access (y alcance SC-300) | rm-f29-10, rm-f14-8 | COMPLETO |
| §7.1 Tabla de protocolos con profundidad requerida | rm-f5-1, rm-f5-13 | COMPLETO |
| §7.2 SAML (12 elementos + runbook de error post-auth) | rm-f5-5, rm-f5-2, rm-f5-7, rm-f5-13, rm-f7-4 | COMPLETO |
| §7.3 OAuth/OIDC (15 puntos + RFC 9700) | rm-f5-8, rm-f5-9, rm-f5-11 | COMPLETO (RFC 9700 + ROPC restaurados) |
| §7.4 App registrations / service principals (12 puntos) | rm-f3-11, rm-f23-5, rm-f4-6 | COMPLETO (multitenant+app roles restaurados) |
| §7 Proyecto Enterprise Application Onboarding (9 elementos) | rm-f5-14 | COMPLETO |
| §8.1 PowerShell fundamentos + 10 scripts de aplicación + regla read-only | rm-f6-1..11, rm-f31-8 | COMPLETO |
| §8.2 Graph API (11 puntos) | rm-f4-1..11 | COMPLETO |
| §8.3 Graph Explorer + 4 consultas GET de ejemplo | rm-f4-1/2/9, rm-f8-5 | COMPLETO |
| §8.4 SDK PowerShell (install/connect/inventario) | rm-f4-5, rm-f4-7 | COMPLETO |
| §8.5 Python (10 puntos + prueba de salida de reconciliación) | rm-f6-11 | COMPLETO |
| §9.1 Los 13 componentes de plataforma IGA | rm-f10-13 (los 13, con artefacto por término) | COMPLETO |
| §9.2 Access Reviews (10 puntos) | rm-f21-1..12 | COMPLETO |
| §9.3 RBAC (7 capas + matriz de 9 columnas) | rm-f18-2/3 | COMPLETO (9 columnas restauradas) |
| §9.4 SoD (7 puntos + tabla de reglas) | rm-f18-4, rm-f1-3, rm-f19-4, rm-f21-5 | COMPLETO |
| §9.5 Access Packages (11 puntos) | rm-f3-3/8, rm-f19-3/9 | COMPLETO |
| §9.6 Reconciliación esperado vs observado | rm-f17-9 | COMPLETO |
| §9.7 SailPoint (11 puntos) / Saviynt (9 puntos) / recursos | rm-f10-1..13 (recursos developer.sailpoint.com en rm-f10-13) | COMPLETO |
| §9 Proyecto IGA empresa simulada | rm-f18-7 (piloto), rm-f21-6 (campaña simulada), rm-f13 (InnovateCorp) | COMPLETO (distribuido) |
| §10.1 PAM (10 puntos + CyberArk/BeyondTrust/Delinea) | rm-f11-1..12, rm-f27 | COMPLETO |
| §10.2 Entra PIM (9 puntos) | rm-f3-3/7, rm-f11-5, rm-f28-2 | COMPLETO |
| §10.3 Identidades de apps/workloads (8 puntos + ejercicio inventario) | rm-f23-1..10 | COMPLETO |
| §11.1 Los 5 registros de Entra | rm-f7-11 | COMPLETO |
| §11.2 Los 12 escenarios de investigación | rm-f7-1..11, rm-f8-1..11 (distribuidos y ampliados con evidencia por caso) | COMPLETO |
| §11.3 KQL (consultas SigninLogs/AuditLogs) | rm-f8-5, rm-f8-10 | COMPLETO |
| §11 Proyecto Identity Threat Detection Pack | rm-f33-3 (proyecto 07) | COMPLETO |
| §12 GRC (11 temas + 4 marcos + Evidence Pack) | rm-f32-1..7, rm-f1-10 | COMPLETO |
| §13 Los 10 proyectos (herramientas/funcionalidades/requisitos/qué demuestra) | rm-f33-1/2/3 | COMPLETO |
| §13.1 Estructura del repositorio + seguridad | rm-f33-5, rm-f31-7, rm-f33-10 | COMPLETO |
| §13.2 Priorización 5+2 + honestidad CV | rm-f33-4, rm-f33-6 | COMPLETO |
| §14 Entornos sin licencias (9 entornos + matriz de licencias) | rm-f33-7, rm-f33-8 | COMPLETO |
| §15 SC-300 (dominios/pesos/orden/recursos/regla de inscripción) | rm-f14-1, rm-f14-8 | COMPLETO (pesos verificados contra fuentes externas) |
| §16.1 Ciclo de la solicitud (10 pasos + anti-patrón chat) | rm-f19-11 | COMPLETO |
| §16.2 Runbooks (10 escenarios + plantilla de 7 campos + escalación) | rm-f7-4, rm-f33-3 (proyecto 08), rm-f24-7 (escalación) | COMPLETO (plantilla restaurada) |
| §16.3 Métricas (10 indicadores) | rm-f25-1/2/3 | COMPLETO (más profundo que el original) |
| §17 Inglés técnico (10 preguntas exactas) | rm-f14-9, rm-f33-9 | COMPLETO |
| §18 Capstone (11 preguntas + 11 entregables) | rm-f13-13, rm-f13-1..12 | COMPLETO |
| §19 Portales + 17 búsquedas + 8 filtros | rm-f34-3/4 | COMPLETO (17/17 búsquedas) |
| §20 Titular LinkedIn + redacción de logros del CV | rm-f34-5/6, rm-f33-10 | COMPLETO |
| §21 Los 10 escenarios de entrevista | rm-f34-7, rm-f14-7 | COMPLETO |
| §22 Checklist de preparación 15/15 | rm-f34-8 | COMPLETO |
| §23 Ruta concreta final (10 pasos) | rm-f34-9 | COMPLETO |
| Áreas A–I de la comprobación complementaria del encargo | Cubiertas en las filas de arriba; ITDR (fase 25), CIEM (rm-f28-7), IGA/ITDR/CIEM como siglas (rm-f1-8), higiene (fase 10), KPIs (fase 13), DR (fase 30) | COMPLETO |

---

## D. Proyectos de GitHub

Los 10 proyectos del original (§13) **se conservaron completos**, cada uno con herramientas, funcionalidades, requisitos de calidad y qué demuestra (rm-f33-1/2/3), más la estructura de repositorio, la priorización y la matriz de licencias. Verificación por proyecto:

| # | Proyecto | Definición | Objetivo | Prerrequisitos | Entregables | Estado |
|---|---|---|---|---|---|---|
| 01 | IAM Lifecycle Lab — JML Automation | rm-f33-1 | Implícito (simulador del ciclo JML con HR sintético) | Fase 11 (PowerShell/Python) | modo simulación, repetible, comparación antes/después | COMPLETO |
| 02 | RBAC & SoD Policy Engine | rm-f33-1 | Implícito | Fases 14–15 | roles, entitlements, reglas de conflicto, excepciones documentadas | COMPLETO |
| 03 | Access Review & Certification Simulator | rm-f33-1 | Implícito | Fase 18 | informe de revisión + segundo informe que verifica las retiradas | COMPLETO |
| 04 | Entra ID / Graph Audit Toolkit | rm-f33-2 (corregido) | Implícito | Fase 6 | 5 scripts read-only con permisos mínimos (rm-f4-10) | COMPLETO |
| 05 | SSO Lab — OpenID Connect | rm-f33-2 | Implícito | Fase 7 | Keycloak+PKCE+pruebas permiso/denegación + runbook SAML | COMPLETO |
| 06 | SCIM 2.0 Provisioning API | rm-f33-2 | Implícito | Fases 7 y 11 | FastAPI+pytest, CRUD, errores coherentes | COMPLETO |
| 07 | Identity Threat Detection Pack | rm-f33-3 | Implícito | Fase 25 | consultas comentadas, casos +/-, runbook por detección | COMPLETO |
| 08 | IAM Operations Runbooks | rm-f33-3 | Implícito | Fase 12 | plantilla completa del original (7 campos incl. permisos y escalamiento) | COMPLETO |
| 09 | IGA Platform Comparison | rm-f33-3 | Implícito | Fase 22 | matriz neutral SailPoint/Saviynt/Entra ID Governance | COMPLETO |
| 10 | IAM Enterprise Capstone | rm-f33-3 + fase 32 completa | Explícito (11 preguntas + 11 entregables en rm-f13-13) | Todo el roadmap | diagrama, modelo de datos, RBAC, JML, SoD, reviews, provisioning, automatización, detecciones, runbooks, evidencia | COMPLETO |

Criterios transversales del original §13.1/§13.2 verificados: README en inglés ✓, resumen en español cuando aporte ✓, arquitectura y flujo ✓, datos sintéticos ✓, pruebas automatizadas ✓, limitaciones ✓, decisiones y modelo de amenazas ✓, evidencias visuales con datos ocultos ✓, `.env.example`/`.gitignore`/licencia ✓, distinción simulado/implementado/diseñado ✓ (rm-f33-6), priorización 5+2 ✓ (rm-f33-4), nunca tokens/secretos/datos reales ✓ (rm-f31-7, rm-f33-10).

---

## E. Correcciones realizadas

34 ediciones in-place sobre 32 ítems. Los IDs, la cantidad de fases e ítems y el progreso guardado del usuario **no cambiaron**.

### E.1 Exactitud técnica (3)

| # | Ítem | Cambio | Justificación |
|---|---|---|---|
| 1 | rm-f16-8 | "NIST SP 800-63B" → "NIST SP 800-63-4 (Digital Identity Guidelines, revisión 2025 — la versión vigente que reemplazó a la 800-63B)" | El original cita la 800-63-4 y es la vigente: NIST confirma que las revisiones previas fueron supersededas por la 800-63-4 el 1 de agosto de 2025. Verificado contra pages.nist.gov. |
| 2 | rm-f16-2 | Caso Uber 2022: "MFA fatigue seguido de consent phishing" → "MFA fatigue: push bombing hasta que la víctima aprobó — y el hallazgo posterior de credenciales de PAM expuestas en un script de red" | El incidente Uber 2022 no incluyó consent phishing; la cadena real fue MFA fatigue + credenciales de PAM descubiertas en scripts de red. El encargo exige casos de estudio con análisis técnico fundamentado. |
| 3 | rm-f28-3 | "NO hay herencia de políticas full-accional" → explicación precisa: las allow policies de GCP SÍ se heredan por unión de bindings (org→folder→project); IAM Conditions y deny policies llegaron después | La frase original era gramaticalmente incorrecta ("full-accional") y técnicamente confusa; la reformulación conserva el contraste pedagógico con AWS (Ausencia histórica de Deny explícito). |

### E.2 Cobertura recuperada del roadmap original (9)

| # | Ítem | Cambio | Justificación (sección del original) |
|---|---|---|---|
| 4 | rm-f5-8 | + "Resource Owner Password Credentials (ROPC) quedaron deprecados… Referencia vigente: RFC 9700 (OAuth 2.0 Security Best Current Practice)" | §7.3 cita expresamente RFC 9700 (PKCE recomendado, Implicit/ROPC deprecados). Verificado contra oauth.net/rfc-editor. |
| 5 | rm-f3-2 | + Authentication Context (step-up dentro de la sesión, acciones protegidas) y plantillas de CA | §6.5 "Authentication Context y acciones protegidas" + "Plantillas de políticas". |
| 6 | rm-f3-10 | + Seamless SSO y migración de federado a managed por fases | §6.3 "Seamless Single Sign-On" + "migrar configuraciones federadas a modelos modernos". |
| 7 | rm-f3-11 | + single-tenant vs. multitenant y roles de aplicación (app roles) | §7.4 "Single-tenant y multitenant applications" + "Roles de aplicación y asignación". |
| 8 | rm-f2-5 | AD Access Audit Lab completado: las 5 detecciones específicas + entregable GitHub (inventario, scripts, datos sintéticos, salidas, runbook) + regla de seguridad | §5 Proyecto "AD Access Audit Lab" (5 detecciones + entregables) y su advertencia de no usar dominios de terceros. |
| 9 | rm-f18-3 | + Las 9 columnas exactas de la matriz: Departamento \| Puesto \| Aplicación \| Rol \| Entitlement \| Propietario \| Aprobador \| Riesgo \| Justificación | §9.3 define el formato de matriz con esas columnas exactas. |
| 10 | rm-f7-4 | + "permisos requeridos" y "criterio de escalamiento" (a quién escalar: admin, desarrollador, red, dueño de app) en la plantilla de playbooks | §16.2 plantilla de 7 campos de cada runbook + regla de escalamiento. |
| 11 | rm-f34-3 | + 3 búsquedas guardadas faltantes: "Identity and Access Management Analyst", "IGA Analyst" remote LATAM, "Application Access Analyst" | §19.2 lista 17 búsquedas; el dataset tenía 14. Ahora 17/17. |
| 12 | rm-f2-2 | + NTLM como protocolo heredado, su deprecación y riesgo de NTLM relay | §5.1 "NTLM y sus consideraciones de seguridad" (antes solo aparecía como vector de ataque en rm-f8-7). |

### E.3 Detalles menores de fidelidad (8)

| # | Ítem | Cambio | Justificación |
|---|---|---|---|
| 13 | rm-f31-2 | + systemctl/systemd como servicios de aplicaciones en Linux | §3.1 "Procesos y servicios asociados a aplicaciones". |
| 14 | rm-f31-8 | + ForEach-Object y Group-Object en el pipeline PowerShell | §8.1 fundamentos PowerShell. |
| 15 | rm-f31-6 | + Referencias MDN (HTTP) y Postman | §3.3 recursos recomendados. |
| 16 | rm-f31-7 | + Referencia Pro Git (git-scm.com/book/es) | §3.3 recursos recomendados. |
| 17 | rm-f2-1 | + Delegación administrativa con alcance restringido (helpdesk solo reset de una OU) | §5.2 "Delegar administración con un alcance restringido". |
| 18 | rm-f2-13 | + El SID (S-1-5-…) como identidad inmutable del objeto | §5.1 + área B del encargo. |
| 19 | rm-f3-1 | + Eliminación/recuperación de objetos (papelera de Entra) | §6.2 "Eliminación y recuperación de objetos". |
| 20 | rm-f5-2 | + "la validez de la firma" en la validación de JWT | Área C del encargo ("Validación de JWT, issuer, audience, firma y expiración"). |

### E.4 Lenguaje, estilo y consistencia (14)

| # | Ítem | Cambio |
|---|---|---|
| 21 | rm-f1-11 | "por la razón correcte" → "correcta" |
| 22 | rm-f5-6 | "que federá" → "que federa" |
| 23–25 | rm-f27-1/3/4 | "Anatomy de" → "Anatomía de" (×3) |
| 26 | rm-f30-6 | "el SIEM que ingeria" → "ingiere" |
| 27 | rm-f22-11 | "la CRITERIA" → "el CRITERIO"; "el future es" → "el futuro es"; "( parches" → "(parches" |
| 28 | rm-f33-2 | "scripts… que inventarían usuarios" → "scripts… para inventariar usuarios" |
| 29 | rm-f7-10 | "Rehecharlas" → "Ensayarlas" |
| 30 | rm-f33-9 | "rehechadas" → "ensayadas" |
| 31 | rm-f14-7 | "REHECHAR" → "ENSAYAR"; "rehechada" → "ensayada" |
| 32 | rm-f14-9 | "rehechada" → "ensayada" |
| 33 | rm-f30-7 | "carpetas GITHUBVAULT de evidencias" → "carpetas VaultNotes" |
| 34 | rm-f33-10 | "la app GITHUBVAULT" → "la app VaultNotes" |

---

## F. Pendientes

Puntos que **no se pudieron verificar al 100 %** y qué se necesitaría para cerrarlos:

1. **Fecha exacta de la última actualización de la guía oficial de SC-300.** El documento original afirma "la guía oficial se actualizó el 28 de octubre de 2026". La búsqueda web verificó que los **4 dominios y sus pesos** (20–25 % / 25–30 % / 20–25 % / 20–25 %) coinciden con fuentes actuales de preparación del examen, y que Global Secure Access está en el alcance moderno; pero la propia página de Microsoft (learn.microsoft.com/credentials) no fue cargada directamente para confirmar la fecha de vigencia del temario. El dataset ya se protege ("comparar SIEMPRE el temario vigente"), por lo que el riesgo pedagógico es nulo, pero la fecha "28-10-2026" del original **no se copió al dataset** (decisión correcta: no reproducir una fecha no verificada).
2. **URLs completas de los recursos del original.** El original incluía enlaces (PowerShell docs, Pro Git, MDN, Postman, Graph Explorer, developer.sailpoint.com, páginas oficiales de SC-300). El dataset los integra **por nombre y dominio** (todos presentes tras las correcciones: MDN, Postman, Pro Git, Graph Explorer, developer.sailpoint.com, Microsoft Learn, Pearson VUE), no como hipervínculos, porque el dataset es texto plano de checklist. Si se quieren URLs clicables, la vía natural es la vista de Referencias de la app — fuera del alcance de esta revisión.
3. **Los otros tres pilares** (SOC, HelpDesk, SysAdmin) y el resto de la aplicación no fueron auditados, conforme al encargo ("no quiero una auditoría general").
4. **Fecha de vigencia de licencias de terceros** (trials de PingFederate de 30 días, disponibilidad de trials de Safeguard/ISC): el dataset ya condiciona cada lab a la disponibilidad y ofrece alternativa documentada — sin verificación en vivo de que cada trial siga abierto hoy.

**Nada de lo pendiente afecta la fidelidad del roadmap**: los cuatro puntos son verificaciones de contexto externo, no de contenido del dataset.

---

## G. Verificación final

### Conteos antes y después

| Métrica | Antes | Después |
|---|---|---|
| Fases | 34 | 34 (sin cambios) |
| Ítems | 373 | 373 (sin cambios) |
| IDs duplicados | 0 | 0 |
| IDs modificados/creados/eliminados | — | 0 creados, 0 eliminados, 32 ítems con texto corregido/ampliado |
| Progreso del usuario (Dexie `roadmapItems`) | Intacto | Intacto (el estado vive por ID; ningún ID cambió) |

### Comprobaciones ejecutadas

1. **Lectura íntegra** del original (2.114 líneas) y del dataset (2.249 líneas), ítem por ítem, con matriz de trazabilidad por sección (sección C).
2. **Matriz de cobertura re-ejecutada tras las correcciones** (greps de verificación): `800-63-4` ✓, `RFC 9700` ✓, `Seamless SSO` ✓, `Authentication Context` ✓, `multitenant` ✓, `NTLM como protocolo` ✓, `SID (S-1-5-` ✓, `Anatomía de` ×3 ✓, `systemctl` ✓, `ForEach-Object`/`Group-Object` ✓, `MDN y Postman` ✓, `Pro Git` ✓, 17/17 búsquedas ✓, `el CRITERIO`/`el futuro es` ✓ — y **cero residuos** de los términos erróneos ("rehech", "Anatomy de", "GITHUBVAULT", "correcte ", "federá ", "ingeria ", "full-accional", "la CRITERIA").
3. **Verificación externa** (búsqueda web, fuentes oficiales/actualizadas): NIST 800-63-4 vigente (supersede 800-63B desde 01-08-2025) ✓; RFC 9700 (depreca Implicit y Password grant, exige PKCE) ✓; dominios y pesos del SC-300 vigentes ✓.
4. **Calidad de código:** `bun run lint` limpio (solo avisos BABEL por tamaño de archivos de datos, preexistentes). La estructura TypeScript del dataset es idéntica (solo literales de texto modificados).
5. **App funcionando:** dev server activo (puerto 3000, HTTP 200). Verificación E2E con navegador headless: la vista **Roadmap IAM** renderiza las 34 fases y "0 de 373 ítems completados"; los ítems corregidos aparecen ya en pantalla (NIST 800-63-4, RFC 9700, Seamless SSO, Authentication Context, systemctl, Pro Git verificados en el DOM renderizado); la interacción de checklist funciona (marcar → "1 de 373", desmarcar → "0 de 373"); **cero errores de consola**.
6. **Duplicaciones:** evaluadas todas las parejas (E/I, diseño/minería, PAM/profundidad, JML/definición/operación) — confirmadas como divisiones de nivel intencionales, no redundancia.

### Limitaciones

- La comparación se hizo contra el **documento original recuperado** en `upload/` (disponible íntegro), por lo que sí es posible declarar correspondencia verificable del 100 % del contenido original recuperable. No se simuló el roadmap completo ni se ejecutaron los laboratorios.
- La revisión de "actualidad y exactitud técnica" priorizó los conceptos señalados por el encargo (§8); los verificados externamente fueron NIST, RFC 9700 y SC-300. El resto de afirmaciones técnicas fue validado por conocimiento experto interno (OKTA 2022, MGM 2023, Uber 2022, puertos/event IDs/permisos, licencias Entra, gMSA, PSO, STS/AssumeRole, k8s, etc.) y son correctas tras las correcciones.

**Conclusión:** el roadmap IAM de VaultNotes es hoy una versión **fiel, completa, técnicamente correcta y superior en profundidad operativa** al roadmap original, con progresión pedagógica coherente desde los fundamentos hasta las competencias avanzadas de IAM e Identity Security, y orientada al perfil objetivo: primer empleo como IAM Analyst junior remoto desde Colombia. Los 10 proyectos del portfolio y las 7 fases nuevas están íntegros y aportan valor real sin duplicar conceptos.
