import { useState } from "react";
import { Modal, Radio, Input, Typography, Space } from "antd";

const { Text } = Typography;

export const INTAKE_DISMISS_REASONS = [
  { value: "member_not_found", label: "Member not found" },
  { value: "pa_not_needed", label: "PA not needed" },
  { value: "other", label: "Other" },
];

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

export function DismissReasonModal({ open, onCancel, onConfirm }: Props) {
  const [reason, setReason] = useState<string | undefined>();
  const [other, setOther] = useState("");
  const reset = () => { setReason(undefined); setOther(""); };
  const valid = !!reason && (reason !== "other" || other.trim().length > 0);

  return (
    <Modal
      open={open}
      title="Dismiss transaction"
      okText="Dismiss"
      okButtonProps={{ danger: true, disabled: !valid }}
      onCancel={() => { reset(); onCancel(); }}
      onOk={() => {
        const label = reason === "other"
          ? `Other: ${other.trim()}`
          : INTAKE_DISMISS_REASONS.find((r) => r.value === reason)?.label ?? "";
        reset();
        onConfirm(label);
      }}
    >
      <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
        Dismiss reason <Text type="danger">*</Text>
      </Text>
      <Radio.Group value={reason} onChange={(e) => setReason(e.target.value)}>
        <Space direction="vertical">
          {INTAKE_DISMISS_REASONS.map((r) => (
            <Radio key={r.value} value={r.value}>{r.label}</Radio>
          ))}
        </Space>
      </Radio.Group>
      {reason === "other" && (
        <Input.TextArea
          style={{ marginTop: 12, resize: "none" }}
          rows={3}
          maxLength={500}
          placeholder="Describe the reason for dismissing"
          value={other}
          onChange={(e) => setOther(e.target.value)}
          autoFocus
        />
      )}
    </Modal>
  );
}
