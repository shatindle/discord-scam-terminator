const { EmbedBuilder, Client, Message, PermissionFlagsBits } = require("discord.js");
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

        if (!channel ||
            !channel.send ||
            !channel.permissionsFor || 
            !channel.permissionsFor(channel.guild.members.me).has(PermissionFlagsBits.SendMessages) ||
            !channel.permissionsFor(channel.guild.members.me).has(PermissionFlagsBits.ViewChannel) ||
            !channel.permissionsFor(channel.guild.members.me).has(PermissionFlagsBits.EmbedLinks)) {
            // log channel is not setup right
            return true;
        }

        const sourceNsfwStatus = message.channel.nsfw || message.channel.parent?.nsfw || false;
        const destinationNsfwStatus = channel.nsfw;

        if (supplement) {
            try {
                const supplementaryMessage = new EmbedBuilder()
                    .setColor("#E03EC7")
                    .setTitle("Unusual behavior")
                    .setDescription(supplement)
                    .setTimestamp();

                await channel.send({ embeds: [supplementaryMessage] });
            } catch (sendError) {
                console.log(`Error adding supplementary message: ${sendError}`);
            }
        }

        try {
            // if source is nsfw but destination isn't, we can't forward the message
            if (sourceNsfwStatus && !destinationNsfwStatus) return true;

            await message.forward(channel);
        } catch (forwardError) {
            console.log(`Unable to foward message for ${guildId}, potential rate limit: ${forwardError}`);
            
            // because we could not forward the message, assume the message is not deletable
            return false;
        }

        // the message should be deletable
        return true;
    } catch (err) {
        console.log(`Error logging activity when forwarding a message: ${err}`);

        // because something went wrong, assume the message is gone
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

        if (!channel ||
            !channel.send ||
            !channel.permissionsFor || 
            !channel.permissionsFor(channel.guild.members.me).has(PermissionFlagsBits.SendMessages) ||
            !channel.permissionsFor(channel.guild.members.me).has(PermissionFlagsBits.ViewChannel) ||
            !channel.permissionsFor(channel.guild.members.me).has(PermissionFlagsBits.EmbedLinks)) {
            // log channel is not setup right
            return true;
        }

        const message = new EmbedBuilder()
            .setColor(color)
            .setTitle(action)
            .setDescription(activity)
            .setTimestamp();

        // this we should not try/catch as it is also connected to the /log command
        await channel.send({ embeds: [message], content: messageLink });

        return true;
    } catch (err) {
        console.log(`Error logging activity: ${err}`);

        return false;
    }
}

const ERROR_COLOR = "#ff00ff";

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
const logError = async (client, guildId, userId, channelId, message = "", reason = "unknown") =>
    await logActivity(
        client,
        guildId, 
        `Server configuration error. Reason: ${reason}`,
`**<@${userId}> sent a message we may or may not have been able to handle in <#${channelId}> due to an error.**`,
        ERROR_COLOR);

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

/** @type {{[id:string]:NodeJS.Timeout|undefined}} */
const recentlyActionedUsers = {};

const RECENT_ACTION_TIMEOUT = 10000;

/**
 * 
 * @param {string} guildId The guild ID the event happened in
 * @param {string} userId The user ID that did it
 * @param {boolean} check Whether or not we should record this event
 * @returns {boolean}
 */
const isRecentlyActioned = (guildId, userId) => {
    let id = `${guildId}-${userId}`;

    if (recentlyActionedUsers[id]) {
        // just reset the timer
        clearTimeout(recentlyActionedUsers[id]);

        recentlyActionedUsers[id] = setTimeout(() => {
            delete recentlyActionedUsers[id];
        }, RECENT_ACTION_TIMEOUT);

        return true;
    }
    
    recentlyActionedUsers[id] = 
        setTimeout(() => delete recentlyActionedUsers[id], RECENT_ACTION_TIMEOUT);

    return false;
};

/** @type {{[guildId:string]:NodeJS.Timeout|undefined}} */
const recentlyActionedGuilds = {};

const RECENT_GUILD_ACTION = 10000;

const recentWarnings = (guildId) => {
    if (recentlyActionedGuilds[guildId]) {
        // we've recently removed an image in this guild, do light reporting
        clearTimeout(recentlyActionedGuilds[guildId]);

        recentlyActionedGuilds[guildId] = 
            setTimeout(() => delete recentlyActionedGuilds[guildId], RECENT_GUILD_ACTION);

        return true;
    }

    recentlyActionedGuilds[guildId] = 
        setTimeout(() => delete recentlyActionedGuilds[guildId], RECENT_GUILD_ACTION);

    return false;
};

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
    
    if (isRecentlyActioned(guildId, userId)) return;

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
    
    if (isRecentlyActioned(guildId, userId)) return;

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
    
    if (isRecentlyActioned(guildId, userId)) return;

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
    logError,
    logKick,
    logTimeout,
    logBan,
    logInformation,
    forwardMessage,
    recentWarnings
};