import axios from "axios";
import { useFormik } from "formik";
import { Upload } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

import { usePolling } from "../hooks/use-polling";
import { useToast } from "../hooks/use-toast";
import { Label } from "./ui/label";

import { useFiltersContext } from "../context/filters-context";
import { useUploadStatus } from "../context/upload-status-context";
import type { FileRecord, ParseResult } from "../types/common";
import {
  createMetadataValidationSchema,
  getFileType,
  getValidISOStringFromCri,
  parseCallLogFile,
  validationSchemaForm,
} from "../utils/conversion";
import { Button } from "./ui/button";
import { FileItem } from "./upload-form/FileItems";

declare global {
  interface Window {
    electronAPI: {
      selectDirectory: () => Promise<string | null>;
      listFiles: (
        dirPath: string
      ) => Promise<{ validFiles: FileRecord[]; newFileRecords: FileRecord[] }>;
    };
  }
}

interface PollingData {
  status: string;
  requestId?: string;
  trackingCode?: string;
  trackedNumber?: string;
}

// Main Component
const UploadRecordForm: React.FC = () => {
  const [fileRecords, setFileRecords] = useState<FileRecord[]>([]);
  const [uploadedFilesList, setUploadedFilesList] = useState<FileRecord[]>([]);
  const { getFilteredTypes } = useFiltersContext();
  const callsDirectionStatus = getFilteredTypes("call_direction_type");
  const [directory, setDirPath] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, Record<string, string>>
  >({});
  const { toast } = useToast();

  const { startPolling, stopPolling } = usePolling<PollingData>();
  const {
    uploadStatus,
    updateUploadStatus,
    resetUploadStatus,
    stopPolling: stopPollingStatus,
  } = useUploadStatus();

  const createApiMetadata = (fileRecord: FileRecord) => {
    const metadata = fileRecord.metadata;
    // Helper to check valid date
    const getValidISOString = (dateVal: any) => {
      if (!dateVal) return undefined;
      const d = new Date(dateVal);
      return !isNaN(d.getTime()) ? d.toISOString() : undefined;
    };

    if (fileRecord.type === "audio") {
      // Audio file metadata structure
      return {
        targetNumber: metadata?.targetNumber,
        target_code: metadata?.trackingCode,
        call_start: getValidISOString(metadata?.startTime),
        call_end: getValidISOString(metadata?.endTime),
        direction: metadata?.direction,
        caller: metadata?.caller,
        callee: metadata?.callee,
        imei: metadata?.imei,
        imsi: metadata?.imsi,
        cell_id_start: metadata?.startCellId,
        cell_id_end: metadata?.endCellId,

        cell_address_start: metadata?.startCellAddress,
        cell_address_end: metadata?.endCellAddress,

        latitude_longitude_start: metadata?.startCellLatitude
          ? `${metadata.startCellLatitude},${metadata.startCellLongitude}`
          : undefined,
        latitude_longitude_end: metadata?.endCellLatitude
          ? `${metadata.endCellLatitude},${metadata.endCellLongitude}`
          : undefined,
      };
    } else {
      // SMS/Text file metadata structure
      return {
        targetNumber: metadata?.targetNumber,
        target_code: metadata?.trackingCode,
        sender: metadata?.caller,
        receiver: metadata?.callee,
        sms_datetime: getValidISOString(metadata?.startTime),
        imei: metadata?.imei,
        imsi: metadata?.imsi,
        direction: metadata?.direction,
        latitude: metadata?.startCellLatitude,
        longitude: metadata?.startCellLongitude,
        message: metadata?.message,
      };
    }
  };
  const formik = useFormik({
    initialValues: {
      trackingNumber: "",
      files: [] as File[],
    },
    validationSchema: validationSchemaForm,
    onSubmit: async (values) => {
      const errors: Record<string, Record<string, string>> = {};
      let hasErrors = false;

      // Validate all file metadata
      for (const fileRecord of fileRecords) {
        try {
          if (fileRecord.isReferenceFound) {
            const validationSchema = createMetadataValidationSchema(
              fileRecord.type || "audio"
            );
            await validationSchema.validate(fileRecord.metadata, {
              abortEarly: false,
            });
          }
        } catch (validationError: any) {
          errors[fileRecord.id] = {};
          validationError.inner.forEach((error: any) => {
            errors[fileRecord.id][error.path] = error.message;
          });
          hasErrors = true;
        }
      }

      setValidationErrors(errors);

      if (hasErrors) {
        toast({
          title: "Please fill required fields",
          description: "Please fill in all required fields for each file.",
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);

      try {
        // Separate files by type
        const audioFiles = fileRecords.filter(
          (item) => item.type === "audio" && item.isReferenceFound
        );
        const smsFiles = fileRecords.filter(
          (item) => item.type !== "audio" && item.isReferenceFound
        );

        const responses = [];

        // Process audio files if any exist
        if (audioFiles.length > 0) {
          const formDataCalls = new FormData();
          formDataCalls.append("target_number", values.trackingNumber);

          audioFiles.forEach((fileRecord, index) => {
            formDataCalls.append(`file_${index}`, fileRecord.file);
            const apiMetadata = createApiMetadata(fileRecord);
            formDataCalls.append(
              `metadata_${index}`,
              JSON.stringify(apiMetadata)
            );
          });

          formDataCalls.append("file_count", audioFiles.length.toString());

          const config = { headers: { "Content-Type": "multipart/form-data" } };

          try {
            const callsResponse = await axios.post(
              "http://192.168.1.12:3000/api/ingestion",
              formDataCalls,
              config
            );
            responses.push({
              type: "audio",
              response: callsResponse,
              files: audioFiles,
            });
          } catch (error: any) {
            console.error("Audio files upload error:", error);
            throw new Error(
              error?.response?.data?.error?.message
                ? error.response.data.error.message
                : "Failed to upload audio files"
            );
          }
        }

        // Process SMS files if any exist
        if (smsFiles.length > 0) {
          const formDataSms = new FormData();
          formDataSms.append("target_number", values.trackingNumber);

          smsFiles.forEach((fileRecord, index) => {
            formDataSms.append(`file_${index}`, fileRecord.file);
            const apiMetadata = createApiMetadata(fileRecord);
            formDataSms.append(
              `metadata_${index}`,
              JSON.stringify(apiMetadata)
            );
          });

          formDataSms.append("file_count", smsFiles.length.toString());

          const config = { headers: { "Content-Type": "multipart/form-data" } };

          try {
            const smsResponse = await axios.post(
              "http://192.168.1.12:3000/api/ingestion/sms",
              formDataSms,
              config
            );
            responses.push({
              type: "sms",
              response: smsResponse,
              files: smsFiles,
            });
          } catch (error) {
            console.error("SMS files upload error:", error);
            throw new Error("Failed to upload SMS files");
          }
        }

        // Process responses and update file records
        const allRequestIds: any[] = [];

        for (const { type, response, files } of responses) {
          if (!response?.data) {
            throw new Error(`Invalid response for ${type} files`);
          }

          const result = response.data;

          if (result.stored?.success && result.stored?.data?.requestIds) {
            const requestIds = result.stored.data.requestIds;

            // Map request IDs back to the original files
            files.forEach((fileRecord, index) => {
              const requestData = requestIds[index];
              if (requestData) {
                allRequestIds.push({
                  fileId: fileRecord.id,
                  requestId: requestData.requestId,
                  trackingCode: requestData.trackingCode,
                  fileType: type,
                  fileName: fileRecord.file.name,
                });
              }
            });
          } else {
            throw new Error(
              `Upload failed for ${type} files: ${
                result.message || "Unknown error"
              }`
            );
          }
        }

        // Helper function to determine if polling should continue based on file type and status
        const shouldContinuePolling = (status: string, fileType: string) => {
          console.log(
            `Checking polling continuation - Status: ${status}, FileType: ${fileType}`
          );

          if (fileType === "audio") {
            // Audio files continue until keyword detection is complete or fails
            const audioFinalStates = [
              "KEYWORD_DETECTION_COMPLETE",
              "FAILED",
              "FILE_UPLOAD_FAILED",
              "PROCESSING_FAILED",
              "KEYWORD_DETECTION_FAILED",
            ];
            return !audioFinalStates.includes(status) && status !== "";
          } else {
            // SMS files stop at FILE_UPLOADED or any failure state
            const smsFinalStates = [
              "COMPLETED",
              "FAILED",
              "FILE_UPLOAD_FAILED",
            ];
            return !smsFinalStates.includes(status) && status !== "";
          }
        };

        // Update file records with request IDs and start polling
        if (allRequestIds.length > 0) {
          setFileRecords((prev) =>
            prev.map((fileRecord) => {
              const requestInfo = allRequestIds.find(
                (req) => req.fileId === fileRecord.id
              );

              if (requestInfo) {
                const updatedRecord = {
                  ...fileRecord,
                  requestId: requestInfo.requestId,
                  trackingCode: requestInfo.trackingCode,
                  status: "processing" as const,
                  progress: 0,
                };

                // Start polling for this file
                startPolling({
                  key: requestInfo.requestId,
                  pollingInterval: 3000,
                  maxRetries: 5,
                  pollingFunction: async () => {
                    try {
                      const endpoint =
                        requestInfo?.fileType === "sms"
                          ? `http://192.168.1.12:3000/api/ingestion/status/${requestInfo.requestId}/sms`
                          : `http://192.168.1.12:3000/api/ingestion/status/${requestInfo.requestId}`;

                      const statusResponse = await axios.get(endpoint);
                      console.log(
                        `Status response for ${requestInfo.fileType}:`,
                        statusResponse.data
                      );
                      return statusResponse.data;
                    } catch (error) {
                      console.error(
                        `Polling error for ${requestInfo.requestId}:`,
                        error
                      );
                      throw error;
                    }
                  },
                  shouldContinue: (data) => {
                    console.log(
                      `Checking polling continuation - Status: ${data.status}, FileType: ${requestInfo.fileType}`
                    );
                    const shouldContinue = shouldContinuePolling(
                      data.status,
                      requestInfo.fileType
                    );

                    // Calculate progress based on API status
                    const progress =
                      data.status === "FILE_UPLOADED"
                        ? 20
                        : data.status === "PROCESSING_STARTED"
                          ? 40
                          : data.status === "PROCESSING_COMPLETE"
                            ? 60
                            : data.status === "KEYWORD_DETECTION_STARTED"
                              ? 80
                              : data.status === "KEYWORD_DETECTION_COMPLETE" ||
                                  data.status === "COMPLETED"
                                ? 100
                                : data.status.includes("FAILED")
                                  ? 100
                                  : 25;

                    // Update status with the exact API status
                    updateUploadStatus(requestInfo.requestId, {
                      status: data.status,
                      progress,
                      fileName: requestInfo.fileName,
                      error: data.status.includes("FAILED")
                        ? "message" in data
                          ? (data.message as string)
                          : "Upload failed"
                        : undefined,
                    });

                    return shouldContinue;
                  },
                  onSuccess: (data) => {
                    console.log(
                      `Polling success for ${requestInfo.fileType}:`,
                      data
                    );

                    // Stop polling for final states
                    if (
                      !shouldContinuePolling(data.status, requestInfo.fileType)
                    ) {
                      console.log(
                        `Stopping polling for ${requestInfo.fileType} - Final status: ${data.status}`
                      );
                      stopPolling(requestInfo.requestId);
                    }
                  },
                  onError: (error) => {
                    console.error("Polling error:", error);

                    updateUploadStatus(requestInfo.requestId, {
                      status: "error",
                      progress: 100,
                      error:
                        error instanceof Error
                          ? error.message
                          : "Unknown error occurred",
                    });
                  },
                });

                return updatedRecord;
              }
              return fileRecord;
            })
          );

          toast({
            title: "Success",
            description: `Files uploaded successfully! Processing ${audioFiles.length} audio files and ${smsFiles.length} SMS files...`,
          });
        } else {
          throw new Error("No request IDs received from server");
        }
      } catch (error: any) {
        console.error("Upload error:", error);

        let errorMessage =
          "There was an error uploading your files. Please try again.";

        if (error.message) {
          errorMessage = error.message;
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }

        toast({
          title: "Upload Failed",
          description: errorMessage,
          variant: "destructive",
        });

        // Reset any failed states
        setFileRecords((prev) =>
          prev.map((record) => ({
            ...record,
            status: "failed" as const,
            progress: 0,
            requestId: undefined,
          }))
        );
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const validateFileMetadata = async (fileRecords: FileRecord[]) => {
    const errors: Record<string, Record<string, string>> = {};
    let hasErrors = false;

    // Validate only files that have isReferenceFound = true
    for (const fileRecord of fileRecords) {
      // Skip validation for files without reference
      if (!fileRecord.isReferenceFound) {
        continue;
      }

      try {
        const validationSchema = createMetadataValidationSchema(
          fileRecord.type || "audio"
        );
        await validationSchema.validate(fileRecord.metadata, {
          abortEarly: false,
        });
      } catch (validationError: any) {
        errors[fileRecord.id] = {};
        validationError.inner.forEach((error: any) => {
          errors[fileRecord.id][error.path] = error.message;
        });
        hasErrors = true;
      }
    }

    return { errors, hasErrors };
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    // Filter files by type
    const txtFilesList = Array.from(files).filter(
      (file) => getFileType(file) === "text"
    );
    const audioFilesList = Array.from(files).filter(
      (file) => getFileType(file) === "audio"
    );
    const SMSCriFileList: File[] = [];

    // Parse CRI text files for metadata
    const CRITextToObjList: ParseResult[] = await Promise.all(
      txtFilesList.map(async (file) => {
        const criText = await file.text();
        const metaData = parseCallLogFile(criText, file.name);
        if (metaData.data?.callType && metaData.data.callType === "SMS") {
          SMSCriFileList.push(file);
        }
        return { ...metaData };
      })
    );

    const validFiles = Array.from([...audioFilesList, ...SMSCriFileList]);

    const newFileRecords: FileRecord[] = validFiles.map((file) => {
      const metaData =
        CRITextToObjList.find((obj) => obj.data.fileName === file.name)?.data ||
        CRITextToObjList.find((obj) => obj.data.criFileName === file.name)
          ?.data ||
        {};

      return {
        isReferenceFound: CRITextToObjList.some(
          (obj) =>
            obj.data.fileName === file.name ||
            obj.data.criFileName === file.name
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
          direction:
            callsDirectionStatus.find(
              (status) =>
                status.value.toLowerCase() ===
                metaData.direction?.toLocaleLowerCase()
            )?.uuid || "",
          startTime:
            metaData.startTime && !isNaN(new Date(metaData.startTime).getTime())
              ? new Date(getValidISOStringFromCri(metaData.startTime) || "")
              : undefined,
          endTime:
            metaData.endTime && !isNaN(new Date(metaData.endTime).getTime())
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
    // Update file records and validate immediately
    setFileRecords((prev) => {
      const updatedRecords = [...prev, ...newFileRecords];

      // Validate metadata for all files asynchronously
      validateFileMetadata(updatedRecords).then(({ errors, hasErrors }) => {
        setValidationErrors(errors);
        if (hasErrors) {
          toast({
            title: "Missing Required Information",
            description:
              "Please fill in all required fields for the uploaded files.",
            variant: "destructive",
          });
        }
      });

      return updatedRecords;
    });

    formik.setFieldValue("files", [...formik.values.files, ...validFiles]);
  };

  const handleFileInput = async () => {
    const path = await window.electronAPI.selectDirectory()
    if (path) {
      setDirPath(path);
      const fileList = await window.electronAPI.listFiles(path);
      console.log({ fileList }, "__fileList");
      setFileRecords((prev) => {
        const updatedRecords = [...prev, ...fileList.newFileRecords];

        // Validate metadata for all files asynchronously
        validateFileMetadata(updatedRecords).then(({ errors, hasErrors }) => {
          setValidationErrors(errors);
          if (hasErrors) {
            toast({
              title: "Missing Required Information",
              description:
                "Please fill in all required fields for the uploaded files.",
              variant: "destructive",
            });
          }
        });

        return updatedRecords;
      });

      formik.setFieldValue("files", [
        ...formik.values.files,
        ...fileList.validFiles,
      ]); // handleFileUpload(fileList);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };
  const deleteFile = (id: string) => {
    setFileRecords((prev) => {
      const updated = prev.filter((record) => record.id !== id);
      const updatedFiles = updated.map((record) => record.file);
      formik.setFieldValue("files", updatedFiles);

      // Stop polling for deleted file and clean up upload status
      const deletedRecord = prev.find((record) => record.id === id);
      if (deletedRecord?.requestId) {
        stopPolling(deletedRecord.requestId);
        resetUploadStatus(deletedRecord.requestId);
      }

      return updated;
    });

    // Clear validation errors for deleted file
    setValidationErrors((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const updateFileMetadata = (
    id: string,
    metadata: any,
    isReferenceFound: boolean
  ) => {
    let isMetaDataValid = false;
    if (!isReferenceFound) {
      const validateFileMetadata = createMetadataValidationSchema("audio");
      isMetaDataValid = validateFileMetadata.isValidSync(metadata);
    }
    setFileRecords((prev) =>
      prev.map((record) =>
        record.id === id
          ? {
              ...record,
              isReferenceFound: !record.isReferenceFound
                ? isMetaDataValid
                : record.isReferenceFound,
              metadata,
            }
          : record
      )
    );

    // Clear validation errors for this file when metadata is updated
    setValidationErrors((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  // Reset form and clear all states
  const resetForm = () => {
    // Reset formik form state
    formik.resetForm();
    // Clear all file-related states
    setFileRecords([]);
    setUploadedFilesList([]); // Clear uploaded files list
    setValidationErrors({});

    // Stop polling and clear upload status for all files
    const allFiles = [...fileRecords, ...uploadedFilesList];
    allFiles.forEach((record) => {
      if (record.requestId) {
        stopPolling(record.requestId);
        resetUploadStatus(record.requestId);
      }
    });

    // Reset file input elements
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input) => {
      const fileInput = input as HTMLInputElement;
      fileInput.value = "";
    });
  };
  // Move completed files to uploadedFilesList and update fileRecords
  const updateFileRecordList = useCallback(() => {
    try {
      // First, check if we have any status updates to process
      const hasCompletedFiles = fileRecords.some((record) => {
        const status = record.requestId
          ? uploadStatus[record.requestId]?.status
          : null;
        return (
          status === "KEYWORD_DETECTION_COMPLETE" || status === "COMPLETED"
        );
      });

      if (!hasCompletedFiles) return;

      // Process all files in a single batch
      const { completedFiles, remainingFiles } = fileRecords.reduce(
        (acc, record) => {
          const status = record.requestId
            ? uploadStatus[record.requestId]?.status
            : null;
          const isCompleted =
            status &&
            ((record.type === "audio" &&
              status === "KEYWORD_DETECTION_COMPLETE") ||
              (record.type === "text" && status === "COMPLETED"));

          if (isCompleted) {
            acc.completedFiles.push(record);
          } else {
            acc.remainingFiles.push(record);
          }

          return acc;
        },
        {
          completedFiles: [] as FileRecord[],
          remainingFiles: [] as FileRecord[],
        }
      );

      // Batch update both states if we have changes
      if (completedFiles.length > 0) {
        // Update uploaded files list, avoiding duplicates
        setUploadedFilesList((prev) => {
          const uniqueNewFiles = completedFiles.filter(
            (file) => !prev.some((existing) => existing.id === file.id)
          );
          return [...prev, ...uniqueNewFiles];
        });

        // Update current files list
        setFileRecords(remainingFiles);

        console.log("Batch Update Summary:", {
          completedFiles: completedFiles.map((f) => f.file.name),
          remainingFiles: remainingFiles.map((f) => f.file.name),
        });
      }
    } catch (error) {
      console.error("Error updating file lists:", error);
    }
  }, [JSON.stringify(fileRecords), uploadStatus]); // Only recreate when these dependencies change
  // Process file status updates and move completed files to uploaded list
  useEffect(() => {
    // Only run if we have both files and status updates
    if (fileRecords.length > 0 && Object.keys(uploadStatus).length > 0) {
      // Debounce the update to prevent multiple rapid updates
      const timeoutId = setTimeout(() => {
        updateFileRecordList();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [updateFileRecordList, JSON.stringify(fileRecords)]);

  useEffect(() => {
    if (stopPollingStatus) {
      resetForm();
    }
  }, [stopPollingStatus]);
  return (
    <>
      <div className="flex max-h-[100vh] w-full  flex-col overflow-hidden p-0">
        {/* Fixed Header */}
        <div className="flex-shrink-0 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <div className="flex items-center gap-2.5 rounded-full border-2 border-dashed border-slate-200 bg-slate-100 p-2.5 sm:p-3.5">
                <Upload className="h-4 w-4 text-slate-600 sm:h-5 sm:w-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-sm font-semibold text-slate-900 sm:text-base">
                  Upload Files
                </div>
                <p className="text-xs text-neutral-500 sm:text-sm">
                  Add files for a target profile
                </p>
              </div>
            </div>
            {/* <button
              type="button"
              className="flex-shrink-0 rounded-full bg-slate-100 p-1.5 hover:bg-slate-200"
            >
              <X className="h-4 w-4 text-slate-600" />
            </button> */}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-0.5">
                  <Label className="text-sm font-medium text-slate-900 sm:text-base">
                    Add Files <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-neutral-500 sm:text-sm">
                    Browse files for selected tracking number
                  </p>
                </div>

                <div
                  className={`flex items-center justify-center gap-2.5 rounded-lg border-2 border-dashed px-4 py-6 transition-colors sm:py-8 ${
                    dragOver
                      ? "border-blue-400 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                >
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="rounded-full bg-neutral-100 p-2 sm:p-3">
                      <Upload className="h-5 w-5 text-slate-600 sm:h-6 sm:w-6" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-xs font-semibold text-slate-900 sm:text-sm">
                        Drag and drop files here, or{" "}
                        <label
                          onClick={handleFileInput}
                          className="cursor-pointer text-blue-600 hover:underline"
                        >
                          browse
                        </label>
                      </p>
                      <p className="text-xs text-neutral-500">
                        Call recording audio files, SMS text threads
                      </p>
                    </div>
                  </div>
                </div>

                {formik.touched.files && formik.errors.files && (
                  <p className="text-xs text-red-500">
                    {formik.errors.files as string}
                  </p>
                )}
              </div>

              {/* File List */}
              {fileRecords.length > 0 && (
                <>
                  <div className="h-px bg-slate-200" />

                  <div className="flex flex-col gap-4">
                    {/* File Items - Scrollable Container */}
                    <div className="max-h-96 w-full space-y-3 overflow-y-auto">
                      {/* Filter out completed files and show only in-progress or failed files */}
                      {fileRecords.map((fileRecord) => (
                        <FileItem
                          key={fileRecord.id}
                          fileRecord={fileRecord}
                          onDelete={deleteFile}
                          onUpdateMetadata={updateFileMetadata}
                          errors={validationErrors[fileRecord.id]}
                        />
                      ))}
                      <div className="w-full border-b border-slate-200" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-4 p-4 sm:px-6">
            {uploadedFilesList.length > 0 && (
              <div className="text-center text-xs text-slate-500 italic">
                Uploaded Files
              </div>
            )}
            {uploadedFilesList?.map((fileRecord) => (
              <div className="max-h-40 w-full space-y-3 overflow-y-auto">
                <FileItem
                  key={fileRecord.id}
                  fileRecord={fileRecord}
                  onDelete={deleteFile}
                  onUpdateMetadata={updateFileMetadata}
                  errors={validationErrors[fileRecord.id]}
                  showExpandButton={false}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex flex-shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex gap-1">
            <p className="text-sm font-bold text-slate-900 sm:text-base">
              {fileRecords.length} files
            </p>
            <p className="text-sm font-medium text-slate-500 sm:text-base">
              ready to upload
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={resetForm}
              disabled={isSubmitting}
            >
              Reset Data
            </Button>
            <Button
              type="submit"
              disabled={
                !formik.isValid || fileRecords.length === 0 || isSubmitting
              }
              onClick={(e) => {
                e.preventDefault();
                formik.handleSubmit();
              }}
            >
              {isSubmitting ? "Uploading..." : "Submit All Files"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default UploadRecordForm;
