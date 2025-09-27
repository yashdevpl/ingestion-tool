import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { FileText, Upload, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { CompactFileItem } from './CompactFileItem';
import { ApiStatusIndicator } from './ApiStatusIndicator';
import { FileRecord } from '../../types/common';

interface ApiResponse {
  data: FileRecord[];
  totalCount: number;
  uploadedCount: number;
  readCount: number;
  ingestedCount: number;
}

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

interface FileStatusTabsProps {
  contextId?: number;
  onBack: () => void;
}

export const FileStatusTabs: React.FC<FileStatusTabsProps> = ({ contextId, onBack }) => {
  const [activeTab, setActiveTab] = useState('uploaded');
  const [apiData, setApiData] = useState<Record<string, ApiResponse | null>>({
    uploaded: null,
    ingested: null,
    total: null
  });
  const [loading, setLoading] = useState<Record<string, boolean>>({
    uploaded: false,
    ingested: false,
    total: false
  });
  const [error, setError] = useState<Record<string, string | null>>({
    uploaded: null,
    ingested: null,
    total: null
  });
  const [tabCounts, setTabCounts] = useState({
    uploaded: 0,
    ingested: 0,
    total: 0
  });
  const [pagination, setPagination] = useState<Record<string, { skip: number, take: number }>>({
    uploaded: { skip: 0, take: 50 },
    ingested: { skip: 0, take: 50 },
    total: { skip: 0, take: 50 }
  });

  // Fetch files based on tab using actual API
  const fetchFiles = useCallback(async (tab: string, loadMore = false) => {
    if (!contextId) return;
    
    setLoading(prev => ({ ...prev, [tab]: true }));
    setError(prev => ({ ...prev, [tab]: null }));
    
    try {
      const currentPagination = pagination[tab];
      const skip = loadMore ? currentPagination.skip + currentPagination.take : 0;
      
      // Build query parameters based on tab
      const params = new URLSearchParams({
        contextId: contextId.toString(),
        skip: skip.toString(),
        take: currentPagination.take.toString()
      });

      // Add specific filters based on tab
      switch (tab) {
        case 'uploaded':
          params.append('isUploaded', 'true');
          break;
        case 'ingested':
          params.append('isIngested', 'true');
          break;
        case 'total':
          // No additional filters for total - get all files for this context
          break;
      }

      const response = await fetch(`http://localhost:3001/api/file-uploads?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${tab} files: ${response.statusText}`);
      }

      const apiResponse: ApiResponse = await response.json();
      
      // Update the data and counts
      setApiData(prev => ({
        ...prev,
        [tab]: loadMore && prev[tab] ? {
          ...apiResponse,
          data: [...prev[tab]!.data, ...apiResponse.data]
        } : apiResponse
      }));
      
      // Update pagination
      if (loadMore) {
        setPagination(prev => ({
          ...prev,
          [tab]: { ...prev[tab], skip }
        }));
      } else {
        setPagination(prev => ({
          ...prev,
          [tab]: { ...prev[tab], skip: 0 }
        }));
      }
      
      // Update tab counts from the API response (these should be consistent across calls)
      setTabCounts(prev => ({
        ...prev,
        uploaded: apiResponse.uploadedCount,
        ingested: apiResponse.ingestedCount,
        total: apiResponse.totalCount
      }));
      
    } catch (error) {
      console.error(`Error fetching ${tab} files:`, error);
      setError(prev => ({ 
        ...prev, 
        [tab]: error instanceof Error ? error.message : 'Failed to fetch files'
      }));
    } finally {
      setLoading(prev => ({ ...prev, [tab]: false }));
    }
  }, [contextId, pagination]);

  // Convert FileRecord to FileStatusItem for display
  const convertToFileStatusItems = (files: FileRecord[], tabType: string): FileStatusItem[] => {
    return files.map(file => ({
      id: file.id.toString(),
      fileName: file.fileName,
      fileSize: parseInt(file.fileSize),
      uploadDate: file.uploadedAt,
      ingestionDate: file.isIngested ? file.uploadedAt : undefined, // You may need to add ingestionDate field
      status: file.isIngested ? 'ingested' : file.isUploaded ? 'uploaded' : 'failed',
      fileType: file.fileType,
      errorMessage: (!file.isUploaded && !file.isIngested) ? 'Upload failed' : undefined
    }));
  };

  // Fetch data when tab changes (only if not already loaded)
  useEffect(() => {
    if (!apiData[activeTab]) {
      fetchFiles(activeTab);
    }
  }, [activeTab, contextId, fetchFiles, apiData]);

  // Refresh function
  const handleRefresh = () => {
    fetchFiles(activeTab);
  };



  const renderFileList = (tab: string) => {
    const isLoading = loading[tab];
    const apiResponse = apiData[tab];
    const errorMsg = error[tab];

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-sm text-gray-600">Loading files...</span>
        </div>
      );
    }

    if (errorMsg) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-600 text-center mb-4">{errorMsg}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchFiles(tab)}
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      );
    }

    if (!apiResponse || apiResponse.data.length === 0) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No files found</p>
          </div>
        </div>
      );
    }

    const files = convertToFileStatusItems(apiResponse.data, tab);
    const hasMore = apiResponse.data.length === pagination[tab].take;

    return (
      <ScrollArea className="h-[450px]">
        <div className="space-y-1 p-1">
          {files.map((file) => (
            <CompactFileItem key={file.id} file={file} />
          ))}
          {hasMore && (
            <div className="flex justify-center p-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchFiles(tab, true)}
                disabled={loading[tab]}
                className="text-xs"
              >
                {loading[tab] ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-white">
        <div>
          <h2 className="text-base font-semibold text-gray-900">File Status</h2>
          <div className="flex items-center space-x-2 mt-1">
            <p className="text-xs text-gray-600">Context ID: {contextId}</p>
            <ApiStatusIndicator />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => fetchFiles(activeTab)}
            className="text-xs px-2 py-1 h-7"
            disabled={loading[activeTab as keyof typeof loading]}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading[activeTab as keyof typeof loading] ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={onBack} className="text-xs px-3 py-1 h-7">
            Back to Upload
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 p-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="uploaded" className="flex items-center space-x-1 text-xs">
              <Upload className="h-3 w-3" />
              <span>Uploaded</span>
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5">
                {tabCounts.uploaded}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="ingested" className="flex items-center space-x-1 text-xs">
              <CheckCircle className="h-3 w-3" />
              <span>Ingested</span>
              <Badge variant="default" className="ml-1 text-xs px-1.5 py-0.5">
                {tabCounts.ingested}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="total" className="flex items-center space-x-1 text-xs">
              <FileText className="h-3 w-3" />
              <span>All Files</span>
              <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0.5">
                {tabCounts.total}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="uploaded" className="mt-3 h-[calc(100%-50px)]">
            <Card className="h-full">
              <CardHeader className="pb-2 pt-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <Upload className="h-4 w-4 text-blue-500" />
                    <span>Uploaded Files</span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {tabCounts.uploaded}
                    </Badge>
                  </CardTitle>
                  {apiData.uploaded && (
                    <span className="text-xs text-gray-500">
                      Showing {apiData.uploaded.data.length} of {tabCounts.uploaded}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {renderFileList('uploaded')}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ingested" className="mt-3 h-[calc(100%-50px)]">
            <Card className="h-full">
              <CardHeader className="pb-2 pt-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Ingested Files</span>
                    <Badge variant="default" className="ml-2 text-xs">
                      {tabCounts.ingested}
                    </Badge>
                  </CardTitle>
                  {apiData.ingested && (
                    <span className="text-xs text-gray-500">
                      Showing {apiData.ingested.data.length} of {tabCounts.ingested}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {renderFileList('ingested')}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="total" className="mt-3 h-[calc(100%-50px)]">
            <Card className="h-full">
              <CardHeader className="pb-2 pt-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>All Files</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {tabCounts.total}
                    </Badge>
                  </CardTitle>
                  {apiData.total && (
                    <span className="text-xs text-gray-500">
                      Showing {apiData.total.data.length} of {tabCounts.total}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {renderFileList('total')}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};