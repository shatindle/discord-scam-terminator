const express = require('express');
const router = express.Router();
const { PermissionsBitField, Client, GatewayIntentBits, Guild } = require("discord.js");
const { monitor } = require("../../DAL/databaseApi");
const settings = require("../../settings.json");

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds
    ] 
});
client.login(settings.token);

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

    const guilds = req.user.guilds.filter(guild => new PermissionsBitField(guild.permissions_new).has(PermissionsBitField.Flags.ManageMessages)).map(guild => guild.id);
    res.json(warned.filter(t => (!testUsers || testUsers.indexOf(t.userId) === -1) && (adminUsers.indexOf(req.user.id) > -1 || guilds.indexOf(t.guildId) > -1)));
});

router.get("/activity/kicks", (req, res) => {
    if (!req.user)
        return res.json([]);

    const guilds = req.user.guilds.filter(guild => new PermissionsBitField(guild.permissions_new).has(PermissionsBitField.Flags.ManageMessages)).map(guild => guild.id);
    res.json(kicked.filter(t => (testUsers || testUsers.indexOf(t.userId) === -1) && (adminUsers.indexOf(req.user.id) > -1 || guilds.indexOf(t.guildId) > -1)));
});

const allOwners = {};

const fetchOwner = async (guild) => {
    try {
        const owner = await guild.fetchOwner();
        allOwners[guild.id] = {
            id: owner.id,
            avatarURL: owner.avatarURL(),
            username: owner.user.username,
            retrieved: Date.now()
        };
    } catch (err) {
        console.error(`Error retrieving owner: ${err}`);
    }
}

router.get("/activity/servers", async (req, res) => {
    if (!req.user)
        return res.json([]);

    const allGuilds = [];
    const adminGuilds = [];

    await Promise.all(
        client.guilds.cache.map(
        /**
         * 
         * @param {Guild} guild 
         */
        async guild => {
            let owner = {
                id: "RETRIEVING",
                avatarURL: "https://cdn.discordapp.com/embed/avatars/0.png",
                username: "RETRIEVING"
            };

            try {
                if (!allOwners[guild.id] || allOwners[guild.id].retrieved >= Date.now() - 1000 * 60 * 60 * 24) {
                    fetchOwner(guild);
                } else {
                    owner = allOwners[guild.id];
                }
            } catch (err) {
                console.log(`Unable to get owner or guild details: ${err}`);
            }

            allGuilds.push(guild.id);

            adminGuilds.push({
                id: guild.id,
                name: guild.name,
                avatar: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}` : 'https://cdn.discordapp.com/embed/avatars/0.png',
                members: guild.memberCount,
                partnered: guild.partnered,
                verified: guild.verified,
                owner: {
                    id: owner.id,
                    avatar: owner.avatarURL ?? "https://cdn.discordapp.com/embed/avatars/0.png",
                    username: owner.username
                }
            });
        })
    );
        
    if (req.session && req.session.admin) {
        return res.json(adminGuilds);
    }
    
    res.json(req.user.guilds.filter(guild => new PermissionsBitField(guild.permissions_new).has(PermissionsBitField.Flags.ManageMessages)).filter(guild => allGuilds.indexOf(guild.id) > -1).map(guild => {
        let thisguild = adminGuilds.filter(g => g.id === guild.id);

        return {
            id: guild.id,
            name: guild.name,
            avatar: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}` : 'https://cdn.discordapp.com/embed/avatars/0.png',
            members: thisguild.length === 1 ? thisguild[0].members : '?',
            partnered: thisguild.partnered,
            verified: thisguild.verified
        }
    }));
});

module.exports = router;