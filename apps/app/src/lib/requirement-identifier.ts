/** Display fallback only: stored identifiers and requirement links stay untouched. */
export function getRequirementIdentifier(requirement: { identifier?: string | null; name: string }): string {
  return requirement.identifier?.trim() || requirement.name.trim().match(/^((?:A\.)?\d+(?:\.\d+)+)(?=\s|[:–—-]|$)/)?.[1] || '';
}
