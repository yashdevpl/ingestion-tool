import React, { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

interface ApiStatusIndicatorProps {
  baseUrl?: string;
}

export const ApiStatusIndicator: React.FC<ApiStatusIndicatorProps> = ({ 
  baseUrl = 'http://localhost:3001' 
}) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkApiStatus = async () => {
      setIsChecking(true);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${baseUrl}/api/health`, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        setIsOnline(response.ok);
      } catch (error) {
        setIsOnline(false);
      } finally {
        setIsChecking(false);
      }
    };

    // Check immediately
    checkApiStatus();

    // Then check every 30 seconds
    const interval = setInterval(checkApiStatus, 30000);

    return () => clearInterval(interval);
  }, [baseUrl]);

  return (
    <Badge 
      variant={isOnline ? "default" : "destructive"} 
      className="text-xs flex items-center space-x-1"
    >
      {isChecking ? (
        <div className="h-2 w-2 rounded-full bg-current animate-pulse" />
      ) : isOnline ? (
        <Wifi className="h-3 w-3" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      <span>{isOnline ? 'Online' : 'Offline'}</span>
    </Badge>
  );
};