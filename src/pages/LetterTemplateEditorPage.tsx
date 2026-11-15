import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Layout, Typography, Button, Input, Select, DatePicker, Space, Segmented, Tooltip, Divider, Tag, Alert, message } from "antd";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  CloudUploadOutlined,
  SearchOutlined,
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  CopyOutlined,
  LockOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import jsPDF from "jspdf";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePolicies } from "@/hooks/use-policies";
import {
  BASE_BODY,
  deriveStatus,
  duplicateTemplate,
  getTemplate,
  isEffectiveDateLocked,
  publishTemplate,
  upsertTemplate,
  useLetterTemplates,
  type LetterTemplate,
  type LetterTrigger,
  type LetterChannel,
} from "@/hooks/use-letter-templates";

const { Content } = Layout;
const { Title, Text } = Typography;

const LIST_SAMPLE = (items: string[]) => `<ul>${items.join("")}</ul>`;

const VARIABLE_GROUPS: { group: string; items: { token: string; label: string; sample: string }[] }[] = [
  {
    group: "Case & Member",
    items: [
      { token: "member_name", label: "Member name", sample: "Rosa Martinez" },
      { token: "member_id", label: "Member ID", sample: "884120397" },
      { token: "case_id", label: "Case ID", sample: "20481123" },
      { token: "drug_name", label: "Drug name", sample: "Ozempic (semaglutide)" },
      { token: "ndc", label: "NDC", sample: "0169-4181-13" },
      { token: "authorization_type", label: "Authorization type", sample: "Initial Authorization" },
      { token: "decision_reason", label: "Decision reason", sample: "Step therapy requirement not met" },
      { token: "case_priority", label: "Case priority", sample: "Standard" },
      { token: "due_date", label: "Due date", sample: "August 12, 2026" },
    ],
  },
  {
    group: "Policy & Decision",
    items: [
      { token: "policy_name", label: "Policy name", sample: "Preferred GLP-1 and GIP/GLP-1" },
      { token: "policy_number", label: "Policy number", sample: "CP-GLP1-0042" },
      {
        token: "denial_criteria",
        label: "Denial criteria (failed rules)",
        sample: LIST_SAMPLE([
          "<li>Trial of metformin ≥ 90 days<ul><li>No pharmacy claims on file</li><li>No chart documentation of trial</li></ul></li>",
          "<li>BMI ≥ 30 or ≥ 27 with comorbidity</li>",
        ]),
      },
      {
        token: "rfi_criteria",
        label: "RFI criteria (missing rules)",
        sample: LIST_SAMPLE([
          "<li>Recent chart notes<ul><li>Visit within last 6 months</li></ul></li>",
          "<li>HbA1c lab result</li>",
        ]),
      },
      {
        token: "denial_rfi_criteria",
        label: "Denial & RFI criteria (both failed and missing rules)",
        sample: LIST_SAMPLE([
          "<li>Trial of metformin ≥ 90 days<ul><li>No pharmacy claims on file</li><li>No chart documentation of trial</li></ul></li>",
          "<li>BMI ≥ 30 or ≥ 27 with comorbidity</li>",
          "<li>Recent chart notes<ul><li>Visit within last 6 months</li></ul></li>",
          "<li>HbA1c lab result</li>",
        ]),
      },
      { token: "denial_evidence", label: "Denial evidence", sample: "Chart note 08/02/2026, p. 4; Claims history 2024–2026" },
      { token: "authorization_length", label: "Authorization length", sample: "12 months" },
      { token: "policy_max_auth", label: "Policy max authorization", sample: "12 months" },
      { token: "decision_date", label: "Decision date", sample: "August 7, 2026" },
    ],
  },
];

const VARIABLES = VARIABLE_GROUPS.flatMap((g) => g.items);

const statusColor: Record<string, string> = { Active: "green", Draft: "blue", Inactive: "default" };

export default function LetterTemplateEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { policies } = usePolicies();
  useLetterTemplates(); // subscribe to store updates

  const existing = id ? getTemplate(id) : undefined;

  const [name, setName] = useState(existing?.name ?? searchParams.get("name") ?? "");
  const [trigger, setTrigger] = useState<LetterTrigger | undefined>(
    existing?.trigger ?? ((searchParams.get("trigger") as LetterTrigger) || undefined),
  );
  const [channel, setChannel] = useState<LetterChannel>(existing?.channel ?? "All");
  const [policies_, setPolicies] = useState<string[]>(
    existing?.policy ? existing.policy.split(", ").filter(Boolean) : ["All policies"],
  );
  const [effectiveDate, setEffectiveDate] = useState<Dayjs | null>(
    existing?.effectiveDate ? dayjs(existing.effectiveDate) : null,
  );
  const [terminationDate, setTerminationDate] = useState<Dayjs | null>(
    existing?.terminationDate ? dayjs(existing.terminationDate) : null,
  );
  const [body, setBody] = useState(existing?.body ?? BASE_BODY);
  const [mode, setMode] = useState<"Edit" | "Preview">("Edit");
  const [varSearch, setVarSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isPublished = !!existing?.published;
  const effLocked = existing ? isEffectiveDateLocked(existing) : false;
  const contentLocked = isPublished;
  const status = existing ? deriveStatus(existing) : "Draft";
  const predecessor = existing?.predecessorId ? getTemplate(existing.predecessorId) : undefined;

  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (editorRef.current && mode === "Edit" && editorRef.current.innerHTML !== body) {
      editorRef.current.innerHTML = body;
    }
  }, [mode]);

  const policyOptions = useMemo(
    () => [
      { value: "All policies", label: "All policies" },
      ...policies.map((p) => ({ value: p.name, label: p.name })),
    ],
    [policies],
  );

  const filteredGroups = useMemo(() => {
    const q = varSearch.toLowerCase();
    return VARIABLE_GROUPS.map((g) => ({
      group: g.group,
      items: g.items.filter(
        (v) => v.token.toLowerCase().includes(q) || v.label.toLowerCase().includes(q),
      ),
    })).filter((g) => g.items.length > 0);
  }, [varSearch]);

  const rememberSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const exec = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    setBody(editorRef.current?.innerHTML ?? "");
  };

  const insertToken = (token: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (savedRange.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
    document.execCommand("insertText", false, `{{${token}}}`);
    setBody(el.innerHTML);
    rememberSelection();
  };

  const previewHtml = useMemo(() => {
    let html = body;
    VARIABLES.forEach((v) => {
      html = html.split(`{{${v.token}}}`).join(v.sample.replace(/\n/g, "<br/>"));
    });
    return html;
  }, [body]);

  const buildTemplate = (): LetterTemplate | null => {
    if (!name.trim() || !trigger || !effectiveDate || policies_.length === 0) {
      setError("Name, Trigger, Policy and Effective Date are required.");
      return null;
    }
    return {
      id: existing?.id ?? `t-${Date.now()}`,
      name: name.trim(),
      trigger,
      channel,
      policy: policies_.join(", "),
      body,
      effectiveDate: effectiveDate.format("YYYY-MM-DD"),
      terminationDate: terminationDate ? terminationDate.format("YYYY-MM-DD") : undefined,
      published: existing?.published ?? false,
      publishedAt: existing?.publishedAt,
      predecessorId: existing?.predecessorId,
      createdAt: existing?.createdAt ?? dayjs().format("YYYY-MM-DD"),
    };
  };

  const handleSaveDraft = () => {
    const t = buildTemplate();
    if (!t) return;
    setError(null);
    upsertTemplate(t);
    message.success(isPublished ? "Dates updated" : "Draft saved");
    navigate("/letter-templates");
  };

  const handlePublish = () => {
    const t = buildTemplate();
    if (!t) return;
    const result = publishTemplate(t);
    if (!result.ok) {
      setError(result.error ?? "Unable to publish.");
      return;
    }
    setError(null);
    message.success(
      predecessor
        ? `Published. "${predecessor.name}" now terminates ${dayjs(t.effectiveDate).subtract(1, "day").format("MMM D, YYYY")}.`
        : "Template published",
    );
    navigate("/letter-templates");
  };

  const handleDuplicate = () => {
    if (!existing) return;
    const copy = duplicateTemplate(existing.id);
    if (copy) {
      message.success("Duplicate created as a draft");
      navigate(`/letter-templates/${copy.id}`);
    }
  };

  const handlePreviewPdf = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const container = document.createElement("div");
      container.style.width = "540px";
      container.style.fontSize = "12px";
      container.style.lineHeight = "1.6";
      container.style.fontFamily = "Times, serif";
      container.innerHTML = previewHtml;
      await doc.html(container, {
        x: 54,
        y: 54,
        width: 504,
        windowWidth: 540,
        autoPaging: "text",
      });
      doc.save(`${(name.trim() || "letter-template").replace(/[^\w-]+/g, "-").toLowerCase()}-preview.pdf`);
    } catch (e) {
      console.error("PDF generation failed", e);
      message.error("Could not generate the PDF preview.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AppLayout>
      <Layout style={{ height: "100vh" }}>
        <Content style={{ overflowY: "auto", padding: 24 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Space align="center">
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/letter-templates")} />
                <div>
                  <Space align="center">
                    <Title level={4} style={{ margin: 0 }}>
                      {existing ? (isPublished ? "Letter Template" : "Edit Letter Template") : "New Letter Template"}
                    </Title>
                    <Tag color={statusColor[status]}>{status}</Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 13, display: "block" }}>
                    Status is derived from the publish state and the effective/termination dates
                  </Text>
                </div>
              </Space>
              <Space>
                {isPublished && (
                  <Button icon={<CopyOutlined />} onClick={handleDuplicate}>
                    Duplicate
                  </Button>
                )}
                <Button icon={<SaveOutlined />} onClick={handleSaveDraft}>
                  {isPublished ? "Save Dates" : "Save Draft"}
                </Button>
                <Button icon={<FilePdfOutlined />} loading={generating} onClick={handlePreviewPdf}>
                  Preview
                </Button>
                {!isPublished && (
                  <Button type="primary" icon={<CloudUploadOutlined />} onClick={handlePublish}>
                    Publish
                  </Button>
                )}
              </Space>
            </div>

            {isPublished && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="This template is published"
                description="Publishing is one-way. Content and trigger/policy are locked — use Duplicate to create a successor version, then publish it. Termination date stays editable; effective date is editable only while still in the future."
              />
            )}
            {predecessor && !isPublished && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message={`Successor to "${predecessor.name}"`}
                description={`On publish, "${predecessor.name}" will be terminated on ${effectiveDate ? dayjs(effectiveDate).subtract(1, "day").format("MMM D, YYYY") : "the day before this template's effective date"}.`}
              />
            )}
            {error && (
              <Alert type="error" showIcon closable style={{ marginBottom: 16 }} message="Cannot publish" description={error} onClose={() => setError(null)} />
            )}

            {/* Header fields */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #f0f0f0",
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
              }}
            >
              <Field label="Name" required>
                <Input value={name} onChange={(e) => setName(e.target.value)} disabled={contentLocked} placeholder="e.g. Standard Denial Notice" />
              </Field>
              <Field label="Trigger" required>
                <Select
                  value={trigger}
                  onChange={(v: LetterTrigger) => {
                    setTrigger(v);
                    if (v === "Cold Outreach" && channel === "All") setChannel("Fax");
                  }}
                  disabled={contentLocked}
                  placeholder="Select trigger"
                  style={{ width: "100%" }}
                  options={[
                    { value: "Denied", label: "Denied" },
                    { value: "RFI Requested", label: "RFI Requested" },
                    { value: "Closed – RFI Expired", label: "Closed – RFI Expired" },
                    { value: "Cold Outreach", label: "Cold Outreach" },
                    { value: "Dismissed as Unnecessary", label: "Dismissed as Unnecessary" },
                  ]}
                />
              </Field>
              <Field label="Channel" required>
                <Select
                  value={channel}
                  onChange={setChannel}
                  disabled={contentLocked}
                  style={{ width: "100%" }}
                  options={[
                    { value: "Fax", label: "Fax" },
                    { value: "Letter", label: "Letter" },
                    { value: "All", label: "All" },
                  ]}
                />
              </Field>
              <Field label="Policy" required>
                <Select
                  showSearch
                  mode="multiple"
                  allowClear
                  value={policies_}
                  onChange={(vals: string[]) => {
                    const last = vals[vals.length - 1];
                    if (last === "All policies") setPolicies(["All policies"]);
                    else setPolicies(vals.filter((v) => v !== "All policies"));
                  }}
                  disabled={contentLocked}
                  placeholder="Select one or more policies"
                  style={{ width: "100%" }}
                  optionFilterProp="label"
                  options={policyOptions}
                />
              </Field>
              <Field label="Effective Date" required hint={effLocked ? "Locked — already in effect" : undefined}>
                <DatePicker
                  value={effectiveDate}
                  onChange={setEffectiveDate}
                  disabled={effLocked}
                  suffixIcon={effLocked ? <LockOutlined /> : undefined}
                  style={{ width: "100%" }}
                />
              </Field>
              <Field label="Termination Date">
                <DatePicker
                  value={terminationDate}
                  onChange={setTerminationDate}
                  style={{ width: "100%" }}
                  placeholder="Open-ended"
                />
              </Field>
            </div>

            {/* Body */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>
              <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderBottom: "1px solid #f0f0f0",
                    gap: 8,
                  }}
                >
                  <Space size={4}>
                    <Tooltip title="Bold">
                      <Button type="text" size="small" icon={<BoldOutlined />} disabled={mode === "Preview" || contentLocked} onClick={() => exec("bold")} />
                    </Tooltip>
                    <Tooltip title="Italic">
                      <Button type="text" size="small" icon={<ItalicOutlined />} disabled={mode === "Preview" || contentLocked} onClick={() => exec("italic")} />
                    </Tooltip>
                    <Tooltip title="Underline">
                      <Button type="text" size="small" icon={<UnderlineOutlined />} disabled={mode === "Preview" || contentLocked} onClick={() => exec("underline")} />
                    </Tooltip>
                    <Divider type="vertical" />
                    <Tooltip title="Bulleted list">
                      <Button type="text" size="small" icon={<UnorderedListOutlined />} disabled={mode === "Preview" || contentLocked} onClick={() => exec("insertUnorderedList")} />
                    </Tooltip>
                    <Tooltip title="Numbered list">
                      <Button type="text" size="small" icon={<OrderedListOutlined />} disabled={mode === "Preview" || contentLocked} onClick={() => exec("insertOrderedList")} />
                    </Tooltip>
                  </Space>
                  <Segmented value={mode} onChange={(v) => setMode(v as "Edit" | "Preview")} options={["Edit", "Preview"]} />
                </div>

                {mode === "Edit" ? (
                  <div
                    ref={editorRef}
                    contentEditable={!contentLocked}
                    suppressContentEditableWarning
                    onInput={(e) => setBody((e.target as HTMLDivElement).innerHTML)}
                    onKeyUp={rememberSelection}
                    onMouseUp={rememberSelection}
                    onBlur={rememberSelection}
                    dangerouslySetInnerHTML={{ __html: body }}
                    style={{
                      minHeight: 460,
                      padding: 24,
                      outline: "none",
                      fontSize: 14,
                      lineHeight: 1.7,
                      background: contentLocked ? "#fafafa" : undefined,
                    }}
                  />
                ) : (
                  <div style={{ background: "#f5f5f5", padding: 24 }}>
                    <div
                      style={{
                        background: "#fff",
                        margin: "0 auto",
                        maxWidth: 680,
                        minHeight: 700,
                        padding: "64px 72px",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
                        fontSize: 14,
                        lineHeight: 1.8,
                        fontFamily: "Georgia, 'Times New Roman', serif",
                      }}
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                    <Text type="secondary" style={{ display: "block", textAlign: "center", marginTop: 12, fontSize: 12 }}>
                      Preview uses sample values for all merge variables
                    </Text>
                  </div>
                )}
              </div>

              {/* Variable library */}
              <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 8, padding: 12, position: "sticky", top: 0 }}>
                <Text strong style={{ display: "block", marginBottom: 8 }}>
                  Variable Library
                </Text>
                <Input
                  size="small"
                  prefix={<SearchOutlined />}
                  placeholder="Search variables"
                  value={varSearch}
                  onChange={(e) => setVarSearch(e.target.value)}
                  allowClear
                  style={{ marginBottom: 8 }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 460, overflowY: "auto" }}>
                  {filteredGroups.map((g) => (
                    <div key={g.group} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div
                        style={{
                          fontSize: 11,
                          letterSpacing: 0.6,
                          textTransform: "uppercase",
                          color: "rgba(0,0,0,0.45)",
                          marginTop: 8,
                        }}
                      >
                        {g.group}
                      </div>
                      {g.items.map((v) => {
                    const disabled = mode === "Preview" || contentLocked;
                    return (
                      <button
                        key={v.token}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => insertToken(v.token)}
                        disabled={disabled}
                        style={{
                          textAlign: "left",
                          border: "1px solid #f0f0f0",
                          borderRadius: 6,
                          background: "#fafafa",
                          padding: "6px 8px",
                          cursor: disabled ? "not-allowed" : "pointer",
                          opacity: disabled ? 0.5 : 1,
                        }}
                      >
                        <div style={{ fontFamily: "monospace", fontSize: 12, color: "#12275e" }}>{`{{${v.token}}}`}</div>
                        <div style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>{v.label}</div>
                      </button>
                    );
                      })}
                    </div>
                  ))}
                  {filteredGroups.length === 0 && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      No variables match your search.
                    </Text>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Content>
      </Layout>
    </AppLayout>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 13, color: "rgba(0,0,0,0.45)", marginBottom: 4 }}>
        {label}
        {required && <span style={{ color: "#ff4d4f" }}> *</span>}
        {hint && <span style={{ marginLeft: 6, fontSize: 12 }}>({hint})</span>}
      </div>
      {children}
    </div>
  );
}
