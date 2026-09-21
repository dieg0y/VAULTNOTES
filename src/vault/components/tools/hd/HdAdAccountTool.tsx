/**
 * HdAdAccountTool.tsx — "AD Account Troubleshooter" (FASE 2 grupo A).
 *
 * Árbol de decisión interactivo (síntomas clicables, NO wizard lineal) para
 * los 5 mensajes exactos que ve un usuario con problemas de cuenta de AD:
 * bloqueada / deshabilitada / contraseña caducada / credenciales incorrectas
 * / entra solo en un equipo (caché). Cada camino muestra: qué significa,
 * diferencias clave (bloqueo vs deshabilitado vs caducado), ≥5 comandos
 * PowerShell de referencia con explicación (CodeBlock + CopyBtn), checklist
 * de verificación previa (identidad vía callback a RRHH — nunca por el canal
 * entrante), sub-decisiones dentro del camino y cuándo escalar a IAM.
 *
 * SIMULADOR EDUCATIVO: esta tool NO se conecta a ningún AD real. 100%
 * offline, sin fetch/XHR/WebSocket/eval, sin persistencia.
 */
'use client';

import React, { useState } from 'react';
import {
  Lock, UserX, Clock, KeyRound, MonitorSmartphone, ArrowLeft, Terminal,
  ShieldAlert, AlertTriangle, ArrowRight, CheckSquare,
} from 'lucide-react';
import { btnGhost, CodeBlock, InfoBanner, ErrorBanner } from '../_shared';

/* ---------- tipos ---------- */

type PathId = 'locked' | 'disabled' | 'expired' | 'badcreds' | 'cachecreds';

interface AdCommand { cmd: string; why: string }
interface SubOption { label: string; guidance: string[] }

interface AdPath {
  id: PathId;
  label: string;
  icon: React.ReactNode;
  meaning: string[];
  commands: AdCommand[];
  preChecks: string[];
  subQ: { question: string; options: SubOption[] };
  escalateIam: string[];
}

/* ---------- tabla comparativa (compartida por los caminos) ---------- */

const DIFF_ROWS: Array<[string, string, string, string]> = [
  ['Bloqueada', 'Umbral de intentos fallidos (automático)', 'LockedOut=true + badPwdCount alto', 'Unlock-ADAccount + corregir el origen'],
  ['Deshabilitada', 'Acción administrativa / offboarding', 'Enabled=false, sin badPwdCount', 'Enable-ADAccount (tras validar con RRHH/IAM)'],
  ['Caducada', 'Edad máxima de la contraseña', 'PasswordExpired=true', 'Set-ADAccountPassword -Reset + cambio forzado'],
  ['Incorrecta (genérico)', 'Síntoma: hay que diagnosticar el estado', 'Cualquiera de los anteriores', 'Primero Get-ADUser, luego decidir'],
];

/** Fila de la tabla comparativa que corresponde a cada camino (para resaltarla). */
const DIFF_HIGHLIGHT: Record<PathId, number> = {
  locked: 0, disabled: 1, expired: 2, badcreds: 3, cachecreds: 3,
};

/* ---------- los 5 caminos ---------- */

const PATHS: AdPath[] = [
  {
    id: 'locked',
    label: 'Cuenta bloqueada',
    icon: <Lock className="w-4 h-4" />,
    meaning: [
      'El usuario superó el umbral de intentos fallidos (ej. 5 en 15 min) y la directiva de bloqueo cerró la cuenta automáticamente como protección.',
      'No lo decidió ninguna persona: la política actúa sola y se desbloquea manualmente o esperando el auto-unlock si existe.',
      'Bloqueada ≠ deshabilitada ≠ caducada: la cuenta sigue válida, solo está temporalmente cerrada por intentos fallidos.',
    ],
    commands: [
      { cmd: "Get-ADUser -Identity mlopez -Properties Enabled,LockedOut,badPwdCount,AccountLockoutTime,AccountExpirationDate", why: 'Estado completo: si está bloqueada ahora, cuántos intentos fallidos acumula y a qué hora se bloqueó.' },
      { cmd: 'Search-ADAccount -LockedOut', why: 'Listado de TODAS las cuentas bloqueadas del dominio: descarta un patrón masivo (ataque o cambio de contraseña global).' },
      { cmd: 'Unlock-ADAccount -Identity mlopez', why: 'Desbloquea la cuenta. Antes: identidad verificada y el badPwdCount anotado como evidencia en el ticket.' },
      { cmd: "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4740} -MaxEvents 10", why: 'El evento 4740 registra cada bloqueo CON el Caller Computer: dice desde qué equipo salieron los intentos fallidos.' },
      { cmd: 'Get-ADUser -Identity mlopez -Properties badPwdCount', why: 'Tras desbloquear y que el usuario reintente: si badPwdCount vuelve a subir, algo sigue enviando la contraseña vieja.' },
      { cmd: 'Set-ADAccountPassword -Identity mlopez -Reset', why: 'Solo si además hay contraseña olvidada: reset + cambio forzado en el próximo inicio de sesión.' },
    ],
    preChecks: [
      'Verificar la identidad del solicitante con devolución de llamada al número registrado en RRHH — NUNCA por el mismo canal del request (riesgo de social engineering).',
      'Anotar usuario, hora y badPwdCount ANTES de desbloquear (evidencia para el ticket).',
      'Comprobar que no hay offboarding abierto para esa cuenta: un bloqueo repetido en una cuenta en baja es una pista.',
    ],
    subQ: {
      question: '¿badPwdCount alto y el bloqueo es reincidente?',
      options: [
        {
          label: 'Sí, se bloquea una y otra vez',
          guidance: [
            'Busca el Caller Computer del evento 4740: casi siempre es el móvil o un segundo equipo con la contraseña vieja guardada.',
            'Corrige el ORIGEN: actualiza o borra las credenciales guardadas en ese equipo, o el usuario se volverá a bloquear en minutos.',
            'Si el Caller Computer es un equipo desconocido (ni del usuario ni inventariado), no lo desbloquees de nuevo: escala a IAM/SOC.',
          ],
        },
        {
          label: 'No, primera vez',
          guidance: [
            'Desbloquea, pide al usuario que reintente y observa si badPwdCount sube de nuevo.',
            'Si vuelve a bloquearse pronto, regresa a esta pregunta: el re-bloqueo casi siempre es un origen con credenciales cacheadas.',
          ],
        },
      ],
    },
    escalateIam: [
      'Bloqueos que reinciden aunque ya se haya corregido el origen visible.',
      'Patrón de bloqueos masivos o en cuentas de servicio (posible ataque o credential stuffing).',
      'Caller Computer desconocido o no inventariado en el evento 4740.',
    ],
  },
  {
    id: 'disabled',
    label: 'Cuenta deshabilitada',
    icon: <UserX className="w-4 h-4" />,
    meaning: [
      'Un administrador o un proceso de offboarding puso Enabled=false: la cuenta no se puede usar hasta rehabilitarla manualmente.',
      'Es un estado administrativo deliberado, no una reacción automática a intentos fallidos.',
      'Se diferencia del bloqueo en que aquí no hay badPwdCount que lo explique: fue una acción humana o de un proceso.',
    ],
    commands: [
      { cmd: 'Get-ADUser -Identity mlopez -Properties Enabled,AccountExpirationDate,LastLogonDate', why: 'Confirma Enabled=false y descarta que además esté caducada (los dos estados pueden coexistir).' },
      { cmd: 'Search-ADAccount -AccountDisabled', why: 'Cuentas deshabilitadas del dominio: contexto para saber si es una baja más o algo puntual.' },
      { cmd: 'Enable-ADAccount -Identity mlopez', why: 'Rehabilita la cuenta. SOLO tras confirmar con RRHH/IAM que la baja está cancelada o fue un error.' },
      { cmd: "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4726} -MaxEvents 5", why: 'El 4726 registra quién y cuándo deshabilitó la cuenta (incluye el nombre del operador).' },
      { cmd: 'Get-ADUser -Identity mlopez -Properties MemberOf,Description', why: 'Grupos y notas de la cuenta: si la Description apunta a offboarding, detente y valida por canal oficial.' },
      { cmd: "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4722} -MaxEvents 5", why: 'El 4722 acompaña al 4726: registra la rehabilitación de cuentas (traza inversa).' },
    ],
    preChecks: [
      'Verificar la identidad del solicitante con devolución de llamada al número registrado en RRHH — NUNCA por el mismo canal del request (riesgo de social engineering).',
      'Confirmar con RRHH que NO hay baja en curso: el offboarding abre exactamente este estado.',
      'Revisar el 4726 para saber quién deshabilitó y cuándo antes de rehabilitar nada.',
    ],
    subQ: {
      question: '¿Hay proceso de offboarding abierto para este usuario?',
      options: [
        {
          label: 'Sí (o no lo sé)',
          guidance: [
            'NO rehabilites la cuenta: un offboarding en curso que se revierte por teléfono es el patrón clásico de social engineering.',
            'Escala a IAM/RRHH para confirmar por canal oficial la cancelación de la baja antes de tocar nada.',
          ],
        },
        {
          label: 'No, error confirmado',
          guidance: [
            'Confirma con RRHH la vigencia del contrato y que la deshabilitación fue un error.',
            'Rehabilita con Enable-ADAccount y deja en el ticket quién autorizó la rehabilitación.',
          ],
        },
      ],
    },
    escalateIam: [
      'Deshabilitación sin baja asociada ni trazabilidad (nadie sabe quién la deshabilitó).',
      'Cuentas de servicio deshabilitadas: afectan a aplicaciones, no a personas.',
      'Rehabilitación solicitada mientras un offboarding sigue en curso.',
    ],
  },
  {
    id: 'expired',
    label: 'La contraseña ha caducado',
    icon: <Clock className="w-4 h-4" />,
    meaning: [
      'La contraseña superó su edad máxima (ej. 90 días) y AD exige cambiarla en el próximo inicio de sesión.',
      'Si el usuario no puede completar el cambio (VPN, RDP o equipo viejo sin diálogo de cambio), queda fuera hasta un reset.',
      'Caducada ≠ bloqueada: la cuenta sigue habilitada; es solo la contraseña la que expiró.',
    ],
    commands: [
      { cmd: 'Get-ADUser -Identity mlopez -Properties Enabled,LockedOut,PasswordExpired,PasswordLastSet', why: 'PasswordExpired=true con LockedOut=false confirma el diagnóstico exacto y la fecha del último cambio.' },
      { cmd: 'Search-ADAccount -PasswordExpired', why: 'Todas las cuentas con contraseña caducada: si aparecen muchas a la vez, sospecha de directiva recién aplicada.' },
      { cmd: "Set-ADAccountPassword -Identity mlopez -Reset -NewPassword (Read-Host 'Nueva contraseña temporal' -AsSecureString)", why: 'Resetea a una contraseña temporal que tú introduces de forma segura (nunca la pidas por chat ni la dictes por teléfono).' },
      { cmd: 'Set-ADUser -Identity mlopez -ChangePasswordAtLogon $true', why: 'Fuerza el cambio en el próximo inicio: la temporal nunca queda como contraseña definitiva.' },
      { cmd: "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4724} -MaxEvents 5", why: 'El 4724 registra los resets de contraseña: quién lo hizo y cuándo (auditoría de tu propia acción).' },
      { cmd: 'net user mlopez /domain', why: 'Vista rápida clásica (corre en PowerShell): muestra cuándo expira y se cambió por última vez.' },
    ],
    preChecks: [
      'Verificar la identidad del solicitante con devolución de llamada al número registrado en RRHH — NUNCA por el mismo canal del request (riesgo de social engineering).',
      'Confirmar que es el propio usuario: el clásico BEC pide resets de contraseñas ajenas por correo o chat.',
      'Preguntar si ya probó el cambio en el propio inicio de sesión (a veces solo hace falta acompañarlo).',
    ],
    subQ: {
      question: '¿El usuario está registrado en SSPR?',
      options: [
        {
          label: 'Sí, registrado',
          guidance: [
            'El autoservicio es la vía correcta: el usuario se resetea solo y el ticket se cierra como autoservicio resuelto.',
            'Si SSPR falla (registro incompleto o sin métodos válidos), haz el reset manual y anota que debe completar el registro.',
          ],
        },
        {
          label: 'No / no lo sé',
          guidance: [
            'Haz el reset manual tras la verificación de identidad por callback.',
            'Al resolver, registra SSPR con el usuario: el próximo caducado lo resolverá él mismo.',
          ],
        },
      ],
    },
    escalateIam: [
      'Caducidades masivas tras un cambio de directiva (edad máxima mal calibrada).',
      'Entorno híbrido: la contraseña nueva no se escribe de vuelta a AD (password writeback).',
    ],
  },
  {
    id: 'badcreds',
    label: 'Su cuenta o contraseña es incorrecta',
    icon: <KeyRound className="w-4 h-4" />,
    meaning: [
      'El error genérico de credenciales: puede ser contraseña mal escrita, caducada, cuenta bloqueada o deshabilitada… o un problema del equipo.',
      'Windows muestra este texto aunque la causa real sea otra: el mensaje NO es un diagnóstico.',
      'El primer trabajo es averiguar qué estado tiene la cuenta antes de decidir la acción.',
    ],
    commands: [
      { cmd: 'Get-ADUser -Identity mlopez -Properties Enabled,LockedOut,badPwdCount,PasswordExpired', why: 'Descarta los cuatro estados en un solo comando: habilitada, bloqueada, caducada o acumulando intentos fallidos.' },
      { cmd: "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625} -MaxEvents 10", why: 'Cada 4625 es un inicio de sesión fallido con su motivo (contraseña errónea vs cuenta bloqueada) y el equipo de origen.' },
      { cmd: "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4771} -MaxEvents 10", why: 'Fallo de pre-autenticación Kerberos: complemento del 4625 cuando el equipo usa Kerberos (revela el servicio implicado).' },
      { cmd: 'Test-NetConnection dc01.nexora.local -Port 88', why: 'Kerberos (puerto 88) accesible desde tu equipo: descarta un DC caído antes de culpar al usuario.' },
      { cmd: 'Search-ADAccount -LockedOut | Where-Object SamAccountName -eq mlopez', why: 'Confirmación rápida de si el usuario ya cruzó el umbral y está bloqueado (el error que él ve puede no decirlo).' },
      { cmd: 'Set-ADAccountPassword -Identity mlopez -Reset', why: 'Solo si el estado apunta a contraseña olvidada: nunca como primera respuesta al error genérico.' },
    ],
    preChecks: [
      'Verificar la identidad del solicitante con devolución de llamada al número registrado en RRHH — NUNCA por el mismo canal del request (riesgo de social engineering).',
      'Preguntar si el error aparece con la contraseña nueva o con la vieja (delata caché de un segundo equipo).',
      'Descartar lo mundano: mayúsculas, Bloq Mayús, teclado en otro idioma, usuario mal escrito.',
    ],
    subQ: {
      question: '¿El error le sale a más usuarios o solo a uno?',
      options: [
        {
          label: 'Solo a un usuario',
          guidance: [
            'Sigue el diagnóstico individual: estado de cuenta, 4625, teclado e idioma.',
            'Prueba a validar la cuenta desde otro equipo o desde OWA: separa el problema del usuario del de la estación.',
          ],
        },
        {
          label: 'A varios usuarios',
          guidance: [
            'Sospecha de servicio (DC, DNS o autenticación) antes que de usuarios: varios incorrecta simultáneos rara vez son personas.',
            'Conviértelo en P1 (multiusuario), comprueba la salud del DC/DNS interno y escala a L2-Infra/IAM.',
          ],
        },
      ],
    },
    escalateIam: [
      'Fallos de autenticación masivos (posible caída de DC o Kerberos).',
      'Cuenta que no valida pese a estado correcto y contraseña recién reseteada (sincronización híbrida).',
    ],
  },
  {
    id: 'cachecreds',
    label: 'No puedo entrar solo en un equipo',
    icon: <MonitorSmartphone className="w-4 h-4" />,
    meaning: [
      'La cuenta funciona en otros equipos y en la web pero falla en UNO: ese equipo guarda credenciales viejas (Administrador de credenciales, apps) o su canal seguro con el dominio está roto.',
      'Es un problema LOCAL del equipo, no de la cuenta: resetear la contraseña no lo arregla.',
      'Causa típica: tras un cambio de contraseña, el equipo viejo sigue enviando la anterior y termina bloqueando la cuenta.',
    ],
    commands: [
      { cmd: 'cmdkey /list', why: 'Enumera las credenciales guardadas en ese equipo (TERMSRV, dominio, genéricas): la lista casi siempre delata al culpable.' },
      { cmd: 'klist purge', why: 'Borra los tickets Kerberos cacheados del usuario en ese equipo (se vuelven a solicitar al validar).' },
      { cmd: 'rundll32.exe keymgr.dll,KRShowKeyMgr', why: 'Abre el gestor de credenciales clásico para revisar y borrar entradas de forma visual.' },
      { cmd: "Get-WinEvent -ComputerName LT-0432 -FilterHashtable @{LogName='Security'; Id=4625} -MaxEvents 10", why: 'Lee en remoto los inicios fallidos de ESE equipo: verás la contraseña vieja rebotando contra el DC.' },
      { cmd: 'Test-ComputerSecureChannel -Repair', why: 'Repara el canal seguro equipo-dominio si el equipo perdió la confianza (clásico: la relación de confianza ha fallado).' },
      { cmd: 'Get-ADUser -Identity mlopez -Properties LockedOut', why: 'Comprueba si los reintentos automáticos de ese equipo ya bloquearon la cuenta en el dominio.' },
    ],
    preChecks: [
      'Verificar la identidad del solicitante con devolución de llamada al número registrado en RRHH — NUNCA por el mismo canal del request (riesgo de social engineering).',
      'Confirmar que la cuenta SÍ funciona en web u otro equipo: ese dato define este camino.',
      'Identificar el hostname del equipo afectado (para leer sus eventos en remoto).',
    ],
    subQ: {
      question: '¿El error menciona la relación de confianza o falla solo la contraseña?',
      options: [
        {
          label: 'Menciona la relación de confianza',
          guidance: [
            'Test-ComputerSecureChannel -Repair resuelve la mayoría de los casos: revalida la cuenta de equipo contra el DC.',
            'Si el repair falla, sacar y volver a unir el equipo al dominio (con aprobación de L2).',
          ],
        },
        {
          label: 'Solo falla la contraseña',
          guidance: [
            'Limpia cmdkey /list, klist purge y las credenciales guardadas del navegador y apps de ese equipo.',
            'Reintenta con la contraseña nueva y vigila badPwdCount: si sube, algo más sigue guardando la vieja (móvil incluido).',
          ],
        },
      ],
    },
    escalateIam: [
      'Cuentas de equipo cuyo canal seguro falla el repair repetidamente.',
      'Patrón de varios equipos con credenciales cacheadas tras un cambio de contraseña global.',
    ],
  },
];

/* ---------- subcomponentes ---------- */

const H3: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#555]">{children}</div>
);

/* ---------- componente principal ---------- */

export const HdAdAccountTool: React.FC = () => {
  const [path, setPath] = useState<PathId | null>(null);
  const [subChoice, setSubChoice] = useState<number | null>(null);

  const current = PATHS.find((p) => p.id === path) ?? null;

  const choose = (id: PathId): void => { setPath(id); setSubChoice(null); };

  return (
    <div className="space-y-3">
      <InfoBanner>
        Simulador educativo — estos comandos son de referencia. Esta tool NO se
        conecta a ningún AD real. Sustituye mlopez / LT-0432 / nexora.local por
        los valores reales de tu entorno cuando practiques.
      </InfoBanner>

      {/* Paso 1: selección del síntoma exacto */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
        <H3>Paso 1 — ¿Qué mensaje EXACTO ve el usuario?</H3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PATHS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => choose(p.id)}
              aria-label={`Camino: ${p.label}`}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded border text-left transition-colors cursor-pointer ${
                path === p.id
                  ? 'bg-blue-500/10 border-blue-500/60 text-white'
                  : 'bg-[#161616] border-[#262626] text-[#DDD] hover:border-blue-500/40'
              }`}
            >
              <span className={path === p.id ? 'text-blue-400' : 'text-[#888]'}>{p.icon}</span>
              <span className="text-xs font-semibold">“{p.label}”</span>
              <ArrowRight className="w-3 h-3 ml-auto text-[#555]" />
            </button>
          ))}
        </div>
      </div>

      {/* Camino elegido */}
      {current && (
        <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#1A1A1A]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-blue-400 shrink-0">{current.icon}</span>
              <span className="text-xs font-bold text-white truncate">“{current.label}”</span>
            </div>
            <button
              type="button"
              onClick={() => { setPath(null); setSubChoice(null); }}
              className={`${btnGhost} inline-flex items-center gap-1.5 shrink-0`}
              title="Volver a la selección de síntomas"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Cambiar mensaje
            </button>
          </div>

          {/* Qué significa */}
          <div className="space-y-1.5">
            <H3>Qué significa</H3>
            {current.meaning.map((m, i) => (
              <p key={i} className="text-[11px] text-[#AAA] leading-relaxed">{m}</p>
            ))}
          </div>

          {/* Diferencias clave */}
          <div className="space-y-1.5">
            <H3>Diferencias clave: bloqueo vs deshabilitado vs caducado</H3>
            <div className="overflow-x-auto border border-[#262626] rounded">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="bg-[#161616] text-[#888] uppercase">
                    <th className="px-2 py-1.5 text-left">Estado</th>
                    <th className="px-2 py-1.5 text-left">Qué lo causa</th>
                    <th className="px-2 py-1.5 text-left">Cómo se ve</th>
                    <th className="px-2 py-1.5 text-left">Corrección</th>
                  </tr>
                </thead>
                <tbody>
                  {DIFF_ROWS.map((r, i) => (
                    <tr key={r[0]} className={`border-t border-[#1A1A1A] ${DIFF_HIGHLIGHT[current.id] === i ? 'bg-blue-500/5' : ''}`}>
                      <td className="px-2 py-1.5 text-white">{r[0]}</td>
                      <td className="px-2 py-1.5 text-[#AAA]">{r[1]}</td>
                      <td className="px-2 py-1.5 text-[#AAA]">{r[2]}</td>
                      <td className="px-2 py-1.5 text-[#AAA]">{r[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Verificación previa: identidad por callback */}
          <div className="space-y-1.5">
            <H3>Checklist de verificación previa</H3>
            <ErrorBanner message="Riesgo de social engineering: verifica SIEMPRE con devolución de llamada al número registrado en RRHH. Nunca actúes solo por el canal entrante (email, chat o llamada)." />
            <ul className="space-y-1">
              {current.preChecks.map((c, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <CheckSquare className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-[11px] text-[#AAA] leading-relaxed">{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Comandos PowerShell */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#555]">
              <Terminal className="w-3 h-3" />
              Comandos PowerShell de referencia ({current.commands.length})
            </div>
            {current.commands.map((c, i) => (
              <div key={i} className="space-y-1">
                <CodeBlock code={c.cmd} lang="powershell" label={`Paso ${i + 1}`} />
                <p className="text-[10px] text-[#888] leading-relaxed pl-1">{c.why}</p>
              </div>
            ))}
          </div>

          {/* Sub-decisión */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#555]">
              <AlertTriangle className="w-3 h-3" />
              Sub-decisión dentro del camino
            </div>
            <p className="text-[11px] text-white font-semibold">{current.subQ.question}</p>
            <div className="flex flex-wrap gap-2">
              {current.subQ.options.map((o, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSubChoice(subChoice === i ? null : i)}
                  aria-label={o.label}
                  className={`px-3 py-1.5 rounded border text-[11px] font-semibold transition-colors cursor-pointer ${
                    subChoice === i
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'bg-[#161616] border-[#262626] text-[#DDD] hover:border-blue-500/40'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {subChoice !== null && (
              <ul className="space-y-1 bg-[#161616] border border-[#262626] rounded p-2.5">
                {current.subQ.options[subChoice].guidance.map((g, i) => (
                  <li key={i} className="text-[11px] text-[#AAA] flex gap-1.5">
                    <span className="text-blue-400">▸</span>
                    {g}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Escalación a IAM */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#555]">
              <ShieldAlert className="w-3 h-3" />
              Cuándo escalar a IAM
            </div>
            <ul className="space-y-1">
              {current.escalateIam.map((e, i) => (
                <li key={i} className="text-[11px] text-[#AAA] flex gap-1.5">
                  <span className="text-blue-400">▸</span>
                  {e}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default HdAdAccountTool;
