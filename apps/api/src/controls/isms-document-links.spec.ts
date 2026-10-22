import { ismsDocumentLinks } from './isms-document-links';
describe('ISMS control links', () => {
  it('scopes documents to the requested organization and selects publication metadata only', () => {
    expect(ismsDocumentLinks('org_1')).toEqual({
      where: { ismsDocument: { organizationId: 'org_1' } },
      select: { ismsDocument: { select: {
        id: true, type: true, title: true, status: true,
        currentVersion: { select: { version: true, publishedAt: true } },
      } } },
    });
  });
});
