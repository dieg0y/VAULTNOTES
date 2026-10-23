# Task ID: 4-b — LdapDnParserTool.tsx

## Agent
Subagent (Z.ai Code) — implementing ONE self-contained tool for VaultNotes IAM/Vulnerability/Linux block.

## Deliverable
- File: `/home/z/my-project/src/vault/components/tools/LdapDnParserTool.tsx`
- Named + default export: `LdapDnParserTool`
- Lines: **417** (within 300-500 target range)

## What it does (2-sentence summary)
Parses an LDAP Distinguished Name (e.g. `CN=John Doe,OU=SOC,OU=Users,DC=company,DC=local`) into individual RDN components via a char-by-char state machine (handles escaped commas/equals per RFC 4514 and surrounding double quotes), derives the Active Directory domain from the DC= parts, and renders a hierarchical ASCII tree visualization (root domain at top, leaf CN at bottom). 100% offline — no fetch, no APIs, no external services; the [Add to Note] action enqueues an HTML-escaped table to the zustand `noteStore` for downstream note creation.

## Verification
- `npx tsc --noEmit` → **zero errors** in `LdapDnParserTool.tsx` (and no errors anywhere related to this file).
- `npx eslint src/vault/components/tools/LdapDnParserTool.tsx --max-warnings=0` → **exit 0** (zero errors, zero warnings).

## Layout (top-to-bottom, matches spec exactly)
1. Single `<input>` (uses `inputCls`) for DN string. Placeholder `CN=John Doe,OU=SOC,OU=Users,DC=company,DC=local`. Enter key triggers immediate parse.
2. Action button row: `[Parse]` (btnPrimary, `Search`), `[Clear]` (btnGhost, `Trash2`), `[Load sample]` (btnGhost, `FileText`), `[Add to Note]` (btnGhost, `BookOpen`, disabled when no parsed result).
3. Always-visible `<InfoBanner>`: "100% offline. El DN se parsea localmente. NO se consulta LDAP, NO se conecta a Active Directory ni a ningún servicio externo."
4. `addedToast` InfoBanner shown 2.5s after [Add to Note] click: "Añadido a Notas — crea una nota nueva para verlo."
5. Error state — `<ErrorBanner>` shown when DN is malformed (e.g. component without `=`): "Formato de DN inválido. Cada componente debe tener la forma `ATTR=value` separado por comas."
6. Empty state — `<InfoBanner>` shown when input is empty or hasn't been parsed yet: "Pega un Distinguished Name (DN) en formato LDAP arriba. Ejemplo: `<code>CN=John Doe,OU=SOC,OU=Users,DC=company,DC=local</code>`"
7. Results section (only when valid DN parsed):
   - a. **Parsed components card** — each RDN on its own row: `index.`, attr badge (blue-400 CN, orange-400 OU, green-400 DC, purple-400 others), value (`font-mono`).
   - b. **Derived domain card** — `<Row label="Domain" value={parsed.domain || '—'} mono />`.
   - c. **Tree visualization card** — `<pre>` (`font-mono text-[11px] text-green-300`) with hierarchical ASCII tree using `└── ` and 4-space indents.
   - d. **Summary card** — `<Row label="Components" value={countSummary(...)} />` showing e.g. "5 components (1 CN, 2 OU, 2 DC)".

## Parsing logic (pure local, RFC 4514)
- `parseDn(dn)`: char-by-char state machine. `\` escapes next char (so `\,` `\=` `\+` don't split). Unescaped `,` is the separator. Each component is trimmed then split via `splitAttrValue`.
- `splitAttrValue(s)`: split at first `=` (so values can contain `=`). Attr uppercase. Value trimmed, surrounding `"..."` stripped if length ≥ 2.
- Throws if a component has no `=`.
- `deriveDomain(components)`: DC values joined with `.` in DN order.
- `buildTree(components, domain)`: root = domain (or "Root"). Non-DC components reversed, then joined with `└── ` and 4-space indent per level → root→leaf chain.
- `countSummary(components)`: order follows DN appearance via `Map` insertion order.

## Debounce
- `useEffect` on `input` → `window.setTimeout(() => setDebounced(input), 200)` (callback, NOT string — no eval). Cleanup clears previous timeout. 200ms matches spec.
- `useMemo` on `debounced` → pure synchronous parse.

## Validation cases (manually verified)
1. Input `CN=John Doe,OU=SOC,DC=company,DC=local` → 4 components (CN John Doe, OU SOC, DC company, DC local), domain `company.local`, tree:
   ```
   company.local
   └── SOC
       └── John Doe
   ```
2. Input `CN=John Doe,OU=SOC,OU=Users,DC=company,DC=local` → 5 components, domain `company.local`, tree:
   ```
   company.local
   └── Users
       └── SOC
           └── John Doe
   ```
3. Input `not-a-dn` → parseDn throws (no `=`), ErrorBanner shown.

## Cross-tool hand-off
- `addToNote()` builds a `<table>` with all components + domain + count + tree (each cell HTML-escaped via `escapeHtml` — NO `dangerouslySetInnerHTML` anywhere) and calls `useNoteStore.getState().enqueueNote('LDAP / DN Parse', htmlTable)`. Shows 2.5s toast via `addedToast` state.

## Constraints honored
- 100% offline — no fetch, no axios, no XMLHttpRequest, no telemetry.
- NO external libraries (only React + lucide-react + `_shared.tsx` helpers).
- NO `dangerouslySetInnerHTML` anywhere.
- NO `eval`, NO `new Function`, NO `setTimeout(string)` — only `setTimeout(callback, ms)`.
- TypeScript strict: zero `any`, zero `@ts-ignore`.
- `'use client'` directive at top.
- Uses shared helpers: `inputCls`, `btnPrimary`, `btnGhost`, `Row`, `InfoBanner`, `ErrorBanner`.
- Visual style matches MitreExplorerTool.tsx / SigmaExplorerTool.tsx: dark cards `bg-[#0D0D0D]` with `border border-[#262626]`, blue accents, tiny `text-[10px]` / `text-[11px]` labels, `font-mono` for DNs.

## Not modified
- No other files touched. ToolsView.tsx NOT modified (main agent will integrate).
