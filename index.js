const { Client, Collection, Intents } = require('discord.js');
const fs = require('fs');


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
    require("./Monitors/clonex")(client);
    require("./Monitors/serverCount")(client);
    await require("./Monitors/nitroSteamScam")(client);
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

// login to client - we should auto reconnect automatically
client.login(token);



