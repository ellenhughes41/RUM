import { useEffect, useState } from "react";
import { Layout, Button, Typography } from "antd";
import { RightOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { AppLayout } from "@/components/layout/AppLayout";
import { OverrideQueueList, type OverrideTabKey } from "@/components/override/OverrideQueueList";
import { OverrideDetail } from "@/components/override/OverrideDetail";
import { TriagePreviewPanel } from "@/components/cases/TriagePreviewPanel";
import {
  currentOverrideTech,
  getCaseById,
  
  mockOverrideCases,
  type OverrideCase,
} from "@/data/mockOverrideCases";
import { useToast } from "@/hooks/use-toast";
import { scheduledSendTime } from "@/lib/sendSchedule";
import { addOverrideNote, sendBackToClinical } from "@/lib/overrideHandoff";

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

function OverrideQueueContent() {
  const { toast } = useToast();
  const [cases, setCases] = useState<OverrideCase[]>(mockOverrideCases);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<OverrideTabKey>("queue");

  const selected = cases.find((c) => c.id === selectedId) ?? null;
  const selectedMockCase = selected ? getCaseById(selected.caseId) : undefined;

  const patch = (id: string, p: Partial<OverrideCase>) =>
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, ...p } : c)));

  const claim = (id: string) => {
    patch(id, { claimedBy: currentOverrideTech.id });
    setSelectedId(id);
    setActiveTab("claimed");
    toast({ title: "Claimed", description: cases.find((c) => c.id === id)?.caseNumber });
  };

  const release = (id: string) => {
    patch(id, { claimedBy: null });
    toast({ title: "Released", description: "Case returned to the override queue." });
  };

  // When a confirmed case's letter send time passes: unclaim and mark "Override confirmed".
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      setCases((prev) =>
        prev.some((c) => c.letterSendAt && c.preConfirm && new Date(c.letterSendAt).getTime() <= now)
          ? prev.map((c) =>
              c.letterSendAt && c.preConfirm && new Date(c.letterSendAt).getTime() <= now
                ? { ...c, claimedBy: null, status: "Override confirmed", preConfirm: undefined }
                : c,
            )
          : prev,
      );
    };
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const visibleCases = cases;

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
            <OverrideQueueList
              cases={visibleCases}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onClaim={claim}
              onRelease={release}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
        </Sider>

        {selected ? (
          <Content
            style={{
              overflow: "hidden",
              padding: 12,
              flex: 1,
              background: "#f5f5f5",
              display: "flex",
              gap: 12,
            }}
          >
            <div
              style={{
                flex: 1,
                background: "#fff",
                borderRadius: 8,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
              }}
            >
              <OverrideDetail
                key={selected.id}
                overrideCase={selected}
                isClaimed={selected.claimedBy === currentOverrideTech.id}
                onClaim={() => claim(selected.id)}
                onDismiss={(notes) => {
                  if (notes.trim()) addOverrideNote(selected.caseNumber, notes.trim());
                  setCases((prev) => prev.filter((c) => c.id !== selected.id));
                  setSelectedId(null);
                  toast({
                    title: "Dismissed",
                    description: (
                      <>
                        <div>{selected.caseNumber}</div>
                        <div>Please check the claims system if any override has already been applied.</div>
                      </>
                    ),
                    duration: 8000,
                  });
                }}
                onSendBack={(notes) => {
                  if (notes.trim()) addOverrideNote(selected.caseNumber, notes.trim());
                  sendBackToClinical({
                    id: `override-return-${selected.id}`,
                    caseNumber: selected.caseNumber,
                    memberName: selected.memberName,
                    memberDOB: "",
                    drugName: selected.drugName,
                    submittedAt: new Date().toLocaleString(),
                    deadline: new Date(Date.now() + selected.remainingMinutes * 60000).toISOString(),
                    aiRecommendation: "approve",
                    aiConfidence: 0,
                    authorizationType: "initial",
                    isSpecialty: false,
                    company: selected.carrier,
                    statusLabel: "In progress",
                  });
                  setCases((prev) => prev.filter((c) => c.id !== selected.id));
                  setSelectedId(null);
                  toast({
                    title: "Sent back to clinical review",
                    description: (
                      <>
                        <div>{selected.caseNumber}</div>
                        <div>Please check the claims system if any override has already been applied.</div>
                      </>
                    ),
                    duration: 8000,
                  });
                }}
                onUndoConfirm={() => {
                  if (!selected.preConfirm) return;
                  patch(selected.id, { ...selected.preConfirm, letterSendAt: undefined, preConfirm: undefined });
                  toast({ title: "Retracted", description: `${selected.caseNumber} — nothing was sent.` });
                }}
                onConfirm={(notes) => {
                  if (notes.trim()) addOverrideNote(selected.caseNumber, notes.trim());
                  patch(selected.id, {
                    letterSendAt: scheduledSendTime(new Date(), 1).toISOString(),
                    preConfirm: { status: selected.status, claimedBy: selected.claimedBy },
                  });
                  toast({ title: "Confirmed", description: `${selected.caseNumber} — letter queued.` });
                }}
              />
            </div>
            <div
              style={{
                flex: 1,
                background: "#fff",
                borderRadius: 8,
                overflowY: "auto",
                minWidth: 0,
              }}
            >
              {selectedMockCase ? (
                <TriagePreviewPanel caseData={selectedMockCase} />
              ) : (
                <div style={{ padding: 24 }}>
                  <Text type="secondary">Case information unavailable.</Text>
                </div>
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
                <SafetyCertificateOutlined style={{ fontSize: 32, color: "#bfbfbf" }} />
              </div>
              <Title level={4}>Override Queue</Title>
              <Text type="secondary">
                Select an approved case to review its drug override and test claim results.
              </Text>
            </div>
          </Content>
        )}
      </Layout>
    </Layout>
  );
}

export default function OverrideQueuePage() {
  return (
    <AppLayout>
      <OverrideQueueContent />
    </AppLayout>
  );
}
