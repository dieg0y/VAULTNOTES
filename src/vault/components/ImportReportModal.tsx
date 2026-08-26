import React from 'react';
import { ImportSummary } from '../types';
import { CheckCircle2, FileText, FlaskConical, BookOpen, Image as ImageIcon, X, RefreshCw, Video as VideoIcon, AlertTriangle, ShieldAlert, Info } from 'lucide-react';

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

  // AUDIT VN-001 / VN-006: surface conflicts + invalid rows so the user
  // knows something was skipped (and why). Old backups with malformed
  // rows are no longer silently dropped.
  // AUDIT VN-B-012: the auxiliary upsert-by-id tables (saved CVEs, custom
  // Sigma rules, datasetMeta, TI cache) follow the same conflict pattern.
  const totalConflicts =
    (summary.conflictNotes || 0) + (summary.conflictLabs || 0) +
    (summary.conflictTerms || 0) + (summary.conflictReferences || 0) +
    (summary.conflictSavedCves || 0) + (summary.conflictCustomSigmaRules || 0) +
    (summary.conflictDatasetMeta || 0) + (summary.conflictTiCache || 0);
  const totalInvalid =
    (summary.invalidNotes || 0) + (summary.invalidLabs || 0) +
    (summary.invalidTerms || 0) + (summary.invalidReferences || 0) +
    (summary.invalidImages || 0) + (summary.invalidVideos || 0) +
    (summary.invalidPdfs || 0) + (summary.invalidMisc || 0);
  // AUDIT VN-B-013: informational only — orphaned blobs were KEPT (data
  // preservation), so this is NOT a conflict; the header stays green.
  const totalOrphans =
    (summary.orphanedImages || 0) + (summary.orphanedVideos || 0) +
    (summary.orphanedPdfs || 0);

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
          <div className={`w-8 h-8 rounded border flex items-center justify-center ${totalConflicts > 0 || totalInvalid > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
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

        <div className="bg-[#161616] border border-[#262626] rounded p-3.5 space-y-2.5 mb-4 max-h-[50vh] overflow-y-auto">
          {/* Notes */}
          <Row icon={<FileText className="w-3.5 h-3.5" />} color="text-blue-400" label="Apuntes nuevos" value={summary.addedNotes} valueClass="font-semibold text-green-400" />
          <Row icon={<RefreshCw className="w-3.5 h-3.5" />} color="text-blue-400" label="Apuntes actualizados" value={summary.updatedNotes || 0} valueClass="font-semibold text-blue-400" />
          <Row icon={<FileText className="w-3.5 h-3.5" />} color="text-[#666]" label="Apuntes sin cambios" value={summary.skippedNotes} dim />
          {summary.conflictNotes > 0 && (
            <Row icon={<ShieldAlert className="w-3.5 h-3.5" />} color="text-amber-400" label="Apuntes en conflicto (versión local más nueva)" value={summary.conflictNotes} valueClass="font-semibold text-amber-400" />
          )}
          {summary.invalidNotes > 0 && (
            <Row icon={<AlertTriangle className="w-3.5 h-3.5" />} color="text-red-400" label="Apuntes inválidos (esquema rechazado)" value={summary.invalidNotes} valueClass="font-semibold text-red-400" />
          )}

          <div className="h-px bg-[#262626]" />

          {/* Labs */}
          <Row icon={<FlaskConical className="w-3.5 h-3.5" />} color="text-emerald-400" label="Labs nuevos" value={summary.addedLabs || 0} valueClass="font-semibold text-green-400" />
          <Row icon={<RefreshCw className="w-3.5 h-3.5" />} color="text-emerald-400" label="Labs actualizados" value={summary.updatedLabs || 0} valueClass="font-semibold text-blue-400" />
          <Row icon={<FlaskConical className="w-3.5 h-3.5" />} color="text-[#666]" label="Labs sin cambios" value={summary.skippedLabs || 0} dim />
          {summary.conflictLabs > 0 && (
            <Row icon={<ShieldAlert className="w-3.5 h-3.5" />} color="text-amber-400" label="Labs en conflicto (versión local más nueva)" value={summary.conflictLabs} valueClass="font-semibold text-amber-400" />
          )}
          {summary.invalidLabs > 0 && (
            <Row icon={<AlertTriangle className="w-3.5 h-3.5" />} color="text-red-400" label="Labs inválidos (esquema rechazado)" value={summary.invalidLabs} valueClass="font-semibold text-red-400" />
          )}

          <div className="h-px bg-[#262626]" />

          {/* Terms */}
          <Row icon={<BookOpen className="w-3.5 h-3.5" />} color="text-purple-400" label="Términos nuevos" value={summary.addedTerms} valueClass="font-semibold text-green-400" />
          <Row icon={<RefreshCw className="w-3.5 h-3.5" />} color="text-purple-400" label="Términos actualizados" value={summary.updatedTerms || 0} valueClass="font-semibold text-blue-400" />
          <Row icon={<BookOpen className="w-3.5 h-3.5" />} color="text-[#666]" label="Términos sin cambios" value={summary.skippedTerms} dim />
          {summary.conflictTerms > 0 && (
            <Row icon={<ShieldAlert className="w-3.5 h-3.5" />} color="text-amber-400" label="Términos en conflicto (versión local más nueva)" value={summary.conflictTerms} valueClass="font-semibold text-amber-400" />
          )}
          {summary.invalidTerms > 0 && (
            <Row icon={<AlertTriangle className="w-3.5 h-3.5" />} color="text-red-400" label="Términos inválidos (esquema rechazado)" value={summary.invalidTerms} valueClass="font-semibold text-red-400" />
          )}

          {summary.conflictReferences > 0 || summary.invalidReferences > 0 ? (
            <>
              <div className="h-px bg-[#262626]" />
              {summary.conflictReferences > 0 && (
                <Row icon={<ShieldAlert className="w-3.5 h-3.5" />} color="text-amber-400" label="Referencias en conflicto" value={summary.conflictReferences} valueClass="font-semibold text-amber-400" />
              )}
              {summary.invalidReferences > 0 && (
                <Row icon={<AlertTriangle className="w-3.5 h-3.5" />} color="text-red-400" label="Referencias inválidas" value={summary.invalidReferences} valueClass="font-semibold text-red-400" />
              )}
            </>
          ) : null}

          {/* AUDIT VN-B-012: conflicts on the auxiliary upsert-by-id tables —
              same amber/ShieldAlert pattern as the rows above. */}
          {(summary.conflictSavedCves || 0) + (summary.conflictCustomSigmaRules || 0) + (summary.conflictDatasetMeta || 0) + (summary.conflictTiCache || 0) > 0 ? (
            <>
              <div className="h-px bg-[#262626]" />
              {(summary.conflictSavedCves || 0) > 0 && (
                <Row icon={<ShieldAlert className="w-3.5 h-3.5" />} color="text-amber-400" label="CVEs guardados en conflicto (versión local más nueva)" value={summary.conflictSavedCves || 0} valueClass="font-semibold text-amber-400" />
              )}
              {(summary.conflictCustomSigmaRules || 0) > 0 && (
                <Row icon={<ShieldAlert className="w-3.5 h-3.5" />} color="text-amber-400" label="Reglas Sigma propias en conflicto (versión local más nueva)" value={summary.conflictCustomSigmaRules || 0} valueClass="font-semibold text-amber-400" />
              )}
              {(summary.conflictDatasetMeta || 0) > 0 && (
                <Row icon={<ShieldAlert className="w-3.5 h-3.5" />} color="text-amber-400" label="Metadatos de datasets en conflicto (versión local más nueva)" value={summary.conflictDatasetMeta || 0} valueClass="font-semibold text-amber-400" />
              )}
              {(summary.conflictTiCache || 0) > 0 && (
                <Row icon={<ShieldAlert className="w-3.5 h-3.5" />} color="text-amber-400" label="Caché de Threat Intel en conflicto (versión local más nueva)" value={summary.conflictTiCache || 0} valueClass="font-semibold text-amber-400" />
              )}
            </>
          ) : null}

          {summary.addedImages > 0 && (
            <>
              <div className="h-px bg-[#262626]" />
              <Row icon={<ImageIcon className="w-3.5 h-3.5" />} color="text-blue-400" label="Imágenes procesadas" value={summary.addedImages} valueClass="font-semibold text-green-400" />
            </>
          )}
          {summary.invalidImages > 0 && (
            <Row icon={<AlertTriangle className="w-3.5 h-3.5" />} color="text-red-400" label="Imágenes inválidas" value={summary.invalidImages} valueClass="font-semibold text-red-400" />
          )}

          {summary.addedVideos > 0 && (
            <>
              <div className="h-px bg-[#262626]" />
              <Row icon={<VideoIcon className="w-3.5 h-3.5" />} color="text-emerald-400" label="Videos incrustados restaurados" value={summary.addedVideos} valueClass="font-semibold text-green-400" />
            </>
          )}
          {summary.invalidVideos > 0 && (
            <Row icon={<AlertTriangle className="w-3.5 h-3.5" />} color="text-red-400" label="Videos inválidos" value={summary.invalidVideos} valueClass="font-semibold text-red-400" />
          )}

          {summary.addedPdfs > 0 && (
            <>
              <div className="h-px bg-[#262626]" />
              <Row icon={<FileText className="w-3.5 h-3.5" />} color="text-red-400" label="PDFs incrustados restaurados" value={summary.addedPdfs} valueClass="font-semibold text-green-400" />
            </>
          )}
          {summary.invalidPdfs > 0 && (
            <Row icon={<AlertTriangle className="w-3.5 h-3.5" />} color="text-red-400" label="PDFs inválidos" value={summary.invalidPdfs} valueClass="font-semibold text-red-400" />
          )}

          {/* AUDIT VN-B-013: orphaned blobs — informational/neutral style.
              They were KEPT (never deleted); the user just needs to know
              their owner note/lab doesn't exist in this vault. */}
          {totalOrphans > 0 && (
            <>
              <div className="h-px bg-[#262626]" />
              {(summary.orphanedImages || 0) > 0 && (
                <Row icon={<Info className="w-3.5 h-3.5" />} color="text-sky-400" label="Imágenes huérfanas (su apunte/lab no existe — quedaron guardadas)" value={summary.orphanedImages || 0} valueClass="font-semibold text-sky-400" />
              )}
              {(summary.orphanedVideos || 0) > 0 && (
                <Row icon={<Info className="w-3.5 h-3.5" />} color="text-sky-400" label="Videos huérfanos (su apunte/lab no existe — quedaron guardados)" value={summary.orphanedVideos || 0} valueClass="font-semibold text-sky-400" />
              )}
              {(summary.orphanedPdfs || 0) > 0 && (
                <Row icon={<Info className="w-3.5 h-3.5" />} color="text-sky-400" label="PDFs huérfanos (su apunte/lab no existe — quedaron guardados)" value={summary.orphanedPdfs || 0} valueClass="font-semibold text-sky-400" />
              )}
            </>
          )}

          {summary.invalidMisc > 0 && (
            <>
              <div className="h-px bg-[#262626]" />
              <Row icon={<AlertTriangle className="w-3.5 h-3.5" />} color="text-red-400" label="Filas inválidas en tablas auxiliares" value={summary.invalidMisc} valueClass="font-semibold text-red-400" />
            </>
          )}
        </div>

        <p className="text-[10px] text-[#666] mb-3 leading-relaxed">
          Los elementos nuevos se agregan, los que cambiaron se actualizan individualmente y los idénticos se omiten.
          {totalConflicts > 0 && ' Cuando la versión local es más reciente, se preserva (no se sobrescribe).'}
          {totalInvalid > 0 && ' Las filas con esquema incorrecto se rechazan antes de insertarse (validación Zod).'}
          {totalOrphans > 0 && ' Los medios huérfanos quedaron guardados, pero el apunte/lab al que apuntan no existe en este vault.'}
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
