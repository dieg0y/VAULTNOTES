/**
 * threatIntel/providers/otx.ts — AlienVault OTX provider.
 *
 * Spec priority #3 (OTX).
 *
 * ENDPOINTS (OTX API v1, https://otx.alienvault.com/api/v1/indicators):
 *  - IP:    GET /indicators/IPv4/{ip}/general
 *  - Domain:GET /indicators/domain/{domain}/general
 *  - URL:   GET /indicators/url/{url}/general   (url is base64-encoded)
 *  - Hash:  GET /indicators/file/{hash}/general
 *  No auth header required for public endpoints, but a key unlocks more.
 *
 * CORS: OTX has historically been more permissive, but it's not guaranteed.
 *  Same "Requires secure backend/proxy" + external link fallback on failure.
 */
import type {
  ThreatIntelProvider, ProviderId, ProviderResult,
  EnrichableIocType, EnrichmentOutcome, ProviderMeta,
} from '../types';
import { notConfigured, classifyError } from '../errors';
import { fetchWithTimeout, FetchHttpError, sanitizeStr, sanitizeNum } from '../client';
import { getCredential } from '../credentials';
import { isOnline } from '../../online';

export const OTX_META: ProviderMeta = {
  id: 'otx',
  label: 'AlienVault OTX',
  description: 'Open Threat Exchange — community pulses + reputation.',
  requiresApiKey: true, // we treat it as key-required for consistency; public works too
  signupUrl: 'https://otx.alienvault.com/api',
  supportsCors: false,
  buildExternalUrl: (iocType, value) => {
    switch (iocType) {
      case 'ipv4': case 'ipv6': return `https://otx.alienvault.com/indicator/ip/${encodeURIComponent(value)}`;
      case 'domain':          return `https://otx.alienvault.com/indicator/domain/${encodeURIComponent(value)}`;
      case 'url':              return `https://otx.alienvault.com/indicator/url/${encodeURIComponent(btoa(value))}`;
      case 'hash':             return `https://otx.alienvault.com/indicator/file/${encodeURIComponent(value.toLowerCase())}`;
    }
  },
};

function buildOtxUrl(iocType: EnrichableIocType, value: string): string | null {
  const base = 'https://otx.alienvault.com/api/v1/indicators';
  switch (iocType) {
    case 'ipv4': return `${base}/IPv4/${encodeURIComponent(value)}/general`;
    case 'ipv6': return `${base}/IPv6/${encodeURIComponent(value)}/general`;
    case 'domain': return `${base}/domain/${encodeURIComponent(value)}/general`;
    case 'url': return `${base}/url/${encodeURIComponent(btoa(value))}/general`;
    case 'hash': return `${base}/file/${encodeURIComponent(value.toLowerCase())}/general`;
  }
}

export const OTXProvider: ThreatIntelProvider = {
  id: 'otx' as ProviderId,
  buildExternalUrl: OTX_META.buildExternalUrl,
  async enrich(iocType: EnrichableIocType, value: string): Promise<EnrichmentOutcome> {
    if (!isOnline()) return { ok: false, error: { kind: 'offline' } };
    const apiKey = await getCredential('otx');
    if (!apiKey) return { ok: false, error: notConfigured('otx') };
    const url = buildOtxUrl(iocType, value);
    if (!url) return { ok: false, error: { kind: 'unknown', detail: `unsupported iocType ${iocType}` } };

    try {
      const headers: Record<string, string> = { 'X-OTX-API-KEY': apiKey, Accept: 'application/json' };
      const res = await fetchWithTimeout(url, { headers, timeoutMs: 12000 });
      const body = await res.json();
      const pulseCount = sanitizeNum((body as { pulse_info?: { count?: number } })?.pulse_info?.count);
      const reputation = sanitizeNum((body as { reputation?: { score?: number } })?.reputation?.score);
      const result: ProviderResult = {
        provider: 'otx',
        retrievedAt: new Date().toISOString(),
        pulses: pulseCount,
        confidence: reputation != null ? Math.max(0, 100 - reputation) : undefined, // OTX reputation: 0=worst, 100=best
        facts: [
          ...(pulseCount != null ? [{ label: 'Pulses', value: String(pulseCount) }] : []),
          ...(reputation != null ? [{ label: 'Reputation', value: String(reputation) }] : []),
        ],
        summary: sanitizeStr((body as { pulse_info?: { pulses?: Array<{ name?: string }> } })?.pulse_info?.pulses?.[0]?.name, 200),
      };
      return { ok: true, result };
    } catch (e) {
      if (e instanceof FetchHttpError) return { ok: false, error: classifyError(e, e.status) };
      return { ok: false, error: classifyError(e) };
    }
  },
};
