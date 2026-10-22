import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTaskItemsStats } from '@/hooks/use-task-items';
import { TreatmentTaskProgress } from './TreatmentTaskProgress';
vi.mock('@/hooks/use-task-items', () => ({ useTaskItemsStats: vi.fn() }));
const stats = { total: 12, byStatus: { todo: 7, in_progress: 1, in_review: 1, done: 2, canceled: 1 } };
function mockStats(value: typeof stats | undefined, error?: string) {
  vi.mocked(useTaskItemsStats).mockReturnValue({
    data: value || error ? { data: value, error, status: error ? 403 : 200 } : undefined,
    error: undefined, isLoading: !value && !error, isValidating: false, mutate: vi.fn(),
  });
}
beforeEach(() => { vi.clearAllMocks(); mockStats(stats); });
describe('treatment task totals', () => {
  it.each(['risk', 'vendor'] as const)('includes all manual tasks for a %s, regardless of list pagination', (entityType) => {
    render(<TreatmentTaskProgress orgId="org_1" entityId="entity_1" entityType={entityType} tasks={[{ status: 'done' }, { status: 'todo' }]} />);
    expect(useTaskItemsStats).toHaveBeenCalledWith('entity_1', entityType);
    expect(screen.getByText('Task completion: 3/13 (23%) · 14 tasks total')).toBeInTheDocument();
    expect(screen.getByText(/1 canceled manual tasks excluded/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View manual tasks' })).toHaveAttribute('href', `/org_1/${entityType === 'risk' ? 'risk' : 'vendors'}/entity_1?tab=tasks`);
  });
  it('counts manual-only treatment work', () => {
    render(<TreatmentTaskProgress orgId="org_1" entityId="rsk_1" entityType="risk" tasks={[]} />);
    expect(screen.getByText('Task completion: 2/11 (18%) · 12 tasks total')).toBeInTheDocument();
  });
  it('does not silently report zero while loading', () => {
    mockStats(undefined);
    render(<TreatmentTaskProgress orgId="org_1" entityId="rsk_1" entityType="risk" tasks={[]} />);
    expect(screen.getByText(/Loading task totals/)).toBeInTheDocument();
    expect(screen.queryByText(/0 tasks total/)).not.toBeInTheDocument();
  });
  it('shows failed or unauthorized stats as unavailable, not zero', () => {
    mockStats(undefined, 'Forbidden');
    render(<TreatmentTaskProgress orgId="org_1" entityId="rsk_1" entityType="risk" tasks={[]} />);
    expect(screen.getByText(/Task total unavailable/)).toBeInTheDocument();
  });
  it('handles an empty plan without NaN', () => {
    mockStats({ total: 0, byStatus: { todo: 0, in_progress: 0, in_review: 0, done: 0, canceled: 0 } });
    render(<TreatmentTaskProgress orgId="org_1" entityId="rsk_1" entityType="risk" tasks={[]} />);
    expect(screen.getByText('Task completion: 0/0 (0%) · 0 tasks total')).toBeInTheDocument();
  });
});
