import { fileStatus } from "../components/upload-form/CompactFileItem";
import { FileStatusItem } from "../components/upload-form/FileStatusTabs";
import {
  CallLogEntry,
  FileRecord,
  FileRecordMetadata,
  IMetadata,
  ParseResult,
} from "../types/common";
import { CIR_EXPECTED_KEYS } from "./constants";
import * as Yup from "yup";

export const parseCallLogFile = (
  fileContent: string,
  fileName: string
): ParseResult => {
  const lines = fileContent?.split("\n");
  const data: CallLogEntry = { criFileName: fileName };
  const foundKeys = new Set<string>();
  let isReadingMessageContent = false;
  let messageContent = "";
  let foundSMSHeader = false;

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    // Check if we're entering SMS content section
    if (trimmedLine.startsWith("| SMS") && trimmedLine.endsWith("|")) {
      foundSMSHeader = true;
      return;
    }

    // If we found the SMS header and hit a separator, start reading message content
    if (
      foundSMSHeader &&
      trimmedLine.startsWith("+") &&
      trimmedLine.includes("-")
    ) {
      isReadingMessageContent = true;
      return;
    }

    // If we're reading message content
    if (isReadingMessageContent) {
      // Don't stop on separator lines within the SMS content
      if (
        trimmedLine.startsWith("| ") &&
        trimmedLine.endsWith("|") &&
        !trimmedLine.includes("SMS")
      ) {
        isReadingMessageContent = false;
        foundSMSHeader = false;
        return;
      }

      if (!trimmedLine.startsWith("+") || !trimmedLine.includes("-")) {
        if (messageContent) {
          messageContent += "\n" + line;
        } else {
          messageContent = line;
        }
      }
      return;
    }

    // Skip header lines and empty lines
    if (
      trimmedLine.startsWith("+") ||
      trimmedLine.startsWith("|") ||
      !trimmedLine
    ) {
      return;
    }

    // Parse key-value pairs
    const colonIndex = trimmedLine.indexOf(":");
    if (colonIndex !== -1) {
      const key = trimmedLine.substring(0, colonIndex).trim();
      const value = trimmedLine.substring(colonIndex + 1).trim();

      // Map file keys to object keys
      const keyMapping: { [key: string]: keyof CallLogEntry } = {
        "Unique Call ID": "uniqueCallId",
        "Target Number": "targetNumber",
        "Target Name": "targetName",
        "Start Time": "startTime",
        "End Time": "endTime",
        "Duration (sec)": "duration",
        Direction: "direction",
        "Call Type": "callType",
        "Calling Number": "callingNumber",
        "Called Number": "calledNumber",
        "Call Priority": "callPriority",
        "Call Category": "callCategory",
        "Fwd To Number": "fwdToNumber",
        "IMEI A": "imeiA",
        "IMEI B": "imeiB",
        "IMSI A": "imsiA",
        "IMSI B": "imsiB",
        "Cell ID A": "cellIdA",
        "Cell ID B": "cellIdB",
        "Cell Address A": "cellAddressA",
        "Cell Address B": "cellAddressB",
        "File Name": "fileName",
      };

      // Handle latitude,longitude pairs
      if (key === "Latitude,Longitude A") {
        const coords = value?.split(",");
        if (coords.length >= 2) {
          data.latitudeA = coords[0].trim() || undefined;
          data.longitudeA = coords[1].trim() || undefined;
          foundKeys.add("latitudeA");
          foundKeys.add("longitudeA");
        }
        return;
      }

      if (key === "Latitude,Longitude B") {
        const coords = value?.split(",");
        if (coords.length >= 2) {
          data.latitudeB = coords[0].trim() || undefined;
          data.longitudeB = coords[1].trim() || undefined;
          foundKeys.add("latitudeB");
          foundKeys.add("longitudeB");
        }
        return;
      }

      const mappedKey = keyMapping[key];
      if (mappedKey) {
        if (mappedKey === "duration") {
          // Only assign a number or undefined for duration
          data[mappedKey] = value ? Number.parseInt(value, 10) : undefined;
        } else {
          // Only assign a string or undefined for string fields
          (data as any)[mappedKey] =
            value && value.length > 0 ? value : undefined;
        }
        foundKeys.add(mappedKey);
      }
    }
  });

  // The user wants to extract message content regardless of call type
  if (messageContent) {
    (data as any).messageContent = messageContent.trim();
    foundKeys.add("messageContent");
  }

  // Find missing keys
  const missingKeys = CIR_EXPECTED_KEYS.filter((key) => !foundKeys.has(key));

  return { data, missingKeys };
};

export const getValidISOStringFromCri = (
  dateVal: string | undefined | Date
) => {
  if (!dateVal) return undefined;

  if (dateVal instanceof Date) {
    return !isNaN(dateVal.getTime()) ? dateVal.toISOString() : undefined;
  }

  const [datePart, timePart] = dateVal?.split(" ");
  const [day, month, year] = datePart?.split("/").map(Number);

  const fullYear = year < 50 ? 2000 + year : 1900 + year;

  const [hours, minutes, seconds] = timePart?.split(":").map(Number) ?? [
    0, 0, 0,
  ];

  const d = new Date(fullYear, month - 1, day, hours, minutes, seconds);

  return !isNaN(d.getTime()) ? d.toISOString() : new Date(dateVal);
};

const call_directions = [
  {
    keyword: "call_direction_type",
    value: "INCOMING",
    uuid: "6aacaec3-6b25-492e-8558-097078417aea",
  },
  {
    keyword: "call_direction_type",
    value: "OUTGOING",
    uuid: "5b5fe700-2791-4892-ad53-0bee86e95aa7",
  },
];

export const createMetadataValidationSchema = (fileType: "audio" | "text") => {
  if (fileType === "audio") {
    // Audio/Call validation schema
    return Yup.object({
      targetNumber: Yup.string()
        .required("Target Number is required")
        .test(
          "match-caller-callee",
          "Target Number must match either Caller or Callee",
          function (value) {
            const { caller, callee } = this.parent;
            if (!value) return false;
            return value === caller || value === callee;
          }
        ),
      target_code: Yup.string().required("Target code is required"),
      caller: Yup.string()
        .matches(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number")
        .required("Caller is required"),
      callee: Yup.string()
        .matches(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number")
        .required("Callee is required"),
      direction: Yup.string()
        .oneOf(
          [
            "6aacaec3-6b25-492e-8558-097078417aea",
            "5b5fe700-2791-4892-ad53-0bee86e95aa7",
            "a879922b-2632-4fbd-9920-120b44c500ca",
          ],
          "Direction must be incoming or outgoing"
        )
        .required("Direction is required"),
      call_start: Yup.date().required("Call start time is required"),
      call_end: Yup.date()
        .required("Call end time is required")
        .min(Yup.ref("call_start"), "End time must be after start time"),
      imei: Yup.string().optional(),
      imsi: Yup.string().optional(),
      cell_id_start: Yup.string().optional(),
      cell_id_end: Yup.string().optional(),
      cell_address_start: Yup.string().optional(),
      cell_address_end: Yup.string().optional(),
      latitude_longitude_start: Yup.string().optional(),
      latitude_longitude_end: Yup.string().optional(),
    });
  } else {
    // SMS/Text validation schema
    return Yup.object({
      targetNumber: Yup.string()
        .required("Target Number is required")
        .test(
          "match-sender-receiver",
          "Target Number must match either Sender or Receiver",
          function (value) {
            const { sender, receiver } = this.parent;
            if (!value) return false;
            return value === sender || value === receiver;
          }
        ),
      target_code: Yup.string().required("Target code is required"),
      sender: Yup.string()
        .matches(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number")
        .required("Sender is required"),
      receiver: Yup.string()
        .matches(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number")
        .required("Receiver is required"),
      direction: Yup.string()
        .oneOf(
          [
            "6aacaec3-6b25-492e-8558-097078417aea",
            "5b5fe700-2791-4892-ad53-0bee86e95aa7",
            "a879922b-2632-4fbd-9920-120b44c500ca",
          ],
          "Direction must be incoming or outgoing"
        )
        .required("Direction is required"),
      sms_datetime: Yup.date().required("SMS date-time is required"),
      imei: Yup.string().optional(),
      imsi: Yup.string().optional(),
      latitude: Yup.string().optional(),
      longitude: Yup.string().optional(),
      message: Yup.string().optional(),
    });
  }
};

export const validateMetadata = async (
  metadata: any,
  fileType: "audio" | "text",
  fileName: string,
  criFileName?: string
) => {
  const schema = createMetadataValidationSchema(fileType);
  const errors: string[] = [];

  try {
    await schema.validate(metadata, { abortEarly: false });
  } catch (validationError: any) {
    if (validationError.inner) {
      errors.push(...validationError.inner.map((err: any) => err.message));
    }
  }

  return {
    fileName,
    fileType,
    criFileName,
    errors,
    isValid: errors.length === 0,
  };
};

export const createApiMetadata = (metadata: IMetadata) => {
  if (!metadata) return null;

  if (metadata?.callType?.toUpperCase() === "VOICE") {
    // Audio file metadata structure
    return {
      targetNumber: metadata?.targetNumber,
      target_code: metadata?.targetName,
      call_start:
        metadata?.startTime &&
        !isNaN(
          new Date(
            getValidISOStringFromCri(metadata?.startTime) || ""
          ).getTime()
        )
          ? new Date(getValidISOStringFromCri(metadata?.startTime) || "")
          : undefined,
      call_end:
        metadata?.endTime &&
        !isNaN(
          new Date(getValidISOStringFromCri(metadata?.endTime) || "").getTime()
        )
          ? new Date(getValidISOStringFromCri(metadata?.endTime) || "")
          : undefined,
      direction: call_directions.find(
        (dir) => dir.value === metadata?.direction?.toUpperCase()
      )?.uuid,
      caller: metadata?.calledNumber,
      callee: metadata?.callingNumber,
      imei: metadata?.imeiA,
      imsi: metadata?.imsiA,
      cell_id_start: metadata?.cellIdA,
      cell_id_end: metadata?.cellIdB,

      cell_address_start: metadata?.cellAddressA,
      cell_address_end: metadata?.cellAddressB,

      latitude_longitude_start: metadata?.latitudeA
        ? `${metadata.latitudeA},${metadata.longitudeA}`
        : undefined,
      latitude_longitude_end: metadata?.latitudeB
        ? `${metadata.latitudeB},${metadata.longitudeB}`
        : undefined,
    };
  } else {
    // SMS/Text file metadata structure
    return {
      targetNumber: metadata?.targetNumber,
      target_code: metadata?.targetName,
      sender: metadata?.calledNumber,
      receiver: metadata?.callingNumber,
      sms_datetime:
        metadata?.startTime &&
        !isNaN(
          new Date(
            getValidISOStringFromCri(metadata?.startTime) || ""
          ).getTime()
        )
          ? new Date(getValidISOStringFromCri(metadata?.startTime) || "")
          : undefined,
      imei: metadata?.imeiB,
      imsi: metadata?.imsiB,
      direction: call_directions.find(
        (dir) => dir.value === metadata?.direction?.toUpperCase()
      )?.uuid,
      latitude: metadata?.latitudeB,
      longitude: metadata?.longitudeB,
      message: metadata?.messageContent,
    };
  }
};
export const getFileType = (fileName: string): "audio" | "text" => {
  const audioExtensions = ["mp3", "wav", "mp4", "m4a"];
  const extension = fileName?.split(".").pop()?.toLowerCase() || "";
  return audioExtensions.includes(extension) ? "audio" : "text";
};

export const validationSchemaForm = Yup.object({
  files: Yup.array()
    .min(1, "At least one file is required")
    .required("Files are required"),
});

export const getFileStatus = (
  file: FileRecord,
  tab: string
): fileStatus | string => {
  if (
    file.isIngested &&
    file.isRead &&
    file.isUploaded &&
    file.requestId &&
    file.requestStatus &&
    tab !== "ingested"
  ) {
    return file.requestStatus || "N/A";
  }
  if (file.isIngested) {
    return "ingested";
  }
  if (file.isUploaded) {
    return "uploaded";
  }
  if (file.isRead) {
    return "read";
  }
  if (!file.isIngested || !file.isUploaded || !file.isRead) {
    if (!file.isRead) {
      return "failed_read";
    } else if (!file.isUploaded) {
      return "failed_upload";
    } else if (!file.isIngested) {
      return "failed_ingest";
    }
  }

  return "ingested";
};

export const convertToFileStatusItems = (
  files: FileRecord[],
  tabType: string
): FileStatusItem[] => {
  return files.map((file) => ({
    id: file.id.toString(),
    fileName: file.fileName,
    fileSize: Number.parseInt(file.fileSize),
    uploadDate: file.uploadedAt,
    ingestionDate: file.isIngested ? file.uploadedAt : undefined,
    status: getFileStatus(file, tabType),
    fileType: file.fileType,
    errorMessage:
      !file.isUploaded && !file.isIngested ? "Upload failed" : undefined,
  }));
};


export const formatDate = (dateString: string) => {
  const date = new Date(dateString);

  // Date in dd/mm/yy
  const formattedDate = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  });
  const day = date.toLocaleDateString("en-GB", {
    day: "2-digit"
  });

  // Time in hh:mm (24-hour format)
  const formattedTime = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false // set to true if you want AM/PM
  });

  const monthName = date.toLocaleDateString("en-GB", {
    month: "short"
  });
  const month = date.toLocaleDateString("en-GB", {
    month: "2-digit"
  });

  const year = date.toLocaleDateString("en-GB", {
    year: "numeric"
  });

  return { formattedDate, formattedTime, month, year, monthName, day };
};