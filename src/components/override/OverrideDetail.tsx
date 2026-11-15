import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Typography, Tag, Card, Button, Alert, Descriptions, Input, Space } from "antd";
import {
  CheckOutlined,
  FileProtectOutlined,
  SafetyCertificateOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";
import {
  OVERRIDE_STATUS_COLOR,
  type OverrideCase,
  type TestClaim,
} from "@/data/mockOverrideCases";
import { RerunTestClaimModal } from "@/components/unassigned/RerunTestClaimModal";
import type { UnassignedCase } from "@/data/mockUnassignedCases";
import { useToast } from "@/hooks/use-toast";
import { SendCountdown } from "@/components/letters/SendCountdown";

const { Text, Title } = Typography;
const ACCENT = "#12275e";

interface Props {
  overrideCase: OverrideCase;
  isClaimed: boolean;
  onClaim: () => void;
  onDismiss: (notes: string) => void;
  onSendBack: (notes: string) => void;
  onConfirm: (notes: string) => void;
  onUndoConfirm?: () => void;
}

export function OverrideDetail({
  overrideCase,
  isClaimed,
  onClaim,
  onDismiss,
  onSendBack,
  onConfirm,
  onUndoConfirm,
}: Props) {
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);
  const [testClaimConfirmed, setTestClaimConfirmed] = useState(false);
  const [notes, setNotes] = useState("");
  const [rerunOpen, setRerunOpen] = useState(false);
  const { toast } = useToast();

  const c = overrideCase;

  if (!c) return null;

  // Adapt the override case to the shape the shared re-run test claim modal expects.
  const rerunCase: UnassignedCase = {
    id: c.id,
    caseNumber: c.caseNumber,
    memberName: c.memberName,
    memberId: c.memberId,
    drugName: c.drugName,
    drugStrength: "",
    receivedAt: c.approvedAt,
    claimedBy: c.claimedBy,
    returnedByPharmacist: false,
    client: "",
    isTrueDataClient: false,
    isAppeal: false,
    testClaim: {
      outcome: c.claimA?.status === "REJECTED" ? "pa_required" : "paid_unexpected",
      runAt: c.updatedAt,
      claimId: c.claimA?.authNumber ?? "—",
      rejectCode: c.claimA?.rejects?.[0]?.code,
      rejectReason: c.claimA?.rejects?.[0]?.message,
      rejects: c.claimA?.rejects,
      requestedQuantity: c.decision?.quantity,
    },
    paHistory: [],
    suggestedDx: { code: "", label: "" },
  };


  const decision = c.decision ?? ({} as OverrideCase["decision"]);
  const override = c.override ?? ({} as OverrideCase["override"]);
  const dash = (v?: string | number) => (v === undefined || v === "" ? "—" : v);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Title level={5} style={{ margin: 0 }}>{c.drugName}</Title>
          <Tag color={OVERRIDE_STATUS_COLOR[c.status]} style={{ marginRight: 0 }}>
            {c.status}
          </Tag>
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {c.caseNumber} · {c.memberName} · {c.memberId} · Approved {c.approvedAt}
        </Text>

        {c.letterSendAt ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginTop: 12 }}
            message="Approval letter and fax queued"
            description={
              <SendCountdown
                sendAt={new Date(c.letterSendAt)}
                pendingLabel="Sends in"
                sentLabel="Letter sent at"
                actionLabel="Retract"
                onAction={c.preConfirm ? onUndoConfirm : undefined}
              />
            }
          />
        ) : (
          !isClaimed && (
            <Alert
              type="info"
              showIcon
              style={{ marginTop: 12 }}
              message="Claim this case to work the override."
              action={<Button size="small" onClick={onClaim}>Claim</Button>}
            />
          )
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          {/* 1. Pharmacist decision (reference) */}
          <WorkCard
            index={1}
            title="Pharmacist decision"
            icon={<FileProtectOutlined />}
            badge={<Tag style={{ marginRight: 0 }}>Reference</Tag>}
          >
            <Descriptions column={2} size="small" colon={false}>
              <Descriptions.Item label="Approval type">
                {(decision.approvalTypes ?? []).length
                  ? decision.approvalTypes.map((t) => <Tag key={t} color="blue">{t}</Tag>)
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Approved drug">{dash(decision.drugName)}</Descriptions.Item>
              <Descriptions.Item label="GPI">{dash(decision.gpi)}</Descriptions.Item>
              <Descriptions.Item label="Quantity">{dash(decision.quantity)}</Descriptions.Item>
              <Descriptions.Item label="Day supply">{dash(decision.daysSupply)}</Descriptions.Item>
              <Descriptions.Item label="Auth window">
                {dash(decision.authStart)} – {dash(decision.authEnd)}
              </Descriptions.Item>
              <Descriptions.Item label="Additional Note" span={2}>
                {dash(decision.additionalNote)}
              </Descriptions.Item>
            </Descriptions>
          </WorkCard>

          {/* 2. Override */}
          <WorkCard
            index={2}
            title="Override placed in claims platform"
            icon={<SafetyCertificateOutlined />}
            complete={overrideConfirmed}
            action={
              <Button
                size="small"
                type="primary"
                disabled={!isClaimed || overrideConfirmed}
                onClick={() => setOverrideConfirmed(true)}
                style={
                  !isClaimed || overrideConfirmed
                    ? undefined
                    : { background: ACCENT, borderColor: ACCENT }
                }
              >
                {overrideConfirmed ? "Override confirmed" : "Confirm override"}
              </Button>
            }
          >
            {override.placementError && (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 12 }}
                message="Override not applied"
                description={override.placementError}
              />
            )}
            {override.duplicateCleared && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message="Identified a duplicate — cleared it before placing this override."
              />
            )}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                [override.identifierType ?? "GPI", dash(override.identifier)],
                ["PA ID", dash(override.authNumber)],
                ["Reason Code", dash(override.reasonCode)],
                ["Created At", override.createdAt ? format(parseISO(override.createdAt), "MM/dd/yyyy hh:mm:ss a") : "—"],
                ["Effective from", dash(override.effectiveFrom)],
                ["Effective to", dash(override.effectiveTo)],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <div className="mb-1 text-xs text-muted-foreground">{label}</div>
                  <div className="break-words text-sm text-primary">{value}</div>
                </div>
              ))}
            </div>
          </WorkCard>

          {/* 3. Test claims */}
          <WorkCard
            index={3}
            title="Test claims"
            icon={<ExperimentOutlined />}
            complete={testClaimConfirmed}
            action={
              <>
                <Button size="small" disabled={!isClaimed} onClick={() => setRerunOpen(true)}>
                  Re-run test claims
                </Button>
                <Button
                  size="small"
                  type="primary"
                  disabled={!isClaimed || testClaimConfirmed}
                  onClick={() => setTestClaimConfirmed(true)}
                  style={
                    !isClaimed || testClaimConfirmed
                      ? undefined
                      : { background: ACCENT, borderColor: ACCENT }
                  }
                >
                  {testClaimConfirmed ? "Test claim confirmed" : "Confirm test claim"}
                </Button>
              </>
            }
          >
            {c.claimA || c.claimB ? (
              <>
                <div style={{ display: "flex", gap: 12 }}>
                  <ClaimBox claim={c.claimA} fallback="Claim A not run yet" />
                  <ClaimBox claim={c.claimB} fallback="Claim B not run yet" />
                </div>
                {c.claimNote && (
                  <Alert
                    type="info"
                    showIcon
                    style={{ marginTop: 12 }}
                    message={c.claimNote}
                  />
                )}
              </>
            ) : (
              <Text type="secondary" style={{ fontSize: 13 }}>
                No test claims have been run for this case yet.
              </Text>
            )}
          </WorkCard>
        </div>
      </div>

      {/* Bottom action bar */}
      <div
        style={{
          borderTop: "1px solid #f0f0f0",
          padding: 12,
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <Input.TextArea
          rows={2}
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={!isClaimed}
        />
        <Space style={{ justifyContent: "flex-end", width: "100%" }}>
          <Button disabled={!isClaimed} onClick={() => onSendBack(notes)}>
            Send back to clinical review
          </Button>
          <Button
            type="primary"
            disabled={!isClaimed}
            onClick={() => onConfirm(notes)}
            style={isClaimed ? { background: ACCENT, borderColor: ACCENT } : undefined}
          >
            Confirm
          </Button>
        </Space>
      </div>

      <RerunTestClaimModal
        open={rerunOpen}
        onCancel={() => setRerunOpen(false)}
        unassignedCase={rerunCase}
        onConfirm={() => {
          setRerunOpen(false);
          setTestClaimConfirmed(false);
          toast({ title: "Test claims re-run", description: c.caseNumber });
        }}
      />
    </div>
  );
}

function ClaimBox({ claim, fallback }: { claim?: TestClaim; fallback: string }) {
  if (!claim) {
    return (
      <div style={{ flex: 1, border: "1px dashed #d9d9d9", borderRadius: 8, padding: 12 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>{fallback}</Text>
      </div>
    );
  }
  const isPaid = claim.status === "PAID";
  const isRejected = claim.status === "REJECTED";
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        border: `1px solid ${isPaid ? "#b7eb8f" : isRejected ? "#ffccc7" : "#d9d9d9"}`,
        background: isPaid ? "#f6ffed" : isRejected ? "#fff2f0" : "#fafafa",
        borderRadius: 8,
        padding: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Text strong style={{ fontSize: 13 }}>{claim.label}</Text>
        <Tag
          color={isPaid ? "success" : isRejected ? "error" : "processing"}
          style={{ marginRight: 0 }}
        >
          {claim.status}
        </Tag>
      </div>
      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
        Date of service: {claim.dateOfService}
      </Text>
      <Row label="CID" value={claim.cid ?? "—"} />
      <Row label="Auth number" value={claim.authNumber ?? "—"} />
      {claim.rejects?.length ? (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Reject codes</Text>
          {claim.rejects.map((r) => (
            <div key={r.code} style={{ fontSize: 12, marginTop: 4 }}>
              <Tag color="error" style={{ marginRight: 6 }}>{r.code}</Tag>
              <Text>{r.message}</Text>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, gap: 8 }}>
      <Text type="secondary" style={{ fontSize: 13 }}>{label}</Text>
      <Text style={{ fontSize: 13, textAlign: "right" }}>{value}</Text>
    </div>
  );
}

function WorkCard({
  index,
  title,
  icon,
  complete,
  action,
  badge,
  children,
}: {
  index: number;
  title: string;
  icon: React.ReactNode;
  complete?: boolean;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card
      size="small"
      style={{ borderColor: complete ? "#52c41a" : "#8c8c8c" }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: complete ? "#52c41a" : ACCENT,
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
            {action}
          </div>
        </div>
      }
    >
      {children}
    </Card>
  );
}
