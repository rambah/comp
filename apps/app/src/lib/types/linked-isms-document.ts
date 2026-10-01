import type { IsmsDocumentStatus, IsmsDocumentType } from '@db';
export interface LinkedIsmsDocument {
  ismsDocument: {
    id: string;
    type: IsmsDocumentType;
    title: string;
    status: IsmsDocumentStatus;
    currentVersion: { version: number; publishedAt: string | null } | null;
  };
}
