/**
 * glossarySeed — seed completo del Glosario (auditoría v2).
 * Capas: base (180, curada: sin relleno ni duplicados) + ampliación IAM
 * (glossarySeedMore.ts, 193) + especialización HelpDesk
 * (glossarySeedHelpDesk.ts, 257 términos L1/L2 depurados — v25 incluye
 * macOS/Linux/móvil, Cloud/SaaS y Herramientas/Monitoreo) +
 * especialización SysAdmin (glossarySeedSysAdmin.ts, 131, Infra & Ops) +
 * capa de plataformas y vendors IAM/PAM (glossarySeedIam.ts, 77: Okta,
 * SailPoint, Ping, ForgeRock, IBM, Oracle, CyberArk, One Identity,
 * Keycloak, protocolos, directory services, gobernanza y ataques a
 * identidad) + capa de auditoría (glossarySeedAdditions.ts, 62: herramientas
 * de las plataformas IAM, malware, ataques web, detección, gestión de
 * vulnerabilidades, threat intel y hardware de servidores).
 * El orden base es A-Z; los extra van al final y el seeding dedupea por
 * nombre normalizado, así que el orden no afecta.
 */
import { GLOSSARY_SEED_BASE_TERMS, type SeedTerm } from './glossarySeedBase';
import { GLOSSARY_SEED_MORE_TERMS } from './glossarySeedMore';
import { GLOSSARY_SEED_HELPDESK_TERMS } from './glossarySeedHelpDesk';
import { GLOSSARY_SEED_SYSADMIN_TERMS } from './glossarySeedSysAdmin';
import { GLOSSARY_SEED_IAM_TERMS } from './glossarySeedIam';
import { GLOSSARY_SEED_ADDITIONS_TERMS } from './glossarySeedAdditions';

/** Seed completo del glosario (base + ampliación + HelpDesk + SysAdmin + IAM vendors + auditoría v2). */
export const GLOSSARY_SEED_TERMS: SeedTerm[] = [
  ...GLOSSARY_SEED_BASE_TERMS,
  ...GLOSSARY_SEED_MORE_TERMS,
  ...GLOSSARY_SEED_HELPDESK_TERMS,
  ...GLOSSARY_SEED_SYSADMIN_TERMS,
  ...GLOSSARY_SEED_IAM_TERMS,
  ...GLOSSARY_SEED_ADDITIONS_TERMS,
];
