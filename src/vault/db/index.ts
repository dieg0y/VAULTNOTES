import Dexie, { type Table } from 'dexie';
import { Note, GlossaryTerm, StoredImage, Lab, PlatformItem, CategoryItem, ToolItem, FlashcardStat, StoredFileHandle } from '../types';

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
        await tx.table('notes').toCollection().modify((n: any) => {
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
  }
}

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

export async function initializeDatabase() {
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
