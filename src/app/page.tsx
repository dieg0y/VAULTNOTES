'use client';

import dynamic from 'next/dynamic';

/* ------------------------------------------------------------------ */
/* DEV-ONLY SELF-HEALING (HMR robustness).                             */
/*                                                                     */
/* When the dev server restarts while a browser tab stays open,        */
/* Turbopack's HMR runtime occasionally fails to reconcile module      */
/* factories and the page dies with:                                   */
/*   "module factory is not available. It might have been deleted      */
/*    in an HMR update."                                               */
/* A clean full reload ALWAYS recovers from this, so detect it and     */
/* reload automatically — at most once every 30 s (sessionStorage      */
/* guard) so a persistent failure can never cause a reload loop.       */
/* The tools module graph is now statically imported (see              */
/* ToolsView.tsx "HMR-ROBUSTNESS"), which removes the fragile factory  */
/* registrations that triggered this most often; this listener is the  */
/* safety net for the remaining root dynamic boundary (VaultApp).      */
/* ------------------------------------------------------------------ */
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  const SELF_HEAL_KEY = '__vault_hmr_selfheal_ts';
  const isHmrFactoryError = (detail: unknown): boolean =>
    String(detail ?? '').includes('module factory is not available');

  window.addEventListener('error', (ev) => {
    if (!isHmrFactoryError((ev as ErrorEvent).message)) return;
    const last = Number(window.sessionStorage.getItem(SELF_HEAL_KEY) ?? 0);
    if (Date.now() - last > 30_000) {
      window.sessionStorage.setItem(SELF_HEAL_KEY, String(Date.now()));
      window.location.reload();
    }
  });
  // Dynamic-import evaluation failures surface as unhandled rejections.
  window.addEventListener('unhandledrejection', (ev) => {
    if (!isHmrFactoryError((ev as PromiseRejectionEvent).reason?.message ?? ev)) return;
    const last = Number(window.sessionStorage.getItem(SELF_HEAL_KEY) ?? 0);
    if (Date.now() - last > 30_000) {
      window.sessionStorage.setItem(SELF_HEAL_KEY, String(Date.now()));
      window.location.reload();
    }
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
