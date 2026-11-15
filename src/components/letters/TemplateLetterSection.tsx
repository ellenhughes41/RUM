import { useEffect, useMemo, useRef } from "react";
import { Button, Input, Select, Space, Typography } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import { useLetterTemplates, isLive, ALL_POLICIES, type LetterTemplate, type LetterTrigger } from "@/hooks/use-letter-templates";

const { Text } = Typography;

export function renderLetter(body: string, vars: Record<string, string>) {
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

const policyMatches = (t: LetterTemplate, policy?: string) =>
  !!policy && t.policy.split(",").map((s) => s.trim().toLowerCase()).includes(policy.toLowerCase());

interface Props {
  trigger: LetterTrigger;
  policyName?: string;
  vars: Record<string, string>;
  templateId?: string;
  letter: string;
  onChange: (v: { templateId?: string; letter: string }) => void;
}

/** Template select + editable "Letter Content" box, shared by decision popups. */
export function TemplateLetterSection({ trigger, policyName, vars, templateId, letter, onChange }: Props) {
  const { templates } = useLetterTemplates();
  const live = useMemo(
    () => templates.filter((t) => isLive(t)).sort((a, b) => Number(b.trigger === trigger) - Number(a.trigger === trigger)),
    [templates, trigger],
  );
  const build = (id?: string) => {
    const t = templates.find((x) => x.id === id);
    return t ? renderLetter(t.body, { ...vars, policy_name: vars.policy_name || t.policy }) : "";
  };
  const picked = useRef(false);
  useEffect(() => {
    if (picked.current || templateId) return;
    const forTrigger = live.filter((t) => t.trigger === trigger);
    const pick = forTrigger.find((t) => policyMatches(t, policyName)) ?? forTrigger.find((t) => t.policy === ALL_POLICIES);
    picked.current = true;
    if (pick) onChange({ templateId: pick.id, letter: build(pick.id) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div style={{ border: "1px solid #d9d9d9", borderRadius: 8, padding: 16, background: "#fff" }}>
        <Space size={8} style={{ marginBottom: 12, display: "flex" }}>
          <span style={{ color: "#12275e" }}><FileTextOutlined /></span>
          <Text strong style={{ fontSize: 14 }}>Letter template</Text>
        </Space>
        <Select
          showSearch style={{ width: "100%" }} placeholder="Select a letter template"
          value={templateId}
          onChange={(id) => onChange({ templateId: id, letter: build(id) })}
          filterOption={(i, o) => (o?.label as string).toLowerCase().includes(i.toLowerCase())}
          options={live.map((t) => ({ value: t.id, label: `${t.name} · ${t.trigger} · ${t.policy}` }))}
        />
      </div>
      {templateId && (
        <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid #f0f0f0" }}>
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>Letter Content</Text>
            <Button type="link" size="small" onClick={() => onChange({ templateId, letter: build(templateId) })}>Reset</Button>
          </div>
          <div style={{ padding: 16 }}>
            <Input.TextArea
              value={letter}
              onChange={(e) => onChange({ templateId, letter: e.target.value })}
              rows={12}
              style={{ fontFamily: "monospace", fontSize: 13, resize: "none" }}
            />
          </div>
        </div>
      )}
    </>
  );
}
