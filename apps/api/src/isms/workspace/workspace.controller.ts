import { ForbiddenException } from '@nestjs/common';
import { ApiExtension } from '@nestjs/swagger';
import { SessionOnlyGuard } from '../../auth/session-only.guard';
import { AuditWorkspaceFinish } from './workspace-finish.service';
import { AuditFinishDto } from './workspace-completion.dto';
import { AuditWorkspaceCompletion } from './workspace-completion.service';
import {
  AuditConclusionDto,
  AuditFindingFollowupDto,
} from './workspace-completion.dto';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { OrganizationId } from '../../auth/auth-context.decorator';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import {
  RequirePermission,
  RequirePermissions,
} from '../../auth/require-permission.decorator';
import type { AuthenticatedRequest } from '../../auth/types';
import { IsmsAuditFindingService } from '../isms-audit-finding.service';
import { requireCheck, workspaceActor } from './workspace-access';
import { AuditWorkspaceService } from './workspace.service';
import { AuditWorkspaceRequestsService } from './workspace-requests.service';
import { AuditWorkspaceEvidenceService } from './workspace-evidence.service';
import {
  AuditReviewDto,
  AuditRequestDto,
  AuditResponseDto,
  AuditSourceDto,
  WorkspaceFindingDto,
} from './workspace.dto';

@ApiTags('Audit Workspace')
@ApiSecurity('apikey')
@Controller({ path: 'audit-workspace', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
export class AuditWorkspaceController {
  constructor(
    private readonly workspace: AuditWorkspaceService,
    private readonly requests: AuditWorkspaceRequestsService,
    private readonly evidence: AuditWorkspaceEvidenceService,
    private readonly findings: IsmsAuditFindingService,
    private readonly completion: AuditWorkspaceCompletion,
    private readonly finishService: AuditWorkspaceFinish,
  ) {}

  @Get()
  @RequirePermissions([
    { resource: 'auditWorkspace', actions: ['read'] },
    { resource: 'evidence', actions: ['read'] },
    { resource: 'policy', actions: ['read'] },
  ])
  @ApiOperation({
    summary: 'Open the audit workspace',
    description:
      'List existing internal audits, checks, evidence snapshots, requests and findings for the current organization.',
  })
  list(@OrganizationId() organizationId: string) {
    return this.workspace.list(organizationId);
  }

  @Get('sources')
  @RequirePermissions([
    { resource: 'auditWorkspace', actions: ['read'] },
    { resource: 'evidence', actions: ['read'] },
    { resource: 'policy', actions: ['read'] },
  ])
  @ApiOperation({
    summary: 'Find audit evidence',
    description:
      'Search published policies, ISMS documents and existing evidence files to link to an audit check. Returns at most 50 sources per category.',
  })
  sources(
    @OrganizationId() organizationId: string,
    @Query('search') search?: string,
  ) {
    return this.evidence.search({ organizationId, search });
  }

  @Patch('checks/:id/review')
  @RequirePermission('auditWorkspace', 'update')
  @ApiOperation({
    summary: 'Save an audit review',
    description:
      'Save review notes or complete a check with a conclusion. Uses optimistic conflict detection and requires outstanding requests to be reviewed.',
  })
  @ApiBody({ type: AuditReviewDto })
  async review(
    @Param('id') controlId: string,
    @Body() dto: AuditReviewDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.workspace.review({
      controlId,
      dto,
      organizationId: req.organizationId,
      actor: await workspaceActor(req),
    });
  }

  @Post('checks/:id/requests')
  @RequirePermission('auditWorkspace', 'update')
  @ApiOperation({
    summary: 'Request audit evidence',
    description:
      'Ask a specific audit question, assign an eligible response coordinator and set a due date. Reopens the linked check for review.',
  })
  @ApiBody({ type: AuditRequestDto })
  async createRequest(
    @Param('id') controlId: string,
    @Body() dto: AuditRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.requests.create({
      controlId,
      dto,
      organizationId: req.organizationId,
      actor: await workspaceActor(req),
    });
  }

  @Post('requests/:id/responses')
  @RequirePermission('auditWorkspace', 'update')
  @ApiOperation({
    summary: 'Respond to an audit request',
    description:
      'Append an attributed response and submit it, request changes, accept it or reopen the request. Prior responses are retained.',
  })
  @ApiBody({ type: AuditResponseDto })
  async respond(
    @Param('id') requestId: string,
    @Body() dto: AuditResponseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.requests.respond({
      requestId,
      dto,
      organizationId: req.organizationId,
      actor: await workspaceActor(req),
    });
  }

  @Post('checks/:id/evidence')
  @RequirePermissions([
    { resource: 'auditWorkspace', actions: ['update'] },
    { resource: 'evidence', actions: ['read'] },
    { resource: 'policy', actions: ['read'] },
  ])
  @ApiOperation({
    summary: 'Link evidence to an audit check',
    description:
      'Capture a published document version or link an existing evidence file. Source documents remain unchanged and the check returns to review.',
  })
  @ApiBody({ type: AuditSourceDto })
  async link(
    @Param('id') controlId: string,
    @Body() dto: AuditSourceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.evidence.link({
      controlId,
      dto,
      organizationId: req.organizationId,
      actor: await workspaceActor(req),
    });
  }

  @Post('checks/:id/findings')
  @RequirePermissions([
    { resource: 'auditWorkspace', actions: ['update'] },
    { resource: 'finding', actions: ['create'] },
  ])
  @ApiOperation({
    summary: 'Record an internal audit finding',
    description:
      'Create a finding in the existing internal audit register, linked to the tested check, with a follow-up owner and optional due date.',
  })
  @ApiBody({ type: WorkspaceFindingDto })
  async finding(
    @Param('id') controlId: string,
    @Body() dto: WorkspaceFindingDto,
    @OrganizationId() organizationId: string,
  ) {
    const check = await requireCheck({ id: controlId, organizationId });
    return this.findings.create({
      documentId: check.documentId,
      organizationId,
      dto: {
        ...dto,
        auditId: check.auditId,
        controlId,
        clauseOrControl: check.controlRef,
      },
    });
  }

  @Patch('findings/:id')
  @RequirePermission('auditWorkspace', 'update')
  @ApiOperation({
    summary: 'Update audit finding follow-up',
    description:
      'Record follow-up actions and close or reopen a finding. Closure requires evidence; concurrent changes are rejected.',
  })
  @ApiBody({ type: AuditFindingFollowupDto })
  followup(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @Body() dto: AuditFindingFollowupDto,
  ) {
    return this.completion.followup({ id, organizationId, dto });
  }

  @Patch('audits/:id/conclusion')
  @RequirePermission('auditWorkspace', 'update')
  @ApiOperation({
    summary: 'Draft the audit conclusion',
    description:
      'Save the auditor’s overall conclusion in the existing register. Does not sign, approve or publish the audit report.',
  })
  @ApiBody({ type: AuditConclusionDto })
  conclusion(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @Body() dto: AuditConclusionDto,
  ) {
    return this.completion.conclusion({ id, organizationId, dto });
  }

  @Get('evidence/:id/preview')
  @RequirePermissions([
    { resource: 'auditWorkspace', actions: ['read'] },
    { resource: 'evidence', actions: ['read'] },
    { resource: 'policy', actions: ['read'] },
  ])
  @ApiOperation({
    summary: 'Preview captured audit evidence',
    description:
      'Get short-lived preview and download links for the exact published PDF version attached to a check. Never substitutes a newer version.',
  })
  preview(@Param('id') id: string, @OrganizationId() organizationId: string) {
    return this.evidence.preview({ id, organizationId });
  }

  @Post('audits/:id/finish')
  @UseGuards(SessionOnlyGuard)
  @RequirePermission('auditWorkspace', 'update')
  @ApiExtension('x-speakeasy-mcp', { disabled: true })
  @ApiOperation({
    summary: 'Complete your internal audit',
    description:
      'Confirm completed sampling and the saved conclusion under your own name. Blocks unfinished checks and requests. Does not publish or approve the document for management.',
  })
  @ApiBody({ type: AuditFinishDto })
  async finish(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: AuditFinishDto,
  ) {
    if (request.impersonatedBy || request.isMcpOAuth)
      throw new ForbiddenException(
        'Use your own browser session to complete the audit.',
      );
    return this.finishService.finish({
      id,
      organizationId: request.organizationId,
      expectedUpdatedAt: dto.expectedUpdatedAt,
      actor: await workspaceActor(request),
    });
  }
}
