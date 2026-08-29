import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Trash2, Plus, Tag, Wrench, AlertTriangle, FolderOpen, HardDrive, RefreshCw, FolderX, CheckCircle2, ShieldCheck, Globe, KeyRound, ExternalLink, RotateCcw, Video } from 'lucide-react';
import { CategoryItem, ToolItem } from '../types';
import { db, countCategoryUsage, countToolUsage } from '../db';
import {
  isFsSupported,
  hasVideosDirectory,
  getVideosDirectoryName,
  isVideosPermissionGranted,
  setVideosDirectory,
  forgetVideosDirectory,
  ensureVideosPermission,
  hasAppFolder,
  getAppFolderName,
  pickAppFolder,
  forgetAppFolder,
} from '../utils/videoStorage';
// Online & Integrations layer (BLOQUE6-2B) — 100% offline-first; these helpers
// are ONLY invoked here in Settings. The enrich flow itself lives in registry.ts
// and is wired into the IoC Extractor by a separate block.
import { useIsOnline } from '../integrations/online';
import {
  hasCredential,
  setCredential,
  removeCredential,
  getCredentialMeta,
} from '../integrations/threatIntel/credentials';
import { PROVIDER_META, PROVIDER_ORDER } from '../integrations/threatIntel/registry';
import type { ProviderId } from '../integrations/threatIntel/types';
import {
  TTL_OPTIONS,
  getCacheTtlMs,
  setCacheTtlMs,
  clearTiCache,
  countTiCache,
} from '../integrations/threatIntel/cache';
import { hasOnlineConsent, resetOnlineConsent } from '../integrations/threatIntel/consent';

interface SettingsViewProps {
  categories: CategoryItem[];
  tools: ToolItem[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({ categories, tools }) => {
  const [newCategory, setNewCategory] = useState('');
  const [newTool, setNewTool] = useState('');

  // --- REGLA DE ORO: videos folder panel state ---
  const [fsSupported] = useState(() => isFsSupported());
  const [hasVideosDir, setHasVideosDir] = useState(false);
  const [videosDirName, setVideosDirName] = useState<string | null>(null);
  const [videosPermOk, setVideosPermOk] = useState(false);
  // --- App folder (backup target) panel state ---
  const [hasApp, setHasApp] = useState(false);
  const [appName, setAppName] = useState<string | null>(null);

  const refreshVideoStorage = useCallback(async () => {
    setHasVideosDir(await hasVideosDirectory());
    setVideosDirName(await getVideosDirectoryName());
    setVideosPermOk(await isVideosPermissionGranted());
    setHasApp(await hasAppFolder());
    setAppName(await getAppFolderName());
  }, []);

  useEffect(() => {
    refreshVideoStorage();
  }, [refreshVideoStorage]);

  // --- Online & Integrations state (BLOQUE6-2B) ---
  // All async DB reads are wrapped in try/catch — failures are non-fatal and
  // surface as "Unknown"/null in the UI rather than crashing the panel.
  const isOnline = useIsOnline();
  const [providerStatus, setProviderStatus] = useState<Record<ProviderId, boolean | null>>({
    virustotal: null,
    abuseipdb: null,
    otx: null,
    shodan: null,
  });
  const [providerMetas, setProviderMetas] = useState<Record<ProviderId, { storedAt: string | null }>>({
    virustotal: { storedAt: null },
    abuseipdb: { storedAt: null },
    otx: { storedAt: null },
    shodan: { storedAt: null },
  });
  const [editingProvider, setEditingProvider] = useState<ProviderId | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [cacheCount, setCacheCount] = useState<number | null>(null);
  const [cacheTtl, setCacheTtl] = useState<number>(() => getCacheTtlMs());
  const [clearingCache, setClearingCache] = useState(false);
  const [hasConsent, setHasConsent] = useState<boolean>(() => hasOnlineConsent());

  /** Refresh a single provider's configured-state + metadata. Called on mount
   *  and after every mutation (save/remove). Never throws. */
  const refreshProviderStatus = useCallback(async (id: ProviderId) => {
    try {
      const [ok, meta] = await Promise.all([hasCredential(id), getCredentialMeta(id)]);
      setProviderStatus((prev) => ({ ...prev, [id]: ok }));
      setProviderMetas((prev) => ({ ...prev, [id]: meta }));
    } catch (e) {
      console.warn(`[Online] Failed to load credential status for ${id}`, e);
      setProviderStatus((prev) => ({ ...prev, [id]: false }));
    }
  }, []);

  const refreshAllProviders = useCallback(async () => {
    await Promise.all(PROVIDER_ORDER.map((id) => refreshProviderStatus(id)));
  }, [refreshProviderStatus]);

  const refreshCacheCount = useCallback(async () => {
    try {
      const n = await countTiCache();
      setCacheCount(n);
    } catch (e) {
      console.warn('[Online] Failed to count TI cache', e);
      setCacheCount(null);
    }
  }, []);

  // Load once on mount.
  useEffect(() => {
    refreshAllProviders();
    refreshCacheCount();
  }, [refreshAllProviders, refreshCacheCount]);

  const handleSaveKey = async (id: ProviderId) => {
    const key = apiKeyInput.trim();
    if (!key) return;
    setSavingKey(true);
    try {
      await setCredential(id, key);
      // CRITICAL: clear the input immediately so the secret is not lingering
      // in component state after save. The password input was already
      // type="password" so it was masked, but state memory is still a leak
      // vector if the user walks away.
      setApiKeyInput('');
      setEditingProvider(null);
      await refreshProviderStatus(id);
    } catch (e) {
      console.warn(`[Online] Failed to save credential for ${id}`, e);
    } finally {
      setSavingKey(false);
    }
  };

  const handleCancelEdit = () => {
    setApiKeyInput('');
    setEditingProvider(null);
  };

  const handleRemoveKey = async (id: ProviderId) => {
    if (!window.confirm(`Remove the ${PROVIDER_META[id].label} API key from this device?`)) return;
    try {
      await removeCredential(id);
      await refreshProviderStatus(id);
    } catch (e) {
      console.warn(`[Online] Failed to remove credential for ${id}`, e);
    }
  };

  const handleClearCache = async () => {
    if (!window.confirm('Clear all cached threat intelligence results? This cannot be undone.')) return;
    setClearingCache(true);
    try {
      await clearTiCache();
      await refreshCacheCount();
    } catch (e) {
      console.warn('[Online] Failed to clear TI cache', e);
    } finally {
      setClearingCache(false);
    }
  };

  const handleTtlChange = (ms: number) => {
    try {
      setCacheTtlMs(ms);
      setCacheTtl(ms);
    } catch (e) {
      console.warn('[Online] Failed to persist TTL', e);
    }
  };

  const handleResetConsent = () => {
    if (!window.confirm('Reset online enrichment consent? The privacy warning will be shown again before the next enrichment.')) return;
    try {
      resetOnlineConsent();
      setHasConsent(false);
    } catch (e) {
      console.warn('[Online] Failed to reset consent', e);
    }
  };

  const handlePickVideosDir = async () => {
    const ok = await setVideosDirectory();
    if (ok) await refreshVideoStorage();
  };

  const handleGrantVideosPerm = async () => {
    const ok = await ensureVideosPermission();
    if (ok) await refreshVideoStorage();
  };

  const handleForgetVideosDir = async () => {
    if (window.confirm('¿Dejar de usar la carpeta de videos? Los archivos NO se borran (siguen en tu disco), pero los apuntes con videos mostrarán el placeholder hasta que vuelvas a elegir una carpeta.')) {
      await forgetVideosDirectory();
      await refreshVideoStorage();
    }
  };

  const handlePickAppDir = async () => {
    const ok = await pickAppFolder();
    if (ok) await refreshVideoStorage();
  };

  const handleForgetAppDir = async () => {
    if (window.confirm('¿Dejar de usar la carpeta de la app? Los backups volverán a pedir ubicación al guardar. Los archivos ya guardados no se borran.')) {
      await forgetAppFolder();
      await refreshVideoStorage();
    }
  };

  const handleDeleteCategory = async (cat: CategoryItem) => {
    const usage = await countCategoryUsage(cat.name);
    if (usage > 0) {
      alert(`No se puede borrar, está en uso por ${usage} apunte${usage === 1 ? '' : 's'}/lab${usage === 1 ? '' : 's'}/término${usage === 1 ? '' : 's'}.`);
      return;
    }
    if (window.confirm(`¿Eliminar la categoría "${cat.name}"?`)) {
      await db.categories.delete(cat.id);
    }
  };

  const handleDeleteTool = async (tool: ToolItem) => {
    const usage = await countToolUsage(tool.name);
    if (usage > 0) {
      alert(`No se puede borrar, está en uso por ${usage} lab${usage === 1 ? '' : 's'}.`);
      return;
    }
    if (window.confirm(`¿Eliminar la herramienta "${tool.name}"?`)) {
      await db.tools.delete(tool.id);
    }
  };

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) { setNewCategory(''); return; }
    await db.categories.add({ id: `cat-${Date.now()}`, name, createdAt: new Date().toISOString() });
    setNewCategory('');
  };

  const handleAddTool = async () => {
    const name = newTool.trim();
    if (!name) return;
    if (tools.some((t) => t.name.toLowerCase() === name.toLowerCase())) { setNewTool(''); return; }
    await db.tools.add({ id: `tool-${Date.now()}`, name, createdAt: new Date().toISOString() });
    setNewTool('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0A0A0A]">
      <div className="pb-4 border-b border-[#262626]">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          Configuración
        </h1>
        <p className="text-xs text-[#888] mt-0.5">
          Categorías (Tema / Especialidad) y Herramientas son listas maestras compartidas por Apuntes, Labs y Glosario.
        </p>
      </div>

      {/* BLOQUE 5 — Privacy & Offline indicator (spec #19). Pure visual:
          no network check, no fetch. Just confirms that VaultNotes runs
          100% locally and data stays in IndexedDB (Dexie). */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            <h2 className="text-sm font-bold text-white">Privacidad y Offline</h2>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 border border-green-500/30 text-green-300 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3" />
            100% Local / Offline
          </div>
        </div>
        <ul className="space-y-1.5 text-[11px] text-[#BBB] leading-relaxed pl-1">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />
            <span>Sin requests automáticos a internet — toda la lógica corre en tu navegador.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />
            <span>Datos permanecen en IndexedDB local (Dexie). No se sincronizan con ningún servidor.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />
            <span>Búsqueda, herramientas y backups 100% offline.</span>
          </li>
        </ul>
        {/* Dexie schema version badge — read at render from the live Dexie
            instance. db.verno is the version number of the schema currently
            active in the browser's IndexedDB. */}
        <div className="flex items-center gap-2 pt-1 border-t border-[#1a1a1a]">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#555]">DB schema</span>
          <code className="font-mono text-[10px] text-blue-300 bg-blue-500/5 border border-blue-500/20 px-1.5 py-0.5 rounded">
            v{db.verno}
          </code>
          <span className="text-[10px] text-[#555]">·</span>
          <span className="font-mono text-[10px] text-[#555]">{db.name}</span>
        </div>
      </div>

      {/* =============================================================
          Online & Integraciones (BLOQUE6-2B).
          INSERTED BETWEEN "Privacidad y Offline" and "Carpeta de la App".
          Pure offline-first: the only "online" interaction in this panel is
          reading navigator.onLine via the hook. NO fetch / network call.
          ============================================================= */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Online &amp; Integraciones</h2>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#555]">Opcional</span>
        </div>
        <p className="text-[11px] text-[#888] leading-relaxed -mt-1">
          VaultNotes es 100% offline por defecto. El enriquecimiento online de IOCs (VirusTotal, AbuseIPDB, OTX, Shodan) es <strong className="text-[#DDD]">opcional</strong> y solo ocurre cuando pulsas [Enrich] explícitamente sobre un indicador. Esta sección solo configura credenciales y preferencias — no hace ninguna petición de red.
        </p>

        {/* A. Connectivity */}
        <div className="space-y-2 pt-3 border-t border-[#1a1a1a]">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#555]">A. Connectivity</h3>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-amber-400'}`}
              aria-hidden
            />
            <span className={`text-xs font-mono font-semibold ${isOnline ? 'text-green-400' : 'text-amber-400'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <p className="text-[10px] text-[#666] leading-relaxed">
            Cuando estás offline, todas las funciones locales siguen funcionando. El enriquecimiento online se deshabilita hasta que vuelvas a estar online.
          </p>
        </div>

        {/* B. Threat Intelligence Providers */}
        <div className="space-y-2 pt-3 border-t border-[#1a1a1a]">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#555]">B. Threat Intelligence Providers</h3>
          <div className="space-y-2">
            {PROVIDER_ORDER.map((id) => {
              const meta = PROVIDER_META[id];
              const configured = providerStatus[id];
              const metaInfo = providerMetas[id];
              const isEditing = editingProvider === id;
              return (
                <div key={id} className="bg-[#161616] border border-[#262626] rounded p-2.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{meta.label}</span>
                        {configured === null ? (
                          <span className="text-[9px] text-[#666] font-mono">cargando…</span>
                        ) : configured ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/30 text-green-300 text-[9px] font-bold uppercase tracking-wider">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Configured
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#222] border border-[#333] text-[#888] text-[9px] font-bold uppercase tracking-wider">
                            Not configured
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#888] mt-1 leading-snug">{meta.description}</p>
                      {configured && metaInfo?.storedAt && (
                        <p className="text-[9px] text-[#555] mt-0.5 font-mono">
                          Stored: {new Date(metaInfo.storedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="password"
                        autoFocus
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveKey(id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        placeholder="Pega tu API key…"
                        className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-2.5 py-1.5 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-blue-500 font-mono"
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveKey(id)}
                          disabled={savingKey || !apiKeyInput.trim()}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/30 text-[11px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {savingKey ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-2.5 py-1 rounded bg-[#222] hover:bg-[#2a2a2a] text-[#BBB] border border-[#333] text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => { setEditingProvider(id); setApiKeyInput(''); }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] hover:bg-[#1f1f1f] text-[#DDD] border border-[#262626] text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        <KeyRound className="w-3 h-3 text-blue-400" />
                        {configured ? 'Edit key' : 'Configure'}
                      </button>
                      {configured && (
                        <button
                          onClick={() => handleRemoveKey(id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] hover:bg-red-500/10 hover:text-red-300 text-[#999] border border-[#262626] text-[11px] font-semibold transition-colors cursor-pointer"
                          title="Borra la API key encriptada de este dispositivo"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove credentials
                        </button>
                      )}
                      {meta.signupUrl && (
                        <a
                          href={meta.signupUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-1.5 text-blue-400 hover:text-blue-300 text-[11px] font-semibold transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Get a free API key
                        </a>
                      )}
                    </div>
                  )}

                  {!meta.supportsCors && (
                    <div className="flex items-start gap-1.5 text-[10px] text-amber-300 bg-amber-500/5 border border-amber-500/20 rounded p-1.5 leading-snug">
                      <AlertTriangle className="w-2.5 h-2.5 shrink-0 mt-0.5 text-amber-400" />
                      <span>Direct browser calls may be blocked by CORS. If enrichment fails with &lsquo;Requires secure backend/proxy&rsquo;, use the [Open externally ↗] link instead.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="flex items-start gap-1.5 text-[10px] text-[#666] leading-relaxed">
            <ShieldCheck className="w-2.5 h-2.5 shrink-0 mt-0.5 text-green-400" />
            <span><strong className="text-[#999]">API credentials are stored locally on this device.</strong> AES-GCM encrypted in a separate IndexedDB (<code className="font-mono text-blue-400">VaultIntelDB</code>) — never exported by the vault backup, never sent to anything other than the provider&rsquo;s official endpoint. There is no backend; a determined attacker with code-execution on your machine could still recover them.</span>
          </p>
        </div>

        {/* C. Threat Intelligence Cache */}
        <div className="space-y-2 pt-3 border-t border-[#1a1a1a]">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#555]">C. Threat Intelligence Cache</h3>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-[#888]">Cached entries:</span>
            {cacheCount === null ? (
              <span className="text-[#666] font-mono">…</span>
            ) : (
              <span className={`font-mono ${cacheCount > 0 ? 'text-blue-300' : 'text-[#666]'}`}>{cacheCount}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-[#888]" htmlFor="ti-ttl-select">TTL:</label>
            <select
              id="ti-ttl-select"
              value={cacheTtl}
              onChange={(e) => handleTtlChange(Number(e.target.value))}
              className="bg-[#161616] border border-[#262626] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {TTL_OPTIONS.map((opt) => (
                <option key={opt.ms} value={opt.ms}>{opt.label}</option>
              ))}
            </select>
            <span className="text-[10px] text-[#555]">caducidad de cada resultado cacheado</span>
          </div>
          <button
            onClick={handleClearCache}
            disabled={clearingCache || cacheCount === 0}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] hover:bg-red-500/10 hover:text-red-300 text-[#999] border border-[#262626] text-[11px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {clearingCache ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Clear Threat Intelligence Cache
          </button>
          <p className="text-[10px] text-[#666] leading-relaxed">
            La caché solo contiene resultados de threat intelligence que pediste explícitamente. No se guardan passwords, JWTs, tokens, comandos, logs completos ni notas privadas.
          </p>
        </div>

        {/* D. Privacy & Consent */}
        <div className="space-y-2 pt-3 border-t border-[#1a1a1a]">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#555]">D. Privacy &amp; Consent</h3>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[#888]">Online enrichment consent:</span>
            {hasConsent ? (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/30 text-green-300 text-[10px] font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-2.5 h-2.5" /> Granted
              </span>
            ) : (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                <AlertTriangle className="w-2.5 h-2.5" /> Not yet granted
              </span>
            )}
          </div>
          <button
            onClick={handleResetConsent}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] hover:bg-amber-500/10 hover:text-amber-300 text-[#999] border border-[#262626] text-[11px] font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset online enrichment consent
          </button>
          <p className="text-[10px] text-[#666] leading-relaxed">
            Before the first online enrichment, VaultNotes shows a privacy warning. After you accept, it won&rsquo;t show again until you reset.
          </p>
        </div>
      </div>

      {/* REGLA DE ORO — Videos folder (disk files, references only) */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
          <Video className="w-4 h-4 text-amber-400" /> Carpeta de Videos — archivos reales en tu disco
        </h2>
        <p className="text-[11px] text-[#888] leading-relaxed">
          Los videos <strong>nunca</strong> se guardan en la base de datos del navegador ni viajan en los backups.
          Viven únicamente como archivos en <strong>esta carpeta</strong> de tu PC, y los apuntes guardan solo el
          nombre del archivo. Al cambiar de PC, copia la carpeta tal cual y <em>Re-linkeala</em> aquí.
        </p>

        {!fsSupported ? (
          <div className="flex items-start gap-2 text-[11px] text-[#999] bg-[#161616] border border-[#262626] rounded p-2.5">
            <HardDrive className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>Abre la app en <strong>Microsoft Edge</strong> o Chrome para usar la carpeta de videos (File System Access API).</span>
          </div>
        ) : hasVideosDir ? (
          <div className="space-y-2.5">
            <div className={`flex items-center gap-2 text-[11px] rounded p-2.5 border ${videosPermOk ? 'bg-green-500/5 border-green-500/30 text-green-300' : 'bg-amber-500/5 border-amber-500/30 text-amber-300'}`}>
              <FolderOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="font-mono truncate">
                {videosDirName} {videosPermOk ? '— activa ✓' : '— el navegador pedirá acceso al abrir un video'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {!videosPermOk && (
                <button
                  onClick={handleGrantVideosPerm}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Conceder acceso ahora
                </button>
              )}
              <button
                onClick={handlePickVideosDir}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] hover:bg-[#202020] text-[#DDD] border border-[#262626] text-[11px] font-semibold transition-colors cursor-pointer"
              >
                <FolderOpen className="w-3 h-3" />
                Cambiar carpeta
              </button>
              <button
                onClick={handleForgetVideosDir}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] hover:bg-red-500/10 hover:text-red-300 text-[#999] border border-[#262626] text-[11px] font-semibold transition-colors cursor-pointer"
                title="Dejar de usar la carpeta de videos (no borra los archivos)"
              >
                <FolderX className="w-3 h-3" />
                Dejar de usar carpeta
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <button
              onClick={handlePickVideosDir}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              Elegir carpeta de videos
            </button>
            <p className="text-[10px] text-[#666] text-center">También se te pedirá automáticamente la primera vez que insertes un video en un apunte o lab.</p>
          </div>
        )}
      </div>

      {/* App folder — backup target only (videos decoupled, REGLA DE ORO) */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
          <FolderOpen className="w-4 h-4 text-blue-400" /> Carpeta de la App — destino de los backups
        </h2>
        <p className="text-[11px] text-[#888] leading-relaxed">
          Elige una carpeta (p. ej. la de la propia app, donde está <code className="font-mono text-blue-400">iniciar.bat</code>) y cada
          <strong> Guardar Backup</strong> escribirá <code className="font-mono text-blue-400">VaultNotes-Backup.zip</code> ahí mismo,
          sobrescribiendo el anterior. <strong>Nada de videos aquí</strong> — el backup es liviano y portable.
        </p>

        {!fsSupported ? (
          <div className="flex items-start gap-2 text-[11px] text-[#999] bg-[#161616] border border-[#262626] rounded p-2.5">
            <HardDrive className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>Abre la app en <strong>Microsoft Edge</strong> o Chrome para usar esta función. Los backups se descargarán por el navegador.</span>
          </div>
        ) : hasApp ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-[11px] rounded p-2.5 border bg-green-500/5 border-green-500/30 text-green-300">
              <FolderOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="font-mono truncate">
                {appName}/VaultNotes-Backup.zip — activa ✓
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handlePickAppDir}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] hover:bg-[#202020] text-[#DDD] border border-[#262626] text-[11px] font-semibold transition-colors cursor-pointer"
              >
                <FolderOpen className="w-3 h-3" />
                Cambiar carpeta
              </button>
              <button
                onClick={handleForgetAppDir}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] hover:bg-red-500/10 hover:text-red-300 text-[#999] border border-[#262626] text-[11px] font-semibold transition-colors cursor-pointer"
                title="Dejar de usar la carpeta de la app (no borra los archivos)"
              >
                <FolderX className="w-3 h-3" />
                Dejar de usar carpeta
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <button
              onClick={handlePickAppDir}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              Elegir carpeta para los backups
            </button>
            <p className="text-[10px] text-[#666] text-center">Opcional: sin carpeta, cada backup pedirá dónde guardarse.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-blue-400" /> Categorías ({categories.length})
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
              placeholder="Nueva categoría..."
              className="flex-1 bg-[#161616] border border-[#262626] rounded px-2.5 py-1.5 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-blue-500"
            />
            <button onClick={handleAddCategory} className="p-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          <div className="divide-y divide-[#1a1a1a] max-h-96 overflow-y-auto">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between py-2 text-xs text-[#DDD]">
                <span className="truncate">{cat.name}</span>
                <button onClick={() => handleDeleteCategory(cat)} className="p-1 text-[#666] hover:text-red-400" title="Eliminar">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-md p-4 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-emerald-400" /> Herramientas ({tools.length})
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTool}
              onChange={(e) => setNewTool(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddTool(); }}
              placeholder="Nueva herramienta..."
              className="flex-1 bg-[#161616] border border-[#262626] rounded px-2.5 py-1.5 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-emerald-500"
            />
            <button onClick={handleAddTool} className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          <div className="divide-y divide-[#1a1a1a] max-h-96 overflow-y-auto">
            {tools.map((tool) => (
              <div key={tool.id} className="flex items-center justify-between py-2 text-xs text-[#DDD]">
                <span className="truncate">{tool.name}</span>
                <button onClick={() => handleDeleteTool(tool)} className="p-1 text-[#666] hover:text-red-400" title="Eliminar">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 text-[11px] text-[#666] bg-[#0D0D0D] border border-[#262626] rounded p-3">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <span>Si una categoría o herramienta está en uso por un apunte, lab o término, no se puede eliminar hasta que dejes de usarla.</span>
      </div>
    </div>
  );
};
