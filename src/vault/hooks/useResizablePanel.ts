import { useState, useCallback, useEffect, useRef } from 'react';

interface ResizablePanelOptions {
  /** localStorage key to persist the width between sessions */
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
}

/**
 * FIX-3d — Max fraction of the viewport a side panel may occupy.
 * A width persisted on a large desktop monitor must never break a later
 * session on a smaller viewport, so the restored/live width is clamped to
 * 45% of window.innerWidth and re-clamped on window resize. Below md the
 * panels stack full-width anyway (the clamp only guards odd mid-sizes).
 */
const MAX_VIEWPORT_FRACTION = 0.45;

/**
 * Column panel with drag-to-resize, clamped to [minWidth, maxWidth],
 * persisted in localStorage. Returns the current width, a mousedown
 * handler to attach to the drag handle, and a reset function.
 */
export function useResizablePanel({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
}: ResizablePanelOptions) {
  // Base (persisted) width — restored from localStorage as-is.
  const [baseWidth, setBaseWidth] = useState(() => {
    try {
      const v = Number(localStorage.getItem(storageKey));
      return Number.isFinite(v) && v >= minWidth && v <= maxWidth ? v : defaultWidth;
    } catch {
      return defaultWidth;
    }
  });
  const dragCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => dragCleanupRef.current?.(), []);

  // Viewport clamp — starts unclamped (matches SSR/first paint) and is
  // applied + re-applied on mount and on every window resize, with cleanup.
  const [maxByViewport, setMaxByViewport] = useState<number>(Number.POSITIVE_INFINITY);
  useEffect(() => {
    const applyViewportClamp = () =>
      setMaxByViewport(window.innerWidth * MAX_VIEWPORT_FRACTION);
    applyViewportClamp();
    window.addEventListener('resize', applyViewportClamp);
    return () => window.removeEventListener('resize', applyViewportClamp);
  }, []);

  const width = Math.min(baseWidth, maxByViewport);

  const persist = useCallback(
    (w: number) => {
      try {
        localStorage.setItem(storageKey, String(w));
      } catch {
        /* storage unavailable — ignore */
      }
    },
    [storageKey]
  );

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      // Drag-to-resize is desktop-only (≥ md): below that breakpoint the
      // panels stack full-width and the handle is hidden.
      if (
        typeof window !== 'undefined' &&
        !window.matchMedia('(min-width: 768px)').matches
      ) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = width;
      const clamp = (w: number) => Math.max(minWidth, Math.min(maxWidth, w));
      dragCleanupRef.current?.();
      let currentWidth = startW;
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;

      const onMove = (ev: MouseEvent) => {
        currentWidth = clamp(startW + (ev.clientX - startX));
        setBaseWidth(currentWidth);
      };
      const cleanup = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('blur', onCancel);
        persist(currentWidth);
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        if (dragCleanupRef.current === cleanup) dragCleanupRef.current = null;
      };
      const onUp = (ev: MouseEvent) => {
        currentWidth = clamp(startW + (ev.clientX - startX));
        setBaseWidth(currentWidth);
        cleanup();
      };
      const onCancel = () => {
        cleanup();
      };

      dragCleanupRef.current = cleanup;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('blur', onCancel);
    },
    [width, minWidth, maxWidth, persist]
  );

  const reset = useCallback(() => {
    setBaseWidth(defaultWidth);
    persist(defaultWidth);
  }, [defaultWidth, persist]);

  return { width, startDrag, reset };
}
