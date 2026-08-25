import React from 'react';
import { ImportSummary } from '../types';
import { CheckCircle2, FileText, FlaskConical, BookOpen, Image as ImageIcon, X } from 'lucide-react';

interface ImportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: ImportSummary | null;
}

export const ImportReportModal: React.FC<ImportReportModalProps> = ({ isOpen, onClose, summary }) => {
  if (!isOpen || !summary) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-md w-full max-w-md p-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1 rounded text-[#888] hover:text-white hover:bg-[#161616] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded bg-green-500/10 text-green-400 border border-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Importación Completada</h3>
            <p className="text-[11px] text-[#888]">Sincronización incremental sin duplicados</p>
          </div>
        </div>

        <div className="bg-[#161616] border border-[#262626] rounded p-3.5 space-y-2.5 mb-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-blue-400">
              <FileText className="w-3.5 h-3.5" />
              <span className="text-[#E5E5E5]">Apuntes agregados</span>
            </div>
            <span className="font-mono font-semibold text-green-400">+{summary.addedNotes}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#666]">
              <FileText className="w-3.5 h-3.5" />
              <span>Apuntes omitidos (duplicados)</span>
            </div>
            <span className="font-mono text-[#666]">{summary.skippedNotes}</span>
          </div>

          <div className="h-px bg-[#262626]" />

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-400">
              <FlaskConical className="w-3.5 h-3.5" />
              <span className="text-[#E5E5E5]">Labs agregados</span>
            </div>
            <span className="font-mono font-semibold text-green-400">+{summary.addedLabs || 0}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#666]">
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Labs omitidos (duplicados)</span>
            </div>
            <span className="font-mono text-[#666]">{summary.skippedLabs || 0}</span>
          </div>

          <div className="h-px bg-[#262626]" />

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-purple-400">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="text-[#E5E5E5]">Términos de glosario agregados</span>
            </div>
            <span className="font-mono font-semibold text-green-400">+{summary.addedTerms}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#666]">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Términos omitidos (duplicados)</span>
            </div>
            <span className="font-mono text-[#666]">{summary.skippedTerms}</span>
          </div>

          {summary.addedImages > 0 && (
            <>
              <div className="h-px bg-[#262626]" />
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-blue-400">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span className="text-[#E5E5E5]">Imágenes procesadas</span>
                </div>
                <span className="font-mono font-semibold text-green-400">+{summary.addedImages}</span>
              </div>
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
        >
          Aceptar y Continuar
        </button>
      </div>
    </div>
  );
};

