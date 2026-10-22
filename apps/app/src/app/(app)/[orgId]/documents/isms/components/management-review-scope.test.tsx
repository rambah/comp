import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { IsmsManagementReview } from '../isms-types';
import { reviewValidationMessages } from './management-review-constants';
import { ReviewMeetingDetails } from './ReviewMeetingDetails';

const review: IsmsManagementReview = {
  id: 'review',
  reference: 'MR-2026-02',
  meetingDate: '2026-10-06',
  recordedAt: '2026-10-09',
  chairName: 'Ramin',
  attendees: [{ memberId: 'm1', name: 'Ramin' }],
  status: 'complete',
  reviewScope: 'targeted',
  scopeNotes: 'Audit results; remaining inputs in MR-2026-01.',
  conclusionVerdict: null,
  conclusionNotes: 'Only OFI-3 is closed; three OFIs remain open.',
  decisionsText: '',
  changesText: '',
  signoffChairName: 'Ramin',
  signoffChairDate: '2026-10-12',
  position: 1,
  actions: [],
  inputs: Array.from({ length: 10 }, (_, i) => ({
    id: `i${i}`,
    reviewId: 'review',
    inputKey: null,
    inputRef: `Input ${i}`,
    whatItCovers: '',
    whereToFind: '',
    discussionNotes: null,
    discussed: i < 2,
    source: 'manual',
    derivedFrom: null,
    scopeExclusionReason: i < 2 ? null : 'Outside this follow-up; see MR-2026-01.',
    position: i,
  })),
};
const validate = (value: IsmsManagementReview) =>
  reviewValidationMessages({ procedure: 'Review annually.', reviews: [value] });

describe('targeted follow-up', () => {
  it('accepts documented exclusions without ticking the remaining eight topics', () => {
    expect(validate(review)).toEqual([]);
    expect(review.inputs.filter((input) => input.discussed)).toHaveLength(2);
  });
  it('blocks an undocumented exclusion and missing scope or conclusion', () => {
    expect(
      validate({
        ...review,
        inputs: review.inputs.map((input, i) =>
          i === 9 ? { ...input, scopeExclusionReason: ' ' } : input,
        ),
      }).join(' '),
    ).toContain('1 input not yet marked');
    expect(validate({ ...review, scopeNotes: '' }).join(' ')).toContain('documented scope');
    expect(validate({ ...review, conclusionNotes: '' }).join(' ')).toContain(
      'no conclusion for its scope',
    );
  });
  it('does not allow the full review to skip eight required topics', () => {
    expect(validate({ ...review, reviewScope: 'full' }).join(' ')).toContain('cannot exclude');
  });
  it('shows the recorded conclusion even without an overall ISMS verdict', () => {
    render(<ReviewMeetingDetails review={review} />);
    expect(screen.getByText(review.conclusionNotes!)).toBeInTheDocument();
    expect(screen.getByText(review.scopeNotes!)).toBeInTheDocument();
    expect(screen.queryByText(/No conclusion recorded/)).not.toBeInTheDocument();
  });
});
