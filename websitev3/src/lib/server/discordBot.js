import { env } from '$env/dynamic/private';
import { Client, EmbedBuilder, GatewayIntentBits, PermissionsBitField } from "discord.js";
import { database } from "./db";

/** @type {Client | undefined} */
let discordClient;
/** @type {Promise<Client> | undefined} */
let discordClientPromise;


const getBotToken = () => env.DISCORD_BOT_TOKEN;

export async function getDiscordClient() {
    if (discordClient) {
        return discordClient;
    }

    if (discordClientPromise) {
        return await discordClientPromise;
    }

    discordClientPromise = (async () => {
        const token = getBotToken();

        if (!token) {
            throw new Error('Missing Discord bot token for server directory.');
        }

        const client = new Client({
            intents: [GatewayIntentBits.Guilds]
        });

        await client.login(token);
        discordClient = client;

        return client;
    })();

    try {
        return await discordClientPromise;
    } finally {
        discordClientPromise = undefined;
    }
}

/** @param {Client} client */
export async function fetchAllGuildRefs(client) {
	/** @type {Map<string, import('discord.js').Guild>} */
	const guildMap = new Map();

    await Promise.all(
        client.guilds.cache.map(
            /** @param {import('discord.js').Guild} guild  */
            async guild => {
                guildMap.set(guild.id, guild);
            }));

	return guildMap;
}

/**
 * 
 * @param {String} guildId 
 * @returns {String | null}
 */
function getLogChannel(guildId) {
    const server = database._getItem("logchannels", guildId);
    if (server)
        return server.channelId;

    return null;
}

/**
 * 
 * @param {Client} client 
 * @param {String} guildId 
 * @param {String} action 
 * @param {String} activity 
 * @param {String} color 
 * @returns {Promise<boolean>}
 */
export async function logActivity(client, guildId, action, activity, color = "#007bff", messageLink = undefined, override = undefined) {
    try {
        const logChannel = override ?? getLogChannel(guildId);

        if (!logChannel)
            return true;
            
        let channel = client.channels.cache.get(logChannel);

        // @ts-ignore
        if (!channel || !channel.send)
            // @ts-ignore
            channel = await client.channels.fetch(logChannel);

        const message = new EmbedBuilder()
            // @ts-ignore
            .setColor(color)
            .setTitle(action)
            .setDescription(activity)
            .setTimestamp();

        // @ts-ignore
        await channel.send({ embeds: [message], content: messageLink });

        return true;
    } catch (err) {
        console.log(`Error logging activity: ${err}`);

        return false;
    }
}

/**
 * 
 * @param {Client} client 
 * @param {string} guildId 
 * @param {string} userId 
 * @param {string} removal_action
 */
export async function confirmBehaviorManagement(client, guildId, userId, removal_action) {
    let guild;

    try {
        guild = await client.guilds.fetch(guildId);
    } catch (err) { 
        console.dir(err);
    }

    if (!guild) 
        return { success: false, error: "Cannot locate guild" };

    let member;

    try {
        member = await guild.members.fetch(userId);
    } catch (err) { 
        console.dir(err);
    }

    if (!member) 
        return { success: false, error: "User not member of guild" };

    // @ts-ignore
    if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) 
        return { success: false, error: "User missing permissions" };

    if (removal_action === "kick" && guild.members.me?.permissions.has(PermissionsBitField.Flags.KickMembers) !== true) {
        return { success: false, error: "Bot is missing the KICK_MEMBERS permission to function. Please grant that permission and then try this command again." };
    } else if (removal_action === "timeout" && guild.members.me?.permissions.has(PermissionsBitField.Flags.ModerateMembers) !== true) {
        return { success: false, error: "Bot is missing the TIMEOUT_MEMBERS permission to function. Please grant that permission and then try this command again." };
    } else if (removal_action === "ban" && guild.members.me?.permissions.has(PermissionsBitField.Flags.BanMembers) !== true) {
        return { success: false, error: "Bot is missing the BAN_MEMBERS permission to function. Please grant that permission and then try this command again." };
    }

    return { success: true, error: null };
}