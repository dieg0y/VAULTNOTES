/**
 * threatIntel/errors.ts — Map raw provider failures to short, actionable,
 *  user-facing messages. NEVER leak stack traces, raw HTTP bodies, or
 *  internal identifiers to the user.
 *
 * Spec refs: #10 (provider errors), #32 (no backend — "Requires secure
 * backend/proxy" when CORS blocks the request).
 */
import type { ProviderError, ProviderErrorKind, ProviderId } from './types';

/** The single source of truth for user-facing provider error text. Each kind
 *  maps to one short sentence. No interpolation of internal detail. */
const MESSAGES: Record<ProviderErrorKind, string> = {
  not_configured: 'API key not configured.',
  invalid_credentials: 'Invalid API credentials.',
  rate_limit: 'Rate limit reached.',
  not_found: 'No data available for this indicator.',
  provider_unavailable: 'Provider temporarily unavailable.',
  network_timeout: 'Request timed out.',
  offline: 'No Internet connection.',
  cors_blocked: 'Requires secure backend/proxy.',
  invalid_response: 'Provider returned an unexpected response.',
  unknown: 'Provider request failed.',
};

/** Convert any ProviderError into a single, short, actionable string. */
export function toUserMessage(err: ProviderError): string {
  return MESSAGES[err.kind] ?? MESSAGES.unknown;
}

/** True when the error means "we never even reached the provider" — used by
 *  the UI to avoid logging a spurious activity entry on offline/CORS errors
 *  that didn't actually consume API quota. */
export function isTransportError(err: ProviderError): boolean {
  return (
    err.kind === 'offline' ||
    err.kind === 'network_timeout' ||
    err.kind === 'cors_blocked' ||
    err.kind === 'not_configured'
  );
}

/** Map a thrown value (from fetch / JSON.parse / timeout) to a ProviderError.
 *  Handles: AbortError (timeout), TypeError "Failed to fetch" (CORS/offline),
 *  SyntaxError (bad JSON), and HTTP status codes. */
export function classifyError(raw: unknown, status?: number): ProviderError {
  // explicit HTTP status — check this first since fetchWithTimeout surfaces it
  if (typeof status === 'number') {
    if (status === 401 || status === 403) return { kind: 'invalid_credentials', status };
    if (status === 404) return { kind: 'not_found', status };
    if (status === 429) return { kind: 'rate_limit', status };
    if (status >= 500) return { kind: 'provider_unavailable', status };
    return { kind: 'unknown', status };
  }
  // navigator.onLine is false → offline (cheap, reliable signal)
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { kind: 'offline' };
  }
  if (raw instanceof DOMException && raw.name === 'AbortError') {
    return { kind: 'network_timeout', detail: raw.message };
  }
  if (raw instanceof TypeError) {
    // "Failed to fetch" — almost always CORS in this context (we already
    // checked navigator.onLine above). Treat as cors_blocked so the UI shows
    // "Requires secure backend/proxy" + keeps the external link.
    return { kind: 'cors_blocked', detail: raw.message };
  }
  if (raw instanceof SyntaxError) {
    return { kind: 'invalid_response', detail: 'JSON parse failed' };
  }
  return { kind: 'unknown', detail: String(raw) };
}

/** Convenience: build a not_configured error for a specific provider. */
export function notConfigured(provider: ProviderId): ProviderError {
  return { kind: 'not_configured', detail: provider };
}
