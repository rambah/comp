// Capture the whole organization app, including navigation and portalled dialogs.
// Private surfaces (including the observer itself) and credentials never enter the stream.
export const auditBlockSelector = [
  '[data-audit-live-private]',
  'input[type="password"]',
  'input[type="hidden"]',
  'input[autocomplete="current-password"]',
  'input[autocomplete="new-password"]',
  'input[autocomplete="one-time-code"]',
  'input[autocomplete^="cc-"]',
  'iframe',
  'object',
  'embed',
].join(', ');

export function currentPdf() {
  const node = document.querySelector<HTMLElement>('[data-audit-pdf]');
  return node?.dataset.auditPdf
    ? { evidenceId: node.dataset.auditPdf, title: node.dataset.auditPdfTitle ?? 'Captured PDF' }
    : null;
}
