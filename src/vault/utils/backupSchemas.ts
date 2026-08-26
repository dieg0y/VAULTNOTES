/**
 * Zod schemas for VaultNotes backup/restore validation (AUDIT VN-006).
 *
 * The backup ZIP contains JSON files for many tables (notes, labs, glossary,
 * references, images/videos/PDFs metadata, platforms/categories/tools,
 * toolFavorites, toolRecents, inboxItems, reviewItems, rbacModels,
 * flashcardStats, tiCache, onlineActivity, customSigmaRules, savedCves,
 * datasetMeta, manifest). Before this audit, the importer did a raw
 * `JSON.parse(...)` and inserted the result (typed as `any[]`) directly into
 * Dexie. A malformed backup (or a hand-crafted malicious one) could push
 * rows with the wrong shape into the local vault, leaving it in an
 * inconsistent state.
 *
 * Now every imported row is validated with the schemas below. Rows that
 * fail validation are skipped and counted in `summary.invalidXxx`; the
 * user can see the count in the ImportReportModal.
 *
 * Design choices:
 *  - `id` is REQUIRED (string, non-empty) on every entity — it is the
 *    primary identity per spec VN-002. A row without an `id` is rejected.
 *  - Other fields are mostly OPTIONAL (with the importer applying sensible
 *    defaults when missing — same as before). This keeps backward
 *    compatibility with older backups that may not have all fields.
 *  - `.passthrough()` is used so unknown fields from newer-format backups
 *    are not dropped (forward compatibility). The importer ignores them.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Core entity schemas
// ---------------------------------------------------------------------------

export const noteSchema = z.object({
  id: z.string().min(1),
  parentId: z.union([z.string(), z.null()]).optional(),
  title: z.string().optional(),
  platform: z.string().optional(),
  category: z.string().optional(),
  categories: z.array(z.string()).optional(),
  contentHtml: z.string().optional(),
  sourceUrl: z.string().optional(),
  isFavorite: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  deletedAt: z.union([z.string(), z.null()]).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

const labPartSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  content: z.string().optional(),
  isCompleted: z.boolean().optional(),
}).passthrough();

export const labSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  organization: z.string().optional(),
  topic: z.string().optional(),
  subtopic: z.string().optional(),
  categories: z.array(z.string()).optional(),
  difficulty: z.string().optional(),
  status: z.string().optional(),
  timeSpent: z.string().optional(),
  sourceLink: z.string().optional(),
  parts: z.array(labPartSchema).optional(),
  tools: z.array(z.string()).optional(),
  commands: z.array(z.string()).optional(),
  findings: z.string().optional(),
  mitigation: z.string().optional(),
  isFavorite: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  deletedAt: z.union([z.string(), z.null()]).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

const glossaryExampleSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  content: z.string().optional(),
}).passthrough();

export const glossarySchema = z.object({
  id: z.string().min(1),
  term: z.string().optional(),
  acronym: z.string().optional(),
  category: z.string().optional(),
  categories: z.array(z.string()).optional(),
  shortDefinition: z.string().optional(),
  longDefinition: z.string().optional(),
  example: z.string().optional(),
  examples: z.array(glossaryExampleSchema).optional(),
  sourceUrl: z.string().optional(),
  platform: z.string().optional(),
  diagramImage: z.string().optional(),
  isDeleted: z.boolean().optional(),
  deletedAt: z.union([z.string(), z.null()]).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

export const referenceSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  url: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  type: z.string().optional(),
  isFavorite: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

// ---------------------------------------------------------------------------
// Blob metadata schemas (images / videos / PDFs)
// ---------------------------------------------------------------------------

export const imageMetaSchema = z.object({
  id: z.string().min(1),
  noteId: z.union([z.string(), z.null()]).optional(),
  labId: z.union([z.string(), z.null()]).optional(),
  name: z.string().optional(),
  mimeType: z.string().optional(),
  caption: z.union([z.string(), z.null()]).optional(),
  createdAt: z.string().optional(),
}).passthrough();

export const videoMetaSchema = z.object({
  id: z.string().min(1),
  noteId: z.union([z.string(), z.null()]).optional(),
  labId: z.union([z.string(), z.null()]).optional(),
  name: z.string().optional(),
  mimeType: z.string().optional(),
  caption: z.union([z.string(), z.null()]).optional(),
  storedIn: z.union([z.literal('fs'), z.literal('idb')]).optional(),
  createdAt: z.string().optional(),
}).passthrough();

export const pdfMetaSchema = z.object({
  id: z.string().min(1),
  noteId: z.union([z.string(), z.null()]).optional(),
  labId: z.union([z.string(), z.null()]).optional(),
  name: z.string().optional(),
  mimeType: z.string().optional(),
  caption: z.union([z.string(), z.null()]).optional(),
  createdAt: z.string().optional(),
}).passthrough();

// ---------------------------------------------------------------------------
// Master tables (platforms / categories / tools — same shape)
// ---------------------------------------------------------------------------

export const masterEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  createdAt: z.string().optional(),
}).passthrough();

// ---------------------------------------------------------------------------
// Navigation / queue tables
// ---------------------------------------------------------------------------

export const toolFavoriteSchema = z.object({
  toolId: z.string().min(1),
  addedAt: z.string().optional(),
}).passthrough();

export const toolRecentSchema = z.object({
  toolId: z.string().min(1),
  lastUsedAt: z.string().optional(),
}).passthrough();

export const inboxItemSchema = z.object({
  id: z.string().min(1),
  content: z.string().optional(),
  createdAt: z.string().optional(),
  convertedTo: z.union([z.string(), z.null()]).optional(),
  convertedAt: z.union([z.string(), z.null()]).optional(),
  isTask: z.boolean().optional(),
}).passthrough();

export const reviewItemSchema = z.object({
  id: z.string().min(1),
  itemType: z.string().optional(),
  itemId: z.union([z.string(), z.null()]).optional(),
  addedAt: z.string().optional(),
  status: z.string().optional(),
  nextReviewAt: z.string().optional(),
}).passthrough();

export const rbacModelSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  description: z.union([z.string(), z.null()]).optional(),
  model: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

export const flashcardStatSchema = z.object({
  id: z.string().min(1),
  termId: z.string().min(1),
  knownCount: z.number().optional(),
  unknownCount: z.number().optional(),
  lastStudiedAt: z.string().optional(),
  stability: z.number().optional(),
  difficulty: z.number().optional(),
  due: z.string().optional(),
  reps: z.number().optional(),
  lapses: z.number().optional(),
}).passthrough();

// ---------------------------------------------------------------------------
// BLOQUE 6 — Online-Optional integration tables
// ---------------------------------------------------------------------------

export const tiCacheSchema = z.object({
  id: z.string().min(1),
  provider: z.string().optional(),
  iocType: z.string().optional(),
  iocValue: z.string().optional(),
  resultJson: z.union([z.string(), z.null()]).optional(),
  errorMessage: z.union([z.string(), z.null()]).optional(),
  retrievedAt: z.string().optional(),
  expiresAt: z.string().optional(),
}).passthrough();

export const onlineActivitySchema = z.object({
  id: z.string().min(1),
  provider: z.string().optional(),
  iocType: z.string().optional(),
  timestamp: z.string().optional(),
  status: z.string().optional(),
  note: z.union([z.string(), z.null()]).optional(),
}).passthrough();

export const customSigmaRuleSchema = z.object({
  id: z.string().min(1),
  ruleUuid: z.union([z.string(), z.null()]).optional(),
  title: z.string().optional(),
  status: z.string().optional(),
  level: z.string().optional(),
  description: z.string().optional(),
  author: z.string().optional(),
  date: z.string().optional(),
  logsource: z.string().optional(),
  detection: z.string().optional(),
  tags: z.array(z.string()).optional(),
  mitre: z.array(z.string()).optional(),
  yaml: z.string().optional(),
  importedAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

export const savedCveSchema = z.object({
  id: z.string().min(1),
  description: z.string().optional(),
  cvss: z.union([z.number(), z.null()]).optional(),
  severity: z.union([z.string(), z.null()]).optional(),
  cwe: z.array(z.string()).optional(),
  affectedProducts: z.array(z.string()).optional(),
  published: z.string().optional(),
  modified: z.string().optional(),
  references: z.array(z.any()).optional(),
  personalNotes: z.union([z.string(), z.null()]).optional(),
  tags: z.array(z.string()).optional(),
  personalAssessment: z.union([z.string(), z.null()]).optional(),
  savedAt: z.string().optional(),
}).passthrough();

export const datasetMetaSchema = z.object({
  id: z.string().min(1),
  mitreVersion: z.string().optional(),
  mitreLastSync: z.union([z.string(), z.null()]).optional(),
  sigmaVersion: z.string().optional(),
  sigmaLastSync: z.union([z.string(), z.null()]).optional(),
  sigmaRulesCount: z.number().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

export const manifestSchema = z.object({
  appName: z.string().optional(),
  version: z.string().optional(),
  formatVersion: z.string().optional(),
  schemaVersion: z.number().optional(),
  exportedAt: z.string().optional(),
  stats: z.record(z.string(), z.number()).optional(),
}).passthrough();

// ---------------------------------------------------------------------------
// Generic array validator — returns valid items + count of invalid ones.
// ---------------------------------------------------------------------------

export function validateArray<T>(
  schema: z.ZodType<T>,
  items: unknown,
): { valid: T[]; invalid: number } {
  if (!Array.isArray(items)) return { valid: [], invalid: 0 };
  const valid: T[] = [];
  let invalid = 0;
  for (const item of items) {
    const res = schema.safeParse(item);
    if (res.success) {
      valid.push(res.data);
    } else {
      invalid++;
    }
  }
  return { valid, invalid };
}
