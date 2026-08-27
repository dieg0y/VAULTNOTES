/**
 * RbacAnalyzerTool.tsx — 100% offline RBAC (Role-Based Access Control) modeler.
 *
 * WHAT IT DOES
 * ------------
 * Lets the user build RBAC scenarios from scratch: define Users, Roles, and
 * Permissions (action + resource), then assign roles to users and permissions
 * to roles via checkboxes. The tool computes live:
 *   - Effective permissions per user (union of permissions across all
 *     assigned roles, de-duplicated by permission id).
 *   - A permission matrix (rows = roles, columns = Read/Write/Delete/Admin,
 *     cell = ✓ if the role has at least one permission with that action).
 *   - Detections: excessive privilege (>5 perms), admin privileges (any
 *     Admin action), conflicting Read+Delete on the same resource, unused
 *     permissions, unused roles, orphan users.
 *
 * PERSISTENCE
 * ------------
 * Scenarios are serialized as JSON and stored in the existing Dexie table
 * `rbacModels` (keyPath `'id, name, createdAt, updatedAt'`) — same DB as
 * notes/labs/refs, NO separate database. The list of saved scenarios is read
 * live via `useLiveQuery(() => db.rbacModels.toArray())` so the dropdown
 * auto-updates when scenarios are added/edited/deleted from elsewhere.
 *
 * CROSS-TOOL HAND-OFF
 * --------------------
 * - [Add to Note]: builds an HTML-escaped table of users/roles/permissions/
 *   matrix/effective permissions/detections and enqueues it via
 *   `useNoteStore.getState().enqueueNote(title, html)`. All user content is
 *   escaped via escapeHtml() — never injected raw, never
 *   dangerouslySetInnerHTML.
 *
 * DEEP-LINK SUPPORT
 * ------------------
 * `autoOpenId` (string | number) is accepted for future deep-link support
 * (e.g. opening a saved scenario by id). Currently unused — reserved.
 *
 * SECURITY CONSTRAINTS
 * ---------------------
 * 100% offline. No fetch, no axios, no XMLHttpRequest, no telemetry. No
 * Active Directory, Entra ID, or external service calls — read-only
 * in-memory model. No code execution — no eval, no new Function, no
 * setTimeout(string). No window.prompt/confirm/alert — inline inputs/tosts.
 * No dangerouslySetInnerHTML anywhere. Strict TypeScript — zero `any`,
 * zero @ts-ignore, zero non-null assertions.
 *
 * Spec reference: Task ID 4-c — RBAC Analyzer (4th tool of the IAM/Vuln/Linux
 * block). Persists scenarios in the Dexie `rbacModels` table (added at DB v11).
 */
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Plus, Trash2, Save, BookOpen, X, ShieldAlert, Users, UserCog, Lock,
  CheckCircle, AlertTriangle, FileText,
} from 'lucide-react';
import {
  InfoBanner, btnGhost, btnDanger, inputCls, safeStr,
} from './_shared';
import { db, type RbacModel } from '../../db';
import { useNoteStore } from '../../store/noteStore';

// Stable fallback so the useLiveQuery result keeps a constant reference while
// the first query is in flight (inline `?? []` churns every render).
const EMPTY_SCENARIOS: RbacModel[] = [];

/* =============================================================
 * Strict types
 * ============================================================= */
interface RbacUser {
  id: string;
  name: string;
  description: string;
  roleIds: string[];
}

interface RbacRole {
  id: string;
  name: string;
  description: string;
  permissionIds: string[];
}

type RbacAction = 'Read' | 'Write' | 'Delete' | 'Admin';

interface RbacPermission {
  id: string;
  name: string;
  action: RbacAction;
  resource: string;
}

interface RbacState {
  users: RbacUser[];
  roles: RbacRole[];
  permissions: RbacPermission[];
}

interface RbacAnalyzerProps {
  /** Reserved for future deep-link support (open a saved scenario by id). */
  autoOpenId?: string | number;
}

interface Detection {
  severity: 'critical' | 'warning' | 'info';
  text: string;
}

interface MatrixRow {
  role: RbacRole;
  has: Record<RbacAction, boolean>;
}

/* =============================================================
 * Constants & small helpers
 * ============================================================= */
const ACTIONS: RbacAction[] = ['Read', 'Write', 'Delete', 'Admin'];

const ACTION_BADGE: Record<RbacAction, string> = {
  Read:   'bg-blue-500/10 border border-blue-500/40 text-blue-300',
  Write:  'bg-yellow-500/10 border border-yellow-500/40 text-yellow-300',
  Delete: 'bg-orange-500/10 border border-orange-500/40 text-orange-300',
  Admin:  'bg-red-500/10 border border-red-500/40 text-red-300',
};

const DETECTION_BADGE: Record<Detection['severity'], string> = {
  critical: 'bg-red-500/10 border border-red-500/40 text-red-300',
  warning:  'bg-yellow-500/10 border border-yellow-500/40 text-yellow-300',
  info:     'bg-blue-500/10 border border-blue-500/40 text-blue-300',
};

const DETECTION_LABEL: Record<Detection['severity'], string> = {
  critical: 'CRITICAL',
  warning:  'WARNING',
  info:     'INFO',
};

/** Generate a fresh UUID. Prefers browser-native `crypto.randomUUID`
 *  (lib.dom, TypeScript 4.4+) — defensive fallback for older runtimes. */
function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** HTML escape for the [Add to Note] table — 5 chars, no DOM helpers needed. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function newEmptyUser(): RbacUser {
  return { id: genId(), name: '', description: '', roleIds: [] };
}

function newEmptyRole(): RbacRole {
  return { id: genId(), name: '', description: '', permissionIds: [] };
}

function newEmptyPermission(): RbacPermission {
  return { id: genId(), name: '', action: 'Read', resource: '' };
}

function emptyState(): RbacState {
  return { users: [], roles: [], permissions: [] };
}

/** Defensive parse of a JSON-serialized RbacState coming from IndexedDB.
 *  Validates shape without using `any` — uses `unknown` + type guards. */
function normalizeState(parsed: unknown): RbacState {
  if (!parsed || typeof parsed !== 'object') return emptyState();
  const obj = parsed as Record<string, unknown>;
  const usersRaw = Array.isArray(obj.users) ? obj.users : [];
  const rolesRaw = Array.isArray(obj.roles) ? obj.roles : [];
  const permsRaw = Array.isArray(obj.permissions) ? obj.permissions : [];

  const users: RbacUser[] = usersRaw.map((u): RbacUser => {
    if (!u || typeof u !== 'object') return newEmptyUser();
    const o = u as Record<string, unknown>;
    return {
      id: typeof o.id === 'string' ? o.id : genId(),
      name: typeof o.name === 'string' ? o.name : '',
      description: typeof o.description === 'string' ? o.description : '',
      roleIds: Array.isArray(o.roleIds)
        ? o.roleIds.filter((x): x is string => typeof x === 'string')
        : [],
    };
  });

  const roles: RbacRole[] = rolesRaw.map((r): RbacRole => {
    if (!r || typeof r !== 'object') return newEmptyRole();
    const o = r as Record<string, unknown>;
    return {
      id: typeof o.id === 'string' ? o.id : genId(),
      name: typeof o.name === 'string' ? o.name : '',
      description: typeof o.description === 'string' ? o.description : '',
      permissionIds: Array.isArray(o.permissionIds)
        ? o.permissionIds.filter((x): x is string => typeof x === 'string')
        : [],
    };
  });

  const permissions: RbacPermission[] = permsRaw.map((p): RbacPermission => {
    if (!p || typeof p !== 'object') return newEmptyPermission();
    const o = p as Record<string, unknown>;
    const actionRaw = o.action;
    const finalAction: RbacAction =
      typeof actionRaw === 'string' &&
      (ACTIONS as string[]).includes(actionRaw)
        ? (actionRaw as RbacAction)
        : 'Read';
    return {
      id: typeof o.id === 'string' ? o.id : genId(),
      name: typeof o.name === 'string' ? o.name : '',
      action: finalAction,
      resource: typeof o.resource === 'string' ? o.resource : '',
    };
  });

  return { users, roles, permissions };
}

/* =============================================================
 * Derived analysis (pure functions — no React)
 * ============================================================= */

/** For each user, the union of permissions across all assigned roles
 *  (de-duplicated by permission id; preserves insertion order). */
function computeEffectivePermissions(state: RbacState): Map<string, RbacPermission[]> {
  const result = new Map<string, RbacPermission[]>();
  for (const user of state.users) {
    const perms: RbacPermission[] = [];
    const seen = new Set<string>();
    for (const roleId of user.roleIds) {
      const role = state.roles.find((r) => r.id === roleId);
      if (!role) continue;
      for (const permId of role.permissionIds) {
        if (seen.has(permId)) continue;
        seen.add(permId);
        const perm = state.permissions.find((p) => p.id === permId);
        if (perm) perms.push(perm);
      }
    }
    result.set(user.id, perms);
  }
  return result;
}

/** Matrix: for each role, whether it has at least one permission with each
 *  action. */
function computeMatrix(state: RbacState): MatrixRow[] {
  return state.roles.map((role) => {
    const has: Record<RbacAction, boolean> = {
      Read: false, Write: false, Delete: false, Admin: false,
    };
    for (const permId of role.permissionIds) {
      const perm = state.permissions.find((p) => p.id === permId);
      if (perm) has[perm.action] = true;
    }
    return { role, has };
  });
}

/** Detections: per-user (admin, excessive, conflicting) + global
 *  (unused permissions, unused roles, orphan users). */
function computeDetections(state: RbacState, effective: Map<string, RbacPermission[]>): Detection[] {
  const out: Detection[] = [];

  for (const user of state.users) {
    const perms = effective.get(user.id) ?? [];
    const uname = user.name || '(unnamed)';

    // Admin privileges — CRITICAL
    const adminPerms = perms.filter((p) => p.action === 'Admin');
    if (adminPerms.length > 0) {
      const resources = [...new Set(adminPerms.map((p) => p.resource || '(none)'))];
      out.push({
        severity: 'critical',
        text: `Admin privileges detected: ${uname} has Admin permission on ${resources.join(', ')}.`,
      });
    }

    // Excessive privilege — WARNING (>5 perms)
    if (perms.length > 5) {
      out.push({
        severity: 'warning',
        text: `Excessive privilege: ${uname} has ${perms.length} permissions (>5).`,
      });
    }

    // Conflicting permissions — WARNING (Read + Delete on same resource)
    const byResource = new Map<string, Set<RbacAction>>();
    for (const p of perms) {
      const res = p.resource || '(none)';
      let set = byResource.get(res);
      if (!set) { set = new Set(); byResource.set(res, set); }
      set.add(p.action);
    }
    for (const [res, actions] of byResource) {
      if (actions.has('Read') && actions.has('Delete')) {
        out.push({
          severity: 'warning',
          text: `Conflicting permissions: ${uname} has both Read and Delete on ${res}.`,
        });
      }
    }
  }

  // Unused permissions — INFO
  const usedPermIds = new Set<string>();
  for (const role of state.roles) {
    for (const permId of role.permissionIds) usedPermIds.add(permId);
  }
  for (const perm of state.permissions) {
    if (!usedPermIds.has(perm.id)) {
      out.push({
        severity: 'info',
        text: `Unused permission: ${perm.name || '(unnamed)'} is not assigned to any role.`,
      });
    }
  }

  // Unused roles — INFO
  const usedRoleIds = new Set<string>();
  for (const user of state.users) {
    for (const roleId of user.roleIds) usedRoleIds.add(roleId);
  }
  for (const role of state.roles) {
    if (!usedRoleIds.has(role.id)) {
      out.push({
        severity: 'info',
        text: `Unused role: ${role.name || '(unnamed)'} is not assigned to any user.`,
      });
    }
  }

  // Orphan users — INFO
  for (const user of state.users) {
    if (user.roleIds.length === 0) {
      out.push({
        severity: 'info',
        text: `Orphan user: ${user.name || '(unnamed)'} has no roles assigned.`,
      });
    }
  }

  return out;
}

/* =============================================================
 * UI subcomponents
 * ============================================================= */

/** Section header — mirrors Field from _shared but allows an icon in the
 *  label and an optional `actions` slot for inline buttons. */
const Section: React.FC<{
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ label, icon, children, actions }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between gap-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] inline-flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      {actions}
    </div>
    {children}
  </div>
);

/** Tiny pill badge for an action. */
const ActionBadge: React.FC<{ action: RbacAction }> = ({ action }) => (
  <span
    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${ACTION_BADGE[action]}`}
  >
    {action}
  </span>
);

/** Tiny pill badge for a detection severity. */
const DetectionBadge: React.FC<{ severity: Detection['severity'] }> = ({ severity }) => (
  <span
    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${DETECTION_BADGE[severity]}`}
  >
    {DETECTION_LABEL[severity]}
  </span>
);

/** User card — inline-editable name/description + per-role checkboxes. */
const UserCard: React.FC<{
  user: RbacUser;
  roles: RbacRole[];
  onChange: (patch: Partial<RbacUser>) => void;
  onRemove: () => void;
  onToggleRole: (roleId: string) => void;
}> = ({ user, roles, onChange, onRemove, onToggleRole }) => (
  <div className="bg-[#0D0D0D] border border-[#262626] rounded p-2.5 space-y-2">
    <div className="flex items-start gap-2">
      <div className="flex-1 min-w-0 space-y-1.5">
        <input
          className={inputCls + ' min-w-0'}
          placeholder="Username"
          value={user.name}
          onChange={(e) => onChange({ name: e.target.value })}
          spellCheck={false}
        />
        <input
          className={inputCls + ' min-w-0 text-[10px]'}
          placeholder="Description (optional)"
          value={user.description}
          onChange={(e) => onChange({ description: e.target.value })}
          spellCheck={false}
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        title="Remove user"
        className="text-red-400 hover:bg-red-500/10 p-1 rounded transition-colors cursor-pointer shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
    <div>
      <div className="text-[9px] uppercase tracking-widest text-[#555] mb-1.5">
        Assigned roles
      </div>
      {roles.length === 0 ? (
        <div className="text-[10px] text-[#555] italic">No roles defined.</div>
      ) : (
        <div className="space-y-1">
          {roles.map((role) => {
            const checked = user.roleIds.includes(role.id);
            return (
              <label
                key={role.id}
                className="flex items-center gap-2 cursor-pointer text-[11px] text-[#DDD] hover:text-white"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleRole(role.id)}
                  className="accent-blue-500"
                />
                <span className="font-mono">{role.name || '(unnamed role)'}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  </div>
);

/** Role card — inline-editable name/description + per-permission checkboxes. */
const RoleCard: React.FC<{
  role: RbacRole;
  permissions: RbacPermission[];
  onChange: (patch: Partial<RbacRole>) => void;
  onRemove: () => void;
  onTogglePermission: (permissionId: string) => void;
}> = ({ role, permissions, onChange, onRemove, onTogglePermission }) => (
  <div className="bg-[#0D0D0D] border border-[#262626] rounded p-2.5 space-y-2">
    <div className="flex items-start gap-2">
      <div className="flex-1 min-w-0 space-y-1.5">
        <input
          className={inputCls + ' min-w-0'}
          placeholder="Role name"
          value={role.name}
          onChange={(e) => onChange({ name: e.target.value })}
          spellCheck={false}
        />
        <input
          className={inputCls + ' min-w-0 text-[10px]'}
          placeholder="Description (optional)"
          value={role.description}
          onChange={(e) => onChange({ description: e.target.value })}
          spellCheck={false}
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        title="Remove role"
        className="text-red-400 hover:bg-red-500/10 p-1 rounded transition-colors cursor-pointer shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
    <div>
      <div className="text-[9px] uppercase tracking-widest text-[#555] mb-1.5">
        Permissions
      </div>
      {permissions.length === 0 ? (
        <div className="text-[10px] text-[#555] italic">No permissions defined.</div>
      ) : (
        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
          {permissions.map((perm) => {
            const checked = role.permissionIds.includes(perm.id);
            return (
              <label
                key={perm.id}
                className="flex items-center gap-2 cursor-pointer text-[11px] text-[#DDD] hover:text-white"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onTogglePermission(perm.id)}
                  className="accent-blue-500"
                />
                <span className="font-mono flex-1 min-w-0 truncate">
                  {perm.name || '(unnamed)'}
                </span>
                <ActionBadge action={perm.action} />
              </label>
            );
          })}
        </div>
      )}
    </div>
  </div>
);

/** Permission card — inline-editable name + action dropdown + resource input. */
const PermissionCard: React.FC<{
  perm: RbacPermission;
  onChange: (patch: Partial<RbacPermission>) => void;
  onRemove: () => void;
}> = ({ perm, onChange, onRemove }) => (
  <div className="bg-[#0D0D0D] border border-[#262626] rounded p-2.5 space-y-2">
    <div className="flex items-start gap-2">
      <div className="flex-1 min-w-0 space-y-1.5">
        <input
          className={inputCls + ' min-w-0'}
          placeholder="Permission name"
          value={perm.name}
          onChange={(e) => onChange({ name: e.target.value })}
          spellCheck={false}
        />
        <div className="grid grid-cols-2 gap-1.5">
          <select
            className={inputCls + ' text-[10px]'}
            value={perm.action}
            onChange={(e) => onChange({ action: e.target.value as RbacAction })}
          >
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <input
            className={inputCls + ' min-w-0 text-[10px]'}
            placeholder="Resource"
            value={perm.resource}
            onChange={(e) => onChange({ resource: e.target.value })}
            spellCheck={false}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        title="Remove permission"
        className="text-red-400 hover:bg-red-500/10 p-1 rounded transition-colors cursor-pointer shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

/** Permission matrix table — rows = roles, columns = Read/Write/Delete/Admin. */
const MatrixTable: React.FC<{ rows: MatrixRow[] }> = ({ rows }) => (
  <div className="bg-[#0D0D0D] border border-[#262626] rounded overflow-x-auto">
    <table className="w-full text-[10px] font-mono">
      <thead>
        <tr className="border-b border-[#262626]">
          <th className="text-left px-2 py-1.5 text-[9px] uppercase tracking-widest text-[#555]">
            Role
          </th>
          {ACTIONS.map((a) => (
            <th
              key={a}
              className="text-center px-2 py-1.5 text-[9px] uppercase tracking-widest text-[#555]"
            >
              {a}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-2 py-3 text-center text-[#555] italic">
              No roles.
            </td>
          </tr>
        ) : (
          rows.map(({ role, has }) => (
            <tr key={role.id} className="border-b border-[#1A1A1A] last:border-b-0">
              <td className="px-2 py-1.5 text-white break-words min-w-[100px]">{role.name || '(unnamed)'}</td>
              {ACTIONS.map((a) => (
                <td key={a} className="text-center px-2 py-1.5">
                  {has[a] ? (
                    <CheckCircle className="w-3 h-3 inline text-blue-400" />
                  ) : (
                    <span className="text-[#333]">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

/** Effective permissions per user — list of "username → permission badges". */
const EffectiveList: React.FC<{
  state: RbacState;
  effective: Map<string, RbacPermission[]>;
}> = ({ state, effective }) => (
  <div className="space-y-2">
    {state.users.length === 0 ? (
      <div className="text-[10px] text-[#555] italic">No users.</div>
    ) : (
      state.users.map((user) => {
        const perms = effective.get(user.id) ?? [];
        return (
          <div
            key={user.id}
            className="bg-[#0D0D0D] border border-[#262626] rounded p-2 space-y-1"
          >
            <div className="text-[11px] font-mono text-white">
              {user.name || '(unnamed)'}
            </div>
            {perms.length === 0 ? (
              <div className="text-[10px] text-[#555] italic">
                No effective permissions.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {perms.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#161616] border border-[#262626] text-[#DDD]"
                  >
                    {p.name || '(unnamed)'}
                    <ActionBadge action={p.action} />
                    <span className="text-[#555]">·</span>
                    <span className="text-[#888]">{p.resource || '?'}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })
    )}
  </div>
);

/** Detections list — each detection rendered with a colored badge. */
const DetectionsList: React.FC<{ detections: Detection[] }> = ({ detections }) => (
  <div className="space-y-1">
    {detections.length === 0 ? (
      <div className="text-[10px] text-green-400/70 italic flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        No detections — clean RBAC model.
      </div>
    ) : (
      detections.map((d, i) => (
        <div
          key={i}
          className="flex items-start gap-2 px-2 py-1.5 rounded bg-[#0D0D0D] border border-[#262626]"
        >
          <DetectionBadge severity={d.severity} />
          <span className="text-[10px] text-[#CCC] leading-snug flex-1">
            {d.text}
          </span>
        </div>
      ))
    )}
  </div>
);

/* =============================================================
 * Main component
 * ============================================================= */
export const RbacAnalyzerTool: React.FC<RbacAnalyzerProps> = ({ autoOpenId }) => {
  // autoOpenId is reserved for future deep-link support — currently unused.
  void autoOpenId;

  /* ---- Live list of saved scenarios from Dexie ---- */
  const scenarios: RbacModel[] =
    useLiveQuery(() => db.rbacModels.toArray(), [], EMPTY_SCENARIOS);

  /* ---- The editable RBAC model — empty by default ---- */
  const [state, setState] = useState<RbacState>(emptyState);

  /* ---- ID of the saved scenario currently loaded (null = unsaved) ---- */
  const [editingId, setEditingId] = useState<string | null>(null);

  /* ---- Name shown in the dropdown / used when saving ---- */
  const [scenarioName, setScenarioName] = useState<string>('');

  /* ---- Inline save input ---- */
  const [showSaveInput, setShowSaveInput] = useState<boolean>(false);
  const [saveInputValue, setSaveInputValue] = useState<string>('');

  /* ---- Short-lived toast feedback ---- */
  const [toast, setToast] = useState<string | null>(null);

  const flashToast = useCallback((msg: string, ms = 2500): void => {
    setToast(msg);
    window.setTimeout(() => setToast(null), ms);
  }, []);

  /* ---- Derived analysis (memoized; recomputes when state changes) ---- */
  const effective = useMemo(() => computeEffectivePermissions(state), [state]);
  const matrix = useMemo(() => computeMatrix(state), [state]);
  const detections = useMemo(
    () => computeDetections(state, effective),
    [state, effective],
  );

  /* ===========================================================
   * User handlers
   * =========================================================== */
  const handleAddUser = useCallback((): void => {
    setState((s) => ({ ...s, users: [...s.users, newEmptyUser()] }));
  }, []);

  const handleRemoveUser = useCallback((id: string): void => {
    setState((s) => ({ ...s, users: s.users.filter((u) => u.id !== id) }));
  }, []);

  const handleUpdateUser = useCallback((id: string, patch: Partial<RbacUser>): void => {
    setState((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    }));
  }, []);

  const handleToggleUserRole = useCallback((userId: string, roleId: string): void => {
    setState((s) => ({
      ...s,
      users: s.users.map((u) => {
        if (u.id !== userId) return u;
        const has = u.roleIds.includes(roleId);
        return {
          ...u,
          roleIds: has
            ? u.roleIds.filter((r) => r !== roleId)
            : [...u.roleIds, roleId],
        };
      }),
    }));
  }, []);

  /* ===========================================================
   * Role handlers
   * =========================================================== */
  const handleAddRole = useCallback((): void => {
    setState((s) => ({ ...s, roles: [...s.roles, newEmptyRole()] }));
  }, []);

  const handleRemoveRole = useCallback((id: string): void => {
    setState((s) => ({
      ...s,
      roles: s.roles.filter((r) => r.id !== id),
      // Clean dangling roleIds on users
      users: s.users.map((u) => ({
        ...u,
        roleIds: u.roleIds.filter((rid) => rid !== id),
      })),
    }));
  }, []);

  const handleUpdateRole = useCallback((id: string, patch: Partial<RbacRole>): void => {
    setState((s) => ({
      ...s,
      roles: s.roles.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }, []);

  const handleToggleRolePermission = useCallback(
    (roleId: string, permissionId: string): void => {
      setState((s) => ({
        ...s,
        roles: s.roles.map((r) => {
          if (r.id !== roleId) return r;
          const has = r.permissionIds.includes(permissionId);
          return {
            ...r,
            permissionIds: has
              ? r.permissionIds.filter((p) => p !== permissionId)
              : [...r.permissionIds, permissionId],
          };
        }),
      }));
    },
    [],
  );

  /* ===========================================================
   * Permission handlers
   * =========================================================== */
  const handleAddPermission = useCallback((): void => {
    setState((s) => ({ ...s, permissions: [...s.permissions, newEmptyPermission()] }));
  }, []);

  const handleRemovePermission = useCallback((id: string): void => {
    setState((s) => ({
      ...s,
      permissions: s.permissions.filter((p) => p.id !== id),
      // Clean dangling permissionIds on roles
      roles: s.roles.map((r) => ({
        ...r,
        permissionIds: r.permissionIds.filter((pid) => pid !== id),
      })),
    }));
  }, []);

  const handleUpdatePermission = useCallback(
    (id: string, patch: Partial<RbacPermission>): void => {
      setState((s) => ({
        ...s,
        permissions: s.permissions.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
    },
    [],
  );

  /* ===========================================================
   * Scenario manager handlers (Dexie persistence)
   * =========================================================== */
  const handleSelectScenario = useCallback(
    (id: string): void => {
      if (!id) {
        // "New scenario" option selected — clear state
        setState(emptyState());
        setEditingId(null);
        setScenarioName('');
        setShowSaveInput(false);
        return;
      }
      const found = scenarios.find((m) => m.id === id);
      if (!found) return;
      try {
        const parsed = JSON.parse(found.model);
        setState(normalizeState(parsed));
      } catch {
        setState(emptyState());
      }
      setEditingId(found.id);
      setScenarioName(found.name);
      setShowSaveInput(false);
    },
    [scenarios],
  );

  const handleNewScenario = useCallback((): void => {
    setState(emptyState());
    setEditingId(null);
    setScenarioName('');
    setShowSaveInput(false);
    flashToast('Nuevo escenario en blanco.');
  }, [flashToast]);

  const handleOpenSaveInput = useCallback((): void => {
    setSaveInputValue(scenarioName);
    setShowSaveInput(true);
  }, [scenarioName]);

  const handleCancelSave = useCallback((): void => {
    setShowSaveInput(false);
    setSaveInputValue('');
  }, []);

  const handleConfirmSave = useCallback((): void => {
    const name = saveInputValue.trim();
    if (!name) {
      flashToast('El nombre del escenario no puede estar vacío.');
      return;
    }
    const now = new Date().toISOString();
    const modelJson = JSON.stringify(state);

    if (editingId) {
      // Update existing scenario
      db.rbacModels
        .update(editingId, { name, model: modelJson, updatedAt: now })
        .then(() => {
          setScenarioName(name);
          setShowSaveInput(false);
          flashToast('Escenario guardado en IndexedDB.');
        })
        .catch(() => {
          flashToast('Error al guardar el escenario.');
        });
    } else {
      // Add new scenario
      const newId = genId();
      db.rbacModels
        .add({
          id: newId,
          name,
          model: modelJson,
          createdAt: now,
          updatedAt: now,
        })
        .then(() => {
          setEditingId(newId);
          setScenarioName(name);
          setShowSaveInput(false);
          flashToast('Escenario guardado en IndexedDB.');
        })
        .catch(() => {
          flashToast('Error al guardar el escenario.');
        });
    }
  }, [saveInputValue, state, editingId, flashToast]);

  const handleDeleteScenario = useCallback((): void => {
    if (!editingId) return;
    const idToDelete = editingId;
    db.rbacModels
      .delete(idToDelete)
      .then(() => {
        setState(emptyState());
        setEditingId(null);
        setScenarioName('');
        setShowSaveInput(false);
        flashToast('Escenario eliminado.');
      })
      .catch(() => {
        flashToast('Error al eliminar el escenario.');
      });
  }, [editingId, flashToast]);

  /* ===========================================================
   * Add to Note — builds an HTML-escaped table for useNoteStore
   * =========================================================== */
  const handleAddToNote = useCallback((): void => {
    const safeName = scenarioName || 'Untitled scenario';
    const tableStyle =
      'border="1" cellpadding="4" cellspacing="0" ' +
      'style="border-collapse:collapse;width:100%;font-family:monospace;font-size:11px;"';

    /* --- Users table --- */
    const usersRows = state.users
      .map((u) => {
        const roleNames = u.roleIds
          .map((rid) => state.roles.find((r) => r.id === rid)?.name || rid)
          .join(', ');
        return (
          '<tr>' +
          `<td>${escapeHtml(safeStr(u.name))}</td>` +
          `<td>${escapeHtml(safeStr(u.description))}</td>` +
          `<td>${escapeHtml(safeStr(roleNames))}</td>` +
          '</tr>'
        );
      })
      .join('');
    const emptyUsersRow =
      '<tr><td colspan="3"><em>No users.</em></td></tr>';

    /* --- Roles table --- */
    const rolesRows = state.roles
      .map((r) => {
        const permNames = r.permissionIds
          .map((pid) => state.permissions.find((p) => p.id === pid)?.name || pid)
          .join(', ');
        return (
          '<tr>' +
          `<td>${escapeHtml(safeStr(r.name))}</td>` +
          `<td>${escapeHtml(safeStr(r.description))}</td>` +
          `<td>${escapeHtml(safeStr(permNames))}</td>` +
          '</tr>'
        );
      })
      .join('');
    const emptyRolesRow =
      '<tr><td colspan="3"><em>No roles.</em></td></tr>';

    /* --- Permissions table --- */
    const permsRows = state.permissions
      .map((p) => (
        '<tr>' +
        `<td>${escapeHtml(safeStr(p.name))}</td>` +
        `<td>${escapeHtml(safeStr(p.action))}</td>` +
        `<td>${escapeHtml(safeStr(p.resource))}</td>` +
        '</tr>'
      ))
      .join('');
    const emptyPermsRow =
      '<tr><td colspan="3"><em>No permissions.</em></td></tr>';

    /* --- Permission matrix table --- */
    const matrixRows = matrix
      .map(({ role, has }) => {
        const cells = ACTIONS.map((a) => (has[a] ? '✓' : '—')).join('</td><td>');
        return (
          '<tr>' +
          `<td>${escapeHtml(safeStr(role.name))}</td>` +
          `<td>${cells}</td>` +
          '</tr>'
        );
      })
      .join('');
    const emptyMatrixRow =
      '<tr><td colspan="5"><em>No roles.</em></td></tr>';

    /* --- Effective permissions table --- */
    const effRows = state.users
      .map((u) => {
        const perms = effective.get(u.id) ?? [];
        const permStr = perms
          .map((p) => `${p.name} (${p.action} ${p.resource})`)
          .join(', ');
        return (
          '<tr>' +
          `<td>${escapeHtml(safeStr(u.name))}</td>` +
          `<td>${escapeHtml(safeStr(permStr))}</td>` +
          '</tr>'
        );
      })
      .join('');
    const emptyEffRow =
      '<tr><td colspan="2"><em>No users.</em></td></tr>';

    /* --- Detections table --- */
    const detRows = detections
      .map((d) => (
        '<tr>' +
        `<td>${escapeHtml(safeStr(d.severity))}</td>` +
        `<td>${escapeHtml(safeStr(d.text))}</td>` +
        '</tr>'
      ))
      .join('');
    const emptyDetRow =
      '<tr><td colspan="2"><em>No detections.</em></td></tr>';

    const html =
      `<h2>RBAC Analysis — ${escapeHtml(safeName)}</h2>` +
      `<table ${tableStyle}>` +
      '<thead><tr><th colspan="3">Users</th></tr>' +
      '<tr><th>Name</th><th>Description</th><th>Roles</th></tr></thead>' +
      `<tbody>${usersRows || emptyUsersRow}</tbody></table>` +
      `<table ${tableStyle}>` +
      '<thead><tr><th colspan="3">Roles</th></tr>' +
      '<tr><th>Name</th><th>Description</th><th>Permissions</th></tr></thead>' +
      `<tbody>${rolesRows || emptyRolesRow}</tbody></table>` +
      `<table ${tableStyle}>` +
      '<thead><tr><th colspan="3">Permissions</th></tr>' +
      '<tr><th>Name</th><th>Action</th><th>Resource</th></tr></thead>' +
      `<tbody>${permsRows || emptyPermsRow}</tbody></table>` +
      `<table ${tableStyle}>` +
      '<thead><tr><th>Role</th><th>Read</th><th>Write</th><th>Delete</th><th>Admin</th></tr></thead>' +
      `<tbody>${matrixRows || emptyMatrixRow}</tbody></table>` +
      `<table ${tableStyle}>` +
      '<thead><tr><th>User</th><th>Effective Permissions</th></tr></thead>' +
      `<tbody>${effRows || emptyEffRow}</tbody></table>` +
      `<table ${tableStyle}>` +
      '<thead><tr><th>Severity</th><th>Detection</th></tr></thead>' +
      `<tbody>${detRows || emptyDetRow}</tbody></table>` +
      `<p><em>Generated by VaultNotes RBAC Analyzer — 100% offline, ` +
      `${new Date().toISOString()}.</em></p>`;

    useNoteStore.getState().enqueueNote('RBAC Analysis — ' + safeName, html);
    flashToast('Añadido a Notas — crea una nota para verlo.');
  }, [state, effective, matrix, detections, scenarioName, flashToast]);

  /* ---- Render ---- */
  return (
    <div className="space-y-4">
      {/* ---------- Info banner ---------- */}
      <InfoBanner>
        <span className="font-semibold">100% offline.</span> Los modelos RBAC
        se guardan en IndexedDB (Dexie existente). NO se realizan cambios en
        Active Directory, Entra ID, ni en ningún servicio externo. Es una
        herramienta de análisis y aprendizaje.
      </InfoBanner>

      {/* ---------- Scenario manager ---------- */}
      <Section
        label="Escenario"
        icon={<FileText className="w-3 h-3 text-blue-400" />}
      >
        <div className="bg-[#0D0D0D] border border-[#262626] rounded p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <select
              className={inputCls + ' flex-1 min-w-[220px]'}
              value={editingId ?? ''}
              onChange={(e) => handleSelectScenario(e.target.value)}
            >
              <option value="">— Nuevo escenario (sin guardar) —</option>
              {scenarios.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleOpenSaveInput}
              className={btnGhost}
              title="Save scenario"
            >
              <span className="inline-flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" /> Save scenario
              </span>
            </button>
            <button
              type="button"
              onClick={handleNewScenario}
              className={btnGhost}
              title="New scenario"
            >
              <span className="inline-flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> New scenario
              </span>
            </button>
            <button
              type="button"
              onClick={handleDeleteScenario}
              className={btnDanger}
              disabled={!editingId}
              title="Delete scenario"
            >
              <span className="inline-flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </span>
            </button>
            <button
              type="button"
              onClick={handleAddToNote}
              className={btnGhost}
              title="Add to Note"
            >
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Add to Note
              </span>
            </button>
          </div>

          {/* Inline save input */}
          {showSaveInput && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1A1A1A]">
              <input
                className={inputCls + ' flex-1 min-w-[180px]'}
                placeholder="Scenario name (e.g. 'Prod SOC - Tier 1/2')"
                value={saveInputValue}
                onChange={(e) => setSaveInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmSave();
                  else if (e.key === 'Escape') handleCancelSave();
                }}
                spellCheck={false}
              />
              <button
                type="button"
                onClick={handleConfirmSave}
                className={btnGhost}
                title="Confirm save"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5" /> Confirm
                </span>
              </button>
              <button
                type="button"
                onClick={handleCancelSave}
                className={btnGhost}
                title="Cancel save"
              >
                <span className="inline-flex items-center gap-1.5">
                  <X className="w-3.5 h-3.5" /> Cancel
                </span>
              </button>
            </div>
          )}

          {/* Status line */}
          <div className="text-[10px] text-[#666]">
            {editingId ? (
              <>
                {'Editing scenario: '}
                <span className="text-blue-300 font-mono">{scenarioName}</span>
              </>
            ) : (
              'Unsaved scenario.'
            )}
            {' · '}
            {state.users.length} users · {state.roles.length} roles ·{' '}
            {state.permissions.length} permissions
          </div>
        </div>
      </Section>

      {/* ---------- 4-column editor ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">

        {/* Users column */}
        <Section
          label="Usuarios"
          icon={<Users className="w-3 h-3 text-blue-400" />}
          actions={
            <button
              type="button"
              onClick={handleAddUser}
              className={btnGhost + ' !px-2 !py-1'}
              title="Add user"
            >
              <span className="inline-flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </span>
            </button>
          }
        >
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {state.users.length === 0 ? (
              <div className="text-[10px] text-[#555] italic px-2 py-3 text-center border border-dashed border-[#262626] rounded">
                No users. Click [+ Add].
              </div>
            ) : (
              state.users.map((u) => (
                <UserCard
                  key={u.id}
                  user={u}
                  roles={state.roles}
                  onChange={(patch) => handleUpdateUser(u.id, patch)}
                  onRemove={() => handleRemoveUser(u.id)}
                  onToggleRole={(rid) => handleToggleUserRole(u.id, rid)}
                />
              ))
            )}
          </div>
        </Section>

        {/* Roles column */}
        <Section
          label="Roles"
          icon={<UserCog className="w-3 h-3 text-blue-400" />}
          actions={
            <button
              type="button"
              onClick={handleAddRole}
              className={btnGhost + ' !px-2 !py-1'}
              title="Add role"
            >
              <span className="inline-flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </span>
            </button>
          }
        >
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {state.roles.length === 0 ? (
              <div className="text-[10px] text-[#555] italic px-2 py-3 text-center border border-dashed border-[#262626] rounded">
                No roles. Click [+ Add].
              </div>
            ) : (
              state.roles.map((r) => (
                <RoleCard
                  key={r.id}
                  role={r}
                  permissions={state.permissions}
                  onChange={(patch) => handleUpdateRole(r.id, patch)}
                  onRemove={() => handleRemoveRole(r.id)}
                  onTogglePermission={(pid) => handleToggleRolePermission(r.id, pid)}
                />
              ))
            )}
          </div>
        </Section>

        {/* Permissions column */}
        <Section
          label="Permisos"
          icon={<Lock className="w-3 h-3 text-blue-400" />}
          actions={
            <button
              type="button"
              onClick={handleAddPermission}
              className={btnGhost + ' !px-2 !py-1'}
              title="Add permission"
            >
              <span className="inline-flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </span>
            </button>
          }
        >
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {state.permissions.length === 0 ? (
              <div className="text-[10px] text-[#555] italic px-2 py-3 text-center border border-dashed border-[#262626] rounded">
                No permissions. Click [+ Add].
              </div>
            ) : (
              state.permissions.map((p) => (
                <PermissionCard
                  key={p.id}
                  perm={p}
                  onChange={(patch) => handleUpdatePermission(p.id, patch)}
                  onRemove={() => handleRemovePermission(p.id)}
                />
              ))
            )}
          </div>
        </Section>

        {/* Analysis column */}
        <Section
          label="Análisis"
          icon={<ShieldAlert className="w-3 h-3 text-blue-400" />}
        >
          <div className="space-y-3">
            {/* Effective permissions */}
            <div>
              <div className="text-[9px] uppercase tracking-widest text-[#555] mb-1.5">
                Effective permissions
              </div>
              <EffectiveList state={state} effective={effective} />
            </div>

            {/* Permission matrix */}
            <div>
              <div className="text-[9px] uppercase tracking-widest text-[#555] mb-1.5">
                Permission matrix
              </div>
              <MatrixTable rows={matrix} />
            </div>

            {/* Detections */}
            <div>
              <div className="text-[9px] uppercase tracking-widest text-[#555] mb-1.5 inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-yellow-400" />
                Detections
              </div>
              <DetectionsList detections={detections} />
            </div>
          </div>
        </Section>
      </div>

      {/* ---------- Toast ---------- */}
      {toast && <InfoBanner>{toast}</InfoBanner>}
    </div>
  );
};

export default RbacAnalyzerTool;
