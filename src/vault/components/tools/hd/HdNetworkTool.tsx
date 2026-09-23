/**
 * HdNetworkTool.tsx — HelpDesk "Network L1 Toolkit" (Task 2-c).
 *
 * Tres pestañas:
 *  1. Intérprete de ipconfig: IP / máscara / gateway / DNS → análisis EN VIVO
 *     con cálculo IPv4 puro (bitwise, sin librerías): clase de red, dirección
 *     de red y broadcast, máscara en /CIDR, gateway dentro/fuera de la subred,
 *     APIPA 169.254.x.x, DNS privado/público y colisión IP=gateway. Además un
 *     textarea para pegar la salida completa de `ipconfig /all` y extraer los
 *     campos automáticamente con regex (IPv4 / Subnet Mask / Default Gateway /
 *     DNS Servers, en inglés y español).
 *  2. Escalera de conectividad: checklist ordenado ping 127.0.0.1 → ping IP
 *     propia → ping gateway → ping 8.8.8.8 → nslookup → ping google.com. El
 *     primer paso fallado define el diagnóstico tentativo (hardware/driver en
 *     los pasos 1-3, routing upstream, DNS...).
 *  3. Wi-Fi y DHCP: pasos rápidos de recuperación + tabla
 *     síntoma → causa probable → comando.
 *
 * [Añadir a Notas] exporta el análisis del intérprete (valores escapados).
 *
 * Diagnóstico educativo: todo el cálculo es local, no se envían pings reales.
 * 100% offline: sin fetch/XHR/WebSocket/eval. Estado 100% React local.
 */
'use client';

import React, { useMemo, useState } from 'react';
import {
  Network, Wifi, Terminal, ClipboardPaste, RotateCcw, BookOpen,
  CheckCircle2, XCircle, AlertTriangle,
} from 'lucide-react';
import {
  inputCls, taCls, btnPrimary, btnGhost, CodeBlock, InfoBanner, Tabs, Field,
  buildNoteHtmlTable, useAddToNoteToast,
} from '../_shared';
import { useNoteStore } from '../../../store/noteStore';
import { escapeHtml } from '../../../utils/escapeHtml';

/* ---------- helpers IPv4 (puro cálculo bitwise, sin librerías) ---------- */

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function parseIPv4(s: string): number | null {
  const m = IPV4_RE.exec(s.trim());
  if (!m) return null;
  const o = [m[1], m[2], m[3], m[4]].map((p) => parseInt(p, 10));
  if (o.some((v) => v > 255)) return null;
  return (((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0);
}

function ipToStr(n: number): string {
  return `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
}

/** Máscara válida = secuencia continua de 1s desde el bit alto. */
function maskToCidr(mask: number): number | null {
  const inv = (~mask) >>> 0;
  if (inv === 0) return 32;
  if (((inv + 1) & inv) !== 0) return null;
  return 32 - Math.round(Math.log2(inv + 1));
}

function octet1(n: number): number { return (n >>> 24) & 255; }
function octet2(n: number): number { return (n >>> 16) & 255; }

function isRfc1918(n: number): boolean {
  const a = octet1(n), b = octet2(n);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}
function isApipa(n: number): boolean { return octet1(n) === 169 && octet2(n) === 254; }
function isLoopback(n: number): boolean { return octet1(n) === 127; }

/* ---------- análisis en vivo: chips de diagnóstico ---------- */

type ChipLevel = 'ok' | 'warn' | 'bad' | 'info';
interface IpChip { id: string; label: string; level: ChipLevel; detail: string; }

const CHIP_CLS: Record<ChipLevel, string> = {
  ok: 'border-green-500/30 bg-green-500/10 text-green-400',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  bad: 'border-red-500/30 bg-red-500/10 text-red-400',
  info: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
};

interface IpAnalysis { chips: IpChip[]; rows: Array<[string, string]>; }

function analyzeIpCfg(ipRaw: string, maskRaw: string, gwRaw: string, dnsRaw: string): IpAnalysis {
  const chips: IpChip[] = [];
  const rows: Array<[string, string]> = [];
  if (ipRaw.trim() === '') return { chips, rows };

  const ipN = parseIPv4(ipRaw);
  const maskN = maskRaw.trim() === '' ? null : parseIPv4(maskRaw);
  const gwN = gwRaw.trim() === '' ? null : parseIPv4(gwRaw);
  const dnsM = /(\d{1,3}(?:\.\d{1,3}){3})/.exec(dnsRaw);
  const dnsN = dnsM ? parseIPv4(dnsM[1]) : null;

  if (ipN === null) {
    chips.push({ id: 'ip', level: 'bad', label: 'IP no válida', detail: 'Formato IPv4 esperado: cuatro octetos 0-255 (ej. 192.168.1.50).' });
    return { chips, rows };
  }
  chips.push({ id: 'ip', level: 'ok', label: 'IP válida', detail: `${ipRaw.trim()} se parsea correctamente como IPv4.` });
  rows.push(['IP', ipRaw.trim()]);

  /* clase de red */
  const a = octet1(ipN);
  let clase: string;
  if (a === 127) clase = 'Loopback';
  else if (a === 0) clase = 'Reservada (0/8)';
  else if (a < 128) clase = 'Clase A';
  else if (a < 192) clase = 'Clase B';
  else if (a < 224) clase = 'Clase C';
  else if (a < 240) clase = 'Clase D (multicast)';
  else clase = 'Clase E (reservada)';
  const priv = isRfc1918(ipN);
  chips.push({
    id: 'clase',
    level: priv || isApipa(ipN) || isLoopback(ipN) ? 'info' : 'warn',
    label: clase,
    detail: priv
      ? 'Privada (RFC1918): solo enrutable dentro de la red local — lo esperado en un equipo de oficina.'
      : isApipa(ipN) ? 'APIPA: autoconfigurada, el DHCP no respondió.'
      : isLoopback(ipN) ? 'Tráfico local: nunca sale del equipo.'
      : 'PÚBLICA: visible desde Internet — muy raro en un equipo de oficina, revisa la config.',
  });
  rows.push(['Clase', clase]);

  /* máscara → red, broadcast, CIDR */
  if (maskN !== null) {
    const cidr = maskToCidr(maskN);
    if (cidr === null) {
      chips.push({ id: 'mask', level: 'bad', label: 'Máscara no contigua', detail: 'Una máscara válida son 1s continuos (255.255.255.0 → /24). Revisa el valor pegado.' });
    } else {
      const net = (ipN & maskN) >>> 0;
      const bcast = (net | ~maskN) >>> 0;
      const hosts = cidr === 32 ? '1 host (ruta de host)' : cidr === 31 ? '2 hosts (enlace punto a punto)' : `${(2 ** (32 - cidr)) - 2} hosts útiles`;
      chips.push({
        id: 'mask',
        level: 'ok',
        label: `Red ${ipToStr(net)}/${cidr}`,
        detail: `Broadcast ${ipToStr(bcast)} · ${hosts} · máscara ${maskRaw.trim()}.`,
      });
      rows.push(['Máscara', `${maskRaw.trim()} (/${cidr})`]);
      rows.push(['Red', ipToStr(net)]);
      rows.push(['Broadcast', ipToStr(bcast)]);

      /* gateway dentro de la subred */
      if (gwN !== null) {
        if (gwN === ipN) {
          chips.push({ id: 'gw', level: 'bad', label: 'Colisión: gateway = IP propia', detail: 'La puerta de enlace es la misma IP del equipo: configuración errónea o dirección duplicada en la red (conflicto ARP).' });
        } else if (((gwN & maskN) >>> 0) === net) {
          chips.push({ id: 'gw', level: 'ok', label: 'Gateway en la subred', detail: 'Comparte prefijo con la IP: el equipo puede alcanzarlo por ARP. Prueba ping desde la escalera de conectividad.' });
        } else {
          chips.push({ id: 'gw', level: 'bad', label: 'Gateway FUERA de la subred', detail: 'La puerta de enlace no comparte prefijo con la IP: revisa máscara y gateway (¿DHCP entregando una config incorrecta?).' });
        }
        rows.push(['Gateway', gwRaw.trim()]);
      } else if (gwRaw.trim() !== '') {
        chips.push({ id: 'gw', level: 'bad', label: 'Gateway no válido', detail: 'No es una IPv4 correcta (ej. 192.168.1.1).' });
      }
    }
  } else if (maskRaw.trim() !== '') {
    chips.push({ id: 'mask', level: 'bad', label: 'Máscara no válida', detail: 'Formato esperado: 255.255.255.0. Sin máscara no puedo calcular red/broadcast.' });
  }

  /* APIPA */
  if (isApipa(ipN)) {
    chips.push({
      id: 'apipa',
      level: 'bad',
      label: 'APIPA — sin DHCP',
      detail: '169.254.x.x = el equipo no recibió respuesta del DHCP: probable fallo de servidor DHCP, cable o puerto. Prueba ipconfig /release + /renew y revisa el LED de link.',
    });
  }

  /* DNS */
  if (dnsRaw.trim() !== '') {
    if (dnsN === null) {
      chips.push({ id: 'dns', level: 'bad', label: 'DNS no válido', detail: 'No se detecta una IPv4 en el campo DNS (ej. 192.168.1.10 o 8.8.8.8).' });
    } else if (isApipa(dnsN)) {
      chips.push({ id: 'dns', level: 'bad', label: 'DNS en APIPA', detail: 'Un DNS 169.254.x.x es inválido: el DHCP no está entregando opciones. ipconfig /flushdns + /renew.' });
    } else if (isLoopback(dnsN)) {
      chips.push({ id: 'dns', level: 'warn', label: 'DNS loopback (127.x)', detail: 'Resolución local (proxy DNS en el propio equipo): solo válido si la política corporativa lo dice.' });
    } else if (isRfc1918(dnsN)) {
      chips.push({ id: 'dns', level: 'ok', label: 'DNS privado válido', detail: 'RFC1918: el DNS interno corporativo. Lo esperado en red de empresa.' });
    } else {
      chips.push({ id: 'dns', level: 'info', label: 'DNS público', detail: 'Resuelve, pero en red corporativa el esperado suele ser interno — confirma con L2 si es config residual.' });
    }
    rows.push(['DNS', dnsRaw.trim()]);
  }

  return { chips, rows };
}

/* ---------- extracción por regex de `ipconfig /all` ---------- */

interface ExtractedIpconfig { ip: string; mask: string; gw: string; dns: string[]; found: string[]; }

function extractIpconfigAll(text: string): ExtractedIpconfig {
  const lines = text.split(/\r?\n/);
  const ipAny = /(\d{1,3}(?:\.\d{1,3}){3})/;
  let ip = '', mask = '', gw = '';
  const dns: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (ip === '' && /ipv4|direcci[oó]n ipv4/i.test(l)) {
      const m = ipAny.exec(l);
      if (m) ip = m[1];
    } else if (mask === '' && /subnet mask|m[aá]scara de subred/i.test(l)) {
      const m = ipAny.exec(l);
      if (m) mask = m[1];
    } else if (gw === '' && /default gateway|puerta de enlace/i.test(l)) {
      const m = ipAny.exec(l);
      if (m) gw = m[1];
    } else if (/dns servers|servidores dns/i.test(l)) {
      const m = ipAny.exec(l);
      if (m) dns.push(m[1]);
      for (let j = i + 1; j < lines.length && dns.length < 3; j++) {
        const nxt = lines[j].trim();
        if (nxt === '') break;
        const only = /^(\d{1,3}(?:\.\d{1,3}){3})$/.exec(nxt);
        if (!only) break;
        dns.push(only[1]);
      }
    }
  }
  const found: string[] = [];
  if (ip) found.push('IPv4');
  if (mask) found.push('Máscara');
  if (gw) found.push('Gateway');
  if (dns.length > 0) found.push(`DNS (${dns.join(', ')})`);
  return { ip, mask, gw, dns, found };
}

/* ---------- escalera de conectividad ---------- */

interface LadderStep { id: string; title: string; cmd: string; means: string; }

const LADDER_DIAG: Record<string, { title: string; detail: string; actions: string[] }> = {
  s1: {
    title: 'Pila TCP/IP del equipo no responde',
    detail: 'ping 127.0.0.1 falla → el stack TCP/IP local está dañado (winsock/catálogo de red corrupto). No es problema de cable ni de red externa.',
    actions: [
      'Reiniciar el equipo (primera opción).',
      'netsh winsock reset + netsh int ip reset + reiniciar.',
      'Si persiste: escalar a L2 (posible imagen corrupta).',
    ],
  },
  s2: {
    title: 'IP propia no responde — hardware/driver de NIC',
    detail: 'El equipo no contesta a su propia IP: IP mal asignada (APIPA), driver de la tarjeta de red o NIC deshabilitada.',
    actions: [
      'ipconfig /release + ipconfig /renew.',
      'devmgmt.msc → adaptador de red: driver con ⚠ o deshabilitado → reinstalar/rollback.',
      'Wi-Fi: netsh wlan disconnect y reconectar; olvidar la red y re-autenticar.',
    ],
  },
  s3: {
    title: 'Red local inaccesible — capa física / gateway',
    detail: 'El equipo está vivo pero no alcanza la puerta de enlace: cable, puerto de switch, AP o el propio gateway caído.',
    actions: [
      'Revisar LED de link del cable / probar otro puerto o cable.',
      'ipconfig /renew (descarta lease roto) y olvidar red + reconectar (Wi-Fi).',
      'Probar desde otro equipo del mismo segmento: si también falla → gateway/switch, escalar a L2-Redes.',
    ],
  },
  s4: {
    title: 'Routing upstream / NAT / ISP',
    detail: 'Llegas al gateway pero no a Internet por IP: el problema está más allá de tu segmento (router de salida, NAT, proxy o ISP).',
    actions: [
      'Verificar si la salida a Internet requiere proxy/VPN corporativa.',
      'tracert 8.8.8.8 → localizar dónde se corta.',
      'Escalar a L2-Redes con la salida de tracert.',
    ],
  },
  s5: {
    title: 'Resolución DNS',
    detail: 'Internet OK por IP (8.8.8.8) pero nslookup falla: DNS roto o inalcanzable. El problema es de nombres, no de conectividad.',
    actions: [
      'ipconfig /flushdns.',
      'Probar DNS público temporal: netsh interface ip set dns "Ethernet" static 8.8.8.8.',
      'Comprobar qué DNS entrega el DHCP: ipconfig /all.',
      'Si el DNS interno falla para todos: escalar (servidor DNS caído).',
    ],
  },
  s6: {
    title: 'Caché / hosts vs resolución real',
    detail: 'nslookup OK pero ping por nombre falla: entrada obsoleta en caché, registro en el fichero hosts o sufijo DNS mal resuelto.',
    actions: [
      'ipconfig /flushdns.',
      'Revisar C:\\Windows\\System32\\drivers\\etc\\hosts (lectura).',
      'ipconfig /all → comprobar sufijo DNS y servidor asignado.',
    ],
  },
};

/* ---------- Wi-Fi / DHCP ---------- */

const WIFI_STEPS: ReadonlyArray<{ title: string; body: string; cmds?: string[] }> = [
  { title: '1. Modo avión / radio Wi-Fi', body: 'Modo avión OFF y Wi-Fi ON (icono de red). Suena obvio, pero es el 20% de los casos.' },
  { title: '2. Olvidar la red y reconectar', body: 'Configuración → Red e Internet → Wi-Fi → Administrar redes conocidas → Olvidar. Vuelve a conectar con las credenciales corporativas.' },
  { title: '3. Renovar IP y limpiar DNS', body: 'Fuerza un lease DHCP nuevo y vacía la caché de resolución.', cmds: ['ipconfig /release', 'ipconfig /renew', 'ipconfig /flushdns'] },
  { title: '4. Estado de la interfaz y perfiles', body: '"show interfaces" muestra SSID, señal, canal y banda (señal ≈ -80 dBm = mala); "show profiles" lista las redes guardadas.', cmds: ['netsh wlan show interfaces', 'netsh wlan show profiles'] },
  { title: '5. Driver inalámbrico', body: 'devmgmt.msc → Adaptadores de red → driver Wi-Fi: actualizar, rollback o reinstalar. Si otro equipo igual funciona, compara versiones de driver.' },
  { title: '6. "Wi-Fi lento lejos del router"', body: 'La banda de 5 GHz es rápida pero penetra mal: a dos paredes del AP, 2.4 GHz suele rendir más. Confírmalo con el canal/banda de netsh wlan show interfaces.' },
];

const WIFI_SYMPTOMS: ReadonlyArray<{ s: string; c: string; cmd: string }> = [
  { s: 'Se conecta pero "Sin Internet"', c: 'Gateway caído o IP APIPA (sin DHCP)', cmd: 'ipconfig /all → buscar 169.254.x.x' },
  { s: 'Wi-Fi lento lejos del AP', c: 'Banda 5 GHz con poco alcance o señal débil', cmd: 'netsh wlan show interfaces' },
  { s: 'No aparece el SSID corporativo', c: 'Red solo en 5 GHz y tarjeta que solo ve 2.4 GHz, o SSID oculto', cmd: 'netsh wlan show networks' },
  { s: 'Se desconecta intermitentemente', c: 'Canal saturado o ahorro de energía de la NIC', cmd: 'netsh wlan show interfaces · powercfg /a' },
  { s: 'Bucle de autenticación', c: 'Credenciales 802.1X o certificado caducado', cmd: 'Olvidar red + re-autenticar · certlm.msc' },
  { s: 'IP 169.254.x.x (APIPA)', c: 'DHCP no responde (servidor, cable, puerto o VLAN)', cmd: 'ipconfig /release && ipconfig /renew' },
];

/* ---------- componente principal ---------- */

export const HdNetworkTool: React.FC = () => {
  const [tab, setTab] = useState('ip');
  const [ip, setIp] = useState('');
  const [mask, setMask] = useState('');
  const [gw, setGw] = useState('');
  const [dns, setDns] = useState('');
  const [paste, setPaste] = useState('');
  const [extracted, setExtracted] = useState<ExtractedIpconfig | null>(null);
  const [ladder, setLadder] = useState<Record<string, 'ok' | 'fail'>>({});
  const { addedToast, showToast } = useAddToNoteToast();

  const analysis = useMemo(() => analyzeIpCfg(ip, mask, gw, dns), [ip, mask, gw, dns]);

  const ladderSteps: ReadonlyArray<LadderStep> = [
    { id: 's1', title: '1 · Pila TCP/IP (loopback)', cmd: 'ping 127.0.0.1', means: 'FALLA → el stack TCP/IP del propio equipo está dañado; nada por debajo será fiable. OK → sigue.' },
    { id: 's2', title: '2 · IP propia', cmd: ip.trim() ? `ping ${ip.trim()}` : 'ping <tu-IP-de-ipconfig>', means: 'FALLA → IP mal asignada (APIPA) o driver/NIC: hardware y driver antes que culpar a la red. OK → el host está configurado.' },
    { id: 's3', title: '3 · Gateway', cmd: gw.trim() ? `ping ${gw.trim()}` : 'ping <gateway>', means: 'OK → el segmento local funciona (switch/AP). FALLA → capa física o gateway caído: cable, puerto, AP.' },
    { id: 's4', title: '4 · Internet por IP', cmd: 'ping 8.8.8.8', means: 'Gateway OK pero 8.8.8.8 falla → problema de routing upstream/NAT/proxy/ISP, no del equipo. OK → la ruta a Internet viva.' },
    { id: 's5', title: '5 · DNS (nslookup)', cmd: 'nslookup google.com', means: '8.8.8.8 OK pero nslookup falla → DNS: ipconfig /flushdns y probar 8.8.8.8 como DNS temporal. OK → el resolver funciona.' },
    { id: 's6', title: '6 · Nombre → IP', cmd: 'ping google.com', means: 'nslookup OK pero ping por nombre falla → caché/hosts/sufijo DNS. Todo OK → la red está sana: el problema es de la aplicación.' },
  ];

  const firstFail = ladderSteps.find((s) => ladder[s.id] === 'fail');
  const allOk = ladderSteps.every((s) => ladder[s.id] === 'ok');
  const anyMarked = ladderSteps.some((s) => ladder[s.id] !== undefined);

  const toggleStep = (id: string, status: 'ok' | 'fail'): void => {
    setLadder((prev) => {
      const next = { ...prev };
      if (next[id] === status) delete next[id];
      else next[id] = status;
      return next;
    });
  };

  const runExtract = (): void => {
    const ex = extractIpconfigAll(paste);
    setExtracted(ex);
    if (ex.ip) setIp(ex.ip);
    if (ex.mask) setMask(ex.mask);
    if (ex.gw) setGw(ex.gw);
    if (ex.dns.length > 0) setDns(ex.dns.join(', '));
  };

  const addToNote = (): void => {
    if (analysis.rows.length === 0) return;
    const rows = analysis.rows.map(([k, v]) => [escapeHtml(k), escapeHtml(v)] as [string, string]);
    useNoteStore.getState().enqueueNote(`ipconfig — ${ip.trim()}`, buildNoteHtmlTable(rows));
    showToast();
  };

  return (
    <div className="space-y-3">
      <InfoBanner>
        Diagnóstico educativo — todo el cálculo es local: no se envían pings
        reales ni se consulta ningún servidor. Comandos listados para copiar y
        ejecutarlos TÚ en el equipo del usuario.
      </InfoBanner>

      <Tabs
        tabs={[
          { id: 'ip', label: 'Intérprete de ipconfig', icon: <Network className="w-3.5 h-3.5" /> },
          { id: 'ladder', label: 'Escalera de conectividad', icon: <Terminal className="w-3.5 h-3.5" /> },
          { id: 'wifi', label: 'Wi-Fi y DHCP', icon: <Wifi className="w-3.5 h-3.5" /> },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ---------------- Tab 1: intérprete de ipconfig ---------------- */}
      {tab === 'ip' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Dirección IP">
              <input value={ip} onChange={(e) => setIp(e.target.value)} className={inputCls} placeholder="192.168.1.50" aria-label="Dirección IP" />
            </Field>
            <Field label="Máscara de subred">
              <input value={mask} onChange={(e) => setMask(e.target.value)} className={inputCls} placeholder="255.255.255.0" aria-label="Máscara de subred" />
            </Field>
            <Field label="Puerta de enlace (gateway)">
              <input value={gw} onChange={(e) => setGw(e.target.value)} className={inputCls} placeholder="192.168.1.1" aria-label="Puerta de enlace" />
            </Field>
            <Field label="DNS" hint="Puedes pegar varios separados por comas — se analiza el primero.">
              <input value={dns} onChange={(e) => setDns(e.target.value)} className={inputCls} placeholder="192.168.1.10, 8.8.8.8" aria-label="Servidores DNS" />
            </Field>
          </div>

          {analysis.chips.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Análisis en vivo</div>
              <div className="flex flex-col gap-1.5">
                {analysis.chips.map((c) => (
                  <div key={c.id} className={`border rounded px-2.5 py-1.5 space-y-0.5 ${CHIP_CLS[c.level]}`}>
                    <div className="text-[11px] font-bold">{c.label}</div>
                    <div className="text-[10px] text-[#AAA] leading-relaxed">{c.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {analysis.chips.length === 0 && (
            <p className="text-[10px] text-[#666]">Introduce al menos la IP para ver el análisis en vivo (rojo = bloqueante, ámbar = revisar, verde = correcto).</p>
          )}

          <div className="pt-1 border-t border-[#1A1A1A] space-y-2">
            <Field label="Pegar salida completa de ipconfig /all (opcional)">
              <textarea
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                className={`${taCls} min-h-[110px]`}
                placeholder={'Windows IP Configuration\n\nEthernet adapter Ethernet:\n\n   IPv4 Address. . . . . . . . . . . : 192.168.1.50\n   Subnet Mask . . . . . . . . . . . : 255.255.255.0\n   Default Gateway . . . . . . . . . : 192.168.1.1\n   DNS Servers . . . . . . . . . . . : 192.168.1.10'}
                aria-label="Salida de ipconfig /all"
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={runExtract}
                disabled={paste.trim() === ''}
                className={`${btnPrimary} inline-flex items-center gap-1.5`}
                title="Extraer IPv4, máscara, gateway y DNS con regex"
              >
                <ClipboardPaste className="w-3.5 h-3.5" /> Extraer campos
              </button>
              <button
                type="button"
                onClick={addToNote}
                disabled={analysis.rows.length === 0}
                className={`${btnGhost} inline-flex items-center gap-1.5`}
                title="Exportar el análisis a Notas"
              >
                <BookOpen className="w-3.5 h-3.5" /> Añadir a Notas
              </button>
            </div>
            {extracted && extracted.found.length > 0 && (
              <InfoBanner>Extraído automáticamente: {extracted.found.join(' · ')} — los campos se han rellenado arriba.</InfoBanner>
            )}
            {extracted && extracted.found.length === 0 && (
              <InfoBanner>No se detectaron campos IPv4 en el texto pegado. Comprueba que sea la salida de ipconfig /all.</InfoBanner>
            )}
          </div>
          {addedToast && <InfoBanner>Añadido a Notas — crea una nota nueva para verlo.</InfoBanner>}
        </div>
      )}

      {/* ---------------- Tab 2: escalera de conectividad ---------------- */}
      {tab === 'ladder' && (
        <div className="space-y-3">
          <p className="text-[11px] text-[#888] leading-relaxed">
            Marca cada paso según el resultado REAL en el equipo del usuario
            (pulsa de nuevo para desmarcar). El primer paso fallado define el
            diagnóstico tentativo; lo que hay por debajo no importa hasta
            arreglarlo.
          </p>

          {ladderSteps.map((s, i) => {
            const status = ladder[s.id];
            const belowFail = firstFail !== undefined && i > ladderSteps.findIndex((x) => x.id === firstFail.id);
            return (
              <div
                key={s.id}
                className={`bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2 transition-opacity ${belowFail ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-bold text-white">{s.title}</span>
                  {status === 'ok' && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-500/15 border border-green-500/30 text-green-400 shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> OK
                    </span>
                  )}
                  {status === 'fail' && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-400 shrink-0">
                      <XCircle className="w-3 h-3" /> FALLA
                    </span>
                  )}
                </div>
                <CodeBlock code={s.cmd} label="Comando" lang="cmd" />
                <p className="text-[10px] text-[#AAA] leading-relaxed">{s.means}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleStep(s.id, 'ok')}
                    aria-pressed={status === 'ok'}
                    title="Marcar el paso como superado"
                    className="px-2 py-1 rounded text-[10px] font-semibold bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 transition-colors cursor-pointer"
                  >
                    ✓ OK
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleStep(s.id, 'fail')}
                    aria-pressed={status === 'fail'}
                    title="Marcar el paso como fallido"
                    className="px-2 py-1 rounded text-[10px] font-semibold bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-colors cursor-pointer"
                  >
                    ✗ Falla
                  </button>
                </div>
              </div>
            );
          })}

          {firstFail && (
            <div className="border border-red-500/40 bg-red-500/10 rounded p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Diagnóstico tentativo: {LADDER_DIAG[firstFail.id].title}
              </div>
              <p className="text-[11px] text-[#AAA] leading-relaxed">{LADDER_DIAG[firstFail.id].detail}</p>
              <ul className="space-y-1">
                {LADDER_DIAG[firstFail.id].actions.map((a, i) => (
                  <li key={i} className="text-[11px] text-[#DDD] flex items-start gap-1.5">
                    <span className="text-red-400 shrink-0">{i + 1}.</span> {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!firstFail && allOk && (
            <div className="border border-green-500/40 bg-green-500/10 rounded p-3 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-green-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Conectividad completa
              </div>
              <p className="text-[11px] text-[#AAA] leading-relaxed">
                Los 6 pasos OK: la red del equipo está sana. Si el usuario aún
                tiene el problema, es de la aplicación o del servicio, no de red.
              </p>
            </div>
          )}
          {!firstFail && !allOk && anyMarked && (
            <p className="text-[10px] text-[#666]">Continúa con el siguiente paso pendiente — aún no hay fallos marcados.</p>
          )}
          {!anyMarked && (
            <p className="text-[10px] text-[#666]">Empieza por el paso 1 y baja en orden: cada paso descarta una capa.</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLadder({})}
              className={`${btnGhost} inline-flex items-center gap-1.5`}
              title="Reiniciar el checklist de la escalera"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reiniciar escalera
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Tab 3: Wi-Fi y DHCP ---------------- */}
      {tab === 'wifi' && (
        <div className="space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Pasos rápidos de recuperación</div>
          {WIFI_STEPS.map((s) => (
            <div key={s.title} className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-1.5 hover:border-blue-500/40 transition-colors">
              <div className="text-[11px] font-bold text-white">{s.title}</div>
              <p className="text-[10px] text-[#AAA] leading-relaxed">{s.body}</p>
              {s.cmds && <CodeBlock code={s.cmds.join('\n')} label="Comandos" lang="cmd" />}
            </div>
          ))}

          <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] pt-1">Síntoma → causa probable → comando</div>
          <div className="overflow-x-auto border border-[#262626] rounded">
            <table className="w-full text-[10px] border-collapse">
              <thead className="bg-[#161616]">
                <tr>
                  <th className="px-2 py-1.5 text-left text-[#888] uppercase tracking-wider font-bold border-b border-[#262626]">Síntoma</th>
                  <th className="px-2 py-1.5 text-left text-[#888] uppercase tracking-wider font-bold border-b border-[#262626]">Causa probable</th>
                  <th className="px-2 py-1.5 text-left text-[#888] uppercase tracking-wider font-bold border-b border-[#262626]">Comando</th>
                </tr>
              </thead>
              <tbody>
                {WIFI_SYMPTOMS.map((r) => (
                  <tr key={r.s} className="border-b border-[#1A1A1A] hover:bg-[#161616] transition-colors">
                    <td className="px-2 py-1.5 text-white">{r.s}</td>
                    <td className="px-2 py-1.5 text-[#AAA]">{r.c}</td>
                    <td className="px-2 py-1.5 text-green-300 font-mono break-all">{r.cmd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

