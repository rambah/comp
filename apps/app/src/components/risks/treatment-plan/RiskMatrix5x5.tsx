'use client';
import {
  getRiskLevel,
  IMPACT_SCORES,
  LEVEL_COLOR,
  LEVEL_LABEL,
  LIKELIHOOD_SCORES,
} from '@/lib/risk-score';
import type { Impact, Likelihood } from '@db';
interface RiskMatrix5x5Props {
  inherentLikelihood: Likelihood;
  inherentImpact: Impact;
  residualLikelihood?: Likelihood;
  residualImpact?: Impact;
  completion?: number;
  preliminary?: boolean;
}
export function RiskMatrix5x5({
  inherentLikelihood,
  inherentImpact,
  residualLikelihood,
  residualImpact,
  preliminary,
}: RiskMatrix5x5Props) {
  return (
    <div className="rounded-md bg-muted p-4">
      <h3 className="mb-3 text-sm">5×5 Risk Matrix · saved assessments</h3>
      <div className="grid grid-cols-5 gap-1">
        {[5, 4, 3, 2, 1].flatMap((l) =>
          [1, 2, 3, 4, 5].map((i) => {
            const inherent =
              LIKELIHOOD_SCORES[inherentLikelihood] === l && IMPACT_SCORES[inherentImpact] === i;
            const current =
              residualLikelihood &&
              residualImpact &&
              LIKELIHOOD_SCORES[residualLikelihood] === l &&
              IMPACT_SCORES[residualImpact] === i;
            const level = getRiskLevel(l * i);
            return (
              <div
                key={`${l}-${i}`}
                title={`Likelihood ${l} × Impact ${i} = ${l * i}/25 · ${LEVEL_LABEL[level]}`}
                className="flex min-h-12 flex-col items-center justify-center rounded border text-xs"
                style={{
                  background: `color-mix(in oklab, ${LEVEL_COLOR[level]} 25%, transparent)`,
                }}
              >
                <span>{l * i}</span>
                {inherent && <strong>Inherent</strong>}
                {current && <strong>Current</strong>}
              </div>
            );
          }),
        )}
      </div>
      <p className="mt-2 text-xs">Likelihood: 5 → 1 top to bottom · Impact: 1 → 5 left to right</p>
      <p className="mt-2 text-xs">Low 1–4 · Medium 5–9 · High 10–16 · Critical 17–25</p>
      {preliminary && <p className="text-xs">Preliminary — assessment still running</p>}
    </div>
  );
}
