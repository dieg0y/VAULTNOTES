import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  LayoutDashboard, FileText, BookOpen, FlaskConical, Trash2, Settings, FileCode, Wrench,
  Bookmark, Inbox, IdCard, Map as RoadmapIcon, Headset, GraduationCap, LifeBuoy,
  Server, Milestone, Shield, ShieldAlert, GitBranch, Fingerprint, ChevronDown,
} from 'lucide-react';
// V11 — conteos estáticos de los datasets por pilar (badges del sidebar).
// PERF (optimización de arranque): los datasets por pilar pesan ~2.4MB de
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
  runbooksIam: number;
  tsHd: number;
  tsSa: number;
  tsSoc: number;
  tsIam: number;
}
const PILLAR_COUNTS_ZERO: PillarCounts = {
  runbooksHd: 0, runbooksSa: 0, runbooksSoc: 0, runbooksIam: 0,
  tsHd: 0, tsSa: 0, tsSoc: 0, tsIam: 0,
};
import { ActiveSection } from '../types';
import { db } from '../db';
import { useSidebarLayoutStore } from '../store/sidebarLayoutStore';

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
/* V11 — REORG POR USUARIO + 4 PILARES                                 */
/*   · El usuario puede ARRASTRAR apartados y grupos enteros           */
/*     (orden persistido en sidebarLayoutStore) y PLEGAR/DESPLEGAR     */
/*     grupos con un clic.                                             */
/*   · Orden por defecto: HERRAMIENTAS (catálogo unificado, arriba     */
/*     del todo) → Global Knowledge → Pilar 1 IAM → Pilar 2 SOC →     */
/*     Pilar 3 Service Desk → Pilar 4 SysAdmin → Career + System.      */
/*   · Cada pilar: simulador, roadmap, Troubleshooting y Runbooks      */
/*     (el CheatSheet se fusionó dentro de Runbooks en V11).          */
/*   · Pie: Papelera · Configuración · badge estático Local-first.     */
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
  /** Id estable del grupo (clave del orden persistido). */
  id: string;
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

/* ------------------------------------------------------------------ */
/* Drag & drop (HTML5 nativo — cero dependencias)                       */
/* ------------------------------------------------------------------ */

type DragPayload =
  | { kind: 'item'; id: string; groupId: string }
  | { kind: 'group'; id: string };

/** Reconcilia un orden persistido contra los valores por defecto:
 *  los ids conocidos se ordenan como el usuario pidió; los NUEVOS que no
 *  estén en el orden guardado se agregan al final (nunca se pierden). */
function reconcile<T>(defaults: T[], order: string[] | undefined, keyOf: (t: T) => string): T[] {
  if (!order || order.length === 0) return defaults;
  const byKey = new Map(defaults.map((d) => [keyOf(d), d] as const));
  const out: T[] = [];
  for (const k of order) {
    const d = byKey.get(k);
    if (d) {
      out.push(d);
      byKey.delete(k);
    }
  }
  for (const d of defaults) if (byKey.has(keyOf(d))) out.push(d);
  return out;
}

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

  // ROADMAP (v18) — progreso del checklist IAM para el badge de su sección.
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

  // SOC (v9) — casos abiertos del simulador Blue Team (badge del SOC)
  // + progreso del roadmap SOC (badge de su propia sección).
  const socOpenCount =
    useLiveQuery(
      () => db.socTickets.filter((t) => !t.isDeleted && (t.status === 'nuevo' || t.status === 'en_progreso')).count(),
      [],
      0
    ) || 0;
  const roadmapSocRows = useLiveQuery(() => db.roadmapSocItems.toArray(), [], []);
  const roadmapSocPct =
    roadmapSocRows.length > 0
      ? Math.round((roadmapSocRows.filter((r) => r.done).length / roadmapSocRows.length) * 100)
      : 0;

  // IAM (V11 · PILAR 1) — tickets abiertos del simulador IAM (badge).
  const iamOpenCount =
    useLiveQuery(
      () => db.iamTickets.filter((t) => !t.isDeleted && (t.status === 'nuevo' || t.status === 'en_progreso')).count(),
      [],
      0
    ) || 0;

  // V11 — conteos por pilar cargados post-paint (ver nota en la cabecera):
  // import() dinámico de los 8 datasets SOLO para los badges, después del
  // primer render. No bloquea el shell y deduplica con el warm-up de la
  // búsqueda global (requestIdleCallback) que carga los mismos chunks.
  const [pillarCounts, setPillarCounts] = useState<PillarCounts>(PILLAR_COUNTS_ZERO);
  useEffect(() => {
    let alive = true;
    (async () => {
      const [rbHd, rbSa, rbSoc, rbIam, tsHd, tsSa, tsSoc, tsIam] = await Promise.all([
        import('../data/runbooksHelpDesk'),
        import('../data/runbooksSysAdmin'),
        import('../data/runbooksSoc'),
        import('../data/runbooksIam'),
        import('../data/troubleshootingHelpDesk'),
        import('../data/troubleshootingSysAdmin'),
        import('../data/troubleshootingSoc'),
        import('../data/troubleshootingIam'),
      ]);
      if (!alive) return;
      setPillarCounts({
        runbooksHd: rbHd.RUNBOOKS_HD_COUNT,
        runbooksSa: rbSa.RUNBOOKS_SA_COUNT,
        runbooksSoc: rbSoc.RUNBOOKS_SOC_COUNT,
        runbooksIam: rbIam.RUNBOOKS_IAM_COUNT,
        tsHd: tsHd.TROUBLESHOOTING_HD_COUNT,
        tsSa: tsSa.TROUBLESHOOTING_SA_COUNT,
        tsSoc: tsSoc.TROUBLESHOOTING_SOC_COUNT,
        tsIam: tsIam.TROUBLESHOOTING_IAM_COUNT,
      });
    })().catch(() => {
      // Sin badges no hay pérdida funcional: las vistas siempre muestran
      // el conteo real derivado del dataset completo.
    });
    return () => { alive = false; };
  }, []);

  // V11 — layout del usuario (orden de grupos/items + plegado), persistido.
  const groupOrder = useSidebarLayoutStore((s) => s.groupOrder);
  const itemOrder = useSidebarLayoutStore((s) => s.itemOrder);
  const collapsedMap = useSidebarLayoutStore((s) => s.collapsed);
  const setGroupOrder = useSidebarLayoutStore((s) => s.setGroupOrder);
  const setItemOrder = useSidebarLayoutStore((s) => s.setItemOrder);
  const toggleCollapsed = useSidebarLayoutStore((s) => s.toggleCollapsed);

  // ORDEN POR DEFECTO (V11 — 4 pilares + herramientas unificadas arriba).
  // Declarado aquí (no módulo) para usar los conteos live de los badges.
  const defaultGroups: NavGroupDef[] = [
    {
      id: 'tools',
      label: 'Herramientas',
      items: [
        {
          section: 'tools',
          label: 'Herramientas',
          icon: <Wrench className={SIDEBAR_ICON} />,
          title: 'Catálogo unificado: cada tool aparece UNA vez, etiquetada con su rol (IAM / SOC / Service Desk / SysAdmin / Global)',
        },
      ],
    },
    {
      id: 'global',
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
      ],
    },
    {
      id: 'iam',
      label: 'Pilar 1 · IAM',
      items: [
        {
          section: 'iam',
          label: 'Simulador IAM',
          icon: <Fingerprint className={SIDEBAR_ICON} />,
          title: 'Simulador del equipo IAM de Nexora: cola de tickets (JML · Access · PAM · Gobernanza · Infra IAM), Semana de Access Review y KB',
          badge: iamOpenCount,
          badgeClass: 'text-amber-400/90',
        },
        {
          section: 'roadmap',
          label: 'Roadmap IAM',
          icon: <RoadmapIcon className={SIDEBAR_ICON} />,
          title: 'Checklist del roadmap Junior IAM / Identity Security Analyst (Tier 1-3 + proyecto final)',
          badge: roadmapPct,
          badgeClass: roadmapPct > 0 ? 'text-emerald-400' : 'text-[#555]',
        },
        {
          section: 'troubleshooting-iam',
          label: 'Troubleshooting',
          icon: <GitBranch className={SIDEBAR_ICON} />,
          title: 'Escaleras de decisión IAM: Problema → Síntoma → Check → Resultado → Siguiente acción',
          badge: pillarCounts.tsIam,
        },
        {
          section: 'runbooks-iam',
          label: 'Runbooks',
          icon: <LifeBuoy className={SIDEBAR_ICON} />,
          title: 'Runbooks IAM: JML, Access, PAM y Gobernanza — paso a paso universal + respuesta en inglés copiable',
          badge: pillarCounts.runbooksIam,
        },
      ],
    },
    {
      id: 'soc',
      label: 'Pilar 2 · SOC / Blue Team',
      items: [
        {
          section: 'soc',
          label: 'SOC Blue Team',
          icon: <ShieldAlert className={SIDEBAR_ICON} />,
          title: 'Simulador del Blue Team: trabaja la cola de casos del SOC de Nexora (Identity, Endpoint, Network, Email, Cloud, Web), la primera semana SOC y la KB',
          badge: socOpenCount,
          badgeClass: 'text-amber-400/90',
        },
        {
          section: 'roadmap-soc',
          label: 'Roadmap SOC',
          icon: <Shield className={SIDEBAR_ICON} />,
          title: 'Checklist del roadmap SOC Analyst L1 / Blue Team (Tier 1-3 + proyecto final)',
          badge: roadmapSocPct,
          badgeClass: roadmapSocPct > 0 ? 'text-emerald-400' : 'text-[#555]',
        },
        {
          section: 'troubleshooting-soc',
          label: 'Troubleshooting',
          icon: <GitBranch className={SIDEBAR_ICON} />,
          title: 'Escaleras de decisión de detección: Problema → Síntoma → Check → Resultado → Siguiente acción',
          badge: pillarCounts.tsSoc,
        },
        {
          section: 'runbooks-soc',
          label: 'Runbooks',
          icon: <LifeBuoy className={SIDEBAR_ICON} />,
          title: 'Runbooks SOC: Detection → Investigation → Evidence → Containment → Remediation → Verification → Escalation (incluye los quick-fixes ex-CheatSheet)',
          badge: pillarCounts.runbooksSoc,
        },
      ],
    },
    {
      id: 'hd',
      label: 'Pilar 3 · Service Desk',
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
          section: 'troubleshooting-hd',
          label: 'Troubleshooting',
          icon: <GitBranch className={SIDEBAR_ICON} />,
          title: 'Escaleras de decisión: Problema → Síntoma → Check → Resultado → Siguiente acción',
          badge: pillarCounts.tsHd,
        },
        {
          section: 'runbooks-hd',
          label: 'Runbooks',
          icon: <LifeBuoy className={SIDEBAR_ICON} />,
          title: 'Runbooks completos: ticket real + paso a paso universal + respuesta en inglés copiable (incluye los quick-fixes ex-CheatSheet)',
          badge: pillarCounts.runbooksHd,
        },
      ],
    },
    {
      id: 'sa',
      label: 'Pilar 4 · SysAdmin Ops',
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
          section: 'troubleshooting-sa',
          label: 'Troubleshooting',
          icon: <GitBranch className={SIDEBAR_ICON} />,
          title: 'Escaleras de decisión de infra: Problema → Síntoma → Check → Resultado → Siguiente acción',
          badge: pillarCounts.tsSa,
        },
        {
          section: 'runbooks-sa',
          label: 'Runbooks',
          icon: <LifeBuoy className={SIDEBAR_ICON} />,
          title: 'Runbooks de infra con ticket real + paso a paso universal + respuesta en inglés copiable (incluye los quick-fixes ex-CheatSheet)',
          badge: pillarCounts.runbooksSa,
        },
      ],
    },
    {
      id: 'career',
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

  // V11 — orden mostrado = orden del usuario reconciliado con los defaults.
  const groups = React.useMemo(() => {
    const ordered = reconcile(defaultGroups, groupOrder.length > 0 ? groupOrder : undefined, (g) => g.id);
    return ordered.map((g) => ({
      ...g,
      items: reconcile(g.items, itemOrder[g.id], (i) => i.section),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupOrder, itemOrder, notesCount, labsCount, glossaryCount, trashCount, inboxCount, roadmapPct, hdOpenCount, roadmapHdPct, saOpenCount, roadmapSaPct, socOpenCount, roadmapSocPct, iamOpenCount, pillarCounts]);

  // ---- Drag & drop state (HTML5 nativo, sin dependencias) ----
  const dragPayload = useRef<DragPayload | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);

  const handleItemDrop = (targetGroupId: string, targetSection: string, before: boolean) => {
    const drag = dragPayload.current;
    setDragOverKey(null);
    setDraggingKey(null);
    if (!drag || drag.kind !== 'item') return;
    if (drag.id === targetSection && drag.groupId === targetGroupId) return;
    const srcGroup = groups.find((g) => g.id === drag.groupId);
    const dstGroup = groups.find((g) => g.id === targetGroupId);
    if (!srcGroup || !dstGroup) return;
    const srcSections: string[] = srcGroup.items.map((i) => i.section).filter((s) => s !== drag.id);
    if (drag.groupId === targetGroupId) {
      const idx = srcSections.indexOf(targetSection);
      srcSections.splice(before ? idx : idx + 1, 0, drag.id);
      setItemOrder(targetGroupId, srcSections);
    } else {
      const dstSections: string[] = dstGroup.items.map((i) => i.section);
      const idx = dstSections.indexOf(targetSection);
      dstSections.splice(before ? idx : idx + 1, 0, drag.id);
      setItemOrder(drag.groupId, srcSections);
      setItemOrder(targetGroupId, dstSections);
    }
  };

  const handleGroupDrop = (targetGroupId: string) => {
    const drag = dragPayload.current;
    setDragOverKey(null);
    setDraggingKey(null);
    if (!drag) return;
    if (drag.kind === 'group') {
      if (drag.id === targetGroupId) return;
      const order = groups.map((g) => g.id);
      const from = order.indexOf(drag.id);
      const to = order.indexOf(targetGroupId);
      if (from === -1 || to === -1) return;
      order.splice(from, 1);
      order.splice(to, 0, drag.id);
      setGroupOrder(order);
    } else {
      // Item sobre el header de un grupo → moverlo a la PRIMERA posición.
      if (drag.groupId === targetGroupId) return;
      const srcGroup = groups.find((g) => g.id === drag.groupId);
      const dstGroup = groups.find((g) => g.id === targetGroupId);
      if (!srcGroup || !dstGroup) return;
      setItemOrder(drag.groupId, srcGroup.items.map((i) => i.section).filter((s) => s !== drag.id));
      setItemOrder(targetGroupId, [drag.id, ...dstGroup.items.map((i) => i.section)]);
    }
  };

  /** Header de grupo — clic plega/despliega; arrastre reordena el grupo. */
  const renderGroupHeader = (g: NavGroupDef, isCollapsed: boolean, itemCount: number) => {
    const isDragOver = dragOverKey === `grp/${g.id}`;
    const isDragging = draggingKey === `grp/${g.id}`;
    return (
      <div
        draggable
        onDragStart={(e) => {
          dragPayload.current = { kind: 'group', id: g.id };
          setDraggingKey(`grp/${g.id}`);
          e.dataTransfer.effectAllowed = 'move';
          try { e.dataTransfer.setData('text/plain', g.id); } catch { /* Safari privado */ }
        }}
        onDragEnd={() => { dragPayload.current = null; setDraggingKey(null); setDragOverKey(null); }}
        onDragOver={(e) => {
          if (!dragPayload.current) return;
          e.preventDefault();
          setDragOverKey(`grp/${g.id}`);
        }}
        onDrop={(e) => { e.preventDefault(); handleGroupDrop(g.id); }}
        className={`flex items-center gap-2 pt-3 pb-1 px-3 select-none ${isDragging ? 'opacity-40' : ''} ${
          isDragOver ? 'shadow-[inset_0_2px_0_0_rgba(96,165,250,0.9)] rounded-t' : ''
        }`}
        title="Clic: plegar/desplegar · Arrastra: mover el grupo"
      >
        <button
          type="button"
          onClick={() => toggleCollapsed(g.id)}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? `Desplegar grupo ${g.label}` : `Plegar grupo ${g.label}`}
          className="flex items-center gap-1.5 min-w-0 text-left cursor-pointer"
        >
          <ChevronDown className={`w-3 h-3 text-[#4a4a4a] transition-transform shrink-0 ${isCollapsed ? '-rotate-90' : ''}`} />
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#4a4a4a]">{g.label}</span>
        </button>
        {isCollapsed && (
          <span className="text-[9px] font-mono text-[#555] shrink-0" title={`${itemCount} apartados`}>
            {itemCount}
          </span>
        )}
        <span className="flex-1 h-px bg-[#1d1d1d]" />
      </div>
    );
  };

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

        {/* Grouped navigation (V11 — orden del usuario, grupos plegables) */}
        <nav className="p-3 pt-1 flex flex-col gap-0.5" aria-label="Navegación principal">
          {groups.map((g) => {
            const isCollapsed = collapsedMap[g.id] === true;
            // El grupo que contiene la sección activa SIEMPRE se revela
            // (el plegado persiste, pero nunca esconde dónde estás).
            const showItems = !isCollapsed || g.items.some((i) => i.section === activeSection);
            return (
              <div key={g.id} className="flex flex-col gap-0.5">
                {renderGroupHeader(g, isCollapsed, g.items.length)}
                {showItems &&
                  g.items.map((item) => {
                    const beforeKey = `${g.id}/${item.section}/b`;
                    const afterKey = `${g.id}/${item.section}/a`;
                    const indicator =
                      dragOverKey === beforeKey
                        ? 'shadow-[0_-2px_0_0_rgba(96,165,250,0.9)]'
                        : dragOverKey === afterKey
                          ? 'shadow-[0_2px_0_0_rgba(96,165,250,0.9)]'
                          : '';
                    return (
                      <div
                        key={item.section}
                        draggable
                        onDragStart={(e) => {
                          dragPayload.current = { kind: 'item', id: item.section, groupId: g.id };
                          setDraggingKey(`item/${item.section}`);
                          e.dataTransfer.effectAllowed = 'move';
                          try { e.dataTransfer.setData('text/plain', item.section); } catch { /* Safari privado */ }
                        }}
                        onDragEnd={() => { dragPayload.current = null; setDraggingKey(null); setDragOverKey(null); }}
                        onDragOver={(e) => {
                          if (!dragPayload.current) return;
                          e.preventDefault();
                          const r = e.currentTarget.getBoundingClientRect();
                          const before = e.clientY < r.top + r.height / 2;
                          setDragOverKey(before ? beforeKey : afterKey);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const r = e.currentTarget.getBoundingClientRect();
                          const before = e.clientY < r.top + r.height / 2;
                          handleItemDrop(g.id, item.section, before);
                        }}
                        className={`rounded-md ${indicator} ${draggingKey === `item/${item.section}` ? 'opacity-40' : ''}`}
                        title={item.title ? `${item.title} · (arrastra para mover)` : 'Arrastra para mover de sitio'}
                      >
                        <NavButton def={item} activeSection={activeSection} onSelectSection={onSelectSection} />
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom navigation: Papelera · Configuración · badge estático */}
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

        {/* Badge estático Local-first (V11): con la retirada de Data & Intel
            y el threat intel, el indicador dinámico online/offline se retira —
            la app vuelve a ser 100% offline-first por diseño. */}
        <div
          className="px-3 py-1.5 rounded bg-[#161616] border border-[#262626] flex items-center justify-between text-[10px] text-[#888]"
          title="Tus datos viven en IndexedDB (tu navegador). Backups ZIP para llevar tus datos a otra máquina."
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-green-400" />
            <span className="truncate">Local-first · 100% Offline</span>
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
