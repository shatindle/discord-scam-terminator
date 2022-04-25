const DiscordApi = require('discord.js');
const { extractUrlsFromContent, containsKeyIndicators, MINIMUM_INDICATORS, isRedlineStealer } = require("../DAL/bodyparserApi");
const { validUrl, isSafeDeepCheck, init:initUrlTesterApi, isUrlInWhitelist } = require("../DAL/urlTesterApi");
const { shouldBanUser, recordKick, recordError, recordWarning, recordFail, recordContentReview } = require("../DAL/databaseApi");

const reason = "Nitro/Steam phishing";

async function maliciousUrlDetected(message, guildId, userId, username) {
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

    let action = null;

    // should we ban the user? 
    if (shouldBanUser(message.member.id, message.content)) {
        if (message.member.kickable) {
            
            await message.member.kick();
            await recordKick(
                guildId,
                userId,
                username,
                reason);

            action = "kick-success";
        } else {
            await recordFail(
                guildId,
                userId,
                username,
                reason);

            action = "kick-fail"
        }
    } else {
        await recordWarning(
            guildId,
            userId,
            username,
            reason);

        action = "warn";
    }

    try {
        await recordContentReview(
            guildId,
            userId,
            username,
            action,
            message.content
        );
    } catch (err) {
        await recordError(guildId, userId, err.toString(), "failed to record content review message");
    }
}

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
            var username = message.member.user.username + "#" + message.member.user.discriminator;
            var messageRemoved = false;
            
            const keyIndicators = containsKeyIndicators(message.content, true) > MINIMUM_INDICATORS;
            const urlsFound = extractUrlsFromContent(message.content);
            const redlineStealer = await isRedlineStealer(message.content, urlsFound, userId, guildId);

            for (var i = 0; i < urlsFound.length; i++) {
                // possible scam.  What is in the URLs?
                if (validUrl(urlsFound[i])) {
                    // if this is a redline stealer, ignore the domain
                    if (redlineStealer) {
                        if (!messageRemoved) {
                            // if it has key indicators, then mark it as malicious and run the deep check after
                            await maliciousUrlDetected(message, guildId, userId, username);
                            messageRemoved = true;
                        }
                    }

                    // it's a valid URL.  Is it a valid steam or discord url?
                    if (isUrlInWhitelist(urlsFound[i]))
                        continue;

                    // if it doesn't have key indicators...
                    // perform a deep check as it could still be malicious
                    // reversing to catch more URLs
                    if (keyIndicators) {
                        if (!messageRemoved) {
                            // if it has key indicators, then mark it as malicious and run the deep check after
                            await maliciousUrlDetected(message, guildId, userId, username);
                            messageRemoved = true;
                        }

                        // perform the deep check to grab the URL if necessary
                        await isSafeDeepCheck(urlsFound[i]);
                    }
                    
                    let safeCheck = await isSafeDeepCheck(urlsFound[i]);

                    if (safeCheck === true || safeCheck === null) {
                        // looks like we're ok, but it might require manual review
                        // check the next URL
                        continue;
                    } else {
                        if (!messageRemoved) {
                            // if it doesn't have key indicators but fails the deep check, mark it as malicious
                            await maliciousUrlDetected(message, guildId, userId, username);
                            messageRemoved = true;
                        }
                    }
                }
            }
        } catch (err) {
            // something went wrong when assessing the message content
            try {
                await recordError(guildId, userId, err.toString(), reason);
            } catch (err2) {
                await recordError("", "", err2.toString(), reason);
            }
        }
    });
 }

module.exports = monitor;