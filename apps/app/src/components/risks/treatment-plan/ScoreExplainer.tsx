export function ScoreExplainer() {
  return (
    <div className="space-y-2 py-3 text-sm text-muted-foreground">
      <p>
        Inherent and Current Risk use their separately saved likelihood × impact, each on a scale of
        1–5. Current Risk is the saved residual assessment; missing assessments remain “Not yet
        assessed”.
      </p>
      <p>Scores: Low 1–4; Medium 5–9; High 10–16; Critical 17–25. All scores are out of 25.</p>
      <p>
        The suggested target is a forecast based on treatment strategy and linked-task completion
        (done or not relevant ÷ total). Progress interpolates between inherent and the suggested
        full-completion target. Without linked tasks no target is shown.
      </p>
      <p>
        A suggestion never changes the stored assessment. Selecting a strategy does not record an
        acceptance. Historical acceptances retain their original rating and scoring method.
      </p>
    </div>
  );
}
