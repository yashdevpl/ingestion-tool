import React from 'react';
import { Badge } from '../ui/badge';
import { FileText, Upload, CheckCircle, AlertCircle } from 'lucide-react';

interface FileStatusItem {
  id: string;
  fileName: string;
  fileSize: number;
  uploadDate?: string;
  ingestionDate?: string;
  status: 'uploaded' | 'ingested' | 'failed';
  fileType: string;
  errorMessage?: string;
}

interface CompactFileItemProps {
  file: FileStatusItem;
}

export const CompactFileItem: React.FC<CompactFileItemProps> = ({ file }) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <Upload className="h-3 w-3 text-blue-500" />;
      case 'ingested':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <FileText className="h-3 w-3 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ingested':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="flex items-center justify-between p-2 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        {getStatusIcon(file.status)}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-gray-900">
            {file.fileName}
          </p>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>{formatFileSize(file.fileSize)}</span>
            <span>•</span>
            <span className="capitalize">{file.fileType}</span>
            {file.uploadDate && (
              <>
                <span>•</span>
                <span>{new Date(file.uploadDate).toLocaleDateString()}</span>
              </>
            )}
          </div>
          {file.errorMessage && (
            <p className="text-xs text-red-600 mt-0.5 truncate">{file.errorMessage}</p>
          )}
        </div>
      </div>
      <Badge 
        variant="outline" 
        className={`text-xs px-2 py-0.5 capitalize ${getStatusColor(file.status)}`}
      >
        {file.status}
      </Badge>
    </div>
  );
};