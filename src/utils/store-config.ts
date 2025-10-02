import Store from 'electron-store';
import type { Options } from 'electron-store';

interface StoreSchema {
  'server-url'?: string;
}

// Extending the Store options type to include missing properties
interface ExtendedOptions extends Options<StoreSchema> {
  projectName?: string;
  projectVersion?: string;
}

const schema = {
  'server-url': {
    type: 'string' as const,
    default: process.env.VITE_WEB_APP_PROXY_URL
  }
};

// Create store instance with project configuration
export const createStore = () => {
  const storeConfig: ExtendedOptions = {
    name: "vox-app-settings",
    projectName: "vox-app",
    projectVersion: "1.0.0",
    schema,
    clearInvalidConfig: true,
    watch: true
  };

  return new Store<StoreSchema>(storeConfig as Options<StoreSchema>);
};