# Task ID: BLOQUE5-E (Dashboard mejorado + Privacy Indicator + Related Content panel)

**Agent:** main (Z.ai Code)
**Date:** 2025-03
**Spec items:** #13 (Related Knowledge), #14 (Improved Dashboard), #19 (Privacy Indicator)

## Files modified

| File | Lines | Change summary |
| --- | ---: | --- |
| `src/vault/components/DashboardView.tsx` | 891 | Full rewrite: 5 sections (Knowledge/Learning/Tools/Quick Actions/Recent Activity) + preserved flashcards study deck + useLiveQuery for references count, reviewItems pending count, toolFavorites, toolRecents. Added 3 optional props (`onSelectSection`, `onOpenNewItem`, `onOpenTool`) wired to App.tsx. |
| `src/vault/components/SettingsView.tsx` | 331 | Added "Privacidad y Offline" section at the TOP of the view: green `CheckCircle2` + "100% Local / Offline" badge, 3 bullets (no internet requests, IndexedDB local, search/tools/backups offline), `db.verno` mono badge (`v12`) + `db.name` mono badge. Imports added: `CheckCircle2`, `ShieldCheck`. |
| `src/vault/components/ToolsView.tsx` | 1587 | Added Related Knowledge panel to WinEventTool detail modal: imports `useLiveQuery`, `db`, `findMitreById`, `findSigmaByEventId`. Added 3 useMemo derived arrays (relatedMitreEntries, relatedSigmaRules, relatedEventEntries) + 1 useLiveQuery (relatedNotes). Panel appended AFTER the existing cross-tool action buttons row, BEFORE `</DetailModal>`. Only rendered when at least one category is non-empty (`hasRelatedKnowledge`). |
| `src/vault/App.tsx` | 1023 | DashboardView call site: added 3 new optional props (`onSelectSection`, `onOpenNewItem`, `onOpenTool`). Each is a tiny inline arrow wiring to existing App state (`setActiveSection`, `setNewItemTab`/`setIsNewItemOpen`, `setPendingTool`/`setActiveSection('tools')`). |

## Section icons used per new Dashboard section

| Section | Icon(s) | Color |
| --- | --- | --- |
| Knowledge | `BookOpen` (header) + `FileText` (Notes), `FlaskConical` (Labs), `BookOpen` (Glossary), `Bookmark` (References) | blue / green / purple / amber |
| Learning | `Brain` (header) + `ListChecks` (Items to Review), `AlertTriangle` (Weak Concepts), `FlaskConical` (Recent Labs) | green / blue / red / green |
| Tools | `Star` (header + Favorites), `History` (Recently Used), `Star` (favorite chip), per-tool dispatcher (`Cpu`/`Globe`/`FileText`/`Bug`/`Network`/`Clock`/`Crosshair`/`BookOpen`/`Star`) | amber / blue |
| Quick Actions | `Plus` (header) + `FileText` (+Note), `FlaskConical` (+Lab), `BookOpen` (+Glossary), `Network` (+IOC), `Briefcase` (+Case disabled) | blue / green / purple / amber / gray |
| Recent Activity | `Activity` (header) + `FileText`/`FlaskConical`/`BookOpen` per-kind badges + `getPlatformIcon()` per-note platform | blue / green / purple |
| Flashcards (bonus) | `Brain` (header) + `RotateCcw` (restart), `CheckCircle2` (know), `XCircle` (don't know), `HelpCircle` (empty state), `CheckCircle2` (completed state) | green / blue / red |

## Lint status

```
$ bun run lint
$ eslint .
```
**0 errors, 0 warnings.** Clean.

## TypeScript status

```
$ npx tsc --noEmit
```
Errors only in unrelated files (`examples/websocket`, `skills/`, `fuzzySearch.ts:473` — all pre-existing per prior worklogs). CERO errors in any of the 4 files modified by this task.

## Dev server log status

Latest dev.log entries show `✓ Compiled in 200-300ms` and `GET / 200 in 28-48ms` consistently. No errors attributable to my changes. The few "Fast Refresh had to perform a full reload" warnings are pre-existing — they appear during any edit cycle when HMR can't apply a hot patch incrementally and reloads the whole shell instead. Not a code defect.

## Implementation notes per deliverable

### Deliverable 1 — Improved Dashboard (spec #14)

- **Section 1 Knowledge**: 4 cards in a `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`. Notes (blue, sparkline SVG), Labs (green, mini bar chart), Glossary (purple, circular progress), References (amber, last edit time). The references count comes from a `useLiveQuery(() => db.references.filter((r) => !r.isDeleted).count(), [], 0)` call so the card updates live when the user adds/removes references elsewhere.
- **Section 2 Learning**: 3 cards in a `grid grid-cols-1 md:grid-cols-3 gap-4`. Items to Review (clickable → switches to `review` section; count from `db.reviewItems.where('status').equals('pending').count()`). Weak Concepts (live-derived from `db.flashcardStats` — terms with `lapses > 0` OR `stability < 1.5` days; capped at 5; falls back to "Coming soon" placeholder when there are no stats yet). Recent Labs (top 3 by `updatedAt` desc; clickable → opens the lab detail).
- **Section 3 Tools**: 2 cards. Favorite Tools (`useToolFavorites()` capped at 8 + mapped via `findToolById` from `toolsCatalog` — displayed as chips with the catalog's lucide icon family inline-dispatched by toolId). Recently Used (`useToolRecents(5)` mapped via `findToolById` — displayed as a numbered list with category badge). Empty states for both.
- **Section 4 Quick Actions**: 5 buttons in `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3`. + Note (Ctrl+Shift+N hint), + Lab (Ctrl+Shift+L), + Glossary, + IOC (deep-links to tools/ioc via `onOpenTool('ioc')`), + Case (disabled, label "Coming soon", tooltip).
- **Section 5 Recent Activity**: merges activeNotes + activeLabs + activeGlossary, sorts by `updatedAt` desc, slices top 5. Each row shows a colored kind badge (Apunte blue / Lab green / Glosario purple), an icon, platform/organization meta, title, and a relative time (`relTime()` formatter). Clicking a row uses the existing `onSelectNote` / `onSelectLab` / `onSelectSection('glossary')` handlers.
- **Bonus**: Flashcards Study deck (FSRS-lite) preserved intact — including the `sessionKey`/`frozenDeck` snapshot, the 3D flip card, the `Me la sé`/`No me la sé` buttons, and the completion confetti. Moved to its own section at the bottom.
- Visual style preserved: `bg-[#0A0A0A]` main, `bg-[#0D0D0D]` panels, `border-[#262626]` borders, `text-white`/`text-[#888]`/`text-[#555]` text, blue-400 accents, `font-mono` for numbers, `text-[10px] uppercase tracking-widest` for subheaders. NO charts introduced.

### Deliverable 2 — Privacy Indicator (spec #19)

- New section at the TOP of SettingsView, immediately after the page header and before the existing "App Folder" card. Title: "Privacidad y Offline" with a `ShieldCheck` (green) icon. Right side: a green pill "100% Local / Offline" with a `CheckCircle2` icon.
- 3 bullet points (each preceded by a small green `CheckCircle2`):
  1. "Sin requests automáticos a internet — toda la lógica corre en tu navegador."
  2. "Datos permanecen en IndexedDB local (Dexie). No se sincronizan con ningún servidor."
  3. "Búsqueda, herramientas y backups 100% offline."
- DB schema badge at the bottom of the panel: `v{db.verno}` rendered as a `code` element in a blue-tinted mono pill, plus `db.name` (`VaultLocalDB`) as a fainter mono badge. Both values are read at render time directly from the live Dexie instance — no API call, no state, no effect.
- The Sidebar's existing "100% Offline" badge in the bottom navigation was preserved unchanged.

### Deliverable 3 — Related Knowledge panel on WinEvent detail (spec #13)

- New imports at the top of `ToolsView.tsx`: `useLiveQuery` (from `dexie-react-hooks`), `db` (from `../db`), `findMitreById` (from `../data/mitreData`), `findSigmaByEventId` (from `../data/sigmaData`).
- Inside the `WinEventTool` component, added:
  - `selectedEventId = selected?.id` (a stable primitive for the useLiveQuery dep).
  - `relatedNotes` — `useLiveQuery` that returns the top 3 notes (by `updatedAt` desc) whose `contentHtml` includes `String(selected.id)` (substring match). Returns `[]` when `selected` is null. Deps = `[selectedEventId]`.
  - `relatedMitreEntries` — `useMemo` that maps each id in `selected.mitre` (if any) to `{ id, entry: findMitreById(id) }` and filters out misses.
  - `relatedSigmaRules` — `useMemo` that returns `findSigmaByEventId(selected.id)` (returns `SigmaRule[]`).
  - `relatedEventEntries` — `useMemo` that prefers `selected.relatedEventIds` (numeric array); falls back to parsing the leading integer from each `selected.related` legacy string ("4634 (Logoff)" → 4634) when `relatedEventIds` is missing. De-dups via `Set` + `Array.from`. Filters out IDs that don't exist in `WIN_EVENTS`. Uses a type guard so the filtered array is properly typed.
  - `hasRelatedKnowledge` — boolean OR of all four category lengths, used to gate the panel rendering.
- The panel is rendered as a `<div className="border border-[#262626] rounded p-3 mt-2 space-y-3">` AFTER the existing cross-tool action buttons row and BEFORE `</DetailModal>`. Subheaders use `text-[10px] uppercase tracking-widest text-[#555]`.
- Each category is conditionally rendered only when non-empty:
  - **MITRE**: each chip shows the MITRE id (bold blue) + "· {technique.name}" (faint) + tooltip with the description; click → `goToTool('mitre', id)`.
  - **Sigma**: each entry shows the rule title (bold white) + "— {rule.id}" (faint); click → `goToTool('sigma', rule.id)`.
  - **Related Event IDs**: each chip shows the numeric id + "· {event.name}" (faint); click → `goToTool('winevent', id)`.
  - **Notes**: shows the up-to-3 matching note titles (with a `FileText` icon) + a "Found N notes mentioning Event {id}. Usa Ctrl+K para abrir el buscador global y saltar al apunte." hint (no navigation since this component doesn't have `onSelectNote`).
  - **Detection Query**: a single "Open Detection Query Helper" button → `goToTool('detection-query')`.
- The local `goToTool` helper in WinEventTool (not the one from `_shared.tsx`) is used because it also closes the WinEvent detail modal via `setSelected(null)` — so navigating to MITRE/Sigma/another WinEvent from the Related Knowledge chips leaves a clean UI behind.
- The existing WinEvent detail layout was NOT touched — the new panel is purely appended.

## Constraints honored

- 100% offline: no `fetch`, no external APIs, no telemetry. Only Dexie live queries + native browser APIs (`db.verno`, `db.name`, `crypto.randomUUID`, `String`, `Date`, etc.) + lucide-react icons.
- Visual style: dark theme preserved (`bg-[#0A0A0A]`, `bg-[#0D0D0D]`, `border-[#262626]`, blue-400 accents, `font-mono` numbers, `text-[10px] uppercase tracking-widest text-[#555]` subheaders).
- All Dexie queries use `useLiveQuery` from `dexie-react-hooks`.
- Zero `any`, zero `@ts-ignore`, zero `eval`, zero `new Function`, zero `dangerouslySetInnerHTML`, zero `window.prompt`/`confirm`/`alert`.
- Backward compat: the new DashboardView props are all optional — existing callers that don't pass them still work (legacy handlers `onSelectNote`/`onSelectLab`/`onOpenNotesView`/`onOpenLabsView` are used as fallbacks).
- No existing tool/view broken: DashboardView, SettingsView (App Folder card untouched), ToolsView WinEventTool (existing layout untouched, panel appended), App.tsx (existing DashboardView wiring untouched — only added 3 optional props) all verified with `bun run lint` (clean) and `npx tsc --noEmit` (cero errors in my files).

## Open questions / skipped items

- The spec for the "+ Case" Quick Action said: "placeholder — disabled for now, label 'Coming soon'". Implemented as a `disabled` button with `Briefcase` icon and "Coming soon" subtitle. No wiring done (intentional).
- The spec for Weak Concepts said: "placeholder — could be glossary terms with low flashcard stability, or just 'Coming soon'". Implemented using REAL data (terms with `lapses > 0` OR `stability < 1.5` from `db.flashcardStats`), but shows "Coming soon" placeholder when there are zero stats. Best of both worlds.
- The spec for the Notes category in Related Knowledge said: "show a 'Found N notes mentioning Event {id}' line with a hint to use Ctrl+K. Don't try to navigate from here — that would require threading more props." Implemented exactly as specified — the matching notes show titles (read-only) and a Ctrl+K hint; no `onSelectNote` was threaded into WinEventTool.
- The spec for relatedEventIds said: "selected.relatedEventIds (or selected.related if string array)" — implemented the fallback by parsing the leading integer from each `related` legacy string. Verified the fallback logic only returns IDs that exist in WIN_EVENTS (via the type-guarded filter).
