const { app, shell, Tray, Menu, nativeImage, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { fork, execSync } = require('child_process');
const net = require('net');
const fs = require('fs');

let serverProcess = null;
let tray = null;
let logWindow = null;
let isQuitting = false;
let restartCount = 0;
let lastRestartTime = Date.now();

// --- Auto-updater setup via electron-updater ---
let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch (e) {
  console.error('Failed to load electron-updater:', e);
}

const updateState = {
  status: 'idle', // 'idle' | 'checking' | 'downloading' | 'downloaded' | 'error'
  info: null,
  progress: 0,
  error: null,
  isManualCheck: false
};

function showRunningNotification() {
  if (tray && process.platform === 'win32') {
    tray.displayBalloon({
      iconType: 'info',
      title: 'Trivvo Hr',
      content: 'السيرفر يعمل في الخلفية بشكل جيد.'
    });
  }
}

// --- Set Application Identity for Windows Task Manager & Taskbar ---
app.setName('Trivvo Hr');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.hesabate.attendance');
}

// --- Multi-path Robust Icon Resolver ---
function getAppIcon() {
  const candidates = [
    path.join(__dirname, 'build', 'icons', 'icon.ico'),
    path.join(process.resourcesPath || '', 'build', 'icons', 'icon.ico'),
    path.join(__dirname, 'public', 'icon.ico'),
    path.join(process.resourcesPath || '', 'standalone', 'public', 'icon.ico'),
    path.join(__dirname, 'build', 'icons', '32x32.png'),
    path.join(__dirname, 'build', 'icons', '48x48.png'),
    path.join(__dirname, 'public', 'icon.png'),
    path.join(process.resourcesPath || '', 'standalone', 'public', 'icon.png'),
    path.join(__dirname, 'build', 'icon.png'),
  ];

  for (const p of candidates) {
    if (p && fs.existsSync(p)) {
      try {
        const img = nativeImage.createFromPath(p);
        if (!img.isEmpty()) {
          return { image: img, path: p };
        }
      } catch (e) {
        // Continue to next candidate
      }
    }
  }

  return { image: nativeImage.createEmpty(), path: '' };
}

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
  app.on('second-instance', () => {
    showRunningNotification();
  });

  app.whenReady().then(() => {
    // Set the app to run on Windows startup
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true
    });

    // --- Create Tray Icon ---
    const appIconInfo = getAppIcon();
    tray = new Tray(appIconInfo.image);

    tray.setToolTip('Trivvo Hr - سيرفر الحضور والانصراف (يعمل في الخلفية)');
    // A normal click only confirms that the background server is running.
    tray.on('click', showRunningNotification);

    Menu.setApplicationMenu(null);

    // --- Create a visible log window ---
    logWindow = new BrowserWindow({
      width: 820,
      height: 520,
      title: 'Trivvo Hr - سيرفر الحضور والانصراف (localhost:3000)',
      backgroundColor: '#1e1e1e',
      icon: appIconInfo.image,
      show: false, // Run silently in background
      skipTaskbar: true,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const logHTML = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="utf-8">
        <style>
          body {
            background: #1e1e1e; color: #00ff66; font-family: 'Segoe UI', Tahoma, Consolas, monospace;
            font-size: 13px; padding: 12px; margin: 0; overflow-y: auto;
          }
          #log { white-space: pre-wrap; word-wrap: break-word; font-family: Consolas, monospace; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 10px; }
          h2 { color: #00d2ff; margin: 0; font-size: 16px; }
          .badge { background: #006633; color: #fff; padding: 3px 8px; border-radius: 12px; font-size: 12px; }
          .error { color: #ff5555; }
          .info { color: #ffcc00; }
          .success { color: #00ff66; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>⚡ خادم نظام الحضور والانصراف (Trivvo Hr)</h2>
          <span class="badge" id="statusBadge">يعمل في الخلفية</span>
        </div>
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
        </script>
      </body>
      </html>
    `;

    logWindow.webContents.setMaxListeners(50);
    logWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(logHTML));

    logWindow.on('close', (e) => {
      if (!isQuitting) {
        e.preventDefault();
        logWindow.hide();
      }
    });

    function sendLog(msg, cls = '') {
      if (logWindow && !logWindow.isDestroyed()) {
        logWindow.webContents.executeJavaScript(
          `(function(){ var el = document.getElementById('log'); if(el){ var d = document.createElement('div'); d.className = '${cls}'; d.textContent = ${JSON.stringify(String(msg))}; el.appendChild(d); window.scrollTo(0, document.body.scrollHeight); } })()`
        ).catch(() => {});
      }
    }

    // --- Dynamic Tray Menu & Auto-updater Management ---
    function updateTrayMenu() {
      if (!tray) return;

      const menuItems = [
        {
          label: 'عرض سجل السيرفر',
          click: () => {
            if (logWindow) {
              logWindow.show();
              logWindow.focus();
            }
          }
        },
        {
          label: 'إعادة تشغيل السيرفر',
          click: () => startServer()
        },
        { type: 'separator' }
      ];

      if (updateState.status === 'downloaded') {
        const newVer = updateState.info && updateState.info.version ? ` (v${updateState.info.version})` : '';
        menuItems.push({
          label: `⚡ تثبيت التحديث الآن${newVer} وإعادة التشغيل`,
          click: () => {
            const choice = dialog.showMessageBoxSync({
              type: 'question',
              buttons: ['تثبيت وإعادة التشغيل الآن', 'لاحقًا'],
              defaultId: 0,
              cancelId: 1,
              title: 'تحديث Trivvo Hr',
              message: `تم تنزيل الإصدار الجديد${newVer} بنجاح.`,
              detail: 'هل ترغب في تثبيت التحديث وإعادة تشغيل التطبيق الآن؟ سيتم إغلاق السيرفر وإعادة تشغيله فور التثبيت.'
            });
            if (choice === 0) {
              isQuitting = true;
              if (serverProcess) {
                try {
                  if (process.platform === 'win32') {
                    execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { windowsHide: true });
                  } else {
                    serverProcess.kill();
                  }
                } catch (e) {}
                serverProcess = null;
              }
              if (autoUpdater) {
                autoUpdater.quitAndInstall(false, true);
              }
            }
          }
        });
        menuItems.push({ type: 'separator' });
      } else if (updateState.status === 'downloading') {
        menuItems.push({
          label: `📥 جاري تنزيل التحديث (${updateState.progress}%)...`,
          enabled: false
        });
        menuItems.push({ type: 'separator' });
      } else if (updateState.status === 'checking') {
        menuItems.push({
          label: '🔍 جاري التحقق من التحديثات...',
          enabled: false
        });
        menuItems.push({ type: 'separator' });
      } else {
        menuItems.push({
          label: 'التحقق من وجود تحديثات...',
          click: () => checkForUpdates(true)
        });
        menuItems.push({ type: 'separator' });
      }

      menuItems.push({
        label: `الإصدار الحالي: v${app.getVersion()}`,
        enabled: false
      });

      menuItems.push({ type: 'separator' });

      menuItems.push({
        label: 'إغلاق السيرفر بالكامل',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      });

      const contextMenu = Menu.buildFromTemplate(menuItems);
      tray.setContextMenu(contextMenu);
    }

    function checkForUpdates(manual = false) {
      if (!autoUpdater) {
        if (manual) {
          dialog.showMessageBox({
            type: 'warning',
            title: 'تحديث البرنامج',
            message: 'مكتبة التحديثات التلقائية غير مهيأة.'
          });
        }
        return;
      }

      if (!app.isPackaged) {
        sendLog(`ℹ️ التحقق من التحديثات متاح فقط في النسخة المثبتة (Production). الإصدار الحالي: v${app.getVersion()}`, 'info');
        if (manual) {
          dialog.showMessageBox({
            type: 'info',
            title: 'تحديث البرنامج (وضع التطوير)',
            message: 'أنت تعمل حالياً في وضع التطوير (Development Mode).',
            detail: `الإصدار الحالي: v${app.getVersion()}\nنظام التحديث التلقائي يفحص GitHub Releases عند تثبيت التطبيق الفعلي على أجهزة العملاء.`
          });
        }
        return;
      }

      updateState.isManualCheck = manual;
      updateState.status = 'checking';
      updateTrayMenu();
      sendLog(manual ? '🔍 جاري فحص التحديثات يدويًا من GitHub...' : '🔍 جاري فحص وجود تحديثات تلقائية من GitHub...', 'info');

      autoUpdater.checkForUpdates().catch((err) => {
        updateState.status = 'error';
        updateState.error = err ? (err.message || String(err)) : 'Unknown error';
        sendLog(`⚠️ تعذر التحقق من التحديثات: ${updateState.error}`, 'error');
        updateTrayMenu();
        if (manual) {
          dialog.showMessageBox({
            type: 'error',
            title: 'فحص التحديثات',
            message: 'تعذر الاتصال بـ GitHub للتحقق من التحديثات.',
            detail: 'تأكد من اتصال الإنترنت ثم حاول مرة أخرى.\n' + updateState.error
          });
        }
      });
    }

    function setupAutoUpdater() {
      if (!autoUpdater) return;

      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = true;

      autoUpdater.logger = {
        info: (msg) => { console.log(msg); sendLog(`[Update] ${msg}`, 'info'); },
        warn: (msg) => { console.warn(msg); sendLog(`[Update] ${msg}`, 'info'); },
        error: (msg) => { console.error(msg); sendLog(`[Update Error] ${msg}`, 'error'); },
        debug: () => {}
      };

      autoUpdater.on('checking-for-update', () => {
        updateState.status = 'checking';
        sendLog('🔍 جاري فحص وجود تحديثات جديدة للتطبيق على GitHub Releases...', 'info');
        updateTrayMenu();
      });

      autoUpdater.on('update-available', (info) => {
        updateState.status = 'downloading';
        updateState.info = info;
        const msg = `🚀 تم العثور على إصدار جديد (v${info.version})! جاري تنزيل التحديث في الخلفية...`;
        sendLog(msg, 'success');
        if (tray && process.platform === 'win32') {
          tray.displayBalloon({
            iconType: 'info',
            title: 'تحديث جديد متوفر (Trivvo Hr)',
            content: `تم العثور على الإصدار ${info.version}. جاري تنزيله في الخلفية دون مقاطعة العمل.`
          });
        }
        updateTrayMenu();
      });

      autoUpdater.on('update-not-available', (info) => {
        const wasManual = updateState.isManualCheck;
        updateState.status = 'idle';
        updateState.isManualCheck = false;
        sendLog(`✅ التطبيق محدّث إلى أحدث إصدار متوفر (v${app.getVersion()}).`, 'success');
        updateTrayMenu();
        if (wasManual) {
          dialog.showMessageBox({
            type: 'info',
            title: 'تحديث البرنامج',
            message: 'أنت تستخدم أحدث إصدار بالفعل!',
            detail: `الإصدار الحالي: v${app.getVersion()}`
          });
        }
      });

      autoUpdater.on('download-progress', (progressObj) => {
        const percent = Math.floor(progressObj.percent || 0);
        if (percent !== updateState.progress) {
          updateState.progress = percent;
          updateTrayMenu();
          if (percent === 25 || percent === 50 || percent === 75 || percent === 100) {
            sendLog(`📥 تحميل التحديث: ${percent}%...`, 'info');
          }
        }
      });

      autoUpdater.on('update-downloaded', (info) => {
        updateState.status = 'downloaded';
        updateState.info = info;
        const msg = `🎉 تم تنزيل التحديث بنجاح (الإصدار v${info.version})! جاهز للتثبيت.`;
        sendLog(msg, 'success');
        if (tray && process.platform === 'win32') {
          tray.displayBalloon({
            iconType: 'info',
            title: '🎉 التحديث جاهز للتثبيت',
            content: `تم تنزيل الإصدار ${info.version} بنجاح. انقر بالزر الأيمن على الأيقونة لاختيار "تثبيت التحديث الآن" أو سيتم تثبيته تلقائيًا عند إعادة التشغيل القادمة.`
          });
        }
        updateTrayMenu();
      });

      autoUpdater.on('error', (err) => {
        const wasManual = updateState.isManualCheck;
        updateState.status = 'error';
        updateState.isManualCheck = false;
        updateState.error = err ? (err.message || String(err)) : 'خطأ غير معروف';
        sendLog(`⚠️ خطأ في نظام التحديثات: ${updateState.error}`, 'error');
        updateTrayMenu();
        if (wasManual) {
          dialog.showMessageBox({
            type: 'error',
            title: 'خطأ في التحديث',
            message: 'حدث خطأ أثناء فحص أو تنزيل التحديث.',
            detail: updateState.error
          });
        }
      });
    }

    // Initialize autoUpdater events and set up initial tray menu
    setupAutoUpdater();
    updateTrayMenu();

    // --- Server Process Lifecycle & Watchdog ---
    function startServer() {
      if (serverProcess) {
        try {
          if (process.platform === 'win32') {
            execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { windowsHide: true });
          } else {
            serverProcess.kill();
          }
        } catch (e) {}
        serverProcess = null;
      }

      const serverPath = resolveServerPath();
      const standaloneDir = path.dirname(serverPath);

      sendLog('📁 مسار ملف السيرفر: ' + serverPath, 'info');

      if (!fs.existsSync(serverPath)) {
        const errMsg = '❌ ملف السيرفر غير موجود: ' + serverPath;
        sendLog(errMsg, 'error');
        dialog.showErrorBox('خطأ في السيرفر', errMsg);
        return;
      }

      const serverEnv = Object.assign({}, process.env, {
        PORT: process.env.PORT || '3000',
        HOSTNAME: '0.0.0.0',
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_URL: `http://localhost:${process.env.PORT || '3000'}`
      });

      const envPath = path.join(standaloneDir, '.env');
      if (fs.existsSync(envPath)) {
        try {
          const envContent = fs.readFileSync(envPath, 'utf-8');
          envContent.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
              const eqIdx = trimmed.indexOf('=');
              if (eqIdx > 0) {
                const key = trimmed.substring(0, eqIdx).trim();
                let val = trimmed.substring(eqIdx + 1).trim();
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                  val = val.slice(1, -1);
                }
                serverEnv[key] = val;
              }
            }
          });
          sendLog('✅ تم تحميل إعدادات البيئة من .env', 'info');
        } catch (e) {
          sendLog('⚠️ تحذير أثناء قراءة .env: ' + e.message, 'info');
        }
      }

      sendLog('🚀 جاري تشغيل سيرفر Trivvo Hr على http://localhost:' + serverEnv.PORT + ' ...', 'info');

      try {
        serverProcess = fork(serverPath, [], {
          cwd: standaloneDir,
          env: serverEnv,
          silent: true,
          windowsHide: true
        });

        if (serverProcess.stdout) {
          serverProcess.stdout.on('data', (data) => {
            sendLog(data.toString().trim());
          });
        }

        if (serverProcess.stderr) {
          serverProcess.stderr.on('data', (data) => {
            sendLog(data.toString().trim(), 'error');
          });
        }

        serverProcess.on('error', (err) => {
          sendLog('❌ خطأ في عملية السيرفر: ' + err.message, 'error');
        });

        serverProcess.on('exit', (code) => {
          if (!isQuitting) {
            sendLog(`⚠️ توقف السيرفر برمز خروج: ${code}`, 'error');
            // Auto-recovery watchdog: Restart after short delay if unexpected exit
            const now = Date.now();
            if (now - lastRestartTime > 60000) {
              restartCount = 0;
            }
            lastRestartTime = now;
            restartCount++;

            if (restartCount <= 4) {
              sendLog(`🔄 جاري إعادة تشغيل السيرفر تلقائياً (محاولة ${restartCount}/4)...`, 'info');
              setTimeout(() => {
                if (!isQuitting) startServer();
              }, 2500);
            } else {
              sendLog('❌ تجاوز الحد الأقصى لمحاولات إعادة التشغيل.', 'error');
            }
          }
        });

        sendLog('✅ تم بدء عملية السيرفر بنجاح (PID: ' + serverProcess.pid + ')', 'success');

      } catch (err) {
        sendLog('❌ فشل في تشغيل السيرفر: ' + err.message, 'error');
        dialog.showErrorBox('خطأ', 'فشل في تشغيل السيرفر: ' + err.message);
        return;
      }

      const checkPort = parseInt(serverEnv.PORT || '3000');
      waitForPort(checkPort)
        .then(() => {
          sendLog(`✅✅✅ السيرفر يعمل الآن بنجاح على http://localhost:${checkPort}`, 'success');
          sendLog('🌐 السيرفر جاهز لاستقبال طلبات Postman والواجهة في الخلفية.', 'success');
          if (tray && process.platform === 'win32') {
            tray.displayBalloon({
              title: 'Trivvo Hr',
              content: `السيرفر يعمل الآن بنجاح في الخلفية على http://localhost:${checkPort}`
            });
          }

          // Trigger automatic updates checking in packaged production
          if (app.isPackaged && autoUpdater) {
            // Check 15 seconds after server startup
            setTimeout(() => {
              checkForUpdates(false);
            }, 15000);

            // Check periodically every 4 hours
            setInterval(() => {
              checkForUpdates(false);
            }, 4 * 60 * 60 * 1000);
          }
        })
        .catch((err) => {
          sendLog('⚠️ تحذير: السيرفر تأخر في الاستجابة على البورت: ' + err.message, 'error');
        });
    }

    // Start server initially
    startServer();
  });

  // --- Cleanup on quit ---
  app.on('before-quit', () => {
    isQuitting = true;
    if (logWindow && !logWindow.isDestroyed()) {
      logWindow.removeAllListeners('close');
      logWindow.close();
    }

    if (serverProcess) {
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { windowsHide: true });
        } else {
          serverProcess.kill();
        }
      } catch (e) {}
    }
  });
}
