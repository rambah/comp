import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiExtension,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationId } from '../../../auth/auth-context.decorator';
import { HybridAuthGuard } from '../../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../../auth/permission.guard';
import { RequirePermissions } from '../../../auth/require-permission.decorator';
import type { AuthenticatedRequest } from '../../../auth/types';
import { workspaceActor } from '../workspace-access';
import {
  CreateAttachmentFeedbackDto,
  ListAttachmentFeedbackDto,
  RespondAttachmentFeedbackDto,
} from './attachment-feedback.dto';
import { AttachmentFeedbackService } from './attachment-feedback.service';

@ApiTags('Audit Workspace')
@ApiSecurity('apikey')
@Controller({ path: 'audit-workspace/attachment-feedback', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
export class AttachmentFeedbackController {
  constructor(private readonly feedback: AttachmentFeedbackService) {}

  @Get()
  @ApiExtension('x-speakeasy-mcp', { name: 'list-attachment-feedback' })
  @RequirePermissions([
    { resource: 'auditWorkspace', actions: ['read'] },
    { resource: 'evidence', actions: ['read'] },
  ])
  @ApiOperation({
    summary: 'List attachment feedback',
    description:
      'List flagged evidence files and attributed responses across the organization. Filter by attachment or status; use nextOffset to retrieve the next page.',
  })
  list(
    @OrganizationId() organizationId: string,
    @Query() query: ListAttachmentFeedbackDto,
  ) {
    return this.feedback.list({ organizationId, query });
  }

  @Post()
  @ApiExtension('x-speakeasy-mcp', { name: 'flag-evidence-attachment' })
  @RequirePermissions([
    { resource: 'auditWorkspace', actions: ['update'] },
    { resource: 'evidence', actions: ['read'] },
  ])
  @ApiOperation({
    summary: 'Flag an evidence attachment',
    description:
      'Record a concern about an existing evidence file with a required comment. Preserves file identity and author; does not change evidence, audit decisions or approvals.',
  })
  @ApiBody({ type: CreateAttachmentFeedbackDto })
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateAttachmentFeedbackDto,
  ) {
    return this.feedback.create({
      organizationId: request.organizationId,
      dto,
      actor: await workspaceActor(request),
    });
  }

  @Post(':id/responses')
  @ApiExtension('x-speakeasy-mcp', { name: 'respond-to-attachment-feedback' })
  @RequirePermissions([
    { resource: 'auditWorkspace', actions: ['update'] },
    { resource: 'evidence', actions: ['read'] },
  ])
  @ApiOperation({
    summary: 'Respond to attachment feedback',
    description:
      'Append a comment and keep open, resolve or reopen a flagged file. Requires its latest updatedAt to avoid overwriting concurrent changes. Resolution does not approve evidence.',
  })
  @ApiBody({ type: RespondAttachmentFeedbackDto })
  async respond(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: RespondAttachmentFeedbackDto,
  ) {
    return this.feedback.respond({
      organizationId: request.organizationId,
      id,
      dto,
      actor: await workspaceActor(request),
    });
  }
}
