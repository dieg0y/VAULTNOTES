import { Note, Lab } from '../types';

/* ------------------------------------------------------------------ */
/* HTML → Markdown conversion (tuned for the vault rich editor)       */
/* ------------------------------------------------------------------ */

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…');
}

/** Converts the editor's contentHtml into clean, blog-ready markdown. */
export function htmlToMarkdown(html: string): string {
  if (!html) return '';
  let t = html;

  // 1) Rich editor code blocks (div wrapper + language header + pre>code)
  t = t.replace(
    /<div[^>]*>\s*<div[^>]*>\s*<span[^>]*>\s*([A-Za-z0-9+#-]+)\s*<\/span>[\s\S]*?<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>\s*<\/div>/g,
    (_m, lang: string, code: string) => `\n\n\`\`\`${lang.toLowerCase()}\n${decodeEntities(code)}\n\`\`\`\n\n`
  );

  // 2) Plain pre>code blocks (language parsed from code attrs)
  t = t.replace(
    /<pre[^>]*>\s*<code([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/g,
    (_m, attrs: string, code: string) => {
      const langMatch = /language-([a-zA-Z0-9+#-]+)/.exec(attrs || '');
      return `\n\n\`\`\`${(langMatch ? langMatch[1] : '').toLowerCase()}\n${decodeEntities(code)}\n\`\`\`\n\n`;
    }
  );

  // 3) Inline code
  t = t.replace(/<code[^>]*>([\s\S]*?)<\/code>/g, (_m, c: string) => `\`${decodeEntities(c).trim()}\``);

  // 4) Checklists (editor inserts input + editable span) — AUDIT FIX:
  //    preserve the checked state ("- [x]" vs "- [ ]"); it used to export
  //    every item as unchecked.
  const checkboxMd = (inputTag: string): string => (/\bchecked\b/.test(inputTag) ? '- [x] ' : '- [ ] ');
  t = t.replace(
    /<div[^>]*>\s*(<input[^>]*type="checkbox"[^>]*>)\s*<span[^>]*>([\s\S]*?)<\/span>\s*<\/div>/g,
    (_m, inputTag: string, label: string) => `${checkboxMd(inputTag)}${decodeEntities(label).trim()}`
  );
  t = t.replace(/<input[^>]*type="checkbox"[^>]*>/g, (m) => checkboxMd(m));

  // 5) Figures → image note (base64 data would bloat the .md)
  t = t.replace(
    /<figure[^>]*>[\s\S]*?<figcaption[^>]*>([\s\S]*?)<\/figcaption>[\s\S]*?<\/figure>/g,
    (_m, cap: string) => `\n\n> 🖼️ *Imagen: ${decodeEntities(cap).trim()} — insértala desde tu vault*\n\n`
  );
  t = t.replace(/<img[^>]*>/g, '');

  // 6) Headings
  t = t.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_m, x: string) => `\n\n# ${decodeEntities(x).trim()}\n`);
  t = t.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m, x: string) => `\n\n## ${decodeEntities(x).trim()}\n`);
  t = t.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_m, x: string) => `\n\n### ${decodeEntities(x).trim()}\n`);

  // 7) Emphasis / kbd
  t = t.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag: string, x: string) => `**${x.trim()}**`);
  t = t.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag: string, x: string) => `*${x.trim()}*`);
  t = t.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, (_m, x: string) => x);
  t = t.replace(/<kbd[^>]*>([\s\S]*?)<\/kbd>/gi, (_m, x: string) => `\`${x.trim()}\``);

  // 8) Links
  t = t.replace(
    /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href: string, label: string) => `[${decodeEntities(label).trim()}](${href})`
  );

  // 9) Blockquotes
  t = t.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, x: string) => {
    const inner = x.replace(/<[^>]+>/g, '').trim();
    return `\n\n> ${decodeEntities(inner).replace(/\n/g, '\n> ')}\n\n`;
  });

  // 10) Lists & paragraphs & breaks
  t = t.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, x: string) => `\n- ${x.replace(/<[^>]+>/g, '').trim()}`);
  t = t.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, x: string) => `\n\n${x.trim()}\n\n`);
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<div[^>]*>/g, '\n');

  // 11) Strip any remaining tags & decode
  t = t.replace(/<[^>]+>/g, '');
  t = decodeEntities(t);

  // 12) Normalize whitespace
  t = t.replace(/[ \t]+\n/g, '\n');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

/* ------------------------------------------------------------------ */
/* Blog draft generation                                              */
/* ------------------------------------------------------------------ */

const AI_PROMPT = [
  '> 🤖 **Instrucciones para la IA:** Convierte el material siguiente (mis apuntes / labs personales de ciberseguridad) en un artículo de blog técnico listo para publicar en mi portfolio.',
  '> - Estructura: introducción atractiva, desarrollo con subtítulos H2/H3, y conclusión con puntos clave.',
  '> - Conserva los comandos y bloques de código tal cual, en bloques de código markdown.',
  '> - Tono profesional pero cercano, escrito en primera persona.',
  '> - No inventes información técnica que no esté en el material.',
  '> - Longitud sugerida: 800–1500 palabras, ajustada al material.',
  '> - Devuelve el resultado en markdown listo para pegar.',
].join('\n');

function metaLine(parts: (string | false | undefined)[]): string {
  const clean = parts.filter(Boolean).join(' · ');
  return clean ? `> ${clean}\n\n` : '';
}

function noteToMarkdown(note: Note, level: number): string {
  const heading = '#'.repeat(Math.min(level, 6));
  const cats = (note.categories && note.categories.length ? note.categories : [note.category]).filter(Boolean);
  const source = note.sourceUrl ? `[Fuente](${note.sourceUrl})` : '';
  let md = `\n${heading} ${note.title || 'Sin título'}\n\n`;
  md += metaLine([note.platform, cats.join(', '), source]);
  md += `${htmlToMarkdown(note.contentHtml)}\n`;
  return md;
}

function labToMarkdown(lab: Lab): string {
  let md = `\n## Lab: ${lab.title || 'Sin título'}\n\n`;
  md += metaLine([
    lab.organization,
    lab.topic,
    lab.difficulty,
    lab.timeSpent ? `⏱ ${lab.timeSpent}` : '',
    lab.sourceLink ? `[Enlace del lab](${lab.sourceLink})` : '',
  ]);

  if (lab.tools && lab.tools.length > 0) {
    md += `**Herramientas usadas:** ${lab.tools.join(', ')}\n\n`;
  }

  const cmds = Array.isArray(lab.commands) ? lab.commands : [];
  if (cmds.length > 0) {
    md += '**Comandos clave:**\n\n```bash\n' + cmds.join('\n') + '\n```\n\n';
  }

  if (lab.parts && lab.parts.length > 0) {
    lab.parts.forEach((p, i) => {
      md += `### ${i + 1}. ${p.title}\n\n`;
      md += `${htmlToMarkdown(p.content)}\n`;
    });
  }

  if (lab.findings && lab.findings.trim()) {
    md += `**Hallazgos / IoCs:**\n\n${lab.findings.trim()}\n\n`;
  }
  if (lab.mitigation && lab.mitigation.trim()) {
    md += `**Mitigación / Lecciones aprendidas:**\n\n${lab.mitigation.trim()}\n\n`;
  }
  return md;
}

export interface BlogDraftOptions {
  notes: Note[]; // selected top-level notes (their subpages are included)
  allNotes: Note[]; // full list to resolve subpages
  labs: Lab[]; // selected labs
  includeAiPrompt: boolean;
}

/** Builds a single .md blog draft from the selected notes & labs. */
export function generateBlogMarkdown({ notes, allNotes, labs, includeAiPrompt }: BlogDraftOptions): string {
  const parts: string[] = [];

  if (includeAiPrompt) parts.push(AI_PROMPT);

  const single = notes.length + labs.length === 1;
  const dateStr = new Date().toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' });
  parts.push(`# ${single ? '' : 'Borrador para Blog — '}${single ? '' : dateStr}\n`.trim());

  if (notes.length > 0) {
    const section = notes.map((n) => {
      let md = noteToMarkdown(n, single ? 1 : 2);
      // include its subpages as deeper sections
      const subpages = allNotes.filter((s) => !s.isDeleted && s.parentId === n.id);
      subpages.forEach((s) => {
        md += noteToMarkdown(s, single ? 2 : 3);
      });
      return md;
    }).join('\n---\n');
    parts.push(section);
  }

  if (labs.length > 0) {
    const section = labs.map(labToMarkdown).join('\n---\n');
    parts.push(section);
  }

  return parts.filter((p) => p.trim()).join('\n\n') + '\n';
}

/** File-system-safe name for the exported draft. */
export function blogDraftFilename(opts: { notes: Note[]; labs: Lab[] }): string {
  const total = opts.notes.length + opts.labs.length;
  if (total === 1) {
    const title = opts.notes.length ? opts.notes[0].title : opts.labs[0].title;
    const slug = (title || 'blog')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60);
    return `blog-${slug || 'draft'}.md`;
  }
  const dateStr = new Date().toISOString().split('T')[0];
  return `blog-draft-${dateStr}.md`;
}
