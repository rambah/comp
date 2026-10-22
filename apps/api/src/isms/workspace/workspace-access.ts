import { ConflictException, NotFoundException } from '@nestjs/common';
import { db, type Prisma } from '@db';
import type { AuthenticatedRequest } from '../../auth/types';

export const auditScope = (organizationId: string) => ({
  document: { organizationId, type: 'internal_audit' as const },
});

export async function requireCheck({
  id,
  organizationId,
  client = db,
}: {
  id: string;
  organizationId: string;
  client?: Prisma.TransactionClient;
}) {
  const check = await client.ismsAuditControl.findFirst({
    where: { id, audit: auditScope(organizationId) },
  });
  if (!check) throw new NotFoundException('Audit check not found');
  return check;
}

export function assertCurrent({
  actual,
  expected,
}: {
  actual: Date;
  expected: string;
}) {
  if (actual.getTime() !== new Date(expected).getTime()) {
    throw new ConflictException(
      'This record changed while you were editing. Reload it and review your changes.',
    );
  }
}

export async function workspaceActor(request: AuthenticatedRequest) {
  const member = request.userId
    ? await db.member.findFirst({
        where: {
          organizationId: request.organizationId,
          userId: request.userId,
          isActive: true,
          deactivated: false,
        },
        select: { id: true, user: { select: { name: true, email: true } } },
      })
    : null;
  return {
    memberId: member?.id ?? null,
    name:
      member?.user.name ||
      member?.user.email ||
      (request.isApiKey ? 'API client' : 'Service client'),
  };
}

export type WorkspaceActor = Awaited<ReturnType<typeof workspaceActor>>;
