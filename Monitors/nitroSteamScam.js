const DiscordApi = require('discord.js');
const { extractUrlsFromContent, containsKeyIndicators, MINIMUM_INDICATORS, isRedlineStealer } = require("../DAL/bodyparserApi");
const { validUrl, isSafeDeepCheck, isUrlInWhitelist } = require("../DAL/urlTesterApi");
const { recordError } = require("../DAL/databaseApi");
const { maliciousUrlDetected } = require("../DAL/maliciousUrlTracking");

const reason = "Nitro/Steam phishing";

/**
 * @description Looks for nitro/steam scams and removes them
 * @param {DiscordApi.Message} message The message object
 * @returns {Promise<Boolean>} Whether or not the message was acted on in some way
 */
async function monitor(message) {
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
                        await maliciousUrlDetected(message, guildId, userId, username, reason);
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
                        await maliciousUrlDetected(message, guildId, userId, username, reason);
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
                        await maliciousUrlDetected(message, guildId, userId, username, reason);
                        messageRemoved = true;
                    }
                }
            }
        }

        return messageRemoved;
    } catch (err) {
        // something went wrong when assessing the message content
        try {
            await recordError(guildId, userId, err.toString(), reason);
        } catch (err2) {
            await recordError("", "", err2.toString(), reason);
        }

        return false;
    }
 }

module.exports = monitor;