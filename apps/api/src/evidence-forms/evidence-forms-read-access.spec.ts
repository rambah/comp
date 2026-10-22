import 'reflect-metadata';
import { db } from '@db';
import type { AuthContext } from '@/auth/types';
import { EvidenceFormsService } from './evidence-forms.service';
import { EvidenceFormsController } from './evidence-forms.controller';
import { auth } from '../auth/auth.server';
import { PermissionGuard } from '../auth/permission.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { AttachmentsService } from '@/attachments/attachments.service';
import type { TimelinesService } from '../timelines/timelines.service';
import type { EvidenceFormsNotifierService } from './evidence-forms-notifier.service';

jest.mock('@/attachments/attachments.service', () => ({
  AttachmentsService: class {},
}));
jest.mock('../frameworks/frameworks-timeline.helper', () => ({
  checkAutoCompletePhases: jest.fn(),
}));
jest.mock('../timelines/timelines.service', () => ({
  TimelinesService: class {},
}));
jest.mock('../auth/auth.server', () => ({
  auth: { api: { hasPermission: jest.fn() } },
}));
jest.mock('../auth/hybrid-auth.guard', () => ({ HybridAuthGuard: class {} }));
jest.mock('../auth/app-access', () => ({
  resolveRolePermissions: jest.fn(),
  permissionsGrant: jest.fn(),
}));
jest.mock('@trycompai/auth', () => ({
  RESTRICTED_ROLES: ['employee'],
  PRIVILEGED_ROLES: ['admin', 'auditor'],
}));
jest.mock('@db', () => ({
  EvidenceFormType: { board_meeting: 'board_meeting' },
  db: {
    evidenceSubmission: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  },
}));
const authContext: AuthContext = {
  organizationId: 'org1',
  authType: 'session',
  isApiKey: false,
  isPlatformAdmin: false,
  userId: 'auditor1',
  userRoles: ['Audit-review'],
};
const submission = {
  id: 'sub1',
  formType: 'board_meeting',
  data: { meetingMinutes: 'Reviewed ISMS objectives' },
  submittedAt: new Date(),
  submittedBy: { name: 'Owner', email: 'owner@example.com' },
};
const service = new EvidenceFormsService(
  {} as AttachmentsService,
  {} as TimelinesService,
  {} as EvidenceFormsNotifierService,
);
const guard = new PermissionGuard(new Reflector());
function context({
  method,
  scopes,
}: {
  method:
    | 'getFormWithSubmissions'
    | 'getSubmission'
    | 'exportCsv'
    | 'reviewSubmission';
  scopes: string[];
}): ExecutionContext {
  (auth.api.hasPermission as jest.Mock).mockImplementation(async ({ body }) => ({
    success: Object.entries(body.permissions as Record<string, string[]>).every(
      ([resource, actions]) => actions.every((action) => scopes.includes(`${resource}:${action}`)),
    ),
  }));
  return {
    getHandler: () => EvidenceFormsController.prototype[method],
    getClass: () => EvidenceFormsController,
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { cookie: 'session=test' },
        organizationId: 'org1',
        userRoles: ['Audit-review'],
      }),
    }),
  } as unknown as ExecutionContext;
}
beforeEach(() => {
  jest.clearAllMocks();
  (db.evidenceSubmission.findMany as jest.Mock).mockResolvedValue([submission]);
  (db.evidenceSubmission.findFirst as jest.Mock).mockResolvedValue(submission);
});
describe('Meeting minutes read permission', () => {
  it.each(['Audit-review', 'auditor', 'admin'])(
    'allows %s to list, open and export when the read guard authorized the request',
    async (role) => {
      const args = {
        organizationId: 'org1',
        authContext: { ...authContext, userRoles: [role] },
        formType: 'board-meeting',
      };
      expect(
        (await service.getFormWithSubmissions(args)).submissions,
      ).toHaveLength(1);
      expect(
        (await service.getSubmission({ ...args, submissionId: 'sub1' }))
          .submission.id,
      ).toBe('sub1');
      expect(await service.exportCsv(args)).toContain(
        'Reviewed ISMS objectives',
      );
      expect(db.evidenceSubmission.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'sub1',
            organizationId: 'org1',
            formType: 'board_meeting',
          },
        }),
      );
      expect(db.evidenceSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org1', formType: 'board_meeting' },
        }),
      );
    },
  );
  it.each(['getFormWithSubmissions', 'getSubmission', 'exportCsv'] as const)(
    'keeps evidence:read enforced for %s',
    async (method) => {
      expect(
        await guard.canActivate(context({ method, scopes: ['evidence:read'] })),
      ).toBe(true);
      await expect(
        guard.canActivate(context({ method, scopes: ['auditWorkspace:read'] })),
      ).rejects.toThrow(ForbiddenException);
    },
  );
  it('does not let a read-only auditor approve evidence or delete submissions', async () => {
    await expect(
      guard.canActivate(
        context({ method: 'reviewSubmission', scopes: ['evidence:read'] }),
      ),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.deleteSubmission({
        organizationId: 'org1',
        authContext,
        formType: 'board-meeting',
        submissionId: 'sub1',
      }),
    ).rejects.toThrow();
    expect(db.evidenceSubmission.delete).not.toHaveBeenCalled();
  });
});
