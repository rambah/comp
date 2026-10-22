import { db } from '@db';
import {
  sourceText,
  type ResearchSource,
  type SourceKind,
} from './research.types';
export async function readExtraRecord({
  organizationId,
  kind,
  id,
}: {
  organizationId: string;
  kind: SourceKind;
  id: string;
}): Promise<ResearchSource | null> {
  const wrap = ({
    title,
    content,
    path,
  }: {
    title: string;
    content: unknown;
    path: string;
  }): ResearchSource => ({
    kind,
    id,
    title,
    text: sourceText(content),
    url: `/${encodeURIComponent(organizationId)}/${path}`,
    version: `Current record · retrieved ${new Date().toISOString()}`,
  });
  if (kind === 'context') {
    const row = await db.context.findFirst({
      where: { organizationId, id },
      select: { question: true, answer: true, updatedAt: true },
    });
    return (
      row && wrap({ title: row.question, content: row, path: 'knowledge-base' })
    );
  }
  if (kind === 'answer') {
    const row = await db.securityQuestionnaireManualAnswer.findFirst({
      where: { organizationId, id },
      select: { question: true, answer: true, updatedAt: true },
    });
    return (
      row && wrap({ title: row.question, content: row, path: 'knowledge-base' })
    );
  }
  if (kind === 'finding') {
    const row = await db.finding.findFirst({
      where: { organizationId, id },
      select: {
        content: true,
        revisionNote: true,
        status: true,
        severity: true,
        area: true,
        updatedAt: true,
      },
    });
    return (
      row &&
      wrap({
        title: `Finding: ${row.content.slice(0, 80)}`,
        content: row,
        path: 'findings',
      })
    );
  }
  if (kind === 'control') {
    const row = await db.control.findFirst({
      where: { organizationId, id, archivedAt: null },
      select: {
        name: true,
        description: true,
        tasks: {
          where: { organizationId, archivedAt: null },
          select: { title: true, status: true },
        },
        policies: {
          where: { organizationId, archivedAt: null, isArchived: false },
          select: { name: true, status: true },
        },
      },
    });
    return (
      row && wrap({ title: row.name, content: row, path: `controls/${id}` })
    );
  }
  return null;
}
