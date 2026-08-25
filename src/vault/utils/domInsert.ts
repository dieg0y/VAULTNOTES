/**
 * Inserts HTML at the caret position of a contentEditable element.
 * Robust against lost selections (e.g. after interacting with a file
 * input): if the editor has no valid selection, the caret is placed
 * at the end of the content before inserting.
 */
export function insertHtmlInEditable(editor: HTMLElement | null, html: string): boolean {
  if (!editor) return false;
  editor.focus();

  const sel = window.getSelection();
  const hasValidSelection =
    sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode);

  if (!hasValidSelection) {
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false); // caret at the end
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  return document.execCommand('insertHTML', false, html);
}
