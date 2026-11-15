import { useState } from "react";
import { Modal, Typography, Input, Button, Radio, Space } from "antd";
import {
  QuestionCircleOutlined,
  MessageOutlined,
  ReloadOutlined,
  UserOutlined,
  MedicineBoxOutlined,
  FileExclamationOutlined,
  NumberOutlined,
  QuestionOutlined,
  ArrowLeftOutlined,
  SendOutlined,
  CloseOutlined,
  CopyOutlined,
  EditOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { TemplateLetterSection } from "@/components/letters/TemplateLetterSection";

const { Text } = Typography;
const { TextArea } = Input;

interface RuleOption {
  id: string;
  category: string;
  rule: string;
}

type RequestType = "provider" | "tech-review" | null;
type TechIssueType = "incorrect-member" | "wrong-drug" | "manual-error" | "quantity-limit" | "other";

interface RequestInformationModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: RuleOption[];
  onSubmitProviderRequest: (selectedRules: string[], letterContent: string) => void;
  onSubmitTechReview: (issueType: string, note: string) => void;
  memberName: string;
  caseNumber: string;
  drugName: string;
  memberId?: string;
  policyName?: string;
}

const techIssueTypes: { id: TechIssueType; label: string; description: string; icon: React.ReactNode }[] = [
  { id: "incorrect-member", label: "Incorrect Member Connection", description: "Case linked to wrong member or member data mismatch", icon: <UserOutlined /> },
  { id: "wrong-drug", label: "Wrong Drug", description: "Incorrect drug assigned or drug information error", icon: <MedicineBoxOutlined /> },
  { id: "manual-error", label: "Manual/Document Error", description: "OCR issues, missing pages, illegible documents, or data entry errors", icon: <FileExclamationOutlined /> },
  { id: "quantity-limit", label: "Quantity Limit", description: "Quantity limit issue or quantity mismatch on the case", icon: <NumberOutlined /> },
  { id: "other", label: "Other", description: "Other issue not listed above", icon: <QuestionOutlined /> },
];

export function RequestInformationModal({
  isOpen,
  onClose,
  rules,
  onSubmitProviderRequest,
  onSubmitTechReview,
  memberName,
  caseNumber,
  drugName,
  memberId = "",
  policyName,
}: RequestInformationModalProps) {
  const [requestType, setRequestType] = useState<RequestType>(null);
  const [templateId, setTemplateId] = useState<string>();
  const [editedContent, setEditedContent] = useState("");
  const [selectedTechIssue, setSelectedTechIssue] = useState<TechIssueType | "">("");
  const [techNote, setTechNote] = useState("");

  const handleClose = () => {
    setRequestType(null);
    setEditedContent("");
    setTemplateId(undefined);
    setSelectedTechIssue("");
    setTechNote("");
    onClose();
  };

  const handleBack = () => setRequestType(null);

  const handleSubmitProvider = () => {
    onSubmitProviderRequest(rules.map(r => r.id), editedContent);
    handleClose();
  };

  const handleSubmitTech = () => {
    if (!selectedTechIssue) return;
    onSubmitTechReview(selectedTechIssue, techNote);
    handleClose();
  };

  const getTitle = () => {
    if (requestType === null) return "Request Information";
    if (requestType === "provider") return "Request from Provider";
    return "Send to Tech Review";
  };

  const getFooter = () => {
    if (requestType === null) return null;
    if (requestType === "provider") {
      return (
        <div style={{ display: "flex", gap: 12 }}>
          <Button onClick={handleClose} icon={<CloseOutlined />} style={{ flex: 1 }}>Cancel</Button>
          <Button type="primary" onClick={handleSubmitProvider} icon={<SendOutlined />} style={{ flex: 1 }}>Send Request</Button>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          type="primary"
          onClick={handleSubmitTech}
          disabled={!selectedTechIssue}
          icon={<SendOutlined />}
          style={{ background: "#d48806", borderColor: "#d48806" }}
        >
          Send to Tech Review
        </Button>
      </div>
    );
  };

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      width={640}
      title={
        <Space>
          {requestType && (
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={handleBack} size="small" />
          )}
          <QuestionCircleOutlined style={{ color: "#1677ff", fontSize: 20 }} />
          <span>{getTitle()}</span>
        </Space>
      }
      footer={getFooter()}
    >
      {/* Selection Screen */}
      {requestType === null && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            onClick={() => setRequestType("provider")}
            style={{
              display: "flex", alignItems: "flex-start", gap: 16, padding: 16,
              border: "1px solid #f0f0f0", borderRadius: 8, cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1677ff"; e.currentTarget.style.background = "#fafafa"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#f0f0f0"; e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 8, background: "#e6f4ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <MessageOutlined style={{ fontSize: 20, color: "#1677ff" }} />
            </div>
            <div>
              <Text strong>Request from Provider</Text>
              <div><Text type="secondary" style={{ fontSize: 13 }}>Request additional clinical documentation or clarification from the prescribing provider</Text></div>
            </div>
          </div>

          <div
            onClick={() => setRequestType("tech-review")}
            style={{
              display: "flex", alignItems: "flex-start", gap: 16, padding: 16,
              border: "1px solid #f0f0f0", borderRadius: 8, cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#d48806"; e.currentTarget.style.background = "#fafafa"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#f0f0f0"; e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 8, background: "#fffbe6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ReloadOutlined style={{ fontSize: 20, color: "#d48806" }} />
            </div>
            <div>
              <Text strong>Send to Tech Review</Text>
              <div><Text type="secondary" style={{ fontSize: 13 }}>Flag incorrect member connections, wrong drugs, or manual/document errors</Text></div>
            </div>
          </div>
        </div>
      )}

      {/* Provider Request Screen */}
      {requestType === "provider" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#e6f4ff", border: "1px solid #91caff", borderRadius: 8, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <ExclamationCircleOutlined style={{ color: "#1677ff" }} />
              <Text strong style={{ color: "#1677ff" }}>Requesting Additional Information</Text>
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

          <TemplateLetterSection
            trigger="RFI Requested"
            policyName={policyName}
            vars={{ member_name: memberName, member_id: memberId, drug_name: drugName, case_id: caseNumber, policy_name: policyName ?? "", rfi_criteria: rules.map((r) => `• ${r.category}: ${r.rule}`).join("\n") }}
            templateId={templateId}
            letter={editedContent}
            onChange={(v) => { setTemplateId(v.templateId); setEditedContent(v.letter); }}
          />
        </div>
      )}

      {/* Tech Review Screen */}
      {requestType === "tech-review" && (
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
              value={selectedTechIssue}
              onChange={(e) => setSelectedTechIssue(e.target.value)}
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              {techIssueTypes.map((issue) => (
                <div
                  key={issue.id}
                  style={{
                    border: `1px solid ${selectedTechIssue === issue.id ? "#d48806" : "#f0f0f0"}`,
                    background: selectedTechIssue === issue.id ? "#fffbe6" : "transparent",
                    borderRadius: 8, padding: 12, cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onClick={() => setSelectedTechIssue(issue.id)}
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
              value={techNote}
              onChange={(e) => setTechNote(e.target.value)}
              placeholder="Describe the issue in detail so the tech team can resolve it..."
              rows={4}
              style={{ marginTop: 8, resize: "none" }}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
