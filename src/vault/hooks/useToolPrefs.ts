/**
 * useToolPrefs — live-query hooks for tool favorites & recents (BLOQUE 5).
 *
 * Backed by Dexie `toolFavorites` and `toolRecents` tables (same DB as the
 * rest of VaultNotes). Re-renders automatically when other tabs/tools
 * modify the tables. 100% offline — no fetch, no telemetry.
 *
 * Only metadata is stored: toolId + timestamps. NO user content, NO tool
 * inputs/outputs, NO analysis results. See `db/index.ts` for table schemas.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { ToolFavorite, ToolRecent } from '../db';

// Single-sourced from the Dexie table schemas in `db/index.ts` (they are
// field-for-field identical — this alias keeps the hook's public API
// unchanged while removing the duplicated shape).
type FavoriteEntry = ToolFavorite;
type RecentEntry = ToolRecent;

/**
 * Live list of favorite toolIds (sorted oldest → newest so the user's first
 * favorites stay at the top of their list).
 */
export function useToolFavorites(): FavoriteEntry[] {
  return (
    useLiveQuery(
      async () => db.toolFavorites.orderBy('addedAt').toArray(),
      [],
      []
    ) ?? []
  );
}

/**
 * Live list of recently-used toolIds (sorted newest → oldest). Capped at
 * 30 entries by the writer (`recordToolUse`).
 */
export function useToolRecents(limit = 10): RecentEntry[] {
  return (
    useLiveQuery(
      async () =>
        db.toolRecents.orderBy('lastUsedAt').reverse().limit(limit).toArray(),
      [limit],
      []
    ) ?? []
  );
}
