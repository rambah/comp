import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { JSONContent } from '@tiptap/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentEditor } from './CommentEditor';
const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  update: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@/hooks/use-api', () => ({ useApi: () => ({ post: mocks.post }) }));
vi.mock('@/hooks/use-comments-api', () => ({
  useCommentActions: () => ({ updateComment: mocks.update }),
}));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock('./CommentRichTextField', () => ({
  CommentRichTextField: ({
    value,
    onChange,
    disabled,
  }: {
    value: JSONContent;
    onChange: (value: JSONContent) => void;
    disabled: boolean;
  }) => (
    <textarea
      aria-label="Comment text"
      disabled={disabled}
      value={value.content?.map((p) => p.content?.map((n) => n.text).join('')).join('\n') ?? ''}
      onChange={(e) =>
        onChange({
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: e.target.value }] }],
        })
      }
    />
  ),
}));
const onSaved = vi.fn(),
  onCancel = vi.fn(),
  refreshComments = vi.fn();
const setup = () =>
  render(
    <CommentEditor
      comment={{ id: 'cmt_1', content: 'Existing text\nSecond line' }}
      members={[]}
      onSaved={onSaved}
      onCancel={onCancel}
      refreshComments={refreshComments}
    />,
  );
const selectFiles = (...names: string[]) =>
  fireEvent.change(screen.getByLabelText('Choose comment attachments'), {
    target: {
      files: names.map((name) => new File(['# Evidence'], name, { type: 'text/markdown' })),
    },
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.post.mockResolvedValue({ data: { id: 'att_new' }, status: 201 });
  mocks.update.mockResolvedValue({});
});
afterEach(cleanup);
describe('Edit comment attachments', () => {
  it('preserves legacy plain text and adds files without rewriting the comment', async () => {
    setup();
    expect(screen.getByLabelText('Comment text')).toHaveValue('Existing text\nSecond line');
    selectFiles('audit.md');
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.post).toHaveBeenCalledWith(
      '/v1/comments/cmt_1/attachments',
      expect.objectContaining({
        fileName: 'audit.md',
        fileType: 'text/markdown',
        fileData: 'IyBFdmlkZW5jZQ==',
      }),
    );
  });
  it('retains only failed and unattempted files for retry', async () => {
    mocks.post
      .mockResolvedValueOnce({ status: 201 })
      .mockResolvedValueOnce({ error: 'Upload failed', status: 500 })
      .mockResolvedValue({ status: 201 });
    setup();
    selectFiles('first.md', 'second.md', 'third.md');
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('second.md: Upload failed'));
    expect(screen.queryByRole('button', { name: 'Remove first.md' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Remove second.md' })).toBeEnabled();
    expect(onSaved).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(mocks.post.mock.calls.map((call) => call[1].fileName)).toEqual([
      'first.md',
      'second.md',
      'second.md',
      'third.md',
    ]);
  });
  it('does not save the same text again when retrying a failed upload', async () => {
    mocks.post
      .mockResolvedValueOnce({ error: 'Upload failed', status: 500 })
      .mockResolvedValue({ status: 201 });
    setup();
    selectFiles('audit.md');
    fireEvent.change(screen.getByLabelText('Comment text'), {
      target: { value: 'Updated comment' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith('Comment text saved. audit.md: Upload failed'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(mocks.update).toHaveBeenCalledOnce();
  });
  it('does not upload if saving the changed text is denied', async () => {
    mocks.update.mockRejectedValueOnce(new Error('Forbidden'));
    setup();
    selectFiles('audit.md');
    fireEvent.change(screen.getByLabelText('Comment text'), { target: { value: 'Changed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Forbidden'));
    expect(mocks.post).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });
  it('lets users remove pending files or cancel without uploading', () => {
    setup();
    selectFiles('audit.md');
    fireEvent.click(screen.getByRole('button', { name: 'Remove audit.md' }));
    expect(screen.queryByText('audit.md')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it('rejects files larger than 100MB before uploading', () => {
    setup();
    const file = new File(['x'], 'large.md');
    Object.defineProperty(file, 'size', { value: 101 * 1024 * 1024 });
    fireEvent.change(screen.getByLabelText('Choose comment attachments'), {
      target: { files: [file] },
    });
    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('100MB'));
    expect(screen.queryByText('large.md')).toBeNull();
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it('disables controls while saving to prevent double submission', async () => {
    mocks.post.mockImplementationOnce(() => new Promise(() => {}));
    setup();
    selectFiles('audit.md');
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledOnce());
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByLabelText('Comment text')).toBeDisabled();
  });
});
