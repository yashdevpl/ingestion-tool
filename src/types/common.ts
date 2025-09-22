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

export interface ParseResult {
  data: CallLogEntry;
  missingKeys: string[];
}
