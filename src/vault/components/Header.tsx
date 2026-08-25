import React, { useRef } from 'react';
import { Search, Download, UploadCloud, Plus, FileText, FlaskConical, BookOpen } from 'lucide-react';
import { ActiveSection } from '../types';

interface HeaderProps {
  activeSection: ActiveSection;
  onOpenSearch: () => void;
  onOpenNewItem: (section?: 'note' | 'lab' | 'glossary') => void;
  onExport: () => void;
  onImportFile: (file: File) => void;
  isExporting?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  onOpenSearch,
  onOpenNewItem,
  onExport,
  onImportFile,
  isExporting = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <header className="h-12 border-b border-[#262626] flex items-center justify-between px-4 bg-[#0D0D0D] shrink-0 z-40">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,.json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Global Search Bar (Ctrl+K) */}
      <div className="flex-1 max-w-md">
        <button
          onClick={onOpenSearch}
          className="w-full bg-[#161616] border border-[#262626] hover:border-blue-500/50 rounded-md py-1.5 pl-3 pr-2.5 text-xs text-[#888] flex items-center justify-between transition-colors group cursor-text text-left"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#555] group-hover:text-blue-400 transition-colors" />
            <span className="text-[#888] group-hover:text-[#E5E5E5] transition-colors">
              Buscar en todo el vault (Ctrl+K)...
            </span>
          </div>
          <span className="text-[10px] bg-[#262626] px-1.5 py-0.5 rounded text-[#888] font-mono">
            ⌘K
          </span>
        </button>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onExport}
          disabled={isExporting}
          className="flex items-center gap-1.5 text-xs font-medium text-[#888] hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
          title="Exportar archivo ZIP con todos los apuntes en Markdown, glosario e imágenes"
        >
          <Download className="w-3.5 h-3.5 text-[#888]" />
          <span>{isExporting ? 'Exportando...' : 'Exportar ZIP'}</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-medium text-[#888] hover:text-white transition-colors cursor-pointer"
          title="Importar backup incremental (.zip o .json) sin sobreescribir datos existentes"
        >
          <UploadCloud className="w-3.5 h-3.5 text-[#888]" />
          <span>Importar</span>
        </button>

        {/* Contextual New Button */}
        <button
          onClick={() => onOpenNewItem(btnConfig.tab)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          {btnConfig.icon}
          <span>{btnConfig.label}</span>
        </button>
      </div>
    </header>
  );
};
