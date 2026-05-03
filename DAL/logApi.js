const { EmbedBuilder, Client, Message } = require("discord.js");
const { getLogChannel } = require("../DAL/databaseApi");

/**
 * 
 * @param {Client} client 
 * @param {string} guildId 
 * @param {Message} message 
 * @param {string | undefined} override
 * @param {string | undefined} supplement
 * @returns 
 */
async function forwardMessage(client, guildId, message, override = undefined, supplement = undefined) {
    try {
        const logChannel = override ?? getLogChannel(guildId);

        if (!logChannel)
            return true;
            
        let channel = client.channels.cache.get(logChannel);

        if (!channel || !channel.send)
            channel = await client.channels.fetch(logChannel);

        if (supplement) {
            try {
                const supplementaryMessage = new EmbedBuilder()
                    .setColor("#E03EC7")
                    .setTitle("Unusual behavior")
                    .setDescription(supplement)
                    .setTimestamp();

                await channel.send({ embeds: [supplementaryMessage] });
            } catch (err) {
                console.log(`Error adding supplementary message: ${err}`);
            }
        }

        await message.forward(channel);

        return true;
    } catch (err) {
        console.log(`Error logging activity: ${err}`);

        return false;
    }
}

/**
 * 
 * @param {Client} client 
 * @param {String} guildId 
 * @param {String} action 
 * @param {String} activity 
 * @param {String} color 
 * @returns {Promise}
 */
async function logActivity(client, guildId, action, activity, color = "#007bff", messageLink = undefined, override = undefined) {
    try {
        const logChannel = override ?? getLogChannel(guildId);

        if (!logChannel)
            return true;
            
        let channel = client.channels.cache.get(logChannel);

        if (!channel || !channel.send)
            channel = await client.channels.fetch(logChannel);

        const message = new EmbedBuilder()
            .setColor(color)
            .setTitle(action)
            .setDescription(activity)
            .setTimestamp();

        await channel.send({ embeds: [message], content: messageLink });

        return true;
    } catch (err) {
        console.log(`Error logging activity: ${err}`);

        return false;
    }
}

const WARNING_COLOR = "#ffc107";

/**
 * 
 * @param {Client} client 
 * @param {String} guildId 
 * @param {String} userId 
 * @param {String} channelId 
 * @param {String} message 
 * @param {String} reason 
 * @returns {Promise}
 */
const logWarning = async (client, guildId, userId, channelId, message = "", reason = "unknown") =>
    await logActivity(
        client,
        guildId, 
        `User warned. Reason: ${reason}`,
`**<@${userId}> sent this message in <#${channelId}>**:

\`${message.replace("`", "")}\``,
        WARNING_COLOR);

const ACTION_COLOR = "#dc3545";
const ACTION_NOACTION_COLOR = "#a64d79";

const recentlyActionedUsers = [];

/**
 * 
 * @param {Client} client 
 * @param {String} guildId 
 * @param {String} userId 
 * @param {String} channelId 
 * @param {String} message 
 * @param {String} reason 
 * @returns 
 */
async function logKick(client, guildId, userId, channelId, message = "", reason = "unknown") {
    let alreadyActioned = false;
    let id = `${guildId}-${userId}`

    if (recentlyActionedUsers[id]) alreadyActioned = true;
    else {
        recentlyActionedUsers[id] = true;
        setTimeout(() => {
            delete recentlyActionedUsers[id];
        }, 10000);
    }

    await logActivity(
        client,
        guildId, 
        `User${alreadyActioned ? " already " : " " }kicked. Reason: ${reason}`,
`**<@${userId}> sent this message in <#${channelId}>**:

\`${message.replace("`", "")}\``,
    alreadyActioned ? ACTION_NOACTION_COLOR : ACTION_COLOR);
}

/**
 * 
 * @param {Client} client 
 * @param {String} guildId 
 * @param {String} userId 
 * @param {String} channelId 
 * @param {String} message 
 * @param {String} reason 
 * @returns 
 */
async function logTimeout(client, guildId, userId, channelId, message = "", reason = "unknown") {
    let alreadyActioned = false;
    let id = `${guildId}-${userId}`

    if (recentlyActionedUsers[id]) alreadyActioned = true;
    else {
        recentlyActionedUsers[id] = true;
        setTimeout(() => {
            delete recentlyActionedUsers[id];
        }, 10000);
    }

    await logActivity(
        client,
        guildId, 
        `User${alreadyActioned ? " already " : " " }timed out. Reason: ${reason}`,
`**<@${userId}> sent this message in <#${channelId}>**:

\`${message.replace("`", "")}\``,
    alreadyActioned ? ACTION_NOACTION_COLOR : ACTION_COLOR);
}

/**
 * 
 * @param {Client} client 
 * @param {String} guildId 
 * @param {String} userId 
 * @param {String} channelId 
 * @param {String} message 
 * @param {String} reason 
 * @returns 
 */
async function logBan(client, guildId, userId, channelId, message = "", reason = "unknown") {
    let alreadyActioned = false;
    let id = `${guildId}-${userId}`

    if (recentlyActionedUsers[id]) alreadyActioned = true;
    else {
        recentlyActionedUsers[id] = true;
        setTimeout(() => {
            delete recentlyActionedUsers[id];
        }, 10000);
    }

    await logActivity(
        client,
        guildId, 
        `User${alreadyActioned ? " already " : " " }banned. Reason: ${reason}`,
`**<@${userId}> sent this message in <#${channelId}>**:

\`${message.replace("`", "")}\``,
    alreadyActioned ? ACTION_NOACTION_COLOR : ACTION_COLOR);
}

const INFORMATION_COLOR = "#cccccc";

/**
 * 
 * @param {Client} client 
 * @param {String} guildId 
 * @param {String} userId 
 * @param {String} channelId 
 * @param {String} message 
 * @param {String} reason 
 * @returns {Promise}
 */
const logInformation = async (client, guildId, userId, channelId, message = "", reason = "unknown", messageLink = undefined) =>
    await logActivity(
        client,
        guildId, 
        `${reason}, no warning`,
`**<@${userId}> sent this message in <#${channelId}>**:

\`${message.replace("`", "")}\``,
    INFORMATION_COLOR,
    messageLink);


module.exports = {
    logActivity,
    logWarning,
    logKick,
    logTimeout,
    logBan,
    logInformation,
    forwardMessage
};