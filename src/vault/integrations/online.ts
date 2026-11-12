/**
 * integrations/online.ts — Browser connectivity state, no network probe.
 *
 * Do NOT make periodic requests to check connectivity. Use `navigator.onLine`
 * + window `online`/`offline` events — that's the browser's own signal, free,
 * no quota, no privacy leak.
 *
 * Single source of truth for "is the browser online?". The ONLY export is the
 * `useIsOnline` hook; since v25 (retirada de Data & Intel, que eliminó los
 * providers y el indicador online/offline del Header) su único consumidor es
 * HdTicketTriageTool, que lo consulta ANTES de intentar un fetch — early-exit
 * con error `offline` en lugar de esperar un timeout de red. `isOnline()` NO
 * se exporta: es la lectura síncrona privada del módulo con la que el hook
 * semilla su estado inicial.
 */
import { useEffect, useState } from 'react';

/** Synchronous read of the current online state. Falls back to `true` if
 *  `navigator.onLine` is undefined (very old browsers / SSR). Private del
 *  módulo: solo el hook la usa para sembrar su estado inicial. */
function isOnline(): boolean {
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
