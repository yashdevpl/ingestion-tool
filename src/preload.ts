import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  listFiles: (dirPath: string) => ipcRenderer.invoke("list-files", dirPath),
});
