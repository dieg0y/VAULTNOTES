import React from 'react';
import { Trash2, RotateCcw, FileText, FlaskConical, BookOpen } from 'lucide-react';
import { Note, Lab, GlossaryTerm } from '../types';

interface TrashViewProps {
  deletedNotes: Note[];
  deletedLabs?: Lab[];
  deletedTerms: GlossaryTerm[];
  onRestoreNote: (noteId: string) => void;
  onPermanentDeleteNote: (noteId: string) => void;
  onRestoreLab?: (labId: string) => void;
  onPermanentDeleteLab?: (labId: string) => void;
  onRestoreTerm: (termId: string) => void;
  onPermanentDeleteTerm: (termId: string) => void;
  onEmptyTrash: () => void;
}

export const TrashView: React.FC<TrashViewProps> = ({
  deletedNotes,
  deletedLabs = [],
  deletedTerms,
  onRestoreNote,
  onPermanentDeleteNote,
  onRestoreLab,
  onPermanentDeleteLab,
  onRestoreTerm,
  onPermanentDeleteTerm,
  onEmptyTrash,
}) => {
  const totalDeleted = deletedNotes.length + deletedLabs.length + deletedTerms.length;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
        <div>
          <h1 className="text-lg font-bold text-red-400 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Papelera de Reciclaje
          </h1>
          <p className="text-xs text-[#888] mt-0.5">
            Los elementos eliminados se conservan aquí localmente hasta que decidas vaciarlos o restaurarlos.
          </p>
        </div>

        {totalDeleted > 0 && (
          <button
            onClick={() => {
              if (window.confirm('¿Estás seguro de que deseas vaciar la papelera de forma permanente? Esta acción no se puede deshacer.')) {
                onEmptyTrash();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Vaciar Papelera ({totalDeleted})
          </button>
        )}
      </div>

      {totalDeleted === 0 ? (
        <div className="p-12 text-center text-[#666] flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded bg-[#161616] border border-[#262626] flex items-center justify-center text-[#444]">
            <Trash2 className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-sm text-white">La papelera está vacía</h3>
          <p className="text-xs text-[#666]">
            No tienes apuntes, labs ni términos eliminados en este momento.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Deleted Notes */}
          {deletedNotes.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Apuntes ({deletedNotes.length})
              </h2>

              <div className="divide-y divide-[#262626] bg-[#0D0D0D] border border-[#262626] rounded-md overflow-hidden">
                {deletedNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 flex items-center justify-between gap-4 hover:bg-[#161616] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-xs text-white truncate">
                          {note.title}
                        </span>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {note.platform}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#666] truncate">
                        {note.category}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onRestoreNote(note.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 text-xs font-medium transition-colors"
                        title="Restaurar apunte"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restaurar
                      </button>
                      <button
                        onClick={() => onPermanentDeleteNote(note.id)}
                        className="p-1 rounded text-[#666] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Eliminar definitivamente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deleted Labs */}
          {deletedLabs.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5" />
                Labs ({deletedLabs.length})
              </h2>

              <div className="divide-y divide-[#262626] bg-[#0D0D0D] border border-[#262626] rounded-md overflow-hidden">
                {deletedLabs.map((lab) => (
                  <div
                    key={lab.id}
                    className="p-3 flex items-center justify-between gap-4 hover:bg-[#161616] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-xs text-white truncate">
                          {lab.title}
                        </span>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {lab.organization}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#1f1f1f] text-[#888]">
                          {lab.topic}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#666] truncate">
                        Dificultad: {lab.difficulty} • Partes: {lab.parts.length} • {lab.status}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onRestoreLab && (
                        <button
                          onClick={() => onRestoreLab(lab.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 text-xs font-medium transition-colors"
                          title="Restaurar lab"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Restaurar
                        </button>
                      )}
                      {onPermanentDeleteLab && (
                        <button
                          onClick={() => onPermanentDeleteLab(lab.id)}
                          className="p-1 rounded text-[#666] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Eliminar definitivamente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deleted Glossary Terms */}
          {deletedTerms.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Términos de Glosario ({deletedTerms.length})
              </h2>

              <div className="divide-y divide-[#262626] bg-[#0D0D0D] border border-[#262626] rounded-md overflow-hidden">
                {deletedTerms.map((term) => (
                  <div
                    key={term.id}
                    className="p-3 flex items-center justify-between gap-4 hover:bg-[#161616] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-xs text-white font-mono">
                          {term.term}
                        </span>
                        {term.platform && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            {term.platform}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#666] truncate">
                        {term.shortDefinition || term.longDefinition}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onRestoreTerm(term.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 text-xs font-medium transition-colors"
                        title="Restaurar término"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restaurar
                      </button>
                      <button
                        onClick={() => onPermanentDeleteTerm(term.id)}
                        className="p-1 rounded text-[#666] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Eliminar definitivamente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

