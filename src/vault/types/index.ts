export interface PlatformItem {
  id: string;
  name: string;
  createdAt: string;
}

export interface CategoryItem {
  id: string;
  name: string; // Tema / Especialidad - master list shared by Notes, Labs, Glossary
  createdAt: string;
}

export interface ToolItem {
  id: string;
  name: string;
  createdAt: string;
}

export interface Note {
  id: string;
  parentId: string | null; // null = top-level note (lives directly under a Platform)
  title: string;
  platform: string; // only meaningful for top-level notes (parentId === null)
  category: string; // Tema / Especialidad
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
  topic: string; // Tema / Especialidad (same master list)
  categories?: string[];
  subtopic?: string;
  difficulty: LabDifficulty;
  status: LabStatus;
  timeSpent?: string;
  sourceLink?: string;
  parts: LabPart[];
  tools: string[];
  commands: string[]; // Comandos clave como lista individual (uno por entrada)
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
}

export interface FlashcardStat {
  id: string; // same as termId (one stat row per glossary term)
  termId: string;
  knownCount: number;
  unknownCount: number;
  lastStudiedAt: string;
}

/** Persists the file handle chosen by the user for backups (File System Access API).
 *  Lets every export overwrite the exact same file — a real "Save". */
export interface StoredFileHandle {
  id: string; // 'vault-export'
  handle: FileSystemFileHandle;
}

export type ActiveSection = 'dashboard' | 'notes' | 'labs' | 'glossary' | 'trash' | 'settings';
