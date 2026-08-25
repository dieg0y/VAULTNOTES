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
