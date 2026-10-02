import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import type { WorkspaceActor } from '../workspace-access';
import type {
  CreateAttachmentFeedbackDto,
  ListAttachmentFeedbackDto,
  RespondAttachmentFeedbackDto,
} from './attachment-feedback.dto';

const include = {
  responses: {
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
  },
};

@Injectable()
export class AttachmentFeedbackService {
  async list({
    organizationId,
    query,
  }: {
    organizationId: string;
    query: ListAttachmentFeedbackDto;
  }) {
    const where = {
      organizationId,
      attachmentId: query.attachmentId,
      status: query.status,
    };
    const offset = query.offset ?? 0;
    const [data, count] = await db.$transaction([
      db.attachmentFeedback.findMany({
        where,
        include,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: offset,
        take: 50,
      }),
      db.attachmentFeedback.count({ where }),
    ]);
    const files = await db.attachment.findMany({
      where: {
        organizationId,
        id: { in: data.map((item) => item.attachmentId) },
      },
      select: { id: true },
    });
    const available = new Set(files.map((file) => file.id));
    return {
      data: data.map((item) => ({
        ...item,
        attachmentAvailable: available.has(item.attachmentId),
      })),
      count,
      nextOffset: offset + data.length < count ? offset + data.length : null,
    };
  }

  async create({
    organizationId,
    dto,
    actor,
  }: {
    organizationId: string;
    dto: CreateAttachmentFeedbackDto;
    actor: WorkspaceActor;
  }) {
    const attachment = await db.attachment.findFirst({
      where: { id: dto.attachmentId, organizationId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    // Comment and task-item files are corrected on their parent record.
    const parent =
      attachment.entityType === 'comment'
        ? await db.comment.findFirst({
            where: { id: attachment.entityId, organizationId },
            select: { entityId: true, entityType: true },
          })
        : attachment.entityType === 'task_item'
          ? await db.taskItem.findFirst({
              where: { id: attachment.entityId, organizationId },
              select: { entityId: true, entityType: true },
            })
          : null;
    return db.attachmentFeedback.create({
      data: {
        organizationId,
        attachmentId: attachment.id,
        attachmentName: attachment.name,
        entityId: parent?.entityId ?? attachment.entityId,
        entityType: parent?.entityType ?? attachment.entityType,
        comment: dto.comment,
        authorName: actor.name,
        authorMemberId: actor.memberId,
      },
      include,
    });
  }

  async respond({
    organizationId,
    id,
    dto,
    actor,
  }: {
    organizationId: string;
    id: string;
    dto: RespondAttachmentFeedbackDto;
    actor: WorkspaceActor;
  }) {
    return db.$transaction(async (tx) => {
      const item = await tx.attachmentFeedback.findFirst({
        where: { id, organizationId },
      });
      if (!item) throw new NotFoundException('Attachment feedback not found');
      const changed = await tx.attachmentFeedback.updateMany({
        where: {
          id,
          organizationId,
          updatedAt: new Date(dto.expectedUpdatedAt),
        },
        data: {
          status: dto.status,
          updatedAt: new Date(
            Math.max(Date.now(), item.updatedAt.getTime() + 1),
          ),
        },
      });
      if (changed.count !== 1)
        throw new ConflictException(
          'This feedback changed. Refresh and review the latest response before saving.',
        );
      await tx.attachmentFeedbackResponse.create({
        data: {
          feedbackId: id,
          comment: dto.comment,
          status: dto.status,
          authorName: actor.name,
          authorMemberId: actor.memberId,
        },
      });
      return tx.attachmentFeedback.findFirstOrThrow({
        where: { id, organizationId },
        include,
      });
    });
  }
}
