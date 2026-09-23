/**
 * SocGuideTool.tsx — renderizador de las guías de herramientas SOC (V9).
 *
 * Una sola componente renderiza cualquiera de las 8 guías de
 * data/socToolsData.ts (Sentinel, Splunk, Elastic, Wireshark, Sysmon,
 * Defender, VirusTotal + ANY.RUN, TheHive): propósito, cuándo usarla,
 * secciones con bloques copiables (CodeBlock + CopyBtn) y pro tips.
 * 100% offline — es un dataset estático de referencia.
 */

import React from 'react';
import { BookOpen, Info, Lightbulb } from 'lucide-react';
import { SOC_TOOL_GUIDE_BY_ID, type SocToolGuide } from '../../../data/socToolsData';
import { CodeBlock } from '../_shared';

export interface SocGuideToolProps {
  /** Id de la guía a renderizar ('sentinel', 'splunk'…). */
  guideId: string;
}

const GuideRenderer: React.FC<{ guide: SocToolGuide }> = ({ guide }) => (
  <div className="flex flex-col gap-4">
    {/* Propósito + cuándo usar */}
    <div className="bg-[#0D0D0D] border border-[#262626] rounded p-4 flex flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
          <BookOpen className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-white">{guide.name}</h2>
          <p className="text-xs text-[#999] leading-relaxed mt-0.5">{guide.purpose}</p>
        </div>
      </div>
      {guide.whenToUse.length > 0 && (
        <div className="flex flex-col gap-1.5 pl-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Cuándo usarla</span>
          <ul className="flex flex-col gap-1">
            {guide.whenToUse.map((w, i) => (
              <li key={i} className="text-[11px] text-[#BBB] leading-relaxed flex items-start gap-2">
                <span className="text-emerald-400/70 shrink-0 mt-[1px]">▸</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>

    {/* Secciones con bloques copiables */}
    {guide.sections.map((sec) => (
      <section key={sec.title} className="bg-[#0D0D0D] border border-[#262626] rounded p-4 flex flex-col gap-2.5">
        <h3 className="text-xs font-bold text-white tracking-wide">{sec.title}</h3>
        {sec.intro && <p className="text-[11px] text-[#888] leading-relaxed">{sec.intro}</p>}
        <div className="flex flex-col gap-2.5">
          {sec.blocks.map((b, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-emerald-300/90">{b.label}</span>
              </div>
              {b.detail && <p className="text-[11px] text-[#888] leading-relaxed pl-0.5">{b.detail}</p>}
              {b.code && <CodeBlock code={b.code} />}
              {b.note && (
                <p className="text-[10px] text-amber-300/80 leading-relaxed flex items-start gap-1.5 pl-0.5">
                  <Info className="w-3 h-3 shrink-0 mt-[2px]" />
                  <span>{b.note}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    ))}

    {/* Pro tips */}
    {guide.proTips && guide.proTips.length > 0 && (
      <div className="bg-amber-500/5 border border-amber-500/20 rounded p-3.5 flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80 flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5" /> Tips de operador
        </span>
        {guide.proTips.map((t, i) => (
          <p key={i} className="text-[11px] text-[#BBB] leading-relaxed">• {t}</p>
        ))}
      </div>
    )}
  </div>
);

export const SocGuideTool: React.FC<SocGuideToolProps> = ({ guideId }) => {
  const guide = SOC_TOOL_GUIDE_BY_ID.get(guideId);
  if (!guide) {
    return (
      <div className="p-4 text-xs text-[#888]">
        Guía «{guideId}» no encontrada en socToolsData.ts.
      </div>
    );
  }
  return <GuideRenderer guide={guide} />;
};

