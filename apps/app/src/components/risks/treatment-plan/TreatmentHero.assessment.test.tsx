import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TreatmentHero } from './TreatmentHero';
vi.mock('@trycompai/design-system', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
const rating = {
  inherentLikelihood: 'possible',
  inherentImpact: 'severe',
  residualLikelihood: 'unlikely',
  residualImpact: 'severe',
  strategy: 'mitigate',
} as const;
describe('saved current assessment', () => {
  it.each([
    { tasks: [] },
    { tasks: [{ status: 'todo' }] },
    { tasks: [{ status: 'done' }] },
  ] as const)('keeps current rating independent of tasks %j', ({ tasks }) => {
    render(<TreatmentHero {...rating} tasks={[...tasks]} />);
    expect(screen.getByLabelText('Inherent 15/25; current 10/25')).toBeInTheDocument();
    expect(screen.getByText('High → High')).toBeInTheDocument();
  });
  it('shows missing current assessment explicitly', () => {
    render(<TreatmentHero {...rating} residualAssessmentStatus="unassessed" tasks={[]} />);
    expect(screen.getByLabelText('Inherent 15/25; current not yet assessed')).toBeInTheDocument();
  });
});
