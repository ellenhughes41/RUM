import { useState } from "react";
import { History, RotateCcw, Calendar, User, FileText, Check, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOffModal } from "./SignOffModal";

interface VersionEntry {
  id: string;
  version: string;
  changedBy: string;
  changedAt: string;
  summary: string;
}

interface PolicySection {
  id: string;
  name: string;
  badge?: string;
  fields: {
    id: string;
    name: string;
    items: { id: string; value: string }[];
  }[];
}

interface ViewVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (versionId: string, signOffData: { name: string; timestamp: string }) => void;
  version: VersionEntry | null;
  policyName: string;
  isCurrentVersion?: boolean;
}

// Mock historical policy data for demonstration
const getMockVersionData = (versionId: string): PolicySection[] => {
  if (versionId === "v1") {
    return [
      {
        id: "initial-approval",
        name: "Initial Approval Criteria",
        badge: "Original",
        fields: [
          { id: "prescriber", name: "Prescriber Requirements", items: [
            { id: "1", value: "Must be prescribed by or in consultation with a Neurologist or Pain Specialist" }
          ]},
          { id: "age", name: "Patient Eligibility (Age)", items: [
            { id: "2", value: "Patient must be 18 years or older" }
          ]},
          { id: "diagnosis", name: "Diagnosis / Indication", items: [
            { id: "3", value: "Diagnosis of episodic or chronic migraines" }
          ]},
          { id: "step-therapy", name: "Step Therapy Requirements", items: [
            { id: "4", value: "Trial and failure of at least ONE standard prophylactic therapy" }
          ]},
        ],
      },
      {
        id: "reauthorization",
        name: "Reauthorization Criteria",
        badge: "Annual Renewal",
        fields: [
          { id: "efficacy", name: "Renewal Review", items: [
            { id: "5", value: "Annual review to determine Medical Necessity for continuation" }
          ]},
        ],
      },
    ];
  }
  
  // Default/current version mock
  return [
    {
      id: "initial-approval",
      name: "Initial Approval Criteria",
      badge: "Updated",
      fields: [
        { id: "prescriber", name: "Prescriber Requirements", items: [
          { id: "1", value: "Must be prescribed by or in consultation with a Neurologist, Pain Specialist, or Headache Specialist" }
        ]},
        { id: "age", name: "Patient Eligibility (Age)", items: [
          { id: "2", value: "Patient must be 18 years or older" }
        ]},
        { id: "diagnosis", name: "Diagnosis / Indication", items: [
          { id: "3", value: "Diagnosis of episodic migraines with ≥4 migraine days per month" },
          { id: "3b", value: "Must be used for preventive treatment of migraines" }
        ]},
        { id: "step-therapy", name: "Step Therapy Requirements", items: [
          { id: "4", value: "Trial and failure of at least ONE standard prophylactic pharmacologic therapy (e.g., ARB, ACE inhibitor, anticonvulsant, beta-blocker, calcium channel blocker, tricyclic antidepressant, or other antidepressant)" }
        ]},
        { id: "exclusions", name: "Exclusions", items: [
          { id: "5", value: "Must NOT be concomitantly taking another CGRP antagonist/inhibitor" }
        ]},
      ],
    },
    {
      id: "reauthorization",
      name: "Reauthorization Criteria",
      badge: "Annual Renewal",
      fields: [
        { id: "efficacy", name: "Renewal Review", items: [
          { id: "6", value: "All prior authorization renewals are reviewed on an annual basis to determine the Medical Necessity for continuation of therapy." }
        ]},
      ],
    },
  ];
};

export function ViewVersionModal({ 
  isOpen, 
  onClose, 
  onRestore, 
  version, 
  policyName,
  isCurrentVersion = false 
}: ViewVersionModalProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["initial-approval", "reauthorization"]));
  const [showSignOffModal, setShowSignOffModal] = useState(false);

  if (!version) return null;

  const versionData = getMockVersionData(version.id);

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

  const handleRestoreClick = () => {
    setShowSignOffModal(true);
  };

  const handleSignOffConfirm = (signOffData: { name: string; timestamp: string }) => {
    setShowSignOffModal(false);
    onRestore(version.id, signOffData);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-accent" />
              View Policy Version
            </DialogTitle>
            <DialogDescription>
              Reviewing version {version.version} of <strong>{policyName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden min-h-0">
            <ScrollArea className="h-full">
              <div className="space-y-4 pr-4 pb-4">
              {/* Version Info Banner */}
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/10 border border-accent/30">
                      <span className="text-sm font-semibold text-accent">v{version.version}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{version.summary}</span>
                        {isCurrentVersion && (
                          <Badge variant="default" className="text-xs">Current</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {version.changedBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {version.changedAt}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Policy Content Preview */}
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Policy Criteria at this Version
              </h4>
              
              {versionData.map((section) => (
                <Collapsible
                  key={section.id}
                  open={expandedSections.has(section.id)}
                  onOpenChange={() => toggleSection(section.id)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{section.name}</span>
                        {section.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {section.badge}
                          </Badge>
                        )}
                      </div>
                      <ChevronDown className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200",
                        expandedSections.has(section.id) && "rotate-180"
                      )} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2 pl-4">
                    {section.fields.map((field) => (
                      <div key={field.id} className="space-y-1">
                        <div className="text-xs font-medium text-accent">{field.name}</div>
                        {field.items.map((item) => (
                          <div 
                            key={item.id}
                            className="rounded-md border border-border/50 bg-secondary/20 p-2.5 text-sm text-foreground"
                          >
                            {item.value}
                          </div>
                        ))}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
            </ScrollArea>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-border pt-4 flex-shrink-0">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {!isCurrentVersion && (
              <Button onClick={handleRestoreClick} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Restore This Version
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SignOffModal
        isOpen={showSignOffModal}
        onClose={() => setShowSignOffModal(false)}
        onConfirm={handleSignOffConfirm}
        policyName={`${policyName} - Restore to v${version.version}`}
      />
    </>
  );
}
