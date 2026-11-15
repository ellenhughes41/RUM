import { useState, useEffect } from "react";
import { Upload, FileText, Loader2, Sparkles, Check, X, Plus, AlertTriangle, ChevronDown, ChevronRight, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { SignOffModal } from "./SignOffModal";

interface CriterionItem {
  id: string;
  value: string;
  isNew?: boolean;
  isModified?: boolean;
}

interface PolicyField {
  id: string;
  name: string;
  items: CriterionItem[];
  isNew?: boolean;
}

interface PolicySection {
  id: string;
  name: string;
  badge?: string;
  fields: PolicyField[];
  isNew?: boolean;
}

interface DetectedChange {
  type: "new_section" | "new_field" | "new_criterion" | "modified_criterion";
  sectionId?: string;
  sectionName?: string;
  fieldId?: string;
  fieldName?: string;
  criterionId?: string;
  value: string;
  originalValue?: string;
  selected: boolean;
}

interface UpdateVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (versionData: VersionUpdateData) => void;
  policyName: string;
  currentVersion: string;
}

export interface VersionUpdateData {
  newVersion: string;
  changeSummary: string;
  addedSections: PolicySection[];
  modifiedCriteria: { sectionId: string; fieldId: string; criterionId: string; newValue: string }[];
}

// Mock detected changes from AI extraction
const getMockDetectedChanges = (policyName: string): DetectedChange[] => {
  if (policyName.toLowerCase().includes("weight") || policyName.toLowerCase().includes("drug")) {
    return [
      {
        type: "new_section",
        sectionId: "new-indication-t2d",
        sectionName: "Initial Approval Criteria - Type 2 Diabetes (Ozempic only)",
        value: "New indication for Ozempic in Type 2 Diabetes management",
        selected: true,
      },
      {
        type: "new_field",
        sectionId: "initial-approval-weight-loss",
        sectionName: "Initial Approval Criteria - Weight Loss",
        fieldId: "new-adolescent-criteria",
        fieldName: "Adolescent Eligibility (12-17 years)",
        value: "For patients 12-17 years: BMI ≥ 95th percentile for age and sex",
        selected: true,
      },
      {
        type: "new_criterion",
        sectionId: "initial-approval-weight-loss",
        sectionName: "Initial Approval Criteria - Weight Loss",
        fieldId: "bmi-criteria",
        fieldName: "BMI Requirements",
        criterionId: "new-bmi-1",
        value: "BMI ≥ 25 kg/m² with documented obesity-related cardiovascular risk factors",
        selected: true,
      },
      {
        type: "modified_criterion",
        sectionId: "reauthorization-weight-loss",
        sectionName: "Reauthorization Criteria - Weight Loss",
        fieldId: "weight-reauth-2",
        fieldName: "Weight Loss Progress",
        criterionId: "mod-1",
        value: "Total weight loss of ≥4% or maintenance of original weight loss ≥4% from baseline",
        originalValue: "Total weight loss of ≥5% or maintenance of original weight loss ≥5% from baseline",
        selected: true,
      },
    ];
  }
  
  return [
    {
      type: "new_criterion",
      sectionId: "initial-approval",
      sectionName: "Initial Approval Criteria",
      fieldId: "diagnosis",
      fieldName: "Diagnosis / Indication",
      criterionId: "new-diag-1",
      value: "Additional indication criteria detected from new policy document",
      selected: true,
    },
  ];
};

export function UpdateVersionModal({ 
  isOpen, 
  onClose, 
  onSave, 
  policyName, 
  currentVersion 
}: UpdateVersionModalProps) {
  const [step, setStep] = useState<"upload" | "review" | "summary">("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<DetectedChange[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [changeSummary, setChangeSummary] = useState("");
  const [showSignOffModal, setShowSignOffModal] = useState(false);
  const [manualCriterion, setManualCriterion] = useState("");
  const [showManualAdd, setShowManualAdd] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("upload");
      setIsProcessing(false);
      setUploadedFile(null);
      setDetectedChanges([]);
      setExpandedSections(new Set());
      setChangeSummary("");
      setManualCriterion("");
      setShowManualAdd(false);
    }
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file.name);
    }
  };

  const processFile = (fileName: string) => {
    setUploadedFile(fileName);
    setIsProcessing(true);
    
    // Simulate AI processing
    setTimeout(() => {
      setIsProcessing(false);
      const changes = getMockDetectedChanges(policyName);
      setDetectedChanges(changes);
      
      // Expand all sections by default
      const sections = new Set(changes.map(c => c.sectionName || ""));
      setExpandedSections(sections);
      
      setStep("review");
    }, 3000);
  };

  const toggleChange = (index: number) => {
    setDetectedChanges(prev => 
      prev.map((change, i) => 
        i === index ? { ...change, selected: !change.selected } : change
      )
    );
  };

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionName)) {
        next.delete(sectionName);
      } else {
        next.add(sectionName);
      }
      return next;
    });
  };

  const handleAddManualCriterion = () => {
    if (manualCriterion.trim()) {
      const newChange: DetectedChange = {
        type: "new_criterion",
        sectionId: "manual",
        sectionName: "Manual Additions",
        fieldId: "manual-field",
        fieldName: "Additional Criteria",
        criterionId: `manual-${Date.now()}`,
        value: manualCriterion.trim(),
        selected: true,
      };
      setDetectedChanges(prev => [...prev, newChange]);
      setManualCriterion("");
      setShowManualAdd(false);
      
      // Expand the manual section
      setExpandedSections(prev => new Set([...prev, "Manual Additions"]));
    }
  };

  const selectedCount = detectedChanges.filter(c => c.selected).length;

  const handleProceedToSummary = () => {
    setStep("summary");
  };

  const getNextVersion = () => {
    const parts = currentVersion.split(".");
    const minor = parseInt(parts[1] || "0") + 1;
    return `${parts[0]}.${minor}`;
  };

  const handleSaveClick = () => {
    setShowSignOffModal(true);
  };

  const handleSignOffConfirm = (signOffData: { name: string; timestamp: string }) => {
    setShowSignOffModal(false);
    
    const selectedChanges = detectedChanges.filter(c => c.selected);
    
    onSave({
      newVersion: getNextVersion(),
      changeSummary: changeSummary || `Updated policy with ${selectedChanges.length} changes`,
      addedSections: [],
      modifiedCriteria: [],
    });
    
    toast({
      title: "Policy Version Updated",
      description: `Version ${getNextVersion()} saved. Signed off by ${signOffData.name}.`,
    });
    
    onClose();
  };

  // Group changes by section
  const changesBySection = detectedChanges.reduce((acc, change) => {
    const section = change.sectionName || "Other";
    if (!acc[section]) acc[section] = [];
    acc[section].push(change);
    return acc;
  }, {} as Record<string, DetectedChange[]>);

  const getChangeTypeLabel = (type: DetectedChange["type"]) => {
    switch (type) {
      case "new_section": return "New Section";
      case "new_field": return "New Field";
      case "new_criterion": return "New Criterion";
      case "modified_criterion": return "Modified";
    }
  };

  const getChangeTypeColor = (type: DetectedChange["type"]) => {
    switch (type) {
      case "new_section": 
      case "new_field": 
      case "new_criterion": 
        return "border-success/50 text-success bg-success/10";
      case "modified_criterion": 
        return "border-amber-500/50 text-amber-700 bg-amber-500/10";
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-accent" />
              Update Policy Version
            </DialogTitle>
            <DialogDescription>
              Upload a new version of the policy document. AI will detect changes and preserve existing criteria.
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 py-2 border-b border-border">
            <div className={cn(
              "flex items-center gap-1.5 text-sm",
              step === "upload" ? "text-accent font-medium" : "text-muted-foreground"
            )}>
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                step === "upload" ? "bg-accent text-accent-foreground" : "bg-muted"
              )}>1</div>
              Upload
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className={cn(
              "flex items-center gap-1.5 text-sm",
              step === "review" ? "text-accent font-medium" : "text-muted-foreground"
            )}>
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                step === "review" ? "bg-accent text-accent-foreground" : "bg-muted"
              )}>2</div>
              Review Changes
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className={cn(
              "flex items-center gap-1.5 text-sm",
              step === "summary" ? "text-accent font-medium" : "text-muted-foreground"
            )}>
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                step === "summary" ? "bg-accent text-accent-foreground" : "bg-muted"
              )}>3</div>
              Summary
            </div>
          </div>

          <ScrollArea className="flex-1 pr-4">
            {/* Upload Step */}
            {step === "upload" && (
              <div className="py-6 space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">{policyName}</p>
                      <p className="text-sm text-muted-foreground">Current version: {currentVersion}</p>
                    </div>
                  </div>
                </div>

                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="relative">
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-accent/10">
                        <FileText className="h-8 w-8 text-accent" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full ai-gradient animate-pulse-glow">
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-foreground">{uploadedFile}</p>
                      <p className="text-sm text-accent">AI is comparing with existing criteria...</p>
                    </div>
                    <div className="h-1.5 w-48 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full w-2/3 animate-pulse rounded-full ai-gradient" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-accent/50 p-8 cursor-pointer transition-colors">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="mb-1 text-sm font-medium text-foreground">
                        Drop your updated PDF here, or <span className="text-accent">browse</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Upload the new version of the policy document</p>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Existing criteria will be preserved. AI will detect new indications, modified requirements, 
                        and additional criteria from the uploaded document.
                      </AlertDescription>
                    </Alert>

                    {/* Demo button */}
                    <button
                      onClick={() => processFile("Weight_Management_Policy_v2.pdf")}
                      className="w-full text-xs text-muted-foreground hover:text-accent transition-colors underline underline-offset-2"
                    >
                      Preview example version update →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Review Step */}
            {step === "review" && (
              <div className="py-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Detected Changes</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedCount} of {detectedChanges.length} changes selected
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI Extracted
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  {Object.entries(changesBySection).map(([sectionName, changes]) => (
                    <Collapsible 
                      key={sectionName}
                      open={expandedSections.has(sectionName)}
                      onOpenChange={() => toggleSection(sectionName)}
                    >
                      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2">
                          {expandedSections.has(sectionName) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium text-foreground">{sectionName}</span>
                          <Badge variant="secondary" className="text-xs">
                            {changes.length} {changes.length === 1 ? "change" : "changes"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {changes.some(c => c.type === "new_section" || c.type === "new_field" || c.type === "new_criterion") && (
                            <Badge className="border-success/50 text-success bg-success/10 text-xs">New</Badge>
                          )}
                          {changes.some(c => c.type === "modified_criterion") && (
                            <Badge className="border-amber-500/50 text-amber-700 bg-amber-500/10 text-xs">Modified</Badge>
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-2 pl-6">
                        {changes.map((change, idx) => {
                          const globalIdx = detectedChanges.indexOf(change);
                          return (
                            <div 
                              key={idx}
                              className={cn(
                                "rounded-lg border p-3 transition-colors",
                                change.selected 
                                  ? "border-accent/50 bg-accent/5" 
                                  : "border-border bg-card opacity-60"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={change.selected}
                                  onCheckedChange={() => toggleChange(globalIdx)}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className={cn("text-xs", getChangeTypeColor(change.type))}>
                                      {getChangeTypeLabel(change.type)}
                                    </Badge>
                                    {change.fieldName && (
                                      <span className="text-xs text-muted-foreground">{change.fieldName}</span>
                                    )}
                                  </div>
                                  {change.type === "modified_criterion" && change.originalValue && (
                                    <div className="mb-2 text-sm">
                                      <p className="text-muted-foreground line-through">{change.originalValue}</p>
                                    </div>
                                  )}
                                  <p className="text-sm text-foreground">{change.value}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>

                {/* Manual Addition */}
                <div className="pt-2 border-t border-border">
                  {showManualAdd ? (
                    <div className="space-y-2">
                      <Label>Add criterion manually</Label>
                      <Textarea
                        value={manualCriterion}
                        onChange={(e) => setManualCriterion(e.target.value)}
                        placeholder="Enter additional criterion text..."
                        className="min-h-[80px]"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setShowManualAdd(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleAddManualCriterion} disabled={!manualCriterion.trim()}>
                          Add Criterion
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setShowManualAdd(true)} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Add Criterion Manually
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Summary Step */}
            {step === "summary" && (
              <div className="py-4 space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-foreground">{policyName}</p>
                      <p className="text-sm text-muted-foreground">
                        Version {currentVersion} → <span className="text-accent font-medium">{getNextVersion()}</span>
                      </p>
                    </div>
                    <Badge variant="secondary">{selectedCount} changes</Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="summary">Version Summary</Label>
                  <Textarea
                    id="summary"
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    placeholder="Describe the key changes in this version..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Selected Changes</Label>
                  <div className="rounded-lg border border-border bg-card p-3 space-y-2 max-h-[200px] overflow-y-auto">
                    {detectedChanges.filter(c => c.selected).map((change, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{change.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              {step === "review" && (
                <>
                  <Button variant="outline" onClick={() => setStep("upload")}>
                    Back
                  </Button>
                  <Button onClick={handleProceedToSummary} disabled={selectedCount === 0}>
                    Continue ({selectedCount} selected)
                  </Button>
                </>
              )}
              {step === "summary" && (
                <>
                  <Button variant="outline" onClick={() => setStep("review")}>
                    Back
                  </Button>
                  <Button onClick={handleSaveClick}>
                    Save Version {getNextVersion()}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SignOffModal
        isOpen={showSignOffModal}
        onClose={() => setShowSignOffModal(false)}
        onConfirm={handleSignOffConfirm}
        policyName={`${policyName} (Version ${getNextVersion()})`}
      />
    </>
  );
}
