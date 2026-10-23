# VAULTNOTES

**Tu segundo cerebro de ciberseguridad.** Una PWA **local-first y 100% offline** para estudiar, trabajar y investigar ciberseguridad como se hace en el puesto real: **4 PILARES AUTÓNOMOS** (Pilar 1 **IAM** · Pilar 2 **SOC/Blue Team** · Pilar 3 **Service Desk** · Pilar 4 **SysAdmin Ops**), cada uno con su simulador de tickets, roadmap, Troubleshooting y Runbooks — y cada runbook presentado como **ticket real de trabajo** con paso a paso universal, comandos copiables y **respuesta en inglés lista para copiar**. Apuntes con editor rico, glosario con flashcards (**850 términos**), **48 herramientas de análisis en UN solo catálogo unificado** (cada tool una vez, etiquetada con su rol), **209 runbooks** (los quick-fixes del antiguo CheatSheet viven ahora dentro de Runbooks), simulador IAM con **Semana de Access Review**, y backups ZIP portables — todo dentro de tu navegador, sin servidor, sin cuenta, sin nube.

> 🎯 **V12 — IAM al máximo + GITHUBVAULT + Pull espejo**: el Pilar 1 IAM queda **lo más completo posible** — **50 tickets · 36 runbooks · 30 escaleras de decisión · KB de 50 artículos · roadmap de 154 ítems en 23 fases** (Directory Services/LDAP, modelo de roles RBAC, granting/revoking de privilegios, identity life-cycle, Access Reviews, PAM profundo, **Okta**, **SailPoint**, **One Identity Safeguard**, **ForgeRock**, **Ping Identity**, **IBM Security Verify/ISAM**, **Oracle Access Manager**, MFA/FIDO2, SSO/federación). Los roadmaps de los 4 pilares ganan especificidad: SOC 93 ítems · Service Desk 93 · SysAdmin 119. Glosario ampliado a **850 términos** (+77 de plataformas IAM/PAM). **GITHUBVAULT**: videos e imágenes se guardan por defecto en `Documentos/GITHUBVAULT/videos` y `/imagenes` (editable en Configuración) — nunca en la base del navegador. **Pull a tu medida**: Pull seguro (fast-forward, nunca pierde nada) o **Espejo exacto con GitHub** (deja el disco IGUAL al repo — descarta commits locales, restaura modificados y borra lo que ya no existe en GitHub; tus datos y backups jamás se tocan).

> 🔒 **Privacidad por diseño**: tus datos nunca salen de tu máquina. La base de datos vive en IndexedDB (tu navegador). La app es **100% offline**: las dos únicas piezas con red son opcionales y explícitas — el botón **Pull** (descarga tus propias actualizaciones de código desde GitHub) y **[Enrich Online]** del Ticket Triage (clic explícito + consentimiento, nunca auto-envía nada).

## ⚡ Resumen en 3 minutos

| Pregunta | Respuesta |
|---|---|
| **¿Qué es?** | Tu segundo cerebro de ciberseguridad, 100% en tu navegador — sin cuenta, sin nube, sin servidor de datos. |
| **¿Cómo lo arranco?** | Windows: doble clic en `IniciarVaultNotes.bat` — resuelve todo solo (Bun incluido si falta) y abre el navegador. Cualquier SO: `bun install` + `bun run dev`. |
| **¿Puedo llevarla en una USB?** | Sí — la carpeta es 100% portable (app + runtime + build) y el **Respaldo automático** hace que tus fotos y apuntes viajen en la misma USB. Ver sección 🎒 abajo. |
| **¿Dónde están mis datos?** | En IndexedDB de tu navegador (tu PC). Backups ZIP para cambiar de máquina/navegador — o activa el Respaldo automático y llévalos en tu USB. |
| **¿Qué hay dentro?** | **4 pilares autónomos** — IAM: 50 tickets + 50 KB + 36 runbooks + 30 troubleshooting + roadmap 154; SOC: roadmap 93 + 41 runbooks + 22 troubleshooting; Service Desk: 60 tickets + 28 KB + 64 runbooks + 24 troubleshooting + roadmap 93; SysAdmin: 56 tickets + 28 KB + 68 runbooks + 22 troubleshooting + roadmap 119. Además: **48 herramientas offline** con etiqueta de rol, explorador de Vulnerabilidades (203) y Ataques (102), apuntes con editor rico, glosario con flashcards (**850 términos**), y un **sidebar que reordenas a tu gusto** (arrastrar + plegar). Labs **vacío intencional**. |
| **¿Y si actualizo el código?** | Botón **Pull** del header: **Pull seguro** (fast-forward, nunca pierde nada) o **Espejo exacto con GitHub** (menú ⌄ — deja el disco IGUAL que el repo: descarta commits locales sin push, restaura archivos modificados y borra los que ya no existan; tu base de datos, backups y carpetas ignoradas NUNCA se tocan). En producción regenera el build solo y te pide reiniciar. |
| **Regla de oro** | Los **videos y las imágenes nunca entran a la base ni a los backups** — viven en `Documentos/GITHUBVAULT/videos` y `/imagenes` (carpeta configurable), como archivos reales en tu disco. |

---

## ✨ Características

### 🗂️ Sidebar a tu gusto (V11)
- **Arrastra apartados**: cualquier sección (p. ej. sube *Inbox* arriba del todo) y **grupos enteros** (p. ej. baja *Global Knowledge* al final) se reordenan arrastrando — el orden se guarda en tu navegador y sobrevive recargas y actualizaciones.
- **Plega y despliega grupos con un clic**: el grupo que contiene tu sección activa siempre se revela solo — nunca te esconde dónde estás.
- Tolerante a versiones: secciones nuevas que lleguen con actualizaciones aparecen solas (nunca se pierde nada del orden guardado).

### 🧰 Herramientas — UN catálogo global, cada tool una vez (V11)
> Un solo apartado **Herramientas** arriba del todo. Las 48 tools interactivas aparecen **una sola vez**, cada una con su **etiqueta de rol** (IAM · SOC · Service Desk · SysAdmin · Global) — sin copiar y pegar entre pilares. Filtro por rol, favoritos y recientes globales, búsqueda instantánea y `Ctrl+K` indexado.

| Rol | Herramientas |
|---|---|
| **IAM** | JWT Decoder · SID/RID Analyzer · LDAP/DN Parser · RBAC Analyzer · Vulnerabilidades IAM/SOC (203) · Ataques (102) |
| **SOC** | Windows Event IDs (93) · IoC Extractor (refang, scoring, KQL/SPL/STIX) · IOC Defanger · PowerShell Analyzer · Command Line Analyzer · Log Parser · MITRE ATT&CK · Sigma Explorer · Detection Query Helper (KQL/SPL) · Hash Toolkit · File Hash Analyzer · CVSS 3.1 · IP Analyzer · Timestamp Converter · HTTP Status · **8 guías de tools SOC** (Sentinel KQL · Splunk SPL · Elastic · Wireshark · Sysmon · Defender · VirusTotal+ANY.RUN · TheHive — referencia copiable 100% offline) |
| **Service Desk** | Ticket Triage Parser (motor offline de 91 reglas + **[Enrich Online] opcional** con consentimiento explícito) · AD Account Troubleshooter · KB Article Generator · Network L1 (intérprete de ipconfig) · Intune/Autopilot · System Info Sanitizer |
| **SysAdmin** | Subnetting · Puertos y Servicios (119) · Cron Parser · Linux Permissions (chmod) · systemd Unit Builder · RAID Calculator · LVM Planner · Cron Builder · Firewall Rule Builder (ufw/iptables/nftables/firewalld/netsh) · Disk Growth Planner |
| **Global** | Base Converter · Encoding/Decoding (Base64/Hex/URL/ASCII/Unicode/HTML) · Regex Tester (14 presets) |

### 📝 Conocimiento
- **Apuntes** con editor rico (WYSIWYG): títulos, listas, checkboxes, tablas, código, imágenes, PDFs adjuntos y **videos** (ver política de videos abajo). Jerarquía de subpáginas, plataformas/categorías, favoritos.
- **Glosario (sembrado)** — **850 términos incluidos** (base + IAM/GRC/SOC + 250 HelpDesk/IT Support + SysAdmin/Infra & Ops + **77 de plataformas IAM/PAM**: Okta, SailPoint, Ping, ForgeRock, ISAM, OAM, Safeguard, CyberArk, FIDO2/WebAuthn, LDAP, gobernanza…) + **flashcards** con repaso espaciado: abre la app y están todos ahí, sin importar nada.
- **Perfil Profesional (multi-perfil)** — tus CVs vivos con export **Markdown AI-ready** para que tu IA te arme el CV perfecto.
- **Roadmap IAM** — checklist del *Junior IAM / Identity Security Analyst* (3 tiers + proyecto final, **154 ítems en 23 fases**: fundamentos, AD/LDAP, Entra ID, Graph, SSO/SCIM, MFA, life-cycle, PowerShell, troubleshooting, modelo de roles, granting, revoking, access reviews, PAM, Okta, SailPoint, Ping/ForgeRock/IBM/Oracle, ITDR, AWS, identidades no-humanas y lab final), persistente y exportable. Los roadmaps SOC (93), Service Desk (93) y SysAdmin (119) ganaron la misma especificidad.
- **Inbox + Captura rápida** (Ctrl+Shift+Q), **Referencias**, **Papelera** con restauración, **Generar Blog** (exporta apuntes/labs como blog estático).

### 🎟️ Los 4 pilares — simuladores de tickets reales (Nexora S.A.)
Todos los simuladores comparten la misma mecánica profesional: cola filtrable (estado/prioridad/tipo/entorno/categoría/búsqueda/orden), **modo estudio** (la guía se OCULTA — primero intentas, luego contrastas), flujo de estados real con **nota de cierre obligatoria** como evidencia, y **KB enlazada** (solo lectura). El trabajo persiste en Dexie y viaja en el backup ZIP.

| Pilar | Simulador | Proyecto final |
|---|---|---|
| **1 · IAM** | 50 tickets del equipo IAM: JML (onboarding/offboarding/traslados), Access (grupos, licencias, accesos temporales), PAM (checkouts, break-glass), Gobernanza (SoD, certificaciones), Infra IAM (AD↔Entra, SSO/SAML, cuentas de servicio) + **KB de 50 artículos** con capa completa de plataformas (Okta, SailPoint, Safeguard, Ping, ForgeRock, IBM, Oracle, LDAP, role model, granting/revoking, MFA/SSO, access reviews) | **Semana de Access Review** — 10 tickets (2/día × 5 días): del kickoff al cierre con firma, KPIs y postmortem |
| **2 · SOC** | 50 casos del Blue Team por torre de detección (Identity/Endpoint/Network/Email/Cloud/Web) | Primera semana SOC (30 casos) |
| **3 · Service Desk** | 60 tickets L1/L2 con triage ITSM | "Primera semana" (30 tickets, 5 días) |
| **4 · SysAdmin Ops** | 56 tickets de guardia por entorno (Linux/Windows Server/Red/Storage/VM/Cloud), incl. cambios con ventana y rollback | Semana de Guardia (30 tickets, 6/día × 5 días) |

### 🛠️ Troubleshooting + Runbooks (V11: fusionados, sin duplicados)
Cada pilar tiene sus dos secciones de conocimiento consultable, 100% offline:

- **Troubleshooting** — escaleras de decisión: PROBLEMA → SÍNTOMA → CHECK (con comando copiable) → RESULTADO → SIGUIENTE ACCIÓN. 24/22/22/30 entradas (HD/SA/SOC/IAM).
- **Runbooks** — cada problema como **ticket real**: ticket_example, impacto, síntomas, causas raíz, prerrequisitos, escalera universal con comandos copiables, verificación, evidencia, escalación y las **dos respuestas EN INGLÉS** (cliente + explicación técnica para L2). **64/68/41/36** por pilar (los 12 nuevos de IAM cubren Okta SSO/SCIM, SailPoint certificaciones/conectores, Safeguard checkout, PingFederate SP SAML, ForgeRock SSPR, ISAM policies, OAM sesión, taller de role engineering, LDAP bind, rollout FIDO2).
- **La fusión V11**: el antiguo CheatSheet vive ahora AQUÍ — cada quick-fix se convirtió a formato runbook completo (o se fusionó con su runbook gemelo si existía, absorbiendo sus comandos únicos). **Cero duplicados**: 143 duplicados detectados y resueltos; los ids CS-* se conservan para que los enlaces antiguos sigan funcionando.

### 🎥 Política de videos e imágenes (V12) — LA REGLA DE ORO
> **Los videos y las imágenes NUNCA entran a la base de datos ni a los backups. Solo viven en tu disco.**
- **GITHUBVAULT por defecto (V12)**: en Configuración → *GITHUBVAULT — Videos e Imágenes*, un clic abre el selector en **Documentos**, eliges la carpeta y la app crea sola `GITHUBVAULT/videos` y `GITHUBVAULT/imagenes`. Todo lo que insertes desde ahí se copia a esas carpetas y la nota guarda solo una referencia limpia (`data-vault-video="…"` / `data-vault-img="…"`).
- **Editable**: puedes elegir otra carpeta base en cualquier momento (misma estructura), o seguir usando una carpeta de videos personalizada.
- Sin carpeta de imágenes configurada, las imágenes se insertan embebidas (data-URL, límite 25 MB) como en versiones anteriores — compatibilidad total con notas existentes.
- **Backups ZIP excluyen videos e imágenes de carpeta por completo** — ligeros y portables; los archivos ya están a salvo en tu disco. Al cambiar de PC: copia `GITHUBVAULT` tal cual y re-configura la carpeta.

### 💾 Backups ZIP portables
- Exporta TODO el vault (apuntes `.md`, labs, glosario, referencias, imágenes, PDFs, plataformas, categorías, perfiles, progreso de TODOS los roadmaps y la práctica de TODOS los simuladores — Service Desk, SysAdmin, SOC e IAM) a un único ZIP con manifest versionado (formato **3.11.0**, schema Dexie **v25**).
- Import con **validación estricta** (schemas Zod por tipo, protección anti zip-bomb, merge "latest wins" por `updatedAt` — un backup viejo jamás revierte trabajo nuevo). Los backups 3.2.0→3.11.0 siguen siendo importables; los archivos de Data & Intel de backups viejos (≤3.10.0) se ignoran con gracia.
- **Respaldo automático (USB)**: ZIPs rotativos `VaultNotes-Auto-*.zip` cada N minutos con cambios sin respaldar + *Restaurar último backup* en 2 clics.
- **Snapshots de referencia**: los datasets de runbooks/troubleshooting viajan en el ZIP como snapshot informativo (el bundle de la app siempre prevalece).

### 🔍 Búsqueda global inteligente
Fuzzy + substring + acrónimos con ranking por tipo. Un solo atajo (`Ctrl+K`) para todo el vault: notas, labs, glosario, herramientas, runbooks (incluidos los quick-fixes ex-CheatSheet), troubleshooting, MITRE, Sigma, eventos, comandos. El índice está **cacheado y precomputado** — instantáneo incluso con 1000+ notas.

### 🎒 En una memoria USB (app + fotos + todo)
Lleva VaultNotes **completa** en tu USB y úsala en cualquier Windows sin volver a descargar nada: copia la carpeta COMPLETA (con `node_modules/`, `.next/` y `tools/bun/`), doble clic en `IniciarVaultNotes.bat`, y activa *Carpeta de la App* + *Respaldo automático* apuntando a la USB una sola vez. Cambios de letra de unidad, movimientos y renombres de carpeta se detectan solos (ver sección 📦 abajo). **Videos e imágenes**: copia también la carpeta `GITHUBVAULT` a la USB (o configúrala dentro de la USB) y viajan igual (REGLA DE ORO).

> ¿Por qué hace falta el backup para cambiar de PC? Tus datos viven en el IndexedDB **del navegador de cada PC** (privacidad local-first: nada sale de la máquina). El respaldo rotativo en la USB es el puente: la USB siempre actualizada, y cada PC la importa en 2 clics.

### 📦 Mover / copiar / renombrar la carpeta — sin errores
El build de producción es portable (rutas relativas); la caché de dev no, y el `.bat` la regenera sola si detecta que la carpeta se movió (marker `.vaultnotes-folder.txt`) — tu build, dependencias, datos y backups no se tocan. `IniciarVaultNotes.bat limpiar` parte de cero si algún día hace falta.

---

## 🛠️ Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) · **React 19** |
| Lenguaje | **TypeScript 5** (strict) |
| UI | **Tailwind CSS 4** · **lucide-react** (sistema de diseño propio dark) |
| Base de datos | **Dexie 4** (IndexedDB, schema **v25**, 25 object stores) |
| Backup | **JSZip** (formato **3.11.0**, gates anti zip-bomb + validación Zod) |
| Búsqueda | Índice fuzzy propio (cacheado y precomputado) |
| Seguridad | **DOMPurify** (sanitizado de todo HTML persistido) |
| Estado | React hooks + stores ligeros (zustand) |

**Arquitectura**: 100% cliente (`ssr: false`), cero backend de datos. Los datos viven en IndexedDB; los archivos grandes (PDFs/imágenes) en tablas blobs dedicadas; los videos en tu disco (File System Access API).

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
├── vault/                # (todo el código cliente)
│   ├── App.tsx           # Shell + navegación + shortcuts + lazy views
│   ├── components/
│   │   ├── Editor/       # RichEditor + editorMedia (REGLA DE ORO de videos)
│   │   ├── tools/        # Herramientas autocontenidas (hd/ · sa/ · soc/ · base)
│   │   └── …             # NotesView, GlossaryView, RoadmapView (4 variantes),
│   │                     #  ProfileView, ToolsView (catálogo global V11),
│   │                     #  RunbooksView (V11: incluye quick-fixes), IamView,
│   │                     #  HelpDeskView, SysAdminView, SocView, Sidebar
│   │                     #  (drag + fold V11), SettingsView, TrashView…
│   ├── data/             # Datasets offline: runbooksHelpDesk 64 /
│   │                     #  runbooksSysAdmin 68 / runbooksSoc 41 /
│   │                     #  runbooksIam 24 (V11), troubleshooting* (4 pilares),
│   │                     #  iamTickets 50 + iamKB 24 (V11), helpDeskTickets 60,
│   │                     #  sysadminTickets 56, socTickets 50, KBs (28/28/16),
│   │                     #  MITRE, Sigma, WinEvents, puertos, HTTP, cron,
│   │                     #  vulnerabilidades 203, ataques 102, toolsCatalog 48,
│   │                     #  glossarySeed* 770, roadmaps (52/65/91/65)
│   ├── db/               # Dexie: schema v25 + migraciones v1→v25 (v25 retira
│   │                     #  las tablas de Data & Intel y añade iamTickets)
│   ├── integrations/     # online.ts (indicador de conectividad local)
│   ├── hooks/            # useDebouncedAutoSave, useToolPrefs,
│   │                     #  useResizablePanel, useAutoBackupStatus
│   ├── store/            # Stores zustand (note, pendingTool, ioc, helpdesk,
│   │                     #  sysadmin, soc, iam, sidebarLayout)
│   ├── utils/            # videoStorage, zipBackup (3.11.0), autoBackup,
│   │                     #  profileExport, sanitizeHtml, fuzzySearch…
│   └── types/            # Tipos compartidos (incl. ProfileDoc, IamTicket)
└── public/
    ├── sw.js             # Service worker (offline shell; NO corre en dev)
    └── manifest.webmanifest
```

---

## ⚡ Performance

- **Code-splitting**: la ruta `/` carga solo el shell (Sidebar + Header). Las vistas y modales son chunks separados (`next/dynamic`) que se montan al usarse; el chunk de búsqueda se pre-calienta en idle tras el primer paint.
- **Shell mínimo**: el módulo de backup (JSZip + DOMPurify + zod + file-saver, ~100 KB) se carga con `import()` dinámico solo al exportar/importar un ZIP.
- **Grafo de herramientas estático dentro de su chunk**: las 48 herramientas viajan juntas en el chunk lazy de ToolsView — estático a propósito para robustez HMR en dev (VN-F-003).
- **Búsqueda Ctrl+K**: corpus estático (~740 docs con runbooks de los 4 pilares) indexado una vez a nivel de módulo; corpus de usuario re-indexado solo cuando cambian los datos.
- **Blobs aislados** (imágenes/PDFs en tablas dedicadas) y videos jamás en IndexedDB (REGLA DE ORO).
- **Re-renders acotados**: Sidebar y Header memoizados con callbacks estables; modales solo montados al abrirse; autoguardado con debounce 1500 ms.

---

## 🚀 Instalación y ejecución

**Requisitos (Windows)**: nada — el `IniciarVaultNotes.bat` instala **Bun** solo si falta. Navegador **Chromium** (Edge/Chrome — necesario para la carpeta de videos y guardado de backups vía File System Access API). Otros SO: [Bun](https://bun.sh) 1.x manual.

### 🖱️ Arranque con un clic (Windows) — 100% automático

> **`IniciarVaultNotes.bat`** (raíz del repo) — doble clic y la app se abre sola.

1. **Puerto 3000** → si VaultNotes ya corría, solo abre el navegador; si el puerto lo ocupa OTRA app, te lo dice claro.
2. **Bun** → 1) el de la carpeta (`tools\bun`, portable), 2) el del sistema, 3) se instala DENTRO de la carpeta (una única vez, con internet).
3. **Dependencias** → `bun install` automático solo la primera vez.
4. **Carpeta movida/copiada/renombrada** → detectada sola: regenera SOLO la caché de dev.
5. **Producción primero** → si hay build arranca directo (~1 s); si no, lo construye una única vez (~1–3 min).
6. Espera a que la app responda y **abre tu navegador**.
- Para **detener**: cierra la ventana *"VaultNotes (servidor) - NO CERRAR"*.
- Reparación: `IniciarVaultNotes.bat limpiar`.
- ⚠️ **No borres ese archivo del repo** — es el punto de entrada de un clic para Windows.

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

> Los datos (IndexedDB) son por origen: `localhost:3000` y un build en otro puerto son vaults separados. Usa **Guardar Backup / Importar** para mover datos entre orígenes.

---

## ⌨️ Atajos principales

| Atajo | Acción |
|---|---|
| `Ctrl+K` / `⌘K` | Búsqueda global (notas, labs, glosario, runbooks, herramientas, comandos) |
| `Ctrl+Shift+Q` | Captura rápida → Inbox |
| `Ctrl+Shift+N` / `Ctrl+Shift+L` | Nueva nota / nuevo lab |
| `Ctrl+Shift+I` / `T` / `H` / `R` / `M` | Abrir IoC Extractor / Timestamp / Hash / Regex / MITRE |
| `Ctrl+V` | Pegar imágenes directo al editor |
| `Esc` | Cerrar modales |

> Los atajos con `Ctrl+Shift` están desactivados mientras escribes — nunca interfieren con el navegador.

---

## 🔒 Privacidad y red

- **100% offline**: sin requests de red al cargar ni al usar la app. Las herramientas, los 4 pilares, los datasets y la búsqueda funcionan completos sin internet.
- **Las dos únicas piezas con red** (opcionales y explícitas):
  - **Botón Pull** (header) — descarga TUS actualizaciones de código desde GitHub; jamás envía datos del vault.
  - **[Enrich Online]** del Ticket Triage (Service Desk) — con **clic explícito + consentimiento** (una sola vez), envía el texto del ticket al backend LOCAL (`/api/enrich-ticket`) para sugerencias de categorización. **Nunca auto-envía nada**; el análisis offline funciona al 100% sin él.
- **Service worker**: cachea el shell para uso offline en producción. En desarrollo no se registra.

---

## ✅ Verificación (estado actual — V11)

> **V11 — 4 pilares + herramientas unificadas + sidebar libre + retirada total de Data & Intel (navegador real)**: `(1)` **Retirada completa** de la feature Data & Intel y del Threat Intel (los 4 proveedores VT/AbuseIPDB/OTX/Shodan, CVE Search/NVD/KEV/EPSS, Sync Center de MITRE/Sigma, consentimientos y credenciales): 26 archivos eliminados, 18 limpiados, Dexie **v25** (las 9 tablas de intel se retiran con el patrón delta `null` del repo; la BD `VaultIntelDB` y las claves retiradas se limpian una vez), backup **3.11.0** (los 9 .json de intel dejan de viajar; los backups viejos se importan con gracia), Settings sin el panel Online, sidebar y header sin indicadores dinámicos. `(2)` **Pilar 1 · IAM completo**: simulador clonado del patrón profesional — 50 tickets sembrados (JML 10 · Access 9 · PAM 9 · Gobernanza 11 · Infra IAM 7 · Multi 4 · Incidentes 23/Solicitudes 16/Cambios 11), **Semana de Access Review** (5 días × 2, del kickoff al postmortem), KB de 24 artículos, 24 runbooks RB-IAM-*, 18 escaleras de decisión TS-IAM-*, backup `iamTickets.json` + Dashboard. `(3)` **Fusión CheatSheet→Runbooks sin duplicados**: 176 quick-fixes analizados — 143 duplicados resueltos (7/35/34+101 mapeados a sus runbooks gemelos, absorbiendo los comandos únicos que faltaban), 33 convertidos a formato runbook completo — HD 52→**64**, SA 48→**68**, SOC 40→**41**; ids CS-* conservados (los enlaces antiguos siguen funcionando). `(4)` **Herramientas UNIFICADAS**: un solo apartado arriba del todo — 48 tools, cada una UNA vez, con **etiqueta de rol** (IAM/SOC/Service Desk/SysAdmin/Global) y filtro por rol (IAM → 6, verificado). `(5)` **Sidebar libre**: arrastrar apartados y grupos enteros + plegar/desplegar con clic — verificado con drag&drop real (item Blog→top, grupo Career→arriba de Global Knowledge), persistencia en localStorage tras reload y auto-revelado del grupo activo. `(6)` E2E navegador: sidebar con orden exacto (Herramientas → Global → IAM → SOC → SD → SA → Career), simulador IAM end-to-end (selección → modo estudio → En progreso → persiste tras reload), AR week 5/5 días con 10 tickets, Ctrl+K "cuenta bloqueada" → RB-HD-001 **y** RB-IAM-006, móvil 375px sin overflow, Settings limpio, `eslint` 0 · `tsc --noEmit` 0 · **0 errores de consola/página/dev.log**.

Historial completo de verificaciones de versiones anteriores (V6→V10) en el historial de commits del repo. Nota: la capa online V10 (Sync Center de datasets oficiales + CVE Search + Threat Intel) fue **retirada por decisión del usuario en V11** para volver al diseño 100% offline; el informe de análisis se eliminó junto con la feature.

---

## 🔄 Botón Pull (header, arriba a la derecha)

Descarga actualizaciones de código directamente desde GitHub (`git fetch` + fast-forward puro): features nuevas, fixes y borrados de archivos se aplican sin tocar tus datos (viven en IndexedDB). Si cambiaron dependencias reinstala solo. Si hay commits locales sin push o cambios sin confirmar, aborta para no perder nada — con instrucciones exactas de qué hacer.

| Estado | Significado |
|---|---|
| ⬇ gris `Pull` | normal |
| ⟳ verde `Pull…` | trabajando (fetch + merge) |
| ✅ verde | al día, o cambios aplicados (dev: la página se recarga sola) |
| 🟡 ámbar ⟳ `restart` | **producción**: build regenerado — reabre `IniciarVaultNotes.bat` |
| 🟡 ámbar 🔑 `token` | GitHub rechazó el acceso — tooltip con el comando `git remote set-url` exacto |
| ⚠ rojo | error con mensaje humano: red caída, Git ausente, repo sucio… |

---

## 📄 Licencia

Uso personal / proyecto educativo de ciberseguridad. Sin garantía expresa o implícita.
