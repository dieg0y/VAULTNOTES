/**
 * HdSharePermsTool.tsx — HelpDesk "File Share & Permissions L1" (Task 2-c).
 *
 * Tres pestañas:
 *  1. Permisos efectivos: simulador SHARE (Leer/Cambiar/Control total) ×
 *     NTFS (Leer/Escribir/Modificar/Control total). El efectivo por red es
 *     la INTERSECCIÓN (la capa más restrictiva gana). Diagrama de tres cajas
 *     SHARE → NTFS → EFECTIVO + explicación + casos especiales (acceso local
 *     = solo NTFS; Deny explícito gana a Allow).
 *  2. Constructor icacls: path + identidad + derechos (R/W/RX/M/F) +
 *     flags (/grant, /remove, /inheritance:r|d, (OI)(CI)) → genera el comando
 *     completo con explicación de cada flag. NUNCA se ejecuta: solo texto.
 *  3. "No veo la carpeta": checklist L1 ordenado (mapeo/acceso → grupo →
 *     ACLs share vs NTFS → GPO de mapeos → herencia) con comandos de SOLO
 *     LECTURA y qué significa cada veredicto.
 *
 * [Añadir a Notas] exporta el resumen del simulador (valores escapados).
 *
 * Simulador educativo: no modifica permisos reales. 100% offline.
 */
'use client';

import React, { useState } from 'react';
import { FolderLock, Terminal, EyeOff, BookOpen, Check, X, ArrowRight } from 'lucide-react';
import {
  inputCls, btnGhost, CodeBlock, InfoBanner, Tabs, Field,
  buildNoteHtmlTable, useAddToNoteToast,
} from '../_shared';
import { useNoteStore } from '../../../store/noteStore';
import { escapeHtml } from '../../../utils/escapeHtml';

/* ---------- modelo de permisos (intersección de capas) ---------- */

type Cap = 'read' | 'write' | 'exec' | 'del';
const ALL_CAPS: ReadonlyArray<Cap> = ['read', 'write', 'exec', 'del'];
const CAP_LABEL: Record<Cap, string> = {
  read: 'Leer archivos / listar carpeta',
  write: 'Crear y modificar archivos',
  exec: 'Ejecutar programas',
  del: 'Eliminar archivos',
};

type SharePerm = 'leer' | 'cambiar' | 'total';
type NtfsPerm = 'leer' | 'escribir' | 'modificar' | 'total';

const SHARE_PERMS: Record<SharePerm, { label: string; mask: ReadonlyArray<Cap> }> = {
  leer: { label: 'Leer', mask: ['read'] },
  cambiar: { label: 'Cambiar', mask: ['read', 'write', 'del'] },
  total: { label: 'Control total', mask: ['read', 'write', 'exec', 'del'] },
};

const NTFS_PERMS: Record<NtfsPerm, { label: string; mask: ReadonlyArray<Cap> }> = {
  leer: { label: 'Leer', mask: ['read', 'exec'] },
  escribir: { label: 'Escribir', mask: ['read', 'write'] },
  modificar: { label: 'Modificar', mask: ['read', 'write', 'exec', 'del'] },
  total: { label: 'Control total', mask: ['read', 'write', 'exec', 'del'] },
};

function capsToText(caps: ReadonlyArray<Cap>): string {
  if (caps.length === 0) return 'ningún acceso (ni siquiera listar la carpeta)';
  if (caps.length === ALL_CAPS.length) return 'control total efectivo';
  if (caps.includes('read') && caps.includes('write') && caps.includes('del')) return 'leer, escribir y eliminar';
  if (caps.includes('read') && caps.includes('write')) return 'leer y escribir, sin eliminar';
  if (caps.includes('read')) return 'solo lectura (leer y listar)';
  return 'acceso parcial';
}

function explainEffective(share: SharePerm, ntfs: NtfsPerm): string {
  const s = SHARE_PERMS[share];
  const n = NTFS_PERMS[ntfs];
  const eff = ALL_CAPS.filter((c) => s.mask.includes(c) && n.mask.includes(c));
  const shareTxt = capsToText(s.mask);
  const ntfsTxt = capsToText(n.mask);
  if (s.mask.length === n.mask.length && eff.length === s.mask.length) {
    return `Ambas capas conceden lo mismo (${s.label} / ${n.label}) → el efectivo equivale a ellas: ${capsToText(eff)}.`;
  }
  return `SHARE: ${s.label} concede ${shareTxt}, pero NTFS: ${n.label} limita a ${ntfsTxt} → al pasar por la red el usuario solo obtiene lo que AMBAS capas permiten: ${capsToText(eff)}.`;
}

/** Lista de capacidades de una capa: ✓ verde si incluida, ✗ tachada si no. */
const CapList: React.FC<{ mask: ReadonlyArray<Cap> }> = ({ mask }) => (
  <ul className="space-y-1">
    {ALL_CAPS.map((c) => (
      <li key={c} className="flex items-center gap-1.5 text-[10px]">
        {mask.includes(c) ? (
          <Check className="w-3 h-3 text-green-400 shrink-0" />
        ) : (
          <X className="w-3 h-3 text-red-400/70 shrink-0" />
        )}
        <span className={mask.includes(c) ? 'text-[#DDD]' : 'text-[#666] line-through'}>{CAP_LABEL[c]}</span>
      </li>
    ))}
  </ul>
);

/* ---------- constructor icacls ---------- */

const ICACLS_RIGHTS: ReadonlyArray<{ code: string; desc: string }> = [
  { code: 'R', desc: 'Lectura genérica (leer y listar).' },
  { code: 'W', desc: 'Escritura genérica (crear/escribir, sin leer necesariamente).' },
  { code: 'RX', desc: 'Lectura y ejecución (típico para programas).' },
  { code: 'M', desc: 'Modificar: leer, escribir, ejecutar y ELIMINAR.' },
  { code: 'F', desc: 'Control total (incluye cambiar permisos).' },
];

const ICACLS_FLAGS: ReadonlyArray<{ flag: string; desc: string }> = [
  { flag: '/grant', desc: 'Añade una ACE Allow para la identidad con los derechos indicados.' },
  { flag: '/remove', desc: 'Elimina TODAS las ACE de esa identidad (Allow y Deny).' },
  { flag: '/inheritance:r', desc: 'Elimina los ACE heredados y bloquea la herencia futura (dejando solo las ACE explícitas).' },
  { flag: '/inheritance:d', desc: 'Copia los ACE heredados a explícitos y desactiva la herencia (congelando una copia).' },
  { flag: '(OI)(CI)', desc: 'Objeto Inherit / Container Inherit: la ACE se propaga a archivos y subcarpetas.' },
];

/* ---------- "no veo la carpeta": checklist L1 ---------- */

const FOLDER_STEPS: ReadonlyArray<{ title: string; body: string; means: string; cmds: string[] }> = [
  {
    title: '1 · ¿El share está mapeado / es accesible?',
    body: 'Comprueba si la unidad existe y si el path UNC responde directamente.',
    means: 'net use vacío → la GPO de mapeos no aplicó (ver paso 4). "Acceso denegado" en dir → problema de permisos (paso 2-3). "No se encuentra" → conectividad o share inexistente.',
    cmds: ['net use', 'dir "\\\\servidor\\datos"'],
  },
  {
    title: '2 · ¿El usuario es miembro del grupo?',
    body: 'El acceso suele concederse a grupos, no a usuarios. Compara whoami /groups con el grupo esperado del share (apúntalo del ticket o pídelo a L2).',
    means: 'El grupo NO aparece → adhesión reciente: cerrar y reabrir sesión (o reiniciar) para refrescar el token. Si sigue sin aparecer → L2/AD revisa la membresía.',
    cmds: ['whoami /groups'],
  },
  {
    title: '3 · Capa share vs capa NTFS',
    body: 'La capa SHARE y la capa NTFS se multiplican (la más restrictiva gana). Revisa las ACL reales de la carpeta — solo lectura.',
    means: 'Si el share dice Cambiar pero NTFS solo Leer → efectivo solo lectura. Un Deny explícito en NTFS gana a cualquier Allow. Busca la identidad del usuario/grupo en la salida.',
    cmds: ['icacls "\\\\servidor\\datos\\carpeta"'],
  },
  {
    title: '4 · Unidad H: / mapeos por GPO',
    body: 'Los mapeos suelen llegar por GPO de usuario. Verifica que la directiva aplica y que no hay un drive oculto/conflicto de letra.',
    means: 'Si gpresult no muestra la GPO de unidades → filtro de seguridad/OU mal aplicado → L2/AD. Letra ocupada por una unidad local → cambia la letra del mapeo.',
    cmds: ['gpresult /r', 'net use'],
  },
  {
    title: '5 · Herencia rota',
    body: 'Si los ACE de la carpeta no llevan "(I)", la herencia está desactivada: los permisos del nivel superior no llegan.',
    means: 'Herencia rota → el usuario puede tener acceso por el padre pero no por la carpeta. NO la restaures desde L1 (/inheritance cambia ACLs): escala a L2 con la salida de icacls.',
    cmds: ['icacls "H:\\Datos\\Facturas"'],
  },
];

/* ---------- componente ---------- */

export const HdSharePermsTool: React.FC = () => {
  const [tab, setTab] = useState('efectivos');
  const [share, setShare] = useState<SharePerm>('cambiar');
  const [ntfs, setNtfs] = useState<NtfsPerm>('leer');
  const { addedToast, showToast } = useAddToNoteToast();

  /* constructor icacls */
  const [path, setPath] = useState('C:\\Datos\\Facturas');
  const [identity, setIdentity] = useState('NEXORA\\Grupo-Facturas');
  const [rights, setRights] = useState<string[]>(['M']);
  const [mode, setMode] = useState<'grant' | 'remove'>('grant');
  const [inheritance, setInheritance] = useState<'none' | 'r' | 'd'>('none');
  const [oiCi, setOiCi] = useState(true);

  const effMask = ALL_CAPS.filter((c) => SHARE_PERMS[share].mask.includes(c) && NTFS_PERMS[ntfs].mask.includes(c));
  const explanation = explainEffective(share, ntfs);

  const toggleRight = (code: string): void => {
    setRights((prev) => (prev.includes(code) ? prev.filter((r) => r !== code) : [...prev, code]));
  };

  const rightsOrdered = ICACLS_RIGHTS.map((r) => r.code).filter((code) => rights.includes(code));

  const icaclsParts: string[] = [];
  if (mode === 'grant') {
    for (const r of rightsOrdered) icaclsParts.push(`/grant "${identity}:${oiCi ? '(OI)(CI)' : ''}${r}"`);
  } else {
    icaclsParts.push(`/remove "${identity}"`);
  }
  if (inheritance !== 'none') icaclsParts.push(`/inheritance:${inheritance}`);
  const icaclsCmd = icaclsParts.length > 0 ? `icacls "${path}" ${icaclsParts.join(' ')}` : '';

  const addToNote = (): void => {
    const rows: Array<[string, string]> = [
      ['Permiso SHARE', SHARE_PERMS[share].label],
      ['Permiso NTFS', NTFS_PERMS[ntfs].label],
      ['Efectivo por red', capsToText(effMask)],
      ['Explicación', explanation],
    ].map(([k, v]) => [escapeHtml(k), escapeHtml(v)] as [string, string]);
    useNoteStore.getState().enqueueNote(`Permisos efectivos — ${SHARE_PERMS[share].label} × ${NTFS_PERMS[ntfs].label}`, buildNoteHtmlTable(rows));
    showToast();
  };

  return (
    <div className="space-y-3">
      <InfoBanner>
        Simulador — no modifica permisos reales. El constructor solo genera
        texto; los comandos de diagnóstico de la tercera pestaña son de solo
        lectura. Ejecútalos TÚ en el equipo, con el ticket abierto.
      </InfoBanner>

      <Tabs
        tabs={[
          { id: 'efectivos', label: 'Permisos efectivos', icon: <FolderLock className="w-3.5 h-3.5" /> },
          { id: 'icacls', label: 'Constructor icacls', icon: <Terminal className="w-3.5 h-3.5" /> },
          { id: 'noveo', label: 'No veo la carpeta', icon: <EyeOff className="w-3.5 h-3.5" /> },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ---------------- Tab 1: permisos efectivos ---------------- */}
      {tab === 'efectivos' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Permisos SHARE (por red)">
              <select
                value={share}
                onChange={(e) => setShare(e.target.value as SharePerm)}
                className={inputCls}
                aria-label="Permisos de share"
              >
                {Object.entries(SHARE_PERMS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Permisos NTFS (en la carpeta)">
              <select
                value={ntfs}
                onChange={(e) => setNtfs(e.target.value as NtfsPerm)}
                className={inputCls}
                aria-label="Permisos NTFS"
              >
                {Object.entries(NTFS_PERMS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* diagrama SHARE → NTFS → EFECTIVO */}
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <div className="flex-1 bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Capa SHARE</div>
              <div className="text-[11px] font-bold text-white">{SHARE_PERMS[share].label}</div>
              <CapList mask={SHARE_PERMS[share].mask} />
            </div>
            <div className="self-center shrink-0 text-[#555] flex justify-center">
              <ArrowRight className="w-4 h-4 rotate-90 sm:rotate-0" />
            </div>
            <div className="flex-1 bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Capa NTFS</div>
              <div className="text-[11px] font-bold text-white">{NTFS_PERMS[ntfs].label}</div>
              <CapList mask={NTFS_PERMS[ntfs].mask} />
            </div>
            <div className="self-center shrink-0 text-[#555] flex justify-center">
              <ArrowRight className="w-4 h-4 rotate-90 sm:rotate-0" />
            </div>
            <div className="flex-1 bg-[#0D0D0D] border border-blue-500/40 rounded p-3 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Efectivo por red</div>
              <div className="text-[11px] font-bold text-blue-300">{capsToText(effMask)}</div>
              <CapList mask={effMask} />
            </div>
          </div>

          <p className="text-[11px] text-[#AAA] leading-relaxed">{explanation}</p>

          <div className="border border-amber-500/30 bg-amber-500/5 rounded px-2.5 py-2 text-[11px] text-[#AAA] leading-relaxed">
            <span className="text-amber-400 font-bold">Vía consola / inicio de sesión local:</span>{' '}
            el share NO interviene (no se pasa por la red) → solo aplica NTFS.
            Un usuario con NTFS Modificar y share Leer tendrá solo lectura por
            red, pero Modificar trabajando localmente en el servidor.
          </div>
          <div className="border border-red-500/30 bg-red-500/5 rounded px-2.5 py-2 text-[11px] text-[#AAA] leading-relaxed">
            <span className="text-red-400 font-bold">Regla del Deny:</span>{' '}
            en NTFS, un Deny explícito para el usuario o su grupo gana SIEMPRE
            a cualquier Allow, comparta o no por share. Revísalo con icacls
            (solo lectura).
          </div>

          <button
            type="button"
            onClick={addToNote}
            className={`${btnGhost} inline-flex items-center gap-1.5`}
            title="Exportar el resultado efectivo a Notas"
          >
            <BookOpen className="w-3.5 h-3.5" /> Añadir a Notas
          </button>
          {addedToast && <InfoBanner>Añadido a Notas — crea una nota nueva para verlo.</InfoBanner>}
        </div>
      )}

      {/* ---------------- Tab 2: constructor icacls ---------------- */}
      {tab === 'icacls' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Ruta (path)">
              <input value={path} onChange={(e) => setPath(e.target.value)} className={inputCls} placeholder="C:\Datos\Facturas" aria-label="Ruta de la carpeta" />
            </Field>
            <Field label="Identidad" hint="DOMINIO\usuario, DOMINIO\grupo o un SID.">
              <input value={identity} onChange={(e) => setIdentity(e.target.value)} className={inputCls} placeholder="NEXORA\Grupo-Facturas" aria-label="Identidad a la que conceder o quitar permisos" />
            </Field>
          </div>

          <Field label="Operación">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('grant')}
                aria-pressed={mode === 'grant'}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                  mode === 'grant' ? 'bg-blue-500/15 border-blue-500/40 text-blue-400' : 'bg-[#161616] border-[#262626] text-[#888] hover:text-white'
                }`}
                title="Conceder permisos con /grant"
              >
                /grant (conceder)
              </button>
              <button
                type="button"
                onClick={() => setMode('remove')}
                aria-pressed={mode === 'remove'}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                  mode === 'remove' ? 'bg-red-500/15 border-red-500/40 text-red-400' : 'bg-[#161616] border-[#262626] text-[#888] hover:text-white'
                }`}
                title="Quitar todas las ACE de la identidad con /remove"
              >
                /remove (quitar)
              </button>
            </div>
          </Field>

          {mode === 'grant' && (
            <Field label="Derechos (chips multi)">
              <div className="flex flex-wrap gap-2">
                {ICACLS_RIGHTS.map((r) => (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => toggleRight(r.code)}
                    aria-pressed={rights.includes(r.code)}
                    title={r.desc}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                      rights.includes(r.code) ? 'bg-blue-500/15 border-blue-500/40 text-blue-400' : 'bg-[#161616] border-[#262626] text-[#888] hover:text-white'
                    }`}
                  >
                    {r.code}
                  </button>
                ))}
              </div>
            </Field>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Herencia (/inheritance)">
              <select
                value={inheritance}
                onChange={(e) => setInheritance(e.target.value as 'none' | 'r' | 'd')}
                className={inputCls}
                aria-label="Modo de herencia"
              >
                <option value="none">sin tocar la herencia</option>
                <option value="r">/inheritance:r — quitar heredados</option>
                <option value="d">/inheritance:d — copiar y congelar</option>
              </select>
            </Field>
            <Field label="Propagación">
              <label className="flex items-center gap-2 text-[11px] text-[#DDD] cursor-pointer">
                <input
                  type="checkbox"
                  checked={oiCi}
                  onChange={(e) => setOiCi(e.target.checked)}
                  className="accent-blue-500 w-3.5 h-3.5 cursor-pointer"
                />
                Aplicar a subcarpetas y archivos (OI)(CI)
              </label>
            </Field>
          </div>

          {icaclsCmd !== '' ? (
            <CodeBlock code={icaclsCmd} label="Comando generado — NO se ejecuta desde aquí" lang="cmd" />
          ) : (
            <p className="text-[11px] text-[#666]">Selecciona al menos un derecho (o un flag de herencia) para generar el comando.</p>
          )}

          {mode === 'grant' && rightsOrdered.length > 1 && (
            <InfoBanner>
              icacls acepta un código de derecho por entrada: al marcar varios
              se generan varias cláusulas /grant. En la práctica elige el
              derecho más amplio que necesites (p. ej. M en vez de R + W).
            </InfoBanner>
          )}

          <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Significado de cada flag</div>
          <div className="overflow-x-auto border border-[#262626] rounded">
            <table className="w-full text-[10px] border-collapse">
              <thead className="bg-[#161616]">
                <tr>
                  <th className="px-2 py-1.5 text-left text-[#888] uppercase tracking-wider font-bold border-b border-[#262626]">Derecho / flag</th>
                  <th className="px-2 py-1.5 text-left text-[#888] uppercase tracking-wider font-bold border-b border-[#262626]">Qué hace</th>
                </tr>
              </thead>
              <tbody>
                {[...ICACLS_RIGHTS.map((r) => ({ flag: r.code, desc: r.desc })), ...ICACLS_FLAGS].map((f) => (
                  <tr key={f.flag} className="border-b border-[#1A1A1A] hover:bg-[#161616] transition-colors">
                    <td className="px-2 py-1.5 text-green-300 font-mono whitespace-nowrap">{f.flag}</td>
                    <td className="px-2 py-1.5 text-[#AAA]">{f.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- Tab 3: no veo la carpeta ---------------- */}
      {tab === 'noveo' && (
        <div className="space-y-3">
          <p className="text-[11px] text-[#888] leading-relaxed">
            Checklist L1 en orden: cada paso se hace con el usuario al teléfono
            (o en sesión remota) y los comandos son de SOLO LECTURA — no
            modifican ningún permiso.
          </p>
          {FOLDER_STEPS.map((s) => (
            <div key={s.title} className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2 hover:border-blue-500/40 transition-colors">
              <div className="text-[11px] font-bold text-white">{s.title}</div>
              <p className="text-[10px] text-[#AAA] leading-relaxed">{s.body}</p>
              {s.cmds.map((c) => (
                <CodeBlock key={c} code={c} label="Solo lectura" lang="cmd" />
              ))}
              <div className="border border-blue-500/25 bg-blue-500/5 rounded px-2.5 py-1.5 text-[10px] text-[#AAA] leading-relaxed">
                <span className="text-blue-300 font-bold">Qué significa el veredicto: </span>
                {s.means}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HdSharePermsTool;
