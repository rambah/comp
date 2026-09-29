export interface PreviewAttachment {
  id: string;
  name: string;
}

export function getPreviewType(name: string) {
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'md' || extension === 'markdown') return 'markdown';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp'].includes(extension || ''))
    return 'image';
  if (extension === 'pdf') return 'pdf';
  if (['txt', 'json', 'csv', 'log', 'yaml', 'yml'].includes(extension || '')) return 'text';
  return 'unsupported';
}

export function attachmentContentUrl({
  attachment,
  download = false,
}: {
  attachment: PreviewAttachment;
  download?: boolean;
}) {
  const query = new URLSearchParams({ name: attachment.name });
  if (download) query.set('download', '1');
  return `/api/attachments/${encodeURIComponent(attachment.id)}/content?${query}`;
}
