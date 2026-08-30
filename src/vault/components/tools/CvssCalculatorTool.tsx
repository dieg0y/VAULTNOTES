'use client';

/**
 * CvssCalculatorTool.tsx — CVSS 3.1 Base Score Calculator.
 *
 * 100% offline. NO consulta NVD, NO llama a CVE APIs. Todos los valores
 * de métrica y la fórmula de cálculo están en `cvssData.ts`.
 *
 * CVSS 4.0 (cuando se implemente) debería vivir en un archivo separado
 * (Cvss4CalculatorTool.tsx) y no mezclar métricas con esta versión.
 *
 * Exporta el componente nombrado `CvssCalculatorTool` + default export.
 */
import React, { useMemo, useState } from 'react';
import {
  Calculator, RotateCcw, Copy, Check, Info, Bug, ShieldAlert,
} from 'lucide-react';
import {
  CVSS_3_1_METRICS, calculateCvss3_1BaseScore, getMetricValueDef,
  type CvssMetricCode, type CvssVector,
} from '../../data/cvssData';
import { btnGhost, Row, CodeBlock, InfoBanner, ErrorBanner, buildNoteHtmlTable, useAddToNoteToast } from './_shared';
import { useNoteStore } from '../../store/noteStore';
import { escapeHtml } from '../../utils/escapeHtml';

/** Estado inicial: AV=N/AC=L/PR=N/UI=N/S=U/C=N/I=N/A=N (todo "None"/"Network" lo menos severo). */
const INITIAL_VECTOR: CvssVector = {
  AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'N', I: 'N', A: 'N',
};

/** Colores por severidad. */
const SEVERITY_STYLES: Record<string, string> = {
  None: 'bg-gray-500/15 border-gray-500/30 text-gray-400',
  Low: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
  Medium: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400',
  High: 'bg-orange-500/15 border-orange-500/30 text-orange-400',
  Critical: 'bg-red-500/15 border-red-500/30 text-red-400',
};

export const CvssCalculatorTool: React.FC = () => {
  const [vector, setVector] = useState<CvssVector>(INITIAL_VECTOR);
  const [copied, setCopied] = useState(false);
  const { addedToast, showToast } = useAddToNoteToast();

  const result = useMemo(() => calculateCvss3_1BaseScore(vector), [vector]);

  const handleMetricChange = (code: CvssMetricCode, value: string) => {
    setVector((prev) => ({ ...prev, [code]: value }));
  };

  const handleReset = () => {
    setVector(INITIAL_VECTOR);
    setCopied(false);
  };

  const handleCopyVector = () => {
    navigator.clipboard?.writeText(result.vectorString).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleAddToNote = () => {
    const rows: [string, string][] = [
      ['Vector', escapeHtml(result.vectorString)],
      ['Base Score', escapeHtml(result.baseScore.toFixed(1))],
      ['Severity', escapeHtml(result.severity)],
      ['Impact', escapeHtml(result.impact.toFixed(2))],
      ['Exploitability', escapeHtml(result.exploitability.toFixed(2))],
      ['ISC Base', escapeHtml(result.iscBase.toFixed(4))],
    ];
    for (const metric of CVSS_3_1_METRICS) {
      const val = vector[metric.code];
      if (val) {
        const valDef = getMetricValueDef(metric.code, val);
        rows.push([escapeHtml(`${metric.code} (${metric.label})`), escapeHtml(`${val} (${valDef?.label || '?'})`)]);
      }
    }
    const html = buildNoteHtmlTable(rows);
    useNoteStore.getState().enqueueNote('CVSS 3.1 — ' + result.vectorString, html);
    showToast();
  };

  return (
    <div className="space-y-4">
      <InfoBanner>
        100% offline. CVSS 3.1 (Common Vulnerability Scoring System) calculado localmente. NO consulta NVD, NO llama a CVE APIs. La fórmula sigue el spec oficial de <code className="text-blue-300">first.org/cvss/v3.1</code>.
      </InfoBanner>

      {/* ─── Selectores de métricas ─── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
          <Calculator className="w-3 h-3" />
          Métricas Base (8)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CVSS_3_1_METRICS.map((metric) => {
            const currentValue = vector[metric.code];
            const valueDef = currentValue ? getMetricValueDef(metric.code, currentValue) : undefined;
            return (
              <div
                key={metric.code}
                className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <code className="text-xs font-mono text-blue-300 font-bold">{metric.code}</code>
                    <span className="text-xs text-white ml-2">{metric.label}</span>
                  </div>
                  <select
                    value={currentValue || ''}
                    onChange={(e) => handleMetricChange(metric.code, e.target.value)}
                    className="bg-[#161616] border border-[#262626] rounded px-2 py-1 text-[11px] text-white font-mono focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {metric.values.map((v) => (
                      <option key={v.code} value={v.code}>
                        {v.code} — {v.label}
                      </option>
                    ))}
                  </select>
                </div>
                {valueDef && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-[#888] leading-relaxed">
                      <span className="text-blue-300 font-semibold">{valueDef.code} — {valueDef.label}.</span>{' '}
                      {valueDef.description}
                    </p>
                    <p className="text-[10px] text-[#555]">
                      Métrica: <span className="text-[#888]">{metric.label}</span> · {metric.description}
                      {valueDef.scopeDependent && (
                        <span className="text-yellow-500/70 ml-1">(valor depende de Scope)</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Resultado del cálculo ─── */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
          <Bug className="w-3 h-3" />
          Resultado del Cálculo
        </h3>

        {/* Score + Severity */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] uppercase tracking-widest text-[#555]">Base Score</span>
            <span className="text-3xl font-mono font-bold text-white">
              {result.baseScore.toFixed(1)}
            </span>
            <span className="text-xs text-[#555]">/ 10.0</span>
          </div>
          <span
            className={`px-3 py-1 rounded text-xs font-bold uppercase border ${SEVERITY_STYLES[result.severity]}`}
          >
            {result.severity}
          </span>
        </div>

        {/* Vector string */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-widest text-[#555]">Vector</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleCopyVector}
                disabled={!result.complete}
                className={`${btnGhost} inline-flex items-center gap-1 text-[10px]`}
                title="Copiar vector al portapapeles"
              >
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                Copy Vector
              </button>
              <button
                type="button"
                onClick={handleReset}
                className={`${btnGhost} inline-flex items-center gap-1 text-[10px]`}
                title="Reset a valores por defecto"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
          </div>
          <CodeBlock code={result.vectorString} lang="cvss" />
        </div>

        {/* Detalle del cálculo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Row label="Impact" value={result.impact.toFixed(2)} mono />
          <Row label="Exploitability" value={result.exploitability.toFixed(2)} mono />
          <Row label="ISC Base" value={result.iscBase.toFixed(4)} mono />
          <Row label="Completo" value={result.complete ? 'Sí' : 'No'} />
        </div>

        {/* Error */}
        {result.error && (
          <ErrorBanner message={result.error} />
        )}

        {/* Add to Note */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#262626]">
          <button
            type="button"
            onClick={handleAddToNote}
            disabled={!result.complete}
            className={`${btnGhost} inline-flex items-center gap-1.5 text-[11px]`}
            title="Crear una nota con el resultado del cálculo"
          >
            <Calculator className="w-3 h-3" />
            Add to Note
          </button>
          {addedToast && (
            <span className="text-[10px] text-green-400">Añadido a Notas — crea una nota nueva para verlo.</span>
          )}
        </div>
      </div>

      {/* ─── Tabla de severities ─── */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
          <Info className="w-3 h-3" />
          Escala de Severidad
        </h3>
        {/* FIX-3d — grid-cols-2 en móvil para celdas legibles a 375px; desktop igual (sm:) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1">
          {[
            { range: '0.0', label: 'None', cls: SEVERITY_STYLES.None },
            { range: '0.1-3.9', label: 'Low', cls: SEVERITY_STYLES.Low },
            { range: '4.0-6.9', label: 'Medium', cls: SEVERITY_STYLES.Medium },
            { range: '7.0-8.9', label: 'High', cls: SEVERITY_STYLES.High },
            { range: '9.0-10.0', label: 'Critical', cls: SEVERITY_STYLES.Critical },
          ].map((s) => (
            <div key={s.label} className={`text-center px-2 py-1.5 rounded border ${s.cls}`}>
              <div className="text-[11px] font-bold uppercase">{s.label}</div>
              <div className="text-[9px] font-mono">{s.range}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#666] leading-relaxed">
          La severidad se determina automáticamente a partir del base score. CVSS 3.1 usa la fórmula oficial documentada en <code className="text-blue-300">first.org/cvss/v3.1/specification-formula</code> con el Roundup estándar (no Math.round).
        </p>
      </div>

      {/* ─── Caso de validación ─── */}
      <details className="bg-[#0D0D0D] border border-[#262626] rounded p-3">
        <summary className="cursor-pointer text-xs font-semibold text-white flex items-center gap-1.5">
          <ShieldAlert className="w-3 h-3 text-blue-400" />
          Caso de validación — CVSS 3.1 AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
        </summary>
        <div className="mt-2 space-y-1 text-[10px] text-[#888] leading-relaxed">
          <p>El vector <code className="text-blue-300">CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H</code> representa la vulnerabilidad &quot;peor caso&quot; — wormable, remotamente explotable, sin auth, sin interacción, sin propagación de scope, con impacto total en C/I/A.</p>
          <p>Base Score esperado: <code className="text-green-300">9.8 (Critical)</code>.</p>
          <p>Cálculo: ISC = 1 - (1-0.56)³ = 0.914816 → Impact (S=U) = 6.42 × 0.914816 = 5.8731 → Exploitability = 8.22 × 0.85 × 0.77 × 0.85 × 0.85 = 3.8870 → BaseScore = roundUp(5.8731 + 3.8870) = roundUp(9.7602) = 9.8. ✓</p>
        </div>
      </details>
    </div>
  );
};

export default CvssCalculatorTool;
