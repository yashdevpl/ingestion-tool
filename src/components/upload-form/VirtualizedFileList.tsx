import React, { useRef, useState } from "react";
import type { FileRecord } from "../../types/common";

interface VirtualizedFileListProps {
  files: FileRecord[];
  itemHeight?: number;
  containerHeight?: number;
  renderItem: (item: FileRecord, index: number) => React.ReactNode;
}

export const VirtualizedFileList: React.FC<VirtualizedFileListProps> = ({
  files,
  itemHeight = 56,
  containerHeight = 400,
  renderItem,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef(null);

  const totalHeight = files.length * itemHeight;
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    files.length
  );

  const visibleItems = files.slice(visibleStart, visibleEnd);

  const handleScroll = (e: any) => {
    setScrollTop(e.target.scrollTop);
  };

  return (
    <div
      ref={scrollElementRef}
      className="overflow-auto border rounded-lg bg-slate-50"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div
          style={{
            transform: `translateY(${visibleStart * itemHeight}px)`,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item: any, index: number) =>
            renderItem(item, visibleStart + index)
          )}
        </div>
      </div>
    </div>
  );
};