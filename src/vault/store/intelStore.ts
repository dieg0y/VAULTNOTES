/**
 * intelStore.ts — DATA & INTEL (v16) reactive hub.
 *
 * Single entry point for every write into the `intelItems` Dexie table:
 *  - Tools (IoC Extractor, Sigma Explorer, Detection Query Helper, …) call
 *    `useIntelStore.getState().addIntelItems([...])`.
 *  - DataIntelView's manual add / edit / delete / import flows call the same
 *    actions (or `bump()` after direct db writes) so every consumer stays in
 *    sync.
 *
 * Reactivity model:
 *  - `version` bumps on every successful write. Any mounted component can
 *    subscribe (`useIntelStore((s) => s.version)`) for instant refreshes on
 *    top of the Dexie useLiveQuery the Data & Intel view already runs — so
 *    items added from ANY tool show up in Data & Intel without a refresh.
 *  - `lastAdded` carries the { added, skipped } result so tools can render a
 *    short inline confirmation.
 *  - `navigateRequest` lets a tool ask App.tsx to switch to the data-intel
 *    section (App consumes it and clears it — one-shot, no loops).
 *
 * Validation & sanitization:
 *  - All text is stored PLAIN (rendered as text, never dangerouslySetHTML).
 *  - Fields are trimmed and length-capped; tags/mitre are deduped arrays.
 *  - Dumb duplicates are refused: the dedup key is
 *      ioc   → kind|iocType|value-lowercase
 *      rule  → kind|contentLang|title-lowercase
 *      event → kind||title-lowercase
 *    Re-sending the same Sigma rule / the same IP twice is a no-op (counted
 *    as `skipped`), never a second row.
 *
 * 100% offline — nothing here touches the network.
 */
import { create } from 'zustand';
import { db, type IntelItem, type IntelKind } from '../db';

/** Loose input accepted from tools / manual UI / import — normalized inside. */
export interface IntelItemInput {
  kind: IntelKind;
  /** IoC: the indicator value. Event/Rule: short title. Required. */
  title: string;
  iocType?: string;
  severity?: string;
  confidence?: string;
  description?: string;
  tags?: string[];
  source?: string;
  mitre?: string[];
  content?: string;
  contentLang?: string;
}

export interface IntelAddResult {
  /** Rows written to IndexedDB. */
  added: number;
  /** Rows refused as duplicates of an existing (or in-batch) item. */
  skipped: number;
  /** Rows dropped because they had no usable title/value. */
  invalid: number;
}

interface IntelStore {
  /** Bumped after every successful write — subscribe for instant refreshes. */
  version: number;
  /** Result of the last addIntelItems batch (for inline tool feedback). */
  lastAdded: IntelAddResult | null;
  /** Timestamp of a pending "navigate to Data & Intel" request (0 = none). */
  navigateRequest: number;
  addIntelItems: (items: IntelItemInput[]) => Promise<IntelAddResult>;
  /** Bump `version` after direct db.intelItems writes (edit/delete/import). */
  bump: () => void;
  clearLastAdded: () => void;
  /** Ask App to switch to the data-intel section (one-shot). */
  requestNavigate: () => void;
  consumeNavigate: () => void;
}

/* ---------------- normalization helpers (pure) ---------------- */

const cap = (s: string, max: number): string => {
  const t = s.trim();
  return t.length > max ? t.slice(0, max) : t;
};

function normalizeTags(raw: string[] | undefined): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    const v = cap(String(t), 60);
    if (v && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      out.push(v);
      if (out.length >= 20) break;
    }
  }
  return out;
}

function normalizeMitre(raw: string[] | undefined): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    const v = cap(String(t).toUpperCase(), 20);
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push(v);
      if (out.length >= 20) break;
    }
  }
  return out;
}

/** Dedup key — see module doc for the per-kind definition. */
function dedupKeyOf(item: IntelItem): string {
  const titleLower = item.title.trim().toLowerCase();
  if (item.kind === 'ioc') return `ioc|${(item.iocType || '').toLowerCase()}|${titleLower}`;
  if (item.kind === 'rule') return `rule|${(item.contentLang || '').toLowerCase()}|${titleLower}`;
  return `event||${titleLower}`;
}

function normalizeInput(input: IntelItemInput, now: string): IntelItem | null {
  const title = cap(String(input.title ?? ''), 300);
  if (!title) return null;
  const kind: IntelKind =
    input.kind === 'event' || input.kind === 'rule' ? input.kind : 'ioc';
  const item: IntelItem = {
    id: `intel-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    kind,
    title,
    iocType: input.iocType ? cap(String(input.iocType).toLowerCase(), 40) : undefined,
    severity: input.severity ? cap(String(input.severity).toLowerCase(), 20) : undefined,
    confidence: input.confidence ? cap(String(input.confidence).toLowerCase(), 20) : undefined,
    description: input.description ? cap(String(input.description), 2000) : undefined,
    tags: normalizeTags(input.tags),
    source: input.source ? cap(String(input.source), 100) : undefined,
    mitre: normalizeMitre(input.mitre),
    content: input.content ? cap(String(input.content), 100_000) : undefined,
    contentLang: input.contentLang ? cap(String(input.contentLang).toLowerCase(), 20) : undefined,
    createdAt: now,
    updatedAt: now,
  };
  return item;
}

/* ---------------- store ---------------- */

export const useIntelStore = create<IntelStore>((set) => ({
  version: 0,
  lastAdded: null,
  navigateRequest: 0,

  addIntelItems: async (items) => {
    const now = new Date().toISOString();
    const normalized: IntelItem[] = [];
    let invalid = 0;
    for (const input of items) {
      const item = normalizeInput(input, now);
      if (item) normalized.push(item);
      else invalid++;
    }

    // Dedup against the LIVE table (all kinds) + within the batch itself.
    let existingKeys = new Set<string>();
    try {
      const all = await db.intelItems.toArray();
      existingKeys = new Set(all.map(dedupKeyOf));
    } catch {
      /* table read failed (fresh DB / private mode) — treat as empty */
    }
    const toPut: IntelItem[] = [];
    let skipped = 0;
    for (const item of normalized) {
      const key = dedupKeyOf(item);
      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }
      existingKeys.add(key);
      toPut.push(item);
    }

    if (toPut.length > 0) {
      await db.intelItems.bulkPut(toPut);
    }

    const result: IntelAddResult = { added: toPut.length, skipped, invalid };
    if (toPut.length > 0) {
      set((s) => ({ version: s.version + 1, lastAdded: result }));
    } else {
      set({ lastAdded: result });
    }
    return result;
  },

  bump: () => set((s) => ({ version: s.version + 1 })),

  clearLastAdded: () => set({ lastAdded: null }),

  requestNavigate: () => set({ navigateRequest: Date.now() }),

  consumeNavigate: () => set({ navigateRequest: 0 }),
}));
