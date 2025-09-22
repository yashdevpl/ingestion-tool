

import { useCallback, useEffect, useMemo, useState } from "react";

import { Combobox, type ComboboxOption, type ComboboxProps } from "./combobox";

// Use ComboboxOption directly instead of AutoCompleteOption

type BaseAutoCompleteProps = Omit<ComboboxProps, "options" | "onSearch" | "onOpenChange"> & {
  options: ComboboxOption[];
  value?: string | string[] | undefined;
  onValueChange: (value: string | string[] | undefined) => void;

  allowCreate?: boolean;
  createOnEnter?: boolean;
  createOnBlur?: boolean;
  createMessage?: string;
  validateCreate?: (value: string) => boolean;
  onCreateOption?: (value: string) => ComboboxOption;
  minSearchLength?: number;
  debounceWait?: number;
};

interface SingleAutoCompleteProps extends BaseAutoCompleteProps {
  multiple?: false;
}

interface MultiAutoCompleteProps extends BaseAutoCompleteProps {
  multiple: true;
  showSelectAll?: boolean;
  selectAllLabel?: string;
  selectAllColor?: string;
}

type AutoCompleteProps = SingleAutoCompleteProps | MultiAutoCompleteProps;

export function AutoComplete(props: AutoCompleteProps) {
  const {
    options: initialOptions,
    multiple = false,
    value,
    onValueChange,

    allowCreate = true,
    createOnEnter = true,
    createOnBlur = false,
    createMessage = "Create",
    validateCreate = (value) => value.trim().length > 0,
    onCreateOption = (value) => ({
      value: value.trim(),
      label: value.trim()
    }),

    minSearchLength = 0,
    debounceWait = 300,
    emptyMessage = "No options found.",
    ...comboboxProps
  } = props;

  const [options, setOptions] = useState<ComboboxOption[]>(initialOptions);
  const [searchValue, setSearchValue] = useState<string>("");
  const [debouncedSearchValue, setDebouncedSearchValue] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchValue(searchValue), debounceWait);
    return () => clearTimeout(timer);
  }, [searchValue, debounceWait]);

  useEffect(() => {
    setOptions(initialOptions);
  }, [initialOptions]);

  const filteredOptions = useMemo(() => {
    if (debouncedSearchValue.length < minSearchLength) return options;
    const q = debouncedSearchValue.toLowerCase();
    return options.filter(
      (opt) => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    );
  }, [options, debouncedSearchValue, minSearchLength]);

  const shouldShowCreate = useMemo(() => {
    const trimmed = debouncedSearchValue.trim();
    if (!allowCreate || !trimmed || !validateCreate(trimmed)) return false;
    return !options.some((opt) => opt.value.toLowerCase() === trimmed.toLowerCase());
  }, [allowCreate, debouncedSearchValue, validateCreate, options]);

  const createOption = useCallback(
    (inputValue: string) => {
      if (validateCreate(inputValue)) {
        const newOption = onCreateOption(inputValue);
        const exists = options.some((opt) => opt.value === newOption.value);
        if (!exists) setOptions((prev) => [...prev, newOption]);

        if (multiple) {
          const current = (value as string[]) || [];
          if (!current.includes(newOption.value)) {
            onValueChange([...current, newOption.value]);
          }
        } else {
          onValueChange(newOption.value);
          setIsOpen(false);
        }

        setSearchValue("");
      }
    },
    [validateCreate, onCreateOption, options, multiple, value, onValueChange]
  );

  const enhancedOptions = useMemo(() => {
    if (!shouldShowCreate) return filteredOptions;
    return [
      {
        value: `__create__${debouncedSearchValue}`,
        label: `${createMessage} "${debouncedSearchValue}"`,
        color: undefined
      },
      ...filteredOptions
    ];
  }, [filteredOptions, shouldShowCreate, debouncedSearchValue, createMessage]);

  const handleValueChange = (newValue: string | string[] | undefined) => {
    if (multiple && Array.isArray(newValue)) {
      const createItems = newValue.filter((v) => v.startsWith("__create__"));
      const regularItems = newValue.filter((v) => !v.startsWith("__create__"));

      createItems.forEach((v) => createOption(v.replace("__create__", "")));
      onValueChange(regularItems);
    } else if (!multiple && typeof newValue === "string" && newValue.startsWith("__create__")) {
      createOption(newValue.replace("__create__", ""));
    } else onValueChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isOpen && e.key === "Enter" && createOnEnter && shouldShowCreate) {
      e.preventDefault();
      createOption(debouncedSearchValue);
    }
  };

  const handleBlur = () => {
    if (createOnBlur && shouldShowCreate) createOption(debouncedSearchValue);
  };

  const getEmptyMessage = () => {
    return debouncedSearchValue.length < minSearchLength
      ? `Type at least ${minSearchLength} characters to search...`
      : emptyMessage;
  };

  return (
    <button onBlur={handleBlur} onKeyDown={handleKeyDown}>
      <Combobox
        options={enhancedOptions}
        value={value}
        onValueChange={handleValueChange}
        multiple={multiple}
        emptyMessage={getEmptyMessage()}
        onSearch={setSearchValue}
        onOpenChange={setIsOpen}
        {...comboboxProps}
      />
    </button>
  );
}
