# R1 — Refactor de stores + seeds de db/index.ts (VaultNotes)

Task ID: R1 · Ámbito: `src/vault/store/{iam,soc,sysadmin,helpdesk}Store.ts`, NEW `store/createTicketSelectionStore.ts`, `db/index.ts`, NEW `data/profileSeeds.ts`, `integrations/online.ts` (solo comentarios). Ningún otro archivo tocado.

## Cambios realizados

### 1. Fábrica de stores (patrón idéntico x4)
- NEW `src/vault/store/createTicketSelectionStore.ts`: exporta `TicketSelectionStore` (contrato idéntico: `selectedTicketId` / `selectTicket` / `clearSelectedTicket`) + fábrica `createTicketSelectionStore()` con doc compartida en español (hub de selección consumido por cada vista con 3 selectores atómicos + deep-links Ctrl+K de App.tsx vía `getState()`).
- Los 4 stores son ahora wrappers de 1 línea: `export const useIamStore = createTicketSelectionStore();` etc. Nombres de export idénticos; doc de dominio conservada (tabla Dexie + rango de seeds + LIMPIEZA V13) + nota R1.
- Compatibilidad verificada: App.tsx (getState().selectTicket) y las 4 vistas (3 selectores atómicos) compilan sin cambios — tsc 0 errores.

### 2. db/index.ts — deduplicación de seeds
- NEW helpers `seedRoadmap(table, allIds, label)` y `seedTickets(table, seeds, domain, dismissed, label)` (~L772-861), tipados con `Table` de Dexie. seedTickets usa `TicketRow`/`TicketSeedOf<T>` (Omit de los 6 campos operacionales) + un único cast `as T[]` documentado. Mismos console.warn (`${label} seed skipped:`), mismos labels ('Roadmap', 'HelpDesk roadmap', 'SysAdmin roadmap', 'SOC roadmap', 'HelpDesk tickets', 'SysAdmin tickets', 'SOC tickets', 'IAM tickets').
- Los 8 bloques (4 roadmap + 4 tickets) reemplazados por llamadas de 1-7 líneas en el MISMO orden original (roadmap IAM→HD→[HD tickets]→SA→SOC; tickets HD→SA→SOC→IAM).
- NEW `src/vault/data/profileSeeds.ts` (306 líneas): `IAM_SEED_PROFILE`, `HELPDESK_SEED_PROFILE`, `SYSADMIN_SEED_PROFILE` tipadas `Omit<ProfileDoc, 'createdAt' | 'updatedAt'>` — createdAt/updatedAt se estampan en el seeding (igual que antes). Copia verificada programáticamente byte-a-byte (script de comparación por líneas: 87/92/98 MATCH). db/index.ts importa y siembra con las mismas guardas y orden.
- BUG FIX v22 upgrade (~L493): `await db.labs.bulkDelete(...)` (db GLOBAL dentro de .upgrade() — inseguro, deadlock posible mid-open) → `await tx.table('labs').bulkDelete(SEEDED_LAB_IDS)` con catch no-op conservado y lista de 9 ids intacta.
- Guardas nuevas (try/catch + `console.warn('<label> skipped:', err)`) en: migración lab.commands ('Lab commands migration skipped:'), platforms ('Platforms seed skipped:'), tools ('Tools seed skipped:'), categorías legacy-cleanup+master ('Categories migration skipped:').
- lab.commands: N `db.labs.update` → recolección de filas migradas + UN `bulkPut` (patrón AUDIT VN-A-005; solo cambia `commands`, `updatedAt` de fila se conserva).
- Hoist dismissal: `loadDismissedSeedIds()` UNA vez al inicio de `doInitializeDatabase` → `dismissedSeedIds`; `isSeedIdDismissed(dismissed, domain, id)` ahora recibe el Set (antes ~204 JSON.parse por boot). `loadDismissedSeedIds` se conserva (la usa `dismissSeedId`, exportada y llamada desde App.tsx/ProfileView.tsx).
- Comment fix ~L481: "v9: SOC + LABS VACÍO" → "v22: SOC + LABS VACÍO" (la referencia interna "spec V9 Phase 1" se mantiene — es de la spec de feature, no de schema).
- Historial `version()` (v1→v25) INTACTO salvo el fix del upgrade v22 (tx) y su comentario.

### 3. online.ts — solo comentarios
- Header reescrito: solo `useIsOnline` se exporta; `isOnline()` es privado (semilla el estado inicial del hook); único consumidor desde v25: HdTicketTriageTool (early-exit antes de fetch). Eliminadas las menciones de providers e indicador del Header (retirados en v25).
- Doc de `isOnline()` actualizada (mencionaba "providers" — ya no existen). Código sin cambios.

## Export públicos preservados (idénticos)
`db`, `CURRENT_SCHEMA_VERSION`, `initializeDatabase`, `dismissSeedId`, `dismissSeedTerm`, `countCategoryUsage`, `countToolUsage`, `RbacModel`, `ToolFavorite`, `ToolRecent`, `InboxItem` + `useIamStore`/`useSocStore`/`useSysadminStore`/`useHelpdeskStore` (mismo contrato estructural).

## Verificación
- `bunx tsc --noEmit`: 0 errores en TODO el proyecto (incluye mis archivos).
- `bun run lint`: sin output (limpio).
- dev.log (puerto 3000, hot reload): GET / 200 tras los cambios, sin errores de compilación.
- Desviaciones menores: (a) `seedTickets` lleva un 5º parámetro `dismissed` (hoist 2g lo exige); (b) profileSeeds usa `Omit<ProfileDoc,'createdAt'|'updatedAt'>` en vez de `ProfileDoc` completo porque las fechas se estampan al sembrar (mismo comportamiento); (c) también se corrigió el doc comment de `isOnline()` (misma razón de staleness que el header).
