/**
 * HashToolkitTool.tsx — Offline hash generation, identification, and comparison.
 *
 * 100% offline. SHA-1/256/384/512 use the Web Crypto API (`crypto.subtle.digest`).
 * MD5 is implemented in pure TypeScript below (public-domain algorithm, RFC 1321)
 * because the Web Crypto API does not ship MD5.
 *
 * Three modes via `Tabs`:
 *   - Generate : compute hashes for one input across multiple algorithms
 *   - Identify : list *possible* hash types from length/charset (NOT definitive)
 *   - Compare  : case-insensitive A vs B comparison with green/red banner
 */
import React, { useState, useEffect } from 'react';
import { Hash, Search, ArrowLeftRight } from 'lucide-react';
import { inputCls, taCls, CodeBlock, InfoBanner, Tabs, Field, Row } from './_shared';

/* ---------- strict types ---------- */
type Mode = 'generate' | 'identify' | 'compare';
type HashAlgo = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

const MAX_INPUT_BYTES = 1024 * 1024; // 1 MB DoS guard
const ALGOS: HashAlgo[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

/* ---------- Pure TS MD5 implementation (public-domain algorithm) ----------
 * Algorithm by Ronald Rivest (RFC 1321). Implementation adapted from the
 * public-domain MD5 by Joseph Myers. No external libs, no native crypto.
 * Works on 32-bit words using JS bitwise ops (signed int32 arithmetic).
 */
function safeAdd(x: number, y: number): number {
  const lsw = (x & 0xffff) + (y & 0xffff);
  const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xffff);
}
function bitRol(num: number, cnt: number): number {
  return (num << cnt) | (num >>> (32 - cnt));
}
function cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
  return safeAdd(bitRol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
}
function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return cmn((b & c) | (~b & d), a, b, x, s, t);
}
function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return cmn((b & d) | (c & ~d), a, b, x, s, t);
}
function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return cmn(b ^ c ^ d, a, b, x, s, t);
}
function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return cmn(c ^ (b | ~d), a, b, x, s, t);
}

function md5cycle(x: number[], k: number[]): void {
  let a = x[0], b = x[1], c = x[2], d = x[3];
  a=ff(a,b,c,d,k[0],7,-680876936); d=ff(d,a,b,c,k[1],12,-389564586);
  c=ff(c,d,a,b,k[2],17,606105819); b=ff(b,c,d,a,k[3],22,-1044525330);
  a=ff(a,b,c,d,k[4],7,-176418897); d=ff(d,a,b,c,k[5],12,1200080426);
  c=ff(c,d,a,b,k[6],17,-1473231341); b=ff(b,c,d,a,k[7],22,-45705983);
  a=ff(a,b,c,d,k[8],7,1770035416); d=ff(d,a,b,c,k[9],12,-1958414417);
  c=ff(c,d,a,b,k[10],17,-42063); b=ff(b,c,d,a,k[11],22,-1990404162);
  a=ff(a,b,c,d,k[12],7,1804603682); d=ff(d,a,b,c,k[13],12,-40341101);
  c=ff(c,d,a,b,k[14],17,-1502002290); b=ff(b,c,d,a,k[15],22,1236535329);

  a=gg(a,b,c,d,k[1],5,-165796510); d=gg(d,a,b,c,k[6],9,-1069501632);
  c=gg(c,d,a,b,k[11],14,643717713); b=gg(b,c,d,a,k[0],20,-373897302);
  a=gg(a,b,c,d,k[5],5,-701558691); d=gg(d,a,b,c,k[10],9,38016083);
  c=gg(c,d,a,b,k[15],14,-660478335); b=gg(b,c,d,a,k[4],20,-405537848);
  a=gg(a,b,c,d,k[9],5,568446438); d=gg(d,a,b,c,k[14],9,-1019803690);
  c=gg(c,d,a,b,k[3],14,-187363961); b=gg(b,c,d,a,k[8],20,1163531501);
  a=gg(a,b,c,d,k[13],5,-1444681467); d=gg(d,a,b,c,k[2],9,-51403784);
  c=gg(c,d,a,b,k[7],14,1735328473); b=gg(b,c,d,a,k[12],20,-1926607734);

  a=hh(a,b,c,d,k[5],4,-378558); d=hh(d,a,b,c,k[8],11,-2022574463);
  c=hh(c,d,a,b,k[11],16,1839030562); b=hh(b,c,d,a,k[14],23,-35309556);
  a=hh(a,b,c,d,k[1],4,-1530992060); d=hh(d,a,b,c,k[4],11,1272893353);
  c=hh(c,d,a,b,k[7],16,-155497632); b=hh(b,c,d,a,k[10],23,-1094730640);
  a=hh(a,b,c,d,k[13],4,681279174); d=hh(d,a,b,c,k[0],11,-358537222);
  c=hh(c,d,a,b,k[3],16,-722521979); b=hh(b,c,d,a,k[6],23,76029189);
  a=hh(a,b,c,d,k[9],4,-640364487); d=hh(d,a,b,c,k[12],11,-421815835);
  c=hh(c,d,a,b,k[15],16,530742520); b=hh(b,c,d,a,k[2],23,-995338651);

  a=ii(a,b,c,d,k[0],6,-198630844); d=ii(d,a,b,c,k[7],10,1126891415);
  c=ii(c,d,a,b,k[14],15,-1416354905); b=ii(b,c,d,a,k[5],21,-57434055);
  a=ii(a,b,c,d,k[12],6,1700485571); d=ii(d,a,b,c,k[3],10,-1894986606);
  c=ii(c,d,a,b,k[10],15,-1051523); b=ii(b,c,d,a,k[1],21,-2054922799);
  a=ii(a,b,c,d,k[8],6,1873313359); d=ii(d,a,b,c,k[15],10,-30611744);
  c=ii(c,d,a,b,k[6],15,-1560198380); b=ii(b,c,d,a,k[13],21,1309151649);
  a=ii(a,b,c,d,k[4],6,-145523070); d=ii(d,a,b,c,k[11],10,-1120210379);
  c=ii(c,d,a,b,k[2],15,718787259); b=ii(b,c,d,a,k[9],21,-343485551);

  x[0]=safeAdd(a,x[0]); x[1]=safeAdd(b,x[1]); x[2]=safeAdd(c,x[2]); x[3]=safeAdd(d,x[3]);
}

function md5blk(s: string): number[] {
  const md5blks: number[] = new Array(16);
  for (let i = 0; i < 64; i += 4) {
    md5blks[i >> 2] =
      s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) +
      (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
  }
  return md5blks;
}

function md51(s: string): number[] {
  const n = s.length;
  const state: number[] = [1732584193, -271733879, -1732584194, 271733878];
  let i: number;
  for (i = 64; i <= s.length; i += 64) {
    md5cycle(state, md5blk(s.substring(i - 64, i)));
  }
  s = s.substring(i - 64);
  const tail: number[] = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
  for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
  tail[i >> 2] |= 0x80 << ((i % 4) << 3);
  if (i > 55) {
    md5cycle(state, tail);
    for (i = 0; i < 16; i++) tail[i] = 0;
  }
  tail[14] = n * 8; // bit length low 32 bits (n < 2^20 due to 1 MB cap)
  md5cycle(state, tail);
  return state;
}

function rhex(n: number): string {
  let s = '';
  for (let j = 0; j < 4; j++) {
    s += ((n >> (j * 8 + 4)) & 0x0F).toString(16) +
         ((n >> (j * 8)) & 0x0F).toString(16);
  }
  return s;
}
function hex(x: number[]): string { return x.map(rhex).join(''); }

/** Encode input as UTF-8 bytes, then pack each byte into a JS char so the
 *  MD5 implementation (which walks 8-bit chars) hashes the UTF-8 form. */
function utf8Latin1(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let r = '';
  for (let i = 0; i < bytes.length; i++) r += String.fromCharCode(bytes[i]);
  return r;
}

/** Compute MD5 of a UTF-8 string. Pure TS, no native crypto. */
function md5(input: string): string {
  return hex(md51(utf8Latin1(input)));
}
/* ---------- end MD5 ---------- */

/** Convert an ArrayBuffer (Web Crypto digest output) to lowercase hex. */
function bufToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
  return s;
}

/* ---------- Mode 1: GENERATE ---------- */
const GenerateMode: React.FC = () => {
  const [input, setInput] = useState('');
  const [enabled, setEnabled] = useState<Record<HashAlgo, boolean>>({
    MD5: true,
    'SHA-1': false,
    'SHA-256': true,
    'SHA-384': false,
    'SHA-512': false,
  });
  const [hashes, setHashes] = useState<Partial<Record<HashAlgo, string>>>({});
  const [computing, setComputing] = useState(false);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      if (input.length === 0) {
        if (!cancelled) {
          setHashes({});
          setTruncated(false);
          setComputing(false);
        }
        return;
      }
      if (!cancelled) setComputing(true);

      const encoder = new TextEncoder();
      let work = input;
      let wasTruncated = false;
      const bytes = encoder.encode(input);
      if (bytes.length > MAX_INPUT_BYTES) {
        wasTruncated = true;
        work = new TextDecoder('utf-8', { fatal: false }).decode(
          bytes.subarray(0, MAX_INPUT_BYTES)
        );
      }

      const result: Partial<Record<HashAlgo, string>> = {};
      for (const algo of ALGOS) {
        if (!enabled[algo]) continue;
        if (algo === 'MD5') {
          result[algo] = md5(work);
        } else {
          try {
            const buf = encoder.encode(work);
            const digest = await crypto.subtle.digest(algo, buf);
            result[algo] = bufToHex(digest);
          } catch {
            result[algo] = '(unavailable on this browser)';
          }
        }
      }

      if (!cancelled) {
        setTruncated(wasTruncated);
        setHashes(result);
        setComputing(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [input, enabled]);

  const toggle = (a: HashAlgo): void => {
    setEnabled((e) => {
      const next: Record<HashAlgo, boolean> = { ...e };
      next[a] = !e[a];
      return next;
    });
  };

  const enabledCount = ALGOS.filter((a) => enabled[a]).length;

  return (
    <div className="space-y-4">
      <Field label="Input text">
        <textarea
          className={taCls}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type or paste text to hash…"
          spellCheck={false}
        />
      </Field>

      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-2">
          Algorithms ({enabledCount}/{ALGOS.length})
        </div>
        <div className="flex flex-wrap gap-2">
          {ALGOS.map((a) => {
            const on = enabled[a];
            return (
              <button
                key={a}
                type="button"
                onClick={() => toggle(a)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                  on
                    ? 'bg-blue-500/15 border-blue-500/50 text-blue-300'
                    : 'bg-[#161616] border-[#262626] text-[#888] hover:text-white'
                }`}
              >
                {on ? '✓ ' : ''}{a}
              </button>
            );
          })}
        </div>
      </div>

      {truncated && (
        <InfoBanner>
          Input exceeded 1 MB and was truncated before hashing. Hashes are
          computed on the first 1 MB only.
        </InfoBanner>
      )}

      {computing && (
        <div className="text-[11px] text-[#888] flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          Computing hashes…
        </div>
      )}

      {!computing && input.length === 0 && (
        <InfoBanner>
          Enter text above and enable at least one algorithm to compute hashes.
        </InfoBanner>
      )}

      {!computing && input.length > 0 && enabledCount === 0 && (
        <InfoBanner>Enable at least one algorithm to see hashes.</InfoBanner>
      )}

      <div className="space-y-2">
        {ALGOS.filter((a) => enabled[a] && hashes[a]).map((a) => (
          <CodeBlock key={a} label={a} code={hashes[a] as string} />
        ))}
      </div>
    </div>
  );
};

/* ---------- Mode 2: IDENTIFY ---------- */
interface IdentifyResult {
  length: number;
  charset: 'hex' | 'base64' | 'other';
  candidates: string[];
}

function identifyHash(raw: string): IdentifyResult {
  const trimmed = raw.trim();
  if (!trimmed) return { length: 0, charset: 'other', candidates: [] };

  const length = trimmed.length;
  const isHex = /^[a-fA-F0-9]+$/.test(trimmed);
  const isBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(trimmed) && length % 4 === 0;
  const charset: 'hex' | 'base64' | 'other' = isHex
    ? 'hex'
    : isBase64
      ? 'base64'
      : 'other';

  let candidates: string[] = [];
  if (charset === 'hex') {
    const map: Record<number, string[]> = {
      32: ['MD5', 'MD4', 'MD2', 'LM (case-insensitive)', 'NTLM (case-insensitive)',
            'RIPEMD-128', 'Haval-128', 'Tiger-128', 'Snefru-128', 'Other 128-bit hex hashes'],
      40: ['SHA-1', 'RIPEMD-160', 'Tiger-160', 'Haval-160',
            'MySQL5 (SHA-1(SHA-1))', 'SHA-0', 'Other 160-bit hex hashes'],
      56: ['SHA-224', 'SHA-3-224', 'Other 224-bit hex hashes'],
      64: ['SHA-256', 'SHA-3-256', 'BLAKE2s-256', 'RIPEMD-256',
            'GOST R 34.11-94', 'Other 256-bit hex hashes'],
      96: ['SHA-384', 'SHA-3-384', 'Other 384-bit hex hashes'],
      128: ['SHA-512', 'SHA-3-512', 'BLAKE2b-512', 'Whirlpool',
            'Other 512-bit hex hashes'],
      16: ['MySQL3 (old)', 'Other 64-bit hex hashes'],
    };
    candidates = map[length] ?? [];
  } else if (charset === 'base64') {
    try {
      const decoded = atob(trimmed);
      const byteLen = decoded.length;
      const map: Record<number, string> = {
        16: 'Possibly base64-encoded 128-bit hash (MD5/MD4/MD2/RIPEMD-128)',
        20: 'Possibly base64-encoded 160-bit hash (SHA-1/RIPEMD-160)',
        28: 'Possibly base64-encoded 224-bit hash (SHA-224/SHA-3-224)',
        32: 'Possibly base64-encoded 256-bit hash (SHA-256/SHA-3-256/BLAKE2s-256)',
        48: 'Possibly base64-encoded 384-bit hash (SHA-384/SHA-3-384)',
        64: 'Possibly base64-encoded 512-bit hash (SHA-512/SHA-3-512/BLAKE2b-512/Whirlpool)',
      };
      candidates = map[byteLen]
        ? [map[byteLen]]
        : [`Possibly base64-encoded hash (decoded length: ${byteLen} bytes — verify by decoding)`];
    } catch {
      candidates = ['Possibly base64-encoded hash (verify by decoding)'];
    }
  }

  return { length, charset, candidates };
}

const IdentifyMode: React.FC = () => {
  const [input, setInput] = useState('');
  const result = identifyHash(input);

  return (
    <div className="space-y-4">
      <Field label="Paste a hash to identify">
        <input
          className={inputCls}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. 5d41402abc4b2a76b9719d911017c592"
          spellCheck={false}
        />
      </Field>

      {input.trim().length > 0 && (
        <>
          <InfoBanner>
            Length and charset alone cannot uniquely identify a hash. These are
            likely candidates only.
          </InfoBanner>

          <div className="space-y-1">
            <Row label="Length" value={String(result.length)} mono />
            <Row label="Charset" value={result.charset} mono />
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2">
              Possible types (NOT definitive — length/charset is only a hint):
            </div>
            {result.candidates.length > 0 ? (
              <ul className="space-y-1">
                {result.candidates.map((c) => (
                  <li
                    key={c}
                    className="px-3 py-1.5 bg-[#0A0A0A] border border-[#262626] rounded text-[11px] text-green-300 font-mono"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            ) : (
              <InfoBanner>
                No matches found. Length: {result.length}. Charset: {result.charset}.
              </InfoBanner>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* ---------- Mode 3: COMPARE ---------- */
const CompareMode: React.FC = () => {
  const [a, setA] = useState('');
  const [b, setB] = useState('');

  const aTrim = a.trim();
  const bTrim = b.trim();
  const empty = aTrim.length === 0 || bTrim.length === 0;
  const match = aTrim.toLowerCase() === bTrim.toLowerCase();
  const lenDiff = aTrim.length !== bTrim.length;

  return (
    <div className="space-y-4">
      <Field label="Hash A">
        <input
          className={inputCls}
          value={a}
          onChange={(e) => setA(e.target.value)}
          placeholder="Paste hash A"
          spellCheck={false}
        />
      </Field>
      <Field label="Hash B">
        <input
          className={inputCls}
          value={b}
          onChange={(e) => setB(e.target.value)}
          placeholder="Paste hash B"
          spellCheck={false}
        />
      </Field>

      {empty ? (
        <InfoBanner>Paste two hashes to compare.</InfoBanner>
      ) : match ? (
        <div className="px-4 py-3 rounded border border-green-500/50 bg-green-500/10 text-green-400">
          <div className="text-sm font-bold mb-2">✓ MATCH</div>
          <div className="space-y-1 text-[11px] font-mono break-all">
            <div><span className="text-[#888]">A: </span>{aTrim}</div>
            <div><span className="text-[#888]">B: </span>{bTrim}</div>
          </div>
          <div className="text-[10px] text-green-400/70 mt-2">
            Length A: {aTrim.length} · Length B: {bTrim.length} (case-insensitive comparison)
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 rounded border border-red-500/50 bg-red-500/10 text-red-400">
          <div className="text-sm font-bold mb-2">✗ NO MATCH</div>
          <div className="space-y-1 text-[11px] font-mono break-all">
            <div><span className="text-[#888]">A: </span>{aTrim}</div>
            <div><span className="text-[#888]">B: </span>{bTrim}</div>
          </div>
          <div className="text-[10px] text-red-400/70 mt-2">
            Length A: {aTrim.length} · Length B: {bTrim.length}
            {lenDiff && ' · (lengths differ — never a match)'}
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------- Main exported component ---------- */
export const HashToolkitTool: React.FC = () => {
  const [mode, setMode] = useState<Mode>('generate');
  const tabs: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: 'generate', label: 'Generate', icon: <Hash className="w-3.5 h-3.5" /> },
    { id: 'identify', label: 'Identify', icon: <Search className="w-3.5 h-3.5" /> },
    { id: 'compare', label: 'Compare', icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
  ];
  return (
    <div className="space-y-4">
      <Tabs tabs={tabs} active={mode} onChange={(id) => setMode(id as Mode)} />
      {mode === 'generate' && <GenerateMode />}
      {mode === 'identify' && <IdentifyMode />}
      {mode === 'compare' && <CompareMode />}
    </div>
  );
};

export default HashToolkitTool;
