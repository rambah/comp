import type { Prisma } from '@trycompai/db';

export function ismsDocumentLinks(organizationId: string) {
  return {
    where: { ismsDocument: { organizationId } },
    select: {
      ismsDocument: {
        select: {
          id: true, type: true, title: true, status: true,
          currentVersion: { select: { version: true, publishedAt: true } },
        },
      },
    },
  } satisfies Prisma.IsmsDocumentControlLinkFindManyArgs;
}
