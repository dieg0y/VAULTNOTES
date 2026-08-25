import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { db } from '../db';
import { Note, Lab, GlossaryTerm, StoredImage, StoredVideo, ImportSummary, FlashcardStat } from '../types';
import { getAllVideoEntries, saveVideoBlob, videoExtensionFor, writeFileToAppFolder } from './videoStorage';

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
    addedVideos: 0,
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

  const notes = await db.notes.filter(n => !n.isDeleted).toArray();
  const labs = await db.labs.filter(l => !l.isDeleted).toArray();
  const glossary = await db.glossary.filter(g => !g.isDeleted).toArray();
  const images = await db.images.toArray();
  const videoEntries = await getAllVideoEntries(); // disk folder + IDB, merged
  const platforms = await db.platforms.toArray();
  const categories = await db.categories.toArray();
  const tools = await db.tools.toArray();
  const flashcardStats = await db.flashcardStats.toArray();

  const manifest = {
    appName: 'Vault',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    stats: {
      notesCount: notes.length,
      labsCount: labs.length,
      glossaryCount: glossary.length,
      imagesCount: images.length,
      videosCount: videoEntries.length,
      platformsCount: platforms.length,
      categoriesCount: categories.length,
      toolsCount: tools.length,
    }
  };

  // 1. /manifest.json
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Master definitions
  zip.file('platforms.json', JSON.stringify(platforms, null, 2));
  zip.file('categories.json', JSON.stringify(categories, null, 2));
  zip.file('tools.json', JSON.stringify(tools, null, 2));
  zip.file('flashcardStats.json', JSON.stringify(flashcardStats, null, 2));

  // 2. /glosario/terminos.json
  const glossaryFolder = zip.folder('glosario');
  glossaryFolder?.file('terminos.json', JSON.stringify(glossary, null, 2));

  // 3. /labs/labs.json
  const labsFolder = zip.folder('labs');
  labsFolder?.file('labs.json', JSON.stringify(labs, null, 2));

  // 4. /images/
  const imagesFolder = zip.folder('images');
  for (const img of images) {
    try {
      if (img.dataUrl && img.dataUrl.includes(',')) {
        const base64Data = img.dataUrl.split(',')[1];
        imagesFolder?.file(`${img.id}.png`, base64Data, { base64: true });
      }
    } catch (err) {
      console.warn('Could not serialize image for zip:', img.id, err);
    }
  }

  // 4b. /videos/ — embedded videos from BOTH storages (disk folder + IDB):
  // the .zip stays fully portable regardless of where the bytes live.
  const videosFolder = zip.folder('videos');
  const videoManifest = videoEntries.map(({ meta }) => meta);
  zip.file('videosManifest.json', JSON.stringify(videoManifest, null, 2));
  for (const { meta, blob } of videoEntries) {
    if (!blob) {
      console.warn('Video omitted from backup (no access to disk file):', meta.id);
      continue;
    }
    try {
      videosFolder?.file(`${meta.id}.${videoExtensionFor(meta)}`, blob);
    } catch (err) {
      console.warn('Could not serialize video for zip:', meta.id, err);
    }
  }

  // 5. /apuntes/{plataforma}/{categoria}/{nota.md}
  const apuntesFolder = zip.folder('apuntes');
  for (const note of notes) {
    const platSlug = sanitizeFilename(note.platform || 'General');
    const catSlug = sanitizeFilename(note.category || 'Notas');
    const noteSlug = sanitizeFilename(note.title || note.id);

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
      `createdAt: "${note.createdAt}"`,
      `updatedAt: "${note.updatedAt}"`,
      '---',
      '',
      note.contentHtml
    ].join('\n');

    apuntesFolder?.folder(platSlug)?.folder(catSlug)?.file(`${noteSlug}.md`, frontmatter);
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

  // Existing items indexed by dedup key for upsert lookups.
  const existingNotes = await db.notes.toArray();
  const notesByKey = new Map(existingNotes.map((n) => [noteKey(n), n]));
  const existingLabs = await db.labs.toArray();
  const labsByKey = new Map(existingLabs.map((l) => [labKey(l), l]));
  const existingGlossary = await db.glossary.toArray();
  const termsByKey = new Map(existingGlossary.map((t) => [termKey(t), t]));

  /** Smart upsert: new → add · changed → update only that item · identical → skip. */
  const upsertTerm = async (incoming: Partial<GlossaryTerm>) => {
    const key = termKey(incoming);
    const existing = termsByKey.get(key);
    if (!existing) {
      const id = incoming.id || `term-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.glossary.add({
        ...(incoming as GlossaryTerm),
        id,
        isDeleted: false,
        createdAt: incoming.createdAt || new Date().toISOString(),
        updatedAt: incoming.updatedAt || new Date().toISOString(),
      });
      termsByKey.set(key, incoming as GlossaryTerm);
      summary.addedTerms++;
      return;
    }
    if (termProjection(existing) === termProjection(incoming)) {
      summary.skippedTerms++;
      return;
    }
    await db.glossary.update(existing.id, {
      ...incoming,
      id: existing.id,
      isDeleted: false,
      updatedAt: incoming.updatedAt || new Date().toISOString(),
    } as Partial<GlossaryTerm>);
    termsByKey.set(key, { ...existing, ...incoming } as GlossaryTerm);
    summary.updatedTerms++;
  };

  const upsertLab = async (incoming: Partial<Lab>) => {
    const key = labKey(incoming);
    const existing = labsByKey.get(key);
    const normalized: Partial<Lab> = { ...incoming, commands: normalizeCommands(incoming.commands) };
    if (!existing) {
      const id = normalized.id || `lab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.labs.add({
        ...(normalized as Lab),
        id,
        isDeleted: false,
        createdAt: normalized.createdAt || new Date().toISOString(),
        updatedAt: normalized.updatedAt || new Date().toISOString(),
      });
      labsByKey.set(key, normalized as Lab);
      summary.addedLabs++;
      return;
    }
    if (labProjection(existing) === labProjection(normalized)) {
      summary.skippedLabs++;
      return;
    }
    await db.labs.update(existing.id, {
      ...normalized,
      id: existing.id,
      isDeleted: false,
      updatedAt: normalized.updatedAt || new Date().toISOString(),
    } as Partial<Lab>);
    labsByKey.set(key, { ...existing, ...normalized } as Lab);
    summary.updatedLabs++;
  };

  const upsertNote = async (incoming: Partial<Note>) => {
    const key = noteKey(incoming);
    const existing = notesByKey.get(key);
    if (!existing) {
      const id = incoming.id || `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.notes.add({
        id,
        title: incoming.title || 'Nota sin título',
        platform: incoming.platform || 'General',
        category: incoming.category || 'Notas',
        categories: incoming.categories || [incoming.category || 'Notas'],
        parentId: incoming.parentId || null,
        contentHtml: incoming.contentHtml || '',
        sourceUrl: incoming.sourceUrl || '',
        isFavorite: Boolean(incoming.isFavorite),
        isDeleted: false,
        createdAt: incoming.createdAt || new Date().toISOString(),
        updatedAt: incoming.updatedAt || new Date().toISOString(),
      });
      notesByKey.set(key, incoming as Note);
      summary.addedNotes++;
      return;
    }
    if (noteProjection(existing) === noteProjection(incoming)) {
      summary.skippedNotes++;
      return;
    }
    await db.notes.update(existing.id, {
      title: incoming.title || existing.title,
      platform: incoming.platform || existing.platform,
      category: incoming.category || existing.category,
      categories: incoming.categories || existing.categories,
      parentId: incoming.parentId ?? existing.parentId,
      contentHtml: incoming.contentHtml ?? existing.contentHtml,
      sourceUrl: incoming.sourceUrl || '',
      isFavorite: Boolean(incoming.isFavorite),
      isDeleted: false,
      updatedAt: incoming.updatedAt || new Date().toISOString(),
    });
    notesByKey.set(key, { ...existing, ...incoming } as Note);
    summary.updatedNotes++;
  };

  if (file.name.endsWith('.json')) {
    const text = await file.text();
    const parsed = JSON.parse(text);

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

  // ZIP handler
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);

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
  const statsFile = contents.file('flashcardStats.json');
  if (statsFile) {
    try {
      const stats: FlashcardStat[] = JSON.parse(await statsFile.async('text'));
      for (const s of stats) {
        if (s && s.termId) {
          await db.flashcardStats.put({
            id: s.termId,
            termId: s.termId,
            knownCount: s.knownCount || 0,
            unknownCount: s.unknownCount || 0,
            lastStudiedAt: s.lastStudiedAt || new Date().toISOString(),
          });
        }
      }
    } catch (e) {
      console.error('Error importing flashcard stats:', e);
    }
  }

  // 4. Process images
  const imagesFolder = contents.folder('images');
  if (imagesFolder) {
    const imageFiles: JSZip.JSZipObject[] = [];
    imagesFolder.forEach((_, fileObj) => {
      if (!fileObj.dir) imageFiles.push(fileObj);
    });

    for (const imgFile of imageFiles) {
      try {
        const base64 = await imgFile.async('base64');
        const imgId = imgFile.name.replace(/^images\//, '').replace(/\.[^.]+$/, '');
        const dataUrl = `data:image/png;base64,${base64}`;
        const exists = await db.images.get(imgId);
        if (!exists) {
          await db.images.add({
            id: imgId,
            name: imgFile.name,
            mimeType: 'image/png',
            dataUrl,
            createdAt: new Date().toISOString()
          });
          summary.addedImages++;
        }
      } catch (err) {
        console.warn('Error reading image from zip:', imgFile.name, err);
      }
    }
  }

  // 4. Process videos (blobs + manifest) — non-destructive upsert by id.
  //    Restored videos go to the user's disk folder when available (no
  //    browser quota), falling back to IndexedDB.
  const videosManifestFile = contents.file('videosManifest.json');
  if (videosManifestFile) {
    try {
      const videoMetaList: Partial<StoredVideo>[] = JSON.parse(await videosManifestFile.async('text'));
      for (const meta of videoMetaList) {
        if (!meta || !meta.id) continue;
        try {
          const existing = await db.videos.get(meta.id);
          if (existing) continue; // already have this exact video
          const ext = videoExtensionFor(meta as { name?: string; mimeType?: string });
          const vidFile = contents.file(`videos/${meta.id}.${ext}`);
          if (!vidFile) continue;
          const rawBlob = await vidFile.async('blob');
          // Re-type the blob so <video> plays it back correctly
          const typedBlob = new Blob([rawBlob], { type: meta.mimeType || 'video/mp4' });
          await saveVideoBlob({
            id: meta.id,
            noteId: meta.noteId,
            labId: meta.labId,
            name: meta.name || 'video',
            mimeType: meta.mimeType || 'video/mp4',
            blob: typedBlob,
            caption: meta.caption,
            createdAt: meta.createdAt,
          });
          summary.addedVideos++;
        } catch (err) {
          console.warn('Error importing video:', meta.id, err);
        }
      }
    } catch (e) {
      console.error('Error importing videos manifest:', e);
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

  return summary;
}

function parseMarkdownWithFrontmatter(text: string): Partial<Note> {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return {
      title: 'Nota importada',
      contentHtml: text
    };
  }

  const frontmatterStr = match[1];
  const content = match[2];

  const note: Partial<Note> = {
    contentHtml: content
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
