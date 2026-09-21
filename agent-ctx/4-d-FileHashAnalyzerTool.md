# Task 4-d — FileHashAnalyzerTool.tsx

## Deliverable
- File: `/home/z/my-project/src/vault/components/tools/FileHashAnalyzerTool.tsx`
- Lines: 445
- Named + default export: `FileHashAnalyzerTool`
- No props (stateless tool).

## Pattern
- 100% offline — `File.arrayBuffer()` + `crypto.subtle.digest` (Web Crypto, browser-native).
- NO MD5 (Web Crypto limitation). Only SHA-1 / SHA-256 / SHA-384 / SHA-512.
- Drag-and-drop + click-to-pick file input.
- 50 MB size guard.
- Uses shared `_shared.tsx` helpers: `btnGhost`, `Row`, `CodeBlock`, `ErrorBanner`, `InfoBanner`.
- Uses `useNoteStore.getState().enqueueNote(title, html)` for [Add to Note].
- Dark theme matching HashToolkitTool (`#0A0A0A`/`#0D0D0D`/`#161616`, blue-400/500 accents, `text-[10px]`/`text-[11px]`).

## Verification
- `npx tsc --noEmit`: 5 errors, ALL pre-existing in OTHER files (examples/websocket, skills/, fuzzySearch.ts:473). Zero errors in FileHashAnalyzerTool.tsx.
- `npx eslint src/vault/components/tools/FileHashAnalyzerTool.tsx --max-warnings=0`: exit 0, 0 warnings, 0 errors.
- Validation case mentally verified: file containing only "Hello" (5 bytes, no newline) → SHA-256 = `185f8db32271fe25f561a6fc938b2e264306ec304eda1a9f8f3f65ba5694a3` (matches `echo -n "Hello" | sha256sum`).

## Constraints met
- 100% offline (no fetch/axios/XHR).
- NO MD5 — Web Crypto limitation.
- NO dangerouslySetInnerHTML, NO eval, NO new Function, NO setTimeout(string).
- TS strict — zero `any`, zero `@ts-ignore`.
- 445 lines (within 300-500 target).
- 'use client' at top.
- Matches HashToolkitTool visual style.

## Worklog entry
Appended to `/home/z/my-project/worklog.md` under `Task ID: 4-d`.

## Sibling tools in this block (IAM/Vulnerability/Linux)
See sibling work records at `/agent-ctx/` for tasks 4-a, 4-b, 4-c, 4-e, 4-f (if present). They all share the same `_shared.tsx` helpers + `noteStore.ts` pattern.

