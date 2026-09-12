/**
 * roadmapExport — genera el Markdown del progreso del roadmap
 * (checklist con estado) para guardarlo, pegarlo en una IA o
 * compartirlo. Mismo patrón que profileExport.
 */

import { ROADMAP_TIERS, ROADMAP_MASTERY_NOTE, ROADMAP_HEADER, type RoadmapTierDef, type RoadmapPhaseDef } from '../data/roadmapData';

export interface RoadmapProgress {
  /** Mapa id → done (ausente = false). */
  doneMap: Map<string, boolean>;
}

const tierProgress = (tier: RoadmapTierDef, doneMap: Map<string, boolean>): { done: number; total: number } => {
  let done = 0;
  let total = 0;
  for (const phase of tier.phases) {
    for (const item of phase.items) {
      total++;
      if (doneMap.get(item.id)) done++;
    }
  }
  return { done, total };
};

const phaseProgress = (phase: RoadmapPhaseDef, doneMap: Map<string, boolean>): { done: number; total: number } => {
  let done = 0;
  for (const item of phase.items) if (doneMap.get(item.id)) done++;
  return { done, total: phase.items.length };
};

/** Markdown del roadmap completo con el estado de cada ítem. */
export function buildRoadmapMarkdown(doneMap: Map<string, boolean>): string {
  const lines: string[] = [];

  let doneAll = 0;
  let totalAll = 0;
  for (const tier of ROADMAP_TIERS) {
    const { done, total } = tierProgress(tier, doneMap);
    doneAll += done;
    totalAll += total;
  }
  const pct = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0;

  lines.push(`# ${ROADMAP_HEADER.title}`);
  lines.push('');
  lines.push(`**${ROADMAP_HEADER.specialization}** | **${ROADMAP_HEADER.edge}**`);
  lines.push('');
  lines.push(`**Progreso global: ${doneAll}/${totalAll} ítems (${pct}%)**`);
  lines.push('');
  lines.push(`> ${ROADMAP_MASTERY_NOTE}`);
  lines.push('');

  for (const tier of ROADMAP_TIERS) {
    const { done, total } = tierProgress(tier, doneMap);
    lines.push(`## ${tier.title} — ${done}/${total}`);
    lines.push(`*${tier.subtitle}*`);
    lines.push('');
    for (const phase of tier.phases) {
      const pp = phaseProgress(phase, doneMap);
      const state = pp.done === pp.total && pp.total > 0 ? ' [COMPLETADA]' : pp.done > 0 ? ` [${pp.done}/${pp.total}]` : '';
      lines.push(`### FASE ${phase.number}: ${phase.title}${state}`);
      if (phase.note) {
        lines.push(`*${phase.note}*`);
        lines.push('');
      }
      for (const item of phase.items) {
        const checked = doneMap.get(item.id) ? 'x' : ' ';
        const label = item.label ? `**${item.label}:** ` : '';
        lines.push(`- [${checked}] ${label}${item.text}`);
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push(
    `Exportado desde VaultNotes el ${new Date().toLocaleString('es-CO')}. Progreso: ${doneAll}/${totalAll} (${pct}%).`
  );
  lines.push('');

  return lines.join('\n');
}

/** Nombre de archivo seguro para el export. */
export function roadmapMarkdownFilename(): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `Roadmap-IAM-${stamp}.md`;
}
