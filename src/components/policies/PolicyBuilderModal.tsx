import { useState, useEffect } from "react";
import { Check, Search, X, Pill, FileText, Sparkles, Trash2, Plus, Pencil, ChevronDown, ChevronRight, Calendar, Clock, Settings, Paperclip, Eye, History, Upload, Link, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { SignOffModal } from "./SignOffModal";

interface PolicyBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PolicyBuilderData) => void;
  onTestGuidelines?: (policyName?: string) => void;
  fileName: string;
  initialTab?: "edit" | "preview";
  existingPolicyNames?: string[];
}

interface CriterionItem {
  id: string;
  value: string;
}

interface CustomField {
  id: string;
  name: string;
  items: CriterionItem[];
}

interface CustomSection {
  id: string;
  name: string;
  icon: string;
  badge?: string;
  fields: CustomField[];
  isOpen: boolean;
}

interface Attachment {
  id: string;
  name: string;
  type: "pdf" | "link";
  url?: string;
  uploadedAt: string;
}

interface VersionEntry {
  id: string;
  version: string;
  changedBy: string;
  changedAt: string;
  summary: string;
}

export interface PolicyBuilderData {
  name: string;
  effectiveDate: string;
  companies: string[];
  medications: string[];
  sections: CustomSection[];
  initialApprovalDuration: string;
  reauthorizationDuration: string;
  attachments: Attachment[];
}


const mockMedications = [
  { id: "dupixent", name: "Dupixent (dupilumab)" },
  { id: "humira", name: "Humira (adalimumab)" },
  { id: "ozempic", name: "Ozempic (semaglutide)" },
  { id: "wegovy", name: "Wegovy (semaglutide)" },
  { id: "zepbound", name: "Zepbound (tirzepatide)" },
  { id: "phentermine", name: "Phentermine" },
  { id: "phendimetrazine", name: "Phendimetrazine" },
  { id: "diethylpropion", name: "Diethylpropion" },
  { id: "evenity", name: "Evenity (romosozumab)" },
  { id: "keytruda", name: "Keytruda (pembrolizumab)" },
  { id: "stelara", name: "Stelara (ustekinumab)" },
  { id: "enbrel", name: "Enbrel (etanercept)" },
  { id: "skyrizi", name: "Skyrizi (risankizumab)" },
];


const durationOptions = [
  "3 months",
  "6 months",
  "7 months",
  "12 months",
  "1 year",
  "2 years",
];

const getDefaultSections = (withData: boolean): CustomSection[] => [
  {
    id: "description",
    name: "Criteria Coverage",
    icon: "filetext",
    badge: "Overview",
    isOpen: !withData,
    fields: [
      {
        id: "description-overview",
        name: "Overview",
        items: withData ? [{ id: "desc1", value: "The drugs used for weight loss, including but not limited to Wegovy® (semaglutide), Zepbound® (Tirzepatide), phentermine, phendimetrazine, and diethylpropion, are subject to the prior authorization process." }] : [],
      },
    ],
  },
  {
    id: "initial-approval-weight-loss",
    name: "Initial Approval Criteria - Weight Loss",
    icon: "check",
    badge: "Weight Loss",
    isOpen: !withData,
    fields: [
      {
        id: "age-weight-loss",
        name: "Patient Eligibility (Age)",
        items: withData ? [
          { id: "wl1", value: "Must be 12 years of age or older" },
          { id: "wl2", value: "Must be 18 years of age or older (Zepbound, phentermine, phendimetrazine, and diethylpropion only)" },
        ] : [],
      },
      {
        id: "lifestyle-weight-loss",
        name: "Lifestyle Modifications",
        items: withData ? [{ id: "wl3", value: "Will be used in combination with a reduced-calorie diet and increased physical activity" }] : [],
      },
      {
        id: "clinical-metrics-weight-loss",
        name: "Clinical Metrics",
        items: withData ? [{ id: "wl4", value: "Recent weight/BMI must be provided to establish baseline weight" }] : [],
      },
      {
        id: "bmi-criteria",
        name: "BMI Criteria",
        items: withData ? [
          { id: "wl5", value: "Must have a BMI of ≥ 30 kg/m² OR" },
          { id: "wl6", value: "Patient has a BMI of ≥ 27 kg/m² to < 30 kg/m² with chart note documentation of ONE or more weight-related comorbid conditions" },
        ] : [],
      },
      {
        id: "comorbidities",
        name: "Weight-Related Comorbid Conditions",
        items: withData ? [
          { id: "wl7", value: "Type 2 diabetes mellitus" },
          { id: "wl8", value: "Hypertension" },
          { id: "wl9", value: "Dyslipidemia" },
          { id: "wl10", value: "Symptomatic osteoarthritis of the lower extremities (knee or hip)" },
          { id: "wl11", value: "Cardiovascular disease" },
          { id: "wl12", value: "Coronary artery disease" },
          { id: "wl13", value: "Polycystic Ovarian Syndrome" },
          { id: "wl14", value: "Non-Alcoholic steatohepatitis/non-alcoholic fatty liver disease" },
          { id: "wl15", value: "Asthma" },
          { id: "wl16", value: "Chronic obstructive pulmonary disease (COPD)" },
        ] : [],
      },
      {
        id: "prescriber-exclusions",
        name: "Prescriber Exclusions",
        items: withData ? [
          { id: "wl17", value: "Prescriber of medication CANNOT be in: Otolaryngology, Ophthalmology, Dentistry, Anesthesiology, Radiology, Emergency Medicine, Pathology, or Nuclear Medicine" },
        ] : [],
      },
    ],
  },
  {
    id: "initial-approval-mash",
    name: "Initial Approval Criteria - MASH (Wegovy only)",
    icon: "check",
    badge: "MASH",
    isOpen: false,
    fields: [
      {
        id: "age-mash",
        name: "Patient Eligibility (Age)",
        items: withData ? [{ id: "mash1", value: "Must be 18 years of age or older" }] : [],
      },
      {
        id: "diagnosis-mash",
        name: "Diagnosis",
        items: withData ? [{ id: "mash2", value: "Member has a diagnosis of MASH (formerly known as NASH)" }] : [],
      },
      {
        id: "fibrosis-confirmation",
        name: "Liver Fibrosis Confirmation",
        items: withData ? [
          { id: "mash3", value: "Member has moderate to advanced liver fibrosis (Stage F2/F3), confirmed by ONE of the following:" },
          { id: "mash4", value: "A liver biopsy demonstrating a Non-Alcoholic Fatty Liver Disease (NAFLD) Fibrosis Score of ≥4 with a score of ≥1 for ALL components: Steatosis, Lobular inflammation, Hepatocellular ballooning" },
          { id: "mash5", value: "Non-invasive imaging examination such as FAST score, MAST score, MEFIB score, VCTE (Vibration-Controlled Elastography), or MRE (magnetic resonance elastography)" },
        ] : [],
      },
      {
        id: "alcohol-exclusion",
        name: "Alcohol Consumption Exclusion",
        items: withData ? [
          { id: "mash6", value: "Must not have any history of significant alcohol consumption (≥20 g of alcohol/day for females and ≥30 g of alcohol/day for males)" },
          { id: "mash7", value: "Note: In the United States, one 'standard' drink contains roughly 14 grams of pure alcohol" },
        ] : [],
      },
    ],
  },
  {
    id: "initial-approval-osa",
    name: "Initial Approval Criteria - Obstructive Sleep Apnea (Zepbound only)",
    icon: "check",
    badge: "OSA",
    isOpen: false,
    fields: [
      {
        id: "age-osa",
        name: "Patient Eligibility (Age)",
        items: withData ? [{ id: "osa1", value: "Must be 18 years of age or older" }] : [],
      },
      {
        id: "lifestyle-osa",
        name: "Lifestyle Modifications",
        items: withData ? [{ id: "osa2", value: "Will be used in combination with a reduced-calorie diet and increased physical activity" }] : [],
      },
      {
        id: "diagnosis-osa",
        name: "Diagnosis Confirmation",
        items: withData ? [{ id: "osa3", value: "Documentation of diagnosis of moderate to severe obstructive sleep apnea (OSA) confirmed via in-laboratory test (polysomnography) or Home Sleep Apnea Test (HSAT)" }] : [],
      },
      {
        id: "clinical-metrics-osa",
        name: "Clinical Metrics",
        items: withData ? [
          { id: "osa4", value: "Recent apnea/hypopnea index (in events per hour) to establish baseline provided" },
          { id: "osa5", value: "Recent weight/BMI must be provided to establish baseline weight" },
          { id: "osa6", value: "Must have a BMI of ≥ 30 kg/m²" },
        ] : [],
      },
    ],
  },
  {
    id: "reauthorization-weight-loss",
    name: "Reauthorization Criteria - Weight Loss",
    icon: "clock",
    badge: "Weight Loss",
    isOpen: !withData,
    fields: [
      {
        id: "weight-reauth-1",
        name: "Weight Documentation",
        items: withData ? [{ id: "reauth1", value: "Recent weight/BMI must be provided to determine weight loss from baseline" }] : [],
      },
      {
        id: "weight-reauth-2",
        name: "Weight Loss Progress",
        items: withData ? [{ id: "reauth2", value: "Total weight loss of ≥5% or maintenance of original weight loss ≥5% from baseline" }] : [],
      },
      {
        id: "weight-reauth-3",
        name: "Lifestyle Adherence",
        items: withData ? [{ id: "reauth3", value: "Maintenance of adherence to a reduced-calorie diet and increased physical activity" }] : [],
      },
    ],
  },
  {
    id: "reauthorization-osa",
    name: "Reauthorization Criteria - Obstructive Sleep Apnea (Zepbound only)",
    icon: "clock",
    badge: "OSA",
    isOpen: false,
    fields: [
      {
        id: "osa-reauth-1",
        name: "Lifestyle Adherence",
        items: withData ? [{ id: "reauth4", value: "Will be used in combination with a reduced-calorie diet and increased physical activity" }] : [],
      },
      {
        id: "osa-reauth-2",
        name: "AHI Documentation",
        items: withData ? [{ id: "reauth5", value: "Recent apnea/hypopnea index (in events per hour) after therapy with Zepbound provided" }] : [],
      },
      {
        id: "osa-reauth-3",
        name: "Provider Attestation",
        items: withData ? [{ id: "reauth6", value: "Provider attests that the member requires therapy with Zepbound to maintain a decrease in the apnea/hypopnea index" }] : [],
      },
    ],
  },
  {
    id: "reauthorization-mash",
    name: "Reauthorization Criteria - MASH (Wegovy only)",
    icon: "clock",
    badge: "MASH",
    isOpen: false,
    fields: [
      {
        id: "mash-reauth-1",
        name: "Clinical Improvement",
        items: withData ? [{ id: "reauth7", value: "Chart documentation from the prescriber that the member's condition has improved based upon the prescriber's assessment while on therapy (e.g., no worsening of fibrosis)" }] : [],
      },
      {
        id: "mash-reauth-2",
        name: "Alcohol Limitation",
        items: withData ? [{ id: "reauth8", value: "Limited alcohol consumption (e.g., ≤20 g of alcohol/day for females and ≤30 g of alcohol/day for males)" }] : [],
      },
    ],
  },
  {
    id: "limitations",
    name: "Limitations & Authorization Length",
    icon: "clock",
    badge: "Duration",
    isOpen: !withData,
    fields: [
      {
        id: "initial-auth-length",
        name: "Initial Authorization",
        items: withData ? [
          { id: "lim1", value: "For Zepbound and Wegovy: 7 months" },
          { id: "lim2", value: "For phentermine, phendimetrazine, and diethylpropion: indefinite" },
          { id: "lim3", value: "For MASH: 1 year" },
        ] : [],
      },
      {
        id: "reauth-length",
        name: "Reauthorization Length",
        items: withData ? [
          { id: "lim4", value: "For Zepbound and Wegovy: 7 months" },
          { id: "lim5", value: "For MASH: 1 year" },
        ] : [],
      },
    ],
  },
];

interface CriteriaListProps {
  title: string;
  items: CriterionItem[];
  onUpdate: (items: CriterionItem[]) => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  placeholder: string;
  canDelete?: boolean;
}

function CriteriaList({ title, items, onUpdate, onRename, onDelete, placeholder, canDelete = true }: CriteriaListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(title);

  const addItem = () => {
    const newItem: CriterionItem = { id: Date.now().toString(), value: "" };
    onUpdate([...items, newItem]);
    setEditingId(newItem.id);
  };

  const updateItem = (id: string, value: string) => {
    onUpdate(items.map((item) => (item.id === id ? { ...item, value } : item)));
  };

  const deleteItem = (id: string) => {
    onUpdate(items.filter((item) => item.id !== id));
  };

  const handleTitleSave = () => {
    if (titleValue.trim()) {
      onRename(titleValue.trim());
    } else {
      setTitleValue(title);
    }
    setIsEditingTitle(false);
  };

  return (
    <div className="space-y-2 p-3 rounded-lg bg-secondary/30 border border-border/50">
      <div className="flex items-center justify-between gap-2">
        {isEditingTitle ? (
          <Input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
            className="h-7 text-sm font-medium"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-accent transition-colors group"
          >
            <span>{title}</span>
            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 text-muted-foreground" />
          </button>
        )}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={addItem}
            className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "group flex items-start gap-2 rounded-md p-2 transition-colors",
              editingId === item.id ? "bg-background border border-border" : "bg-background/50 hover:bg-background"
            )}
          >
            {editingId === item.id ? (
              <div className="flex-1 space-y-2">
                <Textarea
                  value={item.value}
                  onChange={(e) => updateItem(item.id, e.target.value)}
                  placeholder={placeholder}
                  className="min-h-[50px] text-sm"
                  autoFocus
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                    className="h-6 text-xs"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                <div
                  className="flex-1 text-sm cursor-pointer text-muted-foreground"
                  onClick={() => setEditingId(item.id)}
                >
                  {item.value || <span className="italic">Click to edit...</span>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingId(item.id)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-2 px-2">
            No criteria defined. Click "Add" to create one.
          </p>
        )}
      </div>
    </div>
  );
}

export function PolicyBuilderModal({ isOpen, onClose, onSave, onTestGuidelines, fileName, initialTab = "edit", existingPolicyNames = [] }: PolicyBuilderModalProps) {
  const isFromScratch = !fileName;
  
  // Header & Policy Identification
  const [policyName, setPolicyName] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  
  // Medication Assignment
  const [selectedMedications, setSelectedMedications] = useState<string[]>([]);
  const [medicationSearch, setMedicationSearch] = useState("");
  
  // Custom Sections
  const [sections, setSections] = useState<CustomSection[]>([]);
  
  // Attachments
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkName, setNewLinkName] = useState("");
  
  
  // Approval Terms
  const [initialDuration, setInitialDuration] = useState("7 months");
  const [reauthorizationDuration, setReauthorizationDuration] = useState("1 year");
  
  // UI State
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [headerOpen, setHeaderOpen] = useState(true);
  const [approvalTermsOpen, setApprovalTermsOpen] = useState(true);
  const [attachmentsOpen, setAttachmentsOpen] = useState(true);
  const [showSignOffModal, setShowSignOffModal] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      const fromScratch = !fileName;
      setPolicyName(fromScratch ? "" : fileName.replace(".pdf", "").replace(/_/g, " "));
      setEffectiveDate(new Date().toISOString().split("T")[0]);
      setSelectedMedications(fromScratch ? [] : ["wegovy", "zepbound", "phentermine", "phendimetrazine", "diethylpropion"]);
      setMedicationSearch("");
      setSections(getDefaultSections(!fromScratch));
      setAttachments(fromScratch ? [] : [
        { id: "1", name: "FDA Label - Ozempic", type: "pdf", uploadedAt: "2024-12-01" },
        { id: "2", name: "Clinical Guidelines Reference", type: "link", url: "https://fda.gov", uploadedAt: "2024-12-01" },
      ]);
      setNewLinkUrl("");
      setNewLinkName("");
      setActiveTab(initialTab || "edit");
      setInitialDuration("7 months");
      setReauthorizationDuration("1 year");
      setHeaderOpen(true);
      setApprovalTermsOpen(fromScratch);
      setAttachmentsOpen(fromScratch);
    }
  }, [isOpen, fileName]);

  const filteredMedications = mockMedications.filter((m) =>
    m.name.toLowerCase().includes(medicationSearch.toLowerCase())
  );

  const toggleMedication = (id: string) => {
    setSelectedMedications((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const toggleSectionOpen = (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, isOpen: !s.isOpen } : s))
    );
  };

  const updateSectionName = (sectionId: string, newName: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, name: newName } : s))
    );
  };

  const deleteSection = (sectionId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  };

  const addSection = () => {
    const newSection: CustomSection = {
      id: `custom-${Date.now()}`,
      name: "New Section",
      icon: "settings",
      isOpen: true,
      fields: [
        {
          id: `field-${Date.now()}`,
          name: "New Field",
          items: [],
        },
      ],
    };
    setSections((prev) => [...prev, newSection]);
  };

  const addFieldToSection = (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              fields: [
                ...s.fields,
                {
                  id: `field-${Date.now()}`,
                  name: "New Field",
                  items: [],
                },
              ],
            }
          : s
      )
    );
  };

  const updateField = (sectionId: string, fieldId: string, updates: Partial<CustomField>) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              fields: s.fields.map((f) =>
                f.id === fieldId ? { ...f, ...updates } : f
              ),
            }
          : s
      )
    );
  };

  const deleteField = (sectionId: string, fieldId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
          : s
      )
    );
  };

  const addAttachmentLink = () => {
    if (newLinkUrl.trim() && newLinkName.trim()) {
      const newAttachment: Attachment = {
        id: Date.now().toString(),
        name: newLinkName.trim(),
        type: "link",
        url: newLinkUrl.trim(),
        uploadedAt: new Date().toISOString().split("T")[0],
      };
      setAttachments((prev) => [...prev, newAttachment]);
      setNewLinkUrl("");
      setNewLinkName("");
      toast({ title: "Link added", description: "Reference link has been attached." });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newAttachment: Attachment = {
        id: Date.now().toString(),
        name: file.name,
        type: "pdf",
        uploadedAt: new Date().toISOString().split("T")[0],
      };
      setAttachments((prev) => [...prev, newAttachment]);
      toast({ title: "File attached", description: `${file.name} has been uploaded.` });
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const isDuplicateName = existingPolicyNames.some(n => n.toLowerCase() === policyName.trim().toLowerCase());

  const handleSaveClick = () => {
    if (isDuplicateName) {
      toast({ title: "Duplicate policy name", description: "A policy with this name already exists. Please choose a different name." });
      return;
    }
    setShowSignOffModal(true);
  };

  const handleSignOffConfirm = (signOffData: { name: string; timestamp: string }) => {
    setShowSignOffModal(false);
    toast({
      title: "Policy Saved",
      description: `Signed off by ${signOffData.name} on ${signOffData.timestamp}`,
    });
    onSave({
      name: policyName,
      effectiveDate,
      companies: [],
      medications: selectedMedications,
      sections,
      initialApprovalDuration: initialDuration,
      reauthorizationDuration: reauthorizationDuration,
      attachments,
    });
  };


  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "check":
        return Check;
      case "clock":
        return Clock;
      case "calendar":
        return Calendar;
      case "file":
        return FileText;
      default:
        return Settings;
    }
  };

  const SectionHeader = ({ 
    section,
    onToggle,
    onRename,
    onDelete,
    onAddField,
  }: { 
    section: CustomSection;
    onToggle: () => void;
    onRename: (name: string) => void;
    onDelete: () => void;
    onAddField: () => void;
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [nameValue, setNameValue] = useState(section.name);
    const Icon = getIconComponent(section.icon);

    const handleSave = () => {
      if (nameValue.trim()) {
        onRename(nameValue.trim());
      } else {
        setNameValue(section.name);
      }
      setIsEditing(false);
    };

    return (
      <div className="flex w-full items-center gap-2 py-3 px-4">
        <button onClick={onToggle} className="p-1 rounded hover:bg-secondary transition-colors">
          {section.isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <Icon className="h-4 w-4 text-muted-foreground" />
        {isEditing ? (
          <Input
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="h-7 flex-1 text-sm font-medium"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="flex-1 text-left font-medium text-foreground hover:text-accent transition-colors group flex items-center gap-1.5"
          >
            {section.name}
            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 text-muted-foreground" />
          </button>
        )}
        {section.badge && (
          <Badge variant="secondary" className="text-xs">
            {section.badge}
          </Badge>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  const StaticSectionHeader = ({ 
    title, 
    isOpen, 
    icon: Icon,
  }: { 
    title: string; 
    isOpen: boolean; 
    icon: React.ElementType;
  }) => (
    <div className="flex w-full items-center gap-2 py-3 px-4 cursor-pointer hover:bg-secondary/50 transition-colors">
      <div className="p-1 rounded hover:bg-secondary">
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="font-medium text-foreground">{title}</span>
    </div>
  );

  // Preview Component
  const PolicyPreview = () => (
    <div className="space-y-6 p-4">
      <div className="text-center border-b border-border pb-4">
        <h2 className="text-xl font-bold text-foreground">{policyName || "Untitled Policy"}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Last Updated: {effectiveDate}
        </p>
      </div>

      {sections.map((section) => (
        <div key={section.id} className="space-y-4">
          <h3 className="font-semibold text-foreground text-lg border-b-2 border-accent pb-2">
            {section.name}
          </h3>
          <div className={cn(
            "grid gap-3",
            section.id === "description" ? "grid-cols-1" : "md:grid-cols-2"
          )}>
            {section.fields.map((field) => (
              <div key={field.id} className={cn(
                "rounded-lg bg-secondary/40 border border-border/50 p-3 space-y-2",
                section.id === "description" && "col-span-full"
              )}>
                {section.id !== "description" && (
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-accent">
                    {field.name}
                  </h4>
                )}
                {section.id === "description" ? (
                  <div className="space-y-1.5">
                    {field.items.map((item) => (
                      <p key={item.id} className="text-sm text-foreground">
                        {item.value || "No description defined"}
                      </p>
                    ))}
                    {field.items.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">No description defined</p>
                    )}
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {field.items.map((item) => (
                      <li key={item.id} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                        <span className="text-foreground">{item.value || "No criteria defined"}</span>
                      </li>
                    ))}
                    {field.items.length === 0 && (
                      <li className="text-sm text-muted-foreground italic">No criteria defined</li>
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="space-y-3">
        <h3 className="font-semibold text-foreground text-lg border-b-2 border-accent pb-2">Approval Terms</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-secondary/40 border border-border/50 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-accent">Initial Approval</span>
            <p className="text-foreground font-medium mt-1">{initialDuration}</p>
          </div>
          <div className="rounded-lg bg-secondary/40 border border-border/50 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-accent">Reauthorization</span>
            <p className="text-foreground font-medium mt-1">{reauthorizationDuration}</p>
          </div>
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground text-lg border-b-2 border-accent pb-2">Source Documents</h3>
          <ul className="space-y-2">
            {attachments.map((att) => (
              <li key={att.id} className="flex items-center gap-2 text-sm rounded-lg bg-secondary/40 border border-border/50 p-3">
                {att.type === "pdf" ? (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Link className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-foreground">{att.name}</span>
                {att.url && (
                  <ExternalLink className="h-3 w-3 text-accent" />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "overflow-hidden flex flex-col transition-all duration-300",
        isFullscreen 
          ? "max-w-[100vw] w-[100vw] h-[100vh] rounded-none" 
          : "max-w-4xl h-[90vh]"
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg ai-gradient">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              Clinical Policy Builder
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                <TabsList className="h-8">
                  <TabsTrigger value="edit" className="text-xs gap-1.5 h-7">
                    <Pencil className="h-3 w-3" />
                    Edit
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="text-xs gap-1.5 h-7">
                    <Eye className="h-3 w-3" />
                    Preview
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {activeTab === "preview" ? (
          <ScrollArea className="flex-1 min-h-0">
            <PolicyPreview />
          </ScrollArea>
        ) : (
          <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin">
            <div className="space-y-4 pb-2">
            {/* Section 1: Header & Policy Identification */}
            <div className="rounded-lg border border-border">
              <Collapsible open={headerOpen} onOpenChange={setHeaderOpen}>
                <CollapsibleTrigger asChild>
                  <div>
                    <StaticSectionHeader 
                      title="Header & Policy Identification" 
                      isOpen={headerOpen}
                      icon={FileText}
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 space-y-4 border-t border-border">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="policy-name">Policy Name / Medication</Label>
                        <Input
                          id="policy-name"
                          value={policyName}
                          onChange={(e) => setPolicyName(e.target.value)}
                          placeholder="e.g., Weight Loss Management"
                          className={cn(
                            existingPolicyNames.some(n => n.toLowerCase() === policyName.trim().toLowerCase()) && "border-destructive"
                          )}
                        />
                        {existingPolicyNames.some(n => n.toLowerCase() === policyName.trim().toLowerCase()) && (
                          <p className="text-xs text-destructive">A policy with this name already exists.</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="effective-date">Last Updated</Label>
                        <Input
                          id="effective-date"
                          type="date"
                          value={effectiveDate}
                          onChange={(e) => setEffectiveDate(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    {/* Medication Assignment */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2">
                        <Pill className="h-4 w-4 text-muted-foreground" />
                        <Label>Assign Medications</Label>
                        {selectedMedications.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {selectedMedications.length} selected
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {selectedMedications.map((id) => {
                          const med = mockMedications.find((m) => m.id === id);
                          return (
                            <Badge
                              key={id}
                              variant="secondary"
                              className="gap-1 pr-1"
                            >
                              {med?.name.split(" ")[0]}
                              <button
                                onClick={() => toggleMedication(id)}
                                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          );
                        })}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0 rounded-full"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-0 bg-popover" align="start">
                            <div className="p-2 border-b border-border">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                  value={medicationSearch}
                                  onChange={(e) => setMedicationSearch(e.target.value)}
                                  placeholder="Search medications..."
                                  className="pl-7 h-8 text-sm"
                                />
                              </div>
                            </div>
                            <ScrollArea className="h-48">
                              <div className="p-1 space-y-0.5">
                                {filteredMedications.map((medication) => (
                                  <button
                                    key={medication.id}
                                    onClick={() => toggleMedication(medication.id)}
                                    className={cn(
                                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                                      selectedMedications.includes(medication.id)
                                        ? "bg-accent/10 text-accent"
                                        : "hover:bg-secondary text-foreground"
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                                        selectedMedications.includes(medication.id)
                                          ? "border-accent bg-accent text-white"
                                          : "border-muted-foreground/30"
                                      )}
                                    >
                                      {selectedMedications.includes(medication.id) && (
                                        <Check className="h-3 w-3" />
                                      )}
                                    </div>
                                    {medication.name}
                                  </button>
                                ))}
                              </div>
                            </ScrollArea>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>


            {/* Dynamic Sections */}
            {sections.map((section) => (
              <div key={section.id} className="rounded-lg border border-border">
                <Collapsible open={section.isOpen} onOpenChange={() => toggleSectionOpen(section.id)}>
                  <div className="border-b border-border">
                    <SectionHeader
                      section={section}
                      onToggle={() => toggleSectionOpen(section.id)}
                      onRename={(name) => updateSectionName(section.id, name)}
                      onDelete={() => deleteSection(section.id)}
                      onAddField={() => addFieldToSection(section.id)}
                    />
                  </div>
                  <CollapsibleContent>
                    <div className="p-4 space-y-4">
                      <div className={cn(
                        "grid gap-4",
                        section.id === "description" ? "grid-cols-1" : "md:grid-cols-2"
                      )}>
                        {section.fields.map((field) => (
                          <CriteriaList
                            key={field.id}
                            title={field.name}
                            items={field.items}
                            onUpdate={(items) =>
                              updateField(section.id, field.id, { items })
                            }
                            onRename={(name) =>
                              updateField(section.id, field.id, { name })
                            }
                            onDelete={() => deleteField(section.id, field.id)}
                            placeholder="Enter criteria..."
                            canDelete={section.fields.length > 1}
                          />
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addFieldToSection(section.id)}
                        className="w-full border-dashed gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Field
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}

            {/* Approval Terms */}
            <div className="rounded-lg border border-border">
              <Collapsible open={approvalTermsOpen} onOpenChange={setApprovalTermsOpen}>
                <CollapsibleTrigger asChild>
                  <div>
                    <StaticSectionHeader 
                      title="Approval Terms" 
                      isOpen={approvalTermsOpen}
                      icon={Calendar}
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 border-t border-border">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Initial Approval Duration</Label>
                        <Select value={initialDuration} onValueChange={setInitialDuration}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {durationOptions.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Reauthorization Duration</Label>
                        <Select value={reauthorizationDuration} onValueChange={setReauthorizationDuration}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {durationOptions.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>


            {/* Attachments Section */}
            <div className="rounded-lg border border-border">
              <Collapsible open={attachmentsOpen} onOpenChange={setAttachmentsOpen}>
                <CollapsibleTrigger asChild>
                  <div>
                    <StaticSectionHeader 
                      title="Source Documents & Attachments" 
                      isOpen={attachmentsOpen}
                      icon={Paperclip}
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 border-t border-border space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Attach FDA labels, clinical guidelines, or reference documents.
                    </p>
                    
                    {/* Existing Attachments */}
                    {attachments.length > 0 && (
                      <div className="space-y-2">
                        {attachments.map((att) => (
                          <div
                            key={att.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 group"
                          >
                            {att.type === "pdf" ? (
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <Link className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{att.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {att.type === "link" ? "External Link" : "PDF Document"} • Added {att.uploadedAt}
                              </p>
                            </div>
                            {att.url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => window.open(att.url, "_blank")}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                              onClick={() => removeAttachment(att.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add New Attachment */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Upload File */}
                      <div className="space-y-2">
                        <Label className="text-xs">Upload Document</Label>
                        <label className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 cursor-pointer transition-colors">
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Choose PDF file</span>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Add Link */}
                      <div className="space-y-2">
                        <Label className="text-xs">Add Reference Link</Label>
                        <div className="space-y-2">
                          <Input
                            placeholder="Link name (e.g., FDA Label)"
                            value={newLinkName}
                            onChange={(e) => setNewLinkName(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Input
                              placeholder="https://..."
                              value={newLinkUrl}
                              onChange={(e) => setNewLinkUrl(e.target.value)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={addAttachmentLink}
                              disabled={!newLinkUrl.trim() || !newLinkName.trim()}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Add Section Button */}
            <Button
              variant="outline"
              onClick={addSection}
              className="w-full border-dashed gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Custom Section
            </Button>
          </div>
        </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-4 border-t border-border mt-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveClick}
              disabled={!policyName.trim() || selectedMedications.length === 0}
              className="ai-gradient"
            >
              {fileName ? "Save" : "Create Policy"}
            </Button>
          </div>
        </div>
      </DialogContent>

      <SignOffModal
        isOpen={showSignOffModal}
        onClose={() => setShowSignOffModal(false)}
        onConfirm={handleSignOffConfirm}
        policyName={policyName}
      />
    </Dialog>
  );
}
