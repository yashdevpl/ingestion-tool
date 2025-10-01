import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { apiResponse } from "../types/common";
import { ApiResponse } from "../components/upload-form/FileStatusTabs";
import { ENV } from "../utils/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE_URL = ENV.WEB_APP_PROXY_URL || "http://localhost:3001";

interface FetchFilesParams {
  contextId: number;
  tab: string;
  skip: number;
  take: number;
}

export const fetchFilesFromApi = async ({
  contextId,
  tab,
  skip,
  take,
}: FetchFilesParams): Promise<ApiResponse> => {
  const params = new URLSearchParams({
    contextId: contextId.toString(),
    skip: skip.toString(),
    take: take.toString(),
  });

  switch (tab) {
    case "uploaded":
      params.append("isUploaded", "true");
      break;
    case "ingested":
      params.append("isIngested", "true");
      break;
    case "total":
      break;
  }

  const response = await fetch(`${API_BASE_URL}/api/file-uploads?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${tab} files: ${response.statusText}`);
  }

  return response.json();
};

export const fetchInitialCountsFromApi = async (
  contextId: number
): Promise<ApiResponse> => {
  const params = new URLSearchParams({
    contextId: contextId.toString(),
    skip: "0",
    take: "1",
  });

  const response = await fetch(`${API_BASE_URL}/api/file-uploads?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch initial counts: ${response.statusText}`);
  }

  return response.json();
};
