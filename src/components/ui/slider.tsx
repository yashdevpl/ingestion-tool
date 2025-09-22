import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "../../lib/utils";

interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  showThumb?: boolean;
}

const Slider = React.forwardRef<HTMLSpanElement, SliderProps>(
  ({ className, showThumb = true, ...props }, ref) => (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none items-center select-none", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[#F4F4F5]">
        <SliderPrimitive.Range className="absolute h-full bg-blue-200" />
      </SliderPrimitive.Track>
      {showThumb && (
        <SliderPrimitive.Thumb className="block h-2 border border-primary bg-background shadow transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50" />
      )}
    </SliderPrimitive.Root>
  )
);

Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
