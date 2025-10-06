export interface apiResponse<T> {
  status: boolean;
  data: T;
}

export interface CallLogEntry {
  criFileName?: string;
  uniqueCallId?: string;
  targetNumber?: string;
  targetName?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  direction?: string;
  callType?: string;
  callingNumber?: string;
  calledNumber?: string;
  callPriority?: string;
  callCategory?: string;
  fwdToNumber?: string;
  imeiA?: string;
  imeiB?: string;
  imsiA?: string;
  imsiB?: string;
  cellIdA?: string;
  cellIdB?: string;
  cellAddressA?: string;
  cellAddressB?: string;
  latitudeA?: string;
  longitudeA?: string;
  latitudeB?: string;
  longitudeB?: string;
  fileName?: string;
  messageContent?: string;
}
/**
 * Call Record parsed from CRI file / related source
 */
export interface IMetadata {
  criFileName: string;
  targetNumber: string;
  targetName: string;

  // original timestamps as found in the file (keep as string if format is non-ISO)
  startTime: string; // e.g. "03/16/25 10:27:11"
  endTime: string; // e.g. "03/16/25 11:22:33"

  // optional parsed Date objects if you convert the above strings to Date
  parsedStartTime?: Date;
  parsedEndTime?: Date;

  duration: number; // seconds (or milliseconds if you prefer) — here appears to be seconds

  direction: "Incoming" | "Outgoing" | "Missed" | string;
  callType: "Voice" | "Video" | "SMS" | string;
  callingNumber: string;
  calledNumber: string;

  callPriority?: "Low" | "Normal" | "High" | string;
  callCategory?: "Business" | "Personal" | "Spam" | string;

  fwdToNumber?: string | null;

  imeiA?: string | null;
  imeiB?: string | null;
  imsiA?: string | null;
  imsiB?: string | null;

  cellIdA?: string | number | null;
  cellIdB?: string | number | null;
  cellAddressA?: string | null;
  cellAddressB?: string | null;

  latitudeA?: string | number | null;
  longitudeA?: string | number | null;
  latitudeB?: string | number | null;
  longitudeB?: string | number | null;

  fileName?: string | null; // e.g. audio file linked to this record
  [key: string]: any; // allow extension fields
}

export interface FileRecordMetadata {
  isReferenceFound: boolean;
  id: string;
  file: File;
  type: "audio" | "text";
  duration?: string;
  requestId?: string;
  trackingCode?: string;
  progress?: number;
  status?: "uploading" | "processing" | "completed" | "failed";
  metadata?: IMetadata;
}
export interface ParseResult {
  data: CallLogEntry;
  missingKeys: string[];
}

export interface BrowserInfo {
  browser: string;
  version: string;
}

export interface Context {
  id: number;
  uploadedBy: string | null;
  userEmail: string | null;
  ipAddress: string;
  userAgent: string;
  machineHost: string;
  browserInfo: BrowserInfo;
  metadata: Record<string, any>;
  createdAt: string;
  machineId: string;
  folderPath: string;
}

export interface FileRecord {
  id: number;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: string; // stored as string in your payload
  fileType: string;
  mimeType: string;
  type: string; // duplicate of fileType?
  isUploaded: boolean;
  isRead: boolean;
  isIngested: boolean;
  requestId: string;
  uploadedAt: string; // ISO date string
  contextId: number;
  context: Context;
  requestStatus: string;
}
