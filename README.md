# VAULTNOTES

**Tu segundo cerebro de ciberseguridad.** Una PWA **local-first y 100% offline** para estudiar, trabajar y investigar en ciberseguridad: apuntes con editor rico, labs SOC/IAM, glosario con flashcards, 29 herramientas de análisis, datasets de inteligencia (IoCs · eventos · reglas) y backups ZIP portables — todo dentro de tu navegador, sin servidor, sin cuenta, sin nube.

> 🔒 **Privacidad por diseño**: tus datos nunca salen de tu máquina. La base de datos vive en IndexedDB (tu navegador). La única funcionalidad online es **opcional y explícita** (enriquecer IOCs o buscar CVEs cuando TÚ lo pides).

## ⚡ Resumen en 3 minutos

| Pregunta | Respuesta |
|---|---|
| **¿Qué es?** | Tu segundo cerebro de ciberseguridad, 100% en tu navegador — sin cuenta, sin nube, sin servidor de datos. |
| **¿Cómo lo arranco?** | Windows: doble clic en `IniciarVaultNotes.bat` — resuelve todo solo (Bun incluido si falta) y abre el navegador. Cualquier SO: `bun install` + `bun run dev`. |
| **¿Puedo llevarla en una USB?** | Sí — la carpeta es 100% portable (app + runtime + build) y el **Respaldo automático** hace que tus fotos y apuntes viajen en la misma USB. Ver sección 🎒 abajo. |
| **¿Dónde están mis datos?** | En IndexedDB de tu navegador (tu PC). Backups ZIP para cambiar de máquina/navegador — o activa el Respaldo automático y llévalos en tu USB. |
| **¿Qué hay dentro?** | 29 herramientas offline (SOC · IAM · Red · Datos · Linux), explorador de Vulnerabilidades (203) y Ataques (89, sin duplicados), apuntes con editor rico, labs, glosario con flashcards, datasets de intel (IoCs · eventos · reglas). |
| **¿Y si actualizo el código?** | Botón **Pull** del header: descarga los cambios desde GitHub sin tocar tus datos. En producción regenera el build solo y te pide reiniciar. |
| **Regla de oro** | Los **videos nunca entran a la base ni a los backups** — viven en tu carpeta de videos (disco). |

---

## ✨ Características

### 📝 Conocimiento
- **Apuntes** con editor rico (WYSIWYG): títulos, listas, checkboxes, tablas, código, imágenes, PDFs adjuntos y **videos** (ver política de videos abajo). Jerarquía de subpáginas, plataformas/categorías, favoritos y "revisar después".
- **Hands-On / Labs** — plantillas para laboratorios SOC/IAM con el mismo editor.
- **Glosario** — términos + **flashcards** con repaso espaciado.
- **Inbox + Captura rápida** — anota ideas al vuelo desde cualquier vista.
- **Referencias** — enlaces y recursos clasificados.
- **Papelera** — borrado suave con restauración y borrado definitivo.
- **Generar Blog** — convierte apuntes/labs en un blog estático exportable.
- **Data & Intel** — datasets de trabajo (IoCs · eventos · reglas) con CRUD completo, buscador, filtros y contadores. Integrado con las tools: envía IoCs desde el **IoC Extractor**, reglas desde el **Sigma Explorer** y queries desde el **Detection Query Helper** con un clic — todo se actualiza al instante, sin refresh. Import .json y export .json/.csv propios, además de viajar en el backup ZIP.

### 🧰 29 Herramientas offline (SOC / IAM / Red / Datos / Linux)

| Categoría | Herramientas |
|---|---|
| **SOC** | Windows Event IDs · IoC Extractor (refang, scoring, KQL/SPL/STIX) · IOC Defanger/Refanger · PowerShell Analyzer · Command Line Analyzer · Log Parser (SSH/Apache/Nginx/Syslog/EVTX) · MITRE ATT&CK Explorer · Sigma Explorer · Detection Query Helper (KQL/SPL) |
| **IAM** | JWT Decoder · SID/RID Analyzer · LDAP/DN Parser · RBAC Analyzer (matriz + permisos efectivos) |
| **Red** | Subnetting (IPv4/CIDR) · IP Analyzer (v4/v6) · Puertos y Servicios |
| **Web** | HTTP Status (códigos con explicación) |
| **Datos** | Base Converter · Timestamp Converter (Unix/ISO/UTC) · Encoding (Base64/Hex/URL/ASCII/Unicode/HTML) · Regex Tester (14 presets) · Cron Parser |
| **Security** | Hash Toolkit · File Hash Analyzer · CVSS 3.1 Calculator · CVE Search *(única online, opcional — NVD)* · Vulnerabilidades IAM/SOC (203 entradas offline) · **Ataques — 89 técnicas ofensivas offline (sin duplicar Vulnerabilidades)** |
| **Linux** | Linux Permissions (chmod simbólico ↔ numérico) |

#### ⚔️ Ataques — 89 técnicas ofensivas (offline)

Explorador de técnicas de ataque de **todo tipo** — **complementario a Vulnerabilidades y sin una sola entrada repetida**. El reparto:

- **Vulnerabilidades (203)**: fallos de configuración/implementación **y** las técnicas de abuso AD/IAM que allí siempre vivieron — Kerberoasting, Pass-the-Hash, Golden/Silver Ticket, DCSync, delegaciones, AD CS ESC1–16, escalada de privilegios, movimiento lateral, persistencia, relay NTLM, MFA fatigue, AiTM/Evilginx, SIM swap, Golden SAML, privesc cloud…
- **Ataques (89)**: todo lo demás — las técnicas que Vulnerabilidades no cubre. Sinónimos como alias (p. ej. *ARP poisoning* → alias de *ARP Spoofing*), nunca filas duplicadas. El buscador lo confirma: "kerberoasting" en Ataques da **0 resultados** porque vive en Vulnerabilidades.

| Categoría (entradas) | Qué cubre |
|---|---|
| **IAM / Identidad (12)** | MS14-068 (PAC forjado) · Bronze Bit (CVE-2020-17049) · extracción SAM/LSA/NTDS.dit · recon AD (BloodHound) · keylogging · phishing de código de dispositivo · robo de PRT (Entra) · registro fraudulento de dispositivos · abuso de SCCM/MECM · abuso de Intune · AD Recycle Bin (reanimación) · inyección CSV |
| **Red / Sniffing (25)** | MITM (on-path) · ARP spoofing · envenenamiento DNS (spoofing + cache poisoning) · DHCP starvation y rogue DHCP · MAC flooding (CAM) · sniffing · port scanning · VLAN hopping · SSL stripping · evil twin/rogue AP · deauth Wi-Fi · BGP hijacking · ICMP redirect · CDP/LLDP · STP · MAC spoofing · tap físico · WPS/Pixie Dust · KRACK · Bluetooth · **rogue DHCPv6/mitm6 (SLAAC)** · **bypass de 802.1X/NAC (MAB, EAP-Logoff)** · **enumeración DNS (AXFR, subdominios)** · **envenenamiento de routing interior (RIP/OSPF/EIGRP)** |
| **DoS / DDoS (16)** | Botnets y vectores · SYN flood · ICMP flood/smurf · UDP flood · ping of death · teardrop · land · HTTP flood · Slowloris/RUDY · amplificación DNS/NTP/memcached · NXDOMAIN flood (water torture) · HTTP/2 Rapid Reset · XML bomb · **ReDoS** |
| **Web / Aplicación (19)** | SQLi · XSS · SSRF · command injection · path traversal/LFI · XXE · subida de archivos · webshell · deserialización · clickjacking · session hijacking · CORS · prototype pollution · cache poisoning · prompt injection (LLM) · **HTTP request smuggling (CL.TE/TE.CL)** · **inyección CRLF** · **HPP (contaminación de parámetros)** · **abuso de GraphQL (introspección/batching)** |
| **Ingeniería Social (9)** | Phishing/spear/whaling · vishing · smishing (y quishing) · BEC · baiting/USB · tailgating · watering hole · SEO poisoning/malvertising · deepfakes |
| **Malware / C2 / Exfil (8)** | Ransomware y doble extorsión · supply chain (SolarWinds, dependency confusion) · infostealers · criptojacking · wipers · **gusanos (propagación autónoma)** · beaconing C2 (Cobalt Strike/Sliver) · exfiltración por canales legítimos (rclone, Telegram) |

Cada entrada: descripción técnica, impacto IAM/SOC, **cómo funciona** (herramientas reales), **detección** (KQL/SPL/Sigma/Event IDs), **mitigación paso a paso** (checklist interactiva) y referencias. Filtros por categoría/severidad/MITRE, aviso anti-duplicados en el encabezado y deep-link por id (p. ej. `IAM-001`).

Todas las herramientas están integradas a la **búsqueda global** (`Ctrl+K`): encuentra notas, labs, términos, herramientas y eventos Windows con ranking fuzzy.

### 🎥 Política de videos — LA REGLA DE ORO

> **Los videos NUNCA entran a la base de datos ni a los backups. Solo viven en tu disco.**

- Eliges una **carpeta de videos** en `Configuración → Carpeta de Videos` (File System Access API).
- Al insertar un video (botón 🎬 o drag-and-drop), el archivo se **copia a esa carpeta** y la nota guarda solo una referencia limpia (`data-vault-video="nombre.mp4"`).
- Al abrir la nota, el video se resuelve a un `ObjectURL` efímero para reproducirlo — nunca se persiste el binario.
- Si se pierde el acceso o el archivo, la app muestra un placeholder con **Conceder acceso / Re-linkear carpeta / Buscar archivo**.
- **Backups ZIP excluyen videos por completo** — ligeros y portables; los videos ya están a salvo en tu carpeta.

### 💾 Backups ZIP portables
- Exporta TODO el vault (apuntes como `.md`, labs, glosario, referencias, imágenes, PDFs, plataformas, categorías, tools, datasets Data & Intel) a un único ZIP con manifest versionado (formato **3.2.0**, schema v16).
- Guardado directo a tu carpeta elegida (File System Access) o descarga.
- Import con **validación estricta** (schemas por tipo, protección anti zip-bomb, merge seguro con conflictos por `updatedAt`).
- Los ZIPs legacy con videos los reporta como "ignorados" — nunca los importa.
- Los datasets de Data & Intel viajan como `intelItems.json` y también tienen export/import propio (.json y .csv) desde la vista.
- **Respaldo automático (USB)**: además del manual, Configuración → *Respaldo automático* escribe ZIPs rotativos `VaultNotes-Auto-*.zip` en la carpeta de la app cada N minutos **con cambios sin respaldar** — mismo formato 3.2.0, fotos y PDFs incluidos — conservando solo los últimos N. Con *Restaurar último backup* aterrizas en cualquier máquina en 2 clics (merge no destructivo).

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
| UI | **Tailwind CSS 4** · shadcn/ui · **lucide-react** |
| Base de datos | **Dexie 4** (IndexedDB, schema v16, 22 tablas) |
| Backup | **JSZip** (formato 3.2.0, con gates anti zip-bomb) |
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
│   └── globals.css       # Tema oscuro (Tailwind 4)
├── vault/                # (todo el código cliente — ver arriba)
│   ├── App.tsx           # Shell + navegación + shortcuts + lazy views
│   ├── components/
│   │   ├── Editor/       # RichEditor + editorMedia (REGLA DE ORO de videos)
│   │   ├── tools/        # 21 componentes de herramientas (autocontenidos)
│   │   └── …             # NotesView, LabsView, GlossaryView, ToolsView,
│   │                     # DataIntelView + DataIntelDatasets, BlogView,
│   │                     # ReviewView, SettingsView, Backup, etc.
│   ├── data/             # Datasets offline (MITRE, Sigma, WinEvents, puertos,
│   │                     # HTTP, cron, vulnerabilidades, ataques
│   │                     # (attacks/ — 89 técnicas sin duplicar), catálogo de tools…)
│   ├── db/               # Dexie: schema v16 + migraciones v1→v16 + seeds
│   ├── integrations/     # Threat Intel opcional (VT, AbuseIPDB, OTX, Shodan)
│   ├── hooks/           # useDebouncedAutoSave, useToolPrefs,
│   │                     # useResizablePanel, useAutoBackupStatus
│   ├── store/            # Stores zustand (note, pendingTool, ioc, intel)
│   ├── utils/            # videoStorage (REGLA DE ORO), zipBackup,
│   │                     # autoBackup (motor rotativo USB), sanitizeHtml,
│   │                     # fuzzySearch, markdown, pdfStorage…
│   └── types/            # Tipos compartidos
└── public/
    ├── sw.js             # Service worker (offline shell; NO corre en dev)
    └── manifest.webmanifest
```

---

## ⚡ Performance

- **Code-splitting**: la ruta `/` carga solo el shell (Sidebar + Header). Las 12 vistas y los 5 modales son chunks separados (`next/dynamic`) que se montan al usarse; el chunk de búsqueda se pre-calienta en idle tras el primer paint.
- **Shell mínimo**: el módulo de backup (JSZip + DOMPurify + zod + file-saver, ~100 KB) se carga con `import()` dinámico solo al exportar/importar un ZIP — nunca pesa en el arranque.
- **Grafo de herramientas estático dentro de su chunk**: las 29 herramientas viajan juntas en el chunk lazy de ToolsView — estático a propósito para robustez HMR en dev (VN-F-003: ~20 dynamic imports por tool rompían el runtime de Turbopack tras reinicios del dev server).
- **Búsqueda Ctrl+K**: corpus estático (~600 docs) indexado una vez a nivel de módulo; corpus de usuario re-indexado solo cuando cambian los datos (stamp FNV-1a sobre id+updatedAt); queries de 1 carácter sin fuzzy; contenido indexado acotado por nota.
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
- **Service worker**: cachea el shell para uso offline en producción. En desarrollo **no se registra** (evita chunks stale del dev server).

---

## ✅ Verificación (estado actual)

- `eslint` → 0 errores · `tsc --noEmit` → 0 errores · `bun run build` → compila
- **Revisión funcional final E2E (navegador real)**: notas (crear → autoguardado → reload → persistido), papelera (borrado suave → restauración), búsqueda `Ctrl+K` por contenido instantánea, Data & Intel end-to-end (alta manual → IoC Extractor "Guardar en Data & Intel (4)" → los 4 IoCs visibles al instante → dedup → export .json/.csv habilitado), **29/29 herramientas visibles (incluida Ataques: contador 89/89, aviso anti-duplicados visible, filtros por categoría — IAM 12, Red 25, DoS 16, Web 19, Social 9, Malware 8 —, búsqueda por alias — "arp poisoning" → RED-002 —, verificación de dedup — "kerberoasting" → 0 resultados en Ataques y presente en Vulnerabilidades (3/203) —, drawer completo con detección KQL y checklist de mitigación, Esc cierra)**, captura rápida → Inbox, Blog → descarga .md, backup ZIP → toast de confirmación, responsive 390/1440 px sin scroll horizontal, 0 errores de consola
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
