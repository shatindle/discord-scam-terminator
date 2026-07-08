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

const { Client, Collection, GatewayIntentBits, Partials, Guild, Events, MessageFlags } = require('discord.js');
const fs = require('fs');
const { loadAllLogChannels, background } = require("./DAL/databaseApi");
const { lookupGuildBehavior } = require("./DAL/behaviorApi");
const nitroSteamScam = require("./Monitors/nitroSteamScam");
const antiLinkSpam = require("./Monitors/antiLinkSpam");
const antiImageSpam = require("./Monitors/antiImageSpam");
const antiTextSpam = require("./Monitors/antiTextSpam");
const antiProfileSpam = require("./Monitors/antiProfileSpam");
const maliciousRedirect = require("./Monitors/maliciousRedirect");
const advancedRules = require("./Monitors/ruleEngine");
const publicIp = (...args) => import('public-ip').then(({publicIpv4}) => publicIpv4(...args));
const { logError } = require('./DAL/logApi');

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
    ],
    rest: {
        rejectOnRateLimit: ['/channels']
    }
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

client.once(Events.ClientReady, async () => {
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

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
	}
});


client.on(Events.MessageCreate, async (message) => {
    const behaviors = lookupGuildBehavior(message.guildId);

    let memberFromMessage;

    try {
        // we need to make sure the member details are cached before we go any further
        memberFromMessage = 
            message.member ?? await message.guild.members.fetch(message.author.id);

        if (!memberFromMessage || !memberFromMessage.permissions) {
            // member cannot be found, our rules will not be able to do anything

            try {
                await logError(client, 
                    message?.guildId ?? "", 
                    message?.author?.id ?? "", 
                    message?.channelId ?? "",
                    "Unable to look up member for permissions check");
            } catch {
                console.log("Error looking up member for permissions check");
            }
            return;
        }
    } catch {
        // member cannot be looked up, we can't go any further
        try {
            await logError(client, 
                message?.guildId ?? "", 
                message?.author?.id ?? "", 
                message?.channelId ?? "",
                "Unable to look up member for permissions check");
        } catch {
            console.log("Error looking up member for permissions check");
        }

        return;
    }

    // disabling for now due to performance issues
    // if (await advancedRules(message)) // highly experimental 1 message detector
    //     return; // it was addressed here

    if (behaviors.defaults || behaviors.text_spam)
        if (await antiTextSpam(message, memberFromMessage)) // check this first because it's the fastest check
            return; // it was addressed here

    if (behaviors.defaults || behaviors.profile_spam)
        if (await antiProfileSpam(message, memberFromMessage))
            return; // it was addressed here

    if (behaviors.defaults || behaviors.link_spam)
        if (await antiLinkSpam(message, behaviors.nitro_steam_spam === false, memberFromMessage))
            return; // it was addressed here

    if (behaviors.defaults || behaviors.image_spam)
        if (await antiImageSpam(message, memberFromMessage))
            return; // it was addressed here

    if (behaviors.defaults || behaviors.nitro_steam_spam)
        if (await nitroSteamScam(message, memberFromMessage))
            return; // it was addressed here

    if (behaviors.defaults || behaviors.malicious_redirects)
        if (await maliciousRedirect(message, memberFromMessage))
            return; // it was addressed here
});

client.on(Events.GuildCreate, async (guild) => {
    // check if this user is blocked by the bot
    try {
        if (blockedUsers.includes(guild.ownerId)) await guild.leave();
    } catch (err) {
        console.log(`Error leaving server of problematic users: ${err}`);
    }
});

client.rest.on("rateLimited", async (rateLimitData) => {
    try {
        console.warn(`[RATE LIMIT HIT]`);
        console.warn(`- Scope: ${rateLimitData.scope}`); // 'global', 'shared', or 'user'
        console.warn(`- Method/URL: ${rateLimitData.method} ${rateLimitData.url}`);
        console.warn(`- Time to Reset: ${rateLimitData.timeToReset}ms`);
        console.warn(`- Limit Config: Max ${rateLimitData.limit} requests`);
    } catch (err) {
        // nothing we can do about this...
        console.warn("Rate limited, but cannot gather more info");
    }
})

// login to client - we should auto reconnect automatically
client.login(token);