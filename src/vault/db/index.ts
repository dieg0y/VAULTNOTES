import Dexie, { type Table } from 'dexie';
import { Note, GlossaryTerm, StoredImage, StoredPdf, Lab, PlatformItem, CategoryItem, ToolItem, FlashcardStat, StoredFileHandle, ReferenceItem } from '../types';

/**
 * BLOQUE 6 — Online-Optional integration tables. These live in the MAIN
 * VaultLocalDB (so they ARE exported by the vault backup — they hold no API
 * keys, only cached intelligence results + activity metadata + custom Sigma
 * rules + saved CVEs). API keys live in a SEPARATE Dexie DB (VaultIntelDB,
 * see integrations/threatIntel/credentials.ts) and are NEVER exported.
 */
export interface TiCacheEntry {
  /** `${provider}:${iocType}:${valueLowercased}` — unique cache key. */
  id: string;
  provider: string;
  iocType: string;
  iocValue: string;
  resultJson: string | null;
  errorMessage: string | null;
  retrievedAt: string;
  expiresAt: string;
}

export interface OnlineActivityRow {
  id: string;
  provider: string;
  /** IOC TYPE only — never the actual value (privacy). */
  iocType: string;
  timestamp: string;
  status: 'success' | 'error' | 'cached' | 'not_configured' | 'offline';
  note?: string;
}

export interface CustomSigmaRule {
  /** UUID-style id, generated on import. */
  id: string;
  /** UUID from the yaml rule itself (if present), for dedup on re-import. */
  ruleUuid?: string;
  title: string;
  status: string;
  level: string;
  description: string;
  author: string;
  date: string;
  logsource: string;
  detection: string;
  tags: string[];
  mitre: string[];
  /** Raw yaml text — stored verbatim, NEVER executed (see sigma/validate.ts). */
  yaml: string;
  importedAt: string;
  updatedAt: string;
}

export interface SavedCve {
  /** The CVE id, e.g. "CVE-2025-12345". Acts as primary key. */
  id: string;
  description: string;
  cvss: number | null;
  severity: string | null;
  cwe: string[];
  affectedProducts: string[];
  published: string;
  modified: string;
  references: string[];
  /** User's personal notes — added after saving. */
  personalNotes?: string;
  /** User's tags. */
  tags: string[];
  /** User's personal assessment. */
  personalAssessment?: string;
  savedAt: string;
}

export interface DatasetMeta {
  /** Single-row table — id is always 'singleton'. */
  id: string;
  mitreVersion: string;
  mitreLastSync: string | null;
  sigmaVersion: string;
  sigmaLastSync: string | null;
  sigmaRulesCount: number;
  updatedAt: string;
}

/**
 * DATA & INTEL — dataset de trabajo (IoCs · Eventos · Reglas).
 *
 * Un único store para los tres tipos (`kind`), alimentado por las tools
 * (IoC Extractor, Sigma Explorer, Detection Query Helper, …), por alta
 * manual en DataIntelView y por import (.json). Todo el texto se guarda
 * PLANO (se renderiza como texto, jamás con dangerouslySetInnerHTML) — la
 * sanitización XSS es by-construction. Nunca se guardan API keys ni
 * resultados de enriquecimiento online (eso vive en tiCache).
 */
export type IntelKind = 'ioc' | 'event' | 'rule';

export interface IntelItem {
  /** `intel-<ms>-<rand>` (sufijo de entropía — VN-A-001). */
  id: string;
  /** Discriminador: indicador (ioc) · evento de seguridad (event) · regla/query (rule). */
  kind: IntelKind;
  /** IoC: el valor del indicador (IP, dominio, hash, URL…). Event/Rule: título corto. */
  title: string;
  /** Solo IoC: tipo del indicador (ipv4/ipv6/domain/url/email/hash/cve/…). */
  iocType?: string;
  /** Severidad (event/rule) o confianza del extractor (ioc): low/medium/high/critical o alta/media/baja/info. */
  severity?: string;
  /** Confianza IoC (score del extractor): alta/media/baja/info. */
  confidence?: string;
  description?: string;
  tags: string[];
  /** De dónde viene: nombre de la tool, 'manual' o 'import'. */
  source?: string;
  /** Técnicas MITRE asociadas (T1059, …). */
  mitre?: string[];
  /** Solo rule/event: cuerpo (YAML Sigma, query KQL/SPL, detalle del evento). */
  content?: string;
  /** Solo rule: lenguaje del cuerpo — kql | spl | sigma | other. */
  contentLang?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * RBAC Model — persistencia de escenarios RBAC creados manualmente en la herramienta
 * RBAC Analyzer. Cada fila es un "escenario" completo (users + roles + permissions +
 * assignments) serializado como JSON en el campo `model`. La tabla vive en la misma
 * Dexie DB — NO creamos otra base de datos.
 */
export interface RbacModel {
  /** UUID string. */
  id: string;
  /** Nombre del escenario — e.g. "Prod SOC - Tier 1/2". */
  name: string;
  /** Descripción opcional del contexto. */
  description?: string;
  /** JSON-serialized RbacModelData (users, roles, permissions, assignments). */
  model: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tool Favorite — marca una herramienta como favorita. Solo guarda el ToolId
 * (string) y un timestamp. NO almacena inputs del usuario, contenido, ni
 * resultados de análisis — exclusivamente metadatos de navegación.
 */
export interface ToolFavorite {
  /** ToolId (string) — actúa como clave primaria. */
  toolId: string;
  addedAt: string;
}

/**
 * Tool Recent — registro ligero de uso de herramientas. Solo guarda:
 * - el ToolId
 * - la fecha/hora local del último uso
 * NO almacena automáticamente JWTs, IOCs, logs, passwords, tokens, comandos
 * ni ningún contenido introducido por el usuario. Exclusivamente metadatos.
 */
export interface ToolRecent {
  /** ToolId (string) — actúa como clave primaria. */
  toolId: string;
  lastUsedAt: string;
}

/**
 * Inbox Item — captura rápida de ideas sin organizar. El usuario escribe
 * libremente (Ctrl+Shift+Q) y la entrada aterriza aquí. Después puede
 * convertirla en Note / Glossary / Reference / Task (marca) o borrarla.
 * No se asocia a tags/categoría/plantilla en el momento de la captura.
 */
export interface InboxItem {
  /** UUID string. */
  id: string;
  /** Texto plano escrito por el usuario. */
  content: string;
  createdAt: string;
  /** Si el item fue convertido, se anota a qué tipo (para auditoría). */
  convertedTo?: 'note' | 'glossary' | 'reference' | 'task' | null;
  convertedAt?: string | null;
  /** Marcar como tarea (no elimina el item, solo lo etiqueta). */
  isTask?: boolean;
}

/**
 * Review Queue Item — un note/lab/glossary marcado para revisar después.
 * Sistema simple (sin spaced repetition complejo por ahora):
 * - status 'pending' = en cola
 * - status 'reviewed' = completado (oculto de la cola activa)
 * - nextReviewAt = fecha sugerida (por defecto +2 días)
 */
export type ReviewItemType = 'note' | 'glossary' | 'lab';
export type ReviewStatus = 'pending' | 'reviewed';

export interface ReviewItem {
  /** UUID string. */
  id: string;
  /** Tipo de contenido enlazado. */
  itemType: ReviewItemType;
  /** ID del note/lab/glossaryterm original (en sus tablas respectivas). */
  itemId: string;
  addedAt: string;
  status: ReviewStatus;
  nextReviewAt: string;
}

export class VaultDatabase extends Dexie {
  notes!: Table<Note, string>;
  glossary!: Table<GlossaryTerm, string>;
  images!: Table<StoredImage, string>;
  labs!: Table<Lab, string>;
  platforms!: Table<PlatformItem, string>;
  categories!: Table<CategoryItem, string>;
  tools!: Table<ToolItem, string>;
  flashcardStats!: Table<FlashcardStat, string>;
  fileHandles!: Table<StoredFileHandle, string>;
  pdfs!: Table<StoredPdf, string>;
  references!: Table<ReferenceItem, string>;
  rbacModels!: Table<RbacModel, string>;
  toolFavorites!: Table<ToolFavorite, string>;
  toolRecents!: Table<ToolRecent, string>;
  inboxItems!: Table<InboxItem, string>;
  reviewItems!: Table<ReviewItem, string>;
  // BLOQUE 6 — Online-Optional integration tables. See interface defs above.
  tiCache!: Table<TiCacheEntry, string>;
  onlineActivity!: Table<OnlineActivityRow, string>;
  customSigmaRules!: Table<CustomSigmaRule, string>;
  savedCves!: Table<SavedCve, string>;
  datasetMeta!: Table<DatasetMeta, string>;
  // DATA & INTEL — dataset de trabajo (IoCs · eventos · reglas). v16.
  intelItems!: Table<IntelItem, string>;

  constructor() {
    super('VaultLocalDB');
    // v1-v4 kept for migration continuity (folders/status dropped going forward)
    this.version(1).stores({
      notes: 'id, slug, platform, category, status, isFavorite, isDeleted, updatedAt, createdAt',
      glossary: 'id, term, platform, isDeleted, updatedAt, createdAt',
      images: 'id, noteId, name, createdAt'
    });
    this.version(2).stores({
      notes: 'id, slug, platform, category, status, isFavorite, isDeleted, updatedAt, createdAt',
      glossary: 'id, term, platform, isDeleted, updatedAt, createdAt',
      images: 'id, noteId, name, createdAt',
      labs: 'id, organization, topic, difficulty, status, isFavorite, isDeleted, updatedAt, createdAt'
    });
    this.version(3).stores({
      notes: 'id, slug, platform, category, status, isFavorite, isDeleted, updatedAt, createdAt',
      glossary: 'id, term, platform, isDeleted, updatedAt, createdAt',
      images: 'id, noteId, name, createdAt',
      labs: 'id, organization, topic, difficulty, status, isFavorite, isDeleted, updatedAt, createdAt',
      platforms: 'id, name, createdAt',
      categories: 'id, name, parentId, path, createdAt',
      tools: 'id, name, createdAt'
    });
    this.version(4).stores({
      notes: 'id, slug, platform, category, folderPath, status, isFavorite, isDeleted, updatedAt, createdAt',
      glossary: 'id, term, platform, isDeleted, updatedAt, createdAt',
      images: 'id, noteId, name, createdAt',
      labs: 'id, organization, topic, difficulty, status, isFavorite, isDeleted, updatedAt, createdAt',
      platforms: 'id, name, createdAt',
      categories: 'id, name, parentId, path, createdAt',
      tools: 'id, name, createdAt',
      folders: 'id, name, path, parentId, createdAt'
    });

    // v5: folders + note.status + note.folderPath + note.subcategory removed.
    // Notes gain parentId to support infinite nested "subapuntes" under a Platform.
    this.version(5)
      .stores({
        notes: 'id, parentId, platform, category, isFavorite, isDeleted, updatedAt, createdAt',
        glossary: 'id, term, platform, isDeleted, updatedAt, createdAt',
        images: 'id, noteId, name, createdAt',
        labs: 'id, organization, topic, difficulty, status, isFavorite, isDeleted, updatedAt, createdAt',
        platforms: 'id, name, createdAt',
        categories: 'id, name, createdAt',
        tools: 'id, name, createdAt',
        folders: null // drop table entirely
      })
      .upgrade(async (tx) => {
        // Migrate existing notes: drop status/folderPath/subcategory, add parentId: null
        // (Rows are pre-v5 legacy shape — typed as Record<string, unknown>.)
        await tx.table('notes').toCollection().modify((n: Record<string, unknown>) => {
          n.parentId = null;
          delete n.status;
          delete n.folderPath;
          delete n.subcategory;
          delete n.slug;
        });
      });

    // v6: smart flashcards — per-term study stats (spaced-repetition-lite).
    this.version(6).stores({
      notes: 'id, parentId, platform, category, isFavorite, isDeleted, updatedAt, createdAt',
      glossary: 'id, term, platform, isDeleted, updatedAt, createdAt',
      images: 'id, noteId, name, createdAt',
      labs: 'id, organization, topic, difficulty, status, isFavorite, isDeleted, updatedAt, createdAt',
      platforms: 'id, name, createdAt',
      categories: 'id, name, createdAt',
      tools: 'id, name, createdAt',
      flashcardStats: 'id, termId, lastStudiedAt'
    });

    // v7: "Save" backups — persists the backup file handle so every export
    // overwrites the same file the user picked (File System Access API).
    this.version(7).stores({
      notes: 'id, parentId, platform, category, isFavorite, isDeleted, updatedAt, createdAt',
      glossary: 'id, term, platform, isDeleted, updatedAt, createdAt',
      images: 'id, noteId, name, createdAt',
      labs: 'id, organization, topic, difficulty, status, isFavorite, isDeleted, updatedAt, createdAt',
      platforms: 'id, name, createdAt',
      categories: 'id, name, createdAt',
      tools: 'id, name, createdAt',
      flashcardStats: 'id, termId, lastStudiedAt',
      fileHandles: 'id'
    });

    // v9: References/Resources section + FSRS flashcard fields.
    // NOTE (audit VN-AUD-I4): there is NO v8 on purpose — a schema draft was
    // rolled back before ever shipping, and Dexie only requires declared
    // versions to be STRICTLY INCREASING, so v7→v9 upgrades directly.
    this.version(9).stores({
      notes: 'id, parentId, platform, category, isFavorite, isDeleted, updatedAt, createdAt',
      glossary: 'id, term, platform, isDeleted, updatedAt, createdAt',
      images: 'id, noteId, name, createdAt',
      labs: 'id, organization, topic, difficulty, status, isFavorite, isDeleted, updatedAt, createdAt',
      platforms: 'id, name, createdAt',
      categories: 'id, name, createdAt',
      tools: 'id, name, createdAt',
      flashcardStats: 'id, termId, due, lastStudiedAt',
      fileHandles: 'id',
      videos: 'id, noteId, labId, name, createdAt',
      references: 'id, type, isFavorite, isDeleted, createdAt'
    }).upgrade(async (tx) => {
      // Add FSRS fields to existing flashcardStats rows
      // (Legacy rows may miss the new fields — typed as Record<string, unknown>.)
      await tx.table('flashcardStats').toCollection().modify((s: Record<string, unknown>) => {
        if (s.stability === undefined) s.stability = 0;
        if (s.difficulty === undefined) s.difficulty = 5;
        if (s.due === undefined) s.due = new Date().toISOString();
        if (s.reps === undefined) s.reps = Number(s.knownCount || 0) + Number(s.unknownCount || 0);
        if (s.lapses === undefined) s.lapses = Number(s.unknownCount || 0);
      });
    });

    // v10: PDF attachments — notes/labs can embed full PDFs (rendered natively
    // by the browser via <embed> + blob URL, 100% offline, no external libs).
    this.version(10).stores({
      notes: 'id, parentId, platform, category, isFavorite, isDeleted, updatedAt, createdAt',
      glossary: 'id, term, platform, isDeleted, updatedAt, createdAt',
      images: 'id, noteId, name, createdAt',
      labs: 'id, organization, topic, difficulty, status, isFavorite, isDeleted, updatedAt, createdAt',
      platforms: 'id, name, createdAt',
      categories: 'id, name, createdAt',
      tools: 'id, name, createdAt',
      flashcardStats: 'id, termId, due, lastStudiedAt',
      fileHandles: 'id',
      videos: 'id, noteId, labId, name, createdAt',
      pdfs: 'id, noteId, labId, name, createdAt',
      references: 'id, type, isFavorite, isDeleted, createdAt'
    });

    // v11: RBAC Analyzer — persistencia de escenarios RBAC manuales.
    // La tabla `rbacModels` guarda el escenario completo (users/roles/permissions/
    // assignments) serializado como JSON en el campo `model`. NO creamos otra DB —
    // simplemente añadimos una tabla nueva a la Dexie existente.
    this.version(11).stores({
      notes: 'id, parentId, platform, category, isFavorite, isDeleted, updatedAt, createdAt',
      glossary: 'id, term, platform, isDeleted, updatedAt, createdAt',
      images: 'id, noteId, name, createdAt',
      labs: 'id, organization, topic, difficulty, status, isFavorite, isDeleted, updatedAt, createdAt',
      platforms: 'id, name, createdAt',
      categories: 'id, name, createdAt',
      tools: 'id, name, createdAt',
      flashcardStats: 'id, termId, due, lastStudiedAt',
      fileHandles: 'id',
      videos: 'id, noteId, labId, name, createdAt',
      pdfs: 'id, noteId, labId, name, createdAt',
      references: 'id, type, isFavorite, isDeleted, createdAt',
      rbacModels: 'id, name, createdAt, updatedAt'
    });

    // v12: BLOQUE 5 — Integración y pulido. Añade 4 tablas nuevas:
    //  - `toolFavorites`   : marca de favorito por ToolId (solo metadatos)
    //  - `toolRecents`     : historial ligero de uso (ToolId + lastUsedAt)
    //  - `inboxItems`       : capturas rápidas sin organizar (Ctrl+Shift+Q)
    //  - `reviewItems`     : cola de "Review Later" para notes/labs/glossary
    // TODAS guardan exclusivamente metadatos de navegación o texto escrito
    // directamente por el usuario en el Inbox. NUNCA guardan automáticamente
    // JWTs, IOCs, logs, passwords, tokens ni resultados de análisis.
    this.version(12).stores({
      notes: 'id, parentId, platform, category, isFavorite, isDeleted, updatedAt, createdAt',
      glossary: 'id, term, platform, isDeleted, updatedAt, createdAt',
      images: 'id, noteId, name, createdAt',
      labs: 'id, organization, topic, difficulty, status, isFavorite, isDeleted, updatedAt, createdAt',
      platforms: 'id, name, createdAt',
      categories: 'id, name, createdAt',
      tools: 'id, name, createdAt',
      flashcardStats: 'id, termId, due, lastStudiedAt',
      fileHandles: 'id',
      videos: 'id, noteId, labId, name, createdAt',
      pdfs: 'id, noteId, labId, name, createdAt',
      references: 'id, type, isFavorite, isDeleted, createdAt',
      rbacModels: 'id, name, createdAt, updatedAt',
      toolFavorites: 'toolId, addedAt',
      toolRecents: 'toolId, lastUsedAt',
      inboxItems: 'id, createdAt, isTask',
      reviewItems: 'id, itemType, itemId, status, nextReviewAt'
    });

    // v13: BLOQUE 6 — Online-Optional. Adds 5 tables for the new integration
    // layer. All hold only cached intelligence / metadata / user-authored
    // content. API KEYS are NOT here — they live in VaultIntelDB (separate).
    // `datasetMeta` is a single-row table (id='singleton') tracking the
    // locally-installed MITRE/Sigma dataset versions + last-sync timestamps.
    this.version(13).stores({
      notes: 'id, parentId, platform, category, isFavorite, isDeleted, updatedAt, createdAt',
      glossary: 'id, term, platform, isDeleted, updatedAt, createdAt',
      images: 'id, noteId, name, createdAt',
      labs: 'id, organization, topic, difficulty, status, isFavorite, isDeleted, updatedAt, createdAt',
      platforms: 'id, name, createdAt',
      categories: 'id, name, createdAt',
      tools: 'id, name, createdAt',
      flashcardStats: 'id, termId, due, lastStudiedAt',
      fileHandles: 'id',
      videos: 'id, noteId, labId, name, createdAt',
      pdfs: 'id, noteId, labId, name, createdAt',
      references: 'id, type, isFavorite, isDeleted, createdAt',
      rbacModels: 'id, name, createdAt, updatedAt',
      toolFavorites: 'toolId, addedAt',
      toolRecents: 'toolId, lastUsedAt',
      inboxItems: 'id, createdAt, isTask',
      reviewItems: 'id, itemType, itemId, status, nextReviewAt',
      tiCache: 'id, provider, iocType, expiresAt',
      onlineActivity: 'id, provider, timestamp, status',
      customSigmaRules: 'id, ruleUuid, title, level, importedAt',
      savedCves: 'id, savedAt',
      datasetMeta: 'id'
    });

    // v14: Add `labId` index to the `images` table.
    // BUG FIX (Task 2-c — Data Integrity): StoredImage rows created from
    // the LabsView PartRichEditor set `labId: labId` (LabsView.tsx), but the
    // `images` table was missing the `labId` index. As a result,
    // `db.images.where('labId').equals(labId).delete()` in
    // `handlePermanentDeleteLab` and `handleEmptyTrash` (App.tsx) threw
    // `SchemaError: KeyPath labId not indexed` — silently leaving lab-owned
    // image blobs orphaned in IndexedDB forever and aborting the rest of the
    // permanent-delete cleanup (videos + PDFs were also skipped because the
    // function rejected mid-way). This is an ADDITIVE, non-destructive schema
    // change: Dexie transparently creates the new index on upgrade; existing
    // user data is untouched. `videos` and `pdfs` already had `labId` indexed
    // since v9/v10; only `images` was missing it.
    this.version(14).stores({
      notes: 'id, parentId, platform, category, isFavorite, isDeleted, updatedAt, createdAt',
      glossary: 'id, term, platform, isDeleted, updatedAt, createdAt',
      images: 'id, noteId, labId, name, createdAt',
      labs: 'id, organization, topic, difficulty, status, isFavorite, isDeleted, updatedAt, createdAt',
      platforms: 'id, name, createdAt',
      categories: 'id, name, createdAt',
      tools: 'id, name, createdAt',
      flashcardStats: 'id, termId, due, lastStudiedAt',
      fileHandles: 'id',
      videos: 'id, noteId, labId, name, createdAt',
      pdfs: 'id, noteId, labId, name, createdAt',
      references: 'id, type, isFavorite, isDeleted, createdAt',
      rbacModels: 'id, name, createdAt, updatedAt',
      toolFavorites: 'toolId, addedAt',
      toolRecents: 'toolId, lastUsedAt',
      inboxItems: 'id, createdAt, isTask',
      reviewItems: 'id, itemType, itemId, status, nextReviewAt',
      tiCache: 'id, provider, iocType, expiresAt',
      onlineActivity: 'id, provider, timestamp, status',
      customSigmaRules: 'id, ruleUuid, title, level, importedAt',
      savedCves: 'id, savedAt',
      datasetMeta: 'id'
    });

    // v15: REGLA DE ORO SOBRE VIDEOS — the `videos` table (blobs + metadata)
    // is REMOVED. Videos now live ONLY as raw files inside the user's
    // videos folder (File System Access API); notes reference them by
    // filename via data-vault-video, and they NEVER travel in backups.
    // The upgrade counts any rows that still held an IndexedDB blob (i.e.
    // never migrated to disk by the old Settings action) and warns — those
    // blobs are unrecoverable from here (no user gesture / no directory
    // access inside an upgrade transaction). Rows stored on disk
    // (storedIn:'fs', no blob) lose nothing: the files remain in the
    // folder and legacy data-vid embeds still resolve via
    // videoStorage.resolveLegacyVideoUrl().
    this.version(15)
      .stores({
        videos: null, // ← deletes the table + its data
      })
      .upgrade(async (tx) => {
        try {
          const legacy = await tx.table('videos').toArray();
          const idbBlobs = legacy.filter((v) => (v as { blob?: unknown }).blob);
          if (idbBlobs.length > 0) {
            // AUDIT FIX (VN-AUD-002): the discard was console.warn-only —
            // the user never sees the console. Write the count to
            // localStorage (survives the upgrade; NOT exported anywhere) so
            // App.tsx can surface a ONE-TIME alert on the next startup.
            try {
              if (typeof window !== 'undefined') {
                window.localStorage.setItem(
                  'vaultnotes-v15-discarded-videos',
                  String(idbBlobs.length)
                );
              }
            } catch {
              /* storage unavailable (private mode etc.) — console warn remains */
            }
            console.warn(
              `[VaultNotes v15] Tabla 'videos' eliminada (REGLA DE ORO). ` +
              `${idbBlobs.length} video(s) que SOLO existían en IndexedDB se han descartado ` +
              `(nunca se migraron a la carpeta del disco). Los archivos de la carpeta ` +
              `de videos no se tocan y los embeds existentes siguen funcionando.`
            );
          }
        } catch {
          /* table already gone or unreadable — nothing to report */
        }
      });

    // v16: DATA & INTEL — tabla `intelItems` para el dataset de trabajo
    // (IoCs extraídos por tools, eventos de seguridad y reglas/queries KQL/SPL/
    // Sigma). Alta aditiva y no destructiva: Dexie crea la tabla y sus índices
    // al hacer upgrade; ningún dato existente se toca. Los items se deduplican
    // por (kind + iocType + título normalizado) al insertar desde tools/store
    // (ver store/intelStore.ts) — el backup viaja como intelItems.json.
    this.version(16).stores({
      intelItems: 'id, kind, iocType, createdAt, updatedAt',
    });
  }
}

/** Current Dexie schema version. Used by the backup manifest so the importer
 *  can refuse cross-version restores (spec #35: "On restore: must show
 *  'Incompatible backup version' NOT partial import"). Bump this when
 *  bumping `this.version(N)` above. */
export const CURRENT_SCHEMA_VERSION = 16;

export const db = new VaultDatabase();

const DEFAULT_PLATFORMS_LIST: string[] = [
  'Microsoft - Entra ID / AD',
  'Microsoft - Sentinel / Defender',
  'AWS - IAM / Security',
  'GCP - IAM / Security',
  'Okta / Ping Identity',
  'Cisco',
  'Fortinet',
  'Palo Alto',
  'Splunk',
  'CrowdStrike / SentinelOne',
  'Wazuh / Elastic Security',
  'CyberArk / BeyondTrust (PAM)',
  'SailPoint / Saviynt (IGA)',
  'LetsDefend',
  'TryHackMe / HackTheBox'
];

// Single master list for "Categoría / Tema / Especialidad" — used by Notes, Labs, Glossary.
const MASTER_CATEGORIES_LIST: string[] = [
  'SOC Tier 1 - Triage',
  'SOC Tier 2 - Investigación',
  'Threat Hunting',
  'Threat Intel',
  'Incident Response',
  'SIEM / Log Management',
  'SOAR',
  'Network Security',
  'Endpoint / EDR',
  'Cloud Security',
  'IAM - IGA',
  'IAM - Access Management',
  'IAM - PAM',
  'IAM - Auth / MFA'
];

// Previous default list kept only so the migration can safely remove old
// defaults that are no longer part of the master list (if unused).
const LEGACY_DEFAULT_CATEGORIES: string[] = [
  'SOC Tier 1 - Triage',
  'SOC Tier 2 - Investigación',
  'SOC - Threat Hunting',
  'Threat Intelligence',
  'Incident Response',
  'SIEM / Log Management',
  'SOAR / Playbooks',
  'Network Security',
  'Endpoint / EDR',
  'Cloud Security',
  'IAM - IGA',
  'IAM - Access Management',
  'IAM - PAM',
  'IAM - Auth / MFA / Conditional Access',
  'Vulnerability Management',
  'Malware Analysis'
];

const INITIAL_TOOLS_LIST: string[] = [
  'Splunk',
  'Microsoft Sentinel',
  'QRadar',
  'Chronicle / ELK',
  'Wireshark / Zeek / Suricata',
  'CrowdStrike / Defender for Endpoint',
  'KQL / SPL / YARA / Sigma',
  'Velociraptor / Autopsy / Volatility',
  'Entra ID / Active Directory',
  'Okta / Ping Identity',
  'CyberArk / BeyondTrust / Delinea',
  'SailPoint / Saviynt',
  'AWS IAM / GCP IAM'
];

// Ids del contenido demo que venía sembrado en versiones anteriores.
// Se eliminan UNA SOLA VEZ para que instalaciones existentes queden limpias,
// sin tocar nada que el usuario haya creado.
const DEMO_NOTE_IDS = [
  'note-zero-trust-cisco',
  'note-zero-trust-cisco-sub1',
  'note-entra-id-pim',
  'note-sentinel-hunting-kql',
];
const DEMO_LAB_IDS = ['lab-phishing-case-42'];
const DEMO_TERM_IDS = ['term-api-gateway', 'term-kerberos-tgt', 'term-zero-trust'];
const DEMO_CLEANUP_FLAG = 'vault-demo-content-removed';

// AUDIT VN-008 (StrictMode safety): React 19 StrictMode double-invokes
// effects on mount (setup → cleanup → setup). Without a guard, two
// concurrent `initializeDatabase()` calls would race on the count-then-bulkAdd
// seeding pattern (both see count=0, both call bulkAdd, second throws
// BulkError "Key already exists"). The module-level guard deduplicates
// concurrent calls — the second caller just awaits the first's promise.
let initPromise: Promise<void> | null = null;

export function initializeDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await doInitializeDatabase();
    })().catch((err) => {
      // If initialization failed, allow a retry on the next mount.
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

async function doInitializeDatabase() {
  // --- One-time removal of bundled demo content (fresh start) ---
  try {
    if (!localStorage.getItem(DEMO_CLEANUP_FLAG)) {
      await db.notes.bulkDelete(DEMO_NOTE_IDS);
      await db.labs.bulkDelete(DEMO_LAB_IDS);
      await db.glossary.bulkDelete(DEMO_TERM_IDS);
      await db.flashcardStats.bulkDelete(DEMO_TERM_IDS);
      localStorage.setItem(DEMO_CLEANUP_FLAG, '1');
    }
  } catch (err) {
    console.warn('Demo cleanup skipped:', err);
  }

  // --- Data migration: lab.commands was a plain string, now a string[] ---
  // Splits legacy multi-line strings into individual command entries.
  const allLabsForMigration = await db.labs.toArray();
  for (const lab of allLabsForMigration) {
    const raw = lab.commands as unknown;
    if (typeof raw === 'string') {
      const cmdList = raw
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      await db.labs.update(lab.id, { commands: cmdList });
    } else if (!Array.isArray(raw)) {
      await db.labs.update(lab.id, { commands: [] });
    }
  }

  // Seed / Sync Platforms
  const existingPlatforms = await db.platforms.toArray();
  const existingPlatformNames = new Set(existingPlatforms.map(p => p.name));
  const newPlatforms: PlatformItem[] = [];
  DEFAULT_PLATFORMS_LIST.forEach((name, i) => {
    if (!existingPlatformNames.has(name)) {
      newPlatforms.push({
        id: `plat-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}`,
        name,
        createdAt: new Date(Date.now() - 86400000 * (30 - i)).toISOString()
      });
    }
  });
  if (newPlatforms.length > 0) await db.platforms.bulkAdd(newPlatforms);

  // Seed Tools
  const toolsCount = await db.tools.count();
  if (toolsCount === 0) {
    const toolItems: ToolItem[] = INITIAL_TOOLS_LIST.map((name, i) => ({
      id: `tool-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}`,
      name,
      createdAt: new Date(Date.now() - 86400000 * (20 - i)).toISOString()
    }));
    await db.tools.bulkAdd(toolItems);
  }

  // --- Category master list migration ---
  // 1) Remove legacy default categories that are no longer in the master list,
  //    but only if they aren't currently used anywhere.
  const [allCategories, allNotes, allLabs, allTerms] = await Promise.all([
    db.categories.toArray(),
    db.notes.toArray(),
    db.labs.toArray(),
    db.glossary.toArray(),
  ]);

  const isCategoryInUse = (name: string) => {
    const used =
      allNotes.some(n => n.category === name || (n.categories || []).includes(name)) ||
      allLabs.some(l => l.topic === name || (l.categories || []).includes(name)) ||
      allTerms.some(t => t.category === name || (t.categories || []).includes(name));
    return used;
  };

  for (const cat of allCategories) {
    const isLegacyOnly = LEGACY_DEFAULT_CATEGORIES.includes(cat.name) && !MASTER_CATEGORIES_LIST.includes(cat.name);
    if (isLegacyOnly && !isCategoryInUse(cat.name)) {
      await db.categories.delete(cat.id);
    }
  }

  // 2) Ensure every master category exists
  const currentCatNames = new Set((await db.categories.toArray()).map(c => c.name));
  const toInsert: CategoryItem[] = [];
  MASTER_CATEGORIES_LIST.forEach((name, i) => {
    if (!currentCatNames.has(name)) {
      toInsert.push({
        id: `cat-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}`,
        name,
        createdAt: new Date(Date.now() - 86400000 * (25 - i)).toISOString()
      });
    }
  });
  if (toInsert.length > 0) await db.categories.bulkAdd(toInsert);
}

/** Count how many active notes/labs/terms reference a category by name. */
export async function countCategoryUsage(name: string): Promise<number> {
  const [allNotes, allLabs, allTerms] = await Promise.all([
    db.notes.toArray(),
    db.labs.toArray(),
    db.glossary.toArray(),
  ]);
  const usedInNotes = allNotes.filter(
    (n) => !n.isDeleted && (n.category === name || (n.categories || []).includes(name))
  ).length;
  const usedInLabs = allLabs.filter(
    (l) => !l.isDeleted && (l.topic === name || (l.categories || []).includes(name))
  ).length;
  const usedInTerms = allTerms.filter(
    (t) => !t.isDeleted && (t.category === name || (t.categories || []).includes(name))
  ).length;
  return usedInNotes + usedInLabs + usedInTerms;
}

/** Count how many active labs use a given tool by name. */
export async function countToolUsage(name: string): Promise<number> {
  const allLabs = await db.labs.toArray();
  return allLabs.filter((l) => !l.isDeleted && (l.tools || []).includes(name)).length;
}