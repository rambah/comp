import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ISMS_TYPE_META } from '../../documents/isms/isms-types';
import { AUDIT_SOURCE_LOCATIONS } from '../audit-source-catalog';
import { checkSourceRoutes } from '../check-source-routes';
import { AuditSourceCatalog } from './AuditSourceCatalog';
const { hasPermission } = vi.hoisted(() => ({ hasPermission: vi.fn() }));
vi.mock('@/hooks/use-permissions', () => ({ usePermissions: () => ({ hasPermission }) }));

describe('Audit source availability', () => {
  beforeEach(() => hasPermission.mockImplementation((_, action) => action === 'read'));
  it('makes risks, suppliers and every supported ISMS document reachable for a read-only auditor', () => {
    render(<AuditSourceCatalog organizationId="org1" />);
    expect(screen.getByRole('link', { name: /^Risks/ })).toHaveAttribute('href', '/org1/risk');
    expect(screen.getByRole('link', { name: /^Vendors & suppliers/ })).toHaveAttribute(
      'href',
      '/org1/vendors',
    );
    for (const source of AUDIT_SOURCE_LOCATIONS) {
      const link = screen.getByRole('link', {
        name: new RegExp('^' + source.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      });
      expect(link).toHaveAttribute('href', `/org1/${source.path}`);
      expect(link).not.toHaveAttribute('target', '_blank');
    }
    expect(AUDIT_SOURCE_LOCATIONS.filter((s) => s.group === 'ISMS documents')).toHaveLength(
      ISMS_TYPE_META.filter((s) => s.detailRouteEnabled).length,
    );
  });
  it('respects source-specific permissions rather than granting access through the workspace', () => {
    hasPermission.mockImplementation((resource) => resource === 'evidence');
    render(<AuditSourceCatalog organizationId="org1" />);
    expect(screen.queryByRole('link', { name: /^Risks/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Vendors & suppliers/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Statement of Applicability/ })).toBeInTheDocument();
  });
  it('finds suppliers by their audit terminology', () => {
    render(<AuditSourceCatalog organizationId="org1" />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Find an audit source' }), {
      target: { value: 'supplier' },
    });
    expect(screen.getByRole('link', { name: /^Vendors & suppliers/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^People & training/ })).not.toBeInTheDocument();
  });
  it('links supplier and risk checks to the actual registers and risk method', () => {
    expect(
      checkSourceRoutes({ organizationId: 'org1', controlKey: 'a_5_19_supplier_relationships' }),
    ).toContainEqual({ label: 'Vendors & suppliers', href: '/org1/vendors' });
    const links = checkSourceRoutes({ organizationId: 'org1', controlKey: 'clause_6_1_risk' });
    expect(links.map((link) => link.href)).toEqual(
      expect.arrayContaining([
        '/org1/risk',
        '/org1/vendors',
        '/org1/documents/isms/risk-methodology',
        '/org1/documents/isms/risk-treatment-plan',
        '/org1/documents/statement-of-applicability',
      ]),
    );
  });
});
