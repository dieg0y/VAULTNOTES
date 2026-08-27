/**
 * mitreUrl.ts — canonical MITRE ATT&CK URL builder (shared).
 *
 * Technique:     T1027      → https://attack.mitre.org/techniques/T1027/
 * Sub-technique: T1059.001 → https://attack.mitre.org/techniques/T1059/001/
 *                             (dot → slash, the canonical ATT&CK URL format)
 * Malformed / unknown ids fall back to the enterprise techniques index.
 *
 * Consolidated from three identical per-tool copies (PowerShellAnalyzer,
 * MitreExplorer, CommandLineAnalyzer) so the format can never drift apart.
 */
export function mitreUrl(id: string): string {
  const m: RegExpExecArray | null = /^T(\d+)(?:\.(\d+))?$/.exec(id);
  if (!m) return 'https://attack.mitre.org/techniques/enterprise/';
  return m[2]
    ? `https://attack.mitre.org/techniques/T${m[1]}/${m[2]}/`
    : `https://attack.mitre.org/techniques/T${m[1]}/`;
}
