import { db } from '../db';
import { StoredPdf } from '../types';

/* ------------------------------------------------------------------ */
/* PDF storage — 100% offline, browser-only                            */
/*                                                                     */
/* PDFs are stored as raw Blobs in IndexedDB. The browser's native     */
/* PDF viewer renders them inline via <embed> + blob URL — no need     */
/* for pdf.js or any external library. Works on Chromium-based        */
/* browsers (Edge/Chrome) out of the box.                              */
/*                                                                     */
/* Backups serialise the blobs into /pdfs/ inside the .zip so the     */
/* vault stays fully portable.                                         */
/* ------------------------------------------------------------------ */

/** Returns `pdf` for any PDF entry (all PDFs share the extension). */
export function pdfExtensionFor(_meta?: { name?: string; mimeType?: string }): string {
  return 'pdf';
}

/**
 * Persists a PDF blob into IndexedDB and records its metadata.
 * Returns the same id back so the caller can wire it into the <embed>.
 */
export async function savePdfBlob(meta: {
  id: string;
  noteId?: string;
  labId?: string;
  name: string;
  mimeType: string;
  blob: Blob;
  caption?: string;
  createdAt?: string;
}): Promise<void> {
  const createdAt = meta.createdAt || new Date().toISOString();
  await db.pdfs.put({
    id: meta.id,
    noteId: meta.noteId,
    labId: meta.labId,
    name: meta.name,
    mimeType: meta.mimeType || 'application/pdf',
    blob: meta.blob,
    caption: meta.caption || meta.name,
    createdAt,
  });
}

/** Resolves the playable Blob for a PDF id. */
export async function getPdfBlobById(id: string): Promise<Blob | null> {
  const meta = await db.pdfs.get(id);
  return meta?.blob || null;
}

/** Removes a PDF from IndexedDB (called on permanent deletes). */
export async function deletePdfEverywhere(id: string): Promise<void> {
  await db.pdfs.delete(id);
}

interface PdfEntry {
  meta: Omit<StoredPdf, 'blob'>;
  blob: Blob | null;
}

/** Everything needed by the ZIP export. */
export async function getAllPdfEntries(): Promise<PdfEntry[]> {
  const metas = await db.pdfs.toArray();
  return metas.map((p) => {
    const { blob, ...rest } = p;
    return { meta: rest as Omit<StoredPdf, 'blob'>, blob: blob || null };
  });
}

