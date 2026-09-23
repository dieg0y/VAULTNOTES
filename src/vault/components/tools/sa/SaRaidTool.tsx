'use client';

/**
 * SaRaidTool.tsx — Calculadora y comparador de niveles RAID (0/1/5/6/10).
 *
 * Todo se calcula EN VIVO con useMemo (100% offline, educativo):
 *  - Capacidad usable EXACTA por nivel (discos de datos, excluyendo spares).
 *  - Tabla comparativa de TODOS los niveles para el input actual: mínimos
 *    discos (indicador válido/inválido), capacidad, tolerancia a fallos,
 *    rendimiento lectura/escritura, overhead % y riesgos.
 *  - Tarjetas de estudio: rebuild (heurística APROXIMADA + razonamiento),
 *    write hole de RAID5, riesgo URE con probabilidad calculada en vivo
 *    (1 error / 10^14 bits SATA vs 10^15 enterprise), cheat-sheet de niveles
 *    y comandos mdadm (create / detail / mdstat / add / monitor).
 *
 * Convención de fabricantes: 1 TB = 1000 GB (decimal) — mdadm/mdstat reporta
 * tamaños en KiB/MiB, pero el dimensionamiento se hace sobre los GB brutos.
 */
import React, { useMemo, useState } from 'react';
import { HardDrive, AlertTriangle, Database, RefreshCw, BookOpen, Terminal, FileText } from 'lucide-react';
import {
  inputCls, btnPrimary, Field, Row, CodeBlock, ErrorBanner, InfoBanner, Tabs,
  buildNoteHtmlTable, useAddToNoteToast,
} from '../_shared';
import { useNoteStore } from '../../../store/noteStore';
import { escapeHtml } from '../../../utils/escapeHtml';

type RaidLevel = '0' | '1' | '5' | '6' | '10';
type SizeUnit = 'GB' | 'TB';

interface LevelResult {
  level: RaidLevel;
  valid: boolean;
  requirement: string;
  usableGB: number | null;
  fault: string;
  readNote: string;
  writeNote: string;
  overheadPct: number | null;
  risk: string;
  /** Discos que se leen COMPLETOS durante el rebuild de 1 disco (para URE). */
  rebuildReadDisks: number | null;
}

/** Letras de dispositivo /dev/sdb, sdc… sdz, sdaa, sdab… (b + i). */
function sdDev(i: number): string {
  if (i < 25) return 'sd' + String.fromCharCode(98 + i);
  return 'sda' + String.fromCharCode(97 + (i - 25));
}

function fmtGB(gb: number | null): string {
  if (gb === null || !Number.isFinite(gb)) return '—';
  if (gb >= 1000) return (gb / 1000).toFixed(2).replace('.', ',') + ' TB';
  return (Number.isInteger(gb) ? gb.toFixed(0) : gb.toFixed(1).replace('.', ',')) + ' GB';
}

function fmtPct(p: number | null): string {
  if (p === null || !Number.isFinite(p)) return '—';
  return p.toFixed(1).replace('.', ',') + '%';
}

export const SaRaidTool: React.FC = () => {
  const [nStr, setNStr] = useState('4');
  const [sizeStr, setSizeStr] = useState('4');
  const [unit, setUnit] = useState<SizeUnit>('TB');
  const [sparesStr, setSparesStr] = useState('0');
  const [level, setLevel] = useState<RaidLevel>('5');
  const { addedToast, showToast } = useAddToNoteToast();

  const calc = useMemo(() => {
    const errors: string[] = [];
    const n = Number.parseInt(nStr, 10);
    if (!Number.isInteger(n) || n < 2 || n > 32) errors.push('Número de discos: entero entre 2 y 32.');
    const size = Number.parseFloat(sizeStr.replace(',', '.'));
    if (!Number.isFinite(size) || size <= 0) errors.push('Capacidad por disco: número mayor que 0.');
    const spares = Number.parseInt(sparesStr, 10);
    if (!Number.isInteger(spares) || spares < 0) errors.push('Hot spares: entero ≥ 0.');
    const sizeGB = unit === 'TB' ? size * 1000 : size;
    const d = n - (Number.isInteger(spares) ? spares : 0);

    if (errors.length === 0) {
      if (spares > n - 2) errors.push(`Hot spares: máximo ${n - 2} (deben quedar ≥ 2 discos de datos).`);
      if (unit === 'GB' && sizeGB < 1) errors.push('Capacidad por disco: mínimo 1 GB.');
    }

    const results: LevelResult[] = (['0', '1', '5', '6', '10'] as RaidLevel[]).map((lvl) => {
      const minDisks: Record<RaidLevel, number> = { '0': 2, '1': 2, '5': 3, '6': 4, '10': 4 };
      const even = lvl === '10';
      const min = minDisks[lvl];
      let valid = d >= min;
      let requirement = `≥ ${min} discos de datos`;
      if (even) {
        valid = d >= min && d % 2 === 0;
        requirement = `número PAR de discos, ≥ ${min}`;
      }
      if (!valid) {
        return {
          level: lvl, valid, requirement, usableGB: null, overheadPct: null, rebuildReadDisks: null,
          fault: '—', readNote: '—', writeNote: '—',
          risk: `Inválido con ${d} discos de datos: ${requirement}.`,
        };
      }
      switch (lvl) {
        case '0':
          return {
            level: lvl, valid, requirement, usableGB: d * sizeGB, overheadPct: 0, rebuildReadDisks: null,
            fault: '0 discos',
            readNote: `~${d}× (striping puro)`,
            writeNote: `~${d}× (striping puro)`,
            risk: 'Sin redundancia: un solo fallo pierde TODO el array. Solo para datos regenerables.',
          };
        case '1':
          return {
            level: lvl, valid, requirement, usableGB: sizeGB, overheadPct: ((d - 1) / d) * 100, rebuildReadDisks: d - 1,
            fault: `${d - 1} disco${d > 2 ? 's' : ''} (queda 1 vivo)`,
            readNote: `~${d}× (cualquier espejo sirve lecturas)`,
            writeNote: '1× (cada disco escribe todo el contenido)',
            risk: 'Simple y tolerante; con >2 discos el desperdicio crece — lo típico es el par clásico de 2.',
          };
        case '5':
          return {
            level: lvl, valid, requirement, usableGB: (d - 1) * sizeGB, overheadPct: (1 / d) * 100, rebuildReadDisks: d - 1,
            fault: '1 disco',
            readNote: `~${d - 1}× (la paridad también sirve lecturas)`,
            writeNote: 'Escritura pequeña penalizada: 4 IOPS (leer dato + paridad, escribir ambos)',
            risk: 'Write hole ante cortes de energía + riesgo URE en discos grandes durante rebuilds largos.',
          };
        case '6':
          return {
            level: lvl, valid, requirement, usableGB: (d - 2) * sizeGB, overheadPct: (2 / d) * 100, rebuildReadDisks: d - 1,
            fault: '2 discos',
            readNote: `~${d - 2}× (dos bloques de paridad)`,
            writeNote: 'Escritura pequeña muy penalizada: 6 IOPS (leer dato + 2 paridades, escribir los 3)',
            risk: 'La paridad doble aguanta 2 fallos y rebuilds largos — ideal para archives, no para escritura aleatoria.',
          };
        default:
          return {
            level: lvl, valid, requirement, usableGB: Math.floor(d / 2) * sizeGB, overheadPct: 50, rebuildReadDisks: 1,
            fault: `${d / 2} disco${d / 2 > 1 ? 's' : ''} (uno por par espejo, de pares distintos)`,
            readNote: `~${d}× (cualquier copia del stripe sirve)`,
            writeNote: `~${d / 2}× (cada mitad se escribe en paralelo)`,
            risk: 'Dos fallos en el MISMO par espejo = pérdida total. 50% de la capacidad se paga en espejo.',
          };
      }
    });

    // Estimaciones de rebuild (heurística APROXIMADA) — solo niveles con redundancia.
    const sel = results.find((r) => r.level === level && r.valid) ?? null;
    const theoryH = sizeGB / 720; // 200 MB/s sostenidos ≈ 720 GB/h
    const loadH = (sizeGB / 1000) * 3; // heurística: ~3 h por TB bajo carga de producción
    // Riesgo URE durante el rebuild de 1 disco: se leen completos los discos supervivientes.
    const readDisks = sel?.rebuildReadDisks ?? null;
    const readTB = readDisks !== null ? (readDisks * sizeGB) / 1000 : null;
    const ureP = (rate: number): number | null => {
      if (readTB === null) return null;
      const bits = readTB * 8e12;
      return 1 - Math.exp(-bits * rate); // aproximación de 1-(1-r)^bits
    };
    const pSata = ureP(1 / 1e14);
    const pEnt = ureP(1 / 1e15);

    // Comando mdadm --create generado en vivo para la configuración actual.
    const devices: string[] = [];
    for (let i = 0; i < d; i++) devices.push('/dev/' + sdDev(i));
    const spareDevs: string[] = [];
    for (let i = d; i < d + spares; i++) spareDevs.push('/dev/' + sdDev(i));
    let mdadmCmd = `mdadm --create /dev/md0 --level=${level} --raid-devices=${d} ` +
      (devices.length <= 8 ? `/dev/sd{${devices.map((p) => p.slice(5)).join(',')}}` : devices.join(' '));
    if (spareDevs.length > 0) {
      mdadmCmd += ` --spare-devices=${spareDevs.length} ` +
        (spareDevs.length <= 8 ? `/dev/sd{${spareDevs.map((p) => p.slice(5)).join(',')}}` : spareDevs.join(' '));
    }

    return { errors, n, sizeGB, spares, d, results, theoryH, loadH, readTB, pSata, pEnt, mdadmCmd };
  }, [nStr, sizeStr, unit, sparesStr, level]);

  const selected = calc.results.find((r) => r.level === level) ?? null;
  const inputValid = calc.errors.length === 0;

  const handleAddToNote = () => {
    if (!inputValid || !selected?.valid || selected.usableGB === null) return;
    const rows: [string, string][] = [
      ['Discos totales', `${calc.n} × ${fmtGB(calc.sizeGB)}`],
      ['Hot spares', String(calc.spares)],
      ['Discos de datos', String(calc.d)],
      ['Nivel RAID', `RAID ${level}`],
      ['Capacidad cruda', fmtGB(calc.n * calc.sizeGB)],
      ['Capacidad usable', fmtGB(selected.usableGB)],
      ['Tolerancia a fallos', selected.fault],
      ['Overhead', fmtPct(selected.overheadPct)],
      ['Rebuild (aprox.)', `${calc.theoryH.toFixed(1)} h teórico / ${calc.loadH.toFixed(1)} h bajo carga por disco`],
      ['P(≥1 URE) en rebuild', calc.pSata !== null ? `${(calc.pSata * 100).toFixed(1).replace('.', ',')}% (SATA 10^14) · ${(calc.pEnt !== null ? calc.pEnt * 100 : 0).toFixed(2).replace('.', ',')}% (enterprise 10^15)` : 'n/a'],
      ['Riesgos', escapeHtml(selected.risk)],
      ['Comando create', escapeHtml(calc.mdadmCmd)],
    ];
    useNoteStore.getState().enqueueNote(`RAID ${level} — ${calc.n} discos`, buildNoteHtmlTable(rows));
    showToast();
  };

  return (
    <div className="space-y-4">
      <InfoBanner>
        <span className="font-semibold">RAID Calculator — 100% offline y educativo.</span>{' '}
        Calcula la capacidad usable, tolerancia a fallos y overhead de los niveles 0/1/5/6/10 con las fórmulas exactas, y los compara TODOS con tu configuración actual. Nada se ejecuta: es un simulador de dimensionamiento para estudiar antes de tocar mdadm.
      </InfoBanner>

      {/* ─── Entradas ─── */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
          <HardDrive className="w-3 h-3" /> Configuración del array
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Número de discos (2-32)" hint="Discos físicos totales del array">
            <input className={inputCls} value={nStr} onChange={(e) => setNStr(e.target.value)} placeholder="4" inputMode="numeric" />
          </Field>
          <Field label="Capacidad por disco" hint="TB decimal (1 TB = 1000 GB), como etiquetan los fabricantes">
            <div className="flex gap-2">
              <input className={inputCls + ' flex-1'} value={sizeStr} onChange={(e) => setSizeStr(e.target.value)} placeholder="4" inputMode="decimal" />
              <select className={inputCls + ' w-20'} value={unit} onChange={(e) => setUnit(e.target.value as SizeUnit)}>
                <option value="GB">GB</option>
                <option value="TB">TB</option>
              </select>
            </div>
          </Field>
          <Field label="Hot spares (0..n-2)" hint="En standby: no aportan capacidad, reducen la ventana sin redundancia">
            <input className={inputCls} value={sparesStr} onChange={(e) => setSparesStr(e.target.value)} placeholder="0" inputMode="numeric" />
          </Field>
          <Field label="Nivel a detallar" hint="La tabla de abajo compara TODOS los niveles">
            <Tabs
              tabs={[
                { id: '0', label: '0' }, { id: '1', label: '1' }, { id: '5', label: '5' },
                { id: '6', label: '6' }, { id: '10', label: '10' },
              ]}
              active={level}
              onChange={(id) => setLevel(id as RaidLevel)}
            />
          </Field>
        </div>
      </div>

      {calc.errors.map((e) => <ErrorBanner key={e} message={e} />)}

      {inputValid && (
        <>
          {/* ─── Detalle del nivel seleccionado ─── */}
          {selected && (
            <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                <Database className="w-3 h-3" /> RAID {level} — con {calc.n} discos de {fmtGB(calc.sizeGB)}
              </h3>
              {selected.valid ? (
                <>
                  <Row label="Discos de datos / spares" value={`${calc.d} / ${calc.spares}`} />
                  <Row label="Capacidad cruda (n × tamaño)" value={fmtGB(calc.n * calc.sizeGB)} mono />
                  <Row label="Capacidad usable" value={fmtGB(selected.usableGB)} mono />
                  <Row label="Tolerancia a fallos" value={selected.fault} />
                  <Row label="Overhead" value={fmtPct(selected.overheadPct)} mono />
                  {calc.spares > 0 && (
                    <Row label="Efecto de los spares" value={`${calc.spares} en standby — al fallar un disco, mdadm lo reconstruye automáticamente en el spare`} />
                  )}
                  {level === '0' && calc.spares > 0 && (
                    <div className="px-3 py-2 rounded border border-yellow-500/40 bg-yellow-500/10 text-yellow-400 text-[11px] leading-relaxed flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      RAID0 no aprovecha spares: sin redundancia, un disco de repuesto nunca entra al array — elimínalo o cambia de nivel.
                    </div>
                  )}
                </>
              ) : (
                <ErrorBanner message={`RAID ${level} no es válido aquí: ${selected.requirement} (tienes ${calc.d} discos de datos).`} />
              )}
            </div>
          )}

          {/* ─── Tabla comparativa ─── */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
              <BookOpen className="w-3 h-3" /> Comparación de todos los niveles ({calc.d} discos de datos + {calc.spares} spare{calc.spares === 1 ? '' : 's'})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] border-collapse min-w-[720px]">
                <thead>
                  <tr className="text-[9px] uppercase tracking-wider text-[#555]">
                    <th className="border-b border-[#262626] px-2 py-1.5 text-left">Nivel</th>
                    <th className="border-b border-[#262626] px-2 py-1.5 text-left">Mín. discos</th>
                    <th className="border-b border-[#262626] px-2 py-1.5 text-right">Capacidad usable</th>
                    <th className="border-b border-[#262626] px-2 py-1.5 text-center">Puede fallar</th>
                    <th className="border-b border-[#262626] px-2 py-1.5 text-left">Lectura / Escritura</th>
                    <th className="border-b border-[#262626] px-2 py-1.5 text-right">Overhead</th>
                    <th className="border-b border-[#262626] px-2 py-1.5 text-left">Riesgos</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.results.map((r) => (
                    <tr
                      key={r.level}
                      className={r.level === level ? 'bg-cyan-500/10' : ''}
                    >
                      <td className={`px-2 py-1.5 font-mono font-bold ${r.level === level ? 'text-cyan-300' : 'text-white'}`}>RAID {r.level}</td>
                      <td className="px-2 py-1.5">
                        {r.valid ? (
                          <span className="text-green-400">✓ {r.requirement}</span>
                        ) : (
                          <span className="text-red-400">✗ {r.requirement}</span>
                        )}
                      </td>
                      <td className={`px-2 py-1.5 text-right font-mono ${r.valid ? 'text-white' : 'text-[#444]'}`}>{fmtGB(r.usableGB)}</td>
                      <td className={`px-2 py-1.5 text-center ${r.valid ? 'text-white' : 'text-[#444]'}`}>{r.fault}</td>
                      <td className={`px-2 py-1.5 ${r.valid ? 'text-[#AAA]' : 'text-[#444]'}`}>
                        <span className="text-green-300">L:</span> {r.readNote} · <span className="text-orange-300">E:</span> {r.writeNote}
                      </td>
                      <td className={`px-2 py-1.5 text-right font-mono ${r.valid ? 'text-white' : 'text-[#444]'}`}>{fmtPct(r.overheadPct)}</td>
                      <td className={`px-2 py-1.5 ${r.valid ? 'text-[#888]' : 'text-[#444]'}`}>{r.risk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-[#666] leading-relaxed">
              Overhead = capacidad de datos − capacidad usable. Los spares quedan FUERA del cálculo: no almacenan datos ni paridad — permanecen vacíos hasta que un disco falla.
            </p>
          </div>

          {/* ─── Tarjetas de estudio ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3" /> Rebuild de un disco (APROXIMADO)
              </h3>
              <Row label="Teórico a 200 MB/s" value={`${calc.theoryH.toFixed(1).replace('.', ',')} h por disco`} mono />
              <Row label="Bajo carga (heurística)" value={`≈ ${calc.loadH.toFixed(1).replace('.', ',')} h por disco (${((calc.sizeGB / 1000) * 3).toFixed(0)} h/TB)`} mono />
              <p className="text-[10px] text-[#888] leading-relaxed">
                <span className="text-yellow-400">Etiqueta APROXIMADA.</span> El rebuild lee TODO el contenido de los discos supervivientes mientras el array sigue sirviendo I/O de producción: el throughput de cada disco se reparte entre reconstrucción y usuarios. Con varios TB el array pasa HORAS en estado degradado — esa es la ventana de riesgo.
              </p>
              <p className="text-[10px] text-[#666] leading-relaxed">
                mdadm regula la velocidad en <code className="text-blue-300">/proc/sys/dev/raid/speed_limit_min</code> (1.000 KB/s) y <code className="text-blue-300">speed_limit_max</code> (200.000 KB/s): sube el máximo para acelerar a costa del I/O de producción.
              </p>
            </div>

            <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> Riesgo URE durante el rebuild
              </h3>
              {calc.readTB !== null && calc.pSata !== null && calc.pEnt !== null ? (
                <>
                  <Row label="Lectura total del rebuild" value={`${calc.readTB.toFixed(2).replace('.', ',')} TB (${level === '10' ? '1 espejo del disco caído' : `${calc.d - 1} discos completos`})`} mono />
                  <Row label="P(≥1 URE) SATA (1/10^14)" value={`${(calc.pSata * 100).toFixed(1).replace('.', ',')}%`} mono />
                  <Row label="P(≥1 URE) enterprise (1/10^15)" value={`${(calc.pEnt * 100).toFixed(2).replace('.', ',')}%`} mono />
                </>
              ) : (
                <p className="text-[10px] text-[#888]">
                  {level === '0'
                    ? 'RAID0 no tiene rebuild: sin redundancia, un fallo es terminal.'
                    : `RAID ${level} no es válido con ${calc.d} discos de datos — corrige la configuración para ver el riesgo URE.`}
                </p>
              )}
              {calc.readTB !== null && (
                <p className="text-[10px] text-[#888] leading-relaxed">
                  Un URE (error de lectura no recuperable) es un sector ilegible: la tasa típica SATA es 1 cada 10^14 bits ≈ 12,5 TB leídos. Si ocurre DURANTE un rebuild de RAID5, mdadm aborta la reconstrucción y el array queda degradado con datos potencialmente corruptos — por eso los niveles con paridad simple se evitan en discos grandes.
                </p>
              )}
            </div>

            <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> RAID5: el write hole
              </h3>
              <p className="text-[10px] text-[#888] leading-relaxed">
                Si se corta la energía entre la escritura del bloque de <span className="text-white">datos</span> y la de su <span className="text-white">paridad</span>, el array queda inconsistente sin que nadie lo note: el filesystem cree que todo se escribió. El siguiente rebuild puede reconstruir bloques a partir de paridad vieja y propagar corrupción silenciosa. Mitigaciones: UPS, RAID 6 (doble paridad) o niveles con checksums por bloque (ZFS/btrfs), y RAID 1/10 donde no existe paridad.
              </p>
            </div>

            <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                <BookOpen className="w-3 h-3" /> Cheat-sheet: cuándo usar cada nivel
              </h3>
              <ul className="text-[10px] text-[#888] leading-relaxed space-y-1">
                <li><code className="text-blue-300">RAID 0</code> — scratch, caches regenerables, máx velocidad. Cero tolerancia.</li>
                <li><code className="text-blue-300">RAID 1</code> — disco del SO, VMs pequeñas: simple, arranque tolerante, 2 discos.</li>
                <li><code className="text-blue-300">RAID 5</code> — file shares de lectura intensiva con 3-8 discos medianos. Cuidado con URE/write hole en SATA grandes.</li>
                <li><code className="text-blue-300">RAID 6</code> — archives y backups con 6+ discos grandes: 2 fallos de margen para rebuilds largos.</li>
                <li><code className="text-blue-300">RAID 10</code> — BD transaccionales (MySQL/PostgreSQL): mejor escritura aleatoria y rebuilds cortos.</li>
              </ul>
            </div>
          </div>

          {/* ─── mdadm ─── */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
              <Terminal className="w-3 h-3" /> mdadm — comandos de referencia
            </h3>
            <CodeBlock code={calc.mdadmCmd} label="create — generado para tu configuración" />
            <CodeBlock
              code={
                '# Estado detallado del array (nivel, estado de cada disco, UUID)\n' +
                'mdadm --detail /dev/md0\n' +
                '\n' +
                '# Progreso del rebuild/reshape en vivo ([UU_] muestra discos activos/caídos)\n' +
                'cat /proc/mdstat\n' +
                '\n' +
                '# Añadir un hot spare (o re-añadir un disco retirado)\n' +
                'mdadm /dev/md0 --add /dev/sde\n' +
                '\n' +
                '# Marcar un disco como fallido y retirarlo del array\n' +
                'mdadm /dev/md0 --fail /dev/sdd --remove /dev/sdd\n' +
                '\n' +
                '# Guardar la configuración para reensamblar el array en el arranque\n' +
                'mdadm --detail --scan >> /etc/mdadm/mdadm.conf\n' +
                'update-initramfs -u   # (Debian/Ubuntu: para que initrd conozca el array)\n' +
                '\n' +
                '# Monitor como demonio: registra eventos (fallo, rebuild) por mail/syslog\n' +
                'mdadm --monitor --scan --daemonise /dev/md0'
              }
              label="bash"
            />
            <InfoBanner>
              Los discos son ejemplos (<code className="text-blue-300">/dev/sdb, sdc…</code>): verifica siempre los nombres REALES con <code className="text-blue-300">lsblk</code> antes de crear un array — mdadm DESTRUYE lo que haya en los discos elegidos.
            </InfoBanner>
          </div>

          {/* ─── Añadir a Notas ─── */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddToNote}
              disabled={!selected?.valid}
              className={`${btnPrimary} inline-flex items-center gap-1.5 text-[11px]`}
            >
              <FileText className="w-3 h-3" /> Añadir a Notas
            </button>
            {addedToast && <span className="text-[10px] text-green-400">Añadido a Notas — crea una nota nueva para verlo.</span>}
          </div>
        </>
      )}
    </div>
  );
};

