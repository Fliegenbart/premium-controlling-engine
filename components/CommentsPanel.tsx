'use client';

import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  ChevronDown,
  ChevronRight,
  Flag
} from 'lucide-react';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  status: 'open' | 'resolved' | 'acknowledged';
  priority: 'low' | 'normal' | 'high';
  createdAt: string;
  updatedAt: string;
}

interface CommentsPanelProps {
  targetType: 'account' | 'analysis' | 'booking' | 'document';
  targetId: string;
  targetLabel?: string;
  authToken?: string;
}

export default function CommentsPanel({ targetType, targetId, targetLabel, authToken }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [expandedComments, setExpandedComments] = useState<string[]>([]);

  useEffect(() => {
    loadComments();
  }, [targetType, targetId]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/comments?targetType=${targetType}&targetId=${targetId}`
      );
      const data = await response.json();
      if (data.success) {
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !authToken) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          targetType,
          targetId,
          content: newComment,
          priority
        })
      });

      const data = await response.json();
      if (data.success) {
        setComments([data.comment, ...comments]);
        setNewComment('');
        setPriority('normal');
      } else {
        alert(data.error);
      }
    } catch {
      alert('Kommentar konnte nicht erstellt werden');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (commentId: string, status: Comment['status']) => {
    if (!authToken) return;

    try {
      const response = await fetch('/api/comments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ commentId, status })
      });

      const data = await response.json();
      if (data.success) {
        setComments(comments.map(c =>
          c.id === commentId ? { ...c, status } : c
        ));
      }
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'acknowledged': return <Clock className="w-4 h-4 text-yellow-400" />;
      default: return <AlertCircle className="w-4 h-4 text-blue-400" />;
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'high': return 'text-red-400 bg-red-500/20';
      case 'low': return 'text-gray-400 bg-gray-500/20';
      default: return 'text-blue-400 bg-blue-500/20';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-[#12121a] rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-medium">Kommentare</h3>
            {targetLabel && (
              <span className="text-gray-500 text-sm">· {targetLabel}</span>
            )}
          </div>
          <span className="text-gray-500 text-sm">{comments.length} Einträge</span>
        </div>
      </div>

      {/* New Comment */}
      {authToken && (
        <div className="p-4 border-b border-white/10 bg-white/5">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Kommentar hinzufügen..."
            className="w-full px-3 py-2 bg-black/30 text-white rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 text-sm resize-none"
            rows={2}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs">Priorität:</span>
              {(['low', 'normal', 'high'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-2 py-1 rounded text-xs ${
                    priority === p
                      ? getPriorityColor(p)
                      : 'text-gray-500 bg-white/5'
                  }`}
                >
                  {p === 'high' ? 'Hoch' : p === 'low' ? 'Niedrig' : 'Normal'}
                </button>
              ))}
            </div>
            <button
              onClick={submitComment}
              disabled={isSubmitting || !newComment.trim()}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg text-sm transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Senden
            </button>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin mx-auto" />
          </div>
        ) : comments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Noch keine Kommentare</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {comments.map((comment) => (
              <div key={comment.id} className="p-4 hover:bg-white/5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{comment.userName}</p>
                      <p className="text-gray-500 text-xs">{formatDate(comment.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {comment.priority === 'high' && (
                      <Flag className="w-4 h-4 text-red-400" />
                    )}
                    {getStatusIcon(comment.status)}
                  </div>
                </div>
                <p className="text-gray-300 text-sm mt-2 ml-9">{comment.content}</p>

                {/* Status buttons */}
                {authToken && (
                  <div className="flex items-center gap-2 mt-2 ml-9">
                    {comment.status !== 'resolved' && (
                      <button
                        onClick={() => updateStatus(comment.id, 'resolved')}
                        className="text-xs text-green-400 hover:text-green-300"
                      >
                        Erledigt
                      </button>
                    )}
                    {comment.status === 'open' && (
                      <button
                        onClick={() => updateStatus(comment.id, 'acknowledged')}
                        className="text-xs text-yellow-400 hover:text-yellow-300"
                      >
                        Zur Kenntnis
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
