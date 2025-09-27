import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { CheckCircle, Upload, AlertCircle, Info } from 'lucide-react';

interface StatusNotificationProps {
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  count?: number;
  onDismiss?: () => void;
}

export const StatusNotification: React.FC<StatusNotificationProps> = ({
  type,
  title,
  message,
  count,
  onDismiss
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <Upload className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getCardStyle = () => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
    }
  };

  return (
    <Card className={`${getCardStyle()} border-l-4`}>
      <CardContent className="p-3">
        <div className="flex items-start space-x-3">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-medium text-gray-900">{title}</h4>
              {count !== undefined && (
                <Badge variant="outline" className="text-xs">
                  {count}
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">{message}</p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};