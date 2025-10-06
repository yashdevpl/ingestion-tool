import pLimit from "p-limit";
import { FileRecordMetadata, ParseResult } from "../types/common";
import {
  getFileType,
  getValidISOStringFromCri,
  parseCallLogFile,
} from "../utils/conversion";

const fs = require("fs");
const path = require("path");
const workerpool = require("workerpool");

const FILE_CONCURRENCY = 50; // adjust if needed
const limit = pLimit(FILE_CONCURRENCY);

// Function to read files from a directory
async function readFiles(dirPath: string) {
  const filenames = await fs.promises.readdir(dirPath);
  const files = await Promise.all(
    filenames.map((file: any) =>
      limit(async () => {
        const fullPath = path.join(dirPath, file);
        const stat = await fs.promises.stat(fullPath);
        return {
          name: file,
          path: fullPath,
          isDirectory: stat.isDirectory(),
          size: stat.size,
          type: stat.type,
        };
      })
    )
  );

  const txtFilesList = Array.from(files).filter(
    (file) => getFileType(file) === "text"
  );
  const audioFilesList = Array.from(files).filter(
    (file) => getFileType(file) === "audio"
  );
  const SMSCriFileList: File[] = [];

  // Parse CRI text files for metadata
  const CRITextToObjList: ParseResult[] = await Promise.all(
    txtFilesList.map((file) =>
      limit(async () => {
        const criText = await fs.promises.readFile(file.path, "utf8");
        const metaData = parseCallLogFile(criText, file.name);
        if (metaData.data?.callType === "SMS") SMSCriFileList.push(file);
        return { ...metaData };
      })
    )
  );

  const validFiles = Array.from([...audioFilesList, ...SMSCriFileList]);

  const newFileRecords: FileRecordMetadata[] = validFiles.map((file) => {
    const metaData =
      CRITextToObjList.find((obj) => obj.data.fileName === file.name)?.data ||
      CRITextToObjList.find((obj) => obj.data.criFileName === file.name)
        ?.data ||
      {};

    return {
      isReferenceFound: CRITextToObjList.some(
        (obj) =>
          obj.data.fileName === file.name || obj.data.criFileName === file.name
      ),
      id: Math.random().toString(36).substr(2, 9),
      file,
      type: getFileType(file),
      duration: getFileType(file) === "audio" ? "" : undefined,
      metadata: {
        targetNumber: metaData.targetNumber || "",
        trackingCode: metaData.targetName || "",
        caller: metaData.callingNumber || "",
        callee: metaData.calledNumber || "",
        direction: metaData.direction?.toLocaleLowerCase(),
        startTime:
          metaData.startTime &&
          !isNaN(
            new Date(
              getValidISOStringFromCri(metaData.startTime) || ""
            ).getTime()
          )
            ? new Date(getValidISOStringFromCri(metaData.startTime) || "")
            : undefined,
        endTime:
          metaData.endTime &&
          !isNaN(
            new Date(getValidISOStringFromCri(metaData.endTime) || "").getTime()
          )
            ? new Date(getValidISOStringFromCri(metaData.endTime) || "")
            : undefined,
        target_code: metaData.targetName,
        call_start: getValidISOStringFromCri(metaData?.startTime),
        call_end: getValidISOStringFromCri(metaData?.endTime),
        imei: metaData.imeiA,
        imsi: metaData.imsiA,
        startCellId: metaData.cellIdA,
        endCellId: metaData.cellIdB,
        startCellAddress: metaData.cellAddressA,
        endCellAddress: metaData.cellAddressB,
        startCellLatitude: metaData.latitudeA,
        endCellLatitude: metaData.latitudeB,
        startCellLongitude: metaData.longitudeA,
        endCellLongitude: metaData.longitudeB,
        message: metaData.messageContent,
      },
    };
  });
  return { validFiles, newFileRecords };
}

// expose functions
workerpool.worker({
  readFiles,
});
