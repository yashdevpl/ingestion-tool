import React from "react";
import { Upload } from "lucide-react";

interface FileInputSectionProps {
  dirPath: string;
  dragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onFileInput: () => void;
  onDirectoryChange: () => void;
}

export const FileInputSection: React.FC<FileInputSectionProps> = ({
  dirPath,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInput,
  onDirectoryChange,
}) => {
  return (
    <div className="flex-shrink-0 bg-white px-6 py-4 border-b border-slate-200">
      <div
        className={`flex items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 transition-colors ${
          dragOver
            ? "border-blue-400 bg-blue-50"
            : "border-slate-200 hover:border-slate-300"
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="text-center">
          <div className="rounded-full bg-slate-100 p-3 mx-auto w-fit mb-3">
            <Upload className="h-6 w-6 text-slate-600" />
          </div>
          {dirPath ? (
            <div>
              <p className="text-sm text-slate-500 mb-2">
                Selected directory:{" "}
                <span className="font-medium">{dirPath}</span>
              </p>
              <button
                onClick={onDirectoryChange}
                className="text-blue-600 hover:underline text-sm"
              >
                Change Directory
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-slate-900 mb-1">
                Drag and drop files here, or{" "}
                <button
                  onClick={onFileInput}
                  className="text-blue-600 hover:underline"
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-slate-500">
                Supports audio files, SMS threads, documents
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};