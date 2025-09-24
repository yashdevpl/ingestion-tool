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

export interface IMetadata {
  targetNumber?: string;
  trackingCode?: string;
  caller?: string;
  callee?: string;
  startTime?: Date;
  endTime?: Date;
  direction?: string;
  imei?: string;
  imsi?: string;
  startCellId?: string;
  endCellId?: string;
  startCellAddress?: string;
  endCellAddress?: string;
  startCellLatitude?: string;
  endCellLatitude?: string;
  startCellLongitude?: string;
  endCellLongitude?: string;
  message?: string;
}

export interface FileRecord {
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
