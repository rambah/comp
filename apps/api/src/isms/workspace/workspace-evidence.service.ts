import { reopenWorkingAudit } from './audit-progress';
import { AttachmentsService } from '../../attachments/attachments.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db, type Prisma } from '@db';
import { invalidateApprovalIfNeeded } from '../utils/approval';
import { lockDocument } from '../utils/document-lock';
import { requireCheck, type WorkspaceActor } from './workspace-access';
import type { AuditSourceDto } from './workspace.dto';

const evidenceTypes = ['task', 'vendor', 'risk', 'comment'] as const;

@Injectable()
export class AuditWorkspaceEvidenceService {
  constructor(private readonly attachments: AttachmentsService) {}
  async search({
    organizationId,
    search = '',
    offset = 0,
  }: {
    organizationId: string;
    search?: string;
    offset?: number;
  }) {
    if (!Number.isSafeInteger(offset) || offset < 0)
      throw new BadRequestException('Invalid source offset');
    const contains = {
      contains: search.slice(0, 200),
      mode: 'insensitive' as const,
    };
    const [attachments, policies, documents] = await Promise.all([
      db.attachment.findMany({
        where: {
          organizationId,
          name: contains,
          entityType: { in: [...evidenceTypes] },
        },
        select: { id: true, name: true, createdAt: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: offset,
        take: 51,
      }),
      db.policy.findMany({
        where: {
          organizationId,
          name: contains,
          isArchived: false,
          archivedAt: null,
          currentVersionId: { not: null },
        },
        select: {
          id: true,
          name: true,
          currentVersion: { select: { version: true } },
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: offset,
        take: 51,
      }),
      db.ismsDocument.findMany({
        where: {
          organizationId,
          title: contains,
          currentVersionId: { not: null },
        },
        select: {
          id: true,
          title: true,
          currentVersion: { select: { version: true } },
        },
        orderBy: [{ title: 'asc' }, { id: 'asc' }],
        skip: offset,
        take: 51,
      }),
    ]);
    return {
      nextOffset: [attachments, policies, documents].some(
        (items) => items.length > 50,
      )
        ? offset + 50
        : null,
      sources: [
        ...attachments.slice(0, 50).map((a) => ({
          id: a.id,
          title: a.name,
          type: 'attachment',
          version: `Uploaded ${a.createdAt.toISOString().slice(0, 10)}`,
        })),
        ...policies.slice(0, 50).map((p) => ({
          id: p.id,
          title: p.name,
          type: 'policy',
          version: `Published v${p.currentVersion?.version}`,
        })),
        ...documents.slice(0, 50).map((d) => ({
          id: d.id,
          title: d.title,
          type: 'document',
          version: `Published v${d.currentVersion?.version}`,
        })),
      ],
    };
  }

  async link({
    controlId,
    organizationId,
    dto,
    actor,
  }: {
    controlId: string;
    organizationId: string;
    dto: AuditSourceDto;
    actor: WorkspaceActor;
  }) {
    const check = await requireCheck({ id: controlId, organizationId });
    const source = await this.capture({ organizationId, dto });
    return db.$transaction(async (tx) => {
      await lockDocument(tx, check.documentId);
      const existing = await tx.auditEvidenceLink.findUnique({
        where: {
          controlId_sourceType_sourceId_versionLabel: {
            controlId,
            sourceType: dto.sourceType,
            sourceId: dto.sourceId,
            versionLabel: source.versionLabel,
          },
        },
      });
      if (existing)
        throw new BadRequestException(
          'This source is already linked. Its captured version is retained.',
        );
      await reopenWorkingAudit({ tx, auditId: check.auditId });
      await invalidateApprovalIfNeeded({ tx, documentId: check.documentId });
      const link = await tx.auditEvidenceLink.create({
        data: { controlId, ...dto, ...source, capturedBy: actor.name },
      });
      await tx.ismsAuditControl.update({
        where: { id: controlId },
        data: { result: null, reviewedAt: null, reviewedBy: null },
      });
      return link;
    });
  }

  private async capture({
    organizationId,
    dto,
  }: {
    organizationId: string;
    dto: AuditSourceDto;
  }): Promise<{
    title: string;
    versionLabel: string;
    snapshot: Prisma.InputJsonObject;
  }> {
    if (dto.sourceType === 'attachment') {
      const file = await db.attachment.findFirst({
        where: {
          id: dto.sourceId,
          organizationId,
          entityType: { in: [...evidenceTypes] },
        },
      });
      if (!file) throw new NotFoundException('Evidence file not found');
      return {
        title: file.name,
        versionLabel: `Uploaded ${file.createdAt.toISOString().slice(0, 10)}`,
        snapshot: {
          attachmentId: file.id,
          name: file.name,
          uploadedAt: file.createdAt.toISOString(),
        },
      };
    }
    if (dto.sourceType === 'policy') {
      const policy = await db.policy.findFirst({
        where: {
          id: dto.sourceId,
          organizationId,
          archivedAt: null,
          isArchived: false,
        },
        include: { currentVersion: true },
      });
      if (!policy?.currentVersion)
        throw new BadRequestException(
          'Only published policy versions can be linked.',
        );
      const v = policy.currentVersion;
      return {
        title: policy.name,
        versionLabel: `Published v${v.version}`,
        snapshot: {
          versionId: v.id,
          content: v.content,
          publishedAt: v.createdAt.toISOString(),
          pdfOnly: !!v.pdfUrl,
        },
      };
    }
    const doc = await db.ismsDocument.findFirst({
      where: { id: dto.sourceId, organizationId },
      include: { currentVersion: true },
    });
    if (!doc?.currentVersion)
      throw new BadRequestException(
        'Only published ISMS document versions can be linked.',
      );
    const v = doc.currentVersion;
    return {
      title: doc.title,
      versionLabel: `Published v${v.version}`,
      snapshot: {
        versionId: v.id,
        content: v.contentSnapshot ?? v.narrative,
        publishedAt: v.publishedAt?.toISOString() ?? v.createdAt.toISOString(),
        documentType: doc.type,
        pdfOnly: !!v.pdfUrl,
      },
    };
  }

  async preview({
    id,
    organizationId,
  }: {
    id: string;
    organizationId: string;
  }) {
    const link = await db.auditEvidenceLink.findFirst({
      where: { id, control: { audit: { document: { organizationId } } } },
    });
    if (!link) throw new NotFoundException('Evidence not found');
    const snapshot = link.snapshot;
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot))
      throw new NotFoundException('Captured version not found');
    if (typeof snapshot.versionId !== 'string')
      throw new NotFoundException('Published version not found');
    const version =
      link.sourceType === 'policy'
        ? await db.policyVersion.findFirst({
            where: {
              id: snapshot.versionId,
              policy: { id: link.sourceId, organizationId },
            },
            select: { pdfUrl: true },
          })
        : await db.ismsDocumentVersion.findFirst({
            where: {
              id: snapshot.versionId,
              document: { id: link.sourceId, organizationId },
            },
            select: { pdfUrl: true },
          });
    if (!version?.pdfUrl)
      throw new NotFoundException('The captured version has no retained PDF');
    const [url, downloadUrl] = await Promise.all([
      this.attachments.getPresignedInlinePdfUrl(version.pdfUrl),
      this.attachments.getPresignedDownloadUrlWithFilename(
        version.pdfUrl,
        `${link.title}.pdf`,
      ),
    ]);
    return { url, downloadUrl };
  }
}
