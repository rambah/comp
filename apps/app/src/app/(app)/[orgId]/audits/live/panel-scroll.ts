export const PANEL_ANCHORS = [
  'evidence-preview',
  'evidence-comparison',
  'compare-0',
  'compare-1',
] as const;
export type PanelScroll = Partial<Record<(typeof PANEL_ANCHORS)[number], number>>;
export function readPanelScroll(): PanelScroll {
  const values: PanelScroll = {};
  for (const anchor of PANEL_ANCHORS) {
    const element = document.querySelector<HTMLElement>(`[data-audit-live-target="${anchor}"]`);
    if (!element) continue;
    const range = element.scrollHeight - element.clientHeight;
    values[anchor] = range > 0 ? Math.min(1, Math.max(0, element.scrollTop / range)) : 0;
  }
  return values;
}
export function applyPanelScroll(values: PanelScroll | undefined) {
  for (const anchor of PANEL_ANCHORS) {
    const ratio = values?.[anchor];
    if (ratio === undefined || !Number.isFinite(ratio)) continue;
    const element = document.querySelector<HTMLElement>(`[data-audit-live-target="${anchor}"]`);
    if (element)
      element.scrollTop =
        Math.min(1, Math.max(0, ratio)) * Math.max(0, element.scrollHeight - element.clientHeight);
  }
}
