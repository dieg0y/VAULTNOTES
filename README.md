# 🛡️ VAULTNOTES

> Tu segundo cerebro de ciberseguridad — apuntes, labs, glosario, referencias y herramientas, **100% offline**, con búsqueda fuzzy que cubre **todo** el vault.

VaultNotes es una aplicación local-first pensada para analistas SOC, pentesters, estudiantes de ciberseguridad y curiosos en general. Toda la información vive en tu navegador (IndexedDB vía Dexie), podés exportar/importar backups en ZIP, y funciona **sin conexión a internet** gracias a una PWA con service worker.

---

## ✨ Características principales

### 📚 Gestión del conocimiento
- **Apuntes** — Editor enriquecido con auto-TOC (parsea h1-h3), imágenes, videos e incrustación de **PDF a full** (renderizado nativo del navegador, sin librerías externas). Auto-guardado, papelera con soft-delete y restauración.
- **Hands-On / Labs** — Plantilla para registrar walkthroughs de HTB / THM / VulnHub: partes, comandos, hallazgos, mitos y dificultad.
- **Glosario** — Términos con acrónimo, definición corta y larga, ejemplo y plataforma. Cards con **cross-linking**: si un término aparece en un apunte o referencia, se vuelve un botón clickeable que abre el glosario.
- **Referencias** — Links, libros, cheatsheets, con tags y descripción.
- **Papelera** — Soft-delete con restauración; eliminación permanente limpia también blobs de imágenes, videos y PDFs.

### 🛠️ Herramientas integradas
1. **Subnetting** — Calculadora CIDR con red, wildcard, máscara, rango y hosts disponibles.
2. **Puertos y Servicios** — Base curada de **79 puertos** con descripción, riesgos de seguridad, cómo ponerlo seguro y comandos de detección.
3. **JWT Decoder** — Decodifica header/payload de cualquier JWT.
4. **Base Converter** — Decimal / Hex / Octal / Binario en tiempo real.
5. **HTTP Status** — **28 códigos** con descripción, causas comunes, troubleshooting y consejos de seguridad.
6. **Windows Event IDs** — **56 IDs** con descripción, análisis threat-hunting, reglas Sigma YAML y comandos de detección.
7. **IoC Extractor** — Pipeline SOC: refang (`hxxp→http`, `[.]→.`), validación, dedup con contexto, scoring por tipo, enriquecimiento 1-clic (VirusTotal, AbuseIPDB, Shodan, OTX, NVD, MITRE), export a KQL/SPL/STIX/CSV/JSON, detección de secretos, whitelist editable, defang toggle.
8. **Cron Parser** — Parsea y explica expresiones cron en español, con ejemplos.

### 🔍 Búsqueda fuzzy que cubre TODO
`Ctrl+K` (o `⌘K`) abre el buscador global. Cubre **8 tipos de resultado** sin excepción:
- Apuntes
- Labs
- Términos del glosario
- Referencias
- HTTP Status codes
- Puertos y servicios
- Windows Event IDs
- Ejemplos de Cron

El ranking usa **boost por coincidencia exacta y substring** antes del fuzzy match de Fuse.js, así que buscar `201` pone **`201 Created`** primero (HTTP), buscar `ssh` pone **`22/TCP SSH`** primero, y buscar `4624` abre el **Event ID 4624** con su regla Sigma. Cada resultado es **deep-link**: al hacer click te lleva directo a la herramienta con el filtro aplicado y el modal de detalle abierto.

### 💾 Backup y portabilidad
- **Exportar** — Genera un ZIP (`vaultnotes-backup-YYYY-MM-DD.zip`) con todos los apuntes en HTML, labs en MD, glosario JSON, referencias JSON, manifest, y carpetas `/images/`, `/videos/`, `/pdfs/` con sus manifests.
- **Importar** — Restore no-destructivo por id (no sobrescribe apuntes existentes, solo añade los que faltan). Reporte detallado con cantidades restauradas.

### 📱 PWA offline-first
- `manifest.webmanifest` con iconos y tema.
- Service worker que cachea el shell de la app para que arranque sin red.

---

## 🚀 Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 16** (App Router) + **TypeScript 5** |
| UI | **Tailwind CSS 4** + **Lucide** icons (componentes propios, cero dependencias de UI externas) |
| Base de datos local | **IndexedDB** vía **Dexie** + `dexie-react-hooks` |
| Búsqueda | **Fuse.js** con boost de exact/substring match |
| Estado cliente | **Zustand** |
| Editor | ContentEditable propio + drag&drop + auto-TOC |
| Backup | **JSZip** + **file-saver** |
| PWA | manifest + service worker |

**100% offline, sin APIs externas, sin servidores.** Toda la lógica vive en el navegador. El backup es un ZIP plano con HTML/MD/JSON, legible y portable.

---

## 📂 Estructura del proyecto

```
src/
├── app/                    # App Router de Next.js (página única)
│   ├── layout.tsx
│   ├── page.tsx            # Monta <App/> del vault
│   ├── globals.css
│   └── api/route.ts        # Health-check endpoint
├── components/ui/          # shadcn/ui components (54 primitivas)
├── hooks/                  # use-mobile, use-toast
├── lib/                    # db.ts, utils.ts (cn)
└── vault/                  # ★ La app completa ★
    ├── App.tsx             # Root stateful, navegación y live queries
    ├── components/
    │   ├── Sidebar.tsx
    │   ├── Header.tsx
    │   ├── DashboardView.tsx
    │   ├── NotesView.tsx
    │   ├── LabsView.tsx
    │   ├── GlossaryView.tsx
    │   ├── ReferencesView.tsx
    │   ├── ToolsView.tsx           # 27 herramientas con carga lazy
    │   ├── IocExtractorView.tsx    # Pipeline SOC completo
    │   ├── BlogView.tsx            # Genera blog post desde apuntes
    │   ├── TrashView.tsx
    │   ├── SettingsView.tsx
    │   ├── NewItemModal.tsx        # Crear apunte/lab/referencia
    │   ├── ImportReportModal.tsx
    │   ├── GlobalSearchModal.tsx   # Ctrl+K fuzzy
    │   ├── PlatformSelector.tsx
    │   ├── ToolsChecklist.tsx
    │   ├── CategoryTreeChecklist.tsx
    │   ├── PanelResizeHandle.tsx
    │   └── Editor/
    │       ├── RichEditor.tsx      # Apuntes: imágenes, video, PDF, TOC, code-copy
    │       └── AutoToc.tsx
    ├── data/                # Datasets estáticos curados
    │   ├── httpStatusData.ts    # 28 códigos
    │   ├── portsData.ts         # 79 puertos
    │   ├── winEventsData.ts     # 59 Event IDs
    │   └── cronData.ts          # Ejemplos de cron
    ├── db/index.ts          # Dexie schema (v14) — notas, labs, glosario, referencias, blobs, pdfs
    ├── hooks/useResizablePanel.ts
    ├── types/index.ts       # Note, Lab, GlossaryTerm, ReferenceItem, StoredPdf, ...
    └── utils/
        ├── fuzzySearch.ts       # ★ Buscador global con boost pipeline ★
        ├── markdown.ts         # MD → HTML para labs/blog
        ├── domInsert.ts         # Helpers para insertar imágenes/media en el editor
        ├── videoStorage.ts      # Blob storage en IDB (File System Access API opcional)
        ├── pdfStorage.ts        # Blob storage de PDFs en IDB
        └── zipBackup.ts         # Export/Import ZIP con manifests
```

---

## 🧰 Comandos

```bash
# Desarrollo (puerto 3000)
bun run dev

# Lint
bun run lint

# Producción (build standalone)
bun run build
bun run start
```

> ⚠️ **Importante:** el dev server debe correr siempre en el puerto 3000. Nunca uses `bun run build` en el sandbox; el build es solo para producción.

---

## 🔒 Privacidad

VaultNotes **no envía nada a ningún servidor**. Todo el contenido (apuntes, labs, glosario, referencias, imágenes, videos, PDFs) vive en **IndexedDB del navegador**. Los blobs binarios se guardan como `Blob` en tablas dedicadas y se rehidratan con `URL.createObjectURL` cuando abrís el apunte. El backup ZIP es lo único que sale de tu máquina, y solo cuando vos lo disparás.

---

## 📦 Dataset curado incluido

| Dataset | Cantidad | Origen |
|---|---|---|
| Puertos TCP/UDP | 79 | IANA + experiencia SOC |
| HTTP Status codes | 17 | RFC 9110 + OWASP |
| Windows Event IDs | 56 | MITRE ATT&CK + SigmaHQ |
| Ejemplos de cron | 8 | Crontab guru + casos reales SOC |

Todos los datasets están en `src/vault/data/` y son **buscables** desde el `Ctrl+K`.

---

## 🎯 Casos de uso

- **Estudiante de ciberseguridad** — tomar apuntes de cursos, registrar labs de HTB, armar glosario, generar blog posts.
- **Analista SOC** — extraer IoCs de un email/IOCs report, enriquecer con 1-clic, exportar a KQL/SPL para Splunk/Sentinel, registrar hallazgos en apuntes.
- **Pentester** — guardar plantillas de reportes, referencias de OWASP, walkthroughs de máquinas.
- **Curioso** — armar tu base de conocimiento personal de ciberseguridad, 100% offline, sin tracking.

---

## 📝 Licencia

Uso personal / educativo. El código fuente está en este repo para que lo leas, modifiques y aprendas.
