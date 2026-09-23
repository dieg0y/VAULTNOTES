/**
 * runbooksCore.ts — modelo compartido de RUNBOOKS por pilar (V9).
 *
 * Un runbook V9 es una base de datos consultable: el problema presentado
 * como ticket real de trabajo, toda la información posible, el paso a paso
 * universal (con comandos copiables), la verificación, la evidencia y —
 * clave de V9 — la RESPUESTA EN INGLÉS lista para copiar al cliente y la
 * explicación técnica en inglés para L2/auditores.
 *
 * Reglas de contenido (NON-NEGOTIABLE):
 *  - NO inventar Event IDs, comandos, parámetros, KQL/SPL/Sigma ni rutas.
 *  - Placeholders permitidos: {{USERNAME}} {{ASSET}} {{TICKET_ID}}
 *    {{DOMAIN_CONTROLLER}} {{SOURCE_IP}} {{TIMESTAMP}} {{TENANT}}
 *    {{HOSTNAME}} {{DOMAIN}} {{GROUP}} {{GPO_NAME}}.
 *  - Idioma: campos descriptivos en es-CO; TODO lo operativo que se copia
 *    (customer response / technical explanation) en INGLÉS.
 *  - Cada runbook responde las 14 preguntas: ¿qué ticket? ¿qué reporta?
 *    ¿impacto? ¿síntomas? ¿causas? ¿qué checkear primero? ¿qué comando?
 *    ¿qué esperar? ¿qué significa? ¿qué hacer luego? ¿cómo verificar?
 *    ¿qué evidencia? ¿cuándo escalar? ¿qué decir al cliente / a L2?
 */

/** Los 3 pilares autónomos de VaultNotes. */
export type RunbookPillar = 'HELPDESK' | 'SYSADMIN' | 'SOC';

/** Un paso del procedimiento universal — con comando copiable opcional. */
export interface RunbookStep {
  /** Orden del paso (1..n) — la escalera universal se ejecuta en orden. */
  order: number;
  /** Qué hacer: una acción clara y ejecutable. */
  action: string;
  /** Comando ejecutable copiable (PowerShell / CMD / Bash / KQL / SPL).
   *  Si existe, la UI muestra botón de copiar. NO inventar parámetros. */
  command?: string;
  /** Resultado esperado al ejecutar el comando — qué debe verse. */
  expected?: string;
  /** Qué significa ese resultado / por qué este paso importa. */
  explanation?: string;
}

/** Runbook completo por pilar (modelo V9 — FASE 4 de la spec). */
export interface PillarRunbook {
  /** Id estable y único: RB-HD-001 / RB-SA-001 / RB-SOC-001… */
  id: string;
  /** Pilar dueño del runbook. */
  pillar: RunbookPillar;
  /** Título corto y accionable. */
  title: string;
  /** Categoría (etiqueta por pilar — p. ej. 'Identity', 'OS', 'Network',
   *  'M365', 'Hardware', 'AD', 'DNS', 'Detection', 'Phishing'…). */
  category: string;
  /** Cómo llega este problema como ticket real: formato + prioridad +
   *  activo. P. ej. "INC{{TICKET_ID}} - User cannot login - Account
   *  locked - P2 - {{ASSET}}". EN INGLÉS (así se copia al ticketing). */
  ticket_example: string;
  /** Qué está pasando (descripción técnica del problema, es-CO). */
  problem_description: string;
  /** Impacto de negocio si no se atiende (es-CO, concreto). */
  business_impact: string;
  /** Síntomas típicos que reporta el usuario / el alert (2-4). */
  symptoms: string[];
  /** Causas raíz probables (2-4, ordenadas por frecuencia). */
  root_causes: string[];
  /** Prerrequisitos antes de ejecutar la escalera (accesos, herramientas,
   *  ventanas — 1-3). */
  prerequisites: string[];
  /** La escalera universal ordenada (5-9 pasos, comandos reales). */
  step_by_step_universal: RunbookStep[];
  /** Bloque de comandos sueltos listos para copiar de un clic (los mismos
   *  de los pasos + extras de verificación — sin contexto). */
  commands_copyable: string[];
  /** Cómo verificar que quedó resuelto. */
  verification: string;
  /** Evidencia a recolectar para el ticket (logs, screenshots, ids). */
  evidence_to_collect: string[];
  /** Cuándo y a quién escalar (umbral claro, con destino concreto). */
  escalation: string;
  /** Respuesta al cliente EN INGLÉS, lista para copiar. {{USERNAME}} y
   *  {{TICKET_ID}} como placeholders. */
  english_customer_response_template: string;
  /** Explicación técnica EN INGLÉS para L2/auditores — qué pasó, dónde,
   *  causa raíz, remediación. Copiable. */
  english_technical_explanation: string;
  /** Keywords ES/EN para búsqueda fuzzy (6-14, con sinónimos). */
  keywords: string[];
}

