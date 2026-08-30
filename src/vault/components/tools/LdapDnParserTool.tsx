/**
 * LdapDnParserTool.tsx — 100% offline LDAP Distinguished Name (DN) parser
 * for VaultNotes.
 *
 * WHAT IT DOES
 * ------------
 * Parses an LDAP DN (e.g. "CN=John Doe,OU=SOC,OU=Users,DC=company,DC=local")
 * into its individual RDN components, derives the Active Directory domain
 * from the DC= parts, and renders a hierarchical ASCII tree visualization.
 *
 * Auto-parses on each keystroke (debounced 200ms). Supports escaped commas
 * (\\,), escaped equals (\\=) and escaped plus (\\+) per RFC 4514 via a small
 * char-by-char state machine. Strips surrounding double quotes around values
 * (RFC 4514 allows them, though they're rarely used in practice).
 *
 * CROSS-TOOL HAND-OFF
 * --------------------
 * - [Add to Note] → useNoteStore.enqueueNote('LDAP / DN Parse', htmlTable)
 *   where htmlTable is a <table> with every parsed component + the derived
 *   domain + the count summary + the tree (as pre-wrapped text). Every
 *   user-facing string is HTML-escaped via escapeHtml — there is NO
 *   dangerouslySetInnerHTML anywhere in this file.
 *
 * SECURITY CONSTRAINTS
 * ---------------------
 * 100% offline. No fetch, no axios, no XMLHttpRequest, no telemetry.
 * No eval, no new Function, no setTimeout(string), no dangerouslySetInnerHTML.
 * The DN never leaves the browser; parsing is a pure local state-machine.
 *
 * Spec reference: Task ID 4-b.
 */
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Trash2, FileText, BookOpen, Network, Server, GitBranch, Layers,
} from 'lucide-react';
import {
  inputCls, btnPrimary, btnGhost, Row, InfoBanner, ErrorBanner, useAddToNoteToast,
} from './_shared';
import { useNoteStore } from '../../store/noteStore';
import { escapeHtml } from '../../utils/escapeHtml';

/* ---------- types ---------- */

interface ParsedComponent {
  /** Attribute type, uppercase (CN, OU, DC, O, C, ST, L, UID, STREET, ...). */
  attr: string;
  /** Attribute value (already quote-stripped). */
  value: string;
  /** 1-based index in the DN (leftmost = 1). */
  index: number;
}

interface ParseResult {
  components: ParsedComponent[];
  /** DC values joined with "." in DN order. Empty string if no DCs. */
  domain: string;
  /** ASCII tree visualization (root → leaf, top to bottom). */
  tree: string;
}

/* ---------- helpers (pure local parsing, no external libs) ---------- */

/** HTML-escape user-facing strings before concatenating into the note body. */
/** Split a single RDN component "ATTR=value" into { attr, value }. */
function splitAttrValue(s: string): { attr: string; value: string } {
  const eqIdx = s.indexOf('=');
  if (eqIdx < 0) {
    throw new Error('Component without `=`: ' + s);
  }
  const attr = s.slice(0, eqIdx).trim().toUpperCase();
  let value = s.slice(eqIdx + 1).trim();
  // Strip surrounding double quotes if present (RFC 4514 allows them but
  // they're rarely used in practice).
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  }
  return { attr, value };
}

/**
 * Parse an LDAP DN into its RDN components.
 *
 * State machine: iterate char-by-char. Backslash (\\) escapes the next char
 * (so \\, \\= \\+ etc. don't trigger a split). Unescaped comma is the
 * separator. Whitespace around each component is trimmed before splitting.
 *
 * Throws if any component is missing the `=` separator.
 */
function parseDn(dn: string): ParsedComponent[] {
  const components: { attr: string; value: string }[] = [];
  let current = '';
  let inEscape = false;
  for (const ch of dn) {
    if (inEscape) {
      current += ch;
      inEscape = false;
      continue;
    }
    if (ch === '\\') {
      current += ch;
      inEscape = true;
      continue;
    }
    if (ch === ',') {
      const trimmed = current.trim();
      if (trimmed) components.push(splitAttrValue(trimmed));
      current = '';
      continue;
    }
    current += ch;
  }
  // Last component (no trailing comma).
  const trimmed = current.trim();
  if (trimmed) components.push(splitAttrValue(trimmed));
  return components.map((c, i) => ({ ...c, index: i + 1 }));
}

/** Join all DC values with "." to derive the AD domain. Empty if no DCs. */
function deriveDomain(components: ParsedComponent[]): string {
  return components
    .filter((c) => c.attr === 'DC')
    .map((c) => c.value)
    .join('.');
}

/**
 * Build a hierarchical ASCII tree visualization.
 *
 * LDAP DN order is leaf-first (CN=... is leftmost) going outward to the
 * domain (DC=... is rightmost). For the tree we want the root (domain) at
 * the top and the leaf at the bottom, so we iterate the NON-DC components
 * in REVERSE order of the DN.
 *
 * Box-drawing chars used:
 *   └──   last child of its parent
 *   ├──   non-last child (reserved for branching DNs; not used for the
 *         common linear-chain case)
 *   │     vertical continuation (reserved for branching DNs)
 *   4-space indent when there's no continuation
 *
 * For a linear DN chain (the overwhelmingly common case — each level has
 * exactly one child), every non-root node is the last child of its parent,
 * so we use `└── ` at every level with a 4-space indent per level above.
 */
function buildTree(components: ParsedComponent[], domain: string): string {
  const root = domain || 'Root';
  // Non-DC components, reversed so the deepest one in the DN becomes the leaf.
  const nonDc = components
    .filter((c) => c.attr !== 'DC')
    .slice()
    .reverse();
  const lines: string[] = [root];
  nonDc.forEach((node, i) => {
    // 4 spaces per level above this node.
    const indent = '    '.repeat(i);
    lines.push(indent + '└── ' + node.value);
  });
  return lines.join('\n');
}

/** "5 components (1 CN, 2 OU, 2 DC)" — order follows DN appearance. */
function countSummary(components: ParsedComponent[]): string {
  const counts = new Map<string, number>();
  for (const c of components) {
    counts.set(c.attr, (counts.get(c.attr) || 0) + 1);
  }
  const parts: string[] = [];
  counts.forEach((n, attr) => parts.push(`${n} ${attr}`));
  return `${components.length} components (${parts.join(', ')})`;
}

/** Tailwind badge class per attribute type (CN blue, OU orange, DC green). */
function attrBadgeCls(attr: string): string {
  switch (attr) {
    case 'CN':
      return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
    case 'OU':
      return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
    case 'DC':
      return 'text-green-400 border-green-500/30 bg-green-500/10';
    default:
      return 'text-purple-400 border-purple-500/30 bg-purple-500/10';
  }
}

/* ---------- constants ---------- */

const SAMPLE_DN = 'CN=John Doe,OU=SOC,OU=Users,DC=company,DC=local';

const INVALID_ERROR =
  'Formato de DN inválido. Cada componente debe tener la forma `ATTR=value` separado por comas.';

/* ---------- component ---------- */

export const LdapDnParserTool: React.FC = () => {
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const { addedToast, showToast } = useAddToNoteToast();

  // Debounce 200ms after the last keystroke before re-parsing. Pure local
  // parse is cheap, but this avoids burning cycles on every keystroke and
  // matches the spec ("debounced 200ms"). setTimeout takes a callback (NOT a
  // string), so this is safe per the no-eval constraint.
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(input), 200);
    return () => window.clearTimeout(id);
  }, [input]);

  // Parse on debounced input change. Pure local; no network calls.
  const { parsed, error } = useMemo<{ parsed: ParseResult | null; error: string | null }>(() => {
    const trimmed = debounced.trim();
    if (!trimmed) return { parsed: null, error: null };
    try {
      const components = parseDn(trimmed);
      if (components.length === 0) {
        return { parsed: null, error: INVALID_ERROR };
      }
      const domain = deriveDomain(components);
      const tree = buildTree(components, domain);
      return { parsed: { components, domain, tree }, error: null };
    } catch {
      return { parsed: null, error: INVALID_ERROR };
    }
  }, [debounced]);

  /* ---------- handlers ---------- */

  /** Force an immediate parse (skip the 200ms debounce). Used by [Parse]. */
  const handleParse = (): void => {
    setDebounced(input);
  };

  /** Clear the input and any parsed state immediately. */
  const handleClear = (): void => {
    setInput('');
    setDebounced('');
  };

  /** Replace the input with a curated sample DN. */
  const handleLoadSample = (): void => {
    setInput(SAMPLE_DN);
    setDebounced(SAMPLE_DN);
  };

  /** Enqueue an HTML table with all parsed components + tree for [Add to Note]. */
  const addToNote = (): void => {
    if (!parsed) return;
    const rows: string[] = [];
    const tr = (label: string, value: string): string =>
      `<tr><td style="background:#161616;color:#888;padding:4px;border:1px solid #333;font-weight:bold;">${escapeHtml(label)}</td>` +
      `<td style="padding:4px;border:1px solid #333;color:#DDD;font-family:monospace;white-space:pre-wrap;">${escapeHtml(value)}</td></tr>`;
    rows.push(tr('DN', input.trim()));
    parsed.components.forEach((c) => {
      rows.push(tr(`${c.index}. ${c.attr}`, c.value));
    });
    rows.push(tr('Derived Domain', parsed.domain));
    rows.push(tr('Component Count', countSummary(parsed.components)));
    rows.push(tr('Tree', parsed.tree));
    const htmlTable =
      `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:monospace;font-size:11px;">` +
      rows.join('') +
      `</table>`;
    useNoteStore.getState().enqueueNote('LDAP / DN Parse', htmlTable);
    showToast();
  };

  /* ---------- render ---------- */
  return (
    <div className="space-y-3">
      {/* input */}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleParse();
        }}
        placeholder="CN=John Doe,OU=SOC,OU=Users,DC=company,DC=local"
        className={inputCls}
        aria-label="LDAP Distinguished Name"
      />

      {/* action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleParse}
          className={`${btnPrimary} inline-flex items-center gap-1.5`}
        >
          <Search className="w-3 h-3" />
          Parse
        </button>
        <button
          type="button"
          onClick={handleClear}
          className={`${btnGhost} inline-flex items-center gap-1.5`}
        >
          <Trash2 className="w-3 h-3" />
          Clear
        </button>
        <button
          type="button"
          onClick={handleLoadSample}
          className={`${btnGhost} inline-flex items-center gap-1.5`}
        >
          <FileText className="w-3 h-3" />
          Load sample
        </button>
        <button
          type="button"
          onClick={addToNote}
          disabled={!parsed}
          className={`${btnGhost} inline-flex items-center gap-1.5`}
        >
          <BookOpen className="w-3 h-3" />
          Add to Note
        </button>
      </div>

      {/* offline info banner (always visible) */}
      <InfoBanner>
        100% offline. El DN se parsea localmente. NO se consulta LDAP, NO se
        conecta a Active Directory ni a ningún servicio externo.
      </InfoBanner>

      {/* added-to-note toast (2.5s) */}
      {addedToast && (
        <InfoBanner>Añadido a Notas — crea una nota nueva para verlo.</InfoBanner>
      )}

      {/* error state */}
      {error && <ErrorBanner message={error} />}

      {/* empty state — shown when input is empty or hasn't been parsed yet */}
      {!parsed && !error && (
        <InfoBanner>
          Pega un Distinguished Name (DN) en formato LDAP arriba. Ejemplo:{' '}
          <code className="font-mono text-blue-300">
            CN=John Doe,OU=SOC,OU=Users,DC=company,DC=local
          </code>
        </InfoBanner>
      )}

      {/* results — only shown when a valid DN is parsed */}
      {parsed && (
        <div className="space-y-3">
          {/* a. parsed components */}
          <section className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-400">
              <GitBranch className="w-3 h-3" />
              Parsed components
            </div>
            <div className="space-y-1">
              {parsed.components.map((c) => (
                <div key={c.index} className="flex items-center gap-2 text-[11px]">
                  <span className="text-[#444] font-mono w-5 text-right shrink-0">
                    {c.index}.
                  </span>
                  <span
                    className={`font-mono font-bold px-1.5 py-0.5 rounded border ${attrBadgeCls(c.attr)}`}
                  >
                    {c.attr}
                  </span>
                  <span className="font-mono text-white break-all flex-1">
                    {c.value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* b. derived domain */}
          <section className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-400">
              <Server className="w-3 h-3" />
              Derived domain
            </div>
            <Row label="Domain" value={parsed.domain || '—'} mono />
          </section>

          {/* c. tree visualization */}
          <section className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-400">
              <Network className="w-3 h-3" />
              Tree visualization
            </div>
            <pre className="bg-[#0A0A0A] border border-[#262626] rounded p-2.5 font-mono text-[11px] text-green-300 whitespace-pre overflow-x-auto">
              {parsed.tree}
            </pre>
          </section>

          {/* d. component count summary */}
          <section className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-400">
              <Layers className="w-3 h-3" />
              Summary
            </div>
            <Row label="Components" value={countSummary(parsed.components)} />
          </section>
        </div>
      )}
    </div>
  );
};

export default LdapDnParserTool;
