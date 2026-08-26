/**
 * EncodingTool.tsx — 100% offline encoding/decoding utility.
 *
 * 7 encodings (Base64, Base64 URL-safe, URL, Hex, ASCII, Unicode \uXXXX,
 * HTML Entities) in both directions. Reuses every helper from `_shared.tsx`
 * so the visual style matches the rest of the Tools page.
 *
 * SECURITY: decoded content is ALWAYS rendered as text via React's `value`
 * binding on a readonly <textarea> — never `dangerouslySetInnerHTML`, never
 * executed. After decoding we scan the result for command/code patterns
 * (PowerShell, bash, curl http, <script>…) and show an InfoBanner if matched.
 * No `eval`, no `Function` constructor, no fetch, no libs.
 *
 * Spec reference: Task ID 2-f.
 */
import React, { useState } from 'react';
import { ArrowDownUp, Copy, Check, Trash2 } from 'lucide-react';
import {
  inputCls,
  taCls,
  btnPrimary,
  btnGhost,
  btnDanger,
  Field,
  ErrorBanner,
  InfoBanner,
} from './_shared';

/* ---------- types ---------- */
type Encoding = 'base64' | 'base64url' | 'url' | 'hex' | 'ascii' | 'unicode' | 'html';

interface EncodingDef {
  id: Encoding;
  label: string;
}

const ENCODINGS: EncodingDef[] = [
  { id: 'base64',    label: 'Base64' },
  { id: 'base64url', label: 'Base64 URL-safe' },
  { id: 'url',       label: 'URL' },
  { id: 'hex',       label: 'Hex' },
  { id: 'ascii',     label: 'ASCII' },
  { id: 'unicode',   label: 'Unicode (\\uXXXX)' },
  { id: 'html',      label: 'HTML Entities' },
];

/** Friendly per-encoding error message shown in ErrorBanner on failure. */
const ERR_MSG: Record<Encoding, string> = {
  base64: 'Invalid Base64 input.',
  base64url: 'Invalid Base64 input.',
  url: 'Invalid URL-encoded input.',
  hex: 'Invalid Hex input.',
  ascii: 'Could not decode input. Verify the encoding.',
  unicode: 'Invalid Unicode escape sequence.',
  html: 'Invalid HTML entity.',
};

/* ---------- encoders ---------- */

/** UTF-8 safe Base64 encode (handles Unicode, not just Latin1). */
function encodeBase64(s: string): string {
  const bytes: Uint8Array = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function encodeBase64Url(s: string): string {
  return encodeBase64(s)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function encodeUrl(s: string): string {
  return encodeURIComponent(s);
}

function encodeHex(s: string): string {
  const bytes: Uint8Array = new TextEncoder().encode(s);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function encodeAscii(s: string): string {
  const out: number[] = [];
  for (const ch of s) {  // for...of iterates code points (surrogate pairs).
    const cp = ch.codePointAt(0);
    if (cp !== undefined) out.push(cp);
  }
  return out.join(' ');
}

function encodeUnicode(s: string): string {
  let out = '';
  // Iterate UTF-16 code units so surrogate pairs become \uD83D\uDE00.
  for (let i = 0; i < s.length; i++) {
    const cu: number = s.charCodeAt(i);
    out += '\\u' + cu.toString(16).padStart(4, '0').toUpperCase();
  }
  return out;
}

const HTML_NAMED: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };

function encodeHtml(s: string): string {
  let out = '';
  for (const ch of s) {
    if (ch in HTML_NAMED) { out += HTML_NAMED[ch]; continue; }
    const cp = ch.codePointAt(0);
    out += cp !== undefined && cp > 127 ? `&#${cp};` : ch;
  }
  return out;
}

/* ---------- decoders ---------- */

function decodeBase64(s: string): string {
  const clean: string = s.replace(/\s+/g, '');
  const bin: string = atob(clean);  // throws on non-base64 chars.
  const bytes: Uint8Array = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function decodeBase64Url(s: string): string {
  let b64: string = s.replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
  while (b64.length % 4 !== 0) b64 += '=';  // restore stripped padding
  return decodeBase64(b64);
}

function decodeUrl(s: string): string {
  return decodeURIComponent(s);  // throws URIError on malformed % sequences
}

function decodeHex(s: string): string {
  const clean: string = s.replace(/\s+/g, '').replace(/^0x/i, '');
  if (clean.length === 0) return '';
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) throw new Error('hex');
  const bytes: Uint8Array = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function decodeAscii(s: string): string {
  const parts: string[] = s.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const out: string[] = [];
  for (const p of parts) {
    if (!/^\d+$/.test(p)) throw new Error('ascii');
    const n: number = parseInt(p, 10);
    if (!Number.isFinite(n) || n < 0 || n > 0x10ffff) throw new Error('ascii');
    out.push(String.fromCodePoint(n));
  }
  return out.join('');
}

function decodeUnicode(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === '\\' && (s[i + 1] === 'u' || s[i + 1] === 'U')) {
      if (s[i + 2] === '{') {
        // \u{XXXXX} extended form
        const end: number = s.indexOf('}', i + 3);
        if (end === -1) throw new Error('unicode');
        const hex: string = s.slice(i + 3, end);
        if (!/^[0-9a-fA-F]+$/.test(hex)) throw new Error('unicode');
        const cp: number = parseInt(hex, 16);
        if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) throw new Error('unicode');
        out += String.fromCodePoint(cp);
        i = end + 1;
      } else {
        // \uXXXX 4-hex form (UTF-16 code unit)
        const hex: string = s.slice(i + 2, i + 6);
        if (hex.length !== 4 || !/^[0-9a-fA-F]+$/.test(hex)) throw new Error('unicode');
        const cu: number = parseInt(hex, 16);
        out += String.fromCharCode(cu);
        i += 6;
      }
    } else {
      out += s[i];
      i++;
    }
  }
  return out;
}

const HTML_NAMED_REV: Record<string, string> = {
  lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: '\u00A0',
};

function decodeHtml(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === '&') {
      const semi: number = s.indexOf(';', i);
      // No semicolon nearby → not an entity, emit '&' verbatim.
      if (semi === -1 || semi - i > 14) {
        out += s[i];
        i++;
        continue;
      }
      const body: string = s.slice(i + 1, semi);
      if (body.startsWith('#')) {
        const rest: string = body.slice(1);
        let cp: number;
        if (rest[0] === 'x' || rest[0] === 'X') {
          const hex: string = rest.slice(1);
          if (!hex || !/^[0-9a-fA-F]+$/.test(hex)) throw new Error('html');
          cp = parseInt(hex, 16);
        } else {
          if (!rest || !/^\d+$/.test(rest)) throw new Error('html');
          cp = parseInt(rest, 10);
        }
        if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) throw new Error('html');
        out += String.fromCodePoint(cp);
        i = semi + 1;
      } else if (body in HTML_NAMED_REV) {
        out += HTML_NAMED_REV[body];
        i = semi + 1;
      } else {
        // Unknown named entity — pass through as-is (don't throw).
        out += s[i];
        i++;
      }
    } else {
      out += s[i];
      i++;
    }
  }
  return out;
}

const ENCODERS: Record<Encoding, (s: string) => string> = {
  base64: encodeBase64, base64url: encodeBase64Url, url: encodeUrl,
  hex: encodeHex, ascii: encodeAscii, unicode: encodeUnicode, html: encodeHtml,
};

const DECODERS: Record<Encoding, (s: string) => string> = {
  base64: decodeBase64, base64url: decodeBase64Url, url: decodeUrl,
  hex: decodeHex, ascii: decodeAscii, unicode: decodeUnicode, html: decodeHtml,
};

/* ---------- suspicious content detection ---------- */
/**
 * Scans decoded text for command/code patterns. If detected, displays an
 * InfoBanner above the output. The text is still shown — NEVER executed.
 *   starts-with: powershell | bash | cmd | Invoke- | iex | wget | curl
 *   anywhere:    curl http(s)://  ·  wget http(s)://  ·  <script>
 */
function looksLikeCode(s: string): boolean {
  if (!s) return false;
  const patterns: RegExp[] = [
    /^\s*(powershell|bash|cmd|invoke-|iex|wget|curl)\b/i,
    /curl\s+https?:\/\//i,
    /wget\s+https?:\/\//i,
    /<script\b/i,
  ];
  return patterns.some((p) => p.test(s));
}

/* ---------- component ---------- */
export const EncodingTool: React.FC = () => {
  const [encoding, setEncoding] = useState<Encoding>('base64');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState(false);
  const [copied, setCopied] = useState(false);

  /** Apply the encode/decode direction for the currently-selected encoding. */
  const run = (dir: 'encode' | 'decode'): void => {
    setError('');
    setWarning(false);
    if (!input.trim()) { setOutput(''); return; }
    try {
      const fn: (s: string) => string = dir === 'encode' ? ENCODERS[encoding] : DECODERS[encoding];
      const result: string = fn(input);
      setOutput(result);
      if (dir === 'decode' && looksLikeCode(result)) setWarning(true);
    } catch {
      setOutput('');
      setError(ERR_MSG[encoding]);
    }
  };

  /** Move Output → Input, clear Output (lets the user chain operations). */
  const handleSwap = (): void => {
    setInput(output); setOutput(''); setError(''); setWarning(false); setCopied(false);
  };

  /** Copy Output to clipboard. */
  const handleCopy = (): void => {
    if (!output || !navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  /** Empty both Input and Output (and reset all banners/flags). */
  const handleClear = (): void => {
    setInput(''); setOutput(''); setError(''); setWarning(false); setCopied(false);
  };

  return (
    <div className="space-y-3">
      <Field label="Encoding" hint="100% offline · output is rendered as text only, never executed">
        <select
          value={encoding}
          onChange={(e) => setEncoding(e.target.value as Encoding)}
          className={inputCls + ' cursor-pointer'}
          aria-label="Encoding"
        >
          {ENCODINGS.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter text to encode or decode…"
          className={taCls}
          rows={4}
          spellCheck={false}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => run('encode')} className={btnPrimary}>
          Encode
        </button>
        <button type="button" onClick={() => run('decode')} className={btnPrimary}>
          Decode
        </button>
        <button
          type="button"
          onClick={handleSwap}
          className={btnGhost + ' inline-flex items-center gap-1'}
          disabled={!output}
        >
          <ArrowDownUp className="w-3.5 h-3.5" />
          Swap
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className={btnGhost + ' inline-flex items-center gap-1'}
          disabled={!output}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          Copy
        </button>
        <button
          type="button"
          onClick={handleClear}
          className={btnDanger + ' inline-flex items-center gap-1'}
          disabled={!input && !output}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>

      {warning && (
        <InfoBanner>
          <span className="font-bold">⚠ Decoded content looks like code/commands.</span>{' '}
          It is shown as text only and is <span className="font-bold">NOT</span> executed.
        </InfoBanner>
      )}

      {error && <ErrorBanner message={error} />}

      <Field label="Output">
        {/* Rendered as text via React's value binding — never as HTML. */}
        <textarea
          readOnly
          value={output}
          placeholder="(output)"
          className={taCls + ' opacity-90'}
          rows={4}
          spellCheck={false}
        />
      </Field>
    </div>
  );
};

export default EncodingTool;
