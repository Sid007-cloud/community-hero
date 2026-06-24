import React, { useState } from "react";
import { MessageSquare, Send, Clock, User, Shield } from "lucide-react";
import { Issue } from "../types";

interface IssueCommentsProps {
  issue: Issue;
  currentUser: { name: string; email: string; role: 'citizen' | 'admin' } | null;
  onPostComment: (issueId: string, content: string) => Promise<void>;
  containerId?: string;
}

export const IssueComments: React.FC<IssueCommentsProps> = ({
  issue,
  currentUser,
  onPostComment,
  containerId
}) => {
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError("You must be logged in to comment.");
      return;
    }
    const trimmed = commentText.trim();
    if (!trimmed) {
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await onPostComment(issue.id, trimmed);
      setCommentText("");
    } catch (err: any) {
      setError(err?.message || "Failed to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const comments = issue.comments || [];

  // Relative or localized time formatter
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "recently";
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-neutral-150 animate-fade-in" id={containerId || `comments-section-${issue.id}`}>
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-orange-600" />
        <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider">
          Discussion & Progress Updates ({comments.length})
        </h4>
      </div>

      {comments.length === 0 ? (
        <div className="bg-neutral-50/50 rounded-xl p-3.5 text-center border border-dashed border-neutral-200 mb-4">
          <p className="text-[11px] text-neutral-400 font-bold leading-normal">
            No updates posted yet. Citizens and administrators can discuss work progress below.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 mb-4 max-h-60 overflow-y-auto pr-1">
          {comments.map((comment) => {
            const isAdmin = comment.authorRole === "admin";
            return (
              <div
                key={comment.id}
                className={`p-3 rounded-xl border transition text-left ${
                  isAdmin
                    ? "bg-amber-50/30 border-amber-100/80"
                    : "bg-neutral-50/40 border-neutral-100"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isAdmin ? (
                      <div className="bg-amber-500 text-white rounded p-0.5 shrink-0">
                        <Shield className="w-2.5 h-2.5" />
                      </div>
                    ) : (
                      <div className="bg-orange-100 text-orange-700 rounded p-0.5 shrink-0">
                        <User className="w-2.5 h-2.5" />
                      </div>
                    )}
                    <span className="text-[11px] font-extrabold text-neutral-900">
                      {comment.authorName}
                    </span>
                    <span
                      className={`text-[8px] font-black uppercase px-1.5 py-0.25 rounded ${
                        isAdmin
                          ? "bg-amber-100 text-amber-900 border border-amber-200/50"
                          : "bg-white text-neutral-500 border border-neutral-200"
                      }`}
                    >
                      {isAdmin ? "Municipal Officer" : "Citizen"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                    <Clock className="w-3 h-3 text-neutral-300" />
                    <span className="text-[9px] font-semibold">{formatTime(comment.createdAt)}</span>
                  </div>
                </div>

                <p className="text-xs text-neutral-700 leading-relaxed font-semibold whitespace-pre-wrap pl-0.5">
                  {comment.content}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Input box */}
      {currentUser ? (
        <form onSubmit={handleSubmit} className="relative mt-2">
          {error && (
            <div className="mb-2 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg">
              {error}
            </div>
          )}

          <div className="relative flex items-center">
            <input
              type="text"
              placeholder={
                currentUser.role === "admin"
                  ? "Post administrative update or directive..."
                  : "Ask a question or report status verification..."
              }
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={isSubmitting}
              required
              maxLength={500}
              className="w-full pl-4 pr-12 py-2.5 bg-neutral-50 hover:bg-neutral-100/60 focus:bg-white border border-neutral-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isSubmitting || !commentText.trim()}
              className="absolute right-1.5 text-white bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 p-1.5 rounded-lg transition disabled:opacity-50 active:scale-95 flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/20"
              title="Post comment"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-1.5 flex items-center justify-between px-1 text-[9px] font-bold text-neutral-400">
            <span>
              Posting as: <span className="text-neutral-600">{currentUser.name}</span>{" "}
              <span className={`text-[8px] font-black uppercase px-1 py-0.25 rounded ${
                currentUser.role === 'admin' ? 'bg-amber-50 text-amber-800 border border-amber-200/50' : 'bg-orange-50 text-orange-700 border border-orange-100'
              }`}>
                ({currentUser.role})
              </span>
            </span>
            <span>
              {500 - commentText.length} left
            </span>
          </div>
        </form>
      ) : (
        <div className="bg-neutral-50 border border-neutral-150 p-3 rounded-xl text-center">
          <p className="text-[10px] text-neutral-400 font-bold">
            Please log in above as a Citizen or Municipal Admin to join the discussion.
          </p>
        </div>
      )}
    </div>
  );
};
