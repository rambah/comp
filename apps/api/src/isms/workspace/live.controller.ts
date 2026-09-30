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
@Controller({ path: 'audit-workspace/live', version: '1' })
@UseGuards(HybridAuthGuard, SessionOnlyGuard, PermissionGuard)
export class AuditLiveController {
  constructor(private readonly live: AuditLiveAccess) {}

  @Post('consent')
  @RequirePermission('auditWorkspace', 'read')
  @ApiExtension('x-speakeasy-mcp', { disabled: true })
  @ApiOperation({
    summary: 'Choose audit view sharing',
    description:
      'Record your own explicit yes or no for this workspace visit. No immediately revokes previous sharing. Requires the person’s own browser session.',
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
    summary: 'Connect a live audit view',
    description:
      'Issue a single-use 20-second WebSocket ticket. Publishing requires your current consent; observing requires auditWorkspace:observe. Requires a browser session.',
  })
  @ApiBody({ type: AuditLiveTicketDto })
  ticket(
    @Req() request: AuthenticatedRequest,
    @Body() dto: AuditLiveTicketDto,
  ) {
    return this.live.ticket({ request, dto });
  }
}
