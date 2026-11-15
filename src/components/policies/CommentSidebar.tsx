import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Check, RotateCcw, Send, Filter, ChevronDown, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { 
  PolicyComment, 
  CommentFilter, 
  getCurrentUser 
} from "@/hooks/use-policy-comments";

interface CommentSidebarProps {
  comments: PolicyComment[];
  activeCommentId: string | null;
  setActiveCommentId: (id: string | null) => void;
  filter: CommentFilter;
  setFilter: (filter: CommentFilter) => void;
  pendingHighlight: { text: string; locationId: string } | null;
  onAddComment: (highlightedText: string, locationId: string, content: string) => void;
  onAddReply: (commentId: string, content: string) => void;
  onEditComment: (commentId: string, content: string) => void;
  onResolve: (commentId: string) => void;
  onReopen: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onCancelPending: () => void;
  onCommentClick: (locationId: string) => void;
  onClose: () => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function CommentCard({
  comment,
  isActive,
  onSelect,
  onAddReply,
  onEditComment,
  onResolve,
  onReopen,
  onDelete,
}: {
  comment: PolicyComment;
  isActive: boolean;
  onSelect: () => void;
  onAddReply: (content: string) => void;
  onEditComment: (content: string) => void;
  onResolve: () => void;
  onReopen: () => void;
  onDelete: () => void;
}) {
  const [replyText, setReplyText] = useState("");
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showReplyInput && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [showReplyInput]);

  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus();
    }
  }, [isEditing]);

  const handleSubmitReply = () => {
    if (!replyText.trim()) return;
    onAddReply(replyText.trim());
    setReplyText("");
    setShowReplyInput(false);
  };

  const handleSaveEdit = () => {
    if (!editText.trim()) return;
    onEditComment(editText.trim());
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(comment.content);
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-all cursor-pointer",
        isActive
          ? "border-accent bg-accent/5 shadow-sm"
          : "border-border hover:border-accent/50",
        comment.status === "resolved" && "opacity-70"
      )}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium text-accent">
            {comment.authorName.split(" ").map(n => n[0]).join("")}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{comment.authorName}</p>
            <p className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {comment.status === "resolved" ? (
            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-500/30">
              <Check className="h-3 w-3 mr-1" />
              Resolved
            </Badge>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={onResolve}
              title="Resolve"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {comment.status === "resolved" && (
                <DropdownMenuItem onClick={onReopen}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reopen
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Highlighted text preview */}
      <div className="mb-2 px-2 py-1.5 rounded bg-yellow-100/50 dark:bg-yellow-900/20 border-l-2 border-yellow-400">
        <p className="text-xs text-muted-foreground italic line-clamp-2">
          "{comment.highlightedText}"
        </p>
      </div>

      {/* Comment content - editable */}
      {isEditing ? (
        <div className="mb-3" onClick={(e) => e.stopPropagation()}>
          <Textarea
            ref={editTextareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="min-h-[60px] text-sm mb-2"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSaveEdit();
              }
              if (e.key === "Escape") {
                handleCancelEdit();
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={!editText.trim()}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground mb-3">{comment.content}</p>
      )}

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="space-y-2 mb-3 pl-3 border-l-2 border-border">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="text-sm">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-medium text-foreground">{reply.authorName}</span>
                <span className="text-xs text-muted-foreground">{formatDate(reply.createdAt)}</span>
              </div>
              <p className="text-muted-foreground">{reply.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply input */}
      {showReplyInput && (
        <div className="mb-3" onClick={(e) => e.stopPropagation()}>
          <Textarea
            ref={textareaRef}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="min-h-[60px] text-sm mb-2"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSubmitReply();
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowReplyInput(false);
                setReplyText("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitReply}
              disabled={!replyText.trim()}
            >
              Reply
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
        {!showReplyInput && !isEditing && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowReplyInput(true)}
          >
            Reply
          </Button>
        )}
      </div>
    </div>
  );
}

export function CommentSidebar({
  comments,
  activeCommentId,
  setActiveCommentId,
  filter,
  setFilter,
  pendingHighlight,
  onAddComment,
  onAddReply,
  onEditComment,
  onResolve,
  onReopen,
  onDelete,
  onCancelPending,
  onCommentClick,
  onClose,
}: CommentSidebarProps) {
  const [newCommentText, setNewCommentText] = useState("");
  const newCommentRef = useRef<HTMLTextAreaElement>(null);
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (pendingHighlight && newCommentRef.current) {
      newCommentRef.current.focus();
    }
  }, [pendingHighlight]);

  const handleSubmitNewComment = () => {
    if (!pendingHighlight || !newCommentText.trim()) return;
    onAddComment(
      pendingHighlight.text,
      pendingHighlight.locationId,
      newCommentText.trim()
    );
    setNewCommentText("");
  };

  const openCount = comments.filter(c => c.status === "open").length;

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col fixed right-0 top-0 h-screen z-40">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-amber-500" />
          <h3 className="font-semibold text-foreground">Comments</h3>
          {openCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {openCount} open
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1">
              <Filter className="h-3 w-3" />
              {filter === "all" ? "All" : filter === "open" ? "Open" : "Resolved"}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setFilter("all")}>
              All comments
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter("open")}>
              Open only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter("resolved")}>
              Resolved only
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* New comment form */}
      {pendingHighlight && (
        <div className="p-4 border-b border-border bg-accent/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">New Comment</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onCancelPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mb-3 px-2 py-1.5 rounded bg-yellow-100/50 dark:bg-yellow-900/20 border-l-2 border-yellow-400">
            <p className="text-xs text-muted-foreground italic line-clamp-2">
              "{pendingHighlight.text}"
            </p>
          </div>
          
          <Textarea
            ref={newCommentRef}
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Add your comment..."
            className="min-h-[80px] text-sm mb-2"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSubmitNewComment();
              }
            }}
          />
          
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSubmitNewComment}
              disabled={!newCommentText.trim()}
              className="gap-1"
            >
              <Send className="h-3 w-3" />
              Comment
            </Button>
          </div>
        </div>
      )}

      {/* Comments list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {filter !== "all" 
                  ? `No ${filter} comments`
                  : "No comments yet"
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Select text in the policy to add a comment
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                isActive={activeCommentId === comment.id}
                onSelect={() => {
                  setActiveCommentId(comment.id);
                  onCommentClick(comment.textLocationId);
                }}
                onAddReply={(content) => onAddReply(comment.id, content)}
                onEditComment={(content) => onEditComment(comment.id, content)}
                onResolve={() => onResolve(comment.id)}
                onReopen={() => onReopen(comment.id)}
                onDelete={() => onDelete(comment.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Role indicator */}
      <div className="p-3 border-t border-border bg-muted/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-5 w-5 rounded-full bg-accent/20 flex items-center justify-center text-[12px] font-medium text-accent">
            {currentUser.name.split(" ").map(n => n[0]).join("")}
          </div>
          <span>{currentUser.name}</span>
          <Badge variant="outline" className="text-[12px] capitalize">
            {currentUser.role}
          </Badge>
        </div>
      </div>
    </div>
  );
}
