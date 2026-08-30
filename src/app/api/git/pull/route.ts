import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';

/**
 * POST /api/git/pull — Pull de actualizaciones de código desde GitHub.
 *
 * Estrategia "sin afectar nada más":
 *  1. `git fetch origin` — solo actualiza referencias remotas.
 *  2. Compara HEAD local vs remoto.
 *     · Si estamos al día → no hace nada.
 *     · Si hay commits locales sin push → ABORTA (nunca pierde trabajo local).
 *  3. `git merge --ff-only` — fast-forward puro: aplica añadidos, cambios y
 *     BORRADOS de archivos del remoto. Nunca crea commits de merge ni edita
 *     archivos con cambios locales sin confirmar (git aborta solo).
 *  4. Si package.json / bun.lock cambiaron → `bun install` para sincronizar
 *     node_modules.
 *
 * Los datos del usuario (notas, labs, glosario, IOCs…) viven en IndexedDB en
 * el NAVEGADOR: este pull solo toca archivos de código del repositorio.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const exec = promisify(execFile);
const CWD = process.cwd();

/** Lock en memoria: nunca ejecutar dos pulls a la vez. */
let inFlight = false;

interface GitFailure extends Error {
  stdout?: string;
  stderr?: string;
  killed?: boolean;
}

async function git(args: string[], timeoutMs = 90_000): Promise<string> {
  const { stdout } = await exec('git', args, {
    cwd: CWD,
    timeout: timeoutMs,
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  return stdout.toString().trim();
}

function describeError(err: unknown): string {
  const e = err as GitFailure;
  if (e?.killed) return 'El comando tardó demasiado (timeout) — revisa tu conexión e inténtalo de nuevo.';
  const raw = (e?.stderr || e?.stdout || e?.message || '').toString().trim();
  const lines = raw.split('\n').filter(Boolean).slice(0, 6).join(' · ');
  return lines || 'Error desconocido ejecutando git';
}

export async function POST() {
  if (inFlight) {
    return NextResponse.json(
      { ok: false, updated: false, error: 'Ya hay un pull en curso — espera a que termine.' },
      { status: 429 },
    );
  }
  inFlight = true;

  try {
    // ── 1) Fetch: trae refs remotas, no toca el working tree ──────────────
    await git(['fetch', 'origin', '--prune']);

    // ── 2) Resolver la rama remota por defecto (main → master fallback) ───
    let remoteRef = 'origin/main';
    try {
      await git(['rev-parse', '--verify', '--quiet', 'origin/main']);
    } catch {
      remoteRef = 'origin/master';
    }

    const localHead = await git(['rev-parse', 'HEAD']);
    const behind = parseInt(await git(['rev-list', '--count', `HEAD..${remoteRef}`]), 10) || 0;
    const ahead = parseInt(await git(['rev-list', '--count', `${remoteRef}..HEAD`]), 10) || 0;

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
      // Nunca sobrescribir/re-escribir historia local: requiere push primero.
      return NextResponse.json(
        {
          ok: false,
          updated: false,
          ahead,
          behind,
          error: `Pull cancelado: tienes ${ahead} commit(s) locales que no están en GitHub. Haz push primero para no perderlos.`,
        },
        { status: 409 },
      );
    }

    // ── 3) Fast-forward puro: features nuevas, fixes y borrados de código ─
    await git(['merge', '--ff-only', remoteRef]);

    const newHead = await git(['rev-parse', 'HEAD']);
    const diffSummary = await git(['diff', '--name-status', localHead, newHead]);
    const changedFiles = diffSummary.split('\n').filter(Boolean);

    // ── 4) Dependencias: si package.json/bun.lock cambiaron → bun install ─
    const needsInstall = changedFiles.some((line) =>
      /(?:^|\/)(package\.json|bun\.lock|bun\.lockb)$/.test(line.split('\t').pop() || ''),
    );
    let installRan = false;
    if (needsInstall) {
      await exec('bun', ['install'], {
        cwd: CWD,
        timeout: 180_000,
        maxBuffer: 16 * 1024 * 1024,
        windowsHide: true,
      });
      installRan = true;
    }

    // Resumen legible de los commits que entraron.
    let logSummary: string[] = [];
    try {
      logSummary = (await git(['log', '--oneline', '--no-decorate', `${localHead}..${newHead}`]))
        .split('\n')
        .filter(Boolean)
        .slice(0, 20);
    } catch {
      logSummary = []; // no fatal
    }

    return NextResponse.json({
      ok: true,
      updated: true,
      commits: behind,
      head: newHead.slice(0, 7),
      changedFiles,
      needsInstall: installRan,
      log: logSummary,
      message: `${behind} commit(s) aplicados desde GitHub.`,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, updated: false, error: describeError(err) },
      { status: 500 },
    );
  } finally {
    inFlight = false;
  }
}
