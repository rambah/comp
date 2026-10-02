import { describe, expect, it } from 'vitest';
import { liveEventSchema } from './live-types';
const event = {
  kind: 'view',
  memberId: 'm1',
  name: 'Auditor',
  nonce: 'n1',
  sentAt: 1,
  sequence: 1,
  view: {
    auditId: 'a1',
    tab: 'evidence',
    checkId: null,
    evidenceId: 'e1',
    compareEvidenceId: 'e2',
    checkLayout: 'board',
    scrollRatio: 0,
  },
};
describe('Evidence library live view', () => {
  it('retains comparison and layout state', () => {
    expect(liveEventSchema.parse(event)).toEqual(event);
  });
  it('rejects unsupported layouts and overlong evidence identifiers', () => {
    expect(
      liveEventSchema.safeParse({ ...event, view: { ...event.view, checkLayout: 'unknown' } })
        .success,
    ).toBe(false);
    expect(
      liveEventSchema.safeParse({
        ...event,
        view: { ...event.view, compareEvidenceId: 'x'.repeat(101) },
      }).success,
    ).toBe(false);
  });
});
