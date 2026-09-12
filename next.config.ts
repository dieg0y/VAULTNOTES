import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // TURBOPACK PANIC FIX + PORTABILIDAD (USB/mover carpeta): dev y producción
  // NUNCA comparten distDir. `next dev` (NODE_ENV ya es "development" al
  // cargar la config) escribe en `.next-dev`; `next build` en `.next`.
  // Esto elimina de raíz los panics "Failed to write app endpoint /page"
  // que aparecían cuando el dev server corría sobre artefactos de un build
  // de producción (estado mixto en .next), y además permite que el build
  // standalone (portable: arranca desde cualquier ruta, verificado) viva en
  // `.next` mientras la caché de dev se limpia de forma independiente al
  // mover/cambiar la carpeta de unidad (el .bat lo detecta con un marker).
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  // AUDIT VN-007: removed `typescript.ignoreBuildErrors: true`. The project
  // passes `tsc --noEmit` cleanly. TS errors act as a real quality gate at
  // build time.
  // AUDIT VN-008: enabled `reactStrictMode: true`. Verified the components
  // most at risk under StrictMode (contentEditable + autosave + event
  // listeners + object URLs + IndexedDB ops + SW registration) all use the
  // latest-callback ref pattern / cleanup-in-useEffect pattern and are
  // idempotent under double-mount. The SW registration effect has named
  // handlers + removeEventListener cleanup, so no duplicate listeners
  // accumulate. Object URLs (videoUrlsRef / pdfUrlsRef) are revoked on
  // unmount and re-created on the remount's load effect (which resets
  // editorRef.current.innerHTML) — the new <video> elements get fresh URLs.
  reactStrictMode: true,
  // The sandbox preview panel reaches the dev server through a
  // *.space-z.ai gateway origin; without this Next.js 16 flags every
  // dev-tools request from it as cross-origin.
  allowedDevOrigins: ["*.space-z.ai"],
};

export default nextConfig;
