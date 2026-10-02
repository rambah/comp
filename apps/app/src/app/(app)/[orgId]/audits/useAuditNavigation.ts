'use client';

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';

const navigationParsers = {
  auditId: parseAsString.withDefault(''),
  tab: parseAsStringLiteral([
    'checks',
    'sources',
    'evidence',
    'requests',
    'findings',
    'report',
    'research',
  ] as const).withDefault('checks'),
  checkId: parseAsString,
  evidenceId: parseAsString,
  compareId: parseAsString,
  findingId: parseAsString,
  checkLayout: parseAsStringLiteral(['board', 'list'] as const).withDefault('board'),
  threadId: parseAsString,
  sourceKey: parseAsString,
};

/** Keep workspace destinations in the URL so Back, Forward and reload restore them. */
export function useAuditNavigation({ defaultAuditId }: { defaultAuditId: string }) {
  const [navigation, setNavigation] = useQueryStates(navigationParsers, {
    history: 'push',
    shallow: true,
    scroll: false,
  });
  const navigate = (next: Partial<typeof navigation>) => {
    void setNavigation({ auditId: navigation.auditId || defaultAuditId, ...next });
  };
  return { ...navigation, navigate };
}
