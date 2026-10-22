import { describe, expect, it } from 'vitest';
import { getRequirementIdentifier } from './requirement-identifier';
describe('requirement identifier display', () => {
  it.each([['4.1 Context of the organization', '4.1'], ['A.5.31 Legal requirements', 'A.5.31'], ['6.2 – Objectives', '6.2'], ['General planning', '']])('extracts a leading clause from %s', (name, expected) => {
    expect(getRequirementIdentifier({ name, identifier: null })).toBe(expected);
  });
  it('preserves an explicit identifier without mutating the source', () => {
    const requirement = { identifier: '  CUSTOM-2 ', name: '4.1 Context' };
    expect(getRequirementIdentifier(requirement)).toBe('CUSTOM-2');
    expect(requirement.identifier).toBe('  CUSTOM-2 ');
  });
});
