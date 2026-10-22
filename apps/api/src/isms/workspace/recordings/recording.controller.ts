import { Throttle } from '@nestjs/throttler';
import {
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiExtension, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { HybridAuthGuard } from '../../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../../auth/permission.guard';
import { RequirePermission } from '../../../auth/require-permission.decorator';
import { SessionOnlyGuard } from '../../../auth/session-only.guard';
import type { AuthenticatedRequest } from '../../../auth/types';
import { AuditRecordingService } from './recording.service';

@ApiTags('Audit recordings')
@ApiExtension('x-speakeasy-mcp', { disabled: true })
@Controller({ path: 'audit-recordings', version: '1' })
@UseGuards(HybridAuthGuard, SessionOnlyGuard, PermissionGuard)
export class AuditRecordingController {
  constructor(private readonly recordings: AuditRecordingService) {}

  @Get()
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: 'Cursor returned by the previous page.',
  })
  @Header('Cache-Control', 'no-store')
  @RequirePermission('auditRecording', 'read')
  @ApiOperation({
    summary: 'List private auditor recordings',
    description:
      'List a page of up to 100 unexpired session recordings in your organization. Administrator browser session required. Recordings expire after 30 days.',
  })
  async list(
    @Req() request: AuthenticatedRequest,
    @Query('cursor') cursor?: string,
  ) {
    return this.recordings.list({ request, cursor });
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @RequirePermission('auditRecording', 'read')
  @ApiOperation({
    summary: 'Read a private recording manifest',
    description:
      'Get metadata, expiry and ordered chunk indices for a private recording in your organization. An administrator browser session is required for playback.',
  })
  detail(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.recordings.detail({ request, id });
  }

  @Get(':id/chunks/:index')
  @Throttle({ default: { limit: 600, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  @RequirePermission('auditRecording', 'read')
  @ApiOperation({
    summary: 'Read a private recording chunk',
    description:
      'Load a bounded chunk for read-only playback. Organization access and expiry are checked on every request. Administrator browser session required.',
  })
  async chunk(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('index', ParseIntPipe) index: number,
  ) {
    return { packets: await this.recordings.chunk({ request, id, index }) };
  }

  @Delete(':id')
  @RequirePermission('auditRecording', 'delete')
  @ApiOperation({
    summary: 'Delete a private auditor recording',
    description:
      'Remove access to a recording and delete its stored chunks. Only administrators in the owning organization may delete recordings.',
  })
  remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.recordings.remove({ request, id });
  }
}
