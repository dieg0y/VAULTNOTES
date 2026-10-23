'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DownloadCloud, Loader2, CheckCircle2, AlertTriangle, KeyRound, RotateCw, ChevronDown, GitCompareArrows, X } from 'lucide-react';

/**
 * GitPullButton — botón "Pull" del header + menú de modos.
 *
 * Llama a POST /api/git/pull con DOS modos:
 *  · SAFE (por defecto) — `git fetch` + fast-forward puro desde GitHub.
 *    Aplica features nuevas, fixes y borrados de código del repo SIN tocar
 *    los datos del usuario (notas, labs, glosario… viven en IndexedDB en el
 *    navegador, el pull solo actualiza archivos de código). Aborta si hay
 *    commits locales sin push o archivos modificados — nunca pierde nada.
 *  · MIRROR (menú ⌄ "Espejo exacto con GitHub") — deja el disco EXACTAMENTE
 *    igual al GitHub: descarta commits locales sin push, restaura archivos
 *    trackeados modificados y ELIMINA archivos locales que ya no existen
 *    en el repo (los .gitignored como db/node_modules/backups NUNCA se
 *    tocan). La UI pide confirmación explícita antes de ejecutarlo.
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
  mode?: 'safe' | 'mirror';
  commits?: number;
  ahead?: number;
  message?: string;
  error?: string;
  changedFiles?: string[];
  /** Espejo: resumen de lo descartado/restaurado/eliminado. */
  discarded?: string[];
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
  const [menuOpen, setMenuOpen] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Limpiar timer pendiente al desmontar.
  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  // Cerrar el menú al hacer clic fuera de él.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const scheduleReset = useCallback((ms: number) => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus({ kind: 'idle' }), ms);
  }, []);

  const handlePull = useCallback(async (mode: 'safe' | 'mirror') => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setMenuOpen(false);
    setStatus({ kind: 'pulling' });
    try {
      const res = await fetch('/api/git/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
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

  const handleMirrorClick = useCallback(() => {
    setMenuOpen(false);
    // Confirmación EXPLÍCITA: el modo espejo descarta cambios locales de
    // CÓDIGO (los datos del usuario y los .gitignored nunca se tocan).
    const confirmed = window.confirm(
      'ESPEJO EXACTO CON GITHUB\n\n' +
        'El código de la app quedará EXACTAMENTE igual al repositorio de GitHub:\n' +
        '· Se descartan commits locales sin push\n' +
        '· Se restauran archivos modificados sin confirmar\n' +
        '· Se BORRAN archivos de código locales que ya no existan en GitHub\n\n' +
        'Tus notas, labs, tickets, glosario y progreso NO se tocan (viven en tu navegador), ' +
        'y las carpetas ignoradas (backups, base de datos, node_modules) tampoco.\n\n' +
        '¿Continuar?',
    );
    if (confirmed) void handlePull('mirror');
  }, [handlePull]);

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
    <div className="relative flex items-center shrink-0" ref={menuRef}>
      <button
        onClick={() => void handlePull('safe')}
        disabled={pulling}
        aria-label="Pull: descargar actualizaciones de código desde GitHub"
        title="Pull seguro desde GitHub: descarga features nuevas, fixes y borrados de código del repo. Si hay cambios locales sin confirmar, NADA se pierde (aborta). Tus notas y datos NO se tocan."
        className="flex items-center gap-1.5 text-xs font-medium text-[#888] hover:text-emerald-400 transition-colors cursor-pointer disabled:cursor-wait disabled:opacity-70"
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

      {/* Menú de modos de pull: seguro | espejo exacto. */}
      <button
        onClick={() => setMenuOpen((o) => !o)}
        disabled={pulling}
        aria-label="Opciones de pull"
        aria-expanded={menuOpen}
        title="Opciones de Pull: espejo exacto con GitHub"
        className="flex items-center text-[#666] hover:text-[#AAA] transition-colors cursor-pointer disabled:opacity-70 px-0.5"
      >
        <ChevronDown className={`w-3 h-3 transition-transform ${menuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-72 rounded-md border border-[#262626] bg-[#0D0D0D] shadow-xl p-1.5"
        >
          <button
            role="menuitem"
            onClick={() => void handlePull('safe')}
            className="w-full flex items-start gap-2 px-2 py-1.5 rounded hover:bg-[#161616] text-left cursor-pointer"
          >
            <DownloadCloud className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="flex flex-col">
              <span className="text-[11px] font-semibold text-[#DDD]">Pull seguro (recomendado)</span>
              <span className="text-[10px] text-[#777] leading-snug">Fast-forward desde GitHub. Nunca descarta nada: si hay cambios locales, aborta.</span>
            </span>
          </button>
          <button
            role="menuitem"
            onClick={handleMirrorClick}
            className="w-full flex items-start gap-2 px-2 py-1.5 rounded hover:bg-[#161616] text-left cursor-pointer"
          >
            <GitCompareArrows className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="flex flex-col">
              <span className="text-[11px] font-semibold text-[#DDD]">Espejo exacto con GitHub…</span>
              <span className="text-[10px] text-[#777] leading-snug">
                El código queda IGUAL al GitHub: descarta commits locales sin push, restaura archivos modificados y borra los que ya no existen en el repo. Tus datos nunca se tocan.
              </span>
            </span>
          </button>
          <p className="px-2 pt-1.5 pb-0.5 text-[9px] text-[#555] flex items-center gap-1 border-t border-[#1a1a1a] mt-1">
            <X className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
            Notas, labs, glosario y progreso viven en tu navegador: ningún pull los toca.
          </p>
        </div>
      )}
    </div>
  );
};
