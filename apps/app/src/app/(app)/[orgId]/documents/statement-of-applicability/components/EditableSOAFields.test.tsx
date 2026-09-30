import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditableSOAFields } from './EditableSOAFields';
const mocks = vi.hoisted(() => ({ save: vi.fn(), permission: vi.fn() }));
vi.mock('../hooks/useSOADocument', () => ({ useSOADocument: () => ({ saveAnswer: mocks.save }) }));
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ hasPermission: mocks.permission }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const props = {
  documentId: 'doc_1',
  questionId: 'q_1',
  isApplicable: true,
  justification: 'Existing reasoning',
  isPendingApproval: false,
  organizationId: 'org_1',
  trigger: 'justification' as const,
  controlLabel: '5.1 · Policies',
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.permission.mockReturnValue(true);
  mocks.save.mockResolvedValue(true);
});
describe('SoA answer editor', () => {
  it('opens directly and saves the text without changing applicability', async () => {
    const onUpdate = vi.fn();
    render(<EditableSOAFields {...props} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit justification' }));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('5.1 · Policies');
    const input = screen.getByRole('textbox', { name: 'Justification' });
    expect(input).toHaveValue('Existing reasoning');
    fireEvent.change(input, { target: { value: 'New reasoning\n\nStatus: implemented.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith({
        isApplicable: true,
        justification: 'New reasoning\n\nStatus: implemented.',
      }),
    );
    expect(mocks.save).toHaveBeenCalledWith({
      questionId: 'q_1',
      answer: 'New reasoning\n\nStatus: implemented.',
      justification: 'New reasoning\n\nStatus: implemented.',
      isApplicable: true,
    });
  });
  it('discards cancelled edits and does not save an unchanged answer', () => {
    render(<EditableSOAFields {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit justification' }));
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Justification' }), {
      target: { value: 'Discard me' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit justification' }));
    expect(screen.getByRole('textbox', { name: 'Justification' })).toHaveValue(
      'Existing reasoning',
    );
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('keeps the entered text available after a failed save', async () => {
    mocks.save.mockRejectedValue(new Error('Connection lost'));
    render(<EditableSOAFields {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit justification' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Justification' }), {
      target: { value: 'Keep my draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection lost');
    expect(screen.getByRole('textbox', { name: 'Justification' })).toHaveValue('Keep my draft');
  });
  it('requires a justification for excluded controls', async () => {
    render(<EditableSOAFields {...props} isApplicable={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit justification' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Justification' }), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Explain why');
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it.each([true, false])(
    'hides editing for pending review or read-only permissions (%s)',
    (pending) => {
      mocks.permission.mockReturnValue(pending);
      render(<EditableSOAFields {...props} isPendingApproval={pending} />);
      expect(screen.queryByRole('button', { name: 'Edit justification' })).not.toBeInTheDocument();
    },
  );
});
