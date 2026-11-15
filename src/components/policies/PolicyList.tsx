import { useState } from "react";
import { FileText, ChevronRight, Check, Search, AlertTriangle, MoreHorizontal, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ArchivePolicyModal } from "./ArchivePolicyModal";
import { DeletePolicyModal } from "./DeletePolicyModal";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Policy {
  id: string;
  name: string;
  client: string;
  rulesCount: number;
  lastUpdated: string;
  status: "active" | "draft";
  hasFormularyUpdate?: boolean;
  effectiveDate?: string;
  terminationDate?: string;
  plan?: string;
}

type PolicyStatus = "draft" | "active" | "expired";

function getPolicyStatus(policy: Policy): PolicyStatus {
  if (!policy.effectiveDate) return "draft";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const effective = new Date(policy.effectiveDate);
  if (today < effective) return "draft";
  if (policy.terminationDate) {
    const termination = new Date(policy.terminationDate);
    if (today > termination) return "expired";
  }
  return "active";
}

const statusConfig: Record<PolicyStatus, { label: string; className: string; icon: React.ReactNode }> = {
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border-border",
    icon: <FileText className="h-3 w-3" />,
  },
  active: {
    label: "Active",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    icon: <Check className="h-3 w-3" />,
  },
  expired: {
    label: "Expired",
    className: "bg-destructive/10 text-destructive border-destructive/30",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
};

interface ArchivedPolicy extends Policy {
  archivedBy: string;
  archivedAt: string;
}

const existingPolicies: Policy[] = [
  { id: "1", name: "Dupixent", client: "Anthem Blue Cross", rulesCount: 12, lastUpdated: "2024-01-15", status: "active", effectiveDate: "2021-09-01", terminationDate: "2026-08-31", plan: "Commercial" },
  { id: "2", name: "Evenity", client: "UnitedHealthcare", rulesCount: 8, lastUpdated: "2024-01-10", status: "active", effectiveDate: "2024-01-01", terminationDate: "2026-12-31", plan: "Medicare Part D" },
  { id: "3", name: "Galantamine and Rivastigmine", client: "Aetna", rulesCount: 15, lastUpdated: "2024-01-08", status: "active", effectiveDate: "2024-03-01", terminationDate: "2026-02-28", plan: "All Plans" },
  { id: "4", name: "Humira", client: "Cigna", rulesCount: 10, lastUpdated: "2024-01-05", status: "active", effectiveDate: "2023-01-01", terminationDate: "2025-12-31", plan: "Commercial" },
  { id: "5", name: "Ozempic", client: "Blue Shield of California", rulesCount: 9, lastUpdated: "2024-01-02", status: "draft", effectiveDate: "2026-07-01", terminationDate: "2027-06-30", plan: "All Plans" },
  { id: "6", name: "Qulipta (atogepant)", client: "Kaiser Permanente", rulesCount: 11, lastUpdated: "2024-01-12", status: "active", effectiveDate: "2023-07-01", terminationDate: "2026-06-30", hasFormularyUpdate: true, plan: "Medicare Advantage" },
];

interface PolicyListProps {
  selectedPolicy: string | null;
  onSelectPolicy: (id: string) => void;
}

export function PolicyList({ selectedPolicy, onSelectPolicy }: PolicyListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewTab, setViewTab] = useState<"active" | "archived">("active");
  const [archivedPolicies, setArchivedPolicies] = useState<ArchivedPolicy[]>([]);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [policyToArchive, setPolicyToArchive] = useState<Policy | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<Policy | null>(null);
  const [deletedPolicyIds, setDeletedPolicyIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const activePolicies = existingPolicies.filter(
    (policy) => !archivedPolicies.some((ap) => ap.id === policy.id) && !deletedPolicyIds.has(policy.id)
  );

  const filteredActivePolicies = activePolicies.filter((policy) =>
    policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    policy.client.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredArchivedPolicies = archivedPolicies.filter((policy) =>
    policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    policy.client.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleArchiveClick = (e: React.MouseEvent, policy: Policy) => {
    e.stopPropagation();
    setPolicyToArchive(policy);
    setArchiveModalOpen(true);
  };

  const handleConfirmArchive = (archiveData: { name: string; timestamp: string }) => {
    if (!policyToArchive) return;

    const archivedPolicy: ArchivedPolicy = {
      ...policyToArchive,
      archivedBy: archiveData.name,
      archivedAt: archiveData.timestamp,
    };

    setArchivedPolicies((prev) => [...prev, archivedPolicy]);
    setArchiveModalOpen(false);
    setPolicyToArchive(null);

    toast({
      title: "Policy Archived",
      description: `${policyToArchive.name} has been archived by ${archiveData.name}.`,
    });
  };

  const handleRestorePolicy = (e: React.MouseEvent, policy: ArchivedPolicy) => {
    e.stopPropagation();
    setArchivedPolicies((prev) => prev.filter((p) => p.id !== policy.id));
    toast({
      title: "Policy Restored",
      description: `${policy.name} has been restored to active policies.`,
    });
  };

  const handleDeleteClick = (e: React.MouseEvent, policy: Policy) => {
    e.stopPropagation();
    setPolicyToDelete(policy);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = (deleteData: { name: string; timestamp: string }) => {
    if (!policyToDelete) return;

    setDeletedPolicyIds((prev) => new Set([...prev, policyToDelete.id]));
    // Also remove from archived if it was archived
    setArchivedPolicies((prev) => prev.filter((p) => p.id !== policyToDelete.id));
    setDeleteModalOpen(false);
    
    toast({
      title: "Policy Deleted",
      description: `${policyToDelete.name} has been permanently deleted by ${deleteData.name} on ${deleteData.timestamp}.`,
    });
    
    setPolicyToDelete(null);
  };

  const displayPolicies = viewTab === "active" ? filteredActivePolicies : filteredArchivedPolicies;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">Existing Policies</h3>
      </div>

      <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as "active" | "archived")} className="mb-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="text-xs">
            Active ({activePolicies.length})
          </TabsTrigger>
          <TabsTrigger value="archived" className="text-xs">
            Archived ({archivedPolicies.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by medication, client, or keyword..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <TooltipProvider delayDuration={200}>
        <div className="space-y-1">
          {displayPolicies.map((policy) => {
            const computedStatus = getPolicyStatus(policy);
            const statusInfo = statusConfig[computedStatus];
            return (
            <div
              key={policy.id}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all duration-200",
                selectedPolicy === policy.id
                  ? "border-accent bg-accent/5 shadow-sm"
                  : "border-transparent hover:bg-secondary",
                viewTab === "archived" && "opacity-75"
              )}
            >
              <button
                onClick={() => onSelectPolicy(policy.id)}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                <div
                  className={cn(
                    "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                    selectedPolicy === policy.id
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-muted-foreground group-hover:bg-muted"
                  )}
                >
                  <FileText className="h-4 w-4" />
                  {policy.hasFormularyUpdate && viewTab === "active" && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500">
                      <AlertTriangle className="h-2.5 w-2.5 text-white" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">{policy.name}</span>
                    {viewTab === "active" && computedStatus !== "active" && (
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border shrink-0", statusInfo.className)}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                    )}
                    {viewTab === "active" && policy.hasFormularyUpdate && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-500/30">
                            <AlertTriangle className="h-3 w-3" />
                            Update
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="text-sm font-medium">Formulary Update Pending</p>
                          <p className="text-xs text-muted-foreground">Review required for criteria changes</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {viewTab === "archived" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        <Archive className="h-3 w-3" />
                        Archived
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {policy.client}{policy.plan ? ` · ${policy.plan}` : ""} · {policy.rulesCount} rules
                  </span>
                  {viewTab === "archived" && "archivedBy" in policy && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Archived by {(policy as ArchivedPolicy).archivedBy} on {(policy as ArchivedPolicy).archivedAt}
                    </p>
                  )}
                </div>
              </button>

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  {viewTab === "active" ? (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => handleArchiveClick(e as unknown as React.MouseEvent, policy)}
                        className="text-amber-600 cursor-pointer"
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive Policy
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => handleDeleteClick(e as unknown as React.MouseEvent, policy)}
                        className="text-destructive cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Policy
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => handleRestorePolicy(e as unknown as React.MouseEvent, policy as ArchivedPolicy)}
                        className="cursor-pointer"
                      >
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        Restore Policy
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => handleDeleteClick(e as unknown as React.MouseEvent, policy)}
                        className="text-destructive cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Policy
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <ChevronRight
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  selectedPolicy === policy.id ? "text-accent" : "text-muted-foreground/50"
                )}
              />
            </div>
          );
          })}

          {displayPolicies.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {viewTab === "archived" 
                ? "No archived policies" 
                : searchQuery 
                  ? "No policies match your search" 
                  : "No active policies"}
            </div>
          )}
        </div>
      </TooltipProvider>

      <ArchivePolicyModal
        isOpen={archiveModalOpen}
        onClose={() => {
          setArchiveModalOpen(false);
          setPolicyToArchive(null);
        }}
        onConfirm={handleConfirmArchive}
        policyName={policyToArchive?.name || ""}
      />

      <DeletePolicyModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setPolicyToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        policyName={policyToDelete?.name || ""}
      />
    </div>
  );
}

