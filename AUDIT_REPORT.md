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

*Fin del reporte. Auditoría original en modo solo lectura; este addendum documenta los fixes posteriores y la re-verificación final.*
