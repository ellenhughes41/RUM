import { useState } from "react";
import { Trash2, Calendar, AlertTriangle } from "lucide-react";
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

interface DeletePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteData: { name: string; timestamp: string }) => void;
  policyName: string;
}

export function DeletePolicyModal({ isOpen, onClose, onConfirm, policyName }: DeletePolicyModalProps) {
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
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Policy
          </DialogTitle>
          <DialogDescription>
            You are about to permanently delete <strong>{policyName}</strong>. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3 border border-destructive/20">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>This will permanently remove this policy and all associated rules.</span>
        </div>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="delete-name">Your Name (Required for Sign-Off)</Label>
            <Input
              id="delete-name"
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
              Delete date:{" "}
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
          <Button onClick={handleConfirm} disabled={!name.trim()} variant="destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Sign Off & Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
