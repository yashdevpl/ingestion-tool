export interface ElectronAPI {
  onOAuthCallback: (callback: (url: string) => void) => void;
  removeOAuthListener: () => void;
  openExternal: (url: string) => Promise<void>;
  getPendingOAuthCallback: () => Promise<string | null>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}