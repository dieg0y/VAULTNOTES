import React, { useState, useMemo } from 'react';
import { Plus, Check, Search, X, Tag } from 'lucide-react';
import { CategoryItem } from '../types';
import { db } from '../db';

interface CategoryTreeChecklistProps {
  categories: CategoryItem[];
  selectedCategories: string[];
  onChange: (selected: string[]) => void;
  singleSelect?: boolean;
}

export const CategoryTreeChecklist: React.FC<CategoryTreeChecklistProps> = ({
  categories,
  selectedCategories = [],
  onChange,
  singleSelect = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Extract category names sorted and deduplicated
  const categoryNames = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    categories.forEach((c) => {
      const name = c.name?.trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push(name);
      }
    });

    // Also include any currently selected custom categories that might not be in db yet
    selectedCategories.forEach((cat) => {
      const trimmed = cat.trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) {
        seen.add(trimmed.toLowerCase());
        list.push(trimmed);
      }
    });

    return list;
  }, [categories, selectedCategories]);

  // Filtered list based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categoryNames;
    const q = searchQuery.toLowerCase().trim();
    return categoryNames.filter((cat) => cat.toLowerCase().includes(q));
  }, [categoryNames, searchQuery]);

  // Toggle selection
  const handleToggle = (categoryName: string) => {
    if (singleSelect) {
      if (selectedCategories.includes(categoryName)) {
        onChange([]);
      } else {
        onChange([categoryName]);
      }
      return;
    }

    if (selectedCategories.includes(categoryName)) {
      onChange(selectedCategories.filter((c) => c !== categoryName));
    } else {
      onChange([...selectedCategories, categoryName]);
    }
  };

  // Add custom new category
  const handleAddNewCategory = async () => {
    const cleanName = newCategoryName.trim();
    if (!cleanName) return;

    // Check if already in DB
    const existing = categories.find((c) => c.name.toLowerCase() === cleanName.toLowerCase());
    if (!existing) {
      const newCat: CategoryItem = {
        id: `cat-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
        name: cleanName,
        createdAt: new Date().toISOString(),
      };
      await db.categories.add(newCat);
    }

    // Auto-select
    handleToggle(cleanName);
    setNewCategoryName('');
    setIsAddingNew(false);
  };

  return (
    <div className="w-full border border-[#262626] bg-[#0d0d0d] rounded-lg overflow-hidden flex flex-col">
      {/* Search & Add New Header */}
      <div className="p-2 border-b border-[#262626] bg-[#121212] flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar categoría..."
            className="w-full bg-[#181818] border border-[#262626] rounded pl-8 pr-2.5 py-1 text-xs text-white placeholder-[#666] focus:border-blue-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#888] hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setIsAddingNew(!isAddingNew);
            setNewCategoryName('');
          }}
          className="flex items-center gap-1 px-2.5 py-1 bg-[#1a1a1a] hover:bg-blue-600/20 hover:border-blue-500/40 border border-[#2c2c2c] rounded text-xs font-semibold text-[#ddd] hover:text-blue-300 transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Agregar categoría</span>
        </button>
      </div>

      {/* Inline Form to Add New Category */}
      {isAddingNew && (
        <div className="p-2 bg-[#161616] border-b border-[#262626] flex items-center gap-2 animate-in fade-in duration-100">
          <Tag className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddNewCategory();
              } else if (e.key === 'Escape') {
                setIsAddingNew(false);
              }
            }}
            placeholder="Nombre de la nueva categoría..."
            className="bg-[#0f0f0f] border border-[#333] rounded px-2.5 py-1 text-xs text-white placeholder-[#666] focus:border-blue-500 focus:outline-none flex-1 font-medium"
          />
          <button
            type="button"
            onClick={handleAddNewCategory}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded shrink-0 cursor-pointer"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setIsAddingNew(false)}
            className="p-1 text-[#888] hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Multi-Select Checklist List */}
      <div className="max-h-52 overflow-y-auto p-2 grid grid-cols-1 sm:grid-cols-2 gap-1 scrollbar-thin scrollbar-thumb-[#262626]">
        {filteredCategories.length === 0 ? (
          <div className="col-span-2 p-4 text-center text-xs text-[#666]">
            No se encontraron categorías coincidentes. Puedes crearla con &quot;+ Agregar categoría&quot;.
          </div>
        ) : (
          filteredCategories.map((category) => {
            const isSelected = selectedCategories.includes(category);
            return (
              <div
                key={category}
                onClick={() => handleToggle(category)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer select-none ${
                  isSelected
                    ? 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30'
                    : 'text-[#BBB] hover:bg-[#181818] hover:text-white border border-transparent'
                }`}
              >
                {/* Custom Checkbox */}
                <div
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors shrink-0 ${
                    isSelected
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'border-[#444] bg-[#141414]'
                  }`}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>

                <span className="truncate">{category}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Selected badges at bottom */}
      {selectedCategories.length > 0 && (
        <div className="p-2 bg-[#121212] border-t border-[#262626] flex items-center flex-wrap gap-1.5 text-xs">
          <span className="text-[10px] uppercase font-bold text-[#777] mr-1">
            Seleccionadas ({selectedCategories.length}):
          </span>
          {selectedCategories.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] font-medium"
            >
              <span className="truncate max-w-[200px]">{cat}</span>
              <button
                type="button"
                onClick={() => handleToggle(cat)}
                className="hover:text-white text-blue-400 ml-0.5 cursor-pointer"
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
