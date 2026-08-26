# BLOQUE5-F — Add to Note selector (new vs existing)

## Agent
- full-stack-developer

## Task
Refactor del flujo "Add to Note" para permitir al usuario elegir entre crear una nota nueva o añadir el contenido a una nota existente.

## Files modified
- `src/vault/App.tsx` (956 → 1009 líneas)
  - Eliminado `useEffect` que auto-creaba la nota al setearse `pendingNote`.
  - Añadido `isAddToNoteOpen` (derived de `pendingNote !== null`).
  - Añadidos `handleCreateNewNote`, `handleAppendToExistingNote`, `handleCloseAddToNote`.
  - Render `<AddToNoteModal />` en la sección de modales globales.
  - Import `AddToNoteModal`.
- `src/vault/store/noteStore.ts` (35 → 45 líneas)
  - Firma de `enqueueNote(title, contentHtml)` PRESERVADA (no breaking).
  - Solo se actualizó el docstring para reflejar la nueva semántica.
  - `clearPending` method sin cambios.

## Files created
- `src/vault/components/AddToNoteModal.tsx` (236 líneas)
  - Props: `isOpen`, `onClose`, `pendingAdd`, `onCreateNewNote`, `onAppendToExistingNote`.
  - Pattern wrapper: retorna null cuando `!isOpen || !pendingAdd`.
  - Internal state: `mode: 'choose' | 'pick'`, `search: string`.
  - Lista via `useLiveQuery(() => db.notes.filter(n => !n.isDeleted).toArray(), [], [])`.
  - Sort: parents first, alpha por `title.localeCompare`.
  - Filtro case-insensitive substring sobre title.
  - Preview HTML stripped + `line-clamp-3`.
  - Estilo visual idéntico a `QuickCaptureModal` (dark #0A0A0A + blue accent).

## Files NOT touched (verified via git diff)
Los 13 tool callers:
- `ToolsView.tsx` (WinEventTool inline) — diff previo de BLOQUE5-E, sin tocar enqueueNote
- `tools/MitreExplorerTool.tsx`
- `tools/SigmaExplorerTool.tsx`
- `tools/DetectionQueryHelperTool.tsx`
- `tools/PowerShellAnalyzerTool.tsx`
- `tools/CommandLineAnalyzerTool.tsx`
- `tools/LogParserTool.tsx`
- `tools/SidRidAnalyzerTool.tsx`
- `tools/LdapDnParserTool.tsx`
- `tools/RbacAnalyzerTool.tsx`
- `tools/CvssCalculatorTool.tsx`
- `tools/FileHashAnalyzerTool.tsx`
- `tools/LinuxPermissionsTool.tsx`

## Lint
- `bun run lint` → 0 errors, 0 warnings (clean).

## Dev log
- 0 errors tras los cambios. Compilaciones 186-522ms. `GET / 200` en 29-151ms.

## Decisiones
- `pendingAdd` se pasa como `pendingNote` directamente (sin clone) — App lo consume de zustand.
- Append usa separador `<hr/>` + heading `<h2>{title}</h2>` para navegabilidad en RichEditor (soporta H2).
- Si la nota target no existe entre el render del modal y el click (race con delete), warn non-fatal + cierre limpio sin crash.
- El toast "added" local de cada tool (2s) sigue disparándose cuando el tool llama `enqueueNote` — el modal abre después, no interfiere con ese feedback.

## Open questions
- Ninguna. Spec claro, implementación directa.
