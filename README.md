# VAULTNOTES

**Tu segundo cerebro de ciberseguridad.** Una PWA **local-first y 100% offline** para estudiar, trabajar y investigar ciberseguridad como se hace en el puesto real: **3 PILARES AUTÓNOMOS** (Service Desk/HelpDesk · SysAdmin Ops · SOC/Blue Team), cada uno con su roadmap, herramientas, troubleshooting, CheatSheet y Runbooks — y cada runbook presentado como **ticket real de trabajo** con paso a paso universal, comandos copiables y **respuesta en inglés lista para copiar**. Apuntes con editor rico, glosario con flashcards (773 términos), **49 herramientas de análisis**, **116 runbooks**, **156 fixes de CheatSheet**, simulador de Service Desk L1, simulador de guardia SysAdmin, datasets de inteligencia (IoCs · eventos · reglas) y backups ZIP portables — todo dentro de tu navegador, sin servidor, sin cuenta, sin nube.

> 🎯 **V9 — 3 pilares autónomos**: HelpDesk (60 tickets · 42 runbooks · 62 cheats · 16 troubleshooting · roadmap 65) · SysAdmin (56 tickets · 42 runbooks · 52 cheats · 16 troubleshooting · roadmap 91) · SOC (roadmap 65 · 32 runbooks · 42 cheats · 16 troubleshooting · 8 guías de tools SIEM). **Labs queda vacío a propósito** ("tú decides qué hacer después") y **Review se eliminó** — la práctica guiada ahora vive en los simuladores y el resto es knowledge base consultable: BUSCAR → ABRIR → LEER → COPIAR → APLICAR.

> 🔒 **Privacidad por diseño**: tus datos nunca salen de tu máquina. La base de datos vive en IndexedDB (tu navegador). La única funcionalidad online es **opcional y explícita** (enriquecer IOCs o buscar CVEs cuando TÚ lo pides).

## ⚡ Resumen en 3 minutos

| Pregunta | Respuesta |
|---|---|
| **¿Qué es?** | Tu segundo cerebro de ciberseguridad, 100% en tu navegador — sin cuenta, sin nube, sin servidor de datos. |
| **¿Cómo lo arranco?** | Windows: doble clic en `IniciarVaultNotes.bat` — resuelve todo solo (Bun incluido si falta) y abre el navegador. Cualquier SO: `bun install` + `bun run dev`. |
| **¿Puedo llevarla en una USB?** | Sí — la carpeta es 100% portable (app + runtime + build) y el **Respaldo automático** hace que tus fotos y apuntes viajen en la misma USB. Ver sección 🎒 abajo. |
| **¿Dónde están mis datos?** | En IndexedDB de tu navegador (tu PC). Backups ZIP para cambiar de máquina/navegador — o activa el Respaldo automático y llévalos en tu USB. |
| **¿Qué hay dentro?** | **3 pilares autónomos** — HelpDesk: 60 tickets + 28 KB + 42 runbooks + 62 cheats + 16 troubleshooting + roadmap 65; SysAdmin: 56 tickets + 28 KB + 42 runbooks + 52 cheats + 16 troubleshooting + roadmap 91; SOC: roadmap 65 + 32 runbooks + 42 cheats + 16 troubleshooting + 8 guías de tools (Sentinel KQL · Splunk SPL · Elastic · Wireshark · Sysmon · Defender · sandbox · TheHive). Además: **49 herramientas offline**, explorador de Vulnerabilidades (203) y Ataques (102), roadmap IAM (52), apuntes con editor rico, glosario con flashcards (**773 términos**), datasets de intel (IoCs · eventos · reglas). Labs **vacío intencional**. |
| **¿Y si actualizo el código?** | Botón **Pull** del header: descarga los cambios desde GitHub sin tocar tus datos. En producción regenera el build solo y te pide reiniciar. |
| **Regla de oro** | Los **videos nunca entran a la base ni a los backups** — viven en tu carpeta de videos (disco). |

---

## ✨ Características

### 📝 Conocimiento
- **Apuntes** con editor rico (WYSIWYG): títulos, listas, checkboxes, tablas, código, imágenes, PDFs adjuntos y **videos** (ver política de videos abajo). Jerarquía de subpáginas, plataformas/categorías, favoritos y "revisar después".
- **Hands-On / Labs** — **vacío a propósito (V9)**: "Sin labs — tú decides qué hacer después." La práctica guiada ya vive en los simuladores (Service Desk, SysAdmin Ops) y los roadmaps; el espacio queda libre para TUS propios labs (mismo editor rico).
- **Glosario (sembrado)** — **773 términos incluidos** (**389 IAM/GRC/SOC** ~75% IAM + **250 HelpDesk/IT Support**: fundamentos, Windows, redes, M365, AD, ITSM y seguridad de soporte + **134 SysAdmin/Infra & Ops**: Linux, Windows Server, redes, storage/backup, virtualización, cloud/contenedores, monitoreo y automatización) + **flashcards** con repaso espaciado: abre la app y están todos ahí, sin importar nada (ver abajo).
- **Perfil Profesional (multi-perfil)** — tus CVs vivos: crea tantos perfiles como quieras (CV IAM, CV SOC, CV en inglés…), cada uno con datos, puestos objetivo, skills con estado real, tools, experiencia, educación, certs, idiomas, proyectos, keywords ATS y notas de búsqueda. Cada perfil exporta su **Markdown AI-ready** para que tu IA te arme el CV perfecto (ver abajo).
- **Roadmap IAM** — checklist interactivo del roadmap *Junior IAM / Identity Security Analyst* (3 tiers + proyecto final, 14 fases, 52 ítems): progreso global/por tier/por fase, persistente, exportable como Markdown (ver abajo). El **Dashboard muestra el progreso en vivo** (tarjeta Roadmap IAM con % y barra — clic y saltas al checklist).
- **Service Desk (v19, mejorado en v21)** — simulador L1 de práctica: **60 tickets de la empresa ficticia Nexora S.A.** con cola filtrable (estado/prioridad/**tipo incidente/solicitud**/categoría/ámbito/búsqueda + **orden por número o por prioridad**), **modo estudio** (la guía de diagnóstico/resolución/escalación va OCULTA — primero intentas, luego contrastas), flujo de estados real (nuevo → en progreso → resuelto/escalado → cerrado) con **nota de cierre obligatoria** como evidencia, **Proyecto Final "primera semana"** (30 tickets en 5 días con dificultad creciente) y **Base de Conocimiento de 28 artículos** cruzada con tickets y términos del glosario. El trabajo (estados + notas) persiste y viaja en el backup ZIP.
- **SysAdmin Ops (v21) — simulador de guardia de Infraestructura & Operaciones**: el espejo del Service Desk para el rol de SysAdmin. **56 tickets (OPS-2001…OPS-2056)** del equipo de Infra de Nexora S.A. clasificados por **entorno** (Linux · Windows Server · Red · Storage/Backup · Virtualización · Cloud/Contenedores · Multi) y por **tipo** (incidente · solicitud · **cambio** con ventana/plan/rollback). Misma mecánica de práctica: cola filtrable (estado/prioridad/tipo/entorno/categoría/ámbito/búsqueda + orden por número o prioridad), **modo estudio** con revelado progresivo, flujo de estados con nota de cierre obligatoria, **"Semana de Guardia"** (el proyecto final: 30 tickets, 6 por día × 5 días — de Linux y las 3 AM del día 1 a los cambios, alertas y postmortem del día 5) y **KB de 28 artículos** (disco lleno, servicio caído, RAID degradado, LVM, DNS interno, VPN site-to-site, snapshots, tormentas de alertas, ventana de cambio, postmortem…) cruzada con tickets y glosario. El trabajo persiste (tabla `sysadminTickets`) y viaja en el backup ZIP.
- **Roadmap HelpDesk (v19)** — checklist de la especialización de entrada *HelpDesk / IT Support → IAM* (3 tiers + proyecto final de 30 tickets, 23 fases, **65 ítems**), mismo motor que el Roadmap IAM con export Markdown propio. Badge de progreso en el sidebar y en el Dashboard (tarjeta Service Desk).
- **Roadmap SysAdmin (v21)** — checklist de la especialización *Infra & Ops → SRE* (3 tiers + proyecto final de la semana de guardia, 15 fases, **91 ítems**): foundation (Linux/Windows/redes) → operación real (storage/backup/virtualización/monitoreo) → el salto SRE (automatización, contenedores, cloud, IaC, prácticas SRE). Mismo motor, export Markdown propio, badge en sidebar y tarjeta en el Dashboard.
- **Inbox + Captura rápida** — anota ideas al vuelo desde cualquier vista.
- **Referencias** — enlaces y recursos clasificados.
- **Papelera** — borrado suave con restauración y borrado definitivo.
- **Generar Blog** — convierte apuntes/labs en un blog estático exportable.
- **Data & Intel** — datasets de trabajo (IoCs · eventos · reglas) con CRUD completo, buscador, filtros y contadores. Integrado con las tools: envía IoCs desde el **IoC Extractor**, reglas desde el **Sigma Explorer** y queries desde el **Detection Query Helper** con un clic — todo se actualiza al instante, sin refresh. Import .json y export .json/.csv propios, además de viajar en el backup ZIP.

### 🧰 49 Herramientas offline (SOC / IAM / Red / Datos / Linux / HelpDesk / SysAdmin)

> **V6 (limpieza)**: las 9 tools que eran guías/checklists estáticos (Password & MFA Reset, BitLocker, Outlook, Impresoras, BSOD, Permisos Share/NTFS, Asistencia Remota, GPO) **migraron al dataset universal de runbooks** (sección de abajo) y la **Calculadora SLA se eliminó**. Quedan solo tools INTERACTIVAS reales — parsers, simuladores y generadores. El conteo del catálogo es dinámico (`TOOLS_CATALOG.length`).

| Categoría | Herramientas |
|---|---|
| **SOC** | Windows Event IDs · IoC Extractor (refang, scoring, KQL/SPL/STIX) · IOC Defanger/Refanger · PowerShell Analyzer · Command Line Analyzer · Log Parser (SSH/Apache/Nginx/Syslog/EVTX) · MITRE ATT&CK Explorer · Sigma Explorer · Detection Query Helper (KQL/SPL) |
| **Guías de tools SOC (8, V9)** | **Microsoft Sentinel (KQL)** (sintaxis, hunting de sign-ins, spray, MFA fatigue 50076/500121, SecurityEvent, DeviceProcessEvents, EmailEvents, joins/ventanas) · **Splunk (SPL)** (stats/dc, spray, beaconing, 4104/4688, 4728/4732, timechart) · **Elastic Security** (KQL/Lucene/EQL, ECS, reglas) · **Wireshark** (display filters, BPF, TCP handshake, follow stream, beaconing) · **Sysmon** (instalación, XML EventFiltering, eventos 1/3/7/8/10/11/13/22/25, casos de detección) · **MS Defender** (Get-Mp* completo, scans, exclusiones, aislamiento) · **VirusTotal + ANY.RUN** (workflow de análisis de muestra, qué NO subir, defang) · **TheHive** (Case→Task→Observable, plantillas de descripción/reporte) — **todo copiable, 100% offline** |
| **IAM** | JWT Decoder · SID/RID Analyzer · LDAP/DN Parser · RBAC Analyzer (matriz + permisos efectivos) |
| **Red** | Subnetting (IPv4/CIDR) · IP Analyzer (v4/v6) · Puertos y Servicios |
| **Web** | HTTP Status (códigos con explicación) |
| **Datos** | Base Converter · Timestamp Converter (Unix/ISO/UTC) · Encoding (Base64/Hex/URL/ASCII/Unicode/HTML) · Regex Tester (14 presets) · Cron Parser |
| **Security** | Hash Toolkit · File Hash Analyzer · CVSS 3.1 Calculator · CVE Search *(única online, opcional — NVD)* · Vulnerabilidades IAM/SOC (203 entradas offline) · **Ataques — 102 técnicas ofensivas offline (sin duplicar Vulnerabilidades)** |
| **Linux** | Linux Permissions (chmod simbólico ↔ numérico) |
| **HelpDesk (6, V6)** | **Ticket Triage Parser** (motor offline de 91 reglas → categoría/prioridad/SLA/pasos con transparencia de keywords + **[Enrich Online] opcional**: con clic explícito y consentimiento, el backend local sugiere categoría/prioridad — nunca auto-envía y la tool funciona 100% offline sin él) · **AD Account Troubleshooter MEJORADO (V6)** (árbol de decisión de los 5 mensajes exactos + origen del lockout con replicación PDC/DCs + reset flow completo de 5 fases con verificación de identidad/historial/complejidad/Entra writeback/SSPR + tabla AD lockout vs Smart Lockout + memberOf/OU/GPO + eventos 4625/4740/4723/4724/4726/4728/4732) · **KB Article Generator** (vista previa en vivo + Markdown) · **Network L1** (intérprete de ipconfig en vivo + escalera de conectividad) · **Intune/Autopilot** (decodificador de estados/códigos) · **System Info Sanitizer** (sanitizador regex de pegadas, 10 categorías) |
| **SysAdmin (6, v21)** | **systemd Unit Builder** (generador de .service/.timer con hardening, validación y secuencia de despliegue) · **RAID Calculator** (capacidad/tolerancia/overhead de RAID 0/1/5/6/10 + tabla comparativa + rebuild/URE) · **LVM Planner** (PV/VG/LV con matemática exacta de extents + secuencia completa pvcreate→fstab) · **Cron Builder** (constructor visual con descripción en español + próximas 5 ejecuciones calculadas localmente) · **Firewall Rule Builder** (una regla → ufw/iptables/nftables/firewalld/netsh) · **Disk Growth Planner** (proyección de capacidad con umbrales 70/80/90 y fechas concretas) |

#### ⚔️ Ataques — 102 técnicas ofensivas (offline)

Explorador de técnicas de ataque de **todo tipo** — **complementario a Vulnerabilidades y sin una sola entrada repetida**. El reparto:

- **Vulnerabilidades (203)**: fallos de configuración/implementación **y** las técnicas de abuso AD/IAM que allí siempre vivieron — Kerberoasting, Pass-the-Hash, Golden/Silver Ticket, DCSync, delegaciones, AD CS ESC1–16, escalada de privilegios, movimiento lateral, persistencia, relay NTLM, MFA fatigue, AiTM/Evilginx, SIM swap, Golden SAML, privesc cloud…
- **Ataques (102)**: todo lo demás — las técnicas que Vulnerabilidades no cubre. Sinónimos como alias (p. ej. *ARP poisoning* → alias de *ARP Spoofing*), nunca filas duplicadas. El buscador lo confirma: "kerberoasting" en Ataques da **0 resultados** porque vive en Vulnerabilidades.

| Categoría (entradas) | Qué cubre |
|---|---|
| **IAM / Identidad (12)** | MS14-068 (PAC forjado) · Bronze Bit (CVE-2020-17049) · extracción SAM/LSA/NTDS.dit · recon AD (BloodHound) · keylogging · phishing de código de dispositivo · robo de PRT (Entra) · registro fraudulento de dispositivos · abuso de SCCM/MECM · abuso de Intune · AD Recycle Bin (reanimación) · inyección CSV |
| **Red / Sniffing (25)** | MITM (on-path) · ARP spoofing · envenenamiento DNS (spoofing + cache poisoning) · DHCP starvation y rogue DHCP · MAC flooding (CAM) · sniffing · port scanning · VLAN hopping · SSL stripping · evil twin/rogue AP · deauth Wi-Fi · BGP hijacking · ICMP redirect · CDP/LLDP · STP · MAC spoofing · tap físico · WPS/Pixie Dust · KRACK · Bluetooth · **rogue DHCPv6/mitm6 (SLAAC)** · **bypass de 802.1X/NAC (MAB, EAP-Logoff)** · **enumeración DNS (AXFR, subdominios)** · **envenenamiento de routing interior (RIP/OSPF/EIGRP)** |
| **DoS / DDoS (16)** | Botnets y vectores · SYN flood · ICMP flood/smurf · UDP flood · ping of death · teardrop · land · HTTP flood · Slowloris/RUDY · amplificación DNS/NTP/memcached · NXDOMAIN flood (water torture) · HTTP/2 Rapid Reset · XML bomb · **ReDoS** |
| **Web / Aplicación (19)** | SQLi · XSS · SSRF · command injection · path traversal/LFI · XXE · subida de archivos · webshell · deserialización · clickjacking · session hijacking · CORS · prototype pollution · cache poisoning · prompt injection (LLM) · **HTTP request smuggling (CL.TE/TE.CL)** · **inyección CRLF** · **HPP (contaminación de parámetros)** · **abuso de GraphQL (introspección/batching)** |
| **Ingeniería Social (9)** | Phishing/spear/whaling · vishing · smishing (y quishing) · BEC · baiting/USB · tailgating · watering hole · SEO poisoning/malvertising · deepfakes |
| **Malware / C2 / Exfil (8)** | Ransomware y doble extorsión · supply chain (SolarWinds, dependency confusion) · infostealers · criptojacking · wipers · **gusanos (propagación autónoma)** · beaconing C2 (Cobalt Strike/Sliver) · exfiltración por canales legítimos (rclone, Telegram) |

Cada entrada: descripción técnica, impacto IAM/SOC, **cómo funciona** (herramientas reales), **detección** (KQL/SPL/Sigma/Event IDs), **mitigación paso a paso** (checklist interactiva) y referencias. Filtros por categoría/severidad/MITRE, aviso anti-duplicados en el encabezado y deep-link por id (p. ej. `IAM-001`).

### 🛠️ Troubleshooting & Runbooks — 42 runbooks universales L1/L2 (V6)

Sección nueva del sidebar (grupo **Laboratorio**): **42 guías paso a paso universales** de troubleshooting, 100% offline, **sin input** — filtro por categoría y buscador fuzzy instantáneo por síntoma o tag. Cada runbook trae:

- **Síntomas típicos** (lo que el usuario reporta, tal cual)
- **Quick wins** (verificaciones de 30 segundos antes de la escalera larga)
- **Escalera de pasos** (5-9 pasos con **comandos PowerShell/CMD reales** y el resultado esperado de cada uno)
- **Verificación de cierre** (cómo confirmar que quedó resuelto)
- **Cuándo escalar** (criterio específico a L2/IAM/administración)

| Categoría | Cobertura |
|---|---|
| **Cuenta e Identidad (8)** | Cuenta bloqueada (4740/4625/badPwdCount) · password expirada · deshabilitada vs expirada · complejidad/historial · MFA no llega/SSPR · Entra Smart Lockout/Conditional Access · grupo no aplica (memberOf/replicación/token) · GPO no aplica (gpresult/LSDOU) |
| **Windows / OS (8)** | Perfil temporal · PC lenta 100% disco/CPU · Update atascado (SoftwareDistribution) · SFC/DISM · BSOD · servicio no inicia · inicio lento · Safe Mode/System Restore |
| **Redes (8)** | Sin IP/APIPA · DNS · WiFi 802.1X · VPN 800/809/691/812 · Proxy PAC/WPAD · unidad mapeada SMB (permisos SHARE×NTFS) · ping OK no navega · workflow completo ipconfig→ping→nslookup→tracert |
| **Microsoft 365 (8)** | Outlook bucle contraseña · OST corrupto · Autodiscover · OneDrive reset · Teams cache · licencia sin asignar · SharePoint 0x8004de40 · correos no llegan (quarantine) |
| **Hardware y Periféricos (8)** | Impresora offline/spooler · WSD→TCP 9100 · docking · BitLocker recovery (48 dígitos, Entra/MBAM) · Intune non-compliant · antivirus bloquea · disco C lleno · RDP 3389 |
| **Service Desk (2)** | Sesión de soporte remoto (consentimiento + red flags) · verificación de identidad anti-vishing para resets |

> **Migración V6**: aquí vive ahora el contenido de las 9 tools checklist que salieron del catálogo (Password & MFA Reset, BitLocker, Outlook, Impresoras, BSOD, Share/NTFS, Asistencia Remota, GPO). Los runbooks están **indexados en la búsqueda global** (`Ctrl+K`): buscar "bloqueada" o "vpn 691" lleva directo al runbook.

### 🎯 Service Desk CheatSheet — 62 fixes top L1/L2 sin input (V6)

Sección nueva del sidebar (grupo **Service Desk**): los **62 fixes más populares** de soporte, **sin input y 100% offline** — buscador fuzzy instantáneo + filtro por categoría. Cada entrada: el problema tal cual lo reporta el usuario, **el fix en 3-8 líneas con comandos copiables** y cómo verificar el cierre. Categorías: AD/Identidad (11) · Windows (17) · Redes (12) · Impresoras y Hardware (7) · Microsoft 365 (6) · Accesos y Permisos (3) · Ofimática y Comunicación (6).

> Pensado como consulta de escritorio: el usuario de soporte busca el síntoma ("no imprime", "pide contraseña", "vpn 800") y ejecuta. Indexado en `Ctrl+K` junto a los runbooks.

Todas las herramientas están integradas a la **búsqueda global** (`Ctrl+K`): encuentra notas, labs, términos, herramientas y eventos Windows con ranking fuzzy.

### 🎥 Política de videos — LA REGLA DE ORO

> **Los videos NUNCA entran a la base de datos ni a los backups. Solo viven en tu disco.**

- Eliges una **carpeta de videos** en `Configuración → Carpeta de Videos` (File System Access API).
- Al insertar un video (botón 🎬 o drag-and-drop), el archivo se **copia a esa carpeta** y la nota guarda solo una referencia limpia (`data-vault-video="nombre.mp4"`).
- Al abrir la nota, el video se resuelve a un `ObjectURL` efímero para reproducirlo — nunca se persiste el binario.
- Si se pierde el acceso o el archivo, la app muestra un placeholder con **Conceder acceso / Re-linkear carpeta / Buscar archivo**.
- **Backups ZIP excluyen videos por completo** — ligeros y portables; los videos ya están a salvo en tu carpeta.

### 📚 Glosario — 773 términos YA incluidos (offline, sin importar nada)

El glosario viene **sembrado de fábrica** con **770 términos** (base 194 + ampliación IAM/GRC/SOC 195 + HelpDesk/IT Support 250 + SysAdmin/Infra & Ops 134), en `src/vault/data/glossarySeedBase.ts` + `glossarySeedMore.ts` + `glossarySeedHelpDesk.ts` + `glossarySeedSysAdmin.ts`. Se cargan solos al abrir la app: **no hay nada que importar** — abre el Glosario y están todos ahí (lista A-Z + búsqueda + filtro por categoría + flashcards).

- **Seeding aditivo y no destructivo** (v18/v19): los términos se agregan una sola vez (dedupe por nombre normalizado, incluidos los soft-deleted). Si ya tenías los de versiones anteriores, NO se duplican ni se sobrescriben.
- Si borras un término **definitivamente** (Papelera → Eliminar), queda registrado y el seed **no lo revive** en el siguiente arranque.
- Cobertura (bloques):
  - **IAM (≈ 150)**: IAM/IGA/PAM/Access Management/Auth-MFA/Federation-SSO — JML, RBAC/ABAC, entitlements, mínimo privilegio, SoD, access reviews/certificaciones, provisioning/SCIM, SAML 2.0/OIDC/OAuth 2.0/JWT/PKCE, MFA/SSPR/Conditional Access/PIM, Entra ID (Access Packages, Entitlement Management, Identity Protection, B2B/B2C, sign-in logs), Active Directory profundo (OUs, FSMO, gMSA, SPN, Kerberos/NTLM, AGDLP, AdminSDHolder, LAPS, tiering, eventos 4720/4728/4732/…), Okta Workforce + System Log, SailPoint/Saviynt, CyberArk/BeyondTrust, AWS/GCP IAM, PowerShell, Microsoft Graph, ITDR (T1078/T1098, impossible travel, password spraying, pass-the-hash, kerberoasting, golden ticket)…
  - **GRC (≈ 20)**: política/estándar/procedimiento, controles, riesgo inherente/residual, auditoría, evidencia, ISO 27001, SOC 2, NIST CSF/800-53/800-63, GDPR, PCI DSS, SOX/ITGC, COSO, tres líneas de defensa…
  - **SOC (≈ 25)**: SIEM, EDR/XDR, SOAR, playbooks, MITRE ATT&CK, IOC/TTP, threat hunting, Sigma, KQL, MTTD/MTTR, event IDs clave de Windows, triage, escalamiento…
  - **SysAdmin/Infra & Ops (134)**: systemd/journalctl/timers, LVM, RAID/mdadm, RPO/RTO/regla 3-2-1, NFS/SMB/iSCSI/SAN/NAS, PKI/certificados TLS, DNS/DHCP/VLAN/VPN site-to-site/firewall (ufw/nftables), vSphere/Proxmox/Hyper-V/snapshots/datastores, Docker/Kubernetes/registries/VNet/security groups, Zabbix/Grafana/Prometheus/umbrales/SLI-SLO-SLA, Ansible/Terraform/IaC/CI-CD, SRE/NOC/postmortems/toil/runbooks, hardening/SELinux/AppArmor, fstab/inode/ext4/XFS, troubleshooting con top/iostat/vmstat…
- Cada término trae **definición corta** (flashcards), **definición larga práctica** (qué es + cómo aparece en el trabajo diario de un IAM Analyst) y **ejemplo** del día a día. El botón antiguo de "Packs" fue retirado — ya no hace falta.

### 👤 Perfil Profesional (multi-perfil) — tus CVs vivos + export a IA

Sección **Perfil Profesional** (sidebar): crea **tantos perfiles como quieras** (p. ej. *CV IAM 2026*, *CV SOC*, *CV English*) con un clic — **Nuevo perfil / Duplicar / Eliminar** en la barra de perfiles. El primero viene precargado con el perfil IAM del usuario (AD/ADUC, Entra ID, Okta, JML, RBAC, Access Reviews, SoD, ServiceNow, PowerShell, SC-300 en proceso, Español nativo, Inglés B2+, 10 títulos objetivo IAM, keywords ATS…):

- **12 secciones editables por perfil**: nombre del perfil + datos personales, puestos objetivo (chips), resumen, habilidades (**con estado real: Dominado / En proceso / Por aprender** — la IA solo presume lo dominado), herramientas (con nivel), experiencia (bullets por logro), educación, certificaciones, idiomas, proyectos, keywords ATS y notas de estrategia de búsqueda.
- **Autosave** idéntico al de los apuntes (debounce 1500ms + flush al cambiar de perfil/salir/recargar) sobre la tabla `profile` (Dexie v18, una fila por perfil).
- **Export .md / Copiar / Vista previa (por perfil)**: genera el **Markdown AI-ready** que EMPIEZA con instrucciones para la IA (rol, tarea, reglas anti-invención, cómo tratar lo "en proceso", uso de keywords ATS) y sigue con las 12 secciones estructuradas — se pega en ChatGPT/Claude/Gemini para obtener el CV perfecto. Nombre de archivo: `CV-Profile-<nombre>-<fecha>.md`.
- **Viajan en el backup ZIP** (`profiles.json` con todas las filas, formato 3.4.0): restaurarlos en otra máquina/USB recupera TODOS los perfiles; merge "latest wins" por fila — un backup viejo jamás revierte ediciones nuevas (el `profile.json` legacy de una fila sigue siendo importable).

### 🗺️ Roadmap IAM — checklist del Junior IAM / Identity Security Analyst

Sección **Roadmap IAM** (sidebar, con % de progreso en vivo): el **ROADMAP DEFINITIVO Junior IAM / Identity Security Analyst** completo como checklist interactivo — *Especialización Principal: IAM & Identity Governance | Ventaja Competitiva: SOC / Blue Team Background*.

- **Estructura**: 3 tiers + proyecto final → 14 fases → **52 ítems** (Tier 1 = el núcleo imprescindible con el 70% del esfuerzo; Tier 2 = valor empresarial (ITDR — el puente SOC↔IAM, Okta, IGA, PAM); Tier 3 = AWS IAM; + proyecto final *InnovateCorp* y certificación SC-300/estrategia laboral).
- Cada fase trae sus ítems de **Conceptos / Entrevista / Evidencia (Exit Criteria)** — la evidencia resaltada (icono + color ámbar).
- **Progreso persistente** (tabla `roadmapItems`, Dexie v18): global, por tier y por fase; sobrevive recargas y actualizaciones de la app (el seed jamás resetea tu progreso).
- **Export MD / Copiar**: genera el checklist completo con tu progreso (`Roadmap-IAM-<fecha>.md`) — ideal para pegárselo a una IA y pedirle un plan de estudio o un follow-up.
- **Viaja en el backup ZIP** (`roadmap.json`, formato 3.4.0) — el progreso sobrevive en el USB con merge "latest wins".

### 💾 Backups ZIP portables
- Exporta TODO el vault (apuntes como `.md`, labs, glosario, referencias, imágenes, PDFs, plataformas, categorías, tools, datasets Data & Intel, **perfiles profesionales**, **progreso de los roadmaps** y **la práctica de los simuladores** — Service Desk + SysAdmin Ops: tickets con estados y notas de cierre + roadmaps HelpDesk y SysAdmin) a un único ZIP con manifest versionado (formato **3.7.0**, schema Dexie v21).
- **V6 (3.6.0)**: el ZIP incluye además **snapshots de los datasets de referencia** (`troubleshootingRunbooks.json` + `serviceDeskCheatSheet.json`) para portabilidad/archivo — en la importación gana siempre el bundle de la app (latest-wins sin pérdida: el contenido viaja con la app). El `reviewItems.json` de backups ≤3.5.0 se ignora con gracia (la feature Review se eliminó).
- **v21 (3.7.0)**: añade `sysadminTickets.json` + `roadmapSysAdmin.json` — la práctica de guardia del SysAdmin Ops viaja en el ZIP con el mismo merge "latest wins" por `updatedAt`. Los backups 3.6.0 siguen siendo importables (si no traen tickets SysAdmin, el seed idempotente repone los que falten).
- Guardado directo a tu carpeta elegida (File System Access) o descarga.
- Import con **validación estricta** (schemas por tipo, protección anti zip-bomb, merge seguro con conflictos por `updatedAt`). Los backups legacy 3.2.0/3.3.0/3.4.0/3.5.0/3.6.0 siguen siendo importables.
- Los ZIPs legacy con videos los reporta como "ignorados" — nunca los importa.
- Los datasets de Data & Intel viajan como `intelItems.json` y también tienen export/import propio (.json y .csv) desde la vista. Los perfiles viajan como `profiles.json` (todas las filas, merge latest-wins por perfil; el `profile.json` legacy de una fila también se acepta) y los roadmaps como `roadmap.json` / `roadmapHelpDesk.json` / `roadmapSysAdmin.json` (merge latest-wins por ítem).
- **Respaldo automático (USB)**: además del manual, Configuración → *Respaldo automático* escribe ZIPs rotativos `VaultNotes-Auto-*.zip` en la carpeta de la app cada N minutos **con cambios sin respaldar** — mismo formato 3.7.0, fotos, PDFs, perfiles, roadmaps y tickets de los dos simuladores incluidos — conservando solo los últimos N. Con *Restaurar último backup* aterrizas en cualquier máquina en 2 clics (merge no destructivo).

### 🔍 Búsqueda global inteligente
Fuzzy + substring + acrónimos con ranking por tipo. Un solo atajo (`Ctrl+K`) para todo el vault. El índice está **cacheado y precomputado** (corpus estático indexado una vez; corpus de usuario re-indexado solo cuando cambian los datos) — instantáneo incluso con 1000+ notas.

### 🎒 En una memoria USB (app + fotos + todo)

Lleva VaultNotes **completa** en tu USB y úsala en cualquier Windows sin volver a descargar nada:

**Qué copiar (una sola vez)** — la carpeta del proyecto COMPLETA:
- `node_modules/` — dependencias ya instaladas: ninguna PC las descarga.
- `.next/` — el build de producción ya hecho: arranca en segundos.
- `tools/bun/` — runtime portable (si aún no lo tienes, el `.bat` lo instala **DENTRO de la USB** la primera vez que haya internet — solo esa vez; luego ninguna máquina lo descarga).

**En cada PC nueva** — doble clic en `IniciarVaultNotes.bat` y listo:
1. Si no hay Bun en la PC ni en la USB → lo instala dentro de la USB (única vez con internet).
2. Arranca el build de producción que ya viaja en la USB — aunque la letra de unidad haya cambiado (ver abajo).
3. La app se abre sola en el navegador.

**Tus datos y fotos viajan en la misma USB** — actívalo una vez:
1. Configuración → *Carpeta de la App* → elige la carpeta de la USB.
2. Configuración → *Respaldo automático (USB)* → **Activar**. Cada 10 min (configurable) con cambios sin respaldar, la app escribe un `VaultNotes-Auto-<fecha>.zip` rotativo en la USB — **apuntes, fotos y PDFs incluidos** — conservando los últimos N. Silencioso: si el permiso de la carpeta caducó (p. ej. reiniciaste el navegador), espera quieto — un clic en *Respaldar ahora* lo reactiva.
3. Al llegar a cualquier PC: Configuración → **Restaurar último backup** → todo vuelve con merge no destructivo (lo más nuevo por fecha de edición gana; nada se pierde).

**Videos**: elige la *Carpeta de Videos* apuntando a una carpeta de la USB y viajan también (REGLA DE ORO: nunca entran a la base ni a los backups).

**Actualizaciones en cualquier PC**: botón **Pull** del header (requiere Git instalado en esa PC: [git-scm.com](https://git-scm.com)).

> ¿Por qué hace falta el backup para cambiar de PC? Tus datos viven en el IndexedDB **del navegador de cada PC** (privacidad local-first: nada sale de la máquina). El respaldo rotativo en la USB es el puente: la USB siempre actualizada, y cada PC la importa en 2 clics.

### 📦 Mover / copiar / renombrar la carpeta — sin errores

Puedes mover la carpeta, copiarla a otra unidad, cambiarle la letra a la USB o renombrarla, y todo sigue funcionando:
- **El build de producción es portable** (verificado con server real): el server standalone resuelve sus rutas relativo a sí mismo y arranca desde cualquier ubicación.
- **La caché de dev no lo es** (Turbopack guarda rutas absolutas): el `.bat` lo detecta solo (marker `.vaultnotes-folder.txt`) y regenera ÚNICAMENTE `.next-dev`. Tu build, dependencias, datos y backups no se tocan.
- Coste del primer arranque tras mover: ~1–2 s extra limpiando la caché; el resto idéntico.
- ¿Quieres partir de cero por cualquier motivo? `IniciarVaultNotes.bat limpiar` (desde cmd, dentro de la carpeta).

---

## 🛠️ Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) · **React 19** |
| Lenguaje | **TypeScript 5** (strict) |
| UI | **Tailwind CSS 4** · **lucide-react** (sistema de diseño propio dark) |
| Base de datos | **Dexie 4** (IndexedDB, schema **v20**, 25 object stores) |
| Backup | **JSZip** (formato **3.6.0**, con gates anti zip-bomb) |
| Búsqueda | Índice fuzzy propio (Fuse.js-style, cacheado y precomputado) |
| Seguridad | **DOMPurify** (sanitizado de todo HTML persistido) |
| Estado | React hooks + stores ligeros (zustand) |

**Arquitectura**: 100% cliente (`ssr: false`), cero backend. Los datos viven en IndexedDB; los archivos grandes (PDFs/imágenes) en tablas blobs dedicadas (nunca bloquean los listados); los videos en tu disco (File System Access API).

---

## 📁 Estructura del proyecto

```
src/
├── app/                  # Next.js App Router (una sola ruta: /)
│   ├── page.tsx          # Boundary cliente + self-healing HMR (dev)
│   ├── layout.tsx        # Metadatos + fuentes
│   ├── globals.css       # Tema oscuro (Tailwind 4)
│   └── api/
│       ├── git/pull/     # Botón Pull (fetch + fast-forward + rebuild)
│       └── enrich-ticket/# [Enrich Online] del Triage (z-ai SDK, SOLO backend)
├── vault/                # (todo el código cliente — ver arriba)
│   ├── App.tsx           # Shell + navegación + shortcuts + lazy views
│   ├── components/
│   │   ├── Editor/       # RichEditor + editorMedia (REGLA DE ORO de videos)
│   │   ├── tools/        # Herramientas autocontenidas (35: 29 base + 6 hd/)
│   │   └── …             # NotesView, LabsView, GlossaryView, RoadmapView
│   │                     #  (IAM + variante hd), ProfileView, ToolsView,
│   │                     #  DataIntelView, BlogView, RunbooksView (V6),
│   │                     #  CheatSheetView (V6), HelpDeskView,
│   │                     #  SettingsView, TrashView, InboxView…
│   ├── data/             # Datasets offline (MITRE, Sigma, WinEvents, puertos,
│   │                     # HTTP, cron, vulnerabilidades 203, ataques
│   │                     # (attacks/ — 102 técnicas sin duplicar), catálogo de
│   │                     #  tools (35), glossarySeed* 639 términos,
│   │                     #  roadmapData 52 + roadmapHelpDeskData 65,
│   │                     #  helpDeskTickets 48 + helpDeskKB 28,
│   │                     #  troubleshootingRunbooks 42 (V6),
│   │                     #  serviceDeskCheatSheet 62 (V6)…)
│   ├── db/               # Dexie: schema v20 + migraciones v1→v20 (v20 retira
│   │                     #  reviewItems) + seeds (glosario 639, perfil IAM,
│   │                     #  roadmap 52, tickets 48, labs 4)
│   ├── integrations/     # Threat Intel opcional (VT, AbuseIPDB, OTX, Shodan)
│   ├── hooks/            # useDebouncedAutoSave, useToolPrefs,
│   │                     # useResizablePanel, useAutoBackupStatus
│   ├── store/            # Stores zustand (note, pendingTool, ioc, intel,
│   │                     #  helpdesk)
│   ├── utils/            # videoStorage (REGLA DE ORO), zipBackup (formato
│   │                     #  3.6.0 + snapshots de datasets), autoBackup (motor
│   │                     #  rotativo USB), profileExport (Markdown AI-ready),
│   │                     #  sanitizeHtml, fuzzySearch, markdown, pdfStorage…
│   └── types/            # Tipos compartidos (incl. ProfileDoc)
└── public/
    ├── sw.js             # Service worker (offline shell; NO corre en dev)
    └── manifest.webmanifest
```

---

## ⚡ Performance

- **Code-splitting**: la ruta `/` carga solo el shell (Sidebar + Header). Las 16 vistas y los 5 modales son chunks separados (`next/dynamic`) que se montan al usarse; el chunk de búsqueda se pre-calienta en idle tras el primer paint.
- **Shell mínimo**: el módulo de backup (JSZip + DOMPurify + zod + file-saver, ~100 KB) se carga con `import()` dinámico solo al exportar/importar un ZIP — nunca pesa en el arranque.
- **Grafo de herramientas estático dentro de su chunk**: las 35 herramientas viajan juntas en el chunk lazy de ToolsView — estático a propósito para robustez HMR en dev (VN-F-003: ~20 dynamic imports por tool rompían el runtime de Turbopack tras reinicios del dev server).
- **Búsqueda Ctrl+K**: corpus estático (~740 docs con runbooks + cheatsheet) indexado una vez a nivel de módulo; corpus de usuario re-indexado solo cuando cambian los datos (stamp FNV-1a sobre id+updatedAt); queries de 1 carácter sin fuzzy; contenido indexado acotado por nota.
- **Blobs aislados**: imágenes y PDFs viven en tablas dedicadas — los listados nunca los leen; los videos jamás entran a IndexedDB (REGLA DE ORO).
- **Re-renders acotados**: Sidebar y Header memoizados con callbacks estables; los modales solo se montan cuando abren; autoguardado con debounce de 1500 ms.
- **Service worker**: solo en producción, shell-only para offline; chunks siempre network-first (nunca cachea chunks de dev — en dev ni se registra).

---

## 🚀 Instalación y ejecución

**Requisitos (Windows)**: nada — el `IniciarVaultNotes.bat` instala **Bun** solo si falta. Navegador **Chromium** (Edge/Chrome recomendado — necesario para la carpeta de videos y guardado de backups vía File System Access API). Otros SO: [Bun](https://bun.sh) 1.x manual.

### 🖱️ Arranque con un clic (Windows) — 100% automático

> **`IniciarVaultNotes.bat`** (raíz del repo) — doble clic y la app se abre sola. **Sin pasos manuales y sin re-ejecutar nada**: el script resuelve todo en la misma ejecución.

1. **Puerto 3000** → si VaultNotes ya estaba corriendo, solo abre el navegador; si el puerto lo ocupa OTRA aplicación, te lo dice claro en vez de fallar raro.
2. **Bun** → 1) el de la carpeta (`tools\bun`, portable), 2) el del sistema, 3) si no hay ninguno **lo instala DENTRO de la carpeta** (una única vez, con internet) — desde entonces tu carpeta/USB lleva su propio runtime y ninguna máquina lo vuelve a descargar.
3. **Dependencias** → `bun install` automático solo la primera vez (o si quedó a medias).
4. **Carpeta movida / copiada / renombrada / otra letra de USB** → detectada sola (marker `.vaultnotes-folder.txt`): regenera ÚNICAMENTE la caché de desarrollo; build, dependencias y datos no se tocan.
5. **Producción primero** → si hay build arranca directo (listo en ~1 s); si no, **lo construye una única vez** (~1–3 min, con reintento webpack si Turbopack no puede) y a partir de ahí cada arranque es instantáneo — sin compilador de desarrollo ni Modo de desarrolladores en el día a día. Solo si el build fuera imposible arranca en modo desarrollo (con la lógica de siempre: Modo de desarrolladores + fallback webpack).
6. **Espera a que la app responda** (hasta ~4 min) y **abre tu navegador** en `http://localhost:3000`.
- Para **detener la app**: cierra la ventana minimizada *"VaultNotes (servidor) - NO CERRAR"* — nunca se cierra sola: si algo falla, queda abierta mostrando el error exacto.
- Reparación: `IniciarVaultNotes.bat limpiar` (desde cmd, dentro de la carpeta) — borra la caché de desarrollo y parte de cero.
- 💡 Si SmartScreen o tu antivirus bloquea el `.bat` la primera vez: clic derecho → Propiedades → **Desbloquear**, y vuelve a ejecutarlo.
- ⚠️ **No borres ni excluyas ese archivo del repo** — es el punto de entrada de un clic para Windows.

### 🩹 Windows: errores de Turbopack en dev (solución de problemas)

**Causa raíz resuelta por diseño:** los panics *"Failed to write app endpoint /page"* aparecían cuando el dev server corría **encima de los artefactos de un build de producción** (estado mixto en `.next`). Ahora dev y producción usan directorios separados (`next dev` → `.next-dev`, `next build` → `.next`), así que esa clase de corrupción es **imposible por construcción**. Además, el `.bat` arranca por defecto en **producción** (build ya compilado, sin Turbopack en runtime).

Si aun así arrancas el dev server a mano (`bun run dev`) y ves en la consola:

```
FATAL: An unexpected Turbopack error occurred ...
Turbopack Error: Failed to write app endpoint /page
```

en orden de eficacia:

1. **`IniciarVaultNotes.bat limpiar`** (o borra a mano la carpeta `.next-dev` y reinicia el server) — parte de una caché limpia.
2. **Activa el Modo de desarrolladores** (Turbopack crea symlinks y Windows los exige): Configuración → Privacidad y seguridad → Para desarrolladores → *Modo de desarrolladores: Activado*.
3. **Excluye la carpeta del proyecto en Windows Defender** (la protección en tiempo real bloquea escrituras de `.next-dev` a mitad de compilación).
4. Si el proyecto vive en una carpeta **sincronizada por OneDrive/Drive**, muévela fuera (los archivos bloqueados/dehidratados rompen el compilador).
5. Alternativa estable sin cambiar nada: `bun run dev --webpack` (el compilador webpack no usa symlinks; solo compila más lento la primera vez). El botón **Pull** también reintenta el build de producción con webpack si Turbopack falla.

### Manual (cualquier SO)

```bash
# 1. Instalar dependencias
bun install

# 2. Levantar en modo desarrollo (http://localhost:3000)
bun run dev

# 3. Calidad (0 errores esperados)
bun run lint
bun run typecheck
```

Build de producción:

```bash
bun run build
bun run start
```

> Los datos (IndexedDB) son por origen: `localhost:3000` y un build de producción en otro puerto son vaults separados. Usa **Guardar Backup / Importar** para mover datos entre orígenes.

---

## ⌨️ Atajos principales

| Atajo | Acción |
|---|---|
| `Ctrl+K` / `⌘K` | Búsqueda global (notas, labs, glosario, herramientas, comandos) |
| `Ctrl+Shift+Q` | Captura rápida → Inbox |
| `Ctrl+Shift+N` | Nueva nota |
| `Ctrl+Shift+L` | Nuevo lab |
| `Ctrl+Shift+I` | Abrir IoC Extractor |
| `Ctrl+Shift+T` | Abrir Timestamp Converter |
| `Ctrl+Shift+H` | Abrir Hash Toolkit |
| `Ctrl+Shift+R` | Abrir Regex Tester |
| `Ctrl+Shift+M` | Abrir MITRE ATT&CK |
| `Ctrl+V` | Pegar imágenes directo al editor |
| `Esc` | Cerrar modales |

> ⌨️ Los atajos de herramientas también aparecen en `Ctrl+K` (sección comandos) — no hace falta memorizarlos.

> Los atajos con `Ctrl+Shift` están desactivados mientras escribes en un campo — nunca interfieren con el navegador (por eso no hay atajos con solo `Ctrl`, p. ej. `Ctrl+T`/`Ctrl+S` siguen siendo del navegador).

---

## 🔒 Privacidad y red

- **Offline por defecto**: sin requests de red al cargar o usar la app.
- **Online opcional y explícito**:
  - *Threat Intel* — enriquecer IOCs (VirusTotal, AbuseIPDB, OTX, Shodan) solo al pulsar **[Enrich]**. API keys se guardan cifradas (AES-GCM) en un IndexedDB aparte.
  - *CVE Search* — consulta a NVD al buscar; offline muestra los CVEs guardados.
  - *[Enrich Online] del Ticket Triage* (V6) — botón opcional del parser de tickets: con **clic explícito + consentimiento** (la primera vez), envía el texto del ticket al backend LOCAL de la app (`/api/enrich-ticket`) para pedir sugerencias de categorización a la IA. **Nunca auto-envía nada**, el análisis offline funciona al 100% sin él, y el resultado se muestra en un panel aparte sin sobrescribir el análisis local. Sin conexión, el botón queda deshabilitado y todo lo demás sigue igual.
- **Service worker**: cachea el shell para uso offline en producción. En desarrollo **no se registra** (evita chunks stale del dev server).

---

## ✅ Verificación (estado actual)

> **v21 — Módulo SysAdmin completo + mejoras HelpDesk (pasada 12, navegador real)**: **Dexie v21 (migración 100% aditiva**: `sysadminTickets` + `roadmapSysAdminItems`) siembra en instalación nueva y de forma idempotente tras reload: **56 tickets OPS** (26 generales + 30 de la Semana de Guardia), **28 artículos KB sakb-***, **roadmap SysAdmin de 91 ítems** (4 tiers), **5 labs SysAdmin** (labsa-*) que elevan los labs sembrados a 9, **glosario 639→770** (+134 términos SysAdmin verificados: los 54 nombres canónicos presentes, 0 duplicados) y **perfil "SysAdmin Jr - Infra & Ops"** (tercer perfil coexistente). **Sidebar**: grupo "SysAdmin" con badge de abiertos + "Roadmap SysAdmin" en Carrera (verificados en drawer móvil 390px y escritorio). **SysAdmin Ops (3 pestañas E2E)**: Cola de Guardia con TODOS los filtros (estado · prioridad · **tipo Incidentes/Solicitudes/Cambios** · **entorno Linux 14/Win 11/Red 11/Storage 7/VM 6/Cloud 2/Multi 5** · categoría · ámbito · búsqueda · **orden Nº/Prioridad**) → ticket OPS-2001: modo estudio con revelado progresivo (pasos con comandos reales) → flujo nuevo → en progreso → **resuelto con nota de cierre (validación mín. 10 chars)** → stats "trabajados 1 (2%) · abiertos 55" → Semana de Guardia (5 días × 6 con temas y progreso) → KB 28 artículos con pasos/comandos y cross-links. **Roadmap SysAdmin**: 91 ítems, toggle persistente (1/91 verificado). **6 tools nuevas sa-*** (catálogo 35→**41**, todas interactivas verificadas): RAID Calculator (4×4TB RAID5 = 12 TB ✓), Cron Builder ("0 2 * * *" → "Todos los días a las 02:00" + próximas ejecuciones ✓), Firewall Rule Builder (los 5 dialectos ufw/iptables/nftables/firewalld/netsh ✓), systemd Unit Builder, LVM Planner, Disk Growth Planner. **Mejoras HelpDesk**: 48→**60 tickets** (12 L2 nuevos: MFA fatigue P1, bucle Outlook, Teams Rooms, PrintNightmare, ESP atascado, transport queue…), filtro tipo Incidentes/Solicitudes, orden Nº/Prioridad (P1 primero verificado), % de progreso en el header, copy del Dashboard actualizado. **Backup 3.7.0**: export/import de `sysadminTickets.json` + `roadmapSysAdmin.json` con conflict-guards latest-wins espejo del patrón HelpDesk. **Tarjeta SysAdmin Ops en el Dashboard** (cyan, accesible por teclado). `eslint` 0 · `tsc --noEmit` 0 · 0 errores de consola/página/dev.log · responsive 390/1440 verificado · VLM confirma layouts limpios y consistentes.

> **V6 (inventario + cleaner + reorg + runbooks + cheatsheet + QA — pasada 11, navegador real)**: FASE 0 (inventario con conteos reales del código: tools 44→**35**, glosario **639**, roadmap IAM 52 / HelpDesk 65, tickets 48, KB 28, ataques **102**) → FASE 1 (eliminación **completa** de la feature Review: vista, ruta, tabla Dexie v20 con `reviewItems: null`, botones "Revisar después", card del Dashboard y entrada de Ctrl+K — **0 referencias a la feature**; 0 labs de prueba en seeds — los 4 sembrados son contenido real; **54 archivos huérfanos eliminados** — los 48 componentes shadcn/ui no alcanzables + utils/use-toast/use-mobile + VaultLogo + iamGlossaryPacks + barrel de threatIntel + AUDIT_REPORT.md — y **41 dependencias retiradas** de package.json) → FASE 2 (sidebar reorganizado con **grupos con títulos**: CONOCIMIENTO → LABORATORIO → SERVICE DESK → CARRERA + pie Papelera/Config, orden exacto por spec, sin números mágicos) → FASE 3 (tools 44→**35**: SLA Calculator eliminada y las 9 guías/checklist migradas a runbooks; **AD Account Troubleshooter mejorado** con origen de lockout + replicación PDC/DC, reset flow de 5 fases con Entra writeback/SSPR, tabla AD lockout vs Smart Lockout, memberOf/OU/GPO y eventos 4625/4740/4723/4724/4726/4728/4732; **Ticket Triage con [Enrich Online] opcional**) → FASE 4 (datasets **troubleshootingRunbooks (42)** + **serviceDeskCheatSheet (62)** 100% offline sin input, vistas RunbooksView + CheatSheetView con buscador fuzzy instantáneo y filtro por categoría, **indexados en Ctrl+K**) → FASE 5 (backup **3.6.0**: snapshots de ambos datasets en el ZIP + `reviewItems.json` retirado; legacy 3.4.0/3.5.0 importables) → QA gates: `eslint` 0 · `tsc --noEmit` 0 · **grafo de imports: 142 archivos, 0 huérfanos** · E2E fresh-install: sidebar con orden exacto y conteos reales (Glosario 639, Troubleshooting 42, CheatSheet 62, Service Desk 48, Labs 4), **0 Review**, Ctrl+K "bloqueada" → runbook + cheatsheet + tool AD ✓, "impresora" → cheatsheet ✓ · **backup round-trip real**: export (blob 3.6.0 de ~1 MB) → borrado de IndexedDB → import → nota de prueba + 639 términos + 48 tickets + 52/65 roadmap + 2 perfiles restaurados, snapshots ignorados con latest-wins (documentado en consola) · **migración v20**: store `reviewItems` eliminado en fresh install (25 stores) · responsive 390/1440 sin overflow · 0 errores de consola/página/dev.log · VLM confirma sidebar con grupos y estilos intactos.
- `eslint` → 0 errores · `tsc --noEmit` → 0 errores
- **Revisión funcional final E2E (navegador real)**: notas (crear → autoguardado → reload → persistido), papelera (borrado suave → restauración), búsqueda `Ctrl+K` por contenido instantánea, Data & Intel end-to-end (alta manual → IoC Extractor "Guardar en Data & Intel (4)" → los 4 IoCs visibles al instante → dedup → export .json/.csv habilitado), **29/29 herramientas visibles (incluida Ataques: contador 89/89, aviso anti-duplicados visible, filtros por categoría — IAM 12, Red 25, DoS 16, Web 19, Social 9, Malware 8 —, búsqueda por alias — "arp poisoning" → RED-002 —, verificación de dedup — "kerberoasting" → 0 resultados en Ataques y presente en Vulnerabilidades (3/203) —, drawer completo con detección KQL y checklist de mitigación, Esc cierra)**, captura rápida → Inbox, Blog → descarga .md, backup ZIP → toast de confirmación, responsive 390/1440 px sin scroll horizontal, 0 errores de consola
- **Glosario sembrado + Roadmap + multi-perfil (pasada 8 — navegador real)**: instalación nueva → 389 términos presentes SIN importar nada (modal Packs eliminado; A-Z + búsqueda + detalle + flashcards funcionan; el término nuevo "Expiración y vigencia de tokens" aparece en el mazo). Roadmap: 52 ítems/3 tiers + proyecto final renderizados con el texto exacto, toggle de ítems → progreso global/tier/fase/sidebar (0%→2%) → persiste tras reload (doneAt registrado) → export MD con progreso real (1/52, [x] Gobernanza) → restaurado a 0. Perfil: seed "Perfil IAM" (21 skills) + crear "Perfil 2" + duplicar + eliminar (confirm) + renombrar con autosave + cambio de perfil con flush (nombre persiste) + export .md real con el nombre del perfil en el encabezado. Backup: ZIP v3.4.0/schema v18 con profiles.json + roadmap.json verificado (contenido inspeccionado) e importado de vuelta sin duplicar nada (389/52/1 exactos tras el round-trip). Móvil 390px y desktop 1440px sin scroll horizontal, 0 errores de consola/página/dev.log.
- **QA integral + auditoría de código muerto (pasada 9 — navegador real)**: grafo de imports de los 125 módulos de `src/` auditado → **0 archivos muertos** (todos alcanzables desde App.tsx) y **13 exports muertos eliminados** (`RoadmapProgress`, `ROADMAP_TOTAL_ITEMS`, re-exports del barrel del glosario, `goToTool` duplicado en `_shared` — ToolsView usa su versión local con limpieza de selección —, 5 interfaces de-exportadas a interno y el tipo `ToolCatalogEntry` duplicado en `fuzzySearch` unificado con el de `data/toolsCatalog`). **Nueva tarjeta "Roadmap IAM" en el Dashboard** (sección Learning, ahora grid de 4): % en vivo + done/total + barra de progreso + clic navega al checklist — accesible por teclado (Enter/Espacio) y con `role=progressbar`. Re-verificación E2E de todo: glosario (389 términos, búsqueda "SCIM" → 2 resultados, flashcards con rating Difícil/Bueno/Fácil), roadmap (toggle → 0%→2% en sidebar/tier/fase, persiste tras reload), multi-perfil (crear/duplicar/eliminar + vista previa MD de 120 líneas), JWT Decoder (decodifica token real), búsqueda global ("conditional" → término de glosario), backup manual sin errores, las 14 vistas renderizan. `eslint` 0 · `tsc --noEmit` 0 · 0 errores de consola/página/dev.log · responsive 390/1440 sin overflow.
- **Expansión HelpDesk/IT Support completa (pasada 10 — navegador real)**: FASE 1 (datos) → Dexie **v19** con glosario **639** (389+250), **48 tickets** Nexora, **28 KB**, roadmap HelpDesk **65 ítems** y 4 labs L1 siembran en instalación nueva e idempotentes tras reload. FASE 2 (tools) → **44 utilidades** (29+15 HelpDesk) con grupo HELPDESK en el catálogo, favoritos/recientes y Ctrl+K indexando las nuevas ("SLA" → SLA Calculator + Triage Parser; "BitLocker" → tool + glosario). FASE 3 (UI) → sección **Service Desk** (3 pestañas): cola master-detail con filtros live, modo estudio con revelado progresivo, flujo nuevo→en progreso→resuelto/escalado→cerrado con **nota de cierre obligatoria** (validación mín. 10 chars con alert), Proyecto Final 5 días × 6 tickets con deep-links, KB 28 artículos con comandos y cross-links a tickets y glosario; sección **Roadmap HelpDesk** (variante hd del RoadmapView) con 4 tiers y toggle persistente (1/65 → badge 2% tras reload); tarjetas Service Desk en Dashboard y 2 botones en Sidebar con badges en vivo. "Añadir a Notas" del ticket → nota con tabla escapada (anti-XSS). FASE 4 (backup) → **formato 3.5.0**: `helpdeskTickets.json` + `roadmapHelpDesk.json` en el export (verificado en los bytes del ZIP) y round-trip de import verificado: ticket nuevo importado, **conflicto latest-wins** respeta el trabajo local (ticket local más nuevo no pisado; ídem roadmap HD), fila malformada rechazada por Zod, reporte con los 2 contadores nuevos de conflicto. `eslint` 0 · `tsc --noEmit` 0 (src/vault) · 0 errores de consola/página · responsive 390 sin overflow.
- E2E verificado (pasadas previas): backups ZIP round-trip (export → import, formato 3.2.0), flujo completo de videos (insertar → persistencia → restart → re-link → export sin videos), Data & Intel (edición → borrado → import .json), integración Sigma Explorer y Detection Query Helper
- Auditoría de seguridad: 0 CRÍTICOS · 0 ALTOS · 0 MEDIOS · 0 BAJOS abiertos — los 6 hallazgos de la auditoría interna están fixeados y verificados en navegador (el reporte interno de proceso se retiró del repo: la evidencia que importa es el código y esta lista)
- Robustez HMR en dev: imports estáticos del grafo de herramientas + auto-recarga sanitizada ante errores de factory tras reinicios del dev server
- **Limpieza de repo (pasadas 1+2+3)**: análisis de grafo de imports — 0 archivos huérfanos (los 113 módulos de `src/` están referenciados), 2 funciones muertas eliminadas (`findVulnerabilityById`/`findAttackById`), 27 símbolos internos sin exportar, 0 `console.log`, 0 TODOs/FIXMEs, 0 `any`, todas las dependencias de `package.json` en uso y `.gitignore` completo (node_modules · .env · .next · out · dist · build · vercel). El repo solo contiene lo que corre: `AUDIT_REPORT.md` (artefacto interno) y la rama huérfana remota se retiraron.
- **Botón Pull — verificado E2E con navegador real (7 escenarios)**: al día ✓, pull con merge fast-forward + auto-recarga (commit aplicado en `git log`) ✓, repo sucio → abort con `git stash`/`git restore .` ✓, commits locales sin push → abort ✓, red caída (503 humano) ✓, auth GitHub 401 → estado ámbar con el comando `git remote set-url` exacto ✓, Git ausente (ENOENT) ✓. `GIT_TERMINAL_PROMPT=0` evita cualquier espera interactiva de credenciales.
- **Ciclo de máquina de estados re-verificado en navegador** (última pasada): `idle → pulling → mensaje → idle` completo, con la API respondiendo en <1 s y detección de commits-locals-sin-push funcionando (mensaje exacto, sin tocar nada).
- **Compatibilidad Windows (pasadas 4+5)**: el `IniciarVaultNotes.bat` es 100% automático — instala Bun solo (ruta completa `%USERPROFILE%\.bun\bin`, sin depender del PATH de ventanas nuevas ni de re-ejecutar), dependencias con detección de instalaciones a medias, **activa el Modo de desarrolladores de Windows solo (1 clic de UAC)** para que Turbopack pueda crear symlinks — con fallback automático a `next dev --webpack` si lo rechazas —, limpieza de `.next` cuando toca, servidor en ventana que **no se cierra sola** y finales de línea **CRLF garantizados** vía `.gitattributes`. Scripts de `package.json` multi-SO (fuera `tee`/`cp`/`NODE_ENV=` bash-isms): el copy del standalone vive en `scripts/postbuild.mjs` (fs puro) y el rebuild del botón **Pull** reintenta con webpack (`build:webpack`) si Turbopack falla — verificado que `--webpack` arranca y sirve la app completa en ambos modos.
- **Portabilidad + Turbopack de raíz (pasada 6)**: build standalone copiado a otra ruta arranca y sirve la app completa (verificado con server real: 200 + HTML correcto desde la ruta nueva — base del flujo USB). Dev separado en `.next-dev` y prod en `.next` (distDir según NODE_ENV): la mezcla dev/prod que provocaba los panics *"Failed to write app endpoint /page"* es imposible por construcción (verificado: dev y prod corriendo simultáneos sin un solo panic). `.bat` reescrito: Bun portable dentro de la carpeta (`tools\bun`, instalación vía `BUN_INSTALL`), detección de carpeta movida por marker con comparación findstr, chequeo de identidad del puerto 3000 (no confunde otra app), build de producción en el primer arranque con doble fallback (Turbopack→webpack, luego dev), modo `limpiar`, redirects y escapes batch auditados (rutas con espacios/`&`/final en dígito). **Auto-respaldo rotativo + Restaurar último backup**: motor con detección de cambios por hooks core de Dexie, ZIPs `VaultNotes-Auto-*.zip` con retención, merge no destructivo al restaurar — verificados a nivel lógico y UI; los diálogos nativos de carpeta (File System Access) no son automatizables en navegador headless, por lo que el flujo de escritura quedó verificado por código + la exportación manual equivalente (mismo builder `buildVaultZipBlob`) E2E en pasadas previas.

---

## 🔄 Botón Pull (header, arriba a la derecha)

Descarga actualizaciones de código directamente desde GitHub (`git fetch` +
fast-forward puro): features nuevas, fixes y borrados de archivos se aplican
sin tocar tus datos (notas, labs, glosario… viven en IndexedDB en tu
navegador). Si cambiaron dependencias (`package.json`/`bun.lock`) reinstala
automáticamente. Si hay commits locales sin push o cambios sin confirmar,
aborta para no perder nada — con instrucciones exactas de qué hacer.

Estados del botón (icono + color):

| Estado | Significado |
|---|---|
| ⬇ gris `Pull` | normal |
| ⟳ verde `Pull…` | trabajando (fetch + merge) |
| ✅ verde | al día, o cambios aplicados (dev: la página se recarga sola y Turbopack recompila) |
| 🟡 ámbar ⟳ `restart` | **producción**: el build se regeneró — cierra la ventana *"VaultNotes (servidor)"* y vuelve a abrir `IniciarVaultNotes.bat` (no auto-recarga: el server viejo seguiría sirviendo el build anterior) |
| 🟡 ámbar 🔑 `token` | GitHub rechazó el acceso — el tooltip lleva el comando exacto: `git remote set-url origin https://TU_TOKEN@github.com/...` |
| ⚠ rojo | error con mensaje humano: red caída, Git no instalado, repo sucio (`git stash` / `git restore .`), commits sin push… |

En producción el pull solo regenera el build (`bun run build`) si el cambio
tocó código real (`*.ts/tsx`, `src/`, `public/`, deps, config) — un pull que
solo cambia `*.md` no rebuild y no pide reiniciar.

---

## 📄 Licencia

Uso personal / proyecto educativo de ciberseguridad. Sin garantía expresa o implícita.
