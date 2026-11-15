import { useState, useEffect } from "react";
import { Modal, Typography, Button, Space } from "antd";
import { FileTextOutlined, CloseOutlined, SendOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useToast } from "@/hooks/use-toast";
import { TemplateLetterSection } from "@/components/letters/TemplateLetterSection";

const { Text } = Typography;

interface MissedCriteria {
  category: string;
  rule: string;
  extractedValue?: string;
}

interface DenialTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDenial: (letter: string) => void;
  memberName: string;
  memberId?: string;
  drugName: string;
  caseNumber: string;
  policyName?: string;
  missedCriteria: MissedCriteria[];
}

export function DenialTemplateModal({
  isOpen,
  onClose,
  onConfirmDenial,
  memberName,
  memberId = "",
  drugName,
  caseNumber,
  policyName,
  missedCriteria,
}: DenialTemplateModalProps) {
  const { toast } = useToast();
  const [templateId, setTemplateId] = useState<string>();
  const [letter, setLetter] = useState("");

  useEffect(() => {
    if (!isOpen) { setTemplateId(undefined); setLetter(""); }
  }, [isOpen]);

  const denialCriteria = missedCriteria
    .map((c) => `• ${c.category}: ${c.rule}${c.extractedValue ? ` (Finding: ${c.extractedValue})` : ""}`)
    .join("\n");

  const handleConfirmAndSend = () => {
    onConfirmDenial(letter);
    toast({ title: "Case Denied", description: "Denial letter is scheduled for the next send run." });
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      width={800}
      title={
        <Space>
          <FileTextOutlined style={{ color: "#ff4d4f", fontSize: 20 }} />
          <span>Denial Letter Template</span>
        </Space>
      }
      footer={
        <div style={{ display: "flex", gap: 12 }}>
          <Button onClick={onClose} icon={<CloseOutlined />} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button type="primary" danger onClick={handleConfirmAndSend} icon={<SendOutlined />} style={{ flex: 1 }}>
            Confirm Denial
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "#fff2f0", border: "1px solid #ffccc7", borderRadius: 8, padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <ExclamationCircleOutlined style={{ color: "#ff4d4f" }} />
            <Text strong style={{ color: "#ff4d4f" }}>Denying Prior Authorization</Text>
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

        {isOpen && (
          <TemplateLetterSection
            trigger="Denied"
            policyName={policyName}
            vars={{ member_name: memberName, member_id: memberId, drug_name: drugName, case_id: caseNumber, policy_name: policyName ?? "", denial_criteria: denialCriteria }}
            templateId={templateId}
            letter={letter}
            onChange={(v) => { setTemplateId(v.templateId); setLetter(v.letter); }}
          />
        )}
      </div>
    </Modal>
  );
}
