import { useState, useCallback, useRef } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PolicyComment } from "@/hooks/use-policy-comments";

interface CommentableTextProps {
  children: React.ReactNode;
  locationId: string;
  comments: PolicyComment[];
  activeCommentId: string | null;
  onStartComment: (text: string, locationId: string) => void;
  onCommentIndicatorClick: (commentId: string) => void;
  className?: string;
}

export function CommentableText({
  children,
  locationId,
  comments,
  activeCommentId,
  onStartComment,
  onCommentIndicatorClick,
  className,
}: CommentableTextProps) {
  const [showAddButton, setShowAddButton] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const locationComments = comments.filter(c => c.textLocationId === locationId);
  const hasActiveComment = locationComments.some(c => c.id === activeCommentId);
  const openCommentCount = locationComments.filter(c => c.status === "open").length;

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setShowAddButton(false);
      setSelectedText("");
      return;
    }

    const text = selection.toString().trim();
    if (!text || text.length < 3) {
      setShowAddButton(false);
      setSelectedText("");
      return;
    }

    // Check if selection is within this container
    const range = selection.getRangeAt(0);
    if (!containerRef.current?.contains(range.commonAncestorContainer)) {
      setShowAddButton(false);
      return;
    }

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    setButtonPosition({
      x: rect.right - containerRect.left + 8,
      y: rect.top - containerRect.top - 4,
    });
    setSelectedText(text);
    setShowAddButton(true);
  }, []);

  const handleAddComment = useCallback(() => {
    if (selectedText) {
      onStartComment(selectedText, locationId);
      setShowAddButton(false);
      setSelectedText("");
      window.getSelection()?.removeAllRanges();
    }
  }, [selectedText, locationId, onStartComment]);

  const handleClickOutside = useCallback(() => {
    // Small delay to allow button click to register
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setShowAddButton(false);
        setSelectedText("");
      }
    }, 100);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative group",
        hasActiveComment && "ring-2 ring-accent/30 rounded",
        locationComments.length > 0 && "bg-yellow-50/50 dark:bg-yellow-900/10",
        className
      )}
      onMouseUp={handleMouseUp}
      onMouseDown={handleClickOutside}
    >
      {children}

      {/* Comment indicator badge */}
      {openCommentCount > 0 && (
        <button
          onClick={() => onCommentIndicatorClick(locationComments[0].id)}
          className={cn(
            "absolute -right-2 top-0 translate-x-full",
            "h-5 min-w-5 px-1 rounded-full",
            "bg-yellow-400 text-yellow-900 text-xs font-medium",
            "flex items-center justify-center",
            "hover:bg-yellow-500 transition-colors",
            "shadow-sm"
          )}
        >
          {openCommentCount}
        </button>
      )}

      {/* Add comment button */}
      {showAddButton && (
        <div
          className="absolute z-50 animate-fade-in"
          style={{
            left: buttonPosition.x,
            top: buttonPosition.y,
          }}
        >
          <Button
            size="sm"
            variant="default"
            className="h-7 gap-1 shadow-lg"
            onClick={handleAddComment}
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Comment
          </Button>
        </div>
      )}
    </div>
  );
}
