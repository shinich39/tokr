const { invoke, send, receive } = window.electron;

const fromElem = document.getElementById("from");
const toElem = document.getElementById("to");
const logElem = document.getElementById("logs");

function scrollToBottom(element) {
    element.scrollTo(0, element.scrollHeight);
}

receive("set-config", function(e, req) {
    const { languages } = req;

    // from
    for (const lang of languages) {
        const opt = document.createElement("option");
        opt.value = lang.code;
        opt.textContent = lang.name.length <= 10 ? lang.name : lang.name.substring(0,7) + "...";
        fromElem.appendChild(opt);
    }

    // to
    for (const lang of languages) {
        const opt = document.createElement("option");
        opt.value = lang.code;
        opt.textContent = lang.name.length <= 10 ? lang.name : lang.name.substring(0,7) + "...";
        toElem.appendChild(opt);

        if (lang.code === "ko") {
            opt.selected = true;
        }
    }

    // init
    send("set-config", {
        from: fromElem.value,
        to: toElem.value,
    });
});

receive("create-log", function(e, req) {
    const { id, text, provider } = req;

    console.log("create-log:", id);

    const li = document.createElement("li");
    li.id = "log-" + id;
    li.setAttribute("data-provider", provider);
    li.innerHTML = "<strong>"+text+"</strong>";
    logElem.appendChild(li);

    scrollToBottom(logElem);
});

receive("update-log", function(e, req) {
    const { id, text } = req;

    console.log("update-log:", id);

    const li = document.getElementById("log-"+id);
    if (li) {
        li.innerHTML += "<br />" + text;
    }
});

[fromElem, toElem].forEach(function(elem) {
    elem.addEventListener("change", function(e) {
        send("set-config", {
            from: fromElem.value,
            to: toElem.value,
        });
    });
});