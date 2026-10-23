/**
 * integrations/mitre/sync.ts — MITRE ATT&CK official dataset sync (REAL).
 *
 * V10 (spec #15, #16 + análisis V10 Fase 2): "Internet ↓ Download ↓ Validate ↓
 * Preview ↓ User confirms ↓ Backup current dataset ↓ Import new dataset.
 * MITRE works offline after sync. NEVER overwrite the current dataset
 * automatically. NEVER leave MITRE in a partially-imported state."
 *
 * SOURCES (official, ✅ verified 2026-09):
 *  - Version manifest: https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/index.json
 *    (~200KB). It lists every collection (Enterprise/Mobile/ICS) with its
 *    versions[] {version, url, modified}. Used by checkMitreUpdates().
 *  - STIX 2.1 bundle: the version's `url` points into the same repo
 *    (enterprise-attack/enterprise-attack-<v>.json, ~54MB). raw.githubusercontent.com
 *    sends `Access-Control-Allow-Origin: *`, so the browser fetches it directly
 *    — NO proxy, NO third-party service beyond GitHub itself.
 *
 * MEMORY-SAFE PARSING: the bundle is ~54MB of JSON. JSON.parse of the whole
 * file would allocate several hundred MB transiently — unacceptable on modest
 * hardware. Instead we STREAM the response body and extract complete
 * top-level objects (bracket-depth scanner, ~100 lines) — each object is
 * JSON.parsed individually and discarded unless it is an `attack-pattern`.
 * Peak memory stays at a few MB plus the ~858 filtered techniques.
 *
 * RULES (unchanged from the architecture):
 *  - NEVER auto-called. Only on explicit [Sync] / [Check for Updates] clicks.
 *  - The bundled dataset (data/mitreData.ts, curated ES) is ALWAYS the offline
 *    baseline; synced techniques are a LAYER merged by id (official name/
 *    description/platforms/tactics win; curated detection/relatedTools/tags
 *    from the bundle are preserved).
 *  - Swap is atomic: the new rows are bulkPut into `mitreTechniques` only
 *    after the whole download+validate succeeded (a failed sync leaves the
 *    previous dataset untouched).
 *  - No API key. No PII. Only public URLs are requested.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type SyncedMitreTechnique, type DatasetMeta } from '../../db';
import { MITRE_TECHNIQUES, type MitreTechnique, type MitreSubtechnique } from '../../data/mitreData';
import { isOnline } from '../online';
import { fetchWithTimeout, sanitizeStr, sanitizeStrArr } from '../threatIntel/client';
import { classifyError } from '../threatIntel/errors';

/** The version string baked into the bundled dataset. Bumped manually when
 *  we update mitreData.ts. */
const BUNDLED_MITRE_VERSION = '15.0.0-bundled';

/** Official index.json (version manifest). Small (~200KB). */
const MITRE_INDEX_URL =
  'https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/index.json';

/** Hard safety caps for the streaming download. */
const MAX_BUNDLE_BYTES = 120 * 1024 * 1024; // 120MB — bundle is ~54MB today
const IDLE_TIMEOUT_MS = 30_000; // abort if the stream stalls 30s with no data

/* ============================================================= */
/* Local metadata                                                */
/* ============================================================= */

/** Metadata about the locally-installed MITRE dataset. */
export interface MitreLocalMeta {
  version: string;
  techniquesCount: number;
  lastSync: string | null;
  source: 'bundled' | 'synced';
}

/** Read the locally-installed MITRE metadata. Falls back to bundled dataset
 *  info when no sync row exists in datasetMeta. */
export async function getLocalMitreMeta(): Promise<MitreLocalMeta> {
  const [row, syncedCount] = await Promise.all([
    db.datasetMeta.get('singleton'),
    db.mitreTechniques.count(),
  ]);
  if (row && row.mitreLastSync && syncedCount > 0) {
    const bundledOnly = await countMergedBundledOnly();
    return {
      version: row.mitreVersion,
      techniquesCount: syncedCount + bundledOnly,
      lastSync: row.mitreLastSync,
      source: 'synced',
    };
  }
  return {
    version: row?.mitreVersion || BUNDLED_MITRE_VERSION,
    techniquesCount: MITRE_TECHNIQUES.length,
    lastSync: row?.mitreLastSync ?? null,
    source: row?.mitreLastSync ? 'synced' : 'bundled',
  };
}

/** How many bundled techniques are NOT covered by the synced set (they are
 *  still shown merged). */
async function countMergedBundledOnly(): Promise<number> {
  try {
    const syncedIds = new Set((await db.mitreTechniques.toCollection().keys()) as string[]);
    return MITRE_TECHNIQUES.filter((t) => !syncedIds.has(t.id)).length;
  } catch {
    return 0;
  }
}

/* ============================================================= */
/* Check for updates (index.json — tiny, official)               */
/* ============================================================= */

/** Newer dataset metadata — returned by checkMitreUpdates(). */
export interface MitreUpdateMeta {
  latestVersion: string;
  publishedAt: string;
  /** Number of techniques the LATEST bundle contains (unknown until a sync —
   *  reported as the locally-known count for display). */
  entryCount: number;
  /** Approximate size in bytes (for preview display). 0 = unknown. */
  sizeBytes: number;
  /** Download URL of the latest official bundle. */
  bundleUrl: string;
}

interface IndexCollection {
  name?: string;
  versions?: Array<{ version?: string; url?: string; modified?: string }>;
}

/** Check for a newer MITRE dataset against the official index.json.
 *  NEVER called automatically — only on explicit user click. */
export async function checkMitreUpdates(): Promise<MitreUpdateMeta> {
  if (!isOnline()) {
    throw new Error('No Internet connection.');
  }
  const res = await fetchWithTimeout(MITRE_INDEX_URL, { timeoutMs: 20_000 });
  const body = (await res.json()) as { collections?: IndexCollection[] };
  const ent = (body.collections || []).find((c) => /enterprise/i.test(c.name || ''));
  const latest = ent?.versions?.find((v) => v.version && v.url);
  if (!latest || !latest.version || !latest.url) {
    throw new Error('Official MITRE index did not list an Enterprise version.');
  }
  return {
    latestVersion: latest.version,
    publishedAt: latest.modified || new Date().toISOString(),
    entryCount: (await db.mitreTechniques.count()) || MITRE_TECHNIQUES.length,
    sizeBytes: 0,
    bundleUrl: latest.url,
  };
}

/* ============================================================= */
/* Sync — streaming STIX extraction                              */
/* ============================================================= */

export interface MitreSyncResult {
  status: 'noop' | 'offline' | 'up_to_date' | 'not_implemented' | 'ok' | 'error';
  message: string;
  /** Techniques stored when status==='ok'. */
  techniques?: number;
}

/** Progress callback for the UI (bytes down + objects scanned). */
export type SyncProgress = (info: { bytes: number; objects: number }) => void;

/** One raw STIX attack-pattern object (subset of fields we read). */
interface RawAttackPattern {
  type?: string;
  id?: string;
  name?: string;
  description?: string;
  revoked?: boolean;
  x_mitre_deprecated?: boolean;
  x_mitre_platforms?: unknown;
  kill_chain_phases?: Array<{ kill_chain_name?: string; phase_name?: string }>;
  external_references?: Array<{ source_name?: string; url?: string; external_id?: string }>;
}

/** ATT&CK kill-chain phase name → display tactic name (official mapping). */
const PHASE_TO_TACTIC: Record<string, string> = {
  reconnaissance: 'Reconnaissance',
  'resource-development': 'Resource Development',
  'initial-access': 'Initial Access',
  execution: 'Execution',
  persistence: 'Persistence',
  'privilege-escalation': 'Privilege Escalation',
  'defense-evasion': 'Defense Evasion',
  'credential-access': 'Credential Access',
  discovery: 'Discovery',
  'lateral-movement': 'Lateral Movement',
  collection: 'Collection',
  'command-and-control': 'Command and Control',
  exfiltration: 'Exfiltration',
  impact: 'Impact',
};

/** Extract the canonical technique id (Txxxx[.yyy]) from the official
 *  external_references block. */
function techniqueId(ap: RawAttackPattern): string {
  const ref = (ap.external_references || []).find(
    (r) => r.source_name === 'mitre-attack' && typeof r.external_id === 'string' && /^T\d{4}/.test(r.external_id),
  );
  return ref?.external_id || '';
}

/** Normalize a raw attack-pattern into the stored synced shape. */
function normalize(ap: RawAttackPattern, version: string, syncedAt: string): SyncedMitreTechnique | null {
  const id = techniqueId(ap);
  if (!id || !ap.id || typeof ap.name !== 'string') return null;
  const tactics = (ap.kill_chain_phases || [])
    .filter((k) => k.kill_chain_name === 'mitre-attack' || !k.kill_chain_name)
    .map((k) => PHASE_TO_TACTIC[k.phase_name || ''] || (k.phase_name || ''))
    .filter(Boolean);
  const url = (ap.external_references || []).find((r) => r.source_name === 'mitre-attack')?.url || '';
  return {
    id,
    stixId: sanitizeStr(ap.id, 80),
    name: sanitizeStr(ap.name, 120),
    description: sanitizeStr(ap.description, 600),
    tactic: [...new Set(tactics)].join(' / '),
    platforms: sanitizeStrArr(ap.x_mitre_platforms, 12),
    url: sanitizeStr(url, 120),
    version,
    syncedAt,
    revoked: ap.revoked === true,
    deprecated: ap.x_mitre_deprecated === true,
  };
}

/**
 * Stream the STIX bundle and return every attack-pattern object.
 *
 * Bracket-depth scanner over the decoded text: the bundle is
 * `{"type":"bundle", …, "objects":[ {…}, {…}, … ]}`. Objects of the root
 * array live at depth 3 (root=1, array=2, item=3). When an item completes,
 * its substring is JSON.parsed on its own and the buffer is trimmed — so the
 * whole 54MB never exists as a single parsed structure.
 */
async function streamAttackPatterns(
  url: string,
  onProgress?: SyncProgress,
): Promise<RawAttackPattern[]> {
  const ctrl = new AbortController();
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const bumpIdle = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => ctrl.abort(), IDLE_TIMEOUT_MS);
  };
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow',
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    if (!res.body) {
      // Very old browsers without ReadableStream — fall back to full text.
      const txt = await res.text();
      return extractFromFullText(txt);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const found: RawAttackPattern[] = [];
    let pending = '';
    /** Chars at the START of `pending` already scanned — CRITICAL: without
     *  this, every new chunk re-scanned the whole buffer from 0 and the
     *  brace depth double-counted, exploding to nonsense (found while
     *  testing: depth 14, zero objects). With it, each char is processed
     *  exactly once. */
    let scanPos = 0;
    let depth = 0;
    let inStr = false;
    let esc = false;
    let objStart = -1;
    let bytes = 0;
    let objects = 0;
    /** Scan `pending` from `scanPos` to its end, extracting complete
     *  top-level STIX objects. Shared by the streaming loop and the final
     *  flush so the char logic exists exactly once. */
    const scanPending = (): void => {
      for (let i = scanPos; i < pending.length; i++) {
        const c = pending[i];
        if (inStr) {
          if (esc) { esc = false; continue; }
          if (c === '\\') { esc = true; continue; }
          if (c === '"') inStr = false;
          continue;
        }
        if (c === '"') { inStr = true; continue; }
        if (c === '{') {
          depth++;
          if (depth === 3) objStart = i;
        } else if (c === '[') {
          depth++;
        } else if (c === '}') {
          if (depth === 3 && objStart >= 0) {
            const candidate = pending.slice(objStart, i + 1);
            objects++;
            if (objects % 200 === 0) onProgress?.({ bytes, objects });
            try {
              const o = JSON.parse(candidate) as RawAttackPattern;
              if (o && o.type === 'attack-pattern') found.push(o);
            } catch { /* skip malformed object — never fails the sync */ }
            pending = pending.slice(i + 1);
            scanPos = 0;
            i = -1; // restart the scan on the trimmed buffer
            objStart = -1;
            depth = 2; // the item's closing brace was consumed
          } else {
            depth--;
          }
        } else if (c === ']') {
          depth--;
        }
      }
      scanPos = pending.length;
    };
    bumpIdle();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BUNDLE_BYTES) {
        ctrl.abort();
        throw new Error('Bundle exceeded the 120MB safety cap — aborted.');
      }
      bumpIdle();
      pending += decoder.decode(value, { stream: true });
      scanPending();
    }
    // Final flush: decoder tail (multibyte sequences spanning chunks) + the
    // last unscanned stretch of the buffer.
    pending += decoder.decode();
    scanPending();
    onProgress?.({ bytes, objects });
    return found;
  } finally {
    if (idleTimer) clearTimeout(idleTimer);
  }
}

/** Fallback path: parse the whole text at once (old browsers). */
function extractFromFullText(text: string): RawAttackPattern[] {
  const bundle = JSON.parse(text) as { objects?: RawAttackPattern[] };
  return (bundle.objects || []).filter((o) => o && o.type === 'attack-pattern');
}

/** Sync (download + validate + swap) the MITRE dataset from the official
 *  bundle. The [Sync] click IS the user confirmation (spec flow). Atomic:
 *  nothing is written until the full download + parse succeeded. */
export async function syncMitre(opts: { onProgress?: SyncProgress } = {}): Promise<MitreSyncResult> {
  if (!isOnline()) return { status: 'offline', message: 'No Internet connection.' };

  // 1. Resolve the latest official bundle URL from index.json.
  const upd = await checkMitreUpdates();

  // 2. Stream + extract attack-patterns (memory-safe).
  let raw: RawAttackPattern[];
  try {
    raw = await streamAttackPatterns(upd.bundleUrl, opts.onProgress);
  } catch (e) {
    const kind = classifyError(e).kind;
    return {
      status: 'error',
      message:
        kind === 'network_timeout'
          ? 'Download timed out — the official bundle is ~54MB. Try again on a better connection.'
          : 'Download failed — GitHub unreachable or CORS blocked.',
    };
  }
  if (raw.length < 100) {
    // Sanity guard: a valid Enterprise bundle always has 600+ patterns.
    return { status: 'error', message: 'Bundle looked invalid (<100 techniques) — sync aborted, local data untouched.' };
  }

  // 3. Normalize + validate (drop revoked/deprecated so the Explorer stays clean).
  const syncedAt = new Date().toISOString();
  const rows: SyncedMitreTechnique[] = [];
  for (const ap of raw) {
    if (ap.revoked === true || ap.x_mitre_deprecated === true) continue;
    const n = normalize(ap, upd.latestVersion, syncedAt);
    if (n) rows.push(n);
  }
  if (rows.length < 100) {
    return { status: 'error', message: 'Normalization produced too few techniques — sync aborted.' };
  }

  // 4. Atomic swap: clear + bulkPut in one transaction; then mark datasetMeta.
  await db.transaction('rw', db.mitreTechniques, db.datasetMeta, async () => {
    await db.mitreTechniques.clear();
    await db.mitreTechniques.bulkPut(rows);
    const existing = await db.datasetMeta.get('singleton');
    const meta: DatasetMeta = {
      id: 'singleton',
      mitreVersion: upd.latestVersion,
      mitreLastSync: syncedAt,
      sigmaVersion: existing?.sigmaVersion || '',
      sigmaLastSync: existing?.sigmaLastSync ?? null,
      sigmaRulesCount: existing?.sigmaRulesCount ?? 0,
      updatedAt: syncedAt,
      kevVersion: existing?.kevVersion,
      kevLastSync: existing?.kevLastSync ?? null,
      kevCount: existing?.kevCount,
    };
    await db.datasetMeta.put(meta);
  });

  return {
    status: 'ok',
    message: `Synced official MITRE ATT&CK v${upd.latestVersion} — ${rows.length} techniques stored (works offline forever).`,
    techniques: rows.length,
  };
}

/* ============================================================= */
/* Merged view accessors (bundled ∪ synced — the UI reads these) */
/* ============================================================= */

/** Merge rule: for a technique id present in BOTH, the official synced row
 *  wins for name/description/tactic/platforms and the official sub-technique
 *  list; the bundled curated row keeps its detection notes, relatedTools and
 *  tags (they are ES hand-written value-adds the STIX bundle no longer
 *  carries). Bundled-only techniques are kept; synced-only ones are added. */
export function mergeMitreTechniques(
  bundled: readonly MitreTechnique[],
  synced: readonly SyncedMitreTechnique[],
): MitreTechnique[] {
  const syncedMap = new Map(synced.map((s) => [s.id, s]));
  // Children by parent id from the synced set (T1059.001 → T1059).
  const syncedChildren = new Map<string, MitreSubtechnique[]>();
  for (const s of synced) {
    if (!s.id.includes('.')) continue;
    const parent = s.id.split('.')[0];
    const arr = syncedChildren.get(parent) || [];
    arr.push({ id: s.id, name: s.name, description: s.description });
    syncedChildren.set(parent, arr);
  }
  const out: MitreTechnique[] = [];
  const seen = new Set<string>();
  for (const b of bundled) {
    seen.add(b.id);
    const s = syncedMap.get(b.id);
    if (!s) {
      out.push(b);
      continue;
    }
    const officialChildren = syncedChildren.get(b.id);
    out.push({
      ...b,
      name: s.name || b.name,
      description: s.description || b.description,
      tactic: s.tactic || b.tactic,
      platforms: s.platforms.length ? s.platforms : b.platforms,
      subtechniques: officialChildren && officialChildren.length ? officialChildren : b.subtechniques,
    });
  }
  for (const s of synced) {
    if (seen.has(s.id) || s.id.includes('.')) continue; // children live inside parents
    out.push({
      id: s.id,
      name: s.name,
      tactic: s.tactic,
      description: s.description,
      detection: '(Oficial — sin notas locales de detección)',
      platforms: s.platforms,
      subtechniques: syncedChildren.get(s.id) || [],
      relatedTools: [],
      tags: [],
    });
  }
  return out;
}

/** Live merged techniques (bundled ∪ synced) for the MITRE Explorer. Falls
 *  back to the bundled array while Dexie resolves (useLiveQuery default). */
export function useMitreTechniques(): MitreTechnique[] {
  const synced = useLiveQuery(() => db.mitreTechniques.toArray(), [], [] as SyncedMitreTechnique[]);
  if (!synced || synced.length === 0) return MITRE_TECHNIQUES;
  return mergeMitreTechniques(MITRE_TECHNIQUES, synced);
}
