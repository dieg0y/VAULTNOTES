// cronData.ts
// Dataset de ejemplos y atajos Cron para la herramienta "Cron Parser" de VaultNotes.
// 100% offline — alimenta el componente ToolsView y la búsqueda global fuzzy.

export interface CronExample {
  expr: string;
  desc: string;
}

export const CRON_EXAMPLES: CronExample[] = [
  { expr: '*/5 * * * *', desc: 'Cada 5 minutos (típico para polling)' },
  { expr: '0 * * * *', desc: 'A los 0 minutos de cada hora (cada hora en punto)' },
  { expr: '0 9 * * 1-5', desc: 'A las 9:00 AM, lunes a viernes (días hábiles)' },
  { expr: '0 0 1 * *', desc: 'A medianoche del día 1 de cada mes (reporte mensual)' },
  { expr: '0 0 * * 0', desc: 'Cada domingo a medianoche (backups semanales)' },
  { expr: '0 22 * * 1-5', desc: 'A las 10 PM, lunes a viernes (tareas después del horario laboral)' },
  { expr: '0 0 1 1 *', desc: '1 de enero a medianoche (anual)' },
  { expr: '30 4 * * 6', desc: 'A las 4:30 AM cada sábado' },
  { expr: '0,30 * * * *', desc: 'A los 0 y 30 minutos (cada media hora)' },
];

interface CronShortcut {
  shortcut: string;
  equivalent: string;
}

export const CRON_SHORTCUTS: CronShortcut[] = [
  { shortcut: '@hourly', equivalent: '0 * * * *' },
  { shortcut: '@daily', equivalent: '0 0 * * *' },
  { shortcut: '@midnight', equivalent: '0 0 * * *' },
  { shortcut: '@weekly', equivalent: '0 0 * * 0' },
  { shortcut: '@monthly', equivalent: '0 0 1 * *' },
  { shortcut: '@yearly', equivalent: '0 0 1 1 *' },
  { shortcut: '@annually', equivalent: '0 0 1 1 *' },
  { shortcut: '@reboot', equivalent: 'ejecuta una sola vez al arrancar' },
];
