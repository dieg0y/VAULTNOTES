'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  GlossaryExample
} from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { NotesView } from './components/NotesView';
import { LabsView } from './components/LabsView';
import { GlossaryView } from './components/GlossaryView';
import { TrashView } from './components/TrashView';
import { SettingsView } from './components/SettingsView';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { NewItemModal } from './components/NewItemModal';
import { ImportReportModal } from './components/ImportReportModal';
import { exportVaultZip, importVaultBackup } from './utils/zipBackup';

export default function App() {
  // Initialize / seed the local vault database once on mount (browser only)
  useEffect(() => {
    initializeDatabase().catch((err) => {
      console.error('Failed to initialize vault database:', err);
    });
  }, []);

  // 1. Reactive Dexie queries
  const notes = useLiveQuery(() => db.notes.toArray(), []) || [];
  const labs = useLiveQuery(() => db.labs.toArray(), []) || [];
  const glossary = useLiveQuery(() => db.glossary.toArray(), []) || [];
  const platforms = useLiveQuery(() => db.platforms.toArray(), []) || [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) || [];
  const tools = useLiveQuery(() => db.tools.toArray(), []) || [];

  // Active UI Navigation state
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [newItemTab, setNewItemTab] = useState<'note' | 'lab' | 'glossary'>('note');
  const [newItemPlatform, setNewItemPlatform] = useState<string>('');
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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

  // Global Keyboard Shortcuts (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
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
    for (const id of idsToTrash) {
      await db.notes.update(id, { isDeleted: true, deletedAt: now, updatedAt: now });
    }
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
    for (const id of idsToRestore) {
      await db.notes.update(id, { isDeleted: false, updatedAt: now });
    }
  };

  const handlePermanentDeleteNote = async (noteId: string) => {
    const idsToDelete = [noteId, ...collectDescendantIds(noteId)];
    for (const id of idsToDelete) {
      await db.notes.delete(id);
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
    const newLabId = `lab-${Date.now()}`;
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
          id: `part-${Date.now()}-1`,
          title: 'Parte 1 - Recolección de Evidencia y Contexto',
          content: '<p>Documenta aquí los hallazgos iniciales, comandos ejecutados o adjunta capturas.</p>',
          isCompleted: false,
        }
      ],
      tools: data?.tools && data.tools.length > 0 ? data.tools : ['Wireshark', 'VirusTotal'],
      commands: '# Comandos ejecutados o queries KQL / Splunk\nindex=security sourcetype=syslog | stats count by src_ip',
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
    await db.labs.update(labId, {
      isDeleted: false,
      updatedAt: new Date().toISOString(),
    });
  };

  const handlePermanentDeleteLab = async (labId: string) => {
    await db.labs.delete(labId);
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
    const newTermId = `term-${Date.now()}`;
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
    await db.glossary.update(termId, {
      isDeleted: false,
      updatedAt: new Date().toISOString(),
    });
  };

  const handlePermanentDeleteTerm = async (termId: string) => {
    await db.glossary.delete(termId);
  };

  const handleEmptyTrash = async () => {
    await db.notes.bulkDelete(deletedNotes.map((n) => n.id));
    await db.labs.bulkDelete(deletedLabs.map((l) => l.id));
    await db.glossary.bulkDelete(deletedTerms.map((t) => t.id));
  };

  // Export ZIP Backup handler
  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      await exportVaultZip();
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Import Incremental Backup handler
  const handleImportFile = async (file: File) => {
    try {
      const summary = await importVaultBackup(file);
      setImportSummary(summary);
    } catch (err) {
      console.error('Import error:', err);
      alert('Error al leer el archivo de backup. Asegúrate de que sea un .zip o .json válido.');
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#0A0A0A] text-[#E5E5E5] overflow-hidden font-sans antialiased select-none">
      {/* 1. Left Persistent Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={(section) => setActiveSection(section)}
        notesCount={activeNotes.filter((n) => !n.parentId).length}
        labsCount={activeLabs.length}
        glossaryCount={activeTerms.length}
        trashCount={deletedNotes.length + deletedLabs.length + deletedTerms.length}
      />

      {/* 2. Main Workstation Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header with Contextual New Button, Fuzzy Search Bar, Export, Import */}
        <Header
          activeSection={activeSection}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenNewItem={(tab) => {
            if (tab) setNewItemTab(tab);
            setNewItemPlatform('');
            setIsNewItemOpen(true);
          }}
          onExport={handleExportBackup}
          onImportFile={handleImportFile}
          isExporting={isExporting}
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
        </main>
      </div>

      {/* 3. Global Modals */}
      {/* Global Search Modal (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        notes={activeNotes}
        labs={activeLabs}
        glossary={activeTerms}
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

      {/* New Item Modal (+ Button) — keyed so it mounts fresh (clean form) every time it opens */}
      <NewItemModal
        key={`new-item-${newItemTab}-${newItemPlatform}-${String(isNewItemOpen)}`}
        isOpen={isNewItemOpen}
        onClose={() => setIsNewItemOpen(false)}
        initialTab={newItemTab}
        initialPlatform={newItemPlatform}
        platforms={platforms}
        categories={categories}
        tools={tools}
        onCreateNote={handleCreateNote}
        onCreateLab={handleCreateLab}
        onCreateGlossaryTerm={handleCreateGlossaryTerm}
      />

      {/* Incremental Import Report Modal */}
      <ImportReportModal
        isOpen={!!importSummary}
        onClose={() => setImportSummary(null)}
        summary={importSummary}
      />
    </div>
  );
}
