const express = require('express');
const path = require('path');
const { router:discordLogin } = require('./website/logic/discordLogin');
const api = require('./website/logic/api');
const cookieParser = require('cookie-parser');
const appSettings = require('./settings.json');

const app = express();

var server = require("http").createServer(app);

app.enable('trust proxy');

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app
    .use('/lib', express.static(__dirname + '/website/lib'))
    .use(express.static(__dirname + '/website/static'))
    .use(discordLogin);

// setup websocket logic
require('./website/logic/ws')(server);

app
    .use('/api', api)
    .get('*', (req, res) => res.sendFile(path.resolve(__dirname, './website/html/index.html')));

server.listen(appSettings.http);