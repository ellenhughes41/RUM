import { useState } from "react";
import { X, CheckCircle2, AlertTriangle, Sparkles, ArrowRight, Pencil, ChevronDown, ChevronRight, Check, Clock, FileText, Calendar, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface TestGuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditGuidelines?: () => void;
  onAddPolicy?: (policyName: string) => void;
  onPublishPolicy?: () => void;
  policyName?: string;
  policyCategories?: string[];
  isPublishFlow?: boolean;
}

type TestResult = "good" | "poor" | null;

interface FieldResult {
  id: string;
  name: string;
  matched: number;
  total: number;
  accuracy: number;
}

interface SectionResult {
  id: string;
  name: string;
  icon: string;
  badge?: string;
  fields: FieldResult[];
  overallAccuracy: number;
}

// Weight loss management policy structure (matches uploaded clinical policy template)
const weightLossPolicyStructure: SectionResult[] = [
  {
    id: "initial-approval-weight-loss",
    name: "Initial Approval Criteria - Weight Loss",
    icon: "check",
    badge: "Weight Loss",
    fields: [
      { id: "age-wl", name: "Patient Eligibility (Age)", matched: 0, total: 500, accuracy: 0 },
      { id: "diagnosis-wl", name: "Diagnosis / Indication", matched: 0, total: 500, accuracy: 0 },
      { id: "bmi-wl", name: "BMI Requirements", matched: 0, total: 500, accuracy: 0 },
      { id: "comorbidities-wl", name: "Weight-Related Comorbidities", matched: 0, total: 500, accuracy: 0 },
      { id: "lifestyle-wl", name: "Lifestyle Modifications", matched: 0, total: 500, accuracy: 0 },
      { id: "step-therapy-wl", name: "Prerequisites (Step Therapy)", matched: 0, total: 500, accuracy: 0 },
      { id: "exclusions-wl", name: "Exclusions", matched: 0, total: 500, accuracy: 0 },
      { id: "prescriber-wl", name: "Prescriber Requirements", matched: 0, total: 500, accuracy: 0 },
    ],
    overallAccuracy: 0,
  },
  {
    id: "initial-approval-mash",
    name: "Initial Approval Criteria - MASH",
    icon: "check",
    badge: "MASH",
    fields: [
      { id: "age-mash", name: "Patient Eligibility (Age)", matched: 0, total: 500, accuracy: 0 },
      { id: "diagnosis-mash", name: "Diagnosis / Indication", matched: 0, total: 500, accuracy: 0 },
      { id: "fibrosis-mash", name: "Fibrosis Stage", matched: 0, total: 500, accuracy: 0 },
      { id: "liver-biopsy-mash", name: "Liver Biopsy / Imaging", matched: 0, total: 500, accuracy: 0 },
      { id: "step-therapy-mash", name: "Prerequisites (Step Therapy)", matched: 0, total: 500, accuracy: 0 },
      { id: "exclusions-mash", name: "Exclusions", matched: 0, total: 500, accuracy: 0 },
      { id: "prescriber-mash", name: "Prescriber Requirements", matched: 0, total: 500, accuracy: 0 },
    ],
    overallAccuracy: 0,
  },
  {
    id: "initial-approval-osa",
    name: "Initial Approval Criteria - OSA",
    icon: "check",
    badge: "OSA",
    fields: [
      { id: "age-osa", name: "Patient Eligibility (Age)", matched: 0, total: 500, accuracy: 0 },
      { id: "diagnosis-osa", name: "Diagnosis / Indication", matched: 0, total: 500, accuracy: 0 },
      { id: "ahi-osa", name: "AHI Score Requirements", matched: 0, total: 500, accuracy: 0 },
      { id: "bmi-osa", name: "BMI Requirements", matched: 0, total: 500, accuracy: 0 },
      { id: "cpap-osa", name: "CPAP Therapy Status", matched: 0, total: 500, accuracy: 0 },
      { id: "step-therapy-osa", name: "Prerequisites (Step Therapy)", matched: 0, total: 500, accuracy: 0 },
      { id: "exclusions-osa", name: "Exclusions", matched: 0, total: 500, accuracy: 0 },
      { id: "prescriber-osa", name: "Prescriber Requirements", matched: 0, total: 500, accuracy: 0 },
    ],
    overallAccuracy: 0,
  },
  {
    id: "reauthorization",
    name: "Reauthorization Criteria",
    icon: "clock",
    badge: "Renewal",
    fields: [
      { id: "efficacy", name: "Evidence of Efficacy", matched: 0, total: 500, accuracy: 0 },
      { id: "weight-loss", name: "Weight Loss Progress", matched: 0, total: 500, accuracy: 0 },
      { id: "stability", name: "Patient Stability", matched: 0, total: 500, accuracy: 0 },
      { id: "continued-need", name: "Continued Medical Necessity", matched: 0, total: 500, accuracy: 0 },
    ],
    overallAccuracy: 0,
  },
  {
    id: "limitations",
    name: "Limitations & Authorization Length",
    icon: "calendar",
    badge: "Limits",
    fields: [
      { id: "initial-duration", name: "Initial Authorization Duration", matched: 0, total: 500, accuracy: 0 },
      { id: "renewal-duration", name: "Renewal Authorization Duration", matched: 0, total: 500, accuracy: 0 },
      { id: "quantity-limits", name: "Quantity Limits", matched: 0, total: 500, accuracy: 0 },
    ],
    overallAccuracy: 0,
  },
];

// Check if policy is weight loss related
const isWeightLossPolicy = (policyName?: string): boolean => {
  if (!policyName) return false;
  const lower = policyName.toLowerCase();
  return lower.includes("ozempic") || 
         lower.includes("wegovy") || 
         lower.includes("zepbound") || 
         lower.includes("mounjaro") ||
         lower.includes("semaglutide") ||
         lower.includes("tirzepatide") ||
         lower.includes("weight");
};

// Generate results based on policy type and scenario
const generateResults = (categories: string[], isGood: boolean, policyName?: string): SectionResult[] => {
  // Use weight loss structure for weight loss policies
  if (isWeightLossPolicy(policyName)) {
    return weightLossPolicyStructure.map(section => {
      const fields = section.fields.map(field => {
        let accuracy: number;
        if (isGood) {
          accuracy = 95 + Math.random() * 5;
        } else {
          accuracy = 70 + Math.random() * 25;
        }
        const matched = Math.round((accuracy / 100) * field.total);
        return {
          ...field,
          accuracy: Math.round(accuracy * 10) / 10,
          matched,
        };
      });

      const totalMatched = fields.reduce((sum, f) => sum + f.matched, 0);
      const totalCases = fields.reduce((sum, f) => sum + f.total, 0);

      return {
        ...section,
        fields,
        overallAccuracy: Math.round((totalMatched / totalCases) * 1000) / 10,
      };
    });
  }

  // Original logic for other policies
  const initialApprovalFields: FieldResult[] = [];
  const reauthorizationFields: FieldResult[] = [];

  categories.forEach((category, index) => {
    const result: FieldResult = {
      id: `field-${index}`,
      name: category,
      matched: 0,
      total: 500,
      accuracy: 0,
    };

    if (isGood) {
      result.accuracy = 95 + Math.random() * 5;
    } else {
      result.accuracy = 70 + Math.random() * 25;
    }
    result.matched = Math.round((result.accuracy / 100) * result.total);
    result.accuracy = Math.round(result.accuracy * 10) / 10;

    if (category.toLowerCase().includes("efficacy") || 
        category.toLowerCase().includes("stability") || 
        category.toLowerCase().includes("renewal") ||
        category.toLowerCase().includes("continued")) {
      reauthorizationFields.push(result);
    } else {
      initialApprovalFields.push(result);
    }
  });

  const sections: SectionResult[] = [];

  if (initialApprovalFields.length > 0) {
    const totalMatched = initialApprovalFields.reduce((sum, f) => sum + f.matched, 0);
    const totalCases = initialApprovalFields.reduce((sum, f) => sum + f.total, 0);
    sections.push({
      id: "initial-approval",
      name: "Initial Approval Criteria",
      icon: "check",
      badge: "The Checklist",
      fields: initialApprovalFields,
      overallAccuracy: Math.round((totalMatched / totalCases) * 1000) / 10,
    });
  }

  if (reauthorizationFields.length > 0) {
    const totalMatched = reauthorizationFields.reduce((sum, f) => sum + f.matched, 0);
    const totalCases = reauthorizationFields.reduce((sum, f) => sum + f.total, 0);
    sections.push({
      id: "reauthorization",
      name: "Reauthorization Criteria",
      icon: "clock",
      badge: "Renewal",
      fields: reauthorizationFields,
      overallAccuracy: Math.round((totalMatched / totalCases) * 1000) / 10,
    });
  }

  return sections;
};

// Default categories if none provided
const defaultCategories = [
  "Patient Eligibility (Age)",
  "Diagnosis / Indication",
  "Clinical Metrics",
  "Lifestyle Modifications",
  "Prerequisites (Step Therapy)",
  "Exclusions",
  "Evidence of Efficacy",
  "Patient Stability",
];

const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case "check": return Check;
    case "clock": return Clock;
    case "calendar": return Calendar;
    case "file": return FileText;
    default: return FileText;
  }
};

export function TestGuidelinesModal({ isOpen, onClose, onEditGuidelines, onAddPolicy, onPublishPolicy, policyName, policyCategories, isPublishFlow }: TestGuidelinesModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>(null);
  const [showGood, setShowGood] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const categories = policyCategories && policyCategories.length > 0 ? policyCategories : defaultCategories;

  const [goodResults, setGoodResults] = useState<SectionResult[]>(() => generateResults(categories, true, policyName));
  const [poorResults, setPoorResults] = useState<SectionResult[]>(() => generateResults(categories, false, policyName));

  const runTest = () => {
    setIsRunning(true);
    setTestResult(null);
    setGoodResults(generateResults(categories, true, policyName));
    setPoorResults(generateResults(categories, false, policyName));
    setTimeout(() => {
      setIsRunning(false);
      setTestResult(showGood ? "good" : "poor");
      // Expand all sections when results load
      const expanded: Record<string, boolean> = {};
      (showGood ? goodResults : poorResults).forEach(s => { expanded[s.id] = true; });
      setExpandedSections(expanded);
    }, 2500);
  };

  const toggleScenario = () => {
    setShowGood(!showGood);
    setTestResult(null);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const results = showGood ? goodResults : poorResults;
  const allFields = results.flatMap(s => s.fields);
  const totalMatched = allFields.reduce((sum, f) => sum + f.matched, 0);
  const totalCases = allFields.reduce((sum, f) => sum + f.total, 0);
  const overallAccuracy = ((totalMatched / totalCases) * 100).toFixed(1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm overflow-y-auto p-4">
      <div className="w-full max-w-3xl animate-slide-up rounded-xl bg-card shadow-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg ai-gradient">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">
                Test AI Guidelines{policyName ? ` — ${policyName}` : ""}
              </h2>
              <p className="text-sm text-muted-foreground">Evaluate against historical cases</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Scenario Toggle */}
          <div className="mb-6 flex items-center justify-between rounded-lg bg-secondary/50 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Test Scenario</p>
              <p className="text-xs text-muted-foreground">
                {showGood ? "Well-configured guidelines" : "Poorly-configured guidelines"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={toggleScenario}>
              Switch to {showGood ? "Poor" : "Good"} Example
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Test Button */}
          {!testResult && !isRunning && (
            <div className="flex flex-col items-center py-8">
              <p className="mb-4 text-center text-sm text-muted-foreground">
                Run the AI guidelines against 500 human-labeled cases
              </p>
              <Button variant="ai" size="lg" onClick={runTest}>
                <Sparkles className="h-4 w-4" />
                Run Evaluation
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isRunning && (
            <div className="flex flex-col items-center py-12">
              <div className="relative mb-4">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-accent/20 border-t-accent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-accent" />
                </div>
              </div>
              <p className="font-medium text-foreground">Evaluating AI decisions...</p>
              <p className="text-sm text-muted-foreground">Testing against 500 labeled cases</p>
            </div>
          )}

          {/* Results */}
          {testResult && (
            <div className="space-y-4 animate-fade-in">
              {/* Overall Score Card */}
              <div
                className={cn(
                  "flex items-center gap-4 rounded-xl border p-4",
                  testResult === "good"
                    ? "bg-success/10 border-success/20"
                    : "bg-destructive/10 border-destructive/20"
                )}
              >
                {testResult === "good" ? (
                  <CheckCircle2 className="h-12 w-12 text-success" />
                ) : (
                  <AlertTriangle className="h-12 w-12 text-destructive" />
                )}
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">
                      {totalMatched}/{totalCases}
                    </span>
                    <span className="text-lg text-muted-foreground">cases matched</span>
                  </div>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      testResult === "good" ? "text-success" : "text-destructive"
                    )}
                  >
                    {overallAccuracy}% overall accuracy
                    {testResult === "good"
                      ? " — Excellent! Ready for production."
                      : " — Guidelines need refinement."}
                  </p>
                </div>
              </div>

              {/* Section-based Breakdown - matches PolicyViewer structure */}
              <div className="space-y-3">
                {results.map((section) => {
                  const Icon = getIconComponent(section.icon);
                  const isOpen = expandedSections[section.id] ?? true;

                  return (
                    <div key={section.id} className="rounded-lg border border-border bg-card">
                      <Collapsible open={isOpen} onOpenChange={() => toggleSection(section.id)}>
                        <CollapsibleTrigger asChild>
                          <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors">
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-foreground flex-1">
                              {section.name}
                            </span>
                            {section.badge && (
                              <Badge variant="secondary" className="text-xs">{section.badge}</Badge>
                            )}
                            <span
                              className={cn(
                                "text-sm font-medium",
                                section.overallAccuracy >= 95
                                  ? "text-success"
                                  : section.overallAccuracy >= 80
                                  ? "text-warning"
                                  : "text-destructive"
                              )}
                            >
                              {section.overallAccuracy}%
                            </span>
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t border-border p-4">
                            <div className="grid gap-3 md:grid-cols-2">
                              {section.fields.map((field) => (
                                <div
                                  key={field.id}
                                  className="rounded-lg bg-secondary/30 p-3 space-y-2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-sm font-medium text-foreground">
                                      {field.name}
                                    </h4>
                                    <span className="text-xs text-muted-foreground">
                                      {field.matched}/{field.total}
                                    </span>
                                  </div>
                                  {/* Progress bar */}
                                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all",
                                        field.accuracy >= 95
                                          ? "bg-success"
                                          : field.accuracy >= 80
                                          ? "bg-warning"
                                          : "bg-destructive"
                                      )}
                                      style={{ width: `${field.accuracy}%` }}
                                    />
                                  </div>
                                  {/* Accuracy badge */}
                                  <div className="flex items-center gap-2">
                                    <Check
                                      className={cn(
                                        "h-3.5 w-3.5",
                                        field.accuracy >= 95
                                          ? "text-success"
                                          : field.accuracy >= 80
                                          ? "text-warning"
                                          : "text-destructive"
                                      )}
                                    />
                                    <span
                                      className={cn(
                                        "text-xs font-medium",
                                        field.accuracy >= 95
                                          ? "text-success"
                                          : field.accuracy >= 80
                                          ? "text-warning"
                                          : "text-destructive"
                                      )}
                                    >
                                      {field.accuracy}% accuracy
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                {onEditGuidelines && (
                  <Button variant="outline" onClick={onEditGuidelines}>
                    {testResult === "poor" ? (
                      <>
                        <Settings className="h-4 w-4" />
                        Edit Guidelines
                      </>
                    ) : (
                      <>
                        <Pencil className="h-4 w-4" />
                        Edit Policy
                      </>
                    )}
                  </Button>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        {isPublishFlow && onPublishPolicy ? (
                          <Button 
                            variant="default" 
                            onClick={onPublishPolicy}
                            disabled={testResult === "poor"}
                          >
                            Publish Policy
                          </Button>
                        ) : (
                          <Button 
                            variant="default" 
                            onClick={() => {
                              if (onAddPolicy && policyName) {
                                onAddPolicy(policyName);
                              }
                              onClose();
                            }}
                            disabled={testResult === "poor"}
                          >
                            Add Policy
                          </Button>
                        )}
                      </span>
                    </TooltipTrigger>
                    {testResult === "poor" && (
                      <TooltipContent>
                        <p>Policy does not meet guideline requirements</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
