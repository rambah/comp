import 'reflect-metadata';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../../../auth/permission.guard';
import { AttachmentFeedbackController } from './attachment-feedback.controller';
jest.mock('@db', () => ({ db: {} }));
jest.mock('../../../auth/auth.server', () => ({ auth: {} }));
jest.mock('@trycompai/auth', () => ({
  RESTRICTED_ROLES: ['employee'],
  PRIVILEGED_ROLES: ['admin', 'auditor'],
}));
jest.mock('../../../auth/app-access', () => ({
  permissionsGrant: jest.fn(),
  resolveRolePermissions: jest.fn(),
}));
jest.mock('../../../auth/hybrid-auth.guard', () => ({
  HybridAuthGuard: class {},
}));
const guard = new PermissionGuard(new Reflector());
function context({
  method,
  scopes,
}: {
  method: 'list' | 'create' | 'respond';
  scopes: string[];
}): ExecutionContext {
  return {
    getHandler: () => AttachmentFeedbackController.prototype[method],
    getClass: () => AttachmentFeedbackController,
    switchToHttp: () => ({
      getRequest: () => ({ isApiKey: true, apiKeyScopes: scopes }),
    }),
  } as unknown as ExecutionContext;
}
describe('Attachment feedback authorization', () => {
  it.each(['create', 'respond'] as const)(
    'denies %s to a read-only caller',
    async (method) => {
      await expect(
        guard.canActivate(
          context({ method, scopes: ['auditWorkspace:read', 'evidence:read'] }),
        ),
      ).rejects.toThrow(ForbiddenException);
    },
  );
  it.each(['create', 'respond'] as const)(
    'permits %s with auditor/admin workspace rights without evidence-write access',
    async (method) => {
      expect(
        await guard.canActivate(
          context({
            method,
            scopes: [
              'auditWorkspace:read',
              'auditWorkspace:update',
              'evidence:read',
            ],
          }),
        ),
      ).toBe(true);
    },
  );
  it('requires both workspace and evidence access to read feedback', async () => {
    expect(
      await guard.canActivate(
        context({
          method: 'list',
          scopes: ['auditWorkspace:read', 'evidence:read'],
        }),
      ),
    ).toBe(true);
    await expect(
      guard.canActivate(
        context({ method: 'list', scopes: ['auditWorkspace:read'] }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
