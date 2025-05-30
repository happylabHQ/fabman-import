const { app, BrowserWindow } = require('electron');
const path = require('path');

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    // Only allow Fabman API
    if (url.startsWith('https://fabman.io')) {
        event.preventDefault();
        callback(true);
    } else {
        callback(false);
    }
});

function createWindow() {
  // Get the icon path - use ICNS for macOS, PNG for others
  const iconPath = process.platform === 'darwin' 
    ? path.join(__dirname, '..', 'assets', 'icon.icns')
    : path.join(__dirname, '..', 'assets', 'icon.png');
  console.log('Platform:', process.platform, 'Icon path:', iconPath);
  
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 900,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Uncomment the following line to open DevTools by default
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
}); 