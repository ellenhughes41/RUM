import { Typography, Tag, Input, Tabs, Button, Dropdown, Space, Segmented } from "antd";
import {
  SearchOutlined,
  InboxOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";
import type { IntakeSource } from "@/data/mockIntakeCases";

import { useState } from "react";
import { currentTech, type IntakeCase, type IntakeQueueKey, type IntakeStatus } from "@/data/mockIntakeCases";

const { Text } = Typography;

export type IntakeTabKey = "my" | "raw" | "unassigned";
export type UnassignedFilter = "all" | "rfi";
export type RawFilter = "all" | "drafts";

interface IntakeListProps {
  cases: IntakeCase[];
  selectedCaseId: string | null;
  onSelectCase: (id: string) => void;
  onClaim: (id: string) => void;
  onRelease: (id: string) => void;
  activeTab: IntakeTabKey;
  onTabChange: (tab: IntakeTabKey) => void;
  unassignedFilter: UnassignedFilter;
  onUnassignedFilterChange: (f: UnassignedFilter) => void;
  rawFilter?: RawFilter;
  onRawFilterChange?: (f: RawFilter) => void;
  onNewCase?: () => void;
}

const STATUS_META: Record<IntakeStatus, { label: string; color: string }> = {
  overdue: { label: "Overdue", color: "red" },
  manual: { label: "Manual Review", color: "gold" },
  waiting: { label: "Waiting", color: "blue" },
};

export const SOURCE_META: Record<IntakeSource, { color: string; icon: ReactNode }> = {
  Fax: { color: "orange", icon: <FileTextOutlined /> },
  Electronic: { color: "geekblue", icon: <ThunderboltOutlined /> },
  Phone: { color: "green", icon: <PhoneOutlined /> },
  Email: { color: "purple", icon: <MailOutlined /> },
  Web: { color: "cyan", icon: <GlobalOutlined /> },
  Mail: { color: "volcano", icon: <InboxOutlined /> },
};

export function IntakeList({
  cases,
  selectedCaseId,
  onSelectCase,
  onClaim,
  onRelease,
  activeTab,
  onTabChange,
  unassignedFilter,
  onUnassignedFilterChange,
  rawFilter = "all",
  onRawFilterChange,
  onNewCase,
}: IntakeListProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<"received" | "status" | "drug">("received");

  const matchesQuery = (c: IntakeCase) => {
    if (!query.trim()) return true;
    const s = query.trim().toLowerCase();
    return (
      c.transactionId.toLowerCase().includes(s) ||
      (c.caseNumber ?? "").toLowerCase().includes(s) ||
      c.drugHint.toLowerCase().includes(s) ||
      (c.memberHint ?? "").toLowerCase().includes(s)
    );
  };

  const sortFn = (a: IntakeCase, b: IntakeCase) => {
    if (sortKey === "drug") return a.drugHint.localeCompare(b.drugHint);
    if (sortKey === "status") return a.status.localeCompare(b.status);
    return a.receivedAt.localeCompare(b.receivedAt);
  };

  const myCases = cases.filter((c) => c.claimedBy === currentTech.id).filter(matchesQuery).sort((a, b) => {
    if (a.isManualIntake || b.isManualIntake) return Number(!!b.isManualIntake) - Number(!!a.isManualIntake);
    return sortFn(a, b);
  });
  const sharedCases = cases.filter((c) => c.claimedBy === null && !c.isManualIntake);

  const rawAll = sharedCases.filter((c) => c.queue === "raw");
  const rawCount = rawAll.length;
  const draftCount = rawAll.filter((c) => c.isDraft).length;
  const unassignedAll = sharedCases.filter((c) => c.queue === "unassigned" || c.queue === "rfi");
  const rfiCount = sharedCases.filter((c) => c.queue === "rfi").length;
  const unassignedCount = unassignedAll.length;

  let filtered: IntakeCase[] = [];
  if (activeTab === "my") {
    filtered = myCases;
  } else if (activeTab === "raw") {
    const base = rawFilter === "drafts" ? rawAll.filter((c) => c.isDraft) : rawAll;
    filtered = base.filter(matchesQuery).sort(sortFn);
  } else {
    const base = unassignedFilter === "rfi"
      ? sharedCases.filter((c) => c.queue === "rfi")
      : unassignedAll;
    filtered = base.filter(matchesQuery).sort(sortFn);
  }

  const myIntake = myCases.filter((c) => c.queue === "raw");
  const myUnassigned = myCases.filter((c) => c.queue === "unassigned" || c.queue === "rfi");

  const sectionHeader = (label: string, count: number) => (
    <Text
      style={{
        fontSize: 11,
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: 0.4,
        display: "block",
        marginTop: 4,
        marginBottom: 4,
      }}
    >
      {label} ({count})
    </Text>
  );

  const trailingFor = (c: IntakeCase) => {
    if (c.isManualIntake) return null;
    if (c.claimedBy === currentTech.id) {
      return (
        <Button
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onRelease(c.id);
          }}
        >
          Release
        </Button>
      );
    }
    if (c.queue === "rfi") return null;
    return (
      <Button
        size="small"
        type="primary"
        onClick={(e) => {
          e.stopPropagation();
          onClaim(c.id);
        }}
        style={{ background: "#12275e", borderColor: "#12275e", color: "#fff" }}
      >
        Claim
      </Button>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <InboxOutlined style={{ color: "#12275e", fontSize: 18 }} />
        <Text strong style={{ fontSize: 15 }}>Case Intake</Text>
      </div>


      <Input
        placeholder="Search intake queue"
        prefix={<SearchOutlined />}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        allowClear
      />

      <Space size={4}>
        <Dropdown
          menu={{
            items: [
              { key: "all", label: "All sources" },
              { key: "fax", label: "Fax only" },
              { key: "electronic", label: "Electronic only" },
            ],
          }}
        >
          <Button size="small" icon={<FilterOutlined />}>Filter</Button>
        </Dropdown>
        <Dropdown
          menu={{
            selectedKeys: [sortKey],
            onClick: ({ key }) => setSortKey(key as typeof sortKey),
            items: [
              { key: "received", label: "Received time" },
              { key: "status", label: "Status" },
              { key: "drug", label: "Drug" },
            ],
          }}
        >
          <Button size="small" icon={<SortAscendingOutlined />}>Sort</Button>
        </Dropdown>
      </Space>

      <Tabs
        activeKey={activeTab}
        onChange={(k) => onTabChange(k as IntakeTabKey)}
        size="small"
        items={[
          { key: "raw", label: `Intake (${rawCount})` },
          { key: "unassigned", label: `Case review (${unassignedCount})` },
          { key: "my", label: `My cases (${myCases.length})` },
        ]}
        style={{ marginBottom: -8 }}
      />

      {activeTab === "raw" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Segmented
            size="small"
            value={rawFilter}
            onChange={(v) => onRawFilterChange?.(v as RawFilter)}
            options={[
              { label: `All (${rawCount})`, value: "all" },
              { label: `Drafts (${draftCount})`, value: "drafts" },
            ]}
          />
        </div>
      )}

      {activeTab === "my" && onNewCase && (
        <div className="flex justify-end">
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setQuery(""); onNewCase(); }}
              style={{ marginLeft: "auto", background: "#12275e", borderColor: "#12275e", color: "#fff" }}
            >
              New Intake
            </Button>
        </div>
      )}

      {activeTab === "unassigned" && (
        <Segmented
          size="small"
          value={unassignedFilter}
          onChange={(v) => onUnassignedFilterChange(v as UnassignedFilter)}
          options={[
            { label: `All (${unassignedCount})`, value: "all" },
            { label: `RFI (${rfiCount})`, value: "rfi" },
          ]}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {activeTab === "my" ? (
          <>
            {myIntake.length > 0 && (
              <>
                {sectionHeader("Intake", myIntake.length)}
                {myIntake.map((c) => (
                  <CaseCard
                    key={c.id}
                    c={c}
                    selected={selectedCaseId === c.id}
                    onSelect={() => onSelectCase(c.id)}
                    trailing={trailingFor(c)}
                  />
                ))}
              </>
            )}
            {myUnassigned.length > 0 && (
              <>
                {sectionHeader("Case review", myUnassigned.length)}
                {myUnassigned.map((c) => (
                  <CaseCard
                    key={c.id}
                    c={c}
                    selected={selectedCaseId === c.id}
                    onSelect={() => onSelectCase(c.id)}
                    trailing={trailingFor(c)}
                  />
                ))}
              </>
            )}
            {filtered.length === 0 && (
              <Text type="secondary" style={{ fontSize: 14, textAlign: "center", padding: 24 }}>
                No items in this queue.
              </Text>
            )}
          </>
        ) : (
          <>
            {filtered.map((c) => (
              <CaseCard
                key={c.id}
                c={c}
                selected={selectedCaseId === c.id}
                onSelect={() => onSelectCase(c.id)}
                trailing={trailingFor(c)}
              />
            ))}
            {filtered.length === 0 && (
              <Text type="secondary" style={{ fontSize: 14, textAlign: "center", padding: 24 }}>
                No items in this queue.
              </Text>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CaseCard({
  c,
  selected,
  onSelect,
  trailing,
}: {
  c: IntakeCase;
  selected: boolean;
  onSelect: () => void;
  trailing?: React.ReactNode;
}) {
  const status = STATUS_META[c.status];
  const memberLabel = c.memberHint ?? "Unidentified";
  return (
    <div
      onClick={onSelect}
      className="cursor-pointer"
      style={{
        padding: 12,
        borderRadius: 8,
        border: selected ? "1px solid #12275e" : "1px solid #bfbfbf",
        background: selected ? "#f0f4fb" : "#fff",
        boxShadow: selected ? "0 0 0 2px rgba(18,39,94,0.08)" : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <Text style={{ fontSize: 11, color: "#8c8c8c" }}>
          {c.caseNumber ?? c.transactionId}
        </Text>
        <Tag
          icon={SOURCE_META[c.source].icon}
          color={SOURCE_META[c.source].color}
          style={{ marginRight: 0, fontSize: 11 }}
        >
          {c.source}
        </Tag>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Text strong style={{ fontSize: 14 }}>{c.drugHint}</Text>
        {c.isDraft && <Tag color="default" style={{ marginRight: 0, fontSize: 11 }}>Draft</Tag>}
      </div>
      <Text
        style={{
          fontSize: 14,
          display: "block",
          color: c.memberHint ? undefined : "#d48806",
          fontStyle: c.memberHint ? "normal" : "italic",
        }}
      >
        {memberLabel}
      </Text>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 8 }}>
        {c.testOutcome ? (
          <Tag
            color={
              c.testOutcome === "pa_required"
                ? "error"
                : c.testOutcome === "excluded"
                ? "error"
                : c.testOutcome === "paid_unexpected"
                ? "warning"
                : "orange"
            }
            style={{ marginRight: 0, fontSize: 11 }}
          >
            {c.testOutcome === "pa_required"
              ? "PA required"
              : c.testOutcome === "non_formulary"
              ? "Non-formulary"
              : c.testOutcome === "excluded"
              ? "Excluded"
              : c.testOutcome === "step_therapy"
              ? "Step therapy"
              : c.testOutcome === "quantity_limit"
              ? "Quantity limit"
              : "Paid, unexpected"}
          </Tag>
        ) : c.status !== "waiting" ? (
          <Tag color={status.color} style={{ marginRight: 0, fontSize: 11 }}>{status.label}</Tag>
        ) : null}
        <Text type="secondary" style={{ fontSize: 11, flex: 1 }}>{c.receivedAt}</Text>
        {trailing}
      </div>
    </div>
  );
}
