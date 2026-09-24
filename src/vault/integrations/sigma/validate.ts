/**
 * integrations/sigma/validate.ts — Sigma rule YAML parsing + validation.
 *
 * Spec #18, #19: "Do NOT execute Sigma rules. Do NOT interpret YAML as
 *  executable code. Validate YAML structure, rule id, title, status,
 *  logsource, detection, tags. If a rule is invalid, do NOT import it."
 *
 * DESIGN:
 *  - We use a TINY, hand-rolled YAML subset parser. We deliberately do NOT
 *    use `js-yaml` (would be a real dependency) — Sigma rules use a very
 *    constrained YAML subset (2-space indent, string/number/list values,
 *    block-lists with `- `), so a focused parser is enough and keeps the
 *    bundle tiny.
 *  - The parser produces a plain JS object. We validate the Sigma-required
 *    fields. We NEVER eval the detection block — it's treated as DATA only.
 *  - Output is the validated rule fields + the raw YAML text (stored
 *    verbatim for display + future export).
 */
import { db, type CustomSigmaRule } from '../../db';

/** The minimal shape we extract from a Sigma rule YAML. */
export interface ParsedSigmaRule {
  title: string;
  id?: string;
  status: string;
  description: string;
  author: string;
  date: string;
  level: string;
  logsource: string;
  detection: string;
  tags: string[];
  mitre: string[];
  /** Raw YAML text, verbatim. */
  yaml: string;
  /** Validation errors (empty if valid). */
  errors: string[];
}

/** Tiny YAML-subset parser. Handles the constructs Sigma rules use:
 *  top-level `key: value` pairs, nested maps (logsource, detection), block
 *  lists (`- item` — BOTH indented under their key AND at the key's own
 *  indent, the two styles the official SigmaHQ rules mix), lists of maps
 *  (`- key: value` items with nested keys/lists), and quoted scalars.
 *  Throws on unsupported constructs so callers can reject the rule rather
 *  than guess.
 *
 *  V10 FIX: the original parser could not attach a block list to the `key:`
 *  that owned it (it looked for the key INSIDE the child map, which is
 *  empty), so every official SigmaHQ rule (they all use block lists) failed
 *  validation with "list item without parent key". Frames now record their
 *  owner object + key so list items resolve to the right parent; flat/curated
 *  rules parse exactly as before (same output for the constructs that
 *  already worked). */
interface YamlFrame {
  /** Map that new key-lines write into. */
  obj: Record<string, unknown>;
  /** Indent of the line that created this frame (list/key lines at an indent
   *  <= this pop the frame — its content is finished). */
  indent: number;
  /** For `key:` frames: the object that holds `key` — block lists under this
   *  frame attach to owner[key] as an array. Null for root/map-item frames. */
  owner: Record<string, unknown> | null;
  /** For `key:` frames: the key name in `owner`. */
  key: string | null;
  /** For map-item frames (`- key: value` inside a list): the sibling list —
   *  the next `- ` item at the same indent continues here after this frame
   *  is popped. Null otherwise. */
  arr: unknown[] | null;
}

/** True when a list item's content should be treated as `key: value` (the
 *  start of a map item) rather than a plain scalar. Quoted scalars and URLs
 *  (scheme colons) are excluded. */
function looksLikeKeyValue(s: string): boolean {
  if (s.startsWith('"') || s.startsWith("'")) return false;
  const colonIdx = s.indexOf(':');
  if (colonIdx <= 0) return false;
  return /^[A-Za-z0-9_.\-|[\]() ]+$/.test(s.slice(0, colonIdx));
}

function parseYamlSubset(text: string): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  const stack: YamlFrame[] = [
    { obj: root, indent: -1, owner: null, key: null, arr: null },
  ];
  while (i < lines.length) {
    let line = lines[i];
    // strip trailing comments (but not inside quoted strings — sigma rules
    // rarely have inline comments; if they do, we err on the side of keeping
    // the line as-is).
    const commentIdx = findCommentIndex(line);
    if (commentIdx >= 0) line = line.slice(0, commentIdx);
    if (!line.trim()) { i++; continue; }
    const indent = line.match(/^[ \t]*/)?.[0].length ?? 0;
    const content = line.slice(indent).trim();

    /* ---- LIST ITEM (`- …`) ---- handled with the SAME pop rule as key
     * lines: frames whose content is finished (indent >= this line's) are
     * popped first; then the list resolves to (a) the top `key:` frame's
     * owner[key] (indented style), or (b) the last key of the top map
     * (same-indent style pops the owning frame, landing on its parent). */
    if (content.startsWith('- ') || content === '-') {
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
      const top = stack[stack.length - 1];
      let arr: unknown[];
      if (top.key !== null && top.owner && top.indent < indent) {
        // Indented style: `key:` on a previous line, items deeper.
        const cur = top.owner[top.key];
        arr = Array.isArray(cur) ? cur : (top.owner[top.key] = []);
      } else {
        // Same-indent style (or a list directly inside the top map): the
        // last key written into the top map owns the list.
        const key = Object.keys(top.obj).pop();
        if (!key) throw new Error(`list item without parent key @ line ${i + 1}`);
        const cur = top.obj[key];
        arr = Array.isArray(cur) ? cur : (top.obj[key] = []);
      }
      const rest = content === '-' ? '' : content.slice(2).trim();
      if (rest === '') {
        arr.push('');
      } else if (looksLikeKeyValue(rest)) {
        // Map item: `- key: value` (or `- key:` with a nested block).
        const colonIdx = rest.indexOf(':');
        const k = rest.slice(0, colonIdx).trim();
        const v = rest.slice(colonIdx + 1).trim();
        const m: Record<string, unknown> = {};
        arr.push(m);
        if (v === '') {
          const child: Record<string, unknown> = {};
          m[k] = child;
          stack.push({ obj: child, indent, owner: m, key: k, arr: null });
        } else {
          m[k] = parseScalar(v);
          // Frame so following deeper keys/nested lists write into the map
          // item; sibling `- ` items at the same indent pop it first.
          stack.push({ obj: m, indent, owner: null, key: null, arr });
        }
      } else {
        arr.push(parseScalar(rest));
      }
      i++;
      continue;
    }

    /* ---- KEY LINE (`key:` / `key: value`) ---- */
    // pop stack until the top frame's content is finished (its creating
    // indent is shallower than this line's).
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1].obj;
    if (content.includes(':')) {
      const colonIdx = content.indexOf(':');
      const key = content.slice(0, colonIdx).trim();
      const val = content.slice(colonIdx + 1).trim();
      if (val === '') {
        // nested map — push new frame remembering its owner + key so block
        // lists under it can resolve to owner[key].
        const child: Record<string, unknown> = {};
        parent[key] = child;
        stack.push({ obj: child, indent, owner: parent, key, arr: null });
      } else {
        parent[key] = parseScalar(val);
      }
    }
    // Lines without ':' and without '- ' (folded scalar continuations, plain
    // prose under a `|` block) are ignored — same as the original parser.
    i++;
  }
  return root;
}

function findCommentIndex(line: string): number {
  let inSingle = false, inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === '#' && !inSingle && !inDouble) return i;
  }
  return -1;
}

function parseScalar(s: string): unknown {
  if (!s) return '';
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  if (s === '[]') return [];
  // number?
  const n = Number(s);
  if (s !== '' && !isNaN(n) && /^-?\d+(\.\d+)?$/.test(s)) return n;
  return s;
}

/** Validate a Sigma rule YAML text. Returns the parsed rule with errors[]
 *  empty if valid, or with one or more errors if not. NEVER throws — the
 *  caller decides what to do with the errors.
 *  (V10: exported — the official-repo sync reuses this exact validator so
 *  synced rules go through the SAME structural gate as manual imports.) */
export function parseSigmaRule(yamlText: string): ParsedSigmaRule {
  const empty: ParsedSigmaRule = {
    title: '', id: undefined, status: '', description: '', author: '', date: '',
    level: '', logsource: '', detection: '', tags: [], mitre: [], yaml: yamlText, errors: [],
  };
  let parsed: Record<string, unknown>;
  try {
    parsed = parseYamlSubset(yamlText);
  } catch (e) {
    empty.errors.push('YAML parse failed: ' + (e instanceof Error ? e.message : String(e)));
    return empty;
  }
  const errors: string[] = [];
  const title = typeof parsed.title === 'string' ? parsed.title : '';
  if (!title) errors.push('Missing required field: title');
  const id = typeof parsed.id === 'string' ? parsed.id : undefined;
  const status = typeof parsed.status === 'string' ? parsed.status : '';
  if (!status) errors.push('Missing recommended field: status');
  const description = typeof parsed.description === 'string' ? parsed.description : '';
  const author = typeof parsed.author === 'string' ? parsed.author : '';
  const date = typeof parsed.date === 'string' ? parsed.date : '';
  const level = typeof parsed.level === 'string' ? parsed.level : '';
  if (!level) errors.push('Missing recommended field: level');
  const logsource = typeof parsed.logsource === 'object' && parsed.logsource
    ? JSON.stringify(parsed.logsource) : '';
  if (!logsource) errors.push('Missing required field: logsource');
  const detection = typeof parsed.detection === 'object' && parsed.detection
    ? JSON.stringify(parsed.detection) : '';
  if (!detection) errors.push('Missing required field: detection');
  const tags = Array.isArray(parsed.tags) ? parsed.tags.map((t) => String(t)) : [];
  const mitre = tags.filter((t) => typeof t === 'string' && t.startsWith('attack.'))
    .concat(Array.isArray(parsed.mitre) ? parsed.mitre.map((m) => String(m)) : []);
  return {
    title, id, status, description, author, date, level,
    logsource, detection, tags, mitre, yaml: yamlText, errors,
  };
}

/** Import a validated Sigma rule into the customSigmaRules table. Returns the
 *  new row id. Throws if the rule is invalid. */
export async function importSigmaRule(yamlText: string): Promise<{ id: string; errors: string[] }> {
  const parsed = parseSigmaRule(yamlText);
  if (parsed.errors.length) {
    return { id: '', errors: parsed.errors };
  }
  const now = new Date().toISOString();
  const row: CustomSigmaRule = {
    id: `custom-sigma-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ruleUuid: parsed.id,
    title: parsed.title,
    status: parsed.status,
    level: parsed.level,
    description: parsed.description,
    author: parsed.author,
    date: parsed.date,
    logsource: parsed.logsource,
    detection: parsed.detection,
    tags: parsed.tags,
    mitre: parsed.mitre,
    yaml: parsed.yaml,
    importedAt: now,
    updatedAt: now,
  };
  await db.customSigmaRules.put(row);
  return { id: row.id, errors: [] };
}

/** Delete a custom Sigma rule by id. */
export async function deleteCustomSigmaRule(id: string): Promise<void> {
  await db.customSigmaRules.delete(id);
}

/** Update a custom Sigma rule's raw YAML (re-validates + rewrites fields). */
export async function updateCustomSigmaRule(
  id: string,
  newYaml: string,
): Promise<{ errors: string[] }> {
  const parsed = parseSigmaRule(newYaml);
  if (parsed.errors.length) return { errors: parsed.errors };
  await db.customSigmaRules.update(id, {
    title: parsed.title,
    status: parsed.status,
    level: parsed.level,
    description: parsed.description,
    logsource: parsed.logsource,
    detection: parsed.detection,
    tags: parsed.tags,
    mitre: parsed.mitre,
    yaml: parsed.yaml,
    updatedAt: new Date().toISOString(),
  });
  return { errors: [] };
}
