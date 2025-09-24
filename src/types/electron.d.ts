export interface ElectronAPI {
  onOAuthCallback: (callback: (url: string) => void) => void;
  removeOAuthListener: () => void;
  openExternal: (url: string) => Promise<void>;
  getPendingOAuthCallback: () => Promise<string | null>;
  onClearAuthOnClose: (callback: () => void) => void;
  removeClearAuthListener: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}