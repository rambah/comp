import { reopenWorkingAudit } from './audit-progress';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import { auditScope, assertCurrent } from './workspace-access';
import { lockDocument } from '../utils/document-lock';
import { invalidateApprovalIfNeeded } from '../utils/approval';
import type {
  AuditConclusionDto,
  AuditFindingFollowupDto,
} from './workspace-completion.dto';

@Injectable()
export class AuditWorkspaceCompletion {
  async followup({
    id,
    organizationId,
    dto,
  }: {
    id: string;
    organizationId: string;
    dto: AuditFindingFollowupDto;
  }) {
    const finding = await db.ismsAuditFinding.findFirst({
      where: { id, audit: auditScope(organizationId) },
    });
    if (!finding) throw new NotFoundException('Finding not found');
    if (dto.status === 'closed' && !dto.closureEvidence.trim())
      throw new BadRequestException(
        'Record the resolution and closure evidence first.',
      );
    return db.$transaction(async (tx) => {
      await lockDocument(tx, finding.documentId);
      const current = await tx.ismsAuditFinding.findUniqueOrThrow({
        where: { id },
      });
      assertCurrent({
        actual: current.updatedAt,
        expected: dto.expectedUpdatedAt,
      });
      await invalidateApprovalIfNeeded({ tx, documentId: finding.documentId });
      return tx.ismsAuditFinding.update({
        where: { id },
        data: {
          status: dto.status,
          closureEvidence: dto.closureEvidence.trim() || null,
        },
      });
    });
  }

  async conclusion({
    id,
    organizationId,
    dto,
  }: {
    id: string;
    organizationId: string;
    dto: AuditConclusionDto;
  }) {
    const audit = await db.ismsAudit.findFirst({
      where: { id, ...auditScope(organizationId) },
    });
    if (!audit) throw new NotFoundException('Audit not found');
    if (!dto.conclusionNotes.trim())
      throw new BadRequestException(
        'Record the reasoning and limitations for this conclusion.',
      );
    return db.$transaction(async (tx) => {
      await lockDocument(tx, audit.documentId);
      const current = await tx.ismsAudit.findUniqueOrThrow({ where: { id } });
      assertCurrent({
        actual: current.updatedAt,
        expected: dto.expectedUpdatedAt,
      });
      await reopenWorkingAudit({ tx, auditId: audit.id });
      await invalidateApprovalIfNeeded({ tx, documentId: audit.documentId });
      return tx.ismsAudit.update({
        where: { id },
        data: {
          conclusionVerdict: dto.conclusionVerdict,
          conclusionNotes: dto.conclusionNotes.trim(),
        },
      });
    });
  }
}
