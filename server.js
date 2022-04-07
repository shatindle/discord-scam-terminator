const express = require('express');
const path = require('path');
const discordLogin = require('./website/logic/discordLogin');
const api = require('./website/logic/api');
const cookieParser = require('cookie-parser');
const appSettings = require('./settings.json');

const app = express();

var server = require("http").createServer(app);

if (!appSettings.secure && appSettings.secureCookie) {
    app.set('trust proxy', 'loopback');
}

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use(express.urlencoded());
app.use(cookieParser());

app
    .get('/lib', express.static(__dirname + './website/lib'))
    .use(discordLogin)
    .use('/api', api)
    .get('*', (req, res) => res.sendFile(path.resolve(__dirname, './website/html/index.html')));

server.listen(appSettings.http);