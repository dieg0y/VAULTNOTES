'use client';

import dynamic from 'next/dynamic';

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
