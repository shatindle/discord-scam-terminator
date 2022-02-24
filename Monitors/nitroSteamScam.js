const DiscordApi = require('discord.js');
const { extractUrlsFromContent, containsKeyIndicators, MINIMUM_INDICATORS } = require("../DAL/bodyparserApi");
const { validUrl, isUrlInWhitelist, isSafeDeepCheck, init:initUrlTesterApi } = require("../DAL/urlTesterApi");
const { shouldBanUser, recordKick, recordError, recordWarning, recordFail } = require("../DAL/databaseApi");

const reason = "Nitro/Steam phishing";

/**
 * @description Looks for nitro/steam scams and removes them
 * @param {DiscordApi.Client} discord The discord client
 */
 function monitor(discord) {
    discord.once('ready', async () => {
        await initUrlTesterApi();
        console.log("ready!");
    });

    discord.on('messageCreate', async (message) => {
        // ignore posts from bots
        if (message.author.bot) return;
    
        // ignore posts from mods
        if (message.member.permissions.has(DiscordApi.Permissions.FLAGS.MANAGE_MESSAGES)) return;

        var guildId = message.guild.id;
        var userId = message.member.id;

        try {
            const keyIndicators = containsKeyIndicators(message.content, true) > MINIMUM_INDICATORS;
            const urlsFound = extractUrlsFromContent(message.content);

            
            for (var i = 0; i < urlsFound.length; i++) {
                // possible scam.  What is in the URLs?
                if (validUrl(urlsFound[i])) {
                    // it's a valid URL.  Is it a valid steam or discord url?
                    if (isUrlInWhitelist(urlsFound[i]))
                        continue;

                    // if it doesn't have key indicators...
                    // perform a deep check as it could still be malicious
                    if (!keyIndicators && await isSafeDeepCheck(urlsFound[i])) 
                        continue;
    
                    // could be a malicious URL.  We need to delete the message.
                    if (message.deletable) {
                        await message.delete();
                    }

                    var username = message.member.user.username + "#" + message.member.user.discriminator;

                    var response = await message.channel.send(
                        "Malicious URL detected.  If this was in error, please let a Mod know.");

                    setTimeout(async function() {
                        if (response.deletable)
                            await response.delete();
                    }, 5000);

                    // should we ban the user? 
                    if (shouldBanUser(message.member.id, message.content)) {
                        if (message.member.kickable) {
                            
                            await message.member.kick();
                            await recordKick(
                                guildId,
                                userId,
                                username,
                                reason);
                        } else {
                            await recordFail(
                                guildId,
                                userId,
                                username,
                                reason);
                        }
                    } else {
                        await recordWarning(
                            guildId,
                            userId,
                            username,
                            reason);
                    }

                    // the message has been deleted, don't bother checking any other URLs
                    return;
                }
            }
        } catch (err) {
            // something went wrong when assessing the message content
            try {
                await recordError(guildId, userId, err, reason);
            } catch (err2) {
                await recordError("", "", err2, reason);
            }
        }
    });
 }

module.exports = monitor;