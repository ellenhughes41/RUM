import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout, Typography, Button, Tooltip, Card } from "antd";
import {
  LeftOutlined,
  RightOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { AppLayout, useSidebarContext } from "@/components/layout/AppLayout";
import { CaseList, mockCases, type Case } from "@/components/cases/CaseList";
import { getSentBackCases } from "@/lib/overrideHandoff";
import { CaseDetail } from "@/components/cases/CaseDetail";
import { ChartViewer } from "@/components/cases/ChartViewer";
import type { CaseOutcome } from "@/types/caseOutcome";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

function CasesPageContent() {
  const [searchParams] = useSearchParams();
  const caseFromUrl = searchParams.get("case");
  const { collapse } = useSidebarContext();
  const [selectedCase, setSelectedCase] = useState<string | null>(caseFromUrl);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [highlightedRule, setHighlightedRule] = useState<string | null>(null);
  const [highlightedRuleFailed, setHighlightedRuleFailed] = useState<boolean>(false);
  const [highlightedRuleMissing, setHighlightedRuleMissing] = useState<boolean>(false);
  const [highlightedCustomText, setHighlightedCustomText] = useState<string | null>(null);
  const [highlightedPage, setHighlightedPage] = useState<number | null>(null);
  // Pre-seed one case of each type under My Cases so the demo shows
  // Active, Approved, Denied, and RFI states without manual setup.
  const SEED_ACTIVE_ID = "4";
  const SEED_APPROVED_ID = "5";
  const SEED_DENIED_ID = "6";
  const SEED_RFI_ID = "3";
  const [claimedCaseIds, setClaimedCaseIds] = useState<Set<string>>(
    () => new Set([SEED_ACTIVE_ID, SEED_APPROVED_ID, SEED_DENIED_ID, SEED_RFI_ID])
  );
  const [pendingInfoCaseIds, setPendingInfoCaseIds] = useState<Set<string>>(
    () => new Set([SEED_RFI_ID])
  );
  const [pendingInfoAnimatingCaseId, setPendingInfoAnimatingCaseId] = useState<string | null>(null);
  const [caseListTab, setCaseListTab] = useState<"unassigned" | "my-claims" | "rfi">("unassigned");
  const [completedCaseIds, setCompletedCaseIds] = useState<Set<string>>(
    () => new Set([SEED_APPROVED_ID, SEED_DENIED_ID])
  );
  const [completedDecisions, setCompletedDecisions] = useState<Record<string, "approved" | "denied">>(
    () => ({ [SEED_APPROVED_ID]: "approved", [SEED_DENIED_ID]: "denied" })
  );
  const [caseOutcomes, setCaseOutcomes] = useState<Record<string, CaseOutcome>>(() => ({
    [SEED_APPROVED_ID]: {
      decision: "approved",
      decidedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      decidedBy: "Dr. Rachel Park",
      copilotUsed: true,
      effectiveDate: new Date().toISOString().slice(0, 10),
      terminationDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10),
      approvalNote: "Criteria met. Approved for 12 months.",
    },
    [SEED_DENIED_ID]: {
      decision: "denied",
      decidedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      decidedBy: "Dr. Rachel Park",
      copilotUsed: true,
      letter:
        "Dear Member,\n\nAfter review of the prior authorization request, the requested medication has been denied. The submitted clinical documentation does not demonstrate that the plan's coverage criteria have been met at this time.\n\nYou may appeal this decision by submitting additional clinical documentation.\n\nSincerely,\nClinical Review Team",
    },
    [SEED_RFI_ID]: {
      decision: "rfi",
      decidedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      decidedBy: "Dr. Rachel Park",
      copilotUsed: true,
      letter:
        "Dear Provider,\n\nWe are requesting additional information to complete the prior authorization review. Please submit the most recent clinical notes documenting prior therapies tried and failed, including dates and outcomes.\n\nThank you,\nClinical Review Team",
    },
  }));
  const [importedCases, setImportedCases] = useState<Case[]>(() => getSentBackCases());

  const handleCaseCompleted = (
    caseId: string,
    decision: "approved" | "denied",
    details?: {
      note?: string;
      effectiveDate?: string;
      terminationDate?: string;
      letter?: string;
    }
  ) => {
    const caseData = [...mockCases, ...importedCases].find(c => c.id === caseId);
    setCompletedCaseIds(prev => new Set([...prev, caseId]));
    setCompletedDecisions(prev => ({ ...prev, [caseId]: decision }));
    setCaseOutcomes(prev => ({
      ...prev,
      [caseId]: {
        decision,
        decidedAt: new Date().toISOString(),
        decidedBy: "Dr. Rachel Park",
        copilotUsed: caseData ? !caseData.manualReview : true,
        effectiveDate: details?.effectiveDate,
        terminationDate: details?.terminationDate,
        approvalNote: details?.note,
        letter: details?.letter,
      },
    }));
    // Keep the case selected so the outcome panel is shown in-place.
    // Also auto-switch My Cases filter to match the decision.
    setCaseListTab("my-claims");
  };
  const handleClaimCase = (caseId: string) => {
    setClaimedCaseIds(prev => new Set([...prev, caseId]));
  };
  const handleUnclaimCase = (caseId: string) => {
    setClaimedCaseIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(caseId);
      return newSet;
    });
    if (selectedCase === caseId) setSelectedCase(null);
  };
  const handleRequestInformation = (caseId: string, letter?: string) => {
    const caseData = [...mockCases, ...importedCases].find(c => c.id === caseId);
    setCaseOutcomes(prev => ({
      ...prev,
      [caseId]: {
        decision: "rfi",
        decidedAt: new Date().toISOString(),
        decidedBy: "Dr. Rachel Park",
        copilotUsed: caseData ? !caseData.manualReview : true,
        letter,
      },
    }));
    setPendingInfoAnimatingCaseId(caseId);
    setSelectedCase(null);
    setTimeout(() => {
      setPendingInfoCaseIds(prev => new Set([...prev, caseId]));
      setPendingInfoAnimatingCaseId(null);
    }, 400);
  };
  const handleRetractOutcome = (caseId: string) => {
    setCaseOutcomes(prev => { const n = { ...prev }; delete n[caseId]; return n; });
    setCompletedCaseIds(prev => { const n = new Set(prev); n.delete(caseId); return n; });
    setCompletedDecisions(prev => { const n = { ...prev }; delete n[caseId]; return n; });
    setPendingInfoCaseIds(prev => { const n = new Set(prev); n.delete(caseId); return n; });
    setSelectedCase(caseId);
    toast({ title: "Decision retracted", description: "Nothing was sent. The case is back to review." });
  };
  const handleSelectCase = (caseId: string) => {
    setSelectedCase(caseId);
    setHighlightedRule("Age");
    setHighlightedRuleFailed(false);
    collapse();
  };
  const isCaseClaimed = (caseId: string) => claimedCaseIds.has(caseId);

  useEffect(() => {
    if (caseFromUrl) {
      setSelectedCase(caseFromUrl);
      setHighlightedRule("Age");
      setHighlightedRuleFailed(false);
      collapse();
    }
  }, [caseFromUrl, collapse]);

  const allCases = [...mockCases, ...importedCases];
  const activeCases = allCases.filter(c => !completedCaseIds.has(c.id));
  // Allow selecting completed and RFI cases too, so users can re-open the
  // outcome view from My Cases / RFI tabs.
  const selectedCaseData = allCases.find(c => c.id === selectedCase);

  return (
    <Layout style={{ height: "100vh" }}>
      {/* Content */}
      <Layout style={{ flex: 1, overflow: "hidden" }}>
        {/* Left - Case List */}
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
              <Button
                type="text"
                icon={<RightOutlined />}
                onClick={() => setIsPanelOpen(true)}
              />
            </div>
          )}

          {!isPanelOpen && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, paddingTop: 48, overflowY: "auto" }}>
              {activeCases.map(caseItem => (
                <Tooltip key={caseItem.id} title={`${caseItem.memberName} - ${caseItem.drugName}`} placement="right">
                  <Button
                    type={selectedCase === caseItem.id ? "primary" : "default"}
                    shape="default"
                    size="small"
                    onClick={() => setSelectedCase(caseItem.id)}
                    style={{ width: 40, height: 40, fontSize: 12, fontWeight: 600 }}
                  >
                    {caseItem.memberName.split(" ").map(n => n[0]).join("")}
                  </Button>
                </Tooltip>
              ))}
            </div>
          )}

          <div
            style={{
              height: "100%",
              overflowY: "auto",
              padding: isPanelOpen ? "16px" : 0,
              opacity: isPanelOpen ? 1 : 0,
              pointerEvents: isPanelOpen ? "auto" : "none",
              position: isPanelOpen ? "relative" : "absolute",
            }}
          >
            <CaseList
              selectedCase={selectedCase}
              onSelectCase={handleSelectCase}
              onTogglePanel={() => setIsPanelOpen(false)}
              claimedCaseIds={claimedCaseIds}
              onClaimCase={handleClaimCase}
              onUnclaimCase={handleUnclaimCase}
              activeTab={caseListTab}
              onTabChange={setCaseListTab}
              pendingInfoCaseIds={pendingInfoCaseIds}
              pendingInfoAnimatingCaseId={pendingInfoAnimatingCaseId}
              completedCaseIds={completedCaseIds}
              completedDecisions={completedDecisions}
              importedCases={importedCases}
              onImportCase={(c) => setImportedCases(prev => [...prev, c])}
            />
          </div>
        </Sider>

        {selectedCaseData ? (
          <Content style={{ overflow: "hidden", padding: 12, flex: 1, background: "#f5f5f5", display: "flex", gap: 12 }}>
            {/* Left - Case Detail */}
            <div style={{ flex: 1, background: "#fff", borderRadius: 8, overflow: "hidden", overflowY: "auto" }}>
              <CaseDetail
                caseData={selectedCaseData}
                onHighlightRule={(rule, failed, customText, page) => {
                  setHighlightedRule(rule);
                  setHighlightedRuleFailed(failed ?? false);
                  setHighlightedCustomText(customText ?? null);
                  setHighlightedPage(page ?? null);
                  setHighlightedRuleMissing(!failed && page === null && customText === null && rule !== null);
                }}
                highlightedRule={highlightedRule}
                isClaimed={isCaseClaimed(selectedCaseData.id)}
                onClaimCase={() => handleClaimCase(selectedCaseData.id)}
                onRequestInformation={(letter) => handleRequestInformation(selectedCaseData.id, letter)}
                onCaseCompleted={(decision, details) => handleCaseCompleted(selectedCaseData.id, decision, details)}
                outcome={caseOutcomes[selectedCaseData.id]}
                onRetractOutcome={() => handleRetractOutcome(selectedCaseData.id)}
                isPanelOpen={isPanelOpen}
              />
            </div>

            {/* Right - Chart Viewer */}
            <div style={{ flex: 1, background: "#fff", borderRadius: 8, overflow: "hidden", overflowY: "auto", padding: 16 }}>
              <ChartViewer
                highlightedRule={highlightedRule}
                highlightedRuleFailed={highlightedRuleFailed}
                highlightedRuleMissing={highlightedRuleMissing}
                caseId={selectedCase}
                highlightCustomText={highlightedCustomText}
                highlightedPage={highlightedPage}
                onClearHighlight={() => {
                  setHighlightedRule(null);
                  setHighlightedRuleFailed(false);
                  setHighlightedRuleMissing(false);
                  setHighlightedCustomText(null);
                  setHighlightedPage(null);
                }}
              />
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
                <ThunderboltOutlined style={{ fontSize: 32, color: "#bfbfbf" }} />
              </div>
              <Title level={4}>Get Started</Title>
              <Text type="secondary">
                Click on a case from the incoming cases list to begin your review.
              </Text>
            </div>
          </Content>
        )}
      </Layout>
    </Layout>
  );
}

export default function CasesPage() {
  return (
    <AppLayout>
      <CasesPageContent />
    </AppLayout>
  );
}
