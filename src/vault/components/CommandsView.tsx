import React, { useMemo, useState } from 'react';
import Fuse, { type IFuseOptions } from 'fuse.js';
import {
  Search, X, ArrowLeft, Copy, CheckCircle2, AlertTriangle, Terminal,
  HelpCircle, Lightbulb, ListOrdered, FileText, ChevronRight, Info,
  SquareTerminal, Link2,
} from 'lucide-react';
import {
  type VaultCommand, type CommandPillarKey, type CommandLevel,
  COMMAND_PILLAR_META, COMMAND_LEVEL_META, validateCommandCorpus,
} from '../data/commandsCore';
import { COMMANDS_HD, COMMANDS_HD_COUNT } from '../data/commandsHelpDesk';
import { COMMANDS_IAM, COMMANDS_IAM_COUNT } from '../data/commandsIam';
import { COMMANDS_SOC, COMMANDS_SOC_COUNT } from '../data/commandsSoc';

/**
 * CommandsView — los comandos más usados de HelpDesk, IAM y SOC.
 *
 * Cada entrada responde: qué hace, por qué/cuándo usarlo, sintaxis, casos
 * de uso, ejemplos copiables, cómo leer la salida, tips y comandos
 * relacionados. FLUJO: BUSCAR → ABRIR → ENTENDER → COPIAR → EJECUTAR.
 * 100% offline, dataset estático, sin input del usuario.
 *
 * Prioridad del usuario (orden por defecto): HelpDesk y IAM primero,
 * SOC después; dentro de cada pilar: esencial > frecuente > situacional.
 */

export const COMMANDS_TOTAL = COMMANDS_HD_COUNT + COMMANDS_IAM_COUNT + COMMANDS_SOC_COUNT;

interface CommandsViewProps {
  /** Deep-link desde Ctrl+K: id de comando a pre-seleccionar (CMD-XX-NNN). */
  autoSelectId?: string | null;
  /** Consumar el deep-link (App limpia su estado tras montar la vista). */
  onConsumeAutoSelect?: () => void;
}

/* ------------------------------------------------------------------ */
/* Datos + orden por defecto                                           */
/* ------------------------------------------------------------------ */

const ALL_COMMANDS: VaultCommand[] = [...COMMANDS_HD, ...COMMANDS_IAM, ...COMMANDS_SOC];

// Guard de integridad del corpus completo: TODA referencia cruzada
// (incluidas las entre pilares: CMD-HD → CMD-SOC) debe existir. Si un
// dataset futuro rompe un related, esto revienta aquí (error boundary)
// en vez de dejar un botón fantasma silencioso.
validateCommandCorpus(ALL_COMMANDS);

const PILLAR_ORDER: Record<CommandPillarKey, number> = {
  HELPDESK: COMMAND_PILLAR_META.HELPDESK.order,
  IAM: COMMAND_PILLAR_META.IAM.order,
  SOC: COMMAND_PILLAR_META.SOC.order,
};
const LEVEL_ORDER: Record<CommandLevel, number> = {
  esencial: COMMAND_LEVEL_META.esencial.order,
  frecuente: COMMAND_LEVEL_META.frecuente.order,
  situacional: COMMAND_LEVEL_META.situacional.order,
};

/** Orden por defecto: pilar (HD → IAM → SOC) → nivel → id numérico. */
function defaultSort(a: VaultCommand, b: VaultCommand): number {
  const p = PILLAR_ORDER[a.pillar] - PILLAR_ORDER[b.pillar];
  if (p !== 0) return p;
  const l = LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
  if (l !== 0) return l;
  return a.id.localeCompare(b.id, undefined, { numeric: true });
}

const SORTED_COMMANDS = [...ALL_COMMANDS].sort(defaultSort);

const PILLAR_COUNTS: { key: CommandPillarKey; count: number }[] = [
  { key: 'HELPDESK', count: COMMANDS_HD_COUNT },
  { key: 'IAM', count: COMMANDS_IAM_COUNT },
  { key: 'SOC', count: COMMANDS_SOC_COUNT },
];

const FUSE_OPTIONS: IFuseOptions<VaultCommand> = {
  keys: [
    { name: 'command', weight: 0.32 },
    { name: 'title', weight: 0.2 },
    { name: 'keywords', weight: 0.16 },
    { name: 'what', weight: 0.1 },
    { name: 'why', weight: 0.07 },
    { name: 'use_cases', weight: 0.08 },
    { name: 'syntax', weight: 0.04 },
    { name: 'category', weight: 0.02 },
    { name: 'shell', weight: 0.01 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
};

/* ------------------------------------------------------------------ */
/* Piezas reutilizables                                                */
/* ------------------------------------------------------------------ */

/** Bloque de comando copiable (idéntico look al de RunbooksView). */
const CopyableCommand: React.FC<{ text: string; note?: string; big?: boolean }> = ({ text, note, big }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <div className="bg-[#0A0A0A] border border-[#262626] rounded p-2 flex items-start justify-between gap-2 group">
        <code className={`font-mono text-emerald-300 break-all leading-relaxed flex-1 min-w-0 ${big ? 'text-xs' : 'text-[10.5px]'}`}>
          {text}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="p-1 rounded text-[#858585] hover:text-blue-400 hover:bg-[#161616] transition-colors shrink-0 cursor-pointer"
          title="Copiar comando"
          aria-label="Copiar comando"
        >
          {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      {note && <p className="text-[10.5px] text-[#858585] leading-relaxed pl-1">{note}</p>}
    </div>
  );
};

const Chip: React.FC<{ text: string; chip: string; title?: string }> = ({ text, chip, title }) => (
  <span
    title={title}
    className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${chip}`}
  >
    {text}
  </span>
);

const DetailBlock: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  accent?: string;
}> = ({ icon, title, children, accent }) => (
  <div className="flex flex-col gap-2">
    <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${accent ?? 'text-[#828282]'}`}>
      {icon}
      {title}
    </span>
    {children}
  </div>
);

/** Detalle completo de un comando. */
const CommandDetail: React.FC<{
  cmd: VaultCommand;
  onSelectId: (id: string) => void;
}> = ({ cmd, onSelectId }) => {
  const pMeta = COMMAND_PILLAR_META[cmd.pillar];
  const lMeta = COMMAND_LEVEL_META[cmd.level];
  const related = useMemo(
    () => (cmd.related ?? []).map((id) => ALL_COMMANDS.find((c) => c.id === id)).filter((c): c is VaultCommand => !!c),
    [cmd.related]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Encabezado: badges + comando canónico */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono text-[#828282]">{cmd.id}</span>
          <Chip text={pMeta.short} chip={pMeta.chip} title={pMeta.label} />
          <Chip text={cmd.shell} chip="bg-[#161616] text-[#868686] border-[#262626]" title={`Se ejecuta en: ${cmd.shell}`} />
          <Chip text={cmd.category} chip="bg-[#161616] text-[#868686] border-[#262626]" />
          <Chip text={lMeta.label} chip={lMeta.chip} title={`Nivel de uso: ${lMeta.label}`} />
        </div>
        <h2 className="text-base font-bold text-white leading-snug">{cmd.title}</h2>
        <CopyableCommand text={cmd.command} big />
      </div>

      {/* Qué hace + Por qué / Cuándo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#828282] flex items-center gap-1.5 mb-1">
            <Info className="w-3 h-3" /> ¿Qué hace?
          </span>
          <p className="text-[11px] text-[#BBB] leading-relaxed">{cmd.what}</p>
        </div>
        <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#828282] flex items-center gap-1.5 mb-1">
            <HelpCircle className="w-3 h-3" /> ¿Por qué / cuándo?
          </span>
          <p className="text-[11px] text-[#BBB] leading-relaxed">{cmd.why}</p>
        </div>
      </div>

      {/* Sintaxis */}
      <DetailBlock icon={<SquareTerminal className="w-3 h-3" />} title="Sintaxis">
        <CopyableCommand text={cmd.syntax} />
      </DetailBlock>

      {/* Casos de uso */}
      <DetailBlock icon={<ListOrdered className="w-3 h-3" />} title="Casos de uso">
        <ul className="flex flex-col gap-1">
          {cmd.use_cases.map((u, i) => (
            <li key={i} className="text-[10.5px] text-[#AAA] leading-relaxed flex items-start gap-1.5">
              <span className="text-amber-400/60 shrink-0">▸</span><span>{u}</span>
            </li>
          ))}
        </ul>
      </DetailBlock>

      {/* Ejemplos */}
      <DetailBlock
        icon={<Terminal className="w-3 h-3" />}
        title="Ejemplos copiables"
        accent={pMeta.accentText}
      >
        <div className="flex flex-col gap-2.5">
          {cmd.examples.map((ex, i) => (
            <CopyableCommand key={i} text={ex.cmd} note={ex.note} />
          ))}
        </div>
      </DetailBlock>

      {/* Cómo leer la salida */}
      {cmd.output && (
        <DetailBlock icon={<FileText className="w-3 h-3" />} title="Cómo leer la salida">
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3">
            <p className="text-[10.5px] text-[#BBB] leading-relaxed">{cmd.output}</p>
          </div>
        </DetailBlock>
      )}

      {/* Tips y errores comunes */}
      <DetailBlock icon={<Lightbulb className="w-3 h-3" />} title="Tips y errores comunes">
        <ul className="flex flex-col gap-1">
          {cmd.tips.map((t, i) => (
            <li key={i} className="text-[10.5px] text-[#AAA] leading-relaxed flex items-start gap-1.5">
              <span className="text-sky-400/60 shrink-0">▸</span><span>{t}</span>
            </li>
          ))}
        </ul>
      </DetailBlock>

      {/* Comandos relacionados */}
      {related.length > 0 && (
        <DetailBlock icon={<Link2 className="w-3 h-3" />} title="Comandos relacionados">
          <div className="flex flex-col gap-1.5">
            {related.map((r) => {
              const rMeta = COMMAND_PILLAR_META[r.pillar];
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onSelectId(r.id)}
                  className="text-left bg-[#0D0D0D] border border-[#262626] hover:border-[#333] rounded p-2 flex items-center gap-2 transition-colors cursor-pointer group"
                >
                  <ChevronRight className="w-3 h-3 text-[#555] group-hover:text-white transition-colors shrink-0" />
                  <code className="text-[10.5px] font-mono text-emerald-300/90 break-all">{r.command}</code>
                  <span className="flex-1" />
                  <span className={`text-[9px] font-mono shrink-0 ${rMeta.accentText}`}>{rMeta.short}</span>
                </button>
              );
            })}
          </div>
        </DetailBlock>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Vista principal                                                     */
/* ------------------------------------------------------------------ */

export const CommandsView: React.FC<CommandsViewProps> = ({ autoSelectId, onConsumeAutoSelect }) => {
  const [query, setQuery] = useState('');
  const [pillar, setPillar] = useState<CommandPillarKey | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [level, setLevel] = useState<CommandLevel | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fuse = useMemo(() => new Fuse(ALL_COMMANDS, FUSE_OPTIONS), []);

  // Deep-link desde Ctrl+K — patrón "derived state during render" con
  // guard de valor previo (idéntico a RunbooksView).
  const [prevAutoSelect, setPrevAutoSelect] = useState<string | null | undefined>(undefined);
  if (autoSelectId !== prevAutoSelect) {
    setPrevAutoSelect(autoSelectId);
    if (autoSelectId) setSelectedId(autoSelectId);
  }
  React.useEffect(() => {
    if (autoSelectId) onConsumeAutoSelect?.();
  }, [autoSelectId, onConsumeAutoSelect]);

  // Categorías disponibles según el pilar activo (para no mostrar las 20
  // categorías de los 3 pilares a la vez).
  const availableCategories = useMemo(() => {
    const source = pillar ? ALL_COMMANDS.filter((c) => c.pillar === pillar) : ALL_COMMANDS;
    const seen = new Set<string>();
    for (const c of source) seen.add(c.category);
    return [...seen];
  }, [pillar]);

  // Al cambiar de pilar, la categoría activa se limpia DURANTE el render
  // (patrón "derived state" con guard de valor previo — idéntico al
  // deep-link; evita el setState-in-effect del linter). Las categorías
  // mostradas cambian con el pilar: una categoría vieja fuera de contexto
  // dejaría la lista vacía sin explicación.
  const [prevPillarForCategory, setPrevPillarForCategory] = useState<CommandPillarKey | null | undefined>(undefined);
  if (pillar !== prevPillarForCategory) {
    setPrevPillarForCategory(pillar);
    setCategory(null);
  }

  const filtered = useMemo(() => {
    let list: VaultCommand[];
    const q = query.trim().toLowerCase();
    if (q.length >= 2) {
      list = fuse.search(q).map((r) => r.item);
    } else {
      list = SORTED_COMMANDS;
    }
    if (pillar) list = list.filter((c) => c.pillar === pillar);
    if (category) list = list.filter((c) => c.category === category);
    if (level) list = list.filter((c) => c.level === level);
    return list;
  }, [query, pillar, category, level, fuse]);

  const selected = useMemo(() => ALL_COMMANDS.find((c) => c.id === selectedId) ?? null, [selectedId]);

  const selectId = (id: string) => setSelectedId(id);

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0A0A0A] h-[calc(100vh-48px)]">
      {/* ── Lista (izquierda) ─────────────────────────────────────────── */}
      <div
        className={`${selected ? 'hidden md:flex' : 'flex'} w-full md:w-[320px] md:min-w-[280px] border-r border-[#262626] flex-col h-full`}
      >
        <div className="p-4 pb-3 border-b border-[#262626] flex flex-col gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <SquareTerminal className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-base font-bold text-white tracking-tight leading-tight truncate">Comandos más usados</h1>
              <p className="text-[11px] text-[#858585] font-mono">
                {COMMANDS_TOTAL} comandos · HelpDesk · IAM · SOC
              </p>
            </div>
          </div>

          {/* Búsqueda */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#828282] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar: «ipconfig», «gpupdate», «4625», «assume-role»…"
              aria-label="Buscar comandos"
              className="w-full bg-[#161616] border border-[#262626] rounded-md pl-8 pr-8 py-2 text-xs text-white placeholder:text-[#828282] focus:outline-none focus:border-emerald-500/40"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#828282] hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por pilar (prioridad del usuario: HD e IAM primero) */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setPillar(null)}
              className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                pillar === null
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'text-[#868686] border-[#262626] hover:text-white hover:border-[#333]'
              }`}
            >
              Todos · {COMMANDS_TOTAL}
            </button>
            {PILLAR_COUNTS.map(({ key, count }) => {
              const meta = COMMAND_PILLAR_META[key];
              const active = pillar === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPillar(active ? null : key)}
                  className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                    active ? meta.chip : 'text-[#868686] border-[#262626] hover:text-white hover:border-[#333]'
                  }`}
                  title={meta.label}
                >
                  {meta.short} · {count}
                </button>
              );
            })}
          </div>

          {/* Nivel de uso */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setLevel(null)}
              className={`px-2 py-0.5 rounded text-[9px] font-semibold border transition-colors cursor-pointer ${
                level === null
                  ? 'bg-[#262626] text-white border-[#333]'
                  : 'text-[#777] border-[#262626] hover:text-white'
              }`}
            >
              Nivel: todos
            </button>
            {(Object.keys(COMMAND_LEVEL_META) as CommandLevel[]).map((lv) => {
              const meta = COMMAND_LEVEL_META[lv];
              const active = level === lv;
              return (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setLevel(active ? null : lv)}
                  className={`px-2 py-0.5 rounded text-[9px] font-semibold border transition-colors cursor-pointer ${
                    active ? meta.chip : 'text-[#777] border-[#262626] hover:text-white'
                  }`}
                  title={`Comandos de uso ${meta.label.toLowerCase()}`}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>

          {/* Categorías del pilar activo (max-h por regla de listas largas) */}
          <div className="flex flex-wrap gap-1.5 max-h-[84px] overflow-y-auto">
            {availableCategories.map((c) => {
              const active = category === c;
              const meta = pillar ? COMMAND_PILLAR_META[pillar] : null;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(active ? null : c)}
                  className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                    active
                      ? meta
                        ? `${meta.accentBg} ${meta.accentText} ${meta.accentBorder}`
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'text-[#868686] border-[#262626] hover:text-white hover:border-[#333]'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-[#858585]">
            {filtered.length} de {COMMANDS_TOTAL} comandos
            {query && <> · búsqueda fuzzy activa</>}
          </p>
        </div>

        {/* Lista scrolleable */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#828282] gap-2 text-center px-4">
              <AlertTriangle className="w-10 h-10 text-[#2a2a2a]" />
              <p className="text-xs text-[#868686]">Sin resultados para «{query}»</p>
              <p className="text-[10px] text-[#828282]">
                Prueba con el comando tal cual lo teclearías (ipconfig, klist, assume-role…) o quita filtros.
              </p>
            </div>
          ) : (
            filtered.map((c) => {
              const pMeta = COMMAND_PILLAR_META[c.pillar];
              const active = selectedId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-4 py-2.5 border-b border-[#161616] transition-colors cursor-pointer ${
                    active ? `${pMeta.accentBg} border-l-2 border-l-current ${pMeta.accentText}` : 'hover:bg-[#111] border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[9px] font-mono uppercase ${active ? pMeta.accentText : 'text-[#828282]'}`}>
                      {pMeta.short}
                    </span>
                    <span className="text-[8.5px] font-mono px-1 py-0.5 rounded border bg-[#161616] text-[#858585] border-[#262626]">
                      {c.shell}
                    </span>
                    {c.level === 'esencial' && (
                      <span className="text-[8.5px] font-mono uppercase px-1 py-0.5 rounded border bg-amber-500/10 text-amber-300 border-amber-500/30">
                        esencial
                      </span>
                    )}
                  </div>
                  <code className={`text-[11.5px] font-mono block leading-snug break-all ${active ? 'text-white' : 'text-emerald-300/90'}`}>
                    {c.command}
                  </code>
                  <p className={`text-[10.5px] leading-snug mt-0.5 ${active ? 'text-white/80' : 'text-[#999]'}`}>
                    {c.title}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Detalle (derecha) ─────────────────────────────────────────── */}
      <div className={`${selected ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-hidden`}>
        {selected ? (
          <>
            <div className="px-4 py-2.5 border-b border-[#262626] bg-[#0D0D0D] flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="md:hidden flex items-center gap-1 text-[11px] text-[#888] hover:text-white cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Volver
              </button>
              <span className="text-[11px] text-[#858585] font-mono hidden md:block truncate">
                {selected.id} · {selected.title}
              </span>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => {
                  const full = [
                    selected.command,
                    `# ${selected.title} (${selected.id} · ${COMMAND_PILLAR_META[selected.pillar].short} · ${selected.level})`,
                    '',
                    `QUÉ HACE: ${selected.what}`,
                    `POR QUÉ / CUÁNDO: ${selected.why}`,
                    '',
                    `SINTAXIS: ${selected.syntax}`,
                    '',
                    'EJEMPLOS:',
                    ...selected.examples.map((e) => `  ${e.cmd}${e.note ? `   # ${e.note}` : ''}`),
                    selected.output ? `\nSALIDA: ${selected.output}` : '',
                    '\nTIPS:',
                    ...selected.tips.map((t) => `  - ${t}`),
                  ].join('\n');
                  navigator.clipboard?.writeText(full);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-[10px] font-semibold transition-colors cursor-pointer shrink-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:opacity-80"
                title="Copiar el comando completo (qué hace + sintaxis + ejemplos + tips)"
              >
                <FileText className="w-3 h-3" /> Copiar ficha
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-5 max-w-3xl">
              <CommandDetail cmd={selected} onSelectId={selectId} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#828282] gap-3 p-8 text-center">
            <SquareTerminal className="w-12 h-12 text-[#2a2a2a]" />
            <p className="text-sm text-[#868686]">Selecciona un comando de la lista</p>
            <p className="text-xs text-[#828282] max-w-sm leading-relaxed">
              {COMMANDS_TOTAL} comandos de HelpDesk, IAM y SOC: qué hace cada uno, por qué y cuándo usarlo,
              sintaxis, ejemplos copiables, cómo leer la salida y errores comunes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
