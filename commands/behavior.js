const { PermissionsBitField, ChannelType } = require("discord.js");
const { SlashCommandBuilder } = require('discord.js');
const { registerBehaviorMonitor } = require("../DAL/databaseApi");
const { logActivity } = require("../DAL/logApi");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('behavior')
		.setDescription("Override the bot's default behavior. All rules are enabled unless explicitly disabled.")
        .addBooleanOption(option =>
            option.setName("enable_everything")
                .setDescription("Reset a channel to allow all rules. True ignores all other settings.")
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
                .setDescription("Enable or disable image spam detection across channels. May not work with some hosting providers.")
                .setRequired(false))
        .addBooleanOption(option => 
            option.setName("link_spam")
                .setDescription("Enable or disable link spam detection across channels.")
                .setRequired(false))
        .addBooleanOption(option => 
            option.setName("text_spam")
                .setDescription("Enable or disable text spam detection across channels. Uses text similarity detection.")
                .setRequired(false)),
    /**
     * 
     * @param {Interaction} interaction 
     * @returns 
     */
	async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;
            const enable_everything = interaction.options.getBoolean("enable_everything") ?? false;
            const nitro_steam_spam = interaction.options.getBoolean("nitro_steam_spam") ?? true;
            const malicious_redirects = interaction.options.getBoolean("malicious_redirects") ?? true;
            const image_spam = interaction.options.getBoolean("image_spam") ?? true;
            const link_spam = interaction.options.getBoolean("link_spam") ?? true;
            const text_spam = interaction.options.getBoolean("text_spam") ?? true;

            if (target) {
                const channel = await interaction.guild.channels.fetch(target.id);

                if (!channel) {
                    await interaction.reply({ content: 'I could not find the channel <#' + target.id + '>.', ephemeral: true });
                    return;
                }
            }

            const currentPermissions = channel.permissionsFor(interaction.member.user.id);

            if (!currentPermissions.has(PermissionsBitField.Flags.ManageChannels)) {
                await interaction.reply({ content: "You need the MANAGE_CHANNELS permission to run this command", ephemeral: true });
                return;
            }

            const ruleSettings = await registerBehaviorMonitor(
                userId,
                guildId,
                enable_everything,
                nitro_steam_spam,
                malicious_redirects,
                image_spam,
                link_spam,
                text_spam);

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