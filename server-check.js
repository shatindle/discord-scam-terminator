const { Client, Collection, Intents, Permissions } = require('discord.js');
const { token } = require('./settings.json');

const client = new Client({ 
    intents: [
        Intents.FLAGS.GUILDS
    ] });

client.once('ready', async () => {
    client.guilds.cache.forEach(guild => console.log(`${guild.id}: ${guild.name}`));
    console.log("ready!");
});

client.login(token);