import ExcelJS from 'exceljs';
import { AuditResearchFiles } from './research-files.service';
import { researchFileRecord } from './research-file-record';
import { s3Client } from '@/app/s3';
import { generateText } from 'ai';
jest.mock('@/app/s3', () => ({ s3Client: { send: jest.fn() } }));
jest.mock('./research-file-record', () => ({ researchFileRecord: jest.fn() }));
jest.mock('ai', () => ({ generateText: jest.fn() }));
jest.mock('@ai-sdk/openai', () => ({
  openai: { responses: (id: string) => ({ modelId: id }) },
}));
const service = new AuditResearchFiles();
const input = {
  organizationId: 'org',
  kind: 'file' as const,
  id: 'file',
  signal: new AbortController().signal,
};
const row = {
  name: 'evidence.md',
  key: 'org/attachments/file',
  date: new Date(),
  path: 'tasks/t',
  version: 'Uploaded today',
};
describe('evidence file reading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(researchFileRecord).mockResolvedValue(row);
  });
  it('never fetches a different organization’s storage key', async () => {
    jest
      .mocked(researchFileRecord)
      .mockResolvedValue({ ...row, key: 'other-org/secret.pdf' });
    expect((await service.read(input))?.text).toContain('unavailable');
    expect(s3Client!.send).not.toHaveBeenCalled();
  });
  it('reads Markdown without an additional model call', async () => {
    jest.mocked(s3Client!.send).mockResolvedValue({
      Body: {
        transformToByteArray: async () =>
          Buffer.from('# Evidence\nRecorded review'),
      },
    } as never);
    expect((await service.read(input))?.text).toBe(
      '# Evidence\nRecorded review',
    );
    expect(generateText).not.toHaveBeenCalled();
  });
  it('uses the same model for PDF transcription and labels the result', async () => {
    jest
      .mocked(researchFileRecord)
      .mockResolvedValue({ ...row, name: 'evidence.pdf' });
    jest.mocked(s3Client!.send).mockResolvedValue({
      Body: { transformToByteArray: async () => Buffer.from('%PDF-1.7') },
    } as never);
    jest
      .mocked(generateText)
      .mockResolvedValue({ text: 'Page 1: Evidence' } as never);
    expect((await service.read(input))?.text).toContain(
      'AI transcription using gpt-6.1-sol',
    );
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({ model: { modelId: 'gpt-6.1-sol' } }),
    );
  });
  it('reads spreadsheet cells with addresses using the existing workbook parser', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Review').addRow(['Control', 'Recorded']);
    const bytes = await workbook.xlsx.writeBuffer();
    jest
      .mocked(researchFileRecord)
      .mockResolvedValue({ ...row, name: 'review.xlsx' });
    jest.mocked(s3Client!.send).mockResolvedValue({
      Body: { transformToByteArray: async () => bytes },
    } as never);
    const source = await service.read(input);
    expect(source?.text).toContain('A1: Control');
    expect(source?.text).toContain('B1: Recorded');
    expect(generateText).not.toHaveBeenCalled();
  });
  it('refuses oversized files before sending them to the model', async () => {
    jest.mocked(s3Client!.send).mockResolvedValue({
      Body: {
        transformToByteArray: async () => new Uint8Array(8 * 1024 * 1024 + 1),
      },
    } as never);
    expect((await service.read(input))?.text).toContain('8 MB');
    expect(generateText).not.toHaveBeenCalled();
  });
});
