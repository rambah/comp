import { SkipAuditLog } from '../../audit/skip-audit-log.decorator';
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiExtension, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';
import { SessionOnlyGuard } from '../../auth/session-only.guard';
import type { AuthenticatedRequest } from '../../auth/types';
import { AuditLiveAccess } from './live-access.service';
import { AuditLiveTicketDto, AuditViewConsentDto } from './live.dto';

@ApiTags('Audit workspace')
@Controller({ path: 'audit-workspace/session', version: '1' })
@UseGuards(HybridAuthGuard, SessionOnlyGuard, PermissionGuard)
export class AuditLiveController {
  constructor(private readonly live: AuditLiveAccess) {}

  @Post('initialize')
  @RequirePermission('auditWorkspace', 'read')
  @ApiExtension('x-speakeasy-mcp', { disabled: true })
  @ApiOperation({
    summary: 'Initialize an audit workspace session',
    description:
      'Initialize live workspace reconstruction for this visit, or revoke it. Includes dialogs and unsaved inputs. Requires your own browser session.',
  })
  @ApiBody({ type: AuditViewConsentDto })
  consent(
    @Req() request: AuthenticatedRequest,
    @Body() dto: AuditViewConsentDto,
  ) {
    return this.live.consent({ request, allowed: dto.allowed });
  }

  @Post('ticket')
  @SkipAuditLog()
  @RequirePermission('auditWorkspace', 'read')
  @ApiExtension('x-speakeasy-mcp', { disabled: true })
  @ApiOperation({
    summary: 'Connect an audit workspace session',
    description:
      'Issue a single-use 20-second WebSocket ticket for your browser session. Publish with a session nonce; observe with auditWorkspace:observe permission.',
  })
  @ApiBody({ type: AuditLiveTicketDto })
  ticket(
    @Req() request: AuthenticatedRequest,
    @Body() dto: AuditLiveTicketDto,
  ) {
    return this.live.ticket({ request, dto });
  }
}
