import fs from "fs";
import path from "path";
import axios from "axios";
import {
  createApiMetadata,
  getFileType,
  parseCallLogFile,
  validateMetadata,
} from "./conversion";
import { fileStatus } from "../components/upload-form/CompactFileItem";
import { FileRecord } from "../types/common";
import dotenv from "dotenv";
import { getBaseUrl } from "./helper-functions";
dotenv.config();
export const updateFileDetails = async (updateData: Partial<FileRecord>) => {
  try {
    const baseUrl = getBaseUrl();
    const { data, status } = await axios.put(
      `${baseUrl}/api/file-uploads/`,
      updateData
    );
    return status === 200 ? data : null;
  } catch (error) {
    console.error("Error updating file details:", error);
    return null; // don't throw, let caller decide
  }
};

export const retryFileUpload = async (
  fileId: string,
  fileName: string,
  status: fileStatus,
  dirPath: string
) => {
  try {
    const type = getFileType(fileName);
    const fullPath = path.join(dirPath, fileName);

    // Always load file buffer first
    let fileBuffer: Buffer;
    try {
      fileBuffer = await fs.promises.readFile(fullPath);
    } catch {
      return {
        uploadFile: null,
        validationErrors: [
          {
            fileName,
            fileType: type,
            errors: ["File not found or unreadable."],
            isValid: false,
          },
        ],
      };
    }

    let content: string | null = null;
    let criName: string | undefined;

    if (type === "audio") {
      criName = fileName.split("_")[0] + ".txt";
      const criFilePath = path.join(dirPath, criName);
      if (fs.existsSync(criFilePath)) {
        content = await fs.promises.readFile(criFilePath, "utf-8");
      }
    } else {
      content = fileBuffer.toString("utf-8"); // reuse buffer instead of re-reading
    }

    // Handle failed_read retry
    if (status === "failed_read") {
      const response = await updateFileDetails({
        id: Number(fileId),
        isRead: true,
      });

      if (!response) {
        return {
          uploadFile: null,
          validationErrors: [
            {
              fileName,
              fileType: type,
              errors: [
                "Failed to update file read status. Please check the file.",
              ],
              isValid: false,
            },
          ],
        };
      }
    }

    let metaData: any = null;
    const validationErrors: any[] = [];

    if (content) {
      const parsedData: any = parseCallLogFile(content, criName ?? fileName);
      metaData = createApiMetadata(parsedData.data);

      const validation = await validateMetadata(
        metaData,
        type,
        fileName,
        criName
      );

      if (!validation.isValid) {
        validationErrors.push(validation);
      }
    }

    return {
      uploadFile: {
        fileBuffer,
        fileId: Number(fileId),
        metaData,
        name: fileName,
        path: fullPath,
        type,
      },
      validationErrors,
    };
  } catch (error) {
    console.error("Error in retryFileUpload:", error);
    throw error;
  }
};
