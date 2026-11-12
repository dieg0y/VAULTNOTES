import Dexie, { type Table } from 'dexie';
import { Note, GlossaryTerm, StoredImage, StoredPdf, Lab, PlatformItem, CategoryItem, ToolItem, FlashcardStat, StoredFileHandle, ReferenceItem, ProfileDoc, RoadmapItem, HelpDeskTicket, SysAdminTicket, SocTicket, IamTicket } from '../types';
import { GLOSSARY_SEED_TERMS } from '../data/glossarySeed';
import { ROADMAP_ALL_ITEM_IDS } from '../data/roadmapData';
import { ROADMAP_HD_ALL_ITEM_IDS } from '../data/roadmapHelpDeskData';
import { HELPDESK_TICKET_SEEDS } from '../data/helpDeskTickets';
import { SYSADMIN_TICKET_SEEDS } from '../data/sysadminTickets';
import { SOC_TICKET_SEEDS } from '../data/socTickets';
import { IAM_TICKET_SEEDS } from '../data/iamTickets';
import { ROADMAP_SA_ALL_ITEM_IDS } from '../data/roadmapSysAdminData';
import { ROADMAP_SOC_ALL_ITEM_IDS } from '../data/roadmapSocData';
import { IAM_SEED_PROFILE, HELPDESK_SEED_PROFILE, SYSADMIN_SEED_PROFILE } from '../data/profileSeeds';

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
  //  · `iamTickets` — tickets SIMULADOS del Pilar 1 IAM (dataset
  //    data/iamTickets.ts, Nexora S.A. — Identity & Access Management:
  //    JML, Access, PAM, Gobernanza, Infra IAM) que el usuario trabaja
  //    como práctica. V11: mismo contrato que helpdesk/sysadmin/soc.
  iamTickets!: Table<IamTicket, string>;
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
    // al hacer upgrade; ningún dato existente se toca.
    // NOTA DE AUDITORÍA (2026-10): esta tabla y su store fueron RETIRADOS en
    // v25 junto con toda la feature Data & Intel (ver la migración v25 abajo
    // y el comentario de zipBackup 3.11.0). La declaración v16 debe
    // conservarse para que los upgrades v1→v25 sigan encadenando; los backups
    // ≤3.10.0 que traigan intelItems.json lo reportan como legacy ignorado.
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
    // v22: SOC + LABS VACÍO — migración ADITIVA + cleanup dirigido:
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
      .upgrade(async (tx) => {
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
        // BUG FIX (R1): usar el `db` GLOBAL dentro de .upgrade() es inseguro
        // en Dexie — la base está mid-open y la transacción implícita puede
        // deadlockear/fallar en silencio (el catch se lo tragaba). Se usa
        // tx.table('labs'), la transacción de upgrade que Dexie ya provee.
        try {
          await tx.table('labs').bulkDelete(SEEDED_LAB_IDS);
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
    // v25 (3.11.0 — retirada de Data & Intel): la feature Data & Intel y la
    // capa de threat intel online (providers, sync MITRE/Sigma/KEV, CVEs
    // guardados, dataset de IoCs/eventos/reglas) se ELIMINÓ por completo.
    // Dexie borra cada object store declarándolo como `null` (mismo patrón
    // delta-only de v15 `videos: null` y v20 `reviewItems: null`). El resto
    // de tablas NO se toca: notas, labs, glosario, referencias, roadmaps,
    // tickets, perfil, inbox… quedan intactos. Los backups ≤3.10.0 que
    // traigan estos 9 .json se ignoran con gracia en la importación
    // (zipBackup 3.11.0 es file-by-file).
    this.version(25).stores({ tiCache: null, onlineActivity: null, customSigmaRules: null, savedCves: null, datasetMeta: null, intelItems: null, mitreTechniques: null, sigmaRulesSynced: null, kevCatalog: null, iamTickets: 'id, status, isDeleted, updatedAt, createdAt' });
  }
}

/** Current Dexie schema version. Used by the backup manifest so the importer
 *  can refuse cross-version restores (spec #35: "On restore: must show
 *  'Incompatible backup version' NOT partial import"). Bump this when
 *  bumping `this.version(N)` above.
 *  v25: se realinea con la migración v25 (retirada delta-only de las 9
 *  tablas de Data & Intel / sync online). */
export const CURRENT_SCHEMA_VERSION = 25;

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
  // v25 (auditoría de empleo) — cobertura macOS/Linux/móvil, Cloud/SaaS
  // y herramientas empresariales/monitoreo. Aditivas.
  'HelpDesk - Multiplataforma (macOS/Linux/Móvil)',
  'HelpDesk - Cloud y SaaS',
  'HelpDesk - Herramientas y Monitoreo',
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
type HdSeedDomain =
  | 'helpdeskTicket'
  | 'helpdeskLab'
  | 'helpdeskProfile'
  | 'sysadminTicket'
  | 'sysadminLab'
  | 'sysadminProfile'
  | 'socTicket'
  | 'iamTicket';

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

/** ¿Está el id descartado? Recibe el Set precargado UNA vez al inicio de
 *  doInitializeDatabase (R1): antes cada llamada re-leía y re-parseaba
 *  localStorage — hasta ~204 JSON.parse por arranque. */
function isSeedIdDismissed(dismissed: Set<string>, domain: HdSeedDomain, id: string): boolean {
  return dismissed.has(`${domain}:${id}`);
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

// --- HELPERS DE SEEDING (R1) --------------------------------------------
// Los 8 bloques de siembra de roadmaps/tickets eran idénticos salvo la
// tabla + el dataset/lista de ids + el dominio de dismissal: la lógica
// (dedupe por id + dismissal + bulkPut tolerante a restores) se consolida
// aquí UNA sola vez, con el mismo try/catch por bloque que el resto del
// init (un fallo NO aborta initializeDatabase).

/**
 * Siembra las filas de estado de un roadmap (patrón v18/v19/v21/v22):
 * ADITIVO — solo crea los ids que falten; NUNCA resetea el done/doneAt
 * del usuario (el progreso sobrevive updates y reinstalaciones).
 */
async function seedRoadmap(
  table: Table<RoadmapItem, string>,
  allIds: string[],
  label: string
): Promise<void> {
  try {
    const existing = await table.toArray();
    const existingIds = new Set(existing.map((r) => r.id));
    const missing = allIds.filter((id) => !existingIds.has(id));
    if (missing.length > 0) {
      const now = new Date().toISOString();
      await table.bulkPut(missing.map((id) => ({ id, done: false, updatedAt: now })));
    }
  } catch (err) {
    console.warn(`${label} seed skipped:`, err);
  }
}

/** Campos operacionales que toda fila de ticket lleva y todo seed omite. */
interface TicketRow {
  id: string;
  status: string;
  statusNote?: string;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Un seed de ticket = la fila de la tabla SIN los campos operacionales
 *  (los datasets data/*Tickets.ts no traen status/fechas/borrado). */
type TicketSeedOf<T> = Omit<
  T,
  'status' | 'statusNote' | 'isDeleted' | 'deletedAt' | 'createdAt' | 'updatedAt'
>;

/**
 * Siembra un dataset de tickets simulados (patrón v19/v21/v23/v25):
 * ADITIVO por id — las filas que ya existan (incluidas soft-deleted — la
 * fila sigue viva) NO se tocan, así el trabajo del usuario
 * (status/statusNote) sobrevive; los ids en el dismissal set (borrado
 * definitivo) no se reviven. bulkPut (no bulkAdd): tolera restores que ya
 * trajeran ids seed sin lanzar BulkError.
 */
async function seedTickets<T extends TicketRow>(
  table: Table<T, string>,
  seeds: TicketSeedOf<T>[],
  domain: HdSeedDomain,
  dismissed: Set<string>,
  label: string
): Promise<void> {
  try {
    const existing = await table.toArray();
    const existingIds = new Set(existing.map((t) => t.id));
    const missing = seeds.filter(
      (t) => !existingIds.has(t.id) && !isSeedIdDismissed(dismissed, domain, t.id)
    );
    if (missing.length > 0) {
      const now = new Date().toISOString();
      await table.bulkPut(
        // Cast acotado a UN punto: el seed ES la fila sin los 6 campos
        // operacionales (ver TicketSeedOf) y el spread los añade con
        // valores de fábrica.
        missing.map((t) => ({
          ...t,
          status: 'nuevo',
          statusNote: undefined,
          isDeleted: false,
          deletedAt: undefined,
          createdAt: now,
          updatedAt: now,
        })) as T[]
      );
    }
  } catch (err) {
    console.warn(`${label} seed skipped:`, err);
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
  // R1 (hoist): el dismissal set de seeds se lee de localStorage UNA sola
  // vez por arranque y se pasa a los seeds — antes cada isSeedIdDismissed
  // volvía a leer + JSON.parsear (hasta ~204 parses por boot). Las
  // escrituras (dismissSeedId) solo ocurren en interacción del usuario,
  // DESPUÉS de que init termina, así que el snapshot no puede quedar
  // obsoleto a mitad de siembra.
  const dismissedSeedIds = loadDismissedSeedIds();

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

  // --- v25 (3.11.0): one-time cleanup of the retired Data & Intel feature ---
  // The whole online layer (4 threat-intel providers + dataset sync + saved
  // CVEs + the IoC/event/rule dataset) was removed. Its Dexie table set was
  // dropped by schema v25; the API keys lived in a SEPARATE Dexie database
  // (VaultIntelDB) which is now orphaned — delete it once, guarded by a
  // localStorage flag, plus the two orphaned localStorage prefs of the
  // removed enrichment flow. Intentionally NOT touched:
  //  · 'vaultnotes-ioc-whitelist' — IoC Extractor whitelist (feature SURVIVES).
  //  · 'vaultnotes-enrich-consent-v1' — HelpDesk [Enrich Online] (SURVIVES).
  try {
    if (!localStorage.getItem('vn-intel-retired-v11')) {
      if (typeof indexedDB !== 'undefined' && typeof indexedDB.deleteDatabase === 'function') {
        indexedDB.deleteDatabase('VaultIntelDB');
      }
      localStorage.removeItem('vaultnotes-online-enrichment-consent-v1');
      localStorage.removeItem('vaultnotes-ti-cache-ttl');
      localStorage.setItem('vn-intel-retired-v11', '1');
    }
  } catch (err) {
    console.warn('Intel retirement cleanup skipped:', err);
  }

  // --- Data migration: lab.commands was a plain string, now a string[] ---
  // Splits legacy multi-line strings into individual command entries.
  // R1: guardado con try/catch (antes, un fallo aquí abortaba TODO
  // initializeDatabase) y UN bulkPut en lugar de N updates fila a fila
  // (patrón AUDIT VN-A-005) — mismos campos: solo cambia `commands` y el
  // updatedAt de la fila se conserva tal cual (igual que el update).
  try {
    const allLabsForMigration = await db.labs.toArray();
    const migratedLabs: Lab[] = [];
    for (const lab of allLabsForMigration) {
      const raw = lab.commands as unknown;
      if (typeof raw === 'string') {
        const cmdList = raw
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        migratedLabs.push({ ...lab, commands: cmdList });
      } else if (!Array.isArray(raw)) {
        migratedLabs.push({ ...lab, commands: [] });
      }
    }
    if (migratedLabs.length > 0) await db.labs.bulkPut(migratedLabs);
  } catch (err) {
    console.warn('Lab commands migration skipped:', err);
  }

  // Seed / Sync Platforms (R1: guardado — un fallo no aborta el init)
  try {
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
  } catch (err) {
    console.warn('Platforms seed skipped:', err);
  }

  // Seed Tools (R1: guardado — un fallo no aborta el init)
  try {
    const toolsCount = await db.tools.count();
    if (toolsCount === 0) {
      const toolItems: ToolItem[] = INITIAL_TOOLS_LIST.map((name, i) => ({
        id: `tool-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}`,
        name,
        createdAt: new Date(Date.now() - 86400000 * (20 - i)).toISOString()
      }));
      await db.tools.bulkAdd(toolItems);
    }
  } catch (err) {
    console.warn('Tools seed skipped:', err);
  }

  // --- Category master list migration --- (R1: guardado — un fallo no
  // aborta el init, igual que el resto de bloques de siembra)
  try {
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
  } catch (err) {
    console.warn('Categories migration skipped:', err);
  }

  // --- GLOSARIO SEMBRADO (v18+): los términos curados de data/glossarySeed*.ts
  // (base 180 + ampliación IAM 193 + HelpDesk 257 [v25: +38 multiplataforma/
  // cloud/herramientas] + SysAdmin 131 + IAM vendors 77 + auditoría 62) ya
  // vienen DE FÁBRICA — sin importar nada.
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
  // data/roadmapData.ts (tabla propia del roadmap IAM — ver seedRoadmap).
  await seedRoadmap(db.roadmapItems, ROADMAP_ALL_ITEM_IDS, 'Roadmap');

  // --- HELPDESK (v19) · ROADMAP: data/roadmapHelpDeskData.ts (ids
  // 'rmhd-*') en su PROPIA tabla — el progreso HelpDesk y el IAM son
  // completamente independientes (ver seedRoadmap).
  await seedRoadmap(db.roadmapHelpDeskItems, ROADMAP_HD_ALL_ITEM_IDS, 'HelpDesk roadmap');

  // --- HELPDESK (v19) · TICKETS: dataset de práctica de Nexora S.A.
  // (data/helpDeskTickets.ts, seeds 'hdt-*') — lógica en seedTickets.
  await seedTickets(
    db.helpdeskTickets,
    HELPDESK_TICKET_SEEDS,
    'helpdeskTicket',
    dismissedSeedIds,
    'HelpDesk tickets'
  );

  // --- SYSADMIN (v21) · ROADMAP: data/roadmapSysAdminData.ts (ids
  // 'rmsa-*') en su PROPIA tabla — el progreso SysAdmin, HelpDesk e IAM
  // son completamente independientes (ver seedRoadmap).
  await seedRoadmap(db.roadmapSysAdminItems, ROADMAP_SA_ALL_ITEM_IDS, 'SysAdmin roadmap');

  // --- SOC (v9) · ROADMAP: data/roadmapSocData.ts (ids 'rmsoc-*') en su
  // PROPIA tabla — el progreso SOC, SysAdmin, HelpDesk e IAM son
  // completamente independientes (ver seedRoadmap).
  await seedRoadmap(db.roadmapSocItems, ROADMAP_SOC_ALL_ITEM_IDS, 'SOC roadmap');

  // --- SYSADMIN (v21) · TICKETS: dataset de práctica de Nexora S.A. —
  // Infraestructura & Operaciones (data/sysadminTickets.ts, seeds 'sa-*')
  // — lógica en seedTickets.
  await seedTickets(
    db.sysadminTickets,
    SYSADMIN_TICKET_SEEDS,
    'sysadminTicket',
    dismissedSeedIds,
    'SysAdmin tickets'
  );

  // --- SOC (v9 · SIMULADOR) · CASOS: dataset de práctica de Nexora S.A.
  // — SOC / Blue Team (data/socTickets.ts, seeds 'soc-*') — lógica en
  // seedTickets.
  await seedTickets(
    db.socTickets,
    SOC_TICKET_SEEDS,
    'socTicket',
    dismissedSeedIds,
    'SOC tickets'
  );

  // --- IAM (V11 · PILAR 1) · TICKETS: dataset de práctica de Nexora S.A.
  // — Identity & Access Management (data/iamTickets.ts, seeds 'iam-*':
  // cola general + proyecto final "Semana de Access Review") — lógica en
  // seedTickets.
  await seedTickets(
    db.iamTickets,
    IAM_TICKET_SEEDS,
    'iamTicket',
    dismissedSeedIds,
    'IAM tickets'
  );

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
      // R1: el CV completo vive en data/profileSeeds.ts — aquí solo la
      // guarda (tabla vacía) y el estampado de fechas.
      await db.profile.put({ ...IAM_SEED_PROFILE, createdAt: now, updatedAt: now });
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
    if (!hasHdProfile && !isSeedIdDismissed(dismissedSeedIds, 'helpdeskProfile', 'profile-helpdesk-l1')) {
      const nowHd = new Date().toISOString();
      // R1: el CV completo vive en data/profileSeeds.ts — aquí solo la
      // guarda (fila inexistente + no descartada) y el estampado de fechas.
      await db.profile.put({ ...HELPDESK_SEED_PROFILE, createdAt: nowHd, updatedAt: nowHd });
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
    if (!hasSaProfile && !isSeedIdDismissed(dismissedSeedIds, 'sysadminProfile', 'profile-sysadmin-jr')) {
      const nowSa = new Date().toISOString();
      // R1: el CV completo vive en data/profileSeeds.ts — aquí solo la
      // guarda (fila inexistente + no descartada) y el estampado de fechas.
      await db.profile.put({ ...SYSADMIN_SEED_PROFILE, createdAt: nowSa, updatedAt: nowSa });
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