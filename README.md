# VaultNotes

**Tu segundo cerebro de ciberseguridad.** PWA local-first y 100% offline: todo vive en tu navegador (IndexedDB), sin servidor, sin cuenta, sin nube. Estudia y practica como en el puesto real con **4 pilares autónomos** — cada uno con su simulador de tickets, roadmap, troubleshooting y runbooks — más apuntes con editor rico, glosario con flashcards, 48 herramientas de análisis y backups ZIP portables.

## Contenido

| Pilar | Tickets | KB | Runbooks | Troubleshooting | Roadmap |
|---|---|---|---|---|---|
| **1 · IAM** | 50 | 50 | 50 | 30 | 373 ítems · 34 fases |
| **2 · SOC / Blue Team** | 50 | 16 | 45 | 22 | 93 ítems |
| **3 · Service Desk** | 60 | 28 | 68 | 24 | 93 ítems |
| **4 · SysAdmin Ops** | 56 | 28 | 72 | 22 | 119 ítems |

Además:

- **Apuntes** — editor WYSIWYG con jerarquía de subpáginas, plataformas/categorías, imágenes, PDFs y videos adjuntos. Glosario sembrado con **862 términos + flashcards**. Perfil profesional multi-perfil con export Markdown. Inbox, papelera con restauración y exportación a blog estático.
- **48 herramientas offline en un catálogo único** (filtro por rol): IAM (JWT, SID/RID, LDAP/DN, RBAC, vulnerabilidades 203, ataques 102) · SOC (Event IDs 93, IoC Extractor, MITRE ATT&CK, Sigma, KQL/SPL, CVSS, hash, guías de Sentinel/Splunk/Elastic/Wireshark…) · Service Desk (triage 91 reglas, AD, Intune, network L1) · SysAdmin (subnetting, puertos 119, cron, systemd, RAID, LVM, firewall) · Global (encoding, regex, timestamp).
- **Simuladores de tickets reales (Nexora S.A.)** — cola filtrable, modo estudio, flujo de estados con nota de cierre y proyecto final por pilar (Semana de Access Review, Primera semana SOC, etc.).
- **Runbooks como tickets reales** — paso a paso universal con comandos copiables y respuesta en inglés lista para pegar.

## Arranque

**Windows** — doble clic en `IniciarVaultNotes.bat`: instala Bun solo si falta, resuelve dependencias, arranca en el puerto 3000 y abre el navegador. Para detener, cierra la ventana del servidor.

**Cualquier SO:**

```bash
bun install
bun run dev        # http://localhost:3000
```

Build de producción: `bun run build` + `bun run start`. Navegador recomendado: **Chromium** (Edge/Chrome) — necesario para la carpeta de videos y el guardado de backups.

Calidad (0 errores esperados):

```bash
bun run lint
bun run typecheck
```

## Tus datos

- Viven en **IndexedDB de tu navegador**, por origen: `localhost:3000` y otro puerto son vaults separados.
- **Backups ZIP portables**: *Guardar Backup* exporta TODO (apuntes, labs, glosario, perfiles, progreso de roadmaps y simuladores) a un ZIP con manifest versionado (**formato 3.11.0**, schema Dexie **v25**). *Importar* valida cada sección (Zod + anti zip-bomb) y fusiona con **latest-wins por `updatedAt`** — un backup viejo jamás revierte trabajo nuevo.
- **Respaldo automático**: ZIPs rotativos `VaultNotes-Auto-*.zip` cada N minutos con cambios sin respaldar, apuntando a la carpeta que elijas (ideal: una USB) + *Restaurar último backup* en 2 clics.

### 🎥 Regla de oro: videos e imágenes

**Los videos y las imágenes NUNCA entran a la base de datos ni a los backups — solo viven en tu disco.** En Configuración, *GITHUBVAULT* crea `Documentos/GITHUBVAULT/videos` e `imagenes`: la nota guarda solo una referencia limpia y los archivos quedan a salvo en tu disco. Para cambiar de PC, copia la carpeta `GITHUBVAULT` tal cual y re-configura la ruta.

### 📦 USB portátil

Copia la carpeta COMPLETA del proyecto (con `node_modules/` y `.next/`) a la USB y arranca con el `.bat` en cualquier Windows. Cambios de letra de unidad, movimientos y renombres de carpeta se detectan solos.

## Atajos

| Atajo | Acción |
|---|---|
| `Ctrl+K` | Búsqueda global (notas, labs, glosario, runbooks, herramientas, MITRE, Sigma…) |
| `Ctrl+Shift+Q` | Captura rápida → Inbox |
| `Ctrl+Shift+N` / `Ctrl+Shift+L` | Nueva nota / nuevo lab |
| `Ctrl+Shift+I` / `T` / `H` / `R` / `M` | IoC Extractor · Timestamp · Hash · Regex · MITRE |
| `Ctrl+V` | Pegar imágenes directo al editor |

## Privacidad y red

**100% offline.** Sin requests al cargar ni al usar la app. Las únicas dos piezas con red son opcionales y tras clic explícito del usuario:

- **Pull** (header) — descarga TUS actualizaciones de código desde GitHub (fast-forward puro); aborta si hay trabajo local sin guardar. Jamás envía datos del vault.
- **[Enrich Online]** (Ticket Triage del Service Desk) — envía el texto del ticket al backend local solo tras consentimiento; el análisis offline funciona al 100% sin él.

El service worker cachea el shell para uso offline en producción (no se registra en dev). Todo HTML persistido se sanitiza con **DOMPurify**.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 |
| Lenguaje | TypeScript 5 (strict) |
| UI | Tailwind CSS 4 · lucide-react (tema oscuro propio) |
| Datos | Dexie 4 (IndexedDB, schema v25) — 100% cliente (`ssr: false`) |
| Backup | JSZip + Zod (validación estricta, anti zip-bomb) |
| Seguridad | DOMPurify en todos los límites de confianza |
| Estado | zustand + hooks |

```
src/app/        # Ruta única / + api (git/pull, enrich-ticket)
src/vault/      # components/ · data/ (datasets offline) · db/ (Dexie) ·
                # store/ · utils/ (zipBackup, videoStorage, fuzzySearch…) · types/
public/sw.js    # Service worker (offline shell)
```

## Licencia

Uso personal / proyecto educativo de ciberseguridad. Sin garantía expresa o implícita.
