import { useState } from "react";
import { Modal, Typography, Input, Button, Checkbox, Space } from "antd";
import { QuestionCircleOutlined, SendOutlined } from "@ant-design/icons";

const { Text } = Typography;
const { TextArea } = Input;

interface RuleOption {
  id: string;
  category: string;
  rule: string;
}

interface RequestInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: RuleOption[];
  onSubmit: (selectedRules: string[], additionalNotes: string) => void;
}

export function RequestInfoModal({ isOpen, onClose, rules, onSubmit }: RequestInfoModalProps) {
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState("");

  const handleToggleRule = (ruleId: string) => {
    setSelectedRules((prev) =>
      prev.includes(ruleId)
        ? prev.filter((id) => id !== ruleId)
        : [...prev, ruleId]
    );
  };

  const handleSubmit = () => {
    onSubmit(selectedRules, additionalNotes);
    setSelectedRules([]);
    setAdditionalNotes("");
    onClose();
  };

  const handleClose = () => {
    setSelectedRules([]);
    setAdditionalNotes("");
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      width={520}
      title={
        <Space>
          <QuestionCircleOutlined style={{ color: "#1677ff", fontSize: 20 }} />
          <span>Request Additional Information</span>
        </Space>
      }
      footer={
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            disabled={selectedRules.length === 0}
            icon={<SendOutlined />}
          >
            Send Request
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <Text strong style={{ fontSize: 13, display: "block", marginBottom: 12 }}>Rules Missing Information</Text>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 256, overflowY: "auto" }}>
            {rules.map((rule) => (
              <div
                key={rule.id}
                onClick={() => handleToggleRule(rule.id)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12, padding: 12,
                  border: `1px solid ${selectedRules.includes(rule.id) ? "#1677ff" : "#f0f0f0"}`,
                  background: selectedRules.includes(rule.id) ? "#e6f4ff" : "transparent",
                  borderRadius: 8, cursor: "pointer", transition: "all 0.2s",
                }}
              >
                <Checkbox checked={selectedRules.includes(rule.id)} style={{ marginTop: 2 }} />
                <div>
                  <Text style={{ fontSize: 12, fontWeight: 500, color: "#1677ff" }}>{rule.category}</Text>
                  <div><Text style={{ fontSize: 13 }}>{rule.rule}</Text></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>Additional Notes (Optional)</Text>
          <TextArea
            placeholder="Add any specific details about what information is needed..."
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            rows={3}
            style={{ resize: "none" }}
          />
        </div>
      </div>
    </Modal>
  );
}
