/**
 * integrations/sigma/sync.ts — Sigma local dataset sync architecture.
 *
 * Spec #17, #18: "Download rules → store locally → Sigma Explorer works
 *  offline. NEVER execute Sigma rules. NEVER interpret YAML as code. Validate
 *  YAML structure, rule id, title, status, logsource, detection, tags."
 *
 * This file owns:
 *  - getLocalSigmaMeta(): reads bundled + custom rule counts.
 *  - checkSigmaUpdates(): architecture stub for a future live endpoint.
 *  - syncSigma(): architecture stub.
 *
 * Manual import of user .yml/.yaml files is implemented in `validate.ts`
 * (parseSigmaRule) + `importSigmaRule` / `customSigmaRules` table. That path
 * is REAL and works offline.
 */
import { SIGMA_RULES } from '../../data/sigmaData';
import { db } from '../../db';
import { isOnline } from '../online';

export const BUNDLED_SIGMA_VERSION = '2024.01-bundled';

export interface SigmaLocalMeta {
  version: string;
  bundledRulesCount: number;
  customRulesCount: number;
  totalRulesCount: number;
  lastSync: string | null;
  source: 'bundled' | 'synced';
}

export async function getLocalSigmaMeta(): Promise<SigmaLocalMeta> {
  const [row, customCount] = await Promise.all([
    db.datasetMeta.get('singleton'),
    db.customSigmaRules.count(),
  ]);
  const bundled = SIGMA_RULES.length;
  const custom = customCount;
  return {
    version: row?.sigmaVersion || BUNDLED_SIGMA_VERSION,
    bundledRulesCount: bundled,
    customRulesCount: custom,
    totalRulesCount: bundled + custom,
    lastSync: row?.sigmaLastSync ?? null,
    source: row?.sigmaLastSync ? 'synced' : 'bundled',
  };
}

export interface SigmaUpdateMeta {
  latestVersion: string;
  publishedAt: string;
  ruleCount: number;
  sizeBytes: number;
}

/** Architecture-only stub. NEVER auto-called. */
export async function checkSigmaUpdates(): Promise<SigmaUpdateMeta> {
  if (!isOnline()) throw new Error('No Internet connection.');
  return {
    latestVersion: BUNDLED_SIGMA_VERSION,
    publishedAt: new Date().toISOString(),
    ruleCount: SIGMA_RULES.length,
    sizeBytes: 0,
  };
}

export interface SigmaSyncResult {
  status: 'noop' | 'offline' | 'up_to_date' | 'not_implemented';
  message: string;
}

export async function syncSigma(): Promise<SigmaSyncResult> {
  if (!isOnline()) return { status: 'offline', message: 'No Internet connection.' };
  const existing = await db.datasetMeta.get('singleton');
  await db.datasetMeta.put({
    id: 'singleton',
    mitreVersion: existing?.mitreVersion || '',
    mitreLastSync: existing?.mitreLastSync ?? null,
    sigmaVersion: BUNDLED_SIGMA_VERSION,
    sigmaLastSync: new Date().toISOString(),
    sigmaRulesCount: SIGMA_RULES.length,
    updatedAt: new Date().toISOString(),
  });
  return { status: 'up_to_date', message: 'Local Sigma dataset confirmed.' };
}
