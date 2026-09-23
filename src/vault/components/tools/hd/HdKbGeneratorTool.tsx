/**
 * HdKbGeneratorTool.tsx — "KB Article Generator" (FASE 2 grupo A).
 *
 * Formulario (7 categorías HelpDesk exactas, pasos dinámicos con
 * añadir/eliminar/reordenar ↑↓ y comando opcional, escalación a
 * SOC/IAM/L2-Infra/L2-Redes/RMA, tags tipo chips con Enter-añade) +
 * vista previa EN VIVO del artículo renderizado (panel derecho en lg,
 * debajo en móvil) con el mismo formato visual que un artículo KB.
 *
 * Salida Markdown (# título, ## Síntomas, ## Causa, ## Pasos numerados con
 * ```bash para comandos, ## Verificación, ## Escalación, tags finales) en un
 * CodeBlock con CopyBtn.
 *
 * [Guardar en Data & Intel] (kind rule, contentLang markdown) y [Añadir a
 * Notas] (buildNoteHtmlTable con valores escapados). 100% offline.
 */
'use client';

import React, { useState } from 'react';
import {
  Plus, Trash2, ArrowUp, ArrowDown, X, Tag, BookOpen, Database, Eye, FileText,
} from 'lucide-react';
import { useNoteStore } from '../../../store/noteStore';
import { useIntelStore } from '../../../store/intelStore';
import {
  inputCls, taCls, btnPrimary, btnGhost, CodeBlock, InfoBanner, Field,
  buildNoteHtmlTable, useAddToNoteToast,
} from '../_shared';
import { escapeHtml } from '../../../utils/escapeHtml';

/* ---------- tipos ---------- */

type HdCategory =
  | 'HelpDesk - Fundamentos IT'
  | 'HelpDesk - Service Desk / ITSM'
  | 'HelpDesk - Windows / Endpoint'
  | 'HelpDesk - Redes (Networking)'
  | 'HelpDesk - Microsoft 365'
  | 'HelpDesk - AD / Identidad'
  | 'HelpDesk - Seguridad para Soporte';

type Escalation = '' | 'SOC' | 'IAM' | 'L2-Infra' | 'L2-Redes' | 'RMA';

interface GenStep { title: string; detail: string; command: string }

const HD_CATEGORIES: HdCategory[] = [
  'HelpDesk - Fundamentos IT',
  'HelpDesk - Service Desk / ITSM',
  'HelpDesk - Windows / Endpoint',
  'HelpDesk - Redes (Networking)',
  'HelpDesk - Microsoft 365',
  'HelpDesk - AD / Identidad',
  'HelpDesk - Seguridad para Soporte',
];

const ESCALATIONS: Array<{ value: Escalation; label: string }> = [
  { value: '', label: 'Sin escalación (resuelve L1)' },
  { value: 'SOC', label: 'SOC (posible compromiso)' },
  { value: 'IAM', label: 'IAM (accesos/grupos)' },
  { value: 'L2-Infra', label: 'L2 - Infraestructura' },
  { value: 'L2-Redes', label: 'L2 - Redes' },
  { value: 'RMA', label: 'Proveedor externo (RMA)' },
];

const selectCls =
  'w-full bg-[#161616] border border-[#262626] rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500 cursor-pointer';

/* ---------- markdown del artículo ---------- */

function buildMarkdown(
  title: string, category: HdCategory, symptoms: string, cause: string,
  steps: GenStep[], verification: string, escalation: Escalation, tags: string[],
): string {
  const L: string[] = [];
  L.push(`# ${title || 'Artículo KB sin título'}`);
  L.push('');
  L.push(`**Categoría:** ${category}`);
  L.push('');
  L.push('## Síntomas');
  L.push('');
  L.push(symptoms || '—');
  L.push('');
  L.push('## Causa');
  L.push('');
  L.push(cause || '—');
  L.push('');
  L.push('## Pasos');
  L.push('');
  const realSteps = steps.filter((s) => s.title.trim() || s.detail.trim() || s.command.trim());
  if (realSteps.length === 0) {
    L.push('—');
  } else {
    realSteps.forEach((s, i) => {
      L.push(`${i + 1}. **${s.title || `Paso ${i + 1}`}**`);
      if (s.detail.trim()) L.push(s.detail.trim());
      if (s.command.trim()) {
        L.push('');
        L.push('   ```bash');
        L.push(`   ${s.command.trim()}`);
        L.push('   ```');
      }
      L.push('');
    });
  }
  L.push('## Verificación');
  L.push('');
  L.push(verification || '—');
  L.push('');
  L.push('## Escalación');
  L.push('');
  L.push(escalation ? `Escalar a ${escalation} cuando el caso cumpla los criterios definidos.` : 'Resolver en L1; sin escalación definida.');
  L.push('');
  L.push(tags.length > 0 ? `**Tags:** ${tags.map((t) => `#${t}`).join(' ')}` : '*Sin tags.*');
  return L.join('\n');
}

/* ---------- componente principal ---------- */

export const HdKbGeneratorTool: React.FC = () => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<HdCategory>('HelpDesk - Windows / Endpoint');
  const [symptoms, setSymptoms] = useState('');
  const [cause, setCause] = useState('');
  const [steps, setSteps] = useState<GenStep[]>([{ title: '', detail: '', command: '' }]);
  const [verification, setVerification] = useState('');
  const [escalation, setEscalation] = useState<Escalation>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const { addedToast, showToast } = useAddToNoteToast();

  const updateStep = (i: number, field: keyof GenStep, value: string): void => {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  };

  const addStep = (): void => setSteps((prev) => [...prev, { title: '', detail: '', command: '' }]);

  const removeStep = (i: number): void => {
    setSteps((prev) => (prev.length <= 1 ? [{ title: '', detail: '', command: '' }] : prev.filter((_, idx) => idx !== i)));
  };

  const moveStep = (i: number, dir: -1 | 1): void => {
    setSteps((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
      return copy;
    });
  };

  const addTag = (): void => {
    const v = tagInput.trim().replace(/^#/, '');
    if (!v || tags.some((t) => t.toLowerCase() === v.toLowerCase())) {
      setTagInput('');
      return;
    }
    setTags((prev) => [...prev, v]);
    setTagInput('');
  };

  const removeTag = (t: string): void => setTags((prev) => prev.filter((x) => x !== t));

  const markdown = buildMarkdown(title, category, symptoms, cause, steps, verification, escalation, tags);
  const realSteps = steps.filter((s) => s.title.trim() || s.detail.trim() || s.command.trim());

  const saveToIntel = async (): Promise<void> => {
    if (!title.trim()) return;
    const res = await useIntelStore.getState().addIntelItems([{
      kind: 'rule',
      title: `KB — ${title.trim()}`,
      content: markdown,
      contentLang: 'markdown',
      description: symptoms.trim() || `Artículo KB generado: ${title.trim()}`,
      tags: [category, ...tags, 'kb'],
      source: 'KB Article Generator',
    }]);
    setFeedback(res.added > 0 ? 'Guardado en Data & Intel ✓' : 'Ya existía en Data & Intel');
    window.setTimeout(() => setFeedback(null), 2500);
  };

  const addToNote = (): void => {
    if (!title.trim()) return;
    const rows: Array<[string, string]> = [
      ['Título', escapeHtml(title.trim())],
      ['Categoría', escapeHtml(category)],
      ['Síntomas', escapeHtml(symptoms.trim() || '—')],
      ['Causa', escapeHtml(cause.trim() || '—')],
      ['Pasos', escapeHtml(realSteps.length > 0 ? realSteps.map((s, i) => `${i + 1}. ${s.title || 'Paso'}`).join(' · ') : '—')],
      ['Verificación', escapeHtml(verification.trim() || '—')],
      ['Escalación', escapeHtml(escalation || 'Sin escalación (L1)')],
      ['Tags', escapeHtml(tags.length > 0 ? tags.map((t) => `#${t}`).join(' ') : '—')],
    ];
    useNoteStore.getState().enqueueNote(`KB — ${title.trim()}`, buildNoteHtmlTable(rows));
    showToast();
  };

  return (
    <div className="space-y-3">
      <InfoBanner>
        Genera artículos de la base de conocimiento con vista previa en vivo y
        salida Markdown. 100% offline: nada se publica ni se envía; lo que
        guardes vive solo en tu Data &amp; Intel local.
      </InfoBanner>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* ---------- formulario ---------- */}
        <div className="space-y-3">
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-3">
            <Field label="Título del artículo">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Outlook no conecta tras cambio de contraseña"
                className={inputCls}
                aria-label="Título del artículo"
              />
            </Field>

            <Field label="Categoría">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as HdCategory)}
                className={selectCls}
                aria-label="Categoría del artículo"
              >
                {HD_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>

            <Field label="Síntomas (cuándo aplica)">
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Qué ve el usuario, desde cuándo y con qué alcance..."
                className={`${taCls} min-h-[70px]`}
                aria-label="Síntomas del artículo"
              />
            </Field>

            <Field label="Causa">
              <textarea
                value={cause}
                onChange={(e) => setCause(e.target.value)}
                placeholder="Causa(s) típica(s) del síntoma..."
                className={`${taCls} min-h-[70px]`}
                aria-label="Causa del artículo"
              />
            </Field>
          </div>

          {/* pasos dinámicos */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
                Pasos ({steps.length})
              </span>
              <button
                type="button"
                onClick={addStep}
                className={`${btnGhost} inline-flex items-center gap-1`}
                title="Añadir un paso al final"
              >
                <Plus className="w-3 h-3" /> Añadir paso
              </button>
            </div>
            {steps.map((s, i) => (
              <div key={i} className="bg-[#161616] border border-[#262626] rounded p-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-blue-400">Paso {i + 1}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => moveStep(i, -1)} disabled={i === 0} className="p-1 rounded text-[#666] hover:text-blue-400 hover:bg-[#222] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" title="Subir paso" aria-label={`Subir paso ${i + 1}`}>
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button type="button" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} className="p-1 rounded text-[#666] hover:text-blue-400 hover:bg-[#222] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" title="Bajar paso" aria-label={`Bajar paso ${i + 1}`}>
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button type="button" onClick={() => removeStep(i)} className="p-1 rounded text-[#666] hover:text-red-400 hover:bg-[#222] transition-colors cursor-pointer" title="Eliminar paso" aria-label={`Eliminar paso ${i + 1}`}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={s.title}
                  onChange={(e) => updateStep(i, 'title', e.target.value)}
                  placeholder="Título del paso (ej: Comprobar el modo sin conexión)"
                  className={inputCls}
                  aria-label={`Título del paso ${i + 1}`}
                />
                <textarea
                  value={s.detail}
                  onChange={(e) => updateStep(i, 'detail', e.target.value)}
                  placeholder="Detalle del paso: qué mirar, qué preguntar, qué esperar..."
                  className={`${taCls} min-h-[50px]`}
                  aria-label={`Detalle del paso ${i + 1}`}
                />
                <input
                  type="text"
                  value={s.command}
                  onChange={(e) => updateStep(i, 'command', e.target.value)}
                  placeholder="Comando opcional (PowerShell/CMD) — se renderiza como código"
                  className={`${inputCls} font-mono`}
                  aria-label={`Comando opcional del paso ${i + 1}`}
                />
              </div>
            ))}
          </div>

          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-3">
            <Field label="Verificación (cómo confirmar que quedó resuelto)">
              <textarea
                value={verification}
                onChange={(e) => setVerification(e.target.value)}
                placeholder="Qué prueba confirma la resolución antes de cerrar el ticket..."
                className={`${taCls} min-h-[60px]`}
                aria-label="Verificación del artículo"
              />
            </Field>

            <Field label="Escalación">
              <select
                value={escalation}
                onChange={(e) => setEscalation(e.target.value as Escalation)}
                className={selectCls}
                aria-label="Escalación del artículo"
              >
                {ESCALATIONS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </Field>

            <Field label="Tags (Enter para añadir)">
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="outlook, contrasena, perfil..."
                    className={inputCls}
                    aria-label="Añadir tag"
                  />
                  <button type="button" onClick={addTag} className={`${btnGhost} shrink-0 inline-flex items-center gap-1`} title="Añadir el tag escrito">
                    <Plus className="w-3 h-3" /> Tag
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[9px] font-mono">
                        <Tag className="w-2.5 h-2.5" />
                        {t}
                        <button type="button" onClick={() => removeTag(t)} className="text-[#666] hover:text-red-400 cursor-pointer" title={`Quitar tag ${t}`} aria-label={`Quitar tag ${t}`}>
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Field>
          </div>
        </div>

        {/* ---------- vista previa en vivo ---------- */}
        <div className="space-y-3">
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#555]">
              <Eye className="w-3 h-3" />
              Vista previa en vivo
            </div>
            <div className="border border-[#1A1A1A] rounded p-3 space-y-2 bg-[#0A0A0A]">
              <h3 className="text-sm font-bold text-white leading-snug">{title || 'Título del artículo'}</h3>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[9px] font-semibold">{category}</span>
                {escalation && <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[9px] font-semibold">Escalación: {escalation}</span>}
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Síntomas</div>
                <p className="text-[11px] text-[#AAA] leading-relaxed">{symptoms || 'Describe cuándo aplica el artículo...'}</p>
              </div>
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Causa</div>
                <p className="text-[11px] text-[#AAA] leading-relaxed">{cause || 'Causa(s) típica(s)...'}</p>
              </div>
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Pasos</div>
                {realSteps.length === 0 ? (
                  <p className="text-[11px] text-[#666]">Añade pasos en el formulario...</p>
                ) : (
                  <ol className="space-y-1.5">
                    {realSteps.map((s, i) => (
                      <li key={i} className="space-y-1">
                        <div className="flex gap-2">
                          <span className="text-[10px] font-mono text-blue-400 shrink-0 mt-0.5">{i + 1}.</span>
                          <span className="text-[11px] text-white font-semibold">{s.title || `Paso ${i + 1}`}</span>
                        </div>
                        {s.detail.trim() && <p className="text-[11px] text-[#888] leading-relaxed pl-4">{s.detail}</p>}
                        {s.command.trim() && <div className="pl-4"><CodeBlock code={s.command.trim()} lang="bash" /></div>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Verificación</div>
                <p className="text-[11px] text-[#AAA] leading-relaxed">{verification || 'Cómo confirmar la resolución...'}</p>
              </div>
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Escalación</div>
                <p className="text-[11px] text-[#AAA]">{escalation ? `Escalar a ${escalation} cuando se cumplan los criterios.` : 'Resolver en L1; sin escalación definida.'}</p>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1 border-t border-[#1A1A1A]">
                  {tags.map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-[#161616] border border-[#262626] text-[#888] text-[9px] font-mono">#{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* salida markdown */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#555]">
              <FileText className="w-3 h-3" />
              Salida Markdown
            </div>
            <CodeBlock code={markdown} lang="markdown" label="kb.md" />
          </div>
        </div>
      </div>

      {/* acciones */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={saveToIntel} disabled={!title.trim()} className={`${btnPrimary} inline-flex items-center gap-1.5`} title="Guardar el artículo como regla markdown en Data e Intel">
          <Database className="w-3.5 h-3.5" /> Guardar en Data &amp; Intel
        </button>
        <button type="button" onClick={addToNote} disabled={!title.trim()} className={`${btnGhost} inline-flex items-center gap-1.5`} title="Añadir el resumen del artículo a Notas">
          <BookOpen className="w-3.5 h-3.5" /> Añadir a Notas
        </button>
      </div>

      {feedback && <InfoBanner>{feedback}</InfoBanner>}
      {addedToast && <InfoBanner>Añadido a Notas — crea o elige una nota para verlo.</InfoBanner>}
    </div>
  );
};

