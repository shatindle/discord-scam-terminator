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
async function logActivity(client, guildId, action, activity, color = "#007bff") {
    try {
        const logChannel = getLogChannel(guildId);

        if (!logChannel)
            return;
            
        let channel = client.channels.cache.get(logChannel);

        if (!channel || !channel.send)
            channel = client.channels.fetch(logChannel);

        const message = new EmbedBuilder()
            .setColor(color)
            .setTitle(action)
            .setDescription(activity)
            .setTimestamp();

        await channel.send({ embeds: [message] });
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
const logKick = async (client, guildId, userId, channelId, message = "", reason = "unknown") =>
    await logActivity(
        client,
        guildId, 
        `User kicked. Reason: ${reason}`,
`**<@${userId}> sent this message in <#${channelId}>**:

\`${message.replace("`", "")}\``,
        KICK_COLOR);


module.exports = {
    logActivity,
    logWarning,
    logKick
};