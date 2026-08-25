import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Trash2, Plus, Tag, Wrench, AlertTriangle, FolderOpen, HardDrive, RefreshCw, FolderX } from 'lucide-react';
import { CategoryItem, ToolItem } from '../types';
import { db, countCategoryUsage, countToolUsage } from '../db';
import {
  isFsSupported,
  hasVideosDir,
  getVideosDirName,
  isFsReady,
  pickVideosDir,
  forgetVideosDir,
  migrateIdbVideosToFs,
  getVideoStorageStats,
  VIDEOS_DIR_NAME,
} from '../utils/videoStorage';

interface SettingsViewProps {
  categories: CategoryItem[];
  tools: ToolItem[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({ categories, tools }) => {
  const [newCategory, setNewCategory] = useState('');
  const [newTool, setNewTool] = useState('');

  // --- Video storage panel state ---
  const [fsSupported] = useState(() => isFsSupported());
  const [hasDir, setHasDir] = useState(false);
  const [dirName, setDirName] = useState<string | null>(null);
  const [dirReady, setDirReady] = useState(false);
  const [stats, setStats] = useState<{ total: number; inFs: number; inIdb: number; idbBytes: number } | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);

  const refreshVideoStorage = useCallback(async () => {
    setHasDir(await hasVideosDir());
    setDirName(await getVideosDirName());
    setDirReady(await isFsReady());
    setStats(await getVideoStorageStats());
  }, []);

  useEffect(() => {
    refreshVideoStorage();
  }, [refreshVideoStorage]);

  const handlePickDir = async () => {
    const ok = await pickVideosDir();
    if (ok) {
      await refreshVideoStorage();
      // auto-migrate existing browser-stored videos to the folder
      const res = await migrateIdbVideosToFs();
      if (res.moved > 0) setMigrationResult(`${res.moved} video${res.moved === 1 ? '' : 's'} movido${res.moved === 1 ? '' : 's'} a la carpeta.`);
      await refreshVideoStorage();
    }
  };

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const res = await migrateIdbVideosToFs();
      setMigrationResult(
        res.moved + res.failed === 0
          ? 'No hay videos en el almacenamiento del navegador para migrar.'
          : `${res.moved} movido${res.moved === 1 ? '' : 's'} a la carpeta${res.failed > 0 ? `, ${res.failed} fallaron` : ''}.`
      );
      await refreshVideoStorage();
    } finally {
      setMigrating(false);
    }
  };

  const handleForgetDir = async () => {
    if (window.confirm('¿Dejar de usar la carpeta del PC? Los videos NUEVOS se guardarán en el almacenamiento del navegador (sujeto a su límite). Los archivos ya guardados no se borran.')) {
      await forgetVideosDir();
      await refreshVideoStorage();
    }
  };

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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

      {/* Video Storage */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
          <FolderOpen className="w-4 h-4 text-blue-400" /> Almacenamiento de Videos
        </h2>
        <p className="text-[11px] text-[#888] leading-relaxed">
          Con una carpeta en tu PC, los videos se guardan como <strong>archivos reales</strong> (MP4, WEBM...) en
          {' '}<code className="font-mono text-blue-400">{VIDEOS_DIR_NAME}/</code> — <strong>sin límite de tamaño</strong> más allá del
          espacio libre de tu disco. Los backups ZIP siempre los incluyen, vengan de donde vengan.
        </p>

        {!fsSupported ? (
          <div className="flex items-start gap-2 text-[11px] text-[#999] bg-[#161616] border border-[#262626] rounded p-2.5">
            <HardDrive className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>Abre la app en <strong>Microsoft Edge</strong> para usar la carpeta del PC (soporte completo). Los videos se guardan en el almacenamiento del navegador con persistencia activada.</span>
          </div>
        ) : hasDir ? (
          <div className="space-y-2.5">
            <div className={`flex items-center gap-2 text-[11px] rounded p-2.5 border ${dirReady ? 'bg-green-500/5 border-green-500/30 text-green-300' : 'bg-amber-500/5 border-amber-500/30 text-amber-300'}`}>
              <FolderOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="font-mono truncate">
                .../{dirName}/{VIDEOS_DIR_NAME} {dirReady ? '— activa ✓' : '— requiere conceder acceso al abrir una nota con videos'}
              </span>
            </div>
            {stats && (
              <div className="text-[11px] text-[#888] flex flex-wrap gap-x-4 gap-y-1">
                <span>{stats.total} video{stats.total === 1 ? '' : 's'} en total</span>
                <span className="text-green-400">{stats.inFs} en la carpeta del PC</span>
                {stats.inIdb > 0 && (
                  <span className="text-amber-400">{stats.inIdb} en el navegador ({formatBytes(stats.idbBytes)})</span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {stats && stats.inIdb > 0 && dirReady && (
                <button
                  onClick={handleMigrate}
                  disabled={migrating}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${migrating ? 'animate-spin' : ''}`} />
                  {migrating ? 'Migrando...' : `Migrar ${stats.inIdb} a la carpeta`}
                </button>
              )}
              <button
                onClick={handlePickDir}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] hover:bg-[#202020] text-[#DDD] border border-[#262626] text-[11px] font-semibold transition-colors cursor-pointer"
              >
                <FolderOpen className="w-3 h-3" />
                Cambiar carpeta
              </button>
              <button
                onClick={handleForgetDir}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] hover:bg-red-500/10 hover:text-red-300 text-[#999] border border-[#262626] text-[11px] font-semibold transition-colors cursor-pointer"
                title="Dejar de usar la carpeta del PC (no borra los archivos)"
              >
                <FolderX className="w-3 h-3" />
                Dejar de usar carpeta
              </button>
            </div>
            {migrationResult && <p className="text-[11px] text-green-400">{migrationResult}</p>}
          </div>
        ) : (
          <button
            onClick={handlePickDir}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <FolderOpen className="w-4 h-4" />
            Elegir carpeta para videos (sin límites)
          </button>
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
