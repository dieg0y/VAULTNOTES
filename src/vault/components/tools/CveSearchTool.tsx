'use client';
/**
 * CveSearchTool.tsx — Online CVE search via NVD + Save to Vault.
 *
 * Spec #20, #21, #29:
 *  - Search NVD 2.0 API for a CVE-ID (explicit [Search Online] click — NEVER
 *    on typing, NEVER while offline).
 *  - Render the result card: ID + severity badge + CVSS score + description
 *    + CWE chips + affected products (truncated w/ show-more) + published /
 *    modified dates + references (open in new tab, rel=noopener noreferrer).
 *  - [Save to Vault] stores a snapshot via `saveCveLocal` → available offline
 *    forever. If already saved: show "Saved ✓" + [Open Saved] (expands the
 *    saved row inline) + [Update] (non-destructive snapshot refresh —
 *    preserves personal notes/tags/assessment).
 *
 * Saved CVEs section (always visible, live-query on db.savedCves):
 *  - Most-recent first.
 *  - Each row: CVE ID + CVSS badge + severity + truncated description + tags
 *    + [Open] (inline expand) + [Delete] (confirm + delete).
 *  - Inline editor: read-only snapshot fields + Personal Notes / Tags /
 *    Personal Assessment textareas (saved on blur or [Save annotations]).
 *
 * Reuses the BLOQUE6-ARCH integration layer at `integrations/cve/search.ts`.
 * 100% offline data — the only network call goes through `searchCveOnline`.
 * All async DB ops wrapped in try/catch — failures show a small inline banner.
 */
import React, { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ShieldAlert, Search, Save, Trash2, ExternalLink, BookOpen,
  X, Check, RefreshCw, Wifi, WifiOff,
} from 'lucide-react';
import {
  inputCls, taCls, btnPrimary, btnGhost, btnDanger,
  Field, ErrorBanner, InfoBanner, CopyBtn,
} from './_shared';
import { db, type SavedCve } from '../../db';
import {
  searchCveOnline, saveCveLocal, updateSavedCve, deleteSavedCve,
  type CveSearchResult,
} from '../../integrations/cve/search';
import { useIsOnline } from '../../integrations/online';

/** Snapshot shape returned by a successful search — same fields as SavedCve. */
type CveSnapshot = NonNullable<CveSearchResult['cve']>;

/* ---------- severity → color ---------- */
function severityColor(sev: string | null | undefined): 'red' | 'amber' | 'blue' | 'gray' {
  const s = (sev || '').toUpperCase();
  if (s === 'CRITICAL' || s === 'HIGH') return 'red';
  if (s === 'MEDIUM') return 'amber';
  if (s === 'LOW') return 'blue';
  return 'gray';
}

const sevBadgeCls: Record<'red' | 'amber' | 'blue' | 'gray', string> = {
  red: 'bg-red-500/15 border-red-500/50 text-red-400',
  amber: 'bg-amber-500/15 border-amber-500/50 text-amber-400',
  blue: 'bg-blue-500/15 border-blue-500/50 text-blue-400',
  gray: 'bg-[#161616] border-[#262626] text-[#888]',
};

const SeverityBadge: React.FC<{ severity: string | null | undefined }> = ({ severity }) => {
  const color = severityColor(severity);
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${sevBadgeCls[color]}`}>
      {severity || 'UNKNOWN'}
    </span>
  );
};

const CvssBadge: React.FC<{ cvss: number | null | undefined; severity: string | null | undefined }> = ({ cvss, severity }) => {
  const color = severityColor(severity);
  const text = cvss != null ? cvss.toFixed(1) : 'N/A';
  return (
    <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold border ${sevBadgeCls[color]}`}>
      CVSS {text}
    </span>
  );
};

/** Small loading spinner — same style used across the toolkit. */
const Spinner: React.FC<{ label?: string }> = ({ label }) => (
  <div className="text-[11px] text-[#888] flex items-center gap-2">
    <span className="inline-block w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    {label || 'Loading…'}
  </div>
);

/** Generic mono chip (CWE ids, tags, …). */
const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="px-2 py-0.5 rounded text-[10px] font-mono border bg-[#161616] border-[#262626] text-[#BBB]">
    {children}
  </span>
);

/** Format an ISO date string to YYYY-MM-DD (UTC). Falls back gracefully. */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

/* ---------- Result Card (online search result) ---------- */
interface ResultCardProps {
  cve: CveSnapshot;
  isSaved: boolean;
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
  onUpdate: () => void;
  onOpenSaved: () => void;
}

const ResultCard: React.FC<ResultCardProps> = ({
  cve, isSaved, saving, saveError, onSave, onUpdate, onOpenSaved,
}) => {
  const [showAllProducts, setShowAllProducts] = useState(false);
  const products = cve.affectedProducts || [];
  const visibleProducts = showAllProducts ? products : products.slice(0, 6);
  const moreCount = products.length - 6;

  return (
    <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 space-y-3">
      {/* title row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-bold text-white font-mono">{cve.id}</span>
          <SeverityBadge severity={cve.severity} />
          <CvssBadge cvss={cve.cvss} severity={cve.severity} />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {!isSaved ? (
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className={`${btnPrimary} inline-flex items-center gap-1.5`}
            >
              {saving
                ? <RefreshCw className="w-3 h-3 animate-spin" />
                : <Save className="w-3 h-3" />}
              {saving ? 'Saving…' : 'Save to Vault'}
            </button>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 text-[11px] text-green-400 font-semibold">
                <Check className="w-3 h-3" /> Saved ✓
              </span>
              <button
                type="button"
                onClick={onOpenSaved}
                className={`${btnGhost} inline-flex items-center gap-1.5`}
              >
                <BookOpen className="w-3 h-3" /> Open Saved
              </button>
              <button
                type="button"
                onClick={onUpdate}
                disabled={saving}
                className={`${btnGhost} inline-flex items-center gap-1.5`}
                title="Refresh the saved snapshot with the current search result (preserves your notes)"
              >
                {saving
                  ? <RefreshCw className="w-3 h-3 animate-spin" />
                  : <RefreshCw className="w-3 h-3" />}
                {saving ? 'Updating…' : 'Update'}
              </button>
            </>
          )}
        </div>
      </div>

      {saveError && <ErrorBanner message={saveError} />}

      {/* CVSS score — big number */}
      <div className="flex items-center gap-3">
        <div className="text-3xl font-bold font-mono text-white">
          {cve.cvss != null ? cve.cvss.toFixed(1) : 'N/A'}
        </div>
        <div className="text-[10px] text-[#888] uppercase tracking-wider">
          CVSS base score<br />
          <span className="text-white">{cve.severity || 'UNKNOWN'}</span>
        </div>
      </div>

      {/* description */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1">
          Description
        </div>
        <p className="text-[11px] text-white leading-relaxed font-mono break-words">
          {cve.description || '(no description available)'}
        </p>
      </div>

      {/* CWE */}
      {cve.cwe.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1.5">
            CWE
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cve.cwe.map((c) => <Chip key={c}>{c}</Chip>)}
          </div>
        </div>
      )}

      {/* Affected products — truncated with show-more toggle */}
      {products.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1.5 flex items-center justify-between">
            <span>Affected Products ({products.length})</span>
            {moreCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllProducts((v) => !v)}
                className="text-[10px] text-blue-400 hover:text-blue-300"
              >
                {showAllProducts ? 'show less' : `show ${moreCount} more`}
              </button>
            )}
          </div>
          <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {visibleProducts.map((p, i) => (
              <li
                key={`${p}-${i}`}
                className="text-[10px] font-mono text-[#BBB] bg-[#0A0A0A] border border-[#262626] rounded px-2 py-1 break-all"
              >
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Published + Modified */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] text-[#888] uppercase tracking-wider">Published</span>
          <div className="text-[11px] text-white font-mono">{fmtDate(cve.published)}</div>
        </div>
        <div>
          <span className="text-[10px] text-[#888] uppercase tracking-wider">Modified</span>
          <div className="text-[11px] text-white font-mono">{fmtDate(cve.modified)}</div>
        </div>
      </div>

      {/* References — open in new tab, rel=noopener noreferrer */}
      {cve.references.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1.5">
            References ({cve.references.length})
          </div>
          <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {cve.references.map((url, i) => (
              <li key={`${url}-${i}`} className="flex items-start gap-1.5">
                <ExternalLink className="w-3 h-3 mt-0.5 text-[#666] shrink-0" />
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline break-all"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/* ---------- Saved CVE row + inline editor ---------- */
interface SavedCveRowProps {
  cve: SavedCve;
  expanded: boolean;
  onToggle: () => void;
  onSearchAgain: (id: string) => void;
  /** True while a search is in flight — disables Re-search to avoid overlap. */
  busy?: boolean;
}

const SavedCveRow: React.FC<SavedCveRowProps> = ({ cve, expanded, onToggle, onSearchAgain, busy = false }) => {
  const { personalNotes, tags, personalAssessment } = cve;
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Local state is seeded from the saved snapshot at mount time. The parent
  // uses a `key` that changes when `expanded` toggles, so toggling Open/Close
  // remounts this component — guaranteeing fresh seed values each open.
  const [notes, setNotes] = useState(personalNotes || '');
  const [tagsStr, setTagsStr] = useState((tags || []).join(', '));
  const [assessment, setAssessment] = useState(personalAssessment || '');
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const persist = async (): Promise<void> => {
    try {
      const parsed = tagsStr
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      const uniqueTags = Array.from(new Set(parsed));
      await updateSavedCve(cve.id, {
        personalNotes: notes,
        tags: uniqueTags,
        personalAssessment: assessment,
      });
      setActionError(null);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1500);
    } catch (e) {
      console.warn('updateSavedCve failed:', e);
      setActionError('Failed to save annotations — try again.');
    }
  };

  const handleDelete = async (): Promise<void> => {
    try {
      await deleteSavedCve(cve.id);
    } catch (e) {
      console.warn('deleteSavedCve failed:', e);
      setActionError('Failed to delete — try again.');
    }
  };

  const products = cve.affectedProducts || [];
  const visibleProducts = showAllProducts ? products : products.slice(0, 4);
  const moreCount = products.length - 4;

  return (
    <div className="border border-[#262626] rounded-md bg-[#0D0D0D]">
      {/* collapsed header row */}
      <div className="flex items-start gap-2 p-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-white font-mono">{cve.id}</span>
            <CvssBadge cvss={cve.cvss} severity={cve.severity} />
            <SeverityBadge severity={cve.severity} />
          </div>
          <p className="text-[10px] text-[#999] mt-1 leading-relaxed overflow-hidden line-clamp-2">
            {cve.description || '(no description)'}
          </p>
          {(cve.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(cve.tags || []).map((t) => <Chip key={t}>{t}</Chip>)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggle}
            className={`${btnGhost} inline-flex items-center gap-1`}
          >
            {expanded ? <X className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
            {expanded ? 'Close' : 'Open'}
          </button>
          {confirmDelete ? (
            <>
              <button
                type="button"
                onClick={handleDelete}
                className={`${btnDanger} inline-flex items-center gap-1`}
              >
                <Trash2 className="w-3 h-3" /> Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className={btnGhost}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded text-[#666] hover:text-red-400 hover:bg-[#161616] transition-colors"
              title="Delete"
              aria-label={`Delete saved CVE ${cve.id}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* expanded inline editor */}
      {expanded && (
        <div className="border-t border-[#262626] p-3 space-y-3 bg-[#0A0A0A]">
          {actionError && <ErrorBanner message={actionError} />}

          {/* read-only snapshot fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-[#888] uppercase tracking-wider">Published</span>
              <div className="text-[11px] text-white font-mono">{fmtDate(cve.published)}</div>
            </div>
            <div>
              <span className="text-[10px] text-[#888] uppercase tracking-wider">Modified</span>
              <div className="text-[11px] text-white font-mono">{fmtDate(cve.modified)}</div>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1">
              Description
            </div>
            <p className="text-[11px] text-white leading-relaxed font-mono break-words">
              {cve.description || '(no description)'}
            </p>
          </div>

          {cve.cwe.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1.5">
                CWE
              </div>
              <div className="flex flex-wrap gap-1.5">
                {cve.cwe.map((c) => <Chip key={c}>{c}</Chip>)}
              </div>
            </div>
          )}

          {products.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1.5 flex items-center justify-between">
                <span>Affected Products ({products.length})</span>
                {moreCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllProducts((v) => !v)}
                    className="text-[10px] text-blue-400 hover:text-blue-300"
                  >
                    {showAllProducts ? 'show less' : `show ${moreCount} more`}
                  </button>
                )}
              </div>
              <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {visibleProducts.map((p, i) => (
                  <li
                    key={`${p}-${i}`}
                    className="text-[10px] font-mono text-[#BBB] bg-[#0D0D0D] border border-[#262626] rounded px-2 py-1 break-all"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cve.references.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1.5">
                References ({cve.references.length})
              </div>
              <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {cve.references.map((url, i) => (
                  <li key={`${url}-${i}`} className="flex items-start gap-1.5">
                    <ExternalLink className="w-3 h-3 mt-0.5 text-[#666] shrink-0" />
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline break-all"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* personal editable fields */}
          <div className="border-t border-[#262626] pt-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                Personal annotations
              </div>
              {savedFlash && (
                <span className="inline-flex items-center gap-1 text-[10px] text-green-400">
                  <Check className="w-3 h-3" /> saved
                </span>
              )}
            </div>

            <Field label="Personal Notes (saved on blur)">
              <textarea
                className={taCls}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => void persist()}
                placeholder="Your private notes about this CVE. Markdown is not parsed."
                spellCheck={false}
              />
            </Field>

            <Field
              label="Tags (comma-separated)"
              hint="Parsed on save into an array. Empty tags are dropped. Duplicates are removed."
            >
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  value={tagsStr}
                  onChange={(e) => setTagsStr(e.target.value)}
                  onBlur={() => void persist()}
                  placeholder="exploited, wormable, prioritized"
                  spellCheck={false}
                />
                <CopyBtn text={tagsStr} label="Copy tags" />
              </div>
            </Field>

            <Field label="Personal Assessment (saved on blur)">
              <textarea
                className={taCls}
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                onBlur={() => void persist()}
                placeholder="Your own impact assessment — affected systems, urgency, remediation plan…"
                spellCheck={false}
              />
            </Field>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                type="button"
                onClick={() => void persist()}
                className={`${btnPrimary} inline-flex items-center gap-1.5`}
              >
                <Save className="w-3 h-3" /> Save annotations
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onSearchAgain(cve.id)}
                className={`${btnGhost} inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Re-search this CVE online to refresh the snapshot"
              >
                <RefreshCw className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`} /> Re-search online
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------- main exported component ---------- */
export const CveSearchTool: React.FC = () => {
  const online = useIsOnline();
  const [cveId, setCveId] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<CveSearchResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandedCveId, setExpandedCveId] = useState<string | null>(null);
  // Monotonic sequence guard: only the LATEST search may write state. Without
  // this, a slow in-flight response could overwrite the result of a newer
  // "Re-search online" click (stale-response race).
  const searchSeqRef = useRef(0);

  // Live list of saved CVEs — newest-first by savedAt.
  const savedCves: SavedCve[] = useLiveQuery(
    () => db.savedCves.orderBy('savedAt').reverse().toArray(),
    [],
    [] as SavedCve[],
  ) ?? [];

  const savedCveIds = useMemo(() => new Set(savedCves.map((c) => c.id)), [savedCves]);

  /** Core search — takes an explicit id so it can be triggered from the
   *  inline editor (Re-search) without depending on `cveId` state. */
  const runSearch = async (rawId: string): Promise<void> => {
    const id = rawId.trim();
    if (!id) {
      setResult({ ok: false, error: 'Enter a CVE ID first.' });
      return;
    }
    const seq = ++searchSeqRef.current;
    setSearching(true);
    setSaveError(null);
    try {
      const res = await searchCveOnline(id);
      if (seq !== searchSeqRef.current) return; // stale response — a newer search took over
      setResult(res);
    } catch (e) {
      if (seq !== searchSeqRef.current) return;
      console.warn('searchCveOnline failed:', e);
      setResult({ ok: false, error: 'Provider request failed.' });
    } finally {
      // Only the newest search may clear the spinner — an older one must
      // leave it on because the newer request is still in flight.
      if (seq === searchSeqRef.current) setSearching(false);
    }
  };

  const currentCve: CveSnapshot | null =
    result?.ok && result.cve ? result.cve : null;
  const currentIsSaved = currentCve ? savedCveIds.has(currentCve.id) : false;

  const handleSave = async (): Promise<void> => {
    if (!currentCve) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveCveLocal(currentCve);
    } catch (e) {
      console.warn('saveCveLocal failed:', e);
      setSaveError('Failed to save — try again.');
    } finally {
      setSaving(false);
    }
  };

  /** Non-destructive refresh: write the current search snapshot to the saved
   *  row while preserving personal notes / tags / assessment. Uses direct
   *  `db.savedCves.put` (wrapped in try/catch) because the architecture's
   *  `saveCveLocal` would wipe the personal fields on overwrite. */
  const handleUpdate = async (): Promise<void> => {
    if (!currentCve) return;
    setSaving(true);
    setSaveError(null);
    try {
      const existing = await db.savedCves.get(currentCve.id);
      const merged: SavedCve = {
        id: currentCve.id,
        description: currentCve.description,
        cvss: currentCve.cvss,
        severity: currentCve.severity,
        cwe: currentCve.cwe,
        affectedProducts: currentCve.affectedProducts,
        published: currentCve.published,
        modified: currentCve.modified,
        references: currentCve.references,
        personalNotes: existing?.personalNotes ?? '',
        tags: existing?.tags ?? [],
        personalAssessment: existing?.personalAssessment ?? '',
        savedAt: existing?.savedAt ?? new Date().toISOString(),
      };
      await db.savedCves.put(merged);
    } catch (e) {
      console.warn('snapshot refresh failed:', e);
      setSaveError('Failed to refresh snapshot — try again.');
    } finally {
      setSaving(false);
    }
  };

  /** Expand the saved row for the given id and scroll it into view. */
  const handleOpenSaved = (id: string): void => {
    setExpandedCveId(id);
    window.setTimeout(() => {
      document
        .getElementById(`saved-cve-${id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-blue-400" />
          CVE Search —{' '}
          <span className="text-[#888] font-normal">
            NVD (National Vulnerability Database)
          </span>
        </h3>
        <p className="text-[11px] text-[#888] leading-relaxed">
          Look up a CVE by ID against the public NVD 2.0 API. Save a snapshot
          to your offline Vault and add personal notes, tags and an impact
          assessment.
        </p>
      </div>

      {/* Search row */}
      <Field label="CVE ID">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`${inputCls} flex-1 min-w-[180px]`}
            value={cveId}
            onChange={(e) => setCveId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && online && !searching) {
                e.preventDefault();
                void runSearch(cveId);
              }
            }}
            placeholder="CVE-2025-12345"
            spellCheck={false}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => void runSearch(cveId)}
            disabled={!online || searching}
            className={`${btnPrimary} inline-flex items-center gap-1.5`}
          >
            {searching
              ? <RefreshCw className="w-3 h-3 animate-spin" />
              : <Search className="w-3 h-3" />}
            {searching ? 'Searching…' : 'Search Online'}
          </button>
          <span
            className={`inline-flex items-center gap-1 text-[11px] ${online ? 'text-green-400' : 'text-red-400'}`}
            title="Browser connectivity state — no network probe"
          >
            {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {online ? 'Online' : 'Offline — search disabled'}
          </span>
        </div>
      </Field>

      {/* Search result */}
      {searching && <Spinner label="Querying NVD 2.0 API…" />}
      {!searching && result && !result.ok && result.error && (
        <ErrorBanner message={result.error} />
      )}
      {!searching && currentCve && (
        <ResultCard
          cve={currentCve}
          isSaved={currentIsSaved}
          saving={saving}
          saveError={saveError}
          onSave={() => void handleSave()}
          onUpdate={() => void handleUpdate()}
          onOpenSaved={() => currentCve && handleOpenSaved(currentCve.id)}
        />
      )}

      {/* Saved CVEs section — always visible, live-query on db.savedCves */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            Saved CVEs ({savedCves.length})
          </h4>
        </div>

        {savedCves.length === 0 ? (
          <p className="text-[11px] text-[#555] leading-relaxed px-1">
            No saved CVEs yet.
          </p>
        ) : (
          <div className="space-y-2">
            {savedCves.map((c) => {
              const isOpen = expandedCveId === c.id;
              return (
                <div key={c.id} id={`saved-cve-${c.id}`}>
                  <SavedCveRow
                    // Remount on expand/collapse so the inline editor's local
                    // state (notes/tags/assessment) re-seeds from the saved
                    // snapshot — no useEffect-with-setState needed.
                    key={`${c.id}-${isOpen ? 'open' : 'closed'}`}
                    cve={c}
                    expanded={isOpen}
                    onToggle={() =>
                      setExpandedCveId((cur) => (cur === c.id ? null : c.id))
                    }
                    onSearchAgain={(id) => {
                      setCveId(id);
                      setExpandedCveId(null);
                      void runSearch(id);
                    }}
                    busy={searching}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom note — spec #29 */}
      <InfoBanner>
        CVE search uses the public NVD API (no API key required, supports
        CORS). Saved CVEs are available offline forever. Re-search to refresh
        the snapshot.
      </InfoBanner>
    </div>
  );
};

export default CveSearchTool;
