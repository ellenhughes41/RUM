import { showActionResult } from "./ActionResultModal";
import { DismissReasonModal } from "./DismissReasonModal";
import { TemplateLetterSection } from "@/components/letters/TemplateLetterSection";
import { useState, useMemo, useEffect } from "react";
import {
  Card,
  Typography,
  Button,
  Tag,
  AutoComplete,
  Input,
  Descriptions,
  Space,
  Alert,
  Checkbox,
  Modal,
  Divider,
  Progress,
  Select,
  Collapse,
  Table,
  Tooltip,
} from "antd";
import {
  UserOutlined,
  MedicineBoxOutlined,
  HistoryOutlined,
  CheckCircleFilled,
  CheckOutlined,
  LockOutlined,
  SendOutlined,
  DeleteOutlined,
  LinkOutlined,
  StopOutlined,
  SplitCellsOutlined,
  ClockCircleOutlined,
  UndoOutlined,
  PlusCircleOutlined,
  WarningFilled,
  ThunderboltOutlined,
  SearchOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import {
  mockMemberDirectory,
  mockDrugDirectory,
  mockPriorCases,
  getMemberCandidates,
  type MemberRecord,
  type DrugRecord,
  type IntakeCase,
  type PriorCase,
} from "@/data/mockIntakeCases";
import { SplitFaxModal } from "./SplitFaxModal";
import { SOURCE_META } from "./IntakeList";
import { ChartNotesUpload } from "./ChartNotesUpload";
import { ClaimHistoryPanel } from "./ClaimHistoryPanel";
import { useToast } from "@/hooks/use-toast";

const { Text, Title } = Typography;
const ACCENT = "#12275e";

/**
 * Extraction confidence below this score (0-100) flags a field as low
 * confidence. TBD — tune once we see the real score distribution.
 * Every extracted field compares against this single constant.
 */
const LOW_CONFIDENCE_THRESHOLD = 70;


export type HistoryClassification =
  | "duplicate"
  | "rfi_response"
  | "related_dose"
  | "appeal"
  | "closed_approved"
  | "no_action";

export interface IntakeState {
  quantity?: string;
  daysSupply?: string;
  member?: MemberRecord;
  drug?: DrugRecord;
  historyReviewed?: boolean;
  pulledFields?: Record<string, Set<string>>; // priorCaseId -> fields
  relatedCaseId?: string; // marked as related to an existing case
  classifications?: Record<string, HistoryClassification>;
  selectedPriorId?: string;
  priority?: "standard" | "expedited";
  chartNoteFiles?: string[];
  prescriber?: { npi: string; providerName: string; phoneNumber: string; faxNumber: string };
}

interface IntakeDetailProps {
  intakeCase: IntakeCase;
  allCases: IntakeCase[];
  state: IntakeState;
  onStateChange: (next: IntakeState) => void;
  onSourceChange?: (source: IntakeCase["source"]) => void;
  onClaim: () => void;
  onSendToReview: () => void; // "Create Case" for fax raw intake
  onSendToProvider?: () => void; // Electronic: re-send corrected question set
  onRequestInfo: () => void;
  onDismiss: (reason?: string) => void;
  onAttachExisting: () => void;
  onSplit: () => void;
  onDoctorResponded: () => void;
  onRelease: () => void;
  onJumpToRfi?: (rfiCaseId: string) => void;
  onMarkRelated?: (relatedCaseId: string) => void;
}

export function IntakeDetail(props: IntakeDetailProps) {
  const {
    intakeCase,
    allCases,
    state,
    onStateChange,
    onClaim,
    onSendToReview,
    onSendToProvider,
    onRequestInfo,
    onDismiss,
    onAttachExisting,
    onSplit,
    onDoctorResponded,
    onRelease,
    onJumpToRfi,
    onMarkRelated,
  } = props;

  const isRfi = intakeCase.queue === "rfi";
  const isElectronic = intakeCase.source === "Electronic";
  const claimed = !!intakeCase.claimedBy;
  const memberDone = !!state.member;
  const drugDone = !!state.drug;

  // Look up any open RFI case that matches this member (for the "response to RFI" callout)
  const matchingRfiCase = useMemo(() => {
    const memberId = state.member?.id;
    if (!memberId) return undefined;
    return allCases.find(
      (c) =>
        c.id !== intakeCase.id &&
        c.queue === "rfi" &&
        c.bestGuessMemberId === memberId
    );
  }, [allCases, intakeCase.id, state.member]);

  // Look up a possible duplicate/related case (same member + same drug, different case)
  const duplicateCase = useMemo(() => {
    const memberId = state.member?.id;
    const drugId = state.drug?.id;
    if (!memberId || !drugId) return undefined;
    return allCases.find(
      (c) =>
        c.id !== intakeCase.id &&
        c.bestGuessMemberId === memberId &&
        c.bestGuessDrugId === drugId
    );
  }, [allCases, intakeCase.id, state.member, state.drug]);

  const [splitOpen, setSplitOpen] = useState(false);
  const [dismissOpen, setDismissOpen] = useState(false);
  const askDismiss = () => setDismissOpen(true);
  const dismissModal = (
    <DismissReasonModal
      open={dismissOpen}
      onCancel={() => setDismissOpen(false)}
      onConfirm={(reason) => { setDismissOpen(false); onDismiss(reason); }}
    />
  );

  const manualStepsDone = !intakeCase.isManualIntake || (!!state.chartNoteFiles?.length && !!state.prescriber?.faxNumber.trim());
  const canCreateCase = claimed && memberDone && drugDone && !!state.historyReviewed && !!state.priority && manualStepsDone;
  const canAttach = claimed && (!!duplicateCase || !!state.relatedCaseId || memberDone);

  // Unassigned queue uses a dedicated test-claim flow rather than the raw intake steps.
  if (intakeCase.queue === "unassigned") {
    return (
      <>
      <UnassignedIntakeDetail
        intakeCase={intakeCase}
        onClaim={onClaim}
        onSendToReview={onSendToReview}
        onRequestInfo={onRequestInfo}
        onDismiss={askDismiss}
      />
      {dismissModal}
      </>
    );
  }

  return (
    <div className={intakeCase.isManualIntake ? "[&_.history-case-header]:flex-wrap [&_.history-case-summary]:!basis-full [&_.history-case-summary]:!min-w-full" : undefined} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {dismissModal}
      {/* Header / claim banner */}
      {!claimed ? (
        <div
          style={{
            background: "#fff7e6",
            border: "1px solid #ffd591",
            borderBottom: "1px solid #ffd591",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: 14, display: "block" }}>
              This {isRfi ? "case" : intakeCase.source === "Fax" ? "transaction" : "request"} is unclaimed.
            </Text>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Claim it to begin.
            </Text>
          </div>
          <Button
            type="primary"
            onClick={onClaim}
            style={{ background: ACCENT, borderColor: ACCENT }}
          >
            Claim
          </Button>
        </div>
      ) : (
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #bfbfbf", background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <Title level={5} style={{ margin: 0 }}>
                {state.member?.name ?? intakeCase.memberHint ?? "Unidentified member"}
              </Title>
              <Text type="secondary" style={{ fontSize: 14 }}>
                {state.drug?.name ?? intakeCase.drugHint}
                {" · Received "}
                {intakeCase.receivedAt}
                {" · "}
                {intakeCase.caseNumber ?? intakeCase.transactionId}
              </Text>
            </div>
            <Tag color={SOURCE_META[intakeCase.source].color} icon={SOURCE_META[intakeCase.source].icon} style={{ marginRight: 0 }}>
              {intakeCase.source}
            </Tag>
          </div>
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        {!!intakeCase.mixedPatient?.mismatchedPages.length && (
          <Alert
            type="error"
            showIcon
            message="Page for a different patient detected"
            description={`${intakeCase.mixedPatient.mismatchedPages.map(({ page, patientName }) => `Page ${page} shows a different patient name (${patientName})`).join("; ")} than the rest of this fax (${intakeCase.memberHint}). Dismiss this intake citing a PHI violation. The provider will send a corrected fax.`}
          />
        )}
        {isRfi ? (
          <RfiPanel intakeCase={intakeCase} onDoctorResponded={onDoctorResponded} />
        ) : isElectronic ? (
          <ElectronicPanel
            intakeCase={intakeCase}
            state={state}
            onStateChange={onStateChange}
            disabled={!claimed}
          />
        ) : (
          <>
            {intakeCase.isManualIntake && (
              <ChartNotesUpload files={state.chartNoteFiles ?? []} source={intakeCase.source}
                onFilesChange={(chartNoteFiles) => onStateChange({ ...state, chartNoteFiles })}
                onSourceChange={props.onSourceChange} />
            )}
            <FaxStepFlow
              key={intakeCase.id}
              intakeCase={intakeCase}
              state={state}
              onStateChange={onStateChange}
              disabled={!claimed}
              editableSupply={!!intakeCase.isManualIntake}
              includePrescriber={!!intakeCase.isManualIntake}
              matchingRfiCase={matchingRfiCase}
              duplicateCase={duplicateCase}
              onJumpToRfi={onJumpToRfi}
              onMarkRelated={onMarkRelated}
              onDismiss={onDismiss}
              onAttachExisting={onAttachExisting}
            />
          </>
        )}
      </div>

      {/* Sticky action bar — differs by source */}
      <div
        style={{
          borderTop: "1px solid #bfbfbf",
          padding: "12px 20px",
          background: "#fff",
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {isRfi ? (
          <>
            <Button danger type="text" icon={<DeleteOutlined />} onClick={askDismiss} disabled={!claimed}>
              Dismiss
            </Button>
            <Button icon={<UndoOutlined />} onClick={onRelease} disabled={!claimed}>
              Release
            </Button>
            <Button icon={<LinkOutlined />} onClick={onAttachExisting} disabled={!claimed}>
              Attach to Existing Case
            </Button>
          </>
        ) : isElectronic ? (
          <>
            <Button danger type="text" icon={<DeleteOutlined />} onClick={askDismiss} disabled={!claimed}>
              Dismiss
            </Button>
            {(() => {
              const disabled = !claimed || !memberDone || !drugDone;
              return (
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  disabled={disabled}
                  onClick={onSendToProvider ?? onSendToReview}
                  style={disabled ? undefined : { background: ACCENT, borderColor: ACCENT }}
                >
                  Send to Provider
                </Button>
              );
            })()}
          </>
        ) : (
          <>
            <Button danger type="text" icon={<DeleteOutlined />} onClick={askDismiss}>
              Dismiss
            </Button>
            {!canCreateCase && claimed && (
              <Text type="secondary" style={{ fontSize: 14, marginLeft: "auto", alignSelf: "center" }}>
                {!manualStepsDone ? "Complete Chart notes and Prescriber to enable Case history" : !state.priority ? "Select a priority to enable Case history" : "Complete Case history to enable Create case"}
              </Text>
            )}
            {(() => {
              const disabled = !canCreateCase;
              return (
                <Button
                  type="primary"
                  icon={<PlusCircleOutlined />}
                  disabled={disabled}
                  onClick={onSendToReview}
                  style={{
                    marginLeft: canCreateCase || !claimed ? "auto" : 0,
                    ...(disabled ? {} : { background: ACCENT, borderColor: ACCENT }),
                  }}
                >
                  Create case
                </Button>
              );
            })()}
          </>
        )}
      </div>


      <SplitFaxModal
        open={splitOpen}
        transactionId={intakeCase.transactionId}
        onCancel={() => setSplitOpen(false)}
        onConfirm={() => {
          setSplitOpen(false);
          onSplit();
        }}
      />
    </div>
  );
}

/* ---------------- Fax stepped flow ---------------- */

export function FaxStepFlow({
  intakeCase,
  state,
  onStateChange,
  disabled,
  matchingRfiCase,
  duplicateCase,
  onJumpToRfi,
  onMarkRelated,
  onDismiss,
  onAttachExisting,
  editableSupply = false,
  includePrescriber = false,
}: {
  intakeCase: IntakeCase;
  state: IntakeState;
  onStateChange: (s: IntakeState) => void;
  disabled: boolean;
  matchingRfiCase?: IntakeCase;
  duplicateCase?: IntakeCase;
  onJumpToRfi?: (caseId: string) => void;
  onMarkRelated?: (caseId: string) => void;
  onDismiss?: () => void;
  onAttachExisting?: () => void;
  editableSupply?: boolean;
  includePrescriber?: boolean;
}) {
  const memberDone = !!state.member;
  const drugDone = !!state.drug;
  const historyDone = !!state.historyReviewed;
  const prescriberDone = !!state.prescriber?.faxNumber.trim();
  const historyUnlocked = !disabled && memberDone && drugDone && !!state.priority &&
    (!includePrescriber || (!!state.chartNoteFiles?.length && prescriberDone));




  return (
    <>
      <StepCard
        index={1}
        title="Identify member"
        icon={<UserOutlined />}
        complete={memberDone}
        locked={disabled}
        lockHint="Claim the transaction to begin"
      >
        <MemberStep
          intakeCase={intakeCase}
          state={state}
          onStateChange={onStateChange}
        />
      </StepCard>

      <StepCard
        index={2}
        title="Confirm drug"
        icon={<MedicineBoxOutlined />}
        complete={drugDone}
        locked={disabled || !memberDone}
        lockHint="Confirm member first"
      >
        <DrugStep
          intakeCase={intakeCase}
          state={state}
          onStateChange={onStateChange}
          editableSupply={editableSupply}
        />
      </StepCard>

      <StepCard
        index={3}
        title="Priority"
        icon={<ClockCircleOutlined />}
        complete={!!state.priority}
        locked={disabled || !drugDone}
        lockHint="Confirm drug first"
      >
        <PriorityStep state={state} onStateChange={onStateChange} />
      </StepCard>

      {includePrescriber && (
        <StepCard index={4} title="Prescriber" icon={<UserOutlined />} complete={prescriberDone}
          locked={disabled || !memberDone || !drugDone || !state.priority} lockHint="Select priority first">
          <PrescriberStep state={state} onStateChange={onStateChange} />
        </StepCard>
      )}

      <StepCard
        index={includePrescriber ? 5 : 4}
        title="Case history"
        icon={<HistoryOutlined />}
        complete={historyUnlocked && historyDone}
        locked={!historyUnlocked}
        lockHint={includePrescriber ? "Complete Chart notes, member, drug, priority, and required prescriber fax first" : "Select priority first"}
      >
        <HistoryStep
          intakeCase={intakeCase}
          state={state}
          onStateChange={onStateChange}
          onMarkRelated={onMarkRelated}
          onDismiss={onDismiss}
          onAttachExisting={onAttachExisting}
        />
      </StepCard>

      <ClaimHistoryPanel locked={!memberDone} />
    </>
  );
}

function PrescriberStep({ state, onStateChange }: {
  state: IntakeState;
  onStateChange: (s: IntakeState) => void;
}) {
  const prescriber = state.prescriber ?? { npi: "", providerName: "", phoneNumber: "", faxNumber: "" };
  const fields = [
    { key: "npi", label: "NPI" },
    { key: "providerName", label: "Provider name" },
    { key: "phoneNumber", label: "Phone number" },
    { key: "faxNumber", label: "Fax number" },
  ] as const;
  return (
    <div className="grid grid-cols-1 gap-3">
      {fields.map(({ key, label }) => (
        <label key={key} className="flex flex-col gap-1 text-sm text-foreground">
          <span>{label}{key === "faxNumber" && <span className="text-destructive"> *</span>}</span>
          <Input aria-label={label} required={key === "faxNumber"} value={prescriber[key]}
            onChange={(event) => onStateChange({ ...state, prescriber: { ...prescriber, [key]: event.target.value } })} />
        </label>
      ))}
    </div>
  );
}

/* ---------------- Step 3: Priority ---------------- */

function PriorityStep({
  state,
  onStateChange,
}: {
  state: IntakeState;
  onStateChange: (s: IntakeState) => void;
}) {
  const options: { value: "standard" | "expedited"; label: string }[] = [
    { value: "standard", label: "Standard" },
    { value: "expedited", label: "Expedited" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Text style={{ fontSize: 14, color: "#595959" }}>
        Set the review priority before creating the case.
      </Text>
      <div style={{ display: "flex", gap: 8 }}>
        {options.map((o) => {
          const selected = state.priority === o.value;
          return (
            <div
              key={o.value}
              onClick={() => onStateChange({ ...state, priority: o.value })}
              className="cursor-pointer"
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 8,
                border: selected ? `1px solid ${ACCENT}` : "1px solid #bfbfbf",
                background: selected ? "#f0f4fb" : "#fff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {o.value === "expedited" ? (
                  <ThunderboltOutlined style={{ color: selected ? ACCENT : "#8c8c8c" }} />
                ) : (
                  <ClockCircleOutlined style={{ color: selected ? ACCENT : "#8c8c8c" }} />
                )}
                <Text strong style={{ fontSize: 14 }}>{o.label}</Text>
                {selected && <CheckOutlined style={{ color: ACCENT, marginLeft: "auto" }} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Layout B: Electronic (CMM) ---------------- */

function ElectronicPanel({
  intakeCase,
  state,
  onStateChange,
  disabled,
}: {
  intakeCase: IntakeCase;
  state: IntakeState;
  onStateChange: (s: IntakeState) => void;
  disabled: boolean;
}) {
  // Determine which field was flagged. Heuristic on mock data: hint containing
  // "mismatch" or "Unclear" indicates that field triggered the flag.
  const memberFlagged = /mismatch|unidentif/i.test(intakeCase.memberHint ?? "");
  const drugFlagged = /unclear|unknown/i.test(intakeCase.drugHint ?? "");
  // If neither obviously flagged, default to member.
  const flagLabel = memberFlagged
    ? "member"
    : drugFlagged
      ? "drug"
      : "member";

  return (
    <Card
      size="small"
      title={
        <Space>
          <ThunderboltOutlined style={{ color: ACCENT }} />
          <span>Correction required</span>
        </Space>
      }
      style={{ opacity: disabled ? 0.55 : 1 }}
    >
      {disabled ? (
        <Text type="secondary" style={{ fontSize: 14 }}>
          <LockOutlined /> Claim the request to begin
        </Text>
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Alert
            type="warning"
            showIcon
            message="This electronic request needs a correction before it can be sent to the provider."
            description={`The ${flagLabel} on the CoverMyMeds request could not be reconciled. Fix and re-send.`}
          />
          <div
            style={{
              padding: 12,
              borderRadius: 6,
              border: `1px solid ${memberFlagged ? "#faad14" : "#d9d9d9"}`,
              background: memberFlagged ? "#fffbe6" : "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <UserOutlined style={{ color: ACCENT }} />
              <Text strong style={{ fontSize: 14 }}>Member</Text>
              {memberFlagged && (
                <Tag color="warning" icon={<WarningFilled />} style={{ marginRight: 0 }}>
                  Flagged
                </Tag>
              )}
            </div>
            <MemberStep
              intakeCase={intakeCase}
              state={state}
              onStateChange={onStateChange}
            />
          </div>
          <div
            style={{
              padding: 12,
              borderRadius: 6,
              border: `1px solid ${drugFlagged ? "#faad14" : "#d9d9d9"}`,
              background: drugFlagged ? "#fffbe6" : "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <MedicineBoxOutlined style={{ color: ACCENT }} />
              <Text strong style={{ fontSize: 14 }}>Drug</Text>
              {drugFlagged && (
                <Tag color="warning" icon={<WarningFilled />} style={{ marginRight: 0 }}>
                  Flagged
                </Tag>
              )}
            </div>
            <DrugStep
              intakeCase={intakeCase}
              state={state}
              onStateChange={onStateChange}
            />
          </div>
        </Space>
      )}
    </Card>
  );
}

/* ---------------- RFI panel ---------------- */

function RfiPanel({
  intakeCase,
  onDoctorResponded,
}: {
  intakeCase: IntakeCase;
  onDoctorResponded: () => void;
}) {
  const rfi = intakeCase.rfi;
  if (!rfi) return null;
  return (
    <Card size="small" title={<Space><ClockCircleOutlined /> <span>Awaiting doctor response</span></Space>}>
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="Requested">{rfi.requestedAt}</Descriptions.Item>
          <Descriptions.Item label="Deadline">{rfi.dueAt}</Descriptions.Item>
          <Descriptions.Item label="Time remaining">
            <Tag color="blue" style={{ marginRight: 0 }}>{rfi.remaining}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Requested">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {rfi.requestedFields.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </Descriptions.Item>
          <Descriptions.Item label="Note">{rfi.note}</Descriptions.Item>
        </Descriptions>
        <Button type="primary" onClick={onDoctorResponded} style={{ background: ACCENT, borderColor: ACCENT }}>
          Doctor responded — reopen in Unassigned
        </Button>
      </Space>
    </Card>
  );
}

/* ---------------- Individual steps ---------------- */

function MemberStep({
  intakeCase,
  state,
  onStateChange,
}: {
  intakeCase: IntakeCase;
  state: IntakeState;
  onStateChange: (s: IntakeState) => void;
}) {
  // Ranked candidates returned by the fax match layer (highest score first).
  const candidates = useMemo(
    () =>
      getMemberCandidates(intakeCase.id, intakeCase.bestGuessMemberId)
        .map((c) => ({ ...c, member: mockMemberDirectory.find((m) => m.id === c.memberId) }))
        .filter((c): c is typeof c & { member: MemberRecord } => !!c.member),
    [intakeCase.id, intakeCase.bestGuessMemberId],
  );

  const topCandidate = candidates[0];
  const [chosenId, setChosenId] = useState<string | undefined>(
    state.member?.id ?? topCandidate?.member.id,
  );
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const chosenCandidate = candidates.find((c) => c.member.id === chosenId);
  const chosen: MemberRecord | undefined =
    state.member ?? chosenCandidate?.member ?? mockMemberDirectory.find((m) => m.id === chosenId);

  const scoreColor = (s: number) => (s >= 85 ? "#52c41a" : s >= 60 ? "#faad14" : "#ff4d4f");

  const ScoreTag = ({ score, reason }: { score: number; reason: string }) => {
    const low = score < LOW_CONFIDENCE_THRESHOLD;
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
        <Tooltip title={`Extraction confidence ${score}%`}>
          {low ? (
            <Tag
              icon={<WarningFilled style={{ fontSize: 10 }} />}
              color="#fffbe6"
              style={{
                marginRight: 0,
                fontSize: 12,
                color: "#ad6800",
                border: "1px solid #ffe58f",
                cursor: "help",
              }}
            >
              Low confidence
            </Tag>
          ) : (
            <Tag color={scoreColor(score)} style={{ marginRight: 0, fontSize: 12, cursor: "help" }}>
              {score}% match
            </Tag>
          )}
        </Tooltip>
        <Text type="secondary" style={{ fontSize: 13 }}>{reason}</Text>
      </span>
    );
  };

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return mockMemberDirectory
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.memberId.toLowerCase().includes(q) ||
          m.dob.includes(q),
      )
      .slice(0, 8);
  }, [searchQuery]);

  const pick = (m: MemberRecord) => {
    setChosenId(m.id);
    setExpanded(false);
    setSearchQuery("");
    if (state.member) onStateChange({ ...state, member: m });
  };

  const rowStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 12px",
    borderBottom: "1px solid #f0f0f0",
    cursor: "pointer",
    background: active ? "#e8edf7" : "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  });

  const otherCandidates = candidates.filter((c) => c.member.id !== chosen?.id);

  const expandedPanel = (
    <div style={{ marginTop: 10, border: "1px solid #d9d9d9", borderRadius: 6, background: "#fff" }}>
      {otherCandidates.length > 0 && (
        <>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #f0f0f0", background: "#fafafa" }}>
            <Text type="secondary" style={{ fontSize: 13 }}>Other matched candidates (ranked)</Text>
          </div>
          {otherCandidates.map((c) => (
            <div
              key={c.member.id}
              onClick={() => pick(c.member)}
              style={rowStyle(false)}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#fafafa")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#fff")}
            >
              <div style={{ minWidth: 0 }}>
                <Text strong style={{ fontSize: 14 }}>{c.member.name}</Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    DOB {c.member.dob} · {c.member.memberId} · {c.member.plan}
                  </Text>
                </div>
              </div>
              <ScoreTag score={c.score} reason={c.reason} />
            </div>
          ))}
        </>
      )}

      <div style={{ padding: 12 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>Search for a different member</Text>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search by name, member ID, or DOB…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ marginTop: 6 }}
        />
        {searchQuery.trim() && (
          <div style={{ marginTop: 8, border: "1px solid #f0f0f0", borderRadius: 6, maxHeight: 240, overflowY: "auto" }}>
            {searchResults.length === 0 ? (
              <div style={{ padding: 12, textAlign: "center" }}>
                <Text type="secondary" style={{ fontSize: 13 }}>No members match “{searchQuery}”.</Text>
              </div>
            ) : (
              searchResults.map((m) => (
                <div
                  key={m.id}
                  onClick={() => pick(m)}
                  style={rowStyle(m.id === chosen?.id)}
                  onMouseEnter={(e) => {
                    if (m.id !== chosen?.id) (e.currentTarget as HTMLDivElement).style.background = "#fafafa";
                  }}
                  onMouseLeave={(e) => {
                    if (m.id !== chosen?.id) (e.currentTarget as HTMLDivElement).style.background = "#fff";
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <Text strong style={{ fontSize: 14 }}>{m.name}</Text>
                    <div>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        DOB {m.dob} · {m.memberId} · {m.plan}
                      </Text>
                    </div>
                  </div>
                  {m.id === chosen?.id && <Tag color="blue" style={{ marginRight: 0 }}>Current</Tag>}
                </div>
              ))
            )}
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <Button size="small" onClick={() => { setExpanded(false); setSearchQuery(""); }}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );

  const changeButton = (
    <Button size="small" onClick={() => setExpanded((v) => !v)}>
      {expanded ? "Hide candidates" : "Change member"}
    </Button>
  );

  // ---- Confirmed member ----
  if (state.member) {
    const m = state.member;
    const match = candidates.find((c) => c.member.id === m.id);
    return (
      <>
        <Collapse
          size="small"
          defaultActiveKey={[]}
          style={{ background: "#f6ffed", border: "1px solid #b7eb8f", borderRadius: 6 }}
          items={[
            {
              key: "member",
              style: { border: "none" },
              label: (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, flexWrap: "wrap" }}>
                  <Text strong>{m.name}</Text>
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    · DOB {m.dob} · {m.memberId}
                  </Text>
                  {match && <ScoreTag score={match.score} reason={match.reason} />}
                  <span
                    style={{
                      marginLeft: 6,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#52c41a",
                    }}
                  >
                    <CheckCircleFilled style={{ fontSize: 11 }} /> Confirmed
                  </span>
                </div>
              ),
              children: (
                <div style={{ background: "#fff", padding: 8, borderRadius: 4 }}>
                  <Descriptions size="small" column={2} bordered>
                    <Descriptions.Item label="Name">{m.name}</Descriptions.Item>
                    <Descriptions.Item label="DOB">{m.dob}</Descriptions.Item>
                    <Descriptions.Item label="Member ID">{m.memberId}</Descriptions.Item>
                    <Descriptions.Item label="Person code">{m.personCode}</Descriptions.Item>
                    <Descriptions.Item label="Carrier">{m.carrier}</Descriptions.Item>
                    <Descriptions.Item label="Plan">{m.plan}</Descriptions.Item>
                    <Descriptions.Item label="Effective date">{m.effectiveDate}</Descriptions.Item>
                    <Descriptions.Item label="Term date">{m.termDate ?? "—"}</Descriptions.Item>
                  </Descriptions>
                  <div style={{ marginTop: 10 }}>{changeButton}</div>
                  {expanded && expandedPanel}
                </div>
              ),
            },
          ]}
        />
      </>
    );
  }

  // ---- Unconfirmed: top candidate + change member ----
  return (
    <Space direction="vertical" size={10} style={{ width: "100%" }}>
      {chosen ? (
        <>
          <Alert
            type="info"
            showIcon
            message={
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Text style={{ fontSize: 14 }}>
                  Top match: <b>{chosen.name}</b> · {chosen.memberId}
                </Text>
                {chosenCandidate && <ScoreTag score={chosenCandidate.score} reason={chosenCandidate.reason} />}
              </div>
            }
          />
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="Name">{chosen.name}</Descriptions.Item>
            <Descriptions.Item label="DOB">{chosen.dob}</Descriptions.Item>
            <Descriptions.Item label="Member ID">{chosen.memberId}</Descriptions.Item>
            <Descriptions.Item label="Person code">{chosen.personCode}</Descriptions.Item>
            <Descriptions.Item label="Carrier">{chosen.carrier}</Descriptions.Item>
            <Descriptions.Item label="Plan">{chosen.plan}</Descriptions.Item>
            <Descriptions.Item label="Effective date">{chosen.effectiveDate}</Descriptions.Item>
            <Descriptions.Item label="Term date">{chosen.termDate ?? "—"}</Descriptions.Item>
          </Descriptions>
        </>
      ) : (
        <Text type="secondary" style={{ fontSize: 14 }}>
          No member matched. Use “Change member” to search.
        </Text>
      )}

      <Space>
        <Button
          type="primary"
          disabled={!chosen}
          onClick={() => chosen && onStateChange({ ...state, member: chosen })}
          style={chosen ? { background: ACCENT, borderColor: ACCENT } : undefined}
        >
          Confirm member
        </Button>
        {changeButton}
      </Space>

      {expanded && expandedPanel}
    </Space>
  );
}

function DrugStep({
  intakeCase,
  state,
  onStateChange,
  editableSupply = false,
}: {
  intakeCase: IntakeCase;
  state: IntakeState;
  onStateChange: (s: IntakeState) => void;
  editableSupply?: boolean;
}) {
  const bestGuess = intakeCase.bestGuessDrugId
    ? mockDrugDirectory.find((d) => d.id === intakeCase.bestGuessDrugId)
    : undefined;

  const [pendingDraft, setPendingDraft] = useState<DrugRecord | undefined>(state.drug ?? bestGuess);
  const [qty, setQty] = useState<string>(state.quantity ?? intakeCase.bestGuessQuantity ?? "");
  const [days, setDays] = useState<string>(state.daysSupply ?? intakeCase.bestGuessDaysSupply ?? "");
  useEffect(() => {
    if (state.drug) setPendingDraft(state.drug);
  }, [state.drug]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalQuery, setModalQuery] = useState("");
  const [modalSelected, setModalSelected] = useState<string | undefined>(pendingDraft?.id);

  const openModal = () => {
    setModalSelected(pendingDraft?.id);
    setModalQuery("");
    setModalOpen(true);
  };

  const filteredRows = useMemo(() => {
    const q = modalQuery.trim().toLowerCase();
    if (!q) return mockDrugDirectory;
    return mockDrugDirectory.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.gpi14 ?? "").includes(q) ||
        d.ndc.includes(q) ||
        d.strength.toLowerCase().includes(q) ||
        d.form.toLowerCase().includes(q) ||
        (d.route ?? "").toLowerCase().includes(q),
    );
  }, [modalQuery]);

  const isDirty = !!(
    state.drug &&
    (
      (pendingDraft && pendingDraft.id !== state.drug.id) ||
      qty !== (state.quantity ?? "") ||
      days !== (state.daysSupply ?? "")
    )
  );

  const confirmDrug = () => {
    if (!pendingDraft) return;
    onStateChange({ ...state, drug: pendingDraft, quantity: qty, daysSupply: days });
  };

  const drugField = (d: DrugRecord | undefined) => {
    if (!d) {
      return (
        <Text type="secondary" style={{ fontSize: 14 }}>
          No drug selected.
        </Text>
      );
    }
    return (
      <Descriptions size="small" column={2} bordered>
        <Descriptions.Item label="Drug" span={2}>{d.name}</Descriptions.Item>
        <Descriptions.Item label="Strength">{d.strength}</Descriptions.Item>
        <Descriptions.Item label="Form">{d.form}</Descriptions.Item>
        <Descriptions.Item label="Route">{d.route ?? "—"}</Descriptions.Item>
        <Descriptions.Item label="GPI">{d.gpi14 ?? "—"}</Descriptions.Item>
        <Descriptions.Item label="Quantity">{editableSupply ? <Input aria-label="Quantity" value={qty} onChange={(e) => setQty(e.target.value)} /> : qty || "—"}</Descriptions.Item>
        <Descriptions.Item label="Days supply">{editableSupply ? <Input aria-label="Days supply" value={days} onChange={(e) => setDays(e.target.value)} /> : days || "—"}</Descriptions.Item>
        <Descriptions.Item label="NDC" span={2}>{d.ndc}</Descriptions.Item>


      </Descriptions>
    );
  };

  const currentLabel = (state.drug ?? bestGuess)?.name ?? "—";
  const modal = (
    <Modal
      open={modalOpen}
      onCancel={() => setModalOpen(false)}
      width={900}
      title={
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Change medication</div>
          <Text type="secondary" style={{ fontSize: 14, fontWeight: 400 }}>
            Current: {currentLabel}
          </Text>
        </div>
      }
      footer={
        <Space>
          <Button onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button
            type="primary"
            disabled={!modalSelected}
            onClick={() => {
              const picked = mockDrugDirectory.find((d) => d.id === modalSelected);
              if (picked) setPendingDraft(picked);
              setModalOpen(false);
            }}
            style={{ background: ACCENT, borderColor: ACCENT }}
          >
            Confirm selection
          </Button>
        </Space>
      }
    >
      <Input
        prefix={<SearchOutlined />}
        placeholder="Search by GPI-14, drug name, NDC…"
        value={modalQuery}
        onChange={(e) => setModalQuery(e.target.value)}
        allowClear
        style={{ marginBottom: 12 }}
        autoFocus
      />
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        scroll={{ y: 340 }}
        dataSource={filteredRows}
        rowSelection={{
          type: "radio",
          selectedRowKeys: modalSelected ? [modalSelected] : [],
          onChange: (keys) => setModalSelected(keys[0] as string),
        }}
        onRow={(row) => ({
          onClick: () => setModalSelected(row.id),
          style: { cursor: "pointer" },
        })}
        columns={[
          {
            title: "GPI-14",
            dataIndex: "gpi14",
            width: 170,
            render: (v: string | undefined) => (
              <span style={{ fontFamily: "monospace", fontSize: 14 }}>{v ?? "—"}</span>
            ),
          },
          { title: "Drug", dataIndex: "name" },
          { title: "Strength", dataIndex: "strength", width: 140 },
          { title: "Form", dataIndex: "form", width: 150 },
          { title: "Route", dataIndex: "route", width: 130, render: (v: string | undefined) => v ?? "—" },
        ]}
      />
    </Modal>
  );

  if (state.drug) {
    const d = pendingDraft ?? state.drug;
    const headerBg = isDirty ? "#fffbe6" : "#f6ffed";
    const headerBorder = isDirty ? "#ffe58f" : "#b7eb8f";
    const accent = isDirty ? "#faad14" : "#52c41a";
    return (
      <>
        <Collapse
          size="small"
          defaultActiveKey={isDirty ? ["drug"] : []}
          activeKey={isDirty ? ["drug"] : undefined}
          style={{
            background: headerBg,
            border: `1px solid ${headerBorder}`,
            borderRadius: 6,
          }}
          items={[
            {
              key: "drug",
              style: { border: "none" },
              label: (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                  <Text strong>{d.name}</Text>
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    · {d.strength} · {d.form} · {d.route ?? "—"} · NDC {d.ndc}
                    {state.quantity ? ` · Qty ${state.quantity}` : ""}
                    {state.daysSupply ? ` · ${state.daysSupply} DS` : ""}
                  </Text>
                  <span
                    style={{
                      marginLeft: 6,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 500,
                      color: accent,
                    }}
                  >
                    {isDirty ? (
                      "Unconfirmed changes"
                    ) : (
                      <>
                        <CheckCircleFilled style={{ fontSize: 11 }} /> Confirmed
                      </>
                    )}
                  </span>
                </div>
              ),
              children: (
                <div style={{ background: "#fff", padding: 8, borderRadius: 4 }}>
                  {drugField(d)}
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    {isDirty && (
                      <>
                        <Button type="primary" size="small" onClick={confirmDrug}>
                          Confirm drug
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {
                            setPendingDraft(state.drug);
                            setQty(state.quantity ?? "");
                            setDays(state.daysSupply ?? "");
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    <Button size="small" icon={<SearchOutlined />} onClick={openModal}>
                      Change drug
                    </Button>
                  </div>
                </div>
              ),
            },
          ]}
        />
        {modal}
      </>
    );
  }

  return (
    <Space direction="vertical" size={10} style={{ width: "100%" }}>
      {bestGuess && (
        <Alert
          type="info"
          showIcon
          message={
            <Text style={{ fontSize: 14 }}>
              Best-guess drug: <b>{bestGuess.name}</b> · {bestGuess.strength}
            </Text>
          }
        />
      )}
      {drugField(pendingDraft)}
      <Space>
        <Button
          type="primary"
          disabled={!pendingDraft || !qty.trim() || !days.trim()}
          onClick={confirmDrug}
          style={{ background: ACCENT, borderColor: ACCENT }}
        >
          Confirm drug
        </Button>
        <Button icon={<SearchOutlined />} onClick={openModal}>
          Change drug
        </Button>
      </Space>
      {modal}
    </Space>
  );
}

type HistoryStatus =
  | "ready"
  | "tech_review"
  | "rfi"
  | "approved"
  | "denied"
  | "withdrawn"
  | "dismissed"
  | "raw";
type HistoryRowType = "open" | "terminal" | "raw";

interface HistoryRow {
  id: string;
  type: HistoryRowType;
  status: HistoryStatus;
  date: string;
  drug: string;
  quantity: string;
  daysSupply: string;
  providerName: string;
  requestType: string;
  priorityLevel: string;
  source: string;
}

const STATUS_META: Record<
  HistoryStatus,
  { label: string; color: string; hex: string; bg: string }
> = {
  ready:     { label: "Ready for Clinical Review", color: "geekblue", hex: "#12275e", bg: "#f0f4fb" },
  tech_review: { label: "In Tech Review",          color: "blue",     hex: "#1677ff", bg: "#e6f4ff" },
  rfi:       { label: "RFI",                       color: "gold",     hex: "#faad14", bg: "#fffbe6" },
  approved:  { label: "Approved",                  color: "green",    hex: "#52c41a", bg: "#f6ffed" },
  denied:    { label: "Denied",                    color: "red",      hex: "#ff4d4f", bg: "#fff1f0" },
  withdrawn: { label: "Withdrawn",                 color: "default",  hex: "#8c8c8c", bg: "#fafafa" },
  dismissed: { label: "Dismissed",                 color: "default",  hex: "#8c8c8c", bg: "#fafafa" },
  raw:       { label: "Unprocessed fax",           color: "default",  hex: "#8c8c8c", bg: "#fafafa" },
};

const MOCK_HISTORY_ROWS: HistoryRow[] = [
  { id: "CASE-2026-1190", type: "open",     status: "ready",     date: "2026-07-10", drug: "Zepbound",         quantity: "2 pens",     daysSupply: "28", providerName: "RAMON LLORET", requestType: "Initial Request", priorityLevel: "Standard", source: "Fax" },
  { id: "CASE-2026-1189", type: "open",     status: "tech_review", date: "2026-07-09", drug: "Zepbound",       quantity: "2 pens",     daysSupply: "28", providerName: "RAMON LLORET", requestType: "Initial Request", priorityLevel: "Standard", source: "Fax" },
  { id: "CASE-2026-1188", type: "open",     status: "rfi",       date: "2026-07-08", drug: "Zepbound",         quantity: "2 pens",     daysSupply: "28", providerName: "RAMON LLORET", requestType: "Initial Request", priorityLevel: "Standard", source: "Fax" },
  { id: "CASE-2025-0997", type: "terminal", status: "approved",  date: "2025-11-02", drug: "Zepbound",       quantity: "4 pens",     daysSupply: "28", providerName: "RAMON LLORET", requestType: "Initial Request", priorityLevel: "Standard", source: "Fax" },
  { id: "CASE-2025-0765", type: "terminal", status: "denied",    date: "2025-06-14", drug: "Wegovy",         quantity: "4 pens",     daysSupply: "28", providerName: "RAMON LLORET", requestType: "Initial Request", priorityLevel: "Standard", source: "Fax" },
  { id: "CASE-2024-0512", type: "terminal", status: "withdrawn", date: "2024-09-18", drug: "Contrave",      quantity: "120 tablets", daysSupply: "30", providerName: "RAMON LLORET", requestType: "Initial Request", priorityLevel: "Standard", source: "Fax" },
  { id: "CASE-2024-0311", type: "terminal", status: "dismissed", date: "2024-03-02", drug: "Phentermine",   quantity: "30 tablets",  daysSupply: "30", providerName: "RAMON LLORET", requestType: "Initial Request", priorityLevel: "Standard", source: "Fax" },
];


const COPY_FIELDS: { key: string; label: string }[] = [
  { key: "notes",      label: "Notes" },
  { key: "diagnosis",  label: "Diagnosis" },
  { key: "quantity",   label: "Quantity" },
  { key: "daysSupply", label: "Days Supply" },
];

const DISMISS_REASONS = [
  { value: "no_pa", label: "No PA required" },
  { value: "on_file", label: "PA already on file" },
  { value: "pharmacy", label: "Fill at specified pharmacy" },
  { value: "indefinite", label: "Indefinite auth on file" },
];

const NEW_CASE_TYPES = [
  { value: "initial", label: "Initial Request" },
  { value: "appeal1", label: "First Level Appeal" },
  { value: "appeal2", label: "Second Level Appeal" },
  { value: "external", label: "External Review" },
];

const APPEAL_LEVELS = [
  { value: "appeal1", label: "First Level Appeal" },
  { value: "appeal2", label: "Second Level Appeal" },
  { value: "external", label: "External Review" },
];

function DismissLetterModal({ rowId, memberName, memberId, drugName, onCancel, onConfirm }: { rowId: string; memberName: string; memberId: string; drugName: string; onCancel: () => void; onConfirm: () => void }) {
  const [templateId, setTemplateId] = useState<string>();
  const [letter, setLetter] = useState("");
  return (
    <Modal
      open
      width={800}
      title="Dismiss as unnecessary"
      onCancel={onCancel}
      footer={
        <div style={{ display: "flex", gap: 12 }}>
          <Button onClick={onCancel} style={{ flex: 1 }}>Cancel</Button>
          <Button danger type="primary" disabled={!templateId} onClick={onConfirm} style={{ flex: 1 }}>Confirm dismissal</Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Alert type="warning" showIcon message={`A letter will be sent to the provider referencing ${rowId}.`} />
        <TemplateLetterSection
          trigger="Dismissed as Unnecessary"
          vars={{ member_name: memberName, member_id: memberId, drug_name: drugName, case_id: rowId }}
          templateId={templateId}
          letter={letter}
          onChange={(v) => { setTemplateId(v.templateId); setLetter(v.letter); }}
        />
      </div>
    </Modal>
  );
}

function HistoryStep({
  intakeCase,
  state,
  onStateChange,
  onAttachExisting,
  onDismiss,
}: {
  intakeCase: IntakeCase;
  state: IntakeState;
  onStateChange: (s: IntakeState) => void;
  onMarkRelated?: (id: string) => void;
  onDismiss?: () => void;
  onAttachExisting?: () => void;
}) {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mergeIds, setMergeIds] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<string | null>(null);
  const [newCaseType, setNewCaseType] = useState<string | undefined>();
  const [dismissReason, setDismissReason] = useState<string | undefined>();
  const [fullCaseId, setFullCaseId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [appealRowId, setAppealRowId] = useState<string | null>(null);
  const [appealLevel, setAppealLevel] = useState<string | undefined>();

  useEffect(() => {
    if (!state.historyReviewed) onStateChange({ ...state, historyReviewed: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = MOCK_HISTORY_ROWS;

  const resetActions = () => {
    setAction(null);
    setNewCaseType(undefined);
    setDismissReason(undefined);
  };

  const selectRow = (row: HistoryRow) => {
    setSelectedId(row.id);
    resetActions();
  };

  const toggleMerge = (id: string) => {
    setMergeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fullCaseRow = rows.find((r) => r.id === fullCaseId) ?? null;
  const previewRow = rows.find((r) => r.id === previewId) ?? null;
  const expandedRow = rows.find((r) => r.id === selectedId) ?? null;
  const attachTarget = expandedRow && expandedRow.type === "open" ? expandedRow : null;


  const smallBtn = { background: ACCENT, borderColor: ACCENT };

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <style>{`
        .history-live-row:hover { background: #f5f8ff !important; }
        .history-live-row:hover .ant-collapse-header { cursor: pointer; }
        .history-terminal-row:hover { background: #f2f2f2 !important; }
      `}</style>

      <Collapse
        accordion
        bordered
        activeKey={selectedId ?? undefined}
        onChange={(key) => {
          const id = Array.isArray(key) ? key[0] : key;
          if (!id) {
            setSelectedId(null);
            resetActions();
          } else {
            const row = rows.find((r) => r.id === id);
            if (row) selectRow(row);
          }
        }}
        style={{ background: "#fff", borderColor: "#bfbfbf" }}
        items={rows.map((row) => {
          const meta = STATUS_META[row.status];
          const isTerminal = row.type === "terminal";
          const isRaw = row.type === "raw";
          const isSelected = selectedId === row.id;

          const header = (
            <div
              className="history-case-header"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                opacity: isTerminal ? 0.85 : 1,
              }}
            >
              {isRaw ? (
                <Checkbox
                  checked={mergeIds.has(row.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleMerge(row.id)}
                />
              ) : (
                <span style={{ width: 16 }} />
              )}
              <div className="history-case-summary" style={{ flex: 1, minWidth: 0 }}>
                <div>
                  <Text strong style={{ fontSize: 14, color: isTerminal ? "#595959" : undefined }}>
                    {row.id}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 14, marginLeft: 8 }}>
                    {row.date}
                  </Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    {row.drug} · {row.providerName}
                  </Text>
                </div>
              </div>

              {isRaw ? (
                <Button
                  type="link"
                  size="small"
                  icon={<EyeOutlined />}
                  style={{ padding: 0, fontSize: 13 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewId(row.id);
                  }}
                >
                  Preview
                </Button>
              ) : (
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0, fontSize: 13 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullCaseId(row.id);
                  }}
                >
                  View
                </Button>
              )}

              {isTerminal && <LockOutlined style={{ color: "#8c8c8c", fontSize: 14 }} />}
              <Tag
                color={meta.color}
                style={{
                  marginRight: 0,
                  fontSize: 11,
                  cursor: isRaw ? "default" : "pointer",
                  ...(isRaw ? { borderStyle: "dashed" } : {}),
                }}
              >
                {meta.label}
              </Tag>
            </div>
          );

          /* ---- status-specific actions ---- */
          let body: React.ReactNode = null;

          const attachButton = (label: string, description: string) => (
            <Button
              size="small"
              type="primary"
              style={smallBtn}
              onClick={() => {
                showActionResult({ title: label === "Attach to this case" ? "Fax attached to case" : "Attached and sent to Clinical Review", message: label === "Attach to this case" ? `The new fax was attached to ${row.id}. No new case number was created.` : `The new fax was attached to ${row.id} and the case was sent straight to Clinical Review, skipping tech review.`, caseNumber: row.id, details: [{ label: "Drug", value: row.drug }, { label: "Quantity / days supply", value: `${row.quantity} · ${row.daysSupply} days` }] });
                onAttachExisting?.();
              }}
            >
              {label}
            </Button>
          );

          if (row.status === "ready" || row.status === "tech_review") {
            body = (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  {attachButton("Attach to this case", row.id)}
                </div>
              </div>
            );
          } else if (row.status === "rfi") {
            body = (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  {attachButton("Attach & send to Clinical Review", `${row.id} · skips tech review`)}
                </div>
              </div>
            );
          } else if (row.status === "approved" || row.status === "withdrawn" || row.status === "dismissed") {
            body = (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <Button
                    size="small"
                    type={action === "dismiss" ? "primary" : "default"}
                    style={action === "dismiss" ? smallBtn : undefined}
                    onClick={() => {
                      setAction(action === "dismiss" ? null : "dismiss");
                      setNewCaseType(undefined);
                    }}
                  >
                    Dismiss as unnecessary
                  </Button>
                  <Button
                    size="small"
                    type={action === "new" ? "primary" : "default"}
                    style={action === "new" ? smallBtn : undefined}
                    onClick={() => setAction(action === "new" ? null : "new")}
                  >
                    Open new case
                  </Button>
                </div>
                {isSelected && action === "dismiss" && (
                  <DismissLetterModal
                    rowId={row.id}
                    memberName={state.member?.name ?? ""}
                    memberId={state.member?.memberId ?? ""}
                    drugName={row.drug}
                    onCancel={resetActions}
                    onConfirm={() => {
                      showActionResult({ title: "Dismissed as unnecessary", message: `This transaction was dismissed. A provider letter was queued referencing ${row.id}${row.status === "approved" ? ` (approved ${row.date})` : ""}.`, caseNumber: row.id, details: [{ label: "Drug", value: row.drug }, { label: "Quantity / days supply", value: `${row.quantity} · ${row.daysSupply} days` }] });
                      resetActions();
                      onDismiss?.();
                    }}
                  />
                )}
                {isSelected && action === "new" && (
                  <NewCaseTypePicker
                    value={newCaseType}
                    onChange={setNewCaseType}
                    onCancel={resetActions}
                    onConfirm={() => {
                      showActionResult({ title: "New case created", message: `A new ${NEW_CASE_TYPES.find((t) => t.value === newCaseType)?.label} case was opened from ${row.id}.`, caseNumber: `${row.id}-N`, details: [{ label: "Case type", value: NEW_CASE_TYPES.find((t) => t.value === newCaseType)?.label }, { label: "Priority", value: state.priority === "expedited" ? "Expedited" : "Standard" }, { label: "Linked to", value: row.id }, { label: "Drug", value: row.drug }] });
                      resetActions();
                    }}
                  />
                )}
              </div>
            );
          } else if (row.status === "denied") {
            body = (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <Button
                    size="small"
                    type="primary"
                    style={smallBtn}
                    onClick={() => {
                      setAppealRowId(row.id);
                      setAppealLevel(undefined);
                    }}
                  >
                    Open an appeal
                  </Button>
                </div>
              </div>
            );
          } else {
            body = (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <Button
                    size="small"
                    type={action === "dismiss" ? "primary" : "default"}
                    style={action === "dismiss" ? smallBtn : undefined}
                    onClick={() => setAction(action === "dismiss" ? null : "dismiss")}
                  >
                    Dismiss as unnecessary
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    style={smallBtn}
                    onClick={() => {
                      showActionResult({ title: "Fax attached to case", message: `${row.id} was attached to this case.`, caseNumber: row.id });
                      resetActions();
                      onAttachExisting?.();
                    }}
                  >
                    Attach to case
                  </Button>
                </div>
                {isSelected && action === "dismiss" && (
                  <div
                    style={{
                      borderTop: "1px dashed #d9d9d9",
                      paddingTop: 10,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <Text strong style={{ fontSize: 14 }}>
                      Dismissal reason <span style={{ color: "#ff4d4f" }}>*</span>
                    </Text>
                    <Select
                      placeholder="Select dismissal reason"
                      value={dismissReason}
                      onChange={setDismissReason}
                      options={DISMISS_REASONS}
                      style={{ maxWidth: 340 }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      <Button size="small" onClick={resetActions}>Cancel</Button>
                      <Button
                        size="small"
                        danger
                        type="primary"
                        disabled={!dismissReason}
                        onClick={() => {
                          showActionResult({ title: "Dismissed as unnecessary", message: `${row.id} was dismissed.`, caseNumber: row.id, details: [{ label: "Reason", value: DISMISS_REASONS.find((d) => d.value === dismissReason)?.label }] });
                          resetActions();
                        }}
                      >
                        Confirm dismissal
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return {
            key: row.id,
            label: header,
            showArrow: false,
            className: isTerminal ? "history-terminal-row" : "history-live-row",
            style: {
              background: isSelected ? meta.bg : isTerminal ? "#fafafa" : "#fff",
              borderLeft: `3px solid ${isSelected ? meta.hex : isTerminal ? "transparent" : "#d6dff0"}`,
            },
            children: (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="rounded-md border border-border bg-card px-3 py-2">
                  {[
                    ["Quantity", row.quantity],
                    ["Days Supply", row.daysSupply],
                    ["Provider Name", row.providerName],
                    ["Request Type", row.requestType],
                    ["Priority Level", row.priorityLevel],
                    ["Source", row.source],
                  ].map(([label, value]) => (
                    <div key={label} className="grid grid-cols-2 gap-4 py-1 text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="break-words text-right text-primary">{value}</span>
                    </div>
                  ))}
                </div>
                {body}
              </div>
            ),
          };
        })}
      />

      {mergeIds.size >= 1 && (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "8px 12px",
            background: "#f0f4fb",
            border: `1px solid ${ACCENT}`,
            borderRadius: 6,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Text strong style={{ fontSize: 14, color: ACCENT }}>
              {mergeIds.size} unprocessed fax{mergeIds.size === 1 ? "" : "es"} selected
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {mergeIds.size === 1
                ? "Select at least one more fax to merge them into a new case."
                : `Merging combines these ${mergeIds.size} faxes into one new case.`}
            </Text>
          </div>
          {mergeIds.size >= 2 && (
            <Button
              size="small"
              type="primary"
              style={smallBtn}
              onClick={() => {
                showActionResult({ title: "Merged into a new case", message: `${mergeIds.size} faxes were merged into one new case.`, details: [{ label: "Faxes", value: Array.from(mergeIds).join(", ") }] });
                setMergeIds(new Set());
              }}
            >
              Merge into new case
            </Button>
          )}
        </div>
      )}


      <Modal
        open={!!fullCaseRow}
        onCancel={() => setFullCaseId(null)}
        title="Opens in a new tab"
        footer={<Button onClick={() => setFullCaseId(null)}>Close</Button>}
        width={480}
      >
        {fullCaseRow && (
          <Text style={{ fontSize: 14, color: "#595959" }}>
            In the live product, this opens {fullCaseRow.id} in a new browser tab, the same way
            Triage does. This prototype shows this message instead of opening the tab.
          </Text>
        )}
      </Modal>

      <Modal
        open={!!appealRowId}
        onCancel={() => setAppealRowId(null)}
        title={`Open an appeal · ${appealRowId ?? ""}`}
        okText="Create appeal case"
        okButtonProps={{ disabled: !appealLevel, style: appealLevel ? smallBtn : undefined }}
        onOk={() => {
          showActionResult({ title: "Appeal case created", message: `A ${APPEAL_LEVELS.find((l) => l.value === appealLevel)?.label} case was opened and linked back to denied case ${appealRowId}.`, caseNumber: `${appealRowId}-A`, details: [{ label: "Appeal level", value: APPEAL_LEVELS.find((l) => l.value === appealLevel)?.label }, { label: "Priority", value: state.priority === "expedited" ? "Expedited" : "Standard" }, { label: "Linked to", value: appealRowId }] });
          setAppealRowId(null);
          setAppealLevel(undefined);
          resetActions();
        }}
        width={480}
      >
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <Text style={{ fontSize: 14, color: "#595959" }}>
            The new case will be linked back to {appealRowId} so reviewers can see it is an appeal of that denial.
          </Text>
          <Text strong style={{ fontSize: 14 }}>
            Appeal level <span style={{ color: "#ff4d4f" }}>*</span>
          </Text>
          <Select
            placeholder="Select appeal level"
            value={appealLevel}
            onChange={setAppealLevel}
            options={APPEAL_LEVELS}
            style={{ width: "100%" }}
          />
        </Space>
      </Modal>


      <Modal
        open={!!previewRow}
        onCancel={() => setPreviewId(null)}
        title={previewRow ? `Fax preview · ${previewRow.id}` : ""}
        footer={<Button onClick={() => setPreviewId(null)}>Close</Button>}
        width={640}
      >
        {previewRow && (
          <div
            style={{
              background: "#fafafa",
              border: "1px solid #d9d9d9",
              borderRadius: 4,
              padding: 20,
              minHeight: 320,
              fontFamily: "monospace",
              fontSize: 13,
              color: "#3a3a3a",
              whiteSpace: "pre-wrap",
            }}
          >
{`PRIOR AUTHORIZATION REQUEST FORM
Received: ${previewRow.date}     Transaction: ${previewRow.id}

Patient: ${intakeCase.memberHint ?? "—"}
Medication: ${previewRow.drug}
Quantity: ${previewRow.quantity}
Day supply: ${previewRow.daysSupply}

Prescriber signature on file.
[Page 1 of 1]`}
          </div>
        )}
      </Modal>
    </Space>
  );
}

function NewCaseTypePicker({
  value,
  onChange,
  onCancel,
  onConfirm,
}: {
  value?: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      style={{
        borderTop: "1px dashed #d9d9d9",
        paddingTop: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <Text strong style={{ fontSize: 14 }}>
        New case type <span style={{ color: "#ff4d4f" }}>*</span>
      </Text>
      <Select
        placeholder="Select case type"
        value={value}
        onChange={onChange}
        options={NEW_CASE_TYPES}
        style={{ maxWidth: 340 }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button size="small" onClick={onCancel}>Cancel</Button>
        <Button
          size="small"
          type="primary"
          disabled={!value}
          style={value ? { background: ACCENT, borderColor: ACCENT } : undefined}
          onClick={onConfirm}
        >
          Create case
        </Button>
      </div>
    </div>
  );
}



/* ---------------- Step card wrapper ---------------- */

interface StepCardProps {
  index: number;
  title: string;
  icon: React.ReactNode;
  complete: boolean;
  locked: boolean;
  lockHint?: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
  badge?: React.ReactNode;
}

function StepCard({ index, title, icon, complete, locked, lockHint, children, rightAction, badge }: StepCardProps) {
  return (
    <Card
      size="small"
      style={{
        opacity: locked ? 0.55 : 1,
        borderColor: complete ? "#52c41a" : locked ? "#bfbfbf" : "#8c8c8c",
        background: locked ? "#fafafa" : "#fff",
      }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: complete ? "#52c41a" : locked ? "#bfbfbf" : ACCENT,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {complete ? <CheckOutlined /> : index}
          </div>
          <span style={{ color: ACCENT }}>{icon}</span>
          <span>{title}</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {badge}
            {rightAction}
            {locked ? (
              <Tag icon={<LockOutlined />} color="default" style={{ marginRight: 0 }}>Locked</Tag>
            ) : complete ? (
              <Tag color="success" style={{ marginRight: 0 }}>Complete</Tag>
            ) : (
              <Tag color="processing" style={{ marginRight: 0 }}>In progress</Tag>
            )}
          </div>
        </div>
      }
    >
      {locked ? (
        <Text type="secondary" style={{ fontSize: 14 }}>
          <LockOutlined /> {lockHint ?? "Complete previous steps first"}
        </Text>
      ) : (
        children
      )}
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Unassigned queue: test-claim flow (auto-run test claim + tech disposition)
// -----------------------------------------------------------------------------
import { UnassignedDetail } from "@/components/unassigned/UnassignedDetail";
import type { UnassignedCase, TestClaimOutcome } from "@/data/mockUnassignedCases";
import { mockIcd10 } from "@/data/mockUnassignedCases";
import { toast as sonnerToast } from "sonner";

function synthesizeUnassignedCase(c: IntakeCase): UnassignedCase {
  // Outcome is now driven by the case's own `testOutcome` field so demo cases
  // in the queue can each represent a distinct real-world state.
  const outcome: TestClaimOutcome = c.testOutcome ?? "pa_required";
  const returned = c.id === "intake-5";
  const drug = mockDrugDirectory.find((d) => d.id === c.bestGuessDrugId);
  const dxMatch = c.bestGuessDiagnosis?.match(/([A-Z]\d{2}(?:\.\d+)?)/);
  const suggestedDx =
    dxMatch && mockIcd10.find((d) => d.code === dxMatch[1])
      ? mockIcd10.find((d) => d.code === dxMatch[1])!
      : outcome === "pa_required"
      ? { code: "E66.9", label: "Obesity, unspecified" }
      : { code: "L40.50", label: "Arthropathic psoriasis, unspecified" };
  // NCPDP reject codes returned by the test claim. A single claim can come back
  // with several rejects, so each outcome carries a list.
  const rejectsByOutcome: Record<string, Array<{ code: string; message: string }>> = {
    pa_required: [
      { code: "75", message: "Prior Authorization Required" },
      { code: "79", message: "Refill Too Soon" },
    ],
    non_formulary: [
      { code: "70", message: "Product/Service Not Covered" },
      { code: "MR", message: "Product Not On Formulary" },
    ],
    excluded: [{ code: "70", message: "Product/Service Not Covered — Plan Exclusion" }],
    step_therapy: [
      { code: "608", message: "Step Therapy — Preferred Product Required" },
      { code: "75", message: "Prior Authorization Required" },
    ],
    quantity_limit: [
      { code: "76", message: "Plan Limitations Exceeded" },
      { code: "AG", message: "Days Supply Limitation For Product/Service" },
    ],
    paid_unexpected: [],
  };
  const rejects = (rejectsByOutcome[outcome] ?? []).filter((r) => r.message);
  const reject = rejects[0] ? { code: rejects[0].code, reason: rejects[0].message } : undefined;
  const trueDataClients = ["DHL", "RO"];
  const client = c.id === "intake-6" ? "DHL" : c.id === "intake-7" ? "RO" : "Northwind Health";
  return {
    id: c.id,
    caseNumber: c.caseNumber ?? c.transactionId,
    memberName: c.memberHint ?? "Member",
    memberId: c.bestGuessMemberId ?? "—",
    drugName: c.drugHint,
    drugStrength: drug?.strength ?? "",
    receivedAt: c.receivedAt,
    claimedBy: c.claimedBy,
    returnedByPharmacist: returned,
    returnReason: returned
      ? "Missing recent labs — pharmacist needs clinical notes before deciding."
      : undefined,
    client,
    isTrueDataClient: trueDataClients.includes(client),
    isAppeal: false,
    testClaim: {
      outcome,
      runAt: c.receivedAt,
      claimId: `CID-${884000 + (c.caseNumber ? c.caseNumber.length : 4) * 137}`,
      rejectCode: reject?.code,
      rejectReason: reject?.reason,
      rejects,
      paidAmount: outcome === "paid_unexpected" ? "$0.00 copay" : undefined,
      requestedQuantity: c.bestGuessQuantity ? `${c.bestGuessQuantity} / 30 days` : "8 mL / 30 days",
      planLimitQuantity: "4 mL / 30 days",
    },
    paHistory:
      outcome === "paid_unexpected"
        ? [
            {
              id: "pa-adapt-1",
              drugName: c.drugHint,
              status: "Active" as const,
              startDate: "2025-10-01",
              endDate: "2026-09-01",
              current: true,
            },
          ]
        : [],
    suggestedDx,
    memberDOB: (() => {
      const m = mockMemberDirectory.find((m) => m.memberId === c.bestGuessMemberId || m.name === c.memberHint);
      if (!m) return undefined;
      const d = new Date(m.dob + "T00:00:00");
      const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
      return `${d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} (${age} yrs)`;
    })(),
    priority: (c as { priority?: string }).priority === "expedited" ? "Expedited" : "Standard",
    source: c.source,
    ndc: drug?.ndc,
    quantity: c.bestGuessQuantity ?? "8 mL",
    daysSupply: c.bestGuessDaysSupply ?? "30",
    providerName: "Dr. Ramon Lloret",
    diagnosis: c.bestGuessDiagnosis ?? `${suggestedDx.code} - ${suggestedDx.label}`,
  };
}


interface UnassignedIntakeDetailProps {
  intakeCase: IntakeCase;
  onClaim: () => void;
  onSendToReview: () => void;
  onRequestInfo: () => void;
  onDismiss: () => void;
}

function UnassignedIntakeDetail({
  intakeCase,
  onClaim,
  onSendToReview,
  onRequestInfo,
  onDismiss,
}: UnassignedIntakeDetailProps) {
  const adapted = synthesizeUnassignedCase(intakeCase);
  return (
    <UnassignedDetail
      unassignedCase={adapted}
      onClaim={onClaim}
      onSendToClinical={onSendToReview}
      onNotifyProvider={() =>
        sonnerToast("Notified provider", { description: adapted.caseNumber })
      }
      onDismiss={onDismiss}
      onRequestInfo={onRequestInfo}
    />
  );
}
