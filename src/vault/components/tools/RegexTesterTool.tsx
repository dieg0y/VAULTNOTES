/**
 * RegexTesterTool.tsx — Native JavaScript RegExp tester.
 *
 * 100% offline. No external regex libs, no `eval`, no `Function` constructor.
 * Only `new RegExp(pattern, flags)` + `RegExp.prototype.exec` against a
 * user-provided string. Matches, groups and positions are recomputed live on
 * every keystroke via useMemo.
 */
import React, { useMemo, useRef, useState } from 'react';
import { inputCls, taCls, Field, ErrorBanner, InfoBanner, CopyBtn } from './_shared';

/* ---------- strict types ---------- */
interface Match {
  index: number;
  end: number;
  text: string;
  groups: string[];
}

interface PresetDef {
  label: string;
  regex: string;
  flags: string;
}

/* ---------- presets (14) ---------- */
const PRESETS: PresetDef[] = [
  { label: 'IPv4',            regex: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b',                                        flags: 'g' },
  { label: 'IPv6',            regex: '\\b(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}\\b',                          flags: 'g' },
  { label: 'Email',           regex: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b',                    flags: 'g' },
  { label: 'URL',             regex: 'https?://[^\\s<>"]+',                                                       flags: 'g' },
  { label: 'Domain',          regex: '\\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,}\\b',   flags: 'g' },
  { label: 'MD5',             regex: '\\b[a-fA-F0-9]{32}\\b',                                                    flags: 'g' },
  { label: 'SHA-1',           regex: '\\b[a-fA-F0-9]{40}\\b',                                                    flags: 'g' },
  { label: 'SHA-256',         regex: '\\b[a-fA-F0-9]{64}\\b',                                                    flags: 'g' },
  { label: 'Win username',    regex: '\\b[A-Za-z][A-Za-z0-9._-]{0,62}\\b',                                       flags: 'g' },
  { label: 'Windows path',    regex: '[A-Za-z]:\\\\(?:[^\\\\/:*?"<>|\\r\\n]+\\\\)*[^\\\\/:*?"<>|\\r\\n]*',        flags: 'g' },
  { label: 'Linux path',      regex: '/(?:[^/\\s]+/)*[^/\\s]+',                                                  flags: 'g' },
  { label: 'CVE',             regex: 'CVE-\\d{4}-\\d{4,7}',                                                       flags: 'g' },
  { label: 'MITRE Technique', regex: 'T\\d{4}(?:\\.\\d{3})?',                                                    flags: 'g' },
  { label: 'JWT',             regex: 'eyJ[A-Za-z0-9_-]+\\.eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+',                   flags: 'g' },
];

const MAX_DISPLAY = 1000;

/* ---------- result union (discriminated by `status`) ---------- */
type Result =
  | { status: 'empty-regex' }
  | { status: 'empty-test' }
  | { status: 'error'; name?: string }
  | { status: 'ok'; matches: Match[]; total: number; truncated: boolean };

/* ---------- matcher: only RegExp.exec, no eval ---------- */
function computeMatches(re: RegExp, text: string): Match[] {
  const out: Match[] = [];
  const multi = re.global || re.sticky;
  let guard = 0;
  let m: RegExpExecArray | null;
  // Iterate when global/sticky (exec advances lastIndex automatically).
  // For a non-global, non-sticky regex, exec always returns the first match —
  // break after the first hit to avoid an infinite loop.
  while ((m = re.exec(text)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    const groups: string[] = [];
    for (let i = 1; i < m.length; i++) {
      const g = m[i];
      // Optional ( unmatched ) capture groups come back as undefined.
      groups.push(g === undefined ? '' : g);
    }
    out.push({ index: start, end, text: m[0], groups });
    if (!multi) break;
    // Defensive: zero-length matches would otherwise loop forever on the
    // same lastIndex; nudge it forward by one character.
    if (m[0].length === 0) re.lastIndex++;
    if (++guard > 5000000) break; // hard safety cap
  }
  return out;
}

/* ---------- component ---------- */
export const RegexTesterTool: React.FC = () => {
  const [regex, setRegex] = useState('');
  const [flags, setFlags] = useState('g');
  const [testString, setTestString] = useState('');
  const regexInputRef = useRef<HTMLInputElement>(null);

  const result = useMemo<Result>(() => {
    if (!regex.trim()) return { status: 'empty-regex' };
    if (!testString) return { status: 'empty-test' };
    let re: RegExp;
    try {
      // The only place a RegExp is constructed — never `eval`/`Function`.
      re = new RegExp(regex, flags);
    } catch (e) {
      return { status: 'error', name: e instanceof Error ? e.name : 'Error' };
    }
    const matches = computeMatches(re, testString);
    const total = matches.length;
    if (total > MAX_DISPLAY) {
      return { status: 'ok', matches: matches.slice(0, MAX_DISPLAY), total, truncated: true };
    }
    return { status: 'ok', matches, total, truncated: false };
  }, [regex, flags, testString]);

  const applyPreset = (p: PresetDef) => {
    setRegex(p.regex);
    setFlags(p.flags);
    // Focus the regex input so the user can immediately edit the loaded pattern.
    regexInputRef.current?.focus();
  };

  const activePresetLabel = PRESETS.find(
    (p) => p.regex === regex && p.flags === flags,
  )?.label;

  const groupCount = result.status === 'ok' && result.matches.length > 0
    ? result.matches[0].groups.length
    : 0;

  return (
    <div className="space-y-3">
      {/* Regex + Flags */}
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <Field label="Regex">
            <input
              ref={regexInputRef}
              type="text"
              className={inputCls}
              value={regex}
              onChange={(e) => setRegex(e.target.value)}
              placeholder="^\d{1,3}(\.\d{1,3}){3}$"
              spellCheck={false}
              autoComplete="off"
            />
          </Field>
        </div>
        <div className="w-20 shrink-0">
          <Field label="Flags">
            <input
              type="text"
              className={inputCls}
              value={flags}
              onChange={(e) => setFlags(e.target.value)}
              placeholder="g"
              spellCheck={false}
              autoComplete="off"
            />
          </Field>
        </div>
      </div>

      {/* Presets */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1.5">
          Presets
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              title={`${p.regex}  /${p.flags}`}
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono border transition-colors cursor-pointer ${
                activePresetLabel === p.label
                  ? 'bg-blue-500/15 border-blue-500 text-blue-300'
                  : 'bg-[#161616] border-[#262626] text-[#CCC] hover:bg-[#222] hover:text-white hover:border-blue-500/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Test string */}
      <Field label="Test String">
        <textarea
          className={taCls}
          value={testString}
          onChange={(e) => setTestString(e.target.value)}
          placeholder="Enter text to match against — multi-line is supported"
          spellCheck={false}
        />
      </Field>

      {/* Results */}
      <div className="border-t border-[#262626] pt-3 space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
          Results
        </div>

        {result.status === 'empty-regex' && (
          <InfoBanner>Enter a regex pattern. Try a preset above.</InfoBanner>
        )}
        {result.status === 'empty-test' && (
          <InfoBanner>Enter test string to match against.</InfoBanner>
        )}
        {result.status === 'error' && (
          <ErrorBanner
            message={`Invalid regular expression.${result.name ? ` (${result.name})` : ''}`}
          />
        )}

        {result.status === 'ok' && (
          <>
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-[#888] uppercase tracking-wider">Match count</span>
              <span className="font-mono text-blue-300">
                {result.total === 1
                  ? '1 match'
                  : `${result.total.toLocaleString()} matches`}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-[#888] uppercase tracking-wider">Capture groups</span>
              <span className="font-mono text-blue-300">
                {groupCount > 0
                  ? `${groupCount} group${groupCount === 1 ? '' : 's'} per match`
                  : 'No capture groups in this regex.'}
              </span>
            </div>

            {result.truncated && (
              <InfoBanner>
                Truncated to first {MAX_DISPLAY.toLocaleString()} matches (total:{' '}
                {result.total.toLocaleString()}).
              </InfoBanner>
            )}

            {result.matches.length === 0 ? (
              <InfoBanner>No matches found in the test string.</InfoBanner>
            ) : (
              <div className="space-y-1.5">
                {result.matches.map((m, i) => (
                  <div
                    key={i}
                    className="rounded border border-[#262626] bg-[#0D0D0D] p-2.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-blue-400">
                        Match #{i + 1}
                      </span>
                      <span className="text-[10px] text-[#888] font-mono">
                        Position: [{m.index} – {m.end}]
                      </span>
                    </div>

                    <div className="text-[11px] flex items-center gap-2 flex-wrap">
                      <span className="text-[#888]">Matched:</span>
                      <code className="font-mono bg-green-500/15 border border-green-500/40 text-green-300 px-1.5 py-0.5 rounded break-all whitespace-pre-wrap">
                        {m.text}
                      </code>
                      <CopyBtn text={m.text} />
                    </div>

                    {m.groups.length > 0 && (
                      <div className="space-y-0.5 pt-1 border-t border-[#262626]">
                        {m.groups.map((g, gi) => (
                          <div key={gi} className="text-[10px] flex items-center gap-2">
                            <span className="text-[#888]">Group {gi + 1}:</span>
                            <code className="font-mono text-amber-300 bg-[#161616] px-1.5 py-0.5 rounded break-all whitespace-pre-wrap">
                              {g === '' ? (
                                <span className="text-[#666] italic">(empty)</span>
                              ) : (
                                g
                              )}
                            </code>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
