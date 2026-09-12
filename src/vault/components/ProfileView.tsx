'use client';

import React, { useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  IdCard as ProfileIcon,
  Download,
  Copy,
  Eye,
  Plus,
  Trash2,
  X,
  User,
  Briefcase,
  GraduationCap,
  Award,
  Languages,
  Wrench,
  FolderGit2,
  Tags,
  Search,
  FileText,
  Check,
  CopyPlus,
} from 'lucide-react';
import { db } from '../db';
import type { ProfileDoc, ProfileSkill, ProfileTool, ProfileExperience, ProfileEducation, ProfileCertification, ProfileLanguage, ProfileProject, SkillStatus } from '../types';
import { buildProfileMarkdown, profileMarkdownFilename } from '../utils/profileExport';
import { downloadBlob } from '../utils/downloadBlob';
import { useDebouncedAutoSave } from '../hooks/useDebouncedAutoSave';

/**
 * ProfileView — "Perfil Profesional": documentos vivos del CV (MULTI-PERFIL).
 *
 * El usuario puede crear tantos perfiles como quiera (p. ej. "CV IAM 2026",
 * "CV SOC", "CV English") — cada uno con su skills/tools/experiencia/certs/
 * idiomas/títulos objetivo y su propio export Markdown "AI-ready" (con
 * instrucciones para la IA incluidas) listo para pegar en ChatGPT/Claude
 * y obtener un CV perfecto.
 *
 * Persistencia: tabla Dexie `profile` (una fila por perfil) → viaja en los
 * backups ZIP como profiles.json → sobrevive en el USB. Autosave idéntico
 * al de los apuntes (useDebouncedAutoSave 1500ms + flush al cambiar de
 * perfil / exportar / copiar).
 */

/* ------------------------------ helpers ------------------------------ */

const ACTIVE_PROFILE_KEY = 'vn-active-profile-id';

const newId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const SKILL_GROUPS = ['Core IAM', 'Procesos IAM', 'Herramientas', 'Técnico', 'Blandas', 'Otras'] as const;
const SKILL_STATUSES: SkillStatus[] = ['Dominado', 'En proceso', 'Por aprender'];
const TOOL_LEVELS = ['Avanzado', 'Intermedio', 'Básico', 'En proceso'] as const;
const EXP_TYPES = ['Empleo', 'Prácticas', 'Proyecto', 'Freelance', 'Voluntariado'] as const;
const EDU_STATUSES = ['Completado', 'En curso', 'Abandonado'] as const;
const CERT_STATUSES = ['En proceso', 'Planificada', 'Obtenida'] as const;
const LANG_LEVELS = ['Nativo', 'C2', 'C1', 'B2+', 'B2', 'B1', 'A2', 'A1'] as const;

const inputCls =
  'w-full bg-[#161616] border border-[#262626] rounded px-2.5 py-1.5 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-blue-500/50 transition-colors';

const statusColor = (status: string): string => {
  switch (status) {
    case 'Dominado':
    case 'Avanzado':
    case 'Obtenida':
    case 'Completado':
    case 'Nativo':
      return 'text-green-400 border-green-500/30 bg-green-500/10';
    case 'En proceso':
    case 'Intermedio':
    case 'En curso':
      return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    case 'Por aprender':
    case 'Básico':
    case 'Planificada':
      return 'text-[#888] border-[#333] bg-[#1d1d1d]';
    default:
      return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
  }
};

/** Etiqueta pequeña reutilizable. */
const Pill: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold whitespace-nowrap ${className}`}>
    {children}
  </span>
);

/** Botón de icono para borrar una fila. */
const DeleteBtn: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-[#666] hover:text-red-400 transition-colors cursor-pointer p-1 rounded hover:bg-[#1d1d1d] shrink-0"
    title={label}
    aria-label={label}
  >
    <Trash2 className="w-3.5 h-3.5" />
  </button>
);

/** Tarjeta de sección del perfil. */
const SectionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, title, count, action, children }) => (
  <section className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-4 sm:p-5 flex flex-col gap-3">
    <header className="flex items-start justify-between gap-3">
      <h2 className="text-sm font-bold text-white flex items-center gap-2">
        {icon}
        {title}
        {typeof count === 'number' && <span className="text-[10px] font-mono text-[#555]">({count})</span>}
      </h2>
      {action}
    </header>
    {children}
  </section>
);

/** Input de una línea con etiqueta accesible. */
const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}> = ({ label, value, onChange, placeholder, type = 'text', className = '' }) => (
  <label className={`flex flex-col gap-1 min-w-0 ${className}`}>
    {label && <span className="text-[10px] font-semibold text-[#777] uppercase tracking-wide">{label}</span>}
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  </label>
);

/** Editor de chips (targetRoles / atsKeywords). */
const ChipsEditor: React.FC<{
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}> = ({ items, onChange, placeholder }) => {
  const [draft, setDraft] = useState('');
  const normalized = items.map((i) => i.trim().toLowerCase());
  const add = (raw: string) => {
    const v = raw.trim();
    if (!v || normalized.includes(v.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...items, v]);
    setDraft('');
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            }
          }}
          className={inputCls}
          aria-label={placeholder}
        />
        <button
          type="button"
          onClick={() => add(draft)}
          disabled={!draft.trim()}
          className="flex items-center gap-1 px-3 rounded border border-[#262626] hover:border-blue-500/40 bg-[#161616] text-xs font-semibold text-[#E5E5E5] hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Añadir
        </button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it, idx) => (
            <span
              key={`${it}-${idx}`}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-[#333] bg-[#161616] text-[11px] text-[#CCC] max-w-full"
            >
              <span className="truncate max-w-[260px]">{it}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
                className="text-[#666] hover:text-red-400 transition-colors cursor-pointer shrink-0"
                aria-label={`Quitar ${it}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/* ------------------------------ main view ------------------------------ */

export const ProfileView: React.FC = () => {
  // Todos los perfiles (multi-perfil v18).
  const profiles = useLiveQuery(() => db.profile.toArray(), [], undefined);
  const sortedProfiles = profiles
    ? [...profiles].sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
    : undefined;

  // Perfil activo: preferencia persistida en localStorage; fallback al primero.
  const [activeId, setActiveId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_PROFILE_KEY);
    } catch {
      return null;
    }
  });
  const doc = sortedProfiles?.find((p) => p.id === activeId) || sortedProfiles?.[0];
  const activeProfileId = doc?.id ?? null;

  // PATRÓN "render-time fallback" (lint-safe): mientras no haya ediciones
  // locales el documento Dexie ES el estado (via useLiveQuery). La primera
  // edición crea un borrador (setDraft) que a partir de ahí gana siempre.
  const [draft, setDraft] = useState<ProfileDoc | null>(null);
  const current: ProfileDoc | null | undefined = draft ?? doc;

  const flushSave = useCallback(async () => {
    if (!current) return;
    await db.profile.put({ ...current, updatedAt: new Date().toISOString() });
  }, [current]);

  const { saveStatus, triggerAutoSave } = useDebouncedAutoSave(flushSave, 1500);

  const patch = useCallback(
    (p: Partial<ProfileDoc>) => {
      setDraft((prev) => (prev || doc ? { ...(prev ?? doc!), ...p } : prev));
      triggerAutoSave();
    },
    [doc, triggerAutoSave]
  );

  /* ----------------------- toast + vista previa ----------------------- */
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2600);
  }, []);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewMd, setPreviewMd] = useState('');

  const handleExport = useCallback(async () => {
    if (!current) return;
    await flushSave();
    const blob = new Blob([buildProfileMarkdown(current)], { type: 'text/markdown;charset=utf-8' });
    downloadBlob(blob, profileMarkdownFilename(current));
    showToast('Markdown exportado — pégalo en tu IA favorita para armar el CV');
  }, [current, flushSave, showToast]);

  const handleCopy = useCallback(async () => {
    if (!current) return;
    const md = buildProfileMarkdown(current);
    try {
      await navigator.clipboard.writeText(md);
      showToast('Markdown copiado al portapapeles');
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = md;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        showToast('Markdown copiado al portapapeles');
      } catch {
        showToast('No se pudo copiar — usa \'Exportar .md\' o la vista previa');
      }
    }
  }, [current, showToast]);

  const handleOpenPreview = useCallback(async () => {
    if (!current) return;
    await flushSave();
    setPreviewMd(buildProfileMarkdown(current));
    setIsPreviewOpen(true);
  }, [current, flushSave]);

  /* ------------------- gestión de perfiles (multi) ------------------- */

  const selectProfile = useCallback(
    async (id: string) => {
      if (id === activeProfileId) return;
      await flushSave();
      setDraft(null);
      setActiveId(id);
      try {
        localStorage.setItem(ACTIVE_PROFILE_KEY, id);
      } catch { /* best-effort */ }
    },
    [activeProfileId, flushSave, setActiveId, setDraft]
  );

  const handleCreateProfile = useCallback(async () => {
    await flushSave();
    const n = (sortedProfiles?.length ?? 0) + 1;
    const now = new Date().toISOString();
    const fresh: ProfileDoc = {
      id: newId('profile'),
      name: `Perfil ${n}`,
      fullName: '',
      headline: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      portfolio: '',
      targetRoles: [],
      summary: '',
      skills: [],
      tools: [],
      experience: [],
      education: [],
      certifications: [],
      languages: [],
      projects: [],
      atsKeywords: [],
      jobSearchNotes: '',
      createdAt: now,
      updatedAt: now,
    };
    await db.profile.put(fresh);
    setDraft(null);
    setActiveId(fresh.id);
    try {
      localStorage.setItem(ACTIVE_PROFILE_KEY, fresh.id);
    } catch { /* best-effort */ }
    showToast(`Perfil "${fresh.name}" creado`);
  }, [flushSave, sortedProfiles, showToast, setActiveId, setDraft]);

  const handleDuplicateProfile = useCallback(async () => {
    if (!current) return;
    const now = new Date().toISOString();
    const copy: ProfileDoc = {
      ...current,
      id: newId('profile'),
      name: `${current.name?.trim() || 'Perfil'} (copia)`,
      skills: current.skills.map((s) => ({ ...s, id: newId('skl') })),
      tools: current.tools.map((t) => ({ ...t, id: newId('pt') })),
      experience: current.experience.map((e) => ({ ...e, id: newId('exp') })),
      education: current.education.map((e) => ({ ...e, id: newId('edu') })),
      certifications: current.certifications.map((c) => ({ ...c, id: newId('cert') })),
      languages: current.languages.map((l) => ({ ...l, id: newId('lang') })),
      projects: current.projects.map((p) => ({ ...p, id: newId('prj') })),
      createdAt: now,
      updatedAt: now,
    };
    await db.profile.put(copy);
    setDraft(null);
    setActiveId(copy.id);
    try {
      localStorage.setItem(ACTIVE_PROFILE_KEY, copy.id);
    } catch { /* best-effort */ }
    showToast('Perfil duplicado');
  }, [current, showToast, setActiveId, setDraft]);

  const handleDeleteProfile = useCallback(async () => {
    if (!current || !sortedProfiles || sortedProfiles.length <= 1) return;
    const label = current.name?.trim() || current.id;
    if (!window.confirm(`¿Eliminar el perfil "${label}"? Esta acción no se puede deshacer.`)) return;
    await db.profile.delete(current.id);
    setDraft(null);
    const remaining = sortedProfiles.find((p) => p.id !== current.id)!;
    setActiveId(remaining.id);
    try {
      localStorage.setItem(ACTIVE_PROFILE_KEY, remaining.id);
    } catch { /* best-effort */ }
    showToast(`Perfil "${label}" eliminado`);
  }, [current, sortedProfiles, showToast, setActiveId, setDraft]);

  /* -------------------------- row mutators --------------------------- */

  const upsertList = useCallback(
    <K extends 'skills' | 'tools' | 'experience' | 'education' | 'certifications' | 'languages' | 'projects'>(
      key: K,
      next: ProfileDoc[K]
    ) => {
      patch({ [key]: next } as Partial<ProfileDoc>);
    },
    [patch]
  );

  const updateSkill = useCallback(
    (id: string, p: Partial<ProfileSkill>) =>
      upsertList('skills', (current?.skills || []).map((s) => (s.id === id ? { ...s, ...p } : s))),
    [current, upsertList]
  );
  const addSkill = useCallback(() => {
    const item: ProfileSkill = { id: newId('skl'), name: '', group: 'Core IAM', status: 'En proceso' };
    upsertList('skills', [...(current?.skills || []), item]);
  }, [current, upsertList]);
  const removeSkill = useCallback(
    (id: string) => upsertList('skills', (current?.skills || []).filter((s) => s.id !== id)),
    [current, upsertList]
  );

  const updateTool = useCallback(
    (id: string, p: Partial<ProfileTool>) =>
      upsertList('tools', (current?.tools || []).map((t) => (t.id === id ? { ...t, ...p } : t))),
    [current, upsertList]
  );
  const addTool = useCallback(() => {
    const item: ProfileTool = { id: newId('pt'), name: '', level: 'Intermedio' };
    upsertList('tools', [...(current?.tools || []), item]);
  }, [current, upsertList]);
  const removeTool = useCallback(
    (id: string) => upsertList('tools', (current?.tools || []).filter((t) => t.id !== id)),
    [current, upsertList]
  );

  const updateExp = useCallback(
    (id: string, p: Partial<ProfileExperience>) =>
      upsertList('experience', (current?.experience || []).map((e) => (e.id === id ? { ...e, ...p } : e))),
    [current, upsertList]
  );
  const addExp = useCallback(() => {
    const item: ProfileExperience = {
      id: newId('exp'),
      role: '',
      company: '',
      type: 'Empleo',
      isCurrent: true,
      bullets: [''],
    };
    upsertList('experience', [...(current?.experience || []), item]);
  }, [current, upsertList]);
  const removeExp = useCallback(
    (id: string) => upsertList('experience', (current?.experience || []).filter((e) => e.id !== id)),
    [current, upsertList]
  );

  const updateEdu = useCallback(
    (id: string, p: Partial<ProfileEducation>) =>
      upsertList('education', (current?.education || []).map((e) => (e.id === id ? { ...e, ...p } : e))),
    [current, upsertList]
  );
  const addEdu = useCallback(() => {
    const item: ProfileEducation = { id: newId('edu'), title: '', institution: '', status: 'En curso' };
    upsertList('education', [...(current?.education || []), item]);
  }, [current, upsertList]);
  const removeEdu = useCallback(
    (id: string) => upsertList('education', (current?.education || []).filter((e) => e.id !== id)),
    [current, upsertList]
  );

  const updateCert = useCallback(
    (id: string, p: Partial<ProfileCertification>) =>
      upsertList('certifications', (current?.certifications || []).map((c) => (c.id === id ? { ...c, ...p } : c))),
    [current, upsertList]
  );
  const addCert = useCallback(() => {
    const item: ProfileCertification = { id: newId('cert'), name: '', issuer: '', status: 'En proceso' };
    upsertList('certifications', [...(current?.certifications || []), item]);
  }, [current, upsertList]);
  const removeCert = useCallback(
    (id: string) => upsertList('certifications', (current?.certifications || []).filter((c) => c.id !== id)),
    [current, upsertList]
  );

  const updateLang = useCallback(
    (id: string, p: Partial<ProfileLanguage>) =>
      upsertList('languages', (current?.languages || []).map((l) => (l.id === id ? { ...l, ...p } : l))),
    [current, upsertList]
  );
  const addLang = useCallback(() => {
    const item: ProfileLanguage = { id: newId('lang'), name: '', level: 'B2' };
    upsertList('languages', [...(current?.languages || []), item]);
  }, [current, upsertList]);
  const removeLang = useCallback(
    (id: string) => upsertList('languages', (current?.languages || []).filter((l) => l.id !== id)),
    [current, upsertList]
  );

  const updateProject = useCallback(
    (id: string, p: Partial<ProfileProject>) =>
      upsertList('projects', (current?.projects || []).map((p2) => (p2.id === id ? { ...p2, ...p } : p2))),
    [current, upsertList]
  );
  const addProject = useCallback(() => {
    const item: ProfileProject = { id: newId('prj'), name: '', description: '' };
    upsertList('projects', [...(current?.projects || []), item]);
  }, [current, upsertList]);
  const removeProject = useCallback(
    (id: string) => upsertList('projects', (current?.projects || []).filter((p) => p.id !== id)),
    [current, upsertList]
  );

  /* ------------------------------- render ------------------------------ */

  if (!sortedProfiles || !current) {
    return (
      <div className="flex-1 h-[calc(100vh-48px)] flex items-center justify-center bg-[#0A0A0A]">
        <div className="flex flex-col items-center gap-3 text-[#666]">
          <ProfileIcon className="w-8 h-8 animate-pulse" />
          <p className="text-xs">Cargando perfil profesional…</p>
        </div>
      </div>
    );
  }

  const counts = {
    dominadas: current.skills.filter((s) => s.status === 'Dominado').length,
    enProceso: current.skills.filter((s) => s.status === 'En proceso').length,
    porAprender: current.skills.filter((s) => s.status === 'Por aprender').length,
  };

  const saveLabel =
    saveStatus === 'saved' ? 'Guardado' : saveStatus === 'saving' ? 'Guardando…' : 'Cambios sin guardar';
  const saveDot =
    saveStatus === 'saved' ? 'bg-green-400' : saveStatus === 'saving' ? 'bg-amber-400 animate-pulse' : 'bg-blue-400';

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-48px)] overflow-hidden bg-[#0A0A0A] relative">
      {/* Banner superior */}
      <div className="px-4 sm:px-6 py-3 border-b border-[#262626] bg-[#0D0D0D] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <ProfileIcon className="w-4 h-4 text-blue-400" />
            Perfil Profesional
          </h1>
          <p className="text-xs text-[#888]">
            Cada perfil se exporta como Markdown para que una IA te arme el CV perfecto.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[#262626] bg-[#161616] text-[10px] font-mono text-[#888]"
            title={`Dominadas: ${counts.dominadas} · En proceso: ${counts.enProceso} · Por aprender: ${counts.porAprender}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${saveDot}`} />
            {saveLabel}
          </div>
          <button
            onClick={() => void handleOpenPreview()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#262626] hover:border-blue-500/40 bg-[#161616] text-xs font-semibold text-[#E5E5E5] hover:text-white transition-colors cursor-pointer"
            title="Ver el Markdown exacto que recibirá la IA"
          >
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            Vista previa
          </button>
          <button
            onClick={() => void handleCopy()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#262626] hover:border-blue-500/40 bg-[#161616] text-xs font-semibold text-[#E5E5E5] hover:text-white transition-colors cursor-pointer"
            title="Copiar el Markdown al portapapeles"
          >
            <Copy className="w-3.5 h-3.5 text-blue-400" />
            Copiar MD
          </button>
          <button
            onClick={() => void handleExport()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
            title="Descargar .md listo para pegar a tu IA"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar .md
          </button>
        </div>
      </div>

      {/* Barra de perfiles (multi-perfil) */}
      <div className="px-4 sm:px-6 py-2.5 border-b border-[#262626] bg-[#0B0B0B] flex items-center gap-2 flex-wrap shrink-0">
        {sortedProfiles.map((p) => (
          <button
            key={p.id}
            onClick={() => void selectProfile(p.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors cursor-pointer max-w-[240px] ${
              p.id === activeProfileId
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/40'
                : 'text-[#888] border-[#333] hover:border-[#444] hover:text-white'
            }`}
            title={p.name || p.id}
          >
            <span className="truncate">{p.name?.trim() || 'Perfil sin nombre'}</span>
            <span className="text-[9px] font-mono opacity-60">{p.skills.length}s</span>
          </button>
        ))}
        <button
          onClick={() => void handleCreateProfile()}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-dashed border-[#3a3a3a] text-xs text-[#888] hover:text-blue-400 hover:border-blue-500/40 transition-colors cursor-pointer shrink-0"
          title="Crear un perfil nuevo (p. ej. CV IAM, CV SOC, CV en inglés)"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo perfil
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => void handleDuplicateProfile()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[#262626] hover:border-blue-500/40 bg-[#161616] text-xs font-semibold text-[#E5E5E5] hover:text-white transition-colors cursor-pointer"
            title="Duplicar el perfil activo"
          >
            <CopyPlus className="w-3.5 h-3.5 text-blue-400" />
            Duplicar
          </button>
          <button
            onClick={() => void handleDeleteProfile()}
            disabled={sortedProfiles.length <= 1}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[#262626] hover:border-red-500/40 bg-[#161616] text-xs font-semibold text-[#E5E5E5] hover:text-red-400 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#262626] disabled:hover:text-[#E5E5E5]"
            title={sortedProfiles.length <= 1 ? 'Debe quedar al menos un perfil' : 'Eliminar el perfil activo'}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 max-w-4xl w-full mx-auto">
        {/* 1. Datos personales + nombre del perfil */}
        <SectionCard icon={<User className="w-4 h-4 text-blue-400" />} title="Datos personales">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nombre del perfil" value={current.name || ''} onChange={(v) => patch({ name: v })} placeholder="P. ej. CV IAM 2026" />
            <Field label="Titular / Headline" value={current.headline} onChange={(v) => patch({ headline: v })} placeholder="IAM Analyst | Identity & Access Management" />
            <Field label="Nombre completo" value={current.fullName} onChange={(v) => patch({ fullName: v })} placeholder="Tu nombre" />
            <Field label="Email" type="email" value={current.email} onChange={(v) => patch({ email: v })} placeholder="tucorreo@ejemplo.com" />
            <Field label="Teléfono" value={current.phone} onChange={(v) => patch({ phone: v })} placeholder="+57 …" />
            <Field label="Ubicación" value={current.location} onChange={(v) => patch({ location: v })} placeholder="Ciudad, País" />
            <Field label="LinkedIn" value={current.linkedin} onChange={(v) => patch({ linkedin: v })} placeholder="linkedin.com/in/…" />
            <Field label="Portafolio / GitHub" value={current.portfolio} onChange={(v) => patch({ portfolio: v })} placeholder="github.com/…" />
          </div>
        </SectionCard>

        {/* 2. Puestos objetivo */}
        <SectionCard
          icon={<Search className="w-4 h-4 text-blue-400" />}
          title="Puestos objetivo"
          count={current.targetRoles.length}
        >
          <ChipsEditor
            items={current.targetRoles}
            onChange={(next) => patch({ targetRoles: next })}
            placeholder="P. ej. IAM Analyst (Enter para añadir)"
          />
        </SectionCard>

        {/* 3. Resumen */}
        <SectionCard icon={<FileText className="w-4 h-4 text-blue-400" />} title="Resumen profesional">
          <textarea
            value={current.summary}
            onChange={(e) => patch({ summary: e.target.value })}
            rows={6}
            placeholder="Párrafo de 3-6 líneas: quién eres, tu especialidad IAM, herramientas y logros."
            className="w-full bg-[#161616] border border-[#262626] rounded px-2.5 py-2 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-blue-500/50 transition-colors resize-y leading-relaxed"
          />
          <p className="text-[10px] text-[#555]">{current.summary.trim().length} caracteres · {current.summary.trim().split(/\s+/).filter(Boolean).length} palabras</p>
        </SectionCard>

        {/* 4. Skills */}
        <SectionCard
          icon={<Briefcase className="w-4 h-4 text-blue-400" />}
          title="Habilidades"
          count={current.skills.length}
          action={
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <Pill className={statusColor('Dominado')}>{counts.dominadas} dom.</Pill>
              <Pill className={statusColor('En proceso')}>{counts.enProceso} proc.</Pill>
              <Pill className={statusColor('Por aprender')}>{counts.porAprender} por apr.</Pill>
            </div>
          }
        >
          <div className="flex flex-col gap-2">
            {current.skills.map((s) => (
              <div key={s.id} className="p-2.5 rounded border border-[#262626] bg-[#161616]/40 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    value={s.name}
                    placeholder="P. ej. Access Reviews — campaña y evidencia"
                    onChange={(e) => updateSkill(s.id, { name: e.target.value })}
                    className={`${inputCls} font-semibold`}
                    aria-label="Nombre de la habilidad"
                  />
                  <select
                    value={s.status}
                    onChange={(e) => updateSkill(s.id, { status: e.target.value as SkillStatus })}
                    className={`px-2 py-1.5 rounded border text-[10px] font-semibold cursor-pointer bg-transparent focus:outline-none ${statusColor(s.status)}`}
                    aria-label="Estado de dominio"
                  >
                    {SKILL_STATUSES.map((st) => (
                      <option key={st} value={st} className="bg-[#161616] text-white">
                        {st}
                      </option>
                    ))}
                  </select>
                  <select
                    value={s.group}
                    onChange={(e) => updateSkill(s.id, { group: e.target.value })}
                    className="px-2 py-1.5 rounded border border-[#333] bg-[#111] text-[10px] text-[#AAA] cursor-pointer focus:outline-none"
                    aria-label="Grupo de la habilidad"
                  >
                    {SKILL_GROUPS.map((g) => (
                      <option key={g} value={g} className="bg-[#161616] text-white">
                        {g}
                      </option>
                    ))}
                  </select>
                  <DeleteBtn onClick={() => removeSkill(s.id)} label={`Eliminar habilidad ${s.name || 'sin nombre'}`} />
                </div>
                <input
                  value={s.notes || ''}
                  placeholder="Nota para la IA (opcional): contexto, en qué pantalla/herramienta lo aplicas…"
                  onChange={(e) => updateSkill(s.id, { notes: e.target.value })}
                  className={inputCls}
                  aria-label="Nota de la habilidad"
                />
              </div>
            ))}
            <button
              onClick={addSkill}
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded border border-dashed border-[#333] hover:border-blue-500/40 text-xs text-[#888] hover:text-blue-400 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir habilidad
            </button>
          </div>
        </SectionCard>

        {/* 5. Herramientas */}
        <SectionCard icon={<Wrench className="w-4 h-4 text-blue-400" />} title="Herramientas" count={current.tools.length}>
          <div className="flex flex-col gap-2">
            {current.tools.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <input
                  value={t.name}
                  placeholder="P. ej. ServiceNow"
                  onChange={(e) => updateTool(t.id, { name: e.target.value })}
                  className={`${inputCls} font-semibold`}
                  aria-label="Nombre de la herramienta"
                />
                <select
                  value={t.level}
                  onChange={(e) => updateTool(t.id, { level: e.target.value })}
                  className={`px-2 py-1.5 rounded border text-[10px] font-semibold cursor-pointer bg-transparent focus:outline-none shrink-0 ${statusColor(t.level)}`}
                  aria-label="Nivel de la herramienta"
                >
                  {TOOL_LEVELS.map((l) => (
                    <option key={l} value={l} className="bg-[#161616] text-white">
                      {l}
                    </option>
                  ))}
                </select>
                <DeleteBtn onClick={() => removeTool(t.id)} label={`Eliminar herramienta ${t.name || 'sin nombre'}`} />
              </div>
            ))}
            <button
              onClick={addTool}
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded border border-dashed border-[#333] hover:border-blue-500/40 text-xs text-[#888] hover:text-blue-400 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir herramienta
            </button>
          </div>
        </SectionCard>

        {/* 6. Experiencia */}
        <SectionCard icon={<Briefcase className="w-4 h-4 text-blue-400" />} title="Experiencia" count={current.experience.length}>
          <div className="flex flex-col gap-3">
            {current.experience.length === 0 && (
              <p className="text-[11px] text-[#666] p-3 rounded border border-dashed border-[#333]">
                Sin experiencia registrada. Añade empleos, prácticas o proyectos — hasta los labs cuentan.
              </p>
            )}
            {current.experience.map((e) => (
              <div key={e.id} className="p-3 rounded border border-[#262626] bg-[#161616]/40 flex flex-col gap-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Field label="Rol" value={e.role} onChange={(v) => updateExp(e.id, { role: v })} placeholder="P. ej. IAM Analyst" />
                  <Field label="Empresa / Proyecto" value={e.company} onChange={(v) => updateExp(e.id, { company: v })} placeholder="Empresa" />
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[10px] font-semibold text-[#777] uppercase tracking-wide">Tipo</span>
                    <div className="flex gap-2">
                      <select
                        value={e.type || 'Empleo'}
                        onChange={(ev) => updateExp(e.id, { type: ev.target.value })}
                        className={inputCls + ' cursor-pointer'}
                        aria-label="Tipo de experiencia"
                      >
                        {EXP_TYPES.map((t) => (
                          <option key={t} value={t} className="bg-[#161616]">
                            {t}
                          </option>
                        ))}
                      </select>
                      <Field label="" value={e.location || ''} onChange={(v) => updateExp(e.id, { location: v })} placeholder="Ubicación" className="flex-1" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[10px] font-semibold text-[#777] uppercase tracking-wide">Fechas (YYYY-MM)</span>
                    <div className="flex items-center gap-2">
                      <input
                        value={e.startDate || ''}
                        placeholder="Inicio"
                        onChange={(ev) => updateExp(e.id, { startDate: ev.target.value })}
                        className={inputCls}
                        aria-label="Fecha de inicio"
                      />
                      <input
                        value={e.isCurrent ? '' : e.endDate || ''}
                        placeholder={e.isCurrent ? 'Actualidad' : 'Fin'}
                        disabled={e.isCurrent}
                        onChange={(ev) => updateExp(e.id, { endDate: ev.target.value })}
                        className={`${inputCls} disabled:opacity-40`}
                        aria-label="Fecha de fin"
                      />
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-[11px] text-[#AAA] cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={e.isCurrent}
                    onChange={(ev) => updateExp(e.id, { isCurrent: ev.target.checked })}
                    className="accent-blue-500 cursor-pointer"
                  />
                  Trabajo aquí actualmente
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-[#777] uppercase tracking-wide">Logros (una línea por bullet)</span>
                  <textarea
                    value={e.bullets.join('\n')}
                    onChange={(ev) => updateExp(e.id, { bullets: ev.target.value.split('\n') })}
                    rows={4}
                    placeholder={'P. ej.\nEjecuté campañas trimestrales de access reviews en Entra ID (300+ cuentas)\nReduje cuentas huérfanas un 40% con reportes PowerShell de AD'}
                    className="w-full bg-[#161616] border border-[#262626] rounded px-2.5 py-2 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-blue-500/50 transition-colors resize-y leading-relaxed"
                  />
                </label>
                <div className="flex justify-end">
                  <DeleteBtn onClick={() => removeExp(e.id)} label="Eliminar experiencia" />
                </div>
              </div>
            ))}
            <button
              onClick={addExp}
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded border border-dashed border-[#333] hover:border-blue-500/40 text-xs text-[#888] hover:text-blue-400 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir experiencia
            </button>
          </div>
        </SectionCard>

        {/* 7. Educación */}
        <SectionCard icon={<GraduationCap className="w-4 h-4 text-blue-400" />} title="Educación" count={current.education.length}>
          <div className="flex flex-col gap-2">
            {current.education.map((ed) => (
              <div key={ed.id} className="p-2.5 rounded border border-[#262626] bg-[#161616]/40 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    value={ed.title}
                    placeholder="P. ej. Técnico en Sistemas"
                    onChange={(e) => updateEdu(ed.id, { title: e.target.value })}
                    className={`${inputCls} font-semibold`}
                    aria-label="Título"
                  />
                  <select
                    value={ed.status}
                    onChange={(e) => updateEdu(ed.id, { status: e.target.value })}
                    className={`px-2 py-1.5 rounded border text-[10px] font-semibold cursor-pointer bg-transparent focus:outline-none shrink-0 ${statusColor(ed.status)}`}
                    aria-label="Estado"
                  >
                    {EDU_STATUSES.map((st) => (
                      <option key={st} value={st} className="bg-[#161616] text-white">
                        {st}
                      </option>
                    ))}
                  </select>
                  <DeleteBtn onClick={() => removeEdu(ed.id)} label="Eliminar educación" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Field label="Institución" value={ed.institution} onChange={(v) => updateEdu(ed.id, { institution: v })} placeholder="Institución" />
                  <Field label="Años" value={ed.years || ''} onChange={(v) => updateEdu(ed.id, { years: v })} placeholder="P. ej. 2021 — 2023" />
                </div>
                <input
                  value={ed.notes || ''}
                  placeholder="Nota (opcional): énfasis, tesis, promedio…"
                  onChange={(e) => updateEdu(ed.id, { notes: e.target.value })}
                  className={inputCls}
                  aria-label="Nota de educación"
                />
              </div>
            ))}
            <button
              onClick={addEdu}
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded border border-dashed border-[#333] hover:border-blue-500/40 text-xs text-[#888] hover:text-blue-400 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir educación
            </button>
          </div>
        </SectionCard>

        {/* 8. Certificaciones */}
        <SectionCard icon={<Award className="w-4 h-4 text-blue-400" />} title="Certificaciones" count={current.certifications.length}>
          <div className="flex flex-col gap-2">
            {current.certifications.map((c) => (
              <div key={c.id} className="p-2.5 rounded border border-[#262626] bg-[#161616]/40 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    value={c.name}
                    placeholder="P. ej. SC-300 — Identity and Access Administrator"
                    onChange={(e) => updateCert(c.id, { name: e.target.value })}
                    className={`${inputCls} font-semibold`}
                    aria-label="Nombre de la certificación"
                  />
                  <select
                    value={c.status}
                    onChange={(e) => updateCert(c.id, { status: e.target.value })}
                    className={`px-2 py-1.5 rounded border text-[10px] font-semibold cursor-pointer bg-transparent focus:outline-none shrink-0 ${statusColor(c.status)}`}
                    aria-label="Estado"
                  >
                    {CERT_STATUSES.map((st) => (
                      <option key={st} value={st} className="bg-[#161616] text-white">
                        {st}
                      </option>
                    ))}
                  </select>
                  <DeleteBtn onClick={() => removeCert(c.id)} label="Eliminar certificación" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Field label="Emisor" value={c.issuer} onChange={(v) => updateCert(c.id, { issuer: v })} placeholder="Microsoft" />
                  <Field label="Fecha / objetivo" value={c.date || ''} onChange={(v) => updateCert(c.id, { date: v })} placeholder="P. ej. Q3 2026" />
                  <Field label="Nota" value={c.notes || ''} onChange={(v) => updateCert(c.id, { notes: v })} placeholder="Opcional" />
                </div>
              </div>
            ))}
            <button
              onClick={addCert}
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded border border-dashed border-[#333] hover:border-blue-500/40 text-xs text-[#888] hover:text-blue-400 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir certificación
            </button>
          </div>
        </SectionCard>

        {/* 9. Idiomas */}
        <SectionCard icon={<Languages className="w-4 h-4 text-blue-400" />} title="Idiomas" count={current.languages.length}>
          <div className="flex flex-col gap-2">
            {current.languages.map((l) => (
              <div key={l.id} className="flex items-center gap-2">
                <input
                  value={l.name}
                  placeholder="P. ej. Inglés"
                  onChange={(e) => updateLang(l.id, { name: e.target.value })}
                  className={`${inputCls} font-semibold`}
                  aria-label="Idioma"
                />
                <select
                  value={l.level}
                  onChange={(e) => updateLang(l.id, { level: e.target.value })}
                  className="px-2 py-1.5 rounded border border-blue-500/30 bg-blue-500/10 text-[10px] font-semibold text-blue-400 cursor-pointer focus:outline-none shrink-0"
                  aria-label="Nivel del idioma"
                >
                  {LANG_LEVELS.map((lv) => (
                    <option key={lv} value={lv} className="bg-[#161616] text-white">
                      {lv}
                    </option>
                  ))}
                </select>
                <DeleteBtn onClick={() => removeLang(l.id)} label="Eliminar idioma" />
              </div>
            ))}
            <button
              onClick={addLang}
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded border border-dashed border-[#333] hover:border-blue-500/40 text-xs text-[#888] hover:text-blue-400 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir idioma
            </button>
          </div>
        </SectionCard>

        {/* 10. Proyectos */}
        <SectionCard icon={<FolderGit2 className="w-4 h-4 text-blue-400" />} title="Proyectos" count={current.projects.length}>
          <div className="flex flex-col gap-2">
            {current.projects.map((p) => (
              <div key={p.id} className="p-2.5 rounded border border-[#262626] bg-[#161616]/40 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    value={p.name}
                    placeholder="Nombre del proyecto"
                    onChange={(e) => updateProject(p.id, { name: e.target.value })}
                    className={`${inputCls} font-semibold`}
                    aria-label="Nombre del proyecto"
                  />
                  <DeleteBtn onClick={() => removeProject(p.id)} label="Eliminar proyecto" />
                </div>
                <textarea
                  value={p.description || ''}
                  placeholder="Qué hace, qué tecnologías, qué demuestra (2-4 líneas)."
                  onChange={(e) => updateProject(p.id, { description: e.target.value })}
                  rows={3}
                  className="w-full bg-[#161616] border border-[#262626] rounded px-2.5 py-2 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-blue-500/50 transition-colors resize-y leading-relaxed"
                  aria-label="Descripción del proyecto"
                />
                <Field label="Link" value={p.link || ''} onChange={(v) => updateProject(p.id, { link: v })} placeholder="github.com/… (opcional)" />
              </div>
            ))}
            <button
              onClick={addProject}
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded border border-dashed border-[#333] hover:border-blue-500/40 text-xs text-[#888] hover:text-blue-400 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir proyecto
            </button>
          </div>
        </SectionCard>

        {/* 11. ATS */}
        <SectionCard icon={<Tags className="w-4 h-4 text-blue-400" />} title="Palabras clave ATS" count={current.atsKeywords.length}>
          <ChipsEditor
            items={current.atsKeywords}
            onChange={(next) => patch({ atsKeywords: next })}
            placeholder="P. ej. Identity Governance (Enter para añadir)"
          />
        </SectionCard>

        {/* 12. Notas de búsqueda */}
        <SectionCard icon={<Search className="w-4 h-4 text-blue-400" />} title="Notas de estrategia de búsqueda">
          <textarea
            value={current.jobSearchNotes}
            onChange={(e) => patch({ jobSearchNotes: e.target.value })}
            rows={4}
            placeholder="Portales, títulos probados, feedback de entrevistas, contactos…"
            className="w-full bg-[#161616] border border-[#262626] rounded px-2.5 py-2 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-blue-500/50 transition-colors resize-y leading-relaxed"
            aria-label="Notas de estrategia de búsqueda"
          />
        </SectionCard>

        {/* Footer spacer */}
        <div className="h-4 shrink-0" />
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded bg-[#161616] border border-blue-500/40 shadow-lg text-xs text-white">
          <Check className="w-3.5 h-3.5 text-green-400" />
          {toast}
        </div>
      )}

      {/* Vista previa del Markdown */}
      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Vista previa del Markdown del perfil"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="bg-[#0D0D0D] border border-[#262626] rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#262626]">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">Markdown que recibirá la IA</h3>
                  <p className="text-[10px] text-[#777]">{previewMd.split('\n').length} líneas · {previewMd.length} caracteres</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => void handleCopy()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copiar
                </button>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-1.5 rounded hover:bg-[#161616] text-[#888] hover:text-white transition-colors cursor-pointer"
                  aria-label="Cerrar vista previa"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-[11px] leading-relaxed text-[#CCC] font-mono whitespace-pre-wrap break-words">
              {previewMd}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
