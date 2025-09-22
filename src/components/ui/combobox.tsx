

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "../../lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface ComboboxOption {
  value: string;
  label: string;
  color?: string;
  disabled?: boolean;
}

interface BaseComboboxProps {
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  allowReset?: boolean;
  showColors?: boolean;
  maxDisplayItems?: number;
  sortSelectedFirst?: boolean;
  showSelectAll?: boolean;
  selectAllLabel?: string;
  selectAllColor?: string;
  width?: string;
  popoverWidth?: string;
  onSearch?: (search: string) => void;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

interface ComboboxProps extends BaseComboboxProps {
  multiple?: boolean;
  value?: string | string[];
  onValueChange: (value: string | string[] | undefined) => void;
}

export type { ComboboxProps };

export function Combobox(props: ComboboxProps) {
  const {
    options,
    multiple = false,
    value,
    onValueChange,

    placeholder = "Select option...",
    searchPlaceholder = "Search options...",
    emptyMessage = "No options found.",

    disabled = false,
    allowReset = false,
    showColors = false,
    maxDisplayItems = 3,
    sortSelectedFirst = false,
    showSelectAll = false,
    selectAllLabel = "All",
    selectAllColor = "bg-gradient-to-r from-blue-500 to-purple-500",
    width = "w-[285px]",
    popoverWidth = "w-[285px]",

    onSearch,
    onOpenChange,
    className
  } = props;

  const [searchValue, setSearchValue] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    onOpenChange?.(isOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    onSearch?.(searchValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const selectedValues = multiple ? (value as string[]) || [] : value ? [value as string] : [];
  const allSelected = selectedValues.length === options.length && options.length > 0;
  const someSelected = selectedValues.length > 0;

  const selectedColors = selectedValues
    .map((val) => options.find((opt) => opt.value === val)?.color)
    .filter(Boolean) as string[];
  const showColorDots = showColors && multiple && someSelected && !allSelected;

  const filteredOptions = !searchValue
    ? options
    : options.filter((opt) => {
        const search = searchValue.toLowerCase();
        return opt.label.toLowerCase().includes(search) || opt.value.toLowerCase().includes(search);
      });

  const sortedOptions = sortSelectedFirst
    ? [...filteredOptions].sort((a, b) => {
        const aSelected = selectedValues.includes(a.value);
        const bSelected = selectedValues.includes(b.value);
        return aSelected === bSelected ? 0 : aSelected ? -1 : 1;
      })
    : filteredOptions;

  function handleSelect(selectedValue: string) {
    if (selectedValue === "all" && multiple && showSelectAll) {
      const newSelection = allSelected ? [] : options.map((opt) => opt.value);
      onValueChange(newSelection);
      return;
    }

    if (multiple) {
      const newValues = selectedValues.includes(selectedValue)
        ? selectedValues.filter((v) => v !== selectedValue)
        : [...selectedValues, selectedValue];
      onValueChange(newValues);
    } else {
      onValueChange(selectedValues.includes(selectedValue) ? undefined : selectedValue);
      setIsOpen(false);
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onValueChange(multiple ? [] : undefined);
  }

  function getDisplayText(): string {
    if (!someSelected) return placeholder;
    else if (multiple) {
      if (allSelected) return selectAllLabel;
      if (selectedValues.length === 1) {
        const opt = options.find((o) => o.value === selectedValues[0]);
        return opt?.label || `1 ${selectAllLabel.toLowerCase().slice(0, -1)} selected`;
      }
      return `${selectedValues.length} ${selectAllLabel.toLowerCase()} selected`;
    }

    const opt = options.find((o) => o.value === selectedValues[0]);
    return opt?.label || placeholder;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          disabled={disabled}
          className={cn(
            width,
            "justify-between shadow-none",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {showColorDots && (
              <div className="flex shrink-0 items-center gap-1">
                {selectedColors.slice(0, maxDisplayItems).map((color, i) => (
                  <div key={i} className="size-3 rounded-full" style={{ backgroundColor: color }} />
                ))}
                {selectedColors.length > maxDisplayItems && (
                  <span className="text-xs text-muted-foreground">
                    +{selectedColors.length - maxDisplayItems}
                  </span>
                )}
              </div>
            )}
            <span className={cn("truncate text-sm", !someSelected && "text-muted-foreground")}>
              {getDisplayText()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {allowReset && someSelected && (
              <X
                className="size-4 shrink-0 cursor-pointer opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn(popoverWidth, "p-0")}>
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {multiple && showSelectAll && (
                <CommandItem
                  value="all"
                  onSelect={() => handleSelect("all")}
                  className="flex items-center gap-2 font-medium"
                >
                  <div className={cn("size-3 shrink-0 rounded-full", selectAllColor)} />
                  <span className="flex-1 truncate">{selectAllLabel}</span>
                  <Check
                    className={cn("ml-auto size-4", allSelected ? "opacity-100" : "opacity-0")}
                  />
                </CommandItem>
              )}
              {sortedOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option.value)}
                  disabled={option.disabled}
                  className={cn(
                    "flex items-center gap-2",
                    option.disabled && "cursor-not-allowed opacity-50"
                  )}
                >
                  {showColors && option.color && (
                    <div
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  <span className="flex-1 truncate">{option.label}</span>
                  <Check
                    className={cn(
                      "ml-auto size-4",
                      selectedValues.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
