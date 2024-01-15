const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell,
  Menu,
} = require('electron');

const utils = {
  _app: app.name,
  _pid: process.pid,
  _isMac: process.platform === 'darwin',
  _isWin: process.platform === 'win32',
  _isLinux: process.platform === 'linux',
  _HomePath: app.getPath("home"),
  _appPath: app.getPath("appData"),
  _userPath: app.getPath("userData"),
  _sessionPath: app.getPath("sessionData"),
  _tempPath: app.getPath("temp"),
  _exePath: app.getPath("exe"),
  _modulePath: app.getPath("module"),
  _desktopPath: app.getPath("desktop"),
  _documentsPath: app.getPath("documents"),
  _downloadsPath: app.getPath("downloads"),
  _picturesPath: app.getPath("pictures"),
  _videosPath: app.getPath("videos"),
  _musicPath: app.getPath("music"),
  _logsPath: app.getPath("logs"),
  _crashDumpsPath: app.getPath("crashDumps"),
  
  isMac: function() {
    return utils._isMac;
  },
  isWin: function() {
    return utils._isWin;
  },
  isLinux: function() {
    return utils._isLinux;
  },
  getAppName: function() {
    return utils._app;
  },
  getPath: function() {
    return {
      documents: utils._documentsPath,
      desktop: utils._desktopPath,
      downloads: utils._downloadsPath,
      home: utils._HomePath,
      app: utils._appPath,
      user: utils._userPath,
      session: utils._sessionPath,
      temp: utils._tempPath,
      exe: utils._exePath,
      module: utils._modulePath,
      desktop: utils._desktopPath,
      documents: utils._documentsPath,
      downloads: utils._downloadsPath,
      pictures: utils._picturesPath,
      videos: utils._videosPath,
      music: utils._musicPath,
      logs: utils._logsPath,
      crashDumps: utils._crashDumpsPath,
    }
  },
  getPid: function() {
    return utils._pid;
  },
  getWindow: function() {
    return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  },
  setEventLimit: function(n) {
    require('events').EventEmitter.defaultMaxListeners = n || 10; // default 10
  },
  alert: function(title, message) {
    if (!message) {
      dialog.showMessageBoxSync({
        message: title
      });
    } else {
      dialog.showMessageBoxSync({
        title: title,
        message: message
      });
    }
  },
  confirm: async function(title, message) {
    if (!message) {
      const { response } = await dialog.showMessageBox({
        type: 'info',
        buttons: ['확인', '취소'],
        cancelId: 1,
        defaultId: 0,
        title: message,
      });

      return response === 0;
    } else {
      const { response } = await dialog.showMessageBox({
        type: 'info',
        buttons: ['확인', '취소'],
        cancelId: 1,
        defaultId: 0,
        title: title,
        detail: message,
      });

      return response === 0;
    }
  },
  send: function(channel, data) {
    const win = utils.getWindow();
    if (!win) {
      throw new Error("Window not found");
    }
    win.webContents.send(channel, data);
  },
  receive: function(channel, listener) {
    ipcMain.on(channel, listener);
  },
  handle: function(channel, listener) {
    ipcMain.handle(channel, listener);
  },
  setMenu: function() {
    const menu = utils._isMac ? {
      [app.name]: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ],
      File: [
        { role: 'close' }
      ],
      Edit: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Speech',
          submenu: [
            { role: 'startSpeaking' },
            { role: 'stopSpeaking' }
          ]
        }
      ],
      View: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ],
      Window: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ],
      Help: [
        {
          label: 'Learn More',
          accelerator: "Cmd + H",
          click: async function() {
            const { shell } = require('electron');
            await shell.openExternal('https://electronjs.org')
          }
        }
      ]
    } : {
      File: [
        { role: 'quit' }
      ],
      Edit: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ],
      View: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ],
      Window: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close' }
      ],
      Help: [
        {
          label: 'Learn More',
          accelerator: "Ctrl + H",
          click: async function() {
            const { shell } = require('electron');
            await shell.openExternal('https://electronjs.org')
          }
        }
      ]
    };
    
    const tmp = [];
    for (const label of Object.keys(menu)) {
      tmp.push({
        label: label,
        submenu: menu[label],
      });
    }
    
    const template = Menu.buildFromTemplate(tmp);

    Menu.setApplicationMenu(template);
  },
}

module.exports = utils;