import { canCoordinateAudit } from './workspace-coordinator';
import { reopenWorkingAudit } from './audit-progress';
import { BadRequestException, Injectable } from '@nestjs/common';
import { db } from '@db';
import { resolveRolePermissions } from '../../auth/app-access';
import { invalidateApprovalIfNeeded } from '../utils/approval';
import { lockDocument } from '../utils/document-lock';
import {
  auditScope,
  assertCurrent,
  requireCheck,
  type WorkspaceActor,
} from './workspace-access';
import type { AuditReviewDto } from './workspace.dto';

@Injectable()
export class AuditWorkspaceService {
  async list(organizationId: string) {
    const [audits, members, documents] = await Promise.all([
      db.ismsAudit.findMany({
        where: auditScope(organizationId),
        orderBy: { createdAt: 'desc' },
        include: {
          document: { select: { id: true, status: true } },
          controls: {
            orderBy: { position: 'asc' },
            include: {
              evidenceLinks: { orderBy: { createdAt: 'asc' } },
              requests: {
                orderBy: { createdAt: 'asc' },
                include: { messages: { orderBy: { createdAt: 'asc' } } },
              },
            },
          },
          findings: { orderBy: { position: 'asc' } },
        },
      }),
      db.member.findMany({
        where: { organizationId, isActive: true, deactivated: false },
        select: {
          id: true,
          role: true,
          user: { select: { name: true, email: true } },
        },
      }),
      db.ismsDocument.findMany({
        where: { organizationId, type: 'internal_audit' },
        select: { id: true },
        take: 1,
      }),
    ]);
    const coordinators = await Promise.all(
      members.map(async (m) => ({
        id: m.id,
        name: m.user.name || m.user.email,
        canRespond: canCoordinateAudit(
          await resolveRolePermissions(
            organizationId,
            m.role.split(',').map((r) => r.trim()),
          ),
        ),
      })),
    );
    return {
      audits,
      members: coordinators,
      documentId: documents[0]?.id ?? null,
    };
  }

  async review({
    controlId,
    organizationId,
    dto,
    actor,
  }: {
    controlId: string;
    organizationId: string;
    dto: AuditReviewDto;
    actor: WorkspaceActor;
  }) {
    const check = await requireCheck({ id: controlId, organizationId });
    return db.$transaction(async (tx) => {
      await lockDocument(tx, check.documentId);
      const current = await requireCheck({
        id: controlId,
        organizationId,
        client: tx,
      });
      assertCurrent({
        actual: current.updatedAt,
        expected: dto.expectedUpdatedAt,
      });
      if (dto.result) {
        if (!dto.notes.trim())
          throw new BadRequestException(
            'Describe the evidence examined and your conclusion before completing the review.',
          );
        const openRequests = await tx.auditRequest.count({
          where: { controlId, status: { not: 'accepted' } },
        });
        if (openRequests)
          throw new BadRequestException(
            'Review and accept the outstanding responses first.',
          );
        if (
          dto.result === 'nonconformity_raised' ||
          dto.result === 'observation_raised'
        ) {
          const types =
            dto.result === 'nonconformity_raised'
              ? (['nc_major', 'nc_minor'] as const)
              : (['observation', 'ofi'] as const);
          const finding = await tx.ismsAuditFinding.findFirst({
            where: { controlId, type: { in: [...types] } },
          });
          if (!finding)
            throw new BadRequestException(
              'Record a matching finding linked to this check first.',
            );
        }
      }
      await reopenWorkingAudit({ tx, auditId: check.auditId });
      await invalidateApprovalIfNeeded({ tx, documentId: check.documentId });
      return tx.ismsAuditControl.update({
        where: { id: controlId },
        data: {
          notes: dto.notes.trim() || null,
          result: dto.result ?? null,
          reviewedAt: dto.result ? new Date() : null,
          reviewedBy: dto.result ? actor.name : null,
          source: 'manual',
        },
      });
    });
  }
}
