import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Search, X } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/utils";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onClear?: (value: string) => void;
  onToggle?: (value: boolean) => void;
}

export function SearchBar({
  className,
  placeholder,
  onChange,
  onClear,
  onToggle,
}: SearchBarProps) {
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [isSearchOpen, setIsSearchOpen] = React.useState<boolean>(false);

  const handleSearchToggle = () => {
    if (onToggle) onToggle(isSearchOpen);
    setIsSearchOpen((prev) => !prev);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleClear = () => {
    if (searchRef.current) {
      if (onClear) onClear("");
      searchRef.current.value = "";
      searchRef.current.focus();
    }
  };

  return (
    <div
      className={cn("relative overflow-hidden rounded-md border", className)}
    >
      <AnimatePresence mode="wait">
        {isSearchOpen ? (
          <>
            <motion.div
              key="input"
              initial={{ width: 50, opacity: 0 }}
              animate={{ width: 250, opacity: 1 }}
              exit={{ width: 50, opacity: 0 }}
              transition={{
                width: { duration: 0.4, ease: "easeInOut" },
                opacity: { duration: 0.2, ease: "easeInOut" },
              }}
              className="overflow-hidden"
            >
              <Input
                name="search"
                type="text"
                placeholder={placeholder || "Search..."}
                autoComplete="search"
                onChange={handleInputChange}
                className="border-none text-sm font-normal focus-visible:ring-0"
                ref={searchRef}
              />
            </motion.div>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute top-1/2 right-8 -translate-y-1/2 cursor-pointer rounded-full bg-red-400/20 p-1"
              onClick={handleClear}
            >
              <X className="size-2.5 text-red-500" />
            </motion.span>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-full bg-muted-foreground/20 p-1"
              onClick={handleSearchToggle}
            >
              <ChevronLeft className="size-2.5 text-muted-foreground" />
            </motion.span>
          </>
        ) : (
          <motion.div
            key="button"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <Button size="icon" variant="ghost" onClick={handleSearchToggle}>
              <Search className="size-4 text-muted-foreground" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
