/**
 * HdBsodTool.tsx — BSOD & Stop Code Explorer (HelpDesk FASE 2, grupo B).
 *
 * Catálogo local de 24 STOP codes frecuentes (interface {code, hex, name,
 * meaning, causes[], l1Steps[], escalateWhen}) con buscador que filtra por
 * hex/nombre/causa y vista master-detail: lista izquierda → panel derecho con
 * significado, causas, pasos L1 y criterio de escalamiento.
 *
 * Siempre visible: pasos L1 universales (qué preguntar, Safe Mode, desinstalar
 * update/driver, sfc, DISM, chkdsk — con CodeBlock+CopyBtn; minidumps con
 * WinDbg ya es L2) y la sección "Qué recopilar para el ticket".
 *
 * [Añadir a Notas] exporta el artículo del STOP code + datos del ticket a
 * buildNoteHtmlTable con todos los valores escapados.
 *
 * 100% offline. Sin fetch/XHR/WebSocket/eval. Spec reference: Task ID 2-b.
 */
'use client';

import React, { useMemo, useState } from 'react';
import {
  Search, Bug, AlertTriangle, ClipboardList, FileText, MonitorOff, CircleDot,
} from 'lucide-react';
import {
  inputCls, taCls, btnPrimary, CodeBlock, InfoBanner, Field,
  buildNoteHtmlTable, useAddToNoteToast,
} from '../_shared';
import { escapeHtml } from '../../../utils/escapeHtml';
import { useNoteStore } from '../../../store/noteStore';

/* ---------- tipos ---------- */

interface BsodEntry {
  /** Forma canónica de 8 dígitos, ej. '0x0000007B'. */
  code: string;
  /** Forma corta visible en pantalla, ej. '0x7B'. */
  hex: string;
  name: string;
  meaning: string;
  causes: string[];
  l1Steps: string[];
  escalateWhen: string;
}

/* ---------- catálogo local (24 STOP codes frecuentes) ---------- */

const BSOD_CODES: BsodEntry[] = [
  { code: '0x0000007B', hex: '0x7B', name: 'INACCESSIBLE_BOOT_DEVICE', meaning: 'El proceso de arranque no pudo acceder al disco del sistema para montarlo.', causes: ['Cambio de modo SATA/RAID/AHCI en BIOS', 'Controlador de storage cambiado o movido a otro controlador', 'Boot sector o BCD dañados', 'Disco que no aparece en BIOS'], l1Steps: ['Preguntar qué cambió: ¿se tocó la BIOS, se movió el disco o hubo update?', 'Desconectar USB/discos externos y revisar el orden de arranque en BIOS', 'WinRE → Solucionar problemas → Restaurar sistema a punto previo', 'WinRE → Símbolo del sistema: verificar unidad y reparar BCD'], escalateWhen: 'Disco no visible en BIOS o error persiste tras reparar BCD → L2/hardware.' },
  { code: '0x0000007E', hex: '0x7E', name: 'SYSTEM_THREAD_EXCEPTION_NOT_HANDLED', meaning: 'Un hilo de kernel lanzó una excepción que nadie capturó; el nombre del driver suele ir en el paréntesis.', causes: ['Driver de gráficos o red defectuoso', 'RAM defectuosa', 'Antivirus incompatible con la versión de Windows'], l1Steps: ['Anotar el driver que aparece entre paréntesis del pantallazo', 'Safe Mode y desinstalar/retroceder ese driver', 'Ejecutar sfc y DISM', 'Desinstalar el antivirus y probar el arranque'], escalateWhen: 'Repite tras retroceder el driver → L2 con el nombre del driver.' },
  { code: '0x000000D1', hex: '0xD1', name: 'DRIVER_IRQL_NOT_LESS_OR_EQUAL', meaning: 'Un driver accedió a memoria en un IRQL equivocado (típicamente tocando paginada desde contexto elevado).', causes: ['Driver de red/Wi-Fi', 'Filter drivers de antivirus', 'Driver de gráficos'], l1Steps: ['Anotar el driver del pantallazo', 'Safe Mode con red → actualizar o retroceder ese driver', 'Si es el de Wi-Fi: probar con Ethernet mientras'], escalateWhen: 'Persiste con driver actualizado → L2 (posible RAM).' },
  { code: '0x00000050', hex: '0x50', name: 'PAGE_FAULT_IN_NONPAGED_AREA', meaning: 'Referencia inválida a memoria del sistema que nunca debería fallar (nonpaged pool).', causes: ['RAM defectuosa (muy típico)', 'Driver bug', 'Antivirus y software de indexación'], l1Steps: ['Preguntar qué cambió: ¿se añadió RAM o hardware?', 'Windows Memory Diagnostic (mdsched) al reiniciar', 'Safe Mode para descartar drivers de terceros', 'Quitar módulos de RAM recién añadidos si aplica'], escalateWhen: 'Fallos de memoria confirmados → L2/RMA de RAM.' },
  { code: '0x0000001E', hex: '0x1E', name: 'KMODE_EXCEPTION_NOT_HANDLED', meaning: 'Excepción no controlada en modo kernel; genérica pero con driver culpable identificable.', causes: ['Driver defectuoso', 'Disco de sistema con corrupción', 'Antivirus'], l1Steps: ['Anotar driver/parámetros del pantallazo', 'Safe Mode → desinstalar lo último instalado', 'sfc /scannow y DISM RestoreHealth', 'chkdsk /f'], escalateWhen: 'Sin driver claro y repetido → L2 con minidumps.' },
  { code: '0x00000124', hex: '0x124', name: 'WHEA_UNCORRECTABLE_ERROR', meaning: 'El propio hardware (WHEA) reportó un error de máquina no corregible: CPU, caché o bus.', causes: ['CPU o RAM defectuosos', 'Refrigeración insuficiente / sobrecalentamiento', 'Overclock inestable', 'BIOS antiguo'], l1Steps: ['Comprobar temperaturas y ventiladores', 'Actualizar BIOS si hay versión más reciente aprobada', 'Desactivar overclock/XMP y probar'], escalateWhen: 'Casi siempre hardware: L2/diagnóstico del fabricante o RMA.' },
  { code: '0x00000139', hex: '0x139', name: 'KERNEL_SECURITY_CHECK_FAILURE', meaning: 'Windows detectó corrupción en estructuras críticas o argumentos inválidos de seguridad de kernel.', causes: ['RAM defectuosa', 'Driver con bug', 'Corrupción de archivos de sistema', 'Malware de kernel'], l1Steps: ['sfc /scannow + DISM RestoreHealth', 'Windows Memory Diagnostic', 'Revisar qué se instaló hace poco (drivers/AV)', 'Analizar con Defender offline'], escalateWhen: 'Persiste con sfc/DISM limpio → L2 (sospechar hardware).' },
  { code: '0x00000133', hex: '0x133', name: 'DPC_WATCHDOG_VIOLATION', meaning: 'Una DPC (rutina diferida de kernel) excedió su presupuesto de tiempo y bloqueó el sistema.', causes: ['Driver de storage (SSD/NVMe con firmware antiguo)', 'Driver de gráficos', 'Incompatibilidad SSD+controladora'], l1Steps: ['Actualizar firmware del SSD si el fabricante lo publica', 'Actualizar driver del chipset/storage', 'Safe Mode para aislar'], escalateWhen: 'Persiste con firmware+drivers al día → L2.' },
  { code: '0x000000EF', hex: '0xEF', name: 'CRITICAL_PROCESS_DIED', meaning: 'Un proceso imprescindible de Windows (wininit, csrss, services…) terminó inesperadamente.', causes: ['Corrupción de archivos de sistema', 'Update de Windows a medias', 'Sectores dañados en disco', 'Malware'], l1Steps: ['WinRE → Desinstalar actualizaciones (quality update reciente)', 'sfc /scannow + DISM RestoreHealth', 'chkdsk /f', 'In-place repair si no arranca'], escalateWhen: 'No arranca ni en Safe Mode → L2 (in-place repair/reimaging).' },
  { code: '0x000000C2', hex: '0xC2', name: 'BAD_POOL_CALLER', meaning: 'Un componente hizo una llamada inválida al pool de memoria del kernel (típicamente un driver).', causes: ['Driver de impresora o USB', 'RAM defectuosa', 'Software de backup/filter driver'], l1Steps: ['Preguntar qué periférico/software nuevo hay', 'Safe Mode → desinstalar ese driver/software', 'Windows Memory Diagnostic'], escalateWhen: 'Sin driver culpable y recurrente → L2.' },
  { code: '0x0000009F', hex: '0x9F', name: 'DRIVER_POWER_STATE_FAILURE', meaning: 'Un driver no completó a tiempo la transición de energía (suspensión/hibernación/resume).', causes: ['Driver de red o gráficos en sleep/resume', 'Fast Startup', 'Dock USB o docking station'], l1Steps: ['Desactivar Fast Startup (Opciones de energía)', 'Actualizar driver de red y gráficos', 'Probar sin dock/USB al suspender', 'Actualizar BIOS si aplica'], escalateWhen: 'Persiste con drivers al día → L2 (puede ser placa/dock).' },
  { code: '0x0000000A', hex: '0xA', name: 'IRQL_NOT_LESS_OR_EQUAL', meaning: 'Acceso a memoria inválido en un IRQL demasiado alto — el clásico "driver o RAM".', causes: ['Driver defectuoso', 'RAM defectuosa', 'Software kernel antiguo'], l1Steps: ['Anotar driver del pantallazo', 'Safe Mode → retroceder driver', 'mdsched (diagnóstico de memoria)'], escalateWhen: 'Repetido sin driver claro → L2 con minidumps.' },
  { code: '0x00000116', hex: '0x116', name: 'VIDEO_TDR_FAILURE', meaning: 'El driver de la GPU dejó de responder y el mecanismo TDR lo intentó resetear sin éxito.', causes: ['Driver de gráficos', 'GPU sobrecalentada', 'Overclock de GPU', 'Fuente de alimentación insuficiente'], l1Steps: ['Retroceder/reinstalar driver de gráficos (DDU en L2 si hace falta)', 'Comprobar temperatura y ventiladores de la GPU', 'Desactivar overclock', 'Probar resolución/refresh por defecto'], escalateWhen: 'Artefactos visuales o temperatura alta → hardware, L2/RMA.' },
  { code: '0x0000001A', hex: '0x1A', name: 'MEMORY_MANAGEMENT', meaning: 'El gestor de memoria de Windows encontró una inconsistencia interna grave.', causes: ['RAM defectuosa (clásico)', 'Driver', 'Pagefile en disco con sectores dañados'], l1Steps: ['Windows Memory Diagnostic (mdsched)', 'chkdsk /f', 'Rearranque tras limpiar contactos de RAM si se tocó hardware'], escalateWhen: 'mdsched con errores → L2/RMA de RAM.' },
  { code: '0x000000F4', hex: '0xF4', name: 'CRITICAL_OBJECT_TERMINATION', meaning: 'Un proceso o hilo crítico terminó de forma anormal (a menudo el disco "desapareció" a mitad de escritura).', causes: ['Cable SATA/SSD con contacto deficiente', 'Disco que se desconecta (firmware)', 'RAM'], l1Steps: ['Revisar cableado del disco (si es PC de sobremesa)', 'chkdsk /f y estado SMART del disco', 'Windows Memory Diagnostic'], escalateWhen: 'SMART con sectores pendientes/reallocados → L2/RMA de disco.' },
  { code: '0x0000003B', hex: '0x3B', name: 'SYSTEM_SERVICE_EXCEPTION', meaning: 'Excepción al ejecutar una rutina de servicio de sistema, generalmente originada por un driver.', causes: ['Driver de gráficos', 'Antivirus', 'RAM'], l1Steps: ['Anotar driver del pantallazo', 'Safe Mode → actualizar/retroceder driver', 'sfc /scannow'], escalateWhen: 'Recurrente → L2 con minidumps.' },
  { code: '0x0000005C', hex: '0x5C', name: 'HAL_INITIALIZATION_FAILED', meaning: 'La capa de abstracción de hardware (HAL) no pudo inicializarse durante el arranque.', causes: ['BIOS/firmware incompatible o corrupto', 'Arranque desde medio no soportado', 'Cambio de placa/hardware mayor'], l1Steps: ['Verificar orden de arranque y quitar medios externos', 'Cargar valores por defecto de BIOS', 'WinRE → restaurar sistema'], escalateWhen: 'Tras cambios de placa → L2/Endpoint (BSOD esperable hasta reconfigurar).' },
  { code: '0x0000021A', hex: '0x21A', name: 'WIN32K_CRITICAL_FAILURE', meaning: 'win32k.sys (subsistema gráfico de kernel) detectó corrupción crítica en sus estructuras.', causes: ['Driver de gráficos/pantalla', 'RAM', 'Incompatibilidad tras update'], l1Steps: ['Retroceder driver de gráficos', 'sfc /scannow + DISM', 'Windows Memory Diagnostic'], escalateWhen: 'Persiste → L2 con minidumps.' },
  { code: '0x00000109', hex: '0x109', name: 'CRITICAL_STRUCTURE_CORRUPTION', meaning: 'PatchGuard detectó que un driver modificó código o datos críticos de kernel.', causes: ['Driver antiguo incompatible con PatchGuard', 'Software de virtualización/AV agresivo', 'Malware de kernel'], l1Steps: ['Identificar software de bajo nivel recién instalado (AV, VPN, virtualización)', 'Desinstalarlo y probar', 'Análisis con Defender offline'], escalateWhen: 'Sospecha de malware kernel → Seguridad/L2 con artefactos.' },
  { code: '0x00000018', hex: '0x18', name: 'REFERENCE_BY_POINTER', meaning: 'El conteo de referencias de un objeto de kernel quedó corrupto (referencia colgante).', causes: ['Driver bug', 'RAM defectuosa'], l1Steps: ['Anotar driver del pantallazo', 'Safe Mode → desinstalar driver reciente', 'mdsched'], escalateWhen: 'Recurrente → L2 con minidumps.' },
  { code: '0x000000C4', hex: '0xC4', name: 'DRIVER_VERIFIER_DETECTED_VIOLATION', meaning: 'Driver Verifier (activo en el equipo) detectó un driver infringiendo reglas de kernel.', causes: ['Driver Verifier habilitado (a menudo por una herramienta de análisis)', 'Driver con bug señalado por el verificador'], l1Steps: ['Leer el pantallazo: nombra el driver infractor', 'Desactivar Driver Verifier (verifier /reset) SOLO si lo activó soporte', 'Actualizar/desinstalar el driver señalado'], escalateWhen: 'Si no sabéis quién activó Verifier → L2 (podría ser análisis de malware).' },
  { code: '0x00000019', hex: '0x19', name: 'BAD_POOL_HEADER', meaning: 'Corrupción detectada en la cabecera de un bloque del pool de memoria de kernel.', causes: ['Driver defectuoso', 'RAM', 'Disco con corrupción'], l1Steps: ['Safe Mode → desinstalar lo último', 'mdsched + chkdsk /f', 'sfc /scannow'], escalateWhen: 'Recurrente sin driver claro → L2 con minidumps.' },
  { code: '0x00000077', hex: '0x77', name: 'KERNEL_STACK_INPAGE_ERROR', meaning: 'No se pudo leer del disco una página del stack de kernel (I/O de paginación fallida).', causes: ['Sectores dañados en el disco', 'Cable SATA/conexión deficiente', 'RAM que corrompe el pagefile'], l1Steps: ['chkdsk C: /f', 'Estado SMART del disco', 'Revisar cableado'], escalateWhen: 'SMART degradado → L2/RMA de disco cuanto antes.' },
  { code: '0x00000154', hex: '0x154', name: 'UNEXPECTED_STORE_EXCEPTION', meaning: 'El componente de gestión de memoria comprimida (store) falló de forma inesperada.', causes: ['SSD con firmware antiguo', 'SSD al límite de vida/lleno', 'RAM defectuosa'], l1Steps: ['Liberar espacio en C: si está casi lleno', 'Actualizar firmware del SSD', 'mdsched para descartar RAM'], escalateWhen: 'Health del SSD bajo → L2/RMA de disco.' },
];

/** Pasos L1 universales (aplican a cualquier STOP code). */
const UNIVERSAL_STEPS: string[] = [
  '¿Qué cambió hace poco? Update de Windows/driver, hardware nuevo, software, limpieza física. Pregunta SIEMPRE.',
  'Safe Mode (msconfig o F5/5 en arranque): si es estable ahí → driver/software; si BSOD también → hardware/sistema.',
  'Desinstalar el update o driver reciente: WinRE → Desinstalar actualizaciones, o Panel de control → Programas.',
  'sfc /scannow y DISM /Online /Cleanup-Image /RestoreHealth (ver comandos).',
  'chkdsk C: /f para descartar disco (ver comando).',
  'Minidumps de C:\\Windows\\Minidump analizados con WinDbg → eso ya es L2: se adjuntan al escalamiento, no se analizan en L1.',
];

/* ---------- subcomponentes ---------- */

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">{children}</div>
);

/* ---------- componente principal ---------- */

export const HdBsodTool: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(BSOD_CODES[0].hex);
  const [freq, setFreq] = useState('');
  const [apps, setApps] = useState('');
  const [changes, setChanges] = useState('');
  const { addedToast, showToast } = useAddToNoteToast();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BSOD_CODES;
    return BSOD_CODES.filter(
      (b) =>
        b.code.toLowerCase().includes(q) ||
        b.hex.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        b.causes.some((c) => c.toLowerCase().includes(q)),
    );
  }, [query]);

  const selected = filtered.find((b) => b.hex === selectedId) ?? filtered[0] ?? BSOD_CODES[0];

  /** Exporta el artículo del STOP code + datos recopilados a Notas. */
  const addToNote = (): void => {
    const rows: Array<[string, string]> = [
      ['STOP code', `${selected.code} (${selected.hex}) ${selected.name}`],
      ['Significado', selected.meaning],
      ['Causas', selected.causes.join(' | ')],
      ['Pasos L1', [...UNIVERSAL_STEPS, ...selected.l1Steps].map((s, i) => `${i + 1}. ${s}`).join(' | ')],
      ['Escalar cuando', selected.escalateWhen],
      ['Frecuencia (ticket)', freq],
      ['Apps abiertas (ticket)', apps],
      ['Últimos cambios (ticket)', changes],
    ];
    useNoteStore.getState().enqueueNote(
      `BSOD ${selected.hex} — ${selected.name}`,
      buildNoteHtmlTable(rows.map(([k, v]) => [escapeHtml(k), escapeHtml(v)])),
    );
    showToast();
  };

  return (
    <div className="space-y-3">
      <InfoBanner>
        Explorador de STOP codes (BSOD) para triaje L1. Catálogo local de{' '}
        {BSOD_CODES.length} códigos frecuentes. 100% offline — sin consultar
        Microsoft Learn ni enviar datos.
      </InfoBanner>

      {/* Buscador */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-[#555] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtra por hex (0x7B), nombre (VIDEO_TDR…) o causa (RAM, driver…)"
          aria-label="Buscar STOP code por hex, nombre o causa"
          className={`${inputCls} pl-8`}
        />
      </div>

      {/* Master-detail */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,300px)_1fr] gap-3">
        {/* Lista */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded p-1.5 space-y-1 max-h-[420px] overflow-y-auto">
          {filtered.map((b) => {
            const active = b.hex === selected?.hex;
            return (
              <button
                key={b.hex}
                type="button"
                onClick={() => setSelectedId(b.hex)}
                aria-pressed={active}
                title={`Ver ${b.name}`}
                className={`w-full text-left p-2 rounded border transition-colors cursor-pointer ${
                  active
                    ? 'bg-blue-500/10 border-blue-500/50'
                    : 'bg-[#161616] border-[#262626] hover:border-[#444]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <code className={`text-[11px] font-mono font-bold ${active ? 'text-blue-300' : 'text-white'}`}>{b.hex}</code>
                  <span className="text-[9px] text-[#666] font-mono">{b.code}</span>
                </div>
                <div className="text-[10px] text-[#AAA] truncate">{b.name}</div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-[11px] text-[#666] p-2">Sin resultados para «{query}».</div>
          )}
        </div>

        {/* Detalle */}
        {selected && (
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2.5">
            <div className="flex items-start gap-2 pb-2 border-b border-[#1A1A1A]">
              <MonitorOff className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white break-all">{selected.name}</div>
                <code className="text-[10px] text-[#888] font-mono">{selected.code} · {selected.hex}</code>
              </div>
            </div>

            <section className="space-y-1">
              <SectionLabel>Qué significa</SectionLabel>
              <p className="text-[11px] text-[#AAA] leading-relaxed">{selected.meaning}</p>
            </section>

            <section className="space-y-1">
              <SectionLabel>Causas frecuentes</SectionLabel>
              {selected.causes.map((c, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <CircleDot className="w-3 h-3 text-[#555] shrink-0 mt-1" />
                  <span className="text-[11px] text-[#DDD] leading-relaxed">{c}</span>
                </div>
              ))}
            </section>

            <section className="space-y-1">
              <SectionLabel>Pasos L1 específicos</SectionLabel>
              <ol className="space-y-1">
                {selected.l1Steps.map((s, i) => (
                  <li key={i} className="text-[11px] text-[#DDD] leading-relaxed flex items-start gap-2">
                    <span className="text-[10px] font-bold text-blue-400 font-mono shrink-0 mt-0.5">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </section>

            <div className="flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-[11px] text-[#DDD] leading-relaxed">
                <span className="font-semibold text-amber-400">Escalar:</span> {selected.escalateWhen}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pasos L1 universales + comandos */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2.5">
        <SectionLabel>Pasos L1 universales — cualquier STOP code</SectionLabel>
        <ol className="space-y-1">
          {UNIVERSAL_STEPS.map((s, i) => (
            <li key={i} className="text-[11px] text-[#DDD] leading-relaxed flex items-start gap-2">
              <span className="text-[10px] font-bold text-blue-400 font-mono shrink-0 mt-0.5">{i + 1}.</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <CodeBlock label="Integridad de sistema (CMD elevado)" code="sfc /scannow" lang="cmd" />
          <CodeBlock label="Reparar imagen de Windows" code="DISM /Online /Cleanup-Image /RestoreHealth" lang="cmd" />
          <CodeBlock label="Comprobar disco (al reiniciar)" code="chkdsk C: /f" lang="cmd" />
        </div>
        <div className="flex items-start gap-1.5">
          <Bug className="w-3.5 h-3.5 text-[#555] shrink-0 mt-0.5" />
          <span className="text-[10px] text-[#666] leading-relaxed">
            BSOD repetido tras clean boot y desinstalar updates → sospechar
            hardware (RAM/disco): L2 ejecuta diagnóstico del fabricante o RMA.
            Los minidumps de C:\Windows\Minidump se adjuntan al escalar.
          </span>
        </div>
      </div>

      {/* Qué recopilar para el ticket */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2.5">
        <div className="flex items-center gap-1.5">
          <ClipboardList className="w-3.5 h-3.5 text-blue-400" />
          <SectionLabel>Qué recopilar para el ticket</SectionLabel>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Field label="STOP code exacto" hint="Foto del pantallazo: código + parámetros">
            <input
              type="text"
              value={`${selected ? selected.hex : ''} ${selected ? selected.name : ''}`}
              readOnly
              aria-label="STOP code seleccionado (auto)"
              className={inputCls}
            />
          </Field>
          <Field label="Frecuencia" hint="Ej: 3 veces hoy, siempre al abrir Outlook">
            <input
              type="text"
              value={freq}
              onChange={(e) => setFreq(e.target.value)}
              placeholder="Cuántas veces, cuándo, con qué patrón…"
              aria-label="Frecuencia del BSOD"
              className={inputCls}
            />
          </Field>
          <Field label="Apps abiertas">
            <textarea
              value={apps}
              onChange={(e) => setApps(e.target.value)}
              placeholder="Qué estaba usando el usuario cuando ocurrió…"
              aria-label="Apps abiertas cuando ocurrió el BSOD"
              className={taCls}
            />
          </Field>
          <Field label="Últimos cambios" hint="Updates, hardware, software, limpieza física…">
            <textarea
              value={changes}
              onChange={(e) => setChanges(e.target.value)}
              placeholder="¿Qué cambió hace poco en el equipo?"
              aria-label="Últimos cambios en el equipo"
              className={taCls}
            />
          </Field>
        </div>
        <button type="button" onClick={addToNote} className={`${btnPrimary} inline-flex items-center gap-1.5`}>
          <FileText className="w-3.5 h-3.5" />
          Exportar artículo + datos a Notas
        </button>
      </div>

      {addedToast && <InfoBanner>Añadido a Notas — crea una nota nueva para verlo.</InfoBanner>}
    </div>
  );
};

export default HdBsodTool;
