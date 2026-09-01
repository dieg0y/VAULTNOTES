'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initializeDatabase } from './db';
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
// DATA & INTEL (v16) — navigation bridge: tools can ask App to switch to the
// data-intel section via useIntelStore.getState().requestNavigate().
import { useIntelStore } from './store/intelStore';

/* ------------------------------------------------------------------ */
/* PERFORMANCE (code-splitting pass):                                  */
/* The initial route now ships ONLY the shell (Sidebar + Header +      */
/* error boundary). Every view is a separate chunk loaded on demand   */
/* via next/dynamic, and the modals only mount (and load their        */
/* chunk) when opened. The 29 tools travel together inside the lazy   */
/* ToolsView chunk — the tool module graph itself stays STATIC inside  */
/* that chunk on purpose: Turbopack's dev runtime loses track of ~20  */
/* separate per-tool dynamic factories after a dev-server restart     */
/* (VN-F-003, "module factory is not available"). See the             */
/* HMR-ROBUSTNESS note in ToolsView.tsx.                              */
/* ------------------------------------------------------------------ */
const ViewLoader = () => (
  <div className="flex-1 flex items-center justify-center" role="status" aria-label="Cargando vista">
    <div className="flex flex-col items-center gap-3">
      <div className="w-6 h-6 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
      <p className="text-[11px] font-mono text-[#555]">Cargando…</p>
    </div>
  </div>
);

const DashboardView = dynamic(() => import('./components/DashboardView').then((m) => m.DashboardView), { ssr: false, loading: ViewLoader });
const NotesView = dynamic(() => import('./components/NotesView').then((m) => m.NotesView), { ssr: false, loading: ViewLoader });
const LabsView = dynamic(() => import('./components/LabsView').then((m) => m.LabsView), { ssr: false, loading: ViewLoader });
const GlossaryView = dynamic(() => import('./components/GlossaryView').then((m) => m.GlossaryView), { ssr: false, loading: ViewLoader });
const BlogView = dynamic(() => import('./components/BlogView').then((m) => m.BlogView), { ssr: false, loading: ViewLoader });
const ToolsView = dynamic(() => import('./components/ToolsView').then((m) => m.ToolsView), { ssr: false, loading: ViewLoader });
const ReferencesView = dynamic(() => import('./components/ReferencesView').then((m) => m.ReferencesView), { ssr: false, loading: ViewLoader });
const TrashView = dynamic(() => import('./components/TrashView').then((m) => m.TrashView), { ssr: false, loading: ViewLoader });
const SettingsView = dynamic(() => import('./components/SettingsView').then((m) => m.SettingsView), { ssr: false, loading: ViewLoader });
const ReviewView = dynamic(() => import('./components/ReviewView').then((m) => m.ReviewView), { ssr: false, loading: ViewLoader });
const InboxView = dynamic(() => import('./components/InboxView').then((m) => m.InboxView), { ssr: false, loading: ViewLoader });
// BLOQUE 6 — Online-Optional. Data & Intelligence sync center view.
const DataIntelView = dynamic(() => import('./components/DataIntelView').then((m) => m.DataIntelView), { ssr: false, loading: ViewLoader });

/* Modals — mounted (and chunk-loaded) only while open. */
const ModalLoader = () => null;
const GlobalSearchModal = dynamic(() => import('./components/GlobalSearchModal').then((m) => m.GlobalSearchModal), { ssr: false, loading: ModalLoader });
const NewItemModal = dynamic(() => import('./components/NewItemModal').then((m) => m.NewItemModal), { ssr: false, loading: ModalLoader });
const QuickCaptureModal = dynamic(() => import('./components/QuickCaptureModal').then((m) => m.QuickCaptureModal), { ssr: false, loading: ModalLoader });
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

export default function App() {
  // Initialize / seed the local vault database once on mount (browser only)
  useEffect(() => {
    initializeDatabase()
      .then(() => {
        // AUDIT FIX (VN-AUD-002): the v15 migration (REGLA DE ORO) deletes the
        // IndexedDB `videos` table. Blobs that only ever lived there (never
        // migrated to the user's disk folder) are unrecoverable — the
        // migration writes the discard count to localStorage and THIS code
        // surfaces it as a ONE-TIME alert (console.warn alone is invisible to
        // users). Folder files and existing embeds are untouched.
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
      })
      .catch((err) => {
        console.error('Failed to initialize vault database:', err);
      });
    // Register the PWA service worker for offline-first shell caching.
    // Also listen for SW updates so the user immediately sees the new shell
    // (instead of being stuck on a stale cached version of the app).
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      // DEV — NEVER run the service worker, regardless of hostname.
      // Why hostname matters: the SW detects dev via `localhost`, but the
      // dev app is also reachable through proxy hostnames (preview panels),
      // where the SW would otherwise run in "prod mode": cache-first for
      // chunks. Turbopack dev chunk URLs are STABLE across server restarts
      // (e.g. src_vault_App_tsx_d14bda49._.js), so a cached SW happily
      // serves STALE chunk bodies for the SAME urls after every restart —
      // a mixed module graph that dies with "module factory is not
      // available" and SURVIVES manual reloads. Unregister + wipe caches.
      if (process.env.NODE_ENV === 'development') {
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
        return; // no SW registration in dev, no listeners to clean up
      }

      // PROD — register the PWA service worker for offline-first shell
      // caching. Also listen for SW updates so the user immediately sees
      // the new shell (instead of being stuck on a stale cached version).
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => {
          // If a registration exists but is for an OLD sw.js (detected via
          // the scriptURL or just by version mismatch), unregister it so
          // the new one takes over on next navigation.
          for (const reg of regs) {
            const scriptURL = reg.active && reg.active.scriptURL;
            // scriptURL ends with '/sw.js' for the current one. We just
            // force-update all of them — the new SW re-registers below.
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
  const handleOpenNewItem = useCallback((tab?: 'note' | 'lab' | 'glossary') => {
    if (tab) setNewItemTab(tab);
    setNewItemPlatform('');
    setNewItemContent('');
    setPendingInboxConvert(null);
    setIsNewItemOpen(true);
  }, []);

  // Deep-link into the Tools view — when set, ToolsView switches the active
  // tool and auto-opens the entry matching `entryId`. Cleared after consumption.
  const [pendingTool, setPendingTool] = useState<ToolDeepLink | null>(null);

  // DATA & INTEL (v16) — one-shot navigation request from any tool
  // ("Enviar a Data & Intel" flows). Consumed immediately to avoid loops.
  const intelNavigateRequest = useIntelStore((s) => s.navigateRequest);
  const consumeIntelNavigate = useIntelStore((s) => s.consumeNavigate);
  useEffect(() => {
    if (intelNavigateRequest > 0) {
      setActiveSection('data-intel');
      consumeIntelNavigate();
    }
  }, [intelNavigateRequest, consumeIntelNavigate]);

  // Set initial selected note if none selected (prefer a top-level note)
  useEffect(() => {
    if (!selectedNoteId && notes.length > 0) {
      const active = notes.find((n) => !n.isDeleted && !n.parentId) || notes.find((n) => !n.isDeleted);
      if (active) {
        setSelectedNoteId(active.id);
      }
    }
  }, [notes, selectedNoteId]);

  // Set initial selected lab if none selected
  useEffect(() => {
    if (!selectedLabId && labs.length > 0) {
      const active = labs.find((l) => !l.isDeleted);
      if (active) {
        setSelectedLabId(active.id);
      }
    }
  }, [labs, selectedLabId]);

  // Set initial selected glossary term
  useEffect(() => {
    if (!selectedTermId && glossary.length > 0) {
      const active = glossary.find((g) => !g.isDeleted);
      if (active) {
        setSelectedTermId(active.id);
      }
    }
  }, [glossary, selectedTermId]);

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
        setNewItemTab('note');
        setNewItemPlatform('');
        setNewItemContent('');
        setIsNewItemOpen(true);
      } else if (letter === 'l') {
        e.preventDefault();
        setNewItemTab('lab');
        setIsNewItemOpen(true);
      } else if (letter === 'i') {
        e.preventDefault();
        setPendingTool({ toolId: 'ioc', entryId: 'ioc' });
        setActiveSection('tools');
      } else if (letter === 't') {
        e.preventDefault();
        setPendingTool({ toolId: 'timestamp', entryId: 'timestamp' });
        setActiveSection('tools');
      } else if (letter === 'h') {
        e.preventDefault();
        setPendingTool({ toolId: 'hash', entryId: 'hash' });
        setActiveSection('tools');
      } else if (letter === 'r') {
        e.preventDefault();
        setPendingTool({ toolId: 'regex', entryId: 'regex' });
        setActiveSection('tools');
      } else if (letter === 'm') {
        e.preventDefault();
        setPendingTool({ toolId: 'mitre', entryId: 'mitre' });
        setActiveSection('tools');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    }).finally(() => clearPendingNote());
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

  const handleUpdateTerm = async (termId: string, updated: Partial<GlossaryTerm>) => {
    await db.glossary.update(termId, {
      ...updated,
      updatedAt: new Date().toISOString(),
    });
  };

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
  const handleExportBackup = async () => {
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
  };

  // Import Incremental Backup handler
  const handleImportFile = async (file: File) => {
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
  };

  // BLOQUE 5 — Command palette dispatch (Ctrl+K command entries).
  // Resolves a `commandId` produced by fuzzySearch.getCommandEntries() into
  // the corresponding App-level action: open a section, open a tool, open
  // the New Item modal, fire backup export/import, etc.
  const handleCommandPalette = (commandId: string) => {
    if (commandId === 'new-note') {
      setNewItemTab('note');
      setNewItemPlatform('');
      setNewItemContent('');
      setIsNewItemOpen(true);
    } else if (commandId === 'new-lab') {
      setNewItemTab('lab');
      setIsNewItemOpen(true);
    } else if (commandId === 'new-glossary') {
      setNewItemTab('glossary');
      setIsNewItemOpen(true);
    } else if (commandId === 'new-reference') {
      // No dedicated modal — switch to references view; the user can use the
      // existing inline add UI there.
      setActiveSection('references');
    } else if (commandId === 'quick-capture') {
      setIsQuickCaptureOpen(true);
    } else if (commandId.startsWith('open-section:')) {
      const section = commandId.slice('open-section:'.length) as ActiveSection;
      setActiveSection(section);
    } else if (commandId.startsWith('open-tool:')) {
      const toolId = commandId.slice('open-tool:'.length);
      // BLOQUE 5 — record tool use when the user opens a tool from the
      // command palette (light metadata only: toolId + timestamp).
      setPendingTool({ toolId: toolId as ToolDeepLink['toolId'], entryId: toolId });
      setActiveSection('tools');
    } else if (commandId === 'backup-now') {
      void handleExportBackup();
    } else if (commandId === 'import-backup') {
      // Trigger the hidden file input from the Header via a synthetic event.
      // The header renders its own <input type=file>; the simplest approach
      // here is to open the references view where the user can use the Import
      // button in the header (which is always rendered).
      // We rely on the Header's existing Import button; just focus it visually.
      setActiveSection('settings');
    }
  };

  // BLOQUE 5 — Extended keyboard shortcuts.
  // - Only fire when the user is NOT typing in an input/textarea/contenteditable.
  // - Don't interfere with native browser shortcuts that include Alt.
  // - Easy to extend: just add another `key === '<letter>'` branch below.
  const isTypingTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
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
          onOpenNewItem={handleOpenNewItem}
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
              onSelectNote={(noteId) => {
                setSelectedNoteId(noteId);
                setActiveSection('notes');
              }}
              onSelectLab={(labId) => {
                setSelectedLabId(labId);
                setActiveSection('labs');
              }}
              onOpenNotesView={() => setActiveSection('notes')}
              onOpenLabsView={() => setActiveSection('labs')}
              // BLOQUE 5 — Quick Actions wiring (section switch, New Item modal,
              // and direct tool deep-link). All optional props on the dashboard.
              onSelectSection={(section) => setActiveSection(section)}
              onOpenNewItem={(tab) => {
                setNewItemTab(tab);
                setNewItemPlatform('');
                setNewItemContent('');
                setPendingInboxConvert(null);
                setIsNewItemOpen(true);
              }}
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
              onOpenGlossaryTerm={(termId) => {
                setSelectedTermId(termId);
                setActiveSection('glossary');
              }}
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
              onOpenNote={(noteId) => {
                setSelectedNoteId(noteId);
                setActiveSection('notes');
              }}
            />
          )}

          {activeSection === 'blog' && (
            <BlogView notes={notes} labs={labs} />
          )}

          {activeSection === 'tools' && (
            <ToolsView pendingTool={pendingTool} onConsumePending={() => setPendingTool(null)} />
          )}

          {activeSection === 'references' && (
            <ReferencesView
              glossaryTerms={activeTerms}
              onOpenGlossaryTerm={(termId) => {
                setSelectedTermId(termId);
                setActiveSection('glossary');
              }}
            />
          )}

          {activeSection === 'review' && (
            <ReviewView
              onSelectNote={(noteId) => {
                setSelectedNoteId(noteId);
                setActiveSection('notes');
              }}
              onSelectLab={(labId) => {
                setSelectedLabId(labId);
                setActiveSection('labs');
              }}
              onSelectGlossaryTerm={(termId) => {
                setSelectedTermId(termId);
                setActiveSection('glossary');
              }}
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

          {/* BLOQUE 6 — Online-Optional. Data & Intelligence sync center.
              MITRE/Sigma sync architecture, TI provider status, saved CVEs,
              online activity log. All local; sync buttons gated by online. */}
          {activeSection === 'data-intel' && (
            <DataIntelView />
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
          onSelectNote={(noteId) => {
            setSelectedNoteId(noteId);
            setActiveSection('notes');
          }}
          onSelectLab={(labId) => {
            setSelectedLabId(labId);
            setActiveSection('labs');
          }}
          onSelectGlossaryTerm={(termId) => {
            setSelectedTermId(termId);
            setActiveSection('glossary');
          }}
          onSelectReference={() => {
            // No reference detail view yet — just switch to references section.
            setActiveSection('references');
          }}
          onSelectTool={(deepLink) => {
            setPendingTool(deepLink);
            setActiveSection('tools');
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
          key={`new-item-${newItemTab}-${newItemPlatform}-${newItemContent}-${String(isNewItemOpen)}`}
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
