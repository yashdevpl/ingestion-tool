import type { CallLogEntry, ParseResult } from "@/types/common";
import { CIR_EXPECTED_KEYS } from "./constants";

export const parseCallLogFile = (
  fileContent: string,
  fileName: string
): ParseResult => {
  const lines = fileContent.split("\n");
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
        const coords = value.split(",");
        if (coords.length >= 2) {
          data.latitudeA = coords[0].trim() || undefined;
          data.longitudeA = coords[1].trim() || undefined;
          foundKeys.add("latitudeA");
          foundKeys.add("longitudeA");
        }
        return;
      }

      if (key === "Latitude,Longitude B") {
        const coords = value.split(",");
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

  const [datePart, timePart] = dateVal.split(" ");
  const [day, month, year] = datePart.split("/").map(Number);

  const fullYear = year < 50 ? 2000 + year : 1900 + year;

  const [hours, minutes, seconds] = timePart?.split(":").map(Number) ?? [
    0, 0, 0,
  ];

  const d = new Date(fullYear, month - 1, day, hours, minutes, seconds);

  return !isNaN(d.getTime()) ? d.toISOString() : new Date(dateVal);
};
