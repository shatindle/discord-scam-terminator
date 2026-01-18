const { Message, PermissionsBitField, Client } = require("discord.js");
const { recordError, hashMessage } = require("../DAL/databaseApi");
const { spamUrlDetected } = require("../DAL/maliciousUrlTracking");

const reason = "Image spam";

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

    for (var i = 0; i < messageList.length; i++) {
        try {
            var ids = messageList[i];

            // make sure something else didn't beat us to deleting this
            if (ids.deleted) continue;

            var channel = await client.channels.fetch(ids.channelId);
            var message = await channel.messages.fetch(ids.messageId);

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
        const hasImages = message.attachments && message.attachments.size > 0;

        // if the message contains a URL, log it.  If the same message is being spammed, remove it
        // if the user keeps spamming, kick the user, and back-delete all prior messages

        if (hasImages) {
            // get a key for the user + message + guild
            const userGuildHash = hashMessage(userId, guildId, "");

            // vary the hash if the image count changes
            const hash = hashMessage(userId, guildId, message.attachments.size.toString());

            if (!messageLogs[userGuildHash] || messageLogs[userGuildHash].hash !== hash) {
                // this is a unique message, hash it and exit
                messageLogs[userGuildHash] = {
                    hash,
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

            log.messages.push({
                messageId: message.id,
                channelId,
                deleted: false
            });
            log.last = now;


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
                // TODO: see if we're deleting this hash prematurely.  That may be why some messages fall through the cracks
                //delete messageLogs[userGuildHash]; // delete this because we don't need it anymore
                await spamUrlDetected(message, guildId, userId, username, reason, "kick");
                await cleanup(client, priorMessages, guildId, userId);
                return true;
            }
        } else {
            // the user sent a message that is not suspicious.  They are likely not a botted user
            // if the user is hashed, clear it
            const userGuildHash = hashMessage(userId, guildId, "");
            if (messageLogs[userGuildHash]) {
                delete messageLogs[userGuildHash];
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