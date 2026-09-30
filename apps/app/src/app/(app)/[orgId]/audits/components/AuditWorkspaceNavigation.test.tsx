import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { testAudit, testCheck, testEvidence, testRequest } from '../audit-test-fixtures';
import { AuditOverview } from './AuditOverview';
import { AuditQueue } from './AuditQueue';
import { AuditReviewBoard } from './AuditReviewBoard';

const actions = () => ({
  onSelect: vi.fn(),
  onRequests: vi.fn(),
  onReport: vi.fn(),
  onEvidence: vi.fn(),
});

describe('Audit workspace navigation', () => {
  it('opens the completed audit record even when requests remain', () => {
    const handlers = actions();
    const audit = {
      ...testAudit([testCheck({ requests: [testRequest()] })]),
      status: 'complete' as const,
    };
    render(<AuditOverview audit={audit} {...handlers} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open audit record' }));
    expect(handlers.onReport).toHaveBeenCalledOnce();
    expect(handlers.onRequests).not.toHaveBeenCalled();
  });

  it('takes a received response to its exact check and metrics to their destinations', () => {
    const handlers = actions();
    const audit = testAudit([
      testCheck({ id: 'ready', evidenceLinks: [testEvidence()] }),
      testCheck({ id: 'response', requests: [testRequest({ status: 'submitted' })] }),
    ]);
    render(<AuditOverview audit={audit} {...handlers} />);
    fireEvent.click(screen.getByRole('button', { name: 'Review latest response' }));
    expect(handlers.onSelect).toHaveBeenCalledWith('response');
    fireEvent.click(screen.getByRole('button', { name: /Evidence references:/ }));
    expect(handlers.onEvidence).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: /Responses received:/ }));
    expect(handlers.onRequests).toHaveBeenCalledOnce();
  });

  it('opens a check when its card title is clicked', () => {
    const onSelect = vi.fn();
    render(
      <AuditReviewBoard
        checks={[testCheck({ controlRef: 'Access review' })]}
        onSelect={onSelect}
      />,
    );
    const card = screen.getByRole('button', { name: 'Review Access review' });
    fireEvent.click(within(card).getByRole('heading', { name: 'Access review' }));
    expect(onSelect).toHaveBeenCalledWith('c1');
  });

  it('recovers an empty board search with Clear filters', () => {
    render(
      <AuditQueue
        audit={testAudit([testCheck()])}
        layout="board"
        onLayoutChange={vi.fn()}
        {...actions()}
      />,
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Search audit checks' }), {
      target: { value: 'no matching check' },
    });
    expect(screen.getByText('No checks match this view.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('button', { name: 'Review Scope' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Search audit checks' })).toHaveValue('');
  });
});
