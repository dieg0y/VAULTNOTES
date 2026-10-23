/**
 * HdPrinterTool.tsx — Printer & Spooler Fix (HelpDesk FASE 2, grupo B).
 *
 * 4 tabs: cola atascada (limpieza spool en CMD y PowerShell), spooler se cae
 * (Event ID 7031 + banner de seguridad PrintNightmare CVE-2021-34527),
 * impresora en red (mapeo \\servidor\impresora, RAW 9100 vs LPR, drivers
 * firmados) y calidad/papel/códigos (tabla de síntomas físicos).
 *
 * Cada tab de procedimiento lleva checklist interactivo (estado local) y
 * comandos con CodeBlock + CopyBtn. [Añadir a Notas] exporta el checklist del
 * tab activo con buildNoteHtmlTable + escapeHtml.
 *
 * 100% offline. Sin fetch/XHR/WebSocket/eval. Spec reference: Task ID 2-b.
 */
'use client';

import React, { useState } from 'react';
import {
  ClipboardList, AlertTriangle, Network, Wrench, Printer, BookOpen,
  CheckSquare, Square, RotateCcw, ShieldAlert,
} from 'lucide-react';
import {
  btnPrimary, btnGhost, Tabs, CodeBlock, InfoBanner, ErrorBanner,
  buildNoteHtmlTable, useAddToNoteToast,
} from '../_shared';
import { escapeHtml } from '../../../utils/escapeHtml';
import { useNoteStore } from '../../../store/noteStore';

/* ---------- tipos ---------- */

interface StepItem {
  id: string;
  text: string;
}

interface SymptomRow {
  symptom: string;
  cause: string;
  action: string;
}

/* ---------- datos ---------- */

const QUEUE_STEPS: StepItem[] = [
  { id: 'q1', text: 'Cancelar los trabajos desde la cola: Configuración → Impresoras y escáneres → abrir la cola del dispositivo → Cancelar todos los documentos.' },
  { id: 'q2', text: 'Si no se borran: parar el servicio de cola (spooler) en el EQUIPO DEL USUARIO — ver comandos CMD/PowerShell.' },
  { id: 'q3', text: 'Vaciar la carpeta de spool (System32\\spool\\PRINTERS) con el servicio parado.' },
  { id: 'q4', text: 'Arrancar de nuevo el spooler y lanzar una página de prueba.' },
  { id: 'q5', text: 'Si el trabajo se atasca de nuevo al reimprimir: driver defectuoso → reinstalar desde fuente corporativa.' },
];

const CRASH_STEPS: StepItem[] = [
  { id: 'c1', text: 'Abrir Visor de eventos → System y filtrar por Event ID 7031 (Service Control Manager): "The Print Spooler service terminated unexpectedly".' },
  { id: 'c2', text: 'Leer el detalle del 7031: qué operación lo tumbó (impresión de un documento concreto, driver que cargó) y el código de fallo.' },
  { id: 'c3', text: 'Verificar las dependencias del spooler: RPC (RpcSs) y RPC EPT Mapper (RpcEptMapper) deben estar en ejecución.' },
  { id: 'c4', text: 'Reiniciar el servicio Spooler desde services.msc o con Restart-Service Spooler.' },
  { id: 'c5', text: 'Identificar la impresora del usuario e reinstalar su driver (un driver defectuoso es la causa #1 de caídas del spooler).' },
  { id: 'c6', text: 'Si vuelve a caerse en la misma sesión: NO insistir. Capturar los eventos y escalar con el nombre del driver implicado.' },
];

const NET_STEPS: StepItem[] = [
  { id: 'n1', text: 'Comprobar conectividad al servidor de impresión por nombre Y por IP (dns vs routing).' },
  { id: 'n2', text: 'Verificar el puerto de impresión según el dispositivo: RAW 9100 (TCP directo, lo habitual en impresoras de red modernas) o LPR 515 (protocolo clásico LPD, hosts legacy).' },
  { id: 'n3', text: 'Remapear la impresora: Ejecutar → \\\\servidor\\impresora (se instala y conecta en un paso) o Add-Printer -ConnectionName en PowerShell.' },
  { id: 'n4', text: 'Verificar que el driver instalado es el corporativo y está FIRMADO: solo drivers firmados; con Point and Print el driver llega del servidor de impresión, nunca de fuentes externas.' },
  { id: 'n5', text: 'Comprobar permisos de la cola: el usuario/grupo de seguridad debe tener permiso de impresión en esa impresora del servidor.' },
  { id: 'n6', text: 'Si el servidor no responde a nadie → problema del servidor de impresión: L2 (no es una incidencia del equipo del usuario).' },
];

const PHYSICAL_SYMPTOMS: SymptomRow[] = [
  { symptom: 'Bandas verticales (láser)', cause: 'Tóner bajo o agotado; rodillo magnético sucio', action: 'Agitar/sustituir el tóner; si persiste con tóner nuevo → mantenimiento del dispositivo' },
  { symptom: 'Líneas horizontales periódicas', cause: 'Rodillo de fusor o tambor (drum) dañado', action: 'Medir la distancia entre líneas (identifica el rodillo); kit de mantenimiento' },
  { symptom: 'Páginas en blanco', cause: 'Tóner agotado, cinta protectora sin quitar o corona de transferencia sucia', action: 'Sustituir tóner, revisar sellos de embalaje; limpiar corona según manual del modelo' },
  { symptom: 'Atascos repetidos en el mismo punto', cause: 'Rodillos de arrastre gastados o papel húmedo/curvado', action: 'Cambiar el papel por fresco de paquete; si persiste → rodillos/kit de mantenimiento' },
  { symptom: 'Puntos que se repiten en cada página', cause: 'Cuerpo extraño pegado al tambor o al fusor', action: 'Inspección y limpieza según manual; no tocar el drum con los dedos' },
  { symptom: 'Impresión difuminada / "fantasmas"', cause: 'Tóner no soportado (compatible de baja calidad) o fusor frío', action: 'Verificar que el tóner es el modelo soportado; probar tóner original' },
  { symptom: 'Código de error numérico en panel', cause: 'Esquema propio de cada fabricante (HP, Brother, Kyocera…)', action: 'Buscar "código exacto + modelo" en la KB interna o manual del dispositivo; capturarlo para el ticket' },
];

const TAB_DEFS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: 'queue', label: 'Cola atascada', icon: <ClipboardList className="w-3.5 h-3.5" /> },
  { id: 'crash', label: 'Spooler se cae', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  { id: 'network', label: 'Impresora en red', icon: <Network className="w-3.5 h-3.5" /> },
  { id: 'quality', label: 'Calidad/papel/códigos', icon: <Wrench className="w-3.5 h-3.5" /> },
];

/* ---------- subcomponentes ---------- */

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">{children}</div>
);

/** Checklist interactivo reutilizable. */
const CheckList: React.FC<{
  items: StepItem[];
  checked: Record<string, boolean>;
  onToggle: (id: string) => void;
}> = ({ items, checked, onToggle }) => (
  <div className="bg-[#161616] border border-[#262626] rounded p-1.5">
    {items.map((it) => (
      <button
        key={it.id}
        type="button"
        role="checkbox"
        aria-checked={Boolean(checked[it.id])}
        onClick={() => onToggle(it.id)}
        title={checked[it.id] ? 'Marcar como pendiente' : 'Marcar como hecho'}
        className="w-full flex items-start gap-2 text-left p-1.5 rounded hover:bg-[#0D0D0D] transition-colors cursor-pointer"
      >
        {checked[it.id] ? (
          <CheckSquare className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
        ) : (
          <Square className="w-3.5 h-3.5 text-[#555] shrink-0 mt-0.5" />
        )}
        <span className={`text-[11px] leading-relaxed ${checked[it.id] ? 'text-[#666] line-through' : 'text-[#DDD]'}`}>
          {it.text}
        </span>
      </button>
    ))}
  </div>
);

/* ---------- componente principal ---------- */

export const HdPrinterTool: React.FC = () => {
  const [tab, setTab] = useState<string>('queue');
  const [done, setDone] = useState<Record<string, boolean>>({});
  const { addedToast, showToast } = useAddToNoteToast();

  const toggle = (id: string): void =>
    setDone((prev) => ({ ...prev, [id]: !prev[id] }));

  const countDone = (items: StepItem[]): number =>
    items.filter((i) => done[i.id]).length;

  /** Exporta el checklist del tab activo a Notas (todo escapado). */
  const addToNote = (): void => {
    const tabDef = TAB_DEFS.find((t) => t.id === tab);
    let rows: Array<[string, string]>;
    if (tab === 'queue') {
      rows = [['Tab', 'Cola atascada'], ...QUEUE_STEPS.map((s) => [s.id.toUpperCase(), `${done[s.id] ? '[x]' : '[ ]'} ${s.text}`] as [string, string])];
    } else if (tab === 'crash') {
      rows = [['Tab', 'Spooler se cae (7031)'], ...CRASH_STEPS.map((s) => [s.id.toUpperCase(), `${done[s.id] ? '[x]' : '[ ]'} ${s.text}`] as [string, string])];
    } else if (tab === 'network') {
      rows = [['Tab', 'Impresora en red'], ...NET_STEPS.map((s) => [s.id.toUpperCase(), `${done[s.id] ? '[x]' : '[ ]'} ${s.text}`] as [string, string])];
    } else {
      rows = [
        ['Tab', 'Calidad/papel/códigos'],
        ['Síntomas físicos', PHYSICAL_SYMPTOMS.map((p) => `${p.symptom} → ${p.action}`).join(' | ')],
      ];
    }
    useNoteStore.getState().enqueueNote(
      `Printer & Spooler Fix — ${tabDef?.label ?? tab}`,
      buildNoteHtmlTable(rows.map(([k, v]) => [escapeHtml(k), escapeHtml(v)])),
    );
    showToast();
  };

  return (
    <div className="space-y-3">
      <InfoBanner>
        <span className="inline-flex items-start gap-1.5">
          <Printer className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Guía L1 de impresión Windows. Todo lo de <span className="font-semibold">servidor de impresión</span>{' '}
            (colas compartidas, drivers del servidor, spooler del servidor) es
            L2/Infraestructura: L1 actúa solo en el equipo del usuario.
          </span>
        </span>
      </InfoBanner>

      <Tabs tabs={TAB_DEFS} active={tab} onChange={setTab} />

      {/* ---------- Tab: Cola atascada ---------- */}
      {tab === 'queue' && (
        <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel>Cola atascada — checklist L1</SectionLabel>
            <span className="text-[10px] text-[#666]">{countDone(QUEUE_STEPS)}/{QUEUE_STEPS.length} hechos</span>
          </div>
          <CheckList items={QUEUE_STEPS} checked={done} onToggle={toggle} />
          <ErrorBanner message="Ejecuta la limpieza de spool en el EQUIPO DEL USUARIO, nunca en el servidor de impresión: vaciar el spool del servidor tira la cola de TODOS los usuarios → eso es L2." />
          <div className="space-y-1.5">
            <SectionLabel>Comandos — CMD (equipo del usuario)</SectionLabel>
            <CodeBlock
              label="Parar spooler, vaciar carpeta, arrancar (CMD elevado)"
              code={'net stop spooler\ndel /Q %systemroot%\\System32\\spool\\PRINTERS\\*.*\nnet start spooler'}
              lang="cmd"
            />
            <SectionLabel>Equivalente — PowerShell (elevado)</SectionLabel>
            <CodeBlock
              label="Stop-Service / Remove-Item / Start-Service"
              code={'Stop-Service Spooler\nRemove-Item -Path "$env:windir\\System32\\spool\\PRINTERS\\*.*" -Force\nStart-Service Spooler'}
              lang="ps"
            />
          </div>
        </div>
      )}

      {/* ---------- Tab: Spooler se cae ---------- */}
      {tab === 'crash' && (
        <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel>Spooler se cae — Event ID 7031</SectionLabel>
            <span className="text-[10px] text-[#666]">{countDone(CRASH_STEPS)}/{CRASH_STEPS.length} hechos</span>
          </div>
          <InfoBanner>
            7031 lo firma el <span className="font-semibold">Service Control Manager</span> (registro
            System): «The Print Spooler service terminated unexpectedly». El
            detalle del evento dice qué lo tumbó — captúralo para el ticket.
          </InfoBanner>
          <CheckList items={CRASH_STEPS} checked={done} onToggle={toggle} />
          <div className="px-3 py-2.5 rounded border border-red-500/50 bg-red-500/10 space-y-1.5">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
                SEGURIDAD — PrintNightmare (CVE-2021-34527)
              </div>
            </div>
            <p className="text-[11px] text-red-300 leading-relaxed">
              El spooler cayéndose <span className="font-semibold">repetidamente en un SERVIDOR</span>{' '}
              (no en un PC cliente) es señal de posible explotación activa.
              Escala INMEDIATAMENTE a Seguridad y <span className="font-semibold">NO reinicies el
              servicio sin avisar</span>: cada reinicio destruye evidencia y vuelve a
              exponer el vector de carga remota de drivers.
            </p>
          </div>
          <div className="space-y-1.5">
            <SectionLabel>Consultas de diagnóstico</SectionLabel>
            <CodeBlock
              label="Últimos 7031 del System (PowerShell)"
              code={"Get-WinEvent -FilterHashtable @{LogName='System'; Id=7031} -MaxEvents 10"}
              lang="ps"
            />
            <CodeBlock
              label="Estado del spooler y dependencias RPC"
              code="Get-Service Spooler, RpcSs, RpcEptMapper"
              lang="ps"
            />
          </div>
        </div>
      )}

      {/* ---------- Tab: Impresora en red ---------- */}
      {tab === 'network' && (
        <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel>Impresora en red — checklist L1</SectionLabel>
            <span className="text-[10px] text-[#666]">{countDone(NET_STEPS)}/{NET_STEPS.length} hechos</span>
          </div>
          <CheckList items={NET_STEPS} checked={done} onToggle={toggle} />
          <div className="bg-[#161616] border border-[#262626] rounded p-2.5 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
              RAW 9100 vs LPR 515
            </div>
            <p className="text-[11px] text-[#AAA] leading-relaxed">
              <span className="text-blue-300 font-semibold">RAW (puerto 9100/TCP):</span>{' '}
              conexión directa al dispositivo, bidireccional, el estándar en
              impresoras de red modernas (JetDirect).{' '}
              <span className="text-blue-300 font-semibold">LPR (515/TCP):</span>{' '}
              protocolo LPD clásico con gestión de cola en el host, típico de
              servidores legacy/Unix. El puerto se define en el dispositivo o en
              el servidor de impresión: no se cambia desde el PC del usuario.
            </p>
          </div>
          <div className="space-y-1.5">
            <SectionLabel>Comandos de referencia</SectionLabel>
            <CodeBlock
              label="Conectividad al servidor y puerto RAW 9100"
              code={'Test-NetConnection printserver01 -Port 9100'}
              lang="ps"
            />
            <CodeBlock
              label="Remapear impresora compartida"
              code={"Add-Printer -ConnectionName '\\\\printserver01\\Imp-Planta2'"}
              lang="ps"
            />
            <CodeBlock
              label="Colas locales, drivers y puertos"
              code="Get-Printer | Format-Table Name, DriverName, PortName"
              lang="ps"
            />
          </div>
        </div>
      )}

      {/* ---------- Tab: Calidad/papel ---------- */}
      {tab === 'quality' && (
        <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2.5">
          <SectionLabel>Calidad de impresión / papel / códigos — síntomas físicos</SectionLabel>
          <div className="overflow-x-auto border border-[#262626] rounded">
            <table className="w-full text-[11px] border-collapse">
              <thead className="bg-[#161616]">
                <tr>
                  {['Síntoma físico', 'Causa probable', 'Acción L1'].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-2 py-1.5 text-left text-[10px] uppercase tracking-wider text-[#888] font-bold border-b border-[#262626]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PHYSICAL_SYMPTOMS.map((p) => (
                  <tr key={p.symptom} className="border-b border-[#1A1A1A] hover:bg-[#161616] transition-colors">
                    <td className="px-2 py-1.5 text-white">{p.symptom}</td>
                    <td className="px-2 py-1.5 text-[#AAA]">{p.cause}</td>
                    <td className="px-2 py-1.5 text-[#888]">{p.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <InfoBanner>
            Sustitución de consumibles (tóner, rodillos, kits): la decide el
            usuario/equipo dueño del dispositivo según la política de la empresa.
            L1 documenta el síntoma y el código de error exacto en el ticket.
          </InfoBanner>
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addToNote} className={`${btnPrimary} inline-flex items-center gap-1.5`}>
          <BookOpen className="w-3.5 h-3.5" />
          Añadir checklist a Notas
        </button>
        <button
          type="button"
          onClick={() => setDone({})}
          className={`${btnGhost} inline-flex items-center gap-1.5`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reiniciar checklists
        </button>
      </div>

      {addedToast && <InfoBanner>Añadido a Notas — crea una nota nueva para verlo.</InfoBanner>}
    </div>
  );
};

export default HdPrinterTool;
