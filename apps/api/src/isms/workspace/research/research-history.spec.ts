import { db } from '@db';
import { researchCitation, researchPage } from './research-history';
import { sourceText } from './research.types';
jest.mock('@db', () => ({
  db: { auditResearchTurn: { findFirst: jest.fn(), findMany: jest.fn() } },
}));
const citation = {
  label: 'S1',
  kind: 'policy',
  sourceId: 'pol1',
  title: 'Access policy',
  version: 'Published v2',
  url: '/org/policies/pol1',
  excerpt: 'x'.repeat(12000),
  retrievedAt: new Date().toISOString(),
  offset: 0,
};
describe('retained research sources', () => {
  it('pages history and keeps polling payloads bounded', async () => {
    jest.mocked(db.auditResearchTurn.findMany).mockResolvedValue(
      Array.from({ length: 21 }, (_, i) => ({
        id: String(21 - i),
        citations: [citation],
      })) as never,
    );
    const page = await researchPage({
      threadId: 'thread',
      organizationId: 'org',
    });
    expect(page.turns).toHaveLength(20);
    expect(page.olderCursor).toBe('2');
    expect(page.turns[0].citations[0].excerpt).toHaveLength(600);
  });
  it('returns the exact captured excerpt on demand', async () => {
    jest
      .mocked(db.auditResearchTurn.findFirst)
      .mockResolvedValue({ citations: [citation] } as never);
    expect(
      await researchCitation({
        threadId: 'thread',
        organizationId: 'org',
        turnId: 'turn',
        label: 'S1',
      }),
    ).toEqual(citation);
    expect(db.auditResearchTurn.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'turn',
          threadId: 'thread',
          thread: {
            audit: {
              document: { organizationId: 'org', type: 'internal_audit' },
            },
          },
        },
      }),
    );
  });
  it('rejects invented citations and foreign cursors', async () => {
    jest.mocked(db.auditResearchTurn.findFirst).mockResolvedValue(null);
    await expect(
      researchCitation({
        threadId: 't',
        organizationId: 'org',
        turnId: 'x',
        label: 'S9',
      }),
    ).rejects.toThrow('not found');
    await expect(
      researchPage({ threadId: 't', organizationId: 'org', before: 'foreign' }),
    ).rejects.toThrow('cursor not found');
  });
  it('extracts readable evidence without storage paths', () => {
    expect(
      sourceText({
        content: [{ text: 'Published policy' }],
        isApplicable: false,
      }),
    ).toContain('Published policy');
    expect(
      sourceText({ id: 'private-id', pdfKey: 'bucket', isApplicable: false }),
    ).not.toMatch(/private-id|bucket/);
    expect(sourceText({ isApplicable: false })).toContain('false');
  });
});
