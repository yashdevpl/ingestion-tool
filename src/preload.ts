import { contextBridge, ipcRenderer } from "electron";
import type { ElectronBridge, UploadProgress } from "./types/electron-bridge";
import type { FileRecord } from "./types/common";

const electronBridge: ElectronBridge = {
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  listFiles: (dirPath: string, contextId: number) =>
    ipcRenderer.invoke("list-files", dirPath, contextId),
  createUploadContext: (
    userId: string,
    userEmail: string,
    folderPath: string
  ) =>
    ipcRenderer.invoke("create-upload-context", userId, userEmail, folderPath),
  uploadFiles: (files: FileRecord[], contextId: number) =>
    ipcRenderer.invoke("upload-files", files, contextId),
  reUploadFile: (
    fileId: string,
    fileName: string,
    status: string,
    dirPath: string
  ) => ipcRenderer.invoke("re-upload", fileId, fileName, status, dirPath),
  onUploadProgress: (callback: (progress: UploadProgress) => void) => {
    ipcRenderer.on("upload-progress", (_event, progress) => callback(progress));
  },
  removeUploadProgressListener: () => {
    ipcRenderer.removeAllListeners("upload-progress");
  },
  confirmFileUpload: (files: FileRecord[]) =>
    ipcRenderer.invoke("confirm-file-upload", files),
  onOAuthCallback: (callback: (url: string) => void) => {
    ipcRenderer.on("oauth-callback", (event, url) => callback(url));
  },
  removeOAuthListener: () => {
    ipcRenderer.removeAllListeners("oauth-callback");
  },
  openExternal: (url: string) => {
    return ipcRenderer.invoke("open-external", url);
  },
  getPendingOAuthCallback: () => {
    return ipcRenderer.invoke("get-pending-oauth-callback");
  },
  onClearAuthOnClose: (callback: () => void) => {
    ipcRenderer.on("clear-auth-on-close", callback);
  },
  removeClearAuthListener: () => {
    ipcRenderer.removeAllListeners("clear-auth-on-close");
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronBridge);
