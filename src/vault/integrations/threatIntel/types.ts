/**
 * threatIntel/types.ts — Core types for the Online-Optional threat intel layer.
 *
 * DESIGN PRINCIPLES (from Block 6 spec):
 *  - 100% offline-first. These types only flow through code paths that are
 *    explicitly invoked by the user pressing [Enrich].
 *  - No automatic enrichment. No background fetch. No app-start fetch.
 *  - Provider results are DATA, never executed. Sigma/YAML/scripts are never run.
 *  - API keys are stored locally (IndexedDB + Web Crypto), never hardcoded,
 *    never sent to anything other than the provider's official endpoint.
 *  - External content is sanitized before render (see client.ts → sanitize).
 */

/** IOC types that may be enriched online. Mirrors the IoC Extractor's relevant
 *  subset — we only enrich network indicators + hashes, not file paths / JWTs /
 *  secrets (those would leak sensitive data to third parties). */
export type EnrichableIocType =
  | 'ipv4'
  | 'ipv6'
  | 'domain'
  | 'url'
  | 'hash';

/** Provider identifiers — used as the stable key in cache, activity log,
 *  credentials store, and rate-limiter. Adding a new provider = adding a
 *  new literal here + a Provider implementation in registry.ts. */
export type ProviderId =
  | 'virustotal'
  | 'abuseipdb'
  | 'otx'
  | 'shodan';

/** The IOC types each provider can handle. Used by the UI to decide which
 *  [Enrich] buttons to show for a given finding. */
export const PROVIDER_IOC_SUPPORT: Record<ProviderId, readonly EnrichableIocType[]> = {
  virustotal: ['ipv4', 'ipv6', 'domain', 'url', 'hash'],
  abuseipdb:  ['ipv4', 'ipv6'],
  otx:        ['ipv4', 'ipv6', 'domain', 'url', 'hash'],
  shodan:     ['ipv4', 'ipv6'],
};

/** Stable, user-facing metadata for each provider — used by Settings, the
 *  Enrich UI, and the external-links generator. `extHomeUrl` is the link the
 *  user can always open (no API key needed) — it points to the provider's
 *  public search/results page for the IOC. */
export interface ProviderMeta {
  id: ProviderId;
  label: string;
  /** Short description shown under the label in Settings. */
  description: string;
  /** Whether the provider REQUIRES an API key (true) or has a public/free
   *  tier (false). All four current providers require a key. */
  requiresApiKey: boolean;
  /** Optional official docs URL for getting an API key. */
  signupUrl?: string;
  /** Function that builds the external (open-in-browser) URL for an IOC.
   *  Always available — independent of API key configuration. */
  buildExternalUrl: (iocType: EnrichableIocType, value: string) => string;
  /** Whether this provider's API supports CORS from a browser. When false,
   *  fetch attempts will fail with a CORS TypeError; the UI must then show
   *  "Requires secure backend/proxy" and keep the external link. */
  supportsCors: boolean;
}

/** Error categories. Each maps to a single, actionable user message — never
 *  a raw stack trace. See errors.ts → toUserMessage(). */
export type ProviderErrorKind =
  | 'not_configured'      // no API key stored locally
  | 'invalid_credentials' // 401 / 403
  | 'rate_limit'          // 429
  | 'not_found'           // 404 — IOC not in provider's DB
  | 'provider_unavailable'// 5xx
  | 'network_timeout'     // fetch abort/timeout
  | 'offline'             // navigator.onLine === false
  | 'cors_blocked'        // TypeError: Failed to fetch (CORS)
  | 'invalid_response'    // JSON parse fail / unexpected shape
  | 'unknown';

/** A structured provider error. Never thrown raw to the UI — always converted
 *  via toUserMessage() into a short string. */
export interface ProviderError {
  kind: ProviderErrorKind;
  /** HTTP status code if applicable. */
  status?: number;
  /** Internal message for logging (NOT shown to user). */
  detail?: string;
}

/** A single enrichment result returned by a provider. Designed so the UI can
 *  render it uniformly without knowing each provider's response shape. */
export interface ProviderResult {
  provider: ProviderId;
  /** Raw detection count or relevant primary metric, if applicable. */
  malicious?: number;
  /** Total scanners / sources that evaluated the IOC. */
  total?: number;
  /** Free-text summary the provider returned, sanitized. */
  summary?: string;
  /** Confidence score 0-100 where applicable (AbuseIPDB, etc.). */
  confidence?: number;
  /** Number of "pulses" / community reports (OTX). */
  pulses?: number;
  /** Open ports / services (Shodan). */
  ports?: number[];
  /** Optional structured list of key→value pairs the UI can render as a
   *  definition list. All values are pre-sanitized strings. */
  facts?: { label: string; value: string }[];
  /** ISO timestamp of when the result was retrieved. */
  retrievedAt: string;
}

/** The outcome of a single enrichment attempt. Either a result or an error —
 *  never both, never neither. This lets the UI render per-provider rows with
 *  clear status without try/catch at the call site. */
export type EnrichmentOutcome =
  | { ok: true; result: ProviderResult }
  | { ok: false; error: ProviderError };

/** The contract every provider implementation must satisfy. Implementations
 *  live in providers/*.ts and are wired into the registry in registry.ts.
 *
 *  Each method is async and NEVER throws — failures are returned as
 *  { ok: false, error }. This keeps the UI's `.map()` simple. */
export interface ThreatIntelProvider {
  id: ProviderId;
  /** Build the external (browser-only) URL for an IOC. Delegates to meta. */
  buildExternalUrl(iocType: EnrichableIocType, value: string): string;
  /** Enrich an IOC. Returns a result or an error — never throws.
   *  Implementations MUST:
   *   1. check `navigator.onLine` first → offline error if false
   *   2. fetch the API key from credentials.ts → not_configured if missing
   *   3. call fetchWithTimeout (client.ts) → maps timeout/network/CORS
   *   4. parse + validate response → invalid_response on bad shape
   *   5. sanitize all string fields before putting them in ProviderResult */
  enrich(iocType: EnrichableIocType, value: string): Promise<EnrichmentOutcome>;
}
