// WikiDerby desktop: a dedicated window onto wikiderby.io. The game needs its
// server (multiplayer, accounts, shop, Wikipedia proxy), so this wraps the live
// site rather than bundling it. Anything off-site opens in the system browser.
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

const HOME = 'https://wikiderby.io/';
const isOurs = (url) => {
  try { return /(^|\.)wikiderby\.io$/.test(new URL(url).hostname); } catch { return false; }
};

// One window only; a second launch just focuses the first.
if (!app.requestSingleInstanceLock()) app.quit();

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    title: 'WikiDerby',
    icon: path.join(__dirname, 'build/icon.png'),
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  Menu.setApplicationMenu(null);

  // Stripe checkout and other external pages go to the real browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isOurs(url)) { win.loadURL(url); } else { shell.openExternal(url); }
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!isOurs(url)) { e.preventDefault(); shell.openExternal(url); }
  });

  // F11 fullscreen, F5 / Ctrl+R reload, Ctrl+Shift+I devtools.
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    const ctrl = input.control || input.meta;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if (input.key === 'F5' || (ctrl && input.key.toLowerCase() === 'r')) { win.reload(); e.preventDefault(); }
    else if (ctrl && input.shift && input.key.toLowerCase() === 'i') { win.webContents.toggleDevTools(); e.preventDefault(); }
  });

  win.webContents.on('did-fail-load', (_e, code, _desc, url, isMain) => {
    if (!isMain || code === -3) return; // -3 = aborted, normal on redirects
    win.loadURL('data:text/html,' + encodeURIComponent(
      `<body style="background:#000;color:#fff;font-family:'Comic Sans MS',sans-serif;display:grid;place-items:center;height:100vh;margin:0">
       <div style="text-align:center"><h1>Can't reach WikiDerby</h1><p>Check your connection.</p>
       <button onclick="location.href='${HOME}'" style="font:inherit;padding:8px 20px;border-radius:0">Try again</button></div></body>`));
  });

  win.loadURL(HOME);
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
