import React from 'react';

interface PanelResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onReset: () => void;
}

/**
 * Thin vertical drag handle used to resize adjacent column panels.
 * Drag to resize · double click to restore the default width.
 * FIX-3d — hidden below md (mobile stacks panels full-width; the hook also
 * ignores drags there), unchanged on desktop.
 */
export const PanelResizeHandle: React.FC<PanelResizeHandleProps> = ({ onMouseDown, onReset }) => (
  <div
    onMouseDown={onMouseDown}
    onDoubleClick={onReset}
    className="hidden md:block w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-blue-500/60 active:bg-blue-500 transition-colors relative z-30"
    title="Arrastra para redimensionar · Doble clic para restablecer"
    role="separator"
    aria-orientation="vertical"
  >
    {/* Wider invisible hit area for easier grabbing */}
    <div className="absolute inset-y-0 -left-1 -right-1" />
  </div>
);
