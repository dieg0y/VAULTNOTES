/**
 * downloadBlob — shared "save a Blob as a file" helper.
 *
 * The standard object-URL dance (create → <a download> → click → revoke)
 * that RichEditor (embedded PDF download) and DataIntelView (Sigma rule YAML
 * export) used to duplicate. The revoke is deferred by 1s so the browser has
 * started the actual download before the URL is invalidated.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
