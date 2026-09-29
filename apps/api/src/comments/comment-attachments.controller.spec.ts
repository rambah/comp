jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));
jest.mock('@trycompai/auth', () => ({
  statement: {},
  BUILT_IN_ROLE_PERMISSIONS: {},
}));
jest.mock('@db', () => ({ ...jest.requireActual('@prisma/client'), db: {} }));
jest.mock('./comment-attachments.service', () => ({
  CommentAttachmentsService: class {},
}));
import request from 'supertest';
import { VersioningType, type ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard, PERMISSIONS_KEY } from '../auth/permission.guard';
import type { AuthContext } from '../auth/types';
import { applyPublicOpenApiMetadata } from '../openapi/public-docs-metadata';
import { CommentAttachmentsController } from './comment-attachments.controller';
import { CommentAttachmentsService } from './comment-attachments.service';

const auth: AuthContext = {
  organizationId: 'org_one',
  authType: 'session',
  isApiKey: false,
  isPlatformAdmin: false,
  userId: 'usr_session',
  userEmail: 'user@example.com',
  userRoles: ['admin'],
};
const upload = {
  fileName: 'audit.md',
  fileType: 'text/markdown',
  s3Key: 'org_one/uploads/attachment/audit.md',
  userId: 'usr_spoofed',
};
describe('Comment attachment endpoint contract', () => {
  const addAttachment = jest.fn();
  const buildModule = () =>
    Test.createTestingModule({
      controllers: [CommentAttachmentsController],
      providers: [
        { provide: CommentAttachmentsService, useValue: { addAttachment } },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();
  beforeEach(() => jest.clearAllMocks());
  it('uses the session actor and authenticated organization, ignoring a body actor', async () => {
    const module = await buildModule();
    await module
      .get(CommentAttachmentsController)
      .addAttachment(auth, 'cmt_1', upload);
    expect(addAttachment).toHaveBeenCalledWith({
      organizationId: 'org_one',
      commentId: 'cmt_1',
      userId: 'usr_session',
      upload,
    });
    await module.close();
  });
  it('requires update permission independently of the attributed actor', () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        CommentAttachmentsController.prototype.addAttachment,
      ),
    ).toEqual([{ resource: 'task', actions: ['update'] }]);
  });
  it.each([
    ['task:read', 403],
    ['task:update', 201],
  ])(
    'enforces the credential scope %s through the real guard',
    async (scope, status) => {
      const module = await Test.createTestingModule({
        controllers: [CommentAttachmentsController],
        providers: [
          { provide: CommentAttachmentsService, useValue: { addAttachment } },
        ],
      })
        .overrideGuard(HybridAuthGuard)
        .useValue({
          canActivate: (context: ExecutionContext) => {
            Object.assign(context.switchToHttp().getRequest(), {
              ...auth,
              isApiKey: true,
              apiKeyScopes: [scope],
            });
            return true;
          },
        })
        .compile();
      const app = module.createNestApplication();
      app.enableVersioning({ type: VersioningType.URI });
      await app.init();
      await request(app.getHttpServer())
        .post('/v1/comments/cmt_1/attachments')
        .send(upload)
        .expect(status);
      expect(addAttachment).toHaveBeenCalledTimes(status === 201 ? 1 : 0);
      await app.close();
    },
  );
  it('generates a usable upload request and response schema for docs and MCP', async () => {
    const module = await buildModule();
    const app = module.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .addApiKey(
          { type: 'apiKey', name: 'X-API-Key', in: 'header' },
          'apikey',
        )
        .build(),
    );
    applyPublicOpenApiMetadata(document);
    const operation =
      document.paths['/v1/comments/{commentId}/attachments'].post!;
    expect(operation.requestBody).toMatchObject({
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/UploadAttachmentDto' },
        },
      },
    });
    expect(document.components?.schemas?.UploadAttachmentDto).toMatchObject({
      properties: {
        fileData: expect.any(Object),
        s3Key: expect.any(Object),
        fileName: expect.any(Object),
      },
    });
    expect(operation.responses['201']).toMatchObject({
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/AttachmentResponseDto' },
        },
      },
    });
    if (process.env.COMMENT_OPENAPI_OUTPUT)
      writeFileSync(
        process.env.COMMENT_OPENAPI_OUTPUT,
        JSON.stringify(document, null, 2),
      );
    await app.close();
  });
});
