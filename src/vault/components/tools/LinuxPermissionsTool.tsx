'use client';

/**
 * LinuxPermissionsTool.tsx — Conversor bidireccional de permisos Linux (chmod).
 *
 * Soporta:
 *  - chmod numérico: 755, 4755 (con SUID=4, SGID=2, Sticky=1 como 4to dígito)
 *  - chmod simbólico: rwxr-xr-x, rwsr-xr-t (SUID=s, SGID=s, Sticky=t)
 *
 * Muestra:
 *  - Owner / Group / Other breakdown (rwx letters)
 *  - SUID / SGID / Sticky bit detection
 *  - Bits en binario
 *  - Equivalencia numérica/simbólica bidireccional
 *
 * 100% offline. Sin fetch, sin exec, sin eval.
 *
 * Exporta el componente nombrado `LinuxPermissionsTool` + default export.
 */
import React, { useMemo, useState } from 'react';
import {
  Terminal, RefreshCw, Copy, Check, AlertTriangle, Info, Lock, FileText, Crown,
} from 'lucide-react';
import { inputCls, btnGhost, btnPrimary, CodeBlock, InfoBanner, ErrorBanner, Tabs } from './_shared';
import { useNoteStore } from '../../store/noteStore';
import { escapeHtml } from '../../utils/escapeHtml';

interface OctalBreakdown {
  /** Modo numérico completo, e.g. "4755" (con special bits) o "755" (sin special bits). */
  octal: string;
  /** Special bits (SUID/SGID/Sticky) como entero 0-7. */
  special: number;
  /** Owner rwx (0-7). */
  owner: number;
  /** Group rwx (0-7). */
  group: number;
  /** Other rwx (0-7). */
  other: number;
  /** True si el input incluía el 4to dígito (special bits). */
  hasSpecial: boolean;
}

/** Convierte un dígito octal (0-7) a sus letras rwx — e.g. 7 → rwx, 5 → r-x, 0 → ---. */
function octalToRwx(digit: number): string {
  const r = digit & 4 ? 'r' : '-';
  const w = digit & 2 ? 'w' : '-';
  const x = digit & 1 ? 'x' : '-';
  return r + w + x;
}

/** Convierte 3 letras rwx (o ---) a un dígito octal. */
function rwxToOctal(letters: string): number | null {
  if (letters.length !== 3) return null;
  let digit = 0;
  if (letters[0] === 'r') digit |= 4;
  else if (letters[0] !== '-') return null;
  if (letters[1] === 'w') digit |= 2;
  else if (letters[1] !== '-') return null;
  // x, s (SUID+exec), S (SUID no-exec), t (Sticky+exec), T (Sticky no-exec)
  if (letters[2] === 'x' || letters[2] === 's' || letters[2] === 't') digit |= 1;
  else if (letters[2] !== '-' && letters[2] !== 'S' && letters[2] !== 'T') return null;
  return digit;
}

/** Valida y parsea un modo numérico (3 o 4 dígitos). */
function parseOctalMode(input: string): { ok: true; breakdown: OctalBreakdown } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!/^[0-7]{3,4}$/.test(trimmed)) {
    return { ok: false, error: 'Formato inválido. Usa 3 dígitos (755) o 4 dígitos (4755) en octal (0-7).' };
  }
  let special = 0;
  let owner: number, group: number, other: number;
  if (trimmed.length === 4) {
    special = parseInt(trimmed[0], 10);
    owner = parseInt(trimmed[1], 10);
    group = parseInt(trimmed[2], 10);
    other = parseInt(trimmed[3], 10);
  } else {
    owner = parseInt(trimmed[0], 10);
    group = parseInt(trimmed[1], 10);
    other = parseInt(trimmed[2], 10);
  }
  return {
    ok: true,
    breakdown: {
      octal: trimmed,
      special,
      owner,
      group,
      other,
      hasSpecial: trimmed.length === 4,
    },
  };
}

/** Convierte un breakdown numérico a su representación simbólica completa (10 caracteres: e.g. rwsr-xr-t). */
function octalBreakdownToSymbolic(b: OctalBreakdown): string {
  const ownerStr = octalToRwx(b.owner);
  const groupStr = octalToRwx(b.group);
  const otherStr = octalToRwx(b.other);

  // Aplicar bits especiales al último carácter de cada sección:
  // SUID: si special & 4 → reemplazar el 'x' del owner por 's' (si x) o 'S' (si no x).
  // SGID: si special & 2 → reemplazar el 'x' del group por 's' (si x) o 'S' (si no x).
  // Sticky: si special & 1 → reemplazar el 'x' del other por 't' (si x) o 'T' (si no x).

  let ownerFinal = ownerStr;
  let groupFinal = groupStr;
  let otherFinal = otherStr;

  if (b.special & 4) {
    ownerFinal = ownerFinal[0] + ownerFinal[1] + (ownerFinal[2] === 'x' ? 's' : 'S');
  }
  if (b.special & 2) {
    groupFinal = groupFinal[0] + groupFinal[1] + (groupFinal[2] === 'x' ? 's' : 'S');
  }
  if (b.special & 1) {
    otherFinal = otherFinal[0] + otherFinal[1] + (otherFinal[2] === 'x' ? 't' : 'T');
  }

  return ownerFinal + groupFinal + otherFinal;
}

/** Valida y parsea un modo simbólico (9 o 10 caracteres: rwxr-xr-x o rwsr-xr-t). */
function parseSymbolicMode(input: string): { ok: true; octal: string; breakdown: OctalBreakdown } | { ok: false; error: string } {
  const trimmed = input.trim();
  // Acepta 9 caracteres (rwxr-xr-x) o 10 (rwsr-xr-t — special char en posiciones 2/5/8).
  // Para 9 caracteres, no hay special bits. Para 10, hay que mirar el último char de cada tercio.

  // Detectar si el usuario escribió 10 (con special) o 9 (sin special):
  // Simplificación: si la longitud es exactamente 10, asumimos que incluye el 4o dígito via special chars.
  // Si es 9, no hay special chars.

  let ownerStr: string, groupStr: string, otherStr: string;
  let special = 0;
  let hasSpecial = false;

  if (trimmed.length === 9) {
    ownerStr = trimmed.slice(0, 3);
    groupStr = trimmed.slice(3, 6);
    otherStr = trimmed.slice(6, 9);
  } else if (trimmed.length === 10) {
    // rwsr-xr-t: posiciones 0-2 owner (con special en 2), 3-5 group, 6-8 other
    // Wait — symbolic with special has 10 chars (3+3+3 plus special char counts as part of the 9, so total 9).
    // Actually symbolic modes like `rwsr-xr-t` have exactly 9 chars where 's'/'S'/'t'/'T' replace 'x'/'-'.
    // Let me re-check: rwsr-xr-t = r w s r - x r - t = 9 chars. So the user might type 9 chars total.
    // If user typed 10, it's invalid for symbolic.
    return { ok: false, error: 'Modo simbólico inválido. Usa 9 caracteres: rwxr-xr-x o rwsr-xr-t.' };
  } else {
    return { ok: false, error: `Longitud inválida (${trimmed.length}). Esperado 9 caracteres: rwxr-xr-x.` };
  }

  // Detectar SUID/SGID/Sticky en el 3er char de cada tercio:
  // owner[2]: 's' = SUID+exec, 'S' = SUID sin exec
  // group[2]: 's' = SGID+exec, 'S' = SGID sin exec
  // other[2]: 't' = Sticky+exec, 'T' = Sticky sin exec

  if (ownerStr[2] === 's') { special |= 4; hasSpecial = true; }
  else if (ownerStr[2] === 'S') { special |= 4; hasSpecial = true; }
  else if (ownerStr[2] !== 'x' && ownerStr[2] !== '-') {
    return { ok: false, error: `Carácter inválido en owner[2]: '${ownerStr[2]}'. Esperado 'x', '-', 's' o 'S'.` };
  }

  if (groupStr[2] === 's') { special |= 2; hasSpecial = true; }
  else if (groupStr[2] === 'S') { special |= 2; hasSpecial = true; }
  else if (groupStr[2] !== 'x' && groupStr[2] !== '-') {
    return { ok: false, error: `Carácter inválido en group[2]: '${groupStr[2]}'. Esperado 'x', '-', 's' o 'S'.` };
  }

  if (otherStr[2] === 't') { special |= 1; hasSpecial = true; }
  else if (otherStr[2] === 'T') { special |= 1; hasSpecial = true; }
  else if (otherStr[2] !== 'x' && otherStr[2] !== '-') {
    return { ok: false, error: `Carácter inválido en other[2]: '${otherStr[2]}'. Esperado 'x', '-', 't' o 'T'.` };
  }

  // Convertir cada tercio a octal ignorando el bit especial (lo tratamos como 'x' o '-'):
  const ownerNormal = ownerStr[0] + ownerStr[1] + (ownerStr[2] === 'S' ? '-' : ownerStr[2] === 's' ? 'x' : ownerStr[2]);
  const groupNormal = groupStr[0] + groupStr[1] + (groupStr[2] === 'S' ? '-' : groupStr[2] === 's' ? 'x' : groupStr[2]);
  const otherNormal = otherStr[0] + otherStr[1] + (otherStr[2] === 'T' ? '-' : otherStr[2] === 't' ? 'x' : otherStr[2]);

  const ownerOct = rwxToOctal(ownerNormal);
  const groupOct = rwxToOctal(groupNormal);
  const otherOct = rwxToOctal(otherNormal);

  if (ownerOct === null || groupOct === null || otherOct === null) {
    return { ok: false, error: 'Carácter inválido. Cada tercio debe ser rwx, r-x, ---, etc.' };
  }

  const octalStr = (hasSpecial ? String(special) : '') + String(ownerOct) + String(groupOct) + String(otherOct);

  return {
    ok: true,
    octal: octalStr,
    breakdown: {
      octal: octalStr,
      special,
      owner: ownerOct,
      group: groupOct,
      other: otherOct,
      hasSpecial,
    },
  };
}

export const LinuxPermissionsTool: React.FC = () => {
  const [mode, setMode] = useState('755');
  const [copied, setCopied] = useState(false);
  const [addedToast, setAddedToast] = useState(false);
  const [tab, setTab] = useState<'numeric' | 'symbolic'>('numeric');

  // Parsear el input como numérico o simbólico según el tab activo.
  const parseResult = useMemo(() => {
    const input = mode.trim();
    if (!input) return null;

    // Intentar numérico primero si el tab es numeric, o si el input claramente es numérico.
    if (/^[0-7]{3,4}$/.test(input)) {
      const r = parseOctalMode(input);
      if (r.ok) return { kind: 'numeric' as const, breakdown: r.breakdown, symbolic: octalBreakdownToSymbolic(r.breakdown) };
      return { kind: 'error' as const, error: r.error };
    }

    // Si no es numérico, intentar simbólico.
    const r = parseSymbolicMode(input);
    if (r.ok) return { kind: 'symbolic' as const, breakdown: r.breakdown, symbolic: r.octal.length === 4 ? octalBreakdownToSymbolic(r.breakdown) : input };
    return { kind: 'error' as const, error: r.error };
  }, [mode]);

  const breakdown = parseResult?.kind === 'numeric' || parseResult?.kind === 'symbolic' ? parseResult.breakdown : null;
  const symbolic = parseResult?.kind === 'numeric' || parseResult?.kind === 'symbolic' ? parseResult.symbolic : null;
  const octalStr = breakdown ? (breakdown.hasSpecial ? `${breakdown.special}${breakdown.owner}${breakdown.group}${breakdown.other}` : `${breakdown.owner}${breakdown.group}${breakdown.other}`) : '';
  const errorMsg = parseResult?.kind === 'error' ? parseResult.error : null;

  const handleCopyOctal = () => {
    if (!octalStr) return;
    navigator.clipboard?.writeText(octalStr).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleAddToNote = () => {
    if (!breakdown) return;
    const rows: [string, string][] = [
      ['Mode (input)', escapeHtml(mode)],
      ['Mode (octal)', escapeHtml(octalStr)],
      ['Mode (symbolic)', escapeHtml(symbolic || '')],
      ['Owner', escapeHtml(octalToRwx(breakdown.owner))],
      ['Group', escapeHtml(octalToRwx(breakdown.group))],
      ['Other', escapeHtml(octalToRwx(breakdown.other))],
      ['SUID', breakdown.special & 4 ? 'Enabled' : 'Disabled'],
      ['SGID', breakdown.special & 2 ? 'Enabled' : 'Disabled'],
      ['Sticky', breakdown.special & 1 ? 'Enabled' : 'Disabled'],
    ];
    const body = rows
      .map(([k, v]) => `<tr><td style="vertical-align:top;font-weight:bold;color:#888;padding:4px;white-space:nowrap;">${k}</td><td style="vertical-align:top;padding:4px;font-family:monospace;">${v}</td></tr>`)
      .join('');
    const html = `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:monospace;font-size:11px;background:#0D0D0D;color:#DDD;"><tbody>${body}</tbody></table>`;
    useNoteStore.getState().enqueueNote('Linux Permissions — ' + octalStr, html);
    setAddedToast(true);
    window.setTimeout(() => setAddedToast(false), 2500);
  };

  return (
    <div className="space-y-4">
      <InfoBanner>
        100% offline. Conversor bidireccional de permisos Linux (chmod) — numérico (755) ↔ simbólico (rwxr-xr-x). Soporta SUID, SGID y Sticky bit. Sin exec, sin chmod real del sistema.
      </InfoBanner>

      {/* ─── Input ─── */}
      <div className="space-y-2">
        <Tabs
          tabs={[
            { id: 'numeric', label: 'Numérico (755)', icon: <Terminal className="w-3 h-3" /> },
            { id: 'symbolic', label: 'Simbólico (rwxr-xr-x)', icon: <FileText className="w-3 h-3" /> },
          ]}
          active={tab}
          onChange={(id) => {
            setTab(id as 'numeric' | 'symbolic');
            // Si cambiamos de tab y el input actual parseó, actualizamos al formato equivalente.
            if (breakdown) {
              if (id === 'numeric') setMode(octalStr);
              else setMode(symbolic || mode);
            }
          }}
        />
        <input
          className={inputCls + ' font-mono text-white'}
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          placeholder={tab === 'numeric' ? '755  o  4755' : 'rwxr-xr-x  o  rwsr-xr-t'}
          spellCheck={false}
          autoComplete="off"
        />
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => setMode('755')} className={`${btnGhost} text-[10px] inline-flex items-center gap-1`}>
            <RefreshCw className="w-3 h-3" /> 755 (default)
          </button>
          <button type="button" onClick={() => setMode('4755')} className={`${btnGhost} text-[10px] inline-flex items-center gap-1`}>
            <Crown className="w-3 h-3" /> 4755 (SUID)
          </button>
          <button type="button" onClick={() => setMode('2755')} className={`${btnGhost} text-[10px] inline-flex items-center gap-1`}>
            <Lock className="w-3 h-3" /> 2755 (SGID)
          </button>
          <button type="button" onClick={() => setMode('1755')} className={`${btnGhost} text-[10px] inline-flex items-center gap-1`}>
            <Lock className="w-3 h-3" /> 1755 (Sticky)
          </button>
          <button type="button" onClick={() => setMode('777')} className={`${btnGhost} text-[10px] inline-flex items-center gap-1`}>
            <AlertTriangle className="w-3 h-3" /> 777 (peligroso)
          </button>
          <button type="button" onClick={() => setMode('644')} className={`${btnGhost} text-[10px] inline-flex items-center gap-1`}>
            <FileText className="w-3 h-3" /> 644 (file)
          </button>
        </div>
      </div>

      {/* ─── Error ─── */}
      {errorMsg && <ErrorBanner message={errorMsg} />}

      {/* ─── Resultado ─── */}
      {breakdown && symbolic && (
        <div className="space-y-4">
          {/* Conversion summary */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#555]">Octal</span>
                <code className="ml-2 text-2xl font-mono font-bold text-blue-300">{octalStr}</code>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-widest text-[#555]">Symbolic</span>
                <code className="ml-2 text-2xl font-mono font-bold text-green-300">{symbolic}</code>
              </div>
              <button
                type="button"
                onClick={handleCopyOctal}
                className="p-1 rounded text-[#666] hover:text-blue-400 hover:bg-[#161616] transition-colors shrink-0"
                title="Copiar octal"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Owner / Group / Other breakdown */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
              <Terminal className="w-3 h-3" />
              Breakdown por Sección
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Owner', digit: breakdown.owner, name: 'owner' },
                { label: 'Group', digit: breakdown.group, name: 'group' },
                { label: 'Other', digit: breakdown.other, name: 'other' },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3 py-1">
                  <span className="text-[11px] text-[#888] uppercase tracking-widest w-16 shrink-0">{row.label}</span>
                  <code className="text-sm font-mono text-white w-12">{octalToRwx(row.digit)}</code>
                  <span className="text-[10px] text-[#555]">
                    ({row.digit} = {
                      (row.digit & 4 ? 'r' : '') +
                      (row.digit & 2 ? 'w' : '') +
                      (row.digit & 1 ? 'x' : '')
                    || '---'})
                  </span>
                  <div className="flex gap-1 ml-auto">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${row.digit & 4 ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-[#161616] border-[#262626] text-[#444]'}`}>read</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${row.digit & 2 ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-[#161616] border-[#262626] text-[#444]'}`}>write</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${row.digit & 1 ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-[#161616] border-[#262626] text-[#444]'}`}>exec</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Special bits */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              Bits Especiales (SUID / SGID / Sticky)
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className={`text-center px-2 py-2 rounded border ${breakdown.special & 4 ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-[#161616] border-[#262626] text-[#555]'}`}>
                <div className="text-[11px] font-bold uppercase">SUID</div>
                <div className="text-[10px] font-mono">{breakdown.special & 4 ? 'Enabled' : 'Disabled'}</div>
                <div className="text-[9px] mt-1 leading-tight">
                  {breakdown.special & 4 ? 'Se ejecuta como el owner del archivo.' : '—'}
                </div>
              </div>
              <div className={`text-center px-2 py-2 rounded border ${breakdown.special & 2 ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-[#161616] border-[#262626] text-[#555]'}`}>
                <div className="text-[11px] font-bold uppercase">SGID</div>
                <div className="text-[10px] font-mono">{breakdown.special & 2 ? 'Enabled' : 'Disabled'}</div>
                <div className="text-[9px] mt-1 leading-tight">
                  {breakdown.special & 2 ? 'Se ejecuta como el group del archivo.' : '—'}
                </div>
              </div>
              <div className={`text-center px-2 py-2 rounded border ${breakdown.special & 1 ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-[#161616] border-[#262626] text-[#555]'}`}>
                <div className="text-[11px] font-bold uppercase">Sticky</div>
                <div className="text-[10px] font-mono">{breakdown.special & 1 ? 'Enabled' : 'Disabled'}</div>
                <div className="text-[9px] mt-1 leading-tight">
                  {breakdown.special & 1 ? 'Solo el owner puede borrar archivos del dir.' : '—'}
                </div>
              </div>
            </div>
            {breakdown.special !== 0 && (
              <p className="text-[10px] text-yellow-400 leading-relaxed mt-2">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                Bits especiales activos — revisar contexto. SUID/SGID en binarios con vulnerabilidades conocidas = escalada de privilegios. Sticky bit en <code>/tmp</code> es normal (drwxrwxrwt).
              </p>
            )}
          </div>

          {/* Binary representation */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
              <FileText className="w-3 h-3" />
              Representación Binaria
            </h3>
            <CodeBlock
              code={
                `Special:  ${breakdown.special.toString(2).padStart(3, '0')}  (${breakdown.special})\n` +
                `Owner:   ${breakdown.owner.toString(2).padStart(3, '0')}  (${breakdown.owner})  →  ${octalToRwx(breakdown.owner)}\n` +
                `Group:   ${breakdown.group.toString(2).padStart(3, '0')}  (${breakdown.group})  →  ${octalToRwx(breakdown.group)}\n` +
                `Other:   ${breakdown.other.toString(2).padStart(3, '0')}  (${breakdown.other})  →  ${octalToRwx(breakdown.other)}`
              }
              lang="bin"
            />
          </div>

          {/* chmod command */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
              <Terminal className="w-3 h-3" />
              Comando chmod Equivalente
            </h3>
            <CodeBlock code={`chmod ${octalStr} archivo.txt`} lang="bash" />
            <p className="text-[10px] text-[#666] leading-relaxed">
              Equivalente simbólico: <code className="text-blue-300">chmod u={octalToRwx(breakdown.owner).replace(/-/g, '')},g={octalToRwx(breakdown.group).replace(/-/g, '')},o={octalToRwx(breakdown.other).replace(/-/g, '')} archivo.txt</code>
              {(breakdown.special & 4) && ' + u+s'}
              {(breakdown.special & 2) && ' + g+s'}
              {(breakdown.special & 1) && ' + o+t'}
            </p>
          </div>

          {/* Add to Note */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddToNote}
              className={`${btnPrimary} inline-flex items-center gap-1.5 text-[11px]`}
            >
              <FileText className="w-3 h-3" />
              Add to Note
            </button>
            {addedToast && (
              <span className="text-[10px] text-green-400">Añadido a Notas — crea una nota nueva para verlo.</span>
            )}
          </div>
        </div>
      )}

      {/* ─── Reference ─── */}
      <details className="bg-[#0D0D0D] border border-[#262626] rounded p-3">
        <summary className="cursor-pointer text-xs font-semibold text-white flex items-center gap-1.5">
          <Info className="w-3 h-3 text-blue-400" />
          Referencia rápida de permisos
        </summary>
        <div className="mt-2 space-y-2 text-[10px] text-[#888] leading-relaxed">
          <div>
            <p className="text-[11px] font-semibold text-white mb-1">Dígitos octales comunes:</p>
            <ul className="space-y-0.5 font-mono">
              <li><code className="text-blue-300">7</code> = rwx (read + write + exec)</li>
              <li><code className="text-blue-300">6</code> = rw- (read + write)</li>
              <li><code className="text-blue-300">5</code> = r-x (read + exec)</li>
              <li><code className="text-blue-300">4</code> = r-- (read only)</li>
              <li><code className="text-blue-300">0</code> = --- (no access)</li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-white mb-1">Modos comunes:</p>
            <ul className="space-y-0.5 font-mono">
              <li><code className="text-blue-300">755</code> = rwxr-xr-x — directorios y ejecutables estándar</li>
              <li><code className="text-blue-300">644</code> = rw-r--r-- — archivos regulares</li>
              <li><code className="text-blue-300">600</code> = rw------- — archivos privados (e.g. ~/.ssh/config)</li>
              <li><code className="text-blue-300">700</code> = rwx------ — ~/.ssh/</li>
              <li><code className="text-blue-300">1777</code> = rwxrwxrwt — /tmp/ (world-writable con sticky)</li>
              <li><code className="text-blue-300">4755</code> = rwsr-xr-x — SUID (passwd, sudo)</li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-white mb-1">Bits especiales:</p>
            <ul className="space-y-0.5 font-mono">
              <li><code className="text-blue-300">4xxx</code> = SUID (setuid) — ejecuta como owner</li>
              <li><code className="text-blue-300">2xxx</code> = SGID (setgid) — ejecuta como group</li>
              <li><code className="text-blue-300">1xxx</code> = Sticky — solo owner puede borrar</li>
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
};

export default LinuxPermissionsTool;
