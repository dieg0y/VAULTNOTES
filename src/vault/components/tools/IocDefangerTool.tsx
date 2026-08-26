/**
 * IocDefangerTool.tsx — SOC IOC Defanger / Refanger (100% offline).
 *
 * Purpose: turn potentially-malicious indicators (URLs, IPs, emails, domains)
 * into "safe" representations that won't auto-trigger mail filters, link
 * previews, or scanners when pasted into a SOC report / chat. The reverse
 * (Refang) restores the original indicator from a defanged string.
 *
 * DEFANG FORMAT CHOICE
 * --------------------
 * Scheme-only replacement: `http`→`hxxp`, `https`→`hxxps`, and we KEEP `://`
 * literal (instead of `[://]`). This is the format MISP / OpenCTI / most SOC
 * tools produce, and matches the spec example `hxxps://evil[.]com`.
 *
 * IDEMPOTENCY
 * -----------
 * Running DEFANG twice on the same string yields the same output. Each regex
 * step only matches LITERAL `http`, `@`, or `.` — never the already-bracketed
 * `[@]` / `[.]` forms — so a second pass finds nothing to replace.
 *
 * IPv6
 * ----
 * Colons are NOT defanged. Replacing `:` with `[:]` would mangle `2001:db8::1`
 * into unreadable noise, and a refang regex can't reliably distinguish a port
 * (`:8080`) from an IPv6 group boundary. The spec acknowledges this with
 * "IPv6 cuando sea posible" — we leave IPv6 untouched for safety.
 *
 * 100% OFFLINE: no fetch, no APIs, no telemetry, no validation of whether the
 * indicator is actually malicious.
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  ShieldOff, ShieldCheck, Copy, Check, ArrowDownUp, Trash2,
} from 'lucide-react';
import { Field, Tabs, taCls, btnPrimary, btnGhost, InfoBanner } from './_shared';

type Mode = 'defang' | 'refang';

/* ------------------------------------------------------------------ *
 * Pure transformation functions
 * ------------------------------------------------------------------ */

/** Defang a single string: URLs / emails / IPv4 / domains → safe form. */
function defang(input: string): string {
  if (!input) return '';
  let s = input;

  // 1) Schemes: http:// → hxxp://, https:// → hxxps://.
  //    'hxxp' does not contain the literal 'http' so a second pass is a no-op.
  s = s.replace(/\bhttps?:\/\//g, (m) => (m.startsWith('https') ? 'hxxps://' : 'hxxp://'));

  // 2) Emails: replace @ with [@] but ONLY inside an email pattern
  //    (\S+@\S+\.\S+) AND only when @ is not already wrapped in [@].
  //    The lookbehind (?<!\[) and lookahead (?!\]) guard against
  //    double-bracketing an already-defanged email.
  s = s.replace(/(\S+?)(?<!\[)@(?!\])(\S+\.\S+)/g, '$1[@]$2');

  // 3) IPv4: replace . with [.] inside dotted-quad patterns. Only LITERAL
  //    dots are matched, so an already-defanged [.] from a prior run is
  //    invisible to this regex (the `[` between \w and `.` breaks the chain).
  s = s.replace(
    /\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g,
    '$1[.]$2[.]$3[.]$4',
  );

  // 4) Domains: replace . with [.] inside domain-like patterns. The regex
  //    [\w-]+(?:\.[\w-]+)+ requires a LITERAL dot, so already-defanged [.] is
  //    never matched → idempotent. Multi-level domains (sub.example.com)
  //    collapse to sub[.]example[.]com in one shot.
  s = s.replace(/[\w-]+(?:\.[\w-]+)+/g, (m) => m.replace(/\./g, '[.]'));

  return s;
}

/** Refang a single string: restore the original indicator. */
function refang(input: string): string {
  if (!input) return '';
  let s = input;

  // 1) Bracketed schemes (rare format used by some tools) → plain schemes.
  //    Escaped as \[://\] because both `:` and `/` are regex-special-ish.
  s = s.replace(/\bhxxps\[:\/\/\]/g, 'https://');
  s = s.replace(/\bhxxp\[:\/\/\]/g, 'http://');

  // 2) Plain defanged schemes → original schemes.
  s = s.replace(/\bhxxps:\/\//g, 'https://');
  s = s.replace(/\bhxxp:\/\//g, 'http://');

  // 3) Bracketed ports (unusual user-typed form) → plain ports.
  //    e.g. evil[.]com[:8080] → evil.com:8080
  s = s.replace(/\[:(\d+)\]/g, ':$1');

  // 4) Defanged dots and @ → original.
  s = s.replace(/\[\.\]/g, '.');
  s = s.replace(/\[@\]/g, '@');

  return s;
}

/* ------------------------------------------------------------------ *
 * UI
 * ------------------------------------------------------------------ */

const TABS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: 'defang', label: 'Defang', icon: <ShieldOff className="w-3.5 h-3.5" /> },
  { id: 'refang', label: 'Refang', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
];

export const IocDefangerTool: React.FC = () => {
  const [mode, setMode] = useState<Mode>('defang');
  const [input, setInput] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Live preview: recompute Output whenever Input or Mode changes.
  const output = useMemo<string>(() => {
    return mode === 'defang' ? defang(input) : refang(input);
  }, [input, mode]);

  const handleCopy = useCallback(() => {
    if (!output) return;
    navigator.clipboard?.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [output]);

  const handleClear = useCallback(() => {
    setInput('');
    setCopied(false);
  }, []);

  // Swap = move Output → Input, so the user can chain operations
  // (e.g. defang → tweak → refang to verify round-trip).
  const handleSwap = useCallback(() => {
    setInput(output);
  }, [output]);

  return (
    <div className="space-y-3">
      <Tabs
        tabs={TABS}
        active={mode}
        onChange={(id: string) => setMode(id as Mode)}
      />

      <Field label="Input">
        <textarea
          value={input}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
          placeholder={
            mode === 'defang'
              ? 'Pega URLs, IPs, emails, dominios…  ej: https://evil.com → hxxps://evil[.]com'
              : 'Pega indicadores defanged…  ej: hxxps://evil[.]com → https://evil.com'
          }
          className={taCls + ' min-h-[110px]'}
          spellCheck={false}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('defang')}
          className={mode === 'defang' ? btnPrimary : btnGhost}
        >
          <span className="inline-flex items-center gap-1.5">
            <ShieldOff className="w-3.5 h-3.5" /> Defang
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMode('refang')}
          className={mode === 'refang' ? btnPrimary : btnGhost}
        >
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Refang
          </span>
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className={btnGhost}
          disabled={!output}
        >
          <span className="inline-flex items-center gap-1.5">
            {copied
              ? <Check className="w-3.5 h-3.5 text-green-400" />
              : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
          </span>
        </button>
        <button
          type="button"
          onClick={handleSwap}
          className={btnGhost}
          disabled={!output}
        >
          <span className="inline-flex items-center gap-1.5">
            <ArrowDownUp className="w-3.5 h-3.5" /> Swap
          </span>
        </button>
        <button
          type="button"
          onClick={handleClear}
          className={btnGhost}
          disabled={!input && !output}
        >
          <span className="inline-flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </span>
        </button>
      </div>

      <Field label="Output">
        <textarea
          value={output}
          readOnly
          placeholder="Resultado…"
          className={taCls + ' min-h-[110px] bg-[#0A0A0A]'}
          spellCheck={false}
        />
      </Field>

      <InfoBanner>
        <span className="font-semibold">100% offline.</span> Defang convierte
        indicadores (URLs / IPs / emails / dominios) en texto seguro para
        reportes. Idempotente: no duplica <code className="font-mono">[.]</code>{' '}
        ni <code className="font-mono">[@]</code>. IPv6 se deja intacto (defang
        de <code className="font-mono">:</code> rompería el formato y la refang
        es ambigua respecto a puertos).
      </InfoBanner>
    </div>
  );
};

export default IocDefangerTool;
