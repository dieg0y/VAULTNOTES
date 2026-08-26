/**
 * threatIntel/client.ts — Thin fetch wrapper used by every provider.
 *
 * Responsibilities:
 *  1. AbortController-based timeout (default 12s) → classifies as network_timeout
 *     on AbortError.
 *  2. Surface HTTP status to the caller via a typed exception so providers
 *     can map it to a ProviderError (see errors.ts → classifyError).
 *  3. NEVER use eval / new Function / dynamic script injection.
 *  4. Sanitize every string that comes back from the network before it
 *     reaches ProviderResult — strip HTML tags, control chars, and limit
 *     length to prevent both XSS and UI overflow.
 */

/** Fetch options extended with a timeout. */
export interface FetchOpts {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  /** Per-request timeout in ms. Default 12000 (12s) — providers are slow. */
  timeoutMs?: number;
}

/** The result of a fetchWithTimeout call. On a non-2xx status, throws a
 *  FetchHttpError so providers can classify it. On network/CORS/timeout,
 *  throws the raw error — classifyError() handles it. */
export interface FetchResult {
  status: number;
  ok: boolean;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}

/** Thrown when the HTTP response is not 2xx — carries the status code so
 *  the caller can classify 401/403/404/429/5xx distinctly. */
export class FetchHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'FetchHttpError';
    this.status = status;
  }
}

/** fetch + AbortController timeout. Returns parsed-JSON-friendly helpers.
 *  Throws FetchHttpError on non-2xx, raw DOMException/TypeError on transport
 *  failures. Callers wrap with try/catch and pass to classifyError(). */
export async function fetchWithTimeout(url: string, opts: FetchOpts = {}): Promise<FetchResult> {
  const ctrl = new AbortController();
  const timeoutMs = opts.timeoutMs ?? 12000;
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers: opts.headers,
      body: opts.body,
      signal: ctrl.signal,
      // Always use CORS mode — we are a browser app calling 3rd-party APIs.
      mode: 'cors',
      // Don't send credentials (cookies) — providers don't need them and this
      // reduces the attack surface.
      credentials: 'omit',
      // Always follow redirects — providers like VirusTotal redirect to CDN.
      redirect: 'follow',
    });
    if (!res.ok) {
      let bodySnippet = '';
      try { bodySnippet = (await res.text()).slice(0, 200); } catch { /* ignore */ }
      throw new FetchHttpError(res.status, bodySnippet || `HTTP ${res.status}`);
    }
    return {
      status: res.status,
      ok: true,
      json: async () => {
        const txt = await res.text();
        try { return JSON.parse(txt); } catch (e) { throw e; }
      },
      text: () => res.text(),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Sanitize an arbitrary string coming from a third-party provider before it
 *  is stored in a ProviderResult or rendered in the UI. Strips HTML tags,
 *  null bytes, control characters, and caps length. NEVER use the raw value
 *  in dangerouslySetInnerHTML — providers always render as text via React,
 *  which escapes by default, but this is defense-in-depth. */
export function sanitizeStr(input: unknown, maxLen = 500): string {
  if (typeof input !== 'string' && typeof input !== 'number') return '';
  let s = String(input);
  // strip any HTML/XML tags — providers sometimes return <br> or <a> in
  // descriptions; we never want to render those.
  s = s.replace(/<[^>]*>/g, '');
  // strip null + control chars except tab/newline
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > maxLen) s = s.slice(0, maxLen) + '…';
  return s;
}

/** Sanitize a number from a provider — coerces, clamps to a safe range, and
 *  returns undefined if not a valid finite number. */
export function sanitizeNum(input: unknown, max = 1_000_000_000): number | undefined {
  const n = typeof input === 'string' ? Number(input) : input;
  if (typeof n !== 'number' || !isFinite(n) || n < 0 || n > max) return undefined;
  return Math.floor(n);
}

/** Sanitize an array of strings (e.g. Shodan port labels). */
export function sanitizeStrArr(input: unknown, maxItems = 50): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((x) => sanitizeStr(x, 80))
    .filter(Boolean)
    .slice(0, maxItems);
}

/** Sanitize an array of numbers (e.g. Shodan ports). */
export function sanitizeNumArr(input: unknown, maxItems = 50): number[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((x) => sanitizeNum(x, 65535))
    .filter((x): x is number => typeof x === 'number')
    .slice(0, maxItems);
}
