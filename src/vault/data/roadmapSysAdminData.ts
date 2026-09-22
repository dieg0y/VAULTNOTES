/**
 * roadmapSysAdminData — ROADMAP: SYSADMIN / INFRASTRUCTURE & OPERATIONS →
 * SRE / Infra Engineer.
 *
 * Estructura idéntica a los roadmaps IAM y HelpDesk (reutiliza
 * RoadmapTierDef / RoadmapPhaseDef / RoadmapItemDef de roadmapData.ts):
 * 3 tiers + proyecto final. El checklist (estado done) persiste en la
 * tabla Dexie `roadmapSysAdminItems` (ids 'rmsa-*'); este archivo es la
 * FUENTE DE VERDAD del CONTENIDO. El seed añade filas para los ids que
 * falten — jamás resetea el progreso del usuario.
 */
import { type RoadmapTierDef } from './roadmapData';

export const ROADMAP_SA_HEADER = {
  title: 'Roadmap: SysAdmin / Infra & Ops → SRE',
  specialization: 'Especialización de Infraestructura: Linux · Windows Server · Red · Storage · Virtualización',
  edge: 'Puente de Transición: fundaciones → SRE / Infra Engineer (cloud y automatización)',
};

/** Nota de criterio de dominio (misma filosofía que los otros roadmaps). */
export const ROADMAP_SA_MASTERY_NOTE =
  'Para considerar una competencia dominada, debes poder ejecutarla ante un incidente real (o simulado), ' +
  'explicar el porqué técnico, decidir cuándo NO tocar producción (ventana/rollback) y documentarla ' +
  'en un ticket que otro ingeniero o un auditor pueda entender sin preguntarte nada.';

export const ROADMAP_SA_TIERS: RoadmapTierDef[] = [
  {
    id: 'rmsa-t1',
    title: 'TIER 1 — FOUNDATION SYSADMIN',
    subtitle: 'STUB — reemplazado por el agente de contenido.',
    phases: [
      {
        id: 'rmsa-f1',
        number: 1,
        title: 'STUB',
        note: 'STUB',
        items: [
          {
            id: 'rmsa-f1-1',
            label: 'STUB',
            text: 'STUB — reemplazado por el agente de contenido.',
          },
        ],
      },
    ],
  },
];

export const ROADMAP_SA_ALL_ITEM_IDS: string[] = ROADMAP_SA_TIERS.flatMap((t) =>
  t.phases.flatMap((p) => p.items.map((i) => i.id))
);
