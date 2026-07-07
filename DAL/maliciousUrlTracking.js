const { Message, PermissionFlagsBits } = require("discord.js");
const { lookupGuildBehavior } = require("./behaviorApi");
const { shouldActionUser, recordKick, recordTimeout, recordBan, recordError, recordWarning, recordFail, recordContentReview } = require("./databaseApi");
const { logWarning, logKick, logTimeout, logBan, forwardMessage, recentWarnings } = require("./logApi");
const { getDomainCreationDate } = require("./domainLookup");
const { getAllRedirects } = require("./redirectExtractor");
const { extractHostname } = require("./urlTesterApi");

/**
 * 
 * @param {String} domain 
 * @returns {Boolean}
 */
async function isDomainTooNew(domain) {
    try {
        const domainCreation = await getDomainCreationDate(domain);

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

        return domainCreation.valueOf() > sixMonthsAgo.valueOf();
    } catch (err) {
        console.error(`Error in domain too new check: ${err.toString()}`)
    }

    return false;
}

const TIMEOUT_TIME = 1000 * 60 * 60 * 24 * 3;
const BAN_DELETE_MESSAGE_SECONDS = 60 * 60 * 24;

/**
 * 
 * @param {Message} message 
 * @param {String} guildId 
 * @param {String} userId 
 * @param {String} username 
 * @param {String} reason 
 * @param {String} domain 
 * @param {String} maliciousUrl 
 */
async function maliciousUrlDetected(message, guildId, userId, username, reason, domain, maliciousUrl) {
    let cleanupNecessary = true;

    const content = message.content;
    const client = message.client;
    const channelId = message.channel.id;
    const channel = message.channel;
    const guild = message.guild;

     // could be a malicious URL.  We need to delete the message.
    if (message.deletable) {
        try {
            await message.delete();
        } catch(delErr) {
            try {
                await recordError(guildId, userId, "Line 55 of maliciousUrlTracking.js: " + JSON.stringify(delErr), reason);
            } catch(recordErr) { 
                console.log(`Line 56 of maliciousUrlTracking.js: Unable to delete message in ${guildId} for user ${userId}: ${recordErr}`)
            }
        }
    }

    if (channel && 
        guild && 
        channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages) && 
        channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.ViewChannel)) {

        if (!recentWarnings(guildId)) {
            // note: this may not send if a rate limit is in play...
            try {
                const response = await channel.send("Potentially dangerous URL or message pattern detected.  If this was in error, please let a Mod know.");

                setTimeout(function() {
                    if (response.deletable)
                        response.delete().catch(deleteError => console.log(`Error when the bot tried to delete it's warning, potential raid: ${deleteError}`));
                }, 5000);
            } catch (sendError) {
                console.log(`Error when the bot messaged a warning, potential raid: ${sendError}`);
            }
        }
    }

    let action = null;
    let domainTooNew = false;

    // perform domain check to see if the domain is too new
    if (domain) {
        domainTooNew = await isDomainTooNew(domain);
    }

    if (!domainTooNew && maliciousUrl) {
        // get all redirects (maliciousUrl will be undefined if this is not necessary)
        const allRedirects = await getAllRedirects(maliciousUrl);

        if (allRedirects.length > 1) {
            // check if the domain is too new
            let thisHost = extractHostname(allRedirects[allRedirects.length - 1]);

            if (thisHost !== domain) {
                domainTooNew = await isDomainTooNew(thisHost);
            }
        }
    }

    // should we ban the user? 
    if (domainTooNew || shouldActionUser(message.member.id, content)) {
        const behaviors = lookupGuildBehavior(message.guildId);

        if (behaviors.removal_action === "kick" && message.member.kickable) {
            // attempt soft-ban
            let softbanSuccess = false;
            try {
                // attempt a ban/unban to more efficiently deal with message history
                let softbanUserId = message.member.id;

                // TODO: if this causes problems, we'll have to make a new flag for soft-ban
                if (message.member.bannable) {
                    await message.member.ban({ reason: `Soft ban: ${reason}`, deleteMessageSeconds: BAN_DELETE_MESSAGE_SECONDS });
                    await message.guild.members.unban(softbanUserId, `Soft ban: ${reason}`);

                    softbanSuccess = true;
                    cleanupNecessary = false;
                }
            } catch(cannotBan) { /* could not soft ban, do kick instead */ }

            if (!softbanSuccess) await message.member.kick(reason);

            await recordKick(
                guildId,
                userId,
                username,
                reason);

            await logKick(client, guildId, userId, channelId, content, reason);

            action = "kick-success";
        } else if (behaviors.removal_action === "timeout" && message.member.manageable) {
            await message.member.timeout(TIMEOUT_TIME, reason);
            await recordTimeout(
                guildId,
                userId,
                username,
                reason);

            await logTimeout(client, guildId, userId, channelId, content, reason);

            action = "timeout-success";
        } else if (behaviors.removal_action === "ban" && message.member.bannable) {
            await message.member.ban({ reason, deleteMessageSeconds: BAN_DELETE_MESSAGE_SECONDS });
            await recordBan(
                guildId,
                userId,
                username,
                reason);

            await logBan(client, guildId, userId, channelId, content, reason);

            action = "ban-success";
            cleanupNecessary = false;
        } else {
            await recordFail(
                guildId,
                userId,
                username,
                reason);

            await logWarning(client, guildId, userId, channelId, content, reason);

            action = "action-fail";
        }
    } else {
        await recordWarning(
            guildId,
            userId,
            username,
            reason);

        await logWarning(client, guildId, userId, channelId, content, reason);

        action = "warn";
    }

    try {
        await recordContentReview(
            guildId,
            userId,
            username,
            action,
            content);
    } catch (err) {
        await recordError(guildId, userId, err.toString(), "failed to record content review message");
    }

    return cleanupNecessary;
}

/** @type {{[id:string]:NodeJS.Timeout}} */
const forwardedRecently = {};

const RECENT_FORWARD_ACTION = 10000;

const recentForward = (guildId) => {
    if (forwardedRecently[guildId]) {
        // we've recently removed an image in this guild, do light reporting
        clearTimeout(forwardedRecently[guildId]);

        forwardedRecently[guildId] = 
            setTimeout(() => delete forwardedRecently[guildId], RECENT_FORWARD_ACTION);

        return true;
    }

    forwardedRecently[guildId] = 
        setTimeout(() => delete forwardedRecently[guildId], RECENT_FORWARD_ACTION);

    return false;
}

/**
 * 
 * @param {Message} message 
 * @param {String} guildId 
 * @param {String} userId 
 * @param {String} username 
 * @param {String} reason 
 * @param {String} perform 
 * @returns {Promise<boolean>} Whether or not cleanup is necessary
 */
async function spamUrlDetected(message, guildId, userId, username, reason, perform) {
    let cleanupNecessary = true;

    let content;

    if (reason === "Image spam") {
        content = "Images attached:\n";
        
        message.attachments.forEach(t => {
            content += t.url + "\n";
        });
    } else {
        content = message.content;
    }

    const client = message.client;
    const channelId = message.channel.id;
    const channel = message.channel;
    const guild = message.guild;

    if (perform !== "no-action") {
        // could be a malicious URL.  We need to delete the message.
        if (message.deletable) {
            if (reason === "Image spam" && !recentForward(guildId)) {
                await forwardMessage(client, guildId, message);
            }

            try {
                await message.delete();
            } catch(delErr) {
                try {
                    await recordError(guildId, userId, "Line 223 of maliciousUrlTracking.js: " + JSON.stringify(delErr), reason);
                } catch { 
                    console.log(`Line 224 of maliciousUrlTracking.js: Unable to delete message in ${guildId} for user ${userId}: ${recordErr}`)
                }
            }
        }

        if (channel && 
            guild && 
            channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages) && 
            channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.ViewChannel)) {

            if (!recentWarnings(guildId)) {
                // due to the increase in image spam problems, don't bother sending this message
                // TODO: if Discord approves the rate limit request increase, undo this
                try {
                    const response = await channel.send("Spam detected.  If this was in error, please let a Mod know.");

                    setTimeout(function() {
                        if (response.deletable)
                            response.delete().catch(deleteError => console.log(`Error when the bot deleted it's message, potential raid: ${deleteError}`));
                    }, 5000);
                } catch(sendError) {
                    console.log(`Error when the bot messaged a warning, potential raid: ${sendError}`);
                }
            }
        }
    }
    
    let action = "no-action";

    // should we ban the user? 
    if (perform === "warn") {
        await recordWarning(
            guildId,
            userId,
            username,
            reason);

        await logWarning(client, guildId, userId, channelId, content, reason);

        action = "warn";
    } else if (perform === "remove") {
        const behaviors = lookupGuildBehavior(message.guildId);

        if (behaviors.removal_action === "kick" && message.member.kickable) {
            // attempt soft-ban
            let softbanSuccess = false;
            try {
                // attempt a ban/unban to more efficiently deal with message history
                let softbanUserId = message.member.id;

                // TODO: if this causes problems, we'll have to make a new flag for soft-ban
                if (message.member.bannable) {
                    await message.member.ban({ reason: `Soft ban: ${reason}`, deleteMessageSeconds: BAN_DELETE_MESSAGE_SECONDS });
                    await message.guild.members.unban(softbanUserId, `Soft ban: ${reason}`);

                    softbanSuccess = true;
                    cleanupNecessary = false;
                }
            } catch(cannotBan) { /* could not soft ban, do kick instead */ }

            if (!softbanSuccess) await message.member.kick(reason);

            await recordKick(
                guildId,
                userId,
                username,
                reason);

            await logKick(client, guildId, userId, channelId, content, reason);

            action = "kick-success";
        } else if (behaviors.removal_action === "timeout" && message.member.manageable) {
            await message.member.timeout(TIMEOUT_TIME, reason);
            await recordTimeout(
                guildId,
                userId,
                username,
                reason);

            await logTimeout(client, guildId, userId, channelId, content, reason);

            action = "timeout-success";
        } else if (behaviors.removal_action === "ban" && message.member.bannable) {
            await message.member.ban({ reason, deleteMessageSeconds: BAN_DELETE_MESSAGE_SECONDS });
            await recordBan(
                guildId,
                userId,
                username,
                reason);

            await logBan(client, guildId, userId, channelId, content, reason);

            action = "ban-success";
            cleanupNecessary = false;
        } else {
            await recordFail(
                guildId,
                userId,
                username,
                reason);

            await logWarning(client, guildId, userId, channelId, content, reason);

            action = "action-fail";
        }
    }

    // if perform is anything else, just record the content for review

    try {
        await recordContentReview(
            guildId,
            userId,
            username,
            action,
            content);
    } catch (err) {
        await recordError(guildId, userId, err.toString(), "failed to record content review message");
    }

    return cleanupNecessary;
}

module.exports = {
    maliciousUrlDetected,
    spamUrlDetected
};