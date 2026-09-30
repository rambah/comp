import { canCoordinateAudit } from './workspace-coordinator';
import { reopenWorkingAudit } from './audit-progress';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import { resolveRolePermissions } from '../../auth/app-access';
import { lockDocument } from '../utils/document-lock';
import { invalidateApprovalIfNeeded } from '../utils/approval';
import {
  auditScope,
  assertCurrent,
  requireCheck,
  type WorkspaceActor,
} from './workspace-access';
import type { AuditRequestDto, AuditResponseDto } from './workspace.dto';

@Injectable()
export class AuditWorkspaceRequestsService {
  async create({
    controlId,
    organizationId,
    dto,
    actor,
  }: {
    controlId: string;
    organizationId: string;
    dto: AuditRequestDto;
    actor: WorkspaceActor;
  }) {
    if (!dto.question.trim())
      throw new BadRequestException('A question is required.');
    const check = await requireCheck({ id: controlId, organizationId });
    const owner = await db.member.findFirst({
      where: {
        id: dto.ownerMemberId,
        organizationId,
        isActive: true,
        deactivated: false,
      },
    });
    if (!owner)
      throw new BadRequestException(
        'Choose an active member of this organization.',
      );
    const permissions = await resolveRolePermissions(
      organizationId,
      owner.role.split(',').map((r) => r.trim()),
    );
    if (!canCoordinateAudit(permissions))
      throw new BadRequestException(
        'The coordinator needs audit workspace access to respond.',
      );
    return db.$transaction(async (tx) => {
      await lockDocument(tx, check.documentId);
      await reopenWorkingAudit({ tx, auditId: check.auditId });
      await invalidateApprovalIfNeeded({ tx, documentId: check.documentId });
      const request = await tx.auditRequest.create({
        data: {
          controlId,
          question: dto.question.trim(),
          ownerMemberId: owner.id,
          dueDate: new Date(dto.dueDate),
          createdBy: actor.name,
        },
      });
      await tx.ismsAuditControl.update({
        where: { id: controlId },
        data: { result: null, reviewedAt: null, reviewedBy: null },
      });
      return request;
    });
  }

  async respond({
    requestId,
    organizationId,
    dto,
    actor,
  }: {
    requestId: string;
    organizationId: string;
    dto: AuditResponseDto;
    actor: WorkspaceActor;
  }) {
    if (!dto.content.trim())
      throw new BadRequestException('A response or review reason is required.');
    const request = await db.auditRequest.findFirst({
      where: { id: requestId, control: { audit: auditScope(organizationId) } },
      include: { control: true },
    });
    if (!request) throw new NotFoundException('Audit request not found');
    return db.$transaction(async (tx) => {
      await lockDocument(tx, request.control.documentId);
      const current = await tx.auditRequest.findUniqueOrThrow({
        where: { id: requestId },
      });
      assertCurrent({
        actual: current.updatedAt,
        expected: dto.expectedUpdatedAt,
      });
      if (
        (dto.status === 'accepted' || dto.status === 'changes_requested') &&
        current.status !== 'submitted'
      ) {
        throw new BadRequestException(
          'Only a submitted response can be accepted or returned for changes.',
        );
      }
      if (current.status === 'accepted' && dto.status !== 'open')
        throw new BadRequestException(
          'Reopen an accepted request before adding a response.',
        );
      await reopenWorkingAudit({ tx, auditId: request.control.auditId });
      await invalidateApprovalIfNeeded({
        tx,
        documentId: request.control.documentId,
      });
      await tx.auditRequestMessage.create({
        data: {
          requestId,
          content: dto.content.trim(),
          authorName: actor.name,
          authorMemberId: actor.memberId,
          status: dto.status,
        },
      });
      const updated = await tx.auditRequest.update({
        where: { id: requestId },
        data: { status: dto.status },
      });
      await tx.ismsAuditControl.update({
        where: { id: request.controlId },
        data: { result: null, reviewedAt: null, reviewedBy: null },
      });
      return updated;
    });
  }
}
