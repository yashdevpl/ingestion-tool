import axios from "axios";
import { machineId } from "node-machine-id";
import dotenv from "dotenv";
import { createStore } from "./store-config";
dotenv.config();

// Create a store instance for this module
const store = createStore();

export const getBaseUrl = () => {
  const serverUrl = store.get("server-url");
  console.log('[helper-functions] getBaseUrl:', { serverUrl });
  return serverUrl || process.env.VITE_WEB_APP_PROXY_URL;
};

function parseBrowserInfo(userAgent: string) {
  const match = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/([\d.]+)/);
  if (match) return { browser: match[1], version: match[2] };
  return { browser: "Unknown", version: "Unknown" };
}

export async function getClientInfo(metadata: Record<string, any> = {}) {
  const userAgent = navigator.userAgent;
  const browserInfo = parseBrowserInfo(userAgent);

  // Get public IP via external API
  let publicIP = "Unknown";
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    publicIP = data.ip;
  } catch {}

  return {
    machineId: (await machineId()).toString(),
    ipAddress: publicIP,
    userAgent,
    browserInfo,
    metadata,
  };
}

export const createUploadContext = async (
  uploadedBy: string,
  userEmail: string,
  folderPath: string
) => {
  try {
    console.log("Creating upload context...", { folderPath });
    const body = await getClientInfo();
    const baseUrl = getBaseUrl();
    const res = await axios.post(`${baseUrl}/api/upload-context`, {
      ...body,
      uploadedBy,
      userEmail,
      folderPath,
    });
    return res.data;
  } catch (err) {
    console.log(err);
    return null;
  }
};
