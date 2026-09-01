/**
 * threatIntel/registry.ts — Provider registry + the high-level enrich flow.
 *
 * This is the ONLY entry point the UI uses to enrich an IOC. It hides:
 *  - consent check (privacy warning gate)
 *  - rate limiting (anti-double-click)
 *  - cache lookup + [Use Cached] / [Refresh]
 *  - per-provider dispatch
 *  - activity logging (IOC type only — never the value)
 *  - error → user message mapping
 *
 * The UI never calls provider.enrich() directly; it always calls
 * `enrichWithProvider()` here, which centralizes all the spec rules.
 */
import type {
  ProviderId, EnrichableIocType, EnrichmentOutcome, ProviderMeta, ThreatIntelProvider,
} from './types';
import { PROVIDER_IOC_SUPPORT } from './types';
import { toUserMessage, isTransportError } from './errors';
import { hasOnlineConsent } from './consent';
import { isRateLimited } from './rateLimit';
import { lookupCache, storeInCache } from './cache';
import { logActivity } from './activity';
import { isOnline } from '../online';

import { VirusTotalProvider, VIRUSTOTAL_META } from './providers/virusTotal';
import { AbuseIPDBProvider, ABUSEIPDB_META } from './providers/abuseIPDB';
import { OTXProvider, OTX_META } from './providers/otx';
import { ShodanProvider, SHODAN_META } from './providers/shodan';

/** All provider implementations keyed by id. */
const PROVIDERS: Record<ProviderId, ThreatIntelProvider> = {
  virustotal: VirusTotalProvider,
  abuseipdb:  AbuseIPDBProvider,
  otx:         OTXProvider,
  shodan:       ShodanProvider,
};

/** All provider metadata keyed by id. The UI uses this to render cards/links. */
export const PROVIDER_META: Record<ProviderId, ProviderMeta> = {
  virustotal: VIRUSTOTAL_META,
  abuseipdb:  ABUSEIPDB_META,
  otx:         OTX_META,
  shodan:       SHODAN_META,
};

/** Ordered list of provider ids — used by Settings + the Enrich UI to render
 *  cards in a consistent order (spec priority: VirusTotal → AbuseIPDB →
 *  OTX → Shodan). */
export const PROVIDER_ORDER: ProviderId[] = ['virustotal', 'abuseipdb', 'otx', 'shodan'];

/** Returns the providers that support the given IOC type. The IoC Extractor
 *  uses this to decide which [Enrich] buttons to show per finding. */
export function providersForIocType(iocType: EnrichableIocType): ProviderId[] {
  return PROVIDER_ORDER.filter((p) => PROVIDER_IOC_SUPPORT[p].includes(iocType));
}

/** Special outcome kind returned when consent is missing — the UI shows the
 *  privacy warning modal and re-issues the request after the user clicks
 *  [Continue]. */
export interface ConsentMissingOutcome {
  ok: false;
  error: { kind: 'consent_missing' };
  /** Re-run this exact enrich call after consent is granted. */
  retry: () => Promise<EnrichResult>;
}

/** Special outcome kind returned when a fresh cache hit exists — the UI shows
 *  "Cached result available" with [Use Cached] / [Refresh]. */
interface CacheHitOutcome {
  ok: true;
  cached: true;
  result: import('./types').ProviderResult;
  retrievedAt: string;
  /** True if the cache is still within TTL. */
  fresh: boolean;
}

/** The return type of enrichWithProvider — either a fresh result, a cache hit,
 *  an error, or a consent gate. The UI switches on these four cases. */
export type EnrichResult =
  | CacheHitOutcome
  | EnrichmentOutcome
  | ConsentMissingOutcome;

/** The main entry point. Never throws. Implements the spec rules:
 *  1. If consent missing → return ConsentMissingOutcome (UI shows warning).
 *  2. If offline → return offline error (no API quota consumed).
 *  3. If not configured → return not_configured (no quota, no network).
 *  4. If rate-limited → return a transient 'cached'/'error' based on cache.
 *  5. Lookup cache: if fresh → return CacheHitOutcome. If stale → caller
 *     decides whether to refresh.
 *  6. Otherwise dispatch to the provider, store result in cache, log activity.
 *
 *  `opts.forceRefresh = true` skips the fresh-cache shortcut (used by the
 *  [Refresh] button). */
export async function enrichWithProvider(
  provider: ProviderId,
  iocType: EnrichableIocType,
  value: string,
  opts: { forceRefresh?: boolean } = {},
): Promise<EnrichResult> {
  // 1. consent gate
  if (!hasOnlineConsent()) {
    return {
      ok: false,
      error: { kind: 'consent_missing' },
      retry: () => enrichWithProvider(provider, iocType, value, opts),
    };
  }

  // 2. offline check (cheap, navigator.onLine)
  if (!isOnline()) {
    await logActivity(provider, iocType, 'offline');
    return { ok: false, error: { kind: 'offline' } };
  }

  // 3. not-configured check (cheap IndexedDB read, no network)
  const meta = PROVIDER_META[provider];
  if (meta.requiresApiKey) {
    // We don't read the credential value here — the provider does. We only
    // check whether the UI should even attempt. To avoid a duplicate read,
    // we let the provider return not_configured; this branch is just a hint
    // for the caller via a quick "is configured?" check if needed.
  }

  // 4. rate limit (in-memory, 5s)
  if (isRateLimited(provider, iocType, value)) {
    // Return whatever's in cache (even stale) or a transient error.
    const cached = await lookupCache(provider, iocType, value);
    if (cached.exists && cached.result) {
      return { ok: true, cached: true, result: cached.result, retrievedAt: cached.entry!.retrievedAt, fresh: cached.fresh };
    }
    return { ok: false, error: { kind: 'rate_limit' } };
  }

  // 5. cache lookup (fresh shortcut)
  if (!opts.forceRefresh) {
    const cached = await lookupCache(provider, iocType, value);
    if (cached.exists && cached.fresh && cached.result) {
      await logActivity(provider, iocType, 'cached');
      return { ok: true, cached: true, result: cached.result, retrievedAt: cached.entry!.retrievedAt, fresh: true };
    }
  }

  // 6. dispatch to provider
  const outcome = await PROVIDERS[provider].enrich(iocType, value);

  if (outcome.ok) {
    await storeInCache(provider, iocType, value, outcome);
    await logActivity(provider, iocType, 'success');
    return outcome;
  }

  // error path — cache the error message too so a flapping provider doesn't
  // get re-hit. But only if it's NOT a transport error (offline/cors/timeout/
  // not_configured) — those didn't consume quota and shouldn't be cached as
  // "the answer".
  if (!isTransportError(outcome.error)) {
    await storeInCache(provider, iocType, value, {
      ok: false,
      error: { kind: outcome.error.kind, status: outcome.error.status, detail: outcome.error.detail },
      errorMessage: toUserMessage(outcome.error),
    });
  }
  // Log activity only for non-transport errors (offline + not_configured
  // already logged above; cors_blocked + timeout are logged here as 'error').
  if (!isTransportError(outcome.error)) {
    await logActivity(provider, iocType, 'error', toUserMessage(outcome.error));
  } else if (outcome.error.kind === 'cors_blocked' || outcome.error.kind === 'network_timeout') {
    await logActivity(provider, iocType, 'error', toUserMessage(outcome.error));
  }

  return outcome;
}

/** Convenience helper for the "is this provider configured?" check used by
 *  Settings cards. Reads credential metadata only — never decrypts the key. */
