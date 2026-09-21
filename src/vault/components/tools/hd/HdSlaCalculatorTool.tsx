/**
 * HdSlaCalculatorTool.tsx — "SLA / Priority Calculator" (FASE 2 grupo A).
 *
 * Dos modos (Tabs):
 *  1. "Matriz": grid interactivo 3×3 (Impacto filas × Urgencia columnas).
 *     Click en celda → P1-P4 según la matriz estándar (alta/alta=P1,
 *     alta/media y media/alta=P2, media/media y bordes=P3, resto P4) +
 *     descripción del nivel + SLA asociado.
 *  2. "Calculadora": inputs por prioridad (respuesta/resolución en minutos,
 *     defaults educativos 15m/4h, 30m/8h, 4h/24h, 8h/72h) + cronómetro de
 *     cumplimiento: hora de apertura (input type=time) + prioridad → hora
 *     límite de respuesta y resolución (Date math pura) con indicador
 *     verde/ámbar/rojo contra la hora local del navegador.
 *
 * Ambos modos exportan a Notas (buildNoteHtmlTable) e Intel (kind event,
 * markdown). Todo educativo y 100% offline.
 */
'use client';

import React, { useState } from 'react';
import { LayoutGrid, Calculator, Clock, BookOpen, Database } from 'lucide-react';
import { useNoteStore } from '../../../store/noteStore';
import { useIntelStore } from '../../../store/intelStore';
import {
  btnPrimary, btnGhost, Row, InfoBanner, Tabs, Field,
  buildNoteHtmlTable, useAddToNoteToast,
} from '../_shared';
import { escapeHtml } from '../../../utils/escapeHtml';

/* ---------- tipos y constantes ---------- */

type Priority = 'P1' | 'P2' | 'P3' | 'P4';
type Level3 = 'alta' | 'media' | 'baja';
type SlaSpec = { response: number; resolution: number };
type SlaTable = Record<Priority, SlaSpec>;

const DEFAULT_SLA: SlaTable = {
  P1: { response: 15, resolution: 240 },   // 15 m / 4 h
  P2: { response: 30, resolution: 480 },   // 30 m / 8 h
  P3: { response: 240, resolution: 1440 }, // 4 h / 24 h
  P4: { response: 480, resolution: 4320 }, // 8 h / 72 h
};

const LEVELS: Level3[] = ['alta', 'media', 'baja'];

/** Matriz estándar: alta/alta=P1, alta/media y media/alta=P2, media/media y bordes=P3, resto P4. */
function priorityMatrix(impact: Level3, urgency: Level3): Priority {
  if (impact === 'alta' && urgency === 'alta') return 'P1';
  if ((impact === 'alta' && urgency === 'media') || (impact === 'media' && urgency === 'alta')) return 'P2';
  if (
    (impact === 'alta' && urgency === 'baja') ||
    (impact === 'media' && urgency === 'media') ||
    (impact === 'baja' && urgency === 'alta')
  ) return 'P3';
  return 'P4';
}

const PRIORITY_DESC: Record<Priority, string> = {
  P1: 'Crítico: multiusuario o servicio caído. Respuesta inmediata y puente de comunicación con el responsable de turno.',
  P2: 'Alto: usuarios clave bloqueados o plazo sensible del negocio. Atención prioritaria el mismo día.',
  P3: 'Medio: usuario individual con alternativa parcial de trabajo. Cola normal.',
  P4: 'Bajo: consulta o incidencia menor con workaround. Se atiende al liberar la cola.',
};

const P_CELL: Record<Priority, string> = {
  P1: 'bg-red-500/15 hover:bg-red-500/25 border-red-500/40 text-red-400',
  P2: 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-400',
  P3: 'bg-blue-500/15 hover:bg-blue-500/25 border-blue-500/40 text-blue-400',
  P4: 'bg-gray-500/15 hover:bg-gray-500/25 border-gray-500/30 text-gray-400',
};

const P_BADGE: Record<Priority, string> = {
  P1: 'bg-red-500/15 border-red-500/40 text-red-400',
  P2: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
  P3: 'bg-blue-500/15 border-blue-500/40 text-blue-400',
  P4: 'bg-gray-500/15 border-gray-500/30 text-gray-400',
};

function fmtMins(m: number): string {
  if (m <= 0) return '0 min';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h > 0 ? h + ' h' : ''}${r > 0 ? (h > 0 ? ' ' : '') + r + ' min' : ''}`.trim();
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** HH:MM + sufijo (+N día) si cruza medianoche respecto a la hora base. */
function fmtTime(d: Date, base: Date): string {
  const t = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const days = Math.round((startOfDay(d).getTime() - startOfDay(base).getTime()) / 86400000);
  return days > 0 ? `${t} (+${days} día${days === 1 ? '' : 's'})` : t;
}

const slaInputCls =
  'w-20 bg-[#161616] border border-[#262626] rounded px-2 py-1 text-[11px] text-white font-mono focus:outline-none focus:border-blue-500';

/* ---------- texto plano para Intel ---------- */

function buildMatrixText(sel: { impact: Level3; urgency: Level3; p: Priority } | null, sla: SlaTable): string {
  const L: string[] = [];
  L.push('# SLA / Priority Calculator');
  L.push('');
  L.push('## Matriz impacto × urgencia');
  L.push('| | urgencia alta | urgencia media | urgencia baja |');
  for (const imp of LEVELS) {
    L.push(`| impacto ${imp} | ${priorityMatrix(imp, 'alta')} | ${priorityMatrix(imp, 'media')} | ${priorityMatrix(imp, 'baja')} |`);
  }
  L.push('');
  L.push('## SLA por prioridad');
  (['P1', 'P2', 'P3', 'P4'] as Priority[]).forEach((p) => {
    L.push(`- ${p}: respuesta ${fmtMins(sla[p].response)} · resolución ${fmtMins(sla[p].resolution)}`);
  });
  if (sel) {
    L.push('');
    L.push('## Celda seleccionada');
    L.push(`Impacto ${sel.impact} × urgencia ${sel.urgency} → ${sel.p}`);
    L.push(PRIORITY_DESC[sel.p]);
  }
  return L.join('\n');
}

/* ---------- componente principal ---------- */

export const HdSlaCalculatorTool: React.FC = () => {
  const [mode, setMode] = useState('matriz');
  const [sla, setSlaTable] = useState<SlaTable>(DEFAULT_SLA);
  const [selImpact, setSelImpact] = useState<Level3 | null>(null);
  const [selUrgency, setSelUrgency] = useState<Level3 | null>(null);
  const [openTime, setOpenTime] = useState('09:00');
  const [cronP, setCronP] = useState<Priority>('P2');
  const [feedback, setFeedback] = useState<string | null>(null);
  const { addedToast, showToast } = useAddToNoteToast();

  const selPriority: Priority | null = selImpact && selUrgency ? priorityMatrix(selImpact, selUrgency) : null;

  /* --- cronómetro: Date math pura contra la hora local del navegador --- */
  const now = new Date();
  const [hh, mm] = openTime.split(':').map((x) => parseInt(x, 10));
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number.isNaN(hh) ? 0 : hh, Number.isNaN(mm) ? 0 : mm);
  const respAt = new Date(base.getTime() + sla[cronP].response * 60000);
  const resoAt = new Date(base.getTime() + sla[cronP].resolution * 60000);
  const status: 'green' | 'amber' | 'red' =
    now.getTime() < respAt.getTime() ? 'green' : now.getTime() < resoAt.getTime() ? 'amber' : 'red';
  const remaining = Math.round((resoAt.getTime() - now.getTime()) / 60000);

  const statusLabel: Record<'green' | 'amber' | 'red', string> = {
    green: 'En plazo de respuesta',
    amber: 'Respuesta vencida — resolución en plazo',
    red: 'SLA de resolución vencido',
  };
  const statusCls: Record<'green' | 'amber' | 'red', string> = {
    green: 'bg-green-500/10 border-green-500/40 text-green-400',
    amber: 'bg-amber-500/10 border-amber-500/40 text-amber-400',
    red: 'bg-red-500/10 border-red-500/40 text-red-400',
  };

  const setSla = (p: Priority, field: 'response' | 'resolution', v: string): void => {
    const n = Math.max(0, parseInt(v, 10) || 0);
    setSlaTable((prev) => ({ ...prev, [p]: { ...prev[p], [field]: n } }));
  };

  const addToNote = (): void => {
    const rows: Array<[string, string]> = [];
    if (mode === 'matriz') {
      rows.push(['Modo', 'Matriz impacto × urgencia']);
      LEVELS.forEach((imp) => {
        rows.push([`Impacto ${imp}`, LEVELS.map((u) => priorityMatrix(imp, u)).join(' · ')]);
      });
      if (selPriority && selImpact && selUrgency) {
        rows.push(['Selección', escapeHtml(`impacto ${selImpact} × urgencia ${selUrgency} → ${selPriority}`)]);
        rows.push(['Descripción', escapeHtml(PRIORITY_DESC[selPriority])]);
      }
    } else {
      rows.push(['Modo', 'Calculadora de SLA']);
      rows.push(['Hora de apertura', escapeHtml(openTime)]);
      rows.push(['Prioridad', escapeHtml(cronP)]);
      rows.push(['Límite de respuesta', escapeHtml(fmtTime(respAt, base))]);
      rows.push(['Límite de resolución', escapeHtml(fmtTime(resoAt, base))]);
      rows.push(['Estado ahora', escapeHtml(statusLabel[status])]);
    }
    (['P1', 'P2', 'P3', 'P4'] as Priority[]).forEach((p) => {
      rows.push([`SLA ${p}`, escapeHtml(`respuesta ${fmtMins(sla[p].response)} · resolución ${fmtMins(sla[p].resolution)}`)]);
    });
    useNoteStore.getState().enqueueNote(
      `SLA Calculator — ${mode === 'matriz' ? (selPriority ?? 'matriz') : cronP}`,
      buildNoteHtmlTable(rows),
    );
    showToast();
  };

  const saveToIntel = async (): Promise<void> => {
    const sel = selPriority && selImpact && selUrgency
      ? { impact: selImpact, urgency: selUrgency, p: selPriority }
      : null;
    const res = await useIntelStore.getState().addIntelItems([{
      kind: 'event',
      title: `SLA Calculator — ${mode === 'matriz' ? (selPriority ?? 'matriz') : cronP}`,
      content: buildMatrixText(sel, sla),
      contentLang: 'markdown',
      description: mode === 'matriz'
        ? 'Matriz impacto × urgencia y SLA por prioridad'
        : `Cronómetro SLA ${cronP} desde las ${openTime}`,
      tags: ['sla', 'prioridad', mode === 'matriz' ? 'matriz' : 'cronometro'],
      source: 'HelpDesk SLA Calculator',
    }]);
    setFeedback(res.added > 0 ? 'Guardado en Data & Intel ✓' : 'Ya existía en Data & Intel');
    window.setTimeout(() => setFeedback(null), 2500);
  };

  return (
    <div className="space-y-3">
      <InfoBanner>
        Ejemplo educativo — la matriz y los tiempos SLA son una referencia para
        aprender el razonamiento impacto × urgencia, no un estándar universal:
        cada empresa define su propia política. 100% offline, Date math local.
      </InfoBanner>

      <Tabs
        tabs={[
          { id: 'matriz', label: 'Matriz', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
          { id: 'calc', label: 'Calculadora', icon: <Calculator className="w-3.5 h-3.5" /> },
        ]}
        active={mode}
        onChange={setMode}
      />

      {mode === 'matriz' && (
        <div className="space-y-3">
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
              Matriz impacto × urgencia — pulsa una celda
            </div>
            <div className="overflow-x-auto">
              <table className="border-collapse w-full text-xs">
                <thead>
                  <tr>
                    <th scope="col" className="text-[10px] text-[#666] uppercase tracking-wider p-1.5 text-left">Impacto \ Urgencia</th>
                    {LEVELS.map((u) => (
                      <th key={u} scope="col" className="text-[10px] text-[#666] uppercase tracking-wider p-1.5 text-center">{u}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {LEVELS.map((imp) => (
                    <tr key={imp}>
                      <th scope="row" className="text-[10px] text-[#666] uppercase tracking-wider p-1.5 text-left">{imp}</th>
                      {LEVELS.map((u) => {
                        const p = priorityMatrix(imp, u);
                        const selected = selImpact === imp && selUrgency === u;
                        return (
                          <td key={u} className="p-1">
                            <button
                              type="button"
                              onClick={() => { setSelImpact(imp); setSelUrgency(u); }}
                              aria-label={`Impacto ${imp} y urgencia ${u}: prioridad ${p}`}
                              className={`w-full py-2 rounded border text-xs font-bold font-mono transition-colors cursor-pointer ${P_CELL[p]} ${selected ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                            >
                              {p}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selPriority && selImpact && selUrgency ? (
            <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-2 py-1 rounded border text-xs font-bold ${P_BADGE[selPriority]}`}>{selPriority}</span>
                <span className="text-[11px] text-[#888]">impacto <span className="text-white">{selImpact}</span> × urgencia <span className="text-white">{selUrgency}</span></span>
              </div>
              <p className="text-[11px] text-[#AAA] leading-relaxed">{PRIORITY_DESC[selPriority]}</p>
              <Row label="SLA respuesta" value={fmtMins(sla[selPriority].response)} mono />
              <Row label="SLA resolución" value={fmtMins(sla[selPriority].resolution)} mono />
              {selPriority === 'P1' && (
                <p className="text-[10px] text-amber-400">
                  Regla de oro: P1 solo para fallo multiusuario o servicio caído. Si el alcance es un solo usuario, revisa el impacto antes de subir la prioridad.
                </p>
              )}
            </div>
          ) : (
            <InfoBanner>Pulsa una celda de la matriz para ver la descripción del nivel y su SLA asociado.</InfoBanner>
          )}
        </div>
      )}

      {mode === 'calc' && (
        <div className="space-y-3">
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
              Política SLA por prioridad (minutos, editable)
            </div>
            <div className="overflow-x-auto border border-[#262626] rounded">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="bg-[#161616] text-[#888] uppercase">
                    <th className="px-2 py-1.5 text-left">P</th>
                    <th className="px-2 py-1.5 text-left">Respuesta (min)</th>
                    <th className="px-2 py-1.5 text-left">Resolución (min)</th>
                    <th className="px-2 py-1.5 text-left">Equivalente</th>
                  </tr>
                </thead>
                <tbody>
                  {(['P1', 'P2', 'P3', 'P4'] as Priority[]).map((p) => (
                    <tr key={p} className="border-t border-[#1A1A1A]">
                      <td className="px-2 py-1.5 text-white">{p}</td>
                      <td className="px-2 py-1.5">
                        <input type="number" min={0} value={sla[p].response} onChange={(e) => setSla(p, 'response', e.target.value)} className={slaInputCls} aria-label={`Tiempo de respuesta ${p} en minutos`} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min={0} value={sla[p].resolution} onChange={(e) => setSla(p, 'resolution', e.target.value)} className={slaInputCls} aria-label={`Tiempo de resolución ${p} en minutos`} />
                      </td>
                      <td className="px-2 py-1.5 text-[#888]">{fmtMins(sla[p].response)} / {fmtMins(sla[p].resolution)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#555]">
              <Clock className="w-3 h-3" />
              Cronómetro de cumplimiento (educativo)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Hora de apertura">
                <input
                  type="time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="bg-[#161616] border border-[#262626] rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  aria-label="Hora de apertura del ticket"
                />
              </Field>
              <Field label="Prioridad">
                <select
                  value={cronP}
                  onChange={(e) => setCronP(e.target.value as Priority)}
                  className="bg-[#161616] border border-[#262626] rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500 cursor-pointer"
                  aria-label="Prioridad del ticket"
                >
                  {(['P1', 'P2', 'P3', 'P4'] as Priority[]).map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#555] block">Estado ahora</span>
                <span className={`inline-block px-2 py-1 rounded border text-[11px] font-semibold ${statusCls[status]}`}>{statusLabel[status]}</span>
                <p className="text-[10px] text-[#666]">
                  Ahora: {now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} (hora local del navegador)
                  {remaining >= 0 ? ` · quedan ${fmtMins(remaining)} de resolución` : ` · resolución vencida hace ${fmtMins(-remaining)}`}
                </p>
              </div>
            </div>
            <Row label="Límite de respuesta" value={fmtTime(respAt, base)} mono />
            <Row label="Límite de resolución" value={fmtTime(resoAt, base)} mono />
            <p className="text-[10px] text-[#666]">
              El estado se recalcula cada vez que cambias un valor. Si la hora de
              apertura es futura, los plazos aparecen en verde (contando hacia atrás).
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addToNote} className={`${btnPrimary} inline-flex items-center gap-1.5`} title="Añadir la matriz/estado actual a Notas como tabla">
          <BookOpen className="w-3.5 h-3.5" /> Añadir a Notas
        </button>
        <button type="button" onClick={saveToIntel} className={`${btnGhost} inline-flex items-center gap-1.5`} title="Guardar el cálculo SLA en Data e Intel">
          <Database className="w-3.5 h-3.5" /> Guardar en Data &amp; Intel
        </button>
      </div>

      {feedback && <InfoBanner>{feedback}</InfoBanner>}
      {addedToast && <InfoBanner>Añadido a Notas — crea o elige una nota para verlo.</InfoBanner>}
    </div>
  );
};

export default HdSlaCalculatorTool;
