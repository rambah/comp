import { db } from '@db';
import { NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { auditScope } from '../workspace-access';
export const savedCitation = z.object({
  label: z.string(),
  kind: z.string(),
  sourceId: z.string(),
  title: z.string(),
  version: z.string(),
  url: z.string(),
  excerpt: z.string(),
  retrievedAt: z.string(),
  offset: z.number(),
});
export async function researchPage({
  threadId,
  organizationId,
  before,
}: {
  threadId: string;
  organizationId: string;
  before?: string;
}) {
  const scope = { threadId, thread: { audit: auditScope(organizationId) } };
  const cursor = before
    ? await db.auditResearchTurn.findFirst({
        where: { ...scope, id: before },
        select: { id: true, createdAt: true },
      })
    : null;
  if (before && !cursor)
    throw new NotFoundException('History cursor not found');
  const rows = await db.auditResearchTurn.findMany({
    where: {
      ...scope,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 21,
  });
  const turns = rows
    .slice(0, 20)
    .reverse()
    .map((turn) => ({
      ...turn,
      citations: savedCitation
        .array()
        .catch([])
        .parse(turn.citations)
        .map((citation) => ({
          ...citation,
          excerpt: citation.excerpt.slice(0, 600),
        })),
    }));
  return { turns, olderCursor: rows.length > 20 ? turns[0].id : null };
}
export async function researchCitation({
  threadId,
  organizationId,
  turnId,
  label,
}: {
  threadId: string;
  organizationId: string;
  turnId: string;
  label: string;
}) {
  const turn = await db.auditResearchTurn.findFirst({
    where: {
      id: turnId,
      threadId,
      thread: { audit: auditScope(organizationId) },
    },
    select: { citations: true },
  });
  const source = savedCitation
    .array()
    .catch([])
    .parse(turn?.citations)
    .find((c) => c.label === label);
  if (!source) throw new NotFoundException('Captured source not found');
  return source;
}
