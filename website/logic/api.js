const express = require('express');
const router = express.Router();
const path = require('path');
const { Permissions } = require('discord.js');

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
})

module.exports = router;