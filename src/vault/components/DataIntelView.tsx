'use client';

/**
 * DataIntelView — Block 6, spec #23 (Sync Center) + #24 (Online Activity).
 *
 * A top-level view (sibling of SettingsView / DashboardView) mounted in App
 * when activeSection === 'data-intel'. It exposes:
 *   1. Connectivity        — online/offline state (no network probe).
 *   2. MITRE ATT&CK        — local dataset meta + Check Updates / Sync.
 *   3. Sigma               — local dataset meta + Check Updates / Sync + the
 *                            Custom Sigma Rules sub-section (list / edit /
 *                            delete / export / import .yml).
 *   4. Threat Intelligence — per-provider configured status + counts + clear
 *                            cache / activity / credentials buttons.
 *   5. Online Activity     — scrollable list of the last 100 enrichment
 *                            attempts (provider / IOC TYPE / timestamp /
 *                            status). IOC VALUE is NEVER shown (privacy spec #24).
 *
 * CONSTRAINTS (Block 6 architecture rules):
 *   - 100% offline-first. NO fetch on mount. NO fetch while idle. The only
 *     network triggers are explicit button clicks on [Check Updates] / [Sync],
 *     and those go through the integration-layer helpers (never `fetch`).
 *   - MITRE / Sigma Check/Sync are architecture stubs — they report the
 *     bundled dataset as "latest" so the UI can render honestly without a
 *     live backend. Sync only updates the local datasetMeta marker.
 *   - Sigma YAML is NEVER executed. It is treated as DATA only — validated
 *     structurally by the integration layer, then stored verbatim.
 *   - IOC values are NEVER shown in the Online Activity list — only the TYPE
 *     (IPv4 / Domain / Hash / …). See threatIntel/activity.ts.
 *   - All async DB operations are wrapped in try/catch — failures show a
 *     small inline error message, never crash the view.
 *   - The view is single-column (settings-like) but still responsive: cards
 *     use sm:grid-cols-2 / sm:grid-cols-3 grids for the meta dl rows.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Database,
  Globe,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  KeyRound,
  Activity,
  AlertTriangle,
  FileText,
  Pencil,
  X,
  CheckCircle2,
} from 'lucide-react';
import { db, type OnlineActivityRow, type CustomSigmaRule } from '../db';
import { useIsOnline } from '../integrations/online';
import {
  getLocalMitreMeta,
  checkMitreUpdates,
  syncMitre,
  type MitreLocalMeta,
  type MitreUpdateMeta,
  type MitreSyncResult,
} from '../integrations/mitre/sync';
import {
  getLocalSigmaMeta,
  checkSigmaUpdates,
  syncSigma,
  type SigmaLocalMeta,
  type SigmaUpdateMeta,
  type SigmaSyncResult,
} from '../integrations/sigma/sync';
import {
  importSigmaRule,
  updateCustomSigmaRule,
  deleteCustomSigmaRule,
} from '../integrations/sigma/validate';
import { PROVIDER_META, PROVIDER_ORDER } from '../integrations/threatIntel/registry';
import { hasCredential, clearAllCredentials } from '../integrations/threatIntel/credentials';
import { countTiCache, clearTiCache } from '../integrations/threatIntel/cache';
import { countOnlineActivity, clearOnlineActivity } from '../integrations/threatIntel/activity';
import type { ProviderId } from '../integrations/threatIntel/types';

/* ============================================================= */
/* Small display helpers                                          */
/* ============================================================= */

/** Map the stored IOC type literal to a friendly label. The actual IOC
 *  value is NEVER rendered — only this type label (spec #24). */
function iocTypeLabel(t: string): string {
  const map: Record<string, string> = {
    ipv4: 'IPv4',
    ipv6: 'IPv6',
    domain: 'Domain',
    url: 'URL',
    hash: 'Hash',
  };
  return map[t] ?? t;
}

/** Compact relative time ("just now", "5m ago", …) for activity rows. Falls
 *  back to absolute date for anything older than a week. Never throws. */
function formatRelative(iso: string): string {
  try {
    const t = new Date(iso).getTime();
    if (!isFinite(t)) return iso;
    const diff = Date.now() - t;
    if (diff < 0) return new Date(iso).toLocaleString();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/** Format an ISO timestamp or render "never" for null. */
function formatIsoOrNever(iso: string | null): string {
  if (!iso) return 'never';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/** Sigma level badge styling — defensive, lowercased to be forgiving. */
function levelBadgeCls(level: string): string {
  const l = (level || '').toLowerCase();
  if (l === 'critical') return 'bg-red-500/10 border-red-500/30 text-red-300';
  if (l === 'high') return 'bg-orange-500/10 border-orange-500/30 text-orange-300';
  if (l === 'medium') return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300';
  if (l === 'low') return 'bg-blue-500/10 border-blue-500/30 text-blue-300';
  if (l === 'informational') return 'bg-[#161616] border-[#262626] text-[#888]';
  return 'bg-[#161616] border-[#262626] text-[#888]';
}

/** Online activity status badge styling — matches spec #24 (success=green,
 *  error=red, cached=blue, not_configured=gray, offline=amber). */
function statusBadge(status: OnlineActivityRow['status']): { cls: string; label: string } {
  switch (status) {
    case 'success':
      return { cls: 'bg-green-500/10 border-green-500/30 text-green-300', label: 'success' };
    case 'error':
      return { cls: 'bg-red-500/10 border-red-500/30 text-red-300', label: 'error' };
    case 'cached':
      return { cls: 'bg-blue-500/10 border-blue-500/30 text-blue-300', label: 'cached' };
    case 'not_configured':
      return { cls: 'bg-[#161616] border-[#262626] text-[#888]', label: 'not_configured' };
    case 'offline':
      return { cls: 'bg-amber-500/10 border-amber-500/30 text-amber-300', label: 'offline' };
    default:
      return { cls: 'bg-[#161616] border-[#262626] text-[#888]', label: String(status) };
  }
}

/* ============================================================= */
/* Shared button class strings — match SettingsView / IocExtractor */
/* ============================================================= */
const BTN_PRIMARY =
  'flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_NEUTRAL =
  'flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] hover:bg-[#202020] text-[#DDD] border border-[#262626] text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_DANGER =
  'flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] hover:bg-red-500/10 hover:text-red-300 text-[#999] border border-[#262626] text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

/* ============================================================= */
/* Sigma rule Edit modal — fixed-position overlay (WhitelistModal   */
/* pattern from IocExtractorView). Textarea with YAML + [Save] /   */
/* [Cancel]. Validation errors shown inline; [Save] stays open on   */
/* validation failure, closes on success.                            */
/* ============================================================= */
const SigmaEditModal: React.FC<{
  rule: CustomSigmaRule;
  onClose: () => void;
  onSave: (id: string, yaml: string) => Promise<string[]>;
}> = ({ rule, onClose, onSave }) => {
  const [text, setText] = useState(rule.yaml);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setErrors([]);
    try {
      const errs = await onSave(rule.id, text);
      if (errs.length) setErrors(errs);
      // On success the parent closes the modal (setEditingRule(null)) — but
      // if it didn't for some reason, we still clear our saving flag.
    } catch (e) {
      setErrors(['Failed: ' + (e instanceof Error ? e.message : String(e))]);
    } finally {
      setSaving(false);
    }
  }, [rule.id, text, onSave]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0D0D0D] border border-[#262626] rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#0D0D0D] border-b border-[#262626] px-5 py-3 flex items-center justify-between">
          <div className="font-bold text-white text-sm flex items-center gap-2">
            <Pencil className="w-4 h-4 text-blue-400" /> Edit Sigma rule
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#666] hover:text-white hover:bg-[#161616] cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-xs text-[#E5E5E5] flex-1 overflow-y-auto">
          <p className="text-[11px] text-[#888] leading-relaxed">
            Editing <span className="text-white font-mono">{rule.title || rule.id}</span>. YAML is
            treated as data only — it is NEVER executed.
          </p>
          <textarea
            className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-2.5 py-2 text-[11px] text-[#DDD] font-mono placeholder:text-[#555] focus:outline-none focus:border-blue-500 min-h-[300px] resize-y"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
          />
          {errors.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/30 rounded p-2.5 space-y-1">
              <div className="text-[11px] font-bold text-red-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Validation errors
              </div>
              <ul className="text-[11px] text-red-200 list-disc pl-4 space-y-0.5">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="sticky bottom-0 bg-[#0D0D0D] border-t border-[#262626] px-5 py-3 flex gap-2 justify-end">
          <button onClick={onClose} className={BTN_NEUTRAL}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || text.trim() === ''} className={BTN_PRIMARY}>
            <CheckCircle2 className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================= */
/* Main component                                                   */
/* ============================================================= */
export const DataIntelView: React.FC = () => {
  const online = useIsOnline();

  /* ---------------- MITRE state ---------------- */
  const [mitreMeta, setMitreMeta] = useState<MitreLocalMeta | null>(null);
  const [mitreMetaError, setMitreMetaError] = useState<string | null>(null);
  const [mitreCheckMsg, setMitreCheckMsg] = useState<string | null>(null);
  const [mitreSyncMsg, setMitreSyncMsg] = useState<string | null>(null);
  const [mitreCheckBusy, setMitreCheckBusy] = useState(false);
  const [mitreSyncBusy, setMitreSyncBusy] = useState(false);

  const refreshMitreMeta = useCallback(async () => {
    try {
      setMitreMeta(await getLocalMitreMeta());
      setMitreMetaError(null);
    } catch (e) {
      setMitreMetaError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    refreshMitreMeta();
  }, [refreshMitreMeta]);

  const handleCheckMitre = useCallback(async () => {
    setMitreCheckBusy(true);
    setMitreCheckMsg(null);
    try {
      const r: MitreUpdateMeta = await checkMitreUpdates();
      setMitreCheckMsg(
        `Latest known version ${r.latestVersion} — ${r.entryCount} entries. You are up to date.`,
      );
    } catch (e) {
      setMitreCheckMsg('Failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setMitreCheckBusy(false);
    }
  }, []);

  const handleSyncMitre = useCallback(async () => {
    setMitreSyncBusy(true);
    setMitreSyncMsg(null);
    try {
      const r: MitreSyncResult = await syncMitre();
      setMitreSyncMsg(r.message);
      await refreshMitreMeta();
    } catch (e) {
      setMitreSyncMsg('Failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setMitreSyncBusy(false);
    }
  }, [refreshMitreMeta]);

  /* ---------------- Sigma state ---------------- */
  const [sigmaMeta, setSigmaMeta] = useState<SigmaLocalMeta | null>(null);
  const [sigmaMetaError, setSigmaMetaError] = useState<string | null>(null);
  const [sigmaCheckMsg, setSigmaCheckMsg] = useState<string | null>(null);
  const [sigmaSyncMsg, setSigmaSyncMsg] = useState<string | null>(null);
  const [sigmaCheckBusy, setSigmaCheckBusy] = useState(false);
  const [sigmaSyncBusy, setSigmaSyncBusy] = useState(false);

  const refreshSigmaMeta = useCallback(async () => {
    try {
      setSigmaMeta(await getLocalSigmaMeta());
      setSigmaMetaError(null);
    } catch (e) {
      setSigmaMetaError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    refreshSigmaMeta();
  }, [refreshSigmaMeta]);

  const handleCheckSigma = useCallback(async () => {
    setSigmaCheckBusy(true);
    setSigmaCheckMsg(null);
    try {
      const r: SigmaUpdateMeta = await checkSigmaUpdates();
      setSigmaCheckMsg(
        `Latest known version ${r.latestVersion} — ${r.ruleCount} rules. You are up to date.`,
      );
    } catch (e) {
      setSigmaCheckMsg('Failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSigmaCheckBusy(false);
    }
  }, []);

  const handleSyncSigma = useCallback(async () => {
    setSigmaSyncBusy(true);
    setSigmaSyncMsg(null);
    try {
      const r: SigmaSyncResult = await syncSigma();
      setSigmaSyncMsg(r.message);
      await refreshSigmaMeta();
    } catch (e) {
      setSigmaSyncMsg('Failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSigmaSyncBusy(false);
    }
  }, [refreshSigmaMeta]);

  /* ---------------- Custom Sigma Rules (live) ---------------- */
  const customRules: CustomSigmaRule[] =
    useLiveQuery(() => db.customSigmaRules.orderBy('importedAt').reverse().toArray(), [], []) ?? [];

  /* ---------------- Edit modal ---------------- */
  const [editingRule, setEditingRule] = useState<CustomSigmaRule | null>(null);

  // Returns the errors[] array from the integration layer. On empty errors
  // (success), closes the modal. Otherwise keeps it open with the errors.
  const handleSaveEdit = useCallback(async (id: string, yaml: string): Promise<string[]> => {
    const result = await updateCustomSigmaRule(id, yaml);
    if (result.errors.length === 0) setEditingRule(null);
    return result.errors;
  }, []);

  const handleDeleteRule = useCallback(async (r: CustomSigmaRule) => {
    if (!window.confirm(`Delete the rule "${r.title || r.id}"?`)) return;
    try {
      await deleteCustomSigmaRule(r.id);
    } catch (e) {
      window.alert('Failed to delete: ' + (e instanceof Error ? e.message : String(e)));
    }
  }, []);

  const handleExportRule = useCallback((r: CustomSigmaRule) => {
    try {
      const blob = new Blob([r.yaml || ''], { type: 'text/yaml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const slug =
        (r.title || 'sigma-rule')
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'sigma-rule';
      a.href = url;
      a.download = `${slug}.yml`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      /* non-fatal — export is best-effort */
    }
  }, []);

  /* ---------------- Import rule (.yml/.yaml file picker) ---------------- */
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[] | null>(null);
  const [importBusy, setImportBusy] = useState(false);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setImportBusy(true);
      setImportMsg(null);
      setImportErrors(null);
      try {
        const text = await f.text();
        const { id, errors } = await importSigmaRule(text);
        if (errors.length) {
          setImportErrors(errors);
        } else {
          setImportMsg(`Imported rule (id: ${id}).`);
        }
      } catch (e2) {
        setImportErrors(['Failed: ' + (e2 instanceof Error ? e2.message : String(e2))]);
      } finally {
        setImportBusy(false);
        // Reset the input so the same file can be re-picked later.
        if (fileRef.current) fileRef.current.value = '';
      }
    },
    [],
  );

  /* ---------------- Threat Intelligence: provider status ---------------- */
  const [configuredProviders, setConfiguredProviders] = useState<Record<ProviderId, boolean>>({
    virustotal: false,
    abuseipdb: false,
    otx: false,
    shodan: false,
  });

  const refreshCredentials = useCallback(async () => {
    try {
      const entries = await Promise.all(
        PROVIDER_ORDER.map(
          async (pid): Promise<[ProviderId, boolean]> => [pid, await hasCredential(pid)] as [ProviderId, boolean],
        ),
      );
      setConfiguredProviders(Object.fromEntries(entries) as Record<ProviderId, boolean>);
    } catch {
      /* non-fatal — credentials read failed silently */
    }
  }, []);
  useEffect(() => {
    refreshCredentials();
  }, [refreshCredentials]);

  /* ---------------- Threat Intelligence: counts ---------------- */
  const savedCvesCount = useLiveQuery(() => db.savedCves.count(), [], 0) ?? 0;
  const [tiCacheCount, setTiCacheCount] = useState(0);
  const [activityCount, setActivityCount] = useState(0);
  const [tiMsg, setTiMsg] = useState<string | null>(null);
  const [activityMsg, setActivityMsg] = useState<string | null>(null);

  const refreshTiCounts = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([countTiCache(), countOnlineActivity()]);
      setTiCacheCount(c);
      setActivityCount(a);
    } catch {
      /* non-fatal */
    }
  }, []);
  useEffect(() => {
    refreshTiCounts();
  }, [refreshTiCounts]);

  const handleClearTiCache = useCallback(async () => {
    if (!window.confirm('Clear all cached threat-intel results?')) return;
    try {
      const n = await clearTiCache();
      setTiMsg(`Cleared ${n} cached entr${n === 1 ? 'y' : 'ies'}.`);
      await refreshTiCounts();
    } catch (e) {
      setTiMsg('Failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }, [refreshTiCounts]);

  // Button inside the Threat Intelligence card.
  const handleClearActivityFromTi = useCallback(async () => {
    if (!window.confirm('Clear all online activity entries?')) return;
    try {
      const n = await clearOnlineActivity();
      setTiMsg(`Cleared ${n} activity entr${n === 1 ? 'y' : 'ies'}.`);
      await refreshTiCounts();
    } catch (e) {
      setTiMsg('Failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }, [refreshTiCounts]);

  // Button inside the Online Activity card (does the same clear, surfaces
  // the message in that card instead of the TI card).
  const handleClearActivityFromList = useCallback(async () => {
    if (!window.confirm('Clear all online activity entries?')) return;
    try {
      const n = await clearOnlineActivity();
      setActivityMsg(`Cleared ${n} activity entr${n === 1 ? 'y' : 'ies'}.`);
      await refreshTiCounts();
    } catch (e) {
      setActivityMsg('Failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }, [refreshTiCounts]);

  const handleClearCredentials = useCallback(async () => {
    if (
      !window.confirm(
        'Remove ALL provider API credentials? This wipes the encrypted blob AND the per-install salt — unrecoverable.',
      )
    )
      return;
    try {
      await clearAllCredentials();
      setTiMsg('All API credentials removed.');
      await refreshCredentials();
    } catch (e) {
      setTiMsg('Failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }, [refreshCredentials]);

  /* ---------------- Online Activity (live) ---------------- */
  const activityRows: OnlineActivityRow[] =
    useLiveQuery(
      () => db.onlineActivity.orderBy('timestamp').reverse().limit(100).toArray(),
      [],
      [],
    ) ?? [];

  /* ============================================================= */
  /* Render                                                          */
  /* ============================================================= */
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0A0A0A]">
      <div className="pb-4 border-b border-[#262626]">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-400" />
          Data &amp; Intelligence
        </h1>
        <p className="text-xs text-[#888] mt-0.5">
          Sync Center + Online Activity. Online features are optional — everything below also works
          locally.
        </p>
      </div>

      {/* 1. Connectivity */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
          Connectivity
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${online ? 'bg-green-400' : 'bg-amber-400'}`}
            aria-hidden
          />
          <span className="text-sm font-semibold text-white">{online ? 'Online' : 'Offline'}</span>
        </div>
        <p className="text-[11px] text-[#888] leading-relaxed">
          Online functions are optional. Everything below works locally; sync/search buttons are
          disabled when offline.
        </p>
      </div>

      {/* 2. MITRE ATT&CK */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
            MITRE ATT&amp;CK
          </span>
          <Globe className="w-4 h-4 text-blue-400" />
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
          <div className="flex justify-between">
            <dt className="text-[#888]">Local</dt>
            <dd className="text-green-300 font-mono">✓ Yes</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#888]">Version</dt>
            <dd className="text-[#DDD] font-mono">{mitreMeta?.version ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#888]">Techniques</dt>
            <dd className="text-[#DDD] font-mono">{mitreMeta?.techniquesCount ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#888]">Last Sync</dt>
            <dd className="text-[#DDD] font-mono">
              {mitreMeta ? formatIsoOrNever(mitreMeta.lastSync) : '—'}
            </dd>
          </div>
        </dl>
        {mitreMetaError && (
          <p className="text-[11px] text-red-300 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {mitreMetaError}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCheckMitre}
            disabled={!online || mitreCheckBusy}
            className={BTN_NEUTRAL}
          >
            <RefreshCw className={`w-3 h-3 ${mitreCheckBusy ? 'animate-spin' : ''}`} />
            {mitreCheckBusy ? 'Checking...' : 'Check for Updates'}
          </button>
          <button
            onClick={handleSyncMitre}
            disabled={!online || mitreSyncBusy}
            className={BTN_PRIMARY}
          >
            <Database className="w-3 h-3" />
            {mitreSyncBusy ? 'Syncing...' : 'Sync'}
          </button>
        </div>
        {mitreCheckMsg && <p className="text-[11px] text-blue-300">{mitreCheckMsg}</p>}
        {mitreSyncMsg && <p className="text-[11px] text-green-300">{mitreSyncMsg}</p>}
        <p className="text-[10px] text-[#666] leading-relaxed pt-2 border-t border-[#1a1a1a]">
          MITRE works offline. The bundled dataset is always available. Sync only updates the local
          metadata marker — live download is architecture-ready but not wired (no backend).
        </p>
      </div>

      {/* 3. Sigma */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Sigma</span>
          <FileText className="w-4 h-4 text-blue-400" />
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
          <div className="flex justify-between">
            <dt className="text-[#888]">Local</dt>
            <dd className="text-green-300 font-mono">✓ Yes</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#888]">Bundled rules</dt>
            <dd className="text-[#DDD] font-mono">{sigmaMeta?.bundledRulesCount ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#888]">Custom rules</dt>
            <dd className="text-[#DDD] font-mono">{sigmaMeta?.customRulesCount ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#888]">Total</dt>
            <dd className="text-[#DDD] font-mono">{sigmaMeta?.totalRulesCount ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#888]">Last Sync</dt>
            <dd className="text-[#DDD] font-mono">
              {sigmaMeta ? formatIsoOrNever(sigmaMeta.lastSync) : '—'}
            </dd>
          </div>
        </dl>
        {sigmaMetaError && (
          <p className="text-[11px] text-red-300 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {sigmaMetaError}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCheckSigma}
            disabled={!online || sigmaCheckBusy}
            className={BTN_NEUTRAL}
          >
            <RefreshCw className={`w-3 h-3 ${sigmaCheckBusy ? 'animate-spin' : ''}`} />
            {sigmaCheckBusy ? 'Checking...' : 'Check for Updates'}
          </button>
          <button
            onClick={handleSyncSigma}
            disabled={!online || sigmaSyncBusy}
            className={BTN_PRIMARY}
          >
            <FileText className="w-3 h-3" />
            {sigmaSyncBusy ? 'Syncing...' : 'Sync'}
          </button>
        </div>
        {sigmaCheckMsg && <p className="text-[11px] text-blue-300">{sigmaCheckMsg}</p>}
        {sigmaSyncMsg && <p className="text-[11px] text-green-300">{sigmaSyncMsg}</p>}

        {/* Custom Sigma Rules sub-section */}
        <div className="pt-3 border-t border-[#1a1a1a] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
              Custom Sigma Rules
            </span>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importBusy}
              className={BTN_PRIMARY}
            >
              <Upload className="w-3 h-3" />
              {importBusy ? 'Importing...' : 'Import rule'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".yml,.yaml"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          {importMsg && <p className="text-[11px] text-green-300">{importMsg}</p>}
          {importErrors && importErrors.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/30 rounded p-2.5 space-y-1">
              <div className="text-[11px] font-bold text-red-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Validation errors
              </div>
              <ul className="text-[11px] text-red-200 list-disc pl-4 space-y-0.5">
                {importErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          {customRules.length === 0 ? (
            <p className="text-[11px] text-[#666] italic">No custom rules yet.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-[#1a1a1a]">
              {customRules.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-[#DDD] truncate" title={r.title}>
                      {r.title || r.id}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${levelBadgeCls(
                        r.level,
                      )}`}
                    >
                      {r.level || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingRule(r)}
                      className="p-1 text-[#666] hover:text-blue-400 cursor-pointer"
                      title="Edit"
                      aria-label="Edit rule"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleExportRule(r)}
                      className="p-1 text-[#666] hover:text-green-400 cursor-pointer"
                      title="Export .yml"
                      aria-label="Export rule as yml"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(r)}
                      className="p-1 text-[#666] hover:text-red-400 cursor-pointer"
                      title="Delete"
                      aria-label="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-[10px] text-[#666] leading-relaxed">
          Sigma rules are NEVER executed. YAML is treated as data only. Manual import of .yml/.yaml
          files happens via the [Import rule] button above.
        </p>
      </div>

      {/* 4. Threat Intelligence */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
            Threat Intelligence
          </span>
          <KeyRound className="w-4 h-4 text-blue-400" />
        </div>
        <div className="space-y-1.5">
          {PROVIDER_ORDER.map((pid) => {
            const meta = PROVIDER_META[pid];
            const configured = configuredProviders[pid];
            return (
              <div key={pid} className="flex items-center justify-between gap-2 text-xs py-1">
                <span className="text-[#DDD]">{meta.label}</span>
                {configured ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/30 text-green-300">
                    Configured
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#161616] border border-[#262626] text-[#888]">
                    Not configured
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 text-[11px] pt-2 border-t border-[#1a1a1a]">
          <div className="flex justify-between">
            <dt className="text-[#888]">Saved CVEs</dt>
            <dd className="text-[#DDD] font-mono">{savedCvesCount}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#888]">Cached results</dt>
            <dd className="text-[#DDD] font-mono">{tiCacheCount}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#888]">Activity entries</dt>
            <dd className="text-[#DDD] font-mono">{activityCount}</dd>
          </div>
        </dl>
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#1a1a1a]">
          <button onClick={handleClearTiCache} className={BTN_DANGER}>
            <Trash2 className="w-3 h-3" /> Clear Threat Intelligence Cache
          </button>
          <button onClick={handleClearActivityFromTi} className={BTN_DANGER}>
            <Trash2 className="w-3 h-3" /> Clear Online Activity
          </button>
          <button onClick={handleClearCredentials} className={BTN_DANGER}>
            <KeyRound className="w-3 h-3" /> Remove all API credentials
          </button>
        </div>
        {tiMsg && <p className="text-[11px] text-blue-300">{tiMsg}</p>}
        <p className="text-[10px] text-[#666] leading-relaxed">
          API credentials are stored locally on this device (AES-GCM encrypted in a separate
          IndexedDB). They are never exported by the vault backup and never sent anywhere except
          the provider&apos;s official endpoint.
        </p>
      </div>

      {/* 5. Online Activity */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
              Online Activity
            </span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <button onClick={handleClearActivityFromList} className={BTN_DANGER}>
            <Trash2 className="w-3 h-3" /> Clear Activity
          </button>
        </div>
        {activityMsg && <p className="text-[11px] text-blue-300">{activityMsg}</p>}
        {activityRows.length === 0 ? (
          <p className="text-[11px] text-[#666] italic">No online activity yet.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto divide-y divide-[#1a1a1a]">
            {activityRows.map((row) => {
              const badge = statusBadge(row.status);
              const providerMeta = PROVIDER_META[row.provider as ProviderId];
              return (
                <div key={row.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="text-xs font-semibold text-white">
                      {providerMeta?.label ?? row.provider}
                    </span>
                    <span className="text-[10px] font-mono text-[#AAA] bg-[#161616] border border-[#262626] px-1.5 py-0.5 rounded">
                      {iocTypeLabel(row.iocType)}
                    </span>
                    <span className="text-[10px] text-[#666] font-mono">
                      {formatRelative(row.timestamp)}
                    </span>
                    {row.note && (
                      <span className="text-[10px] text-[#888] italic truncate max-w-[16rem]">
                        — {row.note}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[10px] text-[#666] leading-relaxed pt-2 border-t border-[#1a1a1a]">
          Privacy: only the IOC TYPE is shown — never the actual IP / domain / hash value.
        </p>
      </div>

      {editingRule && (
        <SigmaEditModal
          rule={editingRule}
          onClose={() => setEditingRule(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};
