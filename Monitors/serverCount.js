const DiscordApi = require('discord.js');

/**
 * @description Updates the server count
 * @param {DiscordApi.Client} discord The discord client
 */
 function monitor(discord) {
    setInterval(function() {
        discord.user.setActivity(`Protecting ${discord.guilds.cache.size} servers`);
    }, 1000 * 60 * 60);

    setTimeout(function() {
        discord.user.setActivity(`Protecting ${discord.guilds.cache.size} servers`);
    }, 5000);
 }

 module.exports = monitor;