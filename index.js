const DiscordApi = require('discord.js');
const { extractUrlsFromContent, containsKeyIndicators } = require("./DAL/bodyparserApi");
const { validUrl, discordUrl, steamUrl } = require("./DAL/urlTesterApi");
const { shouldBanUser } = require("./DAL/databaseApi");

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

discord.on("guildMemberAdd", async (member) => {
    var username = member.user.username.toLowerCase();
    if (username.indexOf("clonex") > -1) {
        // this is likely a clonex scam bot.  Ban it.
        if (member.kickable)
            await member.kick();
    }
});

discord.on('messageCreate', async (message) => {
    // ignore posts from bots
    if (message.author.bot) return;

    // ignore posts from mods
    if (message.member.permissions.has(DiscordApi.Permissions.FLAGS.MANAGE_MESSAGES)) return;

    try {
        if (containsKeyIndicators(message.content)) {
            // possible spam.  Does it have a URL?
            var urlsFound = extractUrlsFromContent(message.content);
    
            for (var i = 0; i < urlsFound.length; i++) {
                if (validUrl(urlsFound[i])) {
                    // it's a valid URL with a key indicator.  Is it a valid steam or discord url?
                    if (discordUrl(urlsFound[i]))
                        continue;
                    if (steamUrl(urlsFound[i]))
                        continue;
    
                    // could be a malicious URL.  We need to delete the message.
                    if (message.deletable) {
                        await message.delete();
                    }

                    var response = await message.channel.send(
                        "Malicious URL detected.  If this was in error, please let a Mod know.");

                    setTimeout(async function() {
                        if (response.deletable)
                            await response.delete();
                    }, 5000);

                    // should we ban the user? 
                    if (shouldBanUser(message.member.id, message.content) && message.member.kickable) {
                        await message.member.kick();
                    }
                }
            }
        }
    } catch (err) {
        // something went wrong when assessing the message content
        console.log(err);
    }
});

