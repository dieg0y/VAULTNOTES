import React, { useState } from 'react';
import { FileText, BookOpen, FlaskConical, X, Plus, ExternalLink, Trash2 } from 'lucide-react';
import {
  LabDifficulty,
  LabStatus,
  PlatformItem,
  CategoryItem,
  ToolItem,
  LabPart,
  GlossaryExample
} from '../types';
import { PlatformSelector } from './PlatformSelector';
import { CategoryTreeChecklist } from './CategoryTreeChecklist';
import { ToolsChecklist } from './ToolsChecklist';

interface NewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'note' | 'lab' | 'glossary';
  initialPlatform?: string;
  /** Optional initial content (used by Inbox "Convert to Note/Glossary"). Prefills the title of the active tab. */
  initialContent?: string;
  lockTab?: boolean;
  platforms: PlatformItem[];
  categories: CategoryItem[];
  tools: ToolItem[];
  onCreateNote: (data: {
    title: string;
    platform: string;
    category: string;
    categories?: string[];
    sourceUrl?: string;
    contentHtml?: string;
  }) => void;
  onCreateGlossaryTerm: (data: {
    term: string;
    acronym?: string;
    longDefinition: string;
    example?: string;
    examples?: GlossaryExample[];
    sourceUrl?: string;
    platform?: string;
    category?: string;
    categories?: string[];
  }) => void;
  onCreateLab?: (data: {
    title: string;
    organization: string;
    topic: string;
    categories?: string[];
    difficulty: LabDifficulty;
    status: LabStatus;
    timeSpent?: string;
    sourceLink?: string;
    tools: string[];
    parts?: LabPart[];
  }) => void;
}

export const NewItemModal: React.FC<NewItemModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'note',
  initialPlatform = '',
  initialContent = '',
  lockTab = false,
  platforms,
  categories,
  tools,
  onCreateNote,
  onCreateGlossaryTerm,
  onCreateLab,
}) => {
  const [activeTab, setActiveTab] = useState<'note' | 'lab' | 'glossary'>(initialTab);

  // Note fields
  const [noteTitle, setNoteTitle] = useState(initialContent);
  const [noteSourceUrl, setNoteSourceUrl] = useState('');
  const [notePlatformOverride, setNotePlatformOverride] = useState<string | null>(null);
  const [noteCategories, setNoteCategories] = useState<string[]>([]);
  const [noteInitialContent, setNoteInitialContent] = useState('');
  // Effective platform: explicit user pick > platform from the current view > first known platform
  const notePlatform = notePlatformOverride ?? (initialPlatform || platforms[0]?.name || '');

  // Lab fields
  const [labTitle, setLabTitle] = useState(initialContent);
  const [labSourceLink, setLabSourceLink] = useState('');
  const [labOrgOverride, setLabOrgOverride] = useState<string | null>(null);
  const [labCategories, setLabCategories] = useState<string[]>([]);
  const [labTools, setLabTools] = useState<string[]>([]);
  const [labDifficulty, setLabDifficulty] = useState<LabDifficulty>('Media');
  const [labStatus, setLabStatus] = useState<LabStatus>('En progreso');
  const [labTimeSpent, setLabTimeSpent] = useState('45m');
  const [labParts, setLabParts] = useState<{ title: string; content: string }[]>([
    { title: 'Parte 1: Análisis Inicial', content: '' }
  ]);
  const labOrg = labOrgOverride || platforms[0]?.name || '';

  // Glossary fields
  const [term, setTerm] = useState(initialContent);
  const [acronym, setAcronym] = useState('');
  const [glossaryPlatformOverride, setGlossaryPlatformOverride] = useState<string | null>(null);
  const [glossaryCategories, setGlossaryCategories] = useState<string[]>([]);
  const [glossarySourceUrl, setGlossarySourceUrl] = useState('');
  const [definition, setDefinition] = useState('');
  const [examplesList, setExamplesList] = useState<GlossaryExample[]>([
    { id: 'ex-1', title: 'Ejemplo 1', content: '' }
  ]);
  const glossaryPlatform = glossaryPlatformOverride || platforms[0]?.name || '';

  if (!isOpen) return null;

  // Add / remove example handlers
  const handleAddExample = () => {
    setExamplesList((prev) => [
      ...prev,
      {
        // AUDIT VN-A-001: entropy suffix — plain Date.now() collides when
        // multiple examples are added in the same millisecond.
        id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${prev.length + 1}`,
        title: `Ejemplo ${prev.length + 1}`,
        content: '',
      },
    ]);
  };

  const handleRemoveExample = (id: string) => {
    setExamplesList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateExample = (id: string, field: 'title' | 'content', val: string) => {
    setExamplesList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  // Submit Handlers
  const handleSubmitNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    const primaryCategory = noteCategories[0] || 'General';

    onCreateNote({
      title: noteTitle.trim(),
      sourceUrl: noteSourceUrl.trim() || undefined,
      platform: notePlatform || 'General',
      category: primaryCategory,
      categories: noteCategories,
      contentHtml: noteInitialContent.trim()
        ? `<h1>${noteTitle.trim()}</h1><p>${noteInitialContent.trim().replace(/\n/g, '<br/>')}</p>`
        : undefined
    });

    // Reset fields
    setNoteTitle('');
    setNoteSourceUrl('');
    setNoteCategories([]);
    setNoteInitialContent('');
    onClose();
  };

  const handleSubmitLab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labTitle.trim()) return;

    const primaryCategory = labCategories[0] || 'SOC Tier 1 - Triage';

    const formattedParts: LabPart[] = labParts.map((p, i) => ({
      // AUDIT VN-A-001: entropy suffix — two labs created in the same
      // millisecond would otherwise generate colliding part ids.
      id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${i}`,
      title: p.title.trim() || `Parte ${i + 1}`,
      content: p.content.trim()
        ? `<h2>${p.title.trim()}</h2><p>${p.content.trim().replace(/\n/g, '<br/>')}</p>`
        : `<h2>${p.title.trim()}</h2><p>Registro de pasos y procedimientos del lab...</p>`,
      isCompleted: i === 0
    }));

    if (onCreateLab) {
      onCreateLab({
        title: labTitle.trim(),
        organization: labOrg || 'LetsDefend',
        topic: primaryCategory,
        categories: labCategories,
        difficulty: labDifficulty,
        status: labStatus,
        timeSpent: labTimeSpent.trim() || undefined,
        sourceLink: labSourceLink.trim() || undefined,
        tools: labTools,
        parts: formattedParts
      });
    }

    // Reset fields
    setLabTitle('');
    setLabSourceLink('');
    setLabCategories([]);
    setLabTools([]);
    setLabParts([{ title: 'Parte 1: Análisis Inicial', content: '' }]);
    onClose();
  };

  const handleSubmitGlossary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim() || !definition.trim()) return;

    const primaryCategory = glossaryCategories[0] || undefined;
    const validExamples = examplesList
      .filter((ex) => ex.content.trim().length > 0 || ex.title.trim().length > 0)
      .map((ex, i) => ({
        id: ex.id || `ex-${i + 1}`,
        title: ex.title.trim() || `Ejemplo ${i + 1}`,
        content: ex.content.trim()
      }));

    onCreateGlossaryTerm({
      term: term.trim(),
      acronym: acronym.trim() || undefined,
      longDefinition: definition.trim(),
      example: validExamples[0]?.content || undefined,
      examples: validExamples,
      sourceUrl: glossarySourceUrl.trim() || undefined,
      platform: glossaryPlatform || undefined,
      category: primaryCategory,
      categories: glossaryCategories
    });

    // Reset fields
    setTerm('');
    setAcronym('');
    setDefinition('');
    setGlossarySourceUrl('');
    setExamplesList([{ id: 'ex-1', title: 'Ejemplo 1', content: '' }]);
    setGlossaryCategories([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Navigation Tabs */}
        <div className="p-3 bg-[#0D0D0D] border-b border-[#262626] flex items-center justify-between shrink-0">
          <div className="flex bg-[#161616] p-1 rounded-lg border border-[#262626] gap-1">
            {(!lockTab || activeTab === 'note') && (
              <button
                type="button"
                onClick={() => setActiveTab('note')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'note'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-[#888] hover:text-white hover:bg-[#202020]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Nuevo Apunte
              </button>
            )}
            {(!lockTab || activeTab === 'lab') && (
              <button
                type="button"
                onClick={() => setActiveTab('lab')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'lab'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-[#888] hover:text-white hover:bg-[#202020]'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                Nuevo Lab
              </button>
            )}
            {(!lockTab || activeTab === 'glossary') && (
              <button
                type="button"
                onClick={() => setActiveTab('glossary')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'glossary'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-[#888] hover:text-white hover:bg-[#202020]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Nuevo Término
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-[#888] hover:text-white hover:bg-[#1f1f1f] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 scrollbar-thin scrollbar-thumb-[#262626]">
          {/* TAB 1: NUEVO APUNTE */}
          {activeTab === 'note' && (
            <form onSubmit={handleSubmitNote} className="space-y-4">
              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5">
                  Título del Apunte *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Análisis de Phishing y Extracción de Cabeceras RFC 822"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full bg-[#161616] border border-[#262626] rounded-md px-3.5 py-2.5 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-blue-500 transition-colors font-medium"
                  autoFocus
                />
              </div>

              {/* Link / Fuente (Opcional) */}
              <div>
                <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Link / Fuente (Opcional - será clicable en el apunte)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://learn.microsoft.com/... o https://letsdefend.io/..."
                  value={noteSourceUrl}
                  onChange={(e) => setNoteSourceUrl(e.target.value)}
                  className="w-full bg-[#161616] border border-[#262626] rounded-md px-3.5 py-2 text-xs text-blue-400 placeholder:text-[#555] focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
              </div>

              {/* Plataforma / Ecosistema Conectado */}
              <PlatformSelector
                platforms={platforms}
                selectedPlatform={notePlatform}
                onChange={(p) => {
                  setNotePlatformOverride(p);
                }}
                label="Plataforma / Ecosistema"
                placeholder="Selecciona o escribe plataforma (Microsoft, AWS, GCP, LetsDefend...)"
              />

              {/* Categorías Checklist (Tema / Especialidad — lista maestra) */}
              <div>
                <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Categoría / Tema / Especialidad</span>
                  <span className="text-[10px] text-[#555] font-normal font-mono">Lista maestra compartida</span>
                </label>
                <CategoryTreeChecklist
                  categories={categories}
                  selectedCategories={noteCategories}
                  onChange={(cats) => {
                    setNoteCategories(cats);
                  }}
                />
              </div>

              {/* Resumen / Notas Iniciales */}
              <div>
                <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5">
                  Contenido Inicial (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Escribe notas preliminares o conceptos clave (podrás editarlas con formato rico en el editor)..."
                  value={noteInitialContent}
                  onChange={(e) => setNoteInitialContent(e.target.value)}
                  className="w-full bg-[#161616] border border-[#262626] rounded-md p-3 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-blue-500 leading-relaxed"
                />
                <p className="text-[10px] text-[#666] mt-1.5">
                  Podrás crear subpáginas infinitas dentro de este apunte una vez creado (como en Notion).
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#262626] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-[#888] hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold transition-colors shadow-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Crear y Abrir Apunte
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: NUEVO LAB */}
          {activeTab === 'lab' && (
            <form onSubmit={handleSubmitLab} className="space-y-4">
              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5">
                  Título del Lab *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. SOC164 - Phishing Email Detected (Incident Case #42)"
                  value={labTitle}
                  onChange={(e) => setLabTitle(e.target.value)}
                  className="w-full bg-[#161616] border border-[#262626] rounded-md px-3.5 py-2.5 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-blue-500 transition-colors font-medium"
                  autoFocus
                />
              </div>

              {/* Link / Fuente (Opcional) */}
              <div>
                <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Link / Fuente del Lab (Opcional - clicable en el reporte)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://app.letsdefend.io/challenge/... o https://tryhackme.com/room/..."
                  value={labSourceLink}
                  onChange={(e) => setLabSourceLink(e.target.value)}
                  className="w-full bg-[#161616] border border-[#262626] rounded-md px-3.5 py-2 text-xs text-blue-400 placeholder:text-[#555] focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
              </div>

              {/* Plataforma / Organización Conectada */}
              <PlatformSelector
                platforms={platforms}
                selectedPlatform={labOrg}
                onChange={setLabOrgOverride}
                label="Organización / Plataforma del Lab"
                placeholder="Selecciona o escribe organización (LetsDefend, TryHackMe, Microsoft...)"
              />

              {/* Dificultad, Estado, Tiempo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5">
                    Dificultad
                  </label>
                  <select
                    value={labDifficulty}
                    onChange={(e) => setLabDifficulty(e.target.value as LabDifficulty)}
                    className="w-full bg-[#161616] border border-[#262626] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Fácil">Fácil</option>
                    <option value="Media">Media</option>
                    <option value="Difícil">Difícil</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5">
                    Estado
                  </label>
                  <select
                    value={labStatus}
                    onChange={(e) => setLabStatus(e.target.value as LabStatus)}
                    className="w-full bg-[#161616] border border-[#262626] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="No iniciado">No iniciado</option>
                    <option value="En progreso">En progreso</option>
                    <option value="Completado">Completado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5">
                    Tiempo Est.
                  </label>
                  <input
                    type="text"
                    placeholder="ej. 45m o 1h 30m"
                    value={labTimeSpent}
                    onChange={(e) => setLabTimeSpent(e.target.value)}
                    className="w-full bg-[#161616] border border-[#262626] rounded-md px-3 py-2 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Categorías del Lab (Tema / Especialidad — lista maestra) */}
              <div>
                <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Tema / Especialidad del Lab</span>
                  <span className="text-[10px] text-[#555] font-normal font-mono">Lista maestra compartida</span>
                </label>
                <CategoryTreeChecklist
                  categories={categories}
                  selectedCategories={labCategories}
                  onChange={setLabCategories}
                />
              </div>

              {/* Herramientas Utilizadas (Checklist + Custom) */}
              <div>
                <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5">
                  Herramientas Utilizadas
                </label>
                <ToolsChecklist
                  tools={tools}
                  selectedTools={labTools}
                  onChange={setLabTools}
                />
              </div>

              {/* Partes / Pasos del Lab */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#888] uppercase tracking-wider">
                    Partes / Procedimientos del Lab
                  </label>
                  <button
                    type="button"
                    onClick={() => setLabParts(prev => [...prev, { title: `Parte ${prev.length + 1}: `, content: '' }])}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Agregar Parte</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {labParts.map((part, index) => (
                    <div key={index} className="p-2.5 bg-[#141414] border border-[#262626] rounded-md space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={part.title}
                          onChange={(e) => {
                            const newParts = [...labParts];
                            newParts[index].title = e.target.value;
                            setLabParts(newParts);
                          }}
                          placeholder={`Título de Parte ${index + 1}...`}
                          className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2.5 py-1 text-xs text-white placeholder-[#666] focus:border-blue-500 focus:outline-none"
                        />
                        {labParts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setLabParts(prev => prev.filter((_, i) => i !== index))}
                            className="p-1 text-[#777] hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#262626] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-[#888] hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold transition-colors shadow-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Crear y Abrir Lab
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: NUEVO TÉRMINO (GLOSARIO) */}
          {activeTab === 'glossary' && (
            <form onSubmit={handleSubmitGlossary} className="space-y-4">
              {/* Term + Acronym Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5">
                    Término o Concepto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Man In The Middle o Privileged Access Management"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    className="w-full bg-[#161616] border border-[#262626] rounded-md px-3.5 py-2.5 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-blue-500 font-medium"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5">
                    Acrónimo / Sigla (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="ej. MITM o PAM"
                    value={acronym}
                    onChange={(e) => setAcronym(e.target.value)}
                    className="w-full bg-[#161616] border border-[#262626] rounded-md px-3.5 py-2.5 text-xs text-blue-400 font-mono placeholder:text-[#555] focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>
              </div>

              {/* Link / Fuente (Opcional) */}
              <div>
                <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Link / Documentación Oficial (Opcional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://csrc.nist.gov/... o https://learn.microsoft.com/..."
                  value={glossarySourceUrl}
                  onChange={(e) => setGlossarySourceUrl(e.target.value)}
                  className="w-full bg-[#161616] border border-[#262626] rounded-md px-3.5 py-2 text-xs text-blue-400 placeholder:text-[#555] focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
              </div>

              {/* Plataforma / Ecosistema Conectado */}
              <PlatformSelector
                platforms={platforms}
                selectedPlatform={glossaryPlatform}
                onChange={setGlossaryPlatformOverride}
                label="Plataforma / Ecosistema"
                placeholder="Selecciona o escribe plataforma..."
              />

              {/* Categoría del Glosario (lista maestra) */}
              <div>
                <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Categoría del Término</span>
                  <span className="text-[10px] text-[#555] font-normal font-mono">Lista maestra compartida</span>
                </label>
                <CategoryTreeChecklist
                  categories={categories}
                  selectedCategories={glossaryCategories}
                  onChange={setGlossaryCategories}
                />
              </div>

              {/* Única Definición Completa */}
              <div>
                <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5">
                  Definición Completa *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explicación clara y técnica del concepto, protocolo, función o vector de ataque..."
                  value={definition}
                  onChange={(e) => setDefinition(e.target.value)}
                  className="w-full bg-[#161616] border border-[#262626] rounded-md p-3 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>

              {/* DYNAMIC LIST OF EXAMPLES */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#888] uppercase tracking-wider">
                    Ejemplos de Uso / Comandos / Detección (Múltiples)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddExample}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar otro ejemplo</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {examplesList.map((ex, index) => (
                    <div
                      key={ex.id}
                      className="p-3 bg-[#141414] border border-[#262626] rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={ex.title}
                          onChange={(e) => handleUpdateExample(ex.id, 'title', e.target.value)}
                          placeholder={`Título (ej. Ejemplo ${index + 1}: Detección en Logs)...`}
                          className="bg-[#1c1c1c] border border-[#333] rounded px-2.5 py-1 text-xs text-white placeholder-[#555] focus:border-blue-500 outline-none flex-1 font-medium"
                        />
                        {examplesList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveExample(ex.id)}
                            className="p-1 text-[#777] hover:text-red-400 transition-colors cursor-pointer"
                            title="Eliminar este ejemplo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <textarea
                        rows={2}
                        value={ex.content}
                        onChange={(e) => handleUpdateExample(ex.id, 'content', e.target.value)}
                        placeholder="Código, comando CLI, sintaxis KQL/SPL o descripción del ejemplo..."
                        className="w-full bg-[#181818] border border-[#2e2e2e] rounded p-2 text-xs text-blue-300 placeholder-[#555] font-mono focus:border-blue-500 outline-none leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#262626] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-[#888] hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold transition-colors shadow-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Guardar Término
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
