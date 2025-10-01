import axios from "axios";
import { machineId } from "node-machine-id";

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
    const res = await axios.post(
      `${import.meta.env.VITE_WEB_APP_PROXY_URL}/upload-context`,
      {
        ...body,
        uploadedBy,
        userEmail,
        folderPath,
      }
    );
    return res.data;
  } catch (err) {
    console.log(err);
    return null;
  }
};
