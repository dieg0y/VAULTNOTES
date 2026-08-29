'use client';

import dynamic from 'next/dynamic';

/* ------------------------------------------------------------------ */
/* DEV-ONLY SELF-HEALING (HMR robustness), layer v2.                   */
/*                                                                     */
/* When the dev server restarts while a browser tab stays open,        */
/* Turbopack's HMR runtime can fail to reconcile module factories and  */
/* the page dies with:                                                  */
/*   "module factory is not available. It might have been deleted      */
/*    in an HMR update."                                               */
/* A clean full reload ALWAYS recovers from this. Detection layers:    */
/*   1. window 'error' events (uncaught exceptions)                    */
/*   2. 'unhandledrejection' (dynamic-import evaluation failures)      */
/*   3. Overlay watchdog — poll the Next.js dev overlay                */
/*      (nextjs-portal shadow DOM); it is the exact symptom the user   */
/*      sees, so this layer catches every path the first two miss.     */
/* Anti-loop budget: at most 3 self-reloads per 2 minutes              */
/* (sessionStorage); a genuinely broken server never loops.            */
/* The tools module graph is statically imported (see ToolsView.tsx    */
/* "HMR-ROBUSTNESS") and dev never runs the service worker (see        */
/* App.tsx) — this listener is the last-resort safety net.             */
/* ------------------------------------------------------------------ */
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  const SELF_HEAL_KEY = '__vault_hmr_selfheal_ts';
  const isHmrFactoryError = (msg: string): boolean =>
    msg.includes('module factory is not available');

  const reloadBudgetAllows = (): boolean => {
    try {
      const now = Date.now();
      const hist: number[] = JSON.parse(window.sessionStorage.getItem(SELF_HEAL_KEY) ?? '[]');
      const recent = hist.filter((t) => now - t < 120_000);
      if (recent.length >= 3) return false;
      window.sessionStorage.setItem(SELF_HEAL_KEY, JSON.stringify([...recent, now]));
      return true;
    } catch {
      return false; // storage unavailable — never auto-reload blind
    }
  };

  const selfHeal = (source: string): void => {
    if (!reloadBudgetAllows()) return;
    console.warn(`[VaultNotes dev] error HMR detectado (${source}) — recargando…`);
    window.location.reload();
  };

  window.addEventListener('error', (ev) => {
    const e = ev as ErrorEvent;
    const msg = e.message || String(e.error ?? '');
    if (isHmrFactoryError(msg)) selfHeal('error');
  });
  window.addEventListener('unhandledrejection', (ev) => {
    const r = (ev as PromiseRejectionEvent).reason;
    const msg = r && (r.message ?? r.stack) ? String(r.message ?? r.stack) : String(r ?? '');
    if (isHmrFactoryError(msg)) selfHeal('rejection');
  });

  const overlayHasFactoryError = (): boolean => {
    try {
      const portal = document.querySelector('nextjs-portal');
      const txt = portal?.shadowRoot?.textContent ?? '';
      return txt.includes('module factory is not available');
    } catch {
      return false;
    }
  };
  const checkOverlay = () => {
    if (overlayHasFactoryError()) selfHeal('overlay');
  };
  window.setInterval(checkOverlay, 2500);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkOverlay();
  });
}

// VaultNotes is a 100% offline app backed by IndexedDB (Dexie),
// so it must only be loaded in the browser (no SSR).
const VaultApp = dynamic(() => import('@/vault/App'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0A0A0A]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
          <svg className="w-5 h-5 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <p className="text-xs font-mono text-[#666] animate-pulse">
          Cargando Vault (base de datos local)...
        </p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <VaultApp />;
}
