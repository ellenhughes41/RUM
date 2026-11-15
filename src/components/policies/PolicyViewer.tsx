import { useState, useRef, useEffect, useCallback } from "react";
import { Check, FileText, Link, ExternalLink, Calendar, Clock, Sparkles, History, Pill, Send, FileEdit, Plus, Trash2, MoreVertical, Copy, ChevronDown, AlertTriangle, X, Pencil, Upload, MessageSquare, Eye, ShieldCheck, RotateCcw, Stethoscope, ListChecks, Building2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePolicyComments } from "@/hooks/use-policy-comments";
import { CommentSidebar } from "@/components/policies/CommentSidebar";
import { CommentableText } from "@/components/policies/CommentableText";
import { ViewVersionModal } from "@/components/policies/ViewVersionModal";
import { SignOffModal } from "@/components/policies/SignOffModal";
import { CriteriaSectionsEditor, type PolicyCriteria, type AuthTypeSection, type DiagnosisSection, type ConditionalSection, type RuleCard, prefillMap, defaultCriteria, levelColors } from "@/components/policies/CriteriaSectionsEditor";
import { InlineAddSourceDocument, type SourceDocument } from "@/components/policies/InlineAddSourceDocument";

interface CriterionItem {
  id: string;
  value: string;
}

interface PolicyField {
  id: string;
  name: string;
  items: CriterionItem[];
}

interface PolicySection {
  id: string;
  name: string;
  icon: string;
  badge?: string;
  fields: PolicyField[];
  isOpen: boolean;
}

interface Attachment {
  id: string;
  name: string;
  type: "pdf" | "link";
  url?: string;
}

interface PolicyViewerProps {
  policyName: string;
  policyId?: string;
  category: string;
  status?: "draft" | "published";
  effectiveDate?: string;
  terminationDate?: string;
  currentVersion?: string;
  onTestGuidelines: () => void;
  onDuplicate: () => void;
  onPublish?: () => void;
  onSaveDraft?: () => void;
  onDelete?: () => void;
  onUpdateVersion?: () => void;
  showComments?: boolean;
  initialEditing?: boolean;
  isDefaultPolicy?: boolean;
  duplicateOfId?: string;
  duplicateOfName?: string;
  onNavigateToPolicy?: (policyId: string) => void;
}

// Derive display status from stored status + dates
const getDisplayStatus = (status: "draft" | "published", effectiveDate?: string, terminationDate?: string): "draft" | "published" | "active" | "terminated" => {
  if (status === "draft") return "draft";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (terminationDate && new Date(terminationDate) < today) return "terminated";
  if (effectiveDate && new Date(effectiveDate) <= today) return "active";
  return "published";
};

const formatDateStr = (date: Date) => format(date, "yyyy-MM-dd");

const availablePlans = [
  "Commercial",
  "Medicare Part D",
  "Medicare Advantage",
  "Medicaid",
  "Exchange / ACA",
  "Employer Group",
  "Federal Employee (FEHB)",
];

const availableCompanies = [
  "Aetna",
  "Cigna",
  "UnitedHealthcare",
  "Blue Cross Blue Shield",
  "Humana",
  "Kaiser Permanente",
  "Centene",
  "Molina Healthcare",
];


// ── Policy data helpers ───────────────────────────────

const isWeightLossPolicy = (policyName?: string): boolean => {
  if (!policyName) return false;
  const lower = policyName.toLowerCase();
  return lower.includes("ozempic") || lower.includes("wegovy") || lower.includes("zepbound") || lower.includes("mounjaro") || lower.includes("weight");
};

const isDupixentPolicy = (policyName?: string): boolean => {
  if (!policyName) return false;
  return policyName.toLowerCase().includes("dupixent");
};

export const getPolicyCategoriesForTesting = (policyName?: string): string[] => {
  if (!policyName) return ["Age", "Diagnosis", "Prior Therapy", "Prescriber", "Contraindications"];
  const lower = policyName.toLowerCase();
  if (lower.includes("qulipta")) return ["Age", "Diagnosis", "Prior Therapy", "Prescriber", "Contraindications", "Quantity Limit"];
  if (lower.includes("preferred glp-1") || lower.includes("gip/glp-1")) return ["Diagnosis", "Prior Therapy", "Exclusions"];
  if (isWeightLossPolicy(policyName)) return ["Age", "BMI", "Diagnosis", "Lifestyle Modifications", "Step Therapy", "Exclusions", "Prescriber"];
  if (isDupixentPolicy(policyName)) return ["Age", "Diagnosis", "Prior Therapy", "Prescriber", "Contraindications"];
  if (lower.includes("humira")) return ["Age", "Diagnosis", "Prior Therapy", "Lab Work", "Disease Activity", "Contraindications", "Prescriber"];
  if (lower.includes("galantamine") || lower.includes("rivastigmine")) return ["Age", "Diagnosis", "MMSE Score", "Prior Therapy", "Renal Function", "Hepatic Function", "Contraindications", "Prescriber"];
  if (lower.includes("evenity")) return ["Age", "Diagnosis", "Bone Density", "Prior Therapy", "Cardiovascular Risk", "Prescriber"];
  if (lower.includes("skyrizi") || lower.includes("risankizumab")) return ["Age", "Diagnosis", "Prior Therapy", "Prescriber", "Contraindications"];
  if (lower.includes("rinvoq")) return ["Age", "Diagnosis", "Prior Therapy", "Lab Work", "Contraindications", "Prescriber"];
  return ["Age", "Diagnosis", "Prior Therapy", "Prescriber", "Contraindications"];
};

// ── Mock policy data ──────────────────────────────────

const getQuliptaPolicyData = (_optionLevel: string) => ({
  effectiveDate: "2023-07-01",
  terminationDate: "2026-06-30",
  lastReviewDate: "2025-11-01",
  initialDuration: "1 year",
  reauthorizationDuration: "1 year",
  attachments: [
    { id: "1", name: "FDA Label - Qulipta (atogepant)", type: "pdf" as const },
    { id: "2", name: "ADVANCE Study - NEJM Reference", type: "link" as const, url: "https://doi.org/10.1056/NEJMoa2035908" },
  ] as Attachment[],
  versionHistory: [
    { id: "v2", version: "1.1", changedBy: "Dr. Martinez", changedAt: "2025-11-15", summary: "Updated review date, refined chronic migraine criteria" },
    { id: "v1", version: "1.0", changedBy: "System", changedAt: "2023-07-01", summary: "Initial policy creation" },
  ],
  sections: [
    {
      id: "s1", name: "Episodic Migraine Criteria", icon: "⊕", badge: "Initial",
      fields: [
        { id: "f1", name: "Age Requirements", items: [{ id: "i1", value: "Patient must be 18 years of age or older" }] },
        { id: "f2", name: "Diagnosis", items: [{ id: "i2", value: "Confirmed diagnosis of episodic migraine (4-14 headache days per month)" }] },
        { id: "f3", name: "Prior Therapy", items: [{ id: "i3", value: "Trial and failure of at least TWO standard prophylactic therapies" }] },
        { id: "f4", name: "Prescriber", items: [{ id: "i4", value: "Must be prescribed by a neurologist or headache specialist" }] },
      ],
      isOpen: true,
    },
  ] as PolicySection[],
});

const getWeightLossPolicyData = () => ({
  effectiveDate: "2025-01-01",
  terminationDate: undefined,
  lastReviewDate: "2025-06-01",
  initialDuration: "6 months",
  reauthorizationDuration: "6 months",
  attachments: [
    { id: "1", name: "FDA Label - GLP-1 RA Class", type: "pdf" as const },
  ] as Attachment[],
  versionHistory: [
    { id: "v1", version: "1.0", changedBy: "System", changedAt: "2025-01-01", summary: "Initial policy creation" },
  ],
  sections: [
    {
      id: "s1", name: "Weight Management Criteria", icon: "⊕", badge: "Initial",
      fields: [
        { id: "f1", name: "Age Requirements", items: [{ id: "i1", value: "Patient must be 18 years of age or older" }] },
        { id: "f2", name: "BMI Requirements", items: [{ id: "i2", value: "BMI ≥ 30 kg/m², OR BMI ≥ 27 kg/m² with at least one weight-related comorbidity" }] },
        { id: "f3", name: "Lifestyle Modifications", items: [{ id: "i3", value: "Trial of diet and lifestyle modifications for at least 3 months" }] },
        { id: "f4", name: "Exclusions", items: [{ id: "i4", value: "No personal/family history of medullary thyroid carcinoma or MEN 2" }] },
      ],
      isOpen: true,
    },
  ] as PolicySection[],
});

const getDupixentPolicyData = () => ({
  effectiveDate: "2024-01-01",
  terminationDate: undefined,
  lastReviewDate: "2025-03-01",
  initialDuration: "1 year",
  reauthorizationDuration: "1 year",
  attachments: [
    { id: "1", name: "FDA Label - Dupixent (dupilumab)", type: "pdf" as const },
    { id: "2", name: "LIBERTY AD SOLO Clinical Trial", type: "link" as const, url: "https://doi.org/10.1056/NEJMoa1610020" },
  ] as Attachment[],
  versionHistory: [
    { id: "v2", version: "1.1", changedBy: "Dr. Foster", changedAt: "2025-03-01", summary: "Updated step therapy requirements" },
    { id: "v1", version: "1.0", changedBy: "System", changedAt: "2024-01-01", summary: "Initial policy creation" },
  ],
  sections: [
    {
      id: "s1", name: "Atopic Dermatitis Criteria", icon: "⊕", badge: "Initial",
      fields: [
        { id: "f1", name: "Age Requirements", items: [{ id: "i1", value: "Patient must be 6 months of age or older" }] },
        { id: "f2", name: "Diagnosis", items: [{ id: "i2", value: "Confirmed diagnosis of moderate-to-severe atopic dermatitis" }] },
        { id: "f3", name: "Prior Therapy", items: [{ id: "i3", value: "Trial and failure of at least one topical corticosteroid" }] },
        { id: "f4", name: "Prescriber", items: [{ id: "i4", value: "Must be prescribed by a dermatologist or allergist" }] },
      ],
      isOpen: true,
    },
  ] as PolicySection[],
});

const getDefaultPolicyData = (policyName: string) => ({
  effectiveDate: "2024-01-01",
  terminationDate: undefined,
  lastReviewDate: "2025-01-01",
  initialDuration: "1 year",
  reauthorizationDuration: "1 year",
  attachments: [
    { id: "1", name: `FDA Label - ${policyName}`, type: "pdf" as const },
  ] as Attachment[],
  versionHistory: [
    { id: "v1", version: "1.0", changedBy: "System", changedAt: "2024-01-01", summary: "Initial policy creation" },
  ],
  sections: [
    {
      id: "s1", name: "Authorization Criteria", icon: "⊕", badge: "Initial",
      fields: [
        { id: "f1", name: "Age Requirements", items: [{ id: "i1", value: "Patient must be 18 years of age or older" }] },
        { id: "f2", name: "Diagnosis", items: [{ id: "i2", value: "Confirmed diagnosis per FDA-approved indication" }] },
        { id: "f3", name: "Prior Therapy", items: [{ id: "i3", value: "Documented prior therapy as per policy requirements" }] },
        { id: "f4", name: "Prescriber", items: [{ id: "i4", value: "Must be prescribed by appropriate specialist" }] },
      ],
      isOpen: true,
    },
  ] as PolicySection[],
});

const getMockPolicyDataForOption = (optionLevel: string, policyName?: string) => {
  if (!policyName) return getDefaultPolicyData("Unknown");
  const lower = policyName.toLowerCase();
  if (lower.includes("qulipta")) return getQuliptaPolicyData(optionLevel);
  if (isWeightLossPolicy(policyName)) return getWeightLossPolicyData();
  if (isDupixentPolicy(policyName)) return getDupixentPolicyData();
  return getDefaultPolicyData(policyName);
};

const getCriteriaForPolicy = (policyName?: string): PolicyCriteria => {
  if (!policyName) return defaultCriteria;
  const lower = policyName.toLowerCase();
  // Check prefill map for known policies
  for (const [key, criteria] of Object.entries(prefillMap)) {
    if (lower.includes(key)) return criteria;
  }
  return defaultCriteria;
};

// ── Read-Only Criteria Rendering ──────────────────────

function ReadOnlyRuleItem({ rule, index }: { rule: RuleCard; index: number }) {
  return (
    <div className="flex gap-2 items-start p-3 bg-white rounded-lg border border-border shadow-sm">
      <span className="text-[12px] font-bold tracking-wide px-[7px] py-0.5 rounded shrink-0 mt-0.5 font-mono bg-muted text-muted-foreground">
        R{index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] leading-relaxed text-foreground">{rule.title}</p>
        {rule.tags && rule.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {rule.tags.map((t) => (
              <span key={t} className="text-[12px] font-semibold rounded px-1.5 py-0.5 bg-accent/10 text-accent">
                {t}
              </span>
            ))}
          </div>
        )}
        {rule.aiPrompt && (
          <p className="text-[12px] leading-snug text-muted-foreground mt-1 italic">
            <span className="font-semibold not-italic text-primary/70">AI Hint:</span> {rule.aiPrompt}
          </p>
        )}
      </div>
    </div>
  );
}

function ReadOnlyConditionalBranch({ section, startIndex }: { section: ConditionalSection; startIndex: number }) {
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-50/50 p-3 my-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[12px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-700">
          {section.requiredToPass} of {section.rules.length}
        </span>
        {section.title && <span className="text-xs font-medium text-amber-700">{section.title}</span>}
      </div>
      <div className="space-y-1 pl-2">
        {section.rules.map((rule, idx) => (
          <ReadOnlyRuleItem key={rule.id} rule={rule} index={startIndex + idx} />
        ))}
      </div>
    </div>
  );
}

function ReadOnlyDiagnosisBranch({ diagnosis, authColor, isLast }: { diagnosis: DiagnosisSection; authColor: { accent: string; light: string; badge: string }; isLast?: boolean }) {
  const isDrug = diagnosis.kind === "drug-group";
  const isAll = diagnosis.kind === "all" || diagnosis.name.toLowerCase().startsWith("all");
  const color = isDrug ? { accent: "#0E7490", badge: "#155E75" } : isAll ? { accent: "#374151", badge: "#374151" } : { accent: "#6B46C1", badge: "#5B21B6" };
  const label = isDrug ? "DRUG" : isAll ? "ALL" : "Dx";

  return (
    <div className={cn("rounded-lg border p-3 mb-2", isLast ? "" : "")} style={{ borderColor: `${color.accent}22`, background: `${color.accent}05` }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[12px] font-bold tracking-wider uppercase rounded px-1.5 py-0.5 text-white" style={{ background: color.badge }}>
          {label}
        </span>
        <span className="text-sm font-semibold" style={{ color: color.accent }}>
          {diagnosis.name || (isAll ? "All Diagnoses" : isDrug ? "Drug Group" : "Diagnosis")}
        </span>
      </div>
      <div className="space-y-1 pl-2">
        {diagnosis.rules.map((rule, idx) => (
          <ReadOnlyRuleItem key={rule.id} rule={rule} index={idx} />
        ))}
        {diagnosis.conditionals.map((cond, idx) => (
          <ReadOnlyConditionalBranch key={cond.id} section={cond} startIndex={diagnosis.rules.length + idx} />
        ))}
        {diagnosis.drugGroups?.map((dg) => (
          <ReadOnlyDiagnosisBranch key={dg.id} diagnosis={dg} authColor={authColor} />
        ))}
      </div>
    </div>
  );
}

function ReadOnlyAuthTypeBranch({ section }: { section: AuthTypeSection }) {
  const color = section.type === "initial" ? { accent: "#0F52BA", light: "#EBF0FA", badge: "#D6E4FF" } : section.type === "discontinuation" ? { accent: "#B45309", light: "#FFF7ED", badge: "#FDE68A" } : { accent: "#0D7A5F", light: "#EAFAF5", badge: "#C6F0E4" };
  const icon = section.type === "initial" ? "⊕" : section.type === "discontinuation" ? "⊘" : "↻";

  return (
    <div className="rounded-xl mb-4" style={{ border: `1.5px solid ${color.accent}22`, background: color.light }}>
      <div className="flex items-center gap-2.5 px-[18px] py-3.5" style={{ borderBottom: `1px solid ${color.accent}20`, background: `${color.accent}08` }}>
        <span className="text-lg" style={{ color: color.accent }}>{icon}</span>
        <span className="text-[15px] font-bold tracking-tight" style={{ color: color.accent }}>{section.label}</span>
      </div>
      <div className="p-4 space-y-2">
        {section.rules.map((rule, idx) => (
          <ReadOnlyRuleItem key={rule.id} rule={rule} index={idx} />
        ))}
        {section.conditionals.map((cond, idx) => (
          <ReadOnlyConditionalBranch key={cond.id} section={cond} startIndex={section.rules.length + idx} />
        ))}
        {section.diagnoses.map((diag, idx) => (
          <ReadOnlyDiagnosisBranch key={diag.id} diagnosis={diag} authColor={color} isLast={idx === section.diagnoses.length - 1} />
        ))}
      </div>
    </div>
  );
}

function ReadOnlyCriteriaView({ policyName }: { policyName?: string }) {
  const criteria = getCriteriaForPolicy(policyName);

  if (criteria.authTypes.length === 0 && criteria.rules.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">No criteria defined yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {criteria.rules.length > 0 && (
        <div className="rounded-lg border border-border p-4">
          <h4 className="text-sm font-semibold mb-2">Global Rules</h4>
          {criteria.rules.map((rule, idx) => (
            <ReadOnlyRuleItem key={rule.id} rule={rule} index={idx} />
          ))}
        </div>
      )}
      {criteria.authTypes.map((auth) => (
        <ReadOnlyAuthTypeBranch key={auth.id} section={auth} />
      ))}
    </div>
  );
}


const getAssignedMedications = (policyName: string): string[] => {
  const policyLower = policyName.toLowerCase();
  
  if (policyLower.includes("qulipta")) {
    return ["Qulipta (atogepant)"];
  } else if (isWeightLossPolicy(policyName)) {
    return ["Wegovy (semaglutide)", "Zepbound (tirzepatide)", "Ozempic (semaglutide)", "Mounjaro (tirzepatide)"];
  } else if (policyLower.includes("dupixent")) {
    return ["Dupixent (dupilumab)"];
  } else if (policyLower.includes("humira")) {
    return ["Humira (adalimumab)"];
  }
  
  // Default - derive from policy name
  return [policyName];
};

export function PolicyViewer({ policyName, policyId = "default-policy", category, status = "published", effectiveDate: propEffectiveDate, terminationDate: propTerminationDate, currentVersion = "1.0", onTestGuidelines, onDuplicate, onPublish, onSaveDraft, onDelete, onUpdateVersion, showComments = true, initialEditing = false, isDefaultPolicy = false, duplicateOfId, duplicateOfName, onNavigateToPolicy }: PolicyViewerProps) {
  const initialPolicyData = getMockPolicyDataForOption("option-b", policyName);
  const assignedMedications = getAssignedMedications(policyName);

  // Compute display status
  const displayStatus = getDisplayStatus(status, propEffectiveDate || initialPolicyData.effectiveDate, propTerminationDate || initialPolicyData.terminationDate);
  
  // Granular edit permissions based on status
  const canEnterEditMode = displayStatus !== "terminated";
  const isDraft = displayStatus === "draft";
  const isPublished = displayStatus === "published";
  const isActive = displayStatus === "active";
  // Draft: full edit; Published: title, effective date, termination date; Active: title, termination date
  const canEditTitle = isDraft || isPublished || isActive;
  const canEditEffectiveDate = isDraft || isPublished;
  const canEditTerminationDate = isDraft || isPublished || isActive;
  const canEditFullPolicy = isDraft; // drug list, plan, durations, criteria, etc.

  // Drug List & Plan combobox state
  const [selectedDrugList, setSelectedDrugList] = useState(`${policyName} Drug List`);
  const [selectedPlan, setSelectedPlan] = useState("Commercial");
  const [drugListOpen, setDrugListOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [allPlansChecked, setAllPlansChecked] = useState(true);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [allCompaniesChecked, setAllCompaniesChecked] = useState(true);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [useCopilot, setUseCopilot] = useState(true);
  
  // Editable title state
  const [editTitle, setEditTitle] = useState(policyName);
  
  // Any non-terminated policy can enter edit mode
  const [isEditing, setIsEditing] = useState(initialEditing && canEnterEditMode);

  // Editable date state
  const [editEffectiveDate, setEditEffectiveDate] = useState(initialPolicyData.effectiveDate || "");
  const [editTerminationDate, setEditTerminationDate] = useState(initialPolicyData.terminationDate || "");
  const [lastReviewDate, setLastReviewDate] = useState(initialPolicyData.lastReviewDate || initialPolicyData.effectiveDate || "");
  const parseDurationMonths = (duration?: string): number => {
    if (!duration) return 12;
    const lower = duration.toLowerCase();
    const num = parseInt(lower, 10);
    if (isNaN(num)) return 12;
    if (lower.includes("year")) return num * 12;
    return num;
  };
  const [editInitialDuration, setEditInitialDuration] = useState<number>(parseDurationMonths(initialPolicyData.initialDuration));
  const [editReauthDuration, setEditReauthDuration] = useState<number>(parseDurationMonths(initialPolicyData.reauthorizationDuration));
  const [editInitialUnit, setEditInitialUnit] = useState<string>("Months");
  const [editReauthUnit, setEditReauthUnit] = useState<string>("Months");
  
  // Always editable - store sections in state for autosave
  const [editedSections, setEditedSections] = useState<PolicySection[]>(initialPolicyData.sections);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isCommentSidebarOpen, setIsCommentSidebarOpen] = useState(false);
  const [highlightedLocationId, setHighlightedLocationId] = useState<string | null>(null);
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDuplicateDismissed, setIsDuplicateDismissed] = useState(false);
  const [showSignOff, setShowSignOff] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [customAttachments, setCustomAttachments] = useState<SourceDocument[]>([]);
  const {
    comments,
    allComments,
    activeCommentId,
    setActiveCommentId,
    filter,
    setFilter,
    pendingHighlight,
    addComment,
    addReply,
    editComment,
    resolveComment,
    reopenComment,
    deleteComment,
    getCommentsForLocation,
    startComment,
    cancelPendingComment,
  } = usePolicyComments(policyId);

  // Open sidebar when starting a comment
  useEffect(() => {
    if (pendingHighlight) {
      setIsCommentSidebarOpen(true);
    }
  }, [pendingHighlight]);

  // Formulary update alert state (only for Qulipta)
  const isQuliptaPolicy = policyName.toLowerCase().includes("qulipta");
  const [showFormularyAlert, setShowFormularyAlert] = useState(isQuliptaPolicy);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Version viewing state
  const [viewingVersion, setViewingVersion] = useState<{ id: string; version: string; changedBy: string; changedAt: string; summary: string } | null>(null);
  const [showVersionModal, setShowVersionModal] = useState(false);

  // Formulary update data
  const formularyUpdateData = {
    updatedAt: "January 15, 2026",
    source: "CVS Caremark Formulary Update Q1 2026",
    changes: [
      { type: "added" as const, criterion: "CGRP therapy must be discontinued if no improvement in migraine frequency after 3 months" },
      { type: "modified" as const, criterion: "Step therapy now requires trial of TWO prophylactic therapies (previously ONE)", previousValue: "Trial and failure of at least ONE standard prophylactic pharmacologic therapy" },
      { type: "added" as const, criterion: "Quantity limit of 30 tablets per 30 days" },
    ]
  };

  const handleViewVersion = (version: typeof viewingVersion) => {
    setViewingVersion(version);
    setShowVersionModal(true);
  };

  const handleRestoreVersion = (versionId: string, signOffData: { name: string; timestamp: string }) => {
    toast({
      title: "Version Restored",
      description: `Policy restored to version ${viewingVersion?.version}. Signed off by ${signOffData.name} at ${signOffData.timestamp}.`,
    });
    setShowVersionModal(false);
    setViewingVersion(null);
  };

  const handleCommentClick = useCallback((locationId: string) => {
    setHighlightedLocationId(locationId);
    // Clear highlight after a short delay
    setTimeout(() => setHighlightedLocationId(null), 2000);
  }, []);

  const handleCommentIndicatorClick = useCallback((commentId: string) => {
    setActiveCommentId(commentId);
    setIsCommentSidebarOpen(true);
  }, [setActiveCommentId]);

  const openCommentCount = allComments.filter(c => c.status === "open").length;

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleConfirmFormularyUpdate = () => {
    setShowReviewModal(false);
    setShowFormularyAlert(false);
    toast({
      title: "Formulary Update Confirmed",
      description: "The policy criteria have been reviewed and confirmed.",
    });
  };

  const policyData = { ...initialPolicyData, sections: editedSections };

  // Autosave function
  const autosave = () => {
    toast({
      title: "Saved",
      description: "Changes saved automatically.",
      duration: 1500,
    });
  };

  const updateFieldName = (sectionId: string, fieldId: string, newName: string) => {
    setEditedSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { ...section, fields: section.fields.map(field => 
              field.id === fieldId ? { ...field, name: newName } : field
            )}
          : section
      )
    );
  };

  const handleFieldNameBlur = () => {
    setEditingFieldId(null);
    autosave();
  };

  const updateItemValue = (sectionId: string, fieldId: string, itemId: string, newValue: string) => {
    setEditedSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { ...section, fields: section.fields.map(field => 
              field.id === fieldId 
                ? { ...field, items: field.items.map(item => 
                    item.id === itemId ? { ...item, value: newValue } : item
                  )}
                : field
            )}
          : section
      )
    );
  };

  const handleItemBlur = () => {
    setEditingItemId(null);
    autosave();
  };

  const addItem = (sectionId: string, fieldId: string) => {
    const newItem: CriterionItem = { id: `new-${Date.now()}`, value: "" };
    setEditedSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { ...section, fields: section.fields.map(field => 
              field.id === fieldId 
                ? { ...field, items: [...field.items, newItem] }
                : field
            )}
          : section
      )
    );
    setEditingItemId(newItem.id);
  };

  const deleteItem = (sectionId: string, fieldId: string, itemId: string) => {
    setEditedSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { ...section, fields: section.fields.map(field => 
              field.id === fieldId 
                ? { ...field, items: field.items.filter(item => item.id !== itemId) }
                : field
            )}
          : section
      )
    );
    autosave();
  };

  const addField = (sectionId: string) => {
    const newField: PolicyField = { 
      id: `field-${Date.now()}`, 
      name: "New Field", 
      items: [] 
    };
    setEditedSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { ...section, fields: [...section.fields, newField] }
          : section
      )
    );
    setEditingFieldId(newField.id);
  };

  const deleteField = (sectionId: string, fieldId: string) => {
    setEditedSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { ...section, fields: section.fields.filter(f => f.id !== fieldId) }
          : section
      )
    );
    autosave();
  };

  return (
    <div className="flex">
      <div className={cn("flex-1 space-y-6 transition-all duration-300", isCommentSidebarOpen && "mr-80")}>

      {/* Potential Duplicate Warning */}
      {duplicateOfId && !isDuplicateDismissed && (
        <Alert className="border-amber-500/50 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Potential Duplicate Detected</AlertTitle>
          <AlertDescription className="text-amber-700">
            This policy may be a duplicate of{" "}
            {onNavigateToPolicy ? (
              <button
                onClick={() => onNavigateToPolicy(duplicateOfId)}
                className="font-semibold underline underline-offset-2 hover:text-amber-900 transition-colors"
              >
                {duplicateOfName || "the original policy"}
              </button>
            ) : (
              <span className="font-semibold">{duplicateOfName || "another policy"}</span>
            )}
            . Please review and resolve.
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  setIsDuplicateDismissed(true);
                  toast({ title: "Duplicate dismissed", description: "The duplicate flag has been removed." });
                }}
                className="inline-flex items-center rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Header Card */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {isEditing && canEditTitle ? (
                  <Input
                    value={editTitle}
                    onChange={(e) => { setEditTitle(e.target.value); setHasUnsavedChanges(true); }}
                    className="h-8 text-base font-semibold w-64"
                  />
                ) : (
                  <h1 className="font-semibold text-foreground">{editTitle}</h1>
                )}
                {displayStatus === "draft" && (
                  <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground bg-muted">
                    <FileEdit className="h-3 w-3 mr-1" />
                    Draft
                  </Badge>
                )}
                {displayStatus === "published" && (
                  <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-600 bg-blue-500/10">
                    Published
                  </Badge>
                )}
                {displayStatus === "active" && (
                  <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-600 bg-emerald-500/10">
                    Active
                  </Badge>
                )}
                {displayStatus === "terminated" && (
                  <Badge variant="outline" className="text-xs border-destructive/50 text-destructive bg-destructive/10">
                    Terminated
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Cancel / Save buttons when editing, Edit button when viewing */}
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCancelWarning(true)}
                  className="gap-1.5 h-8 text-foreground hover:text-red-600 hover:bg-transparent"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    setLastReviewDate(today.toISOString().split('T')[0]);
                    setIsEditing(false);
                    setHasUnsavedChanges(false);
                    onSaveDraft?.();
                  }}
                  variant={hasUnsavedChanges ? "default" : "outline"}
                   className="gap-1.5 h-8"
                 >
                   <Check className="h-3.5 w-3.5" />
                   {isDraft ? "Save Draft" : "Save"}
                </Button>
              </>
            ) : null}
            {/* Edit policy icon button */}
            {canEnterEditMode && <Button
              variant="outline"
              size="icon"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 rounded-full transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </Button>}
            {/* Comments toggle button */}
            {showComments && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsCommentSidebarOpen(!isCommentSidebarOpen)}
                className={cn(
                  "h-8 w-8 rounded-full relative transition-colors",
                  isCommentSidebarOpen && "bg-amber-500 hover:bg-amber-600 border-amber-500 text-white"
                )}
              >
                <MessageSquare className="h-4 w-4" />
                {openCommentCount > 0 && (
                  <span className={cn(
                    "absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full text-[12px] font-medium flex items-center justify-center",
                    isCommentSidebarOpen ? "bg-white text-amber-600" : "bg-primary text-primary-foreground"
                  )}>
                    {openCommentCount}
                  </span>
                )}
              </Button>
            )}
            {displayStatus === "draft" && onPublish && (
              <Button variant="default" size="sm" onClick={() => setShowSignOff(true)} className="gap-1.5 h-8">
                <Send className="h-3.5 w-3.5" />
                Publish
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onUpdateVersion && (
                  <DropdownMenuItem onClick={onUpdateVersion}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload New Version
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate Policy
                </DropdownMenuItem>
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Policy
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Formulary Update Alert - Only for Qulipta */}
      {showFormularyAlert && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700 font-semibold flex items-center justify-between">
            <span>Formulary Update Requires Attention</span>
            <button 
              onClick={() => setShowFormularyAlert(false)}
              className="p-1 rounded hover:bg-amber-500/20 transition-colors"
            >
              <X className="h-4 w-4 text-amber-600" />
            </button>
          </AlertTitle>
          <AlertDescription className="text-amber-700/90">
            <p className="mb-3">
              The formulary criteria for this policy has been updated on <strong>{formularyUpdateData.updatedAt}</strong>. 
              Please review the changes to ensure your policy remains aligned with current requirements.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowReviewModal(true)}
              className="border-amber-600/50 text-amber-700 hover:bg-amber-500/20 hover:text-amber-800"
            >
              Review and Confirm
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Formulary Update Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Formulary Update Review
            </DialogTitle>
            <DialogDescription>
              Review the changes from the latest formulary update and confirm that your policy criteria is aligned.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Update Source */}
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span>Source</span>
              </div>
              <p className="font-medium text-foreground">{formularyUpdateData.source}</p>
              <p className="text-sm text-muted-foreground">Updated: {formularyUpdateData.updatedAt}</p>
            </div>

            {/* Changes List */}
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Criteria Changes</h4>
              
              {formularyUpdateData.changes.map((change, index) => (
                <div 
                  key={index} 
                  className={cn(
                    "rounded-lg border p-3",
                    change.type === "added" 
                      ? "border-green-500/30 bg-green-500/5" 
                      : "border-amber-500/30 bg-amber-500/5"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs shrink-0",
                        change.type === "added" 
                          ? "border-green-500/50 text-green-700 bg-green-500/10" 
                          : "border-amber-500/50 text-amber-700 bg-amber-500/10"
                      )}
                    >
                      {change.type === "added" ? "New" : "Modified"}
                    </Badge>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-foreground">{change.criterion}</p>
                      {change.previousValue && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Previous:</span> {change.previousValue}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmFormularyUpdate}>
              Confirm Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Policy Info */}
      <div className="rounded-lg border border-border bg-card/50 p-4 space-y-4">
        {/* Assigned Drug List & Carrier - hidden for default policies */}
        {!isDefaultPolicy && (
          <>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Drug List:</span>
                {isEditing && canEditFullPolicy ? (
                  <Popover open={drugListOpen} onOpenChange={setDrugListOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs font-medium">
                        {selectedDrugList}
                        <ChevronDown className="h-3 w-3 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                  <PopoverContent className="w-64 p-0 z-50 bg-popover" align="start">
                    <Command>
                      <CommandInput placeholder="Search drug lists..." />
                      <CommandList>
                        <CommandEmpty>No drug list found.</CommandEmpty>
                        <CommandGroup>
                          {[
                            `${policyName} Drug List`,
                            "Specialty Pharmacy Drug List",
                            "Preferred Brand Drug List",
                            "Non-Preferred Brand Drug List",
                            "Generic Drug List",
                            "Biosimilar Drug List",
                          ].map((dl) => (
                            <CommandItem
                              key={dl}
                              value={dl}
                              onSelect={() => {
                                setSelectedDrugList(dl);
                                setDrugListOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-3.5 w-3.5", selectedDrugList === dl ? "opacity-100" : "opacity-0")} />
                              {dl}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                ) : (
                  <span className="text-sm font-medium">{selectedDrugList}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Carrier:</span>
                {isEditing && canEditFullPolicy ? (
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox checked={allPlansChecked} onCheckedChange={(checked) => {
                        setAllPlansChecked(!!checked);
                        if (checked) setSelectedPlans([]);
                      }} />
                      <span className="font-medium">All Carriers</span>
                    </label>
                    {!allPlansChecked && (
                      <Popover open={planOpen} onOpenChange={setPlanOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs font-medium">
                            {selectedPlans.length > 0 ? `${selectedPlans.length} selected` : "Select carriers"}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0 z-50 bg-popover" align="start">
                          <Command>
                            <CommandInput placeholder="Search plans..." />
                            <CommandList>
                              <CommandEmpty>No plan found.</CommandEmpty>
                              <CommandGroup>
                                {availablePlans.map((plan) => (
                                  <CommandItem
                                    key={plan}
                                    value={plan}
                                    onSelect={() => {
                                      setSelectedPlans(prev => prev.includes(plan) ? prev.filter(p => p !== plan) : [...prev, plan]);
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-3.5 w-3.5", selectedPlans.includes(plan) ? "opacity-100" : "opacity-0")} />
                                    {plan}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                ) : (
                  <span className="text-sm font-medium">
                    {allPlansChecked ? "All Carriers" : selectedPlans.length > 0 ? selectedPlans.join(", ") : "All Carriers"}
                  </span>
                )}
              </div>

              <label className={cn("flex items-center gap-1.5 text-sm", (isEditing && canEditFullPolicy) ? "cursor-pointer" : "cursor-not-allowed opacity-70")}>
                <Checkbox
                  checked={useCopilot}
                  onCheckedChange={(checked) => setUseCopilot(checked === true)}
                  disabled={!(isEditing && canEditFullPolicy)}
                />
                <span className="text-muted-foreground">Use Copilot</span>
              </label>
            </div>
            
            <div className="h-px bg-border" />
          </>
        )}
        
        {/* Policy Details Row */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Effective:</span>
            {isEditing && canEditEffectiveDate ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs font-medium gap-1.5">
                    <Calendar className="h-3 w-3" />
                    {editEffectiveDate || policyData.effectiveDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={editEffectiveDate ? new Date(editEffectiveDate) : policyData.effectiveDate ? new Date(policyData.effectiveDate) : undefined}
                    onSelect={(date) => { if (date) setEditEffectiveDate(formatDateStr(date)); }}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <span className="font-medium">{policyData.effectiveDate}</span>
            )}
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Termination:</span>
            {isEditing && canEditTerminationDate ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs font-medium gap-1.5">
                    <Calendar className="h-3 w-3" />
                    {editTerminationDate || "None"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={editTerminationDate ? new Date(editTerminationDate) : undefined}
                    onSelect={(date) => { if (date) setEditTerminationDate(formatDateStr(date)); }}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <span className="font-medium">{policyData.terminationDate || "—"}</span>
            )}
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Last Review:</span>
            <span className="font-medium">{lastReviewDate || "—"}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Initial:</span>
            {isEditing && canEditFullPolicy ? (
              <div className="flex items-center gap-1.5">
                {editInitialUnit !== "Indefinite" && (
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={editInitialDuration}
                    onChange={(e) => { setEditInitialDuration(parseInt(e.target.value, 10) || 0); setHasUnsavedChanges(true); }}
                    className="h-7 w-16 text-sm font-medium"
                  />
                )}
                <Select value={editInitialUnit} onValueChange={(v) => { setEditInitialUnit(v); setHasUnsavedChanges(true); }}>
                  <SelectTrigger className="h-7 w-28 text-sm font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Days">Days</SelectItem>
                    <SelectItem value="Months">Months</SelectItem>
                    <SelectItem value="Years">Years</SelectItem>
                    <SelectItem value="Indefinite">Indefinite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <span className="font-medium">{editInitialUnit === "Indefinite" ? "Indefinite" : `${editInitialDuration} ${editInitialUnit.toLowerCase()}`}</span>
            )}
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Reauthorization:</span>
            {isEditing && canEditFullPolicy ? (
              <div className="flex items-center gap-1.5">
                {editReauthUnit !== "Indefinite" && (
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={editReauthDuration}
                    onChange={(e) => { setEditReauthDuration(parseInt(e.target.value, 10) || 0); setHasUnsavedChanges(true); }}
                    className="h-7 w-16 text-sm font-medium"
                  />
                )}
                <Select value={editReauthUnit} onValueChange={(v) => { setEditReauthUnit(v); setHasUnsavedChanges(true); }}>
                  <SelectTrigger className="h-7 w-28 text-sm font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Days">Days</SelectItem>
                    <SelectItem value="Months">Months</SelectItem>
                    <SelectItem value="Years">Years</SelectItem>
                    <SelectItem value="Indefinite">Indefinite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <span className="font-medium">{editReauthUnit === "Indefinite" ? "Indefinite" : `${editReauthDuration} ${editReauthUnit.toLowerCase()}`}</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="criteria" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 mb-6">
          <TabsTrigger 
            value="criteria" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
          >
            <FileText className="h-4 w-4 mr-2" />
            Policy Criteria
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="criteria" className="mt-0 space-y-6">
          {isEditing && canEditFullPolicy ? (
            /* Editable Policy Builder — seeded with same criteria shown in read-only view */
            <CriteriaSectionsEditor initialCriteria={getCriteriaForPolicy(policyName)} onChange={() => setHasUnsavedChanges(true)} />
          ) : (
            <>
              {/* Read-Only View with tier hierarchy and color coding */}
              <ReadOnlyCriteriaView policyName={policyName} />
            </>
          )}

          {/* Attachments */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Source Documents
              </h3>
              {!showAddDocModal && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowAddDocModal(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {policyData.attachments.map((att) => (
                <div
                  key={att.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm",
                    att.url && "cursor-pointer hover:bg-secondary/50 transition-colors"
                  )}
                >
                  {att.type === "pdf" ? (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Link className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>{att.name}</span>
                  {att.url && <ExternalLink className="h-3 w-3 text-accent" />}
                </div>
              ))}
              {customAttachments.map((doc) => (
                <div
                  key={doc.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm",
                    doc.url && "cursor-pointer hover:bg-secondary/50 transition-colors"
                  )}
                >
                  {doc.type === "pdf" ? (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Link className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>{doc.name}</span>
                  <Badge variant="outline" className="text-xs ml-1">{doc.documentType}</Badge>
                  {doc.url && <ExternalLink className="h-3 w-3 text-accent" />}
                  <button
                    onClick={() => setCustomAttachments(prev => prev.filter(d => d.id !== doc.id))}
                    className="text-muted-foreground hover:text-destructive ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Inline Add Form */}
            {showAddDocModal && (
              <InlineAddSourceDocument
                onAdd={(doc) => {
                  setCustomAttachments(prev => [...prev, doc]);
                  setShowAddDocModal(false);
                  toast({
                    title: "Document added",
                    description: `"${doc.name}" has been attached to this policy.`,
                  });
                }}
                onCancel={() => setShowAddDocModal(false)}
              />
            )}
          </div>

        </TabsContent>
        
      </Tabs>
      </div>


      {/* Cancel Warning Dialog */}
      <Dialog open={showCancelWarning} onOpenChange={setShowCancelWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Discard Changes?
            </DialogTitle>
            <DialogDescription>
              You have unsaved changes to <strong>{policyName}</strong>. Are you sure you want to cancel? All changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCancelWarning(false)}>
              Keep Editing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowCancelWarning(false);
                setIsEditing(false);
                setHasUnsavedChanges(false);
              }}
            >
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Off Modal for publishing */}
      <SignOffModal
        isOpen={showSignOff}
        onClose={() => setShowSignOff(false)}
        onConfirm={(signOffData) => {
          setShowSignOff(false);
          setIsEditing(false);
          onPublish?.();
          toast({
            title: "Policy Published",
            description: `Signed off by ${signOffData.name} on ${signOffData.timestamp}`,
          });
        }}
        policyName={policyName}
      />

      {/* Comment Sidebar */}
      {showComments && isCommentSidebarOpen && (
        <CommentSidebar
          comments={comments}
          activeCommentId={activeCommentId}
          setActiveCommentId={setActiveCommentId}
          filter={filter}
          setFilter={setFilter}
          pendingHighlight={pendingHighlight}
          onAddComment={addComment}
          onAddReply={addReply}
          onEditComment={editComment}
          onResolve={resolveComment}
          onReopen={reopenComment}
          onDelete={deleteComment}
          onCancelPending={cancelPendingComment}
          onCommentClick={handleCommentClick}
          onClose={() => setIsCommentSidebarOpen(false)}
        />
      )}

    </div>
  );
}
