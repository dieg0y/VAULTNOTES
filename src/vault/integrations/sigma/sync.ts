/**
 * integrations/sigma/sync.ts — Official SigmaHQ rules sync (REAL).
 *
 * Spec #17, #18 + V10 (Fase 2): "Download rules → store locally → Sigma
 * Explorer works offline. NEVER execute Sigma rules. NEVER interpret YAML as
 * code. Validate YAML structure, rule id, title, status, logsource,
 * detection, tags."
 *
 * SOURCE (official, ✅ verified 2026-09):
 *  - Repository: github.com/SigmaHQ/sigma (3.000+ rules, "at no cost").
 *  - Subset synced: `rules/windows/builtin/security` (~144 files — the
 *    classic high-value Windows Security EventID rules that match the app's
 *    SOC focus). The walk is recursive, so subdirectories count too.
 *  - Transport: jsDelivr public CDN serving the official repo content
 *    byte-identically (listing via data.jsdelivr.com, files via
 *    cdn.jsdelivr.net) — CORS `*`, no API key, no rate limit. Fallback: the
 *    GitHub REST contents API (60 req/h anonymous) + raw.githubusercontent.com.
 *    Either path fetches the SAME official files.
 *
 * RULES (unchanged):
 *  - NEVER auto-called; only on explicit [Sync] clicks.
 *  - Bundled curated rules (data/sigmaData.ts) stay the offline baseline and
 *    WIN on ruleUuid collisions (they carry the structured ES detection
 *    display); synced rules are appended and deduped against them.
 *  - YAML is DATA ONLY — validated with the same parseSigmaRule gate used by
 *    manual imports, stored verbatim, never executed.
 *  - Atomic swap: rows are written only after every file downloaded+validated.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type SyncedSigmaRule, type DatasetMeta } from '../../db';
import { SIGMA_RULES, type SigmaRule, type SigmaLevel, type SigmaStatus } from '../../data/sigmaData';
import { isOnline } from '../online';
import { fetchWithTimeout } from '../threatIntel/client';
import { parseSigmaRule } from './validate';

const BUNDLED_SIGMA_VERSION = '2024.01-bundled';

/** Repo + paths (official). */
const SIGMA_REPO = 'SigmaHQ/sigma';
const SIGMA_SUBPATH = 'rules/windows/builtin/security';
/** jsDelivr (public CDN that serves the official repo — verified CORS *). */
const JSDELIVR_LIST_URL = `https://data.jsdelivr.com/v1/packages/gh/${SIGMA_REPO}@master`;
const jsDelivrFileUrl = (path: string) => `https://cdn.jsdelivr.net/gh/${SIGMA_REPO}@master/${path}`;
/** GitHub REST fallback (60 req/h anonymous per IP; used only if the CDN
 *  listing fails — file fetches then go through raw.githubusercontent.com). */
const rawFileUrl = (path: string) => `https://raw.githubusercontent.com/${SIGMA_REPO}/master/${path}`;

/** Safety caps. */
const MAX_FILES = 200;
const FETCH_CONCURRENCY = 6;

/* ============================================================= */
/* Local metadata                                                */
/* ============================================================= */

export interface SigmaLocalMeta {
  version: string;
  bundledRulesCount: number;
  customRulesCount: number;
  syncedRulesCount: number;
  totalRulesCount: number;
  lastSync: string | null;
  source: 'bundled' | 'synced';
}

export async function getLocalSigmaMeta(): Promise<SigmaLocalMeta> {
  const [row, customCount, syncedCount] = await Promise.all([
    db.datasetMeta.get('singleton'),
    db.customSigmaRules.count(),
    db.sigmaRulesSynced.count(),
  ]);
  const bundled = SIGMA_RULES.length;
  const custom = customCount;
  const synced = syncedCount;
  return {
    version: row?.sigmaVersion || BUNDLED_SIGMA_VERSION,
    bundledRulesCount: bundled,
    customRulesCount: custom,
    syncedRulesCount: synced,
    totalRulesCount: bundled + custom + synced,
    lastSync: row?.sigmaLastSync ?? null,
    source: row?.sigmaLastSync && synced > 0 ? 'synced' : 'bundled',
  };
}

/* ============================================================= */
/* Check for updates                                             */
/* ============================================================= */

export interface SigmaUpdateMeta {
  latestVersion: string;
  publishedAt: string;
  ruleCount: number;
  sizeBytes: number;
}

interface JsDelivrNode {
  type?: string;
  name?: string;
  hash?: string;
  files?: JsDelivrNode[];
}

/** Recursively collect .yml/.yaml file paths under a jsDelivr tree node. */
function collectYmlPaths(node: JsDelivrNode, prefix: string, out: string[]): void {
  for (const f of node.files || []) {
    const p = prefix ? `${prefix}/${f.name}` : String(f.name || '');
    if (f.type === 'directory') {
      collectYmlPaths(f, p, out);
    } else if (/\.ya?ml$/i.test(p)) {
      out.push(p);
    }
  }
}

/** Walk the official repo tree (jsDelivr listing) and return the .yml paths
 *  of the synced subset. Throws with a clear message if both listing routes
 *  fail. */
async function listOfficialRulePaths(): Promise<string[]> {
  // Primary: jsDelivr data API (no rate limit, CORS *).
  try {
    const res = await fetchWithTimeout(JSDELIVR_LIST_URL, { timeoutMs: 25_000 });
    const tree = (await res.json()) as JsDelivrNode;
    let node: JsDelivrNode | undefined = tree;
    for (const part of SIGMA_SUBPATH.split('/')) {
      node = node?.files?.find((f) => f.name === part);
      if (!node) break;
    }
    if (node) {
      const paths: string[] = [];
      collectYmlPaths(node, SIGMA_SUBPATH, paths);
      if (paths.length > 0) return paths.slice(0, MAX_FILES);
    }
  } catch { /* fall through to GitHub API */ }
  // Fallback: GitHub REST contents API (recursive walk, 1 request per level).
  try {
    const paths: string[] = [];
    await walkGitHubDir(SIGMA_SUBPATH, paths);
    if (paths.length > 0) return paths.slice(0, MAX_FILES);
  } catch { /* both routes failed */ }
  throw new Error('Could not list the official Sigma rules directory (CDN and GitHub API both failed).');
}

async function walkGitHubDir(path: string, out: string[]): Promise<void> {
  const res = await fetchWithTimeout(
    `https://api.github.com/repos/${SIGMA_REPO}/contents/${encodeURI(path)}`,
    { timeoutMs: 20_000 },
  );
  if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`);
  const items = (await res.json()) as Array<{ path?: string; type?: string; download_url?: string }>;
  for (const it of items) {
    if (out.length >= MAX_FILES) return;
    if (it.type === 'file' && /\.ya?ml$/i.test(it.path || '')) out.push(it.path || '');
    else if (it.type === 'dir') await walkGitHubDir(it.path || '', out);
  }
}

/** Check for rule updates. NEVER auto-called. */
export async function checkSigmaUpdates(): Promise<SigmaUpdateMeta> {
  if (!isOnline()) throw new Error('No Internet connection.');
  const paths = await listOfficialRulePaths();
  return {
    latestVersion: `official ${SIGMA_SUBPATH} @master`,
    publishedAt: new Date().toISOString(),
    ruleCount: paths.length,
    sizeBytes: 0,
  };
}

/* ============================================================= */
/* Sync                                                          */
/* ============================================================= */

export interface SigmaSyncResult {
  status: 'noop' | 'offline' | 'up_to_date' | 'not_implemented' | 'ok' | 'error';
  message: string;
  rules?: number;
}

export type SigmaSyncProgress = (info: { done: number; total: number }) => void;

/** Fetch a single official rule file (jsDelivr first, raw GitHub fallback). */
async function fetchRuleFile(path: string): Promise<string> {
  try {
    const res = await fetchWithTimeout(jsDelivrFileUrl(path), { timeoutMs: 20_000 });
    return await res.text();
  } catch {
    const res = await fetchWithTimeout(rawFileUrl(path), { timeoutMs: 20_000 });
    return await res.text();
  }
}

/** Sync the official rules into `sigmaRulesSynced`. The [Sync] click IS the
 *  confirmation. Atomic: nothing is written until all files validated. */
export async function syncSigma(opts: { onProgress?: SigmaSyncProgress } = {}): Promise<SigmaSyncResult> {
  if (!isOnline()) return { status: 'offline', message: 'No Internet connection.' };

  const paths = await listOfficialRulePaths();
  if (paths.length === 0) {
    return { status: 'error', message: 'No official rules found in the directory.' };
  }

  const syncedAt = new Date().toISOString();
  const rows: SyncedSigmaRule[] = [];
  let done = 0;
  let failed = 0;

  // Bounded-concurrency downloads (never hammer the CDN).
  const queue = [...paths];
  const workers = Array.from({ length: Math.min(FETCH_CONCURRENCY, queue.length) }, async () => {
    for (;;) {
      const path = queue.shift();
      if (!path) return;
      let yaml = '';
      try {
        yaml = await fetchRuleFile(path);
      } catch {
        failed++;
        done++;
        opts.onProgress?.({ done, total: paths.length });
        continue;
      }
      // SAME validation gate as manual imports (title/status/level/logsource/
      // detection presence; YAML-subset parse). Invalid rules are skipped,
      // never imported half-broken.
      const parsed = parseSigmaRule(yaml);
      if (parsed.errors.length === 0) {
        rows.push({
          id: `sync-sigma-${parsed.id || path.replace(/[^a-z0-9]+/gi, '-').slice(-60)}`,
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
          sourcePath: path,
          syncedAt,
        });
      } else {
        failed++;
      }
      done++;
      opts.onProgress?.({ done, total: paths.length });
    }
  });
  await Promise.all(workers);

  if (rows.length === 0) {
    return { status: 'error', message: `All ${paths.length} rules failed validation — local data untouched.` };
  }

  await db.transaction('rw', db.sigmaRulesSynced, db.datasetMeta, async () => {
    await db.sigmaRulesSynced.clear();
    await db.sigmaRulesSynced.bulkPut(rows);
    const existing = await db.datasetMeta.get('singleton');
    const meta: DatasetMeta = {
      id: 'singleton',
      mitreVersion: existing?.mitreVersion || '',
      mitreLastSync: existing?.mitreLastSync ?? null,
      sigmaVersion: `official-security ${new Date().toISOString().slice(0, 10)}`,
      sigmaLastSync: syncedAt,
      sigmaRulesCount: rows.length,
      updatedAt: syncedAt,
      kevVersion: existing?.kevVersion,
      kevLastSync: existing?.kevLastSync ?? null,
      kevCount: existing?.kevCount,
    };
    await db.datasetMeta.put(meta);
  });

  return {
    status: 'ok',
    message: `Synced ${rows.length} official Sigma rules (SigmaHQ/sigma · rules/windows/builtin/security${failed ? ` · ${failed} skipped/failed` : ''}) — offline forever.`,
    rules: rows.length,
  };
}

/* ============================================================= */
/* Merged view accessor (bundled + custom + synced)              */
/* ============================================================= */

const VALID_LEVELS: SigmaLevel[] = ['critical', 'high', 'medium', 'low', 'informational'];
const VALID_STATUSES: SigmaStatus[] = ['stable', 'test', 'experimental', 'deprecated'];

/** Convert a synced rule's JSON-string logsource/detection into the
 *  SigmaRule structured display shape. Complex structures degrade gracefully
 *  (empty selectors + "see YAML" condition) — the YAML block always shows the
 *  verbatim official rule. */
function toDisplayRule(s: SyncedSigmaRule): SigmaRule {
  let logsource: SigmaRule['logsource'] = {};
  try {
    const ls = JSON.parse(s.logsource) as Record<string, string>;
    logsource = {
      product: typeof ls.product === 'string' ? ls.product : undefined,
      category: typeof ls.category === 'string' ? ls.category : undefined,
      service: typeof ls.service === 'string' ? ls.service : undefined,
    };
  } catch { /* keep empty */ }

  let detection: SigmaRule['detection'] = {
    selectors: [],
    condition: '(estructura compleja — ver YAML oficial)',
  };
  try {
    const det = JSON.parse(s.detection) as Record<string, unknown>;
    const selectors: SigmaRule['detection']['selectors'] = [];
    const condition = typeof det.condition === 'string' ? det.condition : undefined;
    const timeframe = typeof det.timeframe === 'string' ? det.timeframe : undefined;
    for (const [key, value] of Object.entries(det)) {
      if (key === 'condition' || key === 'timeframe') continue;
      // A selection can be: a map of field→values, or a LIST of such maps.
      const maps: Array<Record<string, unknown>> = Array.isArray(value)
        ? (value as unknown[]).filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v))
        : typeof value === 'object' && value !== null
          ? [value as Record<string, unknown>]
          : [];
      const fields: SigmaRule['detection']['selectors'][number] = [];
      for (const m of maps) {
        for (const [rawField, rawVal] of Object.entries(m)) {
          const pipe = rawField.indexOf('|');
          const field = pipe >= 0 ? rawField.slice(0, pipe) : rawField;
          const modifier = pipe >= 0 ? rawField.slice(pipe + 1) : undefined;
          const values = Array.isArray(rawVal)
            ? rawVal.map((x) => String(x)).slice(0, 30)
            : [String(rawVal ?? '')].filter((x) => x !== '');
          if (values.length) fields.push({ field, values, modifier });
        }
      }
      if (fields.length) selectors.push(fields);
    }
    detection = { selectors, condition: condition || (selectors.length ? '(ver YAML)' : '—'), timeframe };
  } catch { /* keep fallback */ }

  const level = (VALID_LEVELS as string[]).includes(s.level) ? (s.level as SigmaLevel) : 'informational';
  const status = (VALID_STATUSES as string[]).includes(s.status) ? (s.status as SigmaStatus) : 'test';
  // attack.t1566.001 → T1566.001 (canonical MITRE ids for the cross-links).
  const mitre = s.mitre
    .map((t) => {
      const m = /^attack\.((t\d{4}(?:\.\d{3})?))$/i.exec(t);
      if (m) return m[1].toUpperCase();
      return /^T\d{4}/.test(t) ? t : '';
    })
    .filter(Boolean);

  return {
    id: s.id,
    uuid: s.ruleUuid,
    title: s.title,
    status,
    description: s.description,
    author: s.author,
    date: s.date,
    level,
    logsource,
    detection,
    mitre,
    tags: s.tags,
    yaml: s.yaml,
  };
}

/** Live merged rules: bundled curated (win on uuid collision) + user custom +
 *  official synced. Falls back to the bundled array while Dexie resolves. */
export function useSigmaRules(): SigmaRule[] {
  const synced = useLiveQuery(() => db.sigmaRulesSynced.toArray(), [], [] as SyncedSigmaRule[]);
  const custom = useLiveQuery(
    () => db.customSigmaRules.orderBy('importedAt').reverse().toArray(),
    [],
    [],
  );
  if ((!synced || synced.length === 0) && (!custom || custom.length === 0)) return SIGMA_RULES;
  const seen = new Set(SIGMA_RULES.map((r) => r.uuid || r.id));
  const out: SigmaRule[] = [...SIGMA_RULES];
  for (const s of custom || []) {
    const key = s.ruleUuid || s.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(toDisplayRule({
      id: s.id, ruleUuid: s.ruleUuid, title: s.title, status: s.status, level: s.level,
      description: s.description, author: s.author, date: s.date, logsource: s.logsource,
      detection: s.detection, tags: s.tags, mitre: s.mitre, yaml: s.yaml, sourcePath: 'custom', syncedAt: '',
    }));
  }
  for (const s of synced || []) {
    const key = s.ruleUuid || s.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(toDisplayRule(s));
  }
  return out;
}
