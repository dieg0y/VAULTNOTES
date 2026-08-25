import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Star,
  Search,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Clock,
  RefreshCw,
  Check,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Image as ImageIcon,
  Video as VideoIcon,
  FlaskConical,
  Wrench,
  Terminal,
  ShieldAlert,
  ShieldCheck,
  Copy
} from 'lucide-react';
import { Lab, LabDifficulty, LabStatus, LabPart, CategoryItem } from '../types';
import { db } from '../db';
import { PanelResizeHandle } from './PanelResizeHandle';
import { useResizablePanel } from '../hooks/useResizablePanel';
import { insertHtmlInEditable } from '../utils/domInsert';
import { saveVideoBlob, getVideoBlobById, isFsSupported, hasVideosDir, isFsReady, ensureFsPermission, pickVideosDir, shouldAskForDir, markDirDeclined } from '../utils/videoStorage';

interface LabsViewProps {
  labs: Lab[];
  categories: CategoryItem[];
  selectedLabId: string | null;
  onSelectLab: (labId: string) => void;
  onUpdateLab: (labId: string, updated: Partial<Lab>) => void;
  onDeleteLab: (labId: string) => void;
  onCreateLab: () => void;
}

export const LabsView: React.FC<LabsViewProps> = ({
  labs,
  categories,
  selectedLabId,
  onSelectLab,
  onUpdateLab,
  onDeleteLab,
  onCreateLab,
}) => {
  const activeLabs = useMemo(() => labs.filter((l) => !l.isDeleted), [labs]);

  /* --- Resizable panels (persisted via shared hook) --- */
  const filtersPanel = useResizablePanel({
    storageKey: 'vault-labs-filters-w',
    defaultWidth: 240,
    minWidth: 180,
    maxWidth: 460,
  });
  const labsListPanel = useResizablePanel({
    storageKey: 'vault-labs-list-w',
    defaultWidth: 330,
    minWidth: 220,
    maxWidth: 560,
  });

  // Filters state (matching mockup)
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Accordion open/close in left filter sidebar
  const [isOrgFilterOpen, setIsOrgFilterOpen] = useState(true);
  const [isTopicFilterOpen, setIsTopicFilterOpen] = useState(true);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(true);
  const [isDiffFilterOpen, setIsDiffFilterOpen] = useState(true);

  // Extract unique organizations from real lab data only (no hardcode:
  // the filter list always reflects exactly what exists in your vault)
  const allOrganizations = useMemo(() => {
    const set = new Set<string>();
    activeLabs.forEach((l) => {
      if (l.organization) set.add(l.organization);
    });
    return Array.from(set);
  }, [activeLabs]);

  const allTopics = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((c) => set.add(c.name));
    activeLabs.forEach((l) => {
      if (l.topic) set.add(l.topic);
    });
    return Array.from(set);
  }, [activeLabs, categories]);

  // Filter logic
  const filteredLabs = useMemo(() => {
    return activeLabs.filter((lab) => {
      if (selectedOrgs.length > 0 && !selectedOrgs.includes(lab.organization)) return false;
      if (selectedTopics.length > 0 && !selectedTopics.includes(lab.topic)) return false;
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(lab.status)) return false;
      if (selectedDifficulties.length > 0 && !selectedDifficulties.includes(lab.difficulty)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = lab.title.toLowerCase().includes(q);
        const matchOrg = lab.organization.toLowerCase().includes(q);
        const matchTopic = lab.topic.toLowerCase().includes(q);
        const matchTools = lab.tools?.some((t) => t.toLowerCase().includes(q));
        const matchCommands = Array.isArray(lab.commands)
          ? lab.commands.some((c) => c.toLowerCase().includes(q))
          : String(lab.commands || '').toLowerCase().includes(q);
        const matchFindings = lab.findings?.toLowerCase().includes(q);
        if (!matchTitle && !matchOrg && !matchTopic && !matchTools && !matchCommands && !matchFindings) {
          return false;
        }
      }
      return true;
    });
  }, [activeLabs, selectedOrgs, selectedTopics, selectedStatuses, selectedDifficulties, searchQuery]);

  // Selected Lab object
  const currentLab = useMemo(() => {
    return activeLabs.find((l) => l.id === selectedLabId) || filteredLabs[0] || null;
  }, [activeLabs, selectedLabId, filteredLabs]);

  // Handlers for checkboxes
  const toggleOrgFilter = (org: string) => {
    setSelectedOrgs((prev) =>
      prev.includes(org) ? prev.filter((o) => o !== org) : [...prev, org]
    );
  };

  const toggleTopicFilter = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const toggleStatusFilter = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const toggleDiffFilter = (diff: string) => {
    setSelectedDifficulties((prev) =>
      prev.includes(diff) ? prev.filter((d) => d !== diff) : [...prev, diff]
    );
  };

  const clearAllFilters = () => {
    setSelectedOrgs([]);
    setSelectedTopics([]);
    setSelectedStatuses([]);
    setSelectedDifficulties([]);
    setSearchQuery('');
  };

  return (
    <div className="flex flex-1 h-[calc(100vh-48px)] overflow-hidden bg-[#0A0A0A]">
      {/* 1. Left Column: Categories & Filters (resizable) */}
      <div
        style={{ width: filtersPanel.width }}
        className="bg-[#0D0D0D] border-r border-[#262626] flex flex-col shrink-0 z-20 select-none overflow-y-auto"
      >
        <div className="p-3 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-blue-400" />
            <h2 className="font-bold text-xs text-white">Filtros de Labs</h2>
          </div>
          {(selectedOrgs.length > 0 ||
            selectedTopics.length > 0 ||
            selectedStatuses.length > 0 ||
            selectedDifficulties.length > 0) && (
            <button
              onClick={clearAllFilters}
              className="text-[10px] text-blue-400 hover:underline"
            >
              Limpiar
            </button>
          )}
        </div>

        <div className="p-3 space-y-4">
          {/* Organization Accordion */}
          <div className="space-y-2">
            <button
              onClick={() => setIsOrgFilterOpen(!isOrgFilterOpen)}
              className="w-full flex items-center justify-between text-left text-[10px] font-bold uppercase tracking-widest text-[#888] hover:text-white"
            >
              <span>Organización</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isOrgFilterOpen ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            {isOrgFilterOpen && (
              <div className="space-y-1.5 pl-1">
                {allOrganizations.map((org) => {
                  const isChecked = selectedOrgs.includes(org);
                  const count = activeLabs.filter((l) => l.organization === org).length;
                  return (
                    <label
                      key={org}
                      className="flex items-center justify-between text-xs text-[#BBB] hover:text-white cursor-pointer group py-0.5"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          onClick={() => toggleOrgFilter(org)}
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                            isChecked
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-[#444] bg-[#161616] group-hover:border-[#777]'
                          }`}
                        >
                          {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className="truncate">{org}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#555]">{count}</span>
                    </label>
                  );
                })}

                {/* No organizations yet? helpful empty hint */}
                {allOrganizations.length === 0 && (
                  <span className="text-[10px] text-[#666] italic pl-1">
                    Aparecen automáticamente cuando crees labs.
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="h-px bg-[#262626]" />

          {/* Theme / Topic Accordion */}
          <div className="space-y-2">
            <button
              onClick={() => setIsTopicFilterOpen(!isTopicFilterOpen)}
              className="w-full flex items-center justify-between text-left text-[10px] font-bold uppercase tracking-widest text-[#888] hover:text-white"
            >
              <span>Tema / Especialidad</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isTopicFilterOpen ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            {isTopicFilterOpen && (
              <div className="space-y-1.5 pl-1">
                {allTopics.map((topic) => {
                  const isChecked = selectedTopics.includes(topic);
                  const count = activeLabs.filter((l) => l.topic === topic).length;
                  return (
                    <label
                      key={topic}
                      className="flex items-center justify-between text-xs text-[#BBB] hover:text-white cursor-pointer group py-0.5"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          onClick={() => toggleTopicFilter(topic)}
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                            isChecked
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-[#444] bg-[#161616] group-hover:border-[#777]'
                          }`}
                        >
                          {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className="truncate max-w-[140px]">{topic}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#555]">{count}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-px bg-[#262626]" />

          {/* Status Accordion */}
          <div className="space-y-2">
            <button
              onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
              className="w-full flex items-center justify-between text-left text-[10px] font-bold uppercase tracking-widest text-[#888] hover:text-white"
            >
              <span>Estado</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isStatusFilterOpen ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            {isStatusFilterOpen && (
              <div className="space-y-1.5 pl-1">
                {(['En progreso', 'Completado', 'No iniciado'] as LabStatus[]).map((status) => {
                  const isChecked = selectedStatuses.includes(status);
                  const count = activeLabs.filter((l) => l.status === status).length;
                  const color =
                    status === 'Completado'
                      ? 'text-green-400'
                      : status === 'En progreso'
                      ? 'text-blue-400'
                      : 'text-[#888]';
                  return (
                    <label
                      key={status}
                      className="flex items-center justify-between text-xs text-[#BBB] hover:text-white cursor-pointer group py-0.5"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          onClick={() => toggleStatusFilter(status)}
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                            isChecked
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-[#444] bg-[#161616] group-hover:border-[#777]'
                          }`}
                        >
                          {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className={`truncate ${color}`}>{status}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#555]">{count}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-px bg-[#262626]" />

          {/* Difficulty Accordion */}
          <div className="space-y-2">
            <button
              onClick={() => setIsDiffFilterOpen(!isDiffFilterOpen)}
              className="w-full flex items-center justify-between text-left text-[10px] font-bold uppercase tracking-widest text-[#888] hover:text-white"
            >
              <span>Dificultad</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isDiffFilterOpen ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            {isDiffFilterOpen && (
              <div className="space-y-1.5 pl-1">
                {(['Fácil', 'Media', 'Difícil'] as LabDifficulty[]).map((diff) => {
                  const isChecked = selectedDifficulties.includes(diff);
                  const count = activeLabs.filter((l) => l.difficulty === diff).length;
                  const diffColor =
                    diff === 'Fácil'
                      ? 'text-green-400'
                      : diff === 'Media'
                      ? 'text-amber-400'
                      : 'text-red-400';
                  return (
                    <label
                      key={diff}
                      className="flex items-center justify-between text-xs text-[#BBB] hover:text-white cursor-pointer group py-0.5"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          onClick={() => toggleDiffFilter(diff)}
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                            isChecked
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-[#444] bg-[#161616] group-hover:border-[#777]'
                          }`}
                        >
                          {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className={`truncate ${diffColor}`}>{diff}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#555]">{count}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <PanelResizeHandle onMouseDown={filtersPanel.startDrag} onReset={filtersPanel.reset} />

      {/* 2. Center Column: Lab List (resizable) */}
      <div
        style={{ width: labsListPanel.width }}
        className="bg-[#0A0A0A] border-r border-[#262626] flex flex-col shrink-0 z-10"
      >
        {/* Header with Search and Stats */}
        <div className="p-3 border-b border-[#262626] bg-[#0D0D0D] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-xs text-white uppercase tracking-wider">
              {filteredLabs.length} Labs Activos
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161616] border border-[#262626] text-[#888]">
              {activeLabs.length} Total
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#555] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar labs, IoCs, comandos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#161616] border border-[#262626] rounded-md pl-8 pr-2.5 py-1 text-xs text-[#E5E5E5] placeholder:text-[#555] focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Labs List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#161616]">
          {filteredLabs.length === 0 ? (
            <div className="p-8 text-center text-[#666] space-y-2">
              <FlaskConical className="w-8 h-8 text-[#333] mx-auto" />
              <p className="text-xs">No hay labs con estos filtros.</p>
              <button
                onClick={clearAllFilters}
                className="text-xs text-blue-400 hover:underline"
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            filteredLabs.map((lab) => {
              const isSelected = lab.id === currentLab?.id;

              return (
                <div
                  key={lab.id}
                  onClick={() => onSelectLab(lab.id)}
                  className={`p-3 relative cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#161616]' : 'hover:bg-[#111111]'
                  }`}
                >
                  {/* Left indicator bar */}
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />
                  )}

                  {/* Top row: Title + External Link */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3
                      className={`text-xs leading-snug line-clamp-1 flex-1 ${
                        isSelected ? 'font-bold text-white' : 'font-semibold text-[#DDD]'
                      }`}
                    >
                      {lab.title}
                    </h3>
                    {lab.sourceLink && (
                      <a
                        href={lab.sourceLink.startsWith('http') ? lab.sourceLink : `https://${lab.sourceLink}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#666] hover:text-blue-400 transition-colors p-0.5"
                        title="Abrir enlace del lab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Badges: Organization & Topic */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#202020] border border-[#262626] text-[#AAA]">
                      {lab.organization}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 truncate max-w-[140px]">
                      {lab.topic}
                    </span>
                  </div>

                  {/* Bottom row: Difficulty + Status */}
                  <div className="flex items-center justify-between text-[10px]">
                    <span
                      className={`px-1.5 py-0.5 rounded border font-mono ${
                        lab.difficulty === 'Fácil'
                          ? 'border-green-500/30 text-green-400 bg-green-500/10'
                          : lab.difficulty === 'Media'
                          ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                          : 'border-red-500/30 text-red-400 bg-red-500/10'
                      }`}
                    >
                      {lab.difficulty}
                    </span>

                    <div className="flex items-center gap-1">
                      {lab.status === 'Completado' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                          <span className="text-green-400 font-medium">Completado</span>
                        </>
                      ) : lab.status === 'En progreso' ? (
                        <>
                          <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
                          <span className="text-blue-400 font-medium">En progreso</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-[#666]" />
                          <span className="text-[#666]">No iniciado</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Add Lab Button at bottom */}
        <div className="p-3 border-t border-[#262626] bg-[#0D0D0D]">
          <button
            onClick={onCreateLab}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded border border-[#262626] text-[#888] hover:text-white hover:bg-[#161616] transition-colors text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            + Nuevo Lab
          </button>
        </div>
      </div>

      <PanelResizeHandle onMouseDown={labsListPanel.startDrag} onReset={labsListPanel.reset} />

      {/* 3. Right Column: Lab Detail Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0A0A0A] min-w-0">
        {currentLab ? (
          <LabDetailEditor
            key={currentLab.id}
            lab={currentLab}
            organizations={allOrganizations}
            topics={allTopics}
            onUpdateLab={(updated) => onUpdateLab(currentLab.id, updated)}
            onDeleteLab={() => onDeleteLab(currentLab.id)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#555] space-y-4">
            <FlaskConical className="w-12 h-12 text-[#262626]" />
            <div>
              <h3 className="text-base font-bold text-white">Selecciona o crea un Lab de práctica</h3>
              <p className="text-xs text-[#777] mt-1">
                Estructura tus investigaciones de SOC / IAM con partes interactivas, herramientas, IoCs y mitigación.
              </p>
            </div>
            <button
              onClick={onCreateLab}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold shadow-sm transition-colors"
            >
              + Crear Nuevo Lab
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* --- Right Column Detailed Lab Editor Component --- */

interface LabDetailEditorProps {
  lab: Lab;
  organizations: string[];
  topics: string[];
  onUpdateLab: (updated: Partial<Lab>) => void;
  onDeleteLab: () => void;
}

const LabDetailEditor: React.FC<LabDetailEditorProps> = ({
  lab,
  organizations,
  topics,
  onUpdateLab,
  onDeleteLab,
}) => {
  // Local state
  const [title, setTitle] = useState(lab.title);
  const [organization, setOrganization] = useState(lab.organization);
  const [topic, setTopic] = useState(lab.topic);
  const [subtopic, setSubtopic] = useState(lab.subtopic || '');
  const [difficulty, setDifficulty] = useState<LabDifficulty>(lab.difficulty);
  const [status, setStatus] = useState<LabStatus>(lab.status);
  const [timeSpent, setTimeSpent] = useState(lab.timeSpent || '');
  const [sourceLink, setSourceLink] = useState(lab.sourceLink || '');
  const [isFavorite, setIsFavorite] = useState(lab.isFavorite);

  // Parts list
  const [parts, setParts] = useState<LabPart[]>(lab.parts || []);
  const [expandedPartIds, setExpandedPartIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (lab.parts && lab.parts.length > 0) {
      lab.parts.forEach((p, idx) => {
        initial[p.id] = idx === 0; // expand first part by default
      });
    }
    return initial;
  });

  // Footer fields
  const [tools, setTools] = useState<string[]>(lab.tools || []);
  const [toolInput, setToolInput] = useState('');
  const [commands, setCommands] = useState<string[]>(() => {
    // Defensive: legacy labs may still hold a raw string before migration runs
    const raw = lab.commands as unknown;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') return raw.split('\n').map((s) => s.trim()).filter(Boolean);
    return [];
  });
  const [commandInput, setCommandInput] = useState('');
  const [findings, setFindings] = useState(lab.findings || '');
  const [mitigation, setMitigation] = useState(lab.mitigation || '');

  // Save status indicator
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // NOTE: this component is keyed by `lab.id` upstream (LabsView), so local
  // state initializes from props on every lab switch — no sync effect needed.

  // Debounced auto-save
  const triggerAutoSave = useCallback(() => {
    setSaveStatus('unsaved');
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      const updatedData: Partial<Lab> = {
        title,
        organization,
        topic,
        subtopic: subtopic || undefined,
        difficulty,
        status,
        timeSpent,
        sourceLink,
        isFavorite,
        parts,
        tools,
        commands,
        findings,
        mitigation,
        updatedAt: new Date().toISOString(),
      };
      await onUpdateLab(updatedData);
      setSaveStatus('saved');
    }, 1500);
  }, [
    title,
    organization,
    topic,
    subtopic,
    difficulty,
    status,
    timeSpent,
    sourceLink,
    isFavorite,
    parts,
    tools,
    commands,
    findings,
    mitigation,
    onUpdateLab,
  ]);

  // Part management
  const handleTogglePartExpand = (partId: string) => {
    setExpandedPartIds((prev) => ({ ...prev, [partId]: !prev[partId] }));
  };

  const handleAddPart = () => {
    const newPartNum = parts.length + 1;
    const newPart: LabPart = {
      id: `part-${Date.now()}`,
      title: `Parte ${newPartNum}: Nueva Investigación`,
      content: `<p>Documenta el análisis de esta fase aquí...</p>`,
      isCompleted: false,
    };
    const updated = [...parts, newPart];
    setParts(updated);
    setExpandedPartIds((prev) => ({ ...prev, [newPart.id]: true }));
    triggerAutoSave();
  };

  const handleUpdatePart = (partId: string, updatedPart: Partial<LabPart>) => {
    const updated = parts.map((p) => (p.id === partId ? { ...p, ...updatedPart } : p));
    setParts(updated);
    triggerAutoSave();
  };

  const handleDeletePart = (partId: string) => {
    const updated = parts.filter((p) => p.id !== partId);
    setParts(updated);
    triggerAutoSave();
  };

  const handleMovePart = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= parts.length) return;
    const copy = [...parts];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setParts(copy);
    triggerAutoSave();
  };

  // Tool management
  const handleAddTool = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && toolInput.trim()) {
      e.preventDefault();
      const clean = toolInput.trim();
      if (!tools.includes(clean)) {
        const nextTools = [...tools, clean];
        setTools(nextTools);
        triggerAutoSave();

        // Save to global tools table if not present
        try {
          const existing = await db.tools.where('name').equalsIgnoreCase(clean).first();
          if (!existing) {
            await db.tools.add({
              id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: clean,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error('Error saving global tool:', err);
        }
      }
      setToolInput('');
    }
  };

  const handleRemoveTool = (toolToRemove: string) => {
    const nextTools = tools.filter((t) => t !== toolToRemove);
    setTools(nextTools);
    triggerAutoSave();
  };

  // Command management (individual entries, like tools)
  const handleAddCommand = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && commandInput.trim()) {
      e.preventDefault();
      const clean = commandInput.trim();
      if (!commands.includes(clean)) {
        setCommands([...commands, clean]);
        triggerAutoSave();
      }
      setCommandInput('');
    }
  };

  const handleRemoveCommand = (cmdToRemove: string) => {
    setCommands(commands.filter((c) => c !== cmdToRemove));
    triggerAutoSave();
  };

  // Quick toggle status button
  const handleQuickToggleStatus = () => {
    const nextStatus: LabStatus =
      status === 'Completado' ? 'En progreso' : 'Completado';
    setStatus(nextStatus);
    triggerAutoSave();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0A] overflow-y-auto">
      {/* 1. Header & Detail Bar */}
      <div className="px-6 pt-5 pb-4 bg-[#0D0D0D] border-b border-[#262626] flex flex-col gap-3 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              triggerAutoSave();
            }}
            placeholder="Título del Lab (ej. Phishing Analysis - Case #42)..."
            className="w-full bg-transparent text-xl md:text-2xl font-bold text-white focus:outline-none border-none placeholder:text-[#444] tracking-tight"
          />

          <div className="flex items-center gap-2 shrink-0">
            {/* Save indicator */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#161616] border border-[#262626] text-[11px] font-mono text-[#888]">
              {saveStatus === 'saved' && (
                <>
                  <Check className="w-3 h-3 text-green-400" />
                  <span className="text-green-400">Guardado</span>
                </>
              )}
              {saveStatus === 'saving' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                  <span className="text-blue-400">Guardando...</span>
                </>
              )}
              {saveStatus === 'unsaved' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-[#888]">Editado</span>
                </>
              )}
            </div>

            {/* Mark as completed button */}
            <button
              onClick={handleQuickToggleStatus}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                status === 'Completado'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{status === 'Completado' ? 'Completado' : 'Marcar Completado'}</span>
            </button>

            {/* Favorite Star */}
            <button
              onClick={() => {
                const nextFav = !isFavorite;
                setIsFavorite(nextFav);
                triggerAutoSave();
              }}
              className={`p-1.5 rounded transition-colors ${
                isFavorite
                  ? 'text-yellow-400 bg-yellow-500/10'
                  : 'text-[#666] hover:text-white hover:bg-[#161616]'
              }`}
              title={isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
            >
              <Star className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
            </button>

            {/* Delete button */}
            <button
              onClick={onDeleteLab}
              className="p-1.5 rounded text-[#666] hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Mover a la papelera"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Metadata Controls Grid */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#888]">
          {/* Organization */}
          <div className="flex items-center bg-[#161616] rounded px-2.5 py-1 border border-[#262626] gap-1.5">
            <span className="text-[10px] uppercase font-bold text-[#555]">Org:</span>
            <input
              type="text"
              value={organization}
              onChange={(e) => {
                setOrganization(e.target.value);
                triggerAutoSave();
              }}
              placeholder="Organización (ej. LetsDefend)"
              className="bg-transparent border-none text-white font-semibold text-xs focus:outline-none w-28 placeholder:text-[#555]"
            />
          </div>

          {/* Topic / Theme */}
          <div className="flex items-center bg-[#161616] rounded px-2.5 py-1 border border-[#262626] gap-1.5">
            <span className="text-[10px] uppercase font-bold text-[#555]">Tema:</span>
            <input
              type="text"
              list="lab-topics-datalist"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                triggerAutoSave();
              }}
              placeholder="Tema / Especialidad..."
              className="bg-transparent border-none text-blue-400 font-semibold text-xs focus:outline-none w-44 placeholder:text-[#555]"
            />
            <datalist id="lab-topics-datalist">
              {topics.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          {/* Subtopic (Optional) */}
          <div className="flex items-center bg-[#161616] rounded px-2.5 py-1 border border-[#262626] gap-1.5">
            <span className="text-[10px] uppercase font-bold text-[#555]">Subtema:</span>
            <input
              type="text"
              value={subtopic}
              onChange={(e) => {
                setSubtopic(e.target.value);
                triggerAutoSave();
              }}
              placeholder="Subtema (ej. Headers)"
              className="bg-transparent border-none text-[#BBB] text-xs focus:outline-none w-28 placeholder:text-[#555]"
            />
          </div>

          {/* Difficulty Dropdown */}
          <div className="flex items-center bg-[#161616] rounded px-2.5 py-1 border border-[#262626] gap-1.5">
            <span className="text-[10px] uppercase font-bold text-[#555]">Dificultad:</span>
            <select
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value as LabDifficulty);
                triggerAutoSave();
              }}
              className="bg-transparent border-none text-white font-medium text-xs focus:outline-none cursor-pointer"
            >
              <option value="Fácil" className="bg-[#161616] text-green-400">
                Fácil
              </option>
              <option value="Media" className="bg-[#161616] text-yellow-400">
                Media
              </option>
              <option value="Difícil" className="bg-[#161616] text-red-400">
                Difícil
              </option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center bg-[#161616] rounded px-2.5 py-1 border border-[#262626] gap-1.5">
            <span className="text-[10px] uppercase font-bold text-[#555]">Estado:</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as LabStatus);
                triggerAutoSave();
              }}
              className="bg-transparent border-none text-white font-medium text-xs focus:outline-none cursor-pointer"
            >
              <option value="No iniciado" className="bg-[#161616] text-[#888]">
                No iniciado
              </option>
              <option value="En progreso" className="bg-[#161616] text-blue-400">
                En progreso
              </option>
              <option value="Completado" className="bg-[#161616] text-green-400">
                Completado
              </option>
            </select>
          </div>

          {/* Time Spent */}
          <div className="flex items-center bg-[#161616] rounded px-2.5 py-1 border border-[#262626] gap-1.5">
            <Clock className="w-3 h-3 text-[#666]" />
            <input
              type="text"
              value={timeSpent}
              onChange={(e) => {
                setTimeSpent(e.target.value);
                triggerAutoSave();
              }}
              placeholder="Tiempo (ej. 45m)"
              className="bg-transparent border-none text-white text-xs focus:outline-none w-20 font-mono placeholder:text-[#555]"
            />
          </div>

          {/* Source Link URL */}
          <div className="flex items-center bg-[#161616] rounded px-2.5 py-1 border border-[#262626] gap-1.5 ml-auto">
            <ExternalLink className="w-3 h-3 text-[#666]" />
            <input
              type="text"
              value={sourceLink}
              onChange={(e) => {
                setSourceLink(e.target.value);
                triggerAutoSave();
              }}
              placeholder="URL del Lab..."
              className="bg-transparent border-none text-blue-400 text-xs focus:outline-none w-36 placeholder:text-[#555]"
            />
            {sourceLink && (
              <a
                href={sourceLink.startsWith('http') ? sourceLink : `https://${sourceLink}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline font-semibold"
              >
                Abrir
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 3. Body: Dynamic Accordion Parts */}
      <div className="px-6 py-6 space-y-4 max-w-[1200px] w-full mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#888]">
              Fases / Partes de la Práctica ({parts.length})
            </span>
          </div>
          <button
            onClick={handleAddPart}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            + Agregar Parte
          </button>
        </div>

        {/* Parts Accordions */}
        {parts.length === 0 ? (
          <div className="p-8 text-center rounded border border-dashed border-[#262626] bg-[#0D0D0D] text-[#666] space-y-2">
            <p className="text-xs">No hay partes agregadas en este lab todavía.</p>
            <button
              onClick={handleAddPart}
              className="text-xs text-blue-400 hover:underline font-semibold"
            >
              + Haz clic aquí para agregar la Parte 1
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {parts.map((part, index) => {
              const isExpanded = !!expandedPartIds[part.id];
              const partNumStr = String(index + 1).padStart(2, '0');

              return (
                <div
                  key={part.id}
                  className="bg-[#0D0D0D] border border-[#262626] rounded-md shadow-sm overflow-hidden"
                >
                  {/* Part Header Accordion Bar */}
                  <div className="px-4 py-3 bg-[#131313] border-b border-[#262626] flex items-center justify-between gap-3">
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer select-none min-w-0"
                      onClick={() => handleTogglePartExpand(part.id)}
                    >
                      <span className="w-6 h-6 rounded bg-blue-500/10 text-blue-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-blue-500/20">
                        {partNumStr}
                      </span>
                      <input
                        type="text"
                        value={part.title}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleUpdatePart(part.id, { title: e.target.value })}
                        className="bg-transparent border-none text-white font-bold text-xs md:text-sm focus:outline-none flex-1 truncate"
                        placeholder="Título de la parte..."
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Checkbox completed */}
                      <label className="flex items-center gap-1.5 text-xs text-[#888] cursor-pointer hover:text-white mr-2">
                        <input
                          type="checkbox"
                          checked={part.isCompleted}
                          onChange={(e) => handleUpdatePart(part.id, { isCompleted: e.target.checked })}
                          className="rounded border-[#444] text-green-500 focus:ring-green-500 bg-[#161616] cursor-pointer w-3.5 h-3.5"
                        />
                        <span className={part.isCompleted ? 'text-green-400 font-medium' : ''}>
                          {part.isCompleted ? 'Completada' : 'Pendiente'}
                        </span>
                      </label>

                      {/* Reorder buttons */}
                      <button
                        disabled={index === 0}
                        onClick={() => handleMovePart(index, 'up')}
                        className="p-1 text-[#666] hover:text-white disabled:opacity-30 disabled:hover:text-[#666]"
                        title="Mover arriba"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={index === parts.length - 1}
                        onClick={() => handleMovePart(index, 'down')}
                        className="p-1 text-[#666] hover:text-white disabled:opacity-30 disabled:hover:text-[#666]"
                        title="Mover abajo"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Part */}
                      <button
                        onClick={() => handleDeletePart(part.id)}
                        className="p-1 text-[#666] hover:text-red-400"
                        title="Eliminar parte"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Expand / Collapse Chevron */}
                      <button
                        onClick={() => handleTogglePartExpand(part.id)}
                        className="p-1 text-[#888] hover:text-white ml-1"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : 'rotate-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Part Content Area (Rich HTML Editor) */}
                  {isExpanded && (
                    <PartRichEditor
                      key={part.id}
                      labId={lab.id}
                      initialHtml={part.content}
                      onChange={(html) => handleUpdatePart(part.id, { content: html })}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Herramientas Usadas (own section) */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-5 mt-6 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-sm text-white">Herramientas Usadas</h3>
            </div>
            <span className="text-[10px] font-mono text-[#666]">{tools.length} herramienta{tools.length === 1 ? '' : 's'}</span>
          </div>
          <div className="min-h-[44px] bg-[#161616] border border-[#262626] rounded p-2 flex flex-wrap gap-1.5 items-center">
            {tools.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#222] text-xs font-mono text-blue-400 border border-[#2c2c2c]"
              >
                <Wrench className="w-3 h-3 text-[#777]" />
                <span>{t}</span>
                <button
                  onClick={() => handleRemoveTool(t)}
                  className="text-[#666] hover:text-red-400 ml-0.5"
                  title="Eliminar herramienta"
                >
                  ✕
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder="+ Herramienta (Enter)..."
              value={toolInput}
              onChange={(e) => setToolInput(e.target.value)}
              onKeyDown={handleAddTool}
              className="bg-transparent border-none outline-none text-xs text-white flex-1 min-w-[140px] px-1 placeholder:text-[#555]"
            />
          </div>
        </div>

        {/* 5. Comandos Clave (own section) */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-5 mt-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-sm text-white">Comandos Clave</h3>
            </div>
            {commands.length > 0 && (
              <button
                onClick={() => navigator.clipboard.writeText(commands.join('\n'))}
                className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                title="Copiar todos los comandos"
              >
                <Copy className="w-3 h-3" />
                Copiar ({commands.length})
              </button>
            )}
          </div>
          <div className="min-h-[44px] bg-[#161616] border border-[#262626] rounded p-2 flex flex-col gap-1.5">
            {commands.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {commands.map((cmd) => (
                  <span
                    key={cmd}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#0D0D0D] text-xs font-mono text-blue-300 border border-[#2c2c2c] max-w-full group/cmd"
                    title={cmd}
                  >
                    <Terminal className="w-3 h-3 text-[#555] shrink-0" />
                    <span className="truncate max-w-[420px]">{cmd}</span>
                    <button
                      onClick={() => handleRemoveCommand(cmd)}
                      className="text-[#666] hover:text-red-400 ml-0.5 shrink-0"
                      title="Eliminar comando"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              placeholder="+ Comando (Enter para agregar)..."
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={handleAddCommand}
              className="w-full bg-transparent border-none outline-none text-xs font-mono text-blue-300 placeholder:text-[#555] px-1 placeholder:font-sans"
            />
          </div>
        </div>

        {/* 6. Resumen de Investigación y Mitigación (own section) */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-5 mt-4 space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-[#262626]">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white">Resumen de Investigación y Mitigación</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Findings / IoCs */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                Hallazgos / IoCs
              </label>
              <textarea
                rows={5}
                value={findings}
                onChange={(e) => {
                  setFindings(e.target.value);
                  triggerAutoSave();
                }}
                placeholder="Documenta IPs maliciosas, hashes SHA256, dominios C2, o vulnerabilidades identificadas..."
                className="w-full bg-[#161616] border border-[#262626] rounded p-3 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-amber-500/40 resize-y leading-relaxed font-sans"
              />
            </div>

            {/* Mitigation / Lessons Learned */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                Mitigación / Lecciones Aprendidas
              </label>
              <textarea
                rows={5}
                value={mitigation}
                onChange={(e) => {
                  setMitigation(e.target.value);
                  triggerAutoSave();
                }}
                placeholder="Acciones correctivas tomadas (bloqueos en Firewall, cambio de credenciales, reglas SIEM/YARA)..."
                className="w-full bg-[#161616] border border-[#262626] rounded p-3 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-green-500/40 resize-y leading-relaxed"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* --- Component for Rich Editing within a Lab Part --- */

interface PartRichEditorProps {
  labId: string;
  initialHtml: string;
  onChange: (html: string) => void;
}

const PartRichEditor: React.FC<PartRichEditorProps> = ({ labId, initialHtml, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoUrlsRef = useRef<string[]>([]);
  const [fsNeedsPermission, setFsNeedsPermission] = useState(false);

  useEffect(() => {
    return () => {
      videoUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      videoUrlsRef.current = [];
    };
  }, []);

  const attachVideoSources = useCallback(async () => {
    if (!editorRef.current) return;
    const embeds = editorRef.current.querySelectorAll<HTMLElement>('.vault-video-embed[data-vid]');
    let anyMissing = false;
    let permIssue = false;
    const dirReady = await isFsReady().catch(() => false);
    const hasDir = await hasVideosDir().catch(() => false);
    for (const fig of Array.from(embeds)) {
      const vid = fig.getAttribute('data-vid');
      const videoEl = fig.querySelector('video');
      if (!vid || !videoEl || videoEl.getAttribute('src')) continue;
      try {
        const blob = await getVideoBlobById(vid);
        if (blob) {
          fig.classList.remove('vault-video-missing');
          const url = URL.createObjectURL(blob);
          videoUrlsRef.current.push(url);
          videoEl.src = url;
        } else {
          anyMissing = true;
          permIssue = permIssue || (hasDir && !dirReady);
          fig.classList.add('vault-video-missing');
        }
      } catch {
        anyMissing = true;
        fig.classList.add('vault-video-missing');
      }
    }
    setFsNeedsPermission(anyMissing && permIssue);
  }, []);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== initialHtml) {
      editorRef.current.innerHTML = initialHtml;
      void Promise.resolve().then(attachVideoSources);
    }
  }, [initialHtml, attachVideoSources]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCmd = (cmd: string, val: string | undefined = undefined) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  const insertCodeBlock = (lang: string = 'bash') => {
    const codeHtml = `
      <div class="my-4 rounded-lg overflow-hidden border border-[#262626] bg-[#161616] font-mono text-xs">
        <div class="bg-[#0D0D0D] px-3 py-1.5 border-b border-[#262626] text-[11px] text-blue-400 font-semibold flex items-center justify-between select-none">
          <span class="uppercase tracking-wider font-semibold text-blue-400">${lang}</span>
          <span class="text-[10px] text-[#555]">Snippet</span>
        </div>
        <pre class="p-4 text-blue-300 overflow-x-auto whitespace-pre"><code class="language-${lang}"># Escribe tu comando o log aquí...</code></pre>
      </div>
    `;
    insertHtmlInEditable(editorRef.current, codeHtml);
    handleInput();
  };

  const insertChecklist = () => {
    const checklistHtml = `
      <div class="my-2 p-2 bg-[#161616] rounded border border-[#262626] flex items-start gap-2">
        <input type="checkbox" class="mt-1 w-4 h-4 rounded border-[#404040] text-blue-500 bg-[#0D0D0D] cursor-pointer" />
        <span class="flex-1 text-[#E5E5E5]" contenteditable="true">Paso de verificación...</span>
      </div>
    `;
    insertHtmlInEditable(editorRef.current, checklistHtml);
    handleInput();
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const imgId = `img-${Date.now()}`;
      await db.images.add({
        id: imgId,
        labId: labId,
        name: file.name,
        mimeType: file.type,
        dataUrl,
        caption: file.name,
        createdAt: new Date().toISOString(),
      });

      const imageHtml = `
        <figure class="my-4 max-w-full inline-block group relative rounded-lg overflow-hidden border border-[#262626] bg-[#161616]">
          <img src="${dataUrl}" alt="${file.name}" style="max-width: 100%; height: auto; display: block;" />
          <figcaption class="p-2 text-center text-xs text-[#888] italic bg-[#0D0D0D] border-t border-[#262626]" contenteditable="true">
            Captura: ${file.name.replace(/\.[^/.]+$/, '')}
          </figcaption>
        </figure>
        <p><br></p>
      `;

      if (editorRef.current) {
        insertHtmlInEditable(editorRef.current, imageHtml);
        handleInput();
      }
    };
    reader.readAsDataURL(file);
  };

  /** Embed a local video file into this lab part — raw file on disk when
   *  the user's VaultNotesVideos folder is available, IDB otherwise. */
  const handleVideoFile = async (file: File) => {
    if (!file.type.startsWith('video/')) return;

    if (isFsSupported() && !(await hasVideosDir().catch(() => false)) && shouldAskForDir()) {
      const ok = await pickVideosDir();
      if (!ok) markDirDeclined();
    }

    const vidId = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const safeName = file.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    try {
      await saveVideoBlob({
        id: vidId,
        labId,
        name: file.name,
        mimeType: file.type,
        blob: file,
        caption: file.name,
      });
    } catch (err) {
      console.error('No se pudo guardar el video:', err);
      alert('No se pudo guardar el video. Puedes configurar una carpeta en tu PC desde Configuración → Almacenamiento de Videos para evitar límites.');
      return;
    }
    const videoHtml = `
      <figure class="vault-video-embed my-5 max-w-full rounded-lg overflow-hidden border border-[#262626] bg-[#0D0D0D]" contenteditable="false" data-vid="${vidId}">
        <video controls playsinline preload="metadata" style="width: 100%; display: block; background: #000; border-radius: 8px 8px 0 0;"></video>
        <figcaption class="p-2 text-center text-xs text-[#888] italic bg-[#0D0D0D] border-t border-[#262626] outline-none" contenteditable="true">
          Video: ${safeName.replace(/\.[^/.]+$/, '')}
        </figcaption>
      </figure><p><br></p>`;
    if (editorRef.current) {
      insertHtmlInEditable(editorRef.current, videoHtml);
      attachVideoSources();
      handleInput();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) handleImageFile(file);
        return;
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (file.type.startsWith('image/')) {
          handleImageFile(file);
        } else if (file.type.startsWith('video/')) {
          handleVideoFile(file);
        }
      }
    }
  };

  return (
    <div className="p-4 space-y-3 bg-[#0A0A0A]" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      {fsNeedsPermission && (
        <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 rounded">
          <p className="text-[11px] text-amber-300">
            🎬 Tus videos están en la carpeta de tu PC. Concede acceso para reproducirlos en esta sesión.
          </p>
          <button
            onClick={async () => {
              const ok = await ensureFsPermission();
              if (ok) {
                setFsNeedsPermission(false);
                attachVideoSources();
              }
            }}
            className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold shrink-0 cursor-pointer transition-colors"
          >
            Conceder acceso
          </button>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleVideoFile(file);
          e.target.value = '';
        }}
      />

      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 bg-[#131313] border border-[#262626] rounded p-1 text-[#888] overflow-x-auto select-none">
        <button
          onClick={() => execCmd('formatBlock', '<h1>')}
          className="px-1.5 py-0.5 rounded hover:bg-[#1f1f1f] hover:text-white font-bold text-xs"
          title="Título H1"
        >
          H1
        </button>
        <button
          onClick={() => execCmd('formatBlock', '<h2>')}
          className="px-1.5 py-0.5 rounded hover:bg-[#1f1f1f] hover:text-white font-bold text-xs"
          title="Título H2"
        >
          H2
        </button>
        <button
          onClick={() => execCmd('formatBlock', '<h3>')}
          className="px-1.5 py-0.5 rounded hover:bg-[#1f1f1f] hover:text-white font-bold text-xs"
          title="Título H3"
        >
          H3
        </button>

        <div className="w-px h-3.5 bg-[#262626] mx-1" />

        <button
          onClick={() => execCmd('bold')}
          className="p-1 rounded hover:bg-[#1f1f1f] hover:text-white"
          title="Negrita"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => execCmd('italic')}
          className="p-1 rounded hover:bg-[#1f1f1f] hover:text-white"
          title="Cursiva"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => execCmd('underline')}
          className="p-1 rounded hover:bg-[#1f1f1f] hover:text-white"
          title="Subrayado"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-3.5 bg-[#262626] mx-1" />

        <button
          onClick={() => execCmd('insertUnorderedList')}
          className="p-1 rounded hover:bg-[#1f1f1f] hover:text-white"
          title="Lista viñetas"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => execCmd('insertOrderedList')}
          className="p-1 rounded hover:bg-[#1f1f1f] hover:text-white"
          title="Lista numerada"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={insertChecklist}
          className="p-1 rounded hover:bg-[#1f1f1f] hover:text-white"
          title="Paso de verificación"
        >
          <CheckSquare className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-3.5 bg-[#262626] mx-1" />

        <button
          onClick={() => execCmd('formatBlock', '<blockquote>')}
          className="p-1 rounded hover:bg-[#1f1f1f] hover:text-white"
          title="Cita"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertCodeBlock('bash')}
          className="px-1.5 py-0.5 rounded hover:bg-[#1f1f1f] hover:text-white font-mono text-[11px] flex items-center gap-1"
          title="Snippet Bash"
        >
          <Code className="w-3 h-3" />
          <span>bash</span>
        </button>
        <button
          onClick={() => insertCodeBlock('kql')}
          className="px-1.5 py-0.5 rounded hover:bg-[#1f1f1f] hover:text-white font-mono text-[10px]"
          title="Snippet KQL"
        >
          kql
        </button>

        <div className="w-px h-3.5 bg-[#262626] mx-1" />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1 rounded hover:bg-[#1f1f1f] text-blue-400 hover:text-white flex items-center gap-1 text-xs"
          title="Subir o pegar imagen (Ctrl+V)"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Imagen</span>
        </button>

        <button
          onClick={() => videoInputRef.current?.click()}
          className="p-1 rounded hover:bg-[#1f1f1f] text-blue-400 hover:text-white flex items-center gap-1 text-xs"
          title="Incrustar video desde tu PC (se guarda en el vault y viaja en el backup)"
        >
          <VideoIcon className="w-3.5 h-3.5" />
          <span>Video</span>
        </button>
      </div>

      {/* ContentEditable Area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        className="min-h-[140px] bg-[#111] border border-[#222] rounded p-3 text-xs text-[#E5E5E5] outline-none leading-relaxed space-y-2"
      />
    </div>
  );
};
