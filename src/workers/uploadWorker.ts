import workerpool from "workerpool";
import { ENV } from "../utils/constants";
import dotenv from "dotenv";
dotenv.config();

interface FileMetadata {
  targetNumber: string;
  target_code?: string;
  imei?: string;
  imsi?: string;
  call_start?: string;
  call_end?: string;
  direction?: string;
  caller?: string;
  callee?: string;
  cell_id_start?: string;
  cell_id_end?: string;
  cell_address_start?: string;
  cell_address_end?: string;
  latitude_longitude_start?: string;
  latitude_longitude_end?: string;
  sender?: string;
  receiver?: string;
  sms_datetime?: string;
  message?: string;
  latitude?: string;
  longitude?: string;
  start_cell_id?: string;
  end_cell_id?: string;
}

export interface UploadFile {
  fileId: number;
  path: string;
  name: string;
  type: string;
  metaData: FileMetadata;
  fileBuffer: ArrayBuffer;
}

interface BatchUploadResult {
  success: boolean;
  filesProcessed?: number;
  fileIds: number[];
  error?: string;
  apiEndpoint?: "call" | "sms";
  fileType?: "audio" | "text";
}

const BATCH_SIZE = 100; // Number of files to upload in each batch

async function uploadBatch(
  files: UploadFile[],
  url: string,
  apiType: "call" | "sms"
): Promise<BatchUploadResult> {
  try {
    const formData = new FormData();
    formData.append("file_count", files.length.toString());

    const processedFiles = [];
    const errors = [];

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      try {
        // Create file from ArrayBuffer
        const blob = new Blob([new Uint8Array(file.fileBuffer)]);
        const uploadFile = new File([blob], file.name, {
          type: "application/octet-stream",
        });

        // Make sure we have the required fields with proper defaults
        const metadata = {
          ...file.metaData,
          fileId: file.fileId,
          targetNumber: file.metaData.targetNumber || "",
          direction: file.metaData.direction || "",
          target_code: file.metaData.target_code || "",
        };

        // Validate required fields
        if (!metadata.targetNumber) {
          throw new Error(
            `Missing required field 'targetNumber' for file ${file.name}`
          );
        }

        // Add file and validated metadata to form
        formData.append(`file_${index}`, uploadFile);
        formData.append(`metadata_${index}`, JSON.stringify(metadata));
        processedFiles.push(file.fileId);
      } catch (error: any) {
        errors.push(`Error processing file ${file.name}: ${error.message}`);
      }
    }

    if (processedFiles.length === 0) {
      return {
        success: false,
        error: errors.join("; "),
        fileIds: files.map((f) => f.fileId),
        apiEndpoint: apiType,
        fileType: files[0]?.type as "audio" | "text",
      };
    }

    // Log the form data before sending
    console.log("FormData content:", {
      fileCount: files.length,
      processedFiles: processedFiles.length,
      errors: errors,
      apiType: apiType,
    });

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(
        `${apiType?.toUpperCase()} API failed with status ${response.status}`
      );
    }

    const result = await response.json();
    return {
      success: true,
      filesProcessed: processedFiles.length,
      fileIds: processedFiles,
      error: errors.length > 0 ? errors.join("; ") : undefined,
      apiEndpoint: apiType,
      fileType: files[0]?.type as "audio" | "text",
    };
  } catch (error: any) {
    console.error(`${apiType?.toUpperCase()} API upload error:`, error);
    return {
      success: false,
      error: error?.message || `${apiType?.toUpperCase()} API upload failed`,
      fileIds: files.map((f) => f.fileId),
      apiEndpoint: apiType,
      fileType: files[0]?.type as "audio" | "text",
    };
  }
}

export async function uploadFiles(files: UploadFile[]) {
  const audioFiles = files.filter((f) => f.type === "audio");
  const smsFiles = files.filter((f) => f.type === "text");

  const results = {
    successful: [] as number[],
    failed: [] as any[], // Changed to include API endpoint info
    total: files.length,
    processedAudio: 0,
    processedSMS: 0,
    errors: [] as string[],
  };

  // Process audio files in batches
  for (let i = 0; i < audioFiles.length; i += BATCH_SIZE) {
    const batch = audioFiles.slice(i, i + BATCH_SIZE);
    const result = await uploadBatch(
      batch,
      `${process.env.WEB_APP_PROXY_URL}/api/ingestion`,
      "call"
    );

    if (result.success) {
      results.successful.push(...result.fileIds);
      results.processedAudio += result.filesProcessed || 0;
    } else {
      // Include API endpoint info with failed files
      const failedFilesWithContext = batch.map((file) => ({
        fileId: file.fileId,
        fileName: file.name,
        type: file.type,
        error: result.error,
        apiEndpoint: result.apiEndpoint,
        fileType: result.fileType,
      }));
      results.failed.push(...failedFilesWithContext);
      if (result.error) results.errors.push(result.error);
    }

    // Report progress after each batch
    const progress = {
      audioProgress: Math.round(((i + batch.length) / audioFiles.length) * 100),
      smsProgress: 0,
      currentBatch: i / BATCH_SIZE + 1,
      totalBatches: Math.ceil(audioFiles.length / BATCH_SIZE),
    };
    workerpool.workerEmit({ type: "progress", data: progress });
  }

  // Process SMS files in batches
  for (let i = 0; i < smsFiles.length; i += BATCH_SIZE) {
    const batch = smsFiles.slice(i, i + BATCH_SIZE);
    const result = await uploadBatch(
      batch,
      `${process.env.WEB_APP_PROXY_URL}/api/ingestion/sms`,
      "sms"
    );

    if (result.success) {
      results.successful.push(...result.fileIds);
      results.processedSMS += result.filesProcessed || 0;
    } else {
      // Include API endpoint info with failed files
      const failedFilesWithContext = batch.map((file) => ({
        fileId: file.fileId,
        fileName: file.name,
        type: file.type,
        error: result.error,
        apiEndpoint: result.apiEndpoint,
        fileType: result.fileType,
      }));
      results.failed.push(...failedFilesWithContext);
      if (result.error) results.errors.push(result.error);
    }

    // Report progress after each batch
    const progress = {
      audioProgress: 100,
      smsProgress: Math.round(((i + batch.length) / smsFiles.length) * 100),
      currentBatch: i / BATCH_SIZE + 1,
      totalBatches: Math.ceil(smsFiles.length / BATCH_SIZE),
    };
    workerpool.workerEmit({ type: "progress", data: progress });
  }

  return results;
}

// Create the worker
workerpool.worker({
  uploadFiles,
});
