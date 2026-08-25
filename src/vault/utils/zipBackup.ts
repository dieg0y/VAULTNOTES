import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { db } from '../db';
import { Note, Lab, GlossaryTerm, StoredImage, ImportSummary } from '../types';

// Helper to sanitize path strings for zip folders/files
export function sanitizeFilename(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
}

export function htmlToMarkdown(html: string): string {
  // Convert basic HTML back to readable markdown representation
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n\n')
    .replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n')
    .replace(/<code>(.*?)<\/code>/gi, '`$1`')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export async function exportVaultZip(): Promise<void> {
  const zip = new JSZip();

  const notes = await db.notes.filter(n => !n.isDeleted).toArray();
  const labs = await db.labs.filter(l => !l.isDeleted).toArray();
  const glossary = await db.glossary.filter(g => !g.isDeleted).toArray();
  const images = await db.images.toArray();
  const platforms = await db.platforms.toArray();
  const categories = await db.categories.toArray();
  const tools = await db.tools.toArray();

  const manifest = {
    appName: 'Vault',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    stats: {
      notesCount: notes.length,
      labsCount: labs.length,
      glossaryCount: glossary.length,
      imagesCount: images.length,
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

  // Generate and download zip
  const blob = await zip.generateAsync({ type: 'blob' });
  const dateStr = new Date().toISOString().split('T')[0];
  saveAs(blob, `vault-backup-${dateStr}.zip`);
}

export async function importVaultBackup(file: File): Promise<ImportSummary> {
  const summary: ImportSummary = {
    addedNotes: 0,
    skippedNotes: 0,
    addedLabs: 0,
    skippedLabs: 0,
    addedTerms: 0,
    skippedTerms: 0,
    addedImages: 0
  };

  const existingNotes = await db.notes.toArray();
  const existingNoteKeys = new Set(
    existingNotes.map(n => `${(n.platform || '').trim().toLowerCase()}/${(n.category || '').trim().toLowerCase()}/${(n.title || '').trim().toLowerCase()}`)
  );

  const existingLabs = await db.labs.toArray();
  const existingLabKeys = new Set(
    existingLabs.map(l => `${(l.organization || '').trim().toLowerCase()}/${(l.title || '').trim().toLowerCase()}`)
  );

  const existingGlossary = await db.glossary.toArray();
  const existingTermKeys = new Set(
    existingGlossary.map(g => (g.term || '').trim().toLowerCase())
  );

  if (file.name.endsWith('.json')) {
    const text = await file.text();
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item.parts || item.organization || item.difficulty) {
          // Lab item
          const key = `${(item.organization || '').trim().toLowerCase()}/${(item.title || '').trim().toLowerCase()}`;
          if (!existingLabKeys.has(key)) {
            await db.labs.add({
              ...item,
              id: item.id || `lab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              isDeleted: false,
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString(),
            });
            existingLabKeys.add(key);
            summary.addedLabs = (summary.addedLabs || 0) + 1;
          } else {
            summary.skippedLabs = (summary.skippedLabs || 0) + 1;
          }
        } else if (item.term && item.shortDefinition) {
          // Glossary item
          const key = item.term.trim().toLowerCase();
          if (!existingTermKeys.has(key)) {
            await db.glossary.add({
              ...item,
              id: item.id || `term-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              isDeleted: false,
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString(),
            });
            existingTermKeys.add(key);
            summary.addedTerms++;
          } else {
            summary.skippedTerms++;
          }
        } else if (item.title && item.platform) {
          // Note item
          const key = `${(item.platform || '').trim().toLowerCase()}/${(item.category || '').trim().toLowerCase()}/${(item.title || '').trim().toLowerCase()}`;
          if (!existingNoteKeys.has(key)) {
            await db.notes.add({
              ...item,
              id: item.id || `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              isDeleted: false,
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString(),
            });
            existingNoteKeys.add(key);
            summary.addedNotes++;
          } else {
            summary.skippedNotes++;
          }
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
    const jsonText = await glossaryFile.async('text');
    try {
      const terms: GlossaryTerm[] = JSON.parse(jsonText);
      for (const term of terms) {
        const key = (term.term || '').trim().toLowerCase();
        if (!existingTermKeys.has(key)) {
          await db.glossary.add({
            ...term,
            id: term.id || `term-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            isDeleted: false,
            createdAt: term.createdAt || new Date().toISOString(),
            updatedAt: term.updatedAt || new Date().toISOString(),
          });
          existingTermKeys.add(key);
          summary.addedTerms++;
        } else {
          summary.skippedTerms++;
        }
      }
    } catch (e) {
      console.error('Error importing glossary JSON from zip:', e);
    }
  }

  // 2. Process Labs
  const labsFile = contents.file('labs/labs.json');
  if (labsFile) {
    const jsonText = await labsFile.async('text');
    try {
      const labsList: Lab[] = JSON.parse(jsonText);
      for (const lab of labsList) {
        const key = `${(lab.organization || '').trim().toLowerCase()}/${(lab.title || '').trim().toLowerCase()}`;
        if (!existingLabKeys.has(key)) {
          await db.labs.add({
            ...lab,
            id: lab.id || `lab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            isDeleted: false,
            createdAt: lab.createdAt || new Date().toISOString(),
            updatedAt: lab.updatedAt || new Date().toISOString(),
          });
          existingLabKeys.add(key);
          summary.addedLabs = (summary.addedLabs || 0) + 1;
        } else {
          summary.skippedLabs = (summary.skippedLabs || 0) + 1;
        }
      }
    } catch (e) {
      console.error('Error importing labs JSON from zip:', e);
    }
  }

  // 3. Process images
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

  // 4. Process notes in apuntes folder
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
      const key = `${(note.platform || '').trim().toLowerCase()}/${(note.category || '').trim().toLowerCase()}/${(note.title || '').trim().toLowerCase()}`;

      if (!existingNoteKeys.has(key)) {
        await db.notes.add({
          id: note.id || `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: note.title || 'Nota sin título',
          platform: note.platform || 'General',
          category: note.category || 'Notas',
          categories: note.categories || [note.category || 'Notas'],
          parentId: note.parentId || null,
          contentHtml: note.contentHtml || '',
          sourceUrl: note.sourceUrl || '',
          isFavorite: Boolean(note.isFavorite),
          isDeleted: false,
          createdAt: note.createdAt || new Date().toISOString(),
          updatedAt: note.updatedAt || new Date().toISOString()
        });
        existingNoteKeys.add(key);
        summary.addedNotes++;
      } else {
        summary.skippedNotes++;
      }
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
