import React from 'react';
import { LayoutDashboard, FileText, BookOpen, FlaskConical, Trash2, Settings, FileCode } from 'lucide-react';
import { ActiveSection } from '../types';

interface SidebarProps {
  activeSection: ActiveSection;
  onSelectSection: (section: ActiveSection) => void;
  notesCount: number;
  labsCount: number;
  glossaryCount: number;
  trashCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  notesCount,
  labsCount,
  glossaryCount,
  trashCount,
}) => {
  return (
    <aside className="w-[200px] border-r border-[#262626] bg-[#0D0D0D] flex flex-col justify-between shrink-0 h-screen select-none z-30">
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

        {/* Offline indicator badge */}
        <div className="px-3 py-1.5 rounded bg-[#161616] border border-[#262626] flex items-center justify-between text-[10px] text-[#888]">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>100% Offline</span>
          </div>
          <span className="font-mono text-[9px] text-[#555]">Dexie</span>
        </div>
      </div>
    </aside>
  );
};
