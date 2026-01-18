const express = require('express');
const router = express.Router();
const path = require('path');
const { PermissionsBitField } = require('discord.js');
const { moveUrl, deleteById, flagUrl } = require('../../DAL/databaseApi');
const { getScreenshot, isScraperOnline } = require("../../DAL/realisticWebScraperApi");

function adminAuth(req, res, next) {
    if (!req.session || !req.session.admin)
        return res.send(401);

    return next();
}

router.get('/pfp', (req, res) => {
    if (req.user) {
        return res.redirect(`https://cdn.discordapp.com/avatars/${req.user.id}/${req.user.avatar}`);
    }

    return res.sendFile(path.join(__dirname, '../lib/discord.png'));
});

router.post('/user', (req, res) => {
    if (req.user) {
        return res.json({
            id: req.user.id,
            name: req.user.username + '#' + req.user.discriminator,
            avatar: `https://cdn.discordapp.com/avatars/${req.user.id}/${req.user.avatar}`,
            isAdmin: req.session.admin === true,
            servers: req.user.guilds.map(guild => {
                const perms = new PermissionsBitField(guild.permissions_new);
                return {
                    id: guild.id,
                    isAdmin: perms.has(PermissionsBitField.Flags.Administrator, true),
                    avatar: `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}`,
                    name: guild.name
                }
            }).filter(guild => guild.isAdmin)
        });
    }

    return res.status(401);
});

router.post('/move', adminAuth, express.json(), async (req, res) => {
    await moveUrl(req.body.url, req.body.from, req.body.to);

    return res.sendStatus(202);
});
router.post('/remove', adminAuth, express.json(), async (req, res) => {
    await moveUrl(req.body.url, req.body.from);

    return res.sendStatus(202);
});


function extractUrlWithoutProtocol(url) {
    url = url.toLowerCase();
    
    try {
        const urlObject = new URL(url);

        url = urlObject.toString();

        if (url.indexOf("https://") === 0)
            url = url.substring(8);
        else if (url.indexOf("http://") === 0)
            url = url.substring(7);

        return url;
    } catch {
        if (url.indexOf("https://") === 0)
            url = url.substring(8);
        else if (url.indexOf("http://") === 0)
            url = url.substring(7);

        return url;
    }
}

router.post('/flag', adminAuth, express.json(), async (req, res) => {
    await flagUrl(extractUrlWithoutProtocol(req.body.invite));

    return res.sendStatus(202);
});

router.post('/clearcontentreview', adminAuth, express.json(), async (req, res) => {
    if (!req.body.id) 
        return res.sendStatus(404);

    await deleteById('contentreview', req.body.id);
    return res.sendStatus(202);
});

router.post('/snapshot', adminAuth, express.json(), async (req, res) => {
    if (!req.body.url)
        return res.sendStatus(404);

    if (!await isScraperOnline())
        return res.sendStatus(501);

    try {
        const image = await getScreenshot(req.body.url);

        res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': image.length
        });

        return res.end(image);
    } catch (err) {
        return res.sendStatus(502);
    }
});

router.use(require("./activity"));

module.exports = router;