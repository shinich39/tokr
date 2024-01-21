const {
    contextBridge,
    ipcRenderer,
} = require('electron');

const invoke = function(channel, value) {
    return ipcRenderer.invoke(channel, value)
}

const send = function(channel, value) {
    ipcRenderer.send(channel, value);
}

const receive = function(channel, listener) {
    ipcRenderer.on(channel, listener);
}

window.addEventListener('DOMContentLoaded', function() {
    receive("translate", function(e, req) {
        const { id, query, extract } = req;
        let count = 0;
        let intervalID = setInterval(function() {
            // if (count > 100) {
            //     clearInterval(intervalID);
            //     send("translate", {
            //         id: id,
            //         error: "TIME OUT",
            //     });
            //     return;
            // }
    
            const element = document.querySelector(query);
            if (!element) {
                count++;
                return;
            }
    
            clearInterval(intervalID);

            const result = extract === "text" ? element.textContent : (extract === "value" ? element.value : "METHOD NOT FOUND");
    
            send("translate", {
                id: id,
                result: result,
            });
        }, 100);
    });    
});