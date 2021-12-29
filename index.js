const DiscordApi = require('discord.js');


const discord = new DiscordApi.Client({ 
    intents: [
        DiscordApi.Intents.FLAGS.GUILDS,
        DiscordApi.Intents.FLAGS.GUILD_MESSAGES,
        DiscordApi.Intents.FLAGS.GUILD_MEMBERS,
        DiscordApi.Intents.FLAGS.GUILD_BANS
    ], 
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'] 
});

const { token } = require('./settings.json');

// login to discord - we should auto reconnect automatically
discord.login(token);

require("./Monitors/clonex")(discord);
require("./Monitors/nitroSteamScam")(discord);
require("./Monitors/serverCount")(discord);

