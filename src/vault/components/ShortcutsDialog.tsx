import React, { useEffect, useRef } from 'react';
import { X, Keyboard, Search, PenLine, Layers, Wrench } from 'lucide-react';

interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  id: string;
  title: string;
  icon: React.ReactNode;
  rows: Array<{ keys: string[]; action: string }>;
}

/* Atajos VERIFICADOS contra el registro real (App.tsx keydown + editores):
 * K sin shift, resto Ctrl+Shift+<letra>; deshabilitados al escribir salvo K. */
const GROUPS: ShortcutGroup[] = [
  {
    id: 'global',
    title: 'Global',
    icon: <Keyboard className="w-3.5 h-3.5 text-blue-400" />,
    rows: [
      { keys: ['Ctrl', 'K'], action: 'Búsqueda global (funciona incluso dentro de un input)' },
      { keys: ['Ctrl', 'Shift', 'Q'], action: 'Captura rápida → Inbox' },
      { keys: ['Ctrl', 'Shift', 'N'], action: 'Nuevo apunte' },
      { keys: ['Ctrl', 'Shift', 'L'], action: 'Nuevo lab' },
    ],
  },
  {
    id: 'tools',
    title: 'Herramientas (abrir directo)',
    icon: <Wrench className="w-3.5 h-3.5 text-amber-400" />,
    rows: [
      { keys: ['Ctrl', 'Shift', 'I'], action: 'IoC Extractor' },
      { keys: ['Ctrl', 'Shift', 'T'], action: 'Timestamp Converter' },
      { keys: ['Ctrl', 'Shift', 'H'], action: 'Hash Toolkit' },
      { keys: ['Ctrl', 'Shift', 'R'], action: 'Regex Tester' },
      { keys: ['Ctrl', 'Shift', 'M'], action: 'MITRE ATT&CK' },
    ],
  },
  {
    id: 'flashcards',
    title: 'Flashcards (modo estudio)',
    icon: <Layers className="w-3.5 h-3.5 text-emerald-400" />,
    rows: [
      { keys: ['Espacio'], action: 'Voltear la tarjeta' },
      { keys: ['1'], action: 'Calificar: Difícil (la verás antes)' },
      { keys: ['2'], action: 'Calificar: Bueno (siguiente repaso en unos días)' },
      { keys: ['3'], action: 'Calificar: Fácil (se espacia más)' },
      { keys: ['← / →'], action: 'Tarjeta anterior / siguiente' },
      { keys: ['Esc'], action: 'Salir del modo estudio' },
    ],
  },
  {
    id: 'editor',
    title: 'Editor de apuntes',
    icon: <PenLine className="w-3.5 h-3.5 text-cyan-400" />,
    rows: [
      { keys: ['Ctrl', 'V'], action: 'Pegar imágenes o páginas web: las imágenes se guardan local al instante' },
      { keys: ['Autoguardado'], action: 'No hay atajo que pulsar: cada cambio se guarda solo (badge Editado → Guardado)' },
    ],
  },
];

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded border border-[#262626] bg-[#161616] text-[#E5E5E5] whitespace-nowrap">
    {children}
  </kbd>
);

/**
 * ShortcutsDialog — referencia rápida de TODOS los atajos de la app.
 * Operativa de discoverability (V17.1): antes los atajos solo existían en el
 * README; ahora Ctrl+K → "Ver atajos de teclado" los enseña dentro de la app.
 * Esc cierra, el foco arranca en el botón Cerrar y vuelve a él al cerrarse.
 */
export const ShortcutsDialog: React.FC<ShortcutsDialogProps> = ({ open, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Atajos de teclado de VaultNotes"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#0D0D0D] border border-[#262626] rounded-lg shadow-xl animate-in fade-in duration-150"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#262626] shrink-0">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-blue-400" />
            Atajos de teclado
          </h2>
          <button
            ref={closeRef}
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#161616] hover:bg-[#202020] text-[#888] hover:text-white rounded border border-[#262626] text-xs font-medium transition-colors cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            Cerrar
          </button>
        </div>

        <div className="overflow-y-auto p-5 grid gap-5 sm:grid-cols-2 scrollbar-thin scrollbar-thumb-[#262626]">
          {GROUPS.map((g) => (
            <section key={g.id} aria-label={g.title}>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#828282] flex items-center gap-1.5 mb-2">
                {g.icon}
                {g.title}
              </h3>
              <ul className="space-y-1.5">
                {g.rows.map((r) => (
                  <li
                    key={r.action}
                    className="flex items-start justify-between gap-3 text-xs text-[#BBB] bg-[#0A0A0A] border border-[#1d1d1d] rounded px-2.5 py-1.5"
                  >
                    <span className="min-w-0 leading-snug">{r.action}</span>
                    <span className="flex items-center gap-1 shrink-0 pt-px">
                      {r.keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {/* Sintaxis de búsqueda — otra pieza antes invisible sin README */}
          <section aria-label="Sintaxis de búsqueda" className="sm:col-span-2">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#828282] flex items-center gap-1.5 mb-2">
              <Search className="w-3.5 h-3.5 text-blue-400" />
              Búsqueda (Ctrl+K) — filtros de texto
            </h3>
            <ul className="space-y-1.5">
              {[
                { f: 'type:note', d: 'solo apuntes — también lab, glosario, referencia, herramienta, runbook, comando…' },
                { f: 'tag:soc', d: 'por etiqueta (labs y referencias)' },
                { f: 'platform:okta', d: 'por plataforma' },
              ].map((r) => (
                <li
                  key={r.f}
                  className="flex items-start justify-between gap-3 text-xs text-[#BBB] bg-[#0A0A0A] border border-[#1d1d1d] rounded px-2.5 py-1.5"
                >
                  <span className="min-w-0 leading-snug">{r.d}</span>
                  <span className="shrink-0 pt-px">
                    <Kbd>{r.f}</Kbd>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};
