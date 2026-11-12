'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initializeDatabase, dismissSeedTerm, dismissSeedId } from './db';
import { startAutoBackupEngine } from './utils/autoBackup';
import {
  Note,
  Lab,
  GlossaryTerm,
  ActiveSection,
  ImportSummary,
  LabDifficulty,
  LabStatus,
  LabPart,
  GlossaryExample,
  PlatformItem,
  CategoryItem,
  ToolItem,
  ReferenceItem,
} from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { VaultErrorBoundary } from './components/VaultErrorBoundary';
// Type-only import (erased at build time) — keeps the deep-link contract with
// the lazily-loaded ToolsView chunk without pulling it into the shell bundle.
import type { ToolDeepLink } from './components/ToolsView';
// PERF (shell slimming): zipBackup arrastra JSZip + DOMPurify + zod +
// file-saver al bundle del shell para handlers que solo corren cuando el
// usuario exporta/importa un backup. Se importa dinámicamente en el handler
// (mismo módulo cacheado ⇒ instanceof de las clases de error sigue válido).
import { deletePdfEverywhere } from './utils/pdfStorage';
import { useNoteStore } from './store/noteStore';
// LIMPIEZA V13 → V17.1: los stores de navegación de los 4 simuladores
// (useHelpdeskStore/useSysadminStore/useSocStore/useIamStore) volvieron al
// shell con un consumer REAL: el deep-link de tickets desde Ctrl+K
// (selecciona el ticket y navega al simulador). Las vistas siguen
// consumiéndolos para la selección de tickets.
import { useIamStore } from './store/iamStore';
import { useSocStore } from './store/socStore';
import { useHelpdeskStore } from './store/helpdeskStore';
import { useSysadminStore } from './store/sysadminStore';
// R6 — hook genérico del patrón "derived state during render" que antes
// vivía inline x3 (notas / labs / glosario) en este mismo componente.
import { useDefaultSelection } from './hooks/useDefaultSelection';

/* ------------------------------------------------------------------ */
/* PERFORMANCE (code-splitting pass):                                  */
/* The initial route now ships ONLY the shell (Sidebar + Header +      */
/* error boundary). Every view is a separate chunk loaded on demand   */
/* via next/dynamic, and the modals only mount (and load their        */
/* chunk) when opened. The 35 tools travel together inside the lazy   */
/* ToolsView chunk — the tool module graph itself stays STATIC inside  */
/* that chunk on purpose: Turbopack's dev runtime loses track of ~20  */
/* separate per-tool dynamic factories after a dev-server restart     */
/* (VN-F-003, "module factory is not available"). See the             */
/* HMR-ROBUSTNESS note in ToolsView.tsx.                              */
/* ------------------------------------------------------------------ */

/* BLOQUE 5 — gate de los atajos de teclado: true si el foco está en un
 * campo de texto (input/textarea/select/contenteditable). Función pura
 * a nivel de módulo (sin estado del componente) — el linter del React
 * Compiler exige declararla antes de su uso en los efectos de abajo. */
const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
};

const ViewLoader = () => (
  <div className="flex-1 flex items-center justify-center" role="status" aria-label="Cargando vista">
    <div className="flex flex-col items-center gap-3">
      <div className="w-6 h-6 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
      <p className="text-[11px] font-mono text-[#828282]">Cargando…</p>
    </div>
  </div>
);

const DashboardView = dynamic(() => import('./components/DashboardView').then((m) => m.DashboardView), { ssr: false, loading: ViewLoader });
const NotesView = dynamic(() => import('./components/NotesView').then((m) => m.NotesView), { ssr: false, loading: ViewLoader });
const LabsView = dynamic(() => import('./components/LabsView').then((m) => m.LabsView), { ssr: false, loading: ViewLoader });
const GlossaryView = dynamic(() => import('./components/GlossaryView').then((m) => m.GlossaryView), { ssr: false, loading: ViewLoader });
// PERFIL PROFESIONAL (v17) — editor del CV + export Markdown AI-ready.
const ProfileView = dynamic(() => import('./components/ProfileView').then((m) => m.ProfileView), { ssr: false, loading: ViewLoader });
// ROADMAP (v18) — checklist del roadmap Junior IAM con progreso persistente.
const RoadmapView = dynamic(() => import('./components/RoadmapView').then((m) => m.RoadmapView), { ssr: false, loading: ViewLoader });
// HELPDESK (v19) — simulador Service Desk (cola de tickets + proyecto final + KB).
const HelpDeskView = dynamic(() => import('./components/HelpDeskView').then((m) => m.HelpDeskView), { ssr: false, loading: ViewLoader });
// SYSADMIN (v21) — simulador de Infraestructura & Operaciones (espejo del
// Service Desk: cola de tickets de guardia + semana de guardia + KB).
const SysAdminView = dynamic(() => import('./components/SysAdminView').then((m) => m.SysAdminView), { ssr: false, loading: ViewLoader });
// SOC (v9 simulador) — simulador del Blue Team: cola de casos con torre
// de detección + proyecto final "primera semana SOC" + KB.
const SocView = dynamic(() => import('./components/SocView').then((m) => m.SocView), { ssr: false, loading: ViewLoader });
// IAM (V11 · PILAR 1) — simulador de Identity & Access Management (espejo
// de los otros simuladores: cola de tickets + Semana de Access Review + KB).
const IamView = dynamic(() => import('./components/IamView').then((m) => m.IamView), { ssr: false, loading: ViewLoader });
const BlogView = dynamic(() => import('./components/BlogView').then((m) => m.BlogView), { ssr: false, loading: ViewLoader });
const ToolsView = dynamic(() => import('./components/ToolsView').then((m) => m.ToolsView), { ssr: false, loading: ViewLoader });
// Comandos más usados de HelpDesk / IAM / SOC (dataset estático, sin Dexie).
const CommandsView = dynamic(() => import('./components/CommandsView').then((m) => m.CommandsView), { ssr: false, loading: ViewLoader });
const ReferencesView = dynamic(() => import('./components/ReferencesView').then((m) => m.ReferencesView), { ssr: false, loading: ViewLoader });
const TrashView = dynamic(() => import('./components/TrashView').then((m) => m.TrashView), { ssr: false, loading: ViewLoader });
const SettingsView = dynamic(() => import('./components/SettingsView').then((m) => m.SettingsView), { ssr: false, loading: ViewLoader });
const InboxView = dynamic(() => import('./components/InboxView').then((m) => m.InboxView), { ssr: false, loading: ViewLoader });
// V6 FASE 4 — runbooks universales (datasets estáticos, sin Dexie).
// V11 — el CheatSheet se fusionó dentro de Runbooks (el usuario prefiere
// esa presentación): los quick-fixes ex-CS viven en los datasets RB-*.
const RunbooksView = dynamic(() => import('./components/RunbooksView').then((m) => m.RunbooksView), { ssr: false, loading: ViewLoader });
// V9 — Troubleshooting por pilar (escaleras de decisión).
const TroubleshootingView = dynamic(() => import('./components/TroubleshootingView').then((m) => m.TroubleshootingView), { ssr: false, loading: ViewLoader });

/* Modals — mounted (and chunk-loaded) only while open. */
const ModalLoader = () => null;
const GlobalSearchModal = dynamic(() => import('./components/GlobalSearchModal').then((m) => m.GlobalSearchModal), { ssr: false, loading: ModalLoader });
const NewItemModal = dynamic(() => import('./components/NewItemModal').then((m) => m.NewItemModal), { ssr: false, loading: ModalLoader });
const QuickCaptureModal = dynamic(() => import('./components/QuickCaptureModal').then((m) => m.QuickCaptureModal), { ssr: false, loading: ModalLoader });
const ShortcutsDialog = dynamic(() => import('./components/ShortcutsDialog').then((m) => m.ShortcutsDialog), { ssr: false, loading: ModalLoader });
const AddToNoteModal = dynamic(() => import('./components/AddToNoteModal').then((m) => m.AddToNoteModal), { ssr: false, loading: ModalLoader });
const ImportReportModal = dynamic(() => import('./components/ImportReportModal').then((m) => m.ImportReportModal), { ssr: false, loading: ModalLoader });

// Referentially-stable empty-array fallbacks for the useLiveQuery results
// below (Dexie returns `undefined` while the first query is in flight).
// Inline `|| []` would create a fresh array on every render and make every
// downstream useMemo/useEffect dep churn (react-hooks/exhaustive-deps).
const EMPTY_NOTES: Note[] = [];
const EMPTY_LABS: Lab[] = [];
const EMPTY_GLOSSARY: GlossaryTerm[] = [];
const EMPTY_PLATFORMS: PlatformItem[] = [];
const EMPTY_CATEGORIES: CategoryItem[] = [];
const EMPTY_TOOLS: ToolItem[] = [];
const EMPTY_REFERENCES: ReferenceItem[] = [];

/* ------------------------------------------------------------------ */
/* BOOTSTRAP (R6): helpers de módulo extraídos del useEffect original  */
/* (~140 líneas, 5 concerns mezclados) para que el efecto lea como una */
/* orquestación corta. Comportamiento EXACTO preservado: early-return  */
/* de dev, contrato del cleanup, guard de reload y nombres de listeners.*/
/* ------------------------------------------------------------------ */

/** AUDIT FIX (VN-AUD-002): la migración v15 (REGLA DE ORO de videos)
 *  elimina la tabla `videos` de IndexedDB. Los blobs que solo vivieron
 *  ahí (nunca migrados a la carpeta del usuario) son irrecuperables —
 *  la migración escribe el conteo en localStorage y ESTE código lo
 *  muestra como alerta de UNA sola vez (console.warn solo es invisible
 *  para el usuario). Los archivos de carpeta y los embeds existentes
 *  no se tocan. */
function reportDiscardedVideos(): void {
  try {
    const raw = window.localStorage.getItem('vaultnotes-v15-discarded-videos');
    if (raw !== null) {
      window.localStorage.removeItem('vaultnotes-v15-discarded-videos'); // one-time
      const count = parseInt(raw, 10);
      if (Number.isFinite(count) && count > 0) {
        alert(
          `Migración a la versión 15 completada (REGLA DE ORO de videos).\n\n` +
          `${count} video(s) que SOLO existían en la base de datos del navegador se ` +
          `han descartado: nunca se migraron a tu carpeta de videos y no es posible ` +
          `recuperarlos desde la app.\n\n` +
          `Los archivos de tu carpeta de videos NO se han tocado y los videos ya ` +
          `insertados en notas siguen funcionando con normalidad.`
        );
      }
    }
  } catch {
    /* localStorage unavailable — the console.warn in the migration remains */
  }
}

/** DEV — NUNCA ejecutar el service worker, sin importar el hostname.
 *  Por qué importa el hostname: el SW detecta dev vía `localhost`, pero la
 *  app dev también es alcanzable por hostnames de proxy (paneles de
 *  preview), donde el SW correría en "modo prod": cache-first para los
 *  chunks. Las URLs de chunk de Turbopack dev son ESTABLES entre
 *  reinicios del servidor (p. ej. src_vault_App_tsx_d14bda49._.js), así
 *  que un SW cacheado sirve CUERPOS de chunk STALE para las MISMAS urls
 *  tras cada reinicio — un grafo de módulos mixto que muere con "module
 *  factory is not available" y SOBREVIVE a los reloads manuales.
 *  Se hace unregister + wipe de caches + un reload guardado (la guard
 *  evita cualquier loop de recarga). */
function cleanupDevServiceWorker(): void {
  (async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      const stale = regs.filter((r) => r.active?.scriptURL?.endsWith('/sw.js'));
      if (stale.length > 0) {
        await Promise.all(stale.map((r) => r.unregister()));
        if (typeof window.caches !== 'undefined') {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        // Escape the (now-unregistered but still controlling) SW with
        // one guarded reload; the guard prevents any reload loop.
        const KEY = '__vault_sw_heal_ts';
        const last = Number(window.sessionStorage.getItem(KEY) ?? 0);
        if (Date.now() - last > 30_000) {
          window.sessionStorage.setItem(KEY, String(Date.now()));
          window.location.reload();
        }
      }
    } catch {
      /* storage/SW edge cases (sandboxed iframe etc.) — ignore */
    }
  })();
}

/** PROD — registra el PWA service worker (offline-first del shell) y
 *  escucha sus actualizaciones para que el usuario vea el nuevo shell
 *  de inmediato (en vez de quedarse clavado en una versión cacheada).
 *  Devuelve la función de cleanup (removeEventListener de los dos
 *  listeners con nombre) para el contrato del useEffect. */
function registerProdServiceWorker(): () => void {
  // If a registration exists but is for an OLD sw.js (detected via
  // the scriptURL or just by version mismatch), unregister it so
  // the new one takes over on next navigation.
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => {
      // scriptURL ends with '/sw.js' for the current one. We just
      // force-update all of them — the new SW re-registers below.
      for (const reg of regs) {
        const scriptURL = reg.active && reg.active.scriptURL;
        if (scriptURL && scriptURL.endsWith('/sw.js')) {
          reg.update().catch(() => undefined);
        }
      }
    })
    .catch(() => undefined);

  // Named handlers so the useEffect cleanup can removeEventListener them.
  // (Audit Task 2-a MEDIUM: previously anonymous listeners were registered
  // inside the .then() closure and never removed — a dev-only HMR
  // duplicate-listener risk, but cleanup is correct hygiene.)
  let reloaded = false;
  const onControllerChange = () => {
    if (!reloaded) {
      reloaded = true;
      // Defer the reload so the SW activate finishes first.
      setTimeout(() => window.location.reload(), 50);
    }
  };
  const onMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === 'SW_UPDATED') {
      console.info('[VaultNotes] Service worker updated to cache', event.data.cache);
    }
  };

  navigator.serviceWorker
    .register('/sw.js', { updateViaCache: 'none' })
    .then(() => {
      // When a new SW takes over, force a one-time reload so the user
      // immediately gets the new shell. Without this, the user would
      // see the OLD app until the next navigation/reload.
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
      }
    })
    .catch((err) => {
      console.warn('Service worker registration failed:', err);
    });

  // Listen for the SW_UPDATED message from the SW so we can show a
  // toast / force-reload if needed.
  navigator.serviceWorker.addEventListener('message', onMessage);

  // Cleanup: remove both listeners on unmount (dev HMR + strict-mode
  // double-mount safety).
  return () => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      navigator.serviceWorker.removeEventListener('message', onMessage);
    }
  };
}

/* ------------------------------------------------------------------ */
/* R6 — tablas de módulo que colapsan cadenas if/else duplicadas.       */
/* ------------------------------------------------------------------ */

// BLOQUE 5 — atajos de herramientas (Ctrl+Shift+<letra>): letra → toolId
// del deep-link (entryId === toolId en los 5 casos). Las ramas q/n/l del
// atajo se mantienen explícitas abajo porque hacen cosas distintas.
const TOOL_SHORTCUTS: Record<string, ToolDeepLink['toolId']> = {
  i: 'ioc',
  t: 'timestamp',
  h: 'hash',
  r: 'regex',
  m: 'mitre',
};

// V17.1 — deep-link de tickets de simulador desde Ctrl+K: pilar → (store
// zustand, sección destino). R1 dejó los 4 stores como wrappers de la
// fábrica createTicketSelectionStore — .getState() funciona igual.
const SIM_TICKET_TARGETS = {
  iam: { store: useIamStore, section: 'iam' },
  soc: { store: useSocStore, section: 'soc' },
  hd: { store: useHelpdeskStore, section: 'helpdesk' },
  sa: { store: useSysadminStore, section: 'sysadmin' },
} as const;

// ROADMAP (v18/v19/v21/v9) — sección → variante de RoadmapView. La sección
// 'roadmap' es la variante IAM POR DEFECTO (sin prop); las otras tres son
// las especializaciones. Partial + `in` permite distinguir "sección de
// roadmap con variante undefined" de "sección que no es de roadmap".
const ROADMAP_SECTIONS: Partial<Record<ActiveSection, 'iam' | 'hd' | 'sa' | 'soc'>> = {
  roadmap: undefined, // roadmap base = variante IAM (prop ausente)
  'roadmap-hd': 'hd',
  'roadmap-sa': 'sa',
  'roadmap-soc': 'soc',
};

// V6 FASE 4 / V11 — sección de runbooks → pilar (pillar desde el sufijo).
const RUNBOOKS_SECTIONS: Partial<Record<ActiveSection, 'hd' | 'sa' | 'soc' | 'iam'>> = {
  'runbooks-hd': 'hd',
  'runbooks-sa': 'sa',
  'runbooks-soc': 'soc',
  'runbooks-iam': 'iam',
};

// V9 — sección de troubleshooting → pilar (escaleras de decisión).
const TROUBLESHOOTING_SECTIONS: Partial<Record<ActiveSection, 'hd' | 'sa' | 'soc' | 'iam'>> = {
  'troubleshooting-hd': 'hd',
  'troubleshooting-sa': 'sa',
  'troubleshooting-soc': 'soc',
  'troubleshooting-iam': 'iam',
};

// R6 — criterio de selección por defecto de notas: primero una raíz (sin
// parentId) y, si no hay, cualquier nota activa (mismo criterio inline
// original; labs y glosario usan el pick por defecto del hook).
const pickDefaultNote = (notes: Note[]): Note | undefined =>
  notes.find((n) => !n.isDeleted && !n.parentId) || notes.find((n) => !n.isDeleted);

export default function App() {
  // Initialize / seed the local vault database once on mount (browser only).
  // R6: la maquinaria vive en los helpers de módulo (arriba) — el efecto es
  // solo la orquestación: backup engine + init DB + alerta v15 + SW (dev|prod).
  useEffect(() => {
    // AUTO-BACKUP (USB workflow): silent engine — only acts when the user
    // enabled it in Configuración → Respaldo automático. Idempotent.
    startAutoBackupEngine();
    initializeDatabase()
      .then(() => reportDiscardedVideos())
      .catch((err) => {
        console.error('Failed to initialize vault database:', err);
      });
    // Register the PWA service worker for offline-first shell caching.
    // Also listen for SW updates so the user immediately sees the new shell
    // (instead of being stuck on a stale cached version of the app).
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      // DEV — unregister + wipe + guarded reload (ver cleanupDevServiceWorker).
      if (process.env.NODE_ENV === 'development') {
        cleanupDevServiceWorker();
        return; // no SW registration in dev, no listeners to clean up
      }

      // PROD — registro + listeners; el cleanup se devuelve para el efecto.
      return registerProdServiceWorker();
    }
  }, []);

  // PERFORMANCE (code-splitting pass): after first paint, warm the global
  // search chunk (fuzzy index + offline datasets) during browser idle time
  // so the first Ctrl+K opens instantly — without weighing down the initial
  // shell load. Shares the exact module/chunk with the dynamic() above.
  useEffect(() => {
    const warm = () => {
      void import('./components/GlobalSearchModal');
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(warm, { timeout: 3000 });
    } else {
      setTimeout(warm, 1500);
    }
  }, []);

  // 1. Reactive Dexie queries
  // NOTE: module-level EMPTY_* fallbacks (instead of inline `|| []`) keep the
  // results referentially stable while Dexie is still loading (undefined),
  // so downstream useMemo/useEffect deps don't change on every render.
  const notes = useLiveQuery(() => db.notes.toArray(), []) ?? EMPTY_NOTES;
  const labs = useLiveQuery(() => db.labs.toArray(), []) ?? EMPTY_LABS;
  const glossary = useLiveQuery(() => db.glossary.toArray(), []) ?? EMPTY_GLOSSARY;
  const platforms = useLiveQuery(() => db.platforms.toArray(), []) ?? EMPTY_PLATFORMS;
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? EMPTY_CATEGORIES;
  const tools = useLiveQuery(() => db.tools.toArray(), []) ?? EMPTY_TOOLS;
  const references = useLiveQuery(() => db.references.toArray(), []) ?? EMPTY_REFERENCES;

  // Active UI Navigation state
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // FIX-3d — Drawer de navegación en móvil (< md). En escritorio el sidebar
  // es persistente y este estado no tiene efecto visual.
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [newItemTab, setNewItemTab] = useState<'note' | 'lab' | 'glossary'>('note');
  const [newItemPlatform, setNewItemPlatform] = useState<string>('');
  const [newItemContent, setNewItemContent] = useState<string>('');
  // Pending Inbox→Note/Glossary conversion: when set, the next successful
  // handleCreateNote/handleCreateGlossaryTerm call marks this inbox item as
  // converted. Cleared on completion or when the modal closes without creation.
  const [pendingInboxConvert, setPendingInboxConvert] = useState<{ inboxItemId: string; targetType: 'note' | 'glossary' } | null>(null);
  // Quick Capture modal (Ctrl+Shift+Q) — writes plain text to the inbox.
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  // V17.1 — ayuda de atajos dentro de la app (Ctrl+K → "Ver atajos de teclado").
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // PERFORMANCE (cleanup pass): stable callbacks for the memoized Sidebar /
  // Header chrome — without these, every App re-render (each live-query
  // emission, i.e. every autosave flush) would recreate the handlers and
  // defeat React.memo. State setters are referentially stable.
  const handleSelectSection = useCallback((section: ActiveSection) => {
    setActiveSection(section);
    // Al navegar desde el drawer móvil, se cierra (en escritorio no tiene efecto).
    setMobileSidebarOpen(false);
  }, []);
  const handleCloseMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);
  const handleOpenSearch = useCallback(() => setIsSearchOpen(true), []);
  const handleOpenMobileSidebar = useCallback(() => setMobileSidebarOpen(true), []);
  const handleOpenQuickCapture = useCallback(() => setIsQuickCaptureOpen(true), []);
  // R6 — ÚNICO punto de entrada al modal de nuevo ítem (los 4 sitios que
  // duplicaban la secuencia de setters: Header, Ctrl+Shift+N, paleta de
  // comandos y Dashboard). `clearPendingConvert = false` reproduce
  // EXACTAMENTE las ramas de atajo/paleta, que NO limpiaban una
  // conversión Inbox pendiente (ver handleOpenNewItem original).
  const openNewItemModal = useCallback(
    (tab?: 'note' | 'lab' | 'glossary', platform = '', clearPendingConvert = true) => {
      if (tab) setNewItemTab(tab);
      setNewItemPlatform(platform);
      setNewItemContent('');
      if (clearPendingConvert) setPendingInboxConvert(null);
      setIsNewItemOpen(true);
    },
    []
  );
  // R6 — navegación reutilizable: los mismos arrows inline (cuerpo
  // idéntico) estaban duplicados entre Dashboard, búsqueda global y los
  // saltos entre vistas (glosario → nota, modal → sección, etc.).
  const handleOpenNote = useCallback((noteId: string) => {
    setSelectedNoteId(noteId);
    setActiveSection('notes');
  }, []);
  const handleOpenLab = useCallback((labId: string) => {
    setSelectedLabId(labId);
    setActiveSection('labs');
  }, []);
  const handleOpenGlossaryTerm = useCallback((termId: string) => {
    setSelectedTermId(termId);
    setActiveSection('glossary');
  }, []);

  // Deep-link into the Tools view — when set, ToolsView switches the active
  // tool and auto-opens the entry matching `entryId`. Cleared after consumption.
  const [pendingTool, setPendingTool] = useState<ToolDeepLink | null>(null);
  // V6 FASE 4 — deep-links de runbook desde Ctrl+K (mismo patrón que
  // pendingTool): la vista consume el id al montar y limpia el estado.
  const [pendingRunbookId, setPendingRunbookId] = useState<string | null>(null);
  // V9 — deep-links de guías de troubleshooting por pilar (TS-XX-NNN).
  const [pendingTroubleshootingId, setPendingTroubleshootingId] = useState<string | null>(null);
  // Comandos — deep-link desde Ctrl+K (CMD-XX-NNN → sección Comandos).
  const [pendingCommandId, setPendingCommandId] = useState<string | null>(null);

  // LIMPIEZA V13: retirada la cadena `navigateRequest` de los 4 stores de
  // simuladores (requestNavigate jamás tenía callers y sus efectos aquí
  // nunca disparaban — código muerto documentado en falso). La navegación
  // sigue siendo onSelectSection; selectTicket sigue vivo para la
  // selección del ticket dentro de cada vista.

  // Selección inicial (nota/lab/término): patrón "derived state during
  // render" de React (ajustar estado durante el render con guard de valor
  // previo) — sin efecto y sin render en cascada (regla set-state-in-effect
  // del React Compiler, eslint-config-next 16.4.5). Se recalcula solo
  // cuando cambia la colección; respeta una selección explícita del
  // usuario y repone una si la seleccionada desaparece con la colección.
  // R6: el patrón (idéntico x3) vive ahora en useDefaultSelection — notas
  // con pick propio (raíz primero), labs y glosario con el pick por defecto.
  useDefaultSelection(notes, selectedNoteId, setSelectedNoteId, pickDefaultNote);
  useDefaultSelection(labs, selectedLabId, setSelectedLabId);
  useDefaultSelection(glossary, selectedTermId, setSelectedTermId);

  // BLOQUE 5 — Global Keyboard Shortcuts.
  // Existing: Ctrl+K (search), Ctrl+Shift+Q (quick capture).
  // New: Ctrl+Shift+N (new note), Ctrl+Shift+L (new lab),
  //      Ctrl+Shift+I (IoC Extractor), Ctrl+Shift+T (Timestamp),
  //      Ctrl+Shift+H (Hash Toolkit), Ctrl+Shift+R (Regex Tester),
  //      Ctrl+Shift+M (MITRE).
  // All shortcuts are GATED by `isTypingTarget()` — they only fire when the
  // user is NOT typing in an input/textarea/contenteditable. They never
  // interfere with the browser's own shortcuts (we require Ctrl+Shift, not
  // just Ctrl, to avoid clobbering common browser bindings like Ctrl+T).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      // Ctrl+K / Cmd+K — always works, even inside inputs.
      if (!e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      // All Ctrl+Shift+<letter> shortcuts are disabled while typing.
      if (!e.shiftKey) return;
      if (isTypingTarget(e.target)) return;

      const letter = e.key.toLowerCase();
      if (letter === 'q') {
        e.preventDefault();
        setIsQuickCaptureOpen(true);
      } else if (letter === 'n') {
        e.preventDefault();
        // Misma secuencia exacta que la rama original: tab 'note', reset
        // de plataforma/contenido y SIN limpiar pendingInboxConvert.
        openNewItemModal('note', '', false);
      } else if (letter === 'l') {
        e.preventDefault();
        setNewItemTab('lab');
        setIsNewItemOpen(true);
      } else {
        // BLOQUE 5 — atajos de herramientas (i/t/h/r/m), table-driven:
        // letra → toolId (entryId === toolId en los 5 deep-links).
        const toolId = TOOL_SHORTCUTS[letter];
        if (toolId) {
          e.preventDefault();
          setPendingTool({ toolId, entryId: toolId });
          setActiveSection('tools');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openNewItemModal]);

  // Filtered lists
  const activeNotes = useMemo(() => notes.filter((n) => !n.isDeleted), [notes]);
  const deletedNotes = useMemo(() => notes.filter((n) => n.isDeleted), [notes]);
  const activeLabs = useMemo(() => labs.filter((l) => !l.isDeleted), [labs]);
  const deletedLabs = useMemo(() => labs.filter((l) => l.isDeleted), [labs]);
  const activeTerms = useMemo(() => glossary.filter((g) => !g.isDeleted), [glossary]);
  const deletedTerms = useMemo(() => glossary.filter((g) => g.isDeleted), [glossary]);
  const activeReferences = useMemo(() => references.filter((r) => !r.isDeleted), [references]);
  // Top-level notes only (sidebar count) — memoized so any App re-render
  // (modals, toasts, typing-driven re-emissions) doesn't re-scan the array.
  const rootNotesCount = useMemo(() => activeNotes.filter((n) => !n.parentId).length, [activeNotes]);

  // Note CRUD Actions
  const handleCreateNote = async (data: {
    title: string;
    platform: string;
    category: string;
    categories?: string[];
    sourceUrl?: string;
    contentHtml?: string;
  }) => {
    const newNoteId = `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newNote: Note = {
      id: newNoteId,
      parentId: null,
      title: data.title,
      platform: data.platform,
      category: data.category,
      categories: data.categories || [data.category],
      sourceUrl: data.sourceUrl || undefined,
      contentHtml: data.contentHtml || `
        <h1>${data.title}</h1>
        <p>Escribe aquí tus apuntes, comandos, checklists o pega capturas con <kbd>Ctrl+V</kbd>.</p>
      `,
      isFavorite: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.notes.add(newNote);
    setSelectedNoteId(newNoteId);
    setActiveSection('notes');

    // BLOQUE 5 — Inbox conversion: if this create came from a "Convert to Note"
    // action in the Inbox, mark the source inbox item as converted.
    if (pendingInboxConvert && pendingInboxConvert.targetType === 'note') {
      try {
        await db.inboxItems.update(pendingInboxConvert.inboxItemId, {
          convertedTo: 'note',
          convertedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Inbox conversion update failed (non-fatal):', e);
      }
      setPendingInboxConvert(null);
      setNewItemContent('');
    }
  };

  const handleCreateSubnote = async (parentId: string) => {
    const parent = notes.find((n) => n.id === parentId);
    if (!parent) return;

    const newNoteId = `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newNote: Note = {
      id: newNoteId,
      parentId,
      title: 'Nueva subpágina',
      platform: '',
      category: parent.category || '',
      categories: parent.categories,
      contentHtml: `<p>Escribe aquí, o pega imágenes con <kbd>Ctrl+V</kbd>.</p>`,
      isFavorite: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.notes.add(newNote);
    setSelectedNoteId(newNoteId);
  };

  // Cross-tool "Add to Note" hand-off (BLOQUE 5 spec #4): tools (Log Parser,
  // PowerShell Analyzer, Command Line Analyzer, CVSS Calculator, File Hash
  // Analyzer, Linux Permissions, …) call `useNoteStore.getState().enqueueNote
  // (title, html)`. Instead of immediately creating a new note, App opens the
  // `<AddToNoteModal>` so the user can CHOOSE between creating a brand-new
  // note or appending the content to an existing note's `contentHtml`.
  // 100% offline.
  const pendingNote = useNoteStore((s) => s.pendingNote);
  const clearPendingNote = useNoteStore((s) => s.clearPending);

  // Modal opens whenever a tool stages a pending add-to-note request.
  const isAddToNoteOpen = pendingNote !== null;

  // "Crear nota nueva" — preserve the old flow (create a top-level note with
  // the pending title + content, switch to the notes view) and close the modal.
  const handleCreateNewNote = () => {
    if (!pendingNote) return;
    const pending = pendingNote;
    void handleCreateNote({
      title: pending.title,
      platform: '',
      category: '',
      contentHtml: pending.contentHtml,
    })
      // R6 — .finally NO captura rechazos: sin este .catch, una creación
      // fallida (p. ej. IndexedDB bloqueada) dejaba una promesa rechazada
      // sin manejar. Se loguea y SIEMPRE se limpia el pending del store.
      .catch((err) => {
        console.error('AddToNote: create new note failed:', err);
      })
      .finally(() => clearPendingNote());
  };

  // "Añadir a nota existente" — append `<hr/><h2>title</h2>` + contentHtml to
  // the existing note, bump updatedAt, select it, switch to the notes view,
  // and close the modal.
  const handleAppendToExistingNote = async (noteId: string) => {
    if (!pendingNote) return;
    const pending = pendingNote;
    try {
      const existing = await db.notes.get(noteId);
      if (!existing) {
        console.warn('AddToNote: target note not found:', noteId);
        return;
      }
      const separator = '<hr/>';
      const heading = `<h2>${pending.title}</h2>`;
      const newContent = `${existing.contentHtml || ''}${separator}${heading}${pending.contentHtml}`;
      await db.notes.update(noteId, {
        contentHtml: newContent,
        updatedAt: new Date().toISOString(),
      });
      setSelectedNoteId(noteId);
      setActiveSection('notes');
    } catch (e) {
      console.warn('AddToNote: append to existing failed:', e);
    } finally {
      clearPendingNote();
    }
  };

  const handleCloseAddToNote = () => {
    clearPendingNote();
  };

  const handleUpdateNote = useCallback(async (noteId: string, updated: Partial<Note>) => {
    await db.notes.update(noteId, {
      ...updated,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  // Recursively collect all descendant subnote ids so trash/restore/delete cascade properly
  const collectDescendantIds = (rootId: string): string[] => {
    const result: string[] = [];
    const stack = [rootId];
    while (stack.length > 0) {
      const currentId = stack.pop()!;
      const children = notes.filter((n) => n.parentId === currentId);
      children.forEach((c) => {
        result.push(c.id);
        stack.push(c.id);
      });
    }
    return result;
  };

  const handleDeleteNote = async (noteId: string) => {
    const idsToTrash = [noteId, ...collectDescendantIds(noteId)];
    const now = new Date().toISOString();
    // AUDIT VN-A-005: single bulk modify inside ONE transaction instead of a
    // sequential await loop (N round-trips, non-atomic — a tab close mid-loop
    // left half-trashed subtrees). Same fields / timestamp semantics.
    await db.transaction('rw', db.notes, async () => {
      await db.notes.where('id').anyOf(idsToTrash).modify({ isDeleted: true, deletedAt: now, updatedAt: now });
    });
    const remaining = activeNotes.filter((n) => !idsToTrash.includes(n.id) && !n.parentId);
    if (remaining.length > 0) {
      setSelectedNoteId(remaining[0].id);
    } else {
      setSelectedNoteId(null);
    }
  };

  const handleRestoreNote = async (noteId: string) => {
    const idsToRestore = [noteId, ...collectDescendantIds(noteId)];
    const now = new Date().toISOString();
    // AUDIT VN-A-005: bulk modify in one transaction (was a sequential loop).
    // AUDIT VN-A-004: also clear the stale `deletedAt` (Dexie removes the key
    // when a property is set to undefined) so restored notes no longer carry
    // a tombstone timestamp that propagates through backup exports.
    await db.transaction('rw', db.notes, async () => {
      await db.notes.where('id').anyOf(idsToRestore).modify({ isDeleted: false, deletedAt: undefined, updatedAt: now });
    });
  };

  const handlePermanentDeleteNote = async (noteId: string) => {
    const idsToDelete = [noteId, ...collectDescendantIds(noteId)];
    // Clean up embedded media owned by these notes (images + PDFs).
    // REGLA DE ORO (videos): videos are NOT app-owned anymore — they live
    // only as files in the user's videos folder, so permanent deletes never
    // touch them (no IDB rows exist, and the disk files are the user's).
    const ownedPdfMetas = await db.pdfs.where('noteId').anyOf(idsToDelete).toArray();
    // AUDIT VN-A-002 (transactional permanent delete): ALL IDB row deletions
    // (note + descendants + their image/PDF metadata rows) happen in
    // ONE db.transaction so they commit atomically. Previously the note rows
    // were deleted first and the blob rows after — closing the tab mid-cleanup
    // left orphaned blobs in IndexedDB forever.
    await db.transaction('rw', [db.notes, db.images, db.pdfs], async () => {
      await db.notes.bulkDelete(idsToDelete);
      // Images have no disk-side copy — straight IDB delete is safe.
      await db.images.where('noteId').anyOf(idsToDelete).delete();
      await db.pdfs.where('noteId').anyOf(idsToDelete).delete();
    });
    // Disk / FSA cleanup runs AFTER the transaction commits: these helpers mix
    // Dexie + File System Access awaits (permission queries, removeEntry),
    // which would abort a live Dexie transaction. Failures swallowed — disk
    // files are benign orphans, IDB rows are not.
    for (const p of ownedPdfMetas) {
      await deletePdfEverywhere(p.id).catch(() => undefined);
    }
  };

  // Labs CRUD Actions
  const handleCreateLab = async (data?: {
    title: string;
    organization: string;
    topic: string;
    categories?: string[];
    subtopic?: string;
    difficulty: LabDifficulty;
    status: LabStatus;
    timeSpent?: string;
    sourceLink?: string;
    tools: string[];
    parts?: LabPart[];
  }) => {
    // AUDIT VN-A-001: entropy suffix — plain Date.now() collides when
    // multiple items are created in the same millisecond.
    const newLabId = `lab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const newLab: Lab = {
      id: newLabId,
      title: data?.title || 'Nuevo Lab Práctico',
      organization: data?.organization || 'LetsDefend',
      topic: data?.topic || 'SOC Tier 1 - Triage',
      categories: data?.categories || [data?.topic || 'SOC Tier 1 - Triage'],
      subtopic: data?.subtopic || '',
      difficulty: data?.difficulty || 'Media',
      status: data?.status || 'No iniciado',
      timeSpent: data?.timeSpent || '30m',
      sourceLink: data?.sourceLink || '',
      parts: data?.parts && data.parts.length > 0 ? data.parts : [
        {
          id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 10)}-1`,
          title: 'Parte 1 - Recolección de Evidencia y Contexto',
          content: '<p>Documenta aquí los hallazgos iniciales, comandos ejecutados o adjunta capturas.</p>',
          isCompleted: false,
        }
      ],
      tools: data?.tools && data.tools.length > 0 ? data.tools : ['Wireshark', 'VirusTotal'],
      commands: [],
      findings: 'Documenta aquí las alertas analizadas o artefactos encontrados.',
      mitigation: 'Acciones de contención, bloqueo de IoCs o remediación recomendada.',
      isFavorite: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.labs.add(newLab);
    setSelectedLabId(newLabId);
    setActiveSection('labs');
  };

  const handleUpdateLab = useCallback(async (labId: string, updated: Partial<Lab>) => {
    await db.labs.update(labId, {
      ...updated,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const handleDeleteLab = async (labId: string) => {
    await db.labs.update(labId, {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const remaining = activeLabs.filter((l) => l.id !== labId);
    if (remaining.length > 0) {
      setSelectedLabId(remaining[0].id);
    } else {
      setSelectedLabId(null);
    }
  };

  const handleRestoreLab = async (labId: string) => {
    // AUDIT VN-A-004: clear the stale `deletedAt` too (Dexie removes the key
    // when a property is set to undefined) — a restored lab must not carry a
    // tombstone timestamp into backup exports.
    await db.labs.update(labId, {
      isDeleted: false,
      deletedAt: undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  const handlePermanentDeleteLab = async (labId: string) => {
    // LAB TEMPLATES HELPDESK (v19): si es un lab sembrado (id 'labhd-*'),
    // registrar el dismissal para que el seed NO lo reviva en el próximo
    // arranque (mismo patrón que dismissSeedTerm del glosario).
    if (labId.startsWith('labhd-')) dismissSeedId('helpdeskLab', labId);
    // Clean up embedded media owned by this lab.
    // BLOB LIFECYCLE FIX (Task 2-c — same fix as handlePermanentDeleteNote):
    // fetch metas BEFORE deleting IDB rows so disk files are also removed.
    // Plus: the previous code called `db.images.where('labId').equals(labId)`
    // but the `images` table had no `labId` index — that threw SchemaError
    // and aborted the whole cleanup. Now the v14 schema adds `labId` to
    // `images`, so this call succeeds.
    const ownedPdfMetas = await db.pdfs.where('labId').equals(labId).toArray();
    // AUDIT VN-A-002: all IDB row deletions (lab + image/PDF metadata)
    // in ONE atomic transaction — no orphaned blob rows if the tab closes
    // mid-cleanup. (REGLA DE ORO: videos no longer have IDB rows.)
    await db.transaction('rw', [db.labs, db.images, db.pdfs], async () => {
      await db.labs.delete(labId);
      await db.images.where('labId').equals(labId).delete();
      await db.pdfs.where('labId').equals(labId).delete();
    });
    // Disk / FSA cleanup AFTER the transaction (mixed Dexie+FSA helpers —
    // see handlePermanentDeleteNote). Failures swallowed.
    for (const p of ownedPdfMetas) {
      await deletePdfEverywhere(p.id).catch(() => undefined);
    }
  };

  // Glossary CRUD Actions
  const handleCreateGlossaryTerm = async (data: {
    term: string;
    acronym?: string;
    longDefinition: string;
    example?: string;
    examples?: GlossaryExample[];
    platform?: string;
    category?: string;
    categories?: string[];
  }) => {
    // AUDIT VN-A-001: entropy suffix (same-ms collision guard).
    const newTermId = `term-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const newTerm: GlossaryTerm = {
      id: newTermId,
      term: data.term,
      acronym: data.acronym?.trim() || undefined,
      shortDefinition: data.longDefinition,
      longDefinition: data.longDefinition,
      example: data.example || '',
      examples: data.examples || [],
      platform: data.platform || 'General',
      category: data.category,
      categories: data.categories || (data.category ? [data.category] : []),
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.glossary.add(newTerm);
    setSelectedTermId(newTermId);
    setActiveSection('glossary');

    // BLOQUE 5 — Inbox conversion: if this create came from a "Convert to
    // Glossary" action in the Inbox, mark the source inbox item as converted.
    if (pendingInboxConvert && pendingInboxConvert.targetType === 'glossary') {
      try {
        await db.inboxItems.update(pendingInboxConvert.inboxItemId, {
          convertedTo: 'glossary',
          convertedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Inbox conversion update failed (non-fatal):', e);
      }
      setPendingInboxConvert(null);
      setNewItemContent('');
    }
  };

  // PERF V13 (R6): useCallback — mismo convenio que handleUpdateNote /
  // handleUpdateLab; sin él cada re-render de App recrea el handler y
  // derrota el React.memo de las vistas que lo reciben.
  const handleUpdateTerm = useCallback(async (termId: string, updated: Partial<GlossaryTerm>) => {
    await db.glossary.update(termId, {
      ...updated,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const handleDeleteTerm = async (termId: string) => {
    await db.glossary.update(termId, {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const remaining = activeTerms.filter((t) => t.id !== termId);
    if (remaining.length > 0) {
      setSelectedTermId(remaining[0].id);
    } else {
      setSelectedTermId(null);
    }
  };

  const handleRestoreTerm = async (termId: string) => {
    // AUDIT VN-A-004: clear the stale `deletedAt` too (undefined → Dexie
    // removes the key) so restored terms stay logically consistent.
    await db.glossary.update(termId, {
      isDeleted: false,
      deletedAt: undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  const handlePermanentDeleteTerm = async (termId: string) => {
    // GLOSARIO SEMBRADO (v18): registra el nombre para que el seed NO lo
    // reviva en el siguiente arranque (dismissSeedTerm usa localStorage).
    const termToKill = await db.glossary.get(termId);
    if (termToKill?.term) dismissSeedTerm(termToKill.term);
    await db.glossary.delete(termId);
  };

  const handleEmptyTrash = async () => {
    // Clean up embedded media owned by permanently deleted content first.
    // BLOB LIFECYCLE FIX (Task 2-c): fetch metas BEFORE deleting IDB rows
    // (same fix as handlePermanentDeleteNote / handlePermanentDeleteLab).
    // Also relies on the v14 schema bump that added `labId` to the `images`
    // index (otherwise `db.images.where('labId').anyOf(labIds)` would throw
    // SchemaError and abort the whole trash-empty mid-way).
    const noteIds = deletedNotes.map((n) => n.id);
    const labIds = deletedLabs.map((l) => l.id);
    const termIds = deletedTerms.map((t) => t.id);
    const allPdfMetas: { id: string; name?: string; mimeType?: string }[] = [];
    // AUDIT VN-A-002: gather ALL blob metadata with pure reads BEFORE opening
    // the transaction — no queries (and no FSA awaits) inside it.
    // (REGLA DE ORO: videos no longer have IDB rows — nothing to gather.)
    if (noteIds.length > 0) {
      const p1 = await db.pdfs.where('noteId').anyOf(noteIds).toArray();
      allPdfMetas.push(...p1);
    }
    if (labIds.length > 0) {
      const p2 = await db.pdfs.where('labId').anyOf(labIds).toArray();
      allPdfMetas.push(...p2);
    }
    // AUDIT VN-A-002: every IDB row deletion (trashed notes/labs/terms AND
    // their image/PDF metadata rows) in ONE atomic transaction —
    // previously the blob rows were cleaned before the note rows were
    // deleted, so a tab close mid-way could leave orphaned blobs behind.
    await db.transaction('rw', [db.notes, db.labs, db.glossary, db.images, db.pdfs], async () => {
      if (noteIds.length > 0) {
        await db.images.where('noteId').anyOf(noteIds).delete();
        await db.pdfs.where('noteId').anyOf(noteIds).delete();
      }
      if (labIds.length > 0) {
        await db.images.where('labId').anyOf(labIds).delete();
        await db.pdfs.where('labId').anyOf(labIds).delete();
      }
      await db.notes.bulkDelete(noteIds);
      await db.labs.bulkDelete(labIds);
      // LAB TEMPLATES HELPDESK (v19): vaciar la papelera también descarta
      // los labs sembrados HelpDesk (para que no vuelvan en el arranque).
      for (const labId of labIds) {
        if (labId.startsWith('labhd-')) dismissSeedId('helpdeskLab', labId);
      }
      // GLOSARIO SEMBRADO (v18): vaciar la papelera también descarta los
      // términos del seed (para que no vuelvan en el siguiente arranque).
      for (const t of deletedTerms) {
        if (t.term) dismissSeedTerm(t.term);
      }
      await db.glossary.bulkDelete(termIds);
    });
    // Disk / FSA cleanup AFTER the transaction commits (mixed Dexie+FSA
    // helpers — see handlePermanentDeleteNote). Failures swallowed.
    for (const p of allPdfMetas) {
      await deletePdfEverywhere(p.id).catch(() => undefined);
    }
  };

  // Export ZIP Backup handler (real "Save": overwrites the same file every time)
  const [backupSavedMessage, setBackupSavedMessage] = useState<string | null>(null);
  // PERF V13: useCallback — sin él cada re-render de App (cada flush del
  // autoguardado) recrea el handler y derrota el React.memo del Header.
  const handleExportBackup = useCallback(async () => {
    try {
      setIsExporting(true);
      const { exportVaultZip } = await import('./utils/zipBackup');
      const result = await exportVaultZip();
      const savedMsg = result.mode === 'app'
        ? 'Guardado en la carpeta de la app ✓'
        : result.mode === 'file'
          ? `Guardado en "${result.savedTo}"`
          : `Descargado: ${result.savedTo}`;
      // REGLA DE ORO (videos): backups never contain videos — nothing can be
      // "omitted" anymore, so the plain saved message is always accurate.
      setBackupSavedMessage(savedMsg);
      setTimeout(() => setBackupSavedMessage(null), 4000);
    } catch (err: unknown) {
      // AbortError = user cancelled the save dialog → not an error
      if ((err as { name?: string })?.name !== 'AbortError') {
        console.error('Export error:', err);
      }
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Import Incremental Backup handler
  const handleImportFile = useCallback(async (file: File) => {
    // El módulo se carga ANTES del try/catch de importación para que las
    // clases de error usadas en los instanceof vengan del MISMO módulo
    // cacheado. Los callers lo invocan fire-and-forget desde inputs de
    // archivo, así que un fallo cargando el chunk se maneja aquí mismo.
    let zipBackup: typeof import('./utils/zipBackup');
    try {
      zipBackup = await import('./utils/zipBackup');
    } catch (err) {
      console.error('No se pudo cargar el módulo de backup:', err);
      alert('Error al cargar el módulo de backup. Recarga la página e inténtalo de nuevo.');
      return;
    }
    try {
      const summary = await zipBackup.importVaultBackup(file);
      setImportSummary(summary);
    } catch (err) {
      // Spec #35: incompatible backup version (backup schemaVersion > app)
      // must show a clear "Incompatible backup version" message — NOT
      // the generic "couldn't read" alert, and NOT a partial import.
      // The IncompatibleBackupError class is thrown up-front by
      // `importVaultBackup` BEFORE any local data is mutated.
      if (err instanceof zipBackup.IncompatibleBackupError) {
        console.warn('Incompatible backup:', err.backupSchemaVersion, err.backupFormatVersion);
        alert(err.message);
        return;
      }
      // AUDIT FIX (VN-AUD-003): a zip-safety rejection (bomb / insane
      // metadata) must surface its SPECIFIC reason — the generic
      // "couldn't read" alert would mislead the user into thinking a
      // legit backup is corrupt. Thrown BEFORE any local data is mutated.
      if (err instanceof zipBackup.ZipSafetyError) {
        console.warn('Zip safety rejection:', err.message);
        alert(err.message);
        return;
      }
      console.error('Import error:', err);
      alert('Error al leer el archivo de backup. Asegúrate de que sea un .zip o .json válido.');
    }
  }, []);

  // BLOQUE 5 — Command palette dispatch (Ctrl+K command entries).
  // Resolves a `commandId` produced by fuzzySearch.getCommandEntries() into
  // the corresponding App-level action: open a section, open a tool, open
  // the New Item modal, fire backup export/import, etc.
  const handleCommandPalette = (commandId: string) => {
    // R6 — comandos de coincidencia EXACTA, table-driven (la tabla se
    // construye aquí porque cierra sobre setters/handlers del componente;
    // los prefijados open-section:/open-tool: llevan payload y van aparte).
    const exactCommands: Record<string, () => void> = {
      'new-note': () => openNewItemModal('note', '', false),
      'new-lab': () => {
        setNewItemTab('lab');
        setIsNewItemOpen(true);
      },
      'new-glossary': () => {
        setNewItemTab('glossary');
        setIsNewItemOpen(true);
      },
      'new-reference': () => {
        // No dedicated modal — switch to references view; the user can use
        // the existing inline add UI there.
        setActiveSection('references');
      },
      'quick-capture': () => setIsQuickCaptureOpen(true),
      'show-shortcuts': () => setIsShortcutsOpen(true),
      'backup-now': () => {
        void handleExportBackup();
      },
      'import-backup': () => {
        // Trigger the hidden file input from the Header via a synthetic event.
        // The header renders its own <input type=file>; the simplest approach
        // here is to open the references view where the user can use the Import
        // button in the header (which is always rendered).
        // We rely on the Header's existing Import button; just focus it visually.
        setActiveSection('settings');
      },
    };
    const exactCommand = exactCommands[commandId];
    if (exactCommand) {
      exactCommand();
      return;
    }
    if (commandId.startsWith('open-section:')) {
      const section = commandId.slice('open-section:'.length) as ActiveSection;
      setActiveSection(section);
      return;
    }
    if (commandId.startsWith('open-tool:')) {
      const toolId = commandId.slice('open-tool:'.length);
      // BLOQUE 5 — record tool use when the user opens a tool from the
      // command palette (light metadata only: toolId + timestamp).
      setPendingTool({ toolId: toolId as ToolDeepLink['toolId'], entryId: toolId });
      // V11 — sección de herramientas UNIFICADA (un solo catálogo).
      setActiveSection('tools');
    }
  };

  // V17.1 — deep-link de tickets de simulador desde Ctrl+K: selecciona en el
  // store del pilar y navega. Los stores son zustand → getState() fuera de React.
  // R6 — if/else de 4 ramas → lookup SIM_TICKET_TARGETS (tabla de módulo).
  const handleOpenSimTicket = (pillar: keyof typeof SIM_TICKET_TARGETS, ticketId: string) => {
    const target = SIM_TICKET_TARGETS[pillar];
    target.store.getState().selectTicket(ticketId);
    setActiveSection(target.section);
  };

  // BLOQUE 5 — Inbox "Convert to Note/Glossary" entry point.
  // Opens the New Item Modal with the inbox content prefilled in the title
  // field of the appropriate tab, and records the conversion as "pending"
  // so handleCreateNote / handleCreateGlossaryTerm can mark it converted
  // once the user actually creates the item (vs. just cancelling).
  const handleConvertInboxItem = (
    content: string,
    inboxItemId: string,
    targetType: 'note' | 'glossary'
  ) => {
    const truncated = (content || '').trim().slice(0, 80);
    setNewItemTab(targetType);
    setNewItemPlatform('');
    setNewItemContent(truncated);
    setPendingInboxConvert({ inboxItemId, targetType });
    setIsNewItemOpen(true);
  };

  // Wrap NewItemModal close so cancelling the modal clears any pending
  // inbox-conversion state (otherwise a later create from the regular
  // header button would wrongly mark an inbox item as converted).
  const handleCloseNewItem = () => {
    setIsNewItemOpen(false);
    setPendingInboxConvert(null);
    setNewItemContent('');
  };

  // R6 — variantes activas por familia de sección: colapsan las 12 ramas
  // JSX (4 roadmap + 4 runbooks + 4 troubleshooting) en un render por
  // familia con lookup de módulo. `null` = la sección activa no es de esa
  // familia (la vista no se monta). Ojo: el roadmap base SÍ renderiza con
  // variante `undefined` (RoadmapView usa la IAM por defecto), por eso su
  // chequeo es `!== null` y usa `in` en vez de `?? null`.
  const roadmapVariant = activeSection in ROADMAP_SECTIONS ? ROADMAP_SECTIONS[activeSection] : null;
  const runbooksPillar = RUNBOOKS_SECTIONS[activeSection] ?? null;
  const troubleshootingPillar = TROUBLESHOOTING_SECTIONS[activeSection] ?? null;

  return (
    // VN-F audit fix — top-level Error Boundary: an uncaught render error
    // used to white-screen the whole app; now it shows a recovery panel
    // (IndexedDB data is never at risk from a render crash).
    <VaultErrorBoundary>
    <div className="flex h-screen w-screen bg-[#0A0A0A] text-[#E5E5E5] overflow-hidden font-sans antialiased select-none">
      {/* 1. Left Persistent Sidebar — desktop: columna fija; móvil: drawer overlay */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        notesCount={rootNotesCount}
        labsCount={activeLabs.length}
        glossaryCount={activeTerms.length}
        trashCount={deletedNotes.length + deletedLabs.length + deletedTerms.length}
        open={mobileSidebarOpen}
        onClose={handleCloseMobileSidebar}
      />

      {/* 2. Main Workstation Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header with Contextual New Button, Fuzzy Search Bar, Export, Import */}
        <Header
          activeSection={activeSection}
          onOpenSearch={handleOpenSearch}
          onOpenMobileSidebar={handleOpenMobileSidebar}
          onOpenNewItem={openNewItemModal}
          onOpenQuickCapture={handleOpenQuickCapture}
          onExport={handleExportBackup}
          onImportFile={handleImportFile}
          isExporting={isExporting}
          backupSavedMessage={backupSavedMessage}
        />

        {/* Dynamic Views */}
        <main className="flex-1 flex overflow-hidden">
          {activeSection === 'dashboard' && (
            <DashboardView
              notes={notes}
              labs={labs}
              glossary={glossary}
              onSelectNote={handleOpenNote}
              onSelectLab={handleOpenLab}
              onOpenNotesView={() => setActiveSection('notes')}
              onOpenLabsView={() => setActiveSection('labs')}
              // BLOQUE 5 — Quick Actions wiring (section switch, New Item modal,
              // and direct tool deep-link). All optional props on the dashboard.
              onSelectSection={(section) => setActiveSection(section)}
              onOpenNewItem={openNewItemModal}
              onOpenTool={(toolId) => {
                setPendingTool({ toolId: toolId as ToolDeepLink['toolId'], entryId: toolId });
                setActiveSection('tools');
              }}
            />
          )}

          {activeSection === 'notes' && (
            <NotesView
              notes={notes}
              selectedNoteId={selectedNoteId}
              platforms={platforms}
              categories={categories}
              glossaryTerms={activeTerms}
              onSelectNote={(id) => setSelectedNoteId(id)}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
              onCreateNote={(platform) => {
                setNewItemTab('note');
                setNewItemPlatform(platform || '');
                setIsNewItemOpen(true);
              }}
              onCreateSubnote={handleCreateSubnote}
              onOpenGlossaryTerm={handleOpenGlossaryTerm}
            />
          )}

          {activeSection === 'labs' && (
            <LabsView
              labs={labs}
              categories={categories}
              selectedLabId={selectedLabId}
              onSelectLab={(id) => setSelectedLabId(id)}
              onUpdateLab={handleUpdateLab}
              onDeleteLab={handleDeleteLab}
              onCreateLab={() => {
                setNewItemTab('lab');
                setIsNewItemOpen(true);
              }}
            />
          )}

          {activeSection === 'glossary' && (
            <GlossaryView
              terms={glossary}
              notes={notes}
              platforms={platforms}
              categories={categories}
              selectedTermId={selectedTermId}
              onSelectTerm={(id) => setSelectedTermId(id)}
              onUpdateTerm={handleUpdateTerm}
              onDeleteTerm={handleDeleteTerm}
              onCreateTerm={() => {
                setNewItemTab('glossary');
                setIsNewItemOpen(true);
              }}
              onOpenNote={handleOpenNote}
            />
          )}

          {/* PERFIL PROFESIONAL (v17, multi-perfil desde v18) — documentos del
              CV (IAM Analyst). Autónomo: lee/escribe db.profile (varias filas)
              y se exporta como Markdown AI-ready desde la propia vista. */}
          {activeSection === 'profile' && <ProfileView />}

          {/* ROADMAP (v18) — checklist interactivo del roadmap con progreso
              persistente en DB. Variantes por pilar: 'roadmap' = Junior IAM
              (variante por defecto, sin prop) · 'roadmap-hd' (v19, HelpDesk /
              IT Support) · 'roadmap-sa' (v21, Infra & Ops → SRE) ·
              'roadmap-soc' (v9, Blue Team). */}
          {roadmapVariant !== null && <RoadmapView variant={roadmapVariant} />}

          {/* HELPDESK (v19) — Simulador Service Desk: cola de tickets con
              modo estudio (revelado progresivo), proyecto final (30 tickets
              por días) y KB enlazada. El flujo de estados y las notas de
              cierre persisten en db.helpdeskTickets. */}
          {activeSection === 'helpdesk' && (
            <HelpDeskView
              glossaryTerms={activeTerms}
              onOpenGlossaryTerm={handleOpenGlossaryTerm}
            />
          )}

          {/* SYSADMIN (v21) — Simulador de Infraestructura & Operaciones:
              cola de tickets de guardia con modo estudio, proyecto final
              "semana de guardia" y KB enlazada. El flujo de estados y las
              notas de cierre persisten en db.sysadminTickets. */}
          {activeSection === 'sysadmin' && (
            <SysAdminView
              glossaryTerms={activeTerms}
              onOpenGlossaryTerm={handleOpenGlossaryTerm}
            />
          )}

          {/* SOC (v9 simulador) — Simulador del Blue Team: cola de casos con
              torre de detección (Identity/Endpoint/Network/Email/Cloud/Web),
              modo estudio (revelado progresivo), proyecto final "primera
              semana SOC" (30 casos por días) y KB enlazada. El flujo de
              estados y las notas de cierre persisten en db.socTickets. */}
          {activeSection === 'soc' && (
            <SocView
              glossaryTerms={activeTerms}
              onOpenGlossaryTerm={handleOpenGlossaryTerm}
            />
          )}

          {/* IAM (V11 · PILAR 1) — Simulador de Identity & Access Management:
              cola de tickets por torre (JML/Access/PAM/Gobernanza/Infra IAM),
              modo estudio (revelado progresivo), proyecto final "Semana de
              Access Review" (10 tickets, 2 por día × 5 días) y KB enlazada.
              El flujo de estados y las notas de cierre persisten en
              db.iamTickets. */}
          {activeSection === 'iam' && (
            <IamView
              glossaryTerms={activeTerms}
              onOpenGlossaryTerm={handleOpenGlossaryTerm}
            />
          )}

          {activeSection === 'blog' && (
            <BlogView notes={notes} labs={labs} />
          )}

          {/* V11 — Herramientas UNIFICADAS: un solo catálogo global; cada
              tool aparece una vez con su etiqueta de rol (IAM/SOC/Service
              Desk/SysAdmin/Global). */}
          {activeSection === 'tools' && (
            <ToolsView pendingTool={pendingTool} onConsumePending={() => setPendingTool(null)} />
          )}

          {/* Comandos más usados (HelpDesk / IAM / SOC): qué hace cada uno,
              por qué, sintaxis, ejemplos copiables y errores comunes. */}
          {activeSection === 'commands' && (
            <CommandsView autoSelectId={pendingCommandId} onConsumeAutoSelect={() => setPendingCommandId(null)} />
          )}

          {activeSection === 'references' && (
            <ReferencesView
              glossaryTerms={activeTerms}
              onOpenGlossaryTerm={handleOpenGlossaryTerm}
            />
          )}

          {activeSection === 'inbox' && (
            <InboxView
              onConvertToNote={(content, inboxItemId) =>
                handleConvertInboxItem(content, inboxItemId, 'note')
              }
              onConvertToGlossary={(content, inboxItemId) =>
                handleConvertInboxItem(content, inboxItemId, 'glossary')
              }
            />
          )}

          {activeSection === 'trash' && (
            <TrashView
              deletedNotes={deletedNotes}
              deletedLabs={deletedLabs}
              deletedTerms={deletedTerms}
              onRestoreNote={handleRestoreNote}
              onPermanentDeleteNote={handlePermanentDeleteNote}
              onRestoreLab={handleRestoreLab}
              onPermanentDeleteLab={handlePermanentDeleteLab}
              onRestoreTerm={handleRestoreTerm}
              onPermanentDeleteTerm={handlePermanentDeleteTerm}
              onEmptyTrash={handleEmptyTrash}
            />
          )}

          {activeSection === 'settings' && (
            <SettingsView categories={categories} tools={tools} />
          )}

          {/* V11 — Runbooks por pilar (incluye los QUICK FIXES ex-CheatSheet
              fusionados): ticket real + paso a paso universal + respuesta
              en inglés copiable (datasets estáticos, sin Dexie). Un pilar por
              sección: runbooks-hd / -sa / -soc / -iam. */}
          {runbooksPillar !== null && (
            <RunbooksView pillar={runbooksPillar} autoSelectId={pendingRunbookId} onConsumeAutoSelect={() => setPendingRunbookId(null)} />
          )}

          {/* V9 — Troubleshooting por pilar (escaleras de decisión):
              troubleshooting-hd / -sa / -soc / -iam. */}
          {troubleshootingPillar !== null && (
            <TroubleshootingView pillar={troubleshootingPillar} autoSelectId={pendingTroubleshootingId} onConsumeAutoSelect={() => setPendingTroubleshootingId(null)} />
          )}
        </main>
      </div>

      {/* 3. Global Modals */}
      {/* Global Search Modal (Ctrl+K) — lazily mounted (chunk warms on first
          open; the shell also idle-prefetches it after first paint). */}
      {isSearchOpen && (
        <GlobalSearchModal
          isOpen
          onClose={() => setIsSearchOpen(false)}
          notes={activeNotes}
          labs={activeLabs}
          glossary={activeTerms}
          references={activeReferences}
          onSelectNote={handleOpenNote}
          onSelectLab={handleOpenLab}
          onSelectGlossaryTerm={handleOpenGlossaryTerm}
          onSelectReference={() => {
            // No reference detail view yet — just switch to references section.
            setActiveSection('references');
          }}
          onSelectTool={(deepLink) => {
            setPendingTool(deepLink);
            // V11 — sección de herramientas UNIFICADA (un solo catálogo).
            setActiveSection('tools');
          }}
          // V11 — deep-links por prefijo de id (el CheatSheet se fusionó en
          // Runbooks, así que los quick-fixes ex-CS también viven ahí):
          //   RB-HD-* / CS-* → runbooks-hd · RB-SA-* / CS-SA-* → runbooks-sa
          //   RB-SOC-* / CS-SOC-* → runbooks-soc · RB-IAM-* → runbooks-iam
          //   TS-HD-* → troubleshooting-hd · TS-SA-* → troubleshooting-sa
          //   TS-SOC-* → troubleshooting-soc · TS-IAM-* → troubleshooting-iam
          // MEGA-AUDITORÍA — laboratorios guiados (categoría 'Laboratorio'
          // dentro de cada dataset RB): LAB-IAM-* / LAB-SOC-* / LAB-SA-* /
          // LAB-HD-* → su pilar correspondiente.
          onSelectRunbook={(runbookId) => {
            setPendingRunbookId(runbookId);
            if (runbookId.startsWith('RB-IAM-') || runbookId.startsWith('LAB-IAM-')) setActiveSection('runbooks-iam');
            else if (runbookId.startsWith('RB-SA-') || runbookId.startsWith('CS-SA-') || runbookId.startsWith('LAB-SA-')) setActiveSection('runbooks-sa');
            else if (runbookId.startsWith('RB-SOC-') || runbookId.startsWith('CS-SOC-') || runbookId.startsWith('LAB-SOC-')) setActiveSection('runbooks-soc');
            else setActiveSection('runbooks-hd');
          }}
          onSelectTroubleshooting={(troubleshootingId) => {
            setPendingTroubleshootingId(troubleshootingId);
            if (troubleshootingId.startsWith('TS-IAM-')) setActiveSection('troubleshooting-iam');
            else if (troubleshootingId.startsWith('TS-SA-')) setActiveSection('troubleshooting-sa');
            else if (troubleshootingId.startsWith('TS-SOC-')) setActiveSection('troubleshooting-soc');
            else setActiveSection('troubleshooting-hd');
          }}
          // V17.1 — "IAM-4003" / "phishing" en Ctrl+K llevan directo al ticket
          // del simulador correspondiente (216 tickets indexados).
          onSelectSimTicket={handleOpenSimTicket}
          // Comandos más usados — "ipconfig" / "assume-role" en Ctrl+K llevan
          // directo a la ficha del comando (174 indexados).
          onSelectCommandRef={(commandId) => {
            setPendingCommandId(commandId);
            setActiveSection('commands');
          }}
          // BLOQUE 5 — command palette dispatch (new note / open X / backup / etc.)
          onSelectCommand={(commandId) => {
            handleCommandPalette(commandId);
          }}
        />
      )}

      {/* New Item Modal (+ Button) — keyed so it mounts fresh (clean form) every time it opens.
          newItemContent is included in the key so an Inbox "Convert to Note/Glossary"
          flow (which sets the title from the inbox content) re-mounts the modal
          with the prefilled title state. Lazily mounted (chunk loads on first open). */}
      {isNewItemOpen && (
        <NewItemModal
          key={`new-item-${newItemTab}-${newItemPlatform}-${newItemContent}`}
          isOpen
          onClose={handleCloseNewItem}
          initialTab={newItemTab}
          initialPlatform={newItemPlatform}
          initialContent={newItemContent}
          platforms={platforms}
          categories={categories}
          tools={tools}
          onCreateNote={handleCreateNote}
          onCreateLab={handleCreateLab}
          onCreateGlossaryTerm={handleCreateGlossaryTerm}
        />
      )}

      {/* Quick Capture Modal (Ctrl+Shift+Q) — single textarea → Inbox */}
      {isQuickCaptureOpen && (
        <QuickCaptureModal
          isOpen
          onClose={() => setIsQuickCaptureOpen(false)}
        />
      )}

      {/* ShortcutsDialog — referencia de atajos + sintaxis de búsqueda (V17.1) */}
      {isShortcutsOpen && (
        <ShortcutsDialog
          open
          onClose={() => setIsShortcutsOpen(false)}
        />
      )}

      {/* Add to Note Modal (BLOQUE 5 spec #4) — opened by any tool that calls
          useNoteStore.enqueueNote(title, html). Lets the user choose between
          creating a new note or appending to an existing note. */}
      {isAddToNoteOpen && (
        <AddToNoteModal
          isOpen
          onClose={handleCloseAddToNote}
          pendingAdd={pendingNote}
          onCreateNewNote={handleCreateNewNote}
          onAppendToExistingNote={(noteId) => void handleAppendToExistingNote(noteId)}
        />
      )}

      {/* Incremental Import Report Modal */}
      {importSummary && (
        <ImportReportModal
          isOpen
          onClose={() => setImportSummary(null)}
          summary={importSummary}
        />
      )}
    </div>
    </VaultErrorBoundary>
  );
}
