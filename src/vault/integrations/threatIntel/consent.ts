/**
 * threatIntel/consent.ts — Online-enrichment consent flag.
 *
 * Spec #13: before the FIRST online enrichment, show a privacy warning:
 *  "Online enrichment sends the selected IOC to the configured third-party
 *   provider." with [Continue] / [Cancel]. After the user accepts, don't
 *  show it every time. Settings has a "Reset online enrichment consent"
 *  button to re-gate the flow.
 *
 * This is intentionally a single boolean in localStorage — no metadata, no
 * timestamps, no IOC values stored alongside. Just "did the user acknowledge
 * that enrichment sends IOCs to third parties?".
 */
const CONSENT_KEY = 'vaultnotes-online-enrichment-consent-v1';

/** Read the consent flag. Returns true if the user has already acknowledged
 *  the privacy warning. */
export function hasOnlineConsent(): boolean {
  try { return localStorage.getItem(CONSENT_KEY) === '1'; } catch { return false; }
}

/** Set the consent flag (called when the user clicks [Continue] on the
 *  first-run privacy warning). */
export function grantOnlineConsent(): void {
  try { localStorage.setItem(CONSENT_KEY, '1'); } catch { /* ignore */ }
}

/** Clear the consent flag (called from Settings → "Reset online enrichment
 *  consent"). Next enrichment attempt will re-show the warning. */
export function resetOnlineConsent(): void {
  try { localStorage.removeItem(CONSENT_KEY); } catch { /* ignore */ }
}
