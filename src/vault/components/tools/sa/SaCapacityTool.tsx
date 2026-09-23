'use client';

/**
 * SaCapacityTool.tsx — "Disk Growth Planner" (SysAdmin · task 7-g).
 *
 * Proyección de capacidad de disco 100% local: filesystem + capacidad total +
 * uso actual + crecimiento (GB/mes o %/mes) → libre, % usado, meses hasta
 * llenarse (modelo lineal), fecha estimada de llenado y fechas de cruce de los
 * umbrales 70/80/90/95 ("YA SUPERADO" en rojo si ya se pasó). Visual: barra
 * con segmentos verde/ámbar/naranja/rojo, marcadores 70/80/90 y posición
 * actual; tabla de proyección a 6 meses coloreada por zona; recomendaciones
 * rule-based (solo las relevantes) y referencia df/du/ncdu + inodos + ext4
 * + lvextend. El modelo es LINEAL por diseño: re-mide semanalmente.
 *
 * 100% offline — sin fetch, sin exec.
 */
import React, { useMemo, useState } from 'react';
import { HardDrive, TrendingUp, BookOpen, Info, AlertTriangle, Terminal } from 'lucide-react';
import { useNoteStore } from '../../../store/noteStore';
import { escapeHtml } from '../../../utils/escapeHtml';
import {
  inputCls, btnPrimary, Row, Field, CodeBlock, InfoBanner, ErrorBanner,
  buildNoteHtmlTable, useAddToNoteToast,
} from '../_shared';

/* ─────────────────────────── tipos ─────────────────────────── */

type GrowthMode = 'gb' | 'pct';
type Zone = 'ok' | 'warn' | 'hot' | 'crit';

interface ThresholdInfo { pct: number; status: 'superado' | 'fecha' | 'nunca'; months: number | null; date: Date | null }
interface MonthRow { m: number; date: Date; usedGb: number; freeGb: number; pct: number }

interface CapacityResult {
  total: number;
  used: number;
  free: number;
  usedPct: number;
  growthGb: number;
  monthsToFull: number | null;
  fullDate: Date | null;
  alreadyFull: boolean;
  thresholds: ThresholdInfo[];
  projections: MonthRow[];
}

/* ─────────────────────────── helpers ─────────────────────────── */

const DAYS_PER_MONTH = 30.44; // promedio — supuesto documentado del modelo lineal
const THRESHOLDS = [70, 80, 90, 95];

const fmtNum = (n: number, digits = 1): string =>
  n.toLocaleString('es-CO', { maximumFractionDigits: digits });
const fmtGb = (n: number): string => `${fmtNum(n, 1)} GB`;
const fmtDate = (d: Date): string => d.toLocaleDateString('es-CO', { dateStyle: 'long' });

function zoneOf(pct: number): Zone {
  if (pct < 70) return 'ok';
  if (pct < 80) return 'warn';
  if (pct < 90) return 'hot';
  return 'crit';
}

const ZONE_CLS: Record<Zone, string> = {
  ok: 'bg-green-500/15 border-green-500/40 text-green-400',
  warn: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
  hot: 'bg-orange-500/15 border-orange-500/40 text-orange-400',
  crit: 'bg-red-500/15 border-red-500/40 text-red-400',
};

/** Fecha a N meses (fraccionarios) vista desde hoy — lineal a 30,44 días/mes. */
function dateAfterMonths(now: Date, months: number): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + Math.round(months * DAYS_PER_MONTH));
}

/* ─────────────────────────── motor de cálculo ─────────────────────────── */

function computeCapacity(
  total: number,
  used: number,
  growthGb: number,
  now: Date,
): CapacityResult {
  const free = total - used;
  const usedPct = total > 0 ? (used / total) * 100 : 0;
  const alreadyFull = free <= 0;

  const monthsToFull: number | null = growthGb > 0 ? Math.max(0, free / growthGb) : null;
  const fullDate: Date | null = alreadyFull
    ? now
    : monthsToFull !== null
      ? dateAfterMonths(now, monthsToFull)
      : null;

  const thresholds: ThresholdInfo[] = THRESHOLDS.map((pct) => {
    const targetGb = (total * pct) / 100;
    if (used >= targetGb) return { pct, status: 'superado' as const, months: null, date: null };
    if (growthGb <= 0) return { pct, status: 'nunca' as const, months: null, date: null };
    const months = (targetGb - used) / growthGb;
    return { pct, status: 'fecha' as const, months, date: dateAfterMonths(now, months) };
  });

  const projections: MonthRow[] = [];
  for (let m = 0; m <= 6; m++) {
    const usedGb = used + growthGb * m;
    projections.push({
      m,
      date: new Date(now.getFullYear(), now.getMonth() + m, now.getDate()),
      usedGb,
      freeGb: total - usedGb,
      pct: total > 0 ? (usedGb / total) * 100 : 0,
    });
  }

  return { total, used, free, usedPct, growthGb, monthsToFull, fullDate, alreadyFull, thresholds, projections };
}

/* ─────────────────────────── recomendaciones rule-based ─────────────────────────── */

interface Rec { level: 'ok' | 'plan' | 'act' | 'crit' | 'info'; title: string; body: string }

const REC_CLS: Record<Rec['level'], string> = {
  ok: 'border-green-500/40 bg-green-500/5',
  plan: 'border-amber-500/40 bg-amber-500/5',
  act: 'border-orange-500/40 bg-orange-500/5',
  crit: 'border-red-500/40 bg-red-500/10',
  info: 'border-cyan-500/30 bg-cyan-500/5',
};

function buildRecommendations(r: CapacityResult, logsRotation: boolean): Rec[] {
  const recs: Rec[] = [];
  // Regla por zona ACTUAL — solo la que aplica.
  if (r.usedPct < 70) {
    recs.push({
      level: 'ok',
      title: 'Saludable',
      body: 'Menos del 70%: monitorea con un df -h semanal y guarda el histórico — la tendencia importa más que el número suelto.',
    });
  } else if (r.usedPct < 80) {
    recs.push({
      level: 'plan',
      title: 'Planifica',
      body: 'Zona 70-80%: rotación de logs (logrotate), archivado/purga de datos viejos y planifica el LVM extend ANTES de llegar al 80%.',
    });
  } else if (r.usedPct < 90) {
    recs.push({
      level: 'act',
      title: 'Acción',
      body: 'Zona 80-90%: extiende ya el volumen (vgextend/lvextend -r) o limpia top consumers con du -xh --max-depth=1 — el rendimiento ya se degrada.',
    });
  } else {
    recs.push({
      level: 'crit',
      title: 'URGENTE',
      body: 'Más del 90%: riesgo real de escrituras fallidas y servicios caídos (las bases de datos se detienen al no poder escribir ni temporalmente).',
    });
    recs.push({
      level: 'info',
      title: 'No llegues aquí',
      body: 'El umbral de alerta correcto es el 80%: con alertas al 90% ya estás en modo apagafuegos. Configura la monitorización en 80% y crítico en 90%.',
    });
  }
  // Regla por PROYECCIÓN — la fecha de llenado manda.
  if (r.monthsToFull !== null) {
    if (r.monthsToFull < 3) {
      recs.push({
        level: 'crit',
        title: 'Se llena en menos de 3 meses',
        body: 'A este ritmo el filesystem se llena pronto: agenda YA la ventana de extensión (vgextend + lvextend -r + resize) o reduce el crecimiento (logrotate, vacuum de journal, purga).',
      });
    } else if (r.monthsToFull < 6) {
      recs.push({
        level: 'plan',
        title: 'Se llena en menos de 6 meses',
        body: 'Suficiente margen para planificar: pide el espacio/disco nuevo con tiempo de compra y ensaya el lvextend en pre-producción.',
      });
    }
  }
  // Regla condicional del checkbox de rotación de logs.
  if (logsRotation) {
    recs.push({
      level: 'info',
      title: 'Rotación de logs viable',
      body: 'Si la rotación es posible, actívala y RE-MIDE: logrotate + journalctl --vacuum-time=7d suelen aplanar el crecimiento (los logs son el driver nº1 en /var). Vuelve a medir un mes después y recalcula.',
    });
  }
  return recs;
}

/* ─────────────────────────── componente ─────────────────────────── */

export const SaCapacityTool: React.FC = () => {
  const [fsPath, setFsPath] = useState('/var');
  const [totalStr, setTotalStr] = useState('100');
  const [usedStr, setUsedStr] = useState('62');
  const [mode, setMode] = useState<GrowthMode>('gb');
  const [growthStr, setGrowthStr] = useState('4');
  const [logsRotation, setLogsRotation] = useState(false);
  const { addedToast, showToast } = useAddToNoteToast();

  const now = useMemo(() => new Date(), []);

  const { errors, result } = useMemo(() => {
    const errs: string[] = [];
    const total = parseFloat(totalStr);
    const used = parseFloat(usedStr);
    const growthVal = parseFloat(growthStr);
    if (!Number.isFinite(total) || total <= 0) errs.push(`Capacidad total: "${totalStr.trim() || '(vacío)'}" debe ser un número mayor que 0 (GB).`);
    if (!Number.isFinite(used) || used < 0) errs.push(`En uso: "${usedStr.trim() || '(vacío)'}" debe ser un número ≥ 0 (GB).`);
    else if (Number.isFinite(total) && used > total) errs.push(`En uso (${usedStr.trim()} GB) no puede superar la capacidad total (${totalStr.trim()} GB).`);
    if (!Number.isFinite(growthVal) || growthVal < 0) errs.push(`Crecimiento: "${growthStr.trim() || '(vacío)'}" debe ser un número ≥ 0.`);
    if (mode === 'pct' && Number.isFinite(growthVal) && growthVal > 100) errs.push(`Crecimiento: ${growthStr.trim()}% mensual es irreal — revisa la unidad (% mensual de la capacidad total).`);
    if (errs.length > 0 || !Number.isFinite(total) || !Number.isFinite(used) || !Number.isFinite(growthVal)) {
      return { errors: errs, result: null as CapacityResult | null };
    }
    const growthGb = mode === 'gb' ? growthVal : (total * growthVal) / 100;
    return { errors: errs, result: computeCapacity(total, used, growthGb, now) };
  }, [totalStr, usedStr, growthStr, mode, now]);

  const recs = result ? buildRecommendations(result, logsRotation) : [];
  const barPos = result ? Math.min(Math.max(result.usedPct, 0), 100) : 0;

  const addToNote = (): void => {
    if (!result) return;
    const threshold = (t: ThresholdInfo): string => {
      if (t.status === 'superado') return 'YA SUPERADO';
      if (t.status === 'nunca') return 'nunca (sin crecimiento)';
      return fmtDate(t.date as Date);
    };
    const rows: Array<[string, string]> = [
      ['Filesystem', escapeHtml(fsPath.trim() || '—')],
      ['Capacidad total', fmtGb(result.total)],
      ['En uso', `${fmtGb(result.used)} (${fmtNum(result.usedPct)}%)`],
      ['Libre', fmtGb(result.free)],
      ['Crecimiento', `${fmtNum(result.growthGb)} GB/mes`],
      ['Meses hasta lleno', result.monthsToFull !== null ? `${fmtNum(result.monthsToFull)} meses` : 'sin crecimiento'],
      ['Fecha estimada de llenado', result.fullDate ? fmtDate(result.fullDate) : '—'],
      ['Umbral 70%', threshold(result.thresholds[0])],
      ['Umbral 80%', threshold(result.thresholds[1])],
      ['Umbral 90%', threshold(result.thresholds[2])],
      ['Umbral 95%', threshold(result.thresholds[3])],
    ];
    useNoteStore.getState().enqueueNote(`Capacity — ${fsPath.trim() || 'disco'}`, buildNoteHtmlTable(rows));
    showToast();
  };

  return (
    <div className="space-y-3">
      <InfoBanner>
        100% offline y educativo. Proyección de capacidad con un modelo{' '}
        <span className="font-semibold">lineal</span> (constante por mes) calculada en tu
        navegador: sirve para PLANIFICAR, no para predecir — el crecimiento real tiene picos y
        estancamientos. Re-mide semanalmente y recalcula.
      </InfoBanner>

      {/* Entradas */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5"> <HardDrive className="w-3 h-3" /> Filesystem y medidas actuales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Punto de montaje / label" hint="Ej. /var, /data, vg0/lv_app">
            <input value={fsPath} onChange={(e) => setFsPath(e.target.value)} placeholder="/var" spellCheck={false} autoComplete="off" aria-label="Ruta del filesystem a planificar" className={inputCls} />
          </Field>
          <Field label="Capacidad total (GB)" hint="df -h → columna Size">
            <input value={totalStr} onChange={(e) => setTotalStr(e.target.value)} inputMode="decimal" placeholder="100" spellCheck={false} autoComplete="off" aria-label="Capacidad total del filesystem en GB" className={inputCls} />
          </Field>
          <Field label="En uso (GB)" hint="df -h → columna Used">
            <input value={usedStr} onChange={(e) => setUsedStr(e.target.value)} inputMode="decimal" placeholder="62" spellCheck={false} autoComplete="off" aria-label="Espacio usado del filesystem en GB" className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Crecimiento mensual</div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setMode('gb')}
                className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors cursor-pointer ${mode === 'gb' ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300' : 'bg-[#161616] border-[#262626] text-[#888] hover:text-white'}`}
              >
                GB/mes
              </button>
              <button
                type="button"
                onClick={() => setMode('pct')}
                className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors cursor-pointer ${mode === 'pct' ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300' : 'bg-[#161616] border-[#262626] text-[#888] hover:text-white'}`}
              >
                %/mes
              </button>
              <input value={growthStr} onChange={(e) => setGrowthStr(e.target.value)} inputMode="decimal" placeholder="4" spellCheck={false} autoComplete="off" aria-label="Valor de crecimiento mensual" className={`${inputCls} flex-1 min-w-0`} />
            </div>
            <p className="text-[10px] text-[#666]">
              {mode === 'gb'
                ? 'GB lineales por mes (mide: usado(hoy) − usado(hace 30 días)).'
                : 'Porcentaje mensual relativo a la CAPACIDAD TOTAL (5% de 100 GB = 5 GB/mes).'}
            </p>
          </div>
          <label className="flex items-start gap-2 text-[11px] text-[#AAA] cursor-pointer select-none pt-1">
            <input type="checkbox" checked={logsRotation} onChange={(e) => setLogsRotation(e.target.checked)} className="accent-cyan-500 w-3.5 h-3.5 cursor-pointer mt-0.5" />
            <span>
              La rotación de logs es viable en este filesystem
              <span className="block text-[10px] text-[#666]">
                Ajusta las recomendaciones: logrotate/journal vacuum puede aplanar el crecimiento.
              </span>
            </span>
          </label>
        </div>
      </div>

      {errors.length > 0 && <ErrorBanner message={`Datos inválidos — ${errors.join(' · ')}`} />}
      {result && result.alreadyFull && (
        <ErrorBanner message="El filesystem YA está lleno (uso ≥ capacidad): riesgo inmediato de servicios caídos y escrituras fallidas." />
      )}

      {/* Resultado en vivo */}
      {result && (
        <>
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5"> <TrendingUp className="w-3 h-3" /> Estado y proyección lineal</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <Row label="Capacidad total" value={fmtGb(result.total)} mono />
              <Row label="En uso" value={`${fmtGb(result.used)} · ${fmtNum(result.usedPct)}%`} mono />
              <Row label="Libre" value={fmtGb(result.free)} mono />
              <Row label="Crecimiento" value={result.growthGb > 0 ? `${fmtNum(result.growthGb)} GB/mes` : 'sin crecimiento'} mono />
              <Row
                label="Meses hasta lleno"
                value={
                  result.alreadyFull
                    ? 'YA LLENO'
                    : result.monthsToFull !== null
                      ? `${fmtNum(result.monthsToFull)} meses`
                      : 'sin crecimiento'
                }
                mono
              />
              <Row
                label="Fecha estimada de llenado"
                value={result.alreadyFull ? '—' : result.fullDate ? fmtDate(result.fullDate) : '—'}
                mono
              />
            </div>

            {/* Barra de umbral con posición actual */}
            <div className="pt-4">
              <div className="relative">
                <div
                  className="absolute -top-5 text-[9px] font-mono text-cyan-300 whitespace-nowrap z-10"
                  style={{ left: `${barPos}%`, transform: barPos > 85 ? 'translateX(-100%)' : 'translateX(-50%)' }}
                >
                  {`▲ ${fmtNum(result.usedPct, 0)}% hoy`}
                </div>
                <div className="h-4 rounded overflow-hidden border border-[#262626] flex">
                  <div className="h-full bg-green-500/25" style={{ width: '70%' }} />
                  <div className="h-full bg-amber-500/25" style={{ width: '10%' }} />
                  <div className="h-full bg-orange-500/30" style={{ width: '10%' }} />
                  <div className="h-full bg-red-500/30" style={{ width: '10%' }} />
                </div>
                {[70, 80, 90].map((p) => (
                  <div key={p} className="absolute top-0 h-4 w-px bg-white/25" style={{ left: `${p}%` }} aria-hidden="true" />
                ))}
                <div className="absolute -top-1 -bottom-1 w-0.5 bg-cyan-300 z-10" style={{ left: `${barPos}%` }} aria-hidden="true" />
                <div className="relative h-3 mt-0.5 text-[9px] text-[#555] font-mono">
                  <span className="absolute left-0">0%</span>
                  {[70, 80, 90].map((p) => (
                    <span key={p} className="absolute" style={{ left: `${p}%`, transform: 'translateX(-50%)' }}>{p}</span>
                  ))}
                  <span className="absolute right-0">100%</span>
                </div>
              </div>
              <p className="text-[9px] text-[#666] mt-1">
                Zonas: verde menos de 70% · ámbar 70-80% · naranja 80-90% · roja 90%+ (▲ = uso actual).
              </p>
            </div>
          </div>

          {/* Umbrales */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5"> <AlertTriangle className="w-3 h-3" /> ¿Cuándo se cruzan los umbrales?</h3>
            {result.thresholds.map((t) => (
              <div key={t.pct} className="flex items-center justify-between gap-3 py-0.5">
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${ZONE_CLS[zoneOf(t.pct)]}`}>{t.pct}%</span>
                <span className="text-[11px] text-white text-right">
                  {t.status === 'superado' ? (
                    <span className="text-red-400 font-bold">YA SUPERADO</span>
                  ) : t.status === 'nunca' ? (
                    <span className="text-[#777]">nunca — sin crecimiento</span>
                  ) : (
                    <>
                      {fmtDate(t.date as Date)}
                      <span className="text-[#666]"> ({fmtNum(t.months as number)} meses)</span>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Tabla de proyección a 6 meses */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2 overflow-x-auto">
            <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5"> <TrendingUp className="w-3 h-3" /> Proyección a 6 meses (lineal)</h3>
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="text-[#888] uppercase">
                  <th className="px-2 py-1.5 text-left">Mes</th>
                  <th className="px-2 py-1.5 text-left">Fecha</th>
                  <th className="px-2 py-1.5 text-right">Usado</th>
                  <th className="px-2 py-1.5 text-right">Libre</th>
                  <th className="px-2 py-1.5 text-right">% Uso</th>
                </tr>
              </thead>
              <tbody>
                {result.projections.map((row) => (
                  <tr key={row.m} className={`border-t border-[#1A1A1A] ${row.m === 0 ? 'bg-cyan-500/5' : ''}`}>
                    <td className="px-2 py-1.5 text-white">{row.m === 0 ? 'hoy' : `+${row.m}`}</td>
                    <td className="px-2 py-1.5 text-[#888]">
                      {row.date.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-2 py-1.5 text-right text-white">{fmtGb(row.usedGb)}</td>
                    <td className="px-2 py-1.5 text-right text-[#888]">
                      {row.freeGb <= 0 ? <span className="text-red-400">0 (lleno)</span> : fmtGb(row.freeGb)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <span className={`px-1.5 py-0.5 rounded border ${ZONE_CLS[zoneOf(row.pct)]}`}>{fmtNum(row.pct, 0)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[9px] text-[#666]">
              Colores: verde menos de 70% · ámbar 70-80% · naranja 80-90% · rojo más de 90%.
              Modelo lineal: uso(m) = uso actual + crecimiento × m.
            </p>
          </div>

          {/* Recomendaciones rule-based */}
          <div className="space-y-2">
            {recs.map((rec) => (
              <div key={rec.title} className={`border rounded p-2.5 space-y-0.5 ${REC_CLS[rec.level]}`}>
                <div className="text-[11px] font-bold text-white uppercase tracking-wider">{rec.title}</div>
                <p className="text-[10px] text-[#AAA] leading-relaxed">{rec.body}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Referencia df / du / ncdu */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5"> <Terminal className="w-3 h-3" /> Comandos de verificación (df / du / ncdu)</h3>
        <CodeBlock
          code={'df -h /var                              # capacidad/usado/libre en unidades humanas\ndf -i /var                              # INODOS: un disco puede estar "lleno" sin espacio ocupado\ndu -xh --max-depth=1 /var | sort -rh | head   # top consumidores (mismo filesystem con -x)\nncdu /var                               # exploración interactiva (apt install ncdu)'}
          lang="bash"
          label="recolección de datos"
        />
        <ul className="space-y-1 text-[10px] text-[#888]">
          <li>
            <span className="text-white">df -h</span> es tu fuente para rellenar esta tool (Size →
            total, Used → en uso). Con <span className="text-white">-h</span> redondea: usa{' '}
            <span className="font-mono text-cyan-300">df -B1G</span> o df -m para números exactos.
          </li>
          <li>
            <span className="text-white">df -i</span>: si IUse% llega al 100% las escrituras fallan
            aunque quede espacio — típico con millones de archivos pequeños (sesiones PHP, colas de mail).
          </li>
          <li>
            <span className="text-white">du -x</span> se queda en un solo filesystem (sin cruzar
            montajes); <span className="font-mono">--max-depth=1</span> + <span className="font-mono">sort -rh</span>{' '}
            revela el directorio gorra. <span className="text-white">ncdu</span> para explorarlo a mano.
          </li>
          <li>
            ext4 reserva por defecto un 5% para root (<span className="font-mono text-cyan-300">tune2fs -m</span>):
            los procesos de usuario fallan ANTES del 100% — otro motivo para alertar al 80%.
          </li>
          <li>
            Cuando toque extender con LVM:{' '}
            <span className="font-mono text-cyan-300">sudo lvextend -r -L +50G /dev/vg0/var</span>{' '}
            (el <span className="font-mono">-r</span> redimensiona el filesystem en el mismo paso).
          </li>
        </ul>
      </div>

      {/* Añadir a notas */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={addToNote} disabled={!result} className={`${btnPrimary} inline-flex items-center gap-1.5`} title="Añadir la proyección de capacidad a Notas">
          <BookOpen className="w-3.5 h-3.5" /> Añadir a Notas
        </button>
        {addedToast && <span className="text-[10px] text-green-400">Añadido a Notas — crea o elige una nota para verlo.</span>}
      </div>

      {/* Referencia metodológica */}
      <details className="bg-[#0D0D0D] border border-[#262626] rounded p-3">
        <summary className="cursor-pointer text-xs font-semibold text-white flex items-center gap-1.5">
          <Info className="w-3 h-3 text-cyan-400" />
          Supuestos del modelo y buenas prácticas de capacity
        </summary>
        <div className="mt-2 space-y-1.5 text-[10px] text-[#888] leading-relaxed">
          <p>
            <span className="text-white">Modelo lineal:</span> cada mes se añade exactamente lo
            mismo (30,44 días/mes de promedio). Realidad: backups semanales, picos de logs en
            incidentes, retenciones que caducan. Úsalo como fecha LÍMITE optimista y re-mide.
          </p>
          <p>
            <span className="text-white">Umbral operativo:</span> el estándar de la industria es
            alertar al 70-75% (aviso) y actuar antes del 80% — por encima el rendimiento de
            escritura degrada (menos espacio para journaling, temporales y defragmentación).
          </p>
          <p>
            <span className="text-white">Datos históricos:</span> con 3+ puntos semanales de uso,
            la tendencia medida vale más que cualquier estimación: guarda el df -h con fecha (o
            configúralo en la monitorización) y recalcula aquí con el delta real.
          </p>
        </div>
      </details>
    </div>
  );
};

