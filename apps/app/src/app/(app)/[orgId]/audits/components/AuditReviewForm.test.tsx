import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditCheck } from '../workspace-types';
import { AuditReviewForm } from './AuditReviewForm';
const patch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api-client', () => ({ apiClient: { patch } }));
const check: AuditCheck = {
  id: 'c1',
  auditId: 'a1',
  controlKey: null,
  controlRef: 'Scope',
  whatWasTested: 'Test scope',
  whereToFind: 'Document',
  result: null,
  notes: null,
  source: 'manual',
  derivedFrom: null,
  position: 0,
  updatedAt: '2026-09-30T12:00:00Z',
  reviewedAt: null,
  reviewedBy: null,
  requests: [],
  evidenceLinks: [],
};
const props = {
  check,
  organizationId: 'o1',
  canEdit: true,
  onBusyChange: vi.fn(),
  onSaved: vi.fn(async () => undefined),
  onComplete: vi.fn(),
  onFinding: vi.fn(),
};
describe('Audit review drafts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    patch.mockResolvedValue({ data: { ...check, updatedAt: '2026-09-30T12:00:01Z' } });
  });
  afterEach(() => vi.useRealTimers());
  it('debounces typing and sends the original version for conflict detection', async () => {
    render(<AuditReviewForm {...props} />);
    fireEvent.change(screen.getByLabelText('Sample and review notes'), {
      target: { value: 'Sample A' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    fireEvent.change(screen.getByLabelText('Sample and review notes'), {
      target: { value: 'Sample A and B' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });
    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledWith(
      '/v1/audit-workspace/checks/c1/review',
      { expectedUpdatedAt: check.updatedAt, notes: 'Sample A and B' },
      'o1',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Notes saved');
  });
  it('retains a local draft on conflict and does not keep overwriting', async () => {
    patch.mockResolvedValue({ error: 'This record changed elsewhere', status: 409 });
    const view = render(<AuditReviewForm {...props} />);
    fireEvent.change(screen.getByLabelText('Sample and review notes'), {
      target: { value: 'My unsaved reasoning' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    view.rerender(
      <AuditReviewForm
        {...props}
        check={{ ...check, notes: 'Someone else’s review', updatedAt: '2026-09-30T13:00:00Z' }}
      />,
    );
    expect(screen.getByLabelText('Sample and review notes')).toHaveValue('My unsaved reasoning');
    expect(screen.getByRole('alert')).toHaveTextContent('This record changed elsewhere');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(patch).toHaveBeenCalledTimes(1);
  });
  it('does not mutate when displaying another person’s read-only audit view', async () => {
    render(<AuditReviewForm {...props} canEdit={false} />);
    expect(screen.getByLabelText('Sample and review notes')).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: 'Complete & next' })).not.toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(patch).not.toHaveBeenCalled();
  });
});
