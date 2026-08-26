import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check, Search, X, Shield } from 'lucide-react';
import { PlatformItem } from '../types';
import { db } from '../db';

interface PlatformSelectorProps {
  platforms: PlatformItem[];
  selectedPlatform: string;
  onChange: (platform: string) => void;
  placeholder?: string;
  label?: string;
}

export const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  platforms,
  selectedPlatform,
  onChange,
  placeholder = 'Selecciona o escribe plataforma...',
  label = 'Plataforma / Ecosistema'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [, setIsAdding] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsAdding(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (name: string) => {
    onChange(name);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCreatePlatform = async () => {
    const name = (newPlatformName || searchQuery).trim();
    if (!name) return;

    // Check if already exists
    const exists = platforms.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (!exists) {
      const newPlat: PlatformItem = {
        id: `plat-${Date.now()}`,
        name,
        createdAt: new Date().toISOString()
      };
      await db.platforms.add(newPlat);
    }
    onChange(name);
    setNewPlatformName('');
    setSearchQuery('');
    setIsAdding(false);
    setIsOpen(false);
  };

  const filteredPlatforms = platforms.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] text-[#555] font-normal font-mono">Sincronizado global</span>
        </label>
      )}

      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#161616] border border-[#262626] hover:border-[#383838] focus-within:border-blue-500 rounded-md px-3 py-2 text-xs text-white flex items-center justify-between cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2 truncate">
          <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          {selectedPlatform ? (
            <span className="font-semibold text-white truncate">{selectedPlatform}</span>
          ) : (
            <span className="text-[#666]">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[#888] transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#121212] border border-[#2c2c2c] rounded-md shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
          {/* Search box */}
          <div className="p-2 border-b border-[#262626] bg-[#161616] flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#666] shrink-0" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredPlatforms.length > 0) {
                    handleSelect(filteredPlatforms[0].name);
                  } else {
                    handleCreatePlatform();
                  }
                }
              }}
              placeholder="Buscar o crear plataforma..."
              className="w-full bg-transparent border-none text-xs text-white placeholder-[#666] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[#666] hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Platform options list */}
          <div className="max-h-48 overflow-y-auto p-1 space-y-0.5 scrollbar-thin scrollbar-thumb-[#262626]">
            {filteredPlatforms.map(plat => {
              const isSelected = selectedPlatform === plat.name;
              return (
                <div
                  key={plat.id}
                  onClick={() => handleSelect(plat.name)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-600/20 text-blue-300 font-semibold'
                      : 'text-[#ccc] hover:bg-[#1f1f1f] hover:text-white'
                  }`}
                >
                  <span className="truncate">{plat.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                </div>
              );
            })}

            {filteredPlatforms.length === 0 && searchQuery.trim() && (
              <div className="p-2 text-center text-xs text-[#888]">
                No existe &quot;{searchQuery}&quot;.
              </div>
            )}
          </div>

          {/* Quick inline create */}
          {searchQuery.trim() && !platforms.some(p => p.name.toLowerCase() === searchQuery.trim().toLowerCase()) && (
            <div className="p-1.5 border-t border-[#262626] bg-[#161616]">
              <button
                type="button"
                onClick={handleCreatePlatform}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear y seleccionar &quot;{searchQuery.trim()}&quot;</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
