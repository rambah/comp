import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SOATable } from './SOATable';
vi.mock('./SOATableRow', () => ({
  SOATableRow: ({ question }: { question: { id: string } }) => (
    <tr>
      <td>{question.id}</td>
    </tr>
  ),
}));
vi.mock('./SOAMobileRow', () => ({ SOAMobileRow: () => null }));
const questions = Array.from({ length: 23 }, (_, index) => ({
  id: `q${index + 1}`,
  text: '',
  columnMapping: {
    closure: `5.${index + 1}`,
    title: `Control ${index + 1}`,
    control_objective: 'Objective',
    isApplicable: null,
  },
}));
const props = {
  columns: [],
  questions,
  answersMap: new Map([
    ['q23', { answer: 'Unique evidence text', answerVersion: 1, isApplicable: true }],
  ]),
  questionStatuses: new Map(),
  processedResults: new Map(),
  isFullyRemote: false,
  isExpanded: false,
  onToggleExpand: vi.fn(),
  documentId: 'doc1',
  isPendingApproval: false,
  organizationId: 'org1',
};
describe('SoA control navigation', () => {
  it('paginates and searches all controls, including justification on another page', () => {
    render(<SOATable {...props} />);
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(11);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('q11')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search controls' }), {
      target: { value: 'Unique evidence' },
    });
    expect(screen.getByText('q23')).toBeInTheDocument();
    expect(screen.getByText('Showing 1–1 of 1')).toBeInTheDocument();
  });
  it('recovers from no matches using clear filters', () => {
    render(<SOATable {...props} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search controls' }), {
      target: { value: 'absent term' },
    });
    expect(screen.getByText('No controls match your filters.')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    expect(screen.getByText('q1')).toBeInTheDocument();
  });
});
