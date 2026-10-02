import { db, type AuditResearchTurn } from '@db';
import { streamText } from 'ai';
import {
  AuditResearchRunner,
  researchHistory,
} from './research-runner.service';
import { AuditResearchFiles } from './research-files.service';
import { requireResearchMember } from './research-access';
jest.mock('@db', () => ({
  db: { auditResearchTurn: { findMany: jest.fn(), updateMany: jest.fn() } },
}));
jest.mock('ai', () => ({ streamText: jest.fn(), stepCountIs: jest.fn() }));
jest.mock('@ai-sdk/openai', () => ({
  openai: { responses: jest.fn((id) => ({ modelId: id })) },
}));
jest.mock('./research-files.service', () => ({ AuditResearchFiles: class {} }));
jest.mock('./research-tools', () => ({
  createResearchTools: jest.fn(() => ({})),
}));
jest.mock('./research-access', () => ({ requireResearchMember: jest.fn() }));
const turn: AuditResearchTurn = {
  id: 'turn',
  threadId: 'thread',
  requestId: 'req',
  prompt: 'Find evidence',
  answer: '',
  authorName: 'Lead auditor',
  authorMemberId: 'member',
  model: 'gpt-6.1-sol',
  status: 'running',
  progress: '',
  citations: [],
  createdAt: new Date(),
  expiresAt: new Date(),
  completedAt: null,
};
const runner = new AuditResearchRunner({} as AuditResearchFiles);
describe('audit research generation and recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(db.auditResearchTurn.findMany).mockResolvedValue([]);
    jest.mocked(requireResearchMember).mockResolvedValue(undefined);
  });
  function model(
    events: { type: string; text?: string }[],
    finishReason = 'stop',
  ) {
    jest.mocked(streamText).mockReturnValue({
      fullStream: (async function* () {
        for (const event of events) yield event;
      })(),
      finishReason: Promise.resolve(finishReason),
    } as unknown as ReturnType<typeof streamText>);
  }
  it('streams to durable storage without requiring a connected HTTP client', async () => {
    model([{ type: 'text-delta', text: 'Supported answer.' }]);
    await runner.run({ turn, organizationId: 'org', scope: 'Internal audit' });
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: { modelId: 'gpt-6.1-sol' },
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: 'medium',
            store: false,
          },
        },
      }),
    );
    expect(db.auditResearchTurn.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'complete',
          answer: 'Supported answer.',
        }),
      }),
    );
  });
  it.each(['abort', 'error'])(
    'retains partial output on %s without marking it complete',
    async (type) => {
      model([{ type: 'text-delta', text: 'Partial answer' }, { type }]);
      await runner.run({ turn, organizationId: 'org', scope: 'Scope' });
      expect(db.auditResearchTurn.updateMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'failed',
            answer: 'Partial answer',
          }),
        }),
      );
    },
  );
  it('marks token-truncated answers incomplete', async () => {
    model([{ type: 'text-delta', text: 'Incomplete' }], 'length');
    await runner.run({ turn, organizationId: 'org', scope: 'Scope' });
    expect(db.auditResearchTurn.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'failed' }),
      }),
    );
  });
  it('does not call the model after access is revoked', async () => {
    jest.mocked(requireResearchMember).mockRejectedValue(new Error('Revoked'));
    await runner.run({ turn, organizationId: 'org', scope: 'Scope' });
    expect(streamText).not.toHaveBeenCalled();
  });
  it('uses a bounded recent context while leaving stored history unchanged', () => {
    const turns = Array.from({ length: 40 }, (_, i) => ({
      ...turn,
      prompt: `Q${i}`,
      answer: 'a'.repeat(12000),
      status: 'complete',
    }));
    const history = researchHistory(turns);
    expect(history.length).toBeLessThan(10);
    expect(history.at(-2)).toEqual({ role: 'user', content: 'Q39' });
    expect(turns).toHaveLength(40);
  });
});
