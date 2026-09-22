/**
 * roadmapExport — genera el Markdown del progreso del roadmap
 * (checklist con estado) para guardarlo, pegarlo en una IA o
 * compartirlo. Mismo patrón que profileExport.
 *
 * v19: se generalizó el builder para soportar los DOS roadmaps:
 *  - IAM (roadmapData.ts — Junior IAM / Identity Security Analyst)
 *  - HelpDesk (roadmapHelpDeskData.ts — HelpDesk / IT Support → IAM)
 * Las firmas públicas originales se mantienen intactas.
 */

import { ROADMAP_TIERS, ROADMAP_MASTERY_NOTE, ROADMAP_HEADER, type RoadmapTierDef, type RoadmapPhaseDef, type RoadmapHeaderDef } from '../data/roadmapData';
import { ROADMAP_HD_TIERS, ROADMAP_HD_MASTERY_NOTE, ROADMAP_HD_HEADER } from '../data/roadmapHelpDeskData';
import { ROADMAP_SA_TIERS, ROADMAP_SA_MASTERY_NOTE, ROADMAP_SA_HEADER } from '../data/roadmapSysAdminData';

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

/** Builder genérico — compartido por los dos roadmaps. */
function buildChecklistMarkdown(
  tiers: RoadmapTierDef[],
  header: RoadmapHeaderDef,
  masteryNote: string,
  doneMap: Map<string, boolean>
): string {
  const lines: string[] = [];

  let doneAll = 0;
  let totalAll = 0;
  for (const tier of tiers) {
    const { done, total } = tierProgress(tier, doneMap);
    doneAll += done;
    totalAll += total;
  }
  const pct = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0;

  lines.push(`# ${header.title}`);
  lines.push('');
  lines.push(`**${header.specialization}** | **${header.edge}**`);
  lines.push('');
  lines.push(`**Progreso global: ${doneAll}/${totalAll} ítems (${pct}%)**`);
  lines.push('');
  lines.push(`> ${masteryNote}`);
  lines.push('');

  for (const tier of tiers) {
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

const dateStamp = (): string => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

/** Markdown del roadmap IAM completo con el estado de cada ítem. */
export function buildRoadmapMarkdown(doneMap: Map<string, boolean>): string {
  return buildChecklistMarkdown(ROADMAP_TIERS, ROADMAP_HEADER, ROADMAP_MASTERY_NOTE, doneMap);
}

/** Nombre de archivo seguro para el export del roadmap IAM. */
export function roadmapMarkdownFilename(): string {
  return `Roadmap-IAM-${dateStamp()}.md`;
}

/** Markdown del roadmap HelpDesk completo con el estado de cada ítem. */
export function buildRoadmapHdMarkdown(doneMap: Map<string, boolean>): string {
  return buildChecklistMarkdown(ROADMAP_HD_TIERS, ROADMAP_HD_HEADER, ROADMAP_HD_MASTERY_NOTE, doneMap);
}

/** Nombre de archivo seguro para el export del roadmap HelpDesk. */
export function roadmapHdMarkdownFilename(): string {
  return `Roadmap-HelpDesk-${dateStamp()}.md`;
}

/** Markdown del roadmap SysAdmin completo con el estado de cada ítem. */
export function buildRoadmapSaMarkdown(doneMap: Map<string, boolean>): string {
  return buildChecklistMarkdown(ROADMAP_SA_TIERS, ROADMAP_SA_HEADER, ROADMAP_SA_MASTERY_NOTE, doneMap);
}

/** Nombre de archivo seguro para el export del roadmap SysAdmin. */
export function roadmapSaMarkdownFilename(): string {
  return `Roadmap-SysAdmin-${dateStamp()}.md`;
}
