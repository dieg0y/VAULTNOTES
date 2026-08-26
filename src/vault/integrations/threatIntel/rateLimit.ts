/**
 * threatIntel/rateLimit.ts — In-memory, per-IOC+provider rate limiter.
 *
 * Spec #28: prevent the user from hammering a provider with repeated [Enrich]
 *  clicks on the same IOC. Simple protection — not a sophisticated quota
 *  system.
 *
 * DESIGN:
 *  - Pure in-memory Map keyed by `${provider}:${iocType}:${valueLowercased}`.
 *  - TTL of 5 seconds — enough to swallow rapid double-clicks without
 *    blocking a legitimate "I want to re-check" 10 seconds later.
 *  - If an entry is still live, the caller should skip the request and either
 *    use the cache (if fresh) or show a brief "Please wait a few seconds"
 *    notice.
 *  - Cache (cache.ts) is the PRIMARY dedup mechanism — this Map is a thin
 *    guard against impatient clicking in the first few seconds.
 */
const RATE_WINDOW_MS = 5000;

const map = new Map<string, number>();

/** Returns true if a request for this key is currently rate-limited (i.e. a
 *  recent request was made within RATE_WINDOW_MS and the user should wait). */
export function isRateLimited(
  provider: string,
  iocType: string,
  value: string,
): boolean {
  const key = `${provider}:${iocType}:${value.toLowerCase().trim()}`;
  const now = Date.now();
  const last = map.get(key) ?? 0;
  if (now - last < RATE_WINDOW_MS) return true;
  map.set(key, now);
  return false;
}

/** Clear the rate-limit map (called when leaving the IoC view, etc.). */
export function clearRateLimit(): void {
  map.clear();
}
