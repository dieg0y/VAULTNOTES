# Task 2-d — HELP DESK (bloque MEGA-AUDITORÍA): RB-HD-069, RB-HD-070, LAB-HD-001

Archivo tocado: `src/vault/data/runbooksHelpDesk.ts` (NINGUNO más).

## Qué se hizo
1. Insertados 3 objetos nuevos al final del array `RUNBOOKS_HD` (antes del `];` que precede a `export const RUNBOOKS_HD_COUNT`):
   - **RB-HD-069** — `category: 'Service Desk'` — "Problem Management y RCA: del incidente recurrente al ticket de problema con causa raíz documentada". 8 pasos (patrón 3+/30 días → Problem → New + curl API table/problem → timeline → 5 porqués con evidencia → Known Error → acciones con owner/fecha → cierre con 0 recurrencias 30 días → métricas del service review). Comando real: `curl -u {{SN_USER}}:{{SN_PASS}} "https://{{INSTANCE}}.service-now.com/api/now/table/problem?sysparm_limit=10" -H "Accept: application/json"`. Referencias: RB-HD-062, RB-HD-063, RB-HD-033, RB-HD-064. 22 keywords.
   - **RB-HD-070** — `category: 'Service Desk'` — "Jira Service Management + Confluence: colas, SLAs, automatización y KB de soporte". 8 pasos (modelo JSM → cola por SLA en riesgo + curl rest/servicedeskapi → SLAs metric/calendario/goals → automation rules → Confluence KB + deflection → macros → reports del service review → buenas prácticas de agente). Comando real: `curl -u {{EMAIL}}:{{API_TOKEN}} "https://{{ORG}}.atlassian.net/rest/servicedeskapi/request?serviceDeskId=1&requestStatus=OPEN" -H "Accept: application/json"`. Referencias: RB-HD-062, RB-HD-069, RB-HD-042, RB-HD-041. 24 keywords.
   - **LAB-HD-001** — `category: 'Laboratorio'` — "Laboratorio guiado: simulacro de turno — triaje de 6 tickets con matriz de prioridad y SLA". 8 fases (preparación 5 min → vistazo 20 tickets 5 min → selección 6 mezclados → trabajar 2 a fondo con RB-HD-001/005/018/025 → escalar 1 con plantilla RB-HD-062 → 2 customer updates en inglés → auto-review → registro de resultados). `commands_copyable: []` (lab sin comandos, igual que RB-HD-062). Infra: simulador Help Desk de la app (cola "Nexora S.A." de fábrica — verificada en `helpDeskTickets.ts`: priority P1-P4 por ticket, status resuelto/escalado + statusNote). 22 keywords.
2. Añadido `'Laboratorio'` al final de `RUNBOOKS_HD_CATEGORIES` con comentario `// MEGA-AUDITORÍA — laboratorio guiado.`
3. Añadido bloque final al header doc-comment (texto verbatim de la spec): "V11 (RB-HD-069…070 + LAB-HD-001, mega-auditoría de empleo 2024-2026): …".

## Estado del archivo tras el cambio
- 4001 → 4150 líneas (+149).
- `RUNBOOKS_HD_COUNT` = 83 (80 + 3).
- Categorías: 6 históricas + 4 de la fusión V11 + 'Laboratorio'.
- Verificación runtime con bun: exports cargan, últimos 3 ids correctos.

## Validaciones
- `bunx eslint src/vault/data/runbooksHelpDesk.ts` → SIN errores (exit 0).
- `bunx tsc --noEmit | grep runbooksHelpDesk` → SIN errores (sin matches).
- dev.log limpio (compila y sirve / con 200).

## Decisiones / desviaciones menores (detalladas al coordinador)
- Comandos curl usados VERBATIM de la spec; sus placeholders (`{{SN_USER}}`, `{{SN_PASS}}`, `{{INSTANCE}}`, `{{EMAIL}}`, `{{API_TOKEN}}`, `{{ORG}}`) NO están en el whitelist de runbooksCore.ts — son credenciales/instancia propias de cada comando y la spec exigía "comandos tal cual se proveen".
- Keywords RB-HD-069: el fragmento de la spec "keci? NO usa:" era un artefacto de borrador (mismo patrón que "siemm? escribir: siempre" y "el doraver? escribir driver"); se interpretó como incluir la lista completa, con 'known error database' y 'kedb' (términos ITIL estándar directamente ligados al paso 5 del runbook). 22 keywords.
- "VOLTEA DE OJO" (spec del lab) se redactó como "VISTAZO A LA COLA" (español es-CO correcto; "voltear de ojo" no es idiomático).
- ticket_example con `{{USERNAME}}` al final (formato de la spec de esta tarea), no `{{ASSET}}` como los runbooks históricos.
- En texto inglés se evitaron contracciones (estilo del archivo: cero escapes `\'` innecesarios).
- Etiqueta "V11" del bloque de header usada verbatim según la spec, aunque el bloque anterior era "v25" (la numeración la definió el coordinador).
