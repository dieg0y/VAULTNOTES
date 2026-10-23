/**
 * threatIntel/providers/shodan.ts — Shodan provider (IPs only).
 *
 * Spec priority #4 (Shodan).
 *
 * ENDPOINT:
 *  GET https://api.shodan.io/shodan/host/{ip}?key={apiKey}
 *
 * CORS: Shodan's API does NOT send permissive CORS headers for browser apps.
 *  Same "Requires secure backend/proxy" + external link fallback.
 */
import type {
  ThreatIntelProvider, ProviderId, ProviderResult,
  EnrichableIocType, EnrichmentOutcome, ProviderMeta,
} from '../types';
import { notConfigured, classifyError } from '../errors';
import { fetchWithTimeout, FetchHttpError, sanitizeStr, sanitizeNumArr } from '../client';
import { getCredential } from '../credentials';
import { isOnline } from '../../online';

export const SHODAN_META: ProviderMeta = {
  id: 'shodan',
  label: 'Shodan',
  description: 'Internet-exposed services + open ports on an IP.',
  requiresApiKey: true,
  signupUrl: 'https://account.shodan.io/register',
  supportsCors: false,
  buildExternalUrl: (iocType, value) => {
    if (iocType !== 'ipv4' && iocType !== 'ipv6') return 'https://www.shodan.io/';
    return `https://www.shodan.io/host/${encodeURIComponent(value)}`;
  },
};

export const ShodanProvider: ThreatIntelProvider = {
  id: 'shodan' as ProviderId,
  buildExternalUrl: SHODAN_META.buildExternalUrl,
  async enrich(iocType: EnrichableIocType, value: string): Promise<EnrichmentOutcome> {
    if (iocType !== 'ipv4' && iocType !== 'ipv6') {
      return { ok: false, error: { kind: 'unknown', detail: 'shodan only supports IP types' } };
    }
    if (!isOnline()) return { ok: false, error: { kind: 'offline' } };
    const apiKey = await getCredential('shodan');
    if (!apiKey) return { ok: false, error: notConfigured('shodan') };

    const url = `https://api.shodan.io/shodan/host/${encodeURIComponent(value)}?key=${encodeURIComponent(apiKey)}`;
    try {
      const res = await fetchWithTimeout(url, { timeoutMs: 12000 });
      const body = await res.json();
      const b = body as Record<string, unknown>;
      const ports = sanitizeNumArr(b.ports);
      const result: ProviderResult = {
        provider: 'shodan',
        retrievedAt: new Date().toISOString(),
        ports,
        facts: [
          ...(ports.length ? [{ label: 'Open Ports', value: ports.join(', ') }] : []),
          ...(sanitizeStr(b.org) ? [{ label: 'Org', value: sanitizeStr(b.org, 80) }] : []),
          ...(sanitizeStr(b.isp) ? [{ label: 'ISP', value: sanitizeStr(b.isp, 80) }] : []),
          ...(Array.isArray(b.hostnames) ? [{ label: 'Hostnames', value: (b.hostnames as unknown[]).map((x) => sanitizeStr(x, 60)).filter(Boolean).join(', ') }] : []),
          ...(sanitizeStr(b.country_name) ? [{ label: 'Country', value: sanitizeStr(b.country_name, 40) }] : []),
          ...(sanitizeStr(b.city) ? [{ label: 'City', value: sanitizeStr(b.city, 40) }] : []),
          ...(sanitizeStr(b.last_update) ? [{ label: 'Last Update', value: sanitizeStr(b.last_update, 24) }] : []),
        ],
        summary: sanitizeStr(sanitizeStr(b.org) ? `Org: ${sanitizeStr(b.org)}.` : '', 200),
      };
      return { ok: true, result };
    } catch (e) {
      if (e instanceof FetchHttpError) return { ok: false, error: classifyError(e, e.status) };
      return { ok: false, error: classifyError(e) };
    }
  },
};
