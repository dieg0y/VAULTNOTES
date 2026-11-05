/**
 * useDebouncedAutoSave — the shared debounce and flush logic for notes,
 * labs, and professional profiles.
 *
 * Owns everything the two editors used to duplicate (~90 lines each):
 *  - the `saveStatus` state ('saved' | 'saving' | 'unsaved' | 'error');
 *  - the 1500ms debounce timer (`triggerAutoSave` resets it on every edit);
 *  - the latest-callback ref pattern so the timer always invokes the LATEST
 *    `flushFn` closure (the caller reads its current field values from a
 *    ref inside `flushFn` — see the editors' `latestFieldsRef`);
 *  - the `pagehide` flush (reload / tab close: an IDB write kicked off
 *    synchronously inside pagehide commits before the page dies);
 *  - the React-unmount flush (SPA note/lab switch inside the debounce
 *    window must not drop the last edits).
 *
 * AUTOSAVE DATA-INTEGRITY (Task 2-c, spec #33): the timer NEVER captures
 * field values — it only calls `flushSaveRef.current`, and the caller's
 * `flushFn` reads live state from its own refs. The old closure-capture bug
 * (timer firing with one-keystroke-old state) is structurally impossible
 * with this shape.
 *
 * A failed flush leaves an explicit error state instead of an unhandled
 * rejection or a permanent "saving" indicator. A new edit retries normally.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export function useDebouncedAutoSave(
  flushFn: () => Promise<void>,
  delayMs = 1500,
): { saveStatus: SaveStatus; triggerAutoSave: () => void } {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushInFlightRef = useRef<Promise<void> | null>(null);
  const flushRequestedRef = useRef(false);
  const hasPendingChangesRef = useRef(false);

  // Latest-callback ref pattern (canonical way to expose a stable timer
  // callback that sees the LATEST closure; the lint rule has a known false
  // positive on this exact pattern — see
  // https://github.com/facebook/react/issues/31194).
  const flushSaveRef = useRef(flushFn);
  useEffect(() => {
    flushSaveRef.current = flushFn;
  }, [flushFn]);

  const flushNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (flushInFlightRef.current) {
      flushRequestedRef.current = true;
      await flushInFlightRef.current;
      return;
    }

    const operation = async () => {
      let failed = false;
      do {
        flushRequestedRef.current = false;
        hasPendingChangesRef.current = false;
        setSaveStatus('saving');
        try {
          await flushSaveRef.current();
        } catch (error) {
          console.error('[autosave] No se pudieron guardar los cambios.', error);
          hasPendingChangesRef.current = true;
          failed = true;
          break;
        }
      } while (flushRequestedRef.current);

      setSaveStatus(failed ? 'error' : hasPendingChangesRef.current ? 'unsaved' : 'saved');
    };

    const pending = operation();
    flushInFlightRef.current = pending;
    try {
      await pending;
    } finally {
      if (flushInFlightRef.current === pending) flushInFlightRef.current = null;
    }
  }, []);

  const triggerAutoSave = useCallback(() => {
    hasPendingChangesRef.current = true;
    setSaveStatus('unsaved');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flushNow();
    }, delayMs);
  }, [delayMs, flushNow]);

  // Flush the pending autosave when the timer is still armed:
  //  - on `pagehide` (reload / tab close / navigate away) — otherwise the
  //    debounce timer is cancelled by the unload and the user's last edit
  //    (< delayMs before reload) is silently dropped;
  //  - on React unmount (note/lab switch / view change) — the same flush via
  //    the effect cleanup covers SPA navigation.
  useEffect(() => {
    const flushPending = () => {
      if (timerRef.current) void flushNow();
    };
    window.addEventListener('pagehide', flushPending);
    return () => {
      window.removeEventListener('pagehide', flushPending);
      if (timerRef.current) void flushNow();
    };
  }, [flushNow]);

  return { saveStatus, triggerAutoSave };
}
