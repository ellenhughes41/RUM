import { useState } from "react";
import { Modal, Typography, Input, Button, Radio, Space } from "antd";
import { WarningOutlined, SendOutlined, UserOutlined, MedicineBoxOutlined, FileExclamationOutlined } from "@ant-design/icons";

const { Text } = Typography;
const { TextArea } = Input;

interface TechReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (issueType: string, note: string) => void;
  memberName: string;
  caseNumber: string;
}

const issueTypes = [
  { id: "incorrect-member", label: "Incorrect Member Connection", description: "Case linked to wrong member or member data mismatch", icon: <UserOutlined /> },
  { id: "wrong-drug", label: "Wrong Drug", description: "Incorrect drug assigned or drug information error", icon: <MedicineBoxOutlined /> },
  { id: "manual-error", label: "Manual/Document Error", description: "OCR issues, missing pages, illegible documents, or data entry errors", icon: <FileExclamationOutlined /> },
];

export function TechReviewModal({
  isOpen,
  onClose,
  onSubmit,
  memberName,
  caseNumber,
}: TechReviewModalProps) {
  const [selectedIssue, setSelectedIssue] = useState<string>("");
  const [note, setNote] = useState("");

  const handleSubmit = () => {
    if (!selectedIssue) return;
    onSubmit(selectedIssue, note);
    setSelectedIssue("");
    setNote("");
    onClose();
  };

  const handleClose = () => {
    setSelectedIssue("");
    setNote("");
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      width={520}
      title={
        <Space>
          <WarningOutlined style={{ color: "#d48806", fontSize: 20 }} />
          <span>Send to Tech Review</span>
        </Space>
      }
      footer={
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            disabled={!selectedIssue}
            icon={<SendOutlined />}
            style={{ background: "#d48806", borderColor: "#d48806" }}
          >
            Send to Tech Review
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "#fafafa", borderRadius: 8, padding: 12 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Case <Text strong style={{ fontFamily: "monospace" }}>{caseNumber}</Text> for{" "}
            <Text strong>{memberName}</Text> will be sent back to the tech team for correction.
          </Text>
        </div>

        <div>
          <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>Select Issue Type</Text>
          <Radio.Group
            value={selectedIssue}
            onChange={(e) => setSelectedIssue(e.target.value)}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            {issueTypes.map((issue) => (
              <div
                key={issue.id}
                onClick={() => setSelectedIssue(issue.id)}
                style={{
                  border: `1px solid ${selectedIssue === issue.id ? "#d48806" : "#f0f0f0"}`,
                  background: selectedIssue === issue.id ? "#fffbe6" : "transparent",
                  borderRadius: 8, padding: 12, cursor: "pointer", transition: "all 0.2s",
                }}
              >
                <Radio value={issue.id}>
                  <Space>
                    <span style={{ color: "#8c8c8c" }}>{issue.icon}</span>
                    <Text strong style={{ fontSize: 13 }}>{issue.label}</Text>
                  </Space>
                </Radio>
                <div style={{ marginLeft: 24, marginTop: 2 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{issue.description}</Text>
                </div>
              </div>
            ))}
          </Radio.Group>
        </div>

        <div>
          <Text strong style={{ fontSize: 13 }}>
            Note for Tech Team <Text type="secondary" style={{ fontWeight: 400 }}>(optional)</Text>
          </Text>
          <TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe the issue in detail so the tech team can resolve it..."
            rows={4}
            style={{ marginTop: 8, resize: "none" }}
          />
        </div>
      </div>
    </Modal>
  );
}
