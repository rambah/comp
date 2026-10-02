import { researchCitation } from './research-history';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiExtension, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HybridAuthGuard } from '../../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../../auth/permission.guard';
import { SessionOnlyGuard } from '../../../auth/session-only.guard';
import { RequirePermissions } from '../../../auth/require-permission.decorator';
import type { AuthenticatedRequest } from '../../../auth/types';
import { workspaceActor } from '../workspace-access';
import { requireResearchMember } from './research-access';
import { RESEARCH_RESOURCES } from './research.types';
import { AuditResearchService } from './research.service';
import { AuditResearchPromptDto, AuditResearchThreadDto } from './research.dto';

const read = RESEARCH_RESOURCES.map((resource) => ({
  resource,
  actions: ['read'],
}));
@ApiTags('Audit Research')
@Controller({ path: 'audit-workspace/research', version: '1' })
@UseGuards(HybridAuthGuard, SessionOnlyGuard, PermissionGuard)
export class AuditResearchController {
  constructor(private readonly research: AuditResearchService) {}
  @Get('audits/:id/threads')
  @RequirePermissions(read)
  @ApiExtension('x-speakeasy-mcp', { disabled: true })
  @ApiOperation({
    summary: 'List saved audit research topics',
    description:
      'Browser session: list shared research conversations for an audit and the configured AI model. Requires read access to all research source categories.',
  })
  list(@Param('id') auditId: string, @Req() req: AuthenticatedRequest) {
    return this.research.list({ auditId, organizationId: req.organizationId });
  }
  @Post('audits/:id/threads')
  @RequirePermissions([
    ...read,
    { resource: 'auditWorkspace', actions: ['update'] },
  ])
  @ApiExtension('x-speakeasy-mcp', { disabled: true })
  @ApiOperation({
    summary: 'Create an audit research topic',
    description:
      'Browser session: create a permanently saved research topic shared with authorized audit team members. Does not change evidence or audit conclusions.',
  })
  @ApiBody({ type: AuditResearchThreadDto })
  async create(
    @Param('id') auditId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: AuditResearchThreadDto,
  ) {
    const actor = await workspaceActor(req);
    await requireResearchMember({
      organizationId: req.organizationId,
      memberId: actor.memberId ?? '',
      write: true,
    });
    return this.research.create({
      auditId,
      organizationId: req.organizationId,
      title: dto.title,
      actor,
    });
  }
  @Get('threads/:id')
  @RequirePermissions(read)
  @ApiExtension('x-speakeasy-mcp', { disabled: true })
  @ApiOperation({
    summary: 'Read audit research history',
    description:
      'Browser session: retrieve saved questions, answers, source excerpts and progress. Poll this endpoint while a research turn is running; interrupted partial answers remain saved.',
  })
  get(
    @Param('id') threadId: string,
    @Req() req: AuthenticatedRequest,
    @Query('before') before?: string,
  ) {
    return this.research.get({
      threadId,
      organizationId: req.organizationId,
      before,
    });
  }
  @Get('threads/:id/turns/:turnId/sources/:label')
  @RequirePermissions(read)
  @ApiExtension('x-speakeasy-mcp', { disabled: true })
  @ApiOperation({
    summary: 'Read a captured research source',
    description:
      'Browser session: read the exact source excerpt retained with an AI answer, including its version and retrieval date. Requires access to all research source categories.',
  })
  source(
    @Param('id') threadId: string,
    @Param('turnId') turnId: string,
    @Param('label') label: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return researchCitation({
      threadId,
      turnId,
      label,
      organizationId: req.organizationId,
    });
  }
  @Post('threads/:id/turns')
  @HttpCode(202)
  @RequirePermissions([
    ...read,
    { resource: 'auditWorkspace', actions: ['update'] },
  ])
  @ApiExtension('x-speakeasy-mcp', { disabled: true })
  @ApiOperation({
    summary: 'Ask an audit research question',
    description:
      'Browser session: start a read-only AI research turn. Returns runId; poll GET research/threads/{id}. Reuse requestId after an uncertain network outcome to avoid duplicate generation.',
  })
  @ApiBody({ type: AuditResearchPromptDto })
  async ask(
    @Param('id') threadId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: AuditResearchPromptDto,
  ) {
    const actor = await workspaceActor(req);
    await requireResearchMember({
      organizationId: req.organizationId,
      memberId: actor.memberId ?? '',
      write: true,
    });
    return this.research.ask({
      threadId,
      organizationId: req.organizationId,
      dto,
      actor,
    });
  }
}
