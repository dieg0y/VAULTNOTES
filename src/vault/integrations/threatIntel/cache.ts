/**
 * threatIntel/cache.ts — Local threat-intelligence result cache.
 *
 * Spec refs: #11 (cache), #12 (cache settings — TTL options), #28 (rate
 * limiting — cache prevents repeat requests on the same IOC+provider).
 *
 * DESIGN:
 *  - Cache lives in the main `VaultLocalDB` (Dexie) so it CAN be exported
 *    by the vault backup (the user owns the cached intelligence — it's the
 *    result they explicitly asked for). API keys are NOT here — they are
 *    in the separate VaultIntelDB.
 *  - Cache ONLY stores threat-intel results. Per spec #12, we never store
 *    passwords, JWTs, tokens, commands, full logs, or private notes here.
 *    The IOC value + provider result are the only things cached — and only
 *    because the user explicitly requested that enrichment.
 *  - TTL is configurable (1h / 6h / 24h default / 7d / Never). When the
 *    user re-enriches, a cached entry that is still fresh shows a
 *    "Cached result available" notice with [Use Cached] / [Refresh].
 *  - Refresh is NEVER automatic — always explicit.
 *
 * NOTE: the actual Dexie table is declared in src/vault/db/index.ts as part
 * of schema v13. This module just exposes typed helpers over it.
 */
import { db, type TiCacheEntry } from '../../db';
import type { ProviderId, EnrichableIocType, ProviderResult } from './types';

/** Cache TTL options as exposed in Settings. The numeric value is milliseconds;
 *  0 means "Never expire" (cache forever until manually cleared). */
export const TTL_OPTIONS = [
  { label: '1 hour', ms: 60 * 60 * 1000 },
  { label: '6 hours', ms: 6 * 60 * 60 * 1000 },
  { label: '24 hours', ms: 24 * 60 * 60 * 1000 },
  { label: '7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: 'Never', ms: 0 },
] as const;

const TTL_KEY = 'vaultnotes-ti-cache-ttl';

/** Read the configured TTL (ms). Default = 24h. 0 = Never (no expiry). */
export function getCacheTtlMs(): number {
  const raw = localStorage.getItem(TTL_KEY);
  if (raw == null) return 24 * 60 * 60 * 1000;
  const n = Number(raw);
  return isFinite(n) ? n : 24 * 60 * 60 * 1000;
}

/** Persist the chosen TTL. Called from Settings. */
export function setCacheTtlMs(ms: number): void {
  localStorage.setItem(TTL_KEY, String(ms));
}

/** Build the cache id — lowercased value so 8.8.8.8 and 8.8.8.8 hit the same. */
function cacheId(provider: ProviderId, iocType: EnrichableIocType, value: string): string {
  return `${provider}:${iocType}:${value.toLowerCase().trim()}`;
}

/** Compute the expiresAt timestamp for a fresh entry. */
function computeExpires(retrievedAt: string, ttlMs: number): string {
  if (ttlMs === 0) {
    // "Never" — set to a date 100 years out so it never appears stale.
    return new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();
  }
  return new Date(new Date(retrievedAt).getTime() + ttlMs).toISOString();
}

export interface CacheLookup {
  /** Whether a cache entry exists for this key at all. */
  exists: boolean;
  /** Whether the entry is still within its TTL window. */
  fresh: boolean;
  /** The entry, if it exists. */
  entry?: TiCacheEntry;
  /** If the entry exists and is a successful result, the parsed result. */
  result?: ProviderResult | null;
  /** If the entry exists and was an error, the cached error message. */
  errorMessage?: string | null;
}

/** Look up a cache entry. Returns {exists:false} when there's nothing cached.
 *  Never throws. */
export async function lookupCache(
  provider: ProviderId,
  iocType: EnrichableIocType,
  value: string,
): Promise<CacheLookup> {
  try {
    const id = cacheId(provider, iocType, value);
    const entry = await db.tiCache.get(id);
    if (!entry) return { exists: false, fresh: false };
    const now = Date.now();
    const fresh = new Date(entry.expiresAt).getTime() > now;
    let result: ProviderResult | null = null;
    if (entry.resultJson) {
      try { result = JSON.parse(entry.resultJson); } catch { result = null; }
    }
    return {
      exists: true,
      fresh,
      entry,
      result,
      errorMessage: entry.errorMessage,
    };
  } catch {
    return { exists: false, fresh: false };
  }
}

/** Store an enrichment outcome in the cache (success or error). */
export async function storeInCache(
  provider: ProviderId,
  iocType: EnrichableIocType,
  value: string,
  outcome: { ok: true; result: ProviderResult } | { ok: false; error: { kind: string; status?: number; detail?: string }; errorMessage: string },
): Promise<void> {
  try {
    const id = cacheId(provider, iocType, value);
    const retrievedAt = outcome.ok ? outcome.result.retrievedAt : new Date().toISOString();
    const entry: TiCacheEntry = {
      id,
      provider,
      iocType,
      iocValue: value,
      resultJson: outcome.ok ? JSON.stringify(outcome.result) : null,
      errorMessage: outcome.ok ? null : outcome.errorMessage,
      retrievedAt,
      expiresAt: computeExpires(retrievedAt, getCacheTtlMs()),
    };
    await db.tiCache.put(entry);
  } catch {
    /* cache write failures are non-fatal */
  }
}

/** Clear all cached threat-intel results. Called from Settings →
 *  [Clear Threat Intelligence Cache]. */
export async function clearTiCache(): Promise<number> {
  try {
    const n = await db.tiCache.count();
    await db.tiCache.clear();
    return n;
  } catch {
    return 0;
  }
}

/** Count cached entries — for display in Settings / Sync Center. */
export async function countTiCache(): Promise<number> {
  try { return await db.tiCache.count(); } catch { return 0; }
}
