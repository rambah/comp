'use client';
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
} from '@trycompai/design-system';
import type { useAuditDomObserver } from './useAuditDomObserver';

export function AuditFollowBar({
  observer,
  disabled,
}: {
  observer: ReturnType<typeof useAuditDomObserver>;
  disabled: boolean;
}) {
  return (
    <div
      data-audit-live-private
      className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/20 p-4"
    >
      <Text size="sm" weight="medium">
        Follow a live workspace
      </Text>
      <div className="w-56">
        <Select
          value={observer.following ?? 'none'}
          disabled={disabled}
          onValueChange={(value) => observer.setFollowing(value === 'none' ? null : value)}
        >
          <SelectTrigger aria-label="Follow an auditor">
            <SelectValue>
              {observer.following
                ? (observer.current?.name ?? 'Disconnected view')
                : 'My workspace'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">My workspace</SelectItem>
            {observer.participants.map((person) => (
              <SelectItem key={person.memberId} value={person.memberId}>
                {person.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {observer.following ? (
        <>
          <Badge variant="outline">
            {observer.ready && observer.connected ? 'Live · read-only' : 'Synchronizing'}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => observer.setFollowing(null)}>
            Stop following
          </Button>
        </>
      ) : (
        <Text size="sm" variant="muted">
          {!observer.connected
            ? 'Live views are currently unavailable. You can continue auditing.'
            : observer.participants.length
              ? 'Only views shared by their owner appear here.'
              : 'No active shared views.'}
        </Text>
      )}
    </div>
  );
}
