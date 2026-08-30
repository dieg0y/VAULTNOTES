export interface PlatformItem {
  id: string;
  name: string;
  createdAt: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  createdAt: string;
}

export interface ToolItem {
  id: string;
  name: string;
  createdAt: string;
}

export interface Note {
  id: string;
  parentId: string | null;
  title: string;
  platform: string;
  category: string;
  categories?: string[];
  contentHtml: string;
  sourceUrl?: string;
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type LabDifficulty = 'Fácil' | 'Media' | 'Difícil';
export type LabStatus = 'No iniciado' | 'En progreso' | 'Completado';

export interface LabPart {
  id: string;
  title: string;
  content: string;
  isCompleted: boolean;
}

export interface Lab {
  id: string;
  title: string;
  organization: string;
  topic: string;
  categories?: string[];
  subtopic?: string;
  difficulty: LabDifficulty;
  status: LabStatus;
  timeSpent?: string;
  sourceLink?: string;
  parts: LabPart[];
  tools: string[];
  commands: string[];
  findings: string;
  mitigation: string;
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GlossaryExample {
  id: string;
  title: string;
  content: string;
}

export interface GlossaryTerm {
  id: string;
  term: string;
  acronym?: string;
  category?: string;
  categories?: string[];
  shortDefinition?: string;
  longDefinition: string;
  example?: string;
  examples?: GlossaryExample[];
  sourceUrl?: string;
  platform?: string;
  diagramImage?: string;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredImage {
  id: string;
  noteId?: string;
  labId?: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  caption?: string;
  createdAt: string;
}

export interface StoredPdf {
  id: string;
  noteId?: string;
  labId?: string;
  name: string;
  mimeType: string;
  blob?: Blob;
  caption?: string;
  createdAt: string;
}

export interface ImportSummary {
  addedNotes: number;
  updatedNotes: number;
  skippedNotes: number;
  addedLabs: number;
  updatedLabs: number;
  skippedLabs: number;
  addedTerms: number;
  updatedTerms: number;
  skippedTerms: number;
  addedImages: number;
  addedPdfs: number;
  addedReferences: number;
  /** REGLA DE ORO (videos): videos found in a LEGACY backup that were
   *  deliberately NOT imported — they never travel in backups anymore and
   *  live only in the user's videos folder on disk. */
  ignoredLegacyVideos: number;
  /** AUDIT VN-001: number of incoming rows skipped because the local row
   *  has a more recent `updatedAt` (preserve local — non-destructive). */
  conflictNotes: number;
  conflictLabs: number;
  conflictTerms: number;
  conflictReferences: number;
  /** AUDIT VN-006: number of incoming rows rejected by Zod validation. */
  invalidNotes: number;
  invalidLabs: number;
  invalidTerms: number;
  invalidReferences: number;
  invalidImages: number;
  invalidPdfs: number;
  invalidMisc: number;
  /** AUDIT VN-B-012: incoming rows on the upsert-by-id auxiliary tables
   *  (savedCves / customSigmaRules / datasetMeta / tiCache) skipped because
   *  the local row has a more recent timestamp (updatedAt, falling back to
   *  the row's natural savedAt/retrievedAt). Preserves the user's local
   *  personalNotes / Sigma edits when importing an older backup. */
  conflictSavedCves: number;
  conflictCustomSigmaRules: number;
  conflictDatasetMeta: number;
  conflictTiCache: number;
  /** DATA & INTEL (v16): incoming intelItems rows skipped because the local
   *  row is newer (updatedAt) — same non-destructive conflict guard as the
   *  other upsert-by-id tables. */
  conflictIntelItems: number;
  /** AUDIT VN-B-013: imported blobs (images/PDFs) whose noteId/labId
   *  points at an owner that doesn't exist locally after the import. The
   *  blobs are KEPT (data preservation) but reported as orphaned. */
  orphanedImages: number;
  orphanedPdfs: number;
}

/** FSRS-inspired spaced repetition stats per glossary term. */
export interface FlashcardStat {
  id: string;
  termId: string;
  knownCount: number;
  unknownCount: number;
  lastStudiedAt: string;
  // FSRS-lite fields
  stability: number;   // days until next review
  difficulty: number;  // 1-10, higher = harder
  due: string;         // ISO date of next scheduled review
  reps: number;        // total reviews
  lapses: number;      // times marked "Again"
}

export interface StoredFileHandle {
  id: string;
  handle: FileSystemFileHandle;
}

/** Reference / external resource (links, cheatsheets, repos, tools, articles). */
export interface ReferenceItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  tags: string[];
  type: 'link' | 'cheatsheet' | 'repo' | 'tool' | 'article' | 'other';
  isFavorite: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ActiveSection = 'dashboard' | 'notes' | 'labs' | 'glossary' | 'blog' | 'tools' | 'references' | 'trash' | 'settings' | 'review' | 'inbox' | 'data-intel';
