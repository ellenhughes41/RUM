import { useState, useEffect } from "react";
import { Modal, Typography, Input, Button, Radio, Space } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, FileExclamationOutlined } from "@ant-design/icons";

const { Text } = Typography;
const { TextArea } = Input;

type FixOption = "pass-corrected" | "fail-corrected" | "not-documented" | "clinical-judgment";

interface FixOption_UI {
  value: FixOption;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  iconColor: string;
  needsText?: boolean;
  textLabel?: string;
  textPlaceholder?: string;
}

const passOptions: FixOption_UI[] = [
  { value: "fail-corrected", label: "Fail criteria", subtitle: "The criteria should fail instead of pass", icon: <CloseCircleOutlined />, iconColor: "#ff4d4f" },
  { value: "not-documented", label: "The criteria is missing from the chart note", subtitle: "Request documentation from provider", icon: <FileExclamationOutlined />, iconColor: "#8c8c8c" },
];

const failOptions: FixOption_UI[] = [
  { value: "pass-corrected", label: "Pass criteria", subtitle: "The criteria should pass instead of fail", icon: <CheckCircleOutlined />, iconColor: "#52c41a" },
  { value: "not-documented", label: "The criteria is missing from the chart note", subtitle: "Request documentation from provider", icon: <FileExclamationOutlined />, iconColor: "#8c8c8c" },
];

const missingOptions: FixOption_UI[] = [
  { value: "pass-corrected", label: "Pass criteria and add note", subtitle: "The criteria should pass, add the data from the chart note", icon: <CheckCircleOutlined />, iconColor: "#52c41a" },
  { value: "fail-corrected", label: "Fail criteria and add note", subtitle: "The criteria should fail, add the data from the chart note", icon: <CloseCircleOutlined />, iconColor: "#ff4d4f" },
];

interface FixCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  criteriaName: string;
  currentStatus: "Pass" | "Fail" | "Missing";
  onApplyFix: (option: FixOption, text?: string) => void;
  currentExtractedValue?: string;
}

export function FixCriteriaModal({ isOpen, onClose, criteriaName, currentStatus, onApplyFix, currentExtractedValue }: FixCriteriaModalProps) {
  const [selected, setSelected] = useState<FixOption | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSelected(null);
      setText("");
    }
  }, [isOpen]);

  const options = currentStatus === "Pass" ? passOptions : currentStatus === "Fail" ? failOptions : missingOptions;
  const selectedOption = options.find(o => o.value === selected);
  const showText = selectedOption?.needsText;
  const isOptionalText = selected === "clinical-judgment";
  const isValid = selected
    ? showText && !isOptionalText ? text.trim().length > 0 : true
    : false;

  const statusColor = currentStatus === "Pass" ? "#52c41a" : currentStatus === "Fail" ? "#ff4d4f" : "#8c8c8c";

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      width={480}
      title={`${currentStatus} Criteria: ${criteriaName}`}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="primary"
            disabled={!isValid}
            onClick={() => {
              if (selected) {
                onApplyFix(selected, text.trim() || undefined);
                onClose();
              }
            }}
          >
            Apply Fix
          </Button>
        </div>
      }
    >
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Currently: <Text strong style={{ color: statusColor }}>{currentStatus}</Text>
        </Text>
      </div>

      <Radio.Group
        value={selected}
        onChange={(e) => { setSelected(e.target.value); setText(""); }}
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        {options.map((option) => (
          <div
            key={option.value}
            onClick={() => { setSelected(option.value); setText(""); }}
            style={{
              border: `1px solid ${selected === option.value ? "#1677ff" : "#f0f0f0"}`,
              background: selected === option.value ? "#e6f4ff" : "transparent",
              borderRadius: 8, padding: 14, cursor: "pointer", transition: "all 0.2s",
            }}
          >
            <Radio value={option.value}>
              <Space>
                <span style={{ color: option.iconColor }}>{option.icon}</span>
                <Text strong style={{ fontSize: 13 }}>{option.label}</Text>
              </Space>
            </Radio>
            <div style={{ marginLeft: 24, marginTop: 2 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{option.subtitle}</Text>
            </div>
          </div>
        ))}
      </Radio.Group>

      {showText && (
        <div style={{ marginTop: 16 }}>
          <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
            {selectedOption?.textLabel}
            {isOptionalText && <Text type="secondary" style={{ fontWeight: 400, marginLeft: 4 }}>(Optional)</Text>}
          </Text>
          <TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={selectedOption?.textPlaceholder}
            rows={3}
            style={{ resize: "none" }}
            autoFocus
          />
        </div>
      )}
    </Modal>
  );
}
