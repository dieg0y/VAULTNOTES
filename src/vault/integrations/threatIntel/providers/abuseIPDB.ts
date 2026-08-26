/**
 * threatIntel/providers/abuseIPDB.ts — AbuseIPDB v2 provider (IPs only).
 *
 * Spec priority #2 (AbuseIPDB).
 *
 * ENDPOINT:
 *  GET https://api.abuseipdb.com/api/v2/check?ipAddress={ip}&maxAgeInDays=90
 *  header: Key: {apiKey}, Accept: application/json
 *
 * CORS: AbuseIPDB does NOT send permissive CORS headers for browser apps in
 *  general. So a direct browser fetch usually fails with TypeError ("Failed
 *  to fetch"). Per spec #32, surface "Requires secure backend/proxy" + keep
 *  the external link. No proxy is built.
 *
 * Supports ipv4 + ipv6 only.
 */
import type {
  ThreatIntelProvider, ProviderId, ProviderResult,
  EnrichableIocType, EnrichmentOutcome, ProviderMeta,
} from '../types';
import { notConfigured, classifyError } from '../errors';
import { fetchWithTimeout, FetchHttpError, sanitizeStr, sanitizeNum } from '../client';
import { getCredential } from '../credentials';
import { isOnline } from '../../online';

export const ABUSEIPDB_META: ProviderMeta = {
  id: 'abuseipdb',
  label: 'AbuseIPDB',
  description: 'IP abuse reporting — confidence score + report count.',
  requiresApiKey: true,
  signupUrl: 'https://www.abuseipdb.com/account/api',
  supportsCors: false,
  buildExternalUrl: (iocType, value) => {
    if (iocType !== 'ipv4' && iocType !== 'ipv6') return 'https://www.abuseipdb.com/';
    return `https://www.abuseipdb.com/check/${encodeURIComponent(value)}`;
  },
};

export const AbuseIPDBProvider: ThreatIntelProvider = {
  id: 'abuseipdb' as ProviderId,
  buildExternalUrl: ABUSEIPDB_META.buildExternalUrl,
  async enrich(iocType: EnrichableIocType, value: string): Promise<EnrichmentOutcome> {
    if (iocType !== 'ipv4' && iocType !== 'ipv6') {
      return { ok: false, error: { kind: 'unknown', detail: 'abuseipdb only supports IP types' } };
    }
    if (!isOnline()) return { ok: false, error: { kind: 'offline' } };
    const apiKey = await getCredential('abuseipdb');
    if (!apiKey) return { ok: false, error: notConfigured('abuseipdb') };

    const url = `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(value)}&maxAgeInDays=90`;
    try {
      const res = await fetchWithTimeout(url, {
        headers: { Key: apiKey, Accept: 'application/json' },
        timeoutMs: 12000,
      });
      const body = await res.json();
      const d = (body as { data?: Record<string, unknown> })?.data;
      if (!d) return { ok: false, error: { kind: 'invalid_response', detail: 'no data' } };
      const result: ProviderResult = {
        provider: 'abuseipdb',
        retrievedAt: new Date().toISOString(),
        confidence: sanitizeNum(d.abuseConfidenceScore),
        facts: [
          ...(sanitizeStr(d.usageType) ? [{ label: 'Usage Type', value: sanitizeStr(d.usageType, 40) }] : []),
          ...(sanitizeStr(d.isp) ? [{ label: 'ISP', value: sanitizeStr(d.isp, 80) }] : []),
          ...(sanitizeStr(d.domain) ? [{ label: 'Domain', value: sanitizeStr(d.domain, 80) }] : []),
          ...(sanitizeStr(d.countryName) ? [{ label: 'Country', value: sanitizeStr(d.countryName, 40) }] : []),
          ...(sanitizeNum(d.totalReports) != null ? [{ label: 'Total Reports', value: String(sanitizeNum(d.totalReports)) }] : []),
          ...(sanitizeNum(d.numDistinctUsers) != null ? [{ label: 'Distinct Users', value: String(sanitizeNum(d.numDistinctUsers)) }] : []),
        ],
        summary: sanitizeStr(d.abuseConfidenceScore != null
          ? `Abuse confidence score: ${d.abuseConfidenceScore}/100.`
          : '', 200),
      };
      return { ok: true, result };
    } catch (e) {
      if (e instanceof FetchHttpError) return { ok: false, error: classifyError(e, e.status) };
      return { ok: false, error: classifyError(e) };
    }
  },
};
