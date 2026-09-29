import { AttachmentEntityType, db } from '@db';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttachmentsService } from '../attachments/attachments.service';
import { UploadAttachmentDto } from '../attachments/upload-attachment.dto';

@Injectable()
export class CommentAttachmentsService {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  async addAttachment({
    organizationId,
    commentId,
    userId,
    upload,
  }: {
    organizationId: string;
    commentId: string;
    userId: string | undefined;
    upload: UploadAttachmentDto;
  }) {
    if (!userId) throw new BadRequestException('User ID is required');
    const comment = await db.comment.findFirst({
      where: { id: commentId, organizationId },
      select: { author: { select: { userId: true, deactivated: true } } },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.author.userId !== userId || comment.author.deactivated) {
      throw new ForbiddenException(
        'You can only add attachments to your own comments',
      );
    }
    return this.attachmentsService.uploadAttachment(
      organizationId,
      commentId,
      AttachmentEntityType.comment,
      upload,
      userId,
    );
  }
}
