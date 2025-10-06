import React from "react";
import { Upload } from "lucide-react";

export const EmptyFilesList: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-full text-slate-500">
      <div className="text-center">
        <Upload className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-lg font-medium">No files found</p>
        <p className="text-sm">Try adjusting your search or filters</p>
      </div>
    </div>
  );
};