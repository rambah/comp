'use client';

import {
  currentAssessmentScore,
  getRiskLevel,
  getRiskScore,
  LEVEL_COLOR,
  LEVEL_LABEL,
} from '@/lib/risk-score';
import {
  interpolatedResidualScore,
  previewResidual,
  suggestedResidual,
} from '@/lib/suggested-residual';
import type { ReactNode } from 'react';
import type { Impact, Likelihood, RiskTreatmentType, TaskStatus } from '@db';
import { Card, CardContent } from '@trycompai/design-system';
import { RiskScoreBadge } from '../RiskScoreBadge';
import { RiskMatrix5x5 } from './RiskMatrix5x5';
import { ScoreExplainer } from './ScoreExplainer';

interface TreatmentHeroProps {
  inherentLikelihood: Likelihood;
  inherentImpact: Impact;
  residualLikelihood?: Likelihood;
  residualImpact?: Impact;
  residualAssessmentStatus?: string;
  strategy: RiskTreatmentType;
  tasks: { status: TaskStatus }[];
  isEmpty?: boolean;
  taskProgress?: ReactNode;
}
export function TreatmentHero(props: TreatmentHeroProps) {
  const {
    inherentLikelihood,
    inherentImpact,
    residualLikelihood,
    residualImpact,
    strategy,
    tasks,
  } = props;
  const inherent = getRiskScore(inherentLikelihood, inherentImpact);
  const current = currentAssessmentScore(props);
  const target = previewResidual({
    inherentLikelihood,
    inherentImpact,
    strategy,
    hasLinkedWork: tasks.length > 0,
  });
  const targetScore = getRiskScore(target.likelihood, target.impact).score;
  const { completion } = suggestedResidual({
    likelihood: inherentLikelihood,
    impact: inherentImpact,
    strategy,
    tasks,
  });
  const suggestedScore = interpolatedResidualScore({
    inherentScore: inherent.score,
    targetScore,
    completion,
  });
  return (
    <Card>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg">Inherent Risk → Current Risk (Residual)</h2>
            <div
              className="flex items-center gap-4 text-4xl font-mono tabular-nums"
              aria-label={`Inherent ${inherent.score}/25; current ${current === null ? 'not yet assessed' : `${current}/25`}`}
            >
              <span style={{ color: LEVEL_COLOR[inherent.level] }}>{inherent.score}/25</span>
              <span>→</span>
              <span
                style={{ color: current === null ? undefined : LEVEL_COLOR[getRiskLevel(current)] }}
              >
                {current === null ? 'Not yet assessed' : `${current}/25`}
              </span>
            </div>
            <p>
              {LEVEL_LABEL[inherent.level]} →{' '}
              {current === null ? 'Not yet assessed' : LEVEL_LABEL[getRiskLevel(current)]}
            </p>
            <p className="text-sm text-muted-foreground">
              Current Risk is the saved residual matrix assessment. Task progress and acceptance do
              not change this rating.
            </p>
            {props.residualAssessmentStatus === 'legacy' && (
              <p className="text-xs text-muted-foreground">
                Existing stored rating retained. Its assessment provenance predates tracking; review
                and save the matrix to confirm it.
              </p>
            )}
            <div className="border-t pt-3 text-sm flex flex-col gap-2">
              <div>
                Suggested target based on linked evidence-task progress:{' '}
                <RiskScoreBadge score={tasks.length ? suggestedScore : null} />
              </div>
              <div>
                Suggested target at full completion:{' '}
                <RiskScoreBadge score={tasks.length ? targetScore : null} />
              </div>
              {props.taskProgress ?? <div>
                Evidence-task completion: {Math.round(completion * 100)}% ({tasks.length} linked tasks)
              </div>}
              <p className="text-xs text-muted-foreground">
                Target suggestions use linked evidence tasks only. Manual tasks are included in the overall task counter.
                Suggestions require review and an explicit matrix save. They are not current
                assessments or risk-owner acceptances.
              </p>
            </div>
            <details>
              <summary className="cursor-pointer text-sm">How is this score calculated?</summary>
              <ScoreExplainer />
            </details>
          </div>
          <RiskMatrix5x5
            inherentLikelihood={inherentLikelihood}
            inherentImpact={inherentImpact}
            residualLikelihood={current === null ? undefined : residualLikelihood}
            residualImpact={current === null ? undefined : residualImpact}
          />
        </div>
      </CardContent>
    </Card>
  );
}
