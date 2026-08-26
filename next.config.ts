import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // AUDIT VN-007: removed `typescript.ignoreBuildErrors: true`. The project
  // passes `tsc --noEmit` cleanly (only out-of-scope errors in examples/ and
  // skills/ remain, which are not part of the VaultNext build path). TS errors
  // now act as a real quality gate at build time.
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
};

export default nextConfig;
