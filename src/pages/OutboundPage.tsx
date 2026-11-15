import { useMemo, useState } from "react";
import { Layout, Typography, DatePicker, Input, Button, Card, Row, Col, Table, Tag, Statistic, Drawer, Descriptions, Space, Popover, Select, message } from "antd";
import { ReloadOutlined, CloseOutlined, FilterOutlined, PlusOutlined, RedoOutlined } from "@ant-design/icons";
import { NewOutboundModal, type OutboundPrefill } from "@/components/outbound/NewOutboundModal";
import { mockMemberDirectory, mockDrugDirectory, mockPriorCases } from "@/data/mockIntakeCases";
import { getTemplate } from "@/hooks/use-letter-templates";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import { AppLayout } from "@/components/layout/AppLayout";

const { Content } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type Source = "Fax" | "Letter";
type OutStatus = "Sent" | "Failed" | "Queued";

interface OutboundItem {
  id: string;
  source: Source;
  memberRef?: string;
  drugRef?: string;
  faxNumber?: string;
  templateId?: string;
  templateName: string;
  memberName: string;
  memberId: string;
  carrier: string;
  drug: string;
  caseId: string | null;
  status: OutStatus;
  dueAt: string;
  createdAt: string;
  generatedAt: string;
  deliveredAt: string | null;
  recipient: string;
  failureReason?: string;
  attempts: number;
}

const CARRIERS = Array.from(new Set(mockMemberDirectory.map((m) => m.carrier)));
const FAX_FAIL = ["Busy signal after 3 retries", "No answer", "Invalid fax number"];
const LETTER_FAIL = ["Address undeliverable", "Print vendor rejected file", "Missing member address"];

const TEMPLATE_SEED = ["1", "2", "3", "5", "8"];

const ITEMS: OutboundItem[] = Array.from({ length: 42 }, (_, i) => {
  const source: Source = i % 3 === 0 ? "Letter" : "Fax";
  const status: OutStatus = i % 5 === 1 ? "Failed" : i % 7 === 3 ? "Queued" : "Sent";
  const m = mockMemberDirectory[i % mockMemberDirectory.length];
  const d = mockDrugDirectory[i % mockDrugDirectory.length];
  const memberName = m.name, memberId = m.memberId.replace(/\D/g, "");
  const pcs = mockPriorCases[m.id] ?? [];
  const tpl = TEMPLATE_SEED[i % TEMPLATE_SEED.length];
  const faxNumber = `(555) 1${String(i).padStart(2, "0")}-2200`;
  const created = dayjs().subtract(i * 7 + 2, "hour");
  return {
    id: String(100200 + i),
    source,
    memberRef: m.id,
    drugRef: d.id,
    faxNumber: source === "Fax" ? faxNumber : undefined,
    templateId: tpl,
    templateName: getTemplate(tpl)?.name ?? "Standard Denial Notice",
    memberName,
    memberId,
    carrier: m.carrier,
    drug: `${d.name} ${d.strength}`,
    caseId: i % 4 === 2 || !pcs.length ? null : pcs[i % pcs.length].caseNumber,
    status,
    createdAt: created.toISOString(),
    dueAt: created.add(source === "Fax" ? 24 : 72, "hour").toISOString(),
    generatedAt: created.add(15, "minute").toISOString(),
    deliveredAt: status === "Sent" ? created.add(15, "minute").add(source === "Letter" ? 120 + (i % 3) * 30 : 2 + (i % 4), "minute").toISOString() : null,
    recipient: source === "Fax" ? `Dr. Office · ${faxNumber}` : `${memberName} (mail)`,
    failureReason: status === "Failed" ? (source === "Fax" ? FAX_FAIL : LETTER_FAIL)[i % 3] : undefined,
    attempts: status === "Failed" ? 3 : 1,
  };
});

type CardKey = "sent" | "failedFax" | "failedLetter";
const CARD_LABELS: Record<CardKey, string> = { sent: "Sent Communication", failedFax: "Failed Fax", failedLetter: "Failed Letters" };
const matchCard = (k: CardKey, r: OutboundItem) =>
  k === "sent" ? r.status === "Sent" : k === "failedFax" ? r.status === "Failed" && r.source === "Fax" : r.status === "Failed" && r.source === "Letter";

const statusColor: Record<OutStatus, string> = { Sent: "green", Failed: "red", Queued: "blue" };
const defaultRange = (): [dayjs.Dayjs, dayjs.Dayjs] => [dayjs().subtract(3, "month").startOf("day"), dayjs().endOf("day")];

export default function OutboundPage() {
  const [range, setRange] = useState(defaultRange);
  const [items, setItems] = useState<OutboundItem[]>(ITEMS);
  const [newOpen, setNewOpen] = useState(false);
  const [prefill, setPrefill] = useState<OutboundPrefill | undefined>();
  const [search, setSearch] = useState("");
  const [card, setCard] = useState<CardKey | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [srcF, setSrcF] = useState<string[]>([]);
  const [carrierF, setCarrierF] = useState<string[]>([]);
  const [statusF, setStatusF] = useState<string[]>([]);
  const activeCount = srcF.length + carrierF.length + statusF.length;

  const base = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      const t = dayjs(r.createdAt);
      if (t.isBefore(range[0]) || t.isAfter(range[1])) return false;
      if (q && !`${r.id} ${r.memberName} ${r.memberId} ${r.drug} ${r.caseId ?? ""} ${r.carrier}`.toLowerCase().includes(q)) return false;
      if (srcF.length && !srcF.includes(r.source)) return false;
      if (carrierF.length && !carrierF.includes(r.carrier)) return false;
      if (statusF.length && !statusF.includes(r.status)) return false;
      return true;
    });
  }, [items, range, search, srcF, carrierF, statusF]);
  const filtered = card ? base.filter((r) => matchCard(card, r)) : base;
  const count = (k: CardKey) => base.filter((r) => matchCard(k, r)).length;
  const viewed = items.find((r) => r.id === viewId) ?? null;

  const tileStyle = (k: CardKey) =>
    card === k ? { borderColor: "#1677ff", boxShadow: "0 0 0 1px #1677ff", background: "#e6f4ff" } : undefined;

  const columns: ColumnsType<OutboundItem> = [
    { title: "ID", dataIndex: "id", width: 100, sorter: (a, b) => a.id.localeCompare(b.id) },
    { title: "Channel", dataIndex: "source", width: 100, render: (v) => <Tag>{v}</Tag>, sorter: (a, b) => a.source.localeCompare(b.source) },
    { title: "Status", dataIndex: "status", width: 100, render: (v: OutStatus) => <Tag color={statusColor[v]}>{v}</Tag>, sorter: (a, b) => a.status.localeCompare(b.status) },
    {
      title: "Member", key: "member", sorter: (a, b) => a.memberName.localeCompare(b.memberName),
      render: (_, r) => (
        <Space direction="vertical" size={0} style={{ whiteSpace: "nowrap" }}>
          <span>{r.memberName}</span>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.memberId}</Text>
        </Space>
      ),
    },
    { title: "Carrier", dataIndex: "carrier", sorter: (a, b) => a.carrier.localeCompare(b.carrier) },
    { title: "Drug", dataIndex: "drug", sorter: (a, b) => a.drug.localeCompare(b.drug) },
    { title: "Template", dataIndex: "templateName", sorter: (a, b) => a.templateName.localeCompare(b.templateName), render: (v) => <span style={{ whiteSpace: "nowrap" }}>{v}</span> },
    { title: "Case ID", dataIndex: "caseId", width: 110, render: (v) => v ?? "—" },
    {
      title: "Due", dataIndex: "dueAt", width: 160, defaultSortOrder: "ascend",
      sorter: (a, b) => dayjs(a.dueAt).valueOf() - dayjs(b.dueAt).valueOf(),
      render: (v) => <span style={{ whiteSpace: "nowrap" }}>{dayjs(v).format("MMM D, h:mm A")}</span>,
    },
    {
      title: "Generated", dataIndex: "generatedAt", width: 160,
      sorter: (a, b) => dayjs(a.generatedAt).valueOf() - dayjs(b.generatedAt).valueOf(),
      render: (v) => <span style={{ whiteSpace: "nowrap" }}>{dayjs(v).format("MMM D, h:mm A")}</span>,
    },
    {
      title: "Delivered", dataIndex: "deliveredAt", width: 160,
      sorter: (a, b) => (a.deliveredAt ? dayjs(a.deliveredAt).valueOf() : 0) - (b.deliveredAt ? dayjs(b.deliveredAt).valueOf() : 0),
      render: (v) => <span style={{ whiteSpace: "nowrap" }}>{v ? dayjs(v).format("MMM D, h:mm A") : "—"}</span>,
    },
  ];

  return (
    <AppLayout>
      <Layout style={{ height: "100vh" }}>
        <Content style={{ overflowY: "auto", background: "#f5f5f5" }}>
          <div style={{ width: "100%", padding: "0 24px" }}>
            <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#f5f5f5", padding: "16px 0 12px", borderBottom: "1px solid #f0f0f0" }}>
              <div style={{ marginBottom: 12 }}>
                <Title level={4} style={{ margin: 0 }}>Outbound Communication</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>Track faxes and letters sent to members and providers</Text>
              </div>
              <Row gutter={[8, 8]} align="middle">
                <Col>
                  <RangePicker value={range} allowClear={false} onChange={(v) => v && v[0] && v[1] && setRange([v[0].startOf("day"), v[1].endOf("day")])} />
                </Col>
                <Col flex="240px">
                  <Input.Search placeholder="Search ID, member, drug…" value={search} onChange={(e) => setSearch(e.target.value)} allowClear />
                </Col>
                <Col>
                  <Popover
                    trigger="click"
                    placement="bottomLeft"
                    content={
                      <div style={{ width: 260, display: "flex", flexDirection: "column", gap: 10 }}>
                        <div><Text type="secondary" style={{ fontSize: 12 }}>Channel</Text>
                          <Select mode="multiple" style={{ width: "100%" }} value={srcF} onChange={setSrcF} options={["Fax", "Letter"].map((v) => ({ label: v, value: v }))} placeholder="Any" /></div>
                        <div><Text type="secondary" style={{ fontSize: 12 }}>Carrier</Text>
                          <Select mode="multiple" style={{ width: "100%" }} value={carrierF} onChange={setCarrierF} options={CARRIERS.map((v) => ({ label: v, value: v }))} placeholder="Any" /></div>
                        <div><Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
                          <Select mode="multiple" style={{ width: "100%" }} value={statusF} onChange={setStatusF} options={["Sent", "Failed", "Queued"].map((v) => ({ label: v, value: v }))} placeholder="Any" /></div>
                      </div>
                    }
                  >
                    <Button icon={<FilterOutlined />}>More Filters{activeCount ? ` (${activeCount})` : ""}</Button>
                  </Popover>
                </Col>
                <Col flex="auto" style={{ textAlign: "right" }}>
                  <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => { setRange(defaultRange()); setSearch(""); setCard(null); setSrcF([]); setCarrierF([]); setStatusF([]); }}>Reset</Button>
                    <Button type="primary" icon={<PlusOutlined />} style={{ background: "#12275e", borderColor: "#12275e" }} onClick={() => { setPrefill(undefined); setNewOpen(true); }}>New</Button>
                  </Space>
                </Col>
              </Row>
              <div style={{ marginTop: 10 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>Showing {filtered.length} communications</Text>
              </div>
              {(card || srcF.length > 0 || carrierF.length > 0 || statusF.length > 0) && (
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {card && <Tag closable onClose={(e) => { e.preventDefault(); setCard(null); }} style={{ background: "#fff" }}>{CARD_LABELS[card]}</Tag>}
                  {srcF.map((v) => <Tag key={v} closable onClose={(e) => { e.preventDefault(); setSrcF(srcF.filter((x) => x !== v)); }} style={{ background: "#fff" }}>Channel: {v}</Tag>)}
                  {carrierF.map((v) => <Tag key={v} closable onClose={(e) => { e.preventDefault(); setCarrierF(carrierF.filter((x) => x !== v)); }} style={{ background: "#fff" }}>Carrier: {v}</Tag>)}
                  {statusF.map((v) => <Tag key={v} closable onClose={(e) => { e.preventDefault(); setStatusF(statusF.filter((x) => x !== v)); }} style={{ background: "#fff" }}>Status: {v}</Tag>)}
                </div>
              )}
            </div>

            <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
              {(Object.keys(CARD_LABELS) as CardKey[]).map((k) => (
                <Col key={k} xs={24} sm={12} md={8} lg={5}>
                  <Card size="small" hoverable onClick={() => setCard(card === k ? null : k)} style={tileStyle(k)}>
                    <Statistic title={CARD_LABELS[k]} value={count(k)} valueStyle={k === "sent" ? { color: "#52c41a" } : { color: "#ff4d4f" }} />
                  </Card>
                </Col>
              ))}
              {[0, 1].map((i) => (
                <Col key={`ph${i}`} xs={24} sm={12} md={8} lg={i === 0 ? 4 : 5}>
                  <Card size="small" style={{ borderStyle: "dashed", background: "#fafafa" }}>
                    <Statistic title="Placeholder" value="—" valueStyle={{ color: "#bfbfbf" }} />
                  </Card>
                </Col>
              ))}
            </Row>

            <Card size="small" style={{ marginTop: 16, marginBottom: 24 }}>
              <Table<OutboundItem>
                rowKey="id"
                columns={columns}
                dataSource={filtered}
                pagination={{ pageSize: 50, showSizeChanger: false }}
                onRow={(r) => ({ onClick: () => setViewId(r.id), style: { cursor: "pointer" } })}
                size="middle"
                scroll={{ x: "max-content" }}
              />
            </Card>
          </div>
        </Content>
      </Layout>
      <Drawer open={!!viewed} onClose={() => setViewId(null)} width={560} title={viewed ? `${viewed.source} ${viewed.id} — ${viewed.memberName}` : null}
        extra={viewed && (
          <Button icon={<RedoOutlined />} type="primary" style={{ background: "#12275e", borderColor: "#12275e" }}
            onClick={() => {
              setPrefill({ memberId: viewed.memberRef, drugId: viewed.drugRef, caseId: viewed.caseId ?? undefined, method: viewed.source, faxNumber: viewed.faxNumber, templateId: viewed.templateId, resend: true });
              setViewId(null); setNewOpen(true);
            }}>Resend</Button>
        )}>
        {viewed && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Status"><Tag color={statusColor[viewed.status]}>{viewed.status}</Tag></Descriptions.Item>
            {viewed.failureReason && <Descriptions.Item label="Failure reason"><Text type="danger">{viewed.failureReason}</Text></Descriptions.Item>}
            <Descriptions.Item label="Channel">{viewed.source}</Descriptions.Item>
            <Descriptions.Item label="Template">{viewed.templateName}</Descriptions.Item>
            <Descriptions.Item label="Recipient">{viewed.recipient}</Descriptions.Item>
            <Descriptions.Item label="Attempts">{viewed.attempts}</Descriptions.Item>
            <Descriptions.Item label="Member">{viewed.memberName} ({viewed.memberId})</Descriptions.Item>
            <Descriptions.Item label="Carrier">{viewed.carrier}</Descriptions.Item>
            <Descriptions.Item label="Drug">{viewed.drug}</Descriptions.Item>
            <Descriptions.Item label="Case ID">{viewed.caseId ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Created">{dayjs(viewed.createdAt).format("MMM D, YYYY h:mm A")}</Descriptions.Item>
            <Descriptions.Item label="Due">{dayjs(viewed.dueAt).format("MMM D, YYYY h:mm A")}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
      <NewOutboundModal
        open={newOpen}
        prefill={prefill}
        onClose={() => setNewOpen(false)}
        onCreate={(d) => {
          const now = dayjs();
          const id = String(100200 + items.length + 100);
          setItems((prev) => [{
            id, source: d.method, memberRef: d.memberId, drugRef: d.drugId, faxNumber: d.faxNumber || undefined, templateId: d.templateId, templateName: d.templateName, memberName: d.memberName, memberId: d.memberNumber.replace(/\D/g, ""),
            carrier: d.carrier, drug: d.drugName, caseId: d.caseId || null, status: "Queued",
            createdAt: now.toISOString(), dueAt: now.add(d.method === "Fax" ? 24 : 72, "hour").toISOString(),
            generatedAt: now.toISOString(), deliveredAt: null,
            recipient: d.method === "Fax" ? `Fax · ${d.faxNumber}` : `${d.memberName} · ${d.address ? [d.address.line1, d.address.line2, `${d.address.city}, ${d.address.state} ${d.address.zip}`].filter(Boolean).join(", ") : "mail"}`, attempts: 0,
          }, ...prev]);
          setNewOpen(false);
          const key = `sent-${id}`;
          message.success({
            key, duration: 10,
            content: (
              <span>
                {d.templateName} queued for {d.method.toLowerCase()} delivery
                <Button type="link" size="small" onClick={() => {
                  message.destroy(key);
                  setItems((prev) => prev.filter((x) => x.id !== id));
                  setPrefill({ memberId: d.memberId, drugId: d.drugId, caseId: d.caseId || undefined, method: d.method, faxNumber: d.faxNumber || undefined, templateId: d.templateId, letter: d.letter, address: d.address ?? undefined, resend: d.resend });
                  setNewOpen(true);
                }}>Undo</Button>
              </span>
            ),
          });
        }}
      />
    </AppLayout>
  );
}
