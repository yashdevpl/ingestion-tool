import React from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

interface ReadingFilesDialogProps {
  isOpen: boolean;
  dirPath: string;
}

export const ReadingFilesDialog: React.FC<ReadingFilesDialogProps> = ({
  isOpen,
  dirPath,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reading Files</DialogTitle>
          <DialogDescription>
            Reading files from directory: {dirPath}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </DialogContent>
    </Dialog>
  );
};
