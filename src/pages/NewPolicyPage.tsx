import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, FileText, Pill, Calendar, Clock, Plus, Pencil, Save, FileEdit, Upload, Link, ExternalLink, Trash2, Send, Check, ChevronDown, ListChecks, X } from "lucide-react";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { CriteriaSectionsEditor } from "@/components/policies/CriteriaSectionsEditor";
import { InlineAddSourceDocument, type SourceDocument } from "@/components/policies/InlineAddSourceDocument";
import { SignOffModal } from "@/components/policies/SignOffModal";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { usePolicies } from "@/hooks/use-policies";

const drugListOptions = [
  "Specialty Pharmacy Drug List",
  "Preferred Brand Drug List",
  "Non-Preferred Brand Drug List",
  "Generic Drug List",
  "Biosimilar Drug List",
];

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

const durationOptions = ["3 months", "6 months", "7 months", "12 months", "1 year", "2 years"];

interface Attachment {
  id: string;
  name: string;
  type: "pdf" | "link";
  url?: string;
}

export default function NewPolicyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { policies, setPolicies } = usePolicies();

  // Check if we arrived from an upload flow with prefill data
  const locationState = location.state as { fileName?: string; prefill?: boolean; prefillId?: string; prefillName?: string; prefillCategory?: string } | null;
  const searchParams = new URLSearchParams(location.search);
  const queryPrefill = searchParams.get("prefill");

  // Determine prefill source: location state or query param
  const isPrefilled = locationState?.prefill === true || queryPrefill === "weight-management";
  const sourceFileName = locationState?.fileName || "";
  const prefillId = locationState?.prefillId || queryPrefill || (isPrefilled ? "weight-management" : undefined);
  const prefillCategory = locationState?.prefillCategory || (queryPrefill === "skyrizi" ? "Dermatology" : "General");

  // Policy fields — prefill if coming from upload or query
  const prefillNames: Record<string, string> = {
    "weight-management": "Drugs for Weight Loss Management",
    "skyrizi": "Skyrizi (Risankizumab-rzaa)",
  };
  const resolvedName = locationState?.prefillName || (prefillId ? prefillNames[prefillId] : "") || "";
  const [policyName, setPolicyName] = useState(resolvedName);
  const [isEditingName, setIsEditingName] = useState(!resolvedName);
  const [selectedDrugList, setSelectedDrugList] = useState(resolvedName ? `${resolvedName} Drug List` : "");
  const [drugListOpen, setDrugListOpen] = useState(false);
  const [allPlansChecked, setAllPlansChecked] = useState(true);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [planOpen, setPlanOpen] = useState(false);
  const [allCompaniesChecked, setAllCompaniesChecked] = useState(true);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [terminationDate, setTerminationDate] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [initialDuration, setInitialDuration] = useState("7 months");
  const [reauthorizationDuration, setReauthorizationDuration] = useState("1 year");
  const [attachments, setAttachments] = useState<Attachment[]>(
    isPrefilled && sourceFileName
      ? [{ id: "source-1", name: sourceFileName, type: "pdf" }]
      : []
  );
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkName, setNewLinkName] = useState("");
  const [isSignOffOpen, setIsSignOffOpen] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [customAttachments, setCustomAttachments] = useState<SourceDocument[]>([]);

  const addAttachmentLink = () => {
    if (newLinkUrl.trim() && newLinkName.trim()) {
      setAttachments((prev) => [...prev, {
        id: Date.now().toString(),
        name: newLinkName.trim(),
        type: "link",
        url: newLinkUrl.trim(),
      }]);
      setNewLinkUrl("");
      setNewLinkName("");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachments((prev) => [...prev, {
        id: Date.now().toString(),
        name: file.name,
        type: "pdf",
      }]);
    }
  };


  const handleSave = (asPublished: boolean = false, signOffData?: { name: string; timestamp: string }) => {
    if (!policyName.trim()) {
      toast({ title: "Policy name required", description: "Enter a name before saving." });
      return;
    }

    const status = asPublished ? "published" as const : "draft" as const;

    const newPolicy = {
      id: `new-${Date.now()}`,
      name: policyName.trim(),
      category: prefillCategory,
      status,
      isNew: true,
      version: "1.0",
      versionHistory: [{
        version: "1.0",
        changedBy: signOffData?.name || "Current User",
        changedAt: signOffData?.timestamp || new Date().toISOString().split("T")[0],
        summary: asPublished
          ? `Initial policy creation and publish — signed off by ${signOffData?.name}`
          : "Initial policy creation",
      }],
    };

    setPolicies((prev) => [newPolicy, ...prev]);
    toast({
      title: asPublished ? "Policy published" : "Policy created",
      description: asPublished
        ? `"${policyName}" published and signed off by ${signOffData?.name}.`
        : `"${policyName}" saved as draft.`,
    });
    navigate("/policies");
  };

  return (
    <AppLayout>
      <div className="flex h-screen flex-col">
        {/* Top bar */}
        <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/policies")} className="gap-2 -ml-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Policies
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/policies")}>Cancel</Button>
            <Button variant="secondary" onClick={() => handleSave(false)} disabled={!policyName.trim()} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              Save as Draft
            </Button>
            <Button onClick={() => setIsSignOffOpen(true)} disabled={!policyName.trim()} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              Publish
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="mx-auto w-full max-w-4xl space-y-6">

            {/* Header Card */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {isEditingName ? (
                      <div className="space-y-1">
                        <Input
                          value={policyName}
                          onChange={(e) => setPolicyName(e.target.value)}
                          onBlur={() => policyName.trim() && setIsEditingName(false)}
                          onKeyDown={(e) => e.key === "Enter" && policyName.trim() && setIsEditingName(false)}
                          placeholder="Enter policy name..."
                          className="h-8 text-base font-semibold max-w-sm"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="flex items-center gap-2 group"
                      >
                        <h1 className="font-semibold text-foreground">{policyName}</h1>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                      </button>
                    )}
                    <Badge variant="secondary" className="text-xs">v1.0</Badge>
                    <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 bg-amber-500/10">
                      <FileEdit className="h-3 w-3 mr-1" />
                      Draft
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isPrefilled ? `Extracted from ${sourceFileName}` : "New clinical policy"}
                  </p>
                </div>
              </div>
            </div>

            {/* Policy Info Bar */}
            <div className="rounded-lg border border-border bg-card/50 p-4 space-y-4">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Drug List:</span>
                  <Popover open={drugListOpen} onOpenChange={setDrugListOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs font-medium">
                        {selectedDrugList || "Select drug list..."}
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
                              ...(policyName ? [`${policyName} Drug List`] : []),
                              ...drugListOptions,
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
                </div>

                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Carrier:</span>
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
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Effective:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs font-medium gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {effectiveDate}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={effectiveDate ? new Date(effectiveDate) : undefined}
                        onSelect={(date) => { if (date) setEffectiveDate(format(date, "yyyy-MM-dd")); }}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Termination:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs font-medium gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {terminationDate || "None"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={terminationDate ? new Date(terminationDate) : undefined}
                        onSelect={(date) => { if (date) setTerminationDate(format(date, "yyyy-MM-dd")); }}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Initial:</span>
                  <Input
                    value={initialDuration}
                    onChange={(e) => setInitialDuration(e.target.value)}
                    className="h-7 w-28 text-sm font-medium"
                  />
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Reauthorization:</span>
                  <Input
                    value={reauthorizationDuration}
                    onChange={(e) => setReauthorizationDuration(e.target.value)}
                    className="h-7 w-28 text-sm font-medium"
                  />
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
                <CriteriaSectionsEditor prefillData={isPrefilled} prefillId={prefillId} />

                {/* Source Documents */}
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

                  {(attachments.length > 0 || customAttachments.length > 0) && (
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm">
                          {att.type === "pdf" ? <FileText className="h-4 w-4 text-muted-foreground" /> : <Link className="h-4 w-4 text-muted-foreground" />}
                          <span>{att.name}</span>
                          {att.url && <ExternalLink className="h-3 w-3 text-accent" />}
                          <button
                            onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                            className="text-muted-foreground hover:text-destructive ml-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {customAttachments.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm">
                          {doc.type === "pdf" ? <FileText className="h-4 w-4 text-muted-foreground" /> : <Link className="h-4 w-4 text-muted-foreground" />}
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
                  )}

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
        </main>
      </div>

      <SignOffModal
        isOpen={isSignOffOpen}
        onClose={() => setIsSignOffOpen(false)}
        onConfirm={(signOffData) => {
          setIsSignOffOpen(false);
          handleSave(true, signOffData);
        }}
        policyName={policyName}
      />
    </AppLayout>
  );
}
