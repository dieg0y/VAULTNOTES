# VaultNotes

**Tu segundo cerebro de ciberseguridad.** PWA local-first y 100% offline: todo vive en tu navegador (IndexedDB), sin servidor, sin cuenta, sin nube. Estudia y practica como en el puesto real con **4 pilares autónomos** — cada uno con su simulador de tickets, roadmap, troubleshooting y runbooks — más apuntes con editor rico, glosario con flashcards, 49 herramientas de análisis y backups ZIP portables.

## Contenido

| Pilar | Tickets | KB | Runbooks | Troubleshooting | Roadmap |
|---|---|---|---|---|---|
| **1 · IAM** | 50 | 50 | 50 | 30 | 384 ítems · 34 fases |
| **2 · SOC / Blue Team** | 50 | 18 | 49 | 23 | 98 ítems |
| **3 · Service Desk** | 60 | 28 | 80 | 24 | 112 ítems · 28 fases |
| **4 · SysAdmin Ops** | 56 | 28 | 77 | 22 | 126 ítems · 17 fases |

Además:

- **Apuntes** — editor WYSIWYG con jerarquía de subpáginas, plataformas/categorías, imágenes, PDFs y videos adjuntos. **Pegado tipo Obsidian**: pega una captura o una página web completa y las imágenes/GIFs se descargan y guardan localmente al instante (las que fallen quedan como enlaces). Glosario sembrado con **925 términos + flashcards con repetición espaciada** (Difícil/Bueno/Fácil, teclado completo). Perfil profesional multi-perfil con export Markdown. Inbox, papelera con restauración y exportación a blog estático.
- **Comandos más usados (174)** — catálogo consultable de HelpDesk (65), IAM (58) y SOC (51), priorizado HelpDesk e IAM: cada comando con qué hace, por qué y cuándo usarlo, sintaxis, casos de uso, ejemplos copiables, cómo leer la salida, errores comunes y navegación cruzada (ipconfig /all, gpupdate /force, klist purge, Get-MgUser, Revoke-MgUserSignInSession, aws sts assume-role, KQL/SPL, dig…). Indexado en Ctrl+K con `type:comando`.
- **49 herramientas offline en un catálogo único** (filtro por rol): IAM (JWT, SID/RID, LDAP/DN, RBAC, vulnerabilidades 203, ataques 102) · SOC (Event IDs 93, IoC Extractor, MITRE ATT&CK, Sigma, KQL/SPL, CVSS, hash, guías de Sentinel/Splunk/Elastic/Wireshark/**Zeek+Suricata**…) · Service Desk (triage 91 reglas, AD, Intune, network L1) · SysAdmin (subnetting, puertos 119, cron, systemd, RAID, LVM, firewall) · Global (encoding, regex, timestamp).
- **Simuladores de tickets reales (Nexora S.A.)** — cola filtrable, modo estudio, flujo de estados con nota de cierre y proyecto final por pilar (Semana de Access Review, Primera semana SOC, etc.).
- **Runbooks como tickets reales** — paso a paso universal con comandos copiables y respuesta en inglés lista para pegar. El pilar Service Desk cubre además (v25, según ofertas reales de empleo): **macOS** (Keychain, FileVault, Gatekeeper), **Linux L1** (TTY, systemctl, journalctl), **Google Workspace** (Email Log Search, 2FA), **ServiceNow/Jira**, **MSP multi-tenant**, **monitoreo** (availability/performance/capacity), **PostgreSQL** de solo lectura, **APIs/HTTP** y escalamiento a desarrollo, **móvil corporativo** (MDM, retire vs wipe) e **importaciones de archivos**. El pilar SOC cubre (auditoría 2025 según ofertas L1/L2/L3 y Threat Detection Engineer): triage de **Mimikatz/LSASS** (Sysmon 10, ASR), detección en **AWS CloudTrail/GuardDuty**, ciclo de vida **NIST 800-61/PICERL**, **threat intelligence** con MISP/OpenCTI, **Diamond Model/Kill Chain** y landscape de EDRs (CrowdStrike/SentinelOne/Carbon Black).

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
bun run test
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
| `Ctrl+K` | Búsqueda global (notas, labs, glosario, runbooks, herramientas, comandos, **tickets de los simuladores**, MITRE, Sigma…) · escribe `atajos` para ver la referencia completa dentro de la app |
| `Ctrl+Shift+Q` | Captura rápida → Inbox |
| `Ctrl+Shift+N` / `Ctrl+Shift+L` | Nueva nota / nuevo lab |
| `Ctrl+Shift+I` / `T` / `H` / `R` / `M` | IoC Extractor · Timestamp · Hash · Regex · MITRE |
| `Ctrl+V` | Pegar imágenes directo al editor |
| `Espacio` · `1/2/3` · `←/→` · `Esc` | Flashcards: voltear · calificar Difícil/Bueno/Fácil · navegar · salir |

## Privacidad y red

**100% offline.** Sin requests al cargar ni al usar la app. Las únicas piezas con red son opcionales y tras clic explícito del usuario:

- **Pull** (header) — descarga TUS actualizaciones de código desde GitHub (fast-forward puro); aborta si hay trabajo local sin guardar. Jamás envía datos del vault.
- **[Enrich Online]** (Ticket Triage del Service Desk) — envía el texto del ticket al backend local solo tras consentimiento; el análisis offline funciona al 100% sin él.
- **Pegar páginas con imágenes** — al pegar contenido web con imágenes/GIFs en línea, estas se descargan vía el backend local (consentimiento único la primera vez; si cancelas, quedan como enlaces). Ninguna imagen queda jamás referenciada a una web externa: siempre se guardan localmente.

Las rutas locales rechazan solicitudes cross-site y limitan el tamaño de los datos JSON; el proxy de imágenes valida esquema, host y redirecciones. El service worker cachea el shell para uso offline en producción (no se registra en dev). Todo HTML persistido se sanitiza con **DOMPurify**.

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
src/app/        # Ruta única / + api (git/pull, enrich-ticket, fetch-image)
src/vault/      # components/ · data/ (datasets offline) · db/ (Dexie) ·
                # store/ · utils/ (zipBackup, remoteImages, videoStorage,
                # fuzzySearch…) · types/
public/sw.js    # Service worker (offline shell)
```

## Licencia

Uso personal / proyecto educativo de ciberseguridad. Sin garantía expresa o implícita.
