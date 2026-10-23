/**
 * threatIntel/providers/virusTotal.ts — VirusTotal v3 provider.
 *
 * Spec priority #1 (VirusTotal is implemented first as the canonical example).
 *
 * ENDPOINTS (official, documented at developers.virusexchange.com ... actually
 *  developers.virustotal.com):
 *  - IP:    GET https://www.virustotal.com/api/v3/ip/{ip}        header: x-apikey
 *  - Domain:GET https://www.virustotal.com/api/v3/domains/{domain} header: x-apikey
 *  - URL:   GET https://www.virustotal.com/api/v3/urls/{urlId}  header: x-apikey
 *           (urlId = base64url of the URL, stripped of trailing =)
 *  - Hash:  GET https://www.virustotal.com/api/v3/files/{hash}  header: x-apikey
 *
 * CORS: VirusTotal v3 API does NOT send permissive CORS headers for browser
 *  apps. A direct browser fetch will usually fail with a TypeError ("Failed to
 *  fetch"). Per spec #32, when that happens we surface "Requires secure
 *  backend/proxy" + keep the [Open VirusTotal ↗] external link as the
 *  always-available fallback. We do NOT build a proxy (spec: "NO backend").
 *
 * The provider implementation is correct and complete — if VirusTotal ever
 *  adds CORS, or if the user runs a local proxy and the request succeeds, the
 *  result will render. Otherwise the CORS path produces an actionable message.
 */
import type {
  ThreatIntelProvider, ProviderId, ProviderResult,
  EnrichableIocType, EnrichmentOutcome, ProviderMeta,
} from '../types';
import { notConfigured, classifyError } from '../errors';
import { fetchWithTimeout, FetchHttpError, sanitizeStr, sanitizeNum } from '../client';
import { getCredential } from '../credentials';
import { isOnline } from '../../online';

export const VIRUSTOTAL_META: ProviderMeta = {
  id: 'virustotal',
  label: 'VirusTotal',
  description: 'Crowdsourced scanner aggregate — IPs, domains, URLs, file hashes.',
  requiresApiKey: true,
  signupUrl: 'https://www.virustotal.com/gui/my-apikey',
  supportsCors: false, // v3 API does not currently send permissive CORS headers
  buildExternalUrl: (iocType, value) => {
    switch (iocType) {
      case 'ipv4': case 'ipv6': return `https://www.virustotal.com/gui/ip-address/${encodeURIComponent(value)}`;
      case 'domain':          return `https://www.virustotal.com/gui/domain/${encodeURIComponent(value)}`;
      case 'url':              return `https://www.virustotal.com/gui/url/${encodeURIComponent(value)}`;
      case 'hash':             return `https://www.virustotal.com/gui/search/${encodeURIComponent(value)}`;
    }
  },
};

interface VtAnalysisStats {
  malicious?: number;
  suspicious?: number;
  harmless?: number;
  undetected?: number;
  total?: number;
}

function readStats(raw: unknown): VtAnalysisStats | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return {
    malicious: sanitizeNum(r.malicious),
    suspicious: sanitizeNum(r.suspicious),
    harmless:   sanitizeNum(r.harmless),
    undetected: sanitizeNum(r.undetected),
    total:      sanitizeNum(r.total),
  };
}

/** Build the API URL + (for URLs) the base64url id. Returns null for IOC
 *  types this provider doesn't support. */
function buildApiUrl(iocType: EnrichableIocType, value: string): string | null {
  switch (iocType) {
    case 'ipv4': case 'ipv6':
      return `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(value)}`;
    case 'domain':
      return `https://www.virustotal.com/api/v3/domains/${encodeURIComponent(value)}`;
    case 'hash':
      return `https://www.virustotal.com/api/v3/files/${encodeURIComponent(value.toLowerCase())}`;
    case 'url': {
      // base64url without padding
      const b64 = btoa(value);
      const urlId = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      return `https://www.virustotal.com/api/v3/urls/${urlId}`;
    }
  }
}

export const VirusTotalProvider: ThreatIntelProvider = {
  id: 'virustotal' as ProviderId,
  buildExternalUrl: VIRUSTOTAL_META.buildExternalUrl,
  async enrich(iocType: EnrichableIocType, value: string): Promise<EnrichmentOutcome> {
    if (!isOnline()) return { ok: false, error: { kind: 'offline' } };
    const apiKey = await getCredential('virustotal');
    if (!apiKey) return { ok: false, error: notConfigured('virustotal') };
    const url = buildApiUrl(iocType, value);
    if (!url) return { ok: false, error: { kind: 'unknown', detail: `unsupported iocType ${iocType}` } };

    try {
      const res = await fetchWithTimeout(url, {
        headers: { 'x-apikey': apiKey, 'accept': 'application/json' },
        timeoutMs: 12000,
      });
      const body = await res.json();
      const data = (body as { data?: { attributes?: Record<string, unknown> } })?.data?.attributes;
      if (!data) return { ok: false, error: { kind: 'invalid_response', detail: 'no data.attributes' } };
      const lastStats = readStats(data.last_analysis_stats);
      const popular = (data.popular_threat_classification ?? {}) as Record<string, unknown>;
      const result: ProviderResult = {
        provider: 'virustotal',
        retrievedAt: new Date().toISOString(),
        malicious: lastStats?.malicious,
        total: lastStats?.total,
        summary: sanitizeStr(data.description ?? popular.suggested_threat_label, 280),
        facts: [
          ...(lastStats?.malicious != null ? [{ label: 'Malicious', value: String(lastStats.malicious) }] : []),
          ...(lastStats?.harmless   != null ? [{ label: 'Harmless',   value: String(lastStats.harmless)   }] : []),
          ...(lastStats?.suspicious != null ? [{ label: 'Suspicious', value: String(lastStats.suspicious) }] : []),
          ...(sanitizeStr(data.reputation) ? [{ label: 'Reputation', value: sanitizeStr(data.reputation, 20) }] : []),
          ...(sanitizeStr(data.as_owner)   ? [{ label: 'AS Owner',   value: sanitizeStr(data.as_owner, 80)   }] : []),
          ...(sanitizeStr(data.categories ? JSON.stringify(data.categories) : '') ? [{ label: 'Categories', value: sanitizeStr(JSON.stringify(data.categories), 80) }] : []),
        ],
      };
      return { ok: true, result };
    } catch (e) {
      if (e instanceof FetchHttpError) {
        return { ok: false, error: classifyError(e, e.status) };
      }
      return { ok: false, error: classifyError(e) };
    }
  },
};
