import { ForbiddenException, Injectable } from '@nestjs/common';
import { db } from '@db';
import { randomUUID } from 'crypto';
import type { AuthenticatedRequest } from '../../auth/types';
import {
  permissionsGrant,
  resolveRolePermissions,
} from '../../auth/app-access';
import { LIVE_NOTICE_VERSION, type LiveIdentity } from './live.schema';
import { AuditLiveBus } from './live-bus.service';
import type { AuditLiveTicketDto } from './live.dto';

@Injectable()
export class AuditLiveAccess {
  constructor(private readonly bus: AuditLiveBus) {}

  private async member(request: AuthenticatedRequest) {
    if (
      request.authType !== 'session' ||
      !request.userId ||
      !request.sessionId ||
      request.impersonatedBy ||
      request.isMcpOAuth
    ) {
      throw new ForbiddenException(
        'Live sharing requires your own browser session.',
      );
    }
    const member = await db.member.findFirst({
      where: {
        organizationId: request.organizationId,
        userId: request.userId,
        isActive: true,
        deactivated: false,
      },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!member) throw new ForbiddenException();
    return member;
  }

  async consent({
    request,
    allowed,
  }: {
    request: AuthenticatedRequest;
    allowed: boolean;
  }) {
    const member = await this.member(request);
    const nonce = randomUUID();
    const previous = await db.auditViewConsent.findUnique({
      where: { memberId: member.id },
    });
    await db.auditViewConsent.upsert({
      where: { memberId: member.id },
      create: {
        memberId: member.id,
        allowed,
        noticeVersion: LIVE_NOTICE_VERSION,
        sessionNonce: nonce,
      },
      update: {
        allowed,
        noticeVersion: LIVE_NOTICE_VERSION,
        sessionNonce: nonce,
      },
    });
    if (previous) {
      // Revocation is effective in the database even if the live transport is down.
      await this.bus
        .publish({
          kind: 'stop',
          revoked: true,
          organizationId: request.organizationId,
          memberId: member.id,
          name: member.user.name,
          nonce: previous.sessionNonce,
          sentAt: Date.now(),
        })
        .catch(() => undefined);
    }
    return { allowed, nonce, noticeVersion: LIVE_NOTICE_VERSION };
  }

  async ticket({
    request,
    dto,
  }: {
    request: AuthenticatedRequest;
    dto: AuditLiveTicketDto;
  }) {
    const member = await this.member(request);
    const identity: LiveIdentity = {
      organizationId: request.organizationId,
      memberId: member.id,
      sessionId: request.sessionId!,
      name: member.user.name || member.user.email,
      mode: dto.mode,
      nonce: dto.nonce ?? '',
    };
    if (!(await this.valid(identity)))
      throw new ForbiddenException('Live access is no longer authorized.');
    return this.bus.ticket(identity);
  }

  async valid(identity: LiveIdentity) {
    const [member, session] = await Promise.all([
      db.member.findFirst({
        where: {
          id: identity.memberId,
          organizationId: identity.organizationId,
          isActive: true,
          deactivated: false,
        },
        include: { auditViewConsent: true },
      }),
      db.session.findFirst({
        where: { id: identity.sessionId, expiresAt: { gt: new Date() } },
        select: { userId: true },
      }),
    ]);
    if (!member || !session || member.userId !== session.userId) return false;
    const permissions = await resolveRolePermissions(
      identity.organizationId,
      member.role.split(',').map((r) => r.trim()),
    );
    if (
      !permissionsGrant(permissions, 'auditWorkspace', 'read') ||
      !permissionsGrant(permissions, 'evidence', 'read') ||
      !permissionsGrant(permissions, 'policy', 'read')
    )
      return false;
    if (identity.mode === 'observe')
      return permissionsGrant(permissions, 'auditWorkspace', 'observe');
    const consent = member.auditViewConsent;
    return (
      !!consent?.allowed &&
      consent.noticeVersion === LIVE_NOTICE_VERSION &&
      consent.sessionNonce === identity.nonce
    );
  }
}
