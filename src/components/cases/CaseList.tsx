import { useState, useEffect, useMemo } from "react";
import { Input, Button, Tabs, Tag, Space, Collapse, Badge, Select, Typography, Tooltip, Popover, Dropdown, Radio, Checkbox } from "antd";
import {
  UserOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  HistoryOutlined,
  DownOutlined,
  FilterOutlined,
  DownloadOutlined,
  LoadingOutlined,
  StarFilled,
  WarningOutlined,
  FileTextOutlined,
  LinkOutlined,
  SearchOutlined,
  SortAscendingOutlined,
} from "@ant-design/icons";
import { Pill } from "lucide-react";
import { cn } from "@/lib/utils";

const { Text } = Typography;

// Helper function to calculate time remaining
const getTimeRemaining = (deadline: string): { text: string; isUrgent: boolean } => {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffMs = deadlineDate.getTime() - now.getTime();
  if (diffMs <= 0) return { text: "Overdue", isUrgent: true };
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const isUrgent = diffHours < 4;
  if (diffHours < 1) return { text: `${diffMinutes}m remaining`, isUrgent };
  if (diffHours < 24) {
    const hours = Math.floor(diffHours);
    return { text: `${hours}h ${diffMinutes}m remaining`, isUrgent };
  }
  const days = Math.floor(diffHours / 24);
  const remainingHours = Math.floor(diffHours % 24);
  return { text: `${days}d ${remainingHours}h remaining`, isUrgent };
};

export interface Case {
  id: string;
  caseNumber: string;
  relatedCases?: { id: string; caseNumber: string }[];
  memberName: string;
  memberDOB: string;
  drugName: string;
  submittedAt: string;
  deadline: string;
  aiRecommendation: "approve" | "deny";
  aiConfidence: number;
  manualReview?: boolean;
  authorizationType: "initial" | "reauthorization";
  isSpecialty: boolean;
  isVIP?: boolean;
  company?: string;
  formularyUrl?: string;
  benefitsUrl?: string;
  authorizationLength?: string;
  diagnosisCode?: string;
  /** Prototype status label, e.g. "In progress" for cases returned from Override Queue. */
  statusLabel?: string;
}

export interface CompletedCase extends Case {
  completedAt: string;
  decision: "approved" | "denied";
  reviewedBy: string;
}

const now = new Date();
const hoursFromNow = (hours: number) => {
  const date = new Date(now.getTime() + hours * 60 * 60 * 1000);
  return date.toISOString();
};

export const mockCases: Case[] = [{
  id: "2", caseNumber: "PA-2024-001548", memberName: "John Travolta", memberDOB: "1972-08-22",
  drugName: "Ozempic", submittedAt: "2024-01-15 09:45 AM", deadline: hoursFromNow(1),
  aiRecommendation: "deny", aiConfidence: 87, authorizationType: "reauthorization", isSpecialty: false,
  company: "TechStart Inc.", formularyUrl: "#formulary", benefitsUrl: "#benefits",
  authorizationLength: "12 months", diagnosisCode: "E66.9 - Obesity, unspecified"
}, {
  id: "4", caseNumber: "PA-2024-001550", memberName: "Robert Chen", memberDOB: "1968-05-30",
  drugName: "Galantamine", submittedAt: "2024-01-15 10:28 AM", deadline: hoursFromNow(26),
  aiRecommendation: "approve", aiConfidence: 91, authorizationType: "reauthorization", isSpecialty: false,
  isVIP: true, company: "Premier Financial", formularyUrl: "#formulary", benefitsUrl: "#benefits",
  authorizationLength: "6 months", diagnosisCode: "G30.1 - Alzheimer's disease, late onset"
}, {
  id: "5", caseNumber: "PA-2024-001551", memberName: "Emily Thompson", memberDOB: "1995-02-14",
  relatedCases: [{ id: "7", caseNumber: "PA-2024-001553" }],
  drugName: "Humira", submittedAt: "2024-01-15 10:45 AM", deadline: hoursFromNow(3.5),
  aiRecommendation: "deny", aiConfidence: 82, authorizationType: "initial", isSpecialty: true,
  company: "Midwest Manufacturing", formularyUrl: "#formulary", benefitsUrl: "#benefits",
  authorizationLength: "12 months", diagnosisCode: "M05.79 - Rheumatoid arthritis"
}, {
  id: "6", caseNumber: "PA-2024-001552", memberName: "David Park", memberDOB: "1980-07-19",
  drugName: "Dupixent", submittedAt: "2024-01-15 11:02 AM", deadline: hoursFromNow(12),
  aiRecommendation: "approve", aiConfidence: 96, authorizationType: "reauthorization", isSpecialty: true,
  company: "Blue Ridge Hospitality", formularyUrl: "#formulary", benefitsUrl: "#benefits",
  authorizationLength: "12 months", diagnosisCode: "L20.84 - Atopic dermatitis, moderate-to-severe"
}, {
  id: "3", caseNumber: "PA-2024-001549", memberName: "Maria Garcia", memberDOB: "1990-11-08",
  drugName: "Dupixent", submittedAt: "2024-01-15 10:12 AM", deadline: hoursFromNow(8),
  aiRecommendation: "approve", aiConfidence: 0, manualReview: true, authorizationType: "initial",
  isSpecialty: true, company: "Global Health Systems", formularyUrl: "#formulary", benefitsUrl: "#benefits",
  authorizationLength: "6 months", diagnosisCode: "L20.81 - Atopic dermatitis, moderate"
}, {
  id: "new-drug-manual", caseNumber: "PA-2024-001554", memberName: "Alex Rivera", memberDOB: "1988-04-21",
  drugName: "New Drug", submittedAt: "2024-01-15 11:30 AM", deadline: hoursFromNow(9),
  aiRecommendation: "approve", aiConfidence: 0, manualReview: true, authorizationType: "initial",
  isSpecialty: true, company: "Global Health Systems", formularyUrl: "#formulary", benefitsUrl: "#benefits",
  authorizationLength: "6 months", diagnosisCode: "L20.81 - Atopic dermatitis, moderate"
}, {
  id: "7", caseNumber: "PA-2024-001553", memberName: "Emily Thompson", memberDOB: "1995-02-14",
  relatedCases: [{ id: "5", caseNumber: "PA-2024-001551" }],
  drugName: "Humira", submittedAt: "2024-01-15 14:30 PM", deadline: hoursFromNow(16),
  aiRecommendation: "approve", aiConfidence: 88, authorizationType: "reauthorization", isSpecialty: true,
  company: "Midwest Manufacturing", formularyUrl: "#formulary", benefitsUrl: "#benefits",
  authorizationLength: "12 months", diagnosisCode: "M05.79 - Rheumatoid arthritis"
}, {
  id: "rosa-ozempic", caseNumber: "PA-2026-004812", memberName: "Rosa Delgado", memberDOB: "1953-10-15",
  drugName: "Ozempic", submittedAt: "2025-05-06 08:30 AM", deadline: hoursFromNow(20.37),
  aiRecommendation: "approve", aiConfidence: 0, manualReview: true, authorizationType: "initial",
  isSpecialty: false, formularyUrl: "#formulary", benefitsUrl: "#benefits",
  authorizationLength: "12 months",
  diagnosisCode: "E11.40 - Type 2 diabetes mellitus with diabetic neuropathy, unspecified"
}, {
  id: "rosa-ozempic-ai", caseNumber: "PA-2026-004812", memberName: "Rosa Delgado", memberDOB: "1953-10-15",
  drugName: "Ozempic", submittedAt: "2025-05-06 08:30 AM", deadline: hoursFromNow(20.37),
  aiRecommendation: "approve", aiConfidence: 94, manualReview: false, authorizationType: "initial",
  isSpecialty: false, formularyUrl: "#formulary", benefitsUrl: "#benefits",
  authorizationLength: "12 months",
  diagnosisCode: "E11.40 - Type 2 diabetes mellitus with diabetic neuropathy, unspecified"
}];

export const mockCompletedCases: CompletedCase[] = [{
  id: "c1", caseNumber: "PA-2024-001540", memberName: "Linda Johnson", memberDOB: "1978-06-12",
  drugName: "Dupixent", submittedAt: "2025-12-14 02:15 PM", deadline: "2025-12-14 06:15 PM",
  aiRecommendation: "approve", aiConfidence: 96, completedAt: "2025-12-14 03:22 PM",
  decision: "approved", reviewedBy: "Dr. Rachel Park", authorizationType: "reauthorization", isSpecialty: true
}, {
  id: "c2", caseNumber: "PA-2024-001538", memberName: "Michael Brown", memberDOB: "1965-11-03",
  drugName: "Ozempic", submittedAt: "2025-12-10 09:30 AM", deadline: "2025-12-10 01:30 PM",
  aiRecommendation: "deny", aiConfidence: 89, completedAt: "2025-12-10 11:45 AM",
  decision: "denied", reviewedBy: "Dr. Rachel Park", authorizationType: "initial", isSpecialty: false
}, {
  id: "c3", caseNumber: "PA-2024-001535", memberName: "Susan Davis", memberDOB: "1982-04-28",
  drugName: "Humira", submittedAt: "2025-12-05 11:20 AM", deadline: "2025-12-05 03:20 PM",
  aiRecommendation: "approve", aiConfidence: 92, completedAt: "2025-12-05 01:15 PM",
  decision: "approved", reviewedBy: "Dr. Rachel Park", authorizationType: "reauthorization", isSpecialty: true
}, {
  id: "c4", caseNumber: "PA-2024-001530", memberName: "Thomas Anderson", memberDOB: "1970-09-15",
  drugName: "Evenity", submittedAt: "2025-11-20 10:00 AM", deadline: "2025-11-20 02:00 PM",
  aiRecommendation: "approve", aiConfidence: 85, completedAt: "2025-11-20 02:30 PM",
  decision: "denied", reviewedBy: "Dr. Rachel Park", authorizationType: "initial", isSpecialty: true
}];

const getRecentCompletedCases = () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return mockCompletedCases.filter(c => {
    const completedDate = new Date(c.completedAt);
    return completedDate >= thirtyDaysAgo;
  });
};

interface CaseListProps {
  selectedCase: string | null;
  onSelectCase: (id: string) => void;
  onTogglePanel?: () => void;
  claimedCaseIds: Set<string>;
  onClaimCase: (caseId: string) => void;
  onUnclaimCase: (caseId: string) => void;
  activeTab: "unassigned" | "my-claims" | "rfi";
  onTabChange: (tab: "unassigned" | "my-claims" | "rfi") => void;
  pendingInfoCaseIds?: Set<string>;
  pendingInfoAnimatingCaseId?: string | null;
  completedCaseIds?: Set<string>;
  completedDecisions?: Record<string, "approved" | "denied">;
  importedCases?: Case[];
  onImportCase?: (c: Case) => void;
}

export function CaseList({
  selectedCase,
  onSelectCase,
  onTogglePanel,
  claimedCaseIds,
  onClaimCase,
  onUnclaimCase,
  activeTab,
  onTabChange,
  pendingInfoCaseIds = new Set(),
  pendingInfoAnimatingCaseId = null,
  completedCaseIds = new Set(),
  completedDecisions = {},
  importedCases: importedCasesProp = [],
  onImportCase,
}: CaseListProps) {
  const [carrierFilter, setCarrierFilter] = useState<string>("all");
  const [policyFilter, setPolicyFilter] = useState<string>("all");
  const [requestReasonFilter, setRequestReasonFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "standard" | "expedited">("all");
  const [remainingTimeFilter, setRemainingTimeFilter] = useState<"all" | "past-due" | "1h" | "3h" | "6h" | "12h" | "24h" | "24h+">("all");
  const [copilotStatusFilter, setCopilotStatusFilter] = useState<"all" | "reviewing" | "complete" | "manual">("all");
  const [claimingCaseId, setClaimingCaseId] = useState<string | null>(null);
  const [unclaimingCaseId, setUnclaimingCaseId] = useState<string | null>(null);
  const [showFirstClaimHint, setShowFirstClaimHint] = useState(false);
  const [importCaseId, setImportCaseId] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [myCasesFilter, setMyCasesFilter] = useState<"active" | "approved" | "denied" | "rfi">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"deadline-asc" | "deadline-desc" | "member-az" | "drug-az" | "submitted-desc">("deadline-asc");
  const importedCases = importedCasesProp;
  const recentCompletedCases = getRecentCompletedCases();

  useEffect(() => {
    if (activeTab !== "my-claims" && myCasesFilter !== "active") {
      setMyCasesFilter("active");
    }
  }, [activeTab, myCasesFilter]);

  const handleImportCase = () => {
    const trimmed = importCaseId.trim();
    if (!trimmed || importLoading) return;
    const allCases = [...mockCases, ...importedCases];
    const exists = allCases.some(c => c.id === trimmed || c.caseNumber === trimmed);
    if (exists) {
      setImportError("Case already in list");
      setTimeout(() => setImportError(null), 2000);
      return;
    }
    setImportLoading(true);
    setImportError(null);
    if (trimmed === "PA-03-16") {
      setTimeout(() => {
        const newCase: Case = {
          id: "imported-pa-03-16", caseNumber: "PA-03-16", memberName: "Bobby Stacks",
          memberDOB: "1985-03-22", drugName: "Ozempic", submittedAt: new Date().toLocaleString(),
          deadline: hoursFromNow(18), aiRecommendation: "approve", aiConfidence: 91,
          authorizationType: "initial", isSpecialty: false, company: "Aetna", diagnosisCode: "E11.9",
        };
        onImportCase?.(newCase);
        setImportLoading(false);
        setImportCaseId("");
      }, 1500);
    } else {
      setTimeout(() => {
        setImportLoading(false);
        setImportError("Case ID not matched");
        setTimeout(() => setImportError(null), 3000);
        setImportCaseId("");
      }, 2000);
    }
  };

  const uniqueDrugNames = Array.from(new Set(mockCases.map(c => c.drugName))).sort();

  const handleClaimCase = (e: React.MouseEvent, caseId: string) => {
    e.stopPropagation();
    const isFirstClaim = claimedCaseIds.size === 0;
    setClaimingCaseId(caseId);
    setTimeout(() => {
      onClaimCase(caseId);
      setClaimingCaseId(null);
      if (isFirstClaim) setShowFirstClaimHint(true);
    }, 400);
  };

  const handleUnclaimCase = (e: React.MouseEvent, caseId: string) => {
    e.stopPropagation();
    setUnclaimingCaseId(caseId);
    setTimeout(() => {
      onUnclaimCase(caseId);
      setUnclaimingCaseId(null);
    }, 400);
  };

  const importedIds = new Set(importedCases.map(c => c.id));
  const allCases = [...mockCases, ...importedCases];
  // Find related cases: same member + same drug, where one is claimed
  const relatedPromotedIds = useMemo(() => {
    const promoted = new Set<string>();
    const allCasesList = [...mockCases, ...importedCases];
    for (const c of allCasesList) {
      if (claimedCaseIds.has(c.id) && !completedCaseIds.has(c.id)) {
        // Find other cases with same member + drug that are NOT claimed
        for (const other of allCasesList) {
          if (other.id !== c.id && other.memberName === c.memberName && other.drugName === c.drugName && !claimedCaseIds.has(other.id) && !completedCaseIds.has(other.id) && !pendingInfoCaseIds.has(other.id)) {
            promoted.add(other.id);
          }
        }
      }
    }
    return promoted;
  }, [claimedCaseIds, completedCaseIds, pendingInfoCaseIds, importedCases]);

  const filteredCases = allCases
    .filter(c => {
      if (pendingInfoAnimatingCaseId === c.id) return true;
      if (activeTab === "rfi") {
        if (completedCaseIds.has(c.id)) return false;
        if (!pendingInfoCaseIds.has(c.id)) return false;
      } else if (activeTab === "unassigned") {
        if (claimedCaseIds.has(c.id)) return false;
        if (completedCaseIds.has(c.id)) return false;
        if (pendingInfoCaseIds.has(c.id)) return false;
      } else {
        if (!claimedCaseIds.has(c.id)) return false;
        const isCompleted = completedCaseIds.has(c.id);
        const isRfi = pendingInfoCaseIds.has(c.id) && !isCompleted;
        const decision = completedDecisions[c.id];
        if (myCasesFilter === "active" && (isCompleted || isRfi)) return false;
        if (myCasesFilter === "approved" && !(isCompleted && decision === "approved")) return false;
        if (myCasesFilter === "denied" && !(isCompleted && decision === "denied")) return false;
        if (myCasesFilter === "rfi" && !isRfi) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${c.caseNumber} ${c.memberName} ${c.drugName} ${c.diagnosisCode ?? ""} ${c.company ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (copilotStatusFilter !== "all") {
        const isManual = !!c.manualReview;
        const isComplete = completedCaseIds.has(c.id);
        if (copilotStatusFilter === "manual" && !isManual) return false;
        if (copilotStatusFilter === "complete" && (isManual || !isComplete)) return false;
        if (copilotStatusFilter === "reviewing" && (isManual || isComplete)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const aImported = importedIds.has(a.id);
      const bImported = importedIds.has(b.id);
      if (aImported && !bImported) return -1;
      if (!aImported && bImported) return 1;
      // Promote related cases to top
      const aRelated = relatedPromotedIds.has(a.id);
      const bRelated = relatedPromotedIds.has(b.id);
      if (aRelated && !bRelated) return -1;
      if (!aRelated && bRelated) return 1;
      if (a.isVIP && !b.isVIP) return -1;
      if (!a.isVIP && b.isVIP) return 1;
      switch (sortBy) {
        case "deadline-desc":
          return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
        case "member-az":
          return a.memberName.localeCompare(b.memberName);
        case "drug-az":
          return a.drugName.localeCompare(b.drugName);
        case "submitted-desc":
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        case "deadline-asc":
        default:
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
    });

  const unassignedCount = allCases.filter(c => !claimedCaseIds.has(c.id) && !pendingInfoCaseIds.has(c.id) && !completedCaseIds.has(c.id)).length;
  const myClaimsCount = allCases.filter(c => claimedCaseIds.has(c.id)).length;
  const rfiCount = allCases.filter(c => pendingInfoCaseIds.has(c.id) && !completedCaseIds.has(c.id)).length;

  const myCaseStatusCounts = useMemo(() => {
    const counts = { active: 0, approved: 0, denied: 0, rfi: 0 };
    for (const c of allCases) {
      if (!claimedCaseIds.has(c.id)) continue;
      const isCompleted = completedCaseIds.has(c.id);
      const isRfi = pendingInfoCaseIds.has(c.id) && !isCompleted;
      const decision = completedDecisions[c.id];
      if (isRfi) counts.rfi++;
      else if (isCompleted && decision === "approved") counts.approved++;
      else if (isCompleted && decision === "denied") counts.denied++;
      else counts.active++;
    }
    return counts;
  }, [allCases, claimedCaseIds, completedCaseIds, pendingInfoCaseIds, completedDecisions]);

  const carrierOptions = [
    { label: "All Carriers", value: "all" },
    { label: "Aetna", value: "Aetna" },
    { label: "Blue Cross Blue Shield", value: "BCBS" },
    { label: "Cigna", value: "Cigna" },
    { label: "Humana", value: "Humana" },
    { label: "UnitedHealthcare", value: "UHC" },
    { label: "Kaiser Permanente", value: "Kaiser" },
  ];

  const policyOptions = [
    { label: "All Policies", value: "all" },
    { label: "GLP-1 Agonists", value: "glp1" },
    { label: "Preferred GLP-1", value: "preferred-glp1" },
    { label: "Specialty Biologics", value: "specialty-biologics" },
    { label: "Dermatology", value: "dermatology" },
    { label: "Default Policy", value: "default" },
  ];

  const requestReasonOptions = [
    { label: "All Reasons", value: "all" },
    { label: "Initial Authorization", value: "initial" },
    { label: "Reauthorization", value: "reauth" },
    { label: "Quantity Limit", value: "quantity-limit" },
    { label: "Step Therapy Exception", value: "step-therapy" },
    { label: "Formulary Exception", value: "formulary-exception" },
  ];

  const priorityOptions = [
    { label: "All Priorities", value: "all" },
    { label: "Standard", value: "standard" },
    { label: "Expedited", value: "expedited" },
  ];

  const remainingTimeOptions = [
    { label: "All", value: "all" },
    { label: "Past Due", value: "past-due" },
    { label: "1 hour", value: "1h" },
    { label: "3 hour", value: "3h" },
    { label: "6 hour", value: "6h" },
    { label: "12 hour", value: "12h" },
    { label: "24 hour", value: "24h" },
    { label: "24h+ only", value: "24h+" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <Text strong style={{ fontSize: 16 }}>Incoming Cases</Text>
        {onTogglePanel && (
          <Button type="text" size="small" onClick={onTogglePanel} icon={<CloseOutlined />} />
        )}
      </div>

      {/* Search */}
      <Input
        size="small"
        placeholder="Search cases..."
        prefix={<SearchOutlined style={{ color: "rgba(0,0,0,0.45)" }} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        allowClear
        style={{ marginBottom: 12 }}
      />

      {/* Filter / Sort / Active filters */}
      {(() => {
        const sortLabels: Record<typeof sortBy, string> = {
          "deadline-asc": "Deadline (soonest)",
          "deadline-desc": "Deadline (latest)",
          "member-az": "Member name (A-Z)",
          "drug-az": "Drug name (A-Z)",
          "submitted-desc": "Submitted (newest)",
        };
        const filterContent = (
          <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>Carrier</Text>
              <Select
                size="small"
                style={{ width: "100%" }}
                value={carrierFilter}
                onChange={setCarrierFilter}
                options={carrierOptions}
                showSearch
                optionFilterProp="label"
              />
            </div>
            <div>
              <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>Policy</Text>
              <Select
                size="small"
                style={{ width: "100%" }}
                value={policyFilter}
                onChange={setPolicyFilter}
                options={policyOptions}
                showSearch
                optionFilterProp="label"
              />
            </div>
            <div>
              <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>Request Reason</Text>
              <Select
                size="small"
                style={{ width: "100%" }}
                value={requestReasonFilter}
                onChange={setRequestReasonFilter}
                options={requestReasonOptions}
                showSearch
                optionFilterProp="label"
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>Priority</Text>
                <Select
                  size="small"
                  style={{ width: "100%" }}
                  value={priorityFilter}
                  onChange={setPriorityFilter}
                  options={priorityOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>Remaining Time</Text>
                <Select
                  size="small"
                  style={{ width: "100%" }}
                  value={remainingTimeFilter}
                  onChange={setRemainingTimeFilter}
                  options={remainingTimeOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
            </div>
            <div>
              <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>Copilot Status</Text>
              <Select
                size="small"
                style={{ width: "100%" }}
                value={copilotStatusFilter}
                onChange={setCopilotStatusFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "reviewing", label: "Reviewing" },
                  { value: "complete", label: "Complete" },
                  { value: "manual", label: "Manual" },
                ]}
                showSearch
                optionFilterProp="label"
              />
            </div>
            <Button
              size="small"
              type="link"
              style={{ padding: 0, alignSelf: "flex-start" }}
              onClick={() => {
                setCarrierFilter("all");
                setPolicyFilter("all");
                setRequestReasonFilter("all");
                setPriorityFilter("all");
                setRemainingTimeFilter("all");
                setCopilotStatusFilter("all");
                if (activeTab === "my-claims") setMyCasesFilter("active");
              }}
            >
              Clear filters
            </Button>
          </div>
        );

        const activeFilterChips: { key: string; label: string; onClose: () => void }[] = [];
        if (carrierFilter !== "all") {
          activeFilterChips.push({
            key: "carrier",
            label: carrierOptions.find(o => o.value === carrierFilter)?.label ?? carrierFilter,
            onClose: () => setCarrierFilter("all"),
          });
        }
        if (policyFilter !== "all") {
          activeFilterChips.push({
            key: "policy",
            label: policyOptions.find(o => o.value === policyFilter)?.label ?? policyFilter,
            onClose: () => setPolicyFilter("all"),
          });
        }
        if (requestReasonFilter !== "all") {
          activeFilterChips.push({
            key: "request-reason",
            label: requestReasonOptions.find(o => o.value === requestReasonFilter)?.label ?? requestReasonFilter,
            onClose: () => setRequestReasonFilter("all"),
          });
        }
        if (priorityFilter !== "all") {
          activeFilterChips.push({
            key: "priority",
            label: priorityFilter === "standard" ? "Standard" : "Expedited",
            onClose: () => setPriorityFilter("all"),
          });
        }
        if (remainingTimeFilter !== "all") {
          activeFilterChips.push({
            key: "remaining-time",
            label: remainingTimeOptions.find(o => o.value === remainingTimeFilter)?.label ?? remainingTimeFilter,
            onClose: () => setRemainingTimeFilter("all"),
          });
        }
        if (copilotStatusFilter !== "all") {
          const labels: Record<"reviewing" | "complete" | "manual", string> = {
            reviewing: "Reviewing",
            complete: "Complete",
            manual: "Manual",
          };
          activeFilterChips.push({
            key: "copilot-status",
            label: `Copilot: ${labels[copilotStatusFilter]}`,
            onClose: () => setCopilotStatusFilter("all"),
          });
        }

        const filterCount = activeFilterChips.length;

        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <Popover
              trigger="click"
              placement="bottomRight"
              content={filterContent}
            >
              <Badge count={filterCount} size="small" offset={[-4, 2]}>
                <Button size="small" icon={<FilterOutlined />}>Filter</Button>
              </Badge>
            </Popover>
            <Dropdown
              trigger={["click"]}
              menu={{
                selectable: true,
                selectedKeys: [sortBy],
                onClick: ({ key }) => setSortBy(key as typeof sortBy),
                items: (Object.keys(sortLabels) as (keyof typeof sortLabels)[]).map(k => ({
                  key: k,
                  label: sortLabels[k],
                })),
              }}
            >
              <Button size="small" icon={<SortAscendingOutlined />}>Sort</Button>
            </Dropdown>
            {activeFilterChips.map(chip => (
              <Tag
                key={chip.key}
                closable
                onClose={(e) => { e.preventDefault(); chip.onClose(); }}
                style={{ margin: 0 }}
              >
                {chip.label}
              </Tag>
            ))}
          </div>
        );
      })()}

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={(v) => onTabChange(v as any)}
        size="small"
        style={{ marginBottom: 12 }}
        items={[
          { key: "unassigned", label: `Unassigned (${unassignedCount})` },
          { key: "my-claims", label: `My Cases (${myClaimsCount})` },
          { key: "rfi", label: `RFI (${rfiCount})` },
        ]}
      />

      {/* My Cases status bubbles */}
      {activeTab === "my-claims" && (
        <div style={{ marginBottom: 12 }}>
          <Space wrap size={8}>
            {([
              { key: "active" as const, label: "Active" },
              { key: "approved" as const, label: "Approved" },
              { key: "denied" as const, label: "Denied" },
              { key: "rfi" as const, label: "RFI" },
            ]).map(({ key, label }) => (
              <Tag
                key={key}
                color={myCasesFilter === key ? "blue" : undefined}
                onClick={() => setMyCasesFilter(key)}
                style={{ cursor: "pointer", borderRadius: 999, padding: "2px 10px", margin: 0 }}
              >
                {label} ({myCaseStatusCounts[key]})
              </Tag>
            ))}
          </Space>
        </div>
      )}

      {/* First Claim Hint */}
      {showFirstClaimHint && activeTab === "unassigned" && (
        <div
          style={{
            textAlign: "center",
            padding: 16,
            borderRadius: 8,
            border: "1px solid #b7eb8f",
            background: "#f6ffed",
            marginBottom: 12,
          }}
        >
          <CheckOutlined style={{ fontSize: 20, color: "#52c41a", marginBottom: 8 }} />
          <div><Text strong>Case claimed!</Text></div>
          <Text type="secondary" style={{ fontSize: 12 }}>See your claimed cases under My Cases</Text>
          <div style={{ marginTop: 12 }}>
            <Button type="primary" size="small" onClick={() => { setShowFirstClaimHint(false); onTabChange("my-claims"); }}>
              Go to My Cases
            </Button>
          </div>
          <div style={{ marginTop: 8 }}>
            <Button type="link" size="small" onClick={() => setShowFirstClaimHint(false)}>Dismiss</Button>
          </div>
        </div>
      )}

      {/* Case Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filteredCases.map(caseItem => {
          const timeRemaining = getTimeRemaining(caseItem.deadline);
          return (
            <div
              key={caseItem.id}
              onClick={() => onSelectCase(caseItem.id)}
              className={cn(
                "transition-all duration-200",
                claimingCaseId === caseItem.id && "opacity-0 translate-x-full",
                unclaimingCaseId === caseItem.id && "opacity-0 -translate-x-full",
                pendingInfoAnimatingCaseId === caseItem.id && "opacity-0 translate-y-4",
              )}
              style={{
                padding: 12,
                borderRadius: 8,
                border: selectedCase === caseItem.id
                  ? "1px solid #1677ff"
                  : relatedPromotedIds.has(caseItem.id)
                  ? "1px solid #faad14"
                  : "1px solid #BFBFBF",
                background: selectedCase === caseItem.id
                  ? "#e6f4ff"
                  : relatedPromotedIds.has(caseItem.id)
                  ? "#fffbe6"
                  : "#fff",
                cursor: "pointer",
                position: "relative",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (selectedCase !== caseItem.id) {
                  e.currentTarget.style.borderColor = "#BFBFBF";
                  const btn = e.currentTarget.querySelector('.claim-btn') as HTMLElement;
                  if (btn) btn.style.opacity = "1";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCase !== caseItem.id) {
                  e.currentTarget.style.borderColor = relatedPromotedIds.has(caseItem.id) ? "#faad14" : "#BFBFBF";
                  const btn = e.currentTarget.querySelector('.claim-btn') as HTMLElement;
                  if (btn) btn.style.opacity = "0";
                }
              }}
            >
              {activeTab === "unassigned" && (
                <Button
                  className="claim-btn"
                  size="small"
                  style={{ position: "absolute", top: 4, right: 4, opacity: 0, fontSize: 12, transition: "opacity 0.2s" }}
                  onClick={(e) => handleClaimCase(e, caseItem.id)}
                >
                  Claim
                </Button>
              )}
              {activeTab === "my-claims" && (
                <Button
                  className="claim-btn"
                  size="small"
                  type="text"
                  style={{ position: "absolute", top: 4, right: 4, opacity: 0, fontSize: 12, transition: "opacity 0.2s" }}
                  onClick={(e) => handleUnclaimCase(e, caseItem.id)}
                >
                  Unclaim
                </Button>
              )}

              {relatedPromotedIds.has(caseItem.id) && (
                <div style={{
                  background: "#fff7e6",
                  border: "1px solid #ffd591",
                  borderRadius: 6,
                  padding: "6px 10px",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                }}>
                  <LinkOutlined style={{ color: "#fa8c16", fontSize: 13 }} />
                  <Text style={{ fontSize: 12, color: "#d46b08" }}>
                    <strong>Related case found</strong> — same member &amp; drug already claimed
                  </Text>
                </div>
              )}

              <div style={{ marginBottom: 4 }}>
                <Space size={4}>
                  <Text type="secondary" style={{ fontFamily: "monospace", fontSize: 12 }}>{caseItem.caseNumber}</Text>
                  {caseItem.manualReview && <Tag color="orange" style={{ fontSize: 12, margin: 0 }}>Manual Review</Tag>}
                  {caseItem.statusLabel && <Tag color="processing" style={{ fontSize: 12, margin: 0 }}>{caseItem.statusLabel}</Tag>}
                </Space>
              </div>
              <Space size={4} style={{ marginBottom: 4 }}>
                <Pill className="h-3.5 w-3.5 text-muted-foreground" />
                <Text strong style={{ fontSize: 13 }}>{caseItem.drugName}</Text>
              </Space>
              <div>
                <Space size={12} style={{ fontSize: 12 }}>
                  <Space size={4}>
                    <UserOutlined style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>{caseItem.memberName}</Text>
                    {caseItem.isVIP && (
                      <Tag color="gold" style={{ fontSize: 12, margin: 0, lineHeight: "16px" }}>
                        <StarFilled style={{ fontSize: 12 }} /> VIP
                      </Tag>
                    )}
                  </Space>
                  <Space size={4}>
                    {timeRemaining.isUrgent ? (
                      <WarningOutlined style={{ fontSize: 12, color: "#ff4d4f" }} />
                    ) : (
                      <ClockCircleOutlined style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }} />
                    )}
                    <Text
                      style={{
                        fontSize: 12,
                        color: timeRemaining.isUrgent ? "#ff4d4f" : "rgba(0,0,0,0.45)",
                        fontWeight: timeRemaining.isUrgent ? 500 : 400,
                      }}
                    >
                      {timeRemaining.text}
                    </Text>
                  </Space>
                </Space>
              </div>
            </div>
          );
        })}
      </div>

      {/* Past Reviews */}
      {recentCompletedCases.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <Collapse
            ghost
            items={[{
              key: "past",
              label: (
                <Space>
                  <HistoryOutlined />
                  <Text strong>Past Reviews</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>({recentCompletedCases.length}) · Last 30 days</Text>
                </Space>
              ),
              children: (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {recentCompletedCases.map(caseItem => (
                    <div
                      key={caseItem.id}
                      onClick={() => onSelectCase(caseItem.id)}
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        border: selectedCase === caseItem.id ? "1px solid #1677ff" : "1px solid #BFBFBF",
                        background: selectedCase === caseItem.id ? "#e6f4ff" : "#fafafa",
                        cursor: "pointer",
                        opacity: selectedCase === caseItem.id ? 1 : 0.75,
                      }}
                    >
                      <div style={{ marginBottom: 4 }}>
                        <Space size={4}>
                          <Text type="secondary" style={{ fontFamily: "monospace", fontSize: 12 }}>{caseItem.caseNumber}</Text>
                          <Tag
                            color={caseItem.decision === "approved" ? "green" : "red"}
                            style={{ fontSize: 12, margin: 0 }}
                          >
                            {caseItem.decision === "approved" ? "Approved" : "Denied"}
                          </Tag>
                        </Space>
                      </div>
                      <Space size={4}>
                        <UserOutlined style={{ fontSize: 13, color: "rgba(0,0,0,0.45)" }} />
                        <Text style={{ fontSize: 13 }}>{caseItem.memberName}</Text>
                      </Space>
                      <div style={{ marginTop: 4 }}>
                        <Space size={12} style={{ fontSize: 12 }}>
                          <Space size={4}>
                            <Pill className="h-3 w-3 text-muted-foreground" />
                            <Text type="secondary" style={{ fontSize: 12 }}>{caseItem.drugName}</Text>
                          </Space>
                          <Space size={4}>
                            <ClockCircleOutlined style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }} />
                            <Text type="secondary" style={{ fontSize: 12 }}>{caseItem.completedAt.split(" ").slice(1).join(" ")}</Text>
                          </Space>
                        </Space>
                      </div>
                    </div>
                  ))}
                </div>
              ),
            }]}
          />
        </div>
      )}
    </div>
  );
}
