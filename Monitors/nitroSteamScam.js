const { Message, PermissionsBitField } = require('discord.js');
const { extractUrlsFromContent, containsKeyIndicators, MINIMUM_INDICATORS, isRedlineStealer } = require("../DAL/bodyparserApi");
const { validUrl, isSafeDeepCheck, isUrlInWhitelist, extractHostname } = require("../DAL/urlTesterApi");
const { recordError } = require("../DAL/databaseApi");
const { maliciousUrlDetected } = require("../DAL/maliciousUrlTracking");
const { logInformation } = require("../DAL/logApi");

const reason = "Nitro/Steam phishing";

/**
 * @description Looks for nitro/steam scams and removes them
 * @param {Message} message The message object
 * @returns {Promise<Boolean>} Whether or not the message was acted on in some way
 */
async function monitor(message) {
    // ignore posts from bots
    if (message.author.bot) return false;

    try {
        // ignore posts from mods
        if (message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return false;
    } catch (err) {
        await recordError("", "", "permissions property null: " + err.toString(), reason);
        // for now, exit since we couldn't keep going
        return false;
    }

    const guildId = message.guild.id;
    const userId = message.member.id;

    try {
        const username = message.member.user.username + "#" + message.member.user.discriminator;
        let messageRemoved = false;
        
        const keyIndicators = containsKeyIndicators(message.content, true) > MINIMUM_INDICATORS;
        const urlsFound = extractUrlsFromContent(message.content, true);
        const redlineStealer = await isRedlineStealer(message.content, urlsFound, userId, guildId);

        for (let i = 0; i < urlsFound.length; i++) {
            // possible scam.  What is in the URLs?
            if (validUrl(urlsFound[i])) {
                // if this is a redline stealer, ignore the domain
                if (redlineStealer) {
                    if (!messageRemoved) {
                        // if it has key indicators, then mark it as malicious and run the deep check after
                        await maliciousUrlDetected(message, guildId, userId, username, reason, extractHostname(urlsFound[i]), urlsFound[i]);
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
                        await maliciousUrlDetected(message, guildId, userId, username, reason, extractHostname(urlsFound[i]), urlsFound[i]);
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
                        await maliciousUrlDetected(message, guildId, userId, username, reason, extractHostname(urlsFound[i]), urlsFound[i]);
                        messageRemoved = true;
                    }
                }
            }
        }

        if (urlsFound.length === 0) {
            // no URLs, look for key indicators
            if (containsKeyIndicators(message.content, false) > MINIMUM_INDICATORS) {
                await logInformation(message.client, guildId, userId, message.channelId, message.content, "Suspicious text", message.url);
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