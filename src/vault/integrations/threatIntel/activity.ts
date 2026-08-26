/**
 * threatIntel/activity.ts — Local "Online Activity" log.
 *
 * Spec #24: optionally show an "Online Activity" view that lists, per
 *  enrichment request: Provider / IOC type / Timestamp / Status.
 *
 * CRITICAL: per spec, we do NOT store the full IOC value if doing so could
 *  expose sensitive information. We store ONLY the IOC TYPE (e.g. "IPv4",
 *  "Domain", "Hash") — never the actual IP / domain / hash. This keeps the
 *  activity log useful for "when did I last query VirusTotal?" without
 *  leaking the investigated indicators themselves.
 *
 * Lives in the main `VaultLocalDB` so it IS exported by the backup (it's just
 *  metadata — no sensitive IOC values, no API keys).
 */
import { db, type OnlineActivityRow } from '../../db';
import type { ProviderId, EnrichableIocType } from './types';

/** Re-export the activity row type. */
export type { OnlineActivityRow };

/** Log an enrichment attempt. Called by the Enrich flow after each provider
 *  returns (success, error, cached, not_configured, or offline).
 *
 *  Per spec #10: transport errors (offline / not_configured) are NOT logged
 *  because they didn't actually consume API quota. We DO log cached hits so
 *  the user has a record of when they re-viewed a result. */
export async function logActivity(
  provider: ProviderId,
  iocType: EnrichableIocType,
  status: OnlineActivityRow['status'],
  note?: string,
): Promise<void> {
  try {
    await db.onlineActivity.add({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      provider,
      iocType,
      timestamp: new Date().toISOString(),
      status,
      note: note ? note.slice(0, 80) : undefined,
    });
    // Keep the log bounded — keep only the most recent 500 entries.
    const total = await db.onlineActivity.count();
    if (total > 500) {
      const oldest = await db.onlineActivity.orderBy('timestamp').limit(total - 500).toArray();
      await db.onlineActivity.bulkDelete(oldest.map((r) => r.id));
    }
  } catch {
    /* logging failures must never break enrichment */
  }
}

/** Clear all online activity. Called from the Data & Intelligence view. */
export async function clearOnlineActivity(): Promise<number> {
  try {
    const n = await db.onlineActivity.count();
    await db.onlineActivity.clear();
    return n;
  } catch { return 0; }
}

/** Count rows — for display in Settings / Sync Center. */
export async function countOnlineActivity(): Promise<number> {
  try { return await db.onlineActivity.count(); } catch { return 0; }
}
