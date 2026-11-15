import { useState } from "react";
import { ShieldCheck, RotateCcw, Stethoscope, GripVertical, ListChecks, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PolicyCriteria, AuthTypeSection, DiagnosisSection, RuleCard, ConditionalSection } from "./CriteriaSectionsEditor";

// ── Drag item descriptor ───────────────────────────────

export interface DragPath {
  type: "rule" | "conditional" | "diagnosis" | "authType";
  authTypeId: string;
  diagnosisId?: string;
  conditionalId?: string;
  index: number;
  itemId: string;
}

interface StructurePanelProps {
  criteria: PolicyCriteria;
  onCriteriaChange: (criteria: PolicyCriteria) => void;
}

// ── Helpers ────────────────────────────────────────────

function removeDragItem(criteria: PolicyCriteria, path: DragPath): { criteria: PolicyCriteria; item: RuleCard | ConditionalSection | DiagnosisSection | AuthTypeSection | null } {
  const updated = JSON.parse(JSON.stringify(criteria)) as PolicyCriteria;
  let item: any = null;

  if (path.type === "authType") {
    const idx = updated.authTypes.findIndex(a => a.id === path.itemId);
    if (idx === -1) return { criteria: updated, item: null };
    item = updated.authTypes[idx];
    updated.authTypes.splice(idx, 1);
    return { criteria: updated, item };
  }

  const auth = updated.authTypes.find(a => a.id === path.authTypeId);
  if (!auth) return { criteria: updated, item: null };

  if (path.type === "diagnosis") {
    item = auth.diagnoses[path.index];
    auth.diagnoses.splice(path.index, 1);
  } else if (path.type === "rule") {
    const diag = auth.diagnoses.find(d => d.id === path.diagnosisId);
    if (!diag) return { criteria: updated, item: null };
    if (path.conditionalId) {
      const cond = diag.conditionals.find(c => c.id === path.conditionalId);
      if (!cond) return { criteria: updated, item: null };
      item = cond.rules[path.index];
      cond.rules.splice(path.index, 1);
    } else {
      item = diag.rules[path.index];
      diag.rules.splice(path.index, 1);
    }
  } else if (path.type === "conditional") {
    const diag = auth.diagnoses.find(d => d.id === path.diagnosisId);
    if (!diag) return { criteria: updated, item: null };
    item = diag.conditionals[path.index];
    diag.conditionals.splice(path.index, 1);
  }

  return { criteria: updated, item };
}

function insertItem(
  criteria: PolicyCriteria,
  targetAuthId: string,
  targetDiagId: string | undefined,
  targetConditionalId: string | undefined,
  targetType: "rule" | "conditional" | "diagnosis" | "authType",
  targetIndex: number,
  item: any
): PolicyCriteria {
  const updated = JSON.parse(JSON.stringify(criteria)) as PolicyCriteria;

  if (targetType === "authType") {
    updated.authTypes.splice(targetIndex, 0, item);
    return updated;
  }

  const auth = updated.authTypes.find(a => a.id === targetAuthId);
  if (!auth) return updated;

  if (targetType === "diagnosis") {
    auth.diagnoses.splice(targetIndex, 0, item);
  } else if (targetType === "rule") {
    const diag = auth.diagnoses.find(d => d.id === targetDiagId);
    if (!diag) return updated;
    if (targetConditionalId) {
      const cond = diag.conditionals.find(c => c.id === targetConditionalId);
      if (!cond) return updated;
      cond.rules.splice(targetIndex, 0, item);
    } else {
      diag.rules.splice(targetIndex, 0, item);
    }
  } else if (targetType === "conditional") {
    const diag = auth.diagnoses.find(d => d.id === targetDiagId);
    if (!diag) return updated;
    diag.conditionals.splice(targetIndex, 0, item);
  }

  return updated;
}

// ── Drop zone indicator ────────────────────────────────

function DropZone({ isOver }: { isOver: boolean }) {
  return (
    <div className="py-1">
      <div
        className={cn(
          "transition-all duration-100 relative",
          isOver ? "h-[3px]" : "h-0"
        )}
      >
        {isOver && (
          <>
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] bg-accent rounded-full shadow-[0_0_6px_hsl(var(--accent)/0.5)]" />
            <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-accent-foreground" />
          </>
        )}
      </div>
    </div>
  );
}

// ── Tree line connector ────────────────────────────────

function TreeBranch({
  children,
  isLast = false,
}: {
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className="relative pl-4 ml-1.5 min-w-0 overflow-hidden">
      {/* Vertical line */}
      <div
        className={cn(
          "absolute left-0 top-0 w-px bg-border",
          isLast ? "h-[14px]" : "h-full"
        )}
      />
      {/* Horizontal branch */}
      <div className="absolute left-0 top-[14px] w-3 h-px bg-border" />
      <div className="pt-0.5 min-w-0">{children}</div>
    </div>
  );
}

// ── Draggable card ─────────────────────────────────────

function DraggableCard({
  label,
  icon: Icon,
  iconColor,
  bgColor,
  borderColor,
  path,
  onDragStart,
  onDragEnd,
  isDragging,
  children,
  badge,
  expanded,
  onToggle,
  count,
  dropProps,
}: {
  badge?: string;
  expanded?: boolean;
  onToggle?: () => void;
  count?: number;
  label: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  path: DragPath;
  onDragStart: (path: DragPath) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  children?: React.ReactNode;
  dropProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  return (
    <div className="min-w-0 w-full">
      <div
        {...dropProps}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", JSON.stringify(path));
          e.dataTransfer.effectAllowed = "move";
          onDragStart(path);
        }}
        onDragEnd={onDragEnd}
        className={cn(
          "flex items-start gap-1.5 px-2 py-1.5 rounded-md border text-xs cursor-grab active:cursor-grabbing transition-all min-w-0 w-full",
          bgColor, borderColor,
          isDragging && "opacity-40 scale-95"
        )}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0 mt-0.5" />
        {badge ? (
          <span className="shrink-0 rounded bg-[#6E5A73] px-1.5 py-0.5 text-[10px] font-semibold text-white">{badge}</span>
        ) : (
          <Icon className={cn("h-3 w-3 shrink-0 mt-0.5", iconColor)} />
        )}
        <span className={cn("min-w-0 flex-1 font-medium text-foreground/80", badge ? "break-words leading-snug" : "truncate")}>{label || "Untitled"}</span>
        {onToggle && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            onMouseDown={(e) => e.stopPropagation()}
            draggable={false}
            title={expanded ? "Hide rules" : `Show rules${count !== undefined ? ` (${count})` : ""}`}
            className="shrink-0 flex items-center gap-0.5 rounded-full border border-border bg-card px-1 h-5 text-[10px] text-muted-foreground hover:text-foreground hover:border-foreground/40"
          >
            {expanded ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {count !== undefined && <span>{count}</span>}
          </button>
        )}
      </div>
      {(onToggle ? expanded : true) && children}
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────

export function StructurePanel({ criteria, onCriteriaChange }: StructurePanelProps) {
  const [draggingPath, setDraggingPath] = useState<DragPath | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleDrop = (
    e: React.DragEvent,
    targetAuthId: string,
    targetDiagId: string | undefined,
    targetConditionalId: string | undefined,
    targetType: "rule" | "conditional" | "diagnosis" | "authType",
    targetIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);

    try {
      const sourcePath: DragPath = JSON.parse(e.dataTransfer.getData("text/plain"));

      // Only allow same-type reordering
      if (sourcePath.type !== targetType) return;

      const { criteria: afterRemove, item } = removeDragItem(criteria, sourcePath);
      if (!item) return;

      let adjustedIndex = targetIndex;
      if (targetType === "authType") {
        const sourceIdx = criteria.authTypes.findIndex(a => a.id === sourcePath.itemId);
        if (sourceIdx < targetIndex) adjustedIndex = Math.max(0, targetIndex - 1);
      } else if (
        sourcePath.authTypeId === targetAuthId &&
        sourcePath.diagnosisId === targetDiagId &&
        sourcePath.conditionalId === targetConditionalId &&
        sourcePath.type === targetType &&
        sourcePath.index < targetIndex
      ) {
        adjustedIndex = Math.max(0, targetIndex - 1);
      }

      const result = insertItem(afterRemove, targetAuthId, targetDiagId, targetConditionalId, targetType, adjustedIndex, item);
      onCriteriaChange(result);
    } catch {
      // Invalid drag data
    }
  };

  const makeDropHandler = (
    targetAuthId: string,
    targetDiagId: string | undefined,
    targetConditionalId: string | undefined,
    targetType: "rule" | "conditional" | "diagnosis" | "authType",
    targetIndex: number,
    zoneId: string
  ) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDropTarget(zoneId);
    },
    onDragLeave: () => setDropTarget(null),
    onDrop: (e: React.DragEvent) => handleDrop(e, targetAuthId, targetDiagId, targetConditionalId, targetType, targetIndex),
  });

  // Dropping directly on a card: top half = before, bottom half = after
  const makeCardDrop = (
    targetAuthId: string,
    targetDiagId: string | undefined,
    targetConditionalId: string | undefined,
    targetType: DragPath["type"],
    idx: number,
    beforeZone: string,
    afterZone: string
  ) => {
    const isAfter = (e: React.DragEvent) => {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      return e.clientY > r.top + r.height / 2;
    };
    return {
      onDragOver: (e: React.DragEvent) => {
        if (draggingPath?.type !== targetType) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        setDropTarget(isAfter(e) ? afterZone : beforeZone);
      },
      onDrop: (e: React.DragEvent) => {
        if (draggingPath?.type !== targetType) return;
        handleDrop(e, targetAuthId, targetDiagId, targetConditionalId, targetType, isAfter(e) ? idx + 1 : idx);
      },
    };
  };

  const isDragging = (path: DragPath) =>
    draggingPath?.itemId === path.itemId && draggingPath?.type === path.type;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Structure Overview</h3>
        <p className="text-[12px] text-muted-foreground">Drag cards to reorder or re-nest</p>
      </div>
      <ScrollArea className="flex-1 min-h-0 w-full [&>div>div]:!block [&>div>div]:overflow-hidden">
        <div className="space-y-2 overflow-hidden w-full">
          {criteria.authTypes.map((auth, authIdx) => {
            const isInitial = auth.type === "initial";
            const isDiscont = auth.type === "discontinuation";
            const AuthIcon = isInitial ? ShieldCheck : RotateCcw;
            const authColor = isInitial ? "text-[#0F52BA]" : isDiscont ? "text-[#B45309]" : "text-[#0D7A5F]";
            const totalChildren = auth.diagnoses.length;
            const authDragPath: DragPath = { type: "authType", authTypeId: auth.id, index: authIdx, itemId: auth.id };
            const authZoneId = `auth-before-${authIdx}`;

            return (
              <div key={auth.id}>
                {/* Drop zone before auth type */}
                <div {...makeDropHandler("", undefined, undefined, "authType", authIdx, authZoneId)}>
                  <DropZone isOver={dropTarget === authZoneId} />
                </div>
                {/* Auth type header (draggable) */}
                <div
                  {...makeCardDrop("", undefined, undefined, "authType", authIdx, authZoneId, authIdx === criteria.authTypes.length - 1 ? "auth-after-last" : `auth-before-${authIdx + 1}`)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", JSON.stringify(authDragPath));
                    e.dataTransfer.effectAllowed = "move";
                    setDraggingPath(authDragPath);
                  }}
                  onDragEnd={() => { setDraggingPath(null); setDropTarget(null); }}
                  className={cn(
                    "flex items-center gap-1.5 py-1.5 text-xs font-bold text-foreground/70 cursor-grab active:cursor-grabbing transition-all rounded-md px-1",
                    isDragging(authDragPath) && "opacity-40 scale-95"
                  )}
                >
                  <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  <AuthIcon className={cn("h-3.5 w-3.5", authColor)} />
                  <span className="break-words" style={{ overflowWrap: "anywhere" }}>{auth.label}</span>
                </div>

                {/* Diagnosis tree */}
                {auth.diagnoses.map((diag, diagIdx) => {
                  const diagPath: DragPath = { type: "diagnosis", authTypeId: auth.id, index: diagIdx, itemId: diag.id };
                  const diagZoneId = `diag-before-${auth.id}-${diagIdx}`;
                  const isLastDiag = diagIdx === totalChildren - 1;
                  const allItems = [...diag.rules, ...diag.conditionals];
                  const totalItems = allItems.length;
                  const isUniversal = diag.name.toLowerCase().includes("all") || diag.name.toLowerCase().includes("universal");

                  return (
                    <div key={diag.id}>
                      <div {...makeDropHandler(auth.id, undefined, undefined, "diagnosis", diagIdx, diagZoneId)}>
                        <DropZone isOver={dropTarget === diagZoneId} />
                      </div>

                      <TreeBranch isLast={isLastDiag}>
                        <DraggableCard
                          label={diag.name || "Untitled Diagnosis"}
                          icon={Stethoscope}
                          iconColor={isUniversal ? "text-[#6B7280]" : "text-[#6B46C1]"}
                          bgColor={isUniversal ? "bg-[#FAFAFA]" : "bg-[#F5F0FF]"}
                          borderColor={isUniversal ? "border-[#D1D5DB]" : "border-[#DDD6FE]"}
                          path={diagPath}
                          onDragStart={setDraggingPath}
                          onDragEnd={() => { setDraggingPath(null); setDropTarget(null); }}
                          isDragging={isDragging(diagPath)}
                          badge="DX"
                          dropProps={makeCardDrop(auth.id, undefined, undefined, "diagnosis", diagIdx, diagZoneId, diagIdx === auth.diagnoses.length - 1 ? `diag-after-${auth.id}` : `diag-before-${auth.id}-${diagIdx + 1}`)}
                          expanded={expanded.has(diag.id)}
                          onToggle={() => toggleExpanded(diag.id)}
                          count={totalItems}
                        >
                          {/* Rules inside diagnosis */}
                          {diag.rules.map((rule, rIdx) => {
                            const rulePath: DragPath = { type: "rule", authTypeId: auth.id, diagnosisId: diag.id, index: rIdx, itemId: rule.id };
                            const ruleZoneId = `rule-before-${diag.id}-${rIdx}`;
                            const isLastItem = rIdx === diag.rules.length - 1 && diag.conditionals.length === 0;

                            return (
                              <div key={rule.id}>
                                <div {...makeDropHandler(auth.id, diag.id, undefined, "rule", rIdx, ruleZoneId)}>
                                  <DropZone isOver={dropTarget === ruleZoneId} />
                                </div>
                                <TreeBranch isLast={isLastItem}>
                                  <DraggableCard
                                    label={rule.title || `Rule ${rIdx + 1}`}
                                    icon={() => <div className="h-2 w-2 rounded-full bg-[#374151]" />}
                                    iconColor=""
                                    bgColor="bg-[#F9FAFB]"
                                    borderColor="border-[#E5E7EB]"
                                    path={rulePath}
                                    dropProps={makeCardDrop(auth.id, diag.id, undefined, "rule", rIdx, ruleZoneId, rIdx === diag.rules.length - 1 ? `rule-after-${diag.id}` : `rule-before-${diag.id}-${rIdx + 1}`)}
                                    onDragStart={setDraggingPath}
                                    onDragEnd={() => { setDraggingPath(null); setDropTarget(null); }}
                                    isDragging={isDragging(rulePath)}
                                  />
                                </TreeBranch>
                              </div>
                            );
                          })}
                          {/* Drop zone after last rule */}
                          <div {...makeDropHandler(auth.id, diag.id, undefined, "rule", diag.rules.length, `rule-after-${diag.id}`)}>
                            <DropZone isOver={dropTarget === `rule-after-${diag.id}`} />
                          </div>

                          {/* Conditionals */}
                          {diag.conditionals.map((cond, cIdx) => {
                            const condPath: DragPath = { type: "conditional", authTypeId: auth.id, diagnosisId: diag.id, index: cIdx, itemId: cond.id };
                            const condZoneId = `cond-before-${diag.id}-${cIdx}`;
                            const isLastCond = cIdx === diag.conditionals.length - 1;

                            return (
                              <div key={cond.id}>
                                <div {...makeDropHandler(auth.id, diag.id, undefined, "conditional", cIdx, condZoneId)}>
                                  <DropZone isOver={dropTarget === condZoneId} />
                                </div>
                                <TreeBranch isLast={isLastCond}>
                                  <DraggableCard
                                    label={`Rule Group (pass ${cond.requiredToPass} of ${cond.rules.length})`}
                                    icon={ListChecks}
                                    iconColor="text-[#B45309]"
                                    bgColor="bg-[#FFFBEB]"
                                    borderColor="border-[#FDE68A]"
                                    path={condPath}
                                    dropProps={makeCardDrop(auth.id, diag.id, undefined, "conditional", cIdx, condZoneId, cIdx === diag.conditionals.length - 1 ? `cond-after-${diag.id}` : `cond-before-${diag.id}-${cIdx + 1}`)}
                                    onDragStart={setDraggingPath}
                                    onDragEnd={() => { setDraggingPath(null); setDropTarget(null); }}
                                    isDragging={isDragging(condPath)}
                                  >
                                    {/* Rules inside conditional */}
                                    {cond.rules.map((rule, rIdx) => {
                                      const rulePath: DragPath = {
                                        type: "rule", authTypeId: auth.id, diagnosisId: diag.id,
                                        conditionalId: cond.id, index: rIdx, itemId: rule.id,
                                      };
                                      const ruleZoneId = `rule-before-${cond.id}-${rIdx}`;
                                      const isLastRule = rIdx === cond.rules.length - 1;

                                      return (
                                        <div key={rule.id}>
                                          <div {...makeDropHandler(auth.id, diag.id, cond.id, "rule", rIdx, ruleZoneId)}>
                                            <DropZone isOver={dropTarget === ruleZoneId} />
                                          </div>
                                          <TreeBranch isLast={isLastRule}>
                                            <DraggableCard
                                              label={rule.title || `Rule ${rIdx + 1}`}
                                             icon={() => <div className="h-2 w-2 rounded-full bg-[#374151]" />}
                                             iconColor=""
                                             bgColor="bg-[#F9FAFB]"
                                             borderColor="border-[#E5E7EB]"
                                              path={rulePath}
                                              dropProps={makeCardDrop(auth.id, diag.id, cond.id, "rule", rIdx, ruleZoneId, rIdx === cond.rules.length - 1 ? `rule-after-${cond.id}` : `rule-before-${cond.id}-${rIdx + 1}`)}
                                              onDragStart={setDraggingPath}
                                              onDragEnd={() => { setDraggingPath(null); setDropTarget(null); }}
                                              isDragging={isDragging(rulePath)}
                                            />
                                          </TreeBranch>
                                        </div>
                                      );
                                    })}
                                    <div {...makeDropHandler(auth.id, diag.id, cond.id, "rule", cond.rules.length, `rule-after-${cond.id}`)}>
                                      <DropZone isOver={dropTarget === `rule-after-${cond.id}`} />
                                    </div>
                                  </DraggableCard>
                                </TreeBranch>
                              </div>
                            );
                          })}
                          <div {...makeDropHandler(auth.id, diag.id, undefined, "conditional", diag.conditionals.length, `cond-after-${diag.id}`)}>
                            <DropZone isOver={dropTarget === `cond-after-${diag.id}`} />
                          </div>
                        </DraggableCard>
                      </TreeBranch>
                    </div>
                  );
                })}

                {/* Drop zone after last diagnosis */}
                <div {...makeDropHandler(auth.id, undefined, undefined, "diagnosis", auth.diagnoses.length, `diag-after-${auth.id}`)}>
                  <DropZone isOver={dropTarget === `diag-after-${auth.id}`} />
                </div>
              </div>
            );
          })}

          {/* Drop zone after last auth type */}
          <div {...makeDropHandler("", undefined, undefined, "authType", criteria.authTypes.length, "auth-after-last")}>
            <DropZone isOver={dropTarget === "auth-after-last"} />
          </div>

          {/* Empty state */}
          {criteria.authTypes.every(a => a.diagnoses.length === 0) && (
            <p className="text-[12px] text-muted-foreground text-center py-4 italic">
              Add diagnoses and rules to see them here
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
