// workers/fileRecordWorker.js
import workerpool from "workerpool";
import { getFileType, getValidISOStringFromCri } from "../utils/conversion";

export const createFileMetadataList = async (
  validFiles: any[],
  CRITextToObjList: any[]
) => {
  const newFileRecords = validFiles.map((file) => {
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
      type: getFileType(file?.name),
      duration: getFileType(file?.name) === "audio" ? "" : undefined,
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

  return newFileRecords;
};

workerpool.worker({
  createFileMetadataList,
});
