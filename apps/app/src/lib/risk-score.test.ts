import { describe, expect, it } from 'vitest';
import {
  currentAssessmentScore,
  getRiskLevel,
  getRiskScore,
  legacyAcceptanceLevel,
} from './risk-score';
describe('canonical assessment scores', () => {
  it('keeps R01 at 15/25 to 10/25, both High, regardless of task progress', () => {
    expect(getRiskScore('possible', 'severe')).toEqual({ raw: 15, score: 15, level: 'high' });
    expect(
      currentAssessmentScore({ residualLikelihood: 'unlikely', residualImpact: 'severe' }),
    ).toBe(10);
    expect(getRiskScore('unlikely', 'severe').level).toBe('high');
  });
  it.each([
    [1, 'low'],
    [4, 'low'],
    [5, 'medium'],
    [9, 'medium'],
    [10, 'high'],
    [16, 'high'],
    [17, 'very-high'],
    [25, 'very-high'],
  ] as const)('classifies boundary %i', (score, level) => expect(getRiskLevel(score)).toBe(level));
  it('never substitutes default or inherent values for an absent assessment', () => {
    expect(currentAssessmentScore({})).toBeNull();
    expect(
      currentAssessmentScore({
        residualLikelihood: 'very_unlikely',
        residualImpact: 'insignificant',
        residualAssessmentStatus: 'unassessed',
      }),
    ).toBeNull();
    expect(
      currentAssessmentScore({
        residualLikelihood: 'very_unlikely',
        residualImpact: 'insignificant',
        residualAssessmentStatus: 'assessed',
      }),
    ).toBe(1);
  });
  it('retains the original classification for historical acceptance events', () => {
    expect(legacyAcceptanceLevel('unlikely', 'severe')).toBe('low');
    expect(getRiskScore('unlikely', 'severe').level).toBe('high');
  });
});
