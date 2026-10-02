-- CreateTable
CREATE TABLE "AttachmentFeedback" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('afb'::text),
    "organizationId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "attachmentName" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorMemberId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttachmentFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttachmentFeedbackResponse" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('afr'::text),
    "feedbackId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorMemberId" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttachmentFeedbackResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttachmentFeedback_organizationId_status_createdAt_idx" ON "AttachmentFeedback"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AttachmentFeedback_organizationId_attachmentId_idx" ON "AttachmentFeedback"("organizationId", "attachmentId");

-- CreateIndex
CREATE INDEX "AttachmentFeedbackResponse_feedbackId_createdAt_idx" ON "AttachmentFeedbackResponse"("feedbackId", "createdAt");

-- AddForeignKey
ALTER TABLE "AttachmentFeedback" ADD CONSTRAINT "AttachmentFeedback_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttachmentFeedbackResponse" ADD CONSTRAINT "AttachmentFeedbackResponse_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "AttachmentFeedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
