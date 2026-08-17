const { app, shell, Tray, Menu, nativeImage, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { fork, execSync } = require('child_process');
const net = require('net');
const fs = require('fs');

let serverProcess;
let tray = null;
let logWindow = null;

// --- Utility: Wait for a TCP port to accept connections ---
function waitForPort(port, host = '127.0.0.1', timeout = 120000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = 500;
    function check() {
      if (Date.now() - startTime > timeout) return reject(new Error('Timeout'));
      const socket = new net.Socket();
      socket.on('connect', () => { socket.destroy(); resolve(); });
      socket.on('error', () => { socket.destroy(); setTimeout(check, interval); });
      socket.connect(port, host);
    }
    check();
  });
}

// --- Utility: Resolve standalone server path (handles asar) ---
function resolveServerPath() {
  // In production (packaged exe), extraResources places standalone at resources/standalone/
  // In development (electron .), use local .next/standalone/
  const isPackaged = app.isPackaged;
  if (isPackaged) {
    return path.join(process.resourcesPath, 'standalone', 'server.js');
  }
  return path.join(__dirname, '.next', 'standalone', 'server.js');
}

// Hide the application from the dock (macOS only)
if (process.platform === 'darwin') {
  app.dock.hide();
}

// --- Single Instance Lock ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Show a message if user tries to open a second instance
    dialog.showMessageBox({
      type: 'info',
      title: 'تنبيه',
      message: 'السيرفر يعمل بالفعل في الخلفية. يمكنك إغلاقه أو عرض السجل من الأيقونة بجوار الساعة.'
    });
  });

  app.whenReady().then(() => {
  // Set the app to run on Windows startup
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true
  });

  // --- Create Tray Icon ---
  const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  let iconPath;
  if (app.isPackaged) {
    iconPath = path.join(process.resourcesPath, 'standalone', 'public', iconName);
  } else {
    iconPath = path.join(__dirname, 'public', iconName);
  }
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'عرض سجل السيرفر', click: () => { if (logWindow) logWindow.show(); } },
    { type: 'separator' },
    { label: 'إغلاق السيرفر', click: () => app.quit() }
  ]);

  tray.setToolTip('سيرفر الحضور والانصراف (يعمل في الخلفية)');
  tray.setContextMenu(contextMenu);

  Menu.setApplicationMenu(null);

  // --- Create a visible log window (black CMD-like window) ---
  logWindow = new BrowserWindow({
    width: 800,
    height: 500,
    title: 'سيرفر الحضور والانصراف - localhost:3000',
    backgroundColor: '#1e1e1e',
    show: false, // Run silently by default
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Build a simple dark terminal-like HTML page for logs
  const logHTML = `
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          background: #1e1e1e; color: #00ff00; font-family: 'Consolas', 'Courier New', monospace;
          font-size: 14px; padding: 10px; margin: 0; overflow-y: auto;
        }
        #log { white-space: pre-wrap; word-wrap: break-word; }
        h2 { color: #00ccff; margin-top: 0; }
        .error { color: #ff4444; }
        .info { color: #ffcc00; }
      </style>
    </head>
    <body>
      <h2>⚡ سيرفر الحضور والانصراف</h2>
      <div id="log"></div>
      <script>
        const logEl = document.getElementById('log');
        function addLog(msg, cls) {
          const line = document.createElement('div');
          if (cls) line.className = cls;
          line.textContent = msg;
          logEl.appendChild(line);
          window.scrollTo(0, document.body.scrollHeight);
        }
        // Listen for messages from main process via a custom mechanism
        window.addEventListener('message', (e) => {
          if (e.data && e.data.type === 'log') addLog(e.data.msg, e.data.cls);
        });
      </script>
    </body>
    </html>
  `;

  logWindow.webContents.setMaxListeners(50);

  logWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(logHTML));

  logWindow.on('close', (e) => {
    // Minimize to tray instead of closing
    e.preventDefault();
    logWindow.hide();
  });

  // Helper to send log messages to the window
  function sendLog(msg, cls = '') {
    if (logWindow && !logWindow.isDestroyed()) {
      logWindow.webContents.executeJavaScript(
        `(function(){ var el = document.getElementById('log'); var d = document.createElement('div'); d.className = '${cls}'; d.textContent = ${JSON.stringify(String(msg))}; el.appendChild(d); window.scrollTo(0, document.body.scrollHeight); })()`
      ).catch(() => {});
    }
  }

  // --- Resolve and validate server path ---
  const serverPath = resolveServerPath();
  const standaloneDir = path.dirname(serverPath);

  sendLog('📁 مسار السيرفر: ' + serverPath, 'info');
  sendLog('📂 مجلد العمل: ' + standaloneDir, 'info');

  if (!fs.existsSync(serverPath)) {
    const errMsg = '❌ ملف السيرفر غير موجود: ' + serverPath;
    sendLog(errMsg, 'error');
    dialog.showErrorBox('خطأ في السيرفر', errMsg);
    return;
  }

  // Check node_modules
  const nodeModulesPath = path.join(standaloneDir, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    sendLog('⚠️ مجلد node_modules غير موجود في: ' + nodeModulesPath, 'error');
    sendLog('⚠️ قد يفشل تشغيل السيرفر...', 'error');
  } else {
    sendLog('✅ node_modules موجود', 'info');
  }

  // --- Set environment variables ---
  const serverEnv = Object.assign({}, process.env, {
    PORT: '3000',
    HOSTNAME: '0.0.0.0',
    NODE_ENV: 'production',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000'
  });

  // --- Load .env file if exists ---
  const envPath = path.join(standaloneDir, '.env');
  if (fs.existsSync(envPath)) {
    sendLog('✅ ملف .env موجود، جاري تحميل المتغيرات...', 'info');
    try {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.substring(0, eqIdx).trim();
            let val = trimmed.substring(eqIdx + 1).trim();
            // Remove surrounding quotes
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            serverEnv[key] = val;
          }
        }
      });
    } catch (e) {
      sendLog('⚠️ فشل في قراءة .env: ' + e.message, 'error');
    }
  }

  sendLog('', '');
  sendLog('🚀 جاري تشغيل السيرفر على localhost:3000 ...', 'info');
  sendLog('', '');

  // --- Start the standalone server using fork (uses Electron's bundled Node.js) ---
  try {
    serverProcess = fork(serverPath, [], {
      cwd: standaloneDir,
      env: serverEnv,
      silent: true, // Capture stdout/stderr so we can display them
      windowsHide: true // Prevent any hidden CMD window from popping up on Windows
    });

    // Pipe stdout to log window
    if (serverProcess.stdout) {
      serverProcess.stdout.on('data', (data) => {
        sendLog(data.toString().trim());
      });
    }

    // Pipe stderr to log window
    if (serverProcess.stderr) {
      serverProcess.stderr.on('data', (data) => {
        sendLog(data.toString().trim(), 'error');
      });
    }

    serverProcess.on('error', (err) => {
      sendLog('❌ خطأ في تشغيل السيرفر: ' + err.message, 'error');
    });

    serverProcess.on('exit', (code) => {
      sendLog(`⚠️ السيرفر توقف برمز الخروج: ${code}`, 'error');
    });

    sendLog('✅ تم بدء عملية السيرفر (PID: ' + serverProcess.pid + ')', 'info');

  } catch (err) {
    sendLog('❌ فشل في تشغيل السيرفر: ' + err.message, 'error');
    dialog.showErrorBox('خطأ', 'فشل في تشغيل السيرفر: ' + err.message);
    return;
  }

  // --- Wait for port 3000 ---
  sendLog('⏳ انتظار السيرفر على البورت 3000 ...', 'info');

  waitForPort(3000)
    .then(() => {
      sendLog('', '');
      sendLog('✅✅✅ السيرفر يعمل بنجاح على http://localhost:3000', 'info');
      sendLog('🌐 السيرفر يعمل الآن في الخلفية...', 'info');
      if (tray && process.platform === 'win32') {
        tray.displayBalloon({
          title: 'سيرفر الحضور والانصراف',
          content: 'السيرفر يعمل الآن في الخلفية على http://localhost:3000'
        });
      }
    })
    .catch((err) => {
      sendLog('❌ السيرفر لم يبدأ في الوقت المحدد: ' + err.message, 'error');
      dialog.showErrorBox('خطأ', 'السيرفر لم يبدأ في الوقت المحدد');
    });
});

// --- Cleanup on quit ---
app.on('before-quit', () => {
  // Allow the log window to actually close
  if (logWindow && !logWindow.isDestroyed()) {
    logWindow.removeAllListeners('close');
    logWindow.close();
  }

  if (serverProcess) {
    try {
      // Kill the forked process and its children
      if (process.platform === 'win32') {
        try {
          execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { windowsHide: true });
        } catch (e) {
          // Process may have already exited
        }
      } else {
        serverProcess.kill();
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
});
} // Close the 'else' block for gotTheLock
