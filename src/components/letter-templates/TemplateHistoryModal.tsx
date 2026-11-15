import { useMemo, useState } from "react";
import { Modal, Table, Tag, Typography, Button, Space, Empty } from "antd";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import { deriveStatus, getLineage, type LetterTemplate } from "@/hooks/use-letter-templates";

const { Text } = Typography;

const statusColor: Record<string, string> = { Active: "green", Draft: "blue", Inactive: "default" };

function stripHtml(html: string) {
  const div = document.createElement("div");
  div.innerHTML = html.replace(/<\/p>|<br\s*\/?>/gi, "\n");
  return (div.textContent || "").trim();
}

export function TemplateHistoryModal({
  open,
  template,
  onClose,
}: {
  open: boolean;
  template: LetterTemplate | null;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);

  const entries = useMemo(() => (template ? getLineage(template) : []), [template, open]);
  const [a, b] = useMemo(
    () => selected.map((id) => entries.find((e) => e.id === id)).filter(Boolean) as LetterTemplate[],
    [selected, entries],
  );

  const columns: ColumnsType<LetterTemplate> = [
    { title: "Name", dataIndex: "name", key: "name", render: (n: string) => <Text strong>{n}</Text> },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_, r) => {
        const s = deriveStatus(r);
        return <Tag color={statusColor[s]}>{s}</Tag>;
      },
    },
    {
      title: "Effective",
      dataIndex: "effectiveDate",
      key: "eff",
      width: 140,
      render: (d: string) => dayjs(d).format("MMM D, YYYY"),
    },
    {
      title: "Termination",
      dataIndex: "terminationDate",
      key: "term",
      width: 150,
      render: (d?: string) => (d ? dayjs(d).format("MMM D, YYYY") : "—"),
    },
  ];

  const close = () => {
    setSelected([]);
    setComparing(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={close}
      title={template ? `History — ${template.trigger} · ${template.policy}` : "History"}
      width={900}
      footer={
        <Space>
          {comparing && <Button onClick={() => setComparing(false)}>Back to history</Button>}
          <Button type="primary" onClick={close}>
            Close
          </Button>
        </Space>
      }
    >
      {!comparing ? (
        <>
          <Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 13 }}>
            Read-only predecessor chain. Select two entries to compare.
          </Text>
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            columns={columns}
            dataSource={entries}
            rowSelection={{
              selectedRowKeys: selected,
              onChange: (keys) => setSelected(keys.slice(-2).map(String)),
            }}
            locale={{ emptyText: <Empty description="No history" /> }}
          />
          <div style={{ marginTop: 12, textAlign: "right" }}>
            <Button disabled={selected.length !== 2} onClick={() => setComparing(true)}>
              Compare selected
            </Button>
          </div>
        </>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[a, b].map((t, i) => (
            <div key={t.id} style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 12 }}>
              <Text strong style={{ display: "block", marginBottom: 4 }}>
                {t.name}
              </Text>
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
                {dayjs(t.effectiveDate).format("MMM D, YYYY")} –{" "}
                {t.terminationDate ? dayjs(t.terminationDate).format("MMM D, YYYY") : "open-ended"}
              </Text>
              <DiffBody text={stripHtml(t.body)} other={stripHtml((i === 0 ? b : a).body)} />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function DiffBody({ text, other }: { text: string; other: string }) {
  const otherLines = new Set(other.split("\n").map((l) => l.trim()));
  return (
    <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
      {text.split("\n").map((line, i) => {
        const changed = line.trim() && !otherLines.has(line.trim());
        return (
          <div
            key={i}
            style={{
              background: changed ? "#fffbe6" : undefined,
              borderLeft: changed ? "3px solid #faad14" : "3px solid transparent",
              paddingLeft: 6,
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
}
