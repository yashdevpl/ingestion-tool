import axios from "axios";
import { machineId } from "node-machine-id";
import dotenv from "dotenv";
dotenv.config();

// Detect if we're in a worker context
const isWorkerContext = () => {
  try {
    // In workers, 'process' exists but 'process.type' might be undefined
    // In main process, process.type should be 'browser'
    return typeof process !== 'undefined' && process.type !== 'browser';
  } catch {
    return true; // Assume worker if we can't determine
  }
};

// Lazy load store to avoid electron dependency in worker context
let store: any = null;
const getStore = () => {
  if (!store) {
    try {
      if (isWorkerContext()) {
        // In worker context, don't try to load electron store
        store = {
          get: () => null,
        };
      } else {
        // In main process, load the actual store
        const { createStore } = require("./store-config");
        store = createStore();
      }
    } catch (error) {
      console.warn('[helper-functions] Failed to load store:', (error as Error).message);
      // Fallback store
      store = {
        get: () => null,
      };
    }
  }
  return store;
};

export const getBaseUrl = () => {
  try {
    const store = getStore();
    const serverUrl = store.get("server-url");
    console.log('[helper-functions] getBaseUrl:', { serverUrl, isWorker: isWorkerContext() });
    return serverUrl || process.env.VITE_WEB_APP_PROXY_URL;
  } catch (error) {
    // Fallback to environment variable if store access fails
    console.log('[helper-functions] getBaseUrl fallback to env:', process.env.VITE_WEB_APP_PROXY_URL);
    return process.env.VITE_WEB_APP_PROXY_URL;
  }
};

function parseBrowserInfo(userAgent: string) {
  const match = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/([\d.]+)/);
  if (match) return { browser: match[1], version: match[2] };
  return { browser: "Unknown", version: "Unknown" };
}

export async function getClientInfo(metadata: Record<string, any> = {}) {
  // Check if we're in a browser/renderer context or main process
  let userAgent = "Unknown";
  let browserInfo = { browser: "Unknown", version: "Unknown" };
  
  try {
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      // Browser/renderer context
      userAgent = navigator.userAgent;
      browserInfo = parseBrowserInfo(userAgent);
    } else {
      // Main process context - use a default user agent
      userAgent = "Electron Main Process";
      browserInfo = { browser: "Electron", version: process.versions.electron || "Unknown" };
    }
  } catch (error) {
    console.warn('[helper-functions] Failed to get user agent:', (error as Error).message);
  }

  // Get public IP via external API
  let publicIP = "Unknown";
  try {
    let res;
    if (typeof fetch !== 'undefined') {
      // Browser context
      res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      publicIP = data.ip;
    } else {
      // Node.js context
      const response = await axios.get("https://api.ipify.org?format=json");
      publicIP = response.data.ip;
    }
  } catch (error) {
    console.warn('[helper-functions] Failed to get public IP:', (error as Error).message);
  }

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
  folderPath: string,
  baseUrl?: string // Optional parameter to override store value
) => {
  try {
    console.log("Creating upload context...", { folderPath });
    const body = await getClientInfo();
    const apiBaseUrl = baseUrl || getBaseUrl();
    console.log('[createUploadContext] Using base URL:', apiBaseUrl);
    const res = await axios.post(`${apiBaseUrl}/api/upload-context`, {
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
