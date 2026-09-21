/**
 * HdBitLockerTool.tsx — BitLocker Recovery Helper (HelpDesk FASE 2, grupo B).
 *
 * Guía educativa de L1 para la pantalla de recuperación de BitLocker: 5
 * escenarios seleccionables (arranque, cambio BIOS/hardware, PIN olvidado,
 * sospecha de manipulación, verificación de dispositivo nuevo) con por qué
 * técnico ocurre cada uno, qué pedir al usuario, dónde buscar la clave de
 * recuperación (checklist interactivo), verificación de identidad ANTES de
 * entregar la clave (anti-phishing) y criterios de escalamiento.
 *
 * Distingue siempre entre el ID de clave de recuperación (8 dígitos hex, se
 * puede pedir por chat) y la clave de 48 dígitos (nunca por chat/email).
 *
 * [Añadir a Notas] → useNoteStore.enqueueNote con buildNoteHtmlTable y todos
 * los valores pasados por escapeHtml().
 *
 * 100% offline: NO consulta Intune/Entra/AD ni claves reales. Sin
 * fetch/XHR/WebSocket/eval. Spec reference: Task ID 2-b.
 */
'use client';

import React, { useState } from 'react';
import {
  Lock, KeyRound, HardDrive, ShieldAlert, Usb, FileText, Server, User,
  Monitor, Cpu, AlertTriangle, BookOpen, RotateCcw, CheckSquare, Square,
  HelpCircle, ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  btnPrimary, btnGhost, CodeBlock, InfoBanner, ErrorBanner, CopyBtn,
  buildNoteHtmlTable, useAddToNoteToast,
} from '../_shared';
import { escapeHtml } from '../../../utils/escapeHtml';
import { useNoteStore } from '../../../store/noteStore';

/* ---------- tipos ---------- */

interface ScenarioCmd {
  label: string;
  code: string;
}

interface Scenario {
  id: string;
  title: string;
  icon: LucideIcon;
  /** Qué significa y por qué pasa (2-4 frases técnicas reales). */
  meaning: string[];
  /** Datos que pedir al usuario. */
  askUser: string[];
  /** Pasos de verificación antes de dar la clave. */
  beforeKey: string[];
  /** Cuándo escalar. */
  escalate: string[];
  /** Comandos/consultas de referencia. */
  commands: ScenarioCmd[];
}

interface KeySource {
  id: string;
  icon: LucideIcon;
  title: string;
  detail: string;
}

/* ---------- datos (curados, locales, offline) ---------- */

const SCENARIOS: Scenario[] = [
  {
    id: 'boot',
    title: 'Pide clave de recuperación al arrancar',
    icon: Monitor,
    meaning: [
      'BitLocker guarda la clave maestra del disco sellada dentro del TPM. Al arrancar, el TPM mide la configuración de arranque (PCRs 0-7) y solo libera la clave si coincide con la última configuración sellada.',
      'Si algo cambió en el arranque —USB booteable conectado, orden de arranque modificado, actualización de firmware/BIOS, o un reinicio pendiente tras un update de Windows— el TPM se niega a liberar la clave y Windows muestra la pantalla de BitLocker pidiendo la clave de 48 dígitos.',
      'Los datos NO se pierden: la clave de recuperación descifra el disco esa vez y el TPM se vuelve a sellar con la nueva configuración.',
    ],
    askUser: [
      'El ID de clave de recuperación de 8 dígitos que aparece en pantalla (arriba, "Identificador de clave de recuperación").',
      'Hostname del equipo y usuario afectado.',
      '¿Tenía conectado algún USB o disco externo al arrancar? ¿Se actualizó BIOS/UEFI o Windows hace poco?',
    ],
    beforeKey: [
      'Llamar al solicitante al número del directorio corporativo — nunca al número que él dé por chat/email.',
      'Contrastar el ID de 8 dígitos de la pantalla con el ID que aparece junto a la clave en el portal: debe coincidir.',
      'Confirmar el hostname contra el inventario/Intune antes de entregar la clave de ese equipo.',
      'Registrar en el ticket: quién la pidió, cómo se verificó y para qué equipo (la clave completa nunca va al ticket).',
    ],
    escalate: [
      'Más de 3 intentos fallidos con claves correctas: posible corrupción del estado de TPM o del arranque → L2/Endpoint.',
      'El equipo no aparece en Intune/AD y el solicitante no justifica su posesión → Seguridad.',
    ],
    commands: [
      { label: 'Estado de protección (CMD, elevado)', code: 'manage-bde -status' },
      { label: 'Protectores de la unidad (CMD, elevado)', code: 'manage-bde -protectors -get C:' },
      { label: 'PowerShell', code: 'Get-BitLockerVolume -MountPoint C:' },
    ],
  },
  {
    id: 'hardware',
    title: 'Tras cambiar algo en BIOS/UEFI o hardware',
    icon: Cpu,
    meaning: [
      'El TPM mide cada etapa del arranque: firmware, Secure Boot, gestor de arranque y kernel. Cualquier cambio en BIOS/UEFI (Secure Boot on/off, orden de arranque, TPM cleared, actualización de firmware) o hardware relevante rompe las mediciones esperadas.',
      'Un reset del TPM o un cambio de placa base es lo más frecuente tras reparaciones de hardware.',
      'Mover el SSD a otro equipo SIEMPE pide clave: un TPM distinto no puede desellar la clave del disco.',
    ],
    askUser: [
      'Qué se cambió exactamente (componente, ajuste de BIOS, reset de TPM).',
      'Quién hizo el cambio: técnico interno, reparación externa o el propio usuario.',
      'Número de ticket de la reparación, si existe, para correlacionar.',
    ],
    beforeKey: [
      'Verificar identidad del solicitante por canal secundario (teléfono del directorio).',
      'Si el cambio lo hizo un técnico, confirmar el ticket de reparación antes de dar la clave.',
      'Alinear el ID de 8 dígitos de la pantalla con la clave del portal.',
    ],
    escalate: [
      'Cambio de hardware no documentado ni trazable → verificar con el equipo de reparaciones antes de dar la clave.',
      'Sospecha de sustitución de componentes no autorizada → Seguridad.',
    ],
    commands: [
      { label: 'Estado del TPM (PowerShell, admin)', code: 'Get-Tpm' },
      { label: 'Estado de BitLocker (CMD, elevado)', code: 'manage-bde -status' },
    ],
  },
  {
    id: 'pin',
    title: 'Usuario olvidó el PIN',
    icon: KeyRound,
    meaning: [
      'Con BitLocker + PIN (pre-boot PIN), el PIN se teclea ANTES de que arranque Windows, en pantalla del firmware. Es distinto de la contraseña de inicio de sesión y NO se restablece como una contraseña de AD.',
      'La clave de recuperación de 48 dígitos permite arrancar una vez; después se cambia el PIN desde Windows (Cifrado de unidad BitLocker → Cambiar PIN).',
      'No confundir con Windows Hello: pregunta si el PIN se pide en una pantalla previa al logo de Windows (BitLocker) o en la pantalla de login normal (Hello).',
    ],
    askUser: [
      'Tipo de PIN: pre-boot (antes del logo de Windows) o Windows Hello (pantalla de login).',
      'Hostname del equipo y si el usuario conserva la copia impresa de 48 dígitos.',
    ],
    beforeKey: [
      'Verificar identidad del solicitante por canal secundario.',
      'Pedir que lea el ID de 8 dígitos de la pantalla pre-boot para localizar la clave correcta.',
      'Confirmar que está bloqueado en el pre-boot (no en el login de Windows) antes de buscar clave de BitLocker.',
    ],
    escalate: [
      'Olvido repetido del PIN → proponer a Endpoint revisar la política (quitar PIN o migrar a Windows Hello for Business): decisión de administración, no de L1.',
    ],
    commands: [
      { label: 'Ver protectores activos (¿hay TPM+PIN?)', code: 'manage-bde -protectors -get C:' },
    ],
  },
  {
    id: 'tamper',
    title: 'Sospecha de manipulación (TPM / errores)',
    icon: ShieldAlert,
    meaning: [
      'Señales a revisar: errores de TPM en el arranque, bucle de 0xC0000225 (gestor de arranque ausente/dañado) o solicitudes REPETIDAS de recuperación sin que nada haya cambiado en el equipo.',
      'Un atacante con acceso físico puede intentar limpiar el TPM o forzar la recuperación social: phishing de la clave de 48 dígitos por teléfono o chat haciéndose pasar por el usuario.',
      'Una petición de recuperación "de repente" en un equipo que llevaba semanas sin cambios se verifica ANTES de entregar la clave.',
    ],
    askUser: [
      'Desde cuándo ocurre y con qué frecuencia pide la clave.',
      'Si el equipo ha salido de la oficina o lo usa otra persona.',
      'Si el usuario recibió llamadas o emails recientes pidiendo claves/códigos (vishing/phishing de claves).',
    ],
    beforeKey: [
      'Verificar identidad del solicitante por canal secundario — aquí el riesgo de suplantación es máximo.',
      'Revisar con el usuario el Visor de eventos: eventos TPM y BitLocker en el registro System.',
      'Comprobar el último check-in del equipo en Intune: un equipo offline semanas y que "de repente" pide clave es sospechoso.',
    ],
    escalate: [
      'Indicadores de manipulación física o intento de phishing de claves → Seguridad/SOC inmediato.',
      'Un reset/clear del TPM es decisión de L2/administración: L1 NUNCA limpia el TPM.',
    ],
    commands: [
      { label: 'Eventos TPM / BitLocker recientes (PowerShell)', code: "Get-WinEvent -LogName 'System' -MaxEvents 200 | Where-Object { $_.ProviderName -match 'TPM|BitLocker' } | Select-Object -First 20" },
    ],
  },
  {
    id: 'newdevice',
    title: 'Dispositivo nuevo — verificar estado',
    icon: HardDrive,
    meaning: [
      'Antes de entregar un equipo nuevo, reasignado o tras reimagen hay que verificar que BitLocker está activado Y que la clave de recuperación ya está respaldada en Intune/AD.',
      'Un equipo cifrado cuyo protector es solo TPM auto-sealed y sin clave escrow es una bomba de relojería: la clave solo existe dentro del TPM y el primer cambio de arranque deja el equipo bloqueado sin remedio.',
      'La clave se escrowea automáticamente a Intune/Entra en dispositivos Entra-joined al cifrarse; si no aparece, escalar a Endpoint para forzar el escrow.',
    ],
    askUser: [
      'Hostname y estado de cifrado esperado según política de la empresa.',
      'Si el equipo ya está unido a Entra/Intune (la clave solo escope a la nube tras el join).',
    ],
    beforeKey: [
      'Ejecutar manage-bde -status y verificar: cifrado al 100%, método XTS-AES 128/256 y protectores presentes (TPM + RecoveryPassword).',
      'Comprobar en el portal que el equipo ya tiene clave de recuperación listada ANTES de entregar el equipo al usuario.',
    ],
    escalate: [
      'Equipo cifrado SIN clave en Intune/AD → no suspender BitLocker ni dar el equipo: escalar a Endpoint para forzar el escrow de la clave.',
    ],
    commands: [
      { label: 'Estado completo (CMD, elevado)', code: 'manage-bde -status' },
      { label: 'PowerShell (volumen + protectores)', code: 'Get-BitLockerVolume | Format-List MountPoint, VolumeStatus, ProtectionStatus, EncryptionPercentage' },
    ],
  },
];

const KEY_SOURCES: KeySource[] = [
  {
    id: 'intune',
    icon: Server,
    title: 'Intune / Entra ID (aka.ms/aadrecoverykey)',
    detail: 'Dispositivos Entra-joined o Intune-managed escrowean la clave automáticamente. Portal: Devices → Recovery keys; se busca por ID de clave (8 dígitos) o por hostname. Primera opción en entornos corporativos modernos.',
  },
  {
    id: 'ad',
    icon: Server,
    title: 'Active Directory (si se backupea por GPO)',
    detail: 'Objeto del equipo en ADUC → pestaña "BitLocker Recovery": atributo msFVE-RecoveryInformation. Solo existe si la GPO de escrow a AD DS está configurada — típico en dominios clásicos.',
  },
  {
    id: 'print',
    icon: FileText,
    title: 'Copia impresa del usuario',
    detail: 'La que BitLocker ofrece guardar/imprimir al activar el cifrado. Pedir foto por canal corporativo SOLO después de verificar la identidad.',
  },
  {
    id: 'usb',
    icon: Usb,
    title: 'USB con archivo .bek',
    detail: 'Archivo "BitLocker Recovery Key (*.bek)" guardado en un USB al activar el cifrado. Se introduce el USB durante la pantalla de recuperación.',
  },
  {
    id: 'msa',
    icon: User,
    title: 'account.microsoft.com/devices/recoverykey',
    detail: 'SOLO para equipos cifrados con una cuenta Microsoft personal (BYOD). Los equipos corporativos Entra-joined NO aparecen aquí.',
  },
];

/* ---------- subcomponentes ---------- */

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">{children}</div>
);

/** Fila de checklist reutilizable (checkbox accesible + texto). */
const CheckRow: React.FC<{ checked: boolean; onToggle: () => void; children: React.ReactNode }> = ({
  checked, onToggle, children,
}) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    onClick={onToggle}
    title={checked ? 'Marcar como pendiente' : 'Marcar como hecho'}
    className="w-full flex items-start gap-2 text-left p-1.5 rounded hover:bg-[#161616] transition-colors cursor-pointer"
  >
    {checked ? (
      <CheckSquare className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
    ) : (
      <Square className="w-3.5 h-3.5 text-[#555] shrink-0 mt-0.5" />
    )}
    <span className={`text-[11px] leading-relaxed ${checked ? 'text-[#666] line-through' : 'text-[#DDD]'}`}>
      {children}
    </span>
  </button>
);

/* ---------- componente principal ---------- */

export const HdBitLockerTool: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>(SCENARIOS[0].id);
  const [found, setFound] = useState<Record<string, boolean>>({});
  const { addedToast, showToast } = useAddToNoteToast();

  const scenario = SCENARIOS.find((s) => s.id === selectedId) ?? SCENARIOS[0];
  const ScenarioIcon = scenario.icon;

  const toggleFound = (id: string): void =>
    setFound((prev) => ({ ...prev, [id]: !prev[id] }));

  /** Exporta el escenario activo + checklist a Notas (todo escapado). */
  const addToNote = (): void => {
    const rows: Array<[string, string]> = [
      ['Escenario', scenario.title],
      ['Qué significa', scenario.meaning.join(' ')],
      ['Pedir al usuario', scenario.askUser.join(' | ')],
      ['Verificación identidad', scenario.beforeKey.join(' | ')],
      ['Escalar si', scenario.escalate.join(' | ')],
      ['Comandos', scenario.commands.map((c) => c.code).join(' | ')],
      ['Ubicaciones clave (marcadas)', KEY_SOURCES.filter((k) => found[k.id]).map((k) => k.title).join(' | ') || 'ninguna marcada'],
      ['Nota', 'Guía educativa: esta tool no accede a claves reales ni a Intune/AD.'],
    ];
    useNoteStore.getState().enqueueNote(
      `BitLocker Recovery Helper — ${scenario.title}`,
      buildNoteHtmlTable(rows.map(([k, v]) => [escapeHtml(k), escapeHtml(v)])),
    );
    showToast();
  };

  return (
    <div className="space-y-3">
      {/* Banner permanente educativo */}
      <InfoBanner>
        <span className="inline-flex items-start gap-1.5">
          <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            <span className="font-semibold">Guía educativa</span> — esta tool NO
            accede a claves reales ni a Intune/AD. Todas las ubicaciones y
            comandos son referencia para actuar en los portales reales.
          </span>
        </span>
      </InfoBanner>

      {/* Selector de escenario */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {SCENARIOS.map((s) => {
          const Icon = s.icon;
          const active = s.id === selectedId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedId(s.id)}
              title={`Ver escenario: ${s.title}`}
              aria-pressed={active}
              className={`text-left p-2.5 rounded border transition-colors cursor-pointer flex items-start gap-2 ${
                active
                  ? 'bg-blue-500/10 border-blue-500/50'
                  : 'bg-[#0D0D0D] border-[#262626] hover:border-[#444]'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${active ? 'text-blue-400' : 'text-[#888]'}`} />
              <span className={`text-xs font-semibold ${active ? 'text-white' : 'text-[#DDD]'}`}>
                {s.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Detalle del escenario */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#1A1A1A]">
          <ScenarioIcon className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">{scenario.title}</h3>
        </div>

        {/* Qué significa y por qué pasa */}
        <section className="space-y-1.5">
          <SectionLabel>Qué significa y por qué pasa</SectionLabel>
          {scenario.meaning.map((m, i) => (
            <p key={i} className="text-[11px] text-[#AAA] leading-relaxed">{m}</p>
          ))}
        </section>

        {/* Datos que pedir + ID vs clave */}
        <section className="space-y-1.5">
          <SectionLabel>Datos que pedir al usuario</SectionLabel>
          <ul className="space-y-1">
            {scenario.askUser.map((a, i) => (
              <li key={i} className="text-[11px] text-[#DDD] leading-relaxed flex items-start gap-1.5">
                <User className="w-3 h-3 text-[#666] shrink-0 mt-1" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
          <div className="bg-[#161616] border border-[#262626] rounded p-2.5 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
              ID de clave ≠ clave
            </div>
            <div className="text-[11px] leading-relaxed text-[#DDD]">
              <span className="text-blue-300 font-semibold">ID de clave de recuperación:</span>{' '}
              8 dígitos hexadecimales (ej. 1F2A3B4C). Aparece en la pantalla de
              BitLocker. Sirve para BUSCAR la clave — es el dato que SÍ puedes
              pedir por chat.
            </div>
            <div className="text-[11px] leading-relaxed text-[#DDD]">
              <span className="text-amber-400 font-semibold">Clave de recuperación:</span>{' '}
              48 dígitos en 8 bloques de 6. Es la que descifra.{' '}
              <span className="text-red-400">
                NO se pide ni se envía por chat/email: se lee al usuario ya
                verificado por canal seguro o se teclea en remoto.
              </span>
            </div>
          </div>
        </section>

        {/* Verificación de identidad — banner rojo */}
        <section className="space-y-1.5">
          <SectionLabel>Verifica ANTES de dar la clave</SectionLabel>
          <ErrorBanner message="Riesgo real de phishing de claves: atacantes suplantan a empleados para obtener la clave de 48 dígitos y descifrar portátiles robados. Verifica SIEMPRE la identidad por un canal secundario." />
          <div className="bg-[#161616] border border-[#262626] rounded p-1.5">
            {scenario.beforeKey.map((b, i) => (
              <CheckRow key={i} checked={Boolean(found[`b-${scenario.id}-${i}`])} onToggle={() => toggleFound(`b-${scenario.id}-${i}`)}>
                {b}
              </CheckRow>
            ))}
          </div>
        </section>

        {/* Cuándo escalar */}
        <section className="space-y-1.5">
          <SectionLabel>Cuándo escalar</SectionLabel>
          {scenario.escalate.map((e, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-[11px] text-[#DDD] leading-relaxed">{e}</span>
            </div>
          ))}
        </section>

        {/* Comandos de referencia */}
        <section className="space-y-1.5">
          <SectionLabel>Comandos / consultas de referencia</SectionLabel>
          {scenario.commands.map((c) => (
            <CodeBlock key={c.label} label={c.label} code={c.code} lang="win" />
          ))}
        </section>
      </div>

      {/* Dónde buscar la clave — checklist */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
              Dónde buscar la clave
            </span>
          </div>
          <span className="text-[10px] text-[#666]">
            {KEY_SOURCES.filter((k) => found[k.id]).length}/{KEY_SOURCES.length} verificadas
          </span>
        </div>
        {KEY_SOURCES.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.id} className="bg-[#161616] border border-[#262626] rounded p-2 flex items-start gap-2">
              <Icon className="w-4 h-4 text-[#888] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="text-[11px] font-semibold text-white">{k.title}</div>
                <div className="text-[10px] text-[#888] leading-relaxed">{k.detail}</div>
              </div>
              <CopyBtn text={k.id === 'intune' ? 'https://aka.ms/aadrecoverykey' : k.id === 'msa' ? 'https://account.microsoft.com/devices/recoverykey' : ''} label="Copiar URL del portal" />
              <button
                type="button"
                role="checkbox"
                aria-checked={Boolean(found[k.id])}
                aria-label={`Marcar ubicación verificada: ${k.title}`}
                onClick={() => toggleFound(k.id)}
                title={found[k.id] ? 'Quitar marca' : 'Marcar como verificada'}
                className="p-1 rounded text-[#666] hover:text-blue-400 hover:bg-[#0D0D0D] transition-colors shrink-0 cursor-pointer"
              >
                {found[k.id] ? (
                  <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addToNote} className={`${btnPrimary} inline-flex items-center gap-1.5`}>
          <BookOpen className="w-3.5 h-3.5" />
          Añadir escenario a Notas
        </button>
        <button
          type="button"
          onClick={() => setFound({})}
          className={`${btnGhost} inline-flex items-center gap-1.5`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reiniciar checklist
        </button>
      </div>

      {addedToast && <InfoBanner>Añadido a Notas — crea una nota nueva para verlo.</InfoBanner>}

      {/* Nota de cierre de seguridad */}
      <div className="flex items-start gap-1.5 text-[10px] text-[#666] leading-relaxed">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#555]" />
        <span>
          La entrega de una clave de recuperación siempre queda documentada en el
          ticket: solicitante, canal de verificación, ID de clave usado y equipo.
        </span>
      </div>
    </div>
  );
};

export default HdBitLockerTool;
