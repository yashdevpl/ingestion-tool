

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";

interface LabeledDatePickerProps {
  label: string;
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export default function LabeledDatePicker({
  label,
  value,
  onChange,
  placeholder = "Pick a date and time",
  className = "",
  disabled = false,
  minDate,
  maxDate
}: LabeledDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value);
  const [timeValue, setTimeValue] = useState(
    value
      ? `${value.getHours().toString().padStart(2, "0")}:${value.getMinutes().toString().padStart(2, "0")}:${value.getSeconds().toString().padStart(2, "0")}`
      : "12:00:00"
  );
  const [currentMonth, setCurrentMonth] = useState(
    value ? new Date(value.getFullYear(), value.getMonth(), 1) : new Date()
  );
  const [popoverPosition, setPopoverPosition] = useState<"top" | "bottom">("bottom");
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setSelectedDate(value);
    if (value) {
      setTimeValue(
        `${value.getHours().toString().padStart(2, "0")}:${value.getMinutes().toString().padStart(2, "0")}:${value.getSeconds().toString().padStart(2, "0")}`
      );
    }
  }, [value]);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const popoverHeight = 400; // Approximate height of the popover
      const popoverWidth = 280; // Approximate width of the popover

      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const spaceRight = viewportWidth - triggerRect.left;
      const spaceLeft = triggerRect.right;

      let position: "top" | "bottom" = "bottom";
      if (spaceAbove > spaceBelow && spaceBelow < popoverHeight) {
        position = "top";
      }

      let leftOffset = 0;
      if (spaceRight < popoverWidth && spaceLeft >= popoverWidth) {
        leftOffset = triggerRect.width - popoverWidth;
      } else if (spaceRight < popoverWidth) {
        leftOffset = viewportWidth - triggerRect.left - popoverWidth - 16;
      }

      setPopoverPosition(position);
      setPopoverStyle({
        minWidth: "280px",
        maxHeight: "400px",
        overflowY: "auto",
        // left: leftOffset !== 0 ? `${leftOffset}px` : "0",
        position: "fixed",
        top:
          position === "bottom"
            ? `${triggerRect.bottom + 4}px`
            : `${triggerRect.top - popoverHeight - 4}px`,
        // left: `${triggerRect.left + leftOffset}px`,
        zIndex: 99999
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        triggerRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
      document.addEventListener("scroll", handleScroll, true);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen]);

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    };
    return date.toLocaleDateString("en-US", options);
  };

  const handleDateClick = (clickedDate: Date) => {
    if (isDateDisabled(clickedDate)) return;

    const [hours, minutes] = timeValue.split(":").map(Number);
    const newDate = new Date(
      clickedDate.getFullYear(),
      clickedDate.getMonth(),
      clickedDate.getDate(),
      hours,
      minutes
    );
    setSelectedDate(newDate);
    onChange?.(newDate);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    // Add ':00' for seconds if only hours and minutes are provided
    const timeWithSeconds =
      newTime.includes(":") && newTime.split(":").length === 2 ? `${newTime}:00` : newTime;
    setTimeValue(timeWithSeconds);

    if (selectedDate) {
      const [hours, minutes, seconds = 0] = timeWithSeconds.split(":").map(Number);
      const newDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        hours,
        minutes,
        seconds
      );
      setSelectedDate(newDate);
      onChange?.(newDate);
    }
  };

  const handleClear = () => {
    setSelectedDate(undefined);
    setTimeValue("12:00:00");
    onChange?.(undefined);
    setIsOpen(false);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      if (direction === "next") {
        newMonth.setMonth(prev.getMonth() + 1);
      } else {
        newMonth.setMonth(prev.getMonth() - 1);
      }
      return newMonth;
    });
  };

  const isSameDate = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    return selectedDate ? isSameDate(date, selectedDate) : false;
  };

  const isToday = (date: Date) => {
    return isSameDate(date, new Date());
  };

  const isDateDisabled = (date: Date) => {
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (minDate) {
      const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
      if (dateOnly < minDateOnly) return true;
    }

    if (maxDate) {
      const maxDateOnly = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
      if (dateOnly > maxDateOnly) return true;
    }

    return false;
  };

  return (
    <div className="relative flex flex-col gap-1.5">
      <label className={`text-xs font-medium text-slate-700 dark:text-slate-300 ${className}`}>
        {label}
      </label>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`
          flex h-7 items-center justify-start gap-2 rounded-md border px-2
          py-1 text-left text-xs font-normal transition-colors
          ${!selectedDate ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-gray-100"}
          ${
            disabled
              ? "cursor-not-allowed border-gray-200 bg-gray-100 opacity-50 dark:border-gray-700 dark:bg-gray-800"
              : "cursor-pointer border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
          }
          focus:ring-opacity-20 focus:ring-2 focus:ring-blue-500 focus:outline-none
        `}
      >
        <Calendar className="h-3 w-3 text-gray-400 dark:text-gray-500" />
        {selectedDate ? formatDate(selectedDate) : placeholder}
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close date picker"
            className="fixed inset-0 z-40 bg-black/10 md:bg-transparent"
            onClick={() => setIsOpen(false)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setIsOpen(false)}
            style={{ cursor: "pointer" }}
          />
          <div
            ref={popoverRef}
            className="rounded-md border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900"
            style={popoverStyle}
            role="dialog"
            aria-label="Date and time picker"
          >
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigateMonth("prev")}
                className="rounded p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </div>
              <button
                type="button"
                onClick={() => navigateMonth("next")}
                className="rounded p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div
                  key={day}
                  className="p-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="mb-3 grid grid-cols-7 gap-1">
              {getDaysInMonth(currentMonth).map((date, index) => (
                <div key={index} className="aspect-square">
                  {date ? (
                    <button
                      type="button"
                      onClick={() => handleDateClick(date)}
                      disabled={isDateDisabled(date)}
                      aria-label={`Select ${date.toLocaleDateString()}`}
                      className={`
                        flex h-full w-full items-center justify-center rounded text-xs transition-colors
                        ${
                          isDateDisabled(date)
                            ? "cursor-not-allowed text-gray-300 opacity-50 dark:text-gray-600"
                            : isSelected(date)
                              ? "bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                              : "text-gray-700 hover:bg-blue-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-blue-900 dark:hover:text-gray-100"
                        }
                        ${isToday(date) && !isSelected(date) && !isDateDisabled(date) ? "bg-gray-100 font-medium dark:bg-gray-800" : ""}
                      `}
                    >
                      {date.getDate()}
                    </button>
                  ) : (
                    <div className="h-full w-full"></div>
                  )}
                </div>
              ))}
            </div>

            <div className="mb-3 flex items-center gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
              <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="time"
                value={timeValue}
                onChange={handleTimeChange}
                step="1"
                aria-label="Select time"
                className="h-7 flex-1 rounded border border-gray-200 bg-white px-2 text-xs text-gray-900 focus:ring-opacity-20 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            <div className="flex gap-2 border-t border-gray-200 pt-2 dark:border-gray-700">
              <button
                type="button"
                onClick={handleClear}
                className="h-7 flex-1 rounded bg-gray-100 text-xs font-medium text-gray-700 transition-colors focus:ring-opacity-20 focus:ring-2 focus:ring-gray-500 focus:outline-none hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-7 flex-1 rounded bg-blue-500 text-xs font-medium text-white transition-colors focus:ring-opacity-20 focus:ring-2 focus:ring-blue-500 focus:outline-none hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                OK
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
