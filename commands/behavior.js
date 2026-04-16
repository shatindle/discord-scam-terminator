const { PermissionsBitField, ChannelType } = require("discord.js");
const { SlashCommandBuilder } = require('discord.js');
const { registerBehaviorMonitor } = require("../DAL/databaseApi");
const { logActivity } = require("../DAL/logApi");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('behavior')
		.setDescription("Override the bot's default behavior. All rules are enabled unless explicitly disabled.")
        .addBooleanOption(option =>
            option.setName("restore_defaults")
                .setDescription("Restore the bot to the default settings. True ignores all other settings.")
                .setRequired(false))
        .addBooleanOption(option => 
            option.setName("nitro_steam_spam")
                .setDescription("Enable or disable nitro/steam scam detection, channel agnostic.")
                .setRequired(false))
        .addBooleanOption(option => 
            option.setName("malicious_redirects")
                .setDescription("Enable or disable malicious redirect detection. May not work with some hosting providers.")
                .setRequired(false))
        .addBooleanOption(option => 
            option.setName("image_spam")
                .setDescription("Enable or disable image spam detection across channels.")
                .setRequired(false))
        .addBooleanOption(option => 
            option.setName("link_spam")
                .setDescription("Enable or disable link spam detection across channels.")
                .setRequired(false))
        .addBooleanOption(option => 
            option.setName("text_spam")
                .setDescription("Enable or disable text spam detection across channels. Uses text similarity detection.")
                .setRequired(false))
        .addStringOption(option => 
            option.setName("removal_action")
                .setDescription("Action to take when a user exhibits scam/spam behavior.")
                .addChoices([
                    { name: "Kick (default)", value: "kick" },
                    { name: "Timeout ", value: "timeout" },
                    { name: "Ban", value: "ban" }
                ])
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels),
    /**
     * 
     * @param {Interaction} interaction 
     * @returns 
     */
	async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;
            const restore_defaults = interaction.options.getBoolean("restore_defaults") ?? false;
            const nitro_steam_spam = interaction.options.getBoolean("nitro_steam_spam") ?? true;
            const malicious_redirects = interaction.options.getBoolean("malicious_redirects") ?? true;
            const image_spam = interaction.options.getBoolean("image_spam") ?? true;
            const link_spam = interaction.options.getBoolean("link_spam") ?? true;
            const text_spam = interaction.options.getBoolean("text_spam") ?? true;
            const removal_action = interaction.options.getString("removal_action");

            const hasManageChannel = interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels);

            if (!hasManageChannel) {
                await interaction.reply({ content: "You need the MANAGE_CHANNELS permission to run this command", ephemeral: true });
                return;
            }

            if (removal_action === "kick" && interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers) !== true) {
                await interaction.reply({ content: "I need the KICK_MEMBERS permission to function. Please grant that permission and then try this command again.", ephemeral: true });
                return;
            } else if (removal_action === "timeout" && interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers) !== true) {
                await interaction.reply({ content: "I need the TIMEOUT_MEMBERS permission to function. Please grant that permission and then try this command again.", ephemeral: true });
                return;
            } else if (removal_action === "ban" && interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers) !== true) {
                await interaction.reply({ content: "I need the BAN_MEMBERS permission to function. Please grant that permission and then try this command again.", ephemeral: true });
                return;
            }

            const ruleSettings = await registerBehaviorMonitor(
                userId,
                guildId,
                restore_defaults,
                nitro_steam_spam,
                malicious_redirects,
                image_spam,
                link_spam,
                text_spam,
                removal_action ?? "kick");

            await logActivity(
                interaction.client, 
                interaction.guild.id, 
                `Bot behavior changed.\n${ruleSettings}`, 
                `<@${interaction.user.id}> used:\n ${interaction.toString()}`,
                "#007bff"
            ); 
        
            await interaction.reply({ content: ruleSettings, ephemeral: false });
            return;
        } catch (err) {
            console.log(`Error in /log: ${err}`);
            await interaction.reply({ content: 'An unknown error occurred. Please let the developer know', ephemeral: false });
        }
	},
};