const routes: Record<string, { path: string; label: string }[]> = {
  clause_4_1_context: [
    { path: 'documents/isms/context-of-organization', label: 'Organizational context' },
  ],
  clause_4_3_scope: [{ path: 'documents/isms/scope', label: 'ISMS scope' }],
  clause_5_2_policy: [{ path: 'policies', label: 'Published policies' }],
  clause_6_1_risk: [{ path: 'risk', label: 'Risk register' }],
  clause_7_2_competence: [
    { path: 'documents/isms/roles', label: 'Roles and competence' },
    { path: 'people', label: 'People' },
  ],
  clause_8_1_operational_planning: [
    { path: 'tasks', label: 'Evidence' },
    { path: 'policies', label: 'Policies' },
  ],
  clause_9_1_monitoring: [{ path: 'documents/isms/monitoring', label: 'Monitoring' }],
  clause_9_3_management_review: [
    { path: 'documents/isms/management-review', label: 'Management review' },
  ],
  a_5_1_policies: [{ path: 'policies', label: 'Policies' }],
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
