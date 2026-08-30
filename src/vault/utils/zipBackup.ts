import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { db, CURRENT_SCHEMA_VERSION } from '../db';
import { Note, Lab, GlossaryTerm, StoredPdf, ImportSummary } from '../types';
import { writeFileToAppFolder } from './videoStorage';
import { getAllPdfEntries, savePdfBlob, pdfExtensionFor } from './pdfStorage';
import { ReferenceItem } from '../types';
import { sanitizeHtml } from './sanitizeHtml';
// AUDIT VN-006: Zod validation for every imported entity.
import {
  noteSchema, labSchema, glossarySchema, referenceSchema,
  imageMetaSchema, videoMetaSchema, pdfMetaSchema,
  masterEntrySchema, toolFavoriteSchema, toolRecentSchema,
  inboxItemSchema, reviewItemSchema, rbacModelSchema, flashcardStatSchema,
  tiCacheSchema, onlineActivitySchema, customSigmaRuleSchema,
  savedCveSchema, datasetMetaSchema, validateArray,
} from './backupSchemas';

// ------------------------------------------------------------------
// Backup manifest versioning (spec #35)
// ------------------------------------------------------------------

/** Current backup format version (independent from the Dexie schema version).
 *  Bump this when the on-disk backup ZIP layout changes in a way that older
 *  VaultNotes builds can no longer safely import (e.g. a file is renamed,
 *  a JSON shape changes structurally). */
const BACKUP_FORMAT_VERSION = '3.1.0';

/** Thrown by `importVaultBackup` when the ZIP's manifest declares a
 *  `schemaVersion` higher than the running app's `CURRENT_SCHEMA_VERSION`.
 *  Per spec #35, the importer must NOT partially import an incompatible
 *  backup — it must reject up-front with a clear message so the user knows
 *  to upgrade the app first. */
export class IncompatibleBackupError extends Error {
  readonly backupSchemaVersion: number | undefined;
  readonly backupFormatVersion: string | undefined;
  constructor(backupSchemaVersion: number | undefined, backupFormatVersion: string | undefined) {
    const schemaPart = backupSchemaVersion !== undefined ? ` (backup schema v${backupSchemaVersion} > app v${CURRENT_SCHEMA_VERSION})` : '';
    const formatPart = backupFormatVersion ? `, format ${backupFormatVersion}` : '';
    super(`Incompatible backup version${schemaPart}${formatPart}. Actualiza VaultNotes a la última versión antes de importar este backup.`);
    this.name = 'IncompatibleBackupError';
    this.backupSchemaVersion = backupSchemaVersion;
    this.backupFormatVersion = backupFormatVersion;
  }
}

// ------------------------------------------------------------------
// AUDIT VN-B-010 (HIGH): ZIP-bomb / zip-of-death protection
// ------------------------------------------------------------------

/** Thrown by `validateZipSafety` when a backup ZIP's entry table looks like
 *  a decompression bomb (or a corrupt archive with insane metadata). Thrown
 *  up-front, BEFORE any local data is mutated; the handler in App.tsx
 *  surfaces it as an alert. (Exported so App.tsx can `instanceof`-match it
 *  and show the SPECIFIC Spanish reason — the generic "couldn't read" alert
 *  would mislead the user into thinking their backup is corrupt.) */
export class ZipSafetyError extends Error {
  constructor(reason: string) {
    super(`ZIP potencialmente malicioso o corrupto: ${reason}`);
    this.name = 'ZipSafetyError';
  }
}

/** AUDIT FIX (VN-AUD-003): the per-entry and total WEIGHT caps are BACK.
 *  They had been removed to accommodate "heavy video vaults", but that
 *  justification died with the REGLA DE ORO — videos NEVER travel in ZIP
 *  backups anymore. What remains in a legit backup (notes as markdown,
 *  data-URI images, PDFs) sits far below these limits: a personal vault's
 *  real-world export is a few MB. The caps close the multi-entry bomb gap
 *  the ratio heuristic can't see (many medium entries, each under 1000:1).
 *   - an ENTRY-COUNT ceiling (100k) against absurd/pathological archives;
 *   - a PER-ENTRY uncompressed weight cap (200 MB);
 *   - a TOTAL uncompressed weight cap (2 GB) across all entries;
 *   - the decompression-RATIO heuristic (size-independent, the real
 *     zip-bomb defense): video/PDF payloads are already-compressed data
 *     (ratio ≈ 1:1), so unlimited-weight legit backups pass untouched. */
const ZIP_MAX_ENTRIES = 100000;
const ZIP_MAX_ENTRY_UNCOMPRESSED = 200 * 1024 * 1024; // 200 MB per entry
const ZIP_MAX_TOTAL_UNCOMPRESSED = 2 * 1024 * 1024 * 1024; // 2 GB total
/** Decompression-ratio heuristic: an entry only counts as suspicious when it
 *  BOTH expands more than 1000:1 AND exceeds 10 MB uncompressed. A zero-
 *  filled gzip stream easily reaches ratio 1000, while a legit 10 MB+ text
 *  file rarely exceeds ratio 100 — 1000 avoids false positives. */
const ZIP_MAX_DECOMPRESSION_RATIO = 1000;
const ZIP_RATIO_MIN_UNCOMPRESSED = 10 * 1024 * 1024; // 10 MB

/** Validate the central directory of a loaded ZIP BEFORE any entry is
 *  decompressed and before any IndexedDB mutation. JSZip exposes per-entry
 *  `_data.uncompressedSize` / `_data.compressedSize` (internal but reliable
 *  in jszip 3.x); when the internal shape is unavailable the check for that
 *  entry is skipped rather than crashing. */
function validateZipSafety(zip: JSZip): void {
  const entries: JSZip.JSZipObject[] = [];
  zip.forEach((_, entry) => entries.push(entry));

  if (entries.length > ZIP_MAX_ENTRIES) {
    throw new ZipSafetyError(`demasiadas entradas (${entries.length}, máximo ${ZIP_MAX_ENTRIES})`);
  }

  let totalUncompressed = 0;
  for (const entry of entries) {
    if (entry.dir) continue; // directory placeholders carry no data
    const data = (entry as unknown as {
      _data?: { uncompressedSize?: unknown; compressedSize?: unknown };
    })._data;
    const uncompressedSize = typeof data?.uncompressedSize === 'number'
      ? data.uncompressedSize
      : undefined;
    const compressedSize = typeof data?.compressedSize === 'number'
      ? data.compressedSize
      : undefined;
    // Unexpected internal shape — skip the check for this entry (don't crash).
    if (uncompressedSize === undefined) continue;

    // VN-AUD-003: weight caps — a single entry promising to inflate past
    // 200 MB is either a bomb or a file that was never in a legit backup.
    if (uncompressedSize > ZIP_MAX_ENTRY_UNCOMPRESSED) {
      throw new ZipSafetyError(
        `entrada demasiado grande: "${entry.name}" (` +
        `${Math.round(uncompressedSize / 1024 / 1024)} MB descomprimidos, máximo 200 MB)`
      );
    }
    totalUncompressed += uncompressedSize;

    if (
      compressedSize !== undefined &&
      uncompressedSize > ZIP_RATIO_MIN_UNCOMPRESSED &&
      uncompressedSize / compressedSize > ZIP_MAX_DECOMPRESSION_RATIO
    ) {
      throw new ZipSafetyError(
        `ratio de descompresión sospechoso en "${entry.name}" ` +
        `(${Math.floor(uncompressedSize / compressedSize)}:1 con ${Math.round(uncompressedSize / 1024 / 1024)} MB descomprimidos)`,
      );
    }
  }

  // VN-AUD-003: total ceiling — catches the multi-entry bomb (many medium
  // entries, each under the ratio threshold) before decompression starts.
  if (totalUncompressed > ZIP_MAX_TOTAL_UNCOMPRESSED) {
    throw new ZipSafetyError(
      `peso total descomprimido excesivo (${Math.round(totalUncompressed / 1024 / 1024)} MB, máximo 2048 MB)`
    );
  }
}

/** AUDIT VN-B-016 (LOW): compare two dotted version strings ("3.1.0").
 *  Returns <0 when a < b, 0 when equal, >0 when a > b. Missing or garbage
 *  segments count as 0 so a hand-edited value never false-rejects a backup
 *  (the numeric schemaVersion check remains the hard gate). */
function compareFormatVersions(a: string, b: string): number {
  const pa = a.split('.').map((s) => parseInt(s, 10));
  const pb = b.split('.').map((s) => parseInt(s, 10));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = Number.isFinite(pa[i]) ? pa[i] : 0;
    const nb = Number.isFinite(pb[i]) ? pb[i] : 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}


// ------------------------------------------------------------------
// Smart import helpers (upsert semantics)
// -----------------------------------------------------------------

/** Dedup keys — the same identity rules used by the import flow. */
function noteKey(n: Partial<Note>): string {
  return `${(n.platform || '').trim().toLowerCase()}/${(n.category || '').trim().toLowerCase()}/${(n.title || '').trim().toLowerCase()}`;
}
function labKey(l: Partial<Lab>): string {
  return `${(l.organization || '').trim().toLowerCase()}/${(l.title || '').trim().toLowerCase()}`;
}
function termKey(t: Partial<GlossaryTerm>): string {
  return (t.term || '').trim().toLowerCase();
}

/** Canonical projections used to detect whether an existing item changed. */
function noteProjection(n: Partial<Note>) {
  return JSON.stringify({
    title: n.title || '',
    parentId: n.parentId || null,
    platform: n.platform || '',
    category: n.category || '',
    categories: n.categories || [],
    contentHtml: n.contentHtml || '',
    sourceUrl: n.sourceUrl || '',
    isFavorite: Boolean(n.isFavorite),
  });
}
function labProjection(l: Partial<Lab>) {
  return JSON.stringify({
    title: l.title || '',
    organization: l.organization || '',
    topic: l.topic || '',
    subtopic: l.subtopic || '',
    categories: l.categories || [],
    difficulty: l.difficulty || '',
    status: l.status || '',
    timeSpent: l.timeSpent || '',
    sourceLink: l.sourceLink || '',
    parts: l.parts || [],
    tools: l.tools || [],
    commands: Array.isArray(l.commands) ? l.commands : [],
    findings: l.findings || '',
    mitigation: l.mitigation || '',
    isFavorite: Boolean(l.isFavorite),
  });
}
function termProjection(t: Partial<GlossaryTerm>) {
  return JSON.stringify({
    term: t.term || '',
    acronym: t.acronym || '',
    shortDefinition: t.shortDefinition || '',
    longDefinition: t.longDefinition || '',
    example: t.example || '',
    examples: t.examples || [],
    platform: t.platform || '',
    category: t.category || '',
    categories: t.categories || [],
    sourceUrl: t.sourceUrl || '',
  });
}

function emptySummary(): ImportSummary {
  return {
    addedNotes: 0,
    updatedNotes: 0,
    skippedNotes: 0,
    addedLabs: 0,
    updatedLabs: 0,
    skippedLabs: 0,
    addedTerms: 0,
    updatedTerms: 0,
    skippedTerms: 0,
    addedImages: 0,
    addedPdfs: 0,
    addedReferences: 0,
    // REGLA DE ORO (videos): legacy backup videos deliberately ignored.
    ignoredLegacyVideos: 0,
    // AUDIT VN-001: conflict counters (local newer → preserve, skip).
    conflictNotes: 0,
    conflictLabs: 0,
    conflictTerms: 0,
    conflictReferences: 0,
    // AUDIT VN-006: invalid counters (Zod rejected the row).
    invalidNotes: 0,
    invalidLabs: 0,
    invalidTerms: 0,
    invalidReferences: 0,
    invalidImages: 0,
    invalidPdfs: 0,
    invalidMisc: 0,
    // AUDIT VN-B-012: conflict counters for the upsert-by-id auxiliary
    // tables (an older backup row must not overwrite a newer local row).
    conflictSavedCves: 0,
    conflictCustomSigmaRules: 0,
    conflictDatasetMeta: 0,
    conflictTiCache: 0,
    // AUDIT VN-B-013: imported blobs whose owner note/lab does not exist
    // locally (kept — non-destructive — but reported as orphaned).
    orphanedImages: 0,
    orphanedPdfs: 0,
  };
}

/** Normalize legacy string commands into a string[]. */
function normalizeCommands(raw: unknown): string[] {
  if (typeof raw === 'string') return raw.split('\n').map((s) => s.trim()).filter(Boolean);
  if (Array.isArray(raw)) return raw as string[];
  return [];
}

// Helper to sanitize path strings for zip folders/files
function sanitizeFilename(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
}

export interface ExportResult {
  mode: 'app' | 'file' | 'download';
  savedTo?: string;
}

const BACKUP_FILENAME = 'VaultNotes-Backup.zip';

/** Minimal typings for the File System Access API (not in standard lib.dom). */
interface FSHandleLike {
  name?: string;
  createWritable?: (options?: { keepExistingData?: boolean }) => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
  queryPermission?: (desc: { mode: 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (desc: { mode: 'readwrite' }) => Promise<PermissionState>;
}

async function writeToHandle(handle: FSHandleLike, blob: Blob): Promise<void> {
  const writable = await handle.createWritable!();
  await writable.write(blob);
  await writable.close();
}

/**
 * Exports the vault as a ZIP using real "Save" semantics:
 *  - The first time, the user picks WHERE to save (e.g. Documents).
 *  - Every subsequent export silently OVERWRITES that same file,
 *    so there is always exactly one up-to-date backup.
 * Falls back to a classic fixed-name download on browsers without
 * the File System Access API (Firefox/Safari).
 */
export async function exportVaultZip(): Promise<ExportResult> {
  const zip = new JSZip();

  // BLOB LIFECYCLE / TRASH FIX (Task 2-c, spec #20): include trashed items
  // (isDeleted=true) in the export so the user's trash survives a
  // backup→restore cycle. For labs/glossary/references the flag travels in
  // their JSON files; for NOTES it travels in the .md frontmatter (see the
  // `isDeleted`/`deletedAt` lines below — AUDIT FIX: they were missing, so
  // trashed notes restored as active). The importer respects it on the add
  // branch (see upsertNote/upsertLab/upsertTerm below). On the update branch
  // the importer intentionally does NOT touch `isDeleted`, so importing a
  // backup can never silently un-trash a note the user just trashed locally
  // (non-destructive restore).
  const notes = await db.notes.toArray();
  const labs = await db.labs.toArray();
  const glossary = await db.glossary.toArray();
  const images = await db.images.toArray();
  // REGLA DE ORO (videos): videos are NEVER exported — they live only in
  // the user's videos folder on disk. Nothing video-related is read here.
  const pdfEntries = await getAllPdfEntries();
  const platforms = await db.platforms.toArray();
  const categories = await db.categories.toArray();
  const tools = await db.tools.toArray();
  const flashcardStats = await db.flashcardStats.toArray();
  const references = await db.references.toArray();
  // BLOQUE 5 — preferencias y cola de revisión. Solo metadatos de navegación
  // y texto escrito por el usuario en el Inbox. Nada sensible.
  const rbacModels = await db.rbacModels.toArray();
  const toolFavorites = await db.toolFavorites.toArray();
  const toolRecents = await db.toolRecents.toArray();
  const inboxItems = await db.inboxItems.toArray();
  const reviewItems = await db.reviewItems.toArray();
  // BLOQUE 6 — Online-Optional. ALL of these are exportable: cached threat
  // intel (the user explicitly asked for those results), online activity
  // metadata (IOC TYPE only — never the value), custom Sigma rules
  // (user-imported YAML, treated as data), saved CVEs (user explicitly saved),
  // dataset metadata. API KEYS are NOT here — they live in a separate
  // Dexie DB (VaultIntelDB) and are never serialized to this backup.
  const tiCache = await db.tiCache.toArray();
  const onlineActivity = await db.onlineActivity.toArray();
  const customSigmaRules = await db.customSigmaRules.toArray();
  const savedCves = await db.savedCves.toArray();
  const datasetMeta = await db.datasetMeta.toArray();

  // BACKUP MANIFEST (Task 2-c, spec #35): include both `formatVersion`
  // (the on-disk ZIP layout version) and `schemaVersion` (the Dexie
  // schema version the exporter was running when it wrote the file). The
  // importer reads these and refuses cross-version restores up-front
  // (see `IncompatibleBackupError` above). Older VaultNotes builds that
  // don't yet read these fields simply ignore them and import as before.
  const manifest = {
    appName: 'Vault',
    version: BACKUP_FORMAT_VERSION,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    stats: {
      notesCount: notes.length,
      labsCount: labs.length,
      glossaryCount: glossary.length,
      imagesCount: images.length,
      pdfsCount: pdfEntries.length,
      referencesCount: references.length,
      platformsCount: platforms.length,
      categoriesCount: categories.length,
      toolsCount: tools.length,
      rbacModelsCount: rbacModels.length,
      toolFavoritesCount: toolFavorites.length,
      toolRecentsCount: toolRecents.length,
      inboxItemsCount: inboxItems.length,
      reviewItemsCount: reviewItems.length,
      tiCacheCount: tiCache.length,
      onlineActivityCount: onlineActivity.length,
      customSigmaRulesCount: customSigmaRules.length,
      savedCvesCount: savedCves.length,
    }
  };

  // 1. /manifest.json
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Master definitions
  zip.file('platforms.json', JSON.stringify(platforms, null, 2));
  zip.file('categories.json', JSON.stringify(categories, null, 2));
  zip.file('tools.json', JSON.stringify(tools, null, 2));
  zip.file('flashcardStats.json', JSON.stringify(flashcardStats, null, 2));
  zip.file('references.json', JSON.stringify(references, null, 2));
  // BLOQUE 5 — user prefs & inbox (lightweight JSON, all local metadata/text)
  zip.file('rbacModels.json', JSON.stringify(rbacModels, null, 2));
  zip.file('toolFavorites.json', JSON.stringify(toolFavorites, null, 2));
  zip.file('toolRecents.json', JSON.stringify(toolRecents, null, 2));
  zip.file('inboxItems.json', JSON.stringify(inboxItems, null, 2));
  zip.file('reviewItems.json', JSON.stringify(reviewItems, null, 2));
  // BLOQUE 6 — Online-Optional integrations (NO API KEYS, ever)
  zip.file('tiCache.json', JSON.stringify(tiCache, null, 2));
  zip.file('onlineActivity.json', JSON.stringify(onlineActivity, null, 2));
  zip.file('customSigmaRules.json', JSON.stringify(customSigmaRules, null, 2));
  zip.file('savedCves.json', JSON.stringify(savedCves, null, 2));
  zip.file('datasetMeta.json', JSON.stringify(datasetMeta, null, 2));

  // 2. /glosario/terminos.json
  const glossaryFolder = zip.folder('glosario');
  glossaryFolder?.file('terminos.json', JSON.stringify(glossary, null, 2));

  // 3. /labs/labs.json
  const labsFolder = zip.folder('labs');
  labsFolder?.file('labs.json', JSON.stringify(labs, null, 2));

  // 4. /images/ — embedded images (base64 in IDB). The exporter used to
  //    write ONLY the bytes under `${img.id}.png`, losing the noteId/labId/
  //    caption/mimeType/createdAt metadata. On restore the image landed in
  //    IDB with no owner → it was a permanent orphan (permanent-delete of
  //    the owning note/lab couldn't find it because the noteId was empty).
  //    AUDIT VN-003: now the exporter writes a JSON manifest alongside the
  //    bytes, with the full metadata. The importer reads the manifest and
  //    restores each image with its correct owner + MIME + caption.
  const mimeToExt: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/svg+xml': 'svg',
    'image/x-icon': 'ico',
    'image/avif': 'avif',
  };
  const imagesFolder = zip.folder('images');
  // Manifest with full metadata so the importer can re-associate owners.
  const imageManifest = images.map((img) => ({
    id: img.id,
    noteId: img.noteId ?? null,
    labId: img.labId ?? null,
    name: img.name,
    mimeType: img.mimeType,
    caption: img.caption ?? null,
    createdAt: img.createdAt,
  }));
  zip.file('imagesManifest.json', JSON.stringify(imageManifest, null, 2));
  for (const img of images) {
    try {
      if (img.dataUrl && img.dataUrl.includes(',')) {
        const base64Data = img.dataUrl.split(',')[1];
        // Use the correct extension based on mimeType so a .jpg image is
        // restored as .jpg (the importer's mimeByExt lookup then picks the
        // right MIME). Falls back to png if mimeType is missing/unknown.
        const ext = mimeToExt[img.mimeType] || 'png';
        imagesFolder?.file(`${img.id}.${ext}`, base64Data, { base64: true });
      }
    } catch (err) {
      console.warn('Could not serialize image for zip:', img.id, err);
    }
  }

  // 4b. REGLA DE ORO (videos): the /videos/ folder and videosManifest.json
  //     are GONE from the export — videos never travel in backups. The zip
  //     stays light and portable; the files live in the user's folder.

  // 4c. /pdfs/ — embedded PDFs (Blob-only storage in IDB).
  const pdfsFolder = zip.folder('pdfs');
  const pdfManifest = pdfEntries.map(({ meta }) => meta);
  zip.file('pdfsManifest.json', JSON.stringify(pdfManifest, null, 2));
  for (const { meta, blob } of pdfEntries) {
    if (!blob) {
      console.warn('PDF omitted from backup (no blob available):', meta.id);
      continue;
    }
    try {
      // STORE — same rationale as videos (PDFs are already compressed).
      pdfsFolder?.file(`${meta.id}.${pdfExtensionFor(meta)}`, blob, { compression: 'STORE' });
    } catch (err) {
      console.warn('Could not serialize PDF for zip:', meta.id, err);
    }
  }

  // 5. /apuntes/{plataforma}/{categoria}/{nota.md}
  //    AUDIT FIX (HIGH — backup filename collision): two notes sharing
  //    platform+category+title used to map to the SAME zip path, and
  //    JSZip's `file()` silently REPLACES the earlier entry — the backup
  //    contained one of them while manifest.json counted both (silent
  //    data loss). Every path is now unique: the first note keeps the
  //    clean `${slug}.md` name; any collision appends the note id (the
  //    importer reads the id from the FRONTMATTER, never from the
  //    filename, so this is fully transparent to restores).
  const apuntesFolder = zip.folder('apuntes');
  const usedNotePaths = new Set<string>();
  for (const note of notes) {
    const platSlug = sanitizeFilename(note.platform || 'General');
    const catSlug = sanitizeFilename(note.category || 'Notas');
    const noteSlug = sanitizeFilename(note.title || note.id);

    const basePath = `apuntes/${platSlug}/${catSlug}/`;
    let fileName = `${noteSlug}.md`;
    if (usedNotePaths.has(basePath + fileName)) {
      const idSuffix = sanitizeFilename(note.id);
      let candidate = `${noteSlug}--${idSuffix}.md`;
      let n = 2;
      while (usedNotePaths.has(basePath + candidate)) {
        candidate = `${noteSlug}--${idSuffix}-${n++}.md`;
      }
      fileName = candidate;
    }
    usedNotePaths.add(basePath + fileName);

    const categoriesArr = note.categories && note.categories.length > 0 ? note.categories : [note.category];
    const frontmatter = [
      '---',
      `id: "${note.id}"`,
      `title: "${note.title.replace(/"/g, '\\"')}"`,
      `platform: "${note.platform}"`,
      `category: "${note.category}"`,
      `categories: [${categoriesArr.map(c => `"${c}"`).join(', ')}]`,
      `parentId: "${note.parentId || ''}"`,
      `sourceUrl: "${note.sourceUrl || ''}"`,
      `isFavorite: ${note.isFavorite}`,
      // AUDIT FIX: soft-delete metadata must survive the backup round-trip
      // (parsed back by parseMarkdownWithFrontmatter below). Older backups
      // simply lack these lines and import as before (backward compatible).
      `isDeleted: ${note.isDeleted}`,
      `deletedAt: "${note.deletedAt || ''}"`,
      `createdAt: "${note.createdAt}"`,
      `updatedAt: "${note.updatedAt}"`,
      '---',
      '',
      note.contentHtml
    ].join('\n');

    apuntesFolder?.folder(platSlug)?.folder(catSlug)?.file(fileName, frontmatter);
  }

  // Generate the zip blob once — saving strategy depends on browser support.
  const blob = await zip.generateAsync({ type: 'blob' });

  // --- Preferred: THE APP FOLDER — <app>/VaultNotes-Backup.zip lives with
  //     the app itself, so copying one folder to Drive carries everything. ---
  const wroteToApp = await writeFileToAppFolder(BACKUP_FILENAME, blob).catch(() => false);
  if (wroteToApp) {
    return { mode: 'app', savedTo: BACKUP_FILENAME };
  }

  // --- File System Access API fallback (no app folder configured) ---
  const picker = (window as unknown as {
    showSaveFilePicker?: (opts?: unknown) => Promise<FileSystemFileHandle>;
  }).showSaveFilePicker?.bind(window);

  if (picker) {
    try {
      // 1) Reuse the handle saved from a previous export ("Save" behavior).
      const stored = await db.fileHandles.get('vault-export');
      if (stored) {
        const handle = stored.handle as unknown as FSHandleLike;
        let perm: PermissionState = handle.queryPermission
          ? await handle.queryPermission({ mode: 'readwrite' })
          : 'granted';
        if (perm !== 'granted' && handle.requestPermission) {
          perm = await handle.requestPermission({ mode: 'readwrite' });
        }
        if (perm === 'granted' && handle.createWritable) {
          try {
            await writeToHandle(handle, blob);
            return { mode: 'file', savedTo: handle.name || BACKUP_FILENAME };
          } catch {
            // The file was moved/deleted — fall through to re-picking it.
            await db.fileHandles.delete('vault-export');
          }
        }
      }

      // 2) No previous handle (or it broke): ask the user ONCE where to save.
      const newHandle = (await picker({
        suggestedName: BACKUP_FILENAME,
        types: [{ description: 'VaultNotes Backup', accept: { 'application/zip': ['.zip'] } }],
      })) as unknown as FSHandleLike;

      await writeToHandle(newHandle, blob);
      await db.fileHandles.put({
        id: 'vault-export',
        handle: newHandle as unknown as FileSystemFileHandle,
      });
      return { mode: 'file', savedTo: newHandle.name || BACKUP_FILENAME };
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      if (name === 'AbortError') {
        // User cancelled the save dialog — not an error.
        throw err;
      }
      console.warn('File System Access failed, falling back to download:', err);
    }
  }

  // --- Fallback: classic download with a fixed name (Firefox/Safari) ---
  saveAs(blob, BACKUP_FILENAME);
  return { mode: 'download', savedTo: BACKUP_FILENAME };
}

export async function importVaultBackup(file: File): Promise<ImportSummary> {
  const summary = emptySummary();

  // AUDIT VN-B-013 (MEDIUM): owner references of every blob imported in THIS
  // run (image/pdf with a noteId/labId — videos never import anymore, REGLA
  // DE ORO). Checked for orphanhood AFTER the notes/labs upserts complete —
  // see the orphan-report block below.
  const importedBlobOwners: {
    kind: 'image' | 'pdf';
    noteId?: string;
    labId?: string;
  }[] = [];

  // VERSION-COMPATIBILITY CHECK (Task 2-c, spec #35): read the manifest
  // BEFORE mutating any local data. If the backup's `schemaVersion` is
  // higher than the running app's `CURRENT_SCHEMA_VERSION`, reject with
  // `IncompatibleBackupError` — do NOT partial-import. The handler in
  // App.tsx catches this Error subclass and surfaces the localized
  // "Incompatible backup version" message to the user.
  // JSON-only backups (the legacy single-file flow) have no manifest, so
  // they skip this check and import as before (legacy compatibility).
  // AUDIT LOW FIX (double-parse): previously the ZIP was loaded TWICE —
  // once here just to read the manifest + check the schema version, then
  // AGAIN at the processing step (~line 594) to actually import. For large
  // backups (hundreds of MB of blobs) this doubled decompression time and
  // memory. Now we load ONCE and reuse `zipContents` for processing.
  let zipContents: JSZip | null = null;
  if (file.name.toLowerCase().endsWith('.zip')) {
    try {
      const zip = new JSZip();
      zipContents = await zip.loadAsync(file);
      // AUDIT VN-B-010 (HIGH): zip-bomb gate — inspect the entry table BEFORE
      // decompressing anything (the manifest read included) and BEFORE any
      // local data is touched.
      validateZipSafety(zipContents);
      const manifestFile = zipContents.file('manifest.json');
      if (manifestFile) {
        const manifest = JSON.parse(await manifestFile.async('text')) as {
          schemaVersion?: number;
          formatVersion?: string;
          version?: string;
        };
        const backupSchema = typeof manifest.schemaVersion === 'number'
          ? manifest.schemaVersion
          : undefined;
        if (backupSchema !== undefined && backupSchema > CURRENT_SCHEMA_VERSION) {
          throw new IncompatibleBackupError(backupSchema, manifest.formatVersion || manifest.version);
        }
        // AUDIT VN-B-016 (LOW): guard the on-disk FORMAT version too. A backup
        // written by a NEWER format (renamed/reshaped files inside the ZIP)
        // can't be safely interpreted by this build — same up-front,
        // no-partial-import semantics as the schemaVersion check above.
        // Equal or lower format versions stay importable (older formats are
        // backward compatible). A missing/garbage value never rejects.
        const backupFormat = manifest.formatVersion || manifest.version;
        if (backupFormat && compareFormatVersions(backupFormat, BACKUP_FORMAT_VERSION) > 0) {
          throw new IncompatibleBackupError(backupSchema, backupFormat);
        }
      }
    } catch (err) {
      if (err instanceof IncompatibleBackupError) throw err;
      // AUDIT VN-B-010: a safety rejection must propagate — never fall
      // through to re-loading and importing a malicious archive.
      if (err instanceof ZipSafetyError) throw err;
      // Manifest read / parse failure — fall through to the regular import
      // path, which will itself fail with a clearer error if the ZIP is
      // corrupt. `zipContents` stays null and is re-loaded below only if
      // the file genuinely is a ZIP (defensive: a renamed non-ZIP file).
      zipContents = null;
    }
  }

  // Existing items indexed by ID for upsert lookups.
  // AUDIT VN-002: ID is the primary identity. Previously the importer
  // indexed by content-key (platform/category/title) — two different
  // notes with the same title+platform+category were silently merged
  // into one, dropping the incoming ID and orphaning any blobs that
  // referenced it. Now we index by ID; content-key is kept ONLY for an
  // informational "possible duplicate" warning (never for merging).
  const existingNotes = await db.notes.toArray();
  const notesById = new Map(existingNotes.map((n) => [n.id, n]));
  const existingLabs = await db.labs.toArray();
  const labsById = new Map(existingLabs.map((l) => [l.id, l]));
  const existingGlossary = await db.glossary.toArray();
  const termsById = new Map(existingGlossary.map((t) => [t.id, t]));
  const existingRefIds = new Set((await db.references.toArray()).map((r) => r.id));
  // Logical-duplicate detection (informational only — never merges).
  const localNoteKeys = new Set(existingNotes.map((n) => noteKey(n)));
  const localLabKeys = new Set(existingLabs.map((l) => labKey(l)));
  const localTermKeys = new Set(existingGlossary.map((t) => termKey(t)));

  /** AUDIT VN-001: compare `incoming.updatedAt` vs `existing.updatedAt`.
   *  - existing newer (strict >) → preserve local, count as conflict.
   *  - equal timestamps → skip silently (no duplicate).
   *  - incoming newer (strict >) → safe to overwrite (still gated by an
   *    optional content-projection check below for the "no real changes"
   *    optimization).
   * Missing or unparseable timestamps are treated as 0 (i.e. "infinitely
   * old") — the safe default is to NOT overwrite local data. */
  const safeTs = (s?: string | null): number => {
    if (!s) return 0;
    const t = new Date(s).getTime();
    return Number.isFinite(t) ? t : 0;
  };

  /** AUDIT VN-B-012: resolve a row's recency timestamp for the auxiliary
   *  upsert-by-id tables. Prefers `updatedAt` (mirroring the VN-001 pattern);
   *  falls back to the table's natural timestamp (`savedAt` for saved CVEs,
   *  `retrievedAt` for the TI cache) because those rows historically carry
   *  no `updatedAt` field. Missing/unparseable → 0 ("infinitely old"), the
   *  same safe default as safeTs. */
  const rowTs = (row: unknown, fallbackField?: string): number => {
    const r = (row ?? {}) as Record<string, unknown>;
    const primary = typeof r.updatedAt === 'string' ? r.updatedAt : undefined;
    const fallback = fallbackField !== undefined && typeof r[fallbackField] === 'string'
      ? (r[fallbackField] as string)
      : undefined;
    return safeTs(primary ?? fallback);
  };

  /** Smart upsert (VN-002 + VN-001 + VN-006):
   *  - Zod-validate incoming first (skip + count as invalid on failure).
   *  - If incoming.id matches a local row, compare updatedAt:
   *    * local newer → skip (conflict).
   *    * equal → skip (no duplicate).
   *    * incoming newer → update in place (preserve local ID + isDeleted).
   *  - If no local row with that ID → import as NEW entity with the same
   *    incoming ID (so blob references stay valid). Never merge by
   *    content-key. If the incoming has no ID, generate a fresh one.
   *
   *  Trash-state preservation (Task 2-c, spec #20 — non-destructive
   *  restore):
   *    - ADD branch respects `incoming.isDeleted` so a trashed item that
   *      travels in the backup ZIP stays trashed after import.
   *    - UPDATE branch does NOT touch `isDeleted` (Dexie `update()` is a
   *      merge, so omitting the field preserves the local value). */
  const upsertTerm = async (incoming: Partial<GlossaryTerm>) => {
    // VN-006: Zod validation — reject malformed rows.
    const parsed = glossarySchema.safeParse(incoming);
    if (!parsed.success) {
      summary.invalidTerms++;
      return;
    }
    const valid = parsed.data as GlossaryTerm;
    const id = valid.id;
    const existing = id ? termsById.get(id) : undefined;

    if (!existing) {
      // No local row with this ID → import as new entity (VN-002).
      // Informational: warn if a logical duplicate already exists locally.
      if (id && localTermKeys.has(termKey(valid))) {
        console.warn(`[import] Logical glossary duplicate detected (different IDs, same term text): incoming id=${id} ↔ local term="${valid.term || ''}". Imported as a new entity.`);
      }
      const newId = id || `term-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const cleaned: GlossaryTerm = {
        ...(valid as GlossaryTerm),
        id: newId,
        term: valid.term || 'Término sin nombre',
        longDefinition: valid.longDefinition || '',
        isDeleted: Boolean(valid.isDeleted),
        createdAt: valid.createdAt || new Date().toISOString(),
        updatedAt: valid.updatedAt || new Date().toISOString(),
      };
      await db.glossary.add(cleaned);
      termsById.set(newId, cleaned);
      localTermKeys.add(termKey(cleaned));
      summary.addedTerms++;
      return;
    }

    // VN-001: timestamp comparison.
    const incTs = safeTs(valid.updatedAt);
    const exTs = safeTs(existing.updatedAt);
    if (exTs > incTs) { summary.conflictTerms++; return; }
    if (exTs === incTs) { summary.skippedTerms++; return; }

    // incoming newer — check whether content actually changed (soft skip).
    if (termProjection(existing) === termProjection(valid)) {
      summary.skippedTerms++;
      return;
    }
    // Preserve local ID + isDeleted; apply incoming fields as a merge.
    const update: Partial<GlossaryTerm> = { ...valid, id: existing.id };
    delete update.isDeleted;
    update.updatedAt = valid.updatedAt || new Date().toISOString();
    await db.glossary.update(existing.id, update);
    termsById.set(existing.id, { ...existing, ...update } as GlossaryTerm);
    summary.updatedTerms++;
  };

  const upsertLab = async (incoming: Partial<Lab>) => {
    // VN-006: Zod validation.
    const parsed = labSchema.safeParse(incoming);
    if (!parsed.success) {
      summary.invalidLabs++;
      return;
    }
    const valid = parsed.data as Lab;
    // SECURITY (Audit Task 2-b, spec #26/#42/#44): lab parts' `content` is
    // untrusted HTML (may originate from an imported backup ZIP). Sanitize
    // each part's content at the import boundary — the editor also
    // sanitizes before innerHTML (defense in depth).
    const sanitizedParts = Array.isArray(valid.parts)
      ? valid.parts.map((p) => ({ ...p, content: sanitizeHtml(p?.content) }))
      : valid.parts;
    const normalized: Lab = { ...valid, parts: sanitizedParts as Lab['parts'], commands: normalizeCommands(valid.commands) };
    const id = normalized.id;
    const existing = id ? labsById.get(id) : undefined;

    if (!existing) {
      if (id && localLabKeys.has(labKey(normalized))) {
        console.warn(`[import] Logical lab duplicate detected (different IDs, same title+org): incoming id=${id} ↔ local "${normalized.title || ''}"/"${normalized.organization || ''}". Imported as a new entity.`);
      }
      const newId = id || `lab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const cleaned: Lab = {
        ...(normalized as Lab),
        id: newId,
        title: normalized.title || 'Lab sin título',
        organization: normalized.organization || 'General',
        isDeleted: Boolean(normalized.isDeleted),
        createdAt: normalized.createdAt || new Date().toISOString(),
        updatedAt: normalized.updatedAt || new Date().toISOString(),
      };
      await db.labs.add(cleaned);
      labsById.set(newId, cleaned);
      localLabKeys.add(labKey(cleaned));
      summary.addedLabs++;
      return;
    }

    const incTs = safeTs(normalized.updatedAt);
    const exTs = safeTs(existing.updatedAt);
    if (exTs > incTs) { summary.conflictLabs++; return; }
    if (exTs === incTs) { summary.skippedLabs++; return; }
    if (labProjection(existing) === labProjection(normalized)) { summary.skippedLabs++; return; }

    const update: Partial<Lab> = { ...normalized, id: existing.id };
    delete update.isDeleted;
    update.updatedAt = normalized.updatedAt || new Date().toISOString();
    await db.labs.update(existing.id, update);
    labsById.set(existing.id, { ...existing, ...update } as Lab);
    summary.updatedLabs++;
  };

  const upsertNote = async (incoming: Partial<Note>) => {
    // VN-006: Zod validation.
    const parsed = noteSchema.safeParse(incoming);
    if (!parsed.success) {
      summary.invalidNotes++;
      return;
    }
    const valid = parsed.data as Note;
    const id = valid.id;
    const existing = id ? notesById.get(id) : undefined;

    if (!existing) {
      if (id && localNoteKeys.has(noteKey(valid))) {
        console.warn(`[import] Logical note duplicate detected (different IDs, same platform+category+title): incoming id=${id} ↔ local "${valid.title || ''}". Imported as a new entity.`);
      }
      const newId = id || `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const cleaned: Note = {
        id: newId,
        title: valid.title || 'Nota sin título',
        platform: valid.platform || 'General',
        category: valid.category || 'Notas',
        categories: valid.categories && valid.categories.length > 0 ? valid.categories : [valid.category || 'Notas'],
        parentId: valid.parentId ?? null,
        contentHtml: sanitizeHtml(valid.contentHtml),
        sourceUrl: valid.sourceUrl || '',
        isFavorite: Boolean(valid.isFavorite),
        isDeleted: Boolean(valid.isDeleted),
        // AUDIT FIX: carry the soft-delete timestamp through the ADD branch
        // (only meaningful when isDeleted=true; TrashView sorts/shows it).
        deletedAt: valid.isDeleted ? (valid.deletedAt ?? new Date().toISOString()) : undefined,
        createdAt: valid.createdAt || new Date().toISOString(),
        updatedAt: valid.updatedAt || new Date().toISOString(),
      };
      await db.notes.add(cleaned);
      notesById.set(newId, cleaned);
      localNoteKeys.add(noteKey(cleaned));
      summary.addedNotes++;
      return;
    }

    const incTs = safeTs(valid.updatedAt);
    const exTs = safeTs(existing.updatedAt);
    if (exTs > incTs) { summary.conflictNotes++; return; }
    if (exTs === incTs) { summary.skippedNotes++; return; }
    if (noteProjection(existing) === noteProjection(valid)) { summary.skippedNotes++; return; }

    const update: Partial<Note> = {
      title: valid.title || existing.title,
      platform: valid.platform || existing.platform,
      category: valid.category || existing.category,
      categories: valid.categories && valid.categories.length > 0 ? valid.categories : existing.categories,
      parentId: valid.parentId ?? existing.parentId,
      contentHtml: valid.contentHtml != null ? sanitizeHtml(valid.contentHtml) : existing.contentHtml,
      sourceUrl: valid.sourceUrl || '',
      isFavorite: Boolean(valid.isFavorite),
      updatedAt: valid.updatedAt || new Date().toISOString(),
      id: existing.id,
    };
    delete update.isDeleted;
    await db.notes.update(existing.id, update);
    notesById.set(existing.id, { ...existing, ...update } as Note);
    summary.updatedNotes++;
  };

  if (file.name.endsWith('.json')) {
    const text = await file.text();
    // AUDIT VN-B-017 (LOW): a malformed legacy .json used to throw a raw
    // SyntaxError. Parse defensively and reject with a clear Spanish error
    // BEFORE any local data is mutated (nothing has been written yet — the
    // reads above are non-mutating).
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error(
        `El archivo .json no es válido (JSON malformado): ${
          e instanceof Error ? e.message : 'error de sintaxis'
        }. No se modificó ningún dato local.`,
      );
    }

    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        try {
          if (item.parts || item.organization || item.difficulty) {
            await upsertLab(item);
          } else if (item.term) {
            await upsertTerm(item);
          } else if (item.title && item.platform) {
            await upsertNote(item);
          }
        } catch (e) {
          console.error('Error importing JSON item:', e);
        }
      }
    }
    return summary;
  }

  // ZIP handler — reuse the already-loaded `zipContents` from the manifest
  // check above (AUDIT LOW FIX: avoids re-loading + re-decompressing the
  // same ZIP twice). Falls back to a fresh load only if the manifest step
  // was skipped (e.g. .json path took over then returned, or a renamed
  // non-ZIP file that failed the first load).
  const contents = zipContents ?? (await new JSZip().loadAsync(file));
  // AUDIT VN-B-010: this second gate covers ZIPs that reach this point
  // without the manifest-step validation (a renamed non-.zip file, or a
  // manifest read failure that reset `zipContents`). Re-validating an
  // already-validated archive is a cheap no-op; this is still BEFORE any
  // IndexedDB mutation.
  validateZipSafety(contents);

  // 1. Process glossary
  const glossaryFile = contents.file('glosario/terminos.json');
  if (glossaryFile) {
    try {
      const terms: GlossaryTerm[] = JSON.parse(await glossaryFile.async('text'));
      for (const term of terms) await upsertTerm(term);
    } catch (e) {
      console.error('Error importing glossary JSON from zip:', e);
    }
  }

  // 2. Process Labs
  const labsFile = contents.file('labs/labs.json');
  if (labsFile) {
    try {
      const labsList: Lab[] = JSON.parse(await labsFile.async('text'));
      for (const lab of labsList) await upsertLab(lab);
    } catch (e) {
      console.error('Error importing labs JSON from zip:', e);
    }
  }

  // 3. Flashcard stats (merged, never destructive)
  // AUDIT VN-006: validate via Zod before inserting.
  const statsFile = contents.file('flashcardStats.json');
  if (statsFile) {
    try {
      const rawStats: unknown = JSON.parse(await statsFile.async('text'));
      const { valid: stats, invalid } = validateArray(flashcardStatSchema, rawStats);
      summary.invalidMisc += invalid;
      for (const s of stats) {
        if (s.termId) {
          await db.flashcardStats.put({
            id: s.termId,
            termId: s.termId,
            knownCount: s.knownCount || 0,
            unknownCount: s.unknownCount || 0,
            lastStudiedAt: s.lastStudiedAt || new Date().toISOString(),
            stability: s.stability || 0,
            difficulty: s.difficulty || 5,
            due: s.due || new Date().toISOString(),
            reps: s.reps || 0,
            lapses: s.lapses || 0,
          });
        }
      }
    } catch (e) {
      console.error('Error importing flashcard stats:', e);
    }
  }

  // 3b. References / Resources — AUDIT VN-006 (Zod) + VN-001 (updatedAt).
  // Previously this block was insert-only; with VN-001 we also update when
  // the incoming `updatedAt` is newer, and skip+count as conflict when the
  // local row is newer.
  const refsFile = contents.file('references.json');
  if (refsFile) {
    try {
      const rawRefs: unknown = JSON.parse(await refsFile.async('text'));
      const { valid: refs, invalid } = validateArray(referenceSchema, rawRefs);
      summary.invalidReferences += invalid;
      for (const r of refs as ReferenceItem[]) {
        if (!r.id) continue;
        const existing = existingRefIds.has(r.id) ? await db.references.get(r.id) : undefined;
        if (!existing) {
          await db.references.add({
            ...r,
            // Respect trash-state from backup (Task 2-c, spec #20):
            // a trashed reference must stay trashed after import.
            isDeleted: r.isDeleted ?? false,
            createdAt: r.createdAt || new Date().toISOString(),
            updatedAt: r.updatedAt || new Date().toISOString(),
          });
          existingRefIds.add(r.id);
          summary.addedReferences++;
          continue;
        }
        // VN-001: timestamp comparison.
        const incTs = safeTs(r.updatedAt);
        const exTs = safeTs(existing.updatedAt);
        if (exTs > incTs) { summary.conflictReferences++; continue; }
        if (exTs === incTs) { continue; }
        // incoming newer → update (preserve local id + isDeleted).
        const update: Partial<ReferenceItem> = { ...r, id: existing.id };
        delete update.isDeleted;
        update.updatedAt = r.updatedAt || new Date().toISOString();
        await db.references.update(existing.id, update);
      }
    } catch (e) {
      console.error('Error importing references:', e);
    }
  }

  // 3c. Master definitions — platforms / categories / tools. The exporter
  // writes them; without these import handlers, a user who added a custom
  // platform on device A would lose it on restore to device B. Insert
  // -only by id (non-destructive: a same-id row is NOT overwritten so
  // locally-renamed master entries keep their local name).
  // AUDIT VN-006: validate via Zod before inserting.
  try {
    const platsFile = contents.file('platforms.json');
    if (platsFile) {
      const rawRows: unknown = JSON.parse(await platsFile.async('text'));
      const { valid: rows, invalid } = validateArray(masterEntrySchema, rawRows);
      summary.invalidMisc += invalid;
      for (const r of rows) {
        const existing = await db.platforms.get(r.id);
        if (!existing) {
          await db.platforms.add({
            id: r.id,
            name: String(r.name || ''),
            createdAt: r.createdAt || new Date().toISOString(),
          });
        }
      }
    }
  } catch (e) {
    console.error('Error importing platforms:', e);
  }
  try {
    const catsFile = contents.file('categories.json');
    if (catsFile) {
      const rawRows: unknown = JSON.parse(await catsFile.async('text'));
      const { valid: rows, invalid } = validateArray(masterEntrySchema, rawRows);
      summary.invalidMisc += invalid;
      for (const r of rows) {
        const existing = await db.categories.get(r.id);
        if (!existing) {
          await db.categories.add({
            id: r.id,
            name: String(r.name || ''),
            createdAt: r.createdAt || new Date().toISOString(),
          });
        }
      }
    }
  } catch (e) {
    console.error('Error importing categories:', e);
  }
  try {
    const toolsFile = contents.file('tools.json');
    if (toolsFile) {
      const rawRows: unknown = JSON.parse(await toolsFile.async('text'));
      const { valid: rows, invalid } = validateArray(masterEntrySchema, rawRows);
      summary.invalidMisc += invalid;
      for (const r of rows) {
        const existing = await db.tools.get(r.id);
        if (!existing) {
          await db.tools.add({
            id: r.id,
            name: String(r.name || ''),
            createdAt: r.createdAt || new Date().toISOString(),
          });
        }
      }
    }
  } catch (e) {
    console.error('Error importing tools:', e);
  }

  // 4. Process images — AUDIT VN-003: read the manifest FIRST so we can
  //    restore each image with its real owner (noteId/labId), caption, and
  //    MIME type. Without this, restored images had no owner and were
  //    permanent orphans in IndexedDB (the per-note/per-lab permanent
  //    delete cleanup queries by noteId/labId and found nothing).
  //    AUDIT VN-006: validate manifest entries via Zod.
  const imagesFolder = contents.folder('images');
  if (imagesFolder) {
    // Read manifest first (if present — older backups don't have it).
    const imageMetaById: Map<string, { noteId?: string | null; labId?: string | null; name?: string; mimeType?: string; caption?: string | null; createdAt?: string }> = new Map();
    try {
      const imgManifestFile = contents.file('imagesManifest.json');
      if (imgManifestFile) {
        const rawManifest: unknown = JSON.parse(await imgManifestFile.async('text'));
        const { valid: metas, invalid } = validateArray(imageMetaSchema, rawManifest);
        summary.invalidImages += invalid;
        for (const m of metas) {
          imageMetaById.set(m.id, {
            noteId: m.noteId ?? undefined,
            labId: m.labId ?? undefined,
            name: m.name,
            mimeType: m.mimeType,
            caption: m.caption,
            createdAt: m.createdAt,
          });
        }
      }
    } catch (e) {
      console.error('Error reading imagesManifest.json (will fall back to extension-based MIME detection):', e);
    }

    const imageFiles: JSZip.JSZipObject[] = [];
    imagesFolder.forEach((_, fileObj) => {
      if (!fileObj.dir) imageFiles.push(fileObj);
    });

    for (const imgFile of imageFiles) {
      try {
        const base64 = await imgFile.async('base64');
        const imgId = imgFile.name.replace(/^images\//, '').replace(/\.[^.]+$/, '');
        // Prefer manifest metadata; fall back to extension-based detection
        // for older backups that don't have imagesManifest.json.
        const meta = imageMetaById.get(imgId);
        const ext = imgFile.name.split('.').pop()?.toLowerCase() || '';
        const mimeByExt: Record<string, string> = {
          png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
          gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
          svg: 'image/svg+xml', ico: 'image/x-icon', avif: 'image/avif',
        };
        const mimeType = meta?.mimeType || mimeByExt[ext] || 'image/png';
        const dataUrl = `data:${mimeType};base64,${base64}`;
        const exists = await db.images.get(imgId);
        if (!exists) {
          await db.images.add({
            id: imgId,
            // VN-003: associate the image with its real owner so the
            // per-note/per-lab permanent-delete cleanup finds it.
            noteId: meta?.noteId || undefined,
            labId: meta?.labId || undefined,
            name: meta?.name || imgFile.name,
            mimeType,
            dataUrl,
            caption: meta?.caption || undefined,
            createdAt: meta?.createdAt || new Date().toISOString(),
          });
          summary.addedImages++;
          // AUDIT VN-B-013: remember the owner reference for the post-import
          // orphan check (after notes/labs upserts complete, below).
          if (meta?.noteId || meta?.labId) {
            importedBlobOwners.push({
              kind: 'image',
              noteId: meta?.noteId || undefined,
              labId: meta?.labId || undefined,
            });
          }
        }
      } catch (err) {
        console.warn('Error reading image from zip:', imgFile.name, err);
      }
    }
  }

  // 4. REGLA DE ORO (videos): videos found in a LEGACY backup are
  //    deliberately IGNORED — they never travel in backups anymore and live
  //    only in the user's videos folder on disk. We still parse the manifest
  //    (when present) to count them and surface the number in the import
  //    report, so the user understands why those embeds may show the
  //    "re-link" placeholder after the restore.
  const videosManifestFile = contents.file('videosManifest.json');
  if (videosManifestFile) {
    try {
      const rawVideoMetas: unknown = JSON.parse(await videosManifestFile.async('text'));
      const { valid: videoMetas, invalid: invalidVideoMetas } = validateArray(videoMetaSchema, rawVideoMetas);
      summary.ignoredLegacyVideos = videoMetas.length + invalidVideoMetas;
    } catch (e) {
      console.warn('Error reading legacy videos manifest (ignored):', e);
    }
  }

  // 4b. Process PDFs (blobs + manifest) — non-destructive upsert by id.
  //     Restored PDFs land directly in IndexedDB as Blobs.
  //     AUDIT VN-006: validate the manifest via Zod before iterating.
  const pdfsManifestFile = contents.file('pdfsManifest.json');
  if (pdfsManifestFile) {
    try {
      const rawPdfMetas: unknown = JSON.parse(await pdfsManifestFile.async('text'));
      const { valid: pdfMetas, invalid } = validateArray(pdfMetaSchema, rawPdfMetas);
      summary.invalidPdfs += invalid;
      for (const meta of pdfMetas as Partial<StoredPdf>[]) {
        if (!meta.id) continue;
        try {
          const existing = await db.pdfs.get(meta.id);
          if (existing) continue; // already have this exact PDF
          const ext = pdfExtensionFor(meta as { name?: string; mimeType?: string });
          const pdfFile = contents.file(`pdfs/${meta.id}.${ext}`);
          if (!pdfFile) continue;
          const rawBlob = await pdfFile.async('blob');
          const typedBlob = new Blob([rawBlob], { type: 'application/pdf' });
          await savePdfBlob({
            id: meta.id,
            noteId: meta.noteId,
            labId: meta.labId,
            name: meta.name || 'document.pdf',
            mimeType: 'application/pdf',
            blob: typedBlob,
            caption: meta.caption,
            createdAt: meta.createdAt,
          });
          summary.addedPdfs++;
          // AUDIT VN-B-013: owner reference for the orphan check below.
          if (meta.noteId || meta.labId) {
            importedBlobOwners.push({
              kind: 'pdf',
              noteId: meta.noteId,
              labId: meta.labId,
            });
          }
        } catch (err) {
          console.warn('Error importing PDF:', meta.id, err);
        }
      }
    } catch (e) {
      console.error('Error importing PDFs manifest:', e);
    }
  }

  // 5. Process notes in apuntes folder
  const noteEntries: JSZip.JSZipObject[] = [];
  contents.forEach((path, fileObj) => {
    if (!fileObj.dir && path.startsWith('apuntes/') && path.endsWith('.md')) {
      noteEntries.push(fileObj);
    }
  });

  for (const noteEntry of noteEntries) {
    try {
      const rawText = await noteEntry.async('text');
      const note = parseMarkdownWithFrontmatter(rawText);
      await upsertNote(note);
    } catch (e) {
      console.error('Error importing note file:', noteEntry.name, e);
    }
  }

  // AUDIT VN-B-013 (MEDIUM): orphaned-blob reporting (NON-destructive).
  // Blobs imported above can carry a noteId/labId pointing at an owner that
  // doesn't exist locally and isn't in this backup (e.g. the note was
  // permanently deleted before the backup was taken). They are KEPT — data
  // preservation first, we never delete or skip the blob — but counted here
  // so the ImportReportModal can tell the user instead of accumulating
  // invisible orphans forever.
  if (importedBlobOwners.length > 0) {
    // Reuse the upsert maps (kept current by upsertNote/upsertLab above)
    // instead of re-reading the FULL notes/labs tables — after importing
    // thousands of rows that second full read materialized every note's
    // contentHtml again just to collect the IDs.
    const localNoteIds = new Set(notesById.keys());
    const localLabIds = new Set(labsById.keys());
    for (const owner of importedBlobOwners) {
      const noteExists = owner.noteId ? localNoteIds.has(owner.noteId) : false;
      const labExists = owner.labId ? localLabIds.has(owner.labId) : false;
      if (noteExists || labExists) continue;
      if (owner.kind === 'image') summary.orphanedImages++;
      else summary.orphanedPdfs++;
    }
  }

  // 6. BLOQUE 5 — restore user prefs & queues (best-effort, non-destructive upsert).
  // AUDIT VN-006: validate each row via Zod before inserting.
  // RBAC scenarios
  try {
    const rbacFile = contents.file('rbacModels.json');
    if (rbacFile) {
      const rawModels: unknown = JSON.parse(await rbacFile.async('text'));
      const { valid: models, invalid } = validateArray(rbacModelSchema, rawModels);
      summary.invalidMisc += invalid;
      for (const m of models) {
        const existing = await db.rbacModels.get(m.id);
        if (!existing) {
          await db.rbacModels.add({
            id: m.id,
            name: m.name || 'Imported scenario',
            // Zod's optional-nullable yields `string | null | undefined`;
            // Dexie's RbacModel.description is `string | undefined`. Normalize.
            description: m.description ?? undefined,
            model: m.model || '{}',
            createdAt: m.createdAt || new Date().toISOString(),
            updatedAt: m.updatedAt || new Date().toISOString(),
          });
        }
      }
    }
  } catch (e) {
    console.error('Error importing rbacModels:', e);
  }

  // Tool favorites — replace-by-toolId (no orphan duplicates).
  try {
    const favFile = contents.file('toolFavorites.json');
    if (favFile) {
      const rawFavs: unknown = JSON.parse(await favFile.async('text'));
      const { valid: favs, invalid } = validateArray(toolFavoriteSchema, rawFavs);
      summary.invalidMisc += invalid;
      for (const f of favs) {
        const existing = await db.toolFavorites.get(f.toolId);
        if (!existing) {
          await db.toolFavorites.add({
            toolId: f.toolId,
            addedAt: f.addedAt || new Date().toISOString(),
          });
        }
      }
    }
  } catch (e) {
    console.error('Error importing toolFavorites:', e);
  }

  // Tool recents — replace-by-toolId, keep the latest lastUsedAt.
  try {
    const recFile = contents.file('toolRecents.json');
    if (recFile) {
      const rawRecs: unknown = JSON.parse(await recFile.async('text'));
      const { valid: recs, invalid } = validateArray(toolRecentSchema, rawRecs);
      summary.invalidMisc += invalid;
      for (const r of recs) {
        const existing = await db.toolRecents.get(r.toolId);
        if (!existing) {
          await db.toolRecents.add({
            toolId: r.toolId,
            lastUsedAt: r.lastUsedAt || new Date().toISOString(),
          });
        } else if (new Date(r.lastUsedAt || 0) > new Date(existing.lastUsedAt || 0)) {
          await db.toolRecents.update(r.toolId, { lastUsedAt: r.lastUsedAt });
        }
      }
    }
  } catch (e) {
    console.error('Error importing toolRecents:', e);
  }

  // Inbox items — insert-only by id (non-destructive).
  try {
    const inboxFile = contents.file('inboxItems.json');
    if (inboxFile) {
      const rawItems: unknown = JSON.parse(await inboxFile.async('text'));
      const { valid: items, invalid } = validateArray(inboxItemSchema, rawItems);
      summary.invalidMisc += invalid;
      for (const it of items) {
        const existing = await db.inboxItems.get(it.id);
        if (!existing) {
          await db.inboxItems.add({
            id: it.id,
            content: it.content || '',
            createdAt: it.createdAt || new Date().toISOString(),
            // Zod returns string|null|undefined; Dexie wants the discriminated
            // union | null. The schema already accepted the value; cast is safe.
            convertedTo: (it.convertedTo ?? null) as 'note' | 'glossary' | 'reference' | 'task' | null,
            convertedAt: it.convertedAt ?? null,
            isTask: it.isTask ?? false,
          });
        }
      }
    }
  } catch (e) {
    console.error('Error importing inboxItems:', e);
  }

  // Review items — insert-only by id (non-destructive).
  try {
    const reviewFile = contents.file('reviewItems.json');
    if (reviewFile) {
      const rawItems: unknown = JSON.parse(await reviewFile.async('text'));
      const { valid: items, invalid } = validateArray(reviewItemSchema, rawItems);
      summary.invalidMisc += invalid;
      for (const it of items) {
        const existing = await db.reviewItems.get(it.id);
        if (!existing) {
          await db.reviewItems.add({
            id: it.id,
            // Zod schema accepts any string; cast back to the literal union
            // (data was originally written by the app with one of these).
            itemType: (it.itemType || 'note') as 'note' | 'lab' | 'glossary',
            itemId: it.itemId ?? '',
            addedAt: it.addedAt || new Date().toISOString(),
            status: (it.status || 'pending') as 'pending' | 'reviewed',
            nextReviewAt: it.nextReviewAt || new Date().toISOString(),
          });
        }
      }
    }
  } catch (e) {
    console.error('Error importing reviewItems:', e);
  }

  // BLOQUE 6 — Online-Optional integration tables. All best-effort,
  //  non-destructive. API KEYS are NEVER imported — they don't exist in the
  //  backup at all (they live in the separate VaultIntelDB).
  //  AUDIT VN-006: validate each row via Zod before inserting.
  // tiCache — upsert by id (cache can be overwritten; it's just a cache).
  try {
    const tiCacheFile = contents.file('tiCache.json');
    if (tiCacheFile) {
      const rawRows: unknown = JSON.parse(await tiCacheFile.async('text'));
      const { valid: rows, invalid } = validateArray(tiCacheSchema, rawRows);
      summary.invalidMisc += invalid;
      for (const r of rows) {
        // AUDIT VN-B-012: mirror the references conflict pattern — a fresher
        // local cache entry (retrievedAt) is never replaced by a staler
        // backup row.
        const existing = await db.tiCache.get(r.id);
        if (existing && rowTs(existing, 'retrievedAt') > rowTs(r, 'retrievedAt')) {
          summary.conflictTiCache++;
          continue;
        }
        await db.tiCache.put({
          id: r.id,
          provider: String(r.provider || ''),
          iocType: String(r.iocType || ''),
          iocValue: String(r.iocValue || ''),
          resultJson: r.resultJson ?? null,
          errorMessage: r.errorMessage ?? null,
          retrievedAt: r.retrievedAt || new Date().toISOString(),
          expiresAt: r.expiresAt || new Date().toISOString(),
        });
      }
    }
  } catch (e) {
    console.error('Error importing tiCache:', e);
  }

  // onlineActivity — insert-only by id (history append semantics).
  try {
    const oaFile = contents.file('onlineActivity.json');
    if (oaFile) {
      const rawRows: unknown = JSON.parse(await oaFile.async('text'));
      const { valid: rows, invalid } = validateArray(onlineActivitySchema, rawRows);
      summary.invalidMisc += invalid;
      for (const r of rows) {
        const existing = await db.onlineActivity.get(r.id);
        if (!existing) {
          await db.onlineActivity.add({
            id: r.id,
            provider: String(r.provider || ''),
            iocType: String(r.iocType || ''),
            timestamp: r.timestamp || new Date().toISOString(),
            status: (r.status || 'success') as 'success' | 'error' | 'cached' | 'not_configured' | 'offline',
            note: r.note ?? undefined,
          });
        }
      }
    }
  } catch (e) {
    console.error('Error importing onlineActivity:', e);
  }

  // customSigmaRules — upsert by id (user-authored; latest wins).
  try {
    const csrFile = contents.file('customSigmaRules.json');
    if (csrFile) {
      const rawRows: unknown = JSON.parse(await csrFile.async('text'));
      const { valid: rows, invalid } = validateArray(customSigmaRuleSchema, rawRows);
      summary.invalidMisc += invalid;
      for (const r of rows) {
        // AUDIT VN-B-012: an older backup row must not overwrite a newer
        // local edit of a user-authored Sigma rule.
        const existing = await db.customSigmaRules.get(r.id);
        if (existing && rowTs(existing) > rowTs(r)) {
          summary.conflictCustomSigmaRules++;
          continue;
        }
        await db.customSigmaRules.put({
          id: r.id,
          ruleUuid: r.ruleUuid ?? undefined,
          title: String(r.title || ''),
          status: String(r.status || ''),
          level: String(r.level || ''),
          description: String(r.description || ''),
          author: String(r.author || ''),
          date: String(r.date || ''),
          logsource: String(r.logsource || ''),
          detection: String(r.detection || ''),
          tags: Array.isArray(r.tags) ? r.tags : [],
          mitre: Array.isArray(r.mitre) ? r.mitre : [],
          yaml: String(r.yaml || ''),
          importedAt: r.importedAt || new Date().toISOString(),
          updatedAt: r.updatedAt || new Date().toISOString(),
        });
      }
    }
  } catch (e) {
    console.error('Error importing customSigmaRules:', e);
  }

  // savedCves — upsert by id (CVE ids are stable; user may edit personalNotes).
  try {
    const scFile = contents.file('savedCves.json');
    if (scFile) {
      const rawRows: unknown = JSON.parse(await scFile.async('text'));
      const { valid: rows, invalid } = validateArray(savedCveSchema, rawRows);
      summary.invalidMisc += invalid;
      for (const r of rows) {
        // AUDIT VN-B-012: importing an old backup must not silently wipe the
        // user's hand-written personalNotes / personalAssessment on a saved
        // CVE. `savedAt` is the row's recency timestamp (no updatedAt field).
        const existing = await db.savedCves.get(r.id);
        if (existing && rowTs(existing, 'savedAt') > rowTs(r, 'savedAt')) {
          summary.conflictSavedCves++;
          continue;
        }
        await db.savedCves.put({
          id: r.id,
          description: String(r.description || ''),
          cvss: r.cvss ?? null,
          severity: r.severity ?? null,
          cwe: Array.isArray(r.cwe) ? r.cwe : [],
          affectedProducts: Array.isArray(r.affectedProducts) ? r.affectedProducts : [],
          published: String(r.published || ''),
          modified: String(r.modified || ''),
          references: Array.isArray(r.references) ? r.references : [],
          personalNotes: r.personalNotes ?? '',
          tags: Array.isArray(r.tags) ? r.tags : [],
          personalAssessment: r.personalAssessment ?? '',
          savedAt: r.savedAt || new Date().toISOString(),
        });
      }
    }
  } catch (e) {
    console.error('Error importing savedCves:', e);
  }

  // datasetMeta — upsert the singleton row.
  try {
    const dmFile = contents.file('datasetMeta.json');
    if (dmFile) {
      const rawRows: unknown = JSON.parse(await dmFile.async('text'));
      const { valid: rows, invalid } = validateArray(datasetMetaSchema, rawRows);
      summary.invalidMisc += invalid;
      for (const r of rows) {
        // AUDIT VN-B-012: same conflict pattern for the dataset singleton —
        // a newer local sync timestamp wins over the backup row.
        const existing = await db.datasetMeta.get(r.id);
        if (existing && rowTs(existing) > rowTs(r)) {
          summary.conflictDatasetMeta++;
          continue;
        }
        await db.datasetMeta.put({
          id: r.id,
          mitreVersion: String(r.mitreVersion || ''),
          mitreLastSync: r.mitreLastSync ?? null,
          sigmaVersion: String(r.sigmaVersion || ''),
          sigmaLastSync: r.sigmaLastSync ?? null,
          sigmaRulesCount: Number(r.sigmaRulesCount) || 0,
          updatedAt: r.updatedAt || new Date().toISOString(),
        });
      }
    }
  } catch (e) {
    console.error('Error importing datasetMeta:', e);
  }

  return summary;
}

function parseMarkdownWithFrontmatter(text: string): Partial<Note> {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return {
      title: 'Nota importada',
      // SECURITY (Audit Task 2-b, spec #26/#42/#44): raw text from an
      // imported .md file inside a backup ZIP is untrusted. Sanitize at
      // the import boundary so stored contentHtml is clean (defense in
      // depth — the editor also sanitizes before innerHTML).
      contentHtml: sanitizeHtml(text)
    };
  }

  const frontmatterStr = match[1];
  const content = match[2];

  const note: Partial<Note> = {
    contentHtml: sanitizeHtml(content)
  };

  const lines = frontmatterStr.split(/\r?\n/);
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.substring(0, colonIdx).trim();
    let val = line.substring(colonIdx + 1).trim();

    // Strip quotes
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }

    if (key === 'id') note.id = val;
    else if (key === 'title') note.title = val;
    else if (key === 'platform') note.platform = val;
    else if (key === 'category') note.category = val;
    else if (key === 'parentId') note.parentId = val || null;
    else if (key === 'sourceUrl') note.sourceUrl = val;
    else if (key === 'isFavorite') note.isFavorite = val === 'true';
    // AUDIT FIX: soft-delete metadata written by the exporter since the
    // isDeleted/deletedAt frontmatter lines exist. Older backups without
    // these keys keep the previous behavior (import as active note).
    else if (key === 'isDeleted') note.isDeleted = val === 'true';
    else if (key === 'deletedAt') note.deletedAt = val || undefined;
    else if (key === 'createdAt') note.createdAt = val;
    else if (key === 'updatedAt') note.updatedAt = val;
    else if (key === 'categories') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) note.categories = parsed;
      } catch {
        note.categories = val.replace(/[\[\]"]/g, '').split(',').map(t => t.trim()).filter(Boolean);
      }
    }
  }

  return note;
}
