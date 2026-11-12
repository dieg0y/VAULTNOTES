# R3 — fsStorage dedup + error/perf fixes (imageStorage / videoStorage / autoBackup)

Task ID: R3. Files touched (ONLY these): `src/vault/utils/fsStorage.ts` (NEW),
`src/vault/utils/imageStorage.ts`, `src/vault/utils/videoStorage.ts`,
`src/vault/utils/autoBackup.ts`. No other file edited.

## What was done

### 1. NEW `src/vault/utils/fsStorage.ts` (395 lines)
- Owns the FSA structural typings (`FSWritableLike`, `FSFileHandleLike`,
  `FSDirHandleLike`) — all three exported from here.
- Low-level shared helpers: `queryDirPermission`, `ensureDirPermission`
  (funnels the ~12 duplicated `dir.queryPermission ? … : 'granted'`
  boilerplates), `readStoredDirHandle(key)`, `getDirectoryPicker()`,
  `writeFileToDir(dir, filename, blob)`.
- `createFsMediaFolder(cfg: FsMediaFolderConfig): FsMediaFolder` factory
  generating the whole duplicated family: getDirectory / hasDirectory /
  isPermissionGranted / ensurePermission / sanitizeFilename / fileExists /
  uniqueNameIn / saveToDirectory / findFileHandle / getObjectURL.
  Config carries the only real differences between the two families:
  `dirKey`, `kindLabel` ('una imagen'/'un video'), `folderLabel`
  ('imágenes'/'videos'), `fallbackBase` ('imagen'/'video'), `fallbackMime`
  ('image/png'/'video/mp4'), `fallbackExt` ('png'/'mp4'), `sniffBytes`
  (64/512), `magicSigs`, optional `quickAccept` (SVG, image-only), and the
  EXACT error classes (`errors.noDirectory/permission/rejected`) injected so
  `instanceof` keeps working in editorMedia.tsx.
- P5: shared `uniqueNameIn` enumerates `dir.values()` ONCE into a
  `Set<string>` and computes the free `${stem} (${i})${ext}` in memory
  (1..999, fallback `${stem}-${Date.now()}${ext}`) — replaces up to 999
  sequential `getFileHandle` round-trips.
- E5: shared `findFileHandle` logs `console.warn` (with cause) when a
  directory enumeration fails (permission/transient) instead of silently
  reporting "not found"; still returns null (no control-flow change).

### 2. `imageStorage.ts` → thin adapter (301 → 145 lines)
- Original header doc preserved + R3 note. Error classes kept VERBATIM
  (same names/messages). `IMAGES_DIR_KEY` unchanged.
- Re-exports the generated functions under original names:
  `getImagesDirectory`, `hasImagesDirectory`, `isImagesPermissionGranted`,
  `ensureImagesPermission`, `saveImageToDirectory`, `getImageObjectURL`.
- `export type { FSDirHandleLike } from './fsStorage'` — it was the only
  typing exported historically (mediaVault.ts imports it from here).
- Keeps locally: `IMAGE_MAGIC_SIGS` + `isSvgFile` (quickAccept for the
  SVG text-format case).

### 3. `videoStorage.ts` → adapter + local app-folder/legacy (595 → 465 lines)
- Family config (`sniffBytes: 512`, 'un video', 'video', 'video/mp4',
  'mp4', `VIDEO_MAGIC_SIGS`) + re-exports: `hasVideosDirectory`,
  `isVideosPermissionGranted`, `ensureVideosPermission`,
  `saveVideoToDirectory`, `getVideoObjectURL`. `getVideosDirectory` stays
  NON-exported (as before) as `videosFolder.getDirectory`.
- NOT genericized (kept local, consuming fsStorage low-level helpers):
  `getVideosDirectoryName`, `setVideosDirectory`, `resolveLegacyVideoUrl`,
  app-folder block (`hasAppFolder`, `getAppFolderName`, `pickAppFolder`,
  `isAppFolderPermissionGranted`, `listAppFolderFiles`, `readAppFolderFile`,
  `removeAppFolderEntry`).
- E3: `forgetVideosDirectory` / `forgetAppFolder` now try/catch →
  `console.warn('… failed:', err)` + `return false` (sibling style). Return
  type widened `Promise<void>` → `Promise<boolean>` — verified both callers
  (SettingsView.tsx L94/L142) `await` and ignore the result, so no caller
  breakage; also removes floating rejections.
- E4: NEW `writeFileToAppFolderDetailed(filename, blob): Promise<WriteAppFolderResult>`
  with discriminated union `{ok:true} | {ok:false; reason:'no-folder'|
  'no-permission'|'write-error'; error?: unknown}`. `writeFileToAppFolder`
  KEPT returning `Promise<boolean>` as a thin wrapper (`.ok`) because
  zipBackup.ts:795 (owned by R2, out of my scope) consumes it as
  `await … .catch(() => false)` + `if (wroteToApp)` — a truthy
  `{ok:false,…}` object would have broken its success detection. Wrapper
  preserves exact old semantics (silent false for no-folder/no-permission,
  warn+false for write errors).

### 4. `autoBackup.ts` (312 → 350 lines)
- E4: `writeOneAutoBackup` uses `writeFileToAppFolderDetailed` and maps
  reasons to specific Spanish messages: 'no-folder' → "No hay carpeta de
  la app configurada — elige la carpeta de la app en Configuración.";
  'no-permission' → "Falta permiso sobre la carpeta de la app — conéctala
  y concede acceso desde Configuración."; 'write-error' → generic-similar
  "No se pudo escribir en la carpeta (error de escritura)." +
  `console.warn` of the error.
- P12: interval no longer runs forever. New module flag `tickTimer` +
  `syncTickTimer()` (idempotent, guarded by `tickTimer === null`, gated on
  `engineStarted`): creates the 30s interval only while `state.enabled`,
  clears it on disable. Called from `updateAutoBackupSettings` and at the
  end of `startAutoBackupEngine` (instead of the unconditional
  `setInterval`). `runBackupCycle` tick logic/idempotency untouched;
  localStorage `PersistedState` shape untouched. Note: while disabled,
  `permOk` no longer refreshes every 30s — harmless: the SettingsView
  banner renders only when `autoStatus.enabled`.

## Verification
- `bunx tsc --noEmit` → 0 errors project-wide (filtered and unfiltered).
- `bun run lint` → 0 errors/warnings project-wide.
- `curl localhost:3000/` → HTTP 200; dev.log tail clean (no compile errors).
- Export-surface diff vs originals: imageStorage 11/11 exports identical;
  videoStorage 22/22 identical (+2 additive: WriteAppFolderResult,
  writeFileToAppFolderDetailed); autoBackup 7/7 identical. Only signature
  changes: the two E3-mandated `forget*` (void→boolean, callers ignore).
- DB keys preserved: 'vault-images-dir', 'vault-videos-dir', 'vault-app-dir'.

## Coordination notes for other agents
- R2 (zipBackup.ts): `writeFileToAppFolder` still returns `Promise<boolean>`
  — no change needed on your side. If you want detailed reasons, import
  `writeFileToAppFolderDetailed` from './videoStorage'.
- pdfStorage.ts appears to be a THIRD clone of the FSA pattern (not in my
  scope) — it could now migrate onto fsStorage helpers.
