/**
 * commandsCore.ts — modelo compartido de COMANDOS MÁS USADOS por pilar
 * (sección "Comandos" del sidebar).
 *
 * Un comando de esta base de datos responde TODO lo que se le puede
 * preguntar a un L1/L2 antes de ejecutarlo: ¿qué hace? ¿por qué existe /
 * cuándo usarlo? ¿cuál es su sintaxis? ¿cuáles son sus casos de uso
 * reales (tickets)? ¿qué ejemplos copiables existen? ¿cómo se lee la
 * salida? ¿qué errores comunes tiene? ¿con qué otros comandos se combina?
 *
 * Pilares cubiertos (petición del usuario): HELPDESK + IAM (prioritarios)
 * y SOC. SysAdmin NO entra aquí (sus comandos viven en los runbooks y
 * troubleshooting del Pilar 4).
 *
 * Reglas de contenido (NON-NEGOTIABLE):
 *  - NO inventar comandos, flags, parámetros ni rutas. Si un comando está
 *    deprecado (p. ej. wmic), se marca en tips con su reemplazo moderno.
 *  - Placeholders permitidos: {{USERNAME}} {{DOMAIN}} {{HOSTNAME}}
 *    {{IP}} {{GROUP}} {{TICKET_ID}} {{PATH}} {{PORT}}.
 *  - Idioma: campos descriptivos en es-CO; los comandos y su sintaxis en
 *    el idioma real en que se ejecutan (inglés).
 *  - Nivel de uso: 'esencial' (se usa a diario) > 'frecuente' (varias
 *    veces por semana) > 'situacional' (casos concretos).
 */

/** Pilares con comandos catalogados (orden = prioridad del usuario). */
export type CommandPillarKey = 'HELPDESK' | 'IAM' | 'SOC';

/** Nivel de uso del comando (prioridad para ordenar la lista). */
export type CommandLevel = 'esencial' | 'frecuente' | 'situacional';

/** Metadatos visuales por pilar (badge + filtro de la vista). */
export const COMMAND_PILLAR_META: Record<
  CommandPillarKey,
  { label: string; short: string; chip: string; accentText: string; accentBg: string; accentBorder: string; accentRing: string; order: number }
> = {
  HELPDESK: {
    label: 'HelpDesk / Service Desk',
    short: 'HD',
    chip: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    accentText: 'text-blue-400',
    accentBg: 'bg-blue-500/10',
    accentBorder: 'border-blue-500/20',
    accentRing: 'focus:border-blue-500/40',
    order: 1,
  },
  IAM: {
    label: 'IAM / Identity & Access',
    short: 'IAM',
    chip: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    accentText: 'text-violet-400',
    accentBg: 'bg-violet-500/10',
    accentBorder: 'border-violet-500/20',
    accentRing: 'focus:border-violet-500/40',
    order: 2,
  },
  SOC: {
    label: 'SOC / Blue Team',
    short: 'SOC',
    chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    accentText: 'text-emerald-400',
    accentBg: 'bg-emerald-500/10',
    accentBorder: 'border-emerald-500/20',
    accentRing: 'focus:border-emerald-500/40',
    order: 3,
  },
};

/** Metadatos visuales por nivel de uso. */
export const COMMAND_LEVEL_META: Record<CommandLevel, { label: string; chip: string; order: number }> = {
  esencial: { label: 'Esencial', chip: 'bg-amber-500/10 text-amber-300 border-amber-500/30', order: 1 },
  frecuente: { label: 'Frecuente', chip: 'bg-[#262626] text-[#BBB] border-[#333]', order: 2 },
  situacional: { label: 'Situacional', chip: 'bg-[#161616] text-[#777] border-[#262626]', order: 3 },
};

/** Un ejemplo real y copiable del comando. */
export interface CommandExample {
  /** Invocación exacta (con placeholders si aplica). */
  cmd: string;
  /** Qué hace este ejemplo / qué esperar de la salida. */
  note?: string;
}

/** Un comando del catálogo. */
export interface VaultCommand {
  /** Id estable y único: CMD-HD-001 / CMD-IAM-001 / CMD-SOC-001… */
  id: string;
  /** Pilar dueño del comando. */
  pillar: CommandPillarKey;
  /** Invocación canónica que se muestra y copia: 'ipconfig /all'. */
  command: string;
  /** Nombre corto en español de lo que hace. */
  title: string;
  /** Categoría por pilar ('Red', 'AD y cuentas', 'KQL', 'Linux'…). */
  category: string;
  /** Dónde se ejecuta: CMD / PowerShell / Bash / KQL / SPL / AWS CLI /
   *  Azure CLI / gcloud / Okta API / LDAP / Graph REST / Sysinternals. */
  shell: string;
  /** Nivel de uso real en el puesto. */
  level: CommandLevel;
  /** QUÉ hace el comando (técnico y concreto). */
  what: string;
  /** POR QUÉ importa / CUÁNDO usarlo (el contexto del puesto). */
  why: string;
  /** Sintaxis con placeholders: 'ipconfig [/all | /flushdns]'. */
  syntax: string;
  /** Casos de uso típicos (2-4, en lenguaje de ticket). */
  use_cases: string[];
  /** Ejemplos reales copiables (1-3). */
  examples: CommandExample[];
  /** Cómo leer la salida: campos clave y qué significan. */
  output?: string;
  /** Errores comunes, flags útiles, warnings y deprecaciones. */
  tips: string[];
  /** Ids de comandos relacionados (CMD-*) — navegación cruzada. */
  related?: string[];
  /** Keywords ES/EN para búsqueda fuzzy. */
  keywords: string[];
}

/** Deriva las categorías únicas (orden de aparición) de un dataset. */
export function deriveCommandCategories(cmds: VaultCommand[]): string[] {
  const seen = new Set<string>();
  for (const c of cmds) if (!seen.has(c.category)) seen.add(c.category);
  return [...seen];
}

/** Prefijo de pilar de un id: 'CMD-HD-008' → 'CMD-HD'. */
function commandPillarPrefix(id: string): string {
  return id.split('-').slice(0, 2).join('-');
}

/** Valida referencias cruzadas DENTRO del propio dataset (misma familia de
 *  prefijo): los refuerzos entre pilares (CMD-HD → CMD-SOC…) se validan
 *  contra el corpus completo con validateCommandCorpus (la vista importa
 *  los 3 datasets y ejecuta esa verificación). Corre al importar; si
 *  revienta, el dataset está mal escrito. */
export function validateCommandDataset(cmds: VaultCommand[]): void {
  const ids = new Set(cmds.map((c) => c.id));
  const ownPrefixes = new Set(cmds.map((c) => commandPillarPrefix(c.id)));
  for (const c of cmds) {
    for (const r of c.related ?? []) {
      const isInternal = ownPrefixes.has(commandPillarPrefix(r));
      if (isInternal && !ids.has(r)) {
        throw new Error(`[commands] ${c.id}: referencia cruzada inválida → ${r}`);
      }
    }
  }
}

/** Valida TODAS las referencias cruzadas contra el corpus completo
 *  (los 3 datasets combinados). La ejecuta la vista al montar su módulo. */
export function validateCommandCorpus(cmds: VaultCommand[]): void {
  const ids = new Set(cmds.map((c) => c.id));
  for (const c of cmds) {
    for (const r of c.related ?? []) {
      if (!ids.has(r)) {
        throw new Error(`[commands-corpus] ${c.id}: referencia cruzada inválida → ${r}`);
      }
    }
  }
}
