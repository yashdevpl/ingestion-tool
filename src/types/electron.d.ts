export interface ElectronAPI {
  onOAuthCallback: (callback: (url: string) => void) => void;
  removeOAuthListener: () => void;
  openExternal: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}