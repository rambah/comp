jest.mock('@db', () => ({
  db: { comment: { findFirst: jest.fn() } },
  AttachmentEntityType: { comment: 'comment' },
}));
jest.mock('../attachments/attachments.service', () => ({
  AttachmentsService: class {},
}));
import { db } from '@db';
import { Test } from '@nestjs/testing';
import { AttachmentsService } from '../attachments/attachments.service';
import { CommentAttachmentsService } from './comment-attachments.service';

describe('Append comment attachments', () => {
  const uploadAttachment = jest.fn();
  let service: CommentAttachmentsService;
  const input = {
    organizationId: 'org_one',
    commentId: 'cmt_one',
    userId: 'usr_author',
    upload: {
      fileName: 'audit.md',
      fileType: 'text/markdown',
      fileData: 'IyBBdWRpdA==',
    },
  };
  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CommentAttachmentsService,
        { provide: AttachmentsService, useValue: { uploadAttachment } },
      ],
    }).compile();
    service = module.get(CommentAttachmentsService);
    (db.comment.findFirst as jest.Mock).mockResolvedValue({
      author: { userId: 'usr_author', deactivated: false },
    });
    uploadAttachment.mockResolvedValue({ id: 'att_new' });
  });
  it('appends to the authenticated organization and comment after checking ownership', async () => {
    await expect(service.addAttachment(input)).resolves.toEqual({
      id: 'att_new',
    });
    expect(db.comment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cmt_one', organizationId: 'org_one' },
      }),
    );
    expect(uploadAttachment).toHaveBeenCalledWith(
      'org_one',
      'cmt_one',
      'comment',
      input.upload,
      'usr_author',
    );
  });
  it.each([
    null,
    { author: { userId: 'usr_other', deactivated: false } },
    { author: { userId: 'usr_author', deactivated: true } },
  ])(
    'denies missing, foreign or deactivated authors before uploading',
    async (comment) => {
      (db.comment.findFirst as jest.Mock).mockResolvedValue(comment);
      await expect(service.addAttachment(input)).rejects.toThrow();
      expect(uploadAttachment).not.toHaveBeenCalled();
    },
  );
  it('rejects a missing actor before reading the database', async () => {
    await expect(
      service.addAttachment({ ...input, userId: undefined }),
    ).rejects.toThrow('User ID is required');
    expect(db.comment.findFirst).not.toHaveBeenCalled();
  });
  it('supports presigned uploads using the same organization-scoped storage validation', async () => {
    const upload = {
      fileName: 'audit.md',
      fileType: 'text/markdown',
      s3Key: 'org_one/uploads/attachment/audit.md',
    };
    await service.addAttachment({ ...input, upload });
    expect(uploadAttachment).toHaveBeenCalledWith(
      'org_one',
      'cmt_one',
      'comment',
      upload,
      'usr_author',
    );
  });
});
