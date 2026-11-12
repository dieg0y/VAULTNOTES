# R2 — Refactor de zipBackup/backupSchemas (+ mimeMaps) — Registro de trabajo

**Task ID:** R2 · **Agente:** refactor engineer (senior) · **Fecha:** 2026-11 (post-audit)
**Alcance (solo estos archivos):** `src/vault/utils/zipBackup.ts`, `src/vault/utils/backupSchemas.ts`, `src/vault/utils/mimeMaps.ts` (NUEVO), `src/vault/utils/remoteImages.ts` (solo dedupe MIME_EXT).

> Registro para agentes posteriores: leer ANTES de tocar zipBackup.ts / backupSchemas.ts / mimeMaps.ts.
> Los registros previos en `agent-ctx/` fueron eliminados del working tree antes de esta tarea (no había nada que leer).

---

## 1. Cambios realizados (todos con comportamiento preservado, comentarios en español, estilo del archivo)

### E1 — CORRECCIÓN CRÍTICA (manifest corrupto) — zipBackup.ts
- **Problema:** en `importVaultBackup`, el try/catch de lectura del manifest reseteaba `zipContents = null` y caía al importador regular para CUALQUIER error que no fuera `IncompatibleBackupError`/`ZipSafetyError` — incluido un `manifest.json` presente pero ilegible. Resultado: el backup se importaba SIN ningún check de schemaVersion/formatVersion.
- **Fix:** flag local `manifestPresent` (set a `true` en cuanto `zipContents.file('manifest.json')` existe). En el catch:
  - manifest PRESENTE pero con error de lectura/parseo → `throw new IncompatibleBackupError(undefined, undefined, <mensaje español>)` (rechazo up-front, no-partial-import).
  - manifest AUSENTE → camino legacy intacto (`zipContents = null`, como antes).
  - fallo de `loadAsync` (no-ZIP renombrado) → mismo fallback de siempre.
- **`IncompatibleBackupError`:** se añadió un TERCER parámetro de constructor OPCIONAL `customMessage?: string` (aditivo, retrocompatible: los 2 callers existentes no cambian; `super(customMessage ?? <mensaje estándar>)`). App.tsx sigue funcionando con `instanceof` sin cambios.
- Comentario de la segunda puerta `validateZipSafety` actualizado (ya no existe el caso "manifest read failure que reseteaba zipContents").
- **Happy path sin cambios** (verificado en runtime, ver §5).

### P2 — Lecturas paralelas en `buildVaultZipBlob`
- Las 23 lecturas secuenciales (`await db.*.toArray()` + `getAllPdfEntries()`) → UNA `const [ ... ] = await Promise.all([...])`. Mismos nombres, mismo orden, mismos comentarios (movidos inline junto a cada lectura en el array). Todas eran independientes (volcados de tablas sin dependencias entre sí).

### P4 + 1d — Dedupe de mapas MIME (NUEVO `mimeMaps.ts`)
- `mimeMaps.ts` exporta `MIME_TO_EXT` (10 entradas) y `EXT_TO_MIME` (10 entradas, incluye alias `jpeg`).
- Origen de las 3 copias: zipBackup export (`mimeToExt`, 8), zipBackup import loop (`mimeByExt`, 9, ¡se reconstruía DENTRO del loop por imagen!), remoteImages (`MIME_EXT`, 10).
- **Conflictos de valor (misma clave, distinto valor): CERO.** Las 8 claves compartidas coincidían exactamente.
- Claves que solo existían en la copia de remoteImages y ahora aplican también a zipBackup: `'image/vnd.microsoft.icon'` y `'image/tiff'` (+ `tiff` en EXT_TO_MIME). Ver §4 (nuance).
- zipBackup: ambas copias locales eliminadas; usa `MIME_TO_EXT` (export) y `EXT_TO_MIME` (import, hoisted fuera del loop). remoteImages: importa `MIME_TO_EXT` (1 sola referencia; se actualizó en vez de alias).

### 1f — Factoría roadmap ×4 — zipBackup.ts
- Helper local `importRoadmapTable(file, table: Table<RoadmapItem,string>, onConflict, label)` dentro de `importVaultBackup`. Los 4 bloques (roadmap / roadmapHelpDesk / roadmapSysAdmin / roadmapSoc) eran IDÉNTICOS salvo tabla/contador/etiqueta — cero deltas reales. Semántica exacta preservada: guard latest-wins (`rowTs`), literal de reconstrucción de 4 campos, contador de conflictos, try/catch con `console.error('Error importing X:')` (string idéntico vía label), y las filas inválidas se descartan SIN contar en invalidMisc (igual que los originales).

### 1f — Factoría tickets ×4 — zipBackup.ts
- Helper local `importTicketTable<R extends TicketRowBase, T extends Hd|Sa|Soc|Iam Ticket>(file, table: Table<T,string>, schema: z.ZodType<R>, opts {hasEnvironment, onConflict, label})`.
- Único delta real entre los 4 bloques: HelpDesk NO tiene `environment` (SysAdmin/SOC/IAM sí, cada uno con su enum). Parameterizado con `opts.hasEnvironment`; el spread condicional `...(hasEnvironment ? { environment: r.environment } : {})` conserva la posición del campo en el literal.
- Preserva: ternario de status, literal de 26/27 campos, contadores (conflictXxxTickets + invalidMisc), try/catch con label.
- Interfaz module-level `TicketRowBase` (frente a `importVaultBackup`) tipa el output común de los 4 schemas; el parámetro `schema` es el schema Zod del pilar (como pedía la tarea). UN cast `row as T` documentado (los 4 tipos de ticket son incompatibles en `environment`).

### 1e — Factoría schemas — backupSchemas.ts
- `const ticketSchema = <const Types extends readonly [string, ...string[]]>(types) => z.object({...26 campos comunes...}).passthrough()` + `.extend({ environment: z.enum([...]) })` en sysadmin/iam/soc.
- **Desviación del sketch (reportada):** el sketch pedía `(types, environments) => z.object({...common, environment?...})`. Un spread condicional del campo en el literal compartido hace que zod 4 infiera `environment` como opcional/desconocido en el OUTPUT (verificado empíricamente con sonda de tipos) y rompería la preservación de tipos. `.extend()` preserva el catchall `.passthrough()` (verificado en runtime y en el .d.ts de zod 4.6.7) y produce output/input types IDÉNTICOS a los originales (verificado con sonda: helpdesk sin clave fantasma; sysadmin con environment requerido y union literal exacto).
- Los 20 exports de backupSchemas.ts conservan nombre y tipos de consumo. Orden interno de claves del shape cambia (environment pasa al final) — irrelevante para zod (validación por clave).

### Limpieza — zipBackup.ts
- Eliminado el no-op `delete update.isDeleted;` en `upsertNote` (el literal de update nunca contiene isDeleted; en upsertTerm/upsertLab el spread `{...valid}` SÍ lo arrastra y se conservan). Comentario explicativo dejado in situ.
- `writeFileToAppFolder(BACKUP_FILENAME, blob).catch(() => false)` → `.catch((err) => { console.warn('Escritura en carpeta de la app falló (se usará descarga):', err); return false; })`.

### NO hecho (correcto): zipBackup.ts sigue siendo UN solo módulo (decisión previa); no se split-eó.

---

## 2. Export surface (grep de callers antes de tocar firmas)

- zipBackup.ts exports (los 5, intactos): `IncompatibleBackupError`, `ZipSafetyError`, `buildVaultZipBlob`, `exportVaultZip`, `importVaultBackup`. Callers: App.tsx (dynamic import, usa `instanceof` de ambas clases), autoBackup.ts (dynamic import de buildVaultZipBlob + importVaultBackup). `BACKUP_FILENAME` y `parseMarkdownWithFrontmatter` NO eran export en el original y siguen sin serlo.
- backupSchemas.ts: 19 schemas + `validateArray` intactos (solo cambia la implementación de los 4 de tickets). Único consumidor: zipBackup.ts.

## 3. MIME maps — detalle del merge

`MIME_TO_EXT` = union de zipBackup-export ∪ remoteImages (10 entradas). `EXT_TO_MIME` = inverso + alias `jpeg` (10 entradas). Cero conflictos de valor entre copias.

## 4. Nuance de comportamiento (DELIBERADO, consecuencia del merge pedido)

- Con el merge, una imagen del vault con mimeType `image/tiff` ahora se exporta como `<id>.tiff` (antes: fallback `.png`) y un archivo `.tiff` de un backup legacy se restaura como `image/tiff` (antes: fallback `image/png`). Igual para `image/vnd.microsoft.icon` → `.ico`. Antes el round-trip de TIFF era lossy (mal etiquetado como png); ahora es fiel. Si se exige preservación bit-a-bit del fallback, quitar esas 2 claves + `tiff` de mimeMaps.ts y las 3 copias vuelven a divergir (no recomendado).

## 5. Verificación

- `bunx tsc --noEmit` → **0 errores en TODO el proyecto** (no solo mis 4 archivos).
- `bun run lint` → limpio (0 errores/advertencias).
- Dev server :3000 → `GET / 200` tras los cambios (sin errores de compilación en dev.log).
- Sondas runtime (bun eval, sin archivos de test en el repo):
  - 15/15 checks de los schemas refactorizados (enums por pilar, environment requerido en SA/SOC/IAM e ignorado en HD, passthrough, validateArray).
  - 6/6 checks E1: manifest corrupto/vacío → IncompatibleBackupError con mensaje español nuevo; schemaVersion 999 / formatVersion 9.0.0 → mensaje estándar (igual que antes); manifest válido y sin manifest → pasan el gate (llegan al acceso a IndexedDB, que es lo esperado fuera del browser).
  - Carga del módulo zipBackup en bun OK; `IncompatibleBackupError` con 2 y 3 args OK.
- Archivo de sonda temporal `scratch-r2.ts` creado solo para diseño de tipos y ELIMINADO.

## 6. Métricas

- zipBackup.ts: 2185 → 2130 líneas (neto −55). backupSchemas.ts: 466 → 401 (−65). remoteImages.ts: 354 → 346 (−8). mimeMaps.ts: +46. **Neto total: −82** pese a ~90 líneas nuevas de comentarios R2 + TicketRowBase (36) + fix E1.
- Duplicación ELIMINADA: ~120 (schemas) + ~205 (bloques tickets) + ~92 (bloques roadmaps) + ~19 (mapas MIME) ≈ **~436 líneas de copia-pega** → 2 helpers + 1 factoría + 1 módulo de mapas.
