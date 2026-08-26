import React, { useState, useEffect, useRef } from 'react';
import { Zap, X, Check } from 'lucide-react';
import { db } from '../db';
import type { InboxItem } from '../db';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Quick Capture modal (BLOQUE 5 spec #16).
 * Tiny overlay triggered by Ctrl+Shift+Q — a single textarea + Save to Inbox.
 * 100% offline: writes only to the local Dexie `inboxItems` table.
 * Visual style mirrors GlobalSearchModal (dark #0A0A0A bg, blue accent).
 *
 * Implementation note: the outer wrapper returns null when closed so the
 * inner content (and its local useState) always mounts fresh on every
 * open — no need to clear text via setState-in-effect.
 */
export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <QuickCaptureContent onClose={props.onClose} />;
};

const QuickCaptureContent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [text, setText] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Autofocus on mount (deferred one tick so the modal is painted first)
  useEffect(() => {
    const t = window.setTimeout(() => textareaRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, []);

  // ESC to close (mounted only when open, so safe to bind window keydown)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      onClose();
      return;
    }
    const now = new Date().toISOString();
    const item: InboxItem = {
      id: crypto.randomUUID(),
      content: trimmed,
      createdAt: now,
      convertedTo: null,
      convertedAt: null,
      isTask: false,
    };
    try {
      await db.inboxItems.add(item);
    } catch (e) {
      console.warn('QuickCapture: failed to save inbox item:', e);
    }
    setJustSaved(true);
    setText('');
    // Show the green confirmation briefly before closing
    window.setTimeout(() => {
      setJustSaved(false);
      onClose();
    }, 700);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd+Enter saves immediately
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      void handleSave();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-100">
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-3.5 border-b border-[#262626] flex items-center justify-between bg-[#0D0D0D]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded flex items-center justify-center bg-blue-500/10 text-blue-400">
              <Zap className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white">Captura Rápida → Inbox</span>
              <span className="text-[10px] text-[#666] font-mono">Ctrl+Shift+Q</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded border border-[#262626] bg-[#161616] font-mono text-[10px] text-[#888]">
              ESC
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-[#888] hover:text-white p-1 cursor-pointer"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Textarea body */}
        <div className="p-3.5">
          <textarea
            ref={textareaRef}
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Idea, comando, observación, pendiente... aterriza en el Inbox. La organizas luego."
            className="w-full bg-[#161616] border border-[#262626] rounded-md p-3 text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-blue-500 transition-colors resize-y min-h-[88px]"
          />
          <p className="text-[10px] text-[#666] mt-1.5 font-mono">
            Ctrl+Enter para guardar · Escape para cerrar
          </p>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#262626] flex items-center justify-between bg-[#0D0D0D]">
          <span className="text-[10px] text-[#555] font-mono">
            {text.length} chars
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs font-semibold text-[#888] hover:text-white hover:bg-[#161616] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={justSaved || !text.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {justSaved ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Guardado
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  Guardar en Inbox
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
