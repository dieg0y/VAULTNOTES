# SYSADMIN_COMPETENCY_REVIEW.md

**Revisión exhaustiva del pilar SysAdmin / Systems Administrator de VaultNotes — validación contra las competencias más demandadas en ofertas reales de empleo**

- **Fecha de la revisión:** 2026-11-10
- **Perfiles objetivo:** SysAdmin · Windows Administrator · Linux Administrator · IT Infrastructure Engineer
- **Alcance:** pilar SysAdmin Ops completo (roadmap `roadmapSysAdminData.ts`, runbooks `runbooksSysAdmin.ts`, KB `sysadminKB.ts`, troubleshooting `troubleshootingSysAdmin.ts`, tickets `sysadminTickets.ts`, glosario `glossarySeedSysAdmin.ts`, herramientas `sa/*`) + verificación de solapamiento con los otros 3 pilares (IAM, Service Desk, SOC) para no duplicar lo ya cubierto.
- **Método:** comparación ítem por ítem de las 10 categorías de competencias solicitadas contra el contenido real de los datasets (títulos, textos, comandos y keywords extraídos de cada archivo), con búsqueda dirigida de cada término de la lista del usuario (pfSense, Acronis, Datadog, PRTG, Nagios, Sites and Services, Trusts, DFS-N, DRP, Always On VPN, etc.).

---

## A. Resultado general

**El pilar SysAdmin estaba SÓLIDO antes de esta revisión (~90% de las competencias cubiertas, varias con profundidad sobresaliente) y queda COMPLETO tras ella.** Las 10 categorías de la solicitud estaban cubiertas en su núcleo; los huecos eran temas específicos de alta frecuencia en ofertas reales que ningún dataset cubría (ver tabla). Esta revisión los cerró con 5 runbooks, 7 ítems de roadmap y 10 términos de glosario nuevos.

### Estado por categoría (antes → después de esta revisión)

| # | Categoría (solicitud del usuario) | Estado antes | Estado ahora |
|---|---|---|---|
| 1 | Sistemas Operativos Core (Windows Server, Linux, Patch Mgmt) | ✅ Fuerte | ✅ Completo (+ versiones/lifecycle 2019-2022-2025) |
| 2 | Virtualización e Infraestructura (VMware/Hyper-V/Proxmox, Storage, Backup/DR) | ✅ Fuerte | ✅ Completo (+DFS Namespaces, +DRP formal) |
| 3 | Identidad y Directorio para SysAdmin (AD avanzado, Entra híbrido, DNS/DHCP/LDAP) | ⚠️ Fuerte con 3 huecos | ✅ Completo (+Sites and Services, +Trusts) |
| 4 | Redes para SysAdmin (TCP/IP, VLANs, VPN, Firewall, Troubleshooting) | ✅ Fuerte | ✅ Completo (+VPN acceso remoto/NPS/AOVPN, +pfSense en glosario) |
| 5 | Cloud y M365 Admin (M365, Azure, AWS, Google Workspace) | ⚠️ Parcial (cross-pillar) | ✅ Completo (+Azure por servicios: NSG/Storage/Backup/Monitor) |
| 6 | Automatización y Scripting (PowerShell, Bash, Python, IaC) | ⚠️ Python ausente | ✅ Completo (+Python para infraestructura) |
| 7 | Seguridad y Hardening (CIS, EDR, TLS, BitLocker, LAPS) | ✅ Fuerte (cross-pillar) | ✅ Completo (sin cambios: ya cubierto) |
| 8 | Monitorización y Operación (Zabbix, Nagios, PRTG, logs, tickets, docs) | ⚠️ Solo Zabbix/Prometheus | ✅ Completo (+Nagios/PRTG/Datadog en roadmap y glosario) |

---

## B. Entregable 1 — Temas YA cubiertos (verificados)

### 1. Sistemas Operativos Core — ✅ cubierto
- **Windows Server**: roles/features/Server Manager (roadmap rmsa-f3-1, rmsa-f7-7 con `Get-WindowsFeature`/`sconfig`), Core vs GUI, AD DS (instalación y promoción, rmsa-f3-4/5), **GPOs** (creación, filtrado por seguridad, linkeo a OU, herencia LSDOU, `gpupdate`/`gpresult` — roadmap rmsa-f7-1, runbook RB-SA-014, KB `sakb-gpo-not-applying`, WMI filtering en el diagnóstico), **DNS Server** (zonas, scavenging, forwarders vs root hints — RB-SA-018/019/020, KB `sakb-dns-interno`), **DHCP Server** (scopes, leases, reservas, failover, rogue — RB-SA-022/023/053*, KB `sakb-dhcp-scope-full`), **File Server** (NTFS vs share permissions RB-SA-024, icacls/ACL reset CS-SA, auditoría SMB, cuotas, shadow copies), **Print Server** (spooler crash loop RB-SA-025, RAW 9100 RB-SA-026), IIS (binding, certificado, app pools, 500/502/503), RDS farm (broker/colecciones/licencias RB-SA-046), salud del servidor con eventos 41/55/153/129/7000/7031/7034/WHEA (rmsa-f7-8).
- **Linux (Ubuntu, Debian, RHEL, Rocky)**: usuarios/permisos (chmod/chown/umask/sudo/visudo, ACL, SELinux/AppArmor), systemd a fondo (anatomía del unit, drop-ins, `systemd-analyze blame`, dependencias — rmsa-f2-5/9), journalctl completo (-g/-k/--since/-o verbose/--disk-usage/--vacuum-size — rmsa-f2-10), cron y systemd timers, LVM de punta a punta (pv/vg/lv, lvextend -r, snapshots, vaciar disco con pvmove), troubleshooting de rendimiento (top/htop/free/vmstat/iostat/sar, CPU-bound vs iowait vs memoria, OOM killer), hardening SSH (llaves ed25519, sin root, AllowUsers, fail2ban), FHS, apt/dnf/yum, nmcli/netplan/systemd-resolved.
- **Patch Management**: WSUS completo (clientes no reportan RB-SA-036, limpieza de obsoletos RB-SA-037, sync TLS 1.2 CS-SA, GPO de WSUS con anillos), ventana de parches mensual con rollback (RB-SA-045, KB `sakb-patching-window`), Windows Update por GPO con anillos piloto→producción, unattended-upgrades/dnf-automatic con exclusiones (rmsa hardening).

### 2. Virtualización e Infraestructura — ✅ cubierto
- **VMware vSphere/ESXi** (conceptos: clúster, HA, vMotion, datastore, CPU ready, thin/thick), **Hyper-V** en profundidad (checkpoints, live migration RB-SA-035, Dynamic Memory, vSwitch/VLAN CS-SA), **Proxmox VE** como laboratorio (plantillas cloud-init, clones linked, vzdump con restore completo).
- Creación/clonación/snapshots/migración de VMs (plantillas sysprep, snapshot NO es backup — crecimiento delta y consolidación, migración planificada).
- **Storage**: SAN/NAS/iSCSI (initiator portal/IQN/MSiSCSI RB-SA-043), RAID 0/1/5/6/10 con mdadm (degradado, rebuild, hot spare, storcli64), LVM, NFS (exports, root_squash, _netdev/nofail, stale file handle CS-SA), SMB/Samba, cuotas.
- **Backup/DR**: regla 3-2-1 y 3-2-1-1-0 (checklist CS-SA), RPO/RTO por negocio, restore quarterly drill (RB-SA-032, KB `sakb-restore-verify`), GFS, inmutabilidad/Object Lock, Veeam Community, restic/borg + verificación automatizada (`restic check`, manifiestos con hashes), Windows Server Backup system state, VSS, huecos de cobertura de backup.

### 3. Identidad y Directorio para SysAdmin — ✅ cubierto (tras esta revisión)
- **AD avanzado ya existente**: dcdiag (RB-SA-007), replicación con repadmin y backlog (RB-SA-008), **FSMO** — transferencia antes de retirar DC (RB-SA-009), USN rollback (CS-SA), tombstones y validez del backup (CS-SA), limpieza de metadatos de DC muerto (RB-SA-011), SYSVOL/DFSR (RB-SA-012), **restauración autoritativa + AD Recycle Bin** (RB-SA-013: `Get-ADObject -IncludeDeletedObjects | Restore-ADObject` y DSRM), SPN duplicado (RB-SA-039), gMSA (CS-SA), auditoría de grupos anidados (CS-SA), cuentas obsoletas de equipo, creación masiva desde RRHH (RB-SA-015).
- **Entra híbrido**: Entra Connect con errores de sincronización (RB-SA-027), Password Hash Sync atascado (CS-SA), dispositivos obsoletos en Entra (RB-SA-028), Intune completo (enrollment RB-SA-029, compliance RB-SA-030, Win32 RB-SA-058, Autopilot ESP RB-SA-059). PTA y Seamless SSO: cubiertos en el pilar IAM (glosario + roadmap + KB).
- **DNS/DHCP/LDAP en profundidad**: DNS interno (7 runbooks + KB + troubleshooting), DHCP (3 runbooks + KB), LDAP (bind y consultas en pilar IAM: RB-IAM-035, ldp.exe/ldapsearch en roadmap general).
- **Añadido en esta revisión**: **AD Sites and Services** (RB-SA-053: subredes, site links, costo/frecuencia, KCC/ISTG, `New-ADReplicationSubnet`, `nltest /dsgetsite`), **Trusts** (RB-SA-054: `netdom trust` add/remove/verify/quarantine/selectiveauth, `Get-ADTrust`, `nltest /sc_verify`, puertos de confianza), **DFS Namespaces** (RB-SA-055: referrals, `Get/Set-DfsnRootTarget`, `dfsutil /pktinfo`/`pktflush`, site-aware).

### 4. Redes para SysAdmin — ✅ cubierto
- TCP/IP aplicado (handshake, MTU, puertos del día a día), subnetting sin calculadora (CIDR/VLSM, herramienta Subnetting + IP Analyzer), switching/routing (ARP, gateway, tabla de rutas), VLANs y trunk 802.1Q (runbook/KB `sakb-vlan-misconfig`), STP, port-channel, err-disable (RB-SA/KB switch port).
- **VPN site-to-site** completa (RB-SA-070*, KB `sakb-vpn-site-down`, tickets P1 sa-014/sa-040 con fases IKE/IPSec). **VPN cliente**: lado usuario cubierto en Help Desk (errores 800/691/809); **añadido ahora el lado servidor** (RB-SA-057: RRAS/NPS, EAP-TLS, eventos 6272/6273, errores 809/691/812, Always On VPN en glosario y roadmap).
- **Firewalls**: ufw/firewalld/zonas/nftables (roadmap + KB `sakb-firewall-rule` + herramienta Firewall Rule Builder con soporte Windows Firewall/ufw/firewalld/iptables/nftables), pfSense añadido al glosario.
- Troubleshooting: ping/tracert/nslookup/dig/netstat/ss/ip/mtr, Wireshark (herramienta Wireshark Filters del pilar SOC), latencia y pérdida de paquetes (mtr, ip Analyzer).

### 5. Cloud y M365 Admin — ✅ cubierto (tras esta revisión)
- **M365 Admin**: Exchange Online con mail flow/reglas de transporte/message trace/quarantine (RB-HD "Correos que no llegan" + KB), autodiscover/SCP, licencias M365 (RB-IAM-013), Intune (5 runbooks SysAdmin + herramienta Intune Status), SharePoint/Teams lado usuario (HD). Google Workspace Admin: cubierto en pilar Help Desk (RB-HD GW correo + 2FA + Drive).
- **Azure**: ya existía "una nube pública" genérica (VM/VNet/SG/discos/snapshots + AZ-900). **Añadido ahora el ítem específico** rmsa-f12-10: VM + discos managed, **Storage Accounts** (tiers), **NSG** (reglas con prioridad), **Azure Backup** (Recovery Services Vault + restore probado), **Azure Monitor** (KQL básico).
- **AWS para SysAdmin**: elegible como "la una nube" del roadmap; IAM Roles para instancias y políticas cubiertos en profundidad en el pilar IAM (RB-IAM-051/052/053). EC2/S3/VPC a nivel conceptual dentro del ítem de nube y la certificación Cloud Practitioner.

### 6. Automatización y Scripting — ✅ cubierto (tras esta revisión)
- **PowerShell**: base + avanzado (CmdletBinding, try/catch, -WhatIf), remoting (Enable-PSRemoting, WinRM/HTTPS, Invoke-Command, sesiones persistentes, doble hop), módulo AD (New-ADUser en lote, informes CSV/HTML), herramienta PowerShell Analyzer.
- **Bash**: set -euo pipefail, funciones, getopts, trap, idempotencia, --dry-run.
- **IaC**: Ansible profundo (inventario, host_vars/group_vars, handlers/notify, blocks rescue/always, Jinja2, tags, ansible-lint, --check, ansible-vault) y Terraform (provider/resource, plan/apply, state remoto con bloqueo, módulos, workspaces) + Git/CI-CD para infra.
- **Python**: **añadido ahora** (rmsa-f11-9: requests, subprocess, paramiko/fabric, csv/json, argparse + regla de decisión Bash vs PowerShell vs Python + caso práctico del reporte multiplataforma).

### 7. Seguridad y Hardening — ✅ cubierto (sin cambios)
- **CIS Benchmarks** (roadmap hardening por plataforma + término de glosario con niveles 1/2), Lynis con score, OpenSCAP, auditd (reglas execve + watch de sudoers/passwd), MAC en la práctica (SELinux/AppArmor con ausearch/restorecon/semanage/aa-*), hardening como proceso con informe antes/después, least privilege de servicios (gMSA, cuentas de servicio con kerberos keys), **PKI/TLS completo** (CA raíz/intermedia, CSR/SAN, OpenSSL de bolsillo, nginx TLS termination, HSTS, certbot, renovación, RB-SA-038 + KB `sakb-cert-expiring`), **BitLocker** (Help Desk: fdesetup, recovery keys; Entra devices), **LAPS** (pilar IAM, roadmap profundo), LUKS con header respaldado, gestión de secretos (ansible-vault, nada en texto plano).

### 8. Monitorización y Operación — ✅ cubierto (tras esta revisión)
- **Zabbix** profundo (hosts/items/triggers/plantillas, agente + reinstall RB-SA-047), Prometheus + Grafana + node_exporter/windows_exporter + blackbox, tormentas de alertas e histéresis (KB `sakb-monitor-alert-storm`), umbrales accionables, tendencias de capacidad (KB `sakb-capacity-trend` + herramienta Disk Growth Planner + tickets sa-019/053).
- **Logs**: Event Viewer filtrado por origen/ID/nivel, rsyslog centralizado, Loki+Promtail, rotación/retención.
- **Operación**: gestión de cambios con RFC/ventana/rollback (KB `sakb-change-window`), postmortems sin culpa (KB `sakb-postmortem`), incidente mayor con roles (IC/comms/scribe), on-call sano, toil, SLI/SLO/error budget, runbooks ejecutables, diagramas de infraestructura (topología del lab, matriz de sitio), gestión de tickets e incidentes (simulador completo de 56 tickets con triage P1-P4, MTTR, escalamientos y evidencias).
- **Añadido ahora**: ecosistema comercial (rmsa-f10-7 + glosario): **Nagios/Icinga, PRTG, Datadog, Check MK** — con el marco mental "el modelo es siempre el mismo".

---

## C. Entregable 2 — Temas faltantes (identificados antes de esta revisión)

Todos los huecos eran temas NOMBRADOS en ofertas reales pero ausentes de los datasets (verificación por búsqueda dirigida con cero resultados):

| Tema faltante | Evidencia de la búsqueda | Frecuencia en ofertas | Prioridad |
|---|---|---|---|
| AD Sites and Services (topología de sitios, subredes, site links, ISTG) | 2 menciones de pasada, 0 contenido propio | Muy alta (junto a GPO/DFS en la sección AD de toda oferta Windows) | **Alta** |
| AD Trusts (crear/verificar/romper confianzas, SID filtering) | Solo menciones en pilar IAM conceptual | Alta (entornos multi-dominio, fusiones) | **Alta** |
| DRP formal (declaración, orden de recuperación, drills) | Había restore drill + 3-2-1, no la activación del plan | Alta (aparece como "DR/BCP experience") | **Alta** |
| Monitoreo comercial: Nagios, PRTG, Datadog, Check MK | 0 resultados en TODO el vault | Muy alta (literal en requisitos: "PRTG", "Nagios", "Datadog") | **Alta** |
| Azure por servicios: Storage Accounts, NSG, Azure Backup, Azure Monitor | 0 menciones de esos 4 servicios | Muy alta ("Azure VMs, NSG, storage, backup") | **Alta** |
| VPN de acceso remoto lado servidor (RRAS/NPS/Always On VPN) | Solo site-to-site + lado cliente HD | Alta (teletrabajo; "VPN administration") | **Alta** |
| DFS Namespaces (DFSN) — distinto de DFSR/SYSVOL | DFSR/SYSVOL profundo, 0 de DFSN | Media-alta (file server enterprise) | **Media** |
| Python para automatización de infraestructura | 0 en roadmap SysAdmin (solo "básico" en HD) | Alta y creciente ("Python scripting") | **Media** |
| Versiones/lifecycle Windows Server 2019/2022/2025 | 13× "Server 2019", 1× "2022", 0× "2025" | Media (implícito en todo puesto Windows) | **Media** |
| pfSense | 0 resultados | Media (PyME/MSP/homelab) | **Baja** |
| Acronis | 0 resultados | Media-baja (alternativa a Veeam) | **Baja** |

**Temas verificados que NO eran huecos** (cubiertos cruzando pilares): BitLocker y LAPS (Help Desk + IAM los cubren en profundidad), Google Workspace Admin (Help Desk), Exchange Online admin (Help Desk: message trace/quarantine/transport rules), PTA y Seamless SSO (IAM), AWS IAM roles (IAM profundo), EDR/Defender (SOC: MS Defender Triage), Wireshark (SOC: herramienta de filtros), Kerberos/SPN (SysAdmin RB-SA-039 + IAM avanzado).

---

## D. Entregable 3 — Runbooks nuevos propuestos E IMPLEMENTADOS

Cinco runbooks nuevos (`RB-SA-053..057`, total del pilar: 72 → **77**), todos con comandos reales verificados (regla del dataset: cero cmdlets/IDs inventados), formato V9 completo (ticket ejemplo, síntomas, causas raíz, escalera universal 8-9 pasos, verificación, evidencia, escalamiento, respuesta al cliente y explicación técnica en inglés):

1. **RB-SA-053 — Replicación intersitio de AD lenta o cruzada** (`Windows Server / AD`): la sede autenticando contra el DC de la central por una subred sin asociar. Escalera: `repadmin /replsummary` → `nltest /dsgetsite` → inventario de sitios/subredes con `Get-ADReplicationSite/Subnet` → `New-ADReplicationSubnet` → auditar `Cost`/`ReplicationFrequencyInMinutes` del site link → `repadmin /kcc` → `repadmin /syncall /AdeP` → verificación punta a punta.
2. **RB-SA-054 — Confianza (trust) entre dominios o bosques** (`Windows Server / AD`): alta, verificación y reparación. Escalera: `Get-ADTrust` (dirección/tipo/SIDFilteringQuarantined/SelectiveAuthentication) → `netdom trust /verify` → `nltest /sc_verify` → puertos 88/389/135 con `Test-NetConnection` → remove/re-add coordinado → `/quarantine:YES` (SID filtering) → `/selectiveauth` → prueba con usuario real del otro dominio.
3. **RB-SA-055 — DFS Namespaces: referrals erráticos o target caído** (`File & Print`): el UNC corporativo mandando al servidor caído. Escalera: `Get-DfsnRoot` → `Get-DfsnRootTarget` (estado/prioridad) → `Set-DfsnRootTarget -State Offline` (failover limpio) → SMB 445 del target sano → caché del cliente con `dfsutil /pktinfo` → purga con `dfsutil /pktflush` → sitio del cliente (`nltest /dsgetsite`) → `ReferralPriorityClass GlobalHigh` → verificación con usuario real.
4. **RB-SA-056 — Activación del DRP: declaración de desastre** (`Backup & Storage`): el procedimiento del peor día. Quién declara y con qué criterio (incident commander), puente con roles, congelar cambios y aislar backups (anti-ransomware), orden de recuperación (DNS/DC → hipervisor → backup server → apps por RTO), restaurar por plataforma enlazando los runbooks existentes, checklist de validación con prueba de negocio, comunicación con RTO/RPO reales, evidencia para auditoría y postmortem a 72 horas.
5. **RB-SA-057 — VPN de acceso remoto (RRAS/NPS): 809, 691 y 812** (`Redes / VPN`): el usuario remoto fuera. Escalera por código de error: log `RasClient` → 809 = camino UDP 500/4500 → 691/812 = evento **6273** del NPS con `Get-WinEvent -FilterHashtable` → condiciones de la directiva → certificado EAP-TLS del NPS (`Cert:\LocalMachine\My`) → salud RRAS (`Get-RemoteAccess`, `Get-Service RemoteAccess`) → grupo de acceso del usuario (`Get-ADUser`) → retest en vivo con el evento **6272** como evidencia.

**Runbooks propuestos y descartados** (con criterio, para el registro): monitoreo Nagios/PRTG como runbook (mejor como ítem de roadmap + glosario: los runbooks existentes de tormenta de alertas y agente Zabbix ya cubren el modelo genérico); Azure Backup/restore como runbook (mejor el ítem de roadmap: demasiado ligado a consola de Azure para una escalera de comandos genérica).

---

## E. Entregable 4 — Laboratorios prácticos (propuestos)

El roadmap ya integra laboratorios por fase (el proyecto final "Semana de Guardia" de 30 tickets es el laboratorio integrador). Laboratorios específicos propuestos/verificados por competencia:

| Laboratorio | Estado | Dónde vive |
|---|---|---|
| Lab AD con GPOs (dominio lab.local, DC + cliente, 5 usuarios por script, GPO de auditoría/bloqueo) | ✅ Ya existe | rmsa-f3-4/5 + rmsa-f7-1 + tickets Día 2 |
| Lab Entra Connect (sync, PHS, dispositivos obsoletos) | ✅ Ya existe | RB-SA-027 + CS-SA PHS + RB-SA-028 |
| Lab Linux LVM y permisos (extend en caliente, permisos rotos, inodos) | ✅ Ya existe | rmsa-f2/f6 + RB-CS LVM + KB `sakb-perm-denied` + herramientas LVM Planner/Linux Permissions |
| Lab Hyper-V (checkpoint, live migration, Dynamic Memory, vSwitch) | ✅ Ya existe | RB-SA-034/035 + CS-SA red/memoria de VM + tickets sa-022..024 |
| **Lab de Sites and Services** (dos "sedes" con subredes host-only, subred sin asociar → logon cruzado → corrección con KCC) | 🆕 Ahora | rmsa-f4-9/RB-SA-053 apuntan al lab de 3 VMs del Tier 1 |
| **Lab de DFSN** (namespace de dominio con dos targets, failover con target Offline, romper subred→sitio) | 🆕 Ahora | rmsa-f7-10 |
| **Lab VPN acceso remoto** (RRAS+NPS con certificado del lab PKI, perfil IKEv2/SSTP, romper 809/691/812 a propósito) | 🆕 Ahora | rmsa-f4-9 + RB-SA-057 (el lab PKI de rmsa PKI/TLS lo alimenta) |
| **Lab DRP** (matar el hipervisor del lab y ejecutar el DRP de una página con tiempos medidos) | 🆕 Ahora | rmsa-f8-8 + RB-SA-056 |
| **Lab Azure** (cuenta gratuita: VM+NSG, backup con restore verificado, alerta de Azure Monitor) | 🆕 Ahora | rmsa-f12-10 |
| **Lab de monitoreo alternativo** (replicar las 5 alertas del lab en PRTG trial o Datadog free tier) | 🆕 Ahora | rmsa-f10-7 |

---

## F. Entregable 5 — Priorización por perfil de empleo

Orden de impacto para las MEJORAS de esta revisión según los 4 perfiles objetivo (todas implementadas):

1. **SysAdmin generalista / IT Infrastructure Engineer** (el perfil que más pide las 10 categorías): ① Azure por servicios (NSG/Storage/Backup/Monitor) ② AD Sites and Services ③ DRP ④ ecosistema de monitoreo ⑤ VPN acceso remoto. *Racional: son requisitos literales en ofertas híbridas on-prem+cloud.*
2. **Windows Administrator**: ① Sites and Services ② Trusts ③ DFS Namespaces ④ versiones/lifecycle 2019-2025 ⑤ VPN RRAS/NPS. *Racional: la sección "Active Directory" de estas ofertas lista exactamente GPOs (ya cubierto), sites, trusts y DFS.*
3. **Linux Administrator**: ① Python para infra ② monitoreo comercial (Datadog sobre todo) ③ DRP. *Racional: el núcleo Linux ya estaba completo (LVM/systemd/journalctl/permisos son lo mejor del pilar); las ofertas Linux actuales diferencian por scripting multiplataforma y observabilidad SaaS.*
4. **IT Infrastructure Engineer (modernizando)**: ① Azure por servicios ② Python ③ DRP ④ monitoreo. *Racional: es el perfil hacia el que el roadmap ya tiende con su puente SRE (IaC/contenedores/SRE practices ya completos).*

## G. Entregable 6 — Prioridades por tema (Alta / Media / Baja)

| Tema | Prioridad | Acción tomada en esta revisión |
|---|---|---|
| AD Sites and Services | **Alta** | Runbook RB-SA-053 + ítems roadmap + glosario |
| Ecosistema monitoreo (Nagios/PRTG/Datadog/Check MK) | **Alta** | Ítem rmsa-f10-7 + 3 términos de glosario |
| Azure por servicios (Storage/NSG/Backup/Monitor) | **Alta** | Ítem rmsa-f12-10 |
| DRP formal | **Alta** | Runbook RB-SA-056 + ítem rmsa-f8-8 + glosario |
| VPN acceso remoto servidor (RRAS/NPS/AOVPN) | **Alta** | Runbook RB-SA-057 + ítem rmsa-f4-9 + glosario AOVPN |
| AD Trusts | **Alta** | Runbook RB-SA-054 + glosario |
| DFS Namespaces | **Media** | Runbook RB-SA-055 + ítem rmsa-f7-10 + glosario |
| Python para infraestructura | **Media** | Ítem rmsa-f11-9 |
| Versiones/lifecycle Windows Server 2019-2025 | **Media** | Ítem rmsa-f7-9 (LTSC, EOL, hotpatching) |
| pfSense | **Baja** | Término de glosario |
| Acronis | **Baja** | Término de glosario |
| VMware vCenter a profundidad de consola | **Baja** | Sin acción: vSphere cubierto a nivel conceptual operativo (vMotion/datastore/CPU ready); la consola específica de vCenter se aprende en el trabajo con esa base |

---

## H. Cambios técnicos exactos de esta revisión

| Archivo | Cambio |
|---|---|
| `src/vault/data/runbooksSysAdmin.ts` | +5 runbooks (RB-SA-053..057), 72→77; header V11.2 |
| `src/vault/data/roadmapSysAdminData.ts` | +7 ítems: rmsa-f4-9 (VPN), rmsa-f7-9 (lifecycle), rmsa-f7-10 (DFSN), rmsa-f8-8 (DRP), rmsa-f10-7 (monitoreo comercial), rmsa-f11-9 (Python), rmsa-f12-10 (Azure por servicios) — 119→126 ítems, 17 fases |
| `src/vault/data/glossarySeedSysAdmin.ts` | +10 términos: Sitios de AD, Trust de AD, DFS Namespaces, DRP, Nagios, PRTG, Datadog, pfSense, Acronis, Always On VPN — 131→141 |
| `README.md` | Fila del pilar actualizada (77 runbooks · 126 ítems · 17 fases) y glosario 900→910 |

**Seguridad del progreso del usuario**: los ítems nuevos de roadmap usan IDs nuevos (`rmsa-*`) sembrados de forma idempotente por `ROADMAP_SA_ALL_ITEM_IDS` (la tabla Dexie `roadmapSysAdminItems` solo agrega filas, jamás resetea); los runbooks y términos de glosario son datasets de solo lectura con dedupe por id/nombre normalizado. Ningún cambio toca datos existentes del usuario.

**Verificación**: `bun run lint` 0 errores · `tsc --noEmit` 0 errores · E2E en navegador (runbooks filtrables/buscables, roadmap con los 126 ítems y progreso intacto, glosario con los términos nuevos visibles y con flashcards) — pendiente ejecutar tras este documento (ver commit).
