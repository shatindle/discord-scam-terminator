const { readable } = require("svelte/store");

let graylist = {}, 
    whitelist = {},
    contentreview = {},
    blacklist = {},
    maliciousinvites = {};

let tracking = {
    attempt: 0,
    ws: null,
    stop: false,
    heartbeat: null,
    initialized: false
};

const subscriptions = {
    graylist: [], 
    whitelist: [],
    contentreview: [],
    blacklist: [],
    maliciousinvites: []
};

const graylistStore = readable(undefined, set => {
    subscriptions.graylist.push(set);
    set(graylist);

    return () => subscriptions.graylist.slice(subscriptions.graylist.indexOf(set), 1);
});

const whitelistStore = readable(undefined, set => {
    subscriptions.whitelist.push(set);
    set(whitelist);

    return () => subscriptions.whitelist.slice(subscriptions.whitelist.indexOf(set), 1);
});

const contentreviewStore = readable(undefined, set => {
    subscriptions.contentreview.push(set);
    set(contentreview);

    return () => subscriptions.contentreview.slice(subscriptions.contentreview.indexOf(set), 1);
});

const blacklistStore = readable(undefined, set => {
    subscriptions.blacklist.push(set);
    set(blacklist);

    return () => subscriptions.blacklist.slice(subscriptions.blacklist.indexOf(set), 1);
})

const maliciousinvitesStore = readable(undefined, set => {
    subscriptions.maliciousinvites.push(set);
    set(maliciousinvites);

    return () => subscriptions.maliciousinvites.slice(subscriptions.maliciousinvites.indexOf(set), 1);
})

const connect = () => {
    // Create a new websocket
    const ws = new WebSocket(document.location.host === "localhost" ? "ws://localhost/" : `wss://${document.location.host}`);
    tracking.ws = ws;
    ws.addEventListener("open", (event) => {
        console.log('Now connected'); 
        tracking.attempt = 0;
        tracking.heartbeat = setInterval(() => {
            ws.send("{}");
        }, 30000);
    });
    ws.addEventListener("close", (event) => { 
        if (tracking.heartbeat) {
            clearInterval(tracking.heartbeat);
            tracking.heartbeat = null;
        }

        if (tracking.stop) {
            // do nothing, we're done
            console.log(`Connection closed cleanly.  Not reconnecting.`);
        } else if (tracking.attempt++ > 5) {
            location.reload();
        } else {
            console.log(`Connection closed. Reconnect attempt ${tracking.attempt} of 6.`);
            setTimeout(function() {
                Object.keys(graylist).forEach(key => graylist[key] = null);
                subscriptions.graylist.forEach(set => set(graylist));

                Object.keys(whitelist).forEach(key => whitelist[key] = null);
                subscriptions.whitelist.forEach(set => set(whitelist));

                Object.keys(contentreview).forEach(key => contentreview[key] = null);
                subscriptions.contentreview.forEach(set => set(contentreview));

                Object.keys(blacklist).forEach(key => blacklist[key] = null);
                subscriptions.blacklist.forEach(set => set(blacklist));

                Object.keys(maliciousinvites).forEach(key => maliciousinvites[key] = null);
                subscriptions.maliciousinvites.forEach(set => set(maliciousinvites));

                connect();
            }, 1000);
        }
    });
    ws.addEventListener("error", (event) => {
        console.error('Socket encountered error: ', event.message, 'Closing socket');
        ws.close();
    });
    ws.addEventListener("message", (message) => {
        // Parse the incoming message here
        const item = JSON.parse(message.data);

        switch (item.list) {
            case "graylist":
                if (item.action === "add") graylist[item.data._id] = item.data;
                else graylist[item.data._id] = null;
                subscriptions.graylist.forEach(set => set(graylist));
                break;
            case "whitelist":
                if (item.action === "add") whitelist[item.data._id] = item.data;
                else whitelist[item.data._id] = null;
                subscriptions.whitelist.forEach(set => set(whitelist));
                break;
            case "contentreview":
                if (item.action === "add") contentreview[item.data._id] = item.data;
                else contentreview[item.data._id] = null;
                subscriptions.contentreview.forEach(set => set(contentreview));
                break;
            case "blacklist":
                if (item.action === "add") blacklist[item.data._id] = item.data;
                else blacklist[item.data._id] = null;
                subscriptions.blacklist.forEach(set => set(blacklist));
                break;
            case "maliciousinvites": 
                if (item.action === "add") maliciousinvites[item.data._id] = item.data;
                else maliciousinvites[item.data._id] = null;
                subscriptions.maliciousinvites.forEach(set => set(maliciousinvites));
                break;
        }
    });
};

const init = () => {
    if (!tracking.initialized) {
        tracking.initialized = true;
        connect();
    }
}

module.exports = {
    startWebsocket: init,
    graylist: graylistStore,
    whitelist: whitelistStore,
    contentreview: contentreviewStore,
    blacklist: blacklistStore,
    maliciousinvites: maliciousinvitesStore
};