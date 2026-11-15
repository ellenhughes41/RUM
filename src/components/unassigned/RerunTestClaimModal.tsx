import { useEffect, useMemo, useState } from "react";
import { Modal, Button, Input, Space, Table, Typography, Tag, DatePicker, Alert, Empty } from "antd";
import { SearchOutlined, PlayCircleOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { mockDrugDirectory, type DrugRecord } from "@/data/mockIntakeCases";
import type { TestClaimOutcome, UnassignedCase } from "@/data/mockUnassignedCases";

const { Text } = Typography;
const ACCENT = "#12275e";

const OUTCOME_LABEL: Record<TestClaimOutcome, string> = {
  pa_required: "Rejected — PA Required",
  non_formulary: "Rejected — Non-Formulary",
  excluded: "Rejected — Excluded",
  step_therapy: "Rejected — Step Therapy",
  quantity_limit: "Rejected — Quantity Limit",
  paid_unexpected: "Paid",
};

const OUTCOME_COLOR: Record<TestClaimOutcome, string> = {
  pa_required: "error",
  non_formulary: "purple",
  excluded: "volcano",
  step_therapy: "geekblue",
  quantity_limit: "gold",
  paid_unexpected: "success",
};

export interface TestClaimRun {
  id: string;
  drug: DrugRecord | undefined;
  quantity: string;
  daySupply: string;
  dateOfService: string;
  outcome: TestClaimOutcome;
  rejectCode?: string;
  rejectReason?: string;
  runAt: string;
}

/** Deterministic mock adjudication so experimentation feels responsive. */
function adjudicate(
  c: UnassignedCase,
  drug: DrugRecord | undefined,
  quantity: string,
  daySupply: string,
): { outcome: TestClaimOutcome; rejectCode?: string; rejectReason?: string } {
  const qty = parseFloat(quantity);
  const limit = parseFloat(c.testClaim.planLimitQuantity ?? "");
  const drugChanged = !!drug && !drug.name.toLowerCase().includes(c.drugName.split(" ")[0].toLowerCase());

  if (!Number.isNaN(qty) && !Number.isNaN(limit) && qty > limit) {
    return { outcome: "quantity_limit", rejectCode: "76", rejectReason: "Plan limitations exceeded" };
  }
  if (!Number.isNaN(qty) && !Number.isNaN(limit) && qty <= limit) {
    return { outcome: "paid_unexpected" };
  }
  if (drugChanged) {
    return { outcome: "non_formulary", rejectCode: "70", rejectReason: "Product not on formulary" };
  }
  const days = parseFloat(daySupply);
  if (!Number.isNaN(days) && days <= 7) {
    return { outcome: "paid_unexpected" };
  }
  return {
    outcome: c.testClaim.outcome === "paid_unexpected" ? "paid_unexpected" : c.testClaim.outcome,
    rejectCode: c.testClaim.rejectCode,
    rejectReason: c.testClaim.rejectReason,
  };
}

interface Props {
  open: boolean;
  onCancel: () => void;
  unassignedCase: UnassignedCase;
  onConfirm: (run: TestClaimRun) => void;
}

export function RerunTestClaimModal({ open, onCancel, unassignedCase: c, onConfirm }: Props) {
  const currentDrug = useMemo(
    () =>
      mockDrugDirectory.find(
        (d) =>
          d.name.toLowerCase().startsWith(c.drugName.split(" ")[0].toLowerCase()) &&
          d.strength === c.drugStrength,
      ) ??
      mockDrugDirectory.find((d) =>
        d.name.toLowerCase().startsWith(c.drugName.split(" ")[0].toLowerCase()),
      ),
    [c.drugName, c.drugStrength],
  );

  const [drug, setDrug] = useState<DrugRecord | undefined>(currentDrug);
  const [quantity, setQuantity] = useState(c.testClaim.requestedQuantity ?? "");
  const [daySupply, setDaySupply] = useState("30");
  const [dos, setDos] = useState<Dayjs>(dayjs());
  const [runs, setRuns] = useState<TestClaimRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // Reset all local experimentation each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setDrug(currentDrug);
    setQuantity(c.testClaim.requestedQuantity ?? "");
    setDaySupply("30");
    setDos(dayjs());
    setRuns([]);
    setSelectedRunId(null);
    setPickerOpen(false);
    setPickerQuery("");
  }, [open, currentDrug, c.testClaim.requestedQuantity]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerSelected, setPickerSelected] = useState<string | undefined>(currentDrug?.id);

  const pickerRows = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return mockDrugDirectory;
    return mockDrugDirectory.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.gpi14 ?? "").includes(q) ||
        d.ndc.includes(q) ||
        d.strength.toLowerCase().includes(q) ||
        d.form.toLowerCase().includes(q),
    );
  }, [pickerQuery]);

  const selectedRun = runs.find((r) => r.id === selectedRunId) ?? null;

  const runClaim = () => {
    const res = adjudicate(c, drug, quantity, daySupply);
    const run: TestClaimRun = {
      id: `run-${Date.now()}`,
      drug,
      quantity,
      daySupply,
      dateOfService: dos.format("YYYY-MM-DD"),
      runAt: dayjs().format("YYYY-MM-DD HH:mm"),
      ...res,
    };
    setRuns((prev) => [run, ...prev]);
    setSelectedRunId(run.id);
  };

  const runSummary = (r: TestClaimRun) =>
    `Qty ${r.quantity || "—"} · ${r.daySupply || "—"} day supply · ${r.drug?.name ?? "—"}`;

  return (
    <>
      <Modal
        open={open}
        onCancel={onCancel}
        width={720}
        title={
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Re-run test claim</div>
            <Text type="secondary" style={{ fontSize: 14, fontWeight: 400 }}>
              {c.memberName} · {c.caseNumber}
            </Text>
          </div>
        }
        footer={
          <Space>
            <Button onClick={onCancel}>Cancel</Button>
            <Button
              type="primary"
              disabled={!selectedRun}
              onClick={() => selectedRun && onConfirm(selectedRun)}
              style={selectedRun ? { background: ACCENT, borderColor: ACCENT } : undefined}
            >
              Confirm and update case
            </Button>
          </Space>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!selectedRun && (
            <Alert
              type="info"
              showIcon
              message="Adjust the fields below and run the test claim. Nothing changes on the case until you confirm."
            />
          )}

          <div>
            <Text strong style={{ fontSize: 14 }}>
              Drug
            </Text>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <Input
                readOnly
                value={
                  drug
                    ? `${drug.name} · ${drug.strength} · ${drug.form} · GPI ${drug.gpi14 ?? "—"}`
                    : ""
                }
                placeholder="No drug selected"
              />
              <Button
                onClick={() => {
                  setPickerSelected(drug?.id);
                  setPickerQuery("");
                  setPickerOpen(true);
                }}
              >
                Change
              </Button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 160px" }}>
              <Text strong style={{ fontSize: 14 }}>
                Quantity
              </Text>
              <Input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 90"
                style={{ marginTop: 4 }}
              />
            </div>
            <div style={{ flex: "1 1 160px" }}>
              <Text strong style={{ fontSize: 14 }}>
                Day supply
              </Text>
              <Input
                value={daySupply}
                onChange={(e) => setDaySupply(e.target.value)}
                placeholder="e.g. 30"
                style={{ marginTop: 4 }}
              />
            </div>
            <div style={{ flex: "1 1 160px" }}>
              <Text strong style={{ fontSize: 14 }}>
                Date of service
              </Text>
              <DatePicker
                value={dos}
                onChange={(v) => v && setDos(v)}
                allowClear={false}
                style={{ marginTop: 4, width: "100%" }}
              />
            </div>
          </div>

          <div>
            <Button icon={<PlayCircleOutlined />} onClick={runClaim}>
              Run test claim
            </Button>
          </div>

          {selectedRun && (
            <Alert
              type={selectedRun.outcome === "paid_unexpected" ? "success" : "warning"}
              showIcon
              message={
                <span>
                  <Tag color={OUTCOME_COLOR[selectedRun.outcome]} style={{ marginRight: 8 }}>
                    {OUTCOME_LABEL[selectedRun.outcome]}
                  </Tag>
                  {selectedRun.rejectCode ? `Reject ${selectedRun.rejectCode} — ` : ""}
                  {selectedRun.rejectReason ?? "Claim paid in test mode"}
                </span>
              }
              description={
                <span style={{ fontSize: 13 }}>
                  {runSummary(selectedRun)} · DOS {selectedRun.dateOfService}
                </span>
              }
            />
          )}

          <div>
            <Text strong style={{ fontSize: 14 }}>
              Runs this session
            </Text>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
              Select the run you want to keep, then confirm.
            </div>
            {runs.length === 0 ? (
              <div
                style={{
                  border: "1px dashed #d0d5dd",
                  borderRadius: 6,
                  background: "#fafafa",
                  padding: "8px 12px",
                }}
              >
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No runs yet"
                  style={{ margin: "8px 0" }}
                />
              </div>
            ) : (
              <div
                style={{
                  border: "1px solid #d0d5dd",
                  borderRadius: 6,
                  maxHeight: 180,
                  overflowY: "auto",
                }}
              >
                {runs.map((r) => {
                  const active = r.id === selectedRunId;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRunId(r.id)}
                      style={{
                        padding: "8px 12px",
                        borderBottom: "1px solid #f0f0f0",
                        cursor: "pointer",
                        background: active ? "#e8edf7" : "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <Text style={{ fontSize: 13 }}>{runSummary(r)}</Text>
                      <Tag color={OUTCOME_COLOR[r.outcome]} style={{ margin: 0 }}>
                        {OUTCOME_LABEL[r.outcome]}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 12, marginLeft: "auto" }}>
                        {r.runAt}
                      </Text>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={pickerOpen}
        onCancel={() => setPickerOpen(false)}
        width={900}
        title={
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Change medication</div>
            <Text type="secondary" style={{ fontSize: 14, fontWeight: 400 }}>
              Current: {drug?.name ?? "—"}
            </Text>
          </div>
        }
        footer={
          <Space>
            <Button onClick={() => setPickerOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              disabled={!pickerSelected}
              onClick={() => {
                const picked = mockDrugDirectory.find((d) => d.id === pickerSelected);
                if (picked) setDrug(picked);
                setPickerOpen(false);
              }}
              style={{ background: ACCENT, borderColor: ACCENT }}
            >
              Confirm selection
            </Button>
          </Space>
        }
      >
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search by GPI-14, drug name, NDC…"
          value={pickerQuery}
          onChange={(e) => setPickerQuery(e.target.value)}
          allowClear
          style={{ marginBottom: 12 }}
        />
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ y: 340 }}
          dataSource={pickerRows}
          rowSelection={{
            type: "radio",
            selectedRowKeys: pickerSelected ? [pickerSelected] : [],
            onChange: (keys) => setPickerSelected(keys[0] as string),
          }}
          onRow={(row) => ({ onClick: () => setPickerSelected(row.id), style: { cursor: "pointer" } })}
          columns={[
            {
              title: "GPI-14",
              dataIndex: "gpi14",
              width: 170,
              render: (v?: string) => (
                <span style={{ fontFamily: "monospace", fontSize: 14 }}>{v ?? "—"}</span>
              ),
            },
            { title: "Drug", dataIndex: "name" },
            { title: "Strength", dataIndex: "strength", width: 140 },
            { title: "Form", dataIndex: "form", width: 150 },
            { title: "Route", dataIndex: "route", width: 130, render: (v?: string) => v ?? "—" },
          ]}
        />
      </Modal>
    </>
  );
}
