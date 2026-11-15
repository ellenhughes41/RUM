import { useState } from "react";
import { Plus, Trash2, Sparkles, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight, Pencil, Table2, X, Pill } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StructurePanel } from "./StructurePanel";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────

export interface RuleCard {
  id: string;
  title: string;
  aiPrompt: string;
  tags?: string[];
}

// ── Tag suggestion logic ──────────────────────────────
const CRITERIA_TAGS = [
  "Age",
  "Diagnosis",
  "BMI",
  "Step Therapy",
  "Prescriber",
  "Lab / Test",
  "Dosing",
  "Duration",
  "Exclusion",
  "Comorbidity",
  "Lifestyle",
  "Documentation",
  "Quantity Limit",
];

function suggestTags(ruleText: string): string[] {
  const t = ruleText.toLowerCase();
  const tags: string[] = [];
  if (/\bage\b|years? (of age|or older)|pediatric|adolescent/.test(t)) tags.push("Age");
  if (/diagnos|indication|confirmed/.test(t)) tags.push("Diagnosis");
  if (/bmi|body mass|kg\/m/.test(t)) tags.push("BMI");
  if (/step.?therap|trial.?(and|of)|failure|inadequate.?response|prior.?(use|therapy|treatment)|intolerance|contraindication/.test(t)) tags.push("Step Therapy");
  if (/prescri|specialist|dermatolog|neurolog|pulmonolog|gastroenterolog|rheumatolog|allergist|immunologist/.test(t)) tags.push("Prescriber");
  if (/lab|test|biopsy|imaging|fibroscan|ahi|eosinophil|ppd|igra|polysomnograph/.test(t)) tags.push("Lab / Test");
  if (/dos(e|ing)|mg|tablet|strength|concentration/.test(t)) tags.push("Dosing");
  if (/duration|month|week|year|interval/.test(t)) tags.push("Duration");
  if (/exclu|must not|not.?receiv|contraind|concomi/.test(t)) tags.push("Exclusion");
  if (/comorbid|hypertension|diabetes|cardiovascular|dyslipid/.test(t)) tags.push("Comorbidity");
  if (/lifestyle|diet|physical.?activity|exercise|alcohol|calorie/.test(t)) tags.push("Lifestyle");
  if (/document|chart|attestat|record|provid/.test(t)) tags.push("Documentation");
  if (/quantit|supply|refill|limit/.test(t)) tags.push("Quantity Limit");
  return tags;
}

export interface TableCategoryCard {
  id: string;
  title: string;
  columns: string[];
  rows: string[][];
}

export interface ConditionalSection {
  id: string;
  type: "conditional";
  title?: string;
  requiredToPass: number;
  rules: RuleCard[];
  tables?: TableCategoryCard[];
  tags?: string[];
  aiPrompt?: string;
  conditionals?: ConditionalSection[];
}

export interface DiagnosisSection {
  id: string;
  name: string;
  kind?: "diagnosis" | "drug-group" | "all";
  rules: RuleCard[];
  tables?: TableCategoryCard[];
  conditionals: ConditionalSection[];
  drugGroups?: DiagnosisSection[];
}

export interface AuthTypeSection {
  id: string;
  type: "initial" | "reauthorization" | "discontinuation";
  label: string;
  diagnoses: DiagnosisSection[];
  rules: RuleCard[];
  conditionals: ConditionalSection[];
}

export interface PolicyCriteria {
  rules: RuleCard[];
  authTypes: AuthTypeSection[];
}

// ── Helpers ────────────────────────────────────────────

const uid = () => `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const defaultCriteria: PolicyCriteria = {
  rules: [],
  authTypes: [
    { id: "initial", type: "initial", label: "Initial Authorization", diagnoses: [], rules: [], conditionals: [] },
    { id: "reauthorization", type: "reauthorization", label: "Reauthorization", diagnoses: [], rules: [], conditionals: [] },
  ],
};

// ── Colors ─────────────────────────────────────────────

const COLORS = {
  initial: { accent: "#0F52BA", light: "#EBF0FA", badge: "#D6E4FF" },
  reauth: { accent: "#0D7A5F", light: "#EAFAF5", badge: "#C6F0E4" },
  discont: { accent: "#B45309", light: "#FFF7ED", badge: "#FDE68A" },
  diag: { accent: "#6B46C1", light: "#F5F0FF", badge: "#5B21B6" },
  drug: { accent: "#0E7490", light: "#ECFEFF", badge: "#155E75" },
  group: { accent: "#B45309", light: "#FFFBEB", badge: "#FEF3C7" },
  rule: { accent: "#374151", light: "#F9FAFB", badge: "#F3F4F6" },
};

// Keep export for StructurePanel compatibility
export const levelColors = {
  authInitial: { border: "border-[#0F52BA]/15", bg: "bg-[#EBF0FA]", text: "text-[#0F52BA]", icon: "text-[#0F52BA]", dot: "bg-[#0F52BA]" },
  authReauth: { border: "border-[#0D7A5F]/15", bg: "bg-[#EAFAF5]", text: "text-[#0D7A5F]", icon: "text-[#0D7A5F]", dot: "bg-[#0D7A5F]" },
  authDiscont: { border: "border-[#B45309]/15", bg: "bg-[#FFF7ED]", text: "text-[#B45309]", icon: "text-[#B45309]", dot: "bg-[#B45309]" },
  diagnosis: { border: "border-[#6B46C1]/20", bg: "bg-[#F5F0FF]", text: "text-[#6B46C1]", dot: "bg-[#6B46C1]" },
  criteria: { border: "border-border", bg: "bg-muted/30" },
  conditional: { border: "border-[#B45309]/20", bg: "bg-[#FFFBEB]", text: "text-[#B45309]", dot: "bg-[#B45309]" },
};

// ── Legend ──────────────────────────────────────────────

function Legend() {
  const items = [
    { color: COLORS.initial.accent, label: "Initial Auth" },
    { color: COLORS.reauth.accent, label: "Reauth" },
    { color: COLORS.discont.accent, label: "Other" },
    { color: COLORS.diag.accent, label: "Diagnosis" },
    { color: COLORS.drug.accent, label: "Drug Group" },
    { color: COLORS.group.accent, label: "Rule Group (N of M)" },
  ];
  return (
    <div className="flex items-center gap-5 rounded-lg border border-border bg-card px-4 py-2.5 mb-6 text-xs text-muted-foreground">
      <span className="font-semibold text-foreground mr-1">Legend</span>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

// ── TableCategoryRenderer (inside conditional) ────────

function TableCategoryRenderer({ table, onUpdate, onDelete }: {
  table: TableCategoryCard;
  onUpdate: (t: TableCategoryCard) => void;
  onDelete: () => void;
}) {
  const addColumn = () => onUpdate({ ...table, columns: [...table.columns, `Column ${table.columns.length + 1}`], rows: table.rows.map(r => [...r, ""]) });
  const removeColumn = (ci: number) => {
    if (table.columns.length <= 1) return;
    onUpdate({ ...table, columns: table.columns.filter((_, i) => i !== ci), rows: table.rows.map(r => r.filter((_, i) => i !== ci)) });
  };
  const addRow = () => onUpdate({ ...table, rows: [...table.rows, table.columns.map(() => "")] });
  const removeRow = (ri: number) => {
    if (table.rows.length <= 1) return;
    onUpdate({ ...table, rows: table.rows.filter((_, i) => i !== ri) });
  };

  return (
    <div className="group rounded-md border border-[#6366f1]/20 bg-white p-3 space-y-2">
      <div className="flex items-start gap-2">
        <span className="text-[12px] font-bold tracking-wider uppercase px-2 py-0.5 rounded shrink-0 mt-1" style={{ color: "#6366f1", background: "#EEF2FF" }}>
          TABLE
        </span>
        <Textarea
          value={table.title}
          onChange={(e) => onUpdate({ ...table, title: e.target.value })}
          placeholder="Table title..."
          className="min-h-0 text-sm font-medium flex-1 border-none bg-transparent px-1 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none overflow-hidden"
          style={{ whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "anywhere" }}
          rows={1}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = target.scrollHeight + 'px';
          }}
          ref={(el) => {
            if (el) {
              el.style.height = 'auto';
              el.style.height = el.scrollHeight + 'px';
            }
          }}
        />
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-auto rounded border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#6366f1]/[0.06]">
              {table.columns.map((col, ci) => (
                <th key={ci} className="relative border-r border-border last:border-r-0">
                  <div className="flex items-center">
                    <Input
                      value={col}
                      onChange={(e) => { const c = [...table.columns]; c[ci] = e.target.value; onUpdate({ ...table, columns: c }); }}
                      className="h-7 border-none bg-transparent text-xs font-semibold px-2 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
                    />
                    {table.columns.length > 1 && (
                      <button onClick={() => removeColumn(ci)} className="px-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-8 bg-[#6366f1]/[0.06]">
                <button onClick={addColumn} className="p-1 text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3" /></button>
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr key={ri} className="border-t border-border">
                {row.map((cell, ci) => (
                  <td key={ci} className="border-r border-border last:border-r-0">
                    <Input
                      value={cell}
                      onChange={(e) => { const r = table.rows.map((rr, i) => i === ri ? rr.map((c, j) => j === ci ? e.target.value : c) : rr); onUpdate({ ...table, rows: r }); }}
                      className="h-7 border-none bg-transparent text-xs px-2 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
                      placeholder="..."
                    />
                  </td>
                ))}
                <td className="w-8 text-center">
                  {table.rows.length > 1 && (
                    <button onClick={() => removeRow(ri)} className="p-1 text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addRow} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <Plus className="h-3 w-3" /> Add row
      </button>
    </div>
  );
}

// ── RuleGroupOptions (checkboxes inside a conditional) ─

function RuleGroupOptions({ section, onUpdate, depth = 0 }: {
  section: ConditionalSection;
  onUpdate: (s: ConditionalSection) => void;
  depth?: number;
}) {
  const totalOptions = section.rules.length + (section.tables?.length || 0) + (section.conditionals?.length || 0);

  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-2 mb-2.5 pb-2.5 border-b border-border">
        <span
          className="text-[12px] font-bold tracking-wider uppercase px-2 py-0.5 rounded flex items-center gap-1"
          style={{ color: COLORS.group.accent, background: COLORS.group.badge }}
        >
          <input
            type="number"
            min={1}
            max={totalOptions || 1}
            value={section.requiredToPass}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1) onUpdate({ ...section, requiredToPass: val });
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-10 h-7 text-center text-xs font-bold bg-white border-2 border-amber-400 rounded-md outline-none focus:ring-2 focus:ring-amber-300"
          />
          of {totalOptions} required
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {section.rules.map((opt) => (
          <div
            key={opt.id}
            className="flex items-center gap-2.5 py-2.5 px-3 rounded-md border border-border bg-card text-[13px]"
          >
            <Input
              value={opt.title}
              onChange={(e) => onUpdate({ ...section, rules: section.rules.map(r => r.id === opt.id ? { ...r, title: e.target.value } : r) })}
              placeholder="Option text..."
              className="flex-1 h-auto border-0 bg-transparent px-0 py-0 text-[13px] leading-snug focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <button
              onClick={() => onUpdate({ ...section, rules: section.rules.filter(r => r.id !== opt.id) })}
              className="p-0.5 rounded text-muted-foreground/40 hover:text-destructive transition-all"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {(section.tables || []).map((tbl) => (
          <TableCategoryRenderer
            key={tbl.id}
            table={tbl}
            onUpdate={(t) => onUpdate({ ...section, tables: (section.tables || []).map(old => old.id === tbl.id ? t : old) })}
            onDelete={() => onUpdate({ ...section, tables: (section.tables || []).filter(t => t.id !== tbl.id) })}
          />
        ))}
        {/* Nested Rule Groups */}
        {(section.conditionals || []).map((nestedCond, idx) => (
          <RuleItem
            key={nestedCond.id}
            rule={{ id: nestedCond.id, title: nestedCond.title || "", aiPrompt: "", tags: nestedCond.tags }}
            index={section.rules.length + (section.tables?.length || 0) + idx}
            isGroup
            conditionalSection={nestedCond}
            onConditionalUpdate={(c) => onUpdate({ ...section, conditionals: (section.conditionals || []).map((old, i) => (i === idx ? c : old)) })}
            onUpdate={(r) => onUpdate({ ...section, conditionals: (section.conditionals || []).map((old, i) => i === idx ? { ...old, title: r.title, tags: r.tags } : old) })}
            onDelete={() => onUpdate({ ...section, conditionals: (section.conditionals || []).filter((_, i) => i !== idx) })}
          />
        ))}
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => onUpdate({ ...section, rules: [...section.rules, { id: uid(), title: "", aiPrompt: "" }] })}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors border border-dashed border-border rounded-md px-3 py-1.5 cursor-pointer bg-transparent"
          >
            <Plus className="h-3 w-3" /> Add Option
          </button>
          <button
            onClick={() => onUpdate({ ...section, tables: [...(section.tables || []), { id: uid(), title: "", columns: ["Column 1", "Column 2"], rows: [["", ""]] }] })}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors border border-dashed rounded-md px-3 py-1.5 cursor-pointer bg-transparent"
            style={{ color: "#6366f1", borderColor: "#6366f1" }}
          >
            <Table2 className="h-3 w-3" /> Add Table Category
          </button>
          <button
            onClick={() => onUpdate({ ...section, conditionals: [...(section.conditionals || []), { id: uid(), type: "conditional", requiredToPass: 1, rules: [], tags: [] }] })}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors border border-dashed rounded-md px-3 py-1.5 cursor-pointer bg-transparent"
            style={{ color: "#d97706", borderColor: "#fde68a" }}
          >
            <Plus className="h-3 w-3" /> Rule Group (N of M)
          </button>
        </div>
      </div>
    </div>
  );
}

// ── RuleItem (single rule or group header) ─────────────

function RuleItem({ rule, onUpdate, onDelete, index, isGroup, conditionalSection, onConditionalUpdate }: {
  rule: RuleCard;
  onUpdate: (r: RuleCard) => void;
  onDelete: () => void;
  index: number;
  isGroup?: boolean;
  conditionalSection?: ConditionalSection;
  onConditionalUpdate?: (s: ConditionalSection) => void;
}) {
  const [expanded, setExpanded] = useState(isGroup);
  const [showPrompt, setShowPrompt] = useState(!!rule.aiPrompt || !!(conditionalSection?.aiPrompt));
  const [editingTag, setEditingTag] = useState(false);
  const [editingGroupTitle, setEditingGroupTitle] = useState(false);
  return (
    <div className="flex gap-0 relative">
      {/* Connector line */}
      <div className="w-7 flex flex-col items-center shrink-0 pt-[18px]">
        <div className="w-0.5 flex-1 rounded-full" style={{ background: "#E5E7EB" }} />
      </div>

      <div
        className={cn("flex-1 min-w-0 mb-2 rounded-lg border")}
        style={{
          borderColor: isGroup ? "#FDE68A" : "#E5E7EB",
          background: isGroup ? COLORS.group.light : "#FFFFFF",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div
          className={cn("flex items-start gap-2.5 px-4 py-3", isGroup && "cursor-pointer")}
          onClick={() => isGroup && setExpanded(!expanded)}
        >
          {isGroup ? (
           <div className="flex-1 min-w-0 flex items-start gap-2" onClick={(e) => e.stopPropagation()}>
              <span
                className="text-[12px] font-bold tracking-wide px-[7px] py-0.5 rounded shrink-0 mt-1.5"
                style={{ color: COLORS.rule.accent, background: COLORS.rule.badge, fontFamily: "monospace" }}
              >
                R{index + 1}
              </span>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <Textarea
                  value={rule.title}
                  onChange={(e) => {
                    onUpdate({ ...rule, title: e.target.value });
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = 'auto';
                    t.style.height = t.scrollHeight + 'px';
                  }}
                  className="min-h-0 w-full border-0 bg-transparent px-0 py-0 text-[13.5px] leading-relaxed font-medium focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                  style={{ whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "anywhere", overflow: "hidden" }}
                  placeholder="Name Rule Group"
                  rows={1}
                  onInput={(e) => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = 'auto';
                    t.style.height = t.scrollHeight + 'px';
                  }}
                  ref={(el) => {
                    if (el) {
                      requestAnimationFrame(() => {
                        el.style.height = 'auto';
                        el.style.height = el.scrollHeight + 'px';
                      });
                    }
                  }}
                />
                <div className="flex flex-wrap gap-1 items-center">
                  {(rule.tags || []).map((t, tIdx) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-0.5 text-[12px] font-semibold rounded px-1.5 py-0.5 bg-accent/10 text-accent"
                    >
                      {t}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate({ ...rule, tags: (rule.tags || []).filter((_, i) => i !== tIdx) });
                        }}
                        className="ml-0.5 hover:text-destructive transition-colors"
                        title="Remove tag"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {editingTag ? (
                    <select
                      autoFocus
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          const newTags = [...(rule.tags || []), e.target.value];
                          onUpdate({ ...rule, tags: newTags });
                        }
                        setEditingTag(false);
                      }}
                      onBlur={() => setEditingTag(false)}
                      className="text-[12px] font-semibold rounded px-1.5 py-0.5 border border-accent/30 bg-accent/5 text-accent outline-none cursor-pointer shrink-0"
                    >
                      <option value="">Select tag...</option>
                      {CRITERIA_TAGS.filter(t => !(rule.tags || []).includes(t)).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingTag(true); }}
                      className="text-[12px] rounded px-1 py-0.5 text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                      title="Add tag"
                    >
                      + tag
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <span
                className="text-[12px] font-bold tracking-wide px-[7px] py-0.5 rounded shrink-0 mt-0.5"
                style={{ color: COLORS.rule.accent, background: COLORS.rule.badge, fontFamily: "monospace" }}
              >
                R{index + 1}
              </span>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <Textarea
                  value={rule.title}
                  onChange={(e) => {
                    onUpdate({ ...rule, title: e.target.value });
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = 'auto';
                    t.style.height = t.scrollHeight + 'px';
                  }}
                  className="min-h-0 w-full border-0 bg-transparent px-0 py-0 text-[13.5px] leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                  style={{ whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "anywhere", overflow: "hidden" }}
                  placeholder="Rule description..."
                  rows={1}
                  onInput={(e) => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = 'auto';
                    t.style.height = t.scrollHeight + 'px';
                  }}
                  ref={(el) => {
                    if (el) {
                      requestAnimationFrame(() => {
                        el.style.height = 'auto';
                        el.style.height = el.scrollHeight + 'px';
                      });
                    }
                  }}
                />
                <div className="flex flex-wrap gap-1 items-center">
                  {(rule.tags || []).map((t, tIdx) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-0.5 text-[12px] font-semibold rounded px-1.5 py-0.5 bg-accent/10 text-accent"
                    >
                      {t}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate({ ...rule, tags: (rule.tags || []).filter((_, i) => i !== tIdx) });
                        }}
                        className="ml-0.5 hover:text-destructive transition-colors"
                        title="Remove tag"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {editingTag ? (
                    <select
                      autoFocus
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          const newTags = [...(rule.tags || []), e.target.value];
                          onUpdate({ ...rule, tags: newTags });
                        }
                        setEditingTag(false);
                      }}
                      onBlur={() => setEditingTag(false)}
                      className="text-[12px] font-semibold rounded px-1.5 py-0.5 border border-accent/30 bg-accent/5 text-accent outline-none cursor-pointer shrink-0"
                    >
                      <option value="">Select tag...</option>
                      {CRITERIA_TAGS.filter(t => !(rule.tags || []).includes(t)).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingTag(true); }}
                      className="text-[12px] rounded px-1 py-0.5 text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                      title="Add tag"
                    >
                      + tag
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
          <div className="flex items-center gap-1 shrink-0 mt-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); setShowPrompt(!showPrompt); }}
              title={showPrompt ? "Hide AI prompt" : "Add AI prompt"}
              className={cn(
                "p-1 rounded transition-all",
                showPrompt || rule.aiPrompt
                  ? "text-accent hover:text-accent/80"
                  : "text-muted-foreground/40 hover:text-accent opacity-0 group-hover:opacity-100"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>
            {isGroup && (
              <span className="text-muted-foreground text-xs">{expanded ? "▲" : "▼"}</span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {showPrompt && (
          <div className="px-3.5 pb-3 animate-fade-in">
            <Textarea
              value={isGroup && conditionalSection ? (conditionalSection.aiPrompt || "") : rule.aiPrompt}
              onChange={(e) => {
                if (isGroup && conditionalSection && onConditionalUpdate) {
                  onConditionalUpdate({ ...conditionalSection, aiPrompt: e.target.value });
                } else {
                  onUpdate({ ...rule, aiPrompt: e.target.value });
                }
              }}
              placeholder={isGroup ? "Describe how the AI should evaluate this rule group…" : "Describe how the AI should evaluate this rule…"}
              className="min-h-[60px] resize-none text-sm"
            />
          </div>
        )}
        {isGroup && expanded && conditionalSection && onConditionalUpdate && (
          <div className="px-3.5 pb-3.5">
            <RuleGroupOptions section={conditionalSection} onUpdate={onConditionalUpdate} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── DiagnosisBlock ─────────────────────────────────────

function DiagnosisBlock({ diagnosis, onUpdate, onDelete, authColor, isLast }: {
  diagnosis: DiagnosisSection;
  onUpdate: (d: DiagnosisSection) => void;
  onDelete: () => void;
  authColor: { accent: string; light: string; badge: string };
  isLast?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [addingRule, setAddingRule] = useState(false);
  const [newRuleText, setNewRuleText] = useState("");
  const [newRuleTags, setNewRuleTags] = useState<string[]>([]);
  const [editingNewRuleTag, setEditingNewRuleTag] = useState(false);
  const kind = diagnosis.kind || "diagnosis";
  const isUniversal = kind === "all" || diagnosis.name.toLowerCase().includes("all") || diagnosis.name.toLowerCase().includes("universal");
  const isDrugGroup = kind === "drug-group";
  const totalRules = diagnosis.rules.length + (diagnosis.tables?.length || 0) + diagnosis.conditionals.length + (diagnosis.drugGroups?.length || 0);

  const blockColor = isDrugGroup ? COLORS.drug : isUniversal ? { accent: "#374151", light: "#FAFAFA", badge: "#374151" } : COLORS.diag;
  const badgeLabel = isDrugGroup ? "Drug" : isUniversal ? "Universal" : "Dx";
  const placeholderText = isDrugGroup ? "Drug group name" : "Diagnosis name";

  const addRule = () => {
    if (newRuleText.trim()) {
      const autoTags = suggestTags(newRuleText.trim());
      const mergedTags = [...new Set([...newRuleTags, ...autoTags])];
      onUpdate({ ...diagnosis, rules: [...diagnosis.rules, { id: uid(), title: newRuleText.trim(), aiPrompt: "", tags: mergedTags }] });
    }
    setNewRuleText("");
    setNewRuleTags([]);
    setEditingNewRuleTag(false);
    setAddingRule(false);
  };

  const addConditional = () => {
    onUpdate({
      ...diagnosis,
      conditionals: [...diagnosis.conditionals, {
        id: uid(), type: "conditional", requiredToPass: 1, tags: [],
        rules: [],
      }],
    });
  };

  return (
    <div
      className={cn("rounded-[10px] border", !isLast && "mb-3")}
      style={{
        borderColor: isDrugGroup ? "#CFFAFE" : isUniversal ? "#D1D5DB" : "#DDD6FE",
        background: blockColor.light,
      }}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between px-3.5 py-2.5 cursor-pointer"
        style={{ borderBottom: open ? `1px solid ${isDrugGroup ? "#CFFAFE" : isUniversal ? "#E5E7EB" : "#DDD6FE"}` : "none" }}
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0" style={{ minHeight: "28px" }}>
          <span className="text-sm text-muted-foreground shrink-0">{open ? "▾" : "▸"}</span>
          <span
            className="text-[12px] font-bold tracking-wider uppercase rounded px-2 py-0.5 shrink-0"
            style={{
              color: "#FFFFFF",
              background: blockColor.badge,
            }}
          >
            {badgeLabel}
          </span>
          <Textarea
            value={diagnosis.name}
            onChange={(e) => { e.stopPropagation(); onUpdate({ ...diagnosis, name: e.target.value }); }}
            onClick={(e) => e.stopPropagation()}
            className="min-h-0 border-0 bg-transparent px-1 text-sm font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 resize-none overflow-hidden flex-1"
            style={{ color: blockColor.accent, whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "anywhere" }}
            placeholder={placeholderText}
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
            ref={(el) => {
              if (el) {
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
              }
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{totalRules} rule{totalRules !== 1 ? "s" : ""}</span>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="p-3">
          <div className="group">
            {diagnosis.rules.map((rule, idx) => (
              <RuleItem
                key={rule.id}
                rule={rule}
                index={idx}
                onUpdate={(r) => onUpdate({ ...diagnosis, rules: diagnosis.rules.map((old, i) => (i === idx ? r : old)) })}
                onDelete={() => onUpdate({ ...diagnosis, rules: diagnosis.rules.filter((_, i) => i !== idx) })}
              />
            ))}
            {diagnosis.conditionals.map((cond, idx) => (
              <RuleItem
                key={cond.id}
                rule={{ id: cond.id, title: cond.title || "", aiPrompt: "", tags: cond.tags }}
                index={diagnosis.rules.length + idx}
                isGroup
                conditionalSection={cond}
                onConditionalUpdate={(c) => onUpdate({ ...diagnosis, conditionals: diagnosis.conditionals.map((old, i) => (i === idx ? c : old)) })}
                onUpdate={(r) => { onUpdate({ ...diagnosis, conditionals: diagnosis.conditionals.map((old, i) => i === idx ? { ...old, title: r.title, tags: r.tags } : old) }); }}
                onDelete={() => onUpdate({ ...diagnosis, conditionals: diagnosis.conditionals.filter((_, i) => i !== idx) })}
              />
            ))}
            {(diagnosis.tables || []).map((tbl) => (
              <div key={tbl.id} className="ml-7">
                <TableCategoryRenderer
                  table={tbl}
                  onUpdate={(t) => onUpdate({ ...diagnosis, tables: (diagnosis.tables || []).map(old => old.id === tbl.id ? t : old) })}
                  onDelete={() => onUpdate({ ...diagnosis, tables: (diagnosis.tables || []).filter(t => t.id !== tbl.id) })}
                />
              </div>
            ))}
          </div>

          {/* Nested Drug Groups */}
          {diagnosis.drugGroups && diagnosis.drugGroups.length > 0 && (
            <div className="mt-2 pl-4">
              {diagnosis.drugGroups.map((dg, idx) => (
                <DiagnosisBlock
                  key={dg.id}
                  diagnosis={dg}
                  authColor={authColor}
                  isLast={idx === diagnosis.drugGroups!.length - 1}
                  onUpdate={(d) => onUpdate({ ...diagnosis, drugGroups: diagnosis.drugGroups!.map((old, i) => (i === idx ? d : old)) })}
                  onDelete={() => onUpdate({ ...diagnosis, drugGroups: diagnosis.drugGroups!.filter((_, i) => i !== idx) })}
                />
              ))}
            </div>
          )}

          {addingRule && (
            <div className="flex gap-0 relative">
              <div className="w-7 flex flex-col items-center shrink-0 pt-[18px]">
                <div className="w-0.5 flex-1 rounded-full" style={{ background: "#E5E7EB" }} />
              </div>
              <div
                className="flex-1 min-w-0 mb-2 rounded-lg border"
                style={{
                  borderColor: "#E5E7EB",
                  background: "#FFFFFF",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div className="flex items-start gap-2.5 px-4 py-3">
                  <span
                    className="text-[12px] font-bold tracking-wide px-[7px] py-0.5 rounded shrink-0 mt-0.5"
                    style={{ color: COLORS.rule.accent, background: COLORS.rule.badge, fontFamily: "monospace" }}
                  >
                    R{diagnosis.rules.length + 1}
                  </span>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <textarea
                      autoFocus
                      value={newRuleText}
                      onChange={(e) => setNewRuleText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addRule(); }
                        if (e.key === "Escape") { setAddingRule(false); setNewRuleText(""); setNewRuleTags([]); setEditingNewRuleTag(false); }
                      }}
                      onBlur={() => {
                        // Small delay to allow tag interactions
                        setTimeout(() => {
                          if (newRuleText.trim()) addRule();
                          else { setAddingRule(false); setNewRuleText(""); setNewRuleTags([]); setEditingNewRuleTag(false); }
                        }, 200);
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                      placeholder="Rule description..."
                      rows={1}
                      className="min-h-0 w-full border-0 bg-transparent px-0 py-0 text-[13.5px] leading-relaxed outline-none text-foreground resize-none"
                      style={{ whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "anywhere", overflow: "hidden" }}
                    />
                    <div className="flex flex-wrap gap-1 items-center">
                      {newRuleTags.map((t, tIdx) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-0.5 text-[12px] font-semibold rounded px-1.5 py-0.5 bg-accent/10 text-accent"
                        >
                          {t}
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setNewRuleTags(newRuleTags.filter((_, i) => i !== tIdx))}
                            className="ml-0.5 hover:text-destructive transition-colors"
                            title="Remove tag"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {editingNewRuleTag ? (
                        <select
                          autoFocus
                          value=""
                          onMouseDown={(e) => e.preventDefault()}
                          onChange={(e) => {
                            if (e.target.value) {
                              setNewRuleTags([...newRuleTags, e.target.value]);
                            }
                            setEditingNewRuleTag(false);
                          }}
                          onBlur={() => setEditingNewRuleTag(false)}
                          className="text-[12px] font-semibold rounded px-1.5 py-0.5 border border-accent/30 bg-accent/5 text-accent outline-none cursor-pointer shrink-0"
                        >
                          <option value="">Select tag...</option>
                          {CRITERIA_TAGS.filter(t => !newRuleTags.includes(t)).map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setEditingNewRuleTag(true)}
                          className="text-[12px] rounded px-1 py-0.5 text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                          title="Add tag"
                        >
                          + tag
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
            <div className="pl-7 flex gap-2 mt-2.5 flex-wrap pt-2.5" style={{ borderTop: "1px solid #edf0f3" }}>
              {!addingRule && (
                <button
                  onClick={() => setAddingRule(true)}
                  className="flex items-center gap-1 cursor-pointer bg-transparent transition-colors"
                  style={{ border: "1px dashed #e2e6ea", borderRadius: "6px", padding: "5px 10px", fontSize: "12px", fontWeight: 600, color: "#6b7a8d" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  + Add Rule
                </button>
              )}
              <button
                onClick={() => onUpdate({ ...diagnosis, tables: [...(diagnosis.tables || []), { id: uid(), title: "", columns: ["Column 1", "Column 2"], rows: [["", ""]] }] })}
                className="flex items-center gap-1 cursor-pointer bg-transparent transition-colors"
                style={{ border: "1px dashed #c7d2fe", borderRadius: "6px", padding: "5px 10px", fontSize: "12px", fontWeight: 600, color: "#6366f1" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                + Add Rule Table
              </button>
              <button
                onClick={addConditional}
                className="flex items-center gap-1 cursor-pointer bg-transparent transition-colors"
                style={{ border: "1px dashed #fde68a", borderRadius: "6px", padding: "5px 10px", fontSize: "12px", fontWeight: 600, color: "#d97706" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                + Rule Group (N of M)
              </button>
              {isDrugGroup ? (
                <button
                  onClick={() => onUpdate({ ...diagnosis, drugGroups: [...(diagnosis.drugGroups || []), { id: uid(), name: "", kind: "diagnosis", rules: [], conditionals: [] }] })}
                  className="flex items-center gap-1 cursor-pointer bg-transparent transition-colors"
                  style={{ border: "1px dashed #e2e6ea", borderRadius: "6px", padding: "5px 10px", fontSize: "12px", fontWeight: 600, color: "#6b7a8d" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  + Diagnosis
                </button>
              ) : (
                <button
                  onClick={() => onUpdate({ ...diagnosis, drugGroups: [...(diagnosis.drugGroups || []), { id: uid(), name: "", kind: "drug-group", rules: [], conditionals: [] }] })}
                  className="flex items-center gap-1 cursor-pointer bg-transparent transition-colors"
                  style={{ border: "1px dashed #99f6e4", borderRadius: "6px", padding: "5px 10px", fontSize: "12px", fontWeight: 600, color: "#0d9488" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  + Add Drug Group
                </button>
              )}
            </div>
        </div>
      )}
    </div>
  );
}

// ── AuthTypeBlock ──────────────────────────────────────

function AuthTypeBlock({ section, onUpdate, onDelete }: {
  section: AuthTypeSection;
  onUpdate: (s: AuthTypeSection) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(true);
  const color = section.type === "initial" ? COLORS.initial : section.type === "discontinuation" ? COLORS.discont : COLORS.reauth;
  const icon = section.type === "initial" ? "⊕" : section.type === "discontinuation" ? "⊘" : "↻";

  const addBlock = (kind: "diagnosis" | "drug-group" | "all" | "other") => {
    const name = kind === "all" ? "All Diagnoses" : kind === "other" ? "Other" : "";
    const prepend = kind === "all";
    const newBlock: DiagnosisSection = { id: uid(), name, kind: kind === "other" ? "other" as any : kind, rules: [], conditionals: [] };
    onUpdate({
      ...section,
      diagnoses: prepend ? [newBlock, ...section.diagnoses] : [...section.diagnoses, newBlock],
    });
    
  };

  const hasAllBlock = section.diagnoses.some(d => d.kind === "all" || d.name.toLowerCase() === "all diagnoses" || d.name.toLowerCase().startsWith("for all"));
  const groupCount = section.diagnoses.length;

  return (
    <div
      className="mb-5 rounded-xl"
      style={{
        border: `1.5px solid ${color.accent}22`,
        background: color.light,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {/* Auth Header */}
      <div
        className="flex items-center justify-between px-[18px] py-3.5 cursor-pointer"
        style={{
          borderBottom: open ? `1px solid ${color.accent}20` : "none",
          background: `${color.accent}08`,
        }}
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg" style={{ color: color.accent }}>{icon}</span>
          <span
            className="text-[15px] font-bold tracking-tight"
            style={{ color: color.accent }}
          >
            {section.label}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-muted-foreground">
            {groupCount} group{groupCount !== 1 ? "s" : ""}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
            title="Delete authorization type"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <span className="text-[13px]" style={{ color: color.accent }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {open && (
        <div className="p-4">
          {section.diagnoses.map((diag, idx) => (
            <DiagnosisBlock
              key={diag.id}
              diagnosis={diag}
              authColor={color}
              isLast={idx === section.diagnoses.length - 1}
              onUpdate={(d) => onUpdate({ ...section, diagnoses: section.diagnoses.map((old, i) => (i === idx ? d : old)) })}
              onDelete={() => onUpdate({ ...section, diagnoses: section.diagnoses.filter((_, i) => i !== idx) })}
            />
          ))}

          {/* Add buttons */}
          <div className="mt-2.5 flex gap-2">
            {!hasAllBlock && (
              <button
                onClick={() => addBlock("all")}
                className="flex-1 py-2.5 rounded-lg bg-transparent text-[13px] font-semibold tracking-wide cursor-pointer transition-colors hover:opacity-80 flex items-center justify-center gap-1.5"
                style={{ border: `1.5px dashed #6B728044`, color: "#6B7280" }}
              >
                <span className="text-[12px] font-bold tracking-wider uppercase rounded px-1.5 py-0.5" style={{ color: "#FFFFFF", background: "#374151" }}>ALL</span>
                All Diagnoses
              </button>
            )}
            <button
              onClick={() => addBlock("diagnosis")}
              className="flex-1 py-2.5 rounded-lg bg-transparent text-[13px] font-semibold tracking-wide cursor-pointer transition-colors hover:opacity-80 flex items-center justify-center gap-1.5"
              style={{ border: `1.5px dashed ${COLORS.diag.accent}44`, color: COLORS.diag.accent }}
            >
              <span className="text-[12px] font-bold tracking-wider uppercase rounded px-1.5 py-0.5" style={{ color: "#FFFFFF", background: COLORS.diag.badge }}>Dx</span>
              Diagnosis
            </button>
            <button
              onClick={() => addBlock("drug-group")}
              className="flex-1 py-2.5 rounded-lg bg-transparent text-[13px] font-semibold tracking-wide cursor-pointer transition-colors hover:opacity-80 flex items-center justify-center gap-1.5"
              style={{ border: `1.5px dashed ${COLORS.drug.accent}44`, color: COLORS.drug.accent }}
            >
              <span className="text-[12px] font-bold tracking-wider uppercase rounded px-1.5 py-0.5" style={{ color: "#FFFFFF", background: COLORS.drug.badge }}>DRUG</span>
              Drug Group
            </button>
            <button
              onClick={() => addBlock("other")}
              className="flex-1 py-2.5 rounded-lg bg-transparent text-[13px] font-semibold tracking-wide cursor-pointer transition-colors hover:opacity-80 flex items-center justify-center gap-1.5"
              style={{ border: `1.5px dashed #6B728044`, color: "#6B7280" }}
            >
              <span className="text-[12px] font-bold tracking-wider uppercase rounded px-1.5 py-0.5" style={{ color: "#FFFFFF", background: "#6B7280" }}>OTH</span>
              Other
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Prefilled criteria for Weight Management ─────────

const prefillCriteria: PolicyCriteria = {
  rules: [],
  authTypes: [
    {
      id: "initial", type: "initial", label: "Initial Authorization",
      rules: [], conditionals: [],
      diagnoses: [
        {
          id: uid(), name: "Weight Loss",
          rules: [
            { id: uid(), title: "Must be 12 years of age or older (Wegovy) or 18+ (Zepbound, phentermine, phendimetrazine, diethylpropion)", aiPrompt: "" },
            { id: uid(), title: "Will be used in combination with a reduced-calorie diet and increased physical activity", aiPrompt: "" },
            { id: uid(), title: "Recent weight/BMI must be provided to establish baseline weight", aiPrompt: "" },
            { id: uid(), title: "BMI ≥ 30 kg/m² OR BMI ≥ 27 kg/m² with one or more weight-related comorbid conditions", aiPrompt: "" },
          ],
          conditionals: [],
        },
        {
          id: uid(), name: "MASH (Wegovy only)",
          rules: [
            { id: uid(), title: "Must be 18 years of age or older", aiPrompt: "" },
            { id: uid(), title: "Diagnosis of MASH (formerly NASH)", aiPrompt: "" },
            { id: uid(), title: "Moderate to advanced liver fibrosis (Stage F2/F3) confirmed by biopsy or non-invasive imaging", aiPrompt: "" },
            { id: uid(), title: "No history of significant alcohol consumption", aiPrompt: "" },
          ],
          conditionals: [],
        },
        {
          id: uid(), name: "Obstructive Sleep Apnea (Zepbound only)",
          rules: [
            { id: uid(), title: "Must be 18 years of age or older", aiPrompt: "" },
            { id: uid(), title: "Reduced-calorie diet and increased physical activity required", aiPrompt: "" },
            { id: uid(), title: "Diagnosis of moderate to severe OSA confirmed via polysomnography or HSAT", aiPrompt: "" },
            { id: uid(), title: "BMI ≥ 30 kg/m²", aiPrompt: "" },
          ],
          conditionals: [],
        },
      ],
    },
    {
      id: "reauthorization", type: "reauthorization", label: "Reauthorization",
      rules: [], conditionals: [],
      diagnoses: [
        {
          id: uid(), name: "Weight Loss",
          rules: [
            { id: uid(), title: "Recent weight/BMI provided to determine weight loss from baseline", aiPrompt: "" },
            { id: uid(), title: "Total weight loss ≥ 5% or maintenance of original weight loss ≥ 5% from baseline", aiPrompt: "" },
            { id: uid(), title: "Maintenance of adherence to reduced-calorie diet and increased physical activity", aiPrompt: "" },
          ],
          conditionals: [],
        },
        {
          id: uid(), name: "MASH (Wegovy only)",
          rules: [
            { id: uid(), title: "Documentation that condition improved based on prescriber assessment (e.g., no worsening of fibrosis)", aiPrompt: "" },
            { id: uid(), title: "Limited alcohol consumption maintained", aiPrompt: "" },
          ],
          conditionals: [],
        },
        {
          id: uid(), name: "Obstructive Sleep Apnea (Zepbound only)",
          rules: [
            { id: uid(), title: "Continued reduced-calorie diet and increased physical activity", aiPrompt: "" },
            { id: uid(), title: "Recent AHI after therapy with Zepbound provided", aiPrompt: "" },
            { id: uid(), title: "Provider attests member requires Zepbound to maintain AHI decrease", aiPrompt: "" },
          ],
          conditionals: [],
        },
      ],
    },
  ],
};

// ── Prefilled criteria for Skyrizi ─────────────────────

const skyriziPrefillCriteria: PolicyCriteria = {
  rules: [],
  authTypes: [
    {
      id: "initial", type: "initial", label: "Initial Authorization",
      rules: [], conditionals: [],
      diagnoses: [
        {
          id: uid(), name: "For All Diagnoses",
          rules: [
            { id: uid(), title: "Member is 18 years of age or older", aiPrompt: "" },
            { id: uid(), title: "Prescribed by or in consultation with a dermatologist, rheumatologist, or gastroenterologist", aiPrompt: "" },
            { id: uid(), title: "Must have a negative tuberculosis skin test (PPD) or Interferon-Gamma Release Assay (IGRA) whole-blood test (QuantiFERON-TB Gold or T-SPOT)", aiPrompt: "" },
            { id: uid(), title: "Patient is not receiving Skyrizi in combination with a biologic DMARD, Janus kinase inhibitor, or PDE4 inhibitor", aiPrompt: "" },
          ],
          conditionals: [],
        },
        {
          id: uid(), name: "Psoriatic Arthritis",
          rules: [
            { id: uid(), title: "Must have a diagnosis of active psoriatic arthritis", aiPrompt: "" },
            { id: uid(), title: "For peripheral disease: adequate trial (≥4 weeks) of NSAID at anti-inflammatory target dose with inadequate response, side effects, or contraindication", aiPrompt: "" },
            { id: uid(), title: "Adequate trial (≥3 months) of a conventional DMARD (methotrexate, sulfasalazine, or leflunomide) with inadequate response, side effects, contraindication, or previous trial of a biologic medication", aiPrompt: "" },
          ],
          conditionals: [],
        },
        {
          id: uid(), name: "Plaque Psoriasis",
          rules: [
            { id: uid(), title: "Must have a diagnosis of chronic moderate-to-severe plaque psoriasis", aiPrompt: "" },
            { id: uid(), title: "Minimum body surface area involvement ≥ 5% (palms, soles, head/neck, or genitalia exempt from BSA requirement)", aiPrompt: "" },
            { id: uid(), title: "History of failure of ONE topical therapy (corticosteroids, vitamin D analogs, tazarotene, calcineurin inhibitors, anthralin, or coal tar) unless contraindicated, OR previous trial of a biologic medication", aiPrompt: "" },
            { id: uid(), title: "History of failure of ONE traditional systemic agent (methotrexate, cyclosporine, or acitretin) at max dose for 3-month trial within last 6 months, OR if contraindicated, history of phototherapy trial/failure", aiPrompt: "" },
          ],
          conditionals: [],
        },
        {
          id: uid(), name: "Crohn's Disease",
          rules: [
            { id: uid(), title: "Diagnosis of moderately to severely active Crohn's disease", aiPrompt: "" },
            { id: uid(), title: "Adequate trial (≥2 months) of conventional therapy (corticosteroids, 5-ASA agents, or immunosuppressants) with inadequate response, side effects, contraindication, or previous trial of a biologic medication", aiPrompt: "" },
            { id: uid(), title: "Clinical documentation of liver enzymes and bilirubin at baseline", aiPrompt: "" },
          ],
          conditionals: [],
        },
        {
          id: uid(), name: "Ulcerative Colitis",
          rules: [
            { id: uid(), title: "Diagnosis of moderately to severely active ulcerative colitis", aiPrompt: "" },
            { id: uid(), title: "Adequate trial (≥2 months) of conventional therapy (corticosteroids, 5-ASA agents, or immunosuppressants) with inadequate response, side effects, contraindication, or previous trial of a biologic medication", aiPrompt: "" },
            { id: uid(), title: "Clinical documentation of liver enzymes and bilirubin at baseline", aiPrompt: "" },
          ],
          conditionals: [],
        },
      ],
    },
    {
      id: "reauthorization", type: "reauthorization", label: "Reauthorization",
      rules: [], conditionals: [],
      diagnoses: [
        {
          id: uid(), name: "All Diagnoses",
          rules: [
            { id: uid(), title: "All prior authorization renewals are reviewed on an annual basis to determine Medical Necessity for continuation of therapy", aiPrompt: "" },
            { id: uid(), title: "Authorization may be extended at 1-year intervals based upon chart documentation from the prescriber that the member's condition has improved based upon the prescriber's assessment while on therapy", aiPrompt: "" },
          ],
          conditionals: [],
        },
      ],
    },
  ],
};

// ── Prefilled criteria for Galantamine and Rivastigmine ──

const galantaminePrefillCriteria: PolicyCriteria = {
  rules: [],
  authTypes: [
    {
      id: "initial", type: "initial", label: "Initial Authorization",
      rules: [], conditionals: [],
      diagnoses: [
        {
          id: uid(), name: "Mild to Moderate Alzheimer's Dementia",
          rules: [
            { id: uid(), title: "Must be age 18 years or older", aiPrompt: "", tags: ["Age"] },
            { id: uid(), title: "Must have a primary diagnosis of Alzheimer's dementia", aiPrompt: "", tags: ["Diagnosis"] },
          ],
          conditionals: [
            {
              id: uid(), type: "conditional", requiredToPass: 1, tags: ["Diagnosis"],
              rules: [
                { id: uid(), title: "Memory loss", aiPrompt: "" },
                { id: uid(), title: "Other cognitive changes", aiPrompt: "" },
                { id: uid(), title: "Mood/behavior changes", aiPrompt: "" },
              ],
            },
            {
              id: uid(), type: "conditional", requiredToPass: 1, tags: ["Step Therapy"],
              rules: [
                { id: uid(), title: "Failure of ≥ 3 month trial of donepezil at doses ≥ 10 mg/day or galantamine 24 mg/day, unless contraindicated or clinically significant adverse effects are experienced", aiPrompt: "" },
                { id: uid(), title: "If member cannot take donepezil and galantamine due to intolerance or contraindication(s), failure of ≥ 3 month trial of memantine at doses ≥ 20 mg/day, unless contraindicated or clinically significant adverse effects are experienced", aiPrompt: "" },
              ],
            },
          ],
        },
        {
          id: uid(), name: "Parkinson's Disease (rivastigmine)",
          rules: [
            { id: uid(), title: "Must be age 18 years or older", aiPrompt: "", tags: ["Age"] },
            { id: uid(), title: "Must have a diagnosis of mild to moderate dementia associated with Parkinson's disease", aiPrompt: "", tags: ["Diagnosis"] },
            { id: uid(), title: "Failure of ≥ 3 month trial of donepezil at doses ≥ 10 mg/day unless contraindicated or clinically significant adverse effects are experienced", aiPrompt: "", tags: ["Step Therapy"] },
          ],
          conditionals: [
            {
              id: uid(), type: "conditional", requiredToPass: 1, tags: ["Diagnosis"],
              rules: [
                { id: uid(), title: "Memory loss", aiPrompt: "" },
                { id: uid(), title: "Other cognitive changes", aiPrompt: "" },
                { id: uid(), title: "Mood/behavior changes", aiPrompt: "" },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "reauthorization", type: "reauthorization", label: "Reauthorization",
      rules: [], conditionals: [],
      diagnoses: [],
    },
  ],
};

// ── Prefilled criteria for Rinvoq ──

const rinvoqPrefillCriteria: PolicyCriteria = {
  rules: [],
  authTypes: [
    {
      id: "initial", type: "initial", label: "Initial Authorization",
      rules: [], conditionals: [],
      diagnoses: [
        {
          id: uid(), name: "All Diagnoses", kind: "all",
          rules: [],
          conditionals: [
            {
              id: uid(), type: "conditional", title: "Test Result", requiredToPass: 1, tags: ["Lab / Test"],
              rules: [
                { id: uid(), title: "Negative tuberculosis skin test [such as Tuberculin PPD (purified protein derivative) test]", aiPrompt: "" },
                { id: uid(), title: "Interferon-Gamma Release Assay (IGRA) whole-blood test [such as QuantiFERON®-TB Gold In-Tube test (QFT-GIT)]", aiPrompt: "" },
                { id: uid(), title: "T-SPOT®.TB test (T-Spot)", aiPrompt: "" },
              ],
            },
          ],
        },
        {
          id: uid(), name: "Rheumatoid Arthritis",
          rules: [
            { id: uid(), title: "Must be prescribed by or in consultation with a rheumatologist", aiPrompt: "Check if the prescribing provider is a rheumatologist or if a rheumatology consultation is documented in the clinical notes", tags: ["Provider Specialty"] },
            { id: uid(), title: "Must be age 18 and older", aiPrompt: "" },
            { id: uid(), title: "Must have a diagnosis of moderately to severely active rheumatoid arthritis", aiPrompt: "" },
            { id: uid(), title: "Must have an adequate trial of ONE of the formulary-preferred TNF inhibitor with an inadequate response, significant side effects/toxicity, or contraindication(s) to these therapies", aiPrompt: "" },
            { id: uid(), title: "Not used in combination with other JAK inhibitors, biologic DMARDs, or with potent immunosuppressants such as azathioprine and cyclosporine", aiPrompt: "" },
          ],
          conditionals: [],
        },
        {
          id: uid(), name: "Psoriatic Arthritis",
          rules: [
            { id: uid(), title: "Must be prescribed by or in consultation with a dermatologist or rheumatologist", aiPrompt: "" },
            { id: uid(), title: "Must be age 2 years or older", aiPrompt: "" },
            { id: uid(), title: "Must have a diagnosis of active psoriatic arthritis", aiPrompt: "" },
            { id: uid(), title: "Must have an adequate trial of ONE of the formulary-preferred TNF inhibitors with an inadequate response, significant side effects/toxicity, or contraindication(s) to these therapies", aiPrompt: "" },
          ],
          conditionals: [],
        },
      ],
    },
    {
      id: "reauthorization", type: "reauthorization", label: "Reauthorization",
      rules: [], conditionals: [],
      diagnoses: [
        {
          id: uid(), name: "All Diagnoses", kind: "all",
          rules: [
            { id: uid(), title: "All prior authorization renewals are reviewed on an annual basis to determine Medical Necessity for continuation of therapy. Authorization may be extended at 1-year intervals based upon chart documentation from the prescriber that the member's condition has improved based upon the prescriber's assessment while on therapy", aiPrompt: "" },
          ],
          conditionals: [],
        },
      ],
    },
  ],
};

// ── GLP-1 / GIP/GLP-1 Preferred criteria ──────────────

const glp1PrefillCriteria: PolicyCriteria = {
  rules: [],
  authTypes: [
    {
      id: uid(), type: "initial", label: "Initial Authorization",
      rules: [],
      conditionals: [],
      diagnoses: [
        {
          id: uid(), name: "All Diagnoses", kind: "all",
          rules: [
            { id: uid(), title: "Prior trial of any ONE oral antidiabetic drug.", tags: ["Step Therapy"], aiPrompt: "Confirm documented use of at least one oral antidiabetic medication (metformin, sulfonylurea, DPP-4i, etc.)" },
            { id: uid(), title: "Must NOT have a diagnosis of Type 1 Diabetes Mellitus or Latent Autoimmune Diabetes in Adults (LADA, Type 1.5 Diabetes Mellitus).", tags: ["Exclusion"], aiPrompt: "Scan problem list for E10.x (T1DM) or any mention of LADA / autoimmune diabetes — must be absent" },
          ],
          conditionals: [
            {
              id: uid(), type: "conditional", title: "FDA-Approved Diagnosis", requiredToPass: 1,
              rules: [
                { id: uid(), title: "Chart notes or medical records referencing diagnosis of Type II Diabetes Mellitus or specific ICD-10 code (E11.X)", tags: ["Diagnosis"], aiPrompt: "Look for ICD-10 E11.X codes or explicit Type 2 DM diagnosis in problem list or chart notes" },
                { id: uid(), title: "Lab values confirming presence of Type II Diabetes Mellitus — Fasting plasma glucose, Hemoglobin A1C (HbA1c), oral glucose tolerance test, or random plasma glucose with classic hyperglycemia symptoms", tags: ["Labs"], aiPrompt: "Search for A1c, fasting glucose, OGTT results indicating T2DM" },
                { id: uid(), title: "Prior history of treatment with antidiabetic medications (e.g., metformin, sulfonylureas, DPP-4 inhibitors, insulin) which did not result in successful therapy", tags: ["Prior Therapy"], aiPrompt: "Check medication history for antidiabetic drugs and treatment outcomes" },
                { id: uid(), title: "Prior trial of any ONE oral antidiabetic drug", tags: ["Prior Therapy"], aiPrompt: "Verify at least one oral antidiabetic drug in medication list" },
              ],
            },
          ],
        },
      ],
    },
    {
      id: uid(), type: "reauthorization", label: "Reauthorization",
      rules: [],
      conditionals: [],
      diagnoses: [
        {
          id: uid(), name: "All Diagnoses", kind: "all",
          rules: [
            { id: uid(), title: "All prior authorization renewals are reviewed on an annual basis to determine Medical Necessity for continuation of therapy. Authorization may be extended at 1-year intervals based upon chart documentation from the prescriber that the member's condition has improved based upon the prescriber's assessment while on therapy.", aiPrompt: "Check for prescriber documentation of clinical improvement on current GLP-1 therapy" },
          ],
          conditionals: [],
        },
      ],
    },
  ],
};

// ── Prefill map ────────────────────────────────────────

const r = (id: string, title: string, tags: string[] = []): RuleCard => ({ id, title, aiPrompt: "", tags });
const reorderExampleCriteria: PolicyCriteria = {
  rules: [],
  authTypes: [
    {
      id: "rx-initial", type: "initial", label: "Initial Authorization", rules: [], conditionals: [],
      diagnoses: [
        { id: "rx-dx1", name: "Fruzaqla (fruquintinib) — Metastatic colorectal cancer", rules: [
          r("rx-dx1-r1", "Diagnosis of metastatic colorectal cancer", ["Diagnosis"]),
          r("rx-dx1-r2", "Drug is prescribed by or in consultation with an oncologist", ["Prescriber"]),
          r("rx-dx1-r3", "Dosing is within FDA-labeled limits", ["Dosing"]),
        ], conditionals: [
          { id: "rx-dx1-c1", type: "conditional", title: "Prior therapy", requiredToPass: 1, rules: [
            r("rx-dx1-c1-r1", "Previously treated with fluoropyrimidine-, oxaliplatin-, and irinotecan-based chemotherapy", ["Step Therapy"]),
            r("rx-dx1-c1-r2", "Previously treated with an anti-VEGF biological therapy", ["Step Therapy"]),
          ] },
        ] },
        { id: "rx-dx2", name: "Lonsurf (trifluridine/tipiracil) — Metastatic colorectal cancer carcinoma", rules: [
          r("rx-dx2-r1", "Diagnosis of metastatic colorectal cancer", ["Diagnosis"]),
          r("rx-dx2-r2", "Patient is 18 years of age or older", ["Age"]),
        ], conditionals: [] },
        { id: "rx-dx3", name: "Lonsurf (trifluridine/tipiracil) — Metastatic gastric or GEJ adenocarcinoma", rules: [
          r("rx-dx3-r1", "Diagnosis of metastatic gastric or gastroesophageal junction adenocarcinoma", ["Diagnosis"]),
          r("rx-dx3-r2", "Previously treated with at least two prior lines of chemotherapy", ["Step Therapy"]),
        ], conditionals: [] },
        { id: "rx-dx4", name: "Stivarga (regorafenib) — Gastrointestinal stromal tumor", rules: [
          r("rx-dx4-r1", "Diagnosis of locally advanced, unresectable or metastatic GIST", ["Diagnosis"]),
          r("rx-dx4-r2", "Previously treated with imatinib and sunitinib", ["Step Therapy"]),
        ], conditionals: [] },
        { id: "rx-dx5", name: "Stivarga (regorafenib) — Hepatocellular carcinoma", rules: [
          r("rx-dx5-r1", "Diagnosis of hepatocellular carcinoma", ["Diagnosis"]),
          r("rx-dx5-r2", "Previously treated with sorafenib", ["Step Therapy"]),
        ], conditionals: [] },
      ],
    },
    {
      id: "rx-reauth", type: "reauthorization", label: "Reauthorization", rules: [], conditionals: [],
      diagnoses: [
        { id: "rx-re-dx1", name: "All indications", rules: [
          r("rx-re-r1", "Documentation of positive clinical response without disease progression", ["Documentation"]),
          r("rx-re-r2", "Absence of unacceptable toxicity", ["Exclusion"]),
        ], conditionals: [] },
      ],
    },
  ],
};

export const prefillMap: Record<string, PolicyCriteria> = {
  "reorder policy example": reorderExampleCriteria,
  "weight-management": prefillCriteria,
  "skyrizi": skyriziPrefillCriteria,
  "galantamine": galantaminePrefillCriteria,
  "rinvoq": rinvoqPrefillCriteria,
  "preferred glp-1": glp1PrefillCriteria,
  "glp-1": glp1PrefillCriteria,
};

export { defaultCriteria };

// ── Main Component ─────────────────────────────────────

export function CriteriaSectionsEditor({ prefillData, prefillId, initialCriteria, onChange }: { prefillData?: boolean; prefillId?: string; initialCriteria?: PolicyCriteria; onChange?: () => void }) {
  const resolved = initialCriteria || (prefillId ? prefillMap[prefillId] : prefillData ? prefillCriteria : undefined);
  const [criteria, setCriteriaRaw] = useState<PolicyCriteria>(resolved || defaultCriteria);
  const setCriteria = (val: PolicyCriteria | ((prev: PolicyCriteria) => PolicyCriteria)) => {
    setCriteriaRaw(val);
    onChange?.();
  };
  const [structureOpen, setStructureOpen] = useState(true);

  const updateAuthType = (id: string, updated: AuthTypeSection) => {
    setCriteria(prev => ({
      ...prev,
      authTypes: prev.authTypes.map(a => a.id === id ? updated : a),
    }));
  };

  const addAuthType = (type: "initial" | "reauthorization" | "discontinuation") => {
    const newId = uid();
    const labels: Record<string, string> = {
      initial: "Initial Authorization",
      reauthorization: "Reauthorization",
      discontinuation: "Other",
    };
    setCriteria(prev => ({
      ...prev,
      authTypes: [...prev.authTypes, {
        id: newId,
        type,
        label: labels[type],
        diagnoses: [],
        rules: [],
        conditionals: [],
      }],
    }));
  };

  return (
    <div className={cn("grid grid-cols-1 gap-4 max-w-[1440px] mx-auto", structureOpen ? "lg:grid-cols-[280px_1fr]" : "lg:grid-cols-1")}>
      {/* Left: Structure overview panel */}
      {structureOpen && (
        <div className="hidden lg:block min-w-0 overflow-hidden">
          <div className="rounded-lg border border-border bg-card p-4 h-fit overflow-hidden">
            <div className="flex justify-end mb-1">
              <button
                onClick={() => setStructureOpen(false)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Collapse structure panel"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
            <StructurePanel criteria={criteria} onCriteriaChange={setCriteria} />
          </div>
        </div>
      )}

      {/* Right: Editor */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {!structureOpen && (
              <button
                onClick={() => setStructureOpen(true)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Show structure panel"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            )}
            <h3 className="text-[15px] font-bold text-foreground tracking-tight">Policy Builder</h3>
          </div>
          <div className="flex items-center gap-2">
            {["Auth Type", "Diagnosis", "Rules"].map((step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span className={cn("text-xs", i === 2 ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {step}
                </span>
                {i < arr.length - 1 && <span className="text-border text-xs">›</span>}
              </span>
            ))}
          </div>
        </div>

        <Legend />

        <div>
          {criteria.authTypes.map((auth) => (
            <AuthTypeBlock key={auth.id} section={auth} onUpdate={(s) => updateAuthType(auth.id, s)} onDelete={() => setCriteria(prev => ({ ...prev, authTypes: prev.authTypes.filter(a => a.id !== auth.id) }))} />
          ))}

          <div className="flex gap-2">
              <button
                onClick={() => addAuthType("initial")}
                className="flex-1 py-3 rounded-[10px] bg-transparent text-[13px] font-semibold cursor-pointer transition-colors hover:bg-[#EBF0FA]"
                style={{ border: `2px dashed #0F52BA44`, color: "#0F52BA" }}
              >
                + Initial Authorization
              </button>
              <button
                onClick={() => addAuthType("reauthorization")}
                className="flex-1 py-3 rounded-[10px] bg-transparent text-[13px] font-semibold cursor-pointer transition-colors hover:bg-[#EAFAF5]"
                style={{ border: `2px dashed #0D7A5F44`, color: "#0D7A5F" }}
              >
                + Reauthorization
              </button>
              <button
                onClick={() => addAuthType("discontinuation")}
                className="flex-1 py-3 rounded-[10px] bg-transparent text-[13px] font-semibold cursor-pointer transition-colors hover:bg-[#FFF7ED]"
                style={{ border: `2px dashed #B4530944`, color: "#B45309" }}
              >
                + Other
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}
