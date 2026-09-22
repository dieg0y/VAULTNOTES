'use client';

/**
 * SaLvmTool.tsx — Planificador LVM (PV → VG → LV → montaje).
 *
 * Todo se calcula EN VIVO con useMemo (100% offline, educativo):
 *  - Lista dinámica de PVs y LVs (añadir/quitar filas).
 *  - Aritmética EXACTA de extents: total = floor(MiB/PE), por LV
 *    ceil(MiB/PE) con redondeo hacia arriba cuando el tamaño no es
 *    múltiplo del PE (se muestra el tamaño efectivo).
 *  - Tabla de asignación por LV + extents/GB libres + barra visual.
 *  - Secuencia de comandos etiquetada paso a paso: pvcreate → vgcreate
 *    (con -s PE) → lvcreate -y → mkfs → mkdir → mount → /etc/fstab
 *    (con nofail) → daemon-reload → mount -a ANTES de reiniciar.
 *  - Referencia de display (pvs/vgs/lvs, pvdisplay…) y ruta de
 *    extensión (vgextend + lvextend -r).
 */
import React, { useMemo, useRef, useState } from 'react';
import { Layers, HardDrive, FolderTree, Terminal, FileText, Plus, Trash2, AlertTriangle, Info } from 'lucide-react';
import {
  inputCls, btnGhost, btnDanger, btnPrimary, Field, Row, CodeBlock, ErrorBanner,
  InfoBanner, buildNoteHtmlTable, useAddToNoteToast,
} from '../_shared';
import { useNoteStore } from '../../../store/noteStore';
import { escapeHtml } from '../../../utils/escapeHtml';

type FsKind = 'ext4' | 'xfs';

interface PvRow { id: number; dev: string; sizeGB: string }
interface LvRow { id: number; name: string; sizeGB: string; mount: string; fs: FsKind }

interface LvCalc {
  row: LvRow;
  gb: number;
  extents: number;
  effGB: number;
  exact: boolean;
  valid: boolean;
}

interface Plan {
  errors: string[];
  warnings: string[];
  pvDevs: string[];
  totalGB: number;
  peMiB: number;
  totalExtents: number;
  lvCalcs: LvCalc[];
  allocExtents: number;
  freeExtents: number;
  freeGB: number;
}

const NAME_RE = /^[a-zA-Z0-9_.-]+$/;
const FSTAB_PASS: Record<FsKind, string> = { ext4: '0 2', xfs: '0 0' };

export const SaLvmTool: React.FC = () => {
  const [pvs, setPvs] = useState<PvRow[]>([{ id: 1, dev: '/dev/sdb', sizeGB: '100' }]);
  const [vgName, setVgName] = useState('vg_datos');
  const [peSize, setPeSize] = useState('32');
  const [lvs, setLvs] = useState<LvRow[]>([
    { id: 1, name: 'lv_datos', sizeGB: '40', mount: '/srv/datos', fs: 'ext4' },
    { id: 2, name: 'lv_logs', sizeGB: '20', mount: '/var/log/app', fs: 'xfs' },
  ]);
  const pvId = useRef(2);
  const lvId = useRef(3);
  const { addedToast, showToast } = useAddToNoteToast();

  const addPv = () => {
    const next = pvId.current++;
    const letter = String.fromCharCode(97 + next); // b, c, d…
    setPvs((p) => [...p, { id: next, dev: '/dev/sd' + letter, sizeGB: '100' }]);
  };
  const delPv = (id: number) => setPvs((p) => (p.length > 1 ? p.filter((r) => r.id !== id) : p));
  const updPv = (id: number, k: keyof PvRow, v: string) => setPvs((p) => p.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  const addLv = () => {
    const next = lvId.current++;
    setLvs((p) => [...p, { id: next, name: 'lv_nuevo' + next, sizeGB: '10', mount: '/mnt/nuevo' + next, fs: 'ext4' }]);
  };
  const delLv = (id: number) => setLvs((p) => (p.length > 1 ? p.filter((r) => r.id !== id) : p));
  const updLv = (id: number, k: keyof LvRow, v: string) => setLvs((p) => p.map((r) => (r.id === id ? { ...r, [k]: v } : r)));

  const plan: Plan = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const peMiB = Number.parseInt(peSize, 10);
    const vg = vgName.trim();

    if (!vg) errors.push('El nombre del VG es obligatorio.');
    else if (!NAME_RE.test(vg) || vg.startsWith('-')) errors.push(`Nombre de VG inválido: «${vg}» — usa letras, números, punto, guion y guion bajo.`);

    const pvDevs: string[] = [];
    let totalGB = 0;
    pvs.forEach((pv, i) => {
      const dev = pv.dev.trim();
      const gb = Number.parseFloat(pv.sizeGB.replace(',', '.'));
      if (!dev.startsWith('/dev/')) errors.push(`PV ${i + 1}: la ruta debe empezar por /dev/ (p. ej. /dev/sdb).`);
      else pvDevs.push(dev);
      if (!Number.isFinite(gb) || gb <= 0) errors.push(`PV ${i + 1} (${dev || 'sin ruta'}): la capacidad en GB debe ser un número mayor que 0.`);
      else totalGB += gb;
    });
    if (pvs.length === 0) errors.push('Añade al menos un volumen físico (PV).');

    const totalExtents = Math.floor((totalGB * 1024) / peMiB);

    const lvCalcs: LvCalc[] = lvs.map((row) => {
      const gb = Number.parseFloat(row.sizeGB.replace(',', '.'));
      const name = row.name.trim();
      let valid = true;
      if (!NAME_RE.test(name) || name.startsWith('-')) {
        errors.push(`LV «${name || 'vacío'}»: nombre inválido — usa letras, números, punto, guion y guion bajo.`);
        valid = false;
      }
      if (!Number.isFinite(gb) || gb <= 0) {
        errors.push(`LV ${name || '(sin nombre)'}: el tamaño en GB debe ser un número mayor que 0.`);
        valid = false;
      }
      if (!row.mount.trim().startsWith('/')) {
        errors.push(`LV ${name}: el punto de montaje debe empezar por / (p. ej. /srv/datos).`);
        valid = false;
      }
      const reqMiB = gb * 1024;
      const extents = Math.ceil(reqMiB / peMiB);
      const exact = valid && reqMiB % peMiB === 0;
      if (valid && !exact) {
        warnings.push(`${name}: ${gb} GB no es múltiplo de ${peMiB} MiB → se asignan ${extents} extents (${((extents * peMiB) / 1024).toFixed(2).replace('.', ',')} GB efectivos, redondeo hacia arriba).`);
      }
      return { row, gb, extents, effGB: (extents * peMiB) / 1024, exact, valid };
    });
    if (lvs.length === 0) errors.push('Añade al menos un volumen lógico (LV).');

    const allocExtents = lvCalcs.reduce((a, l) => a + (l.valid ? l.extents : 0), 0);
    if (errors.length === 0 && allocExtents > totalExtents) {
      const missingGB = ((allocExtents - totalExtents) * peMiB) / 1024;
      errors.push(
        `Sobre-asignación: los LV requieren ${allocExtents} extents (${((allocExtents * peMiB) / 1024).toFixed(2)} GB) ` +
        `pero el VG solo tiene ${totalExtents} extents (${((totalExtents * peMiB) / 1024).toFixed(2)} GB) — faltan ${missingGB.toFixed(2).replace('.', ',')} GB.`
      );
    }
    const freeExtents = Math.max(0, totalExtents - allocExtents);
    return { errors, warnings, pvDevs, totalGB, peMiB, totalExtents, lvCalcs, allocExtents, freeExtents, freeGB: (freeExtents * peMiB) / 1024 };
  }, [pvs, vgName, peSize, lvs]);

  const vg = vgName.trim();
  const steps = useMemo(() => {
    if (plan.errors.length > 0 || plan.pvDevs.length === 0 || plan.lvCalcs.length === 0) return [] as { title: string; why: string; code: string }[];
    const validLvs = plan.lvCalcs.filter((l) => l.valid);
    const lvPath = (name: string) => `/dev/${vg}/${name}`;
    return [
      {
        title: 'Crear los volúmenes físicos (PV)',
        why: 'pvcreate escribe la metadata de LVM al inicio de cada dispositivo. ATENCIÓN: borra la tabla de particiones y todo lo que hubiera en el disco.',
        code: `sudo pvcreate ${plan.pvDevs.join(' ')}`,
      },
      {
        title: `Crear el grupo de volúmenes (VG) con PE de ${plan.peMiB} MiB`,
        why: `vgcreate fusiona los PV en un pool único de extents y fija el PE size (-s). A partir de aquí los discos individuales dejan de importar: se asigna espacio en extents.`,
        code: `sudo vgcreate -s ${plan.peMiB}M ${vg} ${plan.pvDevs.join(' ')}`,
      },
      {
        title: 'Crear los volúmenes lógicos (LV)',
        why: 'Cada lvcreate reserva extents del VG. -y responde sí a las confirmaciones (ideal para scripts); -L fija el tamaño y -n el nombre.',
        code: validLvs.map((l) => `sudo lvcreate -y -L ${l.gb}G -n ${l.row.name.trim()} ${vg}`).join('\n'),
      },
      {
        title: 'Crear los filesystems',
        why: 'El LV es un bloque en bruto: necesita filesystem. ext4 para uso general; xfs para datos grandes y escrituras paralelas (crece solo en caliente).',
        code: validLvs.map((l) => `sudo mkfs.${l.row.fs} ${lvPath(l.row.name.trim())}`).join('\n'),
      },
      {
        title: 'Crear los puntos de montaje',
        why: 'mkdir -p crea la ruta completa sin quejarse si ya existe.',
        code: validLvs.map((l) => `sudo mkdir -p ${l.row.mount.trim()}`).join('\n'),
      },
      {
        title: 'Montar los LVs',
        why: 'Montaje inmediato (no persistente todavía): primero comprueba que todo funciona, luego lo haces permanente en fstab.',
        code: validLvs.map((l) => `sudo mount ${lvPath(l.row.name.trim())} ${l.row.mount.trim()}`).join('\n'),
      },
      {
        title: '/etc/fstab — persistencia (AÑADIR, no sobrescribir)',
        why: 'nofail evita que un VG ausente deje el servidor colgado en emergency mode. ext4 usa fsck pass 2 (no root); xfs usa 0: no se fsck-ea al arranque (xfs_repair es manual).',
        code: validLvs
          .map((l) => `${lvPath(l.row.name.trim())}  ${l.row.mount.trim()}  ${l.row.fs}  defaults,nofail  ${FSTAB_PASS[l.row.fs]}`)
          .join('\n'),
      },
      {
        title: 'Recargar las unidades de systemd',
        why: 'fstab genera units .mount de systemd: daemon-reload las registra para poder automount/umount con systemctl.',
        code: 'sudo systemctl daemon-reload',
      },
      {
        title: 'PROBAR ANTES DE REINICIAR',
        why: 'mount -a monta todo lo del fstab: si no imprime errores y findmnt --verify valida, es seguro reiniciar. Un fstab roto puede dejar el servidor sin arrancar.',
        code: 'sudo mount -a\nfindmnt --verify',
      },
    ];
  }, [plan, vg]);

  const allocPct = plan.totalExtents > 0 ? (plan.allocExtents / plan.totalExtents) * 100 : 0;

  const handleAddToNote = () => {
    if (plan.errors.length > 0) return;
    const rows: [string, string][] = [
      ['VG', escapeHtml(vg)],
      ['PE size', `${plan.peMiB} MiB`],
      ['PVs', escapeHtml(plan.pvDevs.join(', '))],
      ['Capacidad total', `${plan.totalGB} GB → ${plan.totalExtents} extents`],
      ...plan.lvCalcs.filter((l) => l.valid).map((l): [string, string] => [
        `LV ${l.row.name.trim()}`,
        `${l.gb} GB → ${l.extents} extents (${l.effGB.toFixed(2).replace('.', ',')} GB efectivos) · ${l.row.fs} · ${l.row.mount.trim()}`,
      ]),
      ['Libre', `${plan.freeExtents} extents (${plan.freeGB.toFixed(2).replace('.', ',')} GB)`],
    ];
    const cmds = steps.map((s) => `# ${s.title}\n${s.code}`).join('\n\n');
    const pre = `<pre style="background:#0A0A0A;border:1px solid #262626;padding:8px;font-family:monospace;font-size:11px;color:#95E6C8;white-space:pre-wrap;">${escapeHtml(cmds)}</pre>`;
    useNoteStore.getState().enqueueNote('LVM — ' + vg, buildNoteHtmlTable(rows) + pre);
    showToast();
  };

  const rmBtn = (fn: () => void, disabled: boolean) => (
    <button type="button" onClick={fn} disabled={disabled} className={btnDanger + ' shrink-0'} title="Quitar fila">
      <Trash2 className="w-3 h-3" />
    </button>
  );

  return (
    <div className="space-y-4">
      <InfoBanner>
        <span className="font-semibold">LVM Planner — 100% offline y educativo.</span>{' '}
        Planifica la pila PV → VG → LV con la aritmética exacta de extents y genera la secuencia completa de comandos (pvcreate, vgcreate, lvcreate, mkfs, fstab) paso a paso. Nada se ejecuta ni sale de tu navegador.
      </InfoBanner>

      {/* ─── PVs ─── */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
          <HardDrive className="w-3 h-3" /> Volúmenes físicos (PV)
        </h3>
        {pvs.map((pv, i) => (
          <div key={pv.id} className="flex gap-2 items-center">
            <span className="text-[10px] text-[#555] font-mono w-5 shrink-0">{i + 1}.</span>
            <input className={inputCls + ' flex-1'} value={pv.dev} onChange={(e) => updPv(pv.id, 'dev', e.target.value)} placeholder="/dev/sdb" spellCheck={false} />
            <input className={inputCls + ' w-24'} value={pv.sizeGB} onChange={(e) => updPv(pv.id, 'sizeGB', e.target.value)} placeholder="100" inputMode="decimal" />
            <span className="text-[9px] text-[#555] shrink-0">GB</span>
            {rmBtn(() => delPv(pv.id), pvs.length <= 1)}
          </div>
        ))}
        <button type="button" onClick={addPv} className={`${btnGhost} text-[10px] inline-flex items-center gap-1`}>
          <Plus className="w-3 h-3" /> Añadir PV
        </button>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nombre del VG" hint="p. ej. vg_datos — como /dev/vg_datos/lv_x">
            <input className={inputCls} value={vgName} onChange={(e) => setVgName(e.target.value)} placeholder="vg_datos" spellCheck={false} />
          </Field>
          <Field label="PE size (Physical Extent)" hint="El granularity de TODO el VG: un LV solo puede ser múltiplo de esto">
            <select className={inputCls} value={peSize} onChange={(e) => setPeSize(e.target.value)}>
              {['4', '8', '16', '32', '64'].map((s) => (
                <option key={s} value={s}>{s} MiB</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* ─── LVs ─── */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
          <Layers className="w-3 h-3" /> Volúmenes lógicos (LV)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {lvs.map((lv, i) => (
            <div key={lv.id} className="border border-[#262626] rounded p-2 space-y-2 bg-[#0A0A0A]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#555] font-mono shrink-0">{i + 1}.</span>
                <input className={inputCls + ' flex-1'} value={lv.name} onChange={(e) => updLv(lv.id, 'name', e.target.value)} placeholder="lv_datos" spellCheck={false} />
                {rmBtn(() => delLv(lv.id), lvs.length <= 1)}
              </div>
              <div className="flex gap-2">
                <input className={inputCls + ' w-20'} value={lv.sizeGB} onChange={(e) => updLv(lv.id, 'sizeGB', e.target.value)} placeholder="20" inputMode="decimal" />
                <span className="text-[9px] text-[#555] shrink-0 self-center">GB</span>
                <select className={inputCls + ' w-20'} value={lv.fs} onChange={(e) => updLv(lv.id, 'fs', e.target.value)}>
                  <option value="ext4">ext4</option>
                  <option value="xfs">xfs</option>
                </select>
                <input className={inputCls + ' flex-1'} value={lv.mount} onChange={(e) => updLv(lv.id, 'mount', e.target.value)} placeholder="/srv/datos" spellCheck={false} />
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addLv} className={`${btnGhost} text-[10px] inline-flex items-center gap-1`}>
          <Plus className="w-3 h-3" /> Añadir LV
        </button>
      </div>

      {/* ─── Validación ─── */}
      {plan.errors.map((e) => <ErrorBanner key={e} message={e} />)}
      {plan.errors.length === 0 && plan.warnings.map((w) => (
        <div key={w} className="px-3 py-2 rounded border border-yellow-500/40 bg-yellow-500/10 text-yellow-400 text-[11px] leading-relaxed flex items-start gap-1.5">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {w}
        </div>
      ))}

      {plan.errors.length === 0 && (
        <>
          {/* ─── Resumen del VG ─── */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
              <FolderTree className="w-3 h-3" /> Resumen de {vg}
            </h3>
            <Row label="Capacidad total (PVs)" value={`${plan.totalGB} GB`} mono />
            <Row label="PE size / extents totales" value={`${plan.peMiB} MiB · ${plan.totalExtents} extents`} mono />
            <Row label="Extents asignados a LVs" value={`${plan.allocExtents} (${((plan.allocExtents * plan.peMiB) / 1024).toFixed(2).replace('.', ',')} GB)`} mono />
            <Row label="Extents libres" value={`${plan.freeExtents} (${plan.freeGB.toFixed(2).replace('.', ',')} GB)`} mono />
            <div className="pt-1">
              <div className="h-2 rounded overflow-hidden flex border border-[#262626] bg-[#161616]">
                <div className="h-full bg-cyan-500/80" style={{ width: `${allocPct}%` }} title={`Asignado: ${plan.allocExtents} extents`} />
                <div className="h-full flex-1 bg-[#222]" title={`Libre: ${plan.freeExtents} extents`} />
              </div>
              <p className="text-[9px] text-[#555] mt-1">
                {allocPct.toFixed(0)}% asignado — los extents libres se usan con lvextend sin interrupción de servicio.
              </p>
            </div>
          </div>

          {/* ─── Tabla de asignación ─── */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
              <Layers className="w-3 h-3" /> Asignación por LV
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="text-[9px] uppercase tracking-wider text-[#555]">
                    <th className="border-b border-[#262626] px-2 py-1.5 text-left">LV</th>
                    <th className="border-b border-[#262626] px-2 py-1.5 text-right">Solicitado</th>
                    <th className="border-b border-[#262626] px-2 py-1.5 text-right">Extents</th>
                    <th className="border-b border-[#262626] px-2 py-1.5 text-right">Efectivo</th>
                    <th className="border-b border-[#262626] px-2 py-1.5 text-left">FS</th>
                    <th className="border-b border-[#262626] px-2 py-1.5 text-left">Montaje</th>
                    <th className="border-b border-[#262626] px-2 py-1.5 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.lvCalcs.map((l) => (
                    <tr key={l.row.id}>
                      <td className="px-2 py-1.5 font-mono text-white">{l.row.name.trim()}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-white">{l.gb} GB</td>
                      <td className="px-2 py-1.5 text-right font-mono text-cyan-300">{l.extents}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-white">{l.effGB.toFixed(2).replace('.', ',')} GB</td>
                      <td className="px-2 py-1.5 text-[#AAA]">{l.row.fs}</td>
                      <td className="px-2 py-1.5 font-mono text-[#AAA]">{l.row.mount.trim()}</td>
                      <td className="px-2 py-1.5">
                        {l.exact ? (
                          <span className="text-green-400">✓ múltiplo exacto</span>
                        ) : (
                          <span className="text-yellow-400">↥ redondeado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="px-2 py-1.5 font-mono text-[#888]">libre</td>
                    <td className="px-2 py-1.5" />
                    <td className="px-2 py-1.5 text-right font-mono text-[#888]">{plan.freeExtents}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-[#888]">{plan.freeGB.toFixed(2).replace('.', ',')} GB</td>
                    <td className="px-2 py-1.5" colSpan={3} />
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-[#666] leading-relaxed">
              Extents = ceil(GB × 1024 / PE). Un LV solo puede ser múltiplo del PE: 1 GB con PE de 32 MiB son exactamente 32 extents, pero 10,1 GB son 323 extents (10,09 GB) → se redondean a 324 (10,25 GB efectivos).
            </p>
          </div>

          {/* ─── Comandos paso a paso ─── */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
              <Terminal className="w-3 h-3" /> Secuencia de despliegue
            </h3>
            {steps.map((s, i) => (
              <div key={s.title} className="space-y-1">
                <p className="text-[11px] font-semibold text-white">
                  <span className="text-cyan-400 font-mono">Paso {i + 1}</span> — {s.title}
                </p>
                <p className="text-[10px] text-[#666] leading-relaxed">{s.why}</p>
                <CodeBlock code={s.code} label={i === 6 ? '/etc/fstab (añadir al final)' : 'bash'} />
              </div>
            ))}
            <div className="px-3 py-2 rounded border border-red-500/40 bg-red-500/10 text-red-400 text-[11px] leading-relaxed flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              Regla de oro: ejecuta <code>sudo mount -a</code> y <code>findmnt --verify</code> ANTES de reiniciar. Un fstab con errores de UUID/ruta deja el servidor en emergency mode en el próximo arranque.
            </div>
          </div>
        </>
      )}

      {/* ─── Referencia ─── */}
      <details className="bg-[#0D0D0D] border border-[#262626] rounded p-3">
        <summary className="cursor-pointer text-xs font-semibold text-white flex items-center gap-1.5">
          <Info className="w-3 h-3 text-cyan-400" /> Referencia: inspección y extensión
        </summary>
        <div className="mt-2 space-y-3">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-white">Inspección de la pila</p>
            <CodeBlock
              code={
                '# Resúmenes de una línea por objeto (para scripts)\n' +
                'pvs   # PV: tamaño, cuánto está en VGs\n' +
                'vgs   # VG: extents totales/usados/libres\n' +
                'lvs   # LV: tamaño, atributos (w = rw, a = activo)\n' +
                '\n' +
                '# Detalle completo de un objeto concreto\n' +
                'pvdisplay /dev/sdb\n' +
                `vgdisplay ${vg || 'vg_datos'}\n` +
                'lvdisplay /dev/vg_datos/lv_datos'
              }
              label="bash"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-white">Ruta de extensión (cuando se llene)</p>
            <CodeBlock
              code={
                '# 1. Inicializar el disco nuevo como PV\n' +
                'sudo pvcreate /dev/sdd\n' +
                '\n' +
                '# 2. Añadirlo al VG: los extents libres crecen al instante\n' +
                `sudo vgextend ${vg || 'vg_datos'} /dev/sdd\n` +
                '\n' +
                '# 3. Extender el LV Y su filesystem en un solo paso\n' +
                '#    (-r lanza resize2fs para ext4 o xfs_growfs para xfs)\n' +
                'sudo lvextend -r -L +50G /dev/vg_datos/lv_datos\n' +
                '\n' +
                '# ...o absorber TODO el espacio libre del VG\n' +
                'sudo lvextend -r -l +100%FREE /dev/vg_datos/lv_datos'
              }
              label="bash"
            />
            <p className="text-[10px] text-[#888] leading-relaxed">
              ext4 y xfs crecen EN CALIENTE (montados) con -r. Encoger es otra historia: umount + e2fsck + resize2fs + lvreduce — y solo si quedan extents libres en el LV. Haz respaldo antes de reducir: los datos de la cola se pierden.
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-white">Activación al arranque</p>
            <CodeBlock
              code={
                '# Regla de udev que activa los VGs cuando aparecen los discos\n' +
                'systemctl status lvm2-lvmetad.service   # (o lvmlockd en clusters)\n' +
                'vgchange -ay                            # activa todos los LVs (prueba manual)'
              }
              label="bash"
            />
          </div>
        </div>
      </details>

      {/* ─── Añadir a Notas ─── */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={handleAddToNote} disabled={plan.errors.length > 0} className={`${btnPrimary} inline-flex items-center gap-1.5 text-[11px]`}>
          <FileText className="w-3 h-3" /> Añadir a Notas
        </button>
        {addedToast && <span className="text-[10px] text-green-400">Añadido a Notas — crea una nota nueva para verlo.</span>}
      </div>
    </div>
  );
};

export default SaLvmTool;
