'use client';

import React from 'react';

/**
 * VN-F-00x (audit MEDIUM) — top-level React Error Boundary.
 *
 * Before this, ANY uncaught render error inside a view white-screened the
 * whole PWA (no boundary existed between page.tsx and the app tree), which is
 * brutal in an offline local-first app where the user may lose unsaved
 * context. This boundary catches render errors, shows a Spanish recovery
 * panel, and offers a soft reload. Local-first guarantees are untouched:
 * IndexedDB data is never at risk from a render crash (Dexie writes are
 * transactional), so a reload restores the vault exactly as persisted.
 */
interface ErrorBoundaryState {
  error: Error | null;
}

export class VaultErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Local diagnostics only — VaultNotes never phones home.
    console.error('[VaultErrorBoundary] Render error caught:', error, info.componentStack);
  }

  private handleReload = (): void => {
    this.setState({ error: null });
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.error) {
      const isProd = process.env.NODE_ENV === 'production';
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-[#0A0A0A] p-6">
          <div
            role="alert"
            className="w-full max-w-lg rounded-lg border border-red-500/30 bg-[#0D0D0D] p-6 space-y-4"
          >
            <div className="flex items-center gap-2 text-red-400">
              <svg
                className="h-5 w-5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h1 className="text-sm font-bold uppercase tracking-widest">
                Error inesperado en la interfaz
              </h1>
            </div>
            <p className="text-xs leading-relaxed text-[#BBB]">
              La vista dejó de responder, pero <strong className="text-white">tus datos están a salvo</strong>:
              todo se guarda localmente en IndexedDB y no se perdió nada. Recarga para volver a tu bóveda.
            </p>
            {!isProd && (
              <pre className="max-h-40 overflow-auto rounded border border-[#262626] bg-[#0A0A0A] p-2 font-mono text-[10px] whitespace-pre-wrap break-all text-red-300">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReload}
              className="w-full rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 cursor-pointer"
            >
              Recargar VaultNotes
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
