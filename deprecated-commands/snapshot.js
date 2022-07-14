const { Permissions, MessageAttachment } = require("discord.js");
const { SlashCommandBuilder } = require('@discordjs/builders');
const { registerLogs } = require("../DAL/databaseApi");
const { logActivity } = require("../DAL/logApi");
const { urlRegex } = require("../DAL/bodyparserApi");
const { getScreenshot, isScraperOnline } = require("../DAL/realisticWebScraperApi");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('snapshot')
		.setDescription('Get a screenshot of a URL. This command could take up to 20 seconds to complete.')
        .addStringOption(option =>
            option.setName("url")
                .setDescription("The URL you want to screenshot.")
                .setRequired(true)),
	async execute(interaction) {
        try {
            await logActivity(interaction.client, interaction.guild.id, "Snapshot command", `<@${interaction.user.id}> used:\n \`${interaction.toString()}\``);                

            let url = interaction.options.getString("url");

            if (url) {
                const urls = [];

                const test = url.match(urlRegex);
                if (test && test.forEach) {
                    test.forEach((match) => {
                        urls.push(match);
                    });
                }

                if (urls.length !== 1) {
                    await interaction.reply({ content: 'Invalid URL.  Please try again.', ephemeral: false });
                    return;
                }

                url = urls[0];

                await interaction.deferReply();

                // this could take up to 20 seconds...

                if (!await isScraperOnline()) {
                    await interaction.editReply({ content: 'Snapshot is currently offline.  Please try again later.', ephemeral: false });
                    return;
                }

                const image = await getScreenshot(url);

                if (image) {
                    await interaction.followUp({ 
                        content: `Extracted the following screenshot for:\n\`${url.replace('`','')}\``,
                        files: [{
                            attachment: image,
                            name: "screenshot.jpg"
                        }]
                    });
                } else {
                    await interaction.editReply({ 
                        content: `Unable to load screenshot for:\n\`${url.replace('`','')}\``
                    });
                }
            }

            await interaction.reply({ content: 'Invalid URL.  Please try again.', ephemeral: false });
        } catch (err) {
            console.log(`Error in /log: ${err}`);
        }
	},
};