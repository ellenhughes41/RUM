import { useState, useCallback } from "react";

export interface CommentReply {
  id: string;
  authorName: string;
  authorRole: "pharmacist" | "manager";
  content: string;
  createdAt: string;
}

export interface PolicyComment {
  id: string;
  policyId: string;
  highlightedText: string;
  textLocationId: string; // ID of the criteria item this comment is attached to
  authorName: string;
  authorRole: "pharmacist" | "manager";
  content: string;
  createdAt: string;
  status: "open" | "resolved";
  resolvedBy?: string;
  resolvedAt?: string;
  replies: CommentReply[];
}

export type CommentFilter = "all" | "open" | "resolved";

const STORAGE_KEY = "policy-comments";

// Mock current user - in real app this would come from auth
export const getCurrentUser = () => ({
  name: "Sarah Chen",
  role: "pharmacist" as const,
});

export function usePolicyComments(policyId: string) {
  const [comments, setComments] = useState<PolicyComment[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const allComments = JSON.parse(stored) as PolicyComment[];
        return allComments.filter(c => c.policyId === policyId);
      }
    } catch (e) {
      console.error("Failed to parse stored comments:", e);
    }
    return [];
  });

  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [filter, setFilter] = useState<CommentFilter>("all");
  const [pendingHighlight, setPendingHighlight] = useState<{
    text: string;
    locationId: string;
  } | null>(null);

  const saveComments = useCallback((updatedComments: PolicyComment[]) => {
    try {
      // Get all comments from storage
      const stored = localStorage.getItem(STORAGE_KEY);
      let allComments: PolicyComment[] = [];
      if (stored) {
        allComments = JSON.parse(stored);
      }
      // Remove old comments for this policy
      allComments = allComments.filter(c => c.policyId !== policyId);
      // Add updated comments for this policy
      allComments = [...allComments, ...updatedComments];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allComments));
    } catch (e) {
      console.error("Failed to save comments:", e);
    }
  }, [policyId]);

  const addComment = useCallback((
    highlightedText: string,
    textLocationId: string,
    content: string
  ) => {
    const user = getCurrentUser();
    const newComment: PolicyComment = {
      id: `comment-${Date.now()}`,
      policyId,
      highlightedText,
      textLocationId,
      authorName: user.name,
      authorRole: user.role,
      content,
      createdAt: new Date().toISOString(),
      status: "open",
      replies: [],
    };
    
    const updated = [...comments, newComment];
    setComments(updated);
    saveComments(updated);
    setPendingHighlight(null);
    setActiveCommentId(newComment.id);
    return newComment;
  }, [comments, policyId, saveComments]);

  const addReply = useCallback((commentId: string, content: string) => {
    const user = getCurrentUser();
    const newReply: CommentReply = {
      id: `reply-${Date.now()}`,
      authorName: user.name,
      authorRole: user.role,
      content,
      createdAt: new Date().toISOString(),
    };

    const updated = comments.map(c =>
      c.id === commentId
        ? { ...c, replies: [...c.replies, newReply] }
        : c
    );
    setComments(updated);
    saveComments(updated);
  }, [comments, saveComments]);

  const resolveComment = useCallback((commentId: string) => {
    const user = getCurrentUser();
    const updated = comments.map(c =>
      c.id === commentId
        ? {
            ...c,
            status: "resolved" as const,
            resolvedBy: user.name,
            resolvedAt: new Date().toISOString(),
          }
        : c
    );
    setComments(updated);
    saveComments(updated);
  }, [comments, saveComments]);

  const reopenComment = useCallback((commentId: string) => {
    const updated = comments.map(c =>
      c.id === commentId
        ? {
            ...c,
            status: "open" as const,
            resolvedBy: undefined,
            resolvedAt: undefined,
          }
        : c
    );
    setComments(updated);
    saveComments(updated);
  }, [comments, saveComments]);

  const editComment = useCallback((commentId: string, newContent: string) => {
    const updated = comments.map(c =>
      c.id === commentId
        ? { ...c, content: newContent }
        : c
    );
    setComments(updated);
    saveComments(updated);
  }, [comments, saveComments]);

  const deleteComment = useCallback((commentId: string) => {
    const updated = comments.filter(c => c.id !== commentId);
    setComments(updated);
    saveComments(updated);
    if (activeCommentId === commentId) {
      setActiveCommentId(null);
    }
  }, [comments, activeCommentId, saveComments]);

  const filteredComments = comments.filter(c => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  const getCommentsForLocation = useCallback((locationId: string) => {
    return comments.filter(c => c.textLocationId === locationId);
  }, [comments]);

  const startComment = useCallback((text: string, locationId: string) => {
    setPendingHighlight({ text, locationId });
  }, []);

  const cancelPendingComment = useCallback(() => {
    setPendingHighlight(null);
  }, []);

  return {
    comments: filteredComments,
    allComments: comments,
    activeCommentId,
    setActiveCommentId,
    filter,
    setFilter,
    pendingHighlight,
    addComment,
    addReply,
    editComment,
    resolveComment,
    reopenComment,
    deleteComment,
    getCommentsForLocation,
    startComment,
    cancelPendingComment,
  };
}
