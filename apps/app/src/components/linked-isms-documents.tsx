import { ismsTypeToSlug } from '@/app/(app)/[orgId]/documents/isms/isms-types';
import type { LinkedIsmsDocument } from '@/lib/types/linked-isms-document';
import { Badge, Stack, Text } from '@trycompai/design-system';
import Link from 'next/link';

export function LinkedIsmsDocuments({ links, orgId }: { links: LinkedIsmsDocument[]; orgId: string }) {
  return (
    <Stack gap="md">
      <Text size="sm" variant="muted">
        Linked ISMS documents and their published versions. Approval status is shown separately
        and does not contribute to policy, task or evidence-form completion.
      </Text>
      {links.length === 0 && <Text size="sm" variant="muted">No ISMS documents linked yet.</Text>}
      {links.map(({ ismsDocument: document }) => (
        <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
          <Link className="font-medium text-primary underline underline-offset-4"
            href={`/${orgId}/documents/isms/${ismsTypeToSlug(document.type)}`}>
            {document.title}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            {document.currentVersion?.publishedAt
              ? <Badge variant="default">Approved · v{document.currentVersion.version}</Badge>
              : <Badge variant="secondary">No published version</Badge>}
            <Text size="sm" variant="muted">Working copy: {document.status.replaceAll('_', ' ')}</Text>
          </div>
        </div>
      ))}
    </Stack>
  );
}
