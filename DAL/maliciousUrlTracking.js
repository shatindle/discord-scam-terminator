const { shouldBanUser, recordKick, recordError, recordWarning, recordFail, recordContentReview } = require("./databaseApi");
const { logWarning, logKick } = require("./logApi");

async function maliciousUrlDetected(message, guildId, userId, username, reason) {
    const content = message.content;
    const client = message.client;
    const channelId = message.channel.id;

    // could be a malicious URL.  We need to delete the message.
    if (message.deletable) {
        await message.delete();
    }

    var response = await message.channel.send(
        "Malicious URL detected.  If this was in error, please let a Mod know.");

    setTimeout(async function() {
        if (response.deletable)
            await response.delete();
    }, 5000);

    let action = null;

    // should we ban the user? 
    if (shouldBanUser(message.member.id, content)) {
        if (message.member.kickable) {
            
            await message.member.kick();
            await recordKick(
                guildId,
                userId,
                username,
                reason);

            await logKick(client, guildId, userId, channelId, content);

            action = "kick-success";
        } else {
            await recordFail(
                guildId,
                userId,
                username,
                reason);

            await logWarning(client, guildId, userId, channelId, content);

            action = "kick-fail"
        }
    } else {
        await recordWarning(
            guildId,
            userId,
            username,
            reason);

        await logWarning(client, guildId, userId, channelId, content);

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

async function spamUrlDetected(message, guildId, userId, username, reason, perform) {
    const content = message.content;
    const client = message.client;
    const channelId = message.channel.id;

    if (perform !== "no-action") {
        // could be a malicious URL.  We need to delete the message.
        if (message.deletable) {
            await message.delete();
        }

        var response = await message.channel.send(
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

        await logWarning(client, guildId, userId, channelId, content);

        action = "warn";
    } else if (perform === "kick") {
        if (message.member.kickable) {
            
            await message.member.kick();
            await recordKick(
                guildId,
                userId,
                username,
                reason);

            await logKick(client, guildId, userId, channelId, content);

            action = "kick-success";
        } else {
            await recordFail(
                guildId,
                userId,
                username,
                reason);

            await logWarning(client, guildId, userId, channelId, content);

            action = "kick-fail"
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