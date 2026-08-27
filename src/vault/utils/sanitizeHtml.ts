/**
 * sanitizeHtml — defense-in-depth XSS prevention for the rich-text editor.
 *
 * SECURITY (Audit Task 2-b, spec #26 / #42 / #44): note.contentHtml is
 * untrusted data. It can originate from:
 *   1. a backup ZIP imported via `zipBackup.parseMarkdownWithFrontmatter`
 *      (raw text from `apuntes/*.md` stored verbatim as contentHtml);
 *   2. an older Dexie record created before sanitization existed;
 *   3. a paste of HTML from another web page.
 *
 * Before any of that HTML is injected into the DOM via `innerHTML`, it MUST
 * be sanitized. We also sanitize at the import boundary so stored data is
 * clean, but defense-in-depth requires sanitizing at the render boundary
 * too (a future code path or older record could bypass the import filter).
 *
 * DOMPurify is the de-facto, audited, dependency-free sanitizer. It runs
 * synchronously against the live browser DOM. No network, no eval.
 *
 * The config preserves the legitimate editor HTML:
 *   - <embed src="blob:..."> for inline PDF rendering (native browser viewer)
 *   - <video><source src="blob:..."></video> for embedded videos
 *   - <img src="blob:..."> for embedded images
 *   - <input type="checkbox"> for the editor's checklists (AUDIT FIX — see
 *     the uponSanitizeElement hook below: ONLY checkbox inputs survive;
 *     every other input type is dropped)
 *   - inline `style`, `class`, `data-*` for formatting
 *   - standard formatting tags (h1-h6, p, ul, ol, pre, code, a, etc.)
 *
 * It strips: <script>, on* event handlers (onerror, onclick, ...),
 * javascript: URLs, data:text/html, <iframe>, non-checkbox <input>, and
 * other XSS vectors.
 *
 * This is a pure function — no side effects, no network, safe to call on
 * every render.
 */
import DOMPurify, { type Config } from 'dompurify';

// Configure once. DOMPurify maintains a per-instance config; calling
// sanitize() with a config object is also fine but a configured instance
// is marginally faster and avoids re-parsing the config each call.
const purifyConfig: Config = {
  // Explicitly disable TrustedHTML return type — we want a plain string
  // for direct innerHTML assignment.
  RETURN_TRUSTED_TYPE: false,
  // Allow the tags the editor produces. Default DOMPurify already allows
  // standard formatting; we ADD the media tags the editor uses.
  ADD_TAGS: ['embed', 'video', 'source', 'figure', 'figcaption'],
  // Allow blob: URLs (our own object URLs for images/videos/PDFs) and the
  // data: URLs we use for small inline thumbnails. data: is restricted by
  // DOMPurify by default — we enable it for images only via ALLOWED_URI_REGEXP.
  ADD_ATTR: ['src', 'href', 'controls', 'width', 'height', 'allow', 'type', 'allowfullscreen', 'frameborder', 'checked', 'disabled'],
  // AUDIT FIX (root cause — silent attribute stripping): our custom
  // ALLOWED_URI_REGEXP below is much stricter than DOMPurify's stock one
  // (stock tolerates non-URI values like `type="checkbox"`). With it,
  // _isValidAttribute() ends up rejecting every allowlisted attribute whose
  // value is NOT a URI — silently stripping `type="checkbox"` from the
  // editor's checklists, `type="application/pdf"` from <embed>,
  // `preload="metadata"` from <video> and numeric `width`/`height`.
  // ADD_URI_SAFE_ATTR marks attributes whose values are inert (never URLs)
  // so they survive; URI-bearing attributes (src/href/action…) still go
  // through the strict regexp.
  ADD_URI_SAFE_ATTR: ['type', 'preload', 'checked', 'disabled', 'width', 'height'],
  // Permit blob: and data:image/* URLs in src/href. Default regex blocks
  // most data: URIs; ours allows http(s):, blob:, mailto:, and data:image/*.
  ALLOWED_URI_REGEXP: /^(?:(?:https?:|blob:|mailto:)|data:image\/(?:png|jpeg|gif|webp|bmp|x-icon)\??(?:;base64)?,)/i,
  // Keep the editor's inline styles and classes (formatting only — DOMPurify
  // will still strip dangerous CSS like expression() or javascript: in styles).
  ALLOW_DATA_ATTR: true,
  // Do NOT strip native form-related attributes that some pastes include.
  // AUDIT FIX (HIGH — checklist data loss): `input` was in FORBID_TAGS, so
  // every checklist checkbox inserted by the editor (RichEditor/LabsView
  // insert `<input type="checkbox">`) was stripped by sanitizeHtml() at
  // load/paste/import time — and the next autosave then PERSISTED the loss.
  // Now `input` is allowed by default and the uponSanitizeElement hook
  // below keeps only type="checkbox" inputs (the DOMPurify-canonical
  // pattern). Buttons/textarea/select/form stay forbidden.
  FORBID_TAGS: ['script', 'iframe', 'object', 'form', 'button', 'textarea', 'select', 'style'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'formaction'],
};

let configured = false;
function ensureConfigured(): void {
  if (configured) return;
  // AUDIT FIX (HIGH — checklist data loss): allow ONLY checkbox inputs.
  // Anything else (`<input type="text">`, password, submit, …) is treated
  // as unwanted pasted form debris and DROPPED by detaching the node —
  // this DOMPurify build explicitly supports hooks detaching nodes in
  // uponSanitizeElement (_handleHookDetachedNode). Detaching is per-node
  // and order-independent; mutating data.allowedTags instead would disable
  // `input` for the WHOLE sanitize() call after the first bad input,
  // killing every legitimate checkbox that comes after it.
  // Checkbox inputs carry no script-execution capability, `form` remains
  // forbidden (so nothing is submittable), and on* handlers are stripped
  // by the hook below.
  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.tagName !== 'input' || !(node instanceof Element)) return;
    const type = (node.getAttribute('type') || '').toLowerCase();
    if (type !== 'checkbox') {
      node.remove();
    }
  });
  // Add a hook that strips any remaining inline event handlers that might
  // sneak in via attribute names we didn't explicitly forbid (defense in
  // depth — DOMPurify already does this, but the hook is a belt-and-braces
  // guarantee for our specific editor context).
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Walk attributes; remove anything starting with "on" that survived.
    if (node && node.attributes) {
      const toRemove: string[] = [];
      // node.attributes is a NamedNodeMap — iterate by index, not for...of
      for (let i = node.attributes.length - 1; i >= 0; i--) {
        const attr = node.attributes[i];
        if (attr && /^on/i.test(attr.name)) {
          toRemove.push(attr.name);
        }
      }
      toRemove.forEach((name) => node.removeAttribute(name));
    }
  });
  configured = true;
}

/**
 * Sanitize untrusted HTML for safe injection via innerHTML.
 * Returns "" for null/undefined input. Pure, synchronous, offline.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';
  ensureConfigured();
  try {
    // RETURN_TRUSTED_TYPE: false in config selects the string overload;
    // the cast is a type-system guard for TS overload resolution.
    return DOMPurify.sanitize(dirty, purifyConfig) as string;
  } catch {
    // If DOMPurify ever throws (it shouldn't — it's defensive), fall back
    // to a basic tag-strip rather than inject the raw dirty HTML. This is
    // strictly more conservative than DOMPurify's normal output.
    return dirty
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '')
      .replace(/\son\w+=\S+/gi, '')
      .replace(/javascript:/gi, '');
  }
}
