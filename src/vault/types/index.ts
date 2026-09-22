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
  /** v18: incoming profile rows (profiles.json) skipped because the local
   * row is newer (updatedAt) — same non-destructive conflict guard. */
  conflictProfiles: number;
  /** v18: incoming roadmap items (roadmap.json) skipped because the local
   * row is newer (updatedAt) — preserves local progress. */
  conflictRoadmapItems: number;
  /** v19: incoming helpdeskTickets rows (helpdeskTickets.json) skipped
   * because the local row is newer (updatedAt) — preserves the user's
   * ticket practice work (status + notas de cierre). */
  conflictHelpdeskTickets: number;
  /** v19: incoming roadmapHelpDeskItems rows (roadmapHelpDesk.json) skipped
   * because the local row is newer (updatedAt). */
  conflictRoadmapHdItems: number;
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

/* ------------------------------------------------------------------ */
/* PERFIL PROFESIONAL (v17) — documento único para armar el CV.        */
/*                                                                     */
/* El usuario mantiene aquí TODO lo que un CV/reclutador necesita      */
/* (skills, tools, experiencia, certs, idiomas, títulos objetivo...)  */
/* y lo exporta como un único Markdown "AI-ready": se pega a una IA   */
/* para que genere el CV perfecto. Vive en la tabla `profile` de la    */
/* misma Dexie DB → viaja en los backups ZIP como profile.json.        */
/* ------------------------------------------------------------------ */

export type SkillStatus = 'Dominado' | 'En proceso' | 'Por aprender';

export interface ProfileSkill {
  id: string;
  name: string;
  /** Agrupador: 'Core IAM' | 'Procesos IAM' | 'Herramientas' | 'Técnico' | 'Blandas' | libre. */
  group: string;
  /** Estado de dominio — clave para que la IA sepa qué destacar y qué omitir. */
  status: SkillStatus;
  notes?: string;
}

export interface ProfileTool {
  id: string;
  name: string;
  /** 'Avanzado' | 'Intermedio' | 'Básico' | 'En proceso' | libre. */
  level: string;
  notes?: string;
}

export interface ProfileExperience {
  id: string;
  role: string;
  company: string;
  /** 'Empleo' | 'Prácticas' | 'Proyecto' | 'Freelance' | libre. */
  type?: string;
  location?: string;
  /** YYYY-MM (texto libre aceptado). */
  startDate?: string;
  endDate?: string;
  /** true = "Actualidad". */
  isCurrent: boolean;
  /** Logros / responsabilidades — una línea por bullet. */
  bullets: string[];
}

export interface ProfileEducation {
  id: string;
  title: string;
  institution: string;
  /** 'Completado' | 'En curso' | libre. */
  status: string;
  years?: string;
  notes?: string;
}

export interface ProfileCertification {
  id: string;
  name: string;
  issuer: string;
  /** 'Obtenida' | 'En proceso' | 'Planificada'. */
  status: string;
  /** Fecha obtenida u objetivo (texto libre). */
  date?: string;
  notes?: string;
}

export interface ProfileLanguage {
  id: string;
  name: string;
  /** 'Nativo' | 'C2' | 'C1' | 'B2+' | 'B2' | libre. */
  level: string;
}

export interface ProfileProject {
  id: string;
  name: string;
  description?: string;
  link?: string;
}

export interface ProfileDoc {
  /** Id de la fila (multi-perfil: 'profile-main', 'profile-2', ...). */
  id: string;
  /** Nombre visible del perfil (p. ej. "CV IAM 2025", "CV SOC"). */
  name?: string;
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  /** Puestos objetivo de búsqueda (IAM Analyst, Access Management Analyst...). */
  targetRoles: string[];
  summary: string;
  skills: ProfileSkill[];
  tools: ProfileTool[];
  experience: ProfileExperience[];
  education: ProfileEducation[];
  certifications: ProfileCertification[];
  languages: ProfileLanguage[];
  projects: ProfileProject[];
  /** Palabras clave para ATS. */
  atsKeywords: string[];
  /** Notas de estrategia de búsqueda (portales, consejos, contactos). */
  jobSearchNotes: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* ROADMAP (v18) — checklist del roadmap Junior IAM / Identity        */
/* Security Analyst. El CONTENIDO (tiers/fases/textos) vive en        */
/* data/roadmapData.ts; aquí solo persiste el ESTADO (done).         */
/* ------------------------------------------------------------------ */

export interface RoadmapItem {
  /** Igual al id del ítem en data/roadmapData.ts ('rm-f1-1'...). */
  id: string;
  done: boolean;
  /** ISO — cuándo se marcó como completado. */
  doneAt?: string;
  updatedAt: string;
}

export type ActiveSection = 'dashboard' | 'notes' | 'labs' | 'glossary' | 'blog' | 'tools' | 'references' | 'trash' | 'settings' | 'inbox' | 'data-intel' | 'profile' | 'roadmap' | 'helpdesk' | 'roadmap-hd' | 'troubleshooting' | 'cheatsheet';

/* ------------------------------------------------------------------ */
/* HELPDESK (v19) — tickets simulados (CRUD) + KB (dataset estático). */
/* Los tickets se siembran desde data/helpDeskTickets.ts (dataset de */
/* estudio: empresa ficticia "Nexora S.A.") y el usuario los trabaja */
/* (triage → troubleshooting → resolución) como práctica de service  */
/* desk. La KB es contenido de solo lectura (viene de fábrica).      */
/* ------------------------------------------------------------------ */

export type HdTicketType = 'incidente' | 'solicitud';
export type HdTicketPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type HdTicketLevel = 'alta' | 'media' | 'baja';
export type HdTicketStatus = 'nuevo' | 'en_progreso' | 'resuelto' | 'cerrado' | 'escalado';

export interface HelpDeskTicket {
  /** Id estable del seed ('hdt-001'...) o generado para tickets propios. */
  id: string;
  /** Número visible del ticket ('HD-1001'...). */
  number: string;
  title: string;
  /** Categoría de la lista maestra (rama HelpDesk). */
  category: string;
  /** Subcategoría corta ('Outlook', 'Impresión', 'DNS'...). */
  subcategory?: string;
  type: HdTicketType;
  priority: HdTicketPriority;
  impact: HdTicketLevel;
  urgency: HdTicketLevel;
  /** Usuario solicitante — ficticio: 'Marta Suárez (Contabilidad)'. */
  requester: string;
  /** Lo que reporta el usuario, en sus palabras. */
  description: string;
  /** Síntomas observables/verificables. */
  symptoms: string;
  /** Datos ya recolectados (equipo, SO, IP, logs...). */
  dataAvailable?: string;
  /** Pasos esperados de diagnóstico L1 (guía de estudio). */
  troubleshooting?: string;
  /** Resolución esperada (guía de estudio). */
  resolution?: string;
  /** A quién/ cuándo escalar ('L2 - Redes', 'SOC (posible compromiso)'...). */
  escalation?: string;
  /** Id del artículo de KB relacionado ('kb-account-locked'). */
  kbRef?: string;
  /** Habilidad práctica que entrena el ticket. */
  skill?: string;
  /** Evidencia sugerida a registrar. */
  evidence?: string;
  /** Estado de trabajo del usuario. */
  status: HdTicketStatus;
  /** Nota de cierre/resolución escrita por el usuario. */
  statusNote?: string;
  /** True = forma parte del proyecto final (30 tickets "primera semana"). */
  isFinalProject?: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Paso de un artículo de la KB HelpDesk. */
export interface HelpDeskKbStep {
  title: string;
  detail?: string;
  /** Comando educativo (PowerShell/CMD) — texto plano. */
  command?: string;
}

/** Artículo de la base de conocimiento HelpDesk (dataset estático). */
export interface HelpDeskKbArticle {
  id: string;
  title: string;
  category: string;
  /** Cuándo aplica el artículo (síntomas). */
  symptoms: string;
  /** Causa(s) típica(s). */
  cause: string;
  steps: HelpDeskKbStep[];
  /** Cómo confirmar que quedó resuelto. */
  verification?: string;
  escalation?: string;
  /** Nombres de términos del glosario relacionados. */
  relatedTerms?: string[];
  /** Ids de tickets del dataset que lo referencian (auto-calculado). */
  relatedTickets?: string[];
}
