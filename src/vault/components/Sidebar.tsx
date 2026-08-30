import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { LayoutDashboard, FileText, BookOpen, FlaskConical, Trash2, Settings, FileCode, Wrench, Bookmark, ListChecks, Inbox, Database } from 'lucide-react';
import { ActiveSection } from '../types';
import { db } from '../db';
import { useIsOnline } from '../integrations/online';

interface SidebarProps {
  activeSection: ActiveSection;
  onSelectSection: (section: ActiveSection) => void;
  notesCount: number;
  labsCount: number;
  glossaryCount: number;
  trashCount: number;
  /** Visibilidad del drawer en móvil (< md). El sidebar de escritorio (≥ md) siempre está visible. */
  open?: boolean;
  /** Cierra el drawer móvil (clic en el backdrop). */
  onClose?: () => void;
}

// PERFORMANCE (cleanup pass): App subscribes to 7 live queries — every DB
// write (e.g. each autosave flush) re-renders the whole tree. memo + stable
// callbacks (see App.tsx) let the sidebar skip re-rendering when its props
// (counts / active section) are unchanged.
const SidebarBase: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  notesCount,
  labsCount,
  glossaryCount,
  trashCount,
  open = false,
  onClose,
}) => {
  // Pending review items count (for the Revisión badge)
  const reviewCount = useLiveQuery(
    () => db.reviewItems.where('status').equals('pending').count(),
    [],
    0
  ) || 0;

  // Unconverted inbox items count (for the Inbox badge)
  const inboxCount = useLiveQuery(
    () =>
      db.inboxItems
        .filter((i) => i.convertedTo === null || i.convertedTo === undefined || i.isTask === true)
        .count(),
    [],
    0
  ) || 0;

  // Block 6 — Online-Optional: reads navigator.onLine via window online/offline
  // events. NO network probe, NO periodic fetch. Purely visual state.
  const online = useIsOnline();

  // Contenido compartido entre el sidebar de escritorio y el drawer móvil.
  const sidebarContent = (
    <>
      {/* Top branding & navigation */}
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-12 px-4 flex items-center gap-2.5 border-b border-[#262626]">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center shadow-sm">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">VAULT</span>
        </div>

        {/* Primary Navigation */}
        <nav className="p-3 flex flex-col gap-1">
          <button
            onClick={() => onSelectSection('dashboard')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer text-xs ${
              activeSection === 'dashboard'
                ? 'bg-blue-500/10 text-blue-400 font-medium'
                : 'text-[#888] hover:bg-[#161616] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </div>
          </button>

          <button
  onClick={() => onSelectSection('settings')}
  className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer text-xs ${
    activeSection === 'settings' ? 'bg-blue-500/10 text-blue-400 font-medium' : 'text-[#888] hover:bg-[#161616] hover:text-white'
  }`}
>
  <div className="flex items-center gap-2">
    <Settings className="w-4 h-4" />
    <span>Configuración</span>
  </div>
</button>

          <button
            onClick={() => onSelectSection('inbox')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer text-xs ${
              activeSection === 'inbox'
                ? 'bg-blue-500/10 text-blue-400 font-medium'
                : 'text-[#888] hover:bg-[#161616] hover:text-white'
            }`}
            title="Captura rápida y items sin organizar (Ctrl+Shift+Q)"
          >
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              <span>Inbox</span>
            </div>
            {inboxCount > 0 && (
              <span className="text-[10px] font-mono text-amber-400/90">{inboxCount}</span>
            )}
          </button>

          <button
            onClick={() => onSelectSection('notes')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer text-xs ${
              activeSection === 'notes'
                ? 'bg-blue-500/10 text-blue-400 font-medium'
                : 'text-[#888] hover:bg-[#161616] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Apuntes</span>
            </div>
            <span className="text-[10px] font-mono text-[#555]">{notesCount}</span>
          </button>

          <button
            onClick={() => onSelectSection('labs')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer text-xs ${
              activeSection === 'labs'
                ? 'bg-blue-500/10 text-blue-400 font-medium'
                : 'text-[#888] hover:bg-[#161616] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              <span>Hands-On / Labs</span>
            </div>
            <span className="text-[10px] font-mono text-[#555]">{labsCount}</span>
          </button>

          <button
            onClick={() => onSelectSection('glossary')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer text-xs ${
              activeSection === 'glossary'
                ? 'bg-blue-500/10 text-blue-400 font-medium'
                : 'text-[#888] hover:bg-[#161616] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>Glosario</span>
            </div>
            <span className="text-[10px] font-mono text-[#555]">{glossaryCount}</span>
          </button>

          <button
            onClick={() => onSelectSection('blog')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer text-xs ${
              activeSection === 'blog'
                ? 'bg-blue-500/10 text-blue-400 font-medium'
                : 'text-[#888] hover:bg-[#161616] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              <span>Generar Blog</span>
            </div>
          </button>

          <button
            onClick={() => onSelectSection('tools')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer text-xs ${
              activeSection === 'tools'
                ? 'bg-blue-500/10 text-blue-400 font-medium'
                : 'text-[#888] hover:bg-[#161616] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span>Herramientas</span>
            </div>
          </button>

          <button
            onClick={() => onSelectSection('references')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer text-xs ${
              activeSection === 'references'
                ? 'bg-blue-500/10 text-blue-400 font-medium'
                : 'text-[#888] hover:bg-[#161616] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4" />
              <span>Referencias</span>
            </div>
          </button>

          <button
            onClick={() => onSelectSection('review')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer text-xs ${
              activeSection === 'review'
                ? 'bg-blue-500/10 text-blue-400 font-medium'
                : 'text-[#888] hover:bg-[#161616] hover:text-white'
            }`}
            title="Items marcados como 'Revisar después'"
          >
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4" />
              <span>Revisión</span>
            </div>
            {reviewCount > 0 && (
              <span className="text-[10px] font-mono text-blue-400/90">{reviewCount}</span>
            )}
          </button>

          {/* BLOQUE 6 — Online-Optional. Data & Intelligence sync center.
              MITRE/Sigma sync architecture, TI provider status, saved CVEs,
              online activity log. All local; sync buttons gated by online. */}
          <button
            onClick={() => onSelectSection('data-intel')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer text-xs ${
              activeSection === 'data-intel'
                ? 'bg-blue-500/10 text-blue-400 font-medium'
                : 'text-[#888] hover:bg-[#161616] hover:text-white'
            }`}
            title="Sincronización de datasets + estado de integraciones + actividad online"
          >
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span>Data & Intel</span>
            </div>
            {online ? (
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" title="Online — sync available" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Offline — local only" />
            )}
          </button>
        </nav>
      </div>

      {/* Bottom navigation */}
      <div className="p-3 border-t border-[#262626] flex flex-col gap-2">
        <button
          onClick={() => onSelectSection('trash')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer text-xs ${
            activeSection === 'trash'
              ? 'bg-red-500/10 text-red-400 font-medium'
              : 'text-[#888] hover:bg-[#161616] hover:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            <span>Papelera</span>
          </div>
          {trashCount > 0 && (
            <span className="text-[10px] font-mono text-red-400/80">{trashCount}</span>
          )}
        </button>

        {/* Connectivity state badge (Block 6 — Online-Optional).
            Reads navigator.onLine via useIsOnline() — no fetch, no probe.
            Replaces the static "100% Offline" badge from Block 5 with a real
            reflection of the browser's connectivity state. Local-first
            always works; online enrichment is the only thing gated by this. */}
        <div
          className="px-3 py-1.5 rounded bg-[#161616] border border-[#262626] flex items-center justify-between text-[10px] text-[#888]"
          title={
            online
              ? 'Online: local tools + online enrichment available'
              : 'Offline: local only — Notes ✓, Search ✓, MITRE ✓, Sigma ✓ · Online enrichment ✕ (disabled)'
          }
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                online ? 'bg-green-400' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="truncate">
              {online ? 'Online · Local-first' : 'Offline · Local-only'}
            </span>
          </div>
          <span className="font-mono text-[9px] text-[#555] shrink-0 ml-2">Dexie</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Escritorio (≥ md): columna persistente — idéntica al layout original. */}
      <aside className="hidden md:flex w-[200px] border-r border-[#262626] bg-[#0D0D0D] flex-col justify-between shrink-0 h-screen select-none z-30">
        {sidebarContent}
      </aside>

      {/* Móvil (< md): drawer superpuesto con backdrop. Se abre desde el
          botón hamburguesa del Header y se cierra al navegar o al tocar
          el backdrop. No ocupa espacio en el flujo del layout. */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-[45] bg-black/50 md:hidden"
            onClick={() => onClose?.()}
            aria-hidden="true"
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-[260px] max-w-[85vw] bg-[#0D0D0D] border-r border-[#262626] flex flex-col justify-between select-none md:hidden overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
          >
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
};

export const Sidebar = React.memo(SidebarBase);
