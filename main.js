const { app, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const net = require('net');

let serverProcess;
let tray = null;

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

// Hide the application from the dock (macOS only, doesn't affect Windows tray)
if (process.platform === 'darwin') {
  app.dock.hide();
}

app.whenReady().then(() => {
  // Set the app to run on startup
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true
  });

  // Create a Tray icon so the user can close the background server
  let iconPath = path.join(__dirname, 'public', 'vercel.svg');
  // Fallback to empty image if not found, though Windows might not render empty well, 
  // it prevents crashes.
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'إغلاق السيرفر', click: () => app.quit() }
  ]);
  
  tray.setToolTip('سيرفر الحضور والانصراف (يعمل في الخلفية)');
  tray.setContextMenu(contextMenu);

  // Path to the Next.js standalone server
  let serverPath = path.join(__dirname, '.next', 'standalone', 'server.js');
  
  if (serverPath.includes('app.asar')) {
    serverPath = serverPath.replace('app.asar', 'app.asar.unpacked');
  }

  const standaloneDir = path.dirname(serverPath);

  // Set environment variables for the Next.js server
  const serverEnv = Object.assign({}, process.env, {
    PORT: '3000',
    HOSTNAME: '127.0.0.1',
    NODE_ENV: 'production',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000'
  });

  const { spawn, exec } = require('child_process');

  // Spawn npm run dev instead of standalone server
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  serverProcess = spawn(npmCmd, ['run', 'dev'], {
    cwd: __dirname,
    stdio: 'ignore', // Ignore logs to save resources in background
    windowsHide: true, // Prevent command prompt from appearing on Windows
    detached: false
  });

  // Wait for the server to be ready, then open the Vercel link
  waitForPort(3000)
    .then(() => {
      shell.openExternal('https://zk-test-jet.vercel.app');
    })
    .catch((err) => {
      console.error('Server did not start in time:', err);
    });
});

// Do not quit when windows close, because there are no windows.

app.on('before-quit', () => {
  if (serverProcess) {
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      exec(`taskkill /pid ${serverProcess.pid} /T /F`);
    } else {
      serverProcess.kill();
    }
  }
});
