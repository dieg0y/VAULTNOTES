# TASK 2-a — IAM P0 CRÍTICO: RB-IAM-065…072 + LAB-IAM-001…004 (mega-auditoría de empleo 2024-2026)

**Archivo:** `/home/z/my-project/src/vault/data/runbooksIam.ts`
**Agente:** creador de contenido técnico senior VaultNotes (pilar IAM)
**Estado:** COMPLETADO. Sin errores de lint ni tipos.

## Qué se hizo

1. **Header (doc-comment, líneas 1-59):** añadido únicamente el bloque V10 después del cierre del bloque V9.2 (`(plan → review → apply, estado, deriva, import).`), texto exacto de la spec. Nada más del header se tocó (la línea "Dataset COMPLETO: 64 runbooks…" quedó intacta por instrucción explícita de solo añadir el bloque).
2. **12 documentos nuevos** insertados al final del array `RUNBOOKS_IAM`, justo antes del `];` que precede a `export const RUNBOOKS_IAM_COUNT`. Ningún contenido existente fue modificado.

## Los 12 documentos añadidos (en orden)

| ID | Título (resumen) | Categoría | Líneas aprox. |
|---|---|---|---|
| RB-IAM-065 | Conditional Access de punta a punta: matriz, report-only→enforce, break-glass | Entra ID / Híbrido | 55 |
| RB-IAM-066 | Evaluación Zero Trust medible (verify/least privilege/assume breach) | Arquitectura Zero Trust | 48 |
| RB-IAM-067 | CIEM: entitlements multi-cloud, combinaciones tóxicas, remediación | Cloud IAM | 54 |
| RB-IAM-068 | Tiering Tier 0/1/2 en AD: Protected Users, FGPP, limpieza T0 | Servicios de Directorio | 57 |
| RB-IAM-069 | Retiro de ADFS: PHS/PTA con staged rollout y rollback | Entra ID / Híbrido | 49 |
| RB-IAM-070 | Compliance IAM: SOX/GDPR/ISO 27001/NIST 800-63B (matriz de brechas) | Gobernanza y Cumplimiento | 48 |
| RB-IAM-071 | Gobernanza B2B: invitados con patrocinio, expiración, revisión | Gobernanza y Cumplimiento | 52 |
| RB-IAM-072 | CIAM: passwordless, social login, consentimiento, step-up MFA (Auth0) | CIAM / Customer Identity | 49 |
| LAB-IAM-001 | Lab guiado: Conditional Access report-only → What If → enforce | Laboratorio | 58 |
| LAB-IAM-002 | Lab guiado: SAML end-to-end Okta + saml-test.id + SAML Tracer | Laboratorio | 47 |
| LAB-IAM-003 | Lab guiado: Entra PIM elegible → aprobación → auditoría | Laboratorio | 49 |
| LAB-IAM-004 | Lab guiado: AWS IAM least-privilege con Policy Simulator | Laboratorio | 52 |

Total añadido: **642 líneas** (3464 → 4106). `RUNBOOKS_IAM_COUNT` ahora es **76**. Categorías nuevas automáticas vía `RUNBOOKS_IAM_CATEGORIES`: `Arquitectura Zero Trust`, `CIAM / Customer Identity`, `Laboratorio`.

## Cumplimiento de reglas

- Interfaz `PillarRunbook` completa y en el mismo orden de campos que los existentes (validado por `tsc`: campos obligatorios presentes en los 76 objetos).
- Descriptivos es-CO; `ticket_example`, `english_customer_response_template`, `english_technical_explanation` en inglés; comandos tal cual.
- Comandos EXACTOS de la spec (sintaxis no alterada). Comandos multi-línea del mismo paso unidos con `; ` (patrón ya usado por RB-IAM-001 paso 4).
- Escapes `\'` estilo del archivo (ej.: `@{N=\'Users\';…}`, `"userType eq \'Guest\'"`, `--query \'Content\'`, `\'AdminCount -eq 1\'`, `\'{{ROLE_TEMPLATE_ID}}\'`).
- Cross-refs verificadas EXISTENTES: RB-IAM-001/002/003/010/014/015/020/022/034/047/048/049/050/051/052/053/057/064, iam-kb-023, TS-IAM-019 ("SSO con Okta: bucle de redirección o Invalid Signature"), RB-SOC-021.
- Estructura por doc: 3 síntomas, 3 causas raíz, 3 prerrequisitos, 7-9 pasos, 4 evidencias, keywords 18-25 ES/EN.

## Decisiones / desviaciones menores (documentadas en la entrega)

1. **RB-IAM-065 paso 4:** el cuerpo de la política MFA se construyó con la misma sintaxis del paso 3 + `BuiltInControls = @("Mfa")` + `ExcludeUsers = @("{{OBJECT_ID}}")` (break-glass), tal como indicaba la spec ("misma sintaxis con… y excepto exclusiones"). Se omitió `ClientAppTypes` para que la política MFA aplique a todos los tipos de cliente.
2. **RB-IAM-065 paso 5:** la política de riesgo se armó con el esqueleto del paso 3 + los fragmentos provistos (`SignInRiskLevels = @("medium","high")`, `BuiltInControls = @("Mfa","PasswordChange")`).
3. **RB-IAM-066 paso 3:** se usó `Get-MgReportAuthenticationMethodUserRegistrationSummaryReport -Period D30` (cmdlet real, como ordenó la spec, que descartó el KQL `AADUserRegistrationFeatureReadings`) + conteo con Measure-Object descrito.
4. **RB-IAM-069 paso 5:** staged rollout escrito como operación de PORTAL (prioridad de la spec) con `New-MgPolicyFeatureRolloutPolicy` como comando de referencia VERBATIM; la aclaración de que `Feature` toma UNO de los dos valores (PasswordHashSync/PassthroughAuthentication) quedó en el explanation.
5. **LAB-IAM-001 paso 5 (spec 4):** política LAB-REQUIRE-MFA-Pilot = mismo body del lab con `BuiltInControls = @("Mfa")`, DisplayName propio (`LAB-REQUIRE-MFA-Pilot`).
6. **LAB-IAM-001 paso 9:** el revert a report-only (`Update-MgIdentityConditionalAccessPolicy … State = "reportEnabled"`) se derivó de la sintaxis provista (Update + state reportEnabled ya presentes en la spec de RB-IAM-065/LAB).
7. **LAB-IAM-004:** el JSON de least-policy.json se codificó textualmente (ListBucket sobre ARN del bucket + GetObject/PutObject sobre `/*`) a partir de la descripción exacta de la spec; broad-policy.json quedó verbatim.
8. **RB-IAM-072:** solo `auth0 tenants list` y `auth0 apps list` como comandos copyables (tal cual la spec).
9. **Ticket_example de labs:** formato `LAB-IAM-00X - Guided lab: … - Self-paced ~N min - {{TENANT}}/{{USERNAME}}/{{HOSTNAME}}`.

## Verificación ejecutada (todo limpio)

- `bunx eslint src/vault/data/runbooksIam.ts` → exit 0, sin output.
- `bunx tsc --noEmit` → 0 líneas de error en TODO el proyecto (por ende 0 en runbooksIam.ts).
- Import runtime (bun): COUNT=76, IDs únicos, últimos 12 en orden correcto, 14 categorías.
- Nota para otros agentes: RB-IAM-041 y RB-IAM-045 (preexistentes, bloque V9.1, NO tocados por esta tarea) tienen `commands_copyable` vacío — decisión del bloque original (runbooks de portal sin CLI), fuera del scope de 2-a.
