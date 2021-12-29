const DiscordApi = require('discord.js');
const { recordBan, recordKick, recordFail, recordError } = require("../DAL/databaseApi");

const reason = "Clonex crypto scam";

/**
 * @description Looks for Clonex users and bans them
 * @param {DiscordApi.Client} discord The discord client
 */
function monitor(discord) {
    discord.on("guildMemberAdd", async (member) => {
        try {
            var guildId = member.guild.id;
            var userId = member.user.id;
            var fullUsername = member.user.username + "#" + member.user.discriminator;

            var username = member.user.username.toLowerCase();
            if (username.indexOf("clonex") > -1) {
                // this is likely a clonex scam bot.  Ban it.
                if (member.bannable) {
                    await member.ban();
                    await recordBan(
                        guildId,
                        userId, 
                        fullUsername, 
                        reason);
                } else if (member.kickable) {
                    await member.kick();
                    await recordKick(
                        guildId,
                        userId, 
                        fullUsername, 
                        reason);
                } else {
                    await recordFail(
                        guildId,
                        userId, 
                        fullUsername, 
                        reason);
                }
            }
        } catch (err) {
            var guildiderr = "";
            var memberiderr = "";

            try {
                memberiderr = member.user.id;
            } catch {}

            try {
                guildiderr = member.guild.id;
            } catch {}

            try {
                await recordError(guildiderr, memberiderr, err, reason);
            } catch (err2) {
                await recordError("", "", err2, reason);
            }
        }
    });
}

module.exports = monitor;