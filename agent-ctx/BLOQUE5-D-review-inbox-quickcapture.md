# BLOQUE5-D — Review System + Quick Capture + Inbox

Task ID: **BLOQUE5-D**
Agent: full-stack-developer (Review+Inbox+QuickCapture)

## Scope
Implemented spec items #15, #16, #17 for VaultNotes Bloque 5:
- **#15 Review System**: "Revisar después" toggle on note/lab/glossary headers + Review Queue view (pending → reviewed → +7d).
- **#16 Quick Capture**: Ctrl+Shift+Q opens a tiny modal → writes plain text to the `inboxItems` Dexie table.
- **#17 Inbox view**: list of unorganized items with convert-to-note / convert-to-glossary / convert-to-reference / mark-as-task / delete actions.

## Files Created
- `src/vault/components/ReviewView.tsx` — list of pending review items grouped by itemType (note/lab/glossary), with [Abrir] [Marcar Revisado (+7d)] [Quitar de la cola] actions, plus a collapsible "Revisados" section.
- `src/vault/components/InboxView.tsx` — list of inbox items with truncate-to-3-lines, Task/Converted badges, "Mostrar convertidos" toggle, and the 5 actions (Note/Glossary/Reference/Task toggle/Delete).
- `src/vault/components/QuickCaptureModal.tsx` — tiny overlay (max-w-md), autofocus textarea, Ctrl+Enter saves, ESC closes, 700ms green confirmation before close. Mounts fresh on every open (wrapper returns null when closed).

## Files Modified
- `src/vault/types/index.ts` — extended `ActiveSection` union to include `'review' | 'inbox'`.
- `src/vault/components/tools/_shared.tsx` — added `addToReviewQueue(itemType, itemId)` helper (dedupes on pending itemId, +2 day nextReviewAt).
- `src/vault/components/Sidebar.tsx` — added two new nav items (`Inbox` after Configuración, `Revisión` after Referencias) with count badges via `useLiveQuery`. Added `db` + `useLiveQuery` imports + `ListChecks`/`Inbox` icons.
- `src/vault/components/Header.tsx` — added optional `onOpenQuickCapture` prop + a "Capturar" button (with `Zap` icon) wired to it.
- `src/vault/components/NewItemModal.tsx` — added optional `initialContent?: string` prop that prefills the title field of the active tab (`noteTitle` / `labTitle` / `term`).
- `src/vault/components/Editor/RichEditor.tsx` — added "Revisar después" button next to the favorite star in the note header; uses `addToReviewQueue('note', note.id)` + 2s inline toast.
- `src/vault/components/LabsView.tsx` — added "Revisar después" button next to the favorite star in the `LabDetailEditor` header; uses `addToReviewQueue('lab', lab.id)` + 2s inline toast.
- `src/vault/components/GlossaryView.tsx` — added "Revisar después" button before the trash button in the term header; uses `addToReviewQueue('glossary', currentTerm.id)` + 2s inline toast.
- `src/vault/App.tsx`:
  - Imports: added `ReviewView`, `InboxView`, `QuickCaptureModal`.
  - State: added `newItemContent` (string), `pendingInboxConvert` ({inboxItemId, targetType} | null), `isQuickCaptureOpen` (boolean).
  - Keyboard: extended the global shortcut effect to also catch Ctrl+Shift+Q → `setIsQuickCaptureOpen(true)`.
  - `handleCreateNote`: after `db.notes.add(...)`, if `pendingInboxConvert?.targetType === 'note'`, marks the inbox item as `convertedTo='note'` + `convertedAt=now`, then clears both pending state and `newItemContent`.
  - `handleCreateGlossaryTerm`: same pattern for `'glossary'`.
  - Added `handleConvertInboxItem(content, inboxItemId, targetType)` — truncates content to 80 chars, sets tab+content+pending state, opens modal.
  - Added `handleCloseNewItem` wrapper that clears pending state + content + `isNewItemOpen`.
  - Rendered `<ReviewView>` and `<InboxView>` for the new sections.
  - Rendered `<QuickCaptureModal isOpen=... onClose=.../>` at the end.
  - Updated `<NewItemModal>` usage: added `initialContent={newItemContent}` prop and `${newItemContent}` to its `key` so it remounts with prefilled title on inbox-conversion flow.

## Key Implementation Notes
- **100% offline**: All reads/writes via Dexie `db` + `crypto.randomUUID()` + native browser APIs only. Zero fetch, zero APIs, zero telemetry.
- **Visual style**: matches the existing dark theme (`bg-[#0A0A0A]` main, `bg-[#0D0D0D]` panels, `bg-[#161616]` inputs, `border-[#262626]` borders, blue-400/500 accent).
- **Inbox conversion flow**: the App tracks a `pendingInboxConvert` state. When the user clicks "Convert to Note/Glossary" in InboxView, App opens the NewItemModal with the truncated content prefilled and sets `pendingInboxConvert`. Only when the corresponding `handleCreateNote`/`handleCreateGlossaryTerm` actually creates the item, the inbox row is marked `convertedTo` + `convertedAt`. If the user cancels the modal, `handleCloseNewItem` clears the pending state — no false conversion.
- **Sidebar badges**: Review count = `db.reviewItems.where('status').equals('pending').count()`. Inbox count = inboxItems where `convertedTo is null/undefined OR isTask===true` (actionable tasks stay visible).
- **NewItemModal `initialContent`**: pre-fills the title of the active tab (`noteTitle`/`labTitle`/`term`) at mount. Since the modal is keyed (in App.tsx) by `newItemContent`, the modal remounts with the prefilled state every time a new inbox conversion starts.

## Lint / TypeScript Status
- `bun run lint` → 0 errors, 0 warnings (clean).
- `npx tsc --noEmit` → only the 5 pre-existing errors in `examples/websocket/*`, `skills/*`, and `src/vault/utils/fuzzySearch.ts:473` (all pre-existing — mentioned in previous worklog entries). Zero errors in any file created/modified by this task.

## New Nav Items added to Sidebar.tsx
| Label   | Icon       | activeSection value | Badge                          |
|---------|------------|---------------------|--------------------------------|
| Inbox   | `Inbox`    | `'inbox'`           | amber count of unconverted items |
| Revisión| `ListChecks`| `'review'`         | blue count of pending review items |

## New ActiveSection union values
```ts
export type ActiveSection = 'dashboard' | 'notes' | 'labs' | 'glossary' | 'blog' | 'tools' | 'references' | 'trash' | 'settings' | 'review' | 'inbox';
```

## No Regressions
- All existing 26 tools untouched.
- DashboardView, NotesView, LabsView, GlossaryView, BlogView, ReferencesView, TrashView, SettingsView keep working unchanged.
- The Dexie DB schema stays at v12 (no schema changes — only new uses of the existing `reviewItems` + `inboxItems` tables).
- The existing `goToTool` / `recordToolUse` / `toggleToolFavorite` helpers in `_shared.tsx` are unchanged — only `addToReviewQueue` was added.
- The zipBackup export/import already includes the 4 new tables (Fase A); no backup changes needed.

## Open questions / followups (not implemented, out of scope)
- Convert to Lab: spec only asks for Convert to Note / Glossary / Reference. Lab flow not wired (would need NewItemModal `initialContent` to also prefill lab parts — but the lab form already has its own part editor and the spec doesn't request it).
- Deep-link from the Review Queue to a specific position in a long note (currently just selects the note and switches view — same as the rest of the app).
