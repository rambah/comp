ALTER TABLE "IsmsManagementReview"
  ADD COLUMN "reviewScope" TEXT NOT NULL DEFAULT 'full',
  ADD COLUMN "scopeNotes" TEXT,
  ADD CONSTRAINT "IsmsManagementReview_reviewScope_check" CHECK ("reviewScope" IN ('full', 'targeted'));

ALTER TABLE "IsmsReviewInput" ADD COLUMN "scopeExclusionReason" TEXT;
