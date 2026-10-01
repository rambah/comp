import type { Control, FrameworkEditorRequirement, Task } from '@db';
import type { FrameworkInstanceWithControls } from '@/lib/types/framework';
import { describe, expect, it } from 'vitest';
import { buildControlItems, buildRequirementItems, buildRequirementMap } from './framework-controls-shared';

describe('custom requirement mappings', () => {
  const requirements = ['6.2', '6.3'].map((id) => ({ id, name: `${id} Planning`, identifier: null })) as FrameworkEditorRequirement[];
  const control = {
    id: 'iso', policies: Array.from({ length: 4 }, (_, i) => ({ id: `p${i}`, status: 'published' })),
    requirementsMapped: requirements.map(({ id }) => ({ requirementId: null, customRequirementId: id })),
    controlDocumentTypes: [],
  } as unknown as FrameworkInstanceWithControls['controls'][number];
  const tasks = Array.from({ length: 9 }, (_, i) => ({ id: `t${i}`, status: i === 8 ? 'todo' : 'done', controls: [control] })) as unknown as (Task & { controls: Control[] })[];
  it('shows the existing ISO control and 92%, 4/4 policies, 8/9 tasks for both requirements', () => {
    const result = buildRequirementItems(requirements, [control], tasks, []);
    expect(result.map((r) => r.identifier)).toEqual(['6.2', '6.3']);
    for (const item of result) {
      expect(item.mappedControlsCount).toBe(1);
      expect(item.compliancePercent).toBe(92);
      expect(item.artifactCounts.policies).toEqual({ completed: 4, total: 4 });
      expect(item.artifactCounts.tasks).toEqual({ completed: 8, total: 9 });
    }
    expect(control.requirementsMapped).toHaveLength(2);
  });
  it('also includes custom identifiers in the control requirement list', () => {
    expect(buildControlItems([control], buildRequirementMap(requirements))[0].requirements.map((r) => r.identifier)).toEqual(['6.2', '6.3']);
  });
  it('does not attach unrelated requirements', () => {
    expect(buildRequirementItems([{ ...requirements[0], id: 'other' }], [control], tasks, [])[0].mappedControlsCount).toBe(0);
  });
});
