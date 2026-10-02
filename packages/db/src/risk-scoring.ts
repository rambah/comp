/** Canonical 5×5 assessment. Scores are raw products, never normalized. */
export const LIKELIHOOD_SCORES = {
  very_unlikely: 1,
  unlikely: 2,
  possible: 3,
  likely: 4,
  very_likely: 5,
} as const;
export const IMPACT_SCORES = {
  insignificant: 1,
  minor: 2,
  moderate: 3,
  major: 4,
  severe: 5,
} as const;
// Legacy keys remain readable for historical acceptance snapshots only.
export type RiskLevel = 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
export const SCORING_VERSION = 'matrix-25-v1';
export const LEVEL_LABEL: Record<RiskLevel, string> = {
  'very-low': 'Low',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  'very-high': 'Critical',
};
export function getRiskLevel(raw: number): RiskLevel {
  if (raw >= 17) return 'very-high';
  if (raw >= 10) return 'high';
  if (raw >= 5) return 'medium';
  return 'low';
}
/** Score is the raw 1–25 product. */
export const getRiskLevelFromScore = getRiskLevel;
export function getRiskScore(
  likelihood: keyof typeof LIKELIHOOD_SCORES,
  impact: keyof typeof IMPACT_SCORES,
) {
  const raw = LIKELIHOOD_SCORES[likelihood] * IMPACT_SCORES[impact];
  return { raw, score: raw, level: getRiskLevel(raw) };
}
export function ratingLevel(
  likelihood: keyof typeof LIKELIHOOD_SCORES,
  impact: keyof typeof IMPACT_SCORES,
) {
  return getRiskScore(likelihood, impact).level;
}
export function currentAssessmentScore(input: {
  residualLikelihood?: keyof typeof LIKELIHOOD_SCORES | null;
  residualImpact?: keyof typeof IMPACT_SCORES | null;
  residualAssessmentStatus?: string;
}): number | null {
  if (
    input.residualAssessmentStatus === 'unassessed' ||
    !input.residualLikelihood ||
    !input.residualImpact
  )
    return null;
  return getRiskScore(input.residualLikelihood, input.residualImpact).raw;
}
/** Preserve the classification originally displayed for pre-versioned acceptances. */
export function legacyAcceptanceLevel(
  likelihood: keyof typeof LIKELIHOOD_SCORES,
  impact: keyof typeof IMPACT_SCORES,
): RiskLevel {
  const score = Math.ceil(getRiskScore(likelihood, impact).raw / 2.5);
  return score >= 9
    ? 'very-high'
    : score >= 7
      ? 'high'
      : score >= 5
        ? 'medium'
        : score >= 3
          ? 'low'
          : 'very-low';
}
export const LEGACY_LEVEL_LABEL: Record<RiskLevel, string> = {
  'very-low': 'Very low',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  'very-high': 'Very high',
};
