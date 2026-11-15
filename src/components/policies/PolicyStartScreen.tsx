import { useState, useEffect } from "react";
import { Search, FileText, TrendingUp, ArrowRight, List, Upload, Copy, Sparkles, Library, MoreVertical, Trash2, FileEdit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PolicyUploader } from "./PolicyUploader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PolicyItem {
  id: string;
  name: string;
  category: string;
  usageCount?: number;
  status?: "draft" | "published";
}

const commonPolicies: PolicyItem[] = [
  { id: "1", name: "Dupixent", category: "Dermatology", usageCount: 245, status: "published" },
  { id: "4", name: "Humira", category: "Rheumatology", usageCount: 189, status: "published" },
  { id: "5", name: "Ozempic", category: "Endocrinology", usageCount: 156, status: "published" },
  { id: "6", name: "Qulipta (atogepant)", category: "Neurology", usageCount: 134, status: "published" },
  { id: "2", name: "Evenity", category: "Rheumatology", usageCount: 98, status: "published" },
  { id: "3", name: "Galantamine and Rivastigmine", category: "Neurology", usageCount: 87, status: "published" },
];

interface PolicyStartScreenProps {
  onSelectPolicy: (id: string) => void;
  onDuplicatePolicy?: (id: string) => void;
  onDeletePolicy?: (id: string, name: string) => void;
  onShowAllPolicies?: () => void;
  onTestGuidelines?: (policyName?: string) => void;
  onAddPolicy?: (policyName: string) => void;
  policies?: PolicyItem[];
  builderInitialTab?: "edit" | "preview";
  shouldOpenBuilder?: boolean;
  onBuilderOpened?: () => void;
}

export function PolicyStartScreen({ onSelectPolicy, onDuplicatePolicy, onDeletePolicy, onShowAllPolicies, onTestGuidelines, onAddPolicy, policies: externalPolicies, builderInitialTab, shouldOpenBuilder, onBuilderOpened }: PolicyStartScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateSearchQuery, setDuplicateSearchQuery] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<{ id: string; name: string } | null>(null);

  // Handle external trigger to open the builder modal
  useEffect(() => {
    if (shouldOpenBuilder) {
      setShowUploadModal(true);
      onBuilderOpened?.();
    }
  }, [shouldOpenBuilder, onBuilderOpened]);

  // Use external policies if provided, otherwise fall back to mock data
  const displayPolicies = externalPolicies || commonPolicies;

  const filteredPolicies = searchQuery
    ? displayPolicies.filter((policy) =>
        policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : displayPolicies.slice(0, 3);

  const duplicateFilteredPolicies = duplicateSearchQuery
    ? displayPolicies.filter((policy) =>
        policy.name.toLowerCase().includes(duplicateSearchQuery.toLowerCase()) ||
        policy.category.toLowerCase().includes(duplicateSearchQuery.toLowerCase())
      )
    : displayPolicies;

  const handleUploadComplete = (policyName?: string) => {
    setShowUploadModal(false);
    if (policyName && onAddPolicy) {
      onAddPolicy(policyName);
    }
  };

  const handleDuplicatePolicy = (policyId: string) => {
    setShowDuplicateModal(false);
    setDuplicateSearchQuery("");
    if (onDuplicatePolicy) {
      onDuplicatePolicy(policyId);
    } else {
      onSelectPolicy(policyId);
    }
  };

  const handleDeleteClick = (policyId: string, policyName: string) => {
    setPolicyToDelete({ id: policyId, name: policyName });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (policyToDelete && onDeletePolicy) {
      onDeletePolicy(policyToDelete.id, policyToDelete.name);
    }
    setIsDeleteDialogOpen(false);
    setPolicyToDelete(null);
  };

  return (
    <div className="min-h-full overflow-y-auto p-8">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground">Clinical Policy Manager</h2>
          <p className="mt-2 text-muted-foreground">
            Create a new policy by uploading a PDF, or select an existing policy to edit
          </p>
        </div>

        {/* Stacked Layout */}
        <div className="space-y-8">
          {/* Left Column - Policy Creation & Editing */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg ai-gradient">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Policy Creation & Editing</h3>
                <p className="text-xs text-muted-foreground">Create or modify clinical policies</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {/* Upload PDF Option */}
              <button
                onClick={() => setShowUploadModal(true)}
                className={cn(
                  "group w-full flex items-center gap-4 rounded-lg border border-border bg-background p-4 text-left transition-all duration-200",
                  "hover:border-accent hover:bg-accent/5 hover:shadow-sm"
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground">Upload Clinical Policy PDF</span>
                  <div className="text-sm text-muted-foreground">
                    AI will extract rules automatically
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-accent" />
              </button>

              {/* Duplicate Existing Option */}
              <button
                onClick={() => setShowDuplicateModal(true)}
                className={cn(
                  "group w-full flex items-center gap-4 rounded-lg border border-border bg-background p-4 text-left transition-all duration-200",
                  "hover:border-accent hover:bg-accent/5 hover:shadow-sm"
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground">
                  <Copy className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground">Duplicate Existing Policy</span>
                  <div className="text-sm text-muted-foreground">
                    Copy and modify an existing policy
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-accent" />
              </button>
            </div>
          </div>

          {/* Policy Library Section */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <Library className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Policy Library</h3>
                <p className="text-xs text-muted-foreground">Browse and manage existing policies</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search existing policies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-12 text-base bg-background"
              />
            </div>

            {/* Common Policies */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>{searchQuery ? "Search Results" : "Most Common Policies"}</span>
                </div>
                {onShowAllPolicies && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onShowAllPolicies}
                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <List className="h-4 w-4" />
                    Show All
                  </Button>
                )}
              </div>
              
              <div className="grid gap-2 max-h-[320px] overflow-y-auto scrollbar-thin pr-1">
                {filteredPolicies.map((policy) => (
                  <div
                    key={policy.id}
                    className={cn(
                      "group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all duration-200",
                      "hover:border-accent hover:bg-accent/5 hover:shadow-sm"
                    )}
                  >
                    <button
                      onClick={() => onSelectPolicy(policy.id)}
                      className="flex flex-1 items-center gap-4 text-left"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{policy.name}</span>
                          {policy.status === "draft" && (
                            <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 bg-amber-500/10">
                              <FileEdit className="h-3 w-3 mr-1" />
                              Draft
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{policy.category}</span>
                          {policy.usageCount !== undefined && policy.usageCount > 0 && (
                            <>
                              <span>•</span>
                              <span>{policy.usageCount} cases reviewed</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        {onDuplicatePolicy && (
                          <DropdownMenuItem
                            onClick={() => onDuplicatePolicy(policy.id)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate Policy
                          </DropdownMenuItem>
                        )}
                        {onDeletePolicy && (
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(policy.id, policy.name)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Policy
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>

              {filteredPolicies.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <p className="text-muted-foreground">No policies found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upload PDF Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Clinical Policy</DialogTitle>
          </DialogHeader>
          <PolicyUploader 
            onUploadComplete={handleUploadComplete} 
            onTestGuidelines={onTestGuidelines} 
            initialTab={builderInitialTab} 
            autoOpenBuilder={shouldOpenBuilder}
          />
        </DialogContent>
      </Dialog>

      {/* Duplicate Policy Modal */}
      <Dialog open={showDuplicateModal} onOpenChange={setShowDuplicateModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Duplicate Existing Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search policies to duplicate..."
                value={duplicateSearchQuery}
                onChange={(e) => setDuplicateSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2 scrollbar-thin">
              {duplicateFilteredPolicies.map((policy) => (
                <button
                  key={policy.id}
                  onClick={() => handleDuplicatePolicy(policy.id)}
                  className={cn(
                    "group w-full flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-left transition-all duration-200",
                    "hover:border-accent hover:bg-accent/5"
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm text-foreground">{policy.name}</span>
                    <div className="text-xs text-muted-foreground">{policy.category}</div>
                  </div>
                  <Copy className="h-4 w-4 text-muted-foreground/50 group-hover:text-accent" />
                </button>
              ))}
              {duplicateFilteredPolicies.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No policies found
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Policy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{policyToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPolicyToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
