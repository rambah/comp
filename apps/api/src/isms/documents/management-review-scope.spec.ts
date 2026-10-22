import { reviewValidationMessages } from './management-review';
import {
  mapReviews,
  type ReviewWithExportIncludes,
} from './management-review-export-data';
import { buildManagementReviewSections } from './management-review-sections';
import type { DocumentExportInput } from './types';

jest.mock('@db', () => ({ db: {} }));

const ready = {
  reference: 'MR-2026-02',
  status: 'complete',
  hasMeetingDate: true,
  hasChair: true,
  attendeeCount: 3,
  signed: true,
  reviewScope: 'targeted',
  scopeNotes: 'Audit results; remaining inputs in MR-2026-01.',
  hasConclusion: true,
  discussedInputCount: 2,
  excludedInputCount: 8,
  undiscussedInputCount: 0,
  contradictoryInputCount: 0,
};
const validate = (changes: Partial<typeof ready> = {}) =>
  reviewValidationMessages({
    procedure: 'Annual review and targeted follow-ups.',
    reviews: [{ ...ready, ...changes }],
  });

describe('targeted management-review validation', () => {
  it('accepts two discussed inputs and eight documented exclusions', () => {
    expect(validate()).toEqual([]);
  });
  it('does not permit exclusions in a full review', () => {
    expect(validate({ reviewScope: 'full' })).toContain(
      'Review MR-2026-02 is a full review and cannot exclude required inputs.',
    );
  });
  it.each([
    [{ scopeNotes: ' ' }, 'documented scope'],
    [{ discussedInputCount: 0 }, 'at least one discussed input'],
    [{ undiscussedInputCount: 1 }, '1 input not yet marked'],
    [{ hasConclusion: false }, 'no conclusion for its scope'],
    [{ contradictoryInputCount: 1 }, 'both discussed and outside scope'],
    [{ hasChair: false }, 'no chair'],
  ] as Array<[Partial<typeof ready>, string]>)(
    'rejects incomplete or contradictory scope: %j',
    (changes, message) => {
      expect(validate(changes).join(' ')).toContain(message);
    },
  );
});

describe('targeted review export', () => {
  it('exports the scoped narrative without inferring an ISMS-wide verdict', () => {
    const date = new Date('2026-10-09');
    const review: ReviewWithExportIncludes = {
      id: 'review',
      documentId: 'doc',
      createdAt: date,
      updatedAt: date,
      position: 1,
      decisionsText: '',
      changesText: '',
      reference: 'MR-2026-02',
      reviewScope: 'targeted',
      scopeNotes: ready.scopeNotes,
      meetingDate: new Date('2026-10-06'),
      recordedAt: new Date('2026-10-09'),
      chairName: 'Ramin',
      attendees: [],
      status: 'complete',
      conclusionVerdict: 'effective',
      conclusionNotes: 'Only OFI-3 is closed; three OFIs remain open.',
      signoffChairName: 'Ramin',
      signoffChairDate: new Date('2026-10-12'),
      inputs: [
        {
          id: 'input',
          reviewId: 'review',
          documentId: 'doc',
          createdAt: date,
          updatedAt: date,
          position: 1,
          inputKey: 'b_context',
          source: 'manual',
          derivedFrom: null,
          whatItCovers: 'Context',
          whereToFind: 'MR-2026-01',
          discussionNotes: null,
          inputRef: '(b)',
          discussed: false,
          scopeExclusionReason: 'Outside this follow-up; see MR-2026-01.',
        },
      ],
      actions: [],
    };
    const rows = mapReviews([review], { memberNames: {} });
    expect(rows[0].conclusion).toBeNull();
    expect(rows[0].inputs[0].discussed).toBe('No');
    const sections = buildManagementReviewSections({
      reviews: rows,
      narrative: { procedure: 'Review annually.' },
    } as DocumentExportInput);
    expect(JSON.stringify(sections)).toContain(review.conclusionNotes);
    expect(JSON.stringify(sections)).toContain(
      'Outside this follow-up; see MR-2026-01.',
    );
    expect(JSON.stringify(sections)).not.toContain('found to be effective');
    expect(JSON.stringify(sections)).not.toContain(
      'Each input required by Clause 9.3.2 was considered',
    );
  });
});
