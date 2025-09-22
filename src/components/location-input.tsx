import React, { useEffect, useRef, useState } from "react";

export interface LocationData {
  house: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
}

interface LocationInputProps {
  onLocationChange?: (location: LocationData) => void;
  initialData?: Partial<LocationData>;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  onLocationChange,
  initialData = {}
}) => {
  const inputRefs = {
    house: useRef<HTMLInputElement>(null),
    street: useRef<HTMLInputElement>(null),
    city: useRef<HTMLInputElement>(null),
    state: useRef<HTMLInputElement>(null),
    pincode: useRef<HTMLInputElement>(null)
  };
  // Handle input changes
  const handleInputChange = (field: keyof LocationData, value: string) => {
    const newData = {
      ...{
        house: initialData.house || "",
        street: initialData.street || "",
        city: initialData.city || "",
        state: initialData.state || "",
        pincode: initialData.pincode || ""
      },
      [field]: value
    };
    onLocationChange?.(newData);
  };

  // Handle Enter key to move to next field
  const handleKeyDown = (field: keyof LocationData, e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const fields = ["house", "street", "city", "state", "pincode"] as const;
      const currentIndex = fields.indexOf(field);
      const nextField = fields[currentIndex + 1];

      if (nextField && inputRefs[nextField]?.current) {
        inputRefs[nextField].current.focus();
      }
    }
  };

  const fieldConfigs = [
    { key: "house" as const, label: "House", placeholder: "house/suite number" },
    { key: "street" as const, label: "Street", placeholder: "street address" },
    { key: "city" as const, label: "City", placeholder: "city name" },
    { key: "state" as const, label: "State", placeholder: "state/province" },
    { key: "pincode" as const, label: "Pincode", placeholder: "postal/zip code" }
  ];

  return (
    <div className="mx-auto w-full max-w-2xl ">
      <div className="relative">
        <div className="rounded-md border border-gray-300 bg-white p-2 transition-all focus-within:ring-opacity-20 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500">
          <div className=" font-mono text-sm">
            {fieldConfigs.map((field, index) => (
              <div key={field.key} className="flex items-center">
                <span className="w-16 flex-shrink-0 text-xs font-semibold text-gray-600 select-none">
                  {field.label}:
                </span>
                <input
                  ref={inputRefs[field.key]}
                  type="text"
                  value={initialData[field.key]}
                  onChange={(e) => handleInputChange(field.key, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(field.key, e)}
                  placeholder={field.placeholder}
                  className="ml-2 flex-1 border-0 bg-transparent px-2 py-0.5 text-xs font-semibold text-gray-900 placeholder-gray-400 outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
