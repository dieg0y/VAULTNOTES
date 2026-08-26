# Worklog — Auditoría y reparación de VAULTNOTES

---
Task ID: 1
Agent: main (Z.ai Code)
Task: Auditar repo https://github.com/dieg0y/VAULTNOTES (clonado en /home/z/vaultnotes-review), encontrar errores, aplicar mejoras y portar la app reparada al proyecto Next.js (/home/z/my-project) para preview.

Work Log:
- Clonado el repo en /home/z/vaultnotes-review (rama main, 11 commits).
- Leídos todos los archivos fuente clave (App.tsx, db/index.ts, types, utils, componentes).
- Corrido `bunx tsc --noEmit` → 10 errores de sintaxis en 3 archivos.

Stage Summary — ERRORES ENCONTRADOS:

## Blockers de compilación (archivos truncados)
1. `src/db/index.ts` (361 líneas): función `initializeDatabase()` corta a mitad — no cierra llave, no inserta categorías maestras. Faltan exports `countCategoryUsage` y `countToolUsage` que `SettingsView.tsx` importa.
2. `src/components/Editor/RichEditor.tsx` (240 líneas): JSX cortado a mitad del `<select>` de categorías. Faltan toolbar, área editable, subnotas y tooltip de glosario.
3. `src/components/NotesView.tsx` (188 líneas): JSX cortado justo antes de renderizar el RichEditor.

## Errores de runtime
4. `LabsView.tsx` líneas 36-41: `useMemo` invocado a NIVEL DE MÓDULO con variables `categories`/`activeLabs` inexistentes → ReferenceError al importar → pantalla blanca.
5. `LabsView.tsx` líneas 94 y 902: referencia a `INITIAL_CATEGORIES_LIST` que no existe en ningún archivo.
6. `Sidebar.tsx`: usa `<Settings />` sin importarlo de lucide-react.
7. `main.tsx`: nunca llama `initializeDatabase()` → la BD nunca se inicializa con datos seed.

## Errores de tipos
8. `zipBackup.ts`: usa `note.subcategory`, `note.status`, `note.slug` — campos eliminados del tipo Note en schema v5 (export líneas 101-102 e import líneas 312-318).
9. `fuzzySearch.ts`: usa `n.subcategory` y `n.status` (líneas 58-63, 108-113).
10. `LabsView.tsx`: App.tsx pasa prop `categories` que no está declarada en `LabsViewProps`.

## Seguridad
11. **XSS en GlobalSearchModal**: `dangerouslySetInnerHTML` con `highlightedTitle`/`highlightedSnippet` que contienen títulos/contenido de notas del usuario SIN escapar HTML. Un título malicioso ejecutaría código. Fix: escapar HTML antes de aplicar highlight.

## Mejoras menores
12. `App.tsx`: `onCreateNote` ignora el parámetro `platform` que NotesView pasa → el modal no preselecciona la plataforma.
13. IDs con `Date.now()` puro → riesgo de colisión; añadir sufijo aleatorio.
14. `vite.config.ts`: carácter UTF-8 corrupto (mojibake "modifyâ").
15. `package.json`: `vite` duplicado en dependencies y devDependencies; deps de build en dependencies; deps sin uso (@google/genai, express, dotenv, tsx, esbuild, autoprefixer).
16. `GlobalSearchModal`: resultados calculados en cada render sin useMemo.
17. `RichEditor`: `NodeJS.Timeout` en vez de `ReturnType<typeof setTimeout>`.
18. `deletedAt` declarado en tipos pero nunca seteado al eliminar.
19. `handleEmptyTrash` usa bucle de awaits secuenciales en vez de bulkDelete.

Plan: reparar el clone → tsc limpio → portar a Next.js `/` (client + dynamic ssr:false por Dexie) → verificar con agent-browser.

---
Task ID: 2-9
Agent: main (Z.ai Code)
Task: Reparar todos los errores del repo VAULTNOTES, aplicar mejoras y portar la app al proyecto Next.js (/home/z/my-project) para preview.

Work Log:
- Completado db/index.ts: initializeDatabase() + countCategoryUsage/countToolUsage exportadas.
- Completado RichEditor.tsx (toolbar H1-H3/bold/lists/checklist/code/imagen, contentEditable, subpáginas, tooltip glosario).
- Completado NotesView.tsx (render RichEditor + empty state + botón crear).
- LabsView.tsx: eliminado useMemo a nivel de módulo, INITIAL_CATEGORIES_LIST → categories prop, import db, prop topics a LabDetailEditor.
- Sidebar.tsx: import Settings. TrashView/CategoryTreeChecklist: campos legacy eliminados.
- fuzzySearch.ts: fix XSS (escapeHtml antes de highlight) + campos legacy eliminados.
- zipBackup.ts: frontmatter sin status/subcategory/slug, import con parentId.
- Instalados @types/react + @types/react-dom (faltaban → todo React era any).
- Eliminados componentes muertos: FolderTreeExplorer, FolderTreeSelector, ChecklistSelect.
- package.json limpio (deps sin uso fuera), vite.config mojibake reparado, IDs con random suffix, deletedAt seteado, bulkDelete.
- Puerto a Next.js: src/vault/* + page.tsx con next/dynamic ssr:false + CSS custom en globals.css + fuentes Inter/JetBrains Mono en layout.
- Mejoras React Hooks v6: GlobalSearchModal wrapper/inner + useMemo resultados; NewItemModal patrón plataforma derivada + key remonte; effects de sync eliminados (componentes keyed).
- Verificado: tsc limpio (clone), vite build OK, eslint limpio (Next), browser E2E completo.

Stage Summary:
- Repo clonado reparado en /home/z/vaultnotes-review (commit local 4f6a4e5, 20 archivos, +327/−1459).
- App funcionando en Next.js / (puerto 3000) — verificada con agent-browser: dashboard, flashcards, notas (crear/editar/eliminar/restaurar), labs, glosario, settings (add categoría 14→15), búsqueda Ctrl+K fuzzy, papelera, responsive 390px sin overflow.
- VLM confirmó visualmente dashboard y editor sin glitches.
- El usuario debe copiar los archivos del clone a su GitHub (no hay credenciales para push).

---
Task ID: 3
Agent: main (Z.ai Code)
Task: Implementar 4 mejoras pedidas por el usuario en VAULTNOTES + revisión de errores/optimizaciones.

Work Log:
- Lab.commands: string → string[] con migración automática en initializeDatabase (split por líneas), normalización en zipBackup al importar (legacy string → array), fuzzySearch tolerante a ambos formatos, seed actualizado.
- NotesView: árbol recursivo de subpáginas desplegable. autoExpandedIds derivado (sin effects, compatible React Hooks v6): ancestros de la nota seleccionada + la nota misma. userExpanded/userCollapsed para control manual. Búsqueda matchea subpáginas del padre.
- LabsView: Comandos Clave como lista de chips (Enter agrega, ✕ elimina, Copiar (N) al portapapeles). Init defensivo para legacy strings.
- LabsView: paneles redimensionables — handles de arrastre entre filtros/lista/detalle (180-460px y 220-560px), persistencia localStorage (vault-labs-filters-w / vault-labs-list-w), doble clic restablece, min-w-0 en detalle.
- GlossaryView: input de categoría → checklist maestro (CategoryTreeChecklist) colapsable con badges de selección siempre visibles, multi-categoría, sincroniza categories + category.
- App.tsx: pasa categories a GlossaryView; createLab con commands: [].
- Verificado en navegador: árbol anidado 3 niveles (Zero Trust → Cómo funciona → Nueva subpágina), agregar/eliminar comandos, drag de ambos handles con persistencia (330→234 lista, detalle 562→658), doble clic reset, checklist glosario (marcar/desmarcar categorías), responsive 390px sin overflow, sin errores de consola.
- Lint ESLint limpio, tsc limpio (Next y clone), commit 1b869ea en clone (8 archivos, +386/−68).

Stage Summary:
- Las 4 mejoras solicitadas implementadas y verificadas end-to-end.
- Repo clone actualizado con segundo commit listo para push.

---
Task ID: 4
Agent: main (Z.ai Code)
Task: Fix bug del árbol de subpáginas + paneles redimensionables en Apuntes/Glosario + secciones separadas en Labs + import inteligente (upsert) + flashcards inteligentes.

Work Log:
- FIX BUG ÁRBOL: causa raíz — toggleExpand siempre re-añadía a userCollapsed cuando la nota estaba en autoExpandedIds, making re-expand impossible. Reescrito con modelo VS Code: Set único expandedIds, toggle = flip exacto, click en fila revela hijos, cambio de selección (desde cualquier origen) expande cadena completa vía patrón render-time. Verificado con 4 tests: expand por click, colapso+re-expand con mismo toggle (el bug), colapso+click fila, navegación externa revela cadena.
- useResizablePanel hook + PanelResizeHandle component compartidos (draggable, clamped, localStorage, doble clic reset).
- Apuntes: 2 paneles redimensionables (plataformas 160-380, lista 220-560). Glosario: 1 panel (220-560). Labs: refactorizado al hook.
- Labs: secciones separadas en tarjetas verticales — Partes → Herramientas → Comandos → Resumen (hallazgos+mitigación lg:2col). Orden verificado en DOM.
- Import inteligente upsert: noteKey/labKey/termKey + proyecciones canónicas para diff; upsertTerm/upsertLab/upsertNote (add/update-only-that/skip). ImportSummary con added/updated/skipped. ImportReportModal rediseñado. flashcardStats en export/import ZIP. Test real: JSON con término nuevo+modificado+idéntico → reporte 1/1/1 correcto y BD actualizada sin duplicados.
- Flashcards inteligentes: Dexie v6 tabla flashcardStats, algoritmo de prioridad (-maestría + daysSince*0.8 + 15 nunca-visto + unknown*1.5), sesión con orden congelado (fix: respondía y re-barajaba causando repeticiones mid-session), badge ✓/✗ por término, etiqueta SMART, restart con snapshot fresco. Stats persistidos verificados en IndexedDB.
- Lint ESLint 0 errores, tsc 0 errores (Next + clone). Responsive 390px sin overflow. Sin errores de consola.
- Datos de prueba del navegador limpiados (término test, stats, notas test, definición TGT restaurada).
- Commit cbd54c9 en clone (11 archivos, +697/−415).

Stage Summary:
- Bug del árbol arreglado con modelo determinista y verificado con 4 escenarios E2E.
- Paneles redimensionables en las 3 vistas principales con persistencia.
- Secciones de Labs separadas según lo pedido.
- Import upsert funcionando con reporte detallado.
- Flashcards con repetición espaciada ligera y stats persistentes.

---
Task ID: 5
Agent: main (Z.ai Code)
Task: Eliminar código muerto, git push y guía de uso.

Work Log:
- Auditoría de dead code con script propio (imports vs usos por archivo).
- Eliminado: VaultLogo.tsx (sin importadores), htmlToMarkdown() (nunca llamada), .env.example (GEMINI key sin uso), metadata.json (artefacto AI Studio).
- Hechas privadas (uso interno): sanitizeFilename, stripHtml, DEFAULT_PLATFORMS_LIST, MASTER_CATEGORIES_LIST, INITIAL_TOOLS_LIST.
- Imports limpiados: 11 iconos lucide sin uso en 5 componentes, 2 imports de lucide duplicados fusionados en GlossaryView, FlashcardStat type en DashboardView, React default en App.tsx.
- Verificado: lint 0, tsc 0, vite build OK, 3 vistas + dashboard sin errores en browser.
- Commit d2cca6a (13 archivos, +12/−139).
- README.md creado con guía completa de uso → commit 110275a.
- git push falló: sin credenciales de GitHub en el sandbox. Alternativa generada:
  * /public/vaultnotes-fixed.bundle (git bundle con los 5 commits, 176K)
  * /public/vaultnotes-fixed-src.zip (código fuente final, 103K)
  Ambos descargables desde la preview (/vaultnotes-fixed.bundle y /vaultnotes-fixed-src.zip).

Stage Summary:
- Código 100% limpio de dead code. 5 commits listos en el clone.
- Push requiere que el usuario autentique; se le dan instrucciones con bundle/zip.

---
Task ID: 6
Agent: main (Z.ai Code)
Task: Push a GitHub con token del usuario + re-auditoría de dead code + instrucciones de arranque visibles.

Work Log:
- git push exitoso con el token del usuario: c35a7fc..110275a y luego 110275a..0174d24 (total 6 commits en GitHub).
- Re-auditoría completa (componentes, iconos, types, exports, deps): 0 problemas en clone y my-project.
- Eliminados de public/: vaultnotes-fixed.bundle y vaultnotes-fixed-src.zip (ya innecesarios tras el push).
- .gitignore: eliminada excepción !.env.example muerta.
- README: nueva sección destacada "¿CÓMO LA ABRO?" al principio con npm install/npm run dev/localhost:3000, advertencia de que index.html no se abre directo, y atajos iniciar.bat/iniciar.sh.
- Verificado: tsc 0, vite build OK, eslint 0.
- Nota de seguridad dada al usuario: revocar el token expuesto en el chat.

Stage Summary:
- Repo 100% sincronizado en GitHub (github.com/dieg0y/VAULTNOTES, main @ 0174d24).
- Código sin dead code verificado dos veces.
- Instrucciones de uso prominentes en README.

---
Task ID: 7
Agent: main (Z.ai Code)
Task: iniciar.bat para abrir con doble clic + export con comportamiento "Guardar" (reemplaza el archivo anterior).

Work Log:
- Creado iniciar.bat (CRLF, sin acentos por codepage de consola): detecta Node.js faltante, npm install solo la 1ra vez, abre navegador tras 4s, ventana con instrucciones. iniciar.sh equivalente (chmod +x).
- Guardar Backup: exportVaultZip con File System Access API — showSaveFilePicker la 1ra vez (sugerido VaultNotes-Backup.zip), handle persistido en nueva tabla fileHandles (Dexie v7), exportaciones siguientes sobreescriben el MISMO archivo en silencio. Handle inválido (archivo movido/borrado) → re-pregunta. AbortError (cancelar) no es error. Fallback Firefox/Safari: saveAs con nombre fijo.
- Header: botón "Guardar Backup" (icono Save), tooltip explicativo, confirmación verde "Guardado en ..." por 4s. Icono Download huérfano eliminado.
- README: doble clic en iniciar.bat como instrucción principal (comandos manuales a <details>), sección backups reescrita.
- Verificado: tsc 0, eslint 0, vite build OK, migración v7 OK (tabla fileHandles), botón nuevo presente, 3 vistas sin errores, API disponible en Chromium.
- Commit 937b2f1 y push exitoso (0174d24..937b2f1).

Stage Summary:
- La app ahora se abre con doble clic en iniciar.bat (Windows) / iniciar.sh (Mac/Linux).
- Export = Guardar real: un solo archivo de backup siempre actualizado en la ubicación elegida por el usuario.

---
Task ID: 8
Agent: main (Z.ai Code)
Task: App "como nueva" (sin demo) + plataformas eliminables en Apuntes + filtros de labs reales + revisión final + push.

Work Log:
- db/index.ts: eliminados INITIAL_NOTES/INITIAL_LABS/INITIAL_GLOSSARY_TERMS (seeds de demo, −200 líneas). Limpieza one-time con flag localStorage 'vault-demo-content-removed' que borra los IDs demo conocidos (incluida subnota y flashcardStats) en instalaciones existentes sin tocar contenido del usuario.
- NotesView: gestión de plataformas en la barra izquierda — botón + para agregar (Enter/Escape, anti-duplicados), papelera por plataforma visible al hover; bloqueo con alert si tiene apuntes; reset a 'Todas' si se borra la seleccionada.
- LabsView: allOrganizations sin hardcode (antes LetsDefend/THM/HTB/Mi Lab Local fijos) — refleja solo orgs reales con hint vacío; eliminado el input '+ Nueva Organización' (no persistía nada).
- GlossaryView: 'Estudiar Flashcards' disabled con 0 términos + tooltip.
- E2E verificado: app arranca 0/0/0 tras limpieza one-time; agregar plataforma ✓; eliminar sin notas ✓ (14→13); eliminar con notas bloqueada con aviso ✓; lab creado → filtro muestra solo su org real ✓; flashcards disabled ✓; sin errores de consola; datos de prueba limpiados.
- README actualizado (arranque vacío, plataformas gestionables, filtros reales).
- tsc 0, eslint 0, vite build OK en clone. Commit 7fe8c28 y push exitoso (937b2f1..7fe8c28).

Stage Summary:
- La app es 100% del usuario: arranca vacía, plataformas y filtros reflejan solo sus datos reales.
- Repo GitHub actualizado con todo el trabajo de la sesión (8 commits).

---
Task ID: 9
Agent: main (Z.ai Code)
Task: Sección "Generar Blog" — exportar apuntes y labs como .md listo para IA + push.

Work Log:
- Nuevo utils/markdown.ts: htmlToMarkdown afinado al editor rico (code blocks con lenguaje extraído del header span O del class language-x — bug de regex greedy corregido y verificado, ```bash correcto), checklists, figuras→nota de imagen, headings, énfasis, links, blockquotes, listas, kbd, entidades. generateBlogMarkdown: metadata por elemento, subpáginas anidadas automáticas, labs completos (org/tema/dificultad/tiempo/fuente, herramientas, comandos en bash, fases numeradas, hallazgos, mitigación), prompt IA opcional prependeado, título según cantidad. blogDraftFilename slugificado.
- BlogView: selector checkbox (apuntes con hint de subpáginas + labs con meta), Todo/Limpiar, preview en vivo, Copiar (con fallback execCommand) + Descargar .md, toggle prompt IA, hints de flujo, estados vacíos, botones disabled sin selección.
- Sidebar: botón "Generar Blog" (FileCode) debajo de Glosario. types: 'blog' en ActiveSection. App: renderiza BlogView.
- E2E verificado: markdown completo correcto con nota (h1, bold, italic, link, ```bash, lista, inline code) + subpágina + lab completo; toggle prompt ON/OFF/ON; botones disabled sin contenido; sin errores. Clipboard bloqueado solo en headless (limitación del entorno, no de la app).
- tsc 0, eslint 0, vite build OK. README con nueva sección. Commit 900c1aa y push exitoso (7fe8c28..900c1aa).

Stage Summary:
- El usuario ya puede: seleccionar apuntes/labs → Copiar o Descargar .md (con prompt para IA incluido) → pegarlo a una IA → recibir artículo para su portfolio.

---
Task ID: 10
Agent: main (Z.ai Code)
Task: Incrustar videos en apuntes/labs con persistencia local + inclusión en backups + push.

Work Log:
- Types: StoredVideo (blob: Blob) + ImportSummary.addedVideos. Dexie v8 tabla videos (id, noteId, labId, name, createdAt).
- RichEditor + PartRichEditor: botón Video en toolbar, input file video/*, handleVideoFile guarda el File como Blob, inserta <figure class="vault-video-embed" data-vid contenteditable=false> con video controls + caption editable, attachVideoSources() vincula object URLs desde la BD al cargar (con cleanup y remove de clase missing). Autoguardado strippea src="blob:*" para persistir HTML limpio. Drag&drop de videos. Aviso si excede storage.
- zipBackup: export añade videos/ (blobs) + videosManifest.json (metadata); import restaura por id con Blob re-tipeado con mimeType. ImportReportModal: fila "Videos incrustados restaurados". App: limpieza de videos+imágenes al borrar definitivamente notas/labs y al vaciar papelera.
- FIX CRÍTICO descubierto en E2E: execCommand('insertHTML') fallaba silenciosamente con selección perdida (devolvía false tras usar file picker) — bug latente que afectaba imágenes/código/checklists también. Nuevo utils/domInsert.ts insertHtmlInEditable(): restaura caret al final si no hay selección válida. Aplicado a todos los inserts de ambos editores.
- E2E con video REAL (ffmpeg 3s 640x360): incrustado en subpágina IAM Control (como el ejemplo del usuario) → reproducción por clic confirmada (pausado:false, avanzó a 2.73s), seek a 1.5s, duration 3, readyState 4; persistencia tras reload (blob re-attachado); HTML guardado sin blob URLs y con data-vid; video en IndexedDB (50675 bytes); estado missing al borrar tabla; import de ZIP con estructura del export real → embed revivió (fix de clase missing persistida aplicado); VLM confirmó reproductor con controles nativos visible.
- Lint 0, tsc 0, vite build OK. Datos de prueba limpiados. Commit 3bc75e8 y push exitoso (900c1aa..3bc75e8).

Stage Summary:
- Flujo completo del usuario verificado: descargar video → abrir subpágina → Incrustar Video → elegir archivo → reproducible con controles completos → Guardar Backup lo incluye → importarlo en otra PC lo restaura.

---
Task ID: 11
Agent: main (Z.ai Code)
Task: Videos sin límites — carpeta real del PC (FSA) + fallback IDB + backup extendido + push.

Work Log:
- Nuevo utils/videoStorage.ts: arquitectura dual. PRIMARIO: File System Access API — showDirectoryPicker → subcarpeta VaultNotesVideos (create) → handle persistido en tabla fileHandles; videos como archivos crudos (sin límite). FALLBACK: IndexedDB con navigator.storage.persist(). API: pickVideosDir/ensureFsPermission/isFsReady/getVideoBlobById/saveVideoBlob/getAllVideoEntries/deleteVideoEverywhere/migrateIdbVideosToFs/getVideoStorageStats + flags declined.
- RichEditor + PartRichEditor: handleVideoFile usa saveVideoBlob (primera vez ofrece carpeta si no declined), attachVideoSources usa getVideoBlobById con detección de permiso faltante → banner 'Conceder acceso' (gesto) que re-vincula. Deferred Promise.resolve().then() para satisfacer react-hooks/set-state-in-effect.
- zipBackup: export lee AMBOS orígenes vía getAllVideoEntries (ZIP portable único); import restaura vía saveVideoBlob (a disco si hay carpeta). Manifest intacto.
- SettingsView: panel completo Almacenamiento de Videos (soporte, estado carpeta, contadores en PC/navegador con bytes formateados, elegir/cambiar carpeta, migrar N a carpeta con auto-migración al configurar, dejar de usar).
- App.tsx: borrados definitivos usan deleteVideoEverywhere (elimina archivo real del disco). StoredVideo.blob opcional + storedIn.
- E2E: panel visible en Configuración con botón 'Elegir carpeta para videos (sin límites)'; clic en headless → picker no disponible → flag declined + fallback sin errores; video real subido vía fallback → storedIn 'idb', blob src, embed en HTML persistido sin blob URLs; autoguardado OK; sin errores de consola; datos limpiados.
- Lint 0, tsc 0, vite build OK. Commit a2326cd y push exitoso (3bc75e8..a2326cd).

Stage Summary:
- Las 3 opciones del usuario implementadas combinadas: FSA (opción 1) + carpeta dedicada con archivos crudos (opción 2) + backup que incluye videos de cualquier origen (opción 3, ZIP portable único).
- Sin límites prácticos: el único tope es el espacio libre del disco del usuario.

---
Task ID: 12
Agent: main (Z.ai Code)
Task: Auditoría final de límites de video + regresión completa de funcionalidades + dead code + orientación Edge + push.

Work Log:
- LÍMITES DE VIDEO: eliminado el tope visual max-height 480px (embeds de ambos editores + CSS global) → reproducción a tamaño natural. Sin límites de tamaño de archivo (carpeta FSA en disco). preload=metadata OK. Mensajes de alerta solo en fallos reales.
- Banner 'Conceder acceso' añadido también a PartRichEditor (labs) — antes solo estaba en RichEditor; attachVideoSources extendido con detección de permiso (anyMissing && permIssue). Imports huérfanos isFsReady/ensureFsPermission ahora usados.
- EDGE: mensajes y README orientados a Edge como navegador único del usuario (soporte completo FSA/persistencia/save-picker).
- Regresión E2E completa (todo OK, 0 errores de consola): dashboard ✓, crear apunte+subpágina con árbol ✓, incrustar video real (sin límite altura, blob src, dur 3s) ✓, crear lab con 4 secciones ✓, crear término glosario ✓, Generar Blog con markdown+prompt ✓, panel Almacenamiento Videos ✓, búsqueda Ctrl+K ✓, papelera eliminar/restaurar ✓, flashcards SMART ✓, Guardar Backup habilitado ✓, responsive 390px sin overflow ✓.
- Dead code: 0 problemas (imports videoStorage, iconos lucide, exports).
- Datos de prueba del navegador limpiados (BD + flag declined).
- tsc 0, eslint 0, vite build OK. Commit 30f5eda y push exitoso (a2326cd..30f5eda).

Stage Summary:
- App cerrada por hoy: 13 commits en GitHub, todo funcional, videos sin ninguna limitación, optimizada para Edge.

---
Task ID: 13
Agent: main (Z.ai Code)
Task: Todo (videos + backups) dentro de la carpeta de la app para copiar una sola carpeta al Drive + push.

Work Log:
- videoStorage: pickAppFolder() reemplaza pickVideosDir — guarda 2 handles (vault-app-dir = carpeta VAULTNOTES con iniciar.bat, vault-videos-dir = subcarpeta). Verificación suave con markers iniciar.bat/package.json + confirm con guía. Picker con id 'vaultnotes-app' (Edge recuerda) y startIn al re-elegir. Nuevos: hasAppFolder, getAppFolderName, writeFileToAppFolder, forgetAppFolder (borra ambos handles).
- zipBackup: exportVaultZip escribe <app>/VaultNotes-Backup.zip DIRECTO vía writeFileToAppFolder (sin diálogo, modo 'app'); fallbacks anteriores intactos. App.tsx: mensaje 'Guardado en la carpeta de la app ✓'.
- RichEditor + PartRichEditor: gate de primer video usa hasAppFolder/pickAppFolder; copy de banners y alerts orientado a carpeta de la app; attachVideoSources usa hasAppFolder.
- SettingsView: panel reescrito 'Carpeta de la App — todo en un solo lugar' con explicación, estado (appName/VaultNotesVideos), stats, migrar/cambiar/dejar-de-usar, y aviso legacy (carpeta de videos vieja sin app-dir → re-elegir para backups automáticos).
- README: diagrama VAULTNOTES/ = iniciar.bat + VaultNotesVideos/ + VaultNotes-Backup.zip; sección 'TODO en una sola carpeta (para tu Drive)'; backups reescritos.
- E2E: panel nuevo visible con botón correcto; Guardar Backup sin carpeta → fallback sin errores; video real incrustado con el nuevo flujo (embed+src+dur OK); tsc 0, eslint 0, vite build OK; datos de prueba limpiados.
- Commit 5a4fcf5 y push exitoso (30f5eda..5a4fcf5).

Stage Summary:
- El usuario copia UNA carpeta (VAULTNOTES) al Drive y lleva: la app, todos los videos y el último backup completo.

---
Task ID: 14
Agent: main (Z.ai Code)
Task: 11 features solicitadas — implementadas las más prioritarias y de mayor impacto.

Work Log:
- #9 Herramientas: ToolsView con 18 utilidades 100% offline (subnetting, encoder/decoder, hash SHA, JWT, regex, timestamp, JSON, password, UUID, base converter, HTTP status, Windows Event IDs, IoC extractor, bitwise, entropy, cron parser, text diff, file magic numbers). Todas funcionan sin internet, con copy buttons y UI limpia.
- #4 Referencias: nueva sección CRUD (ReferencesView) con tipo/tags/favoritos/búsqueda/filtros; tabla references en Dexie v9; incluida en backup (references.json) e import con upsert.
- #2 FSRS flashcards: algoritmo FSRS-lite (stability/difficulty/due/reps/lapses) en FlashcardStat (Dexie v9 upgrade); handleNextCard actualiza todo; priorización por due date; migración automática de stats legacy.
- #11 Backup completo: references.json + flashcardStats con FSRS en export/import; ImportSummary.addedReferences.
- Tipos: ReferenceItem + FlashcardStat FSRS fields + ActiveSection 'tools'|'references'. Sidebar: 2 nuevos botones. App: renderiza ToolsView + ReferencesView.
- Lint 0, tsc 0, vite build OK. Commit 3b9b6fc y push exitoso (5a4fcf5..3b9b6fc).

Pendientes (transparente con el usuario):
- #1 Graph View (necesita d3/react-force-graph)
- #3 Búsqueda con resaltado (DOM post-render)
- #5 PDF embedding (necesita PDF.js)
- #6 Auto TOC (parse headings del editor)
- #7 PWA (manifest+SW — pequeño pero no llegó esta ronda)
- #8 Code blocks mejorados (post-procesar contentEditable)
- #10 Correcciones generales (continuas)

Stage Summary:
- 3 de 11 features implementadas completamente (las de mayor valor único: herramientas, referencias, FSRS).
- +1145 líneas de código nuevo funcional y limpio.

---
Task ID: 15
Agent: main (Z.ai Code)
Task: Limpiar herramientas (quitar 11), arreglar Base Converter, añadir Puertos con detalle, HTTP/Event con explicación a fondo + detección, mejorar IoC con cómo-funciona, Cron con guía, y conectar referencias al glosario ("azulito").

Work Log:
- ToolsView.tsx reescrito completamente: 18→8 herramientas. Eliminadas: Regex Tester, Text Diff, Hash Generator, Password Generator, Entropy Calc, Timestamp Converter, Encoder/Decoder, JSON Formatter, UUID Generator, Bitwise Calc, File Magic.
- Base Converter arreglado: antes el input no mostraba lo escrito (bug de UX). Ahora 4 campos separados (Decimal/Hex/Octal/Binario) que se actualizan en vivo al escribir en cualquiera. Validación estricta de caracteres por base.
- Nuevo "Puertos y Servicios" (33 puertos comunes TCP/UDP): 20,21,22,23,25,53,67,68,69,80,88,110,123,135,139,143,161,389,443,445,465,587,636,993,995,1433,1521,3306,3389,5432,5900,8080,8443. Click → modal con Descripción, Seguridad y Riesgos, Cómo detectarlo (netstat/ss/PowerShell/journalctl/tcpdump), CVE si aplica.
- HTTP Status (17 códigos): click → modal con Descripción a fondo, Causas comunes, Cómo diagnosticarlo, Implicaciones de seguridad, Ejemplo de respuesta HTTP.
- Windows Event IDs (21 eventos: 4624,4625,4634,4648,4672,4688,4689,4720,4722,4724,4726,4732,4738,4740,4767,4776,4798,4800,4825,5025,5031): click → modal con Descripción a fondo, Cómo detectarlo (comandos PowerShell + Event Viewer path + Linux), Regla Sigma YAML completa para SIEM, Análisis de threat hunting, Eventos relacionados.
- IoC Extractor mejorado: añadido IPv6, CVE (CVE-YYYY-NNNNN), direcciones Bitcoin (legacy P2PKH/P2SH + bech32). Sección expandible "¿Cómo funciona?" explicando cada regex y sus limitaciones. Botón "Copiar todos" por categoría. Botón "Limpiar".
- Cron Parser mejorado: guía expandible con 4 secciones — Los 5 campos, Caracteres especiales (* , - / ? L W), Ejemplos comunes (9 patrones), Atajos especiales (@hourly/@daily/@weekly/@monthly/@yearly/@reboot). Descripción legible de cada campo.
- ReferencesView: nuevo componente GlossaryLinkText resalta términos del glosario en título/descripción/tags como botones azules clicables → click abre la entrada del glosario. Tags que coinciden 1:1 con un término también se vuelven clicables. Banner explicativo azul al inicio.
- App.tsx: pasa glossaryTerms + onOpenGlossaryTerm a ReferencesView.

Verificación E2E con agent-browser:
- Layout inicial carga limpio, 0 errores consola.
- 8 herramientas en sidebar (Red: Subnetting+Puertos, IAM: JWT, Datos: Base, Web: HTTP, SOC: Eventos+IoC, Tiempo: Cron). Las 11 eliminadas no aparecen.
- Base Converter: tipear "1234" en Decimal → muestra "1234" y actualiza Hex=4D2, Octal=2322, Binario=10011010010. Tipear "DEAD" en Hex → muestra "DEAD" y actualiza Decimal=57005. Bug fixed.
- Puertos: 33 listados, click en 22 (SSH) → modal con "Secure Shell — acceso remoto cifrado..." + "Catastrófico en producción..." + 4 comandos (netstat, grep auth.log, journalctl, Get-WinEvent OpenSSH).
- HTTP Status: click en 200 → modal con Descripción, Causas, Diagnóstico, Seguridad, Ejemplo "HTTP/1.1 200 OK...".
- Windows Event IDs: click en 4625 → modal con Descripción a fondo + 4 comandos PowerShell + Regla Sigma YAML completa + Análisis de threat hunting + 4 eventos relacionados.
- IoC Extractor: text con IP/URL/hash/email/CVE → 6 IoCs encontrados. Sección "¿Cómo funciona?" expandible con explicación de cada regex.
- Cron Parser: "0 9 * * 1-5" → "Minuto: 0, Hora: 9, Día del mes: Cada, Mes: Cada, Día semana: Rango 1-5" + "→ A las 09:00 de lunes a viernes (días hábiles)". Guía visible con 4 secciones.
- Referencias: creado término "Phishing" en glosario + referencia con "Phishing" en título/desc/tag. Las 3 apariciones de "Phishing" renderizan como botones azules. Click → navega a glosario con el término seleccionado.
- Responsive 390x800 sin overflow.

Stage Summary:
- Las 11 herramientas eliminadas según lo pedido. Base Converter arreglado. Puertos añadido con detalla. HTTP/Event/IoC/Cron mejorados con explicación a fondo y guía. Referencias conectadas al glosario con links azules clicables.
- Commit 704af47 y push exitoso (3b9b6fc..704af47).

---
Task ID: 16-A
Agent: ports-data
Task: Expand PORTS data into a separate file with `secure` (hardening) field

Work Log:
- Leído `/home/z/my-project/worklog.md` para contexto de tareas previas (auditoría VAULTNOTES, fixes de LabsView, schema v5, etc.).
- Leído `src/vault/components/ToolsView.tsx` líneas 153-444 para extraer la interfaz `PortInfo` existente y los 33 puertos preexistentes (20,21,22,23,25,53,67,68,69,80,88,110,123,135,139,143,161,389,443,445,465,587,636,993,995,1433,1521,3306,3389,5432,5900,8080,8443).
- Creado directorio `src/vault/data/` (no existía).
- Generado `src/vault/data/portsData.ts` (800 líneas, 79 entradas, 100% offline) con:
  - Interfaz `PortInfo` exportada con el MISMO shape que ToolsView.tsx + nuevo campo `secure: string` (hardening concreto).
  - Comentario de cabecera explicando cada campo.
  - Las 33 entradas existentes conservadas íntegramente (description / security / detection / category sin tocar) más su `secure` nuevo de 2-4 pasos.
  - 46 entradas NUEVAS añadidas (lista mínima del prompt cubierta al 100%): 137, 138, 162, 179, 500, 502, 514, 554, 631, 873, 9418, 1080, 1194, 1723, 1900, 2049, 2375, 2376, 3000, 3478, 4500, 5060, 5061, 5222, 5353, 5984, 5985, 5986, 6379, 6443, 6667, 8333, 8888, 9000, 9042, 9100, 9200, 9300, 10000, 11211, 15672, 25565, 27017, 27018, 32400, 50070.
  - 3 CVEs opcionales en entradas nuevas (Docker CVE-2019-5736, Elasticsearch CVE-2015-1427, memcached CVE-2018-1000115). Los 33 puertos existentes no se modificaron, por lo que no recibieron CVE.
  - Ordenado ascendentemente por número de puerto.
  - Categorías reutilizadas del modelo existente: File, Remote, Mail, Infra, Web, IAM, Windows, DB, VoIP, Other. (Se usa 'DB' no 'Database' para mantener consistencia con 1433/1521/3306/5432 ya presentes.)
  - `secure` en español, tono SOC-analyst, pasos concretos y específicos por servicio (configs reales: sshd_config, pg_hba.conf, listener.ora, cassandra.yaml, etc.).
- Validado con `bunx tsc --noEmit src/vault/data/portsData.ts` → sin errores de tipo.
- Verificado conteo: 79 entradas, 81 referencias a `secure` (79 entries + 1 interface + 1 comment header), 218 comandos de detección (~2.75 por puerto), 3 CVEs. Proto values válidos: 57 TCP + 7 TCP/UDP + 15 UDP.
- No se modificó ningún otro archivo (ToolsView.tsx intacto).

Stage Summary:
- Archivo creado: `/home/z/my-project/src/vault/data/portsData.ts` (800 líneas).
- Exportados: interfaz `PortInfo` + array `PORTS: PortInfo[]` (sin `export default`).
- Dataset final: 79 puertos (33 existentes preservados + 46 nuevos) ordenados por puerto, todos con `secure` de hardening en español.
- TypeScript válido (tsc pasa limpio). Sin tocar ToolsView.tsx ni ningún otro archivo.
- Próximo paso sugerido (siguiente tarea): refactorizar ToolsView.tsx para importar `PORTS` desde `../data/portsData` y dejar la interfaz local como `import type { PortInfo }`, eliminando el array inline de 280+ líneas.

---
Task ID: 16-B
Agent: winevents-data
Task: Expand WIN_EVENTS data into a separate file with more event IDs

Work Log:
- Leído `/home/z/my-project/worklog.md` para entender contexto previo (Task 15 reimplementó ToolsView con 21 WIN_EVENTS inline; antes 18→8 herramientas; agenda de auditoría del repo original).
- Leído `src/vault/components/ToolsView.tsx` líneas 879-1258: interfaz `WinEventInfo` (id, name, log, short, description, detection[], sigma?, related[], analysis) y 21 eventos inline existentes (4624, 4625, 4634, 4648, 4672, 4688, 4689, 4720, 4722, 4724, 4726, 4732, 4738, 4740, 4767, 4776, 4798, 4800, 4825, 5025, 5031) — 5 de ellos con regla Sigma YAML.
- Creada carpeta `src/vault/data/` (no existía).
- Escrito `/home/z/my-project/src/vault/data/winEventsData.ts` (1154 líneas): `export interface WinEventInfo` + `export const WIN_EVENTS: WinEventInfo[]` con 56 eventos totales.
  - 21 existentes copiados intactos desde ToolsView.tsx (mismos textos, sigmas y related).
  - 35 nuevos priorizados para threat hunting (sin duplicar IDs ya existentes):
    - Acceso a objetos: 4656, 4658, 4663 (NTDS.dit / LSASS / SAM — critical for file auditing)
    - Privilegios: 4673, 4674 (LsaRegisterLogonProcess / SamConnect)
    - Servicios: 4697 (Security log), 7036, 7040, 7045 (System log alt con la Sigma rule SCYTHE/SigmaHQ más famosa)
    - Tareas programadas: 4698, 4699, 4700, 4701, 4702 (persistencia vector, including modifications to MS tasks)
    - Audit policy: 4719 (auditpol changes — blind spot común)
    - Kerberos (DC-side): 4768 (AS-REQ), 4769 (TGS-REQ Kerberoasting RC4 detection), 4771 (pre-auth fail spraying), 4868/4869 (renewals/golden ticket signal)
    - Cuentas/grupos: 4739, 4781 (rename), 4793 (lockout query)
    - Drivers: 4826 (BYOVD indicator)
    - Firewall: 4946, 4947, 4948, 4950 (rules + global config; Defender-disable detection)
    - SMB/red: 5140 (ADMIN$/C$/IPC$), 5145 (SMB file access — ransomware), 5156/5157 (WFP allow/block connections)
    - Cred Manager: 5379 (mimikatz vault::cred / SharpDPAPI detection)
    - Devices: 6416, 6417 (USB / PnP — DLP)
  - 27 de los 56 eventos tienen regla Sigma YAML completa (los nuevos críticos para detección: 4656, 4663, 4673, 4697, 4698, 4701, 4702, 4719, 4768, 4769, 4771, 4826, 4946, 4950, 5140, 5145, 5157, 5379, 6416, 7036, 7040, 7045 + los 5 originales 4624/4625/4688/4720/4732).
  - Cada entrada nueva tiene: description (2-3 frases con campos clave: AccessMask, TicketEncryptionType, ServiceAccount, BinaryPathName, etc.), detection (3-4 comandos PowerShell Get-WinEvent con FilterHashtable + Event Viewer path + Linux/syslog donde aplica), sigma (YAML con title/id (UUID v4 aleatorio)/status/logsource product: windows service: security|system|kernel-pnp/detection selection EventID/condition/level/fields), related (3-4 IDs con labels), analysis (2-3 frases con insight SOC: patrones de ataque, correlaciones con otros eventos, indicadores de IR).
  - NO se usa `export default`. Solo `export interface` + `export const`. NO se modificó ToolsView.tsx.
- Verificación con `npx tsc --noEmit --skipLibCheck`: 0 errores de tipo en el archivo.
- Sanity test con `npx tsx` importando el archivo: 56 entradas, 0 entradas con campos requeridos faltantes, ordenadas ascendentemente, 0 IDs duplicados, 27 entradas con sigma. First=4624 (Logon exitoso), Last=7045 (Servicio instalado System log).

Stage Summary:
- `/home/z/my-project/src/vault/data/winEventsData.ts` creado (1154 líneas, 56 Windows Event IDs).
- 21 existentes copiados intactos + 35 nuevos priorizados para threat hunting (4663, 4656, 4658, 4697-4702, 4673/4674, 4719, 4768/4769/4771/4868/4869, 4781/4793, 4826, 4946-4950, 5140/5145/5156/5157, 5379, 6416/6417, 7036/7040/7045, 4739).
- 27 reglas Sigma YAML (5 originales + 22 nuevas) listas para SIEM.
- Ordenado ascendentemente por ID, sin duplicados, TS válido.
- Solo named exports (`export interface WinEventInfo`, `export const WIN_EVENTS`), no `export default`.
- No se modificó ToolsView.tsx ni ningún otro archivo — el archivo está listo para que un futuro Task haga el switch de la data inline en ToolsView.tsx a `import { WIN_EVENTS, WinEventInfo } from '../data/winEventsData'`.

---
Task ID: 16
Agent: main (Z.ai Code)
Task: Expandir Puertos (más + "Cómo ponerlo seguro"), expandir Windows Event IDs, reescribir IoC Extractor con spec completo SOC/IAM, y completar features pendientes (PWA, Auto TOC, code blocks copy). NO graph view.

Work Log:
- IoC Extractor REESCRITO como componente independiente (src/vault/components/IocExtractorView.tsx, ~800 líneas):
  * Refang automático: hxxp→http, [.]→., (dot)→., [:]→:, [at]→@.
  * Extracción: IPv4 (con :port y /CIDR), IPv6, dominio (+subdominios +punycode xn--), URL (path/query/fragment, soporta defanged), email, hashes (MD5/SHA-1/SHA-256/SHA-512 + SSDEEP/IMPHASH/TLSH/Authenticode), rutas Windows (C:\...\%APPDATA%) y Linux (/etc/...), registry keys, mutex, CVE, JWT, API keys, AWS keys (AKIA...), private keys, bearer tokens, GUIDs (Entra ID object/app/tenant), wallets BTC, secretos en claro (password=, client_secret=).
  * Validación agresiva: descarta IPs privadas (10.x, 192.168.x, 172.16-31.x, 127.x, 169.254.x, 0.0.0.0, 255.255.255.255, CGNAT, multicast, reserved), dominios sin TLD válido, hashes con charset no-hex, dominios en whitelist (microsoft.com, login.microsoftonline.com, *.sharepoint.com, *.okta.com, schemas.microsoft.com — editable).
  * Dedup + contador + contexto de 40 chars alrededor.
  * Clasificación + scoring: "IP Pública — investigar", "IP Privada — Ignorar", "Whitelist — dominio legítimo", "URL con binario — alta sospecha", "Punycode — sospechoso (phishing)", "CREDENTIAL LEAK P1" (AWS keys, private keys, bearer, secretos).
  * Enriquecimiento 1-clic: botones VT / AbuseIPDB / Shodan / OTX / NVD / MITRE / HIBP / Blockchain (abren búsqueda, no consultan automáticamente para no quemar API keys).
  * Output: tabla TSV/CSV para Excel, JSON, STIX 2.1 bundle, KQL listo para Sentinel (DeviceNetworkEvents | where RemoteIP in (...)), SPL listo para Splunk (index=proxy domain IN (...)). Botones "Copiar" para cada formato.
  * Toggle Defang ON/OFF — copia hxxp://malware[.]com para compartir sin clics.
  * Whitelist editable persistida en localStorage con modal (50 dominios por defecto, restaurar defaults).
  * File upload: .txt/.log/.eml/.json/.csv/.xml/.pdf (extracción cruda de texto para PDFs). Procesa archivos grandes sin congelarse (deferred setTimeout).
  * Sección "¿Cómo funciona?" expandible: pipeline SOC completo en 8 pasos + limitaciones honestas.
  * 100% offline, browser-only.
- PORTS expandido a 79 puertos (archivo separado src/vault/data/portsData.ts): 33 existentes + 46 nuevos (137, 138, 162, 179, 500, 502, 514, 554, 631, 873, 9418, 1080, 1194, 1723, 1900, 2049, 2375, 2376, 3000, 3478, 4500, 5060, 5061, 5222, 5353, 5984, 5985, 5986, 6379, 6443, 6667, 8333, 8888, 9000, 9042, 9100, 9200, 9300, 10000, 11211, 15672, 25565, 27017, 27018, 32400, 50070). NUEVO campo `secure` en cada puerto con 2-4 pasos concretos de hardening. Modal renderiza nueva sección "Cómo ponerlo seguro (hardening)" con icon Lock.
- WIN_EVENTS expandido a 56 event IDs (archivo separado src/vault/data/winEventsData.ts): 21 existentes + 35 nuevos (4656, 4658, 4663, 4673, 4674, 4697, 4698, 4699, 4700, 4701, 4702, 4719, 4739, 4768, 4769, 4771, 4781, 4793, 4826, 4868, 4869, 4946, 4947, 4948, 4950, 5140, 5145, 5156, 5157, 5379, 6416, 6417, 7036, 7040, 7045). Cada uno con descripción a fondo, comandos PowerShell+EventViewer+Linux, regla Sigma YAML, eventos relacionados y análisis de threat hunting.
- ToolsView.tsx refactorizado: inline arrays reemplazados por imports de data files (-593 líneas). Import de IocExtractorView. Sin IocTool inline.
- PWA: manifest.webmanifest (name, short_name, start_url, display standalone, theme, icons SVG maskable), sw.js (offline-first cache: navigation fallback + cache-first para assets), icon.svg (vault 512x512). layout.tsx: viewport export con themeColor (fix warning), metadata con manifest + appleWebApp + icons. App.tsx: registra SW en mount.
- Auto TOC (src/vault/components/Editor/AutoToc.tsx): parsea h1/h2/h3 del contentHtml con DOMParser, asigna IDs slugificados a los headings del editor, botón flotante bottom-right con badge count, panel expandible con entries indentados por nivel, click→scrollIntoView+flash highlight (CSS @keyframes vault-toc-flash). Integrado en RichEditor.
- Code blocks mejorados: header con botón "📋 Copiar" (vault-code-copy, contenteditable=false). Event delegation en RichEditor y PartRichEditor (handleEditorClick) — click copia el código del <pre> y muestra "✓ Copiado" 1.5s. Inline onclick no sobrevive contentEditable, por eso delegación.
- Search highlighting: ya implementado en fuzzySearch.ts (escapeHtml + <mark class=bg-yellow-400>). Verificado.

Verificación E2E con agent-browser:
- IoC Extractor: sample con hxxp://malware[.]com/payload.exe + 1.1.1.1:4444 + SHA-256 + AKIA... + password=hunter2 + CVE + JWT + BTC + GUID + 192.168.1.1 + login.microsoftonline.com → 14 IoCs extraídos. Refang convirtió hxxp://malware[.]com→http://malware.com (alta, URL con binario). AWS key+secret=CREDENTIAL LEAK P1 alta. 192.168.1.1=info (privada). login.microsoftonline.com filtrado por whitelist. Hashes etiquetados SHA-256. Enlaces VT/AbuseIPDB/Shodan/OTX/NVD/MITRE/HIBP/Blockchain por IoC. KQL/SPL/STIX generados correctamente. 0 errores consola.
- Ports: 79 listados. Modal puerto 20 muestra Descripción + Seguridad y Riesgos + Cómo ponerlo seguro (hardening) + Cómo detectarlo.
- Windows Event IDs: 56 listados. Modal 4663 muestra Descripción a fondo + Cómo detectarlo + Regla Sigma + Análisis threat hunting + Eventos relacionados.
- PWA: manifest.webmanifest servido ✓, sw.js servido ✓, navigator.serviceWorker.ready=true ✓.
- Auto TOC: nota con 6 headings (2×H1, 2×H2, 2×H3) → botón muestra badge "6", panel lista los 6 con indentación por nivel, headings reciben IDs slugificados (id="conclusiones").
- Code block copy: click real en "📋 Copiar" → "✓ Copiado" (clipboard write OK con user gesture).
- themeColor warning: corregido moviendo a viewport export.
- Lint 0, tsc 0 (vault scope), dev server compilando limpio.

Stage Summary:
- IoC Extractor pasado de "un regex que saca IPs" a un pipeline SOC Tier1/2 + IAM completo (refang→extracción→validación→dedup+contexto→clasificación→scoring→enriquecimiento 1-clic→KQL/SPL/STIX/CSV/JSON→defang toggle→whitelist editable→secret detection). 100% offline.
- Puertos 33→79 con hardening concreto. Event IDs 21→56. ToolsView -593 líneas (data externalizada). PWA instalable offline. Auto TOC funcional. Code blocks con copy.
- Pendientes (transparente): PDF embedding con PDF.js (no hecho — requiere lib pesada), syntax highlighting real en code blocks (requiere Prism/highlight.js), OCR de imágenes en IoC (requiere tesseract.js), correlación IAM Impossible Travel (requiere geo-IP). Graph view cancelado por el usuario.

---
Task ID: 17
Agent: main (Z.ai Code)
Task: Búsqueda fuzzy en todo: referencias + apuntes + herramientas (HTTP, Puertos, Event IDs, Cron). Buscar "201" → va a HTTP Status y abre el modal de "201 Created". "asi con todo". Termina lo pendiente; quita lo que no se va a hacer.

Work Log:
- Extraídos datos estáticos de ToolsView a archivos de datos reutilizables:
  * src/vault/data/httpStatusData.ts — interfaz HttpStatusInfo + array HTTP_STATUSES (17 códigos).
  * src/vault/data/cronData.ts — CRON_EXAMPLES (9) + CRON_SHORTCUTS (8).
- fuzzySearch.ts REESCRITO:
  * searchAllVault ahora acepta (query, notes, glossary, labs, references).
  * Corpus unificado: notas + labs + glosario + referencias + HTTP_STATUSES + PORTS + WIN_EVENTS + CRON_EXAMPLES.
  * Nuevos tipos de resultado: 'reference' | 'tool-http' | 'tool-port' | 'tool-winevent' | 'tool-cron'.
  * Cada entrada de herramienta expone su contenido completo (descripción, seguridad, detection, sigma, analysis, related, cve, secure, troubleshooting, causes, security, example) en el campo "content" para que el fuzzy matchee texto libre del usuario (ej: "ssh", "logon fallido", "rate limit", "gateway timeout").
  * resultToToolDeepLink() mapea un SearchResultItem de tipo tool-* a { toolId, entryId } para el deep-link.
  * Threshold subido a 0.4 (de 0.38) y distance a 140 para capturar coincidencias más laxas en textos largos.
  * Top 30 resultados (evita listas infinitas).
- GlobalSearchModal.tsx reescrito:
  * Placeholder nuevo: "Buscar en todo: apuntes, labs, glosario, referencias, HTTP, puertos, Event IDs, cron…".
  * 8 tipos de resultado con iconos/colores propios: note (azul), lab (verde), glossary (morado), reference (cian), http (ámbar), port (rosa), winevent (rojo), cron (teal).
  * Nuevo prop onSelectTool(deepLink: ToolDeepLink) — dispara la navegación profunda a ToolsView.
  * Footer actualizado: "Fuse.js • Apuntes · Labs · Glosario · Referencias · Herramientas".
- App.tsx:
  * useLiveQuery para db.references → activeReferences.
  * Estado pendingTool: ToolDeepLink | null.
  * onSelectTool = (deepLink) => { setPendingTool(deepLink); setActiveSection('tools'); }
  * onSelectReference = () => setActiveSection('references').
  * ToolsView recibe pendingTool + onConsumePending={() => setPendingTool(null)}.
- ToolsView.tsx refactorizado:
  * Exporta tipos ToolId y ToolDeepLink. Acepta props pendingTool + onConsumePending.
  * Render-time state adjustment (patrón React 19 "you might not need an effect"): cuando llega un pendingTool nuevo, cambia el active tool. Sin useEffect/setState-in-effect (pasa lint estricto).
  * renderActiveTool() pasa autoOpenId + onAutoOpenConsumed SOLO a las herramientas que lo soportan: ports, http, winevent, cron.
  * TOOL_COMPONENTS map eliminado; switch explícito para soportar tipos heterogéneos.
- Tools (PortsTool/HttpTool/WinEventTool/CronTool): patrón deep-link reactivo sin effects con setState:
  * Mount-time: useState initializer computa initialMatch a partir de autoOpenId. Si hay match, el modal abre inmediatamente (sin re-render extra).
  * Prop-change-time: useState(prevAutoOpen=autoOpenId) + render-time adjustment. Cuando autoOpenId cambia entre renders, busca el match y abre el modal.
  * Notify parent: useEffect (sólo llama onAutoOpenConsumed, sin setState — lint-safe).
- CronTool: ejemplos y atajos ahora importados de cronData.ts; cada ejemplo es un botón clickeable que carga la expresión en el parser.

Verificación E2E con agent-browser (todo OK, 0 errores de consola):
- Buscar "201" → 1er resultado "201 Created" (HTTP, ámbar). Click → switch a HTTP Status tool + filtro "201" + modal abierto con descripción "La petición fue exitosa y como resultado se creó un nuevo recurso..." + sección de seguridad visible.
- Buscar "ssh" → 1er resultado "22/TCP SSH" (PUERTO, rosa). Click → switch a Puertos y Servicios + filtro "22" + modal con 2 puertos (22 y 5222) + modal de SSH abierto con "Shell segura Secure Shell..." + botones Copiar de detection.
- Buscar "4624" → 1er resultado "4624 Logon exitoso" (EVENT ID, rojo). Click → switch a Windows Event IDs + filtro "4624" + modal abierto con regla Sigma YAML "title: Successful User Logon / EventID: 4624".
- Buscar "0 9" → 2do resultado "0 9 * * 1-5" (CRON, teal). Click → switch a Cron Parser + expresión "0 9 * * 1-5" cargada en el input + parsed "→ A las 09:00 de lunes a viernes (días hábiles)" visible.
- Creado referencia "OWASP Top 10" en la vista Referencias → buscar "owasp" en Ctrl+K → 2do resultado "OWASP Top 10" (REFERENCIA, cian). Click → switch a vista Referencias + referencia visible en la lista.

Stage Summary:
- Búsqueda fuzzy ahora cubre TODO: apuntes, labs, glosario, referencias, HTTP Status, Puertos, Windows Event IDs y Cron. Buscar "201" lleva directo al modal "201 Created" en HTTP Status. "asi con todo" — 8 tipos de resultado con colores e iconos propios.
- 4 deep-links verificados funcionales: HTTP (modal), Ports (modal), WinEvents (modal + Sigma), Cron (expr cargada). References → navega a la vista.
- Lint 0, dev server limpio, 0 errores de consola.

Pendientes — quitados de la lista (CANCELADOS / no se harán):
- Graph view — cancelado por el usuario.
- PDF embedding con PDF.js — requiere lib externa pesada (no en el stack 100% offline).
- Syntax highlighting real en code blocks — requiere Prism/highlight.js.
- OCR de imágenes en IoC — requiere tesseract.js.
- IAM Impossible Travel correlation — requiere geo-IP lookup (online).

Pendientes aún factibles (no solicitados esta ronda):
- Resaltado DOM post-render en apuntes/labs (search highlighting en SearchResultItem ya existe en el modal).
- Vista de detalle para referencias (hoy el deep-link sólo navega a la vista, no abre una ficha).

---
Task ID: 18
Agent: main (Z.ai Code)
Task: Revisar por errores de consola y aplicar mejoras necesarias (post-tarea anterior). El usuario pidió: "Termina todo lo que creas necesario y revisa por errores en consola y posibles mejoras."

Work Log:
- Leído dev.log: dev server corriendo en :3000 limpio. Único "error" es ENOENT para `/home/z/my-project/src/app` que es el watcher de Turbopack intentando revalidar la ruta (no afecta runtime).
- Lanzado `bun run lint` → 0 errores.
- Verificación E2E con agent-browser:
  * Dashboard carga limpio, 0 errores en consola (sólo React DevTools info y HMR logs).
  * Click en buscador → modal abre. Buscar "201" → 1er resultado "201 Created" (HTTP, ámbar). Click → cambia a Herramientas → HTTP Status, filtro "201", modal abierto con detalle "Cuidado con rate-limiting: si una API crea recursos sin control, un atacante puede inundarla...". ✓ deep-link HTTP funciona.
  * Buscar "ssh" → 1er resultado "22/TCP SSH" (Puerto, rosa). Click → cambia a Herramientas → Puertos y Servicios, filtro "22", 2 puertos listados (22 y 5222), modal de SSH abierto con botones "Copiar" para comandos de detección. ✓ deep-link Puertos funciona.
  * Click Base Converter → 4 inputs (Decimal/Hex/Octal/Binario). Tipear "1234" en Decimal → actualiza Hex=4D2, Octal=2322, Binario=10011010010. ✓ bug del input invisible arreglado confirmado.
  * Click IoC Extractor → pegar texto con hxxp://malware[.]com, IP, SHA-256, AWS key, password=hunter2, CVE-2021-44228 → "6 IoC(s) único(s) — 6 ocurrencias totales". Botones VT/AbuseIPDB/Shodan/OTX/NVD/MITRE por IoC. Refang convirtió hxxp→http. Whitelist (50), "¿Cómo funciona?", "Mostrar exports" (KQL/SPL/STIX), "Subir archivo", toggle "Defang al mostrar". ✓ pipeline SOC completo funcional.
  * Creado término de glosario "Phishing" vía Nuevo Término. Badge sidebar pasó de "Glosario 0" a "Glosario 1".
  * Creado referencia "Guia anti-Phishing para SOC" con "Phishing" en título, descripción y tag. Las 3 apariciones de "Phishing" renderizan como botones azules clicables. ✓ cross-linking glosario funciona.
  * Click en botón azul "Phishing" → navega a vista Glosario con el término "Phishing" seleccionado y su definición visible. ✓ navegación glosario funciona.
  * Reload página → IndexedDB persiste el término Phishing y la referencia. 0 errores post-reload. ✓

Mejoras aplicadas:
- fuzzySearch.ts (rama de query vacío): cada SearchResultItem ahora siempre incluye `highlightedTitle` y `highlightedSnippet` (antes sólo se seteaban en la rama con query). Esto evita que el modal haga fallback a `item.title` / `item.snippet` (texto crudo sin escapar) vía `dangerouslySetInnerHTML`. Aunque `stripHtml` quita tags, no escapa entidades HTML (`&`), así que títulos con `&` podían generar HTML inválido.
- fuzzySearch.ts: cuando snippet es vacío (nota sin contenido, lab sin parts/findings, etc.), ahora usa `escapeHtml(snippet || subtitle)` para que el modal siempre tenga algo seguro que mostrar.
- GlobalSearchModal.tsx: añadido helper local `escapeHtml()` y fallback final `escapeHtml(item.snippet || item.subtitle || '')` en el `<p>` del snippet. Cadena completa segura ahora: `item.highlightedSnippet || escapeHtml(item.snippet || item.subtitle || '')`.
- fuzzySearch.ts highlightMatches: corregido `<mark class="px-1 py-0.2 ...">` → `py-0.5` (Tailwind no tiene clase `py-0.2`, era dead class).

Stage Summary:
- 0 errores de consola verificados con agent-browser en flujo completo (búsqueda → deep-link → modal).
- 0 warnings de lint. Dev server limpio.
- Seguridad: el modal de búsqueda ya no puede inyectar HTML crudo del usuario ni siquiera cuando el query está vacío (rama que se había quedado sin escapar).
- Clases Tailwind del resaltado `<mark>` corregidas para aplicar el padding correctamente.
- Persistencia IndexedDB verificada (glosario + referencia sobreviven reload).
- Estado final: 8 herramientas, 79 puertos, 56 Event IDs, 17 HTTP status, IoC Extractor SOC-grade, búsqueda fuzzy cubriendo TODO (apuntes/labs/glosario/referencias/HTTP/puertos/Event IDs/cron) con deep-links funcionales a las 4 herramientas soportadas.

---
Task ID: 19
Agent: main (Z.ai Code)
Task: Implementar PDF a full en apuntes — el usuario pidió: "Pudiste hacer loq te ddije q un apunte pudiera ser un pdf a full?"

Work Log:
- Reevaluada la decisión anterior de "cancelar" el feature: PDF.js NO es necesario porque el navegador (Edge/Chromium) tiene un renderizador PDF nativo. Se puede usar `<embed type="application/pdf" src="blob:...">` 100% offline sin librerías externas.
- types/index.ts: añadida interfaz `StoredPdf { id, noteId?, labId?, name, mimeType, blob?, caption?, createdAt }`. Añadido `addedPdfs: number` a `ImportSummary`.
- db/index.ts: bump schema v9→v10 con nueva tabla `pdfs: 'id, noteId, labId, name, createdAt'`. Compatible con instalaciones existentes (Dexie aplica upgrade automático).
- utils/pdfStorage.ts (nuevo archivo): util que espeja el patrón de videoStorage.ts pero sin FSA (PDFs viven como Blob en IndexedDB únicamente — son documentos, no necesitan raw file storage). Exporta: `savePdfBlob`, `getPdfBlobById`, `deletePdfEverywhere`, `getAllPdfEntries` (para backup), `pdfExtensionFor`, `getPdfStorageStats`.
- components/Editor/RichEditor.tsx:
  * Import de `savePdfBlob` y `getPdfBlobById`.
  * Añadido `pdfInputRef` + `pdfUrlsRef`.
  * Añadido `attachPdfSources()` (mirror de `attachVideoSources`) — busca `.vault-pdf-embed[data-pdf-id]` en el DOM, lee el blob de IndexedDB y le asigna un blob URL al `<embed>`. El navegador renderiza el PDF nativamente.
  * Effect de carga del editor ahora ejecuta `Promise.all([attachVideoSources(), attachPdfSources()])`.
  * Cleanup de unmount ahora revoca también `pdfUrlsRef`.
  * `triggerAutoSave` ahora strip BOTH `src="blob:..."` y `src='blob:...'` (regex mejorado para soportar comillas simples y dobles) — esto asegura que los blob URLs efímeros no se guarden en el HTML del apunte.
  * Añadido `handlePdfFile(file)`: valida `application/pdf` o extensión `.pdf`, genera id `pdf-<ts>-<rand>`, calcula size label (KB/MB), guarda blob en IDB, inserta `<figure class="vault-pdf-embed" data-pdf-id="...">` con header rojo "PDF • <size>" + botón "⬇ Descargar" + `<embed type="application/pdf" style="width:100%;height:600px">` + caption editable.
  * `handleEditorClick` ahora usa delegación para 2 tipos: (1) `.vault-code-copy` (existente) y (2) `.vault-pdf-download` (nuevo) — lee el blob de IDB y dispara `<a download>` para descargar el PDF original.
  * `handleDrop` ahora detecta también PDFs (por MIME type o extensión).
  * Toolbar: añadido botón PDF (icon FileText, hover rojo) al lado del botón de video con tooltip "Incrustar PDF a full (renderizado nativo del navegador, 100% offline, viaja en el backup)".
  * Input hidden: `<input accept="application/pdf,.pdf">` added.
- utils/zipBackup.ts: backup ahora incluye `/pdfs/` carpeta + `pdfsManifest.json`. Import no-destructivo por id (mismo patrón que videos). Stats del manifest incluyen `pdfsCount`.
- components/ImportReportModal.tsx: añadido row "PDFs incrustados restaurados" (icon FileText rojo) que se muestra cuando `addedPdfs > 0`.
- App.tsx: `handlePermanentDeleteNote`, `handlePermanentDeleteLab`, y `handleEmptyTrash` ahora limpian también PDFs de la tabla `db.pdfs` cuando se borra permanentemente contenido. Importa `deletePdfEverywhere` de pdfStorage.

Verificación E2E con agent-browser:
- Creado apunte "Apunte con PDF" (categoría IAM - PAM, plataforma AWS - IAM / Security) → sidebar badge "Apuntes 1" ✓.
- Click en botón toolbar "Incrustar PDF a full" → se abre el file picker.
- Inyectado PDF de prueba (548 bytes, texto "Hello PDF VaultNotes") vía `DataTransfer` + `dispatchEvent change` (agent-browser no soporta directamente inputs hidden, pero JS injection funcionó perfecto).
- PDF insertado: figure con header rojo "PDF • 1 KB" + botón "⬇ Descargar" + `EmbeddedObject` (el `<embed>` renderizando el PDF nativamente, visible en el snapshot como `EmbeddedObject`) + caption "PDF: test-vault" editable.
- 0 errores de consola.
- Click en "⬇ Descargar" → disparó download del PDF (sin errores).
- RELOAD de la página → apunte persistió en IndexedDB, badge "Apuntes 1" sigue. Click en el apunte → editor abre → `attachPdfSources` rehidrata el blob URL del `<embed>` desde IndexedDB → PDF se renderiza de nuevo (`EmbeddedObject` visible en snapshot post-reload). ✓ Persistencia y rehidratación funcionan.
- Lint 0 errores, dev server compila limpio (sin warnings).

Stage Summary:
- Sí, se pudo hacer lo del PDF a full. Un apunte ahora puede contener un PDF completo, renderizado por el navegador nativamente (sin librerías externas), almacenado como Blob en IndexedDB, persistido tras reload, incluido en el backup ZIP (carpeta /pdfs/ + manifest), y descargable con un clic.
- 100% offline, sin PDF.js, sin ninguna librería externa. Solo APIs del navegador: IndexedDB + Blob + URL.createObjectURL + `<embed type="application/pdf">`.
- Compatible con Edge/Chrome (renderizador PDF nativo). En Firefox el `<embed>` muestra el PDF con su visor interno (pdf.js viene bundled en Firefox).
- Schema Dexie bumped a v10 con upgrade non-destructivo (sólo añade la tabla `pdfs`).
- Toolbar del editor ahora tiene: Imagen | Video | PDF (3 botones de medios).
- Drag & drop detecta y procesa PDFs (además de imágenes y videos).

---
Task ID: FIX-1a
Agent: general-purpose
Task: VN-B-014 (XSS paste), VN-F-009 (trash button a11y+confirm), VN-A-001 (image ID entropy in RichEditor+LabsView)

Work Log:
- Leído worklog + código: RichEditor.tsx (handlePaste L456-466, imgId L375, botón papelera L664-669), LabsView.tsx (handlePaste L1590-1600, imgId L1505), utils/domInsert.ts (insertHtmlInEditable), utils/sanitizeHtml.ts (config DOMPurify, usada sin modificar).
- Confirmado patrón de confirmación de la app: window.confirm con mensajes en español (TrashView L49 "Vaciar Papelera", NotesView L72, SettingsView) — no se usa AlertDialog.
- Verificado en App.tsx L411-416 que onDeleteNote en cascada manda a papelera la nota + todos sus descendientes (coincide con el hallazgo).
- FIX VN-B-014 (RichEditor.tsx L459-494): handlePaste ahora SIEMPRE llama e.preventDefault(); imagen → flujo handleImageFile existente; text/html no vacío → sanitizeHtml() + insertHtmlInEditable + handleContentInput; si no, text/plain → execCommand('insertText') + handleContentInput. Sin nuevos imports (sanitizeHtml e insertHtmlInEditable ya estaban importados).
- FIX VN-B-014 (LabsView.tsx L1593-1628): mismo fix espejado usando handleInput() en vez de handleContentInput().
- FIX VN-F-009 (RichEditor.tsx L695-710): botón papelera del editor ahora tiene title + aria-label "Mover a papelera (borra también subpáginas)" y window.confirm('¿Mover este apunte a la papelera? Sus subpáginas y sus archivos incrustados (imágenes, videos y PDFs) también se moverán a la papelera.') antes de onDeleteNote. Tras confirmar, el comportamiento no cambia.
- FIX VN-A-001 (RichEditor.tsx L375-378 y LabsView.tsx L1505-1508): imgId pasa de `img-${Date.now()}` a `img-${Date.now()}-${Math.random().toString(36).slice(2, 10)}` (misma convención que vid-/pdf-). Grep confirmó que eran los 2 únicos sitios con generador img-.
- Verificación: `bun run lint` → exit 0, sin errores. Re-lectura de las regiones editadas: sintaxis correcta. No se tocaron autosave/flushSaveRef/pagehide, key remount, migraciones Dexie ni sanitizeHtml.ts. No se corrió typecheck/build/db (verificación central del orquestador).

Stage Summary:
- src/vault/components/Editor/RichEditor.tsx: handlePaste endurecido (preventDefault siempre + sanitización DOMPurify para text/html + insertText para texto plano); botón papelera con title/aria-label + confirmación window.confirm; imgId con entropía.
- src/vault/components/LabsView.tsx: handlePaste espejado con el mismo endurecimiento; imgId con entropía.
- Criterios: pegar `<img src=x onerror=...>` ya no ejecuta (DOMPurify lo neutraliza en rama HTML; rama texto lo inserta como literal); pegar screenshot sigue insertando imagen; texto plano sigue funcionando; HTML rico se inserta solo tras sanitizeHtml; IDs de imagen colisionables resueltos.

---
Task ID: FIX-1e
Agent: general-purpose
Task: VN-A-002 (transactional deletes), VN-A-004 (deletedAt null), VN-A-005 (bulk modify), VN-A-001 (image IDs in App+NewItemModal)

Work Log:
- NOTE: VN-A-00X findings were NOT present in worklog.md or anywhere in the workspace (grepped whole repo, 0 matches) — implemented from the detailed finding descriptions in the task brief.
- Read App.tsx delete/restore/trash region (lines ~400-712), videoStorage.ts / pdfStorage.ts (deleteVideoEverywhere mixes Dexie + FSA awaits: db.videos.delete + fileHandles.get + queryPermission/removeEntry; deletePdfEverywhere is pure Dexie), types/index.ts (deletedAt?: string), db/index.ts schema v14 (indexes: videos/pdfs have noteId+labId, images has noteId+labId).
- Verified in node_modules/dexie/dist/dexie.js `setByKeyPath` (lines 202-207): setting a property to `undefined` in update()/modify() DELETES the key — used `deletedAt: undefined` (not `null`, which would fail strict `tsc` since the type is `string | undefined`) so restored rows match the codebase convention of omitting the field; backupSchemas accepts absent deletedAt.
- FIX 1 (VN-A-002) App.tsx handlePermanentDeleteNote/handlePermanentDeleteLab/handleEmptyTrash: gather all video/pdf metas with pure reads BEFORE; ONE db.transaction('rw', [affected tables]) deleting note/lab/glossary rows AND images/videos/pdfs metadata rows atomically; deleteVideoEverywhere/deletePdfEverywhere kept AFTER the transaction (mixed Dexie+FSA helpers would kill the tx — inner row deletes are now idempotent no-ops, disk removeEntry still runs via pre-fetched metas), failures still swallowed with .catch(() => undefined).
- FIX 2 (VN-A-004) App.tsx handleRestoreNote (via modify), handleRestoreLab, handleRestoreTerm: now also set deletedAt: undefined so no stale tombstone timestamp propagates via backup export.
- FIX 3 (VN-A-005) App.tsx handleDeleteNote/handleRestoreNote: sequential await loops replaced with single where('id').anyOf(ids).modify({...}) inside db.transaction('rw', db.notes) — same fields/timestamp semantics (isDeleted+deletedAt+updatedAt / isDeleted+updatedAt). Lab/term delete/restore are single-record updates (no loops), left as-is.
- FIX 4 (VN-A-001) entropy suffix `-${Math.random().toString(36).slice(2, 10)}` added to all Date.now()-only ID generators in my two files: App.tsx `lab-` (L494), `part-` (L508), `term-` (L602); NewItemModal.tsx `ex-` (L120), `part-` (L172). (No literal `img-` generator exists in these files — the cited lines generate part/example/lab/term IDs; note- IDs already had entropy. RichEditor/LabsView untouched — FIX-1a owns them.)
- Verified: `bun run lint` → 0 errors (also ran eslint directly on both edited files → exit 0). Re-read all edits: only Dexie ops inside transactions, no FSA/timers awaited inside them; handleExportBackup/handleImportFile region untouched; no schema/feature/architecture changes; local-first offline Dexie-only behavior preserved.

Stage Summary:
- Files touched: src/vault/App.tsx (handleDeleteNote, handleRestoreNote, handlePermanentDeleteNote, handleRestoreLab, handlePermanentDeleteLab, handleRestoreTerm, handleEmptyTrash, handleCreateLab/handleCreateGlossaryTerm ID generators), src/vault/components/NewItemModal.tsx (handleAddExample, handleSubmitLab ID generators).
- Behavior changes: permanent deletes (note/lab/empty-trash) are now atomic for all IndexedDB rows (no IDB blob orphans on tab close mid-cleanup); disk video files still cleaned best-effort after commit; restore clears deletedAt; trash/restore of note subtrees is one bulk modify (atomic, N→1 round-trips); new lab/term/part/example IDs can no longer collide within the same millisecond.

---
Task ID: FIX-1b
Agent: general-purpose
Task: VN-B-010 (ZIP bomb), VN-B-011 (omitted videos), VN-B-012 (updatedAt on 4 tables), VN-B-013 (orphan reporting), VN-B-016/017/018 (LOW)

Work Log:
- Nota: los IDs VN-B-010..018 NO estaban en worklog.md al iniciar (grep "VN-B" sin matches); se implementó a partir de las descripciones detalladas del brief de la tarea.
- Leído íntegro src/vault/utils/zipBackup.ts (1404 líneas), backupSchemas.ts, types/index.ts, ImportReportModal.tsx, App.tsx (handleExportBackup/handleImportFile), db/index.ts (tipos de tabla), sanitizeHtml.ts, CveSearchTool.tsx (semántica de savedAt) y validate.ts (updatedAt en customSigmaRules).
- Fix 1 (VN-B-010, HIGH): nueva clase `ZipSafetyError` + `validateZipSafety(zip)` en zipBackup.ts (líneas ~47-123). Rechaza ANTES de cualquier mutación IDB: >20.000 entradas; entrada >200 MB sin comprimir; total >2 GB; ratio >1000:1 en entradas >10 MB (umbral 1000, no 100, para no rechazar backups legítimos). Usa `_data.uncompressedSize/compressedSize` con optional chaining + typeof guard (skip si no disponible). Se invoca en 2 puntos: tras el primer `loadAsync` (antes de leer el manifest) y tras el fallback de `contents` (cubre .zip renombrados); el catch del manifest re-propaga ZipSafetyError. Mensaje: 'ZIP potencialmente malicioso o corrupto: <motivo>'.
- Fix 2 (VN-B-011, HIGH): exportVaultZip colecciona `omittedVideos: string[]` (título||id) en las 2 ramas de omisión (blob null y fallo de serialización) y lo devuelve en las 4 salidas de ExportResult. App.tsx handleExportBackup (única región editada de App.tsx, ancla única): si omittedVideos.length > 0 muestra '⚠ Backup incompleto: N video(s) omitidos (permiso de almacenamiento perdido). Recupéralo en Configuración.' en vez del mensaje verde; timeout de 4s intacto.
- Fix 3 (VN-B-012, HIGH): los loops de tiCache/customSigmaRules/savedCves/datasetMeta ahora hacen get por id y saltan+ cuentan conflicto si la fila local es más nueva (patrón espejo del bloque de references). Helper `rowTs(row, fallbackField)`: prefiere `updatedAt`; cae a `savedAt` (savedCves) / `retrievedAt` (tiCache) porque esas tablas no tienen updatedAt — sin fallback el fix sería no-op para CVEs (el problema auditado). Igual o más nueva → put. ImportSummary ampliado con conflictSavedCves/conflictCustomSigmaRules/conflictDatasetMeta/conflictTiCache; ImportReportModal los pinta en ámbar con ShieldAlert (mismo patrón que notes/labs/terms/references) y los suma a totalConflicts.
- Fix 4 (VN-B-013, MEDIUM): durante la importación se registran los noteId/labId de cada imagen/video/pdf NUEVO en `importedBlobOwners`; tras completar los upserts de notes/labs (después del paso 5 apuntes/) se comprueba contra db.notes/db.labs post-import. NO destructivo: los blobs se guardan igual; solo se cuentan orphanedImages/orphanedVideos/orphanedPdfs y se muestran en el modal en estilo info (icono Info, text-sky-400) con nota al pie explicando que quedaron guardados pero huérfanos.
- Fix 5 (VN-B-016, LOW): verificado que SOLO se comprobaba schemaVersion. Añadido guard de formatVersion: `compareFormatVersions` (semver por puntos, segmentos garbage → 0) y rechazo con IncompatibleBackupError si manifest.formatVersion (|| version) > BACKUP_FORMAT_VERSION ('3.1.0'), mismas semánticas up-front antes de mutar; igual/inferior/ausente/garbage = acepta.
- Fix 6 (VN-B-017, LOW): JSON.parse del path legacy .json envuelto en try/catch que lanza 'El archivo .json no es válido (JSON malformado): <msg>. No se modificó ningún dato local.' antes de mutar nada.
- Fix 7 (VN-B-018, LOW): verificado que el RESTORE lee los apuntes DESDE apuntes/*.md (paso 5 del import; no existe notes.json en el export) → NO se cambió el writer (rompería el round-trip). Reportado: el .md exportado lleva contentHtml crudo, pero la reimportación ya lo sanea vía parseMarkdownWithFrontmatter → sanitizeHtml (frontera de import). Sanitizar solo el export requeriría cambiar el formato (p.ej. data/notes.json) — fuera de alcance.
- Verificación: `bun run lint` → 0 errores (exit 0). Relectura de todas las regiones editadas: sintaxis OK, sin debilitar garantías existentes (Zod VN-006, dedup por id VN-002, conflictos updatedAt VN-001, manifest de imágenes VN-003, rechazo up-front de schemaVersion). No se ejecutaron typecheck/build/db (verificación central del orquestador).

Stage Summary:
- Archivos tocados: src/vault/utils/zipBackup.ts (ZipSafetyError+validateZipSafety+compareFormatVersions, omittedVideos en export, guard formatVersion, try/catch .json, conflictos updatedAt en 4 tablas, conteo de huérfanos), src/vault/types/index.ts (7 contadores nuevos en ImportSummary), src/vault/components/ImportReportModal.tsx (4 filas ámbar de conflicto + 3 filas info de huérfanos + nota al pie), src/vault/App.tsx (SOLO handleExportBackup: aviso de backup incompleto). backupSchemas.ts sin cambios (no hizo falta: rowTs accede por Record).
- Comportamiento nuevo: (1) import rechaza zip-bombs/corruptos antes de mutar con mensaje español claro; (2) export nunca más reporta éxito verde con videos faltantes; (3) un backup viejo ya no pisa personalNotes/personalAssessment de CVEs ni ediciones de reglas Sigma más nuevas localmente; (4) blobs huérfanos quedan visibles en el reporte (sin borrarse); (5) formatVersion futuro rechazado up-front; (6) .json malformado da error claro; (7) .md de apuntes sin cambios (round-trip lo exige) — reportado.

---
Task ID: FIX-1d
Agent: general-purpose
Task: VN-F-008 (TrashView confirm), VN-E-001 (winEvents 4728/4103/4104), VN-E-003/004 (sidRid), VN-E-005 (CVSS docstring), VN-E-008 (AMSI), VN-E-014 (httpStatus)

Work Log:
- Leído worklog.md y localizados los archivos objetivo; los detalles de los findings VN-* venían en el brief (no había entradas VN-* en el worklog).
- VN-F-008: leído TrashView.tsx y el patrón de confirmación existente (`window.confirm` en el botón "Vaciar Papelera", mismo patrón que usa todo el codebase en vez de AlertDialog). Reutilizado ese patrón en los 3 botones de borrado permanente por fila (apuntes, labs, términos): cada confirm() advierte que la acción es irreversible y que cascadeará a subpáginas y media adjunto (imágenes/vídeos/PDFs — coincide con handlePermanentDeleteNote/Lab en App.tsx, que borra descendientes + images + videos + pdfs). Restaurar se quedó SIN confirmación (reversible), según pedido.
- VN-E-001: leídas la interfaz WinEventInfo y entradas 4624/4625/4688/4720/4732 como referencia de estilo. Añadidas 3 entradas completas en winEventsData.ts: 4103 (module logging, PowerShell/Operational, MITRE T1059.001 + campos KQL/SPL/hunting), 4104 (script block logging — description lo señala como EL evento canónico para detectar PowerShell malicioso, MITRE T1059.001 + T1562.001) al inicio del array (orden ascendente), y 4728 (grupo global, espejo de 4732 + MITRE T1098) entre 4726 y 4732. Actualizado contador del header (~56→~59) y añadido 4728 a la rama 'Account' de getWinEventCategory() (antes caía al fallback 'Authentication').
- VN-E-003: en sidRidData.ts, S-1-5-17 reetiquetado de "This Organization" a "IUSR" (cuenta anónima de IIS, KB 243330) y añadido S-1-5-15 "This Organization" (faltaba) en su posición correcta del array ordenado.
- VN-E-004: eliminada la entrada fabricada RID 503 "KRBTGT (legacy)"; la description del RID 502 ahora aclara que el procedimiento de reset usa la MISMA cuenta dos veces y que no existe una segunda KRBTGT.
- VN-E-005: en CvssCalculatorTool.tsx (línea 273) corregido el caso de validación: ISC 0.9132 → 0.914816, y recalculados los intermedios dependientes (Impact 5.8731, Exploitability 3.8870, suma 9.7602) para que el texto sea matemáticamente consistente; resultado final 9.8 invariante y el cálculo real NO se tocó.
- VN-E-008: en PowerShellAnalyzerTool.tsx añadidas 4 reglas AMSI bypass siguiendo la estructura Rule existente: amsiInitFailed, AmsiUtils (cubre [Ref].Assembly.GetType('System.Management.Automation.AmsiUtils')), amsi.dll+LoadLibrary/GetProcAddress (proximidad ≤200 chars, ambos órdenes) y AmsiScanBuffer — todas severity 'high' (nuevo campo opcional severity en Rule/Indicator + badge rojo en la UI y en los summaries Copy/Add-to-Note) y MITRE T1562.001 (Impair Defenses). Descripciones en inglés para igualar el idioma real de las reglas/UI de ese archivo (el brief decía "español como el archivo", pero el archivo está en inglés — se priorizó la consistencia interna). Header del archivo actualizado mencionando AMSI bypasses. Regexes probadas con node contra one-liners clásicos (todo hit) y scripts benignos (clean).
- VN-E-014: httpStatusData.ts ampliado de 17 a 28 entradas añadiendo 100, 101, 308, 406, 408, 410, 422, 426, 451, 501 y 505 en orden ascendente, con causes/troubleshooting/security técnicos (422 = validación semántica + historia WebDAV/RFC 9110; 451 = censura legal + Link rel="blocked-by"; 308 preserva método vs 301; etc.).
- Verificación: `bun run lint` → 0 errores, 0 warnings. Relectura de todas las regiones editadas (sin errores de sintaxis). Corregidos 2 typos propios durante la revisión ("radas"→"rutas"; una expresión .replace accidental en la entrada 451). No se ejecutó typecheck/build/db (verificación central del orquestador).

Stage Summary:
- src/vault/components/TrashView.tsx: confirmación window.confirm en los 3 borrados permanentes por fila (notes/labs/terms) con aviso de irreversibilidad y cascada a media/subpáginas; restaurar intacto.
- src/vault/data/winEventsData.ts: +3 eventos (4103, 4104, 4728) completos con sigma/KQL/SPL/hunting; 4728 categorizado como Account; header actualizado.
- src/vault/data/sidRidData.ts: S-1-5-17 = IUSR (correcto), +S-1-5-15 This Organization, RID 503 fabricado eliminado, 502 clarificado.
- src/vault/components/tools/CvssCalculatorTool.tsx: texto de validación corregido a 0.914816 (y derivados consistentes); cálculo intacto.
- src/vault/components/tools/PowerShellAnalyzerTool.tsx: +4 reglas AMSI bypass (severity high, T1562.001), campo severity opcional con badge rojo en UI y summaries.
- src/vault/data/httpStatusData.ts: 17→28 códigos (100/101/308/406/408/410/422/426/451/501/505).
- Sin cambios de arquitectura; local-first/offline/Dexie preservados; ningún archivo fuera de la lista permitida fue modificado.

---
Task ID: FIX-1c
Agent: general-purpose
Task: VN-B-015 (javascript: URL), VN-D-001 (domain regex), VN-D-002 (IPv6), VN-D-003 (STIX), VN-D-005 (URL trailing), VN-D-006 (IMPHASH), VN-D-011 (port/CIDR)

Work Log:
- NOTA: los IDs de finding (VN-B-015, VN-D-001/002/003/005/006/011) NO existen en worklog.md ni en ningún archivo del repo (verificado con grep sobre worklog.md, agent-ctx/ y todo /home/z). Se trabajó con los detalles completos provistos en el brief de la tarea.
- Leídos los patrones seguros de LabsView.tsx:476 y GlossaryView.tsx:405 (`url.startsWith('http') ? url : 'https://' + url`) antes de tocar ReferencesView.
- VN-B-015 (ReferencesView.tsx): añadido helper module-level `safeHref()` (líneas 20-30) — trim + patrón exacto de LabsView/Glossary — y aplicado al ÚNICO anchor que renderiza URL de usuario (línea 289, `<a href={safeHref(r.url)}>`; verificado con grep que no hay más href en el archivo). `javascript:alert(1)` → `https://javascript:alert(1)` (inerte); `data:text/html,...` → prefijado (inerte); la URL entra trimada para neutralizar whitespace-leading de imports/backup.
- VN-D-001 (IocExtractorView.tsx): DOMAIN_RE relajado de `(label\.)((label\.)+)(tld)` a `(label\.){1,}(tld)` (línea 292) — ahora matchea dominios de 2 etiquetas (evil.com, pwned.io). Anti-falsos-positivos: nuevo `TWO_LABEL_TLD_SET` (líneas 128-138, 43 TLDs curados: com|net|org|io|ai|co|edu|gov|mil|int|info|biz|xyz|top|ru|cn|uk|de|fr|es|mx|ar|cl|br|us|me|tv|cc|su|is|to|sh|st|link|live|online|site|store|app|dev|cloud|tech|systems|security) aplicado SOLO a matches de 2 etiquetas en el loop de dominios (líneas 652-656) — file.txt/note.md/script.py/version 1.2 rechazados; 3+ etiquetas mantienen el comportamiento previo (isValidTLD). Integrado tras el refang (evil[.]com→evil.com matchea), dedup y whitelist intactos.
- VN-D-002 (IocExtractorView.tsx): reemplazado el regex ipv6 de 3 alternativas (truncaba `fe80::1ff:fe23:4567:890a` a `fe80::1ff`) por un regex candidato amplio con guards de lookaround (línea 251): captura la corrida maximal hex+colon con cola IPv4 opcional; cada candidato se post-valida con `isValidIpv6()` (líneas 192-237), que replica el parser de IpAnalyzerTool.tsx (parseIpv6): máximo un `::` (>=1 grupo cero), grupos 1-4 hex, cola dotted-quad = 2 grupos, forma completa = 8 grupos. Rechaza horas (12:34:56), MACs (6 grupos), `::::`, 9 grupos. IPv4-mapped `::ffff:192.168.1.1` funciona completo.
- VN-D-003 (IocExtractorView.tsx): nuevo `stixHashKey()` (líneas 465-484) — MD5→'MD5', SHA-1→'SHA-1', SHA-256→'SHA-256', SHA-512→'SHA-512' (comillas simples, casing canónico con guiones); SSDEEP/TLSH/IMPHASH/Authenticode también quedan entrecomillados (sintaxis STIX válida). Aplicado en toSTIX typeMap (línea 491): `[file:hashes.'MD5' = '...']` en vez de `[file:hashes.md5 = '...']`.
- VN-D-005 (IocExtractorView.tsx): nuevo `stripTrailingUrlPunct()` (líneas 294-314) — loop-strip de `.,;:!?'")]}»›` sobre candidatos URL en el loop de extracción (líneas 623-628); `)` se strip-ea solo mientras esté desbalanceado (cuenta de `(` < cuenta de `)`) — paréntesis balanceados se conservan. Guard extra descarta restos sin host (`http://` pelado).
- VN-D-006 (IocExtractorView.tsx): el escaneo IMPHASH se movió ANTES del loop de PATTERNS y ahora registra spans (líneas 576-588); el branch de hash saltea matches cuyo índice cae dentro de un span IMPHASH (líneas 603-605). Una línea IMPHASH rinde 1 fila consolidada (antes: 16 MD5 fragmentos + 1 IMPHASH = 17). MD5 standalone fuera del span se sigue extrayendo.
- VN-D-011 (IocExtractorView.tsx): post-validación numérica en el branch ipv4 (líneas 611-619): puerto >65535 → se recorta el sufijo (se conserva la IP); CIDR >32 → idem. Puertos/CIDRs válidos (65535, 443, /32, /0) intactos.
- VERIFICACIÓN: harness de 78 aserciones ejecutado con bun sobre la sección pura extraída VERBATIM del archivo real (refang→extracción→validación→STIX) — 78/78 PASS, incluido el caso de regresión del brief: "mimikatz. Luego exfiltró información a evil[.]com y hxxp://malware(.)com/path. Hash: 5d41402abc4b2a76b9719d911017c592. CVE-2024-3094. Contact: admin[at]test[.]com." → exactamente 5 IoCs (dominio evil.com NUEVO, URL http://malware.com/path SIN punto final, MD5, CVE, email admin@test.com) y CERO falsos positivos de "mimikatz. Luego". Tests de no-regresión (refang hxxp, whitelist, IP privada info, url binario, awskey, secret, cve) todos PASS. `bun run lint` → exit 0, 0 errores/0 warnings. Transpile-check por archivo (bun build --no-bundle): ambos archivos parsean (el ENOENT de escritura de output es un quirk del entorno que también afecta a archivos no tocados). NO se corrió typecheck/build/db (verificación central del orquestador). Temporales de test eliminados.
- CONSTRAINTS: solo se tocaron ReferencesView.tsx e IocExtractorView.tsx. Sin rewrites, sin cambios de arquitectura, sin quitar features; local-first/offline/Dexie/no-backend intactos; fix VN-012 (refang solo de patrones defanged explícitos) preservado — el texto de refang NO fue modificado y el test de regresión confirma que "mimikatz. Luego" no genera IoCs.

Stage Summary:
- Archivos tocados: src/vault/components/ReferencesView.tsx (helper safeHref + 1 anchor, +13 líneas netas), src/vault/components/IocExtractorView.tsx (helpers TWO_LABEL_TLD_SET/isValidIpv6/stixHashKey/stripTrailingUrlPunct, DOMAIN_RE relajado, ipv6 candidato+validador, loop de extracción con branches ipv4/ipv6/url/hash-span, toSTIX con hash keys citados, IMPHASH pre-scan con spans; +151 líneas netas).
- Comportamiento: (1) javascript:/data: URLs de referencias ya no ejecutan al hacer clic (stored XSS cerrado); (2) dominios de 2 etiquetas con TLD real se extraen (evil.com, pwned.io) sin inundar de file.txt/note.md; (3) IPv6 completo incluida compresión y colas IPv4 (`fe80::1ff:fe23:4567:890a` íntegro); (4) export STIX 2.1 con `[file:hashes.'MD5' = '...']` (TIPs lo aceptan); (5) URLs sin puntuación de oración colgante (respetando paréntesis balanceados); (6) IMPHASH = 1 fila consolidada; (7) puertos 0-65535 y CIDRs 0-32 validados numéricamente (sufijos imposibles recortados, IP conservada).

---
Task ID: FIX-2a
Agent: main (Z.ai Code)
Task: VN-F-021 (HIGH) — eslint tenía 28 reglas en "off" (lint era un no-op). Restaurar reglas por defecto y corregir todos los errores que salgan.

Work Log:
- Leído worklog.md (FIX-1a..1e completados) y eslint.config.mjs original: 28 reglas desactivadas.
- Reescrito eslint.config.mjs: solo 2 desviaciones documentadas — no-explicit-any a "warn" (helpers legacy) y no-unused-vars con argsIgnorePattern "^_" (convención existente del codebase). Todo lo demás = presets por defecto de next core-web-vitals + typescript.
- Primer run: 21 errores + 28 warnings. Corregidos los 21:
  * sidebar.tsx (shadcn Skeleton): Math.random en useMemo → useState initializer (canonical fix, mismo comportamiento).
  * DashboardView.tsx: 3× Date.now() durante render (react-hooks/purity) → estado nowTs (useState initializer) + intervalo de 60s que lo refresca; lastEditTime/relTime/smartDeck usan nowTs; deps actualizadas.
  * GlossaryView.tsx: sort(() => 0.5 - Math.random()) en useMemo (purity) → shuffle determinista Fisher-Yates con PRNG mulberry32 + deckSeed state; seed se bumpea al entrar a modo estudio (mismo comportamiento visible: barajado fresco por sesión).
  * 14× react/no-unescaped-entities (comillas dobles en JSX): CategoryTreeChecklist (2), GlossaryView (2), PlatformSelector (4), CommandLineAnalyzerTool (4), CvssCalculatorTool (2) → &quot;.
  * 2× prefer-const: IpAnalyzerTool coreGroups, zipBackup imageMetaById.
  * zipBackup.ts: import FlashcardStat no usado eliminado; eslint.config.mjs: vars __filename/__dirname no usadas eliminadas.
- Resultado final: 0 errores, 23 warnings (advisory: exhaustive-deps de patrones useLiveQuery||[] mayormente falsos positivos + any warnings intencionales + RichEditor dep intencional de autosave).
- Verificación: bun run lint → exit 0 (0 errores). bunx tsc --noEmit → src/ limpio (solo examples/ y skills/ con errores preexistentes ajenos). HTTP 200.

Stage Summary:
- eslint.config.mjs restaurado — lint vuelve a ser una barrera real de calidad.
- 10 archivos tocados arreglando bugs genuinos que el lint muerto ocultaba: renders impuros (Math.random/Date.now) en sidebar/Dashboard/Glossary, 14 entidades sin escapar, 2 lets innecesarios, imports muertos.
- Los 23 warnings restantes son advisory y documentados; no bloquean.

---
Task ID: FIX-2b
Agent: main (Z.ai Code)
Task: VN-F-001/002/003 (HIGH) — Performance: searchFilter lowercasing todo contentHtml por keystroke; GlossaryView recrawling contentHtml por término; tools cargados eagerly.

Work Log:
- VN-F-001 (NotesView): creado src/vault/utils/lowerTextCache.ts — factoría createLowerCache() con Map por clave que guarda el string fuente del que derivó cada lowercase (WeakMap por objeto no sirve: useLiveQuery re-emite objetos frescos). NotesView construye searchIndex (Map noteId → title+content lowercased) en useMemo([activeNotes]) con claves noteId:t / noteId:c; el filtro usa searchIndex.get(id).includes(q) — cero toLowerCase por keystroke. Además useDeferredValue(searchFilter) (React 19) para mantener el input responsivo. Semántica de matching idéntica (title OR content, self OR children).
- VN-F-002 (GlossaryView): notesUsingTerm usa la misma factoría (instancia propia del módulo) — cambiar de término ahora es un escaneo de substrings sin re-lowercasear contentHtml.
- VN-F-003 (ToolsView): los 19 componentes standalone de ./tools/ + IocExtractorView convertidos de imports estáticos a next/dynamic con { ssr: false, loading: () => <ToolChunkFallback/> } — ~11k líneas de tools + datasets salen del chunk inicial de ToolsView y se cargan al abrir cada herramienta. Props (incl. deep-links autoOpenId/onAutoOpenConsumed) pasan igual. NOTA: next/dynamic exige object literal inline en options (SWC lo analiza estáticamente) — aprendido tras un HTTP 500 con un objeto compartido lazyToolOpts; corregido repitiendo el literal por herramienta.
- Verificación: lint 0 errores; tsc src/ limpio; HTTP 200. agent-browser E2E: búsqueda de notas matchea/filtra correctamente ("searchindex" mantiene la nota, "zzzznoexiste" → "No hay apuntes en esta vista"); IP Analyzer (lazy) abre y analiza 192.168.1.10 → "Private — RFC 1918 (192.168.0.0/16)"; flashcards del glosario entran/salen sin errores; viewport móvil 375px sin overflow horizontal; recarga en frío sin errores de consola y datos persistidos (local-first intacto).

Stage Summary:
- Nuevo archivo src/vault/utils/lowerTextCache.ts (cache de lowercase por id+fuente, prune para acotar memoria).
- NotesView.tsx: searchIndex memoizado + useDeferredValue — coste por keystroke pasa de O(notas×tamaño) a O(index lookup).
- GlossaryView.tsx: notesUsingTerm con cache — cambio de término ya no recrawlea todo el HTML.
- ToolsView.tsx: 20 componentes lazy (19 tools + IocExtractorView) — chunk inicial de la vista de herramientas mucho más liviano; fallback visual "Cargando herramienta…" al abrir por primera vez.
- Sin cambios de arquitectura; UX de búsqueda instantánea preservada (deferred value, no debounce con timers).

---
Task ID: FIX-2c
Agent: main (Z.ai Code)
Task: MEDIUM restantes identificables — Error Boundary inexistente, DetailModal sin semántica de diálogo, Cron M-N/S describía mal el paso.

Work Log:
- Error Boundary: creado src/vault/components/VaultErrorBoundary.tsx (class component con getDerivedStateFromError + componentDidCatch que solo loggea local). Panel de recuperación en español: explica que IndexedDB está a salvo, muestra el mensaje de error solo en dev (NODE_ENV), botón "Recargar VaultNotes". Envolvente añadido en App.tsx alrededor de todo el árbol raíz.
- DetailModal (ToolsView): role="dialog" + aria-modal="true" + aria-label + botón cerrar con aria-label="Cerrar detalle". Los 3 call-sites (Puertos/HTTP/WinEvent) pasan label explícito ("HTTP 200 OK", "Puerto 443 / tcp", "Evento 4624 ..."). Escape-to-close: primer intento con onKeyDown en el overlay NO funcionaba (el overlay nunca recibe foco) → verificado con agent-browser y corregido a listener document-level en useEffect con cleanup. Escape verificado cierra el modal.
- Cron describeField: "10-30/5" caía en la rama de rango simple → "Rango 10-30/5" (el paso se ignoraba). Nuevo branch regex ^(\d+)-(\d+)\/(\d+)$ que enumera valores: "De 10 a 30 cada 5 minutos (10, 15, 20, 25, 30)" + branch ^(\d+)\/(\d+)$ para N/S ("Desde 10 cada 20"). La guía ya documentaba la sintaxis correcta — ahora el parser coincide con su propia documentación. Verificado en browser: "10-30/5 9 * * 1-5" → "Minuto (0-59): De 10 a 30 cada 5 minutos (10, 15, 20, 25, 30)".
- Verificación: lint 0 errores, tsc limpio, HTTP 200, agent-browser sin errores de página.

Stage Summary:
- src/vault/components/VaultErrorBoundary.tsx (nuevo) + envoltorio en App.tsx: un crash de render ya no hace pantalla blanca del PWA entero.
- DetailModal accesible: semántica de diálogo + labels explícitos + Escape funcional (listener document-level).
- Cron: M-N/S y N/S descritos correctamente y con valores enumerados (≤12).

---
Task ID: FIX-2-VERIFY
Agent: main (Z.ai Code)
Task: Verificación central post-FIX-2a/2b/2c (protocola: lint + typecheck + HTTP + agent-browser).

Work Log:
- bun run lint → exit 0, 0 errores / 23 warnings advisory.
- bunx tsc --noEmit → src/ 100% limpio (errores preexistentes solo en examples/ y skills/, ajenos a la app).
- curl / → HTTP 200; dev.log sin errores nuevos tras el fix del lazyToolOpts (los "Ecmascript file had an error" del log son de ese episodio intermedio, ya resuelto).
- agent-browser E2E (sesión completa): dashboard renderiza con contadores correctos y tiempo relativo "Justo ahora"; creación de nota vía modal funciona; búsqueda de apuntes matchea y filtra; IP Analyzer lazy carga y analiza; Cron "10-30/5" describe el paso; modal HTTP 200 con aria-label correcto y Escape que cierra; flashcards del glosario (shuffle semillado) entran/salen; viewport móvil 375px sin overflow; recarga en frío sin errores de consola; datos (1 nota + 1 término de prueba) persisten tras reload.
- Test data creada durante E2E: 1 apunte "Nota prueba searchindex" y 1 término "Zero Trust" quedan en IndexedDB del browser de test (sandbox), no afectan el repo.

Stage Summary:
- Los tres paquetes FIX-2a/2b/2c verificados end-to-end. Estado: 41 findings de la auditoría → todos los HIGH del Builder Handoff implementados (FIX-1a..1e + FIX-2a/2b) + MEDIUM clave (error boundary, a11y modal, cron, winEvents, sidRid, AMSI, httpStatus, IoC regex/IPv6/STIX, deletedAt, orphan reporting…).
- Pendiente documentado para el usuario: warnings advisory de eslint (23), y hallazgos MEDIUM restantes de menor impacto no críticos (URL race en CveSearch si existe, dedup de búsqueda global, sub-técnicas MITRE, responsive fino) — ver informe final.

---
Task ID: FIX-3d
Agent: general-purpose
Task: Responsive móvil estructural de VaultNotes — sidebar drawer en móvil, vistas multipanel apiladas (<768px), tablas/grids con scroll horizontal, clamp de useResizablePanel por viewport. Layout desktop (≥768px) intacto.

Work Log:
- Leído worklog + código: App.tsx (root flex L867-899), Sidebar.tsx, Header.tsx, PanelResizeHandle.tsx, useResizablePanel.ts, NotesView/LabsView/ToolsView/GlossaryView/BlogView (regiones de layout), LogParserTool/RbacAnalyzerTool/CvssCalculatorTool (tablas/grids). Confirmados los 11 hallazgos de la auditoría.
- A) Sidebar.tsx: extraído el contenido interno a `sidebarContent`; escritorio pasa a `hidden md:flex w-[200px] ...` (idéntico ≥768px); nuevo drawer móvil `fixed inset-y-0 left-0 z-50 w-[260px] max-w-[85vw] bg-[#0D0D0D] border-r md:hidden` con backdrop `fixed inset-0 z-[45] bg-black/50 md:hidden` (z-45 para cubrir el Header z-40 sin tapar los modales z-50), role="dialog" aria-modal aria-label="Menú de navegación". Props nuevas opcionales `open`/`onClose`.
- A) App.tsx: estado `mobileSidebarOpen`; Sidebar recibe open/onClose y su onSelectSection cierra el drawer al navegar; Header recibe `onOpenMobileSidebar`.
- A) Header.tsx: botón hamburguesa (icono Menu, `md:hidden p-3` → touch target 44px, aria-label="Abrir menú de navegación"); header `gap-2`; acciones `gap-2 sm:gap-3 flex-wrap justify-end min-w-0`; textos "Guardar Backup"/"Importar"/"Online" bajo `hidden sm:inline` (mismo patrón que "Capturar"); buscador con `min-w-0`, placeholder "Buscar..." en móvil + truncate, badge ⌘K `hidden sm:inline`; botones `shrink-0` y Nuevo con `whitespace-nowrap`.
- B) useResizablePanel.ts: reescrito con `baseWidth` (persistido) + clamp `window.innerWidth * 0.45` aplicado en mount y re-aplicado con listener `resize` (con cleanup, sin hydration mismatch al inicializar en Infinity); `startDrag` ignora drags si `!matchMedia('(min-width: 768px)').matches`. Interfaz pública {width, startDrag, reset} sin cambios.
- B) PanelResizeHandle.tsx: `hidden md:block` (los 5 usos son vistas que apilan en móvil; escritorio idéntico).
- B) Patrón por vista (raíz `flex flex-col md:flex-row` + `overflow-y-auto md:overflow-hidden`; laterales `w-full md:w-[var(--panel-w)]` vía CSS var inline en vez de width px — evita que el estilo inline pise el apilado móvil; `border-b md:border-b-0 md:border-r`; principal `flex-none md:flex-1` + `h-auto md:h-full`):
  - NotesView: plataformas max-h-[30vh] (lista vertical, opción simple robusta), lista notas max-h-[40vh] (scroll interno), editor altura natural.
  - LabsView: filtros max-h-[45vh], lista labs max-h-[40vh], editor natural.
  - GlossaryView: términos max-h-[40vh] + detalle natural; banner con flex-wrap/min-w-0.
  - BlogView: selector max-h-[40vh] + preview natural; banner con flex-wrap/min-w-0.
  - ToolsView: fila interna `flex-col md:flex-row` con scroll; lista tools max-h-[45vh] + scroll interno; panel tool `flex-none md:flex-1`; banner con flex-wrap y buscador `w-full sm:w-72`.
- C) LogParserTool: wrapper de tabla `overflow-x-auto overflow-y-auto` + tabla `min-w-[640px]` (patrón SidRidAnalyzer). RbacAnalyzerTool: matriz wrapper `overflow-x-auto`; celda nombre de rol `break-words min-w-[100px]`. CvssCalculatorTool escala y guía cron de ToolsView: `grid-cols-2 sm:grid-cols-5`.
- Verificación runtime con agent-browser a 375×667: sidebar fuera del flujo (main 375px), header sin overflow-x, drawer abre (260px, backdrop, cierra al navegar), Tools/Notes/Labs/Glossary/Blog apilados full-width sin overflow horizontal, tabla Log Parser con scroll-x (min-w 640), grids CVSS/cron a 2 columnas (celdas 149px). A 1280×800: sidebar 200px, paneles laterales 220/320/240/330px + handles 4px + editores flex-1 (desktop idéntico), drag-resize funcional y persistido (vault-glossary-list-w 420). Anchos persistidos de escritorio (560/380) recargados a 375px → paneles full-width sin overflow (clamp OK).
- `bun run lint` → 0 errores (23 warnings preexistentes, ninguno en código tocado). `bunx tsc --noEmit` → 0 errores en src/ (solo 5 preexistentes en examples/, skills/, src/lib/db.ts). `curl /` → 200. dev.log limpio.

Stage Summary:
- La app es usable a 375px: navegación por drawer hamburguesa, las 5 vistas multipanel se apilan (listas con max-h y scroll interno, editor/panel principal a altura natural con scroll del contenedor de vista), tablas de 6 columnas con scroll horizontal y grids legibles.
- useResizablePanel ya no rompe sesiones móviles con anchos persistidos de escritorio (clamp 45% viewport + re-clamp en resize) y el drag queda limitado a ≥768px (handle oculto en móvil).
- Layout desktop verificado idéntico (mediciones a 1280×800 en las 5 vistas + drag/persistencia funcionales); no se tocó CveSearchTool.tsx ni fuzzySearch.ts; sin cambios de lógica de negocio, Dexie ni dependencias nuevas.
- Archivos tocados: src/vault/App.tsx, src/vault/components/Sidebar.tsx, src/vault/components/Header.tsx, src/vault/components/PanelResizeHandle.tsx, src/vault/hooks/useResizablePanel.ts, src/vault/components/NotesView.tsx, src/vault/components/LabsView.tsx, src/vault/components/ToolsView.tsx, src/vault/components/GlossaryView.tsx, src/vault/components/BlogView.tsx, src/vault/components/tools/LogParserTool.tsx, src/vault/components/tools/RbacAnalyzerTool.tsx, src/vault/components/tools/CvssCalculatorTool.tsx.

---
Task ID: FIX-3a
Agent: main (Z.ai Code)
Task: Race condition en CveSearchTool — respuesta lenta antigua podía pisar el resultado de una búsqueda más nueva (vía "Re-search online" en filas guardadas, única vía sin guard de solape).

Work Log:
- Investigación previa (agente Explore): runSearch seteaba estado tras await SIN guard (sin AbortController/requestId/isMounted); disparadores Enter y botón "Search Online" ya estaban blindados con `searching`, pero el botón "Re-search online" de cada SavedCveRow NO respetaba `searching` → dos requests solapados y el último en LLEGAR (no el último en lanzarse) ganaba el setResult, dejando input y card inconsistentes.
- CveSearchTool.tsx: añadido `searchSeqRef = useRef(0)` (guard monotónico). runSearch captura `const seq = ++searchSeqRef.current` antes del await; tras resolver (success, catch y finally) verifica `seq === searchSeqRef.current` antes de escribir setResult/setSearching — solo la búsqueda MÁS NUEVA puede escribir estado; la vieja se descarta completa (incluido el apagado del spinner, que queda a cargo de la request vigente).
- SavedCveRow: nuevo prop opcional `busy` — botón "Re-search online" ahora `disabled={busy}` con `disabled:opacity-50 disabled:cursor-not-allowed` y RefreshCw con `animate-spin` mientras busca; call-site pasa `busy={searching}`. Doble defensa: UI previene el solape, el guard lo resuelve si ocurre por otra vía.
- Comentarios en inglés (consistencia con el archivo). Sin cambios en searchCveOnline/fetchWithTimeout (el AbortController interno de timeout sigue igual).

Stage Summary:
- Race de stale-response cerrada: imposible que una respuesta vieja sobreescriba una búsqueda más reciente.
- "Re-search online" deshabilitado (con spinner) mientras vuela una búsqueda — feedback visual añadido.

---
Task ID: FIX-3b
Agent: main (Z.ai Code)
Task: Dedup de búsqueda global — la misma herramienta aparecía 2 veces en Ctrl+K (fila "Abrir X" de command palette + fila "X" del catálogo de herramientas, ids distintos cmd-open-X vs tool-X).

Work Log:
- Investigación previa: el merge deduplicaba por doc.id (string), pero la misma tool entraba al corpus bajo 2 formas (buildCommandDoc → `cmd-open-${toolId}` con commandId `open-tool:${toolId}`; buildToolDoc → `tool-${toolId}`). Query "hash" producía 4 filas para 2 herramientas.
- fuzzySearch.ts (tras `rawResults = mergedRaw.slice(0, 30)`): dedup por DESTINO LÓGICO — se coleccionan los toolIds presentes como doc de catálogo (`type === 'tool'`) y se filtran los comandos cuyo commandId `open-tool:X` apunta a una herramienta que ya está en resultados. La fila de CATÁLOGO sobrevive (mejor bucket de título-match porque su título ES el nombre, y snippet descriptivo); el comando redundante se elimina.
- Comandos sin contraparte (new-note, quick-capture, open-tool de tools que no matchearon) NO se ven afectados. La rama de query vacío (top-6 comandos) no contiene tool docs → sin cambios. Filtros type:/tag: intactos.
- E2E con agent-browser: query "powershell" → 1 sola fila "PowerShell Analyzer" (Herramienta), "Abrir PowerShell Analyzer" AUSENTE; query "hash" → exactamente 2 filas ("Hash Toolkit" + "File Hash Analyzer"), antes 4. Click en resultado navega y abre la tool (deep-link intacto).

Stage Summary:
- fuzzySearch.ts: mismo destino nunca listado 2 veces — la búsqueda global queda consistente (1 fila por herramienta).

---
Task ID: FIX-3c
Agent: main (Z.ai Code)
Task: Verificación del hallazgo "sub-técnicas MITRE" — determinar si requiere fix.

Work Log:
- Investigación (agente Explore, solo lectura): grep de `attack.mitre.org` en todo src/vault/ → solo 3 generadores de URL (PowerShellAnalyzerTool L374-381, MitreExplorerTool L72-79, CommandLineAnalyzerTool L283-291). Los TRES convierten punto→slash correctamente: `T1059.001` → `https://attack.mitre.org/techniques/T1059/001/` (formato canónico ATT&CK). Regexes ejecutadas en node contra T1059.001, T1562.001, T1003.001, T1027, T1548.002, T1595.003 — todas correctas.
- Cross-links internos (SigmaExplorer, WinEventTool, DetectionQueryHelper) aterrizan en findMitreById (mitreData.ts) que resuelve sub-técnica → técnica padre y abre el detalle del padre con la sub-técnica listada dentro. Correcto.
- Únicos residuos cosméticos: fallback ante id malformado difiere levemente entre los 3 archivos y el helper está triplicado (riesgo de deriva futura). NO se unifica: cambio cosmético que toca 3 archivos estables sin beneficio de comportamiento, contra la restricción de no reescribir sin necesidad.

Stage Summary:
- Hallazgo NO reproducible: los enlaces MITRE con sub-técnicas ya son correctos en el código actual. Cerrado como "verificado correcto, sin fix requerido".

---
Task ID: FIX-3d
Agent: general-purpose (full-stack-developer)
Task: Responsive móvil estructural — a 375px la app era inutilizable (sidebar fija 200px + paneles laterales shrink-0 colapsaban el contenido principal a 0px; tablas y grids fijos).

Work Log:
- Ver investigación detallada en la entrada FIX-3d escrita por el subagent (13 archivos tocados): sidebar como drawer móvil con hamburguesa en Header (desktop idéntico, `hidden md:flex`), vistas multipanel (Tools/Notes/Labs/Glossary/Blog) apiladas bajo md con scroll vertical (`flex-col md:flex-row`, `overflow-y-auto md:overflow-hidden`), paneles con max-h y scroll interno en móvil, useResizablePanel con clamp al 45% del viewport + drag solo ≥768px, Header con flex-wrap y labels ocultos bajo sm, tablas LogParser/RBAC con overflow-x-auto, grids CVSS/cron `grid-cols-2 sm:grid-cols-5`.
- Técnica clave: ancho resizable persistido vía CSS var inline `--panel-w` + `md:w-[var(--panel-w)]` — el estilo inline no pisa el `w-full` del apilado móvil.

Stage Summary:
- 13 archivos tocados; móvil 375px usable de extremo a extremo (drawer, vistas apiladas, tablas scrollables); desktop 1280px verificado idéntico al estado previo.

---
Task ID: FIX-3-VERIFY
Agent: main (Z.ai Code)
Task: Verificación central final post-FIX-3a/3b/3c/3d (protocolo: lint + typecheck + HTTP + agent-browser E2E desktop y móvil).

Work Log:
- bun run lint → exit 0: 0 errores / 23 warnings advisory (preexistentes, documentados: exhaustive-deps de patrones useLiveQuery||[] mayormente falsos positivos + any intencionales en helpers legacy; ninguno en código tocado esta ronda).
- bunx tsc --noEmit → src/vault/ 100% limpio (5 errores preexistentes en examples/, skills/ y src/lib/db.ts, ajenos a la app).
- curl / → HTTP 200; dev.log limpio durante toda la sesión (solo GETs 200).
- agent-browser E2E (1280×800 y 375×667, 0 errores de consola):
  * Búsqueda global: "powershell" → 1 fila "PowerShell Analyzer" (dedup OK, comando suprimido); "hash" → exactamente 2 filas (Hash Toolkit + File Hash Analyzer, antes 4); click en resultado → deep-link abre la tool (heading + input visibles).
  * CVE Search: renderiza (input CVE-2025-12345 + Search Online), lazy-load OK, sin errores.
  * Móvil 375px: hamburguesa "Abrir menú de navegación" visible; drawer abre → navegación a Apuntes funciona y CIERRA el drawer; vistas apiladas full-width; scrollWidth = 375 (cero overflow horizontal); botón "Nuevo Apunte" y buscador accesibles.
  * Desktop 1280px: sidebar 200px, vista Apuntes con paneles normales — layout intacto.
- Browser cerrado al finalizar.

Stage Summary:
- Los 4 pendientes de la auditoría (race CveSearch, dedup búsqueda, sub-técnicas MITRE, responsive) CERRADOS: 2 con fix (3a, 3b), 1 verificado-no-reproducible (3c), 1 con fix estructural verificado (3d, vía subagent).
- Estado FINAL de la auditoría de 41 hallazgos: todos los HIGH y MEDIUM accionables implementados; restan solo los 23 warnings advisory de eslint (documentados, no bloqueantes) y las mejoras cosméticas opcionales (unificar helper mitreUrl triplicado).
