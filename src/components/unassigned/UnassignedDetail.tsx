import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { mockCases as crmMockCases } from "@/components/cases/CaseList";
import {
  Button,
  Tag,
  Typography,
  Select,
  Alert,
  Space,
  Collapse,
  Input,
  Table,
  Empty,
  Card,
  Modal,
} from "antd";
import {
  WarningFilled,
  ReloadOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
  SendOutlined,
  QuestionCircleOutlined,
  FileTextOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  ExperimentOutlined,
  NumberOutlined,
  StopOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { ClipboardList, ChevronDown } from "lucide-react";
import type { TestClaimOutcome, UnassignedCase } from "@/data/mockUnassignedCases";
import { mockIcd10, letterTemplatesByOutcome, mockFormulary } from "@/data/mockUnassignedCases";
import { toast } from "sonner";
import { RequestInformationModal } from "@/components/cases/RequestInformationModal";
import { RerunTestClaimModal, type TestClaimRun } from "./RerunTestClaimModal";

const { Title, Text } = Typography;
const { TextArea } = Input;
const ACCENT = "#12275e";

// Reject reason codes — more values to be added.
const REJECT_REASONS = [{ value: "benefit_exclusion", label: "Benefit Exclusion" }];

interface Props {
  unassignedCase: UnassignedCase;
  onClaim: () => void;
  onSendToClinical: () => void;
  onNotifyProvider: () => void;
  onDismiss: () => void;
  onRequestInfo: () => void;
}

// Badge + banner copy per test claim result.
const RESULT_CONFIG: Record<
  TestClaimOutcome,
  { label: string; color: string; style?: React.CSSProperties; banner: string; bannerType: "info" | "warning" }
> = {
  pa_required: {
    label: "Prior Authorization",
    color: "error",
    style: { background: "#fff2e8", borderColor: "#ffbb96", color: "#d4380d" },
    banner:
      "This member needs a PA for this drug. Confirm the diagnosis code below and any existing PA on file before sending to clinical review.",
    bannerType: "info",
  },
  non_formulary: {
    label: "Non-Formulary",
    color: "purple",
    banner: "This drug is non-formulary for this client. Confirm before routing.",
    bannerType: "info",
  },
  excluded: {
    label: "Excluded",
    color: "volcano",
    banner: "This drug is excluded from coverage. Confirm before routing.",
    bannerType: "info",
  },
  step_therapy: {
    label: "Step-Therapy",
    color: "geekblue",
    banner:
      "This member must try a preferred alternative first. Confirm step therapy history before routing.",
    bannerType: "info",
  },
  quantity_limit: {
    label: "Quantity Limit",
    color: "gold",
    banner: "The requested quantity exceeds the plan limit. Confirm the requested vs. approved quantity below.",
    bannerType: "info",
  },
  paid_unexpected: {
    label: "Paid, unexpected",
    color: "warning",
    banner:
      "This is the anomaly. The claim paid without a PA, likely because one already exists or the requirement changed. This needs investigation before it can be closed.",
    bannerType: "warning",
  },
};

function daysUntil(dateStr: string) {
  const target = new Date(`${dateStr}T00:00:00`).getTime();
  return Math.round((target - Date.now()) / 86_400_000);
}

export function UnassignedDetail({
  unassignedCase: c,
  onClaim,
  onSendToClinical,
  onNotifyProvider,
  onDismiss,
  onRequestInfo,
}: Props) {
  const claimed = c.claimedBy !== null;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [qty, setQty] = useState(c.quantity ?? "—");
  const [days, setDays] = useState(c.daysSupply ?? "—");
  const [draftQty, setDraftQty] = useState("");
  const [draftDays, setDraftDays] = useState("");
  const [icd, setIcd] = useState(c.diagnosis ?? "—");
  const [draftIcd, setDraftIcd] = useState("");
  useEffect(() => { setIcd(c.diagnosis ?? "—"); }, [c.id, c.diagnosis]);
  // Mock related cases: deterministically pick Clinical Review cases for the demo.
  const relatedCases = useMemo(() => {
    const statuses = ["Approved", "Denied", "Withdrawn", "In Review"];
    let h = 0; for (const ch of c.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const n = h % 3; // 0–2 related cases
    return Array.from({ length: n }, (_, i) => {
      const m = crmMockCases[(h + i * 3) % crmMockCases.length];
      return { id: m.id, caseNumber: m.caseNumber, status: statuses[(h + i) % statuses.length] };
    });
  }, [c.id]);
  useEffect(() => { setQty(c.quantity ?? "—"); setDays(c.daysSupply ?? "—"); setEditingDetails(false); }, [c.id, c.quantity, c.daysSupply]);
  const [isRerunOpen, setIsRerunOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState<string | undefined>(undefined);
  const [rejectNote, setRejectNote] = useState("");
  const closeReject = () => {
    setIsRejectOpen(false);
    setRejectReason(undefined);
    setRejectNote("");
  };
  const [confirmedRun, setConfirmedRun] = useState<TestClaimRun | null>(null);
  useEffect(() => setConfirmedRun(null), [c.id]);

  const testClaim = useMemo(
    () =>
      confirmedRun
        ? {
            ...c.testClaim,
            outcome: confirmedRun.outcome,
            runAt: confirmedRun.runAt,
            rejectCode: confirmedRun.rejectCode,
            rejectReason: confirmedRun.rejectReason,
            rejects:
              confirmedRun.rejectCode || confirmedRun.rejectReason
                ? [{ code: confirmedRun.rejectCode ?? "—", message: confirmedRun.rejectReason ?? "" }]
                : [],
            requestedQuantity: confirmedRun.quantity || c.testClaim.requestedQuantity,
          }
        : c.testClaim,
    [c.testClaim, confirmedRun],
  );
  const drugLabel = confirmedRun?.drug?.name ?? c.drugName;
  const drugStrengthLabel = confirmedRun?.drug?.strength ?? c.drugStrength;
  const outcome = testClaim.outcome;
  // NCPDP rejects returned on the claim; empty means the claim paid.
  const rejectList = useMemo(() => {
    const list = testClaim.rejects;
    if (list && list.length) return list;
    if (testClaim.rejectCode || testClaim.rejectReason)
      return [{ code: testClaim.rejectCode ?? "—", message: testClaim.rejectReason ?? "" }];
    return [];
  }, [testClaim]);
  const config = RESULT_CONFIG[outcome];
  const isAnomaly = outcome === "paid_unexpected";

  const [dxCodes, setDxCodes] = useState<string[]>([c.suggestedDx.code]);
  const [approvedQty, setApprovedQty] = useState<string>(c.testClaim.planLimitQuantity ?? "");
  const [pendingAction, setPendingAction] = useState<null | "dismiss">(null);
  const [isRfiModalOpen, setIsRfiModalOpen] = useState(false);
  const [template, setTemplate] = useState<string | undefined>(
    letterTemplatesByOutcome[outcome]?.[0]?.value,
  );
  const [formularyQuery, setFormularyQuery] = useState("");

  const activePa = c.paHistory.find((p) => p.current && p.status === "Active");
  const paSummary = activePa ? `PA on file until ${activePa.endDate}` : "No PA on file";

  const defaultNotes = useMemo(
    () =>
      [
        `Treium CID: ${testClaim.claimId}`,
        `Result: ${config.label}${
          testClaim.rejectCode ? ` (reject ${testClaim.rejectCode})` : ""
        } — ${testClaim.rejectReason ?? testClaim.paidAmount ?? "—"}`,
        paSummary,
      ].join("\n"),
    [testClaim, config.label, paSummary],
  );
  const [notes, setNotes] = useState(defaultNotes);
  useEffect(() => setNotes(defaultNotes), [defaultNotes]);

  // Criteria offered in the RFI modal, derived from the test claim result.
  const rfiRules = useMemo(
    () => [
      { id: "claim-result", category: config.label, rule: testClaim.rejectReason ?? "Test claim result requires additional information" },
      { id: "diagnosis", category: "Diagnosis", rule: `Confirm diagnosis supporting ${drugLabel}` },
      { id: "clinical-notes", category: "Clinical documentation", rule: "Submit recent clinical notes for this request" },
    ],
    [config.label, testClaim.rejectReason, drugLabel],
  );

  const icdOptions = useMemo(
    () => mockIcd10.map((d) => ({ value: d.code, label: `${d.code} — ${d.label}` })),
    [],
  );

  const formularyRows = useMemo(() => {
    const q = formularyQuery.trim().toLowerCase();
    if (!q) return mockFormulary.filter((f) => f.client === c.client);
    return mockFormulary.filter(
      (f) => f.drug.toLowerCase().includes(q) || f.client.toLowerCase().includes(q),
    );
  }, [formularyQuery, c.client]);

  // True Data routing: Non-Formulary results or appeals for True Data clients.
  const routeToTrueData = c.isTrueDataClient && (outcome === "non_formulary" || c.isAppeal);

  const requiredMissing =
    dxCodes.length === 0 || (outcome === "quantity_limit" && approvedQty.trim() === "");
  const primaryDisabled = !claimed || requiredMissing;

  const templateBlock = pendingAction && (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        border: "1px solid #d0d5dd",
        borderRadius: 6,
        background: "#fafafa",
      }}
    >
      <Text strong style={{ fontSize: 14 }}>
        <FileTextOutlined /> Provider letter template
      </Text>
      <div style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 6px" }}>
        Pre-selected for a {config.label} result. Change if needed.
      </div>
      <Select
        value={template}
        onChange={setTemplate}
        options={letterTemplatesByOutcome[outcome]}
        style={{ width: "100%", maxWidth: 420 }}
      />
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <Button
          type="primary"
          style={{ background: ACCENT, borderColor: ACCENT, color: "#fff" }}
          onClick={() => {
            setPendingAction(null);
            onDismiss();
          }}
        >
          Confirm dismiss
        </Button>
        <Button onClick={() => setPendingAction(null)}>Cancel</Button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
        {/* Returned banner */}
        {c.returnedByPharmacist && (
          <Alert
            type="warning"
            showIcon
            icon={<WarningFilled />}
            message="Returned by pharmacist — high priority"
            description={c.returnReason}
            style={{ marginBottom: 16, borderColor: "#d48806" }}
          />
        )}

        {/* Unclaimed banner */}
        {!claimed && (
          <div
            style={{
              padding: 16,
              border: "1px solid #d0d5dd",
              borderRadius: 6,
              background: "#fafafa",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontSize: 14 }}>This case is unclaimed. Claim it to begin.</Text>
            <Button type="primary" onClick={onClaim} style={{ color: "#fff" }}>
              Claim
            </Button>
          </div>
        )}

        {/* Header — matches Clinical Review */}
        <div style={{ marginBottom: 16 }}>
          <h2 className="text-2xl font-bold text-foreground mb-1">{c.memberName}</h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0 text-xs text-muted-foreground">
            <span className="whitespace-nowrap"><span className="font-semibold">Medication:</span> {drugLabel}{drugStrengthLabel ? ` ${drugStrengthLabel}` : ""}</span>
            {c.memberDOB && <span className="whitespace-nowrap"><span className="font-semibold">DOB:</span> {c.memberDOB}</span>}
            <span className="whitespace-nowrap"><span className="font-semibold">Case:</span> {c.caseNumber.replace(/\D/g, "") || c.caseNumber}</span>
            <span className="whitespace-nowrap"><span className="font-semibold">Carrier:</span> {c.client}</span>
            {c.isAppeal && <span className="whitespace-nowrap font-semibold">Appeal</span>}
          </div>
          {c.diagnosis && (
            <div className="text-xs text-muted-foreground mt-1">
              <span className="whitespace-nowrap"><span className="font-semibold">ICD:</span> {icd}</span>
            </div>
          )}
        </div>

        {/* Case Details — matches Clinical Review */}
        <div className={`mb-4 rounded-md border border-border ${detailsOpen ? "bg-muted/40" : ""}`}>
          <button
            type="button"
            onClick={() => setDetailsOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 w-full text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <ClipboardList className="h-4 w-4" />
            <span className="font-medium text-foreground">Case Details</span>
            <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
          </button>
          {detailsOpen && (() => {
            const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
              <div className="flex items-center justify-between gap-4 text-sm py-1">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-primary text-right">{children}</span>
              </div>
            );
            return (
            <div className="pt-2 pb-3 px-3 border-t border-border bg-card">
              <Row label="Case Received">{c.receivedAt}</Row>
              <Row label="Request Type">{c.isAppeal ? "Appeal" : "Initial Request"}</Row>
              <Row label="Related Case ID">
                {relatedCases.length === 0 ? "—" : relatedCases.map((r, i) => (
                  <span key={r.id}>
                    {i > 0 && ", "}
                    <Link to={`/cases?case=${encodeURIComponent(r.id)}`} className="underline">{r.caseNumber.replace(/\D/g, "")}</Link>
                    {` (${r.status})`}
                  </span>
                ))}
              </Row>
              <Row label="Request Reason">Prior Authorization</Row>
              <Row label="Priority Level">{c.priority ?? "Standard"}</Row>
              <Row label="Source">{c.source ?? "Fax"}</Row>
              <Row label="NDC">{c.ndc ?? "—"}</Row>
              <Row label="Quantity">
                {editingDetails ? <Input size="small" style={{ width: 120 }} value={draftQty} onChange={(e) => setDraftQty(e.target.value)} /> : qty}
              </Row>
              <Row label="Days Supply">
                {editingDetails ? <Input size="small" style={{ width: 120 }} value={draftDays} onChange={(e) => setDraftDays(e.target.value)} /> : days}
              </Row>
              <Row label="ICD-10 Code">
                {editingDetails ? <Input size="small" style={{ width: 120 }} value={draftIcd} onChange={(e) => setDraftIcd(e.target.value)} /> : icd}
              </Row>
              <Row label="Provider Name">{c.providerName ?? "—"}</Row>
              <div className="flex justify-end gap-2 pt-2">
                {editingDetails ? (
                  <>
                    <Button size="small" onClick={() => setEditingDetails(false)}>Cancel</Button>
                    <Button size="small" type="primary" onClick={() => { setQty(draftQty.trim() || qty); setDays(draftDays.trim() || days); setIcd(draftIcd.trim() || icd); setEditingDetails(false); toast("Case details updated"); }}>Save</Button>
                  </>
                ) : (
                  <Button size="small" icon={<EditOutlined />} disabled={!claimed} onClick={() => { setDraftQty(qty); setDraftDays(days); setDraftIcd(icd); setEditingDetails(true); }}>Edit</Button>
                )}
              </div>
            </div>
            );
          })()}
        </div>

        {/* Sections — distinct cards, matching Case Intake styling */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            opacity: claimed ? 1 : 0.55,
            pointerEvents: claimed ? "auto" : "none",
          }}
        >
          {/* Test claim */}
          <Card
            size="small"
            style={{ borderColor: "#8c8c8c", background: "#fff" }}
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: ACCENT }}>
                  <ExperimentOutlined />
                </span>
                <span>Test claim</span>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                  <Tag
                    color={rejectList.length ? "error" : "success"}
                    style={{ fontSize: 13, padding: "2px 10px", margin: 0 }}
                  >
                    {rejectList.length
                      ? `${rejectList.length} reject${rejectList.length > 1 ? "s" : ""}`
                      : "Claim paid"}
                  </Tag>
                  <Button size="small" icon={<ReloadOutlined />} onClick={() => setIsRerunOpen(true)}>
                    Re-run test claim
                  </Button>
                </div>
              </div>
            }
          >
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
              {c.caseNumber} · Auto-run {testClaim.runAt} · {testClaim.claimId}
            </div>
            {rejectList.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {rejectList.map((r) => (
                  <div
                    key={`${r.code}-${r.message}`}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "8px 10px",
                      background: "#fff2f0",
                      border: "1px solid #ffccc7",
                      borderRadius: 6,
                    }}
                  >
                    <Tag
                      color="error"
                      style={{ margin: 0, fontFamily: "monospace", fontSize: 12, flexShrink: 0 }}
                    >
                      {r.code}
                    </Tag>
                    <span style={{ fontSize: 13, color: "#3a3a3a" }}>{r.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: "8px 10px",
                  background: "#f6ffed",
                  border: "1px solid #b7eb8f",
                  borderRadius: 6,
                  fontSize: 13,
                  color: "#3a3a3a",
                }}
              >
                Claim paid — no NCPDP reject codes returned
                {testClaim.paidAmount ? ` (${testClaim.paidAmount})` : ""}.
              </div>
            )}
          </Card>

          {isAnomaly ? (
            /* Formulary lookup */
            <Card
              size="small"
              style={{ borderColor: "#8c8c8c", background: "#fff" }}
              title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: ACCENT }}>
                    <SearchOutlined />
                  </span>
                  <span>Formulary lookup</span>
                </div>
              }
            >
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                Search by drug or client to confirm coverage status and tier.
              </div>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder={`Search drug or client (showing ${c.client})`}
                value={formularyQuery}
                onChange={(e) => setFormularyQuery(e.target.value)}
                style={{ marginBottom: 8, maxWidth: 420 }}
              />
              <Table
                size="small"
                pagination={false}
                rowKey={(r) => `${r.drug}-${r.client}`}
                dataSource={formularyRows}
                locale={{ emptyText: <Empty description="No formulary match" /> }}
                columns={[
                  { title: "Drug", dataIndex: "drug" },
                  { title: "Client", dataIndex: "client" },
                  {
                    title: "Status",
                    dataIndex: "status",
                    render: (s: string) => (
                      <Tag color={s === "Covered" ? "success" : s === "Excluded" ? "error" : "purple"}>{s}</Tag>
                    ),
                  },
                  { title: "Tier", dataIndex: "tier" },
                ]}
              />
            </Card>
          ) : (
            <>
              {/* Diagnosis */}
              <Card
                size="small"
                style={{ borderColor: "#8c8c8c", background: "#fff" }}
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: ACCENT }}>
                      <FileTextOutlined />
                    </span>
                    <span>Diagnosis code(s)</span>
                  </div>
                }
              >
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                  Suggested: {c.suggestedDx.code} — {c.suggestedDx.label}
                </div>
                <Select
                  mode="multiple"
                  value={dxCodes}
                  onChange={setDxCodes}
                  options={icdOptions}
                  placeholder="Search ICD-10 codes"
                  style={{ width: "100%" }}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label as string).toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Card>

              {outcome === "quantity_limit" && (
                <Card
                  size="small"
                  style={{ borderColor: "#8c8c8c", background: "#fff" }}
                  title={
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: ACCENT }}>
                        <NumberOutlined />
                      </span>
                      <span>Quantity confirmation</span>
                    </div>
                  }
                >
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                    Requested: {testClaim.requestedQuantity ?? "—"} · Plan limit:{" "}
                    {testClaim.planLimitQuantity ?? "—"}
                  </div>
                  <Input
                    value={approvedQty}
                    onChange={(e) => setApprovedQty(e.target.value)}
                    placeholder="Quantity to request (e.g. 8 mL / 30 days)"
                    style={{ maxWidth: 420 }}
                  />
                </Card>
              )}
            </>
          )}

          {/* PA history */}
          <Card
            size="small"
            style={{ borderColor: "#8c8c8c", background: "#fff" }}
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: ACCENT }}>
                  <ClockCircleOutlined />
                </span>
                <span>PA history (from Treium)</span>
                <Text type="secondary" style={{ fontWeight: 400, fontSize: 13 }}>
                  · {paSummary}
                </Text>
              </div>
            }
          >
            {c.paHistory.length === 0 ? (
              <Text style={{ fontSize: 14, color: "#6b7280" }}>No prior or current PA on file.</Text>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {c.paHistory.map((p) => {
                  const days = daysUntil(p.endDate);
                  const expiringSoon = p.current && p.status === "Active" && days >= 0 && days <= 90;
                  return (
                    <div
                      key={p.id}
                      style={{
                        border: "1px solid #d0d5dd",
                        borderRadius: 6,
                        padding: "8px 12px",
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <Text strong style={{ fontSize: 14 }}>
                        {p.drugName}
                      </Text>
                      <Tag color={p.current ? "blue" : "default"} style={{ margin: 0 }}>
                        {p.current ? "Current" : "Prior"}
                      </Tag>
                      <Tag
                        color={p.status === "Active" ? "success" : p.status === "Denied" ? "error" : "default"}
                        style={{ margin: 0 }}
                      >
                        {p.status}
                      </Tag>
                      <Text style={{ fontSize: 13, color: "#3a3a3a" }}>
                        {p.startDate} → {p.endDate}
                      </Text>
                      {expiringSoon && (
                        <Tag icon={<ClockCircleOutlined />} color="warning" style={{ margin: 0, fontSize: 12 }}>
                          Expires in {days} days — flag for re-review
                        </Tag>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Optional notes — collapsed by default, de-emphasized */}
          <Collapse
            ghost
            items={[
              {
                key: "optional-notes",
                label: (
                  <Text style={{ fontSize: 13, color: "#6b7280" }}>
                    Optional Notes{notes.trim() ? " (1)" : ""}
                  </Text>
                ),
                children: (
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                      For one-off circumstantial info only.
                    </div>
                    <TextArea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      autoSize={{ minRows: 3, maxRows: 8 }}
                      style={{ fontSize: 14 }}
                    />
                  </div>
                ),
              },
            ]}
          />

          {templateBlock}
        </div>

      </div>

      {/* Sticky action bar — matches Intake styling */}
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
        {isAnomaly ? (
          <>
            <Button
              danger
              type="text"
              icon={<DeleteOutlined />}
              onClick={onDismiss}
              disabled={!claimed}
              style={{ marginRight: "auto" }}
            >
              Dismiss as duplicate / no PA needed
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              disabled={!claimed}
              onClick={() => {
                toast("Pushed forward with note", { description: c.caseNumber });
                onNotifyProvider();
              }}
              style={!claimed ? undefined : { background: ACCENT, borderColor: ACCENT, color: "#fff" }}
            >
              Push forward with note
            </Button>
          </>
        ) : (
          <>
            <Button
              danger
              type="text"
              icon={<DeleteOutlined />}
              onClick={onDismiss}
              disabled={!claimed}
            >
              Dismiss
            </Button>
            <Button
              icon={<QuestionCircleOutlined />}
              onClick={() => setIsRfiModalOpen(true)}
              disabled={!claimed}
              style={{ marginRight: "auto" }}
            >
              RFI
            </Button>
            <Button
              danger
              icon={<StopOutlined />}
              onClick={() => setIsRejectOpen(true)}
              disabled={!claimed}
            >
              Reject
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              disabled={primaryDisabled}
              onClick={onSendToClinical}
              style={primaryDisabled ? undefined : { background: ACCENT, borderColor: ACCENT, color: "#fff" }}
            >
              {routeToTrueData ? "Send to True Data" : "Send to clinical review"}
            </Button>
          </>
        )}
      </div>

      <Modal
        open={isRejectOpen}
        title="Reject case"
        okText="Reject"
        okButtonProps={{ danger: true, disabled: !rejectReason }}
        onCancel={closeReject}
        onOk={() => {
          const label = REJECT_REASONS.find((r) => r.value === rejectReason)?.label ?? "";
          toast("Case rejected", { description: `${c.caseNumber} · ${label}` });
          closeReject();
          onDismiss();
        }}
      >
        <Text strong style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
          Reason code <Text type="danger">*</Text>
        </Text>
        <Select
          value={rejectReason}
          onChange={setRejectReason}
          options={REJECT_REASONS}
          placeholder="Select a reason code"
          style={{ width: "100%" }}
        />
        <Text strong style={{ fontSize: 13, display: "block", margin: "16px 0 6px" }}>
          Note <Text type="secondary" style={{ fontWeight: 400 }}>(optional)</Text>
        </Text>
        <TextArea
          rows={4}
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
          placeholder="Add any context for this rejection..."
          style={{ resize: "none" }}
        />
      </Modal>

      <RequestInformationModal
        isOpen={isRfiModalOpen}
        onClose={() => setIsRfiModalOpen(false)}
        rules={rfiRules}
        onSubmitProviderRequest={() => {
          setIsRfiModalOpen(false);
          onRequestInfo();
        }}
        onSubmitTechReview={() => {
          setIsRfiModalOpen(false);
          onRequestInfo();
        }}
        memberName={c.memberName}
        caseNumber={c.caseNumber}
        drugName={drugLabel}
      />


      <RerunTestClaimModal
        open={isRerunOpen}
        onCancel={() => setIsRerunOpen(false)}
        unassignedCase={c}
        onConfirm={(run) => {
          setConfirmedRun(run);
          setIsRerunOpen(false);
          toast("Case updated from test claim run", { description: c.caseNumber });
        }}
      />
    </div>
  );
}
