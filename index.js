const { Client, Collection, Intents } = require('discord.js');
const fs = require('fs');
const { init:initUrlTesterApi } = require("./DAL/urlTesterApi");
const { loadAllLogChannels } = require("./DAL/databaseApi");
const nitroSteamScam = require("./Monitors/nitroSteamScam");
const antiLinkSpam = require("./Monitors/antiLinkSpam");

const client = new Client({ 
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_BANS
    ], 
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'] 
});

const { token } = require('./settings.json');

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

client.once('ready', async () => {
    await initUrlTesterApi();
    await loadAllLogChannels();

    require("./Monitors/clonex")(client);
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
});

// login to client - we should auto reconnect automatically
client.login(token);



