// attacks/types.ts — contrato del dataset de ATAQUES de VaultNotes.
//
// REGLA ANTI-DUPLICADOS: un sinónimo NUNCA es una entrada propia — va en
// `alias` de la entrada canónica (p. ej. "ARP poisoning" es alias de
// "ARP Spoofing", no una segunda fila). Antes de añadir una entrada nueva,
// verificar que no exista ya el MISMO concepto con otro nombre en este
// dataset NI en ../vulnerabilities.ts (los fallos de implementación
// viven allí: JWT alg-none, ESC de AD CS, etc. — las TÉCNICAS aquí).
//
// 100% offline — alimenta AttacksExplorerTool.tsx vía ./index.ts.
//
// IDs: <CATEGORÍA>-<NNN> (IAM-001, RED-002, DOS-003, WEB-004, PRIV-005,
// LAT-006, PER-007, SE-008, MAL-009). No usar `export default`.

export type AttackCategory =
  | 'IAM'
  | 'Red'
  | 'DoS'
  | 'Web'
  | 'PrivEsc'
  | 'Lateral'
  | 'Persistencia'
  | 'Social'
  | 'Malware';

export type AttackSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface AttackInfo {
  id: string;
  nombre: string;
  /** Nombres alternativos / sinónimos (documentados, NO entradas separadas). */
  alias?: string[];
  categoria: AttackCategory;
  severidad: AttackSeverity;
  cve_ejemplo?: string[];
  /** Técnicas/sub-técnicas ATT&CK Enterprise; [] si MITRE no mapea (L2/físico). */
  mitre_attack: string[];
  descripcion_tecnica: string;
  /** Perspectiva del analista SOC/IAM: qué buscar, por qué importa. */
  impacto_iam_soc: string;
  /** Pasos/herramientas reales del ataque (3-4 items, concreto). */
  como_funciona: string[];
  deteccion: {
    kql?: string;
    spl?: string;
    sigma?: string;
    win_event_ids?: number[];
  };
  mitigacion: string[];
  referencias: string[];
}
