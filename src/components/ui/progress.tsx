

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "../..//lib/utils";

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const [animationOffset, setAnimationOffset] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setAnimationOffset((prev) => (prev + 1) % 100);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="relative h-full w-full flex-1 overflow-hidden bg-primary transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      >
        {/* Wave animation layer */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: `linear-gradient(90deg, 
              transparent 0%, 
              rgba(255,255,255,0.3) 25%, 
              rgba(255,255,255,0.6) 50%, 
              rgba(255,255,255,0.3) 75%, 
              transparent 100%)`,
            transform: `translateX(${animationOffset - 50}%)`,
            animation: "wave-flow 2s linear infinite",
          }}
        />

        {/* Shimmer effect */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background: `linear-gradient(45deg, 
              transparent 30%, 
              rgba(255,255,255,0.5) 50%, 
              transparent 70%)`,
            transform: `translateX(${animationOffset * 2 - 100}%)`,
            animation: "shimmer 3s ease-in-out infinite",
          }}
        />
      </ProgressPrimitive.Indicator>

      {/* CSS animations */}
      <style>{`
        @keyframes wave-flow {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%) skewX(-15deg);
          }
          100% {
            transform: translateX(300%) skewX(-15deg);
          }
        }
      `}</style>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
