'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@trycompai/design-system';
import { Close, Download } from '@trycompai/design-system/icons';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  attachmentContentUrl,
  getPreviewType,
  type PreviewAttachment,
} from './attachment-preview-types';
import styles from './attachment-preview.module.css';

type PreviewContent = { text?: string; url?: string; error?: string };

export function AttachmentPreviewDialog({
  attachment,
  onClose,
}: {
  attachment: PreviewAttachment | null;
  onClose: () => void;
}) {
  // Mount fresh content per file; a late response cannot replace another preview.
  if (!attachment) return null;
  return <Preview key={attachment.id} attachment={attachment} onClose={onClose} />;
}

function Preview({ attachment, onClose }: { attachment: PreviewAttachment; onClose: () => void }) {
  const kind = getPreviewType(attachment.name);
  const [content, setContent] = useState<PreviewContent | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (kind === 'unsupported') return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setContent(null);
    async function load() {
      try {
        const response = await fetch(attachmentContentUrl({ attachment }), {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            response.status === 413
              ? 'This file is too large to preview. Please download it.'
              : 'Unable to load this attachment. Please try again.',
          );
        }
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        if (kind === 'markdown' || kind === 'text') {
          if (blob.size > 2 * 1024 * 1024)
            throw new Error('This document is too large to preview. Please download it.');
          const text = await blob.text();
          if (!controller.signal.aborted) setContent({ text });
        } else {
          objectUrl = URL.createObjectURL(
            kind === 'pdf' ? new Blob([blob], { type: 'application/pdf' }) : blob,
          );
          setContent({ url: objectUrl });
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setContent({
            error: error instanceof Error ? error.message : 'Unable to load attachment.',
          });
      }
    }
    void load();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment, kind, attempt]);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        padding="lg"
        showCloseButton={false}
        style={{
          width: 'calc(100vw - 3rem)',
          maxWidth: '1200px',
          maxHeight: '90dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="absolute top-3 right-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={onClose}
            iconLeft={<Close size={20} />}
          />
        </div>
        <div className="shrink-0 pr-8">
          <DialogHeader>
            <DialogTitle>
              <span className="block break-all text-lg leading-snug">{attachment.name}</span>
            </DialogTitle>
            <DialogDescription>Evidence preview</DialogDescription>
          </DialogHeader>
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              iconLeft={<Download size={16} />}
              render={
                <a
                  href={attachmentContentUrl({ attachment, download: true })}
                  download={attachment.name}
                />
              }
            >
              Download
            </Button>
          </div>
        </div>
        <div
          className="min-h-0 flex-1 overflow-auto rounded-md border bg-background p-4 sm:p-8"
          style={{ minHeight: '240px' }}
        >
          {kind === 'unsupported' ? (
            <p className="text-muted-foreground">
              No preview is available for this file type. You can download the original file above.
            </p>
          ) : content?.error ? (
            <div role="alert" className="space-y-4">
              <p>{content.error}</p>
              <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
                Try again
              </Button>
            </div>
          ) : !content ? (
            <p role="status" className="text-muted-foreground">
              Loading preview…
            </p>
          ) : kind === 'markdown' ? (
            <article className={styles.markdown}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                skipHtml
                components={{
                  a: ({ children, href }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                  // Do not load third-party tracking images embedded in evidence documents.
                  img: ({ alt }) => (
                    <span className="text-muted-foreground">
                      [Image: {alt || 'embedded image'}]
                    </span>
                  ),
                }}
              >
                {content.text || ''}
              </ReactMarkdown>
            </article>
          ) : kind === 'text' ? (
            <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">
              {content.text}
            </pre>
          ) : kind === 'image' ? (
            <img
              src={content.url}
              alt={attachment.name}
              className="mx-auto max-h-[65dvh] max-w-full object-contain"
              onError={() =>
                setContent({ error: 'Unable to display this image. Please download the original.' })
              }
            />
          ) : (
            <iframe
              title={attachment.name}
              src={content.url}
              className="h-[65dvh] w-full border-0"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
