// Added backup logging to investigate when DittoVC crashes
const process = require('node:process');

process.on('uncaughtExceptionMonitor', (err, origin) => {
    console.error("***CRITICAL ERROR***");
    console.error("Error:");
    console.error(err);
    console.error("Origin:");
    console.error(origin);
    console.error("***QUITTING***");
});

const { Client, Collection, GatewayIntentBits, Partials, Guild } = require('discord.js');
const fs = require('fs');
const { loadAllLogChannels, background } = require("./DAL/databaseApi");
const nitroSteamScam = require("./Monitors/nitroSteamScam");
const antiLinkSpam = require("./Monitors/antiLinkSpam");
const antiImageSpam = require("./Monitors/antiImageSpam");
const antiTextSpam = require("./Monitors/antiTextSpam");
const maliciousRedirect = require("./Monitors/maliciousRedirect");
const publicIp = (...args) => import('public-ip').then(({publicIpv4}) => publicIpv4(...args));

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        // The guild members intent was used to catch clonex, 
        // but it's been decommissioned due to other bots doing it better
        // Intents.FLAGS.GUILD_MEMBERS,
        GatewayIntentBits.GuildModeration
    ], 
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ]
});

const { 
    token, 
    blockedUsers 
} = require('./settings.json');

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

client.once('clientReady', async () => {
    await loadAllLogChannels();
    background();
    
    try {
        if (blockedUsers && blockedUsers.length > 0) {
            /** @type {Array<Guild>} */
            const serversToLeave = [];
        
            client.guilds.cache.forEach(guild => {
                if (blockedUsers.includes(guild.ownerId)) serversToLeave.push(guild);
            });

            for (const badServer of serversToLeave) {
                await badServer.leave();
            }
        }
    } catch (err) {
        console.log(`Error leaving server of problematic users: ${err}`);
    }

    require("./Monitors/serverCount")(client);

    console.log(`Bot IP: ${await publicIp()}`);

    console.log("ready!");
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

client.on('messageCreate', async (message) => {
    if (await antiTextSpam(message)) // check this first because it's the fastest check
		return; // it was addressed here

	if (await antiLinkSpam(message))
		return; // it was addressed here

    if (await antiImageSpam(message))
        return; // it was addressed here

    if (await nitroSteamScam(message))
		return; // it was addressed here

	if (await maliciousRedirect(message))
		return; // it was addressed here
});

client.on('guildCreate', async (guild) => {
    // check if this user is blocked by the bot
    try {
        if (blockedUsers.includes(guild.ownerId)) await guild.leave();
    } catch (err) {
        console.log(`Error leaving server of problematic users: ${err}`);
    }
});

// login to client - we should auto reconnect automatically
client.login(token);