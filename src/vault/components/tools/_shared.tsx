/**
 * _shared.tsx — Shared UI helpers for the new tool components.
 *
 * These mirror the styles already used inside ToolsView.tsx (so the new
 * tools look identical to the existing 8) but live in their own module so
 * the 6 new tool files don't have to reach into ToolsView's internals.
 *
 * IMPORTANT: 100% offline. No fetch, no APIs, no telemetry.
 */
import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/* ---------- shared Tailwind class strings ---------- */
export const inputCls =
  'w-full bg-[#161616] border border-[#262626] rounded px-3 py-2 text-xs text-white font-mono placeholder:text-[#555] focus:outline-none focus:border-blue-500';

export const taCls = inputCls + ' resize-y min-h-[80px] font-mono';

export const btnPrimary =
  'px-3 py-1.5 rounded text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export const btnGhost =
  'px-3 py-1.5 rounded text-xs font-semibold bg-[#161616] hover:bg-[#222] border border-[#262626] text-[#DDD] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export const btnDanger =
  'px-3 py-1.5 rounded text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

/* ---------- CopyBtn: copies text to clipboard, shows a green check for 1.5s ---------- */
export const CopyBtn: React.FC<{ text: string; label?: string }> = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        if (!text) return;
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="p-1 rounded text-[#666] hover:text-blue-400 hover:bg-[#161616] transition-colors shrink-0 inline-flex items-center gap-1"
      title={label || 'Copiar'}
      disabled={!text}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

/* ---------- Field: label + control wrapper ---------- */
export const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold uppercase tracking-widest text-[#555]">{label}</label>
    {children}
    {hint && <p className="text-[10px] text-[#666]">{hint}</p>}
  </div>
);

/* ---------- Row: simple key/value row for results ---------- */
export const Row: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex items-start justify-between gap-3 py-1">
    <span className="text-[11px] text-[#888] uppercase tracking-wider shrink-0">{label}</span>
    <span className={`text-[11px] text-white text-right break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
  </div>
);

/* ---------- CodeBlock: code with copy button ---------- */
export const CodeBlock: React.FC<{ code: string; lang?: string; label?: string }> = ({ code, lang, label }) => (
  <div className="bg-[#0A0A0A] border border-[#262626] rounded p-2.5 font-mono text-[10px] text-green-300 break-all flex items-start justify-between gap-2">
    <div className="flex-1 min-w-0">
      {label && <div className="text-[9px] text-[#666] uppercase mb-1">{label}</div>}
      <pre className="whitespace-pre-wrap break-all">{code}</pre>
    </div>
    <div className="flex items-center gap-1 shrink-0">
      {lang && <span className="text-[9px] text-[#444] uppercase">{lang}</span>}
      <CopyBtn text={code} />
    </div>
  </div>
);

/* ---------- ErrorBanner: friendly error message (no stack traces) ---------- */
export const ErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <div className="px-3 py-2 rounded border border-red-500/40 bg-red-500/10 text-red-400 text-[11px] font-medium">
    {message}
  </div>
);

/* ---------- InfoBanner: informational note ---------- */
export const InfoBanner: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-3 py-2 rounded border border-blue-500/30 bg-blue-500/5 text-blue-300 text-[11px] leading-relaxed">
    {children}
  </div>
);

/* ---------- Tabs: minimal pill-tab switcher for multi-mode tools ---------- */
export const Tabs: React.FC<{
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  active: string;
  onChange: (id: string) => void;
}> = ({ tabs, active, onChange }) => (
  <div className="flex gap-1 p-1 bg-[#0D0D0D] border border-[#262626] rounded w-fit">
    {tabs.map((t) => (
      <button
        key={t.id}
        type="button"
        onClick={() => onChange(t.id)}
        className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
          active === t.id ? 'bg-blue-500 text-white' : 'text-[#888] hover:text-white hover:bg-[#161616]'
        }`}
      >
        {t.icon}
        {t.label}
      </button>
    ))}
  </div>
);

/* ---------- safeCopy: get safe string fallback for null/undefined ---------- */
export function safeStr(v: unknown, fallback = ''): string {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

/* ---------- Cross-tool navigation helper (BLOQUE 5) ------------------
 * Single source of truth for "jump to tool X with optional entryId".
 * Wraps the existing `usePendingToolStore` so all tools use the same
 * mechanism. 100% offline — no router, no fetch, no telemetry.
 */
import { usePendingToolStore } from '../../store/pendingToolStore';
import { db } from '../../db';

export function goToTool(toolId: string, entryId?: string | number): void {
  usePendingToolStore.getState().setPending({ toolId, entryId });
}

/**
 * Record that a tool was used — light metadata only (toolId + timestamp).
 * NO content, NO inputs, NO analysis results. Capped at 30 entries
 * (oldest evicted). Safe to call from any tool's activation.
 */
export async function recordToolUse(toolId: string): Promise<void> {
  try {
    const now = new Date().toISOString();
    await db.toolRecents.put({ toolId, lastUsedAt: now });
    // Cap recents at 30 — evict the oldest beyond that.
    const all = await db.toolRecents.orderBy('lastUsedAt').reverse().toArray();
    if (all.length > 30) {
      const toEvict = all.slice(30).map((r) => r.toolId);
      await db.toolRecents.bulkDelete(toEvict);
    }
  } catch (e) {
    console.warn('recordToolUse failed (non-fatal):', e);
  }
}

/**
 * Toggle a tool's favorite flag (add if absent, remove if present).
 */
export async function toggleToolFavorite(toolId: string): Promise<boolean> {
  try {
    const existing = await db.toolFavorites.get(toolId);
    if (existing) {
      await db.toolFavorites.delete(toolId);
      return false;
    }
    await db.toolFavorites.add({ toolId, addedAt: new Date().toISOString() });
    return true;
  } catch (e) {
    console.warn('toggleToolFavorite failed (non-fatal):', e);
    return false;
  }
}

/**
 * Convenience: get a sorted list of favorite toolIds (oldest first →
 * caller can reverse for display).  Returns string[] only.
 */
export async function getFavoriteToolIds(): Promise<string[]> {
  try {
    const favs = await db.toolFavorites.orderBy('addedAt').toArray();
    return favs.map((f) => f.toolId);
  } catch {
    return [];
  }
}

/**
 * Convenience: get recent toolIds sorted newest-first.
 */
export async function getRecentToolIds(): Promise<string[]> {
  try {
    const recs = await db.toolRecents.orderBy('lastUsedAt').reverse().toArray();
    return recs.map((r) => r.toolId);
  } catch {
    return [];
  }
}

/**
 * Add a note/lab/glossary item to the Review Later queue (BLOQUE 5 spec #15).
 * Creates a new ReviewItem with status='pending' and nextReviewAt = now + 2 days.
 * Returns true on success, false on failure (non-fatal — caller can ignore).
 * 100% offline: writes only to the local Dexie `reviewItems` table.
 */
export async function addToReviewQueue(
  itemType: 'note' | 'glossary' | 'lab',
  itemId: string
): Promise<boolean> {
  try {
    // Avoid duplicates: if there's already a pending review for this item, skip.
    const existing = await db.reviewItems
      .where('itemId')
      .equals(itemId)
      .and((r) => r.status === 'pending')
      .first();
    if (existing) return true;

    const now = new Date();
    const next = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // +2 days
    await db.reviewItems.add({
      id: crypto.randomUUID(),
      itemType,
      itemId,
      addedAt: now.toISOString(),
      status: 'pending',
      nextReviewAt: next.toISOString(),
    });
    return true;
  } catch (e) {
    console.warn('addToReviewQueue failed (non-fatal):', e);
    return false;
  }
}
