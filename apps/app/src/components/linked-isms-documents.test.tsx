import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LinkedIsmsDocuments } from './linked-isms-documents';

describe('linked ISMS documents', () => {
  it('keeps approved v2 visible when the working copy is a new draft', () => {
    render(<LinkedIsmsDocuments orgId="org_1" links={[{ ismsDocument: {
      id: 'doc_1', type: 'risk_assessment_methodology', title: 'Risk Assessment Methodology', status: 'draft',
      currentVersion: { version: 2, publishedAt: '2026-09-21T12:00:00Z' },
    } }]} />);
    expect(screen.getByRole('link', { name: 'Risk Assessment Methodology' })).toHaveAttribute('href', '/org_1/documents/isms/risk-methodology');
    expect(screen.getByText('Approved · v2')).toBeInTheDocument();
    expect(screen.getByText('Working copy: draft')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('does not claim publication for a document without a published version', () => {
    render(<LinkedIsmsDocuments orgId="org_1" links={[{ ismsDocument: {
      id: 'doc_1', type: 'risk_assessment_methodology', title: 'Methodology', status: 'draft', currentVersion: null,
    } }]} />);
    expect(screen.getByText('No published version')).toBeInTheDocument();
  });
});
