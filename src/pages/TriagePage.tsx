import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Layout,
  Typography,
  DatePicker,
  Input,
  Select,
  Button,
  Card,
  Row,
  Col,
  Table,
  Space,
  Tag,
  Statistic,
  Alert,
  Empty,
  Drawer,
  Popover,
} from "antd";
import { ReloadOutlined, CloseOutlined, DownloadOutlined, EyeOutlined, FilterOutlined, ExportOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { AppLayout } from "@/components/layout/AppLayout";
import { useFilterState } from "@/hooks/useFilterState";
import { TriagePreviewPanel } from "@/components/cases/TriagePreviewPanel";
import {
  mockCases,
  CLIENTS,
  STATUSES,
  PRIORITIES,
  CLAIM_STATES,
  MockCase,
  CaseStatus,
} from "@/data/mockCases";
import type { ColumnsType } from "antd/es/table";
import type { TableProps } from "antd/es/table";

const { Content } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const FINAL_STATUSES = new Set<CaseStatus>([
  "Approved","Denied","Withdrawn","Dismissed",
]);
const DECIDED_STATUSES: CaseStatus[] = ["Approved","Denied","Withdrawn","Dismissed"];

const CASE_ID_PATTERN = /^RX-\d+$/i;

const QUICK_LABELS: Record<string, string> = {
  under2h: "Under 2hr SLA",
  overdue: "Overdue",
};

// All-time range derived from the dataset.
const DATA_START = (() => {
  let min = Infinity;
  for (const c of mockCases) {
    const t = dayjs(c.receivedAt).valueOf();
    if (t < min) min = t;
  }
  return dayjs(min).startOf("day");
})();
const DATA_END = dayjs().endOf("day");

function allowedMinutes(c: MockCase) {
  return c.priority === "expedited" ? 24 * 60 : 72 * 60;
}
function isAtRisk(c: MockCase) {
  return (
    c.remainingMinutes !== null &&
    c.remainingMinutes > 0 &&
    c.remainingMinutes < 0.25 * allowedMinutes(c)
  );
}
function isOverdue(c: MockCase) {
  return c.remainingMinutes !== null && c.remainingMinutes <= 0;
}
function formatRemaining(min: number): string {
  if (min <= 0) return "Overdue";
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCSV(rows: MockCase[], clientsSel: string[], range: [dayjs.Dayjs, dayjs.Dayjs], isAllTime: boolean) {
  const headers = [
    "Case ID","Member","Member ID","Drug","Drug Class","Client","Status","Sub-state",
    "Priority","Remaining","Submitted","Due","Claimed","Claimed By","Source","Received At","Decided At",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      r.id, r.memberName, r.memberId, r.drugName, r.drugClass, r.client,
      r.status, r.subState ?? "", r.priority,
      r.remainingMinutes === null ? "" : formatRemaining(r.remainingMinutes),
      dayjs(r.receivedAt).format("YYYY-MM-DD HH:mm"),
      r.dueAt ? dayjs(r.dueAt).format("YYYY-MM-DD HH:mm") : "",
      r.claimedAt ? dayjs(r.claimedAt).format("YYYY-MM-DD HH:mm") : "",
      r.claimedBy ?? "",
      r.source,
      dayjs(r.receivedAt).format("YYYY-MM-DD HH:mm"),
      r.decidedAt ? dayjs(r.decidedAt).format("YYYY-MM-DD HH:mm") : "",
    ].map(csvEscape).join(","));
  }
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const clientPart =
    clientsSel.length === 0 ? "all-clients" :
    clientsSel.length === 1 ? slug(clientsSel[0]) :
    `${clientsSel.length}-clients`;
  const today = dayjs();
  const defaultEnd = today.endOf("day");
  const defaultStart = defaultEnd.subtract(3, "month").startOf("day");
  const isDefaultRange =
    !isAllTime &&
    range[0].isSame(defaultStart, "day") &&
    range[1].isSame(defaultEnd, "day");
  const rangePart = isAllTime
    ? "all-time"
    : isDefaultRange
    ? "last-3-months"
    : `${range[0].format("YYYY-MM-DD")}-to-${range[1].format("YYYY-MM-DD")}`;
  const filename = `triage_${clientPart}_${rangePart}_${today.format("YYYY-MM-DD")}.csv`;

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function TriagePage() {
  const { filters, update, reset } = useFilterState();
  const navigate = useNavigate();
  const [viewCaseId, setViewCaseId] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const viewedCase = useMemo(
    () => mockCases.find((c) => c.id === viewCaseId) ?? null,
    [viewCaseId]
  );

  const trimmedSearch = filters.search.trim();
  const isCaseIdSearch = CASE_ID_PATTERN.test(trimmedSearch);
  const effectiveRange: [dayjs.Dayjs, dayjs.Dayjs] = isCaseIdSearch
    ? [DATA_START, DATA_END]
    : filters.dateRange;

  // Apply filters with an optional date-range override. The "search" string and
  // an "ignoreDate" flag let us also count out-of-range matches for the empty
  // state escape hatch.
  const applyFilters = (
    range: [dayjs.Dayjs, dayjs.Dayjs],
    opts: { ignoreDate?: boolean; ignoreSearch?: boolean } = {}
  ) => {
    const [from, to] = range;
    const q = trimmedSearch.toLowerCase();
    return mockCases.filter((c) => {
      const received = dayjs(c.receivedAt);
      if (!opts.ignoreDate) {
        if (received.isBefore(from.startOf("day"))) return false;
        if (received.isAfter(to.endOf("day"))) return false;
      }
      if (filters.statuses.length && !filters.statuses.includes(c.status)) return false;
      if (filters.priorities.length && !filters.priorities.includes(c.priority)) return false;
      if (filters.clients.length && !filters.clients.includes(c.client)) return false;
      if (filters.claimStates.length) {
        const state = c.claimedBy ? "claimed" : "unclaimed";
        if (!filters.claimStates.includes(state)) return false;
      }
      if (!opts.ignoreSearch && q) {
        const hay = `${c.id} ${c.memberName} ${c.memberId} ${c.drugName} ${c.client}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      for (const qf of filters.quickFilters) {
        if (qf === "under2h") {
          if (FINAL_STATUSES.has(c.status)) return false;
          if (!(c.remainingMinutes !== null && c.remainingMinutes < 120)) return false;
        } else if (qf === "overdue") {
          if (FINAL_STATUSES.has(c.status)) return false;
          if (!isOverdue(c)) return false;
        }
      }
      return true;
    });
  };

  const filtered = useMemo(() => {
    return applyFilters(effectiveRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, isCaseIdSearch]);

  // For non-ID searches with 0 in-range hits, count out-of-range hits.
  const outOfRangeCount = useMemo(() => {
    if (isCaseIdSearch || filtered.length > 0 || !trimmedSearch) return 0;
    const total = applyFilters(effectiveRange, { ignoreDate: true }).length;
    return total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.length, trimmedSearch, filters, isCaseIdSearch]);

  const clientSummary =
    filters.clients.length === 0
      ? "All clients"
      : filters.clients.length === 1
      ? filters.clients[0]
      : `${filters.clients.length} clients`;

  const rangeLabel = isCaseIdSearch
    ? "All time"
    : `${filters.dateRange[0].format("MMM D, YYYY")} – ${filters.dateRange[1].format("MMM D, YYYY")}`;

  // KPI metrics
  const kpi = useMemo(() => {
    const open = filtered.filter((c) => !FINAL_STATUSES.has(c.status));
    const slaBreak = [
      { label: "2 days", minutes: 2880 },
      { label: "1 day", minutes: 1440 },
      { label: "12 hours", minutes: 720 },
      { label: "8 hours", minutes: 480 },
      { label: "4 hours", minutes: 240 },
      { label: "2 hours", minutes: 120 },
    ].map(({ label, minutes }) => ({
      label,
      count: open.filter((c) => c.remainingMinutes !== null && c.remainingMinutes < minutes).length,
    }));
    const overdue = open.filter(isOverdue).length;
    const statusBreak: Record<string, number> = {
      "Ready for Clinical Review": 0,
      "RFI": 0,
    };
    open.forEach((c) => {
      if (c.status in statusBreak) statusBreak[c.status] += 1;
    });
    const [from, to] = effectiveRange;
    const decidedCases = filtered.filter(
      (c) =>
        DECIDED_STATUSES.includes(c.status) &&
        c.decidedAt &&
        !dayjs(c.decidedAt).isBefore(from.startOf("day")) &&
        !dayjs(c.decidedAt).isAfter(to.endOf("day"))
    );
    const decidedBreak: Record<string, number> = {
      "Approved": 0,
      "Denied": 0,
      "Withdrawn": 0,
      "Dismissed": 0,
    };
    decidedCases.forEach((c) => {
      if (c.status in decidedBreak) decidedBreak[c.status] += 1;
    });
    return { open: open.length, slaBreak, overdue, statusBreak, decided: decidedCases.length, decidedBreak };
  }, [filtered, effectiveRange]);

  const toggleQuick = (key: string) => {
    const has = filters.quickFilters.includes(key);
    update({
      quickFilters: has
        ? filters.quickFilters.filter((q) => q !== key)
        : [...filters.quickFilters, key],
    });
  };
  const tileSelected = (key: string) => filters.quickFilters.includes(key);
  const tileStyle = (active: boolean): React.CSSProperties => ({
    cursor: "pointer",
    borderColor: active ? "#1677ff" : undefined,
    background: active ? "#e6f4ff" : undefined,
    boxShadow: active ? "0 0 0 1px #1677ff inset" : undefined,
  });

  // Active chips (column-derived + quick filters)
  const chips: Array<{ key: string; label: string; onClose: () => void }> = [
    ...filters.statuses.map((p) => ({
      key: `status:${p}`,
      label: `Status: ${p}`,
      onClose: () => update({ statuses: filters.statuses.filter((x) => x !== p) }),
    })),
    ...filters.priorities.map((p) => ({
      key: `pri:${p}`,
      label: `Priority: ${p}`,
      onClose: () => update({ priorities: filters.priorities.filter((x) => x !== p) }),
    })),
    ...filters.clients.map((p) => ({
      key: `cli:${p}`,
      label: `Client: ${p}`,
      onClose: () => update({ clients: filters.clients.filter((x) => x !== p) }),
    })),
    ...filters.claimStates.map((p) => ({
      key: `cs:${p}`,
      label: `Claim: ${p}`,
      onClose: () => update({ claimStates: filters.claimStates.filter((x) => x !== p) }),
    })),
    ...filters.quickFilters.map((q) => ({
      key: `q:${q}`,
      label: QUICK_LABELS[q] ?? q,
      onClose: () => update({ quickFilters: filters.quickFilters.filter((x) => x !== q) }),
    })),
  ];

  const columns: ColumnsType<MockCase> = [
    {
      title: "Case ID",
      dataIndex: "id",
      key: "id",
      sorter: (a, b) => a.id.localeCompare(b.id),
      width: 110,
      render: (v: string) => v.replace(/^RX-/i, ""),
    },
    {
      title: "Member",
      dataIndex: "memberName",
      key: "memberName",
      width: 170,
      sorter: (a, b) => a.memberName.localeCompare(b.memberName),
      render: (v, r) => (
        <Space direction="vertical" size={0} style={{ whiteSpace: "nowrap" }}>
          <Text style={{ whiteSpace: "nowrap" }}>{v}</Text>
          <Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{r.memberId.replace(/^M/i, "")}</Text>
        </Space>
      ),
    },
    {
      title: "Carrier",
      dataIndex: "client",
      key: "carrier",
      width: 160,
      sorter: (a, b) => a.client.localeCompare(b.client),
      render: (v: string) => <Text style={{ whiteSpace: "nowrap" }}>{v}</Text>,
    },
    {
      title: "Drug",
      dataIndex: "drugName",
      key: "drugName",
      width: 220,
      sorter: (a, b) => a.drugName.localeCompare(b.drugName),
      render: (v, r) => (
        <Space direction="vertical" size={0} style={{ whiteSpace: "nowrap" }}>
          <Text style={{ whiteSpace: "nowrap" }}>{v}</Text>
          <Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{r.drugName} Clinical Policy</Text>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 220,
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: (_v, r) => (
        <Space direction="vertical" size={2} style={{ whiteSpace: "nowrap" }}>
          <Text style={{ whiteSpace: "nowrap" }}>{r.status}</Text>
          {r.status === "Ready for Clinical Review" && r.subState && (
            <Space size={4} style={{ whiteSpace: "nowrap" }}>
              <Tag color={r.subState.startsWith("Copilot") ? "geekblue" : "orange"} style={{ marginRight: 0 }}>
                {r.subState.startsWith("Copilot") ? "Copilot Reviewed" : "Manual Review Needed"}
              </Tag>
              <Tag color={r.subState.endsWith("Claimed") ? "green" : "default"} style={{ marginRight: 0 }}>
                {r.subState.endsWith("Claimed") ? "Claimed" : "Unclaimed"}
              </Tag>
            </Space>
          )}
        </Space>
      ),
    },
    {
      title: "Remaining",
      dataIndex: "remainingMinutes",
      key: "remainingMinutes",
      width: 120,
      sorter: (a, b) =>
        (a.remainingMinutes ?? Number.POSITIVE_INFINITY) -
        (b.remainingMinutes ?? Number.POSITIVE_INFINITY),
      render: (_v, r) => {
        if (r.remainingMinutes === null) return "—";
        const overdue = isOverdue(r);
        const atRisk = isAtRisk(r);
        const color = overdue ? "#ff4d4f" : atRisk ? "#fa8c16" : undefined;
        const display = formatRemaining(r.remainingMinutes);
        return (
          <Space direction="vertical" size={0} style={{ whiteSpace: "nowrap" }}>
            <span style={{ color, fontWeight: overdue || atRisk ? 600 : undefined, whiteSpace: "nowrap" }}>
              {display}
            </span>
            {overdue && r.remainingMinutes < 0 && (
              <span style={{ color, fontSize: 12, whiteSpace: "nowrap" }}>
                {formatRemaining(Math.abs(r.remainingMinutes))} overdue
              </span>
            )}
          </Space>
        );
      },
    },
    {
      title: "Submitted",
      dataIndex: "receivedAt",
      key: "receivedAt",
      width: 150,
      render: (v: string, r: MockCase) => (
        <Space direction="vertical" size={0} style={{ whiteSpace: "nowrap" }}>
          <span style={{ whiteSpace: "nowrap" }}>{dayjs(v).format("MMM D, h:mm A")}</span>
          <Tag color={r.priority === "expedited" ? "red" : "blue"} style={{ marginTop: 4, whiteSpace: "nowrap" }}>
            {r.priority}
          </Tag>
        </Space>
      ),
      sorter: (a, b) => dayjs(a.receivedAt).valueOf() - dayjs(b.receivedAt).valueOf(),
    },
    {
      title: "Due",
      dataIndex: "dueAt",
      key: "dueAt",
      width: 150,
      render: (v: string | null) => <span style={{ whiteSpace: "nowrap" }}>{v ? dayjs(v).format("MMM D, h:mm A") : "—"}</span>,
      sorter: (a, b) =>
        (a.dueAt ? dayjs(a.dueAt).valueOf() : Number.POSITIVE_INFINITY) -
        (b.dueAt ? dayjs(b.dueAt).valueOf() : Number.POSITIVE_INFINITY),
    },
    {
      title: "Claimed",
      dataIndex: "claimedAt",
      key: "claimedAt",
      width: 170,
      render: (v: string | null, r: MockCase) => (
        <Space direction="vertical" size={0} style={{ whiteSpace: "nowrap" }}>
          <span style={{ whiteSpace: "nowrap" }}>{v ? dayjs(v).format("MMM D, h:mm A") : "—"}</span>
          {r.claimedBy ? (
            <Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
              {r.claimedBy}
            </Text>
          ) : null}
        </Space>
      ),
      sorter: (a, b) =>
        (a.claimedAt ? dayjs(a.claimedAt).valueOf() : Number.POSITIVE_INFINITY) -
        (b.claimedAt ? dayjs(b.claimedAt).valueOf() : Number.POSITIVE_INFINITY),
    },
    {
      title: "Source",
      dataIndex: "source",
      key: "source",
      width: 110,
      sorter: (a, b) => a.source.localeCompare(b.source),
      render: (v: string) => <Tag style={{ whiteSpace: "nowrap" }}>{v}</Tag>,
    },
  ];

  // Column headers only provide sort; all filters live in the top bar.

  return (
    <AppLayout>
      <Layout style={{ height: "100vh" }}>
        <Content style={{ overflowY: "auto", background: "#f5f5f5" }}>
          <div style={{ width: "100%", padding: "0 24px" }}>
            {/* Sticky control bar */}
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 10,
                background: "#f5f5f5",
                padding: "16px 0 12px",
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <div style={{ marginBottom: 12 }}>
                <Title level={4} style={{ margin: 0 }}>Triage</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Read-only triage view for managers and stakeholders
                </Text>
              </div>
              <Row gutter={[8, 8]} align="middle" wrap>
                <Col>
                  <RangePicker
                    value={isCaseIdSearch ? null : filters.dateRange}
                    onChange={(v) => v && v[0] && v[1] && update({ dateRange: [v[0], v[1]] })}
                    allowClear={false}
                    disabled={isCaseIdSearch}
                    open={datePickerOpen}
                    onOpenChange={setDatePickerOpen}
                    placeholder={isCaseIdSearch ? ["All time", ""] : ["Start", "End"]}
                    panelRender={(originPanel) => (
                      <div style={{ display: "flex" }}>
                        <div
                          style={{
                            width: 120,
                            borderRight: "1px solid #f0f0f0",
                            padding: "12px 0",
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
                          <Text
                            type="secondary"
                            style={{ fontSize: 12, padding: "0 16px 8px", fontWeight: 600 }}
                          >
                            Presets
                          </Text>
                          {[
                            { label: "1 month", value: 1, unit: "month" as const },
                            { label: "3 month", value: 3, unit: "month" as const },
                            { label: "6 month", value: 6, unit: "month" as const },
                            { label: "1 year", value: 1, unit: "year" as const },
                            { label: "3 year", value: 3, unit: "year" as const },
                          ].map((preset) => (
                            <Button
                              key={preset.label}
                              type="text"
                              style={{ textAlign: "left", justifyContent: "flex-start" }}
                              onClick={() => {
                                const end = dayjs().endOf("day");
                                const start = end.subtract(preset.value, preset.unit).startOf("day");
                                update({ dateRange: [start, end] });
                                setDatePickerOpen(false);
                              }}
                            >
                              {preset.label}
                            </Button>
                          ))}
                        </div>
                        <div>{originPanel}</div>
                      </div>
                    )}
                  />
                </Col>
                <Col flex="240px">
                  <Input.Search
                    placeholder="Search ID, member, drug…"
                    value={filters.search}
                    onChange={(e) => update({ search: e.target.value })}
                    allowClear
                  />
                </Col>
                <Col>
                  <Popover
                    trigger="click"
                    placement="bottomLeft"
                    content={
                      <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 10 }}>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
                          <Select
                            mode="multiple"
                            placeholder="Status"
                            style={{ width: "100%", marginTop: 4 }}
                            value={filters.statuses}
                            onChange={(v) => update({ statuses: v })}
                            options={STATUSES.map((p) => ({ label: p, value: p }))}
                            maxTagCount="responsive"
                          />
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>Priority</Text>
                          <Select
                            mode="multiple"
                            placeholder="Priority"
                            style={{ width: "100%", marginTop: 4 }}
                            value={filters.priorities}
                            onChange={(v) => update({ priorities: v })}
                            options={PRIORITIES.map((p) => ({ label: p, value: p }))}
                            maxTagCount="responsive"
                          />
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>Client</Text>
                          <Select
                            mode="multiple"
                            placeholder="Client"
                            style={{ width: "100%", marginTop: 4 }}
                            value={filters.clients}
                            onChange={(v) => update({ clients: v })}
                            options={CLIENTS.map((c) => ({ label: c, value: c }))}
                            maxTagCount="responsive"
                          />
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>Claim state</Text>
                          <Select
                            mode="multiple"
                            placeholder="Claim state"
                            style={{ width: "100%", marginTop: 4 }}
                            value={filters.claimStates}
                            onChange={(v) => update({ claimStates: v })}
                            options={CLAIM_STATES.map((c) => ({ label: c, value: c }))}
                            maxTagCount="responsive"
                          />
                        </div>
                      </div>
                    }
                  >
                    <Button icon={<FilterOutlined />}>
                      More Filters
                      {(() => {
                        const n = filters.statuses.length + filters.priorities.length + filters.clients.length + filters.claimStates.length;
                        return n > 0 ? <Tag color="blue" style={{ marginLeft: 6, marginRight: 0 }}>{n}</Tag> : null;
                      })()}
                    </Button>
                  </Popover>
                </Col>
                <Col flex="auto" style={{ textAlign: "right" }}>
                  <Space>
                    <Button icon={<ReloadOutlined />} onClick={reset}>
                      Reset
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => downloadCSV(filtered, filters.clients, effectiveRange, isCaseIdSearch)}
                    >
                      Export CSV
                    </Button>
                  </Space>
                </Col>
              </Row>
              <div style={{ marginTop: 10 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Showing {filtered.length} cases · {rangeLabel} · {clientSummary} · applies to metrics and grid
                </Text>
              </div>
              {chips.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {chips.map((c) => (
                    <Tag
                      key={c.key}
                      closable
                      closeIcon={<CloseOutlined style={{ fontSize: 10 }} />}
                      onClose={(e) => { e.preventDefault(); c.onClose(); }}
                      style={{ background: "#fff" }}
                    >
                      {c.label}
                    </Tag>
                  ))}
                </div>
              )}
            </div>

            {/* KPI strip */}
            <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
              <Col xs={24} sm={12} md={8} lg={5}>
                <Card size="small">
                  <Statistic title="Open Cases" value={kpi.open} />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8} lg={5}>
                <Card size="small">
                  <Text type="secondary" style={{ fontSize: 14 }}>By SLA</Text>
                  <div className="mt-2 grid grid-flow-col grid-cols-2 grid-rows-3 gap-x-4 gap-y-2 text-sm">
                    {kpi.slaBreak.map(({ label, count }) => (
                      <div key={label} className="flex items-center justify-between gap-2 whitespace-nowrap">
                        <span>{label}</span>
                        <strong>{count}</strong>
                      </div>
                    ))}
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8} lg={4}>
                <Card
                  size="small"
                  hoverable
                  onClick={() => toggleQuick("overdue")}
                  style={tileStyle(tileSelected("overdue"))}
                >
                  <Statistic title="Overdue" value={kpi.overdue} valueStyle={{ color: "#ff4d4f" }} />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8} lg={5}>
                <Card size="small">
                  <Text type="secondary" style={{ fontSize: 14 }}>By Status</Text>
                  <div style={{ marginTop: 6 }}>
                    {(Object.keys(kpi.statusBreak) as CaseStatus[]).map((p) => {
                      const active = filters.statuses.includes(p);
                      return (
                        <div
                          key={p}
                          onClick={() =>
                            update({
                              statuses: active
                                ? filters.statuses.filter((x) => x !== p)
                                : [...filters.statuses, p],
                            })
                          }
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "2px 6px",
                            marginBottom: 2,
                            borderRadius: 4,
                            cursor: "pointer",
                            background: active ? "#e6f4ff" : undefined,
                            border: active ? "1px solid #1677ff" : "1px solid transparent",
                            fontSize: 13,
                          }}
                        >
                          <span>{p}</span>
                          <strong>{kpi.statusBreak[p]}</strong>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8} lg={5}>
                <Card size="small">
                  <Text type="secondary" style={{ fontSize: 14 }}>Decided This Period</Text>
                  <div style={{ marginTop: 6 }}>
                    {(Object.keys(kpi.decidedBreak) as CaseStatus[]).map((s) => {
                      const active = filters.statuses.includes(s);
                      return (
                        <div
                          key={s}
                          onClick={() =>
                            update({
                              statuses: active
                                ? filters.statuses.filter((x) => x !== s)
                                : [...filters.statuses, s],
                            })
                          }
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "2px 6px",
                            marginBottom: 2,
                            borderRadius: 4,
                            cursor: "pointer",
                            background: active ? "#e6f4ff" : undefined,
                            border: active ? "1px solid #1677ff" : "1px solid transparent",
                            fontSize: 13,
                          }}
                        >
                          <span>{s}</span>
                          <strong>{kpi.decidedBreak[s]}</strong>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </Col>
            </Row>

            {/* Data table */}
            <Card size="small" style={{ marginTop: 16, marginBottom: 24 }}>
              {isCaseIdSearch && (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message={
                    <span>
                      Searching all time for case <strong>{trimmedSearch.toUpperCase()}</strong>.
                    </span>
                  }
                  action={
                    <Button size="small" type="link" onClick={() => update({ search: "" })}>
                      Reapply date filter
                    </Button>
                  }
                />
              )}
              <Table<MockCase>
                rowKey="id"
                columns={columns}
                dataSource={filtered}
                pagination={{ pageSize: 50, showSizeChanger: false }}
                onRow={(record) => ({
                  onClick: () => setViewCaseId(record.id),
                  style: { cursor: "pointer" },
                })}
                size="middle"
                scroll={{ x: "max-content" }}
                locale={{
                  emptyText:
                    !isCaseIdSearch && trimmedSearch && outOfRangeCount > 0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          <span>
                            No matches in {rangeLabel}. Found {outOfRangeCount} outside this range.
                          </span>
                        }
                      >
                        <Button
                          type="primary"
                          onClick={() => update({ dateRange: [DATA_START, DATA_END] })}
                        >
                          Show all time
                        </Button>
                      </Empty>
                    ) : undefined,
                }}
              />
            </Card>
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
        extra={
          viewedCase ? (
            <Button
              type="primary"
              icon={<ExportOutlined />}
              onClick={() => navigate(`/cases?case=${viewedCase.id}`)}
            >
              Open case
            </Button>
          ) : null
        }
        styles={{ body: { padding: 0, background: "#fff" } }}
      >
        {viewedCase && (
          <div style={{ height: "100%", overflowY: "auto" }} aria-readonly="true">
            <TriagePreviewPanel caseData={viewedCase} />
          </div>
        )}
      </Drawer>
    </AppLayout>
  );
}
