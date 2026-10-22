import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { testAudit, testCheck, testEvidence, testRequest } from '../audit-test-fixtures';
import { AuditEvidenceLibrary } from './AuditEvidenceLibrary';
import { AuditReviewBoard } from './AuditReviewBoard';
vi.mock('./EvidenceSnapshot', () => ({ EvidenceSnapshot: () => <div>Exact snapshot</div> }));
vi.mock('./AuditEvidenceCompare', () => ({
  AuditEvidenceCompare: () => <div>Version comparison</div>,
}));
const audit = testAudit([
  testCheck({ evidenceLinks: [testEvidence(), testEvidence({ id: 'e2', versionLabel: 'v1' })] }),
  testCheck({
    id: 'c2',
    controlRef: 'Supplier review',
    requests: [testRequest()],
    evidenceLinks: [testEvidence({ id: 'e3', title: 'Supplier assessment', sourceId: 'd2' })],
  }),
]);
describe('Evidence library and review board', () => {
  it('opens the exact snapshot or comparison and navigates to the original check', () => {
    const onPreview = vi.fn();
    const onSelect = vi.fn();
    render(
      <AuditEvidenceLibrary
        audit={audit}
        organizationId="org1"
        previewId={null}
        compareId={null}
        onPreview={onPreview}
        onSelect={onSelect}
        locked={false}
      />,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Read evidence' })[0]);
    expect(onPreview).toHaveBeenCalledWith('e1');
    fireEvent.click(screen.getAllByRole('button', { name: 'Compare versions' })[0]);
    expect(onPreview).toHaveBeenCalledWith('e1', 'e2');
    fireEvent.click(screen.getByRole('button', { name: 'Supplier review' }));
    expect(onSelect).toHaveBeenCalledWith('c2');
  });
  it('filters by a linked check and restores the list from an empty search', () => {
    render(
      <AuditEvidenceLibrary
        audit={audit}
        organizationId="org1"
        previewId={null}
        compareId={null}
        onPreview={vi.fn()}
        onSelect={vi.fn()}
        locked={false}
      />,
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Search evidence library' }), {
      target: { value: 'Supplier review' },
    });
    expect(screen.getAllByRole('button', { name: 'Read evidence' })).toHaveLength(1);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search evidence library' }), {
      target: { value: 'no match' },
    });
    expect(screen.getByText('No matching evidence')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getAllByRole('button', { name: 'Read evidence' })).toHaveLength(3);
  });
  it('locks navigation while following and uses the synchronized comparison selection', () => {
    render(
      <AuditEvidenceLibrary
        audit={audit}
        organizationId="org1"
        previewId="e1"
        compareId="e2"
        onPreview={vi.fn()}
        onSelect={vi.fn()}
        locked
      />,
    );
    expect(screen.getByText('Version comparison')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Read evidence' })[0]).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Compare versions' })[0]).toBeDisabled();
  });
  it('puts outstanding requests in the waiting lane without rewriting outcomes', () => {
    const onSelect = vi.fn();
    render(<AuditReviewBoard checks={audit.controls} onSelect={onSelect} />);
    const waiting = screen.getByRole('region', { name: 'Waiting on the team' });
    fireEvent.click(within(waiting).getByRole('button', { name: 'Review Supplier review' }));
    expect(onSelect).toHaveBeenCalledWith('c2');
    expect(
      within(screen.getByRole('region', { name: 'Ready to review' })).getByText('Scope'),
    ).toBeInTheDocument();
  });
});
