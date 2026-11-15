import { useState } from "react";
import { Archive, User, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ArchivePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (archiveData: { name: string; timestamp: string }) => void;
  policyName: string;
}

export function ArchivePolicyModal({ isOpen, onClose, onConfirm, policyName }: ArchivePolicyModalProps) {
  const [name, setName] = useState("");

  const handleConfirm = () => {
    if (!name.trim()) return;
    
    const timestamp = new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    onConfirm({ name: name.trim(), timestamp });
    setName("");
  };

  const handleClose = () => {
    setName("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-amber-500" />
            Archive Policy
          </DialogTitle>
          <DialogDescription>
            You are about to archive <strong>{policyName}</strong>. This policy will be moved to archived status and no longer appear in the active list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="archive-name">Your Name</Label>
            <Input
              id="archive-name"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && handleConfirm()}
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
            <Calendar className="h-4 w-4" />
            <span>
              Archive date:{" "}
              {new Date().toLocaleString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!name.trim()} variant="secondary">
            <Archive className="h-4 w-4 mr-2" />
            Sign Off & Archive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
