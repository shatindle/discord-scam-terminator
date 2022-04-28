const express = require('express');
const router = express.Router();
const path = require('path');
const { Permissions } = require('discord.js');
const { loadUrlBlacklist, loadUrlGraylist, loadUrlWhitelist, moveUrl, loadVerifiedDomains } = require('../../DAL/databaseApi');

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

router.get('/user', (req, res) => {
    if (req.user) {
        return res.json({
            id: req.user.id,
            name: req.user.username + '#' + req.user.discriminator,
            avatar: `https://cdn.discordapp.com/avatars/${req.user.id}/${req.user.avatar}`,
            isAdmin: req.session.admin === true,
            servers: req.user.guilds.map(guild => {
                const perms = new Permissions(guild.permissions_new);
                return {
                    id: guild.id,
                    isAdmin: perms.has(Permissions.FLAGS.ADMINISTRATOR, true),
                    avatar: `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}`,
                    name: guild.name
                }
            }).filter(guild => guild.isAdmin)
        });
    }

    return res.status(401);
});

router.get('/blacklist', adminAuth, async (req, res) => res.json(Object.keys(await loadUrlBlacklist())));
router.get('/graylist', adminAuth, async (req, res) => res.json(await loadUrlGraylist(true)));
router.get('/whitelist', adminAuth, async (req, res) => res.json(Object.keys(await loadUrlWhitelist())));
router.get('/verifieddomains', adminAuth, async (req, res) => res.json(Object.keys(await loadVerifiedDomains())));
router.post('/move', adminAuth, express.json(), async (req, res) => {
    await moveUrl(req.body.url, req.body.from, req.body.to);

    return res.sendStatus(200);
});

router.use(require("./activity"));

module.exports = router;