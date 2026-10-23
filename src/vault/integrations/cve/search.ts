/**
 * integrations/cve/search.ts — NVD CVE online search + Save to Vault.
 *
 * Spec #20, #21: search a CVE-ID online → show description/CVSS/severity/CWE/
 *  affected products/published/modified/references → [Save to Vault] stores a
 *  local copy → user can edit Tags/Notes/Personal assessment.
 *
 * ENDPOINT (NVD 2.0 API — supports CORS, no API key required, just rate-
 *  limited without one):
 *  GET https://services.nvd.nist.gov/rest/json/cves/2.0?cveId={CVE-ID}
 *
 * RULES:
 *  - NEVER auto-search. Only on explicit [Search Online] click.
 *  - NEVER search while typing (Ctrl+K offline search stays offline).
 *  - On save, store the COMPLETE CVE record so it's readable offline later.
 *  - The user can edit their personal notes/tags/assessment freely.
 */
import { db, type SavedCve } from '../../db';
import { isOnline } from '../online';
import { fetchWithTimeout, FetchHttpError, sanitizeStr, sanitizeNum, sanitizeStrArr } from '../threatIntel/client';
import { classifyError } from '../threatIntel/errors';

export interface CveSearchResult {
  ok: boolean;
  cve?: {
    id: string;
    description: string;
    cvss: number | null;
    severity: string | null;
    cwe: string[];
    affectedProducts: string[];
    published: string;
    modified: string;
    references: string[];
  };
  error?: string;
}

/** Search NVD for a CVE id. Returns a structured result — never throws. */
export async function searchCveOnline(cveId: string): Promise<CveSearchResult> {
  const normalized = cveId.trim().toUpperCase();
  if (!/^CVE-\d{4}-\d{4,7}$/.test(normalized)) {
    return { ok: false, error: 'Invalid CVE ID format (expected CVE-YYYY-NNNNN+).' };
  }
  if (!isOnline()) return { ok: false, error: 'No Internet connection.' };

  const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(normalized)}`;
  try {
    const res = await fetchWithTimeout(url, { timeoutMs: 15000 });
    const body = await res.json();
    const vulns = (body as { vulnerabilities?: Array<{ cve?: Record<string, unknown> }> })?.vulnerabilities;
    const cve = vulns?.[0]?.cve;
    if (!cve) return { ok: false, error: 'No CVE found with that ID.' };

    // Description: first English value of the descriptions array.
    const descriptions = Array.isArray(cve.descriptions)
      ? cve.descriptions as Array<{ lang?: string; value?: string }>
      : [];
    const en = descriptions.find((d) => d.lang === 'en') ?? descriptions[0];
    const description = sanitizeStr(en?.value, 600);

    // CVSS + severity — pick the highest CVSS v3.x metric.
    let cvss: number | null = null;
    let severity: string | null = null;
    const metrics = (cve.metrics as Record<string, { cvssData?: { baseScore?: number; baseSeverity?: string } }> | undefined);
    if (metrics) {
      for (const key of ['cvssMetricV31', 'cvssMetricV30', 'cvssMetricV2']) {
        const m = metrics[key];
        const arr = Array.isArray(m) ? m : (m ? [m] : []);
        for (const entry of arr) {
          const score = sanitizeNum(entry.cvssData?.baseScore);
          if (score != null && (cvss == null || score > cvss)) {
            cvss = score;
            severity = sanitizeStr(entry.cvssData?.baseSeverity, 20) || null;
          }
        }
      }
    }

    // CWE ids.
    const weaknesses = Array.isArray(cve.weaknesses)
      ? cve.weaknesses as Array<{ description?: Array<{ value?: string }> }>
      : [];
    const cwe = sanitizeStrArr(
      weaknesses.flatMap((w) => (w.description || []).map((d) => d.value)),
    ).filter((s) => s.startsWith('CWE-')).slice(0, 10);

    // Affected products — cpeMatch lines (verbose). Take a short slice.
    const configs = Array.isArray(cve.configurations)
      ? cve.configurations as Array<{ nodes?: Array<{ cpeMatch?: Array<{ criteria?: string }> }> }>
      : [];
    const affectedProducts = sanitizeStrArr(
      configs.flatMap((c) => (c.nodes || []).flatMap((n) => (n.cpeMatch || []).map((m) => m.criteria))),
    ).slice(0, 12);

    const references = Array.isArray(cve.references)
      ? sanitizeStrArr((cve.references as Array<{ url?: string }>).map((r) => r.url))
      : [];

    return {
      ok: true,
      cve: {
        id: sanitizeStr(cve.id, 30),
        description,
        cvss,
        severity,
        cwe,
        affectedProducts,
        published: sanitizeStr(cve.published, 30),
        modified: sanitizeStr(cve.lastModified, 30),
        references,
      },
    };
  } catch (e) {
    if (e instanceof FetchHttpError) {
      return { ok: false, error: classifyError(e, e.status).kind === 'not_found'
        ? 'No CVE found with that ID.' : 'Provider temporarily unavailable.' };
    }
    return { ok: false, error: classifyError(e).kind === 'cors_blocked'
      ? 'Requires secure backend/proxy.' : 'Provider request failed.' };
  }
}

/** Save a CVE search result locally so it's available offline. */
export async function saveCveLocal(
  cve: NonNullable<CveSearchResult['cve']>,
): Promise<void> {
  const row: SavedCve = {
    id: cve.id,
    description: cve.description,
    cvss: cve.cvss,
    severity: cve.severity,
    cwe: cve.cwe,
    affectedProducts: cve.affectedProducts,
    published: cve.published,
    modified: cve.modified,
    references: cve.references,
    personalNotes: '',
    tags: [],
    personalAssessment: '',
    savedAt: new Date().toISOString(),
  };
  await db.savedCves.put(row);
}

/** Update a saved CVE's personal notes / tags / assessment. */
export async function updateSavedCve(
  id: string,
  fields: Partial<Pick<SavedCve, 'personalNotes' | 'tags' | 'personalAssessment'>>,
): Promise<void> {
  await db.savedCves.update(id, fields);
}

/** Delete a saved CVE. */
export async function deleteSavedCve(id: string): Promise<void> {
  await db.savedCves.delete(id);
}
