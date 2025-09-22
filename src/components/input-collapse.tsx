// Converted to shadcn/ui and Tailwind CSS styling with TypeScript
import React, { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const sizeMap: Record<string, string> = {
  sm: "h-8 px-2 text-sm",
  default: "h-9 px-3 text-sm",
  lg: "h-10 px-6 text-base"
};

const iconSizeMap: Record<string, string> = {
  sm: "h-3 w-3",
  default: "h-4 w-4",
  lg: "h-5 w-5"
};

const buttonSizeMap: Record<string, string> = {
  sm: "h-8 w-8",
  default: "h-9 w-9",
  lg: "h-10 w-10"
};

type InputCollapseProps = {
  placeholder?: string;
  onSearch?: (value: string) => void;
  className?: string;
  searchTerm: string;
  direction?: "left" | "right";
  buttonVariant?: "default" | "ghost" | "outline";
  size?: "sm" | "default" | "lg";
};

export const InputCollapse: React.FC<InputCollapseProps> = ({
  placeholder = "Search...",
  onSearch = () => {},
  className = "",
  searchTerm = "",
  direction = "right",
  size = "default"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    onSearch("");
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <div
        className={`flex items-center transition-all duration-300 ease-out ${
          direction === "left" ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            isOpen ? "w-64 opacity-100" : "w-0 opacity-0"
          }`}
        >
          <div className="relative">
            <Input
              ref={inputRef}
              value={searchTerm}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={placeholder}
              className={`pr-10 ${sizeMap[size]}`}
            />
            <div
              className={`absolute inset-y-0 flex items-center ${
                direction === "left" ? "right-3" : "left-3"
              }`}
            >
              {!searchTerm?.length ? (
                <Search className={`text-muted-foreground ${iconSizeMap[size]}`} />
              ) : (
                <X
                  className="h-4 w-4 cursor-pointer text-muted-foreground"
                  onClick={() => onSearch("")}
                />
              )}
            </div>
          </div>
        </div>

        <Button
          variant="vox_primary"
          size="sm"
          onClick={handleToggle}
          className={`shrink-0 ${buttonSizeMap[size]}`}
        >
          {isOpen ? (
            <X className={iconSizeMap[size]} onClick={() => onSearch("")} />
          ) : (
            <Search className={iconSizeMap[size]} />
          )}
        </Button>
      </div>
    </div>
  );
};
