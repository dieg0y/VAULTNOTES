/**
 * glossarySeed — seed completo del Glosario: base (194) + ampliación IAM
 * (glossarySeedMore.ts) + especialización HelpDesk
 * (glossarySeedHelpDesk.ts, 250 términos L1/L2) + especialización SysAdmin
 * (glossarySeedSysAdmin.ts, Infra & Ops) + capa de plataformas y vendors
 * IAM/PAM (glossarySeedIam.ts, 77 términos: Okta, SailPoint, Ping, ForgeRock,
 * IBM, Oracle, CyberArk, One Identity, Keycloak, protocolos, directory
 * services, gobernanza y ataques a identidad).
 * El orden base es A-Z; los extra van al final y el seeding dedupea por
 * nombre normalizado, así que el orden no afecta.
 */
import { GLOSSARY_SEED_BASE_TERMS, type SeedTerm } from './glossarySeedBase';
import { GLOSSARY_SEED_MORE_TERMS } from './glossarySeedMore';
import { GLOSSARY_SEED_HELPDESK_TERMS } from './glossarySeedHelpDesk';
import { GLOSSARY_SEED_SYSADMIN_TERMS } from './glossarySeedSysAdmin';
import { GLOSSARY_SEED_IAM_TERMS } from './glossarySeedIam';

/** Seed completo del glosario (base + ampliación + HelpDesk + SysAdmin + IAM vendors). */
export const GLOSSARY_SEED_TERMS: SeedTerm[] = [
  ...GLOSSARY_SEED_BASE_TERMS,
  ...GLOSSARY_SEED_MORE_TERMS,
  ...GLOSSARY_SEED_HELPDESK_TERMS,
  ...GLOSSARY_SEED_SYSADMIN_TERMS,
  ...GLOSSARY_SEED_IAM_TERMS,
];
