import { useState, useCallback } from 'react';

interface ResizablePanelOptions {
  /** localStorage key to persist the width between sessions */
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
}

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
  const [width, setWidth] = useState(() => {
    try {
      const v = Number(localStorage.getItem(storageKey));
      return Number.isFinite(v) && v >= minWidth && v <= maxWidth ? v : defaultWidth;
    } catch {
      return defaultWidth;
    }
  });

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
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = width;
      const clamp = (w: number) => Math.max(minWidth, Math.min(maxWidth, w));

      const onMove = (ev: MouseEvent) => {
        setWidth(clamp(startW + (ev.clientX - startX)));
      };
      const onUp = (ev: MouseEvent) => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        persist(clamp(startW + (ev.clientX - startX)));
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [width, minWidth, maxWidth, persist]
  );

  const reset = useCallback(() => {
    setWidth(defaultWidth);
    persist(defaultWidth);
  }, [defaultWidth, persist]);

  return { width, startDrag, reset };
}
