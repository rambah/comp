'use client';

import { AttachmentPreviewDialog } from '@/components/attachments/AttachmentPreviewDialog';
import type { PreviewAttachment } from '@/components/attachments/attachment-preview-types';
import { Button } from '@trycompai/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@trycompai/ui/dialog';
import { Camera, FileIcon, FileText, ImageIcon, Loader2, Upload, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useTaskEvidence } from './useTaskEvidence';

interface TaskBodyProps {
  taskId: string;
  title?: string;
  description?: string;
  onTitleChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
}

function formatUploadMonthYear(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function TaskBody({
  taskId,
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  disabled,
}: TaskBodyProps) {
  const [previewAttachment, setPreviewAttachment] = useState<PreviewAttachment | null>(null);
  const {
    fileInputRef,
    isUploading,
    busyAttachmentId,
    isDragging,
    showReminderDialog,
    attachmentsData,
    attachmentsError,
    attachmentsLoading,
    attachments,
    handleFileSelectMultiple,
    triggerFileInput,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDeleteAttachment,
    handleReminderClose,
    handleReminderConfirm,
  } = useTaskEvidence(taskId);

  return (
    <div className="flex flex-col gap-4">
      <AttachmentPreviewDialog
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelectMultiple}
        className="hidden"
        disabled={isUploading || !!busyAttachmentId}
        multiple
      />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Attachments
          </h3>
        </div>

        {/* Show error state if attachments failed to load */}
        {attachmentsError && (
          <p className="text-destructive text-sm">Failed to load attachments. Please try again.</p>
        )}

        <div className="space-y-3">
          {/* Loading skeleton for attachments */}
          {(attachmentsLoading || attachmentsData === undefined) && (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-muted/30 border border-border/50 rounded-md h-8 animate-pulse"
                  style={{ width: `${80 + i * 20}px` }}
                >
                  <div className="w-3.5 h-3.5 bg-muted/50 rounded" />
                  <div className="flex-1 h-3 bg-muted/50 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Existing attachments list */}
          {!attachmentsLoading && attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment) => {
                const isBusy = busyAttachmentId === attachment.id;
                const fileExt = attachment.name.split('.').pop()?.toLowerCase() || '';
                const isPDF = fileExt === 'pdf';
                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);
                const isDoc = ['doc', 'docx'].includes(fileExt);
                const uploadMonthYear = formatUploadMonthYear(attachment.createdAt);

                const getFileTypeStyles = () => {
                  if (isPDF)
                    return 'bg-primary/10 border-primary/20 hover:bg-primary/20 hover:border-primary/30';
                  if (isImage)
                    return 'bg-primary/10 border-primary/20 hover:bg-primary/20 hover:border-primary/30';
                  if (isDoc)
                    return 'bg-primary/10 border-primary/20 hover:bg-primary/20 hover:border-primary/30';
                  return 'bg-muted/50 border-border hover:bg-muted/70';
                };

                const getFileIconColor = () => {
                  if (isPDF || isImage || isDoc) return 'text-primary';
                  return 'text-muted-foreground';
                };

                return (
                  <div
                    key={attachment.id}
                    className={`inline-flex items-center gap-2 px-2.5 py-1.5 border rounded-md transition-all group ${getFileTypeStyles()} `}
                  >
                    {isPDF ? (
                      <FileText className={`h-3.5 w-3.5 ${getFileIconColor()}`} />
                    ) : isImage ? (
                      <ImageIcon className={`h-3.5 w-3.5 ${getFileIconColor()}`} />
                    ) : isDoc ? (
                      <FileText className={`h-3.5 w-3.5 ${getFileIconColor()}`} />
                    ) : (
                      <FileIcon className={`h-3.5 w-3.5 ${getFileIconColor()}`} />
                    )}
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setPreviewAttachment(attachment)}
                      disabled={isBusy || isUploading}
                      className="h-auto p-0 text-sm max-w-[200px] truncate"
                      title={attachment.name}
                    >
                      {attachment.name}
                    </Button>
                    {uploadMonthYear && (
                      <span className="text-xs text-muted-foreground">({uploadMonthYear})</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAttachment(attachment.id)}
                      disabled={isBusy || isUploading}
                      className="h-auto w-auto p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-transparent"
                    >
                      {isBusy ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Drag and drop zone - always visible */}
          <Button
            variant="outline"
            onClick={triggerFileInput}
            disabled={isUploading || !!busyAttachmentId}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="group w-full h-auto rounded-md border-dashed border-2 px-6 py-8 text-center transition-all hover:border-primary/50 hover:bg-accent/30"
            style={{
              borderColor: isDragging ? 'hsl(var(--primary))' : undefined,
              backgroundColor: isDragging ? 'hsl(var(--accent))' : undefined,
            }}
          >
            <div className="flex flex-col items-center gap-3 pointer-events-none">
              {isUploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <div className="rounded-full bg-muted/50 p-3 transition-colors group-hover:bg-primary/10">
                  <Upload className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium transition-colors group-hover:text-foreground">
                  {isUploading
                    ? 'Uploading...'
                    : isDragging
                      ? 'Drop files here'
                      : 'Drag and drop files here'}
                </span>
                {!isUploading && !isDragging && (
                  <span className="text-xs text-muted-foreground transition-colors group-hover:text-muted-foreground/80">
                    or click to browse • max 100MB • most file types accepted
                  </span>
                )}
              </div>
            </div>
          </Button>
        </div>
      </div>

      <Dialog open={showReminderDialog} onOpenChange={(open) => !open && handleReminderClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle>Screenshot Requirements</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Ensure your organisation name is clearly visible within the screenshot.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Auditors require this to verify the source of the data; without it, evidence may be
            rejected.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={handleReminderClose}>
              Cancel
            </Button>
            <Button onClick={handleReminderConfirm}>Continue Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
