import { Tag, Typography } from "antd";
import { UserOutlined, MedicineBoxOutlined, WarningFilled } from "@ant-design/icons";
import type { UnassignedCase } from "@/data/mockUnassignedCases";
import { currentTech } from "@/data/mockUnassignedCases";

const { Text } = Typography;

interface Props {
  cases: UnassignedCase[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function UnassignedList({ cases, selectedId, onSelect }: Props) {
  const mine = cases.filter((c) => c.claimedBy === currentTech.id);
  const shared = cases.filter((c) => c.claimedBy !== currentTech.id);

  const renderCase = (c: UnassignedCase) => {
    const isSelected = c.id === selectedId;
    return (
      <div
        key={c.id}
        onClick={() => onSelect(c.id)}
        style={{
          padding: 12,
          border: `1px solid ${isSelected ? "#12275e" : "#d0d5dd"}`,
          borderRadius: 6,
          marginBottom: 8,
          cursor: "pointer",
          background: isSelected ? "#e8edf7" : "#fff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <Text strong style={{ fontSize: 14 }}>{c.caseNumber}</Text>
          {c.returnedByPharmacist && (
            <Tag color="warning" icon={<WarningFilled />} style={{ margin: 0, fontSize: 11 }}>
              Returned
            </Tag>
          )}
        </div>
        <div style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <UserOutlined style={{ color: "#12275e" }} />
          <span>{c.memberName}</span>
        </div>
        <div style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6, color: "#3a3a3a" }}>
          <MedicineBoxOutlined style={{ color: "#12275e" }} />
          <span>{c.drugName}</span>
        </div>
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>{c.receivedAt}</div>
      </div>
    );
  };

  return (
    <div>
      {mine.length > 0 && (
        <>
          <Text style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>
            My cases ({mine.length})
          </Text>
          <div style={{ marginTop: 8, marginBottom: 12 }}>{mine.map(renderCase)}</div>
        </>
      )}
      <Text style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>
        Unassigned ({shared.length})
      </Text>
      <div style={{ marginTop: 8 }}>{shared.map(renderCase)}</div>
    </div>
  );
}
