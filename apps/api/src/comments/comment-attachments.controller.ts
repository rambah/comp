import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiExtension,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { UploadAttachmentDto } from '../attachments/upload-attachment.dto';
import { AuthContext } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import { AttachmentResponseDto } from '../tasks/dto/task-responses.dto';
import { CommentAttachmentsService } from './comment-attachments.service';

@ApiTags('Comments')
@Controller({ path: 'comments', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class CommentAttachmentsController {
  constructor(private readonly attachments: CommentAttachmentsService) {}

  @Post(':commentId/attachments')
  @RequirePermission('task', 'update')
  @ApiOperation({
    summary: 'Add an attachment to a comment',
    description:
      'Append a file to your existing comment without changing its text or existing attachments. AI clients upload via /v1/uploads/presign (purpose=attachment), then pass s3Key. Requires comment-author access.',
  })
  @ApiExtension('x-speakeasy-mcp', { name: 'add-comment-attachment' })
  @ApiParam({
    name: 'commentId',
    description: 'ID of the existing comment',
    example: 'cmt_abc123def456',
  })
  @ApiBody({ type: UploadAttachmentDto })
  @ApiResponse({
    status: 201,
    description: 'Attachment added to the comment',
    type: AttachmentResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Caller cannot edit this comment' })
  @ApiResponse({
    status: 404,
    description: 'Comment not found in the current organization',
  })
  addAttachment(
    @AuthContext() auth: AuthContextType,
    @Param('commentId') commentId: string,
    @Body() upload: UploadAttachmentDto,
  ): Promise<AttachmentResponseDto> {
    // Match comment editing: credential permissions are checked by PermissionGuard;
    // the attributed author must additionally own this comment.
    return this.attachments.addAttachment({
      organizationId: auth.organizationId,
      commentId,
      userId: auth.isApiKey ? upload.userId : auth.userId,
      upload,
    });
  }
}
