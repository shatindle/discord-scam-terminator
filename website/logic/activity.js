const express = require('express');
const router = express.Router();
const { Permissions } = require("discord.js");
const { monitor } = require("../../DAL/databaseApi");
const settings = require("../../settings.json");

const testUsers = settings.testUsers;
const adminUsers = settings.discord.admin;

function adminAuth(req, res, next) {
    if (!req.session || !req.session.admin)
        return res.send(401);

    return next();
}

const warned = [], kicked = [];

monitor("warning", async (changes) => {
    changes.added.forEach(record => {
        warned.push({
            guildId: record.guildId,
            date: record.timestamp.toDate(),
            userId: record.userId
        });
    });
});

monitor("kick", async (changes) => {
    changes.added.forEach(record => {
        kicked.push({
            guildId: record.guildId,
            date: record.timestamp.toDate(),
            userId: record.userId
        });
    });
});

router.get("/activity/warnings", (req, res) => {
    if (!req.user)
        return res.json([]);

    const guilds = req.user.guilds.filter(guild => new Permissions(guild.permissions_new).has(Permissions.FLAGS.MANAGE_MESSAGES)).map(guild => guild.id);
    res.json(warned.filter(t => (!testUsers || testUsers.indexOf(t.userId) === -1) && (adminUsers.indexOf(req.user.id) > -1 || guilds.indexOf(t.guildId) > -1)));
});
router.get("/activity/kicks", (req, res) => {
    if (!req.user)
        return res.json([]);

    const guilds = req.user.guilds.filter(guild => new Permissions(guild.permissions_new).has(Permissions.FLAGS.MANAGE_MESSAGES)).map(guild => guild.id);
    res.json(kicked.filter(t => (testUsers || testUsers.indexOf(t.userId) === -1) && (adminUsers.indexOf(req.user.id) > -1 || guilds.indexOf(t.guildId) > -1)));
});

module.exports = router;