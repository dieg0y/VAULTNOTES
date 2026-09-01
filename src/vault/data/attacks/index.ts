// attacks/index.ts — punto de entrada del dataset de ATAQUES.
//
// Las entradas viven en archivos por categoría (iam.ts, red.ts, dos.ts,
// web.ts, misc.ts) para mantener cada archivo manejable; este index los
// concatena y expone la API pública que consume AttacksExplorerTool.tsx
// (mismo contrato que ../vulnerabilities.ts).
//
// 89 entradas · 6 categorías · 0 duplicados con Vulnerabilidades:
// IAM/Identidad 12 (lo que no vive en Vulnerabilidades: MS14-068, bronze
// bit, SAM/NTDS at-rest, recon, keylogging, device code, PRT, registro de
// dispositivos, SCCM, Intune, Recycle Bin, CSV injection), Red 25, DoS 16,
// Web 19, Social 9, Malware/C2/Exfil 8.
//
// 100% offline. No usar `export default`.

import type { AttackInfo, AttackCategory, AttackSeverity } from './types';
import { IAM_ATTACKS } from './iam';
import { RED_ATTACKS } from './red';
import { DOS_ATTACKS } from './dos';
import { WEB_ATTACKS } from './web';
import { SE_ATTACKS, MAL_ATTACKS } from './misc';

export type { AttackCategory, AttackSeverity, AttackInfo } from './types';

export const ATTACKS: AttackInfo[] = [
  ...IAM_ATTACKS,
  ...RED_ATTACKS,
  ...DOS_ATTACKS,
  ...WEB_ATTACKS,
  ...SE_ATTACKS,
  ...MAL_ATTACKS,
];

export const ATTACK_CATEGORY_LABELS: Record<AttackCategory, string> = {
  IAM: 'IAM / Identidad',
  Red: 'Red / Sniffing',
  DoS: 'DoS / DDoS',
  Web: 'Web / Aplicación',
  Social: 'Ingeniería Social',
  Malware: 'Malware / C2 / Exfil',
};

/** Orden de severidad para chips y ordenación. */
export const ATTACK_SEVERITY_ORDER: Record<AttackSeverity, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

/** Lista de severidades (para filtros). */
export const ATTACK_SEVERITIES: AttackSeverity[] = ['Critical', 'High', 'Medium', 'Low'];

/** Lista de categorías (para filtros) — IAM primero (foco del usuario). */
export const ATTACK_CATEGORIES: AttackCategory[] = [
  'IAM', 'Red', 'DoS', 'Web', 'Social', 'Malware',
];

/** Busca un ataque por su id (p. ej. "IAM-004") — usado por deep-links. */
export function findAttackById(id: string): AttackInfo | undefined {
  return ATTACKS.find((a) => a.id === id);
}
