import Dexie, { type Table } from 'dexie';
import { Note, GlossaryTerm, StoredImage, StoredPdf, Lab, PlatformItem, CategoryItem, ToolItem, FlashcardStat, StoredFileHandle, ReferenceItem, ProfileDoc, RoadmapItem, HelpDeskTicket, SysAdminTicket, SocTicket } from '../types';
import { GLOSSARY_SEED_TERMS } from '../data/glossarySeed';
import { ROADMAP_ALL_ITEM_IDS } from '../data/roadmapData';
import { ROADMAP_HD_ALL_ITEM_IDS } from '../data/roadmapHelpDeskData';
import { HELPDESK_TICKET_SEEDS } from '../data/helpDeskTickets';
import { SYSADMIN_TICKET_SEEDS } from '../data/sysadminTickets';
import { SOC_TICKET_SEEDS } from '../data/socTickets';
import { ROADMAP_SA_ALL_ITEM_IDS } from '../data/roadmapSysAdminData';
import { ROADMAP_SOC_ALL_ITEM_IDS } from '../data/roadmapSocData';

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
  // V10 (v24) — CISA KEV catalog markers (optional: old rows lack them).
  kevVersion?: string;
  kevLastSync?: string | null;
  kevCount?: number;
}

// ------------------------------------------------------------------
// V10 (v24) — ONLINE DATASET SYNC tables. All three are ADDED in schema
// v24 (delta-only migration). They hold OFFICIAL public data explicitly
// downloaded by the user via the Sync Center (MITRE ATT&CK techniques from
// attack-stix-data, official SigmaHQ rules, CISA KEV catalog). They contain
// NO user PII and NO API keys — keys stay in VaultIntelDB as always — so
// they are exported by the vault backup like tiCache/savedCves (latest-wins
// on import). The bundled datasets always remain the offline baseline.
// ------------------------------------------------------------------

/** One MITRE ATT&CK technique/sub-technique synced from the official STIX
 *  bundle (github.com/mitre-attack/attack-stix-data). Normalized shape —
 *  sanitized, description capped. Merged over the bundled dataset by id. */
export interface SyncedMitreTechnique {
  /** MITRE canonical id, e.g. "T1059" or "T1059.001". Primary key. */
  id: string;
  /** STIX object id ("attack-pattern--<uuid>"), kept for provenance. */
  stixId: string;
  name: string;
  /** Official English description (sanitized, capped ~600 chars). */
  description: string;
  /** Tactic display names joined with " / " (e.g. "Execution"). */
  tactic: string;
  platforms: string[];
  /** Official reference URL (attack.mitre.org/techniques/Txxxx). */
  url: string;
  /** ATT&CK version the row was synced from (e.g. "19.2"). */
  version: string;
  /** ISO timestamp of the sync. */
  syncedAt: string;
  revoked: boolean;
  deprecated: boolean;
}

/** One official Sigma rule synced from github.com/SigmaHQ/sigma
 *  (rules/windows/builtin/**). Same field contract as CustomSigmaRule
 *  (logsource/detection stored as JSON strings, yaml verbatim, NEVER
 *  executed — see sigma/validate.ts) plus sync provenance. */
export interface SyncedSigmaRule {
  id: string;
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
  /** Raw yaml text — stored verbatim, NEVER executed. */
  yaml: string;
  /** Repo path of the source file (provenance). */
  sourcePath: string;
  syncedAt: string;
}

/** One entry of the CISA Known Exploited Vulnerabilities catalog
 *  (github.com/cisagov/kev-data — official mirror of cisa.gov). Trimmed to
 *  the fields the app actually uses (the full catalog keeps 1.7MB; we keep
 *  ~600KB with the official requiredAction guidance). */
export interface KevEntry {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  dueDate?: string;
  knownRansomwareCampaignUse: string;
  requiredAction: string;
}

/** Singleton row (id='singleton') with the synced KEV catalog. */
export interface KevCatalogRow {
  id: string;
  title: string;
  catalogVersion: string;
  dateReleased: string;
  count: number;
  fetchedAt: string;
  entries: KevEntry[];
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

class VaultDatabase extends Dexie {
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
  // V6 (limpieza): la tabla `reviewItems` (cola de Revisión) se retiró del
  // schema en v20 — Dexie elimina el object store al dejar de declararlo.
  // El resto de datos del usuario NO se toca (migración no destructiva).
  // BLOQUE 6 — Online-Optional integration tables. See interface defs above.
  tiCache!: Table<TiCacheEntry, string>;
  onlineActivity!: Table<OnlineActivityRow, string>;
  customSigmaRules!: Table<CustomSigmaRule, string>;
  savedCves!: Table<SavedCve, string>;
  datasetMeta!: Table<DatasetMeta, string>;
  // V10 (v24) — official dataset sync tables (see interfaces above).
  mitreTechniques!: Table<SyncedMitreTechnique, string>;
  sigmaRulesSynced!: Table<SyncedSigmaRule, string>;
  kevCatalog!: Table<KevCatalogRow, string>;
  // DATA & INTEL — dataset de trabajo (IoCs · eventos · reglas). v16.
  intelItems!: Table<IntelItem, string>;
  // PERFIL PROFESIONAL (v17, multi-perfil desde v18) — documentos del CV:
  // skills, tools, experiencia, certs, idiomas, targetRoles. Varias filas
  // (campo `name`), exportables como Markdown AI-ready.
  profile!: Table<ProfileDoc, string>;
  // ROADMAP (v18) — estado del checklist del roadmap Junior IAM
  // (contenido en data/roadmapData.ts; aquí solo done/doneAt por id).
  roadmapItems!: Table<RoadmapItem, string>;
  // HELPDESK (v19) — especialización HelpDesk / IT Support:
  //  · `roadmapHelpDeskItems` — estado del checklist del roadmap HelpDesk
  //    → IAM (contenido en data/roadmapHelpDeskData.ts; aquí solo
  //    done/doneAt por id, IGUAL que roadmapItems pero independiente).
  //  · `helpdeskTickets` — tickets SIMULADOS de práctica (dataset
  //    data/helpDeskTickets.ts, empresa ficticia Nexora S.A.) que el
  //    usuario trabaja (triage → resolución) + tickets propios (CRUD).
  roadmapHelpDeskItems!: Table<RoadmapItem, string>;
  helpdeskTickets!: Table<HelpDeskTicket, string>;
  // SYSADMIN (v21) — especialización Infraestructura & Operaciones
  // (espejo del patrón HelpDesk v19):
  //  · `roadmapSysAdminItems` — estado del checklist del roadmap SysAdmin
  //    → SRE (contenido en data/roadmapSysAdminData.ts, ids 'rmsa-*').
  //  · `sysadminTickets` — tickets SIMULADOS de práctica (dataset
  //    data/sysadminTickets.ts, Nexora S.A. — Infraestructura) que el
  //    usuario trabaja como práctica de guardia (OPS-2001...).
  roadmapSysAdminItems!: Table<RoadmapItem, string>;
  sysadminTickets!: Table<SysAdminTicket, string>;
  /** v9 (SOC simulador): casos de práctica del Blue Team (SOC-3001...). */
  socTickets!: Table<SocTicket, string>;
  /** v9 (SOC): progreso del roadmap SOC (ids 'rmsoc-*'). */
  roadmapSocItems!: Table<RoadmapItem, string>;

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

    // v17: PERFIL PROFESIONAL — tabla `profile`.
    // v18: GLOSARIO SEMBRADO + ROADMAP + MULTI-PERFIL:
    //  · `roadmapItems` — estado del checklist del roadmap Junior IAM
    //    (el contenido vive en data/roadmapData.ts; aquí solo done/doneAt).
    //  · `profile` pasa a ser MULTI-PERFIL (varias filas, campo `name`).
    //    La fila 'singleton' existente se conserva tal cual (migración de
    //    datos en initializeDatabase, no de esquema — el índice no cambia).
    //  · El glosario se siembra desde data/glossarySeed.ts (389 términos,
    //    ~75% IAM) — seeding aditivo y no destructivo por nombre.
    this.version(17).stores({
      profile: 'id, updatedAt',
    });
    this.version(18).stores({
      roadmapItems: 'id, updatedAt',
    });
    // v19: HELPDESK — migración 100% ADITIVA (las tablas existentes no se
    // tocan; los datos previos sobreviven intactos):
    //  · roadmapHelpDeskItems — progreso del roadmap HelpDesk (65 ítems
    //    'rmhd-*' en data/roadmapHelpDeskData.ts).
    //  · helpdeskTickets — CRUD de tickets simulados (seed idempotente por
    //    id + dismissal; el índice status/isDeleted sostiene las vistas).
    this.version(19).stores({
      roadmapHelpDeskItems: 'id, updatedAt',
      helpdeskTickets: 'id, status, isDeleted, updatedAt, createdAt',
    });
    // v20 (V6 — limpieza): la feature Review (cola de Revisión) se eliminó
    // por completo. Dexie borra el object store declarándolo como `null` en
    // la nueva versión (migración ordenada por la spec V6). El resto de
    // tablas NO se toca (delta-only, igual que v14-v19): todos los datos del
    // usuario (notas, labs, glosario, roadmaps, tickets, perfil…) quedan
    // intactos. NOTA: los backups ≤3.5.0 que traigan reviewItems.json se
    // ignoran con gracia en la importación (zipBackup 3.6.0).
    this.version(20).stores({
      reviewItems: null,
    });
    // v21: SYSADMIN — migración 100% ADITIVA (delta-only, igual que v19):
    //  · roadmapSysAdminItems — progreso del roadmap SysAdmin (ids 'rmsa-*'
    //    en data/roadmapSysAdminData.ts).
    //  · sysadminTickets — CRUD de tickets simulados de guardia (seed
    //    idempotente por id + dismissal; el índice status/isDeleted
    //    sostiene las vistas). Mismo contrato que helpdeskTickets con las
    //    extensiones de dominio: environment + type 'cambio'.
    this.version(21).stores({
      roadmapSysAdminItems: 'id, updatedAt',
      sysadminTickets: 'id, status, isDeleted, updatedAt, createdAt',
    });
    // v9: SOC + LABS VACÍO — migración ADITIVA + cleanup dirigido:
    //  · roadmapSocItems — progreso del roadmap SOC (ids 'rmsoc-*' en
    //    data/roadmapSocData.ts). Delta-only: nada más se toca.
    //  · Upgrade(): elimina EXCLUSIVAMENTE los 9 ids sembrados de labs
    //    (4 HelpDesk 'labhd-*' + 5 SysAdmin 'labsa-*' — spec V9 Phase 1:
    //    Labs queda vacío). SOLO esos ids: un lab creado por el usuario
    //    nunca se borra (regla de preservación #1). El seeding de labs
    //    desaparece en esta misma versión (no se siembran más).
    this.version(22)
      .stores({
        roadmapSocItems: 'id, updatedAt',
      })
      .upgrade(async () => {
        const SEEDED_LAB_IDS = [
          'labhd-jml-onboarding-l1',
          'labhd-printer-troubleshooting',
          'labhd-entra-joined-migration',
          'labhd-phishing-mfa-security',
          'labsa-guardia-linux-diagnostico',
          'labsa-lvm-raid-extend',
          'labsa-backup-restore-321',
          'labsa-cambio-parches',
          'labsa-monitor-umbrales',
        ];
        try {
          await db.labs.bulkDelete(SEEDED_LAB_IDS);
        } catch {
          // La tabla puede no existir en una instalación ex-novo — no-op.
        }
      });
    // v23: SOC (SIMULADOR) — migración 100% ADITIVA (delta-only, igual
    // que v19/v21): `socTickets` — CRUD de casos simulados del Blue Team
    // (seed idempotente por id + dismissal; el índice status/isDeleted
    // sostiene las vistas). Mismo contrato que helpdeskTickets/
    // sysadminTickets con la extensión de dominio environment = torre de
    // detección (Identity/Endpoint/Network/Email/Cloud/Web/Multi).
    this.version(23).stores({
      socTickets: 'id, status, isDeleted, updatedAt, createdAt',
    });
    // V10 (v24): ONLINE DATASET SYNC — migración 100% ADITIVA (delta-only,
    // igual que v19/v21/v23): tres tablas nuevas para los datasets oficiales
    // descargados explícitamente desde el Sync Center:
    //  · mitreTechniques — técnicas ATT&CK sincronizadas del bundle STIX
    //    oficial (mitre-attack/attack-stix-data). El bundle curado de la app
    //    (data/mitreData.ts) SIGUE siendo la base offline; esto es una capa
    //    encima (merge por id, el sync no borra el bundle).
    //  · sigmaRulesSynced — reglas oficiales de SigmaHQ/sigma (subset
    //    rules/windows/builtin). Nunca se ejecutan (data only, igual que
    //    customSigmaRules).
    //  · kevCatalog — catálogo CISA KEV (cisagov/kev-data), fila única
    //    'singleton' con las entradas recortadas.
    // Nada más se toca. Las claves API NO viven aquí (VaultIntelDB, como
    // siempre). El backup ZIP las exporta (3.10.0) con latest-wins.
    this.version(24).stores({
      mitreTechniques: 'id, syncedAt',
      sigmaRulesSynced: 'id, syncedAt',
      kevCatalog: 'id, fetchedAt',
    });
  }
}

/** Current Dexie schema version. Used by the backup manifest so the importer
 *  can refuse cross-version restores (spec #35: "On restore: must show
 *  'Incompatible backup version' NOT partial import"). Bump this when
 *  bumping `this.version(N)` above.
 *  v24 fix (auditoría V10, H1): la constante quedó rezagada en 22 mientras el
 *  schema ya declaraba v23 (socTickets) — se realinea a 24 con la migración
 *  aditiva del sync online (mitreTechniques/sigmaRulesSynced/kevCatalog). */
export const CURRENT_SCHEMA_VERSION = 24;

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
  'TryHackMe / HackTheBox',
  // v21 (SYSADMIN) — plataformas de Infraestructura & Operaciones (la
  // rama SysAdmin del multi-perfil). Aditivo: solo se añaden si faltan.
  'Linux (RHEL / Debian / SUSE)',
  'Windows Server / Hyper-V',
  'VMware vSphere / Proxmox',
  'Docker / Kubernetes',
  'Zabbix / Grafana / Prometheus',
  'Ansible / Terraform',
];

// Single master list for "Categoría / Tema / Especialidad" — used by Notes, Labs, Glossary.
// v19: rama HelpDesk (especialización HelpDesk / IT Support) — aditiva.
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
  'IAM - Auth / MFA',
  'IAM - Federation / SSO',
  'GRC - Auditoría y Cumplimiento',
  'GRC - Riesgo y Marco Normativo',
  'HelpDesk - Fundamentos IT',
  'HelpDesk - Service Desk / ITSM',
  'HelpDesk - Windows / Endpoint',
  'HelpDesk - Redes (Networking)',
  'HelpDesk - Microsoft 365',
  'HelpDesk - AD / Identidad',
  'HelpDesk - Seguridad para Soporte',
  // v21 (SYSADMIN) — rama de Infraestructura & Operaciones (aditiva).
  'SysAdmin - Linux / Unix',
  'SysAdmin - Windows Server',
  'SysAdmin - Redes & Firewalls',
  'SysAdmin - Storage & Backup',
  'SysAdmin - Virtualización',
  'SysAdmin - Cloud / Contenedores',
  'SysAdmin - Monitoreo & Observabilidad',
  'SysAdmin - Automatización',
  'SysAdmin - Seguridad & Hardening'
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

/** localStorage: ids de seeds HelpDesk/SysAdmin (tickets/labs/perfil) que
 * el usuario borró DEFINITIVAMENTE (para que el seeding no los reviva).
 * Mismo patrón que SEED_DISMISSED_KEY del glosario, pero por id (no por
 * nombre). */
const SEED_DISMISSED_IDS_KEY = 'vn-seed-dismissed-ids';
export type HdSeedDomain =
  | 'helpdeskTicket'
  | 'helpdeskLab'
  | 'helpdeskProfile'
  | 'sysadminTicket'
  | 'sysadminLab'
  | 'sysadminProfile'
  | 'socTicket';

/** localStorage: nombres de términos del seed que el usuario borró
 * DEFINITIVAMENTE (para que el seeding no los traiga de vuelta). */
const SEED_DISMISSED_KEY = 'vn-glossary-seed-dismissed';

function loadDismissedSeedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEED_DISMISSED_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

/** Registra un id de seed HelpDesk como "descartado" para que el seed no
 * lo reviva. Se llama al borrar DEFINITIVAMENTE (hard delete) un ticket
 * sembrado, un lab template HelpDesk o el perfil HelpDesk. */
export function dismissSeedId(domain: HdSeedDomain, id: string): void {
  try {
    const set = loadDismissedSeedIds();
    const key = `${domain}:${id}`;
    if (set.has(key)) return;
    set.add(key);
    localStorage.setItem(SEED_DISMISSED_IDS_KEY, JSON.stringify([...set]));
  } catch {
    /* best-effort: si localStorage falla, el seed puede re-añadir */
  }
}

function isSeedIdDismissed(domain: HdSeedDomain, id: string): boolean {
  return loadDismissedSeedIds().has(`${domain}:${id}`);
}

const normName = (s: string): string =>
  s
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

function loadDismissedSeedNames(): Set<string> {
  try {
    const raw = localStorage.getItem(SEED_DISMISSED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(normName) : []);
  } catch {
    return new Set();
  }
}

/** Registra un nombre de término como "descartado" del seed (se llama al
 * borrar DEFINITIVAMENTE un término — así el seed no lo revive). */
export function dismissSeedTerm(termName: string): void {
  try {
    const set = loadDismissedSeedNames();
    const key = normName(termName);
    if (!key || set.has(key)) return;
    set.add(key);
    localStorage.setItem(SEED_DISMISSED_KEY, JSON.stringify([...set]));
  } catch {
    /* best-effort: si localStorage falla, el seed puede re-añadir */
  }
}

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

  // --- GLOSARIO SEMBRADO (v18+): los 639 términos curados (base 194 +
  // ampliación IAM 195 + HelpDesk 250) de data/glossarySeed*.ts ya vienen
  // DE FÁBRICA — sin importar nada.
  // Seeding ADITIVO y NO destructivo: dedupe por nombre normalizado contra
  // TODO el glosario (incluidos soft-deleted, para no revivir borrados con
  // otro id) + nombres descartados definitivamente (SEED_DISMISSED_KEY).
  // Los términos que ya existen (p. ej. importados de los packs antiguos)
  // NO se duplican ni se sobrescriben.
  try {
    const existingTerms = await db.glossary.toArray();
    const existingNames = new Set(existingTerms.map((t) => normName(t.term)));
    const dismissed = loadDismissedSeedNames();
    const now = new Date().toISOString();
    const toAdd: GlossaryTerm[] = [];
    for (const seed of GLOSSARY_SEED_TERMS) {
      const key = normName(seed.term);
      if (!key || existingNames.has(key) || dismissed.has(key)) continue;
      existingNames.add(key);
      toAdd.push({
        id: seed.id,
        term: seed.term,
        acronym: seed.acronym || undefined,
        category: seed.category,
        shortDefinition: seed.shortDefinition,
        longDefinition: seed.longDefinition,
        example: seed.example || '',
        platform: 'General',
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
    }
    if (toAdd.length > 0) {
      // bulkPut (no bulkAdd): tolera reinstalaciones donde ya existan ids
      // seed-* (p. ej. restore de backup) sin lanzar BulkError.
      await db.glossary.bulkPut(toAdd);
    }
  } catch (err) {
    console.warn('Glosario seed skipped:', err);
  }

  // --- ROADMAP (v18): filas de estado para todos los ítems de
  // data/roadmapData.ts. ADITIVO: solo crea los ids que falten; NUNCA
  // resetea el done/doneAt del usuario (el progreso sobrevive updates).
  try {
    const existingRm = await db.roadmapItems.toArray();
    const existingRmIds = new Set(existingRm.map((r) => r.id));
    const missing = ROADMAP_ALL_ITEM_IDS.filter((id) => !existingRmIds.has(id));
    if (missing.length > 0) {
      const nowRm = new Date().toISOString();
      await db.roadmapItems.bulkPut(
        missing.map((id) => ({ id, done: false, updatedAt: nowRm }))
      );
    }
  } catch (err) {
    console.warn('Roadmap seed skipped:', err);
  }

  // --- HELPDESK (v19) · ROADMAP: igual que el bloque anterior pero para
  // data/roadmapHelpDeskData.ts (ids 'rmhd-*') en su PROPIA tabla — el
  // progreso HelpDesk y el IAM son completamente independientes.
  try {
    const existingRmHd = await db.roadmapHelpDeskItems.toArray();
    const existingRmHdIds = new Set(existingRmHd.map((r) => r.id));
    const missingHd = ROADMAP_HD_ALL_ITEM_IDS.filter(
      (id) => !existingRmHdIds.has(id)
    );
    if (missingHd.length > 0) {
      const nowRmHd = new Date().toISOString();
      await db.roadmapHelpDeskItems.bulkPut(
        missingHd.map((id) => ({ id, done: false, updatedAt: nowRmHd }))
      );
    }
  } catch (err) {
    console.warn('HelpDesk roadmap seed skipped:', err);
  }

  // --- HELPDESK (v19) · TICKETS: siembra el dataset de práctica (48
  // tickets simulados de Nexora S.A.). ADITIVO por id: las filas que ya
  // existan (incluidas soft-deleted — la fila sigue viva) NO se tocan, así
  // el trabajo del usuario (status/statusNote) sobrevive. Los ids en el
  // dismissal set (borrado definitivo) no se reviven.
  try {
    const existingTk = await db.helpdeskTickets.toArray();
    const existingTkIds = new Set(existingTk.map((t) => t.id));
    const missingTk = HELPDESK_TICKET_SEEDS.filter(
      (t) => !existingTkIds.has(t.id) && !isSeedIdDismissed('helpdeskTicket', t.id)
    );
    if (missingTk.length > 0) {
      const nowTk = new Date().toISOString();
      // bulkPut (no bulkAdd): tolera restores que ya trajeran ids hdt-*
      // sin lanzar BulkError.
      await db.helpdeskTickets.bulkPut(
        missingTk.map((t) => ({
          ...t,
          status: 'nuevo' as const,
          statusNote: undefined,
          isDeleted: false,
          deletedAt: undefined,
          createdAt: nowTk,
          updatedAt: nowTk,
        }))
      );
    }
  } catch (err) {
    console.warn('HelpDesk tickets seed skipped:', err);
  }

  // --- SYSADMIN (v21) · ROADMAP: igual que los bloques anteriores pero para
  // data/roadmapSysAdminData.ts (ids 'rmsa-*') en su PROPIA tabla — el
  // progreso SysAdmin, HelpDesk e IAM son completamente independientes.
  try {
    const existingRmSa = await db.roadmapSysAdminItems.toArray();
    const existingRmSaIds = new Set(existingRmSa.map((r) => r.id));
    const missingSa = ROADMAP_SA_ALL_ITEM_IDS.filter(
      (id) => !existingRmSaIds.has(id)
    );
    if (missingSa.length > 0) {
      const nowRmSa = new Date().toISOString();
      await db.roadmapSysAdminItems.bulkPut(
        missingSa.map((id) => ({ id, done: false, updatedAt: nowRmSa }))
      );
    }
  } catch (err) {
    console.warn('SysAdmin roadmap seed skipped:', err);
  }

  // --- SOC (v9) · ROADMAP: igual que los bloques anteriores pero para
  // data/roadmapSocData.ts (ids 'rmsoc-*') en su PROPIA tabla — el
  // progreso SOC, SysAdmin, HelpDesk e IAM son completamente independientes.
  try {
    const existingRmSoc = await db.roadmapSocItems.toArray();
    const existingRmSocIds = new Set(existingRmSoc.map((r) => r.id));
    const missingSoc = ROADMAP_SOC_ALL_ITEM_IDS.filter(
      (id) => !existingRmSocIds.has(id)
    );
    if (missingSoc.length > 0) {
      const nowRmSoc = new Date().toISOString();
      await db.roadmapSocItems.bulkPut(
        missingSoc.map((id) => ({ id, done: false, updatedAt: nowRmSoc }))
      );
    }
  } catch (err) {
    console.warn('SOC roadmap seed skipped:', err);
  }

  // --- SYSADMIN (v21) · TICKETS: siembra el dataset de práctica (56
  // tickets simulados de Nexora S.A. — Infraestructura & Operaciones).
  // ADITIVO por id: las filas que ya existan (incluidas soft-deleted) NO se
  // tocan, así el trabajo del usuario (status/statusNote) sobrevive. Los
  // ids en el dismissal set (borrado definitivo) no se reviven.
  try {
    const existingSaTk = await db.sysadminTickets.toArray();
    const existingSaTkIds = new Set(existingSaTk.map((t) => t.id));
    const missingSaTk = SYSADMIN_TICKET_SEEDS.filter(
      (t) => !existingSaTkIds.has(t.id) && !isSeedIdDismissed('sysadminTicket', t.id)
    );
    if (missingSaTk.length > 0) {
      const nowSaTk = new Date().toISOString();
      // bulkPut (no bulkAdd): tolera restores que ya trajeran ids sa-*
      // sin lanzar BulkError.
      await db.sysadminTickets.bulkPut(
        missingSaTk.map((t) => ({
          ...t,
          status: 'nuevo' as const,
          statusNote: undefined,
          isDeleted: false,
          deletedAt: undefined,
          createdAt: nowSaTk,
          updatedAt: nowSaTk,
        }))
      );
    }
  } catch (err) {
    console.warn('SysAdmin tickets seed skipped:', err);
  }

  // --- SOC (v9 · SIMULADOR) · CASOS: siembra el dataset de práctica (50
  // casos simulados de Nexora S.A. — SOC / Blue Team). ADITIVO por id:
  // las filas que ya existan (incluidas soft-deleted) NO se tocan, así
  // el trabajo del usuario (status/statusNote) sobrevive. Los ids en el
  // dismissal set (borrado definitivo) no se reviven.
  try {
    const existingSocTk = await db.socTickets.toArray();
    const existingSocTkIds = new Set(existingSocTk.map((t) => t.id));
    const missingSocTk = SOC_TICKET_SEEDS.filter(
      (t) => !existingSocTkIds.has(t.id) && !isSeedIdDismissed('socTicket', t.id)
    );
    if (missingSocTk.length > 0) {
      const nowSocTk = new Date().toISOString();
      // bulkPut (no bulkAdd): tolera restores que ya trajeran ids soc-*
      // sin lanzar BulkError.
      await db.socTickets.bulkPut(
        missingSocTk.map((t) => ({
          ...t,
          status: 'nuevo' as const,
          statusNote: undefined,
          isDeleted: false,
          deletedAt: undefined,
          createdAt: nowSocTk,
          updatedAt: nowSocTk,
        }))
      );
    }
  } catch (err) {
    console.warn('SOC tickets seed skipped:', err);
  }

  // --- PERFIL PROFESIONAL (v17, multi-perfil desde v18): seed inicial SOLO
  // si la tabla está vacía (instalaciones nuevas). JAMÁS sobrescribe perfiles
  // existentes. Las filas heredadas sin `name` (p. ej. 'singleton') reciben
  // un nombre por defecto para la lista de perfiles.
  try {
    const allProfiles = await db.profile.toArray();
    for (const p of allProfiles) {
      if (!p.name) {
        await db.profile.update(p.id, { name: p.id === 'singleton' ? 'Perfil principal' : 'Perfil' });
      }
    }
    if (allProfiles.length === 0) {
      const now = new Date().toISOString();
      const seedProfile: ProfileDoc = {
        id: 'profile-main',
        name: 'Perfil IAM',
        fullName: '',
        headline: 'IAM Analyst | Identity & Access Management',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        portfolio: '',
        targetRoles: [
          'IAM Analyst',
          'Access Management Analyst',
          'Identity Analyst',
          'IAM Operations Analyst',
          'Identity & Access Governance Analyst',
          'Access Review Analyst',
          'Identity Lifecycle Analyst',
          'IAM Engineer (Jr)',
          'IT Security Analyst — IAM',
          'IAM Administrator',
        ],
        summary:
          'Analista de Identidades y Accesos (IAM) con dominio operativo del ciclo de vida de identidades ' +
          '(Joiner-Mover-Leaver), gobierno de accesos (RBAC, access reviews, mínimo privilegio y separación ' +
          'de funciones) y auditoría de los principales directorios e IdP del mercado: Active Directory, ' +
          'Microsoft Entra ID (Access Reviews, Sign-in logs, Enterprise Apps, Roles, PIM) y Okta Workforce. ' +
          'Gestión de tickets de acceso de extremo a extremo en ServiceNow con justificación, aprobación y ' +
          'evidencia. Automatización y análisis con PowerShell. Certificación Microsoft SC-300 en proceso. ' +
          'Español nativo e inglés B2+.',
        skills: [
          // CORE IAM — donde vive el analyst a diario
          { id: 'skl-ad-audit', name: 'Active Directory (ADUC) — auditoría de usuarios, grupos y admins', group: 'Core IAM', status: 'Dominado', notes: 'Ver usuarios activos/inactivos, pertenencia a grupos, quién tiene admin. No instalarlo: auditarlo.' },
          { id: 'skl-entra', name: 'Entra ID — Access Reviews, Sign-in logs, Enterprise Apps, Roles, PIM', group: 'Core IAM', status: 'Dominado', notes: 'Pantallas clave del día a día para revisar accesos privilegiados.' },
          { id: 'skl-okta', name: 'Okta Workforce — reports, assignments, quién accede a qué app', group: 'Core IAM', status: 'Dominado' },
          { id: 'skl-jml', name: 'JML (Joiner-Mover-Leaver) — altas, bajas y cambios de puesto', group: 'Procesos IAM', status: 'Dominado', notes: 'El 60% del trabajo del analyst.' },
          { id: 'skl-rbac', name: 'RBAC — creación y mantenimiento de la matriz de roles', group: 'Procesos IAM', status: 'Dominado', notes: 'Qué puede ver Contabilidad vs TI vs Ventas.' },
          { id: 'skl-reviews', name: 'Access Reviews / Certificaciones — reporte, aprobación/revocación y evidencia', group: 'Procesos IAM', status: 'Dominado' },
          { id: 'skl-least-sod', name: 'Mínimo Privilegio + SoD — detección de conflictos (crear y aprobar pagos, etc.)', group: 'Procesos IAM', status: 'Dominado' },
          { id: 'skl-saml', name: 'SAML 2.0 — SSO y federación IdP/SP', group: 'Core IAM', status: 'En proceso' },
          { id: 'skl-oidc', name: 'OIDC / OAuth 2.0 — autorización moderna y tokens', group: 'Core IAM', status: 'En proceso' },
          { id: 'skl-scim', name: 'SCIM / SCIM Provisioning — aprovisionamiento automatizado', group: 'Core IAM', status: 'En proceso' },
          { id: 'skl-ca', name: 'Conditional Access — análisis de directivas (riesgo, dispositivo, MFA)', group: 'Core IAM', status: 'En proceso' },
          { id: 'skl-sspr', name: 'SSPR — autoservicio de restablecimiento de contraseña', group: 'Core IAM', status: 'En proceso' },
          { id: 'skl-iga-tools', name: 'IGA empresarial (SailPoint, Saviynt)', group: 'Core IAM', status: 'Por aprender' },
          { id: 'skl-pam-tools', name: 'PAM empresarial (CyberArk, BeyondTrust)', group: 'Core IAM', status: 'Por aprender' },
          { id: 'skl-cloud-iam', name: 'AWS IAM / GCP IAM', group: 'Core IAM', status: 'Por aprender' },
          // Técnico
          { id: 'skl-powershell', name: 'PowerShell — módulos AD y Microsoft Graph', group: 'Técnico', status: 'Dominado', notes: 'Reportes de usuarios/grupos y borrado masivo seguro.' },
          { id: 'skl-kql', name: 'KQL — consultas de logs en Microsoft Sentinel/Entra', group: 'Técnico', status: 'Por aprender' },
          { id: 'skl-sql', name: 'SQL — consultas para reportes de accesos', group: 'Técnico', status: 'Por aprender' },
          // Blandas
          { id: 'skl-doc', name: 'Documentación y evidencia de auditoría', group: 'Blandas', status: 'Dominado' },
          { id: 'skl-comms', name: 'Comunicación con managers y aprobadores', group: 'Blandas', status: 'Dominado' },
          { id: 'skl-detail', name: 'Atención al detalle y trazabilidad de tickets', group: 'Blandas', status: 'Dominado' },
        ],
        tools: [
          { id: 'pt-servicenow', name: 'ServiceNow (ITSM — tickets de acceso)', level: 'Avanzado', notes: 'Herramienta #1 del analyst: abrir, documentar y cerrar con justificación, aprobador y evidencia.' },
          { id: 'pt-powershell', name: 'PowerShell', level: 'Intermedio' },
          { id: 'pt-entra', name: 'Microsoft Entra ID (admin center)', level: 'Avanzado' },
          { id: 'pt-aduc', name: 'Active Directory — ADUC', level: 'Avanzado' },
          { id: 'pt-okta', name: 'Okta Workforce (admin console)', level: 'Avanzado' },
          { id: 'pt-excel', name: 'Excel (reportes de access reviews)', level: 'Intermedio' },
        ],
        experience: [],
        education: [],
        certifications: [
          { id: 'cert-sc300', name: 'SC-300 — Identity and Access Administrator', issuer: 'Microsoft', status: 'En proceso', notes: 'Certificación alineada 1:1 con el rol: JML, access reviews, governance.' },
        ],
        languages: [
          { id: 'lang-es', name: 'Español', level: 'Nativo' },
          { id: 'lang-en', name: 'Inglés', level: 'B2+' },
        ],
        projects: [
          { id: 'prj-vaultnotes', name: 'VaultNotes — segundo cerebro de ciberseguridad (PWA local-first)', description: 'Aplicación web offline-first con glosario IAM/SOC con flashcards de repetición espaciada, labs, análisis de IOCs, calculadora CVSS y backups automáticos a USB. Desarrollada para estudiar y aplicar IAM en la práctica.' },
        ],
        atsKeywords: [
          'IAM', 'Identity and Access Management', 'IAM Analyst', 'Access Management', 'JML', 'Joiner Mover Leaver',
          'Identity Lifecycle', 'RBAC', 'Access Reviews', 'Access Certifications', 'SoD', 'Segregation of Duties',
          'Least Privilege', 'SAML', 'OIDC', 'OAuth 2.0', 'SCIM', 'MFA', 'Conditional Access', 'SSPR', 'PIM',
          'Entra ID', 'Azure AD', 'Active Directory', 'ADUC', 'Okta', 'ServiceNow', 'PowerShell', 'IGA', 'PAM',
          'Identity Governance', 'Access Governance', 'SC-300', 'Identity Analyst', 'Zero Trust',
        ],
        jobSearchNotes:
          'Títulos objetivo: IAM Analyst / Access Management Analyst (ver lista). Buscar también: "Identity Analyst", ' +
          '"IAM Operations", "Access Governance". Portales: LinkedIn, Computrabajo, Indeed, empresa-empresa. ' +
          'Palabras clave probadas: "IAM", "identidades y accesos", "active directory", "entra id", "okta". ' +
          'La certificación SC-300 (en proceso) es el diferenciador principal para pasar filtros ATS.',
        createdAt: now,
        updatedAt: now,
      };
      await db.profile.put(seedProfile);
    }
  } catch (err) {
    console.warn('Profile seed skipped:', err);
  }

  // --- HELPDESK (v19) · PERFIL "HelpDesk L1 - Service Desk": ADDITIVO y
  // COEXISTENTE con el perfil IAM (multi-perfil). Se crea si no existe la
  // fila 'profile-helpdesk-l1' (en instalaciones NUEVAS y en existentes);
  // si el usuario la borró definitivamente, el dismissal evita revivirla.
  // NUNCA sobrescribe: si la fila existe, se respeta tal cual.
  try {
    const hasHdProfile = await db.profile.get('profile-helpdesk-l1');
    if (!hasHdProfile && !isSeedIdDismissed('helpdeskProfile', 'profile-helpdesk-l1')) {
      const nowHd = new Date().toISOString();
      const seedProfileHd: ProfileDoc = {
        id: 'profile-helpdesk-l1',
        name: 'Perfil HelpDesk L1 - Service Desk',
        fullName: '',
        headline: 'HelpDesk / IT Support Analyst — L1 Service Desk',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        portfolio: '',
        targetRoles: [
          'Help Desk Technician',
          'Help Desk Analyst',
          'Service Desk Analyst',
          'IT Support Analyst',
          'IT Support Technician',
          'Desktop Support Technician',
          'Desktop Support Analyst',
          'Technical Support Analyst',
          'IT Service Desk Technician',
          'Junior IT Support Analyst',
        ],
        summary:
          'Analista de Soporte Técnico (L1 Service Desk) con base sólida de troubleshooting estructurado ' +
          '(identificar → aislar → resolver → documentar), Windows 10/11, redes fundamentales (DNS, DHCP, VPN, ' +
          'Wi-Fi), Microsoft 365 (Outlook, Teams, OneDrive, licencias) y operativa de Active Directory/Entra ID ' +
          '(altas, bloqueos, grupos, MFA). Gestión de tickets con ITIL 4 (incidente vs solicitud, prioridad ' +
          'impacto × urgencia, SLA, escalamiento) y cultura de evidencia: cada cierre documentado para L2 y ' +
          'auditoría. En transición deliberada hacia IAM (ciclo de vida de identidades, accesos y gobierno). ' +
          'Español nativo e inglés B2+.',
        skills: [
          // Windows / Endpoint — el corazón del L1
          { id: 'sklhd-win', name: 'Windows 10/11 — instalación, updates, servicios, Event Viewer, perfiles', group: 'Windows / Endpoint', status: 'En proceso', notes: 'Diagnóstico del "equipo lento" y BSOD de primera respuesta.' },
          { id: 'sklhd-troubleshoot', name: 'Troubleshooting metodológico — identificar, reproducir, aislar, verificar, documentar', group: 'Windows / Endpoint', status: 'En proceso', notes: 'El método importa más que la solución puntual.' },
          { id: 'sklhd-hw', name: 'Hardware y periféricos — diagnóstico, docking, monitores, impresoras', group: 'Windows / Endpoint', status: 'En proceso' },
          // Redes
          { id: 'sklhd-net', name: 'Redes fundamentales — DNS, DHCP, VPN, Wi-Fi, puertos, diagnóstico con ping/nslookup/Test-NetConnection', group: 'Redes', status: 'En proceso' },
          // Microsoft 365
          { id: 'sklhd-m365', name: 'Microsoft 365 — Outlook, Teams, OneDrive, licencias, activación, Service Health', group: 'Microsoft 365', status: 'Por aprender' },
          // Identidad
          { id: 'sklhd-ad', name: 'Active Directory (operativa L1) — usuarios, grupos, bloqueos, resets delegados', group: 'Identidad', status: 'Por aprender', notes: 'Puente natural hacia IAM.' },
          { id: 'sklhd-entra', name: 'Entra ID fundamentals — MFA, SSPR, sign-in logs, estados de dispositivo', group: 'Identidad', status: 'Por aprender' },
          { id: 'sklhd-intune', name: 'Intune fundamentals — enrollment, compliance, Company Portal', group: 'Identidad', status: 'Por aprender' },
          // ITSM
          { id: 'sklhd-tickets', name: 'Gestión de tickets — triage, prioridad, categorización, escalamiento', group: 'ITSM', status: 'En proceso' },
          { id: 'sklhd-itil', name: 'ITIL 4 — incidente vs solicitud vs problema vs cambio, SLA/OLA, métricas (MTTA/MTTR/FCR/CSAT)', group: 'ITSM', status: 'En proceso' },
          { id: 'sklhd-powershell', name: 'PowerShell para soporte — Get-ADUser, Search-ADAccount, Get-WinEvent, Test-NetConnection', group: 'ITSM', status: 'Por aprender' },
          // Blandas / seguridad
          { id: 'sklhd-customer', name: 'Customer service técnico — empatía, lenguaje no técnico, gestión de expectativas', group: 'Blandas / Seguridad', status: 'En proceso' },
          { id: 'sklhd-doc', name: 'Documentación — tickets como evidencia, KB, traspasos de turno', group: 'Blandas / Seguridad', status: 'En proceso' },
          { id: 'sklhd-sec', name: 'Security awareness — phishing, vishing, verificación de identidad antes de resets', group: 'Blandas / Seguridad', status: 'En proceso', notes: 'El L1 es la primera barrera: saber cuándo NO resolver.' },
        ],
        tools: [
          { id: 'pthd-servicenow', name: 'ServiceNow / Jira SM / Zendesk (ITSM)', level: 'Intermedio', notes: 'Cualquier plataforma de tickets: el flujo (intake → triage → resolve → close) es el mismo.' },
          { id: 'pthd-aduc', name: 'Active Directory — ADUC', level: 'Intermedio' },
          { id: 'pthd-m365ac', name: 'Microsoft 365 admin center', level: 'Intermedio' },
          { id: 'pthd-entra', name: 'Microsoft Entra ID (admin center)', level: 'Básico' },
          { id: 'pthd-intune', name: 'Microsoft Intune', level: 'Básico' },
          { id: 'pthd-rdp', name: 'RDP / AnyDesk (soporte remoto)', level: 'Intermedio' },
          { id: 'pthd-outlook', name: 'Outlook / Teams / OneDrive (soporte de usuario final)', level: 'Intermedio' },
        ],
        experience: [],
        education: [],
        certifications: [
          { id: 'certhd-itil', name: 'ITIL 4 Foundation', issuer: 'AXELOS / PeopleCert', status: 'En proceso', notes: 'La certificación de entrada del service desk — vocabulario y marco.' },
          { id: 'certhd-aplus', name: 'CompTIA A+', issuer: 'CompTIA', status: 'Por aprender', notes: 'Hardware/Windows/redes fundamentales con sello verificable.' },
        ],
        languages: [
          { id: 'lang-es-hd', name: 'Español', level: 'Nativo' },
          { id: 'lang-en-hd', name: 'Inglés', level: 'B2+' },
        ],
        projects: [
          { id: 'prjhd-nexora', name: 'Proyecto Final VaultNotes — "primera semana" en el service desk de Nexora S.A. (simulado)', description: '30 tickets de punta a punta (triage, prioridad, troubleshooting, resolución/escalamiento y evidencia) + KB propia + informe de métricas. Práctica deliberada de L1 con foco en el puente hacia IAM.' },
          { id: 'prjhd-vaultnotes', name: 'VaultNotes — segundo cerebro de estudio (PWA local-first)', description: 'Glosario, roadmap, labs y flashcards de repaso espaciado — ahora con especialización HelpDesk/IT Support y transición a IAM.' },
        ],
        atsKeywords: [
          'Help Desk', 'Helpdesk', 'Service Desk', 'IT Support', 'Technical Support', 'Desktop Support',
          'IT Support Analyst', 'Service Desk Analyst', 'L1 Support', 'L2 Support', 'Tier 1', 'Tier 2',
          'ITIL 4', 'ITIL', 'ITSM', 'Incident Management', 'Service Request', 'SLA', 'OLA', 'Ticketing',
          'Troubleshooting', 'Ticket Resolution', 'Escalation', 'Customer Service', 'Customer Support',
          'Windows 10', 'Windows 11', 'Active Directory', 'AD', 'Entra ID', 'Azure AD', 'Microsoft 365',
          'Office 365', 'Outlook', 'Teams', 'OneDrive', 'SharePoint', 'Exchange Online', 'Intune',
          'Autopilot', 'PowerShell', 'DNS', 'DHCP', 'VPN', 'TCP/IP', 'Networking', 'RDP', 'Remote Support',
          'Password Reset', 'Account Lockout', 'MFA', 'SSPR', 'Imaging', 'Reimaging', 'Asset Management',
          'ServiceNow', 'Jira Service Management', 'Zendesk', 'Freshservice', 'CompTIA A+', 'ITIL Foundation',
        ],
        jobSearchNotes:
          'Títulos objetivo: Help Desk Analyst / IT Support Analyst / Service Desk Analyst (ver lista). ' +
          'Palabras clave probadas: "help desk", "soporte técnico", "service desk", "mesa de ayuda", "soporte TI". ' +
          'Portales: LinkedIn, Computrabajo, Indeed, empresa-empresa. Diferenciadores: ITIL 4 Foundation (en ' +
          'proceso), el proyecto final simulado de 30 tickets (prepáralo para contar en entrevistas) y la ' +
          'narrativa de transición L1 → L2 → IAM. Este perfil COEXISTE con el Perfil IAM: activa uno u otro ' +
          'según la vacante (el contenido de ambos se conserva).',
        createdAt: nowHd,
        updatedAt: nowHd,
      };
      await db.profile.put(seedProfileHd);
    }
  } catch (err) {
    console.warn('HelpDesk profile seed skipped:', err);
  }

  // --- SYSADMIN (v21) · PERFIL "SysAdmin Jr - Infra & Ops": ADDITIVO y
  // COEXISTENTE con los perfiles IAM y HelpDesk (multi-perfil). Se crea si
  // no existe la fila 'profile-sysadmin-jr'; si el usuario la borró
  // definitivamente, el dismissal evita revivirla. NUNCA sobrescribe.
  try {
    const hasSaProfile = await db.profile.get('profile-sysadmin-jr');
    if (!hasSaProfile && !isSeedIdDismissed('sysadminProfile', 'profile-sysadmin-jr')) {
      const nowSa = new Date().toISOString();
      const seedProfileSa: ProfileDoc = {
        id: 'profile-sysadmin-jr',
        name: 'Perfil SysAdmin Jr - Infra & Ops',
        fullName: '',
        headline: 'Junior SysAdmin | Infrastructure & Operations',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        portfolio: '',
        targetRoles: [
          'Junior SysAdmin',
          'Systems Administrator (Jr)',
          'IT Infrastructure Analyst',
          'Infrastructure Operations Analyst',
          'Windows/Linux Administrator (Jr)',
          'NOC Analyst',
          'Site Reliability Engineer (Jr)',
          'Cloud Infrastructure Analyst (Jr)',
          'IT Operations Analyst',
          'Datacenter Operations Technician',
        ],
        summary:
          'Administrador de sistemas junior (Linux + Windows Server) con criterio operativo de guardia: ' +
          'diagnóstico estructurado de incidentes (identificar → aislar → mitigar → verificar → documentar), ' +
          'gestión de servicios (systemd/Windows Services), almacenamiento y backups con regla 3-2-1, ' +
          'virtualización (vSphere/Proxmox/Hyper-V), redes de datacenter (VLANs, firewall, DNS/DHCP interno) ' +
          'y monitoreo con umbralismo sensato. Cambios con ventana, plan y rollback — nunca tocar producción ' +
          'sin los tres. Automatización con Bash/PowerShell y rumbo a Infra as Code (Ansible, Terraform) y ' +
          'contenedores. Español nativo e inglés B2+.',
        skills: [
          // Linux — el corazón operativo
          { id: 'sklsa-linux', name: 'Linux operativo — systemd, journalctl, permisos, LVM, gestores de paquetes, SSH', group: 'Linux', status: 'En proceso', notes: 'Diagnóstico del "servicio caído" y del "disco lleno" de primera línea.' },
          { id: 'sklsa-bash', name: 'Bash scripting — backups, rotación de logs, reportes, one-liners con awk/sed/grep', group: 'Linux', status: 'En proceso' },
          { id: 'sklsa-hardening-linux', name: 'Hardening Linux — SSH (claves, no root), firewalld/ufw, actualizaciones, auditd', group: 'Linux', status: 'Por aprender' },
          // Windows Server
          { id: 'sklsa-winsrv', name: 'Windows Server — AD/DNS interno, GPO, servicios, Event Viewer, PowerShell', group: 'Windows Server', status: 'En proceso' },
          { id: 'sklsa-ps', name: 'PowerShell para ops — Get-Service/Get-WinEvent, remoting, reportes de servidores', group: 'Windows Server', status: 'Por aprender' },
          // Redes
          { id: 'sklsa-net', name: 'Redes de datacenter — VLANs, switching, routing básico, firewall, DNS/DHCP interno', group: 'Redes', status: 'En proceso' },
          { id: 'sklsa-certs', name: 'PKI operativa — certificados TLS, expiración, renovación, troubleshooting de handshake', group: 'Redes', status: 'Por aprender' },
          // Storage & Backup
          { id: 'sklsa-storage', name: 'Storage — RAID niveles, LVM, NFS/SMB, capacidad y crecimiento', group: 'Storage & Backup', status: 'En proceso' },
          { id: 'sklsa-backup', name: 'Backups — regla 3-2-1, RPO/RTO, verificación de restore, retención', group: 'Storage & Backup', status: 'En proceso', notes: 'Un backup no verificado no es un backup.' },
          // Virtualización & Cloud
          { id: 'sklsa-vm', name: 'Virtualización — vSphere/Proxmox/Hyper-V, snapshots, recursos, datastores', group: 'Virtualización & Cloud', status: 'En proceso' },
          { id: 'sklsa-containers', name: 'Contenedores — Docker run/compose, volúmenes, redes, logs', group: 'Virtualización & Cloud', status: 'Por aprender' },
          { id: 'sklsa-cloud', name: 'Cloud básico — IaaS (VMs, discos, redes virtuales), IAM de cloud, costos', group: 'Virtualización & Cloud', status: 'Por aprender' },
          // Monitoreo & ITSM
          { id: 'sklsa-monitor', name: 'Monitoreo — Zabbix/Grafana/Prometheus, umbrales, alertas accionables', group: 'Monitoreo & ITSM', status: 'En proceso' },
          { id: 'sklsa-itsm', name: 'Gestión de cambios e incidentes — ventana, plan, rollback, postmortems sin culpa', group: 'Monitoreo & ITSM', status: 'En proceso' },
          { id: 'sklsa-autom', name: 'Automatización — Ansible básico, tareas programadas (cron/tareas programadas)', group: 'Monitoreo & ITSM', status: 'Por aprender' },
          // Blandas
          { id: 'sklsa-doc', name: 'Documentación operativa — runbooks, diagramas, inventario CMDB', group: 'Blandas', status: 'En proceso' },
          { id: 'sklsa-guardia', name: 'Guardia (on-call) — priorización bajo presión, comunicación de estado, escalado', group: 'Blandas', status: 'En proceso' },
        ],
        tools: [
          { id: 'ptsa-linux', name: 'Linux (RHEL/Debian) — línea de comando', level: 'Intermedio', notes: 'systemd, journalctl, LVM, rpm/deb, ssh.' },
          { id: 'ptsa-winsrv', name: 'Windows Server / Hyper-V', level: 'Intermedio' },
          { id: 'ptsa-powershell', name: 'PowerShell', level: 'Básico' },
          { id: 'ptsa-bash', name: 'Bash / scripting Linux', level: 'Intermedio' },
          { id: 'ptsa-vmware', name: 'VMware vSphere / Proxmox', level: 'Intermedio' },
          { id: 'ptsa-zabbix', name: 'Zabbix / Grafana / Prometheus', level: 'Básico' },
          { id: 'ptsa-ansible', name: 'Ansible / Terraform', level: 'Básico' },
          { id: 'ptsa-itsmops', name: 'ServiceNow / Jira (tickets de ops)', level: 'Intermedio' },
        ],
        experience: [],
        education: [],
        certifications: [
          { id: 'certsa-lpi', name: 'Linux Essentials / LPIC-1', issuer: 'LPI', status: 'En proceso', notes: 'La certificación de entrada Linux con sello verificable.' },
          { id: 'certsa-rhcsa', name: 'RHCSA', issuer: 'Red Hat', status: 'Por aprender', notes: 'El estándar de oro del SysAdmin Linux — objetivo del primer año.' },
          { id: 'certsa-azure900', name: 'Azure Fundamentals (AZ-900)', issuer: 'Microsoft', status: 'Por aprender', notes: 'Puerta de entrada a la nube para perfil on-prem.' },
        ],
        languages: [
          { id: 'lang-es-sa', name: 'Español', level: 'Nativo' },
          { id: 'lang-en-sa', name: 'Inglés', level: 'B2+' },
        ],
        projects: [
          { id: 'prjsa-guardia', name: 'Proyecto Final VaultNotes — "semana de guardia" en Infraestructura de Nexora S.A. (simulado)', description: '30 tickets de guardia de punta a punta (Linux, Windows Server, redes, storage/VM, cambios y monitoreo) con modo estudio, evidencia de cada cierre y postmortem final. Práctica deliberada del rol con foco en el puente hacia SRE.' },
          { id: 'prjsa-vaultnotes', name: 'VaultNotes — segundo cerebro de estudio (PWA local-first)', description: 'Glosario, roadmap, labs y herramientas offline — ahora con especialización SysAdmin/Infra y transición a SRE.' },
        ],
        atsKeywords: [
          'SysAdmin', 'Systems Administrator', 'System Administrator', 'Junior SysAdmin', 'Infrastructure',
          'IT Operations', 'IT Ops', 'NOC', 'Site Reliability', 'SRE', 'Linux', 'RHEL', 'Debian', 'Ubuntu',
          'Windows Server', 'Hyper-V', 'Active Directory', 'DNS', 'DHCP', 'Firewall', 'VLAN', 'TCP/IP',
          'systemd', 'journalctl', 'LVM', 'RAID', 'Bash', 'Shell Scripting', 'PowerShell', 'VMware',
          'vSphere', 'Proxmox', 'Virtualization', 'Docker', 'Kubernetes', 'Cloud', 'Ansible', 'Terraform',
          'Zabbix', 'Grafana', 'Prometheus', 'Monitoring', 'Observability', 'Backup', 'Disaster Recovery',
          '3-2-1', 'RPO', 'RTO', 'Incident Management', 'Change Management', 'On-call', 'Troubleshooting',
          'Capacity Planning', 'Patch Management', 'Hardening', 'Cron', 'NFS', 'SMB', 'LPIC-1', 'RHCSA',
        ],
        jobSearchNotes:
          'Títulos objetivo: Junior SysAdmin / IT Infrastructure Analyst / NOC Analyst (ver lista). ' +
          'Palabras clave probadas: "sysadmin junior", "administrador de sistemas", "infraestructura", ' +
          '"operaciones TI", "soporte de servidores". Portales: LinkedIn, Computrabajo, Indeed, ' +
          'empresa-empresa. Diferenciadores: la semana de guardia simulada (prepárala para contar en ' +
          'entrevistas), el dominio dual Linux+Windows y la narrativa de transición SysAdmin → SRE. Este ' +
          'perfil COEXISTE con el Perfil IAM y el Perfil HelpDesk: activa uno u otro según la vacante ' +
          '(el contenido de todos se conserva).',
        createdAt: nowSa,
        updatedAt: nowSa,
      };
      await db.profile.put(seedProfileSa);
    }
  } catch (err) {
    console.warn('SysAdmin profile seed skipped:', err);
  }
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