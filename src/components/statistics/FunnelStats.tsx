import { Tabs } from "antd";

interface FunnelStage {
  id: string;
  name: string;
  count: number;
}

const funnelStages: FunnelStage[] = [
  { id: "all", name: "All", count: 11 },
  { id: "queue", name: "Review Queue", count: 5 },
  { id: "completed", name: "Completed", count: 6 },
  { id: "info-request", name: "Info Requested", count: 48 },
  { id: "tech-review", name: "Tech Review", count: 6 },
];

interface FunnelStatsProps {
  activeStage: string;
  onSelectStage: (id: string) => void;
}

export function FunnelStats({ activeStage, onSelectStage }: FunnelStatsProps) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        border: "1px solid #f0f0f0",
        padding: "8px 16px",
      }}
    >
      <Tabs
        activeKey={activeStage}
        onChange={onSelectStage}
        items={funnelStages.map((stage) => ({
          key: stage.id,
          label: `${stage.name} (${stage.count})`,
        }))}
      />
    </div>
  );
}
