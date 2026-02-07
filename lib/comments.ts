/**
 * Comment System
 * Allows controllers to add notes and comments to accounts/analyses
 */

import { randomBytes } from 'crypto';

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  targetType: 'account' | 'analysis' | 'booking' | 'document';
  targetId: string;
  content: string;
  status?: 'open' | 'resolved' | 'acknowledged';
  priority?: 'low' | 'normal' | 'high';
  createdAt: string;
  updatedAt: string;
  parentId?: string; // For threaded comments
  mentions?: string[]; // User IDs mentioned
  attachments?: CommentAttachment[];
}

export interface CommentAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

export interface CommentThread {
  root: Comment;
  replies: Comment[];
  replyCount: number;
}

// In-memory store (replace with DB in production)
const comments: Map<string, Comment> = new Map();

/**
 * Create a new comment
 */
export async function createComment(
  userId: string,
  userName: string,
  targetType: Comment['targetType'],
  targetId: string,
  content: string,
  options: {
    parentId?: string;
    priority?: Comment['priority'];
    mentions?: string[];
  } = {}
): Promise<Comment> {
  const comment: Comment = {
    id: `comment-${Date.now()}-${randomBytes(4).toString('hex')}`,
    userId,
    userName,
    targetType,
    targetId,
    content,
    status: 'open',
    priority: options.priority || 'normal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    parentId: options.parentId,
    mentions: options.mentions
  };

  comments.set(comment.id, comment);
  return comment;
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  updates: Partial<Pick<Comment, 'content' | 'status' | 'priority'>>
): Promise<Comment | null> {
  const comment = comments.get(commentId);
  if (!comment) return null;

  const updated: Comment = {
    ...comment,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  comments.set(commentId, updated);
  return updated;
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string): Promise<boolean> {
  return comments.delete(commentId);
}

/**
 * Get comments for a target
 */
export async function getComments(
  targetType: Comment['targetType'],
  targetId: string,
  options: {
    includeReplies?: boolean;
    status?: Comment['status'];
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ comments: Comment[]; total: number }> {
  let filtered = Array.from(comments.values())
    .filter(c => c.targetType === targetType && c.targetId === targetId);

  // Filter by status
  if (options.status) {
    filtered = filtered.filter(c => c.status === options.status);
  }

  // Exclude replies if not requested
  if (!options.includeReplies) {
    filtered = filtered.filter(c => !c.parentId);
  }

  // Sort by creation date descending
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = filtered.length;
  const offset = options.offset || 0;
  const limit = options.limit || 50;

  return {
    comments: filtered.slice(offset, offset + limit),
    total
  };
}

/**
 * Get comment thread
 */
export async function getCommentThread(commentId: string): Promise<CommentThread | null> {
  const root = comments.get(commentId);
  if (!root) return null;

  const replies = Array.from(comments.values())
    .filter(c => c.parentId === commentId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return {
    root,
    replies,
    replyCount: replies.length
  };
}

/**
 * Get single comment by ID
 */
export async function getCommentById(commentId: string): Promise<Comment | null> {
  return comments.get(commentId) || null;
}

/**
 * Get all comments by user
 */
export async function getUserComments(userId: string): Promise<Comment[]> {
  return Array.from(comments.values())
    .filter(c => c.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get comment statistics
 */
export async function getCommentStats(
  targetType?: Comment['targetType'],
  targetId?: string
): Promise<{
  total: number;
  open: number;
  resolved: number;
  byPriority: Record<string, number>;
}> {
  let filtered = Array.from(comments.values());

  if (targetType) {
    filtered = filtered.filter(c => c.targetType === targetType);
  }
  if (targetId) {
    filtered = filtered.filter(c => c.targetId === targetId);
  }

  return {
    total: filtered.length,
    open: filtered.filter(c => c.status === 'open').length,
    resolved: filtered.filter(c => c.status === 'resolved').length,
    byPriority: {
      high: filtered.filter(c => c.priority === 'high').length,
      normal: filtered.filter(c => c.priority === 'normal').length,
      low: filtered.filter(c => c.priority === 'low').length
    }
  };
}

/**
 * Search comments
 */
export async function searchComments(
  query: string,
  options: {
    targetType?: Comment['targetType'];
    userId?: string;
    limit?: number;
  } = {}
): Promise<Comment[]> {
  const lowerQuery = query.toLowerCase();

  let results = Array.from(comments.values())
    .filter(c => c.content.toLowerCase().includes(lowerQuery));

  if (options.targetType) {
    results = results.filter(c => c.targetType === options.targetType);
  }

  if (options.userId) {
    results = results.filter(c => c.userId === options.userId);
  }

  return results
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, options.limit || 20);
}

/**
 * Bulk operations for comments
 */
export async function bulkUpdateStatus(
  commentIds: string[],
  status: Comment['status']
): Promise<number> {
  let updated = 0;

  for (const id of commentIds) {
    const result = await updateComment(id, { status });
    if (result) updated++;
  }

  return updated;
}

/**
 * Export comments for a target
 */
export async function exportComments(
  targetType: Comment['targetType'],
  targetId: string
): Promise<{
  targetType: Comment['targetType'];
  targetId: string;
  exportedAt: string;
  comments: Comment[];
}> {
  const { comments: targetComments } = await getComments(targetType, targetId, {
    includeReplies: true,
    limit: 1000
  });

  return {
    targetType,
    targetId,
    exportedAt: new Date().toISOString(),
    comments: targetComments
  };
}
