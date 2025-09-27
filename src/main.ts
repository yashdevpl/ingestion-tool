import { app, BrowserWindow, dialog, shell, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";
import started from "electron-squirrel-startup";
import workerpool from "workerpool";
import { createUploadContext } from "./utils/helper-functions";
// Import worker path
const isDevelopment = process.env.NODE_ENV === "development";
const uploadWorker = path.join(__dirname, "uploadWorker.js");

if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

// Set app as default protocol client for vox-app://
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("vox-app", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("vox-app");
}

const createWindow = () => {
  const userDataPath = app.getPath("userData");
  const cachePath = path.join(userDataPath, "Cache");

  app.commandLine.appendSwitch("disk-cache-dir", cachePath);
  app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");

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
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Clear authentication when window is about to close
  mainWindow.on("close", () => {
    console.log("Main window closing, clearing authentication...");
    // Send message to renderer to clear auth before window closes
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("clear-auth-on-close");
    }
  });

  // Intercept navigation to handle OAuth callback
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    console.log("Navigation intercepted:", navigationUrl);
    const url = new URL(navigationUrl);

    // Check if this is our custom protocol callback
    if (url.protocol === "vox-app:") {
      console.log("Custom protocol detected, preventing default navigation");
      event.preventDefault();

      // Process the callback immediately before navigation
      handleProtocol(navigationUrl);

      // Don't navigate back immediately - let the callback handler do it
      // The callback processing will trigger the navigation after tokens are saved
    }
  });

  // Handle external links - open in system browser instead of in app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      // Don't open external links if they're part of the auth flow
      if (url.includes("login-t.pi-labs.ai") || url.includes("auth/realms")) {
        return { action: "allow" }; // Allow Keycloak pages to load in the app
      }
      shell.openExternal(url);
    }
    return { action: "deny" };
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
  console.log("Handling protocol URL:", url);

  if (url.startsWith("vox-app://auth/callback")) {
    console.log("OAuth callback URL detected");

    // Store the callback URL for processing after navigation
    pendingOAuthCallback = url;

    // If no main window exists, create one
    if (!mainWindow) {
      console.log("No main window exists, creating one...");
      createWindow();
      return;
    }

    // Ensure window exists and is not destroyed
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.error(
        "Main window is destroyed or null, cannot process callback"
      );
      return;
    }

    console.log("Navigating to main app with pending callback");

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
    console.log("URL is not an OAuth callback, ignoring");
  }
};

// Handle the protocol on macOS
app.on("open-url", (event: Electron.Event, url: string) => {
  event.preventDefault();
  handleProtocol(url);
});

// Handle the protocol on Windows/Linux
if (process.platform === "win32" || process.platform === "linux") {
  // Handle protocol when app is already running
  app.on("second-instance", (event: Electron.Event, commandLine: string[]) => {
    // Someone tried to run a second instance, focus our window instead.
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // Check if there's a protocol URL in the command line
      const protocolUrl = commandLine.find((arg: string) =>
        arg.startsWith("vox-app://")
      );
      if (protocolUrl) {
        handleProtocol(protocolUrl);
      }
    } else if (!mainWindow) {
      // If no window exists, create one
      createWindow();
      // Handle the protocol URL after a short delay
      const protocolUrl = commandLine.find((arg: string) =>
        arg.startsWith("vox-app://")
      );
      if (protocolUrl) {
        setTimeout(() => handleProtocol(protocolUrl), 1000);
      }
    }
  });

  // Handle protocol when app starts
  const protocolUrl = process.argv.find((arg: string) =>
    arg.startsWith("vox-app://")
  );
  if (protocolUrl) {
    app.on("ready", () => {
      setTimeout(() => handleProtocol(protocolUrl), 1000);
    });
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  // Ensure cache directory exists
  const userDataPath = app.getPath("userData");
  const cachePath = path.join(userDataPath, "Cache");
  if (!fs.existsSync(cachePath)) {
    fs.mkdirSync(cachePath, { recursive: true });
  }

  createWindow();

  // Handle opening external URLs
  ipcMain.handle("open-external", async (event, url: string) => {
    await shell.openExternal(url);
  });

  // Handle getting pending OAuth callback
  ipcMain.handle("get-pending-oauth-callback", async () => {
    console.log(
      "Renderer requesting pending OAuth callback:",
      pendingOAuthCallback
    );
    const callback = pendingOAuthCallback;
    pendingOAuthCallback = null; // Clear it after providing
    return callback;
  });
});

// Prevent multiple instances on Windows/Linux
if (process.platform === "win32" || process.platform === "linux") {
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC to pick directory
ipcMain.handle("select-directory", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  if (!result.canceled && result.filePaths.length > 0)
    return result.filePaths[0];
  return null;
});

ipcMain.handle("create-upload-context", async () => {
  const contextDetails = await createUploadContext();
  return contextDetails;
});

// Handle file upload confirmation
ipcMain.handle("confirm-file-upload", async (_event, files: any[]) => {
  if (!mainWindow) return { confirmed: false };

  const result = await dialog.showMessageBox(mainWindow, {
    type: "question",
    buttons: ["Cancel", "Upload"],
    defaultId: 1,
    title: "Confirm Upload",
    message: "Would you like to proceed with uploading these files?",
    detail: `Total files to upload: ${files.length}`,
  });

  return { confirmed: result.response === 1 };
});

// Handle file uploads
ipcMain.handle(
  "upload-files",
  async (_event, files: any[], contextId: number) => {
    try {
      // Initialize upload worker pool
      const uploadWorkerPool = workerpool.pool(uploadWorker, {
        maxWorkers: 2,
      });

      // Execute upload with progress handling
      const result = await uploadWorkerPool.exec("uploadFiles", [files], {
        on: (payload) => {
          if (
            payload.type === "progress" &&
            mainWindow &&
            !mainWindow.isDestroyed()
          ) {
            mainWindow.webContents.send("upload-progress", payload.data);
          }
        },
      });

      // Clean up
      uploadWorkerPool.terminate();

      return result;
    } catch (err) {
      console.error("Upload error:", err);
      return {
        successful: [],
        failed: files.map((f) => f.fileId),
        total: files.length,
        processedAudio: 0,
        processedSMS: 0,
        errors: [(err as Error).message],
      };
    }
  }
);

// IPC to read files using worker
ipcMain.handle(
  "list-files",
  async (_event, dirPath: string, contextId: number) => {
    const workerPath = path.join(__dirname, "fileWorker.js");
    const listedFilesWorker = path.join(__dirname, "listAndClassifyFiles.js");
    const fileRecordWorker = path.join(__dirname, "fileRecordWorker.js");
    const criParserWorker = path.join(__dirname, "criParserWorker.js");

    const pool = workerpool.pool(workerPath, { maxWorkers: 2 });
    const listedFilesWorkerPool = workerpool.pool(listedFilesWorker, {
      maxWorkers: 4,
    });

    const fileRecordWorkerPool = workerpool.pool(fileRecordWorker, {
      maxWorkers: 4,
    });

    const criParserWorkerPool = workerpool.pool(criParserWorker, {
      maxWorkers: 4,
    });

    const uploadWorkerPool = workerpool.pool(uploadWorker, {
      maxWorkers: 2,
    });

    try {
      console.log(`Starting file processing for directory: ${dirPath} with contextId: ${contextId}`);
      
      const listedFiles = await listedFilesWorkerPool.exec(
        "listAndClassifyFiles",
        [dirPath, contextId]
      );
      
      console.log(`File processing completed. Found ${listedFiles?.validFiles?.length || 0} valid files out of ${listedFiles?.allFiles?.length || 0} total files`);
      
      if (!listedFiles) {
        throw new Error("Worker returned no data - processing may have failed");
      }

      // Log any API call failures that might have occurred during processing
      if (listedFiles.validationErrors && listedFiles.validationErrors.length > 0) {
        console.warn(`Found ${listedFiles.validationErrors.length} validation errors during processing`);
      }

      return listedFiles;
    } catch (err: any) {
      console.error("File processing error in main process:", err);
      
      // Provide more specific error information
      let errorMessage = "Unknown error occurred during file processing";
      
      if (err.message) {
        if (err.message.includes("Worker terminated")) {
          errorMessage = "File processing worker crashed - this may be due to memory issues or corrupted files";
        } else if (err.message.includes("ENOENT") || err.message.includes("no such file")) {
          errorMessage = "Directory or files not found - please check the selected path";
        } else if (err.message.includes("EACCES") || err.message.includes("permission")) {
          errorMessage = "Permission denied - unable to read files in the selected directory";
        } else if (err.message.includes("network") || err.message.includes("ECONNREFUSED")) {
          errorMessage = "Failed to connect to the API server - please ensure the server is running";
        } else {
          errorMessage = err.message;
        }
      }

      // Return an error result instead of throwing, so the UI can handle it gracefully
      return {
        allFiles: [],
        validFiles: [],
        smsFiles: [],
        audioFiles: [],
        audioCriFiles: [],
        audioMetadataFiles: [],
        validationErrors: [{
          fileName: "System Error",
          fileType: "system",
          errors: [errorMessage],
          isValid: false
        }],
        error: errorMessage
      };
    } finally {
      // Always terminate worker pools
      try {
        pool.terminate();
        listedFilesWorkerPool.terminate();
        fileRecordWorkerPool.terminate();
        criParserWorkerPool.terminate();
        uploadWorkerPool.terminate();
      } catch (terminationError) {
        console.warn("Warning: Could not terminate some worker pools:", terminationError);
      }
    }
  }
);
