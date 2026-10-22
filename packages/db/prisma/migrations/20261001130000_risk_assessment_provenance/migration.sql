-- Preserve every existing axis, decision, timestamp and acceptance.
ALTER TABLE "Risk" ADD COLUMN "residualAssessmentStatus" TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE "Vendor" ADD COLUMN "residualAssessmentStatus" TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE "Risk" ALTER COLUMN "residualAssessmentStatus" SET DEFAULT 'unassessed';
ALTER TABLE "Vendor" ALTER COLUMN "residualAssessmentStatus" SET DEFAULT 'unassessed';
ALTER TABLE "RiskAcceptance" ADD COLUMN "scoringVersion" TEXT NOT NULL DEFAULT 'legacy-10';
ALTER TABLE "RiskAcceptance" ALTER COLUMN "scoringVersion" SET DEFAULT 'matrix-25-v1';
