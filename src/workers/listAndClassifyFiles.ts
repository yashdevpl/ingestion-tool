import axios from "axios";
import dotenv from "dotenv";
import * as fs from "fs";
import mime from "mime";
import pLimit from "p-limit";
import * as path from "path";
import workerpool from "workerpool";
import * as Yup from "yup";
import { createApiMetadata, parseCallLogFile } from "../utils/conversion";
dotenv.config();

export function getFileType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();

  if ([".txt", ".log", ".csv", ".json"].includes(ext)) return "text";
  if ([".mp3", ".wav", ".aac", ".ogg"].includes(ext)) return "audio";
  if ([".jpg", ".png", ".gif", ".webp"].includes(ext)) return "image";
  return "unknown";
}

const createMetadataValidationSchema = (fileType: "audio" | "text") => {
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

const validateMetadata = async (
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

const FILE_CONCURRENCY = 50;
const limit = pLimit(FILE_CONCURRENCY);
export const createFileDetails = async (
  file: any,
  filePath: string,
  contextId: number
) => {
  try {
    const body = {
      fileName: file.name || "unknown",
      originalName: file.name || "unknown",
      filePath: filePath || "unknown",
      fileSize: file.size || "0",
      fileType: file.type || "unknown",
      mimeType: file.mimeType || mime.getType(file.path) || "unknown",
      type: getFileType(filePath),
      contextId,
      isRead: true,
    };

    const fileDetails = await axios.post(
      `${process.env.VITE_WEB_APP_PROXY_URL}/file-uploads`,
      body
    );
    if (fileDetails.status) {
      return fileDetails.data;
    }
  } catch (error) {
    console.log(error);
  }
};
export const listAndClassifyFiles = async (
  dirPath: string,
  contextId: number
): Promise<{
  allFiles: any[];
  smsFiles: any[];
  audioFiles: any[];
  audioCriFiles: any[];
  audioMetadataFiles: any[];
  validFiles: any[];
  validationErrors: any[];
}> => {
  const filenames = await fs.promises.readdir(dirPath);
  const results: any[] = [];
  const smsFiles: any[] = [];
  const audioFiles: any[] = [];
  const audioCriFiles: any[] = [];

  await Promise.all(
    filenames.map((file: any) =>
      limit(async () => {
        const fullPath = path.join(dirPath, file);
        const stat = await fs.promises.stat(fullPath);
        let metaData: any = null;

        if (stat.isDirectory()) {
          const subResults = await listAndClassifyFiles(fullPath, contextId);
          results.push(...subResults.allFiles);
          smsFiles.push(...subResults.smsFiles);
          audioFiles.push(...subResults.audioFiles);
          audioCriFiles.push(...subResults.audioCriFiles);
          // Don't merge validation errors here, handle them at the top level
        } else {
          const type = getFileType(fullPath);

          if (type === "text") {
            try {
              const criText = await fs.promises.readFile(fullPath, "utf8");
              metaData = parseCallLogFile(criText, file);
            } catch (err) {
              console.warn(`Failed to parse ${fullPath}`, err);
            }
          }

          const fileData = {
            name: file,
            path: fullPath,
            isDirectory: false,
            size: stat.size,
            type,
          };

          let fileDetails: any = null;
          if (
            (metaData != null &&
              metaData?.data?.callType?.toUpperCase() === "SMS") ||
            type === "audio"
          ) {
            fileDetails = await createFileDetails(
              fileData,
              fullPath,
              contextId
            );
          }

          const enriched = {
            fileId: fileDetails?.id ?? 0,
            ...fileData,
            metaDataRaw: metaData,
            metaData: metaData
              ? { ...createApiMetadata(metaData?.data) }
              : null,
          };

          results.push(enriched);

          if (metaData?.data?.callType?.toUpperCase() === "SMS") {
            const fileBuffer = await fs.promises.readFile(fullPath);
            smsFiles.push({ ...enriched, fileBuffer });
          } else if (metaData?.data?.callType?.toUpperCase() === "VOICE") {
            audioCriFiles.push(enriched); // text CRI Voice metadata
          } else if (type === "audio") {
            const fileBuffer = await fs.promises.readFile(fullPath);
            audioFiles.push({ ...enriched, fileBuffer });
          }
        }
      })
    )
  );

  // Match audio files with CRI Voice metaData
  const audioMetadataFiles = audioFiles.map((file) => {
    const matched = audioCriFiles.find(
      (item) => item?.metaDataRaw?.data?.fileName === file.name
    );
    return {
      ...file,
      metaData: matched ? matched.metaData : null,
      fileBuffer: file.fileBuffer, // ✅ preserve fileBuffer
    };
  });

  // Validate metadata for all files and filter valid ones
  const validationErrors: any[] = [];
  const validSmsFiles: any[] = [];
  const validAudioFiles: any[] = [];

  // Validate SMS files
  for (const smsFile of smsFiles) {
    if (smsFile.metaData) {
      const validation = await validateMetadata(
        smsFile.metaData,
        "text",
        smsFile.name
      );
      if (!validation.isValid) {
        validationErrors.push(validation);
      } else {
        validSmsFiles.push(smsFile);
      }
    } else {
      // If no metadata, add to validation errors
      validationErrors.push({
        fileName: smsFile.name,
        fileType: "text",
        errors: ["No metadata found for SMS file"],
        isValid: false
      });
    }
  }

  // Validate audio files with their CRI files
  for (const audioFile of audioMetadataFiles) {
    if (audioFile.metaData) {
      const criFile = audioCriFiles.find(
        (item) => item?.metaDataRaw?.data?.fileName === audioFile.name
      );
      const validation = await validateMetadata(
        audioFile.metaData,
        "audio",
        audioFile.name,
        criFile?.name
      );
      if (!validation.isValid) {
        validationErrors.push(validation);
      } else {
        validAudioFiles.push(audioFile);
      }
    } else {
      // If no metadata, add to validation errors
      validationErrors.push({
        fileName: audioFile.name,
        fileType: "audio",
        errors: ["No metadata found for audio file"],
        isValid: false
      });
    }
  }

  // Only include files with valid metadata in validFiles
  const validFiles = [...validSmsFiles, ...validAudioFiles];

  return {
    allFiles: results,
    smsFiles,
    audioFiles,
    audioCriFiles, // ❌ remove if not required
    audioMetadataFiles,
    validFiles,
    validationErrors,
  };
};

workerpool.worker({
  listAndClassifyFiles,
});
