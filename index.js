const { Client, Collection, GatewayIntentBits, Partials, Guild } = require('discord.js');
const fs = require('fs');
const { loadAllLogChannels } = require("./DAL/databaseApi");
const nitroSteamScam = require("./Monitors/nitroSteamScam");
const antiLinkSpam = require("./Monitors/antiLinkSpam");
const maliciousRedirect = require("./Monitors/maliciousRedirect");

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        // The guild members intent was used to catch clonex, 
        // but it's been decommissioned due to other bots doing it better
        // Intents.FLAGS.GUILD_MEMBERS,
        GatewayIntentBits.GuildBans
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

client.once('ready', async () => {
    await loadAllLogChannels();
    
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
    if (await nitroSteamScam(message))
		return; // it was addressed here

	if (await antiLinkSpam(message))
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



