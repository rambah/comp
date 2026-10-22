import { Grid } from '@trycompai/design-system';
import type { IsmsManagementReview } from '../isms-types';
import { reviewConclusionSentence } from './management-review-constants';
import { IsmsRegisterField } from './shared';

export function ReviewMeetingDetails({ review }: { review: IsmsManagementReview }) {
  const targeted = review.reviewScope === 'targeted';
  const conclusion =
    !targeted && review.conclusionVerdict
      ? reviewConclusionSentence({
          verdict: review.conclusionVerdict,
          meetingDate: review.meetingDate?.slice(0, 10) ?? null,
        })
      : '';
  return (
    <Grid cols={{ base: '1', md: '2' }} gap="3">
      <IsmsRegisterField label="Meeting date">
        {review.meetingDate?.slice(0, 10) ?? 'Not set'}
      </IsmsRegisterField>
      <IsmsRegisterField label="Recorded on">{`${review.recordedAt.slice(0, 10)} — set by the platform, cannot be edited`}</IsmsRegisterField>
      <IsmsRegisterField label="Chair">
        {review.chairName || 'Not set — assigned in ISMS > Roles'}
      </IsmsRegisterField>
      <IsmsRegisterField label={targeted ? 'Conclusion within the stated scope' : 'Conclusion'}>
        {[conclusion, review.conclusionNotes].filter(Boolean).join(' ') ||
          'No conclusion recorded yet.'}
      </IsmsRegisterField>
      {targeted ? (
        <IsmsRegisterField label="Targeted follow-up — scope">
          {review.scopeNotes || 'Scope not recorded'}
        </IsmsRegisterField>
      ) : null}
    </Grid>
  );
}
