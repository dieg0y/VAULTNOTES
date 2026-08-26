/**
 * integrations/online.ts — Browser connectivity state, no network probe.
 *
 * Spec #2: small indicator in the Header (● Offline / ● Online). Do NOT make
 *  periodic requests to check connectivity. Use `navigator.onLine` + window
 *  `online`/`offline` events — that's the browser's own signal, free, no
 *  quota, no privacy leak.
 *
 * This hook is the single source of truth for "is the browser online?". The
 * indicator in the Header reads from here, and every provider implementation
 * checks `useIsOnline()` (or reads `isOnline()` directly) BEFORE attempting
 * a fetch — early-exit with an `offline` error rather than a network timeout.
 */
import { useEffect, useState } from 'react';

/** Synchronous read of the current online state. Falls back to `true` if
 *  `navigator.onLine` is undefined (very old browsers / SSR). Used by
 *  non-React modules (providers) that can't use the hook. */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

/** React hook that re-renders on `online`/`offline` window events. Returns
 *  the current boolean. No network probe — purely event-driven. */
export function useIsOnline(): boolean {
  const [online, setOnline] = useState<boolean>(() => isOnline());
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return online;
}
