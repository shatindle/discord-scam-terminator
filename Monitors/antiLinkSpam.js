const DiscordApi = require('discord.js');
const { extractUrlsFromContent, containsKeyIndicators, MINIMUM_INDICATORS } = require("../DAL/bodyparserApi");
const { recordError, hashMessage } = require("../DAL/databaseApi");
const { spamUrlDetected } = require("../DAL/maliciousUrlTracking");
const { getServerIdFromInvite } = require("../DAL/urlTesterApi");

const reason = "Link spam";

const messageLogs = {};
const time = 1000 * 10;

function expire() {
    const expired = [];
    const expirationTime = new Date().valueOf() - time;

    for (const [key, value] of Object.entries(messageLogs)) {
        if (value.last < expirationTime) {
            expired.push(key);
        }
    }

    expired.forEach(k => delete messageLogs[k]);
}

let expireTimer = setInterval(expire, time);

async function cleanup(client, messageList, guildId, userId) {
    for (var i = 0; i < messageList.length; i++) {
        try {
            var ids = messageList[i];
            var channel = await client.channels.fetch(ids.channelId);
            var message = await channel.messages.fetch(ids.messageId);

            if (message.deletable) {
                await message.delete();
            }
        } catch (err) {
            try {
                await recordError(guildId, userId, err.toString(), reason);
            } catch (err2) {
                await recordError("", "", err2.toString(), reason);
            }
        }
    }
}

/**
 * @description Looks for nitro/steam scams and removes them
 * @param {DiscordApi.Message} message The message object
 * @returns {boolean} Whether or not the message was acted on in some way
 */
async function monitor(message) {
    // ignore posts from bots
    if (message.author.bot) return false;

    // ignore posts from mods
    if (message.member.permissions.has(DiscordApi.Permissions.FLAGS.MANAGE_MESSAGES)) return false;

    const client = message.client;
    const guildId = message.guild.id;
    const userId = message.member.id;
    const channelId = message.channel.id;
    const now = new Date().valueOf();

    try {
        const username = message.member.user.username + "#" + message.member.user.discriminator;
        const urlsFound = extractUrlsFromContent(message.content);

        // if the message contains a URL, log it.  If the same message is being spammed, remove it
        // if the user keeps spamming, kick the user, and back-delete all prior messages

        if (urlsFound.length > 0) {
            // check if the link is an invite code.  If it is, get the server ID
            let isThisServer = true;
            for (let url of urlsFound) {
                let linkServer = await getServerIdFromInvite(url);

                if (linkServer) {
                    if (linkServer === guildId) {
                        continue;
                    }
                }

                isThisServer = false;
                break;
            }

            if (isThisServer) return false;

            // get a key for the user + message + guild
            const hash = hashMessage(userId, guildId, message.content);

            if (!messageLogs[hash]) {
                // we haven't seen this message before.  Log it and exit
                messageLogs[hash] = {
                    first: now,
                    last: now,
                    hasKeyIndicators: containsKeyIndicators(message.content, true) > MINIMUM_INDICATORS,
                    messages: [{
                        messageId: message.id,
                        channelId,
                        deleted: false
                    }]
                };

                return false;
            }

            const log = messageLogs[hash];

            log.messages.push({
                messageId: message.id,
                channelId,
                deleted: false
            });
            log.last = now;

            if (log.hasKeyIndicators) {
                // be more strict - treat this as a scam
                if (log.messages.length === 2) {
                    // delete and warn
                    log.messages[log.messages.length - 1].deleted = true;
                    await spamUrlDetected(message, guildId, userId, username, reason, "warn");
                    return true;
                } else {
                    // delete all and kick
                    log.messages[log.messages.length - 1].deleted = true;
                    var priorMessages = log.messages.filter(m => !m.deleted);
                    delete messageLogs[hash]; // delete this because we don't need it anymore
                    await spamUrlDetected(message, guildId, userId, username, reason, "kick");
                    await cleanup(client, priorMessages, guildId, userId);
                    return true;
                }
            } else {
                // be more lax - it could just be spam
                if (log.messages.length === 2) {
                    // do nothing
                    return false;
                } else if (log.messages.length === 3) {
                    // delete just this one and warn
                    log.messages[log.messages.length - 1].deleted = true;
                    await spamUrlDetected(message, guildId, userId, username, reason, "warn");
                    return true;
                } else {
                    // delete all and kick
                    log.messages[log.messages.length - 1].deleted = true;
                    var priorMessages = log.messages.filter(m => !m.deleted);
                    delete messageLogs[hash]; // delete this because we don't need it anymore
                    await spamUrlDetected(message, guildId, userId, username, reason, "kick");
                    await cleanup(client, priorMessages, guildId, userId);
                    return true;
                }
            }
        }

        return false;
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