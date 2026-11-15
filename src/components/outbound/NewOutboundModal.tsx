import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Button, Input, Select, Typography, Space, Radio, Alert } from "antd";
import { UserOutlined, MedicineBoxOutlined, FolderOpenOutlined, SendOutlined, FileTextOutlined } from "@ant-design/icons";
import { type MailingAddress, mockMemberDirectory, mockDrugDirectory, mockPriorCases } from "@/data/mockIntakeCases";
import { useLetterTemplates, isLive } from "@/hooks/use-letter-templates";

const { Text } = Typography;

export interface NewOutboundDraft {
  memberId: string;
  drugId: string;
  memberName: string;
  memberNumber: string;
  carrier: string;
  drugName: string;
  caseId: string | null;
  method: "Fax" | "Letter";
  faxNumber: string;
  templateId: string;
  templateName: string;
  letter: string;
  address: MailingAddress | null;
  resend?: boolean;
}

const labelStyle: React.CSSProperties = { fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 };
const cardStyle: React.CSSProperties = { border: "1px solid #d9d9d9", borderRadius: 8, padding: 16, background: "#fff" };

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <Space size={8} style={{ marginBottom: 12, display: "flex" }}>
      <span style={{ color: "#12275e" }}>{icon}</span>
      <Text strong style={{ fontSize: 14 }}>{title}</Text>
    </Space>
  );
}

function renderLetter(body: string, vars: Record<string, string>) {
  const text = body
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h\d)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
  return text
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => vars[k] ?? m)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const emptyAddr: MailingAddress = { line1: "", line2: "", city: "", state: "", zip: "" };
const stateOk = (v: string) => /^[A-Za-z]{2}$/.test(v.trim());
const zipOk = (v: string) => /^\d{5}(-\d{4})?$/.test(v.trim());
const addrValid = (a: MailingAddress) => !!a.line1.trim() && !!a.city.trim() && stateOk(a.state) && zipOk(a.zip);
const faxValid = (v: string) => v.replace(/\D/g, "").length === 10;

export interface OutboundPrefill {
  memberId?: string;
  drugId?: string;
  caseId?: string;
  method?: "Fax" | "Letter";
  faxNumber?: string;
  templateId?: string;
  letter?: string;
  address?: MailingAddress;
  resend?: boolean;
}

export function NewOutboundModal({ open, onClose, onCreate, prefill }: { prefill?: OutboundPrefill; open: boolean; onClose: () => void; onCreate: (d: NewOutboundDraft) => void }) {
  const { templates } = useLetterTemplates();
  const [memberId, setMemberId] = useState<string>();
  const [drugId, setDrugId] = useState<string>();
  const [caseId, setCaseId] = useState<string>();
  const [method, setMethod] = useState<"Fax" | "Letter">();
  const [fax, setFax] = useState("");
  const [templateId, setTemplateId] = useState<string>();
  const [letter, setLetter] = useState("");
  const [addr, setAddr] = useState<MailingAddress>(emptyAddr);
  const resend = !!prefill?.resend;

  const member = mockMemberDirectory.find((m) => m.id === memberId);
  const drug = mockDrugDirectory.find((d) => d.id === drugId);
  const memberObj = member, drugObj = drug, caseIdState = caseId;

  useEffect(() => {
    if (!open || !prefill) return;
    setMemberId(prefill.memberId); setDrugId(prefill.drugId); setCaseId(prefill.caseId);
    setMethod(prefill.method); setFax(prefill.faxNumber ?? "");
    setAddr(prefill.address ?? mockMemberDirectory.find((m) => m.id === prefill.memberId)?.address ?? emptyAddr);
    setTemplateId(prefill.templateId); setLetter(prefill.letter ?? buildLetter(prefill.templateId, prefill));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill]);
  const cases = useMemo(() => (memberId ? mockPriorCases[memberId] ?? [] : []), [memberId]);
  const liveTemplates = templates
    .filter((t) => isLive(t))
    .sort((a, b) => Number(b.trigger === "Cold Outreach") - Number(a.trigger === "Cold Outreach"));

  const buildLetter = (id?: string, ov?: OutboundPrefill) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return "";
    const member = ov ? mockMemberDirectory.find((m) => m.id === ov.memberId) : memberObj;
    const drug = ov ? mockDrugDirectory.find((d) => d.id === ov.drugId) : drugObj;
    const caseId = ov ? ov.caseId : caseIdState;
    return renderLetter(t.body, {
      member_name: member?.name ?? "",
      member_id: member?.memberId ?? "",
      drug_name: drug ? `${drug.name} ${drug.strength}` : "",
      policy_name: t.policy,
      case_number: caseId ?? "",
      carrier: member?.carrier ?? "",
    });
  };
  const userPicked = useRef(false);
  const chooseTemplate = (id?: string) => { userPicked.current = true; setTemplateId(id); setLetter(buildLetter(id)); };

  const deliveryOk = (method === "Letter" && addrValid(addr)) || (method === "Fax" && faxValid(fax));
  const ready = !!member && !!drug && deliveryOk;
  const canSend = ready && !!templateId;

  useEffect(() => {
    if (!open || resend || prefill || !ready || templateId || userPicked.current) return;
    const cold = liveTemplates.filter((t) => t.trigger === "Cold Outreach");
    const pick = cold.find((t) => t.policy === "All policies") ?? cold[0];
    if (!pick) return;
    userPicked.current = true;
    setTemplateId(pick.id);
    setLetter(buildLetter(pick.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resend, prefill, ready, templateId]);

  const missing: string[] = [];
  if (!member) missing.push("member");
  if (!drug) missing.push("drug");
  if (!method) missing.push("delivery method");
  else if (method === "Fax" && !faxValid(fax)) missing.push("fax number");
  else if (method === "Letter" && !addrValid(addr)) missing.push("mailing address");
  if (ready && !templateId) missing.push("template");

  const reset = () => { setMemberId(undefined); setDrugId(undefined); setCaseId(undefined); setMethod(undefined); setFax(""); setTemplateId(undefined); setLetter(""); setAddr(emptyAddr); userPicked.current = false; };
  const close = () => { reset(); onClose(); };

  return (
    <Modal
      open={open}
      onCancel={close}
      title={resend ? "Resend communication" : "New outbound communication"}
      width={resend ? 600 : 860}
      styles={{ body: { maxHeight: "70vh", overflowY: "auto", paddingRight: 4 } }}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {canSend ? "Ready to send — will appear in the Outbound list." : `Waiting on: ${missing.join(", ")}.`}
          </Text>
          <Space>
            <Button onClick={close}>Cancel</Button>
            <Button
              type="primary"
              disabled={!canSend}
              style={canSend ? { background: "#12275e", borderColor: "#12275e", color: "#fff" } : undefined}
              onClick={() => {
                const t = templates.find((x) => x.id === templateId)!;
                onCreate({
                  memberId: member!.id, drugId: drug!.id, memberName: member!.name, memberNumber: member!.memberId, carrier: member!.carrier,
                  drugName: `${drug!.name} ${drug!.strength}`, caseId: caseId ?? null, method: method!, faxNumber: fax,
                  templateId: t.id, templateName: t.name, letter,
                  address: method === "Letter" ? addr : null, resend,
                });
                reset();
              }}
            >
              Send
            </Button>
          </Space>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {resend && member && (
          <div style={cardStyle}>
            <Text style={labelStyle}>Resending</Text>
            <Text strong>{templates.find((t) => t.id === templateId)?.name}</Text>
            <Text type="secondary" style={{ display: "block", fontSize: 12 }}>{member.name} · {drug ? `${drug.name} ${drug.strength}` : ""}{caseId ? ` · Case ${caseId}` : ""}</Text>
          </div>
        )}
        {!resend && (<>
        <div style={cardStyle}>
          <SectionHeader icon={<UserOutlined />} title="Member" />
          <Select
            showSearch allowClear placeholder="Search members by name, DOB or member ID" style={{ width: 420 }}
            value={memberId}
            onChange={(v) => { setMemberId(v); setCaseId(undefined); setAddr(mockMemberDirectory.find((m) => m.id === v)?.address ?? emptyAddr); }}
            filterOption={(i, o) => (o?.label as string).toLowerCase().includes(i.toLowerCase())}
            options={mockMemberDirectory.map((m) => ({ value: m.id, label: `${m.name} · ${m.dob} · ${m.memberId}` }))}
          />
        </div>

        <div style={cardStyle}>
          <SectionHeader icon={<MedicineBoxOutlined />} title="Drug" />
          <Select
            showSearch allowClear placeholder="Search Medispan (name or GPI)" style={{ width: 420 }}
            value={drugId} onChange={setDrugId}
            filterOption={(i, o) => (o?.label as string).toLowerCase().includes(i.toLowerCase())}
            options={mockDrugDirectory.map((d) => ({ value: d.id, label: `${d.name} · ${d.strength} · ${d.gpi14 ?? ""}` }))}
          />
        </div>

        <div style={cardStyle}>
          <SectionHeader icon={<FolderOpenOutlined />} title="Case (optional)" />
          <Select
            allowClear style={{ width: 420 }}
            disabled={!memberId}
            placeholder={memberId ? (cases.length ? "Link to a case on file" : "No cases on file for this member") : "Select a member first"}
            value={caseId} onChange={setCaseId}
            options={cases.map((c) => ({ value: c.caseNumber, label: `${c.caseNumber} · ${c.drug} · ${c.outcome}` }))}
          />
        </div>

        </>)}
        <div style={cardStyle}>
          <SectionHeader icon={<SendOutlined />} title="Delivery method" />
          <Radio.Group value={method} onChange={(e) => setMethod(e.target.value)}>
            <Radio value="Fax" disabled={resend && method !== "Fax"}>Fax</Radio>
            <Radio value="Letter" disabled={resend && method !== "Letter"}>Letter (mail)</Radio>
          </Radio.Group>
          {method === "Fax" && (
            <div style={{ marginTop: 12, width: 260 }}>
              <Text style={labelStyle}>Fax number</Text>
              <Input
                value={fax} onChange={(e) => setFax(e.target.value)} placeholder="(555) 555-0100"
                status={fax && !faxValid(fax) ? "error" : undefined}
              />
              {fax && !faxValid(fax) && <Text type="danger" style={{ fontSize: 12 }}>Enter a 10-digit fax number</Text>}
            </div>
          )}
          {method === "Letter" && (
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 520 }}>
              <div style={{ gridColumn: "1 / -1" }}><Text style={labelStyle}>Address line 1</Text><Input value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} status={!addr.line1.trim() ? "error" : undefined} /></div>
              <div style={{ gridColumn: "1 / -1" }}><Text style={labelStyle}>Address line 2 (optional)</Text><Input value={addr.line2} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} /></div>
              <div><Text style={labelStyle}>City</Text><Input value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} status={!addr.city.trim() ? "error" : undefined} /></div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ width: 80 }}><Text style={labelStyle}>State</Text><Input maxLength={2} value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value.toUpperCase() })} status={addr.state && !stateOk(addr.state) ? "error" : undefined} /></div>
                <div style={{ flex: 1 }}><Text style={labelStyle}>ZIP code</Text><Input value={addr.zip} onChange={(e) => setAddr({ ...addr, zip: e.target.value })} status={addr.zip && !zipOk(addr.zip) ? "error" : undefined} /></div>
              </div>
              {member?.address && <Text type="secondary" style={{ fontSize: 12, gridColumn: "1 / -1" }}>Prefilled from the member's address on file. <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }} onClick={() => setAddr(member.address!)}>Restore</Button></Text>}
            </div>
          )}
          {resend && <Text type="secondary" style={{ display: "block", marginTop: 12, fontSize: 12 }}>Resend uses the original delivery method.</Text>}
        </div>

        {!resend && (<>
        <div style={{ ...cardStyle, background: ready ? "#fff" : "#fafafa" }}>
          <SectionHeader icon={<FileTextOutlined />} title="Letter template" />
          <Select
            showSearch style={{ width: 420 }} disabled={!ready}
            placeholder={ready ? "Select a letter template" : "Complete member, drug and delivery method first"}
            value={templateId} onChange={chooseTemplate}
            filterOption={(i, o) => (o?.label as string).toLowerCase().includes(i.toLowerCase())}
            options={[...liveTemplates, ...templates.filter((t) => t.id === templateId && !liveTemplates.includes(t))].map((t) => ({ value: t.id, label: `${t.name} · ${t.trigger} · ${t.policy}${liveTemplates.includes(t) ? "" : " (no longer active)"}` }))}
          />
          {!ready && <Alert type="info" showIcon style={{ marginTop: 12 }} message="The template list unlocks once member, drug and delivery method are filled in." />}
        </div>

        {templateId && (
          <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid #f0f0f0" }}>
              <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>Letter Content</Text>
              <Button type="link" size="small" onClick={() => setLetter(buildLetter(templateId))}>Reset</Button>
            </div>
            <div style={{ padding: 16 }}>
              <Input.TextArea
                value={letter}
                onChange={(e) => setLetter(e.target.value)}
                rows={12}
                style={{ fontFamily: "monospace", fontSize: 13, resize: "none" }}
              />
            </div>
          </div>
        )}
        </>)}
      </div>
    </Modal>
  );
}
