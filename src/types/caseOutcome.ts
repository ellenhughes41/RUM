export type CaseOutcomeDecision = "approved" | "denied" | "rfi";

export interface CaseOutcome {
  decision: CaseOutcomeDecision;
  decidedAt: string; // ISO timestamp
  decidedBy: string;
  copilotUsed: boolean;
  // Approval
  effectiveDate?: string; // ISO date
  terminationDate?: string; // ISO date
  approvalNote?: string;
  // Denial / RFI
  letter?: string;
}