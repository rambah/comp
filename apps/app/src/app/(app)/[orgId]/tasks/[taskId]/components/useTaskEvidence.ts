'use client';

import { useTaskAttachmentActions, useTaskAttachments } from '@/hooks/use-tasks-api';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

// Helper function to provide user-friendly error messages
function getErrorMessage(errorMessage: string): string {
  // Simplified error handling since API errors are already user-friendly
  return errorMessage || 'Failed to upload file. Please try again.';
}

export function useTaskEvidence(taskId: string) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [busyAttachmentId, setBusyAttachmentId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileList | File[] | null>(null);

  // Use SWR to fetch attachments with real-time updates
  const {
    data: attachmentsData,
    error: attachmentsError,
    isLoading: attachmentsLoading,
    mutate: refreshAttachments,
  } = useTaskAttachments(taskId);

  // Use API hooks for mutations
  const { uploadAttachment, deleteAttachment } = useTaskAttachmentActions(taskId);

  // Extract attachments from SWR response
  const attachments = attachmentsData?.data || [];

  const resetState = () => {
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Process files (used by both file input and drag & drop)
  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!files || files.length === 0) return;
      setIsUploading(true);

      // Blocked file extensions for security
      const BLOCKED_EXTENSIONS = [
        'exe',
        'bat',
        'cmd',
        'com',
        'scr',
        'msi', // Windows executables
        'js',
        'vbs',
        'vbe',
        'wsf',
        'wsh',
        'ps1', // Scripts
        'sh',
        'bash',
        'zsh', // Shell scripts
        'dll',
        'sys',
        'drv', // System files
        'app',
        'deb',
        'rpm', // Application packages
        'jar', // Java archives (can execute)
        'pif',
        'lnk',
        'cpl', // Shortcuts and control panel
        'hta',
        'reg', // HTML apps and registry
      ];

      const uploadPromises = Array.from(files).map((file) => {
        return new Promise((resolve) => {
          // Check file extension
          const fileExt = file.name.split('.').pop()?.toLowerCase();
          if (fileExt && BLOCKED_EXTENSIONS.includes(fileExt)) {
            toast.error(
              `File "${file.name}" has a blocked extension (.${fileExt}) for security reasons.`,
            );
            return resolve(null);
          }

          const MAX_FILE_SIZE_MB = 100;
          const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
          if (file.size > MAX_FILE_SIZE_BYTES) {
            toast.error(`File "${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
            return resolve(null); // Resolve to skip this file
          }

          // Use the API hook's uploadAttachment method
          uploadAttachment(file)
            .then((result) => {
              toast.success(`File "${file.name}" uploaded successfully.`);
              // Refresh attachments via SWR after successful upload
              refreshAttachments();
              resolve(result);
            })
            .catch((error) => {
              console.error(`Failed to upload ${file.name}:`, error);
              const userFriendlyMessage = getErrorMessage(
                error instanceof Error ? error.message : 'Unknown error',
              );
              toast.error(`Failed to upload ${file.name}: ${userFriendlyMessage}`);
              resolve(null); // Resolve even if there's an error to not break Promise.all
            });
        });
      });

      await Promise.all(uploadPromises);

      // Refresh attachments via SWR instead of manual router refresh
      refreshAttachments();
      resetState();
    },
    [uploadAttachment, refreshAttachments],
  );

  const initiateUpload = useCallback((files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setPendingFiles(files);
    setShowReminderDialog(true);
  }, []);

  const handleReminderConfirm = useCallback(() => {
    setShowReminderDialog(false);
    if (pendingFiles) {
      processFiles(pendingFiles);
      setPendingFiles(null);
    }
  }, [pendingFiles, processFiles]);

  const handleReminderClose = useCallback(() => {
    setShowReminderDialog(false);
    setPendingFiles(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFileSelectMultiple = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      initiateUpload(files);
    },
    [initiateUpload],
  );

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone itself
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (isUploading || busyAttachmentId) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        initiateUpload(Array.from(files));
      }
    },
    [isUploading, busyAttachmentId, initiateUpload],
  );

  const handleDeleteAttachment = useCallback(
    async (attachmentId: string) => {
      setBusyAttachmentId(attachmentId);
      try {
        await deleteAttachment(attachmentId);
        toast.success('Attachment deleted successfully.');
        // Refresh attachments via SWR instead of manual router refresh
        refreshAttachments();
      } catch (error) {
        console.error('Failed to delete attachment:', error);
        toast.error('Failed to delete attachment. Please try again.');
      } finally {
        setBusyAttachmentId(null);
      }
    },
    [deleteAttachment, refreshAttachments],
  );

  return {
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
  };
}
