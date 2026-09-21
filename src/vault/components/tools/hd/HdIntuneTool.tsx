/**
 * HdIntuneTool.tsx — HelpDesk "Intune / Autopilot Status" (Task 2-c).
 *
 * Dos secciones:
 *  1. Decodificador: catálogo LOCAL (~30 entradas) de estados y códigos de
 *     Intune/Autopilot con buscador por código o palabra. Master-detail:
 *     lista filtrable + ficha con significado, acción L1 y cuándo escalar.
 *     Cubre sincronización (Pending/Compliant/Not compliant), errores de
 *     enrollment frecuentes (0x8018002a, 0x80180018, 0x801c03f2,
 *     0x80192ee7...), Autopilot/ESP por fases, apps desplegadas y compliance.
 *  2. Checklist de sincronización manual: pasos numerados con checkboxes
 *     (Company Portal → Sync, esperar, reiniciar, reintentar, recopilar
 *     logs — ruta IME solo como referencia para escalar).
 *
 * [Añadir a Notas] exporta la ficha seleccionada (valores escapados).
 *
 * Referencia educativa: esta tool NO consulta Intune ni envía datos.
 * 100% offline: sin fetch/XHR/WebSocket/eval. Estado 100% React local.
 */
'use client';

import React, { useMemo, useState } from 'react';
import { Search, BookOpen, RotateCcw, ChevronRight, ShieldAlert } from 'lucide-react';
import {
  inputCls, btnGhost, buildNoteHtmlTable, useAddToNoteToast, InfoBanner,
} from '../_shared';
import { useNoteStore } from '../../../store/noteStore';
import { escapeHtml } from '../../../utils/escapeHtml';

/* ---------- catálogo local ---------- */

type IntuneArea = 'Sincronización' | 'Enrollment' | 'Autopilot / ESP' | 'Apps' | 'Compliance' | 'Directivas';

interface IntuneEntry {
  code: string;
  area: IntuneArea;
  meaning: string;
  l1: string;
  escalate: string;
}

const INTUNE_CATALOG: ReadonlyArray<IntuneEntry> = [
  /* ---- Sincronización ---- */
  {
    code: 'Pending', area: 'Sincronización',
    meaning: 'Sync pendiente: el dispositivo está en cola para reportar su estado a Intune (inventario, apps y políticas).',
    l1: 'Esperar 10-15 min sin cerrar sesión; forzar sincronización desde Company Portal → Settings → Sync; si no cambia, reiniciar y volver a sincronizar.',
    escalate: 'Si sigue Pending más de 24 h: posible problema del servicio o del agente (Intune Management Extension) → L2.',
  },
  {
    code: 'Compliant', area: 'Sincronización',
    meaning: 'Conforme: el dispositivo cumple todas las directivas de cumplimiento asignadas y ha reportado correctamente.',
    l1: 'No requiere acción. Si el usuario aún tiene problemas de acceso, la causa está en otro sitio (cuenta, licencia, red o app).',
    escalate: 'Conforme pero sin acceso a recursos → revisar licencia/pertenencia a grupos con L2/IAM.',
  },
  {
    code: 'Not compliant', area: 'Sincronización',
    meaning: 'No conforme: una o más directivas de cumplimiento no se cumplen (cifrado, versión de SO, parches, antivirus...).',
    l1: 'Company Portal → Dispositivo → ver qué directiva falla → sincronizar y remediar en el equipo (ej. activar BitLocker, actualizar) → reiniciar y re-sincronizar.',
    escalate: 'Si el equipo cumple pero el estado no cambia tras 2 sincronizaciones → L2 (evaluación de directivas).',
  },
  {
    code: 'Sin check-in >24 h', area: 'Sincronización',
    meaning: 'El dispositivo no ha reportado a Intune desde hace más de 24 h: apagado, sin red o agente atascado.',
    l1: 'Verificar que el equipo está encendido y con red (fecha/hora correctas), forzar Sync y reiniciar.',
    escalate: 'Sin check-in tras reinicio y Sync → L2: posible IME dañado o objeto de dispositivo huérfano.',
  },
  /* ---- Enrollment ---- */
  {
    code: '0x8018002a', area: 'Enrollment',
    meaning: 'Inscripción bloqueada por restricciones de MDM: una directiva (a menudo GPO o bloqueo corporativo) impide el enrollment.',
    l1: 'Reintentar no servirá mientras exista el bloqueo. Verificar con el usuario si es un equipo BYOD o corporativo y anotar el código exacto.',
    escalate: 'Requiere quitar la restricción de MDM → L2 / Intune admin (revisar GPO y bloqueos de enrollment).',
  },
  {
    code: '0x80180018', area: 'Enrollment',
    meaning: 'Inscripción bloqueada: el usuario superó el límite de dispositivos o hay un bloqueo global de enrollment.',
    l1: 'Preguntar al usuario cuántos dispositivos tiene inscritos; anotar usuario y código en el ticket.',
    escalate: 'Intune admin: retirar un dispositivo obsoleto del usuario o elevar el límite.',
  },
  {
    code: '0x801c03f2', area: 'Enrollment',
    meaning: 'Credenciales inválidas durante el enrollment: usuario o contraseña incorrectos en el momento de inscribir.',
    l1: 'Reintentar el enrollment con las credenciales correctas (reset de contraseña si procede) y comprobar que la cuenta tiene licencia de Intune asignada.',
    escalate: 'Si la cuenta no tiene licencia o el error persiste con credenciales válidas → L2/IAM.',
  },
  {
    code: '0x80192ee7', area: 'Enrollment',
    meaning: 'Fallo de red durante el enrollment: timeout o conectividad insuficiente hacia los endpoints de servicio.',
    l1: 'Cambio de red (cable en vez de Wi-Fi, red sin proxy), verificar fecha/hora del equipo y reintentar el enrollment.',
    escalate: 'Si la red corporativa bloquea endpoints de enrollment → L2-Redes con el código y la red usada.',
  },
  {
    code: 'Límite de dispositivos', area: 'Enrollment',
    meaning: 'El usuario ya tiene el máximo de dispositivos permitidos por directiva; el nuevo enrollment se rechaza.',
    l1: 'Identificar con el usuario qué dispositivos puede retirar (viejos, de baja) y anotarlo en el ticket.',
    escalate: 'Intune admin retira el dispositivo obsoleto o ajusta el límite por usuario.',
  },
  {
    code: 'Objeto duplicado', area: 'Enrollment',
    meaning: 'Ya inscrito (already enrolled): el equipo figura en Intune pero Company Portal no responde — objeto duplicado o huérfano.',
    l1: 'Sincronizar, reiniciar y reintentar desde Company Portal. No re-enrollar a lo loco: multiplica los duplicados.',
    escalate: 'Si persiste → L2 limpia/retira el objeto antiguo en Intune/Entra y se re-inscribe una sola vez.',
  },
  /* ---- Autopilot / ESP ---- */
  {
    code: 'Device preparation', area: 'Autopilot / ESP',
    meaning: 'Autopilot Device Preparation: fase previa en la que el perfil de Autopilot y las políticas se preparan antes de entregar el equipo al usuario.',
    l1: 'Estado informativo durante el despliegue: no interviene en el soporte diario salvo en onboarding fallido.',
    escalate: 'Si el equipo no llega a prepararse (no encuentra perfil) → Intune admin revisa el registro del serial.',
  },
  {
    code: 'ESP: Device setup', area: 'Autopilot / ESP',
    meaning: 'Página de estado de enrollment, fase 1: instala apps y políticas a NIVEL DE DISPOSITIVO antes de mostrar el escritorio. Atasco típico: apps de dispositivo o TPM.',
    l1: 'Paciencia (el ESP agota a los 60 min por defecto); UN reinicio puede desbloquear. No reintentar varias veces.',
    escalate: 'Atascado >1 h → L2 con los logs de ESP (subcarpeta de diagnóstico del enrollment).',
  },
  {
    code: 'ESP: User setup', area: 'Autopilot / ESP',
    meaning: 'Fase 2 del ESP: apps y políticas a NIVEL DE USUARIO (el usuario ya inició sesión). Atasco típico: apps asignadas al usuario u OneDrive.',
    l1: 'Verificar conectividad y esperar; un reinicio tras la fase 1 es aceptable. Comprobar espacio en disco.',
    escalate: 'Atasco repetido en la misma app → L2 revisa el paquete (código 0x87d completo).',
  },
  {
    code: 'ESP: Account setup', area: 'Autopilot / ESP',
    meaning: 'Fase 3 del ESP: la cuenta del usuario termina de configurarse (perfil, hoja de espera "Account setup"). Es la última antes del escritorio.',
    l1: 'Esperar: suele avanzar sola. No apagar el equipo en esta fase salvo indicación de L2.',
    escalate: 'Si la cuenta nunca termina de prepararse → L2/IAM (perfil o pertenencia a grupos).',
  },
  {
    code: 'ESP atascado >30 min', area: 'Autopilot / ESP',
    meaning: 'La barra de progreso no avanza durante más de 30 min en cualquier fase del ESP.',
    l1: 'Un único reinicio; luego esperar al timeout. Anotar en qué % y en qué fase se atasca.',
    escalate: 'L2 necesita: fase, % exacto y logs del equipo (se recogen al final del ESP).',
  },
  {
    code: 'ESP timeout (60 min)', area: 'Autopilot / ESP',
    meaning: 'Tiempo de espera agotado: el ESP superó el límite (60 min por defecto) y ofrece "seguir esperando" o "omitir" (si la directiva lo permite).',
    l1: 'Elegir seguir esperando hasta 3 veces antes de plantear omitir; omitir deja el equipo a medio configurar.',
    escalate: 'Omitir solo con aprobación de L2; el admin debe revisar qué app/política bloquea.',
  },
  {
    code: 'Perfil Autopilot sin asignar', area: 'Autopilot / ESP',
    meaning: 'El equipo no está en ningún grupo de destino de perfil Autopilot: el OOBE se muestra genérico (configuración manual).',
    l1: 'No es fallo del usuario. Anotar serial y modelo y explicar que el despliegue no está asignado.',
    escalate: 'Intune admin registra el serial en Autopilot y asigna el perfil/grupo.',
  },
  /* ---- Apps ---- */
  {
    code: 'Installed', area: 'Apps',
    meaning: 'Instalada: la app se instaló y el estado llegó a Intune.',
    l1: 'Si el usuario no la encuentra: buscarla en Inicio/Company Portal; a veces falta el acceso directo, no la app.',
    escalate: 'Instalada pero no abre → problema de la propia app (reparar/reinstalar), no de Intune.',
  },
  {
    code: 'Pending (app)', area: 'Apps',
    meaning: 'La instalación está en cola o descargando: el agente aún no la ha ejecutado.',
    l1: 'Sync desde Company Portal, esperar ~10 min, reiniciar si sigue igual y reintentar desde la propia app del portal.',
    escalate: 'Pending >24 h con red correcta → L2 con logs del Intune Management Extension.',
  },
  {
    code: 'Failed (0x87d...)', area: 'Apps',
    meaning: 'Instalación fallida con código 0x87d...: el instalador Win32/LOB devolvió error (espacio, exit code del instalador, dependencia).',
    l1: 'Anotar el código 0x87d COMPLETO de Company Portal → App → detalles. Sync, reiniciar, reintentar, verificar espacio en disco y conectividad.',
    escalate: 'Con el código completo + logs IME (%ProgramData%\\Microsoft\\IntuneManagementExtension\\Logs) → L2/Intune admin.',
  },
  {
    code: 'No visible en portal', area: 'Apps',
    meaning: 'La app no aparece en Company Portal: no está asignada al usuario o a su grupo (o el filtrado la oculta).',
    l1: 'Confirmar en el ticket si el usuario debería tenerla; sincronizar por si la asignación es reciente.',
    escalate: 'Si debe estar asignada → Intune admin revisa la asignación (grupo/disponibilidad).',
  },
  {
    code: 'Reinicio pendiente', area: 'Apps',
    meaning: 'La app requiere reiniciar para completar la instalación o el estado se refrescará tras el reinicio.',
    l1: 'Coordinar con el usuario un reinicio y reintentar después; el estado se limpia solo.',
    escalate: 'Si tras el reinicio sigue "pendiente de reinicio" → L2 (agente atascado).',
  },
  {
    code: 'Available (a demanda)', area: 'Apps',
    meaning: 'Publicada como disponible: el usuario debe instalarla él mismo desde Company Portal (no se instala sola).',
    l1: 'Guiar al usuario: Company Portal → Aplicaciones → Instalar. Explicar que "disponible" ≠ "obligatoria".',
    escalate: 'No procede salvo que la directiva exija que sea obligatoria (cambio de asignación).',
  },
  {
    code: 'Installing (en curso)', area: 'Apps',
    meaning: 'Descarga terminada y el instalador se está ejecutando: puede tardar según el tamaño.',
    l1: 'Esperar sin cerrar sesión; no interrumpir el instalador. Verificar que no pide interacción (UAC/asar).',
    escalate: 'Installing eterno (>1 h) → L2 revisa el exit code del instalador en los logs.',
  },
  /* ---- Compliance ---- */
  {
    code: 'Grace period', area: 'Compliance',
    meaning: 'Período de gracia: el dispositivo pasó a no conforme pero conserva el acceso durante la ventana configurada (habitualmente 24 h).',
    l1: 'Avisar al usuario de la fecha límite y remediar la directiva incumplida antes de que expire.',
    escalate: 'Si no se puede remediar antes del fin de la gracia → L2 decide prórroga o excepción.',
  },
  {
    code: 'Not compliant + bloqueo', area: 'Compliance',
    meaning: 'No conforme tras agotar la gracia: el acceso condicional bloquea correo/SharePoint/Teams.',
    l1: 'Company Portal → ver directiva incumplida → remediar (BitLocker, parches, build...) → sync + reinicio.',
    escalate: 'Incumplimiento no remediable desde L1 (hardware antiguo, build no soportada) → L2.',
  },
  {
    code: 'Not evaluated', area: 'Compliance',
    meaning: 'El dispositivo aún no ha evaluado las directivas: acaba de inscribirse o de recibir la asignación.',
    l1: 'Esperar a la primera sincronización (~15 min), forzar Sync y reiniciar si tarda.',
    escalate: 'Sin evaluación tras 24 h → L2 (asignación o evaluación atascada).',
  },
  {
    code: 'Conforme pero sin acceso', area: 'Compliance',
    meaning: 'Estado conforme y aun así el usuario no accede a recursos: la señal de compliance o la pertenencia al grupo tarda en propagarse.',
    l1: 'Sync + reinicio + esperar hasta 1 h. Cerrar y reabrir la app afectada (no solo el navegador).',
    escalate: 'Más de 4 h sin acceso → L2/IAM revisan la señal de acceso condicional.',
  },
  {
    code: 'Retirado (retire)', area: 'Compliance',
    meaning: 'El dispositivo fue retirado (retire/wipe): ya no está gestionado ni reporta; Company Portal desaparece.',
    l1: 'Confirmar en el ticket si el retiro era intencionado (baja, rotación). Si no, re-inscribir una vez.',
    escalate: 'Retiro no intencionado en equipo en uso → L2 audita quién lo retiró.',
  },
  /* ---- Directivas ---- */
  {
    code: 'Conflicto de directivas', area: 'Directivas',
    meaning: 'Dos directivas configuran el mismo ajuste con valores distintos: Intune marca conflicto y no aplica un valor claro.',
    l1: 'Anotar el ajuste en conflicto (aparece en el estado del dispositivo) y el comportamiento real del usuario.',
    escalate: 'Siempre a Intune admin: hay que alinear o priorizar las directivas en conflicto.',
  },
];

/* ---------- checklist de sincronización manual ---------- */

interface SyncStep { id: string; text: string; note?: string; }

const SYNC_STEPS: ReadonlyArray<SyncStep> = [
  {
    id: 'sc1',
    text: 'Pedir al usuario abrir Company Portal → Configuración (engranaje) → Sincronizar.',
    note: 'Alternativa en Windows: Configuración → Cuentas → Acceso profesional o educativo → cuenta → Información → Sincronizar.',
  },
  {
    id: 'sc2',
    text: 'Esperar ~10 minutos sin cerrar la sesión: el inventario y las apps tardan en refrescar.',
  },
  {
    id: 'sc3',
    text: 'Verificar fecha y hora del sistema: un reloj desviado rompe TLS y bloquea sincronización y enrollment.',
    note: 'Para L1 basta confirmar hora y zona horaria en la barra de tareas.',
  },
  {
    id: 'sc4',
    text: 'Reiniciar el equipo: muchas políticas y apps solo aplican su estado tras reiniciar.',
  },
  {
    id: 'sc5',
    text: 'Reintentar la instalación de la app desde Company Portal → Aplicaciones → estado de la app.',
  },
  {
    id: 'sc6',
    text: 'Recopilar logs para escalar (solo la ruta de referencia, L2 los baja): %ProgramData%\\Microsoft\\IntuneManagementExtension\\Logs',
    note: 'Company Portal → Ayuda y soporte técnico → enviar registros avisa al admin con los adjuntos.',
  },
];

/* ---------- estilos por área ---------- */

const AREA_BADGE: Record<IntuneArea, string> = {
  'Sincronización': 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  'Enrollment': 'border-red-500/30 bg-red-500/10 text-red-400',
  'Autopilot / ESP': 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  'Apps': 'border-green-500/30 bg-green-500/10 text-green-400',
  'Compliance': 'border-gray-500/30 bg-gray-500/10 text-gray-400',
  'Directivas': 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
};

/* ---------- componente ---------- */

export const HdIntuneTool: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [syncDone, setSyncDone] = useState<Record<string, boolean>>({});
  const { addedToast, showToast } = useAddToNoteToast();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === '') return INTUNE_CATALOG;
    return INTUNE_CATALOG.filter((e) =>
      `${e.code} ${e.area} ${e.meaning} ${e.l1} ${e.escalate}`.toLowerCase().includes(q),
    );
  }, [query]);

  const selected = useMemo(
    () => INTUNE_CATALOG.find((e) => e.code === selectedCode) ?? null,
    [selectedCode],
  );

  const doneCount = SYNC_STEPS.filter((s) => syncDone[s.id]).length;

  const toggleStep = (id: string): void => {
    setSyncDone((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addToNote = (): void => {
    if (!selected) return;
    const rows: Array<[string, string]> = [
      ['Código', selected.code],
      ['Área', selected.area],
      ['Significado', selected.meaning],
      ['Acción L1', selected.l1],
      ['Escalar', selected.escalate],
    ].map(([k, v]) => [escapeHtml(k), escapeHtml(v)] as [string, string]);
    useNoteStore.getState().enqueueNote(`Intune — ${selected.code}`, buildNoteHtmlTable(rows));
    showToast();
  };

  return (
    <div className="space-y-4">
      <InfoBanner>
        Referencia educativa — esta tool NO consulta Intune ni envía datos:
        el catálogo vive en el propio archivo y se filtra localmente.
      </InfoBanner>

      {/* ---------------- Sección 1: decodificador ---------------- */}
      <section className="space-y-2" aria-label="Decodificador de estados y códigos">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
          1 · Decodificador de estados y errores
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#666] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${inputCls} pl-8`}
            placeholder="Buscar por código (0x801...) o palabra (sync, ESP, app...)"
            aria-label="Buscar en el catálogo de Intune"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-3">
          {/* lista (master) */}
          <div className="border border-[#262626] rounded overflow-y-auto max-h-[380px] bg-[#0A0A0A]">
            {filtered.map((e) => (
              <button
                key={`${e.area}-${e.code}`}
                type="button"
                onClick={() => setSelectedCode(e.code)}
                aria-pressed={selectedCode === e.code}
                className={`w-full text-left px-2.5 py-2 border-b border-[#1A1A1A] transition-colors cursor-pointer flex items-center gap-2 ${
                  selectedCode === e.code ? 'bg-blue-500/10 hover:bg-blue-500/15' : 'hover:bg-[#161616]'
                }`}
                title={`Ver ${e.code}`}
              >
                <code className="text-[11px] font-mono text-white truncate flex-1">{e.code}</code>
                <ChevronRight className="w-3 h-3 text-[#555] shrink-0" />
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-2.5 py-3 text-[10px] text-[#666]">Sin resultados para «{query}».</p>
            )}
          </div>

          {/* ficha (detail) */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2.5 min-h-[160px]">
            {selected ? (
              <>
                <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-[#1A1A1A]">
                  <code className="text-sm font-mono text-white font-bold">{selected.code}</code>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${AREA_BADGE[selected.area]}`}>
                    {selected.area}
                  </span>
                </div>
                <p className="text-[11px] text-[#DDD] leading-relaxed">{selected.meaning}</p>
                <div className="border border-blue-500/30 bg-blue-500/5 rounded p-2.5 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-300">Acción L1</div>
                  <p className="text-[11px] text-[#AAA] leading-relaxed">{selected.l1}</p>
                </div>
                <div className="border border-amber-500/30 bg-amber-500/5 rounded p-2.5 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 inline-flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Cuándo escalar
                  </div>
                  <p className="text-[11px] text-[#AAA] leading-relaxed">{selected.escalate}</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={addToNote}
                    className={`${btnGhost} inline-flex items-center gap-1.5`}
                    title="Exportar la ficha a Notas"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Añadir a Notas
                  </button>
                </div>
              </>
            ) : (
              <p className="text-[11px] text-[#666]">
                {INTUNE_CATALOG.length} entradas en el catálogo. Selecciona un
                código de la lista para ver su significado, la acción L1 y el
                criterio de escalamiento.
              </p>
            )}
          </div>
        </div>
        {addedToast && <InfoBanner>Añadido a Notas — crea una nota nueva para verlo.</InfoBanner>}
      </section>

      {/* ---------------- Sección 2: checklist de sincronización ---------------- */}
      <section className="space-y-2" aria-label="Checklist de sincronización manual">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
          2 · Checklist de sincronización manual
        </div>
        <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-[#888] uppercase tracking-wider">
              Progreso: {doneCount}/{SYNC_STEPS.length}
            </span>
            <button
              type="button"
              onClick={() => setSyncDone({})}
              className={`${btnGhost} inline-flex items-center gap-1.5`}
              title="Reiniciar el checklist"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reiniciar
            </button>
          </div>
          <div className="h-1.5 bg-[#161616] rounded overflow-hidden">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${(doneCount / SYNC_STEPS.length) * 100}%` }} />
          </div>
          <ol className="space-y-2 pt-1 list-none">
            {SYNC_STEPS.map((s, i) => (
              <li key={s.id} className="flex items-start gap-2.5">
                <input
                  id={`intune-${s.id}`}
                  type="checkbox"
                  checked={Boolean(syncDone[s.id])}
                  onChange={() => toggleStep(s.id)}
                  className="mt-0.5 accent-blue-500 w-3.5 h-3.5 shrink-0 cursor-pointer"
                  aria-label={`Paso ${i + 1}`}
                />
                <label htmlFor={`intune-${s.id}`} className={`text-[11px] leading-relaxed cursor-pointer ${syncDone[s.id] ? 'text-[#888] line-through' : 'text-[#DDD]'}`}>
                  <span className="text-[#555] font-bold mr-1">{i + 1}.</span>
                  {s.text}
                  {s.note && <span className="block text-[10px] text-[#666] mt-0.5">{s.note}</span>}
                </label>
              </li>
            ))}
          </ol>
          {doneCount === SYNC_STEPS.length && (
            <div className="border border-green-500/30 bg-green-500/10 text-green-400 text-[11px] rounded px-2.5 py-1.5">
              Checklist completo: si el problema persiste tras los 6 pasos, escala a L2 con el ticket + código de error exacto.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default HdIntuneTool;
