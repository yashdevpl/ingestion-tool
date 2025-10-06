import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { Button } from "../ui/button";

export interface ReadFilesData {
  dirPath: string;
  smsFiles: number;
  audioFiles: number;
  audioCriFiles: number;
  audioMetadataFiles: number;
  totalFiles: number;
  totalErrors: number;
  errors?: Array<{
    fileName: string;
    fileType: string;
    criFileName?: string;
    errors: string[];
  }>;
}

interface FilesSummaryDialogProps {
  readFilesData: ReadFilesData | null;
  onUpload: () => void;
  processingLoader: boolean;
}

export const FilesSummaryDialog: React.FC<FilesSummaryDialogProps> = ({
  readFilesData,
  onUpload,
  processingLoader,
}) => {
  if (!readFilesData) return null;

  console.log("FilesSummaryDialog received readFilesData:", readFilesData);

  return (
    <Dialog open={readFilesData !== null} onOpenChange={() => null}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Files Ready for Upload</DialogTitle>
          <DialogDescription>
            Found the following files in: {readFilesData?.dirPath}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-4">
            {/* File Type Statistics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600 mb-1">SMS Files</div>
                <div className="text-2xl font-semibold text-slate-900">
                  {readFilesData?.smsFiles}
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600 mb-1">Audio Files</div>
                <div className="text-2xl font-semibold text-slate-900">
                  {readFilesData?.audioFiles}
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600 mb-1">Audio + CRI</div>
                <div className="text-2xl font-semibold text-slate-900">
                  {readFilesData?.audioCriFiles}
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600 mb-1">
                  Metadata Files
                </div>
                <div className="text-2xl font-semibold text-slate-900">
                  {readFilesData?.audioMetadataFiles}
                </div>
              </div>
            </div>

            {/* Validation Errors Section */}
            {readFilesData?.errors && readFilesData.errors.length > 0 && (
              <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-red-500 text-lg">⚠️</div>
                  <div className="text-red-800 font-semibold">
                    Validation Errors Found
                  </div>
                  <div className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                    {readFilesData.errors.length} file
                    {readFilesData.errors.length > 1 ? "s" : ""} affected
                  </div>
                </div>

                <div className="mb-3">
                  <Accordion type="multiple" className="space-y-2">
                    {readFilesData.errors.map((error, index) => (
                      <AccordionItem
                        key={index}
                        value={`error-${index}`}
                        className="border border-red-200 rounded-lg bg-white"
                      >
                        <AccordionTrigger className="px-3 py-2 hover:no-underline">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <span className="text-red-700 font-medium truncate">
                                {error.fileName}
                              </span>
                              <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                                {error.fileType}
                              </span>
                              {error.criFileName && (
                                <span className="ml-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                                  CRI: {error.criFileName}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-red-600 mt-1">
                              {error.errors.length} error
                              {error.errors.length > 1 ? "s" : ""} found
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3">
                          <div className="space-y-2">
                            {error.errors.map(
                              (errorMsg: string, errorIndex: number) => (
                                <div
                                  key={errorIndex}
                                  className="flex items-start gap-2 p-2 bg-red-50 rounded text-xs"
                                >
                                  <div className="text-red-500 mt-0.5 flex-shrink-0">
                                    •
                                  </div>
                                  <div className="text-red-700">{errorMsg}</div>
                                </div>
                              )
                            )}
                          </div>

                          {/* File info */}
                          <div className="mt-2 pt-2 border-t border-red-200">
                            <div className="text-xs text-red-600">
                              <strong>File:</strong> {error.fileName}
                              <br />
                              <strong>Type:</strong>{" "}
                              {error.fileType === "audio"
                                ? "Audio Call"
                                : "SMS/Text"}
                              <br />
                              {error.criFileName && (
                                <>
                                  <strong>CRI File:</strong> {error.criFileName}
                                  <br />
                                </>
                              )}
                              <strong>Status:</strong>{" "}
                              <span className="text-red-700 font-medium">
                                Will be excluded from upload
                              </span>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>

                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                  💡 <strong>Tip:</strong> These files have validation errors
                  and will be automatically excluded from upload. You can still
                  upload the valid files, or fix the metadata issues and try
                  again later.
                </div>
              </div>
            )}

            {/* Estimated Time Calculation */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-slate-700 font-medium">
                    Estimated Upload Time
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Based on file types and counts
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-slate-900">
                    {(() => {
                      // Average upload times in seconds per file
                      const SMS_UPLOAD_TIME = 1; // 1 second per SMS file
                      const AUDIO_UPLOAD_TIME = 3; // 3 seconds per audio file

                      const totalTime =
                        (readFilesData?.smsFiles || 0) * SMS_UPLOAD_TIME +
                        (readFilesData?.audioFiles || 0) * AUDIO_UPLOAD_TIME +
                        (readFilesData?.audioCriFiles || 0) * AUDIO_UPLOAD_TIME;

                      if (totalTime < 60) return `${totalTime}s`;
                      const minutes = Math.floor(totalTime / 60);
                      const seconds = totalTime % 60;
                      return seconds > 0
                        ? `${minutes}m ${seconds}s`
                        : `${minutes}m`;
                    })()}{" "}
                  </div>
                  <div className="text-xs text-slate-500">approximate</div>
                </div>
              </div>

              {/* Upload Info */}
              <div className="mt-3 flex items-start gap-3 text-xs text-slate-600">
                <div className="text-amber-500 mt-0.5">⚠️</div>
                <div>
                  <div className="text-slate-700 font-medium mb-1">
                    Upload Information
                  </div>
                  <div>Upload time may vary based on:</div>
                  <ul className="list-disc ml-4 mt-1 text-xs space-y-1">
                    <li>Your internet connection speed</li>
                    <li>Server response time</li>
                    <li>File sizes and complexity</li>
                  </ul>
                  {readFilesData?.totalErrors &&
                    readFilesData.totalErrors > 0 && (
                      <div className="mt-2 text-red-600 font-medium">
                        ⚠️ {readFilesData.totalErrors} files excluded due to
                        validation errors
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <div className="w-full space-y-4">
            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              {(() => {
                const hasValidFiles =
                  readFilesData.totalFiles && readFilesData.totalFiles > 0;
                console.log("FilesSummaryDialog button logic:", {
                  totalFiles: readFilesData.totalFiles,
                  hasValidFiles: hasValidFiles,
                });
                return hasValidFiles;
              })() ? (
                <Button
                  type="button"
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-2"
                  disabled={processingLoader}
                  onClick={onUpload}
                >
                  Upload Valid Files ({readFilesData.totalFiles})
                </Button>
              ) : (
                <Button type="button" variant="destructive" disabled>
                  No Valid Files to Upload
                </Button>
              )}
            </div>

            {/* Help Text */}
            {readFilesData?.totalErrors && readFilesData.totalErrors > 0 && (
              <div className="text-xs text-center text-slate-600 bg-blue-50 p-3 rounded border border-blue-200">
                💡 <strong>What happens next:</strong> Only valid files will be
                uploaded. Files with errors will remain in your directory and
                won't be processed. You can fix the metadata issues in those
                files and upload them later.
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
