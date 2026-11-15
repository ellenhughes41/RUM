import { useState } from "react";
import { Typography, Tag, Input, Tabs, Button, Dropdown, Space, Popover, Badge, Select } from "antd";
import {
  SearchOutlined,
  SafetyCertificateOutlined,
  FilterOutlined,
  SortAscendingOutlined,
} from "@ant-design/icons";
import {
  currentOverrideTech,
  isClaimable,
  OVERRIDE_STATUS_COLOR,
  OVERRIDE_STATUSES,
  type OverrideCase,
} from "@/data/mockOverrideCases";

const { Text } = Typography;

export type OverrideTabKey = "queue" | "claimed";

interface OverrideQueueListProps {
  cases: OverrideCase[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClaim: (id: string) => void;
  onRelease: (id: string) => void;
  activeTab: OverrideTabKey;
  onTabChange: (tab: OverrideTabKey) => void;
}

export function OverrideQueueList({
  cases,
  selectedId,
  onSelect,
  onClaim,
  onRelease,
  activeTab,
  onTabChange,
}: OverrideQueueListProps) {
  const [query, setQuery] = useState("");
  const [carrierFilter, setCarrierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [remainingTimeFilter, setRemainingTimeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<"updated" | "status" | "drug" | "member">("updated");

  const carrierOptions = [
    { value: "all", label: "All carriers" },
    ...Array.from(new Set(cases.map((c) => c.carrier).filter(Boolean))).sort().map((v) => ({ value: v, label: v })),
  ];
  const statusOptions = [{ value: "all", label: "All statuses" }, ...OVERRIDE_STATUSES.map((v) => ({ value: v, label: v }))];
  const priorityOptions = [
    { value: "all", label: "All priorities" },
    { value: "standard", label: "Standard" },
    { value: "expedited", label: "Expedited" },
  ];
  const remainingTimeOptions = [
    { value: "all", label: "Any time" },
    { value: "lt1", label: "< 1 hour" },
    { value: "1to4", label: "1–4 hours" },
    { value: "4to24", label: "4–24 hours" },
    { value: "gt24", label: "> 24 hours" },
  ];

  const matchesFilter = (c: OverrideCase) => {
    if (carrierFilter !== "all" && c.carrier !== carrierFilter) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (priorityFilter !== "all" && c.priority !== priorityFilter) return false;
    const m = c.remainingMinutes;
    if (remainingTimeFilter === "lt1" && !(m < 60)) return false;
    if (remainingTimeFilter === "1to4" && !(m >= 60 && m < 240)) return false;
    if (remainingTimeFilter === "4to24" && !(m >= 240 && m < 1440)) return false;
    if (remainingTimeFilter === "gt24" && !(m >= 1440)) return false;
    return true;
  };

  const chips: { key: string; label: string; onClose: () => void }[] = [];
  if (carrierFilter !== "all") chips.push({ key: "carrier", label: carrierFilter, onClose: () => setCarrierFilter("all") });
  if (statusFilter !== "all") chips.push({ key: "status", label: statusFilter, onClose: () => setStatusFilter("all") });
  if (priorityFilter !== "all") chips.push({ key: "priority", label: priorityFilter === "standard" ? "Standard" : "Expedited", onClose: () => setPriorityFilter("all") });
  if (remainingTimeFilter !== "all") chips.push({ key: "remaining", label: remainingTimeOptions.find((o) => o.value === remainingTimeFilter)?.label ?? "", onClose: () => setRemainingTimeFilter("all") });

  const field = (label: string, value: string, onChange: (v: string) => void, options: { value: string; label: string }[]) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>{label}</Text>
      <Select size="small" style={{ width: "100%" }} value={value} onChange={onChange} options={options} showSearch optionFilterProp="label" />
    </div>
  );
  const filterContent = (
    <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 12 }}>
      {field("Carrier", carrierFilter, setCarrierFilter, carrierOptions)}
      {field("Status", statusFilter, setStatusFilter, statusOptions)}
      <div style={{ display: "flex", gap: 8 }}>
        {field("Priority", priorityFilter, setPriorityFilter, priorityOptions)}
        {field("Remaining Time", remainingTimeFilter, setRemainingTimeFilter, remainingTimeOptions)}
      </div>
    </div>
  );

  const sortFn = (a: OverrideCase, b: OverrideCase) => {
    if (sortKey === "drug") return a.drugName.localeCompare(b.drugName);
    if (sortKey === "member") return a.memberName.localeCompare(b.memberName);
    if (sortKey === "status") return a.status.localeCompare(b.status);
    // Longest time since it arrived from Case Review first.
    return (b.elapsedMinutes ?? 0) - (a.elapsedMinutes ?? 0);
  };

  const matches = (c: OverrideCase) => {
    if (!query.trim()) return true;
    const s = query.trim().toLowerCase();
    return (
      c.caseNumber.toLowerCase().includes(s) ||
      c.memberName.toLowerCase().includes(s) ||
      c.memberId.toLowerCase().includes(s) ||
      c.drugName.toLowerCase().includes(s)
    );
  };

  const claimed = cases.filter((c) => c.claimedBy === currentOverrideTech.id);
  const queue = cases.filter((c) => c.claimedBy !== currentOverrideTech.id);

  const filtered = (activeTab === "claimed" ? claimed : queue)
    .filter(matches)
    .filter(matchesFilter)
    .sort(sortFn);

  const trailingFor = (c: OverrideCase) => {
    if (c.claimedBy === currentOverrideTech.id) {
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
    if (!isClaimable(c.status) || c.letterSendAt) return null;
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
        <SafetyCertificateOutlined style={{ color: "#12275e", fontSize: 18 }} />
        <Text strong style={{ fontSize: 15 }}>Override Queue</Text>
      </div>

      <Input
        placeholder="Search override queue"
        prefix={<SearchOutlined />}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        allowClear
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <Popover trigger="click" placement="bottomRight" content={filterContent}>
          <Badge count={chips.length} size="small" offset={[-4, 2]}>
            <Button size="small" icon={<FilterOutlined />}>Filter</Button>
          </Badge>
        </Popover>
        <Dropdown
          menu={{
            selectedKeys: [sortKey],
            onClick: ({ key }) => setSortKey(key as typeof sortKey),
            items: [
              { key: "updated", label: "Longest in queue" },
              { key: "status", label: "Status" },
              { key: "drug", label: "Drug" },
              { key: "member", label: "Member" },
            ],
          }}
        >
          <Button size="small" icon={<SortAscendingOutlined />}>Sort</Button>
        </Dropdown>
        {chips.map((chip) => (
          <Tag key={chip.key} closable onClose={(e) => { e.preventDefault(); chip.onClose(); }} style={{ margin: 0 }}>
            {chip.label}
          </Tag>
        ))}
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(k) => onTabChange(k as OverrideTabKey)}
        size="small"
        items={[
          { key: "queue", label: `Override Queue (${queue.length})` },
          { key: "claimed", label: `Claimed (${claimed.length})` },
        ]}
        style={{ marginBottom: -8 }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((c) => (
          <OverrideCard
            key={c.id}
            c={c}
            selected={selectedId === c.id}
            onSelect={() => onSelect(c.id)}
            trailing={trailingFor(c)}
          />
        ))}
        {filtered.length === 0 && (
          <Text type="secondary" style={{ fontSize: 14, textAlign: "center", padding: 24 }}>
            No items in this queue.
          </Text>
        )}
      </div>
    </div>
  );
}

function OverrideCard({
  c,
  selected,
  onSelect,
  trailing,
}: {
  c: OverrideCase;
  selected: boolean;
  onSelect: () => void;
  trailing?: React.ReactNode;
}) {
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
        <Text style={{ fontSize: 11, color: "#8c8c8c" }}>{c.caseNumber}</Text>
        <Text style={{ fontSize: 11, color: "#8c8c8c" }}>{c.memberId}</Text>
      </div>
      <Text strong style={{ fontSize: 14, display: "block" }}>{c.drugName}</Text>
      <Text style={{ fontSize: 14, display: "block" }}>{c.memberName}</Text>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8, gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Tag
            color={OVERRIDE_STATUS_COLOR[c.status]}
            style={{
              marginRight: 0,
              fontSize: 11,
              whiteSpace: "normal",
              lineHeight: 1.35,
              maxWidth: 140,
              display: "inline-block",
            }}
          >
            {c.status}
          </Tag>
          <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
            {c.updatedAt}
          </Text>
        </div>
        {trailing}
      </div>
    </div>
  );
}
