# 2-c — SYSADMIN: Mega-auditoría de empleo (RB-SA-058…065 + LAB-SA-001…003)

**Archivo tocado:** `src/vault/data/runbooksSysAdmin.ts` (único).
**Antes:** 4.121 líneas, 88 objetos en `RUNBOOKS_SA`? No — 77 (52 RB-SA-001..052 + 20 CS-SA fusionados + 5 RB-SA-053..057).
**Después:** 4.745 líneas, **88 objetos** (77 + 11 nuevos). `RUNBOOKS_SA_COUNT` se calcula con `.length`, ya reporta 88.

## Qué se añadió (11 documentos, insertados ANTES del `];` que precede a `export const RUNBOOKS_SA_COUNT`)

| ID | Categoría | Tema |
|---|---|---|
| RB-SA-058 | Virtualización / VMware & Proxmox | Datastore lleno, snapshots/delta, consolidación, VM no arranca (vim-cmd/PowerCLI/pvesm/qm/vzdump) |
| RB-SA-059 | Backup & Storage | Veeam: Get-VBRJob/BackupSession, repositorio lleno, FLR, Instant Recovery, SureBackup, drill (refs RB-SA-031/032/033) |
| RB-SA-060 | Seguridad / Hardening | Windows LAPS: modos AD/Entra/legacy, política (Password Age 30 / Length 20), Get-LapsADPassword/AADPassword, Reset-LapsPassword, auditoría de lecturas (refs RB-SOC-020/021) |
| RB-SA-061 | Seguridad / Hardening | CIS Benchmark: Lynis + OpenSCAP (ssg datastreams, generate fix), secedit/auditpol, GPO+LGPO, excepciones firmadas (ref RB-SA-045) |
| RB-SA-062 | Automatización / IaC | Ansible: inventario, ad-hoc, patch.yml con handler reboot, --check, anillos --limit, idempotencia, galaxy/vault (refs RB-SA-045) |
| RB-SA-063 | Cloud / Contenedores | Azure IaaS: az vm list/boot-diagnostics/instance-view, deallocate vs stop, NSG 0.0.0.0/0, discos Unattached, az backup, vnet peering (refs RB-SA-032) |
| RB-SA-064 | Cloud / Contenedores | AWS: describe-instances (JMESPath), console-output, status checks, SGs abiertos (revoke/authorize), EBS available, S3 PAB/versioning, create-image |
| RB-SA-065 | Monitoreo / Operación | Prometheus+Grafana: node_exporter, PromQL (CPU/disco/memoria), reglas up==0/disco, Alertmanager+silencios (refs RB-SA-047, RB-SA-045, RB-HD-064) |
| LAB-SA-001 | Laboratorio | Lab Ansible: parcheo de 3 Ubuntu con check mode (~90 min) |
| LAB-SA-002 | Laboratorio | Lab LVM: raíz en caliente PV→VG→LV→FS (~45 min), trampa lvextend sin resize |
| LAB-SA-003 | Laboratorio | Lab Lynis: hardening Ubuntu con before/after (~60 min), cron mensual |

También se añadió el bloque final al header doc-comment (texto exacto pedido):
`V10 (RB-SA-058…065 + LAB-SA-001…003, mega-auditoría de empleo 2024-2026): …` (líneas 53-56 del archivo).

## Cumplimiento de interfaz (PillarRunbook de runbooksCore.ts)

- Todos los campos, mismo orden que los existentes. `pillar: 'SYSADMIN'` en los 11 (labs incluidos).
- symptoms=3, root_causes=3, prerequisites=2-3, steps=8-9 (LAB-SA-001 tiene 9), evidence_to_collect=4, keywords=16 cada uno.
- Campos descriptivos es-CO; `ticket_example` (prefijo `SA{{TICKET_ID}}` según spec de esta tarea, y formato `LAB-SA-00X - Guided lab: … - Self-paced ~NN min`), `english_customer_response_template` y `english_technical_explanation` en inglés, copiables, sin apóstrofes (estilo del archivo).
- Comandos EXACTOS de la spec (ningún cmdlet/parámetro inventado). Convención de comillas del archivo: single quotes por defecto, double quotes cuando el contenido tiene `'` (p. ej. queries JMESPath de AWS con backticks), backslashes escapados `\\` (verificado en runtime: `C:\Datos` y `{{RESTORE_TARGET}}\{{VM_NAME}}-restore` renderizan bien).
- Referencias cruzadas verificadas contra ids existentes: RB-SA-004, RB-SA-031/032/033, RB-SA-045, RB-SA-047, RB-SA-049, RB-SA-050, RB-HD-064, RB-SOC-020/021/024 (todas existen).

## Validación

- `bunx eslint src/vault/data/runbooksSysAdmin.ts` → **exit 0, sin errores**.
- `bunx tsc --noEmit | grep runbooksSysAdmin` → **sin salida (sin errores de este archivo)**.
- Runtime check con bun: `RUNBOOKS_SA_COUNT = 88`; nuevas categorías en `RUNBOOKS_SA_CATEGORIES`: Virtualización / VMware & Proxmox, Seguridad / Hardening, Automatización / IaC, Cloud / Contenedores, Laboratorio (+ Backup & Storage, Monitoreo / Operación ya existían).
- dev.log: compilación OK, GET / 200, sin errores.

## Desviaciones de la spec (menores)

1. **RB-SA-064 paso 7**: la spec traía `--name "pre-patch-{{TIMESTAMP}} --no-reboot` (comilla sin cerrar, typo). Se corrigió a `--name "pre-patch-{{TIMESTAMP}}" --no-reboot`.
2. **RB-SA-058 escalación**: la spec decía "(ha-bore)" (término corrupto); se redactó como "identificar el host que retiene el lock (vmkfstools -D)", que es el significado técnico.
3. **RB-SA-059 paso 1**: la spec dudaba de la proyección de propiedades (JobName/Result); se siguió la "última palabra": comando copiable sin proyección (`Get-VBRBackupSession | Sort-Object CreationTime -Descending | Select-Object -First 10`) y la nota de por qué quedó así.
4. **RB-SA-060 paso 3**: la spec dudaba del nombre del CSP/longitud; se escribió como indicó: Intune Settings Catalog → Administrative Templates → System → LAPS, Password Age 30, Password Length 20.
5. **RB-SA-063**: `az vm stop`/`az vm start` se listan con los mismos parámetros `-g {{RG}} -n {{VM_NAME}}` que la spec usa para el resto de comandos az vm de ese runbook (la spec los dio abreviados).
6. **Keywords**: cada lista de la spec traía 19-25 términos; se recortó al máximo de 16 priorizando cmdlets y sinónimos de ofertas de empleo.
7. **Header**: NO se actualizó la línea "Dataset completo V11.2: 77 runbooks" ni el "Total: 77." del bloque V11.2 (la spec dijo "No toques nada más"); el bloque V10 añadido documenta los +11 y el COUNT dinámico reporta 88. Si un agente posterior actualiza el header, el total real es 88.
8. **Labs**: `escalation` es "n/a (laboratorio autoguiado)" + guía de recuperación (consola del hipervisor), como pedía la spec; `english_customer_response_template` de los labs es una plantilla de "lab completion summary" ({{USERNAME}}/{{TIMESTAMP}}) en lugar de respuesta a cliente — es un lab, no hay cliente.

## Notas para otros agentes

- No toqué `RUNBOOKS_SA_CATEGORIES` ni `RUNBOOKS_SA_COUNT` (se derivan solos).
- Los 11 objetos van al final del array, en orden RB-SA-058→065, LAB-SA-001→003.
- No se ejecutó dev server ni git commit (según instrucciones).
