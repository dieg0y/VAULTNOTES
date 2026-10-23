/**
 * integrations/kev/kev.ts — CISA KEV catalog sync + EPSS score lookup.
 *
 * V10 (Fase 1-2, "información actualizada y oficial"):
 *  - KEV: the CISA Known Exploited Vulnerabilities catalog, synced from the
 *    OFFICIAL GitHub mirror (github.com/cisagov/kev-data — CISA's own org;
 *    ✅ verified 2026-09: raw file ~1.7MB, CORS `*`, no API key). Stored
 *    locally (trimmed entries) so the CVE tool can badge ANY searched CVE as
 *    "known exploited" OFFLINE after one sync.
 *  - EPSS: Exploit Prediction Scoring System from FIRST (api.first.org —
 *    ✅ verified: public, free, no API key, CORS `*`). Looked up on demand
 *    when the user searches a CVE (explicit action), cached 24h in the
 *    existing tiCache table (same contract as IOC enrichment — the cache
 *    travels in the ZIP, keys never do).
 *
 * RULES (same as every online function in the app):
 *  - NEVER auto-called; only on explicit [Sync] / [Search Online] clicks.
 *  - No API key, no PII: only public URLs + the CVE id the user is already
 *    searching. Everything stored locally works offline forever.
 */
import { db, type KevCatalogRow, type KevEntry, type DatasetMeta, type TiCacheEntry } from '../../db';
import { isOnline } from '../online';
import { fetchWithTimeout, sanitizeStr } from '../threatIntel/client';
import { getCacheTtlMs } from '../threatIntel/cache';

/** Official raw URLs (cisagov/kev-data = CISA's own GitHub mirror). */
const KEV_RAW_URL = 'https://raw.githubusercontent.com/cisagov/kev-data/main/known_exploited_vulnerabilities.json';
const KEV_LIST_URL = 'https://data.jsdelivr.com/v1/packages/gh/cisagov/kev-data@main';
const EPSS_API_URL = 'https://api.first.org/data/v1/epss';

/* ============================================================= */
/* Local metadata + lookup                                       */
/* ============================================================= */

export interface KevLocalMeta {
  catalogVersion: string;
  count: number;
  lastSync: string | null;
}

export async function getLocalKevMeta(): Promise<KevLocalMeta> {
  const [row, catalog] = await Promise.all([
    db.datasetMeta.get('singleton'),
    db.kevCatalog.get('singleton'),
  ]);
  return {
    catalogVersion: catalog?.catalogVersion || row?.kevVersion || '',
    count: catalog?.count ?? row?.kevCount ?? 0,
    lastSync: row?.kevLastSync ?? null,
  };
}

/** Find a CVE in the LOCAL synced catalog (offline, instant). Returns null
 *  when the catalog is not synced or the CVE is not listed. */
export async function findKevEntry(cveId: string): Promise<KevEntry | null> {
  const id = cveId.trim().toUpperCase();
  if (!/^CVE-\d{4}-\d{4,7}$/.test(id)) return null;
  const catalog = await db.kevCatalog.get('singleton');
  if (!catalog || !catalog.entries?.length) return null;
  return catalog.entries.find((e) => e.cveID === id) ?? null;
}

/* ============================================================= */
/* Check updates (tiny jsDelivr manifest — no full download)      */
/* ============================================================= */

export interface KevUpdateMeta {
  latestVersion: string;
  publishedAt: string;
  entryCount: number;
  /** True when the remote content differs from the locally-synced one. */
  changed: boolean;
}

interface JsDelivrFile {
  type?: string;
  name?: string;
  hash?: string;
}

/** Compare the remote file hash with the locally-synced marker (stored in
 *  datasetMeta.kevVersion as `<catalogVersion>|<hash12>`). */
export async function checkKevUpdates(): Promise<KevUpdateMeta> {
  if (!isOnline()) throw new Error('No Internet connection.');
  const remoteHash = await fetchRemoteKevHash();
  const local = await db.datasetMeta.get('singleton');
  const localHash = (local?.kevVersion || '').split('|')[1] || '';
  return {
    latestVersion: remoteHash ?? 'unknown',
    publishedAt: new Date().toISOString(),
    entryCount: local?.kevCount ?? 0,
    changed: !remoteHash || remoteHash !== localHash,
  };
}

/** Remote content hash of the official KEV file via the jsDelivr listing
 *  (~2KB). Returns null if the listing is unavailable. */
async function fetchRemoteKevHash(): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(KEV_LIST_URL, { timeoutMs: 20_000 });
    const tree = (await res.json()) as { files?: JsDelivrFile[] };
    const file = (tree.files || []).find(
      (f) => f.name === 'known_exploited_vulnerabilities.json',
    );
    const hash = (file?.hash || '').slice(0, 12);
    return hash || null;
  } catch {
    return null;
  }
}

/* ============================================================= */
/* Sync                                                          */
/* ============================================================= */

export interface KevSyncResult {
  status: 'noop' | 'offline' | 'ok' | 'up_to_date' | 'error';
  message: string;
  count?: number;
}

interface RawKevFeed {
  title?: string;
  catalogVersion?: string;
  dateReleased?: string;
  count?: number;
  vulnerabilities?: Array<Record<string, unknown>>;
}

/** Sync the official KEV catalog. The [Sync] click IS the confirmation.
 *  Atomic: the singleton row is replaced only after validation. */
export async function syncKev(): Promise<KevSyncResult> {
  if (!isOnline()) return { status: 'offline', message: 'No Internet connection.' };

  const res = await fetchWithTimeout(KEV_RAW_URL, { timeoutMs: 60_000 });
  const feed = (await res.json()) as RawKevFeed;
  const vulns = Array.isArray(feed.vulnerabilities) ? feed.vulnerabilities : [];
  if (!feed.catalogVersion || vulns.length === 0 || vulns.length < 100) {
    return { status: 'error', message: 'KEV feed looked invalid — sync aborted, local data untouched.' };
  }
  if (typeof feed.count === 'number' && feed.count !== vulns.length) {
    return { status: 'error', message: 'KEV count mismatch — sync aborted.' };
  }

  // Trim to the fields the app uses (full feed ~1.7MB → ~600KB stored).
  const entries: KevEntry[] = vulns.map((v) => ({
    cveID: sanitizeStr(v.cveID, 20),
    vendorProject: sanitizeStr(v.vendorProject, 60),
    product: sanitizeStr(v.product, 60),
    vulnerabilityName: sanitizeStr(v.vulnerabilityName, 160),
    dateAdded: sanitizeStr(v.dateAdded, 12),
    dueDate: sanitizeStr(v.dueDate, 12) || undefined,
    knownRansomwareCampaignUse: sanitizeStr(v.knownRansomwareCampaignUse, 30),
    requiredAction: sanitizeStr(v.requiredAction, 400),
  }));

  const now = new Date().toISOString();
  // Content marker: prefer the remote listing hash (cheap, comparable in
  // checkKevUpdates); fall back to a content fingerprint when the listing is
  // unavailable (the next check will then report "changed" conservatively).
  const remoteHash = await fetchRemoteKevHash();
  const contentMarker = remoteHash ?? `c:${entries.length}-${entries[0]?.cveID || ''}-${entries[0]?.dateAdded || ''}`;
  const row: KevCatalogRow = {
    id: 'singleton',
    title: sanitizeStr(feed.title, 120) || 'CISA Catalog of Known Exploited Vulnerabilities',
    catalogVersion: sanitizeStr(feed.catalogVersion, 20),
    dateReleased: sanitizeStr(feed.dateReleased, 30),
    count: entries.length,
    fetchedAt: now,
    entries,
  };

  await db.transaction('rw', db.kevCatalog, db.datasetMeta, async () => {
    await db.kevCatalog.put(row);
    const existing = await db.datasetMeta.get('singleton');
    const meta: DatasetMeta = {
      id: 'singleton',
      mitreVersion: existing?.mitreVersion || '',
      mitreLastSync: existing?.mitreLastSync ?? null,
      sigmaVersion: existing?.sigmaVersion || '',
      sigmaLastSync: existing?.sigmaLastSync ?? null,
      sigmaRulesCount: existing?.sigmaRulesCount ?? 0,
      updatedAt: now,
      // Marker = "<catalogVersion>|<content-marker>" so the update check can
      // diff cheaply (remote hash prefix vs local marker).
      kevVersion: `${row.catalogVersion}|${contentMarker}`,
      kevLastSync: now,
      kevCount: entries.length,
    };
    await db.datasetMeta.put(meta);
  });

  return {
    status: 'ok',
    message: `Synced CISA KEV catalog v${row.catalogVersion} — ${entries.length} known-exploited CVEs stored (badges work offline).`,
    count: entries.length,
  };
}

/* ============================================================= */
/* EPSS (FIRST — free, no key, CORS *) — cached in tiCache        */
/* ============================================================= */

export interface EpssResult {
  ok: boolean;
  epss?: number;
  percentile?: number;
  date?: string;
  cached?: boolean;
  error?: string;
}

/** Look up the EPSS score for a CVE. Cache-first: a fresh tiCache row
 *  (provider 'epss') answers without network. Never throws. */
export async function fetchEpss(cveId: string): Promise<EpssResult> {
  const id = cveId.trim().toUpperCase();
  if (!/^CVE-\d{4}-\d{4,7}$/.test(id)) return { ok: false, error: 'Invalid CVE ID.' };
  if (!isOnline()) return { ok: false, error: 'Offline' };

  // 1. Cache-first (TTL shared with threat-intel cache; default 24h).
  const cacheId = `epss:cve:${id.toLowerCase()}`;
  try {
    const entry = await db.tiCache.get(cacheId);
    if (entry && entry.resultJson && new Date(entry.expiresAt).getTime() > Date.now()) {
      const parsed = JSON.parse(entry.resultJson) as { epss?: number; percentile?: number; date?: string };
      return { ok: true, ...parsed, cached: true };
    }
  } catch { /* cache miss */ }

  // 2. Fresh fetch from FIRST (explicit user action, public endpoint).
  try {
    const res = await fetchWithTimeout(`${EPSS_API_URL}?cve=${encodeURIComponent(id)}`, { timeoutMs: 12_000 });
    const body = (await res.json()) as { data?: Array<{ cve?: string; epss?: string; percentile?: string; date?: string }> };
    const d = body.data?.[0];
    if (!d) return { ok: false, error: 'No EPSS data for that CVE.' };
    const out = {
      ok: true,
      epss: Number(d.epss),
      percentile: Number(d.percentile),
      date: sanitizeStr(d.date, 12),
    };
    if (!isFinite(out.epss as number)) return { ok: false, error: 'No EPSS data for that CVE.' };
    // 3. Store in tiCache (same privacy contract: only the CVE id + result).
    try {
      const retrievedAt = new Date().toISOString();
      const ttl = getCacheTtlMs() || 24 * 60 * 60 * 1000;
      const row: TiCacheEntry = {
        id: cacheId,
        provider: 'epss',
        iocType: 'cve',
        iocValue: id,
        resultJson: JSON.stringify({ epss: out.epss, percentile: out.percentile, date: out.date }),
        errorMessage: null,
        retrievedAt,
        expiresAt: new Date(Date.now() + ttl).toISOString(),
      };
      await db.tiCache.put(row);
    } catch { /* cache write failure is non-fatal */ }
    return out;
  } catch {
    return { ok: false, error: 'EPSS request failed.' };
  }
}
