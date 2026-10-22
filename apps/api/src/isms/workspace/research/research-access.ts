import { db } from '@db';
import { ForbiddenException } from '@nestjs/common';
import { resolveRolePermissions } from '../../../auth/app-access';
import { RESEARCH_RESOURCES } from './research.types';

export async function requireResearchMember({
  organizationId,
  memberId,
  write = false,
}: {
  organizationId: string;
  memberId: string;
  write?: boolean;
}) {
  const member = await db.member.findFirst({
    where: { id: memberId, organizationId, isActive: true, deactivated: false },
    select: { role: true },
  });
  if (!member)
    throw new ForbiddenException('Active organization membership required');
  const permissions = await resolveRolePermissions(
    organizationId,
    member.role.split(',').map((s) => s.trim()),
  );
  if (
    RESEARCH_RESOURCES.some((r) => !permissions[r]?.includes('read')) ||
    (write && !permissions.auditWorkspace?.includes('update'))
  )
    throw new ForbiddenException(
      'Research requires read access to all audit source categories',
    );
}
