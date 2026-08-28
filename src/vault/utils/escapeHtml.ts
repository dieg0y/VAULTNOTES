/**
 * escapeHtml — the single shared HTML-entity escaper for VaultNotes.
 *
 * Used everywhere untrusted text (user content, tool output, imported data)
 * is interpolated into an HTML string. It escapes the five characters that
 * matter in element bodies and double/single-quoted attributes:
 *   & < > " '
 *
 * Accepts `unknown` defensively: null/undefined → '' (empty string), other
 * non-strings go through String(). For a normal `string` input this is
 * identical to a plain chained `.replace()` on the value itself.
 */
export function escapeHtml(s: unknown): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
