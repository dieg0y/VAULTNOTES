'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DownloadCloud, Loader2, CheckCircle2, AlertTriangle, KeyRound, RotateCw } from 'lucide-react';

/**
 * GitPullButton — botón "Pull" del header.
 *
 * Llama a POST /api/git/pull, que hace `git fetch` + fast-forward puro desde
 * GitHub. Aplica features nuevas, fixes y borrados de código del repo SIN
 * tocar los datos del usuario (notas, labs, glosario… viven en IndexedDB en
 * el navegador, el pull solo actualiza archivos de código).
 *
 * Estados (uno por posible desenlace):
 *  · idle        — normal, "Pull"
 *  · pulling     — spinner deshabilitado
 *  · ok          — al día / cambios aplicados (dev: auto-recarga y Turbopack
 *                  recompila el código nuevo)
 *  · error       — fallo (red caída, git ausente, repo sucio, commits sin
 *                  push…) con mensaje humano, se auto-limpia en 7 s
 *  · restart     — producción: la API regeneró el build; pide reiniciar la
 *                  app (cerrar ventana "VaultNotes (servidor)" + reabrir el
 *                  .bat). Persistente: NO auto-recarga (el server viejo
 *                  seguiría sirviendo el build anterior desde memoria).
 *  · token       — GitHub rechazó la autenticación: persistente, muestra el
 *                  problema y el comando exacto en el tooltip.
 */

interface PullResponse {
  ok: boolean;
  updated?: boolean;
  commits?: number;
  ahead?: number;
  message?: string;
  error?: string;
  changedFiles?: string[];
  needsInstall?: boolean;
  /** Producción: rebuild regenerado — hay que reiniciar la app. */
  needsRestart?: boolean;
  /** GitHub rechazó el acceso — el remote necesita el token. */
  needsToken?: boolean;
  log?: string[];
  head?: string;
}

type PullStatus =
  | { kind: 'idle' }
  | { kind: 'pulling' }
  | { kind: 'ok'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'restart'; message: string }
  | { kind: 'token'; message: string };

/** Estados "atención" (amber): persistentes 30 s para poder leer/hoverear. */
const ATTENTION_RESET_MS = 30_000;

export const GitPullButton: React.FC = () => {
  const [status, setStatus] = useState<PullStatus>({ kind: 'idle' });
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpiar timer pendiente al desmontar.
  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const scheduleReset = useCallback((ms: number) => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus({ kind: 'idle' }), ms);
  }, []);

  const handlePull = useCallback(async () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setStatus({ kind: 'pulling' });
    try {
      const res = await fetch('/api/git/pull', { method: 'POST' });
      const data: PullResponse | null = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        // Fallos con causa UX específica primero; el resto es error plano.
        if (data?.needsToken) {
          setStatus({ kind: 'token', message: data.error || 'GitHub: acceso rechazado (token)' });
          scheduleReset(ATTENTION_RESET_MS);
          return;
        }
        const message = data?.error || `Error ${res.status} al hacer pull`;
        setStatus({ kind: 'error', message });
        scheduleReset(7000);
        return;
      }

      if (data.updated) {
        // Producción con rebuild: el server en memoria sigue sirviendo el
        // build viejo → auto-recargar no pinta el código nuevo.
        if (data.needsRestart) {
          setStatus({
            kind: 'restart',
            message: data.message || 'Actualizado — reinicia la app',
          });
          scheduleReset(ATTENTION_RESET_MS);
          return;
        }
        // Hubo cambios de código (dev) → recargar para servir el bundle nuevo.
        const n = typeof data.commits === 'number' ? data.commits : 1;
        const extra = data.needsInstall ? ' (dependencias instaladas)' : '';
        setStatus({ kind: 'ok', message: `${n} commit(s) aplicados${extra} — recargando…` });
        window.setTimeout(() => window.location.reload(), 1400);
        return;
      }

      setStatus({ kind: 'ok', message: data.message || 'Ya estás al día' });
      scheduleReset(2600);
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Fallo de red al hacer pull',
      });
      scheduleReset(7000);
    }
  }, [scheduleReset]);

  const pulling = status.kind === 'pulling';
  const attention = status.kind === 'restart' || status.kind === 'token';

  const textColor =
    status.kind === 'error'
      ? 'text-red-400'
      : attention
        ? 'text-amber-400'
        : status.kind === 'ok'
          ? 'text-emerald-400'
          : 'text-[#888]';

  return (
    <button
      onClick={handlePull}
      disabled={pulling}
      aria-label="Pull: descargar actualizaciones de código desde GitHub"
      title="Pull desde GitHub: descarga features nuevas, fixes y borrados de código del repo. Tus notas y datos NO se tocan (viven en tu navegador)."
      className="flex items-center gap-1.5 text-xs font-medium text-[#888] hover:text-emerald-400 transition-colors cursor-pointer shrink-0 disabled:cursor-wait disabled:opacity-70"
    >
      {pulling ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" aria-hidden="true" />
      ) : status.kind === 'ok' ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
      ) : status.kind === 'error' ? (
        <AlertTriangle className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
      ) : status.kind === 'restart' ? (
        <RotateCw className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
      ) : status.kind === 'token' ? (
        <KeyRound className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
      ) : (
        <DownloadCloud className={`w-3.5 h-3.5 ${textColor}`} aria-hidden="true" />
      )}

      {pulling ? (
        <span className="hidden sm:inline text-emerald-400">Pull…</span>
      ) : status.kind === 'ok' || status.kind === 'error' || attention ? (
        <span
          className={`hidden sm:inline max-w-[300px] truncate ${textColor}`}
          title={status.message}
        >
          {status.message}
        </span>
      ) : (
        <span className="hidden sm:inline">Pull</span>
      )}
    </button>
  );
};
