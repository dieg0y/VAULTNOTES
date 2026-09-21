/**
 * HdSanitizerTool.tsx — HelpDesk "System Info Sanitizer" (Task 2-c).
 *
 * Pega texto técnico (msinfo32 / ipconfig /all / systeminfo / dxdiag / salida
 * de tickets) → detección 100% regex local de:
 *  - IP (públicas SIEMPRE redactadas; privadas RFC1918/loopback/APIPA/
 *    multicast/reservadas opcionales),
 *  - MAC (pares hex con : o -), emails, SIDs de dominio,
 *  - nombres de equipo (HOST NAME:, Computer Name:, UNC \\\\equipo\\),
 *  - usuarios (C:\\Users\\x, "Nombre de usuario:", logged user),
 *  - números de serie / asset tag / etiquetas [A-Z]{2}\\d{6},
 *  - claves de producto (5 grupos de 5), dominios internos (.local/.corp/.internal).
 *
 * Cada categoría lleva checkbox incluir/excluir; los reemplazos son
 * consistentes y numerados ([NOMBRE-EQUIPO-1], [IP-PUBLICA-1], ...): el mismo
 * valor real → el mismo placeholder. Salida sanitizada en CodeBlock + Copy.
 *
 * Privacidad: el texto pegado NO se persiste ni se envía — vive solo en el
 * state de React de esta pestaña. Esta tool no escribe en notas/IndexedDB.
 * 100% offline: sin fetch/XHR/WebSocket/eval.
 */
'use client';

import React, { useMemo, useState } from 'react';
import { Search, Trash2, FileText, ClipboardPaste } from 'lucide-react';
import {
  taCls, btnPrimary, btnGhost, CodeBlock, InfoBanner,
} from '../_shared';

/* ---------- categorías ---------- */

type SanCat = 'ip-pub' | 'ip-priv' | 'mac' | 'email' | 'sid' | 'serial' | 'pkey' | 'domain' | 'host' | 'user';

interface CatDef {
  id: SanCat;
  label: string;
  desc: string;
  ph: (n: number) => string;
  lock?: boolean;
}

const CATS: ReadonlyArray<CatDef> = [
  { id: 'ip-pub', label: 'IP pública', desc: 'No RFC1918/loopback/APIPA — se redacta SIEMPRE.', ph: (n) => `[IP-PUBLICA-${n}]`, lock: true },
  { id: 'ip-priv', label: 'IP privada', desc: 'RFC1918, loopback, APIPA, multicast — opcional ofuscar.', ph: (n) => `[IP-PRIVADA-${n}]` },
  { id: 'mac', label: 'MAC', desc: '6 pares hex separados por : o -.', ph: (n) => `[MAC-${n}]` },
  { id: 'email', label: 'Email', desc: 'Cualquier dirección de correo.', ph: (n) => `[EMAIL-${n}]` },
  { id: 'sid', label: 'SID de dominio', desc: 'S-1-5-21-…-RID.', ph: (n) => `[SID-${n}]` },
  { id: 'serial', label: 'Serie / asset tag', desc: 'Serial Number, Service/Asset Tag, etiquetas AB123456.', ph: (n) => `[SERIE-${n}]` },
  { id: 'pkey', label: 'Clave de producto', desc: '5 grupos de 5 (XXXXX-XXXXX-XXXXX-XXXXX-XXXXX).', ph: (n) => `[CLAVE-PRODUCTO-${n}]` },
  { id: 'domain', label: 'Dominio interno', desc: '.local / .corp / .internal.', ph: (n) => `[DOMINIO-INTERNO-${n}]` },
  { id: 'host', label: 'Nombre de equipo', desc: 'HOST NAME:, Computer Name:, UNC \\\\equipo\\.', ph: (n) => `[NOMBRE-EQUIPO-${n}]` },
  { id: 'user', label: 'Usuario', desc: 'C:\\Users\\x, "Nombre de usuario:", logged user.', ph: (n) => `[USUARIO-${n}]` },
];

const CAT_PRIORITY: ReadonlyArray<SanCat> = ['pkey', 'email', 'sid', 'mac', 'ip-pub', 'ip-priv', 'serial', 'host', 'domain', 'user'];

interface RawMatch { start: number; end: number; cat: SanCat; value: string; }

/* ---------- detección por regex ---------- */

function ipScope(s: string): SanCat {
  const o = s.split('.').map((p) => parseInt(p, 10));
  const a = o[0];
  const b = o[1];
  if (a === 127 || a === 0 || a >= 224) return 'ip-priv'; /* loopback, reservada, multicast */
  if (a === 169 && b === 254) return 'ip-priv'; /* APIPA / link-local */
  if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return 'ip-priv';
  return 'ip-pub';
}

function isValidIp(s: string): boolean {
  return s.split('.').every((p) => {
    const n = parseInt(p, 10);
    return p.length <= 3 && !Number.isNaN(n) && n <= 255 && p !== '';
  });
}

function findRawMatches(text: string): RawMatch[] {
  const raw: RawMatch[] = [];
  const push = (cat: SanCat, start: number, end: number, value: string): void => {
    /* dedupe de coincidencias exactas (misma categoría + mismo rango): p. ej.
       "Asset Tag: HQ447291" casan tanto la regex con etiqueta como la de tag. */
    if (raw.some((x) => x.cat === cat && x.start === start && x.end === end)) return;
    raw.push({ cat, start, end, value });
  };
  const pushCapture = (cat: SanCat, m: RegExpExecArray, group: string): void => {
    const idx = m.index ?? 0;
    const rel = m[0].indexOf(group);
    if (rel >= 0) push(cat, idx + rel, idx + rel + group.length, group);
  };

  /* claves de producto (antes que serie: 5 grupos de 5) */
  for (const m of text.matchAll(/\b[A-Z0-9]{5}(?:-[A-Z0-9]{5}){4}\b/g)) {
    push('pkey', m.index ?? 0, (m.index ?? 0) + m[0].length, m[0]);
  }
  /* emails */
  for (const m of text.matchAll(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g)) {
    push('email', m.index ?? 0, (m.index ?? 0) + m[0].length, m[0]);
  }
  /* SIDs de dominio */
  for (const m of text.matchAll(/\bS-1-5-21(?:-\d{1,10}){2,8}\b/g)) {
    push('sid', m.index ?? 0, (m.index ?? 0) + m[0].length, m[0]);
  }
  /* MAC: 6 pares hex con : o - (captura para no partir IPv6) */
  for (const m of text.matchAll(/(?:^|[^0-9A-Fa-f])((?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2})(?![0-9A-Fa-f])/g)) {
    if (m[1] !== undefined) pushCapture('mac', m, m[1]);
  }
  /* IPs */
  for (const m of text.matchAll(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/g)) {
    if (m[1] === undefined || !isValidIp(m[1])) continue;
    push(ipScope(m[1]), m.index ?? 0, (m.index ?? 0) + m[1].length, m[1]);
  }
  /* serie / asset tag con etiqueta */
  for (const m of text.matchAll(/(?:serial(?:\s*(?:number|no\.?))?|service\s*tag|asset\s*tag)\s*[:=]?\s*([A-Za-z0-9][A-Za-z0-9-]{3,19})/gi)) {
    if (m[1] !== undefined) pushCapture('serial', m, m[1]);
  }
  /* etiquetas tipo AB123456 (se excluyen KB de Windows Update) */
  for (const m of text.matchAll(/\b[A-Z]{2}\d{6}\b/g)) {
    if (m[0].startsWith('KB')) continue;
    push('serial', m.index ?? 0, (m.index ?? 0) + m[0].length, m[0]);
  }
  /* nombres de equipo con etiqueta (incluye FQDN) */
  for (const m of text.matchAll(/(?:host\s*name|computer\s*name|nombre\s+del\s+equipo)\s*[:=]\s*([A-Za-z0-9][A-Za-z0-9-_.]{0,30})/gi)) {
    if (m[1] !== undefined) pushCapture('host', m, m[1]);
  }
  /* servidor UNC \\equipo\... */
  for (const m of text.matchAll(/\\\\([A-Za-z0-9][A-Za-z0-9-_.]{0,30})\\/g)) {
    if (m[1] !== undefined) pushCapture('host', m, m[1]);
  }
  /* dominios internos */
  for (const m of text.matchAll(/\b(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,30}\.)){1,3}(?:local|corp|internal)\b/g)) {
    push('domain', m.index ?? 0, (m.index ?? 0) + m[0].length, m[0]);
  }
  /* usuarios: cuentas DOMINIO\usuario tras etiqueta ("User Name: corp\jperez") */
  const userLabelRe = /(?:nombre\s+de\s+usuario|user\s*name|logged(?:\s*on)?\s*user)\s*[:=]?\s*([A-Za-z0-9][A-Za-z0-9 ._-]{0,30}(?:\\[A-Za-z0-9][A-Za-z0-9._-]{0,30})?)/gi;
  for (const m of text.matchAll(userLabelRe)) {
    if (m[1] !== undefined) pushCapture('user', m, m[1].replace(/\s+$/, ''));
  }
  /* usuarios: perfil local C:\Users\nombre (captura solo el nombre, no la ruta) */
  for (const m of text.matchAll(/c:\\users\\([A-Za-z0-9][A-Za-z0-9 ._-]{0,30})/gi)) {
    if (m[1] !== undefined) pushCapture('user', m, m[1].replace(/\s+$/, ''));
  }
  return raw;
}

/* ---------- numeración estable por valor ---------- */

function assignNumbers(raw: RawMatch[]): Map<string, string> {
  const map = new Map<string, string>();
  const counters: Partial<Record<SanCat, number>> = {};
  for (const def of CATS) {
    const list = raw.filter((m) => m.cat === def.id).sort((a, b) => a.start - b.start);
    for (const m of list) {
      const key = `${m.cat}|${m.value}`;
      if (map.has(key)) continue;
      const n = (counters[def.id] ?? 0) + 1;
      counters[def.id] = n;
      map.set(key, def.ph(n));
    }
  }
  return map;
}

/* ---------- resolución de solapes + sanitizado ---------- */

interface ActiveMatch extends RawMatch { ph: string; }

function resolveActive(raw: RawMatch[], enabled: Record<SanCat, boolean>, phMap: Map<string, string>): ActiveMatch[] {
  const enabledMatches = raw.filter((m) => enabled[m.cat]);
  const sorted = [...enabledMatches].sort((a, b) => {
    const pa = CAT_PRIORITY.indexOf(a.cat);
    const pb = CAT_PRIORITY.indexOf(b.cat);
    if (pa !== pb) return pa - pb;
    return a.start - b.start;
  });
  const accepted: ActiveMatch[] = [];
  for (const m of sorted) {
    const overlaps = accepted.some((x) => m.start < x.end && m.end > x.start);
    if (overlaps) continue;
    const ph = phMap.get(`${m.cat}|${m.value}`) ?? '[REDACTADO]';
    accepted.push({ ...m, ph });
  }
  accepted.sort((a, b) => a.start - b.start);
  return accepted;
}

function applySanitize(text: string, active: ActiveMatch[]): string {
  let out = text;
  for (const m of [...active].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, m.start) + m.ph + out.slice(m.end);
  }
  return out;
}

/* ---------- ejemplo (datos 100% ficticios) ---------- */

const SAMPLE_TEXT = [
  'Host Name:                 DESKTOP-FIN42',
  'OS Name:                   Microsoft Windows 11 Pro',
  'System Manufacturer:       Dell Inc.',
  'Serial Number:             7BXK23M',
  'User Name:                 nexora\\lmartinez',
  'C:\\Users\\lmartinez\\AppData\\Roaming',
  'Default Gateway: 192.168.10.1',
  'DNS Servers: 10.20.30.11',
  'IP publica de la reunion: 88.24.115.87',
  'MAC: D4-BE-D9-E8-F7-22',
  'Email del usuario: luis.martinez@nexora-corp.internal',
  'SID: S-1-5-21-3623811015-3361044348-30300820-1013',
  'Product Key: A12BC-34DEF-56GHJ-78KLM-90NPQ',
  'Share: \\\\FILESRV01\\Recursos',
  'Asset Tag: HQ447291',
].join('\n');

const WARN_BANNER_CLS =
  'px-3 py-2 rounded border border-amber-500/40 bg-amber-500/10 text-amber-400 text-[11px] font-medium leading-relaxed';

/* ---------- componente ---------- */

export const HdSanitizerTool: React.FC = () => {
  const [text, setText] = useState('');
  const [raw, setRaw] = useState<RawMatch[] | null>(null);
  const [enabled, setEnabled] = useState<Record<SanCat, boolean>>({
    'ip-pub': true,
    'ip-priv': false, /* por defecto las privadas se mantienen */
    mac: true,
    email: true,
    sid: true,
    serial: true,
    pkey: true,
    domain: true,
    host: true,
    user: true,
  });

  const analyze = (): void => {
    setRaw(findRawMatches(text));
  };

  const clear = (): void => {
    setText('');
    setRaw(null);
  };

  const phMap = useMemo(() => (raw ? assignNumbers(raw) : new Map<string, string>()), [raw]);
  const active = useMemo(
    () => (raw ? resolveActive(raw, enabled, phMap) : []),
    [raw, enabled, phMap],
  );
  const sanitized = useMemo(
    () => (raw ? applySanitize(text, active) : ''),
    [text, raw, active],
  );

  const rawCounts = useMemo(() => {
    const counts: Record<SanCat, number> = {
      'ip-pub': 0, 'ip-priv': 0, mac: 0, email: 0, sid: 0, serial: 0, pkey: 0, domain: 0, host: 0, user: 0,
    };
    if (raw) for (const m of raw) counts[m.cat] += 1;
    return counts;
  }, [raw]);

  /* reemplazos agrupados por placeholder (mismo valor → mismo placeholder) */
  const replacementRows = useMemo(() => {
    const byPh = new Map<string, { value: string; ph: string; count: number }>();
    for (const m of active) {
      const cur = byPh.get(m.ph);
      if (cur) cur.count += 1;
      else byPh.set(m.ph, { value: m.value, ph: m.ph, count: 1 });
    }
    return [...byPh.values()];
  }, [active]);

  const toggleCat = (cat: SanCat): void => {
    setEnabled((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const totalDetected = raw ? raw.length : 0;

  return (
    <div className="space-y-3">
      <div className={WARN_BANNER_CLS} role="alert">
        No garantiza anonimización perfecta: revisa el resultado antes de
        compartirlo. Los patrones cubren los formatos más comunes, no todos.
      </div>
      <InfoBanner>
        Análisis 100% local con regex: el texto pegado no se guarda ni se envía
        — vive solo en la memoria de esta pestaña (esta tool no escribe notas
        ni base de datos).
      </InfoBanner>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className={`${taCls} min-h-[140px]`}
        placeholder={'Pega aquí la salida técnica (msinfo32, ipconfig /all, systeminfo, dxdiag, texto del ticket)...'}
        aria-label="Texto técnico a sanitizar"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={analyze}
          disabled={text.trim() === ''}
          className={`${btnPrimary} inline-flex items-center gap-1.5`}
          title="Detectar información sensible con regex locales"
        >
          <Search className="w-3.5 h-3.5" /> Analizar
        </button>
        <button
          type="button"
          onClick={() => { setText(SAMPLE_TEXT); setRaw(null); }}
          className={`${btnGhost} inline-flex items-center gap-1.5`}
          title="Cargar un ejemplo con datos ficticios"
        >
          <FileText className="w-3.5 h-3.5" /> Cargar ejemplo
        </button>
        <button
          type="button"
          onClick={clear}
          className={`${btnGhost} inline-flex items-center gap-1.5`}
          title="Limpiar texto y resultados"
        >
          <Trash2 className="w-3.5 h-3.5" /> Limpiar
        </button>
      </div>

      {raw !== null && (
        <div className="space-y-3">
          {/* información detectada, agrupada por categoría */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
              Información sensible detectada ({totalDetected} hallazgos)
            </div>
            {totalDetected === 0 && (
              <p className="text-[11px] text-[#666]">
                Sin hallazgos: o el texto ya está limpio, o usa formatos no
                cubiertos. Revisa a mano antes de compartir.
              </p>
            )}
            {CATS.filter((c) => rawCounts[c.id] > 0).map((c) => (
              <div key={c.id} className="flex items-center gap-2.5 bg-[#0D0D0D] border border-[#262626] rounded px-2.5 py-1.5">
                <input
                  id={`san-${c.id}`}
                  type="checkbox"
                  checked={Boolean(enabled[c.id])}
                  disabled={c.lock === true}
                  onChange={() => toggleCat(c.id)}
                  className="accent-blue-500 w-3.5 h-3.5 shrink-0 cursor-pointer"
                  aria-label={`Incluir ${c.label} en el texto sanitizado`}
                />
                <label htmlFor={`san-${c.id}`} className="text-[11px] text-[#DDD] cursor-pointer flex-1">
                  {c.label}
                  <span className="text-[#666] text-[10px] ml-1.5">— {c.desc}</span>
                </label>
                <span className="text-[10px] font-mono text-blue-300 shrink-0">
                  {rawCounts[c.id]} × {c.ph(1).replace('-1', '-n')}
                </span>
                {c.lock === true && <ClipboardPaste className="w-3 h-3 text-amber-400 shrink-0" aria-hidden="true" />}
              </div>
            ))}
          </div>

          {/* reemplazos antes → después */}
          {replacementRows.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
                Campos eliminados / reemplazados
              </div>
              <div className="bg-[#0D0D0D] border border-[#262626] rounded divide-y divide-[#1A1A1A]">
                {replacementRows.map((r) => (
                  <div key={r.ph} className="px-2.5 py-1.5 flex items-center gap-2 flex-wrap">
                    <code className="text-[10px] font-mono text-[#AAA] break-all">{r.value}</code>
                    <span className="text-[10px] text-[#555] shrink-0">→</span>
                    <code className="text-[10px] font-mono text-blue-300 shrink-0">{r.ph}</code>
                    {r.count > 1 && (
                      <span className="text-[9px] text-[#666] shrink-0">×{r.count} ocurrencias</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* salida sanitizada */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Salida sanitizada</div>
            {active.length > 0 ? (
              <CodeBlock code={sanitized} label="Texto listo para compartir" lang="txt" />
            ) : (
              <p className="text-[11px] text-[#666]">
                Nada que reemplazar con las categorías activas: las privadas se
                mantienen y el resto de categorías están desmarcadas o sin
                hallazgos.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HdSanitizerTool;
