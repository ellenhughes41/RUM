import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Inbox,
  Flag,
  FileText,
  Paperclip,
  ExternalLink,
  StickyNote,
  Send,
  Plus,
  Wrench,
  Stethoscope,
} from "lucide-react";
import {
  mockRuleChecks,
  mockRuleChecksRosaAI,
  mockRuleChecksDupixentReauth,
  mockRuleChecksDeny,
  mockRuleChecksZepbound,
  mockRuleChecksHumira,
  mockRuleChecksGalantamine,
  type RuleCheck,
} from "./CaseDetail";
import type { MockCase, CaseStatus } from "@/data/mockCases";
import dayjs from "dayjs";
import { Link } from "react-router-dom";

// ────────────────────────────────────────────────────────────────────────────
// Shared section primitives
// ────────────────────────────────────────────────────────────────────────────

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-3 text-[12px] text-muted-foreground">
      {children}
    </div>
  );
}

function getRuleChecksForCase(c: MockCase): RuleCheck[] {
  if (c.id === "7") return mockRuleChecksZepbound;
  if (c.id === "5") return mockRuleChecksHumira;
  if (c.id === "4") return mockRuleChecksGalantamine;
  if (c.id === "6") return mockRuleChecksDupixentReauth;
  if (c.id === "rosa-ozempic-ai") return mockRuleChecksRosaAI;
  if (c.status === "Denied") return mockRuleChecksDeny;
  return mockRuleChecks;
}

type Outcome = "approved" | "denied" | "rfi" | "pending";

function getOutcome(c: MockCase): Outcome {
  if (c.status === "Approved") return "approved";
  if (c.status === "Denied") return "denied";
  if (c.status === "RFI") return "rfi";
  return "pending";
}

const OUTCOME_META: Record<
  Outcome,
  { label: string; bg: string; border: string; text: string; Icon: typeof CheckCircle2 }
> = {
  approved: {
    label: "Passed",
    bg: "bg-[#f6ffed]",
    border: "border-[#b7eb8f]",
    text: "text-[#389e0d]",
    Icon: CheckCircle2,
  },
  denied: {
    label: "Denied",
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-700",
    Icon: XCircle,
  },
  rfi: {
    label: "RFI",
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-700",
    Icon: AlertCircle,
  },
  pending: {
    label: "Pending Review",
    bg: "bg-muted/40",
    border: "border-border",
    text: "text-foreground",
    Icon: Clock,
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Timeline derivation
// ────────────────────────────────────────────────────────────────────────────

const FUNNEL_STEPS: CaseStatus[] = [
  "Received",
  "Tech Review",
  "Ready for Clinical Review",
  "RFI",
];

const FINAL_STATUSES = new Set<CaseStatus>([
  "Approved",
  "Denied",
  "Withdrawn",
  "Dismissed",
]);

type TimelineEvent = {
  key: string;
  label: string;
  timestamp: string | null;
  Icon: typeof CheckCircle2;
  done: boolean;
};

function getFinalLabel(status: CaseStatus): string {
  switch (status) {
    case "Approved":
      return "Approved";
    case "Denied":
      return "Denied";
    case "Withdrawn":
      return "Withdrawn";
    case "Dismissed":
      return "Dismissed";
    default:
      return "Final decision";
  }
}

function buildTimeline(c: MockCase): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      key: "received",
      label: "Received",
      timestamp: c.receivedAt,
      Icon: Inbox,
      done: true,
    },
  ];

  // Tech Review happens for every case except those still in Received.
  if (c.status !== "Received") {
    events.push({
      key: "tech-review",
      label: "Tech Review",
      timestamp: c.techReviewAt,
      Icon: Wrench,
      done: !!c.techReviewAt,
    });
  }

  // Ready for Clinical Review is reached by cases in review or later.
  if (
    c.status === "Ready for Clinical Review" ||
    c.status === "RFI" ||
    FINAL_STATUSES.has(c.status)
  ) {
    events.push({
      key: "ready-for-clinical",
      label: "Ready for Clinical Review",
      timestamp: c.readyForClinicalReviewAt,
      Icon: Stethoscope,
      done: !!c.readyForClinicalReviewAt,
    });
  }

  // RFI, Approved, and Denied can only happen from Ready for Clinical Review.
  if (c.status === "RFI") {
    events.push({
      key: "rfi",
      label: "Information requested",
      timestamp: c.rfiAt,
      Icon: AlertCircle,
      done: !!c.rfiAt,
    });
  }

  // Withdrawn and Dismissed can happen any time, so they appear as the final event.
  events.push({
    key: "decision",
    label: getFinalLabel(c.status),
    timestamp: c.decidedAt,
    Icon: Flag,
    done: !!c.decidedAt,
  });

  return events;
}

function fmtTs(ts: string | null): string {
  return ts ? dayjs(ts).format("MMM D, YYYY · h:mm A") : "Pending";
}

// ────────────────────────────────────────────────────────────────────────────
// Section components
// ────────────────────────────────────────────────────────────────────────────

function TimelineSection({ caseData }: { caseData: MockCase }) {
  const events = buildTimeline(caseData);
  const currentIndex = Math.max(
    0,
    FUNNEL_STEPS.indexOf(caseData.status as CaseStatus),
  );
  const isFinal = FINAL_STATUSES.has(caseData.status);


  return (
    <Section title="Case Timeline">
      <div className="rounded-md border border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between text-[12px] mb-3 pb-3 border-b border-border">
          <span className="text-muted-foreground">Current status</span>
          <span className="font-medium text-foreground">{caseData.status}</span>
        </div>
        <ol className="space-y-3">
          {events.map((ev, i) => {
            const Icon = ev.Icon;
            return (
              <li key={ev.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                      ev.done
                        ? "bg-[#12275e] border-[#12275e] text-white"
                        : "bg-muted/40 border-border text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </div>
                  {i < events.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-1" style={{ minHeight: 16 }} />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="text-[13px] font-medium text-foreground leading-tight">
                    {ev.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {fmtTs(ev.timestamp)}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </Section>
  );
}

function DemographicsSection({ caseData }: { caseData: MockCase }) {
  const rows: Array<[string, React.ReactNode]> = [
    ["Name", caseData.memberName],
    ["Member ID", <span className="font-mono">{caseData.memberId}</span>],
    ["Carrier / Plan", caseData.client],
    ["Date of birth", <span className="text-muted-foreground">Not provided</span>],
  ];

  return (
    <Section title="Member Demographics">
      <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-[13px] leading-relaxed border border-border rounded-md px-4 py-3 bg-card">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

function CaseDetailsSection({ caseData }: { caseData: MockCase }) {
  const outcome = getOutcome(caseData);
  const checks = getRuleChecksForCase(caseData);
  const failedChecks = checks.filter((c) => !c.passed);
  const meta = OUTCOME_META[outcome];

  // MHK internal notes are not in MockCase; show a deterministic sample for
  // denied/RFI cases, otherwise the empty state.
  const hasNotes = outcome === "denied" || outcome === "rfi";
  const internalNotes = hasNotes
    ? [
        {
          author: "MHK Reviewer",
          ts: caseData.decidedAt ?? caseData.receivedAt,
          body:
            outcome === "denied"
              ? "Documentation reviewed. Failing criteria do not meet plan policy. Routed for denial letter generation."
              : "Additional clinical documentation requested from prescriber. Awaiting response.",
        },
      ]
    : [];

  const criteriaTitle =
    outcome === "denied" ? "Denial criteria" : "RFI missing criteria";
  const criteriaEmpty =
    outcome === "denied"
      ? "No denial criteria on file."
      : "No missing criteria on file.";

  const criteriaContainerClass =
    outcome === "denied"
      ? "bg-red-50 border-red-200 text-red-800"
      : "bg-amber-50 border-amber-200 text-amber-800";

  const criteriaIconClass =
    outcome === "denied" ? "text-red-500" : "text-amber-500";

  return (
    <Section title="Case Details">
      <div className="space-y-4">
        {/* Decision summary */}
        <div className="rounded-md border border-border bg-card px-4 py-3 space-y-3">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Outcome</span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${meta.bg} ${meta.border} ${meta.text}`}
            >
              {meta.label}
            </span>
          </div>

          {/* Denial / RFI criteria — color-coded container directly under outcome */}
          {(outcome === "denied" || outcome === "rfi") && (
            <div
              className={`rounded-md border px-3 py-2.5 ${criteriaContainerClass}`}
            >
              <div className="text-[12px] font-semibold mb-2">
                {criteriaTitle}
              </div>
              {failedChecks.length === 0 ? (
                <div className="text-[12px] opacity-80">{criteriaEmpty}</div>
              ) : (
                <ul className="space-y-2">
                  {failedChecks.map((check) => (
                    <li key={check.id} className="flex gap-2">
                      <XCircle
                        className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${criteriaIconClass}`}
                        strokeWidth={2.4}
                      />
                      <div className="min-w-0">
                        <div className="text-[12px] font-medium leading-tight">
                          {check.category}
                        </div>
                        <div className="text-[11px] opacity-90 leading-snug">
                          {check.rule}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Drug</span>
            <span className="text-foreground">
              {caseData.drugName} <span className="text-muted-foreground">· {caseData.drugClass}</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Policy used</span>
            <Link
              to={`/policies?drug=${encodeURIComponent(caseData.drugName)}`}
              className="text-[#12275e] hover:underline inline-flex items-center gap-1"
            >
              {caseData.drugName} clinical policy
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Case detail fields from case review */}
        <div className="rounded-md border border-border bg-card px-4 py-3">
          <dl className="grid grid-cols-[120px_1fr] gap-x-2 gap-y-2 text-[13px] leading-relaxed">
            <dt className="text-muted-foreground">Request Type</dt>
            <dd className="text-foreground">{caseData.requestType}</dd>

            <dt className="text-muted-foreground">Request Reason</dt>
            <dd className="text-foreground">{caseData.requestReason}</dd>

            <dt className="text-muted-foreground">Priority Level</dt>
            <dd className="text-foreground capitalize">{caseData.priority}</dd>

            <dt className="text-muted-foreground">Source</dt>
            <dd className="text-foreground">{caseData.requestSource}</dd>

            <dt className="text-muted-foreground">NDC</dt>
            <dd className="font-mono text-foreground">{caseData.ndc}</dd>

            <dt className="text-muted-foreground">Quantity</dt>
            <dd className="text-foreground">{caseData.quantity}</dd>

            <dt className="text-muted-foreground">Provider Name</dt>
            <dd className="text-foreground">{caseData.providerName}</dd>

            <dt className="text-muted-foreground">Provider Phone Number</dt>
            <dd className="text-foreground">{caseData.providerPhone}</dd>

            <dt className="text-muted-foreground">Provider Fax Number</dt>
            <dd className="text-foreground">{caseData.providerFax}</dd>
          </dl>
        </div>

        {/* MHK internal notes */}
        <div>
          <div className="text-[12px] font-medium text-foreground mb-1.5 flex items-center gap-1.5">
            <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
            MHK internal notes
          </div>
          {internalNotes.length === 0 ? (
            <EmptyState>No internal notes have been added.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {internalNotes.map((n, i) => (
                <li
                  key={i}
                  className="rounded-md border border-border bg-card px-3 py-2 text-[12px]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground">{n.author}</span>
                    <span className="text-muted-foreground text-[11px]">{fmtTs(n.ts)}</span>
                  </div>
                  <div className="text-foreground leading-snug whitespace-pre-wrap">{n.body}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Section>
  );
}

function AttachmentsSection({ caseData }: { caseData: MockCase }) {
  const outcome = getOutcome(caseData);

  type Attachment = { name: string; type: string; ts: string | null };
  const attachments: Attachment[] = [];
  if (outcome === "denied") {
    attachments.push({
      name: "Denial letter.pdf",
      type: "Denial",
      ts: caseData.decidedAt,
    });
  }
  if (outcome === "rfi") {
    attachments.push({
      name: "RFI letter.pdf",
      type: "RFI",
      ts: caseData.decidedAt ?? caseData.receivedAt,
    });
  }
  attachments.push({
    name: "Chart notes.pdf",
    type: "Chart",
    ts: caseData.receivedAt,
  });

  return (
    <Section title="Links & Attachments">
      {attachments.length === 0 ? (
        <EmptyState>No documents attached to this case.</EmptyState>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-md bg-card">
          {attachments.map((a) => (
            <li key={a.name} className="px-3 py-2 flex items-center gap-3">
              {a.type === "Chart" ? (
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-foreground truncate">{a.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {a.type} · {fmtTs(a.ts)}
                </div>
              </div>
              <button
                type="button"
                className="text-[12px] text-[#12275e] hover:underline inline-flex items-center gap-1"
              >
                Open
                <ExternalLink className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function ActionBarSection() {
  return (
    <Section title="Actions">
      <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-3">
        <div className="text-[12px] text-muted-foreground mb-2">
          Action controls are a placeholder — exact set still to be defined.
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 rounded border border-border bg-card px-3 py-1.5 text-[12px] text-muted-foreground cursor-not-allowed"
          >
            <Plus className="h-3.5 w-3.5" /> Add note
          </button>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 rounded border border-border bg-card px-3 py-1.5 text-[12px] text-muted-foreground cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" /> Resend letter
          </button>
        </div>
      </div>
    </Section>
  );
}

export function TriagePreviewPanel({ caseData }: { caseData: MockCase }) {
  return (
    <div className="px-6 py-5 space-y-6 text-sm">
      <TimelineSection caseData={caseData} />
      <DemographicsSection caseData={caseData} />
      <CaseDetailsSection caseData={caseData} />
      <AttachmentsSection caseData={caseData} />
      <ActionBarSection />
    </div>
  );
}