CREATE TABLE "AuditResearchThread" (
 "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('arth'::text),
 "auditId" TEXT NOT NULL, "title" TEXT NOT NULL, "createdBy" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "AuditResearchThread_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "AuditResearchThread_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "IsmsAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "AuditResearchTurn" (
 "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('artn'::text), "threadId" TEXT NOT NULL,
 "requestId" TEXT NOT NULL, "prompt" TEXT NOT NULL, "answer" TEXT NOT NULL DEFAULT '',
 "authorName" TEXT NOT NULL, "authorMemberId" TEXT NOT NULL, "model" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'running', "progress" TEXT NOT NULL DEFAULT 'Searching your audit sources',
 "citations" JSONB NOT NULL DEFAULT '[]', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMP(3) NOT NULL, "completedAt" TIMESTAMP(3),
 CONSTRAINT "AuditResearchTurn_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "AuditResearchTurn_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "AuditResearchThread"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AuditResearchThread_auditId_updatedAt_idx" ON "AuditResearchThread"("auditId", "updatedAt");
CREATE UNIQUE INDEX "AuditResearchTurn_threadId_requestId_key" ON "AuditResearchTurn"("threadId", "requestId");
CREATE INDEX "AuditResearchTurn_threadId_createdAt_idx" ON "AuditResearchTurn"("threadId", "createdAt");
CREATE INDEX "AuditResearchTurn_status_expiresAt_idx" ON "AuditResearchTurn"("status", "expiresAt");
