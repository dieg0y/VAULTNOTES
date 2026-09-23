import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  LayoutDashboard, FileText, BookOpen, FlaskConical, Trash2, Settings, FileCode, Wrench,
  Bookmark, Inbox, Database, IdCard, Map as RoadmapIcon, Headset, GraduationCap, LifeBuoy, Zap,
  Server, Milestone, Shield, GitBranch,
} from 'lucide-react';
// V9 — conteos estáticos de los datasets por pilar (badges del sidebar).
// PERF (optimización de arranque): los 9 datasets por pilar suman ~1.9MB de
// código fuente; importarlos estáticamente SOLO para los números de los
// badges los metía en el chunk del shell y bloqueaba el primer render.
// Ahora se cargan post-paint con import() dinámico (mismos chunks que ya
// calienta el warm-up del GlobalSearchModal en requestIdleCallback →
// comparten módulo, no hay descarga extra). Mientras llegan, los badges
// simplemente no se muestran (regla badge > 0); sin drift posible porque
// los números SIGEN derivándose de los arrays reales (.length).
interface PillarCounts {
  runbooksHd: number;
  runbooksSa: number;
  runbooksSoc: number;
  cheatHd: number;
  cheatSa: number;
  cheatSoc: number;
  tsHd: number;
  tsSa: number;
  tsSoc: number;
}
const PILLAR_COUNTS_ZERO: PillarCounts = {
  runbooksHd: 0, runbooksSa: 0, runbooksSoc: 0,
  cheatHd: 0, cheatSa: 0, cheatSoc: 0,
  tsHd: 0, tsSa: 0, tsSoc: 0,
};
import { ActiveSection } from '../types';
import { db } from '../db';
import { useIsOnline } from '../integrations/online';

interface SidebarProps {
  activeSection: ActiveSection;
  onSelectSection: (section: ActiveSection) => void;
  notesCount: number;
  labsCount: number;
  glossaryCount: number;
  trashCount: number;
  /** Visibilidad del drawer en móvil (< md). El sidebar de escritorio (≥ md) siempre está visible. */
  open?: boolean;
  /** Cierra el drawer móvil (clic en el backdrop). */
  onClose?: () => void;
}

/* ------------------------------------------------------------------ */
/* FASE 2 (V6) — REORG ANTI-CAOS + v21 (SYSADMIN)                      */
/* El sidebar se agrupa con títulos para dejar de ser una lista plana.  */
/* v21 añade el grupo "SysAdmin / Infra" (simulador de guardia) tras    */
/* Service Desk y "Roadmap SysAdmin" en Carrera junto a los demás       */
/* roadmaps. Orden por grupos:                                          */
/*   CONOCIMIENTO : Apuntes · Glosario (+ Inbox)                        */
/*   LABORATORIO  : Labs · Generar Blog · Herramientas ·                */
/*                  Troubleshooting & Runbooks                         */
/*   SERVICE DESK : Service Desk (simulador) · CheatSheet ·             */
/*                  Data & Intel                                        */
/*   SYSADMIN     : SysAdmin Ops (simulador de Infra)                   */
/*   CARRERA      : Referencias · Roadmap IAM · Roadmap HelpDesk ·      */
/*                  Roadmap SysAdmin · Perfil · Dashboard               */
/*   Pie          : Papelera · Configuración · estado online            */
/* ------------------------------------------------------------------ */

interface NavItemDef {
  section: ActiveSection;
  label: string;
  icon: React.ReactNode;
  title?: string;
  /** Badge: número fijo (conteo) o null. */
  badge?: number | null;
  /** Clase extra del badge (color). */
  badgeClass?: string;
}

interface NavGroupDef {
  label: string;
  items: NavItemDef[];
}

const SIDEBAR_ICON = 'w-4 h-4';

/** Un botón de navegación — markup idéntico al histórico (visual no cambia). */
const NavButton: React.FC<{
  def: NavItemDef;
  activeSection: ActiveSection;
  onSelectSection: (s: ActiveSection) => void;
}> = ({ def, activeSection, onSelectSection }) => (
  <button
    onClick={() => onSelectSection(def.section)}
    className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer text-xs ${
      activeSection === def.section
        ? 'bg-blue-500/10 text-blue-400 font-medium'
        : 'text-[#888] hover:bg-[#161616] hover:text-white'
    }`}
    title={def.title}
  >
    <span className="flex items-center gap-2 min-w-0">
      {def.icon}
      <span className="truncate">{def.label}</span>
    </span>
    {def.badge != null && def.badge > 0 && (
      <span className={`text-[10px] font-mono shrink-0 ml-2 ${def.badgeClass ?? 'text-[#555]'}`}>
        {def.badge}
      </span>
    )}
  </button>
);

/** Título de grupo con separadores (FASE 2: grupos con títulos). */
const GroupLabel: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-2 pt-3 pb-1 px-3 select-none" aria-hidden="true">
    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#4a4a4a]">{label}</span>
    <span className="flex-1 h-px bg-[#1d1d1d]" />
  </div>
);

// PERFORMANCE (cleanup pass): App subscribes to 7 live queries — every DB
// write (e.g. each autosave flush) re-renders the whole tree. memo + stable
// callbacks (see App.tsx) let the sidebar skip re-rendering when its props
// (counts / active section) are unchanged.
const SidebarBase: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  notesCount,
  labsCount,
  glossaryCount,
  trashCount,
  open = false,
  onClose,
}) => {
  // Unconverted inbox items count (for the Inbox badge)
  const inboxCount = useLiveQuery(
    () =>
      db.inboxItems
        .filter((i) => i.convertedTo === null || i.convertedTo === undefined || i.isTask === true)
        .count(),
    [],
    0
  ) || 0;

  // ROADMAP (v18) — progreso del checklist para el badge de la sección.
  const roadmapRows = useLiveQuery(() => db.roadmapItems.toArray(), [], []);
  const roadmapPct =
    roadmapRows.length > 0
      ? Math.round((roadmapRows.filter((r) => r.done).length / roadmapRows.length) * 100)
      : 0;

  // HELPDESK (v19) — tickets abiertos (badge del Service Desk) + progreso
  // del roadmap HelpDesk (badge de su propia sección).
  const hdOpenCount =
    useLiveQuery(
      () => db.helpdeskTickets.filter((t) => !t.isDeleted && (t.status === 'nuevo' || t.status === 'en_progreso')).count(),
      [],
      0
    ) || 0;
  const roadmapHdRows = useLiveQuery(() => db.roadmapHelpDeskItems.toArray(), [], []);
  const roadmapHdPct =
    roadmapHdRows.length > 0
      ? Math.round((roadmapHdRows.filter((r) => r.done).length / roadmapHdRows.length) * 100)
      : 0;

  // SYSADMIN (v21) — tickets de guardia abiertos (badge de SysAdmin Ops)
  // + progreso del roadmap SysAdmin (badge de su propia sección).
  const saOpenCount =
    useLiveQuery(
      () => db.sysadminTickets.filter((t) => !t.isDeleted && (t.status === 'nuevo' || t.status === 'en_progreso')).count(),
      [],
      0
    ) || 0;
  const roadmapSaRows = useLiveQuery(() => db.roadmapSysAdminItems.toArray(), [], []);
  const roadmapSaPct =
    roadmapSaRows.length > 0
      ? Math.round((roadmapSaRows.filter((r) => r.done).length / roadmapSaRows.length) * 100)
      : 0;

  // SOC (v9) — progreso del roadmap SOC (badge de su propia sección).
  const roadmapSocRows = useLiveQuery(() => db.roadmapSocItems.toArray(), [], []);
  const roadmapSocPct =
    roadmapSocRows.length > 0
      ? Math.round((roadmapSocRows.filter((r) => r.done).length / roadmapSocRows.length) * 100)
      : 0;

  // V9 — conteos por pilar cargados post-paint (ver nota en la cabecera):
  // import() dinámico de los 9 datasets SOLO para los badges, después del
  // primer render. No bloquea el shell y deduplica con el warm-up de la
  // búsqueda global (requestIdleCallback) que carga los mismos chunks.
  const [pillarCounts, setPillarCounts] = useState<PillarCounts>(PILLAR_COUNTS_ZERO);
  useEffect(() => {
    let alive = true;
    (async () => {
      const [rbHd, rbSa, rbSoc, csHd, csSa, csSoc, tsHd, tsSa, tsSoc] = await Promise.all([
        import('../data/runbooksHelpDesk'),
        import('../data/runbooksSysAdmin'),
        import('../data/runbooksSoc'),
        import('../data/serviceDeskCheatSheet'),
        import('../data/sysadminCheatSheet'),
        import('../data/socCheatSheet'),
        import('../data/troubleshootingHelpDesk'),
        import('../data/troubleshootingSysAdmin'),
        import('../data/troubleshootingSoc'),
      ]);
      if (!alive) return;
      setPillarCounts({
        runbooksHd: rbHd.RUNBOOKS_HD_COUNT,
        runbooksSa: rbSa.RUNBOOKS_SA_COUNT,
        runbooksSoc: rbSoc.RUNBOOKS_SOC_COUNT,
        cheatHd: csHd.CHEATSHEET_COUNT,
        cheatSa: csSa.SYSADMIN_CHEATSHEET_COUNT,
        cheatSoc: csSoc.SOC_CHEATSHEET_COUNT,
        tsHd: tsHd.TROUBLESHOOTING_HD_COUNT,
        tsSa: tsSa.TROUBLESHOOTING_SA_COUNT,
        tsSoc: tsSoc.TROUBLESHOOTING_SOC_COUNT,
      });
    })().catch(() => {
      // Sin badges no hay pérdida funcional: las vistas siempre muestran
      // el conteo real derivado del dataset completo.
    });
    return () => { alive = false; };
  }, []);

  // Block 6 — Online-Optional: reads navigator.onLine via window online/offline
  // events. NO network probe, NO periodic fetch. Purely visual state.
  const online = useIsOnline();

  // ORDEN EXACTO (V9 — 3 PILARES) — declarado una sola vez, por grupos.
  // GLOBAL KNOWLEDGE → GLOBAL CAREER CORE (IAM) → PILAR 1/2/3 →
  // GLOBAL CAREER + SYSTEM (Perfil ARRIBA de Dashboard). Cada pilar tiene
  // su simulador/roadmap + Herramientas + Troubleshooting + CheatSheet +
  // Runbooks.
  const groups: NavGroupDef[] = [
    {
      label: 'Global Knowledge',
      items: [
        { section: 'notes', label: 'Apuntes', icon: <FileText className={SIDEBAR_ICON} />, badge: notesCount },
        { section: 'glossary', label: 'Glosario', icon: <BookOpen className={SIDEBAR_ICON} />, badge: glossaryCount },
        {
          section: 'inbox',
          label: 'Inbox',
          icon: <Inbox className={SIDEBAR_ICON} />,
          title: 'Captura rápida y items sin organizar (Ctrl+Shift+Q)',
          badge: inboxCount,
          badgeClass: 'text-amber-400/90',
        },
        { section: 'labs', label: 'Labs', icon: <FlaskConical className={SIDEBAR_ICON} />, badge: labsCount, title: 'Sin labs — tú decides qué hacer después (vacío intencional desde V9)' },
        { section: 'blog', label: 'Blog', icon: <FileCode className={SIDEBAR_ICON} /> },
        { section: 'references', label: 'Referencias', icon: <Bookmark className={SIDEBAR_ICON} /> },
        {
          section: 'data-intel',
          label: 'Data & Intel',
          icon: <Database className={SIDEBAR_ICON} />,
          title: 'Sincronización de datasets + estado de integraciones + actividad online',
        },
      ],
    },
    {
      label: 'Career Core',
      items: [
        {
          section: 'roadmap',
          label: 'Roadmap IAM',
          icon: <RoadmapIcon className={SIDEBAR_ICON} />,
          title: 'Checklist del roadmap Junior IAM / Identity Security Analyst (Tier 1-3 + proyecto final)',
          badge: roadmapPct,
          badgeClass: roadmapPct > 0 ? 'text-emerald-400' : 'text-[#555]',
        },
      ],
    },
    {
      label: 'Pilar 1 · Service Desk',
      items: [
        {
          section: 'helpdesk',
          label: 'Service Desk',
          icon: <Headset className={SIDEBAR_ICON} />,
          title: 'Simulador L1: trabaja la cola de tickets de Nexora, el proyecto final y la KB',
          badge: hdOpenCount,
          badgeClass: 'text-amber-400/90',
        },
        {
          section: 'roadmap-hd',
          label: 'Roadmap HelpDesk',
          icon: <GraduationCap className={SIDEBAR_ICON} />,
          title: 'Checklist del roadmap HelpDesk / IT Support → IAM (Tier 1-3 + proyecto final de 30 tickets)',
          badge: roadmapHdPct,
          badgeClass: roadmapHdPct > 0 ? 'text-emerald-400' : 'text-[#555]',
        },
        {
          section: 'tools-hd',
          label: 'Herramientas',
          icon: <Wrench className={SIDEBAR_ICON} />,
          title: 'Herramientas del pilar Service Desk (parsers, simuladores, generadores)',
        },
        {
          section: 'troubleshooting-hd',
          label: 'Troubleshooting',
          icon: <GitBranch className={SIDEBAR_ICON} />,
          title: 'Escaleras de decisión: Problema → Síntoma → Check → Resultado → Siguiente acción',
          badge: pillarCounts.tsHd,
        },
        {
          section: 'cheatsheet-hd',
          label: 'CheatSheet',
          icon: <Zap className={SIDEBAR_ICON} />,
          title: 'Los fixes top de L1/L2 al instante: sin input, buscador fuzzy, 100% offline',
          badge: pillarCounts.cheatHd,
        },
        {
          section: 'runbooks-hd',
          label: 'Runbooks',
          icon: <LifeBuoy className={SIDEBAR_ICON} />,
          title: 'Runbooks completos: ticket real + paso a paso universal + respuesta en inglés copiable',
          badge: pillarCounts.runbooksHd,
        },
      ],
    },
    {
      label: 'Pilar 2 · SysAdmin Ops',
      items: [
        {
          section: 'sysadmin',
          label: 'SysAdmin Ops',
          icon: <Server className={SIDEBAR_ICON} />,
          title: 'Simulador de guardia: trabaja la cola de tickets de Infraestructura de Nexora (Linux, Windows Server, red, storage, VM), la semana de guardia y la KB',
          badge: saOpenCount,
          badgeClass: 'text-amber-400/90',
        },
        {
          section: 'roadmap-sa',
          label: 'Roadmap SysAdmin',
          icon: <Milestone className={SIDEBAR_ICON} />,
          title: 'Checklist del roadmap SysAdmin / Infra & Ops → SRE (Tier 1-3 + semana de guardia de 30 tickets)',
          badge: roadmapSaPct,
          badgeClass: roadmapSaPct > 0 ? 'text-emerald-400' : 'text-[#555]',
        },
        {
          section: 'tools-sa',
          label: 'Herramientas',
          icon: <Wrench className={SIDEBAR_ICON} />,
          title: 'Herramientas del pilar SysAdmin Ops (systemd, RAID, LVM, cron builder, firewall, capacity)',
        },
        {
          section: 'troubleshooting-sa',
          label: 'Troubleshooting',
          icon: <GitBranch className={SIDEBAR_ICON} />,
          title: 'Escaleras de decisión de infra: Problema → Síntoma → Check → Resultado → Siguiente acción',
          badge: pillarCounts.tsSa,
        },
        {
          section: 'cheatsheet-sa',
          label: 'CheatSheet',
          icon: <Zap className={SIDEBAR_ICON} />,
          title: 'Fixes de infra al instante: AD, DNS, DHCP, GPO, backup, Hyper-V… 100% offline',
          badge: pillarCounts.cheatSa,
        },
        {
          section: 'runbooks-sa',
          label: 'Runbooks',
          icon: <LifeBuoy className={SIDEBAR_ICON} />,
          title: 'Runbooks de infra con ticket real + paso a paso universal + respuesta en inglés copiable',
          badge: pillarCounts.runbooksSa,
        },
      ],
    },
    {
      label: 'Pilar 3 · SOC / Blue Team',
      items: [
        {
          section: 'roadmap-soc',
          label: 'Roadmap SOC',
          icon: <Shield className={SIDEBAR_ICON} />,
          title: 'Checklist del roadmap SOC Analyst L1 / Blue Team (Tier 1-3 + proyecto final)',
          badge: roadmapSocPct,
          badgeClass: roadmapSocPct > 0 ? 'text-emerald-400' : 'text-[#555]',
        },
        {
          section: 'tools-soc',
          label: 'Herramientas',
          icon: <Wrench className={SIDEBAR_ICON} />,
          title: 'Herramientas del pilar SOC: MITRE, Sigma, KQL/SPL, Event IDs, IoC + guías de Sentinel/Splunk/Wireshark/Sysmon/Defender/sandbox/TheHive',
        },
        {
          section: 'troubleshooting-soc',
          label: 'Troubleshooting',
          icon: <GitBranch className={SIDEBAR_ICON} />,
          title: 'Escaleras de decisión de detección: Problema → Síntoma → Check → Resultado → Siguiente acción',
          badge: pillarCounts.tsSoc,
        },
        {
          section: 'cheatsheet-soc',
          label: 'CheatSheet',
          icon: <Zap className={SIDEBAR_ICON} />,
          title: 'Fixes de detección y respuesta al instante: phishing, spray, EDR, KQL… 100% offline',
          badge: pillarCounts.cheatSoc,
        },
        {
          section: 'runbooks-soc',
          label: 'Runbooks',
          icon: <LifeBuoy className={SIDEBAR_ICON} />,
          title: 'Runbooks SOC: Detection → Investigation → Evidence → Containment → Remediation → Verification → Escalation',
          badge: pillarCounts.runbooksSoc,
        },
      ],
    },
    {
      label: 'Career + System',
      items: [
        {
          section: 'profile',
          label: 'Perfil Profesional',
          icon: <IdCard className={SIDEBAR_ICON} />,
          title: 'Tu CV vivo: skills, tools, experiencia, certs — expórtalo como Markdown para que una IA te arme el CV',
        },
        { section: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className={SIDEBAR_ICON} /> },
      ],
    },
  ];

  // Contenido compartido entre el sidebar de escritorio y el drawer móvil.
  const sidebarContent = (
    <>
      {/* Top branding & navigation */}
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-12 px-4 flex items-center gap-2.5 border-b border-[#262626]">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center shadow-sm">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">VAULT</span>
        </div>

        {/* Grouped navigation (FASE 2 — orden exacto, grupos con separadores) */}
        <nav className="p-3 pt-1 flex flex-col gap-0.5" aria-label="Navegación principal">
          {groups.map((g) => (
            <div key={g.label} className="flex flex-col gap-0.5">
              <GroupLabel label={g.label} />
              {g.items.map((item) => (
                <NavButton key={item.section} def={item} activeSection={activeSection} onSelectSection={onSelectSection} />
              ))}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom navigation: Papelera · Configuración · estado online */}
      <div className="p-3 border-t border-[#262626] flex flex-col gap-1.5">
        <button
          onClick={() => onSelectSection('trash')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer text-xs ${
            activeSection === 'trash'
              ? 'bg-red-500/10 text-red-400 font-medium'
              : 'text-[#888] hover:bg-[#161616] hover:text-red-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            <span>Papelera</span>
          </span>
          {trashCount > 0 && (
            <span className="text-[10px] font-mono text-red-400/80">{trashCount}</span>
          )}
        </button>

        <button
          onClick={() => onSelectSection('settings')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer text-xs ${
            activeSection === 'settings'
              ? 'bg-blue-500/10 text-blue-400 font-medium'
              : 'text-[#888] hover:bg-[#161616] hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span>Configuración</span>
          </span>
        </button>

        {/* Connectivity state badge (Block 6 — Online-Optional).
            Reads navigator.onLine via useIsOnline() — no fetch, no probe.
            Replaces the static "100% Offline" badge from Block 5 with a real
            reflection of the browser's connectivity state. Local-first
            always works; online enrichment is the only thing gated by this. */}
        <div
          className="px-3 py-1.5 rounded bg-[#161616] border border-[#262626] flex items-center justify-between text-[10px] text-[#888]"
          title={
            online
              ? 'Online: local tools + online enrichment available'
              : 'Offline: local only — Notes ✓, Search ✓, MITRE ✓, Sigma ✓ · Online enrichment ✕ (disabled)'
          }
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                online ? 'bg-green-400' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="truncate">
              {online ? 'Online · Local-first' : 'Offline · Local-only'}
            </span>
          </div>
          <span className="font-mono text-[9px] text-[#555] shrink-0 ml-2">Dexie</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Escritorio (≥ md): columna persistente — idéntica al layout original. */}
      <aside className="hidden md:flex w-[200px] border-r border-[#262626] bg-[#0D0D0D] flex-col justify-between shrink-0 h-screen select-none z-30 overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Móvil (< md): drawer superpuesto con backdrop. Se abre desde el
          botón hamburguesa del Header y se cierra al navegar o al tocar
          el backdrop. No ocupa espacio en el flujo del layout. */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-[45] bg-black/50 md:hidden"
            onClick={() => onClose?.()}
            aria-hidden="true"
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-[260px] max-w-[85vw] bg-[#0D0D0D] border-r border-[#262626] flex flex-col justify-between select-none md:hidden overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
          >
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
};

export const Sidebar = React.memo(SidebarBase);
