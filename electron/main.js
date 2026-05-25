const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");
const { prepareAppEnv } = require("./database");

const isDev = !app.isPackaged;
const PORT = 3000;
let mainWindow = null;
let nextProcess = null;
let serverEnv = null;
let splashWindow = null;

const fs = require("fs");
const logFile = path.join(app.getPath("userData"), "app-debug.log");
function logInfo(msg) {
  try {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) { }
}
logInfo("=== APP STARTING ===");

// ---------- helpers ----------

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => resolve(res));
    req.on("error", reject);
    req.setTimeout(2000, () => { req.destroy(); reject(new Error("timeout")); });
  });
}

/**
 * Poll a URL until it responds with any HTTP status (not a connection error).
 * maxWaitMs: total budget in ms.
 */
function waitForServer(url, maxWaitMs = 90_000, intervalMs = 800) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + maxWaitMs;
    const attempt = () => {
      httpGet(url)
        .then(() => resolve())
        .catch(() => {
          if (Date.now() >= deadline) {
            reject(new Error(`Server did not start within ${maxWaitMs / 1000}s`));
          } else {
            setTimeout(attempt, intervalMs);
          }
        });
    };
    attempt();
  });
}

/**
 * Wait for the /api/health endpoint to return 200.
 * Uses a shorter budget because the server is already up at this point.
 */
function waitForDatabase(maxWaitMs = 20_000, intervalMs = 600) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + maxWaitMs;
    const attempt = () => {
      httpGet(`http://localhost:${PORT}/api/health`)
        .then((res) => {
          if (res.statusCode === 200) {
            resolve();
          } else if (Date.now() >= deadline) {
            reject(new Error("Database health check failed"));
          } else {
            setTimeout(attempt, intervalMs);
          }
        })
        .catch(() => {
          if (Date.now() >= deadline) {
            reject(new Error("Database health check failed"));
          } else {
            setTimeout(attempt, intervalMs);
          }
        });
    };
    attempt();
  });
}

// ---------- splash ----------

function updateSplashStatus(msg) {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  splashWindow.webContents
    .executeJavaScript(`document.getElementById('status').textContent = ${JSON.stringify(msg)};`)
    .catch(() => { });
}

function showSplash() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    transparent: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    icon: path.join(__dirname, "icon.png"),
  });

  splashWindow.loadURL(
    "data:text/html;charset=utf-8," +
    encodeURIComponent(`<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4c1d95 100%);
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 100vh; color: white; text-align: center;
      user-select: none;
    }
    .logo { font-size: 56px; margin-bottom: 14px; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 6px; letter-spacing: 0.5px; }
    .version { font-size: 11px; opacity: 0.5; margin-bottom: 28px; }
    .progress-bar {
      width: 260px; height: 4px;
      background: rgba(255,255,255,0.15);
      border-radius: 4px; overflow: hidden; margin-bottom: 16px;
    }
    .progress-fill {
      height: 100%; width: 0%;
      background: linear-gradient(90deg, #818cf8, #c4b5fd);
      border-radius: 4px;
      animation: progress 90s linear forwards;
    }
    @keyframes progress { to { width: 95%; } }
    #status {
      font-size: 12px; opacity: 0.65;
      min-height: 18px; transition: opacity 0.3s;
    }
  </style>
</head>
<body>
  <div class="logo">🖐️</div>
  <h1>نظام الحضور والانصراف</h1>
  <div class="version">الإصدار 1.0</div>
  <div class="progress-bar"><div class="progress-fill"></div></div>
  <div id="status">جاري تهيئة التطبيق...</div>
</body>
</html>`)
  );

  return splashWindow;
}

// ---------- main window ----------

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, "icon.png"),
    title: "نظام الحضور والانصراف",
    show: false,
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.once("ready-to-show", () => {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    splashWindow = null;
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ---------- Next.js server ----------

function getAppDir() {
  return path.join(__dirname, "..");
}

function startNextServer() {
  const nextCli = path.join(
    __dirname,
    "..",
    "node_modules",
    "next",
    "dist",
    "bin",
    "next"
  );
  const appDir = getAppDir();

  const env = {
    ...serverEnv,
    ELECTRON_RUN_AS_NODE: "1",
    NODE_ENV: "production",
    PORT: String(PORT),
  };

  nextProcess = spawn(
    process.execPath,
    [nextCli, "start", "-p", String(PORT)],
    { cwd: appDir, env, stdio: "pipe" }
  );

  nextProcess.stdout.on("data", (d) => {
    const msg = d.toString().trim();
    logInfo(`[Next.js] ${msg}`);
    // Forward meaningful status messages to the splash screen
    if (msg.includes("Ready") || msg.includes("started")) {
      updateSplashStatus("الخادم جاهز، جاري الاتصال بقاعدة البيانات...");
    }
  });
  nextProcess.stderr.on("data", (d) => {
    logInfo(`[Next.js ERR] ${d}`);
  });
  nextProcess.on("error", (err) => {
    logInfo(`[Next.js spawn error] ${err}`);
  });
  nextProcess.on("close", (code) => {
    logInfo(`[Next.js close] exited with code ${code}`);
  });
}

function prepareDatabase() {
  const appDir = getAppDir();
  serverEnv = prepareAppEnv(appDir);
  Object.assign(process.env, serverEnv);
  logInfo("Database URL configured for PostgreSQL (Neon)");
}

// ---------- app lifecycle ----------

app.whenReady().then(async () => {
  try {
    prepareDatabase();
  } catch (e) {
    logInfo(`[ERROR] Database setup failed: ${e.message}`);
    app.quit();
    return;
  }

  if (!isDev) {
    showSplash();
    startNextServer();
  }

  try {
    updateSplashStatus("جاري تشغيل الخادم...");
    logInfo(`Waiting for Next.js server on http://localhost:${PORT}...`);

    await waitForServer(`http://localhost:${PORT}`, 90_000);
    logInfo("Next.js server is up.");

    updateSplashStatus("جاري التحقق من الاتصال بقاعدة البيانات...");
    logInfo("Waiting for database health check...");

    await waitForDatabase(20_000);
    logInfo("Database is ready. Opening main window.");

    updateSplashStatus("جاري فتح التطبيق...");
    createWindow();
  } catch (e) {
    logInfo(`[ERROR] Startup failed: ${e.message}`);
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    app.quit();
  }
});

process.on("uncaughtException", (err) => {
  logInfo(`[UNCAUGHT EXCEPTION] ${err.message}\n${err.stack}`);
});

process.on("unhandledRejection", (reason) => {
  logInfo(`[UNHANDLED REJECTION] ${reason}`);
});

app.on("window-all-closed", () => {
  if (nextProcess) nextProcess.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});

app.on("before-quit", () => {
  if (nextProcess) nextProcess.kill();
});
