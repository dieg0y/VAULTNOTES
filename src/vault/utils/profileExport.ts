import type { ProfileDoc, ProfileSkill, ProfileTool, ProfileExperience, ProfileEducation, ProfileCertification, ProfileLanguage, ProfileProject } from '../types';

/**
 * profileExport — construye el Markdown "AI-ready" del Perfil Profesional.
 *
 * El objetivo NO es un CV bonito: es un DOCUMENTO FUENTE completo y
 * estructurado que el usuario pega a una IA (ChatGPT/Claude/etc.) con la
 * instrucción "con esto, armame el CV perfecto". Por eso:
 *
 *  1. Empieza con un bloque de INSTRUCCIONES PARA LA IA (rol, tarea, reglas).
 *  2. Incluye el ESTADO REAL de cada skill (Dominado / En proceso / Por
 *     aprender) para que la IA no infle ni invente dominios.
 *  3. Separa puestos objetivo, palabras clave ATS y notas de búsqueda —
 *     son insumos de redacción, no secciones del CV final.
 *  4. Todo texto plano (sin HTML): el MD viaja por clipboard/archivo y la
 *     IA lo parsea tal cual.
 */

const ESC = (s: string | undefined | null): string =>
  (s ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();

const hasText = (s: string | undefined | null): boolean => !!s && s.trim().length > 0;

function dateRange(exp: ProfileExperience): string {
  const start = hasText(exp.startDate) ? exp.startDate : '?';
  const end = exp.isCurrent ? 'Actualidad' : hasText(exp.endDate) ? exp.endDate : '?';
  return `${start} — ${end}`;
}

function skillLine(s: ProfileSkill): string {
  const bits = [`- **${ESC(s.name)}** — ${ESC(s.status)}`];
  if (hasText(s.notes)) bits.push(` · _${ESC(s.notes)}_`);
  return bits.join('');
}

function toolLine(t: ProfileTool): string {
  const bits = [`- **${ESC(t.name)}** — ${ESC(t.level)}`];
  if (hasText(t.notes)) bits.push(` · _${ESC(t.notes)}_`);
  return bits.join('');
}

function expBlock(e: ProfileExperience): string {
  const lines: string[] = [];
  const meta: string[] = [dateRange(e)];
  if (hasText(e.type)) meta.push(ESC(e.type));
  if (hasText(e.location)) meta.push(ESC(e.location));
  lines.push(`### ${ESC(e.role) || '(Rol sin nombre)'} — ${ESC(e.company) || '(Empresa sin nombre)'}`);
  lines.push(`_${meta.join(' · ')}_`);
  if (e.bullets.filter(hasText).length > 0) {
    lines.push(...e.bullets.filter(hasText).map((b) => `- ${ESC(b)}`));
  }
  return lines.join('\n');
}

function eduBlock(ed: ProfileEducation): string {
  const meta = [ESC(ed.status), hasText(ed.years) ? ESC(ed.years) : null].filter(Boolean).join(' · ');
  const lines = [`- **${ESC(ed.title) || '(Título sin nombre)'}** — ${ESC(ed.institution) || '(Institución sin nombre)'}`];
  if (meta) lines.push(`  - ${meta}`);
  if (hasText(ed.notes)) lines.push(`  - ${ESC(ed.notes)}`);
  return lines.join('\n');
}

function certLine(c: ProfileCertification): string {
  const bits = [`- **${ESC(c.name)}** — ${ESC(c.status)}`];
  if (hasText(c.date)) bits.push(` (${ESC(c.date)})`);
  bits.push(` · Emisor: ${ESC(c.issuer) || '—'}`);
  if (hasText(c.notes)) bits.push(` · _${ESC(c.notes)}_`);
  return bits.join('');
}

function langLine(l: ProfileLanguage): string {
  return `- **${ESC(l.name)}** — ${ESC(l.level)}`;
}

function projectBlock(p: ProfileProject): string {
  const lines = [`- **${ESC(p.name) || '(Proyecto sin nombre)'}**`];
  if (hasText(p.description)) lines.push(`  - ${ESC(p.description)}`);
  if (hasText(p.link)) lines.push(`  - Link: ${ESC(p.link)}`);
  return lines.join('\n');
}

function skillsByStatus(skills: ProfileSkill[], status: ProfileSkill['status']): ProfileSkill[] {
  return skills.filter((s) => s.status === status);
}

function skillGroups(skills: ProfileSkill[]): Map<string, ProfileSkill[]> {
  const map = new Map<string, ProfileSkill[]>();
  for (const s of skills) {
    const g = s.group?.trim() || 'Otras';
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(s);
  }
  return map;
}

/**
 * Genera el Markdown completo del perfil. Puro y sin dependencias (se puede
 * llamar desde un worker/test). Ningún dato sale de lo que hay en `profile`.
 */
export function buildProfileMarkdown(profile: ProfileDoc): string {
  const exportedAt = new Date().toISOString().slice(0, 10);
  const name = hasText(profile.fullName) ? profile.fullName : '(completar nombre en Perfil Profesional)';

  const dominadas = skillsByStatus(profile.skills, 'Dominado');
  const enProceso = skillsByStatus(profile.skills, 'En proceso');
  const porAprender = skillsByStatus(profile.skills, 'Por aprender');
  const skillGroupsMap = skillGroups(profile.skills);

  const md: string[] = [];

  /* ------------------------------------------------------------------ */
  /* Encabezado + instrucciones para la IA                               */
  /* ------------------------------------------------------------------ */
  md.push(`# PERFIL PROFESIONAL — ${name}`);
  md.push('');
  md.push(`> Documento fuente generado por VaultNotes el ${exportedAt}.`);
  md.push('');
  md.push('## INSTRUCCIONES PARA LA IA (leer antes de redactar)');
  md.push('');
  md.push(
    'Eres un experto en reclutamiento técnico y redacción de CVs. Con la información de este documento, ' +
    'genera un **CV perfecto, ATS-friendly y enfocado en IAM (Identity & Access Management)** para los ' +
    'puestos objetivo listados abajo. Reglas estrictas:'
  );
  md.push('');
  md.push('1. **NO inventes datos**: experiencia, educación ni logros que no estén aquí. Si falta algo, dejalo como `[COMPLETAR: ...]`.');
  md.push('2. Prioriza las habilidades marcadas como **Dominado**; menciona las **En proceso** como en desarrollo; omite o minimiza las **Por aprender**.');
  md.push('3. Las certificaciones **En proceso** van como "in progress" (nunca como obtenidas).');
  md.push('4. Usa las palabras clave ATS de la sección correspondiente de forma natural.');
  md.push('5. Cuantifica donde el usuario dio datos; donde no, dejalo cualitativo pero concreto.');
  md.push('6. Adaptá el resumen al puesto objetivo (hay varios títulos: elegí el más cercano o generá variantes).');
  md.push('7. Ofrecé al final 3 sugerencias concretas de mejora del perfil.');
  md.push('');
  md.push('---');
  md.push('');

  /* ------------------------------------------------------------------ */
  /* 1. Datos personales                                                 */
  /* ------------------------------------------------------------------ */
  md.push('## 1. Datos personales');
  md.push('');
  md.push(`- **Nombre:** ${name}`);
  md.push(`- **Titular / headline:** ${ESC(profile.headline) || '—'}`);
  if (hasText(profile.location)) md.push(`- **Ubicación:** ${ESC(profile.location)}`);
  const contact: string[] = [];
  if (hasText(profile.email)) contact.push(`Email: ${ESC(profile.email)}`);
  if (hasText(profile.phone)) contact.push(`Teléfono: ${ESC(profile.phone)}`);
  if (hasText(profile.linkedin)) contact.push(`LinkedIn: ${ESC(profile.linkedin)}`);
  if (hasText(profile.portfolio)) contact.push(`Portafolio: ${ESC(profile.portfolio)}`);
  md.push(contact.length > 0 ? `- **Contacto:** ${contact.join(' · ')}` : '- **Contacto:** [COMPLETAR: email / LinkedIn]');
  md.push('');

  /* ------------------------------------------------------------------ */
  /* 2. Puestos objetivo                                                 */
  /* ------------------------------------------------------------------ */
  md.push('## 2. Puestos objetivo (títulos de búsqueda)');
  md.push('');
  if (profile.targetRoles.length > 0) {
    md.push(...profile.targetRoles.map((r) => `- ${ESC(r)}`));
  } else {
    md.push('- [COMPLETAR: títulos objetivo]');
  }
  md.push('');

  /* ------------------------------------------------------------------ */
  /* 3. Resumen profesional                                              */
  /* ------------------------------------------------------------------ */
  md.push('## 3. Resumen profesional (base para el perfil del CV)');
  md.push('');
  md.push(hasText(profile.summary) ? profile.summary.trim() : '[COMPLETAR: resumen profesional]');
  md.push('');

  /* ------------------------------------------------------------------ */
  /* 4. Habilidades                                                      */
  /* ------------------------------------------------------------------ */
  md.push(`## 4. Habilidades (${profile.skills.length} — con estado real de dominio)`);
  md.push('');
  if (profile.skills.length === 0) {
    md.push('[COMPLETAR: habilidades]');
  } else {
    md.push(`**Dominadas (${dominadas.length}):**`);
    md.push('');
    for (const [group, items] of skillGroupsMap) {
      const inGroup = items.filter((s) => s.status === 'Dominado');
      if (inGroup.length > 0) {
        md.push(`- _${group}_`);
        md.push(...inGroup.map((s) => `  - ${ESC(s.name)}`));
      }
    }
    md.push('');
    if (enProceso.length > 0) {
      md.push(`**En proceso (${enProceso.length}):**`);
      md.push('');
      md.push(...enProceso.map(skillLine));
      md.push('');
    }
    if (porAprender.length > 0) {
      md.push(`**Por aprender (${porAprender.length}) — roadmap, NO incluir como dominio:**`);
      md.push('');
      md.push(...porAprender.map(skillLine));
      md.push('');
    }
  }

  /* ------------------------------------------------------------------ */
  /* 5. Herramientas                                                     */
  /* ------------------------------------------------------------------ */
  md.push(`## 5. Herramientas (${profile.tools.length})`);
  md.push('');
  if (profile.tools.length === 0) {
    md.push('[COMPLETAR: herramientas]');
  } else {
    md.push(...profile.tools.map(toolLine));
  }
  md.push('');

  /* ------------------------------------------------------------------ */
  /* 6. Experiencia                                                      */
  /* ------------------------------------------------------------------ */
  md.push(`## 6. Experiencia (${profile.experience.length})`);
  md.push('');
  if (profile.experience.length === 0) {
    md.push('[COMPLETAR: experiencia — añadir empleos/prácticas/proyectos con bullets de logros]');
  } else {
    md.push(...profile.experience.map(expBlock));
  }
  md.push('');

  /* ------------------------------------------------------------------ */
  /* 7. Educación                                                        */
  /* ------------------------------------------------------------------ */
  md.push(`## 7. Educación (${profile.education.length})`);
  md.push('');
  if (profile.education.length === 0) {
    md.push('[COMPLETAR: educación — título, institución, estado, años]');
  } else {
    md.push(...profile.education.map(eduBlock));
  }
  md.push('');

  /* ------------------------------------------------------------------ */
  /* 8. Certificaciones                                                  */
  /* ------------------------------------------------------------------ */
  md.push(`## 8. Certificaciones (${profile.certifications.length})`);
  md.push('');
  if (profile.certifications.length === 0) {
    md.push('[COMPLETAR: certificaciones — p. ej. SC-300 en proceso]');
  } else {
    md.push(...profile.certifications.map(certLine));
  }
  md.push('');

  /* ------------------------------------------------------------------ */
  /* 9. Idiomas                                                          */
  /* ------------------------------------------------------------------ */
  md.push(`## 9. Idiomas (${profile.languages.length})`);
  md.push('');
  if (profile.languages.length === 0) {
    md.push('[COMPLETAR: idiomas]');
  } else {
    md.push(...profile.languages.map(langLine));
  }
  md.push('');

  /* ------------------------------------------------------------------ */
  /* 10. Proyectos                                                       */
  /* ------------------------------------------------------------------ */
  md.push(`## 10. Proyectos (${profile.projects.length})`);
  md.push('');
  if (profile.projects.length === 0) {
    md.push('[COMPLETAR: proyectos destacados — labs, herramientas propias, portfolio]');
  } else {
    md.push(...profile.projects.map(projectBlock));
  }
  md.push('');

  /* ------------------------------------------------------------------ */
  /* 11. Palabras clave ATS                                              */
  /* ------------------------------------------------------------------ */
  md.push('## 11. Palabras clave ATS (usar de forma natural en el CV)');
  md.push('');
  if (profile.atsKeywords.length > 0) {
    md.push(profile.atsKeywords.map((k) => ESC(k)).join(', '));
  } else {
    md.push('[COMPLETAR: palabras clave ATS]');
  }
  md.push('');

  /* ------------------------------------------------------------------ */
  /* 12. Notas de estrategia de búsqueda                                 */
  /* ------------------------------------------------------------------ */
  if (hasText(profile.jobSearchNotes)) {
    md.push('## 12. Notas de estrategia de búsqueda (contexto, NO sección del CV)');
    md.push('');
    md.push(profile.jobSearchNotes.trim());
    md.push('');
  }

  /* ------------------------------------------------------------------ */
  /* Footer                                                              */
  /* ------------------------------------------------------------------ */
  md.push('---');
  md.push('');
  md.push(
    `_Fuente: VaultNotes · Perfil Profesional · exportado ${exportedAt} · ` +
    `${profile.skills.length} skills · ${profile.tools.length} herramientas · ` +
    `${profile.experience.length} experiencias · ${profile.certifications.length} certificaciones._`
  );
  md.push('');

  return md.join('\n');
}

/** Nombre de archivo sugerido para la descarga. */
export function profileMarkdownFilename(profile: ProfileDoc): string {
  const base = hasText(profile.fullName)
    ? profile.fullName.trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    : 'perfil-iam';
  return `CV-Profile-${base}-${new Date().toISOString().slice(0, 10)}.md`;
}
