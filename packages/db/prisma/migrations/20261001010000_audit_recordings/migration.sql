CREATE TABLE "AuditRecording" (
  "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('arec'::text),
  "organizationId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "auditorName" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastEventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "state" TEXT NOT NULL DEFAULT 'recording',
  CONSTRAINT "AuditRecording_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuditRecordingChunk" (
  "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('arch'::text),
  "recordingId" TEXT NOT NULL,
  "index" INTEGER NOT NULL,
  "objectKey" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditRecordingChunk_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditRecording_organizationId_startedAt_idx" ON "AuditRecording"("organizationId","startedAt");
CREATE INDEX "AuditRecording_expiresAt_idx" ON "AuditRecording"("expiresAt");
CREATE UNIQUE INDEX "AuditRecordingChunk_objectKey_key" ON "AuditRecordingChunk"("objectKey");
CREATE UNIQUE INDEX "AuditRecordingChunk_recordingId_index_key" ON "AuditRecordingChunk"("recordingId","index");
ALTER TABLE "AuditRecording" ADD CONSTRAINT "AuditRecording_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditRecordingChunk" ADD CONSTRAINT "AuditRecordingChunk_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "AuditRecording"("id") ON DELETE CASCADE ON UPDATE CASCADE;
