import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Layout, Typography, Button, Input, Table, Tag, Select, DatePicker, Space, Dropdown, Modal, message, Tooltip, Popover } from "antd";
import { PlusOutlined, SearchOutlined, MoreOutlined, FilterOutlined, ReloadOutlined, CloseOutlined } from "@ant-design/icons";
import { Alert } from "antd";
import { AppLayout } from "@/components/layout/AppLayout";
import { format } from "date-fns";
import dayjs, { Dayjs } from "dayjs";
import type { ColumnsType } from "antd/es/table";
import {
  triggersMissingAllPolicies,
  useLetterTemplates,
  deriveStatus,
  duplicateTemplate,
  terminateTemplate,
  type LetterTemplate,
  type LetterTrigger,
  type TemplateStatus,
} from "@/hooks/use-letter-templates";
import { TemplateHistoryModal } from "@/components/letter-templates/TemplateHistoryModal";

const { Content } = Layout;
const { Title, Text } = Typography;

const triggerColor: Record<LetterTrigger, string> = {
  "Denied": "red",
  "RFI Requested": "gold",
  "Closed – RFI Expired": "default",
  "Cold Outreach": "blue",
  "Dismissed as Unnecessary": "purple",
};

const statusColor: Record<TemplateStatus, string> = {
  Active: "green",
  Draft: "blue",
  Inactive: "default",
};

export default function LetterTemplatesPage() {
  const navigate = useNavigate();
  const { templates } = useLetterTemplates();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | "all">("all");
  const [triggerFilter, setTriggerFilter] = useState<LetterTrigger[]>([]);
  const [effectiveFrom, setEffectiveFrom] = useState<Dayjs | null>(null);
  const [historyFor, setHistoryFor] = useState<LetterTemplate | null>(null);
  const [terminateFor, setTerminateFor] = useState<LetterTemplate | null>(null);
  const [terminateDate, setTerminateDate] = useState<Dayjs | null>(null);
  const [terminateError, setTerminateError] = useState<string | null>(null);

  const missingTriggers = useMemo(() => triggersMissingAllPolicies(), [templates]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilter !== "all" && deriveStatus(t) !== statusFilter) return false;
      if (triggerFilter.length && !triggerFilter.includes(t.trigger)) return false;
      if (effectiveFrom && dayjs(t.effectiveDate).isBefore(effectiveFrom, "day")) return false;
      return true;
    });
  }, [templates, searchQuery, statusFilter, triggerFilter, effectiveFrom]);

  const moreFilterCount = triggerFilter.length + (effectiveFrom ? 1 : 0);

  const chips: Array<{ key: string; label: string; onClose: () => void }> = [
    ...triggerFilter.map((t) => ({
      key: `trigger:${t}`,
      label: `Trigger: ${t}`,
      onClose: () => setTriggerFilter(triggerFilter.filter((x) => x !== t)),
    })),
    ...(effectiveFrom
      ? [{
          key: "effectiveFrom",
          label: `Effective on/after: ${effectiveFrom.format("MMM D, YYYY")}`,
          onClose: () => setEffectiveFrom(null),
        }]
      : []),
  ];

  const handleDuplicate = (t: LetterTemplate) => {
    const copy = duplicateTemplate(t.id);
    if (copy) {
      message.success("Duplicate created as a draft");
      navigate(`/letter-templates/${copy.id}`);
    }
  };

  const columns: ColumnsType<LetterTemplate> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record) => (
        <a
          style={{ fontWeight: 600, color: "rgba(0,0,0,0.88)" }}
          onClick={() => navigate(`/letter-templates/${record.id}`)}
        >
          {name}
        </a>
      ),
    },
    {
      title: "Trigger",
      dataIndex: "trigger",
      key: "trigger",
      width: 190,
      render: (trigger: LetterTrigger) => <Tag color={triggerColor[trigger]}>{trigger}</Tag>,
    },
    {
      title: "Channel",
      dataIndex: "channel",
      key: "channel",
      width: 100,
      sorter: (a: any, b: any) => (a.channel ?? "All").localeCompare(b.channel ?? "All"),
      render: (c?: string) => <Tag>{c ?? "All"}</Tag>,
    },
    {
      title: "Policy",
      dataIndex: "policy",
      key: "policy",
      sorter: (a, b) => a.policy.localeCompare(b.policy),
    },
    {
      title: "Status",
      key: "status",
      width: 110,
      sorter: (a, b) => deriveStatus(a).localeCompare(deriveStatus(b)),
      render: (_: unknown, record) => {
        const status = deriveStatus(record);
        return <Tag color={statusColor[status]}>{status}</Tag>;
      },
    },
    {
      title: "Effective Date",
      dataIndex: "effectiveDate",
      key: "effectiveDate",
      width: 150,
      sorter: (a, b) => a.effectiveDate.localeCompare(b.effectiveDate),
      render: (date: string) => (date ? format(new Date(date), "MMM d, yyyy") : "—"),
    },
    {
      title: "Termination Date",
      dataIndex: "terminationDate",
      key: "terminationDate",
      width: 160,
      render: (date?: string) => (date ? format(new Date(date), "MMM d, yyyy") : "—"),
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: (_: unknown, record) => {
        const published = record.published;
        return (
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                {
                  key: "edit",
                  label: published ? (
                    <Tooltip title="Published templates are edited via Duplicate">
                      <span>Edit</span>
                    </Tooltip>
                  ) : (
                    "Edit"
                  ),
                  onClick: () => navigate(`/letter-templates/${record.id}`),
                },
                { key: "duplicate", label: "Duplicate", onClick: () => handleDuplicate(record) },
                {
                  key: "terminate",
                  label: "Terminate",
                  disabled: !published,
                  onClick: () => {
                    setTerminateFor(record);
                    setTerminateDate(record.terminationDate ? dayjs(record.terminationDate) : dayjs());
                  },
                },
                { key: "history", label: "View History", onClick: () => setHistoryFor(record) },
              ],
            }}
          >
            <Button type="text" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <AppLayout>
      <Layout style={{ height: "100vh" }}>
        <Content style={{ overflowY: "auto", padding: 24 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <Title level={4} style={{ margin: 0 }}>Letter Templates</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Browse and manage member and provider letter templates
                </Text>
              </div>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/letter-templates/new")}>New Template</Button>
            </div>


            <Space wrap style={{ marginBottom: 12, width: "100%" }}>
              <Input
                placeholder="Search templates by name..."
                prefix={<SearchOutlined />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: 320 }}
                allowClear
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 160 }}
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "Draft", label: "Draft" },
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                ]}
              />
              <Popover
                trigger="click"
                placement="bottomLeft"
                content={
                  <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Trigger</Text>
                      <Select
                        mode="multiple"
                        allowClear
                        placeholder="Trigger"
                        value={triggerFilter}
                        onChange={setTriggerFilter}
                        style={{ width: "100%", marginTop: 4 }}
                        maxTagCount="responsive"
                        options={[
                          { value: "Denied", label: "Denied" },
                          { value: "RFI Requested", label: "RFI Requested" },
                          { value: "Closed – RFI Expired", label: "Closed – RFI Expired" },
                          { value: "Cold Outreach", label: "Cold Outreach" },
                    { value: "Dismissed as Unnecessary", label: "Dismissed as Unnecessary" },
                        ]}
                      />
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Effective on or after</Text>
                      <DatePicker
                        placeholder="Effective on or after"
                        value={effectiveFrom}
                        onChange={setEffectiveFrom}
                        style={{ width: "100%", marginTop: 4 }}
                      />
                    </div>
                  </div>
                }
              >
                <Button icon={<FilterOutlined />}>
                  More Filters
                  {moreFilterCount > 0 && (
                    <Tag color="blue" style={{ marginLeft: 6, marginRight: 0 }}>{moreFilterCount}</Tag>
                  )}
                </Button>
              </Popover>
              {chips.length > 0 && (
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    setTriggerFilter([]);
                    setEffectiveFrom(null);
                  }}
                >
                  Reset
                </Button>
              )}
            </Space>

            {chips.length > 0 && (
              <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
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

            <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
              {filtered.length} {filtered.length === 1 ? "template" : "templates"} found
            </Text>

            <Table
              columns={columns}
              dataSource={filtered}
              rowKey="id"
              size="middle"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ["5", "10", "20", "50"],
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
              }}
              onRow={() => ({ style: { cursor: "pointer" } })}
              locale={{ emptyText: "No letter templates match your filters." }}
            />
          </div>
        </Content>
      </Layout>

      <TemplateHistoryModal open={!!historyFor} template={historyFor} onClose={() => setHistoryFor(null)} />

      <Modal
        open={!!terminateFor}
        title={`Terminate "${terminateFor?.name ?? ""}"`}
        okText="Set termination date"
        okButtonProps={{ disabled: !terminateDate }}
        onCancel={() => {
          setTerminateFor(null);
          setTerminateError(null);
        }}
        onOk={() => {
          if (terminateFor && terminateDate) {
            const result = terminateTemplate(terminateFor.id, terminateDate.format("YYYY-MM-DD"));
            if (!result.ok) {
              setTerminateError(result.error ?? "Unable to terminate this template.");
              return;
            }
            message.success("Termination date set");
          }
          setTerminateFor(null);
          setTerminateError(null);
        }}
      >
        {terminateError && (
          <Alert type="error" showIcon style={{ marginBottom: 12 }} message="Cannot terminate" description={terminateError} />
        )}
        <Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 13 }}>
          Templates are never deleted. Setting a termination date ends the template's active window on that day
          (inclusive).
        </Text>
        <DatePicker value={terminateDate} onChange={setTerminateDate} style={{ width: "100%" }} />
      </Modal>
    </AppLayout>
  );
}
