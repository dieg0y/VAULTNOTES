/**
 * HdGpoTool.tsx — GPO Result Helper (HelpDesk FASE 2, grupo B).
 *
 * Guía de lectura/diagnóstico de gpresult: cómo ejecutarlo (ámbito user vs
 * computer, informe HTML), cómo interpretar Applied / Denied (Security) /
 * Denied (Incomplete) y precedencia LSDOU; síntomas comunes de "la GPO no
 * llega" (security filtering, WMI filter, herencia bloqueada, slow link,
 * loopback) con qué verificar en el informe; y lookup de eventos útiles del
 * log GroupPolicy Operational.
 *
 * SOLO lectura/diagnóstico: banner permanente — el HelpDesk NO modifica GPOs,
 * cualquier cambio se escala a administración de sistemas.
 *
 * [Añadir a Notas] exporta el checklist de escalamiento con
 * buildNoteHtmlTable + escapeHtml.
 *
 * 100% offline. Sin fetch/XHR/WebSocket/eval. Spec reference: Task ID 2-b.
 */
'use client';

import React, { useState } from 'react';
import {
  Terminal, BookOpen, Layers, Activity, ShieldAlert, ChevronDown,
  CheckSquare, Square, FileText, RotateCcw, Network,
} from 'lucide-react';
import {
  btnPrimary, btnGhost, Tabs, CodeBlock, InfoBanner, ErrorBanner,
  buildNoteHtmlTable, useAddToNoteToast,
} from '../_shared';
import { escapeHtml } from '../../../utils/escapeHtml';
import { useNoteStore } from '../../../store/noteStore';

/* ---------- tipos ---------- */

interface GpoSymptom {
  id: string;
  title: string;
  causes: string[];
  check: string;
}

interface GpoEvent {
  id: string;
  title: string;
  detail: string;
}

/* ---------- datos ---------- */

const SYMPTOMS: GpoSymptom[] = [
  {
    id: 'drive',
    title: 'Unidad mapeada desaparecida',
    causes: [
      'Security filtering: el usuario/grupo quedó fuera del ámbito de la GPO.',
      'La GPO aparece en "Denied" del gpresult.',
      'Slow link: la extensión Drive Maps es sensible a la detección de enlace lento y no aplica por VPN.',
      'Loopback processing interfiriendo con la parte de usuario.',
    ],
    check: 'En gpresult /h: la GPO de unidades en "Applied Group Policy Objects" del ámbito USER; el usuario dentro del Security Filtering de la GPO; y si hay aviso de slow link.',
  },
  {
    id: 'wallpaper',
    title: 'Fondo de pantalla no aplica',
    causes: [
      'La GPO de escritorio no está en "Applied" (security filtering / WMI filter).',
      'Herencia bloqueada (Block Inheritance) en la OU del usuario.',
      'OU incorrecta: el usuario no está donde se cree que está.',
    ],
    check: 'En gpresult /h (scope user): buscar la GPO de escritorio en Applied o en Denied con el motivo exacto; confirmar la OU del usuario en el propio informe.',
  },
  {
    id: 'script',
    title: 'Script de inicio no corre',
    causes: [
      'Denied (Incomplete): la GPO aún no se replicó en el DC consultado.',
      'Security filtering excluye al equipo (script de inicio = ámbito COMPUTER).',
      'Herencia bloqueada en la OU del equipo.',
      'El script falla al ejecutar (ruta, permisos o sintaxis): la GPO sí aplica.',
    ],
    check: 'En gpresult /h (scope computer): la GPO del script en Applied; y en el log GroupPolicy Operational, eventos de error del CSE de scripts al inicio.',
  },
  {
    id: 'firewall',
    title: 'Firewall distinto a lo esperado',
    causes: [
      'GPO de firewall no aplicada al equipo (WMI filter o security filtering).',
      'Conflicto de precedencia: otra GPO más profunda (OU anidada) toca las mismas reglas y gana.',
      'Regla local en el equipo porque la GPO define "no configurado" en ese valor.',
    ],
    check: 'En gpresult /h (scope computer): qué GPO de firewall aparece en Applied y con qué precedencia (última aplicada gana la misma configuración).',
  },
  {
    id: 'restrictions',
    title: 'Restricciones no llegan al usuario',
    causes: [
      'Loopback processing (replace/merge): las políticas de EQUIPO están pisando las de USUARIO.',
      'Herencia bloqueada en la OU.',
      'El usuario/equipo está en otra OU de la que se cree.',
    ],
    check: 'En el informe: modo de Loopback Processing activo, OU real del usuario y del equipo, y la lista Denied con el motivo de cada GPO.',
  },
];

const GP_EVENTS: GpoEvent[] = [
  {
    id: '7016',
    title: '7016 — procesamiento lento de Directiva de grupo',
    detail: 'Una extensión tardó más de lo esperado; suele acompañar a la detección de slow link (VPN) y explica políticas que no aplican por tiempo.',
  },
  {
    id: '1125',
    title: '1125 — no se pudo actualizar la configuración de seguridad',
    detail: 'El CSE de seguridad falló al aplicar políticas de seguridad: la máquina queda con la configuración anterior. Reintenta gpupdate y revisa replicación (L2 si persiste).',
  },
  {
    id: '1126',
    title: '1126 — no se pudieron aplicar componentes de Directiva de grupo',
    detail: 'Fallo general de aplicación de componentes GP: la GPO está enlazada pero no se pudo leer/aplicar. Suele ir de la mano de "Denied (Incomplete)".',
  },
  {
    id: '6005',
    title: '6005 — inicio del servicio de registro de eventos',
    detail: 'En el registro System marca cada arranque: sirve para acotar desde cuándo se procesó la última política y correlacionar fallos con reinicios.',
  },
];

const ESCALATE_ITEMS = [
  'Informe gpresult /h GPO-Report.html generado EN el equipo afectado (adjuntarlo al ticket).',
  'Nombre exacto de la GPO implicada, tal como aparece en el informe.',
  'OU del usuario y OU del equipo (distinguishedName).',
  'Hora del último procesamiento de GP y eventos relevantes del log GroupPolicy Operational.',
  'Síntoma concreto: qué se esperaba que aplicara vs qué ocurre.',
];

/* ---------- subcomponentes ---------- */

const TAB_DEFS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: 'cmd', label: 'Comando', icon: <Terminal className="w-3.5 h-3.5" /> },
  { id: 'read', label: 'Cómo leerlo', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: 'symptoms', label: 'Síntomas comunes', icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'events', label: 'Eventos útiles', icon: <Activity className="w-3.5 h-3.5" /> },
];

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">{children}</div>
);

/** Card de síntoma colapsable. */
const SymptomCard: React.FC<{ s: GpoSymptom }> = ({ s }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[#0D0D0D] border border-[#262626] rounded overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title={`Desplegar: ${s.title}`}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[#161616] transition-colors cursor-pointer"
      >
        <span className="text-[11px] font-semibold text-white">{s.title}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#666] transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          <SectionLabel>Causas probables</SectionLabel>
          <ul className="space-y-1">
            {s.causes.map((c, i) => (
              <li key={i} className="text-[11px] text-[#DDD] leading-relaxed flex items-start gap-1.5">
                <span className="text-[#666] shrink-0">·</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
          <SectionLabel>Qué verificar en el informe</SectionLabel>
          <div className="bg-[#161616] border border-[#262626] rounded p-2 text-[11px] text-[#AAA] leading-relaxed">
            {s.check}
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------- componente principal ---------- */

export const HdGpoTool: React.FC = () => {
  const [tab, setTab] = useState<string>('cmd');
  const [captured, setCaptured] = useState<Record<string, boolean>>({});
  const { addedToast, showToast } = useAddToNoteToast();

  const toggle = (i: number): void =>
    setCaptured((prev) => ({ ...prev, [String(i)]: !prev[i] }));

  /** Exporta el checklist de escalamiento a Notas (todo escapado). */
  const addToNote = (): void => {
    const rows: Array<[string, string]> = [
      ['Ámbito', 'Escalamiento de GPO — datos capturados'],
      ...ESCALATE_ITEMS.map((it, i) => [String(i + 1), `${captured[String(i)] ? '[x]' : '[ ]'} ${it}`] as [string, string]),
      ['Regla', 'HelpDesk NO modifica GPOs: el cambio lo hace administración de sistemas.'],
    ];
    useNoteStore.getState().enqueueNote(
      'GPO Result Helper — escalamiento',
      buildNoteHtmlTable(rows.map(([k, v]) => [escapeHtml(k), escapeHtml(v)])),
    );
    showToast();
  };

  return (
    <div className="space-y-3">
      {/* Banner permanente de rol */}
      <ErrorBanner message="AYUDA SOLO para lectura/diagnóstico. El HelpDesk NO modifica GPOs — cualquier cambio se escala a administración de sistemas." />

      <Tabs tabs={TAB_DEFS} active={tab} onChange={setTab} />

      {/* ---------- Tab: Comando ---------- */}
      {tab === 'cmd' && (
        <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2.5">
          <SectionLabel>Comandos de gpresult</SectionLabel>
          <CodeBlock label="Resumen en consola (usuario + equipo)" code="gpresult /r" lang="cmd" />
          <CodeBlock label="Solo ámbito de usuario (sin elevar)" code="gpresult /r /scope:user" lang="cmd" />
          <CodeBlock label="Solo ámbito de equipo (requiere admin)" code="gpresult /r /scope:computer" lang="cmd" />
          <CodeBlock label="Informe HTML completo (legible en navegador)" code="gpresult /h GPO-Report.html /f" lang="cmd" />
          <div className="bg-[#161616] border border-[#262626] rounded p-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
                Dónde ejecutarlo
              </span>
            </div>
            <p className="text-[11px] text-[#AAA] leading-relaxed">
              SIEMPRE en el equipo afectado. Para el ámbito de{' '}
              <span className="text-blue-300 font-semibold">usuario</span>: CMD
              abierto como el propio usuario (sin elevar — elevado reportaría la
              cuenta del admin). Para el ámbito de{' '}
              <span className="text-blue-300 font-semibold">equipo</span> y para
              gpresult /h hace falta un CMD{' '}
              <span className="text-blue-300 font-semibold">elevado (admin)</span>.
            </p>
            <p className="text-[11px] text-[#888] leading-relaxed">
              gpupdate /force solo re-aplica políticas YA existentes (no es un
              cambio de GPO, es válido en L1); el /h se abre después en el
              navegador para adjuntarlo al ticket.
            </p>
          </div>
        </div>
      )}

      {/* ---------- Tab: Cómo leerlo ---------- */}
      {tab === 'read' && (
        <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
          {[
            {
              h: '"Applied Group Policy Objects"',
              b: 'Lista en ORDEN de aplicación. Cuando varias GPOs configuran el mismo valor, gana la ÚLTIMA aplicada — el orden de esta lista es la clave para resolver conflictos.',
            },
            {
              h: '"Denied (Security)"',
              b: 'La GPO está enlazada pero el usuario/equipo no está en su ámbito: security filtering (el grupo no tiene "Apply") o el objeto se filtró por seguridad. Es la causa #1 de "la GPO no me llega".',
            },
            {
              h: '"Denied (Incomplete)"',
              b: 'La GPO no se ha replicado todavía en el DC consultado o no se pudo leer. Reintentar tras un rato; si persiste, la replicación de AD es tema de L2/Infraestructura.',
            },
            {
              h: 'Precedencia LSDOU',
              b: 'Local → Site → Domain → OU (y OU más profunda al final). Para la misma configuración, gana la ÚLTIMA aplicada (la OU más profunda). En un mismo nivel de enlace, la de link order más bajo tiene precedencia. Block Inheritance y Enforced cambian el resultado: los valida administración de sistemas.',
            },
          ].map((r) => (
            <div key={r.h} className="bg-[#161616] border border-[#262626] rounded p-2.5 space-y-1">
              <div className="text-[11px] font-semibold text-blue-300">{r.h}</div>
              <p className="text-[11px] text-[#AAA] leading-relaxed">{r.b}</p>
            </div>
          ))}
          <InfoBanner>
            Regla práctica de L1: primero mira si la GPO esperada está en
            «Applied»; si está en «Denied», el motivo entre paréntesis te dice
            casi siempre la causa (Security, Incomplete, Empty).
          </InfoBanner>
        </div>
      )}

      {/* ---------- Tab: Síntomas comunes ---------- */}
      {tab === 'symptoms' && (
        <div className="space-y-2">
          <SectionLabel>Síntomas de «la GPO no llega» — causa probable y qué verificar</SectionLabel>
          {SYMPTOMS.map((s) => (
            <SymptomCard key={s.id} s={s} />
          ))}
        </div>
      )}

      {/* ---------- Tab: Eventos útiles ---------- */}
      {tab === 'events' && (
        <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2.5">
          <SectionLabel>Eventos de Group Policy — lookup rápido</SectionLabel>
          <div className="bg-[#161616] border border-[#262626] rounded p-2 text-[11px] text-[#888] leading-relaxed flex items-start gap-1.5">
            <Network className="w-3.5 h-3.5 text-[#666] shrink-0 mt-0.5" />
            <span>
              Log operativo: Visor de eventos → Applications and Services Logs →
              Microsoft → Windows → GroupPolicy → Operational.
            </span>
          </div>
          {GP_EVENTS.map((e) => (
            <div key={e.id} className="bg-[#161616] border border-[#262626] rounded p-2.5 space-y-1">
              <div className="text-[11px] font-semibold text-white">
                <code className="font-mono text-blue-300 mr-1.5">{e.id}</code>
                {e.title}
              </div>
              <p className="text-[11px] text-[#AAA] leading-relaxed">{e.detail}</p>
            </div>
          ))}
          <SectionLabel>Consulta desde PowerShell</SectionLabel>
          <CodeBlock
            label="Últimos eventos del log GroupPolicy"
            code={"Get-WinEvent -LogName 'Microsoft-Windows-GroupPolicy/Operational' -MaxEvents 30"}
            lang="ps"
          />
        </div>
      )}

      {/* Checklist de escalamiento (visible en todos los tabs) */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <SectionLabel>Qué datos capturar para escalar a administración de sistemas</SectionLabel>
        </div>
        <div className="bg-[#161616] border border-[#262626] rounded p-1.5">
          {ESCALATE_ITEMS.map((it, i) => (
            <button
              key={i}
              type="button"
              role="checkbox"
              aria-checked={Boolean(captured[String(i)])}
              onClick={() => toggle(i)}
              title={captured[String(i)] ? 'Marcar como pendiente' : 'Marcar como capturado'}
              className="w-full flex items-start gap-2 text-left p-1.5 rounded hover:bg-[#0D0D0D] transition-colors cursor-pointer"
            >
              {captured[String(i)] ? (
                <CheckSquare className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              ) : (
                <Square className="w-3.5 h-3.5 text-[#555] shrink-0 mt-0.5" />
              )}
              <span className={`text-[11px] leading-relaxed ${captured[String(i)] ? 'text-[#666] line-through' : 'text-[#DDD]'}`}>
                {it}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={addToNote} className={`${btnPrimary} inline-flex items-center gap-1.5`}>
            <FileText className="w-3.5 h-3.5" />
            Añadir checklist a Notas
          </button>
          <button
            type="button"
            onClick={() => setCaptured({})}
            className={`${btnGhost} inline-flex items-center gap-1.5`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar checklist
          </button>
        </div>
      </div>

      {addedToast && <InfoBanner>Añadido a Notas — crea una nota nueva para verlo.</InfoBanner>}
    </div>
  );
};

export default HdGpoTool;
