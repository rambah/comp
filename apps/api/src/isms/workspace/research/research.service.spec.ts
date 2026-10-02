import { AuditResearchService } from './research.service';
import { AuditResearchRunner } from './research-runner.service';
import { db } from '@db';
jest.mock('./research-runner.service', () => ({
  AuditResearchRunner: class {},
}));
jest.mock('@db', () => ({
  db: {
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
    ismsAudit: { findFirst: jest.fn() },
    auditResearchThread: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditResearchTurn: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));
const mock = jest.mocked(db);
const runner = { run: jest.fn().mockResolvedValue(undefined) };
const service = new AuditResearchService(
  runner as unknown as AuditResearchRunner,
);
const input = {
  threadId: 'thread',
  organizationId: 'org-a',
  actor: { memberId: 'member', name: 'Lead auditor' },
  dto: {
    requestId: '94d4ad08-6377-4209-b4ae-023747847895',
    prompt: 'Compare evidence',
  },
};
const oldKey = process.env.OPENAI_API_KEY;
describe('durable audit research', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-only';
    mock.$transaction.mockImplementation(async (fn: unknown) =>
      (fn as (tx: typeof db) => Promise<unknown>)(db),
    );
    mock.auditResearchThread.findFirst.mockResolvedValue({
      id: 'thread',
      audit: { scope: 'Scope', criteria: 'Criteria' },
    } as never);
    mock.auditResearchTurn.findUnique.mockResolvedValue(null);
    mock.auditResearchTurn.findMany.mockResolvedValue([]);
    mock.auditResearchTurn.count.mockResolvedValue(0);
    mock.auditResearchTurn.create.mockResolvedValue({
      id: 'turn',
      status: 'running',
    } as never);
  });
  afterAll(() => {
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = oldKey;
  });
  it('persists before starting work and uses the exact model', async () => {
    await expect(service.ask(input)).resolves.toMatchObject({
      runId: 'turn',
      status: 'running',
    });
    expect(mock.$executeRaw).toHaveBeenCalled();
    expect(mock.auditResearchTurn.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        prompt: input.dto.prompt,
        model: 'gpt-6.1-sol',
        authorMemberId: 'member',
      }),
    });
    expect(
      mock.auditResearchTurn.create.mock.invocationCallOrder[0],
    ).toBeLessThan(runner.run.mock.invocationCallOrder[0]);
  });
  it('deduplicates uncertain HTTP retries', async () => {
    mock.auditResearchTurn.findUnique.mockResolvedValue({
      ...input.dto,
      id: 'existing',
      authorMemberId: 'member',
      status: 'complete',
    } as never);
    await expect(service.ask(input)).resolves.toMatchObject({
      runId: 'existing',
    });
    expect(runner.run).not.toHaveBeenCalled();
    expect(mock.auditResearchTurn.create).not.toHaveBeenCalled();
  });
  it('rejects another author reusing a request ID', async () => {
    mock.auditResearchTurn.findUnique.mockResolvedValue({
      ...input.dto,
      authorMemberId: 'other',
    } as never);
    await expect(service.ask(input)).rejects.toThrow('another question');
  });
  it('scopes threads to the organization', async () => {
    mock.auditResearchThread.findFirst.mockResolvedValue(null);
    await expect(service.ask(input)).rejects.toThrow('not found');
    expect(mock.auditResearchThread.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'thread',
          audit: {
            document: { organizationId: 'org-a', type: 'internal_audit' },
          },
        },
      }),
    );
    expect(runner.run).not.toHaveBeenCalled();
  });
  it('rejects simultaneous questions in one topic', async () => {
    mock.auditResearchTurn.findMany.mockResolvedValue([
      { threadId: 'thread' },
    ] as never);
    await expect(service.ask(input)).rejects.toThrow('in progress');
  });
  it('bounds organization concurrency under a database lock', async () => {
    mock.auditResearchTurn.findMany.mockResolvedValue([
      { threadId: 'a' },
      { threadId: 'b' },
      { threadId: 'c' },
    ] as never);
    await expect(service.ask(input)).rejects.toThrow('Three research');
    expect(mock.$queryRaw).toHaveBeenCalled();
  });
  it('requires a new topic at the limit while retaining old history', async () => {
    mock.auditResearchTurn.count.mockResolvedValue(100);
    await expect(service.ask(input)).rejects.toThrow('remains saved');
  });
  it('marks expired work interrupted without losing partial text', async () => {
    await service.get({ threadId: 'thread', organizationId: 'org-a' });
    expect(mock.auditResearchTurn.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'running',
          expiresAt: { lt: expect.any(Date) },
        }),
        data: expect.objectContaining({ status: 'failed' }),
      }),
    );
  });
  it('never silently substitutes another model when not configured', async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(service.ask(input)).rejects.toThrow('not configured');
    expect(mock.auditResearchTurn.create).not.toHaveBeenCalled();
  });
});
