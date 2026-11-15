import { Check, X, Send, Sparkles, User, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { SendCountdown } from "@/components/letters/SendCountdown";
import { scheduledSendTime } from "@/lib/sendSchedule";
import type { CaseOutcome } from "@/types/caseOutcome";

interface OutcomePanelProps {
  outcome: CaseOutcome;
  copilotUsedFallback?: boolean;
  onRetract?: () => void;
}

const formatDate = (iso?: string) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
};

const formatDateTime = (iso?: string) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

export function OutcomePanel({ outcome, copilotUsedFallback = false, onRetract }: OutcomePanelProps) {
  const copilotUsed = outcome.copilotUsed ?? copilotUsedFallback;

  const config =
    outcome.decision === "approved"
      ? {
          label: "Approved",
          icon: <Check className="h-4 w-4" />,
          bg: "bg-green-50",
          border: "border-green-300",
          text: "text-green-700",
          accent: "bg-green-100 text-green-800 border-green-300",
        }
      : outcome.decision === "denied"
      ? {
          label: "Denied",
          icon: <X className="h-4 w-4" />,
          bg: "bg-red-50",
          border: "border-red-300",
          text: "text-red-700",
          accent: "bg-red-100 text-red-800 border-red-300",
        }
      : {
          label: "Information Requested",
          icon: <Send className="h-4 w-4" />,
          bg: "bg-amber-50",
          border: "border-amber-300",
          text: "text-amber-700",
          accent: "bg-amber-100 text-amber-800 border-amber-300",
        };

  return (
    <div className={cn("rounded-md border p-4", config.bg, config.border)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className={cn("flex items-center gap-2 font-semibold text-sm", config.text)}>
          <span
            className={cn(
              "inline-flex items-center justify-center w-6 h-6 rounded-full border",
              config.accent
            )}
          >
            {config.icon}
          </span>
          {config.label}
        </div>
        {copilotUsed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs font-medium text-indigo-700">
            <Sparkles className="h-3 w-3" />
            Co-Pilot used
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
            <User className="h-3 w-3" />
            Manual review
          </span>
        )}
      </div>

      {/* Decided by / at */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-foreground mb-3">
        <div className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Decided by:</span>
          <span className="font-medium">{outcome.decidedBy}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">When:</span>
          <span className="font-medium">{formatDateTime(outcome.decidedAt)}</span>
        </div>
        {outcome.decision !== "approved" && (
          <div className={cn("flex items-center gap-1.5 ml-auto", config.text)}>
            <SendCountdown sendAt={scheduledSendTime(outcome.decidedAt, 1)} onAction={onRetract} />
          </div>
        )}
      </div>

      {/* Approval-specific details */}
      {outcome.decision === "approved" && (
        <div className="rounded-md border border-green-200 bg-white p-3">
          <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-foreground">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            Approval Time Window
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground">Effective</div>
              <div className="font-medium">{formatDate(outcome.effectiveDate)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Termination</div>
              <div className="font-medium">{formatDate(outcome.terminationDate)}</div>
            </div>
          </div>
          {outcome.approvalNote && (
            <div className="mt-3 pt-3 border-t border-green-100">
              <div className="text-xs text-muted-foreground mb-1">Additional note</div>
              <div className="text-xs whitespace-pre-wrap">{outcome.approvalNote}</div>
            </div>
          )}
        </div>
      )}

      {/* Denial / RFI letter view-only */}
      {(outcome.decision === "denied" || outcome.decision === "rfi") && outcome.letter && (
        <div className="rounded-md border bg-white overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-2 border-b text-xs font-medium text-foreground bg-muted/30">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            {outcome.decision === "denied" ? "Denial Letter" : "Request for Information Letter"}
            <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
              View only
            </span>
          </div>
          <pre className="text-xs whitespace-pre-wrap p-3 font-sans max-h-72 overflow-y-auto">
            {outcome.letter}
          </pre>
        </div>
      )}
    </div>
  );
}