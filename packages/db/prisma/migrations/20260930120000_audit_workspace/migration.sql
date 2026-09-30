-- CreateEnum
CREATE TYPE "AuditRequestStatus" AS ENUM ('open', 'submitted', 'changes_requested', 'accepted');

-- AlterTable
ALTER TABLE "IsmsAuditControl" ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT;

-- CreateTable
CREATE TABLE "AuditRequest" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('areq'::text),
    "controlId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "ownerMemberId" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "AuditRequestStatus" NOT NULL DEFAULT 'open',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditRequestMessage" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('amsg'::text),
    "requestId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorMemberId" TEXT,
    "status" "AuditRequestStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditRequestMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvidenceLink" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('aev'::text),
    "controlId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "capturedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvidenceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditViewConsent" (
    "memberId" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "noticeVersion" INTEGER NOT NULL,
    "sessionNonce" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditViewConsent_pkey" PRIMARY KEY ("memberId")
);

-- CreateIndex
CREATE INDEX "AuditRequest_controlId_idx" ON "AuditRequest"("controlId");

-- CreateIndex
CREATE INDEX "AuditRequest_ownerMemberId_status_idx" ON "AuditRequest"("ownerMemberId", "status");

-- CreateIndex
CREATE INDEX "AuditRequestMessage_requestId_createdAt_idx" ON "AuditRequestMessage"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvidenceLink_controlId_idx" ON "AuditEvidenceLink"("controlId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvidenceLink_controlId_sourceType_sourceId_versionLabe_key" ON "AuditEvidenceLink"("controlId", "sourceType", "sourceId", "versionLabel");

-- AddForeignKey
ALTER TABLE "AuditRequest" ADD CONSTRAINT "AuditRequest_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "IsmsAuditControl"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditRequestMessage" ADD CONSTRAINT "AuditRequestMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AuditRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvidenceLink" ADD CONSTRAINT "AuditEvidenceLink_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "IsmsAuditControl"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditViewConsent" ADD CONSTRAINT "AuditViewConsent_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
