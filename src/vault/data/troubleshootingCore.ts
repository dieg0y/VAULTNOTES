/**
 * troubleshootingCore.ts — modelo compartido de TROUBLESHOOTING por pilar
 * (V9 FASE 9). NO es una copia de los runbooks: el runbook es el
 * procedimiento completo con respuesta en inglés; el troubleshooting es
 * la ESCALERA DE DECISIÓN rápida:
 *
 *   PROBLEMA → SÍNTOMA → CHECK → RESULTADO → SIGUIENTE ACCIÓN
 *
 * Cada check responde: qué mirar, con qué comando (copiable), qué
 * resultado esperas ver y cuál es el siguiente paso según ese resultado.
 * El objetivo es diagnosticar (¿dónde está el problema?) más que
 * remediar (eso vive en el runbook correspondiente).
 */

import { type RunbookPillar } from './runbooksCore';

/** Un peldaño de la escalera de decisión. */
export interface DecisionCheck {
  /** Qué checkear (una verificación concreta y observable). */
  check: string;
  /** Comando/query copiable para ejecutar el check (opcional). */
  command?: string;
  /** Resultado que esperas ver si todo está bien en esa capa. */
  result: string;
  /** Siguiente acción según el resultado (ramifica: si A → X, si B → Y). */
  next: string;
}

/** Guía de troubleshooting de un problema por pilar. */
export interface PillarTroubleshooting {
  /** Id estable y único: TS-HD-001 / TS-SA-001 / TS-SOC-001… */
  id: string;
  /** Pilar dueño de la guía. */
  pillar: RunbookPillar;
  /** Título corto: el problema que se diagnostica. */
  title: string;
  /** El PROBLEMA en una frase (qué está roto). */
  problem: string;
  /** Síntomas observables (2-3, los reporta el usuario o el alert). */
  symptoms: string[];
  /** Alcance: qué capas toca ('Cliente vs Server vs Red vs DNS…'). */
  level: string;
  /** La escalera de decisión ordenada (4-8 checks, de lo más barato a lo
   *  más profundo). */
  checks: DecisionCheck[];
  /** Dónde suele estar el problema (distribución de frecuencias). */
  remediation: string;
  /** Cómo confirmar el diagnóstico antes de remediar. */
  verification: string;
  /** Tags ES/EN para búsqueda fuzzy. */
  tags: string[];
}
