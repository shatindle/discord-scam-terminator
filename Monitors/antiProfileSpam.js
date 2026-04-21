const { Message, PermissionsBitField, Client } = require("discord.js");
const { discordInvitePattern, containsProfileRequest } = require("../DAL/bodyparserApi");
const { recordError, hashMessage } = require("../DAL/databaseApi");
const { spamUrlDetected } = require("../DAL/maliciousUrlTracking");
const { textTooSimilar, candidateForComparison } = require("../DAL/textComparisonTools");

const reason = "Profile spam";

const messageLogs = {};
const time = 1000 * 40;

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

/**
 * 
 * @param {Client} client 
 * @param {Array<{messageId:string,channelId:string,deleted:boolean}>} messageList 
 * @param {String} guildId 
 * @param {String} userId 
 */
async function cleanup(client, messageList, guildId, userId) {
    // shallow copy this array since it's possible other messages will be added
    messageList = [...messageList];

    for (let i = 0; i < messageList.length; i++) {
        try {
            const ids = messageList[i];

            // make sure something else didn't beat us to deleting this
            if (ids.deleted) continue;

            const channel = await client.channels.fetch(ids.channelId);
            const message = await channel.messages.fetch(ids.messageId);

            if (message.deletable) {
                // final check to avoid a race condition
                if (ids.deleted) continue;

                ids.deleted = true;
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

// TODO: if Discord ever allows profile checking, refine this code...

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

    const client = message.client;
    const guildId = message.guild.id;
    const userId = message.member.id;
    const channelId = message.channel.id;
    const now = new Date().valueOf();

    try {
        const username = message.member.user.username + "#" + message.member.user.discriminator;
        const isProfileRequest = containsProfileRequest(message.content, true) > 1;

        if (message.guildId === "951299886115090493") console.log(`isProfileRequest: ${isProfileRequest}`);

        // if the message contains a URL, log it.  If the same message is being spammed, remove it
        // if the user keeps spamming, remove the user, and back-delete all prior messages

        if (isProfileRequest) {
            // get a key for the user + message + guild
            const userGuildHash = hashMessage(userId, guildId, "");
            const cleanMessage = message.content ? message.content.replace(discordInvitePattern, '[DISCORDINVITE]') : '';

            if (!messageLogs[userGuildHash]) {
                // this is a unique message, hash it and exit
                messageLogs[userGuildHash] = {
                    content: cleanMessage,
                    first: now,
                    last: now,
                    messages: [{
                        messageId: message.id,
                        channelId,
                        deleted: false
                    }]
                };

                return false;
            }

            const log = messageLogs[userGuildHash];

            // check if this message is being basically spammed
            // enforce tighter threshold checking
            if (textTooSimilar(cleanMessage, log.content, 0.96)) {
                // ignore this message if we've already seen it in this channel
                if (log.messages.some(t => t.channelId === channelId))
                    return false;

                log.messages.push({
                    messageId: message.id,
                    channelId,
                    deleted: false
                });
                log.last = now;

                // be more lax - it could just be unintentional spam
                if (log.messages.length === 2) {
                    // do nothing
                    return false;
                } else if (log.messages.length === 3) {
                    // delete just this one and warn
                    log.messages[log.messages.length - 1].deleted = true;
                    await spamUrlDetected(message, guildId, userId, username, reason, "warn");
                    return true;
                } else {
                    // delete all and remove
                    log.messages[log.messages.length - 1].deleted = true;
                    const priorMessages = log.messages.filter(m => !m.deleted);
                    await spamUrlDetected(message, guildId, userId, username, reason, "remove");
                    await cleanup(client, priorMessages, guildId, userId);
                    return true;
                }
            } else {
                // this is a unique message, hash it and exit
                messageLogs[userGuildHash] = {
                    content: cleanMessage,
                    first: now,
                    last: now,
                    messages: [{
                        messageId: message.id,
                        channelId,
                        deleted: false
                    }]
                };

                return false;
            }
        } else {
            // the user sent a message that is not suspicious.  They are likely not a botted user
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