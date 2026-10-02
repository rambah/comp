import {
  ConflictException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { db } from '@db';
import { AttachmentFeedbackService } from './attachment-feedback.service';
import {
  CreateAttachmentFeedbackDto,
  ListAttachmentFeedbackDto,
  RespondAttachmentFeedbackDto,
} from './attachment-feedback.dto';

jest.mock('@db', () => {
  const db = {
    attachment: { findFirst: jest.fn(), findMany: jest.fn() },
    comment: { findFirst: jest.fn() },
    taskItem: { findFirst: jest.fn() },
    attachmentFeedback: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      findFirstOrThrow: jest.fn(),
    },
    attachmentFeedbackResponse: { create: jest.fn() },
    $transaction: jest.fn((arg: unknown) =>
      typeof arg === 'function'
        ? arg(db)
        : Promise.all(arg as Promise<unknown>[]),
    ),
  };
  return { db };
});
const mocks = jest.mocked(db);
const service = new AttachmentFeedbackService();
const actor = { memberId: 'auditor', name: 'Auditor' };
const now = new Date('2026-10-02T10:00:00Z');
const file = {
  id: 'att1',
  name: 'screen.png',
  entityId: 'task1',
  entityType: 'task',
  organizationId: 'org1',
};
const dto = { comment: 'The timestamp is missing.', attachmentId: file.id };
const response = {
  comment: 'Uploaded a dated screenshot to the source task.',
  status: 'resolved' as const,
  expectedUpdatedAt: now.toISOString(),
};
const args = { organizationId: 'org1', actor };
beforeEach(() => {
  jest.clearAllMocks();
  (mocks.attachment.findFirst as jest.Mock).mockResolvedValue(file);
  (mocks.attachmentFeedback.findFirst as jest.Mock).mockResolvedValue({
    id: 'afb1',
    updatedAt: now,
  });
  (mocks.attachmentFeedback.updateMany as jest.Mock).mockResolvedValue({
    count: 1,
  });
});
describe('Attachment feedback integrity', () => {
  it('checks attachment ownership before creating attributed feedback', async () => {
    await service.create({ ...args, dto });
    expect(mocks.attachment.findFirst).toHaveBeenCalledWith({
      where: { id: 'att1', organizationId: 'org1' },
    });
    expect(mocks.attachmentFeedback.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attachmentName: 'screen.png',
          authorName: 'Auditor',
          authorMemberId: 'auditor',
          comment: dto.comment,
          entityId: 'task1',
        }),
      }),
    );
  });
  it('rejects missing/cross-organization attachments without writing feedback', async () => {
    (mocks.attachment.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(service.create({ ...args, dto })).rejects.toThrow(
      NotFoundException,
    );
    expect(mocks.attachmentFeedback.create).not.toHaveBeenCalled();
  });
  it('retains the parent vendor for a manually created task-item attachment', async () => {
    (mocks.attachment.findFirst as jest.Mock).mockResolvedValue({
      ...file,
      entityType: 'task_item',
      entityId: 'item1',
    });
    (mocks.taskItem.findFirst as jest.Mock).mockResolvedValue({
      entityType: 'vendor',
      entityId: 'vendor1',
    });
    await service.create({ ...args, dto });
    expect(mocks.taskItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'item1', organizationId: 'org1' },
      }),
    );
    expect(mocks.attachmentFeedback.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: 'vendor',
          entityId: 'vendor1',
          attachmentId: 'att1',
        }),
      }),
    );
  });
  it('rejects a response to another organization', async () => {
    (mocks.attachmentFeedback.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      service.respond({ ...args, id: 'afb1', dto: response }),
    ).rejects.toThrow(NotFoundException);
    expect(mocks.attachmentFeedbackResponse.create).not.toHaveBeenCalled();
  });
  it('rejects concurrent/stale updates without appending a misleading response', async () => {
    (mocks.attachmentFeedback.updateMany as jest.Mock).mockResolvedValue({
      count: 0,
    });
    await expect(
      service.respond({ ...args, id: 'afb1', dto: response }),
    ).rejects.toThrow(ConflictException);
    expect(mocks.attachmentFeedbackResponse.create).not.toHaveBeenCalled();
  });
  it.each(['open', 'resolved'] as const)(
    'appends attributed %s response without replacing the original concern',
    async (status) => {
      await service.respond({
        ...args,
        id: 'afb1',
        dto: { ...response, status },
      });
      expect(mocks.attachmentFeedback.updateMany).toHaveBeenCalledWith({
        where: { id: 'afb1', organizationId: 'org1', updatedAt: now },
        data: { status, updatedAt: expect.any(Date) },
      });
      expect(mocks.attachmentFeedbackResponse.create).toHaveBeenCalledWith({
        data: {
          feedbackId: 'afb1',
          comment: response.comment,
          status,
          authorName: 'Auditor',
          authorMemberId: 'auditor',
        },
      });
    },
  );
  it('keeps feedback for removed files and paginates within the organization', async () => {
    (mocks.attachmentFeedback.findMany as jest.Mock).mockResolvedValue([
      { id: 'afb1', attachmentId: 'removed' },
    ]);
    (mocks.attachmentFeedback.count as jest.Mock).mockResolvedValue(52);
    (mocks.attachment.findMany as jest.Mock).mockResolvedValue([]);
    const result = await service.list({
      organizationId: 'org1',
      query: { offset: 50, status: 'open' },
    });
    expect(result).toEqual({
      data: [
        { id: 'afb1', attachmentId: 'removed', attachmentAvailable: false },
      ],
      count: 52,
      nextOffset: 51,
    });
    expect(mocks.attachmentFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'org1', status: 'open' },
        skip: 50,
        take: 50,
      }),
    );
  });
});
describe('Feedback input validation', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  it('trims comments and rejects whitespace-only flags and forged attribution', async () => {
    const metadata = {
      type: 'body' as const,
      metatype: CreateAttachmentFeedbackDto,
    };
    expect(
      await pipe.transform({ ...dto, comment: '  Needs a date  ' }, metadata),
    ).toMatchObject({ comment: 'Needs a date' });
    await expect(
      pipe.transform({ ...dto, comment: '   ' }, metadata),
    ).rejects.toThrow();
    await expect(
      pipe.transform({ ...dto, authorName: 'Somebody else' }, metadata),
    ).rejects.toThrow();
  });
  it('requires comments and a valid version for resolution; rejects invalid status', async () => {
    const metadata = {
      type: 'body' as const,
      metatype: RespondAttachmentFeedbackDto,
    };
    for (const invalid of [
      { ...response, comment: '' },
      { ...response, status: 'approved' },
      { ...response, expectedUpdatedAt: 'bad-date' },
    ]) {
      await expect(pipe.transform(invalid, metadata)).rejects.toThrow();
    }
  });
  it('rejects negative or non-numeric offsets', async () => {
    for (const offset of ['-1', 'oops'])
      await expect(
        pipe.transform(
          { offset },
          { type: 'query', metatype: ListAttachmentFeedbackDto },
        ),
      ).rejects.toThrow();
  });
});
