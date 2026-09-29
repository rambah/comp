'use client';

import { AttachmentPreviewDialog } from '@/components/attachments/AttachmentPreviewDialog';
import type { PreviewAttachment } from '@/components/attachments/attachment-preview-types';
import { useCommentActions } from '@/hooks/use-comments-api';
import { useMentionableMembers } from '@/hooks/use-mentionable-members';
import type { JSONContent } from '@tiptap/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@trycompai/design-system';
import { Button } from '@trycompai/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@trycompai/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@trycompai/ui/tooltip';
import { AlertTriangle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatRelativeTime } from '../../app/(app)/[orgId]/tasks/[taskId]/components/commentUtils';
import { CommentAttachments } from './CommentAttachments';
import { CommentContentView } from './CommentContentView';
import { CommentRichTextField } from './CommentRichTextField';
import type { CommentWithAuthor } from './Comments';

// Helper function to generate gravatar URL
function getGravatarUrl(email: string | null | undefined, size = 64): string {
  if (!email)
    return `https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&s=${size}`;

  // Simple MD5 hash implementation for gravatar
  // In production, you might want to use a proper library or server-side generation
  const emailHash = email.toLowerCase().trim();
  // For now, we'll use the email as a placeholder - ideally this should be MD5 hashed
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(emailHash)}&size=${size}`;
}

interface CommentItemProps {
  comment: CommentWithAuthor;
  refreshComments: () => void;
  readOnly?: boolean;
  entityType: string;
}

export function CommentItem({
  comment,
  refreshComments,
  readOnly = false,
  entityType,
}: CommentItemProps) {
  const [previewAttachment, setPreviewAttachment] = useState<PreviewAttachment | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<JSONContent | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Use API hooks instead of server actions
  const { updateComment, deleteComment } = useCommentActions();
  const { members: mentionMembers } = useMentionableMembers(entityType);

  // Parse comment content to JSONContent
  const parseContent = (content: string): JSONContent | null => {
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
        return parsed as JSONContent;
      }
    } catch {
      // Not JSON, return null
    }
    return null;
  };

  // Convert JSONContent to string for API
  const contentToString = (content: JSONContent | null): string => {
    if (!content) return '';
    return JSON.stringify(content);
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      // Parse existing content or create empty content
      const parsed = parseContent(comment.content);
      setEditedContent(parsed);
    }
    setIsEditing(!isEditing);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    const contentString = contentToString(editedContent);
    const contentChanged = contentString !== comment.content;

    if (!contentChanged) {
      toast.info('No changes detected.');
      setIsEditing(false);
      return;
    }

    try {
      // Use API hook directly instead of server action
      await updateComment(comment.id, { content: contentString });

      toast.success('Comment updated successfully.');
      refreshComments();
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to save comment changes.');
      console.error('Save changes error:', error);
    }
  };

  const handleDeleteComment = async () => {
    setIsDeleting(true);
    try {
      await deleteComment(comment.id);
      toast.success('Comment deleted successfully.');
      refreshComments();
      setIsDeleteOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete comment.');
      console.error('Delete comment error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <AttachmentPreviewDialog
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
      <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card hover:shadow-sm transition-all group">
        <div className="relative">
          <Avatar>
            <AvatarImage
              src={comment.author.image || getGravatarUrl(comment.author.email)}
              alt={comment.author.name ?? 'User'}
            />
            <AvatarFallback>{comment.author.name?.charAt(0).toUpperCase() ?? '?'}</AvatarFallback>
          </Avatar>
          {comment.author.deactivated && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute -bottom-0.5 -right-0.5 rounded-full">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 fill-yellow-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This user is deactivated.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex-1 items-start space-y-2 text-sm">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="leading-none font-medium">
                  {comment.author.name ?? 'Unknown User'}
                </span>
                <span className="text-muted-foreground text-xs">
                  {!isEditing ? formatRelativeTime(comment.createdAt) : 'Editing...'}
                </span>
              </div>
              {!isEditing && !readOnly && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Comment options"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={handleEditToggle}>
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      onSelect={() => setIsDeleteOpen(true)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {!isEditing ? (
              <CommentContentView content={comment.content} />
            ) : (
              <CommentRichTextField
                value={editedContent}
                onChange={setEditedContent}
                members={mentionMembers}
                disabled={false}
                placeholder="Edit comment..."
              />
            )}

            {comment.attachments.length > 0 && (
              <CommentAttachments
                attachments={comment.attachments}
                onPreview={setPreviewAttachment}
              />
            )}

            {isEditing && (
              <div className="flex justify-end gap-2 pt-3">
                <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteComment}
              loading={isDeleting}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
