/**
 * cheatsheetCore.ts — modelo compartido de CHEATSHEET por pilar (V9).
 *
 * Misma forma que la CheatSheetEntry del Service Desk (V6), con category
 * como string libre para que cada pilar use sus propias etiquetas. Las
 * entradas de serviceDeskCheatSheet.ts son estructuralmente compatibles
 * (union → string), así que la vista recibe cualquiera de los 3 datasets.
 *
 * Regla de contenido: fix = 3-8 líneas, cada línea un paso/comando
 * concreto y REAL (no inventado). verify = cómo confirmar que quedó
 * resuelto. tags ES/EN para búsqueda fuzzy.
 */

export interface PillarCheatEntry {
  /** Id estable: CS-NNN (HD histórico), CS-SA-NNN, CS-SOC-NNN. */
  id: string;
  /** Título corto: problema → fix. */
  title: string;
  /** Categoría del pilar. */
  category: string;
  /** Lo que reporta el usuario / el alert (1-2 frases). */
  problem: string;
  /** El fix: 3-8 líneas, cada línea un paso/comando concreto. */
  fix: string[];
  /** Cómo confirmar que quedó resuelto — opcional. */
  verify?: string;
  /** Tags ES/EN para búsqueda fuzzy (6-12, con sinónimos). */
  tags: string[];
}
