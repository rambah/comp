// Keep the workspace and its portalled dialogs/popovers. Everything else in the app is blocked.
const surfaces =
  '[data-audit-workspace], [data-audit-live-surface], [data-slot="command-dialog-content"]:has([data-audit-live-surface]), body:has([data-audit-live-surface]) [data-slot="dialog-overlay"]';
export const auditBlockSelector = `body *:not(:is(${surfaces})):not(:is(${surfaces}) *):not(:has(${surfaces})), [data-audit-live-private], input[type="password"], input[autocomplete="one-time-code"], input[autocomplete="cc-number"], iframe, object, embed`;

export function currentPdf() {
  const node = document.querySelector<HTMLElement>('[data-audit-pdf]');
  return node?.dataset.auditPdf
    ? { evidenceId: node.dataset.auditPdf, title: node.dataset.auditPdfTitle ?? 'Captured PDF' }
    : null;
}
