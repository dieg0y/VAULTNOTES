/**
 * VN-F-001 / VN-F-002 fix — reusable lowercase cache for client-side search.
 *
 * Problem: the search filters lowercased EVERY note's contentHtml on EVERY
 * keystroke (NotesView search box) or on every term selection (GlossaryView
 * "notes using term"), which is O(total notes × content size) per interaction.
 *
 * Why not a WeakMap keyed by the note object: Dexie's `useLiveQuery` re-emits
 * fresh objects on every DB write, so an identity-keyed WeakMap would never
 * hit. Instead, this cache is keyed by an arbitrary caller-scoped key and
 * stores the source string each lowercase was derived from — entries whose
 * source did not change are reused, so a re-index only lowercases the rows
 * that actually changed (typically one during autosave).
 *
 * Each view creates its OWN cache instance (see `createLowerCache`) so
 * different call sites never thrash each other's keyspace. Memory is bounded
 * by the live rows (call `prune` when the row set shrinks).
 */

interface CacheEntry {
  src: string;
  lower: string;
}

export interface LowerCache {
  /** Lowercased `text`, memoized per `key` (recomputed only when text changes). */
  get(key: string, text: string): string;
  /** Drop cached entries whose key is not in `keepKeys` (bounds memory). */
  prune(keepKeys: Iterable<string>): void;
}

export function createLowerCache(): LowerCache {
  const map = new Map<string, CacheEntry>();
  return {
    get(key: string, text: string): string {
      const hit = map.get(key);
      if (hit !== undefined && hit.src === text) return hit.lower;
      const lower = text.toLowerCase();
      map.set(key, { src: text, lower });
      return lower;
    },
    prune(keepKeys: Iterable<string>): void {
      const keep = new Set(keepKeys);
      for (const key of map.keys()) {
        if (!keep.has(key)) map.delete(key);
      }
    },
  };
}
