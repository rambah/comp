import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AttachmentPreviewDialog } from './AttachmentPreviewDialog';

vi.mock('./feedback/AttachmentFeedbackPanel', () => ({ AttachmentFeedbackPanel: () => null }));

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});
const attachment = { id: 'att_123', name: 'audit.md' };
const textResponse = (text: string) => ({
  ok: true,
  blob: async () => ({ size: text.length, text: async () => text }),
});

describe('Attachment preview', () => {
  it('renders Markdown headings and tables in a wide dialog with an authenticated download', async () => {
    fetchMock.mockResolvedValue(
      textResponse('# Audit report\n\n| Control | Status |\n| --- | --- |\n| A.5 | Done |'),
    );
    render(<AttachmentPreviewDialog attachment={attachment} onClose={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'Audit report' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toHaveTextContent('A.5');
    expect(screen.getByRole('dialog')).toHaveStyle({ maxWidth: '1200px' });
    expect(screen.getByRole('button', { name: 'Download' })).toHaveAttribute(
      'href',
      '/api/attachments/att_123/content?name=audit.md&download=1',
    );
  });
  it('does not execute HTML or render tracking images or javascript links', async () => {
    fetchMock.mockResolvedValue(
      textResponse(
        '# Safe\n\n<script>alert(1)</script>\n\n![Tracking](https://example.com/pixel.png)\n\n[Bad](javascript:alert%281%29)',
      ),
    );
    render(<AttachmentPreviewDialog attachment={attachment} onClose={vi.fn()} />);
    await screen.findByRole('heading', { name: 'Safe' });
    expect(document.querySelector('script')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('Bad').getAttribute('href')).not.toMatch(/^javascript:/);
  });
  it('keeps download available when preview fails and supports retry', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 413 })
      .mockResolvedValueOnce(textResponse('# Retried'));
    render(<AttachmentPreviewDialog attachment={attachment} onClose={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('too large');
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Retried' })).toBeInTheDocument();
  });
  it('offers unsupported formats for download without fetching a preview', () => {
    render(
      <AttachmentPreviewDialog
        attachment={{ id: 'att_doc', name: 'report.docx' }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/No preview is available/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('aborts an old preview when another attachment is selected', async () => {
    fetchMock
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValueOnce(textResponse('# New document'));
    const { rerender } = render(
      <AttachmentPreviewDialog attachment={attachment} onClose={vi.fn()} />,
    );
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    rerender(
      <AttachmentPreviewDialog
        attachment={{ id: 'att_next', name: 'next.md' }}
        onClose={vi.fn()}
      />,
    );
    expect(await screen.findByRole('heading', { name: 'New document' })).toBeInTheDocument();
    expect(signal.aborted).toBe(true);
  });
  it.each(['screenshot.png', 'report.pdf'])(
    'previews %s and releases the object URL on close',
    async (name) => {
      const createObjectURL = vi.fn((_blob: Blob) => 'blob:preview');
      const revokeObjectURL = vi.fn();
      vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
      fetchMock.mockResolvedValue({ ok: true, blob: async () => new Blob(['file']) });
      const { unmount } = render(
        <AttachmentPreviewDialog attachment={{ id: 'att_media', name }} onClose={vi.fn()} />,
      );
      await waitFor(() => expect(createObjectURL).toHaveBeenCalledOnce());
      const media = name.endsWith('.pdf') ? screen.getByTitle(name) : screen.getByRole('img');
      expect(media).toHaveAttribute('src', 'blob:preview');
      if (name.endsWith('.pdf'))
        expect(createObjectURL.mock.calls[0][0].type).toBe('application/pdf');
      unmount();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    },
  );
  it('closes using Escape', async () => {
    const onClose = vi.fn();
    render(
      <AttachmentPreviewDialog
        attachment={{ id: 'att_doc', name: 'report.docx' }}
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
