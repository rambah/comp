import { db } from '@db';
import { NotFoundException } from '@nestjs/common';
export const recordingPublicFields = {
  id: true,
  auditorName: true,
  startedAt: true,
  lastEventAt: true,
  endedAt: true,
  expiresAt: true,
  state: true,
} as const;
export async function listRecordingPage({
  organizationId,
  cursor,
}: {
  organizationId: string;
  cursor?: string;
}) {
  if (
    cursor &&
    !(await db.auditRecording.findFirst({
      where: {
        id: cursor,
        organizationId,
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    }))
  )
    throw new NotFoundException(
      'Page cursor expired. Return to the latest recordings.',
    );
  const rows = await db.auditRecording.findMany({
    where: {
      organizationId,
      deletedAt: null,
      expiresAt: { gt: new Date() },
      chunks: { some: { bytes: { gt: 0 } } },
    },
    select: recordingPublicFields,
    orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
    take: 101,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  return {
    data: rows.slice(0, 100),
    nextCursor: rows.length > 100 ? rows[99].id : null,
  };
}
