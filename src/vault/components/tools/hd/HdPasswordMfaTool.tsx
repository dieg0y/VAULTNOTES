/**
 * HdPasswordMfaTool.tsx — "Password & MFA Reset Runbook" (FASE 2 grupo A).
 *
 * Runbook de 4 fases (Tabs) para reset de contraseña / MFA con verificación
 * de identidad segura:
 *   FASE 1 Verificación de identidad (callback a RRHH, 2 fuentes, rechazo de
 *   peticiones entrantes — banner rojo de social engineering/BEC, sin
 *   offboarding abierto).
 *   FASE 2 Password reset (ADUC + Set-ADAccountPassword -Reset + cambio
 *   forzado en el próximo inicio) con comprobaciones post-reset (móvil,
 *   Outlook, VPN, segunda app con credenciales guardadas — causa nº1 de
 *   re-bloqueo — y SSPR).
 *   FASE 3 Reset MFA (revocar sesiones/tokens, re-registro de Authenticator,
 *   verificación reforzada) con el banner de seguridad del atacante que
 *   llama fingiendo ser soporte para que TÚ le resetees el MFA.
 *   FASE 4 Evidencia para el ticket.
 *
 * Barra de progreso (checkboxes / total), botón reset y [Exportar resumen a
 * Notas]. Estado local React (NO se persiste). 100% offline.
 */
'use client';

import React, { useState } from 'react';
import {
  ShieldCheck, KeyRound, Smartphone, FileText, RotateCcw, BookOpen, AlertTriangle,
} from 'lucide-react';
import { useNoteStore } from '../../../store/noteStore';
import {
  btnPrimary, btnGhost, CodeBlock, ErrorBanner, InfoBanner, Tabs,
  buildNoteHtmlTable, useAddToNoteToast,
} from '../_shared';
import { escapeHtml } from '../../../utils/escapeHtml';

/* ---------- tipos y datos del runbook ---------- */

interface Phase {
  id: string;
  n: number;
  title: string;
  icon: React.ReactNode;
  intro: string;
  steps: Array<{ text: string; command?: string; commandWhy?: string }>;
  checks: string[];
  banner?: 'social' | 'mfa-attacker';
}

const PHASES: Phase[] = [
  {
    id: 'f1',
    n: 1,
    title: 'Verificación de identidad',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    intro: 'Nunca toques una cuenta sin verificar quién pide el cambio. Un reset concedido a la persona equivocada entrega la cuenta al atacante: la verificación ES el control de seguridad.',
    steps: [],
    checks: [
      'Devolución de llamada completada al número REGISTRADO en RRHH (nunca a un número que dé el propio solicitante).',
      'Datos del usuario contrastados contra 2 fuentes independientes (RRHH + responsable del área).',
      'Confirmado que la petición no llega SOLO por un canal entrante (email/chat): siempre callback.',
      'Confirmado que NO hay proceso de offboarding abierto para el usuario.',
    ],
    banner: 'social',
  },
  {
    id: 'f2',
    n: 2,
    title: 'Password reset',
    icon: <KeyRound className="w-3.5 h-3.5" />,
    intro: 'Reset en AD + cambio forzado en el próximo inicio. La contraseña temporal nunca se dicta por el canal de la petición y nunca queda como definitiva.',
    steps: [
      {
        text: 'ADUC (Usuarios y equipos de Active Directory): clic derecho sobre el usuario > Restablecer contraseña, marcando "El usuario debe cambiar la contraseña en el próximo inicio de sesión".',
      },
      {
        text: 'Por PowerShell (equivalente y trazable):',
        command: "Set-ADAccountPassword -Identity mlopez -Reset -NewPassword (Read-Host 'Nueva contraseña temporal' -AsSecureString)",
        commandWhy: 'La contraseña temporal se introduce de forma segura, nunca por chat ni dictada por teléfono.',
      },
      {
        text: 'Forzar el cambio en el primer inicio:',
        command: 'Set-ADUser -Identity mlopez -ChangePasswordAtLogon $true',
        commandWhy: 'El usuario debe cambiarla en el próximo inicio: la temporal no es definitiva.',
      },
      {
        text: 'Lista de comprobaciones post-reset (móvil, Outlook, VPN y cualquier app con credenciales guardadas). Si SSPR no está registrado, completarlo con el usuario antes de cerrar.',
      },
    ],
    checks: [
      'Móvil actualizado: app de correo con la contraseña nueva.',
      'Outlook probado en el equipo principal.',
      'VPN probada con la nueva contraseña.',
      'Segunda app / segundo equipo con credenciales guardadas actualizados (causa nº1 de re-bloqueo).',
      'SSPR verificado (o registrado ahora si no lo tenía).',
    ],
  },
  {
    id: 'f3',
    n: 3,
    title: 'Reset MFA',
    icon: <Smartphone className="w-3.5 h-3.5" />,
    intro: 'Aplica solo si la petición es de MFA. El orden importa: primero revocar sesiones/tokens, luego re-registrar, y siempre con verificación reforzada.',
    steps: [
      {
        text: 'Revocar las sesiones y tokens activos del usuario (invalidar refresh tokens): corta el acceso de cualquier sesión ya abierta por un atacante.',
        command: 'Revoke-AzureADUserAllRefreshToken -ObjectId mlopez@nexora.com',
        commandWhy: 'Conceptual/entorno Entra: invalida los refresh tokens activos para que TODAS las sesiones tengan que re-autenticarse.',
      },
      {
        text: 'Pedir al usuario re-registrar Microsoft Authenticator desde el portal de seguridad (aka.ms/mfasetup) y marcar Authenticator como método predeterminado.',
      },
      {
        text: 'Pase de acceso temporal (TAP) SOLO si tu política lo permite, con duración mínima y anotado en el ticket.',
      },
      {
        text: 'Acompañar el primer login de extremo a extremo y verificar que el método nuevo funciona antes de cerrar.',
      },
    ],
    checks: [
      'Sesiones/tokens activos revocados ANTES del re-registro.',
      'Re-registro de Microsoft Authenticator hecho CON el usuario verificado (no con datos que dio el solicitante).',
      'Verificación reforzada aplicada: callback + confirmación del responsable (o verificación presencial).',
      'Login de extremo a extremo verificado con el usuario.',
    ],
    banner: 'mfa-attacker',
  },
  {
    id: 'f4',
    n: 4,
    title: 'Evidencia para el ticket',
    icon: <FileText className="w-3.5 h-3.5" />,
    intro: 'La evidencia es tu defensa: si la cuenta se compromete después, un registro de verificación completo distingue un procedimiento correcto de una fuga por social engineering.',
    steps: [],
    checks: [
      'Hora de apertura y hora de cada acción (reset, revocación, re-registro).',
      'Canal de verificación y número al que se devolvió la llamada.',
      'Interlocutor: nombre y las 2 fuentes contrastadas.',
      'Acciones realizadas, con comandos/sistemas usados.',
      'Confirmación del usuario de que ya puede acceder.',
      'Escalado (si lo hubo): a quién, a qué hora y por qué motivo.',
    ],
  },
];

/* ---------- banners de seguridad ---------- */

const SecurityBanner: React.FC<{ kind: 'social' | 'mfa-attacker' }> = ({ kind }) =>
  kind === 'social' ? (
    <ErrorBanner message="RIESGO DE SOCIAL ENGINEERING / BEC: nunca aceptes un reset solicitado solo por un email o chat entrante. El atacante imita al usuario con prisa y autoridad. Verifica SIEMPRE devolviendo la llamada al número registrado en RRHH." />
  ) : (
    <ErrorBanner message="CASO CONCRETO DE ATAQUE: el atacante llama fingiendo ser el usuario (o incluso 'soporte') presionando para que TÚ le resetees el MFA. Si el MFA se re-registra en su móvil, la cuenta queda en su poder aunque cambies la contraseña. Para resets de MFA: verificación reforzada obligatoria (callback + responsable o presencial)." />
  );

/* ---------- subcomponente: fila de checklist ---------- */

const CheckRow: React.FC<{ id: string; text: string; done: boolean; onToggle: (id: string) => void }> = ({ id, text, done, onToggle }) => (
  <label className="flex items-start gap-2 cursor-pointer group py-0.5" htmlFor={id}>
    <input
      id={id}
      type="checkbox"
      checked={done}
      onChange={() => onToggle(id)}
      className="mt-0.5 w-3.5 h-3.5 accent-blue-500 cursor-pointer shrink-0"
    />
    <span className={`text-[11px] leading-relaxed transition-colors ${done ? 'text-[#666] line-through' : 'text-[#AAA] group-hover:text-white'}`}>
      {text}
    </span>
  </label>
);

/* ---------- componente principal ---------- */

export const HdPasswordMfaTool: React.FC = () => {
  const [phase, setPhase] = useState('f1');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const { addedToast, showToast } = useAddToNoteToast();

  const allChecks: Array<{ key: string; phase: Phase; text: string }> = [];
  for (const ph of PHASES) {
    ph.checks.forEach((c, i) => allChecks.push({ key: `${ph.id}-${i}`, phase: ph, text: c }));
  }
  const total = allChecks.length;
  const done = allChecks.filter((c) => checks[c.key]).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const toggle = (id: string): void => {
    setChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const reset = (): void => setChecks({});

  const exportToNote = (): void => {
    const rows: Array<[string, string]> = [
      ['Runbook', 'Password & MFA Reset'],
      ['Progreso', escapeHtml(`${done}/${total} ítems completados`)],
    ];
    for (const ph of PHASES) {
      const completed = ph.checks.filter((_, i) => checks[`${ph.id}-${i}`]);
      if (completed.length > 0) {
        for (const c of completed) {
          rows.push([`Fase ${ph.n} · ${ph.title}`, escapeHtml(c)]);
        }
      }
    }
    if (done === 0) {
      rows.push(['Estado', escapeHtml('Sin ítems completados todavía.')]);
    }
    useNoteStore.getState().enqueueNote('Reset Runbook — Resumen', buildNoteHtmlTable(rows));
    showToast();
  };

  const current = PHASES.find((p) => p.id === phase) ?? PHASES[0];

  return (
    <div className="space-y-3">
      <InfoBanner>
        Runbook educativo de referencia. Los comandos son ilustrativos y esta
        tool no ejecuta nada ni se conecta a ningún sistema: adáptalo a la
        política real de tu empresa. Estado local — nada se guarda al salir.
      </InfoBanner>

      {/* Barra de progreso */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
            Progreso del runbook
          </span>
          <span className="text-[11px] font-mono text-white">{done}/{total} ítems · {pct}%</span>
        </div>
        <div className="h-1.5 bg-[#161616] border border-[#262626] rounded overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso del runbook">
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <Tabs
        tabs={PHASES.map((p) => ({ id: p.id, label: `Fase ${p.n} · ${p.title}`, icon: p.icon }))}
        active={phase}
        onChange={setPhase}
      />

      {/* Fase activa */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#1A1A1A]">
          <span className="text-blue-400">{current.icon}</span>
          <span className="text-xs font-bold text-white">FASE {current.n} — {current.title}</span>
        </div>

        <p className="text-[11px] text-[#AAA] leading-relaxed">{current.intro}</p>

        {current.banner && <SecurityBanner kind={current.banner} />}

        {current.banner === 'social' && (
          <p className="text-[10px] text-amber-400 flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            El mismo canal del request es el canal del atacante: email y chat entrantes no verifican nada.
          </p>
        )}

        {current.steps.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Pasos</div>
            <ol className="space-y-2">
              {current.steps.map((s, i) => (
                <li key={i} className="space-y-1">
                  <div className="flex gap-2 items-start">
                    <span className="text-[10px] font-mono text-blue-400 shrink-0 mt-0.5">{i + 1}.</span>
                    <span className="text-[11px] text-[#AAA] leading-relaxed">{s.text}</span>
                  </div>
                  {s.command && (
                    <div className="pl-5 space-y-1">
                      <CodeBlock code={s.command} lang="powershell" />
                      {s.commandWhy && <p className="text-[10px] text-[#888] leading-relaxed">{s.commandWhy}</p>}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {current.checks.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
              Checklist ({current.checks.filter((_, i) => checks[`${current.id}-${i}`]).length}/{current.checks.length})
            </div>
            <div className="bg-[#161616] border border-[#262626] rounded p-2.5">
              {current.checks.map((c, i) => (
                <CheckRow key={`${current.id}-${i}`} id={`${current.id}-${i}`} text={c} done={Boolean(checks[`${current.id}-${i}`])} onToggle={toggle} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={exportToNote} className={`${btnPrimary} inline-flex items-center gap-1.5`} title="Exportar el resumen de ítems completados a Notas">
          <BookOpen className="w-3.5 h-3.5" /> Exportar resumen a Notas
        </button>
        <button type="button" onClick={reset} className={`${btnGhost} inline-flex items-center gap-1.5`} title="Reiniciar todos los checkboxes del runbook">
          <RotateCcw className="w-3.5 h-3.5" /> Reiniciar checklist
        </button>
      </div>

      {addedToast && <InfoBanner>Añadido a Notas — crea o elige una nota para verlo.</InfoBanner>}
    </div>
  );
};

export default HdPasswordMfaTool;
