# INVENTORY — VaultNotes V9 (pre-implementación)

Fuente de verdad: código y arrays reales (contados con `bun` runtime import el 2026-09-22).
README descartado como fuente (números desactualizados confirmados).

## A. Conteos reales

| Dataset | Ubicación | Conteo real | Estado |
|---|---|---|---|
| Glosario (seeds) | `data/glossarySeed.ts` (+4 fuentes) | **773** | OK — global |
| Tools (catálogo) | `data/toolsCatalog.ts` | **41** | OK — global, falta pilar |
| Runbooks universales (HD-flavor) | `data/troubleshootingRunbooks.ts` | **42** | Migrar → modelo V9 rico por pilar (HD) |
| CheatSheet Service Desk | `data/serviceDeskCheatSheet.ts` | **62** | OK → pilar HelpDesk |
| Tickets HelpDesk | `data/helpDeskTickets.ts` | **60** | OK (simulador pilar 1) |
| KB HelpDesk | `data/helpDeskKB.ts` | **28** | OK |
| Tickets SysAdmin | `data/sysadminTickets.ts` | **56** | OK (simulador pilar 2) |
| KB SysAdmin | `data/sysadminKB.ts` | **28** | OK |
| Roadmap IAM | `data/roadmapData.ts` | **52** | OK — global career core |
| Roadmap HelpDesk | `data/roadmapHelpDeskData.ts` | **65** | OK → pilar 1 |
| Roadmap SysAdmin | `data/roadmapSysAdminData.ts` | **91** | OK → pilar 2 |
| Roadmap SOC | — | **0** | NO EXISTE → crear |
| Cheatsheet SysAdmin | — | **0** | NO EXISTE → crear (min 50) |
| Cheatsheet SOC | — | **0** | NO EXISTE → crear (min 40) |
| Runbooks SysAdmin | — | **0** | NO EXISTE → crear (min 40) |
| Runbooks SOC | — | **0** | NO EXISTE → crear (min 30) |
| Troubleshooting por pilar (árbol decisión) | — | **0** | NO EXISTE → crear ×3 |
| Guías de tools SOC (Sentinel/Splunk/…) | — | **0** | NO EXISTE → crear (8) |

Referencias/Intel (estáticas, globales): attacks 102 (7 ficheros) · ports 119 · winEvents 93 ·
vulnerabilities 203 · mitreData · sigmaData · detectionPresets · httpStatus · sidRid · cvssData · cronData.

Dexie: schema v21 (última: `roadmapSysAdminItems` + `sysadminTickets`). Tablas: notes, labs,
glossary, references (por tipo), inboxItems, roadmapItems, roadmapHelpDeskItems,
roadmapSysAdminItems, helpdeskTickets, sysadminTickets, profiles, blog, attachments, config.
Backup ZIP: versión **3.7.0**, merge latest-wins por `updatedAt`, videos fuera del ZIP,
zip-bomb guards, ImportSummary con contadores de conflictos. Portabilidad: `.next-dev` separado,
`tools/bun` portable, `IniciarVaultNotes.bat`, `.vaultnotes-folder.txt` — INTACTOS.

## B. Labs actuales (todos se eliminan en Phase 1)

Semillas en tabla `labs` (seeding idempotente por id + dismissal):
- HD: `labhd-jml-onboarding-l1`, `labhd-printer-troubleshooting`, `labhd-entra-joined-migration`, `labhd-phishing-mfa-security` (4)
- SA: `labsa-guardia-linux-diagnostico`, `labsa-lvm-raid-extend`, `labsa-backup-restore-321`, `labsa-cambio-parches`, `labsa-monitor-umbrales` (5)

Total seeds: **9**. Archivos fuente: `data/helpDeskLabsData.ts`, `data/sysadminLabsData.ts` → eliminar.
Cleanup en upgrade v22: `bulkDelete` de los 9 ids sembrados (SOLO esos ids — nunca labs creados por el usuario).

## C. Tools — destino por pilar (41 actuales)

Pilar assignment (campo `pillars` — un tool puede vivir en varios):
- **HELPDESK (11)**: hd-triage, hd-ad-account, hd-kb-gen, hd-network, hd-intune, hd-sanitizer, subnet, ip, encoding, regex, timestamp (los 5 últimos compartidos con SYSADMIN)
- **SYSADMIN (12)**: sa-systemd, sa-raid, sa-lvm, sa-cron-builder, sa-firewall, sa-capacity, cron, linux-perms, subnet, ip, ldap-dn, sid-rid (compartidos: subnet, ip)
- **SOC (20)**: winevent, ioc, ioc-defang, powershell-analyzer, cmd-analyzer, log-parser, mitre, sigma, detection-query, cve-search, vuln, ataques, sid-rid, ldap-dn, hash, file-hash, cvss, encoding, regex, timestamp
- **NUEVAS guías SOC (8)**: soc-sentinel (KQL), soc-splunk (SPL), soc-elastic, soc-wireshark, soc-sysmon, soc-defender, soc-sandbox (VirusTotal+ANY.RUN), soc-thehive → catálogo pasa a **49**
- Globals que no van a ningún pilar (solo búsqueda): base, http, jwt, rbac (IAM core — quedan accesibles vía search y Data & Intel… **decisión**: base/http/jwt/rbac también disponibles en los 3 pilares como utilidades transversales)
- Mantienen/mejoran: todas las 41 (ninguna se elimina). Migran a runbook: 0 (ya migraron en V6).

## D. Huérfanos potenciales (NO borrar aún)

- Ningún `.bak`/`.tmp`/`.old`/reporte antiguo en el árbol (verificado).
- `tmp-scripts/` (creado para este inventario) → borrar al final.
- `console.log` debug: 0 (solo `console.warn/error` funcionales).
- `DEMO_LAB_IDS` en db/index.ts (legacy V6): quedará obsoleto tras el cleanup de labs → revisar.
- `data/helpDeskLabsData.ts` + `data/sysadminLabsData.ts` → quedarán sin imports tras Phase 1 (borrar en Phase 10).

## Review (Phase 1 pre-check)

`grep Review` en código: **0 referencias activas** (eliminado en V6; solo mención histórica en
README/worklog = doc histórica, permitida). Acción V9: verificar de nuevo tras cambios → sin trabajo.

## Veredicto

Estado base: limpio, compilando (tsc 0, lint 0), dev server OK, git limpio en `5385168`.
Faltan por construir: pilar SOC completo, datasets por pilar (runbooks/cheatsheets/troubleshooting),
reorg sidebar a 3 pilares, labs vacío, backup 3.8.0 (roadmap SOC), búsqueda ampliada.
