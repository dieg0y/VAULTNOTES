/**
 * mergeHelpdeskData.mjs — FASE 1 HelpDesk: valida, deduplica y compila los
 * datasets JSON staged (/tmp/hd/*.json) a módulos TS tipados bajo
 * src/vault/data/. Se ejecuta con `bun scripts/mergeHelpdeskData.mjs`.
 *
 * Qué valida (falla con exit != 0 en cualquier error):
 *  · Glosario: campos requeridos no vacíos, id único con prefijo seed-hd-,
 *    categoría permitida, y DEDUP por nombre normalizado contra los 389
 *    términos existentes (glossarySeedBase + glossarySeedMore) + entre
 *    partes (los duplicados se descartan con log, no se rompe el merge).
 *  · Tickets: 48 tickets, ids hdt-NNN secuenciales, numbers HD-1NNN,
 *    enums correctos, categorías permitidas, exactamente 30
 *    isFinalProject, y todo kbRef existente en la KB.
 *  · KB: 28 artículos, ids kb-*, mínimo 3 pasos por artículo, relatedTerms
 *    que existan de verdad en el glosario existente (los que no, se
 *    descartan con warning), relatedTickets auto-calculado desde tickets.
 *
 * Outputs (GENERATED — no editar a mano):
 *  · src/vault/data/glossarySeedHelpDesk.ts
 *  · src/vault/data/helpDeskTickets.ts
 *  · src/vault/data/helpDeskKB.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = `${ROOT}src/vault/data`;
const STAGE = '/tmp/hd';

const HD_CATEGORIES = new Set([
  'HelpDesk - Fundamentos IT',
  'HelpDesk - Service Desk / ITSM',
  'HelpDesk - Windows / Endpoint',
  'HelpDesk - Redes (Networking)',
  'HelpDesk - Microsoft 365',
  'HelpDesk - AD / Identidad',
  'HelpDesk - Seguridad para Soporte',
]);

const norm = (s) =>
  String(s).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

/* Recorte editorial (quality gate "no filler"): 18 términos marginales/
 * solapados excluidos del dataset final para mantener ~250 con calidad.
 * Un id aquí NO entra al merge (re-ejecutar el script lo mantiene). */
const SKIP_TERM_IDS = new Set([
  'seed-hd-escaner',
  'seed-hd-webcam',
  'seed-hd-auriculares-deck-conferencia',
  'seed-hd-ram-vs-almacenamiento',
  'seed-hd-pulgadas-vs-resolucion',
  'seed-hd-multi-monitor',
  'seed-hd-tarjeta-de-red-nic',
  'seed-hd-tasa-de-refresco',
  'seed-hd-almacenamiento-lleno',
  'seed-hd-servicio-itil',
  'seed-hd-portafolio-de-servicios',
  'seed-hd-volumen-de-contactos',
  'seed-hd-plan-energia',
  'seed-hd-windows-search',
  'seed-hd-route-print',
  'seed-hd-hotspot-movil',
  'seed-hd-captive-portal',
  'seed-hd-wake-on-lan',
]);

/* ---------- 1. Existing glossary terms (source of truth: los seeds TS) --- */
const existingTerms = [
  ...readFileSync(`${SRC}/glossarySeedBase.ts`, 'utf8').matchAll(/term:\s*["']([^"']+)["']/g),
  ...readFileSync(`${SRC}/glossarySeedMore.ts`, 'utf8').matchAll(/term:\s*["']([^"']+)["']/g),
].map((m) => m[1]);
const existingNorm = new Set(existingTerms.map(norm));

/* ---------- 2. Glossary parts → merge + dedup ---------- */
const PARTS = [
  'part-a-fundamentals.json',
  'part-b-itsm.json',
  'part-c-windows.json',
  'part-d-networking.json',
  'part-e-m365-identity-security.json',
];
const glossary = [];
const seenIds = new Set();
const seenTerms = new Set();
let droppedDup = 0;
let skippedEditorial = 0;
for (const part of PARTS) {
  const data = readJson(`${STAGE}/${part}`);
  if (!Array.isArray(data)) err(`${part}: no es un array`);
  for (const t of data) {
    if (SKIP_TERM_IDS.has(t.id)) { skippedEditorial++; continue; }
    for (const f of ['id', 'term', 'category', 'shortDefinition', 'longDefinition', 'example']) {
      if (typeof t[f] !== 'string' || !t[f].trim()) err(`${part}:${t.id || '?'} campo ${f} vacío`);
    }
    if (typeof t.id === 'string' && !/^seed-hd-[a-z0-9-]+$/.test(t.id)) err(`${part}: id inválido "${t.id}"`);
    if (!HD_CATEGORIES.has(t.category)) err(`${part}:${t.id} categoría no permitida "${t.category}"`);
    if (typeof t.acronym !== 'string' && t.acronym != null) err(`${part}:${t.id} acronym inválido`);
    const key = norm(t.term);
    if (existingNorm.has(key)) { droppedDup++; continue; } // duplicado vs glosario existente
    if (seenTerms.has(key)) { warn(`dedup entre partes: "${t.term}" (${t.id})`); droppedDup++; continue; }
    if (seenIds.has(t.id)) { err(`${part}: id repetido ${t.id}`); continue; }
    seenIds.add(t.id);
    seenTerms.add(key);
    glossary.push({
      id: t.id,
      term: t.term,
      acronym: t.acronym || undefined,
      category: t.category,
      shortDefinition: t.shortDefinition,
      longDefinition: t.longDefinition,
      example: t.example,
    });
  }
}

/* ---------- 3. Tickets + KB ---------- */
const tickets = readJson(`${STAGE}/tickets.json`);
const kb = readJson(`${STAGE}/kb.json`);
const kbIds = new Set(kb.map((a) => a.id));
if (!Array.isArray(tickets) || tickets.length !== 48) err(`tickets: se esperaban 48, hay ${tickets?.length}`);
if (!Array.isArray(kb) || kb.length !== 28) err(`kb: se esperaban 28, hay ${kb?.length}`);

const PRIORITIES = new Set(['P1', 'P2', 'P3', 'P4']);
const TYPES = new Set(['incidente', 'solicitud']);
const LEVELS = new Set(['alta', 'media', 'baja']);
const ESCALATION_VOCAB = /^(L2 - Infraestructura|L2 - Redes|SOC \(posible compromiso\)|IAM \(accesos\/grupos\)|Proveedor externo \(RMA\))$/;

tickets.forEach((t, i) => {
  const tag = t.id || `ticket[${i}]`;
  if (t.id !== `hdt-${String(i + 1).padStart(3, '0')}`) err(`tickets: id no secuencial en posición ${i + 1}: "${t.id}"`);
  if (t.number !== `HD-${1001 + i}`) err(`tickets: number no secuencial en posición ${i + 1}: "${t.number}"`);
  if (!PRIORITIES.has(t.priority)) err(`${tag}: priority inválida "${t.priority}"`);
  if (!TYPES.has(t.type)) err(`${tag}: type inválido "${t.type}"`);
  if (!LEVELS.has(t.impact)) err(`${tag}: impact inválido "${t.impact}"`);
  if (!LEVELS.has(t.urgency)) err(`${tag}: urgency inválido "${t.urgency}"`);
  if (!HD_CATEGORIES.has(t.category)) err(`${tag}: categoría no permitida "${t.category}"`);
  if (t.kbRef != null && !kbIds.has(t.kbRef)) err(`${tag}: kbRef inexistente "${t.kbRef}"`);
  if (t.escalation != null && !ESCALATION_VOCAB.test(t.escalation)) err(`${tag}: escalation fuera de vocabulario "${t.escalation}"`);
  if (typeof t.requester !== 'string' || !/^.+\s\(.+\)$/.test(t.requester)) err(`${tag}: requester sin formato "Nombre (Depto)"`);
  for (const f of ['title', 'description', 'symptoms', 'dataAvailable', 'troubleshooting', 'resolution', 'skill']) {
    if (typeof t[f] !== 'string' || !t[f].trim()) err(`${tag}: campo ${f} vacío`);
  }
});
const fp = tickets.filter((t) => t.isFinalProject === true);
if (fp.length !== 30) err(`tickets: isFinalProject debe ser exactamente 30, hay ${fp.length}`);

kb.forEach((a, i) => {
  const tag = a.id || `kb[${i}]`;
  if (typeof a.id !== 'string' || !/^kb-[a-z0-9-]+$/.test(a.id)) err(`kb: id inválido "${a.id}"`);
  if (!HD_CATEGORIES.has(a.category)) err(`${tag}: categoría no permitida "${a.category}"`);
  if (!Array.isArray(a.steps) || a.steps.length < 3 || a.steps.length > 8) err(`${tag}: steps debe tener 3-8 pasos (${a.steps?.length})`);
  a.steps?.forEach((s, j) => {
    if (typeof s.title !== 'string' || !s.title.trim()) err(`${tag} paso ${j + 1}: title vacío`);
    if (s.command != null && typeof s.command !== 'string') err(`${tag} paso ${j + 1}: command inválido`);
  });
  for (const f of ['title', 'symptoms', 'cause']) {
    if (typeof a[f] !== 'string' || !a[f].trim()) err(`${tag}: campo ${f} vacío`);
  }
});
// relatedTerms: solo nombres EXACTOS del glosario existente (drop con warning)
const kbOut = kb.map((a) => {
  const relatedTerms = (a.relatedTerms || []).filter((rt) => {
    if (existingNorm.has(norm(rt))) return true;
    warn(`kb ${a.id}: relatedTerms "${rt}" no existe en el glosario — descartado`);
    return false;
  });
  return { ...a, relatedTerms };
});
// relatedTickets: inverso de kbRef
const byKb = new Map();
for (const t of tickets) {
  if (t.kbRef) {
    if (!byKb.has(t.kbRef)) byKb.set(t.kbRef, []);
    byKb.get(t.kbRef).push(t.id);
  }
}
for (const a of kbOut) a.relatedTickets = byKb.get(a.id) || [];

/* ---------- 4. Emit TS ---------- */
const clean = (o) => {
  if (Array.isArray(o)) return o.map(clean).filter((v) => v !== undefined);
  if (o && typeof o === 'object') {
    const r = {};
    for (const [k, v] of Object.entries(o)) {
      if (v === null || v === undefined || v === '') continue;
      const cv = clean(v);
      if (cv === undefined || (Array.isArray(cv) && cv.length === 0)) continue;
      r[k] = cv;
    }
    return Object.keys(r).length > 0 ? r : undefined;
  }
  return o;
};
const literal = (arr, indent = 2) =>
  arr.map((o) => JSON.stringify(clean(o), null, 2).replace(/\n/g, `\n${' '.repeat(indent)}`)).join(',\n');

if (errors.length) {
  console.error('ERRORES DE VALIDACIÓN:\n' + errors.map((e) => `  ✗ ${e}`).join('\n'));
  process.exit(1);
}

const catCount = {};
glossary.forEach((t) => { catCount[t.category] = (catCount[t.category] || 0) + 1; });

const glossaryTs = `/**
 * glossarySeedHelpDesk — GENERATED FILE (scripts/mergeHelpdeskData.mjs).
 * NO editar a mano: editar los JSON staged y re-ejecutar el merge.
 *
 * ${glossary.length} términos HelpDesk (dedup aplicado contra los
 * ${existingTerms.length} términos existentes: ${droppedDup} descartados por duplicado).
 * Distribución: ${Object.entries(catCount).map(([c, n]) => `${c}: ${n}`).join(' · ')}.
 *
 * Se siembran vía glossarySeed.ts (GLOSSARY_SEED_TERMS) con el mismo
 * mecanismo idempotente del glosario base: dedupe por nombre normalizado
 * (incluidos soft-deleted) + nombres descartados definitivamente.
 */
import { type SeedTerm } from './glossarySeedBase';

export const GLOSSARY_SEED_HELPDESK_TERMS: SeedTerm[] = [
  ${literal(glossary).trimEnd()}
];
`;
writeFileSync(`${SRC}/glossarySeedHelpDesk.ts`, glossaryTs);

const ticketsTs = `/**
 * helpDeskTickets — GENERATED FILE (scripts/mergeHelpdeskData.mjs).
 * NO editar a mano: editar /tmp/hd/tickets.json y re-ejecutar el merge.
 *
 * ${tickets.length} tickets SIMULADOS (empresa ficticia Nexora S.A. — material de
 * estudio, no datos reales). ${fp.length} forman el Proyecto Final "primera
 * semana en el service desk" (hdt-019..hdt-048). Se siembran en la tabla
 * Dexie \`helpdeskTickets\` (v19) de forma idempotente por id + dismissal.
 */
import type { HdTicketLevel, HdTicketPriority, HdTicketType } from '../types';

export interface HelpDeskTicketSeed {
  id: string;
  number: string;
  title: string;
  category: string;
  subcategory?: string;
  type: HdTicketType;
  priority: HdTicketPriority;
  impact: HdTicketLevel;
  urgency: HdTicketLevel;
  requester: string;
  description: string;
  symptoms: string;
  dataAvailable?: string;
  troubleshooting?: string;
  resolution?: string;
  escalation?: string;
  kbRef?: string;
  skill?: string;
  evidence?: string;
  isFinalProject?: boolean;
}

export const HELPDESK_TICKET_SEEDS: HelpDeskTicketSeed[] = [
  ${literal(tickets).trimEnd()}
];
`;
writeFileSync(`${SRC}/helpDeskTickets.ts`, ticketsTs);

const kbTs = `/**
 * helpDeskKB — GENERATED FILE (scripts/mergeHelpdeskData.mjs).
 * NO editar a mano: editar /tmp/hd/kb.json y re-ejecutar el merge.
 *
 * ${kbOut.length} artículos de la base de conocimiento HelpDesk (SIMULADOS —
 * empresa ficticia Nexora S.A.). Dataset ESTÁTICO de solo lectura (viene de
 * fábrica, no vive en Dexie ni en el backup). relatedTickets es
 * auto-calculado desde los kbRef del dataset de tickets.
 */
import type { HelpDeskKbArticle } from '../types';

export const HELPDESK_KB_ARTICLES: HelpDeskKbArticle[] = [
  ${literal(kbOut).trimEnd()}
];

/** Índice id → artículo (para resolver kbRef de tickets sin buscar). */
export const HELPDESK_KB_BY_ID: Map<string, HelpDeskKbArticle> = new Map(
  HELPDESK_KB_ARTICLES.map((a) => [a.id, a])
);
`;
writeFileSync(`${SRC}/helpDeskKB.ts`, kbTs);

console.log('MERGE OK');
console.log(`  glossarySeedHelpDesk.ts : ${glossary.length} términos (dedup: ${droppedDup} · recorte editorial: ${skippedEditorial})`);
console.log(`  helpDeskTickets.ts      : ${tickets.length} tickets (${fp.length} final project)`);
console.log(`  helpDeskKB.ts           : ${kbOut.length} artículos (${[...byKb.values()].reduce((a, b) => a + b.length, 0)} referencias tickets→KB)`);
if (warnings.length) {
  console.log(`WARNINGS (${warnings.length}):`);
  warnings.forEach((w) => console.log(`  ⚠ ${w}`));
}
