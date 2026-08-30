# VAULTNOTES

**Tu segundo cerebro de ciberseguridad.** Una PWA **local-first y 100% offline** para estudiar, trabajar y investigar en ciberseguridad: apuntes con editor rico, labs SOC/IAM, glosario con flashcards, 27 herramientas de análisis y backups ZIP portables — todo dentro de tu navegador, sin servidor, sin cuenta, sin nube.

> 🔒 **Privacidad por diseño**: tus datos nunca salen de tu máquina. La base de datos vive en IndexedDB (tu navegador). La única funcionalidad online es **opcional y explícita** (enriquecer IOCs o buscar CVEs cuando TÚ lo pides).

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
- **Data & Intel** — datasets de trabajo (IoCs, eventos, reglas) con export.

### 🧰 27 Herramientas offline (SOC / IAM / Red / Datos / Linux)

| Categoría | Herramientas |
|---|---|
| **SOC** | Windows Event IDs · IoC Extractor (refang, scoring, KQL/SPL/STIX) · IOC Defanger/Refanger · PowerShell Analyzer · Command Line Analyzer · Log Parser (SSH/Apache/Nginx/Syslog/EVTX) · MITRE ATT&CK Explorer · Sigma Explorer · Detection Query Helper (KQL/SPL) |
| **IAM** | JWT Decoder · SID/RID Analyzer · LDAP/DN Parser · RBAC Analyzer (matriz + permisos efectivos) |
| **Red** | Subnetting (IPv4/CIDR) · IP Analyzer (v4/v6) · Puertos y Servicios |
| **Datos** | Base Converter · Timestamp Converter (Unix/ISO/UTC) · Encoding (Base64/Hex/URL/ASCII/Unicode/HTML) · Regex Tester (14 presets) · Cron Parser |
| **Security** | Hash Toolkit · File Hash Analyzer · CVSS 3.1 Calculator · CVE Search *(única online, opcional — NVD)* |
| **Linux** | Linux Permissions (chmod simbólico ↔ numérico) |

Todas integradas a la **búsqueda global** (`Ctrl+K`): encuentra notas, labs, términos, herramientas y eventos Windows con ranking fuzzy.

### 🎥 Política de videos — LA REGLA DE ORO

> **Los videos NUNCA entran a la base de datos ni a los backups. Solo viven en tu disco.**

- Eliges una **carpeta de videos** en `Configuración → Carpeta de Videos` (File System Access API).
- Al insertar un video (botón 🎬 o drag-and-drop), el archivo se **copia a esa carpeta** y la nota guarda solo una referencia limpia (`data-vault-video="nombre.mp4"`).
- Al abrir la nota, el video se resuelve a un `ObjectURL` efímero para reproducirlo — nunca se persiste el binario.
- Si se pierde el acceso o el archivo, la app muestra un placeholder con **Conceder acceso / Re-linkear carpeta / Buscar archivo**.
- **Backups ZIP excluyen videos por completo** — ligeros y portables; los videos ya están a salvo en tu carpeta.

### 💾 Backups ZIP portables
- Exporta TODO el vault (apuntes como `.md`, labs, glosario, referencias, imágenes, PDFs, plataformas, categorías, tools) a un único ZIP con manifest versionado.
- Guardado directo a tu carpeta elegida (File System Access) o descarga.
- Import con **validación estricta** (schemas por tipo, protección anti zip-bomb, merge seguro).
- Los ZIPs legacy con videos los reporta como "ignorados" — nunca los importa.

### 🔍 Búsqueda global inteligente
Fuzzy + substring + acrónimos con ranking por tipo. Un solo atajo (`Ctrl+K`) para todo el vault.

---

## 🛠️ Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) · **React 19** |
| Lenguaje | **TypeScript 5** (strict) |
| UI | **Tailwind CSS 4** · shadcn/ui · **lucide-react** |
| Base de datos | **Dexie 4** (IndexedDB, schema v15, 20 tablas) |
| Backup | **JSZip** (con gates anti zip-bomb) |
| Búsqueda | Índice fuzzy propio (Fuse.js-style, precomputado) |
| Seguridad | **DOMPurify** (sanitizado de todo HTML persistido) |
| Estado | React hooks + stores ligeros (zustand) |

**Arquitectura**: 100% cliente (`ssr: false`), cero backend. Los datos viven en IndexedDB; los archivos grandes (PDFs/imágenes) en tablas blobs dedicadas; los videos en tu disco (File System Access API).

---

## 📁 Estructura del proyecto

```
src/
├── app/                  # Next.js App Router (una sola ruta: /)
│   ├── page.tsx          # Boundary cliente + self-healing HMR (dev)
│   ├── layout.tsx        # Metadatos + fuentes
│   └── globals.css       # Tema oscuro (Tailwind 4)
├── vault/
│   ├── App.tsx           # Shell principal + navegación + shortcuts
│   ├── components/
│   │   ├── Editor/       # RichEditor (WYSIWYG + imágenes/PDF/videos)
│   │   ├── tools/        # 19 componentes de herramientas (autocontenidos)
│   │   └── …             # NotesView, LabsView, GlossaryView, ToolsView,
│   │                     # ReviewView, BlogView, SettingsView, Backup, etc.
│   ├── data/             # Datasets offline (MITRE, Sigma, WinEvents, puertos,
│   │                     # HTTP, cron, catálogo de tools…)
│   ├── db/               # Dexie: schema v15 + migraciones v1→v15 + seeds
│   ├── integrations/     # Threat Intel opcional (VT, AbuseIPDB, OTX, Shodan)
│   ├── store/            # Stores zustand
│   ├── utils/            # videoStorage (REGLA DE ORO), zipBackup,
│   │                     # sanitizeHtml, fuzzySearch, markdown, pdfStorage…
│   └── types/            # Tipos compartidos
└── public/
    ├── sw.js             # Service worker (offline shell; NO corre en dev)
    └── manifest.webmanifest
```

---

## 🚀 Instalación y ejecución

**Requisitos**: [Bun](https://bun.sh) 1.x · Navegador **Chromium** (Edge/Chrome recomendado — necesario para la carpeta de videos y guardado de backups vía File System Access API).

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
| `Ctrl+K` / `⌘K` | Búsqueda global (notas, labs, glosario, herramientas) |
| `Ctrl+S` | Guardar apunte |
| `Ctrl+T` | Tema claro/oscuro |
| `Ctrl+V` | Pegar imágenes directo al editor |
| `Esc` | Cerrar modales |

---

## 🔒 Privacidad y red

- **Offline por defecto**: sin requests de red al cargar o usar la app.
- **Online opcional y explícito**:
  - *Threat Intel* — enriquecer IOCs (VirusTotal, AbuseIPDB, OTX, Shodan) solo al pulsar **[Enrich]**. API keys se guardan cifradas (AES-GCM) en un IndexedDB aparte.
  - *CVE Search* — consulta a NVD al buscar; offline muestra los CVEs guardados.
- **Service worker**: cachea el shell para uso offline en producción. En desarrollo **no se registra** (evita chunks stale del dev server).

---

## ✅ Verificación (estado actual)

- `eslint` → 0 errores · `tsc --noEmit` → 0 errores
- E2E verificado: notas (crear/autoguardar/papelera/restaurar), backups ZIP round-trip (export → import), búsqueda global, 27 herramientas, flujo completo de videos (insertar → persistencia → restart → re-link → export sin videos)
- Robustez HMR en dev: imports estáticos del grafo de herramientas + auto-recarga sanitizada ante errores de factory tras reinicios del dev server

---

## 📄 Licencia

Uso personal / proyecto educativo de ciberseguridad. Sin garantía expresa o implícita.

## Botón Pull (header, arriba a la derecha)

Descarga actualizaciones de código directamente desde GitHub (`git fetch` +
fast-forward puro): features nuevas, fixes y borrados de archivos se aplican
sin tocar tus datos (notas, labs, glosario… viven en IndexedDB en tu
navegador). Si cambiaron dependencias (`package.json`/`bun.lock`) reinstala
automáticamente. Si hay commits locales sin push, aborta para no perderlos.
