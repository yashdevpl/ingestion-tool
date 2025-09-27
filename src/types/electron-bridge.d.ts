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
  validFiles: FileRecord[];
  newFileRecords: FileRecord[];
  smsFiles: FileRecord[];
  audioFiles: FileRecord[];
  audioCriFiles: FileRecord[];
  audioMetadataFiles: FileRecord[];
  totalFiles?: number;
  validationErrors?: Array<{
    fileName: string;
    fileType: "audio" | "text";
    criFileName?: string;
    errors: string[];
    isValid: boolean;
  }>;
}

export interface FileStatusItem {
  id: string;
  fileName: string;
  fileSize: number;
  uploadDate?: string;
  ingestionDate?: string;
  status: 'uploaded' | 'ingested' | 'failed';
  fileType: string;
  errorMessage?: string;
}

export interface ElectronBridge {
  selectDirectory: () => Promise<string | null>;
  listFiles: (dirPath: string, contextId: number) => Promise<FileListResult>;
  createUploadContext: () => Promise<UploadContext>;
  uploadFiles: (files: FileRecord[], contextId: number) => Promise<UploadResult>;
  onUploadProgress: (callback: (progress: UploadProgress) => void) => void;
  removeUploadProgressListener: () => void;
  confirmFileUpload: (files: FileRecord[]) => Promise<void>;
  onOAuthCallback: (callback: (url: string) => void) => void;
  removeOAuthListener: () => void;
  openExternal: (url: string) => Promise<void>;
  getPendingOAuthCallback: () => Promise<string | null>;
  onClearAuthOnClose: (callback: () => void) => void;
  removeClearAuthListener: () => void;
}
