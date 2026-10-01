'use client';

import { useTaskItemsStats, type TaskItemEntityType } from '@/hooks/use-task-items';
import type { TaskStatus } from '@db';
import { Text } from '@trycompai/design-system';
import Link from 'next/link';

/** TaskItem statistics cover every page, not just the currently visible task list. */
export function TreatmentTaskProgress({ orgId, entityId, entityType, tasks }: {
  orgId: string;
  entityId: string;
  entityType: TaskItemEntityType;
  tasks: { status: TaskStatus }[];
}) {
  const { data, error } = useTaskItemsStats(entityId, entityType);
  const stats = data?.data;
  const evidenceDone = tasks.filter((task) => task.status === 'done' || task.status === 'not_relevant').length;
  const href = `/${orgId}/${entityType === 'risk' ? 'risk' : 'vendors'}/${entityId}?tab=tasks`;

  if (error || data?.error) {
    return <Text size="sm" variant="muted">Task total unavailable: manual tasks could not be loaded.</Text>;
  }
  if (!stats) return <Text size="sm" variant="muted">Loading task totals, including manual tasks…</Text>;

  const canceled = stats.byStatus.canceled;
  const total = tasks.length + stats.total;
  const active = total - canceled;
  const completed = evidenceDone + stats.byStatus.done;
  const percent = active > 0 ? Math.round(completed / active * 100) : 0;

  return (
    <div className="flex flex-col gap-1" aria-label="Treatment task progress">
      <p>Task completion: {completed}/{active} ({percent}%) · {total} tasks total</p>
      <Text size="sm" variant="muted">
        Evidence tasks: {evidenceDone}/{tasks.length}. Manual tasks: {stats.byStatus.done}/{stats.total}.
        {canceled > 0 && ` ${canceled} canceled manual tasks excluded from completion, not counted as done.`}
      </Text>
      <Link href={href} className="text-sm text-primary underline underline-offset-4">View manual tasks</Link>
    </div>
  );
}
