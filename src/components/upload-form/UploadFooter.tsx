import React from "react";
import { Button } from "../ui/button";
import type { FileRecord } from "../../types/common";

interface UploadFooterProps {
  files: FileRecord[];
  dirPath: string;
  isSubmitting: boolean;
  processingLoader: boolean;
  onReset: () => void;
  onSubmit: () => void;
}

export const UploadFooter: React.FC<UploadFooterProps> = ({
  files,
  dirPath,
  isSubmitting,
  processingLoader,
  onReset,
  onSubmit,
}) => {
  return (
    <div className="flex-shrink-0 bg-white border-t border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          <span className="font-semibold">
            {files.length.toLocaleString()}
          </span>{" "}
          files ready for processing
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            disabled={isSubmitting || processingLoader}
            onClick={onReset}
          >
            Reset Data
          </Button>
          <Button
            type="submit"
            disabled={!dirPath || processingLoader}
            onClick={onSubmit}
          >
            {isSubmitting ? "Uploading..." : "Submit All Files"}
          </Button>
        </div>
      </div>
    </div>
  );
};