const { invoke, send, receive } = window.electron;

const fromElem = document.getElementById("from");
const toElem = document.getElementById("to");
const provElem = document.getElementById("provider");
const logElem = document.getElementById("logs");

function scrollToBottom(element) {
    element.scrollTo(0, element.scrollHeight);
}

receive("set-config", function(e, req) {
    const { languages, providers } = req;

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

    // providers
    for (const prov of providers) {
        const opt = document.createElement("option");
        opt.value = prov.name;
        opt.textContent = prov.name;
        provElem.appendChild(opt);

        if (prov.name === "Google") {
            opt.selected = true;
        }
    }

    // init
    send("set-config", {
        from: fromElem.value,
        to: toElem.value,
        provider: provElem.value,
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

    scrollToBottom(logElem);
});

[fromElem, toElem, provElem].forEach(function(elem) {
    elem.addEventListener("change", function(e) {
        send("set-config", {
            from: fromElem.value,
            to: toElem.value,
            provider: provElem.value,
        });
    });
});