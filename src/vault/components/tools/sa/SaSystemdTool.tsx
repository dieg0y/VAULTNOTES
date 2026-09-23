'use client';

/**
 * SaSystemdTool.tsx — Constructor de units de systemd (.service / .timer).
 * Genera en vivo (100% offline, educativo): el .service completo con
 * comentarios línea por línea (ExecStart, User, Environment, Restart,
 * hardening), el .timer asociado (OnCalendar, OnBootSec, RandomizedDelaySec,
 * Unit=, Persistent), la secuencia de despliegue (cp → daemon-reload →
 * enable --now → status → journalctl + list-timers), una tabla interactiva
 * de directivas generadas y 3 presets completos.
 *
 * NOTA TÉCNICA: los comentarios en unit files van en líneas PROPIAS —
 * systemd NO admite comentarios al final de una directiva (el texto se
 * interpretaría como parte del valor).
 */
import React, { useMemo, useState } from 'react';
import { Cog, Clock, ShieldCheck, AlertTriangle, FileText, Info, Server } from 'lucide-react';
import {
  inputCls, taCls, btnGhost, btnPrimary, Field, CodeBlock, ErrorBanner, InfoBanner,
  Tabs, buildNoteHtmlTable, useAddToNoteToast,
} from '../_shared';
import { useNoteStore } from '../../../store/noteStore';
import { escapeHtml } from '../../../utils/escapeHtml';

type UnitKind = 'service' | 'timer';
type RestartPolicy = 'no' | 'on-failure' | 'always' | 'on-abnormal';
type ServiceType = 'simple' | 'exec' | 'forking' | 'oneshot';
type ProtectSystemMode = 'off' | 'full' | 'strict';

interface UnitForm {
  name: string;
  kind: UnitKind;
  description: string;
  serviceType: ServiceType;
  execStart: string;
  user: string;
  workingDir: string;
  envText: string;
  restart: RestartPolicy;
  restartSec: string;
  noNewPrivileges: boolean;
  protectSystem: ProtectSystemMode;
  protectHome: boolean;
  privateTmp: boolean;
  restrictSUIDSGID: boolean;
  after: string;
  onCalendar: string;
  onBootSec: string;
  randomizedDelaySec: string;
  unitLink: string;
  persistent: boolean;
}

const INITIAL: UnitForm = {
  name: 'miapp', kind: 'service', description: 'Servicio miapp de ejemplo', serviceType: 'simple',
  execStart: '/usr/local/bin/miapp --config /etc/miapp.conf', user: '', workingDir: '',
  envText: 'MIAPP_ENTORNO=produccion', restart: 'on-failure', restartSec: '5',
  noNewPrivileges: true, protectSystem: 'full', protectHome: true, privateTmp: true,
  restrictSUIDSGID: false, after: 'network-online.target', onCalendar: '02:00', onBootSec: '',
  randomizedDelaySec: '10min', unitLink: '', persistent: true,
};

const PRESETS: { label: string; icon: React.ReactNode; form: UnitForm }[] = [
  {
    label: 'Web (estilo nginx)', icon: <Server className="w-3 h-3" />,
    form: { ...INITIAL, name: 'miapp-web', description: 'Servidor web frontal estilo nginx', serviceType: 'exec',
      execStart: '/usr/local/bin/webserver --config /etc/miapp/web.conf', user: 'www-data', workingDir: '/var/www/miapp',
      envText: 'WORKERS=4', restart: 'always', protectSystem: 'strict', restrictSUIDSGID: true },
  },
  {
    label: 'Respaldo diario (timer)', icon: <Clock className="w-3 h-3" />,
    form: { ...INITIAL, name: 'respaldo-diario', kind: 'timer', description: 'Respaldo diario de datos hacia /backup',
      serviceType: 'oneshot', execStart: '/usr/local/sbin/backup.sh', user: 'backup', envText: 'DESTINO=/backup\nRETENER_DIAS=14',
      restart: 'no', randomizedDelaySec: '15min' },
  },
  {
    label: 'Agente endurecido', icon: <ShieldCheck className="w-3 h-3" />,
    form: { ...INITIAL, name: 'agente-interno', description: 'Agente interno con hardening completo', serviceType: 'exec',
      execStart: '/opt/agente/bin/agente --modo daemon', user: 'agente', workingDir: '/opt/agente',
      envText: 'AGENTE_ENTORNO=produccion\nLOG_LEVEL=info', restartSec: '10', protectSystem: 'strict', restrictSUIDSGID: true },
  },
];

const RESTART_DOCS: Record<RestartPolicy, string> = {
  'no': 'Nunca se reinicia (default). Adecuado para oneshot y tareas de una sola ejecución.',
  'on-failure': 'Reinicia solo si el proceso termina con código distinto de 0, señal o timeout. El estándar para demonios que fallan esporádicamente.',
  'always': 'Reinicia siempre que el proceso termina, incluso con exit 0. Para demonios de larga vida (webs, agentes, colas).',
  'on-abnormal': 'Reinicia solo por señal o timeout, NO por códigos de salida. Para servicios que se apagan limpiamente con exit 0 y no deben revivir.',
};

const SERVICE_TYPE_DOCS: Record<ServiceType, string> = {
  simple: 'Default: systemd considera el servicio iniciado apenas hace fork del ExecStart.',
  exec: 'Más estricto que simple: espera a que el binario se ejecute de verdad (falla si el exec falla).',
  forking: 'El proceso daemoniza: systemd espera que el padre salga y sigue al hijo (PIDFile recomendado).',
  oneshot: 'Corre una vez y termina; la unit pasa a inactive (dead). Ideal para scripts (respaldos, migraciones).',
};

const CALENDAR_PRESETS: { label: string; value: string; desc: string }[] = [
  { label: 'Diario 02:00', value: '02:00', desc: 'todos los días a las 02:00' },
  { label: 'Semanal dom 03:00', value: 'Sun *-*-* 03:00', desc: 'domingos a las 03:00' },
  { label: 'Cada 15 min', value: '*:0/15', desc: 'al minuto 0, 15, 30 y 45 de cada hora' },
  { label: 'Mensual día 1', value: '*-*-01 01:00', desc: 'día 1 de cada mes a la 01:00' },
  { label: 'Lunes a viernes', value: 'Mon..Fri 06:30', desc: 'días hábiles a las 06:30' },
];

/** Documentación de una línea por directiva (se muestran SOLO las generadas). */
const DIRECTIVE_DOCS: Record<string, string> = {
  Description: 'Descripción visible en systemctl status y en el journal — documenta para tu yo futuro.',
  After: 'ORDENA el arranque: esta unit se inicia después de las listadas (no las activa por sí sola).',
  Wants: 'ACTIVA las units listadas además de la propia — el complemento necesario de After para dependencias.',
  Type: 'Cómo detecta systemd que el servicio arrancó: simple, exec, forking (daemoniza) u oneshot (corre y termina).',
  ExecStart: 'Comando principal: ruta ABSOLUTA, sin shell (usa /bin/sh -c solo si necesitas pipes o redirecciones).',
  User: 'Cuenta con la que corre el proceso; vacío = root. Un usuario dedicado minimiza el impacto de una falla.',
  WorkingDirectory: 'Directorio de trabajo del proceso: las rutas relativas del ExecStart se resuelven aquí.',
  Environment: 'Variables KEY=VALUE inyectadas al proceso (una directiva por línea).',
  Restart: 'Cuándo relanza systemd el proceso tras terminar: no, on-failure, always u on-abnormal.',
  RestartSec: 'Segundos de espera entre la muerte del proceso y su relanzamiento — evita bucles de reinicio.',
  NoNewPrivileges: 'El proceso y sus hijos no pueden ganar privilegios vía setuid/sudo — bloquea escaladas desde el servicio.',
  ProtectSystem: 'Monta jerarquías del SO read-only: full protege /usr /boot /etc; strict hace read-only TODO el filesystem.',
  ProtectHome: 'Oculta /home, /root y /run/user al proceso — evita leer datos de usuarios.',
  PrivateTmp: '/tmp y /var/tmp se montan como tmpfs PRIVADO del servicio — sin colisiones ni ataques de symlinks en /tmp.',
  RestrictSUIDSGID: 'El filesystem se remonta ignorando los bits SUID/SGID — los binarios setuid no funcionan aquí.',
  WantedBy: 'enable crea un enlace simbólico dentro de ese target: así la unit se activa en cada arranque.',
  OnCalendar: 'Expresión de calendario que define cuándo dispara el timer (valida con systemd-analyze calendar).',
  OnBootSec: 'Primera ejecución N tiempo después del arranque — relativa al boot, no al reloj de pared.',
  RandomizedDelaySec: 'Retardo aleatorio añadido a cada disparo — evita picos de carga cuando muchos servidores usan la misma hora.',
  Unit: 'Service que activa este timer; por defecto es el de igual nombre sin la extensión .timer.',
  Persistent: 'Si se perdió un disparo por apagón, el timer lo ejecuta al encender (catch-up) — clave para respaldos.',
};

const NAME_RE = /^[a-zA-Z0-9_.-]+$/;
const USER_RE = /^[a-z_][a-z0-9_-]*[$]?$/;
const ENV_RE = /^[A-Za-z_][A-Za-z0-9_]*=.+$/;

function parseEnv(text: string): { lines: string[]; error: string | null } {
  const lines: string[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (!ENV_RE.test(line)) return { lines, error: `Línea de Environment inválida: «${line}» — usa el formato KEY=VALUE (sin espacios alrededor del =).` };
    lines.push(line);
  }
  return { lines, error: null };
}

/** Nombre base: si el usuario ya escribió .service/.timer, no se duplica el sufijo. */
function baseName(f: UnitForm): string {
  const n = f.name.trim();
  const suffix = '.' + f.kind;
  return n.endsWith(suffix) ? n.slice(0, -suffix.length) : n;
}

function buildServiceUnit(f: UnitForm, base: string, envLines: string[]): string {
  const L: string[] = [
    `# /etc/systemd/system/${base}.service`,
    '# Generado con VaultNotes — systemd Unit Builder (offline, educativo)',
    '# Los comentarios van en líneas propias: systemd NO admite comentarios',
    '# al final de una directiva (el texto se interpretaría como parte del valor).',
    '',
    '[Unit]',
    `Description=${f.description.trim()}`,
  ];
  if (f.after.trim()) {
    L.push(`After=${f.after.trim()}`);
    if (f.after.includes('network-online')) L.push('Wants=network-online.target', '# After solo ORDENA; Wants ACTIVA la dependencia.');
  }
  L.push('', '[Service]', `Type=${f.serviceType}`,
    '# Ejecuta el comando principal (ruta absoluta, sin shell).',
    `ExecStart=${f.execStart.trim()}`);
  if (f.user.trim()) L.push('# Corre con un usuario dedicado en lugar de root.', `User=${f.user.trim()}`);
  if (f.workingDir.trim()) L.push(`WorkingDirectory=${f.workingDir.trim()}`);
  if (envLines.length > 0) {
    L.push('# Variables de entorno del proceso (una por línea).');
    envLines.forEach((e) => L.push(`Environment=${e}`));
  }
  if (f.restart !== 'no') {
    L.push(`# ${RESTART_DOCS[f.restart].split('.')[0]}.`, `Restart=${f.restart}`,
      '# Espera antes de relanzar: evita bucles de reinicio que consumen CPU.',
      `RestartSec=${f.restartSec}s`);
  }
  const hard: string[] = [];
  if (f.noNewPrivileges) hard.push('NoNewPrivileges=true');
  if (f.protectSystem !== 'off') hard.push(`ProtectSystem=${f.protectSystem}`);
  if (f.protectHome) hard.push('ProtectHome=true');
  if (f.privateTmp) hard.push('PrivateTmp=true');
  if (f.restrictSUIDSGID) hard.push('RestrictSUIDSGID=true');
  if (hard.length > 0) L.push('# ── Hardening: sandbox del servicio ──', ...hard);
  L.push('');
  if (f.kind === 'service') {
    L.push('[Install]', '# enable crea el enlace en multi-user.target (arranque normal).', 'WantedBy=multi-user.target');
  } else {
    L.push('# [Install] omitido a propósito: esta unit la activa el .timer,', '# no el arranque del sistema.');
  }
  return L.join('\n');
}

function buildTimerUnit(f: UnitForm, base: string): string {
  const L: string[] = [
    `# /etc/systemd/system/${base}.timer`,
    '# Generado con VaultNotes — systemd Unit Builder (offline, educativo)',
    '',
    '[Unit]',
    `Description=Programa la ejecución de ${base}.service`,
    '',
    '[Timer]',
  ];
  if (f.onCalendar.trim()) L.push('# Cuándo dispara (valida con: systemd-analyze calendar).', `OnCalendar=${f.onCalendar.trim()}`);
  if (f.onBootSec.trim()) L.push('# Primera ejecución relativa al arranque (no al reloj de pared).', `OnBootSec=${f.onBootSec.trim()}`);
  if (f.randomizedDelaySec.trim()) L.push('# Retardo aleatorio: evita que N servidores disparen a la vez.', `RandomizedDelaySec=${f.randomizedDelaySec.trim()}`);
  if (f.persistent) L.push('# Si se perdió el disparo por apagón, corre al encender (catch-up).', 'Persistent=true');
  L.push(`Unit=${f.unitLink.trim() || `${base}.service`}`, '', '[Install]',
    '# Los timers se habilitan en timers.target.', 'WantedBy=timers.target');
  return L.join('\n');
}

function buildDeploy(f: UnitForm, base: string): string {
  const svc = `${base}.service`;
  if (f.kind === 'service') {
    return [
      '# 1. Copiar la unit al directorio del sistema',
      `sudo cp ${svc} /etc/systemd/system/`,
      '# 2. Recargar el daemon (systemd cachea las units en memoria)',
      'sudo systemctl daemon-reload',
      '# 3. Habilitar al arranque Y arrancar ahora',
      `sudo systemctl enable --now ${svc}`,
      '# 4. Verificar estado',
      `sudo systemctl status ${svc}`,
      '# 5. Seguir el journal en vivo (Ctrl+C para salir)',
      `journalctl -u ${svc} -f`,
    ].join('\n');
  }
  const tmr = `${base}.timer`;
  return [
    '# 1. Copiar AMBAS units (service + timer) al sistema',
    `sudo cp ${svc} ${tmr} /etc/systemd/system/`,
    '# 2. Recargar el daemon (systemd cachea las units en memoria)',
    'sudo systemctl daemon-reload',
    '# 3. Habilitar y arrancar EL TIMER (no el service: el timer lo dispara)',
    `sudo systemctl enable --now ${tmr}`,
    '# 4. Verificar el calendario de disparos',
    'systemctl list-timers',
    '# (ejecución manual fuera de calendario)',
    `sudo systemctl start ${svc}`,
    '# 5. Estado del service (queda inactive entre ejecuciones oneshot)',
    `sudo systemctl status ${svc}`,
    '# 6. Seguir el journal en vivo (Ctrl+C para salir)',
    `journalctl -u ${svc} -f`,
  ].join('\n');
}

const HardToggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; name: string; desc: string }> = ({ checked, onChange, name, desc }) => (
  <label className="flex items-start gap-2 cursor-pointer">
    <input type="checkbox" className="mr-2 mt-0.5 accent-cyan-500" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span className="text-[10px] text-[#888] leading-relaxed"><span className="text-white font-semibold">{name}</span> — {desc}</span>
  </label>
);

export const SaSystemdTool: React.FC = () => {
  const [f, setF] = useState<UnitForm>(INITIAL);
  const { addedToast, showToast } = useAddToNoteToast();
  const upd = <K extends keyof UnitForm>(k: K, v: UnitForm[K]) => setF((p) => ({ ...p, [k]: v }));

  const { errors, warnings, serviceText, timerText, deployText, base } = useMemo(() => {
    const errs: string[] = [];
    const warns: string[] = [];
    const base = f.name.trim();
    if (!base) errs.push('El nombre de la unit es obligatorio.');
    else if (!NAME_RE.test(base)) errs.push(`Nombre inválido: «${base}» — usa solo letras, números, punto, guion y guion bajo ([a-zA-Z0-9_.-]+).`);

    const exec = f.execStart.trim();
    if (!exec) errs.push('ExecStart es obligatorio: systemd necesita el comando a ejecutar.');
    else if (!exec.startsWith('/')) warns.push('ExecStart debería ser una ruta absoluta (p. ej. /usr/local/bin/app) — sin shell no se resuelven rutas relativas.');

    if (f.user.trim() && !USER_RE.test(f.user.trim())) errs.push(`Usuario inválido: «${f.user.trim()}» — los usuarios Linux van en minúsculas (p. ej. www-data, backup).`);

    const env = parseEnv(f.envText);
    if (env.error) errs.push(env.error);

    if (f.restart !== 'no' && (!/^\d+$/.test(f.restartSec.trim()) || parseInt(f.restartSec, 10) < 1)) {
      errs.push('RestartSec debe ser un entero positivo (segundos) cuando Restart no es «no».');
    }
    if (f.serviceType === 'oneshot' && f.restart !== 'no') {
      warns.push('Type=oneshot no admite Restart distinto de «no»: systemd rechaza la unit al arrancar. Cambia el Type o pon Restart=no.');
    }
    if (f.kind === 'timer' && !f.onCalendar.trim() && !f.onBootSec.trim()) {
      errs.push('Un timer necesita al menos un disparador: OnCalendar u OnBootSec.');
    }

    if (errs.length > 0) return { errors: errs, warnings: warns, serviceText: '', timerText: '', deployText: '', base: '' };
    const b = baseName(f);
    return {
      errors: errs, warnings: warns,
      serviceText: buildServiceUnit(f, b, env.lines),
      timerText: f.kind === 'timer' ? buildTimerUnit(f, b) : '',
      deployText: buildDeploy(f, b), base: b,
    };
  }, [f]);

  const presentDirectives = useMemo(() => {
    if (errors.length > 0) return [];
    const names = new Set<string>();
    (serviceText + '\n' + timerText).split('\n').forEach((line) => {
      const m = /^([A-Za-z][A-Za-z0-9]*)=/.exec(line.trim());
      if (m) names.add(m[1]);
    });
    return [...names].filter((n) => DIRECTIVE_DOCS[n]);
  }, [serviceText, timerText, errors]);

  const hardeningSummary = useMemo(() => {
    const items: string[] = [];
    if (f.noNewPrivileges) items.push('NoNewPrivileges');
    if (f.protectSystem !== 'off') items.push(`ProtectSystem=${f.protectSystem}`);
    if (f.protectHome) items.push('ProtectHome');
    if (f.privateTmp) items.push('PrivateTmp');
    if (f.restrictSUIDSGID) items.push('RestrictSUIDSGID');
    return items.length > 0 ? items.join(', ') : 'ninguno';
  }, [f.noNewPrivileges, f.protectSystem, f.protectHome, f.privateTmp, f.restrictSUIDSGID]);

  const handleAddToNote = () => {
    if (errors.length > 0 || !serviceText) return;
    const rows: [string, string][] = [
      ['Unit', escapeHtml(`${base}.service`)],
      ['Tipo', f.kind === 'timer' ? 'timer (service + .timer)' : 'service'],
      ['ExecStart', escapeHtml(f.execStart.trim())],
      ['User', escapeHtml(f.user.trim() || 'root (system)')],
      ['Restart', `${f.restart}${f.restart !== 'no' ? ` (RestartSec=${f.restartSec}s)` : ''}`],
      ['Hardening', escapeHtml(hardeningSummary)],
      ['Despliegue', escapeHtml(f.kind === 'timer' ? 'cp → daemon-reload → enable --now .timer → list-timers' : 'cp → daemon-reload → enable --now .service')],
    ];
    const pre = (t: string) =>
      `<pre style="background:#0A0A0A;border:1px solid #262626;padding:8px;font-family:monospace;font-size:11px;color:#95E6C8;white-space:pre-wrap;">${escapeHtml(t)}</pre>`;
    const html = buildNoteHtmlTable(rows) + pre(serviceText) + (timerText ? pre(timerText) : '');
    useNoteStore.getState().enqueueNote('systemd — ' + base, html);
    showToast();
  };

  return (
    <div className="space-y-4">
      <InfoBanner>
        <span className="font-semibold">systemd Unit Builder — 100% offline y educativo.</span>{' '}
        Construye unit files <code className="text-blue-300">.service</code> y <code className="text-blue-300">.timer</code> con validación en vivo, directivas de hardening y la secuencia exacta de despliegue. Nada se ejecuta ni sale de tu navegador: los comandos se generan para estudiarlos y copiarlos.
      </InfoBanner>

      {/* ─── Presets ─── */}
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" onClick={() => setF({ ...p.form })} className={`${btnGhost} text-[10px] inline-flex items-center gap-1`}>
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* ─── Formulario ─── */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
          <Cog className="w-3 h-3" /> Configuración de la unit
        </h3>
        <Tabs
          tabs={[
            { id: 'service', label: 'Service', icon: <Server className="w-3 h-3" /> },
            { id: 'timer', label: 'Timer', icon: <Clock className="w-3 h-3" /> },
          ]}
          active={f.kind}
          onChange={(id) => upd('kind', id as UnitKind)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nombre de la unit (sin extensión)" hint="Se genera nombre.service / nombre.timer">
            <input className={inputCls} value={f.name} onChange={(e) => upd('name', e.target.value)} placeholder="miapp" spellCheck={false} autoComplete="off" />
          </Field>
          <Field label="Description" hint="Texto visible en systemctl status y journal">
            <input className={inputCls} value={f.description} onChange={(e) => upd('description', e.target.value)} placeholder="Servidor web frontal" spellCheck={false} />
          </Field>
          <Field label="Type (cómo systemd detecta el arranque)" hint={SERVICE_TYPE_DOCS[f.serviceType]}>
            <select className={inputCls} value={f.serviceType} onChange={(e) => upd('serviceType', e.target.value as ServiceType)}>
              {(['simple', 'exec', 'forking', 'oneshot'] as ServiceType[]).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="ExecStart (obligatorio)" hint="Ruta absoluta del binario + argumentos. Sin shell: los pipes requieren /bin/sh -c">
            <input className={inputCls} value={f.execStart} onChange={(e) => upd('execStart', e.target.value)} placeholder="/usr/local/bin/miapp --config /etc/miapp.conf" spellCheck={false} />
          </Field>
          <Field label="User (opcional)" hint="Vacío = root (system). Un usuario dedicado reduce el impacto de una falla">
            <input className={inputCls} value={f.user} onChange={(e) => upd('user', e.target.value)} placeholder="www-data" spellCheck={false} autoComplete="off" />
          </Field>
          <Field label="WorkingDirectory (opcional)" hint="CWD del proceso: las rutas relativas se resuelven aquí">
            <input className={inputCls} value={f.workingDir} onChange={(e) => upd('workingDir', e.target.value)} placeholder="/var/www/miapp" spellCheck={false} />
          </Field>
          <Field label="Environment (una KEY=VALUE por línea)" hint="Las líneas vacías y las que empiezan por # se ignoran">
            <textarea className={taCls} value={f.envText} onChange={(e) => upd('envText', e.target.value)} placeholder={'MIAPP_ENTORNO=produccion\nLOG_LEVEL=info'} spellCheck={false} />
          </Field>
          <div className="space-y-3">
            <Field label="Restart (política de reinicio)" hint={RESTART_DOCS[f.restart]}>
              <select className={inputCls} value={f.restart} onChange={(e) => upd('restart', e.target.value as RestartPolicy)}>
                {(['no', 'on-failure', 'always', 'on-abnormal'] as RestartPolicy[]).map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="RestartSec (segundos)" hint="Pausa entre muerte y relanzamiento — evita bucles de reinicio">
              <input className={inputCls} value={f.restartSec} onChange={(e) => upd('restartSec', e.target.value)} placeholder="5" inputMode="numeric" spellCheck={false} />
            </Field>
            <Field label="After= (units previas)" hint="p. ej. network-online.target — orden de arranque, no activación">
              <input className={inputCls} value={f.after} onChange={(e) => upd('after', e.target.value)} placeholder="network-online.target" spellCheck={false} />
            </Field>
          </div>
        </div>

        {f.kind === 'timer' && (
          <div className="border border-[#262626] rounded p-3 space-y-3 bg-[#0A0A0A]">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Sección [Timer]
            </h4>
            <Field label="OnCalendar (expresión de calendario)" hint="Galería de presets: elige uno y edítalo después">
              <input className={inputCls} value={f.onCalendar} onChange={(e) => upd('onCalendar', e.target.value)} placeholder="02:00" spellCheck={false} />
            </Field>
            <div className="flex gap-1.5 flex-wrap">
              {CALENDAR_PRESETS.map((c) => (
                <button key={c.value} type="button" onClick={() => upd('onCalendar', c.value)} title={c.desc}
                  className="px-2 py-1 rounded text-[9px] font-mono border border-[#262626] bg-[#161616] hover:bg-[#222] text-[#AAA] hover:text-cyan-300 transition-colors cursor-pointer">
                  {c.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="OnBootSec (opcional)" hint="Primera corrida N tras el arranque, p. ej. 5min">
                <input className={inputCls} value={f.onBootSec} onChange={(e) => upd('onBootSec', e.target.value)} placeholder="5min" spellCheck={false} />
              </Field>
              <Field label="RandomizedDelaySec (opcional)" hint="Retardo aleatorio — evita picos simultáneos entre servidores">
                <input className={inputCls} value={f.randomizedDelaySec} onChange={(e) => upd('randomizedDelaySec', e.target.value)} placeholder="10min" spellCheck={false} />
              </Field>
            </div>
            <Field label="Unit= (service que dispara)" hint="Vacío genera el valor por defecto: mismo nombre + .service">
              <input className={inputCls} value={f.unitLink} onChange={(e) => upd('unitLink', e.target.value)} placeholder="respaldo-diario.service" spellCheck={false} />
            </Field>
            <HardToggle
              checked={f.persistent}
              onChange={(v) => upd('persistent', v)}
              name="Persistent=true"
              desc="si el equipo estaba apagado a la hora programada, el timer ejecuta el disparo perdido al encender (esencial para respaldos)."
            />
          </div>
        )}

        <div className="border border-[#262626] rounded p-3 space-y-2 bg-[#0A0A0A]">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3" /> Hardening (sandbox del servicio)
          </h4>
          <HardToggle checked={f.noNewPrivileges} onChange={(v) => upd('noNewPrivileges', v)} name="NoNewPrivileges" desc="el proceso y sus hijos no pueden ganar privilegios vía setuid/sudo: bloquea escaladas desde el servicio." />
          <HardToggle checked={f.protectHome} onChange={(v) => upd('protectHome', v)} name="ProtectHome" desc="/home, /root y /run/user quedan ocultos para el proceso." />
          <HardToggle checked={f.privateTmp} onChange={(v) => upd('privateTmp', v)} name="PrivateTmp" desc="/tmp y /var/tmp son un tmpfs privado: sin colisiones ni ataques de symlink en /tmp." />
          <HardToggle checked={f.restrictSUIDSGID} onChange={(v) => upd('restrictSUIDSGID', v)} name="RestrictSUIDSGID" desc="se ignoran los bits SUID/SGID del filesystem: los binarios setuid no funcionan para este servicio." />
          <div className="pt-1">
            <Field label="ProtectSystem" hint="off: sin protección · full: /usr, /boot y /etc read-only · strict: TODO el filesystem read-only">
              <select className={inputCls} value={f.protectSystem} onChange={(e) => upd('protectSystem', e.target.value as ProtectSystemMode)}>
                <option value="off">off</option>
                <option value="full">full</option>
                <option value="strict">strict</option>
              </select>
            </Field>
          </div>
        </div>
      </div>

      {/* ─── Validación ─── */}
      {errors.map((e) => <ErrorBanner key={e} message={e} />)}
      {errors.length === 0 && warnings.map((w) => (
        <div key={w} className="px-3 py-2 rounded border border-yellow-500/40 bg-yellow-500/10 text-yellow-400 text-[11px] leading-relaxed flex items-start gap-1.5">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {w}
        </div>
      ))}

      {/* ─── Salida ─── */}
      {errors.length === 0 && (
        <div className="space-y-4">
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
              <FileText className="w-3 h-3" /> {base}.service
            </h3>
            <CodeBlock code={serviceText} label="/etc/systemd/system" />
          </div>
          {timerText && (
            <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> {base}.timer
              </h3>
              <CodeBlock code={timerText} label="/etc/systemd/system" />
            </div>
          )}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
              <Cog className="w-3 h-3" /> Secuencia de despliegue
            </h3>
            <CodeBlock code={deployText} label="bash" />
          </div>
        </div>
      )}

      {/* ─── Referencia de directivas (interactiva) ─── */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
          <Info className="w-3 h-3" /> Directivas de esta unit — por qué importan
        </h3>
        {presentDirectives.length === 0 ? (
          <p className="text-[10px] text-[#666]">Corrige los errores del formulario para ver las directivas generadas.</p>
        ) : (
          <div className="divide-y divide-[#161616]">
            {presentDirectives.map((d) => (
              <details key={d} className="py-1 group">
                <summary className="cursor-pointer text-[11px] font-mono text-white hover:text-cyan-300 transition-colors list-none flex items-center gap-1.5">
                  <span className="text-cyan-500 group-open:rotate-90 transition-transform inline-block">▸</span>
                  {d}=
                </summary>
                <p className="text-[10px] text-[#888] leading-relaxed pl-4 pt-0.5">{DIRECTIVE_DOCS[d]}</p>
              </details>
            ))}
          </div>
        )}
      </div>

      {/* ─── Añadir a Notas ─── */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={handleAddToNote} disabled={errors.length > 0} className={`${btnPrimary} inline-flex items-center gap-1.5 text-[11px]`}>
          <FileText className="w-3 h-3" /> Añadir a Notas
        </button>
        {addedToast && <span className="text-[10px] text-green-400">Añadido a Notas — crea una nota nueva para verlo.</span>}
      </div>
    </div>
  );
};

