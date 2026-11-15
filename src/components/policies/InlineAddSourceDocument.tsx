import { useState } from "react";
import { FileText, Link as LinkIcon, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DOCUMENT_TYPES = [
  "Appendix",
  "Attachment",
  "Authorization",
  "Other",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export interface SourceDocument {
  id: string;
  name: string;
  type: "pdf" | "link";
  documentType: DocumentType;
  url?: string;
  fileName?: string;
}

interface InlineAddSourceDocumentProps {
  onAdd: (doc: SourceDocument) => void;
  onCancel: () => void;
}

export function InlineAddSourceDocument({ onAdd, onCancel }: InlineAddSourceDocumentProps) {
  const [documentType, setDocumentType] = useState<DocumentType>("Appendix");
  const [attachMethod, setAttachMethod] = useState<"file" | "link">("file");
  const [documentName, setDocumentName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx,.xlsx,.csv,.txt";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setSelectedFile(file);
        if (!documentName) {
          setDocumentName(file.name.replace(/\.[^/.]+$/, ""));
        }
      }
    };
    input.click();
  };

  const canSubmit =
    documentName.trim() &&
    documentType &&
    (attachMethod === "file" ? !!selectedFile : linkUrl.trim().length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onAdd({
      id: `doc-${Date.now()}`,
      name: documentName.trim(),
      type: attachMethod === "file" ? "pdf" : "link",
      documentType,
      url: attachMethod === "link" ? linkUrl.trim() : undefined,
      fileName: selectedFile?.name,
    });
  };

  return (
    <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Document Type */}
        <div className="space-y-1.5">
          <Label className="text-xs">Document Type</Label>
          <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Display Name */}
        <div className="space-y-1.5">
          <Label className="text-xs">Display Name</Label>
          <Input
            className="h-9"
            placeholder="e.g. FDA Label - Rinvoq"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
          />
        </div>
      </div>

      {/* Attach Method */}
      <div className="space-y-2">
        <Label className="text-xs">Attach via</Label>
        <RadioGroup
          value={attachMethod}
          onValueChange={(v) => setAttachMethod(v as "file" | "link")}
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="file" id="inline-method-file" />
            <Label htmlFor="inline-method-file" className="cursor-pointer font-normal text-sm">
              Upload File
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="link" id="inline-method-link" />
            <Label htmlFor="inline-method-link" className="cursor-pointer font-normal text-sm">
              Paste Link
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* File or Link */}
      {attachMethod === "file" ? (
        selectedFile ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate flex-1">{selectedFile.name}</span>
            <button onClick={() => setSelectedFile(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={handleFileSelect} className="gap-2">
            <Upload className="h-4 w-4" />
            Choose File
          </Button>
        )
      ) : (
        <Input className="h-9" placeholder="https://…" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={handleSubmit} disabled={!canSubmit}>
          Add Document
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
