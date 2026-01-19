const { Message, PermissionsBitField } = require('discord.js');
const { extractUrlsFromContent } = require("../DAL/bodyparserApi");
const { validUrl, isBlacklisted, extractHostname } = require("../DAL/urlTesterApi");
const { recordError } = require("../DAL/databaseApi");
const { maliciousUrlDetected } = require("../DAL/maliciousUrlTracking");
const { getAllRedirects } = require("../DAL/redirectExtractor");

const reason = "Malicious redirect";

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
        
        const urlsFound = extractUrlsFromContent(message.content, true);

        for (let i = 0; i < urlsFound.length; i++) {
            // possible scam.  What is in the URLs?
            if (validUrl(urlsFound[i])) {
                // investigate the redirect URLs
                let redirectUrls = await getAllRedirects(urlsFound[i]);

                // check if any of these URLs are in the blacklist
                for (let redirectUrl of redirectUrls) {
                    if (isBlacklisted(redirectUrl)) {
                        if (!messageRemoved) {
                            // if it doesn't have key indicators but fails the deep check, mark it as malicious
                            // because we already evaluated the redirects, no need to do it again.  Leave off the malicousUrl
                            await maliciousUrlDetected(message, guildId, userId, username, reason, extractHostname(redirectUrl));
                            messageRemoved = true;
                        }
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