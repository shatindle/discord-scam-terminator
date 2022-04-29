const WebSocket = require('ws');
const { session } = require('./discordLogin')
const settings = require('../../settings.json');
const wss = new WebSocket.Server({ clientTracking: false, noServer: true });
const { monitor } = require("../../DAL/databaseApi");

const connections = [];
const collections = {
    blacklist: {},
    whitelist: {},
    verifieddomains: {},
    graylist: {}
};

["blacklist", "whitelist", "verifieddomains", "graylist"].forEach(list => {
    monitor(list, async (changes) => {
        changes.added.forEach(data => {
            collections[list][data._id] = data;
            connections.forEach(connection => {
                if (connection.readyState === WebSocket.OPEN) connection.send(JSON.stringify({data, list, action:"add"}));
            });
        });
        changes.removed.forEach(data => {
            delete collections[list][data._id];
            connections.forEach(connection => {
                if (connection.readyState === WebSocket.OPEN) connection.send(JSON.stringify({data, list, action:"remove"}));
            });
        });
    });
});

wss.on('connection', (ws, req) => {
    connections.push(ws);
    console.log(`${new Date().toISOString()}: WebSocket added: ${connections.length}`);

    // hydrate the list
    ["blacklist", "whitelist", "verifieddomains", "graylist"].forEach(list => {
        Object.values(collections[list]).forEach(data => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({data, list, action:"add"}));
        });
    });
});

wss.on('close', (ws, req) => {
    if (connections.indexOf(ws) > -1) connections.splice(connections.indexOf(ws));
    console.log(`${new Date().toISOString()}: WebSocket removed: ${connections.length}`);
});

module.exports = (app) => {
    app.on('upgrade', (req, soc, head) => {
        session(req, {}, () => {
            if (!req.session || settings.discord.admin.indexOf(req.session.passport.user.id) === -1) {
                soc.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                soc.destroy();
                return;
            }
    
            wss.handleUpgrade(req, soc, head, function (ws) {
                wss.emit('connection', ws, req);
            });
        })
    });
};