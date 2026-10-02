export * from '@trycompai/db/risk-scoring';
import type { RiskLevel } from '@trycompai/db/risk-scoring';
export const LEVEL_COLOR: Record<RiskLevel, string> = {
  'very-low': 'var(--success)',
  low: 'var(--success)',
  medium: 'var(--warning)',
  high: 'color-mix(in oklab, var(--warning) 50%, var(--destructive))',
  'very-high': 'var(--destructive)',
};
