/** Render captured editor/ISMS data as readable text, never executable HTML. */
export function snapshotText(value: unknown, depth = 0): string {
  if (depth > 14 || value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value))
    return value
      .map((v) => snapshotText(v, depth + 1))
      .filter(Boolean)
      .join('\n');
  if (typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  if (typeof record.text === 'string') return record.text;
  if (Array.isArray(record.content))
    return record.content
      .map((v) => snapshotText(v, depth + 1))
      .join(record.type === 'paragraph' || record.type === 'heading' ? '' : '\n\n');
  return Object.entries(record)
    .filter(
      ([key]) =>
        ![
          'id',
          'documentId',
          'organizationId',
          'frameworkId',
          'sourceSnapshot',
          'pdfUrl',
          'docxUrl',
          'attrs',
          'marks',
          'type',
        ].includes(key),
    )
    .map(([key, v]) => {
      const text = snapshotText(v, depth + 1);
      return text ? `${key.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ')}: ${text}` : '';
    })
    .filter(Boolean)
    .join('\n\n');
}
