import { afterEach, describe, expect, it } from 'vitest';
import { applyPanelScroll, readPanelScroll } from './panel-scroll';
afterEach(() => {
  document.body.innerHTML = '';
});
describe('Evidence reader scroll synchronization', () => {
  it('reads and restores bounded positions in both panes without serializing content', () => {
    document.body.innerHTML =
      '<div data-audit-live-target="compare-0">Private retained content</div><div data-audit-live-target="compare-1"></div><div data-audit-live-target="other"></div>';
    const panes = document.querySelectorAll('div');
    for (const pane of panes) {
      Object.defineProperty(pane, 'scrollHeight', { value: 1000 });
      Object.defineProperty(pane, 'clientHeight', { value: 200 });
    }
    panes[0].scrollTop = 400;
    panes[1].scrollTop = 200;
    expect(readPanelScroll()).toEqual({ 'compare-0': 0.5, 'compare-1': 0.25 });
    applyPanelScroll({ 'compare-0': 0.75, 'compare-1': 2 });
    expect(panes[0].scrollTop).toBe(600);
    expect(panes[1].scrollTop).toBe(800);
    expect(panes[2].scrollTop).toBe(0);
  });
  it('handles missing or non-scrollable readers and invalid ratios safely', () => {
    expect(readPanelScroll()).toEqual({});
    applyPanelScroll(undefined);
    document.body.innerHTML = '<div data-audit-live-target="evidence-preview"></div>';
    expect(readPanelScroll()).toEqual({ 'evidence-preview': 0 });
    applyPanelScroll({ 'evidence-preview': Number.NaN });
    expect(document.querySelector('div')?.scrollTop).toBe(0);
  });
});
