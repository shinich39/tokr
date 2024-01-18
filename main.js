const {
  app,
  BrowserWindow,
  BrowserView,
  ipcMain,
  Menu,
  MenuItem,
} = require('electron');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const clipboard = require('electron-clipboard-extended');
const LanguageDetect = require('languagedetect');
const lngDetector = new LanguageDetect();
lngDetector.setLanguageType("iso2");
const {
  isMac,
  isWin,
  isLinux,
  getPid,
  getPath,
  getWindow,
  setEventLimit,
  alert,
  confirm,
  send,
  receive,
  handle,
} = require('./libs/utils');

const createMenu = () => {
  const menu = isMac() ? {
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
    View: [
      { role: 'reload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ],
    Window: [
      { id: "always-on-top", type: "checkbox", label: "Always on Top", click: toggleAlwaysOnTop, checked: false, },
      { type: 'separator' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' },
      { type: 'separator' },
      { role: 'window' }
    ],
  } : {
    File: [
      { role: 'quit' }
    ],
    View: [
      { role: 'reload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ],
    Window: [
      { id: "always-on-top", type: "checkbox", label: "Always on Top", click: toggleAlwaysOnTop, checked: false, },
      { type: 'separator' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'close' }
    ],
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
}

createMenu();

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, "resources/icons/512x512.png"),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      worldSafeExecuteJavaScript: true,
      contextIsolation: true, // https://www.electronjs.org/docs/latest/tutorial/security
      nodeIntegration: false,
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile('index.html');
  
  // Open the DevTools.
  // win.webContents.openDevTools();

  // Set event listeners.
  mainWindow.webContents.on("did-finish-load", function() {
    console.log("Electron window loaded");
    
    // set always on top
    enableAlwaysOnTop();

    // set config
    mainWindow.webContents.send("set-config", {
      languages: LANGUAGES
    });
  });

  mainWindow.webContents.on("close", function() {
    console.log("Electron window closed");
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  startWatch();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopWatch();
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

const LANGUAGES = JSON.parse(fs.readFileSync(path.join(__dirname, "libs", "langs.json")));
const PROVIDERS = JSON.parse(fs.readFileSync(path.join(__dirname, "libs", "providers.json"))).filter(function(item) { return item.enabled; });
const FULL_STOPS = ["\.","\!","\?","\。","\n"];
const LOG_DIR_PATH = path.join(__dirname, "logs");
const LOG_FILE_PATH = path.join(LOG_DIR_PATH, moment().format("YYYY-MM-DD") + ".txt");
let MAX_LENGTH = 256;
let MAX_PROCESS = PROVIDERS.length;
let isWatched = false;
let mainWindow;
let config;
let queueIndex = 0;
let queue = [];

// check log dir
if (!fs.existsSync(LOG_DIR_PATH)) {
  fs.mkdirSync(LOG_DIR_PATH);
}

// check log file
if (!fs.existsSync(LOG_FILE_PATH)) {
  fs.writeFileSync(LOG_FILE_PATH, "", { encoding: "utf-8" });
}

ipcMain.on("set-config", function(e, req) {
  config = {
    from: req.from,
    to: req.to,
  };

  console.log("Set config:", config);
});

ipcMain.on("translate", function(e, req) {
  const { id, error, result } = req;
  const task = queue.find(function(item) {
    return item.id === id;
  });

  if (task.isProcessed) {
    startTask();
    return;
  }

  console.log("Translated:", task.id);

  task.inProgress = false;
  task.isProcessed = true;
  task.isRendered = true;
  task.processedAt = Date.now();
  if (error) {
    task.isErrored = true;
    task.result = error;
  } else {
    task.isTranslated = true;
    task.result = result;
  }

  // update dom element
  mainWindow.webContents.send("update-log", {
    id: task.id,
    text: task.result,
  });

  startTask();
});

function toggleAlwaysOnTop() {
  if (mainWindow && mainWindow.isAlwaysOnTop()) {
    disableAlwaysOnTop();
  } else {
    enableAlwaysOnTop();
  }
}

function enableAlwaysOnTop() {
  if (!mainWindow.isAlwaysOnTop()) {
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    mainWindow.setAlwaysOnTop(true, "floating");
    mainWindow.setFullScreenable(false);
    mainWindow.moveTop();
    Menu.getApplicationMenu().getMenuItemById('always-on-top').checked = true;
  }
}

function disableAlwaysOnTop() {
  if (mainWindow.isAlwaysOnTop()) {
    mainWindow.setAlwaysOnTop(false, "normal");
    Menu.getApplicationMenu().getMenuItemById('always-on-top').checked = false;
  }
}

function startWatch() {
  if (!isWatched) {
    clipboard.on("text-changed", onChange);
    clipboard.startWatching();
    isWatched = true;
    console.log("Electron watch started");
  }
}

function stopWatch() {
  if (isWatched) {
    clipboard.off("text-changed");
    clipboard.stopWatching();
    isWatched = false;
    console.log("Electron watch stopped");
  }
}

function saveLogs() {
  const prev = fs.readFileSync(LOG_FILE_PATH, { encoding: "utf-8" });

  let curr = "";
  for (const task of queue) {
    if (task.isLogged) {
      continue;
    }
    task.isLogged = true;
    curr += moment(task.createdAt).format("YYYY-MM-DD hh:mm:ss") + "\/" + task.provider.name + "\/" + task.from + "\/" + task.to + "\n" + task.text + "\n" + task.result + "\n";
  }

  fs.writeFileSync(LOG_FILE_PATH, prev + curr, { encoding: "utf-8", flag: "w" });
}

function normalize(text) {
  const result = [];
  let i = 0;
  let offset = 0;
  while(i < text.length) {
    const char = text[i];
    if (FULL_STOPS.indexOf(char) > -1 || i - offset >= MAX_LENGTH) {
      i++;
      const str = text.substring(offset, i).trim();
      if (str.length > 0) {
        result.push(str);
      }
      offset = i;
    }
    i++;
  }

  const lastStr = text.substring(offset, i).trim();
  if (lastStr.length > 0) {
    result.push(lastStr);
  }

  return result;
}

function generateURL(url, text, from, to) {
  return url
    .replace("<TEXT>", text)
    .replace("<FROM>", from)
    .replace("<TO>", to);
}

function getLocaleByText(text) {
  return lngDetector.detect(text, 1);
}

function getLocaleByLang(lang) {
  return new Intl.Locale(lang).language;
}

function createTask(id, text) {
  // choose provider
  const provider = PROVIDERS[id % PROVIDERS.length];

  // create task
  const task = {
    id: id,
    text: text,
    provider: provider,
    from: config.from,
    to: config.to,
    window: null,
    inProgress: false,
    isProcessed: false,
    isTranslated: false,
    isErrored: false,
    isRendered: false,
    isLogged: false,
    url: generateURL(provider.url, text, config.from, config.to),
    error: null,
    result: null,
    window: null,
    createdAt: Date.now(),
    processedAt: null,
    renderedAt: null,
  }

  // push task
  queue.push(task);

  // create dom element
  mainWindow.webContents.send("create-log", {
    id: id,
    text: text,
    provider: provider.name,
  });

  // create view window
  task.window = new BrowserView({
    // icon: path.join(__dirname, "resources/icons/512x512.png"),
    webPreferences: {
      offscreen: true,
      preload: path.join(__dirname, 'translator.js'),
      worldSafeExecuteJavaScript: true,
      contextIsolation: true, // https://www.electronjs.org/docs/latest/tutorial/security
      nodeIntegration: false,
    }
  });

  // Open the DevTools.
  // task.window.webContents.openDevTools();

  // task.window.webContents.setFrameRate(30);
}

function startTask() {
  let processCount = 0;
  let completeCount = 0;
  for (let i = 0; i < queue.length; i++) {
    const task = queue[i];
    
    if (processCount >= MAX_PROCESS) {
      break;
    }
    if (task.isProcessed) {
      completeCount++;
      continue;
    }
    if (task.inProgress) {
      processCount++;
      continue;
    }

    console.log("Start translate:", task.id);

    task.inProgress = true;

    // set event
    task.window.webContents.on("did-finish-load", function() {
      // console.log("Translator window loaded");
  
      // start translate
      task.window.webContents.send("translate", {
        id: task.id,
        query: task.provider.query,
        extract: task.provider.extract,
      });
  
    });

    // load task url
    task.window.webContents.loadURL(task.url);

    // set timeout 10000ms + 1024ms
    setTimeout(function(item) {
      if (!task.isRendered) {
        console.log("Time out:", task.id);

        task.inProgress = false;
        task.isProcessed = true;
        task.isRendered = true;
        task.isErrored = true;
        task.processedAt = Date.now();
        task.result = "TIME OUT";
      
        // update dom element
        mainWindow.webContents.send("update-log", {
          id: task.id,
          text: task.result,
        });

        startTask();
      }
    }, 11024);

    processCount++;
  }

  // end
  if (completeCount === queue.length) {
    console.log("End translate.");
    saveLogs();
  }
}

// add translate queue
async function onChange() {
  try {
    const copiedText = clipboard.readText();
    const textArray = normalize(copiedText);
    const startIndex = queueIndex;
    queueIndex += textArray.length;

    console.log("Input:", textArray.length);
    // console.log("Start index:", startIndex);
    // console.log("End index:", queueIndex);
    
    for (let i = 0; i < textArray.length; i++) {
      const text = textArray[i];
      const index = startIndex + i;

      console.log("Create task:", index);
      
      createTask(index, text);
    }

    startTask();
  } catch(err) {
    console.error(err);
  }
}