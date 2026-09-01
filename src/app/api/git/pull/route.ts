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
 *  5. Servidor de PRODUCCIÓN (NODE_ENV=production): regenera el build
 *     standalone (`bun run build`) para que el siguiente arranque sirva el
 *     código nuevo, y responde `needsRestart: true` para que la UI pida
 *     reiniciar (cerrar la ventana del servidor + reabrir el .bat). En
 *     desarrollo no hace falta: Turbopack recompila solo al recargar.
 *     Si solo cambió documentación (*.md) se salta el rebuild.
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
    // Autenticación: si el clone local no tiene el token en el remote,
    // GitHub rechaza el fetch — se lo explicamos con el comando exacto.
    try {
      await git(['fetch', 'origin', '--prune']);
    } catch (err) {
      const raw = describeError(err);
      if (
        /authentication|autenticaci|could not read username|terminal prompts|permission denied|\b403\b|private/i.test(
          raw,
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            updated: false,
            error:
              'GitHub rechazó el acceso al repositorio (autenticación). Configura el remote con tu token:\n' +
              'git remote set-url origin https://TU_TOKEN@github.com/dieg0y/VAULTNOTES.git\n' +
              'y vuelve a pulsar Pull.',
          },
          { status: 502 },
        );
      }
      throw err;
    }

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

    // ── 5) Producción: regenerar el build standalone tras el pull ──────────
    // Solo si el servidor corre en producción Y el pull tocó código real
    // (src/ · public/ · dependencias · config). Un pull solo-docs no rebuild.
    // El rebuild escribe .next/ mientras el server viejo sigue sirviendo:
    // por eso la respuesta pide REINICIAR en lugar de auto-recargar.
    const codeChanged = changedFiles.some((line) => {
      const path = (line.split('\t').pop() || '').toLowerCase();
      return (
        path.startsWith('src/') ||
        path.startsWith('public/') ||
        needsInstall ||
        /(?:^|\/)(next\.config\.ts|tsconfig\.json|eslint\.config\.mjs|postcss\.config\.mjs)$/.test(path)
      );
    });
    let needsRestart = false;
    let rebuildError: string | null = null;
    if (process.env.NODE_ENV === 'production' && codeChanged) {
      needsRestart = true;
      try {
        await exec('bun', ['run', 'build'], {
          cwd: CWD,
          timeout: 360_000,
          maxBuffer: 16 * 1024 * 1024,
          windowsHide: true,
        });
      } catch (err) {
        rebuildError = describeError(err);
      }
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
      head: newHead.slice(0, 7),
      changedFiles,
      needsInstall: installRan,
      needsRestart,
      rebuildError,
      log: logSummary,
      message,
    });
  } catch (err) {
    // git/binario no encontrado → mensaje accionable en vez de stack críptico.
    if ((err as { code?: string })?.code === 'ENOENT') {
      return NextResponse.json(
        {
          ok: false,
          updated: false,
          error:
            'Git no está instalado o no está en el PATH. Instálalo desde https://git-scm.com y vuelve a pulsar Pull.',
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { ok: false, updated: false, error: describeError(err) },
      { status: 500 },
    );
  } finally {
    inFlight = false;
  }
}
