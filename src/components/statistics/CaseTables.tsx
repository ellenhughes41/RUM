import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Tag, Input, Select, Button, Space, Typography } from "antd";
import {
  SearchOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  WarningOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { toast } from "sonner";
import type { ColumnsType } from "antd/es/table";

const { Text } = Typography;

const pharmacists = [
  "Sarah Chen",
  "Michael Torres",
  "David Kim",
  "Emily Rodriguez",
  "James Wilson",
];

const drugOptions = [
  "All Drugs",
  "Humira",
  "Dupixent",
  "Ozempic",
  "Evenity",
  "Galantamine",
  "Zepbound",
];

interface InfoRequestCase {
  id: string;
  caseNumber: string;
  memberName: string;
  drugName: string;
  requestedData: string;
  requestedDate: string;
  pharmacist: string;
}

interface TechReviewCase {
  id: string;
  caseNumber: string;
  memberName: string;
  drugName: string;
  issue: string;
  detectedDate: string;
  pharmacist: string;
}

interface CompletedCase {
  id: string;
  caseNumber: string;
  memberName: string;
  drugName: string;
  decision: "approved" | "denied" | "info-requested" | "override";
  completedDate: string;
  pharmacist: string;
}

interface QueueCase {
  id: string;
  caseNumber: string;
  memberName: string;
  drugName: string;
  submittedDate: string;
  dueDate: string;
  pharmacist: string;
}

const infoRequestCases: InfoRequestCase[] = [
  { id: "1", caseNumber: "PA-2024-001523", memberName: "Thomas Brown", drugName: "Humira", requestedData: "Chart notes contained no BMI reading, reached out to provider to request", requestedDate: "2024-01-14", pharmacist: "Sarah Chen" },
  { id: "2", caseNumber: "PA-2024-001524", memberName: "Lisa Wang", drugName: "Dupixent", requestedData: "No documentation of prior therapy failure, requesting treatment history", requestedDate: "2024-01-14", pharmacist: "Michael Torres" },
  { id: "3", caseNumber: "PA-2024-001525", memberName: "Michael Davis", drugName: "Ozempic", requestedData: "HbA1c results not found in submitted documents, requesting lab values", requestedDate: "2024-01-13", pharmacist: "Sarah Chen" },
  { id: "4", caseNumber: "PA-2024-001526", memberName: "Jennifer Lee", drugName: "Evenity", requestedData: "DEXA scan results expired, requesting updated bone density test", requestedDate: "2024-01-13", pharmacist: "David Kim" },
];

const techReviewCases: TechReviewCase[] = [
  { id: "1", caseNumber: "PA-2024-001530", memberName: "Robert Martinez", drugName: "Galantamine", issue: "Chart notes were submitted upside down, needs reorientation to handle properly", detectedDate: "2024-01-15", pharmacist: "Emily Rodriguez" },
  { id: "2", caseNumber: "PA-2024-001531", memberName: "Susan Kim", drugName: "Dupixent", issue: "PDF is password protected, unable to extract text content", detectedDate: "2024-01-15", pharmacist: "Michael Torres" },
  { id: "3", caseNumber: "PA-2024-001532", memberName: "Ahmed Hassan", drugName: "Humira", issue: "Chart notes in foreign language (Arabic), requires translation", detectedDate: "2024-01-14", pharmacist: "Sarah Chen" },
];

const completedCases: CompletedCase[] = [
  { id: "c1", caseNumber: "PA-2024-001540", memberName: "Linda Johnson", drugName: "Dupixent", decision: "approved", completedDate: "2024-01-15", pharmacist: "Sarah Chen" },
  { id: "c2", caseNumber: "PA-2024-001538", memberName: "Michael Brown", drugName: "Ozempic", decision: "denied", completedDate: "2024-01-15", pharmacist: "Michael Torres" },
  { id: "c3", caseNumber: "PA-2024-001535", memberName: "Susan Davis", drugName: "Humira", decision: "approved", completedDate: "2024-01-14", pharmacist: "David Kim" },
  { id: "c4", caseNumber: "PA-2024-001530", memberName: "Thomas Anderson", drugName: "Evenity", decision: "info-requested", completedDate: "2024-01-14", pharmacist: "Emily Rodriguez" },
  { id: "c5", caseNumber: "PA-2024-001528", memberName: "Jennifer White", drugName: "Dupixent", decision: "override", completedDate: "2024-01-13", pharmacist: "Sarah Chen" },
  { id: "c6", caseNumber: "PA-2024-001525", memberName: "Richard Lee", drugName: "Galantamine", decision: "approved", completedDate: "2024-01-13", pharmacist: "Michael Torres" },
];

const queueCases: QueueCase[] = [
  { id: "7", caseNumber: "PA-2024-001553", memberName: "Leanne Reynolds", drugName: "Zepbound", submittedDate: "2024-01-15", dueDate: "2024-01-17 14:00", pharmacist: "Sarah Chen" },
  { id: "2", caseNumber: "PA-2024-001548", memberName: "John Travolta", drugName: "Ozempic", submittedDate: "2024-01-15", dueDate: "2024-01-17 16:30", pharmacist: "David Kim" },
  { id: "4", caseNumber: "PA-2024-001550", memberName: "Robert Chen", drugName: "Galantamine", submittedDate: "2024-01-15", dueDate: "2024-01-18 09:00", pharmacist: "Emily Rodriguez" },
  { id: "5", caseNumber: "PA-2024-001551", memberName: "Emily Thompson", drugName: "Humira", submittedDate: "2024-01-15", dueDate: "2024-01-18 12:00", pharmacist: "Michael Torres" },
  { id: "6", caseNumber: "PA-2024-001552", memberName: "David Park", drugName: "Dupixent", submittedDate: "2024-01-15", dueDate: "2024-01-19 10:00", pharmacist: "Sarah Chen" },
];

interface CaseTablesProps {
  activeStage: string;
  onViewCase?: (caseId: string) => void;
}

const decisionConfig: Record<string, { color: string; label: string }> = {
  approved: { color: "green", label: "Approved" },
  denied: { color: "red", label: "Denied" },
  "info-requested": { color: "orange", label: "Info Requested" },
  override: { color: "blue", label: "Override" },
};

export function CaseTables({ activeStage, onViewCase }: CaseTablesProps) {
  const navigate = useNavigate();
  const [queueCasesState, setQueueCasesState] = useState(queueCases);
  const [searchQuery, setSearchQuery] = useState("");
  const [drugFilter, setDrugFilter] = useState("All Drugs");

  const handleCaseClick = (caseId: string) => {
    if (onViewCase) {
      onViewCase(caseId);
    } else {
      navigate(`/cases?case=${caseId}`);
    }
  };

  const handleAssignPharmacist = (caseId: string, pharmacist: string) => {
    setQueueCasesState((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, pharmacist } : c))
    );
    const caseItem = queueCasesState.find((c) => c.id === caseId);
    toast.success(`Case ${caseItem?.caseNumber} assigned to ${pharmacist}`);
  };

  const filteredQueueCases = useMemo(() => {
    return queueCasesState.filter((c) => {
      const matchesSearch = searchQuery === "" ||
        c.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDrug = drugFilter === "All Drugs" || c.drugName === drugFilter;
      return matchesSearch && matchesDrug;
    });
  }, [queueCasesState, searchQuery, drugFilter]);

  const filteredCompletedCases = useMemo(() => {
    return completedCases.filter((c) => {
      const matchesSearch = searchQuery === "" ||
        c.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDrug = drugFilter === "All Drugs" || c.drugName === drugFilter;
      return matchesSearch && matchesDrug;
    });
  }, [searchQuery, drugFilter]);

  // Info Request columns
  const infoRequestColumns: ColumnsType<InfoRequestCase> = [
    { title: "Case #", dataIndex: "caseNumber", key: "caseNumber", render: (v) => <Text code>{v}</Text> },
    { title: "Member", dataIndex: "memberName", key: "memberName", render: (v) => <Text strong>{v}</Text> },
    { title: "Drug", dataIndex: "drugName", key: "drugName" },
    { title: "Pharmacist", dataIndex: "pharmacist", key: "pharmacist" },
    {
      title: "Requested Data", dataIndex: "requestedData", key: "requestedData", width: 350,
      render: (v) => (
        <Space>
          <ClockCircleOutlined style={{ color: "#faad14" }} />
          <Text type="secondary">{v}</Text>
        </Space>
      ),
    },
    { title: "Requested", dataIndex: "requestedDate", key: "requestedDate" },
  ];

  // Tech Review columns
  const techReviewColumns: ColumnsType<TechReviewCase> = [
    { title: "Case #", dataIndex: "caseNumber", key: "caseNumber", render: (v) => <Text code>{v}</Text> },
    { title: "Member", dataIndex: "memberName", key: "memberName", render: (v) => <Text strong>{v}</Text> },
    { title: "Drug", dataIndex: "drugName", key: "drugName" },
    { title: "Pharmacist", dataIndex: "pharmacist", key: "pharmacist" },
    {
      title: "Issue Detected", dataIndex: "issue", key: "issue", width: 350,
      render: (v) => (
        <Space>
          <WarningOutlined style={{ color: "#ff4d4f" }} />
          <Text type="secondary">{v}</Text>
        </Space>
      ),
    },
    { title: "Detected", dataIndex: "detectedDate", key: "detectedDate" },
  ];

  // Queue columns
  const queueColumns: ColumnsType<QueueCase> = [
    {
      title: "Case #", dataIndex: "caseNumber", key: "caseNumber",
      render: (v, record) => (
        <a onClick={() => handleCaseClick(record.id)}>
          <Text code>{v}</Text>
        </a>
      ),
    },
    {
      title: "Member", dataIndex: "memberName", key: "memberName",
      render: (v, record) => (
        <a onClick={() => handleCaseClick(record.id)}>
          <Text strong>{v}</Text>
        </a>
      ),
    },
    { title: "Drug", dataIndex: "drugName", key: "drugName" },
    {
      title: "Assign to", dataIndex: "pharmacist", key: "pharmacist",
      render: (v, record) => (
        <Select
          value={v}
          onChange={(val) => handleAssignPharmacist(record.id, val)}
          size="small"
          style={{ width: 160 }}
          options={pharmacists.map((name) => ({ label: name, value: name }))}
        />
      ),
    },
    { title: "Submitted", dataIndex: "submittedDate", key: "submittedDate" },
    { title: "Due Date", dataIndex: "dueDate", key: "dueDate" },
  ];

  // Completed columns
  const completedColumns: ColumnsType<CompletedCase> = [
    { title: "Case #", dataIndex: "caseNumber", key: "caseNumber", render: (v) => <Text code>{v}</Text> },
    { title: "Member", dataIndex: "memberName", key: "memberName", render: (v) => <Text strong>{v}</Text> },
    { title: "Drug", dataIndex: "drugName", key: "drugName" },
    { title: "Pharmacist", dataIndex: "pharmacist", key: "pharmacist" },
    {
      title: "Decision", dataIndex: "decision", key: "decision",
      render: (v: string) => {
        const cfg = decisionConfig[v] || { color: "default", label: v };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    { title: "Completed", dataIndex: "completedDate", key: "completedDate" },
  ];

  // All view - combined data
  const allColumns: ColumnsType<any> = [
    {
      title: "Case #", dataIndex: "caseNumber", key: "caseNumber",
      render: (v: string, record: any) => (
        <a onClick={() => record.submittedDate && handleCaseClick(record.id)}>
          <Text code>{v}</Text>
        </a>
      ),
    },
    { title: "Member", dataIndex: "memberName", key: "memberName", render: (v: string) => <Text strong>{v}</Text> },
    { title: "Drug", dataIndex: "drugName", key: "drugName" },
    {
      title: "Status", key: "status",
      render: (_: any, record: any) => {
        if (record.decision) {
          const cfg = decisionConfig[record.decision] || { color: "default", label: record.decision };
          return <Tag color={cfg.color}>{cfg.label}</Tag>;
        }
        return <Tag color="orange" icon={<ClockCircleOutlined />}>In Queue</Tag>;
      },
    },
    { title: "Pharmacist", dataIndex: "pharmacist", key: "pharmacist" },
    {
      title: "Date", key: "date",
      render: (_: any, record: any) => record.completedDate || `Due: ${record.dueDate}`,
    },
  ];

  const allData = [
    ...filteredQueueCases.map(c => ({ ...c, _type: "queue" })),
    ...filteredCompletedCases.map(c => ({ ...c, _type: "completed" })),
  ];

  return (
    <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #f0f0f0" }}>
      {activeStage === "info-request" && (
        <div>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #f0f0f0" }}>
            <Text strong style={{ fontSize: 15 }}>AI Information Requests</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 13 }}>Cases waiting for additional data from providers</Text>
          </div>
          <Table
            columns={infoRequestColumns}
            dataSource={infoRequestCases}
            rowKey="id"
            pagination={false}
            size="middle"
          />
        </div>
      )}

      {activeStage === "tech-review" && (
        <div>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #f0f0f0" }}>
            <Text strong style={{ fontSize: 15 }}>Tech Review Queue</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 13 }}>Cases with document issues requiring manual intervention</Text>
          </div>
          <Table
            columns={techReviewColumns}
            dataSource={techReviewCases}
            rowKey="id"
            pagination={false}
            size="middle"
          />
        </div>
      )}

      {(activeStage === "all" || activeStage === "queue" || activeStage === "completed") && (
        <div>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #f0f0f0" }}>
            <Space wrap>
              <Input
                placeholder="Search member name or case #..."
                prefix={<SearchOutlined />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: 280 }}
                allowClear
              />
              <Select
                value={drugFilter}
                onChange={setDrugFilter}
                style={{ width: 140 }}
                options={drugOptions.map((d) => ({ label: d, value: d }))}
              />
              {(searchQuery || drugFilter !== "All Drugs") && (
                <Button
                  type="text"
                  icon={<ClearOutlined />}
                  onClick={() => { setSearchQuery(""); setDrugFilter("All Drugs"); }}
                >
                  Clear filters
                </Button>
              )}
            </Space>
          </div>

          {activeStage === "all" && (
            <Table columns={allColumns} dataSource={allData} rowKey="id" pagination={false} size="middle" />
          )}
          {activeStage === "queue" && (
            <Table columns={queueColumns} dataSource={filteredQueueCases} rowKey="id" pagination={false} size="middle" />
          )}
          {activeStage === "completed" && (
            <Table columns={completedColumns} dataSource={filteredCompletedCases} rowKey="id" pagination={false} size="middle" />
          )}
        </div>
      )}
    </div>
  );
}
