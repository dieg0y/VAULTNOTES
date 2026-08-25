import React, { useState } from 'react';
import { Settings, Trash2, Plus, Tag, Wrench, AlertTriangle } from 'lucide-react';
import { CategoryItem, ToolItem } from '../types';
import { db, countCategoryUsage, countToolUsage } from '../db';

interface SettingsViewProps {
  categories: CategoryItem[];
  tools: ToolItem[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({ categories, tools }) => {
  const [newCategory, setNewCategory] = useState('');
  const [newTool, setNewTool] = useState('');

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
