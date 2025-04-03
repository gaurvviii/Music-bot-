const { EmbedBuilder } = require('discord.js');
const { Translate } = require('../../process_tools');
const { stopRadio, activeRadioConnections } = require('../../utils/radioPlayer');

module.exports = {
    name: 'radiostop',
    description:("Stop the radio playback"),
    voiceChannel: true,

    async execute({ inter }) {
        const defaultEmbed = new EmbedBuilder().setColor('#2f3136');
        
        // Check if there's a radio playing in this guild
        if (activeRadioConnections.has(inter.guild.id)) {
            const stopped = stopRadio(inter.guild.id);
            
            if (stopped) {
                defaultEmbed.setAuthor({ name: await Translate(`Radio playback has been stopped. <✅>`) });
                return inter.editReply({ embeds: [defaultEmbed] });
            }
        }
        
        defaultEmbed.setAuthor({ name: await Translate(`No radio is currently playing. <❌>`) });
        return inter.editReply({ embeds: [defaultEmbed] });
    }
};
