import { Text } from '@trycompai/design-system';

export function CompletionExplanation({ aggregation }: { aggregation: 'framework' | 'requirement' }) {
  return <Text size="sm" variant="muted">
    Completion tracks work status; it is not a reviewed compliance assessment.
    A control counts published policies, tasks marked done or not relevant, and required forms
    with a submission within the last 180 days. Forms marked not relevant are excluded.
    {' '}{aggregation === 'framework'
      ? 'The framework percentage counts completed items across unique linked policies, tasks and form types; shared items count once.'
      : 'The requirement percentage is the average completion of its linked controls.'}
    {' '}Linked ISMS documents and their approval status are displayed separately and do not affect this percentage.
  </Text>;
}
