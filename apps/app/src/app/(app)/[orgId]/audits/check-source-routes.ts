const routes: Record<string, { path: string; label: string }[]> = {
  clause_4_1_context: [
    { path: 'documents/isms/context-of-organization', label: 'Organizational context' },
    { path: 'documents/isms/interested-parties', label: 'Interested parties' },
    { path: 'documents/isms/requirements', label: 'Interested-party requirements' },
  ],
  clause_4_3_scope: [{ path: 'documents/isms/scope', label: 'ISMS scope' }],
  clause_5_2_policy: [{ path: 'policies', label: 'Published policies' }],
  clause_6_1_risk: [
    { path: 'risk', label: 'Risk register' },
    { path: 'vendors', label: 'Supplier risks' },
    { path: 'documents/isms/risk-methodology', label: 'Risk assessment methodology' },
    { path: 'documents/isms/risk-treatment-plan', label: 'Risk treatment plan' },
    { path: 'documents/statement-of-applicability', label: 'Statement of Applicability' },
  ],
  clause_7_2_competence: [
    { path: 'documents/isms/roles', label: 'Roles and competence' },
    { path: 'people/all', label: 'People & training' },
  ],
  clause_8_1_operational_planning: [
    { path: 'controls', label: 'Controls' },
    { path: 'documents/isms/objectives', label: 'Security objectives' },
    { path: 'tasks', label: 'Evidence' },
    { path: 'policies', label: 'Policies' },
  ],
  clause_9_1_monitoring: [{ path: 'documents/isms/monitoring', label: 'Monitoring' }],
  clause_9_3_management_review: [
    { path: 'documents/isms/management-review', label: 'Management review' },
  ],
  a_5_1_policies: [{ path: 'policies', label: 'Policies' }],
  a_5_15_access_control: [
    { path: 'people/all', label: 'People & access' },
    { path: 'documents', label: 'Access review records' },
    { path: 'policies', label: 'Access policies' },
    { path: 'tasks', label: 'Access evidence' },
  ],
  a_5_19_supplier_relationships: [
    { path: 'vendors', label: 'Vendors & suppliers' },
    { path: 'risk', label: 'Supplier-related risks' },
    { path: 'policies', label: 'Supplier policies' },
  ],
  a_5_24_incident_management: [
    { path: 'policies', label: 'Incident response policies' },
    { path: 'tasks', label: 'Incident evidence' },
    { path: 'documents', label: 'Incident records & exercises' },
  ],
  a_8_7_malware: [
    { path: 'policies', label: 'Technical safeguards policies' },
    { path: 'tasks', label: 'Protection evidence' },
    { path: 'cloud-tests', label: 'Technical checks' },
  ],
  a_8_13_backup: [
    { path: 'tasks', label: 'Backup & restore evidence' },
    { path: 'policies', label: 'Continuity policies' },
    { path: 'vendors', label: 'Infrastructure suppliers' },
  ],
  a_8_24_cryptography: [
    { path: 'policies', label: 'Encryption policies' },
    { path: 'tasks', label: 'Encryption evidence' },
    { path: 'cloud-tests', label: 'Technical checks' },
  ],
};
export function checkSourceRoutes({
  controlKey,
  organizationId,
}: {
  controlKey: string | null;
  organizationId: string;
}) {
  return (
    routes[controlKey ?? ''] ?? [
      { path: 'tasks', label: 'Evidence library' },
      { path: 'documents', label: 'Documents' },
    ]
  ).map((r) => ({ label: r.label, href: `/${organizationId}/${r.path}` }));
}
