import { AttachmentFeedbackController } from './attachment-feedback/attachment-feedback.controller';
import { AttachmentFeedbackService } from './attachment-feedback/attachment-feedback.service';
import { AuditResearchController } from './research/research.controller';
import { AuditResearchService } from './research/research.service';
jest.mock('./research/research-runner.service', () => ({
  AuditResearchRunner: class {},
}));
import { AuditWorkspaceFinish } from './workspace-finish.service';
import 'reflect-metadata';
import { VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { AuditWorkspaceController } from './workspace.controller';
import { AuditLiveController } from './live.controller';
import { AuditWorkspaceService } from './workspace.service';
import { AuditWorkspaceRequestsService } from './workspace-requests.service';
import { AuditWorkspaceEvidenceService } from './workspace-evidence.service';
import { AuditWorkspaceCompletion } from './workspace-completion.service';
import { AuditLiveAccess } from './live-access.service';
import { IsmsAuditFindingService } from '../isms-audit-finding.service';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard, PERMISSIONS_KEY } from '../../auth/permission.guard';
import { SessionOnlyGuard } from '../../auth/session-only.guard';
import { applyPublicOpenApiMetadata } from '../../openapi/public-docs-metadata';
jest.mock('../../attachments/attachments.service', () => ({
  AttachmentsService: class AttachmentsService {},
}));
jest.mock('@db', () => ({ db: {} }));
jest.mock('../../auth/auth.server', () => ({ auth: {} }));
jest.mock('../../auth/app-access', () => ({
  permissionsGrant: jest.fn(),
  resolveRolePermissions: jest.fn(),
}));
jest.mock('../../auth/hybrid-auth.guard', () => ({
  HybridAuthGuard: class HybridAuthGuard {
    canActivate() {
      return true;
    }
  },
}));
jest.mock('../../auth/permission.guard', () => ({
  PERMISSIONS_KEY: 'required_permissions',
  PermissionGuard: class PermissionGuard {
    canActivate() {
      return true;
    }
  },
}));

describe('Audit workspace API contract', () => {
  it('documents all bodies, enforces permissions, and excludes browser sessions from agent tools', async () => {
    const module = await Test.createTestingModule({
      controllers: [
        AttachmentFeedbackController,
        AuditWorkspaceController,
        AuditLiveController,
        AuditResearchController,
      ],
      providers: [
        AttachmentFeedbackService,
        AuditResearchService,
        AuditWorkspaceService,
        AuditWorkspaceRequestsService,
        AuditWorkspaceEvidenceService,
        AuditWorkspaceCompletion,
        AuditWorkspaceFinish,
        AuditLiveAccess,
        IsmsAuditFindingService,
      ].map((provide) => ({ provide, useValue: {} })),
    })
      .overrideGuard(HybridAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SessionOnlyGuard)
      .useValue({ canActivate: () => true })
      .compile();
    const app = module.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    const spec = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Audit workspace').setVersion('1').build(),
    );
    for (const [path, operations] of Object.entries(spec.paths)) {
      expect(path).toMatch(/^\/v1\/audit-workspace/);
      for (const [method, op] of Object.entries(operations)) {
        if (!['get', 'post', 'patch'].includes(method)) continue;
        expect(op.description).toBeTruthy();
        expect(op.description.length).toBeLessThanOrEqual(240);
        if (method !== 'get')
          expect(
            op.requestBody.content['application/json'].schema.$ref,
          ).toBeTruthy();
      }
    }
    for (const controller of [
      AttachmentFeedbackController,
      AuditWorkspaceController,
      AuditLiveController,
      AuditResearchController,
    ]) {
      for (const method of Object.getOwnPropertyNames(
        controller.prototype,
      ).filter((k) => k !== 'constructor')) {
        const handler = Object.getOwnPropertyDescriptor(
          controller.prototype,
          method,
        )?.value;
        expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toBeTruthy();
      }
    }
    expect(
      spec.paths['/v1/audit-workspace/session/initialize'].post?.[
        'x-speakeasy-mcp'
      ],
    ).toEqual({ disabled: true });
    expect(
      spec.paths['/v1/audit-workspace/session/ticket'].post?.[
        'x-speakeasy-mcp'
      ],
    ).toEqual({ disabled: true });
    expect(spec.paths['/v1/audit-workspace/live/consent']).toBeUndefined();
    expect(spec.paths['/v1/audit-workspace/live/ticket']).toBeUndefined();
    expect(spec.components?.schemas?.AuditViewConsentDto).toEqual(
      expect.objectContaining({ required: ['allowed'] }),
    );
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        AuditWorkspaceController.prototype.finding,
      ),
    ).toEqual([
      { resource: 'auditWorkspace', actions: ['update'] },
      { resource: 'finding', actions: ['create'] },
    ]);
    if (process.env.AUDIT_WRITE_OPENAPI === '1') {
      const path = resolve(
        __dirname,
        '../../../../../packages/docs/openapi.json',
      );
      const existing = JSON.parse(readFileSync(path, 'utf8'));
      applyPublicOpenApiMetadata(spec);
      delete existing.paths['/v1/audit-workspace/live/consent'];
      delete existing.paths['/v1/audit-workspace/live/ticket'];
      Object.assign(existing.paths, spec.paths);
      Object.assign(existing.components.schemas, spec.components?.schemas);
      writeFileSync(path, JSON.stringify(existing, null, 2));
    }
    await app.close();
  });
});
