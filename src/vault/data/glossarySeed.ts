/**
 * glossarySeed — seed completo del Glosario: base (194) + ampliación IAM
 * (glossarySeedMore.ts). El orden base es A-Z; los extra van al final y el
 * seeding dedupea por nombre normalizado, así que el orden no afecta.
 */
import { GLOSSARY_SEED_BASE_TERMS, type SeedTerm } from './glossarySeedBase';
import { GLOSSARY_SEED_MORE_TERMS } from './glossarySeedMore';

/** Seed completo del glosario (base + ampliación). */
export const GLOSSARY_SEED_TERMS: SeedTerm[] = [...GLOSSARY_SEED_BASE_TERMS, ...GLOSSARY_SEED_MORE_TERMS];
