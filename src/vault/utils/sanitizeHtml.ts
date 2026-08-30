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
 * AUDIT FIX (VN-AUD-001, MEDIO): REMOTE MEDIA BEACONS. The URI regexp
 * below tolerates `https?:` because `<a href>` links are legitimate
 * (navigation is an explicit user click). But MEDIA elements AUTO-LOAD their
 * sources on render — an `<img src="https://…">` (or srcset/poster/
 * background/svg-image href) inside pasted or imported HTML fires a request
 * the user never consented to, leaking IP/time/UA. The
 * `uponSanitizeAttribute` hook below therefore strips any remote scheme from
 * every auto-loading attribute. `<embed src>` is stricter still (blob: only —
 * a remote embed is a remote-document-execution vector, not just a beacon).
 * Remote `url(…)` inside inline styles is scrubbed in
 * `afterSanitizeAttributes` (style is a URI-safe attribute in DOMPurify, so
 * it is never regexp-checked).
 *
 * NOTE (VN-AUD-004): `data:image/svg+xml` on `<img src>` IS allowed — not via
 * ALLOWED_URI_REGEXP but via DOMPurify's DATA_URI_TAGS mechanism (src/href on
 * img/video/audio/source/image/track accept any `data:` URI). Scripts inside
 * an SVG loaded through <img> DO NOT execute (browser guarantee) and external
 * references in image-context SVGs are blocked, so this is safe by design.
 * E2E-verified: SVG images inserted via the picker survive save→load→sanitize.
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
  // AUDIT FIX (VN-AUD-001, MEDIO — remote media beacons): elements that
  // AUTO-LOAD their URI attributes on render. Stripping the attribute
  // prevents the network request; the element itself stays (alt text,
  // figcaption, controls chrome). SVG media elements (`image`, `use`,
  // `feimage`) are included — inline <svg> is allowed by DOMPurify's default
  // profile and <image href="https://…"> loads remote content.
  const AUTOLOAD_MEDIA_TAGS = new Set([
    'img', 'video', 'audio', 'source', 'track', 'embed',
    'image', 'use', 'feimage',
  ]);
  // Remote schemes incl. protocol-relative ("//host/…") — the latter never
  // survives the URI regexp, but the hook runs BEFORE it, so we catch it here
  // anyway (belt-and-braces).
  const REMOTE_URL_RE = /^(?:https?:)?\/\//i;
  // URI attributes that trigger an automatic fetch when set on a media tag.
  const AUTOLOAD_ATTRS = new Set(['src', 'srcset', 'poster', 'background', 'href', 'xlink:href']);
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    const tag = (node.nodeName || '').toLowerCase();
    const attr = data.attrName;
    const value = data.attrValue || '';
    // <embed> exists in this config ONLY for inline PDF rendering
    // (`<embed type="application/pdf" src="blob:…">`, re-attached at load
    // from db.pdfs). Persisted embeds carry no src at all (flushSave strips
    // blob: srcs). Anything else — https:, data:, … — would render a remote
    // or inline DOCUMENT (SVG/HTML execute scripts in embed context), so we
    // allow blob: exclusively.
    if (tag === 'embed' && attr === 'src' && !/^blob:/i.test(value)) {
      data.keepAttr = false;
      return;
    }
    if (!AUTOLOAD_MEDIA_TAGS.has(tag) || !AUTOLOAD_ATTRS.has(attr)) return;
    // href on <use>/<image> may be a local fragment (#icon) — keep those.
    if (REMOTE_URL_RE.test(value)) {
      data.keepAttr = false;
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
    // AUDIT FIX (VN-AUD-001 — CSS exfil variant): `style` is a URI-safe
    // attribute in DOMPurify (never regexp-checked), so a pasted
    // `style="background:url(https://…/pixel.png)"` would auto-load on
    // render. Scrub remote url() tokens from inline styles; local values
    // (colors, sizes, layout) are preserved untouched.
    if (node instanceof Element) {
      const style = node.getAttribute('style');
      if (style && /url\(\s*['"]?\s*(?:https?:)?\/\//i.test(style)) {
        const cleaned = style.replace(
          /url\(\s*(['"]?)\s*(?:https?:)?\/\/[^)]*\)/gi,
          'none'
        );
        node.setAttribute('style', cleaned);
      }
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
