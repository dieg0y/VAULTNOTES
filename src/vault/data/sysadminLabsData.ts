/**
 * sysadminLabsData — LAB TEMPLATES de la especialización SysAdmin.
 *
 * Labs guiados que se siembran como plantillas en la tabla `labs` EXISTENTE
 * (misma arquitectura que los labs HelpDesk). Seeding aditivo por id +
 * dismissal. Los labs son SIMULADOS: los comandos son material de estudio.
 */
import type { Lab } from '../types';

/** Campos que el seeder completa (estado de trabajo del usuario). */
export type SysAdminLabSeed = Omit<
  Lab,
  'status' | 'isFavorite' | 'isDeleted' | 'deletedAt' | 'createdAt' | 'updatedAt'
>;

export const SYSADMIN_LAB_SEEDS: SysAdminLabSeed[] = [
  {
    id: 'labsa-stub',
    title: 'STUB — reemplazado por el agente de contenido',
    organization: 'Nexora S.A. (simulado)',
    topic: 'SysAdmin - Linux / Unix',
    categories: ['SysAdmin - Linux / Unix'],
    subtopic: 'STUB',
    difficulty: 'Media',
    timeSpent: '',
    sourceLink: '',
    parts: [
      {
        id: 'labsa-stub-p1',
        title: 'STUB',
        content: 'STUB',
        isCompleted: false,
      },
    ],
    tools: [],
    commands: [],
    findings: '',
    mitigation: '',
  },
];
