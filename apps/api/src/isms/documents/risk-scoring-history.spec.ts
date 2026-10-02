import {
  buildRiskMethodologySections,
  defaultRiskMethodologyNarrative,
} from './risk-methodology';
import { buildRiskMethodologySections as legacySections } from './legacy-risk-methodology';
import type { DocumentExportInput } from './types';
import { ratingLevel, legacyAcceptanceLevel } from '../../risks/risk-level';
describe('scoring history', () => {
  const input = {
    narrative: {
      ...defaultRiskMethodologyNarrative('Test'),
      acceptanceThresholds: ['a', 'b', 'c', 'd', 'e'],
    },
  } as unknown as DocumentExportInput;
  it('preserves old published methodology matrix on fallback rendering', () => {
    const legacy = legacySections(input).find(
      (s) => s.heading === 'Risk level matrix',
    );
    const current = buildRiskMethodologySections(input).find(
      (s) => s.heading === 'Risk level matrix',
    );
    expect(legacy?.table?.rows[3][5]).toBe('Low');
    expect(current?.table?.rows[3][5]).toBe('High');
  });
  it('keeps historical acceptance classification separate', () => {
    expect(legacyAcceptanceLevel('unlikely', 'severe')).toBe('low');
    expect(ratingLevel('unlikely', 'severe')).toBe('high');
  });
});
