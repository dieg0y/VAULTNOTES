/**
 * TimestampConverterTool.tsx — 100% offline Unix/ISO/local time converter.
 *
 * Accepts a single input that may be:
 *   - Unix seconds       (e.g. 1756134000)
 *   - Unix milliseconds  (e.g. 1756134000000)
 *   - ISO 8601           (e.g. 2025-08-25T05:00:00Z or .000Z)
 *   - Local date string  (e.g. 2025-08-25 05:00:00)
 *
 * Auto-detects sec vs ms when the number is > 1e12, with a manual override
 * (Auto / Seconds / Milliseconds) for ambiguous values. Reuses every shared
 * helper from `_shared.tsx` so the visual style matches the rest of the
 * Tools page exactly.
 *
 * No fetch, no APIs, no telemetry — runs entirely in the browser.
 */
import React, { useMemo, useState } from 'react';
import { Clock, Trash2, Copy, Check } from 'lucide-react';
import { CopyBtn, Field, Row, ErrorBanner, InfoBanner, Tabs, inputCls, btnPrimary, btnGhost, safeStr } from './_shared';

type ConvertMode = 'auto' | 'sec' | 'ms';

type ParseResult =
  | { ok: true; date: Date; secs: number; ms: number }
  | { ok: false; error: string };

/** Threshold above which a raw integer is assumed to be milliseconds. */
const MS_THRESHOLD = 1e12;

/** Largest absolute ms value the JS Date constructor can represent (±8.64e15). */
const MAX_MS = 8.64e15;

/**
 * Parse a raw user string into either a successful {date, secs, ms} triple
 * or an `{ ok: false, error }` result with a friendly message.
 *
 * Empty input returns `{ ok: false, error: '' }` (treated as "no error, no
 * results" by the renderer).
 */
function parseInput(raw: string, mode: ConvertMode): ParseResult {
  const trimmed: string = raw.trim();
  if (!trimmed) return { ok: false, error: '' };

  // Pure integer → seconds or milliseconds.
  if (/^\d+$/.test(trimmed)) {
    const n: number = Number(trimmed);
    let ms: number;
    if (mode === 'sec') ms = n * 1000;
    else if (mode === 'ms') ms = n;
    else ms = n > MS_THRESHOLD ? n : n * 1000; // auto

    if (!Number.isFinite(ms) || ms < -MAX_MS || ms > MAX_MS) {
      return { ok: false, error: 'Invalid timestamp.' };
    }
    const date: Date = new Date(ms);
    if (isNaN(date.getTime())) return { ok: false, error: 'Invalid timestamp.' };
    return { ok: true, date, secs: Math.floor(date.getTime() / 1000), ms: date.getTime() };
  }

  // Otherwise treat it as a date string (ISO 8601 or local).
  const date: Date = new Date(trimmed);
  if (isNaN(date.getTime())) return { ok: false, error: 'Invalid date.' };
  return { ok: true, date, secs: Math.floor(date.getTime() / 1000), ms: date.getTime() };
}

/** Local helper: a value with a CopyBtn to its right, used inside <Row>. */
const ValueWithCopy: React.FC<{ text: string; mono?: boolean }> = ({ text, mono }) => (
  <span className="inline-flex items-center justify-end gap-1 max-w-full">
    <span className={`break-all ${mono ? 'font-mono' : ''}`}>{text}</span>
    <CopyBtn text={text} />
  </span>
);

export const TimestampConverterTool: React.FC = () => {
  // Prefill with the current Unix seconds so the user immediately sees a
  // working example (lazy initializer runs once during first render).
  const [input, setInput] = useState<string>(() => String(Math.floor(Date.now() / 1000)));
  const [mode, setMode] = useState<ConvertMode>('auto');
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  const result: ParseResult = useMemo(() => parseInput(input, mode), [input, mode]);

  /** Multi-line text used by the "Copy all" button. Empty when there's nothing to copy. */
  const allText: string = useMemo(() => {
    if (!result.ok) return '';
    const d: Date = result.date;
    return [
      `Unix seconds: ${result.secs}`,
      `Unix milliseconds: ${result.ms}`,
      `UTC: ${d.toUTCString()}`,
      `Local: ${d.toString()}`,
      `ISO 8601: ${d.toISOString()}`,
    ].join('\n');
  }, [result]);

  const handleCopyAll = (): void => {
    if (!allText) return;
    navigator.clipboard
      ?.writeText(allText)
      .then(() => {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 1500);
      })
      .catch(() => {
        /* clipboard unavailable — fail silently, no UI disruption */
      });
  };

  const handleClear = (): void => {
    setInput('');
    setMode('auto');
    setCopiedAll(false);
  };

  const isEmpty: boolean = input.trim() === '';

  return (
    <div className="space-y-3">
      {/* Single input field */}
      <Field
        label="Timestamp / Date"
        hint="Accepts Unix seconds, milliseconds, ISO 8601, or a local date string."
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="1756134000  |  1756134000000  |  2025-08-25T05:00:00Z"
          className={inputCls}
          autoFocus
          spellCheck={false}
        />
      </Field>

      {/* Mode toggle + action buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Tabs
          tabs={[
            { id: 'auto', label: 'Auto' },
            { id: 'sec', label: 'Seconds' },
            { id: 'ms', label: 'Milliseconds' },
          ]}
          active={mode}
          onChange={(id: string) => setMode(id as ConvertMode)}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopyAll}
            className={`${btnPrimary} inline-flex items-center gap-1.5`}
            disabled={!result.ok}
            title="Copiar los 5 valores al portapapeles"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-green-300" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedAll ? 'Copied' : 'Copy all'}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className={`${btnGhost} inline-flex items-center gap-1.5`}
            title="Limpiar entrada"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Results / errors / empty state */}
      {isEmpty ? null : !result.ok ? (
        result.error ? (
          <ErrorBanner message={result.error} />
        ) : null
      ) : (
        <div className="bg-[#0A0A0A] border border-[#262626] rounded p-3 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1 inline-flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Result
          </div>
          <Row label="Unix seconds:" value={<ValueWithCopy text={safeStr(result.secs)} mono />} />
          <Row label="Unix milliseconds:" value={<ValueWithCopy text={safeStr(result.ms)} mono />} />
          <Row label="UTC:" value={<ValueWithCopy text={safeStr(result.date.toUTCString())} />} />
          <Row label="Local:" value={<ValueWithCopy text={safeStr(result.date.toString())} />} />
          <Row label="ISO 8601:" value={<ValueWithCopy text={safeStr(result.date.toISOString())} mono />} />
        </div>
      )}

      <InfoBanner>
        <strong className="text-blue-200">Auto</strong> treats numbers above 1e12 as milliseconds and below as
        seconds. Use the <strong className="text-blue-200">Seconds</strong> / <strong className="text-blue-200">Milliseconds</strong>{' '}
        tabs to force a unit for ambiguous future values. 100% offline — nothing leaves your browser.
      </InfoBanner>
    </div>
  );
};

export default TimestampConverterTool;
