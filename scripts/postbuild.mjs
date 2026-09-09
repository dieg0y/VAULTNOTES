// Post-build cross-platform (Windows + macOS + Linux).
// Next.js con `output: 'standalone'` NO copia .next/static ni public/
// dentro de .next/standalone — hay que hacerlo a mano (docs oficiales).
// Antes esto vivía en package.json como `cp -r ...`, que solo funciona
// en shells Unix y rompía el `bun run build` del botón Pull en Windows.
// Este script usa exclusivamente APIs de fs de Node/Bun: cero shell,
// cero dependencias, funciona igual en todos los SO.
import { cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const standalone = join(root, '.next', 'standalone');

if (!existsSync(standalone)) {
  console.error('[postbuild] No existe .next/standalone — ¿falló "next build"?');
  process.exit(1);
}

cpSync(join(root, '.next', 'static'), join(standalone, '.next', 'static'), { recursive: true });
cpSync(join(root, 'public'), join(standalone, 'public'), { recursive: true });
console.log('[postbuild] .next/static + public/ copiados a .next/standalone');
