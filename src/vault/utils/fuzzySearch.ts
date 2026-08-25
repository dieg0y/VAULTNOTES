import Fuse from 'fuse.js';
import { Note, Lab, GlossaryTerm } from '../types';

export interface SearchMatchDetail {
  field: string;
  label: string;
  value: string;
}

export interface SearchResultItem {
  id: string;
  type: 'note' | 'lab' | 'glossary';
  title: string;
  subtitle: string;
  snippet: string;
  platform?: string;
  category?: string;
  tools?: string[];
  sourceUrl?: string;
  status?: string;
  matchedFields?: SearchMatchDetail[];
  highlightedTitle?: string;
  highlightedSnippet?: string;
  rawItem: Note | Lab | GlossaryTerm;
}

interface SearchDocument {
  id: string;
  type: 'note' | 'lab' | 'glossary';
  title: string;
  acronym: string;
  platform: string;
  category: string;
  tools: string;
  sourceUrl: string;
  content: string;
  subtitle: string;
  status?: string;
  rawItem: Note | Lab | GlossaryTerm;
}

export function searchAllVault(
  query: string,
  notes: Note[],
  glossary: GlossaryTerm[],
  labs: Lab[] = []
): SearchResultItem[] {
  const activeNotes = notes.filter(n => !n.isDeleted);
  const activeLabs = labs.filter(l => !l.isDeleted);
  const activeGlossary = glossary.filter(g => !g.isDeleted);

  if (!query.trim()) {
    // Return recent items
    const noteResults: SearchResultItem[] = activeNotes.slice(0, 4).map(n => ({
      id: n.id,
      type: 'note',
      title: n.title,
      subtitle: `${n.platform} • ${n.category}`,
      snippet: stripHtml(n.contentHtml).slice(0, 140),
      platform: n.platform,
      category: n.category,
      sourceUrl: n.sourceUrl,
      rawItem: n
    }));

    const labResults: SearchResultItem[] = activeLabs.slice(0, 4).map(l => ({
      id: l.id,
      type: 'lab',
      title: l.title,
      subtitle: `${l.organization} • ${l.topic}${l.subtopic ? ` • ${l.subtopic}` : ''}`,
      snippet: stripHtml(
        l.parts?.map(p => `${p.title}: ${p.content}`).join(' ') ||
        l.findings ||
        (Array.isArray(l.commands) ? l.commands.join(' ') : String(l.commands || '')) ||
        ''
      ).slice(0, 140),
      platform: l.organization,
      category: l.topic,
      tools: l.tools,
      sourceUrl: l.sourceLink,
      status: l.status,
      rawItem: l
    }));

    const glossaryResults: SearchResultItem[] = activeGlossary.slice(0, 3).map(g => ({
      id: g.id,
      type: 'glossary',
      title: g.acronym ? `[${g.acronym}] ${g.term}` : g.term,
      subtitle: `Glosario • ${g.platform || 'General'}`,
      snippet: g.shortDefinition || g.longDefinition.slice(0, 140),
      platform: g.platform,
      category: g.category,
      rawItem: g
    }));

    return [...noteResults, ...labResults, ...glossaryResults];
  }

  // Build unified search corpus
  const searchDataset: SearchDocument[] = [
    ...activeNotes.map(n => ({
      id: n.id,
      type: 'note' as const,
      title: n.title,
      acronym: '',
      platform: n.platform || '',
      category: [n.category, ...(n.categories || [])].filter(Boolean).join(' '),
      tools: '',
      sourceUrl: n.sourceUrl || '',
      content: stripHtml(n.contentHtml),
      subtitle: `${n.platform} > ${n.category}`,
      status: undefined,
      rawItem: n
    })),
    ...activeLabs.map(l => ({
      id: l.id,
      type: 'lab' as const,
      title: l.title,
      acronym: '',
      platform: l.organization || '',
      category: [l.topic, l.subtopic, ...(l.categories || [])].filter(Boolean).join(' '),
      tools: (l.tools || []).join(' '),
      sourceUrl: l.sourceLink || '',
      content: stripHtml([
        l.parts?.map(p => `${p.title} ${p.content}`).join(' ') || '',
        Array.isArray(l.commands) ? l.commands.join(' ') : String(l.commands || ''),
        l.findings || '',
        l.mitigation || ''
      ].join(' ')),
      subtitle: `${l.organization} > ${l.topic}${l.subtopic ? ` > ${l.subtopic}` : ''} [${l.difficulty}]`,
      status: l.status,
      rawItem: l
    })),
    ...activeGlossary.map(g => ({
      id: g.id,
      type: 'glossary' as const,
      title: g.term,
      acronym: g.acronym || '',
      platform: g.platform || '',
      category: [g.category, ...(g.categories || [])].filter(Boolean).join(' '),
      tools: '',
      sourceUrl: '',
      content: [g.shortDefinition, g.longDefinition, g.example].filter(Boolean).join(' '),
      subtitle: `Glosario • ${g.platform || 'General'}${g.category ? ` • ${g.category}` : ''}`,
      status: undefined,
      rawItem: g
    }))
  ];

  const fuse = new Fuse(searchDataset, {
    keys: [
      { name: 'title', weight: 0.35 },
      { name: 'acronym', weight: 0.25 },
      { name: 'platform', weight: 0.15 },
      { name: 'category', weight: 0.15 },
      { name: 'content', weight: 0.15 },
      { name: 'tools', weight: 0.10 },
      { name: 'sourceUrl', weight: 0.05 }
    ],
    threshold: 0.38,
    distance: 120,
    ignoreLocation: true,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 1
  });

  const rawResults = fuse.search(query);

  const fieldLabels: Record<string, string> = {
    title: 'Título',
    acronym: 'Acrónimo',
    platform: 'Plataforma',
    category: 'Categoría',
    tools: 'Herramientas',
    content: 'Contenido',
    sourceUrl: 'Link / Fuente'
  };

  return rawResults.map(({ item, matches }) => {
    const matchedFields: SearchMatchDetail[] = [];
    const qLower = query.toLowerCase();

    if (matches) {
      matches.forEach(m => {
        const keyName = m.key || '';
        const label = fieldLabels[keyName] || keyName;
        const val = String(m.value || '');
        if (label && !matchedFields.some(mf => mf.label === label)) {
          matchedFields.push({
            field: keyName,
            label,
            value: val.length > 80 ? `${val.slice(0, 80)}...` : val
          });
        }
      });
    }

    // Highlighting
    const highlightedTitle = highlightMatches(
      item.acronym ? `[${item.acronym}] ${item.title}` : item.title,
      qLower
    );

    const fullSnippet = item.content.slice(0, 180);
    const highlightedSnippet = highlightMatches(fullSnippet, qLower);

    return {
      id: item.id,
      type: item.type,
      title: item.acronym ? `[${item.acronym}] ${item.title}` : item.title,
      subtitle: item.subtitle,
      snippet: fullSnippet,
      platform: item.platform,
      category: item.category,
      tools: item.tools ? item.tools.split(' ') : undefined,
      sourceUrl: item.sourceUrl,
      status: item.status,
      matchedFields,
      highlightedTitle,
      highlightedSnippet,
      rawItem: item.rawItem
    };
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function highlightMatches(text: string, query: string): string {
  if (!text || !query.trim()) return escapeHtml(text);
  const safeText = escapeHtml(text);
  const regex = new RegExp(`(${escapeRegExp(escapeHtml(query))})`, 'gi');
  return safeText.replace(regex, '<mark class="bg-yellow-400 text-black px-1 py-0.2 rounded font-semibold">$1</mark>');
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
