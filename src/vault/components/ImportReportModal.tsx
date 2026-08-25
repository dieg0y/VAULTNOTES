import React from 'react';
import { ImportSummary } from '../types';
import { CheckCircle2, FileText, FlaskConical, BookOpen, Image as ImageIcon, X, RefreshCw, Video as VideoIcon } from 'lucide-react';

interface ImportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: ImportSummary | null;
}

const Row: React.FC<{
  icon: React.ReactNode;
  color: string;
  label: string;
  value: number;
  valueClass?: string;
  dim?: boolean;
}> = ({ icon, color, label, value, valueClass, dim }) => (
  <div className={`flex items-center justify-between text-xs ${dim ? 'opacity-70' : ''}`}>
    <div className={`flex items-center gap-2 ${color}`}>
      {icon}
      <span className={dim ? '' : 'text-[#E5E5E5]'}>{label}</span>
    </div>
    <span className={`font-mono ${valueClass || 'text-[#666]'}`}>{value}</span>
  </div>
);

export const ImportReportModal: React.FC<ImportReportModalProps> = ({ isOpen, onClose, summary }) => {
  if (!isOpen || !summary) return null;

  const totalChanged =
    (summary.addedNotes || 0) + (summary.updatedNotes || 0) +
    (summary.addedLabs || 0) + (summary.updatedLabs || 0) +
    (summary.addedTerms || 0) + (summary.updatedTerms || 0);

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
            <h3 className="font-bold text-sm text-white">Importación Inteligente Completada</h3>
            <p className="text-[11px] text-[#888]">
              {totalChanged > 0
                ? `${summary.addedNotes + summary.addedLabs + summary.addedTerms} nuevos · ${summary.updatedNotes + summary.updatedLabs + summary.updatedTerms} actualizados`
                : 'Todo ya estaba sincronizado'}
            </p>
          </div>
        </div>

        <div className="bg-[#161616] border border-[#262626] rounded p-3.5 space-y-2.5 mb-4 max-h-[60vh] overflow-y-auto">
          {/* Notes */}
          <Row icon={<FileText className="w-3.5 h-3.5" />} color="text-blue-400" label="Apuntes nuevos" value={summary.addedNotes} valueClass="font-semibold text-green-400" />
          <Row icon={<RefreshCw className="w-3.5 h-3.5" />} color="text-blue-400" label="Apuntes actualizados" value={summary.updatedNotes || 0} valueClass="font-semibold text-blue-400" />
          <Row icon={<FileText className="w-3.5 h-3.5" />} color="text-[#666]" label="Apuntes sin cambios" value={summary.skippedNotes} dim />

          <div className="h-px bg-[#262626]" />

          {/* Labs */}
          <Row icon={<FlaskConical className="w-3.5 h-3.5" />} color="text-emerald-400" label="Labs nuevos" value={summary.addedLabs || 0} valueClass="font-semibold text-green-400" />
          <Row icon={<RefreshCw className="w-3.5 h-3.5" />} color="text-emerald-400" label="Labs actualizados" value={summary.updatedLabs || 0} valueClass="font-semibold text-blue-400" />
          <Row icon={<FlaskConical className="w-3.5 h-3.5" />} color="text-[#666]" label="Labs sin cambios" value={summary.skippedLabs || 0} dim />

          <div className="h-px bg-[#262626]" />

          {/* Terms */}
          <Row icon={<BookOpen className="w-3.5 h-3.5" />} color="text-purple-400" label="Términos nuevos" value={summary.addedTerms} valueClass="font-semibold text-green-400" />
          <Row icon={<RefreshCw className="w-3.5 h-3.5" />} color="text-purple-400" label="Términos actualizados" value={summary.updatedTerms || 0} valueClass="font-semibold text-blue-400" />
          <Row icon={<BookOpen className="w-3.5 h-3.5" />} color="text-[#666]" label="Términos sin cambios" value={summary.skippedTerms} dim />

          {summary.addedImages > 0 && (
            <>
              <div className="h-px bg-[#262626]" />
              <Row icon={<ImageIcon className="w-3.5 h-3.5" />} color="text-blue-400" label="Imágenes procesadas" value={summary.addedImages} valueClass="font-semibold text-green-400" />
            </>
          )}

          {summary.addedVideos > 0 && (
            <>
              <div className="h-px bg-[#262626]" />
              <Row icon={<VideoIcon className="w-3.5 h-3.5" />} color="text-emerald-400" label="Videos incrustados restaurados" value={summary.addedVideos} valueClass="font-semibold text-green-400" />
            </>
          )}
        </div>

        <p className="text-[10px] text-[#666] mb-3 leading-relaxed">
          Los elementos nuevos se agregan, los que cambiaron se actualizan individualmente y los idénticos se omiten. Nada se duplica.
        </p>

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
