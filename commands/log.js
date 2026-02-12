const { PermissionsBitField, ChannelType } = require("discord.js");
const { SlashCommandBuilder } = require('discord.js');
const { registerLogs } = require("../DAL/databaseApi");
const { logActivity } = require("../DAL/logApi");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('log')
		.setDescription('Specify a channel for recording logs. To disable logging, do not set the "to" parameter')
        .addChannelOption(option =>
            option.setName("to")
                .setDescription("The channel to use for logging.  Make sure the bot has access to it!"))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels),
    /**
     * 
     * @param {Interaction} interaction 
     * @returns 
     */
	async execute(interaction) {
        try {
            const target = interaction.options.getChannel("to");

            if (target) {
                // logging requested
                const channel = await interaction.guild.channels.fetch(target.id);

                if (!channel) {
                    await interaction.reply({ content: '<#' + target.id + '> does not appear to be visible to the bot.  Please ensure the bot can both view and send messages there, then try again', ephemeral: true });
                    return;
                }

                if (channel.type !== ChannelType.GuildText) {
                    await interaction.reply({ content: '<#' + target.id + '> is not a text channel.  Please specify a text channel, then try again', ephemeral: true });
                    return;
                }

                const currentPermissions = channel.permissionsFor(interaction.member.user.id);

                if (!currentPermissions.has(PermissionsBitField.Flags.ManageChannels)) {
                    await interaction.reply({ content: "You need the MANAGE_CHANNELS permission to run this command", ephemeral: true });
                    return;
                }
    
                const canSendMessages = await channel.permissionsFor(interaction.client.user.id).has(PermissionsBitField.Flags.SendMessages);
    
                if (!canSendMessages) {
                    await interaction.reply({ content: 'Please grant me SEND_MESSAGES in <#' + target.id + '>, then try again', ephemeral: true });
                    return;
                }
    
                

                const result = await logActivity(
                    interaction.client, 
                    interaction.guild.id, 
                    "Logging enabled", 
                    `<@${interaction.user.id}> used:\n ${interaction.toString()}`,
                    "#007bff",
                    undefined,
                    target.id
                ); 
        
                if (result) {
                    await registerLogs(interaction.guild.id, target.id);
                    await interaction.reply({ content: 'Scams and commands will now be logged to <#' + target.id + '>', ephemeral: false });
                    return;
                } else {
                    await interaction.reply({ content: '<#' + target.id + '> does not appear to be visible to the bot.  Please ensure the bot can both view and send messages there, then try again', ephemeral: true });
                    return;
                }
            } else {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                    await interaction.reply({ content: "You need the MANAGE_CHANNELS permission to run this command", ephemeral: true });
                    return;
                }

                // turn off logging
                await registerLogs(interaction.guild.id, null);
        
                await interaction.reply({ content: 'Logging for this server has been disabled', ephemeral: false });
            }
        } catch (err) {
            console.log(`Error in /log: ${err}`);
            await interaction.reply({ content: 'An unknown error occurred. Please let the developer know', ephemeral: false });
        }
	},
};