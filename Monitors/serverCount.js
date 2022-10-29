const { Client } = require('discord.js');

/**
 * @description Updates the server count
 * @param {Client} discord The discord client
 */
 function monitor(discord) {
    setInterval(function() {
        discord.user.setActivity(`defense in ${discord.guilds.cache.size} servers`);
    }, 1000 * 60 * 60);

    discord.user.setActivity(`defense in ${discord.guilds.cache.size} servers`);
 }

 module.exports = monitor;