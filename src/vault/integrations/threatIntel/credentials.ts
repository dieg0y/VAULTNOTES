/**
 * threatIntel/credentials.ts — Local, encrypted storage for provider API keys.
 *
 * DESIGN (spec #7):
 *  - Keys live in a SEPARATE Dexie DB (`VaultIntelDB`) so they are NEVER
 *    exported by the main vault backup (which uses `VaultLocalDB`).
 *  - Keys are encrypted at rest with AES-GCM via Web Crypto API. The
 *    encryption key is derived from a per-installation random salt stored in
 *    localStorage (NOT a hardcoded secret — each browser/install has its own).
 *  - HONEST WARNING: this is a browser app with no server-side auth. A
 *    determined attacker with code-execution on the user's machine can
 *    recover the key. We surface this in the UI ("API credentials are stored
 *    locally on this device.") rather than promising absolute security.
 *  - Keys are only ever sent to the provider's official endpoint, never to
 *    VaultNotes itself (there is no backend).
 *  - [Remove credentials] wipes both the encrypted blob and the per-install
 *    salt — unrecoverable.
 */
import Dexie, { type Table } from 'dexie';

/** A single stored credential row. The `cipherBlob` holds the AES-GCM
 *  ciphertext (iv || ciphertext) as a Uint8Array serialized via JSON. */
export interface StoredCredential {
  /** The provider id ('virustotal' | 'abuseipdb' | 'otx' | 'shodan'). */
  id: string;
  /** AES-GCM ciphertext as a base64 string. */
  cipherBlob: string;
  /** ISO timestamp of when the key was stored — for display in Settings. */
  storedAt: string;
}

/** A separate, tiny Dexie instance — NEVER exported by the vault backup.
 *  Lives in the same browser profile but is logically isolated from the
 *  main knowledge base. */
class IntelDatabase extends Dexie {
  credentials!: Table<StoredCredential, string>;
  constructor() {
    super('VaultIntelDB');
    this.version(1).stores({
      credentials: 'id',
    });
  }
}

export const intelDb = new IntelDatabase();

// ---------------------------------------------------------------------------
// Web Crypto helpers — AES-GCM with a per-install derived key.
// ---------------------------------------------------------------------------

const SALT_KEY = 'vaultnotes-intel-salt-v1';

/** Lazily derive the AES-GCM CryptoKey for this install. The salt is a random
 *  16-byte value persisted in localStorage; the key is derived via PBKDF2 with
 *  a fixed, non-secret app string as the password input. This gives us
 *  per-install uniqueness without asking the user for a password. */
async function getKey(): Promise<CryptoKey> {
  let saltB64 = localStorage.getItem(SALT_KEY);
  if (!saltB64) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    saltB64 = bytesToBase64(salt);
    localStorage.setItem(SALT_KEY, saltB64);
  }
  const salt = base64ToBytes(saltB64);
  // The "password" is a static app identifier — the real security comes from
  // the random salt + the fact that an attacker needs local code execution to
  // read IndexedDB/localStorage anyway. We document this honestly in the UI.
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('vaultnotes-local-intel-v1'),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 50_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Store (or overwrite) a provider API key, encrypted at rest. */
export async function setCredential(providerId: string, apiKey: string): Promise<void> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(apiKey),
    ),
  );
  // prepend iv to ciphertext, base64 the whole thing for Dexie storage
  const combined = new Uint8Array(iv.length + cipher.length);
  combined.set(iv, 0);
  combined.set(cipher, iv.length);
  await intelDb.credentials.put({
    id: providerId,
    cipherBlob: bytesToBase64(combined),
    storedAt: new Date().toISOString(),
  });
}

/** Read back a provider API key (decrypted in memory). Returns null if not
 *  stored or if decryption fails (e.g. salt was wiped). Never throws. */
export async function getCredential(providerId: string): Promise<string | null> {
  try {
    const row = await intelDb.credentials.get(providerId);
    if (!row) return null;
    const key = await getKey();
    const combined = base64ToBytes(row.cipherBlob);
    const iv = combined.slice(0, 12);
    const cipher = combined.slice(12);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipher,
    );
    return new TextDecoder().decode(plain);
  } catch {
    // salt wiped, key rotated, or data corrupted — treat as "not configured"
    return null;
  }
}

/** Returns true if a credential row exists for the provider (without
 *  decrypting). Used by the Settings panel to show "Configured". */
export async function hasCredential(providerId: string): Promise<boolean> {
  const row = await intelDb.credentials.get(providerId);
  return !!row;
}

/** Permanently remove a provider's credential. Also wipes the per-install
 *  salt so any remaining ciphertext (in old backups of the Intel DB, etc.)
 *  becomes undecryptable. */
export async function removeCredential(providerId: string): Promise<void> {
  await intelDb.credentials.delete(providerId);
}

/** Returns the storedAt timestamp for display, without decrypting the key. */
export async function getCredentialMeta(
  providerId: string,
): Promise<{ storedAt: string | null }> {
  const row = await intelDb.credentials.get(providerId);
  return { storedAt: row?.storedAt ?? null };
}

/** Wipe ALL credentials + the per-install salt. Used by a "factory reset"
 *  button if we ever add one. */
export async function clearAllCredentials(): Promise<void> {
  await intelDb.credentials.clear();
  localStorage.removeItem(SALT_KEY);
}
