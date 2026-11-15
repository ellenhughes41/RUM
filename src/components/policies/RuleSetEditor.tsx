import { useState } from "react";
import { ChevronDown, ChevronRight, Sparkles, Trash2, Plus, Pencil, Table2, Type, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// --- Recursive data model ---

export interface RuleTable {
  columns: string[];
  rows: string[][];
}

type RuleNode =
  | { type: "rule"; id: string; text: string }
  | { type: "table"; id: string; title: string; table: RuleTable }
  | { type: "group"; id: string; operator: "AND" | "OR"; required?: number; children: RuleNode[] };

let _idCounter = 0;
const generateId = () => `node_${++_idCounter}_${Date.now()}`;

interface RuleCategory {
  id: string;
  name: string;
  displayName: string;
  children: RuleNode[];
  aiGuideline: string;
  hasGuideline: boolean;
}

// --- Tree helpers ---

function updateNodeInTree(nodes: RuleNode[], nodeId: string, updater: (n: RuleNode) => RuleNode): RuleNode[] {
  return nodes.map(n => {
    if (n.id === nodeId) return updater(n);
    if (n.type === "group") return { ...n, children: updateNodeInTree(n.children, nodeId, updater) };
    return n;
  });
}

function hasChildren(n: RuleNode): n is RuleNode & { type: "group" } {
  return n.type === "group";
}

function deleteNodeFromTree(nodes: RuleNode[], nodeId: string): RuleNode[] {
  return nodes
    .filter(n => n.id !== nodeId)
    .map(n => n.type === "group" ? { ...n, children: deleteNodeFromTree(n.children, nodeId) } : n);
}

function addChildToNode(nodes: RuleNode[], parentId: string, child: RuleNode): RuleNode[] {
  return nodes.map(n => {
    if (n.id === parentId && n.type === "group") return { ...n, children: [...n.children, child] };
    if (n.type === "group") return { ...n, children: addChildToNode(n.children, parentId, child) };
    return n;
  });
}

function countRules(nodes: RuleNode[]): number {
  return nodes.reduce((sum, n) => {
    if (n.type === "rule" || n.type === "table") return sum + 1;
    return sum + countRules(n.children);
  }, 0);
}

// --- Initial data ---

const initialRuleCategories: RuleCategory[] = [
  {
    id: "age", name: "age", displayName: "Age Requirements",
    children: [
      { type: "rule", id: "r1", text: "Patient must be 18 years or older" },
      { type: "rule", id: "r2", text: "For pediatric use: ages 6-17 with specialist approval" },
    ],
    aiGuideline: "Look for date of birth in demographics section. Calculate current age from DOB. Check if age falls within specified range.",
    hasGuideline: true,
  },
  {
    id: "diagnosis", name: "diagnosis", displayName: "Diagnosis",
    children: [
      { type: "rule", id: "r3", text: "Primary diagnosis of moderate-to-severe atopic dermatitis" },
      { type: "rule", id: "r4", text: "ICD-10 codes: L20.81, L20.82, L20.89" },
    ],
    aiGuideline: "Search for ICD-10 codes in assessment/diagnosis sections. Look for keywords: 'atopic dermatitis', 'eczema', 'moderate', 'severe'.",
    hasGuideline: true,
  },
  {
    id: "prior_therapy", name: "prior_therapy", displayName: "Prior Therapy",
    children: [
      { type: "group", id: "g_pt1", operator: "AND", children: [
        { type: "rule", id: "r5", text: "Minimum 4-week trial period required" },
        { type: "group", id: "g_pt2", operator: "OR", children: [
          { type: "rule", id: "r6", text: "Trial and failure of at least one topical corticosteroid" },
          { type: "rule", id: "r7", text: "Documented intolerance or contraindication to topical corticosteroids" },
        ]},
      ]},
    ],
    aiGuideline: "Check medication history for topical steroids. Look for documented failure, intolerance, or contraindication statements.",
    hasGuideline: true,
  },
  {
    id: "lab_value", name: "lab_value", displayName: "Lab Values",
    children: [
      { type: "rule", id: "r8", text: "No specific lab requirements for this medication" },
    ],
    aiGuideline: "", hasGuideline: false,
  },
  {
    id: "prescriber_specialty", name: "prescriber_specialty", displayName: "Prescriber Specialty",
    children: [
      { type: "group", id: "g_ps1", operator: "OR", children: [
        { type: "rule", id: "r9", text: "Must be prescribed by dermatologist" },
        { type: "rule", id: "r10", text: "Must be prescribed by allergist" },
        { type: "rule", id: "r11", text: "Primary care acceptable with specialist consultation documented" },
      ]},
    ],
    aiGuideline: "Find prescriber information in header or signature. Match specialty to allowed list. Check for consultation notes if PCP.",
    hasGuideline: true,
  },
  {
    id: "dosing", name: "dosing", displayName: "Dosing",
    children: [
      { type: "rule", id: "r12", text: "Initial: 600mg (two 300mg injections)" },
      { type: "rule", id: "r13", text: "Maintenance: 300mg every other week" },
    ],
    aiGuideline: "", hasGuideline: false,
  },
  {
    id: "duration", name: "duration", displayName: "Duration",
    children: [
      { type: "rule", id: "r14", text: "Initial authorization: 6 months" },
      { type: "rule", id: "r15", text: "Renewal requires documented response" },
    ],
    aiGuideline: "", hasGuideline: false,
  },
  {
    id: "comorbidity", name: "comorbidity", displayName: "Comorbidities",
    children: [
      { type: "rule", id: "r16", text: "May have concurrent asthma or allergic rhinitis" },
      { type: "rule", id: "r17", text: "Document if present for combination therapy consideration" },
    ],
    aiGuideline: "", hasGuideline: false,
  },
  {
    id: "contraindication", name: "contraindication", displayName: "Contraindications",
    children: [
      { type: "rule", id: "r18", text: "No known hypersensitivity to dupilumab" },
      { type: "rule", id: "r19", text: "No active parasitic infections" },
    ],
    aiGuideline: "Search allergy section for dupilumab or biologic allergies. Check problem list for parasitic infections.",
    hasGuideline: true,
  },
  {
    id: "concurrent_medication", name: "concurrent_medication", displayName: "Concurrent Medications",
    children: [
      { type: "rule", id: "r20", text: "May use with topical therapies" },
      { type: "rule", id: "r21", text: "Avoid live vaccines during treatment" },
    ],
    aiGuideline: "", hasGuideline: false,
  },
];

// --- Table renderer ---

function RuleTableRenderer({
  node,
  idx,
  onUpdate,
  onDelete,
}: {
  node: RuleNode & { type: "table" };
  idx: number;
  onUpdate: (nodeId: string, updater: (n: RuleNode) => RuleNode) => void;
  onDelete: (nodeId: string) => void;
}) {
  const { table, title } = node;

  const updateTable = (newTable: RuleTable) => {
    onUpdate(node.id, () => ({ ...node, table: newTable }));
  };

  const updateTitle = (newTitle: string) => {
    onUpdate(node.id, () => ({ ...node, title: newTitle }));
  };

  const addColumn = () => {
    const colName = `Column ${table.columns.length + 1}`;
    updateTable({
      columns: [...table.columns, colName],
      rows: table.rows.map(row => [...row, ""]),
    });
  };

  const removeColumn = (colIdx: number) => {
    if (table.columns.length <= 1) return;
    updateTable({
      columns: table.columns.filter((_, i) => i !== colIdx),
      rows: table.rows.map(row => row.filter((_, i) => i !== colIdx)),
    });
  };

  const addRow = () => {
    updateTable({
      ...table,
      rows: [...table.rows, table.columns.map(() => "")],
    });
  };

  const removeRow = (rowIdx: number) => {
    if (table.rows.length <= 1) return;
    updateTable({ ...table, rows: table.rows.filter((_, i) => i !== rowIdx) });
  };

  const updateColumnName = (colIdx: number, name: string) => {
    const newCols = [...table.columns];
    newCols[colIdx] = name;
    updateTable({ ...table, columns: newCols });
  };

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    const newRows = table.rows.map((row, ri) =>
      ri === rowIdx ? row.map((cell, ci) => (ci === colIdx ? value : cell)) : row
    );
    updateTable({ ...table, rows: newRows });
  };

  return (
    <div className="group rounded-md border border-border bg-background/60 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/20 text-xs font-medium text-accent">
          <Table2 className="h-3 w-3" />
        </span>
        <Input
          value={title}
          onChange={(e) => updateTitle(e.target.value)}
          placeholder="Table title (optional)..."
          className="h-7 text-sm font-medium flex-1 border-none bg-transparent px-1 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <button
          onClick={() => onDelete(node.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-auto rounded border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-secondary/60">
              {table.columns.map((col, ci) => (
                <th key={ci} className="relative border-r border-border last:border-r-0">
                  <div className="flex items-center">
                    <Input
                      value={col}
                      onChange={(e) => updateColumnName(ci, e.target.value)}
                      className="h-7 border-none bg-transparent text-xs font-semibold px-2 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
                    />
                    {table.columns.length > 1 && (
                      <button
                        onClick={() => removeColumn(ci)}
                        className="px-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-8 bg-secondary/60">
                <button onClick={addColumn} className="p-1 text-muted-foreground hover:text-foreground">
                  <Plus className="h-3 w-3" />
                </button>
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
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                      className="h-7 border-none bg-transparent text-xs px-2 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
                      placeholder="..."
                    />
                  </td>
                ))}
                <td className="w-8 text-center">
                  {table.rows.length > 1 && (
                    <button onClick={() => removeRow(ri)} className="p-1 text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={addRow}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-3 w-3" /> Add row
      </button>
    </div>
  );
}

// --- Recursive group renderer ---

function RuleGroupRenderer({
  node,
  depth,
  onUpdate,
  onDelete,
  onAddChild,
  isRoot,
}: {
  node: RuleNode & { type: "group" };
  depth: number;
  onUpdate: (nodeId: string, updater: (n: RuleNode) => RuleNode) => void;
  onDelete: (nodeId: string) => void;
  onAddChild: (parentId: string, child: RuleNode) => void;
  isRoot?: boolean;
}) {
  const [newRuleText, setNewRuleText] = useState("");
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  const borderColor = node.operator === "AND" ? "border-l-blue-500" : "border-l-orange-500";
  const bgColor = depth % 2 === 0 ? "bg-secondary/30" : "bg-secondary/50";
  const pillColor = node.operator === "AND"
    ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
    : "bg-orange-500/10 text-orange-700 dark:text-orange-400";

  const directChildCount = node.children.length;
  const effectiveRequired = node.required ?? (node.operator === "AND" ? directChildCount : 1);

  const handleAddRule = () => {
    if (!newRuleText.trim()) return;
    onAddChild(node.id, { type: "rule", id: generateId(), text: newRuleText.trim() });
    setNewRuleText("");
  };

  const addSubGroup = (op: "AND" | "OR") => {
    onAddChild(node.id, { type: "group", id: generateId(), operator: op, children: [] });
  };

  return (
    <div className={cn("rounded-md border-l-[3px] p-3 space-y-2", borderColor, bgColor)}>
      <div className="flex items-center gap-2">
        <button
          onClick={() =>
            onUpdate(node.id, n =>
              n.type === "group" ? { ...n, operator: n.operator === "AND" ? "OR" : "AND" } : n
            )
          }
          className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors cursor-pointer", pillColor)}
        >
          {node.operator === "AND" ? "AND" : "OR"}
        </button>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Input
            type="number"
            min={1}
            max={directChildCount || 1}
            value={effectiveRequired}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1) {
                onUpdate(node.id, n =>
                  n.type === "group" ? { ...n, required: val } : n
                );
              }
            }}
            className="h-6 w-12 px-1 text-center text-xs"
          />
          <span>of {directChildCount} required</span>
        </span>
        <div className="flex-1" />
        {!isRoot && (
          <button onClick={() => onDelete(node.id)} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {node.children.map((child, idx) =>
        child.type === "rule" ? (
          <div key={child.id} className="group flex items-start gap-2 rounded-md bg-background/60 px-3 py-2 text-sm">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-medium text-primary">
              {idx + 1}
            </span>
            {editingRuleId === child.id ? (
              <Textarea
                value={child.text}
                onChange={(e) =>
                  onUpdate(child.id, () => ({ type: "rule", id: child.id, text: e.target.value }))
                }
                onBlur={() => setEditingRuleId(null)}
                autoFocus
                className="min-h-[60px] flex-1 resize-none text-sm"
              />
            ) : (
              <>
                <span
                  onClick={() => setEditingRuleId(child.id)}
                  className="flex-1 cursor-pointer text-foreground hover:text-primary"
                >
                  {child.text}
                </span>
                <button
                  onClick={() => onDelete(child.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        ) : child.type === "table" ? (
          <RuleTableRenderer
            key={child.id}
            node={child}
            idx={idx}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ) : (
          <RuleGroupRenderer
            key={child.id}
            node={child}
            depth={depth + 1}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onAddChild={onAddChild}
          />
        )
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Input
            value={newRuleText}
            onChange={(e) => setNewRuleText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddRule()}
            placeholder="Type a rule and press Enter..."
            className="text-sm pr-8"
          />
          <Type className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => addSubGroup("AND")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3 w-3" /> AND group
        </button>
        <button
          onClick={() => addSubGroup("OR")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3 w-3" /> OR group
        </button>
        <button
          onClick={() => {
            const tableNode: RuleNode = {
              type: "table",
              id: generateId(),
              title: "",
              table: { columns: ["Column 1", "Column 2"], rows: [["", ""]] },
            };
            onAddChild(node.id, tableNode);
          }}
          className="flex items-center gap-1 text-xs text-[#6366f1] hover:text-[#6366f1]/80 font-medium"
        >
          <Table2 className="h-3 w-3" /> Add Table Category
        </button>
      </div>
    </div>
  );
}

// --- Main editor ---

interface RuleSetEditorProps {
  onTestGuidelines: () => void;
}

export function RuleSetEditor({ onTestGuidelines }: RuleSetEditorProps) {
  const [categories, setCategories] = useState(initialRuleCategories);
  const [expandedCategory, setExpandedCategory] = useState<string | null>("diagnosis");
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);

  const updateGuideline = (categoryId: string, value: string) => {
    setCategories(cats => cats.map(cat =>
      cat.id === categoryId ? { ...cat, aiGuideline: value, hasGuideline: value.length > 0 } : cat
    ));
  };

  const updateCategoryName = (categoryId: string, displayName: string) => {
    setCategories(cats => cats.map(cat =>
      cat.id === categoryId ? { ...cat, displayName } : cat
    ));
  };

  const handleUpdateNode = (categoryId: string) => (nodeId: string, updater: (n: RuleNode) => RuleNode) => {
    setCategories(cats => cats.map(cat =>
      cat.id === categoryId ? { ...cat, children: updateNodeInTree(cat.children, nodeId, updater) } : cat
    ));
  };

  const handleDeleteNode = (categoryId: string) => (nodeId: string) => {
    setCategories(cats => cats.map(cat =>
      cat.id === categoryId ? { ...cat, children: deleteNodeFromTree(cat.children, nodeId) } : cat
    ));
  };

  const handleAddChild = (categoryId: string) => (parentId: string, child: RuleNode) => {
    setCategories(cats => cats.map(cat =>
      cat.id === categoryId ? { ...cat, children: addChildToNode(cat.children, parentId, child) } : cat
    ));
  };

  // Wrap top-level children in a virtual root AND group for categories that have bare rules
  const getDisplayRoot = (cat: RuleCategory): RuleNode & { type: "group" } => {
    if (cat.children.length === 1 && cat.children[0].type === "group") {
      return cat.children[0] as RuleNode & { type: "group" };
    }
    // Wrap in a virtual AND group
    const rootId = `root_${cat.id}`;
    return { type: "group", id: rootId, operator: "AND", children: cat.children };
  };

  // When updating via virtual root, sync back
  const handleUpdateForCategory = (categoryId: string) => (nodeId: string, updater: (n: RuleNode) => RuleNode) => {
    setCategories(cats => cats.map(cat => {
      if (cat.id !== categoryId) return cat;
      const root = getDisplayRoot(cat);
      if (nodeId === root.id) {
        const updated = updater(root);
        if (updated.type === "group") {
          if (cat.children.length === 1 && cat.children[0].type === "group") {
            return { ...cat, children: [updated] };
          }
          return { ...cat, children: updated.children };
        }
      }
      if (cat.children.length === 1 && cat.children[0].type === "group") {
        return { ...cat, children: [{ ...cat.children[0], ...{ children: updateNodeInTree((cat.children[0] as any).children, nodeId, updater) } } as any] };
      }
      return { ...cat, children: updateNodeInTree(cat.children, nodeId, updater) };
    }));
  };

  const handleDeleteForCategory = (categoryId: string) => (nodeId: string) => {
    setCategories(cats => cats.map(cat => {
      if (cat.id !== categoryId) return cat;
      if (cat.children.length === 1 && cat.children[0].type === "group") {
        return { ...cat, children: [{ ...(cat.children[0] as any), children: deleteNodeFromTree((cat.children[0] as any).children, nodeId) }] };
      }
      return { ...cat, children: deleteNodeFromTree(cat.children, nodeId) };
    }));
  };

  const handleAddForCategory = (categoryId: string) => (parentId: string, child: RuleNode) => {
    setCategories(cats => cats.map(cat => {
      if (cat.id !== categoryId) return cat;
      const root = getDisplayRoot(cat);
      if (parentId === root.id) {
        if (cat.children.length === 1 && cat.children[0].type === "group") {
          return { ...cat, children: [{ ...(cat.children[0] as any), children: [...(cat.children[0] as any).children, child] }] };
        }
        return { ...cat, children: [...cat.children, child] };
      }
      if (cat.children.length === 1 && cat.children[0].type === "group") {
        return { ...cat, children: [{ ...(cat.children[0] as any), children: addChildToNode((cat.children[0] as any).children, parentId, child) }] };
      }
      return { ...cat, children: addChildToNode(cat.children, parentId, child) };
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Rule Set & AI Guidelines</h3>
        <Button variant="ai" size="sm" onClick={onTestGuidelines}>
          <Sparkles className="h-4 w-4" />
          Test Guidelines
        </Button>
      </div>

      <div className="space-y-2">
        {categories.map((category) => {
          const ruleCount = countRules(category.children);
          const root = getDisplayRoot(category);

          return (
            <div
              key={category.id}
              className={cn(
                "rounded-lg border transition-all duration-200",
                expandedCategory === category.id ? "border-accent/50 bg-card shadow-sm" : "border-border"
              )}
            >
              <button
                onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                {expandedCategory === category.id ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{category.displayName}</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                      {category.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {ruleCount} rule{ruleCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </button>

              {expandedCategory === category.id && (
                <div className="border-t border-border px-4 py-4 animate-fade-in">
                  <div className="mb-4">
                    <h4 className="mb-2 text-sm font-medium text-foreground">Category Name</h4>
                    {editingCategoryName === category.id ? (
                      <Input
                        value={category.displayName}
                        onChange={(e) => updateCategoryName(category.id, e.target.value)}
                        onBlur={() => setEditingCategoryName(null)}
                        onKeyDown={(e) => e.key === "Enter" && setEditingCategoryName(null)}
                        autoFocus
                        className="text-sm"
                      />
                    ) : (
                      <div
                        onClick={() => setEditingCategoryName(category.id)}
                        className="flex cursor-pointer items-center gap-2 rounded-md bg-secondary/50 px-3 py-2 text-sm hover:bg-secondary"
                      >
                        <span className="flex-1 text-foreground">{category.displayName}</span>
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <h4 className="mb-2 text-sm font-medium text-foreground">Clinical Rules</h4>
                    <RuleGroupRenderer
                      node={root}
                      depth={0}
                      onUpdate={handleUpdateForCategory(category.id)}
                      onDelete={handleDeleteForCategory(category.id)}
                      onAddChild={handleAddForCategory(category.id)}
                      isRoot
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-accent" />
                      <h4 className="text-sm font-medium text-foreground">AI Review Guideline</h4>
                    </div>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Describe how a pharmacist looks for this data in chart notes. This guides the AI extraction.
                    </p>
                    <Textarea
                      value={category.aiGuideline}
                      onChange={(e) => updateGuideline(category.id, e.target.value)}
                      placeholder="e.g., Look for diagnosis codes in the assessment section..."
                      className="min-h-[100px] resize-none text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
