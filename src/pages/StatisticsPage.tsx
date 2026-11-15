import { useState, useMemo } from "react";
import { Layout, Typography, Tabs, Drawer, Tag } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { AppLayout } from "@/components/layout/AppLayout";
import { FunnelStats } from "@/components/statistics/FunnelStats";
import { CaseTables } from "@/components/statistics/CaseTables";
import { CaseDetail } from "@/components/cases/CaseDetail";
import { mockCases } from "@/components/cases/CaseList";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function StatisticsPage() {
  const [activeStage, setActiveStage] = useState("all");
  const [viewCaseId, setViewCaseId] = useState<string | null>(null);

  const viewedCase = useMemo(
    () => mockCases.find((c) => c.id === viewCaseId) ?? null,
    [viewCaseId]
  );

  return (
    <AppLayout>
      <Layout style={{ height: "100vh" }}>
        <Content style={{ overflowY: "auto", padding: 24 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ marginBottom: 16 }}>
              <Title level={4} style={{ margin: 0 }}>Triage</Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Route and prioritize cases for review
              </Text>
            </div>
            <FunnelStats activeStage={activeStage} onSelectStage={setActiveStage} />
            <div style={{ marginTop: 24 }}>
              <CaseTables activeStage={activeStage} onViewCase={setViewCaseId} />
            </div>
          </div>
        </Content>
      </Layout>

      <Drawer
        open={!!viewedCase}
        onClose={() => setViewCaseId(null)}
        width={760}
        destroyOnClose
        title={
          viewedCase ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>{viewedCase.memberName} — {viewedCase.drugName}</span>
              <Tag icon={<EyeOutlined />} color="blue" style={{ marginLeft: 4 }}>
                View only
              </Tag>
            </div>
          ) : null
        }
        bodyStyle={{ padding: 0, background: "#fff" }}
      >
        {viewedCase && (
          <div
            style={{
              pointerEvents: "none",
              userSelect: "text",
              height: "100%",
              overflowY: "auto",
            }}
            aria-readonly="true"
          >
            <CaseDetail
              caseData={viewedCase}
              onHighlightRule={() => {}}
              highlightedRule={null}
              isClaimed={true}
              onClaimCase={() => {}}
              onRequestInformation={() => {}}
              onCaseCompleted={() => {}}
              isPanelOpen={true}
            />
          </div>
        )}
      </Drawer>
    </AppLayout>
  );
}
