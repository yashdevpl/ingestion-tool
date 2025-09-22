

import * as React from "react";

import { cn } from "../lib/utils";

export interface LabeledTextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const LabeledTextInput = React.forwardRef<
  HTMLInputElement,
  LabeledTextInputProps
>(({ className, error, label, ...props }, ref) => {
  return (
    <div className="relative">
      <input
        className={cn(
          "flex  w-full rounded-sm border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          "pl-32", // Increased space for label
          className
        )}
        ref={ref}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="absolute top-1/2 left-2 min-w-24 -translate-y-1/2 text-sm font-normal text-gray-600">
        {label}
      </div>
    </div>
  );
});
LabeledTextInput.displayName = "LabeledTextInput";

export { LabeledTextInput };
