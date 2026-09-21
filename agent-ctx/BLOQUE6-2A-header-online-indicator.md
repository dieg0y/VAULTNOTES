# Task BLOQUE6-2A — Header Online/Offline Indicator

## Task
Add a small online/offline indicator pill to the Header, and update the static "100% Offline" badge at the bottom of the Sidebar to reflect the real browser connectivity state (navigator.onLine, no network probe). Uses the `useIsOnline()` hook from `src/vault/integrations/online.ts` built in BLOQUE6-ARCH.

## Previous agents' work I relied on
- `BLOQUE6-ARCH` (see `/home/z/my-project/worklog.md` line 2365+) built the entire Online-Optional integration layer. The only file I needed from it was `src/vault/integrations/online.ts` which exports `useIsOnline()` (React hook, navigator.onLine + window online/offline events, no network probe, returns boolean).
- Block 5 work built the Header (48px tall, `bg-[#0D0D0D]`, `border-b border-[#262626]`, search bar + actions group: backup-saved msg, Guardar Backup, Importar, Capturar, Nuevo) and the Sidebar bottom "100% Offline" badge (blue pulsing dot, "100% Offline" text, "Dexie" mono label).

## Files modified
1. `src/vault/components/Header.tsx` — added `import { useIsOnline } from '../integrations/online';`, called `const online = useIsOnline();` inside the component, and inserted a small pill indicator as the LEFTMOST item in the right-side actions group (before `{backupSavedMessage && (...)}`). The pill is a `rounded-full bg-[#161616] border border-[#262626] text-[10px] font-mono` badge with a `w-1.5 h-1.5 rounded-full` dot (green-400 + no animation when online, amber-400 + `animate-pulse` when offline) + the text "Online" / "Offline" in `text-[#888]`. Tooltip (`title` attr) lists what's available in each state. `aria-label` for screen readers.
2. `src/vault/components/Sidebar.tsx` — added `import { useIsOnline } from '../integrations/online';`, called `const online = useIsOnline();` inside the component, and replaced the static "100% Offline" badge with a state-aware badge. Same visual structure (still `px-3 py-1.5 rounded bg-[#161616] border border-[#262626]`, dot + text on left, "Dexie" mono label on right). When online: green dot (no pulse), text "Online · Local-first". When offline: amber dot (subtle `animate-pulse`), text "Offline · Local-only". Used `flex-1 min-w-0 truncate` pattern so the longer text can ellipsize gracefully inside the 200px sidebar without breaking layout, and `shrink-0` on the dot + "Dexie" label so they keep their natural width.

## Critical constraints respected
- ❌ Did NOT touch `src/vault/App.tsx`.
- ❌ Did NOT add any fetch / network probe — only `useIsOnline()`.
- ❌ Did NOT change the existing Header/Sidebar layout beyond the targeted additions/updates.
- ✅ TypeScript strict, no `any`.
- ✅ Dark visual style matched exactly: `bg-[#0D0D0D]`/`#161616`, `border-[#262626]`, `text-[#888]`, green-400/amber-400 accents, `font-mono` for small labels.
- ✅ `'use client'` not needed on Header/Sidebar — they're imported by App.tsx which already has `'use client'`, so they inherit the client boundary. No changes to the directive were needed.
- ✅ Offline dot uses `animate-pulse` (Tailwind default — opacity 1→0.5→1 over 2s, subtle, not aggressive). Same animation the original Block 5 sidebar badge used.

## Verification
- `cd /home/z/my-project && bun run lint` → 0 errors, 0 warnings. ESLint output was empty (just the `$ eslint .` banner).
- `tail -25 /home/z/my-project/dev.log` → all `✓ Compiled in <NNN>ms`, no errors, all routes returning 200.

## Exact JSX snippets

### Header indicator (inserted before `{backupSavedMessage && (...)}`)
```tsx
{/* Online/Offline connectivity indicator (Block 6 — Online-Optional).
    Purely visual: reads navigator.onLine via useIsOnline() — no fetch,
    no network probe. Tooltip lists what's available in each state.
    Spec #2: when offline, Local tools ✓ Notes ✓ Search ✓ MITRE ✓ Sigma ✓,
    Online enrichment ✕. When online: everything ✓. */}
<div
  className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#161616] border border-[#262626] text-[10px] font-mono shrink-0"
  title={
    online
      ? 'Online: local tools + online enrichment (Threat Intel, CVE search, MITRE/Sigma sync) available'
      : 'Offline: local only — Notes ✓, Search ✓, MITRE ✓, Sigma ✓ · Online enrichment ✕ (disabled)'
  }
  aria-label={online ? 'Browser is online' : 'Browser is offline'}
>
  <span
    className={`w-1.5 h-1.5 rounded-full ${
      online ? 'bg-green-400' : 'bg-amber-400 animate-pulse'
    }`}
  />
  <span className="text-[#888]">{online ? 'Online' : 'Offline'}</span>
</div>
```

### Sidebar updated badge (replaced the static "100% Offline" badge)
```tsx
{/* Connectivity state badge (Block 6 — Online-Optional).
    Reads navigator.onLine via useIsOnline() — no fetch, no probe.
    Replaces the static "100% Offline" badge from Block 5 with a real
    reflection of the browser's connectivity state. Local-first
    always works; online enrichment is the only thing gated by this. */}
<div
  className="px-3 py-1.5 rounded bg-[#161616] border border-[#262626] flex items-center justify-between text-[10px] text-[#888]"
  title={
    online
      ? 'Online: local tools + online enrichment available'
      : 'Offline: local only — Notes ✓, Search ✓, MITRE ✓, Sigma ✓ · Online enrichment ✕ (disabled)'
  }
>
  <div className="flex items-center gap-1.5 min-w-0 flex-1">
    <span
      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        online ? 'bg-green-400' : 'bg-amber-400 animate-pulse'
      }`}
    />
    <span className="truncate">
      {online ? 'Online · Local-first' : 'Offline · Local-only'}
    </span>
  </div>
  <span className="font-mono text-[9px] text-[#555] shrink-0 ml-2">Dexie</span>
</div>
```

## Deviations from the plan
- The task description stated "'use client' is already at the top of Header.tsx (it's a client component)". In reality, neither Header.tsx nor Sidebar.tsx has an explicit `'use client'` directive at the top — they inherit the client boundary from App.tsx (which has `'use client'`). No directive was added because none was needed; the hooks work fine in the inherited client context.
- For the Sidebar badge text ("Online · Local-first" / "Offline · Local-only"), the spec text is exactly preserved. To handle the longer text inside the 200px sidebar without breaking the layout, I added `flex-1 min-w-0` to the left group and `truncate` on the text span — so if the text is too wide for the available space, it ellipsizes gracefully rather than wrapping or pushing the "Dexie" label out. The dot color + pulse animation provide the primary visual signal regardless. No text was shortened.
- One intermediate JSX typo was caught and fixed during the edit pass (missing closing `}` on the Sidebar span's `className` template literal). Verified by re-reading the file and by `bun run lint` passing.
