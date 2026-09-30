import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import {
  auditScope,
  assertCurrent,
  type WorkspaceActor,
} from './workspace-access';
import { lockDocument } from '../utils/document-lock';
import { invalidateApprovalIfNeeded } from '../utils/approval';
@Injectable()
export class AuditWorkspaceFinish {
  async finish({
    id,
    organizationId,
    expectedUpdatedAt,
    actor,
  }: {
    id: string;
    organizationId: string;
    expectedUpdatedAt: string;
    actor: WorkspaceActor;
  }) {
    if (!actor.memberId)
      throw new ForbiddenException('A named auditor must complete this audit.');
    const audit = await db.ismsAudit.findFirst({
      where: { id, ...auditScope(organizationId) },
    });
    if (!audit) throw new NotFoundException('Audit not found');
    return db.$transaction(async (tx) => {
      await lockDocument(tx, audit.documentId);
      const current = await tx.ismsAudit.findUniqueOrThrow({
        where: { id },
        include: { controls: { include: { requests: true } } },
      });
      assertCurrent({ actual: current.updatedAt, expected: expectedUpdatedAt });
      if (
        !current.controls.length ||
        current.controls.some((c) => !c.result || !c.notes?.trim())
      )
        throw new BadRequestException(
          'Record an outcome and reasoning for every planned check first.',
        );
      if (!current.controls.some((c) => c.result !== 'not_sampled'))
        throw new BadRequestException(
          'At least one check must have been sampled.',
        );
      if (
        current.controls.some((c) =>
          c.requests.some((r) => r.status !== 'accepted'),
        )
      )
        throw new BadRequestException(
          'Review all outstanding responses before completing the audit.',
        );
      if (!current.conclusionVerdict || !current.conclusionNotes?.trim())
        throw new BadRequestException(
          'Save the overall conclusion before completing the audit.',
        );
      await invalidateApprovalIfNeeded({ tx, documentId: audit.documentId });
      return tx.ismsAudit.update({
        where: { id },
        data: {
          status: 'complete',
          signoffAuditorName: actor.name,
          signoffAuditorDate: new Date(),
        },
      });
    });
  }
}
