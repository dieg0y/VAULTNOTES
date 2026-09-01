/**
 * cvssData.ts — Dataset LOCAL de CVSS 3.1 (Common Vulnerability Scoring System).
 *
 * 100% offline. NO consulta NVD, NO llama a CVE APIs. Todas las métricas y
 * fórmulas están curadas manualmente desde el spec oficial CVSS 3.1
 * (https://www.first.org/cvss/v3.1/spec).
 *
 * CVSS 4.0 (cuando se implemente) debería vivir en un archivo separado
 * (cvss4Data.ts) y no mezclar métricas con esta versión.
 *
 * Exporta:
 *  - Tipos `CvssMetricCode`, `CvssMetricDef`, `CvssVector`
 *  - Los arrays `CVSS_3_1_METRICS` (definición completa)
 *  - El helper `getMetricValueDef(metricCode, valueCode)`
 *  - El helper `calculateCvss3_1BaseScore(vector)` — implementa la fórmula oficial
 * NO usa `export default`.
 */

/** Códigos de las 8 métricas base de CVSS 3.1. */
export type CvssMetricCode = 'AV' | 'AC' | 'PR' | 'UI' | 'S' | 'C' | 'I' | 'A';

/** Definición de un valor concreto de una métrica (e.g. AV:N). */
interface CvssMetricValueDef {
  /** Código corto — e.g. 'N' for Network. */
  code: string;
  /** Etiqueta larga — e.g. 'Network'. */
  label: string;
  /** Explicación corta — para mostrar al lado del selector. */
  description: string;
  /** Valor numérico usado en la fórmula. */
  numeric: number;
  /**
   * Para PR (Privileges Required), el valor numérico depende de S (Scope).
   * Si `scopeDependent` es true, usar `numericChanged` cuando S='C'.
   */
  scopeDependent?: boolean;
  /** Override del numeric cuando Scope = Changed. Solo para PR. */
  numericChanged?: number;
}

/** Definición de una métrica base de CVSS 3.1. */
interface CvssMetricDef {
  /** Código corto — e.g. 'AV'. */
  code: CvssMetricCode;
  /** Etiqueta larga — e.g. 'Attack Vector'. */
  label: string;
  /** Descripción de qué mide. */
  description: string;
  /** Orden de aparición en el vector string. */
  order: number;
  /** Valores posibles. */
  values: CvssMetricValueDef[];
}

/**
 * Las 8 métricas base de CVSS 3.1, en orden de aparición en el vector string.
 * Valores numéricos tomados literalmente del spec oficial (Tabla 5/6/7).
 */
export const CVSS_3_1_METRICS: CvssMetricDef[] = [
  {
    code: 'AV',
    label: 'Attack Vector',
    description: 'Indica por dónde se explota la vulnerabilidad. Network = remotamente, Physical = acceso físico.',
    order: 1,
    values: [
      { code: 'N', label: 'Network', description: 'Explotable remotamente vía red — el peor caso.', numeric: 0.85 },
      { code: 'A', label: 'Adjacent', description: 'Explotable solo desde la misma red física/lógica (Bluetooth, Wi-Fi, VLAN).', numeric: 0.62 },
      { code: 'L', label: 'Local', description: 'Requiere acceso local al sistema (no remoto, no adyacente).', numeric: 0.55 },
      { code: 'P', label: 'Physical', description: 'Requiere acceso físico al equipo (USB, consola, etc.).', numeric: 0.2 },
    ],
  },
  {
    code: 'AC',
    label: 'Attack Complexity',
    description: 'Dificultad técnica de explotación una vez superado el AV. Low = straightforward, High = condiciones especiales.',
    order: 2,
    values: [
      { code: 'L', label: 'Low', description: 'Explotación directa, sin condiciones especiales — disparo y olvido.', numeric: 0.77 },
      { code: 'H', label: 'High', description: 'Requiere condiciones especiales del objetivo (race conditions, tuning fino).', numeric: 0.44 },
    ],
  },
  {
    code: 'PR',
    label: 'Privileges Required',
    description: 'Nivel de privilegios que debe tener el atacante ANTES de explotar la vulnerabilidad. None = anónimo.',
    order: 3,
    values: [
      { code: 'N', label: 'None', description: 'No requiere autenticación previa — anónimo.', numeric: 0.85, scopeDependent: true, numericChanged: 0.85 },
      { code: 'L', label: 'Low', description: 'Requiere privilegios bajos (cualquier usuario estándar).', numeric: 0.62, scopeDependent: true, numericChanged: 0.68 },
      { code: 'H', label: 'High', description: 'Requiere privilegios altos (admin, SC admin).', numeric: 0.27, scopeDependent: true, numericChanged: 0.5 },
    ],
  },
  {
    code: 'UI',
    label: 'User Interaction',
    description: 'Si requiere que un usuario (distinto del atacante) haga algo para explotar. None = no requiere interacción.',
    order: 4,
    values: [
      { code: 'N', label: 'None', description: 'No requiere interacción del usuario — el exploit es autónomo.', numeric: 0.85 },
      { code: 'R', label: 'Required', description: 'Requiere que el usuario haga algo (click, abrir archivo, etc.).', numeric: 0.62 },
    ],
  },
  {
    code: 'S',
    label: 'Scope',
    description: 'Si la vulnerabilidad afecta solo al componente vulnerable (Unchanged) o se propaga a otros componentes (Changed).',
    order: 5,
    values: [
      { code: 'U', label: 'Unchanged', description: 'Impacto limitado al componente vulnerable.', numeric: 0 },
      { code: 'C', label: 'Changed', description: 'Impacto se propaga a otros componentes — peor caso (VM escape, etc.).', numeric: 1 },
    ],
  },
  {
    code: 'C',
    label: 'Confidentiality',
    description: 'Impacto en la confidencialidad de la información. High = divulgación total, None = sin impacto.',
    order: 6,
    values: [
      { code: 'H', label: 'High', description: 'Divulgación total de la información sensible.', numeric: 0.56 },
      { code: 'L', label: 'Low', description: 'Divulgación limitada de información no crítica.', numeric: 0.22 },
      { code: 'N', label: 'None', description: 'Sin impacto en la confidencialidad.', numeric: 0 },
    ],
  },
  {
    code: 'I',
    label: 'Integrity',
    description: 'Impacto en la integridad (los datos pueden modificarse). High = modificación total, None = sin impacto.',
    order: 7,
    values: [
      { code: 'H', label: 'High', description: 'Modificación total de los datos — el atacante puede cambiar todo.', numeric: 0.56 },
      { code: 'L', label: 'Low', description: 'Modificación limitada — el atacante puede cambiar poco.', numeric: 0.22 },
      { code: 'N', label: 'None', description: 'Sin impacto en la integridad.', numeric: 0 },
    ],
  },
  {
    code: 'A',
    label: 'Availability',
    description: 'Impacto en la disponibilidad (el sistema deja de funcionar). High = pérdida total, None = sin impacto.',
    order: 8,
    values: [
      { code: 'H', label: 'High', description: 'Pérdida total de disponibilidad — el sistema queda inoperable.', numeric: 0.56 },
      { code: 'L', label: 'Low', description: 'Pérdida limitada de disponibilidad — degradación.', numeric: 0.22 },
      { code: 'N', label: 'None', description: 'Sin impacto en la disponibilidad.', numeric: 0 },
    ],
  },
];

/** Un vector CVSS 3.1 — ej: { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'H', I: 'H', A: 'H' }. */
export type CvssVector = Partial<Record<CvssMetricCode, string>>;

/** Severidad calculada a partir del base score. */
type CvssSeverity = 'None' | 'Low' | 'Medium' | 'High' | 'Critical';

/** Resultado del cálculo. */
interface CvssCalculationResult {
  baseScore: number;
  severity: CvssSeverity;
  impact: number;
  exploitability: number;
  iscBase: number;
  /** Vector string formateado — ej: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H". */
  vectorString: string;
  /** True si todas las métricas están seteadas — false si falta alguna. */
  complete: boolean;
  /** Mensaje de error si el vector es inválido (e.g. valor inexistente). */
  error?: string;
}

/** Helper: obtener la definición de un valor concreto de una métrica. */
export function getMetricValueDef(metricCode: CvssMetricCode, valueCode: string): CvssMetricValueDef | undefined {
  const metric = CVSS_3_1_METRICS.find((m) => m.code === metricCode);
  if (!metric) return undefined;
  return metric.values.find((v) => v.code === valueCode.toUpperCase());
}

/**
 * Roundup oficial de CVSS 3.1 — NUNCA usar Math.round ni Math.ceil.
 * El algoritmo estándar: si el input*100000 % 10000 != 0, subir al siguiente 0.1.
 * Documentado en la sección 7.4 del spec.
 */
function roundUp(input: number): number {
  const intInput = Math.round(input * 100000);
  if (intInput % 10000 === 0) {
    return intInput / 100000;
  }
  return (Math.floor(intInput / 10000) + 1) / 10;
}

/** Determinar la severidad a partir del base score. */
function severityFromScore(score: number): CvssSeverity {
  if (score === 0) return 'None';
  if (score < 4) return 'Low';
  if (score < 7) return 'Medium';
  if (score < 9) return 'High';
  return 'Critical';
}

/**
 * Calcular el base score de CVSS 3.1 a partir de un vector completo.
 * Implementa la fórmula oficial documentada en:
 * https://www.first.org/cvss/v3.1/specification-formula
 *
 * Lanza error silencioso (retorna `error` en el resultado) si faltan métricas
 * o si algún valor no existe.
 */
export function calculateCvss3_1BaseScore(vector: CvssVector): CvssCalculationResult {
  // Validar que todas las métricas requeridas estén presentes.
  const required: CvssMetricCode[] = ['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A'];
  const missing = required.filter((m) => !vector[m]);
  if (missing.length > 0) {
    return {
      baseScore: 0,
      severity: 'None',
      impact: 0,
      exploitability: 0,
      iscBase: 0,
      vectorString: 'CVSS:3.1/',
      complete: false,
      error: `Faltan métricas: ${missing.join(', ')}`,
    };
  }

  // Resolver los valores numéricos.
  const av = getMetricValueDef('AV', vector.AV!);
  const ac = getMetricValueDef('AC', vector.AC!);
  const pr = getMetricValueDef('PR', vector.PR!);
  const ui = getMetricValueDef('UI', vector.UI!);
  const s = getMetricValueDef('S', vector.S!);
  const c = getMetricValueDef('C', vector.C!);
  const i = getMetricValueDef('I', vector.I!);
  const a = getMetricValueDef('A', vector.A!);

  if (!av || !ac || !pr || !ui || !s || !c || !i || !a) {
    const bad: string[] = [];
    if (!av) bad.push(`AV=${vector.AV}`);
    if (!ac) bad.push(`AC=${vector.AC}`);
    if (!pr) bad.push(`PR=${vector.PR}`);
    if (!ui) bad.push(`UI=${vector.UI}`);
    if (!s) bad.push(`S=${vector.S}`);
    if (!c) bad.push(`C=${vector.C}`);
    if (!i) bad.push(`I=${vector.I}`);
    if (!a) bad.push(`A=${vector.A}`);
    return {
      baseScore: 0,
      severity: 'None',
      impact: 0,
      exploitability: 0,
      iscBase: 0,
      vectorString: 'CVSS:3.1/',
      complete: false,
      error: `Valores inválidos: ${bad.join(', ')}`,
    };
  }

  // Scope = Changed si S.code === 'C'.
  const scopeChanged = s.code === 'C';

  // PR depende del scope.
  const prNumeric = scopeChanged && pr.scopeDependent ? (pr.numericChanged ?? pr.numeric) : pr.numeric;

  // ISC (Impact Sub-Score) Base.
  const iscBase = 1 - (1 - c.numeric) * (1 - i.numeric) * (1 - a.numeric);

  // Impact (depende del scope).
  let impact: number;
  if (scopeChanged) {
    impact = 7.52 * (iscBase - 0.029) - 3.25 * Math.pow(iscBase - 0.02, 15);
  } else {
    impact = 6.42 * iscBase;
  }

  // Exploitability.
  const exploitability = 8.22 * av.numeric * ac.numeric * prNumeric * ui.numeric;

  // Base score con roundup.
  let baseScore: number;
  if (impact <= 0) {
    baseScore = 0;
  } else if (scopeChanged) {
    baseScore = roundUp(Math.min(1.08 * (impact + exploitability), 10));
  } else {
    baseScore = roundUp(Math.min(impact + exploitability, 10));
  }

  const severity = severityFromScore(baseScore);

  // Construir el vector string.
  const parts: string[] = [];
  for (const metric of CVSS_3_1_METRICS) {
    const val = vector[metric.code];
    if (val) parts.push(`${metric.code}:${val}`);
  }
  const vectorString = `CVSS:3.1/${parts.join('/')}`;

  return {
    baseScore,
    severity,
    impact,
    exploitability,
    iscBase,
    vectorString,
    complete: true,
  };
}
