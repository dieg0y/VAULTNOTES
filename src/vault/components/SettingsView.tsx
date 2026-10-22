import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Trash2, Plus, Tag, Wrench, AlertTriangle, FolderOpen, HardDrive, RefreshCw, FolderX, CheckCircle2, ShieldCheck, RotateCcw, Video, Usb } from 'lucide-react';
import { CategoryItem, ToolItem } from '../types';
import { db, countCategoryUsage, countToolUsage } from '../db';
import {
  isFsSupported,
  hasVideosDirectory,
  getVideosDirectoryName,
  isVideosPermissionGranted,
  setVideosDirectory,
  forgetVideosDirectory,
  ensureVideosPermission,
  hasAppFolder,
  getAppFolderName,
  pickAppFolder,
  forgetAppFolder,
} from '../utils/videoStorage';
import {
  INTERVAL_OPTIONS,
  RETENTION_OPTIONS,
  backupNow,
  restoreLatestBackup,
  updateAutoBackupSettings,
} from '../utils/autoBackup';
import { useAutoBackupStatus } from '../hooks/useAutoBackupStatus';

interface SettingsViewProps {
  categories: CategoryItem[];
  tools: ToolItem[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({ categories, tools }) => {
  const [newCategory, setNewCategory] = useState('');
  const [newTool, setNewTool] = useState('');

  // --- REGLA DE ORO: videos folder panel state ---
  const [fsSupported] = useState(() => isFsSupported());
  const [hasVideosDir, setHasVideosDir] = useState(false);
  const [videosDirName, setVideosDirName] = useState<string | null>(null);
  const [videosPermOk, setVideosPermOk] = useState(false);
  // --- App folder (backup target) panel state ---
  const [hasApp, setHasApp] = useState(false);
  const [appName, setAppName] = useState<string | null>(null);

  const refreshVideoStorage = useCallback(async () => {
    setHasVideosDir(await hasVideosDirectory());
    setVideosDirName(await getVideosDirectoryName());
    setVideosPermOk(await isVideosPermissionGranted());
    setHasApp(await hasAppFolder());
    setAppName(await getAppFolderName());
  }, []);

  useEffect(() => {
    refreshVideoStorage();
  }, [refreshVideoStorage]);

  const handlePickVideosDir = async () => {
    const ok = await setVideosDirectory();
    if (ok) await refreshVideoStorage();
  };

  const handleGrantVideosPerm = async () => {
    const ok = await ensureVideosPermission();
    if (ok) await refreshVideoStorage();
  };

  const handleForgetVideosDir = async () => {
    if (window.confirm('¿Dejar de usar la carpeta de videos? Los archivos NO se borran (siguen en tu disco), pero los apuntes con videos mostrarán el placeholder hasta que vuelvas a elegir una carpeta.')) {
      await forgetVideosDirectory();
      await refreshVideoStorage();
    }
  };

  const handlePickAppDir = async () => {
    const ok = await pickAppFolder();
    if (ok) await refreshVideoStorage();
  };

  const handleForgetAppDir = async () => {
    if (window.confirm('¿Dejar de usar la carpeta de la app? Los backups volverán a pedir ubicación al guardar. Los archivos ya guardados no se borran.')) {
      await forgetAppFolder();
      await refreshVideoStorage();
    }
  };

  /* --- Respaldo automático a la carpeta (flujo USB) --- */
  const autoStatus = useAutoBackupStatus();
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoMsg, setAutoMsg] = useState<string | null>(null);

  const flashAutoMsg = (msg: string, ms = 7000) => {
    setAutoMsg(msg);
    window.setTimeout(() => setAutoMsg((cur) => (cur === msg ? null : cur)), ms);
  };

  const handleToggleAutoBackup = () => {
    updateAutoBackupSettings({ enabled: !autoStatus.enabled });
  };

  const handleBackupNow = async () => {
    setAutoBusy(true);
    try {
      const name = await backupNow();
      flashAutoMsg(`Respaldo escrito: ${name}`);
    } catch (e) {
      flashAutoMsg(e instanceof Error ? e.message : 'Error desconocido respaldando.');
    } finally {
      setAutoBusy(false);
    }
  };

  const handleRestoreLatest = async () => {
    if (
      !window.confirm(
        '¿Restaurar el último backup de la carpeta?\n\n' +
          'El merge es NO destructivo: si algo local es más nuevo (por fecha de edición), gana lo local. Nada se pierde.\n\n' +
          'Ideal al llegar a una máquina nueva con tu USB.',
      )
    )
      return;
    setAutoBusy(true);
    try {
      const { fileName, summary } = await restoreLatestBackup();
      flashAutoMsg(
        `Restaurado ${fileName} — +${summary.addedNotes} apuntes, +${summary.addedLabs} labs, +${summary.addedTerms} términos, +${summary.addedImages} imágenes.`,
        10000,
      );
    } catch (e) {
      flashAutoMsg(e instanceof Error ? e.message : 'Error desconocido restaurando.');
    } finally {
      setAutoBusy(false);
    }
  };

  /** "hace 4 min" / "hace 2 h" — human short relative time. */
  const fmtRel = (ts: number | null): string => {
    if (!ts) return 'nunca';
    const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return 'hace instantes';
    if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
    if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
    return `hace ${Math.floor(s / 86400)} d`;
  };

  const handleDeleteCategory = async (cat: CategoryItem) => {
    const usage = await countCategoryUsage(cat.name);
    if (usage > 0) {
      alert(`No se puede borrar, está en uso por ${usage} apunte${usage === 1 ? '' : 's'}/lab${usage === 1 ? '' : 's'}/término${usage === 1 ? '' : 's'}.`);
      return;
    }
    if (window.confirm(`¿Eliminar la categoría "${cat.name}"?`)) {
      await db.categories.delete(cat.id);
    }
  };

  const handleDeleteTool = async (tool: ToolItem) => {
    const usage = await countToolUsage(tool.name);
    if (usage > 0) {
      alert(`No se puede borrar, está en uso por ${usage} lab${usage === 1 ? '' : 's'}.`);
      return;
    }
    if (window.confirm(`¿Eliminar la herramienta "${tool.name}"?`)) {
      await db.tools.delete(tool.id);
    }
  };

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) { setNewCategory(''); return; }
    await db.categories.add({ id: `cat-${Date.now()}`, name, createdAt: new Date().toISOString() });
    setNewCategory('');
  };

  const handleAddTool = async () => {
    const name = newTool.trim();
    if (!name) return;
    if (tools.some((t) => t.name.toLowerCase() === name.toLowerCase())) { setNewTool(''); return; }
    await db.tools.add({ id: `tool-${Date.now()}`, name, createdAt: new Date().toISOString() });
    setNewTool('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0A0A0A]">
      <div className="pb-4 border-b border-[#262626]">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          Configuración
        </h1>
        <p className="text-xs text-[#888] mt-0.5">
          Categorías (Tema / Especialidad) y Herramientas son listas maestras compartidas por Apuntes, Labs y Glosario.
        </p>
      </div>

      {/* BLOQUE 5 — Privacy & Offline indicator (spec #19). Pure visual:
          no network check, no fetch. Just confirms that VaultNotes runs
          100% locally and data stays in IndexedDB (Dexie). */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            <h2 className="text-sm font-bold text-white">Privacidad y Offline</h2>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 border border-green-500/30 text-green-300 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3" />
            100% Local / Offline
          </div>
        </div>
        <ul className="space-y-1.5 text-[11px] text-[#BBB] leading-relaxed pl-1">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />
            <span>Sin requests automáticos a internet — toda la lógica corre en tu navegador.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />
            <span>Datos permanecen en IndexedDB local (Dexie). No se sincronizan con ningún servidor.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />
            <span>Búsqueda, herramientas y backups 100% offline.</span>
          </li>
        </ul>
        {/* Dexie schema version badge — read at render from the live Dexie
            instance. db.verno is the version number of the schema currently
            active in the browser's IndexedDB. */}
        <div className="flex items-center gap-2 pt-1 border-t border-[#1a1a1a]">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#555]">DB schema</span>
          <code className="font-mono text-[10px] text-blue-300 bg-blue-500/5 border border-blue-500/20 px-1.5 py-0.5 rounded">
            v{db.verno}
          </code>
          <span className="text-[10px] text-[#555]">·</span>
          <span className="font-mono text-[10px] text-[#555]">{db.name}</span>
        </div>
      </div>

      {/* REGLA DE ORO — Videos folder (disk files, references only) */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
          <Video className="w-4 h-4 text-amber-400" /> Carpeta de Videos — archivos reales en tu disco
        </h2>
        <p className="text-[11px] text-[#888] leading-relaxed">
          Los videos <strong>nunca</strong> se guardan en la base de datos del navegador ni viajan en los backups.
          Viven únicamente como archivos en <strong>esta carpeta</strong> de tu PC, y los apuntes guardan solo el
          nombre del archivo. Al cambiar de PC, copia la carpeta tal cual y <em>Re-linkeala</em> aquí.
        </p>

        {!fsSupported ? (
          <div className="flex items-start gap-2 text-[11px] text-[#999] bg-[#161616] border border-[#262626] rounded p-2.5">
            <HardDrive className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>Abre la app en <strong>Microsoft Edge</strong> o Chrome para usar la carpeta de videos (File System Access API).</span>
          </div>
        ) : hasVideosDir ? (
          <div className="space-y-2.5">
            <div className={`flex items-center gap-2 text-[11px] rounded p-2.5 border ${videosPermOk ? 'bg-green-500/5 border-green-500/30 text-green-300' : 'bg-amber-500/5 border-amber-500/30 text-amber-300'}`}>
              <FolderOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="font-mono truncate">
                {videosDirName} {videosPermOk ? '— activa ✓' : '— el navegador pedirá acceso al abrir un video'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {!videosPermOk && (
                <button
                  onClick={handleGrantVideosPerm}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Conceder acceso ahora
                </button>
              )}
              <button
                onClick={handlePickVideosDir}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] hover:bg-[#202020] text-[#DDD] border border-[#262626] text-[11px] font-semibold transition-colors cursor-pointer"
              >
                <FolderOpen className="w-3 h-3" />
                Cambiar carpeta
              </button>
              <button
                onClick={handleForgetVideosDir}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] hover:bg-red-500/10 hover:text-red-300 text-[#999] border border-[#262626] text-[11px] font-semibold transition-colors cursor-pointer"
                title="Dejar de usar la carpeta de videos (no borra los archivos)"
              >
                <FolderX className="w-3 h-3" />
                Dejar de usar carpeta
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <button
              onClick={handlePickVideosDir}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              Elegir carpeta de videos
            </button>
            <p className="text-[10px] text-[#666] text-center">También se te pedirá automáticamente la primera vez que insertes un video en un apunte o lab.</p>
          </div>
        )}
      </div>

      {/* App folder — backup target only (videos decoupled, REGLA DE ORO) */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
          <FolderOpen className="w-4 h-4 text-blue-400" /> Carpeta de la App — destino de los backups
        </h2>
        <p className="text-[11px] text-[#888] leading-relaxed">
          Elige una carpeta (p. ej. la de la propia app, donde está <code className="font-mono text-blue-400">iniciar.bat</code>) y cada
          <strong> Guardar Backup</strong> escribirá <code className="font-mono text-blue-400">VaultNotes-Backup.zip</code> ahí mismo,
          sobrescribiendo el anterior. <strong>Nada de videos aquí</strong> — el backup es liviano y portable.
        </p>

        {!fsSupported ? (
          <div className="flex items-start gap-2 text-[11px] text-[#999] bg-[#161616] border border-[#262626] rounded p-2.5">
            <HardDrive className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>Abre la app en <strong>Microsoft Edge</strong> o Chrome para usar esta función. Los backups se descargarán por el navegador.</span>
          </div>
        ) : hasApp ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-[11px] rounded p-2.5 border bg-green-500/5 border-green-500/30 text-green-300">
              <FolderOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="font-mono truncate">
                {appName}/VaultNotes-Backup.zip — activa ✓
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handlePickAppDir}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] hover:bg-[#202020] text-[#DDD] border border-[#262626] text-[11px] font-semibold transition-colors cursor-pointer"
              >
                <FolderOpen className="w-3 h-3" />
                Cambiar carpeta
              </button>
              <button
                onClick={handleForgetAppDir}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] hover:bg-red-500/10 hover:text-red-300 text-[#999] border border-[#262626] text-[11px] font-semibold transition-colors cursor-pointer"
                title="Dejar de usar la carpeta de la app (no borra los archivos)"
              >
                <FolderX className="w-3 h-3" />
                Dejar de usar carpeta
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <button
              onClick={handlePickAppDir}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              Elegir carpeta para los backups
            </button>
            <p className="text-[10px] text-[#666] text-center">Opcional: sin carpeta, cada backup pedirá dónde guardarse.</p>
          </div>
        )}
      </div>

      {/* Respaldo automático — mantiene una carpeta (ideal: tu USB) al día */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
          <Usb className="w-4 h-4 text-emerald-400" /> Respaldo automático (USB)
        </h2>
        <p className="text-[11px] text-[#888] leading-relaxed">
          Cada {autoStatus.enabled ? `${autoStatus.intervalMin} min` : 'tantos minutos como elijas'} con cambios sin respaldar, la app
          escribe un ZIP rotativo en <strong className="text-[#DDD]">{appName ?? 'la carpeta de la app'}</strong> —
          apuntes, <strong className="text-[#DDD]">fotos y PDFs incluidos</strong> — conservando los últimos {autoStatus.retention}.
          Al llegar a otra máquina: <strong className="text-[#DDD]">Restaurar último backup</strong> y todo vuelve (merge no destructivo).
        </p>

        {!fsSupported ? (
          <div className="flex items-start gap-2 text-[11px] text-[#999] bg-[#161616] border border-[#262626] rounded p-2.5">
            <HardDrive className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>Requiere <strong>Microsoft Edge</strong> o Chrome (File System Access API).</span>
          </div>
        ) : !hasApp ? (
          <div className="flex items-start gap-2 text-[11px] text-[#bbb] bg-amber-500/5 border border-amber-500/30 rounded p-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>Elige primero la <strong>Carpeta de la App</strong> (panel de arriba) — apúntala a la carpeta de tu USB para el flujo portátil.</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            <button
              onClick={handleToggleAutoBackup}
              className={
                autoStatus.enabled
                  ? 'w-full flex items-center justify-center gap-2 py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer'
                  : 'w-full flex items-center justify-center gap-2 py-2.5 rounded bg-[#161616] hover:bg-[#202020] text-[#DDD] border border-[#262626] text-xs font-semibold transition-colors cursor-pointer'
              }
            >
              {autoStatus.enabled ? <CheckCircle2 className="w-4 h-4" /> : <Usb className="w-4 h-4" />}
              {autoStatus.enabled ? 'Respaldo automático ACTIVO — clic para desactivar' : 'Activar respaldo automático'}
            </button>

            {autoStatus.enabled && (
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] text-[#888] space-y-1">
                  <span className="uppercase tracking-wide">Cada cuánto</span>
                  <select
                    value={autoStatus.intervalMin}
                    onChange={(e) => updateAutoBackupSettings({ intervalMin: Number(e.target.value) })}
                    className="w-full bg-[#161616] border border-[#262626] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {INTERVAL_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m} min</option>
                    ))}
                  </select>
                </label>
                <label className="text-[10px] text-[#888] space-y-1">
                  <span className="uppercase tracking-wide">Conservar</span>
                  <select
                    value={autoStatus.retention}
                    onChange={(e) => updateAutoBackupSettings({ retention: Number(e.target.value) })}
                    className="w-full bg-[#161616] border border-[#262626] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {RETENTION_OPTIONS.map((n) => (
                      <option key={n} value={n}>últimos {n}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div className="flex items-center gap-2 text-[11px] text-[#999] bg-[#161616] border border-[#262626] rounded p-2.5">
              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${autoStatus.dirty ? 'text-amber-400' : 'text-emerald-400'}`} />
              <span>
                Último respaldo: <strong className="text-[#DDD]">{fmtRel(autoStatus.lastOkAt)}</strong>
                {autoStatus.enabled && (
                  <> · {autoStatus.dirty ? 'cambios pendientes de respaldar' : 'al día — sin cambios'}</>
                )}
                {autoStatus.running && <> · <strong className="text-emerald-300">respaldando…</strong></>}
              </span>
            </div>

            {autoStatus.permOk === false && autoStatus.enabled && (
              <div className="flex items-start gap-2 text-[11px] text-[#bbb] bg-amber-500/5 border border-amber-500/30 rounded p-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>El permiso de la carpeta caducó (normal tras reiniciar el navegador). Pulsa <strong>Respaldar ahora</strong> — el clic reactiva el permiso.</span>
              </div>
            )}

            {autoStatus.lastError && (
              <div className="flex items-start gap-2 text-[11px] text-red-300 bg-red-500/5 border border-red-500/30 rounded p-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <span>{autoStatus.lastError}</span>
              </div>
            )}

            {autoMsg && (
              <div className="flex items-start gap-2 text-[11px] text-emerald-300 bg-emerald-500/5 border border-emerald-500/30 rounded p-2.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{autoMsg}</span>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleBackupNow}
                disabled={autoBusy || autoStatus.running}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] hover:bg-[#202020] text-[#DDD] border border-[#262626] text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Escribe un respaldo ZIP ahora mismo (también reactiva el permiso de la carpeta)"
              >
                <RefreshCw className={`w-3 h-3 ${autoStatus.running ? 'animate-spin' : ''}`} />
                Respaldar ahora
              </button>
              <button
                onClick={handleRestoreLatest}
                disabled={autoBusy || autoStatus.running}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] hover:bg-[#202020] text-[#DDD] border border-[#262626] text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Importa el backup más nuevo de la carpeta (merge no destructivo por fecha)"
              >
                <RotateCcw className="w-3 h-3" />
                Restaurar último backup
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-blue-400" /> Categorías ({categories.length})
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
              placeholder="Nueva categoría..."
              className="flex-1 bg-[#161616] border border-[#262626] rounded px-2.5 py-1.5 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-blue-500"
            />
            <button onClick={handleAddCategory} className="p-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          <div className="divide-y divide-[#1a1a1a] max-h-96 overflow-y-auto">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between py-2 text-xs text-[#DDD]">
                <span className="truncate">{cat.name}</span>
                <button onClick={() => handleDeleteCategory(cat)} className="p-1 text-[#666] hover:text-red-400" title="Eliminar">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-emerald-400" /> Herramientas ({tools.length})
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTool}
              onChange={(e) => setNewTool(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddTool(); }}
              placeholder="Nueva herramienta..."
              className="flex-1 bg-[#161616] border border-[#262626] rounded px-2.5 py-1.5 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-emerald-500"
            />
            <button onClick={handleAddTool} className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          <div className="divide-y divide-[#1a1a1a] max-h-96 overflow-y-auto">
            {tools.map((tool) => (
              <div key={tool.id} className="flex items-center justify-between py-2 text-xs text-[#DDD]">
                <span className="truncate">{tool.name}</span>
                <button onClick={() => handleDeleteTool(tool)} className="p-1 text-[#666] hover:text-red-400" title="Eliminar">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 text-[11px] text-[#666] bg-[#0D0D0D] border border-[#262626] rounded p-3">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <span>Si una categoría o herramienta está en uso por un apunte, lab o término, no se puede eliminar hasta que dejes de usarla.</span>
      </div>
    </div>
  );
};
