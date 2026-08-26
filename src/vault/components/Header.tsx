import React, { useRef } from 'react';
import { Search, UploadCloud, Plus, FileText, FlaskConical, BookOpen, Save, CheckCircle2, Zap, Menu } from 'lucide-react';
import { ActiveSection } from '../types';
import { useIsOnline } from '../integrations/online';

interface HeaderProps {
  activeSection: ActiveSection;
  onOpenSearch: () => void;
  onOpenNewItem: (section?: 'note' | 'lab' | 'glossary') => void;
  onOpenQuickCapture?: () => void;
  onExport: () => void;
  onImportFile: (file: File) => void;
  isExporting?: boolean;
  backupSavedMessage?: string | null;
  /** Abre el drawer de navegación en móvil (botón hamburguesa). */
  onOpenMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  onOpenSearch,
  onOpenNewItem,
  onOpenQuickCapture,
  onExport,
  onImportFile,
  isExporting = false,
  backupSavedMessage = null,
  onOpenMobileSidebar,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Block 6 — Online-Optional: reads navigator.onLine via window online/offline
  // events. NO network probe, NO periodic fetch. Purely visual indicator.
  const online = useIsOnline();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportFile(file);
      e.target.value = '';
    }
  };

  // Determine contextual button text & target tab
  const getContextualButton = () => {
    switch (activeSection) {
      case 'notes':
        return {
          label: 'Nuevo Apunte',
          icon: <FileText className="w-3.5 h-3.5" />,
          tab: 'note' as const,
        };
      case 'labs':
        return {
          label: 'Nuevo Lab',
          icon: <FlaskConical className="w-3.5 h-3.5" />,
          tab: 'lab' as const,
        };
      case 'glossary':
        return {
          label: 'Nuevo Término',
          icon: <BookOpen className="w-3.5 h-3.5" />,
          tab: 'glossary' as const,
        };
      default:
        return {
          label: 'Nuevo',
          icon: <Plus className="w-3.5 h-3.5" />,
          tab: 'note' as const,
        };
    }
  };

  const btnConfig = getContextualButton();

  return (
    <header className="h-12 border-b border-[#262626] flex items-center justify-between gap-2 px-4 bg-[#0D0D0D] shrink-0 z-40">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,.json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Hamburguesa — solo móvil (< md): abre el drawer de navegación. */}
      {onOpenMobileSidebar && (
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-3 -ml-3 -my-2 rounded text-[#888] hover:text-white hover:bg-[#161616] transition-colors cursor-pointer shrink-0"
          aria-label="Abrir menú de navegación"
          title="Abrir menú de navegación"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Global Search Bar (Ctrl+K) */}
      <div className="flex-1 max-w-md min-w-0">
        <button
          onClick={onOpenSearch}
          className="w-full bg-[#161616] border border-[#262626] hover:border-blue-500/50 rounded-md py-1.5 pl-3 pr-2.5 text-xs text-[#888] flex items-center justify-between gap-2 transition-colors group cursor-text text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-3.5 h-3.5 text-[#555] group-hover:text-blue-400 transition-colors shrink-0" />
            <span className="text-[#888] group-hover:text-[#E5E5E5] transition-colors truncate">
              <span className="hidden sm:inline">Buscar en todo el vault (Ctrl+K)...</span>
              <span className="sm:hidden">Buscar...</span>
            </span>
          </div>
          <span className="text-[10px] bg-[#262626] px-1.5 py-0.5 rounded text-[#888] font-mono hidden sm:inline shrink-0">
            ⌘K
          </span>
        </button>
      </div>

      {/* Header Actions — flex-wrap como red de seguridad en pantallas muy estrechas */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end min-w-0">
        {/* Online/Offline connectivity indicator (Block 6 — Online-Optional).
            Purely visual: reads navigator.onLine via useIsOnline() — no fetch,
            no network probe. Tooltip lists what's available in each state.
            Spec #2: when offline, Local tools ✓ Notes ✓ Search ✓ MITRE ✓ Sigma ✓,
            Online enrichment ✕. When online: everything ✓. */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#161616] border border-[#262626] text-[10px] font-mono shrink-0"
          title={
            online
              ? 'Online: local tools + online enrichment (Threat Intel, CVE search, MITRE/Sigma sync) available'
              : 'Offline: local only — Notes ✓, Search ✓, MITRE ✓, Sigma ✓ · Online enrichment ✕ (disabled)'
          }
          aria-label={online ? 'Browser is online' : 'Browser is offline'}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              online ? 'bg-green-400' : 'bg-amber-400 animate-pulse'
            }`}
          />
          <span className="text-[#888] hidden sm:inline">{online ? 'Online' : 'Offline'}</span>
        </div>

        {backupSavedMessage && (
          <span className="text-[10px] text-green-400 font-mono flex items-center gap-1 animate-in fade-in duration-200 max-w-[220px]">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span className="truncate" title={backupSavedMessage}>{backupSavedMessage}</span>
          </span>
        )}

        <button
          onClick={onExport}
          disabled={isExporting}
          className="flex items-center gap-1.5 text-xs font-medium text-[#888] hover:text-white transition-colors disabled:opacity-50 cursor-pointer shrink-0"
          title="Guardar backup: la primera vez eliges dónde (ej. Documentos); luego SIEMPRE reemplaza ese mismo archivo — como un guardado normal"
        >
          <Save className="w-3.5 h-3.5 text-[#888]" />
          <span className="hidden sm:inline">{isExporting ? 'Guardando...' : 'Guardar Backup'}</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-medium text-[#888] hover:text-white transition-colors cursor-pointer shrink-0"
          title="Importar backup (.zip o .json): agrega lo nuevo, actualiza solo lo que cambió y omite lo idéntico"
        >
          <UploadCloud className="w-3.5 h-3.5 text-[#888]" />
          <span className="hidden sm:inline">Importar</span>
        </button>

        {/* Quick Capture button (Ctrl+Shift+Q) — sends text to the Inbox */}
        {onOpenQuickCapture && (
          <button
            onClick={onOpenQuickCapture}
            className="flex items-center gap-1.5 text-xs font-medium text-[#888] hover:text-blue-400 transition-colors cursor-pointer shrink-0"
            title="Captura rápida al Inbox (Ctrl+Shift+Q)"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Capturar</span>
          </button>
        )}

        {/* Contextual New Button */}
        <button
          onClick={() => onOpenNewItem(btnConfig.tab)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0 whitespace-nowrap"
        >
          {btnConfig.icon}
          <span>{btnConfig.label}</span>
        </button>
      </div>
    </header>
  );
};
