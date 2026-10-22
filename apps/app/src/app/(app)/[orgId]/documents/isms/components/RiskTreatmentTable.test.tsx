import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RiskTreatmentTable, type RiskTreatmentTableRow } from './RiskTreatmentTable';

const row = (overrides: Partial<RiskTreatmentTableRow> = {}): RiskTreatmentTableRow => ({
  key: 'R-01',
  title: 'Unauthorized data sharing',
  category: 'Governance',
  inherentLevel: 'Medium',
  treatment: 'Mitigate',
  controls: 'DLP settings; awareness training.',
  ownerName: 'Jane Doe',
  residualLevel: 'Low',
  acceptance: 'Accepted 2026-04-15 (Jane Doe)',
  acceptanceState: 'accepted',
  status: 'Open',
  ...overrides,
});

describe('RiskTreatmentTable', () => {
  it('renders one row per risk with the acceptance detail', () => {
    render(
      <RiskTreatmentTable
        keyHeader="Ref"
        showTitle
        rows={[row()]}
        emptyText="No risks recorded."
      />,
    );

    expect(screen.getByText(/Export reference R-01/)).toBeInTheDocument();
    expect(screen.getByText('Unauthorized data sharing')).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('Accepted 2026-04-15 (Jane Doe)')).toBeInTheDocument();
  });

  it('renders awaiting and stale acceptance badges', () => {
    render(
      <RiskTreatmentTable
        keyHeader="Vendor"
        showTitle={false}
        rows={[
          row({ key: 'AWS', acceptanceState: 'awaiting', acceptance: 'Awaiting acceptance' }),
          row({
            key: 'Google Workspace',
            acceptanceState: 'stale',
            acceptance: 'Stale — accepted 2026-04-15; residual has changed since',
          }),
        ]}
        emptyText="No vendors recorded."
      />,
    );

    expect(screen.getByText('Awaiting acceptance')).toBeInTheDocument();
    expect(screen.getByText('Stale')).toBeInTheDocument();
    // The stale row keeps the prior acceptance detail visible under the badge.
    expect(screen.getByText(/residual has changed since/)).toBeInTheDocument();
  });

  it('hides the description column when showTitle is false', () => {
    render(
      <RiskTreatmentTable
        keyHeader="Vendor"
        showTitle={false}
        rows={[row({ key: 'AWS' })]}
        emptyText="No vendors recorded."
      />,
    );

    expect(screen.queryByText('Description')).not.toBeInTheDocument();
  });

  it('renders the empty state when there are no rows', () => {
    render(
      <RiskTreatmentTable keyHeader="Ref" showTitle rows={[]} emptyText="No risks recorded." />,
    );

    expect(screen.getByText('No risks recorded.')).toBeInTheDocument();
  });
});

const rows: RiskTreatmentTableRow[] = [{
  key:'R-01', title:'R13 — Finance', category:'Governance', inherentLevel:'15/25 (High)',
  treatment:'Mitigate', controls:'## Payment controls\n\n**Second-founder approval**\n\n- Monthly review',
  ownerName:'Ramin', residualLevel:'10/25 (High)', acceptance:'Awaiting acceptance', acceptanceState:'awaiting', status:'Open',
}];
describe('Treatment reading view', () => {
  it('keeps the summary visible and expands formatted treatment text on request', () => {
    render(<RiskTreatmentTable keyHeader="Ref" showTitle rows={rows} emptyText="Empty"/>);
    expect(screen.getByText('15/25 (High)')).toBeVisible();
    expect(screen.getByText('10/25 (High)')).toBeVisible();
    expect(screen.queryByRole('heading',{name:'Payment controls'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Read treatment and evidence'}));
    expect(screen.getByRole('heading',{name:'Payment controls'})).toBeVisible();
    expect(screen.getByText('Second-founder approval').tagName).toBe('STRONG');
  });
  it('searches long treatment text and allows clearing an empty result', () => {
    render(<RiskTreatmentTable keyHeader="Ref" showTitle rows={rows} emptyText="Empty"/>);
    const search = screen.getByRole('textbox',{name:'Search organisational risks'});
    fireEvent.change(search,{target:{value:'Monthly review'}});
    expect(screen.getByText('R13 — Finance')).toBeVisible();
    fireEvent.change(search,{target:{value:'missing'}});
    expect(screen.queryByText('R13 — Finance')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Clear search'}));
    expect(screen.getByText('R13 — Finance')).toBeVisible();
  });
  it('supports supplier risks and expands all without an edit permission', () => {
    render(<RiskTreatmentTable keyHeader="Vendor" showTitle={false} rows={rows} emptyText="Empty"/>);
    expect(screen.getByRole('textbox',{name:'Search supplier risks'})).toBeVisible();
    fireEvent.click(screen.getByRole('button',{name:'Expand all'}));
    expect(screen.getByRole('heading',{name:'Payment controls'})).toBeVisible();
    fireEvent.click(screen.getByRole('button',{name:'Collapse all'}));
    expect(screen.queryByRole('heading',{name:'Payment controls'})).toBeNull();
  });
});
