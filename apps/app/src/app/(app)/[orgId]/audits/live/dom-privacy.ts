// Keep the workspace and its portalled dialogs/popovers. Everything else in the app is blocked.
const surfaces = '[data-audit-workspace], [data-audit-live-surface]';
// Keep the roots atomic: CSS forbids nesting :has() inside another :has().
// Dialog backdrops contain no app content; their portal parents also contain the marked dialog.
export const auditBlockSelector = `body *:not(:is(${surfaces}, [data-slot="dialog-overlay"])):not(:is(${surfaces}) *):not(:has(${surfaces})), [data-audit-live-private], input[type="password"], input[autocomplete="one-time-code"], input[autocomplete="cc-number"], iframe, object, embed`;

export function currentPdf() {
  const node = document.querySelector<HTMLElement>('[data-audit-pdf]');
  return node?.dataset.auditPdf
    ? { evidenceId: node.dataset.auditPdf, title: node.dataset.auditPdfTitle ?? 'Captured PDF' }
    : null;
}
