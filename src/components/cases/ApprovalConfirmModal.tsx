import { useEffect, useState } from "react";
import { Modal, Typography, DatePicker, Input, Button, Space, Checkbox } from "antd";
import { CheckCircleOutlined, CheckOutlined, FileTextOutlined, ClockCircleOutlined, FormOutlined } from "@ant-design/icons";
import { useToast } from "@/hooks/use-toast";
import dayjs, { Dayjs } from "dayjs";

const { Text, Title } = Typography;
const { TextArea } = Input;

interface MetCriteria {
  category: string;
  rule: string;
  extractedValue?: string;
}

interface ApprovalConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmApproval: (details: {
    note?: string;
    effectiveDate: string;
    terminationDate: string;
    approvalTypes?: ApprovalType[];
    quantity?: string;
    daysSupply?: string;
  }) => void;
  memberName: string;
  drugName: string;
  caseNumber: string;
  metCriteria: MetCriteria[];
  maxMonths?: number;
  quantity?: string;
  daysSupply?: string;
}

export type ApprovalType = "PA" | "ST" | "QL";

export function ApprovalConfirmModal({
  isOpen,
  onClose,
  onConfirmApproval,
  memberName,
  drugName,
  caseNumber,
  metCriteria,
  maxMonths,
  quantity = "",
  daysSupply = "",
}: ApprovalConfirmModalProps) {
  const [approvalTypes, setApprovalTypes] = useState<ApprovalType[]>(["PA"]);
  const [qlQty, setQlQty] = useState(quantity);
  const [qlDays, setQlDays] = useState(daysSupply);
  useEffect(() => {
    if (isOpen) { setQlQty(quantity); setQlDays(daysSupply); }
  }, [isOpen, quantity, daysSupply]);
  const { toast } = useToast();
  const [additionalNote, setAdditionalNote] = useState("");
  const [effectiveDate, setEffectiveDate] = useState<Dayjs | null>(dayjs());
  const [terminationDate, setTerminationDate] = useState<Dayjs | null>(dayjs().add(12, "month"));

  const handleConfirmApproval = () => {
    onConfirmApproval({
      note: additionalNote.trim() || undefined,
      effectiveDate: (effectiveDate ?? dayjs()).toISOString(),
      terminationDate: (terminationDate ?? dayjs().add(12, "month")).toISOString(),
      approvalTypes,
      quantity: approvalTypes.includes("QL") ? qlQty : undefined,
      daysSupply: approvalTypes.includes("QL") ? qlDays : undefined,
    });
    toast({
      title: "Case Approved",
      description: "Prior authorization has been approved successfully.",
    });
    setAdditionalNote("");
    setEffectiveDate(dayjs());
    setTerminationDate(dayjs().add(12, "month"));
    setApprovalTypes(["PA"]);
    onClose();
  };

  const handleClose = () => {
    setAdditionalNote("");
    setEffectiveDate(dayjs());
    setTerminationDate(dayjs().add(12, "month"));
    setApprovalTypes(["PA"]);
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      width={640}
      title={
        <Space>
          <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 20 }} />
          <span>Confirm Approval</span>
        </Space>
      }
      footer={
        <div style={{ display: "flex", gap: 12 }}>
          <Button onClick={handleClose} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button
            type="primary"
            onClick={handleConfirmApproval}
            style={{ flex: 1, background: "#52c41a", borderColor: "#52c41a" }}
            icon={<CheckOutlined />}
          >
            Confirm Approval
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Case Info Banner */}
        <div style={{ background: "#f6ffed", border: "1px solid #b7eb8f", borderRadius: 8, padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <CheckOutlined style={{ color: "#52c41a" }} />
            <Text strong style={{ color: "#52c41a" }}>Approving Prior Authorization</Text>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <Text type="secondary" style={{ fontSize: 13 }}>Member:</Text>
              <div><Text strong>{memberName}</Text></div>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 13 }}>Medication:</Text>
              <div><Text strong>{drugName}</Text></div>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 13 }}>Case #:</Text>
              <div><Text strong style={{ fontFamily: "monospace" }}>{caseNumber}</Text></div>
            </div>
          </div>
        </div>

        {/* Approval Type */}
        <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderBottom: "1px solid #f0f0f0" }}>
            <CheckCircleOutlined style={{ color: "#8c8c8c" }} />
            <Text strong style={{ fontSize: 13 }}>Approval type</Text>
          </div>
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            <Checkbox.Group
              value={approvalTypes}
              onChange={(v) => setApprovalTypes(v as ApprovalType[])}
              options={[{ label: "PA", value: "PA" }, { label: "ST", value: "ST" }, { label: "QL", value: "QL" }]}
            />
            {approvalTypes.includes("QL") && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Quantity:</Text>
                <Input value={qlQty} onChange={(e) => setQlQty(e.target.value)} style={{ width: 100 }} />
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>Days supply:</Text>
                <Input value={qlDays} onChange={(e) => setQlDays(e.target.value)} style={{ width: 100 }} />
              </div>
            )}
          </div>
        </div>

        {/* Criteria Met Summary */}
        <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderBottom: "1px solid #f0f0f0" }}>
            <FileTextOutlined style={{ color: "#8c8c8c" }} />
            <Text strong style={{ fontSize: 13 }}>Criteria Met ({metCriteria.length})</Text>
          </div>
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto" }}>
            {metCriteria.map((criteria, index) => (
              <div
                key={index}
                style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "#f6ffed", border: "1px solid #b7eb8f", borderRadius: 6, padding: 8 }}
              >
                <CheckOutlined style={{ color: "#52c41a", marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 12, fontWeight: 500, color: "#52c41a" }}>{criteria.category}</Text>
                  <div><Text style={{ fontSize: 12 }}>{criteria.rule}</Text></div>
                  {criteria.extractedValue && (
                    <Text type="secondary" style={{ fontSize: 12, fontStyle: "italic" }}>
                      "{criteria.extractedValue}"
                    </Text>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Authorization Length */}
        <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderBottom: "1px solid #f0f0f0" }}>
            <ClockCircleOutlined style={{ color: "#8c8c8c" }} />
            <Text strong style={{ fontSize: 13 }}>Authorization Length</Text>
          </div>
          <div style={{ padding: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Effective:</Text>
            <DatePicker
              value={effectiveDate}
              onChange={(d) => setEffectiveDate(d)}
              style={{ width: 150 }}
            />
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>Termination:</Text>
            <DatePicker
              value={terminationDate}
              onChange={(d) => setTerminationDate(d)}
              style={{ width: 150 }}
            />
            <Text type="secondary" style={{ marginLeft: "auto" }}>
              max: {typeof maxMonths === "number" ? `${maxMonths} months` : "Indefinite"}
            </Text>
          </div>
        </div>

        {/* Additional Chart Note */}
        <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderBottom: "1px solid #f0f0f0" }}>
            <FormOutlined style={{ color: "#8c8c8c" }} />
            <Text strong style={{ fontSize: 13 }}>
              Additional Chart Note <Text type="secondary" style={{ fontWeight: 400 }}>(Optional)</Text>
            </Text>
          </div>
          <div style={{ padding: 12 }}>
            <TextArea
              value={additionalNote}
              onChange={(e) => setAdditionalNote(e.target.value)}
              placeholder="Add any additional notes to be included with this approval..."
              rows={3}
              style={{ resize: "none" }}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
