import axios from "axios";
import dotenv from "dotenv";
import * as fs from "fs";
import mime from "mime";
import pLimit from "p-limit";
import * as path from "path";
import workerpool from "workerpool";
import {
  createApiMetadata,
  parseCallLogFile,
  validateMetadata,
} from "../utils/conversion";
dotenv.config();

export function getFileType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();

  if ([".txt", ".log", ".csv", ".json"].includes(ext)) return "text";
  if ([".mp3", ".wav", ".aac", ".ogg"].includes(ext)) return "audio";
  if ([".jpg", ".png", ".gif", ".webp"].includes(ext)) return "image";
  return "unknown";
}

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

    console.log(
      `Creating file details for: ${file.name} (contextId: ${contextId})`
    );

    const fileDetails = await axios.post(
      `${process.env.VITE_WEB_APP_PROXY_URL}/file-uploads`,
      body
    );

    if (fileDetails.status === 200 || fileDetails.status === 201) {
      console.log(`Successfully created file details for: ${file.name}`);
      return fileDetails.data;
    } else {
      console.warn(
        `Unexpected status code ${fileDetails.status} for file: ${file.name}`
      );
      throw new Error(`API returned unexpected status: ${fileDetails.status}`);
    }
  } catch (error: any) {
    console.error(`Failed to create file details for ${file.name}:`, error);

    if (error.response) {
      const status = error.response.status;
      const statusText = error.response.statusText;
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        statusText;

      throw new Error(
        `API Error (${status}): ${errorMessage} for file: ${file.name}`
      );
    } else if (error.request) {
      throw new Error(
        `Network Error: Unable to connect to API server while processing file: ${file.name}`
      );
    } else {
      throw new Error(
        `Processing Error: ${error.message} for file: ${file.name}`
      );
    }
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
  error?: string;
}> => {
  try {
    console.log(
      `Starting file processing for directory: ${dirPath} (contextId: ${contextId})`
    );

    const filenames = await fs.promises.readdir(dirPath);
    const results: any[] = [];
    const smsFiles: any[] = [];
    const audioFiles: any[] = [];
    const audioCriFiles: any[] = [];

    // Step 1: Read and classify all files WITHOUT creating file details
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

            const enriched = {
              fileId: 0, // Will be set after validation and creation
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
              audioCriFiles.push(enriched);
            } else if (type === "audio") {
              const fileBuffer = await fs.promises.readFile(fullPath);
              audioFiles.push({ ...enriched, fileBuffer });
            }
          }
        })
      )
    );

    // Step 2: Match audio files with CRI Voice metadata
    const audioMetadataFiles = audioFiles.map((file) => {
      const matched = audioCriFiles.find(
        (item) => item?.metaDataRaw?.data?.fileName === file.name
      );
      return {
        ...file,
        metaData: matched ? matched.metaData : null,
        fileBuffer: file.fileBuffer,
      };
    });

    // Step 3: Validate metadata and collect validation errors
    const validationErrors: any[] = [];
    const validSmsFiles: any[] = [];
    const validAudioFiles: any[] = [];

    // Check for missing audio files referenced in CRI
    for (const criFile of audioCriFiles) {
      const audioFileName = criFile?.metaDataRaw?.data?.fileName;
      if (audioFileName) {
        const exists = audioFiles.some((file) => file.name === audioFileName);
        if (!exists) {
          validationErrors.push({
            fileName: audioFileName,
            fileType: "audio",
            errors: [
              `Audio file referenced in CRI (${criFile.name}) is missing`,
            ],
            isValid: false,
          });
        }
      }
    }

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
        validationErrors.push({
          fileName: smsFile.name,
          fileType: "text",
          errors: ["No metadata found for SMS file"],
          isValid: false,
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
        validationErrors.push({
          fileName: audioFile.name,
          fileType: "audio",
          errors: ["No metadata found for audio file"],
          isValid: false,
        });
      }
    }

    // Step 4: Create file details ONLY for valid files
    const validFilesWithDetails: any[] = [];
    const fileCreationErrors: any[] = [];

    console.log(
      `Creating file details for ${validSmsFiles.length + validAudioFiles.length} valid files...`
    );

    // Create file details for valid SMS files
    for (const smsFile of validSmsFiles) {
      try {
        const fileDetails = await createFileDetails(
          smsFile,
          smsFile.path,
          contextId
        );
        validFilesWithDetails.push({
          ...smsFile,
          fileId: fileDetails?.id ?? 0,
        });
      } catch (error: any) {
        console.error(
          `Failed to create file details for valid SMS file ${smsFile.name}:`,
          error
        );
        fileCreationErrors.push({
          fileName: smsFile.name,
          fileType: "text",
          errors: [`API Error while creating file record: ${error.message}`],
          isValid: false,
        });
      }
    }

    // Create file details for valid audio files
    for (const audioFile of validAudioFiles) {
      try {
        const fileDetails = await createFileDetails(
          audioFile,
          audioFile.path,
          contextId
        );
        validFilesWithDetails.push({
          ...audioFile,
          fileId: fileDetails?.id ?? 0,
        });
      } catch (error: any) {
        console.error(
          `Failed to create file details for valid audio file ${audioFile.name}:`,
          error
        );
        fileCreationErrors.push({
          fileName: audioFile.name,
          fileType: "audio",
          errors: [`API Error while creating file record: ${error.message}`],
          isValid: false,
        });
      }
    }

    // Merge file creation errors with validation errors
    const allErrors = [...validationErrors, ...fileCreationErrors];

    console.log(
      `File processing completed. Total files: ${results.length}, Valid files: ${validFilesWithDetails.length}, Errors: ${allErrors.length}`
    );

    return {
      allFiles: results,
      smsFiles,
      audioFiles,
      audioCriFiles,
      audioMetadataFiles,
      validFiles: validFilesWithDetails, // Only files with valid metadata AND successfully created file details
      validationErrors: allErrors,
    };
  } catch (error: any) {
    console.error(
      `Critical error in listAndClassifyFiles for directory ${dirPath}:`,
      error
    );

    return {
      allFiles: [],
      smsFiles: [],
      audioFiles: [],
      audioCriFiles: [],
      audioMetadataFiles: [],
      validFiles: [],
      validationErrors: [],
      error: `File processing failed: ${error.message}`,
    };
  }
};

workerpool.worker({
  listAndClassifyFiles,
});
