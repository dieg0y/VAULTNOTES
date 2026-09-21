/**
 * HdOutlookTool.tsx — Outlook Connectivity Analyzer (HelpDesk FASE 2, grupo B).
 *
 * Selector multi-síntoma (chips toggle, análisis en vivo): por cada síntoma
 * activo muestra causas probables rankeadas, pasos L1 numerados (solo pasos
 * soportados: outlook.exe /safe, Quick/Online Repair, Administrador de
 * credenciales, perfil desde Panel de control → Correo, OST y modo caché) y
 * criterio de escalamiento a M365/L2.
 *
 * "Modo clásico de diagnóstico": escalera OWA → otros usuarios → móvil,
 * renderizada como árbol de decisión con cajas conectadas (distingue problema
 * de cliente vs servicio vs cuenta).
 *
 * [Añadir a Notas] → useNoteStore.enqueueNote + buildNoteHtmlTable con todos
 * los valores escapados con escapeHtml().
 *
 * 100% offline. Sin fetch/XHR/WebSocket/eval. Spec reference: Task ID 2-b.
 */
'use client';

import React, { useState } from 'react';
import {
  XCircle, KeyRound, Inbox, Send, Paperclip, Search, Users, Zap,
  CloudOff, BookOpen, Network, ChevronDown, CircleDot, AlertTriangle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  btnPrimary, btnGhost, CodeBlock, InfoBanner,
  buildNoteHtmlTable, useAddToNoteToast,
} from '../_shared';
import { escapeHtml } from '../../../utils/escapeHtml';
import { useNoteStore } from '../../../store/noteStore';

/* ---------- tipos ---------- */

interface Cause {
  label: string;
  detail: string;
}

interface SymptomCmd {
  label: string;
  code: string;
}

interface Symptom {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Causas probables en orden de frecuencia L1 (rank implícito). */
  causes: Cause[];
  /** Pasos L1 numerados. */
  steps: string[];
  commands: SymptomCmd[];
  escalate: string;
}

interface LadderBranch {
  chip: string;
  outcome: string;
  tone: 'blue' | 'amber' | 'red';
}

interface LadderStep {
  n: number;
  question: string;
  hint: string;
  yes: LadderBranch;
  no: LadderBranch;
}

/* ---------- datos ---------- */

const SYMPTOMS: Symptom[] = [
  {
    id: 'no-open',
    label: 'No abre',
    icon: XCircle,
    causes: [
      { label: 'Proceso colgado', detail: 'outlook.exe sigue vivo en segundo plano aunque no se vea la ventana — lo más frecuente.' },
      { label: 'Add-in incompatible', detail: 'Complemento COM de terceros o antivirus integrado que bloquea el arranque.' },
      { label: 'Perfil dañado', detail: 'El perfil de Outlook (archivo .ost + configuración) queda inconsistente.' },
      { label: 'OST demasiado grande', detail: 'OST por encima de ~40-50 GB suele dar arranques lentos o fallidos.' },
    ],
    steps: [
      'Matar el proceso colgado y volver a lanzar Outlook (ver comando).',
      'Arrancar en modo seguro: outlook.exe /safe. Si abre, el culpable es un add-in.',
      'Deshabilitar add-ins uno a uno: Archivo → Opciones → Complementos → Administrar: Elementos COM → Ir.',
      'Quick Repair desde Aplicaciones instaladas (Microsoft 365 → Modificar); si persiste, Online Repair.',
      'Si sigue: recrear el perfil desde Panel de control → Correo → Mostrar perfiles (quitar y crear de nuevo).',
    ],
    commands: [
      { label: 'Matar proceso (CMD)', code: 'taskkill /f /im outlook.exe' },
      { label: 'Modo seguro (CMD → Ejecutar)', code: 'outlook.exe /safe' },
      { label: 'Applet Correo (perfiles)', code: 'control mlcfg32.cpl' },
    ],
    escalate: 'Si tras perfil nuevo + Online Repair no abre → L2/M365 (adjuntar qué add-ins estaban activos).',
  },
  {
    id: 'pw-loop',
    label: 'Pide contraseña en bucle',
    icon: KeyRound,
    causes: [
      { label: 'Credenciales guardadas corruptas', detail: 'Entradas MSOffice o identidades viejas en el Administrador de credenciales — la causa clásica.' },
      { label: 'Cambio de contraseña reciente', detail: 'La caché sigue enviando la contraseña anterior y M365 la rechaza.' },
      { label: 'MFA bloqueado', detail: 'Método por defecto perdido o expirado: app OTP sin notificación, número de teléfono dado de baja.' },
    ],
    steps: [
      'Cerrar Outlook y el resto de apps de Office (comparten la sesión).',
      'Administrador de credenciales → Credenciales de Windows → eliminar las entradas que empiecen por MSOffice y las identidades de la cuenta vieja.',
      'Reabrir Outlook y entrar con usuario@dominio + contraseña NUEVA; completar el MFA con el método disponible.',
      'Si persiste: Archivo → Cuenta de Office → Cerrar sesión y volver a iniciarla.',
      'Verificar que la cuenta funciona en OWA (descarta bloqueo de cuenta).',
    ],
    commands: [
      { label: 'Abrir Administrador de credenciales', code: 'control /name Microsoft.CredentialManager' },
    ],
    escalate: 'OWA también rechaza la contraseña o MFA bloqueado → reset de credenciales/MFA (IAM) tras verificación de identidad.',
  },
  {
    id: 'no-recv',
    label: 'No llegan correos',
    icon: Inbox,
    causes: [
      { label: 'Buzón lleno', detail: 'Cuota superada: Exchange deja de aceptar correo entrante.' },
      { label: 'Reglas o filtros', detail: 'Una regla mueve o borra el correo entrante sin que el usuario lo note.' },
      { label: 'Desconectado/desincronizado', detail: 'Outlook en modo offline u OST sin sincronizar: el correo está en el buzón pero no baja.' },
      { label: 'Junk o cuarentena', detail: 'El remitente filtrado como spam o retenido en cuarentena.' },
    ],
    steps: [
      'Primero OWA: si el correo está en OWA y no en Outlook → problema de sincronización del cliente; si no está en OWA → problema de entrega/buzón.',
      'Revisar Junk, Elementos eliminados y las reglas (Archivo → Administrar reglas y alertas).',
      'Comprobar cuota de buzón: lleno → que el usuario archive/borre y escalar ampliación si procede.',
      'Botón Enviar/Recibir todo y mirar la barra de estado: ¿"Conectado a" o "Trababajando sin conexión"?',
    ],
    commands: [],
    escalate: 'Ampliación de cuota → M365/admin. Entrega fallida con NDR → L2/M365 con el NDR exacto.',
  },
  {
    id: 'no-send',
    label: 'No puedo enviar',
    icon: Send,
    causes: [
      { label: 'Mensaje atascado en Bandeja de salida', detail: 'Clásico con adjuntos grandes: el resto de la cola de envío queda bloqueada detrás.' },
      { label: 'Adjunto > límite', detail: 'M365 limita ~25 MB por mensaje; por encima, el envío falla.' },
      { label: 'Buzón lleno', detail: 'Sin espacio libre el servidor no acepta el envío.' },
    ],
    steps: [
      'Mover a Borradores el mensaje atascado de la Bandeja de salida y descartar su adjunto.',
      'Adjuntos grandes → compartir por enlace de OneDrive/SharePoint en vez de adjuntar.',
      'Comprobar cuota de buzón (envío y cuota van de la mano).',
      'Capturar el error/NDR exacto para el ticket.',
    ],
    commands: [],
    escalate: 'NDR 550/552 persistentes o fallo de conectores/relay → M365/L2 con el NDR completo.',
  },
  {
    id: 'slow',
    label: 'Adjuntos/descarga lenta',
    icon: Paperclip,
    causes: [
      { label: 'OST enorme', detail: 'Modo caché con un OST gigante: cada sincronización pesa.' },
      { label: 'Red/VPN lenta', detail: 'Todo el tráfico por el túnel VPN en vez de split tunneling.' },
      { label: 'Antivirus inspeccionando', detail: 'Escaneo en tiempo real de los temporales de Outlook frena la descarga.' },
    ],
    steps: [
      'Comprobar el tamaño del OST (ver comando).',
      'Si pasa de ~40-50 GB: archivar correo antiguo y compactar/recrear el OST.',
      'Verificar modo caché: Archivo → Configuración de la cuenta → Cambiar → Usar modo caché de Exchange (OFF = descarga en directo, lento).',
      'Probar sin VPN o por la red corporativa directa para aislar la causa.',
    ],
    commands: [
      { label: 'Tamaño del OST (CMD)', code: 'dir "%LOCALAPPDATA%\\Microsoft\\Outlook"\\*.ost' },
    ],
    escalate: 'Degradación de red persistente → Redes. OST que no compacta o se corrompe → L2.',
  },
  {
    id: 'search',
    label: 'Búsqueda no encuentra nada',
    icon: Search,
    causes: [
      { label: 'Índice de Windows Search dañado', detail: 'El índice local se corrompe o queda pausado.' },
      { label: 'Índice incompleto', detail: 'Tras reconstruir el OST o cambiar el modo caché el índice queda a medias.' },
      { label: 'Búsqueda solo local', detail: 'Sin modo caché, la búsqueda no cubre el almacén local completo.' },
    ],
    steps: [
      'Opciones de indexación → comprobar que Microsoft Outlook aparece y está indexado.',
      'Reconstruir el índice: Opciones de indexación → Avanzadas → Reconstruir (avisa al usuario de que tarda).',
      'Verificar que el modo caché de Exchange está activo.',
      'Workaround mientras reindexa: usar la búsqueda de OWA.',
    ],
    commands: [
      { label: 'Abrir Opciones de indexación', code: 'control /name Microsoft.IndexingOptions' },
    ],
    escalate: 'Índice que se corrompe repetidamente → L2 (revisar perfil de búsqueda y OST).',
  },
  {
    id: 'shared',
    label: 'Falta buzón compartido',
    icon: Users,
    causes: [
      { label: 'Permiso retirado', detail: 'Alguien quitó el Full Access al buzón compartido — la causa más frecuente.' },
      { label: 'Auto-mapping desactivado', detail: 'El buzón no se auto-monta al iniciar aunque exista el permiso.' },
      { label: 'Perfil reconstruido', detail: 'Al recrear el perfil el buzón adicional no se volvió a añadir.' },
    ],
    steps: [
      'Probar en OWA: si el buzón compartido aparece en OWA → problema del perfil local; si no → falta el permiso.',
      'Sin permiso: quien gestione el buzón (o M365) debe conceder Full Access — L1 no otorga permisos de buzón.',
      'Con permiso y sin auto-mapeo: Archivo → Configuración de la cuenta → Cambiar → Más configuración → Opciones avanzadas → Agregar buzón (alias del compartido) → reiniciar Outlook.',
    ],
    commands: [],
    escalate: 'Concesión de Full Access/Send As → M365/L2 o el flujo de permisos de la empresa.',
  },
  {
    id: 'crash',
    label: 'Se cierra solo o se congela',
    icon: Zap,
    causes: [
      { label: 'Add-in inestable', detail: 'Antivirus integrado o complemento de terceros: primera causa de crashes.' },
      { label: 'OST dañado', detail: 'Corrupción del almacén local provoca cuelgues al abrir carpetas concretas.' },
      { label: 'Office inconsistente', detail: 'Instalación Click-to-Run con actualización pendiente o a medias.' },
    ],
    steps: [
      'Arrancar en modo seguro; si es estable → deshabilitar add-ins uno a uno.',
      'Actualizar Office: Archivo → Cuenta de Office → Opciones de actualización → Actualizar ahora.',
      'Quick Repair; si persiste, Online Repair (officec2rclient, ver comando).',
      'Si se congela solo en carpetas concretas → sospechar OST: recrear perfil.',
    ],
    commands: [
      { label: 'Modo seguro', code: 'outlook.exe /safe' },
      { label: 'Repair Click-to-Run (CMD elevado)', code: 'officec2rclient.exe /repair user' },
    ],
    escalate: 'Crashes persistentes tras Online Repair + perfil nuevo → L2/M365 con los Event ID 1000/1001 del registro Application.',
  },
  {
    id: 'offline',
    label: 'Trabajando sin conexión',
    icon: CloudOff,
    causes: [
      { label: 'Botón "Trabajar sin conexión"', detail: 'Activado sin querer en la pestaña Enviar/Recibir — lo primero que se mira.' },
      { label: 'Modo caché desactivado', detail: 'Sin caché, un microcorte de red pasa Outlook a modo offline enseguida.' },
      { label: 'Problema de red/DNS', detail: 'Fallo de resolución o conectividad hacia Office 365.' },
    ],
    steps: [
      'Pestaña Enviar/Recibir → botón "Trabajar sin conexión": si está resaltado, desactivarlo.',
      'Comprobar conectividad general (navegador, Teams) para descartar caída de red.',
      'Verificar que el modo caché de Exchange está activo.',
      'Si es red: derivar a Redes tras un flushdns y las pruebas de conectividad.',
    ],
    commands: [
      { label: 'Limpiar caché DNS', code: 'ipconfig /flushdns' },
    ],
    escalate: 'Fallo de conectividad repetido a M365 → Redes/L2 con las pruebas realizadas.',
  },
];

const LADDER: LadderStep[] = [
  {
    n: 1,
    question: '¿Funciona OWA? (outlook.office.com o el webmail corporativo)',
    hint: 'Distingue problema del CLIENTE vs del SERVICIO/CUENTA.',
    yes: { chip: 'SÍ funciona', outcome: 'Problema del CLIENTE: perfil, OST, add-ins. Diagnóstico local (modo seguro, credenciales, perfil). Salta al paso 3 para afinar.', tone: 'blue' },
    no: { chip: 'NO funciona', outcome: 'Problema del SERVICIO o de la CUENTA. Pasa al paso 2.', tone: 'amber' },
  },
  {
    n: 2,
    question: '¿Otros usuarios afectados? (canales de Teams, Service Health)',
    hint: 'Detecta incidente masivo antes de quemar horas en perfiles.',
    yes: { chip: 'SÍ, más gente', outcome: 'Incidente masivo M365: escalar como P1/incidente a M365 y avisar al coordinador. NO sigas tocando perfiles de usuario.', tone: 'red' },
    no: { chip: 'Solo él/ella', outcome: 'Problema de la CUENTA del usuario: contraseña, MFA, licencia o cuota. Verifica en OWA desde otro dispositivo o móvil.', tone: 'blue' },
  },
  {
    n: 3,
    question: '¿El móvil sincroniza? (Outlook mobile)',
    hint: 'Distingue perfil local vs cuenta.',
    yes: { chip: 'SÍ sincroniza', outcome: 'Cuenta bien → problema del perfil/OST local del PC: recrear perfil, revisar OST y add-ins.', tone: 'blue' },
    no: { chip: 'NO sincroniza', outcome: 'Problema de cuenta/autenticación: credenciales guardadas, MFA o licencia. Revisa el síntoma "Pide contraseña en bucle".', tone: 'amber' },
  },
];

const TONE_BOX: Record<LadderBranch['tone'], string> = {
  blue: 'border-blue-500/40 bg-blue-500/5 text-blue-300',
  amber: 'border-amber-500/40 bg-amber-500/5 text-amber-300',
  red: 'border-red-500/40 bg-red-500/5 text-red-400',
};

/* ---------- componente principal ---------- */

export const HdOutlookTool: React.FC = () => {
  const [active, setActive] = useState<Record<string, boolean>>({ 'no-open': true });
  const [classicMode, setClassicMode] = useState(false);
  const { addedToast, showToast } = useAddToNoteToast();

  const activeSymptoms = SYMPTOMS.filter((s) => active[s.id]);

  const toggle = (id: string): void =>
    setActive((prev) => ({ ...prev, [id]: !prev[id] }));

  /** Exporta los síntomas activos con causas/pasos/escalado a Notas (todo escapado). */
  const addToNote = (): void => {
    const rows: Array<[string, string]> = activeSymptoms.length === 0
      ? [['Síntomas activos', 'ninguno seleccionado']]
      : activeSymptoms.flatMap((s) => [
        [`Síntoma: ${s.label}`, s.causes.map((c, i) => `${i + 1}. ${c.label}`).join(' · ')],
        [`Pasos L1 (${s.label})`, s.steps.map((p, i) => `${i + 1}. ${p}`).join(' | ')],
        [`Escalar (${s.label})`, s.escalate],
      ]);
    useNoteStore.getState().enqueueNote(
      'Outlook Connectivity Analyzer — diagnóstico',
      buildNoteHtmlTable(rows.map(([k, v]) => [escapeHtml(k), escapeHtml(v)])),
    );
    showToast();
  };

  return (
    <div className="space-y-3">
      <InfoBanner>
        Analizador L1 de sintomatología Outlook clásico (escritorio). Solo pasos
        soportados: modo seguro, repair oficial (Quick/Online), Administrador de
        credenciales, perfil desde Panel de control → Correo, OST y modo caché.
        100% offline: nada se envía ni se consulta.
      </InfoBanner>

      {/* Chips multi-síntoma */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
          Síntomas reportados (multi-selección)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SYMPTOMS.map((s) => {
            const Icon = s.icon;
            const on = Boolean(active[s.id]);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                aria-pressed={on}
                title={`Activar/desactivar síntoma: ${s.label}`}
                className={`${btnGhost} px-2.5 inline-flex items-center gap-1.5 ${
                  on ? 'bg-blue-500/15 border-blue-500/40 text-blue-300' : ''
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Resultados en vivo por síntoma activo */}
      {activeSymptoms.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
            {activeSymptoms.length} síntoma{activeSymptoms.length === 1 ? '' : 's'} activo{activeSymptoms.length === 1 ? '' : 's'} — análisis L1
          </div>
          {activeSymptoms.map((s) => {
            const SymIcon = s.icon;
            return (
              <div key={s.id} className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2.5">
                <div className="flex items-center gap-2 pb-2 border-b border-[#1A1A1A]">
                  <SymIcon className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-bold text-white">{s.label}</h3>
                </div>

                {/* Causas rankeadas */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
                    Causas probables (por frecuencia L1)
                  </div>
                  {s.causes.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 bg-[#161616] border border-[#262626] rounded p-2">
                      <span className="text-[10px] font-bold text-blue-400 font-mono shrink-0 mt-0.5">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold text-white">{c.label}</div>
                        <div className="text-[10px] text-[#888] leading-relaxed">{c.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pasos L1 numerados */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Pasos L1</div>
                  <ol className="space-y-1">
                    {s.steps.map((p, i) => (
                      <li key={i} className="text-[11px] text-[#DDD] leading-relaxed flex items-start gap-2">
                        <CircleDot className="w-3 h-3 text-[#555] shrink-0 mt-1" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Comandos */}
                {s.commands.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
                      Comandos / accesos de referencia
                    </div>
                    {s.commands.map((c) => (
                      <CodeBlock key={c.label} label={c.label} code={c.code} lang="win" />
                    ))}
                  </div>
                )}

                {/* Escalado */}
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-[#DDD] leading-relaxed">
                    <span className="font-semibold text-amber-400">Escalar:</span> {s.escalate}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeSymptoms.length === 0 && (
        <InfoBanner>Selecciona uno o más síntomas para ver el análisis L1.</InfoBanner>
      )}

      {/* Modo clásico — escalera de decisión */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2.5">
        <button
          type="button"
          onClick={() => setClassicMode((v) => !v)}
          aria-expanded={classicMode}
          title="Abrir/cerrar la escalera de diagnóstico clásica"
          className={`${btnGhost} w-full justify-between inline-flex items-center gap-2`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Network className="w-3.5 h-3.5" />
            Modo clásico de diagnóstico (escalera OWA → otros usuarios → móvil)
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${classicMode ? 'rotate-180' : ''}`} />
        </button>

        {classicMode && (
          <div className="space-y-3">
            {LADDER.map((step, idx) => (
              <div key={step.n} className="space-y-2">
                {/* Caja pregunta */}
                <div className="bg-[#161616] border border-blue-500/40 rounded p-2.5">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-bold inline-flex items-center justify-center shrink-0">
                      {step.n}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-white leading-relaxed">{step.question}</div>
                      <div className="text-[10px] text-[#888]">{step.hint}</div>
                    </div>
                  </div>
                </div>
                {/* Conector */}
                <div className="flex justify-center" aria-hidden="true">
                  <div className="w-px h-4 bg-[#333]" />
                </div>
                {/* Ramas SÍ / NO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {([step.yes, step.no] as LadderBranch[]).map((b) => (
                    <div key={b.chip} className={`border rounded p-2.5 ${TONE_BOX[b.tone]}`}>
                      <div className="text-[10px] font-bold uppercase tracking-widest mb-1">{b.chip}</div>
                      <div className="text-[11px] leading-relaxed text-[#DDD]">{b.outcome}</div>
                    </div>
                  ))}
                </div>
                {idx < LADDER.length - 1 && (
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#666]">
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>siguiente paso de la escalera</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addToNote}
          disabled={activeSymptoms.length === 0}
          className={`${btnPrimary} inline-flex items-center gap-1.5`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Añadir análisis a Notas
        </button>
        <button
          type="button"
          onClick={() => setActive({})}
          className={`${btnGhost} inline-flex items-center gap-1.5`}
        >
          Limpiar síntomas
        </button>
      </div>

      {addedToast && <InfoBanner>Añadido a Notas — crea una nota nueva para verlo.</InfoBanner>}
    </div>
  );
};

export default HdOutlookTool;
