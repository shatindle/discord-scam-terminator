const { Message } = require("discord.js");
const { lookupGuildBehavior } = require("./behaviorApi");
const { shouldActionUser, recordKick, recordTimeout, recordBan, recordError, recordWarning, recordFail, recordContentReview } = require("./databaseApi");
const { logWarning, logKick, logTimeout, logBan, forwardMessage } = require("./logApi");
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
    const content = message.content;
    const client = message.client;
    const channelId = message.channel.id;

    // could be a malicious URL.  We need to delete the message.
    if (message.deletable) {
        await message.delete();
    }

    const response = await message.channel.send(
        "Potentially dangerous URL or message pattern detected.  If this was in error, please let a Mod know.");

    setTimeout(async function() {
        if (response.deletable)
            await response.delete();
    }, 5000);

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
            await message.member.kick(reason);
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
}

/**
 * 
 * @param {Message} message 
 * @param {String} guildId 
 * @param {String} userId 
 * @param {String} username 
 * @param {String} reason 
 * @param {String} perform 
 */
async function spamUrlDetected(message, guildId, userId, username, reason, perform) {
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

    if (perform !== "no-action") {
        // could be a malicious URL.  We need to delete the message.
        if (message.deletable) {
            if (reason === "Image spam") {
                await forwardMessage(client, guildId, message);
            }

            await message.delete();
        }

        const response = await message.channel.send(
            "Spam detected.  If this was in error, please let a Mod know.");

        setTimeout(async function() {
            if (response.deletable)
                await response.delete();
        }, 5000);
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
            await message.member.kick(reason);
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
}

module.exports = {
    maliciousUrlDetected,
    spamUrlDetected
};