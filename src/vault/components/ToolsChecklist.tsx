import React, { useState } from 'react';
import { Plus, Check, Search, X, Wrench } from 'lucide-react';
import { ToolItem } from '../types';
import { db } from '../db';

interface ToolsChecklistProps {
  tools: ToolItem[];
  selectedTools: string[];
  onChange: (selected: string[]) => void;
}

export const ToolsChecklist: React.FC<ToolsChecklistProps> = ({
  tools,
  selectedTools,
  onChange,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newToolName, setNewToolName] = useState('');

  const handleToggle = (toolName: string) => {
    if (selectedTools.includes(toolName)) {
      onChange(selectedTools.filter(t => t !== toolName));
    } else {
      onChange([...selectedTools, toolName]);
    }
  };

  const handleAddTool = async () => {
    if (!newToolName.trim()) return;
    const name = newToolName.trim();
    // Check if already exists in tools
    const exists = tools.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (!exists) {
      const newTool: ToolItem = {
        id: `tool-${Date.now()}`,
        name,
        createdAt: new Date().toISOString()
      };
      await db.tools.add(newTool);
    }
    if (!selectedTools.includes(name)) {
      onChange([...selectedTools, name]);
    }
    setNewToolName('');
    setIsAdding(false);
  };

  const filteredTools = tools.filter(t =>
    t.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="w-full border border-[#262626] bg-[#0d0d0d] rounded-lg overflow-hidden flex flex-col">
      {/* Search & Add button */}
      <div className="p-2 border-b border-[#262626] bg-[#121212] flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666]" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Buscar herramientas (Splunk, Wireshark...)"
            className="w-full bg-[#181818] border border-[#262626] rounded pl-8 pr-2.5 py-1 text-xs text-white placeholder-[#666] focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setIsAdding(!isAdding);
            setNewToolName('');
          }}
          className="flex items-center gap-1 px-2.5 py-1 bg-[#1a1a1a] hover:bg-emerald-600/20 hover:border-emerald-500/40 border border-[#2c2c2c] rounded text-xs font-semibold text-[#ddd] hover:text-emerald-300 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Agregar Herramienta</span>
        </button>
      </div>

      {/* Adding inline */}
      {isAdding && (
        <div className="p-2 bg-[#161616] border-b border-[#262626] flex items-center gap-2 animate-in fade-in duration-100">
          <Wrench className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={newToolName}
            onChange={(e) => setNewToolName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTool();
              } else if (e.key === 'Escape') {
                setIsAdding(false);
              }
            }}
            placeholder="Nombre de herramienta (ej: KQL, Ghidra, Zeek)..."
            className="bg-[#0f0f0f] border border-[#333] rounded px-2.5 py-1 text-xs text-white placeholder-[#666] focus:border-emerald-500 focus:outline-none flex-1"
          />
          <button
            type="button"
            onClick={handleAddTool}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded shrink-0"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="p-1 text-[#888] hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Multi-select Grid / List */}
      <div className="max-h-48 overflow-y-auto p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 scrollbar-thin scrollbar-thumb-[#262626]">
        {filteredTools.map(tool => {
          const isSelected = selectedTools.includes(tool.name);
          return (
            <div
              key={tool.id}
              onClick={() => handleToggle(tool.name)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer select-none transition-colors border ${
                isSelected
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-medium'
                  : 'bg-[#141414] border-[#222] text-[#bbb] hover:border-[#333] hover:text-white'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'border-[#444] bg-[#1a1a1a]'
                }`}
              >
                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
              <span className="truncate">{tool.name}</span>
            </div>
          );
        })}
      </div>

      {/* Selected badges */}
      {selectedTools.length > 0 && (
        <div className="p-2 bg-[#121212] border-t border-[#262626] flex items-center flex-wrap gap-1.5 text-xs">
          <span className="text-[10px] uppercase font-bold text-[#777] mr-1">Seleccionadas ({selectedTools.length}):</span>
          {selectedTools.map(toolName => (
            <span
              key={toolName}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium"
            >
              <span className="truncate max-w-[160px]">{toolName}</span>
              <button
                type="button"
                onClick={() => handleToggle(toolName)}
                className="hover:text-white text-emerald-400 ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
