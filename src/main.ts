import { app, BrowserWindow, shell, ipcMain } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";

if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

// Set app as default protocol client for vox-app://
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('vox-app', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('vox-app');
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Handle window lifecycle events
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Clear authentication when window is about to close
  mainWindow.on('close', () => {
    console.log('Main window closing, clearing authentication...');
    // Send message to renderer to clear auth before window closes
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('clear-auth-on-close');
    }
  });

  // Intercept navigation to handle OAuth callback
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    console.log('Navigation intercepted:', navigationUrl);
    const url = new URL(navigationUrl);
    
    // Check if this is our custom protocol callback
    if (url.protocol === 'vox-app:') {
      console.log('Custom protocol detected, preventing default navigation');
      event.preventDefault();
      
      // Process the callback immediately before navigation
      handleProtocol(navigationUrl);
      
      // Don't navigate back immediately - let the callback handler do it
      // The callback processing will trigger the navigation after tokens are saved
    }
  });

  // Handle external links - open in system browser instead of in app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Don't open external links if they're part of the auth flow
      if (url.includes('login-t.pi-labs.ai') || url.includes('auth/realms')) {
        return { action: 'allow' }; // Allow Keycloak pages to load in the app
      }
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  mainWindow.webContents.openDevTools();
};


let pendingOAuthCallback: string | null = null;

// Handle protocol for OAuth callback
const handleProtocol = (url: string) => {
  console.log('Handling protocol URL:', url);
  
  if (url.startsWith('vox-app://auth/callback')) {
    console.log('OAuth callback URL detected');
    
    // Store the callback URL for processing after navigation
    pendingOAuthCallback = url;
    
    // If no main window exists, create one
    if (!mainWindow) {
      console.log('No main window exists, creating one...');
      createWindow();
      return;
    }
    
    // Ensure window exists and is not destroyed
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.error('Main window is destroyed or null, cannot process callback');
      return;
    }
    
    console.log('Navigating to main app with pending callback');
    
    // Navigate to the main app first
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      mainWindow.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
      );
    }
    
    // Focus and restore window
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
    
  } else {
    console.log('URL is not an OAuth callback, ignoring');
  }
};

// Handle the protocol on macOS
app.on('open-url', (event: Electron.Event, url: string) => {
  event.preventDefault();
  handleProtocol(url);
});

// Handle the protocol on Windows/Linux
if (process.platform === 'win32' || process.platform === 'linux') {
  // Handle protocol when app is already running
  app.on('second-instance', (event: Electron.Event, commandLine: string[]) => {
    // Someone tried to run a second instance, focus our window instead.
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      
      // Check if there's a protocol URL in the command line
      const protocolUrl = commandLine.find((arg: string) => arg.startsWith('vox-app://'));
      if (protocolUrl) {
        handleProtocol(protocolUrl);
      }
    } else if (!mainWindow) {
      // If no window exists, create one
      createWindow();
      // Handle the protocol URL after a short delay
      const protocolUrl = commandLine.find((arg: string) => arg.startsWith('vox-app://'));
      if (protocolUrl) {
        setTimeout(() => handleProtocol(protocolUrl), 1000);
      }
    }
  });
  
  // Handle protocol when app starts
  const protocolUrl = process.argv.find((arg: string) => arg.startsWith('vox-app://'));
  if (protocolUrl) {
    app.on('ready', () => {
      setTimeout(() => handleProtocol(protocolUrl), 1000);
    });
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow();
  
  // Handle opening external URLs
  ipcMain.handle('open-external', async (event, url: string) => {
    await shell.openExternal(url);
  });
  
  // Handle getting pending OAuth callback
  ipcMain.handle('get-pending-oauth-callback', async () => {
    console.log('Renderer requesting pending OAuth callback:', pendingOAuthCallback);
    const callback = pendingOAuthCallback;
    pendingOAuthCallback = null; // Clear it after providing
    return callback;
  });
});

// Prevent multiple instances on Windows/Linux
if (process.platform === 'win32' || process.platform === 'linux') {
  const gotTheLock = app.requestSingleInstanceLock();
  
  if (!gotTheLock) {
    app.quit();
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.