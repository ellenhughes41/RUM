import { useState } from "react";
import { Typography, Tag, Table, Descriptions, Select } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface QSet {
  meta: Record<string, string>;
  questions: { key: string; text: string; type: string; defaultNext: string }[];
  choices: { questionKey: string; key: string; text: string; allowFreeText: string; next: string }[];
}

const SETS: Record<string, QSet> = {
  "RWRX.1341": {
    meta: {
      externalKey: "repatha-evolocumab",
      title: "Repatha (evolocumab)",
      description: "Repatha (evolocumab)",
      attachmentRequired: "Y",
      contactPhone: "5555555555",
      startQuestionKey: "q_diagnosis",
      policyId: "RWRX.1341",
      policyVersion: "2026-08-15",
      sourceHash: "sha256:…",
    },
    questions: [
      { key: "q_diagnosis", text: "What is the patient's diagnosis?", type: "select_single", defaultNext: "q_ldl" },
      { key: "q_statin", text: "Has the patient tried a statin?", type: "select_single", defaultNext: "q_ldl" },
      { key: "q_ldl", text: "Most recent LDL-C value (mg/dL)", type: "free_text", defaultNext: "q_notes" },
      { key: "q_notes", text: "Additional clinical notes", type: "free_text", defaultNext: "END" },
    ],
    choices: [
      { questionKey: "q_diagnosis", key: "c_ascvd", text: "ASCVD", allowFreeText: "N", next: "q_statin" },
      { questionKey: "q_diagnosis", key: "c_hefh", text: "HeFH", allowFreeText: "N", next: "" },
      { questionKey: "q_statin", key: "c_statin_yes", text: "Yes", allowFreeText: "N", next: "" },
      { questionKey: "q_statin", key: "c_statin_no", text: "No", allowFreeText: "N", next: "" },
    ],
  },
  "RWRX.1207": {
    meta: {
      externalKey: "glp1-preferred",
      title: "Preferred GLP-1 Agonists",
      description: "Ozempic, Mounjaro, Trulicity",
      attachmentRequired: "N",
      contactPhone: "5555555555",
      startQuestionKey: "q_t2dm",
      policyId: "RWRX.1207",
      policyVersion: "2026-06-01",
      sourceHash: "sha256:…",
    },
    questions: [
      { key: "q_t2dm", text: "Does the patient have type 2 diabetes?", type: "select_single", defaultNext: "q_metformin" },
      { key: "q_metformin", text: "Has the patient tried metformin?", type: "select_single", defaultNext: "q_a1c" },
      { key: "q_a1c", text: "Most recent HbA1c (%)", type: "free_text", defaultNext: "END" },
    ],
    choices: [
      { questionKey: "q_t2dm", key: "c_t2dm_yes", text: "Yes", allowFreeText: "N", next: "" },
      { questionKey: "q_t2dm", key: "c_t2dm_no", text: "No", allowFreeText: "Y", next: "END" },
      { questionKey: "q_metformin", key: "c_met_yes", text: "Yes", allowFreeText: "N", next: "" },
      { questionKey: "q_metformin", key: "c_met_no", text: "No — contraindicated", allowFreeText: "Y", next: "" },
    ],
  },
};

const mono = (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>;
const nextCell = (v: string) => (v ? mono(v) : <Text type="secondary">(blank)</Text>);

const sectionTitle = (label: string) => (
  <Text style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4, display: "block", margin: "16px 0 8px" }}>
    {label}
  </Text>
);

export function QuestionSetPreview() {
  const [policyId, setPolicyId] = useState("RWRX.1341");
  const set = SETS[policyId];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 8 }}>
        <ThunderboltOutlined style={{ color: "#12275e" }} />
        <Text strong>Question set preview</Text>
        <Tag color="geekblue" style={{ marginLeft: "auto" }}>Electronic</Tag>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "12px 16px 16px" }}>
        <Text style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Policy</Text>
        <Select
          value={policyId}
          onChange={setPolicyId}
          style={{ width: "100%" }}
          showSearch
          optionFilterProp="label"
          options={Object.values(SETS).map((s) => ({
            value: s.meta.policyId,
            label: `${s.meta.policyId} — ${s.meta.title}`,
          }))}
        />

        {sectionTitle("Question set")}
        <Descriptions size="small" column={1} bordered labelStyle={{ width: 170 }}>
          {Object.entries(set.meta).map(([k, v]) => (
            <Descriptions.Item key={k} label={k}>{v}</Descriptions.Item>
          ))}
        </Descriptions>

        {sectionTitle(`Questions (${set.questions.length})`)}
        <Table
          size="small" pagination={false} rowKey="key" dataSource={set.questions}
          columns={[
            { title: "key", dataIndex: "key", render: mono },
            { title: "text", dataIndex: "text" },
            { title: "type", dataIndex: "type", render: (v) => <Tag>{v}</Tag> },
            { title: "defaultNext", dataIndex: "defaultNext", render: mono },
          ]}
        />

        {sectionTitle(`Choices (${set.choices.length})`)}
        <Table
          size="small" pagination={false} rowKey="key" dataSource={set.choices}
          columns={[
            { title: "questionKey", dataIndex: "questionKey", render: mono },
            { title: "key", dataIndex: "key", render: mono },
            { title: "text", dataIndex: "text" },
            { title: "allowFreeText", dataIndex: "allowFreeText" },
            { title: "next", dataIndex: "next", render: nextCell },
          ]}
        />
      </div>
    </div>
  );
}

const ANSWERS: { key: string; text: string; answer: string }[] = [
  { key: "q_diagnosis", text: "What is the patient's diagnosis?", answer: "ASCVD" },
  { key: "q_statin", text: "Has the patient tried a statin?", answer: "Yes" },
  { key: "q_ldl", text: "Most recent LDL-C value (mg/dL)", answer: "142" },
  { key: "q_notes", text: "Additional clinical notes", answer: "Atorvastatin 80 mg x 6 months, LDL remains above goal. Prior MI 2023." },
];

/** Document-style page generated from the electronic question-set answers. */
export function QuestionSetAnswersPage() {
  const m = SETS["RWRX.1341"].meta;
  return (
    <div className="p-8 text-gray-800">
      <div className="mb-4 border-b pb-3">
        <p className="text-xs text-gray-500">Electronic PA request · Question set responses</p>
        <h1 className="text-lg font-bold">{m.title}</h1>
        <p className="text-xs text-gray-500">Policy {m.policyId} · version {m.policyVersion}</p>
      </div>
      <ol className="space-y-4">
        {ANSWERS.map((a, i) => (
          <li key={a.key}>
            <p className="text-xs font-semibold">{i + 1}. {a.text}</p>
            <p className="text-sm mt-1 pl-4 border-l-2 border-gray-300">{a.answer}</p>
          </li>
        ))}
      </ol>
      <div className="text-right text-xs text-gray-400 mt-8">Generated from electronic answers</div>
    </div>
  );
}
