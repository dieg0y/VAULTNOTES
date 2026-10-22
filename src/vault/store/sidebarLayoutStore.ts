/**
 * sidebarLayoutStore.ts — V11: orden + plegado del sidebar, por el usuario.
 *
 * El usuario pidió poder MOVER apartados (p. ej. subir Inbox arriba del
 * todo) y grupos enteros (p. ej. bajar "Global Knowledge"), además de
 * plegar/desplegar grupos con un clic. Este store persiste:
 *  - groupOrder: orden de los grupos (ids estables de Sidebar.tsx).
 *  - itemOrder: orden de los items dentro de cada grupo (section ids).
 *  - collapsed: grupos plegados por el usuario.
 *
 * La reconciliación es tolerante a versiones: ids desconocidos se ignoran
 * y grupos/items NUEVOS que falten en el orden guardado se agregan al
 * final (nunca se pierde una sección por actualizar la app).
 * 100% offline — solo localStorage, nada de red.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SidebarLayoutState {
  /** Orden de los grupos (ids estables). Vacío = orden por defecto. */
  groupOrder: string[];
  /** Orden de items por grupo: groupId → section ids. */
  itemOrder: Record<string, string[]>;
  /** Grupos plegados por el usuario: groupId → true. */
  collapsed: Record<string, boolean>;
  setGroupOrder: (ids: string[]) => void;
  setItemOrder: (groupId: string, ids: string[]) => void;
  toggleCollapsed: (groupId: string) => void;
}

export const useSidebarLayoutStore = create<SidebarLayoutState>()(
  persist(
    (set) => ({
      groupOrder: [],
      itemOrder: {},
      collapsed: {},
      setGroupOrder: (ids) => set({ groupOrder: ids }),
      setItemOrder: (groupId, ids) =>
        set((s) => ({ itemOrder: { ...s.itemOrder, [groupId]: ids } })),
      toggleCollapsed: (groupId) =>
        set((s) => ({ collapsed: { ...s.collapsed, [groupId]: !s.collapsed[groupId] } })),
    }),
    { name: 'vaultnotes-sidebar-layout' }
  )
);
