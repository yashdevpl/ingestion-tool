import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  listFiles: (dirPath: string) => ipcRenderer.invoke("list-files", dirPath),
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
});
