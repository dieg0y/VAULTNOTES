/**
 * useDefaultSelection — patrón "derived state during render" de React
 * (ajustar estado durante el render con guard de valor previo).
 *
 * Extraído del bloque inline x3 que vivía en App.tsx (notas / labs /
 * glosario): selecciona un ítem por defecto la primera vez que llega la
 * colección y REPONE la selección si el ítem seleccionado desaparece
 * (p. ej. se movió a la papelera o se vació la colección).
 *
 * Por qué este patrón y no un useEffect: sin efecto y sin render en
 * cascada — respeta la regla set-state-in-effect del React Compiler
 * (eslint-config-next 16.4.5). El guard `items !== prevItems` hace que
 * la lógica solo corra cuando cambia la referencia de la colección (una
 * re-emisión de useLiveQuery), nunca en re-renders normales, y respeta
 * una selección explícita del usuario mientras el ítem siga vivo.
 */
import { useState } from 'react';

/** Ítem seleccionable: identificador estable + borrado lógico opcional. */
interface SelectableItem {
  id: string;
  isDeleted?: boolean;
}

/**
 * @param items        Colección reactiva (p. ej. resultado de useLiveQuery).
 * @param selectedId   Id seleccionado actualmente (state del caller).
 * @param setSelectedId Setter estable del caller (recibe `string | null`).
 * @param pick         Criterio de selección por defecto. Por defecto toma
 *                     el primer ítem NO borrado; la variante de notas pasa
 *                     uno propio (primero una raíz sin parentId y, si no
 *                     hay, cualquier nota activa).
 */
export function useDefaultSelection<T extends SelectableItem>(
  items: T[],
  selectedId: string | null,
  setSelectedId: (id: string | null) => void,
  pick: (items: T[]) => T | undefined = (list) => list.find((i) => !i.isDeleted),
): void {
  // Guard de valor previo: recuerda la última referencia de la colección
  // para no re-evaluar la selección en cada render.
  const [prevItems, setPrevItems] = useState<T[] | null>(null);
  if (items !== prevItems) {
    setPrevItems(items);
    // Repone la selección solo si no hay ninguna o si la actual ya no
    // existe en la colección activa (borrada lógicamente o purgeada).
    if (!selectedId || !items.some((i) => i.id === selectedId && !i.isDeleted)) {
      const active = pick(items);
      if (active) setSelectedId(active.id);
    }
  }
}
