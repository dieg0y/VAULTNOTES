import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';

/**
 * POST /api/git/pull — Pull de actualizaciones de código desde GitHub.
 *
 * Estrategia "sin afectar nada más" (NUNCA toca IndexedDB — los datos del
 * usuario viven en el navegador):
 *  1. `git fetch origin --prune` — solo actualiza referencias remotas.
 *  2. Compara HEAD local vs remoto (1 sola llamada: rev-list --left-right).
 *     · Al día → no hace nada. · Commits locales sin push → ABORTA.
 *  3. Repo sucio (archivos tracked modificados) → ABORTA con instrucciones
 *     humanas (git nunca perderá cambios sin confirmar por diseño propio).
 *  4. `git merge --ff-only` — fast-forward puro: aplica añadidos, cambios y
 *     BORRADOS del remoto. Cero commits de merge, cero conflictos posibles.
 *  5. Si package.json / bun.lock cambiaron → `bun install` automático.
 *  6. Servidor de PRODUCCIÓN: regenera el build standalone (`bun run build`)
 *     si el diff tocó código real (*.ts/tsx, src/, public/, deps, config) y
 *     responde `needsRestart: true` — la UI pide reiniciar (cerrar ventana
 *     del servidor + reabrir IniciarVaultNotes.bat) en vez de auto-recargar.
 *     Pulls solo-*.md saltan el rebuild. En dev, Turbopack recompila solo.
 *
 * UX de errores: `needsToken` (auth GitHub rechazada → comando exacto),
 * git ausente (ENOENT), red caída y timeouts devuelven mensajes humanos.
 *
 * Economía de comandos git (happy path sin cambios: 3 llamadas):
 *   fetch → rev-parse "HEAD origin/main" → rev-list --left-right --count.
 * Con actualización: + status --porcelain → merge → diff → log = 7.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const exec = promisify(execFile);
const CWD = process.cwd();
const REMOTE_NAME = 'origin';
const BUN_OPTS = { cwd: CWD, maxBuffer: 16 * 1024 * 1024, windowsHide: true } as const;

/** Lock en memoria: nunca ejecutar dos pulls a la vez. */
let inFlight = false;

interface GitFailure extends Error {
  stdout?: string;
  stderr?: string;
  killed?: boolean;
  code?: string | number;
}

/* ─────────────────────────── helpers puros ─────────────────────────── */

async function git(args: string[], timeoutMs = 90_000): Promise<string> {
  // GIT_TERMINAL_PROMPT=0: nunca colgar esperando credenciales interactivas
  // — falla instantánea y determinista (texto clasificable abajo).
  const { stdout } = await exec('git', args, {
    ...BUN_OPTS,
    timeout: timeoutMs,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  return stdout.toString().trim();
}

async function runBun(args: string[], timeoutMs: number): Promise<void> {
  await exec('bun', [...args], { ...BUN_OPTS, timeout: timeoutMs });
}

function describeError(err: unknown): string {
  const e = err as GitFailure;
  if (e?.killed) return 'El comando tardó demasiado (timeout) — revisa tu conexión e inténtalo de nuevo.';
  const raw = (e?.stderr || e?.stdout || e?.message || '').toString().trim();
  const lines = raw.split('\n').filter(Boolean).slice(0, 6).join(' · ');
  return lines || 'Error desconocido ejecutando git';
}

/** Clasifica un fallo de git/g fetch en una causa UX accionable. */
function classifyFailure(err: unknown): 'git-missing' | 'network' | 'auth' | 'notfound' | null {
  const e = err as GitFailure;
  if (e?.code === 'ENOENT') return 'git-missing';
  if (e?.killed) return 'network';
  const raw = (e?.stderr || e?.stdout || e?.message || '').toString().toLowerCase();
  if (/could not resolve|network|unreachable|connection (refused|reset|timed out)|temporary failure|ssl|tls/i.test(raw)) {
    return 'network';
  }
  // "Repository not found": repo renombrado/eliminado o privado sin acceso.
  if (/repository not found|repo not found|not found/i.test(raw) && /remote|repository|repo/.test(raw)) {
    return 'notfound';
  }
  if (
    /authentication|autenticaci|could not read (username|password)|terminal prompts|permission denied|\b403\b|\b401\b|private/i.test(
      raw,
    )
  ) {
    return 'auth';
  }
  return null;
}

/** Local SHAs + rama remota por defecto (main → master fallback) en 1-2 llamadas. */
async function resolveRefs(): Promise<{ localHead: string; remoteRef: string; remoteSha: string }> {
  for (const remoteRef of [`${REMOTE_NAME}/main`, `${REMOTE_NAME}/master`]) {
    try {
      const out = await git(['rev-parse', 'HEAD', remoteRef]);
      const [localHead, remoteSha] = out.split('\n');
      if (localHead && remoteSha) return { localHead, remoteRef, remoteSha };
    } catch {
      // rama remota inexistente → probar la siguiente
    }
  }
  throw new Error(`No se encontró ninguna rama remota en "${REMOTE_NAME}" (¿es un clone válido?)`);
}

/** ahead/behind en UNA llamada: `rev-list --left-right --count HEAD...remote`. */
async function countDivergence(localHead: string, remoteRef: string): Promise<{ ahead: number; behind: number }> {
  const out = await git(['rev-list', '--left-right', '--count', `${localHead}...${remoteRef}`]);
  const [ahead, behind] = out.split('\t').map((n) => parseInt(n, 10));
  return { ahead: ahead || 0, behind: behind || 0 };
}

/** Archivos tracked modificados/sin confirmar (ignora untracked: nunca chocan
 *  con un fast-forward). Vacío = árbol limpio.
 *  NOTA: no usar slice(3) fijo — el helper git() hace trim() del stdout y
 *  la primera línea pierde el espacio inicial del código de estado. */
async function dirtyTrackedFiles(): Promise<string[]> {
  const out = await git(['status', '--porcelain']);
  return out
    .split('\n')
    .filter((line) => line.length > 0 && !line.trimStart().startsWith('??'))
    .map((line) => /^ ?[MADRCU]{1,2} +(.+)$/.exec(line)?.[1] ?? line);
}

/** changedFiles (formato `A\truta`) → ¿el pull tocó código ejecutable? */
function touchedCode(changedFiles: string[], needsInstall: boolean): boolean {
  return (
    needsInstall ||
    changedFiles.some((line) => {
      const path = (line.split('\t').pop() || '').toLowerCase();
      return (
        /\.(ts|tsx|mjs|css)$/.test(path) ||
        path.startsWith('src/') ||
        path.startsWith('public/') ||
        /(?:^|\/)(next\.config\.ts|tsconfig\.json|eslint\.config\.mjs|postcss\.config\.mjs|package\.json|bun\.lock|bun\.lockb)$/.test(path)
      );
    })
  );
}

const fail = (status: number, body: Record<string, unknown>) =>
  NextResponse.json({ ok: false, updated: false, ...body }, { status });

/* ─────────────────────────── endpoint ─────────────────────────── */

export async function POST() {
  if (inFlight) {
    return fail(429, { error: 'Ya hay un pull en curso — espera a que termine.' });
  }
  inFlight = true;

  try {
    // ── 1) Fetch: trae refs remotas, no toca el working tree ──────────────
    try {
      await git(['fetch', REMOTE_NAME, '--prune']);
    } catch (err) {
      const kind = classifyFailure(err);
      if (kind === 'network') {
        return fail(503, { error: 'Sin conexión con GitHub: revisa tu internet y vuelve a pulsar Pull.' });
      }
      if (kind === 'notfound') {
        return fail(502, {
          error:
            'El repositorio no existe o tu cuenta no tiene acceso. Revisa la URL del remote:\n' +
            'git remote set-url origin https://github.com/dieg0y/VAULTNOTES.git',
        });
      }
      if (kind === 'auth') {
        // needsToken → la UI muestra estado dedicado con el comando exacto.
        return fail(502, {
          needsToken: true,
          error:
            'GitHub rechazó el acceso al repositorio (autenticación). Configura el remote con tu token:\n' +
            'git remote set-url origin https://TU_TOKEN@github.com/dieg0y/VAULTNOTES.git\n' +
            'y vuelve a pulsar Pull.',
        });
      }
      throw err;
    }

    // ── 2) Comparar HEAD local vs remoto (1-2 llamadas git) ───────────────
    const { localHead, remoteRef, remoteSha } = await resolveRefs();
    const { ahead, behind } = await countDivergence(localHead, remoteRef);

    if (behind === 0) {
      return NextResponse.json({
        ok: true,
        updated: false,
        ahead,
        head: localHead.slice(0, 7),
        message:
          ahead > 0
            ? 'Sin cambios remotos (tienes commits locales sin push).'
            : 'Ya estás al día — no hay nada que actualizar.',
      });
    }

    if (ahead > 0) {
      // Nunca sobrescribir historia local: requiere push primero.
      return fail(409, {
        ahead,
        behind,
        error: `Pull cancelado: tienes ${ahead} commit(s) locales que no están en GitHub. Haz push primero para no perderlos.`,
      });
    }

    // ── 3) Repo sucio: archivos tracked sin confirmar → abortar con ───────
    // instrucciones humanas (git también se autocorregiría, pero el mensaje
    // nativo es críptico). Untracked (??) no choca con ff-only → se ignora.
    const dirty = await dirtyTrackedFiles();
    if (dirty.length > 0) {
      return fail(409, {
        error:
          `Pull pausado: tienes ${dirty.length} archivo(s) con cambios sin confirmar (p. ej. "${dirty[0]}").\n` +
          'Guárdalos o descártalos y reintenta:  git stash (guardarlos a un lado) · git restore . (descartarlos)',
      });
    }

    // ── 4) Fast-forward puro: features nuevas, fixes y borrados ───────────
    await git(['merge', '--ff-only', remoteRef]);

    // Tras ff-only, HEAD === remoteSha: no hace falta re-leerlo.
    const changedFiles = (await git(['diff', '--name-status', localHead, remoteSha]))
      .split('\n')
      .filter(Boolean);

    // ── 5) Dependencias: si package.json/bun.lock cambiaron → bun install ─
    const needsInstall = changedFiles.some((line) =>
      /(?:^|\/)(package\.json|bun\.lock|bun\.lockb)$/.test(line.split('\t').pop() || ''),
    );
    let installRan = false;
    if (needsInstall) {
      await runBun(['install'], 180_000);
      installRan = true;
    }

    // ── 6) Producción: regenerar el build standalone tras el pull ─────────
    // El rebuild escribe .next/ mientras el server viejo sigue sirviendo:
    // por eso la respuesta pide REINICIAR en lugar de auto-recargar.
    const codeChanged = touchedCode(changedFiles, needsInstall);
    let needsRestart = false;
    let rebuildError: string | null = null;
    if (process.env.NODE_ENV === 'production' && codeChanged) {
      needsRestart = true;
      try {
        await runBun(['run', 'build'], 360_000);
      } catch (err) {
        rebuildError = describeError(err);
      }
    }

    // Resumen legible de los commits que entraron (no fatal si falla).
    let logSummary: string[] = [];
    try {
      logSummary = (await git(['log', '--oneline', '--no-decorate', `${localHead}..${remoteSha}`]))
        .split('\n')
        .filter(Boolean)
        .slice(0, 20);
    } catch {
      logSummary = [];
    }

    let message: string;
    if (needsRestart) {
      message = rebuildError
        ? `${behind} commit(s) aplicados, PERO el rebuild de producción falló: ${rebuildError} — el código en disco está actualizado; ejecuta "bun run build" y reinicia la app.`
        : `${behind} commit(s) aplicados y build de producción regenerado — reinicia la app: cierra la ventana "VaultNotes (servidor)" y vuelve a abrir IniciarVaultNotes.bat.`;
    } else {
      message =
        process.env.NODE_ENV === 'production' && !codeChanged
          ? `${behind} commit(s) aplicados (solo documentación — no hace falta reiniciar).`
          : `${behind} commit(s) aplicados desde GitHub.`;
    }

    return NextResponse.json({
      ok: true,
      updated: true,
      commits: behind,
      head: remoteSha.slice(0, 7),
      changedFiles,
      needsInstall: installRan,
      needsRestart,
      rebuildError,
      log: logSummary,
      message,
    });
  } catch (err) {
    const kind = classifyFailure(err);
    if (kind === 'git-missing') {
      return fail(500, {
        error: 'Git no está instalado o no está en el PATH. Instálalo desde https://git-scm.com y vuelve a pulsar Pull.',
      });
    }
    return fail(500, { error: describeError(err) });
  } finally {
    inFlight = false;
  }
}
