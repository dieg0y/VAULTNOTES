import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * VaultNotes ESLint config — VN-F-021 fix.
 *
 * The previous config disabled 28 rules (`"off"`), which turned `bun run lint`
 * into a no-op: real bugs (impure renders, unescaped entities, unused vars
 * masking typos, hook dep mistakes…) were silently passing. All overrides were
 * removed so the standard Next.js `core-web-vitals` + `typescript` presets
 * apply again.
 *
 * Only two intentional deviations, both documented:
 *  - `@typescript-eslint/no-explicit-any` → "warn": the legacy port uses `any`
 *    in a handful of parsing helpers (zipBackup / fuzzySearch / db seed) where
 *    narrowing would require a refactor; warnings keep it visible without
 *    blocking lint.
 *  - `no-unused-vars` ignores the `_`-prefixed convention already used across
 *    the codebase for intentionally-unused params/locals.
 */
const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
    ],
  },
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "skills"]
}];

export default eslintConfig;
