# BLOQUE6-2D — Data & Intelligence view

**Task ID:** BLOQUE6-2D
**Agent:** main (Z.ai Code)
**Spec:** #23 (Sync Center) + #24 (Online Activity)
**Deliverable:** `src/vault/components/DataIntelView.tsx` (NEW file, single-file)

---

## What was built

A new top-level view component `DataIntelView` (no props) mounted in App.tsx
when `activeSection === 'data-intel'` (the parent will wire it up later —
this task created ONLY DataIntelView.tsx, per spec).

The view renders 5 cards in this exact order, matching the dark visual style
of `SettingsView` / `DashboardView` (bg-[#0A0A0A], cards bg-[#0D0D0D]
border-[#262626] rounded-md p-4 space-y-3, subheaders text-[10px] font-bold
uppercase tracking-widest text-[#555]):

1. **Connectivity** — `useIsOnline()` hook + colored dot (green=online /
   amber=offline) + a one-line note explaining that online functions are
   optional and that sync/search buttons are disabled when offline.

2. **MITRE ATT&CK** — `getLocalMitreMeta()` (Local ✓ / Version / Techniques /
   Last Sync) + `[Check for Updates]` (calls `checkMitreUpdates()` → inline
   result) + `[Sync]` (calls `syncMitre()` → inline result, then re-refresh
   meta). Both buttons disabled when `!online`. Note: "MITRE works offline.
   The bundled dataset is always available. Sync only updates the local
   metadata marker — live download is architecture-ready but not wired
   (no backend)."

3. **Sigma** — `getLocalSigmaMeta()` (Local ✓ / Bundled rules / Custom rules /
   Total / Last Sync) + same `[Check for Updates]` + `[Sync]` pattern.
   Below: a **Custom Sigma Rules sub-section** that uses
   `useLiveQuery(() => db.customSigmaRules.orderBy('importedAt').reverse().toArray())`.
   Each row: title + level badge + `[Edit]` (opens the SigmaEditModal) +
   `[Export]` (Blob download `.yml`) + `[Delete]` (confirm + delete).
   Hidden file picker (`accept=".yml,.yaml"`) wired to a `[Import rule]`
   button that calls `importSigmaRule(text)` and shows validation errors
   inline. Empty state: "No custom rules yet."
   Privacy note: "Sigma rules are NEVER executed. YAML is treated as data only."

4. **Threat Intelligence** — per-provider row in `PROVIDER_ORDER` showing
   `Configured` / `Not configured` (from `hasCredential(id)`, refreshed after
   clear). Counts row: `Saved CVEs` (`useLiveQuery` on `db.savedCves.count`),
   `Cached results` (`countTiCache`), `Activity entries` (`countOnlineActivity`).
   Three buttons: `[Clear Threat Intelligence Cache]` (clearTiCache) +
   `[Clear Online Activity]` (clearOnlineActivity) + `[Remove all API
   credentials]` (clearAllCredentials — confirm). After each action, the
   relevant counts + provider state are re-refreshed.

5. **Online Activity** — `[Clear Activity]` button (clearOnlineActivity) +
   a `max-h-96 overflow-y-auto` scrollable list of the most recent 100
   rows from `db.onlineActivity` via
   `useLiveQuery(() => db.onlineActivity.orderBy('timestamp').reverse().limit(100).toArray())`.
   Each row: provider label (bold) + IOC type badge (mono, e.g. "IPv4",
   "Domain") + relative timestamp + status badge (success=green, error=red,
   cached=blue, not_configured=gray, offline=amber) + optional note.
   **CRITICAL privacy constraint honored:** only the IOC **TYPE** is shown —
   never the IOC **VALUE** (spec #24). Empty state: "No online activity yet."

---

## SigmaEditModal (sub-component, same file)

Fixed-position overlay matching the WhitelistModal pattern from
`IocExtractorView.tsx`:
- `fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm`
- Click-outside-to-close on the backdrop; inner panel `stopPropagation`.
- Sticky header (`Pencil` icon + title + close `X`) + sticky footer
  (`[Cancel]` + `[Save]`).
- Body: textarea (monospace, min-h-[300px], resize-y) holding the YAML.
- On Save: calls `updateCustomSigmaRule(id, yaml)`. On validation errors
  (`result.errors.length > 0`), shows them inline in a red box and keeps
  the modal open. On success (empty errors), closes via
  `setEditingRule(null)` in the parent.
- The parent `handleSaveEdit` callback returns the `string[]` errors array
  to the modal so it can render them.

---

## Architecture rules honored

- `'use client'` at the top (uses `useLiveQuery` + hooks).
- **NO direct `fetch` / network call** — everything goes through the
  integration-layer helpers (`getLocalMitreMeta`, `checkMitreUpdates`,
  `syncMitre`, `getLocalSigmaMeta`, `checkSigmaUpdates`, `syncSigma`,
  `importSigmaRule`, `updateCustomSigmaRule`, `deleteCustomSigmaRule`,
  `hasCredential`, `clearAllCredentials`, `countTiCache`, `clearTiCache`,
  `countOnlineActivity`, `clearOnlineActivity`).
- **NO auto-call** of `checkMitreUpdates` / `syncMitre` /
  `checkSigmaUpdates` / `syncSigma` on mount. Only `getLocalMitreMeta` /
  `getLocalSigmaMeta` (local reads), `hasCredential` (local read),
  `countTiCache` / `countOnlineActivity` (local counts) are called on mount
  to populate the meta cards. All sync/check operations fire ONLY on
  explicit button click.
- **TypeScript strict, no `any`.** Two type-narrowing casts:
  `row.provider as ProviderId` (activity rows were written by logActivity
  with a ProviderId literal; the cast narrows the loose `string` stored
  in the row), and `Object.fromEntries(entries) as Record<ProviderId,
  boolean>` (Object.fromEntries returns the wide type).
- **All async DB operations wrapped in try/catch** — failures set an inline
  error message (e.g. "Failed: …"), never crash the view, never throw to
  the React tree.
- **Exact dark visual style** matching SettingsView/DashboardView:
  - shared button class strings `BTN_PRIMARY` (blue-600/20 / blue-500/30),
    `BTN_NEUTRAL` (#161616 / #202020), `BTN_DANGER` (#161616 → red-500/10).
  - subheaders `text-[10px] font-bold uppercase tracking-widest text-[#555]`.
  - status badges follow spec #24 colors (success=green, error=red,
    cached=blue, not_configured=gray, offline=amber).
  - sigma level badges follow community convention (critical=red, high=orange,
    medium=yellow, low=blue, informational=gray).
- **Single-column responsive layout** (settings-like). Meta rows use
  `grid-cols-1 sm:grid-cols-2` / `sm:grid-cols-3` so they stack on mobile
  and grid on desktop. Lists use `max-h-96 overflow-y-auto` for long-list
  handling.
- SigmaEditModal uses the `fixed inset-0` overlay pattern from
  `IocExtractorView.tsx` WhitelistModal (no shadcn/ui Dialog needed).
- Import file picker uses a hidden `<input type="file" accept=".yml,.yaml" />`
  + a button that triggers `fileRef.current?.click()`.

---

## Files touched

- **NEW** `src/vault/components/DataIntelView.tsx` (the only file created).

No modifications to App.tsx, Sidebar.tsx, Header.tsx, SettingsView.tsx, or
any other file — the parent will mount this view later.

---

## Verification

1. **`bun run lint`** — PASSES (0 errors, 0 warnings).
2. **`npx tsc --noEmit`** — no errors in DataIntelView.tsx.
3. **`npx eslint src/vault/components/DataIntelView.tsx`** — 0 errors, 0 warnings.
4. **`dev.log` tail** — `✓ Compiled in …` lines (no compile errors). The
   view isn't mounted yet (App.tsx not wired) — that's expected; the parent
   will do it.

---

## Mental trace of the 5 sections

- **Connectivity**: green dot + "Online" or amber dot + "Offline".
- **MITRE**: Local ✓ Yes / Version / Techniques / Last Sync (or "never" if
  null). Buttons disabled when offline. Click Check → "Latest known version
  15.0.0-bundled — N entries. You are up to date." Click Sync → "Local
  MITRE dataset confirmed." + Last Sync updates to now.
- **Sigma**: same pattern. Custom Sigma sub-section lists rules. Import a
  valid .yml → "Imported rule (id: …)" + rule appears in list. Import an
  invalid .yml → validation errors shown inline. Edit → modal opens with
  current YAML → save → if invalid, errors inline; if valid, modal closes
  + list re-renders. Delete → confirm → row removed. Export → .yml file
  downloads.
- **Threat Intel**: each provider shows Configured/Not configured. Counts
  display correctly. Clear cache → "Cleared N cached entr(y/ies)." Clear
  activity → same. Clear credentials → confirm warning → "All API
  credentials removed." + provider states flip to "Not configured".
- **Online Activity**: scrollable list. Each row shows provider label +
  IOC type badge + relative timestamp + status badge + optional note.
  Empty state: "No online activity yet." Privacy note at bottom: "only the
  IOC TYPE is shown — never the actual IP/domain/hash value."

---

## Deviations

None. All 5 sections implemented exactly as specified. The SigmaEditModal
extracted as a small sub-component in the same file for clarity — this is
a code-organization choice, not a behavioral deviation.

---

## Sibling agents' work referenced

- Read `BLOQUE6-ARCH` worklog entry to understand the architecture layer
  (`src/vault/integrations/*`) — confirmed all helpers exist with the
  exact signatures I needed.
- Read `SettingsView.tsx` for the dark-theme visual reference (cards,
  subheaders, button classes).
- Read `IocExtractorView.tsx` WhitelistModal (lines 508-541) for the
  fixed-position overlay pattern used by the SigmaEditModal.
- Read `DashboardView.tsx` for the `useLiveQuery` patterns (deps array +
  default value + `?? default` belt-and-suspenders).
