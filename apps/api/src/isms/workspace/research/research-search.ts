import { db, Prisma } from '@db';
import type { SourceKind } from './research.types';

// Static SQL fragments only. All user text, identifiers and pagination are bound parameters.
const tables: Record<SourceKind, Prisma.Sql> = {
  context: Prisma.sql`SELECT id, question AS title, "organizationId", concat_ws(' ', question, answer) AS body FROM "Context"`,
  answer: Prisma.sql`SELECT id, question AS title, "organizationId", concat_ws(' ', question, answer) AS body FROM "SecurityQuestionnaireManualAnswer"`,
  finding: Prisma.sql`SELECT id, left(content, 100) AS title, "organizationId", concat_ws(' ', content, "revisionNote") AS body FROM "Finding"`,
  control: Prisma.sql`SELECT id, name AS title, "organizationId", concat_ws(' ', name, description) AS body FROM "Control" WHERE "archivedAt" IS NULL`,
  policy: Prisma.sql`SELECT p.id, p.name AS title, p."organizationId", concat_ws(' ', p.name, p.description, p.content::text) AS body FROM "Policy" p WHERE NOT p."isArchived" AND p."archivedAt" IS NULL`,
  document: Prisma.sql`SELECT d.id, d.title, d."organizationId", concat_ws(' ', d.title, d."draftNarrative"::text, v."contentSnapshot"::text, v.narrative::text) AS body FROM "IsmsDocument" d LEFT JOIN "IsmsDocumentVersion" v ON v.id=d."currentVersionId"`,
  soa: Prisma.sql`SELECT d.id, concat('Statement of Applicability v', d.version) AS title, d."organizationId", concat_ws(' ', c.questions::text, (SELECT string_agg(a.answer, ' ') FROM "SOAAnswer" a WHERE a."documentId"=d.id AND a."isLatestAnswer")) AS body FROM "SOADocument" d JOIN "SOAFrameworkConfiguration" c ON c.id=d."configurationId" WHERE d."isLatest"`,
  risk: Prisma.sql`SELECT id, title, "organizationId", concat_ws(' ', title, description, "treatmentStrategyDescription") AS body FROM "Risk"`,
  vendor: Prisma.sql`SELECT id, name AS title, "organizationId", concat_ws(' ', name, description, "treatmentStrategyDescription", "complianceBadges"::text) AS body FROM "Vendor"`,
  task: Prisma.sql`SELECT id, title, "organizationId", concat_ws(' ', title, description) AS body FROM "Task" WHERE "archivedAt" IS NULL`,
  comment: Prisma.sql`SELECT id, concat('Comment on ', "entityType", ': ', left(content, 90)) AS title, "organizationId", content AS body FROM "Comment" WHERE "entityType" IN ('policy','risk','vendor','task','finding')`,
  audit: Prisma.sql`SELECT a.id, a.reference AS title, d."organizationId", concat_ws(' ', a.reference, a.scope, a.criteria, a."conclusionNotes", (SELECT string_agg(concat_ws(' ', c."controlRef", c.notes), ' ') FROM "IsmsAuditControl" c WHERE c."auditId"=a.id)) AS body FROM "IsmsAudit" a JOIN "IsmsDocument" d ON d.id=a."documentId"`,
  evidence: Prisma.sql`SELECT e.id, e.title, d."organizationId", concat_ws(' ', e.title, e.snapshot::text) AS body FROM "AuditEvidenceLink" e JOIN "IsmsAuditControl" c ON c.id=e."controlId" JOIN "IsmsAudit" a ON a.id=c."auditId" JOIN "IsmsDocument" d ON d.id=a."documentId"`,
  file: Prisma.sql`SELECT id, name AS title, "organizationId", name AS body FROM "Attachment" WHERE "entityType" IN ('task','vendor','risk','comment')`,
  knowledge: Prisma.sql`SELECT id, name AS title, "organizationId", concat_ws(' ', name, description) AS body FROM "KnowledgeBaseDocument"`,
};
export async function searchResearchSources({
  organizationId,
  kind,
  query,
  offset,
}: {
  organizationId: string;
  kind: SourceKind;
  query: string;
  offset: number;
}) {
  const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
  const rows = await db.$queryRaw<{ id: string; title: string }[]>(Prisma.sql`
    SELECT id, title FROM (${tables[kind]}) s WHERE s."organizationId"=${organizationId}
    AND s.body ILIKE ${pattern} ORDER BY s.id LIMIT 21 OFFSET ${offset}`);
  return {
    kind,
    sources: rows.slice(0, 20),
    nextOffset: rows.length > 20 ? offset + 20 : null,
    note:
      kind === 'file' || kind === 'knowledge'
        ? 'Filename/description search. Read files to inspect contents.'
        : 'Search matches stored text; read sources to verify.',
  };
}
