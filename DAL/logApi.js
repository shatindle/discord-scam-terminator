const { EmbedBuilder, Client } = require("discord.js");
const { getLogChannel } = require("../DAL/databaseApi");

/**
 * 
 * @param {Client} client 
 * @param {String} guildId 
 * @param {String} action 
 * @param {String} activity 
 * @param {String} color 
 * @returns {Promise}
 */
async function logActivity(client, guildId, action, activity, color = "#007bff", messageLink = undefined) {
    try {
        const logChannel = getLogChannel(guildId);

        if (!logChannel)
            return;
            
        let channel = client.channels.cache.get(logChannel);

        if (!channel || !channel.send)
            channel = await client.channels.fetch(logChannel);

        const message = new EmbedBuilder()
            .setColor(color)
            .setTitle(action)
            .setDescription(activity)
            .setTimestamp();

        await channel.send({ embeds: [message], content: messageLink });
    } catch (err) {
        console.log(`Error logging activity: ${err}`);
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

const KICK_COLOR = "#dc3545";
const KICK_NOACTION_COLOR = "#a64d79";

const recentlyKickedUsers = [];

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
    let alreadyKicked = false;
    let id = `${guildId}-${userId}`

    if (recentlyKickedUsers[id]) alreadyKicked = true;
    else {
        recentlyKickedUsers[id] = true;
        setTimeout(() => {
            delete recentlyKickedUsers[id];
        }, 10000);
    }

    await logActivity(
        client,
        guildId, 
        `User${alreadyKicked ? " already " : " " }kicked. Reason: ${reason}`,
`**<@${userId}> sent this message in <#${channelId}>**:

\`${message.replace("`", "")}\``,
    alreadyKicked ? KICK_NOACTION_COLOR : KICK_COLOR);
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
    logInformation
};