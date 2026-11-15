import { useState } from "react";
import { Upload, FileText, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PolicyBuilderModal, PolicyBuilderData } from "./PolicyBuilderModal";
import { usePolicies } from "@/hooks/use-policies";

interface PolicyUploaderProps {
  onUploadComplete: (policyName?: string) => void;
  onTestGuidelines?: (policyName?: string) => void;
  initialTab?: "edit" | "preview";
  autoOpenBuilder?: boolean;
}

export function PolicyUploader({ onUploadComplete, onTestGuidelines, initialTab, autoOpenBuilder }: PolicyUploaderProps) {
  const { policies } = usePolicies();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(autoOpenBuilder ? "Weight_Management_Policy.pdf" : null);
  const [showBuilderModal, setShowBuilderModal] = useState(autoOpenBuilder || false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") {
      processFile(file.name);
    }
  };

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
      setShowBuilderModal(true);
    }, 5000);
  };

  const handleSavePolicy = (data: PolicyBuilderData) => {
    console.log("Policy created:", data);
    setShowBuilderModal(false);
    setUploadedFile(null);
    onUploadComplete(data.name);
  };

  const handleCloseModal = () => {
    setShowBuilderModal(false);
    setUploadedFile(null);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg ai-gradient">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Upload Clinical Policy</h3>
            <p className="text-xs text-muted-foreground">AI will extract rules automatically</p>
          </div>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-200",
            isDragging
              ? "border-accent bg-accent/5"
              : "border-border hover:border-muted-foreground/30 hover:bg-secondary/50",
            isProcessing && "pointer-events-none"
          )}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <FileText className="h-6 w-6 text-accent" />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full ai-gradient animate-pulse-glow">
                  <Loader2 className="h-3 w-3 animate-spin text-white" />
                </div>
              </div>
              <div>
                <p className="font-medium text-foreground">{uploadedFile}</p>
                <p className="text-sm text-accent">AI is extracting rules...</p>
              </div>
              <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-2/3 animate-pulse rounded-full ai-gradient" />
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mb-1 text-sm font-medium text-foreground">
                Drop your PDF here, or{" "}
                <label className="cursor-pointer text-accent hover:underline">
                  browse
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-xs text-muted-foreground">PDF clinical policy documents only</p>
            </>
          )}
        </div>

        {/* Demo Button */}
        <button
          onClick={() => {
            setUploadedFile("Weight_Management_Policy.pdf");
            setShowBuilderModal(true);
          }}
          className="w-full text-xs text-muted-foreground hover:text-accent transition-colors underline underline-offset-2"
        >
          Preview example workflow →
        </button>
      </div>

      <PolicyBuilderModal
        isOpen={showBuilderModal}
        onClose={handleCloseModal}
        onSave={handleSavePolicy}
        onTestGuidelines={onTestGuidelines}
        fileName={uploadedFile || ""}
        initialTab={initialTab}
        existingPolicyNames={policies.map(p => p.name)}
      />
    </>
  );
}
