import Dexie, { type Table } from 'dexie';
import { Note, GlossaryTerm, StoredImage, Lab, PlatformItem, CategoryItem, ToolItem, FlashcardStat } from '../types';

export class VaultDatabase extends Dexie {
  notes!: Table<Note, string>;
  glossary!: Table<GlossaryTerm, string>;
  images!: Table<StoredImage, string>;
  labs!: Table<Lab, string>;
  platforms!: Table<PlatformItem, string>;
  categories!: Table<CategoryItem, string>;
  tools!: Table<ToolItem, string>;
  flashcardStats!: Table<FlashcardStat, string>;

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
  }
}

export const db = new VaultDatabase();

export const DEFAULT_PLATFORMS_LIST: string[] = [
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
export const MASTER_CATEGORIES_LIST: string[] = [
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

export const INITIAL_TOOLS_LIST: string[] = [
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

const INITIAL_GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: 'term-api-gateway',
    term: 'API Gateway',
    acronym: 'GW',
    shortDefinition: 'Servidor que actúa como punto de entrada frontal a microservicios, aplicando autenticación y rate limiting.',
    longDefinition: 'Un API Gateway actúa como proxy inverso centralizado para recibir todas las solicitudes API, delegar a microservicios de backend, gestionar autenticación OAuth/JWT, rate limiting, terminación SSL y políticas de seguridad.',
    examples: [
      { id: 'ex-gw-1', title: 'Ejemplo 1: Autenticación JWT en AWS API Gateway', content: '# Configuración de Authorizer Lambda\naws apigateway create-authorizer --rest-api-id abc123xyz --name JwtAuth --type TOKEN' },
      { id: 'ex-gw-2', title: 'Ejemplo 2: Rate Limiting en NGINX Gateway', content: 'limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;' }
    ],
    platform: 'AWS - IAM / Security',
    category: 'Cloud Security',
    categories: ['Cloud Security'],
    isDeleted: false,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'term-kerberos-tgt',
    term: 'Kerberos Ticket Granting',
    acronym: 'TGT',
    shortDefinition: 'Mecanismo de autenticación de red que emite tickets cifrados para acceso seguro a recursos de dominio.',
    longDefinition: 'En Active Directory / Kerberos, el KDC emite un Ticket Granting Ticket (TGT) tras la autenticación inicial.',
    examples: [
      { id: 'ex-tgt-1', title: 'Ejemplo 1: Inspección de Tickets en Windows CLI', content: 'klist' }
    ],
    platform: 'Microsoft - Entra ID / AD',
    category: 'IAM - Auth / MFA',
    categories: ['IAM - Auth / MFA', 'IAM - Access Management'],
    isDeleted: false,
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'term-zero-trust',
    term: 'Zero Trust Architecture',
    acronym: 'ZTA',
    shortDefinition: 'Modelo de seguridad basado en el principio de "nunca confiar, verificar siempre".',
    longDefinition: 'Zero Trust Architecture (ZTA) elimina la confianza implícita por ubicación de red.',
    examples: [
      { id: 'ex-zta-1', title: 'Ejemplo 1: Regla de Acceso Condicional', content: 'Condición: Dispositivo no administrado + Riesgo Alto -> Bloquear acceso.' }
    ],
    platform: 'Cisco',
    category: 'Cloud Security',
    categories: ['Cloud Security', 'IAM - Access Management'],
    isDeleted: false,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  }
];

const INITIAL_NOTES: Note[] = [
  {
    id: 'note-zero-trust-cisco',
    title: 'Implementing Zero Trust Architecture',
    parentId: null,
    platform: 'Cisco',
    category: 'Cloud Security',
    categories: ['Cloud Security', 'IAM - Access Management'],
    sourceUrl: 'https://cisco.com/docs/zta',
    isFavorite: true,
    isDeleted: false,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    contentHtml: `<h1>Zero Trust Architecture (ZTA) Principles</h1><p>Zero Trust elimina la confianza implícita y valida continuamente cada interacción.</p>`
  },
  {
    id: 'note-zero-trust-cisco-sub1',
    title: 'Cómo funciona',
    parentId: 'note-zero-trust-cisco',
    platform: '',
    category: 'Cloud Security',
    isFavorite: false,
    isDeleted: false,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    contentHtml: `<h2>Componentes Core</h2><ol><li>Verificación de Identidad</li><li>Micro-segmentación</li><li>Mínimo Privilegio</li></ol>`
  },
  {
    id: 'note-entra-id-pim',
    title: 'Microsoft Entra ID Privileged Identity Management (PIM)',
    parentId: null,
    platform: 'Microsoft - Entra ID / AD',
    category: 'IAM - PAM',
    categories: ['IAM - PAM', 'IAM - Access Management'],
    sourceUrl: 'https://learn.microsoft.com/entra/id-governance/privileged-identity-management',
    isFavorite: true,
    isDeleted: false,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    contentHtml: `<h1>Microsoft Entra ID PIM</h1><p>Role assignment JIT con aprobación y justificación.</p>`
  },
  {
    id: 'note-sentinel-hunting-kql',
    title: 'Threat Hunting with KQL in Microsoft Sentinel',
    parentId: null,
    platform: 'Microsoft - Sentinel / Defender',
    category: 'Threat Hunting',
    categories: ['Threat Hunting'],
    sourceUrl: 'https://learn.microsoft.com/azure/sentinel/hunting',
    isFavorite: false,
    isDeleted: false,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    contentHtml: `<h1>KQL Hunting Queries</h1><pre><code class="language-kql">SigninLogs | where ResultType != 0</code></pre>`
  }
];

const INITIAL_LABS: Lab[] = [
  {
    id: 'lab-phishing-case-42',
    title: 'Phishing Analysis - Case #42',
    organization: 'LetsDefend',
    topic: 'SOC Tier 1 - Triage',
    categories: ['SOC Tier 1 - Triage', 'Incident Response'],
    subtopic: 'Email Header & Domain Spoofing',
    difficulty: 'Media',
    status: 'En progreso',
    timeSpent: '45m',
    sourceLink: 'https://app.letsdefend.io/challenge/phishing-analysis-42',
    parts: [
      {
        id: 'part-1',
        title: 'Parte 1: Header Investigation & Authentication',
        isCompleted: true,
        content: `<h1>Análisis de Cabeceras EML</h1><p>SPF, DKIM y DMARC fallidos, dominio typosquatting detectado.</p>`
      },
      {
        id: 'part-2',
        title: 'Parte 2: Attachment & URL Sandbox Analysis',
        isCompleted: false,
        content: `<h2>Análisis de Enlaces Maliciosos y C2</h2><p>Payload envía credenciales en texto plano a un servidor C2 externo.</p>`
      }
    ],
    tools: ['Splunk', 'Microsoft Sentinel', 'Wireshark / Zeek / Suricata'],
    commands: [
      'grep -E -i "from:|received:|spf=" sample.eml',
      'tshark -r capture.pcap -Y "http.request"'
    ],
    findings: `Dominio Spoofing: c0rporate-domain.com\nIP Remitente: 192.168.1.105`,
    mitigation: `Bloquear IP/dominio, revocar sesiones, crear regla SIEM.`,
    isFavorite: true,
    isDeleted: false,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  }
];

export async function initializeDatabase() {
  const notesCount = await db.notes.count();
  if (notesCount === 0) {
    await db.notes.bulkAdd(INITIAL_NOTES);
  }
  const glossaryCount = await db.glossary.count();
  if (glossaryCount === 0) {
    await db.glossary.bulkAdd(INITIAL_GLOSSARY_TERMS);
  }
  const labsCount = await db.labs.count();
  if (labsCount === 0) {
    await db.labs.bulkAdd(INITIAL_LABS);
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
