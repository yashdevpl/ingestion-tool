import React, { useEffect, useState } from "react";

interface VoiceAnalyzerLoaderProps {
  message?: string;
  isLoaderShow: boolean;
}

export const VoiceLoader: React.FC<VoiceAnalyzerLoaderProps> = ({
  message = "Analyzing voice...",
  isLoaderShow
}) => {
  const [heights, setHeights] = useState<number[]>([]);

  useEffect(() => {
    const updateHeights = () => {
      const newHeights = Array.from(
        { length: 8 },
        (_, i) => Math.sin(Date.now() * 0.008 + i * 0.7) * 30 + 10
      );
      setHeights(newHeights);
    };

    updateHeights();
    const interval = setInterval(updateHeights, 80);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="flex h-full flex-col items-center  justify-center ">
      {/* Speaking waveform */}
      {isLoaderShow && (
        <div className="mb-6 flex h-20 items-center space-x-1">
          {heights.map((height, i) => (
            <div
              key={i}
              className="w-1 rounded bg-blue-500 transition-all duration-75"
              style={{ height: `${Math.abs(height)}px` }}
            />
          ))}
        </div>
      )}

      <p className="text-sm text-gray-600">{message}</p>
    </div>
  );
};
