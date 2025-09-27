import axios from "axios";
import mime from "mime";
import os from "os";
import { getFileType } from "./conversion";
const dotenv = require("dotenv");
dotenv.config();

function getLocalIP(): string | null {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

// Get public IP
async function getPublicIP(): Promise<string | null> {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip;
  } catch {
    return null;
  }
}

// Parse browser info
function parseBrowserInfo(userAgent: string) {
  const match = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/([\d.]+)/);
  if (match) return { browser: match[1], version: match[2] };
  return { browser: "Unknown", version: "Unknown" };
}

// Main function to get system/browser/network info
async function getSystemInfo(metadata: Record<string, any> = {}) {
  const localIP = getLocalIP();
  const publicIP = await getPublicIP();
  const ipAddress = publicIP || localIP || "Unknown";

  const userAgent = navigator.userAgent;
  const browserInfo = parseBrowserInfo(userAgent);

  return {
    ipAddress,
    userAgent,
    machineHost: os.hostname(),
    browserInfo,
    metadata,
  };
}

export const createUploadContext = async () => {
  try {
    const body = await getSystemInfo();
    const userDetails = await axios.post(
      `${process.env.VITE_WEB_APP_PROXY_URL}/upload-context`,
      body
    );
    if (userDetails.status) {
      return userDetails.data;
    }
  } catch (error) {
    console.log(error);
  }
};
