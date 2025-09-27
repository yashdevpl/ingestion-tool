import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { X, AlertCircle, CheckCircle } from 'lucide-react';

interface CompactUploadProgressProps {
  totalFiles: number;
  uploadedFiles: number;
  ingestedFiles: number;
  failedFiles: number;
  isUploading: boolean;
  isProcessing?: boolean; // Add processing status
  processingComplete?: boolean; // Add processing complete status
  onCancel?: () => void;
  onViewDetails: () => void;
}

export const CompactUploadProgress: React.FC<CompactUploadProgressProps> = ({
  totalFiles,
  uploadedFiles,
  ingestedFiles,
  failedFiles,
  isUploading,
  isProcessing = false,
  processingComplete = false,
  onCancel,
  onViewDetails
}) => {
  const progress = totalFiles > 0 ? (uploadedFiles / totalFiles) * 100 : 0;
  const isUploadCompleted = uploadedFiles === totalFiles && !isUploading;
  const isFullyCompleted = isUploadCompleted && processingComplete;

  const getStatusText = () => {
    if (isFullyCompleted) return 'Processing Complete';
    if (processingComplete) return 'Processing Complete';
    if (isProcessing) return 'Processing Files...';
    if (isUploadCompleted) return 'Upload Complete';
    if (isUploading) return 'Uploading Files...';
    return 'Upload Progress';
  };

  const getStatusIcon = () => {
    if (isFullyCompleted || processingComplete) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (isProcessing || isUploading) {
      return <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
    }
    if (isUploadCompleted) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <h3 className="font-medium text-sm">
                  {getStatusText()}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onViewDetails}
                  className="text-xs px-2 py-1 h-7"
                >
                  View Details
                </Button>
                {onCancel && (isUploading || isProcessing) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancel}
                    className="text-xs px-2 py-1 h-7"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="text-xs text-gray-600 text-center">
              {uploadedFiles} of {totalFiles} files uploaded ({Math.round(progress)}%)
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <Badge variant="default" className="px-2 py-0.5 text-xs">
                {uploadedFiles}
              </Badge>
              <span className="text-gray-600">Uploaded</span>
            </div>
            <div className="flex items-center space-x-1">
              <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                {ingestedFiles}
              </Badge>
              <span className="text-gray-600">Ingested</span>
            </div>
            {failedFiles > 0 && (
              <div className="flex items-center space-x-1">
                <Badge variant="destructive" className="px-2 py-0.5 text-xs">
                  {failedFiles}
                </Badge>
                <span className="text-gray-600">Failed</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};