import { liveViewSchema } from './live.schema';
describe('Live view protocol', () => {
  const view = {
    auditId: 'a1',
    tab: 'evidence',
    checkId: null,
    evidenceId: 'e1',
    compareEvidenceId: 'e2',
    checkLayout: 'board',
    scrollRatio: 0,
  };
  it('accepts only bounded selection metadata for the library and comparison', () => {
    expect(liveViewSchema.parse(view)).toEqual(view);
    expect(
      liveViewSchema.safeParse({ ...view, panelScroll: { 'compare-0': 2 } })
        .success,
    ).toBe(false);
    expect(
      liveViewSchema.safeParse({ ...view, panelScroll: { unrelated: 0.5 } })
        .success,
    ).toBe(false);
    expect(
      liveViewSchema.safeParse({ ...view, compareEvidenceId: 'x'.repeat(101) })
        .success,
    ).toBe(false);
    expect(
      liveViewSchema.safeParse({ ...view, checkLayout: 'unknown' }).success,
    ).toBe(false);
    expect(
      liveViewSchema.safeParse({
        ...view,
        documentText: 'Never transmit captured content in this protocol',
      }).success,
    ).toBe(false);
  });
  it('keeps older clients compatible without the optional selections', () => {
    expect(
      liveViewSchema.safeParse({
        auditId: 'a1',
        tab: 'checks',
        checkId: null,
        evidenceId: null,
        scrollRatio: 0,
      }).success,
    ).toBe(true);
  });
});
