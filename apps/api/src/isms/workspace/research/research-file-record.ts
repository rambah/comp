import { db } from '@db';
export type ResearchFileKind = 'file' | 'knowledge' | 'policy';
export async function researchFileRecord({
  organizationId,
  kind,
  id,
}: {
  organizationId: string;
  kind: ResearchFileKind;
  id: string;
}) {
  if (kind === 'policy') {
    const p = await db.policy.findFirst({
      where: {
        id,
        organizationId,
        displayFormat: 'PDF',
        isArchived: false,
        archivedAt: null,
      },
      select: {
        name: true,
        pdfUrl: true,
        updatedAt: true,
        currentVersion: { select: { version: true, pdfUrl: true } },
      },
    });
    const key = p?.currentVersion?.pdfUrl ?? p?.pdfUrl;
    if (!p || !key) return null;
    return {
      name: `${p.name}.pdf`,
      key,
      date: p.updatedAt,
      path: `policies/${id}`,
      version: p.currentVersion?.pdfUrl
        ? `Published v${p.currentVersion.version} · PDF`
        : `Working PDF · ${p.updatedAt.toISOString()}`,
    };
  }
  if (kind === 'knowledge') {
    const row = await db.knowledgeBaseDocument.findFirst({
      where: { id, organizationId },
      select: { name: true, s3Key: true, updatedAt: true },
    });
    return (
      row && {
        name: row.name,
        key: row.s3Key,
        date: row.updatedAt,
        path: 'knowledge-base',
        version: `File · ${row.updatedAt.toISOString()}`,
      }
    );
  }
  const row = await db.attachment.findFirst({
    where: {
      id,
      organizationId,
      entityType: { in: ['task', 'vendor', 'risk', 'comment'] },
    },
    select: {
      name: true,
      url: true,
      createdAt: true,
      entityType: true,
      entityId: true,
    },
  });
  if (!row) return null;
  const parent =
    row.entityType === 'comment'
      ? await db.comment.findFirst({
          where: { id: row.entityId, organizationId },
          select: { entityType: true, entityId: true },
        })
      : row;
  const sections: Record<string, string> = {
    task: 'tasks',
    vendor: 'vendors',
    risk: 'risk',
    policy: 'policies',
    finding: 'findings',
  };
  return {
    name: row.name,
    key: row.url,
    date: row.createdAt,
    path:
      parent && sections[parent.entityType]
        ? `${sections[parent.entityType]}/${parent.entityId}`
        : 'audits',
    version: `Uploaded ${row.createdAt.toISOString()}`,
  };
}
