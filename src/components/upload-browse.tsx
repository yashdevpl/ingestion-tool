import { Upload } from "lucide-react";
import React, { useRef, useState } from "react";

export type UploadEventType =
  | React.DragEvent<HTMLElement>
  | React.ChangeEvent<HTMLInputElement>;

interface UploadBrowseProps {
  onBrowse: (event: UploadEventType) => void;
  acceptTypes?: string;
  maxSize?: string;
  [key: string]: any;
}

export function UploadBrowse({
  onBrowse,
  acceptTypes = "*",
  maxSize,
  ...rest
}: UploadBrowseProps) {
  const uploadRef = useRef<HTMLInputElement>(null);

  const [labelText, setLabelText] = useState<string>("Drag and drop media");

  const stopDefaults = (e: React.DragEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const dragEvents = {
    onDragEnter: (e: React.DragEvent) => {
      stopDefaults(e);
      setLabelText("Drop files here");
    },
    onDragLeave: (e: React.DragEvent) => {
      stopDefaults(e);
      setLabelText("Drag and drop media");
    },
    onDragOver: stopDefaults,
    onDrop: (e: React.DragEvent<HTMLElement>) => {
      stopDefaults(e);
      setLabelText("Drag and drop media");
      onBrowse(e);
    },
  };

  const handleClick = (event: React.MouseEvent<HTMLInputElement>) => {
    (event.target as HTMLInputElement).value = "";
  };

  return (
    <div>
      <input
        type="file"
        ref={uploadRef}
        id="uploadFiles"
        className="hidden"
        onChange={onBrowse}
        onClick={handleClick}
        accept={acceptTypes}
        multiple
        {...rest}
      />
      <label htmlFor="uploadFiles" {...dragEvents}>
        <div
          className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed px-6 py-8 ${
            rest.disabled && "cursor-auto opacity-50"
          }`}
        >
          <Upload className="text-muted-foreground" />
          <div className="relative flex flex-col items-center justify-center gap-1">
            <p className="text-lg font-bold">{labelText}</p>
            <span className="text-center">
              <p className="mb-1 text-xs font-medium text-blue-600">
                Browse files or folder
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                {maxSize && `Max size: ${maxSize} MB `}( MP3, WAV, AAC, OGG)
              </p>
            </span>
          </div>
        </div>
      </label>
    </div>
  );
}
