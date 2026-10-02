const { app, BrowserWindow, protocol, net, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

// Built React frontend, served offline via a custom scheme.
// /api and /media are forwarded to the live backend (sound sets etc.).
const BUILD_DIR = path.join(__dirname, 'build');
const REMOTE = process.env.LIBREMETRONOME_BACKEND || 'https://libremetronome.com';

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1100, height: 800, title: 'Libre Metronome', autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
  });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.loadURL('app://lm/');
}

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const { pathname, search } = new URL(request.url);
    if (pathname.startsWith('/api/') || pathname.startsWith('/media/')) {
      return net.fetch(REMOTE + pathname + search, { method: request.method, headers: request.headers, body: request.body, duplex: 'half' });
    }
    const rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
    const file = path.normalize(path.join(BUILD_DIR, rel));
    if (!file.startsWith(BUILD_DIR)) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString()).catch(() =>
      net.fetch(pathToFileURL(path.join(BUILD_DIR, 'index.html')).toString()));
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => app.quit());
