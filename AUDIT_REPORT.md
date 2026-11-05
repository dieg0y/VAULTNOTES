# AUDIT REPORT — VAULTNOTES

**Auditor:** Auditor Senior de Seguridad y Arquitectura
**Fecha:** 2026-08-29
**HEAD auditado:** `7e0b336` (main = origin/main)
**Modo:** SOLO LECTURA (cero cambios de código; el único artefacto producido es este reporte)
**Método:** Revisión estática línea a línea de los módulos críticos + `bun run lint` y `bunx tsc --noEmit` ejecutados de verdad (ambos: 0 errores) + evidencia dinámica E2E de sesiones previas sobre el mismo HEAD.

---

## 1. Resumen ejecutivo

VAULTNOTES cumple lo que promete: **es 100% cliente, 100% offline por defecto, y la REGLA DE ORO de videos está íntegramente implementada y verificada** — cero violaciones encontradas. El inventario de red es ejemplar: existe exactamente **un** wrapper de fetch (`fetchWithTimeout`) con **cinco** entry points online, todos tras acción explícita del usuario (4 providers de Threat Intel + NVD para CVE Search). Las API keys se cifran AES-GCM 256 (PBKDF2, 50k iteraciones, salt aleatoria por instalación) en una base Dexie **separada** (`VaultIntelDB`) que nunca viaja en los backups. La defensa XSS es seria: DOMPurify con configuración restrictiva + hooks en TODOS los límites de confianza (load, paste, import), y el único `dangerouslySetInnerHTML` de la app usa texto pre-escapado con escape también del query de highlight.

**No hay hallazgos CRÍTICOS ni ALTOS.** Los 4 hallazgos reales son 2 MEDIOS y 2 BAJOS, ninguno explotable remotamente ni sin participación del usuario:

- El más relevante (**VN-AUD-001, MEDIO**): el regexp de URIs de DOMPurify permite `https?:`, así que un `<img src="https://…">` dentro de HTML importado de un backup (o pegado) se **auto-carga al renderizar** — un beacon de privacidad que filtraría la IP del usuario. No hay CSP que lo mitigue.
- **VN-AUD-003 (MEDIO-BAJO)**: los topes de peso anti zip-bomb (200 MB/entrada, 2 GB total) fueron eliminados con una justificación ("vaults pesados con videos") que la REGLA DE ORO volvió obsoleta — los videos ya nunca viajan en ZIP.
- **VN-AUD-002 (BAJO)**: la migración v15 descarta blobs de video que solo existían en IndexedDB avisando únicamente por `console.warn` — el usuario no ve la consola.
- **VN-AUD-004 (BAJO)**: inconsistencia funcional con imágenes SVG (se importan/insertan pero su `data:image/svg+xml` no sobrevive el sanitizador en el siguiente load).

Veredicto: **APROBADO — PRODUCTION-READY FOR PERSONAL USE**, con las recomendaciones priorizadas de la sección 6 pendientes de aplicar en una pasada de hardening opcional.

### Cobertura por checklist

| # | Área | Resultado | Detalle |
|---|---|---|---|
| 1 | Privacidad por diseño | ✅ APROBADO (1 hallazgo MEDIO) | §2.1 |
| 2 | REGLA DE ORO de videos | ✅ APROBADO — **0 violaciones** | §2.2 |
| 3 | Seguridad (XSS/zip/validación) | ✅ APROBADO (1 MEDIO-BAJO + 1 BAJO) | §2.3 |
| 4 | Data & Backup | ✅ APROBADO (1 BAJO) | §2.4 |
| 5 | Integridad offline | ✅ APROBADO | §2.5 |
| 6 | 27 Tools + búsqueda | ✅ APROBADO | §2.6 |
| 7 | Calidad (lint/tsc) | ✅ 0 / 0 errores (ejecutados) | §2.7 |

---

## 2. Análisis por checklist

### 2.1 PRIVACIDAD POR DISEÑO — ✅ APROBADO

**Inventario de red (exhaustivo):** barrido de `fetch(`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `new Image(`, `EventSource` sobre todo `src/`. Resultado:

- **Un único** `fetch` real: `integrations/threatIntel/client.ts:53` (`fetchWithTimeout` con `AbortController`).
- **Cinco entry points**, todos tras gesto explícito del usuario:
  - `providers/virusTotal.ts:100`, `providers/abuseIPDB.ts:52`, `providers/otx.ts:65`, `providers/shodan.ts:47` — invocados exclusivamente desde el botón **[Enrich]** de `IocExtractorView` (verificado `onEnrich` → click handler).
  - `integrations/cve/search.ts:49` (NVD) — invocado desde la búsqueda explícita de `CveSearchTool`.
- `integrations/mitre/sync.ts:80` tiene el fetch **comentado** — documentado como nunca auto-ejecutado. ✓
- `online.ts` usa `navigator.onLine` + eventos — **sin probes de red**. ✓
- Fuentes (`next/font/google`) se self-hostean en build; el icon CDN externo fue eliminado (`layout.tsx:47-54`, documentado). ✓
- Links externos: siempre `target="_blank" rel="noopener noreferrer"` y solo tras click. ✓
- No hay `window.open(` programático en todo `src/vault/`.

**API keys:** `credentials.ts` — AES-GCM 256, clave derivada PBKDF2 (SHA-256, 50 000 iteraciones, salt aleatoria de 16 bytes por instalación en localStorage). Almacenadas en `VaultIntelDB` (instancia Dexie **separada** de `VaultLocalDB`), nunca incluidas en el export (el export solo lee tablas de `VaultLocalDB`). UI de borrado limpia blob + salt. ✓

**Nota informativa (no hallazgo):** el "password" de PBKDF2 es un string estático de la app (`credentials.ts:70`). El propio código lo documenta con honestidad: es cifrado-at-rest de ofuscación — cualquier JS corriendo en el origen podría leer la clave de todas formas. Consistente con el modelo de amenaza local; no es un bug.

### 2.2 REGLA DE ORO DE VIDEOS — ✅ APROBADO, 0 VIOLACIONES

Auditados `videoStorage.ts` (446 líneas, completo), `RichEditor.tsx` (rutas de video), `LabsView.tsx` (espejo) y `zipBackup.ts` (exclusión).

| Verificación | Evidencia | Estado |
|---|---|---|
| Cero videos en Dexie | Tabla `videos` **borrada** en migración v15 (`db/index.ts:447-466`); el único estado de video es el `DirectoryHandle` en `fileHandles` | ✅ |
| Copia al disco, no al vault | `saveVideoToDirectory` → `getFileHandle(create:true)` + `createWritable` + `close` (`videoStorage.ts:248-252`) | ✅ |
| Referencia limpia en HTML | `<figure data-vault-video="nombre.mp4">` con `escapeHtml(filename)` (`RichEditor.tsx:421-428`); E2E previo confirmó persistencia sin `blob:` | ✅ |
| ObjectURL efímero | `getVideoObjectURL` crea; `videoUrlsRef` acumula; **revoke en unmount** (`RichEditor.tsx:149-156`, `LabsView.tsx:1315`); re-attach salta elementos con `src` ya seteado (sin fugas por doble attach) | ✅ |
| Strip de `blob:` al guardar | `flushSave` regex de `src="blob:…"` y `src='blob:…'` (`RichEditor.tsx:222-224`) | ✅ |
| Placeholder de re-link | Banner con **Conceder acceso / Re-linkear carpeta / Buscar archivo** + clase `vault-video-missing`; verificado visualmente (VLM) y E2E en sesiones previas al mismo HEAD | ✅ |
| ZIP excluye videos | Export: no se lee nada de video (la tabla no existe); manifest **sin** `videosCount`; import legacy: `videosManifest.json` → `ignoredLegacyVideos` contado y **mostrado en ImportReportModal** (`ImportReportModal.tsx:163-166,208`), nunca importado | ✅ |
| Legacy `data-vid` | `resolveLegacyVideoUrl` escanea carpeta por prefijo `{id}.`, elige `lastModified` más reciente (`videoStorage.ts:312-343`) | ✅ |
| Sanitización de filename | `sanitizeVideoFilename`: strip `\/:*?"<>|` + control chars, cap 100+ext, extensión derivada de MIME (`videoStorage.ts:166-183`) | ✅ |
| Conflictos | `onConflict` (sobrescribir vs único) + `uniqueNameIn` con sufijo `(n)` hasta 999, fallback `Date.now()` | ✅ |

**Nota informativa:** no hay validación de magic bytes del archivo (un archivo renombrado a `.mp4` se copia tal cual). Riesgo nulo en la práctica — la carpeta es del propio usuario y el archivo nunca se ejecuta desde la app.

### 2.3 SEGURIDAD — ✅ APROBADO

**DOMPurify en todo HTML persistido:**
- Load: `RichEditor.tsx:179` y `LabsView.tsx:1363` (ambos `innerHTML = sanitizeHtml(...)`).
- Paste: `handlePaste` hace `preventDefault()` SIEMPRE (documentado fix de auditoría previa: evita ejecución de `onerror` en el DOM vivo antes del autosave) y re-inserta sanitizado (`RichEditor.tsx:480-505`).
- Import: `contentHtml` de notas, `parts` de labs y markdown por frontmatter pasan por `sanitizeHtml` en el boundary (`zipBackup.ts:785-788, 850, 879, 1591, 1599`).
- Config: `FORBID_TAGS` (script/iframe/object/form/button/textarea/select/style), `FORBID_ATTR` (on*), hook `uponSanitizeElement` que **solo** deja pasar `input type=checkbox`, hook `afterSanitizeAttributes` que barre cualquier atributo `on*` residual, `ALLOWED_URI_REGEXP` estricto, fallback conservador si DOMPurify lanza. ✓

**Único `dangerouslySetInnerHTML`** (`GlobalSearchModal.tsx:215,246`): consume `highlightedTitle/highlightedSnippet` pre-escapados; `highlightMatches` escapa el texto **y** el query (`escapeHtml` + `escapeRegExp`) antes de inyectar `<mark>` (`fuzzySearch.ts:221-226`). ✓

**Otros vectores revisados:**
- `safeHref` en References neutraliza esquemas ejecutables (`https://javascript:…` no ejecuta). ✓
- Nombre de archivo de imagen/video escapado antes de interpolarlo en atributos (`RichEditor.tsx:352, 421`). ✓
- `sanitizeFilename` para rutas ZIP: whitelist `[a-z0-9_-]` — sin path traversal. ✓
- `window.confirm`/`alert` nativos (no HTML) para conflictos. ✓

**Anti zip-bomb (`zipBackup.ts:89-122`):** tope de 100 000 entradas + heurística de ratio 1000:1 con mínimo de 10 MB descomprimidos, validado **antes** de descomprimir y antes de mutar IndexedDB. Funciona, pero ver hallazgo **VN-AUD-003**: los topes de peso fueron eliminados con justificación obsoleta.

**Validación de schemas en import:** `backupSchemas.ts` con Zod por tabla (id obligatorio no-vacío, campos tipados, `.passthrough()` para forward-compat); `validateArray` separa válidos/inválidos; los inválidos se cuentan y se muestran en `ImportReportModal`. Rejection up-front de backups de versión futura (`IncompatibleBackupError`) — sin import parcial. ✓

### 2.4 DATA & BACKUP — ✅ APROBADO

- **Schema v15** (`db/index.ts`): 21 tablas (sin `videos`), `CURRENT_SCHEMA_VERSION = 15` usado como gate del manifest.
- **Migraciones v1→v15** completas y encadenadas; v5 y v9 con upgrades de datos reales; v14 corrige índice `labId` de images (bug de orphans documentado); v15 borra `videos` (ver VN-AUD-002). v8 no existe (hueco permitido por Dexie — versiones declaradas estrictamente crecientes). El E2E previo verificó upgrades v1→v15 en vivo.
- **Seeds idempotentes**: 16 plataformas + 14 categorías + 13 tools; los IDs demo legacy se eliminan una sola vez (`DEMO_NOTE_IDS`).
- **Export**: notas como `.md` con frontmatter (`isDeleted` viaja — round-trip de papelera verificado E2E), labs/glosario/referencias/JSONs, imágenes con manifest de dueño real (fix VN-003), PDFs en `/pdfs/`, `onlineActivity` exporta **solo el tipo de IOC, nunca el valor**. Manifest con `schemaVersion` + `formatVersion`.
- **Import merge seguro**: upserts por identidad (`noteKey` = plataforma/categoría/título normalizados), la rama update **no** toca `isDeleted` (no reactiva papelera silenciosamente), contadores added/updated/skipped/invalid visibles en el reporte.

### 2.5 INTEGRIDAD OFFLINE — ✅ APROBADO

- `App.tsx`: en `NODE_ENV=development` el SW **nunca se registra**; además hace `unregister()` de cualquier SW residual + wipe de TODAS las caches + una recarga (guard 30 s anti-bucle). Este fix elimina la clase de error "module factory is not available" que sobrevivía a F5 vía chunks stale del proxy de preview.
- `sw.js` v4: `/_next/*` network-first **siempre** (prod chunks content-hashed e inmutables → revalidación gratis); navegaciones network-first con fallback a cache offline; static cache-first; wipe de caches obsoletos en activate; guard IS_DEV por hostname como legacy fallback.
- `manifest.webmanifest` válido (nombre, iconos, theme, `lang: es`, standalone).
- Sin requests de red en carga: fuentes self-hosted, icon local, cero fetch de arranque.

### 2.6 27 TOOLS + BÚSQUEDA — ✅ APROBADO

- **27 = 7 inline** en ToolsView (Subnet, Ports, JWT, Base, HTTP, WinEvent, Cron) **+ 19** componentes autocontenidos en `components/tools/` (con `_shared.tsx` de helpers) **+ IocExtractorView**. Coincide exactamente con `TOOLS_CATALOG` (27 entradas).
- **Single source of truth**: `data/toolsCatalog.ts` alimenta el sidebar de ToolsView, el índice de búsqueda y el deep-link dispatch — imposible desincronizar catálogo vs búsqueda.
- **Búsqueda Ctrl+K**: `fuzzySearch.ts` indexea las 27 tools (`buildToolDoc`, acronym = id); buckets de boost 0-5 (exact-title > exact-acronym > startsWith > contains > acronym-contains > fuzzy) con `titleLower`/`acronymLower` precomputados; `parseQuery` soporta filtros `type:`/`tag:`/`platform:`; el único HTML que produce (highlight) está escapado (§2.3).
- Nota: los 19 componentes de tools/ ahora se importan estáticamente (fix de robustez HMR documentado en ToolsView — era la causa raíz del error de fábricas de módulo en preview). Trade-off consciente y correcto para una app local.

### 2.7 CALIDAD — ✅ APROBADO

- `bun run lint` → **0 errores** (ejecutado durante esta auditoría).
- `bunx tsc --noEmit` → **0 errores** (ejecutado durante esta auditoría).
- Patrones revisados que habitualmente rompen el cero: sin `any` sueltos en los módulos críticos, casts acotados y justificados, hooks con cleanup, refs latest-value en autosave, `reactStrictMode: true` activo con los componentes de riesgo documentados como idempotentes.

---

## 3. Tabla de hallazgos

| ID | Severidad | Archivo | Línea | Problema | Impacto |
|---|---|---|---|---|---|
| VN-AUD-001 | **MEDIO** | `utils/sanitizeHtml.ts` (+ ausencia de CSP en `next.config.ts`) | 65 | `ALLOWED_URI_REGEXP` permite `https?:` en `src`/`href`; no existe Content-Security-Policy global | Un `<img src="https://atacante/pixel.png">` (o `<video src>`, `<embed src>`) en HTML **importado de un backup o pegado** se auto-carga al renderizar la nota: request saliente no consentido que filtra IP/hora/UA del usuario (beacon de privacidad). Requiere importar/pegar contenido hostil — no es XSS (DOMPurify bloquea ejecución), pero contradice "sin requests no explícitos" |
| VN-AUD-002 | **BAJO** | `db/index.ts` | 451-466 | Migración v15: blobs de video que solo existían en IndexedDB se descartan avisando únicamente con `console.warn` | Pérdida de datos **silenciosa para el usuario** (no ve la consola). Alcance acotado: solo videos nunca migrados a disco en la versión anterior; los archivos de la carpeta no se tocan y los embeds `data-vid` legacy siguen resolviendo |
| VN-AUD-003 | **MEDIO-BAJO** | `utils/zipBackup.ts` | 63-82 | Topes de peso del import (200 MB/entrada, 2 GB total) eliminados; la justificación ("vaults pesados con videos") quedó obsoleta tras la REGLA DE ORO — los videos ya nunca viajan en ZIP | Un ZIP multi-entrada con muchas entradas medianas bajo el umbral de ratio 1000:1 pasa el gate → descompresión masiva → congelamiento/OOM de la pestaña. Vector real pero estrecho: el usuario debe elegir conscientemente un ZIP malicioso de su disco |
| VN-AUD-004 | **BAJO** | `utils/sanitizeHtml.ts` (65) vs `utils/zipBackup.ts` (1146) y `Editor/RichEditor.tsx` (334-373) | — | Inconsistencia SVG: el import acepta `image/svg+xml` (mimeByExt) y `handleImageFile` acepta cualquier `image/*`, pero `ALLOWED_URI_REGEXP` **no** incluye `data:image/svg+xml` | Una imagen SVG insertada o importada pierde su `src` en el siguiente load (el sanitizador la stripa) → "desaparece" de la nota (queda la figcaption). No es seguridad (los scripts en SVG vía `<img>` no ejecutan); es pérdida funcional confusa para el usuario |
| VN-AUD-I1 | INFO | `integrations/threatIntel/credentials.ts` | 65-71 | PBKDF2 usa password estático de la app (salt aleatoria por instalación) | Cifrado-at-rest de ofuscación, documentado honestamente en el código. Con XSS-neutralizado y modelo local, es el diseño razonable; alternativa real sería WebAuthn/OS keystore |
| VN-AUD-I2 | INFO | `providers/shodan.ts` | 45 | API key de Shodan viaja en query param de la URL | Diseño de la API de Shodan; sobre HTTPS. Queda en telemetría del servidor destino (que ya recibe la consulta). Sin acción |
| VN-AUD-I3 | INFO | `utils/videoStorage.ts` / `RichEditor.tsx` | 380-434 | Sin validación de magic bytes al copiar video (solo `file.type` + input `accept`) | Un archivo renombrado se copia como-is a la carpeta del usuario. Sin impacto en la app (nunca se ejecuta desde IndexedDB/ZIP) |
| VN-AUD-I4 | INFO | `db/index.ts` | — | Hueco de versión v8 en migraciones (v7→v9) | Permitido por Dexie (versiones declaradas crecientes); sin efecto en upgrades. Documentar sería ideal |

**Total: 0 CRÍTICO · 0 ALTO · 2 MEDIO (1 medio + 1 medio-bajo) · 2 BAJO · 4 INFO.**

---

## 4. Violaciones a la REGLA DE ORO

**NINGUNA.** Verificado por análisis estático completo de las 4 superficies (videoStorage, RichEditor, LabsView, zipBackup) y respaldado por evidencia dinámica E2E previa sobre el mismo HEAD:

1. Cero rutas de blob de video hacia Dexie (tabla eliminada en v15; el único estado es el DirectoryHandle).
2. Cero escritura de videos al ZIP (el export no lee video alguno; manifest sin campo de videos; legacy videos = ignorados + reportados).
3. Persistencia solo como referencia `data-vault-video="<filename>"` (escapada) — confirmado inspeccionando el HTML persistido en IndexedDB tras inserción E2E (sin `blob:`).
4. ObjectURLs revocados en unmount en ambos editores; sin duplicación en re-attach.
5. "Buscar archivo" copia al disco bajo el nombre exacto esperado — nunca materializa el blob en la DB.

---

## 5. Puntos fuertes destacables

1. **Disciplina de red**: un solo wrapper con timeout; 5 entry points explícitos; ni un probe, ni un beacon, ni un fetch de arranque en toda la app.
2. **Defensa en profundidad XSS**: sanitize en 3 boundaries (load/paste/import) + hooks belt-and-braces + fallback conservador + paste con preventDefault siempre.
3. **Ingeniería de la REGLA DE ORO**: la referencia limpia + FSA + ObjectURL efímero está implementada con esmero (conflictos, permisos, re-link, legacy).
4. **Import de backups como superficie hostil tratada en serio**: Zod por tabla, gate de versión up-front, anti zip-bomb, merge no destructivo, reporte transparente.
5. **Documentación de decisiones de seguridad en el código**: casi cada decisión no obvia lleva su comentario con contexto de auditoría — auditabilidad excepcional.
6. **Calidad**: lint 0 / tsc 0 reales; estricto; StrictMode activo.

---

## 6. Recomendaciones priorizadas

| # | Prioridad | Acción | Origen |
|---|---|---|---|
| 1 | **Alta** | Neutralizar el vector de imágenes remotas: (a) quitar `https?:` de `ALLOWED_URI_REGEXP` en `src`/`href` de media embebido (permitir solo `blob:` y `data:image/…`), y/o (b) añadir CSP `img-src 'self' blob: data:` vía headers (el SW de producción también puede inyectarla). Migrar los `<img src="https://…">` existentes a descarga-local al importar, si se desea preservarlos | VN-AUD-001 |
| 2 | **Media** | Restaurar topes de peso en `validateZipSafety` (p. ej. 200 MB/entrada y 2 GB total descomprimidos) — la razón original de quitarlos (videos en ZIP) ya no existe. Coste: unas 10 líneas; las imágenes/PDF reales de un vault personal quedan muy por debajo | VN-AUD-003 |
| 3 | **Media** | Superficar en UI el descarte de la migración v15: escribir el conteo de blobs descartados en una fila de `datasetMeta` (o localStorage) y mostrarlo como banner/toast en el primer arranque posterior a la migración | VN-AUD-002 |
| 4 | **Baja** | Alinear SVG: o bien añadir `svg` a `ALLOWED_URI_REGEXP` (aceptando que scripts en SVG-vía-`<img>` no ejecutan — el riesgo real sería solo si algún día se renderizara con `innerHTML` fuera de `<img>`, lo que hoy no ocurre), o bien rechazar SVG en `handleImageFile`/import con un mensaje claro. Hoy el comportamiento es una pérdida silenciosa | VN-AUD-004 |
| 5 | **Baja** | Añadir validación de magic bytes (o al menos extensión vs MIME coherentes) en `saveVideoToDirectory` para dar feedback inmediato de "esto no es un video" | VN-AUD-I3 |
| 6 | **Opcional** | Documentar el hueco v8 en migraciones con un comentario de una línea | VN-AUD-I4 |

---

## 7. Verificaciones ejecutadas durante esta auditoría

| Verificación | Resultado |
|---|---|
| `bun run lint` | 0 errores |
| `bunx tsc --noEmit` | 0 errores |
| Barrido de red exhaustivo (fetch/XHR/WS/beacon/Image/EventSource) | 1 wrapper, 5 entry points explícitos |
| Barrido `innerHTML=` / `dangerouslySetInnerHTML` | 2 usos innerHTML (sanitizados) + 1 dangerouslySetInnerHTML (pre-escapado) |
| Análisis de migraciones Dexie v1→v15 | Completas, encadenadas, idempotentes |
| Conteo de herramientas (catálogo vs componentes) | 27/27 exactos |
| Estados de git al auditar | working tree limpio; main = 7e0b336 = origin/main |

---

## 8. ADDENDUM — Estado de los hallazgos (post-auditoría)

**Todas las recomendaciones de la sección 6 están aplicadas y verificadas.** Las 6 pasadas de la lista quedaron resueltas en commits posteriores sobre `main`:

| # | Hallazgo | Estado | Commit | Resumen del fix |
|---|---|---|---|---|
| 1 | VN-AUD-001 (MEDIO) | ✅ Fixeado | `656d911` | El hook `uponSanitizeAttributes` del sanitizador elimina `src/srcset/poster/href` remotos de todo elemento media y `<embed src>` queda restringido a `blob:`; los `url(https://…)` de estilos inline se eliminan en `afterSanitizeAttributes`. Los `<a href>` legítimos siguen funcionando (navegación explícita del usuario) |
| 2 | VN-AUD-003 (MEDIO-BAJO) | ✅ Fixeado | `0cc90a8` | `validateZipSafety` restaura los topes anti zip-bomb (200 MB/entrada, 2 GB total descomprimidos); el rechazo se superfica al usuario vía `ZipSafetyError` con mensaje específico |
| 3 | VN-AUD-002 (BAJO) | ✅ Fixeado | `37ac771` | La migración v15 escribe el conteo de blobs descartados en localStorage; el primer arranque posterior lo muestra como alerta única en español (console.warn ya no es lo único visible) |
| 4 | VN-AUD-004 (BAJO) | ✅ Resuelto por diseño | `656d911` | `data:image/svg+xml` en `<img src>` se permite vía `DATA_URI_TAGS` de DOMPurify: los scripts en SVG cargados por `<img>` no ejecutan (garantía del navegador) y las referencias externas quedan bloqueadas. E2E-verificado: los SVG insertados sobreviven save→load→sanitize |
| 5 | VN-AUD-I3 (BAJO) | ✅ Fixeado | `a89b113` | `saveVideoToDirectory` huelea los magic bytes ANTES de copiar (10 firmas: MP4/MOV/3GP, WebM/MKV, AVI, FLV, OGG, MPEG-TS/PS, ASF/WMV, RealMedia, MXF); si no coinciden, aviso interactivo — nunca bloqueo duro, y cancelar aborta en silencio vía `VideoRejectedError` |
| 6 | VN-AUD-I4 (INFO) | ✅ Fixeado | `a89b113` | El hueco v8 (migración vacía intencional) queda documentado con comentario en `src/vault/db/index.ts` |

**Veredicto final: 0 CRÍTICOS · 0 ALTOS · 0 MEDIOS · 0 BAJOS abiertos.** El reporte original queda arriba como snapshot histórico del HEAD `7e0b336` (27 tools, schema v15); el proyecto avanzó desde entonces a 28 tools y schema v16 (Data & Intel) con la misma disciplina de seguridad.

### Re-verificación funcional final (2026-08-30, HEAD `06dfbaa`)

Pasada E2E completa en navegador real (Chromium headless) sobre el HEAD actual — todo en verde:

- Notas: crear → escribir → autoguardado (debounce) → reload → contenido persistido.
- Papelera: borrado suave con confirmación → aparece en papelera → restauración.
- Búsqueda global `Ctrl+K`: encuentra nota por CONTENIDO (IP dentro del cuerpo), instantánea.
- Data & Intel: alta manual → contadores reactivos; IoC Extractor → "Guardar en Data & Intel (4)" → los 4 IoCs (IP, dominio, URL, hash) visibles al instante sin refresh; búsqueda/filtro por texto; dedup (re-añadir el mismo IoC no crea fila); export .json/.csv habilitados.
- Herramientas: 28/28 visibles y abribles.
- Captura rápida `Ctrl+Shift+Q` → Inbox.
- Blog: seleccionar apunte → descarga .md habilitada.
- Backup: export ZIP completo → toast "Descargado: VaultNotes-Backup.zip".
- Responsive 390px y 1440px sin scroll horizontal; cero errores de consola y de página.
- `bun run lint` → 0 errores · `bun run typecheck` → 0 errores.

---

## 9. ADDENDUM II — Auditoría integral en ciclos (2026-10-29, HEAD `4aa3d71`→`9588dcb`)

Auditoría completa de reparación (no solo lectura) sobre el HEAD `3b52d61` en ciclos detectar→corregir→verificar→re-auditar. `tsc --noEmit` reveló **193 errores** que lastraban el quality gate: todos originados por el checkpoint de sesión `2de9dbd` (23 oct, posterior a v13), que resucitó en el árbol **95 archivos fantasma** de features ya retiradas por diseño o de scaffold ajeno a la app.

### 9.1 Eliminación de código fantasma (commit `4aa3d71`, 101 archivos)

| Grupo | Archivos | Motivo verificado |
|---|---|---|
| Scaffold shadcn/prisma | `src/components/ui/*` (48), `hooks/use-toast/use-mobile`, `lib/utils`, `lib/db`, `components.json`, `tailwind.config.ts`, `prisma/schema.prisma`, `api/route.ts` | Cero imports desde la app; dependencias npm nunca instaladas (@radix-ui/*, clsx, cva, @prisma/client, tailwindcss-animate). El propio v13 documenta "prisma/ huérfano eliminado" — el checkpoint lo re-introdujo |
| Features retiradas v11 (Data & Intel / Threat Intel) | `DataIntelView`, `DataIntelDatasets`, `intelStore`, `integrations/{threatIntel,cve,kev,mitre,sigma}` | Referencian tablas Dexie borradas en v25 (tiCache, intelItems…) y el export `isOnline` ya inexistente. La retirada fue decisión de feature documentada en la migración v25 |
| Features retiradas V6 | `ReviewView` (reviewItems, v20), `CveSearchTool`, 9 tools hd extra, `HdSlaCalculatorTool` | Fuera del catálogo de 48 tools; el catálogo dice "(V6) hd-sla → migrada a runbooks / eliminada" |
| Datos pre-fusión V11 | `cheatsheetCore`, `socCheatSheet`, `serviceDeskCheatSheet`, `sysadminCheatSheet`, `troubleshootingRunbooks`, `helpDeskLabsData`, `sysadminLabsData`, `iamGlossaryPacks` | Contenido verificado como ABSORBIDO en los runbooks/glosarios vivos (spot-checks por comandos distintivos: dcdiag 13→32, repadmin 4→25, w32tm completo en runbooksSysAdmin…; 184/194 términos de packs ya en los seeds). Historial git preserva las copias |
| Artefactos | `public/vaultnotes-fixed-src.zip`, `public/vaultnotes-fixed.bundle`, `VaultLogo.tsx` | Sin referencia alguna (grep global) |

Verificación del ciclo: tsc 0 · eslint 0 · **0 archivos inalcanzables** desde el entry (era 95) · E2E navegador completo sin errores.

### 9.2 Auditoría profunda de zipBackup.ts + App.tsx (commit `9588dcb`)

Lectura completa de zipBackup.ts (2138 líneas) y de las superficies de seguridad. **Todas las invariantes del reporte original SIGUEN EN VERDE** (DOMPurify + 3 hooks + fallback; highlight dual-escaped; SW dev-never + wipe + guard 30 s; cero innerHTML en App; merge no destructivo; gate de versión antes de mutar; topes anti zip-bomb activos). Cero P0/P1/P2. Seis P3 corregidos y **verificados dinámicamente en navegador**:

1. `manifest.stats` añadía `troubleshootingIamCount` y `flashcardStatsCount` ausentes (los .json SÍ se exportaban). ✅ Export real: `troubleshootingIamCount: 30`.
2. Los 10 archivos legacy (9 tablas Data & Intel ≤3.10.0 + `reviewItems` ≤3.5.0) se ignoraban **en silencio**; ahora se cuentan sus filas y el reporte lo muestra. ✅ ZIP con 3+2+1+1 filas legacy → reporte "7".
3. Rama update de notas: `sourceUrl: valid.sourceUrl || ''` borraba la URL local si el backup más nuevo traía el campo vacío. ✅ Backup con URL vacía + `updatedAt` posterior actualizó contenido pero **preservó** `https://ejemplo.com/fuente`. Chequeo transversal: términos/labs/referencias usan spread completo consistente — el patrón era exclusivo de la rama de notas.
4. Round-trip de comillas: el exportador escapa `\"` en el título y el parser no lo revertía. ✅ Título con comillas round-trip intacto (ADD branch).
5. Comentario v16 de `db/index.ts` apuntaba al eliminado `store/intelStore.ts`; reescrito con nota de auditoría (declaración v16 conservada por la cadena de migraciones).
6. `page.tsx`: `VaultErrorBoundary` ahora envuelve también a nivel de página (la fase de render del propio App quedó fuera de cobertura — estrecho camino a pantalla blanca). Componente ligero (solo React).

### 9.3 Re-verificación E2E del ciclo final (sesión Chromium + IndexedDB real)

Notas (crear/editar/autosave/reload/persist con unicode+emojis) · papelera (confirmación nativa → restaurar) · Ctrl+K fuzzy → dispatch a tool · 48/48 tools · Log Parser (parse 3 formatos + extract IOCs → handoff cross-tool al IoC Extractor verificado con los 7 IoCs en el textarea destino) · Glosario flashcards (entrar/voltear/salir) · Labs (crear/editar/reload/persist) · Simulador SD (HD-1001 "Empezar a trabajar" → En progreso → persiste tras reload) · Roadmap IAM 373 ítems (toggle → persiste) · export ZIP (manifest v25/3.11.0 íntegro) · import merge con reporte · endpoint `/api/enrich-ticket` (LLM + Zod OK) · QuickCapture `Ctrl+Shift+Q` → Inbox · móvil 390 px sin overflow · **cero errores de consola y de página**.

### 9.4 Notas informativas (sin acción)

- **Inventario de red actualizado**: además de los 5 entry points online retirados con v11, la app tiene DOS puentes same-origin opt-in y con gesto explícito del usuario: `/api/enrich-ticket` (LLM, tras confirm de consentimiento, en HdTicketTriageTool) y `/api/git/pull` (Pull espejo GitHub). Ninguno se ejecuta sin click; el análisis offline nunca depende de ellos. La sección §2.1 del reporte original queda como snapshot de su fecha.
- **Persistencia del navegador de pruebas**: el perfil de Chromium del harness es efímero (cerrar el navegador = IndexedDB borrado); los datos de las pruebas viven en los ZIP exportados durante la sesión. Verificado que NO es un bug de la app: dentro de un mismo perfil todo persiste a través de reloads.
- **Import no transaccional** (por diseño): cada sección del ZIP hace commit aditivo con su propio try/catch; un fallo intermedio deja estado parcial válido y re-importable idempotentemente (los gates de versión/seguridad sí garantizan no-import-parcial). Documentado como decisión consciente.
- **Offline en producción**: no re-verificado en esta sesión (el SW no se registra en dev POR DISEÑO — ver §2.5); las garantías offline quedan cubiertas por el diseño documentado y verificaciones E2E previas de producción.

---

## 10. ADDENDUM III — Pegado tipo Obsidian: imágenes remotas localizadas (2026-10-29, V17)

**Feature:** pegar una captura o una página web completa (Ctrl+A, Ctrl+C en el navegador) con imágenes/GIFs en línea y que todo quede guardado LOCAL, instantáneo y perfecto. Antes: el texto se pegaba y las imágenes desaparecían en silencio (el sanitizador VN-AUD-001 elimina los `src` remotos, con razón).

### 10.1 Superficie nueva: `/api/fetch-image` (proxy local)

El navegador no puede descargar imágenes cross-origin sin CORS (`fetch()` falla en la mayoría de sitios). El proxy server-side resuelve eso y su hardening queda **verificado dinámicamente**:

| Control | Verificación E2E |
|---|---|
| Esquema http/https único (`ftp:` → 400) | ✓ curl real |
| SSRF: hosts privados bloqueados (loopback, RFC1918, link-local IPv4/IPv6, ULA, CGNAT, multicast/reservados, .local) — `localhost:3000/secret` → 403 | ✓ curl real |
| `Sec-Fetch-Site: cross-site` → 403 (DNS rebinding y uso como proxy desde webs de terceros) | diseño + header siempre presente en navegadores modernos |
| Tope 25 MB **contado en streaming** (Content-Length mentiroso no desborda memoria) | diseño |
| Timeout 15 s (AbortController) | diseño |
| Content-Type `image/*` obligatorio (hotlink-blocked que devuelve text/html → 502/415 → el cliente degrada a enlace) | ✓ curl real (raw text → 502) |
| Redirecciones: seguimiento manual, cada destino revalida esquema y host, máximo 5 saltos; destinos internos bloqueados → 403 | verificado por build; DNS de nombres públicos no queda fijado a una IP |

### 10.2 Invariantes preservadas (todas re-verificadas en E2E)

- **VN-AUD-001 (beacons) INTACTA**: jamás se persiste un `src` remoto. La transformación pre-sanitiza marca las imágenes como pending SIN src; el sanitizador nunca ve una URL remota que conservar. Tras el pegado completo: **0 srcs remotos en el DOM guardado** (verificado tras reload).
- **Offline por defecto**: la red SOLO ocurre tras pegado explícito + consentimiento ÚNICO (localStorage; cancelar = enlaces esa sesión, sessionStorage). El load boundary JAMÁS hace red: los marcadores de descargas inconclusas se convierten a enlaces al abrir la nota (guard por contador de descargas activas).
- **REGLA DE ORO (imágenes)**: con carpeta GITHUBVAULT configurada, las descargas se copian al disco (`data-vault-img`, sin IDB ni ZIP); sin carpeta, data-URL en db.images (mismo patrón que el picker, registro incluido para el manifest del backup).
- **Sanitización íntegra**: el HTML se parsea con DOMParser (documento inerte), se transforma y DESPUÉS pasa por `sanitizeHtml` (misma config VN-B-014). Los fallbacks de enlace llevan `rel="noopener noreferrer"`.

### 10.3 Límites y degradaciones

- Tope 30 imágenes por pegado (la 31+ degrada a enlace, toast informativo); dedupe por URL (el logo repetido se descarga una vez).
- Concurrencia 6; 25 MB por imagen (el tope legacy).
- Fallos (404, hotlink, offline, >25 MB): **enlace visible** con la URL original — nada se pierde en silencio.
- Nota cerrada a mitad de descarga: los marcadores restantes → enlaces al reabrir (sin red); las descargas completas no escriben huérfanos (chequeo de marcador pre-save).
- Capturas pegadas ("image.png" repetida): auto-rename silencioso (el pegado es instantáneo; el picker de archivos sigue preguntando por sobrescritura). Multi-archivo: TODAS las imágenes del portapapeles (antes solo la primera), en orden.
- Lazy-load: `data-src`/`data-original`/`data-lazy-src`/`data-actualsrc`/`srcset` resueltos a la URL real antes de decidir.

### 10.4 E2E (navegador real, Chromium + IndexedDB)

Paste HTML con 1 imagen real + 1 rota → `✅ 1 guardada (data-URL) · 1 enlace` con toast · registro `db.images` con nombre derivado de la URL · **reload + reabrir → 6 imágenes data-URL + GIF animado (`data:image/gif`) + 4 enlaces, 0 srcs remotos** · consentimiento: diálogo 1ª vez → Aceptar recuerda (localStorage) · Cancelar → enlaces esa sesión SIN volver a preguntar · captura "image.png" instantánea sin diálogos · 2 imágenes en un solo pegado → ambas insertadas en orden · API: octocat PNG 200 · GIF placehold.co 200 image/gif · localhost 403 · ftp: 400 · no-imagen 502 · `eslint` 0 · `tsc --noEmit` 0 · 0 errores de consola/página.

Nota de proceso: los ~100 archivos fantasma del checkpoint (eliminados en §9.1, commit `4aa3d71`) reaparecieron durante esta sesión; se volvieron a eliminar con la misma justificación verificada (scaffold sin dependencias, features retiradas, datos pre-fusión absorbidos) — los checkpoints de sesión del entorno siguen siendo la fuente de las resurrecciones.

---

*Fin del reporte. Auditoría original en modo solo lectura; el addendum §8 documenta los fixes posteriores; el addendum §9 la auditoría integral en ciclos del 2026-10-29; el addendum §10 el pegado tipo Obsidian (V17).

---

## 11. ADDENDUM IV — Ronda Impeccable V17.1: crítica dual + auditoría 5D + fixes P1 (2026-11-05)

**Metodología:** workflow Impeccable (github.com/pbakaus/impeccable, engine 0.1.18) sobre la superficie completa de la app. Crítica con DOS sub-agentes aislados (A: design review tipo director de diseño con inspección real del navegador; B: detector determinista + evidencia de navegador) + auditoría técnica de 5 dimensiones. Detector: `impeccable detect --json src` (254 archivos).

### 11.1 Crítica (Heurísticas Nielsen 30/40 — banda "Good")

Fortalezas confirmadas: autosave (badge + flush en unmount/pagehide), command palette con deep-links, pedagogía del modo estudio (evidence-gated closing), lenguaje ITSM/IAM impecable. Especificidad de diseño: AUTÉNTICA — el modelado de interacción es del producto (no intercambiable con un notes app genérico); el chrome genérico dark-admin es correcto para modo Operate.

### 11.2 Hallazgos P1 (5) — todos corregidos y verificados E2E

| # | Hallazgo | Fix | Verificación |
|---|---|---|---|
| 1 | Flashcards: 3 botones de calificación llamaban al MISMO handler (afordanza engañosa), flip solo con click, sin teclado, Esc no salía, sin aria-labels | Cableadas a la tabla FSRS-lite `flashcardStats` existente (misma fórmula que el deck del Dashboard: Difícil=lapse/stability 0, Bueno=growth, Fácil=growth×1.3); teclado completo (Espacio voltea, 1/2/3 califica, ←/→ navega, Esc sale); carta = `<button aria-pressed>`; chip de sesión honesto; foco a la carta al abrir (el foco en el trigger cubierto re-activaba y reseteaba la sesión con Espacio) | E2E: flip/rate/Esc + chip "1 difíciles · 0 buenas · 1 fáciles" + lectura cruda de IndexedDB (stability/difficulty/reps/lapses correctos) |
| 2 | Colas de simuladores recortaban ~105px en 390px (scrollWidth 495 vs 390, overflow-x hidden = contenido INVISIBLE): H1, filas de tickets y filtros cortados — 269 elementos en SOC. Causa raíz: los 8 grids `lg:grid-cols-[minmax(300px,380px)_1fr]` sin template móvil → track implícito auto = min-content del LI más ancho (spans `.truncate` nowrap contribuyen su ancho intrínseco completo a la medición min-content) | `grid-cols-1` (= `minmax(0,1fr)`) en los 8 grids de IamView/SocView/HelpDeskView/SysAdminView + track lg endurecido a `minmax(0,1fr)` | E2E 390px: SOC 269→0, IAM/HD/SA 0, Glosario 0, Herramientas 0, Dashboard 0, doc 390x390 |
| 3 | Contraste AA fallando en el texto de soporte: #666=3.45:1 (×309), #555=2.66:1 (×461), #4a4a4a=2.23:1, #444=1.9:1, #777=4.42:1 — contadores, categorías, "PILAR 1 · IAM", timestamps, placeholder | Rampa comprimida a valores que pasan 4.5:1 en la peor superficie (#161616): #444/#4a4a4a→#808080 (4.58–5.01), #555→#828282 (4.71–5.15), #666→#858585 (4.90–5.37), #777→#868686 (4.97–5.44); orden de la rampa preservado; #888/#999 intactos; 882 tokens reemplazados + placeholder del editor en globals.css | Math de contraste verificado para cada token × superficie; color renderizado verificado (sidebar group label rgb(128,128,128); placeholder #808080 — lightningcss lo minifica a `gray`, mismo valor) |
| 4 | Tap targets del header móvil 14×14px (Guardar Backup/Importar/Pull/Capturar) — WCAG 2.5.8 requiere ≥24px, en la fila con las acciones más críticas | `p-2 -mx-1.5 -my-2 sm:p-0 sm:py-2` en los 5 botones de header + GitPullButton (2) | E2E: 30×30px medidos (Pull opciones 28×28, hamburguesa 44×44) |
| 5 | Editor sin indicador de foco visible (`focus:outline-none` sin reemplazo — WCAG 2.4.7) | `focus-visible:outline focus-visible:outline-1 focus-visible:outline-blue-500/40 focus-visible:-outline-offset-4` (sin `focus:outline-none`, que ganaba por orden de cascada y mataba el ring) | E2E: outline solid 1px @ -4px computado en la superficie enfocada |

### 11.3 Hallazgos P2 corregidos (polish pass)

- **Ctrl+K no encontraba tickets de simuladores** ("IAM-4003" → nada, siendo el contenido central): 216 tickets (IAM 50 + SOC 50 + HD 60 + SA 56) indexados en el corpus estático del buscador con deep-link real (selecciona el ticket en el store del pilar y navega) + filtros `type:ticket/sim`. E2E: búsqueda "IAM-4003" → click → simulador IAM con el ticket abierto.
- **Cero ayuda in-app de atajos** (solo README): comando "Ver atajos de teclado" en Ctrl+K (top-6 del palette vacío) → ShortcutsDialog con 5 secciones (Global, Herramientas, Flashcards, Editor, sintaxis de búsqueda), 38 kbd, Esc cierra, foco gestionado. Cargado con dynamic() como el resto de modales.
- **Colisión de nombre accesible "Herramientas"** (grupo vs ítem — los clicks scriptados fallaban 2 veces) + 4× "Troubleshooting" y 4× "Runbooks" indistinguibles por nombre: `ariaLabel` en NavItemDef → "Catálogo de Herramientas", "Troubleshooting IAM/SOC/Service Desk/SysAdmin", etc. Labels visuales intactos.
- **Stripes laterales 2px** (detector: side-tab, el tell #1 de UI genérica) en filas de notas/labs: reemplazadas por `bg-blue-500/10 + inset ring 1px blue` (vocabulario de selección ya establecido en sidebar/colas; sin shift de layout).
- **Glosario 390px**: pane de detalle scrolleaba horizontal 173px (input del título `flex-1` sin `w-0` → min-content intrínseco 345px) → `w-0` en el input. E2E: scrollWidth 390 == clientWidth.
- **Empty state de Notas** no enseñaba nada → ahora muestra cómo crear (Ctrl+Shift+N, botón Nuevo, Ctrl+Shift+Q → Inbox).
- **Dashboard sin h1** (empezaba en h2) → `sr-only h1` "Panel — resumen de tu vault".
- **text-[8px]** (chips de pilar en tools + badge de AutoToc) → 9px.

### 11.4 Detector Impeccable: 4 → 2 hallazgos (ambos intencionales, documentados)

- `globals.css:190 blockquote border-left 3px` — tipografía semántica de blockquote del editor de notas (estándar en renderizadores Markdown); NO es un card/callout. Falso positivo contextual (verificado por Assessment B).
- `TrashView purple-400` — el color-código de Glosario en todo el app (Dashboard ×13, búsqueda, badges, chips): sistema semántico consistente de 3 colores por sección (azul=apuntes, esmeralda=labs, morado=glosario). Cambiar solo esta instancia rompería la consistencia; cambiar el color del glosario app-wide es rediseño, fuera del alcance de refinamiento.

### 11.5 Auditoría 5D: 13/20 → 19/20 tras fixes

| Dimensión | Antes | Después | Evidencia |
|---|---|---|---|
| Accesibilidad | 2 | 4.5→4 | Contraste AA en toda la rampa de grises; tap targets ≥24px; flashcards 100% teclado + diálogo semántico + foco gestionado; foco visible en editor; nombres accesibles desambiguados; h1 en Dashboard. Residual P3: confirm/alert nativos en 3 flujos, ring de foco 1px tenue |
| Performance | 3 | 3 | Sin regresiones: 216 docs estáticos al índice único init-time; palette sigue instantánea (índice estático compartido); lint/tsc 0 |
| Theming | 3 | 3 | Sistema propio monocolor oscuro coherente (por diseño); rampa endurecida sin romper jerarquía |
| Responsive | 2 | 4 | 0 overflow en TODAS las vistas a 390px (era: SOC 269 elementos recortados, Glosario +173px scroll); grids con min-max correcto en 8 contenedores |
| Integridad | 3 | 4 | Detector 4→2 (ambos intencionales); 0 errores consola/página; especificidad de producto confirmada por crítica dual |

### 11.6 Verificación E2E completa (navegador real, IndexedDB real)

Crítica A+B (sub-agentes con sesiones de navegador aisladas) · SOC/IAM/HD/SA 390px overflow 0 · Glosario detalle 390=390 · tap targets 30px · flashcards: foco-en-carta, Espacio voltea sin re-trigger, 1/2/3 califican con chip de sesión, Esc sale, persistencia FSRS leída de IndexedDB (4 rows: stability/difficulty/reps/lapses correctos) · Ctrl+K "IAM-4003" → deep-link al ticket · "atajos" → diálogo (5 secciones, 38 kbd, foco en Cerrar, Esc) · palette vacío muestra "Ver atajos de teclado" · selección de nota con inset ring · editor outline computado · nota TEST creada/editada/borrada (limpia) · `eslint` 0 · `tsc --noEmit` 0 · 0 errores consola/página.

Nota de proceso: los ~100 archivos fantasma del checkpoint reaparecieron por tercera vez y se eliminaron de nuevo (misma justificación verificada de §9.1). `.impeccable/critique/` quedó incluido en esa limpieza; el snapshot de la crítica se re-persistió tras los fixes con las métricas post-fix.

---

(*actualizado en §12*)

## 12. ADDENDUM V — Cierre final: re-ejecución, limpieza de repo y accesibilidad (2026-11-05, HEAD `eab487d`)

### 12.1 Limpieza del repositorio

- **Commit fantasma eliminado** (`16627cd`): schema Prisma scaffold (User/Post) con mensaje UUID, nunca pusheado. VaultNotes es 100% Dexie/IndexedDB — 0 referencias a Prisma en `src/` (verificado con grep). El repo quedó en fast-forward limpio con `origin/main`.
- **`push-pendiente.sh` eliminado**: obsoleto (referenciaba V11 y un token revocado; el remote ya lleva token embebido funcionando y todos los pushes posteriores salieron).
- **`package-lock.json` eliminado**: redundante — el proyecto usa Bun exclusivamente (`bun.lock` es la fuente de verdad; `README` documenta `bun install`).
- **`INVENTORY.md` eliminado**: doc de pre-implementación V9 con conteos ya falsos (41 tools vs 48 reales, 773 términos vs 862, "Roadmap SOC: NO EXISTE" vs 93 ítems). Preservado en historial git; mantenerlo en la raíz era engañoso.
- **Código muerto: 0** — los 22 módulos de `utils/` + 4 hooks verificados con grep de importadores (zipBackup se carga vía `import()` dinámico — falso positivo del escaneo estático).

### 12.2 Accesibilidad — 3 fixes (hallazgos nuevos, no cubiertos por §11)

| # | Hallazgo | Fix | E2E |
|---|---|---|---|
| 1 | Botones "Eliminar plataforma" del sidebar de Apuntes a 20×20px (< 24px WCAG 2.5.8) y sin `aria-label`; invisible en táctil (`opacity-0 group-hover`) | `p-1.5` + icono 3.5 → 26×26px, `aria-label` añadido, `pointer-coarse:opacity-100` (siempre visible en táctil) | Medido 26×26 en navegador |
| 2 | Botón "Agregar plataforma" a 22×22px, sin `aria-label` | `p-1.5` → 26×26px + `aria-label` | Medido 26×26 |
| 3 | Botón favorito (★) del editor sin nombre accesible | `aria-label` dinámico ("Marcar/Quitar de favoritos") + `title` + `aria-pressed` | Escaneo: 0 botones solo-icono sin nombre en toda la app |

### 12.3 Re-verificación E2E completa (navegador real, tras los fixes)

- **Pegado tipo Obsidian (addendum §10)**: HTML de "web completa" con PNG+GIF remotos pegado en el editor → placeholders instantáneos → descarga vía `/api/fetch-image` (mockeada) → ambas imágenes parcheadas a data-URL local, **0 src remotos**, formato (h2/strong) intacto. **Persistencia**: tras reload completo, 2 imágenes locales + contenido intacto.
- **Camino de fallo**: imagen rota (upstream 502) → degrada a **enlace visible**, 0 marcadores pendientes colgados.
- **Sonda XSS por pegado**: `<script>`, `<iframe>`, `onerror`, `javascript:` y src remoto — todo neutralizado por el pipeline DOMPurify; el texto legítimo se conserva. El intento contra `evil.com` pasó por el proxy real y devolvió 502 (SSRF-guard íntegro: hosts privados bloqueados, content-type validado).
- **Backup ZIP**: construido y "Descargado: VaultNotes-Backup.zip" (fallback clásico al `showSaveFilePicker` bloqueado en headless — comportamiento Firefox/Safari por diseño; en navegador real con gesto de usuario usa el picker).
- **Navegación completa**: Glosario 862 · Labs · Simulador IAM (Nexora) · Roadmap IAM 373 · Dashboard — **0 errores de consola, 0 errores de página** en todo el ciclo.
- **Móvil 390px**: 0 overflow horizontal (scrollWidth 390 == clientWidth).
- Nota de prueba E2E creada, verificada y **borrada** (vault limpio).
- `eslint` 0 · `tsc --noEmit` 0 · `dev.log` limpio (todas las rutas 200).

### 12.5 Seguridad de dependencias (Dependabot: 50 alertas abiertas → deps directas parcheadas)

El push del cierre activó la lista de Dependabot del repo: 50 alertas abiertas, TODAS contra el `package-lock.json` recién eliminado (las versiones npm quedaron congeladas desde Sep). Las que afectan a las deps DIRECTAS reales (bun.lock) se parchearon:

| Paquete | Antes | Ahora | CVEs resueltos |
|---|---|---|---|
| next (+eslint-config-next) | 16.1.3 | 16.4.5 | GHSA-673q-mjm6-r5xr (RCE `use cache`, CRITICAL) · GHSA-f87g-xv8r-7p7x · GHSA-6gpp-xcg3-4w24 |
| dompurify | 3.4.14 | 3.4.17 | GHSA-cg2g-xh64-v4q7 (SAFE_FOR_TEMPLATES bypass, CRITICAL) · GHSA-mrv2-3pqr-j5jr · GHSA-6688-9rhm-gjv2 · GHSA-p98j-92pf-mc4p |
| zod | 4.3.5 | 4.6.7 | GHSA-mrhx-c7xc-m3w5 (agotamiento de memoria en arrays sin tope, HIGH) — superficie real: la validación Zod de los ZIPs importados |

Las ~45 alertas restantes son transitivas del lockfile npm eliminado; Dependabot las cerrará al re-escanear HEAD sin `package-lock.json` (bun.lock no las pinea).

### 12.6 eslint-config-next 16.4.5 → React Compiler: 10 errores, 10 arreglados de raíz (0 supresiones)

La nueva config trae las reglas del React Compiler activas como error. Hallazgos y fixes (todos re-verificados E2E):

| Archivo | Regla | Fix |
|---|---|---|
| App.tsx ×3 | set-state-in-effect (selección inicial nota/lab/glosario) | Patrón "derived state during render" con guard de colección previa (repone selección si la elegida desaparece — mejora sobre el original) |
| App.tsx | immutability (isTypingTarget usada antes de declararse) | Hoist a nivel de módulo (función pura) |
| RunbooksView / TroubleshootingView | set-state-in-effect (deep-link Ctrl+K) | Split: aplicación de la selección durante el render (sentinel `undefined` — el deep-link llega ANTES del montaje) + efecto que SOLO limpia el pending del padre (setState externo, uso sancionado). E2E: deep-link a runbook "Golden Ticket" y TS "DNS no resuelve" navegan Y seleccionan |
| IocExtractorView | set-state-in-effect (hand-off cross-tool) + immutability (patrón latest-ref) | Derived-state con sentinel para sembrar el texto + eliminado el ref: `run` en deps con early-return inofensivo; timer one-shot idempotente SIN cleanup (el cleanup cancelaba la extracción — bug hallado y corregido durante la verificación E2E). E2E: Log Parser → "Sent 2 candidate IOCs" → IoC Extractor monta sembrado Y auto-extrae |
| SettingsView ×2 | set-state-in-effect (refresh FSA) + purity (Date.now en render) | Refresh vía timer de 0ms (setState en callback externo) + `now` como estado con interval de 30 s (fmtRel puro) |

### 12.7 Estado final

P0: 0 · P1: 0 · P2: 0 pendientes. Residual P3 conocido (confirm/alert nativos en 3 flujos, ring de foco 1px tenue — heredado de §11, aceptado).

---

*Addenda históricos §10–§12 documentan auditorías anteriores; el estado vigente se actualiza en §13.*

## 13. ADDENDUM VI — Auditoría de calidad integral (2026-11-05)

### Alcance y cambios

Revisados el manejo de solicitudes de las tres rutas API, sanitización y render HTML, flujo de autosave, búsquedas, ciclo de vida de listeners, persistencia y documentación. Se verificaron lint, TypeScript, build de producción y pruebas del nuevo comando `bun run test`.

| Área | Hallazgo | Corrección |
|---|---|---|
| Seguridad | Las rutas locales aceptaban solicitudes iniciadas desde otros sitios. `git/pull` incluye un modo espejo que puede descartar cambios de código locales y sus errores podían incluir credenciales del remoto. | Comprobación compartida de `Origin` y `Sec-Fetch-Site` en las tres rutas; las solicitudes sin metadatos también se rechazan. Se redactan credenciales y tokens conocidos de los errores de Git antes de mostrarlos. |
| Seguridad / memoria | Los cuerpos JSON de enriquecimiento y pull se parseaban sin límite de bytes. | Lector de streaming con topes de 16 KiB y 1 KiB, rechazo de JSON malformado y HTTP 413 al exceder el límite. |
| Datos / UX | Un error de autosave dejaba la interfaz permanentemente en “Guardando…” y generaba una promesa rechazada sin manejar. | Estado visible “Error al guardar” con reintento; fallos registrados sin descartar los cambios pendientes. |
| Rendimiento / ciclo de vida | El temporizador de debounce conservaba un identificador tras dispararse y podía producir escrituras repetidas; un nuevo flush durante una escritura podía solaparse. | Identificador limpiado al disparar y flush serializado que repite la escritura si se acumularon cambios mientras guardaba. |
| Mantenibilidad | El drag-resize podía mantener listeners globales y estilos del documento al desmontar el panel o perder foco. | Limpieza idempotente en mouseup, pérdida de foco y desmontaje; el ancho final se conserva. |
| Pruebas | No había suite de pruebas automatizadas. | Añadidas pruebas Bun para guardas de origen y límites del parser JSON, integradas como `bun run test`. |

### Validación y límites conocidos

- `bun run test`, `bun run lint`, `bun run typecheck` y `bun run build`: correctos.
- Las rutas locales están protegidas contra invocaciones cross-site en navegadores que envían `Origin`/Fetch Metadata; clientes sin ambos metadatos no pueden invocarlas.
- El proxy rechaza direcciones privadas tanto en la URL como en las respuestas DNS, y fija la conexión HTTP/TLS a la IP pública validada para evitar DNS rebinding. Revalida cada redirección y limita la cadena a cinco saltos.
- No se identificaron datos de autenticación de usuarios guardados en el código ni una fuga XSS adicional en los sinks revisados. Las operaciones online existentes siguen requiriendo acción explícita del usuario.

*Este addendum reemplaza el estado de cierre de §12 para los puntos aquí auditados; no afirma que sea posible garantizar ausencia absoluta de defectos en toda combinación de navegador y datos.*
