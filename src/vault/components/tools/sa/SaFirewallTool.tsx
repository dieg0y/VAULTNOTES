'use client';

/**
 * SaFirewallTool.tsx — "Firewall Rule Builder" (SysAdmin · task 7-g).
 *
 * UNA regla de entrada (INPUT) → CINCO dialectos desde el mismo estado: ufw,
 * iptables, nftables, firewalld (rich rule) y Windows netsh. Formulario: acción
 * (allow/deny/reject — drop vs reject explicado), protocolo (tcp/udp/ambos),
 * puerto (único o rango 1-65535), origen (any/CIDR IPv4 validado), destino
 * (any/IP), interfaz opcional y comentario. Cada bloque lleva 1-2 líneas de
 * CUÁNDO usar esa herramienta + notas de esquina (tcp+udp → dos reglas;
 * firewalld sin filtro por interfaz; Windows no tiene "reject"; iptables -A
 * añade al final). Tarjetas pedagógicas: DROP vs REJECT, no bloquear tu IP de
 * administración, regla de los 3 segundos, persistencia y orden de evaluación.
 * 100% offline — sin fetch, sin exec, sin eval.
 */
import React, { useMemo, useState } from 'react';
import { ShieldCheck, Terminal, BookOpen, AlertTriangle, Info } from 'lucide-react';
import { useNoteStore } from '../../../store/noteStore';
import { escapeHtml } from '../../../utils/escapeHtml';
import {
  inputCls, btnPrimary, Row, Field, CodeBlock, InfoBanner, ErrorBanner,
  buildNoteHtmlTable, useAddToNoteToast,
} from '../_shared';

/* ─────────────────────────── tipos ─────────────────────────── */

type FwAction = 'allow' | 'deny' | 'reject';
type FwProto = 'tcp' | 'udp' | 'tcp+udp';
type SrcMode = 'any' | 'cidr';
type DstMode = 'any' | 'ip';

interface FwForm {
  action: FwAction;
  protocol: FwProto;
  port: string;
  srcMode: SrcMode;
  srcCidr: string;
  dstMode: DstMode;
  dstIp: string;
  iface: string;
  label: string;
}

/** Regla ya validada — todos los generadores trabajan sobre esto. */
interface FwRule {
  action: FwAction;
  protocol: FwProto;
  portUfw: string;   // 5432 | 5000:5100 (ufw usa ":" para rangos)
  portIp: string;    // 5432 | 5000:5100 (iptables --dport)
  portNft: string;   // 5432 | 5000-5100 (nftables usa "-")
  portFd: string;    // 5432 | 5000-5100 (rich rule usa "-")
  srcAny: boolean;
  src: string;       // CIDR validado
  dstAny: boolean;
  dstIp: string;     // IPv4 validada
  iface: string;     // '' si no se usa
  label: string;     // '' si no se usa
}

const IPV4_RE = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const CIDR_RE = /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\/(3[0-2]|[12]?\d)$/;
const IFACE_RE = /^[A-Za-z0-9._-]{1,15}$/;

const ACTION_INFO: Record<FwAction, { desc: string; cls: string }> = {
  allow: {
    desc: 'ACCEPT — deja pasar el tráfico que coincide. Para exponer un servicio de forma controlada.',
    cls: 'bg-green-500/15 border-green-500/40 text-green-400',
  },
  deny: {
    desc: 'DROP — descarta EN SILENCIO: el cliente se queda esperando hasta timeout. El puerto ni existe para un escáner.',
    cls: 'bg-red-500/15 border-red-500/40 text-red-400',
  },
  reject: {
    desc: 'REJECT — responde con error (RST en TCP / ICMP port-unreachable en UDP): el cliente legítimo falla RÁPIDO en vez de colgarse.',
    cls: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
  },
};

const PROTO_INFO: Record<FwProto, string> = {
  tcp: 'TCP — conexiones orientadas (SSH, HTTP, PostgreSQL…).',
  udp: 'UDP — datagramas (DNS, NTP, syslog remoto…).',
  'tcp+udp': 'Ambos — genera una regla por protocolo en cada dialecto (salvo ufw, que las unifica).',
};

/* ─────────────────────────── validación ─────────────────────────── */

function validate(f: FwForm): { errors: string[]; rule: FwRule | null } {
  const errors: string[] = [];
  const portTrim = f.port.trim();
  const portMatch = /^(\d+)(?:-(\d+))?$/.exec(portTrim);
  let p1 = 0;
  let p2 = 0;
  if (!portTrim) {
    errors.push('Puerto: obligatorio (ej. 5432 o 5000-5100).');
  } else if (!portMatch) {
    errors.push(`Puerto: formato no válido "${portTrim}" — usa un puerto (22) o un rango (5000-5100).`);
  } else {
    p1 = parseInt(portMatch[1], 10);
    p2 = portMatch[2] !== undefined ? parseInt(portMatch[2], 10) : p1;
    if (p1 < 1 || p1 > 65535 || p2 < 1 || p2 > 65535) errors.push(`Puerto: fuera de rango (1-65535) en "${portTrim}".`);
    else if (p2 < p1) errors.push(`Puerto: rango invertido "${portTrim}" — el primer puerto debe ser menor o igual.`);
  }
  if (p2 < p1) p2 = p1;

  let src = '';
  if (f.srcMode === 'cidr') {
    src = f.srcCidr.trim();
    if (!CIDR_RE.test(src)) errors.push(`Origen: "${src || '(vacío)'}" no es un CIDR IPv4 válido (ej. 10.0.0.0/24).`);
  }
  let dstIp = '';
  if (f.dstMode === 'ip') {
    dstIp = f.dstIp.trim();
    if (!IPV4_RE.test(dstIp)) errors.push(`Destino: "${dstIp || '(vacío)'}" no es una IPv4 válida (ej. 192.168.1.10).`);
  }
  const iface = f.iface.trim();
  if (iface && !IFACE_RE.test(iface)) errors.push(`Interfaz: "${iface}" no parece un nombre de interfaz (ej. eth0, ens192).`);

  if (errors.length > 0) return { errors, rule: null };
  return {
    errors,
    rule: {
      action: f.action,
      protocol: f.protocol,
      portUfw: p1 === p2 ? String(p1) : `${p1}:${p2}`,
      portIp: p1 === p2 ? String(p1) : `${p1}:${p2}`,
      portNft: p1 === p2 ? String(p1) : `${p1}-${p2}`,
      portFd: p1 === p2 ? String(p1) : `${p1}-${p2}`,
      srcAny: f.srcMode === 'any',
      src,
      dstAny: f.dstMode === 'any',
      dstIp,
      iface,
      label: f.label.trim(),
    },
  };
}

/* ─────────────────────────── generadores por dialecto ─────────────────────────── */

function protosOf(r: FwRule): string[] {
  return r.protocol === 'tcp+udp' ? ['tcp', 'udp'] : [r.protocol];
}

/** ufw — orden de la gramática: allow|deny|reject [in on IF] [from A] [to B] port P proto T comment 'C'. */
function buildUfw(r: FwRule): string {
  const parts: string[] = ['sudo ufw', r.action];
  if (r.iface) parts.push('in', `on ${r.iface}`);
  if (!r.srcAny) parts.push(`from ${r.src}`);
  parts.push(`to ${r.dstAny ? 'any' : r.dstIp}`, `port ${r.portUfw}`);
  if (r.protocol !== 'tcp+udp') parts.push(`proto ${r.protocol}`);
  if (r.label) parts.push(`comment '${r.label}'`);
  return `${parts.join(' ')}\n# verificar: sudo ufw status verbose`;
}

function buildIptables(r: FwRule): string {
  const target = r.action === 'allow' ? 'ACCEPT' : r.action === 'deny' ? 'DROP' : 'REJECT';
  const lines = protosOf(r).map((p) => {
    const parts: string[] = ['sudo iptables -A INPUT'];
    if (r.iface) parts.push(`-i ${r.iface}`);
    parts.push(`-p ${p}`);
    if (!r.srcAny) parts.push(`-s ${r.src}`);
    if (!r.dstAny) parts.push(`-d ${r.dstIp}`);
    parts.push(`--dport ${r.portIp}`);
    if (r.action === 'allow') parts.push('-m conntrack --ctstate NEW');
    if (r.label) parts.push('-m comment', `--comment "${r.label}"`);
    parts.push(`-j ${target}`);
    if (r.action === 'reject') parts.push(p === 'tcp' ? '--reject-with tcp-reset' : '--reject-with icmp-port-unreachable');
    return parts.join(' ');
  });
  return `${lines.join('\n')}\n# -A añade al FINAL: si hay un DROP antes, nunca llega → -I INPUT 1 inserta arriba\n# persistir: sudo apt install iptables-persistent && sudo netfilter-persistent save`;
}

function buildNft(r: FwRule): string {
  const action = r.action === 'allow' ? 'accept' : r.action === 'deny' ? 'drop' : 'reject';
  const lines = protosOf(r).map((p) => {
    const parts: string[] = ['sudo nft add rule inet filter input'];
    if (r.iface) parts.push(`iifname "${r.iface}"`);
    if (!r.srcAny) parts.push(`ip saddr ${r.src}`);
    if (!r.dstAny) parts.push(`ip daddr ${r.dstIp}`);
    parts.push(`${p} dport ${r.portNft}`);
    if (r.label) parts.push(`comment "${r.label}"`);
    parts.push(action);
    if (r.action === 'reject' && p === 'tcp') parts.push('with tcp reset');
    return parts.join(' ');
  });
  return `${lines.join('\n')}\n# ajusta tabla/chain a las tuyas: nft list ruleset · persistir en /etc/nftables.conf`;
}

function buildFirewalld(r: FwRule): string {
  const action = r.action === 'allow' ? 'accept' : r.action === 'deny' ? 'drop' : 'reject';
  const lines = protosOf(r).map((p) => {
    const elements: string[] = ['rule family="ipv4"'];
    if (!r.srcAny) elements.push(`source address="${r.src}"`);
    if (!r.dstAny) elements.push(`destination address="${r.dstIp}"`);
    elements.push(`port port="${r.portFd}" protocol="${p}"`, action);
    return `sudo firewall-cmd --permanent --add-rich-rule='${elements.join(' ')}'`;
  });
  return `${lines.join('\n')}\nsudo firewall-cmd --reload`;
}

function buildNetsh(r: FwRule): string {
  const protos = r.protocol === 'tcp+udp' ? ['TCP', 'UDP'] : [r.protocol.toUpperCase()];
  const baseName = r.label || 'Regla entrante';
  const lines = protos.map((p) => {
    const name = protos.length > 1 ? `${baseName} (${p})` : baseName;
    const parts: string[] = [
      'netsh advfirewall firewall add rule',
      `name="${name}"`,
      'dir=in',
      `action=${r.action === 'allow' ? 'allow' : 'block'}`,
      `protocol=${p}`,
      `localport=${r.portFd}`,
    ];
    if (!r.srcAny) parts.push(`remoteip=${r.src}`);
    if (!r.dstAny) parts.push(`localip=${r.dstIp}`);
    return parts.join(' ');
  });
  return `${lines.join('\n')}\n# Windows no tiene "reject": action=block descarta en silencio (equivale a DROP)`;
}

/* ─────────────────────────── píldoras de selección ─────────────────────────── */

const Pill: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; cls: string; title: string }> = ({ active, onClick, children, cls, title }) => (
  <button type="button" onClick={onClick} title={title} className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors cursor-pointer ${active ? cls : 'bg-[#161616] border-[#262626] text-[#888] hover:text-white hover:bg-[#222]'}`}>
    {children}
  </button>
);

/* ─────────────────────────── componente ─────────────────────────── */

export const SaFirewallTool: React.FC = () => {
  const [form, setForm] = useState<FwForm>({
    action: 'allow',
    protocol: 'tcp',
    port: '5432',
    srcMode: 'cidr',
    srcCidr: '10.0.0.0/24',
    dstMode: 'any',
    dstIp: '',
    iface: '',
    label: 'DB interno',
  });
  const { addedToast, showToast } = useAddToNoteToast();

  const set = <K extends keyof FwForm>(key: K, value: FwForm[K]): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const { errors, rule } = useMemo(() => validate(form), [form]);

  const ufwCmd = rule ? buildUfw(rule) : '';
  const ipCmd = rule ? buildIptables(rule) : '';
  const nftCmd = rule ? buildNft(rule) : '';
  const fdCmd = rule ? buildFirewalld(rule) : '';
  const nsCmd = rule ? buildNetsh(rule) : '';

  const addToNote = (): void => {
    if (!rule) return;
    const rows: Array<[string, string]> = [
      ['Acción', escapeHtml(rule.action)],
      ['Protocolo', escapeHtml(rule.protocol)],
      ['Puerto', escapeHtml(rule.portIp)],
      ['Origen', escapeHtml(rule.srcAny ? 'cualquiera' : rule.src)],
      ['Destino', escapeHtml(rule.dstAny ? 'cualquiera' : rule.dstIp)],
      ['Interfaz', escapeHtml(rule.iface || '—')],
      ['Comentario', escapeHtml(rule.label || '—')],
      ['ufw', escapeHtml(ufwCmd)],
      ['iptables', escapeHtml(ipCmd)],
      ['nftables', escapeHtml(nftCmd)],
      ['firewalld', escapeHtml(fdCmd)],
      ['netsh', escapeHtml(nsCmd)],
    ];
    useNoteStore.getState().enqueueNote(
      `Firewall — ${rule.action} ${rule.protocol} ${rule.portIp}`,
      buildNoteHtmlTable(rows),
    );
    showToast();
  };

  return (
    <div className="space-y-3">
      <InfoBanner>
        100% offline y educativo. Traduce <span className="font-semibold">una</span> regla de
        entrada (INPUT) a los dialectos ufw / iptables / nftables / firewalld y Windows netsh —
        los comandos se generan localmente, no se ejecutan. Revísalos siempre con la política real
        de tu empresa antes de aplicar nada en producción.
      </InfoBanner>

      {/* Formulario */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> La regla</h3>

        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Acción</div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(ACTION_INFO) as FwAction[]).map((a) => (
              <Pill key={a} active={form.action === a} onClick={() => set('action', a)} cls={ACTION_INFO[a].cls} title={ACTION_INFO[a].desc}>
                {a}
              </Pill>
            ))}
          </div>
          <p className="text-[10px] text-[#888] leading-relaxed">{ACTION_INFO[form.action].desc}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Protocolo</div>
            <div className="flex flex-wrap gap-1.5">
              {(['tcp', 'udp', 'tcp+udp'] as FwProto[]).map((p) => (
                <Pill key={p} active={form.protocol === p} onClick={() => set('protocol', p)} cls="bg-cyan-500/15 border-cyan-500/40 text-cyan-300" title={PROTO_INFO[p]}>
                  {p}
                </Pill>
              ))}
            </div>
            <p className="text-[10px] text-[#666] leading-relaxed">{PROTO_INFO[form.protocol]}</p>
          </div>
          <Field label="Puerto (único o rango)" hint="Validado 1-65535 · ej. 5432 o 5000-5100">
            <input value={form.port} onChange={(e) => set('port', e.target.value)} placeholder="5432" spellCheck={false} autoComplete="off" aria-label="Puerto o rango de puertos" className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Origen (source)</div>
            <div className="flex gap-1.5">
              <Pill active={form.srcMode === 'any'} onClick={() => set('srcMode', 'any')} cls="bg-cyan-500/15 border-cyan-500/40 text-cyan-300" title="Cualquier origen">any</Pill>
              <Pill active={form.srcMode === 'cidr'} onClick={() => set('srcMode', 'cidr')} cls="bg-cyan-500/15 border-cyan-500/40 text-cyan-300" title="Solo esta red en CIDR">CIDR</Pill>
            </div>
            {form.srcMode === 'cidr' && (
              <input value={form.srcCidr} onChange={(e) => set('srcCidr', e.target.value)} placeholder="10.0.0.0/24" spellCheck={false} autoComplete="off" aria-label="Red de origen en formato CIDR IPv4" className={inputCls} />
            )}
            <p className="text-[10px] text-[#666]">IPv4 con máscara: 10.0.0.0/24, 172.16.0.0/16…</p>
          </div>
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Destino (este servidor)</div>
            <div className="flex gap-1.5">
              <Pill active={form.dstMode === 'any'} onClick={() => set('dstMode', 'any')} cls="bg-cyan-500/15 border-cyan-500/40 text-cyan-300" title="Cualquier IP local">any</Pill>
              <Pill active={form.dstMode === 'ip'} onClick={() => set('dstMode', 'ip')} cls="bg-cyan-500/15 border-cyan-500/40 text-cyan-300" title="Solo esta IP local">IP</Pill>
            </div>
            {form.dstMode === 'ip' && (
              <input value={form.dstIp} onChange={(e) => set('dstIp', e.target.value)} placeholder="192.168.1.10" spellCheck={false} autoComplete="off" aria-label="IP de destino de la regla" className={inputCls} />
            )}
            <p className="text-[10px] text-[#666]">En reglas de ENTRADA el destino es una IP local del servidor.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Interfaz (opcional)" hint="eth0, ens192, vlan10… — vacío = todas">
            <input value={form.iface} onChange={(e) => set('iface', e.target.value)} placeholder="eth0" spellCheck={false} autoComplete="off" aria-label="Interfaz de red de entrada" className={inputCls} />
          </Field>
          <Field label="Comentario / nombre" hint="Se usa como comment (ufw/nft/iptables) y name (netsh)">
            <input value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="DB interno" spellCheck={false} autoComplete="off" aria-label="Comentario o nombre de la regla" className={inputCls} />
          </Field>
        </div>

        <div className="border-t border-[#1A1A1A] pt-2 space-y-1">
          <Row label="Dirección" value="entrada (INPUT) — esta tool solo genera reglas de entrada" />
          <p className="text-[10px] text-[#666] leading-relaxed">
            <span className="text-white">Posición — el orden importa:</span> las reglas se evalúan
            de arriba hacia abajo y gana la <span className="text-white">primera coincidencia</span>.
            Coloca las allow específicas <span className="text-cyan-300">ANTES</span> de las deny
            amplias (iptables: <span className="font-mono">-A</span> añade al final;{' '}
            <span className="font-mono">-I INPUT 1</span> inserta arriba). Para salida (OUTPUT) se
            necesita diseñar la política completa, no una regla suelta.
          </p>
        </div>
      </div>

      {errors.length > 0 && <ErrorBanner message={`Regla inválida — ${errors.join(' · ')}`} />}

      {/* Los 5 dialectos */}
      {rule && (
        <div className="space-y-3">
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5"><Terminal className="w-3 h-3" /> Traducción a los 5 dialectos</h3>
            <p className="text-[10px] text-[#666]">
              Misma regla, cinco herramientas — elige la de tu distribución.{' '}
              {rule.protocol === 'tcp+udp' && 'Con tcp+udp se genera una regla por protocolo.'}
            </p>
          </div>

          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-[11px] font-bold text-white">1 · ufw</h4>
              <span className="text-[10px] text-[#777]">Ubuntu / Debian</span>
            </div>
            <CodeBlock code={ufwCmd} lang="bash" />
            <p className="text-[10px] text-[#888] leading-relaxed">
              Frontend oficial de Ubuntu, construido sobre iptables/nftables. Primera elección en
              Ubuntu/Debian: sintaxis corta, comentarios por regla y persiste solo (las reglas
              viven en /etc/ufw). Con <span className="font-mono">ufw deny</span> se hace DROP y
              con <span className="font-mono">ufw reject</span> se responde con error.
            </p>
          </div>

          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-[11px] font-bold text-white">2 · iptables</h4>
              <span className="text-[10px] text-[#777]">legacy / control fino</span>
            </div>
            <CodeBlock code={ipCmd} lang="bash" />
            <p className="text-[10px] text-[#888] leading-relaxed">
              El clásico de netfilter. Úsalo en sistemas legacy o cuando necesitas control fino
              (conntrack, límites por IP, cadenas propias). Ojo: <span className="text-white">el
              orden manda</span> y <span className="text-white">NO persiste tras reboot</span> sin
              iptables-persistent / netfilter-persistent save.
            </p>
          </div>

          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-[11px] font-bold text-white">3 · nftables</h4>
              <span className="text-[10px] text-[#777]">estándar moderno</span>
            </div>
            <CodeBlock code={nftCmd} lang="bash" />
            <p className="text-[10px] text-[#888] leading-relaxed">
              El sucesor oficial de iptables (kernel ≥ 3.13; backend por defecto en Debian 10+ y
              RHEL 8+). Sintaxis declarativa, conjuntos y rangos nativos. El comando asume la tabla{' '}
              <span className="font-mono">inet filter</span> — ajústala a tu{' '}
              <span className="font-mono">nft list ruleset</span>.
            </p>
          </div>

          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-[11px] font-bold text-white">4 · firewalld (rich rule)</h4>
              <span className="text-[10px] text-[#777]">familia RHEL</span>
            </div>
            <CodeBlock code={fdCmd} lang="bash" />
            <p className="text-[10px] text-[#888] leading-relaxed">
              RHEL / Rocky / Alma / Fedora / openSUSE: gestión por <span className="text-white">zonas</span>{' '}
              (la regla vive en la zona por defecto, normalmente public).{' '}
              {rule.iface
                ? `Los rich rules NO filtran por interfaz: enlaza la interfaz a la zona con firewall-cmd --zone=public --change-interface=${rule.iface}.`
                : 'Si necesitas restringir por interfaz, enlaza la interfaz a la zona con --change-interface (los rich rules no filtran por interfaz).'}{' '}
              Con <span className="font-mono">--permanent</span> + <span className="font-mono">--reload</span> ya persiste.
            </p>
          </div>

          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-[11px] font-bold text-white">5 · Windows netsh</h4>
              <span className="text-[10px] text-[#777]">Windows Server / 10 / 11</span>
            </div>
            <CodeBlock code={nsCmd} lang="cmd" />
            <p className="text-[10px] text-[#888] leading-relaxed">
              Regla del Windows Defender Firewall (persiste en el registro). En empresas se
              controlan por GPO, no a mano. PowerShell equivalente:{' '}
              <span className="font-mono text-cyan-300">New-NetFirewallRule</span>. Nota: no hay
              equivalente de &quot;reject&quot; — block siempre descarta en silencio.
            </p>
          </div>
        </div>
      )}

      {/* Tarjetas pedagógicas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-1.5">
          <h4 className="text-[11px] uppercase tracking-widest flex items-center gap-1.5 text-cyan-400"> <Info className="w-3 h-3" /> deny (DROP) vs reject (REJECT)</h4>
          <p className="text-[10px] text-[#888] leading-relaxed">
            <span className="text-white">DROP</span> descarta el paquete en silencio: el cliente
            sigue esperando hasta timeout. Es más lento para el atacante y no confirma que el
            puerto existe. <span className="text-white">REJECT</span> responde de inmediato: RST
            para TCP o ICMP port-unreachable para UDP. Regla práctica: DROP para tráfico hostil de
            Internet (no des información), REJECT para bloqueos internos donde quieres que el
            usuario legítimo falle rápido y sin colgar la app.
          </p>
        </div>
        <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-1.5">
          <h4 className="text-[11px] uppercase tracking-widest flex items-center gap-1.5 text-red-400"> <AlertTriangle className="w-3 h-3" /> No bloquees tu propia IP de administración</h4>
          <p className="text-[10px] text-[#888] leading-relaxed">
            El error clásico: añadir un deny que cubre la IP desde la que administras el servidor →
            te auto-bloqueas el SSH y pierdes la mano. Antes de tocar reglas remotas programa un
            rollback: <span className="font-mono text-cyan-300">{'echo "iptables -F" | sudo at now + 3 minutes'}</span>{' '}
            (se limpia solo) o usa <span className="font-mono text-cyan-300">sudo iptables-apply --timeout 60</span>{' '}
            (revierte si no confirmas el cambio).
          </p>
        </div>
        <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-1.5 sm:col-span-2">
          <h4 className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-cyan-400"> <Info className="w-3 h-3" /> Regla de los 3 segundos: verifica ANTES y DESPUÉS</h4>
          <p className="text-[10px] text-[#888] leading-relaxed">
            Consulta las reglas activas antes de aplicar (¿ya existe algo parecido? ¿en qué orden
            quedó?) y vuelve a consultarlas después (¿mi regla quedó donde esperaba? ¿la cuenta
            subió?). 3 segundos que evitan incidentes:
          </p>
          <CodeBlock
            code={'sudo ufw status verbose            # ufw (cuenta, y comentarios)\nsudo iptables -L -n --line-numbers  # iptables (números de línea para -D)\nsudo nft list ruleset               # nftables\nsudo firewall-cmd --list-all        # firewalld (zona activa)\nGet-NetFirewallRule -Enabled True -Direction Inbound | Format-Table DisplayName,Action  # PowerShell'}
            lang="multi"
            label="verificar por dialecto"
          />
        </div>
        <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-1.5 sm:col-span-2">
          <h4 className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-cyan-400"> <Info className="w-3 h-3" /> Persistencia: ¿sobrevive a un reboot?</h4>
          <p className="text-[10px] text-[#888] leading-relaxed">
            <span className="text-white">ufw</span> — ya persiste (reglas en /etc/ufw, activo tras
            reboot si <span className="font-mono">ufw enable</span>).{' '}
            <span className="text-white">iptables</span> — NO: instala{' '}
            <span className="font-mono">iptables-persistent</span> y guarda con{' '}
            <span className="font-mono">netfilter-persistent save</span> (/etc/iptables/rules.v4).{' '}
            <span className="text-white">nftables</span> — sirve las reglas desde{' '}
            <span className="font-mono">/etc/nftables.conf</span> (nft -f / systemd nftables.service).{' '}
            <span className="text-white">firewalld</span> — con --permanent y --reload ya persiste.{' '}
            <span className="text-white">netsh</span> — persiste (Windows Firewall es un servicio).
          </p>
        </div>
      </div>

      {/* Añadir a notas */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={addToNote} disabled={!rule} className={`${btnPrimary} inline-flex items-center gap-1.5`} title="Añadir la regla y sus 5 traducciones a Notas">
          <BookOpen className="w-3.5 h-3.5" /> Añadir a Notas
        </button>
        <button type="button" onClick={() => setForm({ action: 'allow', protocol: 'tcp', port: '5432', srcMode: 'cidr', srcCidr: '10.0.0.0/24', dstMode: 'any', dstIp: '', iface: '', label: 'DB interno' })} className="px-3 py-1.5 rounded text-xs font-semibold bg-[#161616] hover:bg-[#222] border border-[#262626] text-[#DDD] transition-colors cursor-pointer" title="Restablecer el ejemplo: permitir PostgreSQL desde la red interna">
          Restablecer
        </button>
        {addedToast && <span className="text-[10px] text-green-400">Añadido a Notas — crea o elige una nota para verlo.</span>}
      </div>

      {/* Referencia final */}
      <details className="bg-[#0D0D0D] border border-[#262626] rounded p-3">
        <summary className="cursor-pointer text-xs font-semibold text-white flex items-center gap-1.5"><Info className="w-3 h-3 text-cyan-400" /> ¿Qué herramienta toca en cada distro?</summary>
        <div className="mt-2 space-y-1.5 text-[10px] text-[#888] leading-relaxed">
          <p><span className="text-white">Ubuntu / Debian</span> → ufw (o nftables directo en Debian 10+).</p>
          <p><span className="text-white">RHEL / Rocky / Alma / Fedora</span> → firewalld (backend nftables).</p>
          <p><span className="text-white">Sistemas legacy / Docker hosts</span> → iptables clásico (Docker sigue encadenando ahí).</p>
          <p><span className="text-white">Windows</span> → netsh / GPO / PowerShell New-NetFirewallRule.</p>
          <p className="text-[#777]">
            Y recuerda: el default policy (ACCEPT/DROP) de la cadena importa tanto como las reglas —
            una regla allow no protege nada si la política ya es ACCEPT-all, y un deny final cambia
            el comportamiento de todo lo que no coincidió antes.
          </p>
        </div>
      </details>
    </div>
  );
};

export default SaFirewallTool;
