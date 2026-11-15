import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActionResultHost, showActionResult, isActionResultOpen } from "@/components/intake/ActionResultModal";
import { Layout, Button, Typography } from "antd";
import { RightOutlined, InboxOutlined } from "@ant-design/icons";
import { AppLayout } from "@/components/layout/AppLayout";
import { IntakeList, type IntakeTabKey, type UnassignedFilter, type RawFilter } from "@/components/intake/IntakeList";
import { IntakeDetail, type IntakeState } from "@/components/intake/IntakeDetail";
import { ChartViewer } from "@/components/cases/ChartViewer";
import { QuestionSetPreview, QuestionSetAnswersPage } from "@/components/intake/QuestionSetPreview";
import { mockIntakeCases, currentTech, type IntakeCase } from "@/data/mockIntakeCases";
import { useToast } from "@/hooks/use-toast";

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

function IntakePageContent() {
  const { toast } = useToast();
  const [cases, setCases] = useState<IntakeCase[]>(mockIntakeCases);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [intakeStates, setIntakeStates] = useState<Record<string, IntakeState>>({});
  const [activeTab, setActiveTab] = useState<IntakeTabKey>("raw");
  const [unassignedFilter, setUnassignedFilter] = useState<UnassignedFilter>("all");
  const [rawFilter, setRawFilter] = useState<RawFilter>("all");
  const navigate = useNavigate();
  const casesRef = useRef(cases);
  casesRef.current = cases;
  const selectedRef = useRef(selectedCaseId);
  selectedRef.current = selectedCaseId;
  const snapshot = useRef<{ cases: IntakeCase[]; selected: string | null } | null>(null);
  const takeSnapshot = useCallback(() => {
    snapshot.current = { cases: casesRef.current, selected: selectedRef.current };
  }, []);
  const undo = () => {
    if (!snapshot.current) return;
    setCases(snapshot.current.cases);
    setSelectedCaseId(snapshot.current.selected);
    toast({ title: "Action undone" });
  };

  const addManualCase = () => {
    const seq = String(Date.now()).slice(-5);
    const newCase: IntakeCase = {
      id: `manual-${Date.now()}`,
      transactionId: `TXN-M-${seq}`,
      source: "Fax",
      queue: "raw",
      status: "manual",
      claimedBy: currentTech.id,
      receivedAt: "Just now",
      drugHint: "Drug not specified",
      memberHint: null,
      isManualIntake: true,
    };
    setCases((prev) => [newCase, ...prev]);
    setIntakeStates((prev) => ({ ...prev, [newCase.id]: {} }));
    setActiveTab("my");
    setSelectedCaseId(newCase.id);
  };

  const selectedCase = cases.find((c) => c.id === selectedCaseId) ?? null;
  const currentState: IntakeState = selectedCaseId ? intakeStates[selectedCaseId] ?? {} : {};

  const updateState = (id: string, next: IntakeState) => {
    setIntakeStates((prev) => ({ ...prev, [id]: next }));
    if (cases.find((c) => c.id === id)?.isManualIntake) {
      setCases((prev) => prev.map((c) => c.id === id ? {
        ...c, memberHint: next.member?.name ?? null, drugHint: next.drug?.name ?? "Drug not specified",
      } : c));
    }
  };

  const patchCase = (id: string, patch: Partial<IntakeCase>) => {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeCase = (id: string) => {
    setCases((prev) => prev.filter((c) => c.id !== id));
    setSelectedCaseId((prev) => (prev === id ? null : prev));
  };

  const claim = (id: string) => {
    patchCase(id, { claimedBy: currentTech.id });
    setSelectedCaseId(id);
    const c = cases.find((x) => x.id === id);
    toast({ title: "Claimed", description: c?.transactionId ?? id });
  };

  const release = (id: string) => {
    patchCase(id, { claimedBy: null });
    toast({ title: "Released", description: "Case returned to shared queue." });
  };

  return (
    <Layout style={{ height: "100vh" }}>
      <Layout style={{ flex: 1, overflow: "hidden" }}>
        <Sider
          width={isPanelOpen ? 340 : 64}
          style={{
            background: "#fff",
            borderRight: "1px solid #f0f0f0",
            overflow: "hidden",
            transition: "all 0.3s",
          }}
          trigger={null}
          collapsible
          collapsed={!isPanelOpen}
          collapsedWidth={64}
        >
          {!isPanelOpen && (
            <div style={{ textAlign: "center", paddingTop: 12 }}>
              <Button type="text" icon={<RightOutlined />} onClick={() => setIsPanelOpen(true)} />
            </div>
          )}

          <div
            style={{
              height: "100%",
              overflowY: "auto",
              padding: isPanelOpen ? 16 : 0,
              opacity: isPanelOpen ? 1 : 0,
              pointerEvents: isPanelOpen ? "auto" : "none",
              position: isPanelOpen ? "relative" : "absolute",
            }}
          >
            <IntakeList
              cases={cases}
              selectedCaseId={selectedCaseId}
              onSelectCase={setSelectedCaseId}
              onClaim={claim}
              onRelease={release}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              unassignedFilter={unassignedFilter}
              onUnassignedFilterChange={setUnassignedFilter}
              rawFilter={rawFilter}
              onRawFilterChange={setRawFilter}
              onNewCase={addManualCase}
            />
          </div>
        </Sider>

        {selectedCase ? (
          <Content style={{ overflow: "hidden", padding: 12, flex: 1, background: "#f5f5f5", display: "flex", gap: 12 }}>
            <div style={{ flex: selectedCase.isManualIntake ? 1.5 : 1, background: "#fff", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 0 }}>
              <IntakeDetail
                intakeCase={selectedCase}
                allCases={cases}
                state={currentState}
                onStateChange={(next) => updateState(selectedCase.id, next)}
                onSourceChange={(source) => patchCase(selectedCase.id, { source })}
                onClaim={() => claim(selectedCase.id)}
                onRelease={() => release(selectedCase.id)}
                onSendToReview={() => {
                  const label = selectedCase.source === "Fax" ? "Case created" : "Sent to Clinical Review";
                  toast({ title: label, description: selectedCase.caseNumber ?? selectedCase.transactionId });
                  removeCase(selectedCase.id);
                }}
                onSendToProvider={() => {
                  toast({ title: "Sent to provider", description: "Corrected question set re-sent to CoverMyMeds." });
                  removeCase(selectedCase.id);
                }}
                onRequestInfo={() => {
                  patchCase(selectedCase.id, {
                    queue: "rfi",
                    rfi: {
                      requestedAt: new Date().toLocaleString(),
                      dueAt: "In 7 days",
                      remaining: "7 days remaining",
                      requestedFields: ["Diagnosis", "Clinical notes"],
                      note: "Requested from prescriber office by fax.",
                    },
                  });
                  setActiveTab("unassigned");
                  setUnassignedFilter("rfi");
                  toast({ title: "Information requested", description: selectedCase.transactionId });
                }}
                onDismiss={(reason?: string) => {
                  showActionResult(
                    { title: "Dismissed", message: "This transaction was dismissed. The record is kept — nothing was deleted.", caseNumber: selectedCase.caseNumber ?? selectedCase.transactionId, details: reason ? [{ label: "Reason", value: reason }] : undefined },
                    { ifIdle: true },
                  );
                  removeCase(selectedCase.id);
                }}
                onAttachExisting={() => {
                  if (!isActionResultOpen()) toast({ title: "Attach to existing case", description: "Search modal would open here." });
                }}
                onSplit={() => {
                  toast({ title: "Split not yet implemented", description: "This is a prototype — no transactions were created." });
                }}
                onDoctorResponded={() => {
                  patchCase(selectedCase.id, { queue: "unassigned", rfi: undefined });
                  setActiveTab("unassigned");
                  toast({ title: "Reopened", description: selectedCase.transactionId });
                }}
                onJumpToRfi={(rfiId) => {
                  setActiveTab("unassigned");
                  setUnassignedFilter("rfi");
                  setSelectedCaseId(rfiId);
                  toast({ title: "Opened RFI case", description: "Attach the fax response here." });
                }}
                onMarkRelated={(relatedId) => {
                  toast({ title: "Marked as related", description: `Linked to ${relatedId}` });
                }}
              />
            </div>
            <div style={{ flex: 1, background: "#fff", borderRadius: 8, overflow: "hidden", minWidth: 0 }}>
              {selectedCase.source === "Electronic" && selectedCase.queue === "raw" ? (
                currentState.member && currentState.drug ? (
                  <QuestionSetPreview />
                ) : (
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
                    <div style={{ maxWidth: 320 }}>
                      <Title level={5} style={{ marginBottom: 4 }}>Question set preview</Title>
                      <Text type="secondary">
                        Confirm the member and drug to identify the policy and preview its question set.
                      </Text>
                    </div>
                  </div>
                )
              ) : (
                <ChartViewer
                  caseId={selectedCase.id}
                  leadingPage={selectedCase.source === "Electronic" ? <QuestionSetAnswersPage /> : undefined}
                />
              )}
            </div>
          </Content>
        ) : (
          <Content style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
            <div style={{ textAlign: "center", maxWidth: 400 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "#f5f5f5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <InboxOutlined style={{ fontSize: 32, color: "#bfbfbf" }} />
              </div>
              <Title level={4}>Case Intake</Title>
              <Text type="secondary">
                Select an incoming transaction or case to work it up for Clinical Review.
              </Text>
            </div>
          </Content>
        )}
      </Layout>

      <ActionResultHost onShow={takeSnapshot} onUndo={undo} onGoToCase={() => navigate("/cases")} />

    </Layout>
  );
}

export default function IntakePage() {
  return (
    <AppLayout>
      <IntakePageContent />
    </AppLayout>
  );
}
