'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { List, ChevronRight, X } from 'lucide-react';

interface TocItem {
  level: number;   // 1 | 2 | 3
  text: string;
  id: string;      // slug-ish id we set on the heading for reliable scroll
}

interface AutoTocProps {
  /** HTML content of the editable area (re-parsed when it changes). */
  contentHtml: string;
  /** Ref to the contentEditable div, used to query heading elements to scroll. */
  editorRef: React.RefObject<HTMLDivElement | null>;
}

/* Slugify a heading text into a stable id (best-effort, Spanish-friendly). */
const slugify = (text: string): string =>
  text.toLowerCase().trim()
    .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u').replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
    .slice(0, 60) || 'heading';

/* Parse headings (h1-h3) from an HTML string using DOMParser (no external libs). */
const parseHeadings = (html: string): TocItem[] => {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const heads = Array.from(doc.querySelectorAll('h1, h2, h3')) as HTMLHeadingElement[];
    return heads.map((h) => {
      const text = (h.textContent || '').trim();
      return { level: parseInt(h.tagName[1], 10), text, id: slugify(text) };
    }).filter((h) => h.text.length > 0);
  } catch {
    return [];
  }
};

export const AutoToc: React.FC<AutoTocProps> = ({ contentHtml, editorRef }) => {
  const [open, setOpen] = useState(false);

  const items = useMemo(() => parseHeadings(contentHtml), [contentHtml]);

  /* Ensure each heading in the live editor has an id matching our TOC.
     This runs after every content parse (i.e. after autosave) so clicks scroll reliably. */
  useEffect(() => {
    const root = editorRef.current;
    if (!root) return;
    const heads = Array.from(root.querySelectorAll('h1, h2, h3')) as HTMLHeadingElement[];
    heads.forEach((h, i) => {
      const text = (h.textContent || '').trim();
      const matching = items[i] && items[i].text === text ? items[i] : items.find((it) => it.text === text);
      if (matching) h.id = matching.id;
    });
  }, [items, editorRef]);

  const scrollTo = (id: string) => {
    const root = editorRef.current;
    if (!root) return;
    // Try direct id match first, then text fallback.
    let el: Element | null = root.querySelector(`#${CSS.escape(id)}`);
    if (!el) {
      const target = items.find((it) => it.id === id);
      if (target) {
        const heads = Array.from(root.querySelectorAll('h1, h2, h3')) as HTMLHeadingElement[];
        el = heads.find((h) => (h.textContent || '').trim() === target.text) || null;
      }
    }
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Brief highlight pulse so the user sees where it landed.
      el.classList.add('vault-toc-flash');
      setTimeout(() => el?.classList.remove('vault-toc-flash'), 1400);
    }
  };

  if (items.length === 0) return null;

  return (
    <>
      {/* Toggle button — floats bottom-right of the editor */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed right-4 bottom-4 z-30 w-9 h-9 rounded-full bg-[#0D0D0D] border border-[#262626] text-[#888] hover:text-blue-400 hover:border-blue-500/40 shadow-lg flex items-center justify-center transition-colors cursor-pointer"
        title="Índice del apunte (Auto TOC)"
        aria-label="Abrir índice"
      >
        <List className="w-4 h-4" />
        {items.length > 0 && (
          <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center">
            {items.length}
          </span>
        )}
      </button>

      {/* Floating panel */}
      {open && (
        <div className="fixed right-4 bottom-16 z-30 w-64 max-h-[60vh] overflow-y-auto bg-[#0D0D0D] border border-[#262626] rounded-lg shadow-2xl">
          <div className="sticky top-0 bg-[#0D0D0D] border-b border-[#262626] px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-400">
              <List className="w-3 h-3" />
              Índice
            </div>
            <button onClick={() => setOpen(false)} className="p-0.5 rounded text-[#666] hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-1.5 space-y-0.5">
            {items.map((it, i) => (
              <button
                key={it.id + i}
                onClick={() => { scrollTo(it.id); }}
                className="w-full text-left text-[11px] text-[#999] hover:text-blue-300 hover:bg-[#161616] rounded px-2 py-1 transition-colors flex items-start gap-1 cursor-pointer"
                style={{ paddingLeft: `${0.5 + (it.level - 1) * 0.9}rem` }}
                title={it.text}
              >
                <ChevronRight className={`w-3 h-3 mt-0.5 shrink-0 ${it.level === 1 ? 'text-blue-400' : it.level === 2 ? 'text-[#666]' : 'text-[#444]'}`} />
                <span className={`truncate ${it.level === 1 ? 'font-semibold text-white' : ''}`}>{it.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
