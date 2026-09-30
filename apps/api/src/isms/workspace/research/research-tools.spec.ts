import { createResearchTools } from './research-tools';
import { readResearchRecord } from './research-records';
import { searchResearchSources } from './research-search';
import { AuditResearchFiles } from './research-files.service';
import type { ResearchCitation } from './research.types';
jest.mock('ai', () => ({ tool: (definition: unknown) => definition }));
jest.mock('./research-records', () => ({ readResearchRecord: jest.fn() }));
jest.mock('./research-search', () => ({ searchResearchSources: jest.fn() }));
jest.mock('./research-semantic', () => ({ searchSemanticSources: jest.fn() }));
jest.mock('./research-files.service', () => ({ AuditResearchFiles: class {} }));
const options = { toolCallId: 'call', messages: [] };
describe('read-only research tools', () => {
  const citations: ResearchCitation[] = [];
  const checkAccess = jest.fn().mockResolvedValue(undefined);
  const readFile = jest.fn().mockResolvedValue(null);
  const tools = () =>
    createResearchTools({
      organizationId: 'org-a',
      files: { read: readFile } as unknown as AuditResearchFiles,
      signal: new AbortController().signal,
      citations,
      checkAccess,
      onProgress: jest.fn().mockResolvedValue(undefined),
    });
  beforeEach(() => {
    jest.clearAllMocks();
    citations.length = 0;
    checkAccess.mockResolvedValue(undefined);
  });
  it('reads current tenant data and retains exact source excerpts', async () => {
    jest.mocked(readResearchRecord).mockResolvedValue({
      kind: 'document',
      id: 'd',
      title: 'Scope',
      version: 'v3',
      url: '/org-a/documents/isms/scope',
      text: 'Captured evidence',
    });
    const set = tools();
    const result = await set.readSource.execute!(
      { kind: 'document', id: 'd', offset: 0 },
      options,
    );
    expect(result).toMatchObject({
      citation: '[S1](#source-S1)',
      content: 'Captured evidence',
    });
    expect(readResearchRecord).toHaveBeenCalledWith({
      organizationId: 'org-a',
      kind: 'document',
      id: 'd',
    });
    await set.readSource.execute!(
      { kind: 'document', id: 'd', offset: 0 },
      options,
    );
    expect(citations).toHaveLength(1);
    expect(checkAccess).toHaveBeenCalledTimes(2);
  });
  it('does not invent sources when a record was deleted or inaccessible', async () => {
    jest.mocked(readResearchRecord).mockResolvedValue(null);
    expect(
      await tools().readSource.execute!(
        { kind: 'document', id: 'foreign', offset: 0 },
        options,
      ),
    ).toMatchObject({ error: expect.stringContaining('not found') });
    expect(citations).toHaveLength(0);
  });
  it('stops before reading when permission is revoked', async () => {
    checkAccess.mockRejectedValue(new Error('revoked'));
    await expect(
      tools().readSource.execute!(
        { kind: 'document', id: 'd', offset: 0 },
        options,
      ),
    ).rejects.toThrow('revoked');
    expect(readResearchRecord).not.toHaveBeenCalled();
  });
  it('scopes database search and exposes no write tools', async () => {
    const set = tools();
    await set.searchSources.execute!(
      { kind: 'risk', query: 'access', offset: 20 },
      options,
    );
    expect(searchResearchSources).toHaveBeenCalledWith({
      organizationId: 'org-a',
      kind: 'risk',
      query: 'access',
      offset: 20,
    });
    expect(Object.keys(set).sort()).toEqual([
      'readSource',
      'searchRelatedEvidence',
      'searchSources',
    ]);
  });
});
