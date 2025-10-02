import { fileStatus } from "../components/upload-form/CompactFileItem";
import type { FileRecord } from "./common";

export interface UploadProgress {
  audioProgress: number;
  smsProgress: number;
  currentBatch: number;
  totalBatches: number;
}

export interface UploadResult {
  successful: FileRecord[];
  failed: FileRecord[];
  processedAudio: number;
  processedSMS: number;
}

export interface UploadContext {
  id: number;
  [key: string]: any;
}

export interface FileListResult {
  allFiles: FileRecord[];
  validFiles: FileRecord[];
  newFileRecords: FileRecord[];
  smsFiles: FileRecord[];
  audioFiles: FileRecord[];
  audioCriFiles: FileRecord[];
  audioMetadataFiles: FileRecord[];
  totalFiles?: number;
  validationErrors?: Array<{
    fileName: string;
    fileType: "audio" | "text" | "system";
    criFileName?: string;
    errors: string[];
    isValid: boolean;
  }>;
  error?: string;
}

export interface FileStatusItem {
  id: string;
  fileName: string;
  fileSize: number;
  uploadDate?: string;
  ingestionDate?: string;
  status: fileStatus;
  fileType: string;
  errorMessage?: string;
}

export interface ElectronBridge {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<void>;
  selectDirectory: () => Promise<string | null>;
  listFiles: (dirPath: string, contextId: number) => Promise<FileListResult>;
  createUploadContext: (
    userId: string,
    userEmail: string,
    folderPath: string
  ) => Promise<UploadContext>;
  uploadFiles: (
    files: FileRecord[],
    contextId: number
  ) => Promise<UploadResult>;
  onUploadProgress: (callback: (progress: UploadProgress) => void) => void;
  removeUploadProgressListener: () => void;
  confirmFileUpload: (files: FileRecord[]) => Promise<void>;
  onOAuthCallback: (callback: (url: string) => void) => void;
  removeOAuthListener: () => void;
  openExternal: (url: string) => Promise<void>;
  getPendingOAuthCallback: () => Promise<string | null>;
  onClearAuthOnClose: (callback: () => void) => void;
  removeClearAuthListener: () => void;
  reUploadFile: (
    fileId: string,
    fileName: string,
    status: string,
    dirPath: string
  ) => Promise<any>;
}
