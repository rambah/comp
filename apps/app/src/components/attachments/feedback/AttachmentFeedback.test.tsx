import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AttachmentFeedbackForm } from './AttachmentFeedbackForm';
import { AttachmentFeedbackPanel } from './AttachmentFeedbackPanel';
import { AttachmentFeedbackQueue } from './AttachmentFeedbackQueue';
import type { AttachmentFeedback } from './useAttachmentFeedback';

const mocks = vi.hoisted(() => ({
  canEdit: true,
  canRead: true,
  save: vi.fn(),
  mutate: vi.fn(),
  hook: vi.fn(),
  data: { data: [] as AttachmentFeedback[], count: 0, nextOffset: null as number | null },
}));
vi.mock('next/navigation', () => ({ useParams: () => ({ orgId: 'org1' }) }));
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    hasPermission: (_resource: string, action: string) =>
      action === 'read' ? mocks.canRead : mocks.canEdit,
  }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
vi.mock('../AttachmentPreviewDialog', () => ({
  AttachmentPreviewDialog: ({ attachment }: { attachment: { name: string } | null }) =>
    attachment ? <div role="dialog">{attachment.name}</div> : null,
}));
vi.mock('./useAttachmentFeedback', () => ({
  useAttachmentFeedback: (args: unknown) => {
    mocks.hook(args);
    return {
      data: mocks.data,
      save: mocks.save,
      mutate: mocks.mutate,
      error: null,
      isLoading: false,
    };
  },
}));
const item: AttachmentFeedback = {
  id: 'afb1',
  attachmentId: 'att1',
  attachmentName: 'sample.png',
  attachmentAvailable: true,
  entityId: 'task1',
  entityType: 'task',
  comment: 'Date is missing',
  authorName: 'Auditor',
  status: 'open',
  createdAt: '2026-10-02T10:00:00Z',
  updatedAt: '2026-10-02T10:00:00Z',
  responses: [],
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.canEdit = true;
  mocks.canRead = true;
  mocks.save.mockResolvedValue(undefined);
  mocks.data = { data: [], count: 0, nextOffset: null };
});
afterEach(cleanup);
describe('Attachment feedback', () => {
  it('requires an explanation, then saves a trimmed comment', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<AttachmentFeedbackForm onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Flag attachment' }));
    expect(await screen.findByText('Please explain what needs attention.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Date is missing  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Flag attachment' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ comment: 'Date is missing' }));
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(''));
  });
  it('keeps the draft when saving fails or conflicts', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('This feedback changed. Refresh.'));
    render(<AttachmentFeedbackForm item={item} onSave={onSave} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New screenshot attached' } });
    fireEvent.click(screen.getByRole('button', { name: 'Resolve with response' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This feedback changed');
    expect(screen.getByRole('textbox')).toHaveValue('New screenshot attached');
    expect(onSave).toHaveBeenCalledWith({ status: 'resolved', comment: 'New screenshot attached' });
  });
  it('allows an auditor to flag from the preview with the correct attachment identity', async () => {
    render(<AttachmentFeedbackPanel attachmentId="att1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Flag / review attachment' }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Screenshot is unreadable' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Flag attachment' }));
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith({
        body: { attachmentId: 'att1', comment: 'Screenshot is unreadable' },
      }),
    );
  });
  it('shows feedback but hides mutation controls for read-only users', () => {
    mocks.canEdit = false;
    mocks.data = { data: [item], count: 1, nextOffset: null };
    render(<AttachmentFeedbackPanel attachmentId="att1" />);
    fireEvent.click(screen.getByRole('button', { name: 'View attachment feedback' }));
    expect(screen.getByText('Date is missing')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolve with response' })).not.toBeInTheDocument();
  });
  it('does not fetch or expose feedback without read permission', () => {
    mocks.canRead = false;
    const { container } = render(<AttachmentFeedbackPanel attachmentId="att1" />);
    expect(container).toBeEmptyDOMElement();
    expect(mocks.hook).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
  it('shows the admin the original concern, preview, correction source and attributed resolution', async () => {
    mocks.data = { data: [item], count: 1, nextOffset: null };
    render(<AttachmentFeedbackQueue organizationId="org1" canEdit />);
    expect(screen.getByRole('button', { name: 'Open source / correct evidence' })).toHaveAttribute(
      'href',
      '/org1/tasks/task1',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Preview attachment' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('sample.png');
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Uploaded a clearer screenshot' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Resolve with response' }));
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith({
        id: 'afb1',
        body: {
          comment: 'Uploaded a clearer screenshot',
          status: 'resolved',
          expectedUpdatedAt: item.updatedAt,
        },
      }),
    );
  });
  it('retains deleted-file feedback and allows reopening with an explanation', async () => {
    mocks.data = {
      data: [
        {
          ...item,
          status: 'resolved',
          attachmentAvailable: false,
          responses: [
            {
              id: 'r1',
              comment: 'Fixed screenshot',
              authorName: 'Ramin',
              status: 'resolved',
              createdAt: item.createdAt,
            },
          ],
        },
      ],
      count: 1,
      nextOffset: null,
    };
    render(<AttachmentFeedbackQueue organizationId="org1" canEdit />);
    expect(screen.getByText('Original attachment removed; feedback retained.')).toBeInTheDocument();
    expect(screen.getByText('Fixed screenshot')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Preview attachment' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Still missing the timestamp' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reopen with response' }));
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            comment: 'Still missing the timestamp',
            status: 'open',
            expectedUpdatedAt: item.updatedAt,
          },
        }),
      ),
    );
  });
  it('loads additional feedback and resets pagination on status changes', () => {
    mocks.data = { data: [item], count: 51, nextOffset: 50 };
    render(<AttachmentFeedbackQueue organizationId="org1" canEdit={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'More feedback' }));
    expect(mocks.hook).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'open', offset: 50 }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Resolved', exact: true }));
    expect(mocks.hook).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'resolved', offset: 0 }),
    );
  });
});
