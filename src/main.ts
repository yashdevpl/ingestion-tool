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

  // Handle external links - open in system browser instead of in app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
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

// Handle protocol for OAuth callback
const handleProtocol = (url: string) => {
  console.log('Handling protocol URL:', url);
  
  if (url.startsWith('vox-app://auth/callback')) {
    // If no main window exists, create one
    if (!mainWindow) {
      console.log('No main window exists, creating one...');
      createWindow();
    }
    
    // Wait a bit for the window to be ready and then send the callback
    if (mainWindow && !mainWindow.isDestroyed()) {
      // If window is ready, send immediately
      if (mainWindow.webContents.isLoading()) {
        mainWindow.webContents.once('did-finish-load', () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            console.log('Sending oauth-callback to renderer:', url);
            mainWindow.webContents.send('oauth-callback', url);
          }
        });
      } else {
        console.log('Sending oauth-callback to renderer:', url);
        mainWindow.webContents.send('oauth-callback', url);
      }
      
      // Focus the window
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    } else {
      console.error('Main window is destroyed or null, cannot send oauth-callback');
    }
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
  
  // Set up IPC handlers
  ipcMain.handle('open-external', async (event, url: string) => {
    try {
      await shell.openExternal(url);
    } catch (error) {
      console.error('Failed to open external URL:', error);
      throw error;
    }
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