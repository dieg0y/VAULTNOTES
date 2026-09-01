/**
 * useDebouncedAutoSave — the shared debounced-autosave machinery used by
 * RichEditor (notes) and PartRichEditor (labs).
 *
 * Owns everything the two editors used to duplicate (~90 lines each):
 *  - the `saveStatus` state ('saved' | 'saving' | 'unsaved');
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
 * Status transitions replicate the original editors exactly:
 * trigger → 'unsaved'; flush start → 'saving'; flush success → 'saved'
 * (a rejected flush leaves 'saving', exactly like before).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

type SaveStatus = 'saved' | 'saving' | 'unsaved';

export function useDebouncedAutoSave(
  flushFn: () => Promise<void>,
  delayMs = 1500,
): { saveStatus: SaveStatus; triggerAutoSave: () => void } {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Latest-callback ref pattern (canonical way to expose a stable timer
  // callback that sees the LATEST closure; the lint rule has a known false
  // positive on this exact pattern — see
  // https://github.com/facebook/react/issues/31194).
  const flushSaveRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    flushSaveRef.current = async () => {
      setSaveStatus('saving');
      await flushFn();
      setSaveStatus('saved');
    };
  }, [flushFn]);

  const triggerAutoSave = useCallback(() => {
    setSaveStatus('unsaved');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void flushSaveRef.current?.();
    }, delayMs);
  }, [delayMs]);

  // Flush the pending autosave when the timer is still armed:
  //  - on `pagehide` (reload / tab close / navigate away) — otherwise the
  //    debounce timer is cancelled by the unload and the user's last edit
  //    (< delayMs before reload) is silently dropped;
  //  - on React unmount (note/lab switch / view change) — the same flush via
  //    the effect cleanup covers SPA navigation.
  useEffect(() => {
    const flushNow = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        void flushSaveRef.current?.();
      }
    };
    window.addEventListener('pagehide', flushNow);
    return () => {
      window.removeEventListener('pagehide', flushNow);
      flushNow();
    };
  }, []);

  return { saveStatus, triggerAutoSave };
}
