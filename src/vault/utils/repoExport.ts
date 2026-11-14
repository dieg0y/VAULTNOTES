import { Note, Lab } from '../types';
import { htmlToMarkdown } from './markdown';
import { getDirectoryPicker, writeFileToDir, ensureDirPermission, FSDirHandleLike } from './fsStorage';
import { getImagesDirectory, findImagesFileHandle } from './imageStorage';

/* ------------------------------------------------------------------ */
/* repoExport — carpetas Markdown listas para subir a un repo           */
/*                                                                     */
/* Exporta labs y apuntes a una estructura de carpetas que se puede     */
/* empujar tal cual a GitHub:                                           */
/*                                                                     */
/*   <carpeta elegida>/                                                 */
/*     labs/                                                            */
/*       README.md                 ← índice con tabla y enlaces         */
/*       001-titulo-del-lab/                                            */
/*         README.md               ← el lab completo en Markdown        */
/*         images/01-captura.png   ← LOS SCREENSHOTS como archivos       */
/*       002-.../                                                       */
/*                                                                     */
/*   <carpeta elegida>/notas/  (misma idea para los apuntes)            */
/*                                                                     */
/* Los screenshots viajan como ARCHIVOS reales (no data-URLs): las      */
/* referencias FSA (`data-vault-img`) se copian desde la carpeta de     */
/* imágenes del disco y las embebidas legacy (`<img src="data:…">`) se  */
/* decodifican a binario. Videos y PDFs NO viajan (REGLA DE ORO) — se   */
/* dejan como nota de texto apuntando a la carpeta GITHUBVAULT.         */
/*                                                                     */
/* Diseño en dos fases: el PLAN (puro, testeable: unidades + markdown   */
/* + lista de imágenes) se construye sin tocar el disco; la ESCRITURA   */
/* (FSA) solo lee el plan. Así la lógica es determinista y el picker    */
/* es lo único asíncrono-no-mockeable.                                  */
/* ------------------------------------------------------------------ */

/* ------------------------------- tipos ------------------------------- */

/** De dónde salen los bytes de una imagen del export. */
type ImageSource =
  | { kind: 'vault'; name: string } // data-vault-img → archivo en la carpeta de imágenes
  | { kind: 'inline'; dataUrl: string } // <img src="data:…"> legacy embebido
  ;

/** Una imagen planificada: nombre final en images/ + su origen. */
interface PlannedImage {
  fileName: string;
  caption: string;
  source: ImageSource;
}

/** Un archivo .md dentro de la carpeta de la unidad. */
interface MdFile {
  name: string; // 'README.md' | '01-subpagina.md'
  markdown: string;
}

/** Una unidad exportable = una carpeta con su(s) .md y sus imágenes. */
interface ExportUnit {
  dirName: string;
  files: MdFile[];
  images: PlannedImage[];
}

/** Resumen del export para el toast/alert del caller. */
export interface RepoExportSummary {
  rootName: string;
  folderName: string;
  units: number;
  mdFiles: number;
  images: number;
  skippedImages: number;
}

/* ---------------------------- helpers puros ---------------------------- */

/** slug repo-safe: minúsculas, sin acentos, [^a-z0-9] → '-', recortado. */
function slugify(title: string, fallback = 'lab'): string {
  const slug = (title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50);
  return slug || fallback;
}

/** Extensión de archivo a partir de un mime de imagen (png por defecto). */
function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/x-icon': 'ico',
    'image/tiff': 'tiff',
  };
  return map[mime.toLowerCase()] || 'png';
}

/** Quita etiquetas HTML de un texto de figcaption/alt y recorta. */
function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .trim();
}

/** Alt de imagen seguro para markdown (sin corchetes que rompan la sintaxis). */
function safeAlt(caption: string, fileName: string): string {
  const base = (caption || fileName).replace(/[[\]]/g, '(').replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
  return base.slice(0, 120);
}

/** Metadato "> a · b · c" (vacío si todo falta). */
function metaLine(parts: (string | false | undefined)[]): string {
  const clean = parts.filter(Boolean).join(' · ');
  return clean ? `> ${clean}\n\n` : '';
}

/* ---------------- HTML → Markdown recolectando imágenes ---------------- */

const TOKEN_RE = /\u27e6VIMG-(\d+)\u27e7/g; // ⟦VIMG-3⟧ — sobrevive a htmlToMarkdown

/**
 * Convierte el HTML del editor a Markdown SUSTITUYENDO cada imagen por un
 * enlace relativo `images/NN-nombre.ext` y registrando el archivo en
 * `images` (en orden de aparición). Videos y PDFs quedan como nota de
 * texto (no viajan — REGLA DE ORO).
 */
function htmlToRepoMarkdown(html: string, images: PlannedImage[]): string {
  if (!html) return '';
  let t = html;

  // 1) Figuras completas: imagen FSA, video, PDF o imagen embebida con
  //    figcaption. Las figuras NO se anidan (el editor nunca las genera así).
  t = t.replace(/<figure\b[^>]*>([\s\S]*?)<\/figure>/g, (full, inner: string) => {
    const captionM = /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i.exec(inner);
    const caption = captionM ? stripTags(captionM[1]) : '';

    const vaultImg = /data-vault-img="([^"]+)"/i.exec(full);
    if (vaultImg) return `<p>\u27e6VIMG-${planImage(images, vaultImg[1], caption, { kind: 'vault', name: vaultImg[1] })}\u27e7</p>`;

    const vaultVideo = /data-vault-video="([^"]+)"/i.exec(full);
    if (vaultVideo) {
      return `<p>Video: ${stripTags(vaultVideo[1])} — se conserva en tu carpeta GITHUBVAULT/videos (no viaja en el export)</p>`;
    }

    if (/vault-pdf-embed/i.test(full)) {
      const name = caption || 'PDF adjunto';
      return `<p>PDF: ${name} — se conserva en tu vault (no viaja en el export)</p>`;
    }

    const inlineM = /<img[^>]*\ssrc="data:([^;"']+);base64,([^"]+)"[^>]*>/i.exec(inner);
    if (inlineM) {
      const dataUrl = `data:${inlineM[1]};base64,${inlineM[2]}`;
      return `<p>\u27e6VIMG-${planImage(images, caption || 'imagen', caption, { kind: 'inline', dataUrl })}\u27e7</p>`;
    }

    return full; // figura desconocida → la maneja htmlToMarkdown igual que hoy
  });

  // 2) Imágenes embebidas sueltas (sin <figure> — formato legacy temprano).
  t = t.replace(/<img\b[^>]*\ssrc="data:([^;"']+);base64,([^"]+)"[^>]*>/gi, (full, mime: string, b64: string) => {
    const altM = /\salt="([^"]*)"/i.exec(full);
    const caption = altM ? stripTags(altM[1]) : '';
    const dataUrl = `data:${mime};base64,${b64}`;
    return `<p>\u27e6VIMG-${planImage(images, caption || 'imagen', caption, { kind: 'inline', dataUrl })}\u27e7</p>`;
  });

  // 3) Conversión estándar del editor (los tokens van como texto plano).
  let md = htmlToMarkdown(t);

  // 4) Tokens → enlaces relativos a images/.
  md = md.replace(TOKEN_RE, (_m, idx: string) => {
    const img = images[Number(idx)];
    return img ? `![${safeAlt(img.caption, img.fileName)}](images/${img.fileName})` : '';
  });
  return md;
}

/** Registra una imagen en el plan y devuelve su índice (para el token). */
function planImage(images: PlannedImage[], rawName: string, caption: string, source: ImageSource): number {
  const n = images.length + 1;
  // Nombre final: 01-, 02-… + slug del nombre/caption original + extensión.
  let ext: string;
  let base: string;
  if (source.kind === 'vault') {
    const dot = source.name.lastIndexOf('.');
    ext = dot > 0 ? source.name.slice(dot + 1).toLowerCase() : 'png';
    base = dot > 0 ? source.name.slice(0, dot) : source.name;
  } else {
    ext = extFromMime(source.dataUrl.slice(5, source.dataUrl.indexOf(';')));
    base = rawName;
  }
  const prefix = String(n).padStart(2, '0');
  let fileName = `${prefix}-${slugify(base, 'imagen').slice(0, 40)}.${ext}`;
  // Dedupe dentro de la unidad (mismo screenshot referenciado dos veces).
  const taken = new Set(images.map((i) => i.fileName));
  if (taken.has(fileName)) fileName = `${prefix}-imagen.${ext}`;
  images.push({ fileName, caption, source });
  return images.length - 1;
}

/* -------------------------- unidades de export -------------------------- */

function labUnit(lab: Lab, dirName: string): ExportUnit {
  const images: PlannedImage[] = [];

  let md = `# ${lab.title || 'Lab sin título'}\n\n`;
  md += metaLine([
    lab.organization,
    lab.topic,
    lab.subtopic,
    lab.difficulty,
    lab.status,
    lab.timeSpent ? `⏱ ${lab.timeSpent}` : '',
  ]);

  if (lab.sourceLink) md += `> [Lab original](${lab.sourceLink})\n\n`;
  if (lab.tools && lab.tools.length > 0) md += `**Herramientas:** ${lab.tools.join(', ')}\n\n`;

  (lab.parts || []).forEach((p, i) => {
    md += `## ${i + 1}. ${p.title || `Parte ${i + 1}`}\n\n`;
    md += `${htmlToRepoMarkdown(p.content, images)}\n\n`;
  });

  const cmds = Array.isArray(lab.commands) ? lab.commands.filter(Boolean) : [];
  if (cmds.length > 0) {
    md += `**Comandos clave:**\n\n\`\`\`bash\n${cmds.join('\n')}\n\`\`\`\n\n`;
  }
  if (lab.findings && lab.findings.trim()) md += `**Hallazgos / IoCs:**\n\n${lab.findings.trim()}\n\n`;
  if (lab.mitigation && lab.mitigation.trim()) md += `**Mitigación / Lecciones aprendidas:**\n\n${lab.mitigation.trim()}\n\n`;

  return { dirName, files: [{ name: 'README.md', markdown: md }], images };
}

/** Recorrido DFS de las subpáginas de una nota (orden del árbol). */
function collectSubpages(noteId: string, childrenByParent: Map<string, Note[]>): Note[] {
  const out: Note[] = [];
  const walk = (id: string) => {
    for (const child of childrenByParent.get(id) || []) {
      out.push(child);
      walk(child.id);
    }
  };
  walk(noteId);
  return out;
}

function noteUnit(note: Note, subpages: Note[], dirName: string): ExportUnit {
  const images: PlannedImage[] = [];

  let md = `# ${note.title || 'Apunte sin título'}\n\n`;
  const cats = (note.categories && note.categories.length ? note.categories : [note.category]).filter(Boolean);
  md += metaLine([note.platform, cats.join(', ')]);
  if (note.sourceUrl) md += `> [Fuente](${note.sourceUrl})\n\n`;
  md += `${htmlToRepoMarkdown(note.contentHtml, images)}\n\n`;

  // Subpáginas: un .md por subpágina (cualquier profundidad, numeradas en
  // orden del árbol), compartiendo la carpeta images/ de la unidad.
  const files: MdFile[] = [];
  if (subpages.length > 0) {
    md += `## Subpáginas\n\n`;
    subpages.forEach((s, i) => {
      const fileName = `${String(i + 1).padStart(2, '0')}-${slugify(s.title, 'subpagina')}.md`;
      md += `- [${s.title || 'Sin título'}](${fileName})\n`;

      let subMd = `# ${s.title || 'Subpágina sin título'}\n\n`;
      subMd += metaLine([s.platform, s.category]);
      subMd += `${htmlToRepoMarkdown(s.contentHtml, images)}\n`;
      files.push({ name: fileName, markdown: subMd });
    });
    md += '\n';
  }

  files.unshift({ name: 'README.md', markdown: md });
  return { dirName, files, images };
}

/* ------------------------------ índices ------------------------------ */

function labsIndexMarkdown(labs: Lab[], dirNames: string[]): string {
  let md = `# Labs\n\n`;
  md += `> ${labs.length} labs · exportado desde VaultNotes el ${new Date().toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
  md += `| # | Lab | Organización | Tema | Dificultad | Estado |\n|---|---|---|---|---|---|\n`;
  labs.forEach((lab, i) => {
    const link = `[${(lab.title || 'Sin título').replace(/\|/g, '\\|')}](${dirNames[i]}/)`;
    md += `| ${i + 1} | ${link} | ${(lab.organization || '—').replace(/\|/g, '\\|')} | ${(lab.topic || '—').replace(/\|/g, '\\|')} | ${lab.difficulty} | ${lab.status} |\n`;
  });
  return md + '\n';
}

function notesIndexMarkdown(notes: Note[], subpageCounts: number[], dirNames: string[]): string {
  let md = `# Apuntes\n\n`;
  md += `> ${notes.length} apuntes · exportado desde VaultNotes el ${new Date().toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
  md += `| # | Apunte | Plataforma | Categoría | Subpáginas |\n|---|---|---|---|---|\n`;
  notes.forEach((n, i) => {
    const link = `[${(n.title || 'Sin título').replace(/\|/g, '\\|')}](${dirNames[i]}/)`;
    const cats = (n.categories && n.categories.length ? n.categories.join(', ') : n.category) || '—';
    md += `| ${i + 1} | ${link} | ${(n.platform || '—').replace(/\|/g, '\\|')} | ${cats.replace(/\|/g, '\\|')} | ${subpageCounts[i]} |\n`;
  });
  return md + '\n';
}

/* ------------------------- fase de escritura (FSA) ------------------------- */

/** Lee los bytes de una imagen planificada (null si no se puede resolver). */
async function resolveImageBlob(source: ImageSource): Promise<Blob | null> {
  if (source.kind === 'inline') {
    try {
      const res = await fetch(source.dataUrl);
      return await res.blob();
    } catch {
      return null;
    }
  }
  // FSA: buscar el archivo original en la carpeta de imágenes del usuario.
  try {
    const dir = await getImagesDirectory();
    if (!dir) return null;
    if ((await ensureDirPermission(dir)) !== 'granted') return null;
    const fh = await findImagesFileHandle(dir, source.name);
    if (!fh || !fh.getFile) return null;
    return await fh.getFile();
  } catch {
    return null;
  }
}

/** Escribe el plan completo dentro de `root/<folderName>/`. */
async function writeUnits(
  root: FSDirHandleLike,
  folderName: string,
  units: ExportUnit[],
  indexMd: string,
): Promise<Omit<RepoExportSummary, 'rootName' | 'folderName'>> {
  const base = await root.getDirectoryHandle!(folderName, { create: true });
  await writeFileToDir(base, 'README.md', new Blob([indexMd], { type: 'text/markdown;charset=utf-8' }));

  let mdFiles = 1;
  let images = 0;
  let skippedImages = 0;

  for (const unit of units) {
    const dir = await base.getDirectoryHandle!(unit.dirName, { create: true });
    if (unit.images.length > 0) {
      const imgDir = await dir.getDirectoryHandle!('images', { create: true });
      for (const img of unit.images) {
        const blob = await resolveImageBlob(img.source);
        if (!blob) {
          skippedImages++;
          continue;
        }
        await writeFileToDir(imgDir, img.fileName, blob);
        images++;
      }
    }
    for (const f of unit.files) {
      await writeFileToDir(dir, f.name, new Blob([f.markdown], { type: 'text/markdown;charset=utf-8' }));
      mdFiles++;
    }
  }
  return { units: units.length, mdFiles, images, skippedImages };
}

/** Picker con manejo del cancelado por el usuario (null = cancelado). */
async function pickRootDirectory(): Promise<FSDirHandleLike | null | undefined> {
  const picker = getDirectoryPicker();
  if (!picker) {
    // undefined = el navegador no soporta FSA (mensaje distinguible del cancelado)
    return undefined;
  }
  try {
    return await picker({ mode: 'readwrite' });
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') return null; // cancelado
    throw err;
  }
}

/** DirNames únicos y estables: 001-slug, 002-slug… (sufijo -2 si colisionan). */
function buildDirNames(titles: string[], fallback: string): string[] {
  const taken = new Set<string>();
  return titles.map((title, i) => {
    let name = `${String(i + 1).padStart(3, '0')}-${slugify(title, fallback)}`;
    if (taken.has(name)) {
      let n = 2;
      while (taken.has(`${name}-${n}`)) n++;
      name = `${name}-${n}`;
    }
    taken.add(name);
    return name;
  });
}

/* ------------------------------ API pública ------------------------------ */

/**
 * Exporta TODOS los labs activos a `<carpeta elegida>/labs/` — un folder
 * por lab con README.md + images/. Devuelve el resumen, null si el
 * usuario canceló el picker, o lanza con mensaje accionable.
 */
export async function exportLabsToRepo(labs: Lab[]): Promise<RepoExportSummary | null> {
  const active = labs.filter((l) => !l.isDeleted).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  if (active.length === 0) throw new Error('No hay labs activos para exportar.');

  const root = await pickRootDirectory();
  if (root === undefined) {
    throw new Error('Tu navegador no soporta elegir carpetas (File System Access API). Usa Edge o Chrome, como para los videos y los backups.');
  }
  if (!root) return null; // cancelado

  const dirNames = buildDirNames(active.map((l) => l.title), 'lab');
  const units = active.map((lab, i) => labUnit(lab, dirNames[i]));
  const stats = await writeUnits(root, 'labs', units, labsIndexMarkdown(active, dirNames));
  return { rootName: root.name || 'carpeta', folderName: 'labs', ...stats };
}

/**
 * Exporta TODOS los apuntes activos a `<carpeta elegida>/notas/` — un
 * folder por nota raíz con README.md + subpáginas .md + images/.
 */
export async function exportNotesToRepo(notes: Note[]): Promise<RepoExportSummary | null> {
  const active = notes.filter((n) => !n.isDeleted);
  if (active.length === 0) throw new Error('No hay apuntes activos para exportar.');

  const root = await pickRootDirectory();
  if (root === undefined) {
    throw new Error('Tu navegador no soporta elegir carpetas (File System Access API). Usa Edge o Chrome, como para los videos y los backups.');
  }
  if (!root) return null; // cancelado

  const childrenByParent = new Map<string, Note[]>();
  for (const n of active) {
    if (!n.parentId) continue;
    const bucket = childrenByParent.get(n.parentId);
    if (bucket) bucket.push(n);
    else childrenByParent.set(n.parentId, [n]);
  }
  const topLevel = active.filter((n) => !n.parentId).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  if (topLevel.length === 0) throw new Error('No hay apuntes de primer nivel para exportar.');

  const dirNames = buildDirNames(topLevel.map((n) => n.title), 'nota');
  const subpageLists = topLevel.map((n) => collectSubpages(n.id, childrenByParent));
  const units = topLevel.map((n, i) => noteUnit(n, subpageLists[i], dirNames[i]));
  const index = notesIndexMarkdown(topLevel, subpageLists.map((s) => s.length), dirNames);
  const stats = await writeUnits(root, 'notas', units, index);
  return { rootName: root.name || 'carpeta', folderName: 'notas', ...stats };
}
