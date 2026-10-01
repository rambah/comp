import { db } from '@db';
import { listRecordingPage } from './recording-list';
jest.mock('@db', () => ({
  db: { auditRecording: { findFirst: jest.fn(), findMany: jest.fn() } },
}));
describe('Recording pagination', () => {
  it('returns a scoped cursor for older sessions beyond the first 100', async () => {
    (db.auditRecording.findMany as jest.Mock).mockResolvedValue(
      Array.from({ length: 101 }, (_, index) => ({ id: `rec${index}` })),
    );
    const page = await listRecordingPage({ organizationId: 'org' });
    expect(page.data).toHaveLength(100);
    expect(page.nextCursor).toBe('rec99');
  });
  it('rejects a cursor from another organization or an expired recording', async () => {
    (db.auditRecording.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      listRecordingPage({ organizationId: 'org', cursor: 'other' }),
    ).rejects.toThrow('cursor expired');
    expect(db.auditRecording.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org',
          id: 'other',
          deletedAt: null,
        }),
      }),
    );
  });
});
