const {
  contextBridge,
  ipcRenderer,
} = require('electron');

window.addEventListener('DOMContentLoaded', function() {
  // DOM loaded...
});

// window.electron 
contextBridge.exposeInMainWorld('electron', {
  process: function() {
    return {
      node: process.versions.node,
      chrome: process.versions.chrome,
      electron: process.versions.electron,
    }
  },
  invoke: function(channel, value) {
    return ipcRenderer.invoke(channel, value)
  },
  send: function(channel, value) {
    ipcRenderer.send(channel, value);
  },
  receive: function(channel, listener) {
    ipcRenderer.on(channel, listener);
  },
});