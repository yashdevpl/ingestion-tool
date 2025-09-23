import { contextBridge, ipcRenderer } from 'electron';

// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

contextBridge.exposeInMainWorld('electronAPI', {
  onOAuthCallback: (callback: (url: string) => void) => {
    ipcRenderer.on('oauth-callback', (event, url) => callback(url));
  },
  removeOAuthListener: () => {
    ipcRenderer.removeAllListeners('oauth-callback');
  },
  openExternal: (url: string) => {
    return ipcRenderer.invoke('open-external', url);
  },
  getPendingOAuthCallback: () => {
    return ipcRenderer.invoke('get-pending-oauth-callback');
  }
});
