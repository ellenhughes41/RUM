import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Layout, Typography, Button, Input, Table, Tag, Space, Dropdown, Modal, Tooltip, message, Select, DatePicker, Popover } from "antd";
import dayjs, { Dayjs } from "dayjs";
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  CloseOutlined,
  LeftOutlined,
  EditOutlined,
  CopyOutlined,
  EyeOutlined,
  DeleteOutlined,
  UploadOutlined,
  FolderOpenOutlined,
  FileAddOutlined,
  MoreOutlined,
  RobotOutlined,
  LoadingOutlined,
  FileTextOutlined,
  WarningOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { AppLayout } from "@/components/layout/AppLayout";
import { PolicyViewer, getPolicyCategoriesForTesting } from "@/components/policies/PolicyViewer";
import { TestGuidelinesModal } from "@/components/policies/TestGuidelinesModal";
import { PolicyBuilderModal } from "@/components/policies/PolicyBuilderModal";
import { UpdateVersionModal, VersionUpdateData } from "@/components/policies/UpdateVersionModal";

import { toast } from "@/hooks/use-toast";
import { usePolicies, Policy } from "@/hooks/use-policies";
import { relinkPolicy } from "@/hooks/use-letter-templates";
import { format } from "date-fns";
import type { ColumnsType } from "antd/es/table";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export type { Policy };

const CARRIER_OPTIONS = [
  "Commercial",
  "Medicare Part D",
  "Medicare Advantage",
  "Medicaid",
  "Exchange / ACA",
  "Employer Group",
  "Federal Employee (FEHB)",
];

export default function PoliciesPage() {
  const { policies, setPolicies } = usePolicies();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [startInEditMode, setStartInEditMode] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isPublishFlow, setIsPublishFlow] = useState(false);
  const [policyToPublish, setPolicyToPublish] = useState<string | null>(null);
  const [testPolicyName, setTestPolicyName] = useState<string | null>(null);
  const [testPolicyCategories, setTestPolicyCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "published" | "terminated">("all");
  const [sortBy, setSortBy] = useState<"name" | "updated">("name");
  const [effectiveFrom, setEffectiveFrom] = useState<Dayjs | null>(null);
  const [carrierFilter, setCarrierFilter] = useState<string[]>([]);
  const [aiFilter, setAiFilter] = useState<"all" | "on" | "off">("all");
  const [builderInitialTab, setBuilderInitialTab] = useState<"edit" | "preview">("edit");
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [builderFileName, setBuilderFileName] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  useEffect(() => {
    const policyId = searchParams.get("policy");
    if (policyId && policies.some(p => p.id === policyId)) {
      setSelectedPolicy(policyId);
      setShowRuleEditor(true);
      setStartInEditMode(false);
      setSearchQuery("");
    }
  }, [searchParams, policies]);

  useEffect(() => {
    if (location.pathname === "/policies" && location.key && !searchParams.get("policy")) {
      setSelectedPolicy(null);
      setShowRuleEditor(false);
      setSearchQuery("");
    }
  }, [location.key, location.pathname, searchParams]);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<Policy | null>(null);
  const [isUpdateVersionModalOpen, setIsUpdateVersionModalOpen] = useState(false);
  const [dismissedDuplicateIds, setDismissedDuplicateIds] = useState<Set<string>>(new Set());

  const currentPolicy = useMemo(() =>
    policies.find(p => p.id === selectedPolicy),
    [policies, selectedPolicy]
  );

  const getPolicyDisplayStatus = (policy: Policy): "active" | "draft" | "published" | "terminated" => {
    if (policy.status === "draft") return "draft";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (policy.terminationDate && new Date(policy.terminationDate) < today) return "terminated";
    if (policy.effectiveDate && new Date(policy.effectiveDate) <= today) return "active";
    return "published";
  };

  const filteredPolicies = useMemo(() => {
    let filtered = searchQuery
      ? policies.filter(p =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : policies;
    if (statusFilter !== "all") {
      filtered = filtered.filter(p => getPolicyDisplayStatus(p) === statusFilter);
    }
    if (effectiveFrom) {
      filtered = filtered.filter(p => p.effectiveDate && !dayjs(p.effectiveDate).isBefore(effectiveFrom, "day"));
    }
    if (carrierFilter.length) {
      filtered = filtered.filter(p => {
        const plans = p.plans ?? "All";
        if (plans === "All") return true;
        return carrierFilter.some(c => plans.includes(c));
      });
    }
    if (aiFilter !== "all") {
      filtered = filtered.filter(p => (aiFilter === "on" ? !!p.aiEnabled : !p.aiEnabled));
    }
    if (sortBy === "name") {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }
    return filtered;
  }, [policies, searchQuery, statusFilter, sortBy, effectiveFrom, carrierFilter, aiFilter]);

  const moreFilterCount =
    (effectiveFrom ? 1 : 0) + carrierFilter.length + (aiFilter !== "all" ? 1 : 0);

  const policyChips: Array<{ key: string; label: string; onClose: () => void }> = [
    ...(effectiveFrom
      ? [{
          key: "effectiveFrom",
          label: `Effective on/after: ${effectiveFrom.format("MMM D, YYYY")}`,
          onClose: () => setEffectiveFrom(null),
        }]
      : []),
    ...carrierFilter.map((c) => ({
      key: `carrier:${c}`,
      label: `Carrier: ${c}`,
      onClose: () => setCarrierFilter(carrierFilter.filter((x) => x !== c)),
    })),
    ...(aiFilter !== "all"
      ? [{ key: "ai", label: `AI: ${aiFilter === "on" ? "On" : "Off"}`, onClose: () => setAiFilter("all") }]
      : []),
  ];

  const handleSelectPolicy = (id: string) => {
    setSelectedPolicy(id);
    setShowRuleEditor(true);
    setStartInEditMode(false);
    setSearchQuery("");
  };

  const handleBackToAllPolicies = () => {
    setSelectedPolicy(null);
    setShowRuleEditor(false);
  };

  const handleDuplicatePolicy = (policyId: string) => {
    const policy = policies.find(p => p.id === policyId);
    if (!policy) return;
    const baseName = policy.basePolicyName || policy.name;
    const versionLetters = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const existingVersions = policies
      .filter(p => p.basePolicyName === baseName || p.name === baseName)
      .map(p => p.versionLetter)
      .filter((v): v is string => !!v);
    const nextVersionLetter = versionLetters.find(letter => !existingVersions.includes(letter)) || "A";
    const newPolicyName = `${baseName} - Version ${nextVersionLetter}`;
    const newPolicy: Policy = {
      id: `${policy.id}-v${nextVersionLetter.toLowerCase()}-${Date.now()}`,
      name: newPolicyName,
      category: policy.category,
      status: "draft",
      versionLetter: nextVersionLetter,
      basePolicyName: baseName,
      isNew: true,
    };
    setPolicies(prev => [newPolicy, ...prev]);
    setSelectedPolicy(newPolicy.id);
    setShowRuleEditor(true);
    setStartInEditMode(true);
    toast({ title: "Policy version created", description: `"${newPolicyName}" created as a draft.` });
    const relinked = relinkPolicy(policy.name, newPolicyName);
    if (relinked > 0) {
      toast({
        title: "Letter templates re-linked",
        description: `${relinked} template${relinked === 1 ? "" : "s"} re-linked to ${newPolicyName}`,
      });
    }
  };

  const handlePublishPolicy = (policyId: string) => {
    setPolicies(prev => prev.map(p => p.id === policyId ? { ...p, status: "published" as const } : p));
    setSelectedPolicy(null);
    setShowRuleEditor(false);
    toast({ title: "Policy published", description: "The policy is now live and active." });
  };

  const handleStartPublishFlow = (policyId: string) => {
    const policy = policies.find(p => p.id === policyId);
    if (!policy) return;
    setPolicyToPublish(policyId);
    setIsPublishFlow(true);
    setTestPolicyName(policy.name);
    setTestPolicyCategories(getPolicyCategoriesForTesting(policy.name));
    setIsTestModalOpen(true);
  };

  const handlePublishAfterTest = () => {
    if (policyToPublish) handlePublishPolicy(policyToPublish);
    setIsPublishFlow(false);
    setPolicyToPublish(null);
    setIsTestModalOpen(false);
    setTestPolicyName(null);
    setTestPolicyCategories([]);
  };

  const handleUnpublishPolicy = (policyId: string) => {
    setPolicies(prev => prev.map(p => p.id === policyId ? { ...p, status: "draft" as const } : p));
    toast({ title: "Policy unpublished", description: "The policy is now in draft state." });
  };

  const handleDeletePolicy = (policy: Policy) => {
    setPolicyToDelete(policy);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeletePolicy = () => {
    if (!policyToDelete) return;
    setPolicies(prev => prev.filter(p => p.id !== policyToDelete.id));
    if (selectedPolicy === policyToDelete.id) {
      setSelectedPolicy(null);
      setShowRuleEditor(false);
    }
    toast({ title: "Policy deleted", description: `"${policyToDelete.name}" has been removed.` });
    setIsDeleteDialogOpen(false);
    setPolicyToDelete(null);
  };

  const handleVersionUpdate = (versionData: VersionUpdateData) => {
    if (!currentPolicy) return;
    const newVersionEntry = {
      version: versionData.newVersion,
      changedBy: "Current User",
      changedAt: new Date().toISOString().split("T")[0],
      summary: versionData.changeSummary,
    };
    setPolicies(prev =>
      prev.map(p =>
        p.id === currentPolicy.id
          ? { ...p, version: versionData.newVersion, versionHistory: [newVersionEntry, ...(p.versionHistory || [])] }
          : p
      )
    );
    setIsUpdateVersionModalOpen(false);
    toast({ title: "Policy version updated", description: `${currentPolicy.name} updated to version ${versionData.newVersion}` });
  };

  const handleAddPolicy = (policyName: string) => {
    const existingPolicy = policies.find(p => p.name.toLowerCase() === policyName.toLowerCase());
    if (existingPolicy) {
      toast({ title: "Policy already exists", description: `"${policyName}" is already in the library.` });
      return;
    }
    const newPolicy: Policy = {
      id: `new-${Date.now()}`,
      name: policyName,
      category: "General",
      status: "published",
      isNew: true,
      version: "1.0",
      versionHistory: [{ version: "1.0", changedBy: "Current User", changedAt: new Date().toISOString().split("T")[0], summary: "Initial policy creation" }],
    };
    setPolicies(prev => [newPolicy, ...prev]);
    setSelectedPolicy(null);
    setShowRuleEditor(false);
    toast({ title: "Policy added", description: `"${policyName}" has been added to the library.` });
  };

  const handleBrowseHardDrive = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setBuilderFileName(file.name);
        setIsAiProcessing(true);
        setTimeout(() => {
          setIsAiProcessing(false);
          navigate("/policies/new", { state: { fileName: file.name, prefill: true } });
        }, 5000);
      }
    };
    input.click();
  };

  const handleUploadFromGoogle = () => {
    setBuilderFileName("Drugs_for_Weight_Loss_Management.pdf");
    setIsAiProcessing(true);
    setTimeout(() => {
      setIsAiProcessing(false);
      navigate("/policies/new", { state: { fileName: "Drugs_for_Weight_Loss_Management.pdf", prefill: true } });
    }, 5000);
  };

  const handleCreateNew = () => navigate("/policies/new");

  const handleDuplicateFromMenu = () => {
    if (policies.length > 0) {
      handleDuplicatePolicy(policies[0].id);
    } else {
      toast({ title: "No policies available", description: "Create a policy first before duplicating." });
    }
  };

  const handleBuilderSave = (data: { name: string }) => {
    handleAddPolicy(data.name);
    setIsBuilderModalOpen(false);
    setBuilderFileName("");
  };

  const statusColorMap: Record<string, string> = {
    active: "green",
    published: "blue",
    draft: "default",
    terminated: "red",
  };

  const getRowActions = (policy: Policy): MenuProps["items"] => [
    { key: "edit", icon: <EditOutlined />, label: "Edit", onClick: () => handleSelectPolicy(policy.id) },
    { key: "duplicate", icon: <CopyOutlined />, label: "Duplicate", onClick: () => handleDuplicatePolicy(policy.id) },
    { type: "divider" as const },
    { key: "delete", icon: <DeleteOutlined />, label: "Delete", danger: true, onClick: () => handleDeletePolicy(policy) },
  ];

  const addMenuItems: MenuProps["items"] = [
    { key: "browse", icon: <FolderOpenOutlined />, label: "Browse Files", onClick: handleBrowseHardDrive },
    { key: "upload", icon: <UploadOutlined />, label: "Upload from Google", onClick: handleUploadFromGoogle },
    { type: "divider" },
    { key: "create", icon: <FileAddOutlined />, label: "Create New", onClick: handleCreateNew },
    { key: "duplicate", icon: <CopyOutlined />, label: "Duplicate Existing", onClick: handleDuplicateFromMenu },
  ];

  const columns: ColumnsType<Policy> = [
    {
      title: "Policy Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record: Policy) => (
        <Space>
          <a
            onClick={() => handleSelectPolicy(record.id)}
            style={{ fontWeight: 600, color: "rgba(0,0,0,0.88)" }}
          >
            {name}
          </a>
          {record.isDefault && (
            <SafetyCertificateOutlined style={{ color: "#fa8c16", fontSize: 16 }} />
          )}
          {record.duplicateOfId && !dismissedDuplicateIds.has(record.id) && (
            <Tag
              color="orange"
              icon={<WarningOutlined />}
              closable
              onClose={(e) => {
                e.preventDefault();
                setDismissedDuplicateIds(prev => new Set([...prev, record.id]));
                message.success("Duplicate flag dismissed");
              }}
            >
              Potential Duplicate
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 120,
      filters: [
        { text: "Active", value: "active" },
        { text: "Published", value: "published" },
        { text: "Draft", value: "draft" },
        { text: "Terminated", value: "terminated" },
      ],
      onFilter: (value, record) => getPolicyDisplayStatus(record) === value,
      render: (_: any, record: Policy) => {
        const status = getPolicyDisplayStatus(record);
        return (
          <Tag color={statusColorMap[status]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Tag>
        );
      },
    },
    {
      title: "Effective Date",
      dataIndex: "effectiveDate",
      key: "effectiveDate",
      width: 140,
      sorter: (a, b) => (a.effectiveDate || "").localeCompare(b.effectiveDate || ""),
      render: (date: string) => date ? format(new Date(date), "MMM d, yyyy") : "—",
    },
    {
      title: "Termination Date",
      dataIndex: "terminationDate",
      key: "terminationDate",
      width: 150,
      render: (date: string) => date ? format(new Date(date), "MMM d, yyyy") : "—",
    },
    {
      title: "Carriers",
      dataIndex: "plans",
      key: "plans",
      width: 80,
      render: (plans: string) => plans === "All" ? "All" : `${plans} carriers`,
    },
    {
      title: "AI",
      dataIndex: "aiEnabled",
      key: "aiEnabled",
      width: 60,
      align: "center",
      render: (enabled: boolean) =>
        enabled ? (
          <Tooltip title="AI review enabled">
            <RobotOutlined style={{ color: "#1677ff" }} />
          </Tooltip>
        ) : null,
    },
    {
      title: "",
      key: "actions",
      width: 50,
      render: (_: any, record: Policy) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Dropdown menu={{ items: getRowActions(record) }} trigger={["click"]}>
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <Layout style={{ height: "100vh" }}>

        <Content style={{ overflowY: "auto", padding: 24 }}>
          {selectedPolicy ? (
            <div style={{ maxWidth: 1096, margin: "0 auto" }}>
              <Button
                type="text"
                icon={<LeftOutlined />}
                onClick={handleBackToAllPolicies}
                style={{ marginBottom: 16 }}
              >
                Back to Policies
              </Button>
              <PolicyViewer
                policyName={currentPolicy?.name || ""}
                policyId={currentPolicy?.id}
                category={currentPolicy?.category || ""}
                status={currentPolicy?.status}
                effectiveDate={currentPolicy?.effectiveDate}
                terminationDate={currentPolicy?.terminationDate}
                currentVersion={currentPolicy?.version || "1.0"}
                onTestGuidelines={() => {
                  setTestPolicyName(currentPolicy?.name || null);
                  setTestPolicyCategories(getPolicyCategoriesForTesting(currentPolicy?.name));
                  setIsTestModalOpen(true);
                }}
                onDuplicate={() => { if (currentPolicy) handleDuplicatePolicy(currentPolicy.id); }}
                onPublish={() => currentPolicy && handleStartPublishFlow(currentPolicy.id)}
                onSaveDraft={() => {
                  if (currentPolicy) {
                    const today = new Date().toISOString().split('T')[0];
                    setPolicies(prev => prev.map(p => p.id === currentPolicy.id ? { ...p, lastUpdated: today } : p));
                    toast({ title: "Draft saved", description: `"${currentPolicy.name}" has been saved.` });
                  }
                }}
                onDelete={() => currentPolicy && handleDeletePolicy(currentPolicy)}
                onUpdateVersion={() => setIsUpdateVersionModalOpen(true)}
                initialEditing={startInEditMode}
                isDefaultPolicy={currentPolicy?.isDefault}
                duplicateOfId={currentPolicy?.duplicateOfId}
                duplicateOfName={currentPolicy?.duplicateOfId ? policies.find(p => p.id === currentPolicy.duplicateOfId)?.name : undefined}
                onNavigateToPolicy={(policyId) => handleSelectPolicy(policyId)}
              />
            </div>
          ) : (
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <Title level={4} style={{ margin: 0 }}>Clinical Policy Manager</Title>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Browse and manage clinical policies
                  </Text>
                </div>
                <Dropdown menu={{ items: addMenuItems }} trigger={["click"]}>
                  <Button icon={<PlusOutlined />}>Add Policy</Button>
                </Dropdown>
              </div>
              <Space wrap style={{ marginBottom: 12, width: "100%" }}>
                <Input
                  placeholder="Search policies by name..."
                  prefix={<SearchOutlined />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: 320 }}
                  allowClear
                />
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  style={{ width: 160 }}
                  options={[
                    { value: "all", label: "All statuses" },
                    { value: "draft", label: "Draft" },
                    { value: "published", label: "Published" },
                    { value: "active", label: "Active" },
                    { value: "terminated", label: "Terminated" },
                  ]}
                />
                <Popover
                  trigger="click"
                  placement="bottomLeft"
                  content={
                    <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>Effective on or after</Text>
                        <DatePicker
                          placeholder="Effective on or after"
                          value={effectiveFrom}
                          onChange={setEffectiveFrom}
                          style={{ width: "100%", marginTop: 4 }}
                        />
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>Carrier</Text>
                        <Select
                          mode="multiple"
                          allowClear
                          placeholder="Carrier"
                          value={carrierFilter}
                          onChange={setCarrierFilter}
                          style={{ width: "100%", marginTop: 4 }}
                          maxTagCount="responsive"
                          options={CARRIER_OPTIONS.map(c => ({ value: c, label: c }))}
                        />
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>AI</Text>
                        <Select
                          value={aiFilter}
                          onChange={setAiFilter}
                          style={{ width: "100%", marginTop: 4 }}
                          options={[
                            { value: "all", label: "AI: All" },
                            { value: "on", label: "AI: On" },
                            { value: "off", label: "AI: Off" },
                          ]}
                        />
                      </div>
                    </div>
                  }
                >
                  <Button icon={<FilterOutlined />}>
                    More Filters
                    {moreFilterCount > 0 && (
                      <Tag color="blue" style={{ marginLeft: 6, marginRight: 0 }}>{moreFilterCount}</Tag>
                    )}
                  </Button>
                </Popover>
                {policyChips.length > 0 && (
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      setEffectiveFrom(null);
                      setCarrierFilter([]);
                      setAiFilter("all");
                    }}
                  >
                    Reset
                  </Button>
                )}
              </Space>

              {policyChips.length > 0 && (
                <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {policyChips.map((c) => (
                    <Tag
                      key={c.key}
                      closable
                      closeIcon={<CloseOutlined style={{ fontSize: 10 }} />}
                      onClose={(e) => { e.preventDefault(); c.onClose(); }}
                      style={{ background: "#fff" }}
                    >
                      {c.label}
                    </Tag>
                  ))}
                </div>
              )}

              <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
                {filteredPolicies.length} {filteredPolicies.length === 1 ? 'policy' : 'policies'} found
              </Text>

              <Table
                columns={columns}
                dataSource={filteredPolicies}
                rowKey="id"
                pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}` }}
                size="middle"
                onRow={(record) => ({
                  style: { cursor: "pointer" },
                  onClick: () => handleSelectPolicy(record.id),
                })}
                locale={{
                  emptyText: searchQuery
                    ? `No policies found matching "${searchQuery}"`
                    : "No policies yet. Click \"Add Policy\" to get started.",
                }}
              />
            </div>
          )}
        </Content>
      </Layout>

      <TestGuidelinesModal
        isOpen={isTestModalOpen}
        onClose={() => {
          setIsTestModalOpen(false);
          setTestPolicyName(null);
          setTestPolicyCategories([]);
          setIsPublishFlow(false);
          setPolicyToPublish(null);
        }}
        onEditGuidelines={() => {
          setIsTestModalOpen(false);
          setTestPolicyCategories([]);
          setIsPublishFlow(false);
          setPolicyToPublish(null);
          setBuilderInitialTab("edit");
          setBuilderFileName("");
          setIsBuilderModalOpen(true);
        }}
        onAddPolicy={handleAddPolicy}
        onPublishPolicy={isPublishFlow ? handlePublishAfterTest : undefined}
        policyName={testPolicyName || currentPolicy?.name}
        policyCategories={testPolicyCategories}
        isPublishFlow={isPublishFlow}
      />

      {/* AI Processing Modal */}
      <Modal
        open={isAiProcessing}
        footer={null}
        closable={false}
        centered
        width={360}
      >
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                background: "#e6f4ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileTextOutlined style={{ fontSize: 32, color: "#1677ff" }} />
            </div>
            <div
              style={{
                position: "absolute",
                bottom: -4,
                right: -4,
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #1677ff, #36cfc9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LoadingOutlined style={{ color: "#fff", fontSize: 14 }} spin />
            </div>
          </div>
          <div>
            <Text strong>{builderFileName}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 13 }}>AI is scanning and pulling data...</Text>
          </div>
          <div style={{ marginTop: 16, height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
            <div
              style={{
                width: "66%",
                height: "100%",
                background: "linear-gradient(135deg, #1677ff, #36cfc9)",
                borderRadius: 3,
                animation: "pulse 2s infinite",
              }}
            />
          </div>
        </div>
      </Modal>

      <PolicyBuilderModal
        isOpen={isBuilderModalOpen}
        onClose={() => { setIsBuilderModalOpen(false); setBuilderFileName(""); }}
        onSave={handleBuilderSave}
        fileName={builderFileName}
        initialTab={builderInitialTab}
        existingPolicyNames={policies.map(p => p.name)}
      />


      <Modal
        title="Delete Policy"
        open={isDeleteDialogOpen}
        onCancel={() => { setIsDeleteDialogOpen(false); setPolicyToDelete(null); }}
        onOk={confirmDeletePolicy}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to delete "{policyToDelete?.name}"? This action cannot be undone.</p>
      </Modal>

      <UpdateVersionModal
        isOpen={isUpdateVersionModalOpen}
        onClose={() => setIsUpdateVersionModalOpen(false)}
        onSave={handleVersionUpdate}
        policyName={currentPolicy?.name || ""}
        currentVersion={currentPolicy?.version || "1.0"}
      />
    </AppLayout>
  );
}
