'use client';

/**
 * DataIntelDatasets — DATA & INTEL (v16) dataset manager: IoCs · Eventos · Reglas.
 *
 * Full CRUD over `db.intelItems` (schema v16) with:
 *   - Type filters (Todos / IoCs / Eventos / Reglas) + live counters.
 *   - In-section search (title/value, description, tags, MITRE, source, content).
 *   - Manual add + edit modal (Esc closes, backdrop click closes).
 *   - Delete with confirm; import .json (app export format OR loose IoC rows);
 *     export .json (filtered set) and .csv (IoCs — spreadsheet friendly).
 *   - Instant reactivity: useLiveQuery + intelStore.version — items added from
 *     any tool (IoC Extractor, Sigma Explorer, Detection Query Helper) appear
 *     here immediately, without a refresh.
 *
 * 100% offline. All text is rendered as TEXT (never dangerouslySetInnerHTML).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  Database,
  Download,
  FileCode,
  Pencil,
  Plus,
  Search,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { db, type IntelItem, type IntelKind } from '../db';
import { useIntelStore, type IntelItemInput } from '../store/intelStore';
import { downloadBlob } from '../utils/downloadBlob';

/* ============================================================= */
/* Shared class strings — match DataIntelView / SettingsView       */
/* ============================================================= */
const BTN_PRIMARY =
  'flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_NEUTRAL =
  'flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] hover:bg-[#202020] text-[#DDD] border border-[#262626] text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const INPUT_CLS =
  'w-full bg-[#0A0A0A] border border-[#262626] rounded px-2.5 py-1.5 text-[11px] text-[#DDD] placeholder:text-[#555] focus:outline-none focus:border-blue-500';

const IOC_TYPES = [
  'ipv4', 'ipv6', 'domain', 'url', 'email', 'hash', 'cve', 'filepath',
  'registry', 'mutex', 'jwt', 'apikey', 'awskey', 'privatekey', 'bearer',
  'guid', 'btc', 'secret',
] as const;
const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
const CONFIDENCES = ['alta', 'media', 'baja', 'info'] as const;
const RULE_LANGS = ['kql', 'spl', 'sigma', 'other'] as const;

type KindFilter = 'all' | IntelKind;

/** Module-level empty fallback (stable identity for the useLiveQuery
 *  default while the first query is in flight — same pattern as App.tsx). */
const EMPTY_INTEL: IntelItem[] = [];

function kindLabel(kind: IntelKind): string {
  return kind === 'ioc' ? 'IoC' : kind === 'event' ? 'Evento' : 'Regla';
}

function kindIcon(kind: IntelKind): React.ReactNode {
  const cls = 'w-3.5 h-3.5 shrink-0';
  if (kind === 'ioc') return <Bug className={`${cls} text-red-400`} />;
  if (kind === 'event') return <Zap className={`${cls} text-amber-400`} />;
  return <FileCode className={`${cls} text-blue-400`} />;
}

function kindBadgeCls(kind: IntelKind): string {
  if (kind === 'ioc') return 'bg-red-500/10 border-red-500/30 text-red-300';
  if (kind === 'event') return 'bg-amber-500/10 border-amber-500/30 text-amber-300';
  return 'bg-blue-500/10 border-blue-500/30 text-blue-300';
}

/** Small chip for iocType / severity / tags. */
const Chip: React.FC<{ children: React.ReactNode; cls?: string }> = ({ children, cls }) => (
  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cls ?? 'bg-[#161616] border-[#262626] text-[#888]'}`}>
    {children}
  </span>
);

/* ============================================================= */
/* Add / Edit modal                                                 */
/* ============================================================= */
const IntelEditModal: React.FC<{
  /** null = create; otherwise edit this row. */
  initial: IntelItem | null;
  onClose: () => void;
}> = ({ initial, onClose }) => {
  const addIntelItems = useIntelStore((s) => s.addIntelItems);
  const bump = useIntelStore((s) => s.bump);
  const [kind, setKind] = useState<IntelKind>(initial?.kind ?? 'ioc');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [iocType, setIocType] = useState(initial?.iocType ?? 'ipv4');
  const [severity, setSeverity] = useState(initial?.severity ?? '');
  const [confidence, setConfidence] = useState(initial?.confidence ?? '');
  const [contentLang, setContentLang] = useState(initial?.contentLang ?? 'kql');
  const [content, setContent] = useState(initial?.content ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '));
  const [mitre, setMitre] = useState((initial?.mitre ?? []).join(', '));
  const [source, setSource] = useState(initial?.source ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A11y: Esc closes the modal (same contract as the rest of the app modals).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(kind === 'ioc' ? 'El valor del IoC es obligatorio.' : 'El título es obligatorio.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input: IntelItemInput = {
        kind,
        title: trimmedTitle,
        iocType: kind === 'ioc' ? iocType : undefined,
        severity: severity || undefined,
        confidence: kind === 'ioc' ? confidence || undefined : undefined,
        description: description.trim() || undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        source: source.trim() || undefined,
        mitre: mitre.split(',').map((t) => t.trim()).filter(Boolean),
        content: content.trim() || undefined,
        contentLang: kind === 'rule' ? contentLang : undefined,
      };
      if (initial) {
        // Edit path: direct row update (id/kind stable) + version bump so
        // every subscriber (counters, lists) refreshes instantly.
        const now = new Date().toISOString();
        await db.intelItems.update(initial.id, {
          title: input.title,
          iocType: input.iocType,
          severity: input.severity,
          confidence: input.confidence,
          description: input.description,
          tags: input.tags,
          source: input.source,
          mitre: input.mitre,
          content: input.content,
          contentLang: input.contentLang,
          updatedAt: now,
        });
        bump();
      } else {
        await addIntelItems([input]);
      }
      onClose();
    } catch (e) {
      setError('Error al guardar: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }, [title, kind, iocType, severity, confidence, description, tags, source, mitre, content, contentLang, initial, addIntelItems, bump, onClose]);

  const fieldLabel = kind === 'ioc' ? 'Valor del IoC *' : 'Título *';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={initial ? 'Editar item de Data & Intel' : 'Añadir item a Data & Intel'}
    >
      <div
        className="bg-[#0D0D0D] border border-[#262626] rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#0D0D0D] border-b border-[#262626] px-5 py-3 flex items-center justify-between">
          <div className="font-bold text-white text-sm flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            {initial ? `Editar ${kindLabel(initial.kind).toLowerCase()}` : 'Añadir a Data & Intel'}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#666] hover:text-white hover:bg-[#161616] cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-xs text-[#E5E5E5] flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#262626]">
          {/* Kind selector (disabled while editing — keeps the dedup key stable) */}
          <div className="flex gap-2">
            {(['ioc', 'event', 'rule'] as IntelKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                disabled={!!initial}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-[11px] font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed ${
                  kind === k
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                    : 'bg-[#161616] border-[#262626] text-[#888] hover:text-[#DDD]'
                }`}
              >
                {kindIcon(k)} {kindLabel(k)}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1" htmlFor="intel-title">
              {fieldLabel}
            </label>
            <input
              id="intel-title"
              autoFocus
              className={`${INPUT_CLS} ${kind === 'ioc' ? 'font-mono' : ''}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === 'ioc' ? '1.2.3.4 · dominio.com · hash…' : 'Título descriptivo'}
              spellCheck={false}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {kind === 'ioc' && (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1" htmlFor="intel-ioctype">Tipo de IoC</label>
                  <select id="intel-ioctype" className={INPUT_CLS} value={iocType} onChange={(e) => setIocType(e.target.value)}>
                    {IOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1" htmlFor="intel-confidence">Confianza</label>
                  <select id="intel-confidence" className={INPUT_CLS} value={confidence} onChange={(e) => setConfidence(e.target.value)}>
                    <option value="">—</option>
                    {CONFIDENCES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </>
            )}
            {kind !== 'ioc' && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1" htmlFor="intel-severity">Severidad</label>
                <select id="intel-severity" className={INPUT_CLS} value={severity} onChange={(e) => setSeverity(e.target.value)}>
                  <option value="">—</option>
                  {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            {kind === 'rule' && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1" htmlFor="intel-lang">Lenguaje</label>
                <select id="intel-lang" className={INPUT_CLS} value={contentLang} onChange={(e) => setContentLang(e.target.value)}>
                  {RULE_LANGS.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1" htmlFor="intel-source">Fuente</label>
              <input
                id="intel-source"
                className={INPUT_CLS}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="manual / tool / import"
              />
            </div>
          </div>

          {(kind === 'rule' || kind === 'event') && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1" htmlFor="intel-content">
                {kind === 'rule' ? 'Cuerpo (query / YAML)' : 'Detalle del evento'}
              </label>
              <textarea
                id="intel-content"
                className={`${INPUT_CLS} resize-y min-h-[140px] font-mono`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                spellCheck={false}
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1" htmlFor="intel-desc">Descripción / contexto</label>
            <textarea
              id="intel-desc"
              className={`${INPUT_CLS} resize-y min-h-[70px]`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1" htmlFor="intel-tags">Tags (coma)</label>
              <input id="intel-tags" className={INPUT_CLS} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="phishing, apt29" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1" htmlFor="intel-mitre">MITRE (coma)</label>
              <input id="intel-mitre" className={`${INPUT_CLS} font-mono`} value={mitre} onChange={(e) => setMitre(e.target.value)} placeholder="T1566, T1110" />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/5 border border-red-500/30 rounded p-2.5 flex items-center gap-1.5 text-[11px] text-red-300">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-[#0D0D0D] border-t border-[#262626] px-5 py-3 flex gap-2 justify-end">
          <button onClick={onClose} className={BTN_NEUTRAL}>Cancelar</button>
          <button onClick={handleSave} disabled={saving || title.trim() === ''} className={BTN_PRIMARY}>
            <CheckCircle2 className="w-3.5 h-3.5" /> {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================= */
/* CSV helper                                                       */
/* ============================================================= */
function csvEscape(v: string): string {
  return '"' + v.replace(/"/g, '""') + '"';
}

function intelItemsToCsv(items: IntelItem[]): string {
  const header = ['kind', 'value_title', 'ioc_type', 'confidence', 'severity', 'tags', 'mitre', 'source', 'description', 'created_at', 'updated_at'];
  const lines = [header.join(',')];
  for (const it of items) {
    lines.push([
      it.kind,
      it.title,
      it.iocType ?? '',
      it.confidence ?? '',
      it.severity ?? '',
      (it.tags ?? []).join(' '),
      (it.mitre ?? []).join(' '),
      it.source ?? '',
      it.description ?? '',
      it.createdAt,
      it.updatedAt,
    ].map((f) => csvEscape(String(f))).join(','));
  }
  return lines.join('\r\n');
}

/* ============================================================= */
/* Main component                                                   */
/* ============================================================= */
export const DataIntelDatasets: React.FC = () => {
  const items: IntelItem[] =
    useLiveQuery(() => db.intelItems.orderBy('updatedAt').reverse().toArray(), [], EMPTY_INTEL) ?? EMPTY_INTEL;
  // NOTE reactivity: every intelStore action writes to Dexie, which makes the
  // useLiveQuery above re-emit — items added from ANY tool (IoC Extractor,
  // Sigma Explorer, Detection Query Helper) appear here instantly, without a
  // refresh. The store also exposes `version`/`lastAdded` for consumers that
  // don't want to query the table.
  const addIntelItems = useIntelStore((s) => s.addIntelItems);
  const bump = useIntelStore((s) => s.bump);

  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ item: IntelItem | null } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  // Counters (computed from the live array).
  const counts = useMemo(() => {
    const c = { all: items.length, ioc: 0, event: 0, rule: 0 };
    for (const it of items) c[it.kind]++;
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = items;
    if (kindFilter !== 'all') base = base.filter((it) => it.kind === kindFilter);
    if (!q) return base;
    return base.filter((it) => {
      const haystack = [
        it.title,
        it.iocType ?? '',
        it.description ?? '',
        it.source ?? '',
        (it.tags ?? []).join(' '),
        (it.mitre ?? []).join(' '),
        it.content ?? '',
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [items, kindFilter, query]);

  const flash = useCallback((text: string) => {
    setMsg(text);
    setTimeout(() => setMsg((m) => (m === text ? null : m)), 4000);
  }, []);

  const handleDelete = useCallback(async (it: IntelItem) => {
    if (!window.confirm(`¿Borrar ${kindLabel(it.kind).toLowerCase()} "${it.title}"?`)) return;
    try {
      await db.intelItems.delete(it.id);
      bump();
    } catch (e) {
      window.alert('Error al borrar: ' + (e instanceof Error ? e.message : String(e)));
    }
  }, [bump]);

  const stamp = new Date().toISOString().slice(0, 10);

  const handleExportJson = useCallback(() => {
    if (filtered.length === 0) return;
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, `vaultnotes-data-intel-${stamp}.json`);
  }, [filtered, stamp]);

  const handleExportCsv = useCallback(() => {
    const iocs = filtered.filter((it) => it.kind === 'ioc');
    if (iocs.length === 0) return;
    const blob = new Blob(['\uFEFF' + intelItemsToCsv(iocs)], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `vaultnotes-data-intel-iocs-${stamp}.csv`);
  }, [filtered, stamp]);

  /** Import accepts: the app's own .json export (IntelItem[]) OR a loose
   *  IoC array ({value, type, score, …} — e.g. the IoC Extractor export). */
  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const raw: unknown = JSON.parse(await f.text());
      const rows: unknown[] = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { items?: unknown[] })?.items)
          ? (raw as { items: unknown[] }).items
          : [raw];
      const inputs: IntelItemInput[] = [];
      let ignored = 0;
      for (const row of rows) {
        if (typeof row !== 'object' || row === null) { ignored++; continue; }
        const r = row as Record<string, unknown>;
        const kind = r.kind === 'event' || r.kind === 'rule' ? r.kind : 'ioc';
        // App export format: {kind, title, …}
        if (typeof r.title === 'string' && r.title.trim()) {
          inputs.push({
            kind,
            title: r.title,
            iocType: typeof r.iocType === 'string' ? r.iocType : undefined,
            severity: typeof r.severity === 'string' ? r.severity : undefined,
            confidence: typeof r.confidence === 'string' ? r.confidence : undefined,
            description: typeof r.description === 'string' ? r.description : undefined,
            tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
            source: typeof r.source === 'string' ? r.source : 'import',
            mitre: Array.isArray(r.mitre) ? r.mitre.map(String) : [],
            content: typeof r.content === 'string' ? r.content : undefined,
            contentLang: typeof r.contentLang === 'string' ? r.contentLang : undefined,
          });
        // Loose IoC format: {value, type, …}
        } else if (typeof r.value === 'string' && r.value.trim()) {
          inputs.push({
            kind: 'ioc',
            title: r.value,
            iocType: typeof r.type === 'string' ? r.type : undefined,
            confidence: typeof r.score === 'string' ? r.score : undefined,
            description: typeof r.classification === 'string' ? r.classification : undefined,
            tags: [],
            source: 'import',
          });
        } else {
          ignored++;
        }
      }
      if (inputs.length === 0) {
        flash('El archivo no contiene items reconocibles (se espera un array JSON).');
        return;
      }
      const res = await addIntelItems(inputs);
      const parts = [`${res.added} importado(s)`];
      if (res.skipped > 0) parts.push(`${res.skipped} duplicado(s) ignorado(s)`);
      if (res.invalid > 0 || ignored > 0) parts.push(`${res.invalid + ignored} inválido(s)`);
      flash(parts.join(' · ') + '.');
    } catch (err) {
      flash('Error al importar: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  }, [addIntelItems, flash]);

  const filterTabs: { id: KindFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Todos', count: counts.all },
    { id: 'ioc', label: 'IoCs', count: counts.ioc },
    { id: 'event', label: 'Eventos', count: counts.event },
    { id: 'rule', label: 'Reglas', count: counts.rule },
  ];

  return (
    <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
            Datasets — IoCs · Eventos · Reglas
          </span>
          <Database className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setEditing({ item: null })} className={BTN_PRIMARY}>
            <Plus className="w-3 h-3" /> Añadir
          </button>
          <button onClick={() => importRef.current?.click()} className={BTN_NEUTRAL}>
            <Upload className="w-3 h-3" /> Importar .json
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFile}
          />
          <button onClick={handleExportJson} disabled={filtered.length === 0} className={BTN_NEUTRAL}>
            <Download className="w-3 h-3" /> Export .json
          </button>
          <button onClick={handleExportCsv} disabled={filtered.filter((i) => i.kind === 'ioc').length === 0} className={BTN_NEUTRAL}>
            <Download className="w-3 h-3" /> IoCs .csv
          </button>
        </div>
      </div>

      {/* Filters + search */}
      <div className="flex items-center gap-2 flex-wrap">
        {filterTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setKindFilter(t.id)}
            className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-colors cursor-pointer ${
              kindFilter === t.id
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                : 'bg-[#161616] border-[#262626] text-[#888] hover:text-[#DDD]'
            }`}
          >
            {t.label} <span className="font-mono opacity-70">({t.count})</span>
          </button>
        ))}
        <div className="relative flex-1 min-w-[180px] ml-auto">
          <Search className="w-3.5 h-3.5 text-[#555] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            className={`${INPUT_CLS} pl-8`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en Data & Intel (valor, descripción, tags, MITRE…)"
            aria-label="Buscar en Data & Intel"
          />
        </div>
      </div>

      {msg && <p className="text-[11px] text-blue-300">{msg}</p>}

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-[11px] text-[#666] italic">
          {items.length === 0
            ? 'Sin items todavía. Añade IoCs/eventos/reglas manualmente, impórtalos desde un .json o envíalos desde las tools (IoC Extractor, Sigma Explorer, Detection Query Helper…).'
            : 'Ningún item coincide con el filtro actual.'}
        </p>
      ) : (
        <div className="max-h-[28rem] overflow-y-auto divide-y divide-[#1a1a1a] scrollbar-thin scrollbar-thumb-[#262626]">
          {filtered.map((it) => (
            <div key={it.id} className="py-2 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {kindIcon(it.kind)}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${kindBadgeCls(it.kind)}`}>
                  {kindLabel(it.kind)}
                </span>
                <span className={`text-xs text-white truncate max-w-[22rem] ${it.kind === 'ioc' ? 'font-mono' : ''}`} title={it.title}>
                  {it.title}
                </span>
                {it.iocType && <Chip>{it.iocType}</Chip>}
                {it.confidence && <Chip cls="bg-green-500/10 border-green-500/30 text-green-300">{it.confidence}</Chip>}
                {it.severity && (
                  <Chip cls={
                    it.severity === 'critical' || it.severity === 'high'
                      ? 'bg-red-500/10 border-red-500/30 text-red-300'
                      : it.severity === 'medium'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : 'bg-[#161616] border-[#262626] text-[#888]'
                  }>{it.severity}</Chip>
                )}
                {(it.mitre ?? []).slice(0, 4).map((m) => (
                  <Chip key={m} cls="bg-purple-500/10 border-purple-500/30 text-purple-300">{m}</Chip>
                ))}
                {(it.tags ?? []).slice(0, 3).map((t) => (
                  <Chip key={t}>{t}</Chip>
                ))}
                <span className="flex items-center gap-1 shrink-0 ml-auto">
                  <button
                    onClick={() => setEditing({ item: it })}
                    className="p-1 text-[#666] hover:text-blue-400 cursor-pointer"
                    title="Editar"
                    aria-label={`Editar ${kindLabel(it.kind)}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => void handleDelete(it)}
                    className="p-1 text-[#666] hover:text-red-400 cursor-pointer"
                    title="Borrar"
                    aria-label={`Borrar ${kindLabel(it.kind)}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>
              {(it.description || it.source || it.contentLang) && (
                <div className="flex items-center gap-2 flex-wrap pl-6 text-[10px] text-[#777]">
                  {it.source && <span className="italic">fuente: {it.source}</span>}
                  {it.contentLang && <span className="font-mono uppercase">{it.contentLang}</span>}
                  {it.description && <span className="truncate max-w-[38rem]" title={it.description}>{it.description}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-[#666] leading-relaxed pt-2 border-t border-[#1a1a1a]">
        Los items viajan en el backup ZIP (intelItems.json) y se pueden exportar/importar por
        separado. Los duplicados evidentes se ignoran automáticamente (mismo valor+tipo, o misma
        regla+título). 100% offline.
      </p>

      {editing && <IntelEditModal initial={editing.item} onClose={() => setEditing(null)} />}
    </div>
  );
};
