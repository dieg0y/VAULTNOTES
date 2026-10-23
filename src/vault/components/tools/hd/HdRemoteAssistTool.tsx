/**
 * HdRemoteAssistTool.tsx — HelpDesk "Remote Assist Checklist" (Task 2-c).
 *
 * Runbook de sesión de soporte remoto (Quick Assist / Teams screen share /
 * AnyDesk según la política de la empresa) en cuatro bloques:
 *  - FASE Antes: verificar identidad por canal independiente, ventana
 *    horaria, ticket abierto, herramienta anunciada y CONSENTIMIENTO
 *    explícito del usuario (obligatorio).
 *  - FASE Durante: narrar cada acción, chat activo, no abrir archivos
 *    personales, NUNCA aceptar la contraseña del usuario por chat (banner
 *    rojo), control solo cuando haga falta, pausar ante info sensible.
 *  - FASE Después: resumen no técnico, confirmación verbal, cerrar sesión
 *    delante del usuario, registrar en el ticket, no dejar agentes ni
 *    credenciales temporales.
 *  - Señales de alerta (red flags): posible social engineering → detener y
 *    escalar a seguridad.
 *
 * Progreso (checkboxes / total), botón reiniciar y [Exportar resumen a
 * Notas] con los ítems completados (valores escapados).
 *
 * 100% offline: sin fetch/XHR/WebSocket/eval. Estado 100% React local.
 */
'use client';

import React, { useMemo, useState } from 'react';
import { Clock, Eye, FileText, ShieldAlert, RotateCcw, BookOpen } from 'lucide-react';
import {
  btnGhost, buildNoteHtmlTable, useAddToNoteToast, InfoBanner,
} from '../_shared';
import { useNoteStore } from '../../../store/noteStore';
import { escapeHtml } from '../../../utils/escapeHtml';

/* ---------- runbook (texto) ---------- */

interface RaItem { id: string; text: string; }
interface RaPhase {
  id: string;
  title: string;
  intro: string;
  icon: React.ReactNode;
  items: RaItem[];
}

const RA_PHASES: ReadonlyArray<RaPhase> = [
  {
    id: 'antes',
    title: 'FASE 1 · Antes de la sesión',
    intro: 'Preparación y verificación: si algo falla aquí, la sesión no empieza.',
    icon: <Clock className="w-3.5 h-3.5" />,
    items: [
      { id: 'a1', text: 'Verificar la identidad del solicitante por un canal INDEPENDIENTE (llamada al número del ticket, chat corporativo confirmado) — nunca solo por el mensaje que pide la sesión.' },
      { id: 'a2', text: 'Confirmar la ventana horaria: la sesión ocurre en horario acordado, no "ahora mismo" sin aviso.' },
      { id: 'a3', text: 'Tener el ticket abierto y a la vista durante toda la sesión (ID, solicitante, equipo, descripción).' },
      { id: 'a4', text: 'Anunciar qué herramienta se usará (Quick Assist / Teams screen share / AnyDesk) según la política de la empresa.' },
      { id: 'a5', text: 'Pedir CONSENTIMIENTO explícito del usuario: es obligatorio antes de tomar control. Sin consentimiento no hay sesión, y se registra en el ticket.' },
    ],
  },
  {
    id: 'durante',
    title: 'FASE 2 · Durante la sesión',
    intro: 'Transparencia total: el usuario siempre sabe qué estás haciendo.',
    icon: <Eye className="w-3.5 h-3.5" />,
    items: [
      { id: 'd1', text: 'Anunciar cada acción ANTES de hacerla («voy a abrir el Panel de control», «voy a reiniciar el servicio de impresión»).' },
      { id: 'd2', text: 'Mantener el chat o la llamada activos: narrar lo que se ve y lo que se cambia.' },
      { id: 'd3', text: 'NO abrir archivos personales del usuario (fotos, correo personal, documentos ajenos al ticket).' },
      { id: 'd4', text: 'NO aceptar que el usuario escriba su contraseña por chat: pedidle que la teclee él cuando el sistema la pida.' },
      { id: 'd5', text: 'Pedir control del equipo solo cuando haga falta (y soltarlo al terminar cada manipulación).' },
      { id: 'd6', text: 'Si aparece información sensible en pantalla (nóminas, datos de terceros, credenciales) → pausar, preguntar y minimizar.' },
    ],
  },
  {
    id: 'despues',
    title: 'FASE 3 · Después de la sesión',
    intro: 'Cierre limpio: el usuario entiende qué pasó y tú dejaste rastro.',
    icon: <FileText className="w-3.5 h-3.5" />,
    items: [
      { id: 'p1', text: 'Resumir al usuario, en lenguaje NO técnico, qué se hizo y qué se cambió.' },
      { id: 'p2', text: 'Obtener confirmación verbal de que el problema está resuelto (o el estado en el que queda).' },
      { id: 'p3', text: 'Cerrar la sesión remota DELANTE del usuario (que vea cómo se corta la conexión).' },
      { id: 'p4', text: 'Registrar en el ticket: acciones realizadas, hora de inicio/fin y resultado.' },
      { id: 'p5', text: 'NO dejar agentes, accesos temporales ni contraseñas instaladas en el equipo del usuario.' },
    ],
  },
];

/* ---------- red flags: social engineering ---------- */

const RED_FLAGS: ReadonlyArray<{ id: string; title: string; body: string }> = [
  {
    id: 'rf1',
    title: 'Acceso al equipo de otro usuario',
    body: 'Un usuario insiste en que le des acceso (o le hagas operaciones) sobre el equipo o la cuenta de OTRO usuario. El propietario debe ser quien autorice.',
  },
  {
    id: 'rf2',
    title: 'Urgencia artificial fuera de horario',
    body: 'Petición fuera de horario con presión injustificada («es para ya, no puedo esperar a mañana») para saltarse las verificaciones.',
  },
  {
    id: 'rf3',
    title: 'Identidad no verificable',
    body: 'El solicitante no puede verificar su identidad por canal independiente pero «necesita acceso ya». La urgencia no sustituye a la verificación.',
  },
  {
    id: 'rf4',
    title: 'Abuso de tu sesión admin',
    body: 'Intento de que uses TU sesión de administrador para acciones ajenas al ticket (cambios de permisos, accesos, configuraciones) que no corresponden al solicitante.',
  },
];

const RED_BANNER_CLS =
  'px-3 py-2 rounded border border-red-500/40 bg-red-500/10 text-red-400 text-[11px] font-medium leading-relaxed';

/* ---------- componente ---------- */

export const HdRemoteAssistTool: React.FC = () => {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const { addedToast, showToast } = useAddToNoteToast();

  const total = useMemo(
    () => RA_PHASES.reduce((acc, p) => acc + p.items.length, 0),
    [],
  );
  const doneCount = useMemo(
    () => RA_PHASES.reduce((acc, p) => acc + p.items.filter((i) => done[i.id]).length, 0),
    [done],
  );

  const toggle = (id: string): void => {
    setDone((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const reset = (): void => setDone({});

  const exportToNote = (): void => {
    if (doneCount === 0) return;
    const rows: Array<[string, string]> = [];
    for (const phase of RA_PHASES) {
      for (const item of phase.items) {
        if (done[item.id]) {
          rows.push([escapeHtml(phase.title.replace(/^FASE \d+ · /, '')), escapeHtml(item.text)]);
        }
      }
    }
    const header: Array<[string, string]> = [
      [escapeHtml('Ítems completados'), escapeHtml(`${doneCount}/${total}`)],
    ];
    useNoteStore
      .getState()
      .enqueueNote('Asistencia remota — resumen de sesión', buildNoteHtmlTable([...header, ...rows]));
    showToast();
  };

  return (
    <div className="space-y-3">
      <InfoBanner>
        Runbook educativo de sesión de soporte remoto. Ajusta la herramienta
        (Quick Assist / Teams / AnyDesk) a la política de tu empresa. Estado
        100% local: nada de esta checklist se envía ni se guarda fuera del
        navegador.
      </InfoBanner>

      {/* progreso */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] text-[#888] uppercase tracking-wider">
            Progreso del runbook: {doneCount}/{total} ítems
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className={`${btnGhost} inline-flex items-center gap-1.5`}
              title="Reiniciar el checklist completo"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reiniciar
            </button>
            <button
              type="button"
              onClick={exportToNote}
              disabled={doneCount === 0}
              className={`${btnGhost} inline-flex items-center gap-1.5`}
              title="Exportar los ítems completados a una nota"
            >
              <BookOpen className="w-3.5 h-3.5" /> Exportar resumen a Notas
            </button>
          </div>
        </div>
        <div className="h-1.5 bg-[#161616] rounded overflow-hidden">
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${(doneCount / total) * 100}%` }} />
        </div>
      </div>

      {/* banner rojo contraseña — regla dura de la fase Durante */}
      <div className={RED_BANNER_CLS} role="alert">
        Soporte NUNCA necesita la contraseña del usuario: si te la escriben por
        chat, no la uses, pídele que la cambie y NO la registres en el ticket.
        Nadie de IT debe pedirla jamás.
      </div>

      {/* fases */}
      {RA_PHASES.map((phase) => (
        <section key={phase.id} className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2" aria-label={phase.title}>
          <div className="flex items-center gap-2 pb-1 border-b border-[#1A1A1A]">
            <span className="text-blue-400 shrink-0">{phase.icon}</span>
            <span className="text-[11px] font-bold text-white">{phase.title}</span>
          </div>
          <p className="text-[10px] text-[#888]">{phase.intro}</p>
          <ul className="space-y-2">
            {phase.items.map((item) => (
              <li key={item.id} className="flex items-start gap-2.5">
                <input
                  id={`ra-${item.id}`}
                  type="checkbox"
                  checked={Boolean(done[item.id])}
                  onChange={() => toggle(item.id)}
                  className="mt-0.5 accent-blue-500 w-3.5 h-3.5 shrink-0 cursor-pointer"
                  aria-label={item.text}
                />
                <label
                  htmlFor={`ra-${item.id}`}
                  className={`text-[11px] leading-relaxed cursor-pointer ${done[item.id] ? 'text-[#888] line-through' : 'text-[#DDD]'}`}
                >
                  {item.text}
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* red flags */}
      <section className="space-y-2" aria-label="Señales de alerta">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-red-400">
          <ShieldAlert className="w-3.5 h-3.5" /> Señales de alerta — social engineering
        </div>
        {RED_FLAGS.map((rf) => (
          <div key={rf.id} className="border border-red-500/30 bg-red-500/5 rounded p-2.5 space-y-1 hover:border-red-500/50 transition-colors">
            <div className="text-[11px] font-bold text-red-400">{rf.title}</div>
            <p className="text-[10px] text-[#AAA] leading-relaxed">{rf.body}</p>
          </div>
        ))}
        <div className={RED_BANNER_CLS}>
          Cualquiera de estas señales → tratar como posible social engineering:
          detén la sesión, no confirmes ni niegues información interna y escala
          de inmediato a seguridad con el ticket y el registro de la petición.
        </div>
      </section>

      {addedToast && <InfoBanner>Añadido a Notas — crea una nota nueva para verlo.</InfoBanner>}
    </div>
  );
};

export default HdRemoteAssistTool;
